import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS } from "../data/catalog";
import { useQuoteWizardContext } from "../machine/useQuoteWizard";

const POINTS = [
  { icon: Clock, title: "About 2 minutes", body: "Only the questions that apply to your vehicle." },
  { icon: ShieldCheck, title: "SGI billed directly", body: "We handle claim paperwork for you." },
  { icon: CheckCircle2, title: "No obligation", body: "A written quote — book only if you're happy." },
];

export function WelcomeStep() {
  const { start, resumeAvailable, acceptResume, dismissResume } = useQuoteWizardContext();

  return (
    <div>
      {resumeAvailable && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <p className="font-semibold text-foreground">You have a saved quote in progress.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick up where you left off, or start fresh.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" variant="cta" className="h-12 rounded-xl px-5" onClick={acceptResume}>
              Resume my quote
            </Button>
            <Button type="button" variant="outline" className="h-12 rounded-xl px-5" onClick={dismissResume}>
              Start over
            </Button>
          </div>
        </div>
      )}

      <p className="text-lg leading-relaxed text-muted-foreground">
        Answer a few quick questions about your glass and vehicle. We'll send a clear, written
        quote — usually the same business day.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {POINTS.map((p) => (
          <div key={p.title} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p.icon className="size-6 text-cta" />
            <p className="mt-3 font-semibold text-foreground">{p.title}</p>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-10 border-t border-border bg-background/95 px-4 py-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
        <Button
          type="button"
          variant="cta"
          size="lg"
          onClick={start}
          className="h-14 w-full rounded-2xl text-base font-semibold"
        >
          Start my free quote
        </Button>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Prefer to call?{" "}
          <a href={BUSINESS.phoneHref} className="font-semibold text-primary underline-offset-4 hover:underline">
            {BUSINESS.phone}
          </a>
        </p>
      </div>
    </div>
  );
}
