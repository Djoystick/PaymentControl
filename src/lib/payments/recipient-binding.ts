import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  TelegramBindingStatus,
  TelegramRecipientSource,
} from "@/lib/payments/types";
import { normalizeTelegramIdCandidate } from "@/lib/payments/telegram-id-normalization";

type TelegramRecipientBindingRow = {
  id: string;
  workspace_id: string;
  profile_id: string;
  telegram_user_id: string | number | null;
  recipient_chat_id: string | number | null;
  binding_source: TelegramRecipientSource;
  binding_status: TelegramBindingStatus;
  verified_at: string | null;
  last_status_reason: string | null;
  last_status_reason_is_inference: boolean;
  last_error_code: string | null;
  last_error_message: string | null;
};

const selection =
  "id, workspace_id, profile_id, telegram_user_id, recipient_chat_id, binding_source, binding_status, verified_at, last_status_reason, last_status_reason_is_inference, last_error_code, last_error_message";

export type ResolvedTelegramRecipientBinding = {
  recipientTelegramUserId: string | null;
  recipientSource: TelegramRecipientSource;
  bindingStatus: TelegramBindingStatus;
  bindingReason: string | null;
  bindingReasonIsInference: boolean;
  bindingVerifiedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
};

type ResolveBindingInput = {
  workspaceId: string;
  profileId: string;
  profileTelegramUserId: string | number | null;
  mode?: "delivery" | "verification";
};

type UpsertBindingObservationInput = ResolveBindingInput & {
  recipientSource: TelegramRecipientSource;
  recipientTelegramUserId: string | number | null;
  bindingStatus: TelegramBindingStatus;
  bindingReason: string | null;
  bindingReasonIsInference: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

type SetManualRecipientBindingInput = ResolveBindingInput & {
  recipientChatId: string;
};

const mapRowToResolvedBinding = (
  row: TelegramRecipientBindingRow | null,
  fallbackProfileTelegramUserId: string | number | null,
  mode: "delivery" | "verification",
): ResolvedTelegramRecipientBinding => {
  const fallbackRecipient = normalizeTelegramIdCandidate(fallbackProfileTelegramUserId);

  if (!row) {
    return {
      recipientTelegramUserId: fallbackRecipient,
      recipientSource: "profile_telegram_user_id",
      bindingStatus: fallbackRecipient ? "unverified" : "missing",
      bindingReason: fallbackRecipient
        ? "Recipient comes from profile telegram user id and is not verified yet."
        : "No telegram user id found in current profile context.",
      bindingReasonIsInference: false,
      bindingVerifiedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
    };
  }

  const normalizedStoredRecipient = normalizeTelegramIdCandidate(row.recipient_chat_id);
  const isStoredChatIdNumeric = Boolean(
    normalizedStoredRecipient && /^-?\d+$/.test(normalizedStoredRecipient),
  );
  const hasVerifiedStoredBinding =
    row.binding_status === "verified" && isStoredChatIdNumeric;

  if (hasVerifiedStoredBinding) {
    return {
      recipientTelegramUserId: normalizedStoredRecipient,
      recipientSource: "stored_chat_id",
      bindingStatus: row.binding_status,
      bindingReason:
        row.last_status_reason ??
        "Verified stored private chat id is used as authoritative recipient.",
      bindingReasonIsInference: row.last_status_reason_is_inference,
      bindingVerifiedAt: row.verified_at,
      lastErrorCode: row.last_error_code,
      lastErrorMessage: row.last_error_message,
    };
  }

  if (mode === "verification" && normalizedStoredRecipient) {
    return {
      recipientTelegramUserId: normalizedStoredRecipient,
      recipientSource: "stored_chat_id",
      bindingStatus: row.binding_status,
      bindingReason:
        row.last_status_reason ??
        "Stored chat id candidate is used for manual verification.",
      bindingReasonIsInference: row.last_status_reason_is_inference,
      bindingVerifiedAt: row.verified_at,
      lastErrorCode: row.last_error_code,
      lastErrorMessage: row.last_error_message,
    };
  }

  if (fallbackRecipient) {
    return {
      recipientTelegramUserId: fallbackRecipient,
      recipientSource: "profile_telegram_user_id",
      bindingStatus: row.binding_status,
      bindingReason:
        row.last_status_reason ??
        "Verified stored chat binding is not available, fallback to profile telegram user id.",
      bindingReasonIsInference: row.last_status_reason_is_inference,
      bindingVerifiedAt: row.verified_at,
      lastErrorCode: row.last_error_code,
      lastErrorMessage: row.last_error_message,
    };
  }

  if (normalizedStoredRecipient) {
    return {
      recipientTelegramUserId: normalizedStoredRecipient,
      recipientSource: "stored_chat_id",
      bindingStatus: row.binding_status,
      bindingReason:
        row.last_status_reason ??
        "Stored recipient exists but verified fallback profile id is unavailable.",
      bindingReasonIsInference: row.last_status_reason_is_inference,
      bindingVerifiedAt: row.verified_at,
      lastErrorCode: row.last_error_code,
      lastErrorMessage: row.last_error_message,
    };
  }

  return {
    recipientTelegramUserId: null,
    recipientSource: row.binding_source,
    bindingStatus: row.binding_status,
    bindingReason: row.last_status_reason,
    bindingReasonIsInference: row.last_status_reason_is_inference,
    bindingVerifiedAt: row.verified_at,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
  };
};

const readBindingRow = async (
  workspaceId: string,
  profileId: string,
): Promise<TelegramRecipientBindingRow | null> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("telegram_recipient_bindings")
    .select(selection)
    .eq("workspace_id", workspaceId)
    .eq("profile_id", profileId)
    .maybeSingle<TelegramRecipientBindingRow>();

  if (error || !data) {
    return null;
  }

  return data;
};

