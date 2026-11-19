import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { groupCustomers, filterCustomers, decodeCustomerKey, encodeCustomerKey, type CustomerQuoteRow } from "./customer-directory";
import { csvLine, safeSpreadsheetText } from "./quote-reporting";

type Ctx = { supabase: any; userId: string };
const COLS = "id, public_reference, created_at, status, requested_service, glass_area, customer_name, customer_phone, customer_email, vehicle_year, vehicle_make, vehicle_model, service_address";

async function loadRows({ supabase, userId }: Ctx): Promise<CustomerQuoteRow[]> {
  const { data: ok, error: e } = await supabase.rpc("is_operator", { _user_id: userId });
  if (e || !ok) throw new Error("Dashboard access required.");
  const out: CustomerQuoteRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("quotes").select(COLS).order("created_at", { ascending: false }).range(from, from + 999);
    if (error) throw new Error("Could not load customers.");
    for (const r of data ?? []) {
      const { service_address, ...rest } = r as Record<string, unknown>;
      out.push({ ...(rest as unknown as CustomerQuoteRow), service_city: ((service_address ?? {}) as { city?: string }).city ?? null });
    }
    if ((data ?? []).length < 1000) return out;
  }
}
const filtersSchema = z.object({
  search: z.string().max(200).optional(), month: z.string().max(7).optional(),
  service: z.string().max(100).optional(), status: z.string().max(40).optional(),
});
const PAGE = 25;

export const listCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(filtersSchema.extend({ page: z.number().int().min(0).default(0) }))
  .handler(async ({ data, context }) => {
    const rows = await loadRows(context as Ctx);
    const all = groupCustomers(rows);
    const list = filterCustomers(all, rows, data);
    return {
      total: list.length, totalCustomers: all.length, totalQuotes: rows.length, page: data.page, pageSize: PAGE,
      months: [...new Set(rows.map((r) => r.created_at.slice(0, 7)))].sort().reverse(),
      services: [...new Set(rows.map((r) => r.requested_service ?? r.glass_area).filter(Boolean) as string[])].sort(),
      rows: list.slice(data.page * PAGE, data.page * PAGE + PAGE).map((c) => ({ ...c, id: encodeCustomerKey(c.key) })),
    };
  });

export const getCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().min(1).max(400) }))
  .handler(async ({ data, context }) => {
    let key: string;
    try { key = decodeCustomerKey(data.id); } catch { throw new Error("Customer not found."); }
    const rows = await loadRows(context as Ctx);
    const profile = groupCustomers(rows).find((c) => c.key === key);
    if (!profile) throw new Error("Customer not found.");
    const quotes = profile.quoteIds.map((id) => rows.find((r) => r.id === id)!);
    const { data: history } = await (context as Ctx).supabase.from("quote_status_history")
      .select("quote_id, previous_status, new_status, created_at").in("quote_id", profile.quoteIds).order("created_at");
    return { profile, quotes, history: (history ?? []) as { quote_id: string; previous_status: string | null; new_status: string; created_at: string }[] };
  });

const HEADERS = ["Customer name", "Phones", "Emails", "Total quotes", "First quote date", "Latest quote date", "Latest requested service", "Most recent quote status", "Service location", "Needs identity review"];
export const exportCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ filters: filtersSchema, format: z.enum(["csv", "xlsx"]), ids: z.array(z.string().max(400)).max(10000).optional() }))
  .handler(async ({ data, context }) => {
    const rows = await loadRows(context as Ctx);
    let list = filterCustomers(groupCustomers(rows), rows, data.filters);
    if (data.ids) { const set = new Set(data.ids); list = list.filter((c) => set.has(encodeCustomerKey(c.key))); }
    const values = list.map((c) => [c.name, c.phones.join(" / "), c.emails.join(" / "), String(c.quoteCount), c.firstQuoteAt.slice(0, 10), c.latestQuoteAt.slice(0, 10), c.latestService ?? "", c.latestStatus, c.serviceLocation ?? "", c.ambiguous ? "Yes" : "No"].map(safeSpreadsheetText));
    const date = new Date().toISOString().slice(0, 10);
    let bytes: Uint8Array;
    if (data.format === "xlsx") {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADERS, ...values]), "Customers");
      bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    } else bytes = new TextEncoder().encode(["\ufeff", csvLine(HEADERS), ...values.map(csvLine)].join(""));
    return {
      base64: Buffer.from(bytes).toString("base64"), count: list.length,
      filename: `riverbend-customers-${date}.${data.format}`,
      mime: data.format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv;charset=utf-8",
    };
  });
