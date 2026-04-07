import {
  createDefaultTravelReceiptOcrFieldQuality,
} from "../receipt-ocr-normalization.ts";
import type { TravelReceiptOcrFieldQualityMap } from "../types.ts";

export type TravelReceiptQrPayload = {
  rawValue: string;
  sourceAmount: number | null;
  sourceCurrency: string | null;
  spentAt: string | null;
  fiscalNumber: string | null;
  fiscalDocumentNumber: string | null;
  fiscalSign: string | null;
};

type ReceiptZone = "header" | "items" | "totals" | "footer";

type AmountSource = "qr" | "marker" | "totals_zone" | "fallback" | "none";
type CurrencySource = "qr" | "text" | "trip_default" | "none";
type DateSource = "qr" | "marked_line" | "pattern" | "none";
type MerchantSource = "header" | "fallback" | "none";
type DescriptionSource = "items" | "merchant" | "none";

export type ReceiptExtractionResult = {
  sourceAmount: number | null;
  sourceAmountSource: AmountSource;
  sourceCurrency: string | null;
  sourceCurrencySource: CurrencySource;
  spentAt: string | null;
  spentAtSource: DateSource;
  merchant: string | null;
  merchantSource: MerchantSource;
  description: string | null;
  descriptionSource: DescriptionSource;
  category: string | null;
  rawText: string | null;
};

type ReceiptAmountCandidate = {
  value: number;
  lineIndex: number;
  score: number;
  zone: ReceiptZone;
  line: string;
};

const AMOUNT_MAX = 10_000_000;
const READABLE_TEXT_MAX_CHARS = 2800;
const MAX_LINES = 180;

const TOTAL_MARKER_PATTERN =
  /(?:\u0438\u0442\u043e\u0433(?:\u043e)?|\u043a\s*\u043e\u043f\u043b\u0430\u0442\u0435|\u0432\u0441\u0435\u0433\u043e|\u043e\u043f\u043b\u0430\u0442\u0430|\u0431\u0435\u0437\u043d\u0430\u043b\u0438\u0447|\u043a\u0430\u0440\u0442\u043e\u0439|total|amount\s*due|grand\s*total|to\s*pay|payable|subtotal)/i;
const STRONG_TOTAL_MARKER_PATTERN =
  /(?:\u0438\u0442\u043e\u0433(?:\u043e)?|\u043a\s*\u043e\u043f\u043b\u0430\u0442\u0435|grand\s*total|amount\s*due|to\s*pay)/i;
const PAYMENT_MARKER_PATTERN =
  /(?:\u0431\u0435\u0437\u043d\u0430\u043b\u0438\u0447|\u043a\u0430\u0440\u0442\u043e\u0439|card|visa|mastercard|payment)/i;
const NON_TOTAL_MARKER_PATTERN =
  /(?:\u0441\u043a\u0438\u0434|\u0431\u043e\u043d\u0443\u0441|discount|cashback|change|round|vat|\u043d\u0434\u0441|\u043d\u0430\u043b\u043e\u0433|\u0441\u0434\u0430\u0447)/i;
const ITEM_LIKE_MARKER_PATTERN =
  /(?:\bqty\b|\u043a\u043e\u043b-?\u0432\u043e|\d+\s*[x\u0445]\s*\d+|[x\u0445]\s*\d+|\d+[.,]\d{2}\s*[x\u0445])/i;

const DATE_MARKER_PATTERN =
  /(?:\u0434\u0430\u0442\u0430|\u0432\u0440\u0435\u043c\u044f|date|time|issued|receipt)/i;
const NON_SPENT_DATE_PATTERN =
  /(?:expiry|valid\s*to|\u0433\u043e\u0434\u0435\u043d|\u0441\u0440\u043e\u043a)/i;

const MERCHANT_SKIP_PATTERN =
  /(?:\u0438\u043d\u043d|\u043a\u043f\u043f|\u0444\u043d|\u0444\u0434|\u0444\u043f|\u043a\u0430\u0441\u0441\u0438\u0440|\u0441\u043c\u0435\u043d\u0430|qr|receipt|www\.|http|email|phone|tel|\u0430\u0434\u0440\u0435\u0441|\u0441\u0430\u0439\u0442|terminal|term|bank|payment)/i;
