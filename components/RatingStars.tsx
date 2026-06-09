import { Icon } from '@/components/Icon';

type RatingStarsProps = {
  value: number;
  size?: number;
};

// Renders 5 stars with a fractional amber fill clipped to `value/5`, matching the
// design mockup. A gray base layer sits under an overflow-clipped amber overlay so
// half/partial ratings read accurately (not rounded to whole stars).
export function RatingStars({ value, size = 16 }: RatingStarsProps) {
  const width = `${(Math.max(0, Math.min(5, value)) / 5) * 100}%`;

  return (
    <span aria-label={`Rated ${value} out of 5`} className="inline-flex items-center gap-1.5">
      <span className="relative inline-flex leading-none">
        {/* empty (gray) base layer */}
        <span className="inline-flex gap-px">
          {Array.from({ length: 5 }, (_, i) => (
            <Icon key={i} name="star" size={size} className="block text-slate-300" />
          ))}
        </span>
        {/* filled (amber) overlay, clipped to the rating */}
        <span
          className="absolute inset-y-0 left-0 inline-flex gap-px overflow-hidden"
          style={{ width }}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Icon key={i} name="star" size={size} className="text-star block shrink-0" />
          ))}
        </span>
      </span>
      <span className="text-foreground text-sm font-medium tabular-nums">{value}</span>
    </span>
  );
}
