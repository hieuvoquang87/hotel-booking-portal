import { filterByStars, filterByPrice } from '../../../lib/filters';
import { sortHotels } from '../../../lib/sort';
import { makeHotel, makeRoom } from '../../fixtures';

// A realistic-but-generous location subset. Architecture §7: city ≈ 4, country ≤ ~20;
// 50 exercises more than any real subset while staying well inside the budget.
function buildSubset(n: number) {
  return Array.from({ length: n }, (_, i) =>
    makeHotel({
      id: `h${i}`,
      starRating: (i % 5) + 1,
      rooms: [makeRoom({ pricePerNight: 100 + (i % 10) * 25 })],
    }),
  );
}

test('filter + sort over a location subset completes in < 100ms', () => {
  const hotels = buildSubset(50);
  const start = performance.now();
  const result = sortHotels(filterByPrice(filterByStars(hotels, 3), 100, 300), 'price-asc');
  const elapsed = performance.now() - start;
  expect(result.length).toBeGreaterThan(0);
  expect(elapsed).toBeLessThan(100);
});
