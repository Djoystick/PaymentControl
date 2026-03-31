# Phase 24I - Payment Management Simplification + Profile Deflation + Visual Separation Correction

- Date: 2026-03-31
- Status: implemented (runtime UX + visual hierarchy correction), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_24A_full_product_audit_soft_premium_foundation_uiux_rebase.md`
  - `docs/reports/phase_24B_localization_and_copy_parity_polish.md`
  - `docs/reports/phase_24C_support_claim_operational_clarity.md`
  - `docs/reports/phase_24D_optional_rail_activation_hardening.md`
  - `docs/reports/phase_24E_legacy_monetization_debt_minimization.md`
  - `docs/reports/phase_24F_compatibility_boundary_codification.md`
  - `docs/reports/phase_24G_compatibility_transition_plan.md`
  - `docs/reports/phase_24H_readiness_gate_and_closure_pack.md`
  - `docs/reports/phase_24H_manual_closure_pack_24A_24G.md`
  - `docs/reports/internal_version_history.md`

## 1) Runtime surfaces/components inspected

Required runtime inspection performed in active code:
- `src/components/app/recurring-payments-section.tsx`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/components/app/app-shell.tsx`
- `src/components/app/landing-screen.tsx`
- `src/components/app/payments-activity-section.tsx`
- `src/lib/i18n/localization.tsx`
- `src/app/globals.css`

Related implementation files checked for behavior safety:
- `src/lib/payments/client.ts`
- `src/lib/payments/types.ts`
- `src/components/app/app-icon.tsx`
- `node_modules/next/dist/docs/01-app/02-guides/forms.md`

## 2) Exact blocker causes found

1. Payment form felt like a separate window
- Reminders used a split screen mode (`act` vs `setup`) that hid the payment list while form mode was open.
- Opening form changed runtime mode instead of simply opening an in-context editor.

2. No obvious natural close/cancel path
- Form had `Clear form` / `Cancel edit`, but no explicit and persistent `Close form` action.
- Closing mechanics were coupled to mode transitions, not clear user intent.

3. Edit/delete not strong enough in active management lane
- Edit existed, but management visibility dropped once setup mode took over the screen.
- Delete behavior existed only as archive action buried in disclosure, with weak discoverability and no explicit integrated confirmation path.

4. Profile overload and wrong support block placement
- Support/Premium area was large, fully expanded, and positioned before core workspace operations.
- This made Profile feel heavy and pushed utility controls down.

5. Long-screen visual blending
- Surface/card boundary contrast and elevation were too close across stacked sections.
- On multi-scroll pages, sections visually merged into one column.

6. Reminders felt mentally heavy
- Competing helper/context blocks and mode-switching increased cognitive load for basic create/edit/delete/mark-paid tasks.

## 3) What changed in payment form behavior

File: `src/components/app/recurring-payments-section.tsx`

1. Removed mode split that hid management list
- Eliminated `screenMode` usage and made list + form coexist on one runtime surface.
- Existing payments remain manageable while form is open.

2. Added explicit close path
- Added visible `Close form` action in composer header and footer.
- Closing form now resets draft/edit state cleanly without trapping the user.

3. Preserved natural return to main flow
- Submit now returns to normal list management by closing composer.
- Opening composer keeps in-page context and scrolls to composer naturally.

4. Simplified top action lane
- Reworked top lane to a compact create/manage summary with `Add payment` and `Refresh section`.
- Reduced helper noise and kept primary action clear.

## 4) Edit/delete flow improvements

File: `src/components/app/recurring-payments-section.tsx`

1. Edit flow
- `Edit` remains directly visible on each payment card in active flow.
- Edit opens the same in-page composer with current values prefilled.

2. Delete flow (explicit confirmation)
- Added visible `Delete` action on every card in normal runtime lane.
- First click opens an inline confirmation panel.
- Confirm step uses explicit `Confirm delete` / `Cancel delete` actions.
- Confirmed deletion uses existing archive endpoint, but runtime semantics are now clear as removal from active reminders list.

3. Active list behavior after deletion
- Reminders list now displays active payments only.
- Archived/deleted-from-active entries no longer clutter daily management lane.

