/** @jest-environment node */
import { GET } from './route';

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const ctx = { params: Promise.resolve({}) };

describe('GET /api/locations', () => {
  it('returns 200 with the 10 distinct locations', async () => {
    const res = await GET(new Request('http://test/api/locations'), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(10);
    expect(body).toContainEqual(
      expect.objectContaining({ city: 'New York', country: 'USA', citySlug: 'new-york' }),
    );
  });

  it('sets a cacheable Cache-Control header', async () => {
    const res = await GET(new Request('http://test/api/locations'), ctx);
    expect(res.headers.get('cache-control')).toContain('max-age');
  });
});
