import { AlertTriangle, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "../components/Callout";
import { StepFooter } from "../components/StepFooter";
import { buildSummary } from "../machine/summary";
import { buildStepSchema } from "../machine/questions";
import { visibleSteps } from "../machine/steps";
import { useQuoteWizardContext } from "../machine/useQuoteWizard";

export function ReviewStep() {
  const { state, goto, submit, submitting, submitError } = useQuoteWizardContext();
  const groups = buildSummary(state.answers);

  const incomplete = visibleSteps(state.answers)
    .filter((s) => s.kind === "questions")
    .filter((s) => !buildStepSchema(s.questions ?? [], state.answers).safeParse(state.answers).success);

  const missingArea = !state.answers.glassArea;
  const canSubmit = incomplete.length === 0 && !missingArea;

  return (
    <div>
      <p className="text-base leading-relaxed text-muted-foreground">
        Everything below is what we'll use to prepare your quote. Change anything you like — nothing
        is sent until you press the button.
      </p>

      <div className="mt-6 space-y-4">
        {groups.map((group) => (
          <section key={group.stepId} className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-foreground">{group.title}</h3>
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-xl px-3 text-sm font-semibold text-primary"
                onClick={() => goto(group.stepId, true)}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            </div>
            <dl className="space-y-2">
              {group.rows.map((row) => (
                <div key={row.label} className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-4">
                  <dt className="text-sm text-muted-foreground">{row.label}</dt>
                  <dd className="text-sm font-medium text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      {!canSubmit && (
        <Callout tone="warn" className="mt-6">
          <p className="font-semibold">A few answers are still needed.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {missingArea && (
              <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => goto("area", true)}>
                Glass area
              </Button>
            )}
            {incomplete.map((s) => (
              <Button
                key={s.id}
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => goto(s.id, true)}
              >
                {s.title}
              </Button>
            ))}
          </div>
        </Callout>
      )}

      {submitError && (
        <Callout tone="warn" className="mt-6">
          <AlertTriangle className="hidden" aria-hidden />
          {submitError}
        </Callout>
      )}

      <StepFooter
        type="button"
        disabled={!canSubmit}
        submitting={submitting}
        onContinue={() => void submit()}
        label={submitting ? "Sending…" : "Send my quote request"}
      />
      {submitting && <Loader2 className="sr-only" aria-hidden />}
    </div>
  );
}
