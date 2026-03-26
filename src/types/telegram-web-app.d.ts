declare global {
  interface TelegramThemeParams {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  }

  interface TelegramWebApp {
    initData: string;
    initDataUnsafe: Record<string, unknown>;
    version: string;
    platform: string;
    colorScheme: "light" | "dark";
    themeParams: TelegramThemeParams;
    ready: () => void;
    expand: () => void;
    close: () => void;
    sendData: (data: string) => void;
    setHeaderColor?: (color: string) => void;
    setBackgroundColor?: (color: string) => void;
  }

  interface TelegramWindow {
    WebApp: TelegramWebApp;
  }

  interface Window {
    Telegram?: TelegramWindow;
  }
}

export {};
