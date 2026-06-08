import { render, screen } from '@testing-library/react';
import { ResultCount } from '@/components/home/ResultCount';

describe('ResultCount', () => {
  it('announces the loading state', () => {
    render(<ResultCount loading total={0} />);
    const region = screen.getByText('Loading hotels…');
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('pluralizes the hotel count', () => {
    const { rerender } = render(<ResultCount loading={false} total={1} />);
    expect(screen.getByText('1 hotel')).toBeTruthy();
    rerender(<ResultCount loading={false} total={24} />);
    expect(screen.getByText('24 hotels')).toBeTruthy();
  });

  it('shows "No hotels" for zero', () => {
    render(<ResultCount loading={false} total={0} />);
    expect(screen.getByText('No hotels')).toBeTruthy();
  });
});
