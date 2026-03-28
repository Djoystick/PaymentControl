# Phase 17C.1 — Recurring Cycle Normalization and Next-Cycle Visibility Fix

- Date: 2026-03-28
- Project: Telegram Mini App `Payment Control`
- Scope: Narrow bugfix pass (no broad redesign)
- Anchor/read context:
  - `docs/payment_control_master_anchor_2026-03-28.md`
  - `docs/reports/phase_17B_reminders_rethink_analysis.md`
  - `docs/reports/phase_17C_action_lane_cleanup.md`

## Root Cause

### 1) Immediate overdue on create (monthly)
Root cause: current-cycle derivation always used the current month (`resolveCurrentCycle` for monthly), regardless of creation date.  
Result: if a payment was created after the selected monthly due day (example: created `2026-03-28`, due day `16`), the first computed cycle was `2026-03-16`, i.e. immediately overdue.

### 2) Weak forward context after `Mark paid`
Root cause: card UI displayed only current-cycle state/date and had no explicit next-cycle date line.  
Result: after `Mark paid`, users lost forward visibility (what date is next), and the item felt "finished/vanished" from recurring obligations even though it remains active.

## What Logic Was Changed

### A. Initial-cycle normalization for newly created recurring items
File: `src/lib/payments/cycle.ts`

Changes:
1. Extended `resolveCurrentCycleForPayment(...)` to accept optional `createdAt`.
2. Added normalization rule for first cycle:
- If item is created in the current cycle window and computed current due date is earlier than creation date, shift first active cycle forward.
- Monthly: shift to next month due date.
- Weekly: shift to next week due date (same principle, narrow/safe extension).
3. Added `resolveMonthlyCycleByYearMonth(...)` helper for safe month-forward calculation with month-length clamping.

Behavior outcome for reported case:
- Monthly payment created `2026-03-28` with due day `16` now resolves to `2026-04-16` (not immediately overdue).

### B. Repository now passes creation timestamp into cycle resolver
File: `src/lib/payments/repository.ts`

Change:
- `toPaymentPayload(...)` now passes `createdAt: row.created_at` into `resolveCurrentCycleForPayment(...)`.

This ensures normalization is applied from persisted data without DB schema changes.

### C. Added next-cycle due date helper
File: `src/lib/payments/cycle.ts`

Change:
- Added `resolveNextCycleDueDate(cadence, dueDay, currentCycleDueDate)` for minimal forward-looking UI context.

## What UI Text / Visibility Was Changed

File: `src/components/app/recurring-payments-section.tsx`

Changes:
1. Imported and used `resolveNextCycleDueDate(...)` per payment card.
2. When `currentCycle.state === "paid"`, card now shows:
- `Next payment date: <date>`

This preserves existing action-lane direction while giving clear recurring forward context after payment.

Localization update:
- File: `src/lib/i18n/localization.tsx`
- Added RU translation key:
  - `"Next payment date": "Следующая дата платежа"`

## Files Touched

1. `src/lib/payments/cycle.ts`
2. `src/lib/payments/repository.ts`
3. `src/components/app/recurring-payments-section.tsx`
4. `src/lib/i18n/localization.tsx`
5. `docs/reports/phase_17C_1_recurring_cycle_visibility_fix.md` (this report)

## What Was Intentionally NOT Changed

1. No DB schema rewrite.
2. No API contract redesign.
3. No recurring backend dispatch redesign.
4. No family/premium/admin rule changes.
5. No template modernization work.
6. No broad Reminders UI rewrite beyond minimal visibility line.

## Monthly Expenses Status (Fixed/Deferred)

- Existing monthly cost visibility for subscriptions is already present (e.g. `Monthly total ...` and paused subscription savings) and was not removed in this pass.
- No new large "monthly expenses analytics" system was added in 17C.1 (intentionally deferred to avoid scope expansion).

## Verification Performed

1. Targeted logic check (local script):
- `createdAt=2026-03-28`, monthly `dueDay=16` resolves to cycle `monthly:2026-04`, `dueDate=2026-04-16`.
- Older items (created earlier month) still resolve to current month and can be overdue normally.

2. Build quality gates:
- `npm run lint` — passed.
- `npm run build` — passed.

## Manual Checklist (RU)

1. Создать monthly recurring-платёж с днём оплаты раньше текущей даты месяца.
2. Проверить, что он не становится сразу `overdue`, а нормализуется на следующую корректную дату.
3. Нажать `Mark paid` на карточке.
4. Проверить, что карточка остаётся в списке recurring как активная.
5. Проверить, что на оплаченной карточке видна строка `Следующая дата платежа`.
6. Проверить корректность `Undo paid` после изменения.
7. Проверить RU/EN на новой строке `Next payment date`.
8. Проверить, что history/журнал событий оплаты продолжает работать как раньше.
9. Проверить, что counters в Reminders/Home не выглядят ложными для нового monthly кейса.
10. Проверить отсутствие горизонтального скролла и hydration регрессий.

## Risks / Follow-up

1. Current model still stores/reads cycle state as "current cycle + state row"; this pass intentionally does not redesign cycle history model.
2. If product later needs richer forward projections (multi-cycle previews), that should be a separate bounded pass.
