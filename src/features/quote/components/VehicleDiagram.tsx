import { cn } from "@/lib/utils";

const BASE_GLASS =
  "cursor-pointer outline-none transition-all duration-150 stroke-[1.5]";

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
        viewBox="0 0 640 200"
        className="h-auto w-full"
        role="group"
        aria-label="Vehicle glass diagram"
      >
        {/* Car body silhouette — filled so it reads as a solid shape */}
        <path
          d="M52 160
             C52 142, 66 136, 90 134
             L122 132
             C136 132, 150 124, 162 112
             L204 64
             C218 50, 236 44, 258 44
             L412 44
             C438 44, 458 52, 474 70
             L520 120
             C534 134, 556 136, 574 140
             C588 142, 590 148, 590 158
             L590 168
             L576 168
             C576 168, 574 188, 548 188
             C522 188, 520 168, 520 168
             L172 168
             C172 168, 170 188, 144 188
             C118 188, 116 168, 116 168
             L52 168
             Z"
          className="fill-card stroke-border"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Wheel arches (negative space) */}
        <path
          d="M116 168
             C116 144, 132 140, 144 140
             C156 140, 172 144, 172 168
             Z"
          className="fill-background stroke-background"
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <path
          d="M520 168
             C520 144, 536 140, 548 140
             C560 140, 576 144, 576 168
             Z"
          className="fill-background stroke-background"
          strokeWidth={4}
          strokeLinejoin="round"
        />

        {/* Wheels */}
        <circle
          cx="144"
          cy="170"
          r="22"
          className="fill-muted stroke-border"
          strokeWidth={3}
        />
        <circle
          cx="548"
          cy="170"
          r="22"
          className="fill-muted stroke-border"
          strokeWidth={3}
        />

        {/* Belt line */}
        <path
          d="M88 132 L566 140"
          className="stroke-border/80"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />

        {/* Door seams */}
        <path
          d="M304 52 L304 144"
          className="stroke-border/70"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M394 52 L394 144"
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
          d="M246 48
             L288 48
             C298 48, 306 52, 312 60
             L342 106
             C344 110, 342 112, 338 112
             L246 112
             Z"
        />

        {/* Vent glass */}
        <SelectableGlass
          value="vent"
          label="Vent glass"
          selected={value === "vent"}
          onSelect={onSelect}
          d="M246 116
             L300 116
             C302 116, 304 114, 304 112
             L300 104
             L246 104
             Z"
        />

        {/* Front door glass */}
        <SelectableGlass
          value="front_door"
          label="Front door glass"
          selected={value === "front_door"}
          onSelect={onSelect}
          d="M308 104
             L308 52
             L346 52
             L394 52
             L394 100
             C394 104, 392 106, 388 106
             L316 106
             C312 106, 308 112, 308 104
             Z"
        />

        {/* Rear door glass */}
        <SelectableGlass
          value="rear_door"
          label="Rear door glass"
          selected={value === "rear_door"}
          onSelect={onSelect}
          d="M402 52
             L440 52
             L482 58
             C486 59, 488 62, 488 66
             L488 108
             C488 112, 486 114, 482 114
             L402 114
             Z"
        />

        {/* Quarter glass */}
        <SelectableGlass
          value="quarter"
          label="Quarter glass"
          selected={value === "quarter"}
          onSelect={onSelect}
          d="M496 66
             L520 92
             C522 94, 522 98, 518 98
             L496 98
             Z"
        />

        {/* Rear windshield */}
        <SelectableGlass
          value="rear_windshield"
          label="Rear windshield"
          selected={value === "rear_windshield"}
          onSelect={onSelect}
          d="M468 52
             L490 52
             L510 78
             L510 90
             L488 90
             Z"
        />

        {/* Sunroof */}
        <SelectableGlass
          value="sunroof"
          label="Sunroof"
          selected={value === "sunroof"}
          onSelect={onSelect}
          d="M332 40
             L382 40
             C386 40, 388 42, 388 46
             L388 50
             L332 50
             Z"
        />

        {/* Side mirror */}
        <SelectableGlass
          value="mirror"
          label="Side mirror"
          selected={value === "mirror"}
          onSelect={onSelect}
          d="M338 116
             L366 116
             C372 116, 374 120, 374 124
             L374 130
             C374 134, 372 136, 366 136
             L338 136
             Z"
        />
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
