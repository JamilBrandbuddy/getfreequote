import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Option } from "../data/catalog";

interface Props {
  option: Option;
  name: string;
  selected: boolean;
  multi?: boolean;
  onSelect: (value: string) => void;
}

export function OptionCard({ option, name, selected, multi, onSelect }: Props) {
  const disabled = Boolean(option.disabled);

  return (
    <label
      className={cn(
        "group relative flex min-h-[68px] cursor-pointer items-start gap-3 rounded-2xl border-2 bg-card p-4 text-left shadow-soft transition-[border-color,box-shadow,transform] duration-150 sm:p-5",
        "hover:border-primary/40 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        selected ? "border-primary bg-primary/[0.04]" : "border-border",
        disabled && "cursor-not-allowed opacity-60 hover:border-border",
      )}
    >
      <input
        type={multi ? "checkbox" : "radio"}
        name={name}
        value={option.value}
        checked={selected}
        disabled={disabled}
        onChange={() => !disabled && onSelect(option.value)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center border-2 transition-colors",
          multi ? "rounded-md" : "rounded-full",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
        )}
      >
        {selected && <Check className="size-4" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-foreground sm:text-[1.0625rem]">
          {option.label}
        </span>
        {option.description && (
          <span className="mt-1 block text-sm leading-snug text-muted-foreground">
            {option.description}
          </span>
        )}
        {disabled && option.disabledNote && (
          <span className="mt-1 block text-sm leading-snug text-muted-foreground">
            {option.disabledNote}
          </span>
        )}
      </span>
    </label>
  );
}
