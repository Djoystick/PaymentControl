import assert from "node:assert/strict";
import test from "node:test";
import {
  validateCreateRecurringPaymentInput,
  validateUpdateRecurringPaymentInput,
} from "./validation.ts";

const validResponsibleProfileId = "123e4567-e89b-42d3-a456-426614174000";

test("validateCreateRecurringPaymentInput: accepts valid responsible payer id", () => {
  const result = validateCreateRecurringPaymentInput({
    title: "Internet",
    amount: 50,
    currency: "USD",
    category: "Utilities",
    cadence: "monthly",
    dueDay: 10,
    isRequired: true,
    isSubscription: true,
    remindersEnabled: true,
    remindDaysBefore: 1,
    remindOnDueDay: true,
    remindOnOverdue: true,
    responsibleProfileId: validResponsibleProfileId,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.responsibleProfileId, validResponsibleProfileId);
  }
});

test("validateCreateRecurringPaymentInput: rejects non-uuid responsible payer id", () => {
  const result = validateCreateRecurringPaymentInput({
    title: "Internet",
    amount: 50,
    currency: "USD",
    category: "Utilities",
    cadence: "monthly",
    dueDay: 10,
    isRequired: true,
    isSubscription: true,
    remindersEnabled: true,
    remindDaysBefore: 1,
    remindOnDueDay: true,
    remindOnOverdue: true,
    responsibleProfileId: "6208918931",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.message, "Responsible payer id is invalid.");
  }
});

test("validateUpdateRecurringPaymentInput: accepts empty responsible payer id as clear", () => {
  const result = validateUpdateRecurringPaymentInput({
    responsibleProfileId: " ",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.responsibleProfileId, null);
  }
});

test("validateUpdateRecurringPaymentInput: rejects invalid responsible payer id", () => {
  const result = validateUpdateRecurringPaymentInput({
    responsibleProfileId: "member-1",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.message, "Responsible payer id is invalid.");
  }
});