const MERCHANT_LEGAL_ENTITY_PATTERN =
  /(?:\u043e\u043e\u043e|\u0438\u043f|\u0430\u043e|\u043f\u0430\u043e|\u0437\u0430\u043e|llc|ltd|inc)/i;

const FOOD_PATTERN =
  /(?:\u0435\u0434\u0430|food|cafe|caf\u00e9|restaurant|\u0440\u0435\u0441\u0442|\u043a\u043e\u0444\u0435|coffee|bar|\u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430)/i;
const TRANSPORT_PATTERN =
  /(?:\u0442\u0430\u043a\u0441\u0438|taxi|uber|metro|\u043f\u043e\u0435\u0437\u0434|train|bus|\u0430\u0432\u0442\u043e\u0431\u0443\u0441|transport|fuel|\u0431\u0435\u043d\u0437\u0438\u043d)/i;
const HOTEL_PATTERN =
  /(?:hotel|hostel|booking|\u043e\u0442\u0435\u043b\u044c|\u0433\u043e\u0441\u0442\u0438\u043d\u0438\u0446|apartment|bnb|airbnb)/i;
const SHOPPING_PATTERN =
  /(?:shop|store|market|\u043c\u0430\u0433\u0430\u0437\u0438\u043d|\u0441\u0443\u043f\u0435\u0440\u043c\u0430\u0440\u043a\u0435\u0442|mall|shopping)/i;
const TICKETS_PATTERN =
  /(?:ticket|\u0431\u0438\u043b\u0435\u0442|flight|\u0430\u0432\u0438\u0430|rail)/i;

const AMOUNT_TOKEN_PATTERN =
  /\d{1,3}(?:[ \u00a0.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})/g;
const DATE_PATTERN_DAY_FIRST =
  /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/g;
const DATE_PATTERN_ISO =
  /(20\d{2})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/g;

const normalizeReceiptLine = (value: string): string => {
  return value
    .replace(/[\u0000-\u001f]+/g, " ")
    .replace(/[\u00a0\t]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
};

const hasLetters = (value: string): boolean => {
  return /[A-Za-z\u0400-\u04ff]/.test(value);
};

export const collectReceiptTextLinesFromUnknown = (
  value: unknown,
  depthLimit = 4,
): string[] => {
  const output: string[] = [];
  const walk = (current: unknown, depth: number): void => {
    if (depth > depthLimit || current === null || current === undefined) {
      return;
    }

    if (typeof current === "string") {
      const normalized = normalizeReceiptLine(current);
      if (normalized) {
        output.push(normalized);
      }
      return;
    }

    if (Array.isArray(current)) {
      for (const entry of current) {
        walk(entry, depth + 1);
      }
      return;
    }

    if (typeof current === "object") {
      const objectValue = current as Record<string, unknown>;
      if (typeof objectValue.text === "string") {
        walk(objectValue.text, depth + 1);
      }

      for (const nested of Object.values(objectValue)) {
        walk(nested, depth + 1);
      }
    }
  };

  walk(value, 0);

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const line of output) {
    if (seen.has(line)) {
      continue;
    }
    seen.add(line);
    deduped.push(line);
  }

  return deduped.slice(0, MAX_LINES);
};

const toReceiptLines = (rawText: string): string[] => {
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeReceiptLine)
    .filter((line) => line.length > 0);

  const deduped: string[] = [];
  for (const line of lines) {
    if (deduped[deduped.length - 1] === line) {
      continue;
    }
    deduped.push(line);
    if (deduped.length >= MAX_LINES) {
      break;
    }
  }

  return deduped;
};

