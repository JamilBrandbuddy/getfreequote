import { describe, expect, it } from "vitest";
import { groupCustomers, filterCustomers, normalizePhone, decodeCustomerKey, encodeCustomerKey, type CustomerQuoteRow } from "./customer-directory";
const row = (id: string, phone: string, email: string | null, at: string, extra: Partial<CustomerQuoteRow> = {}): CustomerQuoteRow => ({
  id, public_reference: id, created_at: at, status: "new", requested_service: "replacement", glass_area: "windshield",
  customer_name: "Pat", customer_phone: phone, customer_email: email, vehicle_year: null, vehicle_make: null, vehicle_model: null, service_city: null, ...extra });
describe("customer directory", () => {
  it("normalizes Canadian phone formats", () => {
    expect(normalizePhone("+1 (306) 555-1234")).toBe("3065551234");
    expect(normalizePhone("306.555.1234")).toBe("3065551234");
    expect(normalizePhone("555")).toBeNull();
  });
  it("groups same phone in different formats into one customer with 2 quotes", () => {
    const g = groupCustomers([row("a", "306-555-1234", null, "2026-01-01"), row("b", "+13065551234", null, "2026-02-01")]);
    expect(g).toHaveLength(1); expect(g[0].quoteCount).toBe(2); expect(g[0].latestQuoteAt).toBe("2026-02-01");
  });
  it("joins email-only quote to the single phone identity using that email", () => {
    const g = groupCustomers([row("a", "3065551234", "pat@x.ca", "2026-01-01"), row("b", "", "PAT@x.ca", "2026-02-01")]);
    expect(g).toHaveLength(1);
  });
  it("does not merge when one email maps to two different phones and flags it", () => {
    const g = groupCustomers([row("a", "3065551234", "pat@x.ca", "2026-01-01"), row("b", "3065559999", "pat@x.ca", "2026-02-01")]);
    expect(g).toHaveLength(2); expect(g.every((c) => c.ambiguous)).toBe(true);
  });
  it("combines search and status filters", () => {
    const rows = [row("a", "3065551234", null, "2026-01-01", { customer_name: "Ann" }), row("b", "3065559999", null, "2026-02-01", { customer_name: "Ann", status: "booked" })];
    expect(filterCustomers(groupCustomers(rows), rows, { search: "ann", status: "booked" }).map((c) => c.quoteIds[0])).toEqual(["b"]);
  });
  it("round-trips customer keys", () => { expect(decodeCustomerKey(encodeCustomerKey("e:a+b@x.ca"))).toBe("e:a+b@x.ca"); });
});
