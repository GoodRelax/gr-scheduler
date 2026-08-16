import { defineConfig } from '@playwright/test'

// Chapter 1.4 puts confirmation through the user's own actions, and the
// performance measurements, under Playwright.
//
// As in vitest.config.ts, where the test files live is Chapter 7's to decide
// and Chapter 7 is still an empty frame. `testDir` below is the one thing
// Playwright cannot default sensibly -- without it every directory in the
// repository is scanned -- so it is written down as provisional and must be
// revisited when Chapter 7 is filled in.
export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
