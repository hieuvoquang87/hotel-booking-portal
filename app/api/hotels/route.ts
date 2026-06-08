import { withRoute } from '@/app/api/_lib/handle';
import { ok } from '@/app/api/_lib/respond';
import { sortHotels } from '@/lib/sort';
import { getHotelsByLocation } from '@/services/hotelService';

const CACHE = 'public, max-age=300, stale-while-revalidate=3600';
const DEFAULT_HOTELS_LIMIT = 10;

export const GET = withRoute('GET /api/hotels', async (req) => {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country') ?? undefined;
  const city = searchParams.get('city') ?? undefined;

  if (!country && !city) {
    const featured = sortHotels(getHotelsByLocation({}), 'rating').slice(0, DEFAULT_HOTELS_LIMIT);
    return ok(featured, { headers: { 'Cache-Control': CACHE } });
  }

  return ok(getHotelsByLocation({ country, city }), { headers: { 'Cache-Control': CACHE } });
});
