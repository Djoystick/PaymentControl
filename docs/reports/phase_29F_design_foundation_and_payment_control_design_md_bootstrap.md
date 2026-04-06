# Phase 29F - Design Foundation + Project DESIGN.md Bootstrap

- Date: 2026-04-06
- Status: implemented (documentation-only design foundation pass)
- Scope: design/planning baseline for next UX/layout waves (no feature, schema, API, or navigation shell rewrite)
- Sources used:
  - `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
  - `docs/reports/internal_version_history.md`
  - accepted UX baseline reports: 29B, 29C, 29D
  - local skill `ui-ux-pro-max`
  - reference repository `VoltAgent/awesome-design-md`

## 1) Why This Pass Was Needed
After 29B/29C/29D, the project has a stronger UI baseline, but future UX waves needed a unified project-level design contract to avoid:
1. repeating ad-hoc cleanup decisions;
2. drifting between style experiments;
3. reintroducing surface overload and context collisions;
4. inconsistent component/layout behavior across tabs.

This pass intentionally creates design governance before the next implementation wave.

## 2) How `ui-ux-pro-max` Was Used
`ui-ux-pro-max` was used as the mandatory operational quality reference:
1. Skill instructions were reviewed before design work.
2. A `--design-system` run was executed to collect structured recommendations and anti-pattern reminders for fintech/mobile utility context.
3. High-value items were extracted as guardrails, not copied literally:
   - consistency and alignment discipline;
   - icon hygiene (single system, no emoji icons, no overflow);
   - interaction clarity and stable hover/focus behavior;
   - mobile breakpoints and readability checks;
   - pre-delivery quality checklist approach.
4. Brand-specific outputs from the generated preset were filtered against Payment Control baseline and product truth.

## 3) How `awesome-design-md` Was Analyzed
Repository was treated as a pattern library, not a brand template.

### 3.1 Patterns recognized as useful for Payment Control
1. Explicit design-rule documentation format (`theme -> typography -> components -> layout -> do/don't`) is practical for AI-assisted passes.
2. Strong do/don't guardrails reduce inconsistent visual decisions between iterations.
3. Tight typography and spacing rules improve scan speed in utility flows.
4. Clear component behavior rules (buttons/cards/chips/forms/navigation) are more valuable than pure visual mood boards.
5. Navigation and hierarchy guidance is more impactful than decorative styling in daily-use products.

### 3.2 Patterns intentionally NOT adopted directly
1. Brand-locked typography stacks (e.g., proprietary brand fonts) were not copied.
2. Brand color signatures and signature radii were not copied.
3. High-brand landing-page visual strategies were not prioritized for in-app utility surfaces.
4. Heavy decorative treatments and stylistic quirks were excluded when they reduce speed/clarity.
5. Any style recommendation conflicting with existing product truth or accepted runtime behavior was rejected.

## 4) Design Audit Snapshot (Current Project)
Short audit of current surfaces based on code + accepted reports.

### Home
1. Strength: action-first snapshot and better continuity from 29D/29E.
2. Remaining seam: helper/details patterns can still diverge across sections over time.

### Recurring
1. Strength: primary action and layered options are clearer than pre-29D.
2. Remaining seam: advanced controls and detail blocks still require strict restraint to avoid regrowth of vertical density.

### Travel
1. Strength: 29B isolation and 29C/29D cleanup established root vs selected-trip boundaries.
2. Remaining seam: selected-trip layers need strict hierarchy governance as features evolve.

### History
1. Strength: focus controls moved into secondary layer and empty-state actions are clearer.
2. Remaining seam: context/focus rows and reset affordances need one stable pattern with other tabs.

### Profile
1. Strength: secondary details already partially collapsed.
2. Remaining seam: profile remains the highest risk for text bloat and mixed-density stacks.

## 5) Main Output: `DESIGN.md`
Created root-level `DESIGN.md` as project design contract.

What it includes:
1. Product design intent for calm, app-like, daily utility behavior.
2. Core UX principles (single primary action, context isolation, progressive disclosure).
3. Visual direction (mobile-first rhythm, restrained emphasis, hierarchy first).
4. Typography and copy limits (no root-level text walls).
5. Color/semantic emphasis principles.
6. Component rules for buttons/cards/rows/chips/headers/context rows/forms/modals/segmented controls.
7. Layout rules for root/detail/secondary-layer structures.
8. Text restraint rules.
9. Navigation rules (Home as action hub, reset/return consistency, no duplicate entry points).
10. Concrete do/don't list.
11. Application guidance for future passes with baseline compatibility notes.

## 6) Design-Application Plan (Next Waves)
Recommended order for highest UX value after this foundation.

### Wave A (highest priority): Root Surface Brevity + First-Action Clarity
1. Tighten Home/Recurring/History/Profile root lanes to one unmistakable primary next step.
2. Remove residual persistent explanatory copy from root layer.
3. Normalize empty-state to "state + first action" pattern.

Expected gain: faster daily entry, lower cognitive overhead.

### Wave B: Form and Secondary-Action Layering
1. Move complex/rare actions to focused modal/sheet/secondary layers.
2. Keep create/edit flows single-purpose and short.
3. Normalize close/back behavior in secondary layers.

Expected gain: less action competition, fewer accidental context collisions.

### Wave C: Navigation Context Consistency
1. Standardize current-context marker and quick reset pattern where useful.
2. Harmonize return paths between root, detail, and secondary layers.
3. Keep Home routing predictable and action-first.

Expected gain: improved orientation and less navigation confusion.

### Wave D: Visual Rhythm Normalization
1. Final pass on card geometry, action row rhythm, icon+text baseline alignment.
2. Prevent icon duplication and overflow regressions.
3. Ensure consistent density between tabs.

Expected gain: mature, cohesive app feel without redesign churn.

## 7) What Was Intentionally NOT Changed
1. No runtime UI feature implementation in this pass.
2. No DB/schema/migration/API/domain logic changes.
3. No shell/tab architecture changes.
4. No bot-facing/manual Telegram profile setup changes.
5. No changes to language model from 29A/29A.1.

## 8) Files Created/Updated
1. `DESIGN.md` (new)
2. `docs/reports/phase_29F_design_foundation_and_payment_control_design_md_bootstrap.md` (new)
3. `docs/reports/internal_version_history.md` (updated)

## 9) Manual Notes and Risks
1. `DESIGN.md` must be treated as baseline constraint, not optional inspiration.
2. Future passes should avoid mixing implementation and large theory in one wave.
3. Risk: over-application of external references could dilute product identity; mitigation is explicit do/don't and product-truth constraints in `DESIGN.md`.
4. Risk: profile/help/admin surfaces can regrow text density; mitigation is enforced text restraint and secondary-layer policy.

## 10) Acceptance Self-Check
1. `ui-ux-pro-max` used as required reference - done.
2. `awesome-design-md` analyzed as pattern source, not copied - done.
3. Own `DESIGN.md` created in project root - done.
4. Focus remained on usability, structure, and clarity - done.
5. Baseline behavior/product truth preserved (no feature/domain changes) - done.
6. Future 2-4 practical UX/layout waves documented with priority order - done.
