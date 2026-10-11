// CR-735 spec-only cases: CM-93 deletes one named dependency line, FA-3 mends a double line with it, VC-9 to VC-12 judge the stated parent only

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { editDocument } from '../../src/use-case/edit-document/edit-document'
import type { DocumentCommand } from '../../src/use-case/apply-document-change/apply-document-change'
import { AFTER_MAY } from './cr-731-documents'
import {
  BEFORE_ALL,
  FINISH_OF,
  FS,
  START_OF,
  cellOf,
  commandsOf,
  documentOf,
  findingRowsOf,
  heldOf,
  machineRows,
  oneRow,
  planned,
  proposed,
  rowsOfFix,
  stepsOf,
  taskIn,
  undone,
  written,
  type DocumentSpec,
  type FixRow,
  type Loose,
  type TaskSpec,
} from './cr-731-stage'

const FF = 0
const SS = 3
const A_DAY = 4800

const span = (uid: number, from: string, to: string, extra: Partial<TaskSpec> = {}): TaskSpec => ({
  uid,
  start: START_OF(`2027-${from}`),
  finish: FINISH_OF(`2027-${to}`),
  ...extra,
})

interface Line {
  readonly predecessorUid: number
  readonly linkType: number
  readonly lag: number
}

const linesOf = (document: Document, uid: number): readonly Line[] =>
  (taskIn(document, uid)['dependencies'] as readonly Line[]).map((one) => ({
    predecessorUid: one.predecessorUid,
    linkType: one.linkType,
    lag: one.lag,
  }))

const line = (predecessorUid: number, linkType: number, lag = 0): Line => ({ predecessorUid, linkType, lag })

// WHY: the bench builds a line from three numbers only; a line the person can tell apart (a carried value) needs the
// dependencies of one task replaced on a copy of the document.
function withLinesOf(document: Document, uid: number, change: (lines: readonly Loose[]) => readonly Loose[]): Document {
  const schedule = document.schedule as unknown as { readonly tasks: readonly Loose[] }
  const tasks = schedule.tasks.map((one) => (one['uid'] === uid ? { ...one, dependencies: change(one['dependencies'] as readonly Loose[]) } : one))
  return { ...document, schedule: { ...document.schedule, tasks } } as unknown as Document
}

const marked = (lines: readonly Loose[]): readonly Loose[] => lines.map((one, at) => ({ ...one, carry: { marker: at } }))

const deleteAt = (predecessorUid: number, successorUid: number, order: number): DocumentCommand =>
  ({ kind: 'deleteDependencyAt', predecessorUid, successorUid, order }) as unknown as DocumentCommand

const deleteAll = (predecessorUid: number, successorUid: number): DocumentCommand =>
  ({ kind: 'deleteDependency', predecessorUid, successorUid }) as unknown as DocumentCommand

const THREE_LINES = (): Document =>
  documentOf([span(1, '05-10', '05-11'), span(2, '05-12', '05-13', { after: [[1, FS, 0], [1, SS, 0], [1, FF, A_DAY]] })], {
    statusDate: BEFORE_ALL,
  })

const refusalsOf = (plan: ReturnType<typeof planned>): readonly Loose[] => {
  if (plan.ok) return []
  return ((plan.refusal as unknown as { refusals?: readonly Loose[] }).refusals ?? []) as readonly Loose[]
}

describe('T-108 CM-93 -- the manuscript these cases read', () => {
  it('the row is named deleteDependencyAt', () => {
    expect(cellOf('T-108', 'CM-93', '確定名')).toContain('deleteDependencyAt')
  })

  it('CM-37 keeps its name and still says it removes every line of that direction', () => {
    expect(cellOf('T-108', 'CM-37', '確定名')).toContain('deleteDependency')
    expect(cellOf('T-108', 'CM-37', '何を担うか')).toContain('その向きの線をすべて')
  })

  it('T-373 FA-3 names CM-93 as its command', () => {
    expect(cellOf('T-373', 'FA-3', '命令')).toContain('CM-93')
  })
})

