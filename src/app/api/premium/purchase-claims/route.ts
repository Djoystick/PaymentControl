import { NextResponse } from "next/server";
import { readCurrentAppContext } from "@/lib/app-context/service";
import type {
  SupportClaimCreateErrorCode,
  SupportClaimCreateResponse,
  SupportClaimRail,
} from "@/lib/auth/types";
import { isSupabaseServerConfigured, serverEnv } from "@/lib/config/server-env";
import { sendTelegramMessageWithPreflight } from "@/lib/payments/telegram-delivery";
import { createSupportClaim } from "@/lib/premium/purchase-claim-repository";
import {
  DEFAULT_PREMIUM_EXPECTED_TIER,
  DEFAULT_SUPPORT_CLAIM_RAIL,
  isSupportedSupportClaimRail,
} from "@/lib/premium/purchase-semantics";

// Historical compatibility boundary:
// route path remains `/api/premium/purchase-claims` while runtime meaning is support-claim submission.

type PremiumPurchaseClaimBody = {
  initData?: string;
  claimRail?: string;
  expectedTier?: string;
  externalPayerHandle?: string;
  paymentProofReference?: string;
  paymentProofText?: string;
  claimNote?: string;
  purchaseIntentId?: string;
  purchaseCorrelationCode?: string;
};

type PremiumPurchaseClaimCreateResponse = SupportClaimCreateResponse;

const codeToStatus: Record<SupportClaimCreateErrorCode, number> = {
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
  PREMIUM_PURCHASE_CLAIM_INVALID_INPUT: 400,
  PREMIUM_PURCHASE_CLAIM_FAILED: 500,
};

const normalizeOptionalInput = (
  value: unknown,
  maxLength: number,
): { ok: true; value: string | null } | { ok: false; message: string } => {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return { ok: false, message: "Claim payload contains invalid text fields." };
  }

  const normalized = value.trim();
  if (!normalized) {
    return { ok: true, value: null };
  }

  if (normalized.length > maxLength) {
    return {
      ok: false,
      message: `Claim payload field exceeds ${maxLength} symbols.`,
    };
  }

  return { ok: true, value: normalized };
};

const normalizeSingleLineForTelegram = (value: string | null, maxLength: number): string => {
  if (!value) {
    return "not set";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "not set";
  }

  return normalized.slice(0, maxLength);
};

const formatClaimRailForOwner = (claimRail: SupportClaimRail): string => {
  if (claimRail === "one_time_premium") {
    return "one_time_premium (current support-claim rail)";
  }

  if (claimRail === "boosty_premium") {
    return "boosty_premium (legacy historical rail)";
  }

  return claimRail;
};

