import { conversionLabel } from "@/lib/conversion";
import { useEffect } from "react";
import { regionLabel } from "@/components/admin/QuoteReporting";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminSession } from "@/lib/admin.functions";
import { getCustomer } from "@/lib/customers.functions";

export const Route = createFileRoute("/admin/customers/$customerId")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Customer Profile — Riverbend Autoglass Admin" },
    { name: "description", content: "Customer contact details and quote history." },
    { name: "robots", content: "noindex, nofollow" },
    { property: "og:title", content: "Customer Profile — Riverbend Autoglass" },
    { property: "og:description", content: "Customer quote history." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CustomerPage,
});

const fmt = (d: string) => new Date(d).toLocaleString("en-CA", { timeZone: "America/Regina", dateStyle: "medium", timeStyle: "short" });

function CustomerPage() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const fetchSession = useServerFn(getAdminSession);
  const fetchCustomer = useServerFn(getCustomer);
  const session = useQuery({ queryKey: ["admin-session"], queryFn: () => fetchSession({}), retry: false });
  useEffect(() => { if (session.isError) void navigate({ to: "/admin/login", replace: true }); }, [session.isError, navigate]);
  const q = useQuery({ queryKey: ["admin-customer", customerId], queryFn: () => fetchCustomer({ data: { id: customerId } }), enabled: session.data?.canOperate === true, retry: false });

  if (session.isPending || q.isPending) return <main className="grid min-h-screen place-items-center"><Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" /></main>;
  if (q.isError || !q.data) return <main className="grid min-h-screen place-items-center p-4 text-center"><div><p className="text-foreground">Customer not found.</p><Button asChild variant="outline" className="mt-4"><Link to="/admin/customers">Back to All Customers</Link></Button></div></main>;
  const { profile: p, quotes, history } = q.data;

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link to="/admin/customers" className="text-sm text-primary hover:underline">← All Customers</Link>
        <section className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">{p.name}</h1>
          {p.ambiguous && <p className="mt-2 rounded-xl bg-accent/20 p-3 text-sm">This email is also used with another phone number, so those quotes are kept as a separate customer. Please review manually.</p>}
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <Item label="Phone">{p.phones.join(", ") || "—"}</Item>
            <Item label="Email">{p.emails.join(", ") || "—"}</Item>
            <Item label="Total quote submissions">{p.quoteCount}</Item>
            <Item label="Service location (customer-entered)">{[p.serviceLocation, p.serviceProvince].filter(Boolean).join(", ") || "Not provided"}</Item>
            <Item label="Phone area code region">{regionLabel(p.phoneRegion)}</Item>
            <Item label="First quote">{fmt(p.firstQuoteAt)}</Item>
            <Item label="Latest quote">{fmt(p.latestQuoteAt)}</Item>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">Quote requests are what the customer asked for. They are not booked or completed jobs unless their status says so.</p>
        </section>
        <h2 className="mt-8 text-lg font-semibold text-foreground">Quote history</h2>
        <ul className="mt-3 space-y-3">
          {quotes.map((quote) => (
            <li key={quote.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to="/admin/quotes/$id" params={{ id: quote.id }} className="font-medium text-primary hover:underline">{quote.public_reference}</Link>
                <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{quote.status.replace(/-/g, " ")}</span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs">{conversionLabel(quote.conversion_status)}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{fmt(quote.created_at)} · Requested: {quote.requested_service ?? quote.glass_area ?? "—"}</p>
              <p className="text-sm text-muted-foreground">Vehicle: {[quote.vehicle_year, quote.vehicle_make, quote.vehicle_model].filter(Boolean).join(" ") || "—"}</p>
              {history.filter((h) => h.quote_id === quote.id).length > 0 && (
                <ol className="mt-3 border-l border-border pl-4 text-xs text-muted-foreground">
                  {history.filter((h) => h.quote_id === quote.id).map((h, i) => <li key={i}>{fmt(h.created_at)} — {h.previous_status ? `${h.previous_status} → ` : ""}{h.new_status}</li>)}
                </ol>)}
            </li>))}
        </ul>
      </div>
    </main>
  );
}
function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium text-foreground">{children}</dd></div>;
}
