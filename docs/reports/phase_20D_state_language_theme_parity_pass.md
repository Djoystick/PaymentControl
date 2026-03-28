# Phase 20D — State Language + Theme Parity Pass

- Date: 2026-03-29
- Project: Payment Control Telegram Mini App
- Source-of-truth used: `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Confirmed baseline before implementation: Phase 19B/19C/20B/20C manual verified
- Pass type: controlled UI-system normalization (no business-logic rewrite)

## Objective of the pass

Нормализовать state language и усилить light/dark parity на компонентном уровне для пользовательских и owner-visible поверхностей:

1. empty/loading/error/success feedback;
2. inline status presentation;
3. calm, compact, task-oriented state containers;
4. consistent state readability in both themes.

## Files changed

1. `src/app/globals.css`
2. `src/components/app/payments-dashboard-section.tsx`
3. `src/components/app/payments-activity-section.tsx`
4. `src/components/app/recurring-payments-section.tsx`
5. `src/components/app/profile-scenarios-placeholder.tsx`
6. `src/components/app/premium-admin-console.tsx`
7. `docs/reports/internal_version_history.md`
8. `docs/reports/phase_20D_state_language_theme_parity_pass.md` (this report)

## How state language was normalized

### 1) Shared state primitives (global)

Added in `src/app/globals.css`:

- state color tokens for light/dark:
  - info / success / warning / danger (bg + border + text)
- state utility classes:
  - `pc-state-inline`
  - `pc-feedback`
  - `pc-feedback-success`
  - `pc-feedback-warning`
  - `pc-feedback-error`
  - `pc-status-pill`
  - `pc-status-pill-success`
  - `pc-status-pill-warning`
  - `pc-status-pill-error`
- restrained loading motion utility:
  - `pc-spin` + reduced-motion shutdown

Result:
- one shared language for inline state and feedback banners;
- no per-screen ad-hoc state styling drift.

### 2) Home / Dashboard state alignment

Changed in `src/components/app/payments-dashboard-section.tsx`:

- loading lines converted to compact inline state with icon/spin (`pc-state-inline`);
- paid/unpaid compact line normalized to inline state treatment;
- error feedback normalized into a clear but calm error banner (`pc-feedback pc-feedback-error`).

### 3) History state alignment

Changed in `src/components/app/payments-activity-section.tsx`:

- loading line normalized to inline state pattern;
- bottom feedback normalized to error banner;
- activity event badges moved to shared status-pill model instead of local one-off tones.

### 4) Reminders state alignment

Changed in `src/components/app/recurring-payments-section.tsx`:

- introduced explicit feedback tone state (`info/success/error`) without changing action semantics;
- all major user feedback points (save/archive/mark paid/undo/pause/resume/validation/load errors) now set a consistent tone;
- bottom feedback block now uses unified banner treatment and icon mapping by tone;
- key status chips (paid/unpaid/action-now/paused) switched to shared status-pill language with text+icon (not color-only).

### 5) Profile state alignment

Changed in `src/components/app/profile-scenarios-placeholder.tsx`:

- premium loading/unavailable states normalized to shared inline/banner patterns;
- premium active/free state presented via shared status-pill;
- bug report success/error feedback moved to shared banner system;
- gift claim status moved to shared status-pill with explicit success/warning tone;
- invite copy status moved to shared status-pill with explicit success/error/neutral meaning;
- invite accept diagnostic status label moved to shared status-pill success/error;
- global action message moved to shared info feedback banner.

### 6) Owner admin state alignment (visible admin surface)

Changed in `src/components/app/premium-admin-console.tsx`:

- added explicit admin message tone state (`info/success/error`);
- admin messages now rendered with shared feedback banner style and icon semantics;
- campaign status badges moved to shared status-pill language;
- empty campaign state moved to shared inline state message;
- target premium state converted to shared status-pill.

## How theme parity was improved

1. Added dedicated state tokens in both light and dark themes for info/success/warning/danger.
2. Replaced legacy hardcoded state color fragments in touched areas with shared token-based classes.
3. Preserved compact hierarchy in dark mode (quiet states remain quiet, warning/error are visible but restrained).
4. Loading icon motion now consistently respects reduced-motion (`pc-spin` disabled in reduced mode).

## What was intentionally NOT changed

1. No business logic changes.
2. No recurring/payment generation logic changes.
3. No backend/API changes.
4. No template matching logic changes (strict title-only remains intact).
5. No RUB default behavior changes.
6. No help-popover behavior changes.
7. No navigation architecture changes.
8. No onboarding redesign.
9. No premium/admin permission model changes.

## Validation executed

1. `npm run lint` — passed
2. `npm run build` — passed

## Risks / follow-up notes

1. Some secondary legacy status strings in deep optional blocks still use old text-tone patterns; they can be incrementally moved to shared state classes in future narrow passes.
2. Status-pills now rely on shared classes; future UI passes should avoid reintroducing local color-only status fragments.
3. Final UX acceptance still needs live Telegram WebView checks on narrow mobile widths for density/readability.

## Ready for manual verification

**Yes — pass is code/report ready for manual testing.**

Manual verification is not claimed in this report.

## Encoding safety check

Checked touched files:

1. `src/app/globals.css`
2. `src/components/app/payments-dashboard-section.tsx`
3. `src/components/app/payments-activity-section.tsx`
4. `src/components/app/recurring-payments-section.tsx`
5. `src/components/app/profile-scenarios-placeholder.tsx`
6. `src/components/app/premium-admin-console.tsx`
7. `docs/reports/internal_version_history.md`
8. `docs/reports/phase_20D_state_language_theme_parity_pass.md`

Result:

- UTF-8 preserved.
- No mojibake introduced in touched RU/EN user-facing content.

## Pre-report self-check against prompt/scope

1. State language coherence improved across empty/loading/error/success/status surfaces — PASS.
2. Theme parity strengthened via shared token-based state classes in both themes — PASS.
3. State clarity improved without turning UI louder — PASS.
4. Important states remain distinguishable without relying only on color (text + icon + container) — PASS.
5. Warning/emphasis styles remain limited and meaningful — PASS.
6. No verified logic/flow regressions introduced by scope — PASS.
7. Pass remains compact, mobile-first, app-like — PASS.
