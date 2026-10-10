// CR-731 spec-only cases: T-373 rows that offer choices or a suggested date, and the one-line ones of FA-3 (section 9 items 4 and 5)

import { describe, expect, it } from 'vitest'

import {
  ACTUAL_AFTER_STATUS_DATE,
  CYCLE,
  DOUBLE_LINE_DIFFERENT,
  DOUBLE_LINE_SAME,
  FS_SUCCESSOR_STARTED,
  MILESTONE_WITH_SPAN,
  NOT_STARTED_AFTER_START,
  PARENT_DONE_CHILD_OPEN,
} from './cr-731-documents'
import {
  cellOf,
  commandsOf,
  dayTextIn,
  findingRowsOf,
  heldOf,
  machineRows,
  oneRow,
  proposed,
  rowsFor,
  taskIn,
  written,
} from './cr-731-stage'

const choiceCountOf = (fixRow: string): number => {
  const cell = cellOf('T-373', fixRow, '直し（修正後）')
  const said = /択は\s*(\d+)\s*つ/.exec(cell)
  if (said === null) throw new Error(`T-373 ${fixRow} states no number of choices`)
  return Number(said[1])
}

describe('item 4 -- FA-1: a loop of three lines offers three choices and checks none', () => {
  it('the document premise: three VC-1 findings stand on the loop', () => {
    expect(findingRowsOf(CYCLE()).filter((one) => one === 'VC-1')).toHaveLength(3)
  })

  it('every VC-1 row is a choice of three, one for each line of the loop, and the machine takes none of them', () => {
    const rows = rowsFor(proposed(CYCLE()), 'VC-1')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.fixRow).toBe('FA-1')
      expect(row.fixType).toBe('choose')
      expect(row.choices ?? [], `task ${String(row.taskUid)}`).toHaveLength(3)
      expect(new Set((row.choices ?? []).map((one) => JSON.stringify(one))).size, 'three different lines').toBe(3)
    }
    expect(machineRows(rows)).toEqual([])
  })

  it('the checked rows of a loop make no command until a line is chosen', () => {
    expect(commandsOf(machineRows(proposed(CYCLE())))).toEqual([])
  })

  it.todo('choosing a line checks the row and the bundle deletes that line only (FA-1): the specification names no way to choose')
})

describe('item 5 -- FA-24: a successor started on 05/28 while the predecessor has no actual finish', () => {
  it('the document premise: VO-3 stands on the predecessor', () => {
    expect(findingRowsOf(FS_SUCCESSOR_STARTED())).toContain('VO-3')
  })

  it('the row is a suggested date, 2027/05/28, and it is not one the machine checks', () => {
    const rows = proposed(FS_SUCCESSOR_STARTED())
    const row = oneRow(rows, 'VO-3', 1)
    expect(row.fixRow).toBe('FA-24')
    expect(row.fixType).toBe('suggestedDate')
    expect(dayTextIn(row.after)).toContain('2027-05-28')
    expect(machineRows(rows)).not.toContain(row)
  })

  it('FA-22: a task past its start with no actual start suggests its start as the day', () => {
    const row = oneRow(proposed(NOT_STARTED_AFTER_START()), 'VO-1', 1)
    expect(row.fixRow).toBe('FA-22')
    expect(row.fixType).toBe('suggestedDate')
    expect(dayTextIn(row.after)).toContain('2027-05-10')
  })

  it('the suggested days make no command in the default bundle', () => {
    expect(commandsOf(machineRows(proposed(FS_SUCCESSOR_STARTED())))).toEqual([])
  })
})

describe('T-373 -- the rows of a choice carry as many choices as the table says', () => {
  const CASES: readonly (readonly [string, string, () => ReturnType<typeof CYCLE>, number])[] = [
    ['FA-4', 'VC-4', MILESTONE_WITH_SPAN, 1],
    ['FA-9', 'VC-9', PARENT_DONE_CHILD_OPEN, 1],
    ['FA-20', 'VS-5', ACTUAL_AFTER_STATUS_DATE, 1],
    ['FA-23', 'VO-2', FS_SUCCESSOR_STARTED, 1],
    ['FA-15', 'VC-15', CYCLE, 1],
  ]

  it.each(CASES)('%s: the %s row is a choice of the number of choices in T-373, checked by no one', (fixRow, findingRow, make, uid) => {
    const row = oneRow(proposed(make()), findingRow, uid)
    expect(row.fixRow).toBe(fixRow)
    expect(row.fixType).toBe('choose')
    expect(row.choices ?? []).toHaveLength(choiceCountOf(fixRow))
  })
})

describe('FA-3 -- two lines between the same two tasks', () => {
  it('lines of the same kind and lag: the machine keeps the first in the document order and deletes the rest', () => {
    const before = DOUBLE_LINE_SAME()
    const rows = proposed(before)
    const row = oneRow(rows, 'VC-3', 2)
    expect(row.fixRow).toBe('FA-3')
    expect(row.fixType).toBe('automatic')
    const next = written(heldOf(before), commandsOf(machineRows(rows))).document
    expect((taskIn(next, 2)['dependencies'] as unknown[]).length).toBe(1)
    expect(findingRowsOf(next)).not.toContain('VC-3')
  })

  it('lines that differ in kind: a choice of the two lines, and the machine takes none', () => {
    const rows = proposed(DOUBLE_LINE_DIFFERENT())
    const row = oneRow(rows, 'VC-3', 2)
    expect(row.fixRow).toBe('FA-3')
    expect(row.fixType).toBe('choose')
    expect(row.choices ?? []).toHaveLength(2)
    expect(machineRows(rows)).not.toContain(row)
  })
})
