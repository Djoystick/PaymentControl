import type {
  TravelReceiptOcrFailure,
  TravelReceiptOcrFailureKind,
  TravelReceiptOcrProvider,
} from "@/lib/travel/ocr/types";

const MAX_PROVIDER_MESSAGE_LOG_LENGTH = 320;

export const MALFORMED_PROVIDER_RESPONSE_MESSAGE =
  "OCR provider returned malformed response payload.";

export type ParsedProviderErrorPayload = {
  providerType: string | null;
  providerCode: string | null;
  providerMessage: string | null;
};

export const toCompactSnippet = (value: string | null | undefined): string | null => {
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

const normalizeProviderCode = (value: string | null): string => {
  return toLowerText(value).replace(/[-\s]+/g, "_");
};

export const parseProviderErrorPayload = (rawBody: string): ParsedProviderErrorPayload => {
  const fallbackMessage = toCompactSnippet(rawBody);
  if (!rawBody.trim()) {
    return {
      providerType: null,
      providerCode: null,
      providerMessage: null,
    };
  }

  try {
    const payload = JSON.parse(rawBody) as unknown;
    if (!payload || typeof payload !== "object") {
      return {
        providerType: null,
        providerCode: null,
        providerMessage: fallbackMessage,
      };
    }

    const root = payload as Record<string, unknown>;
    const rootMessage =
      typeof root.message === "string" ? toCompactSnippet(root.message) : null;
    const rootCode =
      (typeof root.code === "string" && root.code) ||
      (typeof root.error_code === "string" && root.error_code) ||
      null;
    const rootType =
      (typeof root.type === "string" && root.type) ||
      (typeof root.error_type === "string" && root.error_type) ||
      null;
    const rootErrorDescription =
      typeof root.error_description === "string"
        ? toCompactSnippet(root.error_description)
        : null;

    const nestedError =
      root.error && typeof root.error === "object"
        ? (root.error as Record<string, unknown>)
        : null;

    return {
      providerType:
        (nestedError &&
          ((typeof nestedError.type === "string" && nestedError.type) ||
            (typeof nestedError.error_type === "string" &&
              nestedError.error_type))) ||
        rootType ||
        null,
      providerCode:
        (nestedError &&
          ((typeof nestedError.code === "string" && nestedError.code) ||
            (typeof nestedError.error_code === "string" &&
              nestedError.error_code))) ||
        rootCode ||
        null,
      providerMessage:
        (nestedError &&
          typeof nestedError.message === "string" &&
          toCompactSnippet(nestedError.message)) ||
        (nestedError &&
          typeof nestedError.error_description === "string" &&
          toCompactSnippet(nestedError.error_description)) ||
        rootMessage ||
        rootErrorDescription ||
        fallbackMessage,
    };
  } catch {
    return {
      providerType: null,
      providerCode: null,
      providerMessage: fallbackMessage,
    };
  }
};

export const classifyProviderFailure = (params: {
  status: number;
  providerType: string | null;
  providerCode: string | null;
  providerMessage: string | null;
}): {
  kind: TravelReceiptOcrFailureKind;
  message: string;
} => {
  const providerType = toLowerText(params.providerType);
  const providerCode = normalizeProviderCode(params.providerCode);
  const providerMessage = toLowerText(params.providerMessage);

  const hasAnyCode = (...codes: string[]): boolean => {
    return codes.some((code) => providerCode.includes(code));
  };

  const hasAnyMessage = (...tokens: string[]): boolean => {
    return tokens.some((token) => providerMessage.includes(token));
  };

  const invalidApiKeyDetected =
    params.status === 401 ||
    hasAnyCode(
      "invalid_api_key",
      "unauthorized",
      "forbidden",
      "ocr_unauthorized",
      "auth_failed",
    ) ||
    hasAnyMessage(
      "invalid api key",
      "incorrect api key",
      "invalid token",
      "unauthorized",
      "authentication failed",
    );

  if (invalidApiKeyDetected) {
    return {
      kind: "INVALID_API_KEY",
      message:
        "OCR provider authentication failed. Check OCR provider key/token configuration.",
    };
  }

  const modelAccessDeniedDetected =
    params.status === 403 ||
    hasAnyCode("model_not_found", "engine_not_found", "model_access_denied") ||
    (providerMessage.includes("model") &&
      hasAnyMessage("not found", "not available", "access", "permission"));

  if (modelAccessDeniedDetected) {
    return {
      kind: "MODEL_ACCESS_DENIED",
      message:
        "OCR provider model or engine is unavailable for current configuration.",
    };
  }

  const rateLimitedDetected =
    params.status === 429 ||
    providerType.includes("rate_limit") ||
    hasAnyCode("rate_limit", "too_many_requests", "rate_limited") ||
    hasAnyMessage("rate limit", "too many requests");

  if (rateLimitedDetected) {
    return {
      kind: "RATE_LIMITED",
      message: "OCR provider rate limit reached. Retry in a minute.",
    };
  }

  const quotaExceededDetected =
    hasAnyCode(
      "insufficient_quota",
      "quota_exceeded",
      "billing_hard_limit",
      "billing_limit_exceeded",
      "ocr_quota_exceeded",
    ) ||
    hasAnyMessage("insufficient quota", "billing hard limit", "billing limit", "quota exceeded");

  if (quotaExceededDetected) {
    return {
      kind: "QUOTA_EXCEEDED",
      message:
        "OCR provider quota or billing limit reached. Check OCR provider usage limits.",
    };
  }

  const backendUnavailableDetected =
    hasAnyCode(
      "ocr_backend_misconfigured",
      "ocr_provider_not_installed",
      "backend_unavailable",
      "service_unavailable",
    ) ||
    ((params.status === 502 || params.status === 503 || params.status === 504) &&
      hasAnyMessage(
        "not configured",
        "service unavailable",
        "temporarily unavailable",
        "connection refused",
      ));

  if (backendUnavailableDetected) {
    return {
      kind: "PROVIDER_REQUEST_FAILED",
      message:
        "OCR backend service is unavailable or misconfigured. Check OCR backend health, endpoint, and server env.",
    };
  }

  const backendProviderInternalDetected =
    hasAnyCode(
      "ocr_provider_failed",
      "provider_internal_error",
      "ocr_internal_error",
      "internal_error",
    ) ||
    hasAnyMessage(
      "failed to process",
      "provider failed",
      "unexpected ocr backend error",
      "internal ocr error",
    );

  if (backendProviderInternalDetected) {
    return {
      kind: "INTERNAL_ERROR",
      message:
        "OCR backend processed request but OCR engine failed. Retry later and check OCR backend logs.",
    };
  }

  if (params.status === 502 || params.status === 503 || params.status === 504) {
    return {
      kind: "PROVIDER_REQUEST_FAILED",
      message:
        "OCR backend service is unavailable or misconfigured. Check OCR backend health, endpoint, and server env.",
    };
  }

  return {
    kind: "PROVIDER_REQUEST_FAILED",
    message:
      "OCR provider request failed. Check OCR provider endpoint and server connectivity.",
  };
};

export const logTravelOcrDiagnostics = (params: {
  provider: TravelReceiptOcrProvider;
  stage:
    | "provider_response_error"
    | "provider_transport_error"
    | "provider_malformed_response"
    | "internal_error";
  kind: TravelReceiptOcrFailureKind;
  status?: number | null;
  providerType?: string | null;
  providerCode?: string | null;
  providerMessage?: string | null;
  providerRequestId?: string | null;
  transportMessage?: string | null;
  errorMessage?: string | null;
  endpoint?: string | null;
  model?: string | null;
}) => {
  console.error("[travel-ocr] diagnostics", {
    provider: params.provider,
    stage: params.stage,
    category: params.kind,
    status: params.status ?? null,
    providerType: params.providerType ?? null,
    providerCode: params.providerCode ?? null,
    providerMessage: params.providerMessage ?? null,
    providerRequestId: params.providerRequestId ?? null,
    endpoint: params.endpoint ?? null,
    model: params.model ?? null,
    transportMessage: params.transportMessage ?? null,
    errorMessage: params.errorMessage ?? null,
  });
};

export const buildProviderFailure = (params: {
  provider: TravelReceiptOcrProvider;
  kind: TravelReceiptOcrFailureKind;
  message: string;
  unavailable?: boolean;
}): TravelReceiptOcrFailure => {
  return {
    ok: false,
    provider: params.provider,
    kind: params.kind,
    message: params.message,
    unavailable: params.unavailable ?? false,
  };
};
