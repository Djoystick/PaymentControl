# Phase 24A — Soft Premium Multi-Rail Foundation

- Date: 2026-03-31
- Status: implemented

## 1) Product truth applied

Active monetization model is now donor-support-first:
- free-core stays fully useful,
- Premium is a soft perk after validated support,
- no hard storefront behavior,
- no aggressive upsell,
- no fake automation claims,
- owner review remains safe default.

Frozen baseline semantics for this pass:
- support threshold target: from 100 RUB,
- Premium perk target: up to 30 days per validated support period,
- primary rail: Boosty,
- secondary rail foundation: CloudTips.

## 2) Architecture changes

## 2.1 Config-driven rails

Implemented in `src/lib/config/client-env.ts`:
- new support rail config model:
  - `SupportRailId`
  - `SupportRailConfig`
  - `resolveSupportRails()`
- runtime rails:
  - Boosty (`NEXT_PUBLIC_SUPPORT_BOOSTY_URL`, with fallback),
  - CloudTips (`NEXT_PUBLIC_SUPPORT_CLOUDTIPS_URL`).
- `clientEnv.supportRails` exposed for runtime UI.
- legacy `supportProjectUrl` retained for compatibility.

## 2.2 Donor-perk constants

Implemented in `src/lib/premium/purchase-semantics.ts`:
- `DEFAULT_PREMIUM_EXPECTED_TIER = "support_bonus_30d"`
- `SOFT_SUPPORT_MIN_AMOUNT_RUB = 100`
- `SOFT_PREMIUM_ACCESS_DAYS = 30`

## 3) Runtime UX behavior

Implemented in `src/components/app/profile-scenarios-placeholder.tsx`:
- profile support/premium block now uses calm donor-support-first language.
- support rails render from config:
  - configured rails are actionable,
  - unconfigured rail slots are shown as pending setup (honest, non-broken).
- support reference code is presented as optional claim correlation aid.
- claim form and lifecycle wording now align with support/validation model.
- owner review remains explicit in user flow.

## 4) Honest behavior guarantees

The pass explicitly avoids misleading behavior:
- no claim of automatic Premium activation from external support,
- no hidden redirect to old subscription-style flow,
- no broken secondary rail links when URL is absent,
- no in-app payment processing fabrication.

## 5) Legacy compatibility policy

Intentionally retained as historical compatibility:
- legacy rail/type fields and repository/admin structures,
- old env compatibility keys.

These remain readable but are demoted from active runtime product truth.

## 6) Env model for operations

`.env.example` updated with support-rail keys:
- `NEXT_PUBLIC_SUPPORT_BOOSTY_URL`
- `NEXT_PUBLIC_SUPPORT_CLOUDTIPS_URL`
- `NEXT_PUBLIC_SUPPORT_PROJECT_URL` kept as legacy fallback.

Legacy one-time premium buy keys are retained and explicitly marked as historical compatibility.

## 7) Validation

- `npm run lint` — pass
- `npm run build` — pass

## 8) Practical next step from this foundation

When CloudTips URL is approved, set `NEXT_PUBLIC_SUPPORT_CLOUDTIPS_URL` and verify runtime card opens correctly; no code changes should be required for basic slot activation.
