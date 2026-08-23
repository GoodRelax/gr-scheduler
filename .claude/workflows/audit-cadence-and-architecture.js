export const meta = {
  name: 'audit-cadence-and-architecture',
  description: 'Measure where the rounds spend their time, and whether the built tree obeys the specification',
  whenToUse: 'A one-off audit asked for on 2026-08-23: why implementation, test and repair take as long as they do, and whether Clean Architecture, the data model, SSOT and exception handling are actually as the specification states. Read-only -- no file in the repository is edited.',
  phases: [
    { title: 'Measure', detail: 'five read-only agents, disjoint questions, numbers only' },
  ],
}

// ⛔ READ-ONLY. No agent here edits, generates, commits or runs a build. They
// read, count and quote. The front session writes the report.
//
// ⛔ EVERY CLAIM MUST CARRY A NUMBER OR A QUOTE. An audit that answers in
// adjectives cannot be acted on and cannot be checked later.

const GROUND = `
# The repository
The repository is the current working directory, on branch \`restart\`.
⛔ Every path below is relative to it -- never write an absolute one.

# What is where
- \`docs/spec/\` -- the specification. \`01-04-requirements.md\` (requirements and
  their tables), \`05-07-design.md\` (Chapter 5 architecture, Chapter 6 data),
  \`08-10-test.md\`, \`A-appendix.md\` (the changelog), \`_assets/\` (generated
  tables: \`tbl-glossary.md\`, \`tbl-settings.md\`), \`_source/\` (the manuscripts
  everything is generated FROM: \`erd.json\`, \`settings.json\`,
  \`display-words.json\`, \`components.json\`, \`mspdi-custom-fields.json\`).
- \`docs/development-rules/\` -- eight rules on HOW the product is built.
- \`docs/development-records/\` -- \`W4-adapter.md\`, \`W5-framework.md\`,
  \`pending-decisions.md\`. Each round appends a 「現在地」 block with measured
  numbers.
- \`change-request/\` -- one file per change request, CR-nnn.
- \`src/\` -- four layers: \`entity/\`, \`use-case/\`, \`adapter/\`, \`framework/\`.
- \`tests/\` -- \`unit/\`, \`contract/\`, \`system/\`, \`nfr/\`.
- \`tools/\` -- the generators and \`precheck.py\`.
- \`.claude/skills/spec-graph-check/\` -- the 26 machine checks (\`check.sh\`),
  \`audit-ch5.py\`, \`impact.py\`, \`induced.py\`.
- \`.claude/workflows/\` -- the workflow scripts past rounds ran.

# ⛔ Rules for you
- READ ONLY. ⛔ Do not edit, create or delete any file in the repository. Do not
  run \`npm run gen\`, \`npm run build\`, \`git commit\`, or anything that writes.
  ⭐ You MAY run read-only commands: \`git log\`, \`git show\`, \`git diff\`,
  \`grep\`, \`wc\`, \`npx tsc --noEmit\`, \`npx vitest run\`, and the python checkers.
- ⛔ EVERY FINDING CARRIES A NUMBER OR A VERBATIM QUOTE with a file and line.
  An answer without one is not a finding, it is an impression.
- ⛔ Do not repeat what the specification says as though you had verified it.
  Say what you MEASURED and how.
- ⚠️ Where you cannot measure something, say so plainly and say what would be
  needed. ⛔ Do not guess.
- Answer in English. Japanese quoted from the specification stays as it is.
`

