# Phase 8L — Family recurring UX polish bundle

## 1. Scope
В этом pass выполнен пакетный, но узкий UI-only polish вокруг уже существующих family recurring surfaces.

Цель: сделать family recurring experience более цельным по wording, иерархии и early-state подаче без изменений backend/domain.

Вне scope оставлено:
- migrations и любые backend/API/domain изменения;
- расширение invite/accept логики;
- member actions, role editing, owner transfer;
- shared economics/split/debts;
- family reminder/subscription parity;
- scenario engine;
- premium/localization;
- глобальный redesign.

## 2. What was implemented
1. Нормализован family wording в recurring и связанных family surfaces:
- phase badge обновлен до `Phase 8L`;
- заголовки family-блоков приведены к более единому стилю:
  - `Family shared payments context`,
  - `Family readiness snapshot`,
  - `Household members for who pays`,
  - `Start with first shared payment`.
- в family invite management copy (profile/workspace surface) формулировки выровнены под ту же household-терминологию.

2. Улучшена визуальная и смысловая иерархия family recurring section:
- family-блоки выстроены в более логичный порядок сверху вниз:
  - контекст,
  - snapshot,
  - household members,
  - first-step guidance (когда shared = 0),
  - quick add шаблоны.

3. Подчищена ясность shared payment cards:
- добавлена более читабельная context-строка (`Family shared payment` / `Personal payment`);
- presentation `Family shared` + `Who pays` оставлен компактным и согласованным;
- fallback для неназначенного плательщика сохранен как безопасный и явный (`Not assigned yet`).

4. Приведены к согласованности early/empty состояния:
- guidance для первого shared платежа показывается только в релевантном family zero-state;
- текст guidance учитывает наличие invite:
  - если invite уже есть — акцент на добавление первого shared recurring payment;
  - если invite еще нет — акцент на том, что можно начать с платежа и пригласить позже.
- убран лишний повторяющийся текст про отсутствие invite в snapshot-блоке.

5. Поддержана чистота personal context:
- family-specific guidance/блоки не рендерятся в personal workspace;
- personal recurring flow не получил дополнительного family clutter.

## 3. What was intentionally NOT implemented
- Любые изменения бизнес-логики, persistence и API;
- новые действия на карточках;
- новый onboarding flow;
- новый family dashboard/admin center;
- расширение scope invite engine.

## 4. Exact files created/modified
### Modified
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`

### Created
- `docs/phase8l_family_recurring_ux_polish_bundle_report.md`

## 5. Manual verification steps
1. Переключиться в personal workspace:
- убедиться, что family-only блоки (context/snapshot/household/first-step) не отображаются.

2. Переключиться в family workspace:
- убедиться, что family-блоки идут в логичном порядке:
  context → snapshot → household → first-step (если shared=0) → quick add.

3. Проверить два early-state сценария при `Shared payments = 0`:
- с активным invite;
- без активного invite.
Убедиться, что текст guidance не противоречит состоянию.

4. Создать shared payment и проверить карточку:
- есть marker `Family shared`;
- `Who pays` читается понятно;
- при отсутствии ответственного показывается безопасный fallback.

5. Вернуться в personal workspace и проверить, что personal recurring UX остался чистым.

## 6. Known limitations
- Это только UI polish pass, без backend/domain изменений.
- Family ветка по-прежнему foundation-level, без shared economics и без расширенного invite manager.

## 7. Runtime confirmation status
Что подтверждено в текущем окружении Codex:
- `npm run lint` — успешно.
- `npm run build` — успешно.

Что не подтверждено вручную в этом pass:
- ручная runtime-проверка UI в браузере/Telegram после изменений Phase 8L.
