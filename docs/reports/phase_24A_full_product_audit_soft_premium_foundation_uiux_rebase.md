# Phase 24A — Full Product Audit + Soft Premium Foundation + Navigation Simplification + UI/UX Rebase

- Date: 2026-03-31
- Status: implemented (runtime + docs), pending manual verification
- Main source of truth used: `docs/anchors/payment_control_master_anchor_post_monetization_pivot.md`
- Additional source-of-truth used:
  - `docs/reports/internal_version_history.md`
  - latest reports across phases 20B–20H, 21A–21B, 22A–22F, 23A–23D.1
  - active runtime codebase under `src/components/app/*`, `src/lib/config/*`, `src/lib/premium/*`

## 1) Pass objective

Execute one combined safe pass that:
1. audits current runtime product surfaces,
2. removes subscription-first truth from active UX,
3. rebases Premium into soft donor-based semantics,
4. simplifies navigation and high-frequency tab flows,
5. improves pre-click interactive affordance consistency,
6. consolidates shared UI system behavior,
7. resets project docs/anchor to new product truth.

## 2) Grounded audit diagnosis

### 2.1 Current navigation structure

Runtime shell remains 4-tab and maps to clear utility surfaces:
- Home: compact orientation + dashboard snapshot
- Reminders: main operational lane for recurring items and Mark paid / Undo paid
- History: recent activity verification lane
- Profile: context/settings/workspace + support/premium secondary controls

This baseline is preserved.

### 2.2 Overload and friction points found

Before this pass, key friction remained in Profile monetization UX:
- language still centered around buy/purchase flow instead of donor-support-first model,
- old purchase-shaped copy was visually heavy for a secondary area,
- support rail architecture was effectively single-rail in UX,
- CloudTips slot was not cleanly represented in runtime,
- some controls were clickable but did not consistently look interactive before click.

### 2.3 Duplicate/low-value content and heavy text

Audit findings:
- Home had extra helper noise above the main next step.
- History showed context blocks always expanded even when secondary.
- Profile included repeated explanatory copy in monetization block that increased cognitive load.

### 2.4 Remnants of old subscription-first monetization

Audit found remnants in active phrasing and flow assumptions:
- purchase-centric labels and handoff wording in Profile,
- user-facing wording that could still imply storefront-like behavior,
- historical subscription-era semantics still present in some legacy code paths and admin context.

Pass decision:
- keep historical code/data compatibility where needed,
- remove/demote old semantics from active user-facing runtime truth.

## 3) What was changed in runtime

## 3.1 Soft Premium foundation (user-facing)

In `src/components/app/profile-scenarios-placeholder.tsx`:
- premium/support section rebased to donor-perk language:
  - free-core remains explicitly useful,
  - baseline clarified as support-first with validated claim path,
  - no false auto-activation promises,
  - owner review remains explicit safe default.
- removed old buy-first emphasis from active UX block.
- support reference code model kept as helper for claim-review matching, not as fake automation.

## 3.2 Multi-rail support foundation

In `src/lib/config/client-env.ts` and Profile runtime:
- introduced config-driven support rails foundation (`supportRails`) with:
  - Boosty (primary),
  - CloudTips (secondary slot).
- prepared honest runtime behavior for unconfigured rails:
  - slot is visible as pending,
  - no broken links.
- preserved legacy compatibility key `supportProjectUrl` for old contexts.

## 3.3 Entitlement semantics cleanup

In `src/lib/premium/purchase-semantics.ts`:
- default expected tier rebased to donor-perk semantics: `support_bonus_30d`.
- frozen business constants introduced for this pass:
  - `SOFT_SUPPORT_MIN_AMOUNT_RUB = 100`
  - `SOFT_PREMIUM_ACCESS_DAYS = 30`

In Profile copy/state:
- active status language now aligns to support validation model.
- claim lifecycle hints now refer to support periods, not subscription framing.

## 3.4 Navigation and tab clarity simplification

In `src/components/app/app-shell.tsx`:
- 4-tab shell preserved.
- tab header now includes compact per-tab hint text.
- top bar noise reduced.
- bottom tab idle affordance strengthened (non-active tabs visibly interactive before tap).

In `src/components/app/landing-screen.tsx`:
- Home first screen simplified to single clear next action intent.
- reduced helper text noise.

In `src/components/app/payments-activity-section.tsx`:
- history context moved behind disclosure (`details`) to reduce initial scan load.

## 3.5 Interactive affordance pass

In `src/app/globals.css` and touched components:
- strengthened shared interactive primitives:
  - buttons (`pc-btn-primary/secondary/quiet`) now consistently show pointer/hover/active/focus/disabled behavior,
  - summary/disclosure triggers now visibly interactive in idle,
  - open state remains stronger than idle,
  - new shared primitives used across touched surfaces:
    - `pc-action-card`
    - `pc-input` / `pc-select` / `pc-textarea`
    - `pc-icon-btn`
    - `pc-kicker`.
- updated Help popover trigger/button to align with shared affordance system.
- applied form/control affordance improvements in Profile and Reminders.

## 3.6 Progressive disclosure and copy cleanup

- moved secondary history context under collapsible details.
- reduced static helper density in Home and Profile sections.
- preserved deep capability but moved secondary content out of first-read path.

## 4) Non-negotiable invariants preserved

Validated preserved behavior:
- 4-tab shell remains.
- Home / Reminders / History / Profile core utility routes preserved.
- recurring payment core flows preserved.
- Mark paid / Undo paid logic untouched.
- workspace switching/create/join preserved.
- personal/family baseline behavior preserved.
- onboarding replay + first-run architecture preserved.
- bug report flow preserved.
- safe help popover behavior preserved.
- strict title-only template autosuggest behavior preserved.
- RUB defaults preserved.
- cache/revalidation behavior preserved.
- honest viewport/scroll behavior preserved.

## 5) Legacy monetization handling

Kept as historical/inactive where needed:
- legacy purchase/subscription-shaped claim rails and admin/repository compatibility paths remain in code for backward safety.
- these legacy layers are demoted from active user-facing runtime truth.
- no destructive data cleanup was performed in this pass.

## 6) Applied design intelligence

### 6.1 UI/UX pro max principles applied (reasoning-only)

Applied to implementation:
- strong primary-vs-secondary hierarchy,
- reduced initial cognitive load on first screen,
- explicit interactive affordance in idle state,
- progressive disclosure for secondary diagnostics,
- coherent shared primitives for app-like rhythm.

No skill dependency was added to production.

### 6.2 Selective prompts-pattern principles applied

Applied principles:
- architecture audit before implementation,
- reusable shared primitives over one-off styling,
- mobile-first compact action lanes,
- accessibility-oriented control state visibility,
- composable UI blocks over ad-hoc duplicated surfaces.

Note:
- `prompts.chat` file is not present in current repo; principles were applied from established pattern intent, not by importing missing artifacts.

## 7) Validation

Executed:
- `npm run lint` (pass)
- `npm run build` (pass)

No dedicated automated UI test suite is configured in package scripts for touched client surfaces.

## 8) Risks and deferred follow-ups

1. Localization expansion:
- new/updated English copy keys in touched sections may need RU dictionary expansion for full parity polish.

2. Legacy semantic debt:
- admin/historical monetization internals still include legacy naming, intentionally retained for compatibility.

3. Optional next hardening:
- if a safe automation path is later introduced, keep owner-review fallback and explicit no-fake-automation language.

## 9) Result summary

Phase 24A successfully shifts active runtime truth from subscription-first/purchase-first emphasis to calm donor-support-first Premium foundation, while preserving free-core utility and simplifying high-frequency app navigation and interaction clarity.
