import { isRoomAvailable, nightsInRange } from '../lib/availability';
import { HotelNotFoundError, InvalidDateRangeError, type AvailableRoom } from '../types/domain';
import { track } from '../utils/analyticUtil';
import { buildCacheKey, createAvailabilityCache, type CacheStore } from './cache';
import { getResilienceConfig } from './config';
import { getHotelById } from './hotelService';
import { createResilienceController, type ResilienceController } from './resilience';

const DEFAULT_LATENCY_MS = Number(process.env.AVAILABILITY_LATENCY_MS ?? 1000);

export class AvailabilityUpstreamError extends Error {
  readonly retryable = true;
  constructor() {
    super('upstream availability error');
    this.name = 'AvailabilityUpstreamError';
  }
}

let _cache: CacheStore | null = null;
let _controller: ResilienceController<AvailableRoom[]> | null = null;

let _callCtx = { id: '', checkIn: '', checkOut: '', delayMs: 0 };

function getCache(): CacheStore {
  if (!_cache) {
    const config = getResilienceConfig();
    _cache = createAvailabilityCache(config);
  }
  return _cache;
}

async function coreCall(): Promise<AvailableRoom[]> {
  const { id, checkIn, checkOut, delayMs } = _callCtx;
  const config = getResilienceConfig();

  let ms = delayMs;
  if (config.faultEnabled) {
    ms = delayMs * config.faultLatencyMultiplier;
  }

  await new Promise<void>((resolve) => setTimeout(resolve, ms));

  if (config.faultEnabled && Math.random() < config.faultErrorRate) {
    throw new AvailabilityUpstreamError();
  }

  const hotel = getHotelById(id);
  const nights = nightsInRange(checkIn, checkOut);
  return hotel!.rooms
    .filter((room) => isRoomAvailable(room, nights))
    .map((room) => ({
      roomId: room.roomId,
      type: room.type,
      pricePerNight: room.pricePerNight,
      bedType: room.bedType,
      bedCount: room.bedCount,
      maxOccupancy: room.maxOccupancy,
      squareFootage: room.squareFootage,
      amenities: room.amenities,
    }));
}

function getController(): ResilienceController<AvailableRoom[]> {
  if (!_controller) {
    const config = getResilienceConfig();
    _controller = createResilienceController(
      coreCall,
      {
        timeoutMs: config.availabilityTimeoutMs,
        maxRetries: config.availabilityMaxRetries,
        breakerFailureThreshold: config.breakerFailureThreshold,
        breakerCooldownMs: config.breakerCooldownMs,
      },
      (state) => {
        track({ name: 'availability_breaker_transition', hotelId: _callCtx.id, state });
      },
    );
  }
  return _controller;
}

export async function checkAvailability(
  id: string,
  checkIn: string,
  checkOut: string,
  opts: { delayMs?: number } = {},
): Promise<AvailableRoom[]> {
  if (!(checkOut > checkIn)) {
    throw new InvalidDateRangeError();
  }

  const hotel = getHotelById(id);
  if (!hotel) throw new HotelNotFoundError(id);

  const cache = getCache();
  const key = buildCacheKey(id, checkIn, checkOut);
  const start = Date.now();

  const fresh = cache.readFresh(key);
  if (fresh !== null) {
    track({ name: 'availability_latency', hotelId: id, durationMs: Date.now() - start, cacheHit: true });
    return fresh;
  }

  track({ name: 'availability_cache_miss', hotelId: id });
  _callCtx = { id, checkIn, checkOut, delayMs: opts.delayMs ?? DEFAULT_LATENCY_MS };

  try {
    const rooms = await getController().call();
    cache.write(key, rooms);
    track({ name: 'availability_latency', hotelId: id, durationMs: Date.now() - start, cacheHit: false });
    return rooms;
  } catch (err) {
    const stale = cache.readStale(key);
    if (stale !== null) {
      track({ name: 'availability_latency', hotelId: id, durationMs: Date.now() - start, cacheHit: false });
      return stale;
    }
    throw err;
  }
}

export function __resetAvailabilityService(): void {
  _cache = null;
  _controller = null;
}

export function __resetAvailabilityController(): void {
  _controller = null;
}
