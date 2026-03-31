# Phase 24G - Versioned Compatibility Transition Plan

- Date: 2026-03-31
- Status: planning only (no implementation changes)
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Depends on:
  - `docs/specs/phase_24F_compatibility_boundary_map.md`
  - `docs/reports/phase_24F_compatibility_boundary_codification.md`

## A) Scope

### In scope

This plan covers eventual cleanup strategy for historical compatibility boundaries:
1. DB/schema names containing `premium_purchase_*`.
2. API route paths under `/api/premium/purchase-*`.
3. Wire error families `PREMIUM_PURCHASE_*`.
4. Admin action ids `list_purchase_claims` and `review_purchase_claim`.
5. Historical metadata keys (`linked_purchase_*`, `api_premium_purchase_claim_create`, related keys).
6. Legacy rail/source literals that remain for historical data readability (`boosty_premium`, entitlement source `boosty`).

### Explicitly out of scope in 24G

1. Runtime implementation changes.
2. DB migrations or schema renames.
3. API route/path changes.
4. Wire error/action-id removals.
5. Business logic changes in support claim flow.
6. UI redesign or copy redesign.

## B) Current preserved compatibility boundaries

Current contract remains intentionally frozen at boundary level:

1. DB/schema:
   - tables: `premium_purchase_claims`, `premium_purchase_intents`
   - columns: `purchase_intent_id`, `purchase_correlation_code`
2. API routes:
   - `/api/premium/purchase-claims`
   - `/api/premium/purchase-claims/mine`
   - `/api/premium/purchase-intents`
   - `/api/premium/purchase-intents/mine`
3. Wire errors:
   - `PREMIUM_PURCHASE_CLAIM_*`
   - `PREMIUM_PURCHASE_INTENT_*`
4. Admin action ids:
   - legacy: `list_purchase_claims`, `review_purchase_claim`
   - support aliases already accepted: `list_support_claims`, `review_support_claim`
5. Metadata keys/literals:
   - `api_premium_purchase_claim_create`
   - `linked_purchase_intent_id`, `linked_purchase_correlation_code`
6. Historical literals:
   - rails include `boosty_premium` for legacy rows
   - entitlement source `boosty` remains historical record

## C) Why direct rename is risky

Direct rename is unsafe because it can break multiple compatibility layers at once.

1. Old data rows:
   - legacy rows already persist historical literals, metadata keys, and rails.
   - naive rename can orphan historical interpretation logic.
2. Old admin/runtime paths:
   - route/action identifiers are consumed by current and possibly older clients.
   - hard switch may break owner review operations silently.
3. Existing contracts:
   - wire error ids are part of established client handling behavior.
   - replacing them without dual-contract period can break error UX/state handling.
4. Rollback complexity:
   - once schema/path changes are shipped, rollback may require data transforms.
   - partial rollback can leave mixed contracts in production.
5. Mixed historical docs/reports:
   - repository history still references purchase-era naming.
   - forced renames without clear mapping increase maintainer confusion.

## D) Proposed transition stages (versioned)

The project should use explicit contract versions for compatibility work.

### Stage 0 (already done): boundary codification and freeze
- phases: 24F + 24G
- outcome:
  - compatibility map exists,
  - transition plan exists,
  - no contract changes shipped.
- contract label: `compat-v1` (current runtime truth + historical boundary freeze).

### Stage 1 (future optional): additive alias contract
- goal: introduce support-first identifiers additively while preserving `compat-v1`.
- allowed examples:
  - additional support-first internal helpers,
  - explicit adapter layer for boundary translation.
- prohibited:
  - removing legacy identifiers.
- exit criteria:
  - all first-party internal consumers can operate via support-first aliases.

### Stage 2 (future optional): dual-contract read/response strategy
- goal: support both legacy and support-first external contracts where needed.
- possible techniques:
  - response alias fields (additive only),
  - parser acceptance for both action-id families.
- policy:
  - legacy contract remains default-safe until migration coverage is complete.
- exit criteria:
  - runtime/admin clients verified on new aliases without regressions.

### Stage 3 (future optional): controlled consumer migration
- migration order must follow Section H.
- observability/manual verification required for each moved consumer group.
- legacy paths remain available during migration window.

### Stage 4 (future optional): deprecation window
- publish explicit deprecation notice for legacy identifiers (internal docs first).
- keep rollback-ready toggles/adapters.
- do not delete legacy boundaries until deprecation window closes with clean telemetry/manual checks.

