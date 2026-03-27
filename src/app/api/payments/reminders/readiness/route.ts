import { NextResponse } from "next/server";
import type {
  PaymentApiError,
  ReminderDeliveryReadinessResponse,
} from "@/lib/payments/types";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { resolvePaymentsScope } from "@/lib/payments/context";
import { readCurrentAppContext } from "@/lib/app-context/service";
import { evaluateTelegramDeliveryReadiness } from "@/lib/payments/telegram-delivery";
import { readRecentReminderDispatchAttemptsByWorkspace } from "@/lib/payments/repository";
import {
  resolveTelegramRecipientBinding,
  upsertTelegramRecipientBindingObservation,
} from "@/lib/payments/recipient-binding";

type ReadReminderDeliveryReadinessBody = {
  initData?: string;
};
const RECENT_ATTEMPTS_LIMIT = 10;

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
  return NextResponse.json<ReminderDeliveryReadinessResponse>(
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

  let body: ReadReminderDeliveryReadinessBody = {};
  try {
    body = (await request.json()) as ReadReminderDeliveryReadinessBody;
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

  const recentAttempts = await readRecentReminderDispatchAttemptsByWorkspace(
    scopeResult.workspace.id,
    RECENT_ATTEMPTS_LIMIT,
  );
  if (!recentAttempts) {
    return jsonError(
      "PAYMENT_LIST_FAILED",
      "Unable to load reminder dispatch attempts.",
    );
  }

  const lastAttempt = recentAttempts[0] ?? null;
  const binding = await resolveTelegramRecipientBinding({
    workspaceId: scopeResult.workspace.id,
    profileId: contextResult.profile.id,
    profileTelegramUserId: contextResult.profile.telegramUserId,
  });

  const effectiveLastErrorCode =
    binding.bindingStatus === "verified"
      ? null
      : (binding.lastErrorCode ?? lastAttempt?.errorCode ?? null);
  const effectiveLastErrorMessage =
    binding.bindingStatus === "verified"
      ? null
      : (binding.lastErrorMessage ?? lastAttempt?.errorMessage ?? null);

  const readiness = evaluateTelegramDeliveryReadiness(
    binding.recipientTelegramUserId,
    binding.recipientSource,
    binding.bindingStatus,
    binding.bindingReason,
    binding.bindingReasonIsInference,
    binding.bindingVerifiedAt,
    effectiveLastErrorCode,
    effectiveLastErrorMessage,
  );

  if (
    readiness.deliveryReady &&
    binding.bindingStatus !== "verified" &&
    (lastAttempt?.errorCode === "TELEGRAM_CHAT_NOT_FOUND_BOT_NOT_STARTED_INFERENCE" ||
      lastAttempt?.errorCode === "TELEGRAM_CHAT_NOT_FOUND_BINDING_MISMATCH_INFERENCE" ||
      lastAttempt?.errorCode === "TELEGRAM_CHAT_NOT_FOUND_STALE_BINDING_INFERENCE" ||
      lastAttempt?.errorCode === "TELEGRAM_CHAT_NOT_FOUND_USERNAME_INFERENCE" ||
      lastAttempt?.errorCode === "TELEGRAM_CHAT_NOT_FOUND_UNKNOWN_BINDING_INFERENCE" ||
      lastAttempt?.errorCode === "TELEGRAM_CHAT_NOT_FOUND")
  ) {
    if (lastAttempt.errorCode === "TELEGRAM_CHAT_NOT_FOUND_BOT_NOT_STARTED_INFERENCE") {
      readiness.code = "BOT_NOT_STARTED_INFERENCE";
      readiness.message = "Likely bot is not started by user yet (inference).";
      readiness.bindingReason = readiness.message;
      readiness.bindingReasonIsInference = true;
    } else if (lastAttempt.errorCode === "TELEGRAM_CHAT_NOT_FOUND_USERNAME_INFERENCE") {
      readiness.code = "RECIPIENT_USERNAME_INSTEAD_OF_CHAT_ID_INFERENCE";
      readiness.message =
        "Likely recipient is username instead of numeric chat id (inference).";
      readiness.bindingReason = readiness.message;
      readiness.bindingReasonIsInference = true;
    } else if (
      lastAttempt.errorCode === "TELEGRAM_CHAT_NOT_FOUND_BINDING_MISMATCH_INFERENCE" ||
      lastAttempt.errorCode === "TELEGRAM_CHAT_NOT_FOUND_STALE_BINDING_INFERENCE"
    ) {
      readiness.code = "BINDING_MISMATCH_INFERENCE";
      readiness.message =
        "Likely recipient binding mismatch or stale stored chat id (inference).";
      readiness.bindingReason = readiness.message;
      readiness.bindingReasonIsInference = true;
    } else {
      readiness.code = "CHAT_BINDING_FAILURE_INFERENCE";
      readiness.message = "Chat binding failure requires manual check (inference).";
      readiness.bindingReason = readiness.message;
      readiness.bindingReasonIsInference = true;
    }
    readiness.deliveryReady = false;
  }

  const persisted = await upsertTelegramRecipientBindingObservation({
    workspaceId: scopeResult.workspace.id,
    profileId: contextResult.profile.id,
    profileTelegramUserId: contextResult.profile.telegramUserId,
    recipientSource: readiness.recipientSource,
    recipientTelegramUserId: readiness.recipientTelegramUserId,
    bindingStatus: readiness.bindingStatus,
    bindingReason: readiness.bindingReason,
    bindingReasonIsInference: readiness.bindingReasonIsInference,
    errorCode: readiness.lastErrorCode,
    errorMessage: readiness.lastErrorMessage,
  });
  if (!persisted) {
    return jsonError(
      "PAYMENT_UPDATE_FAILED",
      "Unable to persist recipient binding diagnostics.",
    );
  }

  return NextResponse.json<ReminderDeliveryReadinessResponse>({
    ok: true,
    readiness,
    recentAttempts,
    workspace: scopeResult.workspace,
  });
}

