// tests/unit/hooks/useHotels.test.tsx
// API_BASE_URL is set in tests/setupApiEnv.ts before any module loads.
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/mocks/server';
import { m3Handlers } from '@/tests/utils/mswHandlers';
import { createQueryWrapper } from '@/tests/utils/queryWrapper';
import { useHotels } from '@/hooks/useHotels';

beforeAll(() => server.listen());
beforeEach(() => server.use(...m3Handlers));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useHotels', () => {
  it('is idle (does not fetch) when no location is selected', () => {
    const { result } = renderHook(() => useHotels({}), { wrapper: createQueryWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('fetches the country subset when a country slug is set', async () => {
    const { result } = renderHook(() => useHotels({ country: 'usa' }), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((h) => h.id)).toEqual(['hotel-01']);
  });

  it('serializes a city-only query (no country) into the request', async () => {
    let requestedCity: string | null = null;
    server.use(
      http.get('http://localhost/api/hotels', ({ request }) => {
        requestedCity = new URL(request.url).searchParams.get('city');
        return HttpResponse.json([{ id: 'hotel-ny', name: 'NY Hotel', starRating: 4 }]);
      }),
    );

    const { result } = renderHook(() => useHotels({ city: 'new-york' }), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestedCity).toBe('new-york');
    expect(result.current.data?.map((h) => h.id)).toEqual(['hotel-ny']);
  });
});
