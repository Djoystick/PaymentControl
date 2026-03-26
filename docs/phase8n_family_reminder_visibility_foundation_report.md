# Phase 8N — Family reminder visibility / read-only readiness foundation

## 1. Scope
В этом pass сделан узкий context-aware cleanup для reminder section:
- personal reminder flow сохранен;
- для family workspace добавлен отдельный read-only visibility слой.

Цель: убрать personal-only ощущение в family контексте без запуска полноценной family reminder parity.

Вне scope оставлено:
- новый family dispatch/delivery subsystem;
- cron/scheduler расширения;
- invite/member/business logic изменения;
- migrations/backend refactor.

## 2. What was implemented
1. Reminder section сделан context-aware по `workspace.kind`.

2. Для `family` добавлен read-only блок `Family reminder visibility (read-only)`:
- явное пояснение, что это обзор по shared payments текущего family workspace;
- честное пояснение, что delivery/testing actions остаются в personal reminder flow.

3. Добавлены простые family indicators на базе уже доступных данных (`listRecurringPayments`):
- shared active payments;
- reminders on;
- reminders off;
- due today (unpaid);
- overdue (unpaid).

4. Добавлен аккуратный family early-state:
- если shared payments нет — понятный first-step текст;
- если shared payments есть, но reminders везде off — отдельный спокойный текст;
- если есть внимание-требующие позиции, показывается короткий список top items.

5. Добавлена family-only кнопка обновления:
- `Refresh family reminder visibility`.

6. Personal reminder surface сохранен:
- существующие readiness, onboarding, verify binding, run dispatch, test send и recent attempts для personal не удалялись.

7. Обновлен phase badge reminder section:
- `Phase 6F` → `Phase 8N`.

## 3. What was intentionally NOT implemented
- Полноценный family dispatch path;
- Telegram delivery parity для family;
- новые API endpoints;
- migrations;
- изменения who-pays / household / family dashboard логики.

## 4. Exact files created/modified
### Modified
- `src/components/app/reminder-candidates-section.tsx`

### Created
- `docs/phase8n_family_reminder_visibility_foundation_report.md`

## 5. Manual verification steps
1. Переключиться в personal workspace:
- убедиться, что reminder section показывает привычный personal flow (readiness/dispatch/test send).

2. Переключиться в family workspace:
- убедиться, что показывается `Family reminder visibility (read-only)`;
- personal delivery controls не должны показываться.

3. Family early states:
- при `shared payments = 0` — показать понятный empty state;
- при `shared payments > 0`, но reminders off везде — показать соответствующий текст.

4. Family visibility counters:
- проверить, что счетчики reminders on/off и due/overdue реагируют на фактические shared payments.

## 6. Known limitations
- Это read-only visibility foundation, не family reminder parity.
- Family dispatch/test-send в этом pass специально не добавлялись.

## 7. Runtime confirmation status
Что подтверждено в среде Codex:
- `npm run lint` — успешно.
- `npm run build` — успешно.

Что НЕ подтверждено вручную в этом pass:
- ручная runtime-проверка personal/family reminder UI в браузере/Telegram.
