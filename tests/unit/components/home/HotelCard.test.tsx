import { render, screen } from '@testing-library/react';
import type { Hotel } from '@/types/domain';
import { HotelCard } from '@/components/home/HotelCard';

const hotel = {
  id: 'hotel-01',
  name: 'The Grand Luminary',
  starRating: 5,
  overallRating: 4.8,
  reviewCount: 1240,
  address: { street: '', city: 'Chicago', state: 'IL', zipCode: '', country: 'USA' },
  amenities: ['swimming_pool', 'spa', 'free_wifi', 'fitness_center', 'bar'],
  priceFrom: 199,
  photoUrl: '',
  description: '',
  policies: { checkInTime: '', checkOutTime: '', cancellation: '' },
  rooms: [],
} as unknown as Hotel;

describe('HotelCard', () => {
  it('shows name, location, both ratings, review count, and price-from', () => {
    render(<HotelCard hotel={hotel} />);
    expect(screen.getByText('The Grand Luminary')).toBeTruthy();
    expect(screen.getByText(/Chicago, IL · USA/)).toBeTruthy();
    expect(screen.getByText('4.8')).toBeTruthy();
    expect(screen.getByText(/1,240/)).toBeTruthy();
    expect(screen.getByText(/from \$199/)).toBeTruthy();
  });

  it('links the whole card to the hotel detail route with a descriptive label', () => {
    render(<HotelCard hotel={hotel} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/hotels/hotel-01');
    expect(link.getAttribute('aria-label')).toMatch(/Grand Luminary/);
    expect(link.getAttribute('aria-label')).toMatch(/4\.8/);
  });

  it('shows the first three amenities humanized plus a "+N" pill', () => {
    render(<HotelCard hotel={hotel} />);
    expect(screen.getByText('Swimming pool')).toBeTruthy();
    expect(screen.getByText('Wi-Fi')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy(); // 5 amenities, 3 shown
  });
});
