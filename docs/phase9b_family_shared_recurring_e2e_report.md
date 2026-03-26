# Phase 9B — Family shared recurring e2e usage foundation

## 1. Scope
В этом pass сделан узкий продуктовый шаг от «family foundation + invite/join + read-only visibility» к первому реальному usage loop в family workspace.

Фокус был только на том, что уже есть в домене:
- shared recurring в family workspace;
- who pays (responsible payer);
- согласованная видимость на уже существующих family-поверхностях.

Вне scope оставлено:
- shared economics / split / debts / balances;
- отдельная family reminder parity подсистема;
- отдельная family subscriptions parity подсистема;
- scenario migration engine;
- большие архитектурные рефакторинги.

## 2. Что изменено

### 2.1 Разблокирован реальный usage-action для family shared recurring
Раньше в family workspace action `Mark paid / Undo paid` был фактически недоступен:
- на backend route был personal-only scope check;
- на UI кнопка была принудительно disabled для family.

Теперь:
- `POST /api/payments/recurring/[paymentId]/cycle/paid` принимает family workspace context;
- `POST /api/payments/recurring/[paymentId]/cycle/unpaid` принимает family workspace context;
- в family recurring cards `Mark paid / Undo paid` больше не заблокирован только из-за family-контекста.

Это дало минимальный, но практический shared usage loop:
создание/редактирование shared recurring + факт использования цикла (paid/unpaid) внутри family workspace.

### 2.2 Улучшена who-pays видимость в family Activity
В `Activity` для family workspace добавлено:
- сводка по assignment (`Who pays assigned / Not assigned`);
- в каждой activity-строке для shared item показывается `who pays ...` с безопасным fallback.

Fallback-логика:
- нет assignment -> `Not assigned yet`;
- assignment указывает на участника, которого уже нет в household -> явный безопасный текст.

### 2.3 Улучшена who-pays видимость в family Reminder visibility (read-only)
В family reminder section добавлено:
- счетчик `Who pays missing`;
- для attention items (due/overdue) строка `who pays ...` с тем же безопасным fallback.

Это делает reminder/readiness слой более согласованным с recurring cards и who-pays foundation.

### 2.4 Небольшой UX-polish в recurring section
- Badge recurring section обновлен до `Phase 9B`.
- В family-context блоке добавлена короткая явная подсказка, что в текущей фазе доступны create/edit и mark paid/undo paid для shared recurring.

## 3. Миграции
Новые миграции в этом pass **не добавлялись**.

## 4. Точные файлы, которые изменены
- `src/app/api/payments/recurring/[paymentId]/cycle/paid/route.ts`
- `src/app/api/payments/recurring/[paymentId]/cycle/unpaid/route.ts`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/reminder-candidates-section.tsx`

## 5. Проверки, которые выполнены в этом pass
Запущено локально:
1. `npm run lint` — успешно.
2. `node --test src/lib/payments/validation.test.ts` — успешно (4/4).

Важно: живая двухпрофильная Telegram runtime-проверка в рамках этого pass из Codex не выполнялась.

## 6. Риски и ограничения
1. Это foundation pass, не полный family economics:
- нет split/debts/balances.

2. Family reminders остаются read-only visibility слоем:
- отдельная family dispatch parity подсистема не внедрялась.

3. Family subscriptions parity как отдельная подсистема не внедрялась.

4. В family recurring actions по-прежнему намеренно ограничены некоторые кнопки (archive/pause/resume), чтобы не расширять scope этого шага.

5. Source-of-truth anchor:
- в проекте актуальный anchor найден по пути `docs/payment_control_full_migration_anchor_post_live_family_2026-03-26.md`.
- файла с тем же именем в корне репозитория в этом pass не обнаружено.

## 7. Чеклист ручной проверки (два реальных Telegram-профиля)

### Подготовка
1. Убедиться, что оба профиля состоят в одном family workspace (после invite accept).
2. На обоих профилях переключиться в этот же family workspace через Workspace switch.

### Сценарий A (Profile A)
1. В family recurring section создать shared recurring payment.
2. Выбрать `Who pays` (например, Profile B) и сохранить.
3. Проверить на карточке:
- badge `Family shared`;
- строку `Who pays: ...`.
4. Нажать `Mark paid` на карточке.

### Сценарий B (Profile B)
1. Открыть тот же family workspace.
2. Нажать `Refresh` в recurring section.
3. Проверить, что этот же shared payment виден.
4. Проверить, что `Who pays` отображается согласованно.
5. Проверить, что current cycle state отражает `paid`.
6. Нажать `Undo paid` (если нужно для обратной проверки).

### Проверка Home/visibility coherence
1. Dashboard (оба профиля):
- shared item влияет на due/upcoming/overdue/paid/unpaid счетчики согласованно.
2. Activity (оба профиля):
- есть осмысленные recent items по shared payment;
- в family activity строках видно `who pays ...`.
3. Reminder visibility (оба профиля):
- shared item учитывается в family reminder visibility;
- в attention list видно `who pays ...`;
- счетчик `Who pays missing` меняется ожидаемо при assignment/unassignment.

## 8. Финальный статус
partially verified
