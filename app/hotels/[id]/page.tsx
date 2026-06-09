import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getJson, ApiError } from '@/lib/fetcher';
import type { Hotel } from '@/types/domain';
import { HotelHero } from '@/components/hotel/HotelHero';
import { AmenitiesGrid } from '@/components/hotel/AmenitiesGrid';
import { PoliciesList } from '@/components/hotel/PoliciesList';
import { RoomAvailability } from '@/components/hotel/RoomAvailability';
import { BackToResults } from '@/components/hotel/BackToResults';

type Props = {
  params: Promise<{ id: string }>;
};

async function fetchHotel(id: string): Promise<Hotel> {
  try {
    return await getJson<Hotel>(`/api/hotels/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const hotel = await getJson<Hotel>(`/api/hotels/${id}`);
    return {
      title: hotel.name,
      description: `${hotel.starRating}-star hotel in ${hotel.address.city}, ${hotel.address.country}. Browse rooms and check availability.`,
    };
  } catch {
    return { title: 'Hotel' };
  }
}

export default async function HotelDetailPage({ params }: Props) {
  const { id } = await params;
  const hotel = await fetchHotel(id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
      <BackToResults />

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left column — hotel detail */}
        <div className="space-y-8">
          <HotelHero hotel={hotel} />

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">Overview</h2>
            <p className="text-muted-foreground leading-relaxed">{hotel.description}</p>
          </section>

          <AmenitiesGrid amenities={hotel.amenities} />

          <PoliciesList policies={hotel.policies} />
        </div>

        {/* Right column — room availability (sticky on large screens) */}
        {/* top-20 (80px) clears the sticky 64px header (md:h-16) so the panel
            parks below it, not underneath it, when scrolling. */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <RoomAvailability hotelId={hotel.id} />
        </div>
      </div>
    </div>
  );
}
