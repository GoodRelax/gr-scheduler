export const meta = {
  name: 'five-stage',
  description: 'Propose from the specification, then implement and test in parallel (rule 05 section 7)',
  whenToUse:
    'Every piece of work big enough to hand to a subagent. Pass args as { items: [{ key, brief, files }], stopAfterProposal: true }. The brief may be rough -- stage 2 is where the detail is worked out.',
  phases: [
    { title: 'Propose', detail: 'read the specification, propose an approach, write no code' },
    { title: 'Build', detail: 'implementer and spec-only tester run side by side' },
  ],
}

// ⛔ Rule 05 section 7. The front session gives a ROUGH brief; a body reads the
// specification and proposes; the front session judges; only then do the
// implementer and the tester run -- AT THE SAME TIME, so the tester cannot see
// the implementation and can only write from docs/spec.

const items = (args && args.items) || []
if (items.length === 0) throw new Error('five-stage: args.items is empty')

const HOUSE = [
  'RULES (the project own rules, in docs/development-rules/ -- read 03-implementation.md first):',
  ' - src/ is English and ASCII prose, apart from the project own comment marks the neighbours use.',
  ' - You MAY run the python generators and python one-liners to measure.',
  '   You may NOT run npm test / typecheck / build / check.sh -- the front session verifies.',
  ' - DO NOT run git commit / push / add / merge.',
  ' - DO NOT edit anything under docs/ . If a row you need does not exist, STOP that part and report',
  '   which row and what it must say. Never invent a value. A comment names a row ID, never a number.',
  ' - Never write an absolute path anywhere.',
  '',
  'DOUBT THIS BRIEF. It is deliberately rough and may be wrong. Measure before you act, and report',
  'every claim in it that did not survive reading the actual file.',
].join('\n')

const PROPOSAL = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'mechanism', 'measured', 'rowsTouched', 'steps', 'openValues', 'specHoles', 'risks', 'testable'],
  properties: {
    openValues: {
      type: 'array',
      description:
        'EVERY value the specification does not settle that this change needs. Classify each ' +
        'per docs/development-rules/06-pending-decisions.md. Only D-H may stop the work: for ' +
        'A-C you MUST supply a provisional value and carry on.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['what', 'oneComponent', 'movesPublishedApi', 'reversibilityClass', 'provisionalValue', 'ground'],
        properties: {
          what: { type: 'string' },
          oneComponent: {
            type: 'boolean',
            description: 'Reversing it touches only one component of table T-062',
          },
          movesPublishedApi: {
            type: 'boolean',
            description: 'Reversing it moves a member of table T-064 or a seam of table T-065',
          },
          reversibilityClass: {
            type: 'string',
            description: 'A-H, with the one-line ground for the classification',
          },
          provisionalValue: {
            type: 'string',
            description:
              'Required for A-C: the value you are proceeding with, and the mark it carries. ' +
              'For D-H write "BLOCKED" and say what the user must settle.',
          },
          ground: { type: 'string' },
        },
      },
    },
    summary: { type: 'string' },
    mechanism: {
      type: 'string',
      description: 'WHY it behaves as it does -- file:line plus a number. Not the symptom.',
    },
    measured: {
      type: 'array',
      description: 'Numbers you produced yourself, each with how you produced it',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['claim', 'evidence'],
        properties: { claim: { type: 'string' }, evidence: { type: 'string' } },
      },
    },
    rowsTouched: {
      type: 'array',
      description: 'Requirement / table / settings row IDs the change reaches',
      items: { type: 'string' },
    },
    steps: { type: 'array', items: { type: 'string' } },
    specHoles: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    testable: {
      type: 'array',
      description: 'What a tester reading only docs/spec could assert, and which row says so',
      items: { type: 'string' },
    },
  },
}

const REPORT = {
  type: 'object',
  additionalProperties: false,
  required: ['changedFiles', 'falseClaims', 'specHoles', 'notDone', 'notes'],
  properties: {
    changedFiles: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'why'],
        properties: { path: { type: 'string' }, why: { type: 'string' } },
      },
    },
    falseClaims: { type: 'array', items: { type: 'string' } },
    specHoles: { type: 'array', items: { type: 'string' } },
    notDone: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
}

phase('Propose')

