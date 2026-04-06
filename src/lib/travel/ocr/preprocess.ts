import type { TravelReceiptOcrPreprocessResult } from "@/lib/travel/ocr/types";

const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/;

const normalizeBase64 = (value: string): string => {
  return value.replace(/\s+/g, "");
};

const normalizeDataUrl = (imageDataUrl: string): string | null => {
  const trimmed = imageDataUrl.trim();
  if (!trimmed) {
    return null;
  }

  const match = DATA_URL_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const mime = match[1].toLowerCase();
  const normalizedBase64 = normalizeBase64(match[2]);
  if (!normalizedBase64) {
    return null;
  }

  return `data:${mime};base64,${normalizedBase64}`;
};

export const preprocessTravelReceiptImageForOcr = (params: {
  imageDataUrl: string;
  preprocessProfile: string;
}): TravelReceiptOcrPreprocessResult => {
  const normalizedDataUrl = normalizeDataUrl(params.imageDataUrl);
  if (!normalizedDataUrl) {
    return {
      ok: false,
      message: "Receipt image preprocessing failed. Save draft and retry with a different image.",
    };
  }

  return {
    ok: true,
    imageDataUrl: normalizedDataUrl,
    hints: {
      profile: params.preprocessProfile,
      normalizeOrientation: true,
      grayscale: true,
      contrastBoost: true,
      adaptiveThreshold: true,
      deskew: true,
      cropToReceipt: true,
      maxSidePx: 2200,
    },
  };
};
