# Phase 20G — Honest Viewport Fit + Scroll Behavior Correction Pass

## Objective
Исправить viewport/scroll поведение по честному правилу: сохранять no-scroll/near-zero-scroll только там, где экран реально комфортно влезает, и возвращать естественный scroll там, где контент объективно длиннее первого экрана.

## Source-of-Truth Used
- `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Подтвержденный статус из текущего контекста пользователя:
  - Phase 19B = manual verified
  - Phase 19C = manual verified
  - Phase 20B = manual verified
  - Phase 20C = manual verified
  - Phase 20D = manual verified
  - Phase 20E = manual verified
  - Phase 20F = accepted as working compression pass

## Files Changed
- `src/components/app/app-shell.tsx`
- `docs/reports/internal_version_history.md`

## What Scroll/Viewport Behavior Was Corrected
1. Shell scroll strategy correction:
- Удален принудительный внутренний scroll-контур `main` (`overflow-y-auto` + `overscroll-contain`).
- Возвращен естественный page-level scroll для длинных экранов.
- Снято жесткое ограничение высоты shell-контейнера (`h[...]`), заменено на `min-h[...]`, чтобы контент мог честно расширяться при необходимости.

2. Honest fit behavior after correction:
- Для коротких/средних поверхностей (типичный Home и часть Reminders состояний) интерфейс остается компактным и near-zero-scroll за счет уже выполненной компрессии 20E/20F.
- Для длинных поверхностей (длинные списки Reminders/History/Profile) возвращен естественный непринудительный scroll без искусственного «запирания» внутри вложенного контейнера.

3. Nested-scroll avoidance:
- Убрано доминирующее nested-scroll поведение в главной рабочей зоне shell.
- Основная прокрутка снова происходит предсказуемо и нативно для мобильного сценария.

## Where No-Scroll Was Kept vs Natural Scroll Restored
- Kept (when it honestly fits):
  - компактные состояния Home/Reminders с ограниченным числом видимых блоков.
  - общий first-screen compact rhythm из 20E/20F.
- Restored (when it does not honestly fit):
  - длинные списки/карточные ленты в Reminders/History/Profile.
  - сценарии, где раньше появлялась искусственная внутренняя прокрутка main-контейнера.

## What Was Intentionally NOT Changed
- Не менялась бизнес-логика, recurring/payment generation, backend/API.
- Не менялись правила Mark paid / Undo paid, autosuggest, RUB defaults, help popover behavior.
- Не менялись premium/admin/family permissions и navigation architecture.
- Не выполнялся новый визуальный редизайн или broad refactor.

## Validation Executed
- `npm run lint` — passed
- `npm run build` — passed

## Risks / Follow-up Notes
- На некоторых устройствах с экстремально маленькой высотой viewport ручная проверка должна подтвердить, что sticky tab bar не создает субъективного ощущения «перекрытия» контента.
- Если выявятся единичные edge-case, следующий безопасный micro-pass: точечная настройка нижнего отступа контента в конкретных экранах без возврата к forced inner-scroll.

## Manual Verification Readiness
Готово к ручной проверке (`ready for manual verification`).

## Encoding Safety Check
- Изменения в коде не затрагивали RU/EN словари и не вводили риск mojibake.
- Новый markdown-отчет сохранен в UTF-8.

## Pre-Report Self-Check Against Prompt/Scope
1. Главная цель выполнена: убран fake no-scroll подход, восстановлен честный natural scroll для длинного контента.
2. Сохранена компактность и first-screen utility там, где экран реально помещается.
3. Scope соблюден: минимальный локальный UI/layout fix, без изменения продуктовой логики.
4. Проверки выполнены и успешно пройдены (`lint`, `build`).
