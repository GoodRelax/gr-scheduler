# tests/

**Table T-218 of Chapter 7 settles this layout.** The directory a test sits in
is what says which kind it is, so a test may only live in one of the six places
below (MUST), and no seventh place may be made (MUST NOT).

## Who writes what

| place | row | receiver in the specification | who writes it | what it protects |
| --- | --- | --- | --- | --- |
| `usecase/` | `TS-1` | Chapter 8, parent `UC-xxx` | by hand | the user's own steps, through the UI |
| `integration/` | `TS-2` | Chapter 9, parent `SWS-xxx` | by hand | units wired together |
| `system/` | `TS-3` | Chapter 9, parent `SWS-xxx` | the same | the whole product, through the UI |
| `nfr/` | `TS-4` | Chapter 10, parent `NFR-xxx` | by hand | the performance gates of table T-043 |
| **`contract/`** | **`TS-5`** | **none -- the grammar refuses `Unit`** | **neither side of the seam, once, from a table** | **the seam** |
| `unit/` | `TS-6` | none, for the same reason | a body that reads only the specification, never the unit's author | a function no row of the omission table (rule 04 section 3.5, table `UO`) covers |

**Having no receiver does not mean it need not be written.** The last two rows
carry no node in the specification only because `SW_SPEC_TEST` admits
`Integration` and `System` and nothing else. Both still stop the milestone when
they fail.

**Chapters 8 to 10 raise no test nodes** (table T-219, `TW-1` to `TW-3`): what
is verified is table T-334 of Chapter 7, and the result is the output of the
gate run. A test under `integration/` or `system/` still carries, in a form a
machine can read, the `SWS-xxx` it hangs from and its GIVEN / WHEN / THEN.

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
  unit/         Vitest.      only where no omission rule applies
  usecase/      Playwright.  one per UC-xxx, on the built dist/index.html over file://
  system/       Playwright.  *.sws.test.ts and the rest, through the UI
  nfr/          Playwright.  the performance gates run only with GRS_PERF=1
  fixtures/     what every test shares -- not a kind of its own
```

The MSPDI schema under `docs/reference/mspdi/` is local-only (JDG-644), so a
worktree has none. The files that read it are listed in `fixtures/mspdi-xsd.json`;
where the schema is absent `vitest.config.ts` leaves them out and
`contract/mspdi-xsd-local-only.test.ts` reports each as a skipped case that
names the reason.

`known-red.txt` lists every known red, one line per DFC (rule 04 section 3.9).
The gates read it: a red it does not name stops them, and so does a line whose
case has turned green.

`fixtures/grs-document.ts` holds the shared document shape: the generated
`GRS JSON` schema and validators over it. It deliberately carries **no sample
document** — a sample needs values the specification has not decided, and
inventing them here would quietly make this file the source of a decision
nobody took.

## Running

```bash
npm test          # vitest: contract/, integration/, unit/
npm run e2e       # playwright: usecase/, system/, nfr/ (build dist first for usecase/)
npm run guard:commit   # gate GT-1, held against known-red.txt (root checkout only)
npm run guard:publish  # gate GT-2: GT-1 + build + usecase/e2e + parity
npm run typecheck # tsc, both projects: the root one and the DOM-free Entity one
npm run layers    # table T-061: dependency direction and acyclicity
npm run tree:check
```

`bash .claude/skills/spec-graph-check/check.sh` runs the last two as checks 18
and 19, alongside the specification's own checks.
