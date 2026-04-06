# Phase 29D - App-Wide Daily Flow Simplification + Surface Hierarchy Polish

- Date: 2026-04-06
- Status: implemented, pending manual verification
- Scope: controlled UX/system cleanup pass on top of accepted 29B + 29C
- Baseline preserved:
  - donation-only truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline (28A-28Q)
  - 29A/29A.1 language + analytics runtime truth

## 1) Audit Focus Before Changes

Targeted seams with practical daily impact:
1. `Recurring` still had competing quick actions and always-visible list controls.
2. `History` showed context + focus controls as persistent root content before the user reached events.
3. `Selected trip` top area still loaded many KPI/context lines at once before core actions/layers.
4. Empty states in `History` used low-emphasis CTA despite a clear first action.

## 2) What Changed

## 2.1 Recurring - Shorter Root + Secondary Controls in Layer
1. Removed duplicate/competing top quick action for upcoming focus from the main action lane.
2. Kept primary `Add payment` and one high-value `Action now` shortcut.
3. Moved recurring list options into a secondary expandable layer:
   - subscription meta note,
   - focus segments (`All / Action now / Upcoming / Paid`).
4. Preserved all existing add/edit/mark paid/delete and context-memory behavior.

## 2.2 History - Cleaner Main Surface + First Action Clarity
1. Reworked the main history section into:
   - compact visible header (`Recent events list` + visible/total count),
   - expandable `View options` layer for focus segments and context counters.
2. Removed always-open `History context` block from root flow and merged its useful metrics into `View options`.
3. Promoted empty-state CTA (`Open Recurring and add payment`) from quiet to secondary button for clearer first action.
4. Preserved history context restore/start-clean model and home->history intent continuity.

## 2.3 Travel Selected Trip - Better Top Hierarchy
1. Kept selected trip isolation from 29B intact.
2. Moved dense KPI/context content into expandable `Trip overview` layer:
   - members/expenses/total/open settlements/inactive/settled cards,
   - last activity,
   - closure/archive context notes,
   - base-currency settlement note.
3. Left core daily controls immediately visible:
   - `Quick add expense`,
   - workspace layer switch (`Expenses / Settlements / History`),
   - lifecycle actions layer.
4. Renamed top secondary CTA to `Open history layer` for clearer context routing.

## 2.4 Localization Consistency
Added RU entries for new UI labels:
1. `List view options`
2. `Recent events list`
3. `Showing {visible} of {total} events.`
4. `View options`
5. `Trip overview`
6. `Open history layer`

## 3) Files Changed

1. `src/components/app/recurring-payments-section.tsx`
2. `src/components/app/payments-activity-section.tsx`
3. `src/components/app/travel-group-expenses-section.tsx`
4. `src/lib/i18n/localization.tsx`
5. `docs/reports/phase_29C_app_wide_multilayer_ui_cleanup_and_icon_alignment_normalization.md`
6. `docs/reports/internal_version_history.md`

## 4) What Was Intentionally NOT Changed

1. No DB/schema/migration changes.
2. No API/domain logic changes for recurring/travel math/closure/invite/OCR/FX.
3. No shell rewrite and no tab model changes.
4. No bot-facing manual layer changes (BotFather, `/start`, menu button, profile media/text).
5. No language-source or analytics-bootstrap model changes from 29A/29A.1.

## 5) Risks / Regression Watchlist

1. Ensure `Recurring` list filters remain discoverable now that they are secondary-layer content.
2. Ensure `History` view options are still quickly reachable in narrow Telegram viewports.
3. Validate selected trip top area still feels informative enough with overview collapsed by default.
4. Watch for RU copy clipping in compact segmented rows on small screens.

## 6) Manual Verification Notes (Telegram Runtime)

1. `Recurring`:
   - top action lane shows clear primary action without duplicate context competition,
   - list options/focus controls are available via `List view options`.
2. `History`:
   - root surface is shorter before event list,
   - `View options` reveals focus + counters,
   - empty states push a clear action to Recurring.
3. `Travel` selected trip:
   - overview stats live in `Trip overview` layer,
   - quick expense action + layer tabs remain immediately visible,
   - `Open history layer` switches to history workspace as expected.
4. Confirm 29B accepted behavior remains intact:
   - isolated create/join modals,
   - selected-trip isolation,
   - no duplicated join entry points on travel root.

## 7) Checks Run

1. `npm run lint` - pass (existing warnings only: `@next/next/no-img-element` in travel receipt preview)
2. `npm run build` - pass
3. Targeted tests:
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/finalization.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/split.test.ts` - pass

## 8) Acceptance Self-Check

1. App surfaces are shorter and cleaner in high-frequency flows - done.
2. Multilayer/context-isolation principle expanded beyond travel root - done.
3. Form/action hierarchy improved without domain expansion - done.
4. Empty-state first action clarity improved - done.
5. 29B/29C accepted baseline preserved - done.
6. Recurring/travel separation + 29A/29A.1 language/analytics truth preserved - done.
