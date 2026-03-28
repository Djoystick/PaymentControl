# Phase 19A — App-like polish 2.0 + stronger Reminders screen model

- Date: 2026-03-28
- Project: Payment Control Telegram Mini App
- Anchor read first: `docs/payment_control_master_anchor_2026-03-28.md`
- Reports read:
  - `docs/reports/phase_17A_reminders_interaction_model_redesign.md`
  - `docs/reports/phase_17A_1_reminders_autosuggest_home_summary_cleanup.md`
  - `docs/reports/phase_17B_app_like_surface_polish_mobile_composition.md`
  - `docs/reports/phase_17B_1_contextual_help_popover_viewport_safety_fix.md`
  - `docs/reports/phase_18A_performance_audit_safe_storage_caching_strategy.md`
- Status context used: latest confirmed stage = Phase 18A (manual verified)

## Exact files changed

1. `src/components/app/app-icon.tsx`
2. `src/components/app/app-shell.tsx`
3. `src/components/app/landing-screen.tsx`
4. `src/components/app/payments-dashboard-section.tsx`
5. `src/components/app/profile-scenarios-placeholder.tsx`
6. `src/components/app/recurring-payments-section.tsx`
7. `src/lib/i18n/localization.tsx`
8. `src/app/globals.css`
9. `docs/reports/phase_19A_app_like_polish_2_reminders_screen_model.md` (this report)

## What was improved in shell / app-like composition

### 1) App shell framing and top context

Updated `src/components/app/app-shell.tsx`:

- strengthened in-frame composition (smoother internal gradient and compact frame fit),
- improved top context bar hierarchy:
  - product identity (`Payment Control`),
  - active tab marker with icon,
  - compact `Today snapshot` pill,
- added `overflow-x-clip` to main screen area to keep composition mobile-safe.

Why:
- stronger “real app screen” framing,
- less website-like stacked appearance,
- cleaner first-glance orientation on each tab.

### 2) Theme polish baseline

Updated `src/app/globals.css`:

- tuned light-theme surface/border/muted tone values for calmer contrast,
- kept existing theme model intact,
- added `overflow-x: hidden` on `body` as an additional mobile viewport guard.

Why:
- improve cohesion and perceived polish on touched surfaces,
- avoid accidental horizontal drift on mobile compositions.

## What was improved in Home / Profile polish

### Home (`landing-screen.tsx`, `payments-dashboard-section.tsx`)

- Home hero card moved to cleaner app-like composition:
  - stronger icon badge,
  - clear snapshot title,
  - short task-oriented guidance line,
  - runtime chip preserved in compact format.
- Compact summary cards were polished:
  - better selected-state affordance,
  - icon-first micro hierarchy,
  - explicit clear-filter action in drill-down state (`Show all payments`).

Result:
- Home feels more like a compact app dashboard, less like a web info block.

### Profile (`profile-scenarios-placeholder.tsx`)

- polished first-screen section surfaces with consistent card tone,
- replay onboarding action upgraded to icon-supported compact control,
- preserved all existing profile/business flows (workspace, invite, premium/admin, bug report).

## What was improved in Reminders screen model (primary focus)

Updated `src/components/app/recurring-payments-section.tsx`.

### 1) Action lane is now more explicit and dominant

- merged repeated top “instruction + quick actions” into one stronger action lane block,
- preserved main CTA (`Open payment form`) as the obvious primary action,
- kept due-state snapshot (`Due today`, `Overdue`, `Visible`) in the same lane.

### 2) Secondary subscription management noise reduced

- replaced large multi-block “subscription management console” surface with one compact secondary `details` layer,
- kept essential subscription context only:
  - active,
  - unpaid this cycle,
  - paused,
  - monthly cost,
- retained paused-filter toggle, but moved into this secondary layer.

This removes constant management-heavy pressure from default visible flow.

### 3) Recurring cards rebalanced for fast action

- card header now emphasizes action-relevant state:
  - type badge (`Payment`/`Subscription`),
  - cycle state badge (`Paid`/`Unpaid`),
  - paused badge where relevant,
- primary path remains visually dominant:
  - `Mark paid` / `Undo paid` button with explicit action icon,
- secondary actions moved behind per-card shadow surface (`Details and actions`):
  - Save as template,
  - Archive,
  - Pause/Resume,
- edit remains available as quick secondary button,
- less persistent metadata clutter on primary card face.

Result:
- default Reminders scanning is cleaner,
- daily action intent is clearer,
- secondary operational controls no longer compete visually with mark/undo flow.

### 4) Preserved good model parts from previous phases

Kept intact:
- template autosuggest model,
- scenario-specific templates,
- payment/subscription distinction,
- quick add path,
- family `Who pays` / `Paid by` context.

## Icon coherence changes

Updated `src/components/app/app-icon.tsx`.

Added focused action icons:
- `check`
- `undo`
- `edit`
- `archive`
- `template`

Applied intentionally (not decorative):
- mark/undo primary action,
- edit and secondary action affordances,
- summary/drill-down/refresh controls.

## What was moved into contextual/help/shadow surfaces

1. Heavy subscription management content in Reminders moved from always-visible lane into a compact secondary `details` surface.
2. Per-card secondary controls moved into `Details and actions` (shadow layer) instead of competing directly with primary action row.
3. Contextual explanation remains in localized `HelpPopover` points without returning to large permanent helper text blocks.

## Tooling note (UI skill)

- Skill instructions from `.codex/skills/ui-ux-pro-max/SKILL.md` were read and applied.
- Required skill search command was attempted:
  - `python .codex/skills/ui-ux-pro-max/scripts/search.py "telegram mini app recurring payments dashboard mobile app-like" --design-system -p "Payment Control"`
