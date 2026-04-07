import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReceiptFieldQualityFromExtraction,
  extractReceiptInsights,
  parseReceiptQrPayload,
} from "./receipt-heuristics.ts";

test("extractReceiptInsights prefers total marker lines over large item values", () => {
  const result = extractReceiptInsights({
    rawText: [
      "ООО МАГАЗИН У ДОМА",
      "Хлеб 9 999,00",
      "Скидка 8 700,00",
      "ИТОГО 1 299,00",
      "К ОПЛАТЕ 1 299,00",
    ].join("\n"),
    tripCurrency: "RUB",
  });

  assert.equal(result.sourceAmount, 1299);
  assert.equal(result.sourceAmountSource, "marker");
});

test("parseReceiptQrPayload extracts fiscal QR amount/date and extraction prioritizes QR", () => {
  const qrPayload = parseReceiptQrPayload(
    "t=20260406T1530&s=543.21&fn=9960440301361514&i=28204&fp=1138006244&n=1",
  );
  assert.ok(qrPayload);
  assert.equal(qrPayload?.sourceAmount, 543.21);
  assert.match(qrPayload?.spentAt ?? "", /^2026-04-06T15:30:00\.000Z$/);

  const extraction = extractReceiptInsights({
    rawText: [
      "ООО ТЕСТ МАРКЕТ",
      "Позиция 9 999,00",
      "ИТОГ 1 299,00",
    ].join("\n"),
    tripCurrency: "RUB",
    qrPayload: qrPayload ?? null,
  });

  assert.equal(extraction.sourceAmount, 543.21);
  assert.equal(extraction.sourceAmountSource, "qr");
  assert.match(extraction.spentAt ?? "", /^2026-04-06T15:30:00\.000Z$/);
});

test("extractReceiptInsights returns readable multi-block OCR text fragment", () => {
  const extraction = extractReceiptInsights({
    rawText: [
      "ООО СЕВЕРНЫЙ МАРКЕТ",
      "КАССА 1",
      "Хлеб 120,00",
      "Молоко 89,00",
      "ИТОГО 209,00",
      "БЕЗНАЛИЧНЫМИ 209,00",
      "СПАСИБО ЗА ПОКУПКУ",
    ].join("\n"),
    tripCurrency: "RUB",
  });

  assert.ok(extraction.rawText);
  assert.match(extraction.rawText ?? "", /\n\n/);
  assert.match(extraction.rawText ?? "", /ИТОГО 209,00/);
});

test("buildReceiptFieldQualityFromExtraction marks amount/date as high for QR result", () => {
  const extraction = extractReceiptInsights({
    rawText: "Товар 199,00\nИТОГО 199,00",
    tripCurrency: "RUB",
    qrPayload: parseReceiptQrPayload("t=20260406T1200&s=199.00&fn=1&i=2&fp=3"),
  });
  const quality = buildReceiptFieldQualityFromExtraction(extraction);

  assert.equal(quality.sourceAmount, "high");
  assert.equal(quality.spentAt, "high");
});
