# Phase 17B — App-like surface polish + mobile composition + deferred form fix

- Date: 2026-03-28
- Project: Payment Control Telegram Mini App
- Anchor read first: `docs/payment_control_master_anchor_2026-03-28.md`
- Reports read:
  - `docs/reports/phase_17A_reminders_interaction_model_redesign.md`
  - `docs/reports/phase_17A_1_reminders_autosuggest_home_summary_cleanup.md`
  - recent UX context:
    - `docs/phase16a_app_like_shell_polish_theme_foundation_icon_system_report.md`
    - `docs/phase16b_reminders_reorganization_header_cleanup_localization_template_fix_report.md`
    - `docs/reports/phase_17C_action_lane_cleanup.md`
    - `docs/reports/phase_17C_1_recurring_cycle_visibility_fix.md`
- Status override respected:
  - Phase 16B = manual verified
  - Phase 17A.1 = almost accepted, not fully manual verified

## Exact files changed

1. `src/components/app/app-icon.tsx`
2. `src/components/app/app-shell.tsx`
3. `src/components/app/landing-screen.tsx`
4. `src/components/app/payments-dashboard-section.tsx`
5. `src/components/app/profile-scenarios-placeholder.tsx`
6. `src/components/app/recurring-payments-section.tsx`
7. `docs/reports/phase_17B_app_like_surface_polish_mobile_composition.md` (this report)

## What was changed in shell / app-like composition

### 1) Shell framing and screen rhythm (`app-shell.tsx`)

- Refined app frame composition:
  - slightly stronger frame radius and depth,
  - smoother surface gradient inside shell,
  - improved safe-area bottom handling.
- Added compact in-frame context chip (icon + active tab label) with lightweight status marker (`Today snapshot`) to reinforce screen identity without reintroducing large sticky page headers.
- Increased vertical rhythm between screen blocks (`space-y-3`) and tuned tab bar inactive surface to feel less like flat website buttons.

Why:
- strengthen native mini-app perception,
- keep tab context clear,
- improve mobile visual hierarchy with minimal behavioral risk.

### 2) Home first-screen composition (`landing-screen.tsx`)

- Rebuilt Home top card into clearer app-like header block:
  - micro-label (`Today snapshot`),
  - main title (`Payment Control`),
  - compact icon badge,
  - runtime stage moved into chip-like metadata row.

Why:
- cleaner first impression,
- better scan order on mobile,
- less “plain website paragraph + title” feeling.

## What was changed in icon usage and why

### 1) Extended coherent icon vocabulary (`app-icon.tsx`)

Added controlled new icons:
- `add`
- `refresh`
- `clock`
- `alert`
- `wallet`

### 2) Applied icons only to high-signal UI spots

- Home compact summary cards (`payments-dashboard-section.tsx`):
  - total / upcoming / overdue / monthly cost now use semantic icons.
- Home drill-down and refresh actions:
  - filtered-state heading + due metadata + refresh buttons now visually aligned.
- Reminders action lane (`recurring-payments-section.tsx`):
  - action-lane instruction row icon,
  - due/overdue/visible snapshot cards icons,
  - add/open form buttons with explicit add icon.

Why:
- improve glanceability,
- reinforce primary semantics,
- keep icon system intentional (no decorative noise).

## What screens/surfaces were polished

### Home

- Improved top card composition (`LandingScreen`).
- Strengthened compact dashboard summary visual language (icons, card clarity, action affordance).
- Preserved 17A.1 drill-down behavior and logic.

### Reminders

- Kept accepted 17A/17A.1 direction intact.
- Polished action-lane density and icon affordances.
- Preserved autosuggest overlay/prefix behavior and action-lane simplification.

### Profile

- Refined vertical rhythm in profile surface container:
  - moved to consistent `space-y-3` composition,
  - removed repeated `mb-3` spacing pattern from inner blocks.

Result:
- Profile reads more like a coherent in-app screen and less like stacked website sections.

## Deferred form fix: default currency RUB

Required deferred fix is preserved and explicitly revalidated:

- `createDefaultForm()` in `src/components/app/recurring-payments-section.tsx` uses:
  - `currency: "RUB"`
- Currency field placeholder remains:
  - `Currency (RUB)`

Additional verification performed:
- no `currency: "USD"` remains in current UI code path for add-payment default.

## What was intentionally NOT changed

- No premium/growth/public promo work.
- No admin-console redesign.
- No history business-logic redesign.
- No backend/API/business-rule rewrites.
- No DB schema or migration changes.
- No rollback of accepted 17A/17A.1 UX direction.

## Tooling note (UI skill)

- `ui-ux-pro-max` skill instructions were read and used as design guidance.
- Running its Python search script from `.codex/skills/ui-ux-pro-max/scripts/search.py` failed in this environment with system-level access error (`python.exe: access to this file from system is unavailable`), so implementation used the skill’s documented UI principles directly.

