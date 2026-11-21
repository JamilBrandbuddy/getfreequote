import { AdminBackNav } from "@/components/admin/AdminBackNav";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { getAdminSession } from "@/lib/admin.functions";
import { listPublishedReports, listReportDrafts, createReport, getQuoteStatsForMonth } from "@/lib/marketing-reports.functions";
import { MONTHS, periodLabel, normalizeReportData, isNum, type ReportData } from "@/lib/marketing-report";
import { MarketingReportView } from "@/components/admin/MarketingReportView";

export const Route = createFileRoute("/admin/performance/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Marketing Performance — Riverbend Autoglass" },
    { name: "description", content: "Monthly marketing performance reports for Riverbend Autoglass." },
    { property: "og:title", content: "Marketing Performance — Riverbend Autoglass" },
    { property: "og:description", content: "Published monthly marketing results and comparisons." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: Performance,
});

const now = new Date();
const YEARS = Array.from({ length: now.getFullYear() - 2023 }, (_, i) => now.getFullYear() - i);
const prevPeriod = (y: number, m: number) => (m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 });

function Bars({ title, points, money }: { title: string; points: { label: string; v: number | null }[]; money?: boolean }) {
  const max = Math.max(1, ...points.map(p => p.v ?? 0));
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm font-semibold">{title}</p>
    <div className="mt-3 flex h-32 items-end gap-2">{points.map(p => <div key={p.label} className="flex flex-1 flex-col items-center gap-1">
      <span className="text-[10px] text-muted-foreground">{p.v === null ? "—" : money ? `$${Math.round(p.v)}` : p.v}</span>
      <div className="w-full rounded-t bg-primary" style={{ height: `${p.v === null ? 0 : Math.max(2, (p.v / max) * 96)}px` }} />
      <span className="text-[10px] text-muted-foreground">{p.label}</span></div>)}</div></div>;
}

