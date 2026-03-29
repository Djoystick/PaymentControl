# Phase 22D - Claim Lifecycle UX States + Verification Pack

## Objective of the Pass
Finalize the user-facing claim lifecycle layer in Profile so monetization MVP behavior is calm, understandable, and operationally verifiable end-to-end:
- keep Buy Premium / Support / Claim rails clearly separated
- make pending/approved/rejected states unambiguous
- make status refresh trustworthy
- provide a formal manual verification pack for MVP closure

## Source-of-Truth Used
- `docs/payment_control_master_anchor_2026-03-28_v2.md`
- Confirmed state from prompt:
  - Phase 19B, 19C, 20B, 20C, 20D, 20E, 20G, 20H manual verified
  - Phase 21A.1 manual verified
  - Phase 13B formal closure completed
  - true first-run onboarding verification completed
  - Phase 22A manual verified
  - Phase 22C manual verified
  - Phase 22B implemented and manually accepted
- Mandatory monetization model:
  - Boosty-first
  - manual-claim-first
  - automation-later
  - free-core remains intact
- User-provided real external rails for current defaults:
  - Buy Premium: `https://boosty.to/tvoy_kosmonavt/purchase/3867384?ssource=DIRECT&share=subscription_link`
  - Support: `https://boosty.to/tvoy_kosmonavt/posts/cf4114af-41b0-4a6e-b944-be6ded323c21`

## Files Inspected
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/lib/config/client-env.ts`
- `src/lib/i18n/localization.tsx`
- `src/lib/auth/client.ts`
- `src/app/api/premium/purchase-claims/mine/route.ts`
- `src/components/app/premium-admin-console.tsx` (compatibility check)
- `docs/reports/internal_version_history.md`

## Files Changed
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/lib/config/client-env.ts`
- `src/lib/i18n/localization.tsx`
- `docs/reports/internal_version_history.md`
- `docs/reports/phase_22D_claim_lifecycle_ux_states_and_verification_pack.md` (new)

## How Claim Lifecycle UX States Were Improved

### 1) Explicit lifecycle card in Profile monetization block
Replaced ambiguous claim-status-only pill behavior with a compact lifecycle state card that always communicates:
- current state label
- what it means now
- what to do next (when action is needed)

Handled states:
- no claim yet
- submitted/pending review
- approved
- rejected
- closed states (expired/cancelled/draft fallback)
- premium already active

### 2) Pending / approved / rejected clarity
- **Pending**: explicitly states owner review is in progress and core features continue working.
- **Approved**: explicitly states approval succeeded and tells user to refresh status if premium indicator is still stale.
- **Rejected**: explicitly states claim was rejected, asks user to update proof and submit again when ready.

### 3) Trusted refresh/status retrieval cues
Added explicit “claim status last checked” timestamp in Profile claim lifecycle area.
- timestamp updates on successful reads
- timestamp also updates on failed reads (so user sees check attempt happened)
- refresh action now also triggers context refresh on non-silent checks, improving approved-state reflection trust

### 4) Submission UX cleanup
After successful claim submission:
- latest claim state updates immediately
- status check timestamp updates
- proof inputs are reset to keep the flow clean and reduce accidental duplicate payload reuse

### 5) Real external rails aligned as current defaults
Updated client config fallback URLs to current real Boosty rails, while preserving env override behavior:
- `NEXT_PUBLIC_PREMIUM_BUY_URL` still overrides fallback
- `NEXT_PUBLIC_SUPPORT_PROJECT_URL` still overrides fallback

## How Pending / Approved / Rejected Are Presented
- Pending/submitted: warning-tone lifecycle state + concise “waiting for owner review” guidance.
- Approved: success-tone lifecycle state + clear premium-sync guidance.
- Rejected: warning-tone lifecycle state + explicit recovery path to update proof and resubmit.
- No claim: neutral lifecycle state + clear instruction to use Claim Premium after external payment.

## How Rail Separation Remains Clear
- Buy Premium and Support stay as separate visible cards with distinct wording and CTA hierarchy.
- Claim Premium remains a separate operational lane (`I already paid / Claim Premium`) and is not mixed with support rail semantics.
- Support rail still explicitly states it does not auto-grant Premium.