describe('T-108 CM-93 -- deletes only the order-th line among the lines from one predecessor to one successor (0 is the first)', () => {
  it.each([
    [0, [line(1, SS, 0), line(1, FF, A_DAY)]],
    [1, [line(1, FS, 0), line(1, FF, A_DAY)]],
    [2, [line(1, FS, 0), line(1, SS, 0)]],
  ])('order %i removes that one line and keeps the others in their order', (order, kept) => {
    const after = written(heldOf(THREE_LINES()), [deleteAt(1, 2, order)]).document
    expect(linesOf(after, 2)).toEqual(kept)
  })

  it('the order counts only the lines from the named predecessor, not the whole dependency list of the successor', () => {
    const before = documentOf(
      [span(1, '05-10', '05-11'), span(4, '05-10', '05-11'), span(2, '05-12', '05-13', { after: [[1, FS, 0], [4, FS, 0], [1, SS, 0]] })],
      { statusDate: BEFORE_ALL },
    )
    const after = written(heldOf(before), [deleteAt(1, 2, 1)]).document
    expect(linesOf(after, 2)).toEqual([line(1, FS, 0), line(4, FS, 0)])
  })

  it('a line of the other direction between the same two tasks is not touched', () => {
    const before = documentOf(
      [span(1, '05-10', '05-11', { after: [[2, SS, 0]] }), span(2, '05-12', '05-13', { after: [[1, FS, 0], [1, FS, A_DAY]] })],
      { statusDate: BEFORE_ALL },
    )
    const after = written(heldOf(before), [deleteAt(1, 2, 0)]).document
    expect(linesOf(after, 2)).toEqual([line(1, FS, A_DAY)])
    expect(linesOf(after, 1)).toEqual([line(2, SS, 0)])
  })

  it('no other task changes and no other column of the successor changes', () => {
    const before = THREE_LINES()
    const after = written(heldOf(before), [deleteAt(1, 2, 1)]).document
    expect(taskIn(after, 1)).toEqual(taskIn(before, 1))
    const { dependencies: _dependenciesAfter, ...restAfter } = taskIn(after, 2)
    const { dependencies: _dependenciesBefore, ...restBefore } = taskIn(before, 2)
    expect(restAfter).toEqual(restBefore)
  })

  it('two lines that are equal in every field: one is removed, one stays', () => {
    const before = documentOf([span(1, '05-10', '05-11'), span(2, '05-12', '05-13', { after: [[1, FS, 0], [1, FS, 0]] })], {
      statusDate: BEFORE_ALL,
    })
    const after = written(heldOf(before), [deleteAt(1, 2, 0)]).document
    expect(linesOf(after, 2)).toEqual([line(1, FS, 0)])
  })

  it('a line told apart by a carried value: order 0 removes the first line and the second stays', () => {
    const before = withLinesOf(
      documentOf([span(1, '05-10', '05-11'), span(2, '05-12', '05-13', { after: [[1, FS, 0], [1, FS, 0]] })], { statusDate: BEFORE_ALL }),
      2,
      marked,
    )
    const after = written(heldOf(before), [deleteAt(1, 2, 0)]).document
    const left = taskIn(after, 2)['dependencies'] as readonly Loose[]
    expect(left).toHaveLength(1)
    expect(left[0]?.['carry']).toEqual({ marker: 1 })
  })

  it('is one undoable step, and undo brings the line back where it stood', () => {
    const before = THREE_LINES()
    const held = written(heldOf(before), [deleteAt(1, 2, 1)])
    expect(stepsOf(held)).toBe(1)
    expect(linesOf(undone(held).document, 2)).toEqual(linesOf(before, 2))
  })

  it('answers the same through editDocument (the aggregate dispatch)', () => {
    const result = editDocument(
      THREE_LINES(),
      deleteAt(1, 2, 0),
      { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 },
      'Row',
    ) as unknown as { ok: boolean; document?: Document }
    expect(result.ok).toBe(true)
    expect(linesOf(result.document as Document, 2)).toEqual([line(1, SS, 0), line(1, FF, A_DAY)])
  })

  it('Schedule withoutDependencyAt (PI-1) answers the task without that one line, and null when there is no such line', () => {
    const task = taskIn(THREE_LINES(), 2) as unknown as Parameters<typeof scheduleEntry.withoutDependencyAt>[0]
    const cut = scheduleEntry.withoutDependencyAt(task, 1, 1)
    expect(cut).not.toBeNull()
    expect((cut as unknown as { dependencies: readonly Line[] }).dependencies.map((one) => [one.linkType, one.lag])).toEqual([
      [FS, 0],
      [FF, A_DAY],
    ])
    expect(scheduleEntry.withoutDependencyAt(task, 1, 3)).toBeNull()
    expect(scheduleEntry.withoutDependencyAt(task, 1, -1)).toBeNull()
    expect(scheduleEntry.withoutDependencyAt(task, 9, 0)).toBeNull()
  })
})

