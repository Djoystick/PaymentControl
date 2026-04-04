const MAX_REASON_LENGTH = 160;
const MAX_VALUE_LENGTH = 120;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const normalizeCompactValue = (
  value: unknown,
  maxLength = MAX_VALUE_LENGTH,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
};

const normalizeReason = (value: unknown): string | null => {
  return normalizeCompactValue(value, MAX_REASON_LENGTH);
};

const appendCompactLine = (
  lines: string[],
  title: string,
  parts: Array<[label: string, value: string | null]>,
): void => {
  const compact = parts
    .filter((part): part is [string, string] => Boolean(part[1]))
    .map(([label, value]) => `${label}=${value}`)
    .join(" | ");

  if (!compact) {
    return;
  }

  lines.push(`${title}: ${compact}`);
};

export const formatBugReportRuntimeContextLines = (value: unknown): string[] => {
  if (!isRecord(value)) {
    return [];
  }

  const lines: string[] = [];

  const runtime = isRecord(value.runtime) ? value.runtime : null;
  if (runtime) {
    appendCompactLine(lines, "Runtime", [
      ["tab", normalizeCompactValue(runtime.tab)],
      ["intent", normalizeCompactValue(runtime.intent)],
      ["workspace", normalizeCompactValue(runtime.workspaceId)],
      ["reason", normalizeReason(runtime.reason)],
      ["at", normalizeCompactValue(runtime.updatedAt)],
    ]);
  }

  const reminders = isRecord(value.reminders) ? value.reminders : null;
  if (reminders) {
    appendCompactLine(lines, "Reminders", [
      ["focus", normalizeCompactValue(reminders.reminderFocusFilter)],
      ["reason", normalizeReason(reminders.entryFlowContextReason)],
      ["at", normalizeCompactValue(reminders.updatedAt)],
    ]);
  }

  const history = isRecord(value.history) ? value.history : null;
  if (history) {
    appendCompactLine(lines, "History", [
      ["focus", normalizeCompactValue(history.activityFocusFilter)],
      ["reason", normalizeReason(history.entryFlowContextReason)],
      ["at", normalizeCompactValue(history.updatedAt)],
    ]);
  }

  const generatedAt = normalizeCompactValue(value.generatedAt);
  if (generatedAt) {
    lines.push(`Context generated at: ${generatedAt}`);
  }

  return lines.slice(0, 4);
};
