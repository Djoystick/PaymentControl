# Phase 30P - Receipt Review Foreground Fix + Russian OCR Cleanup + Key-Field-First Presentation

- Date: 2026-04-07
- Status: implemented, pending manual verification
- Scope: narrow corrective pass after live OCR receipt-flow check
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline
  - modal-first grammar
  - draft/save/reopen/retry receipt flow
  - OCR as helper only (manual confirmation remains required)

## 1) Mandatory References Used

Read before implementation:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. `.codex/skills/ui-ux-pro-max/SKILL.md`
5. `docs/reports/phase_30M_client_side_ocr_spike_and_browser_ocr_integration_foundation.md`
6. `docs/reports/phase_30N_ocr_receipt_to_expense_handoff_and_full_receipt_preview_fix.md`
7. `docs/reports/phase_30O_receipt_ocr_quality_hardening_total_extraction_reliability_and_qr_first_foundation.md`

How references were applied:
1. `DESIGN.md`: kept review flow short, action-first, and mobile-readable; no wall-of-text primary surface.
2. `ui-ux-pro-max`: used layered-modal hygiene (`z-index`, focus context priority), progressive disclosure, and key-field-first review composition.
3. 30M/30N/30O continuity: kept current OCR provider and handoff pipeline intact; this pass is corrective UI/cleanup hardening only.

## 2) Live Problem Found (Corrective Target)

Observed in current flow:
1. `Review receipt` could visually open under `Receipt drafts` because review portal layer used lower `z-index` and draft panel stayed open.
2. `OCR text snippet` remained noisy for RU receipts when tokens mixed Latin/Cyrillic homoglyphs.
3. Review surface still gave too much visual weight to generic detected-value dump instead of key receipt fields first.

## 3) What Was Implemented

## 3.1 Modal stack / foreground fix

File: `src/components/app/travel-group-expenses-section.tsx`

Implemented:
1. Added `openReceiptReview(...)` helper that:
   - closes receipt drafts panel,
   - resets text/debug modal state,
   - opens receipt review as active context.
2. Added effect guard: when `activeReceiptReviewId` is set, receipt panel is closed to prevent overlap.
3. Raised overlay priorities:
   - review modal to `z-[102]`,
   - OCR text modal to `z-[103]`,
   - full-size receipt preview to `z-[104]`.
4. Rewired all review-entry buttons to use the same `openReceiptReview(...)` path.

Result intent:
1. `Receipt drafts -> Review receipt` opens review as top active layer.
2. `Review receipt -> OCR text snippet` opens child surface above review.
3. No underlay impression from previous drafts modal.

## 3.2 Russian OCR cleanup (mixed script normalization)

File: `src/lib/travel/ocr/receipt-heuristics.ts`

Implemented:
1. Added conservative token-level cleanup in line normalization:
   - Latin lookalike to Cyrillic mapping for likely-Cyrillic tokens.
   - Limited digit homoglyph replacement (`0/3/6`) only in Cyrillic letter context.
   - Mixed-case smoothing for corrupted OCR tokens.
2. Cleanup is guarded to avoid aggressive global substitutions:
   - only tokens already containing Cyrillic are candidates,
   - numeric-dominant tokens are skipped,
   - values/codes are not blindly rewritten.
3. Added special handling for trailing/embedded `b` ambiguity (`в` vs `ь`) using confusable-neighbor context.

Validation example covered by test:
1. `MaГHИT` -> `Магнит`
2. `BЫ6paTb` -> readable Cyrillic form (`Выбрать`)

## 3.3 Key-field-first review presentation + cleaner OCR surface

File: `src/components/app/travel-group-expenses-section.tsx`

Implemented:
1. Rebuilt parsed receipt summary block to key-field-first layout:
   - Merchant,
   - OCR amount,
   - Expense date,
   - OCR description,
   each with confidence badge and explicit empty fallback (`Not detected yet`).
