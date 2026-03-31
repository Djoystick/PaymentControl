import type { PremiumPurchaseClaimRail } from "@/lib/auth/types";

export const LEGACY_PREMIUM_PURCHASE_RAIL: PremiumPurchaseClaimRail = "boosty_premium";
export const ONE_TIME_PREMIUM_PURCHASE_RAIL: PremiumPurchaseClaimRail = "one_time_premium";

export const SUPPORTED_PREMIUM_PURCHASE_RAILS: PremiumPurchaseClaimRail[] = [
  ONE_TIME_PREMIUM_PURCHASE_RAIL,
  LEGACY_PREMIUM_PURCHASE_RAIL,
];

export const DEFAULT_PREMIUM_PURCHASE_RAIL: PremiumPurchaseClaimRail =
  ONE_TIME_PREMIUM_PURCHASE_RAIL;
export const DEFAULT_PREMIUM_EXPECTED_TIER = "support_bonus_30d";
export const SOFT_SUPPORT_MIN_AMOUNT_RUB = 100;
export const SOFT_PREMIUM_ACCESS_DAYS = 30;

export const isSupportedPremiumPurchaseRail = (
  rail: string,
): rail is PremiumPurchaseClaimRail => {
  return SUPPORTED_PREMIUM_PURCHASE_RAILS.includes(rail as PremiumPurchaseClaimRail);
};

// Current runtime truth aliases (donor-support-first).
// Keep `PremiumPurchase*` exports above for backward compatibility.
export const LEGACY_SUPPORT_CLAIM_RAIL = LEGACY_PREMIUM_PURCHASE_RAIL;
export const CURRENT_SUPPORT_CLAIM_RAIL = ONE_TIME_PREMIUM_PURCHASE_RAIL;
export const SUPPORTED_SUPPORT_CLAIM_RAILS = SUPPORTED_PREMIUM_PURCHASE_RAILS;
export const DEFAULT_SUPPORT_CLAIM_RAIL = DEFAULT_PREMIUM_PURCHASE_RAIL;

export const isSupportedSupportClaimRail = (
  rail: string,
): rail is PremiumPurchaseClaimRail => {
  return isSupportedPremiumPurchaseRail(rail);
};
