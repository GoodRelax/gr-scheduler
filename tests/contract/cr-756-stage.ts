// CR-756 spec-only stage: the manuscript, a document with timed plans on the default calendar, and a frame loop.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { DummyGeometry } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { DEFAULT_DISPLAY_RATIO } from '../fixtures/display-scale'
import { drawnTask, frameOf, planBox, stage, type Stage } from '../unit/cr-430-stage'
import { specTable, unbroken } from './spec-table'

export type Loose = Record<string, any>

export const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'),
)

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Loose

// see T-206, S-585
export function settingsRowDefault(id: string): number {
  const row = specTable('T-206').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  const found = /\d+(?:\.\d+)?/.exec(row.cells[1] ?? '')
  if (found === null) throw new Error(`table T-206 row ${id} states no number: ${row.cells[1] ?? ''}`)
  return Number(found[0])
}

export const S_585_MINUTES = settingsRowDefault('S-585')
export const S_180_PX = settingsRowDefault('S-180')
export const MINUTES_PER_DAY = 24 * 60

export const TIMED_UID = 1
export const TIMED_MILESTONE_UID = 2
// WHY: an 08:00 plan start is the ruler every other x is read against (RV-6).
export const RULER_UID = 3

export const PLAN_START = '2026-04-06T10:30:00'
export const MILESTONE_AT = '2026-04-06T15:00:00'
const RULER_START = '2026-04-06T08:00:00'

const task = (over: Partial<Task> & { readonly uid: number }): Task =>
  ({
    parentTaskUid: null,
    wbsOrder: over.uid,
    name: `task ${String(over.uid)}`,
    start: null,
    finish: null,
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...over,
  }) as unknown as Task

const TASKS = (): readonly Task[] => [
  task({ uid: TIMED_UID, start: PLAN_START, finish: '2026-04-10T17:00:00' }),
  task({ uid: TIMED_MILESTONE_UID, start: MILESTONE_AT, finish: MILESTONE_AT, milestone: true }),
  task({ uid: RULER_UID, start: RULER_START, finish: '2026-04-10T17:00:00' }),
]

// see S-580, FR-054, FR-158
export function documentOf(options: {
  readonly isTimeOfDayVisible: boolean
  readonly pxPerDay: number
  readonly scrollDate?: string
}): Document {
  const template = structuredClone(TEMPLATE)
  const tasks = TASKS()
  const rows = tasks.map((one) => `75600000-0000-4000-8000-${String(one.uid).padStart(12, '0')}`)
  return {
    '$schema': template['$schema'],
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...template['schedule'].project, uidHighWaterMark: 100, statusDate: null },
      calendars: template['schedule'].calendars,
      tasks,
      resources: [],
      assignments: [],
      taskGroups: rows.map((id, order) => ({
        id,
        parentId: null,
        name: `row ${String(order)}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto',
        editPermission: null,
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: tasks.map((one, index) => ({ taskUid: one.uid, taskGroupId: rows[index] })),
      taskVisuals: [{ taskUid: TIMED_MILESTONE_UID, shapeKind: 'milestone' }],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...template['documentSettings'],
      isTimeOfDayVisible: options.isTimeOfDayVisible,
      isProgressMarkerVisible: true, // see S-63
      isActualVisible: true, // see S-228
      scrollDate: options.scrollDate ?? '2026-04-06T00:00:00',
      scrollTaskGroupId: rows[0],
      scrollDateFraction: 0,
      scrollTaskGroupFraction: 0,
      // WHY: FR-017 and FR-039 -- the drawn day width is S-1 times zoomX times the drawn ratio, so pxPerDay is the drawn one.
      zoomX: options.pxPerDay / (SETTINGS_CONSTANTS.pxPerDayAt1x * DEFAULT_DISPLAY_RATIO),
    },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
}

export function stageOf(options: Parameters<typeof documentOf>[0]): Stage {
  return stage(documentOf(options))
}

export function dummiesOf(one: Stage, uid: number): readonly DummyGeometry[] {
  return drawnTask(one.loop, uid).dummies
}

// see DM-2
export function inkOf(one: Stage, uid: number): { readonly x: number; readonly width: number; readonly y: number; readonly height: number } {
  const [first] = dummiesOf(one, uid)
  if (first === undefined) throw new Error(`Task ${String(uid)} draws no dummy`)
  return first.ink
}

export function pxPerDayOf(one: Stage): number {
  return frameOf(one.loop).pxPerDay
}

// see RV-6, FR-017
export function xOfInstant(one: Stage, iso: string): number {
  const ruler = planBox(one.loop, RULER_UID).x0
  const minutes = (Date.parse(`${iso}Z`) - Date.parse(`${RULER_START}Z`)) / 60_000
  return ruler + (minutes / MINUTES_PER_DAY) * pxPerDayOf(one)
}

// see T-350
export function minuteOf(text: string | null | undefined): string | null {
  return text === null || text === undefined ? null : text.slice(0, 16)
}
