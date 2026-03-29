# Phase 22C - Owner Claim Review Queue

## Objective of the Pass
Implement an owner-only operational review queue for premium purchase claims created in Phase 22A, so owner/admin can perform manual reconciliation by listing claims, reviewing proof fields, and approving/rejecting claims with entitlement linkage.

This pass is intentionally narrow and does not implement final user-facing Buy Premium/Support UX.

## Source-of-Truth Used
- `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Confirmed state from prompt:
  - Phase 19B, 19C, 20B, 20C, 20D, 20E, 20G, 20H manual verified
  - Phase 21A.1 manual verified
  - Phase 13B formal closure completed
  - true first-run onboarding verification completed
  - Phase 22A manual verified
- Mandatory monetization model:
  - Boosty-first
  - manual-claim-first
  - automation-later
  - Telegram numeric user ID is the primary identity anchor
  - free-core boundaries remain intact

## Files Inspected
- `src/components/app/premium-admin-console.tsx`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- `src/app/api/premium/admin/route.ts`
- `src/lib/premium/admin-service.ts`
- `src/lib/premium/purchase-claim-repository.ts`
- `src/lib/premium/service.ts`
- `src/lib/premium/repository.ts`
- `src/lib/i18n/localization.tsx`
- `supabase/migrations/20260329100000_phase22a_premium_purchase_claim_foundation.sql`

## Files Changed
- `src/lib/auth/types.ts`
- `src/lib/auth/client.ts`
- `src/lib/premium/admin-service.ts`
- `src/app/api/premium/admin/route.ts`
- `src/components/app/premium-admin-console.tsx`
- `src/lib/i18n/localization.tsx`
- `docs/reports/phase_22C_owner_claim_review_queue.md` (new)
- `docs/reports/internal_version_history.md`

## Queue / Review Functionality Added
### 1) Owner queue list
Added new owner-admin action and UI queue:
- API action: `list_purchase_claims` via `POST /api/premium/admin`
- UI surface: `Premium purchase claim review queue` inside existing owner-only `PremiumAdminConsole`

Queue shows compact operational fields:
- claim short reference (`id` prefix) and full claim id in details
- `telegram_user_id`
- `claim_status`
- `expected_tier`
- `claim_rail`
- `submitted_at`
- proof reference summary
- entitlement linkage presence (`entitlement_id` yes/no)

### 2) Review details (compact expansion)
Each queue item is expandable and includes:
- external payer handle
- payment proof reference
- payment proof text
- claim note
- admin note
- submitted/review timestamps
- reviewed-by admin telegram id

### 3) Approve/reject owner actions
Added new owner-admin review action:
- API action: `review_purchase_claim` via `POST /api/premium/admin`
- decision values: `approve` or `reject`
- optional admin note per claim

Review restrictions:
- only `submitted` and `pending_review` claims are reviewable
- already reviewed claims are shown as non-reviewable in UI

## How Approve / Reject Works
## Approve flow
When owner approves a claim:
1. Claim is validated as reviewable (`submitted`/`pending_review`).
2. Entitlement outcome is resolved using existing premium foundation:
   - source: `boosty`
   - scope: profile-level entitlement
   - duration inferred from `expected_tier` (practical mapping):
     - yearly/annual -> 365 days
     - quarterly -> 90 days
     - weekly -> 7 days
     - default -> 30 days
3. If active boosty entitlement exists for profile, it is extended (or reused if no expiry).
4. Otherwise a new boosty entitlement is created.
5. Claim row is updated:
   - `claim_status = approved`
   - `entitlement_id` linked
   - `reviewed_at`
   - `reviewed_by_admin_telegram_user_id`
   - `admin_note` (optional)
   - metadata review trail

## Reject flow
When owner rejects a claim:
1. Claim is validated as reviewable (`submitted`/`pending_review`).
2. Claim row is updated:
   - `claim_status = rejected`
   - `reviewed_at`
   - `reviewed_by_admin_telegram_user_id`
   - `admin_note` (optional)
   - `entitlement_id = null`
   - metadata review trail
3. Free-core behavior remains unchanged (no paywall changes).

## Entitlement Linkage Behavior
- Approved claim links to `premium_entitlements.id` via `premium_purchase_claims.entitlement_id`.
- Linkage is persisted in claim metadata and row-level fields.
- Existing gift campaign and manual admin grant paths are untouched.
- Primary identity remains `telegram_user_id`; external payer fields remain supporting proof only.

## Owner-Only Visibility / Security Preservation
- Queue and review controls are only in existing owner-only `PremiumAdminConsole`.
- Server route still enforces owner gate via admin allowlist check before non-session actions.
- Normal users do not receive queue controls.

## Schema / Migration Changes
- No schema or migration changes were introduced in Phase 22C.
- Phase 22A claim schema was reused as-is.

## What Was Intentionally NOT Changed
- No final Buy Premium UI.
- No final Support the project UI.
- No final end-user claim form UX.
- No premium/free boundary redesign.
- No admin permission/security model rewrite.
- No Boosty webhook/API automation assumptions.
- No gift campaign redesign.
- No broad profile/navigation redesign.
- Temporary 22A.1 verification helper was kept (no conflict with this phase).

## Validation Executed
- `npm run lint` - passed
- `npm run build` - passed

## Manual Test Checklist (Required)
### A) Review queue visibility
1. Login as owner account (allowlisted admin).
2. Open `Profile` -> `Owner premium admin`.
3. Verify section `Premium purchase claim review queue` is visible.
4. Login as non-owner and verify queue section is not visible.

### B) Approve flow
1. Create a test claim (e.g., via existing temporary 22A.1 trigger or claim creation path).
2. Refresh claim queue in owner console.
3. Open claim details and click `Approve claim` (optional note).
4. Verify claim switches to `approved`.
5. Verify `reviewed_at` and `reviewed_by_admin_telegram_user_id` are populated.
6. Verify `entitlement_id` is linked.

### C) Reject flow
1. Create/select another `submitted` claim.
2. Open claim details and click `Reject claim` (optional note).
3. Verify claim switches to `rejected`.
4. Verify review metadata is stored.
5. Verify no entitlement linkage is created for that rejected claim.

### D) Entitlement linkage verification (SQL)
```sql
select
  c.id as claim_id,
  c.claim_status,
  c.telegram_user_id,
  c.expected_tier,
  c.entitlement_id,
  c.reviewed_at,
  c.reviewed_by_admin_telegram_user_id,
  e.id as entitlement_id_check,
  e.entitlement_source,
  e.scope,
  e.status,
  e.starts_at,
  e.ends_at
