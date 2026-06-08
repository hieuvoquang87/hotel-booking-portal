import { withRoute } from '@/app/api/_lib/handle';
import { fail, ok } from '@/app/api/_lib/respond';
import { getHotelById } from '@/services/hotelService';

const CACHE = 'public, max-age=300, stale-while-revalidate=3600';

export const GET = withRoute('GET /api/hotels/[id]', async (_req, ctx) => {
  const { id } = await ctx.params;
  const hotel = getHotelById(id);
  if (!hotel) return fail(404, 'HOTEL_NOT_FOUND', `hotel not found: ${id}`);
  return ok(hotel, { headers: { 'Cache-Control': CACHE } });
});
