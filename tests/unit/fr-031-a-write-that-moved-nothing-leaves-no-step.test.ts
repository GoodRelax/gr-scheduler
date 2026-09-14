// Unit tests for the ruling of 2026-09-08 written into FR-031: a write that changed no value of the document leaves no undo step.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  NOT_STORED_LIMITS,
  emptyHistory,
  stepCount,
  type HistoryLimits,
} from '../../src/entity/document-model/edit-history/edit-history'
import {
  applyDocumentChange,
  type ApplyOutcome,
  type ChangeAudience,
  type ChangeStep,
  type DocumentCommand,
  type DocumentHolder,
  type HeldDocument,
  type SettingsLimits,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import { bare, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const NO_VALUE_MOVED_NO_STEP =
  'が文書の値を 1 つも変えなかったときは、取り消しの段を残さないこと（MUST）'

const THE_RULE_SITS_ON_TOP_OF_THE_TABLE =
  'しの段を残さないこと（MUST）—— **段とは戻す先の文書であり、動いていない文書に戻す先は無い。**⭐ 本表の 対象／対象外 は命令の種類で決まる分類であり、本規則はその上に載る（MUST）'

const THE_ROWS_ARE_NOT_REWRITTEN_BY_MOVEMENT =
  '対象外 は命令の種類で決まる分類であり、本規則はその上に載る（MUST） —— **種類が「段を積みうるか」を決め、値が動いたかが「実際に積むか」を決める。**⛔ **本表の行を、動いたかどうかで書き換えてはならない（MUST NOT）'

const CLAUSES: ReadonlyArray<readonly [string, string]> = [
  ['a write that moved no value leaves no 段', NO_VALUE_MOVED_NO_STEP],
  ['the rule sits on top of table T-027', THE_RULE_SITS_ON_TOP_OF_THE_TABLE],
  ['the rows are not rewritten by movement', THE_ROWS_ARE_NOT_REWRITTEN_BY_MOVEMENT],
]

describe("the clauses this file holds are still the manuscript's own words", () => {
  it.each(CLAUSES)('%s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// see T-206, S-94
const S_94 = Number.parseInt(
  bare(rowOf('T-206', 'S-94').by['既定'] ?? '').replace(/[^\d]/g, ''),
  10,
)

const MB_FACTOR = (() => {
  const said = /1\s*MB\s*=\s*(\d+)\s*×\s*(\d+)\s*バイト/.exec(
    rowOf('T-206', 'S-95').by['保存しない理由'] ?? '',
  )
  if (said === null) {
    throw new Error('table T-206 row S-95: its remark no longer states what one MB is')
  }
  return Number.parseInt(said[1] ?? '', 10) * Number.parseInt(said[2] ?? '', 10)
})()

// see T-108, CM-9
const CM_9 = bare(rowOf('T-108', 'CM-9').by['確定名'] ?? '')

// see T-108, CM-67
const CM_67 = bare(rowOf('T-108', 'CM-67').by['確定名'] ?? '')

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)

function templateDocument(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) {
    throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

const START = templateDocument()
const STARTED_JSON = JSON.stringify(START)
// see FR-031
const STEP_BYTES = Buffer.byteLength(STARTED_JSON, 'utf8')

const FIRST_TASK_UID = START.schedule.tasks[0]?.uid ?? 0
const FIRST_TASK_NAME = START.schedule.tasks[0]?.name ?? ''

// see T-108, CM-67
const HELD_ROW_TITLE_WIDTH = START.documentSettings.rowTitlePanelWidth
const HELD_PROPERTY_WIDTH = START.documentSettings.propertyPanelWidth

// see T-060, LY-5
const SETTINGS_LIMITS: SettingsLimits = {
  zoomMin: 0.02,
  zoomMax: 64,
  rowAreaWidthWithoutPanels: 982,
}

// see T-206, S-94, S-95
const REAL_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * MB_FACTOR,
}

interface Bench {
  held: HeldDocument
  write(command: DocumentCommand): ApplyOutcome
  depth(): number
  json(): string
  accepted(): number
}

function bench(limits: HistoryLimits = REAL_LIMITS): Bench {
  let held: HeldDocument = { document: START, history: emptyHistory<ChangeStep>() }
  let writes = 0
  let taken = 0

  const holder: DocumentHolder = {
    read: () => held,
    replace: (next) => {
      held = next
    },
  }
  const audience: ChangeAudience = { deliver: () => {} }

  return {
    get held() {
      return held
    },
    write: (command) => {
      writes += 1
      const outcome = applyDocumentChange(
        {
          readStamp: held.document.documentStamp,
          commands: [command],
          moment: { gestureInFlight: false, editingInPlace: false, deliveringNotices: false },
          historyLimits: limits,
          settingsLimits: SETTINGS_LIMITS,
          editedBy: 'the case at the keyboard',
          // see FR-063
          updatedUtc: new Date(Date.UTC(2026, 8, 8, 0, 0, 0) + writes * 1000)
            .toISOString()
            .replace(/\.\d{3}Z$/, 'Z'),
        },
        holder,
        audience,
      )
      if (!outcome.accepted) {
        throw new Error(`write ${writes} was refused: ${JSON.stringify(outcome.refusal)}`)
      }
      taken += 1
      return outcome
    },
    depth: () => stepCount(held.history),
    json: () => JSON.stringify(held.document),
    accepted: () => taken,
  }
}

// WHY: no counter here -- each caller names its own value at the call site;
// WHY: a shared counter masked a same-value repeat as new in this file's sibling.
const nameTask = (name: string): DocumentCommand =>
  ({ kind: CM_9, uid: FIRST_TASK_UID, name }) as unknown as DocumentCommand

// see FR-052
const setPanelWidths = (rowTitle: number, property: number): DocumentCommand =>
  ({
    kind: CM_67,
    rowTitlePanelWidth: rowTitle,
    propertyPanelWidth: property,
  }) as unknown as DocumentCommand

describe('FR-031 -- 書き込みが文書の値を 1 つも変えなかったとき', () => {
  it('THE CONTROL: a 対象 write that MOVES a value leaves exactly one 段', () => {
    const one = bench()
    const before = one.json()

    one.write(nameTask('a name the bundled document does not hold'))

    expect(one.json(), 'the write really did move a value').not.toBe(before)
    expect(one.depth()).toBe(1)
  })

  it('the SAME write repeated writes the value already held, and leaves no 段', () => {
    const one = bench()
    const value = 'the one and only value this case writes'

    one.write(nameTask(value))
    const afterTheRealEdit = one.json()
    expect(afterTheRealEdit, 'the first write moved a value').not.toBe(STARTED_JSON)
    expect(one.depth(), 'the first write pushed its 段').toBe(1)

    one.write(nameTask(value))

    expect(one.json(), 'the second write moved nothing').toBe(afterTheRealEdit)
    expect(one.depth(), 'and so left no 段').toBe(1)
    expect(one.accepted(), 'both writes were accepted, not refused').toBe(2)
  })

  it('the depth does not grow across several such writes', () => {
    const one = bench()
    const value = 'written once, then written again seven times'

    one.write(nameTask(value))
    const afterTheRealEdit = one.json()
    expect(one.depth()).toBe(1)

    for (let i = 1; i <= 7; i += 1) {
      one.write(nameTask(value))
      expect(one.json(), `repeat ${i} moved nothing`).toBe(afterTheRealEdit)
      expect(one.depth(), `repeat ${i} left no 段`).toBe(1)
    }
    expect(one.accepted(), 'eight accepted writes, one 段').toBe(8)
  })
})

describe('FR-031 / 表 T-027 -- 種類と、値が動いたかの、四つの組み合わせ', () => {
  it('UN-16 / CM-67: a 対象外 kind pushes no 段 EVEN WHEN the value moves', () => {
    const one = bench()
    const before = one.json()

    one.write(setPanelWidths(HELD_ROW_TITLE_WIDTH + 30, HELD_PROPERTY_WIDTH + 30))

    expect(one.json(), 'the 対象外 command really did move a value').not.toBe(before)
    expect(one.held.document.documentSettings.rowTitlePanelWidth).toBe(
      HELD_ROW_TITLE_WIDTH + 30,
    )
    expect(one.depth()).toBe(0)
  })

  it('UN-16 / CM-67: a 対象外 kind that moves nothing pushes no 段 either', () => {
    const one = bench()
    const before = one.json()

    one.write(setPanelWidths(HELD_ROW_TITLE_WIDTH, HELD_PROPERTY_WIDTH))

    expect(one.json(), 'the write moved nothing').toBe(before)
    expect(one.depth()).toBe(0)
  })

  it('UN-3 / CM-9: a 対象 kind that moves nothing pushes no 段, and the row stays 対象', () => {
    const one = bench()

    one.write(nameTask(FIRST_TASK_NAME))
    expect(one.json(), 'writing the held name moved nothing').toBe(STARTED_JSON)
    expect(one.depth(), 'so it left no 段').toBe(0)

    one.write(nameTask('and now a name that is genuinely different'))
    expect(one.json()).not.toBe(STARTED_JSON)
    expect(one.depth(), 'the same kind still earns its 段 when it moves a value').toBe(1)
  })
})

describe('FR-031 -- 取り消しが空振りしないこと', () => {
  it('after a real edit and then a no-op write, ONE undo returns to before the real edit', () => {
    const one = bench()
    const value = 'the edit the person actually made'

    one.write(nameTask(value))
    const afterTheRealEdit = one.json()
    expect(afterTheRealEdit).not.toBe(STARTED_JSON)

    one.write(nameTask(value))
    expect(one.json(), 'the second write moved nothing').toBe(afterTheRealEdit)

    const back = undoEdit(one.held)

    expect(back.undone, 'one undo was available').toBe(true)
    expect(JSON.stringify(back.next.document), 'the one undo did not swing at nothing').not.toBe(
      afterTheRealEdit,
    )
    expect(JSON.stringify(back.next.document)).toBe(STARTED_JSON)
  })
})

describe('FR-031 -- 戻す先を持たない段が S-94 / S-95 を食わないこと', () => {
  it('S-94: no-op writes do not push the oldest real 段 off the end', () => {
    const one = bench()
    for (let i = 1; i <= S_94; i += 1) one.write(nameTask(`real edit number ${i}`))
    expect(one.depth(), 'S-94 real writes fill the 段数 budget').toBe(S_94)

    const afterTheRealEdits = one.json()
    for (let i = 1; i <= 10; i += 1) one.write(nameTask(`real edit number ${S_94}`))
    expect(one.json(), 'not one of the ten moved a value').toBe(afterTheRealEdits)
    expect(one.depth(), 'and not one of them took a 段').toBe(S_94)

    let held = one.held
    for (let i = 1; i <= S_94; i += 1) {
      const back = undoEdit(held)
      expect(back.undone, `undo ${i} of ${S_94}`).toBe(true)
      held = back.next
    }
    expect(
      JSON.stringify(held.document),
      'S-94 undos still reach the document the writes started from',
    ).toBe(STARTED_JSON)
  })

  it('S-95: no-op writes do not push the oldest real 段 out of the memory budget', () => {
    const one = bench({ maxSteps: S_94, maxTotalSizeBytes: STEP_BYTES * 3 })

    one.write(nameTask('the first real edit under a narrow memory budget'))
    one.write(nameTask('the second real edit under a narrow memory budget'))
    const settled = one.depth()
    expect(settled, 'both real 段 fit inside three documents of budget').toBe(2)

    const afterTheRealEdits = one.json()
    for (let i = 1; i <= 10; i += 1) {
      one.write(nameTask('the second real edit under a narrow memory budget'))
    }
    expect(one.json(), 'not one of the ten moved a value').toBe(afterTheRealEdits)
    expect(one.depth(), 'and the memory budget lost nothing to them').toBe(settled)

    let held = one.held
    for (let i = 1; i <= settled; i += 1) {
      const back = undoEdit(held)
      expect(back.undone, `undo ${i} of ${settled}`).toBe(true)
      held = back.next
    }
    expect(JSON.stringify(held.document)).toBe(STARTED_JSON)
  })
})
