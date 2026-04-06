const readEnvValue = (value: string | undefined): string => {
  return value?.trim() ?? "";
};

const readClientBool = (value: string | undefined, fallback: boolean): boolean => {
  const normalized = readEnvValue(value).toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  return fallback;
};

const readClientPositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  const raw = readEnvValue(value);
  if (!raw) {
    return fallback;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.floor(numeric);
};

type TelegramAnalyticsEnv = "STG" | "PROD";

export type SupportRailId = "boosty" | "cloudtips";
export type SupportRailPendingReason =
  | "missing_or_invalid_url"
  | "duplicates_primary";

export type SupportRailConfig = {
  id: SupportRailId;
  title: string;
  ctaLabel: string;
  url: string;
  isConfigured: boolean;
  isPrimary: boolean;
  pendingReason: SupportRailPendingReason | null;
};

const DEFAULT_BOOSTY_SUPPORT_URL =
  "https://boosty.to/tvoy_kosmonavt/posts/cf4114af-41b0-4a6e-b944-be6ded323c21";

const normalizeExternalUrl = (value: string): string => {
  const raw = value.trim();
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
};

const isBoostySupportUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "boosty.to" || host.endsWith(".boosty.to");
  } catch {
    return false;
  }
};

const resolveSupportProjectUrl = (): string => {
  const configuredUrl = normalizeExternalUrl(
    readEnvValue(process.env.NEXT_PUBLIC_SUPPORT_PROJECT_URL),
  );
  if (configuredUrl) {
    return configuredUrl;
  }

  return DEFAULT_BOOSTY_SUPPORT_URL;
};

const resolveBoostySupportRailUrl = (): string => {
  const configuredBoostyUrl = normalizeExternalUrl(
    readEnvValue(process.env.NEXT_PUBLIC_SUPPORT_BOOSTY_URL),
  );
  if (configuredBoostyUrl) {
    return configuredBoostyUrl;
  }

  const legacySupportProjectUrl = resolveSupportProjectUrl();
  if (legacySupportProjectUrl && isBoostySupportUrl(legacySupportProjectUrl)) {
    return legacySupportProjectUrl;
  }

  return DEFAULT_BOOSTY_SUPPORT_URL;
};

const resolveCloudTipsSupportRail = (
  primaryRailUrl: string,
): { url: string; pendingReason: SupportRailPendingReason | null } => {
  const cloudTipsUrl = normalizeExternalUrl(
    readEnvValue(process.env.NEXT_PUBLIC_SUPPORT_CLOUDTIPS_URL),
  );
  if (!cloudTipsUrl) {
    return {
      url: "",
      pendingReason: "missing_or_invalid_url",
    };
  }

  if (cloudTipsUrl === primaryRailUrl) {
    return {
      url: "",
      pendingReason: "duplicates_primary",
    };
  }

  return {
    url: cloudTipsUrl,
    pendingReason: null,
  };
};

const resolveSupportRails = (): SupportRailConfig[] => {
  const boostyUrl = resolveBoostySupportRailUrl();
  const cloudTipsRail = resolveCloudTipsSupportRail(boostyUrl);

  return [
    {
      id: "boosty",
      title: "Boosty",
      ctaLabel: "Open Boosty",
      url: boostyUrl,
      isConfigured: Boolean(boostyUrl),
      isPrimary: true,
      pendingReason: null,
    },
    {
      id: "cloudtips",
      title: "CloudTips",
      ctaLabel: "Open CloudTips",
      url: cloudTipsRail.url,
      isConfigured: Boolean(cloudTipsRail.url),
      isPrimary: false,
      pendingReason: cloudTipsRail.pendingReason,
    },
  ];
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

const normalizeTelegramAnalyticsEnv = (
  value: string,
): TelegramAnalyticsEnv | null => {
  const normalized = value.trim().toUpperCase();
  if (normalized === "STG" || normalized === "PROD") {
    return normalized;
  }

  return null;
};

const resolveTelegramAnalyticsConfig = (): {
  token: string;
  appName: string;
  env: TelegramAnalyticsEnv | null;
  isConfigured: boolean;
} => {
  const token = readEnvValue(process.env.NEXT_PUBLIC_TELEGRAM_ANALYTICS_TOKEN);
  const appName = readEnvValue(
    process.env.NEXT_PUBLIC_TELEGRAM_ANALYTICS_APP_NAME,
  );
  const env = normalizeTelegramAnalyticsEnv(
    readEnvValue(process.env.NEXT_PUBLIC_TELEGRAM_ANALYTICS_ENV),
  );

  return {
    token,
    appName,
    env,
    isConfigured: Boolean(token && appName),
  };
};

export const clientEnv = {
  appName: readEnvValue(process.env.NEXT_PUBLIC_APP_NAME) || "Payment Control",
  appStage: readEnvValue(process.env.NEXT_PUBLIC_APP_STAGE) || "local",
  apiBaseUrl: readEnvValue(process.env.NEXT_PUBLIC_API_BASE_URL) || "/api",
  telegramBotUsername: normalizeTelegramBotUsername(
    readEnvValue(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME),
  ),
  telegramAnalytics: resolveTelegramAnalyticsConfig(),
  travelReceiptClientOcr: {
    enabled: readClientBool(
      process.env.NEXT_PUBLIC_TRAVEL_RECEIPT_CLIENT_OCR_ENABLED,
      true,
    ),
    timeoutMs: readClientPositiveInt(
      process.env.NEXT_PUBLIC_TRAVEL_RECEIPT_CLIENT_OCR_TIMEOUT_MS,
      30000,
    ),
    allowServerFallback: readClientBool(
      process.env.NEXT_PUBLIC_TRAVEL_RECEIPT_CLIENT_OCR_ALLOW_SERVER_FALLBACK,
      false,
    ),
  },
  supportRails: resolveSupportRails(),
  supabaseUrl: readEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: readEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
} as const;

export const isTelegramConfigPresent = Boolean(clientEnv.telegramBotUsername);

export const isSupabaseClientConfigured = Boolean(
  clientEnv.supabaseUrl && clientEnv.supabaseAnonKey,
);
