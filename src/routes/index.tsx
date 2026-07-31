import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, ShieldCheck } from "lucide-react";
import { BUSINESS } from "@/features/quote/data/catalog";

const title = "Riverbend Autoglass Inc. — Windshield Repair & Replacement in SK";
const description =
  "SGI-accredited auto glass across Saskatchewan. Windshield repair and replacement, side and rear glass, sunroofs, mirrors and ADAS recalibration.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-gradient-canvas">
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-soft">
          <ShieldCheck className="size-4 text-cta" />
          SGI-accredited glass shop
        </span>
        <h1 className="mt-6 text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          {BUSINESS.name}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Windshield repair and replacement, side and rear glass, sunroofs, mirrors and ADAS
          recalibration — mobile or in our shop, across Saskatchewan.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/get-quote"
            className="inline-flex h-14 items-center rounded-2xl bg-cta px-7 text-base font-semibold text-cta-foreground shadow-soft transition-colors hover:bg-cta/90"
          >
            Get my free quote
          </Link>
          <a
            href={BUSINESS.phoneHref}
            className="inline-flex h-14 items-center gap-2 rounded-2xl border border-border bg-card px-7 text-base font-semibold text-foreground shadow-soft hover:bg-secondary"
          >
            <Phone className="size-5 text-cta" />
            {BUSINESS.phone}
          </a>
        </div>
      </section>
    </main>
  );
}
