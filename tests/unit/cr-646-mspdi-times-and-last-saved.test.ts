// CR-646 X-5..X-7 and the MSPDI half of X-9: what MSPDI carries in and writes out (EX-11, EX-12, DV-12, NR-7, FR-021, IV-23).

import { afterEach, describe, expect, it, vi } from 'vitest'

import { documentFromMspdi, mspdiFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { dayOf } from '../../src/entity/document-model/schedule/schedule'
import { editDocument, type SettingsLimits } from '../../src/use-case/edit-document/edit-document'
import { specTable } from '../contract/spec-table'
import {
  DESIGN,
  ERD_DETAIL,
  S_482,
  S_483,
  april,
  asDocument,
  elementTexts,
  mspdiTask,
  mspdiText,
  projectLevelOf,
  published,
  taskElementOf,
  taskOf,
  taskRow,
} from './cr-646-stage'

afterEach(() => {
  vi.useRealTimers()
})

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }

/** @purity pure */
function read(text: string): Document {
  const result = documentFromMspdi(text, asDocument())
  if (!result.ok) throw new Error(`premise: the MSPDI was refused: ${JSON.stringify(result.faults).slice(0, 400)}`)
  return result.document
}

/** @purity pure */
function written(document: Document): string {
  return mspdiFromDocument(document).text
}

const MANUAL = (start: string, finish: string): string =>
  `<Manual>1</Manual><ManualStart>${start}</ManualStart><ManualFinish>${finish}</ManualFinish><ManualDuration>PT40H0M0S</ManualDuration>`

const CREATED = '2025-12-01T09:15:00'
const SAVED_BY_THE_SOURCE = '2025-12-02T10:20:30'

/** @purity pure */
function sourceText(afterCalendarUid = ''): string {
  return mspdiText({
    projectLeaves: `<CreationDate>${CREATED}</CreationDate><LastSaved>${SAVED_BY_THE_SOURCE}</LastSaved>`,
    afterCalendarUid,
    tasks:
      mspdiTask(1, '2026-04-06T08:00:00', '2026-04-10T17:00:00', MANUAL('2026-04-06T08:00:00', '2026-04-10T17:00:00')) +
      mspdiTask(2, '2026-04-13T08:00:00', '2026-04-17T17:00:00'),
  })
}

/** @purity pure */
function withDatesEdited(document: Document): Document {
  const result = editDocument(
    document,
    { kind: 'setTaskPlanDates', uid: 1, start: april(7, S_482), finish: april(14, S_483) },
    LIMITS,
    'Row',
  )
  if (!result.ok) throw new Error(`premise: the date edit was refused: ${JSON.stringify(result.refusals)}`)
  return result.document
}

describe('CR-646 the manuscript as these cases read it', () => {
  it('NR-7 (T-228): Project/LastSaved is dropped from both sides before NR-1', () => {
    const row = specTable('T-228').rows.find((one) => one.id === 'NR-7')
    expect(row?.cells.join(' | ')).toContain('`Project/LastSaved` を落とす')
  })

  it('DV-12 (T-059): LastSaved is made at export, local time without a zone, to the second', () => {
    expect(ERD_DETAIL).toContain('| DV-12 | `Project` | `lastSaved` | `Project/LastSaved` | 書き出すその瞬間の、その場所の時刻（帯を持たず秒まで）')
  })

  it('IV-23 (T-220): every Task is pointed at by exactly one TaskVisual', () => {
    expect(DESIGN).toContain('| IV-23 | どの `Task` も、ちょうど 1 つの `TaskVisual` から指されること。')
  })
})

