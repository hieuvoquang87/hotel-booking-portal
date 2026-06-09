import { http, HttpResponse } from 'msw';

// Default test doubles for M2's /api/* routes. The shared MSW server (@/mocks/server)
// starts with NO handlers so the dev worker and integration tests stay clean; the
// query-hook tests opt in per-file via `server.use(...m3Handlers)`. Absolute origin so
// Node's real fetch (jest-fixed-jsdom) can resolve the URLs getJson builds from
// API_BASE_URL ('http://localhost', set in tests/setupApiEnv.ts).
const ORIGIN = 'http://localhost';

export const locationsHandler = http.get(`${ORIGIN}/api/locations`, () =>
  HttpResponse.json([
    { city: 'New York', country: 'USA', state: 'NY', citySlug: 'new-york', countrySlug: 'usa' },
  ]),
);

export const hotelsHandler = http.get(`${ORIGIN}/api/hotels`, ({ request }) => {
  const country = new URL(request.url).searchParams.get('country');
  if (country === 'usa') {
    return HttpResponse.json([{ id: 'hotel-01', name: 'Test Hotel', starRating: 5 }]);
  }
  return HttpResponse.json([]);
});

export const roomsHandler = http.get(`${ORIGIN}/api/hotels/:id/rooms`, () =>
  HttpResponse.json([
    {
      roomId: 'room-01a',
      type: 'Deluxe King',
      pricePerNight: 299,
      bedType: 'King',
      bedCount: 1,
      maxOccupancy: 2,
      squareFootage: 450,
      amenities: ['city_view', 'mini_bar'],
    },
  ]),
);

export const m3Handlers = [locationsHandler, hotelsHandler, roomsHandler];

// Richer doubles for the M4 home full-flow integration test: two USA cities and
// > 8 hotels (so pagination has ≥ 2 pages at page size 8) across a star/price spread.
const usaHotels = Array.from({ length: 10 }, (_, i) => ({
  id: `hotel-${String(i + 1).padStart(2, '0')}`,
  name: `USA Hotel ${i + 1}`,
  description: '',
  starRating: (i % 3) + 3, // 3, 4, 5
  overallRating: 4 + (i % 5) / 10,
  reviewCount: 100 + i,
  address: {
    street: '',
    city: i < 5 ? 'Chicago' : 'New York',
    state: i < 5 ? 'IL' : 'NY',
    zipCode: '',
    country: 'USA',
  },
  amenities: ['free_wifi', 'spa'],
  policies: { checkInTime: '', checkOutTime: '', cancellation: '' },
  priceFrom: 100 + i * 25,
  photoUrl: '',
  rooms: [],
}));

export const homeLocationsHandler = http.get(`${ORIGIN}/api/locations`, () =>
  HttpResponse.json([
    { city: 'Chicago', state: 'IL', country: 'USA', citySlug: 'chicago', countrySlug: 'usa' },
    { city: 'New York', state: 'NY', country: 'USA', citySlug: 'new-york', countrySlug: 'usa' },
  ]),
);

export const homeHotelsHandler = http.get(`${ORIGIN}/api/hotels`, ({ request }) => {
  const country = new URL(request.url).searchParams.get('country');
  return HttpResponse.json(country === 'usa' ? usaHotels : []);
});

export const homeFlowHandlers = [homeLocationsHandler, homeHotelsHandler];
