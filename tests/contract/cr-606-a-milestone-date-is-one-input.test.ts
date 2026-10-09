// CR-606 spec-only cases: a milestone's planned date and actual date are ONE input each (T-016 oneInput);

import { describe, expect, it } from 'vitest'

import type { PropertyControl } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { editDocument, type DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'
import {
  PROPERTY_ITEMS_TABLE,
  REQUIREMENTS,
  T_016,
  commandsOf,
  documentOf,
  fieldOf,
  panelOf,
  recordOf,
  taskItem,
  taskOf,
  visualOf,
} from './cr-606-stage'

// see PR-35, PR-36
const PLANNED_ONE_INPUT = '1 つの入力で `start` と `finish` へ同じ日を書く（表 T-108 の `CM-11`）'
const ACTUAL_ONE_INPUT =
  '1 つの入力で `actualStart` と `actualFinish` へ同じ日を書き、表 T-019 の `PA-5`（完了）に置く。'
const ACTUAL_EMPTIED = '空にしたときは両方を空にして `PA-1`（未着手）に置く（どちらも 表 T-108 の `CM-13`）'
const PLANNED_EMPTIED = '空のまま確定したときの扱いは `FR-006` の `start` ／ `finish` の欄と同じ'
// see FR-006
const FR_006_EMPTIED =
  '空のまま確定したときは、`start` ／ `finish` の欄なら何も書かずに欄を元の値へ戻し、それ以外の日付の欄なら `null` を書くこと（MUST）'

const DAY_KIND = '日付'

describe('CR-606 premise -- the clauses these cases quote still stand', () => {
  it.each([PLANNED_ONE_INPUT, ACTUAL_ONE_INPUT, ACTUAL_EMPTIED, PLANNED_EMPTIED])('table T-016 holds %s', (clause) => {
    expect(PROPERTY_ITEMS_TABLE).toContain(clause)
  })

  it('FR-006 holds the emptied-date rule', () => {
    expect(REQUIREMENTS).toContain(FR_006_EMPTIED)
  })
})

// see T-016
const ONE_INPUT_ROWS = T_016.filter((one) => one.oneInput === true)
const rowOfColumns = (columns: readonly string[]): string => {
  const found = ONE_INPUT_ROWS.find((one) => one.columns.join(',') === columns.join(','))
  if (found === undefined) throw new Error(`T-016 has no oneInput row over ${columns.join(' / ')}`)
  return found.id
}
const PLANNED_ROW = rowOfColumns(['start', 'finish'])
const ACTUAL_ROW = rowOfColumns(['actualStart', 'actualFinish'])

const OPEN = 1
const DONE = 2
const SAME_DAY = '2026-04-08T08:00:00'

const MILESTONES = documentOf({
  tasks: [
    taskOf(OPEN, { milestone: true, start: SAME_DAY, finish: SAME_DAY }),
    taskOf(DONE, {
      milestone: true,
      start: SAME_DAY,
      finish: SAME_DAY,
      actualStart: SAME_DAY,
      actualFinish: SAME_DAY,
      percentComplete: 100,
    }),
  ],
  visuals: [
    visualOf(OPEN, { shapeKind: 'milestone', milestoneGlyph: 'diamond' }),
    visualOf(DONE, { shapeKind: 'milestone', milestoneGlyph: 'diamond' }),
  ],
})

const theOneInputOf = (document: Document, uid: number, row: string): PropertyControl => {
  const field = fieldOf(panelOf(document, taskItem(uid)), row)
  expect(field.controls, `${row} draws one input`).toHaveLength(1)
  return field.controls[0] as PropertyControl
}

const committed = (uid: number, row: string, text: string): readonly DocumentCommand[] => {
  const control = theOneInputOf(MILESTONES, uid, row)
  return commandsOf(MILESTONES, { row, key: control.key, text })
}

const dayPart = (value: unknown): string => String(value).slice(0, 10)

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

describe('T-016 oneInput -- the manuscript rows', () => {
  it('two oneInput rows, each with exactly one input kind, a date, shown for milestones', () => {
    expect(ONE_INPUT_ROWS.map((one) => one.id).sort()).toEqual([PLANNED_ROW, ACTUAL_ROW].sort())
    for (const item of ONE_INPUT_ROWS) {
      expect(item.inputKinds, item.id).toEqual([DAY_KIND])
      expect(item.shownFor, item.id).toBe('milestone')
    }
  })

  it.each([
    ['planned', PLANNED_ROW],
    ['actual', ACTUAL_ROW],
  ] as const)('the %s date of a milestone is one date input', (_name, row) => {
    expect(theOneInputOf(MILESTONES, OPEN, row).kind).toBe('date')
  })
})

describe(`T-016 ${PLANNED_ROW} -- ${PLANNED_ONE_INPUT}`, () => {
  const DAY = '2026-04-24'

  it('one CM-11 setTaskPlanDates with start = finish on the typed day', () => {
    const commands = committed(OPEN, PLANNED_ROW, DAY)
    expect(commands.map((one) => recordOf(one)['kind'])).toEqual(['setTaskPlanDates'])
    const command = recordOf(commands[0] as DocumentCommand)
    expect(command['uid']).toBe(OPEN)
    expect(command['start']).toBe(command['finish'])
    expect(dayPart(command['start'])).toBe(DAY)
  })

  it('the command is accepted and leaves the milestone on one day', () => {
    const command = committed(OPEN, PLANNED_ROW, DAY)[0] as DocumentCommand
    const result = editDocument(MILESTONES, command, LIMITS, 'row')
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) return
    const task = result.document.schedule.tasks.find((one) => one.uid === OPEN)
    expect(dayPart(task?.start)).toBe(DAY)
    expect(task?.start).toBe(task?.finish)
  })

  it(`${PLANNED_EMPTIED} -- ${FR_006_EMPTIED}: emptied, nothing is written`, () => {
    expect(committed(OPEN, PLANNED_ROW, '')).toEqual([])
  })
})

