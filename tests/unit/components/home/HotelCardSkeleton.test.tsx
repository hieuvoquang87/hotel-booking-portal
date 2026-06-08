import { render } from '@testing-library/react';
import { HotelCardSkeleton } from '@/components/home/HotelCardSkeleton';

describe('HotelCardSkeleton', () => {
  it('is decorative (aria-hidden) and reserves a 16:9 photo block', () => {
    const { container } = render(<HotelCardSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[data-testid="sk-photo"]')).not.toBeNull();
  });
});
