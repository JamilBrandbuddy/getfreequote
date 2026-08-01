import { createContext, useContext } from "react";
import type { QuoteAnswers, QuoteState, StepId } from "@/types/quote";
import type { StepErrors } from "@/lib/quoteValidation";

export interface QuoteWizardApi {
  state: QuoteState;
  errors: StepErrors;
  showErrors: boolean;
  progress: number;
  position: { index: number; total: number };
  route: StepId[];
  submitting: boolean;
  submitError: string | null;
  saveStatus: "idle" | "saved";
  resumeAvailable: boolean;
  liveMessage: string;
  setAnswers: (patch: Partial<QuoteAnswers>) => void;
  goNext: () => void;
  goBack: () => void;
  goTo: (stepId: StepId, returnToReview?: boolean) => void;
  start: () => void;
  submit: () => Promise<void>;
  startOver: () => void;
  acceptResume: () => void;
  dismissResume: () => void;
  announce: (message: string) => void;
  trackCall: (placement: string) => void;
}

export const QuoteWizardContext = createContext<QuoteWizardApi | null>(null);

export function useQuoteWizard(): QuoteWizardApi {
  const ctx = useContext(QuoteWizardContext);
  if (!ctx) throw new Error("useQuoteWizard must be used inside <AutoGlassQuoteWizard />.");
  return ctx;
}
