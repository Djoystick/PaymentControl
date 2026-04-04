import type {
  TravelCreateExpenseInput,
  TravelCreateReceiptDraftInput,
  TravelCreateTripInput,
  TravelManualSplitInput,
  TravelSplitMode,
} from "@/lib/travel/types";

type ValidationOk<T> = {
  ok: true;
  data: T;
};

type ValidationError = {
  ok: false;
  message: string;
};

const normalizeText = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizeCurrency = (value: unknown): string => {
  const raw = normalizeText(value).toUpperCase();
  if (!/^[A-Z]{3}$/.test(raw)) {
    return "";
  }

  return raw;
};

const normalizeAmount = (value: unknown): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Number(numeric.toFixed(2));
};

const normalizeConversionRate = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Number(numeric.toFixed(6));
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const next = item.trim();
    if (!next) {
      continue;
    }

    const dedupeKey = next.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push(next);
  }

  return normalized;
};

const normalizeManualSplits = (value: unknown): TravelManualSplitInput[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: TravelManualSplitInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const rawMemberId =
      "memberId" in item && typeof item.memberId === "string"
        ? item.memberId.trim()
        : "";
    const rawAmount = "amount" in item ? normalizeAmount(item.amount) : null;
    if (!rawMemberId || !rawAmount) {
      continue;
    }

    normalized.push({
      memberId: rawMemberId,
      amount: rawAmount,
    });
  }

  return normalized;
};

const normalizeSplitMode = (value: unknown): TravelSplitMode | null => {
  if (
    value === "equal_all" ||
    value === "equal_selected" ||
    value === "full_one" ||
    value === "manual_amounts"
  ) {
    return value;
  }

  return null;
};

const normalizeSpentAt = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const normalizeReceiptDraftId = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
};

export const validateTravelCreateTripInput = (
  body: Record<string, unknown>,
): ValidationOk<TravelCreateTripInput> | ValidationError => {
  const title = normalizeText(body.title);
  if (!title || title.length > 120) {
    return {
      ok: false,
      message: "Trip title is required and must be 120 characters or less.",
    };
  }

  const baseCurrency = normalizeCurrency(body.baseCurrency);
  if (!baseCurrency) {
    return {
      ok: false,
      message: "Trip base currency must be a 3-letter code.",
    };
  }

  const descriptionValue = normalizeText(body.description);
  const description = descriptionValue ? descriptionValue.slice(0, 500) : null;

  const memberNames = normalizeStringArray(body.memberNames)
    .map((name) => name.slice(0, 80))
    .filter((name) => name.length > 0);

  if (memberNames.length === 0) {
    return {
      ok: false,
      message: "Add at least one trip member.",
    };
  }

  if (memberNames.length > 32) {
    return {
      ok: false,
      message: "Trip member list is too large for manual-first MVP.",
    };
  }

  return {
    ok: true,
    data: {
      title,
      baseCurrency,
      description,
      memberNames,
    },
  };
};

