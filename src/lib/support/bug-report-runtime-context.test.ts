import assert from "node:assert/strict";
import test from "node:test";
import { formatBugReportRuntimeContextLines } from "./bug-report-runtime-context.ts";

test("formatBugReportRuntimeContextLines: returns empty list for invalid payload", () => {
  assert.deepEqual(formatBugReportRuntimeContextLines(null), []);
  assert.deepEqual(formatBugReportRuntimeContextLines(""), []);
});

test("formatBugReportRuntimeContextLines: builds compact stable lines", () => {
  const lines = formatBugReportRuntimeContextLines({
    generatedAt: "2026-04-04T12:00:00.000Z",
    runtime: {
      tab: "reminders",
      intent: "reminders_action_now",
      reason: "Continue from Home with action-now focus.",
      workspaceId: "workspace-a",
      updatedAt: "2026-04-04T11:59:00.000Z",
    },
    reminders: {
      paymentListView: "payments",
      reminderFocusFilter: "action_now",
      showPausedSubscriptionsOnly: false,
      entryFlowContextReason: "Focused on action-now cards for this session.",
      updatedAt: "2026-04-04T11:59:20.000Z",
    },
    history: {
      activityFocusFilter: "changes",
      entryFlowContextReason: "Continue from Home with recent updates focus.",
      updatedAt: "2026-04-04T11:58:20.000Z",
    },
  });

  assert.equal(lines.length, 4);
  assert.equal(
    lines[0],
    "Runtime: tab=reminders | intent=reminders_action_now | workspace=workspace-a | reason=Continue from Home with action-now focus. | at=2026-04-04T11:59:00.000Z",
  );
  assert.equal(
    lines[1],
    "Reminders: view=payments | focus=action_now | pausedOnly=off | reason=Focused on action-now cards for this session. | at=2026-04-04T11:59:20.000Z",
  );
  assert.equal(
    lines[2],
    "History: focus=changes | reason=Continue from Home with recent updates focus. | at=2026-04-04T11:58:20.000Z",
  );
  assert.equal(lines[3], "Context generated at: 2026-04-04T12:00:00.000Z");
});

test("formatBugReportRuntimeContextLines: clamps verbose reasons", () => {
  const longReason = "x".repeat(260);
  const [runtimeLine] = formatBugReportRuntimeContextLines({
    runtime: {
      tab: "home",
      reason: longReason,
    },
  });

  assert.ok(runtimeLine.startsWith("Runtime: tab=home | reason="));
  assert.ok(runtimeLine.length < 240);
});

