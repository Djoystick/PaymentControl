# Phase 8F — Active context switching UX cleanup

## 1. Scope
В этом pass выполнен узкий UX cleanup вокруг переключения контекста personal/family.

Цель: убрать двусмысленность между `Workspace switch` и `Scenario cards`, чтобы у пользователя был один понятный источник истины для активного контекста.

Вне scope оставлено:
- invite accept flow;
- family economics/split/debts;
- family reminder parity;
- premium/localization;
- глобальный redesign;
- архитектурные refactor'ы scenario engine.

## 2. What was implemented
1. Сценарные карточки переведены в read-only presentation:
- удалены misleading CTA-кнопки `Select/Selected`;
- карточки больше не выглядят как второй независимый переключатель;
- вместо этого показывается метка `Active context` / `Not active` на основе активного workspace.

2. Добавлено явное пояснение источника истины:
- в блоке `Workspace switch` добавлен короткий текст, что именно здесь управляется активный контекст;
- explicit mapping: personal workspace = single context, family workspace = family context.

3. Добавлен информационный блок над карточками:
- `Scenario cards (read-only)`;
- короткое пояснение, что cards информационные и контекст меняется через workspace switch;
- показ profile-level scenario field как диагностического/информационного значения с пометкой про авто-синхронизацию.

4. Обновлен wording footer:
- явно указано, что переключение контекста в этой фазе workspace-driven.

5. Обновлена phase-метка блока профиля до `Phase 8F`.

## 3. What was intentionally NOT implemented
- Никакой migration/single->family data migration engine;
- никакой новый scenario engine;
- изменения recurring/subscription/reminder semantics;
- accept-invite расширения;
- новые product-фичи вне UX cleanup.

## 4. Exact files created/modified
### Modified
- `src/components/app/profile-scenarios-placeholder.tsx`

### Created
- `docs/phase8f_active_context_switching_cleanup_report.md`

## 5. Manual verification steps
1. Открыть приложение и дождаться загрузки контекста.
2. В `Workspace state` убедиться, что `Workspace switch` виден и содержит поясняющий текст про источник истины.
3. Проверить `Scenario cards`:
- нет CTA-кнопок `Select`;
- есть только метки `Active context` / `Not active`.
4. Переключить workspace personal -> family -> personal:
- активная метка на карточках должна следовать active workspace;
- контекст должен восприниматься как переключаемый только через `Workspace switch`.
5. Проверить, что остальные блоки профиля/платежей продолжают рендериться без регрессий.

## 6. Known limitations
- Profile-level `selectedScenario` поле сохранено (как и раньше), но в этой фазе не используется как отдельный пользовательский switch.
- Полноценный scenario migration/mode engine по-прежнему вне scope.

## 7. Runtime confirmation status
Что проверено в текущем окружении Codex:
- `npm run lint` — успешно.
- `npm run build` — успешно.

Что НЕ подтверждено вручную в этом pass:
- ручная runtime-проверка в браузере/Telegram (переключения personal/family глазами пользователя).