export const resolveTelegramRecipientBinding = async ({
  workspaceId,
  profileId,
  profileTelegramUserId,
  mode = "delivery",
}: ResolveBindingInput): Promise<ResolvedTelegramRecipientBinding> => {
  const row = await readBindingRow(workspaceId, profileId);
  return mapRowToResolvedBinding(row, profileTelegramUserId, mode);
};

export const upsertTelegramRecipientBindingObservation = async ({
  workspaceId,
  profileId,
  profileTelegramUserId,
  recipientSource,
  recipientTelegramUserId,
  bindingStatus,
  bindingReason,
  bindingReasonIsInference,
  errorCode,
  errorMessage,
}: UpsertBindingObservationInput): Promise<boolean> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return false;
  }

  const now = new Date().toISOString();
  const shouldSetVerified = bindingStatus === "verified";
  const normalizedProfileTelegramUserId =
    normalizeTelegramIdCandidate(profileTelegramUserId);
  const normalizedRecipientTelegramUserId =
    normalizeTelegramIdCandidate(recipientTelegramUserId);
  const { error } = await supabase.from("telegram_recipient_bindings").upsert(
    {
      workspace_id: workspaceId,
      profile_id: profileId,
      telegram_user_id: normalizedProfileTelegramUserId,
      recipient_chat_id:
        recipientSource === "stored_chat_id" ? normalizedRecipientTelegramUserId : null,
      binding_source: recipientSource,
      binding_status: bindingStatus,
      verified_at: shouldSetVerified ? now : null,
      last_status_reason: bindingReason,
      last_status_reason_is_inference: bindingReasonIsInference,
      last_error_code: errorCode,
      last_error_message: errorMessage,
      updated_at: now,
    },
    { onConflict: "workspace_id,profile_id" },
  );

  return !error;
};

export const setManualTelegramRecipientBinding = async ({
  workspaceId,
  profileId,
  profileTelegramUserId,
  recipientChatId,
}: SetManualRecipientBindingInput): Promise<boolean> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return false;
  }

  const now = new Date().toISOString();
  const normalizedProfileTelegramUserId =
    normalizeTelegramIdCandidate(profileTelegramUserId);
  const { error } = await supabase.from("telegram_recipient_bindings").upsert(
    {
      workspace_id: workspaceId,
      profile_id: profileId,
      telegram_user_id: normalizedProfileTelegramUserId,
      recipient_chat_id: recipientChatId,
      binding_source: "stored_chat_id",
      binding_status: "unverified",
      verified_at: null,
      last_status_reason: "Manual chat id provided. Verification pending.",
      last_status_reason_is_inference: false,
      last_error_code: null,
      last_error_message: null,
      updated_at: now,
    },
    { onConflict: "workspace_id,profile_id" },
  );

  return !error;
};
