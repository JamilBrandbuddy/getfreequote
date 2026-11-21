import { AdminBackNav } from "@/components/admin/AdminBackNav";
import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mail, Plus, Trash2, Copy, Pencil, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/Field";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAdminSession } from "@/lib/admin.functions";
import { getEmailOverview, saveCampaign, deleteCampaign, saveTemplate, deleteTemplate, addStarterTemplates, saveSignature, deleteSignature, saveEmailSettings, addSuppression, recordConsent } from "@/lib/campaigns.functions";
import { MESSAGE_TYPE_LABELS, TEMPLATE_CATEGORIES, renderSignature, type TemplateCategory, type MessageType } from "@/lib/email-campaign";
import { RichEmailEditor } from "@/components/admin/RichEmailEditor";

export const Route = createFileRoute("/admin/email/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Bulk Email Campaigns — Riverbend Autoglass Admin" },
    { name: "description", content: "Create, review and send compliant email campaigns to Riverbend Autoglass customers." },
    { name: "robots", content: "noindex, nofollow" },
    { property: "og:title", content: "Bulk Email Campaigns — Riverbend Autoglass" },
    { property: "og:description", content: "Riverbend Autoglass email campaigns." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: EmailPage,
});

const STATUS_LABEL: Record<string, string> = { draft: "Draft", queued: "Queued", sending: "Sending", sent: "Sent", partially_failed: "Partly failed", failed: "Failed", cancelled: "Cancelled" };
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("en-CA", { timeZone: "America/Regina", dateStyle: "medium", timeStyle: "short" }) : "—");
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

