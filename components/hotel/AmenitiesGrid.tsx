import { Icon } from '@/components/Icon';
import { humanizeAmenity } from '@/lib/amenities';

type AmenitiesGridProps = {
  amenities: string[];
};

export function AmenitiesGrid({ amenities }: AmenitiesGridProps) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Amenities</h2>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {amenities.map((token) => (
          <li key={token} className="flex items-center gap-2 text-sm">
            <Icon name="building" size={16} className="text-muted-foreground shrink-0" />
            <span>{humanizeAmenity(token)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
