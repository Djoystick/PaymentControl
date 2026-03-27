import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GiftPremiumClaimResultPayload } from "@/lib/auth/types";

type GiftCampaignClaimRpcRow = {
  claim_status: GiftPremiumClaimResultPayload["status"];
  claim_id: string;
  campaign_id: string | null;
  entitlement_id: string | null;
  entitlement_granted: boolean;
  quota_total: number;
  quota_used: number;
  message: string;
};

const uuidLikePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuidLike = (value: string): boolean => {
  return uuidLikePattern.test(value);
};

export const claimGiftPremiumCampaign = async (
  profileId: string,
  workspaceId: string,
  campaignCode: string,
): Promise<GiftPremiumClaimResultPayload | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const workspaceIdForClaim = isUuidLike(workspaceId) ? workspaceId : null;
  const { data, error } = await supabase.rpc("claim_premium_gift_campaign", {
    p_campaign_code: campaignCode,
    p_profile_id: profileId,
    p_workspace_id: workspaceIdForClaim,
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row = data[0] as GiftCampaignClaimRpcRow;
  return {
    claimId: row.claim_id,
    campaignId: row.campaign_id,
    entitlementId: row.entitlement_id,
    status: row.claim_status,
    entitlementGranted: row.entitlement_granted,
    quotaTotal: row.quota_total,
    quotaUsed: row.quota_used,
    message: row.message,
  };
};
