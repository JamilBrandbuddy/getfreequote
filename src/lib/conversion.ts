// Conversion outcome is a manual, audited business confirmation and is kept
// separate from the operational quote status. Status only *suggests* outcomes.
export const CONVERSION_STATUSES = ["pending", "converted", "not_converted"] as const;
export type ConversionStatus = (typeof CONVERSION_STATUSES)[number];
export const CONVERSION_LABELS: Record<ConversionStatus, string> = {
  pending: "Pending", converted: "Converted", not_converted: "Not Converted",
};
export function conversionLabel(s?: string | null) { return CONVERSION_LABELS[(s ?? "pending") as ConversionStatus] ?? "Pending"; }

/** Unconfirmed hint from the quote status. Never counted as a confirmed outcome. */
export function suggestedConversion(status: string, conversion: string): ConversionStatus | null {
  if (conversion !== "pending") return null;
  if (status === "completed") return "converted";
  if (status === "lost") return "not_converted";
  return null;
}

/** Converted ÷ valid quotes, where spam quotes are excluded. Returns a percentage with one decimal. */
export function conversionRate(rows: { status: string; conversion_status: string }[]): number | null {
  const valid = rows.filter((r) => r.status !== "spam");
  if (!valid.length) return null;
  return Math.round((valid.filter((r) => r.conversion_status === "converted").length * 1000) / valid.length) / 10;
}

export type CustomerSegment = "converted" | "not_converted" | "pending";
export const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  converted: "Verified Converted Customers", not_converted: "Not Converted Customers", pending: "Pending Customers",
};
/**
 * One segment per unique customer: any confirmed converted quote makes the
 * customer Converted; otherwise any pending (non-spam) quote keeps them Pending;
 * otherwise, with at least one Not Converted quote, they are Not Converted.
 * Segments are recipient filters only and never imply marketing permission.
 */
export function customerSegment(quotes: { status: string; conversion_status: string }[]): CustomerSegment {
  const valid = quotes.filter((q) => q.status !== "spam");
  if (valid.some((q) => q.conversion_status === "converted")) return "converted";
  if (valid.some((q) => q.conversion_status === "not_converted") && !valid.some((q) => q.conversion_status === "pending")) return "not_converted";
  return "pending";
}