describe('X-5 EX-11 / EX-12: the constraint and the manual dates repeat the written Start / Finish', () => {
  it('EX-11: a GRS-made task exports ConstraintDate equal to its Start, time included', () => {
    const document = asDocument({ tasks: [taskRow(1, { start: april(6, S_482), finish: april(10, S_483) })] })
    const task = taskElementOf(written(document), 1)
    expect(elementTexts(task, 'Start')[0], 'premise: Start was written at the start-side time').toBe(april(6, S_482))
    expect(elementTexts(task, 'ConstraintDate')).toEqual(elementTexts(task, 'Start'))
  })

  it('EX-11: a date-edited imported task exports ConstraintDate equal to its new Start', () => {
    const task = taskElementOf(written(withDatesEdited(read(sourceText()))), 1)
    expect(elementTexts(task, 'Start')[0], 'premise: the edited Start was written').toBe(april(7, S_482))
    expect(elementTexts(task, 'ConstraintDate')).toEqual([april(7, S_482)])
  })

  it('EX-12: a date-edited imported task exports ManualStart equal to its written Start', () => {
    const task = taskElementOf(written(withDatesEdited(read(sourceText()))), 1)
    expect(elementTexts(task, 'ManualStart')).toEqual(elementTexts(task, 'Start'))
  })

  it('EX-12: a date-edited imported task exports ManualFinish equal to its written Finish', () => {
    const task = taskElementOf(written(withDatesEdited(read(sourceText()))), 1)
    expect(elementTexts(task, 'Finish')[0], 'premise: the edited Finish was written').toBe(april(14, S_483))
    expect(elementTexts(task, 'ManualFinish')).toEqual(elementTexts(task, 'Finish'))
  })
})

describe('X-6 DV-12 / NR-7 / FR-101: LastSaved is made at export and never held', () => {
  const NOW = new Date(2026, 9, 3, 14, 5, 6)
  const NOW_TEXT = '2026-10-03T14:05:06'

  it('DV-12: the exported LastSaved is the local instant of the export, without a zone, to the second', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    const document = asDocument({ tasks: [taskRow(1)] })
    expect(elementTexts(projectLevelOf(written(document)), 'LastSaved')).toEqual([NOW_TEXT])
  })

  it('DV-12 / FR-021: an imported LastSaved is not carried -- the export writes its own, once', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    expect(elementTexts(projectLevelOf(written(read(sourceText()))), 'LastSaved')).toEqual([NOW_TEXT])
  })

  it('FR-101 / AT-11 retired: the document read from MSPDI holds no lastSaved column', () => {
    const project = read(sourceText()).schedule.project as unknown as Record<string, unknown>
    expect(Object.keys(project)).not.toContain('lastSaved')
  })

  it('FR-021: the document read from MSPDI holds no LastSaved in its carry', () => {
    const project = read(sourceText()).schedule.project as unknown as Record<string, unknown>
    expect(JSON.stringify([project['carry'], project['carryElements']])).not.toContain('LastSaved')
  })

  it('NR-7: two exports of one document differ only in LastSaved', () => {
    const document = read(sourceText())
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    const first = written(document)
    vi.setSystemTime(new Date(2026, 9, 4, 9, 0, 0))
    const second = written(document)
    expect(first, 'premise: LastSaved moved with the clock').not.toBe(second)
    const dropped = (text: string): string => text.replace(/<LastSaved>[^<]*<\/LastSaved>/g, '')
    expect(dropped(first)).toBe(dropped(second))
  })
})

