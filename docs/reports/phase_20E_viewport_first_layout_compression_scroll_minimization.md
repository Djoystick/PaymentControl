# Phase 20E — Viewport-First Layout Compression + Scroll Minimization Pass

## Objective
Снизить вертикальное давление скролла и приблизить основные пользовательские поверхности к zero-scroll / near-zero-scroll первому экрану в типичном мобильном viewport Telegram Mini App, без изменения бизнес-логики и проверенных потоков.

## Source Of Truth Used
- `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Подтвержденный статус из текущего контекста пользователя:
  - Phase 19B = manual verified
  - Phase 19C = manual verified
  - Phase 20B = manual verified
  - Phase 20C = manual verified
  - Phase 20D = manual verified

## Files Changed
- `src/app/globals.css`
- `src/components/app/app-shell.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `docs/reports/internal_version_history.md`

## What Was Changed (Viewport Compression)
1. Shell-level viewport discipline (`app-shell.tsx`):
- Уменьшены внешние и внутренние отступы контейнера shell.
- Уменьшены высоты/паддинги верхней панели и tab bar.
- Основная зона экрана переведена в более компактный внутренний scroll-контур (`main` с `overflow-y-auto`, `overscroll-contain`) для снижения page-level прокрутки и более app-like поведения.
- Снижен вертикальный gap между экранными секциями внутри активного таба.

2. Shared primitive compression (`globals.css`):
- Снижены дефолтные размеры `pc-surface`, `pc-detail-surface`, `pc-state-card`, `pc-empty-state`.
- Уменьшены min-height и padding у `pc-btn-primary`, `pc-btn-secondary`, `pc-btn-quiet`.
- Уплотнены `pc-segmented` и `pc-segment-btn`.
- Изменения сделаны системно, чтобы все табы получили одинаковый выигрыш по высоте.

3. Home compression (`landing-screen.tsx`, `payments-dashboard-section.tsx`):
- Уменьшены вертикальные интервалы в hero-блоке Home.
- Снижена высота summary-карточек в compact snapshot.
- Убрана лишняя постоянная вспомогательная строка в summary-зоне.
- Уменьшены интервалы между snapshot-блоками, drill-down блоком и refresh-зоной.

4. Reminders compression (`recurring-payments-section.tsx`):
- Уплотнены верхние блоки (заголовок, workspace/context lane, action lane).
- Снижены отступы в list lane и внутри reminder cards.
- Уплотнен details/actions под-блок карточек.
- Сохранена доминанта основного действия и видимость actionable lane.

5. History compression (`payments-activity-section.tsx`):
- Уменьшены отступы в header/context/list/refresh зонах.
- Уплотнены activity items для меньшей высоты ленты при сохранении читаемости.

6. Profile compression (`profile-scenarios-placeholder.tsx`):
- Уменьшены межсекционные интервалы для всех tab wrappers.
- Объединены верхние `Profile` + `Quick start` в один surface (убран отдельный лишний блок).
- Уменьшены отдельные крупные отступы в workspace-related зонах.

7. Internal history update:
- Добавлен Phase 20E как `implemented (code/report), pending manual verification`.
- Статус Phase 20D обновлен до `manual verification completed by user`.

## How Scrolling Pressure Was Reduced
- Убрана часть «пустой» вертикали в shell (верх/низ/межблочные интервалы).
- Снижена высота ключевых поверхностей и карточек через shared primitives.
- Снижена высота первых экранов Home/Reminders/History/Profile за счет системного уплотнения, а не логических изменений.
- Усилен viewport-first паттерн: first meaningful content и main action появляются раньше в видимой области.

## What Was Intentionally NOT Changed
- Не изменялась бизнес-логика платежей, recurring-цикла, template model, backend/API.
- Не менялись правила premium/admin/family/workspace.
- Не трогались Mark paid / Undo paid semantics.
- Не менялись строгие правила autosuggest (title-only/prefix-only), RUB normalization, help-popover safety.
- Не запускался onboarding redesign.

## Validation Executed
- `npm run lint` — passed
- `npm run build` — passed

## Risks / Follow-up Notes
- На очень коротких viewport и длинных списках абсолютный no-scroll физически недостижим; pass оптимизирует first-screen и снижает общую высоту по умолчанию.
- Следующий возможный узкий шаг (если потребуется после live-check): точечная компрессия отдельных card rows на Reminders для сверхплотных наборов данных без потери читаемости.

## Manual Verification Readiness
Готово к ручной проверке (`ready for manual verification`).

## Encoding Safety Check
- Проверены затронутые файлы pass-а: русскоязычные строки и существующие локализационные ключи сохранены без mojibake.
- Новая документация сохранена в UTF-8.

## Pre-Report Self-Check Against Prompt/Scope
1. Цель pass-а (viewport-first compression + scroll minimization) выполнена на shell + Home/Reminders/History/Profile.
2. Scope соблюден: изменения локальные UI/layout/system, без логических/серверных правок.
3. Non-negotiable foundations не затронуты (проверено по коду и сборке).
4. Проверки выполнены (`lint`, `build`), регрессов компиляции нет.
5. Результат ближе к app-like модели с меньшим вертикальным давлением и более быстрым first-screen доступом к ключевым действиям.