const getLineZone = (lineIndex: number, lineCount: number): ReceiptZone => {
  if (lineCount <= 0) {
    return "items";
  }

  const headerEnd = Math.max(2, Math.floor(lineCount * 0.26));
  const totalsStart = Math.max(headerEnd, Math.floor(lineCount * 0.62));
  const footerStart = Math.max(totalsStart, Math.floor(lineCount * 0.84));

  if (lineIndex < headerEnd) {
    return "header";
  }
  if (lineIndex >= footerStart) {
    return "footer";
  }
  if (lineIndex >= totalsStart) {
    return "totals";
  }
  return "items";
};

const parseReceiptAmountToken = (
  token: string,
  options?: { allowInteger?: boolean },
): number | null => {
  const compact = token.replace(/[\s\u00a0]/g, "");
  if (!compact) {
    return null;
  }

  const hasSeparator = compact.includes(",") || compact.includes(".");
  if (!hasSeparator) {
    if (!options?.allowInteger || compact.length > 6) {
      return null;
    }
    const integerAmount = Number(compact);
    if (!Number.isFinite(integerAmount) || integerAmount <= 0 || integerAmount > AMOUNT_MAX) {
      return null;
    }
    return Number(integerAmount.toFixed(2));
  }

  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  const decimalDigits = compact.length - decimalIndex - 1;

  let normalized = compact;
  if (decimalDigits >= 1 && decimalDigits <= 2) {
    const integerPart = normalized
      .slice(0, decimalIndex)
      .replace(/[.,]/g, "");
    const fractionPart = normalized
      .slice(decimalIndex + 1)
      .replace(/[.,]/g, "");
    normalized = `${integerPart}.${fractionPart}`;
  } else {
    normalized = normalized.replace(/[.,]/g, "");
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || amount > AMOUNT_MAX) {
    return null;
  }

  return Number(amount.toFixed(2));
};

const collectLineAmounts = (line: string): number[] => {
  const tokens = line.match(AMOUNT_TOKEN_PATTERN) ?? [];
  const values: number[] = [];
  for (const token of tokens) {
    const parsed = parseReceiptAmountToken(token, { allowInteger: false });
    if (parsed !== null) {
      values.push(parsed);
      continue;
    }
    const integerFallback = parseReceiptAmountToken(token, { allowInteger: true });
    if (integerFallback !== null && (TOTAL_MARKER_PATTERN.test(line) || PAYMENT_MARKER_PATTERN.test(line))) {
      values.push(integerFallback);
    }
  }
  return values;
};

const rankAmountCandidates = (lines: string[]): ReceiptAmountCandidate[] => {
  const candidates: ReceiptAmountCandidate[] = [];
  if (lines.length === 0) {
    return candidates;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const amounts = collectLineAmounts(line);
    if (amounts.length === 0) {
      continue;
    }

    const lower = line.toLowerCase();
    const zone = getLineZone(index, lines.length);
    const hasTotalMarker = TOTAL_MARKER_PATTERN.test(lower);
    const hasStrongTotalMarker = STRONG_TOTAL_MARKER_PATTERN.test(lower);
    const hasPaymentMarker = PAYMENT_MARKER_PATTERN.test(lower);
    const hasNonTotalMarker = NON_TOTAL_MARKER_PATTERN.test(lower);
    const looksLikeItem = ITEM_LIKE_MARKER_PATTERN.test(lower);
    const nearMarkedLine =
      (index > 0 && TOTAL_MARKER_PATTERN.test(lines[index - 1].toLowerCase())) ||
      (index + 1 < lines.length && TOTAL_MARKER_PATTERN.test(lines[index + 1].toLowerCase()));

    for (const value of amounts) {
      let score = 0;
      if (hasStrongTotalMarker) {
        score += 240;
      } else if (hasTotalMarker) {
        score += 170;
      }
      if (hasPaymentMarker) {
        score += 85;
      }
      if (nearMarkedLine) {
        score += 70;
      }
      if (zone === "totals") {
        score += 95;
      } else if (zone === "footer") {
        score += 70;
      } else if (zone === "items") {
        score += 12;
      } else {
        score -= 45;
      }
      if (hasNonTotalMarker) {
        score -= 120;
      }
      if (looksLikeItem && !hasTotalMarker && !hasStrongTotalMarker) {
        score -= 95;
      }
      if (value < 1) {
        score -= 120;
      } else if (value < 10 && !hasTotalMarker && !hasStrongTotalMarker) {
        score -= 30;
      } else if (value >= 100) {
        score += 8;
      }

      // Slightly prefer lower lines as totals usually sit near the bottom.
      const linePositionBonus = lines.length <= 1 ? 0 : (index / (lines.length - 1)) * 30;
      score += linePositionBonus;

      candidates.push({
        value,
        lineIndex: index,
        score,
        zone,
        line,
      });
    }
  }

  return candidates.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    if (right.lineIndex !== left.lineIndex) {
      return right.lineIndex - left.lineIndex;
    }
    return right.value - left.value;
  });
};

