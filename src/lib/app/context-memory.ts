"use client";

export type ContextAppTab = "home" | "reminders" | "history" | "profile";
export type ContextAppNavigationIntent =
  | "reminders_add_payment"
  | "reminders_action_now"
  | "reminders_upcoming"
  | "reminders_all"
  | "history_recent_updates"
  | "history_recent_paid";

export type RuntimeContextSnapshot = {
  tab: ContextAppTab;
  intent?: ContextAppNavigationIntent;
  sourceTab?: ContextAppTab;
  reason?: string;
  workspaceId?: string | null;
  updatedAt: string;
};

export type RemindersContextSnapshot = {
  paymentListView: "payments" | "subscriptions";
  reminderFocusFilter: "all" | "action_now" | "upcoming" | "paid";
  showPausedSubscriptionsOnly: boolean;
  entryFlowContextReason: string | null;
  updatedAt: string;
};

export type HistoryContextSnapshot = {
  activityFocusFilter: "all" | "changes" | "paid";
  entryFlowContextReason: string | null;
  updatedAt: string;
};

export type RemindersGuidanceFlags = {
  firstPayment: boolean;
  firstPaidCycle: boolean;
  focusedEntry: boolean;
  familyShared: boolean;
};

type GuidanceEnvelope = RemindersGuidanceFlags & {
  updatedAt: string;
};

type ContextMemoryStore = {
  runtime?: RuntimeContextSnapshot;
  remindersByWorkspace?: Record<string, RemindersContextSnapshot>;
  historyByWorkspace?: Record<string, HistoryContextSnapshot>;
  remindersGuidanceByWorkspace?: Record<string, GuidanceEnvelope>;
};

export type BugReportRuntimeContextPayload = {
  generatedAt: string;
  runtime: RuntimeContextSnapshot | null;
  reminders: RemindersContextSnapshot | null;
  history: HistoryContextSnapshot | null;
};

const STORAGE_KEY = "payment_control_context_memory_v27e";
const DEFAULT_CONTEXT_TTL_MS = 12 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isContextTab = (value: unknown): value is ContextAppTab => {
  return (
    value === "home" ||
    value === "reminders" ||
    value === "history" ||
    value === "profile"
  );
};

const isContextIntent = (value: unknown): value is ContextAppNavigationIntent => {
  return (
    value === "reminders_add_payment" ||
    value === "reminders_action_now" ||
    value === "reminders_upcoming" ||
    value === "reminders_all" ||
    value === "history_recent_updates" ||
    value === "history_recent_paid"
  );
};

const isFreshIsoTimestamp = (value: unknown, maxAgeMs: number): value is string => {
  if (typeof value !== "string" || !value) {
    return false;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return false;
  }

  const ageMs = Date.now() - parsed;
  return ageMs >= 0 && ageMs <= maxAgeMs;
};

const defaultGuidanceFlags = (): RemindersGuidanceFlags => ({
  firstPayment: false,
  firstPaidCycle: false,
  focusedEntry: false,
  familyShared: false,
});

const normalizeRuntimeSnapshot = (
  value: unknown,
  maxAgeMs: number,
): RuntimeContextSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (!isContextTab(value.tab) || !isFreshIsoTimestamp(value.updatedAt, maxAgeMs)) {
    return null;
  }

  if (value.intent !== undefined && !isContextIntent(value.intent)) {
    return null;
  }

  if (value.sourceTab !== undefined && !isContextTab(value.sourceTab)) {
    return null;
  }

  if (value.reason !== undefined && typeof value.reason !== "string") {
    return null;
  }

  if (
    value.workspaceId !== undefined &&
    value.workspaceId !== null &&
    typeof value.workspaceId !== "string"
  ) {
    return null;
  }

  return {
    tab: value.tab,
    intent: value.intent,
    sourceTab: value.sourceTab,
    reason: value.reason,
    workspaceId: value.workspaceId,
    updatedAt: value.updatedAt,
  };
};

