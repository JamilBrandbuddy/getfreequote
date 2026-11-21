import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Inbox, Percent, Loader2, LogOut, Search, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getAdminSession, listQuotes } from "@/lib/admin.functions";
import { getQuoteAnalytics } from "@/lib/quote-reports.functions";
import type { ReportingFilters } from "@/lib/quote-reporting";
import { DateFilters, AnalyticsView, QuoteExport, RegionFilter, regionLabel } from "@/components/admin/QuoteReporting";
import { Checkbox } from "@/components/ui/checkbox";
import { ConversionBadge, ConversionControl } from "@/components/admin/ConversionControl";

const STATUSES = [
  "new",
  "contacted",
  "awaiting-information",
  "estimating",
  "quote-sent",
  "appointment-requested",
  "booked",
  "completed",
  "lost",
  "spam",
];

const PRIORITIES = ["urgent", "high", "normal", "low"];

const priorityClass: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive",
  high: "bg-accent/20 text-accent-foreground",
  normal: "bg-muted text-muted-foreground",
  low: "bg-muted text-muted-foreground",
};

export const Route = createFileRoute("/admin/quotes/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Quote Requests — Riverbend Autoglass Admin" },
      { name: "description", content: "Review, filter and manage incoming Riverbend Autoglass quote requests." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Quote Requests — Riverbend Autoglass" },
      { property: "og:description", content: "Manage Riverbend Autoglass quote requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminQuotes,
});

