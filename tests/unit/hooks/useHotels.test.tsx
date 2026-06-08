// tests/unit/hooks/useHotels.test.tsx
// API_BASE_URL is set in tests/setupApiEnv.ts before any module loads.
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
});
