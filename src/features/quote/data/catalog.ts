export const BUSINESS = {
  name: "Riverbend Autoglass Inc.",
  shortName: "Riverbend Autoglass",
  phone: "+1 639-525-9707",
  phoneHref: "tel:+16395259707",
  email: "sales@riverbendautoglass.ca",
} as const;

export interface Option {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
  disabledNote?: string;
}

/** Cities we serve. `mobile: true` means mobile service is available there. */
export const SERVICE_CITIES: { value: string; label: string; mobile: boolean }[] = [
  { value: "saskatoon", label: "Saskatoon", mobile: true },
  { value: "warman", label: "Warman", mobile: true },
  { value: "martensville", label: "Martensville", mobile: true },
  { value: "langham", label: "Langham", mobile: true },
  { value: "dundurn", label: "Dundurn", mobile: true },
  { value: "biggar", label: "Biggar", mobile: true },
  { value: "humboldt", label: "Humboldt", mobile: true },
  { value: "melfort", label: "Melfort", mobile: false },
  { value: "prince_albert", label: "Prince Albert", mobile: true },
  { value: "north_battleford", label: "North Battleford", mobile: true },
  { value: "battleford", label: "Battleford", mobile: true },
  { value: "meadow_lake", label: "Meadow Lake", mobile: false },
  { value: "kindersley", label: "Kindersley", mobile: false },
  { value: "swift_current", label: "Swift Current", mobile: false },
  { value: "moose_jaw", label: "Moose Jaw", mobile: true },
  { value: "yorkton", label: "Yorkton", mobile: false },
  { value: "estevan", label: "Estevan", mobile: false },
  { value: "other", label: "Another Saskatchewan community", mobile: false },
];

export const isMobileCity = (city?: string) =>
  SERVICE_CITIES.find((c) => c.value === city)?.mobile ?? false;

export const cityLabel = (city?: string) =>
  SERVICE_CITIES.find((c) => c.value === city)?.label ?? city ?? "";

/* ---------------------------------------------------------------- vehicles */

export const VEHICLE_YEARS = Array.from({ length: 32 }, (_, i) =>
  String(new Date().getFullYear() + 1 - i),
);

export const VEHICLE_MAKES: Record<string, string[]> = {
  Acura: ["ILX", "MDX", "RDX", "TLX"],
  Audi: ["A4", "A6", "Q5", "Q7"],
  BMW: ["3 Series", "5 Series", "X3", "X5"],
  Buick: ["Enclave", "Encore", "Envision"],
  Cadillac: ["Escalade", "XT4", "XT5"],
  Chevrolet: ["Blazer", "Colorado", "Equinox", "Malibu", "Silverado 1500", "Silverado 2500", "Suburban", "Tahoe", "Trax"],
  Chrysler: ["300", "Pacifica"],
  Dodge: ["Charger", "Durango", "Grand Caravan"],
  Ford: ["Bronco", "Edge", "Escape", "Expedition", "Explorer", "F-150", "F-250", "F-350", "Maverick", "Ranger"],
  GMC: ["Acadia", "Canyon", "Sierra 1500", "Sierra 2500", "Terrain", "Yukon"],
  Honda: ["Accord", "Civic", "CR-V", "Odyssey", "Pilot", "Ridgeline"],
  Hyundai: ["Elantra", "Kona", "Palisade", "Santa Fe", "Tucson"],
  Jeep: ["Cherokee", "Compass", "Grand Cherokee", "Wrangler"],
  Kia: ["Forte", "Seltos", "Sorento", "Sportage", "Telluride"],
  Lexus: ["ES", "NX", "RX"],
  Mazda: ["CX-5", "CX-50", "CX-9", "Mazda3"],
  Mercedes: ["C-Class", "GLC", "GLE", "Sprinter"],
  Nissan: ["Altima", "Frontier", "Kicks", "Murano", "Rogue", "Titan"],
  Ram: ["1500", "2500", "3500", "ProMaster"],
  Subaru: ["Ascent", "Crosstrek", "Forester", "Outback"],
  Tesla: ["Model 3", "Model S", "Model X", "Model Y"],
  Toyota: ["4Runner", "Camry", "Corolla", "Highlander", "RAV4", "Sienna", "Tacoma", "Tundra"],
  Volkswagen: ["Atlas", "Golf", "Jetta", "Tiguan"],
  Volvo: ["XC60", "XC90"],
  Other: ["Other / not listed"],
};

export const VEHICLE_MAKE_OPTIONS: Option[] = Object.keys(VEHICLE_MAKES).map((m) => ({
  value: m,
  label: m,
}));

/* ------------------------------------------------------------ option lists */

export const GLASS_AREA_OPTIONS: Option[] = [
  { value: "windshield", label: "Front windshield", description: "Chip, crack, leak or full replacement", icon: "windshield" },
  { value: "front_door", label: "Front door glass", description: "Driver or passenger side window", icon: "door" },
  { value: "rear_door", label: "Rear door glass", description: "Back passenger side window", icon: "door" },
  { value: "quarter", label: "Quarter glass", description: "Small fixed glass behind the rear door", icon: "quarter" },
  { value: "vent", label: "Vent glass", description: "Small triangular glass in the door frame", icon: "vent" },
  { value: "rear_windshield", label: "Rear windshield", description: "Back glass, often with defroster lines", icon: "rear" },
  { value: "sunroof", label: "Sunroof or moonroof", description: "Roof glass panel", icon: "sunroof" },
  { value: "mirror", label: "Side mirror", description: "Mirror glass or full assembly", icon: "mirror" },
  { value: "not_sure", label: "I'm not sure", description: "Answer two quick questions and we'll figure it out", icon: "help" },
];

