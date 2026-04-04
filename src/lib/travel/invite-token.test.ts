import assert from "node:assert/strict";
import test from "node:test";
import {
  maskTravelInviteToken,
  normalizeTravelInviteToken,
} from "./invite-token.ts";

test("normalizeTravelInviteToken accepts direct token", () => {
  assert.equal(normalizeTravelInviteToken("trip_abc123"), "trip_abc123");
});

test("normalizeTravelInviteToken accepts token from startapp link", () => {
  assert.equal(
    normalizeTravelInviteToken("https://t.me/payment_control_bot?startapp=trip_a1b2"),
    "trip_a1b2",
  );
});

test("normalizeTravelInviteToken rejects unsupported token", () => {
  assert.equal(normalizeTravelInviteToken("family_123"), "");
});

test("maskTravelInviteToken keeps short token readable", () => {
  assert.equal(maskTravelInviteToken("trip_short"), "trip_short");
});

test("maskTravelInviteToken masks long token", () => {
  assert.equal(
    maskTravelInviteToken("trip_abcdefghijklmnopqrstuvwxyz"),
    "trip_abcde...wxyz",
  );
});
