/**
 * Server-only validation, sanitisation, priority scoring and column mapping
 * for quote submissions. Never imported by client code.
 */
import { buildStepSchema } from "@/features/quote/machine/questions";
import { STEPS, needsAdas } from "@/features/quote/machine/steps";
import type { QuoteAnswers } from "@/features/quote/types";
import type { Json } from "@/integrations/supabase/types";

/* -------------------------------------------------------------- sanitising */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function clean(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(CONTROL_CHARS, "").replace(/<[^>]*>/g, "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function cleanRecord(answers: QuoteAnswers, keys: (keyof QuoteAnswers)[]): Json {
  const out: Record<string, Json> = {};
  for (const key of keys) {
    const value = answers[key];
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      const list = value.map((v) => clean(v, 120)).filter(Boolean);
      if (list.length) out[key] = list;
    } else if (typeof value === "boolean") {
      out[key] = value;
    } else {
      const text = clean(value, 1000);
      if (text) out[key] = text;
    }
  }
  return out;
}

/* -------------------------------------------------------------- validation */

const DAMAGE_KEYS: (keyof QuoteAnswers)[] = [
  "triageSymptom", "triageWhere", "chipCount", "chipSize", "chipLocation",
  "crackSpreading", "replacementCondition", "drivable", "leakWhen", "waterInside",
  "priorReplacement", "adasReason", "adasPriorWork", "sideGlassState", "debrisInDoor",
  "windowStuck", "vehicleSecure", "sunroofIssue", "sunroofExploded", "mirrorScope",
  "damageNotes", "policeFileNumber", "collisionLargerClaim", "hailMultiplePanels",
  "otherDamageNotes",
];

const INSURANCE_KEYS: (keyof QuoteAnswers)[] = [
  "sgiClaimNumber", "sgiOnlyItem", "sgiCustomerName",
];

const FEATURE_KEYS: (keyof QuoteAnswers)[] = [
  "featWindshield", "featDoor", "featRear", "featSunroof", "featMirror",
];

const ADDRESS_KEYS: (keyof QuoteAnswers)[] = ["city", "postalCode", "streetAddress"];

export interface ValidationOutcome {
  ok: boolean;
  fieldErrors: Record<string, string>;
  /** Answers with every unreachable (hidden) answer removed. */
  answers: QuoteAnswers;
}

/**
 * Re-runs the wizard's own conditional rules on the server: hidden answers are
 * dropped, and every visible required question must be answered.
 */
export function revalidateAnswers(input: QuoteAnswers): ValidationOutcome {
  const fieldErrors: Record<string, string> = {};
  const answers: QuoteAnswers = {};

  for (const step of STEPS) {
    if (step.visible && !step.visible(input)) continue;
    if (step.kind !== "questions" || !step.questions) continue;

    const visible = step.questions.filter((q) => !q.visible || q.visible(input));
    for (const q of visible) {
      const value = input[q.key];
      if (value !== undefined) (answers as Record<string, unknown>)[q.key] = value;
    }

    const result = buildStepSchema(step.questions, input).safeParse(
      Object.fromEntries(visible.map((q) => [q.key, input[q.key]])),
    );
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }
  }

  // Glass area is chosen on a custom step, so carry it explicitly.
  if (input.glassArea) answers.glassArea = input.glassArea;
  else fieldErrors["glassArea"] = "Please choose the glass that needs attention.";

  return { ok: Object.keys(fieldErrors).length === 0, fieldErrors, answers };
}

/* ---------------------------------------------------------------- priority */

export type Priority = "urgent" | "high" | "normal" | "low";

export function computePriority(a: QuoteAnswers): Priority {
  const unsecured = a.vehicleSecure === "needs_board";
  const glassMissing = a.sideGlassState === "broken_out" || a.sideGlassState === "missing";
  const looseGlass = a.debrisInDoor === "yes";
  const emergency = a.urgency === "asap";
  const breakIn = a.damageCause === "vandalism" && glassMissing;

  if (unsecured || glassMissing || looseGlass || emergency || breakIn) return "urgent";

  if (
    a.drivable === "no" ||
    a.crackSpreading === "yes" ||
    a.replacementCondition === "shattered" ||
    a.sunroofIssue === "shattered" ||
    a.urgency === "this_week"
  ) {
    return "high";
  }

  if (a.urgency === "flexible") return "low";
  return "normal";
}

export function requiresAdasReview(a: QuoteAnswers): boolean {
  return needsAdas(a) || (a.featWindshield ?? []).includes("camera");
}

/* ----------------------------------------------------------------- mapping */

export function toQuoteRow(a: QuoteAnswers, extra: {
  publicReference: string;
  priority: Priority;
  adas: boolean;
  utm: Record<string, string | undefined>;
  landingPage?: string | null;
  referrer?: string | null;
  ipHash: string | null;
  userAgent: string | null;
}) {
  const preferredDate = clean(a.preferredDate, 20);
  return {
    public_reference: extra.publicReference,
    status: "new" as const,
    priority: extra.priority,
    glass_area: clean(a.glassArea, 60),
    requested_service: clean(a.service, 60),
    damage_details: cleanRecord(a, DAMAGE_KEYS),
    damage_cause: clean(a.damageCause, 60),
    insurance_method: clean(a.paymentPath, 40),
    insurance_details: cleanRecord(a, INSURANCE_KEYS),
    vehicle_year: clean(a.vehicleYear, 8),
    vehicle_make: clean(a.vehicleMake, 60),
    vehicle_model: clean(a.vehicleModel, 60),
    vehicle_trim: clean(a.vehicleTrim, 60),
    vehicle_body_style: null as string | null,
    vin: clean(a.vin, 17)?.toUpperCase() ?? null,
    licence_plate: clean(a.plate, 12)?.toUpperCase() ?? null,
    vehicle_features: cleanRecord(a, FEATURE_KEYS),
    adas_required_review: extra.adas,
    service_location_type: clean(a.locationType, 20),
    service_address: cleanRecord(a, ADDRESS_KEYS),
    preferred_urgency: clean(a.urgency, 30),
    preferred_date: preferredDate && /^\d{4}-\d{2}-\d{2}$/.test(preferredDate) ? preferredDate : null,
    preferred_time: clean(a.preferredWindow, 30),
    customer_name: clean(a.fullName, 120) ?? "",
    customer_phone: clean(a.phone, 30) ?? "",
    customer_email: clean(a.email, 160)?.toLowerCase() ?? null,
    preferred_contact_method: clean(a.contactMethod, 20),
    best_contact_time: null as string | null,
    customer_notes: clean(a.notes, 2000),
    contact_consent: a.consent === true,
    marketing_consent: a.marketingOptIn === true,
    utm_source: clean(extra.utm["source"], 120),
    utm_medium: clean(extra.utm["medium"], 120),
    utm_campaign: clean(extra.utm["campaign"], 160),
    utm_content: clean(extra.utm["content"], 160),
    utm_term: clean(extra.utm["term"], 160),
    landing_page: clean(extra.landingPage, 500),
    referrer: clean(extra.referrer, 500),
    submitted_ip_hash: extra.ipHash,
    submission_user_agent: clean(extra.userAgent, 300),
  };
}

/* --------------------------------------------------------------- reference */

export function makeReference(): string {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `RBA-${stamp}-${rand}`;
}

/** SHA-256 of the caller IP plus a server-side salt. Raw IPs are never stored. */
export async function hashIp(ip: string | null, salt: string): Promise<string | null> {
  if (!ip) return null;
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
