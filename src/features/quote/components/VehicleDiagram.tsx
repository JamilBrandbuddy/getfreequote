import { cn } from "@/lib/utils";

interface Region {
  value: string;
  label: string;
}

const REGIONS: Region[] = [
  { value: "windshield", label: "Front windshield" },
  { value: "sunroof", label: "Sunroof" },
  { value: "front_door", label: "Front door glass" },
  { value: "rear_door", label: "Rear door glass" },
  { value: "quarter", label: "Quarter glass" },
  { value: "rear_windshield", label: "Rear windshield" },
  { value: "vent", label: "Vent glass" },
  { value: "mirror", label: "Side mirror" },
];

const BASE_GLASS =
  "cursor-pointer outline-none transition-all duration-150 stroke-[1.5]";

const BODY_STROKE = "stroke-[3]";

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
        viewBox="0 0 640 220"
        className="h-auto w-full"
        role="group"
        aria-label="Vehicle glass diagram"
      >
        {/* Car body silhouette (background shape) */}
        <path
          d="M48 168
             C48 148, 62 142, 86 140
             L120 138
             C132 138, 144 130, 156 118
             L198 68
             C210 54, 226 48, 248 48
             L410 48
             C438 48, 458 56, 474 74
             L522 128
             C536 142, 560 144, 578 148
             C592 150, 594 156, 594 166
             L594 176
             L576 176
             C576 176, 574 196, 548 196
             C522 196, 520 176, 520 176
             L172 176
             C172 176, 170 196, 144 196
             C118 196, 116 176, 116 176
             L48 176
             Z"
          className="fill-card stroke-border"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{
            strokeWidth: "var(--body-stroke, 3)",
          } as React.CSSProperties}
        />

        {/* Wheel arches / cutouts (negative space) */}
        <path
          d="M116 176
             C116 150, 134 146, 144 146
             C154 146, 172 150, 172 176
             Z"
          className="fill-background stroke-background"
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <path
          d="M520 176
             C520 150, 538 146, 548 146
             C558 146, 576 150, 576 176
             Z"
          className="fill-background stroke-background"
          strokeWidth={4}
          strokeLinejoin="round"
        />

        {/* Wheels */}
        <circle
          cx="144"
          cy="178"
          r="22"
          className="fill-muted stroke-border"
          strokeWidth={3}
        />
        <circle
          cx="548"
          cy="178"
          r="22"
          className="fill-muted stroke-border"
          strokeWidth={3}
        />

        {/* Belt line / body crease */}
        <path
          d="M86 140 L564 148"
          className="stroke-border"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />

        {/* Door seams */}
        <path
          d="M302 58 L302 150"
          className="stroke-border/70"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M392 58 L392 150"
          className="stroke-border/70"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />

        {/* Windshield */}
        <SelectableGlass
          value="windshield"
          label="Front windshield"
          selected={value === "windshield"}
          onSelect={onSelect}
          d="M244 52
             L290 52
             C300 52, 310 56, 316 64
             L350 110
             C352 114, 350 118, 346 118
             L244 118
             Z"
        />

        {/* Vent glass (small triangle in front of front door) */}
        <SelectableGlass
          value="vent"
          label="Vent glass"
          selected={value === "vent"}
          onSelect={onSelect}
          d="M244 122
             L300 122
             C302 122, 304 120, 304 118
             L300 108
             L244 108
             Z"
        />

        {/* Front door glass */}
        <SelectableGlass
          value="front_door"
          label="Front door glass"
          selected={value === "front_door"}
          onSelect={onSelect}
          d="M308 122
             L308 58
             L344 58
             L392 58
             L392 108
             C392 112, 390 114, 386 114
             L316 114
             C312 114, 308 120, 308 122
             Z"
        />

        {/* Rear door glass */}
        <SelectableGlass
          value="rear_door"
          label="Rear door glass"
          selected={value === "rear_door"}
          onSelect={onSelect}
          d="M400 58
             L440 58
             L484 64
             C488 65, 490 68, 490 72
             L490 114
             C490 118, 488 120, 484 120
             L400 120
             Z"
        />

        {/* Quarter glass (small triangle behind rear door) */}
        <SelectableGlass
          value="quarter"
          label="Quarter glass"
          selected={value === "quarter"}
          onSelect={onSelect}
          d="M498 70
             L524 98
             C526 100, 526 104, 522 104
             L498 104
             Z"
        />

        {/* Rear windshield */}
        <SelectableGlass
          value="rear_windshield"
          label="Rear windshield"
          selected={value === "rear_windshield"}
          onSelect={onSelect}
          d="M468 58
             L490 58
             L510 84
             L510 96
             L488 96
             Z"
        />

        {/* Sunroof */}
        <SelectableGlass
          value="sunroof"
          label="Sunroof"
          selected={value === "sunroof"}
          onSelect={onSelect}
          d="M330 44
             L380 44
             C384 44, 386 46, 386 50
             L386 54
             L330 54
             Z"
        />

        {/* Side mirror */}
        <SelectableGlass
          value="mirror"
          label="Side mirror"
          selected={value === "mirror"}
          onSelect={onSelect}
          d="M338 120
             L366 120
             C372 120, 374 124, 374 128
             L374 134
             C374 138, 372 140, 366 140
             L338 140
             Z"
        />

        {/* Region labels below the car */}
        <g className="text-[10px] font-medium fill-muted-foreground">
          {REGIONS.map((r, i) => (
            <text
              key={r.value}
              x={60 + i * 72}
              y="206"
              textAnchor="middle"
              className={cn(
                "text-[11px]",
                value === r.value ? "fill-foreground font-semibold" : "fill-muted-foreground"
              )}
            >
              {r.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

function SelectableGlass({
  value,
  label,
  selected,
  onSelect,
  d,
}: {
  value: string;
  label: string;
  selected: boolean;
  onSelect: (value: string) => void;
  d: string;
}) {
  return (
    <path
      d={d}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={() => onSelect(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(value);
        }
      }}
      className={cn(
        BASE_GLASS,
        selected
          ? "fill-primary stroke-primary"
          : "fill-primary/12 stroke-primary/40 hover:fill-primary/25 focus-visible:fill-primary/30"
      )}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}
