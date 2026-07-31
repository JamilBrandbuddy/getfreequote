import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function Callout({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "warn";
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "warn" ? AlertCircle : Info;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 text-sm leading-relaxed",
        tone === "warn"
          ? "border-cta/40 bg-cta/10 text-foreground"
          : "border-primary/15 bg-primary/[0.05] text-foreground",
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", tone === "warn" ? "text-cta" : "text-primary")} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
