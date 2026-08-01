import { quoteConfig } from "@/config/quoteConfig";
import {
  ADAS_TRIGGER_FEATURES,
  areaGroupOf,
  damageTopicFor,
  FEATURES_BY_GROUP,
  serviceOptionByValue,
} from "@/config/quoteOptions";
import type {
  AnswerKey,
  AreaGroup,
  DamageTopic,
  GlassAreaId,
  QuoteAnswers,
  StepId,
  UtmParams,
} from "@/types/quote";

export interface StepMeta {
  id: StepId;
  /** Short name shown in the header. */
  name: string;
  title: string;
  subtitle?: string;
  /** Counts toward the progress bar. */
  counts: boolean;
}

export const STEP_META: StepMeta[] = [
  { id: "welcome", name: "Welcome", title: "Get Your Free Auto Glass Quote", counts: false },
  { id: "glass-area", name: "Damaged area", title: "Which glass or vehicle area needs service?", subtitle: "Pick the closest match — we'll confirm the exact part.", counts: true },
  { id: "service", name: "Service", title: "What kind of service do you need?", subtitle: "Choose the option that best describes the problem.", counts: true },
  { id: "damage", name: "Damage details", title: "Tell us about the damage", subtitle: "A few quick details help us prepare the right glass and quote.", counts: true },
  { id: "cause", name: "Damage cause", title: "What caused the damage?", counts: true },
  { id: "insurance", name: "Insurance", title: "How would you like to handle the service?", counts: true },
  { id: "vehicle", name: "Vehicle", title: "Which vehicle are we working on?", subtitle: "Year, make and model are required. Everything else is optional.", counts: true },
  { id: "features", name: "Glass features", title: "Which features does your glass have?", subtitle: "Select everything that applies — this identifies the correct part.", counts: true },
  { id: "location", name: "Location", title: "Where would you prefer the service?", counts: true },
  { id: "schedule", name: "Timing", title: "How soon do you need service?", counts: true },
  { id: "uploads", name: "Photos", title: "Add photos (optional)", subtitle: "Photos help our team assess the damage more accurately.", counts: true },
  { id: "contact", name: "Your details", title: "Where should we send your quote?", counts: true },
  { id: "review", name: "Review", title: "Review your request", counts: true },
  { id: "success", name: "Submitted", title: "Your quote request has been received.", counts: false },
];

export const stepMeta = (id: StepId) => STEP_META.find((s) => s.id === id) ?? STEP_META[0];

/* --------------------------------------------------------- derived state */

export const groupOf = (a: QuoteAnswers): AreaGroup => areaGroupOf(a.glassArea);
export const topicOf = (a: QuoteAnswers): DamageTopic => damageTopicFor(a.service);

export function adasRequiredReview(a: QuoteAnswers): boolean {
  if (groupOf(a) !== "windshield") return false;
  const picked = a.features ?? [];
  return (
    picked.some((f) => ADAS_TRIGGER_FEATURES.includes(f)) ||
    a.service === "adas-recalibration" ||
    a.cameraPresent === "yes"
  );
}

export function isUrgentLead(a: QuoteAnswers): boolean {
  return (
    a.urgency === "emergency" ||
    a.vehicleExposed === "yes" ||
    a.vehicleSecure === "no" ||
    (topicOf(a) === "shattered" && a.glassShattered === "yes")
  );
}

export const mobileSelected = (a: QuoteAnswers) =>
  quoteConfig.features.mobileService && (a.locationPreference === "mobile" || a.locationPreference === "either");

/* ------------------------------------------------------------ step route */

/** Full ordered list of steps that apply to the current answers. */
export function computeRoute(a: QuoteAnswers): StepId[] {
  const route: StepId[] = ["welcome", "glass-area", "service", "damage", "cause", "insurance", "vehicle"];
  if (FEATURES_BY_GROUP[groupOf(a)].length > 0) route.push("features");
  route.push("location", "schedule", "uploads", "contact", "review", "success");
  return route;
}

export function nextStepId(a: QuoteAnswers, current: StepId): StepId {
  const route = computeRoute(a);
  const i = route.indexOf(current);
  return route[Math.min(i + 1, route.length - 1)] ?? current;
}

