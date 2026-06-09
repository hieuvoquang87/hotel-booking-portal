'use client';

import { useEffect, useRef, useState } from 'react';
import { useFilteredHotels } from '@/hooks/useFilteredHotels';
import { useHotels } from '@/hooks/useHotels';
import { useLocations } from '@/hooks/useLocations';
import { useSearchParamsState } from '@/hooks/useSearchParamsState';
import { buildDestinationOptions, type DestinationOption } from '@/lib/destinations';
import { track } from '@/utils/analyticUtil';
import { EmptyState } from '../EmptyState';
import { DestinationCombobox } from './DestinationCombobox';
import { FilterSheet } from './FilterSheet';
import { HotelGrid } from './HotelGrid';
import { MobileFilterBar } from './MobileFilterBar';
import { Pagination } from './Pagination';
import { RefineToolbar } from './RefineToolbar';
import { ResultCount } from './ResultCount';
import { TrustStrip } from './TrustStrip';

export function HomeView() {
  const { state, setParams } = useSearchParamsState();
  const locations = useLocations();
  const hotels = useHotels({ country: state.country, city: state.city });
  const [sheetOpen, setSheetOpen] = useState(false);

  const options = buildDestinationOptions(locations.data ?? []);
  const hasDestination = !!(state.country || state.city);

  const view = useFilteredHotels(hotels.data ?? [], {
    stars: state.stars,
    min: state.min,
    max: state.max,
    sort: state.sort,
    page: state.page,
  });

  const activeFilterCount = [state.stars, state.min, state.max].filter((v) => v !== null).length;

  // Dynamic hero counts from the locations list (invariant-safe — no global inventory).
  const locList = locations.data ?? [];
  const cityCount = locList.length;
  const countryCount = new Set(locList.map((l) => l.country)).size;

  // Derived from the already-loaded location set (never global inventory).
  const loaded = hotels.data ?? [];
  const prices = loaded.map((h) => h.priceFrom);
  const priceBounds: [number, number] | undefined = prices.length
    ? [Math.min(...prices), Math.max(...prices)]
    : undefined;
  const destinationLabel = loaded[0]
    ? state.city
      ? [loaded[0].address.city, loaded[0].address.state].filter(Boolean).join(', ')
      : loaded[0].address.country
    : null;

  // Analytics: announce a search whenever the committed location/refine state changes.
  const prevKey = useRef('');
  useEffect(() => {
    if (!hasDestination) return;
    const key = JSON.stringify([
      state.country,
      state.city,
      state.stars,
      state.min,
      state.max,
      state.sort,
    ]);
    if (key === prevKey.current) return;
    prevKey.current = key;
    track({
      name: 'search_performed',
      city: state.city,
      country: state.country,
      filters: { stars: state.stars, min: state.min, max: state.max, sort: state.sort },
    });
  }, [hasDestination, state.country, state.city, state.stars, state.min, state.max, state.sort]);

  // Analytics: inventory-gap signal when a loaded location yields zero after filters.
  useEffect(() => {
    if (hasDestination && hotels.isSuccess && view.total === 0) {
      track({
        name: 'no_results',
        filters: { stars: state.stars, min: state.min, max: state.max },
      });
    }
  }, [hasDestination, hotels.isSuccess, view.total, state.stars, state.min, state.max]);

  const onSelect = (opt: DestinationOption) =>
    setParams({ country: opt.params.country, city: 'city' in opt.params ? opt.params.city : null });
  const onClearDestination = () => setParams({ country: null, city: null });
  const onReset = () => setParams({ stars: null, min: null, max: null });

  return (
    <div className="space-y-6">
      <section className="relative -mt-6 mb-2 w-screen ml-[calc(-50vw+50%)] space-y-5 bg-blue-800 px-4 pb-8 pt-8 text-center md:px-6 md:pb-10 md:pt-10 lg:px-8">
        <h1 className="text-3xl font-bold text-white md:text-4xl">Find your perfect stay</h1>
        <p className="text-blue-100">
          {cityCount > 0 && countryCount > 0
            ? `Compare 40+ stays across ${cityCount} cities in ${countryCount} countries — by rating and price, in seconds`
            : 'Browse hotels by destination — pick a city or country to begin.'}
        </p>
        <div className="flex justify-center">
          <DestinationCombobox
            options={options}
            value={{ country: state.country, city: state.city }}
            onSelect={onSelect}
            onClear={onClearDestination}
            loading={locations.isLoading}
            error={locations.isError}
            onRetry={() => locations.refetch()}
          />
        </div>
      </section>

      <TrustStrip />

      {!hasDestination ? (
        <EmptyState
          icon="pin"
          title="Start by choosing a destination"
          subtext="Pick a city or country above to see available stays."
        />
      ) : (
        <>
          <RefineToolbar
            stars={state.stars}
            min={state.min}
            max={state.max}
            sort={state.sort}
            loading={hotels.isLoading}
            total={view.total}
            priceBounds={priceBounds}
            onStars={(stars) => setParams({ stars })}
            onPrice={(min, max) => setParams({ min, max })}
            onSort={(sort) => setParams({ sort })}
          />
          <MobileFilterBar
            activeCount={activeFilterCount}
            sort={state.sort}
            onOpen={() => setSheetOpen(true)}
            onSort={(sort) => setParams({ sort })}
          />
          <div className="sm:hidden">
            <ResultCount loading={hotels.isLoading} total={view.total} />
          </div>

          {hotels.isLoading ? (
            <HotelGrid hotels={[]} loading />
          ) : view.total === 0 ? (
            <EmptyState
              icon="pin"
              title="No hotels found"
              subtext="Try widening your filters to see more stays."
              actionLabel="Reset filters"
              onAction={onReset}
            />
          ) : (
            <>
              {destinationLabel ? (
                <h2 className="text-xl font-bold text-slate-900">
                  Hotels in <span className="text-blue-600">{destinationLabel}</span>
                </h2>
              ) : null}
              <HotelGrid hotels={view.items} loading={false} />
              <Pagination
                page={view.page}
                totalPages={view.totalPages}
                onPage={(page) => setParams({ page })}
              />
            </>
          )}

          <FilterSheet
            open={sheetOpen}
            stars={state.stars}
            min={state.min}
            max={state.max}
            resultCount={view.total}
            priceBounds={priceBounds}
            onStars={(stars) => setParams({ stars })}
            onPrice={(min, max) => setParams({ min, max })}
            onReset={onReset}
            onClose={() => setSheetOpen(false)}
          />
        </>
      )}
    </div>
  );
}
