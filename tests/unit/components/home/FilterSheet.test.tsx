import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterSheet } from '@/components/home/FilterSheet';

const base = {
  open: true,
  stars: 4 as number | null,
  min: null as number | null,
  max: null as number | null,
  resultCount: 12,
  onStars: jest.fn(),
  onPrice: jest.fn(),
  onReset: jest.fn(),
  onClose: jest.fn(),
};

describe('FilterSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders as a modal dialog when open', () => {
    render(<FilterSheet {...base} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('closes on Escape', async () => {
    render(<FilterSheet {...base} />);
    await userEvent.keyboard('{Escape}');
    expect(base.onClose).toHaveBeenCalled();
  });

  it('fires onReset and shows the apply button with the count', async () => {
    render(<FilterSheet {...base} />);
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(base.onReset).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Show 12' })).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<FilterSheet {...base} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
