# Phase 8B.1 - Family Invite Create Bugfix Report

## Scope
Ultra-narrow bugfix pass on top of Phase 8B only. Focus: fix/diagnose `Create invite` failure in valid family-owner context without expanding family features.

## Root Cause
`POST /api/workspaces/family/invites/create` failed with generic `INVITE_CREATE_FAILED` because invite persistence table was missing in the current Supabase schema.

Observed backend condition in this environment:
- Supabase returned `PGRST205`
- Message: table `public.family_workspace_invites` not found in schema cache

So create-invite was not failing because of workspace kind/owner checks. It was failing because storage for invites was not ready (migration not applied in active DB).

## What Was Implemented
1. Added explicit invite-storage-not-ready error detection
- New helper to detect missing invite table errors from Supabase (`PGRST205` / relation message match).

2. Added precise create-invite error mapping
- Repository `createFamilyWorkspaceInviteForProfile` now returns dedicated reason `INVITE_STORAGE_NOT_READY` when invite storage is missing.
- App-context service maps this reason to API error code `INVITE_STORAGE_NOT_READY` with actionable message.
- Route maps `INVITE_STORAGE_NOT_READY` to HTTP 503 instead of generic failure.

3. Added minimal regression coverage
- Added narrow node:test coverage for invite-storage error detection helper:
  - positive case: `PGRST205`
  - positive case: invite table name in message
  - negative case: unrelated errors/nullish

## What Was Intentionally NOT Implemented
- No accept-flow refactor.
- No invite deep-links/startapp onboarding.
- No family dashboard/shared payments/responsibility logic.
- No workspace architecture refactor.
- No new migration added in 8B.1 (bugfix pass only).

## Exact Files Created/Modified
Created:
- `src/lib/workspace/invite-storage-errors.ts`
- `src/lib/workspace/invite-storage-errors.test.ts`
- `docs/phase8b1_family_invite_create_bugfix_report.md`

Modified:
- `src/lib/workspace/repository.ts`
- `src/lib/app-context/service.ts`
- `src/lib/auth/types.ts`
- `src/app/api/workspaces/family/invites/create/route.ts`

## Manual Verification Steps
1. Confirm current active context is family + owner in UI.
2. Trigger `Create invite`.
3. If invite migration is missing, verify API now returns explicit error:
   - code: `INVITE_STORAGE_NOT_READY`
   - message explains to apply Phase 8B invite migration.
4. Apply migration `supabase/migrations/20260326_080000_phase8b_family_invites.sql` to the active Supabase DB.
5. Retry `Create invite`.
6. Verify row appears in `public.family_workspace_invites` with:
   - `invite_status = 'active'`
   - correct `workspace_id` and `inviter_profile_id`.
7. Verify invalid protections remain:
   - personal workspace create attempt rejected
   - non-owner create attempt rejected.

## Runtime Confirmation Status
Confirmed in this environment:
- `npm run lint` passed.
- `npm run build` passed.
- `node --test --experimental-strip-types --test-concurrency=1 --test-isolation=none src/lib/workspace/invite-storage-errors.test.ts` passed.
- API behavior changed from generic failure to explicit storage readiness error:
  - `POST /api/workspaces/family/invites/create` -> `INVITE_STORAGE_NOT_READY` when invite table is absent.

Not confirmed in this pass:
- Successful invite creation row insert in DB after applying migration (manual DB migration + re-check still required).
