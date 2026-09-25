// CR-376: the last actual day is a stored date (stop / actualFinish); edits, the invariant and the right edge read it.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  scheduleViolations,
  type Schedule,
  type Task,
} from '../../src/entity/document-model/schedule/schedule'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { editTask, type EditResult } from '../../src/use-case/edit-document/edit-document'
import { specTable } from '../contract/spec-table'

const DEFAULT_ROW_NAME_FIXTURE = 'fixture default row name'

const cellOf = (tableId: string, rowId: string, heading: string): string => {
  const row = specTable(tableId).rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  const cell = row.by[heading]
  if (cell === undefined) throw new Error(`table ${tableId} has no ${heading}; it has ${Object.keys(row.by).join(', ')}`)
  return cell
}

// see S-106
const isWorkedDay = (iso: string): boolean => {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return weekday !== 0 && weekday !== 6
}

const ymd = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}`
const stored = (iso: string): string => `${iso}T00:00:00`
const dayPart = (value: string | null | undefined): string | null =>
  value === null || value === undefined ? null : value.slice(0, 10)

const S_129 = SETTINGS_DEFAULTS['actualInitialDuration'] as number

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown>) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return { ...out, ...part } as unknown as DocumentSettings
}

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    uid: 1,
    wbsParentUid: null,
    wbsOrder: null,
    name: 'Design',
    start: stored(ymd(5)),
    finish: stored(ymd(30)),
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...part,
  }) as unknown as Task

const scheduleWith = (tasks: readonly Task[]): Schedule =>
  ({
    project: {
      title: 'CR-376',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      minutesPerDay: null,
      themeHue: 214,
      uidHighWaterMark: 10,
      importSeq: 0,
      revision: 1,
      carry: {},
      carryElements: [],
    },
    calendars: [],
    tasks,
    resources: [],
    assignments: [],
    taskGroups: [
      { id: 'g1', parentId: null, label: 'row', derivedFromTaskUid: null, order: 0, treeState: 'auto', color: null, height: null },
    ],
    taskGroupMembers: tasks.map((one) => ({ taskUid: one.uid, groupId: 'g1', stackOrder: null })),
    taskVisuals: tasks.map((one) => ({
      taskUid: one.uid,
      shapeKind: 'rectangle',
      milestoneGlyph: null,
      fillColor: null,
      strokeColor: null,
      lineWeight: null,
    })),
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const documentWith = (task: Task): Document =>
  ({
    schemaVersion: '1',
    schedule: scheduleWith([task]),
    documentSettings: settingsOf(),
    documentStamp: {
      scheduleUpdatedUtc: '2026-09-14T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-09-14T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const accepted = (result: EditResult): Task => {
  if (!result.ok) throw new Error(result.refusals.map((one) => `${one.rule}: ${one.what}`).join('; '))
  const found = result.document.schedule.tasks.find((one) => one.uid === 1)
  if (found === undefined) throw new Error('Task 1 left the document')
  return found
}

const pressed = (task: Task): EditResult => editTask(documentWith(task), { kind: 'cycleTaskPlanActualState', uid: 1, remembered: null }, DEFAULT_ROW_NAME_FIXTURE)

describe('CR-376 premises read from the manuscript', () => {
  it('the default calendar works Monday to Friday, S-129 is 1, and the chosen days fall as named', () => {
    const worked = cellOf('T-209', 'S-106', '値')
    for (const weekday of ['月', '火', '水', '木', '金']) expect(worked).toContain(weekday)
    for (const weekend of ['土', '日']) expect(worked).not.toContain(weekend)
    expect(S_129).toBe(1)
    expect(isWorkedDay(ymd(9))).toBe(true)
    expect(isWorkedDay(ymd(10))).toBe(false)
    expect(isWorkedDay(ymd(11))).toBe(false)
    expect(isWorkedDay(ymd(12))).toBe(true)
  })

  it('T-019 has a stop column, and T-021a PV-2 / PV-3 name stop and actualFinish', () => {
    expect(specTable('T-019').headings).toContain('`stop`')
    expect(cellOf('T-021a', 'PV-2', '置く値')).toContain('`actualFinish` ＝ `stop`')
    expect(cellOf('T-021a', 'PV-3', '置く値')).toContain('`stop` ＝ それまでの `actualFinish`')
    expect(cellOf('T-220', 'IV-21', '不変条件')).toContain('`stop`')
  })
})

describe('T-021a PV-1: not started -> in progress', () => {
  // WHY: CR-430 lengthened the cycle, so `PV-1` writes the floor day to `stop`
  // and leaves `actualFinish` to `PV-2`; the day stays a date, never moved on.
  it('writes stop on the floor day (actualStart itself when S-129 is 1) and leaves actualFinish empty', () => {
    const task = accepted(pressed(taskOf({ start: stored(ymd(9)) })))
    expect(dayPart(task.actualStart)).toBe(ymd(9))
    expect(dayPart(task.stop)).toBe(ymd(9))
    expect(task.actualFinish).toBeNull()
    expect(task.resumeValid).toBe(true)
  })

  it('on a Saturday plan start the stop day is that Saturday, not the next worked day', () => {
    const task = accepted(pressed(taskOf({ start: stored(ymd(10)) })))
    expect(dayPart(task.actualStart)).toBe(ymd(10))
    expect(dayPart(task.stop)).toBe(ymd(10))
    expect(task.actualFinish).toBeNull()
  })
})

describe('T-021a PV-2 / PV-3: the last day moves between stop and actualFinish in one replacement', () => {
  it('PV-2 moves a Saturday stop into actualFinish unchanged and empties stop', () => {
    const task = accepted(
      pressed(taskOf({ actualStart: stored(ymd(8)), stop: stored(ymd(10)), resumeValid: true })),
    )
    expect(dayPart(task.actualFinish)).toBe(ymd(10))
    expect(task.stop).toBeNull()
    expect(dayPart(task.actualStart)).toBe(ymd(8))
    expect(task.resumeValid).toBe(false)
  })

  it('PV-2 on a same-day actual keeps that one day', () => {
    const task = accepted(
      pressed(taskOf({ actualStart: stored(ymd(12)), stop: stored(ymd(12)), resumeValid: true })),
    )
    expect(dayPart(task.actualFinish)).toBe(ymd(12))
    expect(task.stop).toBeNull()
  })

  it('PV-3 moves a Sunday actualFinish into stop unchanged and empties actualFinish and resume', () => {
    const task = accepted(
      pressed(
        taskOf({
          actualStart: stored(ymd(8)),
          actualFinish: stored(ymd(11)),
          resume: stored(ymd(2)),
          resumeValid: false,
        }),
      ),
    )
    expect(dayPart(task.stop)).toBe(ymd(11))
    expect(task.actualFinish).toBeNull()
    expect(task.resume).toBeNull()
    expect(task.resumeValid).toBe(false)
    expect(dayPart(task.actualStart)).toBe(ymd(8))
  })

  it('PV-2 then PV-3 hands back the very day it started with', () => {
    const running = taskOf({ actualStart: stored(ymd(8)), stop: stored(ymd(10)), resumeValid: true })
    const finished = accepted(pressed(running))
    expect(finished.stop).toBeNull()
    expect(dayPart(finished.actualFinish)).toBe(ymd(10))
    const suspended = accepted(pressed(finished))
    expect(dayPart(suspended.stop)).toBe(ymd(10))
    expect(suspended.actualFinish).toBeNull()
  })
})

describe('T-023d GA-6 via FR-043: the released day is stored as stop', () => {
  const notStarted = (): Document => documentWith(taskOf({ start: stored(ymd(12)) }))
  const released = (iso: string): EditResult =>
    editTask(notStarted(), { kind: 'beginTaskActual', uid: 1, grabbed: 'GA-6', droppedDay: stored(iso) }, DEFAULT_ROW_NAME_FIXTURE)

  it('released on Saturday the 17th: stop is that Saturday, not Friday 16 nor Monday 19', () => {
    const task = accepted(released(ymd(17)))
    expect(dayPart(task.actualStart)).toBe(ymd(12))
    expect(dayPart(task.stop)).toBe(ymd(17))
    expect(task.actualFinish).toBeNull()
    expect(task.resumeValid).toBe(true)
  })

  it('released on Sunday the 11th, left of the dummy with no worked day between: lifted to the floor day', () => {
    const task = accepted(released(ymd(11)))
    expect(dayPart(task.actualStart)).toBe(ymd(12))
    expect(dayPart(task.stop)).toBe(ymd(12))
  })

  it('released on Friday the 9th, one worked day left: a negative length, refused by IV-21', () => {
    const result = released(ymd(9))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.refusals.map((one) => one.rule)).toContain('IV-21')
  })
})

describe('T-220 IV-21 reads the stored last day', () => {
  const iv21 = (task: Task): number =>
    scheduleViolations(scheduleWith([task]), settingsOf()).filter((one) => one.row === 'IV-21').length

  it('reports stop two worked days before actualStart', () => {
    expect(iv21(taskOf({ actualStart: stored(ymd(14)), stop: stored(ymd(12)), resumeValid: true }))).toBeGreaterThan(0)
  })

  it('reports actualFinish before actualStart on a finished task', () => {
    expect(
      iv21(taskOf({ actualStart: stored(ymd(14)), actualFinish: stored(ymd(12)), resumeValid: false })),
    ).toBeGreaterThan(0)
  })

  it('does not report a zero length (Sunday stop before a Monday start) nor a same-day actual', () => {
    expect(iv21(taskOf({ actualStart: stored(ymd(12)), stop: stored(ymd(11)), resumeValid: true }))).toBe(0)
    expect(iv21(taskOf({ actualStart: stored(ymd(12)), stop: stored(ymd(12)), resumeValid: true }))).toBe(0)
  })
})

describe('T-069 RV-1: the right edge is the column after the last day', () => {
  const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
  const SETTINGS = settingsOf({ rulerHeight: 48, scrollDate: stored(ymd(1)), stackDirection: 'down' })
  const REGIONS = regionsFromScreen(ENV, SETTINGS)

  const edges = (task: Task): { readonly left: number; readonly right: number; readonly column: (i: number) => number } => {
    const layout = layoutFromSchedule(scheduleWith([task]), SETTINGS, REGIONS)
    const placed = layout.placements[0]
    if (placed === undefined || placed.actualX === null) throw new Error('no actual bar was placed')
    return {
      left: placed.actualX,
      right: placed.actualX + placed.actualWidth,
      column: (dayIndex: number) => REGIONS.rowArea.x + dayIndex * layout.pxPerDay,
    }
  }

  it('Thursday the 1st to a Saturday stop on the 3rd ends at the left of Sunday the 4th', () => {
    const at = edges(taskOf({ start: stored(ymd(1)), actualStart: stored(ymd(1)), stop: stored(ymd(3)), resumeValid: true }))
    expect(at.left).toBeCloseTo(at.column(0), 6)
    expect(at.right).toBeCloseTo(at.column(3), 6)
  })

  it('a same-day actual covers exactly its one column, never zero width', () => {
    const at = edges(taskOf({ start: stored(ymd(1)), actualStart: stored(ymd(2)), stop: stored(ymd(2)), resumeValid: true }))
    expect(at.left).toBeCloseTo(at.column(1), 6)
    expect(at.right).toBeCloseTo(at.column(2), 6)
  })

  it('a finished task ends after its actualFinish, stop being empty', () => {
    const at = edges(
      taskOf({ start: stored(ymd(1)), actualStart: stored(ymd(1)), actualFinish: stored(ymd(4)), resumeValid: false }),
    )
    expect(at.right).toBeCloseTo(at.column(4), 6)
  })
})
