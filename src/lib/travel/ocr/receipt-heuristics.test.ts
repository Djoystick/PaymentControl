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
      "SHOP HOME",
      "Bread 9 999.00",
      "Discount 8 700.00",
      "TOTAL 1 299.00",
      "TO PAY 1 299.00",
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
      "SHOP TEST",
      "Item 9 999.00",
      "TOTAL 1 299.00",
    ].join("\n"),
    tripCurrency: "RUB",
    qrPayload: qrPayload ?? null,
  });

  assert.equal(extraction.sourceAmount, 543.21);
  assert.equal(extraction.sourceAmountSource, "qr");
  assert.match(extraction.spentAt ?? "", /^2026-04-06T15:30:00\.000Z$/);
});

test("extractReceiptInsights returns concise key-focused OCR text fragment", () => {
  const extraction = extractReceiptInsights({
    rawText: [
      "NORTH MARKET",
      "CASHDESK 1",
      "Bread 120.00",
      "Milk 89.00",
      "TOTAL 209.00",
      "CARD 209.00",
      "THANK YOU",
    ].join("\n"),
    tripCurrency: "RUB",
  });

  assert.ok(extraction.rawText);
  assert.match(extraction.rawText ?? "", /TOTAL 209.00/);
  assert.ok((extraction.rawText ?? "").length <= 1200);
});

test("buildReceiptFieldQualityFromExtraction marks amount/date as high for QR result", () => {
  const extraction = extractReceiptInsights({
    rawText: "Item 199.00\nTOTAL 199.00",
    tripCurrency: "RUB",
    qrPayload: parseReceiptQrPayload("t=20260406T1200&s=199.00&fn=1&i=2&fp=3"),
  });
  const quality = buildReceiptFieldQualityFromExtraction(extraction);

  assert.equal(quality.sourceAmount, "high");
  assert.equal(quality.spentAt, "high");
});

test("extractReceiptInsights cleans mixed latin/cyrillic tokens for likely Russian words", () => {
  const extraction = extractReceiptInsights({
    rawText: ["Ma\u0413H\u0418T", "B\u042b6paTb"].join("\n"),
    tripCurrency: "RUB",
  });

  assert.equal(extraction.merchant, "\u041c\u0430\u0433\u043d\u0438\u0442");
  assert.ok((extraction.rawText ?? "").includes("\u0412\u044b\u0431\u0440\u0430\u0442\u044c"));
});

test("extractReceiptInsights prefers merchant brand line over legal entity prefix", () => {
  const extraction = extractReceiptInsights({
    rawText: [
      "OOO RETAIL GROUP",
      "MAGNIT MARKET",
      "ITEM 1 999.00",
      "TOTAL 199.00",
    ].join("\n"),
    tripCurrency: "RUB",
  });

  assert.equal(extraction.merchant, "Magnit Market");
});

test("extractReceiptInsights keeps OCR reference text concise and key-focused", () => {
  const itemLines = Array.from({ length: 24 }, (_, index) => `ITEM_${index + 1} 5.00`);
  const extraction = extractReceiptInsights({
    rawText: [
      "MAGNIT MARKET",
      "DATE 07.04.2026 12:10",
      ...itemLines,
      "TOTAL 129.00",
      "CARD 129.00",
    ].join("\n"),
    tripCurrency: "RUB",
  });

  assert.ok(extraction.rawText);
  assert.match(extraction.rawText ?? "", /TOTAL 129.00/);
  assert.doesNotMatch(extraction.rawText ?? "", /ITEM_18/);
  assert.ok((extraction.rawText ?? "").length <= 1200);
});
