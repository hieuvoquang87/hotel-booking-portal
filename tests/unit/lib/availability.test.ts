import type { Room } from '@/types/domain';
import { isRoomAvailable, nightsInRange } from '@/lib/availability';

const room = (availableDates: string[]): Room => ({
  roomId: 'r',
  type: 'Std',
  bedType: 'Queen',
  bedCount: 1,
  maxOccupancy: 2,
  squareFootage: 300,
  pricePerNight: 200,
  amenities: [],
  availableDates,
});

describe('nightsInRange', () => {
  it('excludes the checkout date', () => {
    expect(nightsInRange('2026-07-10', '2026-07-12')).toEqual(['2026-07-10', '2026-07-11']);
  });
  it('returns a single night for a 1-night stay', () => {
    expect(nightsInRange('2026-07-10', '2026-07-11')).toEqual(['2026-07-10']);
  });
});

describe('isRoomAvailable', () => {
  const nights = nightsInRange('2026-07-10', '2026-07-12'); // [10, 11]
  it('true when every night is in available_dates', () => {
    expect(isRoomAvailable(room(['2026-07-10', '2026-07-11', '2026-07-12']), nights)).toBe(true);
  });
  it('false when any night is missing', () => {
    expect(isRoomAvailable(room(['2026-07-10']), nights)).toBe(false);
  });
  it('false for an empty availability list', () => {
    expect(isRoomAvailable(room([]), nights)).toBe(false);
  });
  it('false when there are no nights', () => {
    expect(isRoomAvailable(room(['2026-07-10']), [])).toBe(false);
  });
});
