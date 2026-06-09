import { render, screen } from '@testing-library/react';
import { Label } from '@/components/ui/label';

describe('Label', () => {
  it('renders children text', () => {
    render(<Label>Name</Label>);
    expect(screen.getByText('Name')).toBeTruthy();
  });

  it('associates with an input via htmlFor — getByLabelText resolves', () => {
    render(
      <div>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </div>
    );
    // getByLabelText traverses the for/id association
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });

  it('renders a <label> element', () => {
    const { container } = render(<Label htmlFor="x">Click me</Label>);
    expect(container.querySelector('label')).not.toBeNull();
  });

  it('has data-slot="label"', () => {
    const { container } = render(<Label>Label text</Label>);
    const label = container.querySelector('label');
    expect(label?.getAttribute('data-slot')).toBe('label');
  });

  it('applies text-sm and font-medium classes', () => {
    const { container } = render(<Label>Styled</Label>);
    const label = container.querySelector('label') as HTMLLabelElement;
    expect(label.className).toMatch(/text-sm/);
    expect(label.className).toMatch(/font-medium/);
  });

  it('merges additional className', () => {
    const { container } = render(<Label className="sr-only">Hidden</Label>);
    const label = container.querySelector('label') as HTMLLabelElement;
    expect(label.className).toMatch(/sr-only/);
  });
});
