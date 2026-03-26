import { NextResponse } from "next/server";
import type { PaymentApiError, PaymentMutateResponse } from "@/lib/payments/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolvePaymentsScope } from "@/lib/payments/context";
import {
  listWorkspaceResponsiblePayerOptions,
  updateRecurringPaymentForWorkspace,
} from "@/lib/payments/repository";
import { validateUpdateRecurringPaymentInput } from "@/lib/payments/validation";

type UpdatePaymentBody = {
  initData?: string;
  title?: unknown;
  amount?: unknown;
  currency?: unknown;
  category?: unknown;
  cadence?: unknown;
  dueDay?: unknown;
  isRequired?: unknown;
  isSubscription?: unknown;
  remindersEnabled?: unknown;
  remindDaysBefore?: unknown;
  remindOnDueDay?: unknown;
  remindOnOverdue?: unknown;
  responsibleProfileId?: unknown;
  notes?: unknown;
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

export async function PATCH(request: Request, context: RouteContext) {
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

  let body: UpdatePaymentBody = {};
  try {
    body = (await request.json()) as UpdatePaymentBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolvePaymentsScope(body.initData, {
    allowFamilyWorkspace: true,
  });
  if (!scopeResult.ok) {
    return jsonError(scopeResult.error.code, scopeResult.error.message);
  }

  const validationResult = validateUpdateRecurringPaymentInput(body);
  if (!validationResult.ok) {
    return jsonError("PAYMENT_VALIDATION_FAILED", validationResult.message);
  }

  const normalizedInput = {
    ...validationResult.data,
    ...(scopeResult.workspace.kind === "personal" &&
    "responsibleProfileId" in validationResult.data
      ? { responsibleProfileId: null }
      : {}),
  };

  if (
    scopeResult.workspace.kind === "family" &&
    normalizedInput.responsibleProfileId !== undefined &&
    normalizedInput.responsibleProfileId !== null
  ) {
    const responsiblePayerOptions = await listWorkspaceResponsiblePayerOptions(
      scopeResult.workspace.id,
    );
    if (!responsiblePayerOptions) {
      return jsonError(
        "PAYMENT_UPDATE_FAILED",
        "Failed to validate responsible payer for current family workspace.",
      );
    }

    const isWorkspaceMember = responsiblePayerOptions.some(
      (member) => member.profileId === normalizedInput.responsibleProfileId,
    );
    if (!isWorkspaceMember) {
      return jsonError(
        "PAYMENT_VALIDATION_FAILED",
        "Responsible payer must be a member of the current family workspace.",
      );
    }
  }

  const updated = await updateRecurringPaymentForWorkspace(
    scopeResult.workspace.id,
    paymentId,
    normalizedInput,
    scopeResult.workspace.kind === "family" ? "shared" : "personal",
  );
  if (!updated) {
    return jsonError(
      "PAYMENT_UPDATE_FAILED",
      "Failed to update recurring payment for current workspace.",
    );
  }

  return NextResponse.json<PaymentMutateResponse>({
    ok: true,
    payment: updated,
    workspace: scopeResult.workspace,
  });
}
