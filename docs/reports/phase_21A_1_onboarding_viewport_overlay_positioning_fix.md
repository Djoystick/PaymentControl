# Phase 21A.1 — Onboarding Viewport Overlay Positioning Fix

## Objective
Исправить позиционирование onboarding как корректного viewport-level overlay, чтобы карточка была полностью читаемой и доступной независимо от высоты/скролла подлежащей страницы.

## Source-of-Truth Used
- `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Текущий подтвержденный статус пользователя:
  - Phase 19B = manual verified
  - Phase 19C = manual verified
  - Phase 20B = manual verified
  - Phase 20C = manual verified
  - Phase 20D = manual verified
  - Phase 20E = manual verified
  - Phase 20F = accepted working compression pass
  - Phase 20G = manual verified
  - Phase 20H = manual verified
  - Phase 21A = implemented in code, not yet manual verified (blocked by viewport overlay bug)

## Files Changed
- `src/components/app/app-shell.tsx`
- `docs/reports/internal_version_history.md`

## Root Cause
- Onboarding overlay рендерился внутри `AppShell` контейнера, который использует `backdrop-blur`.
- Из-за этого `position: fixed` для onboarding фактически вел себя относительно shell-контейнера, а не чистого viewport.
- На экранах с дополнительной высотой/скроллом карточка оказывалась визуально «приклеенной» к нижней части и могла читаться частично.

## How Onboarding Viewport Positioning Was Fixed
1. Вынесен onboarding overlay в viewport-level portal:
- добавлен `createPortal` (`react-dom`);
- overlay теперь рендерится в `document.body`, а не внутри shell.

2. Исправлено позиционирование и безопасные отступы:
- overlay использует `fixed inset-0` в root viewport;
- добавлены safe-area top/bottom paddings для Telegram Mini App мобильных экранов.

3. Добавлен контролируемый внутренний scroll onboarding карточки:
- карточка получила `maxHeight` относительно `100dvh` с учётом safe-areas;
- включен `overflowY: auto` + `overscrollBehavior: contain`, чтобы длинный контент оставался читаемым внутри модалки, без клиппинга.

4. Стабилизирован фон при открытом onboarding:
- добавлен минимальный lock фонового scroll (`document.body` + `document.documentElement` overflow = hidden) на время открытого onboarding;
- после закрытия стили аккуратно восстанавливаются.

## What Was Intentionally NOT Changed
- Не менялись шаги onboarding, порядок шагов и тексты Phase 21A.
- Не менялась replay логика и first-run trigger логика.
- Не менялась бизнес-логика, backend/API, premium/admin/workspace rules.
- Не менялись autosuggest/RUB/help-popover и другие verified foundations.
- Не выполнялся broad refactor или общий modal framework rewrite.

## Validation Executed
- `npm run lint` — passed
- `npm run build` — passed

## Risks / Follow-up Notes
- На очень маленьких высотах viewport (редкие Telegram webview кейсы) карточка перейдет во внутренний scroll, что ожидаемо и лучше клиппинга.
- Если в будущем появятся другие полноэкранные overlay, стоит синхронизировать body-scroll-lock стратегию между ними (в этом pass не расширяли scope).

## Manual Verification Checklist (RU)
1. Открыть onboarding при first-run и убедиться, что карточка не привязана к нижней части shell/page.
2. Проверить onboarding на экранах, где underlying контент длинный: весь текст и кнопки доступны.
3. Проверить шаги `Skip / Back / Next / Finish`: все действия доступны и кликабельны.
4. Проверить replay через `Show onboarding again` в Profile: поведение overlay идентично first-run.
5. Проверить узкую Telegram Mini App ширину: нет горизонтального overflow и потери кнопок.
6. Проверить светлую/темную тему: контраст/читаемость не деградировали.
7. Проверить, что после закрытия onboarding обычный scroll приложения работает как раньше.

## Encoding Safety Check
- Изменения не затронули словари локализации и не изменяли RU-строки UI.
- Новый отчет сохранен в UTF-8.
- Mojibake в затронутых файлах не обнаружен.

## Pre-Report Self-Check Against Prompt/Scope
1. Scope соблюден: узкий viewport-overlay bugfix onboarding.
2. Цель достигнута: onboarding перенесен на viewport-level overlay и больше не зависит от позиционирования/скролла страницы.
3. Кнопки/контент onboarding остаются достижимыми благодаря внутреннему scroll и max-height.
4. Replay/first-run parity сохранена.
5. Verified flows и бизнес-правила не затронуты.
6. Валидация (`lint`, `build`) выполнена успешно.

## Manual Verification Readiness
Готово к ручной проверке (`ready for manual verification`).
