# Phase 22E - Purchase Correlation Code + Semi-Automatic Claim Activation

## Objective of the Pass
Implement a practical semi-automatic correlation layer between Buy Premium (external Boosty rail), in-app claim submission, and owner review queue, without introducing fake payment automation and without changing free-core behavior.

## Source-of-Truth Used
- `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Confirmed project state from prompt:
  - Phase 19B, 19C, 20B, 20C, 20D, 20E, 20G, 20H manual verified
  - Phase 21A.1 manual verified
  - Phase 13B formal closure completed
  - true first-run onboarding verification completed
  - Phase 22A, 22C, 22D manual verified
- Mandatory monetization model:
  - Boosty-first
  - manual-claim-first
  - automation-later
  - Telegram numeric user ID as primary identity anchor
  - purchase code is correlation token only (not self-activation)
- Current external rails preserved:
  - Buy Premium: `https://boosty.to/tvoy_kosmonavt/purchase/3867384?ssource=DIRECT&share=subscription_link`
  - Support: `https://boosty.to/tvoy_kosmonavt/posts/cf4114af-41b0-4a6e-b944-be6ded323c21`

## Files Inspected
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/premium-admin-console.tsx`
- `src/lib/premium/purchase-claim-repository.ts`
- `src/lib/premium/admin-service.ts`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- `src/lib/i18n/localization.tsx`
- `src/app/api/premium/purchase-claims/route.ts`
- `src/app/api/premium/purchase-claims/mine/route.ts`
- `src/app/api/premium/purchase-intents/route.ts`
- `src/app/api/premium/purchase-intents/mine/route.ts`
- `src/lib/premium/purchase-intent-repository.ts`
- `supabase/migrations/20260329130000_phase22e_purchase_intent_correlation.sql`
- `docs/reports/internal_version_history.md`

## Files Changed
- `supabase/migrations/20260329130000_phase22e_purchase_intent_correlation.sql` (new)
- `src/lib/premium/purchase-intent-repository.ts` (new)
- `src/app/api/premium/purchase-intents/route.ts` (new)
- `src/app/api/premium/purchase-intents/mine/route.ts` (new)
- `src/lib/auth/types.ts`
- `src/lib/auth/client.ts`
- `src/lib/premium/purchase-claim-repository.ts`
- `src/app/api/premium/purchase-claims/route.ts`
- `src/app/api/premium/purchase-claims/mine/route.ts`
- `src/lib/premium/admin-service.ts`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/premium-admin-console.tsx`
- `src/lib/i18n/localization.tsx`
- `docs/reports/internal_version_history.md`
- `docs/reports/phase_22E_purchase_correlation_code_semi_automatic_claim_activation.md` (new)

## Schema / Migration Changes
Yes.

Added migration:
- `supabase/migrations/20260329130000_phase22e_purchase_intent_correlation.sql`

Introduced:
1. New table `public.premium_purchase_intents` with:
- identity linkage: `profile_id`, `workspace_id`, `telegram_user_id`
- purchase context: `intent_rail`, `expected_tier`
- correlation: `correlation_code`
- lifecycle: `intent_status`
- linkage: `claim_id`
- timing metadata: `opened_external_at`, `returned_at`, `claimed_at`, `consumed_at`, `expires_at`, `created_at`, `updated_at`
- extra metadata: `metadata jsonb`

2. Constraints and indexing:
- telegram user id numeric check
- rail constraint (`boosty_premium`)
- lifecycle status constraint
- correlation format check
- unique index on `correlation_code`
- query indexes by profile/status/claim linkage

3. Claim linkage extensions:
- `premium_purchase_claims.purchase_intent_id`
- `premium_purchase_claims.purchase_correlation_code`
- related indexes

## Purchase Intent / Correlation Model Introduced
### Intent model
A dedicated intent entity now represents pre-claim external purchase attempt context.

Current lifecycle vocabulary in schema:
- `created`
- `opened_external`
- `returned`
- `claimed`
- `consumed`
- `expired`
- `cancelled`

For this phase implementation path, the primary active transitions used are:
- `created` on intent creation
- `claimed` when a claim is successfully linked

### Correlation code model
- Code format: `PC-XXXXXX` (uppercase, human-usable alphanumeric from curated alphabet).
- Example shape: `PC-7F4K2M`.
- Generated server-side in `createPremiumPurchaseIntent` with retry on unique collisions.
- Code is never treated as direct entitlement activation.

## Exact Code Format / Generation Approach
- Generator: `generateCorrelationCode()` in `src/lib/premium/purchase-intent-repository.ts`
- Prefix: `PC-`
- Suffix length: 6 characters
- Alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (avoids ambiguous characters like `I`, `O`, `0`, `1`)
- Validation regex:
  - intent repo: `^PC-[A-Z0-9]{5,12}$`
  - DB check constraint: `^PC-[A-Z0-9]{5,12}$`
- Collision handling: insert retry loop (up to 7 attempts) on unique violation.

