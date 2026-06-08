import type { Hotel, Room } from '../types/domain';

export function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    roomId: 'room-x',
    type: 'Standard',
    bedType: 'Queen',
    bedCount: 1,
    maxOccupancy: 2,
    squareFootage: 300,
    pricePerNight: 200,
    amenities: [],
    availableDates: ['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14'],
    ...overrides,
  };
}

export function makeHotel(overrides: Partial<Hotel> = {}): Hotel {
  const rooms = overrides.rooms ?? [makeRoom()];
  return {
    id: 'hotel-x',
    name: 'Test Hotel',
    description: 'desc',
    starRating: 4,
    overallRating: 4.5,
    reviewCount: 100,
    address: { street: '1 St', city: 'Testville', state: 'TS', zipCode: '00000', country: 'USA' },
    amenities: [],
    policies: { checkInTime: '15:00', checkOutTime: '11:00', cancellation: 'free' },
    priceFrom: Math.min(...rooms.map((r) => r.pricePerNight)),
    photoUrl: '/images/hotel-placeholder.svg',
    rooms,
    ...overrides,
  };
}
