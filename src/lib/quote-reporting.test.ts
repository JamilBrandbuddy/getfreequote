import { describe, it, expect } from "vitest";
import { reportingFiltersSchema, csvLine, safeSpreadsheetText, exportValues } from "./quote-reporting";
import { buildQuoteExport } from "./quote-export.server";
import * as XLSX from "xlsx";

describe("Phase 3 reporting rules", () => {
  it("accepts a single month", () => { expect(reportingFiltersSchema.parse({ months: ["2026-08"] }).months).toEqual(["2026-08"]); });
  it("accepts nonconsecutive and cross-year months", () => { expect(reportingFiltersSchema.parse({ months: ["2025-01", "2026-10"] }).months).toEqual(["2025-01", "2026-10"]); });
  it("all months has no month restriction", () => { expect(reportingFiltersSchema.parse({}).months).toEqual([]); });
  it("accepts a custom range and rejects reversed/invalid dates", () => {
    expect(reportingFiltersSchema.parse({ startDate: "2026-08-01", endDate: "2026-10-31" }).endDate).toBe("2026-10-31");
    expect(reportingFiltersSchema.safeParse({ startDate: "2026-10-31", endDate: "2026-08-01" }).success).toBe(false);
    expect(reportingFiltersSchema.safeParse({ startDate: "2026-02-30" }).success).toBe(false);
  });
  it("neutralizes CSV and Excel formula injection", () => {
    for (const s of ["=1+1", "+cmd", "-1", "@SUM(1)", " \t=1", "\tbad"]) expect(safeSpreadsheetText(s).startsWith("'")).toBe(true);
    expect(csvLine(['a,"b', "=1+1"])).toBe('"a,""b","\'=1+1"\r\n');
  });
  it("uses Saskatchewan dates and excludes secret fields", () => {
    const v = exportValues({ created_at: "2026-09-01T05:59:59Z", storage_path: "private", internal_notes: "secret" });
    expect(v[1]).toBe("2026-08-31 23:59:59"); expect(v).not.toContain("private"); expect(v).not.toContain("secret");
  });
  it("genuine XLSX contains strings and spans multiple server pages", async () => {
    const offsets: number[] = [];
    const r = await buildQuoteExport("xlsx", async (offset) => { offsets.push(offset); return { total: 501, rows: Array.from({ length: offset === 0 ? 500 : 1 }, () => ({ value: "=1+1" })) }; }, ["Value"], csvLine, (row) => [safeSpreadsheetText(row.value)]);
    expect(offsets).toEqual([0, 500]); expect(r.count).toBe(501);
    const workbook = XLSX.read(Buffer.from(r.base64, "base64"), { type: "buffer" });
    const sheet = workbook.Sheets["Quote requests"];
    expect(sheet?.["!ref"]).toBe("A1:A502");
    expect(sheet?.["A2"].v).toBe("'=1+1");
    expect(sheet?.["A2"].f).toBeUndefined();
  });
  it("empty CSV remains valid", async () => {
    const r = await buildQuoteExport("csv", async () => ({ rows: [], total: 0 }), ["Reference"], csvLine, () => []);
    expect(r.count).toBe(0); expect(Buffer.from(r.base64, "base64").toString()).toBe('\ufeff"Reference"\r\n');
  });
});