# Payment Control - Master Anchor After Premium Removal (Phase 26A)

- Date: 2026-04-03
- Supersedes as active product truth:
  - `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`

## 1) Source-of-truth order

When documents conflict, use this priority:
1. Latest explicit user instruction
2. This anchor
3. Latest phase reports and `docs/reports/internal_version_history.md`
4. Older anchors/reports (historical only)

## 2) Active product truth

Payment Control is fully unrestricted:
- no Premium plan
- no entitlement model
- no support-claim-to-premium model
- no owner review gate for paid activation
- no donor-to-premium automation direction in active runtime
- supporter badge is recognition-only and does not affect access

All core flows remain free and operational:
- reminders
- history
- recurring payment management
- family/workspace flows

## 3) Support model (active)

Support is donation-only and voluntary:
- Boosty donation rail
- CloudTips donation rail
- optional supporter badge recognition can be assigned manually by owner

Support does not unlock functionality.
No paywall or feature activation path exists.

## 4) UX rules after 26A

Profile support block must stay:
- secondary
- calm
- compact
- low-pressure

Disallowed in active UX:
- Premium wording/status
- claim lifecycle wording
- entitlement/source/scope wording
- owner validation for feature access

## 5) Database/runtime policy

Premium domain is removed from active runtime and schema.
Do not reintroduce hidden Premium paths, fallback claims, or dormant entitlement switches.

## 6) Roadmap (optional, not in active runtime)

Allowed future gratitude scope:
- one small gratitude/convenience feature for supporters

These are optional future items and must not recreate Premium/paywall semantics.

## 7) Historical status

The following line is historical/superseded as active truth:
- soft Premium donor-perk model from 24A-25J documents
- premium claim/admin/gift/campaign foundations
- donor-to-premium continuity/automation tracks

## 8) Working agreement for future passes

Future implementation should:
- preserve unrestricted core utility first
- keep support as donation-only
- avoid monetization complexity in daily user paths
- protect reminders/history/family stability
