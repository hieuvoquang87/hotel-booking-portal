import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HomeView } from '@/components/home/HomeView';
import { HomeViewFallback } from '@/components/home/HomeViewFallback';

export const metadata: Metadata = {
  // absolute → home tab reads exactly the spec's title, bypassing the layout's
  // "%s · Stayfinder" template (which still applies to other routes, e.g. M5 detail).
  title: { absolute: 'Stayfinder — Find your stay' },
  description:
    'Browse and compare hotels by destination — filter by rating and price, then check room availability.',
};

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
      <Suspense fallback={<HomeViewFallback />}>
        <HomeView />
      </Suspense>
    </div>
  );
}
