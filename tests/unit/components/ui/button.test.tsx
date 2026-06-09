import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with primary bg and merges custom className', () => {
    render(<Button className="w-full">Go</Button>);
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn.className).toMatch(/bg-primary/);
    expect(btn.className).toMatch(/w-full/);
  });

  it('renders the destructive variant with destructive class', () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toMatch(/destructive/);
  });

  it('has min-h-11 baked in for the 44px touch target', () => {
    render(<Button>Touch</Button>);
    const btn = screen.getByRole('button', { name: 'Touch' });
    expect(btn.className).toMatch(/min-h-11/);
  });

  it('renders outline variant without bg-primary', () => {
    render(<Button variant="outline">Outline</Button>);
    const btn = screen.getByRole('button', { name: 'Outline' });
    expect(btn.className).toMatch(/outline/);
  });

  it('renders ghost variant with hover-muted classes', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button', { name: 'Ghost' });
    expect(btn.className).toMatch(/hover:bg-muted/);
  });

  it('renders link variant with underline-offset', () => {
    render(<Button variant="link">Link</Button>);
    const btn = screen.getByRole('button', { name: 'Link' });
    expect(btn.className).toMatch(/underline-offset/);
  });

  it('is disabled when the disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
  });
});
