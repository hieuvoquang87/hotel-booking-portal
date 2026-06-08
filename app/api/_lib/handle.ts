import { HotelNotFoundError, InvalidDateRangeError } from '@/types/domain';
import { logRequest } from './logger';
import { fail } from './respond';

export type RouteContext = { params: Promise<Record<string, string>> };
export type RouteHandler = (req: Request, ctx: RouteContext) => Promise<Response>;

function mapError(error: unknown): Response {
  if (error instanceof InvalidDateRangeError) return fail(400, 'INVALID_DATE_RANGE', error.message);
  if (error instanceof HotelNotFoundError) return fail(404, 'HOTEL_NOT_FOUND', error.message);
  return fail(500, 'INTERNAL', 'Internal server error');
}

export function withRoute(name: string, handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const start = Date.now();
    try {
      const res = await handler(req, ctx);
      logRequest({ route: name, method: req.method, status: res.status, durationMs: Date.now() - start, outcome: 'ok' });
      return res;
    } catch (error) {
      const res = mapError(error);
      logRequest({ route: name, method: req.method, status: res.status, durationMs: Date.now() - start, outcome: 'error', error });
      return res;
    }
  };
}
