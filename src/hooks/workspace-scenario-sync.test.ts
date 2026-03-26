import assert from "node:assert/strict";
import test from "node:test";
import { resolveScenarioForWorkspaceKind } from "./workspace-scenario-sync.ts";

test("resolveScenarioForWorkspaceKind: maps personal to single", () => {
  assert.equal(resolveScenarioForWorkspaceKind("personal"), "single");
});

test("resolveScenarioForWorkspaceKind: maps family to family", () => {
  assert.equal(resolveScenarioForWorkspaceKind("family"), "family");
});
