# Phase 30L - Paddle Backend Contract Alignment + OCR Error Mapping Correction

- Date: 2026-04-06
- Status: implemented, pending manual verification
- Scope: narrow corrective pass (contract/mapping only)
- No scope expansion: no shell/UI wave, no recurring/travel architecture changes, no premium/paywall logic changes

## 1) Context and Goal

After 30K foundation rollout, live runtime showed:
1. OCR parse path still surfaced old quota/billing text.
2. `PATCH /api/travel/trips/.../receipts/...` returned 503.
3. High probability of OCR backend response-contract mismatch and coarse status-to-error classification.

Goal of 30L:
1. Align Payment Control OCR parser with the external OCR backend contract.
2. Prevent generic/non-specific 503 from falling into quota branch.
3. Split OCR failure categories cleanly for user-facing messaging and diagnostics:
   - backend unavailable/misconfigured
   - backend auth failure
   - malformed response
   - OCR engine internal/provider failure
   - explicit quota/billing

## 2) Audit Summary

## 2.1 Payment Control expected contract path

Inspected:
1. `src/lib/travel/ocr/providers/paddle-provider.ts`
2. `src/lib/travel/receipt-ocr.ts`
3. `src/app/api/travel/trips/[tripId]/receipts/[receiptDraftId]/route.ts`
4. `src/lib/travel/ocr/provider-utils.ts`
5. `src/lib/i18n/localization.tsx`

Observed:
1. Paddle provider sends JSON payload (`imageDataUrl`, `tripCurrency`, `preprocessing`) and classifies failures via `provider-utils`.
2. API route maps OCR failure reasons to explicit `TRAVEL_OCR_*` codes and statuses.
3. Save-draft path remains independent (parse failure updates OCR status but does not break draft persistence).

## 2.2 OCR backend scaffold contract

Inspected:
1. `H:\Work\OCR backend\src\main.py`
2. `H:\Work\OCR backend\src\routes\ocr.py`
3. `H:\Work\OCR backend\src\errors.py`
4. `H:\Work\OCR backend\src\services\providers\paddle_provider.py`

Observed:
1. Error payload shape is backend-style: `{ ok: false, error_code, message }`.
2. Non-success branches use 401/4xx/5xx status codes plus `error_code` token, not only `code`.

## 2.3 Root mismatch

Confirmed mismatch in Payment Control parser:
1. `parseProviderErrorPayload` prioritized `code` and did not robustly parse backend `error_code`/`error_type`.
2. Quota detection logic was too permissive (`providerCode.includes("quota")` / broad message matching), which increased risk of incorrect quota mapping.

Impact:
1. OCR backend 5xx could be mapped to wrong branch (quota/billing copy) when category was not truly quota.

## 3) Implemented Fixes

## 3.1 Contract parsing hardening

File:
1. `src/lib/travel/ocr/provider-utils.ts`

Changes:
1. Added parsing support for backend-style fields:
   - `error_code`
   - `error_type`
   - `error_description`
   - nested `error.error_code` / `error.error_type` / `error.error_description`
2. Added code normalization helper (`normalizeProviderCode`) for stable classification.

Result:
1. Payment Control now correctly reads OCR backend error tokens instead of dropping them.

## 3.2 Error classification refinement

File:
1. `src/lib/travel/ocr/provider-utils.ts`

Changes:
1. Added explicit backend unavailable branch (mapped to `PROVIDER_REQUEST_FAILED`) for:
   - `OCR_BACKEND_MISCONFIGURED`
   - `OCR_PROVIDER_NOT_INSTALLED`
   - 502/503/504 with availability-style messages
2. Added explicit backend OCR engine failure branch (mapped to `INTERNAL_ERROR`) for:
   - `OCR_PROVIDER_FAILED`
   - `OCR_INTERNAL_ERROR` / `INTERNAL_ERROR` patterns
3. Tightened quota detection to explicit signals only:
   - `insufficient_quota`
   - `quota_exceeded`
   - billing-limit specific tokens
4. Preserved explicit auth and rate-limit branches.

Result:
1. Generic/unqualified 503 no longer collapses into quota by default.
2. Quota/billing branch now requires explicit quota/billing evidence.

## 3.3 User-facing copy parity

File:
1. `src/lib/i18n/localization.tsx`

Added RU mappings for new precise branches:
1. Backend unavailable/misconfigured message.
2. Backend accepted request but OCR engine failed message.

Result:
1. User sees actionable OCR state without vague/legacy quota confusion.

## 3.4 Regression-proof tests

Added:
1. `src/lib/travel/ocr/provider-utils.test.ts`

Covered:
1. Parsing `error_code` backend contract.
2. 503 backend misconfiguration -> `PROVIDER_REQUEST_FAILED`.
3. Backend provider crash -> `INTERNAL_ERROR`.
4. Explicit quota signal -> `QUOTA_EXCEEDED`.

## 4) What Was Not Changed

Intentionally unchanged:
1. Travel UI/shell/modal structure.
2. Recurring flows.
3. Receipt draft save path semantics (`save-now / parse-later`).
4. DB schema/migrations.
5. Bot-facing/manual Telegram settings.

## 5) Files Changed

1. `src/lib/travel/ocr/provider-utils.ts`
2. `src/lib/i18n/localization.tsx`
3. `src/lib/travel/ocr/provider-utils.test.ts` (new)
4. `docs/reports/phase_30L_paddle_backend_contract_alignment_and_ocr_error_mapping_correction.md` (new)
5. `docs/reports/internal_version_history.md`

## 6) Validation

Executed targeted tests:

```bash
node --test --test-isolation=none src/lib/travel/ocr/provider-utils.test.ts src/lib/travel/receipt-ocr.test.ts
```

Result:
1. Pass (7/7).

## 7) Manual Verification Checklist

1. Trigger OCR parse with backend healthy:
   - Expected: no false quota mapping unless backend explicitly reports quota/billing.
2. Break backend API key (`TRAVEL_RECEIPT_OCR_PADDLE_API_KEY` mismatch):
   - Expected: auth error branch, not quota.
3. Stop/misconfigure OCR backend service:
   - Expected: backend unavailable/misconfigured message, not quota.
4. Force provider internal failure on backend side:
   - Expected: backend-engine failure message.
5. Verify receipt drafts are still savable independently of OCR parse result.

## 8) Risks / Watchlist

1. If external OCR backend returns custom non-standard error text without stable `error_code`, final category still depends on message heuristics.
2. If backend intentionally reuses quota terms in non-quota contexts, it can still mislead classification and should be corrected at backend source.
3. Production env drift (`TRAVEL_RECEIPT_OCR_PROVIDER`, endpoint, API key) can still surface operational errors unrelated to this code fix.

