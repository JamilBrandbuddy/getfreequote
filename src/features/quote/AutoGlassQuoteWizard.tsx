import { useEffect, useRef } from "react";
import { Phone } from "lucide-react";
import { ProgressHeader } from "./components/ProgressHeader";
import { StepForm } from "./components/StepForm";
import { TrustPanel } from "./components/TrustPanel";
import { BUSINESS } from "./data/catalog";
import { QuoteWizardProvider, useQuoteWizard, useQuoteWizardContext } from "./machine/useQuoteWizard";
import { ConfirmationStep } from "./steps/ConfirmationStep";
import { GlassAreaStep } from "./steps/GlassAreaStep";
import { ReviewStep } from "./steps/ReviewStep";
import { UploadsStep } from "./steps/UploadsStep";
import { WelcomeStep } from "./steps/WelcomeStep";

function StepBody() {
  const { step } = useQuoteWizardContext();
  switch (step.id) {
    case "welcome":
      return <WelcomeStep />;
    case "area":
      return <GlassAreaStep />;
    case "uploads":
      return <UploadsStep />;
    case "review":
      return <ReviewStep />;
    case "confirmation":
      return <ConfirmationStep />;
    default:
      return <StepForm key={step.id} step={step} />;
  }
}

function WizardInner() {
  const { step } = useQuoteWizardContext();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step.id]);

  return (
    <div className="min-h-screen bg-gradient-canvas">
      <ProgressHeader />
      <main className="mx-auto flex max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:py-12">
        <div className="min-w-0 flex-1">
          <div className="rounded-3xl border border-border bg-background/60 p-4 sm:bg-card sm:p-8 sm:shadow-soft">
            {step.id !== "confirmation" && (
              <>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-2xl font-black tracking-tight text-foreground outline-none sm:text-3xl"
                >
                  {step.title}
                </h1>
                {step.subtitle && (
                  <p className="mt-2 text-base text-muted-foreground">{step.subtitle}</p>
                )}
                <div className="mt-6" />
              </>
            )}
            <StepBody />
          </div>
        </div>
        <TrustPanel trust={step.trust} />
      </main>

      <a
        href={BUSINESS.phoneHref}
        className="fixed bottom-24 right-4 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-elevated lg:hidden"
        aria-label={`Call ${BUSINESS.shortName} at ${BUSINESS.phone}`}
      >
        <Phone className="size-6" />
      </a>
    </div>
  );
}

/** Standalone, embeddable auto glass quote wizard. */
export function AutoGlassQuoteWizard() {
  const api = useQuoteWizard();
  return (
    <QuoteWizardProvider value={api}>
      <WizardInner />
    </QuoteWizardProvider>
  );
}

export default AutoGlassQuoteWizard;
