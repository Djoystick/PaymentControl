import { NextResponse } from "next/server";
import { readCurrentAppContext } from "@/lib/app-context/service";
import type {
  PremiumEntitlementReadErrorCode,
  PremiumEntitlementReadResponse,
} from "@/lib/auth/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { readPremiumEntitlementState } from "@/lib/premium/service";

type PremiumEntitlementBody = {
  initData?: string;
};

const codeToStatus: Record<PremiumEntitlementReadErrorCode, number> = {
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
  PREMIUM_ENTITLEMENT_READ_FAILED: 500,
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return NextResponse.json<PremiumEntitlementReadResponse>(
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

  let body: PremiumEntitlementBody = {};
  try {
    body = (await request.json()) as PremiumEntitlementBody;
  } catch {
    body = {};
  }

  const contextResult = await readCurrentAppContext(body.initData);
  if (!contextResult.ok) {
    return NextResponse.json<PremiumEntitlementReadResponse>(
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

  const entitlement = await readPremiumEntitlementState(
    contextResult.profile.id,
    contextResult.workspace.id,
  );
  if (!entitlement) {
    return NextResponse.json<PremiumEntitlementReadResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_ENTITLEMENT_READ_FAILED",
          message: "Failed to read premium entitlement state.",
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json<PremiumEntitlementReadResponse>({
    ok: true,
    entitlement,
  });
}
