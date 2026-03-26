export type TelegramBootstrapResult = {
  isTelegramWebApp: boolean;
  platform?: string;
  version?: string;
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

export const getTelegramInitData = (): string => {
  return getTelegramWebApp()?.initData?.trim() ?? "";
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
