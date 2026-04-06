# Phase 29E - App-Wide Navigation Consistency + Context Return Polish

- Date: 2026-04-06
- Status: implemented, pending manual verification
- Scope: navigation-first UX polish wave on top of accepted 29B/29C and implemented 29D
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline (28A-28Q)
  - 29A/29A.1 language+analytics runtime truth

## 1) Resume Context and Source-of-Truth Alignment

This pass continued an interrupted session (no restart from zero).  
Before post-resume edits, the workspace already contained:
1. Accepted 29B/29C structural UX cleanup.
2. Implemented 29D daily-flow simplification.
3. Existing uncommitted UI/doc updates in the same files touched by 29C/29D.

Used as required references before implementation:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `docs/reports/phase_29B_travel_surface_context_isolation_and_action_deduplication.md`
4. `docs/reports/phase_29C_app_wide_multilayer_ui_cleanup_and_icon_alignment_normalization.md`
5. `docs/reports/phase_29D_app_wide_daily_flow_simplification_and_surface_hierarchy_polish.md`
6. Local skill: `.codex/skills/ui-ux-pro-max/SKILL.md` + guideline datasets (`ux-guidelines.csv`, `web-interface.csv`, `stacks/nextjs.csv`) as navigation/layout quality reference.

## 2) Navigation Seams Found During Resume Audit

Focused seams that still impacted daily navigation clarity:
1. Context markers were implemented differently between `Recurring` and `History` (similar meaning, different visual rhythm).
2. `Selected trip` had layered tabs but no compact current-layer marker/reset affordance near top context.
3. `Home` had strong CTA routing but lacked a compact and predictable "continue from last working context" lane.
4. Reset/return affordances existed, but were not fully normalized into one compact reusable pattern.

## 3) What Was Already Done Before Resume (Preserved)

Preserved without rollback:
1. 29B: isolated Travel create/join, selected-trip isolation, no duplicate join entry points.
2. 29C: root surface cleanup + icon normalization + duplicate structural icon reduction.
3. 29D: shorter `Recurring`/`History` roots and selected-trip top density reduction via secondary layers.

No accepted behavior from 29B/29C/29D was removed.

## 4) What Was Completed After Resume

## 4.1 Unified Context Row Pattern (Recurring + History + Travel)
Added one compact navigation pattern for active context state:
1. New shared CSS utilities:
   - `pc-context-row`
   - `pc-context-row-main`
   - `pc-context-row-actions`
2. Applied to:
   - `Recurring` current flow/focus banner,
   - `History` current flow/focus banner,
   - `Selected trip` top context row.

Result: same visual language for "where I am now + what to do next/reset".

## 4.2 Current-Context + Quick Reset / Return Consistency
1. `Recurring`:
   - context row now appears for either:
     - restored/entry flow reason, or
     - non-default focus.
   - compact focus state label added (`Current focus`).
   - `Clear focus` now uses one callback path.
2. `History`:
   - same behavior parity as Recurring (reason or non-default focus).
   - compact focus state label added (`Current focus`).
   - `Clear focus` behavior normalized.
3. `Travel selected trip`:
   - added compact row with `Current layer` marker (`Expenses / Settlements / History`).
   - added explicit quick reset action (`Reset layer`) back to `Expenses`.
   - kept direct `Back to trips` in the same context row for predictable return path.

## 4.3 Home as a More Practical Routing Hub
Added compact "continue" lane on Home snapshot:
1. Reads last valid runtime context (`readRuntimeSnapshot`) with workspace compatibility.
2. Shows concise destination:
   - `Continue in {tab}` + optional intent chip (`Action now`, `Upcoming`, `Paid events`, etc.).
3. Provides two explicit actions:
   - `Continue where you left off` (routes to remembered working context),
   - `Start clean` (clears runtime snapshot + queued tab contexts).

This improves continuity without introducing hidden automation.

## 4.4 Visual Navigation Consistency Polish
1. Normalized spacing/hierarchy of context rows and action clusters with shared utility classes.
2. Kept compact layout (mobile-first) and avoided adding always-visible long helper text.
3. Preserved existing icon alignment fixes from 29C (no regression introduced).

## 5) Files Updated in This Resume Completion

1. `src/app/globals.css`
2. `src/components/app/payments-dashboard-section.tsx`
3. `src/components/app/recurring-payments-section.tsx`
4. `src/components/app/payments-activity-section.tsx`
5. `src/components/app/travel-group-expenses-section.tsx`
6. `src/lib/i18n/localization.tsx`
7. `docs/reports/internal_version_history.md`

Plus this report file:
8. `docs/reports/phase_29E_app_wide_navigation_consistency_and_context_return_polish.md`

## 6) What Was Intentionally NOT Changed

1. No DB schema/API/domain logic changes.
2. No shell rewrite and no new root tabs.
3. No recurring/travel model merge.
4. No bot-facing manual-only layer changes (`BotFather`, `/start`, menu button, profile media/text).
5. No changes to 29A/29A.1 language-source model or analytics bootstrap model.
6. No new monetization logic (premium/paywall/entitlement/unlock).

## 7) Manual Verification Notes (Telegram Runtime)

1. Home:
   - verify `Continue in {tab}` row appears only when a valid non-home runtime context exists,
   - verify continue action routes to expected working state,
   - verify `Start clean` clears this lane.
2. Recurring:
   - verify compact context row for restored/non-default focus,
   - verify `Clear focus` returns to `All`,
   - verify `Start clean` still resets context memory as before.
3. History:
   - verify same context-row behavior parity with Recurring,
   - verify reset and clean actions are predictable.
4. Travel selected trip:
   - verify `Current layer` reflects active workspace layer,
   - verify `Reset layer` returns to `Expenses`,
   - verify `Back to trips` works from this row and preserves 29B isolation.
5. Cross-surface:
   - verify no icon overflow/duplicate icon regressions on updated rows/buttons.

## 8) Risks / Regression Watchlist

1. Home continue lane should not appear with stale/invalid context after workspace switches.
2. Extra context rows should remain compact on narrow Telegram viewports (no action wrapping chaos).
3. `Reset layer` in selected trip must not conflict with explicit tab switch intent.
4. Keep an eye on RU string wrapping for new labels on very small devices.

## 9) Checks Run

1. `npm run lint` - pass (existing warnings only: `@next/next/no-img-element` in receipt preview areas)
2. `npm run build` - pass
3. Targeted tests:
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/finalization.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/split.test.ts` - pass

## 10) Acceptance Self-Check

1. `ui-ux-pro-max` used as working reference - done.
2. 29B accepted behavior preserved - done.
3. 29C accepted behavior preserved - done.
4. 29D implemented behavior preserved - done.
5. Secondary-layer/context navigation patterns are more uniform - done.
6. Current-context/reset/return clarity improved on key flows - done.
7. Home strengthened as predictable routing hub - done.
8. No baseline/domain/language/analytics regressions introduced - done.
