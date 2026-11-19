// Server-only: marketing email provider (kept separate from transactional app emails).
export function marketingProviderStatus() {
  const key = process.env["MARKETING_RESEND_API_KEY"] || process.env["RESEND_API_KEY"];
  return { configured: !!key, provider: "Resend" as const };
}
export type ProviderResult = { ok: true; id: string } | { ok: false; retryable: boolean; error: string };
export async function sendMarketingEmail(msg: { from: string; to: string; replyTo?: string | null; subject: string; html: string; unsubscribeUrl: string; idempotencyKey: string }): Promise<ProviderResult> {
  const key = process.env["MARKETING_RESEND_API_KEY"] || process.env["RESEND_API_KEY"];
  if (!key) return { ok: false, retryable: false, error: "Marketing email provider is not configured." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": msg.idempotencyKey },
      body: JSON.stringify({ from: msg.from, to: [msg.to], subject: msg.subject, html: msg.html, ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
        headers: { "List-Unsubscribe": `<${msg.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (res.ok && body.id) return { ok: true, id: body.id };
    return { ok: false, retryable: res.status === 429 || res.status >= 500, error: `Provider error ${res.status}: ${(body.message ?? "").slice(0, 200)}` };
  } catch (e) {
    return { ok: false, retryable: true, error: `Network error: ${String(e).slice(0, 200)}` };
  }
}
