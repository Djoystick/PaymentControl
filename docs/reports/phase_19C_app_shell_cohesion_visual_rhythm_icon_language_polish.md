# Phase 19C — App Shell Cohesion + Visual Rhythm + Icon Language Polish

- Date: 2026-03-28
- Project: Payment Control Telegram Mini App
- Source-of-truth used: `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Baseline status in this pass context: latest manually verified step = **Phase 19B**
- Pass type: controlled UI-first visual/system polish (no business-logic rewrite)

## Pass objective

Сделать интерфейс более цельным и app-like на уровне shell и основных пользовательских поверхностей (`Home / Reminders / History / Profile`) через:

1. более ровный visual rhythm;
2. более согласованный surface treatment;
3. более целостный icon language для быстрых распознаваемых действий;
4. снижение остаточного website-like ощущения;
5. сохранение всех verified flows и чувствительных фиксов.

## Files changed

1. `src/app/globals.css`
2. `src/components/app/app-shell.tsx`
3. `src/components/app/payments-activity-section.tsx`
4. `src/components/app/profile-scenarios-placeholder.tsx`
5. `src/components/app/recurring-payments-section.tsx`
6. `docs/reports/internal_version_history.md`
7. `docs/reports/phase_19C_app_shell_cohesion_visual_rhythm_icon_language_polish.md` (this report)

## Files inspected without logic changes

1. `src/lib/payments/starter-templates.ts`
2. `src/components/app/help-popover.tsx`
3. `src/lib/payments/client-cache.ts`

Reason:
- explicit sensitivity re-check from anchor/prompt (template behavior, popover safety, cache safety).
- no code changes were applied in these files during this pass.

## Visual/system decisions made and why

### A) Shared shell cohesion

Changed in:
- `src/components/app/app-shell.tsx`
- `src/app/globals.css`

What changed:

1. Refined shell surface treatment:
- calmer but more cohesive shell gradient (`app-surface -> app-surface-soft`),
- stronger top context container consistency,
- preserved compact safe-area and bottom tab behavior.

2. Added lightweight screen-enter transition (`.app-screen-enter`) with reduced-motion safety.

Why:
- screens now feel more like one app context instead of disconnected blocks;
- state changes between tabs read as deliberate app transitions without routing rewrites.

### B) History cohesion + icon language polish

Changed in:
- `src/components/app/payments-activity-section.tsx`

What changed:

1. Replaced details-heavy context block with compact always-readable context cards.
2. Added icon-coded activity badges by event type:
- created -> `add`
- updated -> `edit`
- archived -> `archive`
- paid cycle -> `check`
3. Improved list item treatment (bordered cards, stronger separation).
4. Refresh action now uses coherent iconized button treatment.

Why:
- faster scanning of event semantics;
- less website-like disclosure friction;
- better parity with Home/Reminders card language.

### C) Profile surface rhythm polish

Changed in:
- `src/components/app/profile-scenarios-placeholder.tsx`

What changed:

1. Removed heavy outer profile wrapper feel and split into clearer top-level cards.
2. Normalized card shape/weight for major profile blocks (`rounded-3xl`, coherent border/shadow rhythm).
3. Added lightweight functional icons to key profile actions:
- send bug report,
- workspace switch,
- generate invite,
- create family workspace,
- accept invite,
- refresh context,
- copy token.

Why:
- Profile now feels visually aligned with Home/Reminders/History surfaces;
- icon usage improves recognition for frequent controls without decorative overload.

### D) Reminders follow-up polish (within existing model)

Changed in:
- `src/components/app/recurring-payments-section.tsx`

What changed:

1. Added subtle depth for non-urgent cards to reduce flatness.
2. Added icon to `Details and actions` summary for stronger action grouping recognition.

Why:
- improves integration with overall shell rhythm;
- keeps Reminders model intact while enhancing legibility and consistency.

## What was intentionally NOT changed

1. No payment/recurring/subscription business logic rewrites.
2. No template logic rewrites.
3. No autosuggest behavior rewrites.
4. No reminder delivery/backend/server changes.
5. No onboarding overhaul.
6. No premium/paywall redesign.
7. No gift-campaign formal verification work.
8. No navigation architecture rewrite.

## Explicit preserve checks

Preserved by scope:
- 4-tab shell behavior,
- Mark paid / Undo paid flows,
- RU/EN + persistence,
- theme switching,
- workspace switching/create/join,
- one-time family invite behavior,
- premium/admin foundations,
- bug report flow,
- help popover viewport safety,
- safe caching from 18A,
- strict title/name-only autosuggest from 19A.2,
- Home -> Reminders path from 19B.

## Validation executed

1. `npm run lint` — passed
2. `npm run build` — passed

Build included TypeScript stage and completed successfully.

## Version-history / changelog handling

1. Internal version history updated:
- `docs/reports/internal_version_history.md`
2. Public changelog file is not currently established as active project convention in repo;
- this pass is recorded in internal history + full phase report.

## Risks / follow-up notes

1. New shell enter animation is intentionally light; still should be checked on low-end mobile WebView smoothness.
2. Profile received icon upgrades for clarity; further icon additions should remain strict to avoid clutter.
3. History context is now always visible in compact cards; if future density grows, this block may need adaptive collapsing.

## Ready for manual verification

**Yes — pass is ready for manual testing (code/report readiness).**

Manual verification is not claimed in this report.

## Manual checklist (RU)

1. Проверить переключение всех 4 вкладок: переходы должны ощущаться цельнее и более app-like.
2. Проверить Home -> Reminders путь (должен работать как раньше, без регрессий).
3. Проверить History:
- новые контекстные карточки читаются быстро,
- события имеют корректные иконки/лейблы,
- кнопка обновления работает.
4. Проверить Profile:
- блоки выглядят более единообразно,
- ключевые действия с иконками не перегружают экран,
- bug report/workspace/invite actions работают как раньше.
5. Проверить Reminders:
- модель не изменилась,
- карточки и summary выглядят согласованнее,
- management-heavy блоки не вернулись на main lane.
6. Проверить регрессию чувствительных зон:
- strict title-only autosuggest,
- popover viewport safety,
- RUB default,
- caching behavior.

## Git Bash commands

```bash
git status
git add src/app/globals.css src/components/app/app-shell.tsx src/components/app/payments-activity-section.tsx src/components/app/profile-scenarios-placeholder.tsx src/components/app/recurring-payments-section.tsx docs/reports/internal_version_history.md docs/reports/phase_19C_app_shell_cohesion_visual_rhythm_icon_language_polish.md
git commit -m "phase19c: polish shell cohesion, visual rhythm, and icon language"
git push origin main
```

## Env / migrations

- New env vars: not required.
- DB migrations: not required.

## Encoding safety check

Checked touched files:
- `src/app/globals.css`
- `src/components/app/app-shell.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `docs/reports/internal_version_history.md`
- `docs/reports/phase_19C_app_shell_cohesion_visual_rhythm_icon_language_polish.md`

Result:
- UTF-8 preserved.
- No mojibake introduced in touched RU strings.

## Pre-report self-check against prompt/scope

1. Exact phase intent (shell cohesion + visual rhythm + icon language polish) — PASS.
2. Controlled UI-first scope, no business-logic rewrite — PASS.
3. Preserve constraints and sensitive verified foundations — PASS.
4. Home/Reminders/History/Profile visual coherence improved without feature expansion — PASS.
5. Validation executed and passed — PASS.
6. Pass left in deployable/documented state — PASS.
