// Shared bench for CR-430 tables T-271, T-272, T-273 and T-020.

import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Calendar, Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  taskPlacement,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, displayRatioAt } from '../fixtures/display-scale'

const DEFAULT_OF_T201 = String.fromCharCode(0x65e2, 0x5b9a, 0x5024)
const DEFAULT_OF_T206 = String.fromCharCode(0x65e2, 0x5b9a)

export const rowOf = (table: string, id: string): { readonly by: Readonly<Record<string, string>> } => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

export const cellOf = (table: string, id: string, heading: string): string =>
  bare(rowOf(table, id).by[heading] ?? '').replace(/`/g, '')

const numberIn = (text: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(text.replace(/`/g, ''))
  if (found === null) throw new Error(`no number in ${JSON.stringify(text)}`)
  return Number(found[0])
}

// see T-201
export const stored = (id: string): number => numberIn(bare(rowOf('T-201', id).by[DEFAULT_OF_T201] ?? ''))

// see T-206
export const notStored = (id: string): number => numberIn(bare(rowOf('T-206', id).by[DEFAULT_OF_T206] ?? ''))

// see DS-1, DS-3
export const RATIO = displayRatioAt(DEFAULT_DISPLAY_SCALE)

export const S_4 = stored('S-4')
export const S_5 = stored('S-5')
export const S_7 = stored('S-7')
export const S_8 = stored('S-8')
export const S_9 = stored('S-9')
export const S_10 = stored('S-10')
export const S_15 = stored('S-15')
export const S_16 = stored('S-16')
export const S_17 = stored('S-17')
export const S_22 = stored('S-22')
export const S_25 = stored('S-25')
export const S_31 = stored('S-31')
export const S_32 = stored('S-32')
export const S_46 = stored('S-46')
export const S_301 = stored('S-301')
export const S_302 = stored('S-302')
export const S_303 = stored('S-303')
export const S_304 = stored('S-304')
export const S_305 = stored('S-305')
export const S_306 = stored('S-306')
export const S_307 = stored('S-307')
export const S_180 = notStored('S-180')
export const S_196 = notStored('S-196')
export const S_233 = notStored('S-233')
export const S_247 = notStored('S-247')
export const S_260 = notStored('S-260')

// see XS-1
export const H = S_4 * RATIO
// see XS-2
export const ACTUAL_H = H * S_5
// see XS-3
export const MARKER_D = S_22 * RATIO
// see XS-5
export const GAP_TIER_1 = S_196 * RATIO
// see XS-6
export const GAP_ACTUAL = S_10 * RATIO
export const THIN_STROKE = S_304 * RATIO
export const THIN_HEAD_LENGTH = S_305 * RATIO
export const THIN_HEAD_HEIGHT = S_306 * RATIO
export const SPAN_DOT = S_307 * RATIO
export const LABEL_PAD = S_31 * RATIO
export const LABEL_GAP = S_32 * RATIO
export const MILESTONE_NAME_GAP = S_301 * RATIO
export const ASSIGNEE_GAP = S_302 * RATIO
export const FONT_MIN = S_8 * RATIO

// see XS-4
export const tierOneFontOf = (planHeight: number, shapeKind: string): number => {
  const band = planHeight * (shapeKind === 'endpointSpan' ? S_16 : S_15)
  return Math.max(band * S_5 * S_7 * S_9, FONT_MIN)
}

export const EPS = 1e-6

export interface Pt {
  readonly x: number
  readonly y: number
}

export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface Bar {
  readonly form: string
  readonly points?: readonly Pt[]
  readonly from?: Pt
  readonly to?: Pt
  readonly strokeWidth?: number
  readonly head?: readonly Pt[] | null
  readonly dots?: readonly { readonly at: Pt; readonly radius: number }[]
  readonly marks?: readonly (readonly Pt[])[]
}

export interface Marker {
  readonly symbol: string
  readonly centre: Pt
  readonly radius: number
}

export interface Dummy {
  readonly grab: string
  readonly at: Pt
  readonly ink: Rect
  readonly figure?: Bar
}

