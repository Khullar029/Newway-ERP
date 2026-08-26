-- Newway Agri ERP: Phase 1 schema. Migrations are the source of truth.
create extension if not exists pgcrypto;

create type public.user_role as enum ('Admin', 'Team', 'Client');
create type public.client_type as enum ('Seeds', 'Ag-Inputs/Bio', 'Distribution', 'Supplier', 'Other');
create type public.client_status as enum ('Active', 'Prospect', 'Dormant');
create type public.priority_level as enum ('High', 'Medium', 'Low');
create type public.task_status as enum ('Not Started', 'In Progress', 'Blocked', 'Done');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null, role public.user_role not null default 'Client', client_id uuid, avatar_url text, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.clients (
 id uuid primary key default gen_random_uuid(), name text not null unique, type public.client_type not null default 'Seeds', region text, status public.client_status not null default 'Active', priority public.priority_level not null default 'Medium', products_focus text, payment_terms text, credit_limit numeric(12,2) not null default 0, notes text, owner_id uuid references public.profiles(id), archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.profiles add constraint profiles_client_id_fkey foreign key (client_id) references public.clients(id) on delete set null;
create table public.contacts (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade, name text not null, role text, phone text, email text, is_primary boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.lanes (id uuid primary key default gen_random_uuid(), name text not null unique, description text, color text not null default '#2E5496', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.tasks (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade, lane_id uuid not null references public.lanes(id), title text not null, description text, owner_id uuid references public.profiles(id), assignee_id uuid references public.profiles(id), priority public.priority_level not null default 'Medium', status public.task_status not null default 'Not Started', due_date date, created_date date not null default current_date, completed_at timestamptz, sort_order integer not null default 0, parent_task_id uuid references public.tasks(id) on delete cascade, depends_on uuid[] not null default '{}', archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.activity_log (id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id), action text not null, entity_type text not null, entity_id uuid not null, meta jsonb not null default '{}', created_at timestamptz not null default now());
create index clients_status_idx on public.clients(status) where archived_at is null;
create index contacts_client_id_idx on public.contacts(client_id);
create index tasks_client_id_idx on public.tasks(client_id) where archived_at is null;
create index tasks_status_due_date_idx on public.tasks(status, due_date) where archived_at is null;
create index tasks_assignee_id_idx on public.tasks(assignee_id) where archived_at is null;

create or replace function public.set_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger clients_updated_at before update on public.clients for each row execute procedure public.set_updated_at();
create trigger contacts_updated_at before update on public.contacts for each row execute procedure public.set_updated_at();
create trigger lanes_updated_at before update on public.lanes for each row execute procedure public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute procedure public.set_updated_at();
create or replace function public.is_internal() returns boolean language sql stable security definer set search_path = public as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('Admin','Team'), false); $$;
create or replace function public.current_client_id() returns uuid language sql stable as $$ select nullif(auth.jwt() -> 'app_metadata' ->> 'client_id', '')::uuid; $$;
create or replace function public.audit_mutation() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.activity_log(actor_id, action, entity_type, entity_id, meta) values (auth.uid(), lower(tg_op), tg_table_name, coalesce(new.id, old.id), jsonb_build_object('record', to_jsonb(coalesce(new, old)))); return coalesce(new, old); end; $$;
create trigger clients_audit after insert or update or delete on public.clients for each row execute procedure public.audit_mutation();
create trigger tasks_audit after insert or update or delete on public.tasks for each row execute procedure public.audit_mutation();

alter table public.profiles enable row level security; alter table public.clients enable row level security; alter table public.contacts enable row level security; alter table public.lanes enable row level security; alter table public.tasks enable row level security; alter table public.activity_log enable row level security;
create policy "profiles own or internal" on public.profiles for select using (id = auth.uid() or public.is_internal());
create policy "profiles admins manage" on public.profiles for all using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'Admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'Admin');
create policy "internal clients full access" on public.clients for all using (public.is_internal()) with check (public.is_internal());
create policy "clients read own client" on public.clients for select using (id = public.current_client_id());
create policy "internal contacts full access" on public.contacts for all using (public.is_internal()) with check (public.is_internal());
create policy "clients read own contacts" on public.contacts for select using (client_id = public.current_client_id());
create policy "authenticated lanes read" on public.lanes for select to authenticated using (true);
create policy "admins manage lanes" on public.lanes for all using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'Admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'Admin');
create policy "internal tasks full access" on public.tasks for all using (public.is_internal()) with check (public.is_internal());
create policy "clients read own tasks" on public.tasks for select using (client_id = public.current_client_id());
create policy "internal read audit" on public.activity_log for select using (public.is_internal());

-- Configure this as Supabase's Custom Access Token Hook in Dashboard > Auth > Hooks.
create or replace function public.custom_access_token_hook(event jsonb) returns jsonb language plpgsql stable security definer set search_path = public as $$ declare claims jsonb; profile public.profiles; begin select * into profile from public.profiles where id = (event->>'user_id')::uuid; claims := event->'claims'; if profile.id is not null then claims := jsonb_set(claims, '{app_metadata}', coalesce(claims->'app_metadata','{}'::jsonb) || jsonb_build_object('role', profile.role, 'client_id', profile.client_id)); end if; return jsonb_set(event, '{claims}', claims); end; $$;
grant usage on schema public to authenticated; grant select, insert, update, delete on all tables in schema public to authenticated;
