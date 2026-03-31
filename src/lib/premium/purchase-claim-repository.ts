import "server-only";
import type {
  PremiumPurchaseClaimPayload,
  PremiumPurchaseClaimRail,
  PremiumPurchaseClaimStatus,
} from "@/lib/auth/types";
import {
  markSupportReferenceClaimed,
  resolveSupportReferenceForClaim,
} from "@/lib/premium/purchase-intent-repository";
import { isSupportedSupportClaimRail } from "@/lib/premium/purchase-semantics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Historical compatibility boundary:
// repository/table names stay `premium_purchase_*` to keep existing DB/API contracts stable.

type PremiumPurchaseClaimRow = {
  id: string;
  profile_id: string;
  workspace_id: string | null;
  telegram_user_id: string;
  claim_rail: PremiumPurchaseClaimRail;
  expected_tier: string;
  external_payer_handle: string | null;
  payment_proof_reference: string | null;
  payment_proof_text: string | null;
  claim_status: PremiumPurchaseClaimStatus;
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

type CreatePremiumPurchaseClaimParams = {
  profileId: string;
  workspaceId: string | null;
  telegramUserId: string;
  claimRail: PremiumPurchaseClaimRail;
  expectedTier: string;
  externalPayerHandle: string | null;
  paymentProofReference: string | null;
  paymentProofText: string | null;
  claimNote: string | null;
  purchaseIntentId?: string | null;
  purchaseCorrelationCode?: string | null;
};

type PurchaseClaimRepositoryFailureReason =
  | "INVALID_INPUT"
  | "FOUNDATION_NOT_READY"
  | "ACTION_FAILED";

export type PurchaseClaimRepositoryResult =
  | { ok: true; data: PremiumPurchaseClaimPayload }
  | { ok: false; reason: PurchaseClaimRepositoryFailureReason; message: string };

const uuidLikePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const telegramUserIdPattern = /^[0-9]{5,20}$/;
const correlationCodePattern = /^PC-[A-Z0-9]{5,12}$/;

const normalizeOptionalText = (value: string | null, maxLength: number): string | null => {
  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
};

const toPayload = (row: PremiumPurchaseClaimRow): PremiumPurchaseClaimPayload => {
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

export const createPremiumPurchaseClaim = async (
  params: CreatePremiumPurchaseClaimParams,
): Promise<PurchaseClaimRepositoryResult> => {
  const normalizedTelegramUserId = params.telegramUserId.trim();
  if (!telegramUserIdPattern.test(normalizedTelegramUserId)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Telegram user id must be numeric.",
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

  if (!isSupportedSupportClaimRail(params.claimRail)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Claim rail is not supported.",
    };
  }

  const normalizedWorkspaceId =
    params.workspaceId && uuidLikePattern.test(params.workspaceId)
      ? params.workspaceId
      : null;
  const externalPayerHandle = normalizeOptionalText(params.externalPayerHandle, 128);
  const paymentProofReference = normalizeOptionalText(
    params.paymentProofReference,
    512,
  );
  const paymentProofText = normalizeOptionalText(params.paymentProofText, 4000);
  const claimNote = normalizeOptionalText(params.claimNote, 1000);
  const rawPurchaseIntentId = params.purchaseIntentId?.trim() ?? "";
  if (rawPurchaseIntentId && !uuidLikePattern.test(rawPurchaseIntentId)) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Support reference id is invalid.",
    };
  }
  const normalizedPurchaseIntentId = rawPurchaseIntentId || null;
  const normalizedPurchaseCorrelationCode = (() => {
    const normalized = normalizeOptionalText(params.purchaseCorrelationCode ?? null, 24);
    if (!normalized) {
      return null;
    }

    const upperCased = normalized.toUpperCase();
    if (!correlationCodePattern.test(upperCased)) {
      return "__invalid__";
    }

    return upperCased;
  })();
  if (normalizedPurchaseCorrelationCode === "__invalid__") {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      message: "Support reference code is invalid.",
    };
  }
  const submittedAt = new Date().toISOString();

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Supabase server configuration is missing.",
    };
  }

  const intentResolutionResult = await resolveSupportReferenceForClaim({
    profileId: params.profileId,
    telegramUserId: normalizedTelegramUserId,
    intentId: normalizedPurchaseIntentId,
    correlationCode: normalizedPurchaseCorrelationCode,
    claimRail: params.claimRail,
  });
  if (!intentResolutionResult.ok) {
    return {
      ok: false,
      reason:
        intentResolutionResult.reason === "FOUNDATION_NOT_READY"
          ? "FOUNDATION_NOT_READY"
          : intentResolutionResult.reason === "ACTION_FAILED"
            ? "ACTION_FAILED"
            : "INVALID_INPUT",
      message: intentResolutionResult.message,
    };
  }
  const linkedIntent = intentResolutionResult.data;
  const linkedIntentContinuityStage = linkedIntent
    ? linkedIntent.returnedAt
      ? "returned_tracked"
      : linkedIntent.openedExternalAt
        ? "opened_external_tracked"
        : "prepared_only"
    : "no_linked_intent";

  const { data, error } = await supabase
    .from("premium_purchase_claims")
    .insert({
      profile_id: params.profileId,
      workspace_id: normalizedWorkspaceId,
      telegram_user_id: normalizedTelegramUserId,
      claim_rail: params.claimRail,
      expected_tier: normalizedExpectedTier,
      external_payer_handle: externalPayerHandle,
      payment_proof_reference: paymentProofReference,
      payment_proof_text: paymentProofText,
      claim_status: "submitted",
      purchase_intent_id: linkedIntent?.id ?? null,
      purchase_correlation_code: linkedIntent?.correlationCode ?? null,
      claim_note: claimNote,
      submitted_at: submittedAt,
      metadata: {
        submission_origin: "api_premium_purchase_claim_create",
        submission_telegram_user_id: normalizedTelegramUserId,
        linked_purchase_intent_id: linkedIntent?.id ?? null,
        linked_purchase_correlation_code: linkedIntent?.correlationCode ?? null,
        linked_purchase_intent_status_at_submission: linkedIntent?.status ?? null,
        linked_purchase_intent_created_at: linkedIntent?.createdAt ?? null,
        linked_purchase_intent_opened_external_at:
          linkedIntent?.openedExternalAt ?? null,
        linked_purchase_intent_returned_at: linkedIntent?.returnedAt ?? null,
        linked_purchase_intent_continuity_stage: linkedIntentContinuityStage,
      },
      created_at: submittedAt,
      updated_at: submittedAt,
    })
    .select(
      "id, profile_id, workspace_id, telegram_user_id, claim_rail, expected_tier, external_payer_handle, payment_proof_reference, payment_proof_text, claim_status, purchase_intent_id, purchase_correlation_code, claim_note, admin_note, entitlement_id, submitted_at, reviewed_at, reviewed_by_admin_telegram_user_id, metadata, created_at, updated_at",
    )
    .single<PremiumPurchaseClaimRow>();

  if (error?.code === "42P01" || error?.code === "PGRST205") {
    return {
      ok: false,
      reason: "FOUNDATION_NOT_READY",
      message: "Support claim foundation is not ready. Apply Phase 22A migration.",
    };
  }

  if (error || !data) {
    return {
      ok: false,
      reason: "ACTION_FAILED",
      message: "Failed to create support claim.",
    };
  }

  if (linkedIntent) {
    await markSupportReferenceClaimed({
      intent: linkedIntent,
      claimId: data.id,
      claimedAtIso: submittedAt,
      reviewMetadata: {
        linked_claim_id: data.id,
        linked_claim_status: data.claim_status,
        linked_claim_submitted_at: submittedAt,
      },
    });
  }

  return {
    ok: true,
    data: toPayload(data),
  };
};

export const createSupportClaim = createPremiumPurchaseClaim;
