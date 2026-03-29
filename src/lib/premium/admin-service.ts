import "server-only";
import type {
  PremiumAdminCampaignPayload,
  PremiumAdminPurchaseClaimReviewDecision,
  PremiumAdminTargetPayload,
  PremiumPurchaseClaimPayload,
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
  | "CLAIM_NOT_FOUND"
  | "CLAIM_INVALID_STATE"
  | "FOUNDATION_NOT_READY"
  | "ACTION_FAILED";

type AdminServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: AdminServiceFailureReason; message: string };

type PremiumEntitlementActiveRow = {
  id: string;
  metadata: Record<string, unknown> | null;
};

type ActivePurchaseEntitlementRow = {
  id: string;
  entitlement_source: "one_time_purchase" | "boosty";
  starts_at: string;
  ends_at: string | null;
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

type PremiumPurchaseClaimRow = {
  id: string;
  profile_id: string;
  workspace_id: string | null;
  telegram_user_id: string;
  claim_rail: PremiumPurchaseClaimPayload["claimRail"];
  expected_tier: string;
  external_payer_handle: string | null;
  payment_proof_reference: string | null;
  payment_proof_text: string | null;
  claim_status: PremiumPurchaseClaimPayload["status"];
  purchase_intent_id: string | null;
  purchase_correlation_code: string | null;
  claim_note: string | null;
  admin_note: string | null;
  entitlement_id: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by_admin_telegram_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const campaignRowSelection =
  "id, campaign_code, title, campaign_status, total_quota, premium_duration_days, starts_at, ends_at, created_at, updated_at";
const purchaseClaimSelection =
  "id, profile_id, workspace_id, telegram_user_id, claim_rail, expected_tier, external_payer_handle, payment_proof_reference, payment_proof_text, claim_status, purchase_intent_id, purchase_correlation_code, claim_note, admin_note, entitlement_id, submitted_at, reviewed_at, reviewed_by_admin_telegram_user_id, metadata, created_at, updated_at";
const reviewableClaimStatuses = new Set<PremiumPurchaseClaimPayload["status"]>([
  "submitted",
  "pending_review",
]);

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

const wait = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

const toPurchaseClaimPayload = (
  row: PremiumPurchaseClaimRow,
): PremiumPurchaseClaimPayload => {
  return {
    id: row.id,
    profileId: row.profile_id,
    workspaceId: row.workspace_id,
    telegramUserId: row.telegram_user_id,
    claimRail: row.claim_rail,
    expectedTier: row.expected_tier,
    externalPayerHandle: row.external_payer_handle,
    paymentProofReference: row.payment_proof_reference,
    paymentProofText: row.payment_proof_text,
    status: row.claim_status,
    purchaseIntentId: row.purchase_intent_id,
    purchaseCorrelationCode: row.purchase_correlation_code,
    claimNote: row.claim_note,
    adminNote: row.admin_note,
    entitlementId: row.entitlement_id,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedByAdminTelegramUserId: row.reviewed_by_admin_telegram_user_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const resolveTierDurationDays = (expectedTier: string): number => {
  const normalizedTier = expectedTier.trim().toLowerCase();
  if (normalizedTier.includes("lifetime") || normalizedTier.includes("forever")) {
    return 3650;
  }

  if (
    normalizedTier.includes("year") ||
    normalizedTier.includes("annual") ||
    normalizedTier.includes("365")
  ) {
    return 365;
  }

  if (normalizedTier.includes("half") || normalizedTier.includes("180")) {
    return 180;
  }

  if (normalizedTier.includes("quarter") || normalizedTier.includes("90")) {
    return 90;
  }

  if (normalizedTier.includes("60")) {
    return 60;
  }

  if (normalizedTier.includes("14")) {
    return 14;
  }

  if (normalizedTier.includes("week") || normalizedTier.includes("7")) {
    return 7;
  }

  return 30;
};

const addDaysIso = (baseIso: string, days: number): string => {
  const parsed = new Date(baseIso);
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
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

const readTargetPayloadWithExpectation = async (
  profile: ProfilePayload,
  expectedPremiumState: boolean | null,
): Promise<AdminServiceResult<PremiumAdminTargetPayload>> => {
  let lastResult: AdminServiceResult<PremiumAdminTargetPayload> | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await toTargetPayload(profile);
    lastResult = current;
    if (!current.ok) {
      return current;
    }

    if (
      expectedPremiumState === null ||
      current.data.premium.isPremium === expectedPremiumState
    ) {
      return current;
    }

    await wait(120 * (attempt + 1));
  }

  if (!lastResult || !lastResult.ok) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to confirm target premium state after admin action.",
    };
  }

  return {
    ok: false,
    reason: "ACTION_FAILED",
    message:
      expectedPremiumState === true
        ? "Premium grant persisted, but target state is still not active."
        : "Premium revoke persisted, but target state is still active.",
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

  const targetResult = await readTargetPayloadWithExpectation(
    profileResult.data,
    true,
  );
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
  const { data: activeProfileRows, error: activeProfileRowsError } = await supabase
    .from("premium_entitlements")
    .select("id, metadata")
    .eq("scope", "profile")
    .eq("profile_id", profileResult.data.id)
    .eq("status", "active")
    .returns<PremiumEntitlementActiveRow[]>();

  if (
    activeProfileRowsError?.code === "42P01" ||
    activeProfileRowsError?.code === "PGRST205"
  ) {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message:
        "Premium entitlement foundation is not ready. Apply Phase 13A migration.",
    };
  }

  if (activeProfileRowsError || !activeProfileRows) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to read active premium entitlements for target.",
    };
  }

  const workspaceId = profileResult.data.activeWorkspaceId?.trim() ?? "";
  let activeWorkspaceRows: PremiumEntitlementActiveRow[] = [];
  if (uuidLikePattern.test(workspaceId)) {
    const { data: workspaceRows, error: workspaceRowsError } = await supabase
      .from("premium_entitlements")
      .select("id, metadata")
      .eq("scope", "workspace")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .returns<PremiumEntitlementActiveRow[]>();

    if (workspaceRowsError) {
      return {
        ok: false,
        reason: "ACTION_FAILED",
        message: "Failed to read active workspace entitlements for target.",
      };
    }

    activeWorkspaceRows = workspaceRows ?? [];
  }

  const rowMap = new Map<string, PremiumEntitlementActiveRow>();
  for (const row of activeProfileRows) {
    rowMap.set(row.id, row);
  }

  for (const row of activeWorkspaceRows) {
    rowMap.set(row.id, row);
  }

  const activeRows = [...rowMap.values()];

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

  const targetResult = await readTargetPayloadWithExpectation(
    profileResult.data,
    false,
  );
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

const ensureOneTimeEntitlementForApprovedClaim = async (params: {
  claim: PremiumPurchaseClaimRow;
  adminTelegramUserId: string;
  adminNote: string | null;
  reviewTimestampIso: string;
}): Promise<AdminServiceResult<{ entitlementId: string }>> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const durationDays = resolveTierDurationDays(params.claim.expected_tier);
  const { data: activePurchaseRows, error: activePurchaseRowsError } = await supabase
    .from("premium_entitlements")
    .select("id, entitlement_source, starts_at, ends_at, metadata")
    .eq("scope", "profile")
    .eq("profile_id", params.claim.profile_id)
    .in("entitlement_source", ["one_time_purchase", "boosty"])
    .eq("status", "active")
    .order("starts_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<ActivePurchaseEntitlementRow[]>();

  if (isFoundationMissingError(activePurchaseRowsError?.code)) {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message:
        "Premium entitlement foundation is not ready. Apply Phase 13A migration.",
    };
  }

  if (activePurchaseRowsError || !activePurchaseRows) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to read active premium purchase entitlements for claim approval.",
    };
  }

  const now = new Date(params.reviewTimestampIso);
  const activeRow = activePurchaseRows.find((row) => {
    const startsAt = new Date(row.starts_at);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() > now.getTime()) {
      return false;
    }

    if (!row.ends_at) {
      return true;
    }

    const endsAt = new Date(row.ends_at);
    if (Number.isNaN(endsAt.getTime())) {
      return false;
    }

    return endsAt.getTime() > now.getTime();
  });

  if (activeRow) {
    const extensionBaseIso =
      activeRow.ends_at && new Date(activeRow.ends_at).getTime() > now.getTime()
        ? activeRow.ends_at
        : params.reviewTimestampIso;
    const nextEndsAt = activeRow.ends_at
      ? addDaysIso(extensionBaseIso, durationDays)
      : null;
    const nextMetadata = {
      ...(activeRow.metadata ?? {}),
      last_claim_review_id: params.claim.id,
      last_claim_reviewed_by_admin_telegram_user_id: params.adminTelegramUserId,
      last_claim_reviewed_at: params.reviewTimestampIso,
      last_claim_expected_tier: params.claim.expected_tier,
      last_claim_admin_note: params.adminNote,
      last_claim_duration_days: durationDays,
      claim_review_origin: "owner_admin_claim_queue",
    };

    const { error: updateEntitlementError } = await supabase
      .from("premium_entitlements")
      .update({
        entitlement_source: "one_time_purchase",
        ends_at: nextEndsAt,
        metadata: nextMetadata,
        updated_at: params.reviewTimestampIso,
      })
      .eq("id", activeRow.id);

    if (updateEntitlementError) {
      return {
        ok: false,
        reason: "ACTION_FAILED",
        message: "Failed to extend existing premium purchase entitlement.",
      };
    }

    return {
      ok: true,
      data: {
        entitlementId: activeRow.id,
      },
    };
  }

  const newEntitlementEndsAt = addDaysIso(params.reviewTimestampIso, durationDays);
  const { data: insertedEntitlement, error: insertedEntitlementError } = await supabase
    .from("premium_entitlements")
    .insert({
      scope: "profile",
      profile_id: params.claim.profile_id,
      workspace_id: null,
      entitlement_source: "one_time_purchase",
      status: "active",
      starts_at: params.reviewTimestampIso,
      ends_at: newEntitlementEndsAt,
      metadata: {
        grant_origin: "owner_admin_claim_queue",
        approved_claim_id: params.claim.id,
        approved_claim_telegram_user_id: params.claim.telegram_user_id,
        approved_expected_tier: params.claim.expected_tier,
        approved_duration_days: durationDays,
        approved_by_admin_telegram_user_id: params.adminTelegramUserId,
        admin_note: params.adminNote,
      },
      created_at: params.reviewTimestampIso,
      updated_at: params.reviewTimestampIso,
    })
    .select("id")
    .single<{ id: string }>();

  if (isFoundationMissingError(insertedEntitlementError?.code)) {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message:
        "Premium entitlement foundation is not ready. Apply Phase 13A migration.",
    };
  }

  if (insertedEntitlementError || !insertedEntitlement) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to grant premium purchase entitlement from approved claim.",
    };
  }

  return {
    ok: true,
    data: {
      entitlementId: insertedEntitlement.id,
    },
  };
};

