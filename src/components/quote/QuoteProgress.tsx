import { Progress } from "@/components/ui/progress";
import { stepMeta } from "@/lib/quoteRouting";
import { useQuoteWizard } from "./QuoteWizardContext";

export function QuoteProgress() {
  const { state, progress, position } = useQuoteWizard();
  const meta = stepMeta(state.stepId);
  const counted = position.index > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs font-semibold uppercase tracking-wide">
        <span className="truncate text-foreground">{meta.name}</span>
        <span className="shrink-0 text-muted-foreground">
          {counted ? `Step ${position.index} of ${position.total}` : `${progress}%`}
        </span>
      </div>
      <Progress
        value={progress}
        aria-label="Quote progress"
        className="h-2 bg-muted"
      />
    </div>
  );
}
