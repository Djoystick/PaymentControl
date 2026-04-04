# Phase 28E - Trip Closure + Settlement Finalization

- Date: 2026-04-04
- Status: implemented, pending manual verification
- Scope: travel branch maturity wave after 28D (closure states + settlement finalization workflow)
- Baseline preserved:
  - unrestricted donation-only model
  - no Premium/entitlement/claim/unlock return
  - recurring and travel remain product-separated

## 1) What Was Audited

Before implementation, the following source-of-truth documents were reviewed:
1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
2. `docs/reports/phase_27H_final_release_sign_off_and_verified_closure_sync.md`
3. `docs/reports/phase_28A_travel_group_expenses_foundation_and_manual_first_mvp.md`
4. `docs/reports/phase_28A1_recurring_summary_slice_restoration_and_surface_unification.md`
5. `docs/reports/phase_28B_official_subscription_cancellation_guide_layer.md`
6. `docs/reports/phase_28C_expanded_official_cancellation_catalog_and_category_navigation.md`
7. `docs/reports/phase_28D_travel_workspace_acceleration_and_settlement_clarity.md`
8. `docs/reports/internal_version_history.md`

Runtime/data touchpoints inspected:
1. `src/components/app/travel-group-expenses-section.tsx`
2. `src/lib/travel/repository.ts`
3. `src/lib/travel/client.ts`
4. `src/lib/travel/types.ts`
5. `src/lib/travel/split.ts`
6. `src/lib/i18n/localization.tsx`
7. travel API routes under `src/app/api/travel/trips/*`
8. migration baseline in `supabase/migrations/20260404120000_phase28a_travel_group_expenses_foundation.sql`

## 2) Main Gaps Found After 28D

Key user-facing gaps blocking true trip completion:
1. trip settlement area was informative but not finalizable (no explicit settle/unsettle workflow).
2. there was no formal trip lifecycle state (`active` vs `closed`) with clear UX difference.
3. no safe close action to finish a trip with settlement transparency.
4. no explicit reopen path to safely return from finalized/closing state.

## 3) Why Trip Closure Was the Next Logical Step

After 28A (foundation) and 28D (entry/correction acceleration), the missing product layer was completion:
1. groups could track spending and compute balances,
2. but could not cleanly move from "ongoing trip" to "trip finished".

Phase 28E addresses exactly that gap without introducing OCR/multicurrency or heavy debt optimization.

## 4) Data Model and Migration Changes

Added migration:
- `supabase/migrations/20260404193000_phase28e_trip_closure_and_settlement_finalization.sql`

Schema additions:
1. `public.travel_trips`
   - `status text not null default 'active'` with check: `active | closing | closed`
   - `closed_at timestamptz`
   - `closure_updated_at timestamptz not null default timezone('utc', now())`
2. new `public.travel_trip_settlement_items`
   - stores explicit finalization transfer items (`from_member_id`, `to_member_id`, `amount`)
   - status model: `open | settled`
   - `settled_at` coherence check by status
   - uniqueness per trip pair `(trip_id, from_member_id, to_member_id)`
   - indexed by `(trip_id, status, updated_at desc)`

Why safe/minimal:
1. no recurring-schema merge, travel remains isolated.
2. no destructive change to recurring/history/family core data.
3. no API/payment business logic replacement outside travel lane.

## 5) Trip States Implementation

Implemented trip lifecycle in travel domain:
1. `active` - full expense add/edit/delete workflow available.
2. `closing` - settlement finalization mode:
   - settlement items are snapshotted from recommended transfers,
   - expenses become locked,
   - user marks transfer rows settled/open.
3. `closed` - read-only completed trip view:
   - final settlement snapshot visible,
   - edit/add/delete actions disabled,
   - trip remains readable in history context.

## 6) Settlement Finalization Flow

New backend operations:
1. `mutateTravelTripClosureForTrip(...)` in repository
   - `start`: switches `active -> closing`, snapshots settlement items
   - `close`: switches `closing -> closed` (blocked when open items remain unless explicit override)
   - `reopen`: switches `closing|closed -> active`, clears settlement snapshot
2. `updateTravelSettlementItemStatusForTrip(...)`
   - available only in `closing`
   - marks a settlement item `open <-> settled`
   - refreshes trip snapshot and closure timestamps

