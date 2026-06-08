import type { Hotel } from '@/types/domain';
import { HotelCard } from './HotelCard';
import { HotelCardSkeleton } from './HotelCardSkeleton';

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

export function HotelGrid({ hotels, loading }: { hotels: Hotel[]; loading: boolean }) {
  if (loading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 8 }, (_, i) => (
          <HotelCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  return (
    <div className={GRID}>
      {hotels.map((h) => (
        <HotelCard key={h.id} hotel={h} />
      ))}
    </div>
  );
}
