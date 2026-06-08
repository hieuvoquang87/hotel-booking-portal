import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from '@/components/home/Pagination';

describe('Pagination', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPage={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('emits the next page on click', async () => {
    const onPage = jest.fn();
    render(<Pagination page={1} totalPages={3} onPage={onPage} />);
    await userEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('disables previous on the first page and next on the last', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onPage={() => {}} />);
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    rerender(<Pagination page={3} totalPages={3} onPage={() => {}} />);
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });
});
