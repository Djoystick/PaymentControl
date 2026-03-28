# Phase 17C — Reminders Action-Lane Cleanup

- Date: 2026-03-28
- Project: Telegram Mini App `Payment Control`
- Pass type: Narrow implementation pass (Wave 1 from 17B)
- Primary UI guidance source: `.codex/skills/ui-ux-pro-max/SKILL.md`
- Planning baseline used: `docs/reports/phase_17B_reminders_rethink_analysis.md`
- Master anchor preserved: `docs/payment_control_master_anchor_2026-03-28.md`

## What Was Changed

1. Action/surface toggle was demoted from a dominant two-button segmented switch to a compact secondary control.
- Replaced the large top-level mode switch with a compact contextual toggle (`Setup and templates` / `Main action`).
- Kept `act` mode as the default visual lane.

2. Removed forced setup takeover on empty lists.
- Deleted auto-switch behavior that moved the screen to setup when `payments.length === 0`.
- Result: default screen remains action-first even in empty-state scenarios.

3. Setup container was flattened to reduce disclosure depth.
- Replaced outer setup `<details>` with a regular secondary container.
- Kept family controls, reminder operations, and template management accessible, but no longer wrapped by an additional disclosure layer.

4. Card-level action hierarchy was rebalanced.
- Promoted `Mark paid / Undo paid` to the first and visually dominant CTA (accent button).
- Demoted secondary controls (`Edit`, `Save as template`, `Archive`, `Pause/Resume`) via muted styling so they no longer compete with the daily primary action.

## Why It Was Changed

The pass targets the core 17B diagnosis: Reminders default surface was still too management-heavy. These changes reduce permanent decision pressure on the everyday lane and make the daily "open → scan → mark/undo → leave" flow more obvious on mobile.

## Mapping To 17B Analysis

1. `Role conflation` mitigation
- Default lane now emphasizes due-state + action list + primary cycle action.
- Setup/management remains accessible but visibly secondary.

2. `Progressive disclosure debt` mitigation
- Removed one nesting level in setup by dropping outer `<details>` shell.

3. `Primary vs secondary action clarity`
- `Mark paid / Undo paid` now has clear primary visual weight.
- Secondary operations no longer visually dominate card action rows.

4. `Template block pressure reduction`
- Template lists are not on the default action surface; they stay behind setup mode.

## Files Touched

- `src/components/app/recurring-payments-section.tsx`
- `docs/reports/phase_17C_action_lane_cleanup.md` (this report)

## What Was Intentionally NOT Changed

1. Business/product logic was not changed:
- Mark paid / Undo paid behavior
- recurring payment/subscription core flow
- family/single workspace rules
- who pays / paid by semantics
- premium/admin/onboarding/bug-report boundaries

2. Out-of-scope items were not implemented:
- inline template autocomplete intelligence
- demo mode
- large create/edit architecture rewrite
- backend/API/DB behavior changes

## Validation Results

1. `npm run lint` — passed.
2. `npm run build` — passed.
3. No SSR/client locale handling changes were made in this pass.

## Manual Verification Checklist (RU)

1. Открыть `Reminders` и проверить, что по умолчанию экран выглядит action-first (контекст, snapshot, список, mark/undo, add entry).
2. Убедиться, что постоянного большого списка шаблонов на дефолтной поверхности нет.
3. Проверить, что `Setup and templates` доступен, но визуально вторичен.
4. Проверить, что `Reminder operations and visibility` доступен через setup и не конкурирует с повседневным сценарием.
5. На карточках проверить приоритет `Mark paid / Undo paid` над вторичными кнопками.
6. Проверить `Mark paid` и `Undo paid` на payment/subscription карточках.
7. Проверить RU/EN переключение на изменённых участках (`Main action`, `Setup and templates`, card actions).
8. Проверить отсутствие горизонтального скролла на мобильной ширине.
9. Проверить пустое состояние: экран не должен принудительно переключаться в setup.

## Risks / Warnings

1. `Setup` по-прежнему содержит объёмные management-блоки; они уже вторичны, но всё ещё могут быть тяжёлыми при частом открытии.
2. Шаблоны пока остаются list-based внутри setup (inline intelligence не внедрён в 17C по ограничению scope).

## Next Logical Step

Phase 17D (narrow): implement template interaction modernization inside create/edit only:
- inline title suggestions + recent chips,
- keep full template management in secondary setup area,
- no business-logic changes.
