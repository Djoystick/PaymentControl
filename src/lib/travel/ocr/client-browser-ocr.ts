import {
  createDefaultTravelReceiptOcrFieldQuality,
  normalizeTravelReceiptOcrSuggestion,
} from "@/lib/travel/receipt-ocr-normalization";
import type { TravelReceiptClientSuggestionPayload } from "@/lib/travel/types";

type TravelClientReceiptOcrFailureKind =
  | "UNAVAILABLE"
  | "MODEL_LOADING_FAILED"
  | "TIMEOUT"
  | "NO_TEXT_DETECTED"
  | "PROCESSING_FAILED";

type TravelClientReceiptOcrSuccess = {
  ok: true;
  suggestion: TravelReceiptClientSuggestionPayload;
  meta: {
    durationMs: number;
    lineCount: number;
    textLength: number;
  };
};

type TravelClientReceiptOcrFailure = {
  ok: false;
  kind: TravelClientReceiptOcrFailureKind;
  message: string;
};

export type TravelClientReceiptOcrResult =
  | TravelClientReceiptOcrSuccess
  | TravelClientReceiptOcrFailure;

type BrowserOcrRuntime = {
  ocr: (imageDataUrl: string) => Promise<unknown>;
};

type WindowWithClientOcr = Window & {
  ort?: unknown;
  cv?: {
    Mat?: unknown;
  };
};

const CLIENT_OCR_DEFAULT_TIMEOUT_MS = 30000;
const CLIENT_OCR_MIN_TIMEOUT_MS = 5000;
const CLIENT_OCR_MAX_TIMEOUT_MS = 120000;
const CLIENT_OCR_MAX_SIDE_PX = 1800;
const CLIENT_OCR_BINARIZE_THRESHOLD = 162;
const CLIENT_OCR_TEXT_COLLECT_DEPTH_LIMIT = 4;

const ORT_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.min.js";
const OPENCV_SCRIPT_URL = "https://docs.opencv.org/4.8.0/opencv.js";
const ESEARCH_OCR_MODULE_URL = "https://cdn.jsdelivr.net/npm/esearch-ocr@5.1.5/dist/esearch-ocr.js";

const MODEL_BASE_URL = "https://cdn.jsdelivr.net/npm/paddleocr-browser@1.0.3/dist";
const DETECTION_MODEL_URL = `${MODEL_BASE_URL}/ppocr_det.onnx`;
const RECOGNITION_MODEL_URL = `${MODEL_BASE_URL}/ppocr_rec.onnx`;
const DICTIONARY_URL = `${MODEL_BASE_URL}/ppocr_keys_v1.txt`;

const TOTAL_HINT_PATTERN =
  /(итог|сумма|к оплате|всего|total|amount due|grand total)/i;
const DATE_PATTERN =
  /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/;
const AMOUNT_TOKEN_PATTERN =
  /\d{1,3}(?:[ \u00A0.,]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2})/g;
const MERCHANT_SKIP_PATTERN =
  /(кассир|qr|чек|receipt|vat|налог|инн|кпп|телефон|www\.|http|банк|payment|card|terminal|term)/i;

const FOOD_PATTERN =
  /(еда|food|cafe|café|restaurant|рест|кофе|coffee|bar|доставка)/i;
const TRANSPORT_PATTERN =
  /(такси|taxi|uber|metro|поезд|train|bus|автобус|transport|fuel|бензин)/i;
const HOTEL_PATTERN =
  /(hotel|hostel|booking|отель|гостиниц|apartment|bnb|airbnb)/i;
const SHOPPING_PATTERN =
  /(shop|store|market|магазин|супермаркет|mall|shopping)/i;
const TICKETS_PATTERN = /(ticket|билет|flight|авиабилет|avia|rail)/i;

class ClientOcrTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientOcrTimeoutError";
  }
}

let runtimePromise: Promise<BrowserOcrRuntime> | null = null;

const isBrowserRuntime = (): boolean => {
  return typeof window !== "undefined" && typeof document !== "undefined";
};

const toFailure = (
  kind: TravelClientReceiptOcrFailureKind,
  message: string,
): TravelClientReceiptOcrFailure => {
  return {
    ok: false,
    kind,
    message,
  };
};

const clampTimeout = (value?: number): number => {
  if (!Number.isFinite(value)) {
    return CLIENT_OCR_DEFAULT_TIMEOUT_MS;
  }

  return Math.min(
    CLIENT_OCR_MAX_TIMEOUT_MS,
    Math.max(CLIENT_OCR_MIN_TIMEOUT_MS, Math.floor(Number(value))),
  );
};

const runWithTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new ClientOcrTimeoutError(timeoutMessage));
      }, timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
};

