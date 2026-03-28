# Phase 20B — Shared Primitive Normalization

- Date: 2026-03-28
- Project: Payment Control Telegram Mini App
- Source-of-truth used: `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Additional accepted baseline considered: Phase 19B (manual verified), Phase 19C (manual verified)
- Pass type: controlled UI-system normalization (no business-logic rewrite)

## Objective of the pass

Нормализовать общие UI-примитивы и визуальное поведение основных пользовательских поверхностей (`Home / Reminders / History / Profile`), чтобы экраны собирались из одной согласованной системы:

1. section/surface containers;
2. action/state cards;
3. primary/secondary/quiet buttons;
4. segmented controls;
5. detail/secondary containers;
6. empty/loading states;
7. spacing/elevation rhythm.

## Files changed

1. `src/app/globals.css`
2. `src/components/app/landing-screen.tsx`
3. `src/components/app/payments-dashboard-section.tsx`
4. `src/components/app/payments-activity-section.tsx`
5. `src/components/app/recurring-payments-section.tsx`
6. `src/components/app/profile-scenarios-placeholder.tsx`
7. `docs/reports/internal_version_history.md`
8. `docs/reports/phase_20B_shared_primitive_normalization.md` (this report)

## What shared primitives were normalized

### 1) Global primitive layer (single source)

Added in `src/app/globals.css`:

- `pc-surface`
- `pc-surface-soft`
- `pc-detail-surface`
- `pc-state-card`
- `pc-empty-state`
- `pc-btn-primary`
- `pc-btn-secondary`
- `pc-btn-quiet`
- `pc-segmented`
- `pc-segment-btn`
- `pc-segment-btn-active`

Result:
- unified border/radius/padding/shadow rhythm;
- explicit primary/secondary/quiet action hierarchy;
- consistent segment-control baseline;
- consistent compact empty/loading visual language.

### 2) Home normalization

Changed in:
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-dashboard-section.tsx`

What changed:
- Home surfaces moved to shared `pc-surface` framing;
- compact snapshot/info cards normalized via `pc-state-card` / `pc-detail-surface`;
- empty states normalized via `pc-empty-state`;
- primary CTA and refresh/actions moved to shared button primitives.

### 3) Reminders normalization

Changed in:
- `src/components/app/recurring-payments-section.tsx`

What changed:
- main section switched to shared `pc-surface`;
- quick-action lane + subscription insights + composer frame normalized with `pc-detail-surface`;
- summary/stat cards normalized with `pc-state-card`;
- primary/secondary/quiet actions normalized (`pc-btn-primary`, `pc-btn-secondary`, `pc-btn-quiet`);
- payment/subscription switch normalized with shared segmented primitives (`pc-segmented`, `pc-segment-btn*`);
- loading/empty list messages normalized with `pc-empty-state`.

Important:
- action model from prior passes preserved (no return to management-heavy default lane).

### 4) History normalization

Changed in:
- `src/components/app/payments-activity-section.tsx`

What changed:
- history section + context blocks normalized to `pc-surface` and `pc-detail-surface`;
- context/event stat cards normalized to `pc-state-card`;
- empty states normalized to `pc-empty-state`;
- refresh action normalized to shared secondary button.

### 5) Profile normalization

Changed in:
- `src/components/app/profile-scenarios-placeholder.tsx`

What changed:
- major profile blocks normalized to `pc-surface` / `pc-surface-soft`;
- secondary family/setup detail frame normalized to `pc-detail-surface`;
- key actionable controls normalized into shared button family (`pc-btn-secondary`/`pc-btn-quiet`);
- reduced styling drift between Profile and other tabs while preserving existing flow structure.

## What was intentionally NOT changed

1. No business logic changes.
2. No recurring-cycle logic changes.
3. No template matching/autosuggest logic changes.
4. No RUB default logic changes.
5. No help-popover positioning logic changes.
6. No cache/revalidation strategy changes from 18A.
7. No backend/API/admin/premium permission model changes.
8. No navigation architecture changes.
9. No onboarding redesign.

## Validation executed

1. `npm run lint` — passed
2. `npm run build` — passed

## Risks / follow-up notes

1. New primitive classes now centralize visual treatment; future passes should reuse them instead of adding local one-off utility chains.
2. Some legacy local style fragments still exist in deep sub-blocks; they can be migrated incrementally in future narrow UI passes.
3. Final visual acceptance still requires live manual check on mobile Telegram WebView widths.

## Ready for manual verification

**Yes — code/report readiness confirmed.**

Manual verification is not claimed in this report.

## Manual checklist (RU)

1. Проверить все 4 вкладки: Home / Reminders / History / Profile выглядят как единая система поверхностей.
2. Проверить Reminders:
- основной action-lane сохранён;
- сегмент-переключатель Payments/Subscriptions работает;
- кнопки Mark paid / Undo paid без регрессий.
3. Проверить Home:
- summary-карточки и CTA визуально согласованы;
- drill-down сегменты и переход в Reminders работают как раньше.
4. Проверить History:
- контекстные карточки и лента событий читаемы;
- refresh работает.
5. Проверить Profile:
- workspace/family invite/bug-report/premium блоки работают без логических изменений.
6. Проверить чувствительные зоны:
- strict title-only autosuggest;
- RUB default;
- viewport-safe help popover;
- cache/revalidation поведение.

## Git Bash commands

```bash
git status
git add src/app/globals.css src/components/app/landing-screen.tsx src/components/app/payments-dashboard-section.tsx src/components/app/payments-activity-section.tsx src/components/app/recurring-payments-section.tsx src/components/app/profile-scenarios-placeholder.tsx docs/reports/internal_version_history.md docs/reports/phase_20B_shared_primitive_normalization.md
git commit -m "phase20b: normalize shared UI primitives across core app surfaces"
git push origin main
```

## Env / migrations

- New env vars: not required.
- DB migrations: not required.

## Encoding safety check

Checked touched files:

1. `src/app/globals.css`
2. `src/components/app/landing-screen.tsx`
3. `src/components/app/payments-dashboard-section.tsx`
4. `src/components/app/payments-activity-section.tsx`
5. `src/components/app/recurring-payments-section.tsx`
6. `src/components/app/profile-scenarios-placeholder.tsx`
7. `docs/reports/internal_version_history.md`
8. `docs/reports/phase_20B_shared_primitive_normalization.md`

Result:
- UTF-8 preserved.
- No mojibake introduced in touched RU/EN content.

## Pre-report self-check against prompt/scope

1. Phase goal (shared primitive normalization) — PASS.
2. Scope remained UI-system only, no logic/backend rewrite — PASS.
3. Home/Reminders/History/Profile moved to more coherent primitive family — PASS.
4. Primary/secondary/quiet action hierarchy normalized where touched — PASS.
5. Segmented controls normalized in Reminders — PASS.
6. Empty/loading/error style normalization applied on touched surfaces — PASS.
7. Sensitive verified behaviors preserved by implementation scope and validation — PASS.
8. Validation executed (`lint`, `build`) — PASS.
