# Phase 28I - Advanced Debt Optimization + Settlement Plan Simplification

- Date: 2026-04-04
- Status: implemented, pending manual verification
- Scope: travel settlement-layer maturity wave after 28H (math + clarity, no product-truth drift)
- Baseline preserved:
  - unrestricted donation-only model
  - no Premium/entitlement/claim/unlock return
  - recurring and travel remain product-separated

## 1) What Was Audited After 28H

Reviewed before implementation:
1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
2. `docs/reports/phase_27H_final_release_sign_off_and_verified_closure_sync.md`
3. `docs/reports/phase_28A_travel_group_expenses_foundation_and_manual_first_mvp.md`
4. `docs/reports/phase_28A1_recurring_summary_slice_restoration_and_surface_unification.md`
5. `docs/reports/phase_28B_official_subscription_cancellation_guide_layer.md`
6. `docs/reports/phase_28C_expanded_official_cancellation_catalog_and_category_navigation.md`
7. `docs/reports/phase_28D_travel_workspace_acceleration_and_settlement_clarity.md`
8. `docs/reports/phase_28E_trip_closure_and_settlement_finalization.md`
9. `docs/reports/phase_28F_multi_currency_foundation_and_travel_amount_clarity.md`
10. `docs/reports/phase_28G_receipt_capture_and_ocr_prefill_assistant.md`
11. `docs/reports/phase_28H_ocr_quality_hardening_and_receipt_enrichment.md`
12. `docs/reports/internal_version_history.md`

Runtime/data touchpoints audited:
1. `src/lib/travel/split.ts`
2. `src/lib/travel/finalization.ts`
3. `src/lib/travel/repository.ts`
4. `src/lib/travel/types.ts`
5. `src/components/app/travel-group-expenses-section.tsx`
6. settlement-related API wiring in `src/lib/travel/client.ts` and `src/app/api/travel/trips/*`

## 2) Main Settlement Gaps Found

Post-28H settlement runtime was correct and reliable, but still had practical UX/math seams:
1. settlement plan generation was single-strategy greedy only, without explicit optimized-vs-baseline tracking.
2. user-facing settlement block had limited clarity about why this exact plan was chosen.
3. closing/closed progress visibility was present but not surfaced as a compact step/progress model.
4. recommended transfer list was readable, but not framed as an explicit compact plan with optimization context.

## 3) Why 28I Is the Next Logical Step

After 28E (closure/finalization), 28F (multi-currency), and 28G/28H (receipt/OCR quality), the most valuable next travel layer is closure comfort:
1. keep balances mathematically stable,
2. reduce or prevent unnecessary transfer complexity,
3. present settlement actions in a human, step-based way.

28I therefore focuses on settlement plan optimization/simplification while keeping all existing closure mechanics intact.

## 4) Settlement Math Improvements

### 4.1 New advanced settlement planner

Updated `src/lib/travel/split.ts`:
1. retained the previous greedy planner as a baseline (`buildGreedySettlements`).
2. added an advanced deterministic optimizer (`buildOptimizedSettlements`) that:
   - searches settlement combinations in cents-space,
   - memoizes state to keep runtime practical,
   - enforces deterministic ordering/signatures.
3. added a stable chooser (`pickSettlementPlan`) so final recommended plan is never worse than baseline and remains deterministic.

### 4.2 New plan stats

Added `buildTravelSettlementPlan(...)` and summary stats:
1. `baselineTransferCount`
2. `optimizedTransferCount`
3. `reducedTransferCount`

These stats are now part of trip summary payload and are used in UI.

### 4.3 Determinism and predictability

All settlement math remains:
1. deterministic,
2. cents-based,
3. stable with multi-currency normalized amounts from 28F.

No hidden re-interpretation of already-saved expenses was introduced.

## 5) How Extra Transfers Were Reduced/Prevented

Implemented reduction strategy:
1. compute greedy baseline transfer count,
2. compute advanced optimized candidate,
3. select compact deterministic plan and expose explicit reduction delta.

Result:
1. runtime can explicitly avoid unnecessary transfer inflation versus baseline,
2. user sees compact plan metrics (`reducedTransferCount`) directly in trip settlement section.

## 6) User-Facing Settlement View Changes

Updated `src/components/app/travel-group-expenses-section.tsx`:
1. settlement block is now framed as `Recommended settlement plan`.
2. added compact plan meta-line:
   - plan steps count,
   - reduction hint vs baseline when available,
   - explicit "already compact" message when no reduction is available.
3. added step labels (`Step N`) for open transfer rows.
4. added closing/closed progress line:
   - settled/open progress as percentage and step ratio.

This keeps the same workflow but makes the finalization lane more human-readable and action-oriented.

## 7) Closure/Finalization Compatibility (28E)

Preserved and verified by code path:
1. `open/settled` item model unchanged.
2. `active -> closing -> closed` lifecycle unchanged.
3. closure start still snapshots recommended settlements (now from optimized planner).
4. manual mark-settled/return-open actions unchanged.
5. close/reopen behavior remains unchanged.

No bypass of closure locks was introduced.

## 8) Files Changed in 28I Scope

Main runtime files:
1. `src/lib/travel/split.ts`
2. `src/lib/travel/repository.ts`
3. `src/lib/travel/types.ts`
4. `src/components/app/travel-group-expenses-section.tsx`
5. `src/lib/i18n/localization.tsx`

Targeted tests:
1. `src/lib/travel/split.test.ts`

Docs:
1. `docs/reports/phase_28I_advanced_debt_optimization_and_settlement_plan_simplification.md`
2. `docs/reports/internal_version_history.md`

## 9) What Was Intentionally NOT Done

Out of scope and intentionally not implemented:
1. no new OCR wave (28G/28H preserved as-is).
2. no live FX automation or rate fetching.
3. no shell redesign.
4. no recurring/travel model merge.
5. no DB schema migration for this pass.
6. no settlement banking/auto-payment integration.

## 10) Future Roadmap Reminders (not implemented here)

1. richer receipt system (metadata workflow + attachment lifecycle improvements).
2. advanced FX automation/rate assistance.
3. trip archive/completion polish layer after closure baseline.

## 11) Risks / Regression Watchlist

1. For large participant groups, advanced optimizer complexity may need explicit caps/telemetry tuning.
2. Verify mobile readability of step/progress lines in very dense closing sessions.
3. Confirm user understanding of "optimized vs baseline" hint wording on RU/EN surfaces.
4. Verify closure snapshot consistency when reopening and re-closing after additional expense edits.

## 12) Validation

Targeted tests:
1. `node --test --test-isolation=none src/lib/travel/split.test.ts src/lib/travel/finalization.test.ts src/lib/travel/currency.test.ts src/lib/travel/validation.test.ts src/lib/travel/receipt-ocr.test.ts` - pass

Project checks:
1. `npm run lint` - pass
2. `npm run build` - pass

Migration notes:
1. no new migration in 28I.
2. therefore no additional schema-apply step required for this pass.

## 13) Self-Check Against Acceptance Criteria

1. more compact and useful settlement plan: yes.
2. fewer unnecessary transfer actions (or explicit no-extra-transfer confirmation): yes.
3. clearer user-facing "who pays whom" plan view: yes.
4. closure/finalization compatibility preserved: yes.
5. multi-currency, OCR, balances, recurring baseline preserved: yes.
