# Phase 25I - CloudTips Provider Trust Boundary Audit

- Date: 2026-04-01
- Status: planning/audit only (no runtime changes)
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_25B_support_stack_consolidation_pack.md`
  - `docs/reports/phase_25C_donor_to_premium_automation_readiness_pack.md`
  - `docs/reports/phase_25D_dual_rail_entitlement_strategy_cloudtips_candidate_pack.md`
  - `docs/reports/phase_25E_semi_automatic_donor_to_premium_strategy_audit.md`
  - `docs/reports/phase_25F_support_flow_simplification_implementation_wave.md`
  - `docs/reports/phase_25G_cloudtips_semi_automatic_feasibility_audit.md`
  - `docs/reports/phase_25H_cloudtips_owner_assisted_triage_pack.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Docs:
1. Post-soft-premium-reset anchor.
2. Phase reports 25B-25H and internal version history.

Architecture/runtime boundaries (read-only audit):
1. `src/components/app/profile-scenarios-placeholder.tsx` (25F user path baseline).
2. `src/components/app/premium-admin-console.tsx` (25H owner-assisted triage baseline).
3. `src/lib/premium/purchase-intent-repository.ts`.
4. `src/lib/premium/purchase-claim-repository.ts`.
5. `src/lib/premium/admin-service.ts`.
6. `src/app/api/premium/purchase-intents/route.ts`.
7. `src/app/api/premium/purchase-intents/[intentId]/status/route.ts`.
8. `src/app/api/premium/purchase-intents/mine/route.ts`.
9. `src/app/api/premium/purchase-claims/route.ts`.
10. `src/app/api/premium/purchase-claims/mine/route.ts`.
11. `src/lib/config/client-env.ts`.
12. `src/lib/config/server-env.ts`.
13. `.env.example`.

## 2) Assumptions confirmed vs rejected

### 2.1 Confirmed

1. 25F user-facing flow is intentionally simple and should remain stable:
   - one main support action,
   - one compact fallback claim path.
2. 25H owner queue now has practical CloudTips candidate triage accelerators:
   - rail-focused filters,
   - continuity/proof-based owner cues,
   - still manual approve/reject gate.
3. Owner review remains the only entitlement gate in current code:
   - entitlement grant is performed inside admin review approval path.

### 2.2 Rejected

1. "CloudTips candidate metadata equals verified payment proof":
   - rejected; metadata is continuity/triage context only.
2. "Current app already has provider trust boundary":
   - rejected; no provider auth/signature/idempotency chain exists.
3. "Client return/open signals are enough for entitlement":
   - rejected; these are client continuity hints, not authoritative payment evidence.

## 3) Exact trust-boundary requirements identified

Full spec is documented in:
- `docs/specs/phase_25I_cloudtips_provider_trust_boundary_spec.md`

Minimum required chain before any verified semi-automation:
1. Provider-authenticated event source (webhook/callback or equivalent).
2. Signature/authenticity verification server-side.
3. Replay/idempotency guard with durable event dedupe.
4. Deterministic event-to-user mapping rule.
5. Deterministic event-to-intent/claim linkage rule.
6. Feature-gated rollout and rollback controls.
7. Explicit ambiguity handling to manual owner review.

## 4) What current architecture already supports

1. Strong support reference and claim model with correlation code and lifecycle state.
2. Rail-aware continuity metadata (`boosty` / `cloudtips`) with owner-visible context.
3. Owner-assisted triage improvements for CloudTips candidate workload reduction.
4. Clear manual entitlement gate in admin service.
5. Honest user-facing copy that does not promise automatic activation.

## 5) What is still missing

1. CloudTips provider secret/auth contract in server env.
2. Provider event ingestion route and signature verification.
3. Durable idempotency/replay protection for provider events.
4. Proven low-risk mapping from provider event to app profile/claim/intent.
5. Verified-automation rollback protocol with tested emergency freeze semantics.

## 6) Realism assessment for future verified path

Conclusion: **potentially realistic later, not implementable safely now**.

Reason:
1. Internal app seams are ready for owner-assisted and hybrid evolution.
2. Provider trust-boundary evidence is currently absent in repository contracts.
3. Without authenticated provider event proof chain, any "verified" entitlement path would be speculative and unsafe.

## 7) Baseline preservation check

1. 25F user-facing simplified support flow: preserved (no runtime changes in this audit pass).
2. 25H owner-assisted CloudTips triage flow: preserved (no runtime changes in this audit pass).
3. Product honesty constraints preserved (no fake automation claims added).

## 8) Exact recommended next step

Recommendation now: **do not start provider-verified implementation yet**.

Next step:
1. Run external provider research focused only on trust-boundary evidence (authenticity, event model, idempotent identifiers, mapping anchors).
2. If and only if evidence satisfies 25I GO criteria, plan a guarded Option-2 implementation (owner-assisted + verified-hint hybrid) behind strict feature gating.
3. Keep 25F + 25H as active production-safe baseline until that proof exists.

## 9) Validation

- `npm run lint` - pass
- `npm run build` - pass
