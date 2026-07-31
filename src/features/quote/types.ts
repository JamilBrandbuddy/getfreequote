export type GlassArea =
  | "windshield"
  | "front_door"
  | "rear_door"
  | "quarter"
  | "vent"
  | "rear_windshield"
  | "sunroof"
  | "mirror"
  | "not_sure";

export type ServiceType =
  | "repair"
  | "replacement"
  | "leak"
  | "adas"
  | "sunroof_replacement"
  | "sunroof_leak"
  | "mirror_assembly"
  | "mirror_glass"
  | "not_sure";

export type PaymentPath =
  | "sgi_new"
  | "sgi_started"
  | "other_insurer"
  | "private"
  | "not_sure";

export type LocationType = "mobile" | "shop";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

export interface QuoteAnswers {
  // Stage 2 — glass area + triage
  glassArea?: GlassArea;
  triageSymptom?: string;
  triageWhere?: string;

  // Stage 3 — service
  service?: ServiceType;

  // Stage 4 — damage assessment
  chipCount?: string;
  chipSize?: string;
  chipLocation?: string;
  crackSpreading?: string;
  replacementCondition?: string;
  drivable?: string;
  leakWhen?: string[];
  waterInside?: string;
  priorReplacement?: string;
  adasReason?: string;
  adasPriorWork?: string;
  sideGlassState?: string;
  debrisInDoor?: string;
  windowStuck?: string;
  vehicleSecure?: string;
  sunroofIssue?: string;
  sunroofExploded?: string;
  mirrorScope?: string;
  damageNotes?: string;

  // Stage 5 — cause
  damageCause?: string;
  policeFileNumber?: string;
  collisionLargerClaim?: string;
  hailMultiplePanels?: string;
  otherDamageNotes?: string;

  // Stage 6 — insurance / SGI
  paymentPath?: PaymentPath;
  sgiClaimNumber?: string;
  sgiOnlyItem?: string;
  sgiCustomerName?: string;

  // Stage 7 — vehicle
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleTrim?: string;
  vin?: string;
  plate?: string;

  // Stage 8 — glass features
  featWindshield?: string[];
  featDoor?: string[];
  featRear?: string[];
  featSunroof?: string[];
  featMirror?: string[];

  // Stage 9 — location
  city?: string;
  locationType?: LocationType;
  postalCode?: string;
  streetAddress?: string;

  // Stage 10 — timing
  urgency?: string;
  preferredDate?: string;
  preferredWindow?: string;

  // Stage 11 — uploads
  photos?: UploadedFile[];

  // Stage 12 — contact
  fullName?: string;
  phone?: string;
  email?: string;
  contactMethod?: string;
  notes?: string;
  consent?: boolean;
  marketingOptIn?: boolean;
}

export type AnswerKey = keyof QuoteAnswers;

export type StepId =
  | "welcome"
  | "area"
  | "service"
  | "damage"
  | "cause"
  | "insurance"
  | "vehicle"
  | "features"
  | "location"
  | "timing"
  | "uploads"
  | "contact"
  | "review"
  | "confirmation";

export interface WizardState {
  stepId: StepId;
  answers: QuoteAnswers;
  staleAnswers: Partial<QuoteAnswers>;
  visited: StepId[];
  returnToReview: boolean;
  maxProgress: number;
  submittedRef?: string;
}
