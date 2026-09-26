// CR-576 wave 3 assertion 7: chevron ends by fade (null, 0, n), the actual bar, rectangles (FD-4, FD-5, FD-6a).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  Calendar,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import { emptySelection, type Selection } from '../../src/entity/document-model/selection/selection'
import {
  geometryFromLayout,
  type Point,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  type TaskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FD-5
const FD_5_PER_END =
  '矢羽根では、開始側の切り込みの深さを `fadeIn` に、終了側の先端の深さを `fadeOut` に、端ごとに置き換えること（MUST）'
const FD_5_MUST_NOT = '一方の端のフェード長で、もう一方の端の形を変えてはならない（MUST NOT）'
const FD_5_NULL =
  'フェード長が未設定（`null`）の端は、フェードの無い矢羽根と同じ深さ（`_assets/tbl-settings.md` の 表 T-201 の `S-43` ／ `S-44`）のままとすること（MUST）'
const FD_5_ZERO = 'フェード長が 0 の端は、平ら（深さ 0）に描くこと（MUST）'
const FD_5_BOTH_ZERO = '両端とも 0 の矢羽根は、外形が矩形になる'
// see FD-6a
const FD_6A_NO_FADE = '実績バーにはフェードを適用しない（MUST NOT）'
const FD_6A_UNSET = '矢羽根の実績バーは、フェードを未設定として描くこと（MUST）'
const FD_6A_NOT_FLAT = '予定の端を 0 にしても実績の端は平らにならない'
// see FD-4
const FD_4 = '矩形で、どちらも 0 または未設定'
// see FR-016
const FR_016_HANDLE = '未設定（`null`）の端の掴み点は 0 日の位置に立つ'

const rowIn = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}
const numberOf = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}
const settingOf = (id: string, key: string): number => {
  const row = rowIn('T-201', id)
  expect(bare(row.by['キー'] ?? ''), `table T-201 row ${id} is ${key}`).toBe(key)
  return numberOf(row.by['既定値'] ?? '')
}

// see S-43, S-44, S-5, LF-6
const S_43 = settingOf('S-43', 'chevronNotchOfHeight')
const S_44 = settingOf('S-44', 'chevronNotchOfWidth')
const S_5 = settingOf('S-5', 'actualOfPlan')
const LF_6 = (() => {
  const cells = rowIn('T-221', 'LF-6').cells
  return cells[cells.length - 1] ?? ''
})()

const settingsOf = (over: Readonly<Record<string, unknown>> = {}): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries({ ...SETTINGS_DEFAULTS, ...over })) {
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

const day = (d: number): string => `2026-03-${String(d).padStart(2, '0')}T00:00:00`

// WHY: IN_DAYS + OUT_DAYS stays inside the span, so FD-6b never trims them.
const START = 4
const FINISH = 24
const IN_DAYS = 3
const OUT_DAYS = 5

type Fade = number | null

const taskOf = (fadeInDays: Fade, fadeOutDays: Fade, withActual: boolean): Task =>
  ({
    uid: 1,
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: day(START),
    finish: day(FINISH),
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: withActual ? day(START) : null,
    stop: withActual ? day(14) : null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays,
    fadeOutDays,
    dependencies: [],
    carry: {},
    carryElements: [],
  }) as unknown as Task

const scheduleOf = (one: Task, shapeKind: string): Schedule =>
  ({
    project: {
      id: null, name: null, title: null, subject: null, category: null, company: null,
      manager: null, author: null, created: null, revision: null, lastSaved: null,
      startDate: '2026-03-01T00:00:00', statusDate: null, minutesPerDay: null,
      minutesPerWeek: null, daysPerMonth: null, weekStartDay: null,
      calendarUid: EVERY_DAY_WORKED.uid, themeHue: 214, uidHighWaterMark: 1000,
      importSeq: 0, carry: {}, carryElements: [],
    },
    calendars: [EVERY_DAY_WORKED],
    tasks: [one],
    resources: [],
    assignments: [],
    taskGroups: [
      {
        id: 'g1', parentId: null, label: 'g1', derivedFromTaskUid: null, order: 0,
        treeState: 'auto', color: null, minHeight: null,
      } as unknown as TaskGroup,
    ],
    taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }] as unknown as readonly TaskGroupMember[],
    taskVisuals: [
      { taskUid: 1, shapeKind, milestoneGlyph: null, fillColor: null, strokeColor: null, lineWeight: null } as unknown as TaskVisual,
    ],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const SCREEN = { width: 1280, height: 800, appHeaderHeight: 48, scrollbarThickness: 8, propertyPanelWidth: 0 }
const SELECTED: Selection = { items: [{ kind: 'task', uid: 1 }], ordered: true }

interface Drawn {
  readonly placed: TaskPlacement
  readonly task: TaskGeometry
}

function drawn(shapeKind: string, fadeIn: Fade, fadeOut: Fade, options: { actual?: boolean; selected?: boolean } = {}): Drawn {
  const schedule = scheduleOf(taskOf(fadeIn, fadeOut, options.actual === true), shapeKind)
  const settings = settingsOf({ zoomX: 3, scrollDate: day(1), stackDirection: 'down' })
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = options.selected === true ? SELECTED : emptySelection()
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection, null)
  const placed = layout.placements.find((one) => one.taskUid === 1)
  const task = geometry.tasks.find((one) => one.taskUid === 1)
  if (placed === undefined || task === undefined) throw new Error('premise: the task is drawn')
  return { placed, task }
}

