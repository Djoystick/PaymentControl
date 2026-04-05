import telegramAnalytics from "@telegram-apps/analytics";
import { clientEnv } from "@/lib/config/client-env";

type InitState = "idle" | "pending" | "done";

let initState: InitState = "idle";

const isBrowser = (): boolean => {
  return typeof window !== "undefined";
};

const isConfigured = (): boolean => {
  return clientEnv.telegramAnalytics.isConfigured;
};

export const initializeTelegramAnalytics = (): void => {
  if (!isBrowser() || !isConfigured()) {
    return;
  }

  if (initState === "pending" || initState === "done") {
    return;
  }

  initState = "pending";

  const { token, appName, env } = clientEnv.telegramAnalytics;
  const initPayload = env ? { token, appName, env } : { token, appName };

  void telegramAnalytics
    .init(initPayload)
    .then(() => {
      initState = "done";
    })
    .catch(() => {
      initState = "idle";
    });
};

