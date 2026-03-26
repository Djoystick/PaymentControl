export const normalizeTelegramIdCandidate = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || null;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    const normalized = String(value).trim();
    return normalized || null;
  }

  return null;
};
