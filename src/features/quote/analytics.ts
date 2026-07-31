import type { QuoteAnswers, StepId } from "./types";

/**
 * Thin analytics wrapper. Phase 1 queues events and mirrors them to the
 * console in dev; GA4 / Meta Pixel / Google Ads pick them up automatically
 * once their scripts are present on the page.
 */

type Payload = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Payload[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export const quoteEventQueue: { name: string; payload: Payload; at: number }[] = [];

function push(name: string, payload: Payload) {
  const event = { name, payload, at: Date.now() };
  quoteEventQueue.push(event);
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: name, ...payload });
  window.gtag?.("event", name, payload);
  if (name === "quote_submit") window.fbq?.("track", "Lead", payload);
  if (import.meta.env.DEV) console.info(`[analytics] ${name}`, payload);
}

const pathOf = (a: QuoteAnswers) => `${a.glassArea ?? "unknown"}:${a.service ?? "implicit"}`;

export const analytics = {
  start: () => push("quote_start", {}),
  stepView: (stepId: StepId, a: QuoteAnswers, progress: number) =>
    push("quote_step_view", { step_id: stepId, path: pathOf(a), progress }),
  stepComplete: (stepId: StepId, a: QuoteAnswers, progress: number) =>
    push("quote_step_complete", { step_id: stepId, path: pathOf(a), progress }),
  branchSelected: (key: string, value: string) =>
    push("quote_branch_selected", { question: key, value }),
  notSure: (key: string, stepId: StepId) =>
    push("quote_not_sure_selected", { question: key, step_id: stepId }),
  photoUploaded: (count: number) => push("quote_photo_uploaded", { count }),
  abandon: (stepId: StepId, progress: number) =>
    push("quote_abandon", { step_id: stepId, progress }),
  submit: (a: QuoteAnswers, reference: string) =>
    push("quote_submit", {
      reference,
      path: pathOf(a),
      payment: a.paymentPath,
      city: a.city,
      location_type: a.locationType,
    }),
  generateLead: (reference: string) =>
    push("generate_lead", { reference, currency: "CAD", value: 1 }),
};
