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
  const base = process.env.API_BASE_URL ?? '';
  const res = await fetch(`${base}${url}`);
  if (!res.ok) {
    throw new ApiError(res.status, `Request failed (${res.status}): ${url}`);
  }
  return (await res.json()) as T;
}
