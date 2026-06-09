import { defineConfig, devices } from '@playwright/test';

// Allow the port to be overridden via PORT env so the test suite works when the
// default port 3000 is occupied by another process on the developer's machine.
const PORT = process.env.PORT ?? '3000';
const BASE = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'npm run build && npm run start' : `PORT=${PORT} npm run dev`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // The detail page (M5) is a server component that fetches its own BFF route via
    // getJson, which prepends API_BASE_URL. .env.local (M5 Task 0) is gitignored, so CI
    // has no origin and the SSR fetch would throw → the detail page renders error.tsx and
    // primary-flow/no-rooms fail. Provision it here so local AND CI both have an origin.
    env: { API_BASE_URL: BASE },
  },
});
