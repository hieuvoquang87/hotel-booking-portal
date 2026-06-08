'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export type SortKey = 'price-asc' | 'price-desc' | 'rating' | 'stars';

const SORT_KEYS: SortKey[] = ['price-asc', 'price-desc', 'rating', 'stars'];
const DEFAULT_SORT: SortKey = 'price-asc';
const FILTER_KEYS = ['country', 'city', 'stars', 'min', 'max', 'sort'] as const;

export type RefineState = {
  country: string | null;
  city: string | null;
  stars: number | null;
  min: number | null;
  max: number | null;
  sort: SortKey;
  page: number;
};

function parseNum(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseRefineState(sp: URLSearchParams): RefineState {
  const sortRaw = sp.get('sort');
  const pageNum = parseNum(sp.get('page'));
  return {
    country: sp.get('country'),
    city: sp.get('city'),
    stars: parseNum(sp.get('stars')),
    min: parseNum(sp.get('min')),
    max: parseNum(sp.get('max')),
    sort: SORT_KEYS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : DEFAULT_SORT,
    page: pageNum !== null && pageNum >= 1 ? Math.floor(pageNum) : 1,
  };
}

export function nextState(current: RefineState, patch: Partial<RefineState>): RefineState {
  const merged: RefineState = { ...current, ...patch };
  const changesFilter = FILTER_KEYS.some((key) => key in patch);
  if (changesFilter && !('page' in patch)) {
    merged.page = 1;
  }
  return merged;
}

export function toSearchParams(state: RefineState): URLSearchParams {
  const sp = new URLSearchParams();
  if (state.country) sp.set('country', state.country);
  if (state.city) sp.set('city', state.city);
  if (state.stars !== null) sp.set('stars', String(state.stars));
  if (state.min !== null) sp.set('min', String(state.min));
  if (state.max !== null) sp.set('max', String(state.max));
  if (state.sort !== DEFAULT_SORT) sp.set('sort', state.sort);
  if (state.page > 1) sp.set('page', String(state.page));

  // Deterministic, sorted key order for stable, test-assertable URLs.
  const sorted = new URLSearchParams();
  for (const key of [...sp.keys()].sort()) {
    sorted.set(key, sp.get(key) as string);
  }
  return sorted;
}

export function useSearchParamsState(): {
  state: RefineState;
  setParams: (patch: Partial<RefineState>) => void;
} {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state = useMemo(
    () => parseRefineState(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setParams = useCallback(
    (patch: Partial<RefineState>) => {
      const qs = toSearchParams(nextState(state, patch)).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [state, router, pathname],
  );

  return { state, setParams };
}
