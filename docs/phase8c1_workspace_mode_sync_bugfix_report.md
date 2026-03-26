# Phase 8C.1 - Workspace/Mode Sync Bugfix Report

## Scope
Ultra-narrow bugfix pass on top of non-accepted Phase 8C.

Scope of this pass:
- fix desync between active workspace switching and mode/scenario experience
- restore immediate personal recurring visibility after switching back to personal workspace
- keep existing 8C family-side behavior intact
- no family economics/responsibility/invite-flow expansion

## Root Cause
The recurring payments section did not reliably reload data on workspace switch after 8C.

Specific issue:
- `RecurringPaymentsSection` reloaded via `loadPayments` callback tied to `workspaceUnavailable`
- after 8C, both family and personal workspaces are often "available" (`workspaceUnavailable = null`)
- switching workspace could keep `workspaceUnavailable` unchanged, so payments reload effect did not re-trigger
- stale family list/state could remain until unrelated user actions, creating observed "mode" desync feeling

Additional coherence issue:
- scenario (`selectedScenario`) and workspace kind could drift after workspace switch because switch flow did not auto-sync scenario to workspace kind

## What Was Implemented
1. Workspace switch reload fix in recurring payments section
- Added active workspace id as reload signal in recurring list loader path.
- When workspace becomes unavailable/missing, payments state is explicitly cleared.
- Result: switching family -> personal now triggers immediate recurring reload for personal workspace.

2. Minimal scenario sync helper
- Added tiny helper mapping workspace kind to scenario:
  - personal -> single
  - family -> family

3. Hook-level automatic scenario sync on workspace transitions
- In `useCurrentAppContext`, after successful:
  - workspace switch
  - family workspace creation
  - family invite acceptance
  hook now attempts scenario sync to match resulting workspace kind.
- If sync fails, flow remains non-crashing and shows explicit message (`...scenario sync failed`).

4. Minimal regression coverage
- Added narrow tests for workspace-kind -> scenario mapping helper.

## What Was Intentionally NOT Implemented
- No refactor of app-context architecture.
- No responsibility / who-pays model.
- No shared economics or family dashboard.
- No invite accept simulation refactor for dev fallback.
- No reminder/subscription engine redesign.

## Exact Files Created/Modified
Created:
- `src/hooks/workspace-scenario-sync.ts`
- `src/hooks/workspace-scenario-sync.test.ts`
- `docs/phase8c1_workspace_mode_sync_bugfix_report.md`

Modified:
- `src/components/app/recurring-payments-section.tsx`
- `src/hooks/use-current-app-context.ts`

## Manual Verification Steps
1. Start app and ensure profile has both family and personal workspace.
2. Switch to family workspace.
3. Open recurring section and confirm family/shared list remains visible as before.
4. Switch back to personal workspace.
5. Confirm personal recurring list reappears immediately (without manual scenario toggle).
6. Confirm scenario card/state aligns with workspace transitions (single for personal, family for family).
7. Recheck family-side constraints remain intact:
   - shared badge still shown
   - advanced family actions remain intentionally disabled

## Runtime Confirmation Status
Confirmed in this environment:
- `npm run lint` passed.
- `npm run build` passed.
- `node --test --experimental-strip-types --test-concurrency=1 --test-isolation=none src/hooks/workspace-scenario-sync.test.ts` passed.
- API sequence check confirmed scenario/workspace coherence when applying the same switch+scenario-sync calls used by hook logic:
  - family/family -> personal/single -> family/family

Not fully confirmed in this pass:
- End-to-end manual browser UI re-check of exact user interaction path (workspace switch + visual recurring reappearance) was not re-run inside this environment by me.
