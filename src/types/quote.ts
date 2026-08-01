/** Core domain types for the Auto Glass Quote Wizard. */

export type StepId =
  | "welcome"
  | "glass-area"
  | "service"
  | "damage"
  | "cause"
  | "insurance"
  | "vehicle"
  | "features"
  | "location"
  | "schedule"
  | "uploads"
  | "contact"
  | "review"
  | "success";

export type GlassAreaId =
  | "front-windshield"
  | "rear-windshield"
  | "driver-front-door"
  | "passenger-front-door"
  | "driver-rear-door"
  | "passenger-rear-door"
  | "driver-quarter"
  | "passenger-quarter"
  | "vent"
  | "sunroof"
  | "side-mirror"
  | "not-sure";

/** Families used to branch service, damage and feature questions. */
export type AreaGroup = "windshield" | "rear" | "side" | "sunroof" | "mirror" | "unknown";

export type DamageTopic =
  | "chip"
  | "crack"
  | "shattered"
  | "leak"
  | "mechanism"
  | "sensor"
  | "other";

export type PaymentPath = "sgi" | "private" | "not-sure";

export interface UploadedPhoto {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  status: "uploading" | "ready" | "error";
  progress: number;
  error?: string;
}

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface QuoteAnswers {
  /* Step 1 — area */
  glassArea?: GlassAreaId;
  additionalAreas?: GlassAreaId[];

  /* Step 2 — service */
  service?: string;

  /* Step 3 — damage */
  chipCount?: string;
  chipSize?: string;
  chipNearEdge?: string;
  chipInSight?: string;
  crackLength?: string;
  crackReachedEdge?: string;
  crackSpreading?: string;
  crackInSight?: string;
  glassShattered?: string;
  vehicleExposed?: string;
  drivable?: string;
  looseGlass?: string;
  leakWhen?: string[];
  leakWhere?: string;
  priorReplacement?: string;
  motorSound?: string;
  stuckPosition?: string;
  glassFellInDoor?: string;
  happensEveryTime?: string;
  cameraPresent?: string;
  warningLights?: string;
  recentlyReplaced?: string;
  affectedFeatures?: string[];
  damageNotes?: string;

  /* Step 4 — cause */
  cause?: string;
  bodyDamage?: string;
  incidentReported?: string;
  vehicleSecure?: string;
  otherItemsDamaged?: string;
  multiplePanels?: string;

  /* Step 5 — insurance */
  paymentPath?: PaymentPath;
  autoPak?: string;
  deductible?: string;
  hasClaim?: string;
  claimNumber?: string;

  /* Step 6 — vehicle */
  vehicleClass?: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleTrim?: string;
  bodyStyle?: string;
  vin?: string;
  plate?: string;
  registrationProvince?: string;
  manualVehicleEntry?: boolean;

  /* Step 7 — glass features */
  features?: string[];

  /* Step 8 — location */
  locationPreference?: string;
  streetAddress?: string;
  city?: string;
  locationProvince?: string;
  postalCode?: string;
  locationKind?: string;
  safeParking?: string;
  coveredSpace?: string;
  accessNotes?: string;

  /* Step 9 — timing */
  urgency?: string;
  preferredDate?: string;
  preferredTime?: string;

  /* Step 10 — photos */
  photos?: UploadedPhoto[];

  /* Step 11 — contact */
  fullName?: string;
  phone?: string;
  email?: string;
  contactMethod?: string;
  bestTime?: string;
  notes?: string;
  consent?: boolean;
  marketingOptIn?: boolean;
}

export type AnswerKey = keyof QuoteAnswers;

export interface QuoteState {
  stepId: StepId;
  answers: QuoteAnswers;
  visited: StepId[];
  returnToReview: boolean;
  utm: UtmParams;
  reference?: string;
}