describe(`T-016 ${ACTUAL_ROW} -- ${ACTUAL_ONE_INPUT}`, () => {
  const DAY = '2026-04-15'

  it('one CM-13 setTaskPlanActualState at PA-5 with actualStart and actualFinish on the typed day', () => {
    const commands = committed(OPEN, ACTUAL_ROW, DAY)
    expect(commands.map((one) => recordOf(one)['kind'])).toEqual(['setTaskPlanActualState'])
    const command = recordOf(commands[0] as DocumentCommand)
    expect(command['uid']).toBe(OPEN)
    const place = command['place'] as Readonly<Record<string, unknown>>
    expect(place['row']).toBe('PA-5')
    expect(dayPart(place['actualStart'])).toBe(DAY)
    expect(dayPart(place['actualFinish'])).toBe(DAY)
  })

  it('a milestone already done moves to the new day, still PA-5', () => {
    const commands = committed(DONE, ACTUAL_ROW, DAY)
    expect(commands.map((one) => recordOf(one)['kind'])).toEqual(['setTaskPlanActualState'])
    const place = recordOf(commands[0] as DocumentCommand)['place'] as Readonly<Record<string, unknown>>
    expect(place['row']).toBe('PA-5')
    expect(dayPart(place['actualStart'])).toBe(DAY)
    expect(dayPart(place['actualFinish'])).toBe(DAY)
  })

  it(`${ACTUAL_EMPTIED} -- emptied on a done milestone: CM-13 at PA-1`, () => {
    const commands = committed(DONE, ACTUAL_ROW, '')
    expect(commands.map((one) => recordOf(one)['kind'])).toEqual(['setTaskPlanActualState'])
    const command = recordOf(commands[0] as DocumentCommand)
    expect(command['uid']).toBe(DONE)
    expect((command['place'] as Readonly<Record<string, unknown>>)['row']).toBe('PA-1')
  })

  it('the PA-5 command is accepted and leaves actualStart and actualFinish on one day', () => {
    const command = committed(OPEN, ACTUAL_ROW, DAY)[0] as DocumentCommand
    const result = editDocument(MILESTONES, command, LIMITS, 'row')
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) return
    const task = result.document.schedule.tasks.find((one) => one.uid === OPEN)
    expect(dayPart(task?.actualStart)).toBe(DAY)
    expect(dayPart(task?.actualFinish)).toBe(DAY)
  })
})
