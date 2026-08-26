# Newway Agri ERP

A multi-tenant ERP for Newway Agri, a marketing agency serving agricultural / seed-company
clients in India. Replaces the spreadsheet tracker with one place to run clients, campaigns,
tasks, content and finance — with real client-facing access.

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS · Supabase (Postgres, Auth, Storage,
Realtime, Edge Functions) · TanStack Query · React Hook Form + Zod.

---

## 1. Local setup

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values, see §2
npm run dev                  # http://localhost:3000
```

`npm run build` / `npm run lint` work the same as any Next.js app.

## 2. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com) (or run one locally with the
   [Supabase CLI](https://supabase.com/docs/guides/cli): `supabase start`).
2. Copy **Project Settings → API** into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose to the browser)
3. Link the CLI and push the schema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push          # applies supabase/migrations/*.sql
   psql "$(npx supabase status -o env | grep DB_URL | cut -d= -f2)" -f supabase/seed.sql
   ```
   Or, for a fresh local dev database: `npx supabase db reset` applies migrations **and**
   `supabase/seed.sql` in one shot.
4. **Wire the custom access-token hook** (this is the one step that isn't a SQL migration
   because Supabase Auth Hooks are configured outside SQL):
   Dashboard → **Authentication → Hooks → Customize Access Token (JWT) Claims hook** → select
   the Postgres function `public.custom_access_token_hook`. This is what puts `role` and
   `client_id` into every JWT so Row Level Security can read them without re-querying
   `profiles` on every request.
5. (Optional) Create the private `attachments` storage bucket if `db push` didn't already
   (migration `0004_storage.sql` creates it, but double-check under **Storage** in the dashboard).

## 3. Create the first admin

Auth users can't be created by SQL alone (passwords need Supabase Auth's hashing), so:

1. Run the app, go to `/signup`, and create your own account. A `profiles` row is created
   automatically (as `Team` role) by the `handle_new_user()` trigger.
2. Promote yourself to Admin directly in the database:
   ```sql
   update profiles set role = 'Admin' where id =
     (select id from auth.users where email = 'you@newwayservices.in');
   ```
   (Run this in the Supabase SQL editor, or via `psql`.)
3. Sign back in — the JWT is refreshed on next sign-in / token refresh and your role claim
   updates. You're now an Admin: Settings → Users lets you manage everyone else's role from
   here on (invite people by having them sign up at `/signup`, then assign their role +
   client there — no separate "invite" flow needed).

## 4. How to add a client, playbook, or user

- **Client:** Clients → Add client. Fill in type/region/status/priority/credit limit; add
  contacts from the client detail page.