// see XS-10
export interface Resume {
  readonly arm?: readonly Pt[]
  readonly head?: readonly Pt[]
  readonly box?: Rect
  readonly dash?: readonly Pt[]
  readonly undecided?: boolean
}

export interface DrawnTask {
  readonly taskUid: number
  readonly shapeKind: string
  readonly plan: Bar | null
  readonly actual: Bar | null
  readonly milestoneFigure: Bar | null
  readonly marker: Marker | null
  readonly resume: Resume | null
  readonly dummies: readonly Dummy[]
  readonly label: Rect | null
  readonly assigneeLabel: Rect | null
}

export interface Placed {
  readonly x: number
  readonly width: number
  readonly y: number
  readonly height: number
  readonly planHeight: number
  readonly actualX: number | null
  readonly actualWidth: number
  readonly actualReach: number | null
  readonly dummyReach: number | null
  readonly labelFontSize: number
  readonly outsideLabel: string
  readonly markerAnchorX: number | null
}

export interface Band {
  readonly top: number
  readonly bottom: number
  readonly centre: number
  readonly height: number
  readonly left: number
  readonly right: number
}

export const bandOf = (bar: Bar): Band => {
  if (bar.form === 'line') {
    const from = bar.from as Pt
    const to = bar.to as Pt
    const stroke = bar.strokeWidth ?? 0
    const centre = (from.y + to.y) / 2
    return {
      top: centre - stroke / 2,
      bottom: centre + stroke / 2,
      centre,
      height: stroke,
      left: Math.min(from.x, to.x),
      right: Math.max(from.x, to.x),
    }
  }
  const points = bar.points ?? []
  if (points.length === 0) throw new Error('an outline with no points')
  const ys = points.map((one) => one.y)
  const xs = points.map((one) => one.x)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return {
    top,
    bottom,
    centre: (top + bottom) / 2,
    height: bottom - top,
    left: Math.min(...xs),
    right: Math.max(...xs),
  }
}

export const bandOfRect = (rect: Rect): Band => ({
  top: rect.y,
  bottom: rect.y + rect.height,
  centre: rect.y + rect.height / 2,
  height: rect.height,
  left: rect.x,
  right: rect.x + rect.width,
})

const settingsOf = (over: Readonly<Record<string, unknown>> = {}): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries({ ...SETTINGS_DEFAULTS, ...over })) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown> | undefined) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return out as unknown as DocumentSettings
}

const EVERY_DAY_WORKED = {
  uid: 1,
  name: 'every day worked',
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: [1, 2, 3, 4, 5, 6, 7].map((ordinal) => ({
    ordinal,
    dayType: ordinal,
    dayWorking: true,
    carry: {},
    carryElements: [],
  })),
  exceptions: [],
} as unknown as Calendar

export const taskOf = (over: Readonly<Record<string, unknown>>): Task =>
  ({
    uid: 1,
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: null,
    finish: null,
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
    ...over,
  }) as unknown as Task

const visualOf = (taskUid: number, shapeKind: string): unknown => ({
  taskUid,
  shapeKind,
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  lineWeight: null,
})

export const day = (n: number): string => `2026-03-${String(n).padStart(2, '0')}T00:00:00`

export interface SceneWish {
  readonly tasks: readonly Task[]
  readonly shapeKind?: string
  readonly shapeKindOf?: Readonly<Record<number, string>>
  readonly settings?: Readonly<Record<string, unknown>>
  readonly assignedTaskUids?: readonly number[]
  readonly commentBoxes?: readonly unknown[]
  readonly highlightBoxes?: readonly unknown[]
  readonly statusDate?: string | null
  readonly selectTaskUid?: number | null
}

