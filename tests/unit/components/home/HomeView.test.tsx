import { render, screen } from '@testing-library/react';

const mockSetParams = jest.fn();
let mockState = {
  country: null,
  city: null,
  stars: null,
  min: null,
  max: null,
  sort: 'rating',
  page: 1,
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
  useHotels: () => ({ data: undefined, isLoading: false, isError: false, isSuccess: false }),
}));

import { HomeView } from '@/components/home/HomeView';

describe('HomeView — no destination', () => {
  beforeEach(() => {
    mockSetParams.mockClear();
    mockState = {
      country: null,
      city: null,
      stars: null,
      min: null,
      max: null,
      sort: 'rating',
      page: 1,
    };
  });

  it('prompts to choose a destination and renders no grid', () => {
    render(<HomeView />);
    expect(screen.getByText(/choosing a destination/i)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull(); // no hotel cards
  });
});
