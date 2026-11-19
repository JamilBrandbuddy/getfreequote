import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { groupCustomers, filterCustomers, encodeCustomerKey, type CustomerQuoteRow } from "./customer-directory";
import { eligibility, dedupeCandidates, normalizeEmail, renderEmail, renderSignature, ctaButtonHtml, STARTER_TEMPLATES, SITE_ORIGIN, type Candidate, type ConsentRecord, type MessageType } from "./email-campaign";

type Ctx = { supabase: any; userId: string; claims: any };
async function requireOperator(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("is_operator", { _user_id: ctx.userId });
  if (error || !data) throw new Error("Dashboard access required.");
}
const httpsOrEmpty = z.string().trim().max(500).refine((v) => !v || /^https:\/\/\S+$/i.test(v), "Must be an https:// link");

// ---------- overview / settings ----------
export const getEmailOverview = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const [c, t, s, sup, set, con] = await Promise.all([
    ctx.supabase.from("email_campaigns").select("id,name,message_type,status,audience,recipient_count,sent_count,failed_count,delivered_count,unsubscribed_count,created_by_email,created_at,sent_at,updated_at").order("created_at", { ascending: false }),
    ctx.supabase.from("email_templates").select("*").order("created_at"),
    ctx.supabase.from("email_signatures").select("*").order("created_at"),
    ctx.supabase.from("email_suppressions").select("*").order("created_at", { ascending: false }).limit(500),
    ctx.supabase.from("email_settings").select("*").maybeSingle(),
    ctx.supabase.from("email_consents").select("*").order("recorded_at", { ascending: false }).limit(500),
  ]);
  const { marketingProviderStatus } = await import("./campaigns.server");
  return { campaigns: c.data ?? [], templates: t.data ?? [], signatures: s.data ?? [], suppressions: sup.data ?? [], consents: con.data ?? [], settings: set.data, provider: marketingProviderStatus() };
});

export const saveEmailSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ sender_name: z.string().trim().min(2).max(120), sender_email: z.string().trim().max(200).refine((v) => !v || !!normalizeEmail(v), "Invalid email"), reply_to: z.string().trim().max(200).refine((v) => !v || !!normalizeEmail(v), "Invalid email"),
    mailing_address: z.string().trim().max(300), google_review_url: httpsOrEmpty, facebook_review_url: httpsOrEmpty, test_recipients: z.array(z.string().email().max(200)).max(10) }))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx; await requireOperator(ctx);
    const { error } = await ctx.supabase.from("email_settings").update({ ...data, sender_email: data.sender_email || null, reply_to: data.reply_to || null, test_recipients: data.test_recipients.map((e) => e.toLowerCase()), updated_by: ctx.userId, updated_at: new Date().toISOString() }).eq("id", true);
    if (error) throw new Error("Could not save settings.");
    return { ok: true };
  });

// ---------- signatures ----------
const sigSchema = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(80), sender_name: z.string().max(100).optional(), job_title: z.string().max(100).optional(), company_name: z.string().max(120).optional(),
  phone: z.string().max(40).optional(), email: z.string().max(200).optional(), website: httpsOrEmpty.optional(), address: z.string().max(300).optional(), facebook_url: httpsOrEmpty.optional(), instagram_url: httpsOrEmpty.optional(),
  custom_html: z.string().max(4000).optional(), show_logo: z.boolean(), brand_color: z.string().regex(/^#[0-9a-f]{6}$/i), is_default: z.boolean() });
export const saveSignature = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(sigSchema).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const { sanitizeEmailHtml } = await import("./email-sanitize");
  const row = { ...data, custom_html: data.custom_html ? sanitizeEmailHtml(data.custom_html) : null };
  if (data.is_default) await ctx.supabase.from("email_signatures").update({ is_default: false }).eq("is_default", true);
  const { id, ...rest } = row;
  const q = id ? ctx.supabase.from("email_signatures").update(rest).eq("id", id) : ctx.supabase.from("email_signatures").insert({ ...rest, created_by: ctx.userId });
  const { error } = await q; if (error) throw new Error("Could not save signature.");
  return { ok: true };
});
export const deleteSignature = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const { error } = await ctx.supabase.from("email_signatures").delete().eq("id", data.id); if (error) throw new Error("Could not delete signature.");
  return { ok: true };
});

