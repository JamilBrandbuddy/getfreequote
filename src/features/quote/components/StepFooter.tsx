import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuoteWizardContext } from "../machine/useQuoteWizard";

interface Props {
  label?: string;
  onContinue?: () => void;
  submitting?: boolean;
  type?: "submit" | "button";
  disabled?: boolean;
}

export function StepFooter({ label = "Continue", onContinue, submitting, type = "submit", disabled }: Props) {
  const { back, canGoBack, state } = useQuoteWizardContext();

  return (
    <div className="sticky bottom-0 -mx-4 mt-10 border-t border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:mx-0 sm:rounded-b-3xl sm:px-0 sm:pb-0 md:static md:border-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
      <div className="flex items-center gap-3">
        {canGoBack && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={back}
            className="h-14 shrink-0 rounded-2xl px-5 text-base"
          >
            <ArrowLeft className="size-5" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        )}
        <Button
          type={type}
          size="lg"
          variant="cta"
          onClick={onContinue}
          disabled={submitting || disabled}
          className="h-14 flex-1 rounded-2xl text-base font-semibold"
        >
          {submitting ? <Loader2 className="size-5 animate-spin" /> : null}
          {state.returnToReview && type === "submit" ? "Save and return to review" : label}
          {!submitting && <ArrowRight className="size-5" />}
        </Button>
      </div>
    </div>
  );
}
