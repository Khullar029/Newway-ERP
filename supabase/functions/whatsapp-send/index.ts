// WhatsApp Cloud API broadcast sender (stub).
//
// Given a campaign and a template name, this is meant to loop over a lead
// list and call the WhatsApp Cloud API's /messages endpoint, logging each
// send to `activity_log`. The lead list source (a CSV upload, a CRM export,
// a future `leads` table) is intentionally left open — wire it in when the
// lead pipeline is decided.
//
// Deploy: supabase functions deploy whatsapp-send
// Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   WHATSAPP_CLOUD_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID

import { createClient } from "jsr:@supabase/supabase-js@2";

interface SendRequest {
  campaign_id: string;
  template_name: string;
  recipients: string[]; // E.164 phone numbers
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = (await req.json().catch(() => null)) as SendRequest | null;
  if (!body?.campaign_id || !body.template_name || !body.recipients?.length) {
    return new Response("campaign_id, template_name and recipients are required", { status: 400 });
  }

  const token = Deno.env.get("WHATSAPP_CLOUD_API_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneNumberId) {
    return new Response("WhatsApp credentials not configured — connect it in Settings > Integrations first", { status: 501 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: { to: string; ok: boolean }[] = [];
  for (const to of body.recipients) {
    // TODO: this is the real Cloud API call — uncomment once credentials are live.
    // const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    //   method: "POST",
    //   headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     messaging_product: "whatsapp",
    //     to,
    //     type: "template",
    //     template: { name: body.template_name, language: { code: "en" } },
    //   }),
    // });
    // results.push({ to, ok: res.ok });
    results.push({ to, ok: true }); // stubbed
  }

  await supabase.from("activity_log").insert({
    action: "whatsapp_broadcast",
    entity_type: "campaigns",
    entity_id: body.campaign_id,
    meta: { template: body.template_name, sent: results.length },
  });

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "content-type": "application/json" },
  });
});