describe('X-7 FR-021 / AT-154 / AT-155: the two default times round-trip at their XSD place', () => {
  const TIMES = '<DefaultStartTime>09:00:00</DefaultStartTime><DefaultFinishTime>18:00:00</DefaultFinishTime>'

  it('AT-154: DefaultStartTime is read into Project.defaultStartTime', () => {
    expect(read(sourceText(TIMES)).schedule.project).toMatchObject({ defaultStartTime: '09:00:00' })
  })

  it('AT-155: DefaultFinishTime is read into Project.defaultFinishTime', () => {
    expect(read(sourceText(TIMES)).schedule.project).toMatchObject({ defaultFinishTime: '18:00:00' })
  })

  it('FR-021: a well-formed default time is not also kept in the carry', () => {
    const project = read(sourceText(TIMES)).schedule.project as unknown as Record<string, unknown>
    expect(JSON.stringify([project['carry'], project['carryElements']])).not.toMatch(/DefaultStartTime|DefaultFinishTime/)
  })

  it('FR-021 / EX-10: the export writes DefaultStartTime once, right after CalendarUID', () => {
    const project = projectLevelOf(written(read(sourceText(TIMES))))
    expect(elementTexts(project, 'DefaultStartTime')).toEqual(['09:00:00'])
    expect(project).toMatch(/<CalendarUID>[^<]*<\/CalendarUID>\s*<DefaultStartTime>09:00:00<\/DefaultStartTime>\s*<DefaultFinishTime>18:00:00<\/DefaultFinishTime>\s*<MinutesPerDay>/)
  })

  it('WT-1 / AT-154: a date the person edits in that document is written at its default start time', () => {
    const document = read(sourceText(TIMES))
    const day = (published('textOfStartSide') as (d: unknown, p: unknown) => string)(
      dayOf('2026-04-08'),
      document.schedule.project,
    )
    expect(day).toBe('2026-04-08T09:00:00')
  })

  it('AT-154 / EX-4: a default time not in the xsd:time spelling stays in the carry and leaves the column null', () => {
    const document = read(sourceText('<DefaultStartTime>8:00</DefaultStartTime>'))
    const project = document.schedule.project as unknown as Record<string, unknown>
    expect(project['defaultStartTime']).toBeNull()
    expect(JSON.stringify([project['carry'], project['carryElements']])).toContain('8:00')
  })

  it('FR-021 / EX-4: the carried 8:00 is written back once, as it came', () => {
    const project = projectLevelOf(written(read(sourceText('<DefaultStartTime>8:00</DefaultStartTime>'))))
    expect(elementTexts(project, 'DefaultStartTime')).toEqual(['8:00'])
  })

  it('AT-154 / S-482: with the column null the start side falls back to S-482', () => {
    const document = read(sourceText('<DefaultStartTime>8:00</DefaultStartTime>'))
    expect(published('defaultStartTimeOf')(document.schedule.project)).toBe(S_482)
  })
})

describe('X-9 IV-23 (MSPDI half) and WT-9 / WT-10 for an imported created', () => {
  it('IV-23 / K-3: a document read from MSPDI holds exactly one TaskVisual per Task', () => {
    const document = read(sourceText())
    const uids = document.schedule.tasks.map((one) => one.uid).sort()
    expect(uids.length, 'premise: the two tasks were read').toBe(2)
    expect(document.schedule.taskVisuals.map((one) => one.taskUid).sort()).toEqual(uids)
  })

  it('IV-23: the TaskVisual made for an imported task decides nothing -- everything but taskUid is null', () => {
    const visual = read(sourceText()).schedule.taskVisuals.find((one) => one.taskUid === 2)
    expect(visual).toEqual({
      taskUid: 2,
      shapeKind: null,
      milestoneGlyph: null,
      fillColor: null,
      strokeColor: null,
      strokeWidthPx: null,
    })
  })

  it('WT-10 / WT-9: an imported CreationDate is kept as Project.created', () => {
    expect(read(sourceText()).schedule.project.created).toBe(CREATED)
  })

  it('WT-10: the kept CreationDate is written back as it came', () => {
    expect(elementTexts(projectLevelOf(written(read(sourceText()))), 'CreationDate')).toEqual([CREATED])
  })

  it('WT-10: the imported task values nobody edited are written back with their spelling', () => {
    const task = taskElementOf(written(read(sourceText())), 2)
    expect([elementTexts(task, 'Start')[0], elementTexts(task, 'Finish')[0]]).toEqual(['2026-04-13T08:00:00', '2026-04-17T17:00:00'])
    expect(taskOf(read(sourceText()), 2).finish).toBe('2026-04-17T17:00:00')
  })
})
