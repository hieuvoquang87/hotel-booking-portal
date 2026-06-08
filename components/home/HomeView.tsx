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
      track({ name: 'no_results', filters: { stars: state.stars, min: state.min, max: state.max } });
    }
  }, [hasDestination, hotels.isSuccess, view.total, state.stars, state.min, state.max]);

  const onSelect = (opt: DestinationOption) =>
    setParams({ country: opt.params.country, city: 'city' in opt.params ? opt.params.city : null });
  const onReset = () => setParams({ stars: null, min: null, max: null });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Find your stay</h1>
        <p className="text-slate-600">Browse hotels by destination.</p>
        <DestinationCombobox
          options={options}
          value={{ country: state.country, city: state.city }}
          onSelect={onSelect}
          loading={locations.isLoading}
          error={locations.isError}
          onRetry={() => locations.refetch()}
        />
      </section>

      {!hasDestination ? (
        <EmptyState
          icon="pin"
          title="Start by choosing a destination"
          subtext="Pick a city or country to see hotels."
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
              subtext="Try widening your filters."
              actionLabel="Reset filters"
              onAction={onReset}
            />
          ) : (
            <>
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
