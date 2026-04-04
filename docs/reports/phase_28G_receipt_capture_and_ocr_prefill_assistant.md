# Phase 28G - Receipt Capture + OCR Prefill Assistant

- Date: 2026-04-04
- Status: implemented, pending manual verification
- Scope: travel branch practical wave after 28F (receipt drafts + OCR-assisted prefill + save-now/parse-later)
- Baseline preserved:
  - unrestricted donation-only model
  - no Premium/entitlement/claim/unlock return
  - recurring and travel remain product-separated

## 1) What Was Audited After 28F

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
10. `docs/reports/internal_version_history.md`

Runtime/data touchpoints audited:
1. `src/components/app/travel-group-expenses-section.tsx`
2. `src/lib/travel/types.ts`
3. `src/lib/travel/client.ts`
4. `src/lib/travel/repository.ts`
5. `src/lib/travel/validation.ts`
6. travel API routes under `src/app/api/travel/trips/*`
7. existing travel migrations 28A + 28E + 28F

Main friction found:
1. manual entry remained long in receipt-heavy sessions.
2. no way to quickly capture receipt and postpone parsing.
3. no OCR-assisted prefill path into existing expense form.
4. no explicit draft/finalized separation for receipt-driven flow.

## 2) Why OCR/Receipt Wave Is the Next Logical Step

After 28A (foundation), 28D (entry/correction), 28E (closure/finalization), and 28F (multi-currency), the next practical user pain point was repetitive manual typing from receipts.

Phase 28G adds a helper layer only:
1. capture first,
2. parse when convenient,
3. always confirm manually before expense save.

## 3) Receipt Capture Foundation

Added migration:
1. `supabase/migrations/20260405003000_phase28g_receipt_capture_and_ocr_prefill_assistant.sql`

New table:
1. `public.travel_receipt_drafts`

Purpose:
1. keep receipt drafts separate from finalized expenses,
2. preserve OCR suggestions and errors,
3. track final linkage to created expense when user confirms save.

Core fields:
1. draft state (`draft` / `parsed` / `ocr_failed` / `finalized`),
2. image payload (`image_data_url`, mime, file name),
3. OCR suggestions (amount/currency/date/merchant/description/category/rate/raw text),
4. finalization linkage (`finalized_expense_id`, `finalized_at`).

Safety constraints:
1. image payload format/size checks,
2. OCR numeric/currency validity checks,
3. finalized-state consistency check.

## 4) Draft Receipt Flow (Save Now, Parse Later)

Implemented travel-only draft lifecycle:
1. capture receipt photo from trip workspace,
2. save as `travel_receipt_drafts` record,
3. keep draft visible in trip receipt panel,
4. parse later via explicit action,
5. delete non-finalized drafts safely.

No recurring-lane coupling was introduced.

## 5) OCR Prefill Assistant

Added OCR helper:
1. `src/lib/travel/receipt-ocr.ts`

Behavior:
1. OCR attempts extraction for: amount, currency, spent date, merchant, description, category, conversion rate, raw text.
2. OCR result updates receipt draft as `parsed` (or `ocr_failed` on provider failure).
3. OCR never creates expense automatically.

Provider configuration:
1. `TRAVEL_RECEIPT_OCR_OPENAI_API_KEY`
2. `TRAVEL_RECEIPT_OCR_OPENAI_MODEL` (default `gpt-4o-mini`)

If OCR env is missing, API returns explicit `TRAVEL_OCR_UNAVAILABLE` and keeps save-now/parse-later flow intact.

## 6) Create/Edit Flow Integration

Updated expense input contract:
1. `receiptDraftId` optional in `TravelCreateExpenseInput`.

UI behavior:
1. user can apply parsed draft into existing expense form,
2. prefilled fields stay editable,
3. user confirms payer/split and saves manually,
4. on successful create, linked draft is marked `finalized`.

If linkage finalization fails, expense creation is rolled back to avoid inconsistent state.

## 7) Multi-Currency Compatibility (28F Continuity)

Preserved model:
1. OCR currency is suggestion only,
2. user can edit currency and conversion rate,
3. normalized trip-currency totals remain source of balances/settlements,
4. source amount/currency remain visible.

No hidden FX recalculation was introduced.

## 8) Closure/Finalization Compatibility (28E Continuity)

Guardrails kept:
1. creating/deleting receipt drafts requires `active` trip,
2. expense creation via receipt-linked flow remains blocked in non-active trips,
3. receipt drafts cannot bypass `closing/closed` edit lock.

Closed trip remains read-only for expense creation.

## 9) What Was Intentionally NOT Done

Out of scope and intentionally not implemented:
1. notification interception,
2. autonomous expense creation without review,
3. live FX rate fetching,
4. shell redesign,
5. recurring/travel domain merge,
6. advanced document-processing stack overreach.

## 10) Files Added/Changed (Main)

New files:
1. `supabase/migrations/20260405003000_phase28g_receipt_capture_and_ocr_prefill_assistant.sql`
2. `src/lib/travel/receipt-ocr.ts`
3. `src/app/api/travel/trips/[tripId]/receipts/route.ts`
4. `src/app/api/travel/trips/[tripId]/receipts/[receiptDraftId]/route.ts`
5. `src/lib/travel/validation.test.ts`

Updated core files:
1. `src/lib/travel/types.ts`
2. `src/lib/travel/validation.ts`
3. `src/lib/travel/repository.ts`
4. `src/lib/travel/client.ts`
5. `src/components/app/travel-group-expenses-section.tsx`
6. `src/lib/config/server-env.ts`
7. `src/lib/i18n/localization.tsx`
8. travel API routes for type-safe error-map widening (`Partial<Record<...>>`).

## 11) Future Roadmap Reminders (not implemented here)

Still future-only:
1. higher OCR quality and confidence calibration,
2. richer receipt attachment metadata/enrichment,
3. advanced FX automation/rate fetching,
4. advanced debt optimization.

## 12) Risks / Regression Watchlist

1. OCR provider availability/configuration in production envs.
2. image payload size pressure if users attach very large photos repeatedly.
3. mobile WebView file-capture behavior variance across devices.
4. ensure migration is applied before runtime verification in shared environments.
5. verify receipt-link finalization rollback path under intermittent DB errors.

## 13) Validation

Targeted tests:
1. `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/split.test.ts src/lib/travel/finalization.test.ts src/lib/travel/validation.test.ts` - pass

Project checks:
1. `npm run lint` - pass
2. `npm run build` - pass

Migration/DB sync check:
1. attempted `supabase migration list` - failed in current environment (missing `SUPABASE_ACCESS_TOKEN` / `supabase login`).
2. manual sync remains required on linked environment:
   - `supabase db push`
   - `supabase migration list`

## 14) Self-Check Against Acceptance Criteria

1. receipt capture foundation for travel: yes.
2. OCR-prefill assistant added: yes (assistant-only, no auto-create).
3. save-now/parse-later flow: yes.
4. manual confirmation/correction before expense save: yes.
5. compatibility with multi-currency, balances, settlements, closure: yes.
6. recurring baseline and donation-only truth preserved: yes.
