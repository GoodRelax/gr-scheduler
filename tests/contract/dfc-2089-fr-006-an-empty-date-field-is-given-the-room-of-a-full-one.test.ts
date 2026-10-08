// DFC-2089 spec-only cases: FR-006 / S-199 -- a date field with no value is given at least the room a date needs, so the host's date shape and its calendar button are not cut.

import { describe, expect, it } from 'vitest'

import type { PropertyControl } from '../../src/adapter/screen-renderer/screen-renderer'
import { bare, specTable } from './spec-table'
import { REQUIREMENTS, T_016, documentOf, fieldOf, panelOf, taskItem, taskOf } from './cr-606-stage'

// see FR-006
const FR_006_DATE_IS_WIDER = '日付の入力は値より広いので、上の「要る幅」を割らない。'
const FR_006_NO_NARROWER = '⛔ 1 つの操作子に、その値を出すのに要る幅より狭い幅を割ってはならない（MUST NOT）'
const FR_006_DATE_AID = '`date` の欄は宿主が暦を開く釦を内側に置くので、値が入るだけの幅では全桁が見えない。'

const numberIn = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}
const settingOf = (table: string, id: string, heading: string): number => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return numberIn(row.by[heading] ?? '')
}

// see S-30, S-199, FR-093
const LABEL_COEF = settingOf('T-201', 'S-30', '既定値')
const BEYOND_THE_VALUE = settingOf('T-206', 'S-199', '既定')

// WHY: the host draws an empty date control in the shape yyyy/mm/dd (JDG-1491), ten half-width units at FR-093's count of one each.
const DATE_SHAPE_UNITS = 'yyyy/mm/dd'.length
const SHAPE_ROOM = DATE_SHAPE_UNITS * LABEL_COEF + BEYOND_THE_VALUE

// WHY: the date rows a plain task shows, each named by the one column table T-016 gives it.
const DATE_ROWS = T_016.filter(
  (one) =>
    (one.appliesTo ?? 'Task') === 'Task' &&
    one.inputKinds.includes('日付') &&
    one.columns.length === 1 &&
    one.shownFor !== 'milestone',
).map((one) => one.id)

const EMPTY = taskOf(1, { deadline: null, actualStart: null, actualFinish: null, resume: null, resumeValid: null })
const FULL = taskOf(2, {
  deadline: '2026-05-01T00:00:00',
  actualStart: '2026-04-07T08:00:00',
  actualFinish: '2026-04-09T17:00:00',
  resume: '2026-04-20T08:00:00',
  resumeValid: true,
})
const DOCUMENT = documentOf({ tasks: [EMPTY, FULL] })

const dateControlOf = (uid: number, row: string): PropertyControl => {
  const controls = fieldOf(panelOf(DOCUMENT, taskItem(uid)), row).controls.filter((one) => one.kind === 'date')
  if (controls.length !== 1) throw new Error(`premise: row ${row} of task ${uid} draws one date control, got ${controls.length}`)
  return controls[0] as PropertyControl
}

describe('DFC-2089 premise -- the clauses these cases press still stand', () => {
  it.each([FR_006_DATE_IS_WIDER, FR_006_NO_NARROWER, FR_006_DATE_AID])('01-04 holds %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('a plain task shows the date rows these cases look at', () => {
    expect([...DATE_ROWS].sort()).toEqual(['PR-10', 'PR-3', 'PR-4', 'PR-47', 'PR-6', 'PR-7'].sort())
  })
})

describe(`FR-006 / S-199 -- ${FR_006_DATE_IS_WIDER}`, () => {
  it.each(DATE_ROWS)('%s: the field with a value gets at least the room of the date shape plus S-199', (row) => {
    expect(dateControlOf(2, row).widthInFontSizes, FR_006_DATE_AID).toBeGreaterThanOrEqual(SHAPE_ROOM)
  })

  it.each(DATE_ROWS)('%s: the field with no value gets at least the room of the date shape plus S-199', (row) => {
    expect(dateControlOf(1, row).widthInFontSizes, `${FR_006_NO_NARROWER} -- ${FR_006_DATE_AID}`).toBeGreaterThanOrEqual(SHAPE_ROOM)
  })

  it.each(DATE_ROWS)('%s: the field with no value is no narrower than the same field with a value', (row) => {
    expect(dateControlOf(1, row).widthInFontSizes).toBeGreaterThanOrEqual(dateControlOf(2, row).widthInFontSizes)
  })
})
