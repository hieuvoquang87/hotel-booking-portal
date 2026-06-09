'use client';

import type { SortKey } from '@/lib/sort';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      <Button variant="outline" type="button" onClick={onOpen} className="gap-2 px-3">
        <Icon name="sliders" size={18} />
        Filters
        {activeCount > 0 ? (
          <Badge variant="default" className="h-5 min-w-5 px-1">
            {activeCount}
          </Badge>
        ) : null}
      </Button>
      <SortSelect id="sort-mobile" value={sort} onChange={onSort} />
    </div>
  );
}
