import { NextResponse } from "next/server";
import type { PaymentApiError, ReminderTestSendResponse } from "@/lib/payments/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolvePaymentsScope } from "@/lib/payments/context";
import { readCurrentAppContext } from "@/lib/app-context/service";
import { runManualReminderTestSend } from "@/lib/payments/reminder-dispatch";
import { evaluateTelegramDeliveryReadiness } from "@/lib/payments/telegram-delivery";
import { resolveTelegramRecipientBinding } from "@/lib/payments/recipient-binding";

type ReminderTestSendBody = {
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
  return NextResponse.json<ReminderTestSendResponse>(
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

  let body: ReminderTestSendBody = {};
  try {
    body = (await request.json()) as ReminderTestSendBody;
  } catch {
    body = {};
  }

  const scopeResult = await resolvePaymentsScope(body.initData);
  if (!scopeResult.ok) {
    return jsonError(scopeResult.error.code, scopeResult.error.message);
  }

  const contextResult = await readCurrentAppContext(body.initData);
  if (!contextResult.ok) {
    return jsonError(contextResult.error.code, contextResult.error.message);
  }

  const binding = await resolveTelegramRecipientBinding({
    workspaceId: scopeResult.workspace.id,
    profileId: contextResult.profile.id,
    profileTelegramUserId: contextResult.profile.telegramUserId,
  });

  const testSendResult = await runManualReminderTestSend({
    workspaceId: scopeResult.workspace.id,
    profileId: contextResult.profile.id,
    profileTelegramUserId: contextResult.profile.telegramUserId,
    triggeredByProfileId: contextResult.profile.id,
    recipientTelegramUserId: binding.recipientTelegramUserId,
    recipientSource: binding.recipientSource,
  });
  if (!testSendResult) {
    return jsonError(
      "PAYMENT_UPDATE_FAILED",
      "Failed to run manual reminder test send.",
    );
  }

  const refreshedBinding = await resolveTelegramRecipientBinding({
    workspaceId: scopeResult.workspace.id,
    profileId: contextResult.profile.id,
    profileTelegramUserId: contextResult.profile.telegramUserId,
  });

  const readiness = evaluateTelegramDeliveryReadiness(
    refreshedBinding.recipientTelegramUserId,
    refreshedBinding.recipientSource,
    refreshedBinding.bindingStatus,
    refreshedBinding.bindingReason,
    refreshedBinding.bindingReasonIsInference,
    refreshedBinding.bindingVerifiedAt,
    testSendResult.errorCode,
    testSendResult.errorMessage,
  );

  if (testSendResult.diagnosticCode) {
    readiness.code = testSendResult.diagnosticCode;
    readiness.message =
      testSendResult.diagnosticMessage ?? readiness.message;
    readiness.deliveryReady = false;
    readiness.bindingReason = readiness.message;
    readiness.bindingReasonIsInference = testSendResult.diagnosticIsInference;
  }

  return NextResponse.json<ReminderTestSendResponse>({
    ok: true,
    readiness,
    result: {
      status: testSendResult.status,
      errorCode: testSendResult.errorCode,
      errorMessage: testSendResult.errorMessage,
      diagnosticCode: testSendResult.diagnosticCode,
      diagnosticMessage: testSendResult.diagnosticMessage,
      diagnosticIsInference: testSendResult.diagnosticIsInference,
    },
    recentAttempts: testSendResult.recentAttempts,
    workspace: scopeResult.workspace,
  });
}

