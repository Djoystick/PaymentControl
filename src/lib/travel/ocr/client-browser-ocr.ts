import { normalizeTravelReceiptOcrSuggestion } from "@/lib/travel/receipt-ocr-normalization";
import {
  buildReceiptFieldQualityFromExtraction,
  collectReceiptTextLinesFromUnknown,
  extractReceiptInsights,
  parseReceiptQrPayload,
  type TravelReceiptQrPayload,
} from "@/lib/travel/ocr/receipt-heuristics";
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

type BarcodeDetectionResult = {
  rawValue?: string;
};

type BarcodeDetectorShape = {
  detect: (
    source: CanvasImageSource,
  ) => Promise<BarcodeDetectionResult[]>;
};

type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorShape;

const CLIENT_OCR_DEFAULT_TIMEOUT_MS = 30000;
const CLIENT_OCR_MIN_TIMEOUT_MS = 5000;
const CLIENT_OCR_MAX_TIMEOUT_MS = 120000;
const CLIENT_OCR_MAX_SIDE_PX = 1800;
const CLIENT_OCR_BINARIZE_THRESHOLD = 162;
const CLIENT_OCR_QR_TIMEOUT_MS = 1200;
const CLIENT_OCR_RECEIPT_LANDSCAPE_RATIO = 1.26;

const ORT_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.min.js";
const OPENCV_SCRIPT_URL = "https://docs.opencv.org/4.8.0/opencv.js";
const ESEARCH_OCR_MODULE_URL = "https://cdn.jsdelivr.net/npm/esearch-ocr@5.1.5/dist/esearch-ocr.js";

const MODEL_BASE_URL = "https://cdn.jsdelivr.net/npm/paddleocr-browser@1.0.3/dist";
const DETECTION_MODEL_URL = `${MODEL_BASE_URL}/ppocr_det.onnx`;
const RECOGNITION_MODEL_URL = `${MODEL_BASE_URL}/ppocr_rec.onnx`;
const DICTIONARY_URL = `${MODEL_BASE_URL}/ppocr_keys_v1.txt`;

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

