# Phase 30R - Receipt Review Closure Pack + OCR Surface Final Simplification

- Date: 2026-04-07
- Status: implemented, pending manual verification
- Scope: final narrow OCR review UX closure pass (no OCR engine change, no architecture wave, no broad UI wave)
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline
  - modal-first grammar
  - receipt draft/save/reopen/retry/handoff/manual-confirmation flow
  - OCR remains helper, never source of truth

## 1) Mandatory References Used

Read before implementation:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. `.codex/skills/ui-ux-pro-max/SKILL.md`
5. `docs/reports/phase_30N_ocr_receipt_to_expense_handoff_and_full_receipt_preview_fix.md`
6. `docs/reports/phase_30O_receipt_ocr_quality_hardening_total_extraction_reliability_and_qr_first_foundation.md`
7. `docs/reports/phase_30P_receipt_review_foreground_fix_russian_ocr_cleanup_and_key_field_first_presentation.md`
8. `docs/reports/phase_30Q_final_receipt_ocr_practicalization_and_key_summary_focus.md`

How references were applied:
1. `DESIGN.md`: enforced one dominant action, text restraint, and progressive disclosure on the review surface.
2. `ui-ux-pro-max`: used guidance for z-layer discipline, mobile-first scanning, and secondary-layer demotion (details/quiet actions instead of primary-lane noise).
3. 30N-30Q continuity: kept receipt draft lifecycle, review modal layering, full preview route, and handoff behavior intact.

## 2) Closure Problem Statement (Before 30R)

Live practical gap after 30Q:
1. OCR review still had residual visual noise in primary view.
2. Primary and secondary actions were still too visually close in weight.
3. Parse metadata and maintenance actions were overexposed on the main lane.
4. Secondary OCR text was demoted but still too visible as an always-open block.

## 3) What Was Simplified on Review Surface

File: `src/components/app/travel-group-expenses-section.tsx`

Implemented:
1. Removed always-visible `Receipt summary` meta card from top-level primary surface.
2. Kept top-level review focused on:
   - receipt image preview,
   - key field summary,
   - primary next action.
3. Moved metadata and maintenance controls into a collapsed secondary layer (`Details and actions`).

Result:
1. Review screen is scannable in ~1-2 seconds.
2. Main lane no longer competes with technical/maintenance details.

## 4) One Clear Primary Action Hierarchy

File: `src/components/app/travel-group-expenses-section.tsx`

Implemented:
1. Promoted `Use in expense form` to single dominant CTA:
   - switched to `pc-btn-primary w-full`,
   - kept only for non-finalized drafts.
2. Kept `Reparse OCR` / `Run OCR prefill` as secondary action.
3. Moved `Reset OCR hints`, `Replace photo`, `Delete draft` to secondary collapsed layer.

Result:
1. Primary next step is clear and no longer competes with maintenance actions.

## 5) Full Receipt Preview Emphasis

File: `src/components/app/travel-group-expenses-section.tsx`

Implemented:
1. Made preview image itself an explicit open target for full receipt modal.
2. Kept a quiet supporting `Open full receipt` control directly near the preview.
3. Preserved existing full-size preview modal path and overlay order.

Result:
1. Full receipt open path is easier and more natural without overshadowing primary CTA.

## 6) Secondary OCR Text Demotion and Calmness

File: `src/components/app/travel-group-expenses-section.tsx`

Implemented:
1. Moved `Secondary OCR reference` into collapsed `details` block.
2. Downgraded OCR text actions to quiet style (`pc-btn-quiet`).
3. Reduced primary-surface OCR excerpt size (`referencePreview` 140 chars).
4. Reduced non-debug OCR modal slice size (640 chars) while keeping raw diagnostics path.

Result:
1. OCR text remains available for manual cross-check/debug.
2. Raw OCR is no longer the main story of the review screen.

## 7) Key-Field Presentation Polish and Confidence Noise Cleanup

File: `src/components/app/travel-group-expenses-section.tsx`

Implemented:
1. Kept key fields in fixed practical order:
   - OCR amount
   - Merchant
   - Expense date
2. Kept short description optional and secondary.
3. Reduced confidence noise by hiding high-confidence badges.
4. Preserved explicit warning signal when manual review is needed (`low`/`missing`).

Result:
1. Cleaner rhythm and lower cognitive load on small screens.
2. Honest low-confidence signal is still present where needed.

## 8) Modal / Layering Behavior Notes

1. Review modal remains foreground overlay (`z-[102]`) over receipt drafts (`z-[97]`).
2. OCR text modal and full receipt modal remain higher overlays (`z-[103]`, `z-[104]`).
3. No regression-intent changes to review open path (`Receipt drafts` -> `Review receipt`).

## 9) Files Changed

1. `src/components/app/travel-group-expenses-section.tsx`
2. `docs/reports/phase_30R_receipt_review_closure_pack_and_ocr_surface_final_simplification.md`
3. `docs/reports/internal_version_history.md`

## 10) What Was Intentionally NOT Changed

1. No OCR engine/provider swap.
2. No new OCR extraction wave.
3. No broad shell/tab/navigation redesign.
4. No recurring-domain changes.
5. No recurring/travel merge.
6. No premium/paywall/entitlement logic return.
7. No bot-facing manual Telegram layer changes.
8. No auto-save expense creation from OCR.

## 11) Verification Run (Code-Level)

Executed:
1. `node --test src/lib/travel/ocr/receipt-heuristics.test.ts` - pass (7/7)
2. `npm run lint` - pass with existing non-blocking `@next/next/no-img-element` warnings in receipt image surfaces
3. `npm run build` - pass

Note:
1. This report does not claim manual/device verification completion.

## 12) Manual Verification Checklist

1. Travel -> `Receipt drafts` -> `Review receipt` opens as active foreground context.
2. Review screen top lane shows: preview + key summary + clear primary CTA.
3. `Use in expense form` is visually dominant vs secondary actions.
4. `Reparse OCR` remains available but secondary.
5. `Open full receipt` remains easy and opens full-size preview.
6. Secondary OCR reference is collapsed by default and no longer dominates.
7. Raw OCR diagnostics are still available as deep secondary action.
8. `Use in expense form` still transfers values into expense form.
9. Draft/save/reparse/reopen state remains stable after close/back.
10. Russian strings render correctly in review and OCR secondary layers.

## 13) Risks / Regression Watchlist

1. If users relied on always-visible parse metadata, they now need one extra tap (`Details and actions`).
2. High-confidence badge hiding reduces noise but can reduce explicit positive reassurance for some users.
3. Receipt image remains `<img>`-based (known warning), intentionally unchanged in this pass.
4. Finalized drafts intentionally hide primary apply/reparse actions; linked-expense path remains primary in that state.

## 14) Self-Check Against Requested Constraints

1. `ui-ux-pro-max` used - yes.
2. `DESIGN.md` used - yes.
3. Premium/paywall logic reintroduced - no.
4. Recurring baseline broken - no code intent.
5. Travel baseline broken - no code intent.
6. Review surface simplified - yes.
7. Primary CTA clarity improved - yes.
8. Secondary OCR text further demoted - yes.
9. Full receipt preview kept convenient - yes.
10. Handoff to expense form preserved - yes.
11. Modal chaos introduced - no.
12. RU strings broken - no code intent.
13. This is a narrow closure pass, not new OCR wave - yes.
