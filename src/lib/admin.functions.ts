import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { permissionsFor } from "./permissions";
import { reportingFiltersSchema, type ReportingFilters } from "./quote-reporting";

type QuoteStatus = Database["public"]["Enums"]["quote_status"];
type QuotePriority = Database["public"]["Enums"]["quote_priority"];
type QuoteUpdate = Database["public"]["Tables"]["quotes"]["Update"];

export interface AdminQuoteListItem {
  id: string;
  public_reference: string;
  created_at: string;
  status: string;
  priority: string;
  customer_name: string;
  phone_region?: string;
  customer_phone: string;
  customer_email: string | null;
  glass_area: string | null;
  requested_service: string | null;
  insurance_method: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  service_city: string | null;
  adas_required_review: boolean;
}

export type AdminQuoteFilters = ReportingFilters;

const PAGE_SIZE = 25;

/** Confirms the signed-in user may view the admin dashboard. */
export const getAdminSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles, error } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (error) throw new Error("Could not verify account permissions.");
    const permissions = permissionsFor((roles ?? []).map((r) => r.role));
    return {
      userId: context.userId,
      email: (context.claims as { email?: string } | null)?.email ?? null,
      ...permissions,
      isStaff: permissions.canOperate,
    };
  });

export const listQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(reportingFiltersSchema)
  .handler(async ({ data, context }) => {
    const { data: permitted, error: accessError } = await context.supabase.rpc("is_operator", { _user_id: context.userId });
    if (accessError || !permitted) throw new Error("Dashboard access required.");
    const page = Math.max(0, data.page ?? 0);
    const { data: report, error } = await context.supabase.rpc("quote_reporting", {
      filters: { ...data, search: data.search?.trim() ?? "" }, row_offset: page * PAGE_SIZE, row_limit: PAGE_SIZE,
    });
    if (error) throw new Error(error.message);
    const { rows, total } = report as unknown as { rows: Record<string, unknown>[]; total: number };

    const mapped = ((rows ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
      const { service_address, ...rest } = row;
      const address = (service_address ?? {}) as { city?: string };
      return { ...rest, service_city: address.city ?? null };
    });

    return {
      rows: mapped as unknown as AdminQuoteListItem[],
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  });

export const getQuoteStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: permitted, error: accessError } = await context.supabase.rpc("is_operator", { _user_id: context.userId });
    if (accessError || !permitted) throw new Error("Dashboard access required.");
    const { data, error } = await context.supabase.from("quotes").select("status, priority, created_at");
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: rows.length,
      newCount: rows.filter((r) => r.status === "new").length,
      urgent: rows.filter((r) => r.priority === "urgent").length,
      lastSevenDays: rows.filter((r) => new Date(r.created_at).getTime() >= since).length,
      completed: rows.filter((r) => r.status === "completed").length,
    };
  });

export const getQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id || typeof input.id !== "string") throw new Error("A quote id is required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: permitted, error: accessError } = await context.supabase.rpc("is_operator", { _user_id: context.userId });
    if (accessError || !permitted) throw new Error("Dashboard access required.");
    const { data: quote, error } = await context.supabase
      .from("quotes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!quote) throw new Error("Quote not found.");

    const { data: files } = await context.supabase
      .from("quote_files")
      .select("id, storage_path, original_filename, mime_type, file_size, created_at")
      .eq("quote_id", data.id)
      .order("created_at", { ascending: true });

    // Private bucket — short-lived signed URLs only, generated per request.
    const signedFiles = await Promise.all(
      (files ?? []).map(async (file) => {
        const { data: signed } = await context.supabase.storage
          .from("quote-files")
          .createSignedUrl(file.storage_path, 300);
        return { ...file, url: signed?.signedUrl ?? null };
      }),
    );

    const { data: history } = await context.supabase
      .from("quote_status_history")
      .select("id, previous_status, new_status, note, created_at")
      .eq("quote_id", data.id)
      .order("created_at", { ascending: false });

    return { quote, files: signedFiles, history: history ?? [] };
  });

export const updateQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status?: string; priority?: string; internalNotes?: string }) => {
    if (!input?.id) throw new Error("A quote id is required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: permitted, error: accessError } = await context.supabase.rpc("is_operator", { _user_id: context.userId });
    if (accessError || !permitted) throw new Error("Dashboard access required.");
    const patch: QuoteUpdate = {};
    if (data.status) patch.status = data.status as QuoteStatus;
    if (data.priority) patch.priority = data.priority as QuotePriority;
    if (data.internalNotes !== undefined) patch.internal_notes = data.internalNotes.slice(0, 5000);
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await context.supabase.from("quotes").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Permanently deletes a quote, its history and attachments. Operational accounts only. */
export const deleteQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id || typeof input.id !== "string") throw new Error("A quote id is required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: permitted, error: accessError } = await context.supabase.rpc("is_operator", { _user_id: context.userId });
    if (accessError || !permitted) throw new Error("Dashboard access required.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: files } = await supabaseAdmin
      .from("quote_files")
      .select("storage_path")
      .eq("quote_id", data.id);
    const paths = (files ?? []).map((f) => f.storage_path);
    if (paths.length) {
      const { error: removalError } = await supabaseAdmin.storage.from("quote-files").remove(paths);
      if (removalError) throw new Error("Could not remove attachments. Quote was not deleted.");
    }

    const { error } = await supabaseAdmin.from("quotes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
