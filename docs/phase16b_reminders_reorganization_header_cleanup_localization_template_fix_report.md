# Phase 16B — Reminders reorganization + header cleanup + localization/template fix

Date: 2026-03-28  
Project: Payment Control Telegram Mini App  
Baseline for confirmed stage: Phase 15A (manual verified)  
Live note considered: Phase 16A not accepted as final UX direction

## Exact files changed

1. `src/components/app/app-shell.tsx`
2. `src/components/app/landing-screen.tsx`
3. `src/components/app/recurring-payments-section.tsx`
4. `src/lib/i18n/localization.tsx`
5. `docs/phase16b_reminders_reorganization_header_cleanup_localization_template_fix_report.md` (this report)

## How Reminders was reorganized

Main UX direction in `recurring-payments-section.tsx` was shifted from many parallel blocks to clearer primary/secondary hierarchy:

1. Primary actions made compact:
- Replaced bulky `Main action` explanatory block with compact `Quick actions`.
- Kept only direct controls there: `Open payment form` and `Refresh section`.
- Added local `?` contextual help for quick actions instead of persistent helper text.

2. Secondary setup moved into one collapsed zone:
- Added one parent collapsed block: `Setup and templates`.
- Grouped secondary tools inside it:
  - `Family controls` (family scenario only),
  - `Reminder operations and visibility`,
  - scenario-specific templates.
- This reduces first-screen overload and keeps active daily flow cleaner.

3. Help text de-cluttered with local popovers:
- Family controls helper moved behind local `?`.
- Reminder operations helper moved behind local `?`.
- Templates helper moved behind local `?`.
- Payment form helper moved behind local `?`.

4. Existing operational flows preserved:
- Mark paid / Undo paid logic unchanged.
- Who pays / Paid by surfaces preserved.
- Payments/Subscriptions separation preserved.
- Reminder diagnostics section preserved (now in compact grouped structure).

## How template activation was fixed

Issue: template activation previously felt text-only.

Fix in `recurring-payments-section.tsx`:
- Template rows now render with a large row-level activation button (`flex-1` button with row padding/background hover).
- The intended row area is now tappable for apply/fill behavior.
- `Delete` action for custom templates remains isolated and safe.

Result:
- Mobile interaction is natural: tap row to apply template.
- Destructive action remains explicit via separate `Delete` button.

## How localization/autofill was corrected

Issue: RU UI could still get EN autofill from system starter templates.

Fix:
1. Added system-template localization path in `applyTemplate`:
- Introduced `localizeSystemTemplate(...)`.
- For system templates only:
  - `title` and `category` pass through `tr(...)` before form autofill.
  - optional notes also localized if present.
- For custom templates:
  - no localization rewrite,
  - values remain exactly as user saved.

2. Added/updated RU translations in `localization.tsx` for:
- starter template titles (`Home Internet`, `Family Rent`, etc.),
- categories (`Housing`, `Food`, `Education`, `General`, etc.),
- helper labels introduced in this pass.

3. Template labels behavior clarified:
- System template labels use localization.
- Custom template labels are shown as raw user data (not auto-translated).

## How page title bars were removed

In `app-shell.tsx`:
- Removed the global sticky page-level top title bar introduced in 16A.
- Kept bottom tab shell navigation unchanged.

This removes non-essential floating title strips from non-Home screens and reduces vertical noise.

## Home title cleanup

In `landing-screen.tsx` + `localization.tsx`:
- Removed `Telegram Mini App` text from Home.
- Simplified Home top section to one main title surface.
- Updated RU translation for `Payment Control` to `Контроль платежей`.

Result:
- Home keeps one clear main title surface (`Контроль платежей` in RU).

## What hint/help surfaces were changed

Converted always-visible secondary hints into local contextual help where it improved clarity:

1. `Quick actions` helper -> local `?` popover
2. `Family controls` helper -> local `?` popover
3. `Reminder operations` helper -> local `?` popover
4. `Templates` helper -> local `?` popover
5. `Payment form` helper -> local `?` popover

Popover safety behavior relies on existing 14A.2 viewport-safe logic (`help-popover.tsx`) and remains local to the related block.

## What was intentionally NOT changed

1. No new premium/growth/public mechanics.
2. No history redesign wave.
3. No backend/domain rewrite for payments logic.
4. No schema/migration changes.
5. No bug-report delivery redesign (Phase 15A flow kept intact).

## Risks / follow-up notes

1. Reminders restructuring is intentionally UI-focused and safe; deeper behavior analytics was not added by scope.
2. Row-level template tap area is now broad; keep delete button placement stable in future passes to avoid accidental taps.
3. Existing unrelated workspace deletion `supabase/.temp/cli-latest` remained untouched by this pass.

## What still requires live manual verification

1. Reminders perceived overload reduction in real Telegram runtime (small mobile screens).
2. Whole-row template activation feel on device touch.
3. RU-selected template autofill using system templates.
4. Non-Home top title strip is truly gone in real runtime.
5. Home title appears as intended and `Telegram Mini App` is absent.
6. Contextual help popovers still feel local and viewport-safe.
7. Regression smoke for all verified flows.

