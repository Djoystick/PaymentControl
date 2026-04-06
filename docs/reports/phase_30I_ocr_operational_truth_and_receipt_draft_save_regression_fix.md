# Phase 30I - OCR Operational Truth + Receipt Draft Save Regression Fix

- Date: 2026-04-06
- Status: implemented, pending manual verification
- Scope: targeted corrective pass after 30H (no new feature wave)
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline
  - 30C/30D modal-first grammar
  - 29A/29A.1 language + analytics truth

## 1) References Used

Before implementation:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. `.codex/skills/ui-ux-pro-max/SKILL.md`
5. `docs/reports/phase_30C_modal_surface_unification_header_deduplication_home_continuity_rollback_and_page_load_performance_fix.md`
6. `docs/reports/phase_30D_full_spoiler_elimination_and_project_wide_modal_disclosure_unification.md`
7. `docs/reports/phase_30H_travel_receipt_ocr_reliability_and_modal_viewport_regression_fix.md`

How they were applied:
1. `DESIGN.md`: reliability-first UX and clear error separation without new UI wave.
2. `ui-ux-pro-max`: mobile-first modal reliability and explicit action/error clarity instead of hidden fallback behavior.

## 2) OCR Banner Audit Result (Operational Truth)

Result: **expected operational signal, not detection-logic bug**.

Code-level source:
1. `src/lib/travel/receipt-ocr.ts`
2. `src/lib/config/server-env.ts`

Current behavior:
1. OCR parse checks `serverEnv.travelReceiptOcrOpenAiApiKey`.
2. If missing/empty, API returns:
   - `ok: false`
   - `unavailable: true`
   - message: `OCR assistant is not configured on server...`
3. API maps this to `TRAVEL_OCR_UNAVAILABLE` and HTTP 409 in:
   - `src/app/api/travel/trips/[tripId]/receipts/[receiptDraftId]/route.ts`

Conclusion:
1. OCR-unavailable banner is a valid operational fallback when OCR env is not configured.
2. It must stay visible in this state.

## 3) Save-Draft Regression Root Cause

The save-draft failure was a separate reliability seam from OCR availability.

### Root cause A (client transport handling)
1. `createTravelReceiptDraft` in `src/lib/travel/client.ts` assumed JSON response for every upload request.
2. In real runtime (non-JSON edge/proxy/server responses, including payload-limit cases), `response.json()` could throw.
3. UI catch branch then showed generic `Failed to save receipt draft.`.

### Root cause B (upload safety envelope)
1. Receipt upload path had no client-side pre-check for size/type before network call.
2. Server validation allowed up to 5 MB raw image, which is too close to practical transport limits in some deployments/Telegram paths.
3. This produced unstable save behavior (sometimes not returning structured API JSON error).

### Root cause C (low-observability DB insert failures)
1. Repository create path returned one generic message for all insert errors.
2. Real schema/constraint causes were masked from user/operator.

## 4) What Was Fixed

## 4.1 Receipt upload response hardening
File: `src/lib/travel/client.ts`

1. Added resilient response parsing for receipt endpoints (`readTravelResponse`).
2. Stopped assuming JSON in upload/receipt mutation responses.
3. Added explicit fallback error mapping for non-JSON/transport errors.
4. Added status-aware message for payload limit (`413`) and type mismatch (`415`).

Affected functions:
1. `createTravelReceiptDraft`
2. `parseTravelReceiptDraft`
3. `replaceTravelReceiptDraftImage`
4. `deleteTravelReceiptDraft`

## 4.2 Save path size/type guard before upload
File: `src/components/app/travel-group-expenses-section.tsx`

1. Added client pre-validation in receipt create/replace handlers:
   - MIME must start with `image/`
   - file size must be <= 4 MB
2. Added explicit user-facing error copy for oversize upload.
3. Removed `capture="environment"` on hidden receipt file inputs to avoid forcing camera-only capture path (helps practical pickers in Telegram runtime and lowers forced large-photo failures).

## 4.3 Server-side validation envelope aligned
File: `src/lib/travel/validation.ts`

1. Reduced receipt image max bytes from 5 MB to 4 MB.
2. Reduced max data-url length envelope from 7 MB to 6 MB.
3. Updated corresponding validation message to 4 MB.

## 4.4 Better create-failure diagnosis
File: `src/lib/travel/repository.ts`

1. Added `resolveReceiptDraftCreateErrorMessage(...)`.
2. Mapped known create failures to explicit messages:
   - oversize/row-too-big -> size guidance
   - schema drift (`42P01` / `42703`) -> migration hint
3. Replaced blind generic create message in receipt insert failure branch.

## 4.5 Localization updates
File: `src/lib/i18n/localization.tsx`

