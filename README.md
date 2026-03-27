# Payment Control Mini App

This project is a Telegram Mini App foundation for recurring payments, subscriptions, and household expenses tracking.

Runtime deployment and live Telegram setup:
- `docs/runtime_setup_guide_for_beginner.md` (very detailed beginner guide)
- `docs/phase9a_runtime_integration_report.md` (technical pass report)

Phase 8C keeps accepted subscriptions/reminders foundations intact, preserves Phase 8A/8B family foundation, and adds minimal personal/shared payment distinction:
- binding diagnostics
- authoritative verified binding for normal send flows
- stale error-state cleanup after successful delivery
- consistent readiness/test-send/dispatch source behavior
- secure scheduled dispatch endpoint (secret-protected)
- Vercel cron path hookup via `vercel.json`
- recurring payment subscription classification (`is_subscription`)
- subscription-friendly starter templates
- compact subscriptions summary + list distinction in recurring payments UI
- compact subscription renewals visibility (due today / upcoming / overdue)
- compact subscription cost-pressure visibility (due today / upcoming 7d / overdue totals by currency)
- subscription pause/resume operational state for subscription payments
- compact paused-subscriptions visibility + monthly savings/load relief by currency
- compact subscription health / at-risk visibility
- minimal family workspace create/switch foundation
- minimal family invite create/read/accept foundation
- recurring payment scope marker in API payload (`personal` / `shared`)
- minimal family recurring payments create/list path in active family workspace

## Scope
- Keep existing reminders, dispatch, and logs working
- Add a lightweight subscriptions layer on top of recurring payments
- Make verified stored chat binding authoritative for normal delivery flows
- Keep diagnostics transparent and consistent after successful verification/sending
- Add minimal automated dispatch foundation via secure internal endpoint
- Add minimal Vercel deployment hook without introducing scheduler framework

## What Is Implemented
- Added recipient binding persistence table (`telegram_recipient_bindings`)
- Added binding diagnostics fields:
  - source (`profile_telegram_user_id` / `stored_chat_id`)
  - status (`missing` / `unverified` / `verified` / `invalid`)
  - verified timestamp
  - last status reason (+ inference flag)
- Added readiness endpoint improvements with binding diagnostics:
  - `POST /api/payments/reminders/readiness`
- Updated recipient resolution:
  - verified numeric `stored_chat_id` is now authoritative for normal delivery flows
  - fallback sources are used only when verified binding is unavailable
- Added binding verify endpoint:
  - `POST /api/payments/reminders/binding/verify`
  - reuses the same delivery path as dispatch/test-send
  - supports optional `recipientChatId` for manual private-chat binding verification
- Added manual test-send endpoint flow using same send path as dispatch:
  - `POST /api/payments/reminders/test-send`
- Added secure internal scheduled dispatch endpoint:
  - `POST /api/internal/reminders/scheduled-dispatch` (manual/internal trigger)
  - `GET /api/internal/reminders/scheduled-dispatch` (Vercel cron trigger)
  - secret-protected via:
    - `x-reminder-schedule-secret` (manual/internal POST)
    - `Authorization: Bearer <CRON_SECRET>` (Vercel cron GET)
  - accepts server env secrets from:
    - `CRON_SECRET`
    - `REMINDER_SCHEDULED_DISPATCH_SECRET` (compatibility fallback)
  - reuses existing candidate logic, delivery helper, attempt logging, and idempotency
- Added `vercel.json` cron config that targets:
  - `/api/internal/reminders/scheduled-dispatch`
- Added recurring payment subscription classification:
  - `public.recurring_payments.is_subscription` (Phase 7A migration)
  - create/update/list payloads now include `isSubscription`
- Extended starter templates with subscription-friendly defaults:
  - Internet, Mobile, Gym, Streaming, Insurance are marked as subscription templates
- Added compact subscriptions UI surface inside recurring payments section:
  - active subscriptions count
  - unpaid subscriptions this cycle count
  - monthly subscription totals grouped by currency (weekly uses 52/12 monthly equivalent)
  - simple list distinction (`Subscription` badge) and filter toggle (`Show subscriptions only`)
- Added compact subscription renewals block in recurring payments section (subscription-only, active + unpaid):
  - due today count
  - upcoming count for next 7 days
  - overdue count
  - short due today / upcoming / overdue renewal lists
  - lightweight quick action (`Focus subscriptions`)
