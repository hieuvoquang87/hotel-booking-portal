import type { RequestHandler } from 'msw';

// Empty in M0; real handlers (http.get(...) / HttpResponse) are added when
// integration tests arrive (M4/M5).
export const handlers: RequestHandler[] = [];
