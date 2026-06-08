import { render } from '@testing-library/react';
import { HomeViewFallback } from '@/components/home/HomeViewFallback';

describe('HomeViewFallback', () => {
  it('renders 8 skeleton cards so the first paint matches the loaded layout', () => {
    const { container } = render(<HomeViewFallback />);
    expect(container.querySelectorAll('[data-testid="sk-photo"]')).toHaveLength(8);
  });
});
