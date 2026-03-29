# Phase 22B - Profile Premium/Support Entry Separation

## Objective of the Pass
Implement the first proper user-facing monetization surface in Profile with clear separation of three rails:
1. Buy Premium
2. Support the project
3. I already paid / Claim Premium

The pass keeps the UI calm/app-like, preserves free-core behavior, and reuses existing Phase 22A claim foundation + Phase 22C owner review queue compatibility.

## Source-of-Truth Used
- `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Confirmed state from prompt:
  - Phases 19B, 19C, 20B, 20C, 20D, 20E, 20G, 20H manual verified
  - Phase 21A.1 manual verified
  - Phase 13B formal closure completed
  - true first-run onboarding verification completed
  - Phase 22A manual verified
  - Phase 22C manual verified
- Mandatory monetization model:
  - Boosty-first
  - manual-claim-first
  - automation-later
  - Telegram numeric user ID remains primary identity key
  - support/donation is separate from automatic premium entitlement

## Files Inspected
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/premium-admin-console.tsx`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- `src/lib/config/client-env.ts`
- `src/lib/i18n/localization.tsx`
- `src/app/api/premium/purchase-claims/route.ts`
- `src/app/api/premium/admin/route.ts`

## Files Changed
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- `src/lib/config/client-env.ts`
- `src/lib/i18n/localization.tsx`
- `src/app/api/premium/purchase-claims/mine/route.ts` (new)
- `docs/reports/internal_version_history.md`
- `docs/reports/phase_22B_profile_premium_support_entry_separation.md` (new)

## What Was Implemented

### 1) Clear rail separation in Profile
Added/structured a dedicated `Premium and support` block with explicit separation of meaning and CTA:
- **Buy Premium**: paid expansion rail (Boosty-first), emphasized as primary monetization CTA.
- **Support the project**: voluntary support rail, explicitly stated as non-automatic entitlement.
- **I already paid / Claim Premium**: returning-user operational claim lane.

This removes ambiguity between purchase/support/claim semantics while keeping compact Profile composition.

### 2) Premium status presentation
In Profile monetization block:
- existing premium state is shown clearly:
  - free active
  - premium active
  - source/scope/expiry when premium is active
- claim-derived state is shown for non-premium users when available:
  - submitted / pending review / approved / rejected / expired / cancelled / draft

State treatment remains calm and system-aligned (no aggressive storefront behavior).

### 3) User claim entry surfaced in Profile
Added compact user-facing claim entry section:
- external payer handle (optional)
- proof reference (optional)
- proof text (optional)
- claim note (optional)
- submit action for premium claim
- refresh claim status action
- latest claim status + submitted timestamp

The path uses existing runtime claim creation semantics from 22A; no schema/semantic rewrite introduced.

### 4) Claim status read path for current user
Added a narrow API/runtime read path used by Profile:
- `POST /api/premium/purchase-claims/mine`
- identity resolved through existing app context verification path
- query constrained by `profile_id` + `telegram_user_id`
- returns recent claims for status presentation and refresh

Added corresponding client/types support:
- `readMyPremiumPurchaseClaims(...)`
- `PremiumPurchaseClaimReadMine*` response types

### 5) Visual emphasis without storefront aggression
Applied emphasis policy from prompt:
- Buy Premium CTA is stronger than ordinary secondary controls.
- Support CTA remains clearly visible but visually secondary to Buy Premium.
- Claim rail is operational and compact (details surface), not ad-like.

No intrusive monetization moved to Home/Reminders.

### 6) Environment-configurable external URLs
Added client env entries for safe external rails:
- `NEXT_PUBLIC_PREMIUM_BUY_URL` (fallback `https://boosty.to`)
- `NEXT_PUBLIC_SUPPORT_PROJECT_URL` (fallback `https://boosty.to`)

This keeps URL wiring practical for later phases without hard-coupling final storefront UX.

## How Buy Premium / Support / Claim Premium Were Separated
- Wording: explicit distinction text at block top.
- Grouping: two side-by-side cards for Buy/Support plus separate claim detail lane.
- CTA hierarchy:
  - Buy -> stronger (primary style)
  - Support -> clear but quieter
  - Claim -> operational form actions
