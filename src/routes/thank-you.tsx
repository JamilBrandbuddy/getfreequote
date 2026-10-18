import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS } from "@/features/quote/data/catalog";

const title = "Thank You — Riverbend Autoglass Inc.";
const description =
  "Your auto glass quote request was received. A Riverbend advisor will contact you shortly.";

export const Route = createFileRoute("/thank-you")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ThankYou,
});

function ThankYou() {
  const [reference, setReference] = useState<string | null>(null);
  useEffect(() => {
    try {
      setReference(sessionStorage.getItem("rb-last-quote-ref"));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-canvas px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-6 text-center shadow-soft sm:p-10">
        <CheckCircle2 className="mx-auto size-14 text-cta" aria-hidden />
        <h1 className="mt-4 text-2xl font-black text-foreground sm:text-3xl">
          Thanks — we've got your request
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          {reference ? (
            <>
              Your reference number is{" "}
              <strong className="font-mono text-foreground">{reference}</strong>.{" "}
            </>
          ) : (
            "Your reference number has been emailed to you. "
          )}
          A Riverbend advisor will contact you with your written quote, usually the same business day.
        </p>

        <ol className="mx-auto mt-8 max-w-md space-y-3 text-left">
          {[
            "We verify your glass and features by VIN.",
            "We confirm your SGI claim or private pricing.",
            "We call or text to book a time that suits you.",
          ].map((text, i) => (
            <li key={text} className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-sm text-foreground">{text}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="cta" className="h-14 rounded-2xl px-6 text-base font-semibold">
            <a href={BUSINESS.phoneHref}>
              <Phone className="size-5" />
              {BUSINESS.phone}
            </a>
          </Button>
          <Button asChild variant="outline" className="h-14 rounded-2xl px-6 text-base">
            <a href={`mailto:${BUSINESS.email}`}>
              <Mail className="size-5" />
              Email us
            </a>
          </Button>
        </div>

        <Button asChild variant="ghost" className="mt-6 h-12 rounded-xl text-sm font-semibold text-primary">
          <Link to="/get-quote">Start another quote</Link>
        </Button>
      </div>
    </main>
  );
}
