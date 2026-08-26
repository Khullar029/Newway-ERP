# Newway Agri ERP

Phase 1 of Newway Agri's multi-tenant agency operations ERP. It provides the dashboard-first foundation: CRM records, lanes, task table/Kanban, role-aware Supabase RLS, and the complete starting client/task dataset.

## What is included

- Responsive Next.js dashboard using Newway Agri's navy, steel-blue, green, and amber visual system.
- A task table with search and inline status changes, plus a Kanban view for moving work across statuses.
- Supabase schema for `profiles`, `clients`, `contacts`, `lanes`, `tasks`, and `activity_log`.
- Role-aware RLS: internal users have operational access and client users can select only rows associated with their JWT `client_id`.
- Audit triggers for client and task mutations, indexes for the hot CRM/task queries, and an idempotent seed containing 16 clients, 8 lanes, and 24 current tasks.

## Local setup

1. Install Node.js 20+ and the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. Copy environment variables: `cp .env.example .env.local`, then set the Supabase URL and anon key.
3. Install packages: `npm install`.
4. Start local Supabase: `supabase start`.
5. Apply the schema and seed data: `supabase db reset`.
6. Start the web app: `npm run dev`, then open `http://localhost:3000`.

The dashboard currently renders the Phase 1 seed data immediately so the interface remains useful before a Supabase project is connected. Wire the Supabase browser client and authentication session into subsequent routes to persist UI actions against the supplied database schema.

## Supabase authentication and first admin

1. Create the owner with email/password or magic link in Supabase Auth.
2. Insert a matching `public.profiles` row with `id = auth.users.id`, `full_name = 'Piyush'`, `role = 'Admin'`, and `active = true`.
3. In **Authentication → Hooks**, enable `public.custom_access_token_hook` as the Custom Access Token Hook. Refresh the user's session afterwards so `app_metadata.role` and (for clients) `app_metadata.client_id` are present in the JWT.
4. Create client users with `role = 'Client'` and their organisation's `client_id`. The RLS policies in the migration enforce this scope even when the UI is bypassed.

## Common agency operations

- **Add a client:** insert a `clients` row (or use the forthcoming CRM form) then insert contacts with its `client_id`.
- **Add a user:** create the Supabase Auth user, create their profile, and force a session refresh. Team members are deliberately configured with access to all internal work and no finance model exists in Phase 1.
- **Add a playbook:** Phase 2 introduces `playbooks` and `playbook_steps`, campaign generation, timelines, and the Nidhi Rabi launch sprint.

## RLS tests

After starting the local Supabase stack and resetting the database, run the policy checks with:

```bash
supabase test db
```

`supabase/tests/rls_isolation.sql` asserts that a client JWT scoped to Nidhi Seeds sees only the matching client and its six Phase 1 tasks, never the rest of the CRM.

## Deployment

1. Create a Supabase cloud project, link it with `supabase link`, and deploy migrations using `supabase db push`.
2. Configure the access-token hook and Auth redirect URLs in Supabase.
3. Import this repository into Vercel and configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. Vercel builds with `npm run build`.

## Scope note

The requested build is deliberately stopped at Phase 1. Campaigns/playbooks, content approval, finance/calendar, integrations, and deployment credentials are Phase 2–5 work and require a configured Supabase/Vercel account for production deployment.
