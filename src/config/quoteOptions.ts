import type { AreaGroup, DamageTopic, GlassAreaId } from "@/types/quote";

export interface Option {
  value: string;
  label: string;
  description?: string;
}

/* ------------------------------------------------------------------ areas */

export interface GlassAreaOption extends Option {
  value: GlassAreaId;
  group: AreaGroup;
}

export const GLASS_AREAS: GlassAreaOption[] = [
  { value: "front-windshield", label: "Front windshield", description: "Chips, cracks, replacement", group: "windshield" },
  { value: "rear-windshield", label: "Rear windshield / back glass", description: "Defroster, antenna, breakage", group: "rear" },
  { value: "driver-front-door", label: "Driver-side front door glass", group: "side" },
  { value: "passenger-front-door", label: "Passenger-side front door glass", group: "side" },
  { value: "driver-rear-door", label: "Driver-side rear door glass", group: "side" },
  { value: "passenger-rear-door", label: "Passenger-side rear door glass", group: "side" },
  { value: "driver-quarter", label: "Driver-side quarter glass", description: "Small fixed pane behind the door", group: "side" },
  { value: "passenger-quarter", label: "Passenger-side quarter glass", description: "Small fixed pane behind the door", group: "side" },
  { value: "vent", label: "Vent glass", description: "Small triangular pane", group: "side" },
  { value: "sunroof", label: "Sunroof or moonroof", group: "sunroof" },
  { value: "side-mirror", label: "Side mirror", group: "mirror" },
  { value: "not-sure", label: "I'm not sure", description: "We'll help you identify it", group: "unknown" },
];

export const areaById = (id?: GlassAreaId) => GLASS_AREAS.find((a) => a.value === id);
export const areaGroupOf = (id?: GlassAreaId): AreaGroup => areaById(id)?.group ?? "unknown";
export const areaLabel = (id?: GlassAreaId) => areaById(id)?.label ?? "Not selected";

/* --------------------------------------------------------------- services */

export interface ServiceOption extends Option {
  topic: DamageTopic;
}

export const SERVICES_BY_GROUP: Record<AreaGroup, ServiceOption[]> = {
  windshield: [
    { value: "chip-repair", label: "Stone chip repair", description: "Small impact points", topic: "chip" },
    { value: "crack-repair", label: "Crack assessment or repair", topic: "crack" },
    { value: "windshield-replacement", label: "Full windshield replacement", topic: "shattered" },
    { value: "windshield-leak", label: "Windshield leak or wind noise", topic: "leak" },
    { value: "adas-recalibration", label: "ADAS camera recalibration", topic: "sensor" },
    { value: "windshield-not-sure", label: "I'm not sure", topic: "other" },
  ],
  rear: [
    { value: "rear-replacement", label: "Broken or shattered glass replacement", topic: "shattered" },
    { value: "rear-defroster", label: "Defroster or antenna concern", topic: "sensor" },
    { value: "rear-leak", label: "Water leak", topic: "leak" },
    { value: "rear-not-sure", label: "I'm not sure", topic: "other" },
  ],
  side: [
    { value: "side-replacement", label: "Broken or shattered glass replacement", topic: "shattered" },
    { value: "side-mechanism", label: "Window does not move properly", topic: "mechanism" },
    { value: "side-leak", label: "Water leak or wind noise", topic: "leak" },
    { value: "side-scratched", label: "Glass scratched or damaged", topic: "other" },
    { value: "side-not-sure", label: "I'm not sure", topic: "other" },
  ],
  sunroof: [
    { value: "sunroof-replacement", label: "Broken glass replacement", topic: "shattered" },
    { value: "sunroof-leak", label: "Water leak", topic: "leak" },
    { value: "sunroof-mechanism", label: "Opening or closing problem", topic: "mechanism" },
    { value: "sunroof-seal", label: "Seal or track problem", topic: "leak" },
    { value: "sunroof-not-sure", label: "I'm not sure", topic: "other" },
  ],
  mirror: [
    { value: "mirror-glass", label: "Mirror glass only", topic: "other" },
    { value: "mirror-assembly", label: "Complete mirror assembly", topic: "other" },
    { value: "mirror-features", label: "Heating, signal or blind-spot feature problem", topic: "sensor" },
    { value: "mirror-not-sure", label: "I'm not sure", topic: "other" },
  ],
  unknown: [
    { value: "broad-chip", label: "Small chip", topic: "chip" },
    { value: "broad-crack", label: "Long crack", topic: "crack" },
    { value: "broad-shattered", label: "Shattered glass", topic: "shattered" },
    { value: "broad-leak", label: "Water leak", topic: "leak" },
    { value: "broad-wind", label: "Wind noise", topic: "leak" },
    { value: "broad-sensor", label: "Camera or sensor issue", topic: "sensor" },
    { value: "broad-mechanism", label: "Window mechanism issue", topic: "mechanism" },
    { value: "broad-other", label: "Other or not sure", topic: "other" },
  ],
};

