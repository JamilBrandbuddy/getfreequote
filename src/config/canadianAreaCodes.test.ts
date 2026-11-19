import { describe, it, expect } from "vitest";
import { classifyPhone, CANADIAN_AREA_CODES } from "./canadianAreaCodes";
import { groupCustomers, filterCustomers } from "@/lib/customer-directory";
import { reportingFiltersSchema } from "@/lib/quote-reporting";

const c = (p: string) => classifyPhone(p).code;
describe("Phase 5 phone area region", () => {
  it("Saskatchewan 306, 639, 474", () => { expect([c("306-555-1234"), c("(639) 555-1234"), c("474 555 1234")]).toEqual(["SK", "SK", "SK"]); });
  it("Alberta 403, 587, 780, 825, 368", () => { expect(["403", "587", "780", "825", "368"].map((a) => c(`${a}5551234`))).toEqual(Array(5).fill("AB")); });
  it("Manitoba 204, 431, 584", () => { expect(["204", "431", "584"].map((a) => c(`${a}5551234`))).toEqual(["MB", "MB", "MB"]); });
  it("other provinces", () => {
    expect([c("604 555 1234"), c("416 555 1234"), c("514 555 1234"), c("506 555 1234"), c("709 555 1234")]).toEqual(["BC", "ON", "QC", "NB", "NL"]);
  });
  it("shared codes stay shared", () => { expect([c("902 555 1234"), c("782 555 1234"), c("867 555 1234")]).toEqual(["NS-PE", "NS-PE", "TERR"]); });
  it("country code and formatting variations", () => {
    expect([c("+1 306 555 1234"), c("1-306-555-1234"), c("+1(306)555-1234"), c("011 1 306 555 1234"), c("306.555.1234 ext 22")]).toEqual(Array(5).fill("SK"));
  });
  it("US, toll-free, international, invalid, empty", () => {
    expect(c("212 555 1234")).toBe("OTHER_NANP"); expect(c("1 800 555 1234")).toBe("TOLL_FREE");
    expect(c("+44 20 7946 0958")).toBe("INTERNATIONAL"); expect(c("12345")).toBe("INVALID");
    expect(c("306 155 1234")).toBe("INVALID"); expect(c("")).toBe("NONE"); expect(c("600 555 1234")).toBe("CA_NON_GEO");
  });
  it("no area code is mapped twice", () => { const all = Object.values(CANADIAN_AREA_CODES).flat(); expect(new Set(all).size).toBe(all.length); });
  it("does not change the original phone value and filters customers by region", () => {
    const base = { status: "new", requested_service: "repair", glass_area: null, customer_email: null, vehicle_year: null, vehicle_make: null, vehicle_model: null, service_city: null };
    const rows = [{ ...base, id: "a", public_reference: "R1", created_at: "2026-01-01", customer_name: "A", customer_phone: "+1 (306) 555-1234" },
      { ...base, id: "b", public_reference: "R2", created_at: "2026-01-02", customer_name: "B", customer_phone: "403-555-1234" }];
    const list = groupCustomers(rows);
    expect(rows[0].customer_phone).toBe("+1 (306) 555-1234");
    expect(filterCustomers(list, rows, { regions: ["SK"] }).map((x) => x.name)).toEqual(["A"]);
    expect(filterCustomers(list, rows, { regions: ["SK", "AB"] })).toHaveLength(2);
  });
  it("report filters accept known regions only", () => {
    expect(reportingFiltersSchema.parse({ regions: ["SK", "NS-PE"] }).regions).toEqual(["SK", "NS-PE"]);
    expect(reportingFiltersSchema.safeParse({ regions: ["XX"] }).success).toBe(false);
  });
});
