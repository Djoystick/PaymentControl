# Phase 25I - CloudTips Provider Trust Boundary Spec

- Date: 2026-04-01
- Type: planning/audit spec (no runtime implementation changes)
- Scope: define exact requirements for any future CloudTips-verified semi-automatic entitlement path
- Baseline to preserve: 25F simplified user support flow + 25H owner-assisted CloudTips triage

## A) Current Proven Baseline (Real and Safe Today)

### A.1 What is already real

1. External support rails are URL-based and config-driven (`boosty`, `cloudtips`) via client env.
2. Support reference intents are created server-side with correlation code (`PC-*`) and persisted in `premium_purchase_intents`.
3. Continuity lifecycle exists (`opened_external`, `returned`) and can be recorded through `/api/premium/purchase-intents/[intentId]/status`.
4. Support claims are submitted manually through `/api/premium/purchase-claims` with optional proof fields and optional linked support reference.
5. Owner/admin queue can read rail-aware metadata, continuity hints, and proof completeness.
6. Premium entitlement grant still occurs only on explicit owner approve decision in admin service.

### A.2 What is manual

1. User support proof submission is manual.
2. Owner validation and entitlement approval/rejection is manual.
3. CloudTips context currently improves triage only; it does not prove payment.

### A.3 What is owner-assisted

1. 25H rail-focused queue filters (`CloudTips candidate`, `Boosty continuity`, `manual fallback`, `legacy`).
2. Owner triage cues built from rail metadata + continuity + proof field completeness.
3. Faster queue ordering and scan flow for review decisions.

### A.4 What is continuity metadata only (not payment proof)

1. `opened_external` and `returned` transitions are operational continuity signals.
2. `linked_support_rail_id` / `linked_support_rail_mode` indicate context, not verified payment.
3. Client-return context and local continuation state are useful hints, not trust evidence.

## B) Required Provider-Trust Elements for Verified Semi-Automation

Any verified CloudTips path is allowed only if all required trust-boundary elements are available and testable.

### B.1 Provider auth/secret model

Required:
1. CloudTips server-to-server credential model (webhook signature secret and/or verified API token).
2. Secret rotation policy and overlap support.
3. Environment contract for secret storage (server-only, not `NEXT_PUBLIC_*`).

Missing today:
1. No CloudTips auth/secret fields in current server env contract.

### B.2 Callback/webhook or equivalent event source

Required:
1. Authoritative provider event stream with stable final payment event.
2. Event delivery retry behavior defined.
3. Event ordering caveats documented.

Missing today:
1. No CloudTips webhook/callback route in current runtime.

### B.3 Authenticity proof (signature verification or equivalent)

Required:
1. Verify signature using provider secret (or equivalent cryptographic authenticity check).
2. Reject unsigned/invalid-signature payloads.
3. Validate timestamp freshness window to reduce replay risk.

Missing today:
1. No CloudTips signature validation flow.

### B.4 Replay protection / idempotency

Required:
1. Stable provider event id (or transaction id) per payment signal.
2. Idempotent ingest policy (`processed` vs `duplicate`).
3. Durable replay guard persisted server-side.

Missing today:
1. No dedicated provider event ingestion ledger or idempotency guard for CloudTips events.

### B.5 Event-to-user mapping rule

Required:
1. Deterministic mapping chain from provider event to app profile.
2. Mapping confidence model:
   - strong match (safe),
   - ambiguous match (manual-only),
   - no match (manual-only).
3. Explicit rejection of weak identity-only hints (e.g., display name similarity).

Potential mapping candidates:
1. Correlation code embedded by user in support note/comment and returned by provider event payload.
2. Provider payer identity field that can be reliably linked to profile identity.
3. Amount/currency/time window as secondary constraints only (never sole key).

### B.6 Event-to-claim or event-to-intent linkage rule

Required:
1. Link verified provider event to an existing support intent or claim record.
2. Enforce one-to-one or controlled one-to-many policy (no accidental double grants).
3. Persist linkage metadata for audit and rollback.

Missing today:
1. No provider event object exists in data model to link to claim/intent.

### B.7 Rollback and operator override rules

Required:
1. Operator can freeze provider path quickly (feature gate hard stop).
2. Operator can revert incorrect entitlement grant.
3. Every semi-automatic decision must be auditable with source evidence.

