import type { BreakerState } from '@/services/resilience';

export type AnalyticsEvent =
  | {
      name: 'search_performed';
      city: string | null;
      country: string | null;
      filters: { stars: number | null; min: number | null; max: number | null; sort: string };
    }
  | { name: 'no_results'; filters: { stars: number | null; min: number | null; max: number | null } }
  | { name: 'hotel_viewed'; hotelId: string }
  | { name: 'availability_checked'; hotelId: string; nights: number }
  | { name: 'no_rooms'; hotelId: string }
  | { name: 'availability_latency'; hotelId: string; durationMs: number; cacheHit: boolean }
  | { name: 'availability_cache_miss'; hotelId: string }
  | { name: 'availability_breaker_transition'; hotelId: string; state: BreakerState };

export type AnalyticsAdapter = (event: AnalyticsEvent) => void;

const adapters = new Set<AnalyticsAdapter>();

/** Register an adapter; returns an unsubscribe fn. P2 vendor seam. */
export function registerAnalyticsAdapter(adapter: AnalyticsAdapter): () => void {
  adapters.add(adapter);
  return () => {
    adapters.delete(adapter);
  };
}

/** Test seam: drop all adapters (including the default). */
export function __resetAnalyticsAdapters(): void {
  adapters.clear();
}

/** Unchanged public API. Fans out to all adapters; one bad adapter never breaks the rest. */
export function track(event: AnalyticsEvent): void {
  for (const adapter of adapters) {
    try {
      adapter(event);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[analytics] adapter threw:', err);
      }
    }
  }
}

// Default adapter: DEV console only; PROD starts with no adapters (no-op), matching M4.
if (process.env.NODE_ENV !== 'production') {
  registerAnalyticsAdapter((event) => {
    console.debug('[track]', event);
  });
}
