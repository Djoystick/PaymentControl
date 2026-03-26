# Phase 9C.1 — Immediate UI refresh after Mark paid / Undo paid

## 1. Scope
Узкий bugfix pass только для проблемы немедленного обновления UI на текущем клиенте после `Mark paid` / `Undo paid`.

Что НЕ делалось:
- realtime cross-profile sync;
- websocket/subscription/polling;
- изменения бизнес-логики family economics;
- расширение archive/pause/resume в family;
- широкие рефакторинги.

## 2. Root cause
Проблема была в сочетании двух факторов:

1. После paid/unpaid mutation backend возвращал payment через путь, где `paymentScope` мог приходить как default (`personal`), а не как текущий family scope.
2. UI recurring section опирался на локальный `setPayments(...result.payment)` и не делал явную revalidation списка сразу после успешной paid/unpaid операции.

Из-за этого локальное состояние карточки могло оставаться в рассинхроне до ручного refresh/reopen.

## 3. Что исправлено

### 3.1 Backend scope consistency для paid/unpaid mutation response
В cycle paid/unpaid routes теперь явно передается scope в repository:
- family workspace -> `shared`
- personal workspace -> `personal`

В repository:
- `getRecurringPaymentByWorkspaceAndId(...)` получил параметр `paymentScope`;
- `setCurrentCycleStateForPayment(...)` получил параметр `paymentScope` и возвращает payment с корректным scope.

Это убирает локальный scope-desync после кнопки.

### 3.2 Явная локальная revalidation после `Mark paid` / `Undo paid`
В recurring section после успешного paid/unpaid action добавлен `void loadPayments()`:
- карточка получает immediate local update из mutation response;
- затем выполняется безопасная revalidation списка, чтобы UI гарантированно пришел к консистентному состоянию без ручного перезапуска приложения.

## 4. Нужна ли миграция
Нет, миграция для этого bugfix не нужна.

## 5. Exact files changed
- `src/lib/payments/repository.ts`
- `src/app/api/payments/recurring/[paymentId]/cycle/paid/route.ts`
- `src/app/api/payments/recurring/[paymentId]/cycle/unpaid/route.ts`
- `src/components/app/recurring-payments-section.tsx`

## 6. Риски и ограничения
1. Фикс касается только текущего клиента, который нажал кнопку.
2. Автоматический мгновенный апдейт на втором профиле по-прежнему вне scope (как и требовалось).
3. Archive и Pause/Resume в family остаются disabled by design.
4. Бизнес-логика family economics не расширялась.

## 7. Локальные проверки
Выполнено:
1. `npm run lint` — успешно.
2. `node --test src/lib/payments/validation.test.ts` — успешно.

Живая ручная Telegram runtime-проверка в Codex не выполнялась.

## 8. Manual test checklist
На том же профиле, который нажимает кнопку:
1. Открыть shared recurring card в family workspace.
2. Нажать `Mark paid`.
3. Убедиться, что карточка сразу обновилась без refresh/reopen:
- paid state,
- `Paid by`,
- economics hint,
- кнопка стала `Undo paid`.
4. Нажать `Undo paid`.
5. Убедиться, что карточка сразу обновилась без refresh/reopen:
- unpaid state,
- `Paid by` исчез,
- economics hint исчез/сменился,
- кнопка снова `Mark paid`.
6. Проверить, что видимые локально family sections (dashboard/activity/reminder visibility) остаются согласованными.
7. Проверить, что `Archive` и `Pause/Resume` остаются disabled в family.

## 9. Финальный статус
partially verified
