# Phase 21A — Onboarding Overhaul on Stabilized UI System

## Objective
Пересобрать onboarding под текущую зрелую UI-систему и актуальную продуктовую модель: сделать сценарий короче, action-first, понятным с первого экрана и полезным как при first-run, так и при replay, без изменения бизнес-логики.

## Source-of-Truth Used
- `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Подтвержденный статус из текущего контекста пользователя:
  - Phase 19B = manual verified
  - Phase 19C = manual verified
  - Phase 20B = manual verified
  - Phase 20C = manual verified
  - Phase 20D = manual verified
  - Phase 20E = manual verified
  - Phase 20F = accepted working compression pass
  - Phase 20G = manual verified
  - Phase 20H = manual verified

## Files Changed
- `src/components/app/app-shell.tsx`
- `src/lib/i18n/localization.tsx`
- `docs/reports/internal_version_history.md`

## How Onboarding Was Restructured
1. Сокращен и перестроен шаговый сценарий onboarding:
- было 5 шагов с частично устаревшей и избыточной подачей;
- стало 4 шага с action-first порядком и более строгим фокусом:
  - старт с Reminders (первое действие),
  - роль Home как компактного snapshot,
  - роль History как подтверждения изменений,
  - роль Profile как контекста workspace/language/family.

2. Обновлена структура иерархии onboarding-карточки:
- модалка приведена к текущим shared-примитивам (`pc-surface`, `pc-state-card`, `pc-btn-*`, `pc-status-pill`);
- добавлен явный контекст шага через иконку и название текущей вкладки;
- прогресс шага перенесен в верхний статус-pill для более быстрого считывания;
- bullets оформлены как компактные state-row элементы вместо длинного “- list”.

3. Сохранены текущие first-run/replay механики:
- ключ storage (`ONBOARDING_STORAGE_KEY`) не менялся;
- replay по `ONBOARDING_REPLAY_EVENT` не менялся;
- автопереход на соответствующую вкладку для шага сохранен.

## How Copy/Flow Was Shortened and Aligned to Current Product
- Убраны повторяющиеся и перегруженные пояснения.
- Сценарий опирается на текущую модель приложения:
  - “что делать сначала” = Reminders;
  - “где смотреть сводку” = Home;
  - “где проверять изменения” = History;
  - “где управлять контекстом (workspace/language/family)” = Profile.
- Добавлена короткая связка с contextual help:
  - `Use ? help on each screen when details are needed.`
  - локализовано в RU.

## What Was Intentionally NOT Changed
- Не менялась бизнес-логика, recurring/payment generation, backend/API.
- Не менялись Mark paid / Undo paid, template autosuggest rules, RUB defaults.
- Не менялись premium/admin permissions/boundaries.
- Не менялась навигационная архитектура.
- Не менялась логика first-run детекции и replay-триггера.
- Не выполнялся broad refactor и не добавлялись новые feature-флоу.

## Validation Executed
- `npm run lint` — passed
- `npm run build` — passed

## Risks / Follow-up Notes
- Нужна live-проверка “true first-run” на полностью чистом Telegram окружении (это отдельный операционный check, replay не является доказательством true first-run).
- В future pass можно добавить микро-улучшение: один компактный CTA “Открыть Напоминания” прямо из onboarding-футера на ранних шагах, если в live-review подтвердится польза без лишнего шума.

## Manual Verification Checklist (RU)
1. Открыть приложение в “чистом” состоянии (или выполнить replay из Profile) и проверить, что onboarding показывает 4 шага.
2. Проверить порядок шагов: Reminders -> Home -> History -> Profile.
3. Убедиться, что на каждом шаге активируется соответствующая вкладка.
4. Проверить кнопки `Skip`, `Back`, `Next`, `Finish`.
5. Проверить, что после `Finish` onboarding закрывается и повторно не показывается автоматически в текущем storage-состоянии.
6. Нажать `Show onboarding again` в Profile и убедиться, что replay работает корректно.
7. Проверить RU/EN переключение: заголовки/описания/bullets onboarding отображаются корректно в обеих локалях.
8. Проверить светлую и темную тему: читаемость карточки, статус-pill и кнопок.
9. Проверить узкую ширину Telegram Mini App: нет горизонтального overflow, кнопки остаются доступными.

## Encoding Safety Check
- Все измененные/добавленные файлы сохранены в UTF-8.
- Добавленная RU-локализация для нового onboarding-ключа читается корректно.
- Моджибейк в новых правках не обнаружен.

## Pre-Report Self-Check Against Prompt/Scope
1. Цель pass выполнена: onboarding перестроен под текущую стабильную UI-систему и action hierarchy.
2. Scope соблюден: изменения только в onboarding UI/контенте + локализация + internal history.
3. Нон-неготиэйбл ограничения соблюдены: бизнес-логика и verified flows не затронуты.
4. Replay path сохранен и не деградирован.
5. Onboarding стал короче, точнее и ближе к реальным текущим поверхностям Home/Reminders/History/Profile.
6. Валидация выполнена успешно (`lint`, `build`).

## Manual Verification Readiness
Готово к ручной проверке (`ready for manual verification`).