const normalizeLineText = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
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
  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-ocr-id='${params.id}']`,
  );
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

const createBrowserOcrRuntime = async (
  timeoutMs: number,
): Promise<BrowserOcrRuntime> => {
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

const getBrowserOcrRuntime = async (
  timeoutMs: number,
): Promise<BrowserOcrRuntime> => {
  if (!runtimePromise) {
    runtimePromise = createBrowserOcrRuntime(timeoutMs).catch((error) => {
      runtimePromise = null;
      throw error;
    });
  }

  return runtimePromise;
};

const loadImageFromDataUrl = async (
  imageDataUrl: string,
): Promise<HTMLImageElement> => {
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

const rotateCanvasToPortrait = (
  sourceCanvas: HTMLCanvasElement,
): HTMLCanvasElement => {
  if (
    sourceCanvas.width <= sourceCanvas.height * CLIENT_OCR_RECEIPT_LANDSCAPE_RATIO
  ) {
    return sourceCanvas;
  }

  const rotated = document.createElement("canvas");
  rotated.width = sourceCanvas.height;
  rotated.height = sourceCanvas.width;
  const context = rotated.getContext("2d");
  if (!context) {
    return sourceCanvas;
  }

  context.translate(rotated.width / 2, rotated.height / 2);
  context.rotate(Math.PI / 2);
  context.drawImage(
    sourceCanvas,
    -sourceCanvas.width / 2,
    -sourceCanvas.height / 2,
  );
  return rotated;
};

const buildEnhancedCanvas = (
  sourceCanvas: HTMLCanvasElement,
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable for OCR preprocessing.");
  }

  context.filter = "grayscale(100%) contrast(158%) brightness(110%)";
  context.drawImage(sourceCanvas, 0, 0);
  context.filter = "none";

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    const luminance =
      0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    const value = luminance >= CLIENT_OCR_BINARIZE_THRESHOLD ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
};

const cropCanvasToReceiptContent = (
  sourceCanvas: HTMLCanvasElement,
): HTMLCanvasElement => {
  const context = sourceCanvas.getContext("2d");
  if (!context) {
    return sourceCanvas;
  }

  const imageData = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const { data, width, height } = imageData;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const luminance =
        0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
      if (luminance < 245) {
        if (x < minX) {
          minX = x;
        }
        if (y < minY) {
          minY = y;
        }
        if (x > maxX) {
          maxX = x;
        }
        if (y > maxY) {
          maxY = y;
        }
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    return sourceCanvas;
  }

  const padding = 18;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const cropWidth = Math.max(1, maxX - minX + 1);
  const cropHeight = Math.max(1, maxY - minY + 1);
  const areaRatio = (cropWidth * cropHeight) / (width * height);
  if (areaRatio > 0.98 || areaRatio < 0.08) {
    return sourceCanvas;
  }

  const cropped = document.createElement("canvas");
  cropped.width = cropWidth;
  cropped.height = cropHeight;
  const croppedContext = cropped.getContext("2d");
  if (!croppedContext) {
    return sourceCanvas;
  }

  croppedContext.drawImage(
    sourceCanvas,
    minX,
    minY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );
  return cropped;
};

const getBarcodeDetectorCtor = (): BarcodeDetectorCtor | null => {
  const detectorCtor = (globalThis as {
    BarcodeDetector?: BarcodeDetectorCtor;
  }).BarcodeDetector;
  if (!detectorCtor) {
    return null;
  }
  return detectorCtor;
};

const tryDecodeQrFromCanvas = async (
  sourceCanvas: HTMLCanvasElement,
  timeoutMs: number,
): Promise<TravelReceiptQrPayload | null> => {
  const detectorCtor = getBarcodeDetectorCtor();
  if (!detectorCtor) {
    return null;
  }

  try {
    const detector = new detectorCtor({ formats: ["qr_code"] });
    const detections = await runWithTimeout(
      detector.detect(sourceCanvas),
      timeoutMs,
      "QR detection timed out.",
    );
    for (const detection of detections) {
      const parsed = parseReceiptQrPayload(detection.rawValue ?? "");
      if (parsed) {
        return parsed;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const tryDecodeReceiptQrPayload = async (params: {
  sourceCanvas: HTMLCanvasElement;
  processedCanvas: HTMLCanvasElement;
}): Promise<TravelReceiptQrPayload | null> => {
  const fromSource = await tryDecodeQrFromCanvas(
    params.sourceCanvas,
    CLIENT_OCR_QR_TIMEOUT_MS,
  );
  if (fromSource) {
    return fromSource;
  }

  return tryDecodeQrFromCanvas(params.processedCanvas, CLIENT_OCR_QR_TIMEOUT_MS);
};

const buildQrReadableText = (payload: TravelReceiptQrPayload): string => {
  const lines: string[] = ["QR metadata"];
  if (payload.sourceAmount !== null) {
    lines.push(`Total: ${payload.sourceAmount.toFixed(2)}`);
  }
  if (payload.sourceCurrency) {
    lines.push(`Currency: ${payload.sourceCurrency}`);
  }
  if (payload.spentAt) {
    lines.push(`Date: ${payload.spentAt}`);
  }
  if (payload.fiscalNumber) {
    lines.push(`FN: ${payload.fiscalNumber}`);
  }
  if (payload.fiscalDocumentNumber) {
    lines.push(`FD: ${payload.fiscalDocumentNumber}`);
  }
  if (payload.fiscalSign) {
    lines.push(`FP: ${payload.fiscalSign}`);
  }
  return lines.join("\n");
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

const mapOcrOutputToSuggestion = (params: {
  rawOutput: unknown;
  tripCurrency: string;
  qrPayload?: TravelReceiptQrPayload | null;
}): TravelReceiptClientSuggestionPayload => {
  const lineTexts = collectReceiptTextLinesFromUnknown(params.rawOutput);
  const ocrRawText = lineTexts.join("\n");
  const extraction = extractReceiptInsights({
    rawText: ocrRawText,
    tripCurrency: params.tripCurrency,
    qrPayload: params.qrPayload ?? null,
  });

  const rawText =
    extraction.rawText ??
    (params.qrPayload ? buildQrReadableText(params.qrPayload) : null);

  const normalized = normalizeTravelReceiptOcrSuggestion({
    sourceAmount: extraction.sourceAmount,
    sourceCurrency:
      extraction.sourceCurrency ?? params.tripCurrency.toUpperCase(),
    spentAt: extraction.spentAt,
    merchant: extraction.merchant,
    description: extraction.description,
    category: extraction.category,
    conversionRate: null,
    rawText,
    fieldQuality: buildReceiptFieldQualityFromExtraction(extraction),
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

const countReadableLines = (value: string | null): number => {
  if (!value) {
    return 0;
  }
  return value
    .split(/\r?\n/)
    .map(normalizeLineText)
    .filter((line) => line.length > 0).length;
};

export const runClientTravelReceiptOcr = async (params: {
  imageDataUrl: string;
  tripCurrency: string;
  timeoutMs?: number;
}): Promise<TravelClientReceiptOcrResult> => {
  if (!isBrowserRuntime()) {
    return toFailure("UNAVAILABLE", "On-device OCR is not available in this runtime.");
  }

  const timeoutMs = clampTimeout(params.timeoutMs);
  const startedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  try {
    const sourceImage = await runWithTimeout(
      loadImageFromDataUrl(params.imageDataUrl),
      timeoutMs,
      "On-device OCR image decoding timed out.",
    );

    const scaledCanvas = buildScaledCanvas(sourceImage, CLIENT_OCR_MAX_SIDE_PX);
    const orientedCanvas = rotateCanvasToPortrait(scaledCanvas);
    const enhancedCanvas = buildEnhancedCanvas(orientedCanvas);
    const processedCanvas = cropCanvasToReceiptContent(enhancedCanvas);
    const qrPayload = await tryDecodeReceiptQrPayload({
      sourceCanvas: orientedCanvas,
      processedCanvas,
    });

    if (
      qrPayload &&
      qrPayload.sourceAmount !== null &&
      qrPayload.spentAt !== null
    ) {
      const suggestion = mapOcrOutputToSuggestion({
        rawOutput: null,
        tripCurrency: params.tripCurrency,
        qrPayload,
      });
      const finishedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      return {
        ok: true,
        suggestion,
        meta: {
          durationMs: Math.max(0, Math.round(finishedAt - startedAt)),
          lineCount: countReadableLines(suggestion.rawText),
          textLength: suggestion.rawText?.length ?? 0,
        },
      };
    }

    const processedDataUrl = processedCanvas.toDataURL("image/png");
    const runtime = await runWithTimeout(
      getBrowserOcrRuntime(timeoutMs),
      timeoutMs,
      "On-device OCR model loading timed out.",
    );

    let rawOutput: unknown;
    try {
      rawOutput = await runWithTimeout(
        runtime.ocr(processedDataUrl),
        timeoutMs,
        "On-device OCR processing timed out.",
      );
    } catch (error) {
      if (qrPayload && (qrPayload.sourceAmount !== null || qrPayload.spentAt !== null)) {
        rawOutput = null;
      } else {
        throw error;
      }
    }

    const suggestion = mapOcrOutputToSuggestion({
      rawOutput,
      tripCurrency: params.tripCurrency,
      qrPayload,
    });
    if (!hasMeaningfulSuggestion(suggestion)) {
      return toFailure(
        "NO_TEXT_DETECTED",
        "On-device OCR found too little readable text. Replace photo or fill fields manually.",
      );
    }

    const finishedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    return {
      ok: true,
      suggestion,
      meta: {
        durationMs: Math.max(0, Math.round(finishedAt - startedAt)),
        lineCount: countReadableLines(suggestion.rawText),
        textLength: suggestion.rawText?.length ?? 0,
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
