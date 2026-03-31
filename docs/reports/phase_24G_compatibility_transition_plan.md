# Phase 24G - Compatibility Transition Plan (Planning Only)

- Date: 2026-03-31
- Status: implemented (planning docs only), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Planning spec: `docs/specs/phase_24G_versioned_compatibility_transition_plan.md`

## 1) What was inspected

Required compatibility artifacts and anchor:
- `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- `docs/specs/phase_24F_compatibility_boundary_map.md`
- `docs/reports/phase_24F_compatibility_boundary_codification.md`

Related source-of-truth reports:
- `docs/reports/phase_24A_full_product_audit_soft_premium_foundation_uiux_rebase.md`
- `docs/reports/phase_24A_runtime_surface_inventory.md`
- `docs/reports/phase_24A_soft_premium_multi_rail_foundation.md`
- `docs/reports/phase_24B_localization_and_copy_parity_polish.md`
- `docs/reports/phase_24C_support_claim_operational_clarity.md`
- `docs/reports/phase_24D_optional_rail_activation_hardening.md`
- `docs/reports/phase_24E_legacy_monetization_debt_minimization.md`
- `docs/reports/internal_version_history.md`

Relevant internal boundary files (re-inspected):
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
- active consumers:
  - `src/components/app/profile-scenarios-placeholder.tsx`
  - `src/components/app/premium-admin-console.tsx`

## 2) Transition risks identified

1. DB/schema rename risk:
   - physical rename of `premium_purchase_*` can break historical row handling and rollback.
2. API route rename risk:
   - `/api/premium/purchase-*` is stable contract surface for existing clients.
3. Wire-id rename risk:
   - `PREMIUM_PURCHASE_*` codes are consumed by current error handling.
4. Admin action-id removal risk:
   - dropping `list/review_purchase_claim` too early can break older admin clients.
5. Historical metadata/literal drift risk:
   - renaming keys/literals without adapter strategy can degrade audit traceability.

## 3) Proposed staged plan

Defined in `docs/specs/phase_24G_versioned_compatibility_transition_plan.md`:

1. Stage 0 (done): boundary codification and freeze (`compat-v1`).
2. Stage 1 (optional): additive alias contract only.
3. Stage 2 (optional): dual-contract read/response compatibility.
4. Stage 3 (optional): controlled consumer migration order.
5. Stage 4 (optional): explicit deprecation window.
6. Stage 5 (optional): hard cleanup only if proven safe and worth cost.

The plan is intentionally reversible and does not force unnecessary implementation.

## 4) What was intentionally left untouched

By design in 24G:
1. No runtime code changes.
2. No DB/schema changes.
3. No API route changes.
4. No wire error code changes.
5. No admin action-id removals.
6. No business logic or UX behavior changes.

This pass is documentation/planning only.

## 5) Recommendation: implement deep cleanup now or defer

Recommendation: defer deep cleanup for now.

Rationale:
1. active donor-support-first runtime truth is already achieved,
2. compatibility boundaries are now clearly mapped and staged,
3. immediate deep rename work has higher breakage risk than near-term product value.

Deep cleanup should start only when:
- maintenance pain is measurable, or
- contract/product requirements explicitly demand boundary reduction.

## 6) Suggested next step after 24G

Phase 24H (if needed): readiness gate definition (still planning-focused):
1. define objective triggers that justify Stage 1 implementation,
2. define required observability/manual checkpoints before any dual-contract rollout,
3. prepare a reversible implementation checklist without shipping renames yet.

## 7) Validation

- `npm run lint` - pass
- `npm run build` - pass
