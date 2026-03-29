import type { PremiumPurchaseClaimRail } from "@/lib/auth/types";

export const LEGACY_PREMIUM_PURCHASE_RAIL: PremiumPurchaseClaimRail = "boosty_premium";
export const ONE_TIME_PREMIUM_PURCHASE_RAIL: PremiumPurchaseClaimRail = "one_time_premium";

export const SUPPORTED_PREMIUM_PURCHASE_RAILS: PremiumPurchaseClaimRail[] = [
  ONE_TIME_PREMIUM_PURCHASE_RAIL,
  LEGACY_PREMIUM_PURCHASE_RAIL,
];

export const DEFAULT_PREMIUM_PURCHASE_RAIL: PremiumPurchaseClaimRail =
  ONE_TIME_PREMIUM_PURCHASE_RAIL;
export const DEFAULT_PREMIUM_EXPECTED_TIER = "premium_one_time";

export const isSupportedPremiumPurchaseRail = (
  rail: string,
): rail is PremiumPurchaseClaimRail => {
  return SUPPORTED_PREMIUM_PURCHASE_RAILS.includes(rail as PremiumPurchaseClaimRail);
};
