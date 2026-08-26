-- ============================================================================
-- Newway Agri ERP — core schema
-- ============================================================================
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('Admin', 'Team', 'Client');
create type client_type as enum ('Seeds', 'Ag-Inputs/Bio', 'Distribution', 'Supplier', 'Other');
create type client_status as enum ('Active', 'Prospect', 'Dormant');
create type priority_level as enum ('High', 'Medium', 'Low');
create type campaign_status as enum ('Planning', 'Building', 'Live', 'Paused', 'Done');
create type task_status as enum ('Not Started', 'In Progress', 'Blocked', 'Done');
create type content_stage as enum ('Idea', 'Scripting', 'Shooting', 'Editing', 'Review', 'Approved', 'Published');
create type content_type as enum ('Micro-drama', 'Reel', 'Video', 'Post', 'Ad-creative', 'Script');
create type invoice_status as enum ('Draft', 'Sent', 'Partial', 'Paid', 'Overdue');
create type channel_type as enum ('Meta', 'Truecaller', 'WhatsApp', 'Voice', 'YouTube', 'SEO', 'Google Ads', 'GMB');
create type calendar_event_type as enum ('Meeting', 'Go-Live', 'Follow-up', 'Deadline', 'Reminder');
create type integration_provider as enum ('google', 'meta', 'whatsapp', 'voice_ai');
create type integration_status as enum ('disconnected', 'connected', 'error');

-- ---------------------------------------------------------------------------
-- Core / CRM
-- ---------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type client_type not null default 'Other',
  region text,
  status client_status not null default 'Prospect',
  priority priority_level not null default 'Medium',
  products_focus text,
  payment_terms text,
  credit_limit numeric(14,2) not null default 0,
  notes text,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'Team',
  client_id uuid references clients(id) on delete set null,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_client_role_check check (
    (role = 'Client' and client_id is not null) or (role <> 'Client')
  )
);

alter table clients add constraint clients_owner_fk foreign key (owner_id) references profiles(id) on delete set null;

create table contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Work
-- ---------------------------------------------------------------------------
create table lanes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color text not null default '#2E5496',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table playbooks (
  id uuid primary key default gen_random_uuid(),
  lane_id uuid references lanes(id) on delete set null,
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table playbook_steps (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references playbooks(id) on delete cascade,
  title text not null,
  description text,
  default_owner_role user_role not null default 'Team',
  offset_days int not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  crop text,
  region text,
  channels channel_type[] not null default '{}',
  status campaign_status not null default 'Planning',
  go_live_date date,
  budget numeric(14,2),
  lane_id uuid references lanes(id) on delete set null,
  owner_id uuid references profiles(id) on delete set null,
  description text,
  playbook_id uuid references playbooks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  lane_id uuid references lanes(id) on delete set null,
  title text not null,
  description text,
  owner_id uuid references profiles(id) on delete set null,
  assignee_id uuid references profiles(id) on delete set null,
  priority priority_level not null default 'Medium',
  status task_status not null default 'Not Started',
  due_date date,
  created_date date not null default current_date,
  completed_at timestamptz,
  sort_order int not null default 0,
  parent_task_id uuid references tasks(id) on delete cascade,
  depends_on uuid[] not null default '{}',
  is_critical_path boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Content pipeline
-- ---------------------------------------------------------------------------
create table content_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  type content_type not null,
  title text not null,
  stage content_stage not null default 'Idea',
  assignee_id uuid references profiles(id) on delete set null,
  due_date date,
  file_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Finance
-- ---------------------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  number text not null unique,
  issue_date date not null default current_date,
  due_date date,
  status invoice_status not null default 'Draft',
  currency text not null default 'INR',
  subtotal numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  qty numeric(10,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  amount numeric(14,2) generated always as (qty * unit_price) stored,
  sort_order int not null default 0
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  amount numeric(14,2) not null,
  paid_on date not null default current_date,
  method text,
  reference text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Calendar / notifications / activity
-- ---------------------------------------------------------------------------
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  title text not null,
  type calendar_event_type not null default 'Meeting',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_by uuid references profiles(id) on delete set null,
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('task', 'content_item', 'campaign')),
  entity_id uuid not null,
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  provider integration_provider not null unique,
  status integration_status not null default 'disconnected',
  config jsonb not null default '{}',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index idx_contacts_client on contacts(client_id);
create index idx_campaigns_client on campaigns(client_id);
create index idx_campaigns_status on campaigns(status);
create index idx_campaigns_go_live on campaigns(go_live_date);
create index idx_tasks_client on tasks(client_id);
create index idx_tasks_campaign on tasks(campaign_id);
create index idx_tasks_status on tasks(status);
create index idx_tasks_due_date on tasks(due_date);
create index idx_tasks_assignee on tasks(assignee_id);
create index idx_tasks_parent on tasks(parent_task_id);
create index idx_playbook_steps_playbook on playbook_steps(playbook_id);
create index idx_content_items_client on content_items(client_id);
create index idx_content_items_campaign on content_items(campaign_id);
create index idx_content_items_stage on content_items(stage);
create index idx_invoices_client on invoices(client_id);
create index idx_invoices_status on invoices(status);
create index idx_invoice_items_invoice on invoice_items(invoice_id);
create index idx_payments_invoice on payments(invoice_id);
create index idx_payments_client on payments(client_id);
create index idx_calendar_events_client on calendar_events(client_id);
create index idx_calendar_events_starts_at on calendar_events(starts_at);
create index idx_notifications_user on notifications(user_id, read_at);
create index idx_comments_entity on comments(entity_type, entity_id);
create index idx_activity_log_entity on activity_log(entity_type, entity_id);
create index idx_profiles_client on profiles(client_id);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
create view client_finance_summary as
select
  c.id as client_id,
  c.name as client_name,
  c.credit_limit,
  coalesce(inv.invoiced_total, 0) as invoiced_total,
  coalesce(pay.paid_total, 0) as paid_total,
  coalesce(inv.invoiced_total, 0) - coalesce(pay.paid_total, 0) as outstanding
from clients c
left join (
  select client_id, sum(total) as invoiced_total
  from invoices
  where status <> 'Draft'
  group by client_id
) inv on inv.client_id = c.id
left join (
  select client_id, sum(amount) as paid_total
  from payments
  group by client_id
) pay on pay.client_id = c.id;
