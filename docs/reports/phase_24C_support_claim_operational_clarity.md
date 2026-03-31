# Phase 24C - Support Claim Operational Clarity

- Date: 2026-03-31
- Status: implemented (owner/admin wording + grouping clarity), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`

## 1) Scope and owner/admin files inspected

Inspected before edits:
- `src/components/app/premium-admin-console.tsx`
- `src/lib/premium/admin-service.ts`
- `src/app/api/premium/admin/route.ts`
- `src/app/api/premium/purchase-claims/route.ts`
- `src/lib/i18n/localization.tsx`

## 2) Operational clarity issues found

1. Owner queue still used purchase-first labels
- Headings/actions/helper text centered on `purchase confirmation` instead of support validation.

2. Current vs legacy context was present but framed with outdated terms
- Labels such as one-time purchase rail/path were still active in decision context.

3. Proof/reference labels were payment-first
- `Payment proof` / `purchase code` wording slowed owner decision flow in donor-support model.

4. Owner claim notification text was degraded and semantically stale
- Notification copy in `purchase-claims/route.ts` contained mojibake and purchase-first framing.

5. Owner-facing backend error strings were partially purchase-first
- Queue/review errors and foundation readiness text did not match support-validation truth.

## 3) Exact wording/label/grouping changes made

## 3.1 `src/components/app/premium-admin-console.tsx`

Rebased active owner claim surface to donor-support-first semantics:
- `Premium purchase claim review queue` -> `Support claim validation queue`
- Queue helper text -> manual support validation + Premium perk eligibility wording
- `Purchase confirmation approved/rejected` -> `Support validation approved/rejected`
- `Premium purchase confirmation` source labels -> `Validated support claim` (+ legacy variant)
- `One-time format` -> `Current format`
- `Purchase code` -> `Support reference code`
- `Current one-time claim path` -> `Current support validation path`
- `Legacy claim data` -> `Legacy claim context`
- `Expected package` -> `Expected perk package`
- `Purchase intent id` -> `Support intent id (legacy)`
- `Payment proof reference/text` -> `Support proof reference/text`
- `External payer handle` -> `External supporter handle`
- `Claim note` -> `Support note`
- Approve/reject buttons and helper text now explicitly describe manual support validation and no free-core regression.
- Empty state -> `No support claims yet.`
- Temporary owner verification helper renamed from purchase-claim wording to support-claim wording.

Grouping structure stayed compact and scan-first:
- summary row (status + identity + legacy/current marker + support reference)
- decision context
- submitted proof
- review metadata

## 3.2 `src/app/api/premium/purchase-claims/route.ts`

Owner notification copy rebuilt to short operational wording:
- removed mojibake text
- switched from purchase confirmation framing to support-claim review framing
- added explicit no-automation line: owner review required
- retained concrete fields (claim id, rail, expected tier, support reference, proof reference, workspace)
- updated review path line to support-claim queue naming

## 3.3 `src/lib/premium/admin-service.ts` and `src/app/api/premium/admin/route.ts`

Updated owner-facing error messages surfaced via admin UI:
- `Purchase claim was not found.` -> `Support claim was not found.`
- `Premium purchase claim foundation is not ready...` -> `Support claim foundation is not ready...`
- queue/review failure messages switched to support-claim wording
- entitlement failure messages aligned to support-validation context
- admin route foundation matcher now accepts both `purchase claim` and `support claim` text for safe compatibility

## 3.4 `src/lib/i18n/localization.tsx`

Added Phase 24C RU parity keys for all new owner-facing strings above, including:
- queue/action labels
- context/proof metadata labels
- temporary verification helper labels
- owner-facing backend error strings

## 4) Legacy context handling after 24C

Legacy compatibility remains visible but demoted:
- claim cards still detect legacy records and mark them as legacy context
- legacy rails/tiers remain readable for owner decisions
- active labels now clearly treat legacy as historical, not current truth

## 5) Owner notification wording

Changed.
- Owner Telegram notification is now operational, compact, and donor-support-first.
- It explicitly avoids automatic activation implications.

## 6) Intentionally not changed

- No schema/migration changes.
- No rail configuration/business logic changes.
- No automation/webhook/provider integration work.
- No changes to owner-only permission/security checks.
- No user-facing navigation redesign (24A/24B structure preserved).
- No changes to core reminders/history/family/payment behavior.

## 7) Risks and follow-ups

1. Internal type/table naming still uses historical `purchase_*` identifiers for compatibility; runtime owner wording is now rebased.
2. Future debt-min pass can selectively rename internal symbols where risk is low and migration path is explicit.

## 8) Validation

Executed:
- `npm run lint` - pass
- `npm run build` - pass

## 9) Manual verification notes (concise)

1. Open Profile -> Owner premium admin -> support claim queue, verify new labels in both RU and EN.
2. Submit a support claim and confirm owner notification text is readable and explicitly manual.
3. Approve/reject one queue item and verify success/error feedback uses support-validation wording.
4. Confirm legacy rows are still readable and marked as historical context.

## 10) Recommended next step

Phase 24D - Optional rail activation hardening:
- enable/verify CloudTips runtime slot once operational URL/policy is approved,
- keep owner-review fallback and non-automated truth explicit.