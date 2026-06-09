'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';

// Graceful boundary for unexpected detail-page failures (e.g. the BFF is down or
// returns a 5xx). A missing hotel is handled separately by not-found.tsx via
// notFound(); this catches everything else so the user never sees a raw crash.
export default function HotelDetailError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8">
      <EmptyState
        icon="search"
        title="Couldn’t load this hotel"
        subtext="Something went wrong loading this hotel. Please try again in a moment."
      />
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="text-sm font-medium text-foreground underline underline-offset-4"
        >
          Try again
        </button>
        <Link href="/" className="text-sm font-medium text-foreground underline underline-offset-4">
          Browse hotels
        </Link>
      </div>
    </div>
  );
}
