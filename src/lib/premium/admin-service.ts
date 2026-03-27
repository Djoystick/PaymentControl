import "server-only";
import type {
  PremiumAdminCampaignPayload,
  PremiumAdminTargetPayload,
} from "@/lib/auth/types";
import type { ProfilePayload } from "@/lib/auth/types";
import { getProfileByTelegramUserId } from "@/lib/profile/repository";
import { readPremiumEntitlementState } from "@/lib/premium/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAdminTargetTelegramUserId } from "@/lib/admin/access";

type AdminServiceFailureReason =
  | "INVALID_TARGET_TELEGRAM_ID"
  | "TARGET_NOT_FOUND"
  | "INVALID_INPUT"
  | "CAMPAIGN_NOT_FOUND"
  | "FOUNDATION_NOT_READY"
  | "ACTION_FAILED";

type AdminServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: AdminServiceFailureReason; message: string };

type PremiumEntitlementActiveRow = {
  id: string;
  metadata: Record<string, unknown> | null;
};

type PremiumGiftCampaignRow = {
  id: string;
  campaign_code: string;
  title: string;
  campaign_status: PremiumAdminCampaignPayload["status"];
  total_quota: number;
  premium_duration_days: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

type PremiumGiftCampaignClaimUsageRow = {
  campaign_id: string;
  claim_status: string;
};

const campaignRowSelection =
  "id, campaign_code, title, campaign_status, total_quota, premium_duration_days, starts_at, ends_at, created_at, updated_at";

const campaignCodePattern = /^[a-z0-9_-]{4,64}$/;
const uuidLikePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isFoundationMissingError = (errorCode?: string): boolean => {
  return errorCode === "42P01" || errorCode === "PGRST205";
};

const asIsoOrNull = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const toCampaignPayload = (
  campaign: PremiumGiftCampaignRow,
  usage: { attempts: number; granted: number },
): PremiumAdminCampaignPayload => {
  return {
    id: campaign.id,
    code: campaign.campaign_code,
    title: campaign.title,
    status: campaign.campaign_status,
    totalQuota: campaign.total_quota,
    quotaUsed: usage.granted,
    claimsTotal: usage.attempts,
    premiumDurationDays: campaign.premium_duration_days,
    startsAt: campaign.starts_at,
    endsAt: campaign.ends_at,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
  };
};

const resolveTargetProfile = async (
  targetTelegramUserId: string,
): Promise<AdminServiceResult<ProfilePayload>> => {
  const normalizedTelegramUserId =
    normalizeAdminTargetTelegramUserId(targetTelegramUserId);
  if (!normalizedTelegramUserId) {
    return {
      ok: false,
      reason: "INVALID_TARGET_TELEGRAM_ID",
      message: "Target Telegram user id must be numeric.",
    };
  }

  const profile = await getProfileByTelegramUserId(normalizedTelegramUserId);
  if (!profile) {
    return {
      ok: false,
      reason: "TARGET_NOT_FOUND",
      message: "Target profile was not found.",
    };
  }

  return { ok: true, data: profile };
};

const toTargetPayload = async (
  profile: ProfilePayload,
): Promise<AdminServiceResult<PremiumAdminTargetPayload>> => {
  const workspaceIdForRead = profile.activeWorkspaceId ?? "virtual-target";
  const premiumState = await readPremiumEntitlementState(
    profile.id,
    workspaceIdForRead,
  );
  if (!premiumState) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to read target premium state.",
    };
  }

  return {
    ok: true,
    data: {
      profileId: profile.id,
      telegramUserId: profile.telegramUserId,
      username: profile.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      activeWorkspaceId: profile.activeWorkspaceId,
      premium: premiumState,
    },
  };
};

export const resolvePremiumAdminTarget = async (
  targetTelegramUserId: string,
): Promise<AdminServiceResult<PremiumAdminTargetPayload>> => {
  const profileResult = await resolveTargetProfile(targetTelegramUserId);
  if (!profileResult.ok) {
    return profileResult;
  }

  return toTargetPayload(profileResult.data);
};

