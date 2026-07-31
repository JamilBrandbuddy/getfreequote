import type { QuoteAnswers, StepId, WizardState } from "../types";
import { STEPS, visibleSteps } from "./steps";
import type { AnswerKey } from "../types";

export const STORAGE_KEY = "riverbend.quote.v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type Action =
  | { type: "start" }
  | { type: "patch"; values: Partial<QuoteAnswers>; clear?: AnswerKey[] }
  | { type: "next" }
  | { type: "back" }
  | { type: "goto"; stepId: StepId; returnToReview?: boolean }
  | { type: "submitted"; reference: string }
  | { type: "restore"; state: WizardState }
  | { type: "reset" };

export const initialState: WizardState = {
  stepId: "welcome",
  answers: {},
  staleAnswers: {},
  visited: [],
  returnToReview: false,
  maxProgress: 0,
};

/** Keys that belong to steps/questions that are no longer reachable. */
function partitionAnswers(answers: QuoteAnswers, stale: Partial<QuoteAnswers>) {
  return { answers, staleAnswers: stale };
}

export function reachableSteps(a: QuoteAnswers) {
  return visibleSteps(a).filter((s) => s.counts);
}

export function progressFor(state: WizardState) {
  const reachable = reachableSteps(state.answers);
  if (state.stepId === "welcome") return 0;
  if (state.stepId === "confirmation") return 100;
  const index = reachable.findIndex((s) => s.id === state.stepId);
  if (index < 0) return state.maxProgress;
  return Math.round((index / reachable.length) * 100);
}

export function stepPosition(state: WizardState) {
  const reachable = reachableSteps(state.answers);
  const index = reachable.findIndex((s) => s.id === state.stepId);
  return { index: index + 1, total: reachable.length, isCounted: index >= 0 };
}

function flowIds(a: QuoteAnswers): StepId[] {
  return visibleSteps(a).map((s) => s.id);
}

function nextStepId(a: QuoteAnswers, current: StepId): StepId {
  const ids = flowIds(a);
  const i = ids.indexOf(current);
  return ids[Math.min(i + 1, ids.length - 1)] ?? current;
}

function prevStepId(a: QuoteAnswers, current: StepId): StepId {
  const ids = flowIds(a);
  const i = ids.indexOf(current);
  return ids[Math.max(i - 1, 0)] ?? current;
}

/** Keep the current step reachable after an answer change. */
function nearestReachable(a: QuoteAnswers, current: StepId): StepId {
  const ids = flowIds(a);
  if (ids.includes(current)) return current;
  const allIds = STEPS.map((s) => s.id);
  for (let i = allIds.indexOf(current); i >= 0; i--) {
    if (ids.includes(allIds[i])) return allIds[i];
  }
  return "welcome";
}

export function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "start":
      return { ...state, stepId: "area", visited: ["welcome"] };

    case "patch": {
      const answers: QuoteAnswers = { ...state.answers, ...action.values };
      const staleAnswers = { ...state.staleAnswers };

      // Restore previously stashed values for keys coming back into play.
      for (const key of Object.keys(action.values) as AnswerKey[]) delete staleAnswers[key];

      // Explicit resets: stash instead of destroying, so returning restores them.
      for (const key of action.clear ?? []) {
        if (answers[key] !== undefined) {
          (staleAnswers as Record<string, unknown>)[key] = answers[key];
          delete answers[key];
        }
      }

      const partitioned = partitionAnswers(answers, staleAnswers);
      return {
        ...state,
        ...partitioned,
        stepId: nearestReachable(partitioned.answers, state.stepId),
      };
    }

    case "next": {
      if (state.returnToReview && state.stepId !== "review") {
        return { ...state, stepId: "review", returnToReview: false };
      }
      const stepId = nextStepId(state.answers, state.stepId);
      return {
        ...state,
        stepId,
        visited: state.visited.includes(state.stepId) ? state.visited : [...state.visited, state.stepId],
        maxProgress: Math.max(state.maxProgress, progressFor({ ...state, stepId })),
      };
    }

    case "back":
      return { ...state, stepId: prevStepId(state.answers, state.stepId), returnToReview: false };

    case "goto":
      return { ...state, stepId: action.stepId, returnToReview: action.returnToReview ?? false };

    case "submitted":
      return { ...state, stepId: "confirmation", submittedRef: action.reference, maxProgress: 100 };

    case "restore":
      return action.state;

    case "reset":
      return initialState;

    default:
      return state;
  }
}

/* --------------------------------------------------------------- autosave */

interface Persisted {
  version: 1;
  savedAt: number;
  state: WizardState;
}

export function saveState(state: WizardState) {
  if (typeof window === "undefined") return;
  try {
    const payload: Persisted = { version: 1, savedAt: Date.now(), state };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* storage full or unavailable — autosave is best-effort */
  }
}

export function loadState(): WizardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (parsed.version !== 1 || Date.now() - parsed.savedAt > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (parsed.state.stepId === "confirmation") return null;
    // Files can't be persisted — drop previews.
    return { ...parsed.state, answers: { ...parsed.state.answers, photos: [] } };
  } catch {
    return null;
  }
}

export function clearState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
