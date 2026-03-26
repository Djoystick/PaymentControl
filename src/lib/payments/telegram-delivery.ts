import "server-only";
import { serverEnv } from "@/lib/config/server-env";
import type {
  ReminderDeliveryReadinessPayload,
  TelegramBindingStatus,
  TelegramRecipientSource,
  TelegramRecipientDiagnosticSource,
  TelegramRecipientType,
  TelegramBindingDiagnosticStatus,
} from "@/lib/payments/types";

const isValidUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

const normalizeTelegramRecipient = (value: string | null): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized || null;
};

const isNumericTelegramId = (value: string): boolean => /^-?\d+$/.test(value);

const isLikelyTelegramUsername = (value: string): boolean => {
  return /^@?[a-zA-Z][a-zA-Z0-9_]{2,}$/.test(value);
};

const isValidTelegramRecipientFormat = (value: string): boolean => {
  return isNumericTelegramId(value);
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const mapRecipientDiagnosticSource = (
  source: TelegramRecipientSource,
): TelegramRecipientDiagnosticSource => {
  if (source === "profile_telegram_user_id") {
    return "profile_field";
  }

  if (source === "stored_chat_id") {
    return "stored_binding";
  }

  return "unknown";
};

const detectRecipientType = (
  source: TelegramRecipientSource,
  normalizedRecipient: string | null,
): TelegramRecipientType => {
  if (!normalizedRecipient) {
    return source === "profile_telegram_user_id" ? "profile_field" : "unknown";
  }

  if (isLikelyTelegramUsername(normalizedRecipient)) {
    return "username";
  }

  if (isNumericTelegramId(normalizedRecipient)) {
    return source === "stored_chat_id"
      ? "telegram_private_chat_id"
      : "telegram_user_id_only";
  }

  if (source === "profile_telegram_user_id") {
    return "profile_field";
  }

  if (source === "stored_chat_id") {
    return "derived_binding";
  }

  return "unknown";
};

const deriveBindingDiagnosticStatus = (
  bindingStatus: TelegramBindingStatus,
  lastErrorCode: string | null,
): TelegramBindingDiagnosticStatus => {
  if (bindingStatus === "verified") {
    return "valid";
  }

  if (bindingStatus === "missing") {
    return "missing";
  }

  if (
    bindingStatus === "invalid" &&
    (lastErrorCode === "TELEGRAM_CHAT_NOT_FOUND_STALE_BINDING_INFERENCE" ||
      lastErrorCode === "TELEGRAM_CHAT_NOT_FOUND_BINDING_MISMATCH_INFERENCE")
  ) {
    return "stale";
  }

  if (bindingStatus === "invalid") {
    return "invalid";
  }

  return "unverified";
};

const buildReadinessMessage = (
  code: ReminderDeliveryReadinessPayload["code"],
): string => {
  if (code === "READY") {
    return "Delivery preflight passed.";
  }

  if (code === "BOT_TOKEN_NOT_CONFIGURED") {
    return "Telegram bot token is not configured.";
  }

  if (code === "BOT_API_BASE_INVALID") {
    return "Telegram Bot API base URL is invalid.";
  }

  if (code === "RECIPIENT_NOT_RESOLVED") {
    return "Telegram recipient is not resolved for current context.";
  }

  if (code === "RECIPIENT_FORMAT_INVALID") {
    return "Telegram recipient identifier format is invalid.";
  }

  if (code === "RECIPIENT_USERNAME_INSTEAD_OF_CHAT_ID_INFERENCE") {
    return "Recipient looks like username. Telegram sendMessage requires numeric private chat id (inference).";
  }

  if (code === "BOT_NOT_STARTED_INFERENCE") {
    return "Likely bot is not started by user yet (inference).";
  }

  if (code === "BINDING_MISMATCH_INFERENCE") {
    return "Likely stored binding does not match valid Telegram chat (inference).";
  }

  return "Telegram chat binding failure requires manual check (inference).";
};

export const evaluateTelegramDeliveryReadiness = (
  recipientTelegramUserId: string | null,
  recipientSource: TelegramRecipientSource,
  bindingStatus: TelegramBindingStatus,
  bindingReason: string | null,
  bindingReasonIsInference: boolean,
  bindingVerifiedAt: string | null,
  lastErrorCode: string | null = null,
  lastErrorMessage: string | null = null,
): ReminderDeliveryReadinessPayload => {
  const botConfigured = Boolean(serverEnv.telegramBotToken);
  const botApiBaseUrl = serverEnv.telegramBotApiBaseUrl || null;
  const apiBaseValid = botApiBaseUrl ? isValidUrl(botApiBaseUrl) : false;
  const normalizedRecipient = normalizeTelegramRecipient(recipientTelegramUserId);
  const recipientType = detectRecipientType(recipientSource, normalizedRecipient);
  const recipientDiagnosticSource = mapRecipientDiagnosticSource(recipientSource);
  const recipientResolved = Boolean(normalizedRecipient);
  const recipientFormatValid = normalizedRecipient
    ? isValidTelegramRecipientFormat(normalizedRecipient)
    : false;

  let code: ReminderDeliveryReadinessPayload["code"] = "READY";
  if (!botConfigured) {
    code = "BOT_TOKEN_NOT_CONFIGURED";
  } else if (!apiBaseValid) {
    code = "BOT_API_BASE_INVALID";
  } else if (!recipientResolved) {
    code = "RECIPIENT_NOT_RESOLVED";
  } else if (recipientType === "username") {
    code = "RECIPIENT_USERNAME_INSTEAD_OF_CHAT_ID_INFERENCE";
  } else if (!recipientFormatValid) {
    code = "RECIPIENT_FORMAT_INVALID";
  }

  return {
    code,
    message: buildReadinessMessage(code),
    botConfigured,
    recipientSource,
    recipientDiagnosticSource,
    recipientType,
    recipientPreview: normalizedRecipient,
    bindingStatus,
    bindingDiagnosticStatus: deriveBindingDiagnosticStatus(bindingStatus, lastErrorCode),
    bindingReason,
    bindingReasonIsInference,
    bindingVerifiedAt,
    recipientResolved,
    recipientFormatValid,
    deliveryReady: code === "READY",
    botApiBaseUrl,
    recipientTelegramUserId: normalizedRecipient,
    lastErrorCode,
    lastErrorMessage,
  };
};

type SendTelegramMessageInput = {
  recipientTelegramUserId: string | null;
  recipientSource: TelegramRecipientSource;
  text: string;
};

type SendTelegramMessageResult =
  | {
      status: "sent";
      errorCode: null;
      errorMessage: null;
      diagnosticCode: null;
      diagnosticMessage: null;
      diagnosticIsInference: false;
    }
  | {
      status: "skipped" | "failed";
      errorCode: string;
      errorMessage: string;
      diagnosticCode: ReminderDeliveryReadinessPayload["code"] | null;
      diagnosticMessage: string | null;
      diagnosticIsInference: boolean;
    };

const mapTelegramApiError = (
  status: number,
  description: string | undefined,
  recipientSource: TelegramRecipientSource,
  recipientType: TelegramRecipientType,
): { errorCode: string; errorMessage: string } => {
  const reason = description ?? "Telegram sendMessage failed.";
  const normalizedReason = reason.toLowerCase();

  if (status === 401) {
    return { errorCode: "TELEGRAM_BOT_TOKEN_INVALID", errorMessage: reason };
  }

  if (normalizedReason.includes("chat not found")) {
    if (recipientType === "username") {
      return {
        errorCode: "TELEGRAM_CHAT_NOT_FOUND_USERNAME_INFERENCE",
        errorMessage: `${reason} (likely username used instead of numeric chat id)`,
      };
    }

    if (recipientSource === "stored_chat_id") {
      return {
        errorCode: "TELEGRAM_CHAT_NOT_FOUND_STALE_BINDING_INFERENCE",
        errorMessage: `${reason} (likely stored chat id binding is invalid or stale)`,
      };
    }

    if (recipientType === "telegram_user_id_only") {
      return {
        errorCode: "TELEGRAM_CHAT_NOT_FOUND_BOT_NOT_STARTED_INFERENCE",
        errorMessage: `${reason} (likely user has not started bot chat yet)`,
      };
    }

    return {
      errorCode: "TELEGRAM_CHAT_NOT_FOUND_UNKNOWN_BINDING_INFERENCE",
      errorMessage: `${reason} (unknown chat binding failure)`,
    };
  }

  if (normalizedReason.includes("bot was blocked by the user")) {
    return { errorCode: "TELEGRAM_BOT_BLOCKED_BY_USER", errorMessage: reason };
  }

  if (normalizedReason.includes("can't initiate conversation")) {
    return { errorCode: "TELEGRAM_CHAT_NOT_STARTED", errorMessage: reason };
  }

  if (normalizedReason.includes("user is deactivated")) {
    return { errorCode: "TELEGRAM_USER_DEACTIVATED", errorMessage: reason };
  }

  return { errorCode: "TELEGRAM_API_ERROR", errorMessage: reason };
};

export const sendTelegramMessageWithPreflight = async ({
  recipientTelegramUserId,
  recipientSource,
  text,
}: SendTelegramMessageInput): Promise<SendTelegramMessageResult> => {
  const readiness = evaluateTelegramDeliveryReadiness(
    recipientTelegramUserId,
    recipientSource,
    "unverified",
    null,
    false,
    null,
  );
  if (!readiness.deliveryReady) {
    return {
      status: "skipped",
      errorCode: readiness.code,
      errorMessage: readiness.message,
      diagnosticCode: readiness.code,
      diagnosticMessage: readiness.message,
      diagnosticIsInference: false,
    };
  }

  try {
    const apiBase = trimTrailingSlash(readiness.botApiBaseUrl ?? "");
    const response = await fetch(`${apiBase}/bot${serverEnv.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: readiness.recipientTelegramUserId,
        text,
      }),
    });

    const payload = (await response.json()) as { ok?: boolean; description?: string };
    if (response.ok && payload.ok) {
      return {
        status: "sent",
        errorCode: null,
        errorMessage: null,
        diagnosticCode: null,
        diagnosticMessage: null,
        diagnosticIsInference: false,
      };
    }

    const mapped = mapTelegramApiError(
      response.status,
      payload.description,
      recipientSource,
      readiness.recipientType,
    );
    const diagnosticCode =
      mapped.errorCode === "TELEGRAM_CHAT_NOT_FOUND_USERNAME_INFERENCE"
        ? "RECIPIENT_USERNAME_INSTEAD_OF_CHAT_ID_INFERENCE"
        : mapped.errorCode === "TELEGRAM_CHAT_NOT_FOUND_BOT_NOT_STARTED_INFERENCE"
          ? "BOT_NOT_STARTED_INFERENCE"
          : mapped.errorCode === "TELEGRAM_CHAT_NOT_FOUND_STALE_BINDING_INFERENCE"
            ? "BINDING_MISMATCH_INFERENCE"
            : mapped.errorCode === "TELEGRAM_CHAT_NOT_FOUND_UNKNOWN_BINDING_INFERENCE"
              ? "CHAT_BINDING_FAILURE_INFERENCE"
              : null;

    return {
      status: "failed",
      errorCode: mapped.errorCode,
      errorMessage: mapped.errorMessage,
      diagnosticCode,
      diagnosticMessage: diagnosticCode
        ? buildReadinessMessage(diagnosticCode)
        : null,
      diagnosticIsInference: Boolean(diagnosticCode),
    };
  } catch (error) {
    return {
      status: "failed",
      errorCode: "TELEGRAM_NETWORK_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown network error.",
      diagnosticCode: "CHAT_BINDING_FAILURE_INFERENCE",
      diagnosticMessage: buildReadinessMessage("CHAT_BINDING_FAILURE_INFERENCE"),
      diagnosticIsInference: true,
    };
  }
};
