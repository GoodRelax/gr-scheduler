export const meta = {
  name: 'wire-the-remaining-seams',
  description: 'Wire the four seams the shell still has a STOP for, each in its own worktree',
  whenToUse: 'The round after 2026-08-23. Four independent pieces of work that touch disjoint files: FileGateway into the shell, scheduleViolations, AM-13 export picture, and opening tests/system. Read previous-project-result/temp/handoff-DESIGN-28.md first -- it holds what each one is blocked on. Pass { stage: "implement" } first, then { stage: "test" } after the merge point.',
  phases: [
    { title: 'Implement', detail: 'one worktree per seam, no verification inside' },
    { title: 'Test', detail: 'a second agent per seam, reading docs/spec only' },
  ],
}

// ⛔ RUN THIS TWICE, NOT ONCE. Pass { stage: 'implement' } first, then
// { stage: 'test' } after the front session has merged and verified.
//
// ⚠️ WHY. `isolation: 'worktree'` cuts every agent a FRESH tree from the base
// commit. A test agent chained straight after an implement agent therefore sees
// a tree in which the code it is meant to test does not exist -- so the proof
// rule 04 section 2 demands ("break it, watch it go red, restore") cannot run,
// and the case is written against a signature that is not there yet.
// Splitting the stages puts the merge point between them, which is where rule
// 05 puts verification anyway.

// ⛔ THIS SCRIPT DOES NOT VERIFY. Rule 05 of docs/development-rules puts the
// checks at the merge point, run by the front session, once -- because eleven
// agents each running `npm test` on a shared tree is what the last round
// measured as the main waste. Every agent below is told the same thing: write,
// and report what you changed and what you could not do.
//
// ⭐ WHY WORKTREES. The same round had agents overwrite each other's scratch
// space, disagree about the test baseline, and one died with its report lost.
// `isolation: 'worktree'` gives each one its own copy of the repository.
//
// ⚠️ THE SPEC IS NOT TOUCHED HERE. Rule 05 section 6 keeps specification edits
// with the front session, alone. If a seam turns out to need one, the agent
// says so and stops -- it does not write into docs/spec.

const HOUSE_RULES = `
# House rules (docs/development-rules/)
- English and ASCII in code, comments and test names (rule 03 section 5).
- Comments say WHY, and name specification row ids. ⛔ Never copy specification
  prose or values into a comment -- a copied value goes stale in silence.
- R7.6 (MUST): exactly one \`@purity\` tag per function.
- R2.1 (MUST): use the name the specification spells. Do not coin a synonym.
- Where the specification is silent, write a \`⛔\` comment saying exactly what is
  missing (rule 02 section 3). ⛔ Do not guess a value.
- ⛔ Do NOT touch docs/spec/**. If this work needs a specification change, stop
  and say which object would move -- the front session applies those alone.
- ⛔ No git commit / push / tag.

# What to report
Report ONLY: what you changed, what you could not do and why, and any file
outside your ownership that must now change. ⛔ Do NOT run npm test, npm run
typecheck or check.sh -- the front session runs those once at the merge point.
`

const SEAMS = [
  {
    key: 'file-gateway',
    owns: 'src/framework/single-html-shell/** and src/adapter/file-gateway/**',
    what: `Wire \`FileGateway\` (PI-22) into the shell so a document can be opened and saved.

\`frame-loop.ts\` has a STOP saying no gateway is constructed, and \`chooseStartupDocument\`
is handed 「none」 for the three ranks a gateway would fill (BO-2).
⚠️ Table T-066 CS-4 governs the wait: collect everything needed BEFORE starting,
do NOT re-read the current value while the human is answering, and land through
\`replaceDocument\`. Table T-230 says what each of the six callers keeps.
⛔ Open item: \`askToWriteOver\` is never called by \`file-system-access-file-store.ts\`
today, and DI-4 of table T-227 requires the question. Close it or say why not.`,
  },
  {
    key: 'schedule-violations',
    owns: 'src/entity/document-model/schedule/**',
    what: `Write \`scheduleViolations\` (PI-1) -- the last debt check 26b carries.

The seventeen invariants are table T-220 of Chapter 6.1.
⛔ DRIVE IT FROM THE TABLE (Chapter 6.1, MUST). Do not write seventeen hand-rolled
row checks: the table is the source and a second copy of it goes stale.
⚠️ \`validate-imported-document.ts\` and \`edit-annotation.ts\` already write as though
it existed -- read what they expect of it before choosing the shape.`,
  },
  {
    key: 'am-13-picture',
    owns: 'src/adapter/agent-api-endpoint/** and src/framework/single-html-shell/**',
    what: `Make \`AM-13\` answer with the export picture (IO-3 of table T-024, S-81 of table T-204).

⚠️ TWO TESTS STAND RED ON THIS RIGHT NOW: tests/unit/uf-27-28-29.test.ts, the cases
naming exportCanvas width and the empty schedule. They were written from the
specification and are correct -- make the code meet them.
This needs IF-7 widened so the shell can build a picture with the panels closed.
⛔ NOT EVERY FRAME (ADR-001 / MN-6), and ⛔ not fetched afterwards either (R7.4).`,
  },
  {
    key: 'tests-system',
    owns: 'tests/system/** and playwright.config.ts',
    what: `Open \`tests/system/\` -- TS-3 of table T-218, System level, parent SWS-xxx, Playwright.

⭐ tests/nfr/ was opened the same way on 2026-08-23; copy its shape.
⭐ USE THE BROWSER ALREADY ON THE MACHINE: \`chromium.launch({ channel: 'msedge' })\`.
Table T-003 CN-2 makes Chromium the reference, and this needs no download.
⚠️ The built artifact carries a CSP pinning the inline script by sha256, so
patching dist/index.html blanks the page -- drive the live DOM instead.
Cover the SWS nodes of Chapter 6.1 that have no case yet.`,
  },
]

