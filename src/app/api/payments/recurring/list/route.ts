import { NextResponse } from "next/server";
import type { PaymentApiError, PaymentsListResponse } from "@/lib/payments/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolvePaymentsScope } from "@/lib/payments/context";
import {
  listRecurringPaymentsByWorkspace,
  listWorkspaceResponsiblePayerOptions,
} from "@/lib/payments/repository";

type ListPaymentsBody = {
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
  return NextResponse.json<PaymentsListResponse>(
    {
      ok: false,
      error: { code, message },
    },
    { status: codeToStatus[code] ?? 400 },
  );
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  let body: ListPaymentsBody = {};
  try {
    body = (await request.json()) as ListPaymentsBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolvePaymentsScope(body.initData, {
    allowFamilyWorkspace: true,
  });
  if (!scopeResult.ok) {
    return jsonError(scopeResult.error.code, scopeResult.error.message);
  }

  const payments = await listRecurringPaymentsByWorkspace(
    scopeResult.workspace.id,
    scopeResult.workspace.kind === "family" ? "shared" : "personal",
  );
  if (!payments) {
    return jsonError(
      "PAYMENT_LIST_FAILED",
      "Unable to load recurring payments for current workspace.",
    );
  }

  const responsiblePayerOptions =
    scopeResult.workspace.kind === "family"
      ? await listWorkspaceResponsiblePayerOptions(scopeResult.workspace.id)
      : [];
  if (!responsiblePayerOptions) {
    return jsonError(
      "PAYMENT_LIST_FAILED",
      "Unable to load family payer options for current workspace.",
    );
  }

  return NextResponse.json<PaymentsListResponse>({
    ok: true,
    payments,
    workspace: scopeResult.workspace,
    responsiblePayerOptions,
  });
}

