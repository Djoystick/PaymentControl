# Phase 30Q - Final Receipt OCR Practicalization + Key Summary Focus

- Date: 2026-04-07
- Status: implemented, pending manual verification
- Scope: final narrow practical OCR pass (no new OCR platform, no broad UX wave)
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline
  - modal-first grammar
  - receipt draft/save/reopen/retry/handoff flow
  - OCR remains helper only, manual expense confirmation remains mandatory

## 1) Mandatory References Used

Read before implementation:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. `.codex/skills/ui-ux-pro-max/SKILL.md`
5. `docs/reports/phase_30M_client_side_ocr_spike_and_browser_ocr_integration_foundation.md`
6. `docs/reports/phase_30N_ocr_receipt_to_expense_handoff_and_full_receipt_preview_fix.md`
7. `docs/reports/phase_30O_receipt_ocr_quality_hardening_total_extraction_reliability_and_qr_first_foundation.md`
8. `docs/reports/phase_30P_receipt_review_foreground_fix_russian_ocr_cleanup_and_key_field_first_presentation.md`

How references were applied:
1. `DESIGN.md`: reinforced short, action-first review flow with key result first and no noisy text wall.
2. `ui-ux-pro-max`: used focused layered disclosure pattern (primary summary, secondary reference, deep debug).
3. 30M-30P continuity: kept current OCR engine/provider flow and current draft/handoff/preview behavior intact.

## 2) Practical Problem Framing (Before 30Q)

Live practical issue after 30P:
1. Total extraction improved, but OCR text still carried too much visual/mental weight in review.
2. Merchant/date reliability still needed targeted polishing for real receipts.
3. Main review outcome needed to be a calm key summary, not text-fragment quality.
4. Raw OCR text still needed stronger demotion to secondary diagnostics.

## 3) Key-Field Improvements Implemented

File: `src/lib/travel/ocr/receipt-heuristics.ts`

Implemented:
1. Strengthened total reliability when any total marker exists:
   - added explicit penalty for non-marker/header-item amount candidates when total markers are present.
   - keeps priority on true totals over item-line amounts.
2. Improved merchant stability:
   - added brand-hint scoring (merchant-like lines get practical preference).
   - added fallback preference from legal-entity line to nearby cleaner brand-like header line.
   - added merchant normalization (strip legal prefixes/quotes and normalize casing conservatively).
3. Improved date stability:
   - added stricter recency guard (reject implausible future dates for receipt context).
   - added score boost for marker-adjacent date lines.
4. Refined mixed-script cleanup behavior:
   - stronger cleanup on key lines (totals/date/receipt labels/merchant-like lines),
   - conservative mixed-script token cleanup on non-key lines.

## 4) Summary-First Presentation (Primary UX Result)

File: `src/components/app/travel-group-expenses-section.tsx`

Implemented:
1. Added derived `activeReceiptSummary` for practical key review output.
2. Reframed primary review card from generic field dump to `Receipt key summary`:
   - compact top line with practical summary (`amount - merchant - date` when available),
   - primary fields shown in priority order: amount -> merchant -> date,
   - short description shown only as optional secondary line,
   - explicit manual-review indicator when key-field quality is low/missing.
3. Preserved editability and manual-confirmation behavior.

## 5) Raw OCR Text Demotion

File: `src/components/app/travel-group-expenses-section.tsx`

Implemented:
1. Demoted OCR text to a clearly secondary block:
   - renamed to secondary reference semantics,
   - reduced on-surface snippet size and visual weight.
2. Reframed raw text entry labels:
   - `Open OCR reference`
   - `Open raw OCR diagnostics`
3. Reframed OCR text modal:
   - non-debug mode is explicit reference fragment (shorter excerpt),
   - debug mode is explicit diagnostics dump and not presented as final OCR result.
4. Reduced default non-debug OCR excerpt size to prevent noisy dump dominance.

## 6) OCR Reference Text Practicalization

File: `src/lib/travel/ocr/receipt-heuristics.ts`

Implemented:
1. Reworked readable OCR text builder to be key-focused and concise:
   - prioritize header/date/totals/key-marker lines,
   - cap by tighter line and character limits.
2. Reduced accidental noise prominence by reducing broad item-line inclusion.

Result:
1. OCR text remains available for manual cross-check/debug.
2. Key review focus shifts to actionable summary fields.

## 7) Localization / Copy Alignment

File: `src/lib/i18n/localization.tsx`

Added RU strings for:
1. new summary-first labels,
2. secondary reference framing,
3. explicit diagnostic wording,
4. manual-check guidance copy.

This keeps Russian UX as first-class flow in receipt review.

## 8) Files Changed

1. `src/lib/travel/ocr/receipt-heuristics.ts`
2. `src/lib/travel/ocr/receipt-heuristics.test.ts`
3. `src/components/app/travel-group-expenses-section.tsx`
4. `src/lib/i18n/localization.tsx`
5. `docs/reports/phase_30Q_final_receipt_ocr_practicalization_and_key_summary_focus.md`
6. `docs/reports/internal_version_history.md`

## 9) What Was Intentionally NOT Changed

1. No premium/paywall/entitlement logic reintroduced.
2. No recurring-domain changes.
3. No recurring/travel merge.
4. No OCR engine/provider swap.
5. No new OCR architecture wave.
6. No shell/tab/global navigation redesign.
7. No bot-facing manual Telegram layer changes.
8. No auto-expense creation from OCR.
9. No break in draft/save/reopen/retry/handoff baseline by design.

## 10) Verification Run (Code-Level)

Executed:
1. `node --test src/lib/travel/ocr/receipt-heuristics.test.ts` - pass (7/7)
2. `npm run lint` - pass with existing non-blocking `next/no-img-element` warnings in receipt image surfaces
3. `npm run build` - pass

Notes:
1. This report does not claim device/manual verification completion.

## 11) Manual Verification Checklist

1. Travel -> `Receipt drafts` -> `Review receipt`.
2. Confirm primary block is `Receipt key summary` and key fields are first focus.
3. Verify totals on historically problematic receipts (item-price vs true total cases).
4. Verify merchant/date extraction is useful/stable on real receipts.
5. Open secondary OCR reference and ensure it is no longer dominant primary surface.
6. Open raw OCR diagnostics and confirm it is clearly secondary/debug semantics.
7. Confirm `Use in expense form` still transfers values and keeps manual editing.
8. Confirm full-size receipt preview still works.
9. Confirm `Run OCR prefill` / `Reparse OCR` / draft lifecycle still works.
10. Confirm RU strings render correctly in review and OCR reference layers.

## 12) Risks / Regression Watchlist

1. Merchant/date extraction remains heuristic; rare noisy receipts can still need manual correction.
2. Conservative mixed-script cleanup may leave some noise (intentional to avoid false corrections).
3. Total reliability is prioritized over full-text aesthetics by design; this is intentional.
4. Existing `<img>` lint warnings remain outside scope.

## 13) Final Practicalization Self-Check

1. `ui-ux-pro-max` used - yes.
2. `DESIGN.md` used - yes.
3. Key-field extraction improved without OCR-wave expansion - yes.
4. Summary-first review result strengthened - yes.
5. Raw OCR text demoted to secondary/debug layer - yes.
6. Current receipt draft/review/handoff/preview baseline preserved in code - yes (manual verification pending).

