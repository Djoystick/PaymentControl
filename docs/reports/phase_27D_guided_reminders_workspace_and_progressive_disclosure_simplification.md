# Phase 27D - Guided Reminders Workspace + Progressive Disclosure Simplification

- Date: 2026-04-04
- Status: implemented (major Reminders/composer UX wave), manual verification completed by user (release-line accepted)
- Scope type: focused core-utility UX wave on top of accepted 27B visual baseline and 27C action-first continuity
- Source-of-truth baseline:
  1. `docs/anchors/payment_control_master_anchor_post_phase27A.md`
  2. `docs/reports/phase_27A_full_project_audit.md`
  3. `docs/reports/phase_27A_remaining_roadmap_reset.md`
  4. `docs/reports/phase_27B_core_design_system_hardening_and_primary_surface_recomposition.md`
  5. `docs/reports/phase_27C_action_first_workflow_compression_and_cross_surface_navigation_clarity.md`
  6. `docs/reports/internal_version_history.md`

## 1) What Was Analyzed

Primary runtime surfaces:
1. `src/components/app/recurring-payments-section.tsx`
2. `src/lib/i18n/localization.tsx`
3. existing global visual system (`src/app/globals.css`) was reviewed for reuse (no direct style-system overhaul)

Post-27B/27C behavioral context reviewed:
1. Reminders action lane and filters
2. payment create/edit composer modal structure
3. payment card information hierarchy and action lane
4. focus/no-results recovery states inside Reminders

Reference usage:
1. `ui-ux-pro-max` skill was used as design-intelligence source.
2. Skill executable search script was not runnable in this environment (file access error), so guidance was applied from local skill data files (`ux-guidelines.csv`, `styles.csv`, stack notes) for progressive disclosure, state clarity, and mobile action-first flow.

## 2) UX Problems Found (Post-27B/27C)

1. Reminders still had toolbox feel in daily usage: too many competing controls at once.
2. Composer footer had too many concurrent actions (`save`, `close`, `save template`, `clear`) during the primary add/edit decision.
3. Advanced options were functionally collapsed but still lacked strong summary cues, so simple-vs-advanced separation felt weaker than intended.
4. Payment cards required extra vertical scanning (status + due + cadence + cycle text blocks) before reaching the action lane.
5. View/focus summary line in Reminders was verbose and less readable than needed for short sessions.

## 3) Why This Progressive-Disclosure Approach

Chosen approach:
1. Keep 27B design language and 27C navigation continuity intact.
2. Make Reminders read as one guided workspace: one clear primary action, one clear action-now shortcut, and quieter secondary controls.
3. Make composer explicitly simple-first:
   - core fields/front actions visible immediately,
   - advanced settings remain available but quieter,
   - template/clear utilities moved out of primary decision lane.
4. Increase card scan speed by surfacing title + amount + due meaning + status in the first visual pass and keeping detail metadata in a secondary layer.

This reduced cognitive load without changing business logic or product model.

## 4) What Changed in Reminders Surface

File:
1. `src/components/app/recurring-payments-section.tsx`

Changes:
1. Reworked Reminders top action lane:
   - kept primary `Add payment` action dominant,
   - retained explicit `Action now` control,
   - added direct `Upcoming` quick focus toggle,
   - moved `Refresh section` to a quieter top-right control.
2. Reduced secondary guidance noise:
   - removed one extra quick-help block in the main lane,
   - kept compact status chips (`Due today`, `Overdue`, `Active`, `Action now`).
3. Simplified list summary copy:
   - replaced `Visible / In list / Total` pattern with one compact sentence.

## 5) What Changed in Payment Composer

File:
1. `src/components/app/recurring-payments-section.tsx`

Changes:
1. Added explicit core-flow guidance card directly under modal header:
   - form mode (`Add` vs `Edit`),
   - quick type/cadence snapshot.
2. Kept core fields front-loaded (title, amount, cadence, due day, responsible payer in family mode).
3. Tightened template quick lane:
   - removed extra explanatory line,
   - preserved fast template tap path + manual override.
4. Strengthened advanced section summary:
   - visible chips for reminder state, category, currency.
5. Moved non-primary actions into advanced layer:
   - `Save as template` and create-only `Clear form` are now advanced utilities,
   - footer now focuses on primary save + close/cancel only.

Result: create/edit flow starts cleaner and supports quick add without losing advanced flexibility.

## 6) What Changed in Payment Cards

File:
1. `src/components/app/recurring-payments-section.tsx`

Changes:
1. Rebuilt card first-screen hierarchy for faster scan:
   - top row now emphasizes title + amount + due meaning (or next due date when paid).
2. Consolidated status lane:
   - paid/unpaid + overdue/due-today/upcoming + cadence chip are visible together.
3. Shared-context lines compressed:
   - `Who pays` and `Paid by` now appear in one concise line when relevant.
4. Kept economics hints visible but quieter and conditional.
5. Preserved `Details and actions` as secondary disclosure for metadata, reminder settings, notes, and template/subscription utilities.
6. Rebuilt action lane as clearer progression:
   - full-width primary `Mark paid / Undo paid`,
   - secondary `Edit`,
   - destructive `Delete`.

No core payment action was removed.

## 7) What Was Intentionally Not Changed

1. Product truth: unrestricted donation-only model (unchanged).
2. Premium/entitlement/claim/unlock/paywall logic: not reintroduced.
3. DB schema/migrations and API contracts: unchanged.
4. Home/History/Profile major redesign: not in this pass scope.
5. Core payment operations and family/workspace flows: preserved.

## 8) Localization / RU-EN Parity

File:
1. `src/lib/i18n/localization.tsx`

Added RU entries for newly introduced strings:
1. `Currency`
2. `Showing {visible} of {inList} cards ({total} active total).`

No existing RU strings were removed.

## 9) Risks / Regression Watchlist

1. Reminders top-lane toggles:
   - verify `Action now` / `Upcoming` toggles feel clear and do not conflict with existing focus context.
2. Composer advanced utilities:
   - verify users still discover `Save as template` and `Clear form` naturally inside advanced layer.
3. Card scan/action balance:
   - verify compressed status line remains readable on narrow screens.
4. Shared-flow wording:
   - verify `Who pays • Paid by` concatenation remains clear in RU and EN.

## 10) Concise Manual Verification Notes

1. Reminders:
   - open section and verify quick lane (`Add`, `Action now`, `Upcoming`, quiet refresh).
   - switch list/focus segments and verify compact summary line updates.
2. Composer:
   - create flow: confirm only save + close in footer and advanced utilities inside advanced section.
   - edit flow: verify behavior parity with create flow and discard confirmation still works.
3. Cards:
   - confirm first-pass readability (title/amount/due/status) and action order.
   - verify `Mark paid / Undo paid`, `Edit`, `Delete` behavior unchanged.
4. Shared mode:
   - verify `Who pays` and `Paid by` text remains correct.

## 11) Validation

Executed:
1. `npm run lint` - pass
2. `npm run build` - pass

## 12) Self-Check Against Phase 27D Acceptance

1. Calmer and clearer Reminders workspace: yes.
2. Faster create/edit flow with stronger simple-first structure: yes.
3. Progressive disclosure strengthened (advanced utilities quieter): yes.
4. Faster card scan-speed and clearer action lane: yes.
5. Cognitive noise reduced without removing useful flexibility: yes.
6. Core payment flows preserved (add/edit/delete, mark paid/undo paid): yes.
