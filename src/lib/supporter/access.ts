import "server-only";
import { serverEnv } from "@/lib/config/server-env";

export const canManageSupporterBadges = (telegramUserId: string): boolean => {
  return serverEnv.supporterBadgeOwnerTelegramUserIds.includes(
    telegramUserId.trim(),
  );
};
