# Phase 19B — Primary Actions Emphasis + Surface Hierarchy Polish

- Date: 2026-03-28
- Project: Payment Control Telegram Mini App
- Source of truth used: `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Latest manual verified baseline before this pass: **Phase 19A.2**
- Pass type: controlled UI-first polish (no business-logic rewrite)

## Objective of this pass

Усилить визуальный акцент первичных действий и улучшить иерархию пользовательских поверхностей (прежде всего Home и Reminders), чтобы:

1. быстрее считывалось «что делать сейчас»;
2. ключевые действия были заметнее вторичных;
3. интерфейс ощущался более app-like и мобильным;
4. не были затронуты verified core flows и чувствительные технические фиксы.

## Exact files changed

1. `src/components/app/app-shell.tsx`
2. `src/components/app/landing-screen.tsx`
3. `src/components/app/payments-dashboard-section.tsx`
4. `src/components/app/recurring-payments-section.tsx`
5. `src/lib/i18n/localization.tsx`
6. `docs/reports/internal_version_history.md`
7. `docs/reports/phase_19B_primary_actions_emphasis_surface_hierarchy_polish.md` (this report)

## UI skill usage note

- `ui-ux-pro-max` skill instructions were used as the primary UI guidance baseline for this pass.
- Attempt to run required design-system script:
  - `python .codex/skills/ui-ux-pro-max/scripts/search.py \"telegram mini app reminders home action hierarchy mobile app-like\" --design-system -p \"Payment Control\" -f markdown`
- In this environment it failed with system-level Python access error, so implementation followed the skill guidance directly from `SKILL.md`.

## UI decisions and why

### A) Home: stronger primary action and clearer summary hierarchy

