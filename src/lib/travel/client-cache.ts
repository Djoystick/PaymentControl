"use client";

import type { TravelTripListItemPayload, TravelTripPayload } from "@/lib/travel/types";

type CacheEnvelope<T> = {
  cachedAt: number;
  value: T;
};

type TripsListSnapshot = {
  trips: TravelTripListItemPayload[];
};

type TripDetailSnapshot = {
  trip: TravelTripPayload;
};

export type CachedSnapshot<T> = {
  value: T;
  cachedAt: number;
  ageMs: number;
  isFresh: boolean;
};

const TRAVEL_TRIPS_LIST_STORAGE_KEY = "payment_control_cache_travel_trips_list_v30c";
const TRAVEL_TRIP_DETAIL_STORAGE_KEY = "payment_control_cache_travel_trip_detail_v30c";
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;
const TRAVEL_TRIPS_LIST_FRESH_TTL_MS = 60 * 1000;
const TRAVEL_TRIP_DETAIL_FRESH_TTL_MS = 90 * 1000;

const tripsListMemory = new Map<string, CacheEnvelope<TripsListSnapshot>>();
const tripDetailMemory = new Map<string, CacheEnvelope<TripDetailSnapshot>>();

const canUseStorage = (): boolean => {
  return typeof window !== "undefined";
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const readStorageMap = (storageKey: string): Record<string, unknown> => {
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

const writeStorageMap = (storageKey: string, value: Record<string, unknown>): void => {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Ignore storage write errors and keep in-memory fallback.
  }
};

const toEnvelope = <T,>(raw: unknown): CacheEnvelope<T> | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const cachedAt =
    typeof raw.cachedAt === "number" && Number.isFinite(raw.cachedAt)
      ? raw.cachedAt
      : Number.NaN;

  if (!Number.isFinite(cachedAt) || !("value" in raw)) {
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
  key: string,
): CacheEnvelope<T> | null => {
  const cached = map.get(key);
  if (!cached) {
    return null;
  }

  if (!isEnvelopeRecent(cached.cachedAt)) {
    map.delete(key);
    return null;
  }

  return cached;
};

const readFromStorage = <T,>(
  storageKey: string,
  key: string,
): CacheEnvelope<T> | null => {
  const storageMap = readStorageMap(storageKey);
  const raw = storageMap[key];
  const envelope = toEnvelope<T>(raw);
  if (!envelope || !isEnvelopeRecent(envelope.cachedAt)) {
    return null;
  }

  return envelope;
};

const writeToStorage = <T,>(
  storageKey: string,
  key: string,
  envelope: CacheEnvelope<T>,
): void => {
  const currentMap = readStorageMap(storageKey);
  currentMap[key] = envelope;
  writeStorageMap(storageKey, currentMap);
};

const isTripsListSnapshot = (value: unknown): value is TripsListSnapshot => {
  return isRecord(value) && Array.isArray(value.trips);
};

const isTripDetailSnapshot = (value: unknown): value is TripDetailSnapshot => {
  return isRecord(value) && isRecord(value.trip);
};

const makeTripDetailCacheKey = (workspaceId: string, tripId: string): string => {
  return `${workspaceId}:${tripId}`;
};

export const readCachedTravelTripsList = (
  workspaceId: string,
): CachedSnapshot<TripsListSnapshot> | null => {
  const memory = readFromMemory(tripsListMemory, workspaceId);
  if (memory) {
    if (!isTripsListSnapshot(memory.value)) {
      tripsListMemory.delete(workspaceId);
      return null;
    }
    return toSnapshot(memory, TRAVEL_TRIPS_LIST_FRESH_TTL_MS);
  }

  const storage = readFromStorage<unknown>(TRAVEL_TRIPS_LIST_STORAGE_KEY, workspaceId);
  if (!storage || !isTripsListSnapshot(storage.value)) {
    return null;
  }

  const nextEnvelope: CacheEnvelope<TripsListSnapshot> = {
    cachedAt: storage.cachedAt,
    value: storage.value,
  };
  tripsListMemory.set(workspaceId, nextEnvelope);
  return toSnapshot(nextEnvelope, TRAVEL_TRIPS_LIST_FRESH_TTL_MS);
};

export const writeCachedTravelTripsList = (
  workspaceId: string,
  snapshot: TripsListSnapshot,
): void => {
  const envelope: CacheEnvelope<TripsListSnapshot> = {
    cachedAt: Date.now(),
    value: snapshot,
  };
  tripsListMemory.set(workspaceId, envelope);
  writeToStorage(TRAVEL_TRIPS_LIST_STORAGE_KEY, workspaceId, envelope);
};

export const readCachedTravelTripDetail = (
  workspaceId: string,
  tripId: string,
): CachedSnapshot<TripDetailSnapshot> | null => {
  const cacheKey = makeTripDetailCacheKey(workspaceId, tripId);
  const memory = readFromMemory(tripDetailMemory, cacheKey);
  if (memory) {
    if (!isTripDetailSnapshot(memory.value)) {
      tripDetailMemory.delete(cacheKey);
      return null;
    }
    return toSnapshot(memory, TRAVEL_TRIP_DETAIL_FRESH_TTL_MS);
  }

  const storage = readFromStorage<unknown>(TRAVEL_TRIP_DETAIL_STORAGE_KEY, cacheKey);
  if (!storage || !isTripDetailSnapshot(storage.value)) {
    return null;
  }

  const nextEnvelope: CacheEnvelope<TripDetailSnapshot> = {
    cachedAt: storage.cachedAt,
    value: storage.value,
  };
  tripDetailMemory.set(cacheKey, nextEnvelope);
  return toSnapshot(nextEnvelope, TRAVEL_TRIP_DETAIL_FRESH_TTL_MS);
};

export const writeCachedTravelTripDetail = (
  workspaceId: string,
  tripId: string,
  snapshot: TripDetailSnapshot,
): void => {
  const cacheKey = makeTripDetailCacheKey(workspaceId, tripId);
  const envelope: CacheEnvelope<TripDetailSnapshot> = {
    cachedAt: Date.now(),
    value: snapshot,
  };
  tripDetailMemory.set(cacheKey, envelope);
  writeToStorage(TRAVEL_TRIP_DETAIL_STORAGE_KEY, cacheKey, envelope);
};
