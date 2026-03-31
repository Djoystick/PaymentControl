# Phase 24D - Optional Rail Activation Hardening

- Date: 2026-03-31
- Status: implemented (runtime/config/copy hardening), pending manual verification
- Main source of truth: `docs/anchors/payment_control_master_anchor_post_soft_premium_reset.md`
- Additional source-of-truth used:
  - `docs/reports/phase_24A_full_product_audit_soft_premium_foundation_uiux_rebase.md`
  - `docs/reports/phase_24A_runtime_surface_inventory.md`
  - `docs/reports/phase_24A_soft_premium_multi_rail_foundation.md`
  - `docs/reports/phase_24B_localization_and_copy_parity_polish.md`
  - `docs/reports/phase_24C_support_claim_operational_clarity.md`
  - `docs/reports/internal_version_history.md`

## 1) Files/components/config inspected

- `src/lib/config/client-env.ts`
- `src/components/app/profile-scenarios-placeholder.tsx`
- `src/lib/i18n/localization.tsx`
- `src/app/globals.css` (shared action-card behavior used by rail cards)
- `.env.example`
- `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md` (Next env semantics check)

## 2) Rail hardening issues found

1. Pending rail card still looked interactive on hover/active because shared `pc-action-card` hover/active styles were applied to disabled cards.
2. Pending secondary slot wording was generic; it did not clearly say CloudTips is prepared but not enabled yet.
3. Legacy fallback semantics could label a non-Boosty `NEXT_PUBLIC_SUPPORT_PROJECT_URL` as `Boosty`, which is misleading for primary rail identity.
4. Secondary URL misconfiguration could create duplicate primary/secondary links if the same URL was set for both rails.
5. External voluntary support context near rail CTAs could be clearer at first glance.

## 3) Exact runtime/config/copy changes made

## 3.1 `src/lib/config/client-env.ts`

- Added `DEFAULT_BOOSTY_SUPPORT_URL` constant to centralize primary fallback.
- Added `isBoostySupportUrl()` host guard.
- Split rail resolution into focused helpers:
  - `resolveBoostySupportRailUrl()`
  - `resolveCloudTipsSupportRailUrl(primaryRailUrl)`
- Hardening behavior:
  - Boosty keeps explicit `NEXT_PUBLIC_SUPPORT_BOOSTY_URL` first.
  - Legacy `NEXT_PUBLIC_SUPPORT_PROJECT_URL` is used as Boosty fallback only if it is a Boosty URL.
  - Otherwise Boosty falls back to known default Boosty URL.
  - CloudTips URL is ignored when empty/invalid or when it duplicates the primary rail URL.

## 3.2 `src/components/app/profile-scenarios-placeholder.tsx`

- Added concise rail helper line: support is optional and external.
- Added explicit rail identity badge on cards:
  - primary rail: `Primary` (success emphasis),
  - secondary rail: `Secondary`.
- Pending CloudTips card now uses CloudTips-specific prepared-state wording.
- Active rail links now use `rel="noopener noreferrer"` for safer external open behavior.

## 3.3 `src/app/globals.css`

- Added disabled-state interaction hardening for `pc-action-card`:
  - neutralized hover accent for `aria-disabled="true"`,
  - disabled active press transform.

This removes false-action affordance from pending rail cards.

## 3.4 `src/lib/i18n/localization.tsx`

- Added RU parity keys for new 24D strings:
  - optional external support helper text,
  - `Secondary` rail badge,
  - CloudTips-specific pending-slot wording.

## 3.5 `.env.example`

- Clarified support rail contract comments:
  - Boosty remains primary active rail.
  - Legacy `NEXT_PUBLIC_SUPPORT_PROJECT_URL` should remain Boosty-aligned.
  - CloudTips key is optional and can stay empty.
  - invalid/duplicate CloudTips values are ignored and remain pending.

## 4) Configured vs pending secondary rail behavior now

- If `NEXT_PUBLIC_SUPPORT_CLOUDTIPS_URL` is configured with a valid URL and it is not the same as primary:
  - CloudTips renders as active secondary rail,
  - card is actionable,
  - CTA opens external URL in a new tab safely.
- If CloudTips URL is missing, empty, invalid, or duplicates primary URL:
  - CloudTips renders as prepared/pending slot,
  - no link is rendered,
  - card stays visibly non-actionable and honest.

## 5) Intentionally not changed

- No schema or migration changes.
- No webhook/provider API integration.
- No automation/auto-activation implementation.
- No claim flow model rewrite.
- No owner-review fallback behavior changes.
- No changes to 4-tab shell, reminders/history/family/core payment logic, or workspace/onboarding/help/bug-report flows.

## 6) Risks and follow-ups

1. URL-domain validation is intentionally strict only for Boosty fallback identity; CloudTips still accepts any valid external URL to avoid blocking operational links routed through alternate domains.
2. Optional future hardening: add explicit owner/admin diagnostics showing when secondary URL is ignored because it duplicates primary.

## 7) Validation

- `npm run lint` - pass
- `npm run build` - pass

## 8) Manual verification notes (concise)

1. With empty `NEXT_PUBLIC_SUPPORT_CLOUDTIPS_URL`, open Profile -> Support rails and verify CloudTips shows pending, non-clickable, honest wording.
2. Set valid CloudTips URL, rebuild/reload, verify CloudTips card becomes actionable and opens external page in new tab.
3. Set CloudTips URL equal to Boosty URL, verify CloudTips returns to pending state (no duplicate actionable rail).
4. Verify no subscription-first wording appears in updated support rail area in RU/EN.

## 9) Recommended next step

Phase 24E - Legacy monetization debt minimization:
- selectively isolate/demote historical naming (`purchase_*`) in internal code paths where compatibility risk is low,
- keep owner-review-safe donor-support runtime truth unchanged.
