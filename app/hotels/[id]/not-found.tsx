import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';

export default function HotelNotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8">
      <EmptyState
        icon="pin"
        title="Hotel not found"
        subtext="The hotel you're looking for doesn't exist."
      />
      <div className="mt-6 text-center">
        <Link href="/" className="text-sm font-medium text-foreground underline underline-offset-4">
          Browse hotels
        </Link>
      </div>
    </div>
  );
}
