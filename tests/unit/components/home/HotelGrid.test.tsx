import { render, screen } from '@testing-library/react';
import type { Hotel } from '@/types/domain';
import { HotelGrid } from '@/components/home/HotelGrid';

const hotels = [1, 2].map(
  (n) =>
    ({
      id: `hotel-0${n}`,
      name: `Hotel ${n}`,
      starRating: 4,
      overallRating: 4.2,
      reviewCount: 100,
      address: { street: '', city: 'X', state: 'Y', zipCode: '', country: 'Z' },
      amenities: [],
      priceFrom: 150,
      photoUrl: '',
      description: '',
      policies: { checkInTime: '', checkOutTime: '', cancellation: '' },
      rooms: [],
    }) as unknown as Hotel,
);

describe('HotelGrid', () => {
  it('renders 8 skeletons while loading', () => {
    const { container } = render(<HotelGrid hotels={[]} loading />);
    expect(container.querySelectorAll('[data-testid="sk-photo"]')).toHaveLength(8);
  });

  it('renders a card per hotel when loaded', () => {
    render(<HotelGrid hotels={hotels} loading={false} />);
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
});
