import { render, screen } from '@testing-library/react';
import Loading from '../../../app/loading';

test('renders an accessible loading status', () => {
  render(<Loading />);
  expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
});
