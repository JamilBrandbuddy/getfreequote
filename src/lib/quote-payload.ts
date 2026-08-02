/**
 * Shared (client-safe) contract for a quote submission.
 * The browser builds this payload; the server re-validates all of it.
 */
import type { QuoteAnswers } from "@/features/quote/types";

export interface QuoteSubmissionMeta {
  /** Honeypot field — must stay empty. */
  company?: string;
  /** ms since the wizard was first rendered — human submissions take time. */
  elapsedMs: number;
  landingPage?: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
}

export interface QuoteSubmissionPayload {
  answers: Omit<QuoteAnswers, "photos">;
  meta: QuoteSubmissionMeta;
}

export interface QuoteSubmissionResult {
  ok: true;
  reference: string;
  customerEmailSent: boolean;
}

export interface QuoteSubmissionError {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
}

export const MAX_UPLOAD_FILES = 6;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

/** Minimum time a genuine multi-step submission takes. */
export const MIN_SUBMISSION_MS = 5_000;

export function readUtmFromLocation(search: string) {
  const p = new URLSearchParams(search);
  const pick = (k: string) => p.get(k) ?? undefined;
  return {
    source: pick("utm_source"),
    medium: pick("utm_medium"),
    campaign: pick("utm_campaign"),
    content: pick("utm_content"),
    term: pick("utm_term"),
  };
}
