# Phase 0.1 Hydration Bugfix Report

## Root Cause
- `src/app/layout.tsx` loaded Telegram WebApp script with `strategy="beforeInteractive"`.
- In Telegram context, that script can inject viewport CSS variables onto the `<html>` element (for example `--tg-viewport-height`, `--tg-viewport-stable-height`) before React hydration.
- Result: server-rendered `<html>` attributes differed from the client DOM at hydration time, causing mismatch warnings.
- A separate warning came from calling `setHeaderColor` without checking WebApp version support.

## What Was Changed
- Moved Telegram WebApp script loading out of SSR-sensitive layout script path into a client-only effect inside the Telegram provider.
- Kept bootstrap logic client-side and safe for non-Telegram browsers.
- Added a Telegram version guard (`>= 6.1`) before calling `setHeaderColor`.
- Did not use `suppressHydrationWarning`; the fix is structural.
- Preserved existing Phase 0 UI and project structure.

## What Was NOT Changed
- No Phase 1 features.
- No auth validation implementation.
- No payments/subscriptions/family/premium business logic.
- No data model or Supabase business flow changes.
- No new routing or UI behavior changes beyond bootstrap safety.

## Files Modified
- `src/app/layout.tsx`
- `src/components/telegram/telegram-mini-app-provider.tsx`
- `src/lib/telegram/web-app.ts`
- `docs/phase0_1_hydration_bugfix_report.md`

## Validation Checks Run
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run dev`: starts successfully.

## Hydration Fix Verification Status
- The structural cause was addressed by removing `beforeInteractive` Telegram script mutation from SSR-sensitive layout flow.
- In this environment, I did not run an interactive Telegram client session, so Telegram-specific runtime confirmation is **not** fully verified here.
- Normal browser crash regression is not expected; client bootstrap guards still handle missing `window.Telegram`.

## Exact Manual Verification Steps
1. Run `npm run dev`.
2. Open `http://localhost:3000` in a regular browser and confirm app renders without hydration mismatch warnings in console.
3. Open the app inside Telegram Mini App context and confirm no hydration warning appears.
4. In Telegram context, confirm no warning about unsupported header color API on older WebApp versions.
5. Confirm existing UI (header, landing cards, bottom placeholder nav) remains unchanged.

## Remaining Caveats
- Telegram-context verification remains manual; it was not fully reproducible inside this terminal-only environment.
- If Telegram runtime injects additional DOM mutations in future SDK versions, re-check hydration behavior after upgrades.
