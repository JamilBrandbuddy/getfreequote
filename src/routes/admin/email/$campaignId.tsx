import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Monitor, Smartphone, Send, Save, Users, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAdminSession } from "@/lib/admin.functions";
import { getCampaign, getEmailOverview, saveCampaign, previewAudience, sendTestEmail, getSendReadiness, confirmAndSend, processCampaignBatch, type Audience } from "@/lib/campaigns.functions";
import { listCustomers } from "@/lib/customers.functions";
import { MESSAGE_TYPE_LABELS, renderEmail, renderSignature, ctaButtonHtml, type MessageType } from "@/lib/email-campaign";
import { SEGMENT_LABELS, type CustomerSegment } from "@/lib/conversion";
import { RichEmailEditor } from "@/components/admin/RichEmailEditor";
import { RegionFilter } from "@/components/admin/QuoteReporting";
import { Field } from "@/components/admin/Field";

export const Route = createFileRoute("/admin/email/$campaignId")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Email Campaign — Riverbend Autoglass Admin" }, { name: "description", content: "Compose, preview, test and send a Riverbend Autoglass email campaign." },
    { name: "robots", content: "noindex, nofollow" }, { property: "og:title", content: "Email Campaign — Riverbend Autoglass" },
    { property: "og:description", content: "Riverbend Autoglass email campaign editor." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CampaignPage,
});

const STATUSES = ["new", "contacted", "awaiting-information", "estimating", "quote-sent", "appointment-requested", "booked", "completed", "lost", "spam"];
const months = () => { const out: string[] = []; const d = new Date(); for (let i = 0; i < 18; i++) { const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)); out.push(m.toISOString().slice(0, 7)); } return out; };
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
type Draft = { name: string; message_type: MessageType; subject: string; preview_text: string; body_html: string; signature_id: string | null; audience: Audience };

