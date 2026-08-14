/**
 * Server-only notification delivery: admin + customer email (Resend) and a
 * signed outbound webhook. Every failure is logged and swallowed — a stored
 * quote must never be lost because a notification failed.
 */
import { BUSINESS } from "@/features/quote/data/catalog";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

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

async function send(
  template: string,
  to: string,
  templateData: Record<string, unknown>,
  idempotencyKey: string,
) {
  try {
    const result = await sendTemplateEmail(template, to, { templateData, idempotencyKey });
    if (!result.sent) {
      console.warn(`[quote-notify] ${template} not sent: ${result.reason}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[quote-notify] ${template} failed`, error);
    return false;
  }
}

export async function sendAdminNotification(q: NotificationQuote, adminUrl: string) {
  const to = process.env["QUOTE_ADMIN_EMAIL"] ?? BUSINESS.email;
  const address = q.service_address ?? {};
  const rows = [
    { label: "Requested service", value: label(q.requested_service) },
    { label: "Glass area", value: label(q.glass_area) },
    { label: "Damage summary", value: damageSummary(q) },
    { label: "Damage cause", value: label(q.damage_cause) },
    { label: "Insurance", value: label(q.insurance_method) },
    { label: "Vehicle", value: vehicleOf(q) },
    {
      label: "Service location",
      value: `${label(q.service_location_type)} — ${[address["streetAddress"], address["city"], address["postalCode"]].filter(Boolean).join(", ")}`,
    },
    {
      label: "Preferred date",
      value: `${label(q.preferred_date)} ${label(q.preferred_time)} (${label(q.preferred_urgency)})`,
    },
    { label: "Customer", value: label(q.customer_name) },
    { label: "Phone", value: label(q.customer_phone) },
    { label: "Email", value: label(q.customer_email) },
    { label: "Preferred contact", value: label(q.preferred_contact_method) },
    { label: "Notes", value: label(q.customer_notes) },
  ];

  return send(
    "quote-admin-notification",
    to,
    {
      reference: q.public_reference,
      vehicleLine:
        [q.vehicle_year, q.vehicle_make, q.vehicle_model].filter(Boolean).join(" ") || "Vehicle TBC",
      priority: q.priority,
      submittedAt: new Date(q.created_at).toLocaleString("en-CA"),
      adasReview: q.adas_required_review,
      rows,
      adminUrl,
    },
    `quote-admin-${q.id}`,
  );
}

export async function sendCustomerConfirmation(q: NotificationQuote) {
  if (!q.customer_email) return false;
  return send(
    "quote-customer-confirmation",
    q.customer_email,
    {
      firstName: q.customer_name.split(" ")[0] || "there",
      reference: q.public_reference,
      vehicle: vehicleOf(q),
      service: label(q.requested_service),
      phone: BUSINESS.phone,
      phoneHref: BUSINESS.phoneHref,
      businessName: BUSINESS.name,
    },
    `quote-customer-${q.id}`,
  );
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
