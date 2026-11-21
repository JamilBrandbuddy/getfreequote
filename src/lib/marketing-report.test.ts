import { describe, it, expect } from "vitest";
import { sumRows, googleDerived, breakdownIssue, quoteConversionRate, formatMetric, momChange, normalizeReportData, filledColumns, META_CAMPAIGN_METRICS, type CampaignRow } from "./marketing-report";

const row = (values: CampaignRow["values"]): CampaignRow => ({ id: "x", name: "c", sub: "", kind: "", notes: "", values });

describe("marketing report", () => {
  it("sums campaign totals across multiple rows, ignoring missing and N/A", () => {
    expect(sumRows([row({ spend: 100.5 }), row({ spend: 49.5 }), row({ spend: "na" }), row({})], "spend")).toBe(150);
  });
  it("returns null total when no campaign has a number", () => {
    expect(sumRows([row({ spend: "na" }), row({})], "spend")).toBeNull();
  });
  it("calculates Google CTR, CPC and cost per conversion", () => {
    expect(googleDerived({ impressions: 1000, clicks: 50, spend: 200, conversions: 4 })).toEqual({ ctr: 5, cpc: 4, costPerConversion: 50 });
    expect(googleDerived({ impressions: 1000, clicks: 0, spend: 200 }).cpc).toBeNull();
  });
  it("flags a conversion breakdown larger than the total", () => {
    expect(breakdownIssue(row({ conversions: 5, phoneConv: 3, formConv: 3 }))).not.toBeNull();
    expect(breakdownIssue(row({ conversions: 6, phoneConv: 3, formConv: 3 }))).toBeNull();
  });
  it("conversion rate excludes spam quotes", () => {
    expect(quoteConversionRate({ submissions: 12, spam: 2, uniqueCustomers: 9, converted: 3, notConverted: 1, pending: 6 })).toBe(30);
    expect(quoteConversionRate({ submissions: 0, spam: 0, uniqueCustomers: 0, converted: 0, notConverted: 0, pending: 0 })).toBeNull();
  });
  it("keeps missing, not available and zero distinguishable", () => {
    expect(formatMetric(null, "count")).toBe("Not entered");
    expect(formatMetric("na", "count")).toBe("Not available");
    expect(formatMetric(0, "count")).toBe("0");
  });
  it("month-over-month change is not computed from a zero or missing month", () => {
    expect(momChange(150, 100)).toBe(50);
    expect(momChange(5, 0)).toBeNull();
    expect(momChange(5, null)).toBeNull();
  });
  it("hides campaign columns with no entered numbers", () => {
    const keys = filledColumns([row({ spend: 10, clicks: "na" }), row({ costPerResult: 0.8 })], META_CAMPAIGN_METRICS).map(m => m.key);
    expect(keys).toEqual(["spend", "costPerResult"]);
  });
  it("Meta campaigns include Cost per result", () => {
    expect(META_CAMPAIGN_METRICS.some(m => m.key === "costPerResult" && m.unit === "money")).toBe(true);
  });
  it("normalizes unknown data safely", () => {
    expect(normalizeReportData(null).metaCampaigns).toEqual([]);
  });
});
