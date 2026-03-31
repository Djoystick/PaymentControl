# Phase 24J - Payment Form Modalization

- Date: 2026-03-31
- Status: implemented (runtime UX modalization), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_24I_payment_management_simplification_profile_deflation_visual_separation.md`
  - `docs/reports/phase_24H_readiness_gate_and_closure_pack.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Required runtime inspection before changes:
- `src/components/app/recurring-payments-section.tsx`
- shared modal/overlay pattern in `src/components/app/app-shell.tsx` (`createPortal` onboarding overlay)
- `src/lib/i18n/localization.tsx`
- `src/app/globals.css`
- payment form draft/edit state handling in `recurring-payments-section.tsx`

## 2) Why modalization was chosen over current in-page composer

The 24I in-page composer solved major blockers, but still kept large form markup inside Reminders flow.
For add/edit operations, a temporary focused overlay is more natural because it:
1. keeps payment list as the primary management surface,
2. provides clear open/close interaction boundaries,
3. reduces visual competition in the main lane,
4. preserves full functionality while lowering perceived complexity.

This aligns with the explicit request for a simpler and more natural quick add/edit flow.

## 3) What changed in add flow

File: `src/components/app/recurring-payments-section.tsx`

1. `Add payment` now opens a portal-based modal dialog (not in-page composer).
2. Modal contains the same form fields as before.
3. Modal keeps the same template suggestions behavior.
4. Modal keeps the same advanced options block and parameters.
5. Background list remains the main surface and does not convert into a separate page flow.

## 4) What changed in edit flow

File: `src/components/app/recurring-payments-section.tsx`

1. Card-level `Edit` still remains clearly visible in normal runtime lane.
2. `Edit` now opens the same modal with prefilled values.
3. Save continues to update the same record and then returns naturally to the list.
4. No secondary duplicate edit form was introduced.

## 5) How close/cancel behavior works

File: `src/components/app/recurring-payments-section.tsx`

Close paths now include:
1. top-right close icon button in modal header,
2. lower `Close form` action,
3. `Cancel edit` (when editing),
4. backdrop click,
5. `Escape` key.

Unsaved state handling:
1. Modal tracks a baseline draft for create/edit sessions.
2. If user tries to close with unsaved changes, a calm explicit confirmation is shown (`Discard unsaved payment form changes?`).
3. Clean empty draft can close immediately without extra friction.
4. User is never trapped inside the form.

## 6) Delete behavior (24I preservation)

Delete flow remains intact from 24I:
1. visible on-card delete action,
2. explicit inline confirmation,
3. calm destructive language,
4. no one-tap delete,
5. archive-backed delete semantics preserved.

## 7) Localization and UX consistency updates

File: `src/lib/i18n/localization.tsx`

Added RU parity for new modal-specific runtime strings:
- `Payment form`
- `Discard unsaved payment form changes?`

Existing 24I wording and donor-support truth remain intact.

## 8) Intentionally not changed

1. No support-rail/profile semantic changes.
2. No compatibility-boundary cleanup work.
3. No migrations.
4. No backend policy changes to delete/archive semantics.
5. No business logic changes for reminders/history/family/payment core flow.

## 9) Risks / follow-ups

1. Unsaved-close confirmation currently uses browser confirm for simplicity and reliability; a future custom modal-confirm surface could provide more visual consistency if desired.
2. If future UX demands faster template-first creation, this can be layered inside modal without changing data model.

## 10) Exact recommended next step

Run focused manual verification for the live reminders routine:
1. Add payment -> modal open/close paths (icon, button, backdrop, Escape).
2. Edit existing payment -> prefilled modal -> save.
3. Unsaved draft close confirmation path.
4. Delete confirmation path remains unchanged and safe.

If these pass, mark 24J manual verification complete and keep this modal baseline stable.

## 11) Concise manual verification notes

1. Open Reminders and click `Add payment` -> modal appears over list.
2. Confirm top-right close icon closes modal safely.
3. Type in draft and attempt close -> unsaved confirmation appears.
4. Open existing payment with `Edit` -> same modal prefilled.
5. Save edit -> modal closes and list reflects updated data.
6. Confirm advanced options are present and functional in modal.
7. Confirm delete confirmation remains inline on card and unchanged in safety behavior.

## 12) Validation

- `npm run lint` - pass
- `npm run build` - pass