export const grantManualPremiumByTelegramUserId = async (params: {
  adminTelegramUserId: string;
  targetTelegramUserId: string;
  durationDays: number | null;
  note?: string;
}): Promise<AdminServiceResult<{ target: PremiumAdminTargetPayload; entitlementId: string }>> => {
  const profileResult = await resolveTargetProfile(params.targetTelegramUserId);
  if (!profileResult.ok) {
    return profileResult;
  }

  if (
    params.durationDays !== null &&
    (!Number.isInteger(params.durationDays) || params.durationDays <= 0)
  ) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Duration days must be a positive integer or empty.",
    };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const now = new Date();
  const startsAtIso = now.toISOString();
  const endsAtIso =
    params.durationDays === null
      ? null
      : new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000)
          .toISOString();
  const note = params.note?.trim() ?? "";

  const { data, error } = await supabase
    .from("premium_entitlements")
    .insert({
      scope: "profile",
      profile_id: profileResult.data.id,
      workspace_id: null,
      entitlement_source: "manual_admin",
      status: "active",
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      metadata: {
        grant_origin: "owner_admin_console",
        granted_by_admin_telegram_user_id: params.adminTelegramUserId,
        target_telegram_user_id: profileResult.data.telegramUserId,
        note: note || null,
      },
    })
    .select("id")
    .single<{ id: string }>();

  if (error?.code === "42P01" || error?.code === "PGRST205") {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message:
        "Premium entitlement foundation is not ready. Apply Phase 13A migration.",
    };
  }

  if (error || !data) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to grant manual premium entitlement.",
    };
  }

  const targetResult = await toTargetPayload(profileResult.data);
  if (!targetResult.ok) {
    return targetResult;
  }

  return {
    ok: true,
    data: {
      target: targetResult.data,
      entitlementId: data.id,
    },
  };
};

export const revokePremiumByTelegramUserId = async (params: {
  adminTelegramUserId: string;
  targetTelegramUserId: string;
  note?: string;
}): Promise<AdminServiceResult<{ target: PremiumAdminTargetPayload; revokedCount: number }>> => {
  const profileResult = await resolveTargetProfile(params.targetTelegramUserId);
  if (!profileResult.ok) {
    return profileResult;
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const nowIso = new Date().toISOString();
  const { data: activeRows, error: activeRowsError } = await supabase
    .from("premium_entitlements")
    .select("id, metadata")
    .eq("scope", "profile")
    .eq("profile_id", profileResult.data.id)
    .eq("status", "active")
    .returns<PremiumEntitlementActiveRow[]>();

  if (activeRowsError?.code === "42P01" || activeRowsError?.code === "PGRST205") {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message:
        "Premium entitlement foundation is not ready. Apply Phase 13A migration.",
    };
  }

  if (activeRowsError || !activeRows) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to read active premium entitlements for target.",
    };
  }

  const note = params.note?.trim() ?? "";
  let revokedCount = 0;

  for (const row of activeRows) {
    const metadata = {
      ...(row.metadata ?? {}),
      revoke_origin: "owner_admin_console",
      revoked_by_admin_telegram_user_id: params.adminTelegramUserId,
      revoked_at: nowIso,
      note: note || null,
    };

    const { error: updateError } = await supabase
      .from("premium_entitlements")
      .update({
        status: "revoked",
        ends_at: nowIso,
        metadata,
        updated_at: nowIso,
      })
      .eq("id", row.id);

    if (updateError) {
      return {
        ok: false,
        reason: "ACTION_FAILED",
        message: "Failed to revoke one of target premium entitlements.",
      };
    }

    revokedCount += 1;
  }

  const targetResult = await toTargetPayload(profileResult.data);
  if (!targetResult.ok) {
    return targetResult;
  }

  return {
    ok: true,
    data: {
      target: targetResult.data,
      revokedCount,
    },
  };
};

export const createPremiumGiftCampaign = async (params: {
  adminTelegramUserId: string;
  code: string;
  title: string;
  totalQuota: number;
  premiumDurationDays: number;
  startsAt?: string;
  endsAt?: string;
}): Promise<AdminServiceResult<PremiumAdminCampaignPayload>> => {
  const normalizedCode = params.code.trim().toLowerCase();
  const normalizedTitle = params.title.trim();
  if (!campaignCodePattern.test(normalizedCode)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message:
        "Campaign code must contain 4-64 symbols: lowercase letters, numbers, underscore, dash.",
    };
  }

  if (!normalizedTitle) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Campaign title is required.",
    };
  }

  if (!Number.isInteger(params.totalQuota) || params.totalQuota <= 0) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Campaign quota must be a positive integer.",
    };
  }

  if (
    !Number.isInteger(params.premiumDurationDays) ||
    params.premiumDurationDays <= 0
  ) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Premium duration days must be a positive integer.",
    };
  }

  const startsAtIso = asIsoOrNull(params.startsAt);
  const endsAtIso = asIsoOrNull(params.endsAt);
  if ((params.startsAt?.trim() && !startsAtIso) || (params.endsAt?.trim() && !endsAtIso)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Campaign start/end date is invalid.",
    };
  }

  if (startsAtIso && endsAtIso && new Date(endsAtIso) <= new Date(startsAtIso)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Campaign end must be later than campaign start.",
    };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("premium_gift_campaigns")
    .insert({
      campaign_code: normalizedCode,
      title: normalizedTitle,
      campaign_status: "active",
      total_quota: params.totalQuota,
      premium_duration_days: params.premiumDurationDays,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      created_at: nowIso,
      updated_at: nowIso,
      metadata: {
        created_by_admin_telegram_user_id: params.adminTelegramUserId,
        creation_origin: "owner_admin_console",
      },
    })
    .select(campaignRowSelection)
    .single<PremiumGiftCampaignRow>();

  if (isFoundationMissingError(error?.code)) {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message:
        "Gift campaign foundation is not ready. Apply Phase 13B migration first.",
    };
  }

  if (error?.code === "23505") {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Campaign code already exists.",
    };
  }

  if (error || !data) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to create gift campaign.",
    };
  }

  return {
    ok: true,
    data: toCampaignPayload(data, {
      attempts: 0,
      granted: 0,
    }),
  };
};