export const WINDSHIELD_SERVICE_OPTIONS: Option[] = [
  { value: "repair", label: "Chip or small crack repair", description: "Usually 30–45 minutes, often no deductible with SGI" },
  { value: "replacement", label: "Full windshield replacement", description: "Large crack, shattered or damage in your line of sight" },
  { value: "leak", label: "Leak or wind noise", description: "Water inside, whistling at highway speed" },
  { value: "adas", label: "ADAS recalibration only", description: "Camera or driver-assist warning after glass work" },
  { value: "not_sure", label: "I'm not sure yet", description: "We'll recommend the right service" },
];

export const SUNROOF_SERVICE_OPTIONS: Option[] = [
  { value: "sunroof_replacement", label: "Glass panel replacement", description: "Cracked or shattered sunroof glass" },
  { value: "sunroof_leak", label: "Leak or seal issue", description: "Water dripping from the roof liner" },
  { value: "not_sure", label: "I'm not sure", description: "We'll diagnose it for you" },
];

export const MIRROR_SERVICE_OPTIONS: Option[] = [
  { value: "mirror_assembly", label: "Full mirror assembly", description: "Housing broken or hanging off" },
  { value: "mirror_glass", label: "Mirror glass only", description: "Housing is fine, just the glass is broken" },
  { value: "not_sure", label: "I'm not sure", description: "Send a photo and we'll confirm" },
];

export const YES_NO_UNSURE: Option[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not sure" },
];

export const DAMAGE_CAUSE_OPTIONS: Option[] = [
  { value: "road_debris", label: "Road debris or a rock", description: "Highway gravel, truck spray, flying stone" },
  { value: "collision", label: "Collision", description: "Accident or impact with another object" },
  { value: "vandalism", label: "Vandalism or break-in", description: "Smashed or forced entry" },
  { value: "hail", label: "Hail or weather", description: "Storm, hail, extreme cold" },
  { value: "unknown", label: "I don't know", description: "It appeared and I'm not sure how" },
];

export const PAYMENT_OPTIONS: Option[] = [
  { value: "sgi_new", label: "SGI claim — not started yet", description: "We can walk you through opening the claim" },
  { value: "sgi_started", label: "SGI claim — already started", description: "You have a claim number" },
  { value: "other_insurer", label: "Another insurer", description: "Fleet, out-of-province or private insurer" },
  { value: "private", label: "Paying privately", description: "No claim — pay directly" },
  { value: "not_sure", label: "Not sure yet", description: "We'll review both options with you" },
];

export const URGENCY_OPTIONS: Option[] = [
  { value: "asap", label: "As soon as possible", description: "Today or tomorrow if we can" },
  { value: "this_week", label: "This week" },
  { value: "two_weeks", label: "Within two weeks" },
  { value: "flexible", label: "I'm flexible", description: "Whatever works best for your schedule" },
];

export const WINDOW_OPTIONS: Option[] = [
  { value: "morning", label: "Morning", description: "8:00 am – 12:00 pm" },
  { value: "afternoon", label: "Afternoon", description: "12:00 pm – 5:00 pm" },
  { value: "any", label: "Either works" },
];

export const CONTACT_METHOD_OPTIONS: Option[] = [
  { value: "phone", label: "Phone call" },
  { value: "text", label: "Text message" },
  { value: "email", label: "Email" },
];

export const WINDSHIELD_FEATURES: Option[] = [
  { value: "rain_sensor", label: "Rain sensor", description: "Wipers start on their own" },
  { value: "camera", label: "Forward camera / lane departure", description: "Camera behind the mirror — needs ADAS recalibration" },
  { value: "hud", label: "Heads-up display", description: "Speed projected onto the glass" },
  { value: "heated_park", label: "Heated wiper park", description: "Heating strip at the base" },
  { value: "acoustic", label: "Acoustic / sound-reducing glass" },
  { value: "condensation", label: "Condensation / humidity sensor" },
  { value: "antenna", label: "Antenna in the glass" },
  { value: "not_sure", label: "I'm not sure", description: "We'll verify by VIN before ordering" },
];

export const DOOR_FEATURES: Option[] = [
  { value: "tint", label: "Aftermarket tint" },
  { value: "privacy", label: "Factory privacy (dark) glass" },
  { value: "power", label: "Power window" },
  { value: "not_sure", label: "I'm not sure", description: "We'll verify by VIN" },
];

export const REAR_FEATURES: Option[] = [
  { value: "defroster", label: "Defroster lines" },
  { value: "wiper", label: "Rear wiper" },
  { value: "antenna", label: "Antenna in the glass" },
  { value: "privacy", label: "Factory privacy (dark) glass" },
  { value: "not_sure", label: "I'm not sure", description: "We'll verify by VIN" },
];

export const SUNROOF_FEATURES: Option[] = [
  { value: "panoramic", label: "Panoramic (full-roof) glass" },
  { value: "single", label: "Single-panel sunroof" },
  { value: "shade_intact", label: "Interior shade is intact" },
  { value: "not_sure", label: "I'm not sure", description: "We'll verify by VIN" },
];

export const MIRROR_FEATURES: Option[] = [
  { value: "heated", label: "Heated mirror" },
  { value: "signal", label: "Turn signal in the mirror" },
  { value: "blind_spot", label: "Blind-spot indicator" },
  { value: "power_fold", label: "Power folding" },
  { value: "auto_dim", label: "Auto-dimming" },
  { value: "not_sure", label: "I'm not sure", description: "We'll verify by VIN" },
];
