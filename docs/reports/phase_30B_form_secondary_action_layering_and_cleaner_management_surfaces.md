# Phase 30B - Form / Secondary-Action Layering and Cleaner Management Surfaces

- Date: 2026-04-06
- Status: implemented, pending manual verification
- Scope: app-wide form and secondary-action layering pass (UI/runtime only)
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline (28A-28Q)
  - accepted 29B/29C behavior + implemented 29D/29E + implemented 30A
  - 29A/29A.1 language model and analytics wiring

## 1) References and Method

Before implementation, this pass re-checked:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. reports: 29B, 29C, 29D, 29E, 29F, 30A
5. local skill `.codex/skills/ui-ux-pro-max` (`SKILL.md` + practical rules/checklists for mobile-first layering, action hierarchy, compact secondary controls)

How references were used:
1. `DESIGN.md` guardrails enforced: one dominant action lane, secondary controls in secondary layers, no root-level control clutter.
2. `ui-ux-pro-max` guidance applied: compact headers, reduced helper noise, modal/detail focus, consistent action-row hierarchy, avoid control-panel effect.

## 2) Selected High-Value Seams (30B audit)

Chosen seams (practical only):
1. `Recurring` composer modal still had always-visible secondary management blocks (template shortcuts + draft/template tools) competing with main submit path.
2. `Selected trip` kept expense form always visible, creating heavy continuous workspace even when user only needs overview/history/settlements.
3. `Selected trip` top lane had duplicate path to history (`Open history layer` button + layer tabs), creating avoidable action competition.
4. `Profile` bug report form displayed optional details and auto-context explanation by default, adding visible noise to a secondary flow.

## 3) What Was Changed

## 3.1 Recurring form simplification
File: `src/components/app/recurring-payments-section.tsx`

1. Removed always-visible "Main action" meta card from composer modal.
2. Moved `Quick templates` into a collapsible secondary layer (`Template shortcuts`).
3. Moved `Save as template` and `Clear form` into nested secondary tools layer (`Draft and template tools`) inside advanced options.
4. Kept primary submit/cancel lane unchanged and explicit.

Result: composer stays focused on core fields and submit path; secondary utilities remain discoverable but non-intrusive.

## 3.2 Travel selected-trip layering (expense workflow)
File: `src/components/app/travel-group-expenses-section.tsx`

1. Added dedicated expense-form layer state (`isExpenseFormPanelOpen`) for selected trip workspace.
2. Converted always-visible expense form into collapsible `Expense form`/`Edit expense form` detail layer.
3. `Quick add expense` now opens and focuses the expense form layer (no manual scrolling needed).
4. Added explicit secondary close action (`Hide form`) in the expense form footer.
5. If user hides form while editing, edit mode is safely canceled first (no hidden half-edit state).
6. Removed duplicate top-level `Open history layer` button; history remains accessible through existing workspace layer tabs (`Expenses / Settlements / History`).

Result: selected-trip surface is calmer by default; create/edit expense stays isolated and intentional.

## 3.3 Profile secondary cleanup (bug report)
File: `src/components/app/profile-scenarios-placeholder.tsx`

1. Moved optional bug-report fields and explanatory auto-context note into a collapsible `Optional details` layer.
2. Kept required bug-report fields and primary submit action visible.

Result: bug-report entry stays lighter while preserving full detail path when needed.

## 3.4 Localization updates
File: `src/lib/i18n/localization.tsx`

Added RU coverage for new UI strings used by 30B layering:
1. `Template shortcuts`
2. `Draft and template tools`
3. `Expense form`
4. `Edit expense form`
5. `Hide form`
6. `Optional details`

(Existing 30A/29E-related localization updates remain intact and were not rolled back.)

## 4) Surfaces that became calmer

1. Recurring composer: less always-visible template/management noise.
2. Selected trip workspace: no permanent expense form block; clearer split between overview/workspace and edit context.
3. Profile bug report: optional parts hidden by default.

## 5) Files Changed in Phase 30B

1. `src/components/app/recurring-payments-section.tsx`
2. `src/components/app/travel-group-expenses-section.tsx`
3. `src/components/app/profile-scenarios-placeholder.tsx`
4. `src/lib/i18n/localization.tsx`
5. `docs/reports/internal_version_history.md`
6. `docs/reports/phase_30B_form_secondary_action_layering_and_cleaner_management_surfaces.md` (this report)

## 6) What Was Intentionally NOT Changed

1. No DB/schema/migration changes.
2. No API/domain logic changes.
3. No shell/tab rewrite.
4. No bot-facing/manual-only Telegram layer changes (`/start`, BotFather, menu button, profile media/text).
5. No changes to 29A/29A.1 language detection model or analytics initialization model.
6. No rollback of accepted 29B-29E and implemented 30A behavior.

## 7) Checks Run

Executed:
1. `npm run lint` - pass (existing warnings only: `@next/next/no-img-element` in travel receipt previews)
2. `npm run build` - pass
3. targeted tests:
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/finalization.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/split.test.ts` - pass

## 8) Manual Verification Notes (Telegram runtime)

1. Recurring composer:
   - core fields are immediately visible,
   - `Template shortcuts` and `Draft and template tools` are discoverable but collapsed,
   - submit/cancel hierarchy remains clear.
2. Selected trip workspace:
   - `Quick add expense` opens focused expense form layer,
   - form can be hidden via `Hide form`,
   - hiding during edit should cancel edit and avoid hidden edit-state,
   - history still reachable through layer tabs (no regression after removing duplicate button).
3. Profile bug report:
   - required fields visible by default,
   - optional steps/context note available under `Optional details`.
4. Regression safety:
   - 29B create/join isolation + selected-trip isolation still intact,
   - 29E context/reset/return behavior still coherent,
   - 30A root brevity and first-action clarity preserved.

## 9) Risks / Regression Watchlist

1. Discoverability risk: collapsed secondary layers must still feel obvious on small screens.
2. Expense-form toggle risk: ensure users understand where form is after switching selected-trip layers.
3. Edit-state safety risk: verify no stale edit draft remains after hide/cancel transitions.
4. RU copy wrapping risk: check new labels in tight viewport rows (`Expense form`, `Optional details`, etc.).

## 10) Acceptance Self-Check

1. `ui-ux-pro-max` used as operational UI/UX reference - done.
2. `DESIGN.md` used as guardrail - done.
3. Forms became cleaner with fewer always-visible secondary controls - done.
4. Secondary actions moved to layered surfaces where practical - done.
5. No domain/schema changes and no shell redesign - done.
6. 29B-29E + 30A baseline behavior preserved - done.
7. No premium/paywall/entitlement regressions - done.
