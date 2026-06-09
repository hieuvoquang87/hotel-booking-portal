import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders a native input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('forwards type prop — type="date" is reflected on the element', () => {
    const { container } = render(<Input type="date" />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('date');
  });

  it('reflects the value prop', () => {
    render(<Input type="text" value="hello" readOnly />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('hello');
  });

  it('fires onChange when the value changes', () => {
    const onChange = jest.fn();
    render(<Input onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'typing' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('merges a passed layout className', () => {
    render(<Input className="w-full" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/w-full/);
  });

  it('has min-h-11 for the 44px tap target', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/min-h-11/);
  });

  it('has data-slot="input"', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('data-slot')).toBe('input');
  });

  it('forwards a ref to the underlying input element', () => {
    let capturedEl: HTMLInputElement | null = null;
    render(<Input ref={(el) => { capturedEl = el; }} />);
    expect(capturedEl).not.toBeNull();
    expect((capturedEl as HTMLInputElement | null)?.tagName).toBe('INPUT');
  });
});
