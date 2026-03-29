# Phase 19A.2 — Strict title-only template matching fix

- Date: 2026-03-28
- Project: Payment Control Telegram Mini App
- Anchor read first: `docs/payment_control_master_anchor_2026-03-28.md`
- Reports read:
  - `docs/reports/phase_19A_app_like_polish_2_reminders_screen_model.md`
  - `docs/reports/phase_19A_1_template_currency_autosuggest_catalog.md`
- Status context used: latest fully confirmed stage = Phase 18A (manual verified)

## Exact root cause of wrong matching

In `src/components/app/recurring-payments-section.tsx`, autosuggest filtering matched by **both**:

1. template `label` (name)
2. template `title` (secondary descriptive line for system templates)

Because system `title` may start with different words (for example budget/extended phrasing), typing a prefix could match via descriptive `title` even when the visible template name did not start with that prefix.

This is why queries like `Б` could return items that should not match by visible template name.

## Exact files changed

1. `src/components/app/recurring-payments-section.tsx`
2. `docs/reports/phase_19A_2_strict_title_only_template_matching_fix.md` (this report)

## What was fixed in matching logic

Updated `templateSuggestions` filter in `src/components/app/recurring-payments-section.tsx`:

- removed `title` from matching criteria,
- kept prefix-only comparison (`startsWith`) and lowercase normalization,
- now matching uses strictly template **name** field (`label`) for system templates,
- for custom templates preserves safe fallback `label || title` only when label is empty.

Result:
- descriptions/secondary text no longer influence autosuggest,
- matching behaves as strict prefix on template name.

## What was intentionally NOT changed

1. No template catalog changes.
2. No system template currency changes.
3. No localization dictionary changes.
4. No UI layout/overlay redesign.
5. No shell/home/profile/history changes.
6. No premium/admin/growth changes.
7. No business logic changes outside autosuggest matching.

## Preserved behavior checks

By scope and code:
- overlay suggestions rendering preserved,
- close-on-select behavior preserved (`applyTemplate` path unchanged),
- family/personal scenario split preserved,
- built-in RUB defaults untouched,
- custom templates untouched.

## Validation

1. `npm run lint` — passed.
2. `npm run build` — passed.

## What still requires live manual verification

1. Query `Б` should not return templates that only match descriptive secondary text.
2. Query `С` should return only templates whose **name** starts with `С`.
3. Overlay behavior remains unchanged (floating list, no layout push).
4. Suggestions still close after selection.
5. RU/EN mode still localizes system template names correctly.

## Exact manual checklist (RU)

1. Открыть Reminders и форму добавления платежа.
2. Ввести `Б` и проверить, что в подсказках нет карточек, попавших только из-за второй описательной строки.
3. Ввести `С` и проверить, что показываются только шаблоны с названием, начинающимся на `С`.
4. Переключить язык RU/EN и повторить проверку префикса.
5. Переключить personal/family workspace и убедиться, что наборы шаблонов не смешиваются.
6. Выбрать шаблон и проверить, что список подсказок закрывается после выбора.
7. Проверить, что overlay подсказок остается плавающим и не ломает layout.
8. Короткая регрессия:
   - Mark paid / Undo paid
   - language persistence
   - theme switching
   - premium/admin/bug-report surfaces

## Encoding safety check

Checked touched files for UTF-8 and readable RU/EN content:

1. `src/components/app/recurring-payments-section.tsx`
2. `docs/reports/phase_19A_2_strict_title_only_template_matching_fix.md`

Result:
- UTF-8 preserved.
- No new mojibake/garbled Cyrillic introduced.

## Pre-report self-check against prompt

1. Original goal (strict title/name-only matching) — **PASS**.
2. Strict scope (only autosuggest matching logic) — **PASS**.
3. Non-negotiable preserve rules — **PASS by narrow code change + lint/build**.
4. Description/helper text influence removed — **PASS**.
5. Prefix matching behavior preserved — **PASS**.
6. Overlay + close-on-select preserved — **PASS**.
7. No unrelated feature scope added — **PASS**.

---

## Короткое объяснение (по-русски)

В 19A.2 сделан узкий фикс: из autosuggest убрано влияние вторичной строки `title`, теперь фильтрация идет строго по имени шаблона (`label`) с префиксным сравнением.

## Manual test checklist (по-русски)

1. Проверить `Б` и `С` в поле названия — match только по имени шаблона.
2. Проверить RU/EN и personal/family разделение.
3. Проверить, что overlay и закрытие подсказок после выбора работают как раньше.
4. Пройти короткую регрессию основных потоков.

## Git Bash commands (реальный workflow)

```bash
git status
git add src/components/app/recurring-payments-section.tsx docs/reports/phase_19A_2_strict_title_only_template_matching_fix.md
git commit -m "phase19a.2: enforce strict template-name prefix matching in autosuggest"
git push origin main
```
