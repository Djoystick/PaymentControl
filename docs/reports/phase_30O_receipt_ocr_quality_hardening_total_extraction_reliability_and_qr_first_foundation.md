# Phase 30O - Receipt OCR Quality Hardening + Total Extraction Reliability + QR-First Foundation

- Date: 2026-04-07
- Status: implemented, pending manual verification
- Scope: targeted receipt OCR quality pass (no architecture reboot, no shell redesign)
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline
  - modal-first grammar (30C/30D)
  - save-now/parse-later receipt truth
  - OCR as helper only, manual expense confirmation required

## 1) Mandatory References Used

Read before implementation:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. `.codex/skills/ui-ux-pro-max/SKILL.md`
5. `docs/reports/phase_30K_paddleocr_foundation_ocr_provider_refactor_and_receipt_prefill_reliability.md`
6. `docs/reports/phase_30L_paddle_backend_contract_alignment_and_ocr_error_mapping_correction.md`
7. `docs/reports/phase_30M_client_side_ocr_spike_and_browser_ocr_integration_foundation.md`
8. `docs/reports/phase_30N_ocr_receipt_to_expense_handoff_and_full_receipt_preview_fix.md`

How references were applied:
1. `DESIGN.md`: kept receipt review focused, concise, and mobile-safe; avoided noisy technical blocks.
2. `ui-ux-pro-max`: applied clean loading/failure/readability constraints and progressive disclosure in OCR review modal.
3. 30K-30N chain: preserved provider abstraction, parse contract, draft/handoff baseline, and full-size receipt preview continuity.

## 2) Receipt OCR Quality Audit (What Was Wrong)

Observed in current code before this pass:
1. Client OCR amount selection used `Math.max(...)` over extracted numbers when no strong total marker existed.
2. Paddle raw-text fallback amount extraction also preferred max numeric token in text-first branch.
3. This allowed large item-line prices to beat real receipt total in realistic noisy OCR output.
4. OCR text snippet quality was weak because extracted text often collapsed into noisy stream and non-structured dump.
5. Receipt parsing treated text as mostly flat sequence, with weak receipt-specific zone weighting.

Root practical problems:
1. Total extraction: insufficient receipt-specific weighting.
2. Store/date extraction: simplistic fallbacks without robust receipt context.
3. Review aid text: too raw/noisy for manual human verification.

## 3) What Was Implemented

## 3.1 New shared receipt heuristics module (zone-based extraction core)

New files:
1. `src/lib/travel/ocr/receipt-heuristics.ts`
2. `src/lib/travel/ocr/receipt-heuristics.test.ts`

Implemented:
1. Receipt line normalization and deduplication.
2. Zone model (`header/items/totals/footer`) with bottom-weighted scoring.
3. Strong total heuristics:
   - total markers (`ИТОГ`, `ИТОГО`, `К ОПЛАТЕ`, `TOTAL`, `AMOUNT DUE`, etc.)
   - payment markers (cashless/card contexts)
   - penalties for discount/VAT/change/item-like lines
4. More robust date detection with receipt-specific scoring and invalid-date rejection.
5. Store detection emphasizing header-zone merchant-like lines.
6. Description fallback from items zone before merchant fallback.
7. Cleaner OCR text block generation (readable grouped fragment instead of long noisy stream).
8. Field-quality derivation that gives higher confidence to QR/marker-based totals and dates.

## 3.2 QR-first strategy (narrow, safe, no giant subsystem)

Implemented in client OCR path (`src/lib/travel/ocr/client-browser-ocr.ts`):
1. Added QR decode attempt via browser `BarcodeDetector` when available.
2. Added receipt fiscal QR parser (`t=...&s=...&fn=...&i=...&fp=...`) in shared heuristics.
3. QR-first priority:
   - if QR provides reliable amount+date, client returns QR-first suggestion without waiting for heavy OCR model load.
   - if OCR runtime fails but QR has usable metadata, result still degrades gracefully using QR data.
4. No fake QR success: if detector is unavailable or decode fails, flow safely continues with OCR.

Notes:
1. This is intentionally a foundation-level QR-first step within current stack.
2. It does not introduce a new external QR platform or risky dependency wave.

## 3.3 Receipt preprocessing hardening (client path)

Implemented in `src/lib/travel/ocr/client-browser-ocr.ts`:
1. Auto orientation normalization for landscape-like receipt photos (portrait correction).
2. Contrast + binarization preprocessing tuned for receipts.
3. Content-aware crop to receipt text area (safe bounding box, guarded by area thresholds).
4. Kept transforms conservative to avoid destructive artifacts.

Server hint hardening:
1. Extended preprocess hints in `src/lib/travel/ocr/types.ts` + `src/lib/travel/ocr/preprocess.ts`:
   - `perspectiveCorrection`
   - `denoise`
   - `qrFirst`
   - increased `maxSidePx`