const normalizeRemindersSnapshot = (
  value: unknown,
  maxAgeMs: number,
): RemindersContextSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }

  const paymentListView =
    value.paymentListView === "payments" || value.paymentListView === "subscriptions"
      ? value.paymentListView
      : null;
  const reminderFocusFilter =
    value.reminderFocusFilter === "all" ||
    value.reminderFocusFilter === "action_now" ||
    value.reminderFocusFilter === "upcoming" ||
    value.reminderFocusFilter === "paid"
      ? value.reminderFocusFilter
      : null;
  if (!paymentListView || !reminderFocusFilter) {
    return null;
  }

  if (
    typeof value.showPausedSubscriptionsOnly !== "boolean" ||
    !isFreshIsoTimestamp(value.updatedAt, maxAgeMs)
  ) {
    return null;
  }

  const entryFlowContextReason =
    value.entryFlowContextReason === null ||
    typeof value.entryFlowContextReason === "string"
      ? value.entryFlowContextReason
      : null;

  return {
    paymentListView,
    reminderFocusFilter,
    showPausedSubscriptionsOnly: value.showPausedSubscriptionsOnly,
    entryFlowContextReason,
    updatedAt: value.updatedAt,
  };
};

const normalizeHistorySnapshot = (
  value: unknown,
  maxAgeMs: number,
): HistoryContextSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }

  const activityFocusFilter =
    value.activityFocusFilter === "all" ||
    value.activityFocusFilter === "changes" ||
    value.activityFocusFilter === "paid"
      ? value.activityFocusFilter
      : null;
  if (!activityFocusFilter || !isFreshIsoTimestamp(value.updatedAt, maxAgeMs)) {
    return null;
  }

  const entryFlowContextReason =
    value.entryFlowContextReason === null ||
    typeof value.entryFlowContextReason === "string"
      ? value.entryFlowContextReason
      : null;

  return {
    activityFocusFilter,
    entryFlowContextReason,
    updatedAt: value.updatedAt,
  };
};

const normalizeGuidanceEnvelope = (value: unknown): GuidanceEnvelope | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.firstPayment !== "boolean" ||
    typeof value.firstPaidCycle !== "boolean" ||
    typeof value.focusedEntry !== "boolean" ||
    typeof value.familyShared !== "boolean" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    firstPayment: value.firstPayment,
    firstPaidCycle: value.firstPaidCycle,
    focusedEntry: value.focusedEntry,
    familyShared: value.familyShared,
    updatedAt: value.updatedAt,
  };
};

const readStore = (): ContextMemoryStore => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }

    return parsed as ContextMemoryStore;
  } catch {
    return {};
  }
};

const writeStore = (value: ContextMemoryStore): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage write failures.
  }
};