- Added compact subscription cost-pressure block in recurring payments section:
  - due today totals by currency
  - upcoming (7d) totals by currency
  - overdue totals by currency
  - explicit no-FX conversion note (multi-currency grouped output)
- Added subscription pause/resume foundation:
  - `is_paused` field on recurring payments
  - lightweight pause/resume API actions
  - UI pause/resume action on subscription cards with paused marker
  - paused subscriptions excluded from subscription summary/renewals/cost-pressure actionable surfaces
  - paused subscriptions excluded from reminder candidate generation (manual/scheduled dispatch reuse)
- Added compact paused-subscriptions surface:
  - paused subscriptions count
  - short paused subscriptions list
  - monthly savings/load relief totals grouped by currency
  - lightweight filter action (`Show paused subscriptions`)
- Added compact `Subscription Health` block:
  - overdue subscriptions count
  - unpaid current-cycle subscriptions count
  - paused subscriptions count
  - subscriptions with reminders off count
  - tiny `Needs attention` list (top 3) built from existing overdue/reminders-off data
- Added family workspace foundation:
  - create family workspace path (`POST /api/workspaces/family/create`)
  - active workspace switch path (`PATCH /api/workspaces/active`)
  - owner is persisted as workspace member
  - current app context now includes available workspace list for minimal switching UI
- Added family invite flow foundation:
  - owner-only invite creation path (`POST /api/workspaces/family/invites/create`)
  - compact current invite read path (`POST /api/workspaces/family/invites/current`)
  - invite acceptance path (`POST /api/workspaces/family/invites/accept`)
  - invite persistence with status/expiry/accepted metadata
- Added improved Telegram chat-not-found mapping:
  - `TELEGRAM_CHAT_NOT_FOUND_BOT_NOT_STARTED_INFERENCE`
  - `TELEGRAM_CHAT_NOT_FOUND_STALE_BINDING_INFERENCE`
  - `TELEGRAM_CHAT_NOT_FOUND_USERNAME_INFERENCE`
  - `TELEGRAM_CHAT_NOT_FOUND_UNKNOWN_BINDING_INFERENCE`
- Added UI onboarding block:
  - short instruction to open bot and press Start
  - `Open Telegram bot` link when `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` is configured
- Added richer readiness diagnostics in reminder UI:
  - recipient source
  - recipient type (`telegram_private_chat_id`, `telegram_user_id_only`, `username`, etc.)
  - recipient preview
  - binding diagnostic status (`valid`, `invalid`, `missing`, `stale`, `unverified`)
  - active recipient source marker for authoritative verified binding

## Intentionally Not Implemented
- Worker/queue/retry engine
- Full notification center
- Family/shared reminder flows
- Premium gating
- Localization overhaul
- Large auth/profile/workspace refactor
- Worker/queue/retry orchestration framework
- family responsibility / "who pays" model
- shared balances/splits/family economics

## API Endpoints
- `POST /api/auth/telegram/bootstrap`
- `POST /api/app/context`
- `PATCH /api/profile/scenario`
- `POST /api/payments/dashboard`
- `POST /api/payments/recurring/list`
- `POST /api/payments/recurring`
- `PATCH /api/payments/recurring/[paymentId]`
- `POST /api/payments/recurring/[paymentId]/archive`
- `POST /api/payments/recurring/[paymentId]/cycle/paid`
- `POST /api/payments/recurring/[paymentId]/cycle/unpaid`
- `POST /api/payments/recurring/[paymentId]/pause`
- `POST /api/payments/recurring/[paymentId]/resume`
- `POST /api/payments/reminders/candidates`
- `POST /api/payments/reminders/dispatch`
- `POST /api/payments/reminders/readiness`
- `POST /api/payments/reminders/binding/verify`
- `POST /api/payments/reminders/test-send`
- `POST /api/workspaces/family/create`
- `PATCH /api/workspaces/active`
- `POST /api/workspaces/family/invites/create`
- `POST /api/workspaces/family/invites/current`
- `POST /api/workspaces/family/invites/accept`
- `POST /api/internal/reminders/scheduled-dispatch`
- `GET /api/internal/reminders/scheduled-dispatch`

