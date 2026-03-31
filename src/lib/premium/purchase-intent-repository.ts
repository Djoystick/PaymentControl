import "server-only";
import { randomInt } from "node:crypto";
import type {
  PremiumPurchaseIntentPayload,
  PremiumPurchaseIntentRail,
  PremiumPurchaseIntentStatus,
  SupportRailId,
} from "@/lib/auth/types";
import {
  DEFAULT_SUPPORT_CLAIM_RAIL,
  LEGACY_SUPPORT_CLAIM_RAIL,
  isSupportedSupportClaimRail,
} from "@/lib/premium/purchase-semantics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Historical compatibility boundary:
// repository/table names stay `premium_purchase_*` to keep existing DB/API contracts stable.

type PremiumPurchaseIntentRow = {
  id: string;
  profile_id: string;
  workspace_id: string | null;
  telegram_user_id: string;
  intent_rail: PremiumPurchaseIntentRail;
  expected_tier: string;
  correlation_code: string;
  intent_status: PremiumPurchaseIntentStatus;
  claim_id: string | null;
  opened_external_at: string | null;
  returned_at: string | null;
  claimed_at: string | null;
  consumed_at: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type PurchaseIntentRepositoryFailureReason =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "FOUNDATION_NOT_READY"
  | "ACTION_FAILED";

export type PurchaseIntentRepositoryResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      reason: PurchaseIntentRepositoryFailureReason;
      message: string;
    };

type CreatePremiumPurchaseIntentParams = {
  profileId: string;
  workspaceId: string | null;
  telegramUserId: string;
  intentRail: PremiumPurchaseIntentRail;
  expectedTier: string;
};

type ReadPremiumPurchaseIntentsParams = {
  profileId: string;
  telegramUserId: string;
  limit: number;
};

type ResolvePremiumPurchaseIntentForClaimParams = {
  profileId: string;
  telegramUserId: string;
  intentId: string | null;
  correlationCode: string | null;
  claimRail: PremiumPurchaseIntentRail;
};

type PremiumPurchaseIntentLifecycleTransition = "opened_external" | "returned";

type TransitionPremiumPurchaseIntentStatusParams = {
  profileId: string;
  telegramUserId: string;
  intentId: string;
  transition: PremiumPurchaseIntentLifecycleTransition;
  transitionRail: PremiumPurchaseIntentRail | null;
  supportRailId: SupportRailId | null;
};

const uuidLikePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const telegramUserIdPattern = /^[0-9]{5,20}$/;
const correlationCodePattern = /^PC-[A-Z0-9]{5,12}$/;
const correlationCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const selection =
  "id, profile_id, workspace_id, telegram_user_id, intent_rail, expected_tier, correlation_code, intent_status, claim_id, opened_external_at, returned_at, claimed_at, consumed_at, expires_at, metadata, created_at, updated_at";

