import { render } from '@testing-library/react';
import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton', () => {
  it('renders a div element', () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('has aria-hidden="true"', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('has animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/animate-pulse/);
  });

  it('has rounded-md class', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/rounded-md/);
  });

  it('has bg-muted class', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/bg-muted/);
  });

  it('has data-slot="skeleton"', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('data-slot')).toBe('skeleton');
  });

  it('merges a passed className', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/h-4/);
    expect(el.className).toMatch(/w-32/);
  });

  it('forwards additional props', () => {
    const { container } = render(<Skeleton data-testid="skel" />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('data-testid')).toBe('skel');
  });
});
