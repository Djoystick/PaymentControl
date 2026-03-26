# Phase 8C - Personal vs Shared Payment Distinction Report

## Scope
Phase 8C was implemented as a narrow, local pass on top of accepted Phase 8A and partially verified Phase 8B.

Scope for this pass:
- add minimal personal/shared distinction for recurring payments
- keep personal workspace behavior stable
- enable minimal family recurring create/list path
- do not implement responsibility model, shared economics, or family dashboard

## What Was Implemented
1. Minimal payment scope marker in recurring payload
- Added `paymentScope` to recurring payment payload type with values:
  - `personal`
  - `shared`
- Scope assignment is derived from active workspace kind:
  - personal workspace -> `personal`
  - family workspace -> `shared`

2. Family-aware payments scope resolution for create/list only
- Extended payments scope resolver with optional `allowFamilyWorkspace` flag.
- Enabled family workspace in:
  - `POST /api/payments/recurring/list`
  - `POST /api/payments/recurring`
- Kept existing personal-only restriction for reminder and other personal-first payment action routes.

3. Minimal family recurring create/list path
- In active family workspace, recurring list endpoint now returns payments.
- In active family workspace, create recurring endpoint now creates payment successfully.
- Returned payment includes `paymentScope: shared`.

4. Minimal UI distinction and controlled behavior
- Recurring payments section no longer blocks all family workspaces.
- Added compact scope badge per payment card:
  - `Shared` for family scope
  - `Personal` for personal scope
- Added compact family-mode note in recurring section.
- Kept family mode narrow by disabling advanced card actions in family workspace for this phase:
  - edit
  - archive
  - mark paid / undo
  - pause / resume

5. Phase labeling/docs updates
- Updated recurring section phase badge to `Phase 8C`.
- Updated README header and verification notes for Phase 8C behavior.

## What Was Intentionally NOT Implemented
- No responsibility / "who pays" model.
- No split payments / shared balances / debt tracking.
- No family economics/dashboard layer.
- No scenario migration orchestration.
- No deep refactor of reminders/subscriptions architecture.
- No family reminder dispatch parity (family reminder paths remain restricted in this phase).

## Exact Files Created/Modified
Modified:
- `src/lib/payments/types.ts`
- `src/lib/payments/repository.ts`
- `src/lib/payments/context.ts`
- `src/app/api/payments/recurring/route.ts`
- `src/app/api/payments/recurring/list/route.ts`
- `src/components/app/recurring-payments-section.tsx`
- `README.md`

Created:
- `docs/phase8c_personal_shared_payment_distinction_report.md`

## Manual Verification Steps
1. Ensure profile has both personal and family workspaces (Phase 8A foundation).
2. Switch active workspace to family.
3. Call or trigger `POST /api/payments/recurring/list`.
   - Expected: `ok: true`, workspace kind = `family`, no personal-only rejection.
4. Create recurring payment in family workspace via UI or `POST /api/payments/recurring`.
   - Expected: `ok: true`, payment returned with `paymentScope: shared`.
5. Call `POST /api/payments/recurring/list` again in family workspace.
   - Expected: created payment listed with `paymentScope: shared`.
6. Switch back to personal workspace.
7. Call `POST /api/payments/recurring/list`.
   - Expected: existing personal payments have `paymentScope: personal`.
8. Validate preserved limitation in family workspace:
   - reminder endpoint example (`POST /api/payments/reminders/candidates`) should still reject with workspace-kind-not-supported for this phase.

## Known Limitations
- Scope marker is currently derived from workspace context (not a separate persisted DB column in this pass).
- Family recurring in 8C is intentionally minimal (create/list + marker visibility).
- Advanced family payment operations and responsibility logic are intentionally deferred.

## Runtime Confirmation Status
Confirmed in this environment:
- `npm run lint` passed.
- `npm run build` passed.
- Runtime API checks against local dev server confirmed:
  - `POST /api/payments/recurring/list` works in family workspace.
  - `POST /api/payments/recurring` works in family workspace and returns `paymentScope: shared`.
  - `POST /api/payments/recurring/list` in personal workspace returns `paymentScope: personal`.
  - Reminder candidates endpoint in family workspace remains restricted (expected for current scope).

Not confirmed in this pass:
- Full UI manual walkthrough in Telegram Mini App context for all family recurring interactions.
- Invite accept-by-second-profile flow (still constrained by current dev-fallback setup outside this pass).