// ---------- templates ----------
const tplSchema = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(120), category: z.enum(["google_review", "facebook_review", "seasonal", "offer", "follow_up", "announcement"]), subject: z.string().max(200), preview_text: z.string().max(200), body_html: z.string().max(100000) });
export const saveTemplate = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(tplSchema).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const { sanitizeEmailHtml } = await import("./email-sanitize");
  const { id, ...rest } = { ...data, body_html: sanitizeEmailHtml(data.body_html) };
  const q = id ? ctx.supabase.from("email_templates").update(rest).eq("id", id) : ctx.supabase.from("email_templates").insert({ ...rest, created_by: ctx.userId });
  const { error } = await q; if (error) throw new Error("Could not save template.");
  return { ok: true };
});
export const deleteTemplate = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  await ctx.supabase.from("email_templates").delete().eq("id", data.id); return { ok: true };
});
export const addStarterTemplates = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const { error } = await ctx.supabase.from("email_templates").insert(STARTER_TEMPLATES.map((t) => ({ ...t, created_by: ctx.userId })));
  if (error) throw new Error("Could not add templates."); return { ok: true };
});

// ---------- campaigns ----------
const audienceSchema = z.object({
  mode: z.enum(["filters", "manual"]).default("filters"),
  months: z.array(z.string().regex(/^\d{4}-\d{2}$/)).max(36).default([]),
  regions: z.array(z.string().max(20)).max(20).default([]),
  service: z.string().max(100).default("all"), status: z.string().max(40).default("all"),
  segment: z.enum(["all", "converted", "not_converted", "pending"]).default("all"),
  customerIds: z.array(z.string().max(400)).max(5000).default([]),
});
export type Audience = z.infer<typeof audienceSchema>;
const campaignSchema = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(150), message_type: z.enum(["promotional", "review_request", "follow_up"]), subject: z.string().max(200), preview_text: z.string().max(200), body_html: z.string().max(200000), signature_id: z.string().uuid().nullable(), audience: audienceSchema });

export const saveCampaign = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(campaignSchema).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const { sanitizeEmailHtml } = await import("./email-sanitize");
  const { id, ...rest } = { ...data, body_html: sanitizeEmailHtml(data.body_html) };
  if (id) {
    const { data: cur } = await ctx.supabase.from("email_campaigns").select("status").eq("id", id).maybeSingle();
    if (!cur) throw new Error("Campaign not found.");
    if (cur.status !== "draft") throw new Error("Only drafts can be edited.");
    const { error } = await ctx.supabase.from("email_campaigns").update(rest).eq("id", id); if (error) throw new Error("Could not save draft.");
    return { id };
  }
  const { data: row, error } = await ctx.supabase.from("email_campaigns").insert({ ...rest, created_by: ctx.userId, created_by_email: ctx.claims?.email ?? null }).select("id").single();
  if (error) throw new Error("Could not create draft."); return { id: row.id as string };
});
export const deleteCampaign = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const { error } = await ctx.supabase.from("email_campaigns").delete().eq("id", data.id).eq("status", "draft"); if (error) throw new Error("Could not delete draft.");
  return { ok: true };
});
export const getCampaign = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const { data: c } = await ctx.supabase.from("email_campaigns").select("*").eq("id", data.id).maybeSingle();
  if (!c) throw new Error("Campaign not found.");
  const { data: rec } = await ctx.supabase.from("email_campaign_recipients").select("email,status,last_error,sent_at,attempts").eq("campaign_id", data.id).order("created_at").limit(2000);
  return { campaign: c, recipients: rec ?? [] };
});

