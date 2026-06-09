import { Icon } from '@/components/Icon';
import type { SortKey } from '@/lib/sort';

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'rating', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'stars', label: 'Stars: Highest' },
];

export function SortSelect({
  id,
  value,
  onChange,
  'data-testid': dataTestId,
}: {
  id: string;
  value: SortKey;
  onChange: (value: SortKey) => void;
  'data-testid'?: string;
}) {
  return (
    <span className="relative inline-flex items-center">
      <Icon
        name="sort"
        size={16}
        className="text-muted-foreground pointer-events-none absolute left-3"
      />
      <select
        id={id}
        aria-label="Sort hotels"
        data-testid={dataTestId}
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-11 appearance-none rounded-lg border pr-9 pl-9 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron"
        size={16}
        className="text-muted-foreground pointer-events-none absolute right-3"
      />
    </span>
  );
}
