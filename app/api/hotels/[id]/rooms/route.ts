import { isCalendarDate } from '@/app/api/_lib/dates';
import { withRoute } from '@/app/api/_lib/handle';
import { fail, ok } from '@/app/api/_lib/respond';
import { checkAvailability } from '@/services/availabilityService';

export const GET = withRoute('GET /api/hotels/[id]/rooms', async (req, ctx) => {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const checkIn = searchParams.get('check_in');
  const checkOut = searchParams.get('check_out');

  if (!checkIn || !checkOut) return fail(400, 'MISSING_DATES', 'check_in and check_out are required');
  if (!isCalendarDate(checkIn) || !isCalendarDate(checkOut)) {
    return fail(400, 'INVALID_DATE', 'dates must be valid YYYY-MM-DD');
  }

  const rooms = await checkAvailability(id, checkIn, checkOut);
  return ok(rooms, { headers: { 'Cache-Control': 'no-store' } });
});
