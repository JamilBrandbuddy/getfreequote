import { useEffect, useRef } from "react";

/**
 * Spam guards for the public quote form: a hidden honeypot field and a
 * submission-timing check. Both are re-verified on the server.
 */

const guard = { startedAt: Date.now(), honeypot: "" };

export function resetSpamGuard() {
  guard.startedAt = Date.now();
  guard.honeypot = "";
}

export const spamGuardValues = () => ({
  company: guard.honeypot,
  elapsedMs: Date.now() - guard.startedAt,
});

/** Off-screen field only bots fill in. Renders nothing visible. */
export function HoneypotField() {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    guard.startedAt = Date.now();
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
      <label htmlFor="company-website">Company website</label>
      <input
        ref={ref}
        id="company-website"
        name="company_website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        onChange={(e) => {
          guard.honeypot = e.target.value;
        }}
      />
    </div>
  );
}

/* --------------------------------------------------------------- file store */

/** Raw File objects kept out of React state (and out of LocalStorage). */
const files = new Map<string, File>();

export const fileStore = {
  add: (id: string, file: File) => files.set(id, file),
  remove: (id: string) => files.delete(id),
  get: (ids: string[]) => ids.map((id) => files.get(id)).filter((f): f is File => Boolean(f)),
  clear: () => files.clear(),
};