const toPayload = (
  row: PremiumPurchaseIntentRow,
): PremiumPurchaseIntentPayload => {
  return {
    id: row.id,
    profileId: row.profile_id,
    workspaceId: row.workspace_id,
    telegramUserId: row.telegram_user_id,
    intentRail: row.intent_rail,
    expectedTier: row.expected_tier,
    correlationCode: row.correlation_code,
    status: row.intent_status,
    claimId: row.claim_id,
    openedExternalAt: row.opened_external_at,
    returnedAt: row.returned_at,
    claimedAt: row.claimed_at,
    consumedAt: row.consumed_at,
    expiresAt: row.expires_at,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const normalizeCorrelationCode = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  return normalized;
};

const generateCorrelationCode = (): string => {
  let suffix = "";
  for (let index = 0; index < 6; index += 1) {
    suffix += correlationCodeAlphabet[randomInt(0, correlationCodeAlphabet.length)];
  }

  return `PC-${suffix}`;
};

const resolveSupportRailOperationalMode = (
  supportRailId: SupportRailId | null,
): "continuity_claim_manual" | "automation_candidate" | null => {
  if (!supportRailId) {
    return null;
  }

  if (supportRailId === "cloudtips") {
    return "automation_candidate";
  }

  return "continuity_claim_manual";
};

export const createPremiumPurchaseIntent = async (
  params: CreatePremiumPurchaseIntentParams,
): Promise<PurchaseIntentRepositoryResult<PremiumPurchaseIntentPayload>> => {
  const normalizedTelegramUserId = params.telegramUserId.trim();
  if (!telegramUserIdPattern.test(normalizedTelegramUserId)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Telegram user id must be numeric.",
    };
  }

  if (!isSupportedSupportClaimRail(params.intentRail)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Intent rail is not supported.",
    };
  }

  const normalizedExpectedTier = params.expectedTier.trim().slice(0, 64);
  if (!normalizedExpectedTier) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Expected tier is required.",
    };
  }

  const normalizedWorkspaceId =
    params.workspaceId && uuidLikePattern.test(params.workspaceId)
      ? params.workspaceId
      : null;

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const nowIso = new Date().toISOString();
  const expiresAtIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const correlationCode = generateCorrelationCode();
    const { data, error } = await supabase
      .from("premium_purchase_intents")
      .insert({
        profile_id: params.profileId,
        workspace_id: normalizedWorkspaceId,
        telegram_user_id: normalizedTelegramUserId,
        intent_rail: params.intentRail,
        expected_tier: normalizedExpectedTier,
        correlation_code: correlationCode,
        intent_status: "created",
        expires_at: expiresAtIso,
        metadata: {
          creation_origin: "profile_buy_premium_entry",
          creation_telegram_user_id: normalizedTelegramUserId,
        },
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select(selection)
      .single<PremiumPurchaseIntentRow>();

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return {
        ok: false,
        reason: "FOUNDATION_NOT_READY",
        message:
          "Support reference foundation is not ready. Apply Phase 22E migration.",
      };
    }

    if (error?.code === "23505") {
      continue;
    }

    if (error || !data) {
      return {
        ok: false,
        reason: "ACTION_FAILED",
        message: "Failed to create support reference.",
      };
    }

    return {
      ok: true,
      data: toPayload(data),
    };
  }

  return {
    ok: false,
    reason: "ACTION_FAILED",
    message: "Failed to generate unique support reference code.",
  };
};

export const readPremiumPurchaseIntentsForProfile = async (
  params: ReadPremiumPurchaseIntentsParams,
): Promise<PurchaseIntentRepositoryResult<PremiumPurchaseIntentPayload[]>> => {
  const normalizedTelegramUserId = params.telegramUserId.trim();
  if (!telegramUserIdPattern.test(normalizedTelegramUserId)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Telegram user id must be numeric.",
    };
  }

  const normalizedLimit = Math.min(20, Math.max(1, Math.floor(params.limit)));
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const { data, error } = await supabase
    .from("premium_purchase_intents")
    .select(selection)
    .eq("profile_id", params.profileId)
    .eq("telegram_user_id", normalizedTelegramUserId)
    .order("created_at", { ascending: false })
    .limit(normalizedLimit)
    .returns<PremiumPurchaseIntentRow[]>();

  if (error?.code === "42P01" || error?.code === "PGRST205") {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message: "Support reference foundation is not ready. Apply Phase 22E migration.",
    };
  }

  if (error || !data) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to read support references.",
    };
  }

  return {
    ok: true,
    data: data.map((row) => toPayload(row)),
  };
};