// STAGE 2 -- read the specification and propose. ⛔ No code is written here.
const proposals = await parallel(
  items.map((it) => () =>
    agent(
      [
        'You are proposing an approach. ⛔ WRITE NO CODE AND CHANGE NO FILE. Your whole output is the',
        'proposal. Another agent will implement it, and a third will test it from the specification.',
        '',
        HOUSE,
        '',
        'THE ROUGH BRIEF:',
        it.brief,
        '',
        it.files ? 'The files expected to be involved: ' + it.files : '',
        '',
        'Read docs/spec for what SHOULD happen and src/ for what DOES happen. Then answer:',
        ' - the MECHANISM: why it behaves as it does, with file:line and a number. Not the symptom.',
        ' - MEASURED: numbers you produced yourself. Say how. Do not quote another report.',
        ' - the row IDs your change reaches, and the steps you would take.',
        ' - what a tester who may read ONLY docs/spec could assert, and which row authorises it.',
        '',
        '⛔ OPEN VALUES -- the part that most often goes wrong. For EVERY value the specification does',
        'not settle, read docs/development-rules/06-pending-decisions.md and classify it. Ask its two',
        'questions first: does reversing it touch only ONE component of table T-062, and does it move a',
        'published member of table T-064 or a seam of table T-065? If one component and no API moves,',
        'it is almost always A-C.',
        '⛔ FOR CLASS A-C YOU MUST NOT STOP. Choose a provisional value, say what it is and why, and',
        'carry on -- the user has ruled that work must not wait on a value that is cheap to reverse.',
        '⛔ ONLY CLASS D-H MAY BLOCK. Write BLOCKED for those and say exactly what must be settled.',
        'A proposal that blocks on an A-C value will be sent back.',
      ].join('\n'),
      { label: 'propose:' + it.key, phase: 'Propose', schema: PROPOSAL },
    ).then((p) => ({ key: it.key, item: it, proposal: p })),
  ),
)

// STAGE 3 belongs to the front session: it reads these and decides. When the
// caller only wants the proposals, stop here rather than building on an
// unjudged plan.
if (args && args.stopAfterProposal) return { proposals }

phase('Build')

// STAGE 4 -- implementer and tester side by side. ⭐ The tester is given the
// proposal's TESTABLE list and the row IDs, never the implementation.
const built = await parallel(
  proposals.filter((p) => p.proposal).map((p) => () =>
    parallel([
      () =>
        agent(
          [
            'Implement the approach below. It was proposed by another agent from the specification and',
            'accepted by the front session. ⚠️ If implementing it shows the proposal to be wrong, STOP',
            'and report that rather than improvising a different design.',
            '',
            HOUSE,
            '',
            'YOUR FILES: ' + (p.item.files || 'as the proposal names'),
            '',
            'THE ACCEPTED PROPOSAL:',
            JSON.stringify(p.proposal, null, 2),
          ].join('\n'),
          { label: 'build:' + p.key, phase: 'Build', isolation: 'worktree', schema: REPORT },
        ),
      () =>
        agent(
          [
            'You are the independent tester. ⛔ YOUR ORACLE IS docs/spec. Read src/ only far enough to',
            'learn the public signatures you must call -- never to learn what the answer should be.',
            'If the specification and the implementation disagree, THE SPECIFICATION WINS and you write',
            'the failing test. ⭐ A red test you can justify from a quoted requirement is the most',
            'valuable thing you can produce.',
            '',
            'Another agent is implementing this AT THE SAME TIME as you. You cannot see its work and',
            'must not wait for it. Write from the rows below.',
            '',
            HOUSE,
            ' - YOUR FILES ARE UNDER tests/ ONLY. Never edit src/.',
            '',
            'WHAT IS BEING CHANGED: ' + p.item.brief,
            '',
            'THE ROWS IT REACHES: ' + (p.proposal.rowsTouched || []).join(', '),
            '',
            'WHAT THE PROPOSER SAID IS TESTABLE FROM THE SPECIFICATION:',
            (p.proposal.testable || []).map((t) => ' - ' + t).join('\n'),
            '',
            'Read those rows yourself and quote what you relied on. Follow the conventions already in',
            'tests/ -- read several neighbours first.',
          ].join('\n'),
          { label: 'test:' + p.key, phase: 'Build', isolation: 'worktree', schema: REPORT },
        ),
    ]).then(([impl, test]) => ({ key: p.key, proposal: p.proposal, impl, test })),
  ),
)

// STAGE 5 is the front session's: merge, run every check itself, and report.
return { proposals, built }
