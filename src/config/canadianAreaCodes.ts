// Canadian geographic area codes by province/territory.
// Source: Canadian Numbering Administrator (CNA), "Canadian Area Codes" map & NPA list,
// https://www.cnac.ca/ — reference reviewed 2026-11-19. Update this file (and the
// mirrored SQL function public.phone_region_code via a new migration) when CNA adds NPAs.
export const AREA_CODE_REFERENCE = { source: "Canadian Numbering Administrator (cnac.ca)", reviewed: "2026-11-19" } as const;

export const CANADIAN_AREA_CODES: Record<string, string[]> = {
  AB: ["368", "403", "587", "780", "825"],
  BC: ["236", "250", "257", "604", "672", "778"],
  MB: ["204", "431", "584"],
  NB: ["428", "506"],
  NL: ["709", "879"],
  ON: ["226", "249", "289", "343", "365", "382", "416", "437", "519", "548", "613", "647", "683", "705", "742", "753", "807", "905", "942"],
  QC: ["263", "354", "367", "418", "438", "450", "468", "514", "579", "581", "819", "873"],
  SK: ["306", "474", "639"],
  "NS-PE": ["782", "902"], // shared: Nova Scotia or Prince Edward Island
  TERR: ["867"],           // shared: Yukon, Northwest Territories, Nunavut
};
export const CANADIAN_NON_GEOGRAPHIC = ["600", "622", "633", "644", "655", "677", "688"];
export const NANP_TOLL_FREE = ["800", "833", "844", "855", "866", "877", "888"];

export const REGION_LABELS: Record<string, string> = {
  AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador",
  ON: "Ontario", QC: "Quebec", SK: "Saskatchewan",
  "NS-PE": "Nova Scotia / PEI (shared)", TERR: "Yukon / NWT / Nunavut (shared)",
  TOLL_FREE: "Toll-free", CA_NON_GEO: "Canada non-geographic", OTHER_NANP: "Outside Canada (+1)",
  INTERNATIONAL: "International", INVALID: "Invalid number", NONE: "Not provided",
};
export const REGION_CODES = Object.keys(REGION_LABELS);

const LOOKUP = new Map<string, string>();
for (const [r, codes] of Object.entries(CANADIAN_AREA_CODES)) for (const c of codes) LOOKUP.set(c, r);

export interface PhoneRegion { code: string; label: string; areaCode: string | null }
/** Derives a region from a phone value without changing it. Mirrors SQL public.phone_region_code. */
export function classifyPhone(raw: string | null | undefined): PhoneRegion {
  const out = (code: string, areaCode: string | null = null) => ({ code, label: REGION_LABELS[code], areaCode });
  const text = (raw ?? "").trim().split(/\s*(?:ext\.?|x|#)\s*\d*$/i)[0];
  if (!text) return out("NONE");
  let d = text.replace(/\D/g, "");
  if (/^(\+|011)/.test(text)) {
    if (text.startsWith("011")) d = d.slice(3);
    if (!(d.length === 11 && d.startsWith("1"))) return d.length >= 7 ? out("INTERNATIONAL") : out("INVALID");
  }
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(d)) return out("INVALID");
  const npa = d.slice(0, 3);
  if (NANP_TOLL_FREE.includes(npa)) return out("TOLL_FREE", npa);
  if (CANADIAN_NON_GEOGRAPHIC.includes(npa)) return out("CA_NON_GEO", npa);
  return out(LOOKUP.get(npa) ?? "OTHER_NANP", npa);
}
