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
// None of the three exists yet -- no case has been written -- so `npm run e2e`
// carries --pass-with-no-tests. The other three places are Vitest's; see
// vitest.config.ts.
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
