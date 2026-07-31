import { useRef, useState } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "../components/Callout";
import { StepFooter } from "../components/StepFooter";
import { analytics } from "../analytics";
import { useQuoteWizardContext } from "../machine/useQuoteWizard";
import type { UploadedFile } from "../types";

const MAX_FILES = 6;
const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

export function UploadsStep() {
  const { state, patch, next } = useQuoteWizardContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const photos = state.answers.photos ?? [];

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const problems: string[] = [];
    const accepted: UploadedFile[] = [];

    for (const file of Array.from(fileList)) {
      if (photos.length + accepted.length >= MAX_FILES) {
        problems.push(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      if (!ACCEPTED.includes(file.type)) {
        problems.push(`${file.name}: only JPG, PNG, WEBP or PDF files are supported.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        problems.push(`${file.name}: files must be under 10 MB.`);
        continue;
      }
      accepted.push({
        id: `${file.name}-${file.size}-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      });
    }

    setErrors(problems);
    if (accepted.length) {
      patch({ photos: [...photos, ...accepted] });
      analytics.photoUploaded(accepted.length);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (id: string) => patch({ photos: photos.filter((p) => p.id !== id) });

  return (
    <div>
      <p className="text-base leading-relaxed text-muted-foreground">
        Photos are optional, but they usually let us quote without an inspection. A wide shot of the
        glass plus a close-up of the damage is perfect.
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className="mt-6 rounded-3xl border-2 border-dashed border-border bg-card p-8 text-center shadow-soft"
      >
        <Upload className="mx-auto size-8 text-muted-foreground" aria-hidden />
        <p className="mt-3 font-semibold text-foreground">Drag photos here, or choose files</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Up to {MAX_FILES} files · JPG, PNG, WEBP or PDF · 10 MB each
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl px-5"
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-5" />
            Choose photos
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED.join(",")}
          capture="environment"
          className="sr-only"
          aria-label="Add photos of the damage"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {errors.length > 0 && (
        <Callout tone="warn" className="mt-4">
          <ul className="list-inside list-disc space-y-1">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Callout>
      )}

      {photos.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {photos.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft"
            >
              {p.previewUrl ? (
                <img
                  src={p.previewUrl}
                  alt={`Preview of ${p.name}`}
                  className="size-14 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-xs font-semibold">
                  PDF
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{p.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {(p.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${p.name}`}
                className="size-11 shrink-0 rounded-xl"
                onClick={() => remove(p.id)}
              >
                <Trash2 className="size-5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <StepFooter
        type="button"
        onContinue={next}
        label={photos.length ? "Continue" : "Skip for now"}
      />
    </div>
  );
}
