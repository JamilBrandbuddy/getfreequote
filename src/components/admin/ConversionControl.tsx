import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { setQuoteConversion } from "@/lib/admin.functions";
import { conversionLabel, suggestedConversion, type ConversionStatus } from "@/lib/conversion";

const badge: Record<string, string> = {
  converted: "bg-primary/10 text-primary",
  not_converted: "bg-destructive/10 text-destructive",
  pending: "bg-muted text-muted-foreground",
};
export function ConversionBadge({ value, status }: { value?: string | null; status?: string }) {
  const hint = status ? suggestedConversion(status, value ?? "pending") : null;
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge[value ?? "pending"] ?? badge.pending}`} title={hint ? `Suggested by quote status: ${conversionLabel(hint)} (not confirmed)` : "Conversion outcome"}>
    {conversionLabel(value)}{hint ? ` · likely ${conversionLabel(hint).toLowerCase()}?` : ""}
  </span>;
}

export function ConversionControl({ quoteId, reference, value, compact }: { quoteId: string; reference: string; value: string; compact?: boolean }) {
  const qc = useQueryClient();
  const save = useServerFn(setQuoteConversion);
  const [target, setTarget] = useState<ConversionStatus | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const m = useMutation({
    mutationFn: (v: { status: ConversionStatus; note: string }) => save({ data: { id: quoteId, status: v.status, note: v.note } }),
    onSuccess: () => { setTarget(null); setNote(""); setError(""); void qc.invalidateQueries(); },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save."),
  });
  const actions: { s: ConversionStatus; label: string; icon: React.ReactNode }[] = [
    { s: "converted", label: "Mark as Converted", icon: <CheckCircle2 className="size-4" aria-hidden /> },
    { s: "not_converted", label: "Mark as Not Converted", icon: <XCircle className="size-4" aria-hidden /> },
    { s: "pending", label: "Reset to Pending", icon: <RotateCcw className="size-4" aria-hidden /> },
  ];
  return <>
    <div className="flex flex-wrap gap-2">
      {actions.filter((a) => a.s !== value).map((a) => <Button key={a.s} type="button" size={compact ? "sm" : "default"} variant="outline" className="rounded-xl" aria-label={`${a.label}: ${reference}`} title={a.label} onClick={() => { setError(""); setTarget(a.s); }}>
        {a.icon}{compact ? <span className="sr-only sm:not-sr-only">{a.label.replace("Mark as ", "")}</span> : a.label}
      </Button>)}
    </div>
    <AlertDialog open={target !== null} onOpenChange={(o) => { if (!o && !m.isPending) setTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change {reference} to {conversionLabel(target)}?</AlertDialogTitle>
          <AlertDialogDescription>Current outcome: {conversionLabel(value)}. This change is saved with your name and the time. The quote status is not changed.</AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Reason or internal note (optional)" aria-label="Reason or internal note" />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={m.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={m.isPending} onClick={(e) => { e.preventDefault(); if (target) m.mutate({ status: target, note }); }}>{m.isPending ? "Saving…" : "Confirm"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
