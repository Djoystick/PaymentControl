# Phase 30H - Travel Receipt/OCR Reliability + Modal Viewport Regression Fix

- Date: 2026-04-06
- Status: implemented, pending manual verification
- Scope: targeted corrective pass after 30C/30D modalization regressions
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline
  - 29A/29A.1 language+analytics model
  - 30C modal-first grammar
  - 30D spoiler elimination grammar

## 1) References Used

Before implementation:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. `.codex/skills/ui-ux-pro-max/SKILL.md`
5. `docs/reports/phase_30C_modal_surface_unification_header_deduplication_home_continuity_rollback_and_page_load_performance_fix.md`
6. `docs/reports/phase_30D_full_spoiler_elimination_and_project_wide_modal_disclosure_unification.md`

How references were applied:
1. `DESIGN.md`: keep root/workspace clean, preserve modal-first secondary flows, avoid duplicate action competition.
2. `ui-ux-pro-max`: viewport-safe modal layout, internal scroll reliability, clean trigger hierarchy, no modal chaos.

## 2) Runtime Audit Findings (Root Cause)

Confirmed issues in current runtime composition:
1. `ModalSheet` primitive had no internal scroll container and no viewport-safe max-height.
2. Long modal content (especially `Participants` and `Receipt drafts`) could clip against mobile viewport and create top overlap/"visor" visual artifact.
3. In that clipped state, receipt action controls could become effectively unreachable, which looked like:
   - new receipt add path not working,
   - OCR/reparse path for existing draft not working.
4. Receipt capture trigger used nested file input inside label in modal content; on Telegram mobile WebView this pattern is less reliable than explicit ref-driven trigger button.
5. Travel action lane still had duplicate intent:
   - top-level `Quick add expense`
   - plus equally visible `Expense form` action in workspace actions block.
6. On OCR parse failure (`TRAVEL_OCR_UNAVAILABLE` / parse failure), client feedback was shown but trip snapshot could stay visually stale until next explicit reload.

## 3) What Was Fixed

## 3.1 Modal viewport/scroll hardening (centralized)
Files:
1. `src/components/app/modal-sheet.tsx`
2. `src/app/globals.css`

Changes:
1. Added viewport-safe max height to `ModalSheet` dialog:
   - `calc(100dvh - safe-area-top - safe-area-bottom - 1.5rem)`
2. Converted modal dialog to flex-column with `overflow: hidden`.
3. Introduced dedicated `pc-modal-sheet-body` scroll container.
4. Added overlay-level and body-level `overflow-y` and `overscroll-behavior: contain`.
5. Preserved existing modal header behavior and close semantics.

Result:
1. Travel secondary modals now scroll internally in Telegram mobile viewport.
2. Top clipping/overlap behavior is removed for long content surfaces.
3. Content/actions no longer disappear past visible bounds in long modal bodies.

## 3.2 Receipt creation reliability hardening
File:
1. `src/components/app/travel-group-expenses-section.tsx`

Changes:
1. Replaced nested label/file-input trigger for new receipt with explicit ref-driven button trigger:
   - added `createReceiptInputRef`
   - added `openCreateReceiptPicker()` guard callback
2. Kept save-now/parse-later semantics unchanged.
3. Preserved existing active-trip and mutation-lock guards.

Result:
1. New receipt draft creation path is restored to a robust modal-safe trigger pattern.

## 3.3 OCR/review failure-path reliability
File:
1. `src/components/app/travel-group-expenses-section.tsx`

Changes:
1. Added `refreshSelectedTripSnapshot(tripId)` helper to re-read trip detail and refresh cache-backed UI snapshot.
2. Hooked refresh into OCR parse failure paths:
   - API `!ok` parse result
   - catch fallback path
3. Preserved server-side OCR truth and fallback messaging.

Result:
1. Existing draft OCR/reparse path no longer leaves stale trip snapshot after failed OCR attempts.
2. Fallback behavior (including missing OCR env) is visible and coherent in UI state.

## 3.4 Travel action de-duplication
File:
1. `src/components/app/travel-group-expenses-section.tsx`

Changes:
1. Removed duplicate always-visible `Expense form` action from `Expense workspace actions`.
2. Kept one clear primary path:
   - top CTA now dynamically reads:
     - `Quick add expense` (default)
     - `Edit expense form` (when editing)
3. Preserved locked-state chip when trip is not editable.

Result:
1. Reduced action noise and duplicate intent competition in selected-trip workspace.

## 4) Receipt/OCR Path Status After Fix

Restored/confirmed in implementation logic:
1. add new receipt draft trigger is explicit and modal-safe.
2. save draft path remains intact.
3. open/review draft path remains intact.
4. parse/reparse path remains intact.
5. OCR-unavailable fallback remains honest:
   - no silent automation
   - no crash of receipt lane
6. parse failure path now refreshes snapshot instead of leaving stale visual state.

## 5) Files Changed

1. `src/app/globals.css`
2. `src/components/app/modal-sheet.tsx`
3. `src/components/app/travel-group-expenses-section.tsx`
4. `docs/reports/internal_version_history.md`
5. `docs/reports/phase_30H_travel_receipt_ocr_reliability_and_modal_viewport_regression_fix.md`

## 6) What Was Intentionally NOT Changed

1. No DB migrations/schema changes.
2. No travel domain model changes.
3. No shell/tab redesign.
4. No spoiler/details rollback.
5. No language/analytics model changes from 29A/29A.1.
6. No bot-facing manual Telegram profile/start/menu changes.
7. No README/GitHub trust-pack changes in this pass.

## 7) Verification Run

Executed:
1. `npm run lint` (pass with existing non-blocking `no-img-element` warnings in travel receipt previews)
2. `npm run build` (pass)
3. targeted tests:
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/finalization.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/split.test.ts` (pass)

## 8) Manual Verification Notes (Telegram runtime)

Check this end-to-end:
1. Travel -> open selected trip -> `Participants` modal:
   - no top clipping/visor artifact
   - full content scrolls inside modal
2. Travel -> `Receipt drafts` modal:
   - `Add receipt photo` opens file/camera picker reliably
   - saved draft appears in list
3. Open an existing draft -> `Review receipt`:
   - parse/reparse works
   - fallback error is shown clearly if OCR env unavailable
   - after failure, draft status/attempt metadata is not stuck stale
4. Selected trip top lane:
   - no duplicate `Quick add expense` vs equally weighted `Expense form` conflict
   - one clear primary expense entry path remains

## 9) Risks / Regression Watchlist

1. Telegram client/device differences in file picker events still require live QA on iOS/Android.
2. `no-img-element` warnings remain intentionally unchanged in this targeted reliability pass.
3. Snapshot refresh on OCR failure adds one extra trip-detail read in failure branch (acceptable for reliability correctness).

## 10) Acceptance Self-Check

1. `ui-ux-pro-max` used as reference - done.
2. `DESIGN.md` used as guardrail - done.
3. Premium/paywall regression - none.
4. Recurring baseline regression - none introduced.
5. Travel baseline regression - none introduced.
6. 30C modal-first grammar preserved - yes (hardened).
7. 30D spoiler elimination preserved - yes.
8. New receipt add path restored with robust trigger - yes.
9. Existing draft OCR/review fallback path hardened - yes.
10. Participants modal clipping/scroll issue fixed at primitive level - yes.
11. Duplicate expense action conflict reduced - yes.
