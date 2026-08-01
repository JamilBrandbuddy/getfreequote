import type { QuoteAnswers, StepId, UtmParams } from "@/types/quote";

/**
 * Analytics wrapper. Events are mirrored to the dataLayer / gtag / fbq when
 * those scripts exist, and to the console in development. Never include
 * personally identifying information in a payload.
 */

type Payload = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Payload[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export const quoteEventLog: { name: string; payload: Payload; at: number }[] = [];

function deviceType() {
  if (typeof window === "undefined") return "server";
  const w = window.innerWidth;
  return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

export interface AnalyticsContext {
  stepId: StepId;
  answers: QuoteAnswers;
  utm: UtmParams;
}

function basePayload(ctx: AnalyticsContext): Payload {
  return {
    step: ctx.stepId,
    glass_area: ctx.answers.glassArea ?? null,
    service: ctx.answers.service ?? null,
    insurance: ctx.answers.paymentPath ?? null,
    utm_source: ctx.utm.source ?? null,
    utm_medium: ctx.utm.medium ?? null,
    utm_campaign: ctx.utm.campaign ?? null,
    device_type: deviceType(),
  };
}

function track(name: string, payload: Payload) {
  const event = { name, payload, at: Date.now() };
  quoteEventLog.push(event);
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: name, ...payload });
  window.gtag?.("event", name, payload);
  if (name === "quote_submitted") window.fbq?.("track", "Lead", payload);
  if (import.meta.env.DEV) console.info(`[quote] ${name}`, payload);
}

export const quoteAnalytics = {
  quoteStarted: (ctx: AnalyticsContext) => track("quote_started", basePayload(ctx)),
  quoteStepViewed: (ctx: AnalyticsContext, progress: number) =>
    track("quote_step_viewed", { ...basePayload(ctx), progress }),
  glassAreaSelected: (ctx: AnalyticsContext, area: string) =>
    track("glass_area_selected", { ...basePayload(ctx), selected_area: area }),
  serviceSelected: (ctx: AnalyticsContext, service: string) =>
    track("service_selected", { ...basePayload(ctx), selected_service: service }),
  insuranceSelected: (ctx: AnalyticsContext, path: string) =>
    track("insurance_selected", { ...basePayload(ctx), selected_path: path }),
  vehicleCompleted: (ctx: AnalyticsContext) =>
    track("vehicle_completed", {
      ...basePayload(ctx),
      vehicle_year: ctx.answers.vehicleYear ?? null,
      vehicle_make: ctx.answers.vehicleMake ?? null,
    }),
  photoAdded: (ctx: AnalyticsContext, count: number) =>
    track("photo_added", { ...basePayload(ctx), photo_count: count }),
  quoteReviewed: (ctx: AnalyticsContext) => track("quote_reviewed", basePayload(ctx)),
  quoteSubmitted: (ctx: AnalyticsContext, reference: string) =>
    track("quote_submitted", { ...basePayload(ctx), reference }),
  quoteSubmissionFailed: (ctx: AnalyticsContext, reason: string) =>
    track("quote_submission_failed", { ...basePayload(ctx), reason }),
  clickToCall: (ctx: AnalyticsContext, placement: string) =>
    track("click_to_call", { ...basePayload(ctx), placement }),
};