function AdminQuotes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchSession = useServerFn(getAdminSession);
  const fetchQuotes = useServerFn(listQuotes);
  const fetchStats = useServerFn(getQuoteAnalytics);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "priority">("newest");
  const [page, setPage] = useState(0);
  const [period, setPeriod] = useState<ReportingFilters>({});
  const [service, setService] = useState("all");
  const [conversion, setConversion] = useState<"all" | "pending" | "converted" | "not_converted">("all");
  const [regions, setRegions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [allMatching, setAllMatching] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const filters = { ...period, search: debounced.trim(), status, priority, service: service === "sgi_any" ? "all" : service, insurance: service === "sgi_any" ? "sgi_any" : "all", conversion, sort, regions };
  const filterKey = JSON.stringify(filters);
  useEffect(() => { setSelected([]); setAllMatching(false); setPage(0); }, [filterKey]);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const session = useQuery({ queryKey: ["admin-session"], queryFn: () => fetchSession({}), retry: false });

  useEffect(() => {
    if (session.isError) void navigate({ to: "/admin/login", replace: true });
  }, [session.isError, navigate]);

  const stats = useQuery({
    queryKey: ["admin-stats", filterKey],
    queryFn: () => fetchStats({ data: filters }),
    enabled: session.data?.canOperate === true,
  });

  const sgiStats = useQuery({
    queryKey: ["admin-stats-sgi", filterKey],
    queryFn: () => fetchStats({ data: { ...filters, insurance: "sgi_any" } }),
    enabled: session.data?.canOperate === true,
  });

  const quotes = useQuery({
    queryKey: ["admin-quotes", filterKey, page],
    queryFn: () => fetchQuotes({ data: { ...filters, page } }),
    enabled: session.data?.canOperate === true,
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/admin/login", replace: true });
  };

  if (session.isPending) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </main>
    );
  }

  if (session.data && !session.data.canOperate) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">This account has no dashboard access</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ask an administrator to grant you dashboard access.</p>
          <Button onClick={signOut} variant="outline" className="mt-6 h-12 rounded-xl">
            Sign out
          </Button>
        </div>
      </main>
    );
  }

  const total = quotes.data?.total ?? 0;
  const pageSize = quotes.data?.pageSize ?? 25;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-[1380px]">
        <header className="grid min-w-0 gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground">Quote requests</h1>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              Signed in as {session.data?.email ?? "team member"} · {session.data?.roleLabel}
            </p>
          </div>
          <nav aria-label="Quote request actions" className="grid min-w-0 grid-cols-1 items-center gap-2 sm:flex sm:flex-wrap">
          <QuoteExport filters={filters} months={stats.data?.availableMonths ?? []} selectedIds={selected} allMatching={allMatching} total={quotes.data?.total ?? 0} triggerClassName="h-11 shrink-0 rounded-xl" />
          <Button asChild variant="outline" className="h-11 shrink-0 rounded-xl"><Link to="/admin/customers">All Customers</Link></Button>
          <Button asChild variant="outline" className="h-11 shrink-0 rounded-xl"><Link to="/admin/email">Bulk Email Campaigns</Link></Button>
          <Button asChild variant="outline" className="h-11 shrink-0 rounded-xl"><Link to="/admin/performance">Marketing Performance</Link></Button>
          {session.data?.canManageRoles && <Button asChild variant="outline" className="h-11 shrink-0 rounded-xl"><Link to="/admin/users">User roles</Link></Button>}
          <Button variant="outline" onClick={signOut} className="h-11 shrink-0 rounded-xl">
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
          </nav>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total converted" value={stats.data?.conversion?.converted} icon={<CheckCircle2 className="size-5" />} />
          <StatCard label="Conversion rate" value={stats.data?.conversion ? (stats.data.conversion.rate == null ? "—" : `${stats.data.conversion.rate}%`) : undefined} icon={<Percent className="size-5" />} />
          <StatCard label="Last 7 days" value={stats.data?.lastSevenDays} icon={<TrendingUp className="size-5" />} />
          <StatCard label="Total quotes" value={stats.data?.total} icon={<Inbox className="size-5" />} />
        </section>

        <section className="mt-6 border-y border-border py-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="relative min-w-[12rem] flex-1 basis-48">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, ref…"
              aria-label="Search quotes"
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={STATUSES} />
          <FilterSelect label="Service" value={service} onChange={setService} options={[...(stats.data?.services ?? []), "sgi_any"]} />
          <FilterSelect label="Conversion" value={conversion} onChange={(v) => setConversion(v as typeof conversion)} options={["pending", "converted", "not_converted"]} />
          <RegionFilter value={regions} onChange={setRegions} />
          <DateFilters inline key={resetKey} value={period} availableMonths={stats.data?.availableMonths ?? []} onChange={setPeriod} />
          <Button variant="ghost" className="h-11" onClick={() => { setSearch(""); setDebounced(""); setStatus("all"); setPriority("all"); setService("all"); setConversion("all"); setRegions([]); setSort("newest"); setPeriod({}); setResetKey((k) => k + 1); }}>Reset filters</Button>
        </div>
        </section>
        {(stats.isError || quotes.isError) && <p role="alert" className="mt-4 text-sm text-destructive">Could not load quotes. Check the date range and try again.</p>}
        <AnalyticsView data={stats.data} sgiCount={sgiStats.data?.total} />
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2"><Checkbox aria-label="Select this page" checked={!!quotes.data?.rows.length && (allMatching || quotes.data.rows.every((q) => selected.includes(q.id)))} onCheckedChange={(checked) => { setAllMatching(false); const ids = quotes.data?.rows.map((q) => q.id) ?? []; setSelected((s) => checked ? [...new Set([...s, ...ids])] : s.filter((id) => !ids.includes(id))); }} />Select this page</label>
          <span>{allMatching ? total : selected.length} selected</span>
          <Button variant="ghost" disabled={!total} onClick={() => { setAllMatching(true); setSelected([]); }}>Select all {total} matching</Button>
          {(allMatching || selected.length > 0) && <Button variant="ghost" onClick={() => { setAllMatching(false); setSelected([]); }}>Clear selection</Button>}
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {quotes.isPending ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading quotes…</p>
          ) : quotes.data && quotes.data.rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No quotes match these filters.</p>
          ) : (
            <ul className="divide-y divide-border">
              {quotes.data?.rows.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center pl-4">
                  <Checkbox aria-label={`Select ${q.public_reference}`} disabled={allMatching} checked={allMatching || selected.includes(q.id)} onCheckedChange={(checked) => setSelected((s) => checked ? [...new Set([...s, q.id])] : s.filter((id) => id !== q.id))} />
                  <Link
                    to="/admin/quotes/$id"
                    params={{ id: q.id }}
                    className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center justify-items-start gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-muted/60 md:grid-cols-[10rem_minmax(8rem,1fr)_7.5rem_8rem] md:gap-x-3 md:justify-items-start lg:grid-cols-[10rem_minmax(9rem,1fr)_7.5rem_7.5rem_4.5rem_6.5rem_7rem_5.5rem] lg:justify-items-start"
                  >
                    <span className="col-span-2 md:col-span-1 min-w-[9rem] font-mono text-sm font-semibold text-foreground">
                      {q.public_reference}
                    </span>
                    <span className="col-span-2 md:col-span-1 min-w-0 flex-1 text-sm text-foreground md:min-w-0 md:w-full">
                      {q.customer_name}
                      <span className="block text-xs text-muted-foreground">
                        {[q.vehicle_year, q.vehicle_make, q.vehicle_model].filter(Boolean).join(" ") || "Vehicle TBC"}
                      </span>
                    </span>
                    <span className="whitespace-nowrap rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground" title="Phone area code region">{regionLabel(q.phone_region)}</span>
                    <span className="truncate text-xs capitalize text-muted-foreground md:max-w-full">
                      {(q.requested_service ?? "—").replace(/_/g, " ")}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${priorityClass[q.priority] ?? ""}`}>
                      {q.priority}
                    </span>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize text-secondary-foreground">
                      {q.status.replace(/-/g, " ")}
                    </span>
                    <ConversionBadge value={q.conversion_status} status={q.status} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(q.created_at).toLocaleDateString("en-CA", { timeZone: "America/Regina" })}
                    </span>
                  </Link>
                  <div className="pr-4 lg:flex lg:w-[18.5rem] lg:shrink-0 lg:justify-end"><ConversionControl compact quoteId={q.id} reference={q.public_reference} value={q.conversion_status ?? "pending"} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <nav className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total} quote{total === 1 ? "" : "s"} · page {page + 1} of {pages}
          </span>
          <span className="flex gap-2">
            <Button variant="outline" className="h-10 rounded-xl" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </span>
        </nav>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon }: { label: string; value?: number | string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <p className="text-xl font-semibold text-foreground">{value ?? "—"}</p>
    </div>
  );
}

const OPTION_LABELS: Record<string, string> = { sgi_any: "SGI Insurance Claim", sgi_new: "SGI – new claim", sgi_started: "SGI – claim started", private: "Private pay", other_insurer: "Other insurer", not_sure: "Not sure" };

function FilterSelect({
  label,
  value,
  onChange,
  options,
  includeAll = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  includeAll?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 w-[calc(50%-0.375rem)] sm:w-40 rounded-xl" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">All {label.toLowerCase()}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option} value={option} className="capitalize">
            {OPTION_LABELS[option] ?? option.replace(/[-_]/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
