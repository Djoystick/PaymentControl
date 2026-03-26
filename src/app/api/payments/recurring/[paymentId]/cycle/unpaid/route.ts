import { NextResponse } from "next/server";
import type { PaymentApiError, PaymentMutateResponse } from "@/lib/payments/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolvePaymentsScope } from "@/lib/payments/context";
import { setCurrentCycleStateForPayment } from "@/lib/payments/repository";

type MarkUnpaidBody = {
  initData?: string;
};

const codeToStatus: Record<PaymentApiError["error"]["code"], number> = {
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
  WORKSPACE_KIND_NOT_SUPPORTED: 409,
  WORKSPACE_UNAVAILABLE: 409,
  WORKSPACE_LIST_FAILED: 500,
  PAYMENT_VALIDATION_FAILED: 400,
  PAYMENT_LIST_FAILED: 500,
  PAYMENT_CREATE_FAILED: 500,
  PAYMENT_UPDATE_FAILED: 500,
  PAYMENT_ARCHIVE_FAILED: 500,
  PAYMENT_NOT_FOUND: 404,
};

const jsonError = (
  code: PaymentApiError["error"]["code"],
  message: string,
) => {
  return NextResponse.json<PaymentMutateResponse>(
    {
      ok: false,
      error: { code, message },
    },
    { status: codeToStatus[code] ?? 400 },
  );
};

type RouteContext = {
  params: Promise<{ paymentId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  const { paymentId } = await context.params;
  if (!paymentId) {
    return jsonError("PAYMENT_NOT_FOUND", "Payment id is required.");
  }

  let body: MarkUnpaidBody = {};
  try {
    body = (await request.json()) as MarkUnpaidBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolvePaymentsScope(body.initData, {
    allowFamilyWorkspace: true,
  });
  if (!scopeResult.ok) {
    return jsonError(scopeResult.error.code, scopeResult.error.message);
  }

  const markResult = await setCurrentCycleStateForPayment(
    scopeResult.workspace.id,
    paymentId,
    "unpaid",
    scopeResult.workspace.kind === "family" ? "shared" : "personal",
  );
  if (!markResult.ok) {
    if (markResult.reason === "NOT_FOUND") {
      return jsonError("PAYMENT_NOT_FOUND", "Recurring payment was not found.");
    }

    if (markResult.reason === "PAYMENT_ARCHIVED") {
      return jsonError(
        "PAYMENT_VALIDATION_FAILED",
        "Archived payment cannot be changed.",
      );
    }

    return jsonError(
      "PAYMENT_UPDATE_FAILED",
      "Failed to mark current payment cycle as unpaid.",
    );
  }

  return NextResponse.json<PaymentMutateResponse>({
    ok: true,
    payment: markResult.payment,
    workspace: scopeResult.workspace,
  });
}
