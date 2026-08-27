-- ============================================================================
-- Functions & triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'clients','profiles','contacts','campaigns','tasks','playbooks',
    'content_items','invoices','calendar_events','integration_connections'
  ])
  loop
    execute format('create trigger trg_%1$s_updated_at before update on %1$s
      for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- New auth user -> profile bootstrap
-- Every row in auth.users gets a matching profiles row. Role/client defaults
-- to Team; promote to Admin or set client_id via the admin Settings > Users UI
-- (or directly in SQL for the first bootstrap admin, see README).
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'Team')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Custom access token hook — injects role + client_id into the JWT so RLS
-- policies never need to re-query `profiles` (avoids recursive RLS and keeps
-- policies fast). Wire this up in Supabase Dashboard:
--   Authentication > Hooks > Customize Access Token (JWT) Claims hook
--   -> select function `public.custom_access_token_hook`
-- ---------------------------------------------------------------------------
-- security definer: this runs as `supabase_auth_admin` (the Auth service's
-- own Postgres role), which has neither a table grant on `public.profiles`
-- nor an RLS bypass — and it must read an arbitrary user's row (the one
-- logging in), not its own, so RLS couldn't apply here anyway. Without
-- security definer, every login fails with "Error running hook URI".
create or replace function custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb;
  profile_role text;
  profile_client_id uuid;
begin
  select role::text, client_id into profile_role, profile_client_id
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(coalesce(profile_role, 'Team')));
  if profile_client_id is not null then
    claims := jsonb_set(claims, '{app_metadata,client_id}', to_jsonb(profile_client_id::text));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function custom_access_token_hook to supabase_auth_admin;
revoke execute on function custom_access_token_hook from authenticated, anon, public;

-- ---------------------------------------------------------------------------
-- JWT claim helpers used throughout RLS policies
-- ---------------------------------------------------------------------------
-- security definer + a fixed search_path: the `profiles` fallback lookup
-- below must bypass RLS, because `profiles`'s own SELECT policy calls
-- is_internal() -> jwt_role() -> this function. Without security definer
-- that fallback recurses into itself (and blows the stack) the moment a
-- caller's JWT doesn't carry app_metadata.role yet (e.g. right after signup,
-- before the custom access-token hook has run once).
create or replace function jwt_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (select role::text from public.profiles where id = auth.uid()),
    'Team'
  );
$$;

create or replace function jwt_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'client_id')::uuid,
    (select client_id from public.profiles where id = auth.uid())
  );
$$;

create or replace function is_internal()
returns boolean
language sql
stable
as $$
  select jwt_role() in ('Admin', 'Team');
$$;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select jwt_role() = 'Admin';
$$;

-- Resolves the client_id that a comment's parent entity belongs to, so
-- client-role users only see/post comments on their own work.
create or replace function comment_client_id(p_entity_type text, p_entity_id uuid)
returns uuid
language sql
stable
as $$
  select case p_entity_type
    when 'task' then (select client_id from tasks where id = p_entity_id)
    when 'content_item' then (select client_id from content_items where id = p_entity_id)
    when 'campaign' then (select client_id from campaigns where id = p_entity_id)
  end;
$$;

-- ---------------------------------------------------------------------------
-- Finance lock: Team members can edit clients but never credit terms.
-- ---------------------------------------------------------------------------
create or replace function enforce_client_finance_lock()
returns trigger
language plpgsql
as $$
begin
  if jwt_role() = 'Team' and (
    new.credit_limit is distinct from old.credit_limit or
    new.payment_terms is distinct from old.payment_terms
  ) then
    raise exception 'Team members cannot edit finance terms (credit_limit, payment_terms)';
  end if;
  return new;
end;
$$;

create trigger trg_clients_finance_lock
  before update on clients
  for each row execute function enforce_client_finance_lock();

