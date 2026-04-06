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

export type TravelReceiptOcrFailureKind =
  | "UNAVAILABLE"
  | "INVALID_API_KEY"
  | "MODEL_ACCESS_DENIED"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "PROVIDER_REQUEST_FAILED"
  | "MALFORMED_PROVIDER_RESPONSE"
  | "INTERNAL_ERROR";

type TravelReceiptOcrFailure = {
  ok: false;
  kind: TravelReceiptOcrFailureKind;
  message: string;
  unavailable: boolean;
};

export type TravelReceiptOcrResult =
  | TravelReceiptOcrSuccess
  | TravelReceiptOcrFailure;

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const MAX_PROVIDER_MESSAGE_LOG_LENGTH = 320;
const MALFORMED_PROVIDER_RESPONSE_MESSAGE =
  "OCR provider returned malformed response payload.";

type OpenAiProviderErrorPayload = {
  error?: {
    message?: unknown;
    type?: unknown;
    code?: unknown;
  };
};

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

const toCompactSnippet = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return null;
  }

  if (compact.length <= MAX_PROVIDER_MESSAGE_LOG_LENGTH) {
    return compact;
  }

  return `${compact.slice(0, MAX_PROVIDER_MESSAGE_LOG_LENGTH)}...`;
};

const toLowerText = (value: string | null): string => {
  return (value ?? "").toLowerCase();
};

const parseOpenAiProviderErrorPayload = (rawBody: string): {
  providerType: string | null;
  providerCode: string | null;
  providerMessage: string | null;
} => {
  const defaultMessage = toCompactSnippet(rawBody);
  if (!rawBody.trim()) {
    return {
      providerType: null,
      providerCode: null,
      providerMessage: null,
    };
  }

  try {
    const payload = JSON.parse(rawBody) as OpenAiProviderErrorPayload;
    const providerError = payload?.error;
    if (!providerError || typeof providerError !== "object") {
      return {
        providerType: null,
        providerCode: null,
        providerMessage: defaultMessage,
      };
    }

    return {
      providerType:
        typeof providerError.type === "string" ? providerError.type : null,
      providerCode:
        typeof providerError.code === "string" ? providerError.code : null,
      providerMessage:
        typeof providerError.message === "string"
          ? toCompactSnippet(providerError.message)
          : defaultMessage,
    };
  } catch {
    return {
      providerType: null,
      providerCode: null,
      providerMessage: defaultMessage,
    };
  }
};

const classifyProviderFailure = (params: {
  status: number;
  providerType: string | null;
  providerCode: string | null;
  providerMessage: string | null;
}): {
  kind: TravelReceiptOcrFailureKind;
  message: string;
} => {
  const providerType = toLowerText(params.providerType);
  const providerCode = toLowerText(params.providerCode);
  const providerMessage = toLowerText(params.providerMessage);

  const invalidApiKeyDetected =
    params.status === 401 ||
    providerCode.includes("invalid_api_key") ||
    providerMessage.includes("invalid api key") ||
    providerMessage.includes("incorrect api key");

  if (invalidApiKeyDetected) {
    return {
      kind: "INVALID_API_KEY",
      message:
        "OCR provider rejected API key. Check TRAVEL_RECEIPT_OCR_OPENAI_API_KEY.",
    };
  }

  const modelAccessDeniedDetected =
    params.status === 403 ||
    params.status === 404 ||
    providerCode.includes("model_not_found") ||
    (providerMessage.includes("model") &&
      (providerMessage.includes("not found") ||
        providerMessage.includes("not available") ||
        providerMessage.includes("access") ||
        providerMessage.includes("permission") ||
        providerMessage.includes("not allowed")));

  if (modelAccessDeniedDetected) {
    return {
      kind: "MODEL_ACCESS_DENIED",
      message:
        "OCR provider model is unavailable for current key. Check TRAVEL_RECEIPT_OCR_OPENAI_MODEL and model access.",
    };
  }

  const quotaExceededDetected =
    providerCode.includes("insufficient_quota") ||
    providerMessage.includes("insufficient quota") ||
    providerMessage.includes("quota") ||
    providerMessage.includes("billing hard limit") ||
    providerMessage.includes("billing");

  if (quotaExceededDetected) {
    return {
      kind: "QUOTA_EXCEEDED",
      message:
        "OCR provider quota or billing limit reached. Check OpenAI billing and quota.",
    };
  }

  const rateLimitedDetected =
    params.status === 429 ||
    providerType.includes("rate_limit") ||
    providerCode.includes("rate_limit") ||
    providerMessage.includes("rate limit") ||
    providerMessage.includes("too many requests");

  if (rateLimitedDetected) {
    return {
      kind: "RATE_LIMITED",
      message: "OCR provider rate limit reached. Retry in a minute.",
    };
  }

  return {
    kind: "PROVIDER_REQUEST_FAILED",
    message:
      "OCR provider request failed. Check provider status and server configuration.",
  };
};

