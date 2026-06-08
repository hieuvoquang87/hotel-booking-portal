import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefineToolbar } from '@/components/home/RefineToolbar';

const props = {
  stars: null as number | null,
  min: null as number | null,
  max: null as number | null,
  sort: 'rating' as const,
  loading: false,
  total: 24,
  onStars: jest.fn(),
  onPrice: jest.fn(),
  onSort: jest.fn(),
};

describe('RefineToolbar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the controls and the result count', () => {
    render(<RefineToolbar {...props} />);
    expect(screen.getByRole('group', { name: /minimum star rating/i })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /sort/i })).toBeTruthy();
    expect(screen.getByText('24 hotels')).toBeTruthy();
  });

  it('forwards a star change', async () => {
    render(<RefineToolbar {...props} />);
    await userEvent.click(screen.getByRole('button', { name: '4★ & up' }));
    expect(props.onStars).toHaveBeenCalledWith(4);
  });
});
