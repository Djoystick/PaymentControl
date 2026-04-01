# Phase 25G - CloudTips Semi-Automatic Feasibility Audit

- Date: 2026-04-01
- Status: planning/audit only (no runtime changes)
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_25B_support_stack_consolidation_pack.md`
  - `docs/reports/phase_25C_donor_to_premium_automation_readiness_pack.md`
  - `docs/reports/phase_25D_dual_rail_entitlement_strategy_cloudtips_candidate_pack.md`
  - `docs/reports/phase_25E_semi_automatic_donor_to_premium_strategy_audit.md`
  - `docs/reports/phase_25F_support_flow_simplification_implementation_wave.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Docs and planning baselines:
- post-soft-premium-reset anchor
- phase reports 25B, 25C, 25D, 25E, 25F
- internal version history

Code architecture and boundaries:
- `src/lib/premium/purchase-intent-repository.ts`
- `src/lib/premium/purchase-claim-repository.ts`
- `src/app/api/premium/purchase-intents/[intentId]/status/route.ts`
- `src/app/api/premium/purchase-intents/route.ts`
- `src/app/api/premium/purchase-intents/mine/route.ts`
- `src/app/api/premium/purchase-claims/route.ts`
- `src/app/api/premium/purchase-claims/mine/route.ts`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/premium-admin-console.tsx`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- `src/lib/config/client-env.ts`
- `.env.example`

## 2) Current assumptions challenged

1. Assumption challenged: "CloudTips candidate label means semi-automation is already feasible."
- Result: false. Current signals are continuity metadata, not provider-verified proof.

2. Assumption challenged: "If provider has a URL rail, a safe auto-match path is near-complete."
- Result: false. URL rail alone provides no trust boundary.

3. Assumption challenged: "Current 25F simplification should be expanded for provider specifics."
- Result: false. 25F should remain the user-facing baseline to avoid complexity regressions.

## 3) CloudTips-specific opportunities found

1. Existing rail-aware metadata already captures CloudTips context on:
- intent transitions,
- linked claim metadata,
- owner queue summaries.
2. Existing continuity lifecycle (`opened_external` / `returned`) provides useful sequencing hints.
3. Owner queue is already capable of rail-aware manual triage and can be improved further without changing user flow.

These are good owner-assisted seams, not verified automation.

## 4) What remains unproven / missing

Missing trust boundaries for true CloudTips verified semi-automation:
1. No CloudTips provider auth/secret configuration in server env.
2. No provider callback/webhook endpoint with signature verification.
3. No replay-safe provider event ingestion + idempotent event storage.
4. No proven mapping rule from provider event to profile/claim with low false-positive risk.
5. No operational rollback gate around provider-verified entitlement actions.

## 5) Strategy recommendation now

Recommended now: **guarded owner-assisted CloudTips candidate (Option B)**.

Meaning:
1. Keep user-facing 25F path unchanged.
2. Improve owner-assisted CloudTips triage/matching support only.
3. Keep owner review as mandatory entitlement gate.
4. Defer verified provider path (Option C) until provider trust boundary is explicitly proven.

Not recommended now:
- direct provider-verified activation rollout,
- any user-facing promise of automatic activation.

## 6) Should next pass be freeze or guarded implementation?

Recommendation: **guarded implementation** (owner-assisted only), not full freeze and not verified automation rollout.

Reason:
1. Enough internal seams exist to reduce owner workload safely now.
2. Verified provider proof chain remains unproven and must stay deferred.

## 7) What was intentionally left untouched

1. No runtime code/UI/business changes in this pass.
2. No migration work.
3. No change to accepted 25F simplified support flow.
4. No change to owner-review-safe default semantics.

## 8) Exact recommended next step

Execute a scoped implementation pass for:
1. owner-side CloudTips-assisted triage improvements only,
2. strict feature gating and rollback safety,
3. zero change to user-facing 25F primary/fallback support lane.

In parallel, run targeted external integration research to validate whether CloudTips can provide a trustworthy verification boundary for later Option C.

## 9) Validation

- `npm run lint` - pass
- `npm run build` - pass
