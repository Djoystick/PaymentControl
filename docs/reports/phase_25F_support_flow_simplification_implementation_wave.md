# Phase 25F - Support Flow Simplification Implementation Wave

- Date: 2026-03-31
- Status: implemented (major support-flow simplification wave), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_25B_support_stack_consolidation_pack.md`
  - `docs/reports/phase_25C_donor_to_premium_automation_readiness_pack.md`
  - `docs/reports/phase_25D_dual_rail_entitlement_strategy_cloudtips_candidate_pack.md`
  - `docs/reports/phase_25E_semi_automatic_donor_to_premium_strategy_audit.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Required runtime and support-stack surfaces:
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/premium-admin-console.tsx`
- `src/lib/config/client-env.ts`
- `src/lib/premium/admin-service.ts`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- support continuity/claim repositories:
  - `src/lib/premium/purchase-intent-repository.ts`
  - `src/lib/premium/purchase-claim-repository.ts`
- `src/lib/i18n/localization.tsx`
- `src/app/globals.css`

## 2) User-facing complexity removed

Removed from the first user lane:
1. Dense dual-rail snapshot + rail-strategy explanation cards in the top support path.
2. Rail-specific messaging branches (Boosty vs CloudTips) in primary open/return success feedback.
3. Rail-context text in claim status block that made normal next-step reading heavier.
4. CloudTips-specific return explainer in the active post-support block.

Result: user first path now centers on one obvious action lane and one compact fallback lane.

## 3) What changed in the main support path

File: `src/components/app/profile-scenarios-placeholder.tsx`

1. Added a single prominent main action card in Support/Premium:
- primary action opens external support via primary rail when configured,
- safe fallback action prepares support reference when primary rail is not configured.
2. Added `openMainSupportPath()` to centralize this behavior.
3. Main-path copy is now compact and operational:
- support externally,
- return,
- submit claim for owner review.

## 4) What changed in the fallback path

File: `src/components/app/profile-scenarios-placeholder.tsx`

1. Added `openFallbackClaimPath()` and wired it to:
- explicit "I already supported, submit claim" lane,
- post-support "Continue to claim" action,
- optional claim-open action in rail/reference details.
2. Fallback opens claim panel directly and opportunistically reuses/prepares support reference.
3. Fallback remains compact and non-bureaucratic.

## 5) What changed in the post-support path

File: `src/components/app/profile-scenarios-placeholder.tsx`

1. Simplified return success feedback to one calm message for both rails.
2. Kept continuity lifecycle behavior from 25C (`opened_external` / `returned`) unchanged.
3. Kept post-support card focused on immediate next action ("Continue to claim") instead of rail strategy explanation.

## 6) What internal rail-aware context was preserved

Preserved unchanged:
1. Rail-aware intent metadata and continuity state (`opened_external`, `returned`).
2. Rail-aware claim linkage context used by owner/admin queue from 25B-25D.
3. Owner review fallback semantics and manual validation truth.
4. Config-driven Boosty-primary / CloudTips-secondary rail model.

User-facing rail complexity was demoted into an optional rail details disclosure, not removed from internal operations.

## 7) What was intentionally not changed

1. No provider-side verification/webhook integration.
2. No automatic entitlement activation path.
3. No support/admin business model rewrite.
4. No compatibility-boundary cleanup.
5. No reminders/payment-management baseline changes from 24I-25A.
6. No DB migration.

## 8) Risks / follow-ups

1. The simplified user lane now hides more rail strategy by default; owner-facing operations remain unchanged, but manual QA should confirm users still discover optional rail details when needed.
2. If future real provider verification starts, keep first-path copy simple and avoid re-expanding rail semantics in the primary lane.

## 9) Exact recommended next step

Run targeted manual verification with:
- `docs/reports/phase_25F_support_flow_manual_checklist.md`

If pass, freeze 25F as the simplified semi-automatic baseline and only add deeper automation behavior behind proven rail-specific verification signals.

## 10) Concise manual verification notes

1. Confirm one clear primary support action is visible immediately.
2. Confirm compact fallback action ("I already supported...") is visible and opens claim quickly.
3. Confirm return-from-support path is straightforward and claim continuation is obvious.
4. Confirm support reference remains helpful but secondary (optional disclosure).
5. Confirm no copy promises automatic activation.
6. Confirm owner queue rail-aware context still appears and remains operational.
7. Confirm RU/EN parity for all touched runtime text.

## 11) Validation

- `npm run lint` - pass
- `npm run build` - pass
