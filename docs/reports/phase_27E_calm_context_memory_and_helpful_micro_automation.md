# Phase 27E - Calm Context Memory + Helpful Micro-Automation

- Date: 2026-04-04
- Status: implemented (major UX utility wave), pending manual verification
- Scope type: one cohesive runtime continuity/automation pass on top of accepted 27B/27C/27D baselines
- Source-of-truth baseline:
  1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
  2. `docs/reports/phase_27A_full_project_audit.md`
  3. `docs/reports/phase_27A_remaining_roadmap_reset.md`
  4. `docs/reports/phase_27B_core_design_system_hardening_and_primary_surface_recomposition.md`
  5. `docs/reports/phase_27C_action_first_workflow_compression_and_cross_surface_navigation_clarity.md`
  6. `docs/reports/phase_27D_guided_reminders_workspace_and_progressive_disclosure_simplification.md`
  7. `docs/reports/internal_version_history.md`

## 1) What Was Analyzed

Runtime/app files:
1. `src/components/app/app-shell.tsx`
2. `src/components/app/landing-screen.tsx`
3. `src/components/app/payments-dashboard-section.tsx`
4. `src/components/app/recurring-payments-section.tsx`
5. `src/components/app/payments-activity-section.tsx`
6. `src/components/app/profile-scenarios-placeholder.tsx`
7. `src/lib/auth/client.ts`
8. `src/lib/auth/types.ts`
9. `src/app/api/support/bug-report/route.ts`
10. `src/hooks/use-current-app-context.ts`
11. `src/lib/config/client-env.ts`
12. `src/lib/config/server-env.ts`
13. `src/lib/i18n/localization.tsx`

Design-intelligence reference:
1. `ui-ux-pro-max` skill was used.
2. Skill executable search script remained blocked in this environment (python file-access restriction), so local skill datasets (`.codex/skills/ui-ux-pro-max/data/*`) were used as reference fallback for continuity/micro-automation/progressive-help patterns.

## 2) Repetitive Manual Steps Found

1. After tab switch/app reopen, users could lose useful focus state on Reminders/History and re-apply filters manually.
2. 27C continuity was event-based and useful, but mostly one-shot; no durable per-workspace recovery layer existed.
3. Home did not offer a calm "continue where I left off" path.
4. Bug report context was already good (profile/workspace/language/screen), but lacked richer runtime UI state (theme, focus/view context, last transition reason).
5. Family/workspace scenarios still required repeated re-targeting after context loss.

## 3) Why This Calm-Automation Approach

Chosen strategy:
1. Add one shared context-memory layer and wire it into Home/Reminders/History.
2. Keep automation reversible and explicit (`Start clean` reset paths).
3. Prefer contextual, one-time guidance hints over persistent banners/tutorial walls.
4. Improve debugging signal (bug report context payload) without expanding user form friction.

This keeps the accepted donation-only/unrestricted product model unchanged while reducing repeated manual steps.

## 4) What Changed - Context Memory and Recovery

## 4.1 New shared memory foundation

Added:
1. `src/lib/app/context-memory.ts`

Provides:
1. runtime snapshot memory (`tab`, `intent`, `reason`, `workspaceId`, timestamp),
2. per-workspace Reminders context memory,
3. per-workspace History context memory,
4. one-time reminders guidance flags,
5. global clear/reset helper (`clearAllContextMemory`),
6. bug-report runtime context payload builder.

Safety model:
1. timestamp freshness gate (12h default),
2. workspace-aware recovery to avoid cross-workspace mismatch,
3. tolerant parse/validation of localStorage payloads.

## 4.2 App shell continuity hardening

Updated:
1. `src/components/app/app-shell.tsx`

Changes:
1. navigation payload now carries optional `workspaceId`,
2. runtime snapshot is remembered on tab/event navigation,
3. when user enters Home from another tab, previous working tab is preserved as continuation target instead of being overwritten by `home`.

## 4.3 Home continuation affordance

Updated:
1. `src/components/app/landing-screen.tsx`
2. `src/components/app/profile-scenarios-placeholder.tsx` (Home wiring)
3. `src/components/app/payments-dashboard-section.tsx` (workspace-aware navigation intents)

Changes:
1. Home now shows a compact "Continue where you left off" block when fresh context exists,
2. one-tap continue action routes back to saved tab/intent,
3. explicit `Start clean` action clears remembered context.

## 4.4 Reminders recovery and persistence

Updated:
1. `src/components/app/recurring-payments-section.tsx`

