# Phase 25C - Donor-to-Premium Automation Readiness Pack

- Date: 2026-03-31
- Status: implemented (major combined donor-to-premium readiness wave), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_24A_soft_premium_multi_rail_foundation.md`
  - `docs/reports/phase_24C_support_claim_operational_clarity.md`
  - `docs/reports/phase_24D_optional_rail_activation_hardening.md`
  - `docs/reports/phase_25A_reminders_productivity_pack.md`
  - `docs/reports/phase_25B_support_stack_consolidation_pack.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Required runtime/architecture surfaces:
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/premium-admin-console.tsx`
- `src/lib/config/client-env.ts`
- `src/lib/premium/admin-service.ts`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- support claim/reference repositories and route helpers:
  - `src/lib/premium/purchase-intent-repository.ts`
  - `src/lib/premium/purchase-claim-repository.ts`
  - `src/app/api/premium/purchase-intents/route.ts`
  - `src/app/api/premium/purchase-intents/mine/route.ts`
  - `src/app/api/premium/purchase-claims/route.ts`
- `src/lib/i18n/localization.tsx`
- `src/app/globals.css`

## 2) Remaining donor-to-premium friction found

1. Continuity gap between external support open and in-app return:
- app had reference creation and claim flow, but no explicit lifecycle marking for `opened_external` and `returned`.
2. External handoff context was not preserved explicitly:
- leaving app and coming back relied on user memory/manual steps.
3. Owner fallback still depended mostly on raw proof fields:
- linked reference existed, but claim-level continuity hints were limited.
4. Automation-readiness seams existed partially, but no explicit transition endpoint boundary for future provider-verified flow.

## 3) What changed in support intent/reference continuity

Files:
- `src/lib/premium/purchase-intent-repository.ts`
- `src/app/api/premium/purchase-intents/[intentId]/status/route.ts`
- `src/lib/auth/client.ts`
- `src/components/app/profile-scenarios-placeholder.tsx`

Implemented continuity seam:
1. Added intent lifecycle transition repository helper:
- `transitionSupportReferenceStatus(...)` (`opened_external` / `returned`),
- safe ownership checks (profile + telegram user),
- non-claimable status guard,
- transition metadata and timestamps.
2. Added runtime route for lifecycle transition:
- `POST /api/premium/purchase-intents/[intentId]/status`
- authenticated context required,
- no provider verification claims.
3. Added client API helper:
- `updateSupportReferenceIntentStatus(...)`.
4. Added support-return context persistence in Profile:
- local storage continuity token for rail + intent + reference code before external open,
- explicit return sync on app focus.

## 4) What changed in post-support user path

File: `src/components/app/profile-scenarios-placeholder.tsx`

1. Configured support rails now open through a continuity-aware handler:
- attempts to reuse/create support reference intent first,
- marks `opened_external`,
- opens external rail,
- communicates honest outcome.
2. Added primary quick path:
- `Prepare and open primary rail` from support reference area.
3. Added return-aware status block:
- `Post-support return` card,
- return sync state,
- quick `Continue to claim` path.
4. Claim flow remains explicit manual-review truth:
- no instant activation promise,
- no fake provider verification.

## 5) What changed in owner fallback efficiency

Files:
- `src/lib/premium/purchase-claim-repository.ts`
- `src/components/app/premium-admin-console.tsx`

1. Claim submission metadata now captures continuity snapshot when linked intent exists:
- linked intent status at submission,
- created/opened/returned timestamps,
- continuity stage (`prepared_only`, `opened_external_tracked`, `returned_tracked`).
2. Owner queue now surfaces continuity hints per claim:
- `Return tracked`,
- `External open tracked`,
- `Reference linked`,
- `Manual proof path`.
3. Decision context now includes compact continuity hint text for faster review.

## 6) Safe automation-readiness seams added

1. Intent lifecycle transition endpoint + repository boundary for future verified automation.
2. Explicit client continuity handoff (`opened_external` -> `returned`) with reversible/manual-safe fallback.
3. Claim metadata enrichment that future matching logic can consume without DB schema migration.

No webhook/provider API fake integration was introduced.

## 7) What was intentionally not changed

1. No bypass of owner review fallback.
2. No fake automatic premium activation claim.
3. No reminders baseline changes (24I-25A untouched).
4. No support rail hierarchy rollback from 25B.
5. No compatibility-boundary cleanup work.
6. No migrations.

## 8) Risks / follow-ups

1. Continuity transitions are client-driven signals; they improve operational readiness but are not payment verification proof.
2. Future provider-verified automation should consume these seams only with explicit, auditable verification inputs.
3. Optional next hardening: add owner filter chip for continuity stage (`return tracked` vs `manual proof path`) if queue volume grows.

## 9) Exact recommended next step

Run manual verification using `phase_25C_donor_to_premium_manual_checklist.md` in RU/EN with:
- primary rail open + return cycle,
- claim submission after tracked return,
- owner queue review of claims with and without linked continuity.

If pass, mark 25C manual-verified and freeze donor-to-premium readiness baseline before any real provider integration work.

## 10) Concise manual verification notes

1. Prepare support reference, open configured rail, return to app, verify return card and continuity messaging.
2. Submit claim after return and verify linked reference continuity appears in owner queue.
3. Verify manual fallback still works when continuity context is missing.
4. Verify no wording promises automatic activation.
5. Verify RU/EN parity for touched continuity and owner hint strings.

## 11) Validation

- `npm run lint` - pass
- `npm run build` - pass
