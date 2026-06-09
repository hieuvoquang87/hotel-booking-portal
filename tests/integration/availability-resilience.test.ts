/** @jest-environment node */
import {
  __resetAnalyticsAdapters,
  registerAnalyticsAdapter,
  type AnalyticsEvent,
} from '@/utils/analyticUtil';
import {
  __resetAvailabilityController,
  __resetAvailabilityService,
  checkAvailability,
} from '@/services/availabilityService';
import { BreakerOpenError } from '@/services/resilience';

const CHECK_IN = '2026-07-10';
const CHECK_OUT = '2026-07-12';
const HOTEL_ID = 'hotel-01';

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };

  process.env.BREAKER_FAILURE_THRESHOLD = '2';
  process.env.BREAKER_COOLDOWN_MS = '100';
  process.env.CACHE_TTL_MS = '60000';
  process.env.AVAILABILITY_TIMEOUT_MS = '5000';
  process.env.AVAILABILITY_MAX_RETRIES = '0';

  delete process.env.FAULT_INJECTION_ENABLED;
  delete process.env.FAULT_ERROR_RATE;

  __resetAvailabilityService();
  __resetAnalyticsAdapters();
});

afterEach(() => {
  process.env = savedEnv;
});

describe('Scenario 1: Fresh cache hit skips upstream', () => {
  it('first call emits cache_miss; second call hits cache without cache_miss', async () => {
    const events: AnalyticsEvent[] = [];
    const unsubscribe = registerAnalyticsAdapter((e) => events.push(e));

    await checkAvailability(HOTEL_ID, CHECK_IN, CHECK_OUT, { delayMs: 0 });

    const misses1 = events.filter((e) => e.name === 'availability_cache_miss');
    expect(misses1).toHaveLength(1);

    events.length = 0;

    await checkAvailability(HOTEL_ID, CHECK_IN, CHECK_OUT, { delayMs: 0 });

    const misses2 = events.filter((e) => e.name === 'availability_cache_miss');
    expect(misses2).toHaveLength(0);

    const latency = events.find((e) => e.name === 'availability_latency');
    expect(latency).toBeDefined();
    expect((latency as Extract<AnalyticsEvent, { name: 'availability_latency' }>).cacheHit).toBe(true);

    unsubscribe();
  });
});

describe('Scenario 2: 100% errors → breaker opens, subsequent call throws BreakerOpenError', () => {
  it('opens the breaker after threshold failures and fast-fails next call', async () => {
    const events: AnalyticsEvent[] = [];
    const unsubscribe = registerAnalyticsAdapter((e) => events.push(e));

    process.env.FAULT_INJECTION_ENABLED = 'true';
    process.env.FAULT_ERROR_RATE = '1.0';
    __resetAvailabilityController();

    const THRESHOLD = 2;

    for (let i = 0; i < THRESHOLD; i++) {
      await expect(
        checkAvailability(HOTEL_ID, CHECK_IN, CHECK_OUT, { delayMs: 0 }),
      ).rejects.toThrow();
    }

    await expect(
      checkAvailability(HOTEL_ID, CHECK_IN, CHECK_OUT, { delayMs: 0 }),
    ).rejects.toThrow(BreakerOpenError);

    const transitions = events.filter((e) => e.name === 'availability_breaker_transition');
    expect(transitions.length).toBeGreaterThanOrEqual(1);
    const openTransition = transitions.find(
      (e) =>
        e.name === 'availability_breaker_transition' &&
        (e as Extract<AnalyticsEvent, { name: 'availability_breaker_transition' }>).state === 'OPEN',
    );
    expect(openTransition).toBeDefined();

    unsubscribe();
  });
});

describe('Scenario 3: Stale cache served when breaker is open', () => {
  it('returns stale rooms instead of throwing when cache is populated', async () => {
    const originalRooms = await checkAvailability(HOTEL_ID, CHECK_IN, CHECK_OUT, { delayMs: 0 });
    expect(originalRooms.length).toBeGreaterThan(0);

    process.env.FAULT_INJECTION_ENABLED = 'true';
    process.env.FAULT_ERROR_RATE = '1.0';
    __resetAvailabilityController();

    const THRESHOLD = 2;
    const results: Awaited<ReturnType<typeof checkAvailability>>[] = [];

    for (let i = 0; i < THRESHOLD; i++) {
      const rooms = await checkAvailability(HOTEL_ID, CHECK_IN, CHECK_OUT, { delayMs: 0 });
      results.push(rooms);
    }

    for (const rooms of results) {
      expect(rooms).toEqual(originalRooms);
    }

    const staleResult = await checkAvailability(HOTEL_ID, CHECK_IN, CHECK_OUT, { delayMs: 0 });
    expect(staleResult).toEqual(originalRooms);
  });
});

describe('Scenario 4: Metric events emitted', () => {
  it('emits availability_latency with cacheHit:false on first call and cacheHit:true on second', async () => {
    const events: AnalyticsEvent[] = [];
    const unsubscribe = registerAnalyticsAdapter((e) => events.push(e));

    await checkAvailability(HOTEL_ID, CHECK_IN, CHECK_OUT, { delayMs: 0 });

    const firstLatency = events.find(
      (e) => e.name === 'availability_latency',
    ) as Extract<AnalyticsEvent, { name: 'availability_latency' }> | undefined;
    expect(firstLatency).toBeDefined();
    expect(firstLatency!.cacheHit).toBe(false);
    expect(firstLatency!.durationMs).toBeGreaterThanOrEqual(0);

    events.length = 0;

    await checkAvailability(HOTEL_ID, CHECK_IN, CHECK_OUT, { delayMs: 0 });

    const secondLatency = events.find(
      (e) => e.name === 'availability_latency',
    ) as Extract<AnalyticsEvent, { name: 'availability_latency' }> | undefined;
    expect(secondLatency).toBeDefined();
    expect(secondLatency!.cacheHit).toBe(true);
    expect(secondLatency!.durationMs).toBeGreaterThanOrEqual(0);

    unsubscribe();
  });
});
