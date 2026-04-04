import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTravelExpenseAmount } from "./currency.ts";

test("normalizeTravelExpenseAmount: keeps same-currency amount without conversion", () => {
  const result = normalizeTravelExpenseAmount({
    sourceAmount: 1299.5,
    sourceCurrency: "rub",
    tripCurrency: "RUB",
    conversionRate: null,
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.data.converted, false);
  assert.equal(result.data.sourceAmount, 1299.5);
  assert.equal(result.data.tripAmount, 1299.5);
  assert.equal(result.data.conversionRate, 1);
});

test("normalizeTravelExpenseAmount: converts cross-currency with fixed stored rate", () => {
  const result = normalizeTravelExpenseAmount({
    sourceAmount: 100,
    sourceCurrency: "USD",
    tripCurrency: "EUR",
    conversionRate: 0.92543,
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.data.converted, true);
  assert.equal(result.data.sourceAmount, 100);
  assert.equal(result.data.tripAmount, 92.54);
  assert.equal(result.data.conversionRate, 0.92543);
});

test("normalizeTravelExpenseAmount: requires positive rate for cross-currency", () => {
  const missingRate = normalizeTravelExpenseAmount({
    sourceAmount: 10,
    sourceCurrency: "USD",
    tripCurrency: "RUB",
    conversionRate: null,
  });

  assert.equal(missingRate.ok, false);
  if (!missingRate.ok) {
    assert.equal(
      missingRate.message,
      "Conversion rate is required when expense currency differs from trip currency.",
    );
  }

  const invalidRate = normalizeTravelExpenseAmount({
    sourceAmount: 10,
    sourceCurrency: "USD",
    tripCurrency: "RUB",
    conversionRate: -2,
  });

  assert.equal(invalidRate.ok, false);
  if (!invalidRate.ok) {
    assert.equal(invalidRate.message, "Conversion rate must be a positive number.");
  }
});

