# Phase 30N - OCR Receipt-to-Expense Handoff + Full Receipt Preview Fix

- Date: 2026-04-06
- Status: implemented, pending manual verification
- Scope: narrow corrective pass after live OCR flow check (no new OCR/provider wave, no shell redesign)
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline
  - modal-first grammar from 30C/30D
  - save-now/parse-later receipt truth
  - OCR as helper/prefill only, manual expense confirmation required

## 1) References Used

Re-checked before changes:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. `.codex/skills/ui-ux-pro-max/SKILL.md`
5. `docs/reports/phase_30H_travel_receipt_ocr_reliability_and_modal_viewport_regression_fix.md`
6. `docs/reports/phase_30I_ocr_operational_truth_and_receipt_draft_save_regression_fix.md`
7. `docs/reports/phase_30J_ocr_provider_diagnostics_and_error_mapping_hardening.md`
8. `docs/reports/phase_30K_paddleocr_foundation_ocr_provider_refactor_and_receipt_prefill_reliability.md`
9. `docs/reports/phase_30L_paddle_backend_contract_alignment_and_ocr_error_mapping_correction.md`
10. `docs/reports/phase_30M_client_side_ocr_spike_and_browser_ocr_integration_foundation.md`

How `DESIGN.md` + `ui-ux-pro-max` were applied:
1. Keep the flow focused and modal-clean (no extra feature wave).
2. Fix handoff correctness first, then add one practical attachment-preview entry point.
3. Keep copy short and action-oriented for mobile runtime.

## 2) Runtime Seam and Root Cause

Observed seam:
1. `Use in expense form` executed, but prefilled values (especially amount) were not staying in the expense form.

Exact root cause:
1. In `src/components/app/travel-group-expenses-section.tsx`, the large `useEffect` that reacts to trip/context changes always called `resetExpenseDraftToDefaults(selectedTrip)` in non-edit mode.
2. `applyReceiptPrefillToExpenseForm(...)` sets `attachedReceiptDraftId` and prefilled draft state, but the same effect immediately reset the draft back to defaults on the next render cycle.
3. Result: OCR handoff looked successful in feedback text, but amount could disappear from `Amount` input.

## 3) What Was Fixed

## 3.1 Receipt-to-expense handoff persistence
File:
1. `src/components/app/travel-group-expenses-section.tsx`

Changes:
1. Added guard in the trip-context normalization effect to avoid default-draft reset while `attachedReceiptDraftId` is active.
2. Preserved the existing prefill builder `createExpenseDraftFromReceiptSuggestion(...)` (which already maps:
   - amount,
   - currency,
   - conversion rate,
   - description/merchant,
   - category,
   - spent date).
3. Closed receipt-side layers during handoff for cleaner route to expense editing:
   - `setIsReceiptRawTextModalOpen(false)`
   - `setActiveReceiptReviewId(null)`
   - `setIsReceiptPanelOpen(false)`

Result:
1. OCR prefill is no longer immediately overwritten.
2. Minimum requirement met: OCR amount now persists into expense `Amount` field when present in parsed receipt.

## 3.2 Full-size attached receipt preview
File:
1. `src/components/app/travel-group-expenses-section.tsx`

Changes:
1. Added dedicated preview state:
   - `receiptImagePreviewDraftId`
   - derived `activeReceiptImagePreview`
2. Added full-size preview modal via shared modal family (`ModalSheet`) with mobile-friendly geometry:
   - large width (`max-w-5xl`)
   - `object-contain`
   - bounded max height for Telegram/mobile viewport
3. Added practical open points:
   - from `Receipt review` modal (`Open full receipt`)
   - from attached receipt block inside expense form (thumbnail + `Open full receipt` button)
4. Added stale-state cleanup when previewed receipt disappears from current trip snapshot.

Result:
1. User can open attached receipt in readable full-size mode instead of tiny thumbnail.

## 3.3 Localization updates
File:
1. `src/lib/i18n/localization.tsx`

Added RU mapping for new labels:
1. `Receipt preview`
2. `Open full receipt`
3. `Open full-size preview for easier amount/date verification.`

## 4) Files Changed

1. `src/components/app/travel-group-expenses-section.tsx`
2. `src/lib/i18n/localization.tsx`
3. `docs/reports/internal_version_history.md`
4. `docs/reports/phase_30N_ocr_receipt_to_expense_handoff_and_full_receipt_preview_fix.md`

## 5) What Was Intentionally NOT Changed

1. No new OCR engine/provider architecture changes.
2. No backend route/provider contract changes.
3. No shell/navigation redesign.
4. No recurring flow changes.
5. No premium/paywall/entitlement logic changes.
6. No bot-facing manual layer changes (`/start`, BotFather, menu button, profile media).

## 6) Verification Run

Executed:
1. `npm run lint` (pass; existing `next/no-img-element` warnings remain)
2. `npm run build` (pass)

## 7) Manual Verification Checklist (Telegram Runtime)

1. Travel -> open active trip -> `Receipt drafts`.
2. Run OCR for a draft with detectable amount.
3. Tap `Use in expense form`.
4. Confirm:
   - expense form opens in modal flow,
   - `Amount` is prefilled from OCR,
   - value stays in field (not immediately reset),
   - user can still edit manually.
5. In attached receipt block inside expense form:
   - tap thumbnail or `Open full receipt`,
   - confirm full-size readable preview opens,
   - close preview and return to same expense form state.
6. Save expense manually and ensure:
   - no auto-save happened before explicit submit,
   - draft/attachment behavior remains coherent.

## 8) Risks / Regression Watchlist

1. Existing `<img>` usage warnings remain (intentionally unchanged in this narrow pass).
2. If OCR parse result truly lacks amount, prefill amount remains empty by design; this pass fixes the handoff reset regression, not OCR extraction accuracy.
3. Any future broad state refactors around trip/context effects should preserve the attached-receipt guard to avoid reintroducing prefill wipe.
