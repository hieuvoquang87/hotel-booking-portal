import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Error from '../../../app/error';

test('renders a recoverable error and Try again calls unstable_retry', async () => {
  const unstable_retry = jest.fn();
  render(<Error error={new globalThis.Error('boom')} unstable_retry={unstable_retry} />);
  expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /try again/i }));
  expect(unstable_retry).toHaveBeenCalledTimes(1);
});
