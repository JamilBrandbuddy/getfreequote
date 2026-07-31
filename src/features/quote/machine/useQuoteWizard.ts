import { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, createContext } from "react";
import { analytics } from "../analytics";
import type { AnswerKey, QuoteAnswers, StepId, WizardState } from "../types";
import {
  clearState,
  initialState,
  loadState,
  progressFor,
  reducer,
  saveState,
  stepPosition,
} from "./reducer";
import { stepById, visibleSteps as computeVisibleSteps } from "./steps";

export interface QuoteWizardApi {
  state: WizardState;
  step: ReturnType<typeof stepById>;
  progress: number;
  position: { index: number; total: number; isCounted: boolean };
  flow: StepId[];
  canGoBack: boolean;
  patch: (values: Partial<QuoteAnswers>, clear?: AnswerKey[]) => void;
  next: () => void;
  back: () => void;
  goto: (stepId: StepId, returnToReview?: boolean) => void;
  start: () => void;
  submit: () => Promise<void>;
  resetAll: () => void;
  submitting: boolean;
  submitError: string | null;
  resumeAvailable: boolean;
  acceptResume: () => void;
  dismissResume: () => void;
}

const QuoteWizardContext = createContext<QuoteWizardApi | null>(null);

export function useQuoteWizardContext() {
  const ctx = useContext(QuoteWizardContext);
  if (!ctx) throw new Error("useQuoteWizardContext must be used inside the wizard provider.");
  return ctx;
}

export const QuoteWizardProvider = QuoteWizardContext.Provider;

function makeReference() {
  const n = Math.floor(Math.random() * 9000 + 1000);
  const d = new Date();
  return `RBA-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${n}`;
}

export function useQuoteWizard(): QuoteWizardApi {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingResume, setPendingResume] = useState<WizardState | null>(null);
  const lastViewed = useRef<StepId | null>(null);

  // Restore a saved draft (client only).
  useEffect(() => {
    const saved = loadState();
    if (saved && saved.stepId !== "welcome") setPendingResume(saved);
  }, []);

  // Autosave.
  useEffect(() => {
    if (state.stepId === "welcome" || state.stepId === "confirmation") return;
    saveState(state);
  }, [state]);

  const progress = progressFor(state);

  // Step view analytics.
  useEffect(() => {
    if (lastViewed.current === state.stepId) return;
    lastViewed.current = state.stepId;
    analytics.stepView(state.stepId, state.answers, progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stepId]);

  // Abandonment.
  useEffect(() => {
    const handler = () => {
      if (state.stepId !== "welcome" && state.stepId !== "confirmation") {
        analytics.abandon(state.stepId, progress);
      }
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [state.stepId, progress]);

  const patch = useCallback((values: Partial<QuoteAnswers>, clear?: AnswerKey[]) => {
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "string" && value) {
        analytics.branchSelected(key, value);
        if (value === "not_sure") analytics.notSure(key, "area");
      }
    }
    dispatch({ type: "patch", values, clear });
  }, []);

  const next = useCallback(() => {
    analytics.stepComplete(state.stepId, state.answers, progress);
    dispatch({ type: "next" });
  }, [state.stepId, state.answers, progress]);

  const back = useCallback(() => dispatch({ type: "back" }), []);
  const goto = useCallback(
    (stepId: StepId, returnToReview?: boolean) => dispatch({ type: "goto", stepId, returnToReview }),
    [],
  );
  const start = useCallback(() => {
    analytics.start();
    dispatch({ type: "start" });
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Phase 1: mock submission. Phase 2 replaces this with a server function.
      await new Promise((resolve) => setTimeout(resolve, 900));
      const reference = makeReference();
      analytics.submit(state.answers, reference);
      analytics.generateLead(reference);
      clearState();
      dispatch({ type: "submitted", reference });
    } catch {
      setSubmitError("We couldn't send your request. Please try again, or call us and we'll take it over the phone.");
    } finally {
      setSubmitting(false);
    }
  }, [state.answers]);

  const resetAll = useCallback(() => {
    clearState();
    dispatch({ type: "reset" });
  }, []);

  const flow = useMemo(() => computeVisibleSteps(state.answers).map((s) => s.id), [state.answers]);

  return {
    state,
    step: stepById(state.stepId),
    progress,
    position: stepPosition(state),
    flow,
    canGoBack: state.stepId !== "welcome" && state.stepId !== "confirmation",
    patch,
    next,
    back,
    goto,
    start,
    submit,
    resetAll,
    submitting,
    submitError,
    resumeAvailable: pendingResume !== null,
    acceptResume: () => {
      if (pendingResume) dispatch({ type: "restore", state: pendingResume });
      setPendingResume(null);
    },
    dismissResume: () => {
      clearState();
      setPendingResume(null);
    },
  };
}
