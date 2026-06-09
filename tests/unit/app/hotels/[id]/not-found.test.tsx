import { render, screen } from '@testing-library/react';

// Mock next/link — returns a plain anchor in tests
jest.mock('next/link', () => {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').createElement('a', { href }, children);
  Link.displayName = 'Link';
  return { __esModule: true, default: Link };
});

import HotelNotFound from '../../../../../app/hotels/[id]/not-found';

describe('HotelNotFound', () => {
  it('renders a "Hotel not found" heading', () => {
    render(<HotelNotFound />);
    expect(screen.getByText('Hotel not found')).toBeTruthy();
  });

  it('renders a link back to the home page', () => {
    render(<HotelNotFound />);
    const link = screen.getByRole('link', { name: /browse hotels/i });
    expect(link).toBeTruthy();
    // In jsdom, href is resolved to an absolute URL; getAttribute gives the raw value
    expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/');
  });
});
