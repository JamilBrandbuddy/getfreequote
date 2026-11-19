import { describe, expect, it } from "vitest";
import { conversionRate, customerSegment, suggestedConversion } from "./conversion";

describe("conversion rules", () => {
  it("rate excludes spam: 1 converted of 2 valid = 50%", () => {
    expect(conversionRate([
      { status: "completed", conversion_status: "converted" },
      { status: "new", conversion_status: "pending" },
      { status: "spam", conversion_status: "pending" },
    ])).toBe(50);
  });
  it("rate is null when only spam", () => {
    expect(conversionRate([{ status: "spam", conversion_status: "pending" }])).toBeNull();
  });
  it("completed status only suggests, never confirms", () => {
    expect(suggestedConversion("completed", "pending")).toBe("converted");
    expect(suggestedConversion("completed", "not_converted")).toBeNull();
  });
  it("customer with several quotes counts once, converted wins", () => {
    expect(customerSegment([
      { status: "lost", conversion_status: "not_converted" },
      { status: "completed", conversion_status: "converted" },
      { status: "new", conversion_status: "pending" },
    ])).toBe("converted");
  });
  it("customer stays pending while any quote is pending", () => {
    expect(customerSegment([
      { status: "lost", conversion_status: "not_converted" },
      { status: "new", conversion_status: "pending" },
    ])).toBe("pending");
    expect(customerSegment([{ status: "lost", conversion_status: "not_converted" }])).toBe("not_converted");
  });
});
