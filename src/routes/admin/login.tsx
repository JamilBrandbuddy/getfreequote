import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Sign In — Riverbend Autoglass" },
      { name: "description", content: "Secure sign in for Riverbend Autoglass staff to manage incoming quote requests." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/admin/quotes", replace: true });
    });
  }, [navigate]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError("That email and password combination didn't work.");
      return;
    }
    void navigate({ to: "/admin/quotes", replace: true });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-foreground">Staff sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Riverbend Autoglass quote dashboard. Staff accounts only.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Work email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl text-base font-semibold">
            {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
