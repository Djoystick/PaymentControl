# Phase 16A — App-like shell polish + theme foundation + icon system

Date: 2026-03-28  
Project: Payment Control Telegram Mini App  
Baseline: Phase 15A (manual verified)

## Exact files changed

- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/app/app-shell.tsx`
- `src/components/app/help-popover.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/premium-admin-console.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/app-icon.tsx` (new)
- `src/lib/theme/theme-context.tsx` (new)
- `src/lib/i18n/localization.tsx`

## What was changed in shell/app framing

- Upgraded shell composition in `app-shell.tsx` from a plain stacked layout to a more app-like framed container:
  - Rounded, bordered app frame with depth/shadow.
  - Sticky compact top surface showing active tab context.
  - Bottom tab bar kept intact but visually integrated into the app frame.
- Added a contextual top header (icon + active tab title + product label + phase pill) for stronger mobile app screen rhythm.
- Kept existing 4-tab behavior unchanged (`Home`, `Reminders`, `History`, `Profile`).

## How themes were implemented

- Added a dedicated theme layer in `src/lib/theme/theme-context.tsx`:
  - Supported modes: `light` and `dark`.
  - Theme is applied to `document.documentElement.dataset.theme`.
  - `color-scheme` is set accordingly for native form/UA consistency.
- Added theme variables in `globals.css`:
  - Light and dark token sets (`--app-bg`, `--app-surface`, `--app-border`, `--app-text`, etc.).
  - Background glow and frame shadow tokens for consistent app-like atmosphere.
- Enabled token-aware surfaces for touched components so dark mode remains coherent (not partial).

## Where the theme switch was added

- Added user-facing theme switch in **Profile -> Session** block (`profile-scenarios-placeholder.tsx`):
  - `Light`
  - `Dark`
- The switch is compact and inline with language controls to avoid new navigation complexity.

## How persistence works

- Theme choice persists in `localStorage` key:
  - `payment_control_ui_theme_v16a`
- Initial resolution order:
  1. Stored user choice (if present)
  2. Telegram `colorScheme` (if available)
  3. System `prefers-color-scheme`
  4. Fallback `light`

## Icon system changes (and why)

- Introduced `AppIcon` component (`src/components/app/app-icon.tsx`) as a single icon source for app surfaces.
- Replaced scattered inline SVGs with named icon usage across touched surfaces:
  - Tabs and shell header (`home`, `reminders`, `history`, `profile`)
  - Profile context/actions (`language`, `theme`, `premium`, `support`, `workspace`)
  - Help trigger (`help`)
  - Reminders split controls (`payments`, `subscriptions`)
- Result: clearer semantic mapping, less ad-hoc icon variance, easier future maintenance.

## Other targeted consistency updates

- Unified phase labels on touched surfaces to `Phase 16A`.
- Updated help trigger visual to use the same icon system and theme-aware elevated surface.
- Preserved existing contextual help popover behavior (local positioning logic from Phase 14A.2 remains intact).

## What was intentionally NOT changed

- No business-logic expansion and no new product mechanics.
- No changes to premium lock strategy, growth/referral mechanics, analytics wave, or support-center features.
- No redesign of history behavior/content flow.
- No changes to bug report server delivery logic from Phase 15A.
- No schema/migration/env additions required for Phase 16A.

## Risks / follow-up notes

- Visual polish is intentionally limited to touched shared surfaces; deeper per-screen visual harmonization can be deferred.
- Theme token coverage is strong for touched components, but any future new component should consume design tokens (not hardcoded colors) to stay consistent.
- Existing unrelated workspace change `supabase/.temp/cli-latest` deletion was not modified/reverted in this pass.

## What still requires live manual verification

- Telegram Mini App runtime check (actual Telegram container):
  - Header + tab feel on real device.
  - Theme switch interaction and persistence after app reopen.
  - No regressions in existing flows while switching themes.
- Final visual QA on narrow mobile widths for touched surfaces.

## Exact manual checklist

1. Open app in Telegram Mini App and confirm 4-tab shell still works.
2. Verify app-like frame and sticky top context are visible on all tabs.
3. In Profile -> Session, switch `Light` -> `Dark` -> `Light`.
4. Reload/reopen app and verify theme persists.
5. Confirm RU/EN switching still works and persists.
6. In Reminders, verify payments/subscriptions switch still works and icons are clear.
7. Verify help popovers still open near triggers and dismiss correctly.
8. Verify Mark paid / Undo paid behavior still works.
9. Verify workspace switching and one-time family invite flow still work.
10. Verify premium status and owner admin console actions still open/work.
11. Verify bug report form remains reachable and operational.

## Validation run

- `npm run lint` -> passed
- `npm run build` -> passed

## Encoding safety check

- Verified all touched files remain valid UTF-8 text.
- Re-checked touched RU-visible content in `src/lib/i18n/localization.tsx` after edits.
- Checked touched UI files for mojibake/replacement characters; none found.
- Fixed a popover close-glyph encoding risk by normalizing it to ASCII (`x`).

## Pre-report self-check against prompt

Goal alignment:
- Implemented a controlled UI/product-feel pass focused on shell polish, theme foundation, and icon coherence.
- Did not expand business logic.

Strict scope alignment:
- Touched global shell composition, theme foundation, icon system, and small consistency surfaces only.
- No unrelated feature growth.

Acceptance criteria check:
1. App feels more app-like vs website-like -> satisfied (framed shell + cohesive top/bottom composition).
2. User-facing light/dark switch exists -> satisfied (Profile Session controls).
3. Theme choice persists after reload/reopen -> satisfied (localStorage + initial resolution).
4. Icon system is more coherent and intentional -> satisfied (`AppIcon` centralized usage).
5. Shell/surface composition more cohesive on mobile -> satisfied (app frame + rhythm + tokenized surfaces).
6. Existing verified flows preserved -> satisfied by no business-logic changes and successful lint/build; requires live manual confirmation checklist above.
7. No unrelated feature scope added -> satisfied.

---

## Кратко на русском

В Phase 16A мы сделали приложение визуально ближе к нативному Mini App: добавили цельный shell, основу light/dark темы с сохранением выбора пользователя и единый набор иконок для ключевых действий. Бизнес-логика не расширялась и текущие проверенные потоки не переписывались.

### Ручная проверка (чеклист)

1. Открыть Mini App в Telegram и проверить работу всех 4 вкладок.
2. Проверить новый верхний контекстный блок и нижнюю навигацию.
3. В Профиле переключить тему: Светлая -> Темная -> Светлая.
4. Перезапустить/переоткрыть приложение и убедиться, что тема сохранилась.
5. Проверить переключение RU/EN и сохранение языка.
6. В Напоминаниях проверить разделение Платежи/Подписки и иконки.
7. Проверить help-поповеры (локальность, закрытие, читаемость).
8. Проверить Mark paid / Undo paid.
9. Проверить переключение workspace и одноразовые family invite.
10. Проверить Premium status, owner admin console и bug report форму.

### Git Bash команды (безопасный порядок)

```bash
git status
git add src/app/globals.css src/app/layout.tsx src/components/app/app-shell.tsx src/components/app/help-popover.tsx src/components/app/landing-screen.tsx src/components/app/payments-activity-section.tsx src/components/app/payments-dashboard-section.tsx src/components/app/premium-admin-console.tsx src/components/app/profile-scenarios-placeholder.tsx src/components/app/recurring-payments-section.tsx src/components/app/app-icon.tsx src/lib/theme/theme-context.tsx src/lib/i18n/localization.tsx docs/phase16a_app_like_shell_polish_theme_foundation_icon_system_report.md
git commit -m "phase16a: polish app shell, add light/dark theme foundation, unify icon system"
git push origin main
```

### Изменения по env

Для этой фазы новые переменные окружения не требуются.