Changes:
1. consumes one-shot 27C navigation context when present and workspace-compatible,
2. otherwise restores last per-workspace Reminders context,
3. persists current Reminders context continuously (view/focus/reason),
4. writes runtime snapshot for Home continuation,
5. adds explicit `Start clean` reset path,
6. adds restored-context indicator for clarity.

## 4.5 History recovery and persistence

Updated:
1. `src/components/app/payments-activity-section.tsx`

Changes:
1. consumes one-shot navigation context when valid for current workspace,
2. otherwise restores last per-workspace History focus context,
3. persists History focus/reason state,
4. writes runtime snapshot for continuation,
5. adds explicit `Start clean` reset path,
6. adds restored-context indicator.

## 5) What Changed - Quiet Help / First-Success Guidance

Updated:
1. `src/components/app/recurring-payments-section.tsx`

Added compact, dismissible, one-time hints for:
1. focused entry from Home (action-now/upcoming),
2. first paid-cycle success,
3. family shared-card coordination (`Who pays` / `Paid by`),
4. first-payment readiness.

Behavior:
1. hints are low-noise (`Quick tip` card),
2. each hint can be dismissed with `Got it`,
3. seen-state is persisted per workspace and not repeatedly resurfaced.

## 6) What Changed - Bug Report Context Automation

Updated:
1. `src/components/app/profile-scenarios-placeholder.tsx`
2. `src/lib/auth/client.ts`
3. `src/app/api/support/bug-report/route.ts`

Changes:
1. profile bug report submit now includes `theme` + runtime context payload automatically,
2. server route normalizes and appends runtime context lines (tab/intent/reason/focus/view timestamps) to Telegram bug report message,
3. user-facing form remains simple; only helper copy updated to reflect richer auto-attached context.

## 7) Family/Workspace Convenience Improvements

1. Context memory is keyed by `workspaceId` for Reminders/History.
2. Recovery respects workspace compatibility and avoids applying stale context from a different workspace.
3. Home continuation uses workspace-aware routing details where available.

No automatic data mutation was introduced; convenience is navigation/context only.

## 8) What Was Intentionally Not Changed

1. No Premium/entitlement/claim/unlock/paywall logic was reintroduced.
2. No donation/support model change (still voluntary support only, Boosty + CloudTips links).
3. No donor-to-supporter automation introduced.
4. No DB schema or migration changes.
5. No payment business logic changes (add/edit/delete, mark paid/undo paid intact).
6. No API expansion beyond bug-report metadata payload shaping.
7. No broad visual redesign (27B baseline preserved).

## 9) Risks / Regression Watchlist

1. Context TTL and recovery behavior:
   - verify stale contexts expire naturally and do not feel "stuck."
2. Workspace switching:
   - verify restored Reminders/History context always corresponds to the active workspace.
3. Guidance hints:
   - verify hints remain quiet and do not reappear after dismissal.
4. Bug report payload:
   - verify added runtime lines remain concise and useful (not noisy).
5. Home continuation:
   - verify continuation card appears only when relevant and clears correctly via `Start clean`.

## 10) Concise Manual Verification Notes

1. Home:
   - work in Reminders/History, return to Home, verify continuation card appears,
   - tap continuation and verify destination/focus continuity,
   - tap `Start clean` and verify continuation card disappears.
2. Reminders:
   - set focus/view, switch tabs/reopen, verify recovery,
   - use `Start clean` and verify default state reset,
   - check dismissible `Quick tip` behavior (one-time).
3. History:
   - set focus (`All/Changes/Paid`), switch tabs/reopen, verify recovery,
   - verify `Start clean` resets focus.
4. Profile bug report:
   - submit report, verify no new form friction,
   - confirm delivered message includes theme/runtime context section.
5. Family/workspace:
   - switch workspace and verify context recovery follows workspace, not previous workspace.

## 11) Validation

Executed:
1. `npm run lint` - pass
2. `npm run build` - pass

## 12) Self-Check Against 27E Acceptance

1. Repeated manual steps reduced: yes (context memory + continuation + reset path).
2. Context memory/recovery improved: yes (Home/Reminders/History with workspace awareness).
3. Quiet help in right moment: yes (one-time, dismissible, low-noise tips).
4. Bug report made more useful automatically: yes (theme + runtime UI context attached).
5. Family/workspace convenience improved: yes (per-workspace context continuation).
6. Core flows preserved + donation-only truth preserved: yes.

## 13) Recommended Next Step

Phase 27F should be a targeted reliability pass:
1. add focused tests for context-memory parse/freshness/workspace-scope behavior,
2. add a concise manual checklist specifically for continuation/reset/bug-report-context correctness on real mobile Telegram runtime.
