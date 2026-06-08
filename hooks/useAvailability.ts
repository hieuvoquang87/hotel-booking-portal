'use client';

import { useQuery } from '@tanstack/react-query';
import { getJson } from '@/lib/fetcher';
import type { AvailableRoom } from '@/types/domain';

export function useAvailability(id: string, checkIn: string | null, checkOut: string | null) {
  const enabled = !!(checkIn && checkOut && checkOut > checkIn);

  return useQuery({
    queryKey: ['availability', id, checkIn, checkOut],
    queryFn: () => {
      const sp = new URLSearchParams({ check_in: checkIn!, check_out: checkOut! });
      return getJson<AvailableRoom[]>(`/api/hotels/${encodeURIComponent(id)}/rooms?${sp}`);
    },
    enabled,
    retry: 2,
  });
}
