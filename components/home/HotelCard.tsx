import Link from 'next/link';
import { RatingStars } from '@/components/RatingStars';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { humanizeAmenity } from '@/lib/amenities';
import { hotelPlaceholderGradient } from '@/lib/colors';
import type { Hotel } from '@/types/domain';
import { Icon } from '../Icon';

const fmtPrice = (n: number) => `$${n.toLocaleString('en-US')}`;
const fmtCount = (n: number) => n.toLocaleString('en-US');

function cardAria(h: Hotel): string {
  const where = [h.address.city, h.address.state].filter(Boolean).join(' ');
  return `${h.name}, ${h.starRating} star hotel, rated ${h.overallRating} from ${fmtCount(h.reviewCount)} reviews, from ${fmtPrice(h.priceFrom)} per night, ${where}`;
}

export function HotelCard({ hotel }: { hotel: Hotel }) {
  const shown = hotel.amenities.slice(0, 3);
  const extra = hotel.amenities.length - shown.length;

  return (
    <Link
      href={`/hotels/${hotel.id}`}
      aria-label={cardAria(hotel)}
      className="group focus-visible:outline-ring flex h-full flex-col transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <Card className="flex flex-1 flex-col overflow-hidden">
        <div
          className="relative aspect-video overflow-hidden"
          style={{ background: hotelPlaceholderGradient(hotel.id) }}
          aria-hidden
        >
          <span className="absolute inset-0 grid place-items-center text-white/35">
            <Icon name="building" size={34} />
          </span>
          <span className="absolute inset-x-3 bottom-2.5 truncate text-xs font-semibold tracking-wide text-white/60 uppercase">
            {hotel.name}
          </span>
          <span className="text-foreground absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold tabular-nums shadow-sm">
            <Icon name="star" size={13} className="text-star" />
            {hotel.starRating}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="text-foreground text-base font-semibold">{hotel.name}</h3>
          <p className="text-muted-foreground text-sm">
            {hotel.address.city}, {hotel.address.state} · {hotel.address.country}
          </p>
          <div className="flex items-center gap-1.5" aria-hidden>
            <RatingStars value={hotel.overallRating} size={14} />
            <span className="text-muted-foreground text-sm tabular-nums">
              ({fmtCount(hotel.reviewCount)})
            </span>
          </div>
          <ul className="flex flex-wrap gap-1.5 pt-0.5" aria-hidden>
            {shown.map((a) => (
              <li key={a}>
                <Badge variant="muted">{humanizeAmenity(a)}</Badge>
              </li>
            ))}
            {extra > 0 ? (
              <li>
                <Badge variant="muted">+{extra}</Badge>
              </li>
            ) : null}
          </ul>
          <p className="mt-auto flex items-baseline gap-1.5 border-t border-slate-200 pt-2.5">
            <span className="text-muted-foreground text-xs">from</span>
            <span className="text-foreground text-lg font-bold tabular-nums">
              {fmtPrice(hotel.priceFrom)}
            </span>
            <span className="text-muted-foreground text-xs">/ night</span>
          </p>
        </div>
      </Card>
    </Link>
  );
}
