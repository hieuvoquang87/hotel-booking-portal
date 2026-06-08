import { mapHotel, mapLocation, mapRoom, type RawHotel } from '@/services/mappers';

const rawHotel: RawHotel = {
  id: 'hotel-01',
  name: 'The Grand Luminary',
  description: 'A luxury oasis.',
  star_rating: 5,
  overall_rating: 4.8,
  review_count: 1240,
  address: {
    street: '789 Skyline Blvd',
    city: 'Chicago',
    state: 'IL',
    zip_code: '60611',
    country: 'USA',
  },
  amenities: ['pool', 'spa'],
  policies: { check_in_time: '15:00', check_out_time: '11:00', cancellation: 'Free up to 24h' },
  rooms: [
    {
      room_id: 'room-01a',
      type: 'Deluxe King',
      bed_type: 'King',
      bed_count: 1,
      max_occupancy: 2,
      square_footage: 450,
      price_per_night: 299,
      room_amenities: ['city_view'],
      available_dates: ['2026-07-10'],
    },
    {
      room_id: 'room-01b',
      type: 'Standard Queen',
      bed_type: 'Queen',
      bed_count: 1,
      max_occupancy: 2,
      square_footage: 300,
      price_per_night: 199,
      room_amenities: [],
      available_dates: ['2026-07-10'],
    },
  ],
};

describe('mapRoom', () => {
  it('renames snake_case to camelCase domain fields', () => {
    expect(mapRoom(rawHotel.rooms[0])).toEqual({
      roomId: 'room-01a',
      type: 'Deluxe King',
      bedType: 'King',
      bedCount: 1,
      maxOccupancy: 2,
      squareFootage: 450,
      pricePerNight: 299,
      amenities: ['city_view'],
      availableDates: ['2026-07-10'],
    });
  });
});

describe('mapHotel', () => {
  const hotel = mapHotel(rawHotel);
  it('maps scalar + nested fields to domain shape', () => {
    expect(hotel.id).toBe('hotel-01');
    expect(hotel.starRating).toBe(5);
    expect(hotel.reviewCount).toBe(1240);
    expect(hotel.address).toEqual({
      street: '789 Skyline Blvd',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60611',
      country: 'USA',
    });
    expect(hotel.policies.checkInTime).toBe('15:00');
  });
  it('derives priceFrom from the cheapest room', () => {
    expect(hotel.priceFrom).toBe(199);
  });
  it('sets a placeholder photoUrl and omits contact', () => {
    expect(hotel.photoUrl).toBeTruthy();
    expect((hotel as Record<string, unknown>).contact).toBeUndefined();
  });
});

describe('mapLocation', () => {
  it('derives slugged location from a domain hotel', () => {
    expect(mapLocation(mapHotel(rawHotel))).toEqual({
      city: 'Chicago',
      country: 'USA',
      state: 'IL',
      citySlug: 'chicago',
      countrySlug: 'usa',
    });
  });
});
