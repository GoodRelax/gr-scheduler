import { defineConfig } from 'vitest/config'

// Chapter 1.4 puts the layers that are decided by values alone under Vitest.
// Table T-218 of Chapter 7 settles which places those are: the directory a test
// sits in is what says which of the six kinds it is, so the three Vitest ones
// are listed here rather than swept up by a wildcard.
//
//   TS-2  tests/integration/  Chapter 9's Integration cases, parent SWS-xxx
//   TS-5  tests/contract/     the seams. Owned by neither side of a seam,
//                             driven by a specification table (Chapter 1.9,
//                             :275). No node in the specification: the grammar
//                             does not admit Unit as a TEST_LEVEL
//   TS-6  tests/unit/         the inside of one unit, written by whoever
//                             implemented it. No node, for the same reason
//
// tests/fixtures/ holds what every test shares and is not a kind of its own.
// The other three places of table T-218 are Playwright's; see
// playwright.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/contract/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/unit/**/*.test.ts',
    ],
  },
})
