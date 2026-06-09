import {
  track,
  registerAnalyticsAdapter,
  __resetAnalyticsAdapters,
  type AnalyticsEvent,
} from '../../../utils/analyticUtil';

// Reset BEFORE each test so the load-time default DEV adapter never leaks into a test's
// fan-out count (afterEach would leave it registered for the first test).
beforeEach(() => __resetAnalyticsAdapters());

const sample: AnalyticsEvent = { name: 'hotel_viewed', hotelId: 'h1' };

test('track fans out to every registered adapter', () => {
  const a = jest.fn();
  const b = jest.fn();
  registerAnalyticsAdapter(a);
  registerAnalyticsAdapter(b);
  track(sample);
  expect(a).toHaveBeenCalledWith(sample);
  expect(b).toHaveBeenCalledWith(sample);
});

test('a throwing adapter does not break the others or track()', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const bad = jest.fn(() => {
    throw new Error('boom');
  });
  const good = jest.fn();
  registerAnalyticsAdapter(bad);
  registerAnalyticsAdapter(good);
  expect(() => track(sample)).not.toThrow();
  expect(good).toHaveBeenCalledWith(sample);
  expect(consoleSpy).toHaveBeenCalledWith('[analytics] adapter threw:', expect.any(Error));
  consoleSpy.mockRestore();
});

test('registerAnalyticsAdapter returns a working unsubscribe', () => {
  const a = jest.fn();
  const off = registerAnalyticsAdapter(a);
  off();
  track(sample);
  expect(a).not.toHaveBeenCalled();
});

test('accepts every event in the consolidated union', () => {
  const seen: AnalyticsEvent[] = [];
  registerAnalyticsAdapter((e) => seen.push(e));
  const events: AnalyticsEvent[] = [
    { name: 'search_performed', city: 'Paris', country: 'France',
      filters: { stars: 4, min: null, max: null, sort: 'price-asc' } },
    { name: 'no_results', filters: { stars: 5, min: 0, max: 100 } },
    { name: 'hotel_viewed', hotelId: 'h1' },
    { name: 'availability_checked', hotelId: 'h1', nights: 2 },
    { name: 'no_rooms', hotelId: 'h1' },
  ];
  events.forEach(track);
  expect(seen).toHaveLength(5);
});

test('a default DEV console adapter is registered at load', () => {
  const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  jest.resetModules();
  // Re-import a fresh module instance so the load-time default adapter registers.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fresh = require('../../../utils/analyticUtil') as typeof import('../../../utils/analyticUtil');
  fresh.track({ name: 'hotel_viewed', hotelId: 'h1' });
  expect(spy).toHaveBeenCalledWith('[track]', { name: 'hotel_viewed', hotelId: 'h1' });
  spy.mockRestore();
  jest.resetModules(); // restore registry for subsequent tests
});
