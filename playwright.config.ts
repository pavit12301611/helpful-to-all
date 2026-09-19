import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end journeys.
 *
 * They run against a real server (`npm run dev` by default) with the seeded demo
 * database. Set BASE_URL to test a deployed instance instead.
 *
 *   npx playwright install --with-deps chromium
 *   npm run test:e2e
 */
const PORT = process.env.PORT ?? '3100';
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `PORT=${PORT} npm run dev`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { PORT },
      },
});