export const servicesForArea = (group: AreaGroup) => SERVICES_BY_GROUP[group] ?? SERVICES_BY_GROUP.unknown;

export const serviceOptionByValue = (value?: string): ServiceOption | undefined => {
  if (!value) return undefined;
  for (const list of Object.values(SERVICES_BY_GROUP)) {
    const found = list.find((s) => s.value === value);
    if (found) return found;
  }
  return undefined;
};

export const serviceLabel = (value?: string) => serviceOptionByValue(value)?.label ?? "Not selected";
export const damageTopicFor = (service?: string): DamageTopic => serviceOptionByValue(service)?.topic ?? "other";

/* ----------------------------------------------------------- shared sets */

export const YES_NO_UNSURE: Option[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not-sure", label: "Not sure" },
];

export const CHIP_COUNT: Option[] = [
  { value: "1", label: "One" },
  { value: "2", label: "Two" },
  { value: "3+", label: "Three or more" },
  { value: "not-sure", label: "Not sure" },
];

export const CHIP_SIZE: Option[] = [
  { value: "under-dime", label: "Smaller than a dime" },
  { value: "dime-loonie", label: "Dime to loonie-sized" },
  { value: "over-loonie", label: "Larger than a loonie" },
  { value: "not-sure", label: "Not sure" },
];

export const CRACK_LENGTH: Option[] = [
  { value: "under-6", label: "Less than 6 inches" },
  { value: "6-12", label: "6 to 12 inches" },
  { value: "over-12", label: "More than 12 inches" },
  { value: "most", label: "Across most of the windshield" },
  { value: "not-sure", label: "Not sure" },
];

export const LEAK_WHEN: Option[] = [
  { value: "rain", label: "During rain" },
  { value: "highway", label: "At highway speed" },
  { value: "car-wash", label: "During a car wash" },
  { value: "always", label: "All the time" },
  { value: "not-sure", label: "Not sure" },
];

export const STUCK_POSITION: Option[] = [
  { value: "open", label: "Stuck open" },
  { value: "closed", label: "Stuck closed" },
  { value: "partial", label: "Partially open" },
  { value: "not-sure", label: "Not sure" },
];

export const ADAS_FEATURES: Option[] = [
  { value: "lane-departure", label: "Lane-departure warning" },
  { value: "forward-collision", label: "Forward-collision warning" },
  { value: "adaptive-cruise", label: "Adaptive cruise control" },
  { value: "aeb", label: "Automatic emergency braking" },
  { value: "rain-sensor", label: "Rain sensor" },
  { value: "unknown", label: "Unknown" },
];

/* ------------------------------------------------------------------ cause */

export const DAMAGE_CAUSES: Option[] = [
  { value: "road-debris", label: "Stone or road debris" },
  { value: "spread", label: "Crack spread over time" },
  { value: "collision", label: "Collision or accident" },
  { value: "vandalism", label: "Break-in or vandalism" },
  { value: "hail", label: "Hail, storm or falling object" },
  { value: "temperature", label: "Temperature change" },
  { value: "mechanical", label: "Mechanical failure" },
  { value: "unknown", label: "Unknown" },
  { value: "other", label: "Other" },
];

/* -------------------------------------------------------------- insurance */

export const PAYMENT_PATHS: Option[] = [
  { value: "sgi", label: "Use SGI insurance", description: "We can help guide the claim process" },
  { value: "private", label: "Pay privately", description: "No insurance claim" },
  { value: "not-sure", label: "I'm not sure yet", description: "We'll explain the options" },
];

export const DEDUCTIBLES: Option[] = [
  { value: "0", label: "$0" },
  { value: "50", label: "$50" },
  { value: "100", label: "$100" },
  { value: "200", label: "$200" },
  { value: "500", label: "$500" },
  { value: "700", label: "$700" },
  { value: "other", label: "Other" },
  { value: "not-sure", label: "Not sure" },
];

/* ---------------------------------------------------------------- vehicle */

export const PROVINCES: Option[] = [
  { value: "SK", label: "Saskatchewan" },
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "YT", label: "Yukon" },
];

export const VEHICLE_CLASSES: Option[] = [
  { value: "passenger", label: "Car, SUV or light truck" },
  { value: "commercial", label: "Commercial, RV or heavy equipment" },
];

export const BODY_STYLES: Option[] = [
  { value: "sedan", label: "Sedan" },
  { value: "coupe", label: "Coupe" },
  { value: "hatchback", label: "Hatchback" },
  { value: "suv", label: "SUV / crossover" },
  { value: "pickup", label: "Pickup truck" },
  { value: "van", label: "Van / minivan" },
  { value: "wagon", label: "Wagon" },
  { value: "other", label: "Other" },
];

