# Phase 28F - Multi-Currency Foundation + Travel Amount Clarity

- Date: 2026-04-04
- Status: implemented, pending manual verification
- Scope: travel branch maturity wave after 28E (fixed-rate multi-currency foundation without OCR/live-FX overreach)
- Baseline preserved:
  - unrestricted donation-only model
  - no Premium/entitlement/claim/unlock return
  - recurring and travel remain product-separated

## 1) What Was Audited After 28E

Reviewed before implementation:
1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
2. `docs/reports/phase_27H_final_release_sign_off_and_verified_closure_sync.md`
3. `docs/reports/phase_28A_travel_group_expenses_foundation_and_manual_first_mvp.md`
4. `docs/reports/phase_28A1_recurring_summary_slice_restoration_and_surface_unification.md`
5. `docs/reports/phase_28B_official_subscription_cancellation_guide_layer.md`
6. `docs/reports/phase_28C_expanded_official_cancellation_catalog_and_category_navigation.md`
7. `docs/reports/phase_28D_travel_workspace_acceleration_and_settlement_clarity.md`
8. `docs/reports/phase_28E_trip_closure_and_settlement_finalization.md`
9. `docs/reports/internal_version_history.md`

Runtime/data touchpoints audited:
1. `src/lib/travel/types.ts`
2. `src/lib/travel/validation.ts`
3. `src/lib/travel/repository.ts`
4. `src/lib/travel/client.ts`
5. `src/app/api/travel/trips/[tripId]/expenses/route.ts`
6. `src/app/api/travel/trips/[tripId]/expenses/[expenseId]/route.ts`
7. `src/components/app/travel-group-expenses-section.tsx`
8. `src/lib/i18n/localization.tsx`
9. existing travel migrations up to 28E

Main gaps found:
1. travel expense amount model was effectively single-currency (expense always persisted in trip base currency only).
2. user could not persist explicit source amount/currency/rate context for foreign trips.
3. history and edit flow could not explain how normalized trip-currency totals were derived.

## 2) Why Multi-Currency Is the Next Logical Step

After 28A foundation, 28D acceleration, and 28E closure/finalization, travel module had lifecycle maturity but lacked a critical real-world travel layer:
1. mixed-currency expense capture,
2. explicit fixed-rate normalization,
3. predictable trip totals in base currency without hidden recalculation.

Phase 28F adds that missing layer with minimal risk and no recurring-domain coupling.

## 3) Travel Data Model Changes

Added migration:
1. `supabase/migrations/20260404223000_phase28f_multi_currency_foundation_for_travel.sql`

Schema changes in `public.travel_trip_expenses`:
1. `source_amount numeric(12,2)` - original entered amount
2. `source_currency char(3)` - original entered currency
3. `conversion_rate numeric(12,6)` - fixed conversion rate saved with expense

Safety/backfill:
1. existing rows backfilled from prior single-currency model:
   - `source_amount = amount`
   - `source_currency = currency`
   - `conversion_rate = 1`
2. columns made `NOT NULL`
3. added checks:
   - `source_amount > 0`
   - 3-letter uppercase currency code for `source_currency`
   - `conversion_rate > 0`

## 4) Base Trip Currency vs Expense Currency Model

Model after 28F:
1. trip keeps one base currency (`travel_trips.base_currency`).
2. each expense stores:
   - source amount/currency (`source_amount`, `source_currency`)
   - fixed conversion rate (`conversion_rate`)
   - normalized amount in trip currency (`amount`, `currency`).
3. balances/settlements/closure totals continue to run on normalized trip-currency amount.
4. source amount/currency remain visible in history/edit UX.

Important invariant:
1. conversion rate is fixed at save/edit time (historical expenses do not drift over time).

## 5) Conversion-Rate Storage and Domain Logic

