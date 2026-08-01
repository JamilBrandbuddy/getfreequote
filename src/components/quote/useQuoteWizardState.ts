import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { quoteConfig } from "@/config/quoteConfig";
import { quoteAnalytics } from "@/lib/quoteAnalytics";
import {
  applyAnswerPatch,
  computeRoute,
  makeReference,
  nearestValidStep,
  nextStepId,
  parseQuoteQuery,
  prevStepId,
  progressFor,
  stepMeta,
  stepPosition,
} from "@/lib/quoteRouting";
import { validateStep } from "@/lib/quoteValidation";
import type { QuoteAnswers, QuoteState, StepId } from "@/types/quote";
import type { QuoteWizardApi } from "./QuoteWizardContext";

const INITIAL: QuoteState = {
  stepId: "welcome",
  answers: { registrationProvince: "SK", locationProvince: "SK", photos: [] },
  visited: [],
  returnToReview: false,
  utm: {},
};

interface Persisted {
  version: 1;
  savedAt: number;
  state: QuoteState;
}

const TTL_MS = 14 * 24 * 60 * 60 * 1000;

function save(state: QuoteState) {
  if (typeof window === "undefined") return;
  try {
    const { photos: _photos, ...answers } = state.answers;
    const payload: Persisted = {
      version: 1,
      savedAt: Date.now(),
      state: { ...state, answers: { ...answers, photos: [] } },
    };
    window.localStorage.setItem(quoteConfig.storageKey, JSON.stringify(payload));
  } catch {
    /* best effort */
  }
}

function load(): QuoteState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(quoteConfig.storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (parsed.version !== 1 || Date.now() - parsed.savedAt > TTL_MS) return null;
    if (parsed.state.stepId === "success" || parsed.state.stepId === "welcome") return null;
    return { ...parsed.state, answers: { ...parsed.state.answers, photos: [] } };
  } catch {
    return null;
  }
}

function clearSaved() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(quoteConfig.storageKey);
  } catch {
    /* ignore */
  }
}

