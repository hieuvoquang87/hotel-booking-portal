import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlobalError from '../../../app/global-error';

test('renders a self-contained fallback and retries', async () => {
  // jsdom warns about <html> inside a <div>; silence the expected nesting noise.
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const unstable_retry = jest.fn();
  render(<GlobalError error={new Error('fatal')} unstable_retry={unstable_retry} />);
  expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /try again/i }));
  expect(unstable_retry).toHaveBeenCalledTimes(1);
  spy.mockRestore();
});
