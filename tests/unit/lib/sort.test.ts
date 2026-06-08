import { makeHotel, makeRoom } from '@/tests/fixtures';
import { sortHotels } from '@/lib/sort';

const hotel = (id: string, price: number, rating: number, stars: number) =>
  makeHotel({
    id,
    rooms: [makeRoom({ pricePerNight: price })],
    overallRating: rating,
    starRating: stars,
  });

describe('sortHotels', () => {
  const hotels = [hotel('a', 300, 4.0, 3), hotel('b', 100, 4.8, 5), hotel('c', 200, 4.5, 4)];

  it('price-asc orders by priceFrom ascending', () => {
    expect(sortHotels(hotels, 'price-asc').map((h) => h.id)).toEqual(['b', 'c', 'a']);
  });
  it('price-desc orders by priceFrom descending', () => {
    expect(sortHotels(hotels, 'price-desc').map((h) => h.id)).toEqual(['a', 'c', 'b']);
  });
  it('rating orders by overallRating descending', () => {
    expect(sortHotels(hotels, 'rating').map((h) => h.id)).toEqual(['b', 'c', 'a']);
  });
  it('stars orders by starRating descending', () => {
    expect(sortHotels(hotels, 'stars').map((h) => h.id)).toEqual(['b', 'c', 'a']);
  });
  it('is stable for ties (preserves input order)', () => {
    const tied = [hotel('x', 100, 4, 4), hotel('y', 100, 4, 4)];
    expect(sortHotels(tied, 'price-asc').map((h) => h.id)).toEqual(['x', 'y']);
  });
  it('does not mutate the input array', () => {
    const input = [...hotels];
    sortHotels(input, 'price-asc');
    expect(input.map((h) => h.id)).toEqual(['a', 'b', 'c']);
  });
});
