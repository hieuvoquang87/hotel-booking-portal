import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { AppProvider } from '@/stores/AppProvider';
import { roomsHandler } from '@/tests/utils/mswHandlers';

// next/navigation must be mocked for any component tree that contains
// AppProvider (which is fine here — we don't exercise routing).
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => '/',
}));

import { RoomAvailability } from '@/components/hotel/RoomAvailability';

// ---------------------------------------------------------------------------
// MSW lifecycle — server starts EMPTY; opt in per test via beforeEach
// ---------------------------------------------------------------------------
beforeAll(() => server.listen());
beforeEach(() => server.use(roomsHandler)); // default: returns room-01a / Deluxe King
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const HOTEL_ID = 'hotel-abc';
const ORIGIN = 'http://localhost';

/** Wrap RoomAvailability in the providers it needs. */
function renderPanel(hotelId: string) {
  // retryDelay: 0 is load-bearing — useAvailability has retry:2 which overrides
  // the client's retry:false, but without a zero delay those two retries back off
  // ~1s+2s and exceed waitFor's 1 s default in the error test.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AppProvider>
        <RoomAvailability hotelId={hotelId} />
      </AppProvider>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('RoomAvailability integration', () => {
  it('success: demo-default dates auto-fetch → room renders with type and price', async () => {
    // roomsHandler (opted in via beforeEach) returns:
    //   { roomId:'room-01a', type:'Deluxe King', pricePerNight:299, ... }
    // RoomAvailability seeds 2026-07-10/2026-07-12 on mount (both dates null),
    // which enables useAvailability → fetch fires automatically.
    renderPanel(HOTEL_ID);

    // RoomCard renders the type in an <h3> heading.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Deluxe King' })).toBeTruthy(),
    );

    // Price is rendered via toLocaleString so "$299" appears in the card footer.
    expect(screen.getByText(/\$299/)).toBeTruthy();
  });

  it('empty: no rooms returned → shows "No rooms available" message', async () => {
    // Override: handler returns an empty array. Later-registered handlers win.
    server.use(
      http.get(`${ORIGIN}/api/hotels/:id/rooms`, () => HttpResponse.json([])),
    );

    renderPanel(HOTEL_ID);

    await waitFor(() => {
      // The text appears in both the sr-only live region and the visible EmptyState.
      const nodes = screen.getAllByText(/No rooms available for these dates/i);
      expect(nodes.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('error: 500 response → InlineError alert + Retry button', async () => {
    // Override: handler returns 500.
    server.use(
      http.get(
        `${ORIGIN}/api/hotels/:id/rooms`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    renderPanel(HOTEL_ID);

    // useAvailability has retry:2 — with retryDelay:0 those retries resolve
    // quickly, but give waitFor a bit of extra headroom just in case.
    await waitFor(
      () =>
        expect(screen.getByRole('alert')).toHaveTextContent(
          /Couldn't load availability/i,
        ),
      { timeout: 2000 },
    );

    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
  });
});
