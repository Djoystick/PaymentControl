import test from "node:test";
import assert from "node:assert/strict";
import {
  maskInviteToken,
  normalizeFamilyInviteToken,
} from "./invite-token.ts";

test("normalizeFamilyInviteToken handles raw token", () => {
  assert.equal(
    normalizeFamilyInviteToken(" fam_abc123DEF "),
    "fam_abc123DEF",
  );
});

test("normalizeFamilyInviteToken extracts token from url params", () => {
  assert.equal(
    normalizeFamilyInviteToken("https://t.me/some_bot?startapp=fam_deadbeef123"),
    "fam_deadbeef123",
  );
});

test("normalizeFamilyInviteToken returns empty string for invalid input", () => {
  assert.equal(normalizeFamilyInviteToken("not-a-token"), "");
});

test("maskInviteToken keeps empty readable", () => {
  assert.equal(maskInviteToken(" "), "empty");
});

test("maskInviteToken shortens long token", () => {
  assert.equal(maskInviteToken("fam_1234567890abcdef1234567890"), "fam_123456...7890");
});
