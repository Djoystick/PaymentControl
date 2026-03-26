import "server-only";

const readServerEnv = (name: string): string => {
  return process.env[name]?.trim() ?? "";
};

const readServerBool = (name: string): boolean => {
  return readServerEnv(name).toLowerCase() === "true";
};

export const serverEnv = {
  supabaseUrl: readServerEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: readServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseJwtSecret: readServerEnv("SUPABASE_JWT_SECRET"),
  telegramBotToken: readServerEnv("TELEGRAM_BOT_TOKEN"),
  telegramBotApiBaseUrl:
    readServerEnv("TELEGRAM_BOT_API_BASE_URL") || "https://api.telegram.org",
  reminderScheduledDispatchSecret: readServerEnv(
    "REMINDER_SCHEDULED_DISPATCH_SECRET",
  ),
  cronSecret: readServerEnv("CRON_SECRET"),
  telegramInitDataMaxAgeSec: readServerEnv("TELEGRAM_INIT_DATA_MAX_AGE_SEC"),
  allowDevTelegramAuthFallback: readServerBool(
    "ALLOW_DEV_TELEGRAM_AUTH_FALLBACK",
  ),
  devTelegramUserId: readServerEnv("DEV_TELEGRAM_USER_ID"),
  devTelegramUsername: readServerEnv("DEV_TELEGRAM_USERNAME"),
  devTelegramFirstName: readServerEnv("DEV_TELEGRAM_FIRST_NAME"),
  devTelegramLastName: readServerEnv("DEV_TELEGRAM_LAST_NAME"),
  devTelegramPhotoUrl: readServerEnv("DEV_TELEGRAM_PHOTO_URL"),
} as const;

export const isSupabaseServerConfigured = Boolean(
  serverEnv.supabaseUrl && serverEnv.supabaseServiceRoleKey,
);
