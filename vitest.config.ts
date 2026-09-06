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
//
// ---------------------------------------------------------------------------
// HOW THIS SUITE IS RUN IN PARALLEL, AND WHY `--sequence.concurrent` IS NOT IT
// ---------------------------------------------------------------------------
//
// Files already run in parallel: Vitest gives each test FILE its own worker and
// its own module graph (`isolate` is left at its default, true). That is the
// parallelism this suite is written for, and `npx vitest run --no-isolate` is
// green as well -- MEASURED 2026-09-07, 179 of 180 files, the odd one being
// uf-36, whose XSD lives under the gitignored docs/reference and is absent from
// every worktree.
//
// `--sequence.concurrent` is a different thing: it makes every `it` in a file
// run AT THE SAME TIME AS ITS NEIGHBOURS. Seven files fall over under it, and
// MEASURED 2026-09-07 each of the seven falls over ALONE as well, so nothing
// leaks between files. Three mechanisms, none of which has a per-test form:
//
//   1. `globalThis.requestAnimationFrame`. A bench installs a fake frame pump
//      on the global and takes it off at the end (d-66-fr-101, uf-47-48-
//      choosers, fr-052-t-023d-picture-while-held). Two benches at once
//      overwrite each other's pump.
//   2. `vi.resetModules()` / `vi.doMock`. The module registry is per FILE.
//      uf-67 and display-words.contract swap the generated dictionary for a
//      dictionary of marks for the length of ONE case; a neighbour reading the
//      real dictionary at that moment reads the marks, or waits for a registry
//      that is being reset under it and times out.
//   3. `expect.soft`. Vitest refuses the global `expect.soft` inside a
//      concurrent test -- it has no current case to attach the soft failure to.
//      15 call sites in 3 files, all of them correct as the suite is run.
//
// ⛔ SO DO NOT "FIX" THOSE SEVEN BY LOOSENING THEM, and do not turn concurrency
// off in this file either -- it was never on. ⭐ AND THE MODE BUYS NOTHING:
// MEASURED 2026-09-07 on the same tree, 19.15s by file alone against 20.03s and
// 20.09s with `--sequence.concurrent`. See `D-352`.
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
