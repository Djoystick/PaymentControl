# Phase 27F - Release Reliability Hardening + Legacy Residue Cleanup

- Date: 2026-04-04
- Status: implemented (release-hardening wave), manual verification completed by user (release-line accepted)
- Scope type: reliability + low-risk cleanup on top of accepted 27B/27C/27D/27E baselines
- Source-of-truth baseline:
  1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
  2. `docs/reports/phase_27A_full_project_audit.md`
  3. `docs/reports/phase_27A_remaining_roadmap_reset.md`
  4. `docs/reports/phase_27B_core_design_system_hardening_and_primary_surface_recomposition.md`
  5. `docs/reports/phase_27C_action_first_workflow_compression_and_cross_surface_navigation_clarity.md`
  6. `docs/reports/phase_27D_guided_reminders_workspace_and_progressive_disclosure_simplification.md`
  7. `docs/reports/phase_27E_calm_context_memory_and_helpful_micro_automation.md`
  8. `docs/reports/internal_version_history.md`

## 1) What Was Analyzed

Runtime/state continuity surfaces:
1. `src/lib/app/context-memory.ts`
2. `src/components/app/app-shell.tsx`
3. `src/components/app/landing-screen.tsx`
4. `src/components/app/recurring-payments-section.tsx`
5. `src/components/app/payments-activity-section.tsx`

Bug report context path:
1. `src/components/app/profile-scenarios-placeholder.tsx`
2. `src/lib/auth/client.ts`
3. `src/app/api/support/bug-report/route.ts`

Legacy residue area:
1. `src/lib/i18n/localization.tsx`
2. global source scan for premium/claim residue in runtime code

Design-intelligence reference:
1. `ui-ux-pro-max` skill instructions and local dataset files (`.codex/skills/ui-ux-pro-max/data/*`)
2. In this environment, the skill python search script remained blocked (`python.exe` access denied), so reference guidance was applied from local CSV data (state predictability, error recovery, and low-noise interaction patterns).

## 2) Reliability Risks Found After 27E

1. Tab navigation context queue had no explicit freshness gate, so stale queued intents could survive longer than intended.
2. Context resume compatibility was permissive for workspace-scoped flows when workspace id was absent in queued context.
3. Home `Start clean` reset did not clear queued tab navigation contexts.
4. Bug report runtime context formatting was useful but too verbose/noisy in edge cases.
5. Localization still contained substantial historical premium/claim dictionary residue not used by active runtime.

## 3) Hardening Changes Applied

## 3.1 Context-memory/recovery reliability

Updated:
1. `src/lib/app/context-memory.ts`

Changes:
1. Added stricter text normalization for `reason` fields and workspace id normalization.
2. Added explicit workspace-compatibility helper:
   - `isRuntimeSnapshotCompatibleWithWorkspace(...)`
3. Tightened `readRuntimeSnapshot(...)` compatibility checks for workspace-scoped resume.
4. Normalized stored `entryFlowContextReason` values for Reminders/History snapshots.
5. Exported storage constants for deterministic focused tests:
   - `CONTEXT_MEMORY_STORAGE_KEY`
   - `DEFAULT_CONTEXT_TTL_MS`

Result:
1. Restore logic is safer against malformed/overlong values.
2. Workspace-scoped continuation is more predictable.

## 3.2 Cross-surface continuation hardening

Updated:
1. `src/components/app/app-shell.tsx`
2. `src/components/app/landing-screen.tsx`
3. `src/components/app/recurring-payments-section.tsx`
4. `src/components/app/payments-activity-section.tsx`

Changes:
1. Added queued tab-context freshness guard in AppShell (`30 min` TTL) with normalization and stale cleanup.
2. Added `clearAllTabNavigationContexts()` helper and wired it into clean reset paths.
3. Strengthened queued context validation (`createdAt`, `sourceTab`, `workspaceId`, `reason`).
4. Preserved workspace identity on tab-bar transitions by inferring last runtime workspace for snapshot memory.
5. Reminders/History now apply queued context only when workspace id explicitly matches active workspace.
6. `Start clean` now clears both context memory and queued tab navigation context.

Result:
1. Lower risk of stale/zombie continuation state.
2. Cleaner and more predictable continuation/reset behavior across Home/Reminders/History.

## 3.3 Quiet help behavior hardening

Updated:
1. `src/components/app/recurring-payments-section.tsx`

