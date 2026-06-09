import { Button } from '@/components/ui/button';

type Option = { label: string; value: number | null };

const OPTIONS: Option[] = [
  { label: 'Any', value: null },
  { label: '3★ & up', value: 3 },
  { label: '4★ & up', value: 4 },
  { label: '5★', value: 5 },
];

export function SegmentedStars({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Minimum star rating"
      className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Button
            key={opt.label}
            variant="ghost"
            size="default"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 ${
              active ? 'bg-blue-600 text-white hover:bg-blue-600' : 'text-slate-600'
            }`}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
