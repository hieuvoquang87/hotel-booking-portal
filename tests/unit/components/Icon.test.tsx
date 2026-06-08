import { render } from '@testing-library/react';
import { Icon } from '@/components/Icon';

describe('Icon', () => {
  it('renders an svg for a known name with an accessible default (aria-hidden)', () => {
    const { container } = render(<Icon name="pin" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('exposes a label when title is provided', () => {
    const { getByRole } = render(<Icon name="search" title="Search" />);
    expect(getByRole('img', { name: 'Search' })).toBeTruthy();
  });
});
