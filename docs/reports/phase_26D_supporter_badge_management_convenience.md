# Phase 26D - Supporter Badge Management Convenience

- Date: 2026-04-03
- Status: implemented, pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_premium_removal.md`
- Additional source-of-truth used:
  - `docs/reports/phase_26A_premium_removal_donation_only_reset.md`
  - `docs/reports/phase_26B_donation_only_ux_stabilization.md`
  - `docs/reports/phase_26C_supporter_badge_foundation.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Inspected before edits:
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/app/api/supporters/badge/route.ts`
- `src/lib/supporter/access.ts`
- `src/lib/profile/repository.ts`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- `src/lib/i18n/localization.tsx`
- supporter badge schema shape in `public.profiles` from `supabase/migrations/20260403183000_phase26c_supporter_badge_foundation.sql`

## 2) Owner-side friction after 26C

Observed friction in 26C baseline:
1. Owner could grant/revoke only by raw numeric Telegram user id input, without quick "check target first" action.
2. Target snapshot was shown only after mutation, so pre-action status checks were less convenient.
3. Input guidance was minimal (easy to paste non-numeric or ambiguous data).
4. Action safety could be improved with explicit confirmation wording.

## 3) Convenience improvements added in 26D

### 3.1 Owner lookup helper (safe, owner-only)

Enhanced `src/app/api/supporters/badge/route.ts`:
- added `GET /api/supporters/badge?targetTelegramUserId=...` for owner-only status lookup;
- requires `x-telegram-init-data` header and the same owner allowlist check via `canManageSupporterBadges`;
- keeps numeric Telegram user id as authoritative target key;
- returns target supporter snapshot plus `checkedAt`;
- does not perform any grant/revoke mutation.

Data read support added in `src/lib/profile/repository.ts`:
- `readSupporterBadgeAdminTargetByTelegramUserId(...)`
- uses same safe selection payload as mutation response;
- handles not-found/foundation-not-ready/read-failed outcomes explicitly.

Typed client support:
- `src/lib/auth/types.ts` added `SupporterBadgeLookup*` response/error types.
- `src/lib/auth/client.ts` added `lookupSupporterBadgeTarget(...)`.

### 3.2 Owner panel ergonomics and feedback

Updated `src/components/app/profile-scenarios-placeholder.tsx`:
- Telegram id input now normalizes to digits-only and caps at 20 chars;
- added compact helper text explaining what to paste and what is not accepted (`@username` disallowed);
- added explicit `Check current status` action before grant/revoke;
- added optional `Use my Telegram user id` convenience fill action;
- added clearer status snapshot details:
  - last checked at
  - updated at
  - source
  - owner note
  - granted/revoked timestamps
  - granted/revoked by Telegram user id
- added safer action confirmation prompts for grant/revoke;
- added no-op guard messages when current snapshot already matches intended action.

### 3.3 Localization parity

Updated `src/lib/i18n/localization.tsx` with RU keys for new owner helper copy and feedback:
- lookup/check flow labels
- helper/validation wording
- confirmation prompts
- snapshot field labels
- no-op guidance

## 4) Safety and stable identity handling preservation

Safety model remains unchanged:
1. Owner-only access still enforced by `SUPPORTER_BADGE_OWNER_TELEGRAM_USER_IDS`.
2. Authoritative assignment key remains numeric Telegram user id.
3. No fuzzy lookup by username/display name was introduced.
4. Lookup endpoint is read-only and does not grant/revoke by itself.
5. Supporter badge remains cosmetic recognition only, with no access gating.

## 5) What was intentionally not changed

1. No Premium/entitlement/claim/review system was restored.
2. No donor automation/provider verification was introduced.
3. No donation rails behavior change (Boosty + CloudTips remain donation-only links).
4. No supporter gratitude/convenience feature implementation was started.
5. No schema migration was added in this pass (26C schema foundation reused as-is).
6. No broad profile redesign or backend refactor beyond owner convenience scope.

## 6) Risks and follow-ups

Risk:
- Owner management still depends on correct owner-id allowlist env configuration.

Low-risk follow-up:
- Add optional owner-side "recently checked targets" in local session state only (no new persistence), if real usage shows repeated re-entry friction.

## 7) Exact recommended next step

Run focused manual verification with the checklist:
- `docs/reports/phase_26D_supporter_badge_management_manual_checklist.md`

Then, if confirmed, proceed to the next roadmap item: a small supporter gratitude/convenience feature that remains fully non-gating.

## 8) Concise manual verification notes

Manual device verification was not executed in this coding pass.

Automated validation executed:
- `npm run lint` - pass
- `npm run build` - pass
