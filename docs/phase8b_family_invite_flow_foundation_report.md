# Phase 8B - Family Invite Flow Foundation Report

## Scope
Phase 8B was implemented as a narrow, local pass on top of accepted Phase 8A. The scope is limited to minimal family invite foundation (create/read/accept) without shared payments, responsibility model, deep-link onboarding, or heavy family UX.

## What Was Implemented
1. Minimal invite persistence foundation
- Added migration `20260326_080000_phase8b_family_invites.sql`.
- Added table `public.family_workspace_invites` with fields:
  - `id`
  - `invite_token` (unique)
  - `workspace_id`
  - `inviter_profile_id`
  - `invite_status` (`active`, `accepted`, `expired`, `revoked`)
  - `created_at`
  - `expires_at`
  - `accepted_by_profile_id`
  - `accepted_at`
- Added indexes and a partial unique index to keep one active invite per workspace.

2. Owner-only invite creation
- Added endpoint: `POST /api/workspaces/family/invites/create`.
- Server-side checks:
  - current workspace must be `family`
  - current member role must be `owner`
- Reuses existing active invite when still valid; creates new one otherwise.

3. Minimal current invite read endpoint
- Added endpoint: `POST /api/workspaces/family/invites/current`.
- Returns latest invite for current active family workspace (or `null`).
- Handles active invite expiration transition to `expired` when needed.

4. Invite acceptance foundation
- Added endpoint: `POST /api/workspaces/family/invites/accept`.
- Validates token, status, expiry, and workspace kind.
- On success:
  - attaches accepting profile as workspace member (`member` role)
  - marks invite as accepted
  - switches active workspace to accepted family workspace (reuses 8A switching behavior)
- Duplicate-safe behavior:
  - already-accepted invite by same profile is handled safely.

5. Minimal UI invite surface
- In profile/family section added compact invite block:
  - `Create invite` button (owner-only in family workspace)
  - latest invite compact display (status/token/expires)
  - `Accept invite` input + button
- No heavy invite management center added.

6. Context/type/client updates
- Extended auth/context types with invite payload/response types.
- Added invite client methods in `src/lib/auth/client.ts`.
- Extended current context hook with invite actions/state:
  - `createInvite`
  - `acceptInvite`
  - `currentFamilyInvite`

## What Was Intentionally NOT Implemented
- No deep links / Telegram startapp invite onboarding.
- No shared payments.
- No responsibility / “who pays” matrix.
- No family dashboard UX.
- No scenario migration orchestration.
- No premium/growth/localization additions.

## Exact Files Created/Modified
Created:
- `supabase/migrations/20260326_080000_phase8b_family_invites.sql`
- `src/app/api/workspaces/family/invites/create/route.ts`
- `src/app/api/workspaces/family/invites/current/route.ts`
- `src/app/api/workspaces/family/invites/accept/route.ts`
- `docs/phase8b_family_invite_flow_foundation_report.md`

Modified:
- `src/lib/workspace/repository.ts`
- `src/lib/app-context/service.ts`
- `src/lib/auth/types.ts`
- `src/lib/auth/client.ts`
- `src/hooks/use-current-app-context.ts`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `README.md`

## Manual Verification Steps
1. Apply migration:
   - `supabase/migrations/20260326_080000_phase8b_family_invites.sql`
2. Start app (`npm run dev`) and bootstrap profile context.
3. Create family workspace (Phase 8A flow) and switch to it.
4. As owner in family workspace, click `Create invite`.
5. Verify invite appears in UI (token/status/expires).
6. In another profile identity/dev fallback, paste token and click `Accept invite`.
7. Verify accept succeeds and active workspace can become that family workspace.
8. Verify invalid cases:
   - non-family active workspace invite create rejected
   - non-owner invite create rejected
   - expired/used/invalid invite rejected
9. Verify existing personal flows remain intact when switching back to personal workspace.

## Known Limitations
- Invite onboarding is token-based only (no deep links).
- Only minimal latest-invite display is implemented (no full invite history management UI).
- Family shared economics/payments are still out of scope.

## Runtime Confirmation Status
Confirmed in current environment:
- `npm run lint` passed.
- `npm run build` passed.
- New endpoints present in build output:
  - `/api/workspaces/family/invites/create`
  - `/api/workspaces/family/invites/current`
  - `/api/workspaces/family/invites/accept`

Not confirmed in current environment by this pass:
- Manual browser/Telegram runtime verification of invite create/accept flows.
- Manual Supabase row verification for invite lifecycle transitions.
