# Phase 6G - Scheduled Dispatch Foundation Report

Date: 2026-03-25  
Pass: Phase 6G (narrow/local over accepted Phase 6F.1)

## 1. Scope
- Add a secure internal endpoint for automated reminder dispatch triggering.
- Reuse existing reminder candidate, delivery, logging, and idempotency foundation.
- Keep scope personal-first and avoid scheduler/worker framework expansion.

## 2. What Was Implemented
- Added secret-protected internal endpoint:
  - `POST /api/internal/reminders/scheduled-dispatch`
  - requires header `x-reminder-schedule-secret`
  - requires server env `REMINDER_SCHEDULED_DISPATCH_SECRET`
  - returns clear summary payload for manual/cron diagnostics
- Added scheduled dispatch run orchestration in existing reminder service layer:
  - scans personal workspaces only
  - resolves binding using existing recipient-binding foundation
  - includes only eligible workspaces (`binding_status=verified` and delivery preflight ready)
  - reuses existing `dispatchReminderCandidatesForWorkspace`
- Extended trigger source support:
  - added `scheduled_dispatch` to `ReminderDispatchTriggerSource`
  - scheduled attempts now persist with `trigger_source = scheduled_dispatch`
- Added repository helper for scheduled scanning:
  - `listPersonalWorkspaceDispatchTargets()` to enumerate personal workspace + owner profile context
- Added scheduled summary type:
  - `evaluationDate`, `workspacesSeen`, `workspacesEligible`, `candidatesSeen`, `attemptsCreated`, `duplicatesSkipped`, `sent`, `skipped`, `failed`
- Updated env/docs:
  - `.env.example` includes `REMINDER_SCHEDULED_DISPATCH_SECRET`
  - `README.md` includes internal trigger endpoint and manual invocation example

## 3. What Was Intentionally NOT Implemented
- No cron platform hookup confirmation.
- No worker/queue/retry engine.
- No family workspace reminder orchestration.
- No premium/subscription/growth features.
- No major architecture refactor.

## 4. Exact Files Created/Modified

Created:
- `src/app/api/internal/reminders/scheduled-dispatch/route.ts`
- `docs/phase6g_scheduled_dispatch_foundation_report.md`

Modified:
- `src/lib/payments/types.ts`
- `src/lib/payments/repository.ts`
- `src/lib/payments/reminder-dispatch.ts`
- `src/lib/config/server-env.ts`
- `.env.example`
- `README.md`

## 5. Manual Verification Steps
1. Set server env in `.env.local`:
   - `REMINDER_SCHEDULED_DISPATCH_SECRET=<long-random-secret>`
2. Restart dev server.
3. Trigger scheduled endpoint manually:
   - `POST /api/internal/reminders/scheduled-dispatch`
   - header: `x-reminder-schedule-secret: <secret>`
4. Verify response includes summary fields:
   - `workspacesSeen`, `workspacesEligible`, `candidatesSeen`, `attemptsCreated`, `duplicatesSkipped`, `sent`, `skipped`, `failed`
5. Check DB attempts:
   - `trigger_source` should include `scheduled_dispatch` for scheduled runs.
6. Re-run endpoint same day and verify idempotency behavior:
   - `duplicatesSkipped` increases instead of creating duplicate attempts for same evaluation window.
7. Confirm manual `Send test message` and manual `Run dispatch` continue to work.

## 6. Known Limitations
- This pass provides only secure trigger foundation; it is not a full autonomous scheduler.
- Cron/provider integration is environment-specific and not auto-configured here.
- Scope is personal workspaces only.

## 7. Runtime Confirmation Status
- Confirmed in this environment:
  - `npm run lint` passed
  - `npm run build` passed
  - internal route compiled: `/api/internal/reminders/scheduled-dispatch`
- Not confirmed in this environment during this pass:
  - manual end-to-end invocation of scheduled endpoint against live runtime
  - production cron integration/runtime behavior
