import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function HotelCardSkeleton() {
  return (
    <Card aria-hidden="true" className="overflow-hidden">
      <Skeleton data-testid="sk-photo" className="aspect-video rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-7/12" />
        <Skeleton className="h-3 w-5/12" />
        <Skeleton className="h-3 w-6/12" />
        <Skeleton className="h-5 w-4/12" />
      </div>
    </Card>
  );
}
