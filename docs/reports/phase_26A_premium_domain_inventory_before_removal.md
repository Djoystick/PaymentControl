# Phase 26A - Premium Domain Inventory Before Removal

- Date: 2026-04-03
- Status: inventory captured before destructive removal
- Main source of truth at inventory time: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Latest explicit instruction applied in this pass: Premium must be removed completely and product reset to donation-only

## 1) Inspected surfaces (pre-removal)

Required inspection completed:
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/premium-admin-console.tsx`
- `src/lib/premium/*`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- `src/lib/config/client-env.ts`
- `src/lib/config/server-env.ts`
- `src/lib/i18n/localization.tsx`
- `src/app/api/premium/*`
- `supabase/migrations/*` related to premium/claim/entitlement domain
- anchors/reports listed in Phase 26A instruction

## 2) Runtime UI inventory (pre-removal)

User-facing runtime:
- Profile had a combined `Support and Premium` surface with:
  - Premium status card
  - support reference intent creation
  - claim submission form
  - claim lifecycle/status tracking
  - post-support continuity handling
  - gift premium claim verification block
- File: `src/components/app/profile-scenarios-placeholder.tsx`

Owner/admin runtime:
- Owner premium admin console with:
  - target resolve
  - manual premium grant/revoke
  - campaign management
  - support claim queue review
- File: `src/components/app/premium-admin-console.tsx`

## 3) API inventory (pre-removal)

Removed API route group:
- `src/app/api/premium/admin/route.ts`
- `src/app/api/premium/entitlement/route.ts`
- `src/app/api/premium/gift-campaigns/claim/route.ts`
- `src/app/api/premium/purchase-claims/route.ts`
- `src/app/api/premium/purchase-claims/mine/route.ts`
- `src/app/api/premium/purchase-intents/route.ts`
- `src/app/api/premium/purchase-intents/mine/route.ts`
- `src/app/api/premium/purchase-intents/[intentId]/status/route.ts`

## 4) Service/repository/helper inventory (pre-removal)

Removed premium service layer:
- `src/lib/premium/admin-service.ts`
- `src/lib/premium/gift-campaign-repository.ts`
- `src/lib/premium/purchase-claim-repository.ts`
- `src/lib/premium/purchase-intent-repository.ts`
- `src/lib/premium/purchase-semantics.ts`
- `src/lib/premium/repository.ts`
- `src/lib/premium/service.ts`

Removed owner-admin access helper tied to premium admin:
- `src/lib/admin/access.ts`

## 5) Type/interface and client contract inventory (pre-removal)

`src/lib/auth/types.ts` previously contained:
- premium entitlement payload/state types
- premium purchase intent/claim payloads
- support claim/reference aliases over premium purchase structures
- premium admin response/action types
- gift premium claim types

`src/lib/auth/client.ts` previously contained:
- premium entitlement read
- gift claim call
- premium purchase/support claim and intent APIs
- premium admin APIs

## 6) Env/config inventory (pre-removal)

Client env keys and config models:
- `NEXT_PUBLIC_PREMIUM_ONE_TIME_BUY_URL`
- `NEXT_PUBLIC_PREMIUM_BUY_URL`
- support rails configured with claim/continuity semantics in `client-env.ts`

Server env keys:
- `PREMIUM_ADMIN_TELEGRAM_USER_IDS`

## 7) Localization/copy inventory (pre-removal)

`src/lib/i18n/localization.tsx` included extensive premium/claim/admin copy keys for:
- Premium status
- claim lifecycle
- owner premium admin queue/actions
- gift premium campaign/claim flows

## 8) Database inventory (pre-removal)

Premium-domain DB objects identified from migrations:
- table `public.premium_entitlements`
- table `public.premium_gift_campaigns`
- table `public.premium_gift_campaign_claims`
- table `public.premium_purchase_claims`
- table `public.premium_purchase_intents`
- function `public.claim_premium_gift_campaign(text, uuid, uuid)`

Related migration files:
- `supabase/migrations/20260327110000_phase13a_premium_entitlements_foundation.sql`
- `supabase/migrations/20260327120000_phase13b_gift_premium_campaign_foundation.sql`
- `supabase/migrations/20260329100000_phase22a_premium_purchase_claim_foundation.sql`
- `supabase/migrations/20260329130000_phase22e_purchase_intent_correlation.sql`
- `supabase/migrations/20260329170000_phase23b_one_time_semantic_adaptation.sql`

Primary column/constraint groups captured before removal:
- `premium_entitlements`:
  - ownership columns: `profile_id`, `workspace_id`, `scope`
  - status/source columns: `status`, `entitlement_source`, `starts_at`, `ends_at`
  - constraints: scope owner check, source check, status check, time check
- `premium_gift_campaigns`:
  - campaign identity/timing/quota columns: `campaign_code`, `campaign_status`, `total_quota`, `premium_duration_days`, `starts_at`, `ends_at`
  - constraints: status, quota, duration, time-window checks
- `premium_gift_campaign_claims`:
  - linkage columns: `campaign_id`, `profile_id`, `workspace_id`, `entitlement_id`
  - result columns: `claim_status`, `failure_reason`
  - constraints/indexes: granted uniqueness per campaign/profile, status checks
- `premium_purchase_claims`:
  - proof/claim columns: `claim_rail`, `expected_tier`, `external_payer_handle`, `payment_proof_reference`, `payment_proof_text`, `claim_status`, `claim_note`, `admin_note`
  - linkage columns: `entitlement_id`, `purchase_intent_id`, `purchase_correlation_code`
  - review columns: `reviewed_at`, `reviewed_by_admin_telegram_user_id`
  - constraints: rail/status/tier/length checks and review metadata consistency checks
- `premium_purchase_intents`:
  - continuity columns: `intent_status`, `opened_external_at`, `returned_at`, `claimed_at`, `consumed_at`, `expires_at`
  - linkage columns: `claim_id`, `correlation_code`, `intent_rail`, `expected_tier`
  - constraints: rail/status/tier/correlation format checks, claim linkage check

## 9) Docs inventory (pre-removal active truth conflict)

Before this pass, active anchor/report line still encoded Premium as active product truth:
- `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- `docs/reports/phase_24A_soft_premium_multi_rail_foundation.md`
- `docs/reports/phase_24C_support_claim_operational_clarity.md`
- `docs/reports/phase_25B_support_stack_consolidation_pack.md`
- `docs/reports/phase_25F_support_flow_simplification_implementation_wave.md`
- `docs/reports/phase_25H_cloudtips_owner_assisted_triage_pack.md`
- `docs/reports/phase_25I_cloudtips_provider_trust_boundary_audit.md`
- `docs/reports/phase_25J_cloudtips_integration_prerequisites_pack.md`

This inventory was used as the explicit removal baseline for Phase 26A.
