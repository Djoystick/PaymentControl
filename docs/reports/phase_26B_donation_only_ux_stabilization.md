# Phase 26B - Donation-Only UX Stabilization

- Date: 2026-04-03
- Status: implemented, pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_premium_removal.md`
- Additional source-of-truth used:
  - `docs/reports/phase_26A_premium_removal_donation_only_reset.md`
  - `docs/reports/internal_version_history.md`

## 1) What was inspected

Required runtime/config/docs surfaces inspected:
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/lib/config/client-env.ts`
- `src/lib/config/server-env.ts`
- `src/lib/auth/client.ts`
- `src/lib/auth/types.ts`
- `src/lib/i18n/localization.tsx`
- post-removal anchor and 26A report/history docs listed above

## 2) Premium-era residue found after 26A

1. Donation block in Profile was not compact enough:
- bug-report form was nested inside the donation disclosure, making donation UX look overloaded.

2. Donation cards still carried extra monetization-style emphasis:
- primary/secondary labels and stronger primary visual treatment were still present in the support block.

3. Donation copy could be shorter and more final:
- wording was correct, but still more verbose than needed for a calm, low-pressure support section.

4. Small config residue:
- `clientEnv.supportProjectUrl` export remained even though active runtime did not use it.

## 3) Runtime/config/copy cleanup done

### 3.1 Profile support/bug-report structure

File:
- `src/components/app/profile-scenarios-placeholder.tsx`

Changes:
- moved bug-report form into its own separate secondary block;
- kept donation block as its own compact, optional section at the end (`order-last`);
- removed primary/secondary badges from donation cards;
- removed strong primary-only visual emphasis from donation cards;
- simplified non-configured-rail messaging and no-links messaging;
- kept Boosty and CloudTips links as donation-only external actions.

### 3.2 Donation-only copy tightening

Files:
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/lib/i18n/localization.tsx`

Changes:
- support heading updated to calmer framing: `Support the project`;
- clarified unrestricted truth with shorter copy:
  - `Payment Control is fully usable without donation.`
  - `Donations are optional and never unlock access.`
- added RU parity for new strings;
- added RU parity for simplified setup messages:
  - `Support link is not configured yet.`
  - `No donation links are configured yet.`

### 3.3 Dead config residue cleanup

File:
- `src/lib/config/client-env.ts`

Changes:
- removed unused `supportProjectUrl` export from `clientEnv` object.

Note:
- Legacy fallback behavior for resolving Boosty URL from env remains intact; no migration/config breaking change introduced in this pass.

## 4) How donation-only support area is stabilized now

Profile donation surface now behaves as a calm secondary block:
- compact optional disclosure;
- two simple donation links (Boosty + CloudTips when configured);
- short neutral setup states when links are not configured;
- explicit no-unlock/no-access-gate wording;
- no Premium/claim/review/admin language;
- no storefront-style urgency.

## 5) What was intentionally not changed

1. No monetization or entitlement logic was added.
2. No Premium domain was reintroduced.
3. No DB schema or migration changes in this pass.
4. No reminders/history/payment-management/family business logic changes.
5. No onboarding behavior changes.
6. No compatibility-boundary refactor beyond the one dead export removal.

## 6) Risks and follow-ups

Residual risk:
- `src/lib/i18n/localization.tsx` still contains historical premium-era strings that are not active runtime truth; they do not drive current behavior but remain as legacy dictionary residue.

Follow-up suggestion (separate future pass, optional):
- perform a narrow i18n-key usage audit and remove only truly unreachable legacy support/premium copy keys after confirming no route/tooling dependency.

## 7) Exact recommended next step

Run focused manual profile UX verification in Telegram Mini App context:
1. Open Profile and confirm bug-report section is separate from donation section.
2. Open donation section and confirm compact wording/no unlock promises.
3. Confirm Boosty and CloudTips links behave as plain external donation links.
4. Confirm reminders/history/family/core actions remain unchanged.

## 8) Concise manual verification notes

Not manually executed in this coding pass (user/device interaction required).

Local automated validation executed:
- `npm run lint` - pass
- `npm run build` - pass
