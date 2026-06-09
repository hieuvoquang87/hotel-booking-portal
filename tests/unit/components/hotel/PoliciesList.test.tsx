import { render, screen } from '@testing-library/react';
import { PoliciesList } from '@/components/hotel/PoliciesList';
import type { Hotel } from '@/types/domain';

const policies: Hotel['policies'] = {
  checkInTime: '15:00',
  checkOutTime: '11:00',
  cancellation: 'Free cancellation within 48 hours',
};

describe('PoliciesList', () => {
  it('renders a Policies heading', () => {
    render(<PoliciesList policies={policies} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Policies' })).toBeTruthy();
  });

  it('renders the check-in time', () => {
    render(<PoliciesList policies={policies} />);
    expect(screen.getByText('15:00')).toBeTruthy();
  });

  it('renders the check-out time', () => {
    render(<PoliciesList policies={policies} />);
    expect(screen.getByText('11:00')).toBeTruthy();
  });

  it('renders the cancellation policy', () => {
    render(<PoliciesList policies={policies} />);
    expect(screen.getByText('Free cancellation within 48 hours')).toBeTruthy();
  });
});