Baseline compatibility:
1. Owner-review path from 25F/25H remains mandatory fallback regardless of provider state.

### B.8 Failure states and ambiguity handling

Mandatory behavior:
1. If authenticity fails -> ignore provider event; keep manual path.
2. If mapping is ambiguous -> do not auto-grant; send to owner queue with explicit ambiguity marker.
3. If duplicate/replay detected -> no duplicate entitlement action.
4. If provider outage/timeout -> no behavior change for user lane; manual claim path remains primary fallback.

## C) Telegram Mini App Implications

### C.1 What can safely happen in app

1. User can open external support rail.
2. User can prepare support reference.
3. User can return and submit claim with proof.
4. App can show status/hints that owner review remains required.

### C.2 What must stay server-side

1. Provider event ingestion.
2. Signature/authenticity verification.
3. Idempotency and replay protection.
4. Entitlement decision and grant/revoke.

### C.3 What must not depend on client-only assumptions

1. Client `opened_external`/`returned` events must not be treated as payment confirmation.
2. Local storage continuity tokens must never drive entitlement directly.
3. User-visible rail/open action must never imply verified provider completion.

## D) Safe Rollout Models

## Option 1 - Keep 25F/25H baseline frozen

- User complexity: lowest
- Owner complexity: moderate
- Risk: lowest
- Reversibility: high
- Trust: highest (no false automation assumptions)
- Fit: excellent

## Option 2 - Owner-assisted + verified-hint hybrid

- User complexity: low (unchanged lane)
- Owner complexity: lower than pure manual if verified hints are trustworthy
- Risk: medium
- Reversibility: high with feature gate
- Trust: good if hints are clearly non-binding
- Fit: strong transitional model

Notes:
1. Provider signal can enrich owner queue as "verified hint", but owner approval remains hard gate.

## Option 3 - Guarded provider-verified path behind strict feature gate

- User complexity: potentially low
- Owner complexity: lower for verified matches
- Risk: high if trust boundary is weak
- Reversibility: medium-high only if ledger + rollback controls exist
- Trust: acceptable only after full trust-boundary evidence
- Fit: conditional, not immediate

Gate requirement:
1. Not allowed before Section B requirements are fully satisfied and tested.

## Option 4 - Not feasible / defer completely

- User complexity: unchanged
- Owner complexity: unchanged
- Risk: lowest
- Reversibility: n/a
- Trust: highest
- Fit: valid if provider cannot supply required authenticity + mapping guarantees

## E) Exact Go / No-Go Criteria

Future verified implementation is allowed only with all `GO` conditions below.

### E.1 GO conditions (all required)

1. Provider authenticity:
   - documented signed event mechanism,
   - implemented signature verification with failure tests.
2. Idempotency:
   - stable event id available,
   - durable dedupe storage and replay tests.
3. Deterministic mapping:
   - documented event-to-profile rule,
   - ambiguity policy implemented (`manual only` on ambiguous).
4. Controlled entitlement path:
   - feature gate defaults OFF,
   - rollback and emergency freeze documented and tested.
5. Operational evidence:
   - manual test pack covering positive, negative, replay, and ambiguity cases,
   - owner queue still receives unresolved/ambiguous cases.
6. Product honesty:
   - user-facing copy remains no-fake-automation and owner-review-safe.

### E.2 NO-GO conditions (any one is enough to block)

1. No signed/authenticated provider event channel.
2. No durable idempotency/replay guard.
3. Mapping depends on weak heuristics only (name or loose amount/time).
4. No reversible rollback path.
5. User-facing messaging implies guaranteed auto-activation without proven verification.

## F) Recommendation

Current recommendation: **defer verified CloudTips automation implementation now and require targeted external provider research first**.

Rationale:
1. Current architecture is strong for owner-assisted triage (25H), but not yet a provider trust boundary.
2. Essential provider-trust elements (authentic signed events, idempotent ingest, deterministic mapping proof chain) are not present in current repo contracts.
3. Safest near-term path is to keep 25F user lane + 25H owner-assisted lane unchanged and only pursue guarded verified implementation after GO evidence is satisfied.

Immediate next planning step:
1. execute provider-specific integration research to confirm whether CloudTips can deliver required Section B evidence,
2. if evidence exists, design a strict feature-gated Option 2 (verified-hint hybrid) before any Option 3 entitlement automation.
