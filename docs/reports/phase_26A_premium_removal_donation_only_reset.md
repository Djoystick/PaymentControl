# Phase 26A - Premium Removal + Donation-Only Reset

- Date: 2026-04-03
- Status: implemented (major domain removal), manual verification completed by user
- Priority truth: latest explicit user instruction (Premium removed, app unrestricted, donation-only)

## 1) Scope completed

This pass removed Premium as an active runtime/system/database concept.

Implemented:
- removed Premium runtime UI, claim workflow UI, owner/admin premium UI, gift premium UI
- removed Premium business layer and API route group
- removed Premium domain DB structures with a destructive cleanup migration
- reset Profile support area to compact donation-only links (Boosty + CloudTips)
- reset config/env surface away from Premium keys
- published new post-removal anchor/report package and version-history entry

## 2) Files removed

Runtime/API/domain removals:
- `src/components/app/premium-admin-console.tsx`
- `src/lib/admin/access.ts`
- `src/lib/premium/admin-service.ts`
- `src/lib/premium/gift-campaign-repository.ts`
- `src/lib/premium/purchase-claim-repository.ts`
- `src/lib/premium/purchase-intent-repository.ts`
- `src/lib/premium/purchase-semantics.ts`
- `src/lib/premium/repository.ts`
- `src/lib/premium/service.ts`
- `src/app/api/premium/admin/route.ts`
- `src/app/api/premium/entitlement/route.ts`
- `src/app/api/premium/gift-campaigns/claim/route.ts`
- `src/app/api/premium/purchase-claims/route.ts`
- `src/app/api/premium/purchase-claims/mine/route.ts`
- `src/app/api/premium/purchase-intents/route.ts`
- `src/app/api/premium/purchase-intents/mine/route.ts`
- `src/app/api/premium/purchase-intents/[intentId]/status/route.ts`

## 3) Files changed

Core runtime/config cleanup:
- `src/components/app/app-icon.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/hooks/use-current-app-context.ts`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- `src/lib/config/client-env.ts`
- `src/lib/config/server-env.ts`
- `src/lib/i18n/localization.tsx`
- `.env.example`

## 4) Files created

Database + docs:
- `supabase/migrations/20260403120000_phase26a_premium_removal_donation_only_reset.sql`
- `docs/reports/phase_26A_premium_domain_inventory_before_removal.md`
- `docs/reports/phase_26A_premium_removal_donation_only_reset.md`
- `docs/anchors/payment_control_master_anchor_post_premium_removal.md`

## 5) Runtime behavior after 26A

Profile support surface is now donation-only:
- calm optional section
- no premium status
- no claim path
- no owner review messaging
- no entitlement or activation wording
- only external donation rails:
  - Boosty
  - CloudTips (when configured)

Global product runtime truth after this pass:
- app remains fully unrestricted/unlimited
- donations are voluntary and do not unlock features

## 6) Database cleanup performed

New destructive migration:
- `supabase/migrations/20260403120000_phase26a_premium_removal_donation_only_reset.sql`

Objects dropped by migration:
- function `public.claim_premium_gift_campaign(text, uuid, uuid)`
- table `public.premium_purchase_intents`
- table `public.premium_purchase_claims`
- table `public.premium_gift_campaign_claims`
- table `public.premium_gift_campaigns`
- table `public.premium_entitlements`

## 7) Manual DB sync notes (required)

Before applying migration in shared/prod DB, take a one-time archive snapshot if historical audit data must be retained:

```sql
create schema if not exists backup_phase26a;
create table backup_phase26a.premium_entitlements as table public.premium_entitlements;
create table backup_phase26a.premium_gift_campaigns as table public.premium_gift_campaigns;
create table backup_phase26a.premium_gift_campaign_claims as table public.premium_gift_campaign_claims;
create table backup_phase26a.premium_purchase_claims as table public.premium_purchase_claims;
create table backup_phase26a.premium_purchase_intents as table public.premium_purchase_intents;
```

Then apply migration through normal Supabase migration flow.

Post-apply verification SQL:

```sql
select to_regclass('public.premium_entitlements') as premium_entitlements,
       to_regclass('public.premium_gift_campaigns') as premium_gift_campaigns,
       to_regclass('public.premium_gift_campaign_claims') as premium_gift_campaign_claims,
       to_regclass('public.premium_purchase_claims') as premium_purchase_claims,
       to_regclass('public.premium_purchase_intents') as premium_purchase_intents;
```

Expected: all values are `null`.

## 8) Validation

Executed:
- `npm run lint`
- `npm run build`

Result:
- `npm run lint` passed
- `npm run build` passed

## 9) What was intentionally not changed

- reminders/history/family/core operational flows
- workspace/invite foundations
- payment/reminder business logic

## 10) Remaining manual/device debt

- DB migration must be applied in target environment(s) and verified with SQL checks above.
- If historical Premium data retention is required by operations, archive snapshot must be executed before migration in each environment.
