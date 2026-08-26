-- ============================================================================
-- Row Level Security
-- Default posture: Admin/Team ("internal") see and manage everything;
-- Client-role users see only rows tied to their own client_id, read-only
-- except where explicitly allowed (content approval, comments).
-- ============================================================================

alter table clients enable row level security;
alter table profiles enable row level security;
alter table contacts enable row level security;
alter table lanes enable row level security;
alter table playbooks enable row level security;
alter table playbook_steps enable row level security;
alter table campaigns enable row level security;
alter table tasks enable row level security;
alter table content_items enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table calendar_events enable row level security;
alter table notifications enable row level security;
alter table comments enable row level security;
alter table activity_log enable row level security;
alter table integration_connections enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select on profiles for select
  using (is_internal() or id = auth.uid());

create policy profiles_update_self on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles p where p.id = auth.uid()));

create policy profiles_admin_write on profiles for all
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create policy clients_select on clients for select
  using (is_internal() or id = jwt_client_id());

create policy clients_write on clients for insert
  with check (is_internal());

create policy clients_update on clients for update
  using (is_internal())
  with check (is_internal());

create policy clients_delete on clients for delete
  using (is_admin());

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
create policy contacts_select on contacts for select
  using (is_internal() or client_id = jwt_client_id());

create policy contacts_write on contacts for all
  using (is_internal())
  with check (is_internal());

-- ---------------------------------------------------------------------------
-- lanes — reference data, readable by anyone signed in, editable by internal
-- ---------------------------------------------------------------------------
create policy lanes_select on lanes for select
  using (auth.uid() is not null);

create policy lanes_write on lanes for all
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------------
-- playbooks / playbook_steps — internal only (clients never see templates)
-- ---------------------------------------------------------------------------
create policy playbooks_select on playbooks for select
  using (is_internal());

create policy playbooks_write on playbooks for all
  using (is_admin())
  with check (is_admin());

create policy playbook_steps_select on playbook_steps for select
  using (is_internal());

create policy playbook_steps_write on playbook_steps for all
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create policy campaigns_select on campaigns for select
  using (is_internal() or client_id = jwt_client_id());

create policy campaigns_write on campaigns for all
  using (is_internal())
  with check (is_internal());

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create policy tasks_select on tasks for select
  using (is_internal() or client_id = jwt_client_id());

create policy tasks_write on tasks for all
  using (is_internal())
  with check (is_internal());

-- ---------------------------------------------------------------------------
-- content_items — clients may additionally move Review -> Approved
-- (the actual "only Review->Approved" transition is enforced in the app +
--  a trigger guard below) and read their own items.
-- ---------------------------------------------------------------------------
create policy content_items_select on content_items for select
  using (is_internal() or client_id = jwt_client_id());

create policy content_items_write_internal on content_items for all
  using (is_internal())
  with check (is_internal());

create policy content_items_client_approve on content_items for update
  using (jwt_role() = 'Client' and client_id = jwt_client_id() and stage = 'Review')
  with check (jwt_role() = 'Client' and client_id = jwt_client_id());

create or replace function enforce_client_content_transition()
returns trigger
language plpgsql
as $$
begin
  if jwt_role() = 'Client' then
    if old.stage <> 'Review' or new.stage not in ('Review', 'Approved') then
      raise exception 'Clients may only move a deliverable from Review to Approved';
    end if;
    -- clients can only touch the stage column, nothing else
    new.title := old.title;
    new.type := old.type;
    new.assignee_id := old.assignee_id;
    new.due_date := old.due_date;
    new.file_url := old.file_url;
    new.client_id := old.client_id;
    new.campaign_id := old.campaign_id;
  end if;
  return new;
end;
$$;

create trigger trg_content_items_client_transition
  before update on content_items
  for each row execute function enforce_client_content_transition();

-- ---------------------------------------------------------------------------
-- invoices / invoice_items / payments — client read-only on own data
-- ---------------------------------------------------------------------------
create policy invoices_select on invoices for select
  using (is_internal() or client_id = jwt_client_id());

create policy invoices_write on invoices for all
  using (is_internal())
  with check (is_internal());

create policy invoice_items_select on invoice_items for select
  using (
    is_internal() or exists (
      select 1 from invoices i where i.id = invoice_items.invoice_id and i.client_id = jwt_client_id()
    )
  );

create policy invoice_items_write on invoice_items for all
  using (is_internal())
  with check (is_internal());

create policy payments_select on payments for select
  using (is_internal() or client_id = jwt_client_id());

create policy payments_write on payments for all
  using (is_internal())
  with check (is_internal());

-- ---------------------------------------------------------------------------
-- calendar_events
-- ---------------------------------------------------------------------------
create policy calendar_events_select on calendar_events for select
  using (is_internal() or client_id = jwt_client_id());

create policy calendar_events_write on calendar_events for all
  using (is_internal())
  with check (is_internal());

-- ---------------------------------------------------------------------------
-- notifications — strictly own rows
-- ---------------------------------------------------------------------------
create policy notifications_select on notifications for select
  using (user_id = auth.uid());

create policy notifications_update_own on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_insert_system on notifications for insert
  with check (is_internal());

-- ---------------------------------------------------------------------------
-- comments — visible/postable by internal always; by clients only on their
-- own entities
-- ---------------------------------------------------------------------------
create policy comments_select on comments for select
  using (is_internal() or comment_client_id(entity_type, entity_id) = jwt_client_id());

create policy comments_insert on comments for insert
  with check (
    author_id = auth.uid()
    and (is_internal() or comment_client_id(entity_type, entity_id) = jwt_client_id())
  );

create policy comments_delete_own on comments for delete
  using (author_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------------
-- activity_log — internal audit trail only
-- ---------------------------------------------------------------------------
create policy activity_log_select on activity_log for select
  using (is_internal());

-- inserts happen via the security-definer log_activity() trigger function only

-- ---------------------------------------------------------------------------
-- integration_connections — Admin (Settings) only
-- ---------------------------------------------------------------------------
create policy integration_connections_select on integration_connections for select
  using (is_admin());

create policy integration_connections_write on integration_connections for all
  using (is_admin())
  with check (is_admin());