// ---------- audience ----------
const COLS = "id, public_reference, created_at, status, requested_service, glass_area, customer_name, customer_phone, customer_email, vehicle_year, vehicle_make, vehicle_model, service_address, conversion_status, conversion_changed_at, marketing_consent";
async function loadAudience(ctx: Ctx, a: Audience, type: MessageType) {
  const rows: (CustomerQuoteRow & { conversion_changed_at: string | null; marketing_consent: boolean })[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await ctx.supabase.from("quotes").select(COLS).order("created_at", { ascending: false }).range(from, from + 999);
    if (error) throw new Error("Could not load customers.");
    for (const r of data ?? []) { const { service_address, ...rest } = r; rows.push({ ...rest, service_city: service_address?.city ?? null, service_province: service_address?.province ?? null }); }
    if ((data ?? []).length < 1000) break;
  }
  let list = filterCustomers(groupCustomers(rows), rows, { regions: a.regions, service: a.service, status: a.status, segment: a.segment });
  if (a.months.length) { const ms = new Set(a.months); list = list.filter((c) => c.quoteIds.some((id) => { const r = rows.find((x) => x.id === id); return r && ms.has(r.created_at.slice(0, 7)); })); }
  if (a.mode === "manual") { const ids = new Set(a.customerIds); list = list.filter((c) => ids.has(encodeCustomerKey(c.key))); }
  const byId = new Map(rows.map((r) => [r.id, r]));
  const candidates: Candidate[] = [];
  let withoutEmail = 0;
  for (const c of list) {
    if (!c.emails.length) { withoutEmail++; continue; }
    const qs = c.quoteIds.map((id) => byId.get(id)!).filter(Boolean);
    const converted = qs.filter((q) => q.conversion_status === "converted").map((q) => q.conversion_changed_at).filter(Boolean).sort().reverse()[0] ?? null;
    const optIn = qs.filter((q) => q.marketing_consent).map((q) => q.created_at).sort().reverse()[0];
    for (const email of c.emails) candidates.push({ email, name: c.name, service: c.latestService, segment: c.segment, convertedAt: converted, quoteConsent: optIn ? { at: optIn } : null });
  }
  const unique = dedupeCandidates(candidates);
  const [{ data: sup }, { data: cons }] = await Promise.all([ctx.supabase.from("email_suppressions").select("email"), ctx.supabase.from("email_consents").select("email,consent_type,source,consented_at,expires_at")]);
  const suppressed = new Set<string>((sup ?? []).map((s: { email: string }) => s.email.toLowerCase()));
  const results = unique.map((c) => ({ c, e: eligibility(c, type, (cons ?? []) as ConsentRecord[], suppressed) }));
  return {
    summary: { selectedContacts: list.length, withoutEmail, validEmails: unique.length, duplicatesRemoved: candidates.length - unique.length,
      eligible: results.filter((r) => r.e.eligible).length, suppressed: results.filter((r) => !r.e.eligible && r.e.reason === "suppressed").length,
      noConsent: results.filter((r) => !r.e.eligible && r.e.reason === "no_consent").length },
    results,
  };
}
export const previewAudience = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ audience: audienceSchema, message_type: z.enum(["promotional", "review_request", "follow_up"]) })).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const { summary, results } = await loadAudience(ctx, data.audience, data.message_type);
  return { summary, sample: results.slice(0, 200).map(({ c, e }) => ({ email: c.email, name: c.name, segment: c.segment, eligible: e.eligible, detail: e.eligible ? e.basis : e.reason })) };
});

// ---------- rendering / sending ----------
async function buildMessage(ctx: Ctx, campaign: any, vars: { customer_name?: string | null; service_type?: string | null }, unsubscribeUrl: string) {
  const { data: settings } = await ctx.supabase.from("email_settings").select("*").maybeSingle();
  let sig: string | null = null;
  if (campaign.signature_id) { const { data: s } = await ctx.supabase.from("email_signatures").select("*").eq("id", campaign.signature_id).maybeSingle(); if (s) sig = renderSignature(s); }
  const body = String(campaign.body_html)
    .replace(/\{\{\s*google_review_button\s*\}\}/g, settings?.google_review_url ? ctaButtonHtml("Leave a Google review", settings.google_review_url) : "")
    .replace(/\{\{\s*facebook_review_button\s*\}\}/g, settings?.facebook_review_url ? ctaButtonHtml("Share feedback on Facebook", settings.facebook_review_url) : "");
  const html = renderEmail({ subject: campaign.subject, previewText: campaign.preview_text, bodyHtml: body, signatureHtml: sig, senderName: settings?.sender_name ?? "Riverbend Autoglass Inc.", mailingAddress: settings?.mailing_address ?? null, unsubscribeUrl, vars });
  const { personalize } = await import("./email-campaign");
  return { html, subject: personalize(campaign.subject, vars, false), settings };
}
function readiness(campaign: any, settings: any, configured: boolean) {
  const issues: string[] = [];
  if (!configured) issues.push("Marketing email provider is not connected yet.");
  if (!settings?.sender_email) issues.push("Set a sender email address in Settings.");
  if (!settings?.mailing_address?.trim()) issues.push("Add the business mailing address in Settings (required by CASL).");
  if (!campaign.subject?.trim()) issues.push("Add a subject line.");
  if (/google_review_button/.test(campaign.body_html) && !settings?.google_review_url) issues.push("Add the verified Google review link in Settings.");
  if (/facebook_review_button/.test(campaign.body_html) && !settings?.facebook_review_url) issues.push("Add the verified Facebook review link in Settings.");
  return issues;
}

