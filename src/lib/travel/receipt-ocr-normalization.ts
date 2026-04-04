import type {
  TravelReceiptOcrFieldKey,
  TravelReceiptOcrFieldQuality,
  TravelReceiptOcrFieldQualityMap,
} from "./types.ts";

export type TravelReceiptOcrSuggestion = {
  sourceAmount: number | null;
  sourceCurrency: string | null;
  spentAt: string | null;
  merchant: string | null;
  description: string | null;
  category: string | null;
  conversionRate: number | null;
  rawText: string | null;
  fieldQuality: TravelReceiptOcrFieldQualityMap;
};

const OCR_FIELD_KEYS: TravelReceiptOcrFieldKey[] = [
  "sourceAmount",
  "sourceCurrency",
  "spentAt",
  "merchant",
  "description",
  "category",
  "conversionRate",
];

export const createDefaultTravelReceiptOcrFieldQuality = (): TravelReceiptOcrFieldQualityMap => ({
  sourceAmount: "missing",
  sourceCurrency: "missing",
  spentAt: "missing",
  merchant: "missing",
  description: "missing",
  category: "missing",
  conversionRate: "missing",
});

const parseHumanNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/\s+/g, "").replace(",", ".");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return numeric;
};

const normalizeNumber = (value: unknown, digits: number): number | null => {
  const numeric =
    typeof value === "string" ? parseHumanNumber(value) : Number(value);
  if (numeric === null || !Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Number(numeric.toFixed(digits));
};

const normalizeCurrency = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    return null;
  }

  return normalized;
};

const normalizeText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
};

const normalizeDate = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const shortDateMatch = normalized.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/,
  );

  if (shortDateMatch) {
    const day = Number(shortDateMatch[1]);
    const month = Number(shortDateMatch[2]);
    const year = Number(shortDateMatch[3]);
    const hour = shortDateMatch[4] ? Number(shortDateMatch[4]) : 12;
    const minute = shortDateMatch[5] ? Number(shortDateMatch[5]) : 0;
    const parsedShortDate = new Date(
      Date.UTC(year, month - 1, day, hour, minute, 0),
    );

    if (!Number.isNaN(parsedShortDate.getTime())) {
      return parsedShortDate.toISOString();
    }
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const normalizeFieldQuality = (
  value: unknown,
  fallback: TravelReceiptOcrFieldQuality,
): TravelReceiptOcrFieldQuality => {
  if (
    value === "high" ||
    value === "medium" ||
    value === "low" ||
    value === "missing"
  ) {
    return value;
  }

  return fallback;
};

export const normalizeTravelReceiptOcrSuggestion = (
  payload: Record<string, unknown>,
): TravelReceiptOcrSuggestion => {
  const sourceAmount = normalizeNumber(payload.sourceAmount, 2);
  const sourceCurrency = normalizeCurrency(payload.sourceCurrency);
  const spentAt = normalizeDate(payload.spentAt);
  const merchant = normalizeText(payload.merchant, 240);
  const description = normalizeText(payload.description, 240);
  const category = normalizeText(payload.category, 80);
  const conversionRate = normalizeNumber(payload.conversionRate, 6);
  const rawText = normalizeText(payload.rawText, 8000);

  const providedQuality =
    payload.fieldQuality && typeof payload.fieldQuality === "object"
      ? (payload.fieldQuality as Record<string, unknown>)
      : null;

  const fieldQuality = createDefaultTravelReceiptOcrFieldQuality();

  for (const key of OCR_FIELD_KEYS) {
    const fallback: TravelReceiptOcrFieldQuality =
      (key === "sourceAmount" && sourceAmount !== null) ||
      (key === "sourceCurrency" && sourceCurrency !== null) ||
      (key === "spentAt" && spentAt !== null) ||
      (key === "merchant" && merchant !== null) ||
      (key === "description" && description !== null) ||
      (key === "category" && category !== null) ||
      (key === "conversionRate" && conversionRate !== null)
        ? "medium"
        : "missing";

    fieldQuality[key] = normalizeFieldQuality(providedQuality?.[key], fallback);
  }

  return {
    sourceAmount,
    sourceCurrency,
    spentAt,
    merchant,
    description,
    category,
    conversionRate,
    rawText,
    fieldQuality,
  };
};