describe('T-108 CM-93 -- refuses when there is no such line (CM-37 does nothing in that case, CM-93 refuses)', () => {
  const refusedAs = (document: Document, command: DocumentCommand): void => {
    const plan = planned(heldOf(document), [command])
    expect(plan.ok, JSON.stringify(command)).toBe(false)
    expect(
      refusalsOf(plan).some((one) => one['command'] === 'CM-93'),
      JSON.stringify(refusalsOf(plan)),
    ).toBe(true)
  }

  it.each([
    ['one past the last line', 3],
    ['far past the last line', 99],
    ['negative', -1],
    ['not a whole number (0.5)', 0.5],
    ['not a whole number (1.5)', 1.5],
    ['not a number', Number.NaN],
  ])('order %s is refused with CM-93', (_name, order) => {
    refusedAs(THREE_LINES(), deleteAt(1, 2, order))
  })

  it('a predecessor that has no line into the successor is refused', () => {
    refusedAs(THREE_LINES(), deleteAt(9, 2, 0))
  })

  it('a successor that is not in the document is refused', () => {
    refusedAs(THREE_LINES(), deleteAt(1, 9, 0))
  })

  it('only the reverse direction has a line, so the named direction has none and is refused', () => {
    const before = documentOf([span(1, '05-10', '05-11', { after: [[2, FS, 0]] }), span(2, '05-12', '05-13')], { statusDate: BEFORE_ALL })
    refusedAs(before, deleteAt(1, 2, 0))
  })

  it('CM-37 on the same missing pair does nothing and is not refused (the difference X-3 draws)', () => {
    const before = THREE_LINES()
    const plan = planned(heldOf(before), [deleteAll(9, 2)])
    expect(plan.ok).toBe(true)
    if (plan.ok) expect(linesOf(plan.document, 2)).toEqual(linesOf(before, 2))
  })

  it('FR-155: one refused command refuses the whole bundle -- the valid line is not removed either', () => {
    const held = heldOf(THREE_LINES())
    const plan = planned(held, [deleteAt(1, 2, 0), deleteAt(1, 2, 7)])
    expect(plan.ok).toBe(false)
    const asRecord = plan as unknown as Record<string, unknown>
    expect(asRecord['document']).toBeUndefined()
    expect(asRecord['history']).toBeUndefined()
    expect(linesOf(held.document, 2)).toHaveLength(3)
  })
})

describe('FR-032 CM-37 -- still deletes every line of that direction', () => {
  it('both lines of one predecessor go, the other predecessor and the reverse direction stay', () => {
    const before = documentOf(
      [
        span(1, '05-10', '05-11', { after: [[2, SS, 0]] }),
        span(4, '05-10', '05-11'),
        span(2, '05-12', '05-13', { after: [[1, FS, 0], [4, FS, 0], [1, SS, 0]] }),
      ],
      { statusDate: BEFORE_ALL },
    )
    const after = written(heldOf(before), [deleteAll(1, 2)]).document
    expect(linesOf(after, 2)).toEqual([line(4, FS, 0)])
    expect(linesOf(after, 1)).toEqual([line(2, SS, 0)])
  })
})

// WHY: lines on task 2 from task 1, each told apart by a carried value (the machine keeps the first in the document order).
const SAME_LINES = (count: number): Document =>
  withLinesOf(
    documentOf([span(1, '05-10', '05-11'), span(2, '05-12', '05-13', { after: Array.from({ length: count }, () => [1, FS, 0] as const) })], {
      statusDate: BEFORE_ALL,
    }),
    2,
    marked,
  )

const markersOf = (document: Document, uid: number): unknown[] =>
  (taskIn(document, uid)['dependencies'] as readonly Loose[]).map((one) => (one['carry'] as Loose)['marker'])

const rowOfFa3 = (rows: readonly FixRow[], uid: number): FixRow => {
  const row = oneRow(rows, 'VC-3', uid)
  expect(row.fixRow).toBe('FA-3')
  return row
}