Added/updated RU strings for:
1. `Receipt image is too large. Max size is 4 MB.`
2. `Receipt image is too large for upload. Use image up to 4 MB.`
3. `Travel request failed on server. Try again in a moment.`
4. `Travel receipt schema is not up to date on server. Apply latest migrations and retry.`

## 4.6 OCR env truth made explicit in env template
File: `.env.example`

Added documented server env entries:
1. `TRAVEL_RECEIPT_OCR_OPENAI_API_KEY`
2. `TRAVEL_RECEIPT_OCR_OPENAI_MODEL` (default `gpt-4o-mini`)

This does not auto-enable OCR, but removes ambiguity for setup.

## 5) OCR Operational vs Product Error Separation (After Fix)

Now the user-facing behavior is separated cleanly:
1. **Save draft path**:
   - works without OCR env,
   - validates file type/size early,
   - returns clearer upload/transport diagnostics.
2. **OCR parse path**:
   - if env missing, returns explicit operational `TRAVEL_OCR_UNAVAILABLE` message,
   - does not imply save-draft failure.

## 6) Manual OCR Setup Instructions

If OCR is still unavailable, configure it manually with these exact steps.

## 6.1 Get OCR provider key
1. Open OpenAI dashboard in browser.
2. Go to API keys page.
3. Create a new secret key with access for Chat Completions.
4. Copy the key (keep it private).

## 6.2 Add server env variables in deployment

Set these **server-side** env variables in your deployed app:
1. `TRAVEL_RECEIPT_OCR_OPENAI_API_KEY` = `<your_openai_api_key>`
2. `TRAVEL_RECEIPT_OCR_OPENAI_MODEL` = `gpt-4o-mini` (or your approved model)

### Vercel path (if deployed on Vercel)
1. Open `vercel.com` and select project `Payment control`.
2. Open **Settings** -> **Environment Variables**.
3. Add `TRAVEL_RECEIPT_OCR_OPENAI_API_KEY`.
4. Add `TRAVEL_RECEIPT_OCR_OPENAI_MODEL`.
5. Save variables for the target environments (Preview/Production as needed).
6. Trigger redeploy:
   - Deployments -> latest deployment -> **Redeploy**
   - or push a new commit.

### Local server path (if running locally)
1. Open project file `.env.local`.
2. Add:
   - `TRAVEL_RECEIPT_OCR_OPENAI_API_KEY=...`
   - `TRAVEL_RECEIPT_OCR_OPENAI_MODEL=gpt-4o-mini`
3. Restart Next.js server (`npm run dev` / restart process).

## 6.3 Verify OCR is active
1. Open app in Telegram Mini App runtime.
2. Travel -> open active trip -> `Receipt drafts`.
3. Add receipt photo and save draft.
4. Open draft -> tap `Run OCR prefill`.
5. Expected result when configured correctly:
   - no `OCR assistant is not configured on server...` banner,
   - receipt status moves to parsed/ready path or provider-specific parse error.

## 7) Files Changed

1. `.env.example`
2. `src/lib/travel/client.ts`
3. `src/lib/travel/validation.ts`
4. `src/lib/travel/repository.ts`
5. `src/components/app/travel-group-expenses-section.tsx`
6. `src/lib/i18n/localization.tsx`
7. `docs/reports/internal_version_history.md`
8. `docs/reports/phase_30I_ocr_operational_truth_and_receipt_draft_save_regression_fix.md`

## 8) What Was Intentionally NOT Changed

1. No schema migrations.
2. No new feature-wave.
3. No shell/nav redesign.
4. No rollback of modal-first grammar.
5. No bot-facing manual Telegram settings changes.

## 9) Verification Run

Executed:
1. `npm run lint` (pass with existing `no-img-element` warnings in travel receipt previews)
2. `npm run build` (pass)
3. Targeted tests:
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/finalization.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/split.test.ts` (pass)

## 10) Manual Verification Checklist

1. Travel -> selected trip -> `Receipt drafts` -> add new receipt image <= 4 MB -> draft saves.
2. Repeat save with > 4 MB image -> clear size validation message appears immediately.
3. Existing draft parse with OCR env missing -> operational OCR-unavailable message appears.
4. Existing draft parse with OCR env configured -> parse path works (or provider-specific parse error, but no missing-env message).
5. Replace receipt image path follows the same size/type safety checks.
6. No regressions in participants/expense/settlement/history layers inside selected trip workspace.

## 11) Risks / Regression Watchlist

1. If deployment proxy has limit lower than 4 MB, reduce envelope further in next reliability pass.
2. If OCR key is set but provider/model permissions are invalid, parse will fail with provider error (expected operational issue, not save-draft bug).
3. Keep migration parity between code and DB; create path now reports schema-drift hint when detected.

