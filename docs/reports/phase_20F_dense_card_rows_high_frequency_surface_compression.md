# Phase 20F — Dense Card Rows + High-Frequency Surface Compression Pass

## Objective
Дополнительно уплотнить высокочастотные card/list row-поверхности (в первую очередь Reminders), чтобы на первом экране помещалось больше полезной рабочей информации при сохранении ясности, читаемости состояний и видимости первичных действий.

## Source-of-Truth Used
- `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Подтвержденный статус из текущего контекста пользователя:
  - Phase 19B = manual verified
  - Phase 19C = manual verified
  - Phase 20B = manual verified
  - Phase 20C = manual verified
  - Phase 20D = manual verified
  - Phase 20E = manual verified

## Files Changed
- `src/app/globals.css`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `docs/reports/internal_version_history.md`

## How Row/Card Density Was Improved
1. Reminders row compression (primary target):
- Уплотнен верхний action-lane (Quick actions): меньше вертикальная высота, компактнее summary-card блоки.
- Уплотнены reminder cards:
  - уменьшен padding карточек;
  - снижены межстрочные/межблочные интервалы;
  - tighter grouping у status pills;
  - `Who pays` / `Current cycle` переведены в более компактный `text-xs` формат.
- Уменьшена вертикальная стоимость метаданных: `Next payment date` и `Paid by` объединены в одну строку при paid-cycle в family-контексте.
- Уплотнен details/actions под-блок карточек (чипы/кнопки/отступы), при сохранении доступности вторичных действий.
- Primary action (`Mark paid` / `Undo paid`) визуально и поведенчески сохранен без деградации.

2. Home high-frequency row compression:
- Compact summary карточки (Total/Upcoming/Overdue/Monthly cost) дополнительно ужаты по min-height/padding.
- Уплотнены внутренние икон-контейнеры, подписи и числовые значения.
- Уплотнен список filtered cards (меньше вертикальный шаг).

3. History row compression:
- Уплотнены context mini-cards (In scope/Recent events/family summary).
- Уменьшены vertical gaps и row-height в activity list.
- Заголовок события + family metadata приведены к более плотной вертикальной композиции.

4. Profile top high-frequency block compression:
- В верхнем user-working блоке уменьшены вторичные текстовые вертикали.
- Language/theme/action группы переведены в более компактные wrap-строки с меньшими отступами.

5. Shared compact state chips:
- В `globals.css` слегка уплотнены `pc-state-inline` и `pc-status-pill`, чтобы в строку входило больше полезного контекста без перегрузки.

## What Was Intentionally NOT Changed
- Не менялись бизнес-правила и логика: recurring/payment generation/backend/API.
- Не менялись semantics `Mark paid / Undo paid`.
- Не менялись template rules (строгий title/name-only prefix autosuggest), RUB normalization, help popover safety.
- Не менялись premium/admin permissions boundaries.
- Не запускались onboarding redesign, navigation rewrite или broad refactor.

## Validation Executed
- `npm run lint` — passed
- `npm run build` — passed

## Risks / Follow-up Notes
- На экстремально узких/низких viewport плотные строки могут требовать тонкой подстройки текста в отдельных edge-cases длинных заголовков.
- Если после live-review потребуется следующий micro-pass, логичный шаг: точечная компрессия family-specific secondary text внутри cards при сохранении экономических подсказок.

## Manual Verification Readiness
Готово к ручной проверке (`ready for manual verification`).

## Encoding Safety Check
- Проверены затронутые UI-строки и markdown-документация: признаков mojibake нет.
- Новые/обновленные `.md` сохранены в UTF-8.
- RU/EN ключевые пользовательские строки в измененных поверхностях остались читаемыми.

## Pre-Report Self-Check Against Prompt/Scope
1. Цель Phase 20F выполнена: card-row/item layout на high-frequency поверхностях реально уплотнены.
2. Основной фокус соблюден: Reminders list/cards получили наибольший прирост плотности.
3. Home/History/Profile не перегружены и не стали визуально «крамповыми».
4. Primary actions и urgency readability сохранены.
5. Scope соблюден: только controlled UI/layout изменения, без логических/серверных правок.
6. Проверки выполнены и прошли (`lint`, `build`).
