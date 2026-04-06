# Phase 30M - Client-Side OCR Spike + Browser OCR Integration Foundation

- Date: 2026-04-06
- Status: implemented, pending manual verification
- Scope: controlled OCR architecture spike (no shell redesign, no feature-wave expansion)
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline
  - modal-first grammar (30C/30D)
  - save-now/parse-later receipt truth

## 1) References Used

Before implementation:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. `.codex/skills/ui-ux-pro-max/SKILL.md`
5. `docs/reports/phase_30H_travel_receipt_ocr_reliability_and_modal_viewport_regression_fix.md`
6. `docs/reports/phase_30I_ocr_operational_truth_and_receipt_draft_save_regression_fix.md`
7. `docs/reports/phase_30J_ocr_provider_diagnostics_and_error_mapping_hardening.md`
8. `docs/reports/phase_30K_paddleocr_foundation_ocr_provider_refactor_and_receipt_prefill_reliability.md`
9. `docs/reports/phase_30L_paddle_backend_contract_alignment_and_ocr_error_mapping_correction.md`

How guidance was applied:
1. `DESIGN.md`: keep OCR states concise, action-first, and non-noisy in travel modals.
2. `ui-ux-pro-max`: mobile-safe loading/failure states and progressive disclosure without creating a new UX wave.

## 2) Browser OCR Path Selection

Targeted direction researched:
1. `siva-sub/client-ocr` direction was reviewed and validated as the intended browser ONNX/Paddle-style approach.

Practical integration result in this codebase:
1. Direct npm provider options tested (`client-side-ocr`, `ppu-paddle-ocr`, `@gutenye/ocr-browser`) caused Next/Turbopack compatibility blockers in this app context (Node-only `fs` traces / non-placeable assets / parser issues).
2. Final spike path uses browser runtime loading via CDN (`onnxruntime-web` + OpenCV + `esearch-ocr`) to keep OCR fully client-side while preserving Next build stability.
3. This is explicitly an **experimental foundation** path, not a final OCR quality claim.

## 3) Architecture Changes Implemented

## 3.1 Client OCR engine/orchestration layer
New file:
1. `src/lib/travel/ocr/client-browser-ocr.ts`

Implemented:
1. Lazy browser-only runtime initialization with cached singleton.
2. Controlled script/module loading (ORT + OpenCV + OCR module) with timeout guardrails.
3. Receipt image preprocessing pipeline before OCR:
   - scale-down for large photos
   - grayscale/contrast boost
   - binarization threshold pass
4. Generic OCR output text collection + receipt heuristics for suggestion mapping:
   - amount
   - currency
   - spent date
   - merchant/description
   - category guess
5. Mapping to existing receipt suggestion contract as `prefill` (editable, not source-of-truth).

## 3.2 Parse contract extension (non-breaking)
Files:
1. `src/lib/travel/types.ts`
2. `src/lib/travel/client.ts`
3. `src/app/api/travel/trips/[tripId]/receipts/[receiptDraftId]/route.ts`
4. `src/lib/travel/repository.ts`

Implemented:
1. Added optional `TravelReceiptClientSuggestionPayload`.
2. Extended parse API client call with optional `clientSuggestion`.
3. Route passes optional suggestion into parse repository flow.
4. Repository now supports two parse branches:
   - branch A: use normalized `clientSuggestion` (no server OCR provider call)
   - branch B: existing server OCR path (unchanged fallback architecture)

Behavioral effect:
1. If client OCR produced meaningful suggestion, draft is persisted as parsed using that suggestion.
2. If suggestion is empty/noisy, server returns explicit validation failure (`On-device OCR found too little readable text...`).
3. Existing server OCR provider path remains intact for non-destructive rollback/fallback.

## 3.3 Travel UI parse flow wiring
File:
1. `src/components/app/travel-group-expenses-section.tsx`

Implemented:
1. Parse action now attempts client OCR first when enabled.
2. On client OCR success, parse request includes `clientSuggestion`.
3. Optional server fallback is controlled by client env flag.
4. Feedback states made explicit:
   - running on-device OCR
   - on-device success
   - on-device unavailable/failure messages

## 3.4 Client env controls
Files:
1. `src/lib/config/client-env.ts`
2. `.env.example`

Added:
1. `NEXT_PUBLIC_TRAVEL_RECEIPT_CLIENT_OCR_ENABLED` (default `true`)
2. `NEXT_PUBLIC_TRAVEL_RECEIPT_CLIENT_OCR_TIMEOUT_MS` (default `30000`)
3. `NEXT_PUBLIC_TRAVEL_RECEIPT_CLIENT_OCR_ALLOW_SERVER_FALLBACK` (default `false`)

## 3.5 Localization additions
File:
1. `src/lib/i18n/localization.tsx`

Added RU mappings for new on-device OCR status/failure strings and fallback copy.

## 4) Save-Draft Independence Confirmation

Maintained as non-negotiable:
1. Receipt draft create/save path is still independent from OCR availability.
2. OCR parse remains optional helper step after save.
3. OCR failure does not block draft persistence or manual expense entry.

## 5) What Was Intentionally NOT Changed

1. No DB migrations/schema changes.
2. No shell/navigation redesign.
3. No recurring-domain changes.
4. No bot-facing manual layer changes (`/start`, BotFather, menu button, profile media).
5. No premium/paywall logic touched.
6. No spoiler/details rollback.

## 6) Verification Run

Executed:
1. `npm run lint` - pass (existing non-blocking `next/no-img-element` warnings remain in travel receipt previews).
2. `npm run build` - pass.
3. `node --test --test-isolation=none src/lib/travel/receipt-ocr.test.ts src/lib/travel/ocr/provider-utils.test.ts` - pass.

## 7) Manual Verification Checklist (Live Telegram Runtime)

1. Travel -> open active trip -> `Receipt drafts`.
2. Add receipt photo and confirm draft save works before any OCR action.
3. Open draft -> `Run OCR prefill`.
4. Confirm visible states:
   - `Running on-device OCR prefill...`
   - success/failure result (no crash, no modal lock).
5. On success:
   - prefill values appear (amount/currency/date/description as available),
   - user can still edit fields manually.
6. On failure:
   - draft remains intact,
   - retry possible,
   - manual form path remains usable.
7. If `NEXT_PUBLIC_TRAVEL_RECEIPT_CLIENT_OCR_ALLOW_SERVER_FALLBACK=true`:
   - verify fallback branch and ensure save/parse behavior remains coherent.
8. Verify no regressions in participants/expenses/settlements/history trip layers.

## 8) Risks / Regression Watchlist

1. CDN runtime dependency:
   - first OCR call depends on external script/model download latency.
2. Device variability:
   - weak mobile devices can hit timeout branch more often.
3. OCR quality:
   - this spike intentionally provides heuristic prefill, not guaranteed high-accuracy extraction.
4. Runtime output shape:
   - OCR module output can evolve; text extraction is defensive but should be observed in manual QA logs.

## 9) Summary

Phase 30M introduced a controlled, browser-first OCR path without breaking receipt draft baseline and without deleting previous server OCR architecture. The app can now experimentally run OCR on-device for receipt prefill, persist normalized suggestions through existing parse contracts, and gracefully degrade when client OCR is unavailable or weak.
