# Phase 30J - OCR Provider Diagnostics + Error Mapping Hardening

- Date: 2026-04-06
- Status: implemented, pending manual verification
- Scope: narrow corrective pass after 30H/30I (no new UX wave, no new feature wave)
- Baseline preserved:
  - donation-only product truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline
  - modal-first grammar from 30C/30D
  - language/analytics truth from 29A/29A.1

## 1) References Used

Required references rechecked before implementation:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `docs/reports/phase_30H_travel_receipt_ocr_reliability_and_modal_viewport_regression_fix.md`
4. `docs/reports/phase_30I_ocr_operational_truth_and_receipt_draft_save_regression_fix.md`
5. `DESIGN.md`
6. `.codex/skills/ui-ux-pro-max/SKILL.md`

How references were applied in this pass:
1. `DESIGN.md` + `ui-ux-pro-max`: reliability-first, no extra UI layering, no new visual complexity.
2. 30H/30I: preserved receipt save flow and focused only on OCR provider diagnostics/mapping hardening.

## 2) Runtime Truth at Start of Pass

User-confirmed runtime facts before code changes:
1. OCR env was already configured in Vercel.
2. Redeploy was completed.
3. Server route reached OpenAI (`POST api.openai.com/v1/chat/completions`).
4. Current failure branch was provider/server error path (not `TRAVEL_OCR_UNAVAILABLE`).
5. UI still surfaced generic provider wording and parse route still collapsed most failures to generic parse 500.

## 3) Root-Cause Audit (Why Diagnostics Were Insufficient)

## 3.1 OCR provider classification gap
File: `src/lib/travel/receipt-ocr.ts`

Before this pass:
1. Non-OK provider responses returned one generic message (`OCR assistant returned provider error response.`).
2. Route/operator could not distinguish invalid key vs model access vs quota vs rate limit.
3. Provider metadata (`status`, provider `error.type/code/message`) was not logged in a structured way.

## 3.2 API error mapping gap
Files:
1. `src/lib/travel/repository.ts`
2. `src/app/api/travel/trips/[tripId]/receipts/[receiptDraftId]/route.ts`
3. `src/lib/travel/types.ts`

Before this pass:
1. OCR non-unavailable errors were flattened into repository reason `PARSE_FAILED`.
2. Route mostly returned `TRAVEL_RECEIPT_PARSE_FAILED` (HTTP 500), hiding provider category.
3. Client/user messaging could not reflect exact operational cause.

## 4) What Was Changed

## 4.1 Provider diagnostics and failure categorization in OCR engine
File: `src/lib/travel/receipt-ocr.ts`

Added explicit OCR failure kinds:
1. `INVALID_API_KEY`
2. `MODEL_ACCESS_DENIED`
3. `QUOTA_EXCEEDED`
4. `RATE_LIMITED`
5. `PROVIDER_REQUEST_FAILED`
6. `MALFORMED_PROVIDER_RESPONSE`
7. `INTERNAL_ERROR`
8. `UNAVAILABLE` (existing missing-env branch kept)

Implemented:
1. Provider error payload parsing (`error.type`, `error.code`, message snippet).
2. Classification rules using status + provider payload.
3. Safe structured diagnostics log:
   - `stage`
   - `category`
   - `status`
   - `providerType`
   - `providerCode`
   - `providerMessage` (trimmed snippet)
   - provider request id (`x-request-id` / `openai-request-id` when available)
   - `model`
4. Secret-safe behavior:
   - no API key logging,
   - no full raw image payload logging,
   - no sensitive env dump.

## 4.2 Repository parse result now preserves OCR category
File: `src/lib/travel/repository.ts`

Implemented:
1. Added category-aware parse reasons:
   - `OCR_INVALID_API_KEY`
   - `OCR_MODEL_ACCESS_DENIED`
   - `OCR_QUOTA_EXCEEDED`
   - `OCR_RATE_LIMITED`
   - `OCR_PROVIDER_REQUEST_FAILED`
   - `OCR_PROVIDER_MALFORMED_RESPONSE`
   - `OCR_INTERNAL_ERROR`
2. Added mapper from OCR engine failure kind -> repository parse reason.
3. Internal parse pipeline failures after OCR result creation now map to `OCR_INTERNAL_ERROR` instead of generic parse failure.

## 4.3 API route no longer collapses OCR categories into generic parse 500
File: `src/app/api/travel/trips/[tripId]/receipts/[receiptDraftId]/route.ts`

Implemented explicit route mapping:
1. `OCR_INVALID_API_KEY` -> `TRAVEL_OCR_INVALID_API_KEY` (502)
2. `OCR_MODEL_ACCESS_DENIED` -> `TRAVEL_OCR_MODEL_ACCESS_DENIED` (502)
3. `OCR_QUOTA_EXCEEDED` -> `TRAVEL_OCR_QUOTA_EXCEEDED` (503)
4. `OCR_RATE_LIMITED` -> `TRAVEL_OCR_RATE_LIMITED` (429)
5. `OCR_PROVIDER_REQUEST_FAILED` -> `TRAVEL_OCR_PROVIDER_REQUEST_FAILED` (502)
6. `OCR_PROVIDER_MALFORMED_RESPONSE` -> `TRAVEL_OCR_PROVIDER_MALFORMED_RESPONSE` (502)
7. `OCR_INTERNAL_ERROR` -> `TRAVEL_OCR_INTERNAL_ERROR` (500)
8. Existing `OCR_UNAVAILABLE` remains explicit (`TRAVEL_OCR_UNAVAILABLE`, 409).