-- ---------------------------------------------------------------------------
-- Generic activity log
-- ---------------------------------------------------------------------------
create or replace function log_activity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  entity uuid;
begin
  entity := coalesce(new.id, old.id);
  insert into activity_log (actor_id, action, entity_type, entity_id, meta)
  values (
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    entity,
    case TG_OP
      when 'DELETE' then to_jsonb(old)
      else to_jsonb(new)
    end
  );
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'clients','campaigns','tasks','content_items','invoices','payments'
  ])
  loop
    execute format('create trigger trg_%1$s_activity after insert or update or delete on %1$s
      for each row execute function log_activity()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Notification triggers
-- ---------------------------------------------------------------------------

-- Task assigned/reassigned
create or replace function notify_task_assigned()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.assignee_id is not null and (TG_OP = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    insert into notifications (user_id, type, title, body, entity_type, entity_id)
    values (new.assignee_id, 'task_assigned', 'New task assigned', new.title, 'task', new.id);
  end if;
  return new;
end;
$$;

create trigger trg_tasks_notify_assigned
  after insert or update of assignee_id on tasks
  for each row execute function notify_task_assigned();

-- Content submitted for review -> notify the client's assigned owner (campaign owner)
create or replace function notify_content_review()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  owner uuid;
begin
  if new.stage = 'Review' and (TG_OP = 'INSERT' or old.stage is distinct from 'Review') then
    select owner_id into owner from clients where id = new.client_id;
    if owner is not null then
      insert into notifications (user_id, type, title, body, entity_type, entity_id)
      values (owner, 'content_review', 'Deliverable ready for review', new.title, 'content_item', new.id);
    end if;
  end if;
  if new.stage = 'Approved' and old.stage is distinct from 'Approved' and new.assignee_id is not null then
    insert into notifications (user_id, type, title, body, entity_type, entity_id)
    values (new.assignee_id, 'content_approved', 'Deliverable approved', new.title, 'content_item', new.id);
  end if;
  return new;
end;
$$;

create trigger trg_content_notify_review
  after insert or update of stage on content_items
  for each row execute function notify_content_review();

-- New comment -> notify the other participants (author of parent entity + assignee)
create or replace function notify_new_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target uuid;
  entity_title text;
begin
  if new.entity_type = 'task' then
    select assignee_id, title into target, entity_title from tasks where id = new.entity_id;
  elsif new.entity_type = 'content_item' then
    select assignee_id, title into target, entity_title from content_items where id = new.entity_id;
  elsif new.entity_type = 'campaign' then
    select owner_id, name into target, entity_title from campaigns where id = new.entity_id;
  end if;

  if target is not null and target <> new.author_id then
    insert into notifications (user_id, type, title, body, entity_type, entity_id)
    values (target, 'comment', 'New comment on ' || coalesce(entity_title, new.entity_type), new.body, new.entity_type, new.entity_id);
  end if;
  return new;
end;
$$;

create trigger trg_comments_notify
  after insert on comments
  for each row execute function notify_new_comment();

-- Invoice overdue transition -> notify client's owner
create or replace function notify_invoice_overdue()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  owner uuid;
begin
  if new.status = 'Overdue' and old.status is distinct from 'Overdue' then
    select owner_id into owner from clients where id = new.client_id;
    if owner is not null then
      insert into notifications (user_id, type, title, body, entity_type, entity_id)
      values (owner, 'invoice_overdue', 'Invoice overdue', new.number, 'invoice', new.id);
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_invoices_notify_overdue
  after update of status on invoices
  for each row execute function notify_invoice_overdue();

-- ---------------------------------------------------------------------------
-- Daily due-soon / overdue digest + invoice status roll-forward.
-- Call this from a scheduled Edge Function or pg_cron (see README — pg_cron
-- is an optional extension not enabled by default on all Supabase plans).
-- ---------------------------------------------------------------------------
create or replace function run_daily_digest()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- Flip Sent/Partial invoices past due_date to Overdue (fires notify_invoice_overdue)
  update invoices set status = 'Overdue'
  where status in ('Sent', 'Partial') and due_date < current_date;

  -- Due-today / overdue task digest, one notification per assignee per day
  insert into notifications (user_id, type, title, body, entity_type, entity_id)
  select assignee_id, 'due_digest',
    case when due_date < current_date then 'Overdue task' else 'Task due today' end,
    title, 'task', id
  from tasks
  where assignee_id is not null
    and status <> 'Done'
    and due_date <= current_date
    and not exists (
      select 1 from notifications n
      where n.user_id = tasks.assignee_id and n.entity_id = tasks.id
        and n.type = 'due_digest' and n.created_at::date = current_date
    );
end;
$$;

-- Only the daily-digest Edge Function (calling with the service role key)
-- should be able to trigger this system-wide batch job — not any signed-in
-- Team/Client user via supabase.rpc(). Postgres grants EXECUTE to PUBLIC by
-- default on new functions, so this has to be revoked explicitly.
revoke execute on function run_daily_digest from public, authenticated, anon;
grant execute on function run_daily_digest to service_role;
