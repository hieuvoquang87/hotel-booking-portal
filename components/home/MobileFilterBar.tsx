'use client';

import type { SortKey } from '@/lib/sort';
import { Icon } from '../Icon';
import { SortSelect } from './SortSelect';

export function MobileFilterBar({
  activeCount,
  sort,
  onOpen,
  onSort,
}: {
  activeCount: number;
  sort: SortKey;
  onOpen: () => void;
  onSort: (sort: SortKey) => void;
}) {
  return (
    <div className="sticky top-14 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 py-2 backdrop-blur sm:hidden">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700"
      >
        <Icon name="sliders" size={18} />
        Filters
        {activeCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>
      <SortSelect id="sort-mobile" value={sort} onChange={onSort} />
    </div>
  );
}
