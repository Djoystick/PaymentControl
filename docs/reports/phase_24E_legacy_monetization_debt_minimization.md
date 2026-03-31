# Phase 24E - Legacy Monetization Debt Minimization

- Date: 2026-03-31
- Status: implemented (internal naming debt minimization), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_24A_full_product_audit_soft_premium_foundation_uiux_rebase.md`
  - `docs/reports/phase_24A_runtime_surface_inventory.md`
  - `docs/reports/phase_24A_soft_premium_multi_rail_foundation.md`
  - `docs/reports/phase_24B_localization_and_copy_parity_polish.md`
  - `docs/reports/phase_24C_support_claim_operational_clarity.md`
  - `docs/reports/phase_24D_optional_rail_activation_hardening.md`
  - `docs/reports/internal_version_history.md`

## 1) Scope inspected before edits

Internal code and type surfaces inspected:
- `src/lib/premium/purchase-semantics.ts`
- `src/lib/premium/purchase-claim-repository.ts`
- `src/lib/premium/purchase-intent-repository.ts`
- `src/lib/premium/admin-service.ts`
- `src/lib/premium/repository.ts`
- `src/lib/premium/service.ts`
- `src/lib/premium/gift-campaign-repository.ts`
- `src/lib/auth/types.ts`
- `src/lib/auth/client.ts`
- `src/app/api/premium/admin/route.ts`
- `src/app/api/premium/purchase-claims/route.ts`
- `src/app/api/premium/purchase-claims/mine/route.ts`
- `src/app/api/premium/purchase-intents/route.ts`
- `src/app/api/premium/purchase-intents/mine/route.ts`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/premium-admin-console.tsx`
- `src/lib/i18n/localization.tsx`

Docs inspected for truth separation context:
- `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- `docs/reports/phase_24A_full_product_audit_soft_premium_foundation_uiux_rebase.md`
- `docs/reports/phase_24A_runtime_surface_inventory.md`
- `docs/reports/phase_24A_soft_premium_multi_rail_foundation.md`
- `docs/reports/phase_24B_localization_and_copy_parity_polish.md`
- `docs/reports/phase_24C_support_claim_operational_clarity.md`
- `docs/reports/phase_24D_optional_rail_activation_hardening.md`

## 2) Legacy debt categories found

## 2.1 Keep as historical compatibility (not renamed)

- DB tables/columns: `premium_purchase_claims`, `premium_purchase_intents`, `purchase_intent_id`, `purchase_correlation_code`.
- API paths: `/api/premium/purchase-claims*`, `/api/premium/purchase-intents*`.
- Existing response/error code families: `PREMIUM_PURCHASE_*`.
- Existing admin action ids used by older clients: `list_purchase_claims`, `review_purchase_claim`.

Rationale: compatibility risk is non-trivial; these are integration boundaries.

## 2.2 Wrap/alias safely (implemented)

- Added support-first type aliases in `src/lib/auth/types.ts`:
  - `SupportClaim*`
  - `SupportReference*`
  - support-claim admin response/decision aliases.
- Added support-first semantic aliases in `src/lib/premium/purchase-semantics.ts`:
  - `DEFAULT_SUPPORT_CLAIM_RAIL`
  - `LEGACY_SUPPORT_CLAIM_RAIL`
  - `isSupportedSupportClaimRail()`.
- Added support-first client helpers in `src/lib/auth/client.ts`:
  - `createSupportClaim`
  - `createSupportReferenceIntent`
  - `readMySupportClaims`
  - `readMySupportReferenceIntents`
  - `listSupportClaimsByAdmin`
  - `reviewSupportClaimByAdmin`.
- Added support-first repository/admin-service aliases:
  - `createSupportClaim`
  - `createSupportReferenceIntent`
  - `readSupportReferencesForProfile`
  - `resolveSupportReferenceForClaim`
  - `markSupportReferenceClaimed`
  - `listSupportClaims`
  - `reviewSupportClaim`.

## 2.3 Rename safely (implemented in active call sites only)

- Profile flow (`profile-scenarios-placeholder.tsx`) switched to support-first client helpers/types and `DEFAULT_SUPPORT_CLAIM_RAIL`.
- Owner admin console (`premium-admin-console.tsx`) switched to support-first helper names/types and `DEFAULT_SUPPORT_CLAIM_RAIL`.
- API internals switched to support-first aliases where safe while preserving stable route paths.

## 2.4 Document and defer

- Full rename of DB schema/table identifiers and API route paths was intentionally deferred.
- Full rename of `PREMIUM_PURCHASE_*` wire error codes was intentionally deferred to avoid breaking existing clients/contracts.

## 3) Exact normalization changes made

1. Added compatibility notes and support-first alias layer in shared types/semantics.
2. Switched active internal consumers (Profile/Admin and premium API route internals) to support-first aliases.
3. Added support-action aliases in admin route:
   - accepted now: `list_support_claims`, `review_support_claim`
   - legacy action ids remain accepted.
4. Normalized repository/route internal error strings toward support/reference wording.
5. Added RU translations for newly introduced support/reference error strings.
6. Added concise compatibility-boundary comments in repository/API files that still use historical `premium_purchase_*` boundaries.

## 4) Backward compatibility handling

Preserved compatibility explicitly:
- Legacy routes, tables, columns, and error code identifiers remain unchanged.
- Legacy admin action ids remain valid (`list_purchase_claims`, `review_purchase_claim`).
- New support-first aliases were additive and layered on top, not destructive replacements.
- Legacy rails and old historical rows (`boosty_premium`) remain readable and reviewable.

No migration was introduced.

## 5) Runtime behavior intentionally unchanged

Unchanged by design:
- Support rail behavior from 24D.
- Support claim flow business logic and lifecycle states.
- Owner review fallback model.
- Free-core behavior.
- Profile/Home/Reminders/History/App shell structure.
- Entitlement policy and claim decision logic.

This pass focused on internal naming clarity and compatibility-safe boundaries only.

## 6) Risks and follow-ups

1. Historical naming remains at storage/path level (`premium_purchase_*`) and still requires explicit compatibility context for maintainers.
2. Future deeper cleanup (if approved) should introduce versioned API/schema transition plan before renaming wire/database identifiers.
3. Some old report files remain historically purchase-first in wording; they are intentionally retained as historical records.

## 7) Validation

- `npm run lint` - pass
- `npm run build` - pass

## 8) Manual verification notes (concise)

1. Profile support reference + claim flow still works end-to-end (prepare code, submit claim, refresh statuses).
2. Owner admin claim queue still loads, reviews, and updates claims normally.
3. Admin calls continue to work with legacy actions and with new support-claim action aliases.
4. RU/EN error feedback remains readable when support/reference validation errors are triggered.

## 9) Recommended next step

Phase 24F - Compatibility boundary codification:
- add a short dedicated compatibility map doc for historical DB/API identifiers vs current donor-support runtime semantics,
- keep runtime donor-support truth and owner-review-safe behavior unchanged.