function Performance() {
  const navigate = useNavigate();
  const sessionFn = useServerFn(getAdminSession);
  const publishedFn = useServerFn(listPublishedReports);
  const draftsFn = useServerFn(listReportDrafts);
  const createFn = useServerFn(createReport);
  const statsFn = useServerFn(getQuoteStatsForMonth);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const session = useQuery({ queryKey: ["admin-session"], queryFn: () => sessionFn({}), retry: false });
  const canView = session.data?.canViewPublishedReports === true;
  const isMarketing = session.data?.canEditMarketingReports === true;
  const published = useQuery({ queryKey: ["mkt-published"], queryFn: () => publishedFn({}), enabled: canView });
  const drafts = useQuery({ queryKey: ["mkt-drafts"], queryFn: () => draftsFn({}), enabled: isMarketing });
  const pp = prevPeriod(year, month);
  const stats = useQuery({ queryKey: ["mkt-stats", year, month], queryFn: () => statsFn({ data: { year, month } }), enabled: canView });
  const prevStats = useQuery({ queryKey: ["mkt-stats", pp.y, pp.m], queryFn: () => statsFn({ data: { year: pp.y, month: pp.m } }), enabled: canView });
  const create = useMutation({ mutationFn: () => createFn({ data: { year, month } }), onSuccess: r => navigate({ to: "/admin/performance/$reportId", params: { reportId: r.id } }) });

  const find = (y: number, m: number) => published.data?.find(r => r.period_year === y && r.period_month === m);
  const current = find(year, month);
  const prev = find(pp.y, pp.m);
  const draftForMonth = drafts.data?.find(r => r.period_year === year && r.period_month === month);
  const trend = [...(published.data ?? [])].sort((a, b) => a.period_year - b.period_year || a.period_month - b.period_month).slice(-6);
  const tv = (d: unknown, sec: string, k: string) => { const v = normalizeReportData(d).sections[sec]?.values[k]; return isNum(v) ? v : null; };
  const label = (r: { period_year: number; period_month: number }) => `${MONTHS[r.period_month - 1]!.slice(0, 3)} ${String(r.period_year).slice(2)}`;

  return <main className="min-h-screen bg-muted/40 px-4 py-8 sm:px-8"><div className="mx-auto max-w-[1380px]">
    <AdminBackNav />
    <h1 className="mt-4 text-2xl font-semibold">Marketing Performance</h1>
    <p className="text-sm text-muted-foreground">Monthly marketing results prepared by BrandBuddy for Riverbend Autoglass.</p>
    {session.isPending ? <p className="mt-6">Loading…</p> : !canView ? <p role="alert" className="mt-6 text-destructive">You do not have access to performance reports.</p> : <>
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div><p className="mb-1 text-xs text-muted-foreground">Year</p><Select value={String(year)} onValueChange={v => setYear(Number(v))}><SelectTrigger className="w-28" aria-label="Year"><SelectValue /></SelectTrigger><SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
        {isMarketing && (draftForMonth
          ? <Button asChild className="ml-auto"><Link to="/admin/performance/$reportId" params={{ reportId: draftForMonth.id }}>Edit {periodLabel(year, month)} report</Link></Button>
          : <Button className="ml-auto" onClick={() => create.mutate()} disabled={create.isPending}><Plus /> Create {periodLabel(year, month)} report</Button>)}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-6 lg:grid-cols-12" role="group" aria-label="Month">
        {MONTHS.map((m, i) => { const mm = i + 1; const active = mm === month; const has = !!find(year, mm); const draft = !has && !!drafts.data?.find(r => r.period_year === year && r.period_month === mm);
          return <Button key={m} variant={active ? "default" : "outline"} aria-pressed={active} onClick={() => setMonth(mm)} className="relative h-10">{m.slice(0, 3)}
            {(has || draft) && <span aria-hidden className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${has ? "bg-primary" : "bg-muted-foreground"} ${active ? "bg-primary-foreground" : ""}`} />}</Button>; })}
      </div>
      {create.error && <p role="alert" className="mt-2 text-destructive">{create.error.message}</p>}

      {isMarketing && <section className="mt-6 rounded-xl border border-border bg-card p-4"><h2 className="font-semibold">All reports (Marketing view)</h2>
        {drafts.isPending ? <p className="mt-2 text-sm">Loading…</p> : !drafts.data?.length ? <p className="mt-2 text-sm text-muted-foreground">No reports yet.</p> :
        <ul className="mt-2 divide-y divide-border">{drafts.data.map(r => <li key={r.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
          <Link className="font-medium underline-offset-2 hover:underline" to="/admin/performance/$reportId" params={{ reportId: r.id }}>{periodLabel(r.period_year, r.period_month)}</Link>
          {r.current_version > 0 ? <Badge>Published v{r.current_version}</Badge> : <Badge variant="secondary">Draft</Badge>}
          {r.current_version > 0 && r.has_unpublished_changes && <Badge variant="outline">Unpublished edits</Badge>}
          <span className="ml-auto text-xs text-muted-foreground">Updated {new Date(r.updated_at).toLocaleString("en-CA")} {r.updated_by_email ? `by ${r.updated_by_email}` : ""}</span></li>)}</ul>}
      </section>}

      {trend.length > 1 && <section className="mt-6"><h2 className="mb-3 text-lg font-semibold">Monthly trend (published reports)</h2><div className="grid gap-3 md:grid-cols-3">
        <Bars title="Google Search clicks" points={trend.map(r => ({ label: label(r), v: tv(r.data, "gsc", "clicks") }))} />
        <Bars title="Meta Ads spend" money points={trend.map(r => ({ label: label(r), v: tv(r.data, "meta", "spend") }))} />
        <Bars title="Google Ads spend" money points={trend.map(r => ({ label: label(r), v: tv(r.data, "gads", "spend") }))} />
      </div></section>}

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline gap-3"><h2 className="text-xl font-semibold">{periodLabel(year, month)} — published report</h2>
          {current && <span className="text-xs text-muted-foreground">Version {current.version} · published {new Date(current.published_at).toLocaleString("en-CA")}{current.versionCount > 1 ? " · figures updated after first publication" : ""}</span>}</div>
        {published.isPending ? <p className="mt-4">Loading…</p> : !current ? <p className="mt-4 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">No published report for this month yet.</p> :
          <div className="mt-4">{current.change_note && <p className="mb-4 text-sm"><span className="font-medium">Update note:</span> {current.change_note}</p>}
            <MarketingReportView data={normalizeReportData(current.data)} currency={current.currency} highlights={current.highlights} quoteStats={stats.data ?? null}
              prev={prev ? { data: normalizeReportData(prev.data) as ReportData, quoteStats: prevStats.data ?? null } : null} />
            {!prev && <p className="mt-4 text-xs text-muted-foreground">No published report for {periodLabel(pp.y, pp.m)}, so month-over-month changes are not shown.</p>}</div>}
      </section>
    </>}
  </div></main>;
}
