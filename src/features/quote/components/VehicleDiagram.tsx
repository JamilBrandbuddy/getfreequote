import { cn } from "@/lib/utils";

interface Region {
  value: string;
  label: string;
  /** SVG polygon points for the side-profile diagram. */
  points: string;
}

const REGIONS: Region[] = [
  { value: "windshield", label: "Front windshield", points: "196,96 250,52 292,52 292,96" },
  { value: "sunroof", label: "Sunroof", points: "296,48 372,48 372,62 296,62" },
  { value: "front_door", label: "Front door glass", points: "298,96 298,52 356,52 356,96" },
  { value: "rear_door", label: "Rear door glass", points: "362,96 362,52 418,52 418,96" },
  { value: "quarter", label: "Quarter glass", points: "424,96 424,54 456,60 456,96" },
  { value: "rear_windshield", label: "Rear windshield", points: "462,96 462,58 512,96" },
  { value: "vent", label: "Vent glass", points: "276,96 292,60 292,96" },
  { value: "mirror", label: "Side mirror", points: "292,100 312,100 312,114 292,114" },
];

export function VehicleDiagram({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="hidden rounded-3xl border border-border bg-gradient-canvas p-6 shadow-soft md:block">
      <p className="mb-4 text-sm font-medium text-muted-foreground">
        Tap the glass on the diagram, or choose from the list below.
      </p>
      <svg
        viewBox="140 20 420 160"
        className="h-auto w-full"
        role="group"
        aria-label="Vehicle glass diagram"
      >
        {/* body */}
        <path
          d="M170 150 Q168 118 196 110 L226 108 L262 58 Q272 46 292 46 L452 46 Q470 46 482 58 L524 104 L556 112 Q572 116 572 136 L572 150 Z"
          className="fill-card stroke-border"
          strokeWidth={3}
        />
        <circle cx="238" cy="150" r="22" className="fill-muted stroke-border" strokeWidth={3} />
        <circle cx="490" cy="150" r="22" className="fill-muted stroke-border" strokeWidth={3} />

        {REGIONS.map((r) => {
          const selected = value === r.value;
          return (
            <polygon
              key={r.value}
              points={r.points}
              tabIndex={0}
              role="button"
              aria-pressed={selected}
              aria-label={r.label}
              onClick={() => onSelect(r.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(r.value);
                }
              }}
              className={cn(
                "cursor-pointer outline-none transition-colors duration-150",
                selected
                  ? "fill-primary stroke-primary"
                  : "fill-primary/12 stroke-primary/40 hover:fill-primary/25 focus-visible:fill-primary/30",
              )}
              strokeWidth={2}
            />
          );
        })}
      </svg>
    </div>
  );
}
