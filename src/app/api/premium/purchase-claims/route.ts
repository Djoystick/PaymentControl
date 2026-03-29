import { NextResponse } from "next/server";
import { readCurrentAppContext } from "@/lib/app-context/service";
import type {
  PremiumPurchaseClaimCreateErrorCode,
  PremiumPurchaseClaimCreateResponse,
  PremiumPurchaseClaimRail,
} from "@/lib/auth/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { createPremiumPurchaseClaim } from "@/lib/premium/purchase-claim-repository";

type PremiumPurchaseClaimBody = {
  initData?: string;
  claimRail?: string;
  expectedTier?: string;
  externalPayerHandle?: string;
  paymentProofReference?: string;
  paymentProofText?: string;
  claimNote?: string;
};

const codeToStatus: Record<PremiumPurchaseClaimCreateErrorCode, number> = {
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

  const claimRail = (body.claimRail?.trim() || "boosty_premium") as PremiumPurchaseClaimRail;
  if (claimRail !== "boosty_premium") {
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

  const expectedTier = body.expectedTier?.trim() || "premium";
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

  const createResult = await createPremiumPurchaseClaim({
    profileId: contextResult.profile.id,
    workspaceId: contextResult.workspace.id,
    telegramUserId: contextResult.profile.telegramUserId,
    claimRail,
    expectedTier,
    externalPayerHandle: externalPayerHandle.value,
    paymentProofReference: paymentProofReference.value,
    paymentProofText: paymentProofText.value,
    claimNote: claimNote.value,
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

  return NextResponse.json<PremiumPurchaseClaimCreateResponse>({
    ok: true,
    claim: createResult.data,
  });
}