export const sendTestEmail = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().uuid(), to: z.string().email().max(200) })).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const { data: campaign } = await ctx.supabase.from("email_campaigns").select("*").eq("id", data.id).maybeSingle();
  if (!campaign) throw new Error("Campaign not found.");
  const to = data.to.toLowerCase();
  const { html, subject, settings } = await buildMessage(ctx, campaign, { customer_name: "Alex Sample", service_type: "windshield replacement" }, `${SITE_ORIGIN}/unsubscribe/test`);
  const allowed = new Set<string>([...(settings?.test_recipients ?? []), String(ctx.claims?.email ?? "").toLowerCase()]);
  if (!allowed.has(to)) return { ok: false, error: "Test emails can only go to your own address or an internal test address saved in Settings." };
  const { marketingProviderStatus, sendMarketingEmail } = await import("./campaigns.server");
  const issues = readiness(campaign, settings, marketingProviderStatus().configured);
  if (issues.length) return { ok: false, error: issues.join(" ") };
  const r = await sendMarketingEmail({ from: `${settings.sender_name} <${settings.sender_email}>`, to, replyTo: settings.reply_to, subject: `[TEST] ${subject}`, html, unsubscribeUrl: `${SITE_ORIGIN}/unsubscribe/test`, idempotencyKey: `test-${data.id}-${Date.now()}` });
  if (!r.ok) return { ok: false, error: r.error };
  await ctx.supabase.from("email_campaigns").update({ last_test_at: new Date().toISOString(), last_test_to: to }).eq("id", data.id);
  return { ok: true, error: null };
});

export const getSendReadiness = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const { data: campaign } = await ctx.supabase.from("email_campaigns").select("*").eq("id", data.id).maybeSingle();
  const { data: settings } = await ctx.supabase.from("email_settings").select("*").maybeSingle();
  const { marketingProviderStatus } = await import("./campaigns.server");
  const issues = readiness(campaign, settings, marketingProviderStatus().configured);
  if (!campaign?.last_test_at) issues.push("Send a test email first.");
  const { summary } = await loadAudience(ctx, campaign.audience, campaign.message_type);
  if (!summary.eligible) issues.push("No eligible recipients.");
  return { issues, summary };
});

export const confirmAndSend = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().uuid(), confirmCount: z.number().int().min(1) })).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const { data: campaign } = await ctx.supabase.from("email_campaigns").select("*").eq("id", data.id).maybeSingle();
  if (!campaign || campaign.status !== "draft") throw new Error("This campaign is not a draft.");
  const { data: settings } = await ctx.supabase.from("email_settings").select("*").maybeSingle();
  const { marketingProviderStatus } = await import("./campaigns.server");
  const issues = readiness(campaign, settings, marketingProviderStatus().configured);
  if (!campaign.last_test_at) issues.push("Send a test email first.");
  if (issues.length) throw new Error(issues.join(" "));
  const { results } = await loadAudience(ctx, campaign.audience, campaign.message_type);
  const eligible = results.filter((r) => r.e.eligible);
  if (eligible.length !== data.confirmCount) throw new Error(`Recipient count changed to ${eligible.length}. Review recipients again.`);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows = eligible.map(({ c, e }) => ({ campaign_id: data.id, email: c.email, customer_name: c.name, service_type: c.service, lawful_basis: e.eligible ? e.basis : "" }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabaseAdmin.from("email_campaign_recipients").upsert(rows.slice(i, i + 500), { onConflict: "campaign_id,email", ignoreDuplicates: true });
    if (error) throw new Error("Could not queue recipients.");
  }
  await ctx.supabase.from("email_campaigns").update({ status: "sending", recipient_count: rows.length, confirmed_by: ctx.userId, confirmed_at: new Date().toISOString() }).eq("id", data.id).eq("status", "draft");
  return { queued: rows.length };
});

