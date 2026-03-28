# Phase 20C — Reminders Surface Simplification on System Rails

- Date: 2026-03-29
- Project: Payment Control Telegram Mini App
- Source-of-truth used: `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Confirmed baseline considered in this pass: Phase 19B (manual verified), Phase 19C (manual verified), Phase 20B (manual verified)
- Pass type: controlled UI-first surface simplification (no business-logic rewrite)

## Objective of the pass

Упростить именно видимую структуру Reminders, используя shared primitive system из 20B, чтобы экран стал:

1. более action-first;
2. легче для первичного сканирования;
3. с более явным разделением “что делать сейчас” vs “что вторично”;
4. менее похожим на management/control surface.

## Files changed

1. `src/components/app/recurring-payments-section.tsx`
2. `docs/reports/internal_version_history.md`
3. `docs/reports/phase_20C_reminders_surface_simplification_on_system_rails.md` (this report)

## How Reminders surface structure was simplified

### 1) Top-level composition cleanup

Changed in `src/components/app/recurring-payments-section.tsx`:

- Workspace/context strip moved into a quieter shared card (`pc-state-card`) so it stays visible but no longer competes with the action lane.
- Quick-actions block remains first, but now reads cleaner as primary lane:
  - due/overdue/active counters are compact and aligned;
  - primary CTA (`Open payment form`) remains the dominant action in that zone.

Effect:
- screen intent is clearer at first glance;
- “what to do now” remains obvious.

### 2) Stronger actionable vs supporting separation

Changed in `src/components/app/recurring-payments-section.tsx`:

- Payments/Subscriptions switcher moved into a quieter supporting container:
  - wrapper now uses `pc-detail-surface`;
  - segmented control remains explicit but visually demoted vs main CTA;
  - visible/total info moved under the segment bar as a low-noise status line.

Effect:
- supporting controls no longer compete with primary action lane and card actions.

### 3) Reminder card scan simplification

Changed in `src/components/app/recurring-payments-section.tsx`:

- Card top area reduced from multi-chip overload to a clearer structure:
  - title + compact type/cadence line;
  - amount shown in one stable chip on the right;
  - state chips reduced to meaningful current state (paid/unpaid + actionable/paused when relevant).
- Scope/type moved into `Details and actions` section as secondary metadata instead of always-visible top-level noise.
- `Details and actions` framing aligned with shared system (`pc-state-card`) so secondary info feels intentionally shadowed.

Effect:
- cards are faster to parse on mobile;
- urgency and next action remain visible without excessive competing labels.

### 4) Preserved action model

Kept intact:

- Mark paid / Undo paid remains the dominant row action.
- Edit remains secondary.
- Save as template / Archive / Pause-Resume remain available under details (not promoted to primary lane).

Effect:
- action clarity improved while preserving verified behavior and safety boundaries.

## What was intentionally NOT changed

1. No recurring/payment business logic changes.
2. No backend/server/API changes.
3. No template matching logic changes (strict title-only behavior preserved).
4. No autosuggest overlay behavior changes.
5. No RUB default behavior changes.
6. No help-popover positioning/safety logic changes.
7. No cache/revalidation logic changes from 18A.
8. No workspace/family/admin/premium rule changes.
9. No navigation architecture or onboarding redesign changes.

## Validation executed

1. `npm run lint` — passed
2. `npm run build` — passed

## Risks / follow-up notes

1. Reminders is historically drift-prone; future passes should continue using shared primitives and avoid reintroducing many always-visible chips/blocks.
2. If future feature growth adds more per-card metadata, it should default to secondary/detail surfaces first.
3. Final acceptance still requires live manual review on narrow Telegram WebView widths for scan speed and touch comfort.

## Ready for manual verification

**Yes — code/report ready for manual testing.**

Manual verification is not claimed in this report.

## Manual checklist (RU)

1. Открыть Reminders и проверить первый экран: главный сценарий действий читается сразу.
2. Проверить, что `Open payment form` остаётся самым заметным действием.
3. Проверить карточки платежей:
- меньше визуального шума в верхней зоне;
- статус/срочность читаются быстро;
- Mark paid / Undo paid работают как раньше.
4. Проверить, что переключатель Payments/Subscriptions работает и визуально не конкурирует с main action lane.
5. Проверить, что secondary-метаданные доступны через `Details and actions`.
6. Проверить семейный режим:
- `Who pays` / `Paid by` контекст сохранён;
- экономика/подсказки не сломаны.
7. Перепроверить чувствительные зоны:
- strict title-only autosuggest;
- RUB default;
- help popover viewport safety.

## Git Bash commands

```bash
git status
git add src/components/app/recurring-payments-section.tsx docs/reports/internal_version_history.md docs/reports/phase_20C_reminders_surface_simplification_on_system_rails.md
git commit -m "phase20c: simplify reminders surface on shared system rails"
git push origin main
```

## Env / migrations

- New env vars: not required.
- DB migrations: not required.

## Encoding safety check

Checked touched files:

1. `src/components/app/recurring-payments-section.tsx`
2. `docs/reports/internal_version_history.md`
3. `docs/reports/phase_20C_reminders_surface_simplification_on_system_rails.md`

Result:
- UTF-8 preserved.
- No mojibake introduced in touched RU/EN content.

## Pre-report self-check against prompt/scope

1. Reminders surface simplified structurally, not cosmetically only — PASS.
2. Main action lane preserved and remains dominant — PASS.
3. Actionable vs secondary/supporting areas separated more clearly — PASS.
4. Shared primitive rails from 20B reused (no new one-off local style system) — PASS.
5. No business logic / recurring logic / backend changes — PASS.
6. Sensitive verified flows preserved by scope and validation — PASS.
7. Validation executed (`lint`, `build`) — PASS.
