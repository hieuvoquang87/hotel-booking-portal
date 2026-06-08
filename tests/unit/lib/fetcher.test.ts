// tests/unit/lib/fetcher.test.ts
import { ApiError, getJson } from '@/lib/fetcher';

describe('getJson', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns parsed JSON on a 2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    }) as unknown as typeof fetch;

    await expect(getJson<{ hello: string }>('/api/x')).resolves.toEqual({ hello: 'world' });
    // Pins the load-bearing API_BASE_URL prepend (set in tests/setupApiEnv.ts).
    expect(global.fetch).toHaveBeenCalledWith('http://localhost/api/x');
  });

  it('throws an ApiError carrying the status on a non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as unknown as typeof fetch;

    await expect(getJson('/api/x')).rejects.toMatchObject({ name: 'ApiError', status: 500 });
  });
});
