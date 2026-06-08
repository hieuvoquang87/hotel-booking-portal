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
    { roomId: 'room-01a', type: 'Deluxe King', pricePerNight: 299, bedType: 'King', maxOccupancy: 2 },
  ]),
);

export const m3Handlers = [locationsHandler, hotelsHandler, roomsHandler];
