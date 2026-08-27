// Test fixture for the RLS isolation suite (tests/rls.test.ts).
//
// Creates two throwaway clients ("RLS Test Client A/B"), one Client-role
// auth user per client, and one task + one invoice per client. Everything
// created here is deleted in `teardown()`, so re-running the suite never
// accumulates data. Requires a linked Supabase project — see the "Running
// the RLS isolation tests" section in README.md.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function requireEnv() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    throw new Error(
      "RLS tests require NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY " +
        "for a real, migrated Supabase project (not the placeholder values in .env.local). See README.md."
    );
  }
}

export interface RlsFixture {
  admin: SupabaseClient<Database>;
  clientAId: string;
  clientBId: string;
  userAId: string;
  userBId: string;
  taskAId: string;
  taskBId: string;
  invoiceAId: string;
  invoiceBId: string;
  clientAAnon: SupabaseClient<Database>;
  clientBAnon: SupabaseClient<Database>;
}

const PASSWORD = "Test-Password-123!";
const RUN_TAG = Date.now();

export async function setup(): Promise<RlsFixture> {
  requireEnv();
  const admin = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: clientA, error: caErr } = await admin
    .from("clients")
    .insert({ name: `RLS Test Client A ${RUN_TAG}`, type: "Other", status: "Active", priority: "Medium" })
    .select()
    .single();
  if (caErr) throw caErr;

  const { data: clientB, error: cbErr } = await admin
    .from("clients")
    .insert({ name: `RLS Test Client B ${RUN_TAG}`, type: "Other", status: "Active", priority: "Medium" })
    .select()
    .single();
  if (cbErr) throw cbErr;

  const emailA = `rls-test-a-${RUN_TAG}@example.com`;
  const emailB = `rls-test-b-${RUN_TAG}@example.com`;

  const { data: userA, error: uaErr } = await admin.auth.admin.createUser({
    email: emailA,
    password: PASSWORD,
    email_confirm: true,
  });
  if (uaErr) throw uaErr;
  const { data: userB, error: ubErr } = await admin.auth.admin.createUser({
    email: emailB,
    password: PASSWORD,
    email_confirm: true,
  });
  if (ubErr) throw ubErr;

  // handle_new_user() already inserted a Team-role profile row for each;
  // promote both to Client role scoped to their respective test client.
  const { error: paErr } = await admin
    .from("profiles")
    .update({ role: "Client", client_id: clientA.id })
    .eq("id", userA.user.id);
  if (paErr) throw paErr;
  const { error: pbErr } = await admin
    .from("profiles")
    .update({ role: "Client", client_id: clientB.id })
    .eq("id", userB.user.id);
  if (pbErr) throw pbErr;

  const { data: taskA, error: taErr } = await admin
    .from("tasks")
    .insert({ client_id: clientA.id, title: "RLS fixture task A", status: "Not Started", priority: "Medium" })
    .select()
    .single();
  if (taErr) throw taErr;
  const { data: taskB, error: tbErr } = await admin
    .from("tasks")
    .insert({ client_id: clientB.id, title: "RLS fixture task B", status: "Not Started", priority: "Medium" })
    .select()
    .single();
  if (tbErr) throw tbErr;

  const { data: invoiceA, error: iaErr } = await admin
    .from("invoices")
    .insert({ client_id: clientA.id, number: `RLS-A-${RUN_TAG}`, status: "Sent", subtotal: 1000, total: 1000 })
    .select()
    .single();
  if (iaErr) throw iaErr;
  const { data: invoiceB, error: ibErr } = await admin
    .from("invoices")
    .insert({ client_id: clientB.id, number: `RLS-B-${RUN_TAG}`, status: "Sent", subtotal: 2000, total: 2000 })
    .select()
    .single();
  if (ibErr) throw ibErr;

  const clientAAnon = createClient<Database>(SUPABASE_URL!, ANON_KEY!);
  const clientBAnon = createClient<Database>(SUPABASE_URL!, ANON_KEY!);
  const { error: signInAErr } = await clientAAnon.auth.signInWithPassword({ email: emailA, password: PASSWORD });
  if (signInAErr) throw signInAErr;
  const { error: signInBErr } = await clientBAnon.auth.signInWithPassword({ email: emailB, password: PASSWORD });
  if (signInBErr) throw signInBErr;

  return {
    admin,
    clientAId: clientA.id,
    clientBId: clientB.id,
    userAId: userA.user.id,
    userBId: userB.user.id,
    taskAId: taskA.id,
    taskBId: taskB.id,
    invoiceAId: invoiceA.id,
    invoiceBId: invoiceB.id,
    clientAAnon,
    clientBAnon,
  };
}

export async function teardown(fixture: RlsFixture) {
  await fixture.admin.auth.admin.deleteUser(fixture.userAId);
  await fixture.admin.auth.admin.deleteUser(fixture.userBId);
  await fixture.admin.from("clients").delete().eq("id", fixture.clientAId);
  await fixture.admin.from("clients").delete().eq("id", fixture.clientBId);
}