const logTravelOcrDiagnostics = (params: {
  stage:
    | "provider_response_error"
    | "provider_transport_error"
    | "provider_malformed_response"
    | "internal_error";
  kind: TravelReceiptOcrFailureKind;
  model: string;
  status?: number | null;
  providerType?: string | null;
  providerCode?: string | null;
  providerMessage?: string | null;
  providerRequestId?: string | null;
  transportMessage?: string | null;
  errorMessage?: string | null;
}) => {
  console.error("[travel-ocr] diagnostics", {
    stage: params.stage,
    category: params.kind,
    model: params.model,
    status: params.status ?? null,
    providerType: params.providerType ?? null,
    providerCode: params.providerCode ?? null,
    providerMessage: params.providerMessage ?? null,
    providerRequestId: params.providerRequestId ?? null,
    transportMessage: params.transportMessage ?? null,
    errorMessage: params.errorMessage ?? null,
  });
};

export const runTravelReceiptOcr = async (params: {
  imageDataUrl: string;
  tripCurrency: string;
}): Promise<TravelReceiptOcrResult> => {
  if (!serverEnv.travelReceiptOcrOpenAiApiKey) {
    return {
      ok: false,
      kind: "UNAVAILABLE",
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

  try {
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
    } catch (error) {
      const transportMessage =
        error instanceof Error ? toCompactSnippet(error.message) : "Unknown transport failure";
      logTravelOcrDiagnostics({
        stage: "provider_transport_error",
        kind: "PROVIDER_REQUEST_FAILED",
        model,
        transportMessage,
      });

      return {
        ok: false,
        kind: "PROVIDER_REQUEST_FAILED",
        unavailable: false,
        message:
          "OCR provider request failed. Check provider status and server configuration.",
      };
    }

    if (!response.ok) {
      const providerResponseBody = await response.text();
      const providerError = parseOpenAiProviderErrorPayload(providerResponseBody);
      const classifiedFailure = classifyProviderFailure({
        status: response.status,
        providerType: providerError.providerType,
        providerCode: providerError.providerCode,
        providerMessage: providerError.providerMessage,
      });

      logTravelOcrDiagnostics({
        stage: "provider_response_error",
        kind: classifiedFailure.kind,
        model,
        status: response.status,
        providerType: providerError.providerType,
        providerCode: providerError.providerCode,
        providerMessage: providerError.providerMessage,
        providerRequestId:
          response.headers.get("x-request-id") ??
          response.headers.get("openai-request-id"),
      });

      return {
        ok: false,
        kind: classifiedFailure.kind,
        unavailable: false,
        message: classifiedFailure.message,
      };
    }

    let responsePayload: unknown;
    try {
      responsePayload = (await response.json()) as unknown;
    } catch {
      logTravelOcrDiagnostics({
        stage: "provider_malformed_response",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        model,
        status: response.status,
      });

      return {
        ok: false,
        kind: "MALFORMED_PROVIDER_RESPONSE",
        unavailable: false,
        message: MALFORMED_PROVIDER_RESPONSE_MESSAGE,
      };
    }

    const content = parseChatContent(responsePayload);
    if (!content) {
      logTravelOcrDiagnostics({
        stage: "provider_malformed_response",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        model,
        status: response.status,
      });

      return {
        ok: false,
        kind: "MALFORMED_PROVIDER_RESPONSE",
        unavailable: false,
        message: MALFORMED_PROVIDER_RESPONSE_MESSAGE,
      };
    }

    const json = extractJsonObject(content);
    if (!json) {
      logTravelOcrDiagnostics({
        stage: "provider_malformed_response",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        model,
        status: response.status,
      });

      return {
        ok: false,
        kind: "MALFORMED_PROVIDER_RESPONSE",
        unavailable: false,
        message: MALFORMED_PROVIDER_RESPONSE_MESSAGE,
      };
    }

    let suggestionPayload: unknown;
    try {
      suggestionPayload = JSON.parse(json) as unknown;
    } catch {
      logTravelOcrDiagnostics({
        stage: "provider_malformed_response",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        model,
        status: response.status,
      });

      return {
        ok: false,
        kind: "MALFORMED_PROVIDER_RESPONSE",
        unavailable: false,
        message: MALFORMED_PROVIDER_RESPONSE_MESSAGE,
      };
    }

    if (!suggestionPayload || typeof suggestionPayload !== "object") {
      logTravelOcrDiagnostics({
        stage: "provider_malformed_response",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        model,
        status: response.status,
      });

      return {
        ok: false,
        kind: "MALFORMED_PROVIDER_RESPONSE",
        unavailable: false,
        message: MALFORMED_PROVIDER_RESPONSE_MESSAGE,
      };
    }

    return {
      ok: true,
      data: normalizeTravelReceiptOcrSuggestion(
        suggestionPayload as Record<string, unknown>,
      ),
    };
  } catch (error) {
    logTravelOcrDiagnostics({
      stage: "internal_error",
      kind: "INTERNAL_ERROR",
      model,
      errorMessage:
        error instanceof Error ? toCompactSnippet(error.message) : "Unknown OCR internal error",
    });

    return {
      ok: false,
      kind: "INTERNAL_ERROR",
      unavailable: false,
      message: "OCR route failed with unexpected internal error. Check server logs.",
    };
  }
};
