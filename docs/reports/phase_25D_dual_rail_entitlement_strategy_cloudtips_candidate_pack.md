# Phase 25D - Dual-Rail Entitlement Strategy + CloudTips Automation Candidate Pack

- Date: 2026-03-31
- Status: implemented (major dual-rail strategy wave), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_24A_soft_premium_multi_rail_foundation.md`
  - `docs/reports/phase_24D_optional_rail_activation_hardening.md`
  - `docs/reports/phase_25B_support_stack_consolidation_pack.md`
  - `docs/reports/phase_25C_donor_to_premium_automation_readiness_pack.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Runtime and operational surfaces:
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/premium-admin-console.tsx`
- `src/lib/config/client-env.ts`
- `src/lib/premium/admin-service.ts`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- `src/lib/premium/purchase-intent-repository.ts`
- `src/lib/premium/purchase-claim-repository.ts`
- `src/app/api/premium/purchase-intents/[intentId]/status/route.ts`
- `src/lib/i18n/localization.tsx`
- `src/app/globals.css` (validated no new style-system regression needed for this pass)

## 2) Remaining dual-rail friction found

1. Boosty and CloudTips were visible as separate rails but still too similar in post-click semantics for users.
2. Continuity tracking in 25C captured lifecycle (`opened_external` / `returned`) but did not reliably persist the concrete rail id.
3. Owner queue had continuity hints, but lacked explicit rail-aware labels for fast Boosty vs CloudTips decision context.
4. CloudTips could be interpreted as "more automatic" without enough explicit review-safe framing unless user reads deep helper text.

## 3) What changed in rail-specific user flow clarity

File: `src/components/app/profile-scenarios-placeholder.tsx`

1. Added explicit dual-rail snapshot semantics in Profile support block:
- `Primary path` and `Secondary path` lines
- rail guidance labels from runtime config
2. Expanded compact support-flow summary to rail-aware truth:
- Boosty = continuity + claim fallback
- CloudTips = automation-candidate path (still owner-review-safe)
3. Strengthened rail-card messaging:
- each configured rail now shows guidance label + next-step hint before CTA
- top block explicitly states no fake automatic activation
4. Added rail-specific open/return feedback:
- Boosty open/return copy remains continuity/claim-first
- CloudTips open/return copy explicitly says automation is not yet live and owner review remains active
5. Added latest-reference rail context visibility:
- `Last tracked rail path`
- rail-mode specific helper text when candidate path metadata is present
6. Added claim-status rail-context line:
- CloudTips candidate context vs Boosty continuity/manual context shown without changing claim business logic.

## 4) What changed in rail-specific owner/admin clarity

File: `src/components/app/premium-admin-console.tsx`

1. Added explicit rail-operational summary per claim from metadata:
- `CloudTips candidate path`
- `Boosty continuity path`
- `Legacy Boosty rail`
- `Rail context not tracked` fallback for old rows
2. Rail-operational summary is now visible in:
- queue summary pill lane
- decision-context pill lane
- explicit `Support rail context` line in expanded details
3. Owner hints now clearly separate:
- continuity lifecycle hints
- rail semantics hints
so owner can decide faster without adding a heavy admin redesign.

## 5) Safe rail-aware readiness seams added

Files:
- `src/lib/auth/client.ts`
- `src/app/api/premium/purchase-intents/[intentId]/status/route.ts`
- `src/lib/premium/purchase-intent-repository.ts`
- `src/lib/premium/purchase-claim-repository.ts`
- `src/lib/auth/types.ts`

Added seams:
1. Intent transition API now accepts optional `supportRailId` (`boosty` | `cloudtips`) in addition to existing compatibility fields.
2. Intent lifecycle metadata now stores rail-aware context:
- `last_client_support_rail_id`
- `last_client_support_rail_mode`
- `opened_external_support_rail_id` / `_mode`
- `returned_support_rail_id` / `_mode`
3. Claim submission now snapshots linked rail context into claim metadata:
- `linked_support_rail_id`
- `linked_support_rail_mode`
This gives future CloudTips-first verification experiments a safer boundary without changing current entitlement semantics.

## 6) What was intentionally not changed

1. No fake provider verification/webhook behavior added.
2. No bypass of owner review fallback.
3. No guarantee/claim of instant automatic activation.
4. No support-rail config model rewrite or DB migration.
5. No reminders/runtime productivity regressions (24I-25A untouched).
6. No compatibility-boundary cleanup work.

## 7) Risks / follow-ups

1. Rail-aware continuity remains client-driven intent metadata, not payment proof.
2. Older claim rows may show `Rail context not tracked` until new claim metadata accumulates.
3. Future CloudTips automation experiments should only consume these seams with explicit verified provider signals and rollback-safe gating.

## 8) Exact recommended next step

Run manual verification with `docs/reports/phase_25D_dual_rail_manual_checklist.md` in RU/EN on:
- Boosty configured + CloudTips pending
- Boosty configured + CloudTips configured
- mixed owner queue claims (with and without linked rail metadata)

If pass, freeze 25D as the dual-rail baseline and only start provider-verification implementation behind explicit safety gates and reversible fallback.

## 9) Concise manual verification notes

1. Profile support block: confirm Boosty continuity/manual truth vs CloudTips automation-candidate truth is visible and calm.
2. Open Boosty then return: verify continuity messages and claim next step remain manual-review-safe.
3. Open CloudTips then return: verify candidate wording appears but no automatic activation promise.
4. Submit claims from both rail paths: verify owner queue shows rail-operational context clearly.
5. Verify pending CloudTips state remains non-broken/honest when URL missing or duplicate.
6. Verify RU/EN parity for touched rail/continuity/admin strings.

