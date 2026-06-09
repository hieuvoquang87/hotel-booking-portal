import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Hello</Badge>);
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('renders the success variant with success class', () => {
    render(<Badge variant="success">Available</Badge>);
    const el = screen.getByText('Available');
    expect(el.className).toMatch(/success/);
  });

  it('renders the muted variant with muted class', () => {
    render(<Badge variant="muted">Muted</Badge>);
    const el = screen.getByText('Muted');
    expect(el.className).toMatch(/muted/);
  });

  it('renders the default variant', () => {
    render(<Badge variant="default">Default</Badge>);
    expect(screen.getByText('Default')).toBeTruthy();
  });
});
