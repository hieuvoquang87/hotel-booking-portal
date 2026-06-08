// tests/unit/hooks/useLocations.test.tsx
// API_BASE_URL is set in tests/setupApiEnv.ts before any module loads.
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/mocks/server';
import { m3Handlers } from '@/tests/utils/mswHandlers';
import { createQueryWrapper } from '@/tests/utils/queryWrapper';
import { useLocations } from '@/hooks/useLocations';

beforeAll(() => server.listen());
beforeEach(() => server.use(...m3Handlers));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useLocations', () => {
  it('fetches and returns the locations list', async () => {
    const { result } = renderHook(() => useLocations(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].citySlug).toBe('new-york');
  });
});
