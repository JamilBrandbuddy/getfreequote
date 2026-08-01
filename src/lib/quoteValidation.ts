import { z } from "zod";
import { quoteConfig } from "@/config/quoteConfig";
import type { QuoteAnswers, StepId } from "@/types/quote";
import { groupOf, mobileSelected, topicOf } from "./quoteRouting";

/* ------------------------------------------------------------- formatters */

export const CA_POSTAL_RE = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;
export const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

/** Normalizes a North American phone number to E.164 where possible. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return input.trim();
}

export function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, "").replace(/^1/, "");
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export const isValidPhone = (input: string) => {
  const digits = input.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
};

export function formatPostalCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return raw.length > 3 ? `${raw.slice(0, 3)} ${raw.slice(3)}` : raw;
}

export const todayIso = () => new Date().toISOString().slice(0, 10);

/* ----------------------------------------------------------- step schemas */

const required = (message: string) => z.string({ required_error: message }).min(1, message);
const optionalText = z.string().optional();

function damageSchema(answers: QuoteAnswers) {
  switch (topicOf(answers)) {
    case "chip":
      return z.object({
        chipCount: required("Let us know how many chips there are."),
        chipSize: required("Choose the closest size."),
        chipNearEdge: required("Select an option."),
        chipInSight: required("Select an option."),
        damageNotes: optionalText,
      });
    case "crack":
      return z.object({
        crackLength: required("Choose the closest crack length."),
        crackReachedEdge: required("Select an option."),
        crackSpreading: required("Select an option."),
        crackInSight: required("Select an option."),
        damageNotes: optionalText,
      });
    case "shattered":
      return z.object({
        glassShattered: required("Select an option."),
        vehicleExposed: required("Select an option."),
        drivable: required("Select an option."),
        looseGlass: required("Select an option."),
        damageNotes: optionalText,
      });
    case "leak":
      return z.object({
        leakWhen: z.array(z.string()).min(1, "Select at least one option."),
        leakWhere: optionalText,
        priorReplacement: required("Select an option."),
        damageNotes: optionalText,
      });
    case "mechanism":
      return z.object({
        motorSound: required("Select an option."),
        stuckPosition: required("Select an option."),
        glassFellInDoor: required("Select an option."),
        happensEveryTime: required("Select an option."),
        damageNotes: optionalText,
      });
    case "sensor":
      return z.object({
        cameraPresent: required("Select an option."),
        warningLights: required("Select an option."),
        recentlyReplaced: required("Select an option."),
        affectedFeatures: z.array(z.string()).min(1, "Select at least one option."),
        damageNotes: optionalText,
      });
    default:
      return z.object({
        damageNotes: z.string().min(5, "Please describe the damage in a few words.").max(1000),
      });
  }
}

function causeSchema(answers: QuoteAnswers) {
  const shape: z.ZodRawShape = { cause: required("Choose what caused the damage.") };
  if (answers.cause === "collision") shape.bodyDamage = required("Select an option.");
  if (answers.cause === "vandalism") {
    shape.incidentReported = required("Select an option.");
    shape.vehicleSecure = required("Select an option.");
    shape.otherItemsDamaged = required("Select an option.");
  }
  if (answers.cause === "hail") shape.multiplePanels = required("Select an option.");
  return z.object(shape);
}

function insuranceSchema(answers: QuoteAnswers) {
  const shape: z.ZodRawShape = { paymentPath: required("Choose how you'd like to proceed.") };
  if (answers.paymentPath === "sgi") {
    shape.autoPak = required("Select an option.");
    shape.deductible = required("Select an option.");
    shape.hasClaim = required("Select an option.");
    if (answers.hasClaim === "yes") shape.claimNumber = optionalText;
  }
  return z.object(shape);
}

function vehicleSchema() {
  return z.object({
    vehicleClass: optionalText,
    vehicleYear: required("Vehicle year is required."),
    vehicleMake: required("Vehicle make is required."),
    vehicleModel: required("Vehicle model is required."),
    vehicleTrim: optionalText,
    bodyStyle: optionalText,
    vin: z
      .string()
      .optional()
      .refine((v) => !v || VIN_RE.test(v.trim()), "A VIN is 17 characters and excludes I, O and Q."),
    plate: optionalText,
    registrationProvince: optionalText,
  });
}

