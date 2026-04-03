# Phase 27A - Remaining Roadmap Reset

- Date: 2026-04-03
- Status: implemented (roadmap reset docs), pending manual verification
- Scope: remaining-work audit + active roadmap reset for next-chat continuity
- Product truth baseline:
  - unrestricted app utility for all users
  - donation-only support model (Boosty + CloudTips rails)
  - no Premium/entitlement/claim-to-unlock model
  - supporter badge is cosmetic recognition only

## 1) Remaining-work audit (what is actually left)

### 1.1 Real remaining product work

1. Close 26C/26D manual verification loops in real device/runtime context.
2. Build one small supporter gratitude/convenience feature (non-gating), as already allowed by current anchor truth.
3. Keep supporter management practical and safe without growing into admin CRM complexity.

### 1.2 Real remaining UX debt

1. Preserve calm donation/support presentation while avoiding copy drift back to monetization language.
2. Keep owner supporter tools understandable with minimal noise.
3. Avoid reopening large Profile redesign; only narrow value-driven adjustments should proceed.

### 1.3 Real remaining technical debt that matters

1. i18n legacy residue cleanup:
   - remove only unreachable premium-era keys after usage audit.
2. Confidence hardening for supporter/donation surfaces:
   - add targeted tests around supporter owner lookup/manage contract and key validation paths.
3. Operational configuration clarity:
   - keep owner allowlist setup and donation URL setup explicit and verifiable.

### 1.4 What should stay active roadmap

1. Supporter-recognition line (manual, non-gating) - active.
2. Small gratitude/convenience addition (non-gating) - active, but after 26C/26D closure checks.
3. Runtime quality hardening and legacy cleanup for maintainability - active.

### 1.5 What should be frozen/parked

Freeze as non-active backlog:
1. Premium restoration in any runtime/domain/DB form.
2. donor-to-premium automation branches.
3. claim/review/entitlement flows for access unlock.
4. CloudTips verification automation tracks for entitlement outcomes.
5. broad monetization re-architecture or storefront-like UX expansion.

### 1.6 What no longer makes sense to keep in active planning

Remove from active planning queue:
1. legacy Premium compatibility-transition tracks (24F/24G-style direction) as forward product strategy.
2. any roadmap that assumes paid activation gate or tier unlock.
3. any owner queue roadmap tied to access decisions.

## 2) Fresh active roadmap (major waves only)

## Wave 1 - Post-26C/26D Closure and Reliability Baseline (next)

- Priority: P0
- Readiness: ready now
- Blockers: none
- Goals:
  1. complete manual verification for 26C and 26D with existing checklists,
  2. record verified closure status in docs/history,
  3. lock supporter-badge recognition semantics as stable baseline.
- Output:
  - verified status updates,
  - explicit "do not reopen" notes for settled supporter-management scope.

## Wave 2 - Supporter Gratitude Feature (small, non-gating)

- Priority: P1
- Readiness: ready after Wave 1 closure
- Blockers:
  - product copy decision for one minimal gratitude/convenience behavior
- Goals:
  1. implement exactly one small gratitude feature for supporters,
  2. keep zero access gating and zero entitlement semantics,
  3. maintain calm profile hierarchy.
- Output:
  - one limited feature with RU/EN parity and clear non-unlock wording.

## Wave 3 - Donation/Support Runtime Hardening and Legacy Cleanup

- Priority: P1
- Readiness: partially ready now
- Blockers:
  - safe key-usage mapping for i18n cleanup
- Goals:
  1. narrow i18n usage audit and removal of unreachable premium-era strings,
  2. add targeted tests for supporter management and donation-support contracts,
  3. preserve existing runtime behavior while reducing maintenance noise.
- Output:
  - smaller active dictionary surface,
  - higher confidence in owner/supporter flow safety.

## Wave 4 - Operational Quality and Handoff Discipline

- Priority: P2
- Readiness: ready now
- Blockers: none
- Goals:
  1. standardize manual verification closure routine for future phases,
  2. keep anchors/history synchronized to avoid truth drift in new chats,
  3. keep release checks practical (lint/build/manual checklist).
- Output:
  - predictable pass closure quality,
  - lower risk of roadmap divergence.

## 3) Supporter badge placement in roadmap

Supporter badge position after 27A:
1. Foundation is implemented (26C), convenience layer is implemented (26D), manual closure is pending.
2. Badge remains recognition-only and manual-owner-managed by numeric Telegram user id.
3. Next evolution is limited to one small gratitude feature, not access logic.

## 4) Explicit non-roadmap list (do not work on)

Do not schedule as active waves:
1. Premium comeback (naming or behavior).
2. Donation-to-access automation or owner entitlement gating.
3. New monetization stacks, subscriptions, or claims.
4. Heavy profile/admin redesign beyond narrow supporter utility.
5. DB migrations for monetization/domain resurrection.

## 5) Next major wave after 27A

Next major wave: **Wave 1 - Post-26C/26D Closure and Reliability Baseline**.

Reason:
1. It closes current verification debt before new feature scope.
2. It stabilizes supporter-recognition truth for clean continuation.
3. It keeps roadmap progression practical and low risk.

## 6) Validation

Executed in this pass:
- `npm run lint` - pass
- `npm run build` - pass
