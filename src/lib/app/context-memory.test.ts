import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTEXT_MEMORY_STORAGE_KEY,
  DEFAULT_CONTEXT_TTL_MS,
  clearAllContextMemory,
  isRuntimeSnapshotCompatibleWithWorkspace,
  readHistoryContextSnapshot,
  readRemindersContextSnapshot,
  readRuntimeSnapshot,
  rememberRuntimeSnapshot,
  writeHistoryContextSnapshot,
  writeRemindersContextSnapshot,
} from "./context-memory.ts";

class LocalStorageMock {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

const installWindowWithStorage = (): LocalStorageMock => {
  const storage = new LocalStorageMock();
  (
    globalThis as typeof globalThis & {
      window?: { localStorage: LocalStorageMock };
    }
  ).window = { localStorage: storage };
  return storage;
};

const clearWindow = (): void => {
  delete (
    globalThis as typeof globalThis & {
      window?: unknown;
    }
  ).window;
};

test("context-memory: runtime snapshot respects workspace compatibility", () => {
  installWindowWithStorage();

  rememberRuntimeSnapshot({
    tab: "reminders",
    intent: "reminders_action_now",
    reason: "Continue focused flow.",
    workspaceId: "workspace-a",
  });

  const compatible = readRuntimeSnapshot({ workspaceId: "workspace-a" });
  assert.ok(compatible);
  assert.equal(compatible?.workspaceId, "workspace-a");

  const incompatible = readRuntimeSnapshot({ workspaceId: "workspace-b" });
  assert.equal(incompatible, null);

  rememberRuntimeSnapshot({
    tab: "profile",
    reason: "Open profile context.",
  });
  const profileCompatible = readRuntimeSnapshot({ workspaceId: "workspace-b" });
  assert.ok(profileCompatible);
  assert.equal(profileCompatible?.tab, "profile");
  assert.equal(
    isRuntimeSnapshotCompatibleWithWorkspace(profileCompatible!, "workspace-b"),
    true,
  );

  clearWindow();
});

test("context-memory: stale reminders/history contexts are ignored by TTL", () => {
  const storage = installWindowWithStorage();
  const staleIso = new Date(Date.now() - DEFAULT_CONTEXT_TTL_MS - 60_000).toISOString();

  storage.setItem(
    CONTEXT_MEMORY_STORAGE_KEY,
    JSON.stringify({
      remindersByWorkspace: {
        "workspace-a": {
          reminderFocusFilter: "action_now",
          entryFlowContextReason: "Old focus",
          updatedAt: staleIso,
        },
      },
      historyByWorkspace: {
        "workspace-a": {
          activityFocusFilter: "paid",
          entryFlowContextReason: "Old history",
          updatedAt: staleIso,
        },
      },
    }),
  );

  assert.equal(readRemindersContextSnapshot("workspace-a"), null);
  assert.equal(readHistoryContextSnapshot("workspace-a"), null);

  clearWindow();
});

test("context-memory: clearAllContextMemory removes persisted store", () => {
  const storage = installWindowWithStorage();

  writeRemindersContextSnapshot("workspace-a", {
    reminderFocusFilter: "all",
    entryFlowContextReason: "Test reminders context.",
  });
  writeHistoryContextSnapshot("workspace-a", {
    activityFocusFilter: "changes",
    entryFlowContextReason: "Test history context.",
  });
  assert.ok(storage.getItem(CONTEXT_MEMORY_STORAGE_KEY));

  clearAllContextMemory();
  assert.equal(storage.getItem(CONTEXT_MEMORY_STORAGE_KEY), null);

  clearWindow();
});
