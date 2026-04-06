import {
  normalizeTravelReceiptOcrSuggestion,
  type TravelReceiptOcrSuggestion,
} from "@/lib/travel/receipt-ocr-normalization";
import type {
  TravelReceiptOcrExecutionParams,
  TravelReceiptOcrResult,
} from "@/lib/travel/ocr/types";
import {
  MALFORMED_PROVIDER_RESPONSE_MESSAGE,
  buildProviderFailure,
  classifyProviderFailure,
  logTravelOcrDiagnostics,
  parseProviderErrorPayload,
  toCompactSnippet,
} from "@/lib/travel/ocr/provider-utils";

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

const parseSuggestionPayload = (payload: unknown): TravelReceiptOcrSuggestion | null => {
  const content = parseChatContent(payload);
  if (!content) {
    return null;
  }

  const json = extractJsonObject(content);
  if (!json) {
    return null;
  }

  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return normalizeTravelReceiptOcrSuggestion(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
};

export const runTravelReceiptOcrWithOpenAi = async (params: {
  input: TravelReceiptOcrExecutionParams;
  imageDataUrl: string;
  apiKey: string;
  model: string;
}): Promise<TravelReceiptOcrResult> => {
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
    `Trip base currency: ${params.input.tripCurrency}.`,
    "Never create data you are not confident in. Use null for unknown fields and quality=missing.",
    "Do not infer conversion rate unless receipt text clearly supports it.",
  ].join("\n");

  try {
    let response: Response;
    try {
      response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify({
          model: params.model,
          temperature: 0,
          max_tokens: 700,
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
    } catch (error) {
      const transportMessage =
        error instanceof Error ? toCompactSnippet(error.message) : "Unknown transport failure";
      logTravelOcrDiagnostics({
        provider: "openai",
        stage: "provider_transport_error",
        kind: "PROVIDER_REQUEST_FAILED",
        model: params.model,
        endpoint: OPENAI_CHAT_COMPLETIONS_URL,
        transportMessage,
      });

      return buildProviderFailure({
        provider: "openai",
        kind: "PROVIDER_REQUEST_FAILED",
        message:
          "OCR provider request failed. Check OCR provider endpoint and server connectivity.",
      });
    }

    if (!response.ok) {
      const providerResponseBody = await response.text();
      const providerError = parseProviderErrorPayload(providerResponseBody);
      const classifiedFailure = classifyProviderFailure({
        status: response.status,
        providerType: providerError.providerType,
        providerCode: providerError.providerCode,
        providerMessage: providerError.providerMessage,
      });

      logTravelOcrDiagnostics({
        provider: "openai",
        stage: "provider_response_error",
        kind: classifiedFailure.kind,
        status: response.status,
        providerType: providerError.providerType,
        providerCode: providerError.providerCode,
        providerMessage: providerError.providerMessage,
        providerRequestId:
          response.headers.get("x-request-id") ??
          response.headers.get("openai-request-id"),
        endpoint: OPENAI_CHAT_COMPLETIONS_URL,
        model: params.model,
      });

      return buildProviderFailure({
        provider: "openai",
        kind: classifiedFailure.kind,
        message: classifiedFailure.message,
      });
    }

    let responsePayload: unknown;
    try {
      responsePayload = (await response.json()) as unknown;
    } catch {
      logTravelOcrDiagnostics({
        provider: "openai",
        stage: "provider_malformed_response",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        status: response.status,
        endpoint: OPENAI_CHAT_COMPLETIONS_URL,
        model: params.model,
      });
      return buildProviderFailure({
        provider: "openai",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        message: MALFORMED_PROVIDER_RESPONSE_MESSAGE,
      });
    }

    const suggestion = parseSuggestionPayload(responsePayload);
    if (!suggestion) {
      logTravelOcrDiagnostics({
        provider: "openai",
        stage: "provider_malformed_response",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        status: response.status,
        endpoint: OPENAI_CHAT_COMPLETIONS_URL,
        model: params.model,
      });
      return buildProviderFailure({
        provider: "openai",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        message: MALFORMED_PROVIDER_RESPONSE_MESSAGE,
      });
    }

    return {
      ok: true,
      provider: "openai",
      data: suggestion,
    };
  } catch (error) {
    logTravelOcrDiagnostics({
      provider: "openai",
      stage: "internal_error",
      kind: "INTERNAL_ERROR",
      endpoint: OPENAI_CHAT_COMPLETIONS_URL,
      model: params.model,
      errorMessage:
        error instanceof Error ? toCompactSnippet(error.message) : "Unknown OCR internal error",
    });

    return buildProviderFailure({
      provider: "openai",
      kind: "INTERNAL_ERROR",
      message: "OCR route failed with unexpected internal error. Check server logs.",
    });
  }
};
