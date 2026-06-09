/** @jest-environment node */
import React from 'react';

// Mock next/navigation before importing the page
const notFoundSentinel = new Error('NEXT_NOT_FOUND');
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw notFoundSentinel;
  }),
}));

// Mock next/link — returns a plain anchor in tests
jest.mock('next/link', () => {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children);
  Link.displayName = 'Link';
  return { __esModule: true, default: Link };
});

// jest.mock does not run paths through next/jest's `@/` moduleNameMapper, so
// target modules by relative path (they resolve to the same files @/ imports).
// Must define ApiError INSIDE the factory so instanceof checks work — factories
// cannot close over outer vars unless they are mock-prefixed.
jest.mock('../../../../../lib/fetcher', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  }
  return {
    __esModule: true,
    ApiError,
    getJson: jest.fn(),
  };
});

// Mock all hotel child components to avoid rendering complex islands
jest.mock('../../../../../components/hotel/HotelHero', () => ({
  HotelHero: ({ hotel }: { hotel: { name: string } }) =>
    React.createElement('div', { 'data-testid': 'hotel-hero' }, hotel.name),
}));
jest.mock('../../../../../components/hotel/AmenitiesGrid', () => ({
  AmenitiesGrid: ({ amenities }: { amenities: string[] }) =>
    React.createElement('div', { 'data-testid': 'amenities-grid' }, amenities.join(',')),
}));
jest.mock('../../../../../components/hotel/PoliciesList', () => ({
  PoliciesList: () => React.createElement('div', { 'data-testid': 'policies-list' }),
}));
jest.mock('../../../../../components/hotel/RoomAvailability', () => ({
  RoomAvailability: ({ hotelId }: { hotelId: string }) =>
    React.createElement('div', { 'data-testid': 'room-availability' }, hotelId),
}));
jest.mock('../../../../../components/hotel/BackToResults', () => ({
  BackToResults: () => React.createElement('div', { 'data-testid': 'back-to-results' }),
}));
jest.mock('../../../../../components/EmptyState', () => ({
  EmptyState: () => React.createElement('div', { 'data-testid': 'empty-state' }),
}));

import { notFound } from 'next/navigation';
import { getJson, ApiError } from '../../../../../lib/fetcher';
import HotelDetailPage, { generateMetadata } from '../../../../../app/hotels/[id]/page';

const mockGetJson = getJson as jest.MockedFunction<typeof getJson>;

const hotelFixture = {
  id: 'hotel-01',
  name: 'Grand Plaza Hotel',
  description: 'A wonderful hotel in the heart of the city.',
  starRating: 5,
  overallRating: 4.8,
  reviewCount: 1234,
  address: {
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'United States',
  },
  amenities: ['wifi', 'pool', 'gym'],
  policies: {
    checkInTime: '3:00 PM',
    checkOutTime: '11:00 AM',
    cancellation: 'Free cancellation up to 24 hours',
  },
  priceFrom: 299,
  photoUrl: '',
  rooms: [],
};

describe('generateMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns hotel name and description when getJson resolves', async () => {
    mockGetJson.mockResolvedValue(hotelFixture);
    const meta = await generateMetadata({ params: Promise.resolve({ id: 'hotel-01' }) });
    expect(meta.title).toBe('Grand Plaza Hotel');
    expect(meta.description).toMatch(/5-star hotel in New York/);
  });

  it('returns fallback title when getJson rejects', async () => {
    mockGetJson.mockRejectedValue(new Error('network error'));
    const meta = await generateMetadata({ params: Promise.resolve({ id: 'bad-id' }) });
    expect(meta.title).toBe('Hotel');
  });
});

describe('HotelDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls notFound() when getJson rejects with ApiError(404)', async () => {
    mockGetJson.mockRejectedValue(new ApiError(404, 'not found'));

    await expect(
      HotelDetailPage({ params: Promise.resolve({ id: 'nope' }) }),
    ).rejects.toThrow(notFoundSentinel);

    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('renders hotel detail when getJson resolves a hotel', async () => {
    mockGetJson.mockResolvedValue(hotelFixture);

    const element = await HotelDetailPage({ params: Promise.resolve({ id: 'hotel-01' }) });

    expect(mockGetJson).toHaveBeenCalledWith('/api/hotels/hotel-01');

    // The element tree should contain the hotel name somewhere
    const tree = JSON.stringify(element);
    expect(tree).toContain('Grand Plaza Hotel');
  });

  it('re-throws non-404 errors from fetchHotel', async () => {
    const networkErr = new Error('network timeout');
    mockGetJson.mockRejectedValue(networkErr);

    await expect(
      HotelDetailPage({ params: Promise.resolve({ id: 'hotel-01' }) }),
    ).rejects.toThrow('network timeout');

    expect(notFound).not.toHaveBeenCalled();
  });
});
