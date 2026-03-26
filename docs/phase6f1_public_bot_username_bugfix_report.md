# Phase 6F.1 - Public Bot Username Bugfix Report

Date: 2026-03-25  
Pass: Phase 6F.1 (ultra-narrow bugfix over Phase 6F)

## 1. Scope
- Fix only one defect: onboarding block incorrectly showing public bot username as not configured.
- Keep all reminder delivery behavior unchanged.

## 2. What Was Implemented
- Fixed client-side public env reading in `client-env.ts`:
  - replaced dynamic `process.env[name]` access with static `process.env.NEXT_PUBLIC_*` reads.
- Kept existing username normalization logic (plain / `@username` / `t.me/...`) intact.
- No changes to reminder delivery routes, recipient binding logic, or dispatch/test-send flows.

## 3. What Was Intentionally NOT Implemented
- No server-side changes.
- No reminder architecture changes.
- No migrations.
- No UI redesign beyond existing behavior.
- No scheduler/worker/queue/family/premium/localization work.

## 4. Exact Files Created/Modified

Created:
- `docs/phase6f1_public_bot_username_bugfix_report.md`

Modified:
- `src/lib/config/client-env.ts`

## 5. Manual Verification Steps
1. Ensure `.env.local` contains `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`.
2. Restart dev server (required for client env changes).
3. Open reminder onboarding block.
4. Confirm it shows `@<bot_username>` and open-bot link instead of fallback text.
5. If variable is removed/empty, confirm fallback message still appears.

## 6. Known Limitations
- Client-side `NEXT_PUBLIC_*` values still require dev server restart after edits.
- This pass does not add additional runtime diagnostics modules.

## 7. Runtime Confirmation Status
- Confirmed in this environment:
  - `npm run lint` passed
  - `npm run build` passed
- Not confirmed in this environment during this pass:
  - manual browser check that onboarding block now renders configured bot username