New API routes:
1. `POST /api/travel/trips/[tripId]/closure`
2. `PATCH /api/travel/trips/[tripId]/settlements/[settlementItemId]`

Client additions:
1. `mutateTravelTripClosure(...)`
2. `updateTravelSettlementItemStatus(...)`

## 7) Closed Trip UX and Finalization UX

`travel-group-expenses-section` now includes:
1. visible trip status labels in trip list and selected trip header (`Active` / `Finalizing` / `Closed`).
2. closure control lane:
   - `Start finalization` for active trips,
   - `Close trip` + `Back to active` for closing trips,
   - `Reopen trip` for closed trips.
3. explicit blocked-close confirmation path:
   - if open settlements remain, user gets clear prompt,
   - can keep trip active or close with explicit confirmation.
4. settlement panel upgrades:
   - open settlement count/total,
   - settled count/total,
   - per-row `Mark as settled` / `Return to open` in closing mode,
   - clearer finished-state summary in closed mode.
5. closed/closing mode edit lock:
   - expense form replaced by explanatory read-only block,
   - history edit/delete actions disabled,
   - no hidden mutable behavior in non-active status.

## 8) How Unfinished Settlements on Close Are Handled

Behavior:
1. default close requires zero open settlement items.
2. if open items remain, close request is blocked with explicit message.
3. UI provides an explicit "close with open settlements" confirmation path.

This preserves calm non-aggressive flow while avoiding silent ambiguous closure.

## 9) Additional Reliability/Tightening Work

1. expanded travel API error surface:
   - `TRAVEL_TRIP_EDIT_LOCKED`
   - `TRAVEL_TRIP_CLOSURE_INVALID_STATE`
   - `TRAVEL_TRIP_CLOSURE_BLOCKED`
   - `TRAVEL_TRIP_CLOSURE_FAILED`
   - `TRAVEL_SETTLEMENT_NOT_FOUND`
   - `TRAVEL_SETTLEMENT_UPDATE_FAILED`
2. updated travel route status maps and error mapping for lock/finalization cases.
3. added `src/lib/travel/finalization.ts` + tests for settlement overview consistency by trip status.
4. refactored split summary output into dedicated calculated type (`TravelCalculatedTripSummary`) to keep closure overlay logic explicit and type-safe.

## 10) What Was Intentionally NOT Changed

Out of scope and intentionally not implemented in 28E:
1. OCR flows
2. photo receipt pipeline
3. notification interception
4. multicurrency conversion/rates
5. advanced debt optimization
6. recurring business logic or recurring schema
7. guide layer (28B/28C) behavior
8. donation/supporter model semantics

## 11) Future Roadmap Reminders (not implemented here)

Still future-only:
1. OCR receipt parsing assistance
2. save-now/parse-later photo receipt flow
3. multicurrency trip accounting
4. advanced debt optimization beyond baseline transfer recommendations

## 12) Validation

Targeted tests:
1. `node --test --test-isolation=none src/lib/travel/split.test.ts src/lib/travel/finalization.test.ts` - pass

Project checks:
1. `npm run lint` - pass
2. `npm run build` - pass

Migration note:
1. this pass adds one new schema migration (`20260404193000_phase28e_trip_closure_and_settlement_finalization.sql`)
2. manual DB sync required before runtime verification:
   - `supabase db push`
   - `supabase migration list`
3. attempted in current environment:
   - `supabase migration list` -> failed (`SUPABASE_ACCESS_TOKEN` is missing / `supabase login` required)
   - as a result, clean apply verification stays as manual environment debt for owner/dev machine with linked Supabase project.

## 13) Risks / Regression Watchlist

1. closing snapshot coherence: verify settlement snapshot always reflects latest expense state at `start finalization`.
2. explicit-close-with-open path: verify operator intent is always clear on mobile.
3. reopen behavior: verify users understand that reopening clears previous settlement-item status snapshot.
4. long trip histories: verify read-only closed state remains performant with many expenses.
5. RU/EN parity on new closure/finalization states and error messages.

## 14) Self-Check Against Acceptance Criteria

1. trip closure/completion workflow: yes.
2. settlement finalization flow: yes.
3. clear `active` vs `closed` difference: yes.
4. mature settlement final view (`open`/`settled`, totals, actions): yes.
5. practical closure path with unresolved-settlement transparency: yes.
6. recurring baseline and donation-only truth preserved: yes.
