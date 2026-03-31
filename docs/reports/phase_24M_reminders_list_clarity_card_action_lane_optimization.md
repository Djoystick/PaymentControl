# Phase 24M - Reminders List Clarity + Card Action Lane Optimization

- Date: 2026-03-31
- Status: implemented (runtime UX optimization), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_24I_payment_management_simplification_profile_deflation_visual_separation.md`
  - `docs/reports/phase_24J_payment_form_modalization.md`
  - `docs/reports/phase_24K_quick_payment_flow_acceleration_native_unsaved_confirm.md`
  - `docs/reports/phase_24L_template_assisted_quick_create_in_payment_modal.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Required runtime inspection before edits:
- `src/components/app/recurring-payments-section.tsx`
- in-file payment card/list rendering and action controls (no extracted card component currently used)
- `src/lib/i18n/localization.tsx`
- `src/app/globals.css`

## 2) Daily-use friction that remained after 24I-24L

1. Existing cards still required too much line-by-line reading for title/amount/due/cadence in long lists.
2. On-card primary action (`Mark paid` / `Undo paid`) visually competed with edit/delete because actions sat in one wrapped lane.
3. Status readability was uneven: overdue/due-today were highlighted, but upcoming unpaid cards were less explicit.
4. Long reminder lists felt dense because inter-card rhythm and card hierarchy were still close.

## 3) What changed in card hierarchy

Files:
- `src/components/app/recurring-payments-section.tsx`
- `src/app/globals.css`

Changes applied:
1. Added clearer payment card surface classes:
   - `pc-payment-card`
   - `pc-payment-card-default`
   - `pc-payment-card-due-today`
   - `pc-payment-card-overdue`
2. Refined top card hierarchy for faster scan:
   - title + type first,
   - amount remains clearly visible,
   - due/cadence moved into compact two-cell summary block,
   - current-cycle/supporting metadata stays secondary.
3. Increased card-to-card spacing in list (`space-y-2`) to reduce wall-of-cards effect in long lists.

## 4) What changed in action-lane clarity

File: `src/components/app/recurring-payments-section.tsx`

1. Split action lane into clear hierarchy:
   - primary action (`Mark paid` / `Undo paid`) full-width and visually dominant,
   - edit/delete moved to secondary two-button row.
2. Kept management actions visible on-card (no burying behind extra navigation).
3. Preserved explicit delete confirmation flow and archive-backed semantics from 24I.

## 5) What changed in status readability

Files:
- `src/components/app/recurring-payments-section.tsx`
- `src/lib/i18n/localization.tsx`

1. Kept existing paid/unpaid status truth.
2. Used explicit unpaid timing states for quick scan:
   - `Overdue (unpaid)`
   - `Due today (unpaid)`
   - `Upcoming (unpaid)` (new copy key, RU parity added)
3. Did not change status logic or due-date business rules; only improved presentation and readability.

## 6) What was intentionally not changed

1. Accepted 24I-24L baseline flows remained intact:
   - modal add/edit,
   - top-right close icon,
   - native in-app unsaved confirmation,
   - template-assisted create with manual bypass,
   - delete confirmation semantics.
2. No business logic changes to reminders/history/family/core payment flows.
3. No support-rail/profile/compatibility work.
4. No migrations.

## 7) Risks / follow-ups

1. Card visual tuning now improves scan clarity, but exact preferred density may still need minor polish after live-device manual verification.
2. If future list volumes grow significantly, optional virtualization/performance tuning could be considered separately (out of scope for this UX pass).

## 8) Exact recommended next step

Run focused manual verification on real reminder workloads:
1. Scan 10+ cards in Reminders and confirm faster comprehension of title/amount/due/cadence/status.
2. Confirm primary action stands out while edit/delete remain easy to reach.
3. Verify overdue/due-today/upcoming states are instantly distinguishable.
4. Verify 24I-24L create/edit/delete/unsaved/template flows are unchanged.

If checks pass, mark 24M as manual-verified and keep this list/card hierarchy as the new stable baseline.

## 9) Concise manual verification notes

1. Open Reminders with mixed states (paid/unpaid/overdue/upcoming/subscription).
2. Confirm each card can be scanned quickly without opening details.
3. Confirm primary action is obvious and secondary edit/delete row is predictable on mobile.
4. Confirm delete still requires explicit confirmation.
5. Confirm modal add/edit flow and native unsaved dialog still match accepted 24J/24K behavior.
6. Confirm quick templates + manual bypass still work in create mode (24L baseline).

## 10) Validation

- `npm run lint` - pass
- `npm run build` - pass
