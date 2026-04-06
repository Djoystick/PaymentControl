import "server-only";

import { serverEnv } from "@/lib/config/server-env";
import { preprocessTravelReceiptImageForOcr } from "@/lib/travel/ocr/preprocess";
import { buildProviderFailure } from "@/lib/travel/ocr/provider-utils";
import { runTravelReceiptOcrWithOpenAi } from "@/lib/travel/ocr/providers/openai-provider";
import { runTravelReceiptOcrWithPaddle } from "@/lib/travel/ocr/providers/paddle-provider";
import type {
  TravelReceiptOcrExecutionParams,
  TravelReceiptOcrFailureKind,
  TravelReceiptOcrProvider,
  TravelReceiptOcrResult,
} from "@/lib/travel/ocr/types";

export type { TravelReceiptOcrFailureKind, TravelReceiptOcrResult };

const OCR_UNAVAILABLE_MESSAGE =
  "OCR assistant is not configured on server. Save receipt draft now and parse later after OCR provider setup.";

const isSupportedProvider = (value: string): value is TravelReceiptOcrProvider => {
  return value === "paddle" || value === "openai";
};

const resolveTravelReceiptOcrProvider = (): TravelReceiptOcrProvider => {
  if (isSupportedProvider(serverEnv.travelReceiptOcrProvider)) {
    return serverEnv.travelReceiptOcrProvider;
  }

  return "paddle";
};

const isProviderConfigured = (provider: TravelReceiptOcrProvider): boolean => {
  if (provider === "paddle") {
    return Boolean(serverEnv.travelReceiptOcrPaddleEndpoint);
  }

  return Boolean(serverEnv.travelReceiptOcrOpenAiApiKey);
};

export const runTravelReceiptOcr = async (
  params: TravelReceiptOcrExecutionParams,
): Promise<TravelReceiptOcrResult> => {
  const provider = resolveTravelReceiptOcrProvider();
  if (!isProviderConfigured(provider)) {
    return buildProviderFailure({
      provider,
      kind: "UNAVAILABLE",
      unavailable: true,
      message: OCR_UNAVAILABLE_MESSAGE,
    });
  }

  const preprocessing = preprocessTravelReceiptImageForOcr({
    imageDataUrl: params.imageDataUrl,
    preprocessProfile: serverEnv.travelReceiptOcrPreprocessProfile,
  });
  if (!preprocessing.ok) {
    return buildProviderFailure({
      provider,
      kind: "INTERNAL_ERROR" satisfies TravelReceiptOcrFailureKind,
      message: preprocessing.message,
    });
  }

  if (provider === "paddle") {
    return runTravelReceiptOcrWithPaddle({
      input: params,
      imageDataUrl: preprocessing.imageDataUrl,
      preprocessingHints: preprocessing.hints,
      endpoint: serverEnv.travelReceiptOcrPaddleEndpoint,
      apiKey: serverEnv.travelReceiptOcrPaddleApiKey,
      timeoutMs: serverEnv.travelReceiptOcrPaddleTimeoutMs,
    });
  }

  return runTravelReceiptOcrWithOpenAi({
    input: params,
    imageDataUrl: preprocessing.imageDataUrl,
    apiKey: serverEnv.travelReceiptOcrOpenAiApiKey,
    model: serverEnv.travelReceiptOcrOpenAiModel || "gpt-4o-mini",
  });
};