const SEAMS = [
  {
    key: 'cadence',
    what: `Measure WHERE THE TIME GOES across the rounds this project has run, and
name the bottlenecks with numbers.

# What to measure
1. **The rounds themselves.** \`git log --format='%h %ad %s' --date=iso\` on
   \`restart\`. How many commits, over what span, what is the median gap between
   them? Which commits are specification-only, which are code, which are both
   (\`git show --stat\`)?
2. **What each round actually cost.** \`docs/development-records/W4-adapter.md\`
   and \`W5-framework.md\` hold a 「現在地」 block per round with measured numbers
   (test counts, red counts, build size, check results). Extract the series:
   how did the red count move round over round? How many rounds ended green?
3. **Where the agent time went.** The workflow transcripts sit under
   \`~/.claude/projects/<the folder named after this repository path>/\`
   -- look for \`subagents/workflows/*/journal.jsonl\` and any
   \`*.output\` files under \`AppData\\Local\\Temp\\claude\\...\\tasks\\\`. Each agent
   result records tokens, tool calls and duration. Total them per round and per
   agent. ⭐ Which agents cost the most, and did their cost buy findings?
4. **Rework.** How often did a round REDO something a previous round did?
   Search the records for 「実測」 lines that correct an earlier claim, for
   「stale」 / 「古い」 / 「偽になった」, and for cases where a bench was rewritten.
   Count them.
5. **The specification's own drag.** How many change requests exist
   (\`ls change-request/ | wc -l\`), how many rows does the specification hold
   now, and how many rounds were spent on specification-only work with no code?
6. **The traps that repeat.** \`docs/development-records/*\` and the change
   requests record traps under ⚠️ and ⛔. Which ones recur? Count the recurrences
   of each distinct trap. ⭐ A trap that recurs is a process defect, not bad luck.
7. **The worktree fault.** Several rounds record a worktree being cut from a
   stale commit. Count how many times, and what each cost.

# What to answer
- The three biggest consumers of time, ranked, WITH NUMBERS.
- For each: is it inherent to the method, or is it waste?
- ⭐ Three concrete changes that would make the next round faster, each with the
  measurement that supports it. ⛔ No advice that is not backed by a number you
  took.`,
  },
  {
    key: 'architecture',
    what: `Measure whether \`src/\` is ACTUALLY the Clean Architecture the
specification states -- not whether it says it is.

# What the specification states (⛔ read it, do not trust this)
Chapter 5 of \`docs/spec/05-07-design.md\`: table T-060 (layers and what each may
hold), table T-061 (\`LR-1\` .. \`LR-5\`, the dependency rules), table T-062 (which
component sits in which layer), table T-063, table T-064 (every name a component
publishes), table T-065 (\`IF-n\`, the seams), table T-074 / T-075 (the unit
inventory).

# What to measure
1. **The dependency direction, by hand.** ⛔ Do not just run
   \`python tools/check_layer_rules.py\` and report OK -- run it, then verify what
   it actually checks by reading it, and say what it does NOT check. Then take
   every \`import\` in \`src/\` yourself (\`grep -rn "^import\\|from '" src/\`) and
   classify each edge by the layer of the importer and the imported.
   ⭐ Report the edge counts per layer pair, and name every edge that points
   outward or sideways in a way T-061 forbids.
2. **The dependency INVERSION half.** Clean Architecture is not only "inward
   imports": the inner layers must depend on ABSTRACTIONS the inner layer owns,
   with the outer layer implementing them. Table T-065's \`IF-n\` rows are those
   seams. ⭐ For each \`IF-n\`: who DECLARES the type, who IMPLEMENTS it, and does
   the declaration sit in the inner layer? Name any seam where the inner side
   imports the outer side's concrete type instead.
3. **Framework independence.** \`tsconfig.entity.json\` compiles part of the tree
   with no DOM library. Which folders does it cover? Run
   \`npx tsc -p tsconfig.entity.json --noEmit\` and report. ⭐ Then check by hand:
   does anything under \`src/entity/\` or \`src/use-case/\` name a DOM type, a
   browser global, \`window\`, \`document\`, \`localStorage\`, \`fetch\`, \`Date.now\`,
   \`Math.random\`, or \`crypto\`? Quote every hit with its line.
4. **The seams that are declared but not honoured.** Search \`src/\` for STOP
   notes (\`grep -rn "STOP --" src/\`). Group them: which are "the specification
   has not settled this", and which are "this seam is declared but nothing
   implements it"? Count each group. ⭐ The second group is architecture debt.
5. **Entry-point discipline.** Table T-064 says a component publishes names
   through ONE entry. Does anything import a component's INTERNAL unit from
   outside that component? \`.claude/skills/spec-graph-check/check-published-members.py\`
   answers part of this -- run it, read it, and say what it does not cover.

# What to answer
A verdict per question with the counts behind it, and a ranked list of every
real deviation found. ⛔ If the architecture is clean, say so with the numbers
that prove it rather than with praise.`,
  },
  {
    key: 'datamodel',
    what: `Measure whether the DATA MODEL in \`src/\` is the one the specification
states.

# What the specification states (⛔ read it)
Chapter 6 of \`docs/spec/05-07-design.md\` and the tables it points at: T-056 /
T-057 / T-058 / T-059 (the entities, their relations, their columns, their
keys), figure F-011 and the generated \`_assets/fig-erd-overview.md\` /
\`fig-erd-detail.md\`. The manuscript is \`docs/spec/_source/erd.json\`.
Chapter 6.1's table T-220 holds every invariant of a document.

# What to measure
1. **Column by column.** \`erd.json\` is the manuscript;
   \`tools/generate_entity_types.py\` writes the types into
   \`src/entity/document-model/\`. Run \`npm run types:check\` (or the generator
   with \`--check\`) and report. ⭐ Then verify by hand on a sample of at least
   three entities: does every column of \`erd.json\` appear in the generated
   type, with the same optionality and the same type? Name any drift.
2. **Are the generated types the ONLY definition?** Search \`src/\` for a second
   declaration of the same entity shape -- an interface named for an entity that
   the generator did not write, a local structural type standing in for one, a
   \`Pick<>\`/\`Omit<>\` that has drifted. Quote each with its file and line.
3. **The keys.** Table T-058's key column marks \`PK\` / \`FK\` / \`PK,FK\`. Which of
   those reach \`src/\` as anything a program can check, and which exist only as
   prose in the table? ⚠️ Table T-220's \`IV-1\` and \`IV-2\` are the invariants
   that ride on them -- are they actually driven from the manuscript, or written
   out by hand?
4. **The exchange format.** The document is written as \`GRS JSON\` and MSPDI.
   Is the JSON schema (\`docs/spec/_source/grs-document.schema.json\`) generated
   from the same manuscript? Run the schema check and report. Does anything in
   \`src/adapter/document-codec/\` spell a column name that the generator did not
   give it?
5. **The invariants.** \`scheduleViolations\` is the member table T-220 says must
   be driven BY that table (「行ごとに条件を書き下してはならない（MUST NOT）」).
   Read the unit's public entry and the generated roster it reads. ⭐ Is it
   driven from the table, or does it hold a hand-written list? Count the rows of
   T-220 and the rows the code actually answers.

# What to answer
A verdict per question with counts, and every drift found, quoted. ⛔ Say
plainly which parts of the data model are machine-guaranteed and which rest on
a human having typed the same thing twice.`,
  },
  {
    key: 'ssot',
    what: `Measure whether the SINGLE SOURCE OF TRUTH principle actually holds.

# What the specification states (⛔ read it)
\`docs/spec/05-07-design.md\` Chapter 6.2 (the manuscripts, and the rule that a
generated artifact is never hand-edited), and rule 03 section 1 of
\`docs/development-rules/03-implementation.md\` ("values are GENERATED, never
re-typed", with a list of the constants generated today).

# What to measure
1. **The roster of manuscripts and their artifacts.** List every file under
   \`docs/spec/_source/\`, every generator in \`tools/\`, and every artifact each
   writes. Run \`npm run gen:check\` and report what it covers. ⭐ Then name any
   artifact in \`src/\` or \`docs/spec/_assets/\` that is NOT covered by that check.
2. **Values typed twice.** This is the real question. Take the settings rows of
   \`docs/spec/_source/settings.json\` and search \`src/\` and \`tests/\` for their
   numeric values appearing as literals. ⚠️ A number like \`0\` or \`1\` will match
   everywhere -- restrict to values with three or more significant characters,
   and to values that are distinctive. Quote each hit with file and line and say
   whether it is a copy or a coincidence.
3. **Prose copied instead of pointed at.** Rule 03 section 3 forbids copying a
   specification sentence or value into a comment; a comment must name the row
   id. Sample at least 40 comments across \`src/\` that quote Japanese and judge
   each: is it a quotation with its row id named, or a copy that will go stale?
   Report the ratio and quote the worst five.
4. **The checks that guard SSOT, and their holes.** Read
   \`.claude/skills/spec-graph-check/check.sh\` and the checkers it runs. Which
   ones actually compare an artifact against its manuscript? What is NOT guarded?
   ⭐ Name the specific ways a value could drift today without any check failing.
5. **The other direction.** Is there anything in \`src/\` that is the real source
   of truth while the specification only describes it? Table T-064's note and
   CR-146 say the published SIGNATURES live in \`src/\`. ⭐ Is that boundary
   respected, or has the specification started re-stating signatures?

# What to answer
A verdict with counts, every real duplication quoted, and a ranked list of the
gaps where drift could happen silently today.`,
  },
  {
    key: 'exceptions',
    what: `Measure how ERRORS AND EXCEPTIONS are handled, against what the
specification requires.

# What the specification states (⛔ read it)
\`FR-028\` of \`docs/spec/01-04-requirements.md\` (a refusal is a VALUE the caller
receives, and throwing is forbidden -- read the exact MUST / MUST NOT),
\`AG-8\` of table T-035, table T-037 (how a person is told), table T-233 (the
reasons a telling may carry), and \`R3.4\` of
\`docs/development-rules/07-review-standards.md\` (errors are not swallowed).

# What to measure
1. **Throw and catch, counted.** \`grep -rn "throw \\|catch (\\|catch{" src/\` --
   every hit, classified: is it a refusal that FR-028 forbids, a guard against
   something outside the program (a platform API that throws), or an
   unreachable-state assertion? Quote each with file and line. ⭐ Report the
   totals per layer.
2. **The result shapes.** How many distinct "failed" value shapes exist
   (\`{ ok: false, ... }\`, \`Refusal\`, \`*Fault\`, \`*Refusal\`, \`PlanRefusal\`,
   \`AgentRefusal\`, ...)? List them with their file. ⭐ Is there one discipline or
   several? Name every pair that means the same thing in two shapes.
3. **Swallowed failures.** Find every place a failed value is received and NOT
   passed on -- a \`if (!x.ok) return\` with nothing told, an ignored promise
   rejection, an empty catch. ⭐ Cross-check against the STOP notes: the code
   records some of these deliberately. Count the ones recorded and the ones not.
4. **Does a failure reach a person?** Table T-037's \`NT-1\` (MUST) and \`NT-3a\`
   (MUST) require words and a next step. Table T-233 now holds the reasons.
   ⭐ For each row of table T-233, is there a raiser in \`src/\` that can produce
   it? And for each failure shape found in (2), is there a row of T-233 it can
   be carried on? Name both gaps.
5. **The async edge.** \`await\` and promises: is every rejection accounted for?
   Is there any \`async\` function whose failure has nowhere to go? ⚠️ Table T-066's
   \`CS-4\` governs an operation that waits on a person -- is that discipline
   actually followed at every await, or only where it is commented?

# What to answer
A verdict with the counts, every real hole quoted, and a ranked list. ⛔ Say
plainly whether a person using the tool would be told when something fails.`,
  },
]

