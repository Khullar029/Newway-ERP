-- ============================================================================
-- Newway Agri ERP — seed data (Appendix A)
-- Idempotent: safe to run against a freshly-migrated database via
--   supabase db reset
-- or
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- NOTE: the first Admin user (Piyush) is NOT created here. Auth users must be
-- created through Supabase Auth (sign up in the app, or Dashboard > Auth >
-- Add user) so passwords are hashed correctly. After that user exists, run:
--   update profiles set role = 'Admin' where id = '<their auth.users id>';
-- See README.md "First admin" for the full step-by-step.
-- ============================================================================

do $$
declare
  -- lanes
  l_campaigns uuid; l_voice uuid; l_content uuid; l_calendar uuid;
  l_leadgen uuid; l_seo uuid; l_incentive uuid; l_clientprep uuid;

  -- clients
  c_nuziveedu uuid; c_kaveri uuid; c_westernbio uuid; c_westernagri uuid;
  c_nidhiseeds uuid; c_laxmiseeds uuid; c_verdesian uuid; c_excelag uuid;
  c_kurnoolseeds uuid; c_rubisco uuid; c_astoria uuid; c_manduca uuid;
  c_qh uuid; c_bestbuyskips uuid; c_cyagro uuid; c_nidhikg uuid;

  -- playbooks
  pb_crop uuid; pb_voice uuid; pb_calendar uuid; pb_seo uuid; pb_leadgen uuid; pb_content uuid;

  -- nidhi campaign + sprint task chain (for dependencies)
  camp_nidhi uuid;
  t_vendor uuid; t_qrcodes uuid; t_verifypage uuid; t_luckydraw uuid; t_e2etest uuid;
  t_copy uuid; t_creatives uuid; t_approvals uuid; t_schedule uuid;
  t_script uuid; t_shoot uuid; t_edit uuid; t_ep23 uuid; t_ep1ready uuid;
  t_metasetup uuid; t_metaadsets uuid; t_metaqa uuid;
  t_truecaller_creative uuid; t_truecaller_book uuid;
  t_wa_templates uuid; t_wa_test uuid;
  t_voice_scripts uuid; t_voice_build uuid;
  t_dealer_print uuid; t_dealer_wa uuid;
  t_draw_terms uuid; t_draw_mechanic uuid;