const detectCurrencyFromText = (
  lines: string[],
  tripCurrency: string,
): { currency: string | null; source: CurrencySource } => {
  for (const line of lines) {
    if (/[\u20bd]|RUB|\u0420\u0423\u0411/i.test(line)) {
      return { currency: "RUB", source: "text" };
    }
    if (/[\u20ac]|EUR/i.test(line)) {
      return { currency: "EUR", source: "text" };
    }
    if (/[\u00a3]|GBP/i.test(line)) {
      return { currency: "GBP", source: "text" };
    }
    if (/[$]|USD/i.test(line)) {
      return { currency: "USD", source: "text" };
    }
  }

  const currencyMatch = lines
    .join(" ")
    .toUpperCase()
    .match(/\b[A-Z]{3}\b/g);
  if (currencyMatch) {
    const preferred = currencyMatch.find((entry) =>
      ["RUB", "EUR", "USD", "GBP", "JPY", "CNY", "KZT", "AED", "TRY"].includes(entry),
    );
    if (preferred) {
      return { currency: preferred, source: "text" };
    }
  }

  if (tripCurrency.trim()) {
    return { currency: tripCurrency.trim().toUpperCase(), source: "trip_default" };
  }

  return { currency: null, source: "none" };
};

const buildDateFromParts = (params: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}): string | null => {
  const parsed = new Date(
    Date.UTC(params.year, params.month - 1, params.day, params.hour, params.minute, params.second),
  );
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  if (
    parsed.getUTCFullYear() !== params.year ||
    parsed.getUTCMonth() !== params.month - 1 ||
    parsed.getUTCDate() !== params.day
  ) {
    return null;
  }
  return parsed.toISOString();
};

const detectSpentAtFromText = (
  lines: string[],
): { spentAt: string | null; source: DateSource } => {
  const now = new Date();
  const maxYear = now.getUTCFullYear() + 1;
  const candidates: Array<{ value: string; score: number }> = [];

  const pushCandidate = (
    value: string | null,
    line: string,
    lineIndex: number,
    baseScore: number,
  ): void => {
    if (!value) {
      return;
    }
    const zone = getLineZone(lineIndex, lines.length);
    const lower = line.toLowerCase();
    let score = baseScore;
    if (DATE_MARKER_PATTERN.test(lower)) {
      score += 80;
    }
    if (NON_SPENT_DATE_PATTERN.test(lower)) {
      score -= 140;
    }
    if (zone === "header" || zone === "footer") {
      score += 30;
    }
    if (/\d{1,2}:\d{2}/.test(line)) {
      score += 15;
    }
    candidates.push({ value, score });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    DATE_PATTERN_DAY_FIRST.lastIndex = 0;
    for (const match of line.matchAll(DATE_PATTERN_DAY_FIRST)) {
      let year = Number(match[3]);
      if (year < 100) {
        year += 2000;
      }
      if (year < 2000 || year > maxYear) {
        continue;
      }
      const day = Number(match[1]);
      const month = Number(match[2]);
      const hour = match[4] ? Number(match[4]) : 12;
      const minute = match[5] ? Number(match[5]) : 0;
      const second = match[6] ? Number(match[6]) : 0;
      const built = buildDateFromParts({ year, month, day, hour, minute, second });
      pushCandidate(built, line, index, 80);
    }

    DATE_PATTERN_ISO.lastIndex = 0;
    for (const match of line.matchAll(DATE_PATTERN_ISO)) {
      const year = Number(match[1]);
      if (year < 2000 || year > maxYear) {
        continue;
      }
      const month = Number(match[2]);
      const day = Number(match[3]);
      const hour = match[4] ? Number(match[4]) : 12;
      const minute = match[5] ? Number(match[5]) : 0;
      const second = match[6] ? Number(match[6]) : 0;
      const built = buildDateFromParts({ year, month, day, hour, minute, second });
      pushCandidate(built, line, index, 75);
    }
  }

  if (candidates.length === 0) {
    return { spentAt: null, source: "none" };
  }

  candidates.sort((left, right) => right.score - left.score);
  const top = candidates[0];
  return {
    spentAt: top.value,
    source: top.score >= 150 ? "marked_line" : "pattern",
  };
};