const CURRENT_YEAR = new Date().getFullYear();
export const VEHICLE_YEARS: string[] = Array.from(
  { length: CURRENT_YEAR + 1 - 1980 + 1 },
  (_, i) => String(CURRENT_YEAR + 1 - i),
);

/** Mock vehicle catalogue — replaced by a real VIN/vehicle API in a later phase. */
interface MakeEntry {
  make: string;
  from: number;
  models: { name: string; from?: number; to?: number }[];
}

const MAKES: MakeEntry[] = [
  { make: "Ford", from: 1980, models: [
    { name: "F-150" }, { name: "Escape", from: 2001 }, { name: "Explorer" },
    { name: "Edge", from: 2007 }, { name: "Focus", from: 2000, to: 2018 }, { name: "Mustang" },
    { name: "Bronco", from: 2021 }, { name: "Ranger" },
  ] },
  { make: "Chevrolet", from: 1980, models: [
    { name: "Silverado 1500", from: 1999 }, { name: "Equinox", from: 2005 }, { name: "Traverse", from: 2009 },
    { name: "Malibu" }, { name: "Cruze", from: 2011, to: 2019 }, { name: "Tahoe" }, { name: "Colorado", from: 2004 },
  ] },
  { make: "GMC", from: 1980, models: [
    { name: "Sierra 1500" }, { name: "Terrain", from: 2010 }, { name: "Acadia", from: 2007 }, { name: "Yukon" }, { name: "Canyon", from: 2004 },
  ] },
  { make: "Ram", from: 2011, models: [{ name: "1500" }, { name: "2500" }, { name: "ProMaster" }] },
  { make: "Dodge", from: 1980, models: [{ name: "Grand Caravan", to: 2020 }, { name: "Charger" }, { name: "Journey", from: 2009, to: 2020 }, { name: "Durango" }] },
  { make: "Toyota", from: 1980, models: [
    { name: "Corolla" }, { name: "Camry" }, { name: "RAV4", from: 1996 }, { name: "Highlander", from: 2001 },
    { name: "Tacoma", from: 1995 }, { name: "Tundra", from: 2000 }, { name: "4Runner" },
  ] },
  { make: "Honda", from: 1980, models: [{ name: "Civic" }, { name: "Accord" }, { name: "CR-V", from: 1997 }, { name: "Pilot", from: 2003 }, { name: "Odyssey", from: 1995 }, { name: "HR-V", from: 2016 }] },
  { make: "Hyundai", from: 1985, models: [{ name: "Elantra" }, { name: "Tucson", from: 2005 }, { name: "Santa Fe", from: 2001 }, { name: "Kona", from: 2018 }, { name: "Sonata" }] },
  { make: "Kia", from: 1995, models: [{ name: "Forte", from: 2010 }, { name: "Sportage" }, { name: "Sorento", from: 2003 }, { name: "Seltos", from: 2021 }, { name: "Soul", from: 2010 }] },
  { make: "Nissan", from: 1985, models: [{ name: "Rogue", from: 2008 }, { name: "Altima" }, { name: "Sentra" }, { name: "Pathfinder" }, { name: "Frontier", from: 1998 }] },
  { make: "Subaru", from: 1985, models: [{ name: "Outback", from: 1995 }, { name: "Forester", from: 1998 }, { name: "Crosstrek", from: 2013 }, { name: "Impreza", from: 1993 }] },
  { make: "Mazda", from: 1985, models: [{ name: "CX-5", from: 2013 }, { name: "CX-30", from: 2020 }, { name: "Mazda3", from: 2004 }, { name: "CX-9", from: 2007 }] },
  { make: "Volkswagen", from: 1980, models: [{ name: "Jetta" }, { name: "Golf" }, { name: "Tiguan", from: 2009 }, { name: "Atlas", from: 2018 }] },
  { make: "Jeep", from: 1985, models: [{ name: "Grand Cherokee" }, { name: "Wrangler" }, { name: "Cherokee" }, { name: "Compass", from: 2007 }] },
  { make: "BMW", from: 1985, models: [{ name: "3 Series" }, { name: "5 Series" }, { name: "X3", from: 2004 }, { name: "X5", from: 2000 }] },
  { make: "Mercedes-Benz", from: 1985, models: [{ name: "C-Class", from: 1994 }, { name: "E-Class" }, { name: "GLC", from: 2016 }, { name: "Sprinter", from: 2003 }] },
  { make: "Tesla", from: 2013, models: [{ name: "Model 3", from: 2018 }, { name: "Model Y", from: 2020 }, { name: "Model S" }, { name: "Model X", from: 2016 }] },
  { make: "Lexus", from: 1990, models: [{ name: "RX", from: 1999 }, { name: "NX", from: 2015 }, { name: "ES" }, { name: "GX", from: 2003 }] },
  { make: "Volvo", from: 1985, models: [{ name: "XC60", from: 2010 }, { name: "XC90", from: 2003 }, { name: "S60", from: 2001 }] },
  { make: "Buick", from: 1980, models: [{ name: "Encore", from: 2013 }, { name: "Enclave", from: 2008 }, { name: "Envision", from: 2016 }] },
];