export const validateTravelCreateExpenseInput = (
  body: Record<string, unknown>,
): ValidationOk<TravelCreateExpenseInput> | ValidationError => {
  const amount = normalizeAmount(body.amount);
  if (!amount) {
    return {
      ok: false,
      message: "Expense amount must be a positive number.",
    };
  }

  const paidByMemberId = normalizeText(body.paidByMemberId);
  if (!paidByMemberId) {
    return {
      ok: false,
      message: "Expense payer is required.",
    };
  }

  const expenseCurrency = normalizeCurrency(body.expenseCurrency);
  if (!expenseCurrency) {
    return {
      ok: false,
      message: "Expense currency must be a 3-letter code.",
    };
  }

  const conversionRate = normalizeConversionRate(body.conversionRate);
  if (
    body.conversionRate !== undefined &&
    body.conversionRate !== null &&
    body.conversionRate !== "" &&
    !conversionRate
  ) {
    return {
      ok: false,
      message: "Conversion rate must be a positive number.",
    };
  }

  const description = normalizeText(body.description);
  if (!description || description.length > 240) {
    return {
      ok: false,
      message: "Expense description is required and must be 240 characters or less.",
    };
  }

  const category = normalizeText(body.category);
  if (!category || category.length > 80) {
    return {
      ok: false,
      message: "Expense category is required and must be 80 characters or less.",
    };
  }

  const splitMode = normalizeSplitMode(body.splitMode);
  if (!splitMode) {
    return {
      ok: false,
      message: "Expense split mode is invalid.",
    };
  }

  const selectedMemberIds = normalizeStringArray(body.selectedMemberIds);
  const fullAmountMemberIdValue = normalizeText(body.fullAmountMemberId);
  const fullAmountMemberId = fullAmountMemberIdValue || null;
  const manualSplits = normalizeManualSplits(body.manualSplits);
  const spentAt = normalizeSpentAt(body.spentAt);
  const receiptDraftId = normalizeReceiptDraftId(body.receiptDraftId);

  if (
    body.spentAt !== undefined &&
    body.spentAt !== null &&
    body.spentAt !== "" &&
    !spentAt
  ) {
    return {
      ok: false,
      message: "Expense date is invalid.",
    };
  }

  return {
    ok: true,
    data: {
      amount,
      expenseCurrency,
      conversionRate,
      paidByMemberId,
      description,
      category,
      splitMode,
      selectedMemberIds,
      fullAmountMemberId,
      manualSplits,
      spentAt,
      receiptDraftId,
    },
  };
};

const RECEIPT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const RECEIPT_IMAGE_DATA_URL_MAX_LENGTH = 7 * 1024 * 1024;

const normalizeImageDataUrl = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("data:image/")) {
    return "";
  }

  if (trimmed.length > RECEIPT_IMAGE_DATA_URL_MAX_LENGTH) {
    return "";
  }

  return trimmed;
};

const normalizeImageMimeType = (value: unknown): string => {
  const raw = normalizeText(value).toLowerCase();
  if (!raw.startsWith("image/")) {
    return "";
  }

  if (raw.length > 120) {
    return "";
  }

  return raw;
};

const normalizeImageFileName = (value: unknown): string | null => {
  const fileName = normalizeText(value);
  if (!fileName) {
    return null;
  }

  return fileName.slice(0, 180);
};

const estimateImageDataUrlBytes = (dataUrl: string): number => {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) {
    return 0;
  }

  const base64Part = dataUrl.slice(commaIndex + 1).replace(/\s+/g, "");
  if (!base64Part) {
    return 0;
  }

  const padding =
    base64Part.endsWith("==") ? 2 : base64Part.endsWith("=") ? 1 : 0;

  return Math.max(0, Math.floor((base64Part.length * 3) / 4) - padding);
};

export const validateTravelCreateReceiptDraftInput = (
  body: Record<string, unknown>,
): ValidationOk<TravelCreateReceiptDraftInput> | ValidationError => {
  const imageDataUrl = normalizeImageDataUrl(body.imageDataUrl);
  if (!imageDataUrl) {
    return {
      ok: false,
      message: "Receipt image is missing or invalid.",
    };
  }

  const imageMimeType = normalizeImageMimeType(body.imageMimeType);
  if (!imageMimeType) {
    return {
      ok: false,
      message: "Receipt image type must be image/*.",
    };
  }

  const estimatedBytes = estimateImageDataUrlBytes(imageDataUrl);
  if (estimatedBytes <= 0) {
    return {
      ok: false,
      message: "Receipt image data could not be read.",
    };
  }

  if (estimatedBytes > RECEIPT_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      message: "Receipt image is too large. Max size is 5 MB.",
    };
  }

  return {
    ok: true,
    data: {
      imageDataUrl,
      imageMimeType,
      imageFileName: normalizeImageFileName(body.imageFileName),
    },
  };
};
