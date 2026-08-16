import { defineConfig } from 'vitest/config'

// Chapter 1.4 puts the layers that are decided by values alone under Vitest.
//
// ⚠️ Where test code lives is NOT settled here. Chapter 5.3 hands that to
// Chapter 7, and Chapter 7 is still an empty frame, so the layout below is
// provisional and must be revisited when it is written:
//
//   tests/contract/*.contract.test.ts   the seams. Owned by neither side of a
//                                       seam, driven by a specification table,
//                                       written once (Chapter 1.9, :275)
//   tests/fixtures/                     what every test shares, so 71 units do
//                                       not each invent their own
//   tests/e2e/                          Playwright's, not Vitest's
//
// Unit tests are not listed: Chapter 9 does not allow Unit as a TEST_LEVEL, so
// where they go and who writes them is still open.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
})