## How Buy Premium Handoff Works Now
In Profile monetization block:
1. User taps `Prepare purchase code` (instead of immediate silent external redirect).
2. Client calls `POST /api/premium/purchase-intents`.
3. API resolves verified app context (Telegram init data) and creates intent tied to:
- current profile
- current workspace
- verified `telegram_user_id`
4. UI shows compact handoff card:
- latest correlation code
- intent status
- created timestamp
- concise reminder that code does not auto-activate Premium
5. User continues via `Continue to Boosty` CTA (existing external subscription rail).

This keeps monetization visible and practical without storefront-heavy behavior.

## How Claim Continuity Works After Return
1. Profile loads latest intents via `POST /api/premium/purchase-intents/mine`.
2. UI selects latest relevant non-closed intent and shows it in:
- purchase handoff block
- claim panel hint (`Latest purchase intent`)
3. Claim form prefill assist:
- if proof reference field is empty, it is auto-seeded with latest correlation code.
4. On claim submit:
- claim payload includes `purchaseIntentId` and `purchaseCorrelationCode` when latest intent is linkable.
5. Claim repository resolves and validates linkage server-side, then stores:
- `premium_purchase_claims.purchase_intent_id`
- `premium_purchase_claims.purchase_correlation_code`
6. Intent is updated to `claimed` and linked to `claim_id`.

Result: user submits claim with much less manual correlation friction, while owner review remains required.

## How Owner Review Sees Correlation Context
Owner queue now includes correlation context on claim rows/details:
- `Purchase code`
- `Purchase intent id`

Surfaces updated:
- queue summary line in `premium-admin-console`
- expanded claim details in `premium-admin-console`
- underlying admin payload mapping in `admin-service`

This accelerates reconciliation without redesigning the admin queue into a large dashboard.

## Exact Manual Verification Steps
### A) Create purchase intent
1. Open app as regular user (non-owner is fine).
2. Go to `Profile -> Premium and support`.
3. Click `Prepare purchase code`.
4. Verify success feedback and visible handoff block.
5. Verify code appears in `PC-XXXXXX` style and intent status is shown.

### B) Open Boosty from handoff
1. In the handoff block, click `Continue to Boosty`.
2. Verify external subscription rail opens:
`https://boosty.to/tvoy_kosmonavt/purchase/3867384?ssource=DIRECT&share=subscription_link`

### C) Return and submit correlated claim
1. Return to app Profile.
2. Open `I already paid / Claim Premium`.
3. Verify latest intent summary is visible (code + status).
4. Verify proof reference is prefilled with correlation code when empty.
5. Submit claim.
6. Verify submission success feedback.

### D) Owner sees code in queue
1. Open owner account -> premium admin queue.
2. Locate submitted claim.
3. Verify claim row/details show:
- `Purchase code`
- `Purchase intent id`

### E) Approve linked claim
1. Approve claim in owner queue.
2. Verify claim review metadata is updated as usual.
3. Verify entitlement activation path remains the existing reviewed flow (not code-only activation).

## What Was Intentionally NOT Changed
- No webhook/API validation with Boosty.
- No automatic premium activation by code alone.
- No redesign of owner queue structure beyond compact correlation context.
- No schema changes to premium entitlements model itself.
- No premium/free boundary changes.
- No Home/Reminders monetization insertion.
- No storefront-style purchase screen.
- No changes to gift campaign/manual grant semantics.

## Validation Executed
- `npm run build` - passed
- `npm run lint` - passed

## Risks / Follow-up Notes
1. Intent lifecycle currently uses `created -> claimed` in practical flow; optional explicit transitions (`opened_external`, `returned`, `consumed`) can be added later if needed without changing current semantics.
2. Correlation improves reconciliation speed but still relies on owner review quality and proof quality (by design for manual-claim-first stage).
3. Existing claims created before 22E may not have intent linkage; queue remains compatible.

## Ready for Manual Verification of Semi-Automatic Activation?
Yes.

Code-level readiness is complete for Phase 22E manual verification:
- purchase intent creation exists and is runtime-wired,
- correlation code is generated and shown,
- claim continuity is linked,
- owner queue receives correlation context,
- entitlement remains owner-reviewed (no false automation).

## Encoding safety check
- Touched localization file (`src/lib/i18n/localization.tsx`) re-checked for readable UTF-8 Russian strings.
- New markdown files were written in UTF-8 and checked for readable content.
- No intentional non-UTF encodings introduced.

## Pre-report self-check against prompt/scope
1. Purchase intent model added and linked to Telegram numeric user id - PASS.
2. Short correlation code generated server-side and shown in Profile handoff - PASS.
3. Buy Premium now has compact intermediate step before external Boosty open - PASS.
4. Claim continuity after return (prefill/linkage) implemented - PASS.
5. Owner queue shows correlation context - PASS.
6. Code alone does not auto-activate premium - PASS.
7. Free-core and existing verified flows preserved - PASS.
8. Schema/migration changes documented clearly - PASS.
9. Validation run recorded (`npm run build`, `npm run lint`) - PASS.
10. Exact manual verification steps for 22E included - PASS.
