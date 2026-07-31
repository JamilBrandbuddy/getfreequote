import { useState } from "react";
import { Callout } from "../components/Callout";
import { OptionCard } from "../components/OptionCard";
import { StepFooter } from "../components/StepFooter";
import { GLASS_AREA_OPTIONS } from "../data/catalog";
import { useQuoteWizardContext } from "../machine/useQuoteWizard";
import type { GlassArea } from "../types";
import { VehicleDiagram } from "../components/VehicleDiagram";

const TRIAGE_SYMPTOMS = [
  { value: "cracked", label: "Glass is cracked or chipped", area: "windshield" as GlassArea, service: "replacement" },
  { value: "shattered", label: "Glass is shattered or missing", area: "front_door" as GlassArea, service: "replacement" },
  { value: "leak", label: "Water is getting in", area: "windshield" as GlassArea, service: "leak" },
  { value: "wind_noise", label: "Whistling or wind noise", area: "windshield" as GlassArea, service: "leak" },
  { value: "wont_operate", label: "A window won't go up or down", area: "front_door" as GlassArea, service: "replacement" },
  { value: "warning_light", label: "A driver-assist warning light is on", area: "windshield" as GlassArea, service: "adas" },
];

const WHERE = [
  { value: "front", label: "Front of the vehicle" },
  { value: "side", label: "Side of the vehicle" },
  { value: "back", label: "Back of the vehicle" },
  { value: "roof", label: "Roof" },
  { value: "mirror", label: "A mirror" },
];

export function GlassAreaStep() {
  const { state, patch, next } = useQuoteWizardContext();
  const [error, setError] = useState<string | null>(null);
  const isNotSure = state.answers.glassArea === "not_sure";
  const isNotSure = state.answers.glassArea === "not_sure";

  const choose = (value: string) => {
    setError(null);
    patch({ glassArea: value as GlassArea }, [
      "service", "chipCount", "chipSize", "chipLocation", "crackSpreading",
      "replacementCondition", "drivable", "leakWhen", "waterInside", "priorReplacement",
      "sideGlassState", "debrisInDoor", "windowStuck", "vehicleSecure", "sunroofIssue",
      "sunroofExploded", "mirrorScope", "featWindshield", "featDoor", "featRear",
      "featSunroof", "featMirror",
    ]);
  };

  const suggestion = TRIAGE_SYMPTOMS.find((s) => s.value === state.answers.triageSymptom);

  const onContinue = () => {
    if (!state.answers.glassArea) {
      setError("Please choose the glass area, or select “I'm not sure”.");
      return;
    }
    if (isNotSure && !state.answers.triageSymptom) {
      setError("Tell us what you're noticing so we can point you the right way.");
      return;
    }
    setError(null);
    next();
  };

  return (
    <div>
      <VehicleDiagram value={state.answers.glassArea} onSelect={choose} />

      <fieldset className="mt-6">
        <legend className="sr-only">Glass area</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {GLASS_AREA_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              option={option}
              name="glassArea"
              selected={state.answers.glassArea === option.value}
              onSelect={choose}
            />
          ))}
        </div>
      </fieldset>

      {isNotSure && (
        <div className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
          <p className="text-lg font-semibold text-foreground">
            No problem — two quick questions.
          </p>
          <fieldset>
            <legend className="mb-3 font-semibold text-foreground">Where is the problem?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {WHERE.map((o) => (
                <OptionCard
                  key={o.value}
                  option={o}
                  name="triageWhere"
                  selected={state.answers.triageWhere === o.value}
                  onSelect={(v) => patch({ triageWhere: v })}
                />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-3 font-semibold text-foreground">What are you noticing?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {TRIAGE_SYMPTOMS.map((o) => (
                <OptionCard
                  key={o.value}
                  option={o}
                  name="triageSymptom"
                  selected={state.answers.triageSymptom === o.value}
                  onSelect={(v) => patch({ triageSymptom: v })}
                />
              ))}
            </div>
          </fieldset>
          {suggestion && (
            <Callout>
              Based on that, this looks like a{" "}
              <strong>
                {suggestion.service === "leak"
                  ? "leak or seal issue"
                  : suggestion.service === "adas"
                    ? "driver-assist recalibration"
                    : "glass replacement"}
              </strong>
              . We'll confirm on site — nothing is locked in.
            </Callout>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <StepFooter type="button" onContinue={onContinue} />
    </div>
  );
}
