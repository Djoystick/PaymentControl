# Phase 25J - CloudTips Integration Prerequisites Pack

- Date: 2026-04-01
- Status: planning/ops-readiness only (no runtime changes)
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_25B_support_stack_consolidation_pack.md`
  - `docs/reports/phase_25C_donor_to_premium_automation_readiness_pack.md`
  - `docs/reports/phase_25D_dual_rail_entitlement_strategy_cloudtips_candidate_pack.md`
  - `docs/reports/phase_25E_semi_automatic_donor_to_premium_strategy_audit.md`
  - `docs/reports/phase_25F_support_flow_simplification_implementation_wave.md`
  - `docs/reports/phase_25G_cloudtips_semi_automatic_feasibility_audit.md`
  - `docs/reports/phase_25H_cloudtips_owner_assisted_triage_pack.md`
  - `docs/reports/phase_25I_cloudtips_provider_trust_boundary_audit.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Docs and baselines:
1. Anchor and reports 25B-25I.

Architecture boundaries:
1. `src/lib/config/client-env.ts`
2. `src/lib/config/server-env.ts`
3. `.env.example`
4. `src/lib/premium/purchase-intent-repository.ts`
5. `src/lib/premium/purchase-claim-repository.ts`
6. `src/lib/premium/admin-service.ts`
7. `src/app/api/premium/purchase-intents/route.ts`
8. `src/app/api/premium/purchase-intents/[intentId]/status/route.ts`
9. `src/app/api/premium/purchase-intents/mine/route.ts`
10. `src/app/api/premium/purchase-claims/route.ts`
11. `src/app/api/premium/purchase-claims/mine/route.ts`
12. `src/components/app/profile-scenarios-placeholder.tsx` (25F baseline check)
13. `src/components/app/premium-admin-console.tsx` (25H baseline check)

## 2) What was converted from 25I into concrete prerequisites

Created:
1. formal prerequisites spec:
   - `docs/specs/phase_25J_cloudtips_integration_prerequisites.md`
2. practical owner checklist:
   - `docs/reports/phase_25J_cloudtips_integration_readiness_checklist.md`

Converted trust-boundary findings into explicit operational requirements:
1. provider-side evidence checklist (auth/signature/event/idempotency/mapping/sandbox/support-contact),
2. internal prerequisites checklist (env contracts, ingest boundary, replay boundary, mapping boundary, fallback and rollback controls),
3. concrete entry gate criteria and hard no-go blockers.

## 3) What can be prepared now safely (without implementation)

Safe now:
1. External evidence collection from CloudTips using the 25J readiness checklist.
2. Internal agreement on proposed server env key contract and gate policy.
3. Draft operator runbook for freeze/revert before any coding.
4. Draft test matrix for future signature/idempotency/mapping verification.

Still deferred:
1. Any provider webhook/callback endpoint code.
2. Signature verification code.
3. Replay/idempotency runtime persistence implementation.
4. Any entitlement automation behavior.

## 4) What must remain deferred

1. Verified provider automation implementation remains blocked until prerequisite evidence is complete.
2. 25F user-facing simplified support flow must remain unchanged.
3. 25H owner-assisted triage must remain active and mandatory fallback.
4. Owner review remains entitlement gate until trust boundary is proven.

## 5) Minimal repo-side non-runtime prep recommended later

If external evidence becomes complete, a later planning pass may safely prepare:
1. explicit server env key docs (still disabled by default),
2. feature-gate naming convention and default-off policy,
3. structured logging field schema for provider-event audit,
without enabling any verification runtime path yet.

## 6) Exact recommended next step

Use `docs/reports/phase_25J_cloudtips_integration_readiness_checklist.md` to request and collect missing CloudTips evidence.

If critical evidence remains missing:
1. keep 25F + 25H frozen and do not schedule implementation.

If all critical evidence is confirmed:
1. run a guarded pre-implementation design pass for a feature-gated, owner-fallback-first integration plan.

## 7) Validation

- `npm run lint` - pass
- `npm run build` - pass
