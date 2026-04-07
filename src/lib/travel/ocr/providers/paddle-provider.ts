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
import {
  buildReceiptFieldQualityFromExtraction,
  collectReceiptTextLinesFromUnknown,
  extractReceiptInsights,
  parseReceiptQrPayload,
  type TravelReceiptQrPayload,
} from "@/lib/travel/ocr/receipt-heuristics";

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

const toSafeObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
};

const looksLikeSuggestionPayload = (payload: Record<string, unknown>): boolean => {
  return SUGGESTION_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );
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

  const recursiveLines = collectReceiptTextLinesFromUnknown(payload, 4);
  if (recursiveLines.length > 0) {
    return recursiveLines.join("\n");
  }

  return null;
};

const extractQrPayloadFromCandidate = (
  payload: Record<string, unknown>,
): TravelReceiptQrPayload | null => {
  const directQrKeys = ["qr", "qrText", "qrRawText", "qrValue"] as const;
  for (const key of directQrKeys) {
    const value = payload[key];
    if (typeof value === "string") {
      const parsed = parseReceiptQrPayload(value);
      if (parsed) {
        return parsed;
      }
    }
  }

  const qrObject = toSafeObject(payload.qrData ?? payload.qr_data);
  if (qrObject) {
    const possibleRaw =
      typeof qrObject.rawValue === "string"
        ? qrObject.rawValue
        : typeof qrObject.raw === "string"
          ? qrObject.raw
          : null;
    if (possibleRaw) {
      const parsed = parseReceiptQrPayload(possibleRaw);
      if (parsed) {
        return parsed;
      }
    }
  }

  return null;
};

const qualityRank = (value: string | undefined): number => {
  if (value === "high") {
    return 4;
  }
  if (value === "medium") {
    return 3;
  }
  if (value === "low") {
    return 2;
  }
  return 1;
};

const pickHigherQuality = (left: string, right: string): string => {
  return qualityRank(right) > qualityRank(left) ? right : left;
};

const mergeFieldQuality = (params: {
  base: TravelReceiptOcrSuggestion["fieldQuality"];
  derived: TravelReceiptOcrSuggestion["fieldQuality"];
}): TravelReceiptOcrSuggestion["fieldQuality"] => {
  const merged = createDefaultTravelReceiptOcrFieldQuality();
  for (const key of Object.keys(merged) as Array<keyof TravelReceiptOcrSuggestion["fieldQuality"]>) {
    merged[key] = pickHigherQuality(params.base[key], params.derived[key]) as TravelReceiptOcrSuggestion["fieldQuality"][typeof key];
  }
  return merged;
};

const enrichSuggestionWithReceiptHeuristics = (params: {
  suggestion: TravelReceiptOcrSuggestion;
  tripCurrency: string;
  qrPayload: TravelReceiptQrPayload | null;
}): TravelReceiptOcrSuggestion => {
  const rawText = params.suggestion.rawText ?? "";
  const extraction = extractReceiptInsights({
    rawText,
    tripCurrency: params.tripCurrency,
    qrPayload: params.qrPayload,
  });

  const extractedFieldQuality = buildReceiptFieldQualityFromExtraction(extraction);
  const next = { ...params.suggestion };

  const shouldPreferExtractedAmount =
    params.qrPayload?.sourceAmount !== null ||
    next.sourceAmount === null ||
    next.fieldQuality.sourceAmount === "low" ||
    next.fieldQuality.sourceAmount === "missing";
  if (shouldPreferExtractedAmount && extraction.sourceAmount !== null) {
    next.sourceAmount = extraction.sourceAmount;
  }

  const shouldPreferExtractedCurrency =
    params.qrPayload?.sourceCurrency !== null ||
    next.sourceCurrency === null ||
    next.fieldQuality.sourceCurrency === "low" ||
    next.fieldQuality.sourceCurrency === "missing";
  if (shouldPreferExtractedCurrency && extraction.sourceCurrency !== null) {
    next.sourceCurrency = extraction.sourceCurrency;
  }

  const shouldPreferExtractedDate =
    params.qrPayload?.spentAt !== null ||
    next.spentAt === null ||
    next.fieldQuality.spentAt === "low" ||
    next.fieldQuality.spentAt === "missing";
  if (shouldPreferExtractedDate && extraction.spentAt !== null) {
    next.spentAt = extraction.spentAt;
  }

  if (
    (next.merchant === null ||
      next.fieldQuality.merchant === "low" ||
      next.fieldQuality.merchant === "missing") &&
    extraction.merchant !== null
  ) {
    next.merchant = extraction.merchant;
  }

  if (
    (next.description === null ||
      next.fieldQuality.description === "low" ||
      next.fieldQuality.description === "missing") &&
    extraction.description !== null
  ) {
    next.description = extraction.description;
  }

  if (
    (next.category === null ||
      next.fieldQuality.category === "missing") &&
    extraction.category !== null
  ) {
    next.category = extraction.category;
  }

  if (extraction.rawText) {
    next.rawText = extraction.rawText;
  }

  next.fieldQuality = mergeFieldQuality({
    base: next.fieldQuality,
    derived: extractedFieldQuality,
  });

  return normalizeTravelReceiptOcrSuggestion(next);
};

const buildSuggestionFromRawText = (params: {
  rawText: string;
  tripCurrency: string;
  qrPayload: TravelReceiptQrPayload | null;
}): TravelReceiptOcrSuggestion => {
  const extraction = extractReceiptInsights({
    rawText: params.rawText,
    tripCurrency: params.tripCurrency,
    qrPayload: params.qrPayload,
  });

  return normalizeTravelReceiptOcrSuggestion({
    sourceAmount: extraction.sourceAmount,
    sourceCurrency: extraction.sourceCurrency,
    spentAt: extraction.spentAt,
    merchant: extraction.merchant,
    description: extraction.description,
    category: extraction.category,
    conversionRate: null,
    rawText: extraction.rawText,
    fieldQuality: buildReceiptFieldQualityFromExtraction(extraction),
  });
};

const extractSuggestionPayload = (payload: Record<string, unknown>): {
  suggestion: TravelReceiptOcrSuggestion | null;
  rawTextHint: string | null;
  qrPayload: TravelReceiptQrPayload | null;
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

  let qrPayload: TravelReceiptQrPayload | null = null;
  for (const candidate of candidates) {
    if (!qrPayload) {
      qrPayload = extractQrPayloadFromCandidate(candidate);
    }
  }

  for (const candidate of candidates) {
    if (looksLikeSuggestionPayload(candidate)) {
      return {
        suggestion: normalizeTravelReceiptOcrSuggestion(candidate),
        rawTextHint: null,
        qrPayload,
      };
    }
  }

  for (const candidate of candidates) {
    const text = extractTextFromPayload(candidate);
    if (text) {
      return {
        suggestion: null,
        rawTextHint: text,
        qrPayload,
      };
    }
  }

  return {
    suggestion: null,
    rawTextHint: null,
    qrPayload,
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
    const suggestion = extracted.suggestion
      ? enrichSuggestionWithReceiptHeuristics({
          suggestion: extracted.suggestion,
          tripCurrency: params.input.tripCurrency,
          qrPayload: extracted.qrPayload,
        })
      : extracted.rawTextHint
        ? buildSuggestionFromRawText({
            rawText: extracted.rawTextHint,
            tripCurrency: params.input.tripCurrency,
            qrPayload: extracted.qrPayload,
          })
        : null;

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
        error instanceof Error
          ? toCompactSnippet(error.message)
          : "Unknown OCR internal error",
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
