import { Icon } from '@/components/Icon';

type RatingStarsProps = {
  value: number;
  size?: number;
};

export function RatingStars({ value, size = 16 }: RatingStarsProps) {
  const rounded = Math.round(value);

  return (
    <span aria-label={`Rated ${value} out of 5`} className="inline-flex items-center gap-1">
      <span aria-hidden="true" className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Icon
            key={i}
            name="star"
            size={size}
            className={i < rounded ? 'text-star' : 'text-slate-300'}
          />
        ))}
      </span>
      <span className="tabular-nums text-sm">{value}</span>
    </span>
  );
}
