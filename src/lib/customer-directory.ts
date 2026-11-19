// Derived customer directory: groups quote rows into likely customers without
// changing any stored contact value. Phone is the primary identity; email only
import { classifyPhone } from "@/config/canadianAreaCodes";
import { customerSegment, type CustomerSegment } from "@/lib/conversion";
// joins when it points to exactly one phone identity (otherwise flagged ambiguous).
export interface CustomerQuoteRow {
  id: string; public_reference: string; created_at: string; status: string;
  requested_service: string | null; glass_area: string | null;
  customer_name: string; customer_phone: string; customer_email: string | null;
  vehicle_year: string | null; vehicle_make: string | null; vehicle_model: string | null;
  service_city: string | null; service_province?: string | null; conversion_status?: string;
}
export interface CustomerProfile {
  key: string; name: string; phones: string[]; emails: string[];
  quoteCount: number; firstQuoteAt: string; latestQuoteAt: string;
  latestService: string | null; latestStatus: string; serviceLocation: string | null; serviceProvince: string | null; phoneRegion: string;
  ambiguous: boolean; quoteIds: string[];
  segment: CustomerSegment; convertedQuotes: number; notConvertedQuotes: number; pendingQuotes: number;
}

export function normalizePhone(raw: string | null | undefined): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d.length === 10 ? d : null;
}
export function normalizeEmail(raw: string | null | undefined): string | null {
  const e = (raw ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

export function groupCustomers(rows: CustomerQuoteRow[]): CustomerProfile[] {
  const emailPhones = new Map<string, Set<string>>();
  for (const r of rows) {
    const p = normalizePhone(r.customer_phone), e = normalizeEmail(r.customer_email);
    if (p && e) { if (!emailPhones.has(e)) emailPhones.set(e, new Set()); emailPhones.get(e)!.add(p); }
  }
  const groups = new Map<string, CustomerQuoteRow[]>();
  const ambiguousKeys = new Set<string>();
  for (const r of rows) {
    const p = normalizePhone(r.customer_phone), e = normalizeEmail(r.customer_email);
    let key: string;
    if (p) {
      key = `p:${p}`;
      if (e && (emailPhones.get(e)?.size ?? 0) > 1) ambiguousKeys.add(key);
    } else if (e) {
      const linked = emailPhones.get(e);
      if (linked && linked.size === 1) key = `p:${[...linked][0]}`;
      else { key = `e:${e}`; if (linked && linked.size > 1) ambiguousKeys.add(key); }
    } else key = `q:${r.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return [...groups.entries()].map(([key, list]) => {
    const sorted = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latest = sorted[0];
    const emails = [...new Set(sorted.map((r) => normalizeEmail(r.customer_email)).filter(Boolean) as string[])];
    return {
      key, name: latest.customer_name,
      phones: [...new Set(sorted.map((r) => r.customer_phone.trim()).filter(Boolean))],
      emails, quoteCount: sorted.length,
      firstQuoteAt: sorted[sorted.length - 1].created_at, latestQuoteAt: latest.created_at,
      latestService: latest.requested_service ?? latest.glass_area, latestStatus: latest.status,
      serviceLocation: sorted.find((r) => r.service_city)?.service_city ?? null,
      serviceProvince: sorted.find((r) => r.service_province)?.service_province ?? null,
      phoneRegion: classifyPhone(sorted.find((r) => normalizePhone(r.customer_phone))?.customer_phone ?? sorted[0].customer_phone).code,
      ambiguous: ambiguousKeys.has(key), quoteIds: sorted.map((r) => r.id),
      segment: customerSegment(sorted.map((r) => ({ status: r.status, conversion_status: r.conversion_status ?? "pending" }))),
      convertedQuotes: sorted.filter((r) => r.conversion_status === "converted").length,
      notConvertedQuotes: sorted.filter((r) => r.conversion_status === "not_converted").length,
      pendingQuotes: sorted.filter((r) => (r.conversion_status ?? "pending") === "pending").length,
    };
  }).sort((a, b) => b.latestQuoteAt.localeCompare(a.latestQuoteAt));
}

export interface CustomerFilters { search?: string; month?: string; service?: string; status?: string; regions?: string[]; segment?: string }
export function filterCustomers(list: CustomerProfile[], rows: CustomerQuoteRow[], f: CustomerFilters) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const q = (f.search ?? "").trim().toLowerCase(), qd = q.replace(/\D/g, "");
  return list.filter((c) => {
    if (q && !(c.name.toLowerCase().includes(q) || c.emails.some((e) => e.includes(q)) ||
      (qd.length >= 3 && c.phones.some((p) => p.replace(/\D/g, "").includes(qd))))) return false;
    if (f.status && f.status !== "all" && c.latestStatus !== f.status) return false;
    if (f.segment && f.segment !== "all" && c.segment !== f.segment) return false;
    if (f.regions?.length && !f.regions.includes(c.phoneRegion)) return false;
    const quotes = c.quoteIds.map((id) => byId.get(id)!);
    if (f.month && f.month !== "all" && !quotes.some((r) => r.created_at.slice(0, 7) === f.month)) return false;
    if (f.service && f.service !== "all" && !quotes.some((r) => (r.requested_service ?? r.glass_area) === f.service)) return false;
    return true;
  });
}
export function encodeCustomerKey(key: string) { return btoa(key).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_"); }
export function decodeCustomerKey(id: string) { const s = id.replace(/-/g, "+").replace(/_/g, "/"); return atob(s + "=".repeat((4 - (s.length % 4)) % 4)); }
