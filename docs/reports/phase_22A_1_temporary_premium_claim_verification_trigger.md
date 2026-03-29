# Phase 22A.1 - Temporary Premium Claim Verification Trigger

## Objective of the Pass
Implement the smallest safe temporary verification trigger that can create a real `premium_purchase_claims` row through the actual runtime path (client -> API -> repository), without exposing a permanent user-facing monetization control.

## Source-of-Truth Used
- `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Current confirmed state from prompt:
  - Phase 19B, 19C, 20B, 20C, 20D, 20E, 20G, 20H manual verified
  - Phase 21A.1 manual verified
  - Phase 13B formal closure completed
  - true first-run onboarding verification completed
  - Phase 22A implemented with migration applied and table present
- Mandatory monetization model:
  - Boosty-first
  - manual-claim-first
  - automation-later
  - Telegram numeric user ID remains the primary identity anchor

## Files Inspected
- `src/components/app/premium-admin-console.tsx`
- `src/lib/auth/client.ts`
- `src/app/api/premium/purchase-claims/route.ts`
- `src/lib/auth/types.ts`
- `src/lib/i18n/localization.tsx`
- `docs/reports/internal_version_history.md`
- `docs/reports/phase_22A_premium_purchase_claim_foundation.md`

## Files Changed
- `src/components/app/premium-admin-console.tsx`
- `src/lib/i18n/localization.tsx`
- `docs/reports/phase_22A_1_temporary_premium_claim_verification_trigger.md` (new)
- `docs/reports/internal_version_history.md`

## Where the Temporary Verification Helper Was Placed
Placement:
- Owner-only premium admin console section inside Profile:
  - `src/components/app/premium-admin-console.tsx`
  - block title: `Temporary purchase claim verification (22A.1)`

Why this placement is safe and temporary:
- The whole console is already owner-gated (`readPremiumAdminSession`, `isAdmin` guard).
- It is inside an existing secondary/internal area, not a main user CTA.
- It avoids polluting normal user UX with premature premium purchase surfaces.
- It is isolated and easy to remove in later monetization UI phases.

## What Was Implemented
Added a single owner-only trigger button:
- `Create test purchase claim`

On click, it calls the real client helper:
- `createPremiumPurchaseClaim(...)` from `src/lib/auth/client.ts`

That helper calls the real API route:
- `POST /api/premium/purchase-claims`

The API route uses verified app context:
- `readCurrentAppContext(initData)`
- `telegram_user_id` comes from `contextResult.profile.telegramUserId` server-side
- no manual Telegram ID entry is used or allowed in this helper

## Exact Test Payload Values Used by the Helper
- `claimRail`: `boosty_premium`
- `expectedTier`: `premium_monthly`
- `externalPayerHandle`: `test_boosty_user`
- `paymentProofReference`: `BOOSTY-QA-001`
- `paymentProofText`: `manual test payment proof`
- `claimNote`: `phase 22A manual verification`

## Runtime Identity Path (Why Telegram ID Is Correct)
1. UI trigger sends only `initData` + fixed QA fields via `createPremiumPurchaseClaim(...)`.
2. API route validates request and reads current verified app context from Telegram init data.
3. Server sets `telegram_user_id` from verified context profile, not from client-entered text.
4. Repository persists claim row with that server-derived identity.

This matches the agreed rule: numeric Telegram user ID is the primary identity key.

## Exact Manual Steps to Trigger and Verify
1. Open app in Telegram as an owner account allowed for premium admin.
2. Go to `Profile`.
3. Open `Owner premium admin`.
4. In section `Temporary purchase claim verification (22A.1)`, tap `Create test purchase claim`.
5. Confirm success feedback appears and `Created claim result` block is rendered.
6. Open Supabase SQL editor and run the query below.
7. Confirm a new row exists with expected rail/tier/status/proof fields and correct `telegram_user_id` from current account context.

## Exact SQL Query to Verify Created Row
```sql
select
  id,
  telegram_user_id,
  claim_rail,
  expected_tier,
  claim_status,
  external_payer_handle,
  payment_proof_reference,
  payment_proof_text,
  claim_note,
  submitted_at,
  created_at
from public.premium_purchase_claims
where payment_proof_reference = 'BOOSTY-QA-001'
  and claim_note = 'phase 22A manual verification'
order by created_at desc
limit 20;
```

Expected values for the new row:
- `claim_rail = boosty_premium`
- `expected_tier = premium_monthly`
- `claim_status = submitted`
- `external_payer_handle = test_boosty_user`
- `payment_proof_reference = BOOSTY-QA-001`
- `payment_proof_text = manual test payment proof`

## What Was Intentionally NOT Changed
- No final Buy Premium UI.
- No final Support the project UI.
- No final user claim form UX.
- No owner claim review queue UI (Phase 22B/22C scope).
- No claim schema changes.
- No premium/free boundary changes.
- No admin permission/security model changes.
- No recurring/payment/business logic changes.

## Validation Executed
- `npm run lint`
- `npm run build`

## Risks / Follow-up Notes
1. This helper is intentionally temporary and owner-only. It should be removed or replaced when final claim-entry + review surfaces are introduced.
2. Repeated clicks create additional real test claims by design; QA should use the query timestamp ordering when validating.
3. This pass confirms runtime create-path readiness, not review/approval lifecycle UI.

## Is 22A Ready for Final Manual Verification Closure?
Yes.

After this pass, the project has an in-app runtime trigger (owner-only, temporary) that creates a real claim row through production path semantics, enabling final manual closure verification for Phase 22A.

## Encoding Safety Check
- Touched RU-visible localization file: `src/lib/i18n/localization.tsx`.
- Verified newly added Russian strings are readable UTF-8 and not mojibake.
- New report/history markdown content saved as UTF-8-readable text.

## Pre-report self-check against prompt/scope
1. Added a minimal temporary verification trigger only - PASS.
2. Trigger uses actual runtime claim path (client helper -> API route -> repository) - PASS.
3. No manual Telegram ID input required; server derives identity from verified app context - PASS.
4. Trigger placed in secondary owner-only area; not exposed as normal production CTA - PASS.
5. No schema or backend semantics rewrite - PASS.
6. No final monetization/storefront UI introduced - PASS.
7. Exact manual steps + exact SQL verification query included - PASS.
8. Validation run documented - PASS.
