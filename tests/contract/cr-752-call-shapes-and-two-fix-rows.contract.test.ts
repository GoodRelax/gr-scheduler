// CR-752 (spec-only): RW-16 two fix rows on one Task, and the T-064 PI-1 call shapes of four names.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  actualInstantsOf,
  actualMinutesOf,
  dayOf,
  finishSideDayFrom,
  finishSideDayOf,
  plannedLengthMinutesOf,
  workingCalendarOf,
  workingTimeCounterOf,
  type Task,
} from '../../src/entity/document-model/schedule/schedule'
import type { DocumentCommand } from '../../src/use-case/apply-document-change/apply-document-change'
import { DOUBLE_LINE_SAME, FS_SUCCESSOR_STARTED } from './cr-731-documents'
import {
  BEFORE_ALL,
  FINISH_OF,
  FS,
  START_OF,
  commandsOf,
  dayTextIn,
  findingRowsOf,
  heldOf,
  machineRows,
  oneRow,
  proposed,
  taskIn,
  written,
  type FixRow,
  type Loose,
  type TaskSpec,
  documentOf,
} from './cr-731-stage'
import { unbroken } from './spec-table'

// WHY: the generated table T-064 (from published-entries.json) is read with its line breaks joined, as cr-749 does.
const PUBLISHED = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-published-entries.md'), 'utf8'))
const SOURCE = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'published-entries.json'), 'utf8')) as unknown

// WHY: the two openings the brief names, written as escapes so this file stays ASCII: "yobikata:" (how to call) and "ran:" (fields).
const HOW_TO_CALL = '\u547c\u3073\u65b9:'
const FIELDS = '\u6b04:'

interface Member {
  readonly name: string
  readonly note?: { readonly ja?: readonly string[] }
}

function membersIn(value: unknown, into: Member[] = []): Member[] {
  if (Array.isArray(value)) {
    for (const one of value) membersIn(one, into)
  } else if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record['name'] === 'string' && typeof record['note'] === 'object') into.push(record as unknown as Member)
    for (const inner of Object.values(record)) membersIn(inner, into)
  }
  return into
}

function memberNamed(name: string): Member {
  const found = membersIn(SOURCE).filter((one) => one.name === name)
  if (found.length !== 1) throw new Error(`published-entries.json holds ${String(found.length)} members named ${name}`)
  return found[0] as Member
}

// WHY: the printed entry of a name runs from its backticked name to the next full-width slash (U+FF0F) that opens a member.
function printedEntryOf(name: string): string {
  const head = `\uff0f \`${name}\``
  const from = PUBLISHED.indexOf(head)
  if (from < 0) throw new Error(`T-064 prints no member ${name}`)
  const next = PUBLISHED.indexOf('\uff0f ', from + head.length)
  return PUBLISHED.slice(from, next < 0 ? undefined : next)
}

// see PI-1
describe('T-064 PI-1 -- the generated table holds the call-shape sentences of the four names', () => {
  const CASES: readonly (readonly [string, string, readonly string[]])[] = [
    ['workingTimeCounterOf', HOW_TO_CALL, ['`WorkingCalendar`', '`workingCalendarOf`']],
    ['WorkingTimeCounter', HOW_TO_CALL, ['`plannedLengthMinutes`', '`actualLengthMinutes`', '`Task`']],
    ['finishSideDayFrom', HOW_TO_CALL, ['`dayOf`', '`finishSideDayOf`']],
    ['DelayFixCheck', FIELDS, ['`key`', '`checked`', '`choice`', '`date`', '`DelayFixRow`', '`choices`', 'yyyy-mm-dd']],
  ]

  it.each(CASES)('%s: the source has one such sentence, and the printed entry holds it word for word', (name, opening, words) => {
    const lines = (memberNamed(name).note?.ja ?? []).filter((one) => one.startsWith(opening))
    expect(lines, `${name} in published-entries.json`).toHaveLength(1)
    const line = lines[0] as string
    for (const word of words) expect(line, `${name}: ${word}`).toContain(word)
    expect(printedEntryOf(name)).toContain(line)
  })
})

