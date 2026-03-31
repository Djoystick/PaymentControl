# Phase 25D Manual Checklist - Dual Rail (Boosty + CloudTips)

Use this checklist on a real runtime build (RU and EN). Keep notes short and operational.

## A) Boosty Path Truth

- [ ] Boosty is visibly primary in Profile support rails.
- [ ] Boosty card text reads as continuity/claim-first, not instant activation.
- [ ] Opening Boosty shows clear return-and-claim guidance.
- [ ] After return from Boosty, claim path is obvious and calm.

## B) CloudTips Path Truth

- [ ] CloudTips is visibly secondary and does not compete as storefront.
- [ ] CloudTips messaging reads as automation-candidate, not automation-complete.
- [ ] Opening CloudTips still leads to claim/review-safe next step.
- [ ] No wording promises guaranteed automatic Premium activation.

## C) Configured vs Pending Honesty

- [ ] With missing/invalid CloudTips URL, secondary rail stays pending and non-actionable.
- [ ] With duplicate Boosty/CloudTips URL, CloudTips stays pending with clear explanation.
- [ ] With valid CloudTips URL, secondary rail opens cleanly and keeps honest review wording.

## D) Support Reference + Claim Continuity

- [ ] Support reference remains easy to prepare/copy.
- [ ] Latest support reference shows tracked rail path when available.
- [ ] Claim form remains unchanged in core behavior and still requires proof fields.
- [ ] Claim status block includes clear rail-context next-step guidance.

## E) Owner/Admin Rail-Aware Queue Context

- [ ] Queue cards show explicit rail context labels (Boosty continuity / CloudTips candidate / fallback).
- [ ] Decision context includes both continuity hint and rail hint.
- [ ] Approve/reject behavior is unchanged and owner review remains required.

## F) RU/EN Parity

- [ ] All touched dual-rail messages are localized in RU.
- [ ] EN strings remain concise, calm, and non-storefront.

## G) Pass/Fail Notes Format

Use one line per failed item:
- `ID | Screen | Env | Expected | Actual | Severity | Follow-up`

Example:
- `C2 | Profile | CloudTips=duplicate | pending explanatory state | button looked active | medium | adjust pending card affordance`

