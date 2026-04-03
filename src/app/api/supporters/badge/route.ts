import { NextResponse } from "next/server";
import type {
  SupporterBadgeManageAction,
  SupporterBadgeManageError,
  SupporterBadgeManageResponse,
} from "@/lib/auth/types";
import { resolveTelegramIdentity } from "@/lib/auth/resolve-telegram-identity";
import { isSupabaseServerConfigured } from "@/lib/config/server-env";
import { updateSupporterBadgeForTelegramUser } from "@/lib/profile/repository";
import { canManageSupporterBadges } from "@/lib/supporter/access";

type ManageSupporterBadgeBody = {
  initData?: string;
  action?: string;
  targetTelegramUserId?: string;
  note?: string;
};

const codeToStatus: Record<SupporterBadgeManageError["error"]["code"], number> = {
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
  SUPPORTER_BADGE_FORBIDDEN: 403,
  SUPPORTER_BADGE_ACTION_INVALID: 400,
  SUPPORTER_BADGE_TARGET_INVALID: 400,
  SUPPORTER_BADGE_NOTE_INVALID: 400,
  SUPPORTER_BADGE_FOUNDATION_NOT_READY: 503,
  SUPPORTER_BADGE_TARGET_NOT_FOUND: 404,
  SUPPORTER_BADGE_UPDATE_FAILED: 500,
};

const isManageAction = (value: string | undefined): value is SupporterBadgeManageAction => {
  return value === "grant" || value === "revoke";
};

const normalizeTelegramUserId = (value: string | undefined): string => {
  return (value ?? "").trim();
};

const normalizeNote = (value: string | undefined): string | null => {
  const normalized = (value ?? "").trim().slice(0, 280);
  if (!normalized) {
    return null;
  }

  return normalized;
};

const jsonError = (
  code: SupporterBadgeManageError["error"]["code"],
  message: string,
) => {
  const payload: SupporterBadgeManageError = {
    ok: false,
    error: {
      code,
      message,
    },
  };

  return NextResponse.json<SupporterBadgeManageResponse>(payload, {
    status: codeToStatus[code] ?? 400,
  });
};

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured) {
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase server configuration is missing.",
    );
  }

  let body: ManageSupporterBadgeBody = {};
  try {
    body = (await request.json()) as ManageSupporterBadgeBody;
  } catch {
    body = {};
  }

  if (!isManageAction(body.action)) {
    return jsonError(
      "SUPPORTER_BADGE_ACTION_INVALID",
      "Supporter badge action is invalid.",
    );
  }

  const targetTelegramUserId = normalizeTelegramUserId(body.targetTelegramUserId);
  if (!/^[0-9]{5,20}$/.test(targetTelegramUserId)) {
    return jsonError(
      "SUPPORTER_BADGE_TARGET_INVALID",
      "Target Telegram user id is invalid.",
    );
  }

  if ((body.note ?? "").trim().length > 280) {
    return jsonError(
      "SUPPORTER_BADGE_NOTE_INVALID",
      "Supporter badge note is too long.",
    );
  }

  const identityResult = resolveTelegramIdentity(body.initData);
  if (!identityResult.ok) {
    return jsonError(identityResult.error.code, identityResult.error.message);
  }

  if (!canManageSupporterBadges(identityResult.identity.telegramUserId)) {
    return jsonError(
      "SUPPORTER_BADGE_FORBIDDEN",
      "Current account is not allowed to manage supporter badges.",
    );
  }

  const result = await updateSupporterBadgeForTelegramUser({
    targetTelegramUserId,
    actorTelegramUserId: identityResult.identity.telegramUserId,
    action: body.action,
    note: normalizeNote(body.note),
    source: "manual_owner_assignment",
  });

  if (!result.ok) {
    if (result.reason === "TARGET_NOT_FOUND") {
      return jsonError(
        "SUPPORTER_BADGE_TARGET_NOT_FOUND",
        "Target profile was not found.",
      );
    }

    if (result.reason === "FOUNDATION_NOT_READY") {
      return jsonError(
        "SUPPORTER_BADGE_FOUNDATION_NOT_READY",
        "Supporter badge foundation is not ready. Apply Phase 26C migration.",
      );
    }

    return jsonError(
      "SUPPORTER_BADGE_UPDATE_FAILED",
      "Failed to update supporter badge.",
    );
  }

  return NextResponse.json<SupporterBadgeManageResponse>({
    ok: true,
    action: body.action,
    target: result.target,
  });
}
