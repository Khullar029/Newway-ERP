// Optional one-off importer: loads clients + tasks from the existing
// Newway_Agri_Client_Task_Manager.xlsx spreadsheet into Supabase.
//
// This is a local, admin-run script — it is never imported into the Next.js
// app bundle. It depends on the `xlsx` (SheetJS) package, which is
// deliberately NOT a project dependency: the version published to npm has
// known, unpatched advisories (prototype pollution, ReDoS). Install
// SheetJS's own patched build only when you actually run this script:
//
//   npm install --no-save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
//
// Usage:
//   npm run seed:import -- /path/to/Newway_Agri_Client_Task_Manager.xlsx
//
// Expects (case-insensitively, columns can be in any order):
//   A "Clients" sheet with a "Name" column (Type/Region/Status/Priority optional).
//   A "Tasks" sheet (or the first sheet) with Client, Lane, Task/Title,
//   Priority, Status, Due columns.
// Unknown lane names are created on the fly; unknown clients are created
// with default type/status/priority so nothing is silently dropped.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function findColumn(row: Record<string, unknown>, candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const match = keys.find((k) => k.trim().toLowerCase() === candidate);
    if (match && row[match] != null && row[match] !== "") return String(row[match]).trim();
  }
  return undefined;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run seed:import -- /path/to/file.xlsx");
    process.exit(1);
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env.local).");
    process.exit(1);
  }

  let XLSX: typeof import("xlsx");
  try {
    XLSX = await import("xlsx");
  } catch {
    console.error(
      "The `xlsx` package isn't installed. Install SheetJS's patched build first:\n" +
        "  npm install --no-save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
    );
    process.exit(1);
  }

  const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const workbook = XLSX.readFile(filePath);

  const { data: existingClients } = await supabase.from("clients").select("id, name");
  const clientByName = new Map((existingClients ?? []).map((c) => [c.name.toLowerCase(), c.id]));

  const { data: existingLanes } = await supabase.from("lanes").select("id, name");
  const laneByName = new Map((existingLanes ?? []).map((l) => [l.name.toLowerCase(), l.id]));

  async function resolveClient(name: string): Promise<string> {
    const key = name.toLowerCase();
    if (clientByName.has(key)) return clientByName.get(key)!;
    const { data, error } = await supabase
      .from("clients")
      .insert({ name, type: "Other", status: "Active", priority: "Medium" })
      .select("id")
      .single();
    if (error) throw error;
    clientByName.set(key, data.id);
    console.log(`  + created client "${name}"`);
    return data.id;
  }

  async function resolveLane(name: string): Promise<string | null> {
    if (!name) return null;
    const key = name.toLowerCase();
    if (laneByName.has(key)) return laneByName.get(key)!;
    const { data, error } = await supabase.from("lanes").insert({ name }).select("id").single();
    if (error) throw error;
    laneByName.set(key, data.id);
    console.log(`  + created lane "${name}"`);
    return data.id;
  }

  const clientsSheet = workbook.SheetNames.find((n) => n.toLowerCase().includes("client"));
  if (clientsSheet) {
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(workbook.Sheets[clientsSheet]);
    for (const row of rows) {
      const name = findColumn(row, ["name", "client", "client name"]);
      if (!name) continue;
      await resolveClient(name);
    }
  }

  const tasksSheet =
    workbook.SheetNames.find((n) => n.toLowerCase().includes("task")) ?? workbook.SheetNames[0];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(workbook.Sheets[tasksSheet]);

  let imported = 0;
  for (const row of rows) {
    const clientName = findColumn(row, ["client", "client name"]);
    const title = findColumn(row, ["task", "title", "task name"]);
    if (!clientName || !title) continue;

    const laneName = findColumn(row, ["lane", "category"]);
    const priorityRaw = findColumn(row, ["priority"]) ?? "Medium";
    const statusRaw = findColumn(row, ["status"]) ?? "Not Started";
    const dueRaw = findColumn(row, ["due", "due date"]);

    const priority = (["High", "Medium", "Low"].find((p) => p.toLowerCase() === priorityRaw.toLowerCase()) ?? "Medium") as
      | "High"
      | "Medium"
      | "Low";
    const status = (["Not Started", "In Progress", "Blocked", "Done"].find((s) => s.toLowerCase() === statusRaw.toLowerCase()) ??
      "Not Started") as "Not Started" | "In Progress" | "Blocked" | "Done";

    const clientId = await resolveClient(clientName);
    const laneId = laneName ? await resolveLane(laneName) : null;
    let dueDate: string | null = null;
    if (dueRaw) {
      const parsed = new Date(dueRaw);
      if (!Number.isNaN(parsed.getTime())) dueDate = parsed.toISOString().slice(0, 10);
    }

    const { error } = await supabase.from("tasks").insert({
      client_id: clientId,
      lane_id: laneId,
      title,
      priority,
      status,
      due_date: dueDate,
    });
    if (error) {
      console.error(`  ! failed to import "${title}": ${error.message}`);
      continue;
    }
    imported++;
  }

  console.log(`Imported ${imported} tasks from "${tasksSheet}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
