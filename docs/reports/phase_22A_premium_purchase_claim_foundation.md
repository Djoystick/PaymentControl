# Phase 22A - Premium Purchase Claim Foundation

## Objective of the Pass
Implement the minimum backend/state/data foundation for manual premium purchase claims in the agreed model:
- Boosty-first
- manual-claim-first
- automation-later

This phase builds claim persistence and creation path only. It does not implement final purchase/support UI or owner review queue UI.

## Source-of-Truth Used
- `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Confirmed state from prompt:
  - Phase 19B manual verified
  - Phase 19C manual verified
  - Phase 20B manual verified
  - Phase 20C manual verified
  - Phase 20D manual verified
  - Phase 20E manual verified
  - Phase 20G manual verified
  - Phase 20H manual verified
  - Phase 21A.1 manual verified
  - Phase 13B formal closure completed
  - true first-run onboarding verification completed
- Mandatory monetization model from prompt:
  - Premium != core utility paywall
  - Buy Premium and Support are separate rails
  - Telegram numeric user ID is primary identity anchor
  - external payment identity is supporting proof

## Files Inspected
- `src/lib/auth/types.ts`
- `src/lib/auth/client.ts`
- `src/lib/premium/repository.ts`
- `src/lib/premium/service.ts`
- `src/lib/premium/admin-service.ts`
- `src/lib/premium/gift-campaign-repository.ts`
- `src/app/api/premium/entitlement/route.ts`
- `src/app/api/premium/admin/route.ts`
- `src/app/api/premium/gift-campaigns/claim/route.ts`
- `src/lib/app-context/service.ts`
- `supabase/migrations/20260327110000_phase13a_premium_entitlements_foundation.sql`
- `supabase/migrations/20260327120000_phase13b_gift_premium_campaign_foundation.sql`
- `README.md`

## Files Changed
- `supabase/migrations/20260329100000_phase22a_premium_purchase_claim_foundation.sql`
- `src/lib/auth/types.ts`
- `src/lib/premium/purchase-claim-repository.ts`
- `src/app/api/premium/purchase-claims/route.ts`
- `src/lib/auth/client.ts`
- `README.md`
- `docs/reports/phase_22A_premium_purchase_claim_foundation.md`
- `docs/reports/internal_version_history.md`

## What Claim Foundation Was Added
Added a new claim entity foundation (`premium_purchase_claims`) plus a real create path:

1. New database model
- New table: `public.premium_purchase_claims`.
- Purpose: store manual premium purchase claims for owner reconciliation.
- Core fields include:
  - internal `id`
  - `profile_id`
  - optional `workspace_id`
  - primary app identity anchor `telegram_user_id`
  - `claim_rail` (current MVP rail: `boosty_premium`)
  - `expected_tier`
  - optional supporting proof fields:
    - `external_payer_handle`
    - `payment_proof_reference`
    - `payment_proof_text`
    - `claim_note`
  - owner-side fields:
    - `admin_note`
    - `reviewed_at`
    - `reviewed_by_admin_telegram_user_id`
  - optional `entitlement_id` linkage
  - timestamps and metadata.

2. New status model for claim lifecycle
- Implemented status set:
  - `draft`
  - `submitted`
  - `pending_review`
  - `approved`
  - `rejected`
  - `expired`
  - `cancelled`

3. New claim creation backend path
- New API route:
  - `POST /api/premium/purchase-claims`
- Server-only persistence layer:
  - `src/lib/premium/purchase-claim-repository.ts`
- Current create behavior:
  - reads verified user identity from `readCurrentAppContext(initData)`
  - uses `profile.telegramUserId` as primary identity anchor
  - persists claim in `submitted` status
  - stores optional supporting proof fields safely
  - returns created claim payload.

4. Client contract and helper
- Added new types in `src/lib/auth/types.ts`:
  - rail/status/payload/create response/error types for purchase claims.
- Added client helper:
  - `createPremiumPurchaseClaim(...)` in `src/lib/auth/client.ts`.

## Exact Claim Status Model
- `draft`
- `submitted`
- `pending_review`
- `approved`
- `rejected`
- `expired`
- `cancelled`

The create path in this phase writes `submitted` as the initial operational status.

## Compatibility Preservation
Compatibility with existing foundations was intentionally preserved:

1. Premium entitlement compatibility
- `premium_purchase_claims.entitlement_id` references `premium_entitlements`.
- No rewrite of entitlement read/grant/revoke logic.

2. Gift campaign compatibility
- No changes to gift campaign tables, claim RPC, or gift claim API route.
- No coupling between purchase-claim creation and gift campaign logic.

3. Manual grant/admin compatibility
- No changes to owner-only admin gate/permissions.
- No changes to manual grant/revoke flow in `premium/admin`.
- New foundation is additive and ready for later owner claim review queue phase.

4. Free-core philosophy protection
- No pay-lock added.
- No premium boundary policy changes.
- Core product flows remain untouched.

## Schema/Migration Changes Introduced
Yes. One new migration added:
- `supabase/migrations/20260329100000_phase22a_premium_purchase_claim_foundation.sql`

Also synced in README migration order and endpoint list.

## What Was Intentionally NOT Changed
- No final Buy Premium UI.
- No final Support Project UI.
- No final claim-entry UX redesign.
- No owner review queue UI.
- No webhook/API-first Boosty automation.
- No changes to premium/free boundaries.
- No changes to admin permissions/security model.
- No recurring/reminder/core payment logic changes.

## Validation Executed
- `npm run lint` - passed
- `npm run build` - passed

## Risks / Follow-up Notes
1. This phase intentionally provides claim creation only. Owner review workflow remains for next phase.
2. `claim_rail` is intentionally narrow (`boosty_premium`) for MVP discipline; rail expansion should be explicit in later migrations.
3. No automation assumptions were introduced. External payment confirmation remains manual reconciliation.
4. No UI entry points are exposed yet; next phase should add owner review queue before broad user-facing claim UX.

## Ready for Next Phase (Owner Claim Review Queue)?
Yes.

The project now has:
- a real claim record model,
- deterministic claim creation persistence,
- clear lifecycle statuses,
- entitlement linkage path,
- preserved compatibility with gift/manual/premium foundations.

This is sufficient to start the next controlled phase for owner claim review queue implementation.

## Encoding Safety Check
- No existing RU-visible localization dictionary entries were modified in this pass.
- New/updated files were saved with UTF-8 encoding.
- No mojibake was introduced in touched code/report files.

## Pre-Report Self-Check Against Prompt/Scope
1. Implemented a real purchase-claim model and persistence path - PASS.
2. Preserved Telegram numeric user ID as primary identity anchor - PASS.
3. Added clear lifecycle status model - PASS.
4. Preserved compatibility with premium entitlement + gift + manual grant flows - PASS.
5. Did not add final monetization storefront UI or review queue UI - PASS.
6. Did not change free-core boundaries or verified core product flows - PASS.
7. Added schema migration and documented it clearly - PASS.
8. Validation commands executed and passed - PASS.
