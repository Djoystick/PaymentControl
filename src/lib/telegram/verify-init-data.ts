import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/config/server-env";
import type { TelegramIdentity } from "@/lib/auth/types";

type VerifySuccess = {
  ok: true;
  identity: TelegramIdentity;
};

type VerifyErrorCode =
  | "TELEGRAM_BOT_TOKEN_MISSING"
  | "TELEGRAM_INIT_DATA_INVALID"
  | "TELEGRAM_INIT_DATA_EXPIRED"
  | "TELEGRAM_USER_INVALID";

type VerifyError = {
  ok: false;
  error: {
    code: VerifyErrorCode;
    message: string;
  };
};

export type VerifyTelegramInitDataResult = VerifySuccess | VerifyError;

type TelegramUserPayload = {
  id: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

const getMaxAgeSeconds = (): number => {
  const value = Number(serverEnv.telegramInitDataMaxAgeSec);
  return Number.isFinite(value) && value > 0 ? value : 86400;
};

const buildDataCheckString = (searchParams: URLSearchParams): string => {
  const pairs: string[] = [];

  searchParams.forEach((value, key) => {
    if (key !== "hash") {
      pairs.push(`${key}=${value}`);
    }
  });

  return pairs.sort((a, b) => a.localeCompare(b)).join("\n");
};

const parseTelegramUser = (
  userRaw: string | null,
): { ok: true; user: TelegramUserPayload } | { ok: false } => {
  if (!userRaw) {
    return { ok: false };
  }

  try {
    const parsed = JSON.parse(userRaw) as TelegramUserPayload;

    if (
      parsed &&
      (typeof parsed.id === "number" || typeof parsed.id === "string")
    ) {
      return { ok: true, user: parsed };
    }

    return { ok: false };
  } catch {
    return { ok: false };
  }
};

export const verifyTelegramInitData = (
  initData: string,
): VerifyTelegramInitDataResult => {
  const botToken = serverEnv.telegramBotToken;
  if (!botToken) {
    return {
      ok: false,
      error: {
        code: "TELEGRAM_BOT_TOKEN_MISSING",
        message: "Telegram bot token is not configured on the server.",
      },
    };
  }

  const searchParams = new URLSearchParams(initData);
  const hash = searchParams.get("hash");
  if (!hash) {
    return {
      ok: false,
      error: {
        code: "TELEGRAM_INIT_DATA_INVALID",
        message: "Missing hash in Telegram init data.",
      },
    };
  }

  const dataCheckString = buildDataCheckString(searchParams);
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = Buffer.from(hash, "hex");
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return {
      ok: false,
      error: {
        code: "TELEGRAM_INIT_DATA_INVALID",
        message: "Telegram init data signature validation failed.",
      },
    };
  }

  const authDateRaw = searchParams.get("auth_date");
  const authDate = authDateRaw ? Number(authDateRaw) : Number.NaN;
  if (!Number.isFinite(authDate)) {
    return {
      ok: false,
      error: {
        code: "TELEGRAM_INIT_DATA_INVALID",
        message: "Invalid auth_date in Telegram init data.",
      },
    };
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  if (nowUnix - authDate > getMaxAgeSeconds()) {
    return {
      ok: false,
      error: {
        code: "TELEGRAM_INIT_DATA_EXPIRED",
        message: "Telegram init data is expired.",
      },
    };
  }

  const parsedUser = parseTelegramUser(searchParams.get("user"));
  if (!parsedUser.ok) {
    return {
      ok: false,
      error: {
        code: "TELEGRAM_USER_INVALID",
        message: "Telegram user payload is missing or invalid.",
      },
    };
  }

  return {
    ok: true,
    identity: {
      telegramUserId: String(parsedUser.user.id),
      username: parsedUser.user.username ?? null,
      firstName: parsedUser.user.first_name ?? "",
      lastName: parsedUser.user.last_name ?? null,
      photoUrl: parsedUser.user.photo_url ?? null,
      authDate,
      source: "telegram",
    },
  };
};
