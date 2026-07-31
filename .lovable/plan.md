# Auto Glass Quote Wizard — Riverbend Autoglass Inc.

Route `/get-quote`, also exported as `<AutoGlassQuoteWizard />` for embedding. Phase 1 is frontend-only with mock data; no backend until flow, design, logic and mobile are verified.

Brand: Riverbend Autoglass Inc. · +1 639-525-9707 · sales@riverbendautoglass.ca
Territory: Saskatoon, Warman, Martensville, Langham, Dundurn, Biggar, Humboldt, Melfort, Prince Albert, North Battleford, Battleford, Meadow Lake, Kindersley, Swift Current, Moose Jaw, Yorkton, Estevan.

## Visual direction
Very light grey canvas (#F7F8FA), deep navy primary, warm amber CTA, high contrast text, cards with 18px radius, soft shadows, subtle navy gradient headers, generous spacing, restrained 150–200ms transitions. Base font size 17px, controls min 56px tall. All colours as semantic tokens in `src/styles.css` (oklch) — no hardcoded utility colours.

Desktop: sticky progress header, wizard column centre-left, contextual trust panel right (changes per step: SGI-accredited, lifetime warranty, ADAS calibration, mobile service, reviews), sticky "Call us" pill.
Mobile: single column, full-width cards, sticky bottom Continue bar with Back always present, no horizontal scroll, vehicle diagram replaced by a stacked card picker.

## Stages
1 Welcome · 2 Glass area · 3 Service · 4 Damage assessment · 5 Damage cause · 6 Insurance/SGI · 7 Vehicle info · 8 Glass features · 9 Location · 10 Timing · 11 Uploads · 12 Contact · 13 Review · 14 Confirmation.

## Decision tree
**Glass area** (required, single): Windshield · Front door glass · Rear door glass · Quarter glass · Vent glass · Rear windshield · Sunroof/moonroof · Side mirror · Not sure.
- Windshield → service: Chip/crack repair · Full replacement · Leak/wind noise · ADAS recalibration only · Not sure.
- Any side/rear/quarter/vent/rear-windshield → service is implicitly Replacement (auto-set, shown as a confirmed summary chip, skips Step 3).
- Sunroof → Glass panel replacement · Leak/seal · Not sure.
- Mirror → Full mirror assembly · Mirror glass only · Not sure.
- Not sure (area) → "Not sure" path: a short guided triage (where is the damage? what do you notice? — cracked, hole, leak, wind noise, won't operate, warning light) which maps to a suggested area/service shown as "Recommended: X — we'll confirm on site". Never blocks; Step 4 becomes optional free text.

**Step 4 Damage assessment** — branches:
- Windshield repair: number of chips (1/2/3+), size vs a coin reference, location on glass (edge / driver line of sight / other), crack length, spreading yes/no. Edge or >30cm or driver-view → inline advisory "likely replacement" with a one-tap switch to Replacement (changes Step 3 answer, re-runs routing).
- Windshield replacement: shattered/large crack/multiple damage, vehicle drivable yes/no.
- Leak/wind noise: when it happens (rain / car wash / highway speed), water inside yes/no, prior replacement yes/no, then **skips Step 5 damage cause** and skips ADAS questions.
- ADAS-only: reason (post-replacement / warning light / camera error), prior windshield work date (optional).
- Side/rear/quarter/vent: glass broken out or intact, debris in door, window stuck up/down (door glass only), vehicle secure/needs boarding.
- Sunroof: glass shattered vs leak vs won't slide; is it exploded from inside yes/no.
- Mirror: glass only vs housing, heated/signal/blind-spot indicator visible.

**Step 5 Damage cause** (skipped for leak/wind noise and ADAS-only): Road debris/rock · Collision · Vandalism/break-in · Hail/weather · Unknown.
- Vandalism/break-in → optional police file number field + "we can board up today" note.
- Collision → asks if part of a larger claim (routes insurance step to claim-in-progress copy).
- Hail → asks if multiple glass panels affected (adds an "other damage" note field).

**Step 6 Insurance/SGI** (required): Paying through SGI claim · SGI claim already started (claim number field, optional) · Other insurer · Paying privately · Not sure.
- SGI paths → deductible awareness note, ask "Is this the only claim item?", collect optional claim number + SGI customer name if different from contact.
- Private → show "estimate only, confirmed after vehicle lookup" note; skip claim fields.
- Not sure → keep both, flag lead as `needs_insurance_followup`.
- Windshield **repair** + SGI → surface the "chip repair usually has no deductible" reassurance.

**Step 7 Vehicle info** (required): Year, Make, Model (mock dropdown data), Trim/body style (optional), VIN (optional, checksum-validated when 17 chars), plate (optional).

**Step 8 Glass-specific features** — only asked when relevant to the chosen glass:
- Windshield replacement or ADAS: rain sensor, lane-departure/forward camera, heads-up display, heated wiper park, acoustic glass, condensation sensor, antenna — each Yes/No/Not sure; any camera = ADAS recalibration flagged and explained.
- Door/quarter glass: tint, privacy glass, power window.
- Rear windshield: defroster lines, wiper, antenna.
- Sunroof: panoramic vs single, shade intact.
- Mirror: heated, turn signal, blind spot, power fold, auto-dim.
- All-Not sure answers are allowed; each "Not sure" adds a review-note "we'll verify by VIN".

**Step 9 Location**: Mobile service at my address · In-shop. Then city (list above) + postal code + address (mobile only). Mobile is hidden/disabled with an explanation when the damage assessment says full replacement in freezing conditions is unsuitable or when city is outside the mobile radius — in-shop is then preselected. Mobile + shattered glass → note that cleanup is included.

**Step 10 Timing**: urgency (ASAP / this week / next 2 weeks / flexible) then optional preferred date + morning/afternoon window (shadcn datepicker, `pointer-events-auto`).

**Step 11 Uploads** (optional always, strongly encouraged for repair and leak paths): up to 6 images/PDFs, ≤10MB each, client-side preview, drag/drop + camera capture on mobile. Insurance paths also allow a claim document.

**Step 12 Contact** (required): full name, phone, email; preferred contact method; optional notes; consent checkbox for contact; optional marketing opt-in.

**Step 13 Review**: grouped summary, every row has an Edit link that jumps back to that step and returns to Review afterwards ("return-to-review" mode). Submit disabled until all required fields valid.

**Step 14 Confirmation**: reference number, what happens next, call/email buttons, "start another quote" clears storage.

**Changing earlier answers**: the reducer recomputes the visible step list after every change. Answers on steps that are no longer reachable are retained in a `staleAnswers` bucket (restored if the user returns to that branch) but excluded from validation and payload. If the current step becomes unreachable, the user is moved to the nearest reachable prior step. Changing glass area resets service/assessment/features answers with an inline "we cleared a few answers" toast.

**Progress**: percentage = completed reachable steps ÷ total reachable steps for the *current* path, recomputed on each answer, displayed as both a bar and "Step 4 of 11". The number is clamped so it never decreases by more than one step when the path grows; the welcome screen shows 0% and confirmation 100%.

## Technical plan
**Architecture** (`src/features/quote/`): `AutoGlassQuoteWizard.tsx` (public embeddable export), `WizardShell`, `ProgressHeader`, `TrustPanel`, `StepFooter`, `steps/*` (one component per stage), `components/` (OptionCard, OptionGrid, VehicleAreaDiagram + VehicleAreaCards, PhotoUploader, SummaryRow, HelpCallout), `machine/` (`steps.ts` registry with `id`, `isVisible(answers)`, `schema`, `title`; `reducer.ts`; `useQuoteWizard.ts`), `data/` (mock vehicle years/makes/models, service catalog, cities), `analytics.ts`, `types.ts`. Route file `src/routes/get-quote.tsx` with its own `head()` metadata; `/` gets a short landing that links to it.

**State**: single `QuoteAnswers` object in a reducer, React Hook Form per step with Zod resolvers derived from the step registry, `zodResolver` on step submit and a full-form parse before submission. Autosave to LocalStorage (`riverbend.quote.v1`, versioned, 7-day TTL) on every change; resume prompt on return.

**Types**: discriminated unions for `GlassArea`, `ServiceType`, `DamageDetails` (per-branch payload), `PaymentPath`, `LocationType`, plus `QuoteAnswers`, `StepId`, `WizardState`.

**Errors**: field-level inline messages tied via `aria-describedby`, a step-level error summary focused on failed submit, upload errors per file, an error boundary around the wizard with a recovery "resume from saved answers" action, and mock-submit failure handling with retry.

**Accessibility**: option cards are real radio/checkbox inputs with visible focus rings, `fieldset`/`legend` per question, `aria-live` progress and step announcements, focus moved to step heading on navigation, full keyboard operation, 44px+ targets, AA contrast, reduced-motion respected, labels never placeholder-only.

**Analytics** (`analytics.ts` wrapper, GA4 + Meta Pixel + Google Ads, queued no-ops in phase 1): `quote_start`, `quote_step_view`, `quote_step_complete` (step id, path, progress), `quote_branch_selected`, `quote_not_sure_selected`, `quote_photo_uploaded`, `quote_abandon` (last step), `quote_submit`, `generate_lead` conversion on confirmation.

## Phase 2 (backend, not in this task)
Lovable Cloud tables: `quotes` (all answers as typed columns + `path` jsonb, status, reference, source, utm), `quote_photos` (storage paths), `quote_events` (analytics/audit), `admin_notes`, `user_roles` (separate table + `has_role` security-definer function). RLS: anon insert-only via a server function, admin read/update. Storage bucket private with signed URLs. Server-side Zod re-validation, rate limiting per IP, honeypot + timing check, file type/size enforcement, no PII in logs. Resend notifications to sales@riverbendautoglass.ca plus customer confirmation. Outbound webhook (Zapier/Make/CRM) with HMAC signature. Admin dashboard: lead list with filters (status, service, city, insurance path, date), detail view with photos and full path trace, status pipeline, assign/notes, CSV export, simple conversion metrics.

## Testing matrix
Manual + Vitest coverage for: windshield repair (private / SGI), windshield replacement with ADAS features, leak/wind noise (skips cause), ADAS-only, front door, rear door, rear windshield, quarter, vent, sunroof panel, sunroof leak, mirror assembly, mirror glass, each damage cause, mobile vs in-shop (incl. blocked mobile), each "Not sure" entry point, back-navigation answer change with branch reset, review-edit round trip, LocalStorage resume, upload limits, and 375px / 768px / 1440px responsive passes.
