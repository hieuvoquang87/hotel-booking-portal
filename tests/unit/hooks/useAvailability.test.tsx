// tests/unit/hooks/useAvailability.test.tsx
// API_BASE_URL is set in tests/setupApiEnv.ts before any module loads.
import { delay, http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '@/mocks/server';
import { m3Handlers } from '@/tests/utils/mswHandlers';
import { createQueryWrapper } from '@/tests/utils/queryWrapper';
import { useAvailability } from '@/hooks/useAvailability';

beforeAll(() => server.listen());
beforeEach(() => server.use(...m3Handlers));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useAvailability gating', () => {
  it('does not fetch with partial dates', () => {
    const { result } = renderHook(() => useAvailability('hotel-01', '2026-07-10', null), {
      wrapper: createQueryWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('does not fetch when checkout <= checkin', () => {
    const { result } = renderHook(() => useAvailability('hotel-01', '2026-07-12', '2026-07-12'), {
      wrapper: createQueryWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns available rooms for a valid range', async () => {
    const { result } = renderHook(() => useAvailability('hotel-01', '2026-07-10', '2026-07-12'), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].roomId).toBe('room-01a');
  });
});

describe('useAvailability latest-wins', () => {
  it('a delayed response for old dates never replaces the new selection', async () => {
    server.use(
      http.get('http://localhost/api/hotels/:id/rooms', async ({ request }) => {
        const checkOut = new URL(request.url).searchParams.get('check_out');
        if (checkOut === '2026-07-12') {
          await delay(50);
          return HttpResponse.json([
            { roomId: 'STALE', type: 'x', pricePerNight: 1, bedType: 'x', maxOccupancy: 1 },
          ]);
        }
        return HttpResponse.json([
          { roomId: 'FRESH', type: 'y', pricePerNight: 2, bedType: 'y', maxOccupancy: 2 },
        ]);
      }),
    );

    const wrapper = createQueryWrapper();
    const { result, rerender } = renderHook(
      ({ out }: { out: string }) => useAvailability('hotel-01', '2026-07-10', out),
      { wrapper, initialProps: { out: '2026-07-12' } },
    );

    // Change dates before the slow (old-date) response resolves.
    rerender({ out: '2026-07-13' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].roomId).toBe('FRESH');

    // After the delayed stale response lands, the displayed data is still the new key's.
    await new Promise((r) => setTimeout(r, 80));
    expect(result.current.data?.[0].roomId).toBe('FRESH');
  });
});

describe('useAvailability errors', () => {
  it('surfaces an ApiError carrying the status on a 500', async () => {
    server.use(
      http.get('http://localhost/api/hotels/:id/rooms', () => new HttpResponse(null, { status: 500 })),
    );
    const { result } = renderHook(() => useAvailability('hotel-01', '2026-07-10', '2026-07-12'), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 2000 });
    expect((result.current.error as { status?: number }).status).toBe(500);
  });
});
