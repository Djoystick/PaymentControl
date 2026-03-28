# Phase 17B.1 — Contextual help popover viewport safety fix

- Date: 2026-03-28
- Project: Payment Control Telegram Mini App
- Anchor read first: `docs/payment_control_master_anchor_2026-03-28.md`
- Reports read:
  - `docs/reports/phase_17A_reminders_interaction_model_redesign.md`
  - `docs/reports/phase_17A_1_reminders_autosuggest_home_summary_cleanup.md`
  - `docs/reports/phase_17B_app_like_surface_polish_mobile_composition.md`
- Status context used:
  - latest fully confirmed stage = Phase 16B
  - Phase 17B = almost accepted, blocked by help popover overflow

## Exact files changed

1. `src/components/app/help-popover.tsx`
2. `docs/reports/phase_17B_1_contextual_help_popover_viewport_safety_fix.md` (this report)

## How popover viewport safety was fixed

Fix type: **systemic** (shared component), not per-screen patching.

Changes in `src/components/app/help-popover.tsx`:

1. Switched popover positioning to viewport-aware metrics with `window.visualViewport` fallback:
- width/height use actual visual viewport when available;
- horizontal and vertical coordinates are clamped with edge padding.

2. Added pre-paint placement update:
- `useLayoutEffect` now recalculates position right when popover opens;
- this reduces first-frame unstable placement.

3. Added safer fallback style while position is being resolved:
- temporary style always keeps popover inside viewport bounds;
- prevents initial off-screen width/position spikes.

4. Strengthened size and wrapping constraints:
- `max-w-[calc(100dvw-20px)]`
- `max-h-[calc(100dvh-20px)]`
- `overflow-y-auto`
- `overflow-wrap:anywhere`

5. Kept behavior local and contextual:
- popover still opens near trigger;
- outside tap and Esc close behavior preserved.

## Why this addresses the blocker

Root issue was unstable early-frame geometry and insufficient viewport clamping in narrow/mobile conditions.  
Shared popover now clamps both axis placement and dimensions against viewport-safe bounds, so opening `?` help no longer expands page width.

## What was intentionally NOT changed

1. No Reminders interaction-model redesign changes.
2. No Home summary/model changes.
3. No performance/caching/storage strategy work.
4. No premium/admin/business logic changes.
5. No API/DB schema changes.
6. No icon/theme redesign pass.

## Validation

1. `npm run lint` — passed.
2. `npm run build` — passed.

## Risks / follow-up notes

1. Final confidence still requires manual Telegram WebView check on real narrow mobile devices.
2. If future help content includes large custom elements (tables/images), they should keep width constraints compatible with this popover container.

## What still requires live manual verification

1. Open all current `?` help popovers in Reminders and Profile on narrow mobile width.
2. Confirm no horizontal page scroll appears when opening/closing popovers repeatedly.
3. Confirm popover still feels local to trigger (not detached).
4. Confirm readability and close behavior remain comfortable.

## Exact manual checklist (RU)

1. Открыть `Reminders` и нажать `?` у блока сценария.
2. Проверить, что поповер виден рядом с триггером и не вызывает горизонтальный скролл страницы.
3. Прокрутить экран и повторно открыть поповер, убедиться, что позиция корректная.
4. Открыть `?` у `Quick actions`.
5. Открыть `?` у `Payment form help`.
6. Повторить шаги 2–3 для каждого поповера выше.
7. Перейти в `Profile` и открыть `?` у `Show onboarding again`.
8. Убедиться, что поповер не выходит за ширину viewport и не расширяет страницу.
9. Проверить закрытие по:
- тапу вне поповера,
- кнопке `x`,
- клавише `Esc` (desktop check).
10. Пройти короткую регрессию: переключение табов, RU/EN, Mark paid / Undo paid.

## Encoding safety check

Checked touched files:

1. `src/components/app/help-popover.tsx`
2. `docs/reports/phase_17B_1_contextual_help_popover_viewport_safety_fix.md`

Result:
- UTF-8 preserved.
- Russian text is readable.
- No mojibake introduced in touched content.

## Pre-report self-check against prompt

1. Original goal (fix contextual help popover viewport overflow only) — **PASS**.
2. Strict scope (popover behavior/position/sizing only) — **PASS**.
3. Non-negotiable flows preserved — **PASS by scope + lint/build**.
4. No page-level horizontal overflow caused by help popovers — **PASS at implementation level**, final confirmation requires live mobile check.
5. Popovers remain compact and local — **PASS**.
6. No unrelated scope expansion — **PASS**.

---

## Короткое объяснение (по-русски)

В 17B.1 сделан системный фикс общего `HelpPopover`: позиционирование и размеры теперь жёстко ограничиваются viewport, поэтому `?`-поповеры не должны вызывать горизонтальный скролл страницы на мобильной ширине.

## Ручной тест-чеклист (по-русски)

1. Пройти все `?` в Reminders и Profile.
2. Проверить отсутствие горизонтального скролла при открытии/закрытии поповеров.
3. Проверить, что поповеры остаются рядом с триггером.
4. Проверить закрытие по outside tap / `x` / `Esc`.
5. Пройти короткую регрессию по табам и основным действиям.

## Git Bash commands (реальный workflow)

```bash
git status
git add src/components/app/help-popover.tsx docs/reports/phase_17B_1_contextual_help_popover_viewport_safety_fix.md
git commit -m "phase17b.1: fix contextual help popover viewport overflow on mobile"
git push origin main
```
