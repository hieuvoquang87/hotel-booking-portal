import { render, screen } from '@testing-library/react';
import { AmenitiesGrid } from '@/components/hotel/AmenitiesGrid';

describe('AmenitiesGrid', () => {
  const amenities = ['free_wifi', 'pool', 'free_parking'];

  it('renders an Amenities heading', () => {
    render(<AmenitiesGrid amenities={amenities} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Amenities' })).toBeTruthy();
  });

  it('renders humanized labels for each amenity token', () => {
    render(<AmenitiesGrid amenities={amenities} />);
    // free_wifi → 'Wi-Fi' (SPECIAL map)
    expect(screen.getByText('Wi-Fi')).toBeTruthy();
    // pool → 'Pool'
    expect(screen.getByText('Pool')).toBeTruthy();
    // free_parking → 'Free parking' (curated label, matches the design mockup)
    expect(screen.getByText('Free parking')).toBeTruthy();
  });

  it('renders exactly one listitem per amenity', () => {
    render(<AmenitiesGrid amenities={amenities} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});