export function useQuoteWizardState(): QuoteWizardApi {
  const [state, setState] = useState<QuoteState>(INITIAL);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [pendingResume, setPendingResume] = useState<QuoteState | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const submittingRef = useRef(false);
  const viewedRef = useRef<StepId | null>(null);
  const startedRef = useRef(false);

  /* Query-parameter prefill + saved-draft detection (client only). */
  useEffect(() => {
    const { answers, utm } = parseQuoteQuery(window.location.search);
    setState((s) => ({ ...s, answers: { ...s.answers, ...answers }, utm }));
    const saved = load();
    if (saved) setPendingResume(saved);
  }, []);

  const errors = useMemo(
    () => (showErrors ? validateStep(state.stepId, state.answers) : {}),
    [showErrors, state.stepId, state.answers],
  );

  const progress = progressFor(state.answers, state.stepId);
  const position = stepPosition(state.answers, state.stepId);
  const route = useMemo(() => computeRoute(state.answers), [state.answers]);

  const analyticsCtx = useMemo(
    () => ({ stepId: state.stepId, answers: state.answers, utm: state.utm }),
    [state.stepId, state.answers, state.utm],
  );
  const ctxRef = useRef(analyticsCtx);
  ctxRef.current = analyticsCtx;

  /* Autosave. */
  useEffect(() => {
    if (state.stepId === "welcome" || state.stepId === "success") return;
    save(state);
    setSaveStatus("saved");
  }, [state]);

  /* Step-view analytics + screen-reader announcement. */
  useEffect(() => {
    if (viewedRef.current === state.stepId) return;
    viewedRef.current = state.stepId;
    quoteAnalytics.quoteStepViewed(ctxRef.current, progress);
    const meta = stepMeta(state.stepId);
    setLiveMessage(
      state.stepId === "welcome" || state.stepId === "success"
        ? meta.title
        : `Step ${position.index} of ${position.total}: ${meta.name}. ${meta.title}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stepId]);

  const setAnswers = useCallback((patch: Partial<QuoteAnswers>) => {
    setState((s) => {
      const answers = applyAnswerPatch(s.answers, patch);
      if (patch.glassArea && patch.glassArea !== s.answers.glassArea) {
        quoteAnalytics.glassAreaSelected(ctxRef.current, patch.glassArea);
      }
      if (patch.service && patch.service !== s.answers.service) {
        quoteAnalytics.serviceSelected(ctxRef.current, patch.service);
      }
      if (patch.paymentPath && patch.paymentPath !== s.answers.paymentPath) {
        quoteAnalytics.insuranceSelected(ctxRef.current, patch.paymentPath);
      }
      return { ...s, answers, stepId: nearestValidStep(answers, s.stepId) };
    });
  }, []);

  const goNext = useCallback(() => {
    setState((s) => {
      const stepErrors = validateStep(s.stepId, s.answers);
      if (Object.keys(stepErrors).length > 0) {
        setShowErrors(true);
        const count = Object.keys(stepErrors).length;
        setLiveMessage(`${count} ${count === 1 ? "answer needs" : "answers need"} your attention.`);
        return s;
      }
      setShowErrors(false);
      if (s.stepId === "vehicle") quoteAnalytics.vehicleCompleted(ctxRef.current);
      if (s.stepId === "review") quoteAnalytics.quoteReviewed(ctxRef.current);
      const target = s.returnToReview && s.stepId !== "review" ? "review" : nextStepId(s.answers, s.stepId);
      return {
        ...s,
        stepId: target,
        returnToReview: target === "review" ? false : s.returnToReview,
        visited: s.visited.includes(s.stepId) ? s.visited : [...s.visited, s.stepId],
      };
    });
  }, []);

  const goBack = useCallback(() => {
    setShowErrors(false);
    setState((s) => ({ ...s, stepId: prevStepId(s.answers, s.stepId), returnToReview: false }));
  }, []);

  const goTo = useCallback((stepId: StepId, returnToReview = false) => {
    setShowErrors(false);
    setState((s) => ({ ...s, stepId, returnToReview }));
  }, []);

  const start = useCallback(() => {
    quoteAnalytics.quoteStarted(ctxRef.current);
    setState((s) => ({ ...s, stepId: "glass-area", visited: ["welcome"] }));
  }, []);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Mock submission — a server function replaces this in the backend phase.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const reference = makeReference();
      quoteAnalytics.quoteSubmitted(ctxRef.current, reference);
      clearSaved();
      setState((s) => ({ ...s, stepId: "success", reference }));
    } catch {
      quoteAnalytics.quoteSubmissionFailed(ctxRef.current, "network");
      setSubmitError(
        "We couldn't send your request just now. Your answers are still saved — please try again, or call us and we'll take the details over the phone.",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, []);

  const startOver = useCallback(() => {
    clearSaved();
    setShowErrors(false);
    setSubmitError(null);
    startedRef.current = false;
    viewedRef.current = null;
    setState((s) => ({ ...INITIAL, utm: s.utm }));
    setSaveStatus("idle");
  }, []);

  const acceptResume = useCallback(() => {
    setPendingResume((saved) => {
      if (saved) setState({ ...saved, answers: { ...saved.answers, photos: [] } });
      return null;
    });
  }, []);

  const dismissResume = useCallback(() => {
    clearSaved();
    setPendingResume(null);
  }, []);

  const trackCall = useCallback((placement: string) => {
    quoteAnalytics.clickToCall(ctxRef.current, placement);
  }, []);

  return {
    state,
    errors,
    showErrors,
    progress,
    position,
    route,
    submitting,
    submitError,
    saveStatus,
    resumeAvailable: pendingResume !== null,
    liveMessage,
    setAnswers,
    goNext,
    goBack,
    goTo,
    start,
    submit,
    startOver,
    acceptResume,
    dismissResume,
    announce: setLiveMessage,
    trackCall,
  };
}
