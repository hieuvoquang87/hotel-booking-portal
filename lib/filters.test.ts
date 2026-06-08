import { makeHotel, makeRoom } from '../tests/fixtures';
import { filterByPrice, filterByStars } from './filters';

describe('filterByStars (minimum)', () => {
  const hotels = [
    makeHotel({ starRating: 3 }),
    makeHotel({ starRating: 4 }),
    makeHotel({ starRating: 5 }),
  ];
  it('keeps stars >= min', () => {
    expect(filterByStars(hotels, 4).map((h) => h.starRating)).toEqual([4, 5]);
  });
  it('min 0 keeps all', () => {
    expect(filterByStars(hotels, 0)).toHaveLength(3);
  });
});

describe('filterByPrice (any room in range)', () => {
  it('keeps a hotel whose cheapest room is in range', () => {
    const h = makeHotel({
      rooms: [makeRoom({ pricePerNight: 500 }), makeRoom({ pricePerNight: 150 })],
    });
    expect(filterByPrice([h], 100, 200)).toHaveLength(1);
  });
  it('keeps a hotel that matches only via a non-cheapest room', () => {
    const h = makeHotel({
      rooms: [makeRoom({ pricePerNight: 150 }), makeRoom({ pricePerNight: 800 })],
    });
    expect(filterByPrice([h], 700, 900)).toHaveLength(1);
  });
  it('drops a hotel with no room in range', () => {
    const h = makeHotel({ rooms: [makeRoom({ pricePerNight: 500 })] });
    expect(filterByPrice([h], 100, 200)).toHaveLength(0);
  });
});
