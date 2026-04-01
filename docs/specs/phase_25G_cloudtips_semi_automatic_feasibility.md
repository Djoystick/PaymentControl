# Phase 25G - CloudTips Semi-Automatic Feasibility

- Date: 2026-04-01
- Status: planning/audit only
- Scope: provider-specific feasibility definition; no runtime/schema/business changes
- Anchor priority: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`

## 1) Goal

Determine whether CloudTips can be the first safe semi-automatic donor-to-premium rail in this project, without:
- fake automation claims,
- subscription-first regression,
- bypassing owner review before verified trust boundaries exist.

## A) What CloudTips would need to provide for safe semi-automation

Minimum provider trust requirements:
1. A deterministic support event identifier (transaction/donation id).
2. A trusted verification channel:
- signed webhook, or
- authenticated pull API with auditable event history.
3. Replay-safe event guarantees:
- timestamp/window validation,
- signature/token validation,
- duplicate event handling.
4. Useful event payload fields:
- status (succeeded/refunded/failed),
- amount/currency/time,
- donor reference fields that can be mapped safely.
5. A practical mapping mechanism from provider event to app user:
- correlation code support or equivalent explicit reference field,
- or a stable identity link with acceptable false-positive risk.

Without these, CloudTips cannot be treated as verified entitlement proof.

## B) What current app already supports

Already implemented and usable for semi-automatic readiness:
1. Support reference intents with correlation codes (`PC-*`).
2. Continuity lifecycle transitions:
- `opened_external`
- `returned`
3. Rail-aware metadata capture on intent and claim:
- rail id (`boosty`/`cloudtips`),
- rail operational mode (`continuity_claim_manual` / `automation_candidate`).
4. Claim metadata includes continuity stage snapshots.
5. Owner review queue already surfaces:
- continuity hints,
- rail context,
- proof fields,
- review actions.
6. 25F simplified user lane is already in place (one main path + one fallback).

## C) What is still missing

Missing for true CloudTips-verified semi-automation:
1. No provider auth secret/config contract for CloudTips verification.
2. No inbound provider callback/webhook endpoint.
3. No signature validation/replay-protection layer for provider events.
4. No provider event storage model for idempotent reconciliation.
5. No verified matching rule that can safely map provider event -> profile claim.
6. No rollback-safe entitlement automation gate tied to verified provider signal quality.

Conclusion: verified provider automation is not currently implemented.

## D) Feasibility level (current reality)

1. Not feasible now (full verified automation): **true**.
2. Feasible now with owner-assisted validation: **true**.
3. Feasible with reversible staged rollout: **true**, if strict gating and rollback policy are enforced.

## E) Safest first implementation stage

Recommended Stage 1 (guarded, owner-assisted only):
1. Keep 25F user flow unchanged.
2. Add CloudTips-specific owner assist logic only:
- better candidate grouping/filtering in queue,
- stronger prefilled context for faster manual decision.
3. Do not auto-approve entitlement.
4. Keep explicit owner confirmation as the grant trigger.
5. Introduce a hard feature flag / kill switch for all CloudTips-assisted behavior.

## F) What user should and should not see

User should see:
1. Same simplified 25F flow.
2. Calm and honest language:
- support is external,
- owner review confirms eligibility.
3. Optional fallback remains visible and simple.

User should not see:
1. Provider internals.
2. "Automatic activation completed" claims.
3. Rail strategy complexity in the primary lane.

## G) What owner/admin flow should and should not take over

Owner/admin should take over:
1. Rail-specific quick triage for CloudTips-tagged claims.
2. Faster manual validation using continuity + proof + rail metadata.
3. Strict decision logging for approved/rejected outcomes.

Owner/admin should not take over:
1. Blind approval based only on `returned` continuity.
2. Entitlement activation without verified evidence quality.
3. Any irreversible entitlement flow with no rollback path.

## H) Rollback and honesty rules

Mandatory safety rules:
1. Any CloudTips-assisted behavior must be feature-gated.
2. Rollback path must be instant: disable flag -> revert to standard manual review.
3. No user-facing copy may imply guaranteed instant activation.
4. If verification confidence drops, freeze CloudTips-assisted logic and keep manual fallback.
5. Keep Boosty continuity/manual path stable as baseline fallback rail.

## 2) Strategy options comparison

## Option A - Keep 25F unchanged
- User complexity: low
- Owner complexity: medium
- Implementation risk: very low
- Reversibility: high
- Honesty/transparency: high
- Fit with philosophy: high
- Tradeoff: limited operational acceleration.

## Option B - CloudTips owner-assisted semi-automatic candidate
- User complexity: low (unchanged if 25F lane is preserved)
- Owner complexity: low-medium (better queue assistance)
- Implementation risk: low-medium
- Reversibility: high (feature-gated)
- Honesty/transparency: high (manual review remains explicit)
- Fit with philosophy: very high
- Tradeoff: not true verified automation yet.

## Option C - CloudTips verified path behind strict gate (later)
- User complexity: low-medium
- Owner complexity: medium
- Implementation risk: high (depends on provider trust and reliability)
- Reversibility: medium (requires strong operational controls)
- Honesty/transparency: medium-high (if staged carefully)
- Fit with philosophy: medium-high
- Tradeoff: blocked until provider verification boundary is proven.

## Option D - Defer provider-specific automation entirely
- User complexity: low
- Owner complexity: medium
- Implementation risk: very low
- Reversibility: high
- Honesty/transparency: high
- Fit with philosophy: high
- Tradeoff: misses near-term owner-efficiency gains available without fake automation.

## 3) Recommendation

Recommended now: **Option B** (guarded CloudTips owner-assisted semi-automatic candidate), with Option C explicitly deferred.

Why:
1. It uses already implemented continuity/rail metadata seams.
2. It preserves 25F simplicity and truth.
3. It improves owner speed without fake provider verification.
4. It remains fully reversible via feature flag.

Hard boundary:
- No automatic entitlement grant until provider verification trust is proven in a separate provider-integration pass.
