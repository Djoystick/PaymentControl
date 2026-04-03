# Phase 27A - Full Project Audit

- Date: 2026-04-03
- Status: implemented (audit/docs reset only), pending manual verification
- Pass type: planning/audit/documentation only (no new feature implementation)
- Main source-of-truth inputs:
  - repository runtime/schema state
  - `docs/reports/internal_version_history.md`
  - latest phase reports in `docs/reports` (especially 24I-26D)
  - latest anchors in `docs/anchors`

## 1) Scope and method

This pass intentionally focused on audit and roadmap reset only:
1. full audit of completed work,
2. full audit of remaining work,
3. creation of a new migration anchor for next-chat continuity.

No runtime behavior changes were implemented as part of 27A.

Working-tree note at audit time:
- repository already contained 26D runtime changes from the immediately previous phase pass;
- 27A itself introduced only docs/anchor/history updates.

## 2) What was inspected

Primary history and anchor inputs:
- `docs/reports/internal_version_history.md`
- `docs/anchors/payment_control_master_anchor_post_premium_removal.md`
- `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`

Latest active-phase reports:
- `docs/reports/phase_26A_premium_removal_donation_only_reset.md`
- `docs/reports/phase_26B_donation_only_ux_stabilization.md`
- `docs/reports/phase_26C_supporter_badge_foundation.md`
- `docs/reports/phase_26D_supporter_badge_management_convenience.md`

Runtime/schema evidence checks:
- API tree under `src/app/api/*`
- config and auth surfaces (`src/lib/config/*`, `src/lib/auth/*`)
- profile/supporter flows (`src/components/app/profile-scenarios-placeholder.tsx`, `src/lib/supporter/access.ts`, `src/app/api/supporters/badge/route.ts`, `src/lib/profile/repository.ts`)
- migration files:
  - `supabase/migrations/20260403120000_phase26a_premium_removal_donation_only_reset.sql`
  - `supabase/migrations/20260403183000_phase26c_supporter_badge_foundation.sql`

## 3) Completed-work audit (what is actually done)

### 3.1 Major product-truth pivots over time

1. Subscription-first and donor-to-premium periods existed historically (pre-26A lines).
2. 26A performed hard product reset:
   - Premium removed as runtime/system/DB concept.
   - donation-only support model became active truth.
3. 26B stabilized donation-only UX in Profile.
4. 26C introduced supporter badge as cosmetic recognition only (manual owner assignment).
5. 26D improved owner-side supporter badge management convenience while preserving the same product model.

### 3.2 Confirmed current-state runtime truth

Current codebase state aligns with post-premium direction:
1. No active `/api/premium/*` route group.
2. Donation rails are Boosty + CloudTips link rails only.
3. Supporter badge management is owner-only and keyed by numeric Telegram user id.
4. Supporter badge is displayed as recognition only and does not gate functionality.
5. Core app utility remains in reminders/history/workspace/payment flows.

### 3.3 Stable baselines that should not be reopened casually

Operationally stable lines:
1. Core payment/reminder operations (`Mark paid` / `Undo paid`, recurring flows, history).
2. Family/workspace foundations (create/switch/invite/accept).
3. Onboarding replay + first-run foundations.
4. Bug-report flow.
5. Donation-only support surface pattern (calm, compact, secondary).
6. Supporter badge semantics (recognition only, not access).

### 3.4 Historical/superseded branches

Superseded as active product direction:
1. Premium entitlement/claim/review activation flows.
2. donor-to-premium continuity/automation tracks.
3. subscription-first monetization positioning.
4. Premium admin queue as active runtime concept.

### 3.5 Previously planned directions that are no longer active

No longer active roadmap directions:
1. Any reopening of premium purchase claim lifecycle.
2. Any owner-review-as-access-gate feature model.
3. CloudTips verification/automation as active build target for access unlock.
4. Compatibility expansion around removed premium domain.

## 4) Manual verification and closure status snapshot

From latest source docs/history:
1. 26A - implemented, manual verification completed by user.
2. 26B - implemented, manual verification completed by user.
3. 26C - implemented, pending manual verification in report/history.
4. 26D - implemented, pending manual verification in report/history.

Audit conclusion:
- Active product baseline is stable for unrestricted donation-only operation.
- Remaining near-term closure debt is mostly manual verification and selective cleanup, not monetization rework.

## 5) Current debt that still matters (audit output)

### 5.1 Product/UX debt

1. 26C/26D manual verification closure still required.
2. Supporter badge owner workflow is improved but still manual by design; this is intentional, not a bug.

### 5.2 Technical debt

1. `src/lib/i18n/localization.tsx` still contains substantial historical premium-era dictionary residue not used in active runtime flow.
2. Test coverage exists but is narrow around selected utilities; critical profile/supporter flows are mostly verified via lint/build and manual QA.
3. Some compatibility-style legacy fallback patterns remain (intentional for safety), but should be periodically re-audited for necessity.

### 5.3 Operations/docs debt

1. Anchor landscape is fragmented across historical monetization pivots; requires a stronger post-27A migration anchor.
2. Manual checklists and closure state need consistent usage to prevent drift between implemented and verified phases.

## 6) What should be treated as frozen/parked

Freeze/park as non-active planning:
1. Premium restoration in any form.
2. Entitlement/access-gating models linked to donation/support.
3. donor-to-premium automation revival.
4. broad monetization-system redesign.
5. heavy UI redesign unrelated to current utility/supporter roadmap.

## 7) Practical conclusions from completed-work audit

1. The biggest domain shift (Premium removal) is already done and grounded in both runtime and schema.
2. Donation-only unrestricted model is now the durable core truth.
3. Supporter badge has a valid foundation and owner convenience layer, with manual closure debt remaining.
4. Future roadmap should prioritize reliability and small non-gating supporter improvements, not monetization complexity.

## 8) Validation

Executed in this pass:
- `npm run lint` - pass
- `npm run build` - pass
