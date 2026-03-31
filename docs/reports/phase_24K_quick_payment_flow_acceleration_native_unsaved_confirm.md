# Phase 24K - Quick Payment Flow Acceleration + Native Unsaved Confirm

- Date: 2026-03-31
- Status: implemented (runtime UX acceleration), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_24J_payment_form_modalization.md`
  - `docs/reports/phase_24I_payment_management_simplification_profile_deflation_visual_separation.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Required runtime inspection before edits:
- `src/components/app/recurring-payments-section.tsx`
- shared portal modal baseline in `src/components/app/app-shell.tsx`
- `src/lib/i18n/localization.tsx`
- `src/app/globals.css`

Also checked framework-local guidance:
- `node_modules/next/dist/docs/index.md`

## 2) Remaining friction after 24J

Observed friction retained after accepted 24J baseline:
1. Unsaved close used browser-native `window.confirm`, which felt outside the app visual system and interrupted flow.
2. Create/edit first viewport still required extra scanning effort (primary fields were compact but not clearly labeled for quick pass).
3. Modal actions could fall below viewport on long content, adding extra scroll friction on mobile before save/cancel.
4. Edit path opened with advanced section expanded, which added noise for quick title/amount/date corrections.

## 3) How browser confirm was replaced

File: `src/components/app/recurring-payments-section.tsx`

Implemented a native in-app discard-confirm layer on top of the accepted modal:
1. Removed `window.confirm` usage from unsaved-close path.
2. Added `isDiscardConfirmOpen` state and in-app confirmation dialog rendered via portal.
3. Unsaved close now opens calm in-app confirm with explicit actions:
   - `Keep editing`
   - `Discard changes`
4. Backdrop click and `Escape` close only the confirm layer first (returning user to edit safely).
5. If there are no meaningful changes, close still happens immediately without extra prompt.

Localization parity added in:
- `src/lib/i18n/localization.tsx`

## 4) Quick-create acceleration changes

File: `src/components/app/recurring-payments-section.tsx`

Kept same full form surface and advanced options, but made first path faster:
1. Added first-field focus on modal open (`title` input auto-focused, edit cursor placed at end).
2. Added clearer first-path field rhythm for core lane:
   - amount
   - cadence
   - due day
3. Added mobile-friendly input hints (`inputMode`) for amount/day fields.
4. Made header and action area sticky inside modal scroll container so primary actions stay visible without deep scrolling.
5. Kept advanced options available but secondary.

## 5) Quick-edit flow improvements

File: `src/components/app/recurring-payments-section.tsx`

1. Edit still opens the same modal with prefilled values.
2. Edit now defaults advanced section collapsed to keep fast-edit lane focused.
3. Footer keeps clear edit-safe actions in view:
   - `Save changes`
   - `Cancel edit`

## 6) What was intentionally not changed

1. 24J modal baseline was preserved (no reversion to in-page composer).
2. Existing form fields and advanced parameters remain available.
3. 24I delete confirmation flow remains unchanged and explicit.
4. No business logic changes to reminders/history/family/payment core behavior.
5. No support/profile/compatibility-boundary work.
6. No migrations.

## 7) Risks and follow-ups

1. Native unsaved confirmation currently relies on local component state only (intentional for low-risk UX pass).
2. Sticky header/footer improve action visibility but should be re-checked on very small devices for preferred spacing.

## 8) Exact recommended next step

Run focused manual verification for daily reminders workflow:
1. Add payment -> close with and without unsaved changes.
2. Edit payment -> cancel/discard/keep-editing/save paths.
3. Long modal content on mobile -> action visibility and scroll behavior.
4. Confirm delete flow remains unchanged and safe.

If these pass, mark 24K as manual-verified and keep this modal UX as current stable baseline.

## 9) Concise manual verification notes

1. Open Reminders -> `Add payment` opens modal (24J baseline intact).
2. Enter draft text -> close icon/backdrop/close button should open native in-app unsaved confirm.
3. In unsaved confirm:
   - `Keep editing` returns to form with draft preserved.
   - `Discard changes` closes modal and resets draft.
4. Open `Edit` on existing payment -> modal prefilled -> quick save path remains simple.
5. Confirm advanced options are still available and unchanged in scope.
6. Confirm `Delete` still uses explicit inline card confirmation from 24I.

## 10) Validation

- `npm run lint` - pass
- `npm run build` - pass