// WHY: a calendar the call shape names: the answer of workingCalendarOf for a document (the template calendar).
const CALENDAR_DOCUMENT = documentOf(
  [
    { uid: 1, start: START_OF('2027-05-10'), finish: FINISH_OF('2027-05-14') },
    { uid: 2, start: START_OF('2027-05-17'), finish: FINISH_OF('2027-05-17'), milestone: true },
    { uid: 3, start: START_OF('2027-05-10'), finish: FINISH_OF('2027-05-21'), actualStart: START_OF('2027-05-10'), stop: FINISH_OF('2027-05-12'), percentComplete: 30 },
    { uid: 4, start: START_OF('2027-05-10'), finish: FINISH_OF('2027-05-21'), actualStart: START_OF('2027-05-11'), actualFinish: FINISH_OF('2027-05-19'), percentComplete: 100 },
    { uid: 5, start: START_OF('2027-05-14'), finish: FINISH_OF('2027-05-18') },
  ],
  { statusDate: BEFORE_ALL },
)
const CALENDAR = workingCalendarOf(CALENDAR_DOCUMENT.schedule)
const documentTask = (uid: number): Task => taskIn(CALENDAR_DOCUMENT, uid) as unknown as Task

const looseTask = (fields: Partial<Record<'start' | 'finish' | 'actualStart' | 'stop' | 'actualFinish', string | null>>, milestone = false): Task =>
  ({ start: null, finish: null, actualStart: null, stop: null, actualFinish: null, milestone, ...fields }) as unknown as Task

const actualByParts = (task: Task): number | null => {
  const instants = actualInstantsOf(CALENDAR, task)
  return instants === null ? null : actualMinutesOf(CALENDAR, instants[0], instants[1])
}

// see PI-1
describe('T-064 PI-1 workingTimeCounterOf -- called with one calendar, the answer of workingCalendarOf', () => {
  it('answers a counter that has the two members WorkingTimeCounter names', () => {
    const counter = workingTimeCounterOf(CALENDAR)
    expect(typeof counter.plannedLengthMinutes).toBe('function')
    expect(typeof counter.actualLengthMinutes).toBe('function')
  })

  // see FR-012
  it.each([1, 2, 3, 4, 5])('plannedLengthMinutes(task %i of the document) equals plannedLengthMinutesOf', (uid) => {
    const task = documentTask(uid)
    expect(workingTimeCounterOf(CALENDAR).plannedLengthMinutes(task)).toEqual(plannedLengthMinutesOf(CALENDAR, task))
  })

  // see FR-012
  it('a milestone counts 0, and a five-day span counts more than a one-day span', () => {
    const counter = workingTimeCounterOf(CALENDAR)
    expect(counter.plannedLengthMinutes(documentTask(2))).toBe(0)
    const oneDay = counter.plannedLengthMinutes(looseTask({ start: START_OF('2027-05-10'), finish: FINISH_OF('2027-05-10') }))
    const fiveDays = counter.plannedLengthMinutes(documentTask(1))
    expect(oneDay).not.toBeNull()
    expect(fiveDays).toBe((oneDay as number) * 5)
  })

  // see FR-011
  it.each([1, 3, 4])('actualLengthMinutes(task %i of the document) equals actualMinutesOf over actualInstantsOf', (uid) => {
    const task = documentTask(uid)
    expect(workingTimeCounterOf(CALENDAR).actualLengthMinutes(task)).toEqual(actualByParts(task))
  })

  // see FR-011
  it('a finished task is counted to actualFinish, a started one to stop', () => {
    const counter = workingTimeCounterOf(CALENDAR)
    expect(counter.actualLengthMinutes(documentTask(3))).not.toBeNull()
    expect(counter.actualLengthMinutes(documentTask(4))).toBeGreaterThan(counter.actualLengthMinutes(documentTask(3)) as number)
  })

  it.each([
    ['a start that cannot be read', looseTask({ start: 'not a date', finish: FINISH_OF('2027-05-14') })],
    ['a finish that cannot be read', looseTask({ start: START_OF('2027-05-10'), finish: 'not a date' })],
    ['no start', looseTask({ finish: FINISH_OF('2027-05-14') })],
    ['no finish', looseTask({ start: START_OF('2027-05-10') })],
  ])('plannedLengthMinutes gives null for %s (the ends of the plan cannot be read)', (_name, task) => {
    expect(workingTimeCounterOf(CALENDAR).plannedLengthMinutes(task)).toBeNull()
  })

  it.each([
    ['a task not started', documentTask(1)],
    ['an actual start that cannot be read', looseTask({ actualStart: 'not a date', stop: FINISH_OF('2027-05-12') })],
    ['a stop that cannot be read', looseTask({ actualStart: START_OF('2027-05-10'), stop: 'not a date' })],
    ['a started task with no stop', looseTask({ actualStart: START_OF('2027-05-10') })],
  ])('actualLengthMinutes gives null for %s (the ends of the actual cannot be read)', (_name, task) => {
    expect(workingTimeCounterOf(CALENDAR).actualLengthMinutes(task)).toBeNull()
  })
})