### Stage 5 (future optional): hard cleanup
- only if debt-removal value is proven greater than compatibility risk.
- requires:
  - approved migration package,
  - tested rollback procedure,
  - validated zero dependency on legacy identifiers.

## E) DB/schema transition strategy (planning only)

1. Preferred approach:
   - avoid direct table rename as first move.
   - introduce adapter-oriented access in repositories first.
2. Possible future paths:
   - path A (safer): keep physical table names; normalize semantic names only in code/docs.
   - path B (higher risk): new canonical support-first tables + compatibility views/adapters.
3. Backfill concerns (if path B chosen later):
   - correlation and claim linkage fields must remain intact.
   - metadata key translation must preserve auditability.
4. Rollback concerns:
   - any data-copy/backfill step must be reversible.
   - rollback plan must specify authoritative source table during dual operation.

Recommendation for DB boundary:
- prefer path A unless operational pain is significant.
- treat true physical rename as last-stage event only.

## F) API transition strategy (planning only)

1. Old route preservation policy:
   - preserve `/api/premium/purchase-*` until all consumers are migrated and verified.
2. Possible future support-first route family:
   - example candidate: `/api/premium/support-claims*` and `/api/premium/support-references*`.
3. Coexistence strategy:
   - dual-route adapters pointing to same service layer.
   - additive response parity checks to ensure identical business outcomes.
4. Deprecation signaling:
   - internal docs/version history first,
   - optional response header or metadata marker for legacy route usage.
5. Stability rule:
   - old routes remain stable during all migration stages before hard cleanup decision.

## G) Wire/error/action-id transition strategy (planning only)

1. Error code coexistence:
   - keep `PREMIUM_PURCHASE_*` as stable legacy contract during migration.
   - optional support-first aliases may be additive but must map deterministically.
2. Admin action-id coexistence:
   - continue accepting both legacy and support-first action ids.
   - remove legacy ids only in final cleanup stage (if ever).
3. Where aliasing is enough:
   - internal helper names, type aliases, admin action parsing.
4. Where contracts should remain frozen longer:
   - wire error codes and public route request/response envelopes.

## H) Consumer migration order (future implementation phases)

Safe order for future work:
1. Internal helper/type aliases (already largely done in 24E).
2. Owner/admin internal surfaces (`premium-admin-console`, admin client helpers).
3. Profile/runtime consumers (`profile-scenarios-placeholder`, runtime client wrappers).
4. Route internals and service adapters (without path/contract deletion).
5. External/public contract boundaries last (routes, wire errors, legacy action ids).

This order limits blast radius and keeps owner-review operations stable.

## I) Rollback criteria

Rollback should trigger if any of the following appears during future implementation stages:
1. support claim creation/read breaks for existing rows.
2. owner review queue cannot list/review claims reliably.
3. client behavior diverges between legacy and new aliases.
4. RU/EN runtime copy regresses into subscription-first meaning.
5. CloudTips/Boosty support rail behavior regresses from 24D truths.

Reversibility requirements:
1. additive changes first; avoid one-way destructive operations.
2. keep legacy parse/read paths until post-verification stability.
3. document precise rollback command/playbook per stage.

Too risky without stronger observability/manual checks:
1. physical DB renames,
2. route deletions,
3. wire error-id removals.

## J) Manual verification strategy for future implementation phases

For each migration stage, verify at minimum:

1. User support flow:
   - prepare support reference,
   - submit support claim,
   - read claim/reference statuses.
2. Owner review flow:
   - list queue,
   - approve/reject,
   - entitlement linkage behavior.
3. Legacy compatibility rows:
   - old `boosty_premium` and historical metadata remain interpretable.
4. RU/EN wording truth:
   - no active subscription-first regression.
5. Support rail behavior:
   - Boosty primary clarity,
   - CloudTips configured vs pending behavior unchanged.
6. Core app safety:
   - free-core flows unaffected.

## K) Recommendation

Deep cleanup should remain optional and deferred for now.

Reason:
1. current compatibility debt is controlled and documented.
2. active runtime truth is already support-first.
3. risk of contract breakage (DB/API/wire) is higher than immediate benefit.

Recommended near-term policy:
- keep compatibility boundaries frozen under `compat-v1`,
- only start Stage 1/2 if concrete maintenance pain or external contract needs justify it,
- require explicit approval before any Stage 4/5 work.
