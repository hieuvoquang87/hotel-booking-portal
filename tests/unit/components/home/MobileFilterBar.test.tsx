import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileFilterBar } from '@/components/home/MobileFilterBar';

describe('MobileFilterBar', () => {
  it('opens the sheet via the Filters button and shows an active-filter badge', async () => {
    const onOpen = jest.fn();
    render(<MobileFilterBar activeCount={2} sort="rating" onOpen={onOpen} onSort={() => {}} />);
    expect(screen.getByText('2')).toBeTruthy(); // badge
    await userEvent.click(screen.getByRole('button', { name: /filters/i }));
    expect(onOpen).toHaveBeenCalled();
  });
});
