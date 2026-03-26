import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTelegramIdCandidate } from "./telegram-id-normalization";

test("normalizeTelegramIdCandidate: string value", () => {
  assert.equal(normalizeTelegramIdCandidate(" 6208918931 "), "6208918931");
});

test("normalizeTelegramIdCandidate: numeric value", () => {
  assert.equal(normalizeTelegramIdCandidate(6208918931), "6208918931");
});

test("normalizeTelegramIdCandidate: bigint value", () => {
  assert.equal(normalizeTelegramIdCandidate(6208918931n), "6208918931");
});

test("normalizeTelegramIdCandidate: nullish/empty/invalid values", () => {
  assert.equal(normalizeTelegramIdCandidate(null), null);
  assert.equal(normalizeTelegramIdCandidate(undefined), null);
  assert.equal(normalizeTelegramIdCandidate("   "), null);
  assert.equal(normalizeTelegramIdCandidate(false), null);
  assert.equal(normalizeTelegramIdCandidate({ value: 1 }), null);
});
