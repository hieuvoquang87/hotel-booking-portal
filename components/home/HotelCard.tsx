import Link from 'next/link';
import { humanizeAmenity } from '@/lib/amenities';
import type { Hotel } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
      className="group block transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-muted">
          <span className="absolute inset-0 flex items-center justify-center text-slate-300">
            <Icon name="building" size={34} aria-hidden />
          </span>
          <Badge
            variant="default"
            className="absolute right-2 top-2 bg-card/90 text-foreground hover:bg-card/90"
            aria-hidden
          >
            {hotel.starRating}★
          </Badge>
        </div>
        <div className="space-y-1.5 p-4">
          <h3 className="text-base font-semibold text-foreground">{hotel.name}</h3>
          <p className="text-sm text-muted-foreground">
            {hotel.address.city}, {hotel.address.state} · {hotel.address.country}
          </p>
          <p className="flex items-center gap-1 text-sm text-foreground" aria-hidden>
            <Icon name="star" size={14} className="text-star" />
            <span className="font-medium tabular-nums">{hotel.overallRating}</span>
            <span className="text-muted-foreground">({fmtCount(hotel.reviewCount)})</span>
          </p>
          <ul className="flex flex-wrap gap-1.5 pt-1" aria-hidden>
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
          <p className="pt-1 text-sm font-semibold tabular-nums text-foreground">
            from {fmtPrice(hotel.priceFrom)}
            <span className="font-normal text-muted-foreground"> / night</span>
          </p>
        </div>
      </Card>
    </Link>
  );
}
