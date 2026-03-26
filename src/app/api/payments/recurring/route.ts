import { NextResponse } from "next/server";
import type { PaymentApiError, PaymentMutateResponse } from "@/lib/payments/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolvePaymentsScope } from "@/lib/payments/context";
import {
  createRecurringPaymentForWorkspace,
  listWorkspaceResponsiblePayerOptions,
} from "@/lib/payments/repository";
import { validateCreateRecurringPaymentInput } from "@/lib/payments/validation";

type CreatePaymentBody = {
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

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  let body: CreatePaymentBody = {};
  try {
    body = (await request.json()) as CreatePaymentBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolvePaymentsScope(body.initData, {
    allowFamilyWorkspace: true,
  });
  if (!scopeResult.ok) {
    return jsonError(scopeResult.error.code, scopeResult.error.message);
  }

  const validationResult = validateCreateRecurringPaymentInput(body);
  if (!validationResult.ok) {
    return jsonError("PAYMENT_VALIDATION_FAILED", validationResult.message);
  }

  const normalizedInput = {
    ...validationResult.data,
    responsibleProfileId:
      scopeResult.workspace.kind === "family"
        ? validationResult.data.responsibleProfileId
        : null,
  };

  if (
    scopeResult.workspace.kind === "family" &&
    normalizedInput.responsibleProfileId
  ) {
    const responsiblePayerOptions = await listWorkspaceResponsiblePayerOptions(
      scopeResult.workspace.id,
    );
    if (!responsiblePayerOptions) {
      return jsonError(
        "PAYMENT_CREATE_FAILED",
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

  const created = await createRecurringPaymentForWorkspace(
    scopeResult.workspace.id,
    normalizedInput,
    scopeResult.workspace.kind === "family" ? "shared" : "personal",
  );
  if (!created) {
    return jsonError("PAYMENT_CREATE_FAILED", "Failed to create recurring payment.");
  }

  return NextResponse.json<PaymentMutateResponse>({
    ok: true,
    payment: created,
    workspace: scopeResult.workspace,
  });
}

