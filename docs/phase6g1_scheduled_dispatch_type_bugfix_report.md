# Phase 6G.1 - Scheduled Dispatch Type Bugfix Report

Date: 2026-03-25  
Pass: Phase 6G.1 (ultra-narrow bugfix over non-accepted Phase 6G)

## 1. Scope
- Fix only the runtime crash in scheduled dispatch caused by unsafe fallback recipient normalization.
- Keep existing manual flows and scheduled endpoint behavior intact.

## 2. Root cause
- In recipient binding resolution, fallback normalization used string-only call:
  - `fallbackProfileTelegramUserId?.trim()`
- During scheduled scan path, fallback telegram id may arrive as non-string (number/mixed runtime value).
- Calling `.trim()` on a non-string caused runtime crash:
  - `TypeError: fallbackProfileTelegramUserId?.trim is not a function`

## 3. What was implemented
- Added narrow helper:
  - `normalizeTelegramIdCandidate(value: unknown): string | null`
  - safely handles `string`, `number`, `bigint`, `null`, `undefined`, and rejects unsupported types.
- Updated recipient binding fallback/stored normalization to use the safe helper (no direct `.trim()` on unknown).
- Added defensive normalization before DB upsert for profile/recipient telegram ids in binding observation paths.
- Added minimal regression test file for normalization cases:
  - string id
  - numeric id
  - bigint id
  - null/undefined/empty/invalid values

## 4. What was intentionally NOT implemented
- No product-scope changes.
- No scheduled architecture changes.
- No secret/auth flow changes.
- No DB migration.
- No UI changes.
- No cron/worker/queue additions.

## 5. Exact files created/modified

Created:
- `src/lib/payments/telegram-id-normalization.ts`
- `src/lib/payments/telegram-id-normalization.test.ts`
- `docs/phase6g1_scheduled_dispatch_type_bugfix_report.md`

Modified:
- `src/lib/payments/recipient-binding.ts`
- `src/lib/payments/repository.ts`
- `src/lib/payments/reminder-dispatch.ts`

## 6. Manual verification steps
1. Ensure scheduled endpoint secret is set (`REMINDER_SCHEDULED_DISPATCH_SECRET`).
2. Restart dev server.
3. Trigger:
   - `POST /api/internal/reminders/scheduled-dispatch`
   - with header `x-reminder-schedule-secret`.
4. Verify no runtime crash with mixed/numeric fallback telegram id values.
5. Verify scheduled response summary is returned instead of `500` from type crash.
6. Re-check manual flows:
   - manual `Send test message`
   - manual `Run dispatch`

## 7. Runtime confirmation status
- Confirmed in this environment:
  - `npm run lint` passed
  - `npm run build` passed
  - inline runtime checks for normalization helper passed via `node --experimental-strip-types`
- Not confirmed in this environment during this pass:
  - manual live invocation of scheduled endpoint after fix
  - full manual Telegram delivery verification for scheduled path
- Note:
  - `node --test --experimental-strip-types` could not run in sandbox (`spawn EPERM`), so regression logic was validated via direct inline runtime assertions instead.
