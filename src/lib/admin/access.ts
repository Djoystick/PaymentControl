import "server-only";
import { serverEnv } from "@/lib/config/server-env";

const telegramNumericIdPattern = /^[0-9]+$/;

const normalizeTelegramNumericId = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized || !telegramNumericIdPattern.test(normalized)) {
    return null;
  }

  return normalized;
};

const parseAdminIdSet = (raw: string): Set<string> => {
  const ids = raw
    .split(/[,\n;\s]+/)
    .map((item) => normalizeTelegramNumericId(item))
    .filter((item): item is string => Boolean(item));

  return new Set(ids);
};

const premiumAdminTelegramIdSet = parseAdminIdSet(
  serverEnv.premiumAdminTelegramUserIds,
);

export const isPremiumAdminTelegramUserId = (telegramUserId: string): boolean => {
  const normalized = normalizeTelegramNumericId(telegramUserId);
  if (!normalized) {
    return false;
  }

  return premiumAdminTelegramIdSet.has(normalized);
};

export const normalizeAdminTargetTelegramUserId = (
  telegramUserId: string,
): string | null => {
  return normalizeTelegramNumericId(telegramUserId);
};
