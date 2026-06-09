import type { SortKey } from '@/lib/sort';

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'rating', label: 'Rating: Highest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'stars', label: 'Stars: Highest' },
];

export function SortSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: SortKey;
  onChange: (value: SortKey) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <span>Sort</span>
      <select
        id={id}
        aria-label="Sort hotels"
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