export const scheduleOf = (wish: SceneWish): Schedule => {
  const assigned = wish.assignedTaskUids ?? []
  return {
    project: {
      id: null,
      name: null,
      title: null,
      subject: null,
      category: null,
      company: null,
      manager: null,
      author: null,
      created: null,
      revision: null,
      lastSaved: null,
      startDate: day(1),
      statusDate: wish.statusDate ?? null,
      minutesPerDay: null,
      minutesPerWeek: null,
      daysPerMonth: null,
      weekStartDay: null,
      calendarUid: EVERY_DAY_WORKED.uid,
      themeHue: 214,
      uidHighWaterMark: 1000,
      importSeq: 0,
      carry: {},
      carryElements: [],
    },
    calendars: [EVERY_DAY_WORKED],
    tasks: wish.tasks,
    resources:
      assigned.length === 0
        ? []
        : [
            {
              uid: 7,
              name: 'Ada',
              resourceKind: 1,
              isCostResource: false,
              calendarUid: null,
              carry: {},
              carryElements: [],
            },
          ],
    assignments: assigned.map((taskUid, index) => ({
      uid: 100 + index,
      taskUid,
      resourceUid: 7,
      carry: {},
      carryElements: [],
    })),
    taskGroups: [
      {
        id: 'g1',
        parentId: null,
        label: 'g1',
        derivedFromTaskUid: null,
        order: 0,
        treeState: 'auto', color: null,
        height: null,
      },
    ],
    taskGroupMembers: wish.tasks.map((one) => ({
      taskUid: (one as unknown as { uid: number }).uid,
      groupId: 'g1',
      stackOrder: null,
    })),
    taskVisuals: wish.tasks.map((one) => {
      const uid = (one as unknown as { uid: number }).uid
      return visualOf(uid, wish.shapeKindOf?.[uid] ?? wish.shapeKind ?? 'rectangle')
    }),
    commentBoxes: wish.commentBoxes ?? [],
    highlightBoxes: wish.highlightBoxes ?? [],
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
}

export const SCREEN = { width: 2400, height: 900, appHeaderHeight: 48, scrollbarThickness: 8 }

export interface DrawWish {
  readonly pointer?: Pt | null
  readonly marquee?: Rect | null
  readonly watermark?: { readonly openedBy: string; readonly stampedAt: string } | null
  readonly tentativeLink?: unknown
  readonly follow?: { readonly side: 'date1' | 'date2'; readonly x: number | null } | null
}

export interface Scene {
  readonly settings: DocumentSettings
  readonly geometry: unknown
  readonly layout: ScheduleLayout
  readonly drawn: readonly DrawnTask[]
  readonly placedOf: (taskUid: number) => Placed
  readonly taskOf: (taskUid: number) => DrawnTask
  readonly svg: (wish?: DrawWish) => string
  readonly selection: Selection
}

export const sceneOf = (wish: SceneWish): Scene => {
  const settings = settingsOf({
    zoomX: 8,
    scrollDate: day(1),
    stackDirection: 'down',
    ...(wish.settings ?? {}),
  })
  const schedule = scheduleOf(wish)
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection =
    wish.selectTaskUid == null
      ? emptySelection()
      : selectionWith(emptySelection(), { kind: 'task', uid: wish.selectTaskUid })
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection)
  const drawn = (geometry as unknown as { tasks: readonly DrawnTask[] }).tasks
  return {
    settings,
    geometry,
    layout,
    drawn,
    selection,
    placedOf: (taskUid: number): Placed => {
      const found = taskPlacement(layout, taskUid)
      if (found === null) throw new Error(`task ${taskUid} was not placed`)
      return found as unknown as Placed
    },
    taskOf: (taskUid: number): DrawnTask => {
      const found = drawn.find((one) => one.taskUid === taskUid)
      if (found === undefined) throw new Error(`task ${taskUid} was not drawn`)
      return found
    },
    svg: (draw: DrawWish = {}): string =>
      svgFromSchedule(
        schedule,
        settings,
        layout,
        geometry as never,
        regions,
        selection,
        'screen',
        (draw.follow ?? null) as never,
        [],
        (draw.pointer ?? null) as never,
        null,
        (draw.marquee ?? null) as never,
        (draw.watermark ?? null) as never,
        (draw.tentativeLink ?? null) as never,
      ),
  }
}
