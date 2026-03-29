import "server-only";
import { randomInt } from "node:crypto";
import type {
  PremiumPurchaseIntentPayload,
  PremiumPurchaseIntentRail,
  PremiumPurchaseIntentStatus,
} from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  if (params.intentRail !== "boosty_premium") {
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
          "Premium purchase intent foundation is not ready. Apply Phase 22E migration.",
      };
    }

    if (error?.code === "23505") {
      continue;
    }

    if (error || !data) {
      return {
        ok: false,
        reason: "ACTION_FAILED",
        message: "Failed to create premium purchase intent.",
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
    message: "Failed to generate unique purchase correlation code.",
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
      message:
        "Premium purchase intent foundation is not ready. Apply Phase 22E migration.",
    };
  }

  if (error || !data) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to read premium purchase intents.",
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
      message: "Purchase intent id is invalid.",
    };
  }

  if (normalizedCorrelationCode && !correlationCodePattern.test(normalizedCorrelationCode)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Purchase correlation code is invalid.",
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

  let query = supabase
    .from("premium_purchase_intents")
    .select(selection)
    .eq("profile_id", params.profileId)
    .eq("telegram_user_id", normalizedTelegramUserId)
    .eq("intent_rail", params.claimRail)
    .limit(2);

  if (normalizedIntentId) {
    query = query.eq("id", normalizedIntentId);
  }

  if (normalizedCorrelationCode) {
    query = query.eq("correlation_code", normalizedCorrelationCode);
  }

  const { data, error } = await query.returns<PremiumPurchaseIntentRow[]>();

  if (error?.code === "42P01" || error?.code === "PGRST205") {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message:
        "Premium purchase intent foundation is not ready. Apply Phase 22E migration.",
    };
  }

  if (error) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to resolve purchase intent for claim.",
    };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      reason: "NOT_FOUND",
      message: "Matching purchase intent was not found for this account.",
    };
  }

  const row = data[0];
  if (row.claim_id) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Purchase intent is already linked to another claim.",
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
      message: "Purchase intent status is not claimable.",
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
      message: "Failed to update purchase intent claim linkage.",
    };
  }

  if (!data) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Purchase intent was already linked to a claim.",
    };
  }

  return {
    ok: true,
    data: toPayload(data),
  };
};
