import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PriceRange } from '@/components/home/PriceRange';

describe('PriceRange', () => {
  it('commits min and max on blur', async () => {
    const onCommit = jest.fn();
    render(<PriceRange min={null} max={null} onCommit={onCommit} />);
    const minInput = screen.getByLabelText('Minimum price');
    await userEvent.type(minInput, '100');
    await userEvent.tab(); // blur
    expect(onCommit).toHaveBeenLastCalledWith(100, null);
  });

  it('swaps when min > max before committing', async () => {
    const onCommit = jest.fn();
    render(<PriceRange min={null} max={null} onCommit={onCommit} />);
    await userEvent.type(screen.getByLabelText('Minimum price'), '300');
    await userEvent.type(screen.getByLabelText('Maximum price'), '100');
    await userEvent.tab();
    expect(onCommit).toHaveBeenLastCalledWith(100, 300);
  });

  it('treats an empty field as null', async () => {
    const onCommit = jest.fn();
    render(<PriceRange min={200} max={null} onCommit={onCommit} />);
    const minInput = screen.getByLabelText('Minimum price');
    await userEvent.clear(minInput);
    await userEvent.tab();
    expect(onCommit).toHaveBeenLastCalledWith(null, null);
  });
});