## Validation

- `npm run lint` — passed
- `npm run build` — passed

## Risks / follow-up notes

1. The new shell context chip should be manually validated on real Telegram devices for perceived “native feel” and notched safe areas.
2. Home summary icon density was increased intentionally but still compact; manual UX check should confirm no visual overload on narrow screens.
3. If product later needs stronger per-tab identity, that should be a separate controlled pass (without returning heavy persistent headers).

## What still requires live manual verification

1. Real Telegram WebView perception: app-like feel vs website feel.
2. One-handed thumb comfort for tab bar + primary actions.
3. Home drill-down still behaves correctly under real data density.
4. Reminders default currency on real create flow starts as RUB in all normal entry paths.

## Exact manual checklist (RU)

1. Открыть приложение в Telegram и пройти все 4 вкладки: проверить, что shell ощущается цельным, мобильным и «app-like».
2. Проверить, что новый верхний компактный контекст в frame не мешает контенту и не превращается в тяжелый sticky header.
3. На Home проверить first-screen композицию:
   - аккуратная иерархия заголовка,
   - чип со стадией окружения,
   - без лишнего визуального шума.
4. На Home проверить summary-карточки и иконки:
   - `Всего`, `Скоро`, `Просрочено`, `Общая месячная стоимость`.
5. Проверить drill-down из Home summary:
   - тап по `Скоро` показывает только `Скоро`,
   - тап по `Просрочено` показывает только `Просрочено`,
   - вне выбранного фильтра поведение обычное.
6. В Reminders проверить action-lane:
   - основная кнопка формы читаема,
   - иконки помогают, но не перегружают.
7. Проверить autosuggest в Reminders (сохранилось из 17A.1):
   - overlay не сдвигает layout,
   - prefix matching,
   - скрытие после выбора.
8. Проверить deferred fix:
   - в новой форме добавления валюта по умолчанию `RUB`.
9. Проверить Profile:
   - ритм и блоки визуально ровные,
   - нет ощущения «насыпанных» web-блоков.
10. Регрессия core flow:
   - Mark paid / Undo paid
   - RU/EN switching + persistence
   - workspace switch/join/invite
   - who pays / paid by
   - premium/admin surfaces
   - bug report delivery flow

## Encoding safety check

Checked UTF-8 and Cyrillic safety in touched files:

- `src/components/app/app-icon.tsx`
- `src/components/app/app-shell.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `docs/reports/phase_17B_app_like_surface_polish_mobile_composition.md`

Result:
- UTF-8 preserved.
- No mojibake/garbled Cyrillic found in touched content.

## Pre-report self-check against prompt

1. Original goal (more app-like, more cohesive mobile composition) — **PASS**.
2. Strict scope respected (UI/surface/icon/form ergonomics only) — **PASS**.
3. Non-negotiable preserve rules (core flows and 17A/17A.1 gains) — **PASS by scope + build/lint + no logic rewrites**.
4. App feels less like website (frame rhythm, screen composition, icon semantics) — **PASS at implementation level; final perception requires live manual check**.
5. Icon usage coherent and intentional — **PASS**.
6. Touched surfaces cleaner and more native (Home/Reminders/Profile) — **PASS**.
7. Default currency fix (RUB) present in add-payment default path — **PASS**.
8. No unrelated feature scope added — **PASS**.

---

## Короткое объяснение (по-русски)

В Phase 17B сделана контролируемая полировка app-like слоя: улучшен shell-ритм, Home first-screen, визуальная coherence иконок на ключевых действиях, выровнена композиция Profile и усилена мобильная читаемость Reminders. Отложенный фикс по валюте подтвержден: в форме добавления дефолт теперь `RUB`.

## Ручной тест-чеклист (по-русски)

1. Проверить общий app-like вид shell на мобильной ширине.
2. Проверить Home: новая композиция + summary-карточки + drill-down.
3. Проверить Reminders: action-lane, autosuggest (overlay/prefix/auto-dismiss), отсутствие регрессий.
4. Проверить, что новая форма добавления открывается с `RUB` по умолчанию.
5. Проверить Profile: более ровный spacing и целостность surface.
6. Пройти регрессию core потоков (Mark/Undo, RU/EN, workspace/family, premium/admin, bug report).

## Git Bash commands

```bash
git status
git add src/components/app/app-icon.tsx src/components/app/app-shell.tsx src/components/app/landing-screen.tsx src/components/app/payments-dashboard-section.tsx src/components/app/profile-scenarios-placeholder.tsx src/components/app/recurring-payments-section.tsx docs/reports/phase_17B_app_like_surface_polish_mobile_composition.md
git commit -m "phase17b: app-like surface polish, mobile composition pass, icon coherence"
git push origin main
```

## Env / migrations

- New env vars: not required.
- DB migrations: not required.
