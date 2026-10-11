// CR-731 spec-only cases: T-373 machine rows, the chain, the order of mending, a read-only parent and a derived parent (section 9 items 1, 2, 3, 9, 10)

import { describe, expect, it } from 'vitest'

import { FR_155_MACHINE_ROWS_APPLIED, T_310_STATED_PARENT_ONLY } from './cr-731-clauses'
import {
  CHAIN,
  DERIVED_PARENT,
  FINISHED_CHILDREN,
  MILESTONE_DUE,
  ONE_PARENT,
  READ_ONLY_PARENT,
  RESUME_AFTER_FINISH,
  SELF_DEPENDENT,
} from './cr-731-documents'
import {
  FIX_TYPES,
  REQUIREMENTS,
  commandsOf,
  dayOf,
  dayTextIn,
  findingRowsOf,
  hasSeam,
  lazily,
  heldOf,
  machineRows,
  oneRow,
  proposed,
  rowsOfFix,
  taskIn,
  written,
} from './cr-731-stage'
import { specTable } from './spec-table'

const T_373 = specTable('T-373')
const EVERY_VIEWPOINT = [
  ...Array.from({ length: 15 }, (_, at) => `VC-${String(at + 1)}`),
  ...Array.from({ length: 6 }, (_, at) => `VS-${String(at + 1)}`),
  ...Array.from({ length: 5 }, (_, at) => `VO-${String(at + 1)}`),
]
const FOUR_WORDS = ['機械', '選ぶ', '日付の候補', '手で直す']

const mended = (document: ReturnType<typeof ONE_PARENT>) => {
  const rows = proposed(document)
  return written(heldOf(document), commandsOf(machineRows(rows))).document
}

describe('FR-155 / T-373 -- the manuscript these cases read', () => {
  it('FR-155 still says the proposal is made after the machine rows are applied in the closing order', () => {
    expect(REQUIREMENTS).toContain(FR_155_MACHINE_ROWS_APPLIED)
  })

  it('T-310 still judges VC-9 to VC-12 on the stated parent only, so a derived pair has no FA-9 to FA-12 row', () => {
    expect(REQUIREMENTS).toContain(T_310_STATED_PARENT_ONLY)
  })

  it('T-373 holds FA-1 to FA-26 in order, one row for each viewpoint of T-310, T-311 and T-312', () => {
    expect(T_373.rows.map((one) => one.id)).toEqual(Array.from({ length: 26 }, (_, at) => `FA-${String(at + 1)}`))
    const named = T_373.rows.flatMap((one) => [...(one.by['観点'] ?? '').matchAll(/V[CSO]-\d+/g)].map((hit) => hit[0]))
    expect([...named].sort()).toEqual([...EVERY_VIEWPOINT].sort())
  })

  it('T-373 gives every row one of the four fix types, FA-3 alone by its content', () => {
    for (const one of T_373.rows) {
      const type = (one.by['直し方'] ?? '').trim()
      if (one.id === 'FA-3') expect(type, one.id).toContain('機械')
      else expect(FOUR_WORDS, one.id).toContain(type)
    }
  })

  it('the seams exist: proposeDelayFixes and delayFixCommands', () => {
    expect(hasSeam('proposeDelayFixes'), 'CR-731 section 5, proposeDelayFixes').toBe(true)
    expect(hasSeam('delayFixCommands'), 'CR-731 section 5, delayFixCommands').toBe(true)
  })
})

describe('item 1 -- FA-11: a parent whose finish is short of its children gets the row, checked from the start', () => {
  const rowsOf = lazily(() => proposed(ONE_PARENT()))

  it('the document premise: only VC-11 is found', () => {
    expect(findingRowsOf(ONE_PARENT())).toEqual(['VC-11'])
  })

  it('one row for VC-11, the row FA-11 of T-373, on the parent, made by the machine', () => {
    const row = oneRow(rowsOf(), 'VC-11', 1)
    expect(row.fixRow).toBe('FA-11')
    expect(FIX_TYPES).toContain(row.fixType)
    expect(row.fixType).toBe('automatic')
  })

  it('before is 2027/05/21 and after is 2027/05/26', () => {
    const row = oneRow(rowsOf(), 'VC-11', 1)
    expect(dayTextIn(row.before)).toContain('2027-05-21')
    expect(dayTextIn(row.after)).toContain('2027-05-26')
  })

  it('the proposal holds no row for the two children: the machine writes no childless task (T-373 preamble)', () => {
    expect(rowsOf().filter((one) => one.taskUid === 2 || one.taskUid === 3)).toEqual([])
  })

  it('FA-11 as a bundle: the parent finish becomes the latest child finish and the start stays the earliest', () => {
    const next = mended(ONE_PARENT())
    expect(dayOf(taskIn(next, 1)['finish'])).toBe('2027-05-26')
    expect(dayOf(taskIn(next, 1)['start'])).toBe('2027-05-10')
    expect(findingRowsOf(next)).toEqual([])
  })
})