const detectMerchant = (
  lines: string[],
): { merchant: string | null; source: MerchantSource } => {
  if (lines.length === 0) {
    return { merchant: null, source: "none" };
  }

  const candidates: Array<{ value: string; score: number; source: MerchantSource }> = [];
  const upperBound = Math.min(lines.length, Math.max(8, Math.floor(lines.length * 0.34)));
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.length < 3 || line.length > 100) {
      continue;
    }
    const digits = (line.match(/\d/g) ?? []).length;
    if (digits >= Math.ceil(line.length * 0.4)) {
      continue;
    }
    if (!hasLetters(line)) {
      continue;
    }
    if (MERCHANT_SKIP_PATTERN.test(line)) {
      continue;
    }

    const inHeader = index < upperBound;
    let score = inHeader ? 120 : 45;
    if (MERCHANT_LEGAL_ENTITY_PATTERN.test(line)) {
      score += 25;
    }
    if (/^[A-Z\u0410-\u042f0-9 .,'"-]{3,}$/.test(line)) {
      score += 10;
    }
    if (line.length > 70) {
      score -= 20;
    }

    candidates.push({
      value: line.slice(0, 120),
      score,
      source: inHeader ? "header" : "fallback",
    });
  }

  if (candidates.length === 0) {
    return { merchant: null, source: "none" };
  }

  candidates.sort((left, right) => right.score - left.score);
  return {
    merchant: candidates[0].value,
    source: candidates[0].source,
  };
};

const detectDescription = (
  lines: string[],
  merchant: string | null,
): { description: string | null; source: DescriptionSource } => {
  if (lines.length > 0) {
    const headerEnd = Math.max(2, Math.floor(lines.length * 0.26));
    const totalsStart = Math.max(headerEnd, Math.floor(lines.length * 0.62));
    for (let index = headerEnd; index < totalsStart; index += 1) {
      const line = lines[index];
      if (line.length < 3 || line.length > 120) {
        continue;
      }
      if (!hasLetters(line)) {
        continue;
      }
      if (TOTAL_MARKER_PATTERN.test(line) || MERCHANT_SKIP_PATTERN.test(line)) {
        continue;
      }
      return { description: line.slice(0, 160), source: "items" };
    }
  }

  if (merchant) {
    return { description: merchant.slice(0, 160), source: "merchant" };
  }

  return { description: null, source: "none" };
};