export const listPremiumGiftCampaignsWithUsage = async (): Promise<
  AdminServiceResult<PremiumAdminCampaignPayload[]>
> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const { data: campaigns, error: campaignsError } = await supabase
    .from("premium_gift_campaigns")
    .select(campaignRowSelection)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<PremiumGiftCampaignRow[]>();

  if (isFoundationMissingError(campaignsError?.code)) {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message:
        "Gift campaign foundation is not ready. Apply Phase 13B migration first.",
    };
  }

  if (campaignsError || !campaigns) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to read gift campaign list.",
    };
  }

  if (campaigns.length === 0) {
    return {
      ok: true,
      data: [],
    };
  }

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const { data: claimRows, error: claimRowsError } = await supabase
    .from("premium_gift_campaign_claims")
    .select("campaign_id, claim_status")
    .in("campaign_id", campaignIds)
    .returns<PremiumGiftCampaignClaimUsageRow[]>();

  if (isFoundationMissingError(claimRowsError?.code)) {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message:
        "Gift campaign foundation is not ready. Apply Phase 13B migration first.",
    };
  }

  if (claimRowsError || !claimRows) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to read gift campaign usage rows.",
    };
  }

  const usageMap = new Map<string, { attempts: number; granted: number }>();
  for (const row of claimRows) {
    const usage = usageMap.get(row.campaign_id) ?? { attempts: 0, granted: 0 };
    usage.attempts += 1;
    if (row.claim_status === "granted") {
      usage.granted += 1;
    }

    usageMap.set(row.campaign_id, usage);
  }

  return {
    ok: true,
    data: campaigns.map((campaign) =>
      toCampaignPayload(campaign, usageMap.get(campaign.id) ?? { attempts: 0, granted: 0 }),
    ),
  };
};

export const deactivatePremiumGiftCampaign = async (
  campaignId: string,
): Promise<AdminServiceResult<PremiumAdminCampaignPayload>> => {
  const normalizedCampaignId = campaignId.trim();
  if (!uuidLikePattern.test(normalizedCampaignId)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Campaign id is invalid.",
    };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const nowIso = new Date().toISOString();
  const { data: campaign, error: campaignError } = await supabase
    .from("premium_gift_campaigns")
    .update({
      campaign_status: "ended",
      updated_at: nowIso,
    })
    .eq("id", normalizedCampaignId)
    .select(campaignRowSelection)
    .maybeSingle<PremiumGiftCampaignRow>();

  if (isFoundationMissingError(campaignError?.code)) {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message:
        "Gift campaign foundation is not ready. Apply Phase 13B migration first.",
    };
  }

  if (campaignError) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to deactivate campaign.",
    };
  }

  if (!campaign) {
    return {
      ok: false,
      reason: "CAMPAIGN_NOT_FOUND",
      message: "Campaign not found.",
    };
  }

  const { data: claimRows, error: claimRowsError } = await supabase
    .from("premium_gift_campaign_claims")
    .select("campaign_id, claim_status")
    .eq("campaign_id", campaign.id)
    .returns<PremiumGiftCampaignClaimUsageRow[]>();

  if (claimRowsError) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Campaign was deactivated, but usage read failed.",
    };
  }

  const usage = {
    attempts: claimRows?.length ?? 0,
    granted: (claimRows ?? []).filter((row) => row.claim_status === "granted").length,
  };

  return {
    ok: true,
    data: toCampaignPayload(campaign, usage),
  };
};