Changes:
1. Added low-noise rendering guard for guidance tip card:
   - hidden while loading,
   - hidden while composer is open.

Result:
1. Guidance remains contextual but less likely to interfere with active create/edit flow.

## 3.4 Bug report runtime context hardening

Added:
1. `src/lib/support/bug-report-runtime-context.ts`

Updated:
1. `src/app/api/support/bug-report/route.ts`

Changes:
1. Extracted context shaping into a dedicated utility for stable and testable behavior.
2. Replaced verbose line-by-line payload formatting with compact deterministic lines:
   - `Runtime: ...`
   - `Reminders: ...`
   - `History: ...`
   - `Context generated at: ...`
3. Added value normalization and reason-length clamping.

Result:
1. Runtime context attached to bug reports stays useful but less noisy.
2. Server formatting behavior is deterministic and easier to maintain.

## 4) Low-Risk Legacy Residue Cleanup

Updated:
1. `src/lib/i18n/localization.tsx`
2. `src/lib/payments/starter-templates.ts`

Changes:
1. Removed a large unused historical premium/claim/entitlement translation residue block from active dictionary.
2. Kept active donation-only/supporter/runtime keys intact (RU/EN parity preserved for currently used `tr(...)` keys).
3. Removed remaining premium-named starter template phrase:
   - `Insurance Premium` -> `Insurance payment`

Why this is safe:
1. Cleaned keys were not referenced by active runtime flows.
2. Static key coverage check for active `tr(...)` calls remained complete after cleanup.
3. Build/lint and focused tests passed.

## 5) Focused Tests Added

Added:
1. `src/lib/app/context-memory.test.ts`
2. `src/lib/support/bug-report-runtime-context.test.ts`

Covered risks:
1. Runtime workspace compatibility behavior.
2. TTL freshness handling for stale reminders/history snapshots.
3. Full clear/reset behavior for context-memory storage.
4. Compact bug-report runtime context shaping and reason clamping.

Targeted execution:
1. `node --test --test-isolation=none src/lib/app/context-memory.test.ts src/lib/support/bug-report-runtime-context.test.ts`

Note:
1. Default Node test isolation mode failed in this environment with `spawn EPERM`; `--test-isolation=none` was used to run focused tests without subprocess spawning.

## 6) What Was Intentionally Not Changed

1. No product-model change (donation-only unrestricted truth preserved).
2. No Premium/claim/entitlement/paywall reintroduction.
3. No donation-to-supporter automation.
4. No DB schema/API contract expansion for monetization.
5. No new visual redesign wave (27B/27C/27D/27E baselines retained).
6. No payment business logic changes (add/edit/delete, mark paid/undo paid unchanged).

## 7) Validation

Executed:
1. `node --test --test-isolation=none src/lib/app/context-memory.test.ts src/lib/support/bug-report-runtime-context.test.ts` - pass
2. `npm run lint` - pass
3. `npm run build` - pass

## 8) Release-Focused Manual Verification Guidance (Concise)

1. Home continuation:
   - create context in Reminders/History, return to Home, verify continuation appears only when relevant.
   - tap `Start clean`, verify continuation card disappears and stale continuation does not return.
2. Workspace continuity:
   - switch workspace, verify Reminders/History do not apply context from another workspace.
3. Reminders guidance quietness:
   - verify `Quick tip` does not overlap with active composer flow and remains dismissible.
4. History continuity:
   - verify restored focus label/reset behavior remains predictable after tab switch/reopen.
5. Bug report payload:
   - submit report from Profile and verify runtime context section is compact and readable.

## 9) Risks / Regression Watchlist

1. Device-specific localStorage restrictions in Telegram webview may reduce persistence reliability (expected fallback behavior should remain safe).
2. Cross-tab storage events can still race in edge cases; monitor for unexpected continuation card reappearance.
3. Long-running sessions with frequent workspace switches should be spot-checked for stale queue reuse.

## 10) Self-Check Against 27F Acceptance

1. Context memory/recovery reliability improved: yes.
2. Home/Reminders/History continuity made more predictable: yes.
3. Quiet help behavior became calmer and less intrusive: yes.
4. Bug report runtime context became cleaner and still useful: yes.
5. Low-risk legacy residue was reduced safely: yes.
6. Donation-only unrestricted truth and core utility baselines remained intact: yes.
