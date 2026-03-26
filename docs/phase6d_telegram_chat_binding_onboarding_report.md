# Phase 6D - Telegram Chat Binding Onboarding Report

Date: 2026-03-25  
Pass: Phase 6D (strictly narrow/local over accepted Phase 6C)

## 1. Scope
- Keep Phase 6B/6C reminder foundation intact.
- Make recipient resolution transparent for private chat delivery diagnostics.
- Add a minimal manual binding verification path without scheduler/worker/queue.
- Improve `chat not found` diagnostics beyond generic `TELEGRAM_API_ERROR`.

## 2. What Was Implemented
- Extended readiness payload diagnostics:
  - `recipientDiagnosticSource`
  - `recipientType`
  - `recipientPreview`
  - `bindingDiagnosticStatus`
- Added explicit recipient type classification for diagnostics:
  - `telegram_private_chat_id`
  - `telegram_user_id_only`
  - `username`
  - `profile_field`
  - `workspace_field`
  - `derived_binding`
  - `unknown`
- Added additional preflight/readiness code:
  - `RECIPIENT_USERNAME_INSTEAD_OF_CHAT_ID_INFERENCE`
- Improved Telegram `chat not found` mapping:
  - `TELEGRAM_CHAT_NOT_FOUND_USERNAME_INFERENCE`
  - `TELEGRAM_CHAT_NOT_FOUND_STALE_BINDING_INFERENCE`
  - `TELEGRAM_CHAT_NOT_FOUND_BOT_NOT_STARTED_INFERENCE`
  - `TELEGRAM_CHAT_NOT_FOUND_UNKNOWN_BINDING_INFERENCE`
- Added controlled binding verify endpoint:
  - `POST /api/payments/reminders/binding/verify`
  - optional `recipientChatId` input for numeric private chat-id override
  - uses the same `sendTelegramMessageWithPreflight` delivery path
  - persists binding observation result (`verified`/`invalid`/`missing`/`unverified`)
- Added minimal helper to persist manual chat-id candidate into existing binding table.
- Updated reminder UI:
  - shows recipient source/type/preview + binding diagnostic status
  - adds compact manual binding verification block with optional chat-id input
  - keeps existing readiness, test-send, dispatch, recent attempts flows
- Updated phase labels to 6D in current UI sections.
- Updated README for new verify path and diagnostics semantics.

## 3. What Was Intentionally NOT Implemented
- Scheduler/cron/background worker.
- Retry queue engine.
- Full notification center.
- Family/shared reminder binding flow.
- Premium gating.
- Full localization.
- Large auth/profile/workspace refactor.
- Advanced identity subsystem.

## 4. Exact Files Created/Modified

Created:
- `src/app/api/payments/reminders/binding/verify/route.ts`

Modified:
- `src/lib/payments/types.ts`
- `src/lib/payments/telegram-delivery.ts`
- `src/lib/payments/reminder-dispatch.ts`
- `src/lib/payments/recipient-binding.ts`
- `src/lib/payments/client.ts`
- `src/app/api/payments/reminders/readiness/route.ts`
- `src/components/app/reminder-candidates-section.tsx`
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `README.md`
- `docs/phase6d_telegram_chat_binding_onboarding_report.md`

## 5. Manual Verification Steps
1. Ensure migrations up to Phase 6D are applied, including:
   - `supabase/migrations/20260325_063000_phase6d_telegram_recipient_bindings.sql`
2. Start app and open reminder section.
3. Check readiness diagnostics block shows:
   - source
   - diagnostic source
   - recipient type
   - recipient preview
   - binding diagnostic status
4. Use onboarding guidance to open bot and press `Start` in Telegram.
5. Optional: enter numeric private chat id in "Recipient Binding Verification" and run `Verify binding`.
6. Run `Send test message` and `Run dispatch` to confirm baseline reminder flows still execute.
7. Verify DB rows:
   - `public.telegram_recipient_bindings`
   - `public.reminder_dispatch_attempts`
8. For failing cases, verify returned diagnostic codes differentiate:
   - username vs chat-id mismatch
   - stale binding mismatch
   - likely bot-not-started
   - unknown binding failure

## 6. Known Limitations
- Chat-not-found diagnostics are inference-based and not absolute certainty.
- This pass does not implement automated delivery scheduling.
- Personal workspace scope only.
- No retry queue or delivery orchestration beyond manual actions.

## 7. Runtime Confirmation Status
- Confirmed in this environment:
  - `npm run lint` passed
  - `npm run build` passed
  - route present in build output: `/api/payments/reminders/binding/verify`
- Not confirmed in this environment during this pass:
  - successful real Telegram delivery to a live private chat via UI click-through
  - full end-to-end manual validation of recipient binding with actual Telegram response
