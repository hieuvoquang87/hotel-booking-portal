/** @jest-environment node */
import { GET } from './route';

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const call = (id: string, qs = '') =>
  GET(new Request(`http://test/api/hotels/${id}/rooms${qs}`), { params: Promise.resolve({ id }) });

describe('GET /api/hotels/[id]/rooms', () => {
  it('returns only rooms available every night in range', async () => {
    const res = await call('hotel-01', '?check_in=2026-07-10&check_out=2026-07-13');
    expect(res.status).toBe(200);
    expect((await res.json()).map((r: { roomId: string }) => r.roomId)).toEqual(['room-01a']);
  });

  it('returns [] for a no-availability hotel', async () => {
    const res = await call('hotel-04', '?check_in=2026-07-10&check_out=2026-07-11');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns [] for out-of-window dates', async () => {
    const res = await call('hotel-01', '?check_in=2026-08-01&check_out=2026-08-02');
    expect(await res.json()).toEqual([]);
  });

  it('400 MISSING_DATES when a date is absent', async () => {
    const res = await call('hotel-01', '?check_in=2026-07-10');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('MISSING_DATES');
  });

  it('400 INVALID_DATE for a non-calendar date', async () => {
    const res = await call('hotel-01', '?check_in=2026-02-30&check_out=2026-07-13');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_DATE');
  });

  it('400 INVALID_DATE_RANGE when checkout <= check-in', async () => {
    const res = await call('hotel-01', '?check_in=2026-07-12&check_out=2026-07-12');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_DATE_RANGE');
  });

  it('404 HOTEL_NOT_FOUND for an unknown id with valid dates', async () => {
    const res = await call('hotel-999', '?check_in=2026-07-10&check_out=2026-07-11');
    expect(res.status).toBe(404);
  });

  it('date validation precedes id lookup (bad dates + unknown id → 400)', async () => {
    const res = await call('hotel-999', '?check_in=2026-07-10');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('MISSING_DATES');
  });

  it('marks the response no-store', async () => {
    const res = await call('hotel-01', '?check_in=2026-07-10&check_out=2026-07-11');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});
