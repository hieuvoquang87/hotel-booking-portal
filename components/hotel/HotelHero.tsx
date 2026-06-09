import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/Icon';
import { RatingStars } from '@/components/RatingStars';
import type { Hotel } from '@/types/domain';

type HotelHeroProps = {
  hotel: Hotel;
};

export function HotelHero({ hotel }: HotelHeroProps) {
  const { name, starRating, overallRating, reviewCount, address } = hotel;
  const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;

  return (
    <div>
      {/* 16:9 placeholder image — reserves space to prevent CLS */}
      <div className="aspect-video bg-muted flex items-center justify-center rounded-lg mb-4">
        <Icon name="building" size={48} className="text-muted-foreground" />
      </div>

      <h1 className="text-2xl font-bold mb-1">{name}</h1>

      <p className="text-muted-foreground text-sm mb-3">{fullAddress}</p>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Badge variant="muted">{starRating}★ hotel</Badge>
        <RatingStars value={overallRating} />
        <span className="text-sm text-muted-foreground">
          {reviewCount.toLocaleString('en-US')} reviews
        </span>
      </div>
    </div>
  );
}
