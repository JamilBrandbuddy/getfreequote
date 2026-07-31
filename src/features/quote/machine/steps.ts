import {
  DAMAGE_CAUSE_OPTIONS,
  DOOR_FEATURES,
  GLASS_AREA_OPTIONS,
  MIRROR_FEATURES,
  MIRROR_SERVICE_OPTIONS,
  PAYMENT_OPTIONS,
  REAR_FEATURES,
  SERVICE_CITIES,
  SUNROOF_FEATURES,
  SUNROOF_SERVICE_OPTIONS,
  URGENCY_OPTIONS,
  VEHICLE_MAKES,
  VEHICLE_MAKE_OPTIONS,
  VEHICLE_YEARS,
  WINDOW_OPTIONS,
  WINDSHIELD_FEATURES,
  WINDSHIELD_SERVICE_OPTIONS,
  YES_NO_UNSURE,
  CONTACT_METHOD_OPTIONS,
  isMobileCity,
} from "../data/catalog";
import type { Option } from "../data/catalog";
import type { QuoteAnswers, StepId } from "../types";
import type { Question } from "./questions";

export interface StepDef {
  id: StepId;
  title: string;
  subtitle?: string;
  kind: "custom" | "questions";
  questions?: Question[];
  visible?: (a: QuoteAnswers) => boolean;
  /** Counted in the progress denominator. */
  counts: boolean;
  trust: TrustKey;
}

export type TrustKey =
  | "welcome"
  | "glass"
  | "adas"
  | "insurance"
  | "vehicle"
  | "location"
  | "timing"
  | "photos"
  | "contact"
  | "review";

/* ------------------------------------------------------------- derivations */

const SIDE_AREAS = ["front_door", "rear_door", "quarter", "vent", "rear_windshield"];

export const isSideArea = (a: QuoteAnswers) => SIDE_AREAS.includes(a.glassArea ?? "");

export const effectiveService = (a: QuoteAnswers) =>
  isSideArea(a) ? "replacement" : a.service;

export const needsAdas = (a: QuoteAnswers) =>
  a.service === "adas" ||
  (a.glassArea === "windshield" &&
    a.service === "replacement" &&
    (a.featWindshield ?? []).includes("camera"));

/** Repair damage that our guidance says is more likely a replacement. */
export const repairLikelyReplacement = (a: QuoteAnswers) =>
  a.service === "repair" &&
  (a.chipLocation === "edge" ||
    a.chipLocation === "driver_view" ||
    a.chipSize === "over_loonie" ||
    a.crackSpreading === "yes");

const optionsForService = (a: QuoteAnswers): Option[] => {
  if (a.glassArea === "sunroof") return SUNROOF_SERVICE_OPTIONS;
  if (a.glassArea === "mirror") return MIRROR_SERVICE_OPTIONS;
  return WINDSHIELD_SERVICE_OPTIONS;
};

const CITY_OPTIONS: Option[] = SERVICE_CITIES.map((c) => ({
  value: c.value,
  label: c.label,
}));

const locationOptions = (a: QuoteAnswers): Option[] => {
  const mobileOk = isMobileCity(a.city);
  return [
    {
      value: "mobile",
      label: "Mobile service at my address",
      description: mobileOk
        ? "We come to your home or workplace — cleanup included"
        : undefined,
      disabled: !mobileOk,
      disabledNote: a.city
        ? `Mobile service isn't available in ${SERVICE_CITIES.find((c) => c.value === a.city)?.label ?? "that area"} yet — in-shop only.`
        : "Choose your city first.",
    },
    {
      value: "shop",
      label: "In our shop",
      description: "Climate-controlled bay — best for full replacements in winter",
    },
  ];
};

/* ------------------------------------------------------------------- steps */

