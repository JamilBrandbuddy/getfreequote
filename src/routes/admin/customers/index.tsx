import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAdminSession } from "@/lib/admin.functions";
import { listCustomers, exportCustomers } from "@/lib/customers.functions";
import { RegionFilter, regionLabel } from "@/components/admin/QuoteReporting";
import { SEGMENT_LABELS, type CustomerSegment } from "@/lib/conversion";
import { decodeExport, deliverFile } from "@/lib/download-file";

const STATUSES = ["new", "contacted", "awaiting-information", "estimating", "quote-sent", "appointment-requested", "booked", "completed", "lost", "spam"];

export const Route = createFileRoute("/admin/customers/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "All Customers — Riverbend Autoglass Admin" },
    { name: "description", content: "Customer directory grouped from Riverbend Autoglass quote requests." },
    { name: "robots", content: "noindex, nofollow" },
    { property: "og:title", content: "All Customers — Riverbend Autoglass" },
    { property: "og:description", content: "Riverbend Autoglass customer directory." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CustomersPage,
});

function CustomersPage() {
  const navigate = useNavigate();
  const fetchSession = useServerFn(getAdminSession);
  const fetchList = useServerFn(listCustomers);
  const runExport = useServerFn(exportCustomers);
  const [search, setSearch] = useState(""); const [debounced, setDebounced] = useState("");
  const [month, setMonth] = useState("all"); const [service, setService] = useState("all"); const [status, setStatus] = useState("all"); const [regions, setRegions] = useState<string[]>([]); const [segment, setSegment] = useState("all");
  const [page, setPage] = useState(0); const [selected, setSelected] = useState<string[]>([]);
  const [exporting, setExporting] = useState<string | null>(null); const [exportError, setExportError] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t); }, [search]);
  const filters = { search: debounced.trim(), month, service, status, regions, segment: segment as "all" };
  const key = JSON.stringify(filters);
  useEffect(() => { setPage(0); setSelected([]); }, [key]);
  const session = useQuery({ queryKey: ["admin-session"], queryFn: () => fetchSession({}), retry: false });
  useEffect(() => { if (session.isError) void navigate({ to: "/admin/login", replace: true }); }, [session.isError, navigate]);
  const list = useQuery({ queryKey: ["admin-customers", key, page], queryFn: () => fetchList({ data: { ...filters, page } }), enabled: session.data?.canOperate === true });

  const doExport = async (format: "csv" | "xlsx", scope: "filtered" | "selected" | "all") => {
    setExporting(`${scope}-${format}`); setExportError("");
    try {
      const res = await runExport({ data: { format, filters: scope === "all" ? {} : filters, ...(scope === "selected" ? { ids: selected } : {}) } });
      await deliverFile(decodeExport(res.base64, res.mime), res.filename);
    } catch { setExportError("Export failed. Please try again."); } finally { setExporting(null); }
  };

  if (session.isPending) return <main className="grid min-h-screen place-items-center"><Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" /></main>;
  if (session.data && !session.data.canOperate) return <main className="grid min-h-screen place-items-center p-4 text-center"><h1 className="text-xl font-semibold">This account has no dashboard access</h1></main>;
  const d = list.data; const pages = Math.max(1, Math.ceil((d?.total ?? 0) / 25));
  const pageIds = d?.rows.map((c) => c.id) ?? [];

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-[1380px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">All Customers</h1>
            <p className="mt-1 text-sm text-muted-foreground">{d ? `${d.totalCustomers} customers from ${d.totalQuotes} quote requests` : "Loading…"}</p>
          </div>
          <Button asChild variant="outline" className="h-11 rounded-xl"><Link to="/admin/quotes">Quote requests</Link></Button>
        </header>
        <section className="mt-6 grid gap-3 border-y border-border py-4 sm:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone or email" aria-label="Search customers" className="h-11 rounded-xl pl-9" />
          </div>
          <Filter label="Month" value={month} onChange={setMonth} options={d?.months ?? []} />
          <Filter label="Service" value={service} onChange={setService} options={d?.services ?? []} />
          <Filter label="Status" value={status} onChange={setStatus} options={STATUSES} />
          <Select value={segment} onValueChange={setSegment}><SelectTrigger className="h-11 w-full rounded-xl xl:w-64" aria-label="Conversion segment"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All conversion segments</SelectItem>{(Object.keys(SEGMENT_LABELS) as CustomerSegment[]).map((k) => <SelectItem key={k} value={k}>{SEGMENT_LABELS[k]}</SelectItem>)}</SelectContent></Select>
          <RegionFilter value={regions} onChange={setRegions} />
        </section>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <Download className="size-4 text-muted-foreground" aria-hidden />
          {(["filtered", "all", "selected"] as const).map((scope) => (["csv", "xlsx"] as const).map((f) => (
            <Button key={scope + f} size="sm" variant="outline" className="rounded-lg" disabled={!!exporting || (scope === "selected" && !selected.length)} onClick={() => doExport(f, scope)}>
              {exporting === `${scope}-${f}` && <Loader2 className="size-3 animate-spin" />}{scope === "selected" ? `Selected (${selected.length})` : scope === "all" ? "All" : "Filtered"} {f.toUpperCase()}
            </Button>)))}
          {exportError && <span role="alert" className="text-destructive">{exportError}</span>}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Conversion segments are recipient filters only. They do not give permission to send promotional email.</p>
        {list.isError && <p role="alert" className="mt-4 text-sm text-destructive">Could not load customers.</p>}
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3"><Checkbox aria-label="Select this page" checked={!!pageIds.length && pageIds.every((id) => selected.includes(id))} onCheckedChange={(c) => setSelected((s) => c ? [...new Set([...s, ...pageIds])] : s.filter((id) => !pageIds.includes(id)))} /></th>
                <th className="p-3">#</th><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3">Email</th>
                <th className="p-3">Latest quote</th><th className="p-3">Latest service</th><th className="p-3">Quotes</th><th className="p-3">Status</th><th className="p-3">Conversion</th><th className="p-3">Service location</th><th className="p-3">Phone region</th>
              </tr>
            </thead>
            <tbody>
              {list.isPending && <tr><td colSpan={12} className="p-8 text-center"><Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" /></td></tr>}
              {d && !d.rows.length && <tr><td colSpan={12} className="p-10 text-center text-muted-foreground"><Users className="mx-auto mb-2 size-6" />No customers match these filters.</td></tr>}
              {d?.rows.map((c, i) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/40">
                  <td className="p-3"><Checkbox aria-label={`Select ${c.name}`} checked={selected.includes(c.id)} onCheckedChange={(v) => setSelected((s) => v ? [...s, c.id] : s.filter((x) => x !== c.id))} /></td>
                  <td className="p-3 text-muted-foreground">{page * 25 + i + 1}</td>
                  <td className="p-3 font-medium"><Link to="/admin/customers/$customerId" params={{ customerId: c.id }} className="text-primary hover:underline">{c.name}</Link>{c.ambiguous && <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs">Review match</span>}</td>
                  <td className="p-3">{c.phones[0] ?? "—"}</td><td className="p-3">{c.emails[0] ?? "—"}</td>
                  <td className="p-3">{new Date(c.latestQuoteAt).toLocaleDateString("en-CA", { timeZone: "America/Regina" })}</td>
                  <td className="p-3">{c.latestService ?? "—"}</td><td className="p-3">{c.quoteCount}</td>
                  <td className="p-3 capitalize">{c.latestStatus.replace(/-/g, " ")}</td><td className="p-3">{SEGMENT_LABELS[c.segment].replace(" Customers", "")}{c.quoteCount > 1 && <span className="block text-xs text-muted-foreground">{c.convertedQuotes} conv · {c.notConvertedQuotes} not · {c.pendingQuotes} pending</span>}</td><td className="p-3">{c.serviceLocation ?? "—"}{c.serviceProvince ? `, ${c.serviceProvince}` : ""}</td><td className="p-3">{regionLabel(c.phoneRegion)}</td>
                </tr>))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page + 1} of {pages} · {d?.total ?? 0} customers · {d?.matchedQuotes ?? 0} quotes{d?.segments ? ` · Unique customers: ${d.segments.converted} converted, ${d.segments.not_converted} not converted, ${d.segments.pending} pending` : ""}</span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-11 min-w-36 rounded-xl"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent><SelectItem value="all">All {label === "Status" ? "statuses" : label.toLowerCase() + "s"}</SelectItem>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}
