# Phase 25J - CloudTips Integration Readiness Checklist

- Purpose: owner-facing prerequisite checklist before any CloudTips verified implementation planning
- Scope: information and evidence collection only
- Important: no runtime implementation should start until all critical items are confirmed

## 1) Request From CloudTips (External Evidence)

Mark each line `Yes/No` and add source link/contact note.

| Item | Yes/No | Notes |
|---|---|---|
| Official webhook/callback docs received |  |  |
| Signature verification method documented |  |  |
| Stable event id for idempotency confirmed |  |  |
| Retry/duplicate behavior documented |  |  |
| Event ordering guarantees/limitations documented |  |  |
| Event schema with mapping-critical fields received |  |  |
| Can support reference code be carried in event payload? |  |  |
| Sandbox/test mode with signed events available |  |  |
| Provider ops/support contact confirmed |  |  |

## 2) Confirm What Cannot Be Guessed

These must be explicitly confirmed; assumptions are not acceptable.

1. Exact signature algorithm and canonicalization rules.
2. Which event status means "safe to treat as completed support".
3. Exact dedupe key semantics (event id vs transaction id vs both).
4. Whether event payload contains stable user/reference mapping anchors.
5. Whether late/reordered events are expected and how to handle them.

## 3) Internal Prep Requirements (No Runtime Implementation Yet)

| Item | Ready? | Notes |
|---|---|---|
| Draft server-only env key list approved |  |  |
| Draft feature-gate/kill-switch policy approved |  |  |
| Draft replay/idempotency design approved |  |  |
| Draft mapping decision tree approved |  |  |
| Draft fallback-to-owner policy approved |  |  |
| Draft rollback/revert operator runbook approved |  |  |
| Draft logging/audit expectation approved |  |  |

## 4) Entry Gate For Future Implementation Pass

A coding pass is allowed only if:
1. Section 1 critical evidence is complete.
2. Section 2 uncertainty items are explicitly resolved.
3. Section 3 internal prep is approved.
4. 25F user flow and 25H owner triage are confirmed as unchanged rollout baseline.

## 5) Hard Stop / No-Go

Stop and defer implementation if any are true:
1. Signature verification contract is missing or ambiguous.
2. No reliable idempotency identifier exists.
3. Mapping can only be heuristic/ambiguous.
4. No sandbox path for signed-event testing.
5. No rollback/freeze policy.

## 6) Output Format For Owner Notes

Use one line per unresolved blocker:
- `[Blocker] [Source missing/unclear] [Who owns follow-up] [Target date]`
