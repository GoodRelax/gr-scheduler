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
// ⛔⛔ THE PORT IS PER CHECKOUT, AND THAT IS NOT A CONVENIENCE.
//
// ⚠️ MEASURED 2026-09-05, and it silently corrupted a day of measurement. The
// port used to be the literal 5173 with `reuseExistingServer: true`. Every git
// worktree carries this same file, so the FIRST dev server to claim 5173 won
// it, and every later run -- in a different worktree, or in the main checkout
// -- adopted that stranger's server and measured ITS source.
//
// How it showed: two spec-only cases reported a moved bar's `wbsOrder`
// unchanged. The code was correct and the same file passed on another port.
// The discriminator was one fetch:
//
//   curl :5273/src/use-case/edit-document/edit-task.ts | grep -c ...  -> 2
//   curl :5173/src/use-case/edit-document/edit-task.ts | grep -c ...  -> 0
//
// and the process holding 5173 was another agent's worktree. A green run means
// nothing if the bytes under test came from somewhere else, so the port is now
// derived from the checkout's own path: two worktrees cannot collide, and
// neither can adopt the other. ⛔ `--strictPort` does not help -- the reuse
// branch fires before anything is spawned.
//
// ⭐ Override with GRS_DEV_PORT when you want a fixed one.
const portForThisCheckout = (): number => {
  const named = Number(process.env.GRS_DEV_PORT)
  if (Number.isInteger(named) && named > 0) return named
  let hash = 0
  for (const code of process.cwd()) hash = (hash * 31 + code.charCodeAt(0)) % 10000
  return 5200 + (hash % 700)
}

const port = portForThisCheckout()

// The two performance gates of table T-043 drive 1,000 tasks for minutes and
// are measured only on purpose (RISK-001, JDG-605): set GRS_PERF=1 to run them.
// nfr-004 is not a performance case and stays in every run.
const PERFORMANCE_GATES = [
  'nfr/nfr-001-010-011-013-the-rest-of-chapter-7.test.ts',
  'nfr/nfr-002-003-frame-time-is-the-interval.test.ts',
]
const measuresPerformance = process.env['GRS_PERF'] === '1'
const origin = `http://localhost:${String(port)}`

export default defineConfig({
  testDir: 'tests',
  testMatch: ['usecase/**/*.test.ts', 'system/**/*.test.ts', 'nfr/**/*.test.ts'],
  testIgnore: measuresPerformance ? [] : PERFORMANCE_GATES,
  use: {
    baseURL: origin,
  },
  webServer: {
    command: `npm run dev -- --port ${String(port)} --strictPort`,
    url: origin,
    reuseExistingServer: true,
  },
  // DFC-604: a cold `npm run dev` (Vite's dev server) can take longer than the
  // 30s per-test timeout for the first navigation, so e2e cases that hit an
  // unwarmed server fail on `page.goto` rather than on their own assertion.
  // Serving a build instead (the first shape this fix took) broke DFC-282's
  // dynamic `import('/src/...')`, which only the dev server can answer -- so
  // the dev server stays, and is warmed before any test's own clock starts.
  // Playwright runs globalSetup AFTER webServer is accepting connections
  // (measured here, not just taken from the docs -- see the DFC-604 report).
  globalSetup: './tests/system/global-warm-dev-server.ts',
})
