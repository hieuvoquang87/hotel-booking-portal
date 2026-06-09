import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { humanizeAmenity } from '@/lib/amenities';
import type { AvailableRoom } from '@/types/domain';

// ---------------------------------------------------------------------------
// RoomCard — displays one available room
// ---------------------------------------------------------------------------

interface RoomCardProps {
  room: AvailableRoom;
}

export function RoomCard({ room }: RoomCardProps) {
  const {
    type,
    pricePerNight,
    bedType,
    bedCount,
    maxOccupancy,
    squareFootage,
    amenities,
  } = room;

  const bedLabel = bedCount === 1 ? '1 bed' : `${bedCount} beds`;
  const specs = `${bedType} · ${bedLabel} · Sleeps ${maxOccupancy} · ${squareFootage} sq ft`;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold leading-none tracking-tight">{type}</h3>
        <p className="text-sm text-muted-foreground">{specs}</p>
      </CardHeader>

      <CardContent>
        <ul className="flex flex-wrap gap-2" aria-label="Room amenities">
          {amenities.map((a) => (
            <li key={a}>
              <Badge variant="muted">{humanizeAmenity(a)}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="justify-between">
        <span className="text-xl font-semibold tabular-nums">
          ${pricePerNight.toLocaleString('en-US')}
        </span>
        <Badge variant="success">
          <span aria-hidden>✓</span>
          <span className="ml-1">Available</span>
        </Badge>
      </CardFooter>
    </Card>
  );
}