const BATCH = 10;
export const processCampaignBatch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data: campaign } = await db.from("email_campaigns").select("*").eq("id", data.id).maybeSingle();
  if (!campaign || campaign.status !== "sending") return { done: true, status: campaign?.status ?? "unknown" };
  const { data: batch } = await db.from("email_campaign_recipients").select("*").eq("campaign_id", data.id).eq("status", "queued").lt("attempts", 3).order("created_at").limit(BATCH);
  const { sendMarketingEmail } = await import("./campaigns.server");
  const { data: sup } = await db.from("email_suppressions").select("email");
  const suppressed = new Set((sup ?? []).map((s: { email: string }) => s.email));
  for (const r of batch ?? []) {
    // Claim the row so concurrent workers cannot double-send.
    const { data: claimed } = await db.from("email_campaign_recipients").update({ status: "sending", attempts: r.attempts + 1 }).eq("id", r.id).eq("status", "queued").select("id");
    if (!claimed?.length) continue;
    if (suppressed.has(r.email)) { await db.from("email_campaign_recipients").update({ status: "skipped_suppressed" }).eq("id", r.id); continue; }
    const unsub = `${SITE_ORIGIN}/unsubscribe/${r.unsubscribe_token}`;
    const { html, subject, settings } = await buildMessage({ ...ctx, supabase: db }, campaign, { customer_name: r.customer_name, service_type: r.service_type }, unsub);
    const res = await sendMarketingEmail({ from: `${settings.sender_name} <${settings.sender_email}>`, to: r.email, replyTo: settings.reply_to, subject, html, unsubscribeUrl: unsub, idempotencyKey: `campaign-${data.id}-${r.id}` });
    if (res.ok) await db.from("email_campaign_recipients").update({ status: "sent", provider_message_id: res.id, sent_at: new Date().toISOString(), last_error: null }).eq("id", r.id);
    else await db.from("email_campaign_recipients").update({ status: res.retryable && r.attempts + 1 < 3 ? "queued" : "failed", last_error: res.error }).eq("id", r.id);
    await new Promise((ok) => setTimeout(ok, 120)); // provider rate limit
  }
  const { data: all } = await db.from("email_campaign_recipients").select("status").eq("campaign_id", data.id);
  const count = (s: string) => (all ?? []).filter((x: { status: string }) => x.status === s).length;
  const remaining = count("queued") + count("sending");
  const sent = count("sent"), failed = count("failed");
  const status = remaining ? "sending" : failed === 0 ? "sent" : sent === 0 ? "failed" : "partially_failed";
  await db.from("email_campaigns").update({ sent_count: sent, failed_count: failed, status, ...(remaining ? {} : { sent_at: new Date().toISOString() }) }).eq("id", data.id);
  return { done: !remaining, status, sent, failed, remaining, total: (all ?? []).length };
});

// ---------- suppression / consent ----------
export const addSuppression = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ email: z.string().email().max(200), reason: z.enum(["unsubscribed", "bounced", "complaint", "manual"]) })).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const { error } = await ctx.supabase.from("email_suppressions").upsert({ email: data.email.toLowerCase(), reason: data.reason, source: "admin" }, { onConflict: "email", ignoreDuplicates: true });
  if (error) throw new Error("Could not add contact."); return { ok: true };
});
export const recordConsent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ email: z.string().email().max(200), consent_type: z.enum(["express", "implied_purchase", "implied_inquiry"]), source: z.string().trim().min(3).max(200), consented_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), evidence: z.string().trim().min(3).max(1000) })).handler(async ({ data, context }) => {
  const ctx = context as Ctx; await requireOperator(ctx);
  const months = data.consent_type === "implied_purchase" ? 24 : data.consent_type === "implied_inquiry" ? 6 : null;
  const at = new Date(data.consented_at + "T12:00:00Z");
  const expires = months ? new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + months, at.getUTCDate())).toISOString() : null;
  const { error } = await ctx.supabase.from("email_consents").insert({ ...data, email: data.email.toLowerCase(), consented_at: at.toISOString(), expires_at: expires, recorded_by: ctx.userId });
  if (error) throw new Error("Could not record consent."); return { ok: true };
});

// ---------- public unsubscribe ----------
export const unsubscribeByToken = createServerFn({ method: "POST" }).inputValidator(z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) })).handler(async ({ data }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data: r } = await db.from("email_campaign_recipients").select("email,campaign_id").eq("unsubscribe_token", data.token).maybeSingle();
  if (!r) return { ok: false };
  const { data: existing } = await db.from("email_suppressions").select("email").eq("email", r.email).maybeSingle();
  if (!existing) {
    await db.from("email_suppressions").insert({ email: r.email, reason: "unsubscribed", source: "unsubscribe link", campaign_id: r.campaign_id });
    const { count } = await db.from("email_suppressions").select("email", { count: "exact", head: true }).eq("campaign_id", r.campaign_id).eq("reason", "unsubscribed");
    await db.from("email_campaigns").update({ unsubscribed_count: count ?? 0 }).eq("id", r.campaign_id);
  }
  return { ok: true };
});
