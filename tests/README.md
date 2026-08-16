# tests/

⚠️ **This layout is provisional.** Chapter 5.3 of the specification says the
place for test code is Chapter 7's to decide, and Chapter 7 is still an empty
frame. Revisit this file when it is written.

## Who writes what

| | who writes it | what it protects |
| --- | --- | --- |
| unit tests | the agent that implements the unit | the inside of one unit |
| **contract tests** | **neither side — written once, from a table** | **the seam** |
| integration tests | the same separate place | `WY-1`–`WY-3`, `FR-021`, the 14 use cases, the performance gates |

The middle row is the reason this directory exists. Seventy-one units can each
be green on their own while the application does not run, and the place that
breaks is always the seam between two of them. A test owned by one side of a
seam tests that side's idea of the seam, which is the thing in question.

## How a contract test is written

Chapter 1.9 of `docs/spec/01-04-requirements.md` sets both rules:

- `:274` (MUST) the first column of a table is the row ID
- `:275` (SHOULD) a test that verifies a requirement pointing at a table is
  driven by fixed data copied from that table — **one test walks every row**,
  rather than one test per row

`contract/spec-table.ts` reads the table out of the specification at run time,
so the copy cannot fall behind the table. It throws when a table is missing, has
no rows, or does not start with a row ID column, because in any of those cases a
failure could no longer name a line of the specification.

**A failing contract test names one row.** `IF-3` points straight at the row of
table T-065 that stopped being true. That chain is what "someone reading this
later can tell why" is made of; more prose does not make it.

## Layout

```
tests/
  contract/    *.contract.test.ts, driven by a specification table
  fixtures/    what every test shares
  e2e/         Playwright's (see playwright.config.ts); Vitest excludes it
```

`fixtures/grs-document.ts` holds the shared document shape: the generated
`GRS JSON` schema and validators over it. It deliberately carries **no sample
document** — a sample needs values the specification has not decided, and
inventing them here would quietly make this file the source of a decision
nobody took.

## Running

```bash
npm test          # vitest, the contract tests
npm run typecheck # tsc, both projects: the root one and the DOM-free Entity one
npm run layers    # table T-061: dependency direction and acyclicity
npm run tree:check
```

`bash .claude/skills/spec-graph-check/check.sh` runs the last two as checks 18
and 19, alongside the specification's own checks.
