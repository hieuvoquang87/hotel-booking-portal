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
  priceBounds?: [number, number];
  onStars: (v: number | null) => void;
  onPrice: (min: number | null, max: number | null) => void;
  onSort: (sort: SortKey) => void;
};

const labelClass = 'text-[13px] font-semibold text-slate-600';

export function RefineToolbar({
  stars,
  min,
  max,
  sort,
  loading,
  total,
  priceBounds,
  onStars,
  onPrice,
  onSort,
}: Props) {
  return (
    <div className="hidden border-b border-slate-200 pb-4 sm:block">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="inline-flex items-center gap-2">
          <span className={labelClass}>Stars</span>
          <SegmentedStars value={stars} onChange={onStars} />
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={labelClass}>Price</span>
          <PriceRange min={min} max={max} onCommit={onPrice} bounds={priceBounds} />
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResultCount loading={loading} total={total} />
          <SortSelect id="sort-desktop" value={sort} onChange={onSort} data-testid="sort-select" />
        </div>
      </div>
    </div>
  );
}
