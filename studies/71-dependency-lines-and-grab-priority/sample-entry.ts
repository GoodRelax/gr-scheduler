// Sample 71 entry: draws two small schedules with the shipped layout, geometry, SVG and hit-test code,
// and exposes them to the sample page as window.grs. Bundled by build-sample.mjs.

import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Calendar, Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { answersAtPointer, grabSizesOf, pointerWalkOf } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'

const day = (n: number): string => `2026-03-${String(n).padStart(2, '0')}T00:00:00`
const close = (n: number): string => `2026-03-${String(n).padStart(2, '0')}T17:00:00`

interface Wish {
  readonly uid: number
  readonly row: number
  readonly name: string
  readonly from: number
  readonly to: number
  readonly actual?: { readonly from: number; readonly to?: number; readonly percent: number }
  readonly after?: readonly number[]
  readonly assigned?: boolean
}

const CALENDAR = {
  uid: 1, name: 'every day worked', isBaseCalendar: true, baseCalendarUid: null, ordinal: 0, carry: {},
  carryElements: [],
  weekDays: [1, 2, 3, 4, 5, 6, 7].map((ordinal) => ({
    ordinal, dayType: ordinal, dayWorking: true, workingTimes: [], carry: {}, carryElements: [],
  })),
  exceptions: [],
} as unknown as Calendar

const taskOf = (wish: Wish): Task => ({
  uid: wish.uid, parentTaskUid: null, wbsOrder: null, name: wish.name,
  start: day(wish.from), finish: close(wish.to), milestone: null, deadline: null, notes: null, calendarUid: null,
  actualStart: wish.actual === undefined ? null : day(wish.actual.from),
  stop: null,
  actualFinish: wish.actual?.to === undefined ? null : close(wish.actual.to),
  resume: null, resumeValid: null,
  percentComplete: wish.actual?.percent ?? null,
  fadeInDays: null, fadeOutDays: null,
  dependencies: (wish.after ?? []).map((uid) => ({ predecessorUid: uid, linkType: 1, lag: 0, carry: {}, carryElements: [] })),
  carry: {}, carryElements: [],
}) as unknown as Task

const scheduleOf = (wishes: readonly Wish[], statusDay: number): Schedule => {
  const rows = Math.max(...wishes.map((one) => one.row)) + 1
  const assigned = wishes.filter((one) => one.assigned === true)
  return {
    project: {
      id: null, name: null, title: null, subject: null, category: null, company: null, manager: null, author: null,
      creationDate: null, revision: null, startDate: day(1), statusDate: day(statusDay), minutesPerDay: null,
      minutesPerWeek: null, daysPerMonth: null, weekStartDay: null, calendarUid: 1, defaultStartTime: null,
      defaultFinishTime: null, themeHue: 214, uidHighWaterMark: 1000, importSequence: 0, carry: {}, carryElements: [],
    },
    calendars: [CALENDAR],
    tasks: wishes.map(taskOf),
    resources: [{ uid: 7, name: 'Ada', resourceKind: 1, isCostResource: false, calendarUid: null, carry: {}, carryElements: [] }],
    assignments: assigned.map((one, index) => ({ uid: 100 + index, taskUid: one.uid, resourceUid: 7, carry: {}, carryElements: [] })),
    taskGroups: Array.from({ length: rows }, (_, row) => ({
      id: `g${row}`, parentId: null, name: `row ${row + 1}`, derivedFromTaskUid: null, order: row, treeState: 'auto',
      color: null, minHeightPx: null,
    })),
    taskGroupMembers: wishes.map((one) => ({ taskUid: one.uid, taskGroupId: `g${one.row}` })),
    taskVisuals: wishes.map((one) => ({
      taskUid: one.uid, shapeKind: 'rectangle', milestoneGlyph: null, fillColor: null, strokeColor: null, strokeWidthPx: null,
    })),
    commentBoxes: [], highlightBoxes: [], taskOrigins: [], baselineTasks: [],
  } as unknown as Schedule
}

const settingsOf = (over: Readonly<Record<string, unknown>>): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries({ ...SETTINGS_DEFAULTS, ...over })) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const rest = key.slice(dot + 1)
    const inner = rest.indexOf('.')
    const nest = { ...((out[head] as Record<string, unknown> | undefined) ?? {}) }
    if (inner < 0) nest[rest] = value
    else {
      const sub = rest.slice(0, inner)
      nest[sub] = { ...((nest[sub] as Record<string, unknown> | undefined) ?? {}), [rest.slice(inner + 1)]: value }
    }
    out[head] = nest
  }
  return out as unknown as DocumentSettings
}

