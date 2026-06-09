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
      className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-100 p-[3px]"
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
            className={`min-h-11 rounded-full px-3.5 text-[13.5px] font-semibold whitespace-nowrap ${
              active
                ? 'bg-white text-blue-700 shadow-sm hover:bg-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