## 4.4 Travel API types extended for explicit OCR provider errors
File: `src/lib/travel/types.ts`

Added new API error codes:
1. `TRAVEL_OCR_INVALID_API_KEY`
2. `TRAVEL_OCR_MODEL_ACCESS_DENIED`
3. `TRAVEL_OCR_QUOTA_EXCEEDED`
4. `TRAVEL_OCR_RATE_LIMITED`
5. `TRAVEL_OCR_PROVIDER_REQUEST_FAILED`
6. `TRAVEL_OCR_PROVIDER_MALFORMED_RESPONSE`
7. `TRAVEL_OCR_INTERNAL_ERROR`

## 4.5 User-facing error copy made explicit
File: `src/lib/i18n/localization.tsx`

Added RU translations for new OCR messages:
1. invalid API key
2. model access/availability issue
3. quota/billing limit
4. rate limit
5. provider request failure
6. malformed provider response
7. internal OCR route error

Result: user no longer sees only vague provider wording for all OCR failures.

## 5) Exact OCR Operational Truth After This Pass

1. Missing OCR env branch remains a separate expected operational branch (`TRAVEL_OCR_UNAVAILABLE`).
2. Provider-connected branch is now category-aware and explicit.
3. Generic parse 500 for provider-class failures is no longer the default behavior.
4. Exact provider category is now observable via:
   - API error code,
   - user-facing mapped message,
   - structured server diagnostics logs.

Important limitation:
1. This pass hardens diagnostics/mapping in code.
2. It does not fabricate live provider state.
3. Final live category still must be read from runtime after redeploy using the new diagnostics fields.

## 6) Manual OCR Provider Diagnostics Checklist (Operational)

Use this when OCR still fails after deploying this pass.

## 6.1 Vercel checks
1. Open Vercel -> your project -> Deployments.
2. Open latest deployment logs.
3. Filter logs by: `[travel-ocr] diagnostics`.
4. Capture these fields:
   - `category`
   - `status`
   - `providerType`
   - `providerCode`
   - `providerMessage`
   - `providerRequestId`
   - `model`

## 6.2 OpenAI-side checks by category
1. If category is `INVALID_API_KEY`:
   - Create/rotate API key in OpenAI dashboard.
   - Update `TRAVEL_RECEIPT_OCR_OPENAI_API_KEY` in Vercel env.
   - Redeploy.
2. If category is `MODEL_ACCESS_DENIED`:
   - Verify account/project has access to configured model.
   - Check `TRAVEL_RECEIPT_OCR_OPENAI_MODEL` value (start with `gpt-4o-mini`).
   - Redeploy.
3. If category is `QUOTA_EXCEEDED`:
   - Check billing status and quota limits in OpenAI dashboard.
   - Restore quota/payment method.
4. If category is `RATE_LIMITED`:
   - Retry after cooldown.
   - If frequent, lower request burst and/or increase limits.
5. If category is `PROVIDER_REQUEST_FAILED`:
   - Check provider status page and Vercel outbound connectivity.
6. If category is `MALFORMED_PROVIDER_RESPONSE`:
   - Verify model compatibility and `response_format` handling.
   - Re-run and inspect diagnostics fields.
7. If category is `INTERNAL_ERROR`:
   - Inspect full route logs/stack in Vercel.
   - Verify no unexpected runtime exceptions in OCR path.

## 7) Files Changed

1. `src/lib/travel/receipt-ocr.ts`
2. `src/lib/travel/repository.ts`
3. `src/app/api/travel/trips/[tripId]/receipts/[receiptDraftId]/route.ts`
4. `src/lib/travel/types.ts`
5. `src/lib/i18n/localization.tsx`
6. `docs/reports/internal_version_history.md`
7. `docs/reports/phase_30J_ocr_provider_diagnostics_and_error_mapping_hardening.md`

## 8) What Was Intentionally NOT Changed

1. No schema/db migrations.
2. No travel UX-wave or redesign.
3. No modal/shell/navigation rework.
4. No recurring/business-logic expansion.
5. No bot-facing/manual Telegram settings changes.

## 9) Verification Run

Executed in this pass:
1. `npm run lint` (pass; existing `next/no-img-element` warnings remain in travel receipt image previews)
2. `npm run build` (pass)
3. Targeted tests:
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/finalization.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/split.test.ts` (pass)

## 10) Manual Verification Checklist (Runtime)

1. Open Travel -> active trip -> receipt draft -> `Run OCR prefill`.
2. Confirm save-draft path still works independently from OCR.
3. Trigger OCR parse and confirm UI now returns specific category text (not generic provider error).
4. Confirm API response code reflects category (`TRAVEL_OCR_*`).
5. In Vercel logs, confirm `[travel-ocr] diagnostics` line appears with non-secret classification fields.
6. Confirm `TRAVEL_OCR_UNAVAILABLE` still appears only when OCR env is truly missing.
7. Confirm no regressions in selected-trip workspace (participants/expenses/settlements/history/modal flows).

## 11) Risks / Regression Watchlist

1. Category detection relies on provider status/payload semantics and may need small rule updates if provider formats evolve.
2. `MODEL_ACCESS_DENIED` and `MODEL_NOT_FOUND` are intentionally grouped for user clarity; operators should use diagnostics fields for exact differentiation.
3. If deployment omits new build, old generic parse behavior may still appear; redeploy is mandatory for this pass to take effect.
