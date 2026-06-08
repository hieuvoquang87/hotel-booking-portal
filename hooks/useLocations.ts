'use client';

import { useQuery } from '@tanstack/react-query';
import { getJson } from '@/lib/fetcher';
import type { Location } from '@/types/domain';

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: () => getJson<Location[]>('/api/locations'),
    staleTime: Infinity, // destination list is effectively static — fetch once per session
  });
}
