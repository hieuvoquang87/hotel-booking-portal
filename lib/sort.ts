import type { Hotel } from '../types/domain';

export type SortKey = 'price-asc' | 'price-desc' | 'rating' | 'stars';

const comparators: Record<SortKey, (a: Hotel, b: Hotel) => number> = {
  'price-asc': (a, b) => a.priceFrom - b.priceFrom,
  'price-desc': (a, b) => b.priceFrom - a.priceFrom,
  rating: (a, b) => b.overallRating - a.overallRating,
  stars: (a, b) => b.starRating - a.starRating,
};

export function sortHotels(hotels: Hotel[], key: SortKey): Hotel[] {
  return [...hotels].sort(comparators[key]);
}
