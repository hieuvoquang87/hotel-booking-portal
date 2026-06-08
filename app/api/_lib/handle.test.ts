/** @jest-environment node */
import { HotelNotFoundError, InvalidDateRangeError } from '@/types/domain';
import { ok } from './respond';
import { withRoute } from './handle';

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const req = new Request('http://test/api/x');
const ctx = { params: Promise.resolve({ id: 'hotel-01' }) };

describe('withRoute', () => {
  it('returns the handler response and logs an ok outcome', async () => {
    const handler = withRoute('GET /api/x', async () => ok({ hi: true }));
    const res = await handler(req, ctx);
    expect(res.status).toBe(200);
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it('forwards ctx.params to the handler', async () => {
    const handler = withRoute('GET /api/x', async (_r, c) => ok(await c.params));
    expect(await (await handler(req, ctx)).json()).toEqual({ id: 'hotel-01' });
  });

  it('maps InvalidDateRangeError to 400 INVALID_DATE_RANGE', async () => {
    const handler = withRoute('GET /api/x', async () => { throw new InvalidDateRangeError(); });
    const res = await handler(req, ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_DATE_RANGE');
  });

  it('maps HotelNotFoundError to 404 HOTEL_NOT_FOUND', async () => {
    const handler = withRoute('GET /api/x', async () => { throw new HotelNotFoundError('hotel-99'); });
    expect((await handler(req, ctx)).status).toBe(404);
  });

  it('maps an unexpected throw to a generic 500 (no leaked message) and logs error', async () => {
    const handler = withRoute('GET /api/x', async () => { throw new Error('db exploded'); });
    const res = await handler(req, ctx);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: 'INTERNAL', message: 'Internal server error' } });
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
