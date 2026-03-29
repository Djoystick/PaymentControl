const readEnvValue = (value: string | undefined): string => {
  return value?.trim() ?? "";
};

const normalizeTelegramBotUsername = (value: string): string => {
  const raw = value.trim();
  if (!raw) {
    return "";
  }

  let candidate = raw;
  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    try {
      const parsed = new URL(candidate);
      candidate = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    } catch {
      candidate = raw;
    }
  } else if (candidate.includes("t.me/")) {
    candidate = candidate.split("t.me/").pop() ?? candidate;
  }

  candidate = candidate.split(/[/?#]/)[0] ?? candidate;
  candidate = candidate.replace(/^@+/, "").trim();
  return candidate;
};

export const clientEnv = {
  appName: readEnvValue(process.env.NEXT_PUBLIC_APP_NAME) || "Payment Control",
  appStage: readEnvValue(process.env.NEXT_PUBLIC_APP_STAGE) || "local",
  apiBaseUrl: readEnvValue(process.env.NEXT_PUBLIC_API_BASE_URL) || "/api",
  telegramBotUsername: normalizeTelegramBotUsername(
    readEnvValue(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME),
  ),
  premiumBuyUrl:
    readEnvValue(process.env.NEXT_PUBLIC_PREMIUM_BUY_URL) ||
    "https://boosty.to/tvoy_kosmonavt/purchase/3867384?ssource=DIRECT&share=subscription_link",
  supportProjectUrl:
    readEnvValue(process.env.NEXT_PUBLIC_SUPPORT_PROJECT_URL) ||
    "https://boosty.to/tvoy_kosmonavt/posts/cf4114af-41b0-4a6e-b944-be6ded323c21",
  supabaseUrl: readEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: readEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
} as const;

export const isTelegramConfigPresent = Boolean(clientEnv.telegramBotUsername);

export const isSupabaseClientConfigured = Boolean(
  clientEnv.supabaseUrl && clientEnv.supabaseAnonKey,
);
