import { SECTIONS, META_CAMPAIGN_METRICS, GOOGLE_CAMPAIGN_METRICS, formatMetric, googleDerived, momChange, quoteConversionRate, sumRows, breakdownIssue, isNum, filledColumns, type ReportData, type QuoteStats, type CampaignRow, type MetricDef } from "@/lib/marketing-report";

interface Props { data: ReportData; currency: string; highlights: string; quoteStats?: QuoteStats | null; prev?: { data: ReportData; quoteStats?: QuoteStats | null } | null }

function Change({ cur, prev }: { cur: unknown; prev: unknown }) {
  const c = momChange(cur as number, prev as number);
  if (c === null) return null;
  return <span className={`ml-2 text-xs font-medium ${c >= 0 ? "text-primary" : "text-destructive"}`}>{c >= 0 ? "▲" : "▼"} {Math.abs(c)}% vs last month</span>;
}

function Kpi({ label, value, cur, prev, note }: { label: string; value: string; cur?: unknown; prev?: unknown; note?: string }) {
  if (value === "Not entered" || value === "Not available") return null;
  const muted = false;
  return <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`mt-1 text-2xl font-semibold ${muted ? "text-base italic text-muted-foreground" : ""}`}>{value}</p>
    {prev !== undefined && <Change cur={cur} prev={prev} />}
    {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
  </div>;
}

