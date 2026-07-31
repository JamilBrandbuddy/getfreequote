import { BadgeCheck, Camera, CalendarClock, Car, MapPin, Phone, ShieldCheck, Sparkles, Star } from "lucide-react";
import { BUSINESS } from "../data/catalog";
import type { TrustKey } from "../machine/steps";

const PANELS: Record<TrustKey, { icon: typeof ShieldCheck; title: string; body: string }[]> = {
  welcome: [
    { icon: ShieldCheck, title: "SGI-accredited", body: "We bill SGI directly, so there's no paperwork on your end." },
    { icon: Star, title: "Lifetime workmanship warranty", body: "Every install is backed for as long as you own the vehicle." },
  ],
  glass: [
    { icon: Sparkles, title: "OEM-quality glass", body: "We fit glass that meets or beats your factory specification." },
    { icon: ShieldCheck, title: "Chip repairs are often free", body: "With an SGI claim, most chip repairs carry no deductible." },
  ],
  adas: [
    { icon: BadgeCheck, title: "In-house ADAS recalibration", body: "Lane-keep and forward cameras are recalibrated before you drive away." },
    { icon: ShieldCheck, title: "Documented results", body: "You receive a calibration report with your invoice." },
  ],
  insurance: [
    { icon: ShieldCheck, title: "We handle the claim", body: "Give us the details and we'll take it from there with SGI." },
    { icon: BadgeCheck, title: "No surprise pricing", body: "Your deductible is confirmed before any work starts." },
  ],
  vehicle: [
    { icon: Car, title: "Right glass, first visit", body: "Year, make and model let us pre-order the exact part." },
    { icon: BadgeCheck, title: "VIN verified", body: "Adding a VIN removes any guesswork on sensors and tint." },
  ],
  location: [
    { icon: MapPin, title: "Serving Saskatchewan", body: "Saskatoon, Prince Albert, Moose Jaw, Yorkton, Swift Current and more." },
    { icon: Car, title: "Mobile service available", body: "We come to your home or workplace in most communities." },
  ],
  timing: [
    { icon: CalendarClock, title: "Same-week appointments", body: "Most repairs are booked within 48 hours." },
    { icon: ShieldCheck, title: "Safe drive-away time", body: "We tell you exactly when the vehicle is ready to drive." },
  ],
  photos: [
    { icon: Camera, title: "Photos speed things up", body: "A clear photo often means we can quote without an inspection." },
    { icon: ShieldCheck, title: "Private by default", body: "Your photos are only used to prepare your quote." },
  ],
  contact: [
    { icon: Phone, title: "A real person calls you", body: "No call centres — you speak to our Saskatchewan team." },
    { icon: ShieldCheck, title: "No obligation", body: "A quote is just a quote. Nothing is booked until you say so." },
  ],
  review: [
    { icon: BadgeCheck, title: "Check before you send", body: "Edit any answer — nothing is submitted until you press send." },
    { icon: ShieldCheck, title: "Fast response", body: "Most quotes go out the same business day." },
  ],
};

export function TrustPanel({ trust }: { trust: TrustKey }) {
  const items = PANELS[trust];

  return (
    <aside className="hidden w-80 shrink-0 lg:block" aria-label="Why choose Riverbend Autoglass">
      <div className="sticky top-40 space-y-4">
        <div className="rounded-3xl border border-border bg-gradient-navy p-6 text-primary-foreground shadow-elevated">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-foreground/70">
            Why Riverbend
          </p>
          <div className="mt-4 space-y-5">
            {items.map((item) => (
              <div key={item.title} className="flex gap-3">
                <item.icon className="mt-0.5 size-5 shrink-0 text-accent" />
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-primary-foreground/80">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <p className="text-sm text-muted-foreground">Prefer to talk it through?</p>
          <a
            href={BUSINESS.phoneHref}
            className="mt-2 flex items-center gap-2 text-lg font-bold text-foreground hover:text-primary"
          >
            <Phone className="size-5 text-accent" />
            {BUSINESS.phone}
          </a>
          <p className="mt-2 text-sm text-muted-foreground">
            Mon–Fri 8:00 am – 5:30 pm · Sat by appointment
          </p>
        </div>
      </div>
    </aside>
  );
}
