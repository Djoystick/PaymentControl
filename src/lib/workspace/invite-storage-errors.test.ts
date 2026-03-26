import assert from "node:assert/strict";
import test from "node:test";
import { isFamilyInviteStorageNotReadyError } from "./invite-storage-errors.ts";

test("isFamilyInviteStorageNotReadyError: true for PostgREST relation missing code", () => {
  assert.equal(
    isFamilyInviteStorageNotReadyError({
      code: "PGRST205",
      message:
        "Could not find the table 'public.family_workspace_invites' in the schema cache",
    }),
    true,
  );
});

test("isFamilyInviteStorageNotReadyError: true for invite table mention in message", () => {
  assert.equal(
    isFamilyInviteStorageNotReadyError({
      code: "UNKNOWN",
      message:
        "insert into public.family_workspace_invites violates some constraint",
    }),
    true,
  );
});

test("isFamilyInviteStorageNotReadyError: false for unrelated errors", () => {
  assert.equal(
    isFamilyInviteStorageNotReadyError({
      code: "23505",
      message: "duplicate key value violates unique constraint",
    }),
    false,
  );
  assert.equal(isFamilyInviteStorageNotReadyError(undefined), false);
  assert.equal(isFamilyInviteStorageNotReadyError(null), false);
});
