import { describe, it, expect } from "vitest";
import { eligibility, dedupeCandidates, personalize, renderEmail, type Candidate } from "./email-campaign";

const base: Candidate = { email: "a@x.ca", name: "Ann Lee", service: "windshield", segment: "pending", convertedAt: null, quoteConsent: null };
const now = Date.parse("2026-11-19T00:00:00Z");

describe("campaign eligibility (CASL)", () => {
  it("quote submission alone never counts as consent for promotions", () => {
    expect(eligibility(base, "promotional", [], new Set(), now)).toEqual({ eligible: false, reason: "no_consent" });
  });
  it("suppressed contacts are always excluded, even with consent", () => {
    expect(eligibility({ ...base, quoteConsent: { at: "2026-01-01" } }, "promotional", [], new Set(["a@x.ca"]), now).eligible).toBe(false);
  });
  it("quote-form opt-in allows promotions", () => {
    expect(eligibility({ ...base, quoteConsent: { at: "2026-01-01" } }, "promotional", [], new Set(), now).eligible).toBe(true);
  });
  it("verified purchase allows review requests only within 2 years", () => {
    const c = { ...base, segment: "converted", convertedAt: "2026-06-01T00:00:00Z" };
    expect(eligibility(c, "review_request", [], new Set(), now).eligible).toBe(true);
    expect(eligibility(c, "promotional", [], new Set(), now).eligible).toBe(false);
    expect(eligibility({ ...c, convertedAt: "2024-06-01T00:00:00Z" }, "review_request", [], new Set(), now).eligible).toBe(false);
  });
  it("expired consent records are ignored", () => {
    const r = [{ email: "a@x.ca", consent_type: "express" as const, source: "x", consented_at: "2025-01-01", expires_at: "2026-01-01" }];
    expect(eligibility(base, "promotional", r, new Set(), now).eligible).toBe(false);
  });
});

describe("recipients and personalization", () => {
  it("dedupes by normalized email", () => {
    expect(dedupeCandidates([base, { ...base, email: " A@X.CA " }, { ...base, email: "bad" }])).toHaveLength(1);
  });
  it("falls back when name is missing and escapes values", () => {
    expect(personalize("Hi {{customer_name}}", { customer_name: null })).toBe("Hi there");
    expect(personalize("Hi {{customer_name}}", { customer_name: "<b>Bo</b>" })).toBe("Hi &lt;b&gt;Bo&lt;/b&gt;");
    expect(personalize("{{service_type}} {{unknown}}", {})).toBe("auto glass service ");
  });
  it("always includes unsubscribe link and sender identification", () => {
    const html = renderEmail({ subject: "s", previewText: "p", bodyHtml: "<p>x</p>", signatureHtml: null, senderName: "Riverbend Autoglass Inc.", mailingAddress: "1 Main St", unsubscribeUrl: "https://q/u/t", vars: {} });
    expect(html).toContain("https://q/u/t"); expect(html).toContain("Riverbend Autoglass Inc., 1 Main St");
  });
});
