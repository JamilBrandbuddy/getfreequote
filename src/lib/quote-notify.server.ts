/**
 * Server-only notification delivery: admin + customer email (Resend) and a
 * signed outbound webhook. Every failure is logged and swallowed — a stored
 * quote must never be lost because a notification failed.
 */
import { BUSINESS } from "@/features/quote/data/catalog";

export interface NotificationQuote {
  id: string;
  public_reference: string;
  created_at: string;
  priority: string;
  glass_area: string | null;
  requested_service: string | null;
  damage_details: Record<string, unknown>;
  damage_cause: string | null;
  insurance_method: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_trim: string | null;
  adas_required_review: boolean;
  service_location_type: string | null;
  service_address: Record<string, unknown>;
  preferred_urgency: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  preferred_contact_method: string | null;
  customer_notes: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

const esc = (v: unknown) =>
  String(v ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const label = (v: unknown) => (v == null || v === "" ? "—" : String(v).replace(/_/g, " "));

const vehicleOf = (q: NotificationQuote) =>
  [q.vehicle_year, q.vehicle_make, q.vehicle_model, q.vehicle_trim].filter(Boolean).join(" ") ||
  "Vehicle not provided";

function damageSummary(q: NotificationQuote) {
  const entries = Object.entries(q.damage_details ?? {});
  if (!entries.length) return "—";
  return entries
    .map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").toLowerCase()}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    console.warn("[quote-notify] RESEND_API_KEY missing — email skipped:", subject);
    return false;
  }
  const from = process.env["QUOTE_EMAIL_FROM"] ?? `${BUSINESS.name} <quotes@riverbendautoglass.ca>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      console.error(`[quote-notify] Resend failed [${res.status}]: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[quote-notify] Resend request threw", error);
    return false;
  }
}