function CampaignTable({ rows, metrics, currency, google }: { rows: CampaignRow[]; metrics: MetricDef[]; currency: string; google?: boolean }) {
  metrics = filledColumns(rows, metrics);
  if (!rows.length) return null;
  return <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm">
    <thead className="bg-muted/60 text-left"><tr><th className="p-2">Campaign</th>{metrics.map(m => <th key={m.key} className="whitespace-nowrap p-2 text-right">{m.label}</th>)}</tr></thead>
    <tbody>{rows.map(r => <tr key={r.id} className="border-t border-border align-top">
      <td className="p-2"><p className="font-medium">{r.name || "Untitled"}</p>{(r.sub || r.kind) && <p className="text-xs text-muted-foreground">{[r.sub, r.kind].filter(Boolean).join(" · ")}</p>}{r.resultType && isNum(r.values["costPerResult"]) && <p className="text-xs text-muted-foreground">Result: {r.resultType}</p>}{r.notes && <p className="mt-1 text-xs">{r.notes}</p>}{google && breakdownIssue(r) && <p className="mt-1 text-xs text-destructive">{breakdownIssue(r)}</p>}</td>
      {metrics.map(m => <td key={m.key} className="whitespace-nowrap p-2 text-right">{formatMetric(r.values[m.key], m.unit, currency)}</td>)}</tr>)}
      <tr className="border-t-2 border-border bg-muted/30 font-medium"><td className="p-2">Total of entered campaigns</td>{metrics.map(m => <td key={m.key} className="whitespace-nowrap p-2 text-right">{m.key === "costPerResult" ? "—" : formatMetric(sumRows(rows, m.key), m.unit, currency)}</td>)}</tr>
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
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const quoteLeads = quoteStats?.submissions ?? 0;
  const bookingLeads = num(s("booking")["bookings"]);
  const contactLeads = num(s("contact")["inquiries"]);
  const totalLeads = quoteLeads + bookingLeads + contactLeads;
  const prevTotal = prev ? (prev.quoteStats?.submissions ?? 0) + num(p("booking")?.["bookings"]) + num(p("contact")?.["inquiries"]) : undefined;
  const website = [...SECTIONS.find(x => x.key === "contact")!.metrics.map(m => ({ m, k: "contact" })), ...SECTIONS.find(x => x.key === "booking")!.metrics.map(m => ({ m, k: "booking" }))];
  const hasWebsite = website.some(({ m, k }) => isNum(s(k)[m.key])) || data.sections["contact"]?.notes || data.sections["booking"]?.notes;
  return <div className="space-y-8">
    <section className="rounded-2xl border-2 border-primary/40 bg-primary/10 p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Total leads</p>
      <p className="mt-1 text-5xl font-bold">{quoteStats ? totalLeads : "…"}</p>
      {prevTotal !== undefined && <Change cur={totalLeads} prev={prevTotal} />}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Quote submissions</p><p className="text-xl font-semibold">{quoteLeads}</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Appointment bookings</p><p className="text-xl font-semibold">{bookingLeads}</p></div>
        {contactLeads > 0 && <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Contact inquiries</p><p className="text-xl font-semibold">{contactLeads}</p></div>}
      </div>
    </section>
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

    {hasWebsite && <section><h2 className="text-lg font-semibold">Website leads & bookings</h2><p className="text-xs text-muted-foreground">Contact form and booking plugin, entered manually</p>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">{website.map(({ m, k }) => <Kpi key={k + m.key} label={m.label} value={formatMetric(s(k)[m.key], m.unit, currency)} cur={s(k)[m.key]} prev={prev ? p(k)?.[m.key] ?? null : undefined} />)}</div>
      {[data.sections["contact"]?.notes, data.sections["booking"]?.notes].filter(Boolean).map((n, i) => <p key={i} className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{n}</p>)}
    </section>}

    {SECTIONS.filter(x => !["meta","gads","contact","booking"].includes(x.key) && (x.metrics.some(m => isNum(s(x.key)[m.key])) || data.sections[x.key]?.notes)).map(sec => <section key={sec.key}>
      <h2 className="text-lg font-semibold">{sec.title}</h2><p className="text-xs text-muted-foreground">{sec.source}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">{sec.metrics.map(m => <Kpi key={m.key} label={m.label} value={formatMetric(s(sec.key)[m.key], m.unit, currency)} cur={s(sec.key)[m.key]} prev={prev ? p(sec.key)?.[m.key] ?? null : undefined} note={m.hint} />)}</div>
      {data.sections[sec.key]?.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{data.sections[sec.key]!.notes}</p>}
    </section>)}

    {(["meta", "gads"] as const).map(key => { const sec = SECTIONS.find(x => x.key === key)!; const camps = key === "meta" ? data.metaCampaigns : data.googleCampaigns; const hasSummary = sec.metrics.some(m => isNum(s(key)[m.key])); if (!hasSummary && !camps.length && !data.sections[key]?.notes) return null; return <section key={key}>
      <h2 className="text-lg font-semibold">{key === "meta" ? "Facebook / Meta Ads performance" : "Google Ads performance"}</h2><p className="text-xs text-muted-foreground">{sec.source}. Amounts in {currency}. Conversions are as reported by the ad platform.</p>
      {hasSummary && <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {sec.metrics.map(m => <Kpi key={m.key} label={m.label} value={formatMetric(s(key)[m.key], m.unit, currency)} cur={s(key)[m.key]} prev={prev ? p(key)?.[m.key] ?? null : undefined} />)}
        {key === "gads" && <><Kpi label="CTR (calculated)" value={formatMetric(g.ctr, "percent")} /><Kpi label="Average CPC (calculated)" value={formatMetric(g.cpc, "money", currency)} /><Kpi label="Cost per conversion (calculated)" value={formatMetric(g.costPerConversion, "money", currency)} /></>}
      </div>}
      {data.sections[key]?.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{data.sections[key]!.notes}</p>}
      {camps.length > 0 && <h3 className="mb-2 mt-4 text-sm font-semibold">Campaign breakdown</h3>}
      <CampaignTable rows={key === "meta" ? data.metaCampaigns : data.googleCampaigns} metrics={key === "meta" ? META_CAMPAIGN_METRICS : GOOGLE_CAMPAIGN_METRICS} currency={currency} google={key === "gads"} />
    </section>; })}

    <section className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">How to read these numbers</p>
      <p className="mt-1">Platform-reported conversions, website form inquiries, quote submissions, verified converted customers, completed appointments and tracked calls are kept separate. One customer may appear in several of them (for example: clicks an ad, then submits a quote), so the Total leads figure counts quote submissions, appointment bookings and contact inquiries only. Figures that were not provided are left out of this report.</p>
    </section>
  </div>;
}

export { isNum };
