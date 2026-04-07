import type { TravelReceiptOcrSuggestion } from "@/lib/travel/receipt-ocr-normalization";

export type TravelReceiptOcrProvider = "paddle" | "openai";

export type TravelReceiptOcrFailureKind =
  | "UNAVAILABLE"
  | "INVALID_API_KEY"
  | "MODEL_ACCESS_DENIED"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "PROVIDER_REQUEST_FAILED"
  | "MALFORMED_PROVIDER_RESPONSE"
  | "INTERNAL_ERROR";

export type TravelReceiptOcrSuccess = {
  ok: true;
  provider: TravelReceiptOcrProvider;
  data: TravelReceiptOcrSuggestion;
};

export type TravelReceiptOcrFailure = {
  ok: false;
  provider: TravelReceiptOcrProvider;
  kind: TravelReceiptOcrFailureKind;
  message: string;
  unavailable: boolean;
};

export type TravelReceiptOcrResult =
  | TravelReceiptOcrSuccess
  | TravelReceiptOcrFailure;

export type TravelReceiptOcrExecutionParams = {
  imageDataUrl: string;
  tripCurrency: string;
};

export type TravelReceiptOcrPreprocessHints = {
  profile: string;
  normalizeOrientation: boolean;
  grayscale: boolean;
  contrastBoost: boolean;
  adaptiveThreshold: boolean;
  deskew: boolean;
  cropToReceipt: boolean;
  perspectiveCorrection: boolean;
  denoise: boolean;
  qrFirst: boolean;
  maxSidePx: number;
};

export type TravelReceiptOcrPreprocessSuccess = {
  ok: true;
  imageDataUrl: string;
  hints: TravelReceiptOcrPreprocessHints;
};

export type TravelReceiptOcrPreprocessFailure = {
  ok: false;
  message: string;
};

export type TravelReceiptOcrPreprocessResult =
  | TravelReceiptOcrPreprocessSuccess
  | TravelReceiptOcrPreprocessFailure;
