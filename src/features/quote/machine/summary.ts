import { cityLabel } from "../data/catalog";
import { isQuestionVisible, questionOptions } from "./questions";
import { STEPS, visibleSteps } from "./steps";
import type { QuoteAnswers, StepId } from "../types";

export interface SummaryRow {
  label: string;
  value: string;
}

export interface SummaryGroup {
  stepId: StepId;
  title: string;
  rows: SummaryRow[];
}

const IMPLIED_SERVICE: Record<string, string> = {
  front_door: "Front door glass replacement",
  rear_door: "Rear door glass replacement",
  quarter: "Quarter glass replacement",
  vent: "Vent glass replacement",
  rear_windshield: "Rear windshield replacement",
};

function labelFor(value: unknown, options: { value: string; label: string }[]): string {
  if (Array.isArray(value)) {
    return value
      .map((v) => options.find((o) => o.value === v)?.label ?? String(v))
      .join(", ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const found = options.find((o) => o.value === value);
  return found?.label ?? String(value ?? "");
}

export function buildSummary(answers: QuoteAnswers): SummaryGroup[] {
  const groups: SummaryGroup[] = [];

  for (const step of visibleSteps(answers)) {
    if (step.kind !== "questions") continue;
    const rows: SummaryRow[] = [];

    for (const q of step.questions ?? []) {
      if (!isQuestionVisible(q, answers)) continue;
      const raw = answers[q.key];
      if (raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0)) continue;
      const value =
        q.key === "city" ? cityLabel(raw as string) : labelFor(raw, questionOptions(q, answers));
      rows.push({ label: q.label, value });
    }

    if (rows.length) groups.push({ stepId: step.id, title: step.title, rows });
  }

  // Glass area (custom step)
  const areaStep = STEPS.find((s) => s.id === "area")!;
  const areaLabel = answers.glassArea
    ? (IMPLIED_SERVICE[answers.glassArea] ?? answers.glassArea.replace(/_/g, " "))
    : "";
  if (areaLabel) {
    groups.unshift({
      stepId: "area",
      title: areaStep.title,
      rows: [{ label: "Glass area", value: areaLabel }],
    });
  }

  if ((answers.photos ?? []).length) {
    groups.push({
      stepId: "uploads",
      title: "Photos",
      rows: [{ label: "Attached", value: `${answers.photos!.length} file(s)` }],
    });
  }

  return groups;
}