// see FR-054
describe('T-064 PI-1 finishSideDayFrom -- called with the day dayOf gave, then the same text; answers what finishSideDayOf answers', () => {
  it.each([
    START_OF('2027-05-10'),
    FINISH_OF('2027-05-14'),
    '2027-05-11T00:00:00',
    '2027-06-01T00:00:00',
    '2027-05-12',
    '2027-05-12T00:00:30',
    'not a date',
    '',
  ])('finishSideDayFrom(dayOf(%j), same text) equals finishSideDayOf of that text', (text) => {
    expect(finishSideDayFrom(dayOf(text), text)).toEqual(finishSideDayOf(text))
  })

  it('midnight falls on the day before, a date without a time is the day itself', () => {
    expect(finishSideDayFrom(dayOf('2027-05-11T00:00:00'), '2027-05-11T00:00:00')).toEqual({ year: 2027, month: 5, day: 10 })
    expect(finishSideDayFrom(dayOf('2027-05-12'), '2027-05-12')).toEqual({ year: 2027, month: 5, day: 12 })
  })

  it('the day and the text may each be absent: with neither there is no day', () => {
    expect(finishSideDayFrom(null, null)).toBeNull()
  })
})

const INTEGRATION = 3
const A = 1
const B = 2

// WHY: both predecessors finish on Friday 05-14 at 17:00 and the integration test starts on Wednesday 05-12 at 08:00,
// so each FS line breaks the VC-15 formula (successor start >= predecessor finish + lag) on its own.
const TWO_LATE_PREDECESSORS = (): Document =>
  documentOf(
    [
      { uid: A, name: 'predecessor A', start: START_OF('2027-05-10'), finish: FINISH_OF('2027-05-14') } satisfies TaskSpec,
      { uid: B, name: 'predecessor B', start: START_OF('2027-05-11'), finish: FINISH_OF('2027-05-14') } satisfies TaskSpec,
      {
        uid: INTEGRATION,
        name: 'integration test',
        start: START_OF('2027-05-12'),
        finish: FINISH_OF('2027-05-13'),
        after: [
          [A, FS, 0],
          [B, FS, 0],
        ],
      } satisfies TaskSpec,
    ],
    { statusDate: BEFORE_ALL },
  )

interface Choice {
  readonly key: string
  readonly [field: string]: unknown
}

interface KeyedRow extends FixRow {
  readonly key: string
  readonly checked?: boolean
  readonly choices?: readonly Choice[] | null
}

const vc15RowsOf = (rows: readonly FixRow[]): readonly KeyedRow[] =>
  rows.filter((one) => one.findingRow === 'VC-15' && one.taskUid === INTEGRATION) as unknown as readonly KeyedRow[]

