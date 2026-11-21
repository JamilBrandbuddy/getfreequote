import { describe, it, expect } from "vitest";
import { renderSignature } from "./email-campaign";
import { sanitizeSignatureHtml } from "./email-sanitize";

describe("full HTML signature", () => {
  it("shows only the pasted signature, without name or logo", () => {
    const html = renderSignature({ sender_name: "Jamil", custom_html: '<table><tr><td>SIG</td></tr></table>', show_logo: true });
    expect(html).toContain("SIG");
    expect(html).not.toContain("Jamil");
    expect(html).not.toContain("<img");
  });
  it("keeps table layout but strips scripts", () => {
    const out = sanitizeSignatureHtml('<table width="640"><tr><td bgcolor="#061c35">x</td></tr></table><script>alert(1)</script>');
    expect(out).toContain('bgcolor="#061c35"');
    expect(out).not.toContain("script");
  });
});
