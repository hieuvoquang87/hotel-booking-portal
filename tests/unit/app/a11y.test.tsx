import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import type { AvailableRoom } from '@/types/domain';
import type { Hotel } from '@/types/domain';

import NotFound from '../../../app/not-found';
import Loading from '../../../app/loading';
import AppError from '../../../app/error';

import { HotelHero } from '@/components/hotel/HotelHero';
import { AmenitiesGrid } from '@/components/hotel/AmenitiesGrid';
import { PoliciesList } from '@/components/hotel/PoliciesList';
import { RoomCard } from '@/components/hotel/RoomCard';
import { HotelCard } from '@/components/home/HotelCard';
import { ResultCount } from '@/components/home/ResultCount';
import { DestinationCombobox } from '@/components/home/DestinationCombobox';
import type { DestinationOption } from '@/lib/destinations';

// Disable page-level best-practice rules that false-positive on isolated component
// fragments (see Task 0 for the rationale). Contrast/focus/keyboard are jsdom-blind and
// covered by the manual audit (spec §5.2), not here.
const componentAxeOptions = {
  rules: {
    region: { enabled: false },
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
  },
};

// ---------------------------------------------------------------------------
// M6 boundary components
// ---------------------------------------------------------------------------

test('not-found has no axe violations', async () => {
  const { container } = render(<NotFound />);
  expect(await axe(container, componentAxeOptions)).toHaveNoViolations();
});

test('loading has no axe violations', async () => {
  const { container } = render(<Loading />);
  expect(await axe(container, componentAxeOptions)).toHaveNoViolations();
});

test('error boundary has no axe violations', async () => {
  // Suppress the console.error triggered by the component's useEffect(console.error, [error])
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const { container } = render(<AppError error={new Error('x')} unstable_retry={() => {}} />);
  expect(await axe(container, componentAxeOptions)).toHaveNoViolations();
  spy.mockRestore();
});

// ---------------------------------------------------------------------------
// M5 hotel-detail components
// ---------------------------------------------------------------------------

const hotel: Hotel = {
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
  amenities: ['free_wifi', 'pool'],
  policies: { checkInTime: '15:00', checkOutTime: '11:00', cancellation: 'Free' },
  description: 'A beautiful hotel in the heart of Paris.',
  priceFrom: 200,
  photoUrl: '',
  rooms: [],
} as unknown as Hotel;

test('HotelHero has no axe violations', async () => {
  const { container } = render(<HotelHero hotel={hotel} />);
  expect(await axe(container, componentAxeOptions)).toHaveNoViolations();
});

test('AmenitiesGrid has no axe violations', async () => {
  const { container } = render(<AmenitiesGrid amenities={['free_wifi', 'pool', 'free_parking']} />);
  expect(await axe(container, componentAxeOptions)).toHaveNoViolations();
});

test('PoliciesList has no axe violations', async () => {
  const policies: Hotel['policies'] = {
    checkInTime: '15:00',
    checkOutTime: '11:00',
    cancellation: 'Free cancellation within 48 hours',
  };
  const { container } = render(<PoliciesList policies={policies} />);
  expect(await axe(container, componentAxeOptions)).toHaveNoViolations();
});

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

test('RoomCard has no axe violations', async () => {
  const { container } = render(<RoomCard room={room} />);
  expect(await axe(container, componentAxeOptions)).toHaveNoViolations();
});

// ---------------------------------------------------------------------------
// M4 home-page components
// ---------------------------------------------------------------------------

const hotelCard: Hotel = {
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

test('HotelCard has no axe violations', async () => {
  const { container } = render(<HotelCard hotel={hotelCard} />);
  expect(await axe(container, componentAxeOptions)).toHaveNoViolations();
});

test('ResultCount has no axe violations', async () => {
  const { container } = render(<ResultCount loading={false} total={24} />);
  expect(await axe(container, componentAxeOptions)).toHaveNoViolations();
});

const destinationOptions: DestinationOption[] = [
  {
    kind: 'country',
    label: 'All hotels in USA',
    count: 2,
    search: 'usa all',
    key: 'c-usa',
    params: { country: 'usa' },
  },
  {
    kind: 'city',
    label: 'Chicago, IL — USA',
    count: 1,
    search: 'chicago il usa',
    key: 'city-usa-chicago',
    params: { country: 'usa', city: 'chicago' },
  },
];

test('DestinationCombobox has no axe violations', async () => {
  const { container } = render(
    <DestinationCombobox
      options={destinationOptions}
      value={null}
      onSelect={() => {}}
      onClear={() => {}}
      loading={false}
      error={false}
      onRetry={() => {}}
    />,
  );
  expect(await axe(container, componentAxeOptions)).toHaveNoViolations();
});
