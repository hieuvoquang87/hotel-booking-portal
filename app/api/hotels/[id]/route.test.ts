/** @jest-environment node */
import { GET } from './route';

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const call = (id: string) =>
  GET(new Request(`http://test/api/hotels/${id}`), { params: Promise.resolve({ id }) });

describe('GET /api/hotels/[id]', () => {
  it('returns 200 with the hotel for a known id', async () => {
    const res = await call('hotel-01');
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe('hotel-01');
  });

  it('returns 404 HOTEL_NOT_FOUND for an unknown id', async () => {
    const res = await call('hotel-999');
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('HOTEL_NOT_FOUND');
  });
});
