'use client';

import { useMemo } from 'react';
import { filterByPrice, filterByStars } from '@/lib/filters';
import { paginate, type Page } from '@/lib/paginate';
import { sortHotels, type SortKey } from '@/lib/sort';
import type { Hotel } from '@/types/domain';

export type RefineParams = {
  stars: number | null;
  min: number | null;
  max: number | null;
  sort: SortKey;
  page: number;
};

export function filterSortPaginate(hotels: Hotel[], params: RefineParams): Page<Hotel> {
  let result = hotels;

  if (params.stars !== null) {
    result = filterByStars(result, params.stars);
  }
  if (params.min !== null || params.max !== null) {
    const min = params.min ?? 0;
    const max = params.max ?? Number.POSITIVE_INFINITY;
    result = filterByPrice(result, min, max);
  }

  // Intentional asymmetry: filterByPrice keeps a hotel if ANY room falls in range,
  // while sortHotels orders by priceFrom (the hotel's cheapest room). So a hotel can
  // match on a pricier room yet still sort by its lowest advertised price.
  result = sortHotels(result, params.sort);
  return paginate(result, params.page);
}

export function useFilteredHotels(hotels: Hotel[], params: RefineParams): Page<Hotel> {
  return useMemo(
    () => filterSortPaginate(hotels, params),
    // Primitive deps keep recompute under the <100ms budget on unrelated renders.
    [hotels, params.stars, params.min, params.max, params.sort, params.page],
  );
}
