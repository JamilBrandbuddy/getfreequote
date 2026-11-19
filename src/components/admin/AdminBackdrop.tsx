import { ClientOnly } from "@tanstack/react-router";
import { useEffect } from "react";

const VIDEO_ID = "8-rxbr6MQpg";
const SRC = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0&showinfo=0&modestbranding=1&playsinline=1&rel=0&disablekb=1&iv_load_policy=3`;
const GLASS = ".admin-glass .bg-card, .admin-glass .rounded-xl.border, .admin-glass .rounded-lg.border";

/** Looping muted video behind the admin dashboard, dimmed so text stays readable. */
export function AdminBackdrop() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(GLASS) as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);
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
