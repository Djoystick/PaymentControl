# Phase 27B - Core Design System Hardening + Primary Surface Recomposition

- Date: 2026-04-03
- Status: implemented (major UI/UX system wave), pending manual verification
- Scope type: one cohesive runtime UI/UX recomposition wave (no product-model change)
- Source-of-truth baseline used:
  - `docs/anchors/payment_control_master_anchor_post_phase27A.md`
  - `docs/reports/phase_27A_full_project_audit.md`
  - `docs/reports/phase_27A_remaining_roadmap_reset.md`
  - `docs/reports/internal_version_history.md`

## 1) What Was Analyzed

Documents:
1. Post-27A anchor and 27A audit/roadmap reports for active product truth and frozen branches.

Primary UI runtime surfaces:
1. `src/app/globals.css`
2. `src/components/app/app-shell.tsx`
3. `src/components/app/landing-screen.tsx`
4. `src/components/app/payments-dashboard-section.tsx`
5. `src/components/app/recurring-payments-section.tsx`
6. `src/components/app/payments-activity-section.tsx`
7. `src/components/app/profile-scenarios-placeholder.tsx`
8. `src/components/app/help-popover.tsx`
9. `src/lib/i18n/localization.tsx` (for RU parity of new copy)

External design-intelligence reference:
1. `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`
2. Local skill instructions/scripts in `.codex/skills/ui-ux-pro-max/` were used to validate state clarity and mobile-first system patterns.

## 2) UI/UX Issues Found Before Changes

1. Shell/header/tabbar looked partially modernized but still relied on mixed one-off style recipes.
2. Home KPI blocks and segment cards had inconsistent visual grammar and active emphasis.
3. Reminders had strong functionality but mixed visual primitives (custom badges/chips/buttons/dialog wrappers).
4. History lacked the same section hierarchy rhythm used elsewhere.
5. Profile had local style islands (language/theme pills, white cards, mixed card grammars).
6. Modal/popover/check-row/chip patterns were not fully systematized across surfaces.

## 3) Why This System Approach

Chosen strategy:
1. Harden shared primitives first (`globals.css`), then recompose primary surfaces to those primitives.
2. Keep behavior intact; focus on hierarchy/state readability and interaction consistency.
3. Preserve mobile-first app-like feel with calm density and reduced visual noise.

This avoided a chaotic cosmetic pass and produced one cohesive wave across Home, Reminders, History, Profile, shell, modal, and popover layers.

## 4) Design-System Changes Applied

Core primitives expanded/normalized in `src/app/globals.css`:
1. Modal system:
   - `pc-modal-overlay`, `pc-modal-overlay-sheet`, `pc-modal-dialog`
   - `pc-modal-sheet-head`, `pc-modal-sheet-foot`
2. Popover system:
   - `pc-popover`
3. Compact semantic UI atoms:
   - `pc-chip`, `pc-chip-strong`
   - `pc-check-row`
4. KPI and state emphasis:
   - `pc-kpi-card-alert`
   - `pc-btn-primary-warning` for urgent action emphasis
5. Existing shell/tab/button/segment primitives were reused as the dominant grammar rather than local ad-hoc classes.

## 5) Primary Surfaces Recomposition

## 5.1 Home
Files:
1. `src/components/app/landing-screen.tsx`
2. `src/components/app/payments-dashboard-section.tsx` (compact variant)

Changes:
1. Unified section hierarchy (`pc-section-title` + `pc-section-subtitle`).
2. Rebuilt compact snapshot into consistent `pc-kpi-grid`/`pc-kpi-card` interaction model.
3. Clarified filter-state affordance with explicit pressed/active behavior and overdue visual alert lane.
4. Kept actions direct and mobile-first (`Open Reminders for actions` remains primary CTA).

## 5.2 Reminders
File:
1. `src/components/app/recurring-payments-section.tsx`

