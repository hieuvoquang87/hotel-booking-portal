import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Hotel } from '@/types/domain';

const mockSetParams = jest.fn();
let mockState = {
  country: null as string | null,
  city: null as string | null,
  stars: null as number | null,
  min: null as number | null,
  max: null as number | null,
  sort: 'rating',
  page: 1,
};
let mockHotels: { data: Hotel[] | undefined; isLoading: boolean; isError: boolean; isSuccess: boolean } = {
  data: undefined,
  isLoading: false,
  isError: false,
  isSuccess: false,
};

// jest.mock does not run paths through next/jest's `@/` moduleNameMapper, so target
// the same modules by relative path (they resolve to the files HomeView imports as @/).
jest.mock('../../../../hooks/useSearchParamsState', () => ({
  useSearchParamsState: () => ({ state: mockState, setParams: mockSetParams }),
}));
jest.mock('../../../../hooks/useLocations', () => ({
  useLocations: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
}));
jest.mock('../../../../hooks/useHotels', () => ({
  useHotels: () => mockHotels,
}));

import { HomeView } from '@/components/home/HomeView';

const makeHotel = (n: number): Hotel =>
  ({
    id: `hotel-${n}`,
    name: `Hotel ${n}`,
    description: '',
    starRating: 4,
    overallRating: 4.2,
    reviewCount: 100,
    address: { street: '', city: 'Chicago', state: 'IL', zipCode: '', country: 'USA' },
    amenities: [],
    policies: { checkInTime: '', checkOutTime: '', cancellation: '' },
    priceFrom: 150,
    photoUrl: '',
    rooms: [],
  }) as Hotel;

describe('HomeView — no destination', () => {
  beforeEach(() => {
    mockSetParams.mockClear();
    mockState = { country: null, city: null, stars: null, min: null, max: null, sort: 'rating', page: 1 };
    mockHotels = { data: undefined, isLoading: false, isError: false, isSuccess: false };
  });

  it('prompts to choose a destination and renders no grid', () => {
    render(<HomeView />);
    expect(screen.getByText(/choosing a destination/i)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull(); // no hotel cards
  });
});

describe('HomeView — loaded destination', () => {
  beforeEach(() => {
    mockSetParams.mockClear();
    mockState = { country: 'usa', city: null, stars: null, min: null, max: null, sort: 'rating', page: 1 };
    mockHotels = {
      data: Array.from({ length: 10 }, (_, i) => makeHotel(i + 1)),
      isLoading: false,
      isError: false,
      isSuccess: true,
    };
  });

  it('renders the first page of 8 cards and paginates via the URL', async () => {
    render(<HomeView />);
    expect(screen.getAllByRole('link')).toHaveLength(8); // 10 hotels, page size 8
    await userEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(mockSetParams).toHaveBeenCalledWith({ page: 2 });
  });

  it('opens the filter sheet and clears filters via Reset', async () => {
    render(<HomeView />);
    await userEvent.click(screen.getByRole('button', { name: /filters/i }));
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    await userEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(mockSetParams).toHaveBeenCalledWith({ stars: null, min: null, max: null });
  });

  it('forwards star and price changes made inside the filter sheet', async () => {
    render(<HomeView />);
    await userEvent.click(screen.getByRole('button', { name: /filters/i }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '5★' }));
    expect(mockSetParams).toHaveBeenCalledWith({ stars: 5 });
    await userEvent.type(within(dialog).getByLabelText('Minimum price'), '120');
    await userEvent.tab();
    expect(mockSetParams).toHaveBeenCalledWith({ min: 120, max: null });
  });

  it('shows the No-hotels empty state with a Reset action when filters exclude all', () => {
    mockState = { ...mockState, min: 99999 }; // empty rooms → price filter excludes all
    render(<HomeView />);
    expect(screen.getByText('No hotels found')).toBeTruthy();
    expect(screen.getByRole('button', { name: /reset filters/i })).toBeTruthy();
  });
});