export function prevStepId(a: QuoteAnswers, current: StepId): StepId {
  const route = computeRoute(a);
  const i = route.indexOf(current);
  return route[Math.max(i - 1, 0)] ?? current;
}

/** Keeps the current step valid after the route changes. */
export function nearestValidStep(a: QuoteAnswers, current: StepId): StepId {
  const route = computeRoute(a);
  if (route.includes(current)) return current;
  const all = STEP_META.map((s) => s.id);
  for (let i = all.indexOf(current); i >= 0; i--) if (route.includes(all[i])) return all[i];
  return "welcome";
}

export function progressFor(a: QuoteAnswers, stepId: StepId): number {
  if (stepId === "welcome") return 0;
  if (stepId === "success") return 100;
  const counted = computeRoute(a).filter((id) => stepMeta(id).counts);
  const i = counted.indexOf(stepId);
  if (i < 0) return 0;
  return Math.round(((i + 1) / counted.length) * 100);
}

export function stepPosition(a: QuoteAnswers, stepId: StepId) {
  const counted = computeRoute(a).filter((id) => stepMeta(id).counts);
  return { index: counted.indexOf(stepId) + 1, total: counted.length };
}

/* -------------------------------------------------- dependency clearing */

const DAMAGE_KEYS_BY_TOPIC: Record<DamageTopic, AnswerKey[]> = {
  chip: ["chipCount", "chipSize", "chipNearEdge", "chipInSight"],
  crack: ["crackLength", "crackReachedEdge", "crackSpreading", "crackInSight"],
  shattered: ["glassShattered", "vehicleExposed", "drivable", "looseGlass"],
  leak: ["leakWhen", "leakWhere", "priorReplacement"],
  mechanism: ["motorSound", "stuckPosition", "glassFellInDoor", "happensEveryTime"],
  sensor: ["cameraPresent", "warningLights", "recentlyReplaced", "affectedFeatures"],
  other: [],
};

const ALL_DAMAGE_KEYS = Object.values(DAMAGE_KEYS_BY_TOPIC).flat();

const CAUSE_DEPENDENTS: Record<string, AnswerKey[]> = {
  collision: ["bodyDamage"],
  vandalism: ["incidentReported", "vehicleSecure", "otherItemsDamaged"],
  hail: ["multiplePanels", "additionalAreas"],
};

const ALL_CAUSE_DEPENDENTS = Object.values(CAUSE_DEPENDENTS).flat();

const SGI_KEYS: AnswerKey[] = ["autoPak", "deductible", "hasClaim", "claimNumber"];
const MOBILE_KEYS: AnswerKey[] = [
  "streetAddress",
  "city",
  "locationProvince",
  "postalCode",
  "locationKind",
  "safeParking",
  "coveredSpace",
  "accessNotes",
];

function omit(answers: QuoteAnswers, keys: AnswerKey[]): QuoteAnswers {
  const next: QuoteAnswers = { ...answers };
  for (const key of keys) delete next[key];
  return next;
}

/**
 * Centralised dependency clearing. Applies a patch and removes only the
 * answers that are no longer reachable. Customer, vehicle, contact, photo
 * and scheduling information is never cleared here.
 */
