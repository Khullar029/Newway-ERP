// RLS isolation suite — proves a Client-role user can only ever see their
// own organisation's rows, never another client's. Requires a real, migrated
// Supabase project; see "Running the RLS isolation tests" in README.md.
//
// Run: npm run test:rls

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setup, teardown, type RlsFixture } from "./helpers/rls-fixture";

describe("RLS client isolation", () => {
  let fx: RlsFixture;

  beforeAll(async () => {
    fx = await setup();
  }, 30_000);

  afterAll(async () => {
    if (fx) await teardown(fx);
  }, 30_000);

  it("a client user cannot read another client's `clients` row", async () => {
    const { data } = await fx.clientAAnon.from("clients").select("*").eq("id", fx.clientBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("a client user sees their own `clients` row", async () => {
    const { data } = await fx.clientAAnon.from("clients").select("*").eq("id", fx.clientAId);
    expect(data).toHaveLength(1);
  });

  it("an unfiltered `clients` select only returns the caller's own client", async () => {
    const { data } = await fx.clientAAnon.from("clients").select("id");
    expect(data?.map((r) => r.id)).not.toContain(fx.clientBId);
  });

  it("a client user cannot read another client's tasks", async () => {
    const { data } = await fx.clientAAnon.from("tasks").select("*").eq("id", fx.taskBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("a client user cannot read another client's invoices", async () => {
    const { data } = await fx.clientAAnon.from("invoices").select("*").eq("id", fx.invoiceBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("a client user can read their own invoice", async () => {
    const { data } = await fx.clientAAnon.from("invoices").select("*").eq("id", fx.invoiceAId);
    expect(data).toHaveLength(1);
  });

  it("a client user cannot write another client's task (RLS write policy requires internal role)", async () => {
    const { error, data } = await fx.clientAAnon
      .from("tasks")
      .update({ status: "Done" })
      .eq("id", fx.taskBId)
      .select();
    // With RLS, a blocked update returns no error and no rows (not a thrown error) —
    // either shape is an acceptable "did not succeed" outcome.
    expect(data ?? []).toHaveLength(0);
    void error;
  });

  it("a client user cannot insert a new client (write requires internal role)", async () => {
    const { error } = await fx.clientAAnon.from("clients").insert({ name: "Should not be allowed" });
    expect(error).not.toBeNull();
  });

  it("a client user cannot read another client's contacts", async () => {
    await fx.admin.from("contacts").insert({ client_id: fx.clientBId, name: "B Contact" });
    const { data } = await fx.clientAAnon.from("contacts").select("*").eq("client_id", fx.clientBId);
    expect(data ?? []).toHaveLength(0);
  });
});
