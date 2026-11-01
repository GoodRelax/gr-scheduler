import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { configDefaults, defineConfig } from 'vitest/config'

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
//   TS-6  tests/unit/         only the functions no row of the omission
//                             table (rule 04 section 3.5, table UO) covers,
//                             written by a body that reads only the
//                             specification. No node, for the same reason
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
// run AT THE SAME TIME AS ITS NEIGHBORS. Seven files fall over under it, and
// MEASURED 2026-09-07 each of the seven falls over ALONE as well, so nothing
// leaks between files. Three mechanisms, none of which has a per-test form:
//
//   1. `globalThis.requestAnimationFrame`. A bench installs a fake frame pump
//      on the global and takes it off at the end (dfc-66-fr-101, uf-47-48-
//      choosers, fr-052-t-023d-picture-while-held). Two benches at once
//      overwrite each other's pump.
//   2. `vi.resetModules()` / `vi.doMock`. The module registry is per FILE.
//      uf-67 and display-words.contract swap the generated dictionary for a
//      dictionary of marks for the length of ONE case; a neighbor reading the
//      real dictionary at that moment reads the marks, or waits for a registry
//      that is being reset under it and times out.
//   3. `expect.soft`. Vitest refuses the global `expect.soft` inside a
//      concurrent test -- it has no current case to attach the soft failure to.
//      15 call sites in 3 files, all of them correct as the suite is run.
//
// ⛔ SO DO NOT "FIX" THOSE SEVEN BY LOOSENING THEM, and do not turn concurrency
// off in this file either -- it was never on. ⭐ AND THE MODE BUYS NOTHING:
// MEASURED 2026-09-07 on the same tree, 19.15s by file alone against 20.03s and
// 20.09s with `--sequence.concurrent`. See `DFC-352`.
//
// ---------------------------------------------------------------------------
// THE MSPDI SCHEMA IS LOCAL-ONLY (JDG-644)
// ---------------------------------------------------------------------------
//
// docs/reference/mspdi/ is gitignored and never enters the repository, so a git
// worktree has no copy. The files that read it are listed once in
// tests/fixtures/mspdi-xsd.json; where the schema is absent they are left out of
// the run, and tests/contract/mspdi-xsd-local-only.test.ts reports each of them
// as a skipped case that names the reason and the missing paths. Where the
// schema is present they run as usual. The gates run in the root checkout, and
// tools/gate/run-gate.mjs stops before anything else when the schema is missing.
//
// ---------------------------------------------------------------------------
// HALF THE LOGICAL CPUS RUN TEST FILES, NOT ALL OF THEM
// ---------------------------------------------------------------------------
//
// Vitest's default starts one worker per logical CPU but one. On the reference
// machine (10 physical cores, 16 logical) that oversubscribes it: GT-2 on develop
// 28457d63a failed three runs in a row on three frame-heavy cases that take
// 0.6-1.2 s alone (dfc-2980 "1 px steps, release past", cr-572 FR-052 "a dragged
// width", dfc-2960 "row under the pointer hovered") and hit the 5 s timeout in the
// full run. MEASURED 2026-10-31 on the same tree: default workers, the summed test
// time is about 870 s and those cases reach 5.0-6.3 s; at half the logical CPUs
// it is about 486 s, they peak at 1.9-2.2 s, and the wall time moves 110 s ->
// 120 s. The cases themselves run as fast as on 67c291388, so no src change
// slowed them; the run starved them.
const here = dirname(fileURLToPath(import.meta.url))
const mspdi = JSON.parse(readFileSync(join(here, 'tests', 'fixtures', 'mspdi-xsd.json'), 'utf8')) as {
  readonly schemas: readonly string[]
  readonly readers: readonly string[]
}
const schemaIsAbsent = mspdi.schemas.some((path) => !existsSync(join(here, path)))
const skippedWithoutTheSchema = schemaIsAbsent ? mspdi.readers : []

export default defineConfig({
  test: {
    maxWorkers: '50%',
    environment: 'node',
    include: [
      'tests/contract/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/unit/**/*.test.ts',
    ],
    exclude: [...configDefaults.exclude, ...skippedWithoutTheSchema],
  },
})