## Database Setup
Apply migrations in order (`YYYYMMDDHHMMSS_name.sql`):
1. `supabase/migrations/20260325010000_phase1a_profiles.sql`
2. `supabase/migrations/20260325020000_phase2a_personal_workspaces.sql`
3. `supabase/migrations/20260325030000_phase3a_recurring_payments.sql`
4. `supabase/migrations/20260325040000_phase3b_payment_cycle_state.sql`
5. `supabase/migrations/20260325060000_phase6a_reminder_preferences.sql`
6. `supabase/migrations/20260325061000_phase6b_reminder_dispatch_attempts.sql`
7. `supabase/migrations/20260325062000_phase6c_reminder_attempt_reason_test_send.sql`
8. `supabase/migrations/20260325063000_phase6d_telegram_recipient_bindings.sql`
9. `supabase/migrations/20260325070000_phase7a_subscriptions_layer.sql`
10. `supabase/migrations/20260325071000_phase7d_subscription_pause_resume.sql`
11. `supabase/migrations/20260326080000_phase8b_family_invites.sql`
12. `supabase/migrations/20260326081000_phase8d_family_responsibility.sql`
13. `supabase/migrations/20260327090000_phase9c_family_shared_economics_foundation.sql`

## Env Notes
Server:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_API_BASE_URL` (default `https://api.telegram.org`)
- `CRON_SECRET` (recommended for Vercel cron auth)
- `REMINDER_SCHEDULED_DISPATCH_SECRET` (optional compatibility secret for manual/internal POST trigger)

Client:
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (used for onboarding link)

## Manual Verification (Phase 6E)
1. Apply migrations up to Phase 6D.
2. Open reminder section.
3. Check readiness block:
- source
- recipient diagnostic source and recipient type
- recipient preview (for chat-id diagnostics)
- binding status
- verified timestamp (when available)
- status reason and inference marker
4. Use onboarding link and press Start in Telegram bot chat.
5. (Optional) Enter numeric private chat id and click `Verify binding`.
6. Run `Send test message` and verify it uses the same verified stored chat-id source.
7. Run `Run dispatch` and verify it uses the same recipient source.
8. Verify stale `last_error_code`/`last_error_message` are cleared after successful send.
9. Confirm logs in both tables:
```sql
select * from public.telegram_recipient_bindings;
```
```sql
select reminder_reason, dispatch_status, error_code, error_message, trigger_source, created_at
from public.reminder_dispatch_attempts
order by created_at desc;
```

## Internal Scheduled Dispatch Trigger
Use this endpoint for cron/deployment trigger integration:

`POST /api/internal/reminders/scheduled-dispatch`

Required header:
- `x-reminder-schedule-secret: <REMINDER_SCHEDULED_DISPATCH_SECRET>`

PowerShell local invocation example:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/internal/reminders/scheduled-dispatch" `
  -Headers @{ "x-reminder-schedule-secret" = $env:REMINDER_SCHEDULED_DISPATCH_SECRET }