describe('item 2 -- the chain: a mend that makes the grandparent wrong brings a row under the first', () => {
  const mendsOf = lazily(() => rowsOfFix(proposed(CHAIN()), 'FA-11'))

  it('the document premise: only the middle parent is found at first', () => {
    expect(findingRowsOf(CHAIN())).toEqual(['VC-11'])
  })

  it('two FA-11 rows: the middle parent, then under it the root that only comes up after the first is applied', () => {
    expect(mendsOf().map((one) => one.taskUid)).toEqual([1, 10])
  })

  it('the chain row is made by the machine too, says what it follows, and the source row says nothing of the kind', () => {
    const [source, chained] = mendsOf()
    expect(source?.causedBy ?? null).toBeNull()
    expect(chained?.causedBy ?? null).not.toBeNull()
    expect(chained?.fixType).toBe('automatic')
  })

  it('the chain row reads 2027/05/21 before and 2027/05/26 after, as if the first mend were done', () => {
    const chained = mendsOf()[1]
    expect(dayTextIn(chained?.before)).toContain('2027-05-21')
    expect(dayTextIn(chained?.after)).toContain('2027-05-26')
  })

  it.todo('unchecking the source row unchecks and disables the chain row, checking it again brings it back (RW-16): the specification names no shape for the checks')
})

describe('item 3 -- children first: three levels end with no VC-11 on a second look', () => {
  it('the middle parent and the root both end at 2027/05/26 and the diagnosis finds none', () => {
    const next = mended(CHAIN())
    expect(dayOf(taskIn(next, 1)['finish'])).toBe('2027-05-26')
    expect(dayOf(taskIn(next, 10)['finish'])).toBe('2027-05-26')
    expect(findingRowsOf(next)).not.toContain('VC-11')
  })

  it('the starts of the parents stay, and no childless task is touched', () => {
    const before = CHAIN()
    const next = mended(before)
    for (const uid of [1, 10]) expect(dayOf(taskIn(next, uid)['start'])).toBe('2027-05-10')
    for (const uid of [2, 3, 4]) {
      for (const field of ['start', 'finish', 'actualStart', 'actualFinish'] as const) {
        expect(taskIn(next, uid)[field], `task ${String(uid)} ${field}`).toEqual(taskIn(before, uid)[field])
      }
    }
  })

  it('one bundle: the commands of the checked rows are one list', () => {
    const commands = commandsOf(machineRows(proposed(CHAIN())))
    expect(commands.length).toBeGreaterThanOrEqual(2)
  })
})

describe('the other machine rows -- FA-2, FA-8, FA-10, FA-12, FA-26 mend the finding they stand behind', () => {
  const CASES: readonly (readonly [string, string, () => ReturnType<typeof ONE_PARENT>])[] = [
    ['FA-2', 'VC-2', SELF_DEPENDENT],
    ['FA-8', 'VC-8', RESUME_AFTER_FINISH],
    ['FA-10', 'VC-10', FINISHED_CHILDREN],
    ['FA-12', 'VC-12', FINISHED_CHILDREN],
    ['FA-26', 'VO-5', MILESTONE_DUE],
  ]

  it.each(CASES)('%s: the row for %s is made by the machine and the finding is gone once it is applied', (fixRow, findingRow, make) => {
    expect(findingRowsOf(make()), 'premise').toContain(findingRow)
    const row = oneRow(proposed(make()), findingRow)
    expect(row.fixRow).toBe(fixRow)
    expect(row.fixType).toBe('automatic')
    expect(findingRowsOf(mended(make()))).not.toContain(findingRow)
  })

  it('FA-10 and FA-12: the parent takes the earliest start and the latest finish of its finished children', () => {
    const next = mended(FINISHED_CHILDREN())
    expect(dayOf(taskIn(next, 1)['actualStart'])).toBe('2027-05-11')
    expect(dayOf(taskIn(next, 1)['actualFinish'])).toBe('2027-05-20')
  })

  it('FA-26: the milestone is finished on the day its last predecessor finished, both actuals on that day', () => {
    const next = mended(MILESTONE_DUE())
    expect(dayOf(taskIn(next, 2)['actualStart'])).toBe('2027-05-14')
    expect(dayOf(taskIn(next, 2)['actualFinish'])).toBe('2027-05-14')
  })

  it('FA-2: the self dependency is removed and the task keeps its plan', () => {
    const before = SELF_DEPENDENT()
    const next = mended(before)
    expect((taskIn(next, 1)['dependencies'] as unknown[]).length).toBe(0)
    expect(taskIn(next, 1)['start']).toEqual(taskIn(before, 1)['start'])
  })
})

describe('item 9 -- a read-only parent: the row is shown and cannot be checked', () => {
  it('the row for VC-11 on the parent carries a refusal and the checked rows make no command from it', () => {
    const rows = proposed(READ_ONLY_PARENT())
    const row = oneRow(rows, 'VC-11', 1)
    expect(row.refusal ?? null, 'GP-1 refuses an edit of a task in a task group with an editGroup').not.toBeNull()
    expect(commandsOf(machineRows(rows))).toEqual([])
  })
})

describe('item 10 -- a parent only derived from the task groups is never mended by the machine', () => {
  it('the document premise: the parent is derived, parentTaskUid stays null', () => {
    const document = DERIVED_PARENT()
    expect(taskIn(document, 2)['parentTaskUid']).toBeNull()
  })

  it('no FA-9 to FA-12 row of the machine, of a choice or of a suggested date stands on the derived pair', () => {
    const rows = proposed(DERIVED_PARENT())
    const mends = ['FA-9', 'FA-10', 'FA-11', 'FA-12'].flatMap((fixRow) => rowsOfFix(rows, fixRow))
    expect(mends.filter((one) => one.fixType !== 'byHand')).toEqual([])
  })
})
