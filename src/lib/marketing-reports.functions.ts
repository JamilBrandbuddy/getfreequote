import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import type { QuoteStats } from "./marketing-report";

const metric = z.union([z.number().finite().min(0).max(1e10), z.literal("na"), z.null()]);
const values = z.record(z.string().max(40), metric);
const campaign = z.object({ id: z.string().max(60), name: z.string().trim().max(200), sub: z.string().max(200), kind: z.string().max(100), notes: z.string().max(2000), values });
const reportData = z.object({
  sections: z.record(z.string().max(40), z.object({ values, notes: z.string().max(4000) })),
  metaCampaigns: z.array(campaign).max(100),
  googleCampaigns: z.array(campaign).max(100),
});

async function roles(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  if (error) throw new Error("Could not verify account permissions.");
  const r = (data ?? []).map((x: { role: string }) => x.role);
  return { isMarketing: r.includes("marketing"), isAdmin: r.includes("admin") };
}
async function requireMarketing(ctx: { supabase: any; userId: string }) {
  if (!(await roles(ctx)).isMarketing) throw new Error("Only the Marketing account can edit reports.");
}
const email = (claims: unknown) => (claims as { email?: string } | null)?.email ?? null;

/** Drafts and report status — Marketing only. */
export const listReportDrafts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireMarketing(context);
    const { data, error } = await context.supabase.from("marketing_reports")
      .select("id,period_year,period_month,status,current_version,has_unpublished_changes,updated_at,updated_by_email,published_at")
      .order("period_year", { ascending: false }).order("period_month", { ascending: false });
    if (error) throw new Error("Could not load reports.");
    return data ?? [];
  });

export const createReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ year: z.number().int().min(2020).max(2100), month: z.number().int().min(1).max(12) }))
  .handler(async ({ data, context }) => {
    await requireMarketing(context);
    const { data: existing } = await context.supabase.from("marketing_reports").select("id").eq("period_year", data.year).eq("period_month", data.month).maybeSingle();
    if (existing) return { id: existing.id, existed: true };
    const em = email(context.claims);
    const { data: row, error } = await context.supabase.from("marketing_reports")
      .insert({ period_year: data.year, period_month: data.month, created_by: context.userId, created_by_email: em, updated_by: context.userId, updated_by_email: em })
      .select("id").single();
    if (error || !row) throw new Error("Could not create the report.");
    return { id: row.id, existed: false };
  });

export const getReportDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await requireMarketing(context);
    const { data: row, error } = await context.supabase.from("marketing_reports").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error("Could not load the report.");
    if (!row) throw new Error("Report not found.");
    const { data: versions } = await context.supabase.from("marketing_report_versions")
      .select("id,version,published_at,published_by_email,change_note").eq("report_id", data.id).order("version", { ascending: false });
    return { report: row, versions: versions ?? [] };
  });

export const saveReportDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), currency: z.enum(["CAD", "USD"]), highlights: z.string().max(8000), data: reportData }))
  .handler(async ({ data, context }) => {
    await requireMarketing(context);
    const { error } = await context.supabase.from("marketing_reports").update({
      currency: data.currency, highlights: data.highlights, data: data.data as unknown as Json,
      has_unpublished_changes: true, updated_by: context.userId, updated_by_email: email(context.claims),
    }).eq("id", data.id);
    if (error) throw new Error("Could not save the draft.");
    return { ok: true };
  });

export const publishReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), note: z.string().max(1000) }))
  .handler(async ({ data, context }) => {
    await requireMarketing(context);
    const { data: res, error } = await context.supabase.rpc("publish_marketing_report", { _report_id: data.id, _note: data.note });
    if (error) throw new Error("Could not publish the report.");
    return res as { version: number };
  });

export const deleteReportDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await requireMarketing(context);
    const { error } = await context.supabase.from("marketing_reports").delete().eq("id", data.id).eq("current_version", 0);
    if (error) throw new Error("Could not delete the draft.");
    return { ok: true };
  });

/** Published reports only — latest version per month, for Admin and Marketing. */
export const listPublishedReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await roles(context);
    if (!r.isAdmin && !r.isMarketing) throw new Error("Access required.");
    const { data, error } = await context.supabase.from("marketing_report_versions")
      .select("id,report_id,version,period_year,period_month,currency,data,highlights,change_note,published_at,published_by_email")
      .order("period_year", { ascending: false }).order("period_month", { ascending: false }).order("version", { ascending: false });
    if (error) throw new Error("Could not load published reports.");
    const latest = new Map<string, NonNullable<typeof data>[number] & { versionCount: number }>();
    for (const v of data ?? []) {
      const cur = latest.get(v.report_id);
      if (!cur) latest.set(v.report_id, { ...v, versionCount: 1 }); else cur.versionCount++;
    }
    return [...latest.values()];
  });

export const getQuoteStatsForMonth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ year: z.number().int().min(2020).max(2100), month: z.number().int().min(1).max(12) }))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("marketing_quote_stats", { _year: data.year, _month: data.month });
    if (error) throw new Error("Could not load quote figures.");
    return res as unknown as QuoteStats;
  });
