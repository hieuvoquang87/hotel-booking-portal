import { withRoute } from '@/app/api/_lib/handle';
import { ok } from '@/app/api/_lib/respond';
import { getLocations } from '@/services/hotelService';

const CACHE = 'public, max-age=3600, stale-while-revalidate=86400';

export const GET = withRoute('GET /api/locations', async () =>
  ok(getLocations(), { headers: { 'Cache-Control': CACHE } }),
);
