/** @jest-environment node */
import { GET } from './route';

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const ctx = { params: Promise.resolve({}) };
const call = (qs = '') => GET(new Request(`http://test/api/hotels${qs}`), ctx);

describe('GET /api/hotels', () => {
  it('returns the 20 USA hotels for ?country=usa', async () => {
    const res = await call('?country=usa');
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(20);
  });

  it('narrows to 4 hotels for ?city=new-york', async () => {
    expect(await (await call('?city=new-york')).json()).toHaveLength(4);
  });

  it('returns [] for an unknown slug', async () => {
    expect(await (await call('?city=atlantis')).json()).toEqual([]);
  });

  it('with no params returns the top 10 hotels by overallRating', async () => {
    const body = await (await call()).json();
    expect(body).toHaveLength(10);
    const ratings = body.map((h: { overallRating: number }) => h.overallRating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  });

  it('ignores star_rating/price_range params (no 400, still location-filtered)', async () => {
    const res = await call('?country=usa&star_rating=5&price_range=100-200');
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(20);
  });
});