const loadScriptOnce = async (params: {
  id: string;
  src: string;
  timeoutMs: number;
}): Promise<void> => {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-ocr-id='${params.id}']`);
  if (existing?.dataset.loaded === "true") {
    return;
  }

  const script = existing ?? document.createElement("script");
  script.async = true;
  script.src = params.src;
  script.dataset.ocrId = params.id;

  await runWithTimeout(
    new Promise<void>((resolve, reject) => {
      const onLoad = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      const onError = () =>
        reject(new Error(`Failed to load OCR runtime script: ${params.src}`));

      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
      if (!existing) {
        document.head.appendChild(script);
      }
    }),
    params.timeoutMs,
    `Loading OCR runtime script timed out: ${params.id}`,
  );
};

const waitForOpenCvRuntime = async (timeoutMs: number): Promise<void> => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const cv = (window as WindowWithClientOcr).cv;
    if (cv && typeof cv === "object" && "Mat" in cv && cv.Mat) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  throw new ClientOcrTimeoutError("OpenCV runtime initialization timed out.");
};

const importEsearchOcrModule = async (): Promise<Record<string, unknown>> => {
  const moduleUrl = ESEARCH_OCR_MODULE_URL;
  const loaded = await import(/* webpackIgnore: true */ moduleUrl);
  return loaded as Record<string, unknown>;
};

const createBrowserOcrRuntime = async (timeoutMs: number): Promise<BrowserOcrRuntime> => {
  await loadScriptOnce({
    id: "travel-ocr-ort",
    src: ORT_SCRIPT_URL,
    timeoutMs,
  });
  await loadScriptOnce({
    id: "travel-ocr-opencv",
    src: OPENCV_SCRIPT_URL,
    timeoutMs,
  });
  await waitForOpenCvRuntime(timeoutMs);

  const dictionaryText = await runWithTimeout(
    fetch(DICTIONARY_URL).then(async (response) => {
      if (!response.ok) {
        throw new Error("OCR dictionary download failed.");
      }
      return response.text();
    }),
    timeoutMs,
    "Downloading OCR dictionary timed out.",
  );
  if (!dictionaryText.trim()) {
    throw new Error("OCR dictionary is empty.");
  }

  const paddleModule = await runWithTimeout(
    importEsearchOcrModule(),
    timeoutMs,
    "Loading OCR module timed out.",
  );
  const initFn = paddleModule.init;
  const ocrFn = paddleModule.ocr;
  if (typeof initFn !== "function" || typeof ocrFn !== "function") {
    throw new Error("OCR module does not expose init/ocr functions.");
  }

  await runWithTimeout(
    (initFn as (options: Record<string, unknown>) => Promise<void>)({
      detPath: DETECTION_MODEL_URL,
      recPath: RECOGNITION_MODEL_URL,
      dic: dictionaryText,
      ort: (window as WindowWithClientOcr).ort,
      node: false,
      cv: (window as WindowWithClientOcr).cv,
    }),
    timeoutMs,
    "Initializing OCR module timed out.",
  );

  return {
    ocr: (imageDataUrl: string) =>
      (ocrFn as (image: string) => Promise<unknown>)(imageDataUrl),
  };
};

const getBrowserOcrRuntime = async (timeoutMs: number): Promise<BrowserOcrRuntime> => {
  if (!runtimePromise) {
    runtimePromise = createBrowserOcrRuntime(timeoutMs).catch((error) => {
      runtimePromise = null;
      throw error;
    });
  }

  return runtimePromise;
};

const loadImageFromDataUrl = async (imageDataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Receipt image could not be decoded in browser OCR."));
    image.src = imageDataUrl;
  });
};

const buildScaledCanvas = (
  image: HTMLImageElement,
  maxSidePx: number,
): HTMLCanvasElement => {
  const maxSide = Math.max(image.naturalWidth || 0, image.naturalHeight || 0);
  const scale = maxSide > maxSidePx && maxSide > 0 ? maxSidePx / maxSide : 1;
  const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable for browser OCR.");
  }

  context.imageSmoothingEnabled = true;
  context.drawImage(image, 0, 0, width, height);
  return canvas;
};

const buildEnhancedCanvas = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable for OCR preprocessing.");
  }

  context.filter = "grayscale(100%) contrast(145%) brightness(108%)";
  context.drawImage(sourceCanvas, 0, 0);
  context.filter = "none";

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    const luminance = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    const value = luminance >= CLIENT_OCR_BINARIZE_THRESHOLD ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
};

const normalizeLineText = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
};

const parseAmountToken = (token: string): number | null => {
  const compact = token.replace(/[\s\u00A0]/g, "");
  if (!compact) {
    return null;
  }

  let normalized = compact;
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  if (lastComma >= 0 || lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized.split(thousandsSeparator).join("");
    if (decimalSeparator === ",") {
      normalized = normalized.replace(",", ".");
    }
  } else {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
    return null;
  }

  return Number(amount.toFixed(2));
};

const detectAmount = (lineTexts: string[]): number | null => {
  const totalCandidates: number[] = [];
  const fallbackCandidates: number[] = [];

  for (const line of lineTexts) {
    const tokens = line.match(AMOUNT_TOKEN_PATTERN) ?? [];
    if (tokens.length === 0) {
      continue;
    }

    const numericTokens = tokens
      .map(parseAmountToken)
      .filter((value): value is number => value !== null);
    if (numericTokens.length === 0) {
      continue;
    }

    if (TOTAL_HINT_PATTERN.test(line)) {
      totalCandidates.push(...numericTokens);
      continue;
    }

    fallbackCandidates.push(...numericTokens);
  }

  const candidatePool = totalCandidates.length > 0 ? totalCandidates : fallbackCandidates;
  if (candidatePool.length === 0) {
    return null;
  }

  return Math.max(...candidatePool);
};

const detectCurrency = (rawText: string, tripCurrency: string): string | null => {
  const source = rawText.toUpperCase();
  if (/[₽]|RUB|РУБ/.test(source)) {
    return "RUB";
  }
  if (/[€]|EUR/.test(source)) {
    return "EUR";
  }
  if (/[£]|GBP/.test(source)) {
    return "GBP";
  }
  if (/[$]|USD/.test(source)) {
    return "USD";
  }
  if (source.includes(tripCurrency.toUpperCase())) {
    return tripCurrency.toUpperCase();
  }

  return null;
};

const detectSpentAt = (rawText: string): string | null => {
  const match = rawText.match(DATE_PATTERN);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) {
    year += 2000;
  }
  const hour = match[4] ? Number(match[4]) : 12;
  const minute = match[5] ? Number(match[5]) : 0;
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const detectMerchant = (lineTexts: string[]): string | null => {
  for (const line of lineTexts) {
    if (line.length < 3 || line.length > 80) {
      continue;
    }
    if (/\d{4,}/.test(line)) {
      continue;
    }
    if (MERCHANT_SKIP_PATTERN.test(line)) {
      continue;
    }
    return line;
  }

  return null;
};

const inferCategory = (rawText: string): string | null => {
  if (FOOD_PATTERN.test(rawText)) {
    return "Food";
  }
  if (TRANSPORT_PATTERN.test(rawText)) {
    return "Transport";
  }
  if (HOTEL_PATTERN.test(rawText)) {
    return "Accommodation";
  }
  if (SHOPPING_PATTERN.test(rawText)) {
    return "Shopping";
  }
  if (TICKETS_PATTERN.test(rawText)) {
    return "Tickets";
  }

  return "General";
};

const buildFieldQuality = (params: {
  sourceAmount: number | null;
  sourceCurrency: string | null;
  spentAt: string | null;
  merchant: string | null;
  description: string | null;
  category: string | null;
  conversionRate: number | null;
  currencyDetectedFromText: boolean;
}): TravelReceiptClientSuggestionPayload["fieldQuality"] => {
  const fieldQuality = createDefaultTravelReceiptOcrFieldQuality();
  if (params.sourceAmount !== null) {
    fieldQuality.sourceAmount = "medium";
  }
  if (params.sourceCurrency !== null) {
    fieldQuality.sourceCurrency = params.currencyDetectedFromText ? "medium" : "low";
  }
  if (params.spentAt !== null) {
    fieldQuality.spentAt = "medium";
  }
  if (params.merchant !== null) {
    fieldQuality.merchant = "medium";
  }
  if (params.description !== null) {
    fieldQuality.description = "medium";
  }
  if (params.category !== null) {
    fieldQuality.category = "low";
  }
  if (params.conversionRate !== null) {
    fieldQuality.conversionRate = "medium";
  }

  return fieldQuality;
};

const hasMeaningfulSuggestion = (
  suggestion: TravelReceiptClientSuggestionPayload,
): boolean => {
  if (suggestion.sourceAmount !== null) {
    return true;
  }

  if (suggestion.spentAt !== null) {
    return true;
  }

  if (suggestion.merchant !== null || suggestion.description !== null) {
    return true;
  }

  return Boolean(suggestion.rawText && suggestion.rawText.trim().length >= 8);
};

const collectTextFromUnknown = (
  value: unknown,
  depth: number,
  output: string[],
): void => {
  if (depth > CLIENT_OCR_TEXT_COLLECT_DEPTH_LIMIT || value === null || value === undefined) {
    return;
  }

  if (typeof value === "string") {
    const normalized = normalizeLineText(value);
    if (normalized) {
      output.push(normalized);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTextFromUnknown(item, depth + 1, output);
    }
    return;
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    if (typeof objectValue.text === "string") {
      collectTextFromUnknown(objectValue.text, depth + 1, output);
    }

    for (const nested of Object.values(objectValue)) {
      collectTextFromUnknown(nested, depth + 1, output);
    }
  }
};

const mapOcrOutputToSuggestion = (params: {
  rawOutput: unknown;
  tripCurrency: string;
}): TravelReceiptClientSuggestionPayload => {
  const lineTexts: string[] = [];
  collectTextFromUnknown(params.rawOutput, 0, lineTexts);
  const uniqueLines = [...new Set(lineTexts)];
  const rawText = normalizeLineText(uniqueLines.join("\n"));

  const sourceAmount = detectAmount(uniqueLines);
  const detectedCurrency = detectCurrency(rawText, params.tripCurrency);
  const sourceCurrency = detectedCurrency ?? params.tripCurrency.toUpperCase();
  const spentAt = detectSpentAt(rawText);
  const merchant = detectMerchant(uniqueLines);
  const description = merchant;
  const category = inferCategory(rawText.toLowerCase());
  const conversionRate = null;

  const normalized = normalizeTravelReceiptOcrSuggestion({
    sourceAmount,
    sourceCurrency,
    spentAt,
    merchant,
    description,
    category,
    conversionRate,
    rawText,
    fieldQuality: buildFieldQuality({
      sourceAmount,
      sourceCurrency,
      spentAt,
      merchant,
      description,
      category,
      conversionRate,
      currencyDetectedFromText: detectedCurrency !== null,
    }),
  });

  return {
    source: "client_paddle_ocr",
    sourceAmount: normalized.sourceAmount,
    sourceCurrency: normalized.sourceCurrency,
    spentAt: normalized.spentAt,
    merchant: normalized.merchant,
    description: normalized.description,
    category: normalized.category,
    conversionRate: normalized.conversionRate,
    rawText: normalized.rawText,
    fieldQuality: normalized.fieldQuality,
  };
};

export const runClientTravelReceiptOcr = async (params: {
  imageDataUrl: string;
  tripCurrency: string;
  timeoutMs?: number;
}): Promise<TravelClientReceiptOcrResult> => {
  if (!isBrowserRuntime()) {
    return toFailure(
      "UNAVAILABLE",
      "On-device OCR is not available in this runtime.",
    );
  }

  const timeoutMs = clampTimeout(params.timeoutMs);
  const startedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  try {
    const runtime = await runWithTimeout(
      getBrowserOcrRuntime(timeoutMs),
      timeoutMs,
      "On-device OCR model loading timed out.",
    );

    const sourceImage = await runWithTimeout(
      loadImageFromDataUrl(params.imageDataUrl),
      timeoutMs,
      "On-device OCR image decoding timed out.",
    );
    const scaledCanvas = buildScaledCanvas(sourceImage, CLIENT_OCR_MAX_SIDE_PX);
    const processedCanvas = buildEnhancedCanvas(scaledCanvas);
    const processedDataUrl = processedCanvas.toDataURL("image/png");

    const rawOutput = await runWithTimeout(
      runtime.ocr(processedDataUrl),
      timeoutMs,
      "On-device OCR processing timed out.",
    );

    const suggestion = mapOcrOutputToSuggestion({
      rawOutput,
      tripCurrency: params.tripCurrency,
    });
    if (!hasMeaningfulSuggestion(suggestion)) {
      return toFailure(
        "NO_TEXT_DETECTED",
        "On-device OCR found too little readable text. Replace photo or fill fields manually.",
      );
    }

    const finishedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const rawTextLength = suggestion.rawText?.length ?? 0;
    const lineCount =
      suggestion.rawText
        ?.split(/\r?\n/)
        .map((line) => normalizeLineText(line))
        .filter((line) => line.length > 0).length ?? 0;
    return {
      ok: true,
      suggestion,
      meta: {
        durationMs: Math.max(0, Math.round(finishedAt - startedAt)),
        lineCount,
        textLength: rawTextLength,
      },
    };
  } catch (error) {
    if (error instanceof ClientOcrTimeoutError) {
      return toFailure(
        "TIMEOUT",
        "On-device OCR is taking too long on this device. Try again or continue manually.",
      );
    }

    if (error instanceof Error) {
      const normalizedMessage = error.message.toLowerCase();
      if (
        normalizedMessage.includes("initialize") ||
        normalizedMessage.includes("model") ||
        normalizedMessage.includes("onnx") ||
        normalizedMessage.includes("opencv")
      ) {
        return toFailure(
          "MODEL_LOADING_FAILED",
          "On-device OCR model failed to load on this device. Keep draft and try again later.",
        );
      }
    }

    return toFailure(
      "PROCESSING_FAILED",
      "On-device OCR failed to process this receipt image. Try a clearer photo.",
    );
  }
};