begin

  -- --------------------------------------------------------------------
  -- Lanes
  -- --------------------------------------------------------------------
  insert into lanes (name, description, color, sort_order) values
    ('Campaigns', 'Crop campaigns by channel — Meta, Truecaller, WhatsApp', '#1F3864', 1),
    ('Voice AI', 'AI voice-calling: pitches, call-centre replacement, auto-calling', '#2E5496', 2),
    ('Content Production', 'Micro-dramas, reels, videos, delivery throughput', '#6B4F9E', 3),
    ('Calendar + Strategy', 'Monthly content calendar + strategy refresh', '#2E7D32', 4),
    ('Lead-Gen Strategy', 'More-leads plans; ads + lead-gen layer', '#B8860B', 5),
    ('SEO / Digital Setup', 'SEO, Google Ads, Meta, Google Business Profile', '#0E7490', 6),
    ('Incentive & Trust', 'Farmer incentives (QR lucky draw) + authenticity', '#B3261E', 7),
    ('Client Prep', 'Meeting decks, reports, pitch materials', '#5B6B85', 8)
  on conflict (name) do nothing;

  select id into l_campaigns from lanes where name = 'Campaigns';
  select id into l_voice from lanes where name = 'Voice AI';
  select id into l_content from lanes where name = 'Content Production';
  select id into l_calendar from lanes where name = 'Calendar + Strategy';
  select id into l_leadgen from lanes where name = 'Lead-Gen Strategy';
  select id into l_seo from lanes where name = 'SEO / Digital Setup';
  select id into l_incentive from lanes where name = 'Incentive & Trust';
  select id into l_clientprep from lanes where name = 'Client Prep';

  -- --------------------------------------------------------------------
  -- Clients
  -- --------------------------------------------------------------------
  insert into clients (name, type, region, status, priority, products_focus, credit_limit) values
    ('Nuziveedu', 'Seeds', 'Telangana', 'Active', 'High', 'Cotton, mustard, vegetable seeds', 500000),
    ('Kaveri', 'Seeds', 'Telangana', 'Active', 'Medium', 'Cotton & field-crop seeds', 500000),
    ('Western Bio', 'Ag-Inputs/Bio', 'Maharashtra', 'Active', 'High', 'Biologicals, mustard campaign inputs', 300000),
    ('Western Agri', 'Distribution', 'Maharashtra', 'Active', 'High', 'Cumin & field-crop distribution', 300000),
    ('Nidhi Seeds', 'Seeds', 'Gujarat, Rajasthan, Madhya Pradesh', 'Active', 'High', 'Cumin, coriander, mustard seeds', 800000),
    ('Laxmi Seeds', 'Seeds', 'Madhya Pradesh', 'Active', 'Medium', 'Field-crop seeds', 300000),
    ('Verdesian', 'Ag-Inputs/Bio', 'Pan-India', 'Active', 'Medium', 'Plant nutrition & biologicals', 400000),
    ('Excel Ag', 'Ag-Inputs/Bio', 'Pan-India', 'Active', 'Medium', 'Crop-protection inputs', 300000),
    ('Kurnool Seeds', 'Seeds', 'Andhra Pradesh', 'Active', 'High', 'Regional field-crop seeds', 250000),
    ('Rubisco', 'Ag-Inputs/Bio', 'Pan-India', 'Active', 'Medium', 'Biostimulants', 250000),
    ('Astoria', 'Other', 'Pan-India', 'Active', 'Medium', 'Ag-inputs', 200000),
    ('Manduca', 'Other', 'Pan-India', 'Active', 'Medium', 'Ag-inputs', 200000),
    ('QH', 'Other', 'Pan-India', 'Active', 'High', 'Ag-inputs', 200000),
    ('Best Buy Skips', 'Other', 'Pan-India', 'Active', 'High', 'Digital presence setup', 150000),
    ('Cyagro', 'Ag-Inputs/Bio', 'Pan-India', 'Active', 'Medium', 'Crop nutrition', 250000),
    ('Nidhi Kitchen Garden', 'Seeds', 'Gujarat', 'Active', 'Medium', 'Home & kitchen-garden seed kits', 150000)
  on conflict do nothing;

  select id into c_nuziveedu from clients where name = 'Nuziveedu';
  select id into c_kaveri from clients where name = 'Kaveri';
  select id into c_westernbio from clients where name = 'Western Bio';
  select id into c_westernagri from clients where name = 'Western Agri';
  select id into c_nidhiseeds from clients where name = 'Nidhi Seeds';
  select id into c_laxmiseeds from clients where name = 'Laxmi Seeds';
  select id into c_verdesian from clients where name = 'Verdesian';
  select id into c_excelag from clients where name = 'Excel Ag';
  select id into c_kurnoolseeds from clients where name = 'Kurnool Seeds';
  select id into c_rubisco from clients where name = 'Rubisco';
  select id into c_astoria from clients where name = 'Astoria';
  select id into c_manduca from clients where name = 'Manduca';
  select id into c_qh from clients where name = 'QH';
  select id into c_bestbuyskips from clients where name = 'Best Buy Skips';
  select id into c_cyagro from clients where name = 'Cyagro';
  select id into c_nidhikg from clients where name = 'Nidhi Kitchen Garden';

  -- --------------------------------------------------------------------
  -- Sample contacts (one primary contact per client, illustrative)
  -- --------------------------------------------------------------------
  insert into contacts (client_id, name, role, is_primary) values
    (c_nuziveedu, 'Ankita', 'Marketing Lead', true),
    (c_nidhiseeds, 'Nidhi Seeds Marketing Desk', 'Marketing Lead', true),
    (c_kaveri, 'Kaveri Marketing Desk', 'Marketing Lead', true)
  on conflict do nothing;

  -- --------------------------------------------------------------------
  -- Starter playbooks
  -- --------------------------------------------------------------------
  insert into playbooks (lane_id, name, description) values
    (l_campaigns, 'Crop Campaign', 'Parameterised crop + region + channel campaign, from brief to weekly optimisation')
  returning id into pb_crop;

  insert into playbooks (lane_id, name, description) values
    (l_voice, 'Voice AI Rollout', 'Discovery to live AI voice-calling for a client')
  returning id into pb_voice;

  insert into playbooks (lane_id, name, description) values
    (l_calendar, 'Monthly Calendar + Strategy', 'Recurring monthly content calendar cycle')
  returning id into pb_calendar;

  insert into playbooks (lane_id, name, description) values
    (l_seo, 'SEO / Digital Setup', 'Audit through to live SEO + Google/Meta/GMB setup')
  returning id into pb_seo;

  insert into playbooks (lane_id, name, description) values
    (l_leadgen, 'Lead-Gen Strategy', 'Funnel + offer + nurture launch for more-leads mandates')
  returning id into pb_leadgen;

  insert into playbooks (lane_id, name, description) values
    (l_content, 'Content Production (Micro-drama)', 'Concept to publish for a micro-drama episode')
  returning id into pb_content;

  insert into playbook_steps (playbook_id, title, offset_days, default_owner_role, sort_order) values
    (pb_crop, 'Confirm crop/variety/region/claims', -30, 'Team', 1),
    (pb_crop, 'Build creative brief', -28, 'Team', 2),
    (pb_crop, 'Produce ad copy + creatives', -24, 'Team', 3),
    (pb_crop, 'Approvals', -20, 'Admin', 4),
    (pb_crop, 'Set up Meta ad sets by district', -18, 'Team', 5),
    (pb_crop, 'Set up Truecaller', -16, 'Team', 6),
    (pb_crop, 'WhatsApp templates + list', -16, 'Team', 7),
    (pb_crop, 'Voice-AI call scripts', -18, 'Team', 8),
    (pb_crop, 'QA + budgets', -3, 'Team', 9),
    (pb_crop, 'Go live', 0, 'Admin', 10),
    (pb_crop, 'Weekly optimisation', 7, 'Team', 11);

  insert into playbook_steps (playbook_id, title, offset_days, default_owner_role, sort_order) values
    (pb_voice, 'Discovery/pitch', -21, 'Admin', 1),
    (pb_voice, 'Script per crop/segment', -14, 'Team', 2),
    (pb_voice, 'Provider + flow build', -10, 'Team', 3),
    (pb_voice, 'Test calls', -4, 'Team', 4),
    (pb_voice, 'Go live', 0, 'Admin', 5),
    (pb_voice, 'Review outcomes', 7, 'Team', 6);

  insert into playbook_steps (playbook_id, title, offset_days, default_owner_role, sort_order) values
    (pb_calendar, 'Strategy review', -7, 'Team', 1),
    (pb_calendar, 'Draft 30-day calendar', -4, 'Team', 2),
    (pb_calendar, 'Client approval', -2, 'Admin', 3),
    (pb_calendar, 'Schedule posts', -1, 'Team', 4),
    (pb_calendar, 'Publish + monitor', 0, 'Team', 5);

  insert into playbook_steps (playbook_id, title, offset_days, default_owner_role, sort_order) values
    (pb_seo, 'Audit', -30, 'Team', 1),
    (pb_seo, 'Keyword + on-page plan', -24, 'Team', 2),
    (pb_seo, 'GMB setup/verify', -20, 'Team', 3),
    (pb_seo, 'Google Ads plan', -18, 'Team', 4),
    (pb_seo, 'Meta plan', -16, 'Team', 5),
    (pb_seo, 'Implement + track', -10, 'Team', 6),
    (pb_seo, 'Go live', 0, 'Admin', 7);

  insert into playbook_steps (playbook_id, title, offset_days, default_owner_role, sort_order) values
    (pb_leadgen, 'Review existing ads', -14, 'Team', 1),
    (pb_leadgen, 'Define funnel + offer', -10, 'Admin', 2),
    (pb_leadgen, 'Landing/lead-form', -7, 'Team', 3),
    (pb_leadgen, 'Lead-nurture (WhatsApp/Voice)', -5, 'Team', 4),
    (pb_leadgen, 'Launch', 0, 'Admin', 5);

  insert into playbook_steps (playbook_id, title, offset_days, default_owner_role, sort_order) values
    (pb_content, 'Concept + script', -14, 'Team', 1),
    (pb_content, 'Approve script', -12, 'Admin', 2),
    (pb_content, 'Shoot', -9, 'Team', 3),
    (pb_content, 'Edit + subtitle', -5, 'Team', 4),
    (pb_content, 'Review/approve', -2, 'Admin', 5),
    (pb_content, 'Publish', 0, 'Team', 6);

  -- --------------------------------------------------------------------
  -- Current tasks (24) — from the live tracker
  -- --------------------------------------------------------------------
  insert into tasks (client_id, lane_id, title, priority, status, due_date) values
    (c_nuziveedu, l_campaigns, 'Mustard campaign on Truecaller (with Ankita)', 'High', 'In Progress', '2026-08-27'),
    (c_nuziveedu, l_voice, 'Replace call centre with AI calling (meeting)', 'High', 'In Progress', '2026-09-01'),
    (c_kaveri, l_clientprep, 'Office visit: new campaign ideas + past reports', 'High', 'Not Started', null),
    (c_westernbio, l_campaigns, 'Full mustard campaign on Meta + AI voice-calling to leads', 'High', 'Not Started', null),
    (c_westernagri, l_campaigns, 'Full cumin campaign on Meta + AI voice-calling to leads', 'High', 'Not Started', null),
    (c_laxmiseeds, l_content, 'New micro-drama proposal + more videos', 'Medium', 'Not Started', null),
    (c_verdesian, l_calendar, 'Monthly calendar + new strategy', 'Medium', 'Not Started', null),
    (c_excelag, l_calendar, 'Monthly calendar + new strategy', 'Medium', 'Not Started', null),
    (c_kurnoolseeds, l_voice, 'Pitch Voice AI', 'High', 'Not Started', null),
    (c_kurnoolseeds, l_campaigns, 'WhatsApp campaign execution', 'Medium', 'Not Started', null),
    (c_kurnoolseeds, l_content, 'Speed up content deliveries', 'Medium', 'Not Started', null),
    (c_rubisco, l_calendar, 'Monthly calendar', 'Medium', 'Not Started', null),
    (c_cyagro, l_calendar, 'Monthly calendar', 'Medium', 'Not Started', null),
    (c_astoria, l_leadgen, 'More-leads strategy (ads plan done)', 'Medium', 'Not Started', null),
    (c_manduca, l_leadgen, 'More-leads strategy (ads plan done)', 'Medium', 'Not Started', null),
    (c_qh, l_leadgen, 'Create ads plan + leads strategy', 'High', 'Not Started', null),
    (c_bestbuyskips, l_seo, 'SEO + Google Ads + Meta + GMB setup', 'High', 'Not Started', null),
    (c_nidhikg, l_seo, 'SEO plan', 'Medium', 'Not Started', null);

  -- --------------------------------------------------------------------
  -- Nidhi Seeds campaign — "Nidhi Rabi 2026"
  -- --------------------------------------------------------------------
  insert into campaigns (client_id, name, crop, region, channels, status, go_live_date, lane_id, playbook_id, description)
  values (
    c_nidhiseeds, 'Nidhi Rabi 2026', 'Cumin, Coriander, Mustard', 'Gujarat, Rajasthan, Madhya Pradesh',
    array['Meta','Truecaller','WhatsApp','Voice','YouTube']::channel_type[],
    'Building', '2026-09-01', l_campaigns, pb_crop,
    'Multi-crop Rabi pre-sowing campaign for Nidhi Seeds — 6-day parallel launch sprint to a 01-Sep go-live.'
  )
  returning id into camp_nidhi;

  -- the 6 Nidhi tasks already tracked, now attached to the campaign
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date) values
    (c_nidhiseeds, camp_nidhi, l_content, 'Micro-drama with spicy script', 'Medium', 'In Progress', '2026-09-01'),
    (c_nidhiseeds, camp_nidhi, l_incentive, 'Farmer incentive: QR in pouch for lucky draw', 'Medium', 'In Progress', '2026-09-01'),
    (c_nidhiseeds, camp_nidhi, l_campaigns, 'Cumin campaign — Gujarat & Rajasthan (plan + creative)', 'High', 'In Progress', '2026-09-01'),
    (c_nidhiseeds, camp_nidhi, l_campaigns, 'Coriander campaign — Madhya Pradesh', 'High', 'In Progress', '2026-09-01'),
    (c_nidhiseeds, camp_nidhi, l_campaigns, 'Mustard campaign — Rajasthan & MP', 'High', 'In Progress', '2026-09-01'),
    (c_nidhiseeds, camp_nidhi, l_incentive, 'Product-authenticity check for farmers', 'Medium', 'In Progress', '2026-09-01');

  -- --------------------------------------------------------------------
  -- Nidhi Launch Sprint — 6-day parallel sprint, 26-Aug to 01-Sep-2026
  -- --------------------------------------------------------------------
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, is_critical_path)
  values (c_nidhiseeds, camp_nidhi, l_incentive, 'Lock QR-verify + lucky-draw vendor/build', 'High', 'In Progress', '2026-08-26', true)
  returning id into t_vendor;

  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on, is_critical_path)
  values (c_nidhiseeds, camp_nidhi, l_incentive, 'Generate unique per-pouch QR codes', 'High', 'Not Started', '2026-08-27', array[t_vendor], true)
  returning id into t_qrcodes;

  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on, is_critical_path)
  values (c_nidhiseeds, camp_nidhi, l_incentive, '''Genuine Nidhi'' verification page', 'High', 'Not Started', '2026-08-28', array[t_qrcodes], true)
  returning id into t_verifypage;

  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on, is_critical_path)
  values (c_nidhiseeds, camp_nidhi, l_incentive, 'Lucky-draw engine + entry capture', 'High', 'Not Started', '2026-08-29', array[t_verifypage], true)
  returning id into t_luckydraw;

  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on, is_critical_path)
  values (c_nidhiseeds, camp_nidhi, l_incentive, 'End-to-end scan + draw test', 'High', 'Not Started', '2026-08-30', array[t_luckydraw], true)
  returning id into t_e2etest;

  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date) values
    (c_nidhiseeds, camp_nidhi, l_content, 'Authenticity + germination copy, 3 crops', 'Medium', 'Not Started', '2026-08-27')
    returning id into t_copy;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date) values
    (c_nidhiseeds, camp_nidhi, l_content, 'Ad creatives / reels design, 3 crops', 'Medium', 'Not Started', '2026-08-28')
    returning id into t_creatives;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on) values
    (c_nidhiseeds, camp_nidhi, l_clientprep, 'Client + Newway approvals', 'High', 'Not Started', '2026-08-29', array[t_copy, t_creatives])
    returning id into t_approvals;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on, is_critical_path) values
    (c_nidhiseeds, camp_nidhi, l_content, 'Schedule / upload all assets', 'High', 'Not Started', '2026-09-01', array[t_approvals], true)
    returning id into t_schedule;

  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date) values
    (c_nidhiseeds, camp_nidhi, l_clientprep, 'Lock Ep.1 micro-drama script ''Do Thaili''', 'High', 'Not Started', '2026-08-26')
    returning id into t_script;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on) values
    (c_nidhiseeds, camp_nidhi, l_content, 'Shoot Ep.1', 'High', 'Not Started', '2026-08-27', array[t_script])
    returning id into t_shoot;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on) values
    (c_nidhiseeds, camp_nidhi, l_content, 'Edit + subtitle Ep.1', 'High', 'Not Started', '2026-08-28', array[t_shoot])
    returning id into t_edit;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date) values
    (c_nidhiseeds, camp_nidhi, l_content, 'Ep.2 & 3 scripts', 'Medium', 'Not Started', '2026-08-28')
    returning id into t_ep23;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on, is_critical_path) values
    (c_nidhiseeds, camp_nidhi, l_content, 'Ep.1 publish-ready', 'High', 'Not Started', '2026-09-01', array[t_edit], true)
    returning id into t_ep1ready;

  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date) values
    (c_nidhiseeds, camp_nidhi, l_campaigns, 'Meta: ad account/pixel + district audiences', 'High', 'Not Started', '2026-08-26')
    returning id into t_metasetup;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on) values
    (c_nidhiseeds, camp_nidhi, l_campaigns, 'Meta: build ad sets by crop/district', 'High', 'Not Started', '2026-08-28', array[t_metasetup])
    returning id into t_metaadsets;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on) values
    (c_nidhiseeds, camp_nidhi, l_campaigns, 'Meta: QA + budgets', 'High', 'Not Started', '2026-08-30', array[t_metaadsets])
    returning id into t_metaqa;

  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date) values
    (c_nidhiseeds, camp_nidhi, l_campaigns, 'Truecaller: creative + booking (creative)', 'Medium', 'Not Started', '2026-08-27')
    returning id into t_truecaller_creative;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on) values
    (c_nidhiseeds, camp_nidhi, l_campaigns, 'Truecaller: booking confirmed', 'Medium', 'Not Started', '2026-08-30', array[t_truecaller_creative])
    returning id into t_truecaller_book;

  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date) values
    (c_nidhiseeds, camp_nidhi, l_campaigns, 'WhatsApp: templates + opt-in list', 'Medium', 'Not Started', '2026-08-27')
    returning id into t_wa_templates;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on) values
    (c_nidhiseeds, camp_nidhi, l_campaigns, 'WhatsApp: test broadcast', 'Medium', 'Not Started', '2026-08-30', array[t_wa_templates])
    returning id into t_wa_test;

  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date) values
    (c_nidhiseeds, camp_nidhi, l_voice, 'Voice AI: call scripts per crop', 'Medium', 'Not Started', '2026-08-26')
    returning id into t_voice_scripts;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on) values
    (c_nidhiseeds, camp_nidhi, l_voice, 'Voice AI: voice + flow build + test', 'Medium', 'Not Started', '2026-08-29', array[t_voice_scripts])
    returning id into t_voice_build;

  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date) values
    (c_nidhiseeds, camp_nidhi, l_clientprep, 'Dealer: pouch QR print + POS', 'Medium', 'Not Started', '2026-08-29')
    returning id into t_dealer_print;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on) values
    (c_nidhiseeds, camp_nidhi, l_clientprep, 'Dealer WhatsApp brief', 'Medium', 'Not Started', '2026-08-30', array[t_dealer_print])
    returning id into t_dealer_wa;

  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date) values
    (c_nidhiseeds, camp_nidhi, l_incentive, 'Lucky draw: terms + prize ladder lock', 'High', 'Not Started', '2026-08-26')
    returning id into t_draw_terms;
  insert into tasks (client_id, campaign_id, lane_id, title, priority, status, due_date, depends_on) values
    (c_nidhiseeds, camp_nidhi, l_incentive, 'Lucky draw: mechanic tested with backend', 'High', 'Not Started', '2026-08-30', array[t_draw_terms, t_luckydraw])
    returning id into t_draw_mechanic;

  -- Go-live calendar event
  insert into calendar_events (client_id, campaign_id, title, type, starts_at)
  values (c_nidhiseeds, camp_nidhi, 'Nidhi Rabi 2026 — Go Live', 'Go-Live', '2026-09-01 09:00:00+05:30');

end $$;