export const resolvePremiumPurchaseIntentForClaim = async (
  params: ResolvePremiumPurchaseIntentForClaimParams,
): Promise<PurchaseIntentRepositoryResult<PremiumPurchaseIntentPayload | null>> => {
  const normalizedTelegramUserId = params.telegramUserId.trim();
  if (!telegramUserIdPattern.test(normalizedTelegramUserId)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Telegram user id must be numeric.",
    };
  }

  const normalizedIntentId = params.intentId?.trim() ?? "";
  const normalizedCorrelationCode = normalizeCorrelationCode(params.correlationCode);
  if (!normalizedIntentId && !normalizedCorrelationCode) {
    return {
      ok: true,
      data: null,
    };
  }

  if (normalizedIntentId && !uuidLikePattern.test(normalizedIntentId)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Support reference id is invalid.",
    };
  }

  if (normalizedCorrelationCode && !correlationCodePattern.test(normalizedCorrelationCode)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Support reference code is invalid.",
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

  const runQuery = async (intentRail: PremiumPurchaseIntentRail) => {
    let query = supabase
      .from("premium_purchase_intents")
      .select(selection)
      .eq("profile_id", params.profileId)
      .eq("telegram_user_id", normalizedTelegramUserId)
      .eq("intent_rail", intentRail)
      .limit(2);

    if (normalizedIntentId) {
      query = query.eq("id", normalizedIntentId);
    }

    if (normalizedCorrelationCode) {
      query = query.eq("correlation_code", normalizedCorrelationCode);
    }

    return query.returns<PremiumPurchaseIntentRow[]>();
  };

  const queryRails =
    params.claimRail === DEFAULT_SUPPORT_CLAIM_RAIL
      ? [DEFAULT_SUPPORT_CLAIM_RAIL, LEGACY_SUPPORT_CLAIM_RAIL]
      : [params.claimRail];

  let resolvedRows: PremiumPurchaseIntentRow[] | null = null;
  for (const rail of queryRails) {
    const { data, error } = await runQuery(rail);

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return {
        ok: false,
        reason: "FOUNDATION_NOT_READY",
        message: "Support reference foundation is not ready. Apply Phase 22E migration.",
      };
    }

    if (error) {
      return {
        ok: false,
        reason: "ACTION_FAILED",
        message: "Failed to resolve support reference for claim.",
      };
    }

    if (data && data.length > 0) {
      resolvedRows = data;
      break;
    }
  }

  if (!resolvedRows || resolvedRows.length === 0) {
    return {
      ok: false,
      reason: "NOT_FOUND",
      message: "Matching support reference was not found for this account.",
    };
  }

  const row = resolvedRows[0];
  if (row.claim_id) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Support reference is already linked to another claim.",
    };
  }

  if (
    row.intent_status === "cancelled" ||
    row.intent_status === "expired" ||
    row.intent_status === "consumed"
  ) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Support reference status is not claimable.",
    };
  }

  return {
    ok: true,
    data: toPayload(row),
  };
};

export const markPremiumPurchaseIntentClaimed = async (params: {
  intent: PremiumPurchaseIntentPayload;
  claimId: string;
  reviewMetadata: Record<string, unknown>;
  claimedAtIso: string;
}): Promise<PurchaseIntentRepositoryResult<PremiumPurchaseIntentPayload>> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const nextMetadata = {
    ...(params.intent.metadata ?? {}),
    ...params.reviewMetadata,
  };

  const { data, error } = await supabase
    .from("premium_purchase_intents")
    .update({
      claim_id: params.claimId,
      intent_status: "claimed",
      claimed_at: params.claimedAtIso,
      metadata: nextMetadata,
      updated_at: params.claimedAtIso,
    })
    .eq("id", params.intent.id)
    .is("claim_id", null)
    .select(selection)
    .maybeSingle<PremiumPurchaseIntentRow>();

  if (error) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to update support reference claim linkage.",
    };
  }

  if (!data) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Support reference was already linked to a claim.",
    };
  }

  return {
    ok: true,
    data: toPayload(data),
  };
};

