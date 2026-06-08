'use client';

import { useQuery } from '@tanstack/react-query';
import { getJson } from '@/lib/fetcher';
import type { AvailableRoom } from '@/types/domain';

export function useAvailability(id: string, checkIn: string | null, checkOut: string | null) {
  const enabled = !!(checkIn && checkOut && checkOut > checkIn);

  return useQuery({
    queryKey: ['availability', id, checkIn, checkOut],
    queryFn: () =>
      getJson<AvailableRoom[]>(
        `/api/hotels/${id}/rooms?check_in=${checkIn}&check_out=${checkOut}`,
      ),
    enabled,
    retry: 2, // the slow third-party path benefits from a couple of retries
  });
}
