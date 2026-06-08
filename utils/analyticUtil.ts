// Typed analytics facade. M4 ships the interface + DEV console body; M6 swaps the
// body for pluggable vendor adapters WITHOUT changing call sites.

export type AnalyticsEvent =
  | {
      name: 'search_performed';
      city: string | null;
      country: string | null;
      filters: { stars: number | null; min: number | null; max: number | null; sort: string };
    }
  | {
      name: 'no_results';
      filters: { stars: number | null; min: number | null; max: number | null };
    };

export function track(event: AnalyticsEvent): void {
  if (process.env.NODE_ENV === 'production') return; // M6 wires real adapters here
  // eslint-disable-next-line no-console
  console.debug('[track]', event);
}
