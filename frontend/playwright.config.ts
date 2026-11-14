import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run against the PRODUCTION setup: Spring Boot serving the built frontend (real CSP,
 * frame-ancestors and cookies). Start it first - see README "Running end-to-end tests".
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8081'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-results.json' }]],
  use: { baseURL, trace: 'retain-on-failure', locale: 'en-GB' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    // Low-cost Android profile (small screen, touch) for the core journey and reflow checks.
    { name: 'android-chromium', use: { ...devices['Pixel 5'] }, grep: /@mobile/ },
  ],
})