## Schema / Migrations
- No schema changes.
- No migrations added.

## What Was Intentionally NOT Changed
- No premium/free policy redesign.
- No storefront-heavy redesign.
- No webhook/API automation assumptions.
- No owner review queue redesign (22C preserved).
- No gift-campaign redesign.
- No Home/Reminders monetization insertion.
- No business-logic changes outside claim lifecycle UX/status presentation.

## Validation Executed
- `npm run lint` - passed
- `npm run build` - passed

## Exact Manual Verification Pack (End-to-End Monetization MVP)

### A) Free user baseline + rail separation
1. Open app as free user.
2. Go to Profile -> `Premium and support`.
3. Verify all three rails are visible and distinct:
   - Buy Premium
   - Support the project
   - I already paid / Claim Premium
4. Verify no paywall blocks core product usage.

### B) External rails opening
1. Tap `Buy Premium` and verify external URL opens to subscription rail.
2. Tap `Support the project` and verify external URL opens to one-time support rail.
3. Verify support wording does not promise automatic premium entitlement.

### C) Claim submission (user side)
1. Return to Profile.
2. Open `I already paid / Claim Premium`.
3. Fill at least one proof field (reference/text/handle).
4. Tap `Submit premium claim`.
5. Verify success feedback appears.
6. Verify lifecycle state transitions to pending/in-review.
7. Verify `Claim status last checked` is populated.

### D) Pending state behavior
1. While claim is not yet reviewed by owner, verify pending guidance is clear and calm.
2. Verify user can still use core free features.
3. Tap `Refresh claim status`; verify status check updates and remains understandable.

### E) Owner approve flow + approved reflection
1. Login/open owner account.
2. In owner admin queue, approve the submitted claim.
3. Return to claimant profile.
4. Tap `Refresh claim status`.
5. Verify lifecycle state shows approved and premium state reflects as active.
6. Verify premium source/scope/expiry context remains readable if available.

### F) Owner reject flow + rejected reflection
1. Submit another test claim from user side.
2. In owner queue, reject claim (with/without note).
3. Return to claimant profile and refresh claim status.
4. Verify rejected state is shown with action guidance (update proof, resubmit).
5. Verify core free access remains intact.

### G) Owner-only boundary
1. Verify claim review queue/actions are visible only to owner.
2. Verify normal user cannot access owner review controls.

### H) Free-core unaffected
1. Re-check critical flows while in free state:
   - Reminders
   - Mark paid / Undo paid
   - Workspace switching
2. Confirm no monetization state blocks core utility.

## Risks / Follow-up Notes
1. Claim lifecycle is MVP-complete but intentionally compact; deeper claim history UI is deferred.
2. Approved-state reflection still depends on refresh cycle timing; explicit “last checked” and refresh guidance now reduces ambiguity.
3. External URL defaults are now real rails, but production should still prefer explicit env values for safer operations.

## Ready for Formal Manual Closure?
Yes, pending manual run of the verification pack above.

From code/UX readiness perspective, monetization MVP is now operationally complete for formal manual closure:
- entry rails separated (22B),
- claim foundation present (22A),
- owner reconciliation present (22C),
- lifecycle UX and verification pack finalized (22D).

## Encoding safety check
- Touched Russian-visible file: `src/lib/i18n/localization.tsx`.
- Added Russian strings were re-checked for UTF-8 readability.
- New markdown report/history entries remain readable and free of mojibake.
- No garbled Cyrillic detected in touched files.

## Pre-report self-check against prompt/scope
1. Claim lifecycle states are now explicit and compact - PASS.
2. Pending/approved/rejected meanings are clear with next-step guidance - PASS.
3. Buy Premium / Support / Claim rails remain clearly separated - PASS.
4. Status refresh trust improved with last-checked signal and context refresh on manual checks - PASS.
5. Rejected recovery path is present without blocking free-core - PASS.
6. Approved reflection is understandable and tied to refresh behavior - PASS.
7. Owner-only boundary and existing admin model are preserved - PASS.
8. No schema/migration changes introduced - PASS.
9. Validation executed (`npm run lint`, `npm run build`) - PASS.
10. Full manual verification pack for end-to-end monetization MVP closure is included - PASS.
