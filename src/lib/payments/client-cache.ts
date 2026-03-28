"use client";

import type {
  PaymentsDashboardPayload,
  RecurringPaymentPayload,
  WorkspaceResponsiblePayerOptionPayload,
} from "@/lib/payments/types";

type CacheEnvelope<T> = {
  cachedAt: number;
  value: T;
};

type PaymentsListSnapshot = {
  payments: RecurringPaymentPayload[];
  responsiblePayerOptions: WorkspaceResponsiblePayerOptionPayload[];
};

type DashboardSnapshot = {
  dashboard: PaymentsDashboardPayload;
};

export type CachedSnapshot<T> = {
  value: T;
  cachedAt: number;
  ageMs: number;
  isFresh: boolean;
};

const PAYMENTS_LIST_STORAGE_KEY = "payment_control_cache_payments_list_v18a";
const PAYMENTS_DASHBOARD_STORAGE_KEY = "payment_control_cache_dashboard_v18a";
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;
export const PAYMENTS_LIST_CACHE_FRESH_TTL_MS = 60 * 1000;
export const PAYMENTS_DASHBOARD_CACHE_FRESH_TTL_MS = 60 * 1000;

const paymentsListMemory = new Map<string, CacheEnvelope<PaymentsListSnapshot>>();
const paymentsDashboardMemory = new Map<string, CacheEnvelope<DashboardSnapshot>>();

const canUseStorage = (): boolean => {
  return typeof window !== "undefined";
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isPaymentsListSnapshot = (
  value: unknown,
): value is PaymentsListSnapshot => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.payments) &&
    Array.isArray(value.responsiblePayerOptions)
  );
};

const isDashboardSnapshot = (
  value: unknown,
): value is DashboardSnapshot => {
  if (!isRecord(value)) {
    return false;
  }

  return isRecord(value.dashboard);
};

const readStorageMap = (
  storageKey: string,
): Record<string, unknown> => {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
};

const writeStorageMap = (
  storageKey: string,
  value: Record<string, unknown>,
): void => {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Ignore storage write errors and keep in-memory fallback.
  }
};

const toEnvelope = <T,>(
  raw: unknown,
): CacheEnvelope<T> | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const cachedAt =
    typeof raw.cachedAt === "number" && Number.isFinite(raw.cachedAt)
      ? raw.cachedAt
      : Number.NaN;

  if (!Number.isFinite(cachedAt)) {
    return null;
  }

  if (!("value" in raw)) {
    return null;
  }

  return {
    cachedAt,
    value: raw.value as T,
  };
};

const isEnvelopeRecent = (cachedAt: number): boolean => {
  const ageMs = Date.now() - cachedAt;
  return ageMs >= 0 && ageMs <= MAX_CACHE_AGE_MS;
};

const toSnapshot = <T,>(
  envelope: CacheEnvelope<T>,
  freshTtlMs: number,
): CachedSnapshot<T> => {
  const ageMs = Math.max(0, Date.now() - envelope.cachedAt);
  return {
    value: envelope.value,
    cachedAt: envelope.cachedAt,
    ageMs,
    isFresh: ageMs <= freshTtlMs,
  };
};

const readFromMemory = <T,>(
  map: Map<string, CacheEnvelope<T>>,
  workspaceId: string,
): CacheEnvelope<T> | null => {
  const cached = map.get(workspaceId);
  if (!cached) {
    return null;
  }

  if (!isEnvelopeRecent(cached.cachedAt)) {
    map.delete(workspaceId);
    return null;
  }

  return cached;
};

const readFromStorage = <T,>(
  storageKey: string,
  workspaceId: string,
): CacheEnvelope<T> | null => {
  const storageMap = readStorageMap(storageKey);
  const raw = storageMap[workspaceId];
  const envelope = toEnvelope<T>(raw);
  if (!envelope || !isEnvelopeRecent(envelope.cachedAt)) {
    return null;
  }

  return envelope;
};

const writeToStorage = <T,>(
  storageKey: string,
  workspaceId: string,
  envelope: CacheEnvelope<T>,
): void => {
  const currentMap = readStorageMap(storageKey);
  currentMap[workspaceId] = envelope;
  writeStorageMap(storageKey, currentMap);
};

export const readCachedPaymentsList = (
  workspaceId: string,
): CachedSnapshot<PaymentsListSnapshot> | null => {
  const memory = readFromMemory(paymentsListMemory, workspaceId);
  if (memory) {
    if (!isPaymentsListSnapshot(memory.value)) {
      paymentsListMemory.delete(workspaceId);
      return null;
    }
    return toSnapshot(memory, PAYMENTS_LIST_CACHE_FRESH_TTL_MS);
  }

  const storage = readFromStorage<unknown>(
    PAYMENTS_LIST_STORAGE_KEY,
    workspaceId,
  );
  if (!storage || !isPaymentsListSnapshot(storage.value)) {
    return null;
  }

  const nextEnvelope: CacheEnvelope<PaymentsListSnapshot> = {
    cachedAt: storage.cachedAt,
    value: storage.value,
  };
  paymentsListMemory.set(workspaceId, nextEnvelope);
  return toSnapshot(nextEnvelope, PAYMENTS_LIST_CACHE_FRESH_TTL_MS);
};

export const writeCachedPaymentsList = (
  workspaceId: string,
  snapshot: PaymentsListSnapshot,
): void => {
  const envelope: CacheEnvelope<PaymentsListSnapshot> = {
    cachedAt: Date.now(),
    value: snapshot,
  };

  paymentsListMemory.set(workspaceId, envelope);
  writeToStorage(PAYMENTS_LIST_STORAGE_KEY, workspaceId, envelope);
};

export const readCachedPaymentsDashboard = (
  workspaceId: string,
): CachedSnapshot<DashboardSnapshot> | null => {
  const memory = readFromMemory(paymentsDashboardMemory, workspaceId);
  if (memory) {
    if (!isDashboardSnapshot(memory.value)) {
      paymentsDashboardMemory.delete(workspaceId);
      return null;
    }
    return toSnapshot(memory, PAYMENTS_DASHBOARD_CACHE_FRESH_TTL_MS);
  }

  const storage = readFromStorage<unknown>(
    PAYMENTS_DASHBOARD_STORAGE_KEY,
    workspaceId,
  );
  if (!storage || !isDashboardSnapshot(storage.value)) {
    return null;
  }

  const nextEnvelope: CacheEnvelope<DashboardSnapshot> = {
    cachedAt: storage.cachedAt,
    value: storage.value,
  };
  paymentsDashboardMemory.set(workspaceId, nextEnvelope);
  return toSnapshot(nextEnvelope, PAYMENTS_DASHBOARD_CACHE_FRESH_TTL_MS);
};

export const writeCachedPaymentsDashboard = (
  workspaceId: string,
  snapshot: DashboardSnapshot,
): void => {
  const envelope: CacheEnvelope<DashboardSnapshot> = {
    cachedAt: Date.now(),
    value: snapshot,
  };

  paymentsDashboardMemory.set(workspaceId, envelope);
  writeToStorage(PAYMENTS_DASHBOARD_STORAGE_KEY, workspaceId, envelope);
};
