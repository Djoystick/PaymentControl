# Phase 17A.1 — Reminders autosuggest refinement + home summary upgrade + user-surface cleanup

- Date: 2026-03-28
- Project: Payment Control Telegram Mini App
- Anchor read first: `docs/payment_control_master_anchor_2026-03-28.md`
- Previous report read: `docs/reports/phase_17A_reminders_interaction_model_redesign.md`

## Exact files changed

1. `src/components/app/recurring-payments-section.tsx`
2. `src/components/app/payments-dashboard-section.tsx`
3. `src/lib/i18n/localization.tsx`
4. `docs/reports/phase_17A_1_reminders_autosuggest_home_summary_cleanup.md` (this report)

## What was changed

### 1) Reminders user-surface cleanup

Implemented in `src/components/app/recurring-payments-section.tsx`:

- Removed the operational/diagnostic block from Reminders main user flow:
  - removed reminder operations visibility panel and embedded `ReminderCandidatesSection` from normal Reminders surface.
- Removed `Setup and templates` top toggle button from the visible action lane.
- Kept action lane focused on quick daily flow and payment cards.

Result: normal Reminders view no longer exposes operational delivery diagnostics in the main user-facing surface.

### 2) Reminders action entry simplification

Implemented in `src/components/app/recurring-payments-section.tsx`:

- Quick actions now keep only main action entry:
  - `Open payment form` (`Открыть форму платежа` in RU).
- Removed extra action clutter from the quick-action row.

### 3) Template autosuggest refinement

Implemented in `src/components/app/recurring-payments-section.tsx`:

- Suggestions are now rendered as a floating overlay anchored to title input:
  - absolute positioned dropdown (`absolute inset-x-0 top-full ... z-30`),
  - does not push page layout down,
  - does not increase page height for suggestion rendering.
- Matching logic changed from substring to prefix:
  - before: `includes(query)`
  - now: `title.toLocaleLowerCase().startsWith(query)`
- Suggestions close immediately after selecting a template:
  - added local state `isTemplateSuggestionsOpen`,
  - on template apply: set to `false`,
  - on next user typing: set to `true` again.

Preserved behavior:

- scenario-specific pool remains unchanged (`family` vs `personal`),
- system templates still localized via `tr(...)`,
- user templates still used exactly as saved.

### 4) Default currency changed to RUB

Implemented in `src/components/app/recurring-payments-section.tsx`:

- default form currency changed from `USD` to `RUB` in `createDefaultForm()`.
- currency placeholder updated to `Currency (RUB)`.

Localization update in `src/lib/i18n/localization.tsx`:

- added RU mapping for `Currency (RUB)`.

### 5) Home summary upgrade

Implemented in `src/components/app/payments-dashboard-section.tsx` (compact variant used on Home):

- Added stronger summary cards:
  - `Total` (active recurring count),
  - `Upcoming` (soon),
  - `Overdue`,
  - `Monthly payment cost` (aggregated monthly equivalent by currency).
- Monthly cost computation:
  - loaded active recurring payments via existing `listRecurringPayments`,
  - weekly cadence converted using `52/12`,
  - totals grouped by currency.

### 6) Home summary drill-down filtering

Implemented in `src/components/app/payments-dashboard-section.tsx`:

- Added compact summary filter state: `none | all | upcoming | overdue`.
- Tapping summary cards now activates drill-down mode:
  - `Upcoming` shows only upcoming cards,
  - `Overdue` shows only overdue cards,
  - `Total` shows all active recurring cards.
- In active drill-down state:
  - only the selected segment cards are rendered,
  - non-selected card groups are hidden.
- Outside explicit summary action (`filter = none`):
  - previous normal compact behavior remains (regular details block).

## Localization updates

In `src/lib/i18n/localization.tsx` added RU translations for new/updated keys:

- `Open payment form for new entries.`
- `Monthly payment cost`
- `Filtered by`
- `No matching cards in this segment.`
- `Currency (RUB)`

## Intentionally NOT changed

- No backend logic redesign.
- No DB schema/migration changes.
- No premium/admin flow changes.
- No bug report flow changes.
- No history redesign.
- No template management feature expansion beyond requested autosuggest behavior.
- No broad Reminders or global UI rewrite outside this scope.

## Validation run

- `npm run lint` — passed.
- `npm run build` — passed.

## Risks / follow-up notes