- In this environment it failed with system-level Python access error (`python.exe ... access unavailable`), so implementation used the skill’s documented principles directly.

## What was intentionally NOT changed

1. No backend/business-logic rewrite.
2. No DB schema/migration changes.
3. No premium/growth feature expansion.
4. No admin workflow redesign.
5. No bug report redesign.
6. No history business-logic redesign.
7. No changes to critical server-authoritative data semantics introduced in 18A.

## Validation

1. `npm run lint` — passed.
2. `npm run build` — passed.

## Risks / follow-up notes

1. Reminders is materially cleaner, but an additional focused pass can further improve create/edit ergonomics (e.g., compact modal/sheet model) without touching business logic.
2. App-like feel improved in code, but final UX acceptance still requires Telegram live manual review on narrow devices.
3. Existing untracked file `docs/reports/phase_17B_reminders_rethink_analysis.md` was left untouched.

## What still requires live manual verification

1. Reminders default surface should feel action-first in real Telegram mobile usage.
2. Mark paid / Undo paid should remain the fastest and clearest action per card.
3. Template autosuggest behavior from previous phases must remain stable:
   - overlay behavior,
   - prefix matching,
   - dismiss after selection,
   - scenario specificity.
4. Home drill-down still filters correctly and resets cleanly.
5. Theme/light-dark on touched surfaces remains visually consistent on real devices.

## Exact manual checklist (RU)

1. Открыть приложение в Telegram и пройти все 4 вкладки: убедиться, что shell ощущается как цельный мобильный экран.
2. На Home проверить новую композицию верхней карточки и компактность сводки.
3. На Home проверить drill-down:
   - тап по `Скоро` / `Просрочено` / `Всего`,
   - возврат к полному списку через `Показать все платежи`.
4. На Reminders проверить action-lane:
   - видны приоритетные метрики,
   - главная кнопка `Открыть форму платежа` остается доминирующей.
5. Проверить, что тяжелый subscriptions-блок больше не выглядит как большой management-консольный экран на дефолтной поверхности.
6. Проверить карточки платежей:
   - `Отметить оплачено` / `Отменить оплату` остаются быстрыми,
   - вторичные действия доступны в `Детали и действия`.
7. Проверить family-контекст:
   - `Кто платит` / `Оплатил` отображаются корректно.
8. Проверить шаблоны (регрессия):
   - автоподсказка оверлеем,
   - prefix matching,
   - закрытие списка после выбора,
   - разделение personal/family.
9. Проверить валюту по умолчанию в форме добавления: `RUB`.
10. Пройти регрессию:
   - RU/EN + persistence,
   - theme switching,
   - workspace switching,
   - one-time family invite,
   - premium/admin surfaces,
   - bug report flow,
   - help popovers.

## Encoding safety check

Checked touched files for UTF-8 safety and visible RU/EN integrity:

- `src/components/app/app-icon.tsx`
- `src/components/app/app-shell.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/lib/i18n/localization.tsx`
- `src/app/globals.css`
- `docs/reports/phase_19A_app_like_polish_2_reminders_screen_model.md`

Result:
- UTF-8 preserved for newly edited/created content.
- No new mojibake introduced in touched code/report strings.

## Pre-report self-check against prompt

1. Goal alignment (app-like polish + stronger Reminders model) — **PASS**.
2. Strict scope respected (UI-first; no broad backend/business rewrite) — **PASS**.
3. App-like feel improved materially on touched surfaces — **PASS (implementation level)**.
4. Reminders improved in model, not only styling — **PASS**:
   - stronger action lane,
   - reduced persistent management noise,
   - secondary controls moved to shadow surfaces.
5. Icon coherence improved with purposeful additions — **PASS**.
6. Secondary information reduced on main surface where appropriate — **PASS**.
7. Theme consistency improved on touched surfaces — **PASS**.
8. Existing verified flows preserved by scope + lint/build + no logic rewrites — **PASS**.
9. No unrelated feature scope added — **PASS**.

---

## Короткое объяснение (по-русски)

В Phase 19A сделана вторая волна app-like полировки: улучшены shell/Home/Profile, а Reminders переработан в более action-first модель. Главные действия (Mark/Undo, открыть форму) стали визуально доминировать, а вторичные операции и тяжелая подписочная аналитика вынесены в компактные вторичные слои.

## Ручной тест-чеклист (по-русски)

1. Проверить app-like целостность shell на мобильной ширине.
2. Проверить Home summary + drill-down + возврат к полному списку.
3. Проверить Reminders action-lane и читаемость карточек.
4. Проверить вторичные действия в `Детали и действия`.
5. Проверить регрессию шаблонов (overlay/prefix/dismiss/scenario).
6. Проверить RUB по умолчанию в форме.
7. Проверить core-flow регрессию (RU/EN, theme, workspace/family, premium/admin, bug report, popovers).

## Git Bash commands (реальный workflow)

```bash
git status
git add src/app/globals.css src/components/app/app-icon.tsx src/components/app/app-shell.tsx src/components/app/landing-screen.tsx src/components/app/payments-dashboard-section.tsx src/components/app/profile-scenarios-placeholder.tsx src/components/app/recurring-payments-section.tsx src/lib/i18n/localization.tsx docs/reports/phase_19A_app_like_polish_2_reminders_screen_model.md
git commit -m "phase19a: app-like polish 2.0 and reminders action-model strengthening"
git push origin main
```

## Env / migrations

- New env vars: not required.
- DB migrations: not required.
