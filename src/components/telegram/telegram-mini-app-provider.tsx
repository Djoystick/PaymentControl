"use client";

import { useEffect } from "react";
import { bootstrapTelegramMiniApp } from "@/lib/telegram/web-app";
import { initializeTelegramAnalytics } from "@/lib/telegram/analytics";

type TelegramMiniAppProviderProps = {
  children: React.ReactNode;
};

export function TelegramMiniAppProvider({
  children,
}: TelegramMiniAppProviderProps) {
  useEffect(() => {
    initializeTelegramAnalytics();

    const runBootstrap = () => {
      const result = bootstrapTelegramMiniApp();
      initializeTelegramAnalytics();
      window.dispatchEvent(
        new CustomEvent("telegram-webapp-ready", { detail: result }),
      );
    };

    if (window.Telegram?.WebApp) {
      runBootstrap();
      return;
    }

    const scriptId = "telegram-web-app-script";
    const existingScript = document.getElementById(
      scriptId,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", runBootstrap, { once: true });

      return () => {
        existingScript.removeEventListener("load", runBootstrap);
      };
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.addEventListener("load", runBootstrap, { once: true });
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", runBootstrap);
    };
  }, []);

  return children;
}