- **Playbook:** Playbooks → New playbook → Add step for each step (title, day offset relative
  to the campaign's go-live date, default owner role). Apply it to any campaign from that
  campaign's **Apply playbook** button — it generates a fully dated task list in one step.
- **User:** have them sign up at `/signup`. Then, as an Admin, go to Settings → Users and set
  their role (Team/Admin/Client) — Client role also requires picking which client organisation
  they belong to; RLS then confines them to only that client's data everywhere in the app.

## 5. Deploy

**App → Vercel:**
```bash
npx vercel          # first deploy, follow the prompts
npx vercel --prod    # promote to production
```
Set the same three env vars from `.env.local` in the Vercel project's Environment Variables
(Production + Preview). `NEXT_PUBLIC_*` vars are safe to expose; never set
`SUPABASE_SERVICE_ROLE_KEY` as a `NEXT_PUBLIC_*` var.

**Database → Supabase Cloud:** already done in §2 — Supabase is a managed cloud service, so
there's no separate "deploy" step for the database beyond `db push`.

**Edge Functions** (optional, Phase 5 integrations — see §7): `npx supabase functions deploy <name>`.

## 6. Importing the existing spreadsheet (optional)

`scripts/import-xlsx.ts` reads `Newway_Agri_Client_Task_Manager.xlsx` and upserts clients +
tasks. It intentionally does **not** depend on the `xlsx` npm package by default — the
version on npm has unpatched advisories. Install SheetJS's own patched build only when you
actually run the import:

```bash
npm install --no-save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
npm run seed:import -- /path/to/Newway_Agri_Client_Task_Manager.xlsx
```

## 7. Integrations (Phase 5 — connect-ready stubs)

Settings → Integrations lets an Admin flip Google / Meta / WhatsApp / Voice AI to
"connected", which just records intent in the `integration_connections` table today. The
actual API wiring lives in `supabase/functions/` as stubs with `TODO`s marking exactly where
the real provider call goes:

- `voice-ai-webhook` — receives call-outcome webhooks, logs them to `activity_log`.
- `whatsapp-send` — broadcast sender stub (WhatsApp Cloud API).
- `meta-sync` — pulls campaign spend/leads from the Meta Marketing API (stub).
- `daily-digest` — due-soon/overdue notifications + invoice overdue roll-forward; schedule
  this once a day (pg_cron, or an external scheduler hitting the function URL).

Deploy any of them with `npx supabase functions deploy <name>` and set their provider
credentials as function secrets (`npx supabase secrets set KEY=value`), matching the names in
`.env.example`.

## 8. Running the RLS isolation tests

`tests/rls.test.ts` proves a Client-role user can never read another client's `clients`,
`tasks`, `contacts`, or `invoices` rows — and can't write where RLS requires an internal role.
It needs a **real, migrated** Supabase project (not just placeholder env values), because it
exercises actual Postgres RLS policies over the network:

```bash
npm run test:rls
```

The test creates two throwaway clients + one Client-role auth user each, runs the isolation
assertions, then deletes everything it created — safe to run repeatedly against a shared dev
project.

## 9. Architecture notes

- **RLS is the security boundary**, not the UI. Every table has Row Level Security enabled
  (`supabase/migrations/0003_rls.sql`); the app's `readOnly` UI checks are a convenience layer
  on top, not the enforcement point.
- **Client isolation** works via `is_internal()` / `jwt_client_id()` SQL helper functions that
  read `role`/`client_id` out of the JWT (put there by the custom access-token hook in §2.4),
  so RLS never has to self-referentially query `profiles`.
- **Activity log**: a generic trigger (`log_activity()`) writes to `activity_log` on every
  insert/update/delete of clients, campaigns, tasks, content_items, invoices and payments.
- **Notifications**: triggers fire on task assignment, a deliverable moving to Review/Approved,
  a new comment, and an invoice going Overdue. `run_daily_digest()` (called by the
  `daily-digest` Edge Function) additionally rolls Sent/Partial invoices past due into Overdue
  and posts one due/overdue digest notification per assignee per day.
- **Playbook engine**: `playbooks` + `playbook_steps` are templates; "Apply playbook" computes
  each generated task's `due_date` as `anchor_date + offset_days` and copies the lane, leaving
  assignment to a human.
- Database types in `src/types/database.ts` are hand-authored to match the migrations.
  Once linked to a live project, regenerate them for a perfect match:
  `npx supabase gen types typescript --linked > src/types/database.ts` (re-apply the file's
  header comment if you want to keep the pointer back to this workflow).

## 10. Project structure

```
src/app/                 Next.js App Router pages (route groups: (app) is the authenticated shell)
src/features/<module>/   Data hooks (TanStack Query + Supabase) + module-specific UI, per module
src/components/ui/       Hand-rolled shadcn-style primitives (Radix + Tailwind)
src/components/layout/   App shell, nav, notification bell, theme toggle
src/lib/supabase/        Browser/server/service-role Supabase clients + session-refresh proxy
src/types/database.ts    Hand-authored Database type (see §9)
supabase/migrations/     SQL schema, RLS policies, storage policies, triggers — source of truth
supabase/seed.sql        Appendix A seed data (lanes, clients, playbooks, tasks, Nidhi campaign)
supabase/functions/      Edge Function stubs for Phase 5 integrations
tests/rls.test.ts        RLS isolation suite (§8)
scripts/import-xlsx.ts   Optional spreadsheet importer (§6)
```