const outlineOf = (bar: TaskGeometry['plan'], what: string): readonly Point[] => {
  expect(bar?.form, `premise: the ${what} is an outline`).toBe('outline')
  return bar !== null && bar.form === 'outline' ? bar.points : []
}

interface Ends {
  readonly start: number
  readonly end: number
  readonly left: number
  readonly right: number
}

// WHY: measured at the middle crossing, not at a middle point, so a flat end reads 0 however it is written.
function endsOf(points: readonly Point[]): Ends {
  const ys = points.map((one) => one.y)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  const mid = (top + bottom) / 2
  const onEdge = points.filter((one) => Math.abs(one.y - top) < 1e-6 || Math.abs(one.y - bottom) < 1e-6)
  const left = Math.min(...onEdge.map((one) => one.x))
  const right = Math.max(...onEdge.map((one) => one.x))
  const crossings: number[] = []
  points.forEach((a, index) => {
    const b = points[(index + 1) % points.length] as Point
    if (Math.abs(a.y - mid) < 1e-6) crossings.push(a.x)
    if ((a.y - mid) * (b.y - mid) < 0) crossings.push(a.x + ((mid - a.y) * (b.x - a.x)) / (b.y - a.y))
  })
  return { start: Math.min(...crossings) - left, end: Math.max(...crossings) - right, left, right }
}

// see LF-6
const defaultPlanDepth = (placed: TaskPlacement): number =>
  Math.min(placed.width * S_44, placed.planHeight * S_43)

describe('CR-576 -- the clauses this file quotes still stand', () => {
  it('FD-5, FD-6a, FD-4, FR-016 and LF-6 still say what the cases below test', () => {
    for (const clause of [
      FD_5_PER_END, FD_5_MUST_NOT, FD_5_NULL, FD_5_ZERO, FD_5_BOTH_ZERO,
      FD_6A_NO_FADE, FD_6A_UNSET, FD_6A_NOT_FLAT, FD_4, FR_016_HANDLE,
    ]) {
      expect(REQUIREMENTS, 'the specification no longer says this').toContain(clause)
    }
    for (const term of ['chevronNotchOfWidth', 'chevronNotchOfHeight', 'actualOfPlan']) {
      expect(LF_6, `LF-6 no longer names ${term}`).toContain(term)
    }
  })
})

const VALUES: readonly Fade[] = [null, 0, -1]
const CHEVRON_ROWS: ReadonlyArray<readonly [Fade, Fade]> = VALUES.flatMap((fadeIn) =>
  VALUES.map((fadeOut) => [fadeIn === -1 ? IN_DAYS : fadeIn, fadeOut === -1 ? OUT_DAYS : fadeOut] as const),
)

describe('FD-5 (table T-012a) -- each chevron end on its own: null keeps the default depth, 0 is flat, n is n days', () => {
  it.each(CHEVRON_ROWS)('FD-5: chevron fadeIn=%s fadeOut=%s -- both ends as FD-5 says, the other end unchanged', (fadeIn, fadeOut) => {
    const { placed, task } = drawn('chevron', fadeIn, fadeOut)
    const ends = endsOf(outlineOf(task.plan, 'plan chevron'))
    const plain = defaultPlanDepth(placed)
    if (fadeIn !== null && fadeIn > 0) expect(placed.fadeInPx, 'premise: the fade differs from S-43 / S-44').not.toBeCloseTo(plain, 1)
    if (fadeOut !== null && fadeOut > 0) expect(placed.fadeOutPx, 'premise: the fade differs from S-43 / S-44').not.toBeCloseTo(plain, 1)
    const expected = (fade: Fade, px: number): number => (fade === null ? plain : fade === 0 ? 0 : px)
    const say = (fade: Fade): string => (fade === null ? FD_5_NULL : fade === 0 ? FD_5_ZERO : FD_5_PER_END)
    expect(ends.start, `start notch: ${say(fadeIn)} / ${FD_5_MUST_NOT}`).toBeCloseTo(expected(fadeIn, placed.fadeInPx), 2)
    expect(ends.end, `end tip: ${say(fadeOut)} / ${FD_5_MUST_NOT}`).toBeCloseTo(expected(fadeOut, placed.fadeOutPx), 2)
  })

  it('FD-5: 両端とも 0 の矢羽根は、外形が矩形になる', () => {
    const points = outlineOf(drawn('chevron', 0, 0).task.plan, 'plan chevron')
    const ends = endsOf(points)
    for (const one of points) {
      expect(
        Math.abs(one.x - ends.left) < 1e-6 || Math.abs(one.x - ends.right) < 1e-6,
        `${FD_5_BOTH_ZERO}: every point stands on the left or the right side`,
      ).toBe(true)
    }
  })
})