describe('T-373 FA-3 -- three or more lines of the same kind and lag: the machine keeps the first and deletes the rest, line by line (CM-93)', () => {
  it.each([3, 4])('%i lines: one machine row, count-1 deleteDependencyAt commands, the first line stays', (count) => {
    const before = SAME_LINES(count)
    expect(findingRowsOf(before)).toContain('VC-3')
    const rows = proposed(before)
    const row = rowOfFa3(rows, 2)
    expect(row.fixType).toBe('automatic')
    const commands = commandsOf(machineRows(rows)) as unknown as readonly Loose[]
    expect(commands).toHaveLength(count - 1)
    expect(new Set(commands.map((one) => one['kind']))).toEqual(new Set(['deleteDependencyAt']))
    expect(commands.every((one) => one['predecessorUid'] === 1 && one['successorUid'] === 2)).toBe(true)
    const after = written(heldOf(before), commands as unknown as readonly DocumentCommand[]).document
    expect(markersOf(after, 2)).toEqual([0])
    expect(findingRowsOf(after)).not.toContain('VC-3')
  })

  it('the bundle is the one write: one undo brings every line back', () => {
    const before = SAME_LINES(3)
    const held = written(heldOf(before), commandsOf(machineRows(proposed(before))))
    expect(stepsOf(held)).toBe(1)
    expect(markersOf(undone(held).document, 2)).toEqual([0, 1, 2])
  })

  it('the line of another predecessor in the same dependency list is not deleted', () => {
    const base = documentOf(
      [
        span(1, '05-10', '05-11'),
        span(4, '05-10', '05-11'),
        span(2, '05-12', '05-13', { after: [[1, FS, 0], [4, FS, 0], [1, FS, 0], [1, FS, 0]] }),
      ],
      { statusDate: BEFORE_ALL },
    )
    const before = withLinesOf(base, 2, marked)
    const after = written(heldOf(before), commandsOf(machineRows(proposed(before)))).document
    expect(markersOf(after, 2)).toEqual([0, 1])
    expect(linesOf(after, 2)).toEqual([line(1, FS, 0), line(4, FS, 0)])
  })
})

describe('T-373 FA-3 -- lines that differ in kind or lag: a choice with one choice for each line, the machine takes none', () => {
  const lines = [line(1, FS, 0), line(1, SS, 0), line(1, FF, A_DAY)]

  it('the row is a choice of three, not issued by the machine', () => {
    const rows = proposed(THREE_LINES())
    const row = rowOfFa3(rows, 2)
    expect(row.fixType).toBe('choose')
    expect(row.choices ?? []).toHaveLength(3)
    expect(machineRows(rows)).not.toContain(row)
    expect(commandsOf(machineRows(rows))).toEqual([])
  })

  it('two lines the same and one different still differ, so the row is a choice (of three lines)', () => {
    const before = documentOf([span(1, '05-10', '05-11'), span(2, '05-12', '05-13', { after: [[1, FS, 0], [1, FS, 0], [1, SS, 0]] })], {
      statusDate: BEFORE_ALL,
    })
    const row = rowOfFa3(proposed(before), 2)
    expect(row.fixType).toBe('choose')
    expect(row.choices ?? []).toHaveLength(3)
  })

  // WHY: the specification names no field of DelayFixCheck (RW-16 says only that the check, the chosen choice and the date are kept);
  // the shape below is the one the published type declares. See the ledger row for the gap.
  it('choosing a line keeps that line and deletes each of the others: the three choices keep three different lines, between them all three', () => {
    const before = THREE_LINES()
    const row = rowOfFa3(proposed(before), 2) as unknown as { key: string; choices: readonly { key: string }[] }
    const kept = row.choices.map((choice) => {
      const chosen = proposed(before, [{ key: row.key, checked: true, choice: choice.key, date: null }])
      expect(rowOfFa3(chosen, 2).checked, 'the chosen row is checked').toBe(true)
      const commands = commandsOf(chosen.filter((one) => one.checked === true)) as unknown as readonly Loose[]
      expect(commands).toHaveLength(2)
      expect(new Set(commands.map((one) => one['kind']))).toEqual(new Set(['deleteDependencyAt']))
      const after = written(heldOf(before), commands as unknown as readonly DocumentCommand[]).document
      expect(findingRowsOf(after)).not.toContain('VC-3')
      return linesOf(after, 2)
    })
    expect(kept.every((one) => one.length === 1)).toBe(true)
    expect(kept.map((one) => JSON.stringify(one[0])).sort()).toEqual(lines.map((one) => JSON.stringify(one)).sort())
  })
})

