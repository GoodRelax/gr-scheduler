export const meta = {
  name: 'build-wave',
  description: 'Stage 4 of rule 05 section 7: implement an ACCEPTED proposal, with a spec-only tester beside it',
  whenToUse:
    'After the front session has judged a five-stage proposal. Pass args as { baseCommit, items: [{ key, plan, files, withTester, rows, testable }] }. withTester: false when red tests for this piece already exist -- the implementer must not write its own.',
  phases: [{ title: 'Build', detail: 'implementer and spec-only tester run side by side' }],
}

// ⚠️ The plan arrives as an ARRAY of lines, never as one string with newlines:
// the permission dialog refuses control characters in a tool argument.
const NL = String.fromCharCode(10)
const textOf = (v) => (Array.isArray(v) ? v.join(NL) : v || '')

const items = (args && args.items) || []
if (items.length === 0) throw new Error('build-wave: args.items is empty')
const baseCommit = args && args.baseCommit
if (!baseCommit) throw new Error('build-wave: args.baseCommit is required')

const HEAL = [
  'FIRST, BEFORE ANYTHING ELSE, bring your worktree up to date and report what it prints:',
  '    git merge --ff-only ' + baseCommit,
  'If it refuses, STOP and report that. Do not force it and do not work on a stale tree --',
  'rows written moments ago will be missing and you will wrongly conclude they do not exist.',
  '',
].join('\n')

const HOUSE = [
  'RULES (the project own rules, in docs/development-rules/ -- read 03-implementation.md first):',
  ' - src/ is English and ASCII prose, apart from the project own comment marks the neighbours use.',
  ' - You MAY run the python generators and python one-liners to measure.',
  '   You may NOT run npm test / typecheck / build / check.sh -- the front session verifies.',
  ' - DO NOT run git commit / push / add / merge (apart from the ff-only heal above).',
  ' - DO NOT edit anything under docs/ . If a row you need does not exist, STOP that part and report',
  '   which row and what it must say. Never invent a value. A comment names a row ID, never a number.',
  ' - Never write an absolute path anywhere.',
  ' - A comment in src/ may be wrong. Measure before you trust one, and report every one you found false.',
  '',
  'REPORT EVERY CLAIM IN THIS PLAN THAT DID NOT SURVIVE READING THE ACTUAL FILE.',
].join('\n')

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

phase('Build')

const built = await parallel(
  items.map((it) => () => {
    const jobs = [
      () =>
        agent(
          [
            HEAL,
            'Implement the plan below. It was proposed by another agent from the specification and has been',
            'ACCEPTED by the front session, including the judgements the front session added.',
            '⚠️ If implementing it shows the plan to be wrong, STOP that part and report it rather than',
            'improvising a different design.',
            '',
            HOUSE,
            '',
            'YOUR FILES: ' + (it.files || 'as the plan names'),
            '',
            'THE ACCEPTED PLAN:',
            textOf(it.plan),
          ].join('\n'),
          { label: 'build:' + it.key, phase: 'Build', isolation: 'worktree', schema: REPORT },
        ),
    ]
    if (it.withTester) {
      jobs.push(() =>
        agent(
          [
            HEAL,
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
            ' - YOUR FILES ARE UNDER tests/ ONLY. Never edit src/ or tools/.',
            '',
            'WHAT IS BEING CHANGED: ' + (it.brief || textOf(it.plan)),
            '',
            'THE ROWS IT REACHES: ' + (it.rows || '(read them out of the plan above)'),
            '',
            'WHAT IS TESTABLE FROM THE SPECIFICATION: ' + (it.testable || '(derive it yourself)'),
            '',
            'Read those rows yourself and quote what you relied on. Follow the conventions already in',
            'tests/ -- read several neighbours first. ⛔ Do not duplicate a case that already exists;',
            'the duplication detector fails on one new pair.',
          ].join('\n'),
          { label: 'test:' + it.key, phase: 'Build', isolation: 'worktree', schema: REPORT },
        ),
      )
    }
    return parallel(jobs).then((r) => ({ key: it.key, impl: r[0], test: r[1] ?? null }))
  }),
)

return { built }