export function makesForYear(year?: string): string[] {
  const y = Number(year);
  if (!y) return MAKES.map((m) => m.make).sort();
  return MAKES.filter((m) => y >= m.from).map((m) => m.make).sort();
}

export function modelsFor(year?: string, make?: string): string[] {
  const entry = MAKES.find((m) => m.make === make);
  if (!entry) return [];
  const y = Number(year);
  return entry.models
    .filter((m) => (!y ? true : y >= (m.from ?? entry.from) && y <= (m.to ?? 9999)))
    .map((m) => m.name)
    .sort();
}

/* --------------------------------------------------------------- features */

export const FEATURES_BY_GROUP: Record<AreaGroup, Option[]> = {
  windshield: [
    { value: "camera", label: "Camera near the rear-view mirror", description: "A small housing behind the mirror" },
    { value: "rain-sensor", label: "Rain sensor", description: "Wipers start automatically in rain" },
    { value: "heated-windshield", label: "Heated windshield" },
    { value: "heated-wiper", label: "Heated wiper area" },
    { value: "hud", label: "Heads-up display", description: "Speed projected onto the glass" },
    { value: "acoustic", label: "Acoustic or sound-reducing glass" },
    { value: "lane-departure", label: "Lane-departure system" },
    { value: "adaptive-cruise", label: "Adaptive cruise control" },
    { value: "antenna", label: "Antenna in the glass" },
    { value: "none", label: "None of these" },
    { value: "not-sure", label: "I'm not sure" },
  ],
  rear: [
    { value: "defroster", label: "Rear defroster" },
    { value: "antenna", label: "Embedded antenna" },
    { value: "tint", label: "Factory tint" },
    { value: "camera-wiper", label: "Rear camera or wiper" },
    { value: "not-sure", label: "Not sure" },
  ],
  side: [
    { value: "power-window", label: "Power window" },
    { value: "manual-window", label: "Manual window" },
    { value: "tint", label: "Factory tint" },
    { value: "privacy", label: "Privacy glass" },
    { value: "regulator", label: "Window regulator concern" },
    { value: "not-sure", label: "Not sure" },
  ],
  sunroof: [
    { value: "standard", label: "Standard sunroof" },
    { value: "panoramic", label: "Panoramic roof" },
    { value: "fixed", label: "Fixed glass panel" },
    { value: "moving", label: "Moving glass panel" },
    { value: "not-sure", label: "Not sure" },
  ],
  mirror: [
    { value: "heating", label: "Heating" },
    { value: "signal", label: "Turn signal" },
    { value: "blind-spot", label: "Blind-spot warning" },
    { value: "auto-dim", label: "Auto-dimming" },
    { value: "power-fold", label: "Power folding" },
    { value: "camera", label: "Camera" },
    { value: "not-sure", label: "Not sure" },
  ],
  unknown: [],
};

export const ADAS_TRIGGER_FEATURES = ["camera", "lane-departure", "adaptive-cruise", "forward-collision"];

/* --------------------------------------------------------------- location */

export const LOCATION_PREFERENCES: Option[] = [
  { value: "shop", label: "At our shop", description: "Controlled environment, fastest turnaround" },
  { value: "mobile", label: "Mobile service at my location", description: "We come to your home or workplace" },
  { value: "either", label: "Whichever is available sooner" },
  { value: "not-sure", label: "I'm not sure" },
];

export const LOCATION_KINDS: Option[] = [
  { value: "home", label: "Home" },
  { value: "work", label: "Workplace" },
  { value: "other", label: "Other" },
];

/* --------------------------------------------------------------- schedule */

export const URGENCY_OPTIONS: Option[] = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-2-days", label: "Within 1–2 days" },
  { value: "week", label: "Within one week" },
  { value: "flexible", label: "Flexible" },
  { value: "emergency", label: "Emergency or vehicle unsecured" },
];

export const TIME_WINDOWS: Option[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "any", label: "Any time" },
];

/* ---------------------------------------------------------------- contact */

export const CONTACT_METHODS: Option[] = [
  { value: "phone", label: "Phone call" },
  { value: "text", label: "Text message" },
  { value: "email", label: "Email" },
];

export const BEST_TIMES: Option[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "any", label: "Any time" },
];

export const labelOf = (options: Option[], value?: string) =>
  options.find((o) => o.value === value)?.label ?? value ?? "";

export const labelsOf = (options: Option[], values?: string[]) =>
  (values ?? []).map((v) => labelOf(options, v));
