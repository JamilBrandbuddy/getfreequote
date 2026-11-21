/** Client-safe definitions and calculations for monthly marketing reports. */
export type MetricValue = number | "na" | null; // null = not entered, "na" = not available
export type Unit = "count" | "money" | "percent" | "decimal";
export interface MetricDef { key: string; label: string; unit: Unit; hint?: string }
export interface SectionDef { key: string; title: string; source: string; metrics: MetricDef[] }

export const SECTIONS: SectionDef[] = [
  { key: "contact", title: "Website contact form", source: "Entered manually", metrics: [
    { key: "inquiries", label: "Contact form inquiries", unit: "count" },
    { key: "qualified", label: "Qualified inquiries", unit: "count" }] },
  { key: "booking", title: "Website booking plugin", source: "Entered manually from the booking plugin", metrics: [
    { key: "bookings", label: "Appointment bookings", unit: "count" },
    { key: "confirmed", label: "Confirmed appointments", unit: "count" },
    { key: "completed", label: "Completed appointments", unit: "count" }] },
  { key: "calls", title: "Website phone calls", source: "Entered manually — only calls with tracking", metrics: [
    { key: "tracked", label: "Tracked website calls", unit: "count" },
    { key: "qualified", label: "Qualified calls", unit: "count" }] },
  { key: "gbp", title: "Google Business Profile", source: "Entered manually from Google Business Profile", metrics: [
    { key: "views", label: "Business Profile views", unit: "count" },
    { key: "calls", label: "Call button interactions", unit: "count" },
    { key: "directions", label: "Direction requests", unit: "count" },
    { key: "websiteClicks", label: "Website clicks", unit: "count" },
    { key: "other", label: "Other profile interactions", unit: "count" }] },
  { key: "gsc", title: "Google Search Console (SEO)", source: "Entered manually from Search Console", metrics: [
    { key: "clicks", label: "Organic search clicks", unit: "count", hint: "Clicks from Google Search — not unique visitors." },
    { key: "impressions", label: "Search impressions", unit: "count" },
    { key: "ctr", label: "Average CTR", unit: "percent" },
    { key: "position", label: "Average search position", unit: "decimal" }] },
  { key: "meta", title: "Facebook / Meta Ads — monthly summary", source: "Entered manually from Meta Ads Manager", metrics: [
    { key: "budget", label: "Monthly advertising budget", unit: "money" },
    { key: "spend", label: "Actual amount spent", unit: "money" },
    { key: "campaigns", label: "Total campaigns", unit: "count" },
    { key: "ads", label: "Total ads run", unit: "count" },
    { key: "reach", label: "Account reach (as reported by Meta)", unit: "count" },
    { key: "impressions", label: "Total impressions", unit: "count" },
    { key: "clicks", label: "Total clicks", unit: "count" },
    { key: "messages", label: "Total messages", unit: "count" },
    { key: "calls", label: "Total calls", unit: "count" },
    { key: "leads", label: "Total leads", unit: "count" },
    { key: "websiteVisits", label: "Website visits", unit: "count" },
    { key: "conversions", label: "Platform-reported conversions", unit: "count" }] },
  { key: "gads", title: "Google Ads — monthly summary", source: "Entered manually from Google Ads", metrics: [
    { key: "budget", label: "Monthly advertising budget", unit: "money" },
    { key: "spend", label: "Actual amount spent", unit: "money" },
    { key: "campaigns", label: "Total campaigns", unit: "count" },
    { key: "impressions", label: "Total impressions", unit: "count" },
    { key: "clicks", label: "Total clicks", unit: "count" },
    { key: "conversions", label: "Total conversions", unit: "count" },
    { key: "calls", label: "Total calls", unit: "count" }] },
];

export const META_CAMPAIGN_METRICS: MetricDef[] = [
  { key: "budget", label: "Budget", unit: "money" }, { key: "spend", label: "Spend", unit: "money" },
  { key: "costPerResult", label: "Cost per result", unit: "money" },
  { key: "reach", label: "Reach", unit: "count" }, { key: "impressions", label: "Impressions", unit: "count" },
  { key: "clicks", label: "Clicks", unit: "count" }, { key: "messages", label: "Messages", unit: "count" },
  { key: "calls", label: "Calls", unit: "count" }, { key: "leads", label: "Leads", unit: "count" },
  { key: "websiteVisits", label: "Website visits", unit: "count" }, { key: "conversions", label: "Conversions", unit: "count" }];