export async function sendAdminNotification(q: NotificationQuote, adminUrl: string) {
  const to = process.env["QUOTE_ADMIN_EMAIL"] ?? BUSINESS.email;
  const subject = `New Auto Glass Quote — ${q.public_reference} — ${[q.vehicle_year, q.vehicle_make, q.vehicle_model].filter(Boolean).join(" ") || "Vehicle TBC"}`;
  const row = (k: string, v: unknown) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-size:14px;color:#0f172a">${esc(label(v))}</td></tr>`;

  const address = q.service_address ?? {};
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:24px">
    <div style="max-width:640px;margin:0 auto">
      <p style="display:inline-block;background:${q.priority === "urgent" ? "#b91c1c" : "#0f2748"};color:#fff;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:bold;margin:0 0 12px">
        ${esc(q.priority.toUpperCase())} PRIORITY
      </p>
      <h1 style="font-size:20px;color:#0f172a;margin:0 0 4px">New quote request ${esc(q.public_reference)}</h1>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px">${esc(new Date(q.created_at).toLocaleString("en-CA"))}</p>
      ${q.adas_required_review ? `<p style="background:#fff7ed;border:1px solid #fdba74;color:#9a3412;padding:12px 14px;border-radius:12px;font-size:14px">⚠️ ADAS review required — camera / driver-assist calibration likely.</p>` : ""}
      <table style="width:100%;border-collapse:collapse">
        ${row("Requested service", q.requested_service)}
        ${row("Glass area", q.glass_area)}
        ${row("Damage summary", damageSummary(q))}
        ${row("Damage cause", q.damage_cause)}
        ${row("Insurance", q.insurance_method)}
        ${row("Vehicle", vehicleOf(q))}
        ${row("Service location", `${label(q.service_location_type)} — ${esc(address["streetAddress"] ?? "")} ${esc(address["city"] ?? "")} ${esc(address["postalCode"] ?? "")}`)}
        ${row("Preferred date", `${label(q.preferred_date)} ${label(q.preferred_time)} (${label(q.preferred_urgency)})`)}
        ${row("Customer", q.customer_name)}
        ${row("Phone", q.customer_phone)}
        ${row("Email", q.customer_email)}
        ${row("Preferred contact", q.preferred_contact_method)}
        ${row("Notes", q.customer_notes)}
      </table>
      <p style="margin:24px 0 0"><a href="${esc(adminUrl)}" style="background:#f59e0b;color:#1c1917;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:bold;font-size:14px">Open the full record</a></p>
    </div></body></html>`;

  return sendEmail(to, subject, html);
}

export async function sendCustomerConfirmation(q: NotificationQuote) {
  if (!q.customer_email) return false;
  const subject = `We Received Your Auto Glass Quote Request — ${q.public_reference}`;
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:24px">
    <div style="max-width:600px;margin:0 auto">
      <h1 style="font-size:22px;color:#0f172a;margin:0 0 12px">Thanks, ${esc(q.customer_name.split(" ")[0])} — we've got your request</h1>
      <p style="font-size:15px;color:#334155;line-height:1.6">Your reference number is <strong>${esc(q.public_reference)}</strong>. Please quote it when you call.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:12px">
        <tr><td style="padding:12px 16px;font-size:14px;color:#64748b">Vehicle</td><td style="padding:12px 16px;font-size:14px;color:#0f172a">${esc(vehicleOf(q))}</td></tr>
        <tr><td style="padding:12px 16px;font-size:14px;color:#64748b">Requested service</td><td style="padding:12px 16px;font-size:14px;color:#0f172a">${esc(label(q.requested_service))}</td></tr>
      </table>
      <p style="font-size:15px;color:#334155;line-height:1.6">
        This is a confirmation that we received your details — your price and your appointment are
        <strong>not confirmed yet</strong>. One of our advisors will review your request, verify the
        glass and features for your vehicle, and contact you with a written quote and available times.
      </p>
      <h2 style="font-size:16px;color:#0f172a;margin:24px 0 8px">What happens next</h2>
      <ol style="font-size:15px;color:#334155;line-height:1.7;padding-left:20px;margin:0">
        <li>We verify your glass and vehicle features.</li>
        <li>We confirm your ${esc(BUSINESS.shortName ? "SGI" : "insurance")} claim or private pricing.</li>
        <li>We contact you with your quote and book a time that suits you.</li>
      </ol>
      <p style="font-size:15px;color:#334155;line-height:1.6;margin-top:24px">
        Need us sooner? Call <a href="${esc(BUSINESS.phoneHref)}" style="color:#0f2748;font-weight:bold">${esc(BUSINESS.phone)}</a>.
      </p>
      <p style="font-size:13px;color:#94a3b8;margin-top:24px">${esc(BUSINESS.name)}</p>
    </div></body></html>`;

  return sendEmail(q.customer_email, subject, html);
}

/* ----------------------------------------------------------------- webhook */

export async function sendQuoteWebhook(q: NotificationQuote, adminUrl: string) {
  const url = process.env["QUOTE_WEBHOOK_URL"];
  if (!url) return false;
  const secret = process.env["QUOTE_WEBHOOK_SECRET"] ?? "";

  const body = JSON.stringify({
    event: "quote.created",
    reference: q.public_reference,
    submitted_at: q.created_at,
    priority: q.priority,
    customer: {
      name: q.customer_name,
      phone: q.customer_phone,
      email: q.customer_email,
      preferred_contact_method: q.preferred_contact_method,
    },
    vehicle: {
      year: q.vehicle_year,
      make: q.vehicle_make,
      model: q.vehicle_model,
      trim: q.vehicle_trim,
    },
    service: { glass_area: q.glass_area, requested_service: q.requested_service },
    insurance_method: q.insurance_method,
    utm: {
      source: q.utm_source,
      medium: q.utm_medium,
      campaign: q.utm_campaign,
      content: q.utm_content,
      term: q.utm_term,
    },
    admin_url: adminUrl,
  });

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
      headers["X-Riverbend-Signature"] = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    const res = await fetch(url, { method: "POST", headers, body });
    if (!res.ok) console.error(`[quote-webhook] failed [${res.status}]: ${await res.text()}`);
    return res.ok;
  } catch (error) {
    console.error("[quote-webhook] request threw", error);
    return false;
  }
}
