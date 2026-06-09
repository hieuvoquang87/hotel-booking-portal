import { render, screen } from '@testing-library/react';
import NotFound from '../../../app/not-found';

test('renders a 404 heading and a Browse hotels link to home', () => {
  render(<NotFound />);
  expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /browse hotels/i })).toHaveAttribute('href', '/');
});
