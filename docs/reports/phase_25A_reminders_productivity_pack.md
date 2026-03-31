# Phase 25A - Reminders Productivity Pack

- Date: 2026-03-31
- Status: implemented (major combined Reminders UX/productivity wave), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_24I_payment_management_simplification_profile_deflation_visual_separation.md`
  - `docs/reports/phase_24J_payment_form_modalization.md`
  - `docs/reports/phase_24K_quick_payment_flow_acceleration_native_unsaved_confirm.md`
  - `docs/reports/phase_24L_template_assisted_quick_create_in_payment_modal.md`
  - `docs/reports/phase_24M_reminders_list_clarity_card_action_lane_optimization.md`
  - `docs/reports/phase_24H_readiness_gate_and_closure_pack.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Required runtime inspection before edits:
- `src/components/app/recurring-payments-section.tsx`
- in-file card/list/filter/summary rendering and modal interaction paths
- `src/lib/i18n/localization.tsx`
- `src/app/globals.css`
- payment render/action helpers directly involved in runtime behavior:
  - `src/lib/payments/types.ts`
  - `src/lib/payments/client.ts`
  - `src/lib/payments/cycle.ts`

## 2) Remaining friction found after 24I-24M

Re-audit of current runtime surfaced:
1. 10+ card scans still required too much visual hunting across mixed states.
2. List-level prioritization/focus controls were weak for high-frequency daily workflow.
3. Card status readability improved in 24M but needed stronger list-level grouping behavior.
4. Large-list behavior still recomputed repeated per-card data in render path.
5. Existing action-lane hierarchy was better than pre-24M but still lacked stronger workflow orientation at list level.

## 3) Combined improvements made in list/card hierarchy

Files:
- `src/components/app/recurring-payments-section.tsx`

Combined changes in one pass:
1. Added prepared card model (`PreparedVisiblePayment`) with precomputed card scan data.
2. Added deterministic urgency-first sorting for visible cards:
   - overdue,
   - due today,
   - upcoming unpaid,
   - paid.
3. Added list-level focus lane (`All`, `Action now`, `Upcoming`, `Paid`) with live counts.
4. Updated visibility counters to reflect focused vs in-list vs total context.
5. Preserved compact card style while improving list rhythm and faster per-card orientation.

## 4) What changed in action-lane clarity

File: `src/components/app/recurring-payments-section.tsx`

1. Preserved clear primary button hierarchy from 24M (`Mark paid` / `Undo paid` remains dominant).
2. Kept edit/delete visible and predictable in secondary lane.
3. Added list-level focus controls so users can reduce action hunting before card interaction.
4. Kept delete confirmation explicit and calm.

## 5) What changed in status readability

Files:
- `src/components/app/recurring-payments-section.tsx`
- `src/lib/i18n/localization.tsx`

1. Preserved truthful status logic and existing business states.
2. Strengthened mixed-state comprehension by combining:
   - card-level status pills,
   - urgency-first list sorting,
   - focus filters for `Action now` / `Upcoming` / `Paid`.
3. Added RU parity for newly introduced runtime keys:
   - `Focus`
   - `All`
   - `In list`
   - `No cards in this focus yet.`

## 6) What changed in long-list density/performance behavior

File: `src/components/app/recurring-payments-section.tsx`

Modest safe hardening (no overengineering):
1. Added memoized prepared card model for visible list.
2. Added memoized sorted list and memoized focus-filtered list.
3. Reused memoized `todayDateKey` across summary and card status derivation.
4. Reduced repeated in-render per-card derivation for large lists.

No virtualization or complex list machinery was introduced.

## 7) What changed in top-level Reminders productivity flow

File: `src/components/app/recurring-payments-section.tsx`

The surface now reads more clearly as:
1. existing payments first,
2. quick list-level focus controls,
3. urgency-first card order,
4. obvious on-card primary action,
5. simple top-lane add flow preserved.

## 8) What was intentionally not changed

1. Accepted 24I-24L modal/payment-management baseline remained intact:
   - modal add/edit,
   - top-right close icon,
   - native in-app unsaved confirmation,
   - template-assisted create with manual bypass,
   - full fields + advanced options,
   - explicit delete confirmation with archive-backed semantics.
2. No support-rail/profile/donor model changes.
3. No compatibility-boundary planning/cleanup work.
4. No migrations.
5. No business-logic rewrites to payment state/due rules.

## 9) Risks / follow-ups

1. Current urgency sorting is deterministic and practical, but future user telemetry/manual feedback may suggest alternative sort tie-breakers.
2. Focus controls add speed for heavy users; manual checks should confirm no confusion for very small lists.

## 10) Exact recommended next step

Run practical manual verification using `phase_25A_reminders_productivity_manual_checklist.md` with real mixed workloads (10+ cards).
If pass, mark 25A as manual-verified and freeze this reminders productivity baseline before unrelated work resumes.

## 11) Concise manual verification notes

1. Open Reminders with mixed card states and verify urgency-first order is intuitive.
2. Use focus lane (`All`, `Action now`, `Upcoming`, `Paid`) and verify counts/filtering accuracy.
3. Confirm card scan remains quick (title/amount/due/cadence/state).
4. Confirm primary action remains dominant and edit/delete remain easy to reach.
5. Confirm modal add/edit/template/unsaved/delete flows remain unchanged from accepted baseline.
6. Check RU/EN parity for newly touched focus/list strings.

## 12) Validation

- `npm run lint` - pass
- `npm run build` - pass
