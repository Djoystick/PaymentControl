# Phase 6A - Reminder Preferences + Candidate Foundation Report

Date: 2026-03-25  
Scope: Minimal reminder preferences and reminder candidate computation for personal workspace

## What Was Implemented
- Added reminder preference fields on recurring payments:
  - `reminders_enabled`
  - `remind_days_before` (0/1/3)
  - `remind_on_due_day`
  - `remind_on_overdue`
- Extended payment create/update flow and validation to support reminder preferences.
- Added server-side reminder candidate computation using current-cycle due date + cycle paid/unpaid state.
- Added reminder candidate endpoint:
  - `POST /api/payments/reminders/candidates`
- Added minimal reminder candidates UI section:
  - summary counts by reason (`due_today`, `advance`, `overdue`)
  - candidate list
  - refresh button
- Added minimal reminder settings UI into recurring payment form:
  - reminders enabled toggle
  - remind days before selector
  - due-day reminder toggle
  - overdue reminder toggle
- Preserved existing payment CRUD, cycle-state actions, dashboard, and quick-add behavior.

## Reminder Rules Used
- Evaluation is UTC date based and intentionally simple.
- Candidate evaluation considers only:
  - active payments
  - unpaid current cycle
  - reminders enabled
- Candidate reasons:
  - `due_today`: due date is today and `remind_on_due_day = true`
  - `advance`: due date is `today + remind_days_before` and `remind_days_before > 0`
  - `overdue`: due date before today and `remind_on_overdue = true`
- Duplicate candidates for same payment+reason are deduplicated in one evaluation pass.

## What Was Intentionally NOT Implemented
- Actual Telegram reminder delivery sending.
- Background scheduler/cron/job worker.
- Queue system for retries.
- Family/shared reminder flows.
- Premium reminder tiers.
- Full notification center/history.
- Advanced reminder engine (time-of-day, multiple reminder offsets, custom rules).

## Exact Files Created/Modified

Created:
- `supabase/migrations/20260325_060000_phase6a_reminder_preferences.sql`
- `src/app/api/payments/reminders/candidates/route.ts`
- `src/components/app/reminder-candidates-section.tsx`
- `docs/phase6a_reminder_preferences_foundation_report.md`

Modified:
- `src/lib/payments/types.ts`
- `src/lib/payments/validation.ts`
- `src/lib/payments/repository.ts`
- `src/lib/payments/client.ts`
- `src/lib/payments/starter-templates.ts`
- `src/app/api/payments/recurring/route.ts`
- `src/app/api/payments/recurring/[paymentId]/route.ts`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/landing-screen.tsx`
- `README.md`

## Manual Verification Steps
1. Apply migration `20260325_060000_phase6a_reminder_preferences.sql`.
2. Start app and open in browser with dev fallback (or Telegram context).
3. In recurring payment form, set reminder preferences and create/update a payment.
4. Confirm reminder settings persist after refresh.
5. Open reminder candidates section and verify list/counts.
6. Mark payment paid and confirm it is removed from due/unpaid candidate set.
7. Mark unpaid again and confirm candidate can reappear when rules match.
8. Archive payment and confirm no reminder candidate remains for it.

## Known Limitations
- Candidate computation is on-demand (read-time), no scheduled background job.
- UTC date boundaries may differ from local timezone expectations.
- Reminder offsets are intentionally limited to `0`, `1`, `3` days.
- No delivery logs or notification history table yet.
- Personal workspace only.

## Recommended Next Phase
- Phase 6B: add minimal reminder dispatch foundation (manual or controlled trigger path) with delivery-attempt logging, while still avoiding a full autonomous scheduler in the first pass.

## Verification Status In This Environment
- Confirmed in this pass:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Build output includes `/api/payments/reminders/candidates`.
- Not fully confirmed in this pass:
  - Full manual runtime click-through verification was not executed by this tool run.
