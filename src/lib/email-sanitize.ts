import sanitizeHtml from "sanitize-html";
const STYLE = { "*": { color: [/^#[0-9a-f]{3,6}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/], "text-align": [/^(left|right|center|justify)$/], "font-weight": [/^(bold|normal|\d{3})$/], "font-style": [/^(italic|normal)$/], "text-decoration": [/^(underline|none)$/], "background": [/^#[0-9a-f]{3,6}$/i], "background-color": [/^#[0-9a-f]{3,6}$/i], "padding": [/^[\d\spx]+$/], "border-radius": [/^\d+px$/], "display": [/^(inline-block|block)$/], "width": [/^\d+(px|%)$/], "max-width": [/^\d+(px|%)$/], "height": [/^auto$/], "margin": [/^[\d\spxauto]+$/] } };
/** Allowlist sanitizer for campaign bodies: no scripts, only https images, https/mailto/tel links. */
export function sanitizeEmailHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["h1", "h2", "h3", "p", "br", "hr", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "img", "div", "span", "blockquote"],
    allowedAttributes: { a: ["href", "style", "target"], img: ["src", "alt", "width", "style"], "*": ["style", "align"] },
    allowedStyles: STYLE,
    allowedSchemes: ["https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank" }) },
  });
}

/** Signature HTML: allows email table layouts and inline styles (no scripts, https images, https/mailto/tel links only). */
export function sanitizeSignatureHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["table", "tbody", "thead", "tr", "td", "th", "h1", "h2", "h3", "p", "br", "hr", "strong", "b", "em", "i", "u", "a", "img", "div", "span"],
    allowedAttributes: {
      a: ["href", "style", "target"], img: ["src", "alt", "width", "height", "border", "style"],
      table: ["role", "border", "cellpadding", "cellspacing", "width", "style", "align"],
      td: ["width", "height", "valign", "align", "colspan", "rowspan", "bgcolor", "style"], th: ["width", "height", "valign", "align", "colspan", "style"],
      "*": ["style", "align"],
    },
    allowedSchemes: ["https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank" }) },
  });
}
