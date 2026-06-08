/** @jest-environment node */
import { fail, ok } from './respond';

describe('ok', () => {
  it('returns a 200 JSON response with the data', async () => {
    const res = ok([{ id: 'hotel-01' }]);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    expect(await res.json()).toEqual([{ id: 'hotel-01' }]);
  });
  it('passes through init (status + headers)', () => {
    const res = ok({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});

describe('fail', () => {
  it('returns the given status and an { error: { code, message } } body', async () => {
    const res = fail(404, 'HOTEL_NOT_FOUND', 'hotel not found: hotel-99');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'HOTEL_NOT_FOUND', message: 'hotel not found: hotel-99' },
    });
  });
});
