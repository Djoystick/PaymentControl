import {
  createDefaultTravelReceiptOcrFieldQuality,
  normalizeTravelReceiptOcrSuggestion,
  type TravelReceiptOcrSuggestion,
} from "@/lib/travel/receipt-ocr-normalization";
import type {
  TravelReceiptOcrExecutionParams,
  TravelReceiptOcrPreprocessHints,
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

const SUGGESTION_KEYS = [
  "sourceAmount",
  "sourceCurrency",
  "spentAt",
  "merchant",
  "description",
  "category",
  "conversionRate",
  "rawText",
  "fieldQuality",
] as const;

const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₽": "RUB",
};

const RECEIPT_CURRENCY_ALIASES: Record<string, string> = {
  RUR: "RUB",
  US$: "USD",
};

const toSafeObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
};

const looksLikeSuggestionPayload = (
  payload: Record<string, unknown>,
): boolean => {
  return SUGGESTION_KEYS.some((key) => Object.prototype.hasOwnProperty.call(payload, key));
};

const extractTextFromPayload = (payload: Record<string, unknown>): string | null => {
  const directTextKeys = ["rawText", "text", "ocrText", "recognizedText"] as const;
  for (const key of directTextKeys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const linesValue = payload.lines;
  if (Array.isArray(linesValue)) {
    const lineTexts = linesValue
      .map((line) => {
        if (typeof line === "string") {
          return line.trim();
        }

        if (line && typeof line === "object") {
          const lineObj = line as Record<string, unknown>;
          if (typeof lineObj.text === "string") {
            return lineObj.text.trim();
          }
        }

        return "";
      })
      .filter((line) => line.length > 0);

    if (lineTexts.length > 0) {
      return lineTexts.join("\n");
    }
  }

  return null;
};

const parseReceiptAmount = (rawText: string): number | null => {
  const amountTokens = rawText.match(/\d{1,3}(?:[ \u00A0.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2}/g);
  if (!amountTokens || amountTokens.length === 0) {
    return null;
  }

  const candidates = amountTokens
    .map((token) => Number(token.replace(/\s+/g, "").replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 10_000_000);

  if (candidates.length === 0) {
    return null;
  }

  const bestCandidate = Math.max(...candidates);
  return Number(bestCandidate.toFixed(2));
};

const parseReceiptCurrency = (rawText: string, tripCurrency: string): string | null => {
  for (const [symbol, currency] of Object.entries(CURRENCY_SYMBOL_MAP)) {
    if (rawText.includes(symbol)) {
      return currency;
    }
  }

  const currencyMatch = rawText.match(/\b[A-Z]{3}\b/g);
  if (currencyMatch) {
    for (const entry of currencyMatch) {
      const normalized = RECEIPT_CURRENCY_ALIASES[entry] ?? entry;
      if (/^[A-Z]{3}$/.test(normalized)) {
        return normalized;
      }
    }
  }

  return tripCurrency;
};

const parseReceiptDate = (rawText: string): string | null => {
  const dayFirst = rawText.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?\b/);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = Number(dayFirst[2]);
    const year = Number(dayFirst[3]);
    const hour = dayFirst[4] ? Number(dayFirst[4]) : 12;
    const minute = dayFirst[5] ? Number(dayFirst[5]) : 0;
    const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const iso = rawText.match(/\b(20\d{2})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?\b/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const hour = iso[4] ? Number(iso[4]) : 12;
    const minute = iso[5] ? Number(iso[5]) : 0;
    const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
};

const parseReceiptDescription = (rawText: string): string | null => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const descriptiveLine = lines.find((line) => {
    const alphaChars = line.replace(/[^A-Za-zА-Яа-я]/g, "");
    return alphaChars.length >= 3;
  });

  if (!descriptiveLine) {
    return null;
  }

  return descriptiveLine.slice(0, 240);
};

const inferReceiptCategory = (rawText: string): string | null => {
  const normalized = rawText.toLowerCase();
  if (
    normalized.includes("taxi") ||
    normalized.includes("uber") ||
    normalized.includes("metro") ||
    normalized.includes("bus") ||
    normalized.includes("transport")
  ) {
    return "Transport";
  }

  if (
    normalized.includes("hotel") ||
    normalized.includes("booking") ||
    normalized.includes("hostel") ||
    normalized.includes("stay")
  ) {
    return "Stay";
  }

  if (
    normalized.includes("restaurant") ||
    normalized.includes("cafe") ||
    normalized.includes("coffee") ||
    normalized.includes("food")
  ) {
    return "Food";
  }

  return "General";
};

const buildSuggestionFromRawText = (params: {
  rawText: string;
  tripCurrency: string;
}): TravelReceiptOcrSuggestion => {
  const quality = createDefaultTravelReceiptOcrFieldQuality();
  const sourceAmount = parseReceiptAmount(params.rawText);
  const sourceCurrency = parseReceiptCurrency(params.rawText, params.tripCurrency);
  const spentAt = parseReceiptDate(params.rawText);
  const description = parseReceiptDescription(params.rawText);
  const category = inferReceiptCategory(params.rawText);

  if (sourceAmount !== null) {
    quality.sourceAmount = "medium";
  }
  if (sourceCurrency !== null) {
    quality.sourceCurrency = "medium";
  }
  if (spentAt !== null) {
    quality.spentAt = "low";
  }
  if (description !== null) {
    quality.description = "medium";
    quality.merchant = "low";
  }
  if (category !== null) {
    quality.category = "low";
  }

  return normalizeTravelReceiptOcrSuggestion({
    sourceAmount,
    sourceCurrency,
    spentAt,
    merchant: null,
    description,
    category,
    conversionRate: null,
    rawText: params.rawText.slice(0, 8000),
    fieldQuality: quality,
  });
};

const extractSuggestionPayload = (payload: Record<string, unknown>): {
  suggestion: TravelReceiptOcrSuggestion | null;
  rawTextHint: string | null;
} => {
  const candidates: Record<string, unknown>[] = [payload];
  const dataObject = toSafeObject(payload.data);
  if (dataObject) {
    candidates.push(dataObject);
  }

  const resultObject = toSafeObject(payload.result);
  if (resultObject) {
    candidates.push(resultObject);
  }

  for (const candidate of candidates) {
    if (looksLikeSuggestionPayload(candidate)) {
      return {
        suggestion: normalizeTravelReceiptOcrSuggestion(candidate),
        rawTextHint: null,
      };
    }
  }

  for (const candidate of candidates) {
    const text = extractTextFromPayload(candidate);
    if (text) {
      return {
        suggestion: null,
        rawTextHint: text,
      };
    }
  }

  return {
    suggestion: null,
    rawTextHint: null,
  };
};

export const runTravelReceiptOcrWithPaddle = async (params: {
  input: TravelReceiptOcrExecutionParams;
  imageDataUrl: string;
  preprocessingHints: TravelReceiptOcrPreprocessHints;
  endpoint: string;
  apiKey: string;
  timeoutMs: number;
}): Promise<TravelReceiptOcrResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, params.timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (params.apiKey) {
      headers.Authorization = `Bearer ${params.apiKey}`;
      headers["x-api-key"] = params.apiKey;
    }

    let response: Response;
    try {
      response = await fetch(params.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          imageDataUrl: params.imageDataUrl,
          tripCurrency: params.input.tripCurrency,
          preprocessing: params.preprocessingHints,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      const isAbortError =
        error instanceof DOMException && error.name === "AbortError";
      const transportMessage = isAbortError
        ? `Timed out after ${params.timeoutMs}ms`
        : error instanceof Error
          ? toCompactSnippet(error.message)
          : "Unknown transport failure";
      logTravelOcrDiagnostics({
        provider: "paddle",
        stage: "provider_transport_error",
        kind: "PROVIDER_REQUEST_FAILED",
        endpoint: params.endpoint,
        transportMessage,
      });

      return buildProviderFailure({
        provider: "paddle",
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
        provider: "paddle",
        stage: "provider_response_error",
        kind: classifiedFailure.kind,
        status: response.status,
        providerType: providerError.providerType,
        providerCode: providerError.providerCode,
        providerMessage: providerError.providerMessage,
        endpoint: params.endpoint,
        providerRequestId:
          response.headers.get("x-request-id") ??
          response.headers.get("x-trace-id"),
      });

      return buildProviderFailure({
        provider: "paddle",
        kind: classifiedFailure.kind,
        message: classifiedFailure.message,
      });
    }

    let responsePayload: unknown;
    try {
      responsePayload = (await response.json()) as unknown;
    } catch {
      logTravelOcrDiagnostics({
        provider: "paddle",
        stage: "provider_malformed_response",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        status: response.status,
        endpoint: params.endpoint,
      });
      return buildProviderFailure({
        provider: "paddle",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        message: MALFORMED_PROVIDER_RESPONSE_MESSAGE,
      });
    }

    const payload = toSafeObject(responsePayload);
    if (!payload) {
      logTravelOcrDiagnostics({
        provider: "paddle",
        stage: "provider_malformed_response",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        status: response.status,
        endpoint: params.endpoint,
      });
      return buildProviderFailure({
        provider: "paddle",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        message: MALFORMED_PROVIDER_RESPONSE_MESSAGE,
      });
    }

    const extracted = extractSuggestionPayload(payload);
    const suggestion =
      extracted.suggestion ??
      (extracted.rawTextHint
        ? buildSuggestionFromRawText({
            rawText: extracted.rawTextHint,
            tripCurrency: params.input.tripCurrency,
          })
        : null);

    if (!suggestion) {
      logTravelOcrDiagnostics({
        provider: "paddle",
        stage: "provider_malformed_response",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        status: response.status,
        endpoint: params.endpoint,
      });
      return buildProviderFailure({
        provider: "paddle",
        kind: "MALFORMED_PROVIDER_RESPONSE",
        message: MALFORMED_PROVIDER_RESPONSE_MESSAGE,
      });
    }

    return {
      ok: true,
      provider: "paddle",
      data: suggestion,
    };
  } catch (error) {
    logTravelOcrDiagnostics({
      provider: "paddle",
      stage: "internal_error",
      kind: "INTERNAL_ERROR",
      endpoint: params.endpoint,
      errorMessage:
        error instanceof Error ? toCompactSnippet(error.message) : "Unknown OCR internal error",
    });
    return buildProviderFailure({
      provider: "paddle",
      kind: "INTERNAL_ERROR",
      message: "OCR route failed with unexpected internal error. Check server logs.",
    });
  } finally {
    clearTimeout(timeoutId);
  }
};
