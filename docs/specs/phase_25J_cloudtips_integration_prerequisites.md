# Phase 25J - CloudTips Integration Prerequisites

- Date: 2026-04-01
- Type: planning / ops-readiness spec
- Scope: define exact prerequisites before any CloudTips-verified semi-automatic implementation
- Runtime status: no implementation in this pass
- Baseline to preserve: 25F user-facing simplified support flow + 25H owner-assisted triage

## 1) Purpose

Turn Phase 25I trust-boundary conclusions into a practical prerequisite package:
1. External provider evidence required from CloudTips.
2. Internal app/server prerequisites required before coding.
3. Guarded implementation entry criteria.
4. Explicit no-go conditions.

## A) External / Provider Prerequisites

All items below are mandatory evidence inputs for any verified path.

## A.1 Provider auth and secret model

Required:
1. Official auth scheme for inbound events (webhook signing secret or equivalent).
2. Secret rotation policy and overlap behavior.
3. Secret scope (per account / per project / global).

Unknown today:
1. No confirmed CloudTips secret model in project docs.

## A.2 Event delivery contract (webhook/callback or equivalent)

Required:
1. Delivery mechanism documentation.
2. Event timing model:
   - pending vs settled vs failed events,
   - retry windows and order guarantees.
3. Event schema with field-level meaning.

Unknown today:
1. No confirmed authoritative event shape in current package.

## A.3 Signature verification method

Required:
1. Exact signing algorithm.
2. Canonical payload/signing base string format.
3. Timestamp skew policy.
4. Signature failure examples from provider docs.

Unknown today:
1. No verified signature method documented for CloudTips in current package.

## A.4 Idempotency / replay identifiers

Required:
1. Stable unique event id or transaction id from provider.
2. Guidance for duplicate deliveries.
3. Guidance for late or reordered deliveries.

Unknown today:
1. No guaranteed dedupe identifier captured in current package.

## A.5 Mapping-critical event fields

Required:
1. Fields that can safely link event to app user/support reference.
2. Whether custom note/reference from payer is available in event.
3. Currency/amount precision and final-settlement indicators.
4. Field stability guarantees (can values change after initial event?).

Unknown today:
1. No confirmed low-risk mapping field set for deterministic event->user linkage.

## A.6 Sandbox and operational dependency

Required:
1. Sandbox/test mode with signed test events.
2. Reliable provider support/contact path for integration questions.
3. Incident-response expectations (provider outage/partial delivery semantics).

Unknown today:
1. No validated CloudTips sandbox/ops contact contract recorded in project docs.

## B) Internal Application Prerequisites

These are required internal boundaries before verified coding is allowed.

## B.1 Safe server env contract

Prerequisite keys (server-only, not `NEXT_PUBLIC_*`):
1. `CLOUDTIPS_WEBHOOK_SECRET` (or equivalent provider auth secret).
2. `CLOUDTIPS_API_KEY` / `CLOUDTIPS_ACCOUNT_ID` (only if provider API lookup is needed).
3. `CLOUDTIPS_WEBHOOK_ENABLED` feature flag default `false`.
4. `CLOUDTIPS_VERIFIED_MATCH_ENABLED` feature flag default `false`.
5. `CLOUDTIPS_STRICT_MODE` optional kill-switch profile for rollout.

Status today:
1. Not present in current `server-env` contract.

## B.2 Event ingestion boundary

Required:
1. Dedicated server endpoint for provider events.
2. Early auth/signature gate before business parsing.
3. Structured parse/validation layer.

Status today:
1. Missing by design (not implemented yet).

## B.3 Replay protection boundary

Required:
1. Durable dedupe store for provider event ids.
2. Idempotent processor semantics (`new`, `duplicate`, `ignored`).
3. Explicit replay policy tests.

Status today:
1. Missing.

## B.4 Mapping boundary

Required:
1. Deterministic mapping rule from provider event to profile + support intent/claim.
2. Ambiguity state routing to owner triage queue.
3. Strict no-auto-grant on weak mapping.

Status today:
1. Not implemented; current rail/continuity metadata is owner-assist only.

## B.5 Fallback-to-owner boundary

Required:
1. Manual owner review remains default and guaranteed fallback.
2. Any unverified/ambiguous event path must remain owner-only decision.
3. No automatic entitlement grant on partial signals.

Status today:
1. Already satisfied by 25F + 25H + current admin approval gate.

## B.6 Rollback/freeze boundary

Required:
1. Feature-gate off switch for provider path.
2. Operator procedure to freeze new verified processing.
3. Reversal path for incorrect entitlement grants.

Status today:
1. Conceptually required, not implemented.

## B.7 Logging and audit expectations

Required:
1. Structured audit log for event ingest, validation result, mapping result, and final decision route.
2. Correlation ids linking provider event, support intent, support claim, and entitlement action.
3. Privacy-safe logging policy (avoid storing sensitive payload fields unnecessarily).

Status today:
1. Not implemented for provider events (no provider event path yet).

## C) Minimal Evidence Package Required from CloudTips Before Coding

The project owner/team must obtain all items below first:
1. Official documentation for webhook/callback event delivery.
2. Official signature verification documentation with examples.
3. Confirmed stable event id / transaction id for idempotency.
4. Event payload schema including fields needed for user/reference mapping.
5. Clarification whether user-entered support reference code can be echoed in event payload.
6. Sandbox credentials and reproducible signed test event workflow.
7. Provider support contact route for edge-case resolution.
8. Explicit provider statement on retries, duplicates, and event ordering guarantees.

If any item above is unavailable or vague, implementation must remain blocked.

## D) Guarded Implementation Entry Criteria

A future coding pass may start only if all are true:
1. External evidence package in Section C is complete and reviewed.
2. Mapping strategy is deterministic and ambiguity-safe.
3. Replay/idempotency strategy is designed and review-approved.
4. Feature gates and kill switch policy are approved.
5. Owner fallback behavior is explicitly preserved.
6. User-facing 25F flow remains unchanged in first verified rollout.
7. 25H owner triage remains active for unresolved/ambiguous cases.

## E) No-Go Criteria

Do not implement verified automation if any condition is true:
1. No signed event authenticity contract from provider.
2. No stable idempotency identifier in event data.
3. Mapping depends on weak heuristics only (display name, loose amount/time).
4. No sandbox/test event path with reproducible signed payload checks.
5. No operational freeze/rollback plan.
6. Any proposal that weakens owner-review-safe fallback.

## 2) What Can Be Safely Prepared Now (Without Verification Implementation)

Allowed preparation:
1. Documentation and checklists (this phase).
2. Draft server env contract proposal (not activated in runtime yet).
3. Test-plan template for signature/idempotency/mapping edge cases.
4. Owner runbook draft for freeze/revert procedures.

Not allowed in this phase:
1. Webhook/callback runtime endpoints.
2. Signature verification code paths.
3. Automatic entitlement actions.
4. UI claims implying verified automation is live.

## 3) Recommendation

Current recommendation: **remain on 25F + 25H baseline and execute external provider evidence collection first**.

Only after evidence completion should the roadmap consider a guarded implementation planning pass.