describe('FD-6a (table T-012a) -- the actual bar of a chevron is drawn as unset', () => {
  it.each(CHEVRON_ROWS)('FD-6a: plan fadeIn=%s fadeOut=%s -- the actual keeps the default depth at both ends', (fadeIn, fadeOut) => {
    const { placed, task } = drawn('chevron', fadeIn, fadeOut, { actual: true })
    const ends = endsOf(outlineOf(task.actual, 'actual chevron'))
    const plain = defaultPlanDepth(placed) * S_5
    const why = fadeIn === 0 || fadeOut === 0 ? `${FD_6A_UNSET} / ${FD_6A_NOT_FLAT}` : `${FD_6A_NO_FADE} / ${FD_6A_UNSET}`
    expect(ends.start, `actual start notch: ${why}`).toBeCloseTo(plain, 2)
    expect(ends.end, `actual end tip: ${why}`).toBeCloseTo(plain, 2)
  })

  it('FD-6a: the actual under a plan end of 0 is the same outline as under an unset plan end', () => {
    const unset = drawn('chevron', null, null, { actual: true })
    for (const [fadeIn, fadeOut] of [[0, null], [null, 0], [0, 0]] as const) {
      const zero = drawn('chevron', fadeIn, fadeOut, { actual: true })
      expect(zero.task.actual, `fadeIn=${fadeIn} fadeOut=${fadeOut}: ${FD_6A_NOT_FLAT}`).toEqual(unset.task.actual)
    }
  })
})

describe('FD-4 (table T-012a) -- on a rectangle, null and 0 are both no fade', () => {
  it('FD-4: 矩形で、どちらも 0 または未設定 -- the same rectangle, both ends flat', () => {
    const unset = drawn('rectangle', null, null)
    const unsetEnds = endsOf(outlineOf(unset.task.plan, 'plan rectangle'))
    expect(unsetEnds.start, FD_4).toBeCloseTo(0, 6)
    expect(unsetEnds.end, FD_4).toBeCloseTo(0, 6)
    for (const [fadeIn, fadeOut] of [[0, 0], [0, null], [null, 0]] as const) {
      const other = drawn('rectangle', fadeIn, fadeOut)
      expect(other.task.plan, `fadeIn=${fadeIn} fadeOut=${fadeOut}: ${FD_4}`).toEqual(unset.task.plan)
    }
  })

  it('FD-1 / FD-2 with FD-4: a rectangle faded at one end draws the same whether the other end is null or 0', () => {
    expect(drawn('rectangle', 0, OUT_DAYS).task.plan, `FD-2 / ${FD_4}`).toEqual(drawn('rectangle', null, OUT_DAYS).task.plan)
    expect(drawn('rectangle', IN_DAYS, 0).task.plan, `FD-1 / ${FD_4}`).toEqual(drawn('rectangle', IN_DAYS, null).task.plan)
  })
})

describe('FR-016 -- the grab point of an unset end stands at 0 days', () => {
  it('FR-016: 未設定（null）の端の掴み点は 0 日の位置に立つ -- a chevron\'s handles do not follow the default depth', () => {
    const unset = drawn('chevron', null, null, { selected: true })
    expect(unset.task.fadeHandles.length, 'premise: the selected task shows its fade handles').toBeGreaterThan(0)
    expect(drawn('chevron', 0, 0, { selected: true }).task.fadeHandles, FR_016_HANDLE).toEqual(unset.task.fadeHandles)
    expect(drawn('chevron', null, OUT_DAYS, { selected: true }).task.fadeHandles, FR_016_HANDLE).toEqual(
      drawn('chevron', 0, OUT_DAYS, { selected: true }).task.fadeHandles,
    )
  })
})
