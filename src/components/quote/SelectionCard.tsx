import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SelectionCardProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  multi?: boolean;
  onSelect: () => void;
  invalid?: boolean;
}

/** Large, accessible selection card used across the wizard. */
export function SelectionCard({
  label,
  description,
  icon,
  selected,
  multi,
  onSelect,
  invalid,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      aria-invalid={invalid || undefined}
      onClick={onSelect}
      className={cn(
        "group relative flex min-h-12 w-full items-start gap-3 rounded-2xl border-2 bg-card p-4 text-left transition-[color,background-color,border-color,box-shadow,transform] duration-200",
        "hover:border-primary/40 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected ? "border-primary bg-primary/5 shadow-soft" : "border-border",
        invalid && !selected && "border-destructive/40",
      )}
    >
      {icon && (
        <span
          className={cn(
            "mt-0.5 shrink-0 text-muted-foreground transition-colors",
            selected && "text-primary",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[0.975rem] font-semibold leading-snug text-foreground">{label}</span>
        {description && (
          <span className="mt-1 block text-sm leading-snug text-muted-foreground">{description}</span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center border-2 transition-colors",
          multi ? "rounded-md" : "rounded-full",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
        )}
      >
        {selected && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}
