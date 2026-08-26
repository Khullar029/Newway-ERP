// Daily due-soon / overdue digest + invoice status roll-forward.
//
// Thin wrapper around the `run_daily_digest()` Postgres function (see
// supabase/migrations/0002_functions_triggers.sql). Schedule this to run
// once a day, either via:
//   - Supabase's pg_cron + pg_net (if enabled on your project):
//       select cron.schedule('daily-digest', '0 3 * * *',
//         $$ select net.http_post(url := '<function-url>', headers := ...) $$);
//   - or an external scheduler (Vercel Cron, GitHub Actions) hitting this
//     function's URL with the service role key as a bearer token.
//
// Deploy: supabase functions deploy daily-digest
// Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase.rpc("run_daily_digest");
  if (error) {
    console.error(error);
    return new Response("Digest failed", { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
});
