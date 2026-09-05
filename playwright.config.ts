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
const origin = `http://localhost:${String(port)}`

export default defineConfig({
  testDir: 'tests',
  testMatch: ['usecase/**/*.test.ts', 'system/**/*.test.ts', 'nfr/**/*.test.ts'],
  use: {
    baseURL: origin,
  },
  webServer: {
    command: `npm run dev -- --port ${String(port)} --strictPort`,
    url: origin,
    reuseExistingServer: true,
  },
})
