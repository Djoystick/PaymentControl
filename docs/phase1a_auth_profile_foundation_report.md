# Phase 1A Auth/Profile Foundation Report

## Scope
This pass implements only Phase 1A: Telegram auth/profile foundation.
It adds real server-side Telegram `initData` verification, minimal profile persistence, and minimal scenario persistence at profile level.

## What Was Implemented
1. Telegram init data verification foundation
- Added `src/lib/telegram/verify-init-data.ts`.
- Implemented HMAC-based signature verification using server `TELEGRAM_BOT_TOKEN`.
- Implemented `auth_date` max-age check (`TELEGRAM_INIT_DATA_MAX_AGE_SEC`, default 86400).
- Implemented Telegram user payload parsing and normalization.

2. Auth/bootstrap API surface
- Added `POST /api/auth/telegram/bootstrap` in `src/app/api/auth/telegram/bootstrap/route.ts`.
- Endpoint accepts `initData`, validates Telegram identity, upserts profile, returns normalized profile payload.
- Returns explicit safe errors for missing/invalid/expired init data and server config issues.

3. Minimal profile data model foundation
- Added migration SQL:
  - `supabase/migrations/20260325_010000_phase1a_profiles.sql`
- Created `public.profiles` table with minimal fields:
  - `id`
  - `telegram_user_id`
  - `username`
  - `first_name`
  - `last_name`
  - `photo_url`
  - `selected_scenario` (`single` | `family` via check constraint)
  - `created_at`
  - `updated_at`
  - `last_seen_at`

4. Profile upsert flow
- Added profile repository in `src/lib/profile/repository.ts`.
- On successful auth bootstrap, profile is upserted by `telegram_user_id`.
- `last_seen_at` and `updated_at` are refreshed.

5. Client auth/profile state
- Upgraded profile placeholder section (`src/components/app/profile-scenarios-placeholder.tsx`) into a client auth/profile block.
- On load, app calls bootstrap API with Telegram init data (if present).
- Shows identified state when verification succeeds.
- Shows safe not-identified state outside Telegram.
- No crash outside Telegram context.

6. Scenario state foundation
- Added `PATCH /api/profile/scenario` in `src/app/api/profile/scenario/route.ts`.
- Scenario update verifies identity again and persists `selected_scenario` on profile.
- Implemented minimal UI controls for selecting `single` or `family`.

7. Dev-mode support
- Added explicit env-gated dev fallback in `src/lib/auth/resolve-telegram-identity.ts`.
- Fallback works only when:
  - `NODE_ENV` is not `production`
  - `ALLOW_DEV_TELEGRAM_AUTH_FALLBACK=true`
  - `DEV_TELEGRAM_USER_ID` is provided
- No hidden mock auth.

8. Telegram bootstrap coordination
- Updated `src/components/telegram/telegram-mini-app-provider.tsx` to emit `telegram-webapp-ready` after bootstrap so profile bootstrap can retry when SDK finishes loading.

## What Was Intentionally NOT Implemented
- Payments/subscriptions CRUD and business logic
- Family workspace/domain model
- Premium/referral/notification features
- Complex session system
- Full Telegram launch/testing automation inside this environment

## Exact Files Created / Modified
- Created:
  - `src/lib/auth/types.ts`
  - `src/lib/auth/resolve-telegram-identity.ts`
  - `src/lib/auth/client.ts`
  - `src/lib/telegram/verify-init-data.ts`
  - `src/lib/profile/repository.ts`
  - `src/app/api/auth/telegram/bootstrap/route.ts`
  - `src/app/api/profile/scenario/route.ts`
  - `supabase/migrations/20260325_010000_phase1a_profiles.sql`
  - `docs/phase1a_auth_profile_foundation_report.md`
- Modified:
  - `.env.example`
  - `README.md`
  - `src/lib/config/server-env.ts`
  - `src/lib/telegram/web-app.ts`
  - `src/components/telegram/telegram-mini-app-provider.tsx`
  - `src/components/app/profile-scenarios-placeholder.tsx`
  - `src/components/app/landing-screen.tsx`

## Required Environment Variables
- Frontend:
  - `NEXT_PUBLIC_APP_NAME`
  - `NEXT_PUBLIC_APP_STAGE`
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Server:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_JWT_SECRET`
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_INIT_DATA_MAX_AGE_SEC`
- Optional dev-only fallback:
  - `ALLOW_DEV_TELEGRAM_AUTH_FALLBACK`
  - `DEV_TELEGRAM_USER_ID`
  - `DEV_TELEGRAM_USERNAME`
  - `DEV_TELEGRAM_FIRST_NAME`
  - `DEV_TELEGRAM_LAST_NAME`
  - `DEV_TELEGRAM_PHOTO_URL`

## Required Supabase Setup / SQL Setup
1. Create Supabase project and obtain URL + service role key.
2. Apply SQL migration:
   - `supabase/migrations/20260325_010000_phase1a_profiles.sql`
3. Ensure `.env.local` contains matching Supabase server variables.

## How To Run Locally
1. `npm install`
2. `Copy-Item .env.example .env.local` (PowerShell)
3. Fill `.env.local` variables.
4. Apply Supabase migration SQL.
5. `npm run dev`
6. Open `http://localhost:3000`

## How To Verify Manually
1. Normal browser without dev fallback:
   - App renders.
   - Profile section shows safe not-identified state.
   - No crash.
2. Normal browser with dev fallback enabled:
   - App identifies dev fallback user.
   - Scenario switch updates and persists.
3. Telegram Mini App context:
   - Auth bootstrap returns verified Telegram user.
   - Scenario switch persists (`single`/`family`).
4. API checks (optional via devtools/network):
   - `POST /api/auth/telegram/bootstrap` returns expected success/error payload.
   - `PATCH /api/profile/scenario` returns updated profile payload.

## Validation Status In This Environment
- Executed `npm run lint`: passed.
- Executed `npm run build`: passed.
- `npm run dev` reached `Ready` state during check; one run reported an already-running dev process in the workspace and it was stopped.
- Telegram-context verification is implemented in code but not fully confirmed end-to-end in this terminal-only environment.

## Known Limitations
- No production session lifecycle (tokens/cookies) yet; each scenario update re-validates identity from init data/fallback context.
- Telegram runtime behavior still requires manual validation in real Telegram context.
- Profile layer is intentionally minimal and focused on Phase 1A only.

## Recommended Next Phase
1. Add proper authenticated session strategy after init-data validation.
2. Add basic profile endpoint to fetch current profile via session context (without resending initData each action).
3. Begin first payments/subscriptions domain slice after auth/profile is stable.
4. Add integration tests for init-data validation and profile upsert/update routes.
