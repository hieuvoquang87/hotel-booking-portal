import { HotelNotFoundError, InvalidDateRangeError } from './domain';

describe('domain errors', () => {
  it('InvalidDateRangeError is an Error with a stable name', () => {
    const err = new InvalidDateRangeError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('InvalidDateRangeError');
    expect(err.message).toMatch(/check-out/i);
  });

  it('HotelNotFoundError includes the id', () => {
    const err = new HotelNotFoundError('hotel-99');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('HotelNotFoundError');
    expect(err.message).toContain('hotel-99');
  });
});