```

Response summary includes:
- `workspacesSeen`
- `workspacesEligible`
- `candidatesSeen`
- `attemptsCreated`
- `duplicatesSkipped`
- `sent`
- `skipped`
- `failed`

Operational note:
- This endpoint provides run snapshots, not long-horizon proof of cron health.
- To close production verification debt, observe repeated scheduled runs over time in Vercel logs and `reminder_dispatch_attempts` (`trigger_source = scheduled_dispatch`).

## Vercel Cron Hookup
1. Keep `vercel.json` in repo with cron path:
   - `/api/internal/reminders/scheduled-dispatch`
2. In Vercel project envs, set:
   - `CRON_SECRET`
3. Ensure endpoint path is reachable on production deployment.
4. Vercel cron will invoke:
   - `GET /api/internal/reminders/scheduled-dispatch`
   - `Authorization: Bearer <CRON_SECRET>`
5. Verify scheduled runs by checking:
   - API response logs in Vercel
   - `reminder_dispatch_attempts.trigger_source = scheduled_dispatch`

## Phase 7A/7B/7C/7D/7E/7F/8A/8B Manual Verification
1. Apply migrations:
   - `supabase/migrations/20260325070000_phase7a_subscriptions_layer.sql`
   - `supabase/migrations/20260325071000_phase7d_subscription_pause_resume.sql`
2. Open the app and go to `Recurring Payments`.
3. Use a starter template such as `Streaming` or `Mobile` and verify the form is prefilled with `Mark as subscription` enabled.
4. Create payment and confirm the row in Supabase has `is_subscription = true`.
5. Confirm UI shows:
   - `Subscription` badge on subscription rows
   - `Subscriptions Summary` block with active/unpaid counts
   - monthly totals grouped by currency
6. Toggle `Show subscriptions only` and verify filtering works.
7. Edit a payment and change `Mark as subscription`, then save and verify the list and summary update.
8. Verify `Subscription Renewals` block shows subscription-only unpaid renewals:
   - due today
   - upcoming (next 7 days)
   - overdue
9. Verify short renewal lists are populated correctly for due today/upcoming/overdue categories.
10. Verify `Subscription Cost Pressure` block shows grouped totals by currency for:
    - due today
    - upcoming (7d)
    - overdue
11. Pause a subscription card and verify:
    - `Paused` marker is visible
    - pause/resume button toggles state
    - paused item is excluded from Subscription Summary / Renewals / Cost Pressure blocks
12. Verify paused subscriptions are excluded from reminder candidates/dispatch results.
13. Resume the same subscription and verify it returns into actionable subscription flows.
14. Verify `Paused Subscriptions` block shows:
    - paused count
    - short paused list
    - monthly savings/load relief grouped by currency (no FX conversion)
15. Verify `Subscription Health` block shows:
    - overdue count
    - unpaid current-cycle count
    - paused count
    - reminders off count
    - tiny `Needs attention` list
16. Create family workspace via Profile section and verify it becomes current workspace.
17. Verify workspace switch surface can switch between personal and family workspaces.
18. In family workspace as owner, create invite and verify token appears in invite block.
19. Use invite token in `Accept invite` input (with another profile/dev fallback identity) and verify membership attach succeeds.
20. Verify switched profile can then switch into family workspace via existing workspace switch surface.
21. Verify personal payments/reminders/subscriptions flows remain working when switched back to personal workspace.
22. In active family workspace, open recurring payments and create a new payment.
23. Verify family recurring list returns/shows created payment with `paymentScope = shared` marker.
24. Verify personal workspace payments keep `paymentScope = personal` marker.
25. Verify reminder endpoints in family workspace remain explicitly unsupported in this phase.

## Validation Commands
```bash
npm run lint
npm run build
```

## Reports
- `docs/phase0_foundation_report.md`
- `docs/phase0_1_hydration_bugfix_report.md`
- `docs/phase1a_auth_profile_foundation_report.md`
- `docs/phase2a_personal_workspace_foundation_report.md`
- `docs/phase2b_current_context_foundation_report.md`
- `docs/phase2b_bugfix_report.md`
- `docs/phase3a_recurring_payments_foundation_report.md`
- `docs/phase3b_payment_cycle_state_foundation_report.md`
- `docs/phase4a_dashboard_mvp_foundation_report.md`
- `docs/phase5a_quick_add_templates_foundation_report.md`
- `docs/phase6a_reminder_preferences_foundation_report.md`
- `docs/phase6b_minimal_reminder_dispatch_foundation_report.md`
- `docs/phase6c_telegram_delivery_readiness_report.md`
- `docs/phase6d_telegram_chat_binding_onboarding_report.md`
- `docs/phase6e_verified_binding_delivery_unification_report.md`
- `docs/phase6f_delivery_ux_cleanup_report.md`
- `docs/phase6f1_public_bot_username_bugfix_report.md`
- `docs/phase6g_scheduled_dispatch_foundation_report.md`
- `docs/phase6g1_scheduled_dispatch_type_bugfix_report.md`
- `docs/phase6h_vercel_cron_hookup_report.md`
- `docs/phase7a_subscriptions_layer_foundation_report.md`
- `docs/phase7b_subscription_renewals_visibility_report.md`
- `docs/phase7c_subscription_cost_pressure_report.md`
- `docs/phase7d_subscription_pause_resume_foundation_report.md`
- `docs/phase7e_paused_subscriptions_visibility_report.md`
- `docs/phase7f_subscription_health_visibility_report.md`
- `docs/phase8a_family_workspace_foundation_report.md`
- `docs/phase8b_family_invite_flow_foundation_report.md`
- `docs/phase8b1_family_invite_create_bugfix_report.md`
- `docs/phase8c_personal_shared_payment_distinction_report.md`
