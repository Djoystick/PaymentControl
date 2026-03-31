# Phase 25E - Semi-Automatic Donor-to-Premium Strategy

- Date: 2026-03-31
- Status: planning/audit only
- Scope: strategy definition only, no runtime/business/schema change
- Anchor priority: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`

## 1) Goal

Define the simplest realistic semi-automatic donor-to-premium direction that:
- keeps user flow low-friction,
- keeps product honesty explicit,
- preserves owner-review safety,
- avoids speculative provider automation claims.

## 2) Current mechanism (simplicity audit baseline)

Current practical flow (25B-25D baseline):
1. User chooses external support rail (Boosty primary, CloudTips secondary).
2. App prepares/links support reference intent.
3. App tracks return continuity (`opened_external` / `returned`) when possible.
4. User opens claim form and fills one or more proof fields.
5. Owner reviews claim and approves/rejects.

Main complexity pain from user perspective:
- rail semantics are now truthful but cognitively heavy in first path,
- support reference + continuity + proof fields can feel procedural,
- fallback path is safe but can feel bureaucratic for normal users.

Main complexity that is operationally useful but should stay internal:
- continuity stages and rail metadata,
- claim metadata enrichment,
- legacy/current context decoding,
- queue diagnostics and review hints.

## 3) Compared models

## A) Manual-heavy current model
- Path: support -> return -> claim -> owner review
- User complexity: medium-high
- Owner complexity: medium
- Implementation complexity: low (already implemented)
- Trust/transparency: high
- Future automation potential: medium (good data collection, weak UX simplicity)
- Fit with app philosophy: acceptable but heavier than desired

## B) Simplified semi-automatic model
- Path: support -> return -> prefilled continuation -> minimal confirmation -> owner quick validation
- User complexity: low-medium
- Owner complexity: low-medium (if queue quick validation is optimized)
- Implementation complexity: medium
- Trust/transparency: high (if "review still required" remains explicit)
- Future automation potential: high (clean transition point after return)
- Fit with app philosophy: strong

## C) Gift/code fallback model
- Path: support -> receive/use code -> activate in app
- User complexity: low (when code available), high variance operationally
- Owner complexity: medium-high (code issuance/ops/recovery)
- Implementation complexity: medium-high (lifecycle, abuse controls)
- Trust/transparency: medium (can be clear but often feels opaque)
- Future automation potential: low-medium
- Fit with app philosophy: weak as primary, acceptable as exception-only fallback

## D) Rail-aware internal model with simplified user surface
- Path (user): one simple support path + one fallback path
- Path (internal): rail-aware metadata, continuity, owner queue hints
- User complexity: low
- Owner complexity: low-medium
- Implementation complexity: medium
- Trust/transparency: high (simple user story, internal detail stays internal)
- Future automation potential: high (rail-specific experiments stay behind internal boundaries)
- Fit with app philosophy: strongest

## 4) Recommended model now

Recommended now: **Model D with B-style user flow**.

Meaning:
- user sees one primary simple path,
- app keeps rail-aware continuity and review context internally,
- owner still validates safely,
- future automation can be introduced rail-by-rail without user-facing complexity growth.

## 5) Simplification decisions

## 5.1 What should be simplified in user path

1. Keep one main path:
- `Support externally` -> `Return` -> `Confirm support and submit`
2. Keep one fallback path:
- `I already supported` -> manual proof submission
3. Deflate user-visible operational jargon:
- continuity internals and rail strategy notes should not dominate first path
4. Keep proof requirements minimal by default:
- one proof field minimum in primary lane, extra fields optional/secondary

## 5.2 What should remain internal/owner-only

1. Rail mode semantics (`continuity_claim_manual` vs `automation_candidate`).
2. Intent/claim continuity metadata details.
3. Legacy/current compatibility interpretation.
4. Owner queue diagnostics and decision hints.

## 5.3 Rails visibility recommendation

Keep both rails operationally, but **collapse user-facing complexity**:
- Boosty remains clear primary CTA.
- CloudTips remains available but secondary/de-emphasized.
- First-path copy should describe one simple donor flow, not two conceptual models.

Do not remove CloudTips. Do remove heavy dual-rail explanation from first interaction lane.

## 6) Boosty Telegram linking analysis

Boosty Telegram linking should be treated as:
- potential identity signal/hint,
- not payment proof,
- not entitlement trigger,
- not automatic activation mechanism.

Conclusion:
- material helper for owner confidence only when signal quality is good,
- not sufficient to change core review truth,
- should not pull product back into subscription-first assumptions.

## 7) Semi-automatic target shape (pragmatic)

Target "simple semi-automatic" shape:
1. User opens primary support path.
2. App silently prepares continuity/reference.
3. On return, app presents one focused confirmation step with prefilled context.
4. User submits minimal claim confirmation.
5. Owner receives quick-validation card with high-signal context first.
6. Approval remains manual unless future verified provider signal is proven safe.

## 8) Recommendation on roadmap priority

Yes, simplify immediately.

Next implementation wave should be a **support-flow simplification pass** (not provider integration), focused on:
- reducing user-facing steps and copy weight,
- preserving safety and honesty,
- keeping rail-aware logic mostly internal.

