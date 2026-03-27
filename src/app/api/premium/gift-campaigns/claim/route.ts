import { NextResponse } from "next/server";
import { readCurrentAppContext } from "@/lib/app-context/service";
import type {
  GiftPremiumClaimErrorCode,
  GiftPremiumClaimResponse,
} from "@/lib/auth/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { claimGiftPremiumCampaign } from "@/lib/premium/gift-campaign-repository";

type GiftPremiumClaimBody = {
  initData?: string;
  campaignCode?: string;
};

const codeToStatus: Record<GiftPremiumClaimErrorCode, number> = {
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
  GIFT_PREMIUM_CLAIM_FAILED: 500,
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json<GiftPremiumClaimResponse>(
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

  let body: GiftPremiumClaimBody = {};
  try {
    body = (await request.json()) as GiftPremiumClaimBody;
  } catch {
    body = {};
  }

  const campaignCode = body.campaignCode?.trim() ?? "";
  if (!campaignCode) {
    return NextResponse.json<GiftPremiumClaimResponse>(
      {
        ok: false,
        error: {
          code: "GIFT_PREMIUM_CLAIM_FAILED",
          message: "Gift campaign code is required.",
        },
      },
      { status: 400 },
    );
  }

  const contextResult = await readCurrentAppContext(body.initData);
  if (!contextResult.ok) {
    return NextResponse.json<GiftPremiumClaimResponse>(
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

  const claimResult = await claimGiftPremiumCampaign(
    contextResult.profile.id,
    contextResult.workspace.id,
    campaignCode,
  );
  if (!claimResult) {
    return NextResponse.json<GiftPremiumClaimResponse>(
      {
        ok: false,
        error: {
          code: "GIFT_PREMIUM_CLAIM_FAILED",
          message: "Failed to process gift premium claim.",
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json<GiftPremiumClaimResponse>({
    ok: true,
    result: claimResult,
  });
}