describe('T-373 FA-3 -- lines in both directions between the same two tasks (two the same way, one back)', () => {
  const MIXED = (): Document =>
    withLinesOf(
      documentOf([span(1, '05-10', '05-11', { after: [[2, FS, 0]] }), span(2, '05-12', '05-13', { after: [[1, FS, 0], [1, FS, 0]] })], {
        statusDate: BEFORE_ALL,
      }),
      2,
      marked,
    )

  // WHY: T-310 VC-3 counts lines between "the same 2 Tasks" and FA-3 keeps one and deletes the rest, so one line is left between the two (see the ledger row for which one).
  it('every command of the machine rows names a line that exists, so the bundle is not refused, and one line is left between the two tasks', () => {
    const before = MIXED()
    const commands = commandsOf(machineRows(proposed(before)))
    const plan = planned(heldOf(before), commands)
    expect(plan.ok, JSON.stringify(refusalsOf(plan))).toBe(true)
    if (!plan.ok) return
    expect(linesOf(plan.document, 2).length + linesOf(plan.document, 1).length).toBe(1)
    expect(findingRowsOf(plan.document)).not.toContain('VC-3')
  })

  it('at most one line of the same way is left, and the order of a named line counts within its own direction', () => {
    const before = MIXED()
    const commands = commandsOf(machineRows(proposed(before))) as unknown as readonly Loose[]
    for (const one of commands) {
      if (one['kind'] !== 'deleteDependencyAt') continue
      const sameWay = one['predecessorUid'] === 1 && one['successorUid'] === 2
      const reverse = one['predecessorUid'] === 2 && one['successorUid'] === 1
      expect(sameWay || reverse, JSON.stringify(one)).toBe(true)
      expect(one['order'], JSON.stringify(one)).toBeLessThan(sameWay ? 2 : 1)
    }
    const after = written(heldOf(before), commands as unknown as readonly DocumentCommand[]).document
    expect(linesOf(after, 2).filter((one) => one.predecessorUid === 1).length).toBeLessThanOrEqual(1)
  })
})

// WHY: a pair under a parent: the stated form puts the parent in parentTaskUid, the derived form only in the task groups (FR-135).
type Pair = readonly [parent: Partial<TaskSpec>, child: Partial<TaskSpec>, status: DocumentSpec]

const pairOf = (stated: boolean, [parent, child, status]: Pair): Document =>
  documentOf(
    [
      span(1, '05-10', '05-28', parent),
      span(2, '05-12', '05-14', { ...child, ...(stated ? { parent: 1 } : { derivedUnder: 1 }) }),
    ],
    status,
  )

const VIEWPOINTS: readonly (readonly [string, Pair])[] = [
  [
    'VC-9',
    [
      { actualStart: START_OF('2027-05-10'), actualFinish: FINISH_OF('2027-05-28'), percentComplete: 100 },
      { actualStart: START_OF('2027-05-12'), percentComplete: 40 },
      { statusDate: AFTER_MAY },
    ],
  ],
  [
    'VC-10',
    [
      {},
      { actualStart: START_OF('2027-05-12'), actualFinish: FINISH_OF('2027-05-14'), percentComplete: 100 },
      { statusDate: AFTER_MAY },
    ],
  ],
  ['VC-11', [{}, {}, { statusDate: BEFORE_ALL }]],
  [
    'VC-12',
    [{ actualStart: START_OF('2027-05-10') }, { actualStart: START_OF('2027-05-12'), percentComplete: 40 }, { statusDate: AFTER_MAY }],
  ],
]

describe('T-310 VC-9 to VC-12 -- raised for the pair of a stated parent (parentTaskUid), never for a parent FR-135 only derives', () => {
  it.each(VIEWPOINTS)('%s stands on the stated pair', (row, pair) => {
    expect(findingRowsOf(pairOf(true, pair))).toContain(row)
  })

  it.each(VIEWPOINTS)('%s does not stand on the same pair when the parent is only derived', (row, pair) => {
    expect(findingRowsOf(pairOf(false, pair))).not.toContain(row)
  })

  it('the derived documents hold a derived parent and a null parentTaskUid (the premise of the cases above)', () => {
    for (const [, pair] of VIEWPOINTS) {
      const document = pairOf(false, pair)
      expect(taskIn(document, 2)['parentTaskUid']).toBeNull()
      expect(scheduleEntry.parentTaskResolutionsOf(document as never).get(2)).toEqual({ kind: 'derived', parentUid: 1 })
    }
  })

  it('none of VC-9 to VC-12 stands on any derived pair, and no FA-9 to FA-12 row is made for it', () => {
    for (const [, pair] of VIEWPOINTS) {
      const document = pairOf(false, pair)
      expect(findingRowsOf(document).filter((one) => ['VC-9', 'VC-10', 'VC-11', 'VC-12'].includes(one))).toEqual([])
      const rows = proposed(document)
      expect(['FA-9', 'FA-10', 'FA-11', 'FA-12'].flatMap((one) => rowsOfFix(rows, one))).toEqual([])
    }
  })

  it('a child that has a stated parent is judged against the stated parent although the task groups say another', () => {
    const document = documentOf(
      [span(10, '05-10', '05-28'), span(1, '05-10', '05-28', { derivedUnder: 10 }), span(2, '05-12', '05-14', { parent: 1 })],
      { statusDate: BEFORE_ALL },
    )
    expect(scheduleEntry.parentTaskResolutionsOf(document as never).get(2)).toEqual({ kind: 'stated', parentUid: 1 })
    expect(findingRowsOf(document)).toContain('VC-11')
  })
})