const FINDING = {
  type: 'object',
  additionalProperties: false,
  required: ['seam', 'changed', 'blocked', 'needsSpecChange', 'otherFilesToChange'],
  properties: {
    seam: { type: 'string' },
    changed: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['file', 'what'],
        properties: { file: { type: 'string' }, what: { type: 'string' } },
      },
    },
    blocked: {
      type: 'array',
      description: 'What could not be done, and why. Empty is a valid answer.',
      items: { type: 'string' },
    },
    needsSpecChange: {
      type: 'array',
      description: 'Specification objects that would have to move. The front session applies these.',
      items: { type: 'string' },
    },
    otherFilesToChange: {
      type: 'array',
      description: 'Files outside this agent\'s ownership that must now change.',
      items: { type: 'string' },
    },
  },
}

const TEST_REPORT = {
  type: 'object',
  additionalProperties: false,
  required: ['seam', 'cases', 'red', 'specSilences'],
  properties: {
    seam: { type: 'string' },
    cases: { type: 'array', items: { type: 'string' } },
    red: {
      type: 'array',
      description: 'Cases left red because the code disagrees with the specification. Quote the sentence.',
      items: { type: 'string' },
    },
    specSilences: {
      type: 'array',
      description: 'Where the specification says nothing and the case had to be scoped around it.',
      items: { type: 'string' },
    },
  },
}

const TEST_PROMPT = (seam) =>
  `Write the tests for one seam of the gr-scheduler repository.

`
  + `# ⛔ THE RULE THAT GOVERNS YOU
`
  + `docs/development-rules/04-verification.md section 1: you write from the
`
  + `SPECIFICATION ONLY. ⛔ You MUST NOT read the implementation you are testing --
`
  + `only its public entry's exported types and signatures. A test written from the
`
  + `code goes green on the code's own misreading.

`
  + `# The seam
${seam.what}

`
  + `# Where the tests go
`
  + `Table T-218 of docs/spec/05-07-design.md assigns a directory and a tool to each
`
  + `kind of test, and forbids any other place (MUST NOT). Derive yours from it.

`
  + `# ⛔ Prove they have teeth (rule 04 section 2)
`
  + `A passing test is not evidence until you have seen it fail. Break the thing each
`
  + `case guards, show it go red, restore, show it green. ⛔ If a case is red because
`
  + `the code disagrees with the specification, LEAVE IT RED and report it, quoting
`
  + `the sentence -- do not rewrite the expectation to match the code.
`
  + HOUSE_RULES

const stage = (args && args.stage) || 'implement'

if (stage === 'test') {
  phase('Test')
  const written = await parallel(
    SEAMS.map((seam) => () => agent(TEST_PROMPT(seam), {
      label: `test:${seam.key}`,
      phase: 'Test',
      isolation: 'worktree',
      schema: TEST_REPORT,
    })),
  )
  log(`${written.filter(Boolean).length} of ${SEAMS.length} seam(s) came back with a test report`)
  return { stage, seams: SEAMS.map((one) => one.key), reports: written }
}

phase('Implement')

const built = await parallel(
  SEAMS.map((seam) => () =>
    agent(
      `Implement one seam in the gr-scheduler repository.

`
      + `# What
${seam.what}

`
      + `# Files you own
${seam.owns}
`
      + `⛔ Nothing else. Other agents are working in this repository in parallel.
`
      + HOUSE_RULES,
      {
        label: `implement:${seam.key}`,
        phase: 'Implement',
        isolation: 'worktree',
        schema: FINDING,
      },
    ),
  ),
)

log(`${built.filter(Boolean).length} of ${SEAMS.length} seam(s) came back with an implementation report`)

return { stage, seams: SEAMS.map((one) => one.key), reports: built }
