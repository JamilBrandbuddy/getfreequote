import { createFileRoute } from "@tanstack/react-router";

import type { NotificationQuote } from "@/lib/quote-notify.server";

import {
  ACCEPTED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
  MIN_SUBMISSION_MS,
  type QuoteSubmissionPayload,
} from "@/lib/quote-payload";

const RATE_LIMIT_PER_HOUR = 6;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/quote-submissions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ supabaseAdmin }, intake, notify] = await Promise.all([
          import("@/integrations/supabase/client.server"),
          import("@/lib/quote-intake.server"),
          import("@/lib/quote-notify.server"),
        ]);

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return json({ ok: false, error: "Malformed submission." }, 400);
        }

        let payload: QuoteSubmissionPayload;
        try {
          payload = JSON.parse(String(form.get("payload") ?? "")) as QuoteSubmissionPayload;
        } catch {
          return json({ ok: false, error: "Malformed submission." }, 400);
        }
        if (!payload || typeof payload !== "object" || typeof payload.answers !== "object") {
          return json({ ok: false, error: "Malformed submission." }, 400);
        }

        const meta = payload.meta ?? { elapsedMs: 0 };

        // Honeypot + timing checks.
        if (typeof meta.company === "string" && meta.company.trim() !== "") {
          return json({ ok: false, error: "Submission rejected." }, 400);
        }
        if (!Number.isFinite(meta.elapsedMs) || meta.elapsedMs < MIN_SUBMISSION_MS) {
          return json({ ok: false, error: "Submission rejected." }, 400);
        }

        // Rate limiting on a salted hash of the caller IP (raw IPs are never stored).
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;
        const salt = process.env["QUOTE_IP_SALT"] ?? process.env["SUPABASE_PROJECT_ID"] ?? "riverbend";
        const ipHash = await intake.hashIp(ip, salt);

        if (ipHash) {
          const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { count } = await supabaseAdmin
            .from("quote_submission_log")
            .select("id", { count: "exact", head: true })
            .eq("ip_hash", ipHash)
            .gte("created_at", since);
          if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
            return json(
              { ok: false, error: "Too many requests from this device. Please call us instead." },
              429,
            );
          }
        }

        // Server-side re-validation of every conditional rule.
        const check = intake.revalidateAnswers(payload.answers);
        if (!check.ok) {
          return json(
            { ok: false, error: "Some answers need attention.", fieldErrors: check.fieldErrors },
            422,
          );
        }
        const answers = check.answers;

        // File validation.
        const files = form.getAll("files").filter((f): f is File => f instanceof File);
        if (files.length > MAX_UPLOAD_FILES) {
          return json({ ok: false, error: "Too many files attached." }, 400);
        }
        for (const file of files) {
          if (!ACCEPTED_UPLOAD_TYPES.includes(file.type)) {
            return json({ ok: false, error: `Unsupported file type: ${file.name}` }, 400);
          }
          if (file.size > MAX_UPLOAD_BYTES || file.size === 0) {
            return json({ ok: false, error: `File too large: ${file.name}` }, 400);
          }
        }

        // Insert the quote (unique reference, retried on collision).
        const row = intake.toQuoteRow(answers, {
          publicReference: intake.makeReference(),
          priority: intake.computePriority(answers),
          adas: intake.requiresAdasReview(answers),
          utm: (meta.utm ?? {}) as Record<string, string | undefined>,
          landingPage: meta.landingPage ?? null,
          referrer: meta.referrer ?? null,
          ipHash,
          userAgent: request.headers.get("user-agent"),
        });

        let quote: Record<string, unknown> | null = null;
        for (let attempt = 0; attempt < 4 && !quote; attempt++) {
          const candidate = attempt === 0 ? row : { ...row, public_reference: intake.makeReference() };
          const { data, error } = await supabaseAdmin
            .from("quotes")
            .insert(candidate)
            .select("*")
            .single();
          if (!error) {
            quote = data as unknown as Record<string, unknown>;
            break;
          }
          if (error.code !== "23505") {
            console.error("[quote-submissions] insert failed", error);
            return json({ ok: false, error: "We couldn't save your request." }, 500);
          }
        }
        if (!quote) return json({ ok: false, error: "We couldn't save your request." }, 500);

        const quoteId = String(quote["id"]);
        const reference = String(quote["public_reference"]);

        if (ipHash) {
          await supabaseAdmin.from("quote_submission_log").insert({ ip_hash: ipHash });
        }

        // Store approved uploads in the private bucket under randomised paths.
        for (const file of files) {
          try {
            const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
            const path = `quotes/${quoteId}/${crypto.randomUUID()}.${ext || "bin"}`;
            const { error: uploadError } = await supabaseAdmin.storage
              .from("quote-files")
              .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
            if (uploadError) throw uploadError;
            await supabaseAdmin.from("quote_files").insert({
              quote_id: quoteId,
              storage_path: path,
              original_filename: file.name.slice(0, 200),
              mime_type: file.type,
              file_size: file.size,
              file_category: file.type === "application/pdf" ? "document" : "damage-photo",
            });
          } catch (error) {
            console.error("[quote-submissions] file upload failed", error);
          }
        }

        await supabaseAdmin.from("quote_status_history").insert({
          quote_id: quoteId,
          new_status: "new",
          note: "Quote request submitted online.",
        });

        // Notifications never block the saved quote.
        const origin = new URL(request.url).origin;
        const adminUrl = `${origin}/admin/quotes/${quoteId}`;
        const notification = quote as unknown as NotificationQuote;
        let customerEmailSent = false;
        try {
          const [, customer] = await Promise.all([
            notify.sendAdminNotification(notification, adminUrl),
            notify.sendCustomerConfirmation(notification),
          ]);
          customerEmailSent = customer;
          await notify.sendQuoteWebhook(notification, adminUrl);
        } catch (error) {
          console.error("[quote-submissions] notification failure (quote is saved)", error);
        }

        return json({ ok: true, reference, customerEmailSent });
      },
    },
  },
});
