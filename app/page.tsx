import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HomeView } from '@/components/home/HomeView';
import { HomeViewFallback } from '@/components/home/HomeViewFallback';

export const metadata: Metadata = {
  title: 'Find your stay',
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