2. Added dedicated `Clean OCR text` block below key fields:
   - grouped short excerpt for quick manual review,
   - separate actions for cleaned fragment vs raw debug view.
3. Added explicit debug mode split for OCR text modal:
   - primary path: clean fragment,
   - secondary path: raw OCR debug dump.
4. Added RU localization keys for new labels/descriptions.

Files:
1. `src/components/app/travel-group-expenses-section.tsx`
2. `src/lib/i18n/localization.tsx`

## 3.4 OCR extraction continuity after cleanup

Files:
1. `src/lib/travel/ocr/receipt-heuristics.ts`
2. `src/lib/travel/ocr/receipt-heuristics.test.ts`

Implemented:
1. Mixed-script cleanup integrated into existing text normalization path (no pipeline fork).
2. Extraction priorities from 30O (total/store/date) remain in place.
3. Added targeted regression test for RU mixed-script cleanup.

## 4) Files Changed

1. `src/components/app/travel-group-expenses-section.tsx`
2. `src/lib/travel/ocr/receipt-heuristics.ts`
3. `src/lib/travel/ocr/receipt-heuristics.test.ts`
4. `src/lib/i18n/localization.tsx`
5. `docs/reports/phase_30P_receipt_review_foreground_fix_russian_ocr_cleanup_and_key_field_first_presentation.md`
6. `docs/reports/internal_version_history.md`

## 5) What Was Intentionally NOT Changed

1. No premium/paywall/entitlement logic.
2. No recurring-domain logic changes.
3. No travel schema/API contract changes.
4. No OCR engine swap and no new OCR platform.
5. No rewrite of receipt draft/save/retry/handoff architecture.
6. No bot-facing manual layer changes (`/start`, BotFather, profile media/text).
7. No automatic expense creation from OCR.
8. QR-first/preprocess core from 30O was preserved (no expansion in this corrective pass).

## 6) Verification Run (Code-Level)

Executed:
1. `node --test src/lib/travel/ocr/receipt-heuristics.test.ts` - pass (5/5)
2. `npm run lint` - pass with existing non-blocking `next/no-img-element` warnings in receipt surfaces
3. `npm run build` - pass

Notes:
1. This report does not claim manual/device verification completion.

## 7) Manual Verification Checklist (Required)

1. Open Travel -> `Receipt drafts` -> tap `Review receipt`; confirm review opens on top.
2. From review, open `OCR text snippet`; confirm snippet modal is above review and drafts do not overlay it.
3. Check RU noisy sample receipt where OCR has mixed Latin/Cyrillic tokens; confirm snippet is cleaner/readable.
4. Confirm key fields are shown first (merchant/amount/date/description) and remain editable through handoff path.
5. Confirm `Use in expense form` still transfers amount/date and does not auto-save.
6. Confirm `Reparse receipt` still works and review updates correctly.
7. Confirm full-size receipt preview opens above current layer.
8. Confirm draft/save/reopen/retry flow remains stable on mobile Telegram viewport.

## 8) Risks / Regression Watchlist

1. Mixed-script cleanup is heuristic and intentionally conservative; rare edge tokens may still remain noisy.
2. Aggressive normalization is intentionally avoided to reduce false corrections in alphanumeric codes.
3. Modal layering now depends on explicit `z-index` ordering; future modal additions should keep this stack contract.
4. Existing `<img>` lint warnings remain outside this pass scope.

## 9) Self-Check

1. Required references (`ui-ux-pro-max`, `DESIGN.md`, anchor/history/30M-30O) used - yes.
2. Foreground bug (`Review receipt` under drafts) corrected by layering + panel-close behavior - yes.
3. `OCR text snippet` now opens above draft/review stack - yes by overlay order.
4. Russian OCR cleanup added with guarded mixed-script normalization - yes.
5. Key-field-first presentation implemented, raw dump demoted to secondary debug path - yes.
6. Handoff and full-size preview paths preserved in code - yes (manual verification pending).
