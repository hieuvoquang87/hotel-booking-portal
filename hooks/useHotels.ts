'use client';

import { useQuery } from '@tanstack/react-query';
import { getJson } from '@/lib/fetcher';
import type { Hotel } from '@/types/domain';

export function useHotels(query: { country?: string | null; city?: string | null }) {
  const country = query.country ?? null;
  const city = query.city ?? null;

  return useQuery({
    queryKey: ['hotels', country, city],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (country) sp.set('country', country);
      if (city) sp.set('city', city);
      return getJson<Hotel[]>(`/api/hotels?${sp.toString()}`);
    },
    enabled: !!(country || city), // location-first: nothing loads until a destination is chosen
  });
}
