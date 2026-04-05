# Phase 29A.1 - Telegram Language Bootstrap Flicker Fix

- Date: 2026-04-05
- Status: implemented, pending manual verification
- Scope: narrow corrective pass for cold-start language flicker in Telegram Mini App
- Baseline preserved:
  - English fallback remains active product truth
  - Telegram `language_code` remains primary auto source
  - manual language override remains highest priority
  - no browser/system/IP auto-detection return
  - no bot-facing/BotFather scope

## 1) Flicker source found in audit

Root cause was in `src/lib/i18n/localization.tsx` bootstrap path:
1. `resolveInitialLanguage()` always returned `"en"`.
2. Real language was applied later in `useEffect` via `requestAnimationFrame` + `setLanguageState(resolveClientLanguage())`.
3. On cold Telegram start this produced visible first paint in English, then switch to Russian when Telegram context was resolved.

This was a pure bootstrap timing seam, not a translation catalog issue.

## 2) Bootstrap language path fix

Implemented targeted fix in `src/lib/i18n/localization.tsx`:
1. `resolveInitialLanguage()` now resolves through `resolveClientLanguage()` directly.
2. Removed delayed `requestAnimationFrame` language reassignment from `useEffect`.
3. Kept `telegram-webapp-ready` listener to refresh language only when needed and only if no manual override exists.

Result:
1. If manual override exists -> first client render starts immediately in manual language.
2. If manual override is absent but Telegram language is already extractable early -> first client render uses Telegram language immediately.
3. English fallback is still used only when Telegram language is truly unavailable at bootstrap time.

## 3) English fallback preservation

English fallback model is unchanged:
1. Telegram language unsupported/missing -> fallback to English.
2. No browser-language fallback reintroduced.

## 4) Manual override preservation

Manual override behavior is unchanged:
1. User-selected RU/EN still persists in local storage.
2. Manual choice still has priority over auto-detection.
3. `telegram-webapp-ready` sync path still respects manual override guard.

## 5) Analytics compatibility

No changes to 29A analytics wiring:
1. Early analytics init path remains active.
2. No changes to token/env wiring or graceful no-config behavior.

## 6) What was intentionally NOT changed

1. No localization catalog rewrite.
2. No shell redesign.
3. No bot messages/BotFather configuration edits.
4. No Travel/Recurring feature changes.
5. No analytics event model expansion.

## 7) Risks / regression watchlist

1. In environments where Telegram language arrives strictly after first client render and cannot be extracted from early context, a tiny delayed switch may still be theoretically possible, but this pass removes the guaranteed RAF-induced flash path.
2. Manual verification in real Telegram clients (iOS/Android/Desktop) is still required for cold-start UX confirmation.

## 8) Verification

Executed:
1. `npm run lint` (pass; existing unrelated `@next/next/no-img-element` warnings remain in travel receipt UI)
2. `npm run build` (pass)
3. targeted checks for touched language bootstrap path:
   - `node --test src/lib/telegram/web-app.test.ts` (sandbox EPERM in this environment)
   - equivalent targeted inline Node assertions for `getTelegramLanguageCode` extraction paths (pass)

## 9) Acceptance criteria self-check

1. Language flicker source identified and corrected: done.
2. Bootstrap path fixed without heavy refactor: done.
3. English fallback preserved: done.
4. Manual override priority preserved: done.
5. 29A model and startup baseline not broken by scope: done by code scope + lint/build checks.