export const STEPS: StepDef[] = [
  { id: "welcome", title: "Get your auto glass quote", kind: "custom", counts: false, trust: "welcome" },

  {
    id: "area",
    title: "Which glass needs attention?",
    subtitle: "Pick the area that's damaged. You can change this later.",
    kind: "custom",
    counts: true,
    trust: "glass",
  },

  {
    id: "service",
    title: "What kind of service do you need?",
    subtitle: "Not certain? Choose “I'm not sure” and we'll confirm.",
    kind: "questions",
    counts: true,
    trust: "glass",
    visible: (a) => ["windshield", "sunroof", "mirror", "not_sure"].includes(a.glassArea ?? ""),
    questions: [
      {
        key: "service",
        label: "Service needed",
        type: "cards",
        required: true,
        autoAdvance: true,
        options: optionsForService,
        resets: [
          "chipCount", "chipSize", "chipLocation", "crackSpreading", "replacementCondition",
          "drivable", "leakWhen", "waterInside", "priorReplacement", "adasReason",
          "adasPriorWork", "sunroofIssue", "sunroofExploded", "mirrorScope",
        ],
      },
    ],
  },

  {
    id: "damage",
    title: "Tell us about the damage",
    subtitle: "These details let us quote accurately the first time.",
    kind: "questions",
    counts: true,
    trust: "glass",
    questions: [
      /* --- windshield repair --- */
      {
        key: "chipCount",
        label: "How many chips or cracks are there?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.service === "repair",
        options: [
          { value: "1", label: "One" },
          { value: "2", label: "Two" },
          { value: "3plus", label: "Three or more" },
        ],
      },
      {
        key: "chipSize",
        label: "How big is the largest one?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.service === "repair",
        options: [
          { value: "under_toonie", label: "Smaller than a toonie", description: "Usually repairable" },
          { value: "over_loonie", label: "Bigger than a toonie", description: "Often needs replacement" },
          { value: "crack_under_30", label: "A crack under 30 cm" },
          { value: "crack_over_30", label: "A crack longer than 30 cm" },
        ],
      },
      {
        key: "chipLocation",
        label: "Where is the damage on the glass?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.service === "repair",
        options: [
          { value: "passenger", label: "Passenger side" },
          { value: "centre", label: "Centre of the glass" },
          { value: "driver_view", label: "In the driver's line of sight" },
          { value: "edge", label: "Near the edge of the glass" },
        ],
      },
      {
        key: "crackSpreading",
        label: "Is it spreading?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.service === "repair",
        options: YES_NO_UNSURE,
        advisory: (a) =>
          repairLikelyReplacement(a)
            ? {
                tone: "warn",
                text: "Based on this, a full replacement is likely the safer fix. You can switch below — your other answers are kept.",
              }
            : undefined,
      },

      /* --- windshield replacement --- */
      {
        key: "replacementCondition",
        label: "What best describes the windshield right now?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.glassArea === "windshield" && a.service === "replacement",
        options: [
          { value: "long_crack", label: "One long crack" },
          { value: "multiple", label: "Multiple cracks or chips" },
          { value: "shattered", label: "Shattered or caved in" },
          { value: "hole", label: "A hole through the glass" },
        ],
      },
      {
        key: "drivable",
        label: "Is the vehicle safe to drive right now?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.glassArea === "windshield" && a.service === "replacement",
        options: YES_NO_UNSURE,
      },

      /* --- leak / wind noise --- */
      {
        key: "leakWhen",
        label: "When do you notice the leak or noise?",
        help: "Choose everything that applies.",
        type: "multi",
        required: true,
        columns: 2,
        visible: (a) => a.service === "leak" || a.service === "sunroof_leak",
        options: [
          { value: "rain", label: "In the rain" },
          { value: "car_wash", label: "In a car wash" },
          { value: "highway", label: "At highway speed" },
          { value: "always", label: "All the time" },
        ],
      },
      {
        key: "waterInside",
        label: "Is water getting inside the vehicle?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.service === "leak" || a.service === "sunroof_leak",
        options: YES_NO_UNSURE,
      },
      {
        key: "priorReplacement",
        label: "Has this glass been replaced before?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.service === "leak" || a.service === "sunroof_leak",
        options: YES_NO_UNSURE,
      },

      /* --- ADAS only --- */
      {
        key: "adasReason",
        label: "Why do you need a recalibration?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.service === "adas",
        options: [
          { value: "post_replacement", label: "After a windshield replacement" },
          { value: "warning_light", label: "A driver-assist warning light is on" },
          { value: "camera_error", label: "Camera or sensor error message" },
          { value: "other", label: "Something else" },
        ],
      },
      {
        key: "adasPriorWork",
        label: "When was the glass work done?",
        optionalNote: "Optional",
        type: "text",
        placeholder: "e.g. two weeks ago, or June 2026",
        visible: (a) => a.service === "adas",
      },

      /* --- side / rear / quarter / vent --- */
      {
        key: "sideGlassState",
        label: "What's the condition of the glass?",
        type: "cards",
        required: true,
        columns: 2,
        visible: isSideArea,
        options: [
          { value: "broken_out", label: "Broken out completely" },
          { value: "cracked", label: "Cracked but still in place" },
          { value: "missing", label: "Missing — already removed" },
        ],
      },
      {
        key: "debrisInDoor",
        label: "Is there broken glass inside the door or vehicle?",
        type: "cards",
        required: true,
        columns: 2,
        visible: isSideArea,
        options: YES_NO_UNSURE,
      },
      {
        key: "windowStuck",
        label: "Is the window stuck up or down?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.glassArea === "front_door" || a.glassArea === "rear_door",
        options: [
          { value: "up", label: "Stuck up" },
          { value: "down", label: "Stuck down" },
          { value: "works", label: "It still moves normally" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        key: "vehicleSecure",
        label: "Is the vehicle secure, or do you need it boarded up?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => isSideArea(a) || a.glassArea === "rear_windshield",
        options: [
          { value: "secure", label: "It's secure" },
          { value: "needs_board", label: "Please board it up" },
          { value: "already_boarded", label: "Already boarded / taped" },
        ],
      },

      /* --- sunroof --- */
      {
        key: "sunroofIssue",
        label: "What's happening with the sunroof?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.glassArea === "sunroof" && a.service === "sunroof_replacement",
        options: [
          { value: "shattered", label: "Glass shattered" },
          { value: "cracked", label: "Glass cracked" },
          { value: "wont_slide", label: "Won't open or close" },
        ],
      },
      {
        key: "sunroofExploded",
        label: "Did it break on its own, with no impact?",
        help: "Spontaneous breakage can be covered differently.",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.glassArea === "sunroof" && a.service === "sunroof_replacement",
        options: YES_NO_UNSURE,
      },

      /* --- mirror --- */
      {
        key: "mirrorScope",
        label: "What's damaged on the mirror?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.glassArea === "mirror",
        options: [
          { value: "glass_only", label: "Just the mirror glass" },
          { value: "housing", label: "Housing and glass" },
          { value: "hanging", label: "The whole mirror is hanging off" },
        ],
      },

      /* --- not sure / catch-all --- */
      {
        key: "damageNotes",
        label: "Anything else we should know about the damage?",
        optionalNote: "Optional",
        type: "textarea",
        placeholder: "Describe what you're seeing in your own words.",
        required: (a) => a.glassArea === "not_sure" && !a.service,
      },
    ],
  },

  {
    id: "cause",
    title: "How did it happen?",
    subtitle: "This helps us tell you how the claim usually works.",
    kind: "questions",
    counts: true,
    trust: "insurance",
    visible: (a) => !["leak", "adas", "sunroof_leak"].includes(a.service ?? ""),
    questions: [
      {
        key: "damageCause",
        label: "Cause of the damage",
        type: "cards",
        required: true,
        autoAdvance: false,
        options: DAMAGE_CAUSE_OPTIONS,
        resets: ["policeFileNumber", "collisionLargerClaim", "hailMultiplePanels"],
      },
      {
        key: "policeFileNumber",
        label: "Police file number",
        optionalNote: "Optional",
        help: "If you reported the break-in, add the file number. We can board the vehicle up the same day.",
        type: "text",
        placeholder: "e.g. 26-123456",
        visible: (a) => a.damageCause === "vandalism",
      },
      {
        key: "collisionLargerClaim",
        label: "Is the glass part of a larger collision claim?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.damageCause === "collision",
        options: YES_NO_UNSURE,
      },
      {
        key: "hailMultiplePanels",
        label: "Was more than one piece of glass damaged?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.damageCause === "hail",
        options: YES_NO_UNSURE,
      },
      {
        key: "otherDamageNotes",
        label: "What else was damaged?",
        optionalNote: "Optional",
        type: "textarea",
        placeholder: "e.g. rear window and sunroof",
        visible: (a) => a.hailMultiplePanels === "yes" || a.collisionLargerClaim === "yes",
      },
    ],
  },

  {
    id: "insurance",
    title: "How would you like to pay?",
    subtitle: "Riverbend is an SGI-accredited glass shop — we bill SGI directly.",
    kind: "questions",
    counts: true,
    trust: "insurance",
    questions: [
      {
        key: "paymentPath",
        label: "Payment method",
        type: "cards",
        required: true,
        options: PAYMENT_OPTIONS,
        resets: ["sgiClaimNumber", "sgiOnlyItem", "sgiCustomerName"],
        advisory: (a) =>
          a.service === "repair" && (a.paymentPath === "sgi_new" || a.paymentPath === "sgi_started")
            ? { tone: "info", text: "Good news: SGI chip repairs usually carry no deductible." }
            : a.paymentPath === "private"
              ? { tone: "info", text: "We'll send a written estimate — the final price is confirmed once we verify your glass by VIN." }
              : undefined,
      },
      {
        key: "sgiClaimNumber",
        label: "SGI claim number",
        optionalNote: "Optional",
        type: "text",
        placeholder: "e.g. C1234567",
        visible: (a) => a.paymentPath === "sgi_started",
      },
      {
        key: "sgiOnlyItem",
        label: "Is the glass the only item on this claim?",
        type: "cards",
        required: true,
        columns: 2,
        visible: (a) => a.paymentPath === "sgi_new" || a.paymentPath === "sgi_started",
        options: YES_NO_UNSURE,
      },
      {
        key: "sgiCustomerName",
        label: "Name on the SGI policy",
        optionalNote: "Optional — only if different from your name",
        type: "text",
        placeholder: "Policy holder's full name",
        visible: (a) => a.paymentPath === "sgi_new" || a.paymentPath === "sgi_started",
      },
    ],
  },

  {
    id: "vehicle",
    title: "Your vehicle",
    subtitle: "Auto glass is vehicle-specific — this lets us order the right part.",
    kind: "questions",
    counts: true,
    trust: "vehicle",
    questions: [
      {
        key: "vehicleYear",
        label: "Year",
        type: "select",
        required: true,
        columns: 2,
        options: VEHICLE_YEARS.map((y) => ({ value: y, label: y })),
      },
      {
        key: "vehicleMake",
        label: "Make",
        type: "select",
        required: true,
        columns: 2,
        options: VEHICLE_MAKE_OPTIONS,
        resets: ["vehicleModel"],
      },
      {
        key: "vehicleModel",
        label: "Model",
        type: "select",
        required: true,
        columns: 2,
        options: (a) =>
          (VEHICLE_MAKES[a.vehicleMake ?? ""] ?? []).map((m) => ({ value: m, label: m })),
        visible: (a) => Boolean(a.vehicleMake),
      },
      {
        key: "vehicleTrim",
        label: "Trim or body style",
        optionalNote: "Optional",
        type: "text",
        columns: 2,
        placeholder: "e.g. Crew Cab, Sport",
      },
      {
        key: "vin",
        label: "VIN",
        optionalNote: "Optional — but it guarantees the exact glass",
        type: "text",
        format: "vin",
        columns: 2,
        placeholder: "17 characters",
      },
      {
        key: "plate",
        label: "Licence plate",
        optionalNote: "Optional",
        type: "text",
        columns: 2,
        placeholder: "e.g. 123 ABC",
      },
    ],
  },

  {
    id: "features",
    title: "Features on your glass",
    subtitle: "Choose everything you recognise — “I'm not sure” is a perfectly good answer.",
    kind: "questions",
    counts: true,
    trust: "adas",
    visible: (a) =>
      (a.glassArea === "windshield" && a.service !== "leak") ||
      isSideArea(a) ||
      a.glassArea === "sunroof" ||
      a.glassArea === "mirror",
    questions: [
      {
        key: "featWindshield",
        label: "Windshield features",
        type: "multi",
        columns: 2,
        visible: (a) => a.glassArea === "windshield" && a.service !== "leak",
        options: WINDSHIELD_FEATURES,
        advisory: (a) =>
          (a.featWindshield ?? []).includes("camera")
            ? {
                tone: "info",
                text: "A forward camera means an ADAS recalibration is required after the glass is installed. We do it in-house and include it in your quote.",
              }
            : undefined,
      },
      {
        key: "featDoor",
        label: "Door or quarter glass features",
        type: "multi",
        columns: 2,
        visible: (a) => ["front_door", "rear_door", "quarter", "vent"].includes(a.glassArea ?? ""),
        options: DOOR_FEATURES,
      },
      {
        key: "featRear",
        label: "Rear windshield features",
        type: "multi",
        columns: 2,
        visible: (a) => a.glassArea === "rear_windshield",
        options: REAR_FEATURES,
      },
      {
        key: "featSunroof",
        label: "Sunroof details",
        type: "multi",
        columns: 2,
        visible: (a) => a.glassArea === "sunroof",
        options: SUNROOF_FEATURES,
      },
      {
        key: "featMirror",
        label: "Mirror features",
        type: "multi",
        columns: 2,
        visible: (a) => a.glassArea === "mirror",
        options: MIRROR_FEATURES,
      },
    ],
  },

  {
    id: "location",
    title: "Where should we do the work?",
    kind: "questions",
    counts: true,
    trust: "location",
    questions: [
      {
        key: "city",
        label: "Your city or town",
        type: "select",
        required: true,
        columns: 2,
        options: CITY_OPTIONS,
        resets: ["locationType"],
      },
      {
        key: "locationType",
        label: "Service type",
        type: "cards",
        required: true,
        visible: (a) => Boolean(a.city),
        options: locationOptions,
        advisory: (a) =>
          a.locationType === "mobile" &&
          (a.sideGlassState === "broken_out" || a.replacementCondition === "shattered")
            ? { tone: "info", text: "Full glass cleanup and vacuuming is included with mobile service." }
            : undefined,
      },
      {
        key: "streetAddress",
        label: "Service address",
        type: "text",
        required: (a) => a.locationType === "mobile",
        visible: (a) => a.locationType === "mobile",
        placeholder: "Street address where the vehicle will be parked",
      },
      {
        key: "postalCode",
        label: "Postal code",
        type: "text",
        format: "postal",
        columns: 2,
        required: (a) => a.locationType === "mobile",
        visible: (a) => Boolean(a.locationType),
        placeholder: "S7K 1A1",
      },
    ],
  },

  {
    id: "timing",
    title: "When works for you?",
    subtitle: "We'll confirm the exact time when we call with your quote.",
    kind: "questions",
    counts: true,
    trust: "timing",
    questions: [
      { key: "urgency", label: "How soon do you need this done?", type: "cards", required: true, columns: 2, options: URGENCY_OPTIONS },
      { key: "preferredDate", label: "Preferred date", optionalNote: "Optional", type: "date", columns: 2 },
      { key: "preferredWindow", label: "Preferred time of day", optionalNote: "Optional", type: "cards", columns: 2, options: WINDOW_OPTIONS },
    ],
  },

  { id: "uploads", title: "Add photos", kind: "custom", counts: true, trust: "photos" },

  {
    id: "contact",
    title: "Where should we send your quote?",
    kind: "questions",
    counts: true,
    trust: "contact",
    questions: [
      { key: "fullName", label: "Full name", type: "text", required: true, columns: 2, placeholder: "First and last name" },
      { key: "phone", label: "Phone number", type: "tel", format: "phone", required: true, columns: 2, placeholder: "(306) 555-0123" },
      { key: "email", label: "Email address", type: "email", format: "email", required: true, columns: 2, placeholder: "you@example.ca" },
      { key: "contactMethod", label: "Best way to reach you", type: "cards", required: true, columns: 2, options: CONTACT_METHOD_OPTIONS },
      { key: "notes", label: "Anything else we should know?", optionalNote: "Optional", type: "textarea", placeholder: "Gate codes, parking, best times to call…" },
      { key: "consent", label: "I agree to be contacted about this quote by phone, text or email.", type: "checkbox", required: true },
      { key: "marketingOptIn", label: "Send me seasonal reminders and offers.", optionalNote: "Optional", type: "checkbox" },
    ],
  },

  { id: "review", title: "Review your request", kind: "custom", counts: true, trust: "review" },
  { id: "confirmation", title: "Request received", kind: "custom", counts: false, trust: "review" },
];

export const stepById = (id: StepId) => STEPS.find((s) => s.id === id)!;

export const visibleSteps = (a: QuoteAnswers) => STEPS.filter((s) => !s.visible || s.visible(a));
