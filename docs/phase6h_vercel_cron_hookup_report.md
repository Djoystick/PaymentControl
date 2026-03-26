# Phase 6H - Vercel Cron Hookup Report

Date: 2026-03-25  
Pass: Phase 6H (narrow/local over accepted Phase 6G/6G.1)

## 1. Scope
- Add deployment-ready Vercel cron hookup on top of existing scheduled dispatch foundation.
- Reuse current secure scheduled endpoint and reminder dispatch service.
- Keep manual reminder flows and idempotency unchanged.

## 2. What was implemented
- Added Vercel cron configuration:
  - new `vercel.json` with cron path `/api/internal/reminders/scheduled-dispatch`
  - daily schedule (`0 9 * * *`) to stay hobby-safe (once/day)
- Extended internal scheduled route for Vercel invocation:
  - kept manual/internal `POST` support
  - added `GET` support for cron triggers
  - added auth support for `Authorization: Bearer <CRON_SECRET>`
  - preserved manual compatibility via `x-reminder-schedule-secret`
- Kept secure auth behavior:
  - route rejects when no secret configured
  - accepts configured secrets from `CRON_SECRET` and/or `REMINDER_SCHEDULED_DISPATCH_SECRET`
- Updated env config:
  - `CRON_SECRET` added to server env reader
  - `CRON_SECRET` added to `.env.example`
- Updated README with minimal deployment hookup notes and verification checklist.

## 3. What was intentionally NOT implemented
- No queue/worker/retry framework.
- No family/shared reminder orchestration.
- No new scheduler engine abstraction.
- No UI/admin panel changes.
- No DB migration.

## 4. Exact files created/modified

Created:
- `vercel.json`
- `docs/phase6h_vercel_cron_hookup_report.md`

Modified:
- `src/app/api/internal/reminders/scheduled-dispatch/route.ts`
- `src/lib/config/server-env.ts`
- `.env.example`
- `README.md`

## 5. Manual verification steps
1. Set envs in deployment/local server:
   - `CRON_SECRET=<strong-random-secret>`
2. Confirm scheduled route rejects unauthorized requests.
3. Manual internal trigger check:
   - `POST /api/internal/reminders/scheduled-dispatch`
   - header: `x-reminder-schedule-secret`
4. Cron-style trigger check:
   - `GET /api/internal/reminders/scheduled-dispatch`
   - header: `Authorization: Bearer <CRON_SECRET>`
5. Verify summary response fields:
   - `workspacesSeen`, `workspacesEligible`, `candidatesSeen`, `attemptsCreated`, `duplicatesSkipped`, `sent`, `skipped`, `failed`
6. Verify DB logging:
   - `reminder_dispatch_attempts.trigger_source = scheduled_dispatch`
7. Re-run same day and confirm idempotency (duplicates skipped).

## 6. Deployment setup notes
- Vercel cron path is configured in `vercel.json`:
  - `/api/internal/reminders/scheduled-dispatch`
- For Vercel scheduled calls, rely on:
  - `Authorization: Bearer <CRON_SECRET>`
- Keep `CRON_SECRET` and optional `REMINDER_SCHEDULED_DISPATCH_SECRET` as server-only env values.
- This pass prepares hookup foundation; production operational behavior still needs manual deployment verification.

## 7. Runtime confirmation status
- Confirmed in this environment:
  - `npm run lint` passed
  - `npm run build` passed
  - scheduled route compiles after GET/POST/auth changes
- Not confirmed in this environment during this pass:
  - real Vercel production cron invocation
  - production schedule timing behavior
