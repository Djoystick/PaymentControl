# Phase 29A - Telegram Language Compliance + Mini App Analytics Integration

- Date: 2026-04-05
- Status: implemented, pending manual verification
- Scope: platform-readiness pass for Mini App language behavior and Telegram Analytics SDK wiring
- Baseline preserved:
  - donation-only unrestricted product truth (no Premium/paywall return)
  - recurring + history + profile guides unchanged by business logic
  - full Travel v1 baseline (28A-28Q) preserved
  - no BotFather/bot-message scope

## 1) Audit findings before changes

Checked source-of-truth docs and runtime implementation in:
1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
2. `docs/reports/phase_27H_final_release_sign_off_and_verified_closure_sync.md`
3. `docs/reports/phase_28A...phase_28Q` reports
4. `docs/reports/internal_version_history.md`
5. `src/lib/i18n/localization.tsx`
6. `src/lib/telegram/web-app.ts`
7. `src/components/telegram/telegram-mini-app-provider.tsx`
8. `src/components/app/profile-scenarios-placeholder.tsx`
9. `src/lib/config/client-env.ts`

Main issues found:
1. Language auto-detection used `window.navigator.language` fallback, not Telegram `language_code`.
2. Old language storage behavior persisted auto-detected language, mixing user override with auto source.
3. Telegram Analytics SDK was not integrated.
4. No env wiring for Telegram Analytics token/app identifier.

## 2) How language logic was changed

Previous behavior:
1. Read local storage key.
2. Fallback to browser language (`navigator.language`).
3. Fallback to English.

New behavior:
1. Read manual in-app override (`payment_control_ui_language_override_v29a`).
2. If manual override exists, use it (highest priority).
3. Else resolve Telegram `language_code`.
4. If Telegram language is supported (`ru`, `en`), use it.
5. If unsupported/missing, fallback to English.

## 3) Telegram-based language detection model

Implemented Telegram language extraction in `src/lib/telegram/web-app.ts`:
1. From `window.Telegram.WebApp.initDataUnsafe.user.language_code` when available.
2. Fallback parse from Telegram `initData` user payload.
3. Added launch-params fallback for `tgWebAppData` from URL hash/search to improve early Telegram context resolution.

Important:
1. Browser/system/IP language is no longer used as auto source.
2. App fallback remains deterministic: English.

## 4) English fallback and manual override behavior

English fallback:
1. Explicit default language is English when Telegram code is absent/unsupported.

Manual override:
1. User can still switch RU/EN from Profile.
2. Manual choice is persisted in local storage (`payment_control_ui_language_override_v29a`).
3. Manual choice has priority over Telegram auto-detection.
4. Telegram-ready event can update language only when no manual override is set.

## 5) Telegram Analytics SDK integration

SDK integration implemented via npm package:
1. Installed dependency: `@telegram-apps/analytics`.
2. Added safe initializer module: `src/lib/telegram/analytics.ts`.
3. Added client env wiring in `src/lib/config/client-env.ts`.
4. Early initialization call added before app render path in `src/components/app/profile-scenarios-placeholder.tsx`.
5. Re-initialization safety hook also triggered during Telegram bootstrap in `src/components/telegram/telegram-mini-app-provider.tsx`.

Behavior guarantees:
1. If analytics env is not configured, app continues normally (no crash).
2. No fake tokens/app identifiers were added.
3. Initialization remains lightweight; no large event-taxonomy refactor added.

## 6) Manual env/config values required from user

Added placeholders in `.env.example`:
1. `NEXT_PUBLIC_TELEGRAM_ANALYTICS_TOKEN=`
2. `NEXT_PUBLIC_TELEGRAM_ANALYTICS_APP_NAME=`
3. `NEXT_PUBLIC_TELEGRAM_ANALYTICS_ENV=` (`STG` or `PROD`, optional)

Manual action required:
1. Fill token and analytics identifier with real values from your Telegram analytics setup.
2. Keep empty in local/dev if analytics is not needed yet.

## 7) Mini app language cleanup result

Validation outcome for this pass:
1. Root navigation labels remain localization-driven through `tr(...)`.
2. Onboarding, empty/loading/error states continue to use localization layer.
3. Travel/recurring/receipt/settlement status strings remain centralized in localization map.
4. English remains stable base text key language.

No separate copy-wave was introduced in 29A; this was a compliance and bootstrap pass.

## 8) What was intentionally NOT changed

1. No BotFather/profile/menu/about edits.
2. No `/start` bot message changes.
3. No shell redesign.
4. No new Travel/Recurring business feature wave.
5. No schema migrations.
6. No guide-layer (28B/28C) product rework.

## 9) Risks / regression watchlist

1. Analytics SDK package currently reports upstream deprecation notices in npm output; future migration to successor package may be needed.
2. Verify first-load language in real Telegram clients (iOS/Android/Desktop) for edge launch-param differences.
3. Confirm manual language override persistence after Telegram relaunch in production Mini App container.
4. Confirm analytics token/appName are set in deployment env; otherwise integration remains intentionally inactive.

## 10) Verification commands run

Executed:
1. `npm run lint` (pass; existing unrelated `no-img-element` warnings remain in travel receipt UI)
2. `npm run build` (pass)
3. Targeted lint check for touched files:
   - `npm run lint -- src/lib/i18n/localization.tsx src/lib/telegram/web-app.ts src/lib/telegram/analytics.ts src/components/telegram/telegram-mini-app-provider.tsx src/components/app/profile-scenarios-placeholder.tsx src/lib/config/client-env.ts`

## 11) Acceptance criteria self-check

1. English-first fallback in Mini App: done.
2. Language detection via Telegram `language_code`: done.
3. Manual language override preserved and prioritized: done.
4. Telegram Analytics SDK integrated via npm before render path, with safe no-config behavior: done.
5. Baseline (Recurring + Travel v1 + release truth) not broken by scope: done by code scope and build/lint checks.

