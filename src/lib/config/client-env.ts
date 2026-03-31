const readEnvValue = (value: string | undefined): string => {
  return value?.trim() ?? "";
};

export type SupportRailId = "boosty" | "cloudtips";
export type SupportRailPendingReason =
  | "missing_or_invalid_url"
  | "duplicates_primary";
export type SupportRailOperationalMode =
  | "continuity_claim_manual"
  | "automation_candidate";

export type SupportRailConfig = {
  id: SupportRailId;
  title: string;
  subtitle: string;
  guidanceLabel: string;
  nextStepHint: string;
  ctaLabel: string;
  url: string;
  isConfigured: boolean;
  isPrimary: boolean;
  operationalMode: SupportRailOperationalMode;
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

const isLegacySubscriptionPremiumBuyUrl = (url: string): boolean => {
  const normalized = url.toLowerCase();
  return (
    normalized.includes("share=subscription_link") ||
    normalized.includes("ssource=direct&share=subscription_link") ||
    normalized.includes("subscription_link")
  );
};

const resolvePremiumOneTimeBuyUrl = (): string => {
  const explicitOneTime = normalizeExternalUrl(
    readEnvValue(process.env.NEXT_PUBLIC_PREMIUM_ONE_TIME_BUY_URL),
  );
  if (explicitOneTime && !isLegacySubscriptionPremiumBuyUrl(explicitOneTime)) {
    return explicitOneTime;
  }

  // Backward-compatible key for old environments. Legacy subscription URLs are blocked.
  const legacyEnvKey = normalizeExternalUrl(
    readEnvValue(process.env.NEXT_PUBLIC_PREMIUM_BUY_URL),
  );
  if (legacyEnvKey && !isLegacySubscriptionPremiumBuyUrl(legacyEnvKey)) {
    return legacyEnvKey;
  }

  return "";
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
      subtitle: "Primary support rail",
      guidanceLabel: "Claim-first continuity rail",
      nextStepHint:
        "Use support reference code, return to app, then submit claim for owner review.",
      ctaLabel: "Open Boosty",
      url: boostyUrl,
      isConfigured: Boolean(boostyUrl),
      isPrimary: true,
      operationalMode: "continuity_claim_manual",
      pendingReason: null,
    },
    {
      id: "cloudtips",
      title: "CloudTips",
      subtitle: "Secondary support rail",
      guidanceLabel: "Automation-candidate rail",
      nextStepHint:
        "Closer candidate for future direct matching, but owner review is still the active path.",
      ctaLabel: "Open CloudTips",
      url: cloudTipsRail.url,
      isConfigured: Boolean(cloudTipsRail.url),
      isPrimary: false,
      operationalMode: "automation_candidate",
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

export const clientEnv = {
  appName: readEnvValue(process.env.NEXT_PUBLIC_APP_NAME) || "Payment Control",
  appStage: readEnvValue(process.env.NEXT_PUBLIC_APP_STAGE) || "local",
  apiBaseUrl: readEnvValue(process.env.NEXT_PUBLIC_API_BASE_URL) || "/api",
  telegramBotUsername: normalizeTelegramBotUsername(
    readEnvValue(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME),
  ),
  premiumBuyUrl: resolvePremiumOneTimeBuyUrl(),
  supportRails: resolveSupportRails(),
  supportProjectUrl: resolveSupportProjectUrl(),
  supabaseUrl: readEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: readEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
} as const;

export const isTelegramConfigPresent = Boolean(clientEnv.telegramBotUsername);

export const isSupabaseClientConfigured = Boolean(
  clientEnv.supabaseUrl && clientEnv.supabaseAnonKey,
);
