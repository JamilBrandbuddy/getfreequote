import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Option } from "@/config/quoteOptions";
import { cn } from "@/lib/utils";
import { SelectionCard } from "./SelectionCard";

/* ------------------------------------------------------------------ shell */

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, optional, htmlFor, children }: FieldProps) {
  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <Label htmlFor={htmlFor} className="text-base font-semibold leading-snug text-foreground">
          {label}
          {optional && <span className="ml-2 text-sm font-normal text-muted-foreground">Optional</span>}
        </Label>
        {hint && <p className="text-sm leading-snug text-muted-foreground">{hint}</p>}
      </div>
      {children}
      {error && <FieldError message={error} />}
    </div>
  );
}

export function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-1.5 text-sm font-medium text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

/* ----------------------------------------------------------- card choices */

interface ChoiceProps {
  label: string;
  hint?: string;
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  columns?: 1 | 2 | 3;
  optional?: boolean;
}

const gridFor = (columns: 1 | 2 | 3 = 2) =>
  columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";

export function ChoiceCards({ label, hint, options, value, onChange, error, columns = 2, optional }: ChoiceProps) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="space-y-1">
        <span className="block text-base font-semibold leading-snug text-foreground">
          {label}
          {optional && <span className="ml-2 text-sm font-normal text-muted-foreground">Optional</span>}
        </span>
        {hint && <span className="mt-1 block text-sm leading-snug text-muted-foreground">{hint}</span>}
      </legend>
      <div role="radiogroup" aria-label={label} className={cn("grid gap-3", gridFor(columns))}>
        {options.map((o) => (
          <SelectionCard
            key={o.value}
            label={o.label}
            description={o.description}
            selected={value === o.value}
            invalid={!!error}
            onSelect={() => onChange(o.value)}
          />
        ))}
      </div>
      {error && <FieldError message={error} />}
    </fieldset>
  );
}

interface MultiChoiceProps extends Omit<ChoiceProps, "value" | "onChange"> {
  values?: string[];
  onChange: (values: string[]) => void;
  /** Values that clear every other selection when picked. */
  exclusive?: string[];
}

export function MultiChoiceCards({
  label,
  hint,
  options,
  values = [],
  onChange,
  error,
  columns = 2,
  optional,
  exclusive = ["none", "not-sure", "unknown"],
}: MultiChoiceProps) {
  const toggle = (value: string) => {
    if (exclusive.includes(value)) {
      onChange(values.includes(value) ? [] : [value]);
      return;
    }
    const cleaned = values.filter((v) => !exclusive.includes(v));
    onChange(cleaned.includes(value) ? cleaned.filter((v) => v !== value) : [...cleaned, value]);
  };

  return (
    <fieldset className="space-y-2.5">
      <legend className="space-y-1">
        <span className="block text-base font-semibold leading-snug text-foreground">
          {label}
          {optional && <span className="ml-2 text-sm font-normal text-muted-foreground">Optional</span>}
        </span>
        {hint && <span className="mt-1 block text-sm leading-snug text-muted-foreground">{hint}</span>}
      </legend>
      <div className={cn("grid gap-3", gridFor(columns))}>
        {options.map((o) => (
          <SelectionCard
            key={o.value}
            multi
            label={o.label}
            description={o.description}
            selected={values.includes(o.value)}
            invalid={!!error}
            onSelect={() => toggle(o.value)}
          />
        ))}
      </div>
      {error && <FieldError message={error} />}
    </fieldset>
  );
}

/* ------------------------------------------------------------ text inputs */

interface TextFieldProps {
  id: string;
  label: string;
  hint?: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  optional?: boolean;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  autoComplete?: string;
  maxLength?: number;
  min?: string;
}

export function TextField({
  id,
  label,
  hint,
  value = "",
  onChange,
  error,
  optional,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  maxLength,
  min,
}: TextFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} htmlFor={id}>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        value={value}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl text-base"
      />
      {error && <span id={`${id}-error`} className="sr-only" />}
    </Field>
  );
}

export function TextAreaField({
  id,
  label,
  hint,
  value = "",
  onChange,
  error,
  optional,
  placeholder,
  maxLength = 1000,
}: Omit<TextFieldProps, "type" | "inputMode" | "autoComplete" | "min">) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} htmlFor={id}>
      <Textarea
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-28 rounded-xl text-base"
      />
    </Field>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  hint?: string;
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  optional?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function SelectField({
  id,
  label,
  hint,
  options,
  value,
  onChange,
  error,
  optional,
  placeholder = "Select…",
  disabled,
}: SelectFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} htmlFor={id}>
      <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} aria-invalid={!!error} className="h-12 rounded-xl text-base">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-base">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

interface CheckboxRowProps {
  id: string;
  label: ReactNode;
  checked?: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export function CheckboxRow({ id, label, checked = false, onChange, error }: CheckboxRowProps) {
  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border-2 bg-card p-4 transition-colors",
          checked ? "border-primary/60 bg-primary/5" : "border-border",
          error && "border-destructive/50",
        )}
      >
        <Checkbox
          id={id}
          checked={checked}
          aria-invalid={!!error}
          onCheckedChange={(v) => onChange(v === true)}
          className="mt-0.5 size-5"
        />
        <Label htmlFor={id} className="cursor-pointer text-sm font-normal leading-relaxed text-foreground">
          {label}
        </Label>
      </div>
      {error && <FieldError message={error} />}
    </div>
  );
}

/* ------------------------------------------------------------- advisories */

export function Advisory({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "success";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: "border-primary/25 bg-primary/5 text-foreground",
    warn: "border-cta/40 bg-cta/10 text-foreground",
    success: "border-emerald-500/30 bg-emerald-500/10 text-foreground",
  } as const;
  return (
    <div className={cn("rounded-2xl border p-4 text-sm leading-relaxed", tones[tone])}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}
