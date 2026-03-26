# Phase 9C — Family shared economics foundation

## 1. Scope
В этом pass добавлен узкий economics foundation только поверх уже рабочего family shared recurring flow.

Что входило в scope:
1. Только family shared recurring payments.
2. Сохранение single-responsible модели (`Who pays`).
3. Фиксация фактического плательщика цикла (`Paid by`) при `Mark paid`.
4. Простая mismatch-подсказка, если `Paid by` != `Who pays`.
5. Отображение этого на существующих family-поверхностях (recurring, activity, dashboard, reminder visibility) без нового тяжелого subsystem.

Что не входило в scope:
- split engine;
- balances/debts полноценная система;
- settlement workflow;
- family reminder dispatch parity subsystem;
- family subscriptions parity subsystem;
- scenario migration engine;
- широкие рефакторинги.

## 2. Что изменено

### 2.1 Узкая схема для `Paid by` на уровне цикла
Добавлена колонка в `recurring_payment_cycles`:
- `paid_by_profile_id uuid nullable` + FK на `profiles(id)`.

Смысл:
- при `Mark paid` можно хранить, кто реально нажал оплату цикла;
- при `Undo paid` поле сбрасывается в `null` вместе с `paid_at`.

### 2.2 Backend: запись фактического плательщика цикла
В paid-route:
- дополнительно читается текущий app context;
- для family workspace в `setCurrentCycleStateForPayment(..., "paid", profileId)` передается actor profile id;
- для personal workspace сохраняется прежняя семантика (в `paid_by_profile_id` пишется `null`).

В repository:
- `setCurrentCycleStateForPayment` расширен параметром `paidByProfileId`;
- upsert в `recurring_payment_cycles` теперь пишет `paid_by_profile_id` для paid-состояния;
- при unpaid всегда очищает `paid_by_profile_id`.

### 2.3 Типы и payload
Протянут новый атрибут:
- `currentCycle.paidByProfileId`.

Добавлен summary-счетчик в dashboard payload:
- `paidByMismatchCount`.

### 2.4 UI: recurring card economics clarity
В family shared карточке при paid-состоянии теперь показывается:
- `Who pays` (ответственный);
- `Paid by` (фактический плательщик);
- если разные — простая economics hint:
  - кто покрыл цикл,
  - и на ком остается ответственность.
- если совпали — явная aligned-подсказка.

### 2.5 UI: family activity economics visibility
В family activity:
- для `Marked paid` событий добавлен `paid by ...`;
- при несовпадении с `who pays` показывается компактная mismatch-подсказка;
- добавлен счетчик `Paid-cycle mismatch hints`.

### 2.6 UI: family dashboard + reminder visibility coherence
Dashboard (family):
- добавлен компактный индикатор `Paid mismatch hints`.

Reminder visibility (family, read-only):
- добавлен индикатор `Paid-cycle economics mismatch hints`.

Это делает family surfaces более согласованными, не включая новую тяжелую экономическую систему.

## 3. Добавлялась ли миграция
Да, добавлена узкая миграция:
- `supabase/migrations/20260327_090000_phase9c_family_shared_economics_foundation.sql`

## 4. Exact files changed
- `supabase/migrations/20260327_090000_phase9c_family_shared_economics_foundation.sql`
- `src/lib/payments/types.ts`
- `src/lib/payments/repository.ts`
- `src/lib/payments/dashboard.ts`
- `src/app/api/payments/recurring/[paymentId]/cycle/paid/route.ts`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/reminder-candidates-section.tsx`

## 5. Риски и ограничения
1. Это только foundation: нет split/debts/balances и нет settlement workflow.
2. Mismatch-подсказка — простая read-only интерпретация по текущему циклу, не ledger и не финансовый движок.
3. Archive и Pause/Resume в family по-прежнему intentionally disabled (как требовалось).
4. Family reminder dispatch parity как отдельный subsystem не добавлялся.
5. Family subscriptions parity как отдельный subsystem не добавлялся.

## 6. Локальные проверки в этом pass
Выполнено:
1. `npm run lint` — успешно.
2. `node --test src/lib/payments/validation.test.ts` — успешно.

Живая ручная проверка двух Telegram-профилей в рамках Codex не выполнялась.

## 7. Manual test checklist (live runtime, 2 профиля)

### Подготовка
1. Оба профиля состоят в одном family workspace.
2. Оба профиля переключены в этот workspace.

### Сценарий mismatch
1. Profile A открывает shared recurring item.
2. В `Who pays` выбран Profile B.
3. Profile A нажимает `Mark paid`.
4. Проверить на обеих сторонах (A и B):
- `Who pays = Profile B`;
- `Paid by = Profile A`;
- видна mismatch economics hint.

### Сценарий aligned
1. Вернуть `Undo paid`.
2. Нажать `Mark paid` уже от Profile B (ответственного).
3. Проверить на обеих сторонах:
- `Who pays = Profile B`;
- `Paid by = Profile B`;
- mismatch hint не показывается, видна aligned-подсказка.

### Coherence checks
1. Activity: есть `Marked paid` строки с `paid by` и mismatch hint при различии.
2. Dashboard (family): `Paid mismatch hints` обновляется ожидаемо.
3. Reminder visibility (family): `Paid-cycle economics mismatch hints` обновляется ожидаемо.
4. `Undo paid` очищает paid-состояние и ведет себя согласованно для обоих профилей.

### Guardrails
1. `Archive` в family остается disabled.
2. `Pause/Resume` в family остается disabled.

## 8. Финальный статус
partially verified