2. This remains hint-level for backend service; Next runtime still avoids heavy pixel processing.

## 3.4 Total extraction reliability hardening

Client path:
1. Replaced max-number fallback behavior with scored total candidate selection using markers + zones + penalties.
2. Prevented item-line amount dominance over receipt total in common noisy outputs.

Server Paddle path:
1. Reworked raw-text suggestion branch to use shared receipt heuristics module.
2. Added heuristic enrichment even when provider returns structured payload (prefer extraction improvements when current values are missing/low-confidence).
3. Applied QR-aware enrichment when QR payload exists in provider response.

## 3.5 Store / date / description extraction improvement

Implemented through shared heuristics:
1. Store detection is header-biased and filters technical lines.
2. Date extraction now scores marker proximity and avoids expiry-style false positives.
3. Description prefers readable item-zone lines; merchant fallback preserved.
4. Priority kept as requested: amount > store > date > readable text > rest.

## 3.6 Cleaner OCR text presentation

Pipeline changes:
1. OCR text is normalized into readable grouped blocks before persisting as suggestion raw text.
2. Removed common stream-like noise pattern from snippet generation.

UI update:
1. `travel-group-expenses-section.tsx` OCR snippet modal now uses cleaner preview copy and scrollable readable container.
2. Increased snippet cap for human review while keeping modal compact/mobile-safe.

Localization:
1. Added RU translation for `Clean OCR preview for manual verification.`

## 4) Files Changed

1. `src/lib/travel/ocr/receipt-heuristics.ts` (new)
2. `src/lib/travel/ocr/receipt-heuristics.test.ts` (new)
3. `src/lib/travel/ocr/client-browser-ocr.ts`
4. `src/lib/travel/ocr/providers/paddle-provider.ts`
5. `src/lib/travel/ocr/types.ts`
6. `src/lib/travel/ocr/preprocess.ts`
7. `src/components/app/travel-group-expenses-section.tsx`
8. `src/lib/i18n/localization.tsx`
9. `tsconfig.json` (added `allowImportingTsExtensions` for local Node test compatibility with `.ts` imports)
10. `docs/reports/internal_version_history.md`
11. `docs/reports/phase_30O_receipt_ocr_quality_hardening_total_extraction_reliability_and_qr_first_foundation.md`

## 5) What Was Intentionally NOT Changed

1. No recurring-domain logic changes.
2. No travel schema/migration changes.
3. No shell/tab/navigation redesign.
4. No premium/paywall/entitlement return.
5. No bot-facing manual Telegram layer changes (`/start`, BotFather, menu button, profile media).
6. No auto-expense creation from OCR (manual confirmation remains mandatory).
7. No breakage of draft/save/reopen/retry paths by design intent.

## 6) Verification Run

Executed:
1. `node --test --test-isolation=none src/lib/travel/ocr/provider-utils.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/ocr/receipt-heuristics.test.ts` - pass
2. `npm run lint` - pass with existing non-blocking `next/no-img-element` warnings in receipt preview surfaces
3. `npm run build` - pass

## 7) Manual Verification Checklist

1. Travel -> active trip -> Receipt drafts -> parse receipt with noisy item prices.
2. Confirm OCR amount prefers real total marker / totals zone and no longer trivially picks first/big item line.
3. Test receipt with visible fiscal QR:
   - confirm QR-first amount/date extraction when supported by device/runtime.
   - confirm graceful fallback when QR decode unavailable.
4. Verify `Review receipt` modal:
   - cleaner OCR text snippet readability,
   - no giant unreadable stream.
5. Verify `Use in expense form` handoff remains intact:
   - amount transfer preserved,
   - fields remain editable,
   - no auto-save.
6. Verify full-size receipt preview still opens from review and attached-receipt context.
7. Verify save/reopen/reparse/reset/retry flow still stable.
8. Verify RU strings render correctly for new OCR preview copy.

## 8) Risks / Regression Watchlist

1. `BarcodeDetector` availability differs by device/runtime; QR-first is opportunistic and must be validated on target Telegram WebView devices.
2. Aggressive low-contrast or extremely blurred receipts can still degrade OCR quality despite safer preprocessing.
3. Provider-returned structured suggestions may vary; heuristic enrichment is conservative but should be monitored on live payload diversity.
4. Existing `<img>` lint warnings remain intentionally unchanged in this pass.

## 9) Acceptance Self-Check

1. Used required references (`ui-ux-pro-max`, `DESIGN.md`, anchor/history + 30K-30N) - done.
2. Premium/paywall logic not reintroduced - done.
3. Recurring baseline preserved - done.
4. Travel baseline preserved - done.
5. Draft/save/reopen/retry path untouched functionally - done.
6. Total extraction logic is materially more robust than max-token fallback - done.
7. OCR text fragment readability improved with structured cleaned text + modal presentation - done.
8. Handoff and full receipt preview layers preserved - done.