const REPORT = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'verdict', 'measurements', 'findings', 'recommendations', 'couldNotMeasure'],
  properties: {
    area: { type: 'string' },
    verdict: { type: 'string', description: 'Two or three sentences. What is actually true, with the headline number.' },
    measurements: {
      type: 'array',
      description: 'The numbers taken, each with how it was taken.',
      items: {
        type: 'object', additionalProperties: false, required: ['what', 'value', 'how'],
        properties: { what: { type: 'string' }, value: { type: 'string' }, how: { type: 'string' } },
      },
    },
    findings: {
      type: 'array',
      description: 'Real deviations, worst first. Empty is a valid and meaningful answer.',
      items: {
        type: 'object', additionalProperties: false, required: ['severity', 'what', 'evidence'],
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          what: { type: 'string' },
          evidence: { type: 'string', description: 'File and line, or the command and its output.' },
        },
      },
    },
    recommendations: {
      type: 'array',
      description: 'Each backed by one of the measurements above.',
      items: {
        type: 'object', additionalProperties: false, required: ['do', 'because', 'expectedGain'],
        properties: { do: { type: 'string' }, because: { type: 'string' }, expectedGain: { type: 'string' } },
      },
    },
    couldNotMeasure: { type: 'array', items: { type: 'string' } },
  },
}

phase('Measure')

const done = await parallel(
  SEAMS.map((seam) => () =>
    agent(
      `Audit one area of the gr-scheduler repository. You are READ-ONLY.\n\n`
      + `# Your area\n${seam.what}\n`
      + GROUND,
      { label: `audit:${seam.key}`, phase: 'Measure', schema: REPORT },
    ),
  ),
)

log(`${done.filter(Boolean).length} of ${SEAMS.length} area(s) reported`)

return { areas: SEAMS.map((one) => one.key), reports: done }