export function applyAnswerPatch(prev: QuoteAnswers, patch: Partial<QuoteAnswers>): QuoteAnswers {
  let next: QuoteAnswers = { ...prev, ...patch };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
      if (value === undefined) delete next[key as AnswerKey];
    }
  }

  if (patch.glassArea !== undefined && patch.glassArea !== prev.glassArea) {
    const oldGroup = areaGroupOf(prev.glassArea);
    const newGroup = areaGroupOf(patch.glassArea);
    if (oldGroup !== newGroup) {
      // The service list changes with the area family, so the service and
      // everything derived from it is no longer valid.
      next = omit(next, ["service", ...ALL_DAMAGE_KEYS, "features"]);
    }
  }

  if (patch.service !== undefined && patch.service !== prev.service) {
    const oldTopic = damageTopicFor(prev.service);
    const newTopic = damageTopicFor(patch.service);
    if (oldTopic !== newTopic) {
      next = omit(next, DAMAGE_KEYS_BY_TOPIC[oldTopic]);
    }
  }

  if (patch.cause !== undefined && patch.cause !== prev.cause) {
    const keep = CAUSE_DEPENDENTS[patch.cause] ?? [];
    next = omit(next, ALL_CAUSE_DEPENDENTS.filter((k) => !keep.includes(k)));
  }

  if (patch.paymentPath !== undefined && patch.paymentPath !== "sgi") {
    next = omit(next, SGI_KEYS);
  }
  if (patch.hasClaim !== undefined && patch.hasClaim !== "yes") {
    next = omit(next, ["claimNumber"]);
  }

  if (patch.locationPreference !== undefined && patch.locationPreference !== prev.locationPreference) {
    const stillMobile = patch.locationPreference === "mobile" || patch.locationPreference === "either";
    if (!stillMobile) next = omit(next, MOBILE_KEYS);
  }

  if (patch.vehicleYear !== undefined && patch.vehicleYear !== prev.vehicleYear && !next.manualVehicleEntry) {
    next = omit(next, ["vehicleModel"]);
  }
  if (patch.vehicleMake !== undefined && patch.vehicleMake !== prev.vehicleMake) {
    next = omit(next, ["vehicleModel"]);
  }

  return next;
}

/* ------------------------------------------------------- query prefilling */

const SERVICE_ALIASES: Record<string, { service: string; glassArea: GlassAreaId }> = {
  "windshield-replacement": { service: "windshield-replacement", glassArea: "front-windshield" },
  "chip-repair": { service: "chip-repair", glassArea: "front-windshield" },
  "crack-repair": { service: "crack-repair", glassArea: "front-windshield" },
  "adas-recalibration": { service: "adas-recalibration", glassArea: "front-windshield" },
  "rear-windshield": { service: "rear-replacement", glassArea: "rear-windshield" },
  "sunroof-replacement": { service: "sunroof-replacement", glassArea: "sunroof" },
  "mirror-replacement": { service: "mirror-assembly", glassArea: "side-mirror" },
};

const GLASS_ALIASES: Record<string, GlassAreaId> = {
  "front-windshield": "front-windshield",
  windshield: "front-windshield",
  "rear-windshield": "rear-windshield",
  "back-glass": "rear-windshield",
  "door-glass": "driver-front-door",
  "driver-front-door": "driver-front-door",
  "passenger-front-door": "passenger-front-door",
  "driver-rear-door": "driver-rear-door",
  "passenger-rear-door": "passenger-rear-door",
  quarter: "driver-quarter",
  vent: "vent",
  sunroof: "sunroof",
  moonroof: "sunroof",
  mirror: "side-mirror",
  "side-mirror": "side-mirror",
};

export function parseQuoteQuery(search: string): { answers: Partial<QuoteAnswers>; utm: UtmParams } {
  const params = new URLSearchParams(search);
  const answers: Partial<QuoteAnswers> = {};

  const glass = params.get("glass");
  if (glass && GLASS_ALIASES[glass]) answers.glassArea = GLASS_ALIASES[glass];

  const service = params.get("service");
  if (service) {
    const alias = SERVICE_ALIASES[service];
    if (alias) {
      answers.glassArea = answers.glassArea ?? alias.glassArea;
      answers.service = alias.service;
    } else if (serviceOptionByValue(service)) {
      answers.service = service;
    }
  }

  const insurance = params.get("insurance");
  if (insurance === "sgi" || insurance === "private" || insurance === "not-sure") {
    answers.paymentPath = insurance;
  }

  const utm: UtmParams = {
    source: params.get("utm_source") ?? undefined,
    medium: params.get("utm_medium") ?? undefined,
    campaign: params.get("utm_campaign") ?? undefined,
    term: params.get("utm_term") ?? undefined,
    content: params.get("utm_content") ?? undefined,
  };

  return { answers, utm };
}

export function makeReference(date = new Date(), seq?: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const n = seq ?? Math.floor(Math.random() * 99999) + 1;
  return `AG-${y}${m}-${String(n).padStart(5, "0")}`;
}
