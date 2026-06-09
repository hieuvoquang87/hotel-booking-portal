/** @jest-environment node */
import { buildCacheKey, createAvailabilityCache } from '../../../services/cache';
import type { AvailableRoom } from '../../../types/domain';

const room1: AvailableRoom = {
  roomId: 'r1',
  type: 'Deluxe',
  pricePerNight: 150,
  bedType: 'King',
  bedCount: 1,
  maxOccupancy: 2,
  squareFootage: 400,
  amenities: ['WiFi'],
};

const room2: AvailableRoom = {
  roomId: 'r2',
  type: 'Suite',
  pricePerNight: 300,
  bedType: 'Queen',
  bedCount: 2,
  maxOccupancy: 4,
  squareFootage: 600,
  amenities: ['WiFi', 'Pool'],
};

const TTL = 60_000;
const MAX = 3;

function makeCache() {
  return createAvailabilityCache({ cacheTtlMs: TTL, cacheMaxEntries: MAX });
}

describe('buildCacheKey', () => {
  it('produces a deterministic key', () => {
    expect(buildCacheKey('h1', '2025-01-01', '2025-01-03')).toBe(
      'h1::2025-01-01::2025-01-03'
    );
  });
});

describe('readFresh', () => {
  it('returns null for a missing key', () => {
    const cache = makeCache();
    expect(cache.readFresh('nonexistent')).toBeNull();
  });

  it('returns rooms for an entry written within TTL', () => {
    const cache = makeCache();
    const key = buildCacheKey('h1', '2025-01-01', '2025-01-03');
    cache.write(key, [room1]);
    expect(cache.readFresh(key)).toEqual([room1]);
  });

  it('returns null for an entry past TTL', () => {
    const dateSpy = jest.spyOn(Date, 'now');
    dateSpy.mockReturnValue(1000);
    const cache = makeCache();
    const key = buildCacheKey('h1', '2025-01-01', '2025-01-03');
    cache.write(key, [room1]);

    dateSpy.mockReturnValue(1000 + TTL + 1);
    expect(cache.readFresh(key)).toBeNull();
    dateSpy.mockRestore();
  });
});

describe('readStale', () => {
  it('returns null for a missing key', () => {
    const cache = makeCache();
    expect(cache.readStale('nonexistent')).toBeNull();
  });

  it('returns rooms for an entry within TTL', () => {
    const cache = makeCache();
    const key = buildCacheKey('h2', '2025-02-01', '2025-02-05');
    cache.write(key, [room2]);
    expect(cache.readStale(key)).toEqual([room2]);
  });

  it('returns rooms for an entry past TTL (stale fallback)', () => {
    const dateSpy = jest.spyOn(Date, 'now');
    dateSpy.mockReturnValue(1000);
    const cache = makeCache();
    const key = buildCacheKey('h2', '2025-02-01', '2025-02-05');
    cache.write(key, [room2]);

    dateSpy.mockReturnValue(1000 + TTL + 1);
    expect(cache.readStale(key)).toEqual([room2]);
    dateSpy.mockRestore();
  });
});

describe('write', () => {
  it('overwrites an existing entry and readFresh sees the new value', () => {
    const cache = makeCache();
    const key = buildCacheKey('h3', '2025-03-01', '2025-03-04');
    cache.write(key, [room1]);
    cache.write(key, [room2]);
    expect(cache.readFresh(key)).toEqual([room2]);
  });
});

