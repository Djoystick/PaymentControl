import { NextResponse } from "next/server";
import { readCurrentAppContext } from "@/lib/app-context/service";
import type {
  SupportReferenceCreateErrorCode,
  SupportReferenceCreateResponse,
  SupportReferenceRail,
} from "@/lib/auth/types";
import { transitionSupportReferenceStatus } from "@/lib/premium/purchase-intent-repository";
import { isSupportedSupportClaimRail } from "@/lib/premium/purchase-semantics";

type SupportReferenceStatusBody = {
  initData?: string;
  transition?: string;
  transitionRail?: string;
};

type RouteContext = {
  params: Promise<{
    intentId: string;
  }>;
};

const codeToStatus: Record<SupportReferenceCreateErrorCode, number> = {
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

export async function POST(request: Request, context: RouteContext) {
  let body: SupportReferenceStatusBody = {};
  try {
    body = (await request.json()) as SupportReferenceStatusBody;
  } catch {
    body = {};
  }

  const params = await context.params;
  const intentId = params.intentId?.trim() ?? "";
  const transition = body.transition?.trim();

  if (transition !== "opened_external" && transition !== "returned") {
    return NextResponse.json<SupportReferenceCreateResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_INTENT_INVALID_INPUT",
          message: "Support reference transition is invalid.",
        },
      },
      { status: 400 },
    );
  }

  const normalizedTransitionRail = body.transitionRail?.trim() ?? "";
  let transitionRail: SupportReferenceRail | null = null;
  if (normalizedTransitionRail) {
    if (!isSupportedSupportClaimRail(normalizedTransitionRail)) {
      return NextResponse.json<SupportReferenceCreateResponse>(
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
    transitionRail = normalizedTransitionRail as SupportReferenceRail;
  }

  const contextResult = await readCurrentAppContext(body.initData);
  if (!contextResult.ok) {
    return NextResponse.json<SupportReferenceCreateResponse>(
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

  const transitionResult = await transitionSupportReferenceStatus({
    profileId: contextResult.profile.id,
    telegramUserId: contextResult.profile.telegramUserId,
    intentId,
    transition,
    transitionRail: transitionRail ?? null,
  });

  if (!transitionResult.ok) {
    const status =
      transitionResult.reason === "INVALID_INPUT"
        ? 400
        : transitionResult.reason === "NOT_FOUND"
          ? 404
          : transitionResult.reason === "FOUNDATION_NOT_READY"
            ? 409
            : 500;

    return NextResponse.json<SupportReferenceCreateResponse>(
      {
        ok: false,
        error: {
          code:
            transitionResult.reason === "INVALID_INPUT"
              ? "PREMIUM_PURCHASE_INTENT_INVALID_INPUT"
              : "PREMIUM_PURCHASE_INTENT_FAILED",
          message: transitionResult.message,
        },
      },
      { status },
    );
  }

  return NextResponse.json<SupportReferenceCreateResponse>({
    ok: true,
    intent: transitionResult.data,
  });
}
