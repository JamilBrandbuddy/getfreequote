// Client-safe campaign logic: eligibility (CASL), dedupe, personalization, HTML rendering.
import logoAsset from "@/assets/riverbend-logo.png.asset.json";

export const SITE_ORIGIN = "https://quotes.riverbendautoglass.ca";
export const LOGO_URL = SITE_ORIGIN + logoAsset.url;

export type MessageType = "promotional" | "review_request" | "follow_up";
export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  promotional: "Promotion / offer", review_request: "Review request", follow_up: "Customer follow-up",
};
export const TEMPLATE_CATEGORIES = {
  google_review: "Google review request", facebook_review: "Facebook review request", seasonal: "Seasonal promotion",
  offer: "Special offer", follow_up: "Customer follow-up", announcement: "General announcement",
} as const;
export type TemplateCategory = keyof typeof TEMPLATE_CATEGORIES;

export interface ConsentRecord { email: string; consent_type: "express" | "implied_purchase" | "implied_inquiry"; source: string; consented_at: string; expires_at: string | null }
export interface Candidate { email: string; name: string | null; service: string | null; segment: string; convertedAt: string | null; quoteConsent: { at: string } | null }
export type Eligibility = { eligible: true; basis: string } | { eligible: false; reason: "suppressed" | "no_consent" | "invalid_email" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const normalizeEmail = (e: string | null | undefined) => { const v = (e ?? "").trim().toLowerCase(); return EMAIL_RE.test(v) ? v : null; };
const DAY = 86400000;

/** CASL: express consent never expires (until withdrawn). Implied purchase consent lasts 2 years.
 *  Quote submission alone is never treated as consent. */
export function eligibility(c: Candidate, type: MessageType, consents: ConsentRecord[], suppressed: Set<string>, now = Date.now()): Eligibility {
  const email = normalizeEmail(c.email);
  if (!email) return { eligible: false, reason: "invalid_email" };
  if (suppressed.has(email)) return { eligible: false, reason: "suppressed" };
  const valid = consents.filter((r) => normalizeEmail(r.email) === email && (!r.expires_at || Date.parse(r.expires_at) > now));
  const express = valid.find((r) => r.consent_type === "express");
  if (express) return { eligible: true, basis: `Express consent (${express.source}, ${express.consented_at.slice(0, 10)})` };
  if (c.quoteConsent) return { eligible: true, basis: `Express consent (quote form opt-in, ${c.quoteConsent.at.slice(0, 10)})` };
  if (type === "review_request") {
    if (c.segment === "converted" && c.convertedAt && now - Date.parse(c.convertedAt) < 730 * DAY)
      return { eligible: true, basis: `Implied consent — verified purchase ${c.convertedAt.slice(0, 10)} (2-year window)` };
    const purchase = valid.find((r) => r.consent_type === "implied_purchase");
    if (purchase) return { eligible: true, basis: `Implied consent — purchase (${purchase.source})` };
  }
  return { eligible: false, reason: "no_consent" };
}

export function dedupeCandidates(list: Candidate[]): Candidate[] {
  const map = new Map<string, Candidate>();
  for (const c of list) {
    const e = normalizeEmail(c.email); if (!e) continue;
    const prev = map.get(e);
    if (!prev) { map.set(e, { ...c, email: e }); continue; }
    map.set(e, { ...prev, name: prev.name ?? c.name, service: prev.service ?? c.service,
      segment: prev.segment === "converted" || c.segment === "converted" ? "converted" : prev.segment,
      convertedAt: prev.convertedAt ?? c.convertedAt, quoteConsent: prev.quoteConsent ?? c.quoteConsent });
  }
  return [...map.values()];
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
export function firstName(name: string | null | undefined) { const n = (name ?? "").trim().split(/\s+/)[0]; return n && n.length <= 40 ? n : ""; }
export function personalize(text: string, v: { customer_name?: string | null; service_type?: string | null }, html = true) {
  const enc = html ? escapeHtml : (s: string) => s;
  return text
    .replace(/\{\{\s*customer_name\s*\}\}/g, enc(firstName(v.customer_name) || "there"))
    .replace(/\{\{\s*service_type\s*\}\}/g, enc((v.service_type ?? "").trim().replace(/-/g, " ") || "auto glass service"))
    .replace(/\{\{[^}]*\}\}/g, "");
}

export interface SignatureData { sender_name?: string | null; job_title?: string | null; company_name?: string | null; phone?: string | null; email?: string | null; website?: string | null; address?: string | null; facebook_url?: string | null; instagram_url?: string | null; custom_html?: string | null; show_logo?: boolean; brand_color?: string }
const safeUrl = (u?: string | null) => (u && /^https:\/\/[^\s"<>]+$/i.test(u) ? u : null);
const safeColor = (c?: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : "#0b2545");

export function renderSignature(s: SignatureData) {
  const color = safeColor(s.brand_color); const e = (v?: string | null) => (v ? escapeHtml(v) : "");
  const lines: string[] = [];
  if (s.sender_name) lines.push(`<strong style="color:${color};font-size:15px">${e(s.sender_name)}</strong>`);
  if (s.job_title || s.company_name) lines.push([e(s.job_title), e(s.company_name)].filter(Boolean).join(" · "));
  if (s.phone) lines.push(`<a href="tel:${e(s.phone.replace(/[^\d+]/g, ""))}" style="color:${color}">${e(s.phone)}</a>`);
  if (s.email) lines.push(`<a href="mailto:${e(s.email)}" style="color:${color}">${e(s.email)}</a>`);
  if (safeUrl(s.website)) lines.push(`<a href="${e(s.website)}" style="color:${color}">${e(s.website!.replace(/^https:\/\//, ""))}</a>`);
  if (s.address) lines.push(e(s.address));
  const social = [["Facebook", s.facebook_url], ["Instagram", s.instagram_url]].filter(([, u]) => safeUrl(u)).map(([l, u]) => `<a href="${e(u)}" style="color:${color}">${l}</a>`);
  if (social.length) lines.push(social.join(" · "));
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:2px solid ${color};padding-top:14px"><tr>${s.show_logo !== false ? `<td style="padding:14px 14px 0 0;vertical-align:top"><img src="${LOGO_URL}" alt="Riverbend Autoglass" width="72" style="display:block;width:72px;height:auto"></td>` : ""}<td style="padding-top:14px;font-size:13px;line-height:1.6;color:#334155">${lines.join("<br>")}${s.custom_html ? `<div style="margin-top:6px">${s.custom_html}</div>` : ""}</td></tr></table>`;
}

export interface RenderInput { subject: string; previewText: string; bodyHtml: string; signatureHtml?: string | null; senderName: string; mailingAddress: string | null; unsubscribeUrl: string; vars: { customer_name?: string | null; service_type?: string | null } }
/** Table-based, inline-styled layout for broad client support. Footer (sender ID + unsubscribe) is always included. */
export function renderEmail(i: RenderInput) {
  const body = personalize(i.bodyHtml, i.vars);
  const address = i.mailingAddress?.trim() ? escapeHtml(i.mailingAddress) : "[Mailing address required before sending]";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(personalize(i.subject, i.vars, false))}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1e293b">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(personalize(i.previewText, i.vars, false))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border:1px solid #e2e8f0;border-radius:12px">
<tr><td style="padding:28px 28px 8px;font-size:15px;line-height:1.6">${body}${i.signatureHtml ?? ""}</td></tr>
<tr><td style="padding:20px 28px 28px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#64748b">
Sent by ${escapeHtml(i.senderName)}, ${address}.<br>You are receiving this email because of your relationship with ${escapeHtml(i.senderName)}.<br>
<a href="${escapeHtml(i.unsubscribeUrl)}" style="color:#0b2545;text-decoration:underline">Unsubscribe</a> — we will stop sending you these emails within 10 business days.
</td></tr></table></td></tr></table></body></html>`;
}

export function ctaButtonHtml(label: string, url: string) {
  const u = safeUrl(url); if (!u) return "";
  return `<p style="text-align:center"><a href="${escapeHtml(u)}" style="display:inline-block;background:#0b2545;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(label || "Learn more")}</a></p>`;
}

export const STARTER_TEMPLATES: { name: string; category: TemplateCategory; subject: string; preview_text: string; body_html: string }[] = [
  { name: "Google review request", category: "google_review", subject: "How was your Riverbend Autoglass service?", preview_text: "We'd value your honest feedback.",
    body_html: `<h2>Hi {{customer_name}},</h2><p>Thank you for choosing Riverbend Autoglass for your {{service_type}}.</p><p>If you have a moment, we would appreciate your honest feedback about your experience — whatever it was. Your review helps other drivers and helps us improve.</p>{{google_review_button}}<p>Thank you,</p>` },
  { name: "Facebook recommendation request", category: "facebook_review", subject: "Share your experience with Riverbend Autoglass", preview_text: "Your honest feedback helps us improve.",
    body_html: `<h2>Hi {{customer_name}},</h2><p>Thanks again for trusting us with your {{service_type}}. We'd welcome your honest feedback on our Facebook page.</p>{{facebook_review_button}}<p>Thank you,</p>` },
  { name: "Winter windshield check", category: "seasonal", subject: "Get your windshield winter-ready", preview_text: "Small chips can spread fast in the cold.",
    body_html: `<h2>Hi {{customer_name}},</h2><p>Prairie temperature swings can turn a small chip into a long crack. Book a quick inspection before the deep freeze.</p><ul><li>Fast chip repair</li><li>Insurance claims handled</li><li>Mobile service available</li></ul>` },
  { name: "Special offer", category: "offer", subject: "A special offer from Riverbend Autoglass", preview_text: "Limited-time savings on auto glass.", body_html: `<h2>Hi {{customer_name}},</h2><p>Describe your offer here, including any terms and the end date.</p>` },
  { name: "Quote follow-up", category: "follow_up", subject: "Following up on your auto glass quote", preview_text: "Any questions about your quote?", body_html: `<h2>Hi {{customer_name}},</h2><p>We wanted to follow up on your recent {{service_type}} quote request. Reply to this email or call us if you have any questions.</p>` },
  { name: "General announcement", category: "announcement", subject: "News from Riverbend Autoglass", preview_text: "An update from our team.", body_html: `<h2>Hi {{customer_name}},</h2><p>Write your announcement here.</p>` },
];
