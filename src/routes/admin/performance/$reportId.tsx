import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useId, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getReportDraft, saveReportDraft, publishReport, deleteReportDraft, getQuoteStatsForMonth } from "@/lib/marketing-reports.functions";
import { SECTIONS, META_CAMPAIGN_METRICS, GOOGLE_CAMPAIGN_METRICS, normalizeReportData, periodLabel, breakdownIssue, type ReportData, type MetricValue, type MetricDef, type CampaignRow } from "@/lib/marketing-report";
import { MarketingReportView } from "@/components/admin/MarketingReportView";

export const Route = createFileRoute("/admin/performance/$reportId")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Edit Marketing Report — Riverbend Autoglass" },
    { name: "description", content: "Prepare and publish a monthly marketing performance report." },
    { property: "og:title", content: "Edit Marketing Report — Riverbend Autoglass" },
    { property: "og:description", content: "Monthly marketing report editor." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: Editor,
});

function MetricInput({ def, value, onChange }: { def: MetricDef; value: MetricValue | undefined; onChange: (v: MetricValue) => void }) {
  const na = value === "na";
  const id = useId();
  const [text, setText] = useState(typeof value === "number" ? String(value) : "");
  const unit = def.unit === "money" ? "$" : def.unit === "percent" ? "%" : "";
  return <div className="space-y-1">
    <label htmlFor={id} className="text-xs font-medium">{def.label}{unit && <span className="text-muted-foreground"> ({unit})</span>}</label>
    <Input id={id} inputMode="decimal" disabled={na} value={na ? "" : text} placeholder={na ? "Not available" : "Not entered"}
      aria-invalid={text !== "" && !(Number(text) >= 0)}
      onChange={e => { const t = e.target.value; setText(t); if (t.trim() === "") onChange(null); else { const n = Number(t); if (Number.isFinite(n) && n >= 0) onChange(n); } }} />
    {text !== "" && !(Number(text) >= 0) && !na && <p className="text-xs text-destructive">Enter a number of 0 or more.</p>}
    <label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={na} onChange={e => { onChange(e.target.checked ? "na" : (text.trim() && Number(text) >= 0 ? Number(text) : null)); }} /> Not available</label>
    {def.hint && <p className="text-xs text-muted-foreground">{def.hint}</p>}
  </div>;
}

function Campaigns({ rows, metrics, onChange, kindLabel, subLabel, google }: { rows: CampaignRow[]; metrics: MetricDef[]; onChange: (r: CampaignRow[]) => void; kindLabel: string; subLabel: string; google?: boolean }) {
  const upd = (i: number, patch: Partial<CampaignRow>) => onChange(rows.map((r, j) => j === i ? { ...r, ...patch } : r));
  return <div className="space-y-3">
    {rows.map((r, i) => <div key={r.id} className="rounded-xl border border-border bg-background p-3">
      <div className="grid gap-2 md:grid-cols-3">
        <Input aria-label="Campaign name" placeholder="Campaign name" value={r.name} onChange={e => upd(i, { name: e.target.value })} />
        <Input aria-label={subLabel} placeholder={subLabel} value={r.sub} onChange={e => upd(i, { sub: e.target.value })} />
        <Input aria-label={kindLabel} placeholder={kindLabel} value={r.kind} onChange={e => upd(i, { kind: e.target.value })} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">{metrics.map(m => <MetricInput key={m.key} def={m} value={r.values[m.key]} onChange={v => upd(i, { values: { ...r.values, [m.key]: v } })} />)}</div>
      {google && breakdownIssue(r) && <p className="mt-2 text-xs text-destructive">{breakdownIssue(r)}</p>}
      <div className="mt-2 flex gap-2"><Textarea aria-label="Reporting notes" placeholder="Reporting notes" value={r.notes} onChange={e => upd(i, { notes: e.target.value })} />
        <Button variant="ghost" size="icon" aria-label="Remove campaign" onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 /></Button></div>
    </div>)}
    <Button variant="outline" onClick={() => onChange([...rows, { id: crypto.randomUUID(), name: "", sub: "", kind: "", notes: "", values: {} }])}><Plus /> Add campaign</Button>
  </div>;
}

