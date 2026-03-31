import { NextResponse } from "next/server";
import { readCurrentAppContext } from "@/lib/app-context/service";
import type {
  PremiumAdminCampaignCreateResponse,
  PremiumAdminCampaignDeactivateResponse,
  PremiumAdminCampaignListResponse,
  PremiumAdminErrorCode,
  PremiumAdminGrantResponse,
  PremiumAdminPurchaseClaimListResponse,
  PremiumAdminPurchaseClaimReviewDecision,
  PremiumAdminPurchaseClaimReviewResponse,
  PremiumAdminRevokeResponse,
  PremiumAdminSessionResponse,
  PremiumAdminTargetResolveResponse,
} from "@/lib/auth/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { isPremiumAdminTelegramUserId } from "@/lib/admin/access";
import {
  createPremiumGiftCampaign,
  deactivatePremiumGiftCampaign,
  grantManualPremiumByTelegramUserId,
  listPremiumGiftCampaignsWithUsage,
  listPremiumPurchaseClaims,
  reviewPremiumPurchaseClaim,
  resolvePremiumAdminTarget,
  revokePremiumByTelegramUserId,
} from "@/lib/premium/admin-service";

type PremiumAdminAction =
  | "session"
  | "resolve_target"
  | "grant_premium"
  | "revoke_premium"
  | "create_campaign"
  | "list_campaigns"
  | "deactivate_campaign"
  | "list_purchase_claims"
  | "review_purchase_claim";

type PremiumAdminBody = {
  initData?: string;
  action?: PremiumAdminAction;
  targetTelegramUserId?: string;
  durationDays?: number | null;
  note?: string;
  campaignId?: string;
  campaignCode?: string;
  campaignTitle?: string;
  totalQuota?: number;
  campaignDurationDays?: number;
  startsAt?: string;
  endsAt?: string;
  claimId?: string;
  decision?: PremiumAdminPurchaseClaimReviewDecision;
};

const codeToStatus: Record<PremiumAdminErrorCode, number> = {
  TELEGRAM_INIT_DATA_MISSING: 400,
  TELEGRAM_INIT_DATA_INVALID: 401,
  TELEGRAM_INIT_DATA_EXPIRED: 401,
  TELEGRAM_USER_INVALID: 401,
  TELEGRAM_BOT_TOKEN_MISSING: 503,
  SUPABASE_NOT_CONFIGURED: 503,
  PROFILE_UPSERT_FAILED: 500,
  WORKSPACE_ENSURE_FAILED: 500,
  APP_CONTEXT_NOT_INITIALIZED: 409,
  WORKSPACE_NOT_FOUND: 404,
  WORKSPACE_LIST_FAILED: 500,
  PREMIUM_ADMIN_FORBIDDEN: 403,
  PREMIUM_ADMIN_INVALID_TARGET_TELEGRAM_ID: 400,
  PREMIUM_ADMIN_TARGET_NOT_FOUND: 404,
  PREMIUM_ADMIN_INVALID_INPUT: 400,
  PREMIUM_ADMIN_CAMPAIGN_NOT_FOUND: 404,
  PREMIUM_ADMIN_CAMPAIGN_FOUNDATION_NOT_READY: 409,
  PREMIUM_ADMIN_CLAIM_NOT_FOUND: 404,
  PREMIUM_ADMIN_CLAIM_INVALID_STATE: 409,
  PREMIUM_ADMIN_CLAIM_FOUNDATION_NOT_READY: 409,
  PREMIUM_ADMIN_ACTION_FAILED: 500,
};

const mapServiceError = (
  reason: string,
  serviceMessage?: string,
): { code: PremiumAdminErrorCode; message: string } => {
  if (reason === "INVALID_TARGET_TELEGRAM_ID") {
    return {
      code: "PREMIUM_ADMIN_INVALID_TARGET_TELEGRAM_ID",
      message: "Target Telegram user id must be numeric.",
    };
  }

  if (reason === "TARGET_NOT_FOUND") {
    return {
      code: "PREMIUM_ADMIN_TARGET_NOT_FOUND",
      message: "Target profile was not found.",
    };
  }

  if (reason === "INVALID_INPUT") {
    return {
      code: "PREMIUM_ADMIN_INVALID_INPUT",
      message: "Admin request payload is invalid.",
    };
  }

  if (reason === "CAMPAIGN_NOT_FOUND") {
    return {
      code: "PREMIUM_ADMIN_CAMPAIGN_NOT_FOUND",
      message: "Campaign was not found.",
    };
  }

  if (reason === "CLAIM_NOT_FOUND") {
    return {
      code: "PREMIUM_ADMIN_CLAIM_NOT_FOUND",
      message: "Support claim was not found.",
    };
  }

  if (reason === "CLAIM_INVALID_STATE") {
    return {
      code: "PREMIUM_ADMIN_CLAIM_INVALID_STATE",
      message: "Claim status is not reviewable.",
    };
  }

  if (reason === "FOUNDATION_NOT_READY") {
    const normalizedMessage = (serviceMessage ?? "").toLowerCase();
    if (
      normalizedMessage.includes("purchase claim") ||
      normalizedMessage.includes("support claim") ||
      normalizedMessage.includes("phase 22a")
    ) {
      return {
        code: "PREMIUM_ADMIN_CLAIM_FOUNDATION_NOT_READY",
        message: "Support claim foundation is not ready. Apply Phase 22A migration.",
      };
    }

    return {
      code: "PREMIUM_ADMIN_CAMPAIGN_FOUNDATION_NOT_READY",
      message: "Campaign foundation is not ready. Apply required migrations.",
    };
  }

  return {
    code: "PREMIUM_ADMIN_ACTION_FAILED",
    message: "Admin action failed.",
  };
};

