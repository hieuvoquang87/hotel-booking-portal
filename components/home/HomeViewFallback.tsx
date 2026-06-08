import { HotelCardSkeleton } from './HotelCardSkeleton';

// Static fallback while the search-params subtree hydrates (matches loaded layout → no CLS).
export function HomeViewFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <HotelCardSkeleton key={i} />
      ))}
    </div>
  );
}
