# Phase 24F - Compatibility Boundary Map

- Date: 2026-03-31
- Status: active maintainer map (no runtime behavior changes required)
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Companion report: `docs/reports/phase_24F_compatibility_boundary_codification.md`

## 1) Purpose

This document codifies the compatibility boundary between:
- current donor-support-first runtime truth, and
- historical `premium_purchase_*` storage/API/wire naming kept for compatibility.

It is a practical guardrail for future maintenance so safe cleanup can continue without accidental breakage.

## 2) A. Current runtime truth (active)

Active product/runtime meaning:
- users perform external voluntary support (not storefront purchase),
- app can prepare a support reference code,
- user submits a support claim with proof,
- owner reviews claim manually,
- Premium remains a soft perk granted after review,
- no automatic activation promises.

## 3) B. Historical compatibility boundaries (formal map)

| Active runtime concept | Historical DB/schema name | Historical API route/path | Historical wire/error/action identifier | Current intended meaning | Status | Why it still exists |
|---|---|---|---|---|---|---|
| Submit support claim | `premium_purchase_claims` table, `purchase_intent_id`, `purchase_correlation_code` columns | `POST /api/premium/purchase-claims` | Error codes `PREMIUM_PURCHASE_CLAIM_*` | Create support-claim record for owner review | compatibility-only | Existing DB schema + client contracts from Phase 22A |
| Prepare support reference | `premium_purchase_intents` table | `POST /api/premium/purchase-intents` | Error codes `PREMIUM_PURCHASE_INTENT_*` | Create support reference intent/code | compatibility-only | Existing DB schema + client contracts from Phase 22E |
| Read my support claims | `premium_purchase_claims` table | `POST /api/premium/purchase-claims/mine` | `PREMIUM_PURCHASE_CLAIM_READ_FAILED` | Show user claim status/history | compatibility-only | Stable route/error contract used by runtime client |
| Read my support references | `premium_purchase_intents` table | `POST /api/premium/purchase-intents/mine` | `PREMIUM_PURCHASE_INTENT_READ_FAILED` | Show latest support reference code(s) | compatibility-only | Stable route/error contract used by runtime client |
| Owner list support claims | `premium_purchase_claims` table | `POST /api/premium/admin` | Actions `list_purchase_claims` (legacy), `list_support_claims` (alias) | Load owner support-claim queue | active truth (with compatibility alias) | Legacy admin clients can keep working while new code uses support naming |
| Owner review support claim | `premium_purchase_claims` table + entitlement linkage | `POST /api/premium/admin` | Actions `review_purchase_claim` (legacy), `review_support_claim` (alias) | Approve/reject support claim safely | active truth (with compatibility alias) | Avoid breaking older action ids while supporting donor-support naming |
| Internal claim/reference payload types | n/a (type layer) | n/a | `PremiumPurchase*` type families + `Support*` aliases | Support-first semantics in runtime code, legacy names retained as base types | compatibility-only | Low-risk aliasing avoids broad type breaks |
| Rails semantics | claim/intents store rails as `one_time_premium` / `boosty_premium` | n/a | `PremiumPurchaseClaimRail` / `PremiumPurchaseIntentRail` | Current support rail + historical rail readability | compatibility-only | Existing persisted rows and validations depend on rail literals |
| Correlation linkage semantics | `purchase_correlation_code` and `purchase_intent_id` | carried through purchase-* routes | metadata keys include `linked_purchase_*`, `api_premium_purchase_claim_create` | Support reference linkage and audit trail | compatibility-only | Historical metadata/schema continuity for auditability |
| Route namespace `/api/premium/*` | n/a | `/api/premium/purchase-*` | n/a | Premium/support operational API area | compatibility-only | Renaming paths would be a contract break without versioning |
| Legacy boosty source in entitlement | `premium_entitlements.entitlement_source = "boosty"` | returned by entitlement/admin surfaces | source literal `"boosty"` | Historical entitlement source visibility only | historical record | Needed to interpret old grants/rows honestly |
| Current donor-support copy and UX | n/a | n/a | n/a | Calm support-first runtime wording | active truth | Product direction from anchor + phases 24A-24E |

## 4) C. Deferred deeper cleanup areas

Deferred on purpose (high-risk if done casually):

1. Renaming DB tables/columns from `premium_purchase_*` to `support_*`.
2. Renaming public API paths away from `/api/premium/purchase-*`.
3. Renaming wire error codes `PREMIUM_PURCHASE_*`.
4. Removing legacy admin action ids (`list_purchase_claims`, `review_purchase_claim`).
5. Rewriting historical metadata keys containing `purchase_*`.

All five require explicit migration/versioning strategy before implementation.

## 5) Safe vs risky touch guidance

Safe to touch in normal passes:
- support-first aliases (`Support*` types/helpers),
- user/admin copy and labels that already read support-first,
- internal comments clarifying compatibility boundaries.

Risky without a dedicated migration/versioning plan:
- route names, DB object names, wire error identifiers, and legacy action ids.

## 6) Compatibility boundary checkpoints (quick)

Before merging future cleanup in this area, verify:
1. old rows still read/write correctly,
2. existing API clients still receive expected error/action identifiers,
3. owner review flow remains manual and unchanged,
4. no subscription-first wording is restored as active runtime truth.