export const transitionPremiumPurchaseIntentStatus = async (
  params: TransitionPremiumPurchaseIntentStatusParams,
): Promise<PurchaseIntentRepositoryResult<PremiumPurchaseIntentPayload>> => {
  const normalizedTelegramUserId = params.telegramUserId.trim();
  if (!telegramUserIdPattern.test(normalizedTelegramUserId)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Telegram user id must be numeric.",
    };
  }

  const normalizedIntentId = params.intentId.trim();
  if (!uuidLikePattern.test(normalizedIntentId)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Support reference id is invalid.",
    };
  }

  if (params.transitionRail && !isSupportedSupportClaimRail(params.transitionRail)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Intent rail is not supported.",
    };
  }

  if (
    params.supportRailId !== null &&
    params.supportRailId !== "boosty" &&
    params.supportRailId !== "cloudtips"
  ) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Support rail id is invalid.",
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

  const { data: currentIntent, error: currentIntentError } = await supabase
    .from("premium_purchase_intents")
    .select(selection)
    .eq("id", normalizedIntentId)
    .eq("profile_id", params.profileId)
    .eq("telegram_user_id", normalizedTelegramUserId)
    .maybeSingle<PremiumPurchaseIntentRow>();

  if (currentIntentError?.code === "42P01" || currentIntentError?.code === "PGRST205") {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message: "Support reference foundation is not ready. Apply Phase 22E migration.",
    };
  }

  if (currentIntentError) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to read support reference for status update.",
    };
  }

  if (!currentIntent) {
    return {
      ok: false,
      reason: "NOT_FOUND",
      message: "Support reference was not found.",
    };
  }

  if (
    currentIntent.intent_status === "claimed" ||
    currentIntent.intent_status === "consumed" ||
    currentIntent.intent_status === "expired" ||
    currentIntent.intent_status === "cancelled"
  ) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Support reference status is not claimable.",
    };
  }

  const nowIso = new Date().toISOString();
  const nextStatus: PremiumPurchaseIntentStatus =
    params.transition === "returned" ? "returned" : "opened_external";
  const supportRailId =
    params.supportRailId ??
    (typeof currentIntent.metadata?.last_client_support_rail_id === "string"
      ? (currentIntent.metadata.last_client_support_rail_id as SupportRailId)
      : null);
  const supportRailMode = resolveSupportRailOperationalMode(supportRailId);
  const nextMetadata = {
    ...(currentIntent.metadata ?? {}),
    last_client_transition: params.transition,
    last_client_transition_at: nowIso,
    last_client_transition_rail: params.transitionRail ?? null,
    last_client_support_rail_id: supportRailId,
    last_client_support_rail_mode: supportRailMode,
  };

  const updatePayload: Record<string, unknown> = {
    intent_status: nextStatus,
    metadata: nextMetadata,
    updated_at: nowIso,
  };
  if (params.transition === "opened_external") {
    updatePayload.opened_external_at = currentIntent.opened_external_at ?? nowIso;
    updatePayload.metadata = {
      ...nextMetadata,
      opened_external_support_rail_id: supportRailId,
      opened_external_support_rail_mode: supportRailMode,
      opened_external_tracked_at: nowIso,
    };
  } else {
    updatePayload.returned_at = nowIso;
    updatePayload.metadata = {
      ...nextMetadata,
      returned_support_rail_id: supportRailId,
      returned_support_rail_mode: supportRailMode,
      returned_tracked_at: nowIso,
    };
  }

  const { data: updatedIntent, error: updateIntentError } = await supabase
    .from("premium_purchase_intents")
    .update(updatePayload)
    .eq("id", currentIntent.id)
    .select(selection)
    .single<PremiumPurchaseIntentRow>();

  if (updateIntentError) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to update support reference status.",
    };
  }

  if (!updatedIntent) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Support reference status update returned empty payload.",
    };
  }

  return {
    ok: true,
    data: toPayload(updatedIntent),
  };
};

export const createSupportReferenceIntent = createPremiumPurchaseIntent;
export const readSupportReferencesForProfile = readPremiumPurchaseIntentsForProfile;
export const resolveSupportReferenceForClaim = resolvePremiumPurchaseIntentForClaim;
export const markSupportReferenceClaimed = markPremiumPurchaseIntentClaimed;
export const transitionSupportReferenceStatus = transitionPremiumPurchaseIntentStatus;
