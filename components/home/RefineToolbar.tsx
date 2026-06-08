import type { SortKey } from '@/lib/sort';
import { PriceRange } from './PriceRange';
import { ResultCount } from './ResultCount';
import { SegmentedStars } from './SegmentedStars';
import { SortSelect } from './SortSelect';

type Props = {
  stars: number | null;
  min: number | null;
  max: number | null;
  sort: SortKey;
  loading: boolean;
  total: number;
  onStars: (v: number | null) => void;
  onPrice: (min: number | null, max: number | null) => void;
  onSort: (sort: SortKey) => void;
};

export function RefineToolbar({
  stars,
  min,
  max,
  sort,
  loading,
  total,
  onStars,
  onPrice,
  onSort,
}: Props) {
  return (
    <div className="hidden sm:block">
      <div className="flex flex-wrap items-center gap-4">
        <SegmentedStars value={stars} onChange={onStars} />
        <PriceRange min={min} max={max} onCommit={onPrice} />
        <div className="ml-auto">
          <SortSelect id="sort-desktop" value={sort} onChange={onSort} />
        </div>
      </div>
      <div className="pt-2">
        <ResultCount loading={loading} total={total} />
      </div>
    </div>
  );
}
