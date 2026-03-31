# Phase 24H - Readiness Gate Definition

- Date: 2026-03-31
- Status: planning/verification-readiness only (no implementation changes)
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Related compatibility artifacts:
  - `docs/specs/phase_24F_compatibility_boundary_map.md`
  - `docs/specs/phase_24G_versioned_compatibility_transition_plan.md`

## A) Future change being gated

This gate controls whether the project should start any future compatibility-transition implementation beyond current frozen state, specifically:
1. Stage 1 additive alias contract rollout from 24G.
2. Any deeper compatibility cleanup affecting historical `premium_purchase_*` boundaries.

It does not approve deep cleanup automatically. It only defines decision rules.

## B) Objective go/no-go triggers

At least 2 high-signal triggers should be present before Stage 1 starts:

1. Measurable maintenance pain:
   - repeated rework across multiple passes caused by same compatibility boundary confusion.
2. Repeated contributor confusion despite 24F/24G docs:
   - at least 2 independent cases where maintainers mis-handle boundary semantics.
3. Concrete contract demand:
   - explicit integration or product requirement needing clearer support-first public/internal naming.
4. Blocked useful work:
   - current compatibility debt demonstrably delays or blocks high-value features/fixes.
5. Operational risk reduction opportunity:
   - additive aliasing can reduce mistakes without changing runtime behavior.

If fewer than 2 triggers are present, default answer is no-go (stay frozen).

## C) Mandatory prerequisites before deeper cleanup

All prerequisites below must be true:

1. Truth docs current:
   - anchor and 24A-24G reports/specs are aligned.
2. Compatibility map current:
   - 24F map reflects actual DB/API/wire/action boundaries.
3. Transition plan current:
   - 24G staged plan is still valid for current codebase.
4. Manual test checklist ready:
   - closure checklist exists and is actionable.
5. Rollback path defined:
   - explicit freeze/rollback criteria documented before implementation.
6. Compatibility scope narrowed:
   - exact boundaries for the intended stage are listed (no broad cleanup ambiguity).
7. No unresolved uncertainty on critical truths:
   - support claim flow,
   - owner review behavior,
   - Boosty/CloudTips behavior.

If any prerequisite is false, no-go.

## D) Stop/defer conditions

Use stop/defer if any condition applies:

1. No measurable pain and no contract demand.
2. Proposed change includes DB/API/wire renames too early.
3. Team cannot guarantee reversible rollout.
4. Manual verification ownership is unclear.
5. Risk to donor-support-first runtime truth is non-trivial.

In these cases:
- do nothing,
- keep compatibility frozen under `compat-v1`,
- avoid deep cleanup now.

## E) Required observability/manual checkpoints before Stage 1

Even without new telemetry, the following manual checkpoints are mandatory:

1. User support flow:
   - prepare support reference,
   - submit support claim,
   - read latest claim/reference statuses.
2. Owner review flow:
   - list queue,
   - approve/reject claim,
   - confirm entitlement linkage visibility.
3. RU/EN wording truth:
   - no active subscription-first wording.
4. Support rails behavior:
   - Boosty primary remains clear,
   - CloudTips configured vs pending behavior remains honest/non-broken.
5. Legacy data readability:
   - legacy rail/source rows and historical metadata remain interpretable.
6. Free-core safety:
   - Home/Reminders/History/core payment flows unaffected.

## F) Rollback criteria

Immediate freeze or rollback is required if any appears:

1. Support claim create/read regressions.
2. Owner queue/review regressions.
3. Broken compatibility for legacy rows/identifiers.
4. RU/EN copy regresses into subscription-first active meaning.
5. Support rail behavior regresses (broken link, misleading pending state).
6. Unexpected coupling with unrelated core flows (reminders/history/workspace).

Rollback expectation:
- revert to last known stable docs + compatibility boundary behavior,
- stop rollout and re-open plan scope before retry.

## G) Current recommendation

Current recommendation: keep compatibility boundaries frozen and do not start Stage 1 yet.

Reason:
1. 24F and 24G already provide clear guardrails.
2. No documented high-signal trigger set currently proves urgent need.
3. Risk/benefit remains unfavorable for implementation now.

Next decision policy:
- reassess readiness only when go-triggers are explicitly evidenced and prerequisites are fully green.
