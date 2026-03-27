import "server-only";
import type { PremiumEntitlementStatePayload } from "@/lib/auth/types";
import {
  readActiveProfilePremiumEntitlement,
  readActiveWorkspacePremiumEntitlement,
} from "@/lib/premium/repository";

const uuidLikePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuidLike = (value: string): boolean => {
  return uuidLikePattern.test(value);
};

export const readPremiumEntitlementState = async (
  profileId: string,
  workspaceId: string,
): Promise<PremiumEntitlementStatePayload | null> => {
  const now = new Date();

  const shouldReadWorkspaceEntitlement = isUuidLike(workspaceId);
  const [profileResult, workspaceResult] = await Promise.all([
    readActiveProfilePremiumEntitlement(profileId, now),
    shouldReadWorkspaceEntitlement
      ? readActiveWorkspacePremiumEntitlement(workspaceId, now)
      : Promise.resolve({ ok: true, entitlement: null }),
  ]);

  if (!profileResult.ok || !workspaceResult.ok) {
    return null;
  }

  const profileEntitlement = profileResult.entitlement;
  const workspaceEntitlement = workspaceResult.entitlement;
  const effectiveEntitlement = workspaceEntitlement ?? profileEntitlement;

  return {
    plan: effectiveEntitlement ? "premium" : "free",
    isPremium: Boolean(effectiveEntitlement),
    effectiveScope: effectiveEntitlement?.scope ?? null,
    effectiveSource: effectiveEntitlement?.source ?? null,
    startsAt: effectiveEntitlement?.startsAt ?? null,
    endsAt: effectiveEntitlement?.endsAt ?? null,
    profileEntitlement,
    workspaceEntitlement,
  };
};
