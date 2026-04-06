# Phase 30A - Root Surface Brevity + First-Action Clarity

- Date: 2026-04-06
- Status: implemented, pending manual verification
- Scope: app-wide UX/UI pass on root surfaces (real code changes, no domain/schema expansion)
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel baseline 28A-28Q + accepted 29B/29C + implemented 29D/29E
  - language/analytics truth from 29A/29A.1 (`Telegram language_code` + English fallback + manual override)

## 1) Inputs and Working References

Mandatory references used before and during implementation:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. `docs/reports/phase_29B_travel_surface_context_isolation_and_action_deduplication.md`
5. `docs/reports/phase_29C_app_wide_multilayer_ui_cleanup_and_icon_alignment_normalization.md`
6. `docs/reports/phase_29D_app_wide_daily_flow_simplification_and_surface_hierarchy_polish.md`
7. `docs/reports/phase_29E_app_wide_navigation_consistency_and_context_return_polish.md`
8. `docs/reports/phase_29F_design_foundation_and_payment_control_design_md_bootstrap.md`
9. Local skill `.codex/skills/ui-ux-pro-max` as UI/UX quality reference (mobile-first hierarchy, multilayer structure, text restraint, CTA priority)

## 2) Short Root-Surface Audit (Before Changes)

High-value seams selected for 30A:
1. `Home`: secondary navigation actions still competed with main action lane.
2. `Recurring`: top lane still contained extra explanatory copy and equal-weight action competition.
3. `Travel root`: empty-state copy remained heavier than needed for first action.
4. `History`: root copy and empty-state copy were longer than needed for action-first scan.
5. `Profile`: top block still looked too technical/verbose for a root surface.

## 3) What Was Changed

## 3.1 Home - clearer first action, less top-level competition
1. Subtitle tightened to `Snapshot and next step`.
2. Main root action lane compressed to one clear primary daily action (`Open Recurring...`).
3. Secondary Home navigation actions (`Travel`, `History`, cancellation guides) moved under a compact `View options` layer.
4. Empty state strengthened with primary CTA emphasis (`Add first recurring payment`).

## 3.2 Recurring - shorter root and stronger primary intent
1. Subtitle shortened to `Recurring payments routine`.
2. Removed extra always-visible helper copy under `Main action lane`.
3. Reduced visual noise in top summary chips by removing non-critical always-visible chip (`Active`).
4. Kept one dominant root action (`Add payment`) and de-emphasized secondary fast focus action (`Action now`) to quiet style.
5. Empty-state copy shortened and rewritten in action-first style.
6. Empty-state CTA promoted to primary button (`Open add payment form`).

## 3.3 Travel root - lighter entry and cleaner empty-state guidance
1. Subtitle tightened to `Trips, receipts, and settlements`.
2. Root empty-state copy shortened from instruction-like paragraphs to concise action cues:
   - `Create your first trip.`
   - `Choose another section or show all trips.`
3. Added direct primary CTA in no-trips empty state (`Create trip`) for immediate first step.
4. Preserved 29B context isolation (root list stays separate from selected-trip workspace).

## 3.4 History - concise scan and direct next action
1. Subtitle shortened to `Recent payment updates`.
2. Empty-state texts compacted to short action-oriented lines:
   - `Add first payment in Recurring.`
   - `Add first shared payment in Recurring.`
   - `Mark paid or edit a payment in Recurring.`
3. Kept clear action path from empty states back to Recurring.

## 3.5 Profile - less technical root tone
1. Subtitle changed from technical wording to `Workspace and settings`.
2. `Quick start` guidance moved to collapsible/details layer to avoid persistent text density on root.
3. Removed low-value always-visible line (`Context ready`) from root session block.

## 3.6 Localization alignment (RU/EN)
Added/updated RU keys for new concise strings and action cues in:
- `src/lib/i18n/localization.tsx`

This keeps RU as first-class user scenario while preserving 29A/29A.1 language model.

## 4) Root Surface Impact Summary

How 30A implements `DESIGN.md` principles:
1. Root surfaces are shorter and faster to parse.
2. One dominant next step is clearer per screen.
3. Secondary options are available but no longer compete with the main action lane.
4. Empty states now push immediate useful action instead of reading long guidance.
5. Text restraint improved without removing important discoverability.

## 5) Files Changed in Phase 30A

1. `src/components/app/payments-dashboard-section.tsx`
2. `src/components/app/recurring-payments-section.tsx`
3. `src/components/app/travel-group-expenses-section.tsx`
4. `src/components/app/payments-activity-section.tsx`
5. `src/components/app/profile-scenarios-placeholder.tsx`
6. `src/lib/i18n/localization.tsx`
7. `docs/reports/internal_version_history.md`
8. `docs/reports/phase_30A_root_surface_brevity_and_first_action_clarity.md` (this file)

## 6) What Was Intentionally NOT Changed

1. No DB/schema/migration changes.
2. No API/domain logic changes.
3. No shell/tab rewrite and no new root tabs.
4. No bot-facing/manual-only layer changes (BotFather, `/start`, menu button, profile media/text).
5. No language-source model changes from 29A/29A.1.
6. No analytics bootstrap logic changes.
7. No rollback of accepted 29B/29C and implemented 29D/29E navigation/context patterns.

## 7) Manual Verification Notes (Telegram Runtime)

1. `Home`
   - main action lane should read immediately,
   - `View options` should hold secondary routes without crowding root,
   - empty-state CTA should feel clearly primary.
2. `Recurring`
   - top feels shorter, `Add payment` remains obvious first action,
   - `Action now` remains available but visually secondary,
   - empty state should feel action-first and concise.
3. `Travel root`
   - no-trip state should show immediate `Create trip` path,
   - filtered-empty state should be short and clear,
   - selected-trip isolation from 29B should remain intact.
4. `History`
   - root should feel lighter,
   - empty-state wording should be short and direct,
   - CTA should still route correctly to Recurring add flow.
5. `Profile`
   - top block should feel less technical,
   - quick-start details should be discoverable but non-intrusive.

## 8) Risks / Regression Watchlist

1. Over-compression risk: reduced copy must still be clear for first-time users.
2. Secondary discoverability risk: collapsed options/help must remain easy to find in Telegram viewport.
3. CTA hierarchy drift risk: future passes should not reintroduce equal-weight action competition on root surfaces.
4. RU copy wrapping risk: validate compact labels on narrow screens.

## 9) Checks Run

Executed:
1. `npm run lint` - pass (existing warning only: `@next/next/no-img-element` in receipt preview areas)
2. `npm run build` - pass
3. Targeted tests:
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/finalization.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/split.test.ts` - pass

## 10) Acceptance Self-Check

1. `DESIGN.md` used as design guardrail - done.
2. `ui-ux-pro-max` used as quality reference - done.
3. Root surfaces shortened without breaking baseline flows - done.
4. First-action clarity improved across Home/Recurring/Travel/History/Profile - done.
5. Empty states became shorter and more actionable - done.
6. 29B/29C/29D/29E accepted behavior preserved - done.
7. No premium/paywall regressions - done.
8. 29A/29A.1 language/analytics truth preserved - done.
