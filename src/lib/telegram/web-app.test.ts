import assert from "node:assert/strict";
import test from "node:test";
import { getTelegramLanguageCode } from "./web-app.ts";

type WindowLike = {
  Telegram?: {
    WebApp?: {
      initData?: string;
      initDataUnsafe?: Record<string, unknown>;
    };
  };
  location?: {
    hash?: string;
    search?: string;
  };
};

const originalWindow = (globalThis as { window?: WindowLike }).window;

const setWindow = (value: WindowLike | undefined) => {
  (globalThis as { window?: WindowLike }).window = value;
};

const buildInitData = (languageCode: string): string => {
  const payload = JSON.stringify({ id: 1, language_code: languageCode });
  return `user=${encodeURIComponent(payload)}&auth_date=1&hash=dummy`;
};

test("getTelegramLanguageCode: reads language_code from initDataUnsafe", () => {
  setWindow({
    Telegram: {
      WebApp: {
        initData: "",
        initDataUnsafe: {
          user: {
            language_code: "ru",
          },
        },
      },
    },
    location: {
      hash: "",
      search: "",
    },
  });

  assert.equal(getTelegramLanguageCode(), "ru");
});

test("getTelegramLanguageCode: reads language_code from tgWebAppData launch params", () => {
  const initData = buildInitData("ru");
  setWindow({
    location: {
      hash: `#tgWebAppData=${encodeURIComponent(initData)}`,
      search: "",
    },
  });

  assert.equal(getTelegramLanguageCode(), "ru");
});

test("getTelegramLanguageCode: returns empty string when language is unavailable", () => {
  setWindow({
    location: {
      hash: "",
      search: "",
    },
  });

  assert.equal(getTelegramLanguageCode(), "");
});

test.after(() => {
  setWindow(originalWindow);
});