function EmailPage() {
  const navigate = useNavigate(); const qc = useQueryClient();
  const fetchSession = useServerFn(getAdminSession); const fetchOverview = useServerFn(getEmailOverview);
  const createCampaign = useServerFn(saveCampaign); const removeCampaign = useServerFn(deleteCampaign);
  const session = useQuery({ queryKey: ["admin-session"], queryFn: () => fetchSession({}), retry: false });
  useEffect(() => { if (session.isError) void navigate({ to: "/admin/login", replace: true }); }, [session.isError, navigate]);
  const ov = useQuery({ queryKey: ["email-overview"], queryFn: () => fetchOverview({}), enabled: session.data?.canOperate === true });
  const refresh = () => qc.invalidateQueries({ queryKey: ["email-overview"] });
  const [creating, setCreating] = useState(false);

  if (session.isPending) return <main className="grid min-h-screen place-items-center"><Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" /></main>;
  if (session.data && !session.data.canOperate) return <main className="grid min-h-screen place-items-center p-4 text-center"><h1 className="text-xl font-semibold">This account has no dashboard access</h1></main>;
  const d = ov.data;

  const newCampaign = async (tpl?: { name: string; subject: string; preview_text: string; body_html: string; category: string }) => {
    setCreating(true);
    try {
      const type: MessageType = tpl && /review/.test(tpl.category) ? "review_request" : tpl?.category === "follow_up" ? "follow_up" : "promotional";
      const r = await createCampaign({ data: { name: tpl ? `${tpl.name} — ${new Date().toLocaleDateString("en-CA")}` : "Untitled campaign", message_type: type, subject: tpl?.subject ?? "", preview_text: tpl?.preview_text ?? "", body_html: tpl?.body_html ?? "<p>Hi {{customer_name}},</p><p></p>", signature_id: d?.signatures.find((s: any) => s.is_default)?.id ?? null, audience: { mode: "filters", months: [], regions: [], service: "all", status: "all", segment: type === "review_request" ? "converted" : "all", customerIds: [] } } });
      void navigate({ to: "/admin/email/$campaignId", params: { campaignId: r.id } });
    } catch (e) { toast.error(errMsg(e)); setCreating(false); }
  };

  const drafts = (d?.campaigns ?? []).filter((c: any) => c.status === "draft");
  const history = (d?.campaigns ?? []).filter((c: any) => c.status !== "draft");
  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-[1380px]">
        <AdminBackNav />
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-2xl font-semibold text-foreground">Bulk Email Campaigns</h1><p className="mt-1 text-sm text-muted-foreground">Write, test and send compliant emails to eligible customers.</p></div>
          <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="h-11 rounded-xl"><Link to="/admin/customers">All Customers</Link></Button>
            <Button className="h-11 rounded-xl" disabled={creating || !d} onClick={() => newCampaign()}>{creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}Create campaign</Button>
          </div>
        </header>
        {d && !d.provider.configured && (
          <div role="status" className="mt-6 flex gap-3 rounded-2xl border border-accent bg-accent/10 p-4 text-sm"><ShieldAlert className="size-5 shrink-0 text-accent-foreground" />
            <p><strong>Sending is switched off.</strong> A dedicated marketing email service ({d.provider.provider}) is not connected yet, so test and campaign emails cannot be sent. You can still write drafts, templates and signatures and check recipients. Order confirmations and admin notifications are not affected.</p></div>)}
        {ov.isError && <p role="alert" className="mt-4 text-sm text-destructive">Could not load email campaigns.</p>}
        {!d ? <Loader2 className="mx-auto mt-16 size-6 animate-spin text-muted-foreground" /> : (
          <Tabs defaultValue="campaigns" className="mt-6">
            <TabsList className="flex h-auto flex-wrap justify-start">
              <TabsTrigger value="campaigns">Drafts & history</TabsTrigger><TabsTrigger value="templates">Saved templates</TabsTrigger><TabsTrigger value="signatures">Email signatures</TabsTrigger>
              <TabsTrigger value="contacts">Unsubscribed & consent</TabsTrigger><TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="campaigns" className="space-y-6">
              <CampaignTable title="Draft campaigns" rows={drafts} empty="No drafts yet." onDelete={async (id) => { if (!confirm("Delete this draft?")) return; try { await removeCampaign({ data: { id } }); refresh(); } catch (e) { toast.error(errMsg(e)); } }} />
              <CampaignTable title="Campaign history & delivery status" rows={history} empty="No campaigns have been sent." />
            </TabsContent>
            <TabsContent value="templates"><Templates rows={d.templates} onUse={newCampaign} refresh={refresh} /></TabsContent>
            <TabsContent value="signatures"><Signatures rows={d.signatures} refresh={refresh} /></TabsContent>
            <TabsContent value="contacts"><Contacts suppressions={d.suppressions} consents={d.consents} refresh={refresh} /></TabsContent>
            <TabsContent value="settings"><Settings settings={d.settings} refresh={refresh} /></TabsContent>
          </Tabs>)}
      </div>
    </main>
  );
}

function CampaignTable({ title, rows, empty, onDelete }: { title: string; rows: any[]; empty: string; onDelete?: (id: string) => void }) {
  return (
    <section><h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[900px] text-sm"><thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr>
          <th className="p-3">Campaign</th><th className="p-3">Type</th><th className="p-3">Created by</th><th className="p-3">Created</th><th className="p-3">Sent</th><th className="p-3">Segment</th><th className="p-3">Recipients</th><th className="p-3">Sent</th><th className="p-3">Delivered</th><th className="p-3">Failed</th><th className="p-3">Unsub.</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody>{!rows.length && <tr><td colSpan={13} className="p-8 text-center text-muted-foreground"><Mail className="mx-auto mb-2 size-5" />{empty}</td></tr>}
            {rows.map((c) => <tr key={c.id} className="border-t border-border">
              <td className="p-3 font-medium"><Link to="/admin/email/$campaignId" params={{ campaignId: c.id }} className="text-primary hover:underline">{c.name}</Link></td>
              <td className="p-3">{MESSAGE_TYPE_LABELS[c.message_type as MessageType]}</td><td className="p-3">{c.created_by_email ?? "—"}</td><td className="p-3">{fmt(c.created_at)}</td><td className="p-3">{fmt(c.sent_at)}</td>
              <td className="p-3 capitalize">{String(c.audience?.segment ?? "all").replace("_", " ")}{c.audience?.mode === "manual" ? " (manual)" : ""}</td>
              <td className="p-3">{c.recipient_count}</td><td className="p-3">{c.sent_count}</td><td className="p-3" title="Only shown when the email service confirms delivery">{c.delivered_count ?? "Not reported"}</td><td className="p-3">{c.failed_count}</td><td className="p-3">{c.unsubscribed_count}</td>
              <td className="p-3">{STATUS_LABEL[c.status] ?? c.status}</td>
              <td className="p-3">{onDelete && <Button size="icon" variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => onDelete(c.id)}><Trash2 className="size-4" /></Button>}</td></tr>)}
          </tbody></table></div></section>);
}

