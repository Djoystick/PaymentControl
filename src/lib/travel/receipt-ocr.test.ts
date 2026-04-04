import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultTravelReceiptOcrFieldQuality,
  normalizeTravelReceiptOcrSuggestion,
} from "./receipt-ocr-normalization.ts";

test("createDefaultTravelReceiptOcrFieldQuality returns missing for all fields", () => {
  const quality = createDefaultTravelReceiptOcrFieldQuality();
  assert.deepEqual(quality, {
    sourceAmount: "missing",
    sourceCurrency: "missing",
    spentAt: "missing",
    merchant: "missing",
    description: "missing",
    category: "missing",
    conversionRate: "missing",
  });
});

test("normalizeTravelReceiptOcrSuggestion parses human numeric/date formats and quality", () => {
  const result = normalizeTravelReceiptOcrSuggestion({
    sourceAmount: "1 234,50",
    sourceCurrency: "eur",
    spentAt: "04.05.2026 09:30",
    merchant: "Coffee Point",
    description: "Breakfast",
    category: "Food",
    conversionRate: "96,15",
    rawText: "Coffee Point 1234.50 EUR",
    fieldQuality: {
      sourceAmount: "high",
      sourceCurrency: "high",
      spentAt: "medium",
      merchant: "high",
      description: "medium",
      category: "high",
      conversionRate: "low",
    },
  });

  assert.equal(result.sourceAmount, 1234.5);
  assert.equal(result.sourceCurrency, "EUR");
  assert.match(result.spentAt ?? "", /^2026-05-04T09:30:00\.000Z$/);
  assert.equal(result.conversionRate, 96.15);
  assert.equal(result.fieldQuality.sourceAmount, "high");
  assert.equal(result.fieldQuality.conversionRate, "low");
});

test("normalizeTravelReceiptOcrSuggestion falls back to medium/missing when quality absent", () => {
  const result = normalizeTravelReceiptOcrSuggestion({
    sourceAmount: 500,
    description: "Taxi",
  });

  assert.equal(result.fieldQuality.sourceAmount, "medium");
  assert.equal(result.fieldQuality.description, "medium");
  assert.equal(result.fieldQuality.sourceCurrency, "missing");
  assert.equal(result.fieldQuality.spentAt, "missing");
});
