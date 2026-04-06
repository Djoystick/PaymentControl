# Phase 30C - Modal Surface Unification + Header De-duplication + Home Continuity Rollback + Page Load Performance Fix

- Date: 2026-04-06
- Status: implemented, pending manual verification
- Scope: targeted runtime corrective pass (UI/UX + safe client-side performance hardening)
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline
  - 29A/29A.1 language + analytics truth
  - accepted 29B/29C/29D/29E + implemented 30A/30B flows

## 1) References Used

Before implementation, this pass re-checked:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. reports: `29C`, `29E`, `30A`, `30B`
5. local skill `.codex/skills/ui-ux-pro-max` (`SKILL.md`) as mandatory UI/UX execution reference

How references were applied:
1. `DESIGN.md`: modal-first secondary actions, short root surfaces, no stacked heading noise, one clear action lane.
2. `ui-ux-pro-max`: context isolation, header rhythm cleanup, icon/text de-dup, and performance-aware hidden-layer handling.

## 2) Audit Seams Confirmed for 30C

1. Travel still had participant and expense workflows tied to inline/collapsible surfaces instead of full modal flows.
2. Home continuity lane (`Continue in Recurring` / `Start clean`) produced duplication/noise after returns and competed with primary CTA.
3. Shell + surface headers duplicated context (tab icon/title/hint in shell + local section title/subtitle).
4. Secondary `details/summary` layers still existed across active app surfaces, creating mixed interaction grammar.
5. Travel selected-trip render path still prepared heavy secondary trees even when closed, and travel had no dedicated list/detail cache path.

## 3) What Was Changed

## 3.1 Home continuity rollback and cleaner root behavior
File: `src/components/app/payments-dashboard-section.tsx`

1. Removed runtime-snapshot continuity lane from Home compact dashboard:
   - removed `continueSnapshot` read/resolve/render path
   - removed `Start clean` lane from Home surface
2. Kept Home action-first behavior via KPI + primary `Open Recurring` CTA.
3. Replaced Home `View options` spoiler with modal trigger + modal body (same actions, cleaner layer).

Result: Home no longer duplicates pseudo-smart continuation blocks that were creating confusion after return transitions.

## 3.2 Header de-duplication pass at shell level
File: `src/components/app/app-shell.tsx`

1. Removed shell-level active-tab icon/title/hint stack.
2. Kept only compact shell kicker (`Payment Control`) so each surface owns its own header context.

Result: reduced repeated header stacks like `Payment Control + Profile + Workspace and settings` appearing in adjacent layers.

## 3.3 Travel modal-first unification (key corrective requirement)
File: `src/components/app/travel-group-expenses-section.tsx`

1. Converted selected-trip participant workflow into full modal (`Participants`) instead of collapsible inline surface.
2. Converted selected-trip receipt draft workflow into full modal (`Receipt drafts`) instead of collapsible inline surface.
3. Converted selected-trip expense create/edit workflow into full modal (`Expense form` / `Edit expense form`) instead of inline/collapsible form surface.
4. Kept selected-trip workspace focused:
   - added compact `Expense workspace actions` row
   - kept core workspace context separated from heavy forms/secondary blocks.
5. Converted `Trip overview` and `Trip lifecycle actions` from detail spoilers to modal flows.
6. Converted receipt review nested OCR text spoiler into modal (`OCR text snippet`).

Result: Travel selected-trip now behaves as a cleaner workspace with modal secondary/form flows, aligned with `Create trip` model.

