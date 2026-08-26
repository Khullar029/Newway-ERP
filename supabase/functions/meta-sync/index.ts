// Meta Marketing API sync (stub).
//
// Intended to run on a schedule (pg_cron or an external scheduler hitting
// this URL) to pull spend + lead counts for campaigns that have a Meta
// channel, and write them onto the campaign record so the dashboard/campaign
// hub can show read-only KPIs alongside internally-tracked tasks.
//
// Deploy: supabase functions deploy meta-sync
// Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, META_MARKETING_API_TOKEN

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  const token = Deno.env.get("META_MARKETING_API_TOKEN");
  if (!token) {
    return new Response("Meta not connected — connect it in Settings > Integrations first", { status: 501 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, name")
    .contains("channels", ["Meta"])
    .in("status", ["Building", "Live"]);

  if (error) {
    console.error(error);
    return new Response("Failed to load campaigns", { status: 500 });
  }

  const synced: string[] = [];
  for (const campaign of campaigns ?? []) {
    // TODO: replace with a real call to the Meta Marketing API's insights
    // endpoint for the ad account/campaign mapped to this record, e.g.
    //   GET https://graph.facebook.com/v20.0/act_<id>/insights?fields=spend,actions
    // then write spend/leads into activity_log (or a dedicated
    // campaign_kpis table if you want history over time).
    await supabase.from("activity_log").insert({
      action: "meta_sync",
      entity_type: "campaigns",
      entity_id: campaign.id,
      meta: { note: "stubbed — no live Meta insights call made" },
    });
    synced.push(campaign.id);
  }

  return new Response(JSON.stringify({ ok: true, synced }), {
    headers: { "content-type": "application/json" },
  });
});
