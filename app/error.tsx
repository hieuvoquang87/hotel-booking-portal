'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // P2: report to Sentry via a registered analytics/error adapter.
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-gray-600">An unexpected error occurred. You can try again.</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex min-h-[44px] items-center rounded-md bg-blue-600 px-4 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center rounded-md border px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