1. Home monthly total currently includes active recurring items and uses weekly-to-monthly conversion `52/12`, grouped by currency (no FX conversion).
2. Drill-down currently implemented inside Home compact dashboard block, not as cross-tab navigation. This matches requested practical behavior without expanding scope.
3. Reminders diagnostics block was removed from normal Reminders surface; if support-only access is required later, it should be reintroduced in a dedicated advanced/support context outside the main daily user lane.

## What still requires live manual verification

1. Visual check in real Telegram WebView that autosuggest overlay does not shift layout.
2. Mobile tap ergonomics for summary drill-down cards on Home.
3. Family/personal scenario template separation after workspace switching.
4. End-to-end quick create flow with RUB default in real user context.

## Exact manual checklist (RU)

1. Открыть `Reminders` и убедиться, что на обычной поверхности больше нет блока операционной диагностики/доставки.
2. Проверить, что в блоке быстрых действий осталась только основная кнопка `Открыть форму платежа`.
3. Нажать `Открыть форму платежа`, начать ввод названия в поле `Название платежа`.
4. Убедиться, что подсказки шаблонов показываются поверх контента (floating overlay), а не сдвигают страницу вниз.
5. Проверить, что матчинг идет по префиксу названия (startsWith), а не по произвольному вхождению.
6. Выбрать подсказку и убедиться, что список подсказок сразу закрывается.
7. Проверить, что в новом пустом платеже валюта по умолчанию — `RUB`.
8. Открыть `Home` и проверить наличие расширенной сводки:
   - `Всего`
   - `Скоро`
   - `Просрочено`
   - `Общая месячная стоимость`
9. Нажать `Скоро` и убедиться, что отображаются только карточки сегмента `Скоро`.
10. Нажать `Просрочено` и убедиться, что отображаются только карточки сегмента `Просрочено`.
11. Сбросить фильтр (повторным тапом/переключением) и убедиться, что обычное поведение Home восстановлено.
12. Пройти регрессию:
   - Mark paid / Undo paid
   - RU/EN switching + persistence
   - workspace switching
   - family shared flow (`Who pays` / `Paid by`)
   - bug report flow

## Encoding safety check

Checked all touched files for UTF-8 safety and Cyrillic readability:

- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/lib/i18n/localization.tsx`
- `docs/reports/phase_17A_1_reminders_autosuggest_home_summary_cleanup.md`

Result:

- UTF-8 preserved.
- No mojibake/garbled Cyrillic detected in touched content.

## Pre-report self-check against prompt

1. Reminders no longer shows operational diagnostics on normal user surface — **PASS**.
2. Only main entry action kept (`Open payment form`) — **PASS**.
3. Autosuggest shown as overlay without layout push — **PASS (implemented via absolute floating panel)**.
4. Matching switched to title prefix — **PASS**.
5. Suggestions dismissed after select — **PASS**.
6. Default currency is RUB — **PASS**.
7. Home upgraded with required summary statistics — **PASS**.
8. Summary tap drill-down shows only relevant subset — **PASS**.
9. Verified core flows preserved by scope and regression-safe changes — **PASS (manual live check still required)**.
10. No unrelated feature scope added — **PASS**.

---

## Короткое объяснение (по-русски)

В этой фазе `Reminders` очищен от пользовательски лишнего operational-блока, оставлен единый вход в форму, автоподсказки шаблонов сделаны плавающими и префиксными, а Home получил полезную сводку и drill-down по сегментам карточек.

## Ручной чеклист (по-русски)

1. Проверить чистый user-surface в Reminders без diagnostics-блока.
2. Проверить, что основной вход — только `Открыть форму платежа`.
3. Проверить floating autosuggest без сдвига layout.
4. Проверить префиксный матчинг и закрытие подсказок после выбора.
5. Проверить RUB по умолчанию в новой форме.
6. Проверить Home-метрики (`Всего`, `Скоро`, `Просрочено`, `Общая месячная стоимость`).
7. Проверить drill-down фильтрацию карточек по тапу на summary.
8. Пройти базовую регрессию Mark/Undo, RU/EN, family/workspace, bug-report.

## Git Bash commands

```bash
git status
git add src/components/app/recurring-payments-section.tsx src/components/app/payments-dashboard-section.tsx src/lib/i18n/localization.tsx docs/reports/phase_17A_1_reminders_autosuggest_home_summary_cleanup.md
git commit -m "phase17a1: reminders autosuggest refinement and home summary drilldown"
git push origin main
```

## Env / migrations

- New env vars: not required.
- DB migrations: not required.