export const rememberRuntimeSnapshot = (
  value: Omit<RuntimeContextSnapshot, "updatedAt">,
): void => {
  const store = readStore();
  store.runtime = {
    ...value,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
};

export const readRuntimeSnapshot = (params?: {
  maxAgeMs?: number;
  workspaceId?: string | null;
}): RuntimeContextSnapshot | null => {
  const maxAgeMs = params?.maxAgeMs ?? DEFAULT_CONTEXT_TTL_MS;
  const runtime = normalizeRuntimeSnapshot(readStore().runtime, maxAgeMs);
  if (!runtime) {
    return null;
  }

  if (params?.workspaceId && runtime.workspaceId && runtime.workspaceId !== params.workspaceId) {
    return null;
  }

  return runtime;
};

export const clearRuntimeSnapshot = (): void => {
  const store = readStore();
  if (!store.runtime) {
    return;
  }

  delete store.runtime;
  writeStore(store);
};

export const writeRemindersContextSnapshot = (
  workspaceId: string,
  value: Omit<RemindersContextSnapshot, "updatedAt">,
): void => {
  if (!workspaceId) {
    return;
  }

  const store = readStore();
  const remindersByWorkspace = {
    ...(store.remindersByWorkspace ?? {}),
  };
  remindersByWorkspace[workspaceId] = {
    ...value,
    updatedAt: new Date().toISOString(),
  };
  store.remindersByWorkspace = remindersByWorkspace;
  writeStore(store);
};

export const readRemindersContextSnapshot = (
  workspaceId: string,
  maxAgeMs = DEFAULT_CONTEXT_TTL_MS,
): RemindersContextSnapshot | null => {
  if (!workspaceId) {
    return null;
  }

  const remindersByWorkspace = readStore().remindersByWorkspace ?? {};
  return normalizeRemindersSnapshot(remindersByWorkspace[workspaceId], maxAgeMs);
};

export const clearRemindersContextSnapshot = (workspaceId: string): void => {
  if (!workspaceId) {
    return;
  }

  const store = readStore();
  if (!store.remindersByWorkspace?.[workspaceId]) {
    return;
  }

  delete store.remindersByWorkspace[workspaceId];
  writeStore(store);
};

export const writeHistoryContextSnapshot = (
  workspaceId: string,
  value: Omit<HistoryContextSnapshot, "updatedAt">,
): void => {
  if (!workspaceId) {
    return;
  }

  const store = readStore();
  const historyByWorkspace = {
    ...(store.historyByWorkspace ?? {}),
  };
  historyByWorkspace[workspaceId] = {
    ...value,
    updatedAt: new Date().toISOString(),
  };
  store.historyByWorkspace = historyByWorkspace;
  writeStore(store);
};

export const readHistoryContextSnapshot = (
  workspaceId: string,
  maxAgeMs = DEFAULT_CONTEXT_TTL_MS,
): HistoryContextSnapshot | null => {
  if (!workspaceId) {
    return null;
  }

  const historyByWorkspace = readStore().historyByWorkspace ?? {};
  return normalizeHistorySnapshot(historyByWorkspace[workspaceId], maxAgeMs);
};

export const clearHistoryContextSnapshot = (workspaceId: string): void => {
  if (!workspaceId) {
    return;
  }

  const store = readStore();
  if (!store.historyByWorkspace?.[workspaceId]) {
    return;
  }

  delete store.historyByWorkspace[workspaceId];
  writeStore(store);
};

export const readRemindersGuidanceFlags = (workspaceId: string): RemindersGuidanceFlags => {
  if (!workspaceId) {
    return defaultGuidanceFlags();
  }

  const envelope = normalizeGuidanceEnvelope(
    readStore().remindersGuidanceByWorkspace?.[workspaceId],
  );
  if (!envelope) {
    return defaultGuidanceFlags();
  }

  return {
    firstPayment: envelope.firstPayment,
    firstPaidCycle: envelope.firstPaidCycle,
    focusedEntry: envelope.focusedEntry,
    familyShared: envelope.familyShared,
  };
};

export const markRemindersGuidanceSeen = (
  workspaceId: string,
  key: keyof RemindersGuidanceFlags,
): RemindersGuidanceFlags => {
  if (!workspaceId) {
    return defaultGuidanceFlags();
  }

  const currentFlags = readRemindersGuidanceFlags(workspaceId);
  const nextFlags: RemindersGuidanceFlags = {
    ...currentFlags,
    [key]: true,
  };

  const store = readStore();
  const remindersGuidanceByWorkspace = {
    ...(store.remindersGuidanceByWorkspace ?? {}),
  };
  remindersGuidanceByWorkspace[workspaceId] = {
    ...nextFlags,
    updatedAt: new Date().toISOString(),
  };
  store.remindersGuidanceByWorkspace = remindersGuidanceByWorkspace;
  writeStore(store);
  return nextFlags;
};

export const clearAllContextMemory = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage write failures.
  }
};

export const buildBugReportRuntimeContextPayload = (
  workspaceId: string | null,
): BugReportRuntimeContextPayload => {
  const runtime = readRuntimeSnapshot({
    maxAgeMs: DEFAULT_CONTEXT_TTL_MS,
    workspaceId,
  });
  const reminders = workspaceId
    ? readRemindersContextSnapshot(workspaceId, DEFAULT_CONTEXT_TTL_MS)
    : null;
  const history = workspaceId
    ? readHistoryContextSnapshot(workspaceId, DEFAULT_CONTEXT_TTL_MS)
    : null;

  return {
    generatedAt: new Date().toISOString(),
    runtime,
    reminders,
    history,
  };
};
