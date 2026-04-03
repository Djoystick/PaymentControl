# Phase 27C - Action-First Workflow Compression + Cross-Surface Navigation Clarity

- Date: 2026-04-03
- Status: implemented (major action-first UX wave), manual verification completed by user (release-line accepted)
- Scope type: workflow/navigation UX wave on top of accepted 27B system baseline
- Source-of-truth baseline:
  1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
  2. `docs/reports/phase_27A_full_project_audit.md`
  3. `docs/reports/phase_27A_remaining_roadmap_reset.md`
  4. `docs/reports/phase_27B_core_design_system_hardening_and_primary_surface_recomposition.md`
  5. `docs/reports/internal_version_history.md`

## 1) What Was Analyzed

Runtime surfaces inspected for post-27B workflow behavior:
1. `src/components/app/app-shell.tsx`
2. `src/components/app/landing-screen.tsx`
3. `src/components/app/payments-dashboard-section.tsx`
4. `src/components/app/recurring-payments-section.tsx`
5. `src/components/app/payments-activity-section.tsx`
6. `src/components/app/profile-scenarios-placeholder.tsx`
7. `src/lib/i18n/localization.tsx`

Reference used for this pass:
1. `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`
2. Local `ui-ux-pro-max` skill search was used to validate action-first/navigation continuity focus for mobile workflow.

## 2) UX Problems Found After 27B

1. Visual system was stronger, but cross-screen intent was still weak.
2. Home KPI interactions still behaved mostly as local UI toggles, not scenario continuations.
3. Home -> Reminders and Home -> History transitions did not clearly explain why user landed in a specific context.
4. Reminders had strong tools but could still feel like a “toolbox” instead of a short guided action session.
5. History lacked a lightweight focus mode for “just paid events” vs “recent updates” continuity from Home.

## 3) Why This Action-First Approach

Chosen direction:
1. Keep accepted 27B visual grammar and avoid redesign churn.
2. Add an explicit cross-surface navigation context layer (`intent + reason`) so transitions carry meaning.
3. Reframe Home from local filtering toward direct scenario routing.
4. Make Reminders and History consume entry intent and show a compact “continue flow” marker.

This keeps UI calm while reducing taps and context loss.

## 4) What Was Changed

## 4.1 Cross-Surface Navigation Context Foundation

File:
1. `src/components/app/app-shell.tsx`

Changes:
1. Added typed navigation intent model:
   - `reminders_add_payment`
   - `reminders_action_now`
   - `reminders_upcoming`
   - `reminders_all`
   - `history_recent_updates`
   - `history_recent_paid`
2. Added typed event payload model (`AppTabNavigationEventDetail`).
3. Added durable context queue/consume helpers (localStorage-backed per-tab context).
4. Preserved normal tab navigation while allowing target screens to consume context after mount.

Result:
1. navigation continuity now survives tab switch timing and remains explicit at target screens.

## 4.2 Home: Action-First Recomposition

Files:
1. `src/components/app/landing-screen.tsx`
2. `src/components/app/payments-dashboard-section.tsx` (compact Home variant)

Changes:
1. Landing primary CTA now routes to Reminders with explicit add-payment intent.
2. Home compact KPI cards now route directly to task contexts instead of local “just filter here” behavior:
   - Total -> Reminders all
   - Upcoming -> Reminders upcoming
   - Overdue -> Reminders action-now
3. Added explicit action row:
   - primary: open Reminders (action-now aware)
   - secondary: open History updates
4. Home empty state now includes direct add-first-payment route into Reminders add flow.
5. Kept 27B visual system, but changed interaction semantics toward scenario continuation.

Result:
1. Home now answers “what next” faster and routes to the right workspace with fewer extra steps.

## 4.3 Reminders: Workflow Compression + Entry Continuity

File:
1. `src/components/app/recurring-payments-section.tsx`

Changes:
1. Added intent consumption on screen entry (`consumeTabNavigationContext("reminders")`).
2. Auto-applies target working context on arrival:
   - action-now / upcoming / all / add-payment
3. Added compact “Continue flow” marker with clear reset action.
4. Improved top action lane:
   - retained primary add/edit entry,
   - added one-tap action-now focus control with count,
   - demoted refresh to quieter secondary role.
5. Improved no-results focus state with immediate “Show all cards” recovery action.
6. Preserved all core business flows (add/edit/delete, mark paid/undo paid, etc.).

Result:
1. Reminders now starts in the right context more often and reduces context-hunting friction.

## 4.4 History: Focused Continuity from Home

File:
1. `src/components/app/payments-activity-section.tsx`

Changes:
1. Added intent consumption on entry (`consumeTabNavigationContext("history")`).
2. Added lightweight focus controls:
   - All events
   - Changes
   - Paid events
3. Added compact “Continue flow” marker with clear reset action.
4. Added focused empty-state recovery action (“Show all events”).

Result:
1. Home -> History transitions now feel purposeful instead of generic tab switching.

## 4.5 Profile

File:
1. `src/components/app/profile-scenarios-placeholder.tsx`

Changes in this pass:
1. No major feature/path changes.
2. Kept calm secondary role intact.
3. Donation/supporter/help blocks were not promoted; baseline donation-only semantics preserved.

## 4.6 Localization Parity

File:
1. `src/lib/i18n/localization.tsx`

Changes:
1. Added RU mappings for new action-first and continuity copy keys used in Home/Reminders/History.
2. Preserved RU/EN runtime parity for touched strings.

## 5) How Transitions Improved

1. Home -> Reminders now opens explicit operational focus (all/upcoming/action-now/add-flow) instead of making users re-filter manually.
2. Home -> History now opens meaningful review focus and keeps context visible.
3. Entry context is visible but quiet (“Continue flow”), and removable in one tap.
4. Focus-empty states now suggest immediate recovery actions.

## 6) What Was Intentionally Not Changed

1. No Premium/entitlement/claim/unlock behavior reintroduced.
2. No donation/paywall/access-gating semantics added.
3. No DB migrations or API contract changes.
4. No broad visual redesign (27B system retained as the visual base).
5. No onboarding overhaul (replay/help remained intact).

## 7) Risks / Regression Watchlist

1. Navigation context persistence:
   - verify stale context is not accidentally reused after manual tab switches.
2. Reminders context-entry behavior:
   - verify add-payment intent always opens composer reliably.
3. History focus filters:
   - verify counts and filtered list remain coherent across refreshes.
4. RU strings:
   - verify all new keys appear correctly in Russian runtime.

## 8) Manual Verification Notes (Concise)

1. Home:
   - tap Total/Upcoming/Overdue cards and verify landing context in Reminders.
   - tap “Open History updates” and verify History focus/context marker.
2. Reminders:
   - verify entry focus marker text and reset action.
   - verify action-now quick button and empty-focus recovery.
   - verify add-payment intent opens composer.
3. History:
   - verify focus segments (All/Changes/Paid) and focused empty-state recovery.
4. Core flows:
   - re-check add/edit/delete payment and mark paid/undo paid remain unchanged.

## 9) Validation

Executed:
1. `npm run lint` - pass
2. `npm run build` - pass

## 10) Self-Check Against Phase 27C Acceptance

1. Shorter daily workflow path: yes.
2. Stronger Home/Reminders/History linkage: yes.
3. Clearer action hierarchy: yes.
4. More readable transition meaning between screens: yes.
5. Less UX friction in repeated use: yes (context routing + focused recovery actions).
6. Core flows preserved: yes.
