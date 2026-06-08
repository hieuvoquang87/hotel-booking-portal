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
    <label className="inline-flex items-center gap-2 text-sm text-slate-600">
      <span>Sort</span>
      <select
        id={id}
        aria-label="Sort hotels"
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
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