## Exact manual checklist

1. Open app in Telegram Mini App and verify 4-tab switching still works.
2. Confirm non-Home screens no longer show the global floating top page-title strip.
3. Open Home and verify:
- main title is `Контроль платежей` (RU),
- `Telegram Mini App` text is not shown.
4. In Reminders, verify first-screen feels cleaner (quick actions + collapsed setup/tools).
5. Open `Setup and templates` and verify grouped structure:
- Family controls (family mode),
- Reminder operations,
- Templates.
6. Template activation test:
- tap template row body (not only text),
- ensure form autofills.
7. Custom template safety test:
- delete works only through explicit `Delete`.
8. Localization autofill test:
- set RU language,
- apply system starter template,
- verify system-defined title/category autofill in RU.
9. Custom template preservation test:
- create custom template with user text,
- reapply under RU/EN and ensure user text remains exactly saved.
10. Check `?` popovers in Reminders:
- open near related control,
- no horizontal overflow,
- outside tap closes.
11. Regression smoke:
- Mark paid / Undo paid,
- family shared recurring flow,
- Who pays / Paid by surfaces,
- workspace switching,
- one-time family invite,
- premium/admin console,
- bug report form.

## Validation run

- `npm run lint` -> passed
- `npm run build` -> passed

## Encoding safety check

Checked touched RU-visible content in:
1. `src/lib/i18n/localization.tsx`
2. `docs/phase16b_reminders_reorganization_header_cleanup_localization_template_fix_report.md`

Checked touched UI files for mojibake/replacement symbols:
1. `src/components/app/app-shell.tsx`
2. `src/components/app/landing-screen.tsx`
3. `src/components/app/recurring-payments-section.tsx`

Result:
- UTF-8 preserved in touched files.
- No mojibake/replacement-character corruption found in touched content.

## Pre-report self-check against prompt

1. Original goal (major UX refinement focused on Reminders/header/home/localization/template behavior)  
Status: Satisfied in code.

2. Strict scope compliance  
Status: Satisfied.  
Touched only shell/header, home title surface, reminders UX structure, template interaction, localization support.

3. Acceptance criteria check

1) Reminders less overloaded and friendlier  
Status: Satisfied by compact quick actions + grouped collapsed setup/tools + contextual hints.

2) Whole-row template activation  
Status: Satisfied by row-level template apply button area.

3) RU-selected system autofill localization  
Status: Satisfied by system-template localization before form fill and RU key coverage.

4) Non-Home page title bars removed  
Status: Satisfied by removing global floating top strip from app shell.

5) Home retains one main title surface with `Контроль платежей`  
Status: Satisfied by Home simplification + RU translation update.

6) `Telegram mini app` text removed from Home  
Status: Satisfied.

7) Hint/help placement cleaner/contextual  
Status: Satisfied for touched hints via local `?` popovers.

8) Existing verified flows preserved  
Status: Satisfied by scope isolation + lint/build pass; live regression checklist provided.

9) No unrelated feature scope  
Status: Satisfied.

---

## Коротко на русском

В 16B мы убрали лишний верхний плавающий заголовок из shell, упростили Home до одного главного заголовка (`Контроль платежей`), переразложили Reminders в более дружелюбный формат (быстрые действия + свернутый блок инструментов), исправили применение шаблонов по нажатию на всю строку и сделали языковую автоподстановку системных шаблонов корректной для RU.

### Ручной тест-чеклист

1. Проверить, что верхняя плавающая полоска заголовка больше не появляется на не-Home вкладках.
2. На Home проверить:
- есть только один главный заголовок `Контроль платежей`,
- нет текста `Telegram Mini App`.
3. В Reminders проверить новую структуру:
- `Быстрые действия`,
- свернутый `Настройка и шаблоны`.
4. В шаблонах проверить применение по нажатию на строку.
5. Проверить, что `Удалить` работает отдельно и безопасно.
6. Переключить язык на RU, применить системный шаблон и проверить RU автозаполнение.
7. Проверить, что пользовательский шаблон не переводится автоматически и остается как сохранен.
8. Проверить `?` поповеры: локальные, без горизонтального скролла, корректно закрываются.
9. Пройти регрессии по core flow (Mark paid/Undo paid, family/shared, who pays/paid by, workspace, one-time invite, premium/admin, bug report).

### Git Bash команды (реальный workflow)

```bash
git status
git add src/components/app/app-shell.tsx src/components/app/landing-screen.tsx src/components/app/recurring-payments-section.tsx src/lib/i18n/localization.tsx docs/phase16b_reminders_reorganization_header_cleanup_localization_template_fix_report.md
git commit -m "phase16b: reorganize reminders UX, remove shell title strip, and fix template tap/localized autofill"
git push origin main
```

### Env / migrations

Новых env-переменных и миграций для этой фазы не требуется.

