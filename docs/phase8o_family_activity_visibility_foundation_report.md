# Phase 8O — Family activity visibility / read-only timeline foundation

## 1. Scope
В этом pass добавлен узкий context-aware Activity surface для Home-экрана.

Цель: в family workspace показывать понятную read-only активность по shared payments текущего workspace, без запуска отдельной history/audit системы.

Вне scope оставлено:
- новый audit/history engine;
- backend/domain refactor;
- migrations/API расширение;
- invite/member/business logic изменения;
- family dispatch parity.

## 2. What was implemented
1. Добавлен новый UI-блок `Activity` как read-only section.

2. Activity сделана context-aware по текущему workspace:
- `personal`: personal read-only wording;
- `family`: family read-only wording с явным указанием, что это shared activity текущего family workspace.

3. Источник данных — уже существующий дешёвый path:
- используется `listRecurringPayments` (без новых endpoints/моделей).

4. Сформирован лёгкий recent activity timeline из доступных полей:
- Created (`createdAt`);
- Updated / Archived (`updatedAt` + `status`);
- Marked paid (`currentCycle.paidAt`).

5. Добавлены аккуратные family empty/early states:
- если shared payments нет — понятный family empty state;
- если payments есть, но recent events нет — спокойный fallback.

6. Добавлена простая summary строка:
- payments in scope;
- recent items shown.

7. Секция подключена в основной экран рядом с текущими Dashboard/Reminder/Recurring секциями.

## 3. What was intentionally NOT implemented
- Полноценная audit/history подсистема;
- event sourcing;
- новые действия в Activity;
- фильтры/поиск/management в Activity;
- backend/migration изменения.

## 4. Exact files created/modified
### Created
- `src/components/app/payments-activity-section.tsx`
- `docs/phase8o_family_activity_visibility_foundation_report.md`

### Modified
- `src/components/app/profile-scenarios-placeholder.tsx`

## 5. Manual verification steps
1. Открыть personal workspace:
- убедиться, что Activity показывает personal read-only wording и recent items personal context.

2. Переключиться в family workspace:
- убедиться, что Activity показывает family read-only wording;
- элементы должны читаться как shared activity текущего family workspace.

3. Проверить early/empty states:
- family workspace без shared payments;
- workspace с payments, но без заметных recent events.

4. Сделать изменение платежа (create/update/mark paid) и нажать `Refresh activity`:
- убедиться, что timeline обновляется.

## 6. Known limitations
- Это foundation-level read-only timeline, не полноценный журнал событий.
- События выводятся из текущих payment полей, без отдельной persist-истории.

## 7. Runtime confirmation status
Что подтверждено в среде Codex:
- `npm run lint` — успешно.
- `npm run build` — успешно.

Что НЕ подтверждено вручную в этом pass:
- ручная runtime-проверка personal/family Activity UI в браузере/Telegram.
