export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Read the base per-call (NOT at module load): the test env sets API_BASE_URL in
// tests/setupApiEnv.ts before modules evaluate, and a module-load read could miss it.
// In the browser API_BASE_URL is unset → '' → URLs stay relative (resolved by origin).
export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(await resolveUrl(url));
  if (!res.ok) {
    throw new ApiError(res.status, `Request failed (${res.status}): ${url}`);
  }
  return (await res.json()) as T;
}

// Turn a (usually relative) API path into something fetch can use in every context:
// - browser: relative URLs resolve against the page origin
// - server with API_BASE_URL set (tests/CI/prod): prepend it
// - server without a base: derive the origin from the incoming request, so an SSR
//   fetch gets an absolute URL without depending on .env.local or a fixed dev port
//   (Node's fetch rejects a relative URL with "Failed to parse URL").
async function resolveUrl(url: string): Promise<string> {
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.API_BASE_URL;
  if (base) return `${base}${url}`;
  if (typeof window !== 'undefined') return url;
  const { headers } = await import('next/headers');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}${url}`;
}