Changed in:
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/app-shell.tsx`

What changed:

1. Added explicit primary CTA on landing card:
- new button `Open Reminders and add payment` with stronger accent treatment.
- button dispatches a controlled app-shell navigation event to open `Reminders` tab.

Why:
- Home now points to the main operational flow in one tap.
- reduces time-to-action for short sessions.

2. Compact Home summary cards were made more legible and actionable:
- increased visual weight and tap confidence (`min-h`, stronger selected state shadows);
- added guidance copy: `Tap a segment to focus actionable cards.`;
- `Overdue` card gets elevated warning style when overdue count > 0.

Why:
- summary segments are now perceived as interactive controls, not passive metrics.
- faster scan for urgent states.

3. Added direct Home action entry to Reminders from snapshot block:
- `Open Reminders for actions` full-width primary CTA under summary cards.

Why:
- keeps Home compact while making the next step obvious.

### B) Reminders: action-lane and actionable cards emphasis

Changed in:
- `src/components/app/recurring-payments-section.tsx`

What changed:

1. Action-lane polish:
- quick-actions hint text made visually stronger;
- due/overdue/visible metric cards got clearer visual separation and depth;
- overdue snapshot card now gains warning styling when relevant;
- main `Open payment form` button now full-width and more dominant.

Why:
- first screen now better communicates primary path.
- lower cognitive friction for daily routine.

2. Payment/subscription cards now emphasize actionable urgency:
- per-card urgency detection on UI layer (without business logic changes):
  - `Action now: due today`
  - `Action now: overdue`
- overdue/due-today cards receive elevated styling.

Why:
- the eye is drawn to cards that need immediate action.

3. Primary cycle button (`Mark paid` / `Undo paid`) gets stronger prominence:
- button width/weight increased for mobile tap confidence;
- overdue items get stronger warning accent on primary action.

Why:
- reinforces key accounting action hierarchy.

4. List mode switch (`Payments` / `Subscriptions`) moved into clearer container:
- less flat appearance;
- stronger selected-state affordance.

Why:
- better segment scannability and mode awareness.

### C) Minimal navigation wiring for app-like flow

Changed in:
- `src/components/app/app-shell.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-dashboard-section.tsx`

What changed:
- introduced a small, explicit app event (`APP_TAB_NAVIGATE_EVENT`) handled in `AppShell`;
- Home CTAs dispatch this event with target tab `reminders`.

Why:
- keeps implementation local and minimal;
- avoids broad routing/system refactor;
- improves perceived app-like continuity.

## Localization updates

Changed in `src/lib/i18n/localization.tsx`:

Added RU translations for new strings:
- `Primary next action`
- `Open Reminders and add payment`
- `Tap a segment to focus actionable cards.`
- `Open Reminders for actions`
- `Action now: overdue`
- `Action now: due today`

## What was intentionally NOT changed

1. No business-rule rewrite for payments/subscriptions.
2. No changes to `Mark paid` / `Undo paid` logic paths.
3. No changes to family/admin/premium/bug-report core behavior.
4. No changes to template matching algorithm from 19A.2 (strict title/name prefix stays intact).
5. No changes to default currency behavior (RUB normalization preserved).
6. No changes to help popover safety mechanics.
7. No changes to safe cache source-of-truth boundaries from 18A.
8. No broad backend, DB, admin, or feature expansion.

## Sensitive areas explicitly re-checked

Inspected (without changing logic in these unless listed above):
- `src/components/app/recurring-payments-section.tsx`
- `src/lib/payments/starter-templates.ts`
- `src/components/app/help-popover.tsx`
- `src/lib/payments/client-cache.ts`

Status:
- No regression-intent changes made in starter templates/help popover/client cache.
- Core safeguards from 19A.2 / 17B.1 / 18A were preserved.

## Validation executed

1. `npm run lint` — passed
2. `npm run build` — passed

`next build` included TypeScript stage and completed successfully.

## Version history / changelog handling

- Internal version history entry created/updated:
  - `docs/reports/internal_version_history.md`
- Public changelog file is not currently established as a project convention in repo; this pass is recorded in internal history + full phase report.

## Risks / follow-up notes

1. New Home CTA-to-Reminders event flow is intentionally lightweight and should be smoke-tested in real Telegram WebView tap scenarios.
2. Urgency styling is UI-only; if future product needs stricter urgency semantics (e.g., configurable windows), that should be a separate logic pass.
3. This pass improves hierarchy substantially, but final visual tuning should still be validated on narrow real devices.

## Ready for manual verification?

**Yes (code/report readiness): ready for manual testing.**

Not marked as manual verified in this report.

## Короткое объяснение (RU)

Phase 19B усилил визуальный приоритет главных действий на Home и Reminders: добавлен явный переход к действию, summary-сегменты стали заметнее и tappable, а в Reminders карточки с срочными задачами выделяются сильнее без изменения бизнес-логики.

## Manual checklist (RU)

1. Открыть Home и проверить новый блок `Следующее главное действие`.
2. Нажать `Открыть Напоминания и добавить платеж` и проверить переход на вкладку Reminders.
3. На Home проверить summary-карточки:
- четко читаются `Всего`, `Скоро`, `Просрочено`, `Общая месячная стоимость`;
- карточки выглядят нажимаемыми;
- `Просрочено` визуально акцентируется при ненулевом значении.
4. На Home нажать `Открыть Напоминания для действий` и проверить переход в Reminders.
5. В Reminders проверить action-lane:
- CTA `Открыть форму платежа` визуально доминирует;
- due/overdue/visible блоки читаются быстрее.
6. Проверить карточки платежей:
- для актуальных карточек видны метки `Сделать сейчас: ...`;
- primary кнопка `Отметить оплачено/Отменить оплату` выделена сильнее вторичных.
7. Проверить, что тяжелые diagnostics/helper блоки не вернулись на main surface.
8. Проверить регрессию autosuggest:
- match строго по title/name prefix;
- description/helper не влияет;
- overlay и close-on-select работают.
9. Проверить, что дефолтная валюта в форме остается RUB.
10. Проверить, что help popover не вызывает горизонтальный скролл.
11. Пройти короткую регрессию:
- Mark paid / Undo paid
- RU/EN persistence
- personal/family workspace behavior
- owner-only admin visibility
- premium baseline surfaces
- bug report flow

## Git Bash commands

```bash
git status
git add src/components/app/app-shell.tsx src/components/app/landing-screen.tsx src/components/app/payments-dashboard-section.tsx src/components/app/recurring-payments-section.tsx src/lib/i18n/localization.tsx docs/reports/internal_version_history.md docs/reports/phase_19B_primary_actions_emphasis_surface_hierarchy_polish.md
git commit -m "phase19b: strengthen primary action emphasis and surface hierarchy on home/reminders"
git push origin main
```

## Env / migrations

- New env vars: not required.
- DB migrations: not required.

## Encoding safety check

Checked touched files:
- `src/components/app/app-shell.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-dashboard-section.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/lib/i18n/localization.tsx`
- `docs/reports/internal_version_history.md`
- `docs/reports/phase_19B_primary_actions_emphasis_surface_hierarchy_polish.md`

Result:
- UTF-8 preserved.
- No mojibake introduced in touched RU strings.

## Pre-report self-check against prompt

1. Goal (primary action emphasis + hierarchy polish) — PASS.
2. Strict scope (UI-first, no broad logic rewrite) — PASS.
3. Non-negotiable preserves (core flows + sensitive fixes) — PASS.
4. Home and Reminders receive clearer action hierarchy — PASS.
5. App-like direction strengthened without noisy overgrowth — PASS.
6. Validation executed and passed — PASS.
