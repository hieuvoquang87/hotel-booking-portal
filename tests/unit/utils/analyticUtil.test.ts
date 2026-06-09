import { track } from '@/utils/analyticUtil';

describe('track', () => {
  const original = process.env.NODE_ENV;
  afterEach(() => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = original;
    jest.restoreAllMocks();
  });

  it('logs the event to console.debug in development', () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'development';
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    track({ name: 'no_results', filters: { stars: 4, min: null, max: null } });
    expect(spy).toHaveBeenCalledWith('[track]', expect.objectContaining({ name: 'no_results' }));
  });

  it('is a no-op in production (does not throw, does not log)', () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    expect(() =>
      track({
        name: 'search_performed',
        city: 'chicago',
        country: 'usa',
        filters: { stars: null, min: null, max: null, sort: 'rating' },
      }),
    ).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  // M5 analytics events
  it('logs hotel_viewed event in development', () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'development';
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    track({ name: 'hotel_viewed', hotelId: 'hotel-01' });
    expect(spy).toHaveBeenCalledWith('[track]', expect.objectContaining({ name: 'hotel_viewed' }));
  });

  it('logs availability_checked event in development', () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'development';
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    track({ name: 'availability_checked', hotelId: 'hotel-01', nights: 3 });
    expect(spy).toHaveBeenCalledWith(
      '[track]',
      expect.objectContaining({ name: 'availability_checked' }),
    );
  });

  it('logs no_rooms event in development', () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'development';
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    track({ name: 'no_rooms', hotelId: 'hotel-01' });
    expect(spy).toHaveBeenCalledWith('[track]', expect.objectContaining({ name: 'no_rooms' }));
  });
});