function CampaignPage() {
  const { campaignId } = Route.useParams(); const navigate = useNavigate();
  const fetchSession = useServerFn(getAdminSession); const fetchCampaign = useServerFn(getCampaign); const fetchOverview = useServerFn(getEmailOverview);
  const fetchCustomers = useServerFn(listCustomers);
  const save = useServerFn(saveCampaign); const runAudience = useServerFn(previewAudience); const runTest = useServerFn(sendTestEmail);
  const runReady = useServerFn(getSendReadiness); const runConfirm = useServerFn(confirmAndSend); const runBatch = useServerFn(processCampaignBatch);
  const session = useQuery({ queryKey: ["admin-session"], queryFn: () => fetchSession({}), retry: false });
  useEffect(() => { if (session.isError) void navigate({ to: "/admin/login", replace: true }); }, [session.isError, navigate]);
  const ok = session.data?.canOperate === true;
  const camp = useQuery({ queryKey: ["campaign", campaignId], queryFn: () => fetchCampaign({ data: { id: campaignId } }), enabled: ok });
  const ov = useQuery({ queryKey: ["email-overview"], queryFn: () => fetchOverview({}), enabled: ok });
  const svc = useQuery({ queryKey: ["customer-services"], queryFn: () => fetchCustomers({ data: { page: 0 } }), enabled: ok });
  const SERVICES = svc.data?.services ?? [];
  const [d, setD] = useState<Draft | null>(null); const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState(false);
  useEffect(() => { const c = camp.data?.campaign; if (c && !d) setD({ name: c.name, message_type: c.message_type, subject: c.subject, preview_text: c.preview_text, body_html: c.body_html, signature_id: c.signature_id, audience: { mode: "filters", months: [], regions: [], service: "all", status: "all", segment: "all", customerIds: [], ...c.audience } }); }, [camp.data, d]);
  const set = (p: Partial<Draft>) => { setD((s) => (s ? { ...s, ...p } : s)); setDirty(true); };
  const setA = (p: Partial<Audience>) => set({ audience: { ...d!.audience, ...p } });
  const [aud, setAud] = useState<Awaited<ReturnType<typeof runAudience>> | null>(null); const [audBusy, setAudBusy] = useState(false);
  const [view, setView] = useState<"desktop" | "mobile">("desktop"); const [sampleIdx, setSampleIdx] = useState(0);
  const [testTo, setTestTo] = useState(""); const [testBusy, setTestBusy] = useState(false);
  const [ready, setReady] = useState<Awaited<ReturnType<typeof runReady>> | null>(null); const [confirmOpen, setConfirmOpen] = useState(false); const [typed, setTyped] = useState("");
  const [progress, setProgress] = useState<{ sent: number; failed: number; total: number; status: string } | null>(null);
  useEffect(() => { if (session.data?.email && !testTo) setTestTo(session.data.email); }, [session.data, testTo]);

  const doSave = async () => { if (!d) return false; setSaving(true); try { await save({ data: { id: campaignId, ...d } }); setDirty(false); toast.success("Draft saved"); return true; } catch (e) { toast.error(errMsg(e)); return false; } finally { setSaving(false); } };
  const checkAudience = async () => { if (!d) return; setAudBusy(true); try { setAud(await runAudience({ data: { audience: d.audience, message_type: d.message_type } })); setSampleIdx(0); } catch (e) { toast.error(errMsg(e)); } finally { setAudBusy(false); } };
  useEffect(() => { if (d) void checkAudience(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [JSON.stringify(d?.audience), d?.message_type]);

  const settings = ov.data?.settings; const sig = ov.data?.signatures.find((s: any) => s.id === d?.signature_id);
  const eligibleSample = aud?.sample.filter((s) => s.eligible) ?? [];
  const sample = eligibleSample[sampleIdx] ?? { name: "Alex Sample", email: "alex@example.com" };
  const html = useMemo(() => !d ? "" : renderEmail({ subject: d.subject, previewText: d.preview_text, senderName: settings?.sender_name ?? "Riverbend Autoglass Inc.", mailingAddress: settings?.mailing_address ?? null, unsubscribeUrl: "https://quotes.riverbendautoglass.ca/unsubscribe/preview",
    signatureHtml: sig ? renderSignature(sig) : null, vars: { customer_name: sample.name, service_type: null },
    bodyHtml: d.body_html.replace(/\{\{\s*google_review_button\s*\}\}/g, settings?.google_review_url ? ctaButtonHtml("Leave a Google review", settings.google_review_url) : '<p style="color:#b91c1c">[Google review link not set]</p>').replace(/\{\{\s*facebook_review_button\s*\}\}/g, settings?.facebook_review_url ? ctaButtonHtml("Share feedback on Facebook", settings.facebook_review_url) : '<p style="color:#b91c1c">[Facebook review link not set]</p>') }), [d, settings, sig, sample.name]);

  const sendTest = async () => { if (dirty && !(await doSave())) return; setTestBusy(true); try { const r = await runTest({ data: { id: campaignId, to: testTo } }); r.ok ? toast.success(`Test email sent to ${testTo}`) : toast.error(r.error ?? "Test failed"); void camp.refetch(); } catch (e) { toast.error(errMsg(e)); } finally { setTestBusy(false); } };
  const review = async () => { if (dirty && !(await doSave())) return; try { setReady(await runReady({ data: { id: campaignId } })); } catch (e) { toast.error(errMsg(e)); } };
  const pump = async () => { for (;;) { const r = await runBatch({ data: { id: campaignId } }); if ("total" in r) setProgress({ sent: r.sent ?? 0, failed: r.failed ?? 0, total: r.total ?? 0, status: r.status }); if (r.done) break; } void camp.refetch(); };
  const send = async () => { try { await runConfirm({ data: { id: campaignId, confirmCount: ready!.summary.eligible } }); setConfirmOpen(false); await pump(); } catch (e) { toast.error(errMsg(e)); } };

  if (session.isPending || (ok && (camp.isPending || !d))) return <main className="grid min-h-screen place-items-center">{camp.isError ? <p role="alert">Campaign not found.</p> : <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />}</main>;
  if (!ok) return <main className="grid min-h-screen place-items-center p-4 text-center"><h1 className="text-xl font-semibold">This account has no dashboard access</h1></main>;
  const c = camp.data!.campaign; const locked = c.status !== "draft";
  const S = aud?.summary;

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-[1380px] space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div><Link to="/admin/email" className="text-sm text-primary hover:underline">← All campaigns</Link><h1 className="mt-1 text-2xl font-semibold">{d!.name || "Untitled campaign"}</h1>
            <p className="text-sm text-muted-foreground">Create → Save draft → Preview → Test → Review recipients → Confirm & send · Status: <strong>{c.status}</strong></p></div>
          {!locked && <Button onClick={doSave} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{dirty ? "Save draft" : "Saved"}</Button>}
        </header>

        {locked ? <SentView campaign={c} recipients={camp.data!.recipients} onResume={pump} progress={progress} /> : (<>
        <Card title="1. Campaign details">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Campaign name"><Input value={d!.name} onChange={(e) => set({ name: e.target.value })} /></Field>
            <Field label="Message type" hint="Decides which consent rules apply."><Select value={d!.message_type} onValueChange={(v) => set({ message_type: v as MessageType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MESSAGE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Subject line"><Input value={d!.subject} maxLength={200} onChange={(e) => set({ subject: e.target.value })} placeholder="e.g. Get your windshield winter-ready" /></Field>
            <Field label="Preview text" hint="Shown next to the subject in the inbox."><Input value={d!.preview_text} maxLength={200} onChange={(e) => set({ preview_text: e.target.value })} /></Field>
          </div>
          {d!.message_type === "review_request" && <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">Review requests must ask every eligible customer for honest feedback. Don't offer rewards and don't only ask happy customers. Use {"{{google_review_button}}"} or {"{{facebook_review_button}}"} to insert the verified links from Settings.</p>}
        </Card>

        <Card title="2. Write the email">
          <RichEmailEditor value={d!.body_html} onChange={(h) => set({ body_html: h })} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Signature" hint="Sender details and unsubscribe link are always added, even without a signature.">
            <Select value={d!.signature_id ?? "none"} onValueChange={(v) => set({ signature_id: v === "none" ? null : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No signature</SelectItem>{ov.data?.signatures.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}{s.is_default ? " (default)" : ""}</SelectItem>)}</SelectContent></Select></Field></div>
        </Card>

        <Card title="3. Choose recipients">
          <div className="flex flex-wrap gap-2">{(["filters", "manual"] as const).map((m) => <Button key={m} size="sm" variant={d!.audience.mode === m ? "default" : "outline"} onClick={() => setA({ mode: m })}>{m === "filters" ? "By filters" : "Pick customers manually"}</Button>)}</div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <Select value={d!.audience.segment} onValueChange={(v) => setA({ segment: v as Audience["segment"] })}><SelectTrigger aria-label="Conversion segment"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All conversion segments</SelectItem>{(Object.keys(SEGMENT_LABELS) as CustomerSegment[]).map((k) => <SelectItem key={k} value={k}>{SEGMENT_LABELS[k]}</SelectItem>)}</SelectContent></Select>
            <Select value={d!.audience.status} onValueChange={(v) => setA({ status: v })}><SelectTrigger aria-label="Quote status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All quote statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/-/g, " ")}</SelectItem>)}</SelectContent></Select>
            <Select value={d!.audience.service} onValueChange={(v) => setA({ service: v })}><SelectTrigger aria-label="Service"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All services</SelectItem>{SERVICES.map((s) => <SelectItem key={s} value={s}>{s.replace(/[-_]/g, " ")}</SelectItem>)}</SelectContent></Select>
            <RegionFilter value={d!.audience.regions} onChange={(regions) => setA({ regions })} />
          </div>
          <div className="mt-3"><p className="mb-1 text-sm font-medium">Months (quote date)</p><div className="flex flex-wrap gap-1.5">{months().map((m) => { const on = d!.audience.months.includes(m); return <Button key={m} size="sm" variant={on ? "default" : "outline"} className="h-8 rounded-full" aria-pressed={on} onClick={() => setA({ months: on ? d!.audience.months.filter((x) => x !== m) : [...d!.audience.months, m] })}>{m}</Button>; })}</div></div>
          {d!.audience.mode === "manual" && <ManualPicker selected={d!.audience.customerIds} onChange={(customerIds) => setA({ customerIds })} />}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{audBusy && !S ? <Loader2 className="size-5 animate-spin" /> : S && ([["Selected contacts", S.selectedContacts], ["No email", S.withoutEmail], ["Valid emails", S.validEmails], ["Duplicates removed", S.duplicatesRemoved], ["Eligible", S.eligible], ["Unsubscribed / suppressed", S.suppressed], ["No consent on record", S.noConsent]] as const).map(([l, v]) => <div key={l} className={`rounded-xl border border-border p-3 ${l === "Eligible" ? "bg-primary/10" : "bg-background"}`}><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-semibold">{v}</p></div>)}</div>
          <p className="mt-2 text-xs text-muted-foreground">Only customers with proven consent (quote-form opt-in or a recorded consent) can get promotions or follow-ups. Review requests may also go to verified converted customers within 2 years. Everyone else is left out automatically.</p>
          {aud && aud.sample.length > 0 && <details className="mt-3"><summary className="cursor-pointer text-sm text-primary">See recipient list ({aud.sample.length}{aud.sample.length === 200 ? "+" : ""})</summary>
            <ul className="mt-2 max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-background text-sm">{aud.sample.map((r) => <li key={r.email} className="flex flex-wrap justify-between gap-2 p-2"><span>{r.name} · {r.email}</span><span className={r.eligible ? "text-primary" : "text-muted-foreground"}>{r.eligible ? r.detail : r.detail === "no_consent" ? "Excluded — no consent" : r.detail === "suppressed" ? "Excluded — unsubscribed" : "Excluded"}</span></li>)}</ul></details>}
        </Card>

        <Card title="4. Preview">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant={view === "desktop" ? "default" : "outline"} onClick={() => setView("desktop")}><Monitor className="size-4" />Desktop</Button>
            <Button size="sm" variant={view === "mobile" ? "default" : "outline"} onClick={() => setView("mobile")}><Smartphone className="size-4" />Mobile</Button>
            {eligibleSample.length > 0 && <Select value={String(sampleIdx)} onValueChange={(v) => setSampleIdx(Number(v))}><SelectTrigger className="w-64" aria-label="Preview as recipient"><SelectValue /></SelectTrigger><SelectContent>{eligibleSample.slice(0, 50).map((s, i) => <SelectItem key={s.email} value={String(i)}>Preview as {s.name}</SelectItem>)}</SelectContent></Select>}
          </div>
          <p className="text-sm"><strong>Subject:</strong> {d!.subject || <em className="text-destructive">missing</em>} <span className="text-muted-foreground">— {d!.preview_text}</span></p>
          <div className="mt-2 flex justify-center rounded-xl bg-muted p-3"><iframe title="Email preview" sandbox="allow-popups" srcDoc={html} className="h-[640px] rounded-lg border border-border bg-background" style={{ width: view === "mobile" ? 375 : "100%" }} /></div>
        </Card>

        <Card title="5. Send a test">
          <div className="flex flex-wrap gap-2"><Input className="max-w-sm" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} aria-label="Test email address" />
            <Button variant="outline" onClick={sendTest} disabled={testBusy}>{testBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Send test</Button></div>
          <p className="mt-1 text-xs text-muted-foreground">Tests go only to your own login email or internal addresses saved in Settings. {c.last_test_at ? `Last test: ${new Date(c.last_test_at).toLocaleString("en-CA")} to ${c.last_test_to}` : "No test sent yet."}</p>
        </Card>

        <Card title="6. Review & send">
          <Button onClick={review}><Users className="size-4" />Review before sending</Button>
          {ready && <div className="mt-3 space-y-2">
            {ready.issues.length ? <ul className="space-y-1 text-sm">{ready.issues.map((i) => <li key={i} className="flex gap-2 text-destructive"><AlertTriangle className="size-4 shrink-0" />{i}</li>)}</ul>
              : <p className="flex gap-2 text-sm text-primary"><CheckCircle2 className="size-4" />Ready. {ready.summary.eligible} eligible recipients.</p>}
            <Button disabled={!!ready.issues.length} onClick={() => { setTyped(""); setConfirmOpen(true); }}><Send className="size-4" />Confirm & send…</Button></div>}
        </Card>
        </>)}
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Send to {ready?.summary.eligible} customers?</AlertDialogTitle>
        <AlertDialogDescription>This sends real emails and cannot be undone. Type the number of recipients ({ready?.summary.eligible}) to confirm.</AlertDialogDescription></AlertDialogHeader>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Type recipient count to confirm" />
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={typed !== String(ready?.summary.eligible)} onClick={(e) => { e.preventDefault(); void send(); }}>Send now</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="mb-3 text-lg font-semibold">{title}</h2>{children}</section>; }

function ManualPicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const fetchList = useServerFn(listCustomers); const [search, setSearch] = useState(""); const [page, setPage] = useState(0);
  const q = useQuery({ queryKey: ["pick-customers", search, page], queryFn: () => fetchList({ data: { search, page } }) });
  return <div className="mt-3 rounded-xl border border-border bg-background p-3">
    <div className="flex items-center gap-2"><Input placeholder="Search customers" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} aria-label="Search customers to add" /><span className="whitespace-nowrap text-sm">{selected.length} picked</span></div>
    <ul className="mt-2 max-h-64 divide-y divide-border overflow-y-auto text-sm">{q.data?.rows.map((c) => <li key={c.id} className="flex items-center gap-2 p-2"><Checkbox checked={selected.includes(c.id)} aria-label={`Pick ${c.name}`} onCheckedChange={(v) => onChange(v ? [...selected, c.id] : selected.filter((x) => x !== c.id))} /><span>{c.name}</span><span className="text-muted-foreground">{c.emails[0] ?? "no email"}</span></li>)}</ul>
    <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" disabled={!page} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={!q.data || (page + 1) * 25 >= q.data.total} onClick={() => setPage(page + 1)}>Next</Button></div></div>;
}

function SentView({ campaign, recipients, onResume, progress }: { campaign: any; recipients: any[]; onResume: () => void; progress: { sent: number; failed: number; total: number } | null }) {
  const total = progress?.total ?? campaign.recipient_count; const sent = progress?.sent ?? campaign.sent_count; const failed = progress?.failed ?? campaign.failed_count;
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
    <h2 className="text-lg font-semibold">Delivery progress</h2>
    <Progress value={total ? ((sent + failed) / total) * 100 : 0} />
    <p className="text-sm">{sent} sent to the email service · {failed} failed · {total} total · Delivered: {campaign.delivered_count ?? "not reported by provider"} · Unsubscribed: {campaign.unsubscribed_count}</p>
    {campaign.status === "sending" && <Button onClick={onResume}>Continue sending</Button>}
    <ul className="max-h-96 divide-y divide-border overflow-y-auto rounded-xl border border-border text-sm">{recipients.map((r) => <li key={r.email} className="flex flex-wrap justify-between gap-2 p-2"><span>{r.email}</span><span className={r.status === "failed" ? "text-destructive" : "text-muted-foreground"}>{r.status}{r.last_error ? ` — ${r.last_error}` : ""}</span></li>)}</ul>
  </section>;
}
