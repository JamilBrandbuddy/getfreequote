import { z } from "zod";
import { conversionLabel } from "./conversion";
import { REGION_CODES, REGION_LABELS } from "@/config/canadianAreaCodes";

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}, "Invalid date");
export const reportingFiltersSchema = z.object({
  search: z.string().max(200).optional(), status: z.string().optional(),
  priority: z.string().optional(), conversion: z.enum(["all", "pending", "converted", "not_converted"]).optional(), insurance: z.string().optional(), service: z.string().optional(),
  months: z.array(month).max(1200).default([]),
  regions: z.array(z.string().refine((r) => REGION_CODES.includes(r), "Unknown region")).max(REGION_CODES.length).default([]),
  startDate: day.optional(), endDate: day.optional(),
  sort: z.enum(["newest", "oldest", "priority"]).default("newest"),
  page: z.number().int().min(0).default(0),
}).refine((f) => !f.startDate || !f.endDate || f.startDate <= f.endDate, "Start date must precede end date");
export type ReportingFilters = z.input<typeof reportingFiltersSchema>;
export const REPORTING_TIMEZONE = "America/Regina";
export const EXPORT_HEADERS = ["Quote reference", "Submission date (America/Regina)", "Customer name", "Phone", "Email", "Requested service", "Vehicle year", "Vehicle make", "Vehicle model", "Quote status", "Conversion status", "Service location", "Service province (customer-entered)", "Phone area code region", "Insurance method", "Insurance provider", "UTM source", "UTM medium", "UTM campaign", "UTM content", "UTM term", "Landing page", "Referrer"];
export function safeSpreadsheetText(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
}
export function csvLine(values: unknown[]): string {
  return values.map((v) => `"${safeSpreadsheetText(v).replace(/"/g, '""')}"`).join(",") + "\r\n";
}
export function exportValues(row: Record<string, unknown>): string[] {
  const address = row.service_address as { city?: string; address?: string; province?: string } | null;
  const insurance = row.insurance_details as { provider?: string } | null;
  return [row.public_reference, new Intl.DateTimeFormat("sv-SE", { timeZone: REPORTING_TIMEZONE, dateStyle: "short", timeStyle: "medium" }).format(new Date(String(row.created_at))), row.customer_name, row.customer_phone, row.customer_email, row.requested_service, row.vehicle_year, row.vehicle_make, row.vehicle_model, row.status, conversionLabel(row.conversion_status as string), [row.service_location_type, address?.address, address?.city, address?.province].filter(Boolean).join(", "), address?.province || "Not provided", REGION_LABELS[String(row.phone_region)] ?? "Unknown", row.insurance_method, insurance?.provider, row.utm_source, row.utm_medium, row.utm_campaign, row.utm_content, row.utm_term, row.landing_page, row.referrer].map(safeSpreadsheetText);
}
export interface QuoteAnalytics {
  total: number; uniqueCustomers: number; newCount: number; urgent: number; lastSevenDays: number;
  availableMonths: string[]; services: string[];
  statuses: { label: string; count: number }[]; serviceBreakdown: { label: string; count: number }[];
  regionBreakdown: { label: string; count: number; customers: number }[];
  trend: { month: string; count: number; previous: number; change: number | null; valid?: number; converted?: number; conversionRate?: number | null }[];
  conversion?: { valid: number; excludedSpam: number; pending: number; converted: number; notConverted: number; suggestedConverted: number; suggestedNotConverted: number; rate: number | null };
}