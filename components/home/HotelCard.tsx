import Link from 'next/link';
import { humanizeAmenity } from '@/lib/amenities';
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
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <div className="relative aspect-video bg-slate-100">
        <span className="absolute inset-0 flex items-center justify-center text-slate-300">
          <Icon name="building" size={34} aria-hidden />
        </span>
        <span
          className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-900"
          aria-hidden
        >
          {hotel.starRating}★
        </span>
      </div>
      <div className="space-y-1.5 p-4">
        <h3 className="text-base font-semibold text-slate-900">{hotel.name}</h3>
        <p className="text-sm text-slate-600">
          {hotel.address.city}, {hotel.address.state} · {hotel.address.country}
        </p>
        <p className="flex items-center gap-1 text-sm text-slate-900" aria-hidden>
          <Icon name="star" size={14} className="text-amber-500" />
          <span className="font-medium tabular-nums">{hotel.overallRating}</span>
          <span className="text-slate-500">({fmtCount(hotel.reviewCount)})</span>
        </p>
        <ul className="flex flex-wrap gap-1.5 pt-1" aria-hidden>
          {shown.map((a) => (
            <li key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {humanizeAmenity(a)}
            </li>
          ))}
          {extra > 0 ? (
            <li className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              +{extra}
            </li>
          ) : null}
        </ul>
        <p className="pt-1 text-sm font-semibold tabular-nums text-slate-900">
          from {fmtPrice(hotel.priceFrom)}
          <span className="font-normal text-slate-500"> / night</span>
        </p>
      </div>
    </Link>
  );
}
