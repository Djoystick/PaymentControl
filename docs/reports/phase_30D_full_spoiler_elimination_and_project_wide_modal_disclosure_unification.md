# Phase 30D - Full Spoiler Elimination + Project-Wide Modal Disclosure Unification

- Date: 2026-04-06
- Status: implemented, pending manual verification
- Scope: targeted UX grammar unification pass (project-wide spoiler/disclosure cleanup)
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline
  - 29A/29A.1 language + analytics truth
  - accepted/implemented UX chain 29C -> 30C

## 1) References Used

Mandatory references rechecked:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. `docs/reports/phase_29C_app_wide_multilayer_ui_cleanup_and_icon_alignment_normalization.md`
5. `docs/reports/phase_30B_form_secondary_action_layering_and_cleaner_management_surfaces.md`
6. `docs/reports/phase_30C_modal_surface_unification_header_deduplication_home_continuity_rollback_and_page_load_performance_fix.md`
7. Skill: `.codex/skills/ui-ux-pro-max/SKILL.md`

How references were applied:
1. `DESIGN.md`: secondary info/actions should not expand inline on root/workspace surfaces.
2. `ui-ux-pro-max`: modal-first secondary flows, compact copy, clean trigger labels, predictable close path, no spoiler-style inline growth.

## 2) Full Project Spoiler Audit

Audit method:
1. Global scan for `details/summary` in `src/**`.
2. Additional scan for custom expand/collapse hints (`expanded`, `collaps`, `disclosure`, `accordion`, `aria-expanded`) in `src/components/**` and `src/app/**`.

Findings:
1. Active mounted surfaces touched in 30C were already clean (no remaining `details/summary`).
2. Remaining spoiler seams were concentrated in one legacy/dormant component:
   - `src/components/app/reminder-candidates-section.tsx`
3. Found 7 remaining `details/summary` spoiler blocks there:
   - `Diagnostics and dispatch observation`
   - `Telegram onboarding help`
   - `Recipient binding verification`
   - `Last dispatch result`
   - `Last test send`
   - `Last binding verify`
   - `Recent attempts`
4. Component usage check showed this component is currently dormant (not mounted by current runtime path), but it stayed in codebase and could regress UX if reintroduced without cleanup.

## 3) What Was Changed in 30D

## 3.1 Full spoiler elimination in remaining legacy component
File: `src/components/app/reminder-candidates-section.tsx`

1. Added `ModalDisclosure` usage.
2. Replaced all remaining `details/summary` blocks with modal triggers using the same modal family introduced in 30C.
3. Kept each disclosure entry discoverable with explicit trigger labels and concise modal descriptions.
4. Preserved existing operational controls/content inside modal bodies (no feature removal).

Result:
1. `details/summary` pattern is removed from this component.
2. Secondary/help/diagnostic content no longer expands inline.

## 3.2 Localization coverage for new modal descriptors
File: `src/lib/i18n/localization.tsx`

Added RU translations for newly introduced modal description strings in this pass, keeping RU UX consistency and avoiding English-only helper text in Russian runtime.

## 3.3 Project-wide spoiler-style status after 30D
1. `rg "<details|<summary" src` now returns no matches.
2. Spoiler-style `details/summary` UX pattern is eliminated from current project source (`src/**`).

## 4) Active Surfaces Already Clean After 30C (Kept Intact)

No rollback was introduced for 30C conversions:
1. Home `View options` modal.
2. Recurring secondary detail lanes modalized.
3. Profile secondary sections modalized.
4. History `View options` modal.
5. Travel participant/receipt/expense/overview/lifecycle modal flows.
6. OCR text snippet modal.

30D extends this model to remaining legacy seams only.

## 5) Files Changed

1. `src/components/app/reminder-candidates-section.tsx`
2. `src/lib/i18n/localization.tsx`
3. `docs/reports/internal_version_history.md`
4. `docs/reports/phase_30D_full_spoiler_elimination_and_project_wide_modal_disclosure_unification.md`

## 6) What Was Intentionally NOT Changed

1. No DB schema/migration/API/domain changes.
2. No shell/tab redesign.
3. No new feature-wave.
4. No language model changes from 29A/29A.1.
5. No bot-facing manual-only layer changes.
6. No conversion of primary independent workflows into forced nested modal chains.

## 7) Checks Run

Executed:
1. `npm run lint` - pass (existing warnings only: `@next/next/no-img-element` in travel receipts)
2. `npm run build` - pass
3. Targeted tests:
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/finalization.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/split.test.ts` - pass

## 8) Manual Verification Notes (Telegram runtime)

1. Confirm no spoiler-style inline expansions remain where secondary info appears.
2. In reminder operations surfaces (if mounted in your runtime), verify each former spoiler entry now opens via modal trigger and closes predictably.
3. Verify trigger discoverability remains clear (no hidden functions after modalization).
4. Recheck 30C modalized active surfaces for regressions:
   - Home / Recurring / Travel / History / Profile.

## 9) Risks / Regression Watchlist

1. Dormant-component risk: if `ReminderCandidatesSection` is remounted later, confirm modal trigger density remains manageable on narrow screens.
2. Copy density risk: keep modal descriptions concise to avoid replacing spoilers with long modal walls.
3. Modal stack risk: maintain single-layer modal behavior in these flows (avoid nested modal chains).

## 10) Acceptance Self-Check

1. `ui-ux-pro-max` used as modal-first UX reference - done.
2. `DESIGN.md` used as design guardrail - done.
3. Remaining project spoilers identified project-wide - done.
4. Remaining `details/summary` seams converted - done.
5. Active surfaces from 30C preserved - done.
6. No premium/paywall/domain regressions introduced - done.
7. RU strings preserved and extended for new modal descriptions - done.
