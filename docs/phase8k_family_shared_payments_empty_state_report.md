# Phase 8K — Family shared payments empty state / first-step guidance

## 1. Scope
В этом pass добавлен узкий first-step guidance слой для family recurring payments в сценарии, когда shared payments еще не созданы.

Цель: в family workspace с `Shared payments = 0` пользователь сразу понимает, что делать дальше, без перегруженного onboarding.

Вне scope оставлено:
- invite/business логика;
- member actions;
- shared economics/split/debts;
- family reminder/subscription parity;
- scenario engine;
- premium/localization;
- глобальный redesign.

## 2. What was implemented
1. В `Recurring Payments` секции добавлен новый family-only empty-state блок `First shared payment`.

2. Блок показывается только когда одновременно выполняется:
- active context = family workspace;
- payments уже загружены (`!isLoading`);
- `sharedRecurringPaymentsCount === 0`.

3. В guidance коротко и понятно объясняется:
- shared recurring payments создаются в текущем family workspace;
- responsible payer выбирается из household members;
- начать можно сразу через уже существующие Quick Add templates и create form ниже.

4. Если shared payments уже есть, блок не показывается (экран не перегружается).

5. Personal context не получает этот блок (family-only rendering).

6. Обновлена phase-метка recurring payments до `Phase 8K`.

## 3. What was intentionally NOT implemented
- Новые flow/навигация/onboarding wizard;
- backend/domain изменения;
- migrations;
- изменения invite accept semantics;
- любые новые family economics features.

## 4. Exact files created/modified
### Modified
- `src/components/app/recurring-payments-section.tsx`

### Created
- `docs/phase8k_family_shared_payments_empty_state_report.md`

## 5. Manual verification steps
1. Переключиться в personal workspace:
- убедиться, что блока `First shared payment` нет.
2. Переключиться в family workspace с `Shared payments = 0`:
- убедиться, что блок `First shared payment` отображается.
3. Создать первый shared recurring payment:
- убедиться, что guidance блок исчезает после появления shared payment.
4. Проверить, что existing элементы продолжают работать:
- who-pays selector;
- household members block;
- family snapshot.

## 6. Known limitations
- Это только UI guidance, без новых действий и без изменения бизнес-логики.
- Guidance не заменяет полноценный onboarding flow (и не должен).

## 7. Runtime confirmation status
Что проверено в текущем окружении Codex:
- `npm run lint` — успешно.
- `npm run build` — успешно.

Что НЕ подтверждено вручную в этом pass:
- ручная runtime-проверка UI в браузере/Telegram для сценария `Shared payments = 0`.