const parseOptionalPositiveInteger = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return Number.NaN;
  }

  return parsed;
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json<PremiumAdminSessionResponse>(
      {
        ok: false,
        error: {
          code: "SUPABASE_NOT_CONFIGURED",
          message: "Supabase server configuration is missing.",
        },
      },
      { status: 503 },
    );
  }

  let body: PremiumAdminBody = {};
  try {
    body = (await request.json()) as PremiumAdminBody;
  } catch {
    body = {};
  }

  const action = body.action;
  if (!action) {
    return NextResponse.json<PremiumAdminSessionResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_ADMIN_INVALID_INPUT",
          message: "Admin action is required.",
        },
      },
      { status: 400 },
    );
  }

  const contextResult = await readCurrentAppContext(body.initData);
  if (!contextResult.ok) {
    return NextResponse.json<PremiumAdminSessionResponse>(
      {
        ok: false,
        error: {
          code: contextResult.error.code,
          message: contextResult.error.message,
        },
      },
      { status: codeToStatus[contextResult.error.code] ?? 400 },
    );
  }

  const adminTelegramUserId = contextResult.profile.telegramUserId;
  const isAdmin = isPremiumAdminTelegramUserId(adminTelegramUserId);

  if (action === "session") {
    return NextResponse.json<PremiumAdminSessionResponse>({
      ok: true,
      session: {
        isAdmin,
        adminTelegramUserId: isAdmin ? adminTelegramUserId : null,
      },
    });
  }

  if (!isAdmin) {
    return NextResponse.json<PremiumAdminSessionResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_ADMIN_FORBIDDEN",
          message: "Current account is not allowed to use premium admin console.",
        },
      },
      { status: 403 },
    );
  }

  if (action === "resolve_target") {
    const targetTelegramUserId = body.targetTelegramUserId?.trim() ?? "";
    const targetResult = await resolvePremiumAdminTarget(targetTelegramUserId);
    if (!targetResult.ok) {
      const mapped = mapServiceError(targetResult.reason, targetResult.message);
      return NextResponse.json<PremiumAdminTargetResolveResponse>(
        {
          ok: false,
          error: {
            code: mapped.code,
            message: targetResult.message || mapped.message,
          },
        },
        { status: codeToStatus[mapped.code] ?? 400 },
      );
    }

    return NextResponse.json<PremiumAdminTargetResolveResponse>({
      ok: true,
      target: targetResult.data,
    });
  }

  if (action === "grant_premium") {
    const durationDays = parseOptionalPositiveInteger(body.durationDays);
    if (Number.isNaN(durationDays)) {
      return NextResponse.json<PremiumAdminGrantResponse>(
        {
          ok: false,
          error: {
            code: "PREMIUM_ADMIN_INVALID_INPUT",
            message: "Duration days must be a positive integer or empty.",
          },
        },
        { status: 400 },
      );
    }

    const grantResult = await grantManualPremiumByTelegramUserId({
      adminTelegramUserId,
      targetTelegramUserId: body.targetTelegramUserId?.trim() ?? "",
      durationDays,
      note: body.note,
    });
    if (!grantResult.ok) {
      const mapped = mapServiceError(grantResult.reason, grantResult.message);
      return NextResponse.json<PremiumAdminGrantResponse>(
        {
          ok: false,
          error: {
            code: mapped.code,
            message: grantResult.message || mapped.message,
          },
        },
        { status: codeToStatus[mapped.code] ?? 400 },
      );
    }

    return NextResponse.json<PremiumAdminGrantResponse>({
      ok: true,
      target: grantResult.data.target,
      entitlementId: grantResult.data.entitlementId,
    });
  }

  if (action === "revoke_premium") {
    const revokeResult = await revokePremiumByTelegramUserId({
      adminTelegramUserId,
      targetTelegramUserId: body.targetTelegramUserId?.trim() ?? "",
      note: body.note,
    });
    if (!revokeResult.ok) {
      const mapped = mapServiceError(revokeResult.reason, revokeResult.message);
      return NextResponse.json<PremiumAdminRevokeResponse>(
        {
          ok: false,
          error: {
            code: mapped.code,
            message: revokeResult.message || mapped.message,
          },
        },
        { status: codeToStatus[mapped.code] ?? 400 },
      );
    }

    return NextResponse.json<PremiumAdminRevokeResponse>({
      ok: true,
      target: revokeResult.data.target,
      revokedCount: revokeResult.data.revokedCount,
    });
  }

  if (action === "create_campaign") {
    const totalQuota = parseOptionalPositiveInteger(body.totalQuota);
    const campaignDurationDays = parseOptionalPositiveInteger(
      body.campaignDurationDays,
    );
    if (
      Number.isNaN(totalQuota) ||
      Number.isNaN(campaignDurationDays) ||
      totalQuota === null ||
      campaignDurationDays === null
    ) {
      return NextResponse.json<PremiumAdminCampaignCreateResponse>(
        {
          ok: false,
          error: {
            code: "PREMIUM_ADMIN_INVALID_INPUT",
            message:
              "Campaign quota and premium duration days must be positive integers.",
          },
        },
        { status: 400 },
      );
    }

    const createResult = await createPremiumGiftCampaign({
      adminTelegramUserId,
      code: body.campaignCode ?? "",
      title: body.campaignTitle ?? "",
      totalQuota,
      premiumDurationDays: campaignDurationDays,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
    });

    if (!createResult.ok) {
      const mapped = mapServiceError(createResult.reason, createResult.message);
      return NextResponse.json<PremiumAdminCampaignCreateResponse>(
        {
          ok: false,
          error: {
            code: mapped.code,
            message: createResult.message || mapped.message,
          },
        },
        { status: codeToStatus[mapped.code] ?? 400 },
      );
    }

    return NextResponse.json<PremiumAdminCampaignCreateResponse>({
      ok: true,
      campaign: createResult.data,
    });
  }

  if (action === "list_campaigns") {
    const listResult = await listPremiumGiftCampaignsWithUsage();
    if (!listResult.ok) {
      const mapped = mapServiceError(listResult.reason, listResult.message);
      return NextResponse.json<PremiumAdminCampaignListResponse>(
        {
          ok: false,
          error: {
            code: mapped.code,
            message: listResult.message || mapped.message,
          },
        },
        { status: codeToStatus[mapped.code] ?? 400 },
      );
    }

    return NextResponse.json<PremiumAdminCampaignListResponse>({
      ok: true,
      campaigns: listResult.data,
    });
  }

  if (action === "list_purchase_claims") {
    const listResult = await listPremiumPurchaseClaims();
    if (!listResult.ok) {
      const mapped = mapServiceError(listResult.reason, listResult.message);
      return NextResponse.json<PremiumAdminPurchaseClaimListResponse>(
        {
          ok: false,
          error: {
            code: mapped.code,
            message: listResult.message || mapped.message,
          },
        },
        { status: codeToStatus[mapped.code] ?? 400 },
      );
    }

    return NextResponse.json<PremiumAdminPurchaseClaimListResponse>({
      ok: true,
      claims: listResult.data,
    });
  }

  if (action === "review_purchase_claim") {
    const reviewResult = await reviewPremiumPurchaseClaim({
      claimId: body.claimId?.trim() ?? "",
      decision: (body.decision ?? "reject") as PremiumAdminPurchaseClaimReviewDecision,
      adminTelegramUserId,
      note: body.note,
    });
    if (!reviewResult.ok) {
      const mapped = mapServiceError(reviewResult.reason, reviewResult.message);
      return NextResponse.json<PremiumAdminPurchaseClaimReviewResponse>(
        {
          ok: false,
          error: {
            code: mapped.code,
            message: reviewResult.message || mapped.message,
          },
        },
        { status: codeToStatus[mapped.code] ?? 400 },
      );
    }

    return NextResponse.json<PremiumAdminPurchaseClaimReviewResponse>({
      ok: true,
      claim: reviewResult.data.claim,
      entitlementId: reviewResult.data.entitlementId,
    });
  }

  if (action === "deactivate_campaign") {
    const deactivateResult = await deactivatePremiumGiftCampaign(
      body.campaignId?.trim() ?? "",
    );
    if (!deactivateResult.ok) {
      const mapped = mapServiceError(deactivateResult.reason, deactivateResult.message);
      return NextResponse.json<PremiumAdminCampaignDeactivateResponse>(
        {
          ok: false,
          error: {
            code: mapped.code,
            message: deactivateResult.message || mapped.message,
          },
        },
        { status: codeToStatus[mapped.code] ?? 400 },
      );
    }

    return NextResponse.json<PremiumAdminCampaignDeactivateResponse>({
      ok: true,
      campaign: deactivateResult.data,
    });
  }

  return NextResponse.json<PremiumAdminSessionResponse>(
    {
      ok: false,
      error: {
        code: "PREMIUM_ADMIN_INVALID_INPUT",
        message: "Unknown admin action.",
      },
    },
    { status: 400 },
  );
}
