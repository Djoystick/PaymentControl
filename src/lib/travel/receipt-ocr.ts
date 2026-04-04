import "server-only";

import { serverEnv } from "@/lib/config/server-env";
import {
  normalizeTravelReceiptOcrSuggestion,
  type TravelReceiptOcrSuggestion,
} from "@/lib/travel/receipt-ocr-normalization";

type TravelReceiptOcrSuccess = {
  ok: true;
  data: TravelReceiptOcrSuggestion;
};

type TravelReceiptOcrFailure = {
  ok: false;
  message: string;
  unavailable: boolean;
};

export type TravelReceiptOcrResult =
  | TravelReceiptOcrSuccess
  | TravelReceiptOcrFailure;

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

const extractJsonObject = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }

  return jsonMatch[0];
};

const parseChatContent = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    return null;
  }

  const message = (firstChoice as { message?: unknown }).message;
  if (!message || typeof message !== "object") {
    return null;
  }

  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : null;
};

export const runTravelReceiptOcr = async (params: {
  imageDataUrl: string;
  tripCurrency: string;
}): Promise<TravelReceiptOcrResult> => {
  if (!serverEnv.travelReceiptOcrOpenAiApiKey) {
    return {
      ok: false,
      unavailable: true,
      message:
        "OCR assistant is not configured on server. Save receipt draft now and parse later after OCR env setup.",
    };
  }

  const model = serverEnv.travelReceiptOcrOpenAiModel || "gpt-4o-mini";

  const prompt = [
    "Extract travel expense hints from this receipt image.",
    "Return strict JSON only with fields:",
    "sourceAmount: number|null",
    "sourceCurrency: 3-letter code or null",
    "spentAt: ISO date/time string or null",
    "merchant: string|null",
    "description: short human-readable expense description or null",
    "category: one of General/Food/Transport/Stay/Activities/Other or null",
    "conversionRate: number|null (optional suggested rate to trip currency)",
    "rawText: short receipt text snippet or null",
    "fieldQuality: object with keys sourceAmount/sourceCurrency/spentAt/merchant/description/category/conversionRate and values high|medium|low|missing",
    `Trip base currency: ${params.tripCurrency}.`,
    "Never create data you are not confident in. Use null for unknown fields and quality=missing.",
    "Do not infer conversion rate unless receipt text clearly supports it.",
  ].join("\n");

  let response: Response;
  try {
    response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverEnv.travelReceiptOcrOpenAiApiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an OCR prefill assistant for travel receipts. Return JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: params.imageDataUrl,
                },
              },
            ],
          },
        ],
      }),
    });
  } catch {
    return {
      ok: false,
      unavailable: false,
      message: "OCR assistant request failed. Check network or provider configuration.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      unavailable: false,
      message: "OCR assistant returned provider error response.",
    };
  }

  let responsePayload: unknown;
  try {
    responsePayload = (await response.json()) as unknown;
  } catch {
    return {
      ok: false,
      unavailable: false,
      message: "OCR assistant response is not valid JSON.",
    };
  }

  const content = parseChatContent(responsePayload);
  if (!content) {
    return {
      ok: false,
      unavailable: false,
      message: "OCR assistant returned an empty response.",
    };
  }

  const json = extractJsonObject(content);
  if (!json) {
    return {
      ok: false,
      unavailable: false,
      message: "OCR assistant response does not contain JSON object.",
    };
  }

  let suggestionPayload: unknown;
  try {
    suggestionPayload = JSON.parse(json) as unknown;
  } catch {
    return {
      ok: false,
      unavailable: false,
      message: "OCR assistant JSON parsing failed.",
    };
  }

  if (!suggestionPayload || typeof suggestionPayload !== "object") {
    return {
      ok: false,
      unavailable: false,
      message: "OCR assistant returned invalid object payload.",
    };
  }

  return {
    ok: true,
    data: normalizeTravelReceiptOcrSuggestion(
      suggestionPayload as Record<string, unknown>,
    ),
  };
};