## 3.4 App-wide details/spoiler to modal unification on active surfaces
Files:
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/travel-group-expenses-section.tsx`
- new shared helpers:
  - `src/components/app/modal-sheet.tsx`
  - `src/components/app/modal-disclosure.tsx`

Implemented:
1. Replaced active-surface `details/summary` blocks with one modal family pattern.
2. Converted recurring secondary detail lanes (`Template shortcuts`, `Advanced options`, `Draft and template tools`, `Quick tip`, `List view options`, card-level `Details and actions`) to modal disclosure pattern.
3. Converted profile secondary sections (`Quick start`, `Report a bug`, `Optional details`, `How to cancel subscriptions`, `Supporter badge management`, `Support the project`, `Family workspace optional`, invite diagnostic) to modal disclosure pattern.
4. Converted history `View options` spoiler to modal.

Note: `src/components/app/reminder-candidates-section.tsx` still contains legacy `details/summary`, but this component is not mounted in current active runtime path.

## 3.5 Performance hardening (real runtime work)
Files:
- `src/lib/travel/client-cache.ts` (new)
- `src/components/app/travel-group-expenses-section.tsx`

Implemented:
1. Added dedicated travel list/detail client cache:
   - cached trip list by workspace
   - cached trip detail by workspace+trip
   - storage+memory envelope with TTL strategy
2. Updated travel loading path:
   - show cached trips/detail immediately when available
   - avoid clearing selected trip to `null` before detail fetch when cache exists
   - background refresh keeps correctness and updates cache
3. Reduced render churn on heavy hidden travel layers:
   - large modal bodies (participants/receipts/expense/overview/lifecycle) now render only when opened.

Result: faster perceived load and less blank/spinner-first behavior on Travel pages, plus lower hidden-surface render overhead.

## 3.6 Localization coverage for new modal/system copy
File: `src/lib/i18n/localization.tsx`

Added RU translations for newly introduced modal/system strings (close/action descriptions and modal helper copy used by 30C) to keep RU runtime consistent.

## 4) Home-Specific Corrective Outcome

1. `Continue in Recurring` lane removed from Home compact surface.
2. `Start clean` lane removed from Home compact surface.
3. No more Home continuity-duplication stack competing with primary action.

## 5) Files Changed

1. `src/components/app/app-shell.tsx`
2. `src/components/app/payments-dashboard-section.tsx`
3. `src/components/app/payments-activity-section.tsx`
4. `src/components/app/recurring-payments-section.tsx`
5. `src/components/app/travel-group-expenses-section.tsx`
6. `src/components/app/profile-scenarios-placeholder.tsx`
7. `src/components/app/modal-sheet.tsx` (new)
8. `src/components/app/modal-disclosure.tsx` (new)
9. `src/lib/travel/client-cache.ts` (new)
10. `src/lib/i18n/localization.tsx`
11. `docs/reports/internal_version_history.md`
12. `docs/reports/phase_30C_modal_surface_unification_header_deduplication_home_continuity_rollback_and_page_load_performance_fix.md`

## 6) What Was Intentionally NOT Changed

1. No DB schema/migration changes.
2. No shell/tab-bar redesign.
3. No premium/paywall/entitlement return.
4. No bot-facing manual Telegram profile/settings changes.
5. No change to 29A/29A.1 language detection model or analytics wiring semantics.

## 7) Checks Run

1. `npm run lint` - pass (existing warnings only: `@next/next/no-img-element` in travel receipt image previews)
2. `npm run build` - pass
3. targeted tests:
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/finalization.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/split.test.ts` - pass

## 8) Manual Verification Notes (Telegram runtime)

1. Home:
   - continuity duplicate lane is gone
   - primary action remains clear
   - `View options` opens as modal
2. Travel:
   - participant management opens as modal
   - receipt drafts open as modal
   - expense create/edit opens as modal
   - selected-trip workspace remains clean while modal is closed
3. Headers:
   - shell no longer duplicates per-tab title/hint stack above surface headers
4. Performance:
   - revisit Travel tab/trips and confirm faster first meaningful paint from cache
   - confirm selected-trip reopen no longer blanks aggressively when cached detail exists

## 9) Risks / Regression Watchlist

1. Modal discoverability: ensure users still find secondary actions quickly (especially Recurring card-level details).
2. Nested modal density: verify small screens for long profile/help forms still feel manageable.
3. Travel cache staleness window: confirm cache refresh is visible and does not mask real updates for too long.
4. Remaining non-mounted legacy details component (`reminder-candidates-section`) should be aligned if it returns to active runtime.

## 10) Acceptance Self-Check

1. `ui-ux-pro-max` used as active UI/UX reference - done.
2. `DESIGN.md` guardrails used - done.
3. Home problematic continuity blocks removed - done.
4. Travel participant/expense workflows moved to full modal flows - done.
5. Active-surface details/spoiler layers replaced by modal pattern - done for active mounted app surfaces.
6. Header/icon/title duplication reduced at shell+surface composition level - done.
7. Real performance hardening implemented (cache + hidden heavy layer deferral), not only cosmetic skeleton changes - done.
8. Baseline and product truth constraints preserved - done.
