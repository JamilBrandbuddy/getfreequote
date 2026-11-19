import { ClientOnly } from "@tanstack/react-router";

const VIDEO_ID = "8-rxbr6MQpg";
const SRC = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0&showinfo=0&modestbranding=1&playsinline=1&rel=0&disablekb=1&iv_load_policy=3`;

/** Looping muted video behind the admin dashboard, dimmed so text stays readable. */
export function AdminBackdrop() {
  return (
    <div aria-hidden className="admin-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <ClientOnly fallback={null}>
        <iframe
          title="Background video"
          src={SRC}
          allow="autoplay; encrypted-media"
          tabIndex={-1}
          className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 scale-110 border-0"
        />
      </ClientOnly>
      <div className="admin-backdrop-tint absolute inset-0" />
    </div>
  );
}