from public.premium_purchase_claims c
left join public.premium_entitlements e on e.id = c.entitlement_id
order by c.created_at desc
limit 30;
```

Expected:
- approved claim has non-null `entitlement_id` and linked entitlement row
- rejected claim has null `entitlement_id`
- approved entitlement source is `boosty`

### E) Owner-only gating
1. As non-owner, call normal app flow and verify owner admin queue/review controls are unavailable.
2. Ensure no regressions in core free utility (Mark paid/Undo paid, reminders, workspace flows).

## Risks / Follow-up Notes
1. `expected_tier` duration mapping is intentionally practical MVP logic; future monetization phase can replace with explicit tier catalog config.
2. Queue is intentionally compact and operational, not analytics-heavy.
3. Temporary 22A.1 trigger remains for controlled verification until replaced by final user-facing claim entry flow.

## Ready for Next Phase?
Yes.

Project is ready for the next monetization-facing phase (22B/22D naming depending roadmap branch) because owner reconciliation loop now exists end-to-end:
- claim created (22A)
- claim review queue + approve/reject (22C)
- entitlement linkage on approval (22C)

## Encoding safety check
- Touched RU-visible file: `src/lib/i18n/localization.tsx`.
- Added Russian strings were verified as readable UTF-8.
- New report/history markdown saved in UTF-8 readable form.
- No mojibake detected in touched RU-visible content.

## Pre-report self-check against prompt/scope
1. Implemented owner-only claim queue inside existing admin surface - PASS.
2. Added compact proof inspection details - PASS.
3. Added approve/reject with optional admin note - PASS.
4. Approval links claim to entitlement outcome and stores review metadata - PASS.
5. Owner-only visibility preserved on both UI and server route - PASS.
6. Free-core philosophy and existing verified flows unchanged - PASS.
7. No migration/schema changes introduced - PASS.
8. Validation executed and passed - PASS.
9. No out-of-scope Buy Premium / Support storefront UI added - PASS.
