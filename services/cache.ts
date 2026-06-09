import type { AvailableRoom } from '../types/domain';
import type { ResilienceConfig } from './config';

export type CacheKey = string;

export function buildCacheKey(
  hotelId: string,
  checkIn: string,
  checkOut: string
): CacheKey {
  return `${hotelId}::${checkIn}::${checkOut}`;
}

type CacheEntry = {
  rooms: AvailableRoom[];
  writtenAt: number;
  lastAccessedAt: number;
};

export type CacheStore = {
  readFresh(key: CacheKey): AvailableRoom[] | null;
  readStale(key: CacheKey): AvailableRoom[] | null;
  write(key: CacheKey, rooms: AvailableRoom[]): void;
  size(): number;
  clear(): void;
};

export function createAvailabilityCache(
  config: Pick<ResilienceConfig, 'cacheTtlMs' | 'cacheMaxEntries'>
): CacheStore {
  const store = new Map<CacheKey, CacheEntry>();

  function evictLru(): void {
    let lruKey: CacheKey | null = null;
    let lruTime = Infinity;
    for (const [key, entry] of store) {
      if (entry.lastAccessedAt < lruTime) {
        lruTime = entry.lastAccessedAt;
        lruKey = key;
      }
    }
    if (lruKey !== null) {
      store.delete(lruKey);
    }
  }

  return {
    readFresh(key: CacheKey): AvailableRoom[] | null {
      const entry = store.get(key);
      if (!entry) return null;
      const now = Date.now();
      if (now - entry.writtenAt > config.cacheTtlMs) return null;
      entry.lastAccessedAt = now;
      return entry.rooms;
    },

    readStale(key: CacheKey): AvailableRoom[] | null {
      const entry = store.get(key);
      if (!entry) return null;
      entry.lastAccessedAt = Date.now();
      return entry.rooms;
    },

    write(key: CacheKey, rooms: AvailableRoom[]): void {
      const now = Date.now();
      if (!store.has(key) && store.size >= config.cacheMaxEntries) {
        evictLru();
      }
      store.set(key, { rooms, writtenAt: now, lastAccessedAt: now });
    },

    size(): number {
      return store.size;
    },

    clear(): void {
      store.clear();
    },
  };
}
