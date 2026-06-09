import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // The detail page (M5) is a server component that fetches its own BFF route via
    // getJson, which prepends API_BASE_URL. .env.local (M5 Task 0) is gitignored, so CI
    // has no origin and the SSR fetch would throw → the detail page renders error.tsx and
    // primary-flow/no-rooms fail. Provision it here so local AND CI both have an origin.
    env: { ...process.env, API_BASE_URL: 'http://localhost:3000' },
  },
});
