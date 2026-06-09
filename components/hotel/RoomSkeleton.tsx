import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Shimmer placeholder displayed while room availability data loads.
// The Skeleton primitive is aria-hidden, so the whole card is decorative.
export function RoomSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-3/4 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </CardFooter>
    </Card>
  );
}
