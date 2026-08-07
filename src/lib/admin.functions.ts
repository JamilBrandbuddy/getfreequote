import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

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

export interface AdminQuoteFilters {
  search?: string;
  status?: string;
  priority?: string;
  insurance?: string;
  sort?: "newest" | "oldest" | "priority";
  page?: number;
}

const PAGE_SIZE = 25;

const LIST_COLUMNS =
  "id, public_reference, created_at, status, priority, customer_name, customer_phone, customer_email, glass_area, requested_service, insurance_method, vehicle_year, vehicle_make, vehicle_model, service_address, adas_required_review";

/** Confirms the signed-in user may view the admin dashboard. */
export const getAdminSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isStaff } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "staff",
    });
    return {
      userId: context.userId,
      email: (context.claims as { email?: string } | null)?.email ?? null,
      isAdmin: Boolean(isAdmin),
      isStaff: Boolean(isAdmin) || Boolean(isStaff),
    };
  });

export const listQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AdminQuoteFilters) => input ?? {})
  .handler(async ({ data, context }) => {
    const page = Math.max(0, data.page ?? 0);
    let query = context.supabase.from("quotes").select(LIST_COLUMNS, { count: "exact" });

    if (data.status && data.status !== "all") query = query.eq("status", data.status as QuoteStatus);
    if (data.priority && data.priority !== "all") query = query.eq("priority", data.priority as QuotePriority);
    if (data.insurance && data.insurance !== "all") query = query.eq("insurance_method", data.insurance);

    const search = data.search?.trim();
    if (search) {
      const term = `%${search.replace(/[%,]/g, "")}%`;
      query = query.or(
        `public_reference.ilike.${term},customer_name.ilike.${term},customer_phone.ilike.${term},customer_email.ilike.${term},vehicle_make.ilike.${term},vehicle_model.ilike.${term}`,
      );
    }

    if (data.sort === "oldest") query = query.order("created_at", { ascending: true });
    else if (data.sort === "priority")
      query = query.order("priority", { ascending: true }).order("created_at", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    const { data: rows, error, count } = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);

    return {
      rows: (rows ?? []) as unknown as AdminQuoteListItem[],
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
    };
  });

export const getQuoteStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
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
    const patch: QuoteUpdate = {};
    if (data.status) patch.status = data.status as QuoteStatus;
    if (data.priority) patch.priority = data.priority as QuotePriority;
    if (data.internalNotes !== undefined) patch.internal_notes = data.internalNotes.slice(0, 5000);
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await context.supabase.from("quotes").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
