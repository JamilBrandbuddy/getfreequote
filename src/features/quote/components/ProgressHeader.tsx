import { Phone } from "lucide-react";
import logoAsset from "@/assets/riverbend-logo.png.asset.json";
import { Progress } from "@/components/ui/progress";
import { BUSINESS } from "../data/catalog";
import { useQuoteWizardContext } from "../machine/useQuoteWizard";

export function ProgressHeader() {
  const { progress, position, state } = useQuoteWizardContext();
  const showSteps = position.isCounted && state.stepId !== "confirmation";

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={logoAsset.url}
            alt={`${BUSINESS.name} logo`}
            className="h-10 w-auto shrink-0 sm:h-12"
            width={1920}
            height={620}
          />
          <span className="min-w-0 hidden sm:block">
            <span className="block truncate text-sm font-bold text-foreground sm:text-base">
              {BUSINESS.name}
            </span>
            <span className="block text-xs text-muted-foreground">SGI-accredited glass shop</span>
          </span>
        </div>
        <a
          href={BUSINESS.phoneHref}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-soft transition-colors hover:bg-secondary"
        >
          <Phone className="size-4 text-cta" />
          <span className="hidden sm:inline">{BUSINESS.phone}</span>
          <span className="sm:hidden">Call</span>
        </a>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span aria-live="polite">
            {showSteps ? `Step ${position.index} of ${position.total}` : "Free, no-obligation quote"}
          </span>
          <span>{progress}% complete</span>
        </div>
        <Progress value={progress} className="h-2" aria-label="Quote progress" />
      </div>
    </header>
  );
}
