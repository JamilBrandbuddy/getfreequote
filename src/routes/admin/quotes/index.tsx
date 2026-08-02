import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Inbox, Loader2, LogOut, Search, TrendingUp } from "lucide-react";

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
import { getAdminSession, getQuoteStats, listQuotes } from "@/lib/admin.functions";

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
    ],
  }),
  component: AdminQuotes,
});

function AdminQuotes() {
  const navigate = useNavigate();
  const fetchSession = useServerFn(getAdminSession);
  const fetchQuotes = useServerFn(listQuotes);
  const fetchStats = useServerFn(getQuoteStats);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "priority">("newest");
  const [page, setPage] = useState(0);

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
    queryKey: ["admin-stats"],
    queryFn: () => fetchStats({}),
    enabled: session.data?.isStaff === true,
  });

  const quotes = useQuery({
    queryKey: ["admin-quotes", debounced, status, priority, sort, page],
    queryFn: () => fetchQuotes({ data: { search: debounced, status, priority, sort, page } }),
    enabled: session.data?.isStaff === true,
  });

  const signOut = async () => {
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

  if (session.data && !session.data.isStaff) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">This account has no dashboard access</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ask an administrator to grant you staff access.</p>
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
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Quote requests</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as {session.data?.email ?? "staff"}
            </p>
          </div>
          <Button variant="outline" onClick={signOut} className="h-11 rounded-xl">
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="New requests" value={stats.data?.newCount} icon={<Inbox className="size-5" />} />
          <StatCard label="Urgent" value={stats.data?.urgent} icon={<AlertTriangle className="size-5" />} />
          <StatCard label="Last 7 days" value={stats.data?.lastSevenDays} icon={<TrendingUp className="size-5" />} />
          <StatCard label="All quotes" value={stats.data?.total} icon={<Inbox className="size-5" />} />
        </section>

        <section className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, name, phone, email or vehicle"
              aria-label="Search quotes"
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={STATUSES} />
          <FilterSelect label="Priority" value={priority} onChange={(v) => { setPriority(v); setPage(0); }} options={PRIORITIES} />
          <FilterSelect
            label="Sort"
            value={sort}
            onChange={(v) => setSort(v as typeof sort)}
            options={["newest", "oldest", "priority"]}
            includeAll={false}
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {quotes.isPending ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading quotes…</p>
          ) : quotes.data && quotes.data.rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No quotes match these filters.</p>
          ) : (
            <ul className="divide-y divide-border">
              {quotes.data?.rows.map((q) => (
                <li key={q.id}>
                  <Link
                    to="/admin/quotes/$id"
                    params={{ id: q.id }}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-muted/60"
                  >
                    <span className="min-w-[9rem] font-mono text-sm font-semibold text-foreground">
                      {q.public_reference}
                    </span>
                    <span className="min-w-[10rem] flex-1 text-sm text-foreground">
                      {q.customer_name}
                      <span className="block text-xs text-muted-foreground">
                        {[q.vehicle_year, q.vehicle_make, q.vehicle_model].filter(Boolean).join(" ") || "Vehicle TBC"}
                      </span>
                    </span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {(q.requested_service ?? "—").replace(/_/g, " ")}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${priorityClass[q.priority] ?? ""}`}>
                      {q.priority}
                    </span>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize text-secondary-foreground">
                      {q.status.replace(/-/g, " ")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(q.created_at).toLocaleDateString("en-CA")}
                    </span>
                  </Link>
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

function StatCard({ label, value, icon }: { label: string; value?: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value ?? "—"}</p>
    </div>
  );
}

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
      <SelectTrigger className="h-11 min-w-[10rem] rounded-xl" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">All {label.toLowerCase()}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option} value={option} className="capitalize">
            {option.replace(/-/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
