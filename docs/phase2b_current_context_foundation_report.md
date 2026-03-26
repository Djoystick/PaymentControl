# Phase 2B Current Context Foundation Report

## Scope
This pass implements only Phase 2B: minimal current app context foundation.
It adds a dedicated current-context read endpoint and reusable server/client context resolution flow, while preserving existing Phase 1A and Phase 2A behavior.

## What Was Implemented
1. Current app context read endpoint
- Added `POST /api/app/context`:
  - file: `src/app/api/app/context/route.ts`
- Returns minimal current context payload:
  - profile summary (includes `selected_scenario`)
  - active workspace summary
  - auth state/source
- Returns explicit error states, including `APP_CONTEXT_NOT_INITIALIZED`.

2. Reusable server-side context resolution
- Added `src/lib/app-context/service.ts` with reusable functions:
  - `readCurrentAppContext(initData)`
  - `bootstrapAppContext(initData)`
- Reused existing Telegram identity resolution + profile/workspace repositories.
- Updated bootstrap API route to use shared service instead of duplicating bootstrap logic.

3. Client-side context loading cleanup
- Added client hook: `src/hooks/use-current-app-context.ts`.
- Hook flow:
  - tries current context endpoint first
  - bootstraps only when context is not initialized
  - re-reads context after bootstrap
  - refreshes context after scenario updates
- Updated UI component to consume hook state/actions instead of embedding all request logic.

4. Minimal API responsibility clarity
- Bootstrap remains in `POST /api/auth/telegram/bootstrap`.
- Current context read is in `POST /api/app/context`.
- Scenario update remains in `PATCH /api/profile/scenario`.

5. UI reflection update
- Profile/workspace section now reflects data loaded via current-context flow.
- Keeps existing layout and UX style with minimal visual changes.

## What Was Intentionally NOT Implemented
- Full persistent session/cookie system
- Family workspace flows/invites/roles
- Workspace switching UI
- Payments/subscriptions CRUD
- Premium/referral/notifications/analytics

## Exact Files Created / Modified
- Created:
  - `src/lib/app-context/service.ts`
  - `src/app/api/app/context/route.ts`
  - `src/hooks/use-current-app-context.ts`
  - `docs/phase2b_current_context_foundation_report.md`
- Modified:
  - `src/lib/auth/types.ts`
  - `src/lib/profile/repository.ts`
  - `src/lib/auth/client.ts`
  - `src/app/api/auth/telegram/bootstrap/route.ts`
  - `src/components/app/profile-scenarios-placeholder.tsx`
  - `src/components/app/landing-screen.tsx`
  - `README.md`

## How Current-Context Flow Works
1. Client requests `POST /api/app/context` with Telegram `initData` (or empty for explicit dev fallback path).
2. Server resolves identity.
3. Server reads existing profile + active workspace summary.
4. If profile/workspace not initialized, server returns `APP_CONTEXT_NOT_INITIALIZED` (or related context error).
5. Client calls bootstrap endpoint once when needed, then re-reads current context.

## Manual Verification Steps
1. Start app and open in browser.
2. Ensure dev fallback or Telegram context is available.
3. Confirm profile state loads.
4. Confirm workspace summary loads (`kind: personal`).
5. Change scenario and confirm context refresh keeps UI in sync.
6. Refresh page and confirm context loads via current-context endpoint.

## Known Limitations
- This is not a full persistent session system yet.
- Identity/context is still resolved per request using Telegram initData or explicit dev fallback.
- Context endpoint is read-only and does not initialize missing profile/workspace by itself.

## Validation Status In This Environment
- Executed `npm run lint`: passed.
- Executed `npm run build`: passed.
- `npm run dev` startup was attempted; one run failed due port-in-use and timed runs were cleaned up, but no stable interactive runtime session was kept.
- End-to-end Telegram client runtime verification was not fully re-run in this terminal-only environment.

## Recommended Next Phase
1. Introduce a lightweight session layer to avoid sending initData on each request.
2. Add a `GET`-style authenticated current-context route once session foundation exists.
3. Start family workspace domain foundation on top of this context layer.