export const listPremiumPurchaseClaims = async (): Promise<
  AdminServiceResult<PremiumPurchaseClaimPayload[]>
> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const { data: claims, error: claimsError } = await supabase
    .from("premium_purchase_claims")
    .select(purchaseClaimSelection)
    .order("submitted_at", { ascending: false })
    .limit(80)
    .returns<PremiumPurchaseClaimRow[]>();

  if (isFoundationMissingError(claimsError?.code)) {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message:
        "Premium purchase claim foundation is not ready. Apply Phase 22A migration.",
    };
  }

  if (claimsError || !claims) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to read premium purchase claims queue.",
    };
  }

  return {
    ok: true,
    data: claims.map((claim) => toPurchaseClaimPayload(claim)),
  };
};

export const reviewPremiumPurchaseClaim = async (params: {
  claimId: string;
  decision: PremiumAdminPurchaseClaimReviewDecision;
  adminTelegramUserId: string;
  note?: string;
}): Promise<
  AdminServiceResult<{
    claim: PremiumPurchaseClaimPayload;
    entitlementId: string | null;
  }>
> => {
  const normalizedClaimId = params.claimId.trim();
  if (!uuidLikePattern.test(normalizedClaimId)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Claim id is invalid.",
    };
  }

  if (params.decision !== "approve" && params.decision !== "reject") {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Claim review decision is invalid.",
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

  const { data: claim, error: claimError } = await supabase
    .from("premium_purchase_claims")
    .select(purchaseClaimSelection)
    .eq("id", normalizedClaimId)
    .maybeSingle<PremiumPurchaseClaimRow>();

  if (isFoundationMissingError(claimError?.code)) {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message:
        "Premium purchase claim foundation is not ready. Apply Phase 22A migration.",
    };
  }

  if (claimError) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to read purchase claim for review.",
    };
  }

  if (!claim) {
    return {
      ok: false,
      reason: "CLAIM_NOT_FOUND",
      message: "Purchase claim was not found.",
    };
  }

  if (!reviewableClaimStatuses.has(claim.claim_status)) {
    return {
      ok: false,
      reason: "CLAIM_INVALID_STATE",
      message: "Only submitted or pending-review claims can be reviewed.",
    };
  }

  const reviewTimestampIso = new Date().toISOString();
  const normalizedNote = params.note?.trim() ?? "";
  const adminNote = normalizedNote ? normalizedNote.slice(0, 1000) : null;
  let entitlementId: string | null = null;

  if (params.decision === "approve") {
    const entitlementResult = await ensureOneTimeEntitlementForApprovedClaim({
      claim,
      adminTelegramUserId: params.adminTelegramUserId,
      adminNote,
      reviewTimestampIso,
    });
    if (!entitlementResult.ok) {
      return entitlementResult;
    }

    entitlementId = entitlementResult.data.entitlementId;
  }

  const nextStatus: PremiumPurchaseClaimPayload["status"] =
    params.decision === "approve" ? "approved" : "rejected";
  const nextMetadata = {
    ...(claim.metadata ?? {}),
    review_origin: "owner_admin_claim_queue",
    review_decision: params.decision,
    reviewed_by_admin_telegram_user_id: params.adminTelegramUserId,
    reviewed_at: reviewTimestampIso,
    linked_entitlement_id: entitlementId,
  };

  const { data: updatedClaim, error: updatedClaimError } = await supabase
    .from("premium_purchase_claims")
    .update({
      claim_status: nextStatus,
      admin_note: adminNote,
      entitlement_id: entitlementId,
      reviewed_at: reviewTimestampIso,
      reviewed_by_admin_telegram_user_id: params.adminTelegramUserId,
      metadata: nextMetadata,
      updated_at: reviewTimestampIso,
    })
    .eq("id", claim.id)
    .select(purchaseClaimSelection)
    .single<PremiumPurchaseClaimRow>();

  if (updatedClaimError || !updatedClaim) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to update claim review result.",
    };
  }

  return {
    ok: true,
    data: {
      claim: toPurchaseClaimPayload(updatedClaim),
      entitlementId,
    },
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