const checkedCommands = (rows: readonly FixRow[]): readonly Loose[] =>
  commandsOf(rows.filter((one) => one.checked === true)) as unknown as readonly Loose[]

const choose = (row: KeyedRow, choice: Choice) => ({ key: row.key, checked: true, choice: choice.key, date: null })

// WHY: FA-15 names two commands, CM-11 for moving the successor and CM-37 for deleting the line; the choice that deletes
// the line is the one whose bundle holds the CM-37 command (deleteDependency, T-108). Its predecessor names the line.
function deletingChoiceOf(document: Document, row: KeyedRow): { readonly choice: Choice; readonly predecessorUid: number } {
  const found: { choice: Choice; predecessorUid: number }[] = []
  for (const choice of row.choices ?? []) {
    const commands = checkedCommands(proposed(document, [choose(row, choice)]))
    const deletions = commands.filter((one) => one['kind'] === 'deleteDependency')
    if (deletions.length === 1) found.push({ choice, predecessorUid: deletions[0]?.['predecessorUid'] as number })
  }
  if (found.length !== 1) throw new Error(`FA-15 row ${row.key}: expected one choice that deletes the line, got ${String(found.length)}`)
  return found[0] as { choice: Choice; predecessorUid: number }
}

const predecessorsOf = (document: Document, uid: number): number[] =>
  (taskIn(document, uid)['dependencies'] as readonly Loose[]).map((one) => one['predecessorUid'] as number)

// see VC-15
describe('T-310 VC-15 -- the scene: two late predecessors raise VC-15 twice on the integration test', () => {
  it('diagnoseDelay finds VC-15 twice', () => {
    expect(findingRowsOf(TWO_LATE_PREDECESSORS()).filter((one) => one === 'VC-15')).toHaveLength(2)
  })

  // see FA-15
  it('proposeDelayFixes gives two FA-15 rows on the integration test, each a choice of two, neither checked', () => {
    const rows = vc15RowsOf(proposed(TWO_LATE_PREDECESSORS()))
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row.fixRow).toBe('FA-15')
      expect(row.fixKind).toBe('choose')
      expect(row.choices ?? []).toHaveLength(2)
      expect(row.checked).not.toBe(true)
    }
  })
})

// see RW-16
describe('T-346 RW-16 -- a fix row is the observation, the Task, the column and the other Task of the line', () => {
  it('the two rows have different keys', () => {
    const [first, second] = vc15RowsOf(proposed(TWO_LATE_PREDECESSORS()))
    expect(typeof first?.key).toBe('string')
    expect(typeof second?.key).toBe('string')
    expect(first?.key).not.toBe(second?.key)
  })

  it('each row deletes its own line: one deletes the line from A, the other the line from B', () => {
    const document = TWO_LATE_PREDECESSORS()
    const rows = vc15RowsOf(proposed(document))
    const deleted = rows.map((row) => deletingChoiceOf(document, row).predecessorUid).sort()
    expect(deleted).toEqual([A, B])
  })

  it('a choice made on one row stays on that row only: the other row stays unchosen and unchecked after proposing again', () => {
    const document = TWO_LATE_PREDECESSORS()
    const before = vc15RowsOf(proposed(document))
    const [picked, other] = before as readonly [KeyedRow, KeyedRow]
    const { choice, predecessorUid } = deletingChoiceOf(document, picked)

    const again = proposed(document, [choose(picked, choice)])
    const after = vc15RowsOf(again)
    expect(after).toHaveLength(2)
    expect(new Set(after.map((one) => one.key))).toEqual(new Set([picked.key, other.key]))

    const pickedAfter = after.find((one) => one.key === picked.key) as KeyedRow
    const otherAfter = after.find((one) => one.key === other.key) as KeyedRow
    expect(pickedAfter.checked).toBe(true)
    expect(otherAfter.checked, 'the other row is not checked by the choice on the first').not.toBe(true)
    expect(otherAfter, 'the other row is the same as before anything was chosen').toEqual(other)

    const commands = checkedCommands(again)
    expect(commands).toHaveLength(1)
    expect(commands[0]).toMatchObject({ kind: 'deleteDependency', predecessorUid, successorUid: INTEGRATION })
    const written_ = written(heldOf(document), commands as unknown as readonly DocumentCommand[]).document
    expect(predecessorsOf(written_, INTEGRATION)).toEqual([A, B].filter((one) => one !== predecessorUid))
  })

  it('each row keeps its own choice when both rows are chosen, and keys stay the same across proposals', () => {
    const document = TWO_LATE_PREDECESSORS()
    const [first, second] = vc15RowsOf(proposed(document)) as readonly [KeyedRow, KeyedRow]
    const firstDelete = deletingChoiceOf(document, first).choice
    const secondMove = (second.choices ?? []).find((one) => one.key !== deletingChoiceOf(document, second).choice.key) as Choice
    const rows = proposed(document, [choose(first, firstDelete), choose(second, secondMove)])
    const commands = checkedCommands(rows)
    expect(commands).toHaveLength(2)
    expect(commands.filter((one) => one['kind'] === 'deleteDependency')).toHaveLength(1)
    expect(JSON.stringify(commands.find((one) => one['kind'] !== 'deleteDependency'))).toContain(String(INTEGRATION))
    expect(vc15RowsOf(rows).map((one) => one.key).sort()).toEqual([first.key, second.key].sort())
  })
})