## 5) Reminders simplification outcomes

Files:
- `src/components/app/recurring-payments-section.tsx`
- `src/lib/i18n/localization.tsx`

Applied simplification:
1. One in-place management surface (no form/list split state).
2. Strong primary lane for create/edit/delete/mark-paid.
3. Less persistent helper noise in top block.
4. Faster access to edit/delete actions without drilling into disclosure.
5. Clear, calm delete confirmation without one-tap destructive behavior.

## 6) Profile deflation + donation/support position correction

File: `src/components/app/profile-scenarios-placeholder.tsx`

1. Moved donor-support block to end of Profile
- Profile screen switched to flex-column layout.
- Support/Premium block is now `order-last`, so it renders after operational profile sections.

2. Deflated support area by default
- Converted support block to collapsed `<details>` section with `Optional` marker.
- Keeps donor-support truth intact while reducing first-read overload.

3. Kept support/business truth stable
- No claim-flow model changes.
- No owner-review fallback changes.
- No support rail direction changes from 24D.

## 7) Visual separation corrections

File: `src/app/globals.css`

Adjusted shared visual hierarchy system-wide:
1. Slightly stronger border contrast tokens (light/dark).
2. Stronger but calm card/surface shadow layering.
3. Subtle surface gradients and inset cues for section boundaries.
4. Stronger detail/empty-state separation.
5. Added `pc-btn-danger` for explicit destructive affordance with safe visual language.

Goal achieved: long screens no longer read as one merged wall of similar surfaces while keeping calm tone.

## 8) Localization/copy updates

File: `src/lib/i18n/localization.tsx`

Added RU parity for newly introduced runtime strings:
- `Create and manage payments in one place.`
- `Edit or delete directly from each payment card.`
- `Action now`
- `Close form`
- `Delete this payment from active reminders?`
- `This requires confirmation and can be recreated later if needed.`
- `Confirm delete`
- `Cancel delete`
- `Payment removed from active list.`
- `Failed to remove recurring payment.`

## 9) What was intentionally not changed

1. No payment automation/webhook/provider integration.
2. No compatibility-boundary DB/API/wire rename work.
3. No support claim business-model rewrite.
4. No owner-review fallback semantics change.
5. No 4-tab shell/navigation model change.
6. No reminders/history/family/core payment logic removal.
7. No support rail truth changes from 24D.
8. No migrations.

## 10) Risk notes / follow-ups

1. Delete action currently maps to archive semantics (compatibility-safe behavior). If hard-delete is ever required, that should be a separate explicit backend policy pass.
2. Profile deflation is now structural (support collapsed + bottom placement); further content trimming can be done later only if manual verification still reports overload.
3. Reminders simplification preserves advanced options; future pass can add optional micro-telemetry/manual timing checks to confirm reduced task completion friction.

## 11) Recommended next step

Run focused manual closure verification for 24I runtime UX using real user flows:
1. Reminders: add/edit/delete(confirm)/mark paid/undo paid in one continuous in-page flow.
2. Profile: confirm support block appears at the end and remains collapsed/secondary by default.
3. Long-scroll screens: confirm clearer surface boundaries on mobile and desktop.

If those checks pass, mark 24I as manual-verified and freeze this UX baseline before any further structural changes.

## 12) Concise manual verification notes

1. Open Reminders -> click `Add payment` -> confirm form has clear `Close form` and return path.
2. Confirm existing payment cards remain visible/manageable while form is open.
3. On any existing payment, use `Edit` and save; verify update appears without leaving Reminders flow.
4. On any existing payment, click `Delete` -> verify inline confirmation appears -> test `Cancel delete` and `Confirm delete` paths.
5. Confirm deleted payment disappears from active reminders list and no broken control remains.
6. Open Profile and verify Support/Premium block is at bottom and collapsed by default.
7. Verify support rails/claim flow copy remains donor-support-first and non-automated.
8. Scroll Home/Reminders/History/Profile and verify stacked surfaces/cards are visually separated.
9. RU/EN sanity pass for new reminders/delete/form-close copy.

## 13) Validation

- `npm run lint` - pass
- `npm run build` - pass
