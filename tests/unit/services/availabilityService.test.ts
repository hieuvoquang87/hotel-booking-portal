import { HotelNotFoundError, InvalidDateRangeError } from '@/types/domain';
import { checkAvailability } from '@/services/availabilityService';

// hotel-01 room available_dates from seed:
//   room-01a: ['2026-07-10', '2026-07-11', '2026-07-12'] (3 nights)
//   room-01b: ['2026-07-10', '2026-07-11'] (2 nights)

describe('checkAvailability', () => {
  it('returns only rooms available for every night in range', async () => {
    // checkIn=2026-07-10, checkOut=2026-07-13 → nights=[07-10,07-11,07-12]
    // room-01a has all three → included
    // room-01b missing 2026-07-12 → excluded
    const result = await checkAvailability('hotel-01', '2026-07-10', '2026-07-13', { delayMs: 0 });
    expect(result).toHaveLength(1);
    expect(result[0].roomId).toBe('room-01a');
    expect(result[0]).toMatchObject({
      roomId: 'room-01a',
      type: expect.any(String),
      pricePerNight: expect.any(Number),
      bedType: expect.any(String),
      maxOccupancy: expect.any(Number),
    });
  });

  it('returns all rooms available for a short range both rooms cover', async () => {
    // checkIn=2026-07-10, checkOut=2026-07-12 → nights=[07-10,07-11]
    // both room-01a and room-01b have those two dates
    const result = await checkAvailability('hotel-01', '2026-07-10', '2026-07-12', { delayMs: 0 });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.roomId)).toContain('room-01a');
    expect(result.map((r) => r.roomId)).toContain('room-01b');
  });

  it('returns [] for a hotel with no availability', async () => {
    // hotel-04 has one room with empty available_dates
    expect(await checkAvailability('hotel-04', '2026-07-10', '2026-07-11', { delayMs: 0 })).toEqual([]);
  });

  it('returns [] for dates outside the dataset window', async () => {
    expect(await checkAvailability('hotel-01', '2026-08-01', '2026-08-02', { delayMs: 0 })).toEqual([]);
  });

  it('throws InvalidDateRangeError when checkout <= checkin', async () => {
    await expect(
      checkAvailability('hotel-01', '2026-07-12', '2026-07-12', { delayMs: 0 }),
    ).rejects.toBeInstanceOf(InvalidDateRangeError);
  });

  it('throws HotelNotFoundError for an unknown id', async () => {
    await expect(
      checkAvailability('hotel-999', '2026-07-10', '2026-07-11', { delayMs: 0 }),
    ).rejects.toBeInstanceOf(HotelNotFoundError);
  });

  // M5: AvailableRoom must carry bedCount, squareFootage, amenities
  // Seed values for room-01a: bedCount=1, squareFootage=450, amenities=['city_view','mini_bar']
  it('returned rooms include bedCount, squareFootage, and amenities from the seed', async () => {
    // checkIn=2026-07-10, checkOut=2026-07-13 → only room-01a qualifies
    const result = await checkAvailability('hotel-01', '2026-07-10', '2026-07-13', { delayMs: 0 });
    expect(result).toHaveLength(1);
    const room = result[0];
    expect(room.roomId).toBe('room-01a');
    expect(room.bedCount).toBe(1);
    expect(room.squareFootage).toBe(450);
    expect(room.amenities).toEqual(['city_view', 'mini_bar']);
  });
});
