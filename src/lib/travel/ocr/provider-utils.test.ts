import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyProviderFailure,
  parseProviderErrorPayload,
} from "./provider-utils.ts";

test("parseProviderErrorPayload reads backend-style error_code contract", () => {
  const parsed = parseProviderErrorPayload(
    JSON.stringify({
      ok: false,
      error_code: "OCR_PROVIDER_FAILED",
      message: "PaddleOCR failed to process the receipt image.",
    }),
  );

  assert.equal(parsed.providerCode, "OCR_PROVIDER_FAILED");
  assert.equal(parsed.providerMessage, "PaddleOCR failed to process the receipt image.");
});

test("classifyProviderFailure maps backend misconfiguration 503 to provider request failure", () => {
  const classified = classifyProviderFailure({
    status: 503,
    providerType: null,
    providerCode: "OCR_BACKEND_MISCONFIGURED",
    providerMessage: "OCR endpoint is unavailable: OCR_BACKEND_API_KEY is not configured.",
  });

  assert.equal(classified.kind, "PROVIDER_REQUEST_FAILED");
  assert.equal(
    classified.message,
    "OCR backend service is unavailable or misconfigured. Check OCR backend health, endpoint, and server env.",
  );
});

test("classifyProviderFailure maps backend provider crash to internal OCR error", () => {
  const classified = classifyProviderFailure({
    status: 502,
    providerType: null,
    providerCode: "OCR_PROVIDER_FAILED",
    providerMessage: "PaddleOCR failed to process the receipt image.",
  });

  assert.equal(classified.kind, "INTERNAL_ERROR");
  assert.equal(
    classified.message,
    "OCR backend processed request but OCR engine failed. Retry later and check OCR backend logs.",
  );
});

test("classifyProviderFailure keeps quota branch only for explicit quota signals", () => {
  const classified = classifyProviderFailure({
    status: 503,
    providerType: null,
    providerCode: "insufficient_quota",
    providerMessage: "Insufficient quota",
  });

  assert.equal(classified.kind, "QUOTA_EXCEEDED");
});

