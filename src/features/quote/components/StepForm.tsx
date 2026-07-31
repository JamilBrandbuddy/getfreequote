import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Callout } from "./Callout";
import { QuestionField } from "./QuestionField";
import {
  buildStepSchema,
  isQuestionRequired,
  isQuestionVisible,
  stepDefaults,
} from "../machine/questions";
import type { StepDef } from "../machine/steps";
import { useQuoteWizardContext } from "../machine/useQuoteWizard";
import type { AnswerKey } from "../types";
import { StepFooter } from "./StepFooter";

export function StepForm({ step }: { step: StepDef }) {
  const { state, patch, next } = useQuoteWizardContext();
  const questions = step.questions ?? [];
  const answersRef = useRef(state.answers);
  answersRef.current = state.answers;
  const autoAdvanceRef = useRef(false);

  const form = useForm<Record<string, unknown>>({
    defaultValues: stepDefaults(questions, state.answers),
    resolver: (values, ctx, options) =>
      zodResolver(buildStepSchema(questions, answersRef.current))(values, ctx, options),
  });

  const errors = form.formState.errors;
  const errorCount = Object.keys(errors).length;
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorCount > 0 && form.formState.isSubmitted) summaryRef.current?.focus();
  }, [errorCount, form.formState.isSubmitted, form.formState.submitCount]);

  const visible = questions.filter((q) => isQuestionVisible(q, state.answers));

  const submit = form.handleSubmit(() => {
    next();
  });

  const setValue = (key: AnswerKey, value: unknown, resets?: AnswerKey[], autoAdvance?: boolean) => {
    form.setValue(key, value, { shouldValidate: form.formState.isSubmitted });
    patch({ [key]: value === "" ? undefined : value }, resets);
    if (autoAdvance) autoAdvanceRef.current = true;
  };

  // Auto-advance once the reducer has applied the change.
  useEffect(() => {
    if (!autoAdvanceRef.current) return;
    autoAdvanceRef.current = false;
    const remaining = questions.filter(
      (q) => isQuestionVisible(q, state.answers) && isQuestionRequired(q, state.answers),
    );
    const complete = remaining.every((q) => {
      const v = state.answers[q.key];
      return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== "";
    });
    if (complete) {
      const timer = setTimeout(() => next(), 180);
      return () => clearTimeout(timer);
    }
  }, [state.answers, questions, next]);

  return (
    <form onSubmit={submit} noValidate>
      {errorCount > 0 && form.formState.isSubmitted && (
        <div ref={summaryRef} tabIndex={-1} className="mb-6 outline-none">
          <Callout tone="warn">
            <p className="font-semibold">Please check {errorCount === 1 ? "one answer" : `${errorCount} answers`} below.</p>
          </Callout>
        </div>
      )}

      <div className="space-y-8">
        {visible.map((q) => (
          <QuestionField
            key={q.key}
            question={q}
            answers={state.answers}
            required={isQuestionRequired(q, state.answers)}
            value={form.watch(q.key) ?? (q.type === "multi" ? [] : "")}
            error={errors[q.key]?.message as string | undefined}
            onChange={(value) => setValue(q.key, value, q.resets, q.autoAdvance)}
          />
        ))}
      </div>

      <StepFooter />
    </form>
  );
}
