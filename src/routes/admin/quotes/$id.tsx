import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getQuote, updateQuote } from "@/lib/admin.functions";

const STATUSES = [
  "new", "contacted", "awaiting-information", "estimating", "quote-sent",
  "appointment-requested", "booked", "completed", "lost", "spam",
];
const PRIORITIES = ["urgent", "high", "normal", "low"];

export const Route = createFileRoute("/admin/quotes/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Quote Detail — Riverbend Autoglass Admin" },
      { name: "description", content: "Full detail, attachments and status history for a Riverbend Autoglass quote request." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: QuoteDetail,
});

const label = (v: unknown) => (v == null || v === "" ? "—" : String(v).replace(/[_-]/g, " "));

function QuoteDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchQuote = useServerFn(getQuote);
  const saveQuote = useServerFn(updateQuote);

  const detail = useQuery({ queryKey: ["admin-quote", id], queryFn: () => fetchQuote({ data: { id } }), retry: false });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (detail.isError) void navigate({ to: "/admin/login", replace: true });
  }, [detail.isError, navigate]);

  const quote = detail.data?.quote as Record<string, unknown> | undefined;

  useEffect(() => {
    if (quote) setNotes(String(quote["internal_notes"] ?? ""));
  }, [quote]);

  const mutation = useMutation({
    mutationFn: (patch: { status?: string; priority?: string; internalNotes?: string }) =>
      saveQuote({ data: { id, ...patch } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-quote", id] });
      void queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
  });

  if (detail.isPending || !quote) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </main>
    );
  }

  const address = (quote["service_address"] ?? {}) as Record<string, unknown>;
  const damage = (quote["damage_details"] ?? {}) as Record<string, unknown>;

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link to="/admin/quotes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          Back to all quotes
        </Link>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-semibold text-foreground">{String(quote["public_reference"])}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Submitted {new Date(String(quote["created_at"])).toLocaleString("en-CA")}
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={String(quote["status"])} onValueChange={(v) => mutation.mutate({ status: v })}>
              <SelectTrigger className="h-11 w-48 rounded-xl" aria-label="Quote status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace(/-/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(quote["priority"])} onValueChange={(v) => mutation.mutate({ priority: v })}>
              <SelectTrigger className="h-11 w-36 rounded-xl" aria-label="Quote priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        {Boolean(quote["adas_required_review"]) && (
          <p className="mt-5 rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4 text-sm text-foreground">
            ADAS review required — this vehicle likely needs camera recalibration after the work.
          </p>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Panel title="Customer">
            <Row k="Name" v={quote["customer_name"]} />
            <Row k="Phone" v={quote["customer_phone"]} />
            <Row k="Email" v={quote["customer_email"]} />
            <Row k="Preferred contact" v={quote["preferred_contact_method"]} />
            <Row k="Notes from customer" v={quote["customer_notes"]} />
          </Panel>

          <Panel title="Vehicle">
            <Row k="Vehicle" v={[quote["vehicle_year"], quote["vehicle_make"], quote["vehicle_model"], quote["vehicle_trim"]].filter(Boolean).join(" ")} />
            <Row k="Body style" v={quote["vehicle_body_style"]} />
            <Row k="VIN" v={quote["vin"]} />
            <Row k="Plate" v={quote["licence_plate"]} />
            {Object.entries(features).map(([k, v]) => (
              <Row key={k} k={k.replace(/([A-Z])/g, " $1")} v={Array.isArray(v) ? v.join(", ") : v} />
            ))}
          </Panel>

          <Panel title="Job">
            <Row k="Glass area" v={quote["glass_area"]} />
            <Row k="Requested service" v={quote["requested_service"]} />
            <Row k="Damage cause" v={quote["damage_cause"]} />
            {Object.entries(damage).map(([k, v]) => (
              <Row key={k} k={k.replace(/([A-Z])/g, " $1")} v={Array.isArray(v) ? v.join(", ") : v} />
            ))}
          </Panel>

          <Panel title="Service & timing">
            <Row k="Insurance" v={quote["insurance_method"]} />
            <Row k="Claim number" v={quote["insurance_claim_number"]} />
            <Row k="Location type" v={quote["service_location_type"]} />
            <Row k="Address" v={[address["streetAddress"], address["city"], address["postalCode"]].filter(Boolean).join(", ")} />
            <Row k="Urgency" v={quote["preferred_urgency"]} />
            <Row k="Preferred date" v={`${label(quote["preferred_date"])} ${label(quote["preferred_time"])}`} />
          </Panel>

          <Panel title="Attachments">
            {detail.data?.files.length ? (
              <ul className="space-y-2">
                {detail.data.files.map((file) => (
                  <li key={file.id}>
                    <a
                      href={file.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <Paperclip className="size-4" aria-hidden />
                      {file.original_filename}
                      <span className="text-xs text-muted-foreground">
                        ({(file.file_size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No files attached.</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Links are private and expire after five minutes.</p>
          </Panel>

          <Panel title="Marketing source">
            <Row k="Source" v={quote["utm_source"]} />
            <Row k="Medium" v={quote["utm_medium"]} />
            <Row k="Campaign" v={quote["utm_campaign"]} />
            <Row k="Landing page" v={quote["landing_page"]} />
            <Row k="Referrer" v={quote["referrer"]} />
          </Panel>
        </div>

        <Panel title="Internal notes" className="mt-5">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="rounded-xl"
            aria-label="Internal notes"
          />
          <Button
            className="mt-3 h-11 rounded-xl"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ internalNotes: notes })}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Save notes
          </Button>
        </Panel>

        <Panel title="Status history" className="mt-5">
          <ol className="space-y-3">
            {detail.data?.history.map((entry) => (
              <li key={entry.id} className="text-sm text-foreground">
                <span className="font-medium capitalize">{label(entry.previous_status)} → {label(entry.new_status)}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString("en-CA")}
                </span>
                {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </main>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 shadow-soft ${className}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: unknown }) {
  return (
    <p className="grid grid-cols-[10rem_1fr] gap-3 text-sm">
      <span className="capitalize text-muted-foreground">{k}</span>
      <span className="break-words text-foreground">{label(v)}</span>
    </p>
  );
}
