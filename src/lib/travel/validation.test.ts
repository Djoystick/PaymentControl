import assert from "node:assert/strict";
import test from "node:test";
import {
  validateTravelCreateExpenseInput,
  validateTravelCreateReceiptDraftInput,
  validateTravelCreateTripMemberInput,
  validateTravelUpdateTripMemberInput,
} from "./validation.ts";

test("validateTravelCreateExpenseInput keeps optional receiptDraftId", () => {
  const result = validateTravelCreateExpenseInput({
    amount: 100,
    expenseCurrency: "USD",
    conversionRate: 90.5,
    paidByMemberId: "payer-1",
    description: "Dinner",
    category: "Food",
    splitMode: "equal_all",
    selectedMemberIds: ["a", "b"],
    fullAmountMemberId: "",
    manualSplits: [],
    spentAt: "2026-04-04",
    receiptDraftId: "receipt-draft-123",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.data.receiptDraftId, "receipt-draft-123");
});

test("validateTravelCreateReceiptDraftInput validates minimal image payload", () => {
  const result = validateTravelCreateReceiptDraftInput({
    imageDataUrl: "data:image/png;base64,aGVsbG8=",
    imageMimeType: "image/png",
    imageFileName: "receipt.png",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.data.imageMimeType, "image/png");
  assert.equal(result.data.imageFileName, "receipt.png");
});

test("validateTravelCreateReceiptDraftInput rejects invalid image type", () => {
  const result = validateTravelCreateReceiptDraftInput({
    imageDataUrl: "data:text/plain;base64,aGVsbG8=",
    imageMimeType: "text/plain",
    imageFileName: "receipt.txt",
  });

  assert.equal(result.ok, false);
});

test("validateTravelCreateTripMemberInput accepts participant defaults", () => {
  const result = validateTravelCreateTripMemberInput({
    displayName: "Anna",
    linkToCurrentProfile: true,
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.data.role, "participant");
  assert.equal(result.data.status, "active");
  assert.equal(result.data.linkToCurrentProfile, true);
});

test("validateTravelUpdateTripMemberInput rejects empty patch", () => {
  const result = validateTravelUpdateTripMemberInput({});
  assert.equal(result.ok, false);
});

test("validateTravelUpdateTripMemberInput accepts status update", () => {
  const result = validateTravelUpdateTripMemberInput({
    status: "inactive",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.data.status, "inactive");
  assert.equal(result.data.displayName, null);
  assert.equal(result.data.role, null);
});