function locationSchema(answers: QuoteAnswers) {
  const shape: z.ZodRawShape = { locationPreference: required("Choose a service location.") };
  if (mobileSelected(answers)) {
    shape.streetAddress = required("Street address is required for mobile service.");
    shape.city = required("City is required.");
    shape.locationProvince = optionalText;
    shape.postalCode = z
      .string({ required_error: "Postal code is required." })
      .min(1, "Postal code is required.")
      .refine((v) => CA_POSTAL_RE.test(v.trim()), "Enter a valid Canadian postal code, e.g. S7M 5T2.");
    shape.locationKind = required("Select an option.");
    shape.safeParking = required("Select an option.");
    shape.coveredSpace = required("Select an option.");
    shape.accessNotes = optionalText;
  }
  return z.object(shape);
}

function scheduleSchema() {
  return z.object({
    urgency: required("Let us know how soon you need service."),
    preferredDate: z
      .string()
      .optional()
      .refine((v) => !v || v >= todayIso(), "Choose today or a future date."),
    preferredTime: optionalText,
  });
}

function contactSchema() {
  return z.object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(100),
    phone: z
      .string({ required_error: "A phone number is required." })
      .min(1, "A phone number is required.")
      .refine((v) => isValidPhone(v), "Enter a valid 10-digit phone number."),
    email: z
      .string()
      .optional()
      .refine((v) => !v || z.string().email().safeParse(v.trim()).success, "Enter a valid email address."),
    contactMethod: required("Choose a preferred contact method."),
    bestTime: optionalText,
    notes: z.string().max(1000, "Please keep notes under 1000 characters.").optional(),
    consent: z.literal(true, {
      errorMap: () => ({
        message: `Please confirm ${quoteConfig.businessName} may contact you about this request.`,
      }),
    }),
    marketingOptIn: z.boolean().optional(),
  });
}

function featuresSchema(answers: QuoteAnswers) {
  if (groupOf(answers) === "unknown") return z.object({});
  return z.object({
    features: z.array(z.string()).min(1, "Select at least one option, or choose “Not sure”."),
  });
}

/** Returns the Zod schema that guards the given step for the current answers. */
export function schemaForStep(stepId: StepId, answers: QuoteAnswers): z.ZodTypeAny {
  switch (stepId) {
    case "glass-area":
      return z.object({ glassArea: required("Select the area that needs service.") });
    case "service":
      return z.object({ service: required("Select the service you need.") });
    case "damage":
      return damageSchema(answers);
    case "cause":
      return causeSchema(answers);
    case "insurance":
      return insuranceSchema(answers);
    case "vehicle":
      return vehicleSchema();
    case "features":
      return featuresSchema(answers);
    case "location":
      return locationSchema(answers);
    case "schedule":
      return scheduleSchema();
    case "contact":
      return contactSchema();
    default:
      return z.object({});
  }
}

export type StepErrors = Partial<Record<string, string>>;

/** Validates the current step and returns a field -> message map. */
export function validateStep(stepId: StepId, answers: QuoteAnswers): StepErrors {
  const result = schemaForStep(stepId, answers).safeParse(answers);
  if (result.success) return {};
  const errors: StepErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export const isStepValid = (stepId: StepId, answers: QuoteAnswers) =>
  Object.keys(validateStep(stepId, answers)).length === 0;

/* ------------------------------------------------------------ file checks */

export function validateFile(file: File): string | null {
  const { maxFileSizeMb, acceptedTypes } = quoteConfig.uploads;
  const isHeic = /\.(heic|heif)$/i.test(file.name);
  if (!acceptedTypes.includes(file.type) && !isHeic) {
    return `${file.name} isn't a supported image (JPG, PNG, HEIC or WebP).`;
  }
  if (file.size > maxFileSizeMb * 1024 * 1024) {
    return `${file.name} is larger than ${maxFileSizeMb} MB.`;
  }
  return null;
}