const inferCategory = (rawText: string): string | null => {
  if (!rawText) {
    return null;
  }
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

const buildReadableReceiptText = (lines: string[], highlightedTotalLine?: number): string | null => {
  if (lines.length === 0) {
    return null;
  }

  const headerEnd = Math.max(2, Math.floor(lines.length * 0.26));
  const totalsStart = Math.max(headerEnd, Math.floor(lines.length * 0.62));
  const footerStart = Math.max(totalsStart, Math.floor(lines.length * 0.84));

  const header = lines.slice(0, headerEnd).slice(0, 6);
  const items = lines
    .slice(headerEnd, totalsStart)
    .filter((line) => !MERCHANT_SKIP_PATTERN.test(line))
    .slice(0, 12);
  const totals = lines
    .slice(totalsStart)
    .filter((line) => TOTAL_MARKER_PATTERN.test(line) || AMOUNT_TOKEN_PATTERN.test(line))
    .slice(0, 10);
  const footer = lines.slice(footerStart).slice(0, 4);

  const blocks: string[][] = [];
  if (header.length > 0) {
    blocks.push(header);
  }
  if (items.length > 0) {
    blocks.push(items);
  }
  if (totals.length > 0) {
    blocks.push(totals);
  }
  if (footer.length > 0) {
    blocks.push(footer);
  }

  if (highlightedTotalLine !== undefined && highlightedTotalLine >= 0 && highlightedTotalLine < lines.length) {
    const totalLine = lines[highlightedTotalLine];
    const alreadyIncluded = blocks.some((block) => block.includes(totalLine));
    if (!alreadyIncluded) {
      blocks.push([totalLine]);
    }
  }

  const joined = blocks
    .filter((block) => block.length > 0)
    .map((block) => block.join("\n"))
    .join("\n\n")
    .trim();

  if (!joined) {
    return lines.slice(0, 30).join("\n");
  }

  if (joined.length <= READABLE_TEXT_MAX_CHARS) {
    return joined;
  }

  return joined.slice(0, READABLE_TEXT_MAX_CHARS).trim();
};

const parseQrDate = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const compactMatch = normalized.match(
    /^(\d{4})(\d{2})(\d{2})[T ]?(\d{2})?(\d{2})?(\d{2})?$/,
  );
  if (compactMatch) {
    const year = Number(compactMatch[1]);
    const month = Number(compactMatch[2]);
    const day = Number(compactMatch[3]);
    const hour = compactMatch[4] ? Number(compactMatch[4]) : 12;
    const minute = compactMatch[5] ? Number(compactMatch[5]) : 0;
    const second = compactMatch[6] ? Number(compactMatch[6]) : 0;
    return buildDateFromParts({ year, month, day, hour, minute, second });
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};

const toQrParamsMap = (rawValue: string): Map<string, string> => {
  const value = rawValue.trim();
  if (!value) {
    return new Map();
  }

  const toMap = (params: URLSearchParams): Map<string, string> => {
    const result = new Map<string, string>();
    for (const [key, entry] of params.entries()) {
      if (!key.trim()) {
        continue;
      }
      result.set(key.trim().toLowerCase(), entry.trim());
    }
    return result;
  };

  try {
    const asUrl = new URL(value);
    return toMap(asUrl.searchParams);
  } catch {
    const rawQuery = value.startsWith("?") ? value.slice(1) : value;
    return toMap(new URLSearchParams(rawQuery));
  }
};

export const parseReceiptQrPayload = (rawValue: string): TravelReceiptQrPayload | null => {
  const normalizedRaw = rawValue.trim();
  if (!normalizedRaw) {
    return null;
  }

  const params = toQrParamsMap(normalizedRaw);
  if (params.size === 0) {
    return null;
  }

  const amount = parseReceiptAmountToken(
    params.get("s") ?? params.get("sum") ?? params.get("total") ?? "",
    { allowInteger: true },
  );
  const spentAt = parseQrDate(params.get("t") ?? params.get("date") ?? null);
  const currency = (params.get("currency") ?? params.get("curr") ?? "").trim().toUpperCase();
  const sourceCurrency = /^[A-Z]{3}$/.test(currency) ? currency : null;

  const fiscalNumber = (params.get("fn") ?? "").trim() || null;
  const fiscalDocumentNumber = (params.get("i") ?? params.get("fd") ?? "").trim() || null;
  const fiscalSign = (params.get("fp") ?? "").trim() || null;

  if (amount === null && spentAt === null && !fiscalNumber && !fiscalDocumentNumber) {
    return null;
  }

  return {
    rawValue: normalizedRaw,
    sourceAmount: amount,
    sourceCurrency,
    spentAt,
    fiscalNumber,
    fiscalDocumentNumber,
    fiscalSign,
  };
};

export const extractReceiptInsights = (params: {
  rawText: string;
  tripCurrency: string;
  qrPayload?: TravelReceiptQrPayload | null;
}): ReceiptExtractionResult => {
  const lines = toReceiptLines(params.rawText);
  const amountCandidates = rankAmountCandidates(lines);

  let sourceAmount: number | null = null;
  let sourceAmountSource: AmountSource = "none";
  let amountLineIndex: number | undefined;
  if (params.qrPayload?.sourceAmount !== null && params.qrPayload?.sourceAmount !== undefined) {
    sourceAmount = params.qrPayload.sourceAmount;
    sourceAmountSource = "qr";
  } else if (amountCandidates.length > 0) {
    const top = amountCandidates[0];
    sourceAmount = top.value;
    amountLineIndex = top.lineIndex;
    if (top.score >= 220) {
      sourceAmountSource = "marker";
    } else if (top.zone === "totals" || top.zone === "footer") {
      sourceAmountSource = "totals_zone";
    } else {
      sourceAmountSource = "fallback";
    }
  }

  let sourceCurrency: string | null = null;
  let sourceCurrencySource: CurrencySource = "none";
  if (params.qrPayload?.sourceCurrency) {
    sourceCurrency = params.qrPayload.sourceCurrency;
    sourceCurrencySource = "qr";
  } else {
    const detectedCurrency = detectCurrencyFromText(lines, params.tripCurrency);
    sourceCurrency = detectedCurrency.currency;
    sourceCurrencySource = detectedCurrency.source;
  }

  let spentAt: string | null = null;
  let spentAtSource: DateSource = "none";
  if (params.qrPayload?.spentAt) {
    spentAt = params.qrPayload.spentAt;
    spentAtSource = "qr";
  } else {
    const dateCandidate = detectSpentAtFromText(lines);
    spentAt = dateCandidate.spentAt;
    spentAtSource = dateCandidate.source;
  }

  const merchantCandidate = detectMerchant(lines);
  const descriptionCandidate = detectDescription(lines, merchantCandidate.merchant);
  const mergedRawText = buildReadableReceiptText(lines, amountLineIndex);
  const category = inferCategory((mergedRawText ?? lines.join("\n")).toLowerCase());

  return {
    sourceAmount,
    sourceAmountSource,
    sourceCurrency,
    sourceCurrencySource,
    spentAt,
    spentAtSource,
    merchant: merchantCandidate.merchant,
    merchantSource: merchantCandidate.source,
    description: descriptionCandidate.description,
    descriptionSource: descriptionCandidate.source,
    category,
    rawText: mergedRawText,
  };
};

export const buildReceiptFieldQualityFromExtraction = (
  result: ReceiptExtractionResult,
): TravelReceiptOcrFieldQualityMap => {
  const quality = createDefaultTravelReceiptOcrFieldQuality();

  if (result.sourceAmount !== null) {
    if (result.sourceAmountSource === "qr" || result.sourceAmountSource === "marker") {
      quality.sourceAmount = "high";
    } else if (result.sourceAmountSource === "totals_zone") {
      quality.sourceAmount = "medium";
    } else {
      quality.sourceAmount = "low";
    }
  }

  if (result.sourceCurrency !== null) {
    if (result.sourceCurrencySource === "qr") {
      quality.sourceCurrency = "high";
    } else if (result.sourceCurrencySource === "text") {
      quality.sourceCurrency = "medium";
    } else {
      quality.sourceCurrency = "low";
    }
  }

  if (result.spentAt !== null) {
    if (result.spentAtSource === "qr" || result.spentAtSource === "marked_line") {
      quality.spentAt = "high";
    } else {
      quality.spentAt = "medium";
    }
  }

  if (result.merchant !== null) {
    quality.merchant = result.merchantSource === "header" ? "medium" : "low";
  }
  if (result.description !== null) {
    quality.description = result.descriptionSource === "items" ? "medium" : "low";
  }
  if (result.category !== null) {
    quality.category = "low";
  }

  return quality;
};
