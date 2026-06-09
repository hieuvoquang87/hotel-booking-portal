import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineError } from '@/components/InlineError';
describe('InlineError', () => {
  it('shows the message with an alert role', () => {
    render(<InlineError message="Couldn't load availability" />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load availability");
  });
  it('fires Retry when provided', async () => {
    const onRetry = jest.fn();
    render(<InlineError message="x" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
  it('omits the Retry button when no handler is given', () => {
    render(<InlineError message="x" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
