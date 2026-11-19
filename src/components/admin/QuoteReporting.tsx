import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { prepareQuoteExport } from "@/lib/quote-reports.functions";
import { decodeExport, deliverFile } from "@/lib/download-file";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { REGION_CODES, REGION_LABELS } from "@/config/canadianAreaCodes";
import type { QuoteAnalytics, ReportingFilters } from "@/lib/quote-reporting";

export function regionLabel(code?: string | null) { return (code && REGION_LABELS[code]) || "Unknown"; }
export function RegionFilter({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const label = !value.length ? "All regions" : value.length === 1 ? regionLabel(value[0]) : `${value.length} regions`;
  return <Popover><PopoverTrigger asChild><Button variant="outline" className="h-11 min-w-[10rem] justify-between rounded-xl" aria-label="Phone area code region">{label}</Button></PopoverTrigger>
    <PopoverContent className="w-72 p-3" align="start">
      <p className="mb-2 text-xs text-muted-foreground">Phone area code region (not proof of where the customer lives)</p>
      <div className="max-h-80 space-y-2 overflow-y-auto">{REGION_CODES.map((c) => <label key={c} className="flex items-center gap-2 text-sm"><Checkbox aria-label={REGION_LABELS[c]} checked={value.includes(c)} onCheckedChange={(on) => onChange(on ? [...value, c] : value.filter((x) => x !== c))} />{REGION_LABELS[c]}</label>)}</div>
      {value.length > 0 && <Button variant="ghost" size="sm" className="mt-2" onClick={() => onChange([])}>All regions</Button>}
    </PopoverContent></Popover>;
}
export function monthLabel(month: string) {
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "America/Regina" });
}
export function DateFilters({ value, onChange, availableMonths, initialMode = "all" }: { value: ReportingFilters; onChange: (value: ReportingFilters) => void; availableMonths: string[]; initialMode?: string }) {
  const [mode, setMode] = useState(initialMode);
  const [addMonth, setAddMonth] = useState("");
  const months = value.months ?? [];
  function changeMode(mode: string) { setMode(mode); onChange({ ...value, months: [], startDate: undefined, endDate: undefined }); }
  function toggle(month: string) { onChange({ ...value, months: months.includes(month) ? months.filter((m) => m !== month) : [...months, month].sort() }); }
  return <div className="mt-4 space-y-3 border-t border-border pt-4">
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium">Submission period</span>
      <Select value={mode} onValueChange={changeMode}><SelectTrigger aria-label="Submission period" className="w-full sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All months</SelectItem><SelectItem value="months">Selected months</SelectItem><SelectItem value="range">Custom date range</SelectItem></SelectContent></Select>
      <span className="text-xs text-muted-foreground">America/Regina</span>
    </div>
    {mode === "months" && <>
      <div className="flex flex-wrap gap-3">{[...new Set([...availableMonths, ...months])].sort().reverse().map((m) => <label key={m} className="flex items-center gap-2 text-sm"><Checkbox aria-label={monthLabel(m)} checked={months.includes(m)} onCheckedChange={() => toggle(m)} />{monthLabel(m)}</label>)}</div>
      <div className="flex flex-wrap items-center gap-2"><Input type="month" aria-label="Add another month" value={addMonth} onChange={(e) => setAddMonth(e.target.value)} className="w-48" /><Button variant="outline" disabled={!addMonth || months.includes(addMonth)} onClick={() => { toggle(addMonth); setAddMonth(""); }}>Add month</Button></div>
      {!months.length && <p className="text-sm text-muted-foreground">All months</p>}
    </>}
    {mode === "range" && <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">From<Input type="date" aria-label="From date" value={value.startDate ?? ""} onChange={(e) => onChange({ ...value, startDate: e.target.value || undefined })} /></label><label className="text-sm">Through<Input type="date" aria-label="Through date" value={value.endDate ?? ""} onChange={(e) => onChange({ ...value, endDate: e.target.value || undefined })} /></label></div>}
  </div>;
}

export function AnalyticsView({ data }: { data?: QuoteAnalytics }) {
  if (!data) return null;
  const max = Math.max(1, ...data.trend.map((t) => t.count));
  const c = data.conversion;
  return <section className="mt-6 space-y-5 border-y border-border py-5">
    {c && <div><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-semibold">Conversion</h2><span className="text-xs text-muted-foreground">Conversion rate = Converted ÷ Total valid quotes (spam excluded{c.excludedSpam ? `: ${c.excludedSpam}` : ""})</span></div>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">{[["Total valid quotes", c.valid], ["Pending", c.pending], ["Converted", c.converted], ["Not Converted", c.notConverted], ["Conversion rate", c.rate == null ? "—" : `${c.rate}%`]].map(([k, v]) => <div key={String(k)} className="rounded-xl border border-border bg-card p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 text-2xl font-semibold">{v}</dd></div>)}</dl>
      {(c.suggestedConverted > 0 || c.suggestedNotConverted > 0) && <p className="mt-2 text-xs text-muted-foreground">Not yet confirmed: {c.suggestedConverted} pending quote(s) have status "completed" and {c.suggestedNotConverted} have status "lost". They count as Pending until someone confirms them.</p>}
      <h3 className="mb-2 mt-4 text-sm font-medium">Monthly conversion trend</h3><ul className="space-y-1 text-xs">{data.trend.map((t) => <li key={t.month} className="grid grid-cols-[7rem_1fr_auto] gap-3"><span>{monthLabel(t.month)}</span><span className="text-muted-foreground">{t.converted ?? 0} converted of {t.valid ?? 0} valid</span><span className="font-semibold">{t.conversionRate == null ? "—" : `${t.conversionRate}%`}</span></li>)}</ul>
    </div>}
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-semibold">Monthly quote analytics</h2><span className="text-sm text-muted-foreground">{data.uniqueCustomers} unique customers · {data.total} submissions</span></div>
    {!data.total && <p className="text-sm text-muted-foreground">No quotes match these filters.</p>}
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr_1fr_1fr]">
      <div><h3 className="mb-3 text-sm font-medium">Monthly quote trend</h3><div className="space-y-3">{data.trend.map((t) => <div key={t.month} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-xs"><span>{monthLabel(t.month)}<span className="block text-muted-foreground">{t.change == null ? "MoM: N/A" : `MoM: ${t.change > 0 ? "+" : ""}${t.change}%`}</span></span><meter aria-label={`${monthLabel(t.month)} quotes`} min={0} max={max} value={t.count} className="h-5 w-full accent-primary" /><span className="text-right font-semibold">{t.count}</span></div>)}</div></div>
      <Breakdown title="Quote status" rows={data.statuses} />
      <Breakdown title="Requested service" rows={data.serviceBreakdown} />
      <div><h3 className="mb-3 text-sm font-medium">Phone area region</h3><ul className="space-y-2 text-sm">{(data.regionBreakdown ?? []).map((r) => <li key={r.label} className="flex justify-between gap-3"><span className="text-muted-foreground">{regionLabel(r.label)}</span><span className="text-right font-semibold">{r.count}<span className="block text-xs font-normal text-muted-foreground">{r.customers} customers</span></span></li>)}</ul></div>
    </div>
  </section>;
}
function Breakdown({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return <div><h3 className="mb-3 text-sm font-medium">{title}</h3><ul className="space-y-2 text-sm">{rows.map((r) => <li key={r.label} className="flex justify-between gap-3"><span className="capitalize text-muted-foreground">{r.label.replace(/[-_]/g, " ")}</span><span className="font-semibold">{r.count}</span></li>)}</ul></div>;
}

export function QuoteExport({ filters, months, selectedIds, allMatching, total }: { filters: ReportingFilters; months: string[]; selectedIds: string[]; allMatching: boolean; total: number }) {
  const prepare = useServerFn(prepareQuoteExport);
  const [scope, setScope] = useState("filtered");
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [dateFilters, setDateFilters] = useState<ReportingFilters>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState<{ blob: Blob; filename: string; count: number } | null>(null);
  const [open, setOpen] = useState(false);
  const selectionCount = allMatching ? total : selectedIds.length;
  const invalid = (scope === "selected" && !selectionCount) || (scope === "months" && !dateFilters.months?.length) || (scope === "range" && (!dateFilters.startDate || !dateFilters.endDate || dateFilters.startDate > dateFilters.endDate));
  const clearReady = () => { setReady(null); setError(""); };
  async function generate() {
    setBusy(true); clearReady();
    try {
      const exportFilters = scope === "all" || (scope === "selected" && !allMatching) ? {} : scope === "months" || scope === "range" ? { ...filters, months: scope === "months" ? dateFilters.months : [], startDate: scope === "range" ? dateFilters.startDate : undefined, endDate: scope === "range" ? dateFilters.endDate : undefined } : filters;
      const result = await prepare({ data: { filters: exportFilters, format, ...(scope === "selected" && !allMatching ? { ids: selectedIds } : {}) } });
      setReady({ ...result, blob: decodeExport(result.base64, result.mime) });
    } catch (e) { setError(e instanceof Error ? e.message : "Export could not be prepared."); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(v) => { setOpen(v); clearReady(); }}><DialogTrigger asChild><Button variant="outline"><Download className="size-4" />Export Quotes</Button></DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogTitle>Export quote requests</DialogTitle><DialogDescription>{total} matching quotes · {selectionCount} selected</DialogDescription>
    <Select value={scope} onValueChange={(v) => { setScope(v); setDateFilters({}); clearReady(); }}><SelectTrigger aria-label="Export scope"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All quotes</SelectItem><SelectItem value="filtered">Currently filtered quotes</SelectItem><SelectItem value="selected">Selected quotes</SelectItem><SelectItem value="months">Selected months</SelectItem><SelectItem value="range">Custom date range</SelectItem></SelectContent></Select>
    {(scope === "months" || scope === "range") && <DateFilters key={scope} initialMode={scope} value={dateFilters} availableMonths={months} onChange={(v) => { setDateFilters(v); clearReady(); }} />}
    <Select value={format} onValueChange={(v) => { setFormat(v as "csv" | "xlsx"); clearReady(); }}><SelectTrigger aria-label="Export format"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="csv">CSV</SelectItem><SelectItem value="xlsx">Excel (.xlsx)</SelectItem></SelectContent></Select>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {ready ? <Button onClick={() => void deliverFile(ready.blob, ready.filename)}><Download className="size-4" />Download {ready.count} quotes</Button> : <Button disabled={busy || invalid} onClick={() => void generate()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} {busy ? "Preparing…" : "Prepare export"}</Button>}
  </DialogContent></Dialog>;
}