// tests/unit/hooks/useFilteredHotels.test.ts
import { makeHotel, makeRoom } from '@/tests/fixtures';
import { filterSortPaginate } from '@/hooks/useFilteredHotels';

const hotel = (id: string, stars: number, price: number) =>
  makeHotel({ id, starRating: stars, rooms: [makeRoom({ pricePerNight: price })] });

describe('filterSortPaginate', () => {
  const hotels = [hotel('a', 3, 300), hotel('b', 5, 100), hotel('c', 4, 200)];

  it('filters by minimum stars then sorts by price ascending', () => {
    const result = filterSortPaginate(hotels, {
      stars: 4,
      min: null,
      max: null,
      sort: 'price-asc',
      page: 1,
    });
    expect(result.items.map((h) => h.id)).toEqual(['b', 'c']);
    expect(result.total).toBe(2);
  });

  it('treats a single price bound as open-ended', () => {
    const result = filterSortPaginate(hotels, {
      stars: null,
      min: 250,
      max: null,
      sort: 'price-asc',
      page: 1,
    });
    expect(result.items.map((h) => h.id)).toEqual(['a']); // only 300 >= 250
  });

  it('skips filtering when stars and both price bounds are null', () => {
    const result = filterSortPaginate(hotels, {
      stars: null,
      min: null,
      max: null,
      sort: 'stars',
      page: 1,
    });
    expect(result.total).toBe(3);
    expect(result.items[0].id).toBe('b'); // 5-star sorts first
  });

  it('does not mutate the input array', () => {
    const input = [...hotels];
    filterSortPaginate(input, { stars: null, min: null, max: null, sort: 'price-asc', page: 1 });
    expect(input.map((h) => h.id)).toEqual(['a', 'b', 'c']);
  });
});