Changes:
1. Rebased modal presentation onto shared modal primitives (overlay/dialog/sticky head/sticky foot).
2. Replaced local popover styling in template suggestions with shared `pc-popover`.
3. Normalized filter/list-selection active states using segment grammar with explicit pressed/active semantics.
4. Introduced compact chips for action-now summary and card metadata to reduce noise.
5. Normalized inner card blocks and detail chips to shared surfaces/chips.
6. Kept overdue action button urgency via dedicated warning primary style without changing logic.
7. Advanced options and subscription insights summaries were aligned to shared summary grammar.

## 5.3 History
File:
1. `src/components/app/payments-activity-section.tsx`

Changes:
1. Aligned section heading/subtitle structure with Home/Reminders/Profile.
2. Rebased context summary toggle to shared summary-action grammar.
3. Increased feed-card rhythm consistency and preserved event readability.

## 5.4 Profile
File:
1. `src/components/app/profile-scenarios-placeholder.tsx`

Changes:
1. Unified screen stacks using shared spacing rhythm (`pc-screen-stack`).
2. Reworked language/theme switches into the same segmented grammar used in other surfaces.
3. Rebased remaining white-card islands to shared surface/state card primitives.
4. Kept donation block secondary/calm and reduced “storefront” feel by demoting donation card CTA visual pressure (`pc-btn-quiet` CTA style).
5. Preserved supporter badge semantics and owner badge-management behavior.

## 5.5 App Shell / Global Interaction
Files:
1. `src/components/app/app-shell.tsx`
2. `src/components/app/help-popover.tsx`

Changes:
1. Rebased shell frame/header/tabbar/tab buttons to dedicated shared shell primitives.
2. Unified onboarding overlay to shared modal system.
3. Help popover moved to shared popover primitive for consistent layer styling.

## 6) Interface States Strengthened

Across the updated surfaces, state readability was improved for:
1. default,
2. pressed/active,
3. open (details/modal/popover),
4. selected,
5. focused (`:focus-visible` consistency from shared primitives),
6. disabled,
7. loading,
8. success/error feedback.

No business-state semantics changed.

## 7) What Was Intentionally Not Changed

1. Product truth: unrestricted donation-only model (unchanged).
2. Premium/entitlement/claim/paywall model: not reintroduced.
3. Donation rails behavior: still plain support links (Boosty + CloudTips), no unlock semantics.
4. Core payment/family/workspace behavior and APIs: unchanged.
5. Database/migrations: no schema changes in this pass.

## 8) Risks / Regression Watchlist

1. Long-form Reminders modal on smaller devices:
   - verify sticky header/footer remain comfortable with keyboard open.
2. Segment-heavy control groups:
   - verify tap precision and no accidental filter toggles on low-end touch devices.
3. Profile owner tooling:
   - verify supporter-management cards remain readable in both RU and EN.
4. Dark theme contrast:
   - verify chips and KPI alert states remain clearly legible.

## 9) Concise Manual Verification Notes

Recommended manual checks:
1. Home:
   - compact KPI cards toggle correctly (`Total`, `Upcoming`, `Overdue`), filters are visually explicit.
2. Reminders:
   - add/edit modal opens/closes correctly, sticky head/foot remain usable.
   - mark paid/undo paid and overdue action styling remain correct.
3. History:
   - feed readability and context toggle behavior remain clear.
4. Profile:
   - language/theme segmented controls work and stay visually consistent.
   - donation block remains optional/secondary with no unlock messaging.
5. Supporter badge:
   - cosmetic badge display remains unchanged in meaning.

## 10) Validation

Executed:
1. `npm run lint` - pass
2. `npm run build` - pass

## 11) Self-Check Against Phase 27B Acceptance

1. Stronger design system: yes (expanded shared primitives + broad adoption).
2. More cohesive visual language: yes (shell/surfaces/components unified).
3. Clearer interaction states: yes (segment/tab/modal/popover/card state clarity improved).
4. Calmer modern app-like feel: yes (mobile-first, reduced visual noise, consistent hierarchy).
5. Core flows preserved: yes (no runtime business-logic/product-model changes).
