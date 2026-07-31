import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { QuoteAnswers } from "../types";
import { questionOptions, type Question } from "../machine/questions";
import { OptionCard } from "./OptionCard";
import { Callout } from "./Callout";

interface Props {
  question: Question;
  value: unknown;
  error?: string;
  answers: QuoteAnswers;
  required: boolean;
  onChange: (value: unknown) => void;
}

export function QuestionField({ question: q, value, error, answers, required, onChange }: Props) {
  const id = `q-${q.key}`;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const describedBy = [q.help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const advisory = q.advisory?.(answers);
  const options = questionOptions(q, answers);

  const labelBlock = (
    <div className="mb-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-lg font-semibold text-foreground sm:text-xl">{q.label}</span>
        {q.optionalNote && (
          <span className="text-sm font-medium text-muted-foreground">{q.optionalNote}</span>
        )}
      </div>
      {q.help && (
        <p id={helpId} className="mt-1 text-sm text-muted-foreground">
          {q.help}
        </p>
      )}
    </div>
  );

  const errorBlock = error ? (
    <p id={errorId} className="mt-2 text-sm font-medium text-destructive" role="alert">
      {error}
    </p>
  ) : null;

  const advisoryBlock = advisory ? (
    <Callout tone={advisory.tone} className="mt-3">
      {advisory.text}
    </Callout>
  ) : null;

  if (q.type === "cards" || q.type === "multi") {
    const multi = q.type === "multi";
    const selected = multi ? ((value as string[]) ?? []) : [];
    const toggle = (v: string) => {
      if (!multi) return onChange(v);
      const notSure = v === "not_sure";
      let nextValues = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
      if (notSure && nextValues.includes("not_sure")) nextValues = ["not_sure"];
      else nextValues = nextValues.filter((s) => s !== "not_sure");
      onChange(nextValues);
    };

    return (
      <fieldset aria-describedby={describedBy}>
        <legend className="w-full">{labelBlock}</legend>
        <div className={cn("grid gap-3", q.columns === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
          {options.map((option) => (
            <OptionCard
              key={option.value}
              option={option}
              name={q.key}
              multi={multi}
              selected={multi ? selected.includes(option.value) : value === option.value}
              onSelect={toggle}
            />
          ))}
        </div>
        {errorBlock}
        {advisoryBlock}
      </fieldset>
    );
  }

  if (q.type === "checkbox") {
    return (
      <div>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-border bg-card p-4 shadow-soft transition-colors hover:border-primary/40 has-[button[data-state=checked]]:border-primary">
          <Checkbox
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked === true)}
            aria-describedby={describedBy}
            className="mt-0.5 size-6"
          />
          <span className="text-base text-foreground">
            {q.label}
            {q.optionalNote && (
              <span className="ml-2 text-sm text-muted-foreground">{q.optionalNote}</span>
            )}
          </span>
        </label>
        {errorBlock}
      </div>
    );
  }

  const control = (() => {
    switch (q.type) {
      case "select":
        return (
          <Select value={(value as string) || undefined} onValueChange={onChange}>
            <SelectTrigger id={id} aria-describedby={describedBy} className="h-14 rounded-2xl text-base">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-base">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "textarea":
        return (
          <Textarea
            id={id}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={q.placeholder}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            rows={4}
            className="rounded-2xl text-base"
          />
        );
      case "date":
        return (
          <Input
            id={id}
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            className="h-14 rounded-2xl text-base"
          />
        );
      default:
        return (
          <Input
            id={id}
            type={q.type === "tel" ? "tel" : q.type === "email" ? "email" : "text"}
            inputMode={q.type === "tel" ? "tel" : undefined}
            autoComplete={
              q.key === "fullName" ? "name" : q.key === "email" ? "email" : q.key === "phone" ? "tel" : q.key === "postalCode" ? "postal-code" : q.key === "streetAddress" ? "street-address" : "off"
            }
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={q.placeholder}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            className="h-14 rounded-2xl text-base"
          />
        );
    }
  })();

  return (
    <div>
      <label htmlFor={id} className="mb-3 block">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-semibold text-foreground sm:text-xl">{q.label}</span>
          {q.optionalNote && (
            <span className="text-sm font-medium text-muted-foreground">{q.optionalNote}</span>
          )}
          {!q.optionalNote && required && <span className="sr-only">(required)</span>}
        </span>
        {q.help && (
          <span id={helpId} className="mt-1 block text-sm text-muted-foreground">
            {q.help}
          </span>
        )}
      </label>
      {control}
      {errorBlock}
      {advisoryBlock}
    </div>
  );
}
