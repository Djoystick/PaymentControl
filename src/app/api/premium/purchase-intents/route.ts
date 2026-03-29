import { NextResponse } from "next/server";
import { readCurrentAppContext } from "@/lib/app-context/service";
import type {
  PremiumPurchaseIntentCreateErrorCode,
  PremiumPurchaseIntentCreateResponse,
  PremiumPurchaseIntentRail,
} from "@/lib/auth/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { createPremiumPurchaseIntent } from "@/lib/premium/purchase-intent-repository";
import {
  DEFAULT_PREMIUM_EXPECTED_TIER,
  DEFAULT_PREMIUM_PURCHASE_RAIL,
  isSupportedPremiumPurchaseRail,
} from "@/lib/premium/purchase-semantics";

type PremiumPurchaseIntentBody = {
  initData?: string;
  intentRail?: string;
  expectedTier?: string;
};

const codeToStatus: Record<PremiumPurchaseIntentCreateErrorCode, number> = {
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
  PREMIUM_PURCHASE_INTENT_INVALID_INPUT: 400,
  PREMIUM_PURCHASE_INTENT_FAILED: 500,
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json<PremiumPurchaseIntentCreateResponse>(
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

  let body: PremiumPurchaseIntentBody = {};
  try {
    body = (await request.json()) as PremiumPurchaseIntentBody;
  } catch {
    body = {};
  }

  const normalizedIntentRail = body.intentRail?.trim() || DEFAULT_PREMIUM_PURCHASE_RAIL;
  if (!isSupportedPremiumPurchaseRail(normalizedIntentRail)) {
    return NextResponse.json<PremiumPurchaseIntentCreateResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_INTENT_INVALID_INPUT",
          message: "Intent rail is not supported.",
        },
      },
      { status: 400 },
    );
  }
  const intentRail = normalizedIntentRail as PremiumPurchaseIntentRail;

  const expectedTier = body.expectedTier?.trim() || DEFAULT_PREMIUM_EXPECTED_TIER;
  if (!expectedTier || expectedTier.length > 64) {
    return NextResponse.json<PremiumPurchaseIntentCreateResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_INTENT_INVALID_INPUT",
          message: "Expected tier is required and must be at most 64 symbols.",
        },
      },
      { status: 400 },
    );
  }

  const contextResult = await readCurrentAppContext(body.initData);
  if (!contextResult.ok) {
    return NextResponse.json<PremiumPurchaseIntentCreateResponse>(
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

  const createResult = await createPremiumPurchaseIntent({
    profileId: contextResult.profile.id,
    workspaceId: contextResult.workspace.id,
    telegramUserId: contextResult.profile.telegramUserId,
    intentRail,
    expectedTier,
  });

  if (!createResult.ok) {
    const status =
      createResult.reason === "INVALID_INPUT"
        ? 400
        : createResult.reason === "FOUNDATION_NOT_READY"
          ? 409
          : 500;

    return NextResponse.json<PremiumPurchaseIntentCreateResponse>(
      {
        ok: false,
        error: {
          code:
            createResult.reason === "INVALID_INPUT"
              ? "PREMIUM_PURCHASE_INTENT_INVALID_INPUT"
              : "PREMIUM_PURCHASE_INTENT_FAILED",
          message: createResult.message,
        },
      },
      { status },
    );
  }

  return NextResponse.json<PremiumPurchaseIntentCreateResponse>({
    ok: true,
    intent: createResult.data,
  });
}
