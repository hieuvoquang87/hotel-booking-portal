import { render, screen, fireEvent } from '@testing-library/react';
import { DateField } from '@/components/hotel/DateField';

describe('DateField', () => {
  it('associates the label and emits the chosen date', () => {
    const onChange = jest.fn();
    render(<DateField id="check-in" label="Check-in" value={null} onChange={onChange} />);
    const input = screen.getByLabelText('Check-in');
    fireEvent.change(input, { target: { value: '2026-07-10' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-07-10');
  });

  it('forwards min and reflects value', () => {
    const onChange = jest.fn();
    render(
      <DateField
        id="check-out"
        label="Check-out"
        value="2026-07-12"
        min="2026-07-10"
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText('Check-out') as HTMLInputElement;
    expect(input.min).toBe('2026-07-10');
    expect(input.value).toBe('2026-07-12');
  });

  it('emits null when the value is cleared', () => {
    const onChange = jest.fn();
    render(
      <DateField id="check-in" label="Check-in" value="2026-07-10" onChange={onChange} />,
    );
    const input = screen.getByLabelText('Check-in');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
