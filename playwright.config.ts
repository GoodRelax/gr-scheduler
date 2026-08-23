import { defineConfig } from '@playwright/test'

// Chapter 1.4 puts confirmation through the user's own actions, and the
// performance measurements, under Playwright. Table T-218 of Chapter 7 settles
// which places those are:
//
//   TS-1  tests/usecase/  Chapter 8, System level, parent UC-xxx
//   TS-3  tests/system/   Chapter 9, System level, parent SWS-xxx
//   TS-4  tests/nfr/      Chapter 10, parent NFR-xxx. The performance gates of
//                         table T-043 are run from here
//
// TS-3 and TS-4 hold cases; TS-1 holds none yet, which is why `npm run e2e`
// carries --pass-with-no-tests. The other three places of table T-218 are
// Vitest's; see vitest.config.ts.
//
// ⚠️ NO BROWSER IS CHOSEN HERE. A case under tests/system/ opens its own, and
// says which one and which row of the specification chose it
// (`tests/system/live-app.ts`) -- table T-025 (MUST) has a measured value
// recorded together with the browser it was measured in, so the browser belongs
// next to the case rather than in a setting the case never mentions. A case
// that takes the built-in `page` fixture instead gets Playwright's own default.
export default defineConfig({
  testDir: 'tests',
  testMatch: ['usecase/**/*.test.ts', 'system/**/*.test.ts', 'nfr/**/*.test.ts'],
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
