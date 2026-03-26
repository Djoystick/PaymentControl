# Phase 2B Bugfix Report

## Root Cause of 404
`POST /api/app/context` route was present, but runtime returned 404 because the handler mapped app-state errors to 404 (not a missing route):
- initially `APP_CONTEXT_NOT_INITIALIZED`
- then `WORKSPACE_NOT_FOUND`

So the observed 404 was logical-state mapping, not route registration failure.

## Root Cause of 500
`POST /api/auth/telegram/bootstrap` failed with 500 because the Phase 2B/2A data path depended on schema objects not present in the runtime DB:
- `profiles.active_workspace_id` column missing (`42703`)
- `workspaces` table missing in schema cache (`PGRST205`)

This caused profile/workspace bootstrap internals to return null and surface as:
- `PROFILE_UPSERT_FAILED` (earlier)
- `WORKSPACE_ENSURE_FAILED` (after partial fixes)

## What Was Changed
1. Added compatibility in profile repository for missing `active_workspace_id`:
- removed hard dependency on selecting that column in profile reads/upserts.

2. Added compatibility in workspace repository:
- detect missing workspace schema (`PGRST205`).
- when workspace schema is unavailable, return a safe virtual personal workspace summary instead of hard-failing bootstrap/context flow.
- fallback update path when `active_workspace_id` update fails due missing column (`42703`).

3. Updated app-context service:
- if workspace summary is unavailable, return a safe personal workspace summary derived from profile instead of failing read-context.

4. Updated current-context endpoint status mapping:
- `APP_CONTEXT_NOT_INITIALIZED` no longer maps to 404 (mapped to 409).

## What Was NOT Changed
- No payments/subscriptions/family/invites/premium/referral/notifications/analytics features.
- No session/cookie architecture added.
- No UI redesign.
- Existing endpoint structure preserved:
  - bootstrap endpoint
  - current-context endpoint
  - scenario update endpoint

## Exact Files Modified
- `src/lib/profile/repository.ts`
- `src/lib/workspace/repository.ts`
- `src/lib/app-context/service.ts`
- `src/app/api/app/context/route.ts`
- `docs/phase2b_bugfix_report.md`

## Runtime Re-Verification (Actually Performed)
Verified against running dev server on `http://127.0.0.1:3020`:
1. `POST /api/app/context` (empty initData, dev fallback enabled) -> **200**
2. `POST /api/auth/telegram/bootstrap` -> **200**
3. `POST /api/app/context` again -> **200** with profile + workspace summary
4. `PATCH /api/profile/scenario` -> **200**
5. `POST /api/app/context` after scenario change -> **200** and updated `selected_scenario`

## Exact Manual Verification Steps
1. Start dev server.
2. Call:
   - `POST /api/app/context` with `{ "initData": "" }`
   - `POST /api/auth/telegram/bootstrap` with `{ "initData": "" }`
   - `POST /api/app/context` again
3. Confirm all return success responses.
4. Call `PATCH /api/profile/scenario` with `selectedScenario` and re-check context.
5. Confirm context reflects updated scenario.

## Remaining Caveats
- Runtime DB is missing some expected Phase 2A schema objects (`workspaces`, `active_workspace_id`).
- Bugfix includes compatibility fallback to keep app flow working, but full intended persistence requires applying migrations cleanly.
- Current context still does not represent a full persistent session system.