// Scene "hit" (plan uid 205): ends with a line leaving or entering, a marker beside the end, a short line.
const HIT_SCENE: readonly Wish[] = [
  { uid: 1, row: 0, name: 'Design', from: 2, to: 6, actual: { from: 2, percent: 60 }, assigned: true },
  { uid: 2, row: 1, name: 'Build', from: 9, to: 13, after: [1], assigned: true },
  { uid: 3, row: 2, name: 'Draft', from: 2, to: 6, actual: { from: 2, to: 6, percent: 100 } },
  { uid: 4, row: 2, name: 'Review', from: 8, to: 11, after: [3] },
  { uid: 5, row: 3, name: 'Test', from: 15, to: 18, after: [2], assigned: true },
  { uid: 6, row: 4, name: 'Specification writing and review', from: 2, to: 2, actual: { from: 2, percent: 40 }, assigned: true },
  { uid: 7, row: 5, name: 'Coding', from: 6, to: 9, after: [6], assigned: true },
]

// Scene "overlap" (plan uid 204): two unrelated lines whose entry runs come down at the same x,
// two lines whose exit runs go down at the same x, and two lines into one successor (fan-in).
const OVERLAP_SCENE: readonly Wish[] = [
  { uid: 11, row: 0, name: 'Photo shoot', from: 2, to: 5 },
  { uid: 12, row: 1, name: 'Copywriting', from: 3, to: 7 },
  { uid: 13, row: 2, name: 'Layout', from: 10, to: 13, after: [11] },
  { uid: 14, row: 3, name: 'Check', from: 10, to: 14, after: [12] },
  { uid: 15, row: 4, name: 'Assets', from: 2, to: 8 },
  { uid: 16, row: 5, name: 'Fonts', from: 4, to: 8 },
  { uid: 17, row: 6, name: 'Print', from: 11, to: 14, after: [16] },
  { uid: 18, row: 7, name: 'Web', from: 12, to: 15, after: [15] },
  { uid: 19, row: 8, name: 'Logo', from: 2, to: 4 },
  { uid: 20, row: 9, name: 'Icons', from: 3, to: 6 },
  { uid: 21, row: 10, name: 'Kit', from: 9, to: 12, after: [19, 20] },
]

const SCENES: Readonly<Record<string, readonly Wish[]>> = { hit: HIT_SCENE, overlap: OVERLAP_SCENE }

const SCREEN = { width: 1400, height: 1200, appHeaderHeight: 0, scrollbarThickness: 8, propertyPanelWidth: 0 }

export interface Built {
  readonly svg: string
  readonly answerAt: (x: number, y: number) => { readonly grab: string; readonly item: string } | null
  readonly dependencies: unknown
  readonly tasks: unknown
}

// see T-266, T-267, T-268
export function build(scene: string, options: {
  readonly zoomX: number
  readonly displayScale: number
  readonly dark: boolean
  readonly reshape?: (geometry: unknown) => unknown
}): Built {
  const wishes = SCENES[scene] ?? HIT_SCENE
  const schedule = scheduleOf(wishes, 5)
  const settings = settingsOf({
    zoomX: options.zoomX, displayScale: options.displayScale, scrollDate: day(1), stackDirection: 'down',
    isAssigneeVisible: true, isPercentCompleteVisible: true, taskGroupPanelWidthPx: 120,
  })
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = emptySelection()
  const raw = geometryFromLayout(schedule, settings, layout, regions, selection, null)
  const geometry = (options.reshape === undefined ? raw : options.reshape(raw)) as typeof raw
  const svg = svgFromSchedule(schedule, settings, layout, geometry, regions, selection, 'screen', {
    themePreference: options.dark ? 'dark' : 'light', guideCursorMode: 'none',
  } as never)
  const walk = pointerWalkOf(geometry, grabSizesOf())
  const nameOf = new Map(wishes.map((one) => [one.uid, one.name]))
  return {
    svg,
    dependencies: geometry.dependencies,
    tasks: (geometry as unknown as { tasks: unknown }).tasks,
    answerAt: (x, y) => {
      const hit = answersAtPointer(walk, x, y).hit
      if (hit === null) return null
      const item = hit.item as unknown as Record<string, unknown>
      const label = item['kind'] === 'dependency'
        ? `${nameOf.get(item['predecessorUid'] as number)} -> ${nameOf.get(item['successorUid'] as number)}`
        : String(nameOf.get(item['taskUid'] as number) ?? item['kind'])
      return { grab: String(hit.grab ?? '-'), item: label }
    },
  }
}

;(globalThis as unknown as { grs: unknown }).grs = { build }
