import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { unsubscribeByToken } from "@/lib/campaigns.functions";

export const Route = createFileRoute("/unsubscribe/$token")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Unsubscribe — Riverbend Autoglass" }, { name: "description", content: "Stop receiving Riverbend Autoglass marketing emails." },
    { name: "robots", content: "noindex" }, { property: "og:title", content: "Unsubscribe — Riverbend Autoglass" },
    { property: "og:description", content: "Manage Riverbend Autoglass email preferences." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Unsub,
});
function Unsub() {
  const { token } = Route.useParams(); const run = useServerFn(unsubscribeByToken);
  const [state, setState] = useState<"working" | "done" | "invalid">("working");
  useEffect(() => { if (!/^[a-f0-9]{48}$/.test(token)) { setState("invalid"); return; } run({ data: { token } }).then((r) => setState(r.ok ? "done" : "invalid")).catch(() => setState("invalid")); }, [token, run]);
  return <main className="grid min-h-[70vh] place-items-center px-4 text-center"><div className="max-w-md space-y-2">
    <h1 className="text-2xl font-semibold">{state === "done" ? "You're unsubscribed" : state === "invalid" ? "Link not recognised" : "Unsubscribing…"}</h1>
    <p className="text-muted-foreground">{state === "done" ? "Riverbend Autoglass will not send you marketing emails anymore. You'll still get messages about quotes you request." : state === "invalid" ? "This unsubscribe link is invalid or expired. Reply to any of our emails and we'll remove you." : "One moment please."}</p></div></main>;
}
