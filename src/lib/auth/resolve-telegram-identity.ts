import "server-only";
import { serverEnv } from "@/lib/config/server-env";
import type { TelegramIdentity } from "@/lib/auth/types";
import { verifyTelegramInitData } from "@/lib/telegram/verify-init-data";

type ResolveErrorCode =
  | "TELEGRAM_INIT_DATA_MISSING"
  | "TELEGRAM_INIT_DATA_INVALID"
  | "TELEGRAM_INIT_DATA_EXPIRED"
  | "TELEGRAM_USER_INVALID"
  | "TELEGRAM_BOT_TOKEN_MISSING";

type ResolveSuccess = {
  ok: true;
  identity: TelegramIdentity;
};

type ResolveError = {
  ok: false;
  error: {
    code: ResolveErrorCode;
    message: string;
  };
};

export type ResolveTelegramIdentityResult = ResolveSuccess | ResolveError;

const getDevFallbackIdentity = (): TelegramIdentity | null => {
  const isDevMode = process.env.NODE_ENV !== "production";
  if (!isDevMode || !serverEnv.allowDevTelegramAuthFallback) {
    return null;
  }

  if (!serverEnv.devTelegramUserId) {
    return null;
  }

  return {
    telegramUserId: serverEnv.devTelegramUserId,
    username: serverEnv.devTelegramUsername || null,
    firstName: serverEnv.devTelegramFirstName || "Dev",
    lastName: serverEnv.devTelegramLastName || "User",
    photoUrl: serverEnv.devTelegramPhotoUrl || null,
    authDate: null,
    source: "dev_fallback",
  };
};

export const resolveTelegramIdentity = (
  initData: string | undefined,
): ResolveTelegramIdentityResult => {
  const trimmedInitData = initData?.trim() ?? "";
  if (trimmedInitData) {
    const verifyResult = verifyTelegramInitData(trimmedInitData);
    if (verifyResult.ok) {
      return verifyResult;
    }

    return {
      ok: false,
      error: verifyResult.error,
    };
  }

  const fallbackIdentity = getDevFallbackIdentity();
  if (fallbackIdentity) {
    return { ok: true, identity: fallbackIdentity };
  }

  return {
    ok: false,
    error: {
      code: "TELEGRAM_INIT_DATA_MISSING",
      message:
        "Telegram init data is missing. Open inside Telegram Mini App or enable local dev fallback.",
    },
  };
};
