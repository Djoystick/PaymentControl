import { NextResponse } from "next/server";
import type {
  PaymentApiError,
  ReminderBindingVerifyResponse,
  TelegramBindingStatus,
} from "@/lib/payments/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolvePaymentsScope } from "@/lib/payments/context";
import { readCurrentAppContext } from "@/lib/app-context/service";
import { evaluateTelegramDeliveryReadiness, sendTelegramMessageWithPreflight } from "@/lib/payments/telegram-delivery";
import {
  resolveTelegramRecipientBinding,
  setManualTelegramRecipientBinding,
  upsertTelegramRecipientBindingObservation,
} from "@/lib/payments/recipient-binding";

type VerifyReminderBindingBody = {
  initData?: string;
  recipientChatId?: string;
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
  return NextResponse.json<ReminderBindingVerifyResponse>(
    {
      ok: false,
      error: { code, message },
    },
    { status: codeToStatus[code] ?? 400 },
  );
};

const toDateOnly = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const deriveBindingStatusFromSendResult = (
  status: "sent" | "skipped" | "failed",
  errorCode: string | null,
  diagnosticMessage: string | null,
  diagnosticIsInference: boolean,
): {
  bindingStatus: TelegramBindingStatus;
  bindingReason: string | null;
  bindingReasonIsInference: boolean;
} => {
  if (status === "sent") {
    return {
      bindingStatus: "verified",
      bindingReason: "Manual binding verification succeeded.",
      bindingReasonIsInference: false,
    };
  }

  if (errorCode === "RECIPIENT_NOT_RESOLVED") {
    return {
      bindingStatus: "missing",
      bindingReason: "Recipient is missing for current binding.",
      bindingReasonIsInference: false,
    };
  }

  if (
    errorCode === "RECIPIENT_FORMAT_INVALID" ||
    errorCode === "RECIPIENT_USERNAME_INSTEAD_OF_CHAT_ID_INFERENCE"
  ) {
    return {
      bindingStatus: "invalid",
      bindingReason:
        diagnosticMessage ??
        "Recipient is not a valid numeric private chat id.",
      bindingReasonIsInference: errorCode !== "RECIPIENT_FORMAT_INVALID",
    };
  }

  if (
    errorCode === "TELEGRAM_CHAT_NOT_FOUND_STALE_BINDING_INFERENCE" ||
    errorCode === "TELEGRAM_CHAT_NOT_FOUND_BOT_NOT_STARTED_INFERENCE" ||
    errorCode === "TELEGRAM_CHAT_NOT_FOUND_USERNAME_INFERENCE" ||
    errorCode === "TELEGRAM_CHAT_NOT_FOUND_UNKNOWN_BINDING_INFERENCE"
  ) {
    return {
      bindingStatus: "invalid",
      bindingReason: diagnosticMessage,
      bindingReasonIsInference: true,
    };
  }

  return {
    bindingStatus: "unverified",
    bindingReason: diagnosticMessage,
    bindingReasonIsInference: diagnosticIsInference,
  };
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  let body: VerifyReminderBindingBody = {};
  try {
    body = (await request.json()) as VerifyReminderBindingBody;
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

  const manualRecipient = body.recipientChatId?.trim() ?? "";
  if (manualRecipient) {
    const manualBindingSaved = await setManualTelegramRecipientBinding({
      workspaceId: scopeResult.workspace.id,
      profileId: contextResult.profile.id,
      profileTelegramUserId: contextResult.profile.telegramUserId,
      recipientChatId: manualRecipient,
    });
    if (!manualBindingSaved) {
      return jsonError(
        "PAYMENT_UPDATE_FAILED",
        "Failed to persist manual Telegram chat binding.",
      );
    }
  }

  const binding = await resolveTelegramRecipientBinding({
    workspaceId: scopeResult.workspace.id,
    profileId: contextResult.profile.id,
    profileTelegramUserId: contextResult.profile.telegramUserId,
    mode: "verification",
  });

  const verificationMessage = `Binding verification check (${toDateOnly(new Date())}).`;
  const sendResult = await sendTelegramMessageWithPreflight({
    recipientTelegramUserId: binding.recipientTelegramUserId,
    recipientSource: binding.recipientSource,
    text: verificationMessage,
  });

  const bindingObservation = deriveBindingStatusFromSendResult(
    sendResult.status,
    sendResult.errorCode,
    sendResult.diagnosticMessage,
    sendResult.diagnosticIsInference,
  );

  const bindingSaved = await upsertTelegramRecipientBindingObservation({
    workspaceId: scopeResult.workspace.id,
    profileId: contextResult.profile.id,
    profileTelegramUserId: contextResult.profile.telegramUserId,
    recipientSource: binding.recipientSource,
    recipientTelegramUserId: binding.recipientTelegramUserId,
    bindingStatus: bindingObservation.bindingStatus,
    bindingReason: bindingObservation.bindingReason,
    bindingReasonIsInference: bindingObservation.bindingReasonIsInference,
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
  });
  if (!bindingSaved) {
    return jsonError(
      "PAYMENT_UPDATE_FAILED",
      "Failed to persist binding verification result.",
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
    refreshedBinding.lastErrorCode,
    refreshedBinding.lastErrorMessage,
  );

  if (sendResult.diagnosticCode) {
    readiness.code = sendResult.diagnosticCode;
    readiness.message = sendResult.diagnosticMessage ?? readiness.message;
    readiness.deliveryReady = false;
    readiness.bindingReason = readiness.message;
    readiness.bindingReasonIsInference = sendResult.diagnosticIsInference;
  }

  return NextResponse.json<ReminderBindingVerifyResponse>({
    ok: true,
    readiness,
    result: {
      status: sendResult.status,
      errorCode: sendResult.errorCode,
      errorMessage: sendResult.errorMessage,
      diagnosticCode: sendResult.diagnosticCode,
      diagnosticMessage: sendResult.diagnosticMessage,
      diagnosticIsInference: sendResult.diagnosticIsInference,
    },
    workspace: scopeResult.workspace,
  });
}