// see PI-1
describe('T-064 PI-1 DelayFixCheck -- the fields key, checked, choice, date as the note states them', () => {
  it('a check whose checked, choice and date are null leaves the row as its default', () => {
    const document = TWO_LATE_PREDECESSORS()
    const plain = proposed(document)
    const [row] = vc15RowsOf(plain) as readonly [KeyedRow]
    expect(proposed(document, [{ key: row.key, checked: null, choice: null, date: null }])).toEqual(plain)
  })

  it('checked false on a machine row (FA-3 automatic) takes it out of the bundle; checked null keeps the default', () => {
    const document = DOUBLE_LINE_SAME()
    const rows = proposed(document)
    const row = oneRow(rows, 'VC-3', 2) as unknown as KeyedRow
    expect(row.fixKind).toBe('automatic')
    expect(row.checked).toBe(true)
    expect(commandsOf(machineRows(rows))).not.toEqual([])
    const unchecked = proposed(document, [{ key: row.key, checked: false, choice: null, date: null }])
    expect((oneRow(unchecked, 'VC-3', 2) as unknown as KeyedRow).checked).toBe(false)
    expect(checkedCommands(unchecked)).toEqual([])
    expect((oneRow(proposed(document, [{ key: row.key, checked: null, choice: null, date: null }]), 'VC-3', 2) as unknown as KeyedRow).checked).toBe(true)
  })

  // see FA-24
  it('date (yyyy-mm-dd) rewrites the suggested day of a date row (FA-24), and the bundle carries the rewritten day', () => {
    const document = FS_SUCCESSOR_STARTED()
    const row = oneRow(proposed(document), 'VO-3', 1) as unknown as KeyedRow
    expect(row.fixRow).toBe('FA-24')
    expect(dayTextIn(row.after)).toContain('2027-05-28')
    const rows = proposed(document, [{ key: row.key, checked: true, choice: null, date: '2027-05-26' }])
    const rewritten = oneRow(rows, 'VO-3', 1) as unknown as KeyedRow
    expect(rewritten.checked).toBe(true)
    expect(dayTextIn(rewritten.after)).toContain('2027-05-26')
    expect(dayTextIn(rewritten.after)).not.toContain('2027-05-28')
    const commands = checkedCommands(rows)
    expect(dayTextIn(commands)).toContain('2027-05-26')
    const after = written(heldOf(document), commands as unknown as readonly DocumentCommand[]).document
    expect(String(taskIn(after, 1)['actualFinish']).slice(0, 10)).toBe('2027-05-26')
  })
})