const sendOwnerClaimNotification = async (params: {
  claimId: string;
  submittedAt: string;
  telegramUserId: string;
  claimRail: SupportClaimRail;
  expectedTier: string;
  purchaseCode: string | null;
  proofReference: string | null;
  workspaceTitle: string;
}): Promise<void> => {
  if (!serverEnv.bugReportTelegramChatId) {
    return;
  }

  const message = [
    "Payment Control - new support claim for owner review",
    "",
    "Event: user submitted support proof after external support action.",
    "Important: no automatic Premium activation in this flow. Owner review is required.",
    "",
    `Claim id: ${params.claimId}`,
    `Submitted at (UTC): ${params.submittedAt}`,
    `Telegram user id: ${params.telegramUserId}`,
    `Claim rail: ${formatClaimRailForOwner(params.claimRail)}`,
    `Expected perk tier: ${normalizeSingleLineForTelegram(params.expectedTier, 64)}`,
    `Support reference code: ${normalizeSingleLineForTelegram(params.purchaseCode, 32)}`,
    `Support proof reference: ${normalizeSingleLineForTelegram(params.proofReference, 140)}`,
    `Workspace: ${normalizeSingleLineForTelegram(params.workspaceTitle, 80)}`,
    "",
    "Review path: Profile -> Owner premium admin -> Support claim validation queue",
  ].join("\n");

  const deliveryResult = await sendTelegramMessageWithPreflight({
    recipientTelegramUserId: serverEnv.bugReportTelegramChatId,
    recipientSource: "stored_chat_id",
    text: message,
  });

  if (deliveryResult.status !== "sent") {
    console.error("Support claim owner notification failed.", {
      errorCode: deliveryResult.errorCode,
      errorMessage: deliveryResult.errorMessage,
      diagnosticCode: deliveryResult.diagnosticCode,
    });
  }
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json<PremiumPurchaseClaimCreateResponse>(
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

  let body: PremiumPurchaseClaimBody = {};
  try {
    body = (await request.json()) as PremiumPurchaseClaimBody;
  } catch {
    body = {};
  }

  const normalizedClaimRail = body.claimRail?.trim() || DEFAULT_SUPPORT_CLAIM_RAIL;
  if (!isSupportedSupportClaimRail(normalizedClaimRail)) {
    return NextResponse.json<PremiumPurchaseClaimCreateResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_CLAIM_INVALID_INPUT",
          message: "Claim rail is not supported.",
        },
      },
      { status: 400 },
    );
  }
  const claimRail = normalizedClaimRail as SupportClaimRail;

  const expectedTier = body.expectedTier?.trim() || DEFAULT_PREMIUM_EXPECTED_TIER;
  if (!expectedTier || expectedTier.length > 64) {
    return NextResponse.json<PremiumPurchaseClaimCreateResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_CLAIM_INVALID_INPUT",
          message: "Expected tier is required and must be at most 64 symbols.",
        },
      },
      { status: 400 },
    );
  }

  const externalPayerHandle = normalizeOptionalInput(body.externalPayerHandle, 128);
  if (!externalPayerHandle.ok) {
    return NextResponse.json<PremiumPurchaseClaimCreateResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_CLAIM_INVALID_INPUT",
          message: externalPayerHandle.message,
        },
      },
      { status: 400 },
    );
  }

  const paymentProofReference = normalizeOptionalInput(body.paymentProofReference, 512);
  if (!paymentProofReference.ok) {
    return NextResponse.json<PremiumPurchaseClaimCreateResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_CLAIM_INVALID_INPUT",
          message: paymentProofReference.message,
        },
      },
      { status: 400 },
    );
  }

  const paymentProofText = normalizeOptionalInput(body.paymentProofText, 4000);
  if (!paymentProofText.ok) {
    return NextResponse.json<PremiumPurchaseClaimCreateResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_CLAIM_INVALID_INPUT",
          message: paymentProofText.message,
        },
      },
      { status: 400 },
    );
  }

  const claimNote = normalizeOptionalInput(body.claimNote, 1000);
  if (!claimNote.ok) {
    return NextResponse.json<PremiumPurchaseClaimCreateResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_CLAIM_INVALID_INPUT",
          message: claimNote.message,
        },
      },
      { status: 400 },
    );
  }

  const purchaseIntentId = normalizeOptionalInput(body.purchaseIntentId, 64);
  if (!purchaseIntentId.ok) {
    return NextResponse.json<PremiumPurchaseClaimCreateResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_CLAIM_INVALID_INPUT",
          message: purchaseIntentId.message,
        },
      },
      { status: 400 },
    );
  }

  const purchaseCorrelationCode = normalizeOptionalInput(
    body.purchaseCorrelationCode,
    24,
  );
  if (!purchaseCorrelationCode.ok) {
    return NextResponse.json<PremiumPurchaseClaimCreateResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_CLAIM_INVALID_INPUT",
          message: purchaseCorrelationCode.message,
        },
      },
      { status: 400 },
    );
  }

  const contextResult = await readCurrentAppContext(body.initData);
  if (!contextResult.ok) {
    return NextResponse.json<PremiumPurchaseClaimCreateResponse>(
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

  const createResult = await createSupportClaim({
    profileId: contextResult.profile.id,
    workspaceId: contextResult.workspace.id,
    telegramUserId: contextResult.profile.telegramUserId,
    claimRail,
    expectedTier,
    externalPayerHandle: externalPayerHandle.value,
    paymentProofReference: paymentProofReference.value,
    paymentProofText: paymentProofText.value,
    claimNote: claimNote.value,
    purchaseIntentId: purchaseIntentId.value,
    purchaseCorrelationCode: purchaseCorrelationCode.value,
  });

  if (!createResult.ok) {
    const status =
      createResult.reason === "INVALID_INPUT"
        ? 400
        : createResult.reason === "FOUNDATION_NOT_READY"
          ? 409
          : 500;

    return NextResponse.json<PremiumPurchaseClaimCreateResponse>(
      {
        ok: false,
        error: {
          code:
            createResult.reason === "INVALID_INPUT"
              ? "PREMIUM_PURCHASE_CLAIM_INVALID_INPUT"
              : "PREMIUM_PURCHASE_CLAIM_FAILED",
          message: createResult.message,
        },
      },
      { status },
    );
  }

  try {
    await sendOwnerClaimNotification({
      claimId: createResult.data.id,
      submittedAt: createResult.data.submittedAt,
      telegramUserId: contextResult.profile.telegramUserId,
      claimRail: createResult.data.claimRail,
      expectedTier: createResult.data.expectedTier,
      purchaseCode: createResult.data.purchaseCorrelationCode,
      proofReference: createResult.data.paymentProofReference,
      workspaceTitle: contextResult.workspace.title,
    });
  } catch (error) {
    console.error("Unexpected owner notification error for support claim.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return NextResponse.json<PremiumPurchaseClaimCreateResponse>({
    ok: true,
    claim: createResult.data,
  });
}
