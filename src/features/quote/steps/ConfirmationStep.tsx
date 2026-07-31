import { CheckCircle2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS } from "../data/catalog";
import { useQuoteWizardContext } from "../machine/useQuoteWizard";

export function ConfirmationStep() {
  const { state, resetAll } = useQuoteWizardContext();

  return (
    <div className="text-center">
      <CheckCircle2 className="mx-auto size-14 text-cta" aria-hidden />
      <h2 className="mt-4 text-2xl font-black text-foreground sm:text-3xl">
        Thanks — we've got your request
      </h2>
      <p className="mt-3 text-base text-muted-foreground">
        Your reference number is{" "}
        <strong className="font-mono text-foreground">{state.submittedRef}</strong>. A Riverbend
        advisor will contact you with your written quote, usually the same business day.
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

      <Button
        type="button"
        variant="ghost"
        className="mt-6 h-12 rounded-xl text-sm font-semibold text-primary"
        onClick={resetAll}
      >
        Start another quote
      </Button>
    </div>
  );
}
