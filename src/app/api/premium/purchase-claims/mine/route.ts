import { NextResponse } from "next/server";
import { readCurrentAppContext } from "@/lib/app-context/service";
import type {
  PremiumPurchaseClaimPayload,
  PremiumPurchaseClaimReadMineErrorCode,
  PremiumPurchaseClaimReadMineResponse,
  PremiumPurchaseClaimStatus,
} from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PremiumPurchaseClaimRow = {
  id: string;
  profile_id: string;
  workspace_id: string | null;
  telegram_user_id: string;
  claim_rail: PremiumPurchaseClaimPayload["claimRail"];
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

type PremiumPurchaseClaimsMineBody = {
  initData?: string;
  limit?: number;
};

const codeToStatus: Record<PremiumPurchaseClaimReadMineErrorCode, number> = {
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
  PREMIUM_PURCHASE_CLAIM_READ_FAILED: 500,
};

const selection =
  "id, profile_id, workspace_id, telegram_user_id, claim_rail, expected_tier, external_payer_handle, payment_proof_reference, payment_proof_text, claim_status, purchase_intent_id, purchase_correlation_code, claim_note, admin_note, entitlement_id, submitted_at, reviewed_at, reviewed_by_admin_telegram_user_id, metadata, created_at, updated_at";

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

export async function POST(request: Request) {
  let body: PremiumPurchaseClaimsMineBody = {};
  try {
    body = (await request.json()) as PremiumPurchaseClaimsMineBody;
  } catch {
    body = {};
  }

  const contextResult = await readCurrentAppContext(body.initData);
  if (!contextResult.ok) {
    return NextResponse.json<PremiumPurchaseClaimReadMineResponse>(
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
    return NextResponse.json<PremiumPurchaseClaimReadMineResponse>(
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

  const { data: claims, error: claimsError } = await supabase
    .from("premium_purchase_claims")
    .select(selection)
    .eq("profile_id", contextResult.profile.id)
    .eq("telegram_user_id", contextResult.profile.telegramUserId)
    .order("submitted_at", { ascending: false })
    .limit(normalizedLimit)
    .returns<PremiumPurchaseClaimRow[]>();

  if (claimsError?.code === "42P01" || claimsError?.code === "PGRST205") {
    return NextResponse.json<PremiumPurchaseClaimReadMineResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_CLAIM_READ_FAILED",
          message:
            "Premium purchase claim foundation is not ready. Apply Phase 22A migration.",
        },
      },
      { status: 409 },
    );
  }

  if (claimsError || !claims) {
    return NextResponse.json<PremiumPurchaseClaimReadMineResponse>(
      {
        ok: false,
        error: {
          code: "PREMIUM_PURCHASE_CLAIM_READ_FAILED",
          message: "Failed to read premium purchase claims.",
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json<PremiumPurchaseClaimReadMineResponse>({
    ok: true,
    claims: claims.map((claim) => toPayload(claim)),
  });
}
