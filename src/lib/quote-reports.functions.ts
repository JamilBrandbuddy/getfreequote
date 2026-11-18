import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reportingFiltersSchema, type QuoteAnalytics, EXPORT_HEADERS, csvLine, exportValues } from "./quote-reporting";

export const getQuoteAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(reportingFiltersSchema)
  .handler(async ({ data, context }) => {
    const { data: allowed, error: accessError } = await context.supabase.rpc("is_operator", { _user_id: context.userId });
    if (accessError || !allowed) throw new Error("Dashboard access required.");
    const { data: report, error } = await context.supabase.rpc("quote_reporting", { filters: data, report_mode: "analytics" });
    if (error) throw new Error("Could not load quote analytics.");
    return report as unknown as QuoteAnalytics;
  });

export const prepareQuoteExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ filters: reportingFiltersSchema, format: z.enum(["csv", "xlsx"]), ids: z.array(z.string().uuid()).max(10000).optional() }))
  .handler(async ({ data, context }) => {
    const { data: allowed, error: accessError } = await context.supabase.rpc("is_operator", { _user_id: context.userId });
    if (accessError || !allowed) throw new Error("Dashboard access required.");
    // In-memory workbook generation: no filesystem or streaming writers.
    const { buildQuoteExport } = await import("./quote-export.server");
    return buildQuoteExport(data.format, async (offset) => {
      const { data: report, error } = await context.supabase.rpc("quote_reporting", {
        filters: data.filters, report_mode: "export", row_offset: offset, row_limit: 500,
        ...(data.ids ? { selected_ids: data.ids } : {}),
      });
      if (error) throw new Error("Could not export quote requests.");
      return report as unknown as { rows: Record<string, unknown>[]; total: number };
    }, EXPORT_HEADERS, csvLine, exportValues);
  });