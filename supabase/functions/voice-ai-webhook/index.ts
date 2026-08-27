// Voice AI outcome webhook (stub).
//
// Wire this up once you've picked a Voice AI provider (Bland, Vapi, Retell,
// etc.): point the provider's "call completed" webhook at this function's
// URL. It verifies a shared secret, then logs the outcome as `activity_log`
// and — if the call was for a specific task/campaign — updates it.
//
// Deploy: supabase functions deploy voice-ai-webhook
// Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOICE_AI_WEBHOOK_SECRET

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const expectedSecret = Deno.env.get("VOICE_AI_WEBHOOK_SECRET");
  const providedSecret = req.headers.get("x-webhook-secret");
  if (expectedSecret && providedSecret !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) {
    return new Response("Invalid JSON body", { status: 400 });
  }

  // TODO: map the provider's actual payload shape. Expected fields, adjust
  // to match whichever Voice AI vendor you connect:
  //   { call_id, campaign_id?, lead_phone, outcome, duration_seconds, transcript_url? }
  const { campaign_id, outcome, lead_phone } = payload;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase.from("activity_log").insert({
    actor_id: null,
    action: "voice_ai_call_outcome",
    entity_type: "campaigns",
    entity_id: campaign_id ?? null,
    meta: { outcome, lead_phone, raw: payload },
  });

  if (error) {
    console.error(error);
    return new Response("Failed to record outcome", { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
});
