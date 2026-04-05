export type TelegramBootstrapResult = {
  isTelegramWebApp: boolean;
  platform?: string;
  version?: string;
};

type TelegramLaunchParams = {
  tgWebAppData?: string;
};

type TelegramInitDataUser = {
  language_code?: unknown;
};

const isTelegramVersionAtLeast = (
  currentVersion: string,
  minimumVersion: string,
): boolean => {
  const current = currentVersion.split(".").map((part) => Number(part) || 0);
  const minimum = minimumVersion.split(".").map((part) => Number(part) || 0);
  const maxParts = Math.max(current.length, minimum.length);

  for (let index = 0; index < maxParts; index += 1) {
    const currentPart = current[index] ?? 0;
    const minimumPart = minimum[index] ?? 0;

    if (currentPart > minimumPart) {
      return true;
    }

    if (currentPart < minimumPart) {
      return false;
    }
  }

  return true;
};

export const getTelegramWebApp = (): TelegramWebApp | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.Telegram?.WebApp ?? null;
};

const normalizeRawValue = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const parseLaunchParams = (raw: string): TelegramLaunchParams => {
  const sanitized = raw.startsWith("#") ? raw.slice(1) : raw;
  const params = new URLSearchParams(sanitized);

  return {
    tgWebAppData: params.get("tgWebAppData") ?? undefined,
  };
};

const readTelegramInitDataFromLaunchParams = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  const fromHash = normalizeRawValue(parseLaunchParams(window.location.hash).tgWebAppData);
  if (fromHash) {
    return fromHash;
  }

  const fromSearch = normalizeRawValue(
    parseLaunchParams(window.location.search).tgWebAppData,
  );
  if (fromSearch) {
    return fromSearch;
  }

  return "";
};

export const getTelegramInitData = (): string => {
  const fromWebApp = normalizeRawValue(getTelegramWebApp()?.initData);
  if (fromWebApp) {
    return fromWebApp;
  }

  return readTelegramInitDataFromLaunchParams();
};

const readLanguageCodeFromInitDataUnsafe = (): string => {
  const webApp = getTelegramWebApp();
  if (!webApp || !webApp.initDataUnsafe) {
    return "";
  }

  const unsafeData = webApp.initDataUnsafe as Record<string, unknown>;
  const user = unsafeData.user;
  if (!user || typeof user !== "object") {
    return "";
  }

  return normalizeRawValue((user as TelegramInitDataUser).language_code);
};

const readLanguageCodeFromInitData = (initData: string): string => {
  if (!initData) {
    return "";
  }

  const params = new URLSearchParams(initData);
  const userRaw = params.get("user");
  if (!userRaw) {
    return "";
  }

  try {
    const parsed = JSON.parse(userRaw) as TelegramInitDataUser;
    return normalizeRawValue(parsed.language_code);
  } catch {
    return "";
  }
};

export const getTelegramLanguageCode = (): string => {
  const fromUnsafe = readLanguageCodeFromInitDataUnsafe();
  if (fromUnsafe) {
    return fromUnsafe;
  }

  return readLanguageCodeFromInitData(getTelegramInitData());
};

export const bootstrapTelegramMiniApp = (): TelegramBootstrapResult => {
  const webApp = getTelegramWebApp();

  if (!webApp) {
    return { isTelegramWebApp: false };
  }

  try {
    webApp.ready();
    webApp.expand();

    const headerColor = webApp.themeParams?.secondary_bg_color;
    const setHeaderColor = webApp.setHeaderColor;
    const canSetHeaderColor =
      typeof setHeaderColor === "function" &&
      isTelegramVersionAtLeast(webApp.version, "6.1");

    if (headerColor && canSetHeaderColor) {
      setHeaderColor(headerColor);
    }
  } catch {
    return {
      isTelegramWebApp: true,
      platform: webApp.platform,
      version: webApp.version,
    };
  }

  return {
    isTelegramWebApp: true,
    platform: webApp.platform,
    version: webApp.version,
  };
};
