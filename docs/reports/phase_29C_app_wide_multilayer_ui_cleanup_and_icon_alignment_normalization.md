# Phase 29C - App-Wide Multilayer UI Cleanup + Icon Alignment Normalization

- Date: 2026-04-06
- Status: implemented, manual verification completed by user
- Scope: controlled UI/system cleanup pass (no domain/model/schema/API expansion)
- Baseline preserved:
  - donation-only product truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline (28A-28Q) + accepted 29B behavior
  - language/analytics truth from 29A/29A.1 (`language_code` + English fallback + manual override priority)

## 1) Audit Findings (post-29B)

Key user-facing seams found before implementation:
1. Travel root still had visual density from duplicated structural accents:
   - title icon + decorative travel badge in header,
   - split `Trips` presentation across adjacent root blocks.
2. Secondary explanatory blocks on non-Travel surfaces remained always visible:
   - Home cancellation helper,
   - Recurring quick tip,
   - Profile quick-start copy.
3. Icon/text rhythm was mostly consistent, but global safeguards were weak:
   - icons inside flex controls could still shrink inconsistently,
   - icon container overflow behavior was not explicitly normalized.
4. Travel icon path geometry itself exceeded expected visual bounds in the 24x24 icon system.

## 2) What Was Changed

## 2.1 Travel Surface (main target)
1. Simplified Travel root header:
   - removed duplicate decorative travel icon badge,
   - kept one semantic title icon only.
2. Consolidated root `Trips` layer:
   - merged CTA lane (`Create trip`, `Join shared trip`) into the same compact list/filter section,
   - removed adjacent duplicate `Trips` block.
3. Reduced non-essential root copy:
   - removed extra helper card that repeated selection guidance.

Result: root Travel became shorter, cleaner, and more app-like while preserving 29B context isolation (`root list` vs `selected trip`).

## 2.2 Home / Recurring / Profile (multilayer propagation)
1. Home:
   - converted cancellation helper card into a collapsible details layer.
2. Recurring:
   - converted always-visible `Quick tip` block into a collapsible details layer.
3. Profile:
   - converted always-visible `Quick start` explanatory copy into a collapsible details layer.

Result: secondary guidance remains discoverable but no longer permanently loads root surfaces with vertical noise.

## 2.3 Shell/Hierarchy cleanup
1. Removed redundant top-right tab status pill in app shell header (it repeated active-tab context already shown on the left).

Result: cleaner top shell header with less repeated icon/label signaling.

## 3) Icon/Text Alignment + Overflow Fixes

1. Added shared CSS icon normalization for major UI primitives:
   - buttons (`primary/secondary/danger/quiet`),
   - icon buttons,
   - section titles/kickers,
   - state pills/chips/inline states,
   - summary actions.
2. Explicitly constrained icon containers:
   - `pc-icon-btn` now has `overflow: hidden` and `line-height: 1`.
3. Improved section-title safety:
   - `pc-section-title` now uses `min-width: 0` for better truncation/alignment behavior in tight rows.
4. Added small reusable surface-head utilities:
   - `pc-surface-head`,
   - `pc-surface-head-main`,
   - `pc-surface-head-actions`,
   - `pc-inline-meta`.
5. Fixed `travel` icon geometry in `AppIcon`:
   - adjusted SVG path to stay visually within bounds and avoid overflow-like rendering artifacts.

## 4) Duplicate Icon Situations Removed

1. Travel section header no longer renders both:
   - title travel icon,
   - separate decorative travel icon badge.
2. Travel root no longer repeats nearby icon-labeled `Trips` entry rows across adjacent blocks.
3. Shell header no longer repeats active-context visual signaling via an extra status pill.

## 5) Files Changed

1. `src/components/app/travel-group-expenses-section.tsx`
2. `src/components/app/payments-dashboard-section.tsx`
3. `src/components/app/recurring-payments-section.tsx`
4. `src/components/app/profile-scenarios-placeholder.tsx`
5. `src/components/app/app-shell.tsx`
6. `src/components/app/app-icon.tsx`
7. `src/app/globals.css`
8. `src/lib/i18n/localization.tsx`
9. `docs/reports/internal_version_history.md`

## 6) What Was Intentionally NOT Changed

1. No DB schema changes, no migrations.
2. No travel domain/API logic changes.
3. No recurring business logic changes.
4. No bot-facing/manual-only layer changes (`/start`, BotFather, menu button, profile media/text).
5. No changes to 29A/29A.1 language model or analytics initialization flow.

## 7) Risks / Regression Watchlist

1. Collapsible helpers (Home/Recurring/Profile) should stay discoverable in Telegram runtime and not feel "hidden."
2. Travel root compacting should preserve quick scan of filters/CTA on smaller devices.
3. Updated travel icon geometry should be visually checked in:
   - root tab icon,
   - section headers,
   - compact buttons.
4. Header simplification in shell should not reduce orientation clarity for first-time users.

## 8) Manual Verification Notes (Telegram runtime)

1. Travel root:
   - one clean header, no duplicate travel icon badge,
   - one compact `Trips` surface with CTA + filters + list.
2. No duplicate join/create entry points and no regressions of accepted 29B flows.
3. Existing trip opens isolated trip workspace as before.
4. Home/Recurring/Profile:
   - secondary guidance now appears via collapsible blocks,
   - primary actions remain immediately visible.
5. Icon alignment:
   - no icon clipping/overflow in Travel header/buttons,
   - icon/text baseline looks stable across tabs and primary buttons.

## 9) Checks Run

Executed:
1. `npm run lint` - pass (existing warnings only: `@next/next/no-img-element` for receipt preview images)
2. `npm run build` - pass
3. targeted tests:
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/finalization.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/split.test.ts` - pass

## 10) Acceptance Self-Check

1. Multilayer UI principle expanded beyond Travel - done (Home/Recurring/Profile secondary layers).
2. Travel surface simplified further without breaking 29B - done.
3. Icon overflow/duplicate presentation addressed (including travel icon geometry) - done.
4. Primary/secondary hierarchy improved - done.
5. Recurring baseline, Travel baseline, and 29A/29A.1 platform-readiness truth preserved - done.


