# Phase 26C - Supporter Badge Foundation

- Date: 2026-04-03
- Status: implemented, pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_premium_removal.md`
- Additional source-of-truth used:
  - `docs/reports/phase_26A_premium_removal_donation_only_reset.md`
  - `docs/reports/phase_26B_donation_only_ux_stabilization.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Runtime and foundation surfaces inspected before edits:
- `src/components/app/profile-scenarios-placeholder.tsx`
- owner/admin/runtime profile surfaces available after 26A-26B (Profile only)
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- `src/lib/config/client-env.ts`
- `src/lib/config/server-env.ts`
- `src/lib/i18n/localization.tsx`
- `src/lib/app-context/service.ts`
- `src/lib/profile/repository.ts`
- `src/hooks/use-current-app-context.ts`
- DB schema/migrations around `public.profiles` and active auth/context reads

## 2) Chosen badge/data/admin approach

Chosen model:
1. Supporter badge is profile-level recognition only.
2. Badge state is stored directly on `public.profiles` (minimal foundation, no donor CRM).
3. Owner assignment is manual and owner-only through a small API + compact owner controls in Profile.
4. Owner identity control is env-based allowlist of Telegram user ids:
   - `SUPPORTER_BADGE_OWNER_TELEGRAM_USER_IDS`
5. User-facing badge is a compact Profile label shown only when active.

Explicit non-goals preserved:
- no Premium model
- no entitlement/access gating
- no donor-only feature unlock
- no claim/review/payment verification flow

## 3) Migration and data layer added

Created migration:
- `supabase/migrations/20260403183000_phase26c_supporter_badge_foundation.sql`

Added profile columns:
- `supporter_badge_active boolean not null default false`
- `supporter_badge_granted_at timestamptz`
- `supporter_badge_revoked_at timestamptz`
- `supporter_badge_note text`
- `supporter_badge_source text`
- `supporter_badge_granted_by_telegram_user_id text`
- `supporter_badge_revoked_by_telegram_user_id text`

Added safety constraints:
- note/source length checks
- granted/revoked telegram user id format checks
- active-state consistency check
- revoked-after-granted timestamp check

Added index:
- `profiles_supporter_badge_active_idx` (partial index for active supporters)

Repository updates:
- profile payload mapping now includes:
  - `supporterBadgeActive`
  - `supporterBadgeGrantedAt`
- added owner action repository method:
  - `updateSupporterBadgeForTelegramUser(...)`

## 4) How owner assignment works now

Backend:
- New owner-only API route:
  - `src/app/api/supporters/badge/route.ts`
- Action contract:
  - `grant`
  - `revoke`
- Input identity:
  - target Telegram user id (stable numeric id)
- Owner authorization:
  - checked via `SUPPORTER_BADGE_OWNER_TELEGRAM_USER_IDS`
  - helper: `src/lib/supporter/access.ts`

Frontend owner controls:
- Profile now shows a compact owner-only `Supporter badge management` block only when `canManageSupporters === true`.
- Owner can:
  - mark target user as supporter
  - remove supporter badge
  - optionally add a short owner note
- UI returns current target badge snapshot after each action.

## 5) How user-facing badge works now

Profile user section:
- if current user has active badge:
  - shows compact `Supporter badge` label
  - shows `Since {date}` when grant timestamp is present
  - shows short appreciation line
- if badge is inactive:
  - no extra empty badge noise is rendered

This is cosmetic recognition only and does not alter app access.

## 6) Runtime/config/copy updates completed

Updated files:
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/hooks/use-current-app-context.ts`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- `src/lib/app-context/service.ts`
- `src/lib/profile/repository.ts`
- `src/lib/config/server-env.ts`
- `src/lib/i18n/localization.tsx`
- `.env.example`

Added file:
- `src/lib/supporter/access.ts`

## 7) What was intentionally not changed

1. No Premium/entitlement domain was restored.
2. No donor automation/provider verification added.
3. No supporter-gated feature logic added.
4. No donation rails behavior changes (Boosty + CloudTips remain ordinary support links).
5. No reminders/history/family/workspace/payment logic redesign.
6. No broad profile redesign beyond supporter recognition + owner management block.

## 8) Risks and follow-ups

Risk:
- Owner management depends on correct env allowlist configuration (`SUPPORTER_BADGE_OWNER_TELEGRAM_USER_IDS`).

Follow-up (future, optional):
1. Add tiny owner-side search convenience (without changing security model).
2. Later roadmap gratitude feature can reuse badge foundation, still without access gating.

## 9) Manual DB sync notes (required)

Apply migration:
- `supabase/migrations/20260403183000_phase26c_supporter_badge_foundation.sql`

Post-apply verification SQL:

```sql
select
  column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in (
    'supporter_badge_active',
    'supporter_badge_granted_at',
    'supporter_badge_revoked_at',
    'supporter_badge_note',
    'supporter_badge_source',
    'supporter_badge_granted_by_telegram_user_id',
    'supporter_badge_revoked_by_telegram_user_id'
  )
order by column_name;
```

Expected:
- all listed columns are present.

## 10) Exact recommended next step

Run targeted manual verification in Telegram Mini App:
1. Verify normal user sees no owner badge-management block.
2. Verify allowlisted owner can grant/revoke by target Telegram user id.
3. Verify granted user sees compact badge and unrestricted app behavior remains unchanged.
4. Verify donation rails, reminders/history/family/onboarding/bug-report baselines remain intact.

## 11) Concise manual verification notes

Manual device verification was not executed in this coding pass.

Local automated validation executed:
- `npm run lint` - pass
- `npm run build` - pass