export const GOOGLE_CAMPAIGN_METRICS: MetricDef[] = [
  { key: "budget", label: "Budget", unit: "money" }, { key: "spend", label: "Spend", unit: "money" },
  { key: "impressions", label: "Impressions", unit: "count" }, { key: "clicks", label: "Clicks", unit: "count" },
  { key: "conversions", label: "Conversions", unit: "count" }, { key: "phoneConv", label: "Phone call conv.", unit: "count" },
  { key: "formConv", label: "Form conv.", unit: "count" }, { key: "bookingConv", label: "Booking conv.", unit: "count" },
  { key: "otherConv", label: "Other conv.", unit: "count" }];

export interface CampaignRow { id: string; name: string; sub: string; kind: string; notes: string; resultType?: string; values: Record<string, MetricValue> }
export interface ReportData { sections: Record<string, { values: Record<string, MetricValue>; notes: string }>; metaCampaigns: CampaignRow[]; googleCampaigns: CampaignRow[] }

export function emptyReportData(): ReportData {
  return { sections: Object.fromEntries(SECTIONS.map(s => [s.key, { values: {}, notes: "" }])), metaCampaigns: [], googleCampaigns: [] };
}

/** Coerces stored JSON into a safe ReportData shape. */
export function normalizeReportData(raw: unknown): ReportData {
  const base = emptyReportData();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<ReportData>;
  for (const s of SECTIONS) {
    const src = r.sections?.[s.key];
    if (src) base.sections[s.key] = { values: { ...(src.values ?? {}) }, notes: String(src.notes ?? "") };
  }
  base.metaCampaigns = Array.isArray(r.metaCampaigns) ? r.metaCampaigns : [];
  base.googleCampaigns = Array.isArray(r.googleCampaigns) ? r.googleCampaigns : [];
  return base;
}

export const isNum = (v: MetricValue | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/** Sums a metric across campaign rows. Returns null when no row has a number. */
export function sumRows(rows: CampaignRow[], key: string): number | null {
  const nums = rows.map(r => r.values[key]).filter(isNum);
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100 : null;
}

/** Metric keys that have a real number in at least one campaign row (empty columns are hidden in reports). */
export function filledColumns(rows: CampaignRow[], metrics: MetricDef[]): MetricDef[] {
  return metrics.filter(m => rows.some(r => isNum(r.values[m.key])));
}

export function ratio(a: MetricValue | undefined, b: MetricValue | undefined): number | null {
  return isNum(a) && isNum(b) && b > 0 ? a / b : null;
}

/** Google Ads derived figures: CTR %, average CPC, cost per conversion. */
export function googleDerived(v: Record<string, MetricValue>) {
  const ctr = ratio(v["clicks"], v["impressions"]);
  return { ctr: ctr === null ? null : Math.round(ctr * 10000) / 100, cpc: ratio(v["spend"], v["clicks"]), costPerConversion: ratio(v["spend"], v["conversions"]) };
}

/** Returns a warning when a campaign's conversion breakdown exceeds its total conversions. */
export function breakdownIssue(row: CampaignRow): string | null {
  const parts = ["phoneConv", "formConv", "bookingConv", "otherConv"].map(k => row.values[k]).filter(isNum);
  const total = row.values["conversions"];
  if (!parts.length || !isNum(total)) return null;
  const sum = parts.reduce((a, b) => a + b, 0);
  return sum > total ? `Breakdown (${sum}) is more than total conversions (${total}) — a conversion may be counted twice.` : null;
}

export interface QuoteStats { submissions: number; spam: number; uniqueCustomers: number; converted: number; notConverted: number; pending: number }
/** Conversion rate = converted ÷ valid (non-spam) quotes, as a percentage. */
export function quoteConversionRate(s: QuoteStats): number | null {
  const valid = s.submissions - s.spam;
  return valid > 0 ? Math.round((s.converted / valid) * 1000) / 10 : null;
}

export function formatMetric(v: MetricValue | undefined, unit: Unit, currency = "CAD"): string {
  if (v === "na") return "Not available";
  if (!isNum(v)) return "Not entered";
  if (unit === "money") return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(v);
  if (unit === "percent") return `${v.toFixed(2)}%`;
  if (unit === "decimal") return v.toFixed(1);
  return new Intl.NumberFormat("en-CA").format(v);
}

/** Month-over-month change in percent, or null when not comparable. */
export function momChange(cur: MetricValue | undefined, prev: MetricValue | undefined): number | null {
  if (!isNum(cur) || !isNum(prev) || prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const periodLabel = (y: number, m: number) => `${MONTHS[m - 1]} ${y}`;