describe('LRU eviction', () => {
  it('evicts the least recently used entry when capacity is exceeded', () => {
    const dateSpy = jest.spyOn(Date, 'now');

    dateSpy.mockReturnValue(1000);
    const cache = makeCache();
    const k1 = buildCacheKey('h1', '2025-01-01', '2025-01-02');
    const k2 = buildCacheKey('h2', '2025-01-01', '2025-01-02');
    const k3 = buildCacheKey('h3', '2025-01-01', '2025-01-02');
    const k4 = buildCacheKey('h4', '2025-01-01', '2025-01-02');

    dateSpy.mockReturnValue(1000);
    cache.write(k1, [room1]);

    dateSpy.mockReturnValue(2000);
    cache.write(k2, [room1]);

    dateSpy.mockReturnValue(3000);
    cache.write(k3, [room1]);

    expect(cache.size()).toBe(3);

    dateSpy.mockReturnValue(4000);
    cache.write(k4, [room1]);

    expect(cache.size()).toBe(MAX);
    expect(cache.readFresh(k1)).toBeNull();
    expect(cache.readFresh(k2)).toEqual([room1]);
    expect(cache.readFresh(k3)).toEqual([room1]);
    expect(cache.readFresh(k4)).toEqual([room1]);

    dateSpy.mockRestore();
  });

  it('readFresh promotes an entry so the older non-read entry is evicted instead', () => {
    const dateSpy = jest.spyOn(Date, 'now');

    const cache = makeCache();
    const k1 = buildCacheKey('h1', '2025-01-01', '2025-01-02');
    const k2 = buildCacheKey('h2', '2025-01-01', '2025-01-02');
    const k3 = buildCacheKey('h3', '2025-01-01', '2025-01-02');
    const k4 = buildCacheKey('h4', '2025-01-01', '2025-01-02');

    dateSpy.mockReturnValue(1000);
    cache.write(k1, [room1]);

    dateSpy.mockReturnValue(2000);
    cache.write(k2, [room1]);

    dateSpy.mockReturnValue(3000);
    cache.write(k3, [room1]);

    // Read k1 via readFresh at t=4000 — promotes k1, making k2 the new LRU
    dateSpy.mockReturnValue(4000);
    expect(cache.readFresh(k1)).toEqual([room1]);

    // Write k4 — should evict k2 (now the LRU), not k1
    dateSpy.mockReturnValue(5000);
    cache.write(k4, [room1]);

    expect(cache.size()).toBe(MAX);
    expect(cache.readFresh(k2)).toBeNull(); // k2 was evicted
    expect(cache.readFresh(k1)).toEqual([room1]); // k1 was promoted, survives
    expect(cache.readFresh(k3)).toEqual([room1]);
    expect(cache.readFresh(k4)).toEqual([room1]);

    dateSpy.mockRestore();
  });

  it('readStale promotes an entry so the older non-read entry is evicted instead', () => {
    const dateSpy = jest.spyOn(Date, 'now');

    const cache = makeCache();
    const k1 = buildCacheKey('h1', '2025-01-01', '2025-01-02');
    const k2 = buildCacheKey('h2', '2025-01-01', '2025-01-02');
    const k3 = buildCacheKey('h3', '2025-01-01', '2025-01-02');
    const k4 = buildCacheKey('h4', '2025-01-01', '2025-01-02');

    dateSpy.mockReturnValue(1000);
    cache.write(k1, [room1]);

    dateSpy.mockReturnValue(2000);
    cache.write(k2, [room1]);

    dateSpy.mockReturnValue(3000);
    cache.write(k3, [room1]);

    // Read k1 via readStale at t=4000 — promotes k1, making k2 the new LRU
    dateSpy.mockReturnValue(4000);
    expect(cache.readStale(k1)).toEqual([room1]);

    // Write k4 — should evict k2 (now the LRU), not k1
    dateSpy.mockReturnValue(5000);
    cache.write(k4, [room1]);

    expect(cache.size()).toBe(MAX);
    expect(cache.readStale(k2)).toBeNull(); // k2 was evicted
    expect(cache.readStale(k1)).toEqual([room1]); // k1 was promoted, survives
    expect(cache.readStale(k3)).toEqual([room1]);
    expect(cache.readStale(k4)).toEqual([room1]);

    dateSpy.mockRestore();
  });
});

describe('clear', () => {
  it('empties the store', () => {
    const cache = makeCache();
    const key = buildCacheKey('h1', '2025-01-01', '2025-01-02');
    cache.write(key, [room1]);
    expect(cache.size()).toBe(1);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.readFresh(key)).toBeNull();
    expect(cache.readStale(key)).toBeNull();
  });
});
