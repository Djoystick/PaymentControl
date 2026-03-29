import { NextResponse } from "next/server";
import { readCurrentAppContext } from "@/lib/app-context/service";
import type {
  PremiumPurchaseIntentReadMineErrorCode,
  PremiumPurchaseIntentReadMineResponse,
} from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readPremiumPurchaseIntentsForProfile } from "@/lib/premium/purchase-intent-repository";

type PremiumPurchaseIntentsMineBody = {
  initData?: string;
  limit?: number;
};

const codeToStatus: Record<PremiumPurchaseIntentReadMineErrorCode, number> = {
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
  PREMIUM_PURCHASE_INTENT_READ_FAILED: 500,
};

export async function POST(request: Request) {
  let body: PremiumPurchaseIntentsMineBody = {};
  try {
    body = (await request.json()) as PremiumPurchaseIntentsMineBody;
  } catch {
    body = {};
  }

  const contextResult = await readCurrentAppContext(body.initData);
  if (!contextResult.ok) {
    return NextResponse.json<PremiumPurchaseIntentReadMineResponse>(
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

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json<PremiumPurchaseIntentReadMineResponse>(
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

  const normalizedLimit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.min(20, Math.max(1, Math.floor(body.limit)))
      : 10;

  const readResult = await readPremiumPurchaseIntentsForProfile({
    profileId: contextResult.profile.id,
    telegramUserId: contextResult.profile.telegramUserId,
    limit: normalizedLimit,
  });

  if (!readResult.ok) {
    return NextResponse.json<PremiumPurchaseIntentReadMineResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_INTENT_READ_FAILED",
          message: readResult.message,
        },
      },
      { status: readResult.reason === "FOUNDATION_NOT_READY" ? 409 : 500 },
    );
  }

  return NextResponse.json<PremiumPurchaseIntentReadMineResponse>({
    ok: true,
    intents: readResult.data,
  });
}
