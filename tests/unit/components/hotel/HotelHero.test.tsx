import { render, screen } from '@testing-library/react';
import { HotelHero } from '@/components/hotel/HotelHero';
import type { Hotel } from '@/types/domain';

const hotel = {
  id: 'h1',
  name: 'The Grand Palace',
  starRating: 5,
  overallRating: 4.8,
  reviewCount: 1240,
  address: {
    street: '123 Main St',
    city: 'Paris',
    state: 'Île-de-France',
    zipCode: '75001',
    country: 'France',
  },
  amenities: [],
  policies: { checkInTime: '15:00', checkOutTime: '11:00', cancellation: 'Free' },
  description: '',
  priceFrom: 200,
  photoUrl: '',
  rooms: [],
} as unknown as Hotel;

describe('HotelHero', () => {
  it('renders the hotel name as h1', () => {
    render(<HotelHero hotel={hotel} />);
    expect(screen.getByRole('heading', { level: 1, name: 'The Grand Palace' })).toBeTruthy();
  });

  it('renders the full address on one line', () => {
    render(<HotelHero hotel={hotel} />);
    expect(
      screen.getByText('123 Main St, Paris, Île-de-France 75001, France'),
    ).toBeTruthy();
  });

  it('renders the star badge', () => {
    render(<HotelHero hotel={hotel} />);
    expect(screen.getByText('5★ hotel')).toBeTruthy();
  });

  it('renders the review count with locale formatting', () => {
    render(<HotelHero hotel={hotel} />);
    expect(screen.getByText('1,240 reviews')).toBeTruthy();
  });

  it('renders RatingStars with the correct aria-label', () => {
    render(<HotelHero hotel={hotel} />);
    expect(screen.getByLabelText(/rated 4\.8 out of 5/i)).toBeTruthy();
  });
});
