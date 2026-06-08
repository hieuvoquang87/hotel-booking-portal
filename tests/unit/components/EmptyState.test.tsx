import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders title and optional subtext with role=status', () => {
    render(<EmptyState icon="pin" title="No hotels found" subtext="Try widening your filters" />);
    expect(screen.getByRole('status')).toHaveTextContent('No hotels found');
    expect(screen.getByText('Try widening your filters')).toBeTruthy();
  });

  it('renders an action button and fires its callback', async () => {
    const onAction = jest.fn();
    render(
      <EmptyState icon="pin" title="No hotels found" actionLabel="Reset filters" onAction={onAction} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('omits the button when no action is given', () => {
    render(<EmptyState icon="pin" title="Start by choosing a destination" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