function Editor() {
  const { reportId } = Route.useParams();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const getFn = useServerFn(getReportDraft); const saveFn = useServerFn(saveReportDraft);
  const publishFn = useServerFn(publishReport); const deleteFn = useServerFn(deleteReportDraft); const statsFn = useServerFn(getQuoteStatsForMonth);
  const q = useQuery({ queryKey: ["mkt-report", reportId], queryFn: () => getFn({ data: { id: reportId } }), retry: false });
  const [data, setData] = useState<ReportData | null>(null);
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  const [highlights, setHighlights] = useState("");
  const [dirty, setDirty] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => { if (q.data && !data) { setData(normalizeReportData(q.data.report.data)); setCurrency(q.data.report.currency === "USD" ? "USD" : "CAD"); setHighlights(q.data.report.highlights); } }, [q.data, data]);
  const r = q.data?.report;
  const stats = useQuery({ queryKey: ["mkt-stats", r?.period_year, r?.period_month], queryFn: () => statsFn({ data: { year: r!.period_year, month: r!.period_month } }), enabled: !!r });
  const refresh = () => { void cache.invalidateQueries({ queryKey: ["mkt-report", reportId] }); void cache.invalidateQueries({ queryKey: ["mkt-drafts"] }); void cache.invalidateQueries({ queryKey: ["mkt-published"] }); };
  const save = useMutation({ mutationFn: () => saveFn({ data: { id: reportId, currency, highlights, data: data! } }), onSuccess: () => { setDirty(false); toast.success("Draft saved"); refresh(); }, onError: e => toast.error(e.message) });
  const publish = useMutation({ mutationFn: async () => { await saveFn({ data: { id: reportId, currency, highlights, data: data! } }); return publishFn({ data: { id: reportId, note } }); },
    onSuccess: v => { setDirty(false); setPublishOpen(false); setNote(""); toast.success(`Published as version ${v.version}`); refresh(); }, onError: e => toast.error(e.message) });
  const del = useMutation({ mutationFn: () => deleteFn({ data: { id: reportId } }), onSuccess: () => { refresh(); navigate({ to: "/admin/performance" }); } });
  const edit = (fn: (d: ReportData) => ReportData) => { setData(d => d && fn(d)); setDirty(true); };
  const setVal = (sec: string, k: string, v: MetricValue) => edit(d => ({ ...d, sections: { ...d.sections, [sec]: { ...d.sections[sec]!, values: { ...d.sections[sec]!.values, [k]: v } } } }));
  const setNotes = (sec: string, n: string) => edit(d => ({ ...d, sections: { ...d.sections, [sec]: { ...d.sections[sec]!, notes: n } } }));

  if (q.error) return <main className="p-8"><Button asChild variant="ghost"><Link to="/admin/performance"><ArrowLeft /> Back</Link></Button><p role="alert" className="mt-4 text-destructive">{q.error.message}</p></main>;
  if (!r || !data) return <main className="p-8">Loading…</main>;

  return <main className="min-h-screen bg-muted/40 px-4 py-8 sm:px-8"><div className="mx-auto max-w-[1380px]">
    <Button asChild variant="ghost"><Link to="/admin/performance"><ArrowLeft /> Back to performance</Link></Button>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <h1 className="text-2xl font-semibold">{periodLabel(r.period_year, r.period_month)} report</h1>
      {r.current_version > 0 ? <Badge>Published v{r.current_version}</Badge> : <Badge variant="secondary">Draft — not visible to Riverbend</Badge>}
      {(dirty || (r.current_version > 0 && r.has_unpublished_changes)) && <Badge variant="outline">Unpublished changes</Badge>}
      <div className="ml-auto flex flex-wrap gap-2">
        {r.current_version === 0 && <Button variant="ghost" onClick={() => { if (confirm("Delete this unpublished draft?")) del.mutate(); }}>Delete draft</Button>}
        <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save draft"}</Button>
        <Button onClick={() => setPublishOpen(true)}>{r.current_version > 0 ? "Publish update" : "Publish"}</Button>
      </div>
    </div>
    <p className="mt-1 text-xs text-muted-foreground">Last updated {new Date(r.updated_at).toLocaleString("en-CA")}{r.updated_by_email ? ` by ${r.updated_by_email}` : ""}. Created by {r.created_by_email ?? "unknown"}.</p>

    <Tabs defaultValue="edit" className="mt-6">
      <TabsList><TabsTrigger value="edit">Enter data</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="history">Revision history</TabsTrigger></TabsList>
      <TabsContent value="edit" className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-4"><div className="flex flex-wrap items-end gap-4">
          <div><p className="mb-1 text-xs font-medium">Reporting currency</p><Select value={currency} onValueChange={v => { setCurrency(v === "USD" ? "USD" : "CAD"); setDirty(true); }}><SelectTrigger className="w-32" aria-label="Currency"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CAD">CAD</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select></div>
          <p className="text-xs text-muted-foreground">All money in this report uses one currency. Values are not converted between CAD and USD.</p></div>
          <p className="mb-1 mt-4 text-xs font-medium">Highlights & notes for Riverbend</p><Textarea value={highlights} onChange={e => { setHighlights(e.target.value); setDirty(true); }} placeholder="Key wins, changes, next steps…" />
        </section>
        <section className="rounded-xl border border-border bg-card p-4"><h2 className="font-semibold">Quote App (automatic)</h2>
          <p className="text-sm text-muted-foreground">{stats.data ? `${stats.data.submissions} quotes, ${stats.data.uniqueCustomers} unique customers, ${stats.data.converted} converted, ${stats.data.notConverted} not converted, ${stats.data.pending} pending.` : "Loading…"} These figures come from the quote system and cannot be edited here.</p></section>
        {SECTIONS.map(sec => <section key={sec.key} className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold">{sec.title}</h2><p className="text-xs text-muted-foreground">{sec.source}</p>
          <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">{sec.metrics.map(m => <MetricInput key={m.key} def={m} value={data.sections[sec.key]?.values[m.key]} onChange={v => setVal(sec.key, m.key, v)} />)}</div>
          <Textarea className="mt-3" aria-label={`${sec.title} notes`} placeholder="Notes (optional)" value={data.sections[sec.key]?.notes ?? ""} onChange={e => setNotes(sec.key, e.target.value)} />
          {sec.key === "meta" && <div className="mt-4"><h3 className="mb-2 text-sm font-semibold">Meta campaigns / ads</h3><Campaigns rows={data.metaCampaigns} metrics={META_CAMPAIGN_METRICS} subLabel="Ad name (optional)" kindLabel="Campaign objective" onChange={rows => edit(d => ({ ...d, metaCampaigns: rows }))} /></div>}
          {sec.key === "gads" && <div className="mt-4"><h3 className="mb-2 text-sm font-semibold">Google Ads campaigns</h3><p className="mb-2 text-xs text-muted-foreground">Conversion breakdown should not add up to more than total conversions.</p><Campaigns google rows={data.googleCampaigns} metrics={GOOGLE_CAMPAIGN_METRICS} subLabel="Ad group / note (optional)" kindLabel="Campaign type" onChange={rows => edit(d => ({ ...d, googleCampaigns: rows }))} /></div>}
        </section>)}
      </TabsContent>
      <TabsContent value="preview"><p className="mb-4 text-sm text-muted-foreground">This is how Riverbend will see the report once published.</p><MarketingReportView data={data} currency={currency} highlights={highlights} quoteStats={stats.data ?? null} /></TabsContent>
      <TabsContent value="history">{!q.data?.versions.length ? <p className="text-sm text-muted-foreground">Not published yet.</p> :
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">{q.data.versions.map(v => <li key={v.id} className="p-3 text-sm"><span className="font-medium">Version {v.version}</span> · {new Date(v.published_at).toLocaleString("en-CA")} · {v.published_by_email}{v.change_note && <p className="text-muted-foreground">{v.change_note}</p>}</li>)}</ul>}
        <p className="mt-2 text-xs text-muted-foreground">Every published version is kept permanently.</p></TabsContent>
    </Tabs>

    <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{r.current_version > 0 ? "Publish updated figures?" : "Publish this report?"}</AlertDialogTitle>
        <AlertDialogDescription>Riverbend will be able to see this {periodLabel(r.period_year, r.period_month)} report.{r.current_version > 0 ? " The previous version is kept in the history." : ""}</AlertDialogDescription></AlertDialogHeader>
      <Textarea placeholder={r.current_version > 0 ? "What changed? (shown to Riverbend)" : "Note (optional)"} value={note} onChange={e => setNote(e.target.value)} />
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={e => { e.preventDefault(); publish.mutate(); }} disabled={publish.isPending}>{publish.isPending ? "Publishing…" : "Publish"}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </div></main>;
}
