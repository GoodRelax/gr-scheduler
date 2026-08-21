# tests/

**Table T-218 of Chapter 7 settles this layout.** The directory a test sits in
is what says which kind it is, so a test may only live in one of the six places
below (MUST), and no seventh place may be made (MUST NOT).

## Who writes what

| place | row | receiver in the specification | who writes it | what it protects |
| --- | --- | --- | --- | --- |
| `usecase/` | `TS-1` | Chapter 8, parent `UC-xxx` | by hand | the user's own steps, through the UI |
| `integration/` | `TS-2` | Chapter 9, parent `SWS-xxx` | by hand; the case list is generated from it | units wired together |
| `system/` | `TS-3` | Chapter 9, parent `SWS-xxx` | the same | the whole product, through the UI |
| `nfr/` | `TS-4` | Chapter 10, parent `NFR-xxx` | by hand | the performance gates of table T-043 |
| **`contract/`** | **`TS-5`** | **none -- the grammar refuses `Unit`** | **neither side of the seam, once, from a table** | **the seam** |
| `unit/` | `TS-6` | none, for the same reason | whoever implemented the unit | the inside of one unit |

**Having no receiver does not mean it need not be written.** The last two rows
carry no node in the specification only because `SW_SPEC_TEST` admits
`Integration` and `System` and nothing else. Both still stop the milestone when
they fail.

**Chapter 9's case list is a generated artifact (MUST) and must not be written
by hand (MUST NOT).** Writing it by hand would put the same claim in two places,
and the copy in the specification is the one that cannot fail. So a test under
`integration/` or `system/` carries, in a form a machine can read, the `SWS-xxx`
it hangs from and its GIVEN / WHEN / THEN.

The contract row is the reason this directory exists. Seventy-one units can each
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
  contract/     Vitest.      *.contract.test.ts, driven by a specification table
  integration/  Vitest.      *.sws.test.ts, one case per SWS node of Chapter 6.1
  unit/         Vitest.      the inside of one unit
  usecase/      Playwright.  not written yet
  system/       Playwright.  not written yet
  nfr/          Playwright.  not written yet
  fixtures/     what every test shares -- not a kind of its own
```

**Four of those directories do not exist yet**, because no case has been written
for them. They appear in `vitest.config.ts` and `playwright.config.ts` so that
the first test written lands in the right place rather than inventing one.

`fixtures/grs-document.ts` holds the shared document shape: the generated
`GRS JSON` schema and validators over it. It deliberately carries **no sample
document** — a sample needs values the specification has not decided, and
inventing them here would quietly make this file the source of a decision
nobody took.

## Running

```bash
npm test          # vitest: contract/, integration/, unit/
npm run e2e       # playwright: usecase/, system/, nfr/
npm run typecheck # tsc, both projects: the root one and the DOM-free Entity one
npm run layers    # table T-061: dependency direction and acyclicity
npm run tree:check
```

`bash .claude/skills/spec-graph-check/check.sh` runs the last two as checks 18
and 19, alongside the specification's own checks.
