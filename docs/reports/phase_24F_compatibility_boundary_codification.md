# Phase 24F - Compatibility Boundary Codification

- Date: 2026-03-31
- Status: implemented (docs + boundary codification), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_24A_full_product_audit_soft_premium_foundation_uiux_rebase.md`
  - `docs/reports/phase_24A_runtime_surface_inventory.md`
  - `docs/reports/phase_24A_soft_premium_multi_rail_foundation.md`
  - `docs/reports/phase_24B_localization_and_copy_parity_polish.md`
  - `docs/reports/phase_24C_support_claim_operational_clarity.md`
  - `docs/reports/phase_24D_optional_rail_activation_hardening.md`
  - `docs/reports/phase_24E_legacy_monetization_debt_minimization.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Code/files inspected for compatibility boundaries:
- `src/lib/premium/purchase-semantics.ts`
- `src/lib/premium/purchase-claim-repository.ts`
- `src/lib/premium/purchase-intent-repository.ts`
- `src/lib/premium/admin-service.ts`
- `src/lib/premium/repository.ts`
- `src/lib/premium/service.ts`
- `src/lib/auth/types.ts`
- `src/lib/auth/client.ts`
- `src/app/api/premium/admin/route.ts`
- `src/app/api/premium/purchase-claims/route.ts`
- `src/app/api/premium/purchase-claims/mine/route.ts`
- `src/app/api/premium/purchase-intents/route.ts`
- `src/app/api/premium/purchase-intents/mine/route.ts`
- active runtime consumers:
  - `src/components/app/profile-scenarios-placeholder.tsx`
  - `src/components/app/premium-admin-console.tsx`

Docs inspected:
- `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- `docs/reports/phase_24A_full_product_audit_soft_premium_foundation_uiux_rebase.md`
- `docs/reports/phase_24A_runtime_surface_inventory.md`
- `docs/reports/phase_24A_soft_premium_multi_rail_foundation.md`
- `docs/reports/phase_24B_localization_and_copy_parity_polish.md`
- `docs/reports/phase_24C_support_claim_operational_clarity.md`
- `docs/reports/phase_24D_optional_rail_activation_hardening.md`
- `docs/reports/phase_24E_legacy_monetization_debt_minimization.md`
- `docs/reports/internal_version_history.md`

## 2) Where compatibility boundaries still exist

Primary preserved boundaries:
1. DB/schema names remain `premium_purchase_*` in claims/intents storage.
2. API paths remain `/api/premium/purchase-claims*` and `/api/premium/purchase-intents*`.
3. Wire error families remain `PREMIUM_PURCHASE_*`.
4. Admin action ids keep legacy variants (`list_purchase_claims`, `review_purchase_claim`) with support aliases added.
5. Historical columns/metadata keys remain (`purchase_intent_id`, `purchase_correlation_code`, `linked_purchase_*`).
6. Historical entitlement source literal `"boosty"` remains readable as historical record.

## 3) Main output of this pass

Created formal compatibility map:
- `docs/specs/phase_24F_compatibility_boundary_map.md`

This map now explicitly separates:
- A) current runtime donor-support truth,
- B) compatibility-only historical naming boundaries,
- C) deferred high-risk cleanup areas.

It includes the required crosswalk fields:
- active runtime concept,
- historical DB/schema name,
- historical API route/path,
- historical wire/error/action identifier,
- current intended meaning,
- status (`active truth`, `compatibility-only`, `historical record`, `deferred cleanup`),
- reason boundary still exists.

## 4) What is safe to touch later vs risky

Safe to touch in normal passes:
- support-first alias names in internal code,
- support-first RU/EN copy and microcopy,
- compatibility comments and maintainer docs.

Must not be renamed casually:
- DB table/column identifiers under `premium_purchase_*`,
- `/api/premium/purchase-*` route paths,
- `PREMIUM_PURCHASE_*` wire error codes,
- legacy admin action ids still accepted for compatibility.

## 5) What was intentionally left compatibility-only

Intentionally unchanged:
- storage naming and schema contracts,
- route naming and public endpoint contract,
- wire error code naming,
- owner-review business flow and fallback model,
- runtime UX direction from 24A-24D.

No migration introduced.

## 6) Tiny implementation changes in this pass

- Runtime code: no changes.
- Added docs only (compatibility map + this report + version history row).
- Existing compatibility comments/helpers introduced in earlier phases remain as-is.

## 7) Anchor updates

No master anchor changes were required for this pass.

Reason:
- current anchor already encodes donor-support-first truth and legacy compatibility policy clearly,
- 24F mainly needed an explicit compatibility map artifact for maintainers.

## 8) Backward compatibility preservation

Compatibility remains preserved because:
1. no DB/schema rename happened,
2. no route-path rename happened,
3. no wire code rename happened,
4. no legacy admin action removal happened,
5. runtime support-claim/review behavior stayed stable.

## 9) Risks and follow-ups

1. Future contributors may still attempt deep renames if they skip the new compatibility map.
2. A dedicated versioned transition plan is required before any DB/API/wire renaming.
3. Historical wording in old reports should remain historical record, not runtime direction.

## 10) Validation

- `npm run lint` - pass
- `npm run build` - pass

## 11) Manual verification notes (concise)

1. Open Profile and confirm support reference + support claim flow remains available and unchanged.
2. Open owner admin console and confirm support-claim queue load/review behavior remains unchanged.
3. Confirm no runtime wording regressed to subscription-first as active truth.

## 12) Recommended next step

Phase 24G (planning-only proposal):
- draft a versioned compatibility transition plan (no implementation yet) for eventual DB/API/wire renaming,
- include rollout stages, dual-write/read strategy, and rollback criteria before any deep cleanup.
