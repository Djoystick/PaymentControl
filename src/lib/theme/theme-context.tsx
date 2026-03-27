"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getTelegramWebApp } from "@/lib/telegram/web-app";

export type UiTheme = "light" | "dark";

const THEME_STORAGE_KEY = "payment_control_ui_theme_v16a";

type ThemeContextValue = {
  theme: UiTheme;
  setTheme: (next: UiTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isUiTheme = (value: string | null): value is UiTheme => {
  return value === "light" || value === "dark";
};

const resolveInitialTheme = (): UiTheme => {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isUiTheme(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage read issues.
  }

  const telegramColorScheme = getTelegramWebApp()?.colorScheme;
  if (telegramColorScheme === "dark" || telegramColorScheme === "light") {
    return telegramColorScheme;
  }

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
};

const applyThemeToDocument = (theme: UiTheme) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<UiTheme>(resolveInitialTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage write issues.
    }
  }, [theme]);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = useCallback((next: UiTheme) => {
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
};
