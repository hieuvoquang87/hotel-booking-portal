process.env.AVAILABILITY_LATENCY_MS = '0';

// M3 client hooks fetch via lib/fetcher.getJson, which prepends API_BASE_URL so
// Node's real fetch (kept by jest-fixed-jsdom) can resolve the otherwise-relative
// /api/* URLs. MSW handlers register at this absolute origin. Unset in the browser
// → '' → URLs stay relative and resolve against the page origin.
process.env.API_BASE_URL = 'http://localhost';
