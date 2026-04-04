# Phase 28H - OCR Quality Hardening + Receipt Enrichment

- Date: 2026-04-04
- Status: implemented, pending manual verification
- Scope: travel branch quality hardening wave after 28G (no product-model changes)
- Baseline preserved:
  - unrestricted donation-only truth
  - no Premium/entitlement/claim/unlock return
  - recurring and travel remain product-separated

## 1) Audit After 28G

Reviewed source-of-truth before implementation:
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
11. `docs/reports/internal_version_history.md`

Runtime/data touchpoints audited:
1. `src/components/app/travel-group-expenses-section.tsx`
2. `src/lib/travel/receipt-ocr.ts`
3. `src/lib/travel/repository.ts`
4. `src/lib/travel/types.ts`
5. `src/lib/travel/client.ts`
6. `src/app/api/travel/trips/[tripId]/receipts/route.ts`
7. `src/app/api/travel/trips/[tripId]/receipts/[receiptDraftId]/route.ts`
8. migration baseline up to 28G

Main friction found after 28G:
1. OCR result had no field-level quality signaling (trust gap).
2. No direct reset path for wrong OCR suggestions.
3. No replace-photo path for low-quality receipt images.
4. Draft cards lacked parse-attempt metadata and next-step clarity.
5. OCR normalization was too strict for common human formats (spaces/comma decimal and DD.MM.YYYY style dates).

## 2) Why 28H Is the Next Logical Step

After 28G introduced receipt drafts + OCR prefill, the next practical risk was user trust and correction speed, not new domain expansion. 28H therefore hardens quality signaling, reparse/replace/reset ergonomics, and OCR normalization quality while preserving strict manual confirmation.

## 3) OCR Quality Signaling Improvements

Added lightweight field-level quality model:
1. `high`
2. `medium`
3. `low`
4. `missing`

Implemented changes:
1. OCR prompt now requests `fieldQuality` map for core fields.
2. Normalization fallback guarantees deterministic map even when model omits quality.
3. Receipt draft payload now exposes `ocrFieldQuality` for UI.
4. Profile card rendering now shows compact quality pills per critical fields (amount/currency/date/merchant/description).

User-facing result:
1. user sees where OCR is reliable,
2. user sees where manual check is needed,
3. no “black-box OCR” feel.

## 4) Reparse / Replace-Photo / Correction Flow

### 4.1 Reparse
1. Existing parse action kept and hardened.
2. Parsed drafts now support explicit `Reparse OCR` action.

### 4.2 Reset OCR hints
1. Added explicit `reset` action for receipt draft OCR hints.
2. Clears OCR suggestions/errors while keeping draft itself.
3. Keeps draft/manual flow intact; no auto-expense behavior.

### 4.3 Replace photo
1. Added `PUT` flow for draft image replacement.
2. Replaces image while preserving draft identity/context.
3. Resets OCR suggestions + parse state so user can parse again from cleaner photo.

### 4.4 Prefill correction UX
1. Expense form now highlights fields that need review after OCR prefill.
2. Highlights clear automatically as user edits corresponding fields.
3. Attached draft block now shows concise review summary (`Please double-check fields: ...`).

## 5) Receipt Draft Enrichment

Enriched draft metadata (DB + payload + UI):
1. parse attempts count,
2. last parse attempt timestamp,
3. source image updated timestamp,
4. OCR text snippet block (compact `details` pattern),
5. explicit next-action copy for `draft` and `ocr_failed` states.

This improves practical “what happened / what next” clarity without turning drafts into a heavy document archive.

## 6) Extraction Quality Areas Strengthened

Practical improvements in normalization logic:
1. better number parsing from human formats (`1 234,50`),
2. better date normalization for short formats (`DD.MM.YYYY`, `DD/MM/YYYY`, optional time),
3. deterministic quality fallback when model omits confidence fields,
4. stronger prompt discipline to avoid speculative conversion-rate guesses.

## 7) Manual Confirmation Rule Preserved

Confirmed in runtime behavior:
1. OCR still only suggests values,
2. OCR never silently creates final expense,
3. user remains required to confirm/edit fields and submit manually,
4. receipt draft finalization to expense still occurs only after confirmed expense save.

## 8) Data Model / Migration Changes

Added migration:
1. `supabase/migrations/20260405013000_phase28h_ocr_quality_hardening_and_receipt_enrichment.sql`

Added columns to `public.travel_receipt_drafts`:
1. `ocr_field_quality jsonb not null default '{}'::jsonb`
2. `ocr_parse_attempts integer not null default 0`
3. `ocr_last_attempt_at timestamptz`
4. `source_image_updated_at timestamptz not null default timezone('utc', now())`

Safety constraints:
1. `ocr_parse_attempts >= 0`
2. `jsonb_typeof(ocr_field_quality) = 'object'`

Added index:
1. `travel_receipt_drafts_trip_attempt_idx (trip_id, ocr_last_attempt_at desc)`

## 9) Files Changed (Main)

New files:
1. `supabase/migrations/20260405013000_phase28h_ocr_quality_hardening_and_receipt_enrichment.sql`
2. `src/lib/travel/receipt-ocr-normalization.ts`
3. `src/lib/travel/receipt-ocr.test.ts`

Updated files:
1. `src/lib/travel/types.ts`
2. `src/lib/travel/receipt-ocr.ts`
3. `src/lib/travel/repository.ts`
4. `src/lib/travel/client.ts`
5. `src/app/api/travel/trips/[tripId]/receipts/route.ts`
6. `src/app/api/travel/trips/[tripId]/receipts/[receiptDraftId]/route.ts`
7. `src/components/app/travel-group-expenses-section.tsx`
8. `src/lib/i18n/localization.tsx`

## 10) What Was Intentionally NOT Done

Out of scope and intentionally not implemented:
1. notification interception,
2. autonomous expense creation without review,
3. live FX rate fetching,
4. shell redesign,
5. recurring/travel model merge,
6. heavy OCR pipeline overengineering,
7. document-archive style receipt system.

## 11) Future Roadmap Reminders (not implemented here)

1. more advanced OCR model routing/calibration,
2. richer receipt attachment system (metadata lifecycle beyond lightweight draft panel),
3. advanced FX automation/rate fetching,
4. advanced debt optimization.

## 12) Risks / Regression Watchlist

1. OCR quality labels depend on provider output; fallback logic helps, but model variance still exists.
2. Mobile file picker behavior may vary across Telegram WebView devices for replace-photo flow.
3. Verify migration application order (28G then 28H) in shared environments before runtime checks.
4. Watch parse-attempt metadata consistency under intermittent provider/network failures.

## 13) Validation

Targeted tests:
1. `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/split.test.ts src/lib/travel/finalization.test.ts src/lib/travel/validation.test.ts src/lib/travel/receipt-ocr.test.ts` - pass

Project checks:
1. `npm run lint` - pass
2. `npm run build` - pass

Migration/DB sync:
1. attempted `supabase migration list` in this environment - failed due missing auth (`SUPABASE_ACCESS_TOKEN` / `supabase login`).
2. manual sync remains required on linked environment:
   - `supabase db push`
   - `supabase migration list`

## 14) Self-Check Against Acceptance Criteria

1. OCR helper became more reliable and interpretable: yes.
2. field-level quality/confidence signaling added where useful: yes.
3. reparse / replace-photo / correction path improved: yes.
4. receipt drafts enriched without heavy archive overreach: yes.
5. save-now / parse-later remains short and practical: yes.
6. multi-currency, balances, settlement, closure, recurring baseline preserved: yes.