New helper:
1. `src/lib/travel/currency.ts`
2. `normalizeTravelExpenseAmount(...)` handles:
   - same-currency shortcut (`conversion_rate = 1`)
   - cross-currency requirement for explicit positive rate
   - rounded normalized trip-currency amount (`2` decimals)
   - stable persisted rate (`6` decimals)

Repository integration:
1. `createTravelExpenseForTrip(...)` now normalizes source -> trip amount before split/insert.
2. `updateTravelExpenseForTrip(...)` does the same for edit flow.
3. split engine runs on normalized trip-currency amount (so balances/settlements remain coherent).
4. response payload includes both source and normalized values.

## 6) Create/Edit Flow Changes

Travel expense form updated (`travel-group-expenses-section`):
1. added expense currency input (3-letter code).
2. same-currency path stays short (no extra conversion step required).
3. cross-currency path shows explicit conversion-rate input.
4. preview shows converted amount in trip currency before save.
5. edit mode loads original source amount/currency/rate and allows correction.

Validation updates:
1. `src/lib/travel/validation.ts` now validates:
   - `expenseCurrency`
   - `conversionRate` shape when provided
2. repository-level validation enforces:
   - cross-currency must include positive conversion rate
   - converted normalized amount must remain positive

## 7) History / Balances / Settlements / Closure Surface Updates

History/detail clarity:
1. expense history card now highlights original amount/currency.
2. if converted, card shows normalized trip-currency amount and stored rate.
3. split rows remain shown in trip base currency context.

Summary/settlement clarity:
1. trip summary explicitly states totals/settlements are calculated in trip base currency.
2. balance section includes explicit base-currency reminder.

Closure compatibility (28E):
1. `active/closing/closed` lifecycle behavior unchanged.
2. settlement snapshot/finalization still uses normalized trip-currency amounts.
3. closed trip remains readable with added source-currency context in expense history.

## 8) Compatibility with Existing Single-Currency Trips

Compatibility approach:
1. migration backfills source fields for all existing rows.
2. legacy trips continue to behave as same-currency (`conversion_rate = 1`).
3. payload mapping in repository includes fallback safety (`source_*` fallback to normalized fields if needed).

Result:
1. no required data rewrite by users for already-created trips.

## 9) What Was Intentionally NOT Done

Out of scope and intentionally not implemented in 28F:
1. OCR
2. photo receipt pipeline
3. live FX rate fetching/automation
4. advanced debt optimization
5. recurring-domain merge/refactor
6. shell redesign

## 10) Future Roadmap Reminders (not implemented here)

Future-only reminders:
1. OCR prefill for receipt parsing
2. photo receipt save-now/parse-later flow
3. advanced FX automation / rate fetching
4. advanced debt optimization on top of baseline settlement model

## 11) Validation

Targeted tests:
1. `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/split.test.ts src/lib/travel/finalization.test.ts` - pass

Project checks:
1. `npm run lint` - pass
2. `npm run build` - pass

Migration/DB sync notes:
1. migration file added and schema constraints/backfill defined.
2. attempted `supabase migration list` in this environment:
   - failed due missing auth (`SUPABASE_ACCESS_TOKEN` / `supabase login` required).
3. manual sync required on linked environment:
   - `supabase db push`
   - `supabase migration list`

## 12) Risks / Regression Watchlist

1. Cross-currency UX: verify users understand rate meaning (`1 source = X trip-currency`).
2. Manual split in cross-currency trips: verify team understands split amounts are persisted in normalized trip-currency totals.
3. Mobile numeric input behavior for conversion rate in Telegram WebView.
4. Ensure DB migration is applied before runtime verification on environments using travel APIs.

## 13) Self-Check Against Acceptance Criteria

1. Multi-currency foundation for travel module: yes.
2. Clear source-currency vs trip-currency amount model: yes.
3. Create/edit flow includes currency and conversion: yes.
4. History/summary/balance/settlement clarity improved for mixed currency: yes.
5. Closure/finalization flow compatibility preserved: yes.
6. Recurring baseline and global donation-only truth preserved: yes.

