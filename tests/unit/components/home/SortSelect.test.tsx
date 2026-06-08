import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortSelect } from '@/components/home/SortSelect';

describe('SortSelect', () => {
  it('renders the four sort options with the current value selected', () => {
    render(<SortSelect id="sort" value="rating" onChange={() => {}} />);
    const select = screen.getByRole('combobox', { name: /sort/i }) as HTMLSelectElement;
    expect(select.value).toBe('rating');
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('emits the chosen SortKey', async () => {
    const onChange = jest.fn();
    render(<SortSelect id="sort" value="rating" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /sort/i }), 'price-asc');
    expect(onChange).toHaveBeenCalledWith('price-asc');
  });
});
