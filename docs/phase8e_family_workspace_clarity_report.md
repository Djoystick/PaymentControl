# Phase 8E — Family workspace clarity / UX foundation

## 1. Scope
В этом pass сделан только локальный UX-проход вокруг family workspace и family/shared recurring payments.

Цель: сделать сценарий понятнее в интерфейсе без изменения доменной модели и без расширения roadmap scope.

Вне scope оставлено:
- invite accept flow;
- shared balances/debts/split;
- family reminders parity;
- family subscriptions parity;
- scenario switching;
- premium/localization;
- глобальный UI redesign;
- тяжелые рефакторинги.

## 2. What was implemented
1. Улучшена видимость текущего workspace в recurring payments секции:
- добавлена строка `Current workspace: <title> (<kind>)`.

2. Добавлен компактный family info block (только в family workspace):
- коротко объясняет, что платежи здесь shared;
- поясняет смысл `Who pays`;
- явно объясняет fallback при отсутствии назначения.

3. Улучшен UX выбора ответственного плательщика (только family):
- select обернут в понятный label `Who pays (responsible payer)`;
- fallback option заменен на читаемый `Not assigned yet`;
- убраны неаккуратные/технические формулировки в этом месте.

4. Улучшена читаемость family/shared карточек:
- badge `Shared` переименован в более явный `Family shared`;
- строка scope стала понятнее (`family workspace` / `personal workspace`);
- строка ответственности теперь читается как `Who pays: ...`;
- safe fallback для неназначенного ответственного: `Not assigned yet`;
- fallback для устаревшей ссылки на участника: `Assigned member is no longer in this family workspace`.

5. Personal mode не захламлен family copy:
- family info block и who-pays control рендерятся только при `workspace.kind === "family"`.

## 3. What was intentionally NOT implemented
- Любая новая бизнес-логика семейной экономики;
- изменения invite acceptance;
- расширение dispatch/reminder для family;
- новые migration/schema изменения;
- отдельный onboarding flow/modals.

## 4. Exact files created/modified
### Modified
- `src/components/app/recurring-payments-section.tsx`

### Created
- `docs/phase8e_family_workspace_clarity_report.md`

## 5. Manual verification steps
1. Открыть приложение и перейти в personal workspace:
- убедиться, что family info block и who-pays select не показываются.
2. Переключиться в family workspace:
- проверить, что показан family info block;
- проверить строку `Current workspace: ...`.
3. В форме create/edit recurring payment (family):
- убедиться, что есть label `Who pays (responsible payer)`;
- убедиться, что fallback option = `Not assigned yet`.
4. В списке family/shared payments:
- проверить badge `Family shared`;
- проверить строку `Who pays: ...`;
- для записи без ответственного проверить fallback `Not assigned yet`.

## 6. Known limitations
- Это только UX clarity pass, без новых семейных расчетов и распределения расходов.
- Нет новых deep onboarding flow для family.
- Если в workspace только owner, список who-pays будет минимальным (это ожидаемо для текущей фазы).

## 7. Runtime confirmation status
Что подтверждено в этом окружении Codex:
- `npm run lint` — успешно.
- `npm run build` — успешно.

Что НЕ подтверждено вручную в этом pass:
- ручная browser/Telegram проверка UX в реальном runtime после правок (не выполнялась в этом окружении).
