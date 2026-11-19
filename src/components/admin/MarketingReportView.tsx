import { SECTIONS, META_CAMPAIGN_METRICS, GOOGLE_CAMPAIGN_METRICS, formatMetric, googleDerived, momChange, quoteConversionRate, sumRows, breakdownIssue, isNum, type ReportData, type QuoteStats, type CampaignRow, type MetricDef } from "@/lib/marketing-report";

interface Props { data: ReportData; currency: string; highlights: string; quoteStats?: QuoteStats | null; prev?: { data: ReportData; quoteStats?: QuoteStats | null } | null }

function Change({ cur, prev }: { cur: unknown; prev: unknown }) {
  const c = momChange(cur as number, prev as number);
  if (c === null) return null;
  return <span className={`ml-2 text-xs font-medium ${c >= 0 ? "text-primary" : "text-destructive"}`}>{c >= 0 ? "▲" : "▼"} {Math.abs(c)}% vs last month</span>;
}

function Kpi({ label, value, cur, prev, note }: { label: string; value: string; cur?: unknown; prev?: unknown; note?: string }) {
  const muted = value === "Not entered" || value === "Not available";
  return <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`mt-1 text-2xl font-semibold ${muted ? "text-base italic text-muted-foreground" : ""}`}>{value}</p>
    {prev !== undefined && <Change cur={cur} prev={prev} />}
    {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
  </div>;
}

function CampaignTable({ rows, metrics, currency, google }: { rows: CampaignRow[]; metrics: MetricDef[]; currency: string; google?: boolean }) {
  if (!rows.length) return <p className="text-sm italic text-muted-foreground">No campaigns entered.</p>;
  return <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm">
    <thead className="bg-muted/60 text-left"><tr><th className="p-2">Campaign</th>{metrics.map(m => <th key={m.key} className="whitespace-nowrap p-2 text-right">{m.label}</th>)}</tr></thead>
    <tbody>{rows.map(r => <tr key={r.id} className="border-t border-border align-top">
      <td className="p-2"><p className="font-medium">{r.name || "Untitled"}</p>{(r.sub || r.kind) && <p className="text-xs text-muted-foreground">{[r.sub, r.kind].filter(Boolean).join(" · ")}</p>}{r.notes && <p className="mt-1 text-xs">{r.notes}</p>}{google && breakdownIssue(r) && <p className="mt-1 text-xs text-destructive">{breakdownIssue(r)}</p>}</td>
      {metrics.map(m => <td key={m.key} className="whitespace-nowrap p-2 text-right">{formatMetric(r.values[m.key], m.unit, currency)}</td>)}</tr>)}
      <tr className="border-t-2 border-border bg-muted/30 font-medium"><td className="p-2">Total of entered campaigns</td>{metrics.map(m => <td key={m.key} className="whitespace-nowrap p-2 text-right">{formatMetric(sumRows(rows, m.key), m.unit, currency)}</td>)}</tr>
    </tbody></table>
    {!google && <p className="p-2 text-xs text-muted-foreground">Reach total adds campaign reach together; people may be counted in more than one campaign, so this is not unique account reach.</p>}
  </div>;
}

export function MarketingReportView({ data, currency, highlights, quoteStats, prev }: Props) {
  const s = (k: string) => data.sections[k]?.values ?? {};
  const p = (k: string) => prev?.data.sections[k]?.values;
  const rate = quoteStats ? quoteConversionRate(quoteStats) : null;
  const prevRate = prev?.quoteStats ? quoteConversionRate(prev.quoteStats) : null;
  const g = googleDerived(s("gads"));
  return <div className="space-y-8">
    {highlights.trim() && <section className="rounded-xl border border-primary/30 bg-primary/5 p-5"><h2 className="font-semibold">Highlights & notes</h2><p className="mt-2 whitespace-pre-wrap text-sm">{highlights}</p></section>}

    <section><h2 className="text-lg font-semibold">Quote App performance</h2><p className="text-xs text-muted-foreground">Calculated automatically from submitted quotes (Regina time). Conversion rate = verified converted ÷ valid non-spam quotes.</p>
      {!quoteStats ? <p className="mt-3 text-sm text-muted-foreground">Loading quote figures…</p> : <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Quote submissions" value={String(quoteStats.submissions)} cur={quoteStats.submissions} prev={prev ? prev.quoteStats?.submissions ?? null : undefined} note={quoteStats.spam ? `${quoteStats.spam} spam` : undefined} />
        <Kpi label="Unique customers" value={String(quoteStats.uniqueCustomers)} cur={quoteStats.uniqueCustomers} prev={prev ? prev.quoteStats?.uniqueCustomers ?? null : undefined} />
        <Kpi label="Converted" value={String(quoteStats.converted)} cur={quoteStats.converted} prev={prev ? prev.quoteStats?.converted ?? null : undefined} />
        <Kpi label="Not converted" value={String(quoteStats.notConverted)} />
        <Kpi label="Pending" value={String(quoteStats.pending)} />
        <Kpi label="Conversion rate" value={rate === null ? "Not available" : `${rate}%`} cur={rate} prev={prev ? prevRate : undefined} />
      </div>}
    </section>

    {SECTIONS.filter(x => x.key !== "meta" && x.key !== "gads").map(sec => <section key={sec.key}>
      <h2 className="text-lg font-semibold">{sec.title}</h2><p className="text-xs text-muted-foreground">{sec.source}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">{sec.metrics.map(m => <Kpi key={m.key} label={m.label} value={formatMetric(s(sec.key)[m.key], m.unit, currency)} cur={s(sec.key)[m.key]} prev={prev ? p(sec.key)?.[m.key] ?? null : undefined} note={m.hint} />)}</div>
      {data.sections[sec.key]?.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{data.sections[sec.key]!.notes}</p>}
    </section>)}

    {(["meta", "gads"] as const).map(key => { const sec = SECTIONS.find(x => x.key === key)!; return <section key={key}>
      <h2 className="text-lg font-semibold">{key === "meta" ? "Facebook / Meta Ads performance" : "Google Ads performance"}</h2><p className="text-xs text-muted-foreground">{sec.source}. Amounts in {currency}. Conversions are as reported by the ad platform.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {sec.metrics.map(m => <Kpi key={m.key} label={m.label} value={formatMetric(s(key)[m.key], m.unit, currency)} cur={s(key)[m.key]} prev={prev ? p(key)?.[m.key] ?? null : undefined} />)}
        {key === "gads" && <><Kpi label="CTR (calculated)" value={formatMetric(g.ctr, "percent")} /><Kpi label="Average CPC (calculated)" value={formatMetric(g.cpc, "money", currency)} /><Kpi label="Cost per conversion (calculated)" value={formatMetric(g.costPerConversion, "money", currency)} /></>}
      </div>
      {data.sections[key]?.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{data.sections[key]!.notes}</p>}
      <h3 className="mb-2 mt-4 text-sm font-semibold">Campaign breakdown</h3>
      <CampaignTable rows={key === "meta" ? data.metaCampaigns : data.googleCampaigns} metrics={key === "meta" ? META_CAMPAIGN_METRICS : GOOGLE_CAMPAIGN_METRICS} currency={currency} google={key === "gads"} />
    </section>; })}

    <section className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">How to read these numbers</p>
      <p className="mt-1">Platform-reported conversions, website form inquiries, quote submissions, verified converted customers, completed appointments and tracked calls are kept separate. One customer may appear in several of them (for example: clicks an ad, then submits a quote), so they are not added into one lead total. "Not entered" means no figure was provided; "Not available" means the source did not report it.</p>
    </section>
  </div>;
}

export { isNum };