- Semantics:
  - Support explicitly does not auto-grant premium
  - Claim explicitly positioned for already-paid users

## How Premium Status Is Presented
- Profile shows `Premium status` with loading/unavailable handling.
- If premium active: displays active state + scope/source/valid-until context.
- If free: displays free state and free-core reassurance.
- If claim exists and user not premium: claim lifecycle state pill shown.

## Schema / Migrations
- No schema changes.
- No new migration created in this phase.

## What Was Intentionally NOT Changed
- No final Buy Premium storefront flow.
- No final Support surface expansion beyond Profile entry rail.
- No owner review queue redesign (22C logic preserved).
- No claim schema or status semantic changes from 22A/22C.
- No premium/free boundary changes.
- No owner admin security model changes.
- No Boosty API/webhook automation assumptions.
- No Home/Reminders monetization insertion.

## Validation Executed
- `npm run lint` - passed
- `npm run build` - passed

## Manual Test Checklist (Required)

### A) Free user view
1. Open Profile as non-premium user.
2. Confirm monetization block shows:
   - `Buy Premium`
   - `Support the project`
   - `I already paid / Claim Premium`
3. Confirm Buy is visually stronger than normal secondary controls.
4. Confirm free-core messaging remains visible and calm.

### B) Premium active view (if available)
1. Use account with active premium entitlement.
2. Open Profile and verify `Premium active` status.
3. Verify scope/source/expiry details render correctly.
4. Confirm monetization rails remain visible but not aggressive.

### C) Claim pending / claim action view (if available)
1. As free user, open `I already paid / Claim Premium`.
2. Submit a claim with at least one proof field.
3. Verify success feedback and latest claim status/timestamp.
4. Use `Refresh claim status` and verify state updates.
5. If claim rejected, verify guidance to update proof and resubmit is visible.

### D) Distinction between rails
1. Tap `Buy Premium` and verify external buy URL opens.
2. Tap `Support the project` and verify support URL opens.
3. Confirm support wording does **not** promise automatic premium grant.
4. Confirm claim rail is separate and operational (not mixed with support rail).

### E) Owner-only boundary intact
1. Open Profile as normal user and verify owner admin tools remain hidden.
2. Open as owner and verify owner-only admin/queue controls remain owner-only.
3. Confirm no regressions in owner visibility gating.

## Risks / Follow-up Notes
1. Claim entry is intentionally compact MVP; richer user-friendly claim UX can be expanded in next monetization phases.
2. External URL defaults are safe placeholders; production should set explicit project URLs via env.
3. Claim status visibility currently focuses latest claim to stay compact; future phase can add full claim history surface if needed.

## Ready for Next Phase (22D)?
Yes.

The project is ready for next monetization iteration (22D) because:
- user-facing Profile entry separation is now in place,
- claim creation and owner review loop are connected end-to-end through existing 22A/22C foundations,
- free-core boundaries and verified flows remain preserved.

## Encoding safety check
- Touched Russian-visible file: `src/lib/i18n/localization.tsx`.
- Added/updated RU strings were re-checked for UTF-8 readability.
- New report and internal history entries are readable UTF-8 markdown.
- No mojibake detected in touched RU-visible content.

## Pre-report self-check against prompt/scope
1. Profile clearly separates Buy Premium / Support / Claim Premium - PASS.
2. Premium status presentation is clear for free/premium and claim-related contexts - PASS.
3. Buy Premium visual emphasis is stronger than ordinary secondary controls without storefront aggression - PASS.
4. Support rail is distinct and explicitly non-automatic entitlement - PASS.
5. Claim Premium path is easy to find in Profile and uses existing runtime claim foundation - PASS.
6. Free-core philosophy and verified app flows remain unchanged - PASS.
7. No schema/migration change in this phase - PASS.
8. Validation executed (`lint`, `build`) - PASS.
9. Owner-only admin boundary remains preserved - PASS.
