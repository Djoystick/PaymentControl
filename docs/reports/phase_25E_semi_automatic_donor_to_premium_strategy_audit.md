# Phase 25E - Semi-Automatic Donor-to-Premium Strategy Audit

- Date: 2026-03-31
- Status: planning/audit only, no runtime changes
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_25B_support_stack_consolidation_pack.md`
  - `docs/reports/phase_25C_donor_to_premium_automation_readiness_pack.md`
  - `docs/reports/phase_25D_dual_rail_entitlement_strategy_cloudtips_candidate_pack.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Docs:
- anchor post soft premium reset
- phase reports 25B, 25C, 25D
- internal version history

Runtime architecture (read-only audit):
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/premium-admin-console.tsx`
- `src/lib/premium/purchase-intent-repository.ts`
- `src/lib/premium/purchase-claim-repository.ts`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- `src/app/api/premium/purchase-intents/[intentId]/status/route.ts`

## 2) Current assumptions challenged

1. Assumption challenged: "More rail-specific explanation always improves clarity."
- Result: too much dual-rail explanation leaks into the first user path and increases cognitive load.

2. Assumption challenged: "Continuity metadata visibility should be user-facing."
- Result: continuity is operationally valuable, but most of it should stay internal/owner-side.

3. Assumption challenged: "CloudTips candidate framing should be prominently explained."
- Result: should remain truthful but secondary; over-explaining candidate semantics burdens normal users.

4. Assumption challenged: "Semi-automatic requires new provider automation now."
- Result: no; meaningful simplification can happen first with existing review-safe architecture.

## 3) Models compared

Compared in detail in:
- `docs/specs/phase_25E_semi_automatic_donor_to_premium_strategy.md`

Evaluated models:
- A) manual-heavy current model
- B) simplified semi-automatic model
- C) gift/code fallback model
- D) rail-aware internal model with simplified user surface

Dimensions evaluated:
- user complexity
- owner complexity
- implementation complexity
- trust/transparency
- automation potential
- fit with app philosophy

## 4) Simplest viable recommendation

Recommendation now: **Model D with B-style user flow**.

Practical meaning:
- one simple primary user path,
- one simple fallback path,
- rail-aware complexity stays internal,
- owner review remains safe default,
- no fake automatic activation claims.

## 5) What should be simplified in current roadmap

1. Simplify user-facing support flow to:
- support externally -> return -> minimal confirmation claim
2. Keep manual fallback explicit but compact:
- "I already supported" -> manual proof submission
3. Reduce first-path explanatory burden:
- rail strategy details should not dominate user lane
4. Keep both rails operational but reduce conceptual load:
- Boosty primary, CloudTips secondary, dual-rail semantics mostly internal
5. Keep code/gift as fallback-only logic, not main product direction.

## 6) Boosty Telegram linking conclusion

Boosty Telegram linking is useful only as an identity/context hint.

It does **not**:
- provide direct entitlement proof,
- justify automatic activation,
- replace owner review.

It may assist owner confidence in some cases but should not drive product architecture.

## 7) Should next pass be simplification implementation wave?

Yes.

Next pass should implement a **support-flow simplification wave** (not provider integration), focused on:
- reducing user steps and text overhead,
- preserving honesty and fallback safety,
- keeping rail-specific logic mostly internal.

## 8) What was intentionally left untouched

1. No runtime code changes.
2. No UI redesign implementation.
3. No DB/API/wire contract changes.
4. No migration work.
5. No business behavior changes.

## 9) Exact recommended next step

Start a dedicated implementation pass for:
- single clear user-facing semi-automatic path,
- explicit compact fallback path,
- owner queue quick-validation ergonomics using already collected continuity/rail metadata.

