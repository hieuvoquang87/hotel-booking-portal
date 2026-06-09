import { render, screen } from '@testing-library/react';
import type { AvailableRoom } from '@/types/domain';
import { RoomCard } from '@/components/hotel/RoomCard';

const room: AvailableRoom = {
  roomId: 'room-01a',
  type: 'Deluxe King Room',
  pricePerNight: 299,
  bedType: 'King',
  bedCount: 1,
  maxOccupancy: 2,
  squareFootage: 450,
  amenities: ['city_view', 'mini_bar'],
};

describe('RoomCard', () => {
  it('shows type, full specs, humanized amenity pills, price, and the available badge', () => {
    render(<RoomCard room={room} />);
    expect(screen.getByRole('heading', { name: 'Deluxe King Room' })).toBeTruthy();
    expect(screen.getByText(/King · 1 bed · Sleeps 2 · 450 sq ft/)).toBeTruthy();
    // humanizeAmenity('city_view') → 'City view'
    expect(screen.getByText('City view')).toBeTruthy();
    // humanizeAmenity('mini_bar') → 'Mini bar'
    expect(screen.getByText('Mini bar')).toBeTruthy();
    expect(screen.getByText('$299')).toBeTruthy();
    expect(screen.getByText(/Available/)).toBeTruthy();
  });

  it('has no Reserve/booking button in Phase 1', () => {
    render(<RoomCard room={room} />);
    expect(screen.queryByRole('button', { name: /reserve|book/i })).toBeNull();
  });

  it('shows plural bed label when bedCount is greater than 1', () => {
    render(<RoomCard room={{ ...room, bedCount: 2 }} />);
    expect(screen.getByText(/2 beds/)).toBeTruthy();
  });
});
