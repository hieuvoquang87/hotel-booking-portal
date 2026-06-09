import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Suspense } from 'react';
import { server } from '@/mocks/server';
import { AppProvider } from '@/stores/AppProvider';
import { homeFlowHandlers } from '@/tests/utils/mswHandlers';

// Mutable URL mock shared with the hook under test.
let mockSearch = '';
const replace = jest.fn((url: string) => {
  mockSearch = url.includes('?') ? url.split('?')[1] : '';
});
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ replace }),
  usePathname: () => '/',
}));

import { HomeView } from '@/components/home/HomeView';

beforeAll(() => server.listen());
beforeEach(() => server.use(...homeFlowHandlers)); // server starts empty — opt in
afterEach(() => {
  server.resetHandlers();
  mockSearch = '';
  replace.mockClear();
});
afterAll(() => server.close());

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <AppProvider>
        <Suspense fallback={<div>loading-shell</div>}>
          <HomeView />
        </Suspense>
      </AppProvider>
    </QueryClientProvider>,
  );
}

// NOTE: the next/navigation mock is intentionally NON-reactive — mutating `mockSearch`
// does not trigger a React re-render, so a `replace()` write does not round-trip back
// into `useSearchParamsState` within one render. We therefore assert the URL *write*
// and the loaded-state *read* separately (each on its own render, seeding `mockSearch`
// up front for the read). Tailwind's responsive `hidden`/`sm:hidden` classes are inert
// under jsdom, so BOTH the desktop RefineToolbar and the mobile MobileFilterBar render —
// hence the `getAllBy*` for the duplicated Sort select and result count.

describe('Home flow: destination → filter → sort → paginate', () => {
  it('writes slugified country params when a destination is selected (F1)', async () => {
    renderHome();

    // No destination yet.
    expect(screen.getByText(/choosing a destination/i)).toBeTruthy();

    // Wait for locations to load (combobox is disabled until then), then open + pick USA.
    const combo = screen.getByRole('combobox');
    await waitFor(() => expect(combo).toBeEnabled());
    await userEvent.click(combo);
    await userEvent.click(await screen.findByRole('option', { name: /All hotels in USA/ }));
    expect(replace).toHaveBeenCalledWith('/?country=usa', { scroll: false });
  });

  it('loads the location subset, then filters and sorts via the URL (F2/F3)', async () => {
    // Seed the URL as if a destination is already chosen (the read half).
    mockSearch = 'country=usa';
    renderHome();

    // Hotels load (10 → page size 8 → 2 pages).
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(8));
    expect(screen.getAllByText('10 hotels').length).toBeGreaterThan(0);

    // Apply a 5★ filter — page resets to 1 (M3 rule) and the URL gains stars=5.
    await userEvent.click(screen.getAllByRole('button', { name: '5★' })[0]);
    expect(replace).toHaveBeenCalledWith('/?country=usa&stars=5', { scroll: false });

    // Change sort — writes ?sort=price-asc without a refetch.
    await userEvent.selectOptions(
      screen.getAllByRole('combobox', { name: /sort/i })[0],
      'price-asc',
    );
    expect(replace).toHaveBeenCalledWith('/?country=usa&sort=price-asc', { scroll: false });
  });

  it('shows "No hotels found" + Reset when filters exclude everything', async () => {
    mockSearch = 'country=usa&min=99999';
    renderHome();
    await waitFor(() => expect(screen.getByText('No hotels found')).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: /reset filters/i }));
    expect(replace).toHaveBeenCalledWith('/?country=usa', { scroll: false }); // filters cleared
  });

  it('offers Retry when locations fail to load', async () => {
    server.use(
      http.get('http://localhost/api/locations', () => new HttpResponse(null, { status: 500 })),
    );
    renderHome();
    await waitFor(() => expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy());
  });
});