function Templates({ rows, onUse, refresh }: { rows: any[]; onUse: (t: any) => void; refresh: () => void }) {
  const save = useServerFn(saveTemplate); const del = useServerFn(deleteTemplate); const seed = useServerFn(addStarterTemplates);
  const [edit, setEdit] = useState<any | null>(null); const [busy, setBusy] = useState(false);
  const submit = async () => { setBusy(true); try { await save({ data: edit }); setEdit(null); refresh(); toast.success("Template saved"); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2"><Button onClick={() => setEdit({ name: "", category: "announcement", subject: "", preview_text: "", body_html: "<p>Hi {{customer_name}},</p>" })}><Plus className="size-4" />New template</Button>
        {!rows.length && <Button variant="outline" onClick={async () => { await seed({}); refresh(); }}>Add starter templates</Button>}</div>
      <p className="text-xs text-muted-foreground">Review templates ask for honest feedback from every eligible customer — never only happy customers, and never with a reward.</p>
      <div className="grid gap-3 md:grid-cols-2">{rows.map((t) => (
        <div key={t.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase text-muted-foreground">{TEMPLATE_CATEGORIES[t.category as TemplateCategory]}</p><h3 className="font-semibold">{t.name}</h3><p className="text-sm text-muted-foreground">{t.subject}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={() => onUse(t)}>Use in campaign</Button><Button size="sm" variant="outline" onClick={() => setEdit({ ...t })}><Pencil className="size-3" />Edit</Button>
            <Button size="sm" variant="outline" onClick={async () => { const { id, created_at, updated_at, created_by, ...rest } = t; await save({ data: { ...rest, name: `${t.name} (copy)` } }); refresh(); }}><Copy className="size-3" />Duplicate</Button>
            <Button size="sm" variant="ghost" aria-label="Delete template" onClick={async () => { if (confirm("Delete template?")) { await del({ data: { id: t.id } }); refresh(); } }}><Trash2 className="size-3" /></Button></div></div>))}</div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{edit?.id ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
        {edit && <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Template name"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Type"><Select value={edit.category} onValueChange={(v) => setEdit({ ...edit, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TEMPLATE_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></Field></div>
          <Field label="Subject"><Input value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /></Field>
          <Field label="Preview text"><Input value={edit.preview_text} onChange={(e) => setEdit({ ...edit, preview_text: e.target.value })} /></Field>
          <RichEmailEditor value={edit.body_html} onChange={(h) => setEdit((s: any) => ({ ...s, body_html: h }))} />
        </div>}
        <DialogFooter><Button disabled={busy || !edit?.name} onClick={submit}>{busy && <Loader2 className="size-4 animate-spin" />}Save template</Button></DialogFooter></DialogContent></Dialog>
    </section>);
}

const EMPTY_SIG = { name: "", sender_name: "", job_title: "", company_name: "Riverbend Autoglass Inc.", phone: "", email: "", website: "https://riverbendautoglass.ca", address: "", facebook_url: "", instagram_url: "", custom_html: "", show_logo: true, brand_color: "#0b2545", is_default: false };
function Signatures({ rows, refresh }: { rows: any[]; refresh: () => void }) {
  const save = useServerFn(saveSignature); const del = useServerFn(deleteSignature);
  const [edit, setEdit] = useState<any | null>(null); const [mobile, setMobile] = useState(false);
  const submit = async () => { try { const { created_at, updated_at, created_by, ...rest } = edit; const clean = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === null ? "" : v])); if (!clean.id) delete clean.id; await save({ data: clean as any }); setEdit(null); refresh(); toast.success("Signature saved"); } catch (e) { toast.error(errMsg(e)); } };
  const F = (k: string, label: string) => <Field label={label}><Input value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></Field>;
  return (
    <section className="space-y-3">
      <Button onClick={() => setEdit({ ...EMPTY_SIG, is_default: !rows.length })}><Plus className="size-4" />New signature</Button>
      <div className="grid gap-3 md:grid-cols-2">{rows.map((s) => (
        <div key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-semibold">{s.name}{s.is_default && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Default</span>}</h3>
          <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setEdit({ ...s })}><Pencil className="size-3" />Edit</Button><Button size="icon" variant="ghost" aria-label="Delete signature" onClick={async () => { if (confirm("Delete signature?")) { await del({ data: { id: s.id } }); refresh(); } }}><Trash2 className="size-4" /></Button></div></div>
          <div className="mt-2 rounded-lg bg-background p-3" dangerouslySetInnerHTML={{ __html: renderSignature(s) }} /></div>))}</div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{edit?.id ? "Edit signature" : "New signature"}</DialogTitle></DialogHeader>
        {edit && <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2">{F("name", "Signature name")}{F("sender_name", "Sender name")}{F("job_title", "Job title")}{F("company_name", "Company")}{F("phone", "Business phone")}{F("email", "Business email")}{F("website", "Website (https://)")}{F("address", "Address")}{F("facebook_url", "Facebook (https://)")}{F("instagram_url", "Instagram (https://)")}
          <Field label="Brand colour"><Input type="color" value={edit.brand_color} onChange={(e) => setEdit({ ...edit, brand_color: e.target.value })} className="h-10 w-20 p-1" /></Field></div>
          <Field label="Custom text, links or full HTML signature" hint="Paste a full designed HTML signature here to use only that — the other fields will be ignored."><Textarea rows={6} className="font-mono text-xs" value={edit.custom_html ?? ""} onChange={(e) => setEdit({ ...edit, custom_html: e.target.value })} placeholder="e.g. Proudly serving Saskatchewan drivers" /></Field>
          <div className="flex flex-wrap gap-6"><label className="flex items-center gap-2 text-sm"><Switch checked={edit.show_logo} onCheckedChange={(v) => setEdit({ ...edit, show_logo: v })} />Show Riverbend logo</label><label className="flex items-center gap-2 text-sm"><Switch checked={edit.is_default} onCheckedChange={(v) => setEdit({ ...edit, is_default: v })} />Default signature</label><label className="flex items-center gap-2 text-sm"><Switch checked={mobile} onCheckedChange={setMobile} />Mobile preview</label></div>
          <div className={`rounded-lg border border-border bg-background p-3 ${mobile ? "mx-auto max-w-[360px]" : ""}`} dangerouslySetInnerHTML={{ __html: renderSignature(edit) }} /></div>}
        <DialogFooter><Button disabled={!edit?.name} onClick={submit}>Save signature</Button></DialogFooter></DialogContent></Dialog>
    </section>);
}

function Contacts({ suppressions, consents, refresh }: { suppressions: any[]; consents: any[]; refresh: () => void }) {
  const add = useServerFn(addSuppression); const rec = useServerFn(recordConsent);
  const [email, setEmail] = useState(""); const [c, setC] = useState({ email: "", consent_type: "express", source: "", consented_at: "", evidence: "" });
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3"><h2 className="text-lg font-semibold">Unsubscribed / suppressed</h2><p className="text-xs text-muted-foreground">These addresses never receive campaigns.</p>
        <div className="flex gap-2"><Input placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email to suppress" /><Button onClick={async () => { try { await add({ data: { email, reason: "manual" } }); setEmail(""); refresh(); } catch (e) { toast.error(errMsg(e)); } }}>Add</Button></div>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">{!suppressions.length && <li className="p-4 text-muted-foreground">No suppressed contacts.</li>}
          {suppressions.map((s) => <li key={s.email} className="flex justify-between gap-2 p-3"><span>{s.email}</span><span className="text-muted-foreground">{s.reason} · {fmt(s.created_at)}</span></li>)}</ul></div>
      <div className="space-y-3"><h2 className="text-lg font-semibold">Consent records</h2><p className="text-xs text-muted-foreground">Only record consent you can prove. Quote requests alone are never treated as consent.</p>
        <div className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          <Input placeholder="Email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} aria-label="Consent email" />
          <Select value={c.consent_type} onValueChange={(v) => setC({ ...c, consent_type: v })}><SelectTrigger aria-label="Consent type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="express">Express (opt-in)</SelectItem><SelectItem value="implied_purchase">Implied — purchase (2 yrs)</SelectItem><SelectItem value="implied_inquiry">Implied — inquiry (6 mo)</SelectItem></SelectContent></Select>
          <Input placeholder="Source (e.g. signed in-shop form)" value={c.source} onChange={(e) => setC({ ...c, source: e.target.value })} aria-label="Consent source" />
          <Input type="date" value={c.consented_at} onChange={(e) => setC({ ...c, consented_at: e.target.value })} aria-label="Consent date" />
          <Textarea className="sm:col-span-2" placeholder="Evidence (where the proof is kept)" value={c.evidence} onChange={(e) => setC({ ...c, evidence: e.target.value })} aria-label="Consent evidence" />
          <Button className="sm:col-span-2" onClick={async () => { try { await rec({ data: c as any }); setC({ email: "", consent_type: "express", source: "", consented_at: "", evidence: "" }); refresh(); toast.success("Consent recorded"); } catch (e) { toast.error(errMsg(e)); } }}>Record consent</Button></div>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">{!consents.length && <li className="p-4 text-muted-foreground">No consent records yet.</li>}
          {consents.map((r) => <li key={r.id} className="p-3"><span className="font-medium">{r.email}</span> — {r.consent_type.replace("_", " ")} · {r.source} · {r.consented_at.slice(0, 10)}{r.expires_at && ` · expires ${r.expires_at.slice(0, 10)}`}</li>)}</ul></div>
    </section>);
}

function Settings({ settings, refresh }: { settings: any; refresh: () => void }) {
  const save = useServerFn(saveEmailSettings);
  const [s, setS] = useState({ sender_name: settings?.sender_name ?? "Riverbend Autoglass Inc.", sender_email: settings?.sender_email ?? "", reply_to: settings?.reply_to ?? "", mailing_address: settings?.mailing_address ?? "", google_review_url: settings?.google_review_url ?? "", facebook_review_url: settings?.facebook_review_url ?? "", tests: (settings?.test_recipients ?? []).join(", ") });
  const F = (k: keyof typeof s, label: string, hint?: string) => <Field label={label} hint={hint}><Input value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></Field>;
  return (
    <section className="max-w-2xl space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
      {F("sender_name", "Sender name")}{F("sender_email", "Sender email", "Must be on the domain set up with the marketing email service.")}{F("reply_to", "Reply-to email")}
      {F("mailing_address", "Business mailing address", "Required in every commercial email under CASL.")}
      {F("google_review_url", "Google review link (https://)", "Paste the verified link from your Google Business Profile.")}{F("facebook_review_url", "Facebook review link (https://)")}
      {F("tests", "Internal test addresses", "Comma separated. Test emails may only go here or to your own login email.")}
      <Button onClick={async () => { try { await save({ data: { ...s, test_recipients: String(s.tests).split(",").map((x: string) => x.trim()).filter(Boolean) } as any }); refresh(); toast.success("Settings saved"); } catch (e) { toast.error(errMsg(e)); } }}>Save settings</Button>
    </section>);
}

