// Integration tests: the drawing chain of the SW_SPEC nodes SWS-1 to SWS-5.

import { describe, expect, it } from 'vitest'
import { settingNumber } from '../fixtures/setting-number'
import { specTable, type SpecTable } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, S_235, displayRatioAt } from '../fixtures/display-scale'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { DEFAULT_CALENDAR_VALUES } from '../../src/entity/document-model/schedule/schedule'
import type {
  Calendar,
  CalendarDay,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import {
  dateAtX,
  layoutFromSchedule,
  xFromDay,
  NOT_STORED_SIZES,
  type RulerTier,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  geometryFromLayout,
  leaderOf,
  type Path,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  regionsFromScreen,
  type ScreenRect,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
// Spec: FR-039, T-252
const DISPLAY_RATIO = displayRatioAt(DEFAULT_DISPLAY_SCALE)

// Spec: T-206, T-240
const S_247 = Number.parseFloat(specTable('T-206').rows.find((one) => one.id === 'S-247')?.by['既定'] ?? 'NaN')

// Why: the picture prints a coordinate rounded to two places.
const twoPlaces = (value: number): number => Math.round(value * 100) / 100

type SwsId = 'SWS-1' | 'SWS-2' | 'SWS-3' | 'SWS-4' | 'SWS-5'

interface SwsCase {
  readonly sws: SwsId
  readonly level: 'Integration'
  readonly covers: readonly string[]
  readonly given: string
  readonly when: string
  readonly then: string
}

// Why: filled while the module is evaluated, one push per swsCase literal, before any
// case body runs, so every case sees the same registry.
const CASES: SwsCase[] = []

function swsCase(one: SwsCase): string {
  CASES.push(one)
  return `${one.sws} [${one.covers.join(' ')}] GIVEN ${one.given} WHEN ${one.when} THEN ${one.then}`
}

const T221: SpecTable = specTable('T-221')
const T222: SpecTable = specTable('T-222')

const rowOf = (table: SpecTable, id: string) => {
  const row = table.rows.find((r) => r.id === id)
  if (row === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return row
}

// Why: T-221 writes the formula in its last column and T-222 the route, before any
// traces column.
const formulaOf = (table: SpecTable, id: string): string => {
  const cells = rowOf(table, id).cells
  return cells[cells.length - (table.headings[table.headings.length - 1] === 'traces' ? 2 : 1)] ?? ''
}

// Why: the arithmetic below is a copy of prose; failing when a row stops naming a term
// keeps the copy from going stale silently.
const mentions = (table: SpecTable, id: string, ...terms: readonly string[]): void => {
  const text = formulaOf(table, id)
  for (const term of terms) {
    expect(text, `table ${table.id} row ${id} no longer names ${term}`).toContain(term)
  }
}

const T206: SpecTable = specTable('T-206')
const T051: SpecTable = specTable('T-051')

const settingPx = (id: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(rowOf(T206, id).by['既定'] ?? '')
  if (found === null) throw new Error(`table T-206 row ${id} states no number in 既定`)
  return Number(found[0])
}

// Why: a control is the glyph box (S-138) plus the FR-029 gap (S-243) on each side.
const ONE_CONTROL_TALL = settingPx('S-138') + settingPx('S-243') * 2

// Spec: LF-3, LF-16, HF-1, HF-19
// Why: the lattice is no floor of LF-3; it is composed only for the LF-16 reserve and the
// HF-19 MUST NOT cases, which need to know it stands above a one-lane band.
const CONTROL_LATTICE = ONE_CONTROL_TALL * S_235 * 2

// Why: the bend count is the only all-digit cell of a T-222 row.
const bendsOf = (id: string): number => {
  const cell = rowOf(T222, id).cells.find((c) => /^\d+$/.test(c.trim()))
  if (cell === undefined) throw new Error(`table T-222 row ${id} states no bend count`)
  return Number(cell.trim())
}

// Why: the fixtures carry no sample document, so the shapes are built here; every
// builder returns a fresh object.
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

// Why: every weekday is worked, so a day of the month and a worked day are one number
// and an expected x is arithmetic (FR-054, IV-17).
const EVERY_DAY_WORKED: Calendar = {
  uid: 1,
  name: 'every day worked',
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: [1, 2, 3, 4, 5, 6, 7].map((n) => ({
    ordinal: n,
    dayType: n,
    dayWorking: true,
    workingTimes: [],
    carry: {},
    carryElements: [],
  })),
  exceptions: [],
}

const task = (over: Partial<Task> & { readonly uid: number }): Task => ({
  parentTaskUid: null,
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
})

const taskGroup = (id: string, order: number, over: Partial<TaskGroup> = {}): TaskGroup => ({
  id,
  parentId: null,
  name: id,
  derivedFromTaskUid: null,
  order,
  treeState: 'auto', editPermission: null,
  color: null,
  minHeightPx: null,
  ...over,
})

const taskVisual = (taskUid: number, over: Partial<TaskVisual> = {}): TaskVisual => ({
  taskUid,
  shapeKind: 'rectangle',
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  strokeWidthPx: null,
  ...over,
})

const dependency = (predecessorUid: number, linkType: number) => ({
  predecessorUid,
  linkType,
  linkLag: null,
  lagFormat: null,
  carry: {},
  carryElements: [],
})

const scheduleOf = (
  tasks: readonly Task[],
  groups: readonly TaskGroup[],
  members: readonly TaskGroupMember[],
  visuals: readonly TaskVisual[],
  statusDate: string | null,
): Schedule => ({
  project: {
    id: null,
    name: null,
    title: null,
    subject: null,
    category: null,
    company: null,
    manager: null,
    author: null,
    creationDate: null,
    revision: null,
    startDate: '2026-03-01T00:00:00',
    statusDate,
    minutesPerDay: null,
    minutesPerWeek: null,
    daysPerMonth: null,
    weekStartDay: null,
    calendarUid: EVERY_DAY_WORKED.uid,
    defaultStartTime: null,
    defaultFinishTime: null,
    themeHue: 214,
    parentTaskProgressToleranceDays: 1,
    uidHighWaterMark: 1000,
    importSequence: 0,
    outlineBase: 1,
    sourceFormat: 'grs',
    scheduleDataTimeZone: 'UTC+00:00',
    carry: {},
    carryElements: [],
  },
  calendars: [EVERY_DAY_WORKED],
  tasks,
  resources: [],
  assignments: [],
  taskGroups: groups,
  taskGroupMembers: members,
  taskVisuals: visuals,
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
})

// Spec: T-077, BO-1
const SCREEN = { width: 1280, height: 800, appHeaderHeight: 48, scrollbarThickness: 8, propertyPanelWidth: 0 }

// Spec: FR-039, FR-048
const LIGHT_VIEWER = { themePreference: 'light', guideCursorMode: 'none' } as const

const day = (d: number): string => `2026-03-${String(d).padStart(2, '0')}T00:00:00`
// Why: an end is written at the day's close (WT-2, WT-4); a date alone or 00:00 is read by FR-054 as the day before (RV-1, RV-6).
const endOfDay = (d: number): string => `2026-03-${String(d).padStart(2, '0')}T17:00:00`

// Spec: FR-017
const xOfDay = (d: number, regions: { taskGroupArea: { x: number } }, pxPerDay: number): number =>
  regions.taskGroupArea.x + (d - 1) * pxPerDay

interface Drawn {
  readonly schedule: Schedule
  readonly settings: DocumentSettings
  readonly regions: ReturnType<typeof regionsFromScreen>
  readonly layout: ScheduleLayout
  readonly geometry: ReturnType<typeof geometryFromLayout>
}

// Summary: draws one pass of PI-35, PI-5 and PI-6, creating the task groups in
// the sorted order of taskGroupIds, so that g1 is the topmost.
const draw = (
  tasks: readonly Task[],
  taskGroupIds: readonly string[],
  visuals: readonly TaskVisual[],
  over: Readonly<Record<string, unknown>> = {},
  statusDate: string | null = null,
  allTaskGroups: readonly string[] = taskGroupIds,
): Drawn => {
  const ids = [...new Set([...taskGroupIds, ...allTaskGroups])].sort()
  const groups = ids.map((id, i) => taskGroup(id, i))
  const members: TaskGroupMember[] = tasks.map((t, i) => ({
    taskUid: t.uid,
    taskGroupId: taskGroupIds[i] ?? ids[0] ?? 'g1',
  }))
  const schedule = scheduleOf(tasks, groups, members, visuals, statusDate)
  // Why: scrollDate (S-77) pins the left edge of the Task Group Lanes, so the axis is
  // fixed and a case can state the x it expects.
  const settings = settingsOf({
    zoomX: 10,
    scrollDate: day(1),
    stackDirection: 'down',
    displayScale: DEFAULT_DISPLAY_SCALE,
    ...over,
  })
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null)
  return { schedule, settings, regions, layout, geometry }
}

const placementOf = (drawn: Drawn, uid: number) => {
  const found = drawn.layout.placements.find((p) => p.taskUid === uid)
  if (found === undefined) throw new Error(`this zoom drew no Task ${uid}`)
  return found
}

const taskGroupByIdOf = (drawn: Drawn, taskGroupId: string) => {
  const found = drawn.layout.taskGroups.find((r) => r.taskGroupId === taskGroupId)
  if (found === undefined) throw new Error(`this zoom drew no task group ${taskGroupId}`)
  return found
}

const geometryOf = (drawn: Drawn, uid: number) => {
  const found = drawn.geometry.tasks.find((t) => t.taskUid === uid)
  if (found === undefined) throw new Error(`no geometry for Task ${uid}`)
  return found
}

const outlineOf = (bar: ReturnType<typeof geometryOf>['plan']): Path => {
  if (bar === null || bar.form !== 'outline') throw new Error('this bar is not an outline')
  return bar.points
}

const lineOf = (bar: ReturnType<typeof geometryOf>['plan']) => {
  if (bar === null || bar.form !== 'line') throw new Error('this bar is not a line')
  return bar
}

const MS_PER_DAY = 86400000

// Why: no zone is converted (FR-054), so the UTC fields are the calendar day.
const calendarDayOf = (utc: number): CalendarDay => {
  const at = new Date(utc)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

const utcOf = (at: CalendarDay): number => Date.UTC(at.year, at.month - 1, at.day)

const plusDays = (at: CalendarDay, days: number): CalendarDay =>
  calendarDayOf(utcOf(at) + days * MS_PER_DAY)

// Why: 0 is Sunday, the numbering AT-17 gives Project.weekStartDay.
const weekdayOf = (at: CalendarDay): number => new Date(utcOf(at)).getUTCDay()

type RulerRow = 'year' | 'month' | 'week' | 'day'

const isTickOf = (row: RulerRow, at: CalendarDay, weekStart: number): boolean => {
  if (row === 'year') return at.month === 1 && at.day === 1
  if (row === 'month') return at.day === 1
  if (row === 'week') return weekdayOf(at) === weekStart
  return true
}

interface DrawnLine {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

const LINE_TAG = /<line x1="(-?[\d.]+)" y1="(-?[\d.]+)" x2="(-?[\d.]+)" y2="(-?[\d.]+)"/g

const linesOf = (svg: string): readonly DrawnLine[] => {
  const out: DrawnLine[] = []
  for (const found of svg.matchAll(LINE_TAG)) {
    const x1 = Number(found[1])
    const y1 = Number(found[2])
    const x2 = Number(found[3])
    const y2 = Number(found[4])
    // Why: a group that did not take part reads as NaN rather than as a coordinate.
    if ([x1, y1, x2, y2].some((n) => Number.isNaN(n))) continue
    out.push({ x1, y1, x2, y2 })
  }
  return out
}

// Why: a drawn coordinate is rounded to two places, so this is its slack.
const HALF_A_ROUNDING = 0.02

const isVertical = (line: DrawnLine): boolean => Math.abs(line.x1 - line.x2) <= HALF_A_ROUNDING

const xsOf = (lines: readonly DrawnLine[]): readonly number[] =>
  lines.map((line) => line.x1).sort((a, b) => a - b)

// Why: a row's ticks stop at its own foot, so the finest row is the one reaching the
// band's foot; no table states how many rows a step has.
const finestRowTicksOf = (svg: string, band: ScreenRect): readonly number[] =>
  xsOf(
    linesOf(svg).filter(
      (line) =>
        isVertical(line) &&
        Math.abs(Math.max(line.y1, line.y2) - (band.y + band.height)) <= HALF_A_ROUNDING,
    ),
  )

const expectedTicksOf = (
  layout: ScheduleLayout,
  band: ScreenRect,
  row: RulerRow,
  weekStart: number,
): readonly number[] => {
  const from = dateAtX(layout, band.x)
  if (from === null) throw new Error('this layout has no origin day to count from')
  const out: number[] = []
  const span = Math.ceil(band.width / layout.pxPerDay) + 1
  for (let step = 0; step <= span; step += 1) {
    const at = plusDays(from, step)
    if (!isTickOf(row, at, weekStart)) continue
    const x = xFromDay(layout, at)
    // Why: the band draws a tick that stands on it and stops at its right edge.
    if (x < band.x || x >= band.x + band.width) continue
    out.push(x)
  }
  return out
}

const sameTicks = (
  drawn: readonly number[],
  expected: readonly number[],
  where: string,
): void => {
  expect(
    drawn.length,
    `${where}: ${drawn.length} ticks drawn where LF-1's interval puts ${expected.length}`,
  ).toBe(expected.length)
  for (const [index, x] of drawn.entries()) {
    expect(x, `${where}: tick ${index}`).toBeCloseTo(expected[index] ?? Number.NaN, 1)
  }
}

const PX_PER_DAY_AT_1X = SETTINGS_CONSTANTS.pxPerDayAt1x
const FONT_MIN = SETTINGS_CONSTANTS.fontMin
const RULER_FONT = SETTINGS_DEFAULTS['rulerFontSizePx'] as number

// Spec: T-209, S-108, FR-054
const WEEK_START_DEFAULT = DEFAULT_CALENDAR_VALUES['S-108']

// Why: the font is part of the FR-017 test (pxPerDay / (font / S-8)); leaving it out
// once let a sample drift a whole step from its boundary.
const pxPerDayReaching = (threshold: number, rulerFontSizePx: number): number =>
  threshold * ((rulerFontSizePx * DISPLAY_RATIO) / FONT_MIN)

const TIER_MONTH_PX = pxPerDayReaching(
  SETTINGS_CONSTANTS.rulerTierPxPerDayMonth,
  RULER_FONT,
)
const TIER_WEEK_PX = pxPerDayReaching(
  SETTINGS_CONSTANTS.rulerTierPxPerDayWeek,
  RULER_FONT,
)
const TIER_DAY_PX = pxPerDayReaching(
  SETTINGS_CONSTANTS.rulerTierPxPerDayDay,
  RULER_FONT,
)

const ONE_TASK_SCHEDULE = scheduleOf(
  [task({ uid: 1, name: 'A', start: day(2), finish: endOfDay(6) })],
  [taskGroup('g1', 0)],
  [{ taskUid: 1, taskGroupId: 'g1' }],
  [taskVisual(1)],
  null,
)

// Why: a task group carrying nothing, so a vertical line in the Task Group Lanes can
// only be a grid line.
const NO_TASK_SCHEDULE = scheduleOf([], [taskGroup('g1', 0)], [], [], null)

const withWeekStart = (weekStartDay: number | null): Schedule => ({
  ...ONE_TASK_SCHEDULE,
  project: { ...ONE_TASK_SCHEDULE.project, weekStartDay },
})

interface RulerFrame {
  readonly svg: string
  readonly band: ScreenRect
  readonly taskGroupArea: ScreenRect
  readonly layout: ScheduleLayout
  readonly settings: DocumentSettings
}

const rulerAt = (
  pxPerDay: number,
  over: Readonly<Record<string, unknown>> = {},
  schedule: Schedule = ONE_TASK_SCHEDULE,
): RulerFrame => {
  // Why: S-1 keeps its default and the zoom carries the change, so every sample is a
  // zoom a reader can reach (S-54 to S-55).
  const settings = settingsOf({
    zoomX: pxPerDay / (PX_PER_DAY_AT_1X * DISPLAY_RATIO),
    scrollDate: day(1),
    displayScale: DEFAULT_DISPLAY_SCALE,
    ...over,
  })
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null)
  const svg = svgFromSchedule(
    schedule,
    settings,
    layout,
    geometry,
    regions,
    emptySelection(),
    // Why: EP-14's other arm; these cases are about the picture a reader sees.
    'screen',
    LIGHT_VIEWER,
  )
  expect(layout.pxPerDay, 'the sample missed the day width it names').toBeCloseTo(pxPerDay, 9)
  return { svg, band: regions.timeRuler, taskGroupArea: regions.taskGroupArea, layout, settings }
}

// Why: a thousandth to either side of each boundary, so a sample that drifts off its
// step is caught by the tier assertion.
const TIER_SAMPLES: ReadonlyArray<readonly [RulerTier, RulerRow, number, string]> = [
  ['year', 'year', TIER_MONTH_PX * 0.5, 'half the day width that opens the month row'],
  ['year', 'year', TIER_MONTH_PX * 0.999, 'a thousandth under S-83'],
  ['yearMonth', 'month', TIER_MONTH_PX * 1.001, 'a thousandth over S-83'],
  ['yearMonth', 'month', TIER_WEEK_PX * 0.999, 'a thousandth under S-84'],
  ['yearMonthWeek', 'week', TIER_WEEK_PX * 1.001, 'a thousandth over S-84'],
  ['yearMonthWeek', 'week', TIER_DAY_PX * 0.999, 'a thousandth under S-85'],
  ['yearMonthDayWeekday', 'day', TIER_DAY_PX * 1.001, 'a thousandth over S-85'],
  ['yearMonthDayWeekday', 'day', TIER_DAY_PX * 1.5, 'half again over S-85'],
]

// Spec: SWS-1, FR-017, T-221, LF-1
// Why: LF-1 fixes an interval per row, seen only in the band the ruler draws, so ticks
// are read out of the SVG and the expected set is built from the calendar.
describe('SWS-1 -- decide the interval between two ticks (FR-017)', () => {
  // Spec: IMPS-703
  it(
    swsCase({
      sws: 'SWS-1',
      level: 'Integration',
      covers: ['LF-1'],
      given: 'a day width on either side of each of the three thresholds',
      when: 'svgFromSchedule draws the ruler band',
      then: 'the finest row ticks at its own fixed interval and at no other',
    }),
    () => {
      // Why: set equality carries the LF-1 MUST NOT: a thinned row drops ticks the calendar
      // puts back, and a finer row adds ticks it does not name.
      mentions(T221, 'LF-1', 'MUST NOT', 'FR-054', 'Project.weekStartDay')
      for (const [tier, row, pxPerDay, where] of TIER_SAMPLES) {
        const frame = rulerAt(pxPerDay)
        expect(frame.layout.tier, where).toBe(tier)
        const drawn = finestRowTicksOf(frame.svg, frame.band)
        // Why: one tick is the floor: at the widest day the year row covers, a screen holds a
        // single new year; zero would agree with an empty expectation.
        expect(drawn.length, `${where}: the band drew no ticks to judge`).toBeGreaterThanOrEqual(1)
        sameTicks(drawn, expectedTicksOf(frame.layout, frame.band, row, WEEK_START_DEFAULT), where)
      }
    },
  )

  // Spec: IMPS-761
  it(
    swsCase({
      sws: 'SWS-1',
      level: 'Integration',
      covers: ['LF-1'],
      given: 'each of the seven days Project.weekStartDay can name',
      when: 'svgFromSchedule draws the week row of the band',
      then: 'every tick falls on that day, seven days apart',
    }),
    () => {
      // Why: AT-17 numbers weekStartDay 0 (Sunday) to 6 (Saturday), so all seven are
      // walked.
      mentions(T221, 'LF-1', 'FR-054', 'Project.weekStartDay')
      const pxPerDay = TIER_WEEK_PX * 1.001
      for (const weekStart of [0, 1, 2, 3, 4, 5, 6]) {
        const where = `weekStartDay ${weekStart}`
        const frame = rulerAt(pxPerDay, {}, withWeekStart(weekStart))
        expect(frame.layout.tier, where).toBe('yearMonthWeek')
        const drawn = finestRowTicksOf(frame.svg, frame.band)
        expect(drawn.length, `${where}: the band drew no ticks to judge`).toBeGreaterThan(1)
        sameTicks(drawn, expectedTicksOf(frame.layout, frame.band, 'week', weekStart), where)
        for (const [index, x] of drawn.entries()) {
          if (index === 0) continue
          expect(x - (drawn[index - 1] ?? Number.NaN), `${where}: gap ${index}`).toBeCloseTo(
            7 * frame.layout.pxPerDay,
            1,
          )
        }
      }
      const unnamed = rulerAt(pxPerDay, {}, withWeekStart(null))
      sameTicks(
        finestRowTicksOf(unnamed.svg, unnamed.band),
        expectedTicksOf(unnamed.layout, unnamed.band, 'week', WEEK_START_DEFAULT),
        'the document names no week start',
      )
    },
  )

  it(
    swsCase({
      sws: 'SWS-1',
      level: 'Integration',
      covers: ['LF-1'],
      given: 'date grid lines turned on at the week step and at the day step',
      when: 'svgFromSchedule draws the frame',
      then: 'the lines in the Task Group Lanes stand exactly where the finest row ticks',
    }),
    () => {
      // Why: the document carries no Task, so with S-67 on any vertical line in the Task
      // Group Area is one of the FR-089 grid lines.
      const steps: ReadonlyArray<readonly [RulerTier, number]> = [
        ['yearMonthWeek', TIER_WEEK_PX * 1.001],
        ['yearMonthDayWeekday', TIER_DAY_PX * 1.001],
      ]
      for (const [tier, pxPerDay] of steps) {
        const frame = rulerAt(pxPerDay, { isDateGridLinesVisible: true }, NO_TASK_SCHEDULE)
        expect(frame.layout.tier).toBe(tier)
        const area = frame.taskGroupArea
        const grid = xsOf(
          linesOf(frame.svg).filter(
            (line) =>
              isVertical(line) &&
              Math.min(line.y1, line.y2) >= area.y - HALF_A_ROUNDING &&
              Math.max(line.y1, line.y2) <= area.y + area.height + HALF_A_ROUNDING,
          ),
        )
        const ticks = finestRowTicksOf(frame.svg, frame.band)
        // Why: two empty sets agree, so the ruler must speak first: FR-089 is measured against
        // ticks that are really there.
        expect(ticks.length, `${tier}: the band drew no ticks to measure against`).toBeGreaterThan(1)
        sameTicks(grid, ticks, `${tier}: FR-089's lines`)
      }
    },
  )
})

// Spec: SWS-2, FR-003, T-221, LF-2, LF-3
const bandDocuments = (): ReadonlyArray<readonly [string, Drawn]> => {
  const long = (uid: number, from: number, to: number) =>
    task({ uid, name: `t${uid}`, start: day(from), finish: endOfDay(to) })
  return [
    [
      'three lanes of rectangles',
      draw(
        [long(1, 2, 20), long(2, 3, 21), long(3, 4, 22)],
        ['g1', 'g1', 'g1'],
        [taskVisual(1), taskVisual(2), taskVisual(3)],
      ),
    ],
    [
      'one lane holding a rectangle and a taller milestone, then an empty task group',
      draw(
        [long(1, 2, 4), task({ uid: 2, name: 'm', start: day(10), finish: endOfDay(10), milestone: true })],
        ['g1', 'g1'],
        [taskVisual(1), taskVisual(2, { shapeKind: 'milestone', milestoneGlyph: 'diamond' })],
        {},
        null,
        ['g1', 'g2'],
      ),
    ],
    [
      'task groups of unequal height at twice the vertical zoom',
      draw(
        [long(1, 2, 20), long(2, 3, 21), long(3, 2, 20)],
        ['g1', 'g1', 'g2'],
        [taskVisual(1), taskVisual(2), taskVisual(3)],
        { zoomY: 2 },
      ),
    ],
  ]
}

describe('SWS-2 -- decide a task group band and where it sits (FR-003)', () => {
  // Spec: VG-1, VG-6, VG-7, IMPS-1902
  it(
    swsCase({
      sws: 'SWS-2',
      level: 'Integration',
      covers: ['LF-2'],
      given: 'task groups of one, two and three lanes, and a task group holding no Task',
      when: 'layoutFromSchedule places them',
      then: 'each band is the sum of its lanes plus one VG-2 gap under each lane',
    }),
    () => {
      // Step: LF-2 sums each lane to its drawn edge (VG-5) and adds one VG-2 gap per lane, the bottom one included.
      mentions(T221, 'LF-2', 'VG-5', 'VG-2', '段数と同じ数')
      mentions(T221, 'LF-3', 'HF-1', '帯高の床に数えない')
      mentions(T051, 'HF-19', '`GRS` は、`HF-1` の格子（`HF-4` の並び、2 段）が縦に取る高さを、タスクグループの帯高の下限にしないこと。')
      let belowTheLattice = 0
      for (const [name, drawn] of bandDocuments()) {
        for (const taskGroup of drawn.layout.taskGroups) {
          const lanes = Math.max(taskGroup.stackCount, 1)
          let sum = 0
          for (let lane = 0; lane < lanes; lane += 1) {
            const onLane = drawn.layout.placements.filter(
              (p) => p.taskGroupId === taskGroup.taskGroupId && p.stack === lane,
            )
            // Step: a lane with no Task takes the rectangle; a drawn one reaches its border's outer edge.
            sum += onLane.length === 0
              ? drawn.layout.rectangleHeight + SETTINGS_CONSTANTS.planStroke * DISPLAY_RATIO
              : Math.max(...onLane.map((p) => p.height)) + SETTINGS_CONSTANTS.planStroke * DISPLAY_RATIO
          }
          const gap = SETTINGS_CONSTANTS.stackGap * 2 + SETTINGS_CONSTANTS.dependencyWidth * DISPLAY_RATIO
          const lf2 = sum + gap * lanes
          if (lf2 < CONTROL_LATTICE) belowTheLattice += 1
          expect(taskGroup.height, `${name}: task group ${taskGroup.taskGroupId}`).toBeCloseTo(lf2, 6)
        }
      }
      expect(
        belowTheLattice,
        'no band summed below the lattice, so this case could not tell HF-19 (MUST NOT) from a floor',
      ).toBeGreaterThan(0)
    },
  )

  it(
    swsCase({
      sws: 'SWS-2',
      level: 'Integration',
      covers: ['LF-2', 'LF-3'],
      given: 'a task group on which no Task is drawn at all',
      when: 'layoutFromSchedule places it',
      then: 'it takes one rectangle lane and one VG-2 gap, and is not raised to its controls',
    }),
    () => {
      // Spec: SWS-2, HF-19
      const drawn = draw(
        [task({ uid: 1, name: 'a', start: day(2), finish: endOfDay(20) })],
        ['g1'],
        [taskVisual(1)],
        {},
        null,
        ['g1', 'g2', 'g3'],
      )
      const empty = taskGroupByIdOf(drawn, 'g2')
      expect(empty.stackCount).toBe(0)
      const gap = SETTINGS_CONSTANTS.stackGap * 2 + SETTINGS_CONSTANTS.dependencyWidth * DISPLAY_RATIO
      const oneLane = drawn.layout.rectangleHeight + SETTINGS_CONSTANTS.planStroke * DISPLAY_RATIO + gap
      expect(empty.height, 'LF-2: an empty lane is the rectangle, plus one VG-2 gap').toBeCloseTo(oneLane, 6)
      expect(empty.height, 'the same band as the one-lane task group above it').toBeCloseTo(taskGroupByIdOf(drawn, 'g1').height, 6)
      expect(empty.height, 'HF-19 (MUST NOT): the lattice is not its floor').toBeLessThan(CONTROL_LATTICE)
      // Why: the rectangle's own height is FR-094's chain, not a number of its own.
      expect(drawn.layout.rectangleHeight).toBeCloseTo(
        SETTINGS_CONSTANTS.basePlanHeight *
          drawn.settings.zoomY *
          SETTINGS_CONSTANTS.shapeHeightOf.rectangle *
          DISPLAY_RATIO,
        6,
      )
    },
  )

  it(
    swsCase({
      sws: 'SWS-2',
      level: 'Integration',
      covers: ['LF-3'],
      given: 'several task groups of different band heights',
      when: 'layoutFromSchedule places them',
      then: 'each top is the one above plus that band and taskGroupGap',
    }),
    () => {
      mentions(T221, 'LF-3', 'taskGroupGap')
      for (const [name, drawn] of bandDocuments()) {
        const taskGroups = drawn.layout.taskGroups
        expect(taskGroups.length, name).toBeGreaterThan(0)
        expect(taskGroups[0]?.y, `${name}: the first task group starts at the Task Group Lanes`).toBeCloseTo(
          drawn.regions.taskGroupArea.y,
          6,
        )
        for (let i = 1; i < taskGroups.length; i += 1) {
          const above = taskGroups[i - 1]
          const here = taskGroups[i]
          if (above === undefined || here === undefined) throw new Error('unreachable')
          expect(here.y, `${name}: task group ${here.taskGroupId}`).toBeCloseTo(
            above.y + above.height + SETTINGS_CONSTANTS.taskGroupGap,
            6,
          )
        }
      }
    },
  )

  // Spec: IMPS-1682, IMPS-1685
  it(
    swsCase({
      sws: 'SWS-2',
      level: 'Integration',
      covers: ['LF-3'],
      given: 'a task group holding only an arrow, which is drawn thinner than a rectangle',
      when: 'layoutFromSchedule places it',
      then: 'the band stands on the rectangle floor and not on the controls',
    }),
    () => {
      // Spec: LF-3, SH-3, HF-19
      const drawn = draw(
        [task({ uid: 1, name: 'arrow', start: day(2), finish: endOfDay(4) })],
        ['g1'],
        [taskVisual(1, { shapeKind: 'arrow' })],
      )
      const placed = placementOf(drawn, 1)
      expect(placed.height, 'the arrow itself is drawn shorter than a rectangle').toBeLessThan(
        drawn.layout.rectangleHeight,
      )
      // Step: LF-3's rectangle height reaches VG-5's drawn edge -- the border's outer rim, half a stroke each side.
      const rectangleTall = drawn.layout.rectangleHeight + SETTINGS_CONSTANTS.planStroke * DISPLAY_RATIO
      // Step: LF-2's own sum for the arrow's one lane: its lifted name (OC-10) and line, then one VG-2 gap.
      const taskGroup = taskGroupByIdOf(drawn, 'g1')
      const gap = SETTINGS_CONSTANTS.stackGap * 2 + SETTINGS_CONSTANTS.dependencyWidth * DISPLAY_RATIO
      const lf2 = placed.y - taskGroup.y + placed.height + gap
      expect(lf2, 'the premise: the arrow lane sums below the rectangle floor').toBeLessThan(rectangleTall)
      expect(taskGroup.height).toBeCloseTo(Math.max(lf2, rectangleTall), 6)
      expect(taskGroup.height, 'HF-19 (MUST NOT): the controls are no floor').toBeLessThan(CONTROL_LATTICE)
    },
  )

  // Spec: IMPS-1334
  it(
    swsCase({
      sws: 'SWS-2',
      level: 'Integration',
      covers: ['LF-16'],
      given: 'a last task group lower than the lattice, and a last task group taller than it',
      when: 'layoutFromSchedule places them',
      then: 'the first reserves the lattice less its band under it, and the second reserves nothing',
    }),
    () => {
      mentions(T221, 'LF-16', 'S-138', 'S-243', 'S-235', '0 とする')
      const long = (uid: number, from: number, to: number) =>
        task({ uid, name: `t${uid}`, start: day(from), finish: endOfDay(to) })
      const bandsOf = (drawn: Drawn): number => drawn.layout.taskGroups.reduce((sum, taskGroup) => sum + taskGroup.height, 0)
      const lowLast = draw(
        [long(1, 2, 20), long(2, 3, 21), long(3, 2, 20)],
        ['g1', 'g1', 'g2'],
        [taskVisual(1), taskVisual(2), taskVisual(3)],
      )
      const last = taskGroupByIdOf(lowLast, 'g2')
      expect(last.height, 'the premise: the last band is lower than the lattice').toBeLessThan(CONTROL_LATTICE)
      expect(lowLast.layout.contentHeight).toBeCloseTo(bandsOf(lowLast) + CONTROL_LATTICE - last.height, 6)
      const tallLast = draw(
        [long(1, 2, 20), long(2, 2, 20), long(3, 3, 21)],
        ['g1', 'g2', 'g2'],
        [taskVisual(1), taskVisual(2), taskVisual(3)],
      )
      expect(taskGroupByIdOf(tallLast, 'g2').height, 'the premise: two lanes clear the lattice').toBeGreaterThan(CONTROL_LATTICE)
      expect(tallLast.layout.contentHeight).toBeCloseTo(bandsOf(tallLast), 6)
    },
  )

  // Spec: LF-14, FR-098
  // Why: filed under SWS-2 though no SW_SPEC node names LF-14: LF-14 is written as an
  // amendment to LF-3, which SWS-2 owns.
  it(
    swsCase({
      sws: 'SWS-2',
      level: 'Integration',
      covers: ['LF-14'],
      given: 'four task groups, the third of them pinned (S-126 of table T-203)',
      when: 'layoutFromSchedule places them',
      then: 'the pinned task group stands at the top of the Task Group Lanes and the rest close up one band and one taskGroupGap below it',
    }),
    () => {
      mentions(T221, 'LF-14', 'taskGroupGap', 'LF-2', 'LF-3', 'Task Group Lanes')
      const rows = ['g1', 'g2', 'g3', 'g4']
      const drawn = draw(
        rows.map((_id, index) =>
          task({ uid: index + 1, name: `t${index}`, start: day(2), finish: endOfDay(20) }),
        ),
        rows,
        rows.map((_id, index) => taskVisual(index + 1)),
        { pinnedTaskGroupIds: ['g3'] },
      )

      const pinned = taskGroupByIdOf(drawn, 'g3')
      expect(pinned.y, 'FR-098: the band stands at the top of the Task Group Lanes').toBeCloseTo(
        drawn.regions.taskGroupArea.y,
        6,
      )

      // Why: one task group in the band, so LF-14's sum has no taskGroupGap in it yet.
      const band = pinned.height
      const scrolling = ['g1', 'g2', 'g4'].map((taskGroupId) => taskGroupByIdOf(drawn, taskGroupId))
      expect(
        scrolling[0]?.y,
        'LF-14: the remainder begins below the band by one taskGroupGap',
      ).toBeCloseTo(drawn.regions.taskGroupArea.y + band + SETTINGS_CONSTANTS.taskGroupGap, 6)

      for (let index = 1; index < scrolling.length; index += 1) {
        const above = scrolling[index - 1]
        const here = scrolling[index]
        if (above === undefined || here === undefined) throw new Error('unreachable')
        expect(here.y, `LF-14: the hole g3 left is closed up at ${here.taskGroupId}`).toBeCloseTo(
          above.y + above.height + SETTINGS_CONSTANTS.taskGroupGap,
          6,
        )
      }
    },
  )
})

// Spec: SWS-3, FR-009, LF-5, T-222
// Why: one scenario per T-222 row: linkType picks the family (T-018: FS and SF are
// opposing, FF and SS same-side) and the task groups pick the vertical relation.
const routeScenarios = (): Readonly<Record<string, Drawn>> => {
  const t = (uid: number, from: number, to: number, deps: ReadonlyArray<readonly [number, number]> = []) =>
    task({
      uid,
      name: `t${uid}`,
      start: day(from),
      finish: endOfDay(to),
      dependencies: deps.map(([p, k]) => dependency(p, k)),
    })
  const pair = (a: Task, b: Task, rows: readonly [string, string], over: Readonly<Record<string, unknown>> = {}) =>
    draw([a, b], rows, [taskVisual(a.uid), taskVisual(b.uid)], over)

  return {
    'RP-1': pair(t(1, 2, 6), t(2, 12, 16, [[1, 1]]), ['g1', 'g1']),
    'RP-2': pair(t(1, 2, 6), t(2, 12, 16, [[1, 1]]), ['g1', 'g2']),
    'RP-3': pair(t(1, 2, 6), t(2, 12, 16, [[1, 1]]), ['g2', 'g1']),
    'RP-4': pair(t(1, 2, 6), t(2, 3, 5, [[1, 1]]), ['g1', 'g2']),
    'RP-5': pair(t(1, 12, 16), t(2, 2, 6, [[1, 1]]), ['g2', 'g1']),
    'RP-6': pair(t(1, 2, 6), t(2, 12, 16, [[1, 0]]), ['g1', 'g2']),
    'RP-7': pair(t(1, 2, 6), t(2, 12, 16, [[1, 0]]), ['g2', 'g1']),
    'RP-8': pair(t(1, 2, 6), t(2, 12, 16, [[1, 0]]), ['g1', 'g1']),
  }
}

const dependencyOf = (drawn: Drawn) => {
  const [only, ...rest] = drawn.geometry.dependencies
  if (only === undefined) throw new Error('the scenario drew no dependency line')
  if (rest.length > 0) throw new Error('the scenario drew more than one dependency line')
  return only
}

describe('SWS-3 -- draw the route of a dependency line (FR-009)', () => {
  // Spec: IMPS-315
  it(
    swsCase({
      sws: 'SWS-3',
      level: 'Integration',
      covers: ['RP-1', 'RP-2', 'RP-3', 'RP-4', 'RP-5', 'RP-6', 'RP-7', 'RP-8'],
      given: 'one document per situation table T-222 distinguishes',
      when: 'geometryFromLayout routes the single dependency of each',
      then: 'the row of table T-222 that is chosen, and its bend count, are the row written for it',
    }),
    () => {
      // Why: the bend count is read from T-222's own column, not transcribed.
      const scenarios = routeScenarios()
      for (const row of T222.rows) {
        const drawn = scenarios[row.id]
        expect(drawn, `no scenario is written for table T-222 row ${row.id}`).toBeDefined()
        if (drawn === undefined) continue
        const line = dependencyOf(drawn)
        expect(line.pattern, `the scenario for ${row.id} was routed as ${line.pattern}`).toBe(row.id)
        expect(line.points.length - 2, `bends of ${row.id}`).toBe(bendsOf(row.id))
      }
    },
  )



  it(
    swsCase({
      sws: 'SWS-3',
      level: 'Integration',
      covers: ['LF-5'],
      given: 'four-bend routes running down, running up, and inside one lane',
      when: 'geometryFromLayout routes each',
      then: 'the corridor sits where LF-5 puts it for that direction',
    }),
    () => {
      mentions(T221, 'LF-5', 'VG-2', '隙間の半分')
      const corridorOf = (drawn: Drawn): number => {
        const line = dependencyOf(drawn)
        const mid = line.points[2]
        const back = line.points[3]
        if (mid === undefined || back === undefined) throw new Error('not a four-bend route')
        expect(mid.y, 'the corridor is one horizontal run').toBeCloseTo(back.y, 6)
        return mid.y
      }

      const down = draw(
        [
          task({ uid: 1, name: 'p', start: day(2), finish: endOfDay(6) }),
          task({ uid: 2, name: 's', start: day(3), finish: endOfDay(5), dependencies: [dependency(1, 1)] }),
        ],
        ['g1', 'g2'],
        [taskVisual(1), taskVisual(2)],
      )
      const dp = placementOf(down, 1)
      const ds = placementOf(down, 2)
      expect(corridorOf(down), 'running down').toBeCloseTo(
        (dp.y + dp.planHeight + ds.y) / 2,
        6,
      )

      const up = draw(
        [
          task({ uid: 1, name: 'p', start: day(12), finish: endOfDay(16) }),
          task({ uid: 2, name: 's', start: day(2), finish: endOfDay(6), dependencies: [dependency(1, 1)] }),
        ],
        ['g2', 'g1'],
        [taskVisual(1), taskVisual(2)],
      )
      const up1 = placementOf(up, 1)
      const up2 = placementOf(up, 2)
      expect(corridorOf(up), 'running up').toBeCloseTo(
        (up2.y + up2.planHeight + up1.y) / 2,
        6,
      )

      // Why: one lane with the two Tasks touching, so RP-1's clearance is not met and the
      // route drops into the corridor of LF-5's third clause.
      const same = draw(
        [
          task({ uid: 1, name: 'p', start: day(2), finish: endOfDay(5) }),
          task({ uid: 2, name: 's', start: day(6), finish: endOfDay(9), dependencies: [dependency(1, 1)] }),
        ],
        ['g1', 'g1'],
        [taskVisual(1), taskVisual(2)],
      )
      const lane = placementOf(same, 1)
      expect(placementOf(same, 2).stack, 'both are on one lane').toBe(lane.stack)
      const outline = same.geometry.tasks.find((one) => one.taskUid === 1)?.plan
      if (outline === undefined || outline === null || outline.form !== 'outline') {
        throw new Error('the predecessor draws no outlined plan')
      }
      const drawnBottom =
        Math.max(...outline.points.map((point) => point.y)) + (SETTINGS_CONSTANTS.planStroke * DISPLAY_RATIO) / 2
      const gap = SETTINGS_CONSTANTS.stackGap * 2 + SETTINGS_CONSTANTS.dependencyWidth * DISPLAY_RATIO
      expect(corridorOf(same), 'inside one lane').toBeCloseTo(drawnBottom + gap / 2, 6)
    },
  )

  it(
    swsCase({
      sws: 'SWS-3',
      level: 'Integration',
      covers: ['RP-1', 'RP-4'],
      given: 'two Tasks on one lane whose edges are exactly the entry run apart, and one pixel less',
      when: 'geometryFromLayout routes the dependency between them',
      then: 'the clearance is met at the boundary and RP-4 takes over below it',
    }),
    () => {
      // Why: at a day exactly the entry run wide, one day of clear air between the bars is
      // exactly RP-1's at-least boundary.
      const entryRun = SETTINGS_CONSTANTS.dependencyLeadIn
      const at = (pxPerDay: number): string => {
        const drawn = draw(
          [
            // Why: p runs 8 days, not 4: T-273 counts S-31 in its fit rows, so a 4-day p pushes
            // its name onto s's lane; the clear day between the bars is unchanged.
            task({ uid: 1, name: 'p', start: day(2), finish: endOfDay(9) }),
            task({ uid: 2, name: 's', start: day(11), finish: endOfDay(13), dependencies: [dependency(1, 1)] }),
          ],
          ['g1', 'g1'],
          [taskVisual(1), taskVisual(2)],
          { zoomX: pxPerDay / PX_PER_DAY_AT_1X },
        )
        const p = placementOf(drawn, 1)
        const s = placementOf(drawn, 2)
        expect(s.stack, 'both are on one lane').toBe(p.stack)
        expect(s.x - (p.x + p.width), 'the clearance under test').toBeCloseTo(
          pxPerDay * DISPLAY_RATIO,
          6,
        )
        return dependencyOf(drawn).pattern
      }
      expect(at(entryRun), 'exactly the entry run apart').toBe('RP-1')
      expect(at(entryRun + 1), 'wider than the entry run').toBe('RP-1')
      expect(at(entryRun - 1), 'narrower than the entry run').toBe('RP-4')
    },
  )

  // Spec: IMPS-1326, IMPS-1335
  it(
    swsCase({
      sws: 'SWS-3',
      level: 'Integration',
      covers: ['RP-2'],
      given: 'an opposing route to the next lane down with x2 right of x1',
      when: 'geometryFromLayout routes it',
      then: 'it bends four times: down at x1 to the LF-5 corridor, across, and down at x2, the shape of RP-4',
    }),
    () => {
      // Why: RP-2 now runs exit edge, x1, the LF-5 corridor, x2, entry edge (the RP-4 shape);
      // the midpoint clamp it once had is gone, so the case checks the four bends instead.
      const drawn = draw(
        [
          task({ uid: 1, name: 'p', start: day(2), finish: endOfDay(5) }),
          task({ uid: 2, name: 's', start: day(7), finish: endOfDay(12), dependencies: [dependency(1, 1)] }),
        ],
        ['g1', 'g2'],
        [taskVisual(1), taskVisual(2)],
        { zoomX: 26 / PX_PER_DAY_AT_1X },
      )
      const line = dependencyOf(drawn)
      expect(line.pattern).toBe('RP-2')
      const predecessor = placementOf(drawn, 1)
      const successor = placementOf(drawn, 2)
      const exitEdge = predecessor.x + predecessor.width
      const entryEdge = successor.x
      const entryRun = (SETTINGS_CONSTANTS.dependencyLeadIn as number) * DISPLAY_RATIO
      const exitRun = (SETTINGS_CONSTANTS.dependencyLeadOut as number) * DISPLAY_RATIO
      const x1 = exitEdge + exitRun
      const x2 = entryEdge - entryRun
      expect(x2, 'premise: RP-2 is the row where x2 is at or right of x1').toBeGreaterThanOrEqual(x1)
      expect(line.points.length - 2, 'RP-2 bends 4 times').toBe(4)
      const [exit, down, across, back, entryBend, entry] = line.points
      if (!exit || !down || !across || !back || !entryBend || !entry) throw new Error('not a four-bend route')
      expect(down.x, 'the first bend is at x1').toBeCloseTo(x1, 6)
      expect(down.y, 'leaving level from the exit edge').toBeCloseTo(exit.y, 6)
      expect(across.x, 'down at x1').toBeCloseTo(x1, 6)
      expect(back.y, 'the corridor is one horizontal run').toBeCloseTo(across.y, 6)
      // Why: LF-5 puts the corridor of two adjacent lanes at the middle of the two.
      expect(across.y, 'the LF-5 corridor').toBeCloseTo((predecessor.y + predecessor.planHeight + successor.y) / 2, 6)
      expect(back.x, 'across to x2').toBeCloseTo(x2, 6)
      expect(entryBend.x, 'down at x2').toBeCloseTo(x2, 6)
      expect(entryBend.y, 'entering level into the entry edge').toBeCloseTo(entry.y, 6)
      expect(entry.x, 'the entry edge').toBeCloseTo(entryEdge, 6)
    },
  )

  it(
    swsCase({
      sws: 'SWS-3',
      level: 'Integration',
      covers: ['RP-8'],
      given: 'a same-side dependency on one lane whose two verticals would land together',
      when: 'geometryFromLayout routes it',
      then: 'x1 is pushed out to x2 plus the exit run',
    }),
    () => {
      // Why: the runs are constants now; the day width is what brings the two verticals together.
      // Why: S-63 is on by default since CR-604, and the marker room it gives each label
      // lifts the successor to a second lane; the case pins it off to keep its one lane.
      const leadIn = SETTINGS_CONSTANTS.dependencyLeadIn
      const leadOut = SETTINGS_CONSTANTS.dependencyLeadOut
      const drawn = draw(
        [
          task({ uid: 1, name: 'p', start: day(9), finish: endOfDay(9) }),
          task({ uid: 2, name: 's', start: day(2), finish: endOfDay(8), dependencies: [dependency(1, 0)] }),
        ],
        ['g1', 'g1'],
        [taskVisual(1), taskVisual(2)],
        { zoomX: 1, isProgressMarkerVisible: false },
      )
      const line = dependencyOf(drawn)
      expect(line.pattern).toBe('RP-8')
      const predecessor = placementOf(drawn, 1)
      const successor = placementOf(drawn, 2)
      expect(successor.stack, 'both are on one lane').toBe(predecessor.stack)
      const entryRun = leadIn * DISPLAY_RATIO
      const exitRun = leadOut * DISPLAY_RATIO
      // Why: FF: both anchors are a right edge, so both runs go to the right.
      const x2 = successor.x + successor.width + entryRun
      const plainX1 = predecessor.x + predecessor.width + exitRun
      expect(Math.abs(plainX1 - x2), 'the scenario only bites when they are closer than the exit run')
        .toBeLessThan(exitRun)
      const pushed = line.points[1]
      if (pushed === undefined) throw new Error('the route has no first bend')
      expect(pushed.x).toBeCloseTo(x2 + exitRun, 6)
    },
  )
})

describe('SWS-4 -- make the vertices of what is drawn (FR-094)', () => {
  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-6'],
      given: 'a chevron whose notch is capped by its height, and one capped by its width',
      when: 'geometryFromLayout outlines the plan and the actual',
      then: 'the actual notch is the plan notch times actualOfPlan and is not capped a second time',
    }),
    () => {
      mentions(T221, 'LF-6', 'chevronNotchOfWidth', 'chevronNotchOfHeight', 'actualOfPlan')
      // Why: the notch is how far the point runs past the body: the second vertex of the
      // outline is the top edge stopping short of the tip.
      const notchOf = (points: Path): number => {
        const shoulder = points[1]
        const tip = points[2]
        if (shoulder === undefined || tip === undefined) throw new Error('not a chevron outline')
        return tip.x - shoulder.x
      }
      for (const [name, from, to] of [
        ['a wide chevron, so the height caps it', 2, 10],
        // Why: zero days wide, FR-001 keeps minShapeWidth and the width caps the plan notch,
        // which tells a second cap from none: the actual alone would use its greater width.
        ['a chevron of no duration, so the width caps it', 2, 2],
      ] as ReadonlyArray<readonly [string, number, number]>) {
        const drawn = draw(
          [
            task({
              uid: 1,
              name: 'c',
              start: day(from),
              finish: endOfDay(to),
              actualStart: day(2),
              stop: endOfDay(4),
            }),
          ],
          ['g1'],
          [taskVisual(1, { shapeKind: 'chevron' })],
        )
        const placed = placementOf(drawn, 1)
        const geometry = geometryOf(drawn, 1)
        const planNotch = Math.min(
          placed.width * SETTINGS_CONSTANTS.chevronNotchOfWidth,
          placed.planHeight * SETTINGS_CONSTANTS.chevronNotchOfHeight,
        )
        expect(notchOf(outlineOf(geometry.plan)), `${name}: the plan notch`).toBeCloseTo(
          planNotch,
          6,
        )
        expect(notchOf(outlineOf(geometry.actual)), `${name}: the actual notch`).toBeCloseTo(
          planNotch * SETTINGS_CONSTANTS.actualOfPlan,
          6,
        )
      }
    },
  )

  // Spec: IMPS-1688
  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-7', 'LF-8'],
      given: 'an arrow and an endpoint span, both drawn as a line',
      when: 'geometryFromLayout gives them a stroke, a head and end dots',
      then: 'each is the value LF-7 and LF-8 state, taken from its own setting',
    }),
    () => {
      mentions(T221, 'LF-8', 'thinStrokeWidth')
      mentions(T221, 'LF-7', 'thinArrowHeadLength', 'arrowHeadOfSpan', 'thinArrowHeadHeight', 'spanDotSize')

      {
        const drawn = draw(
          [task({ uid: 1, name: 'a', start: day(2), finish: endOfDay(10) })],
          ['g1'],
          [taskVisual(1, { shapeKind: 'arrow' })],
        )
        const placed = placementOf(drawn, 1)
        const line = lineOf(geometryOf(drawn, 1).plan)
        const stroke = SETTINGS_CONSTANTS.thinStrokeWidth * DISPLAY_RATIO
        expect(line.strokeWidth).toBeCloseTo(stroke, 6)

        const head = line.head
        expect(head, 'SH-3 is drawn with a head').not.toBeNull()
        if (head !== null) {
          const tip = head[0]
          const base = head[1]
          if (tip === undefined || base === undefined) throw new Error('not a head')
          expect(tip.x - base.x, 'head length').toBeCloseTo(
            Math.min(
              SETTINGS_CONSTANTS.thinArrowHeadLength * DISPLAY_RATIO,
              placed.width * SETTINGS_CONSTANTS.arrowHeadOfSpan,
            ),
            6,
          )
        }
      }

      const span = draw(
        [task({ uid: 1, name: 's', start: day(2), finish: endOfDay(10) })],
        ['g1'],
        [taskVisual(1, { shapeKind: 'endpointSpan' })],
      )
      const spanLine = lineOf(geometryOf(span, 1).plan)
      expect(spanLine.head, 'SH-4 has no head').toBeNull()
      expect(spanLine.dots.length, 'SH-4 has two ends').toBe(2)
      for (const dot of spanLine.dots) {
        expect(dot.radius).toBeCloseTo((SETTINGS_CONSTANTS.spanDotSize * DISPLAY_RATIO) / 2, 6)
      }
    },
  )

  // Spec: IMPS-1694, IMPS-1696, IMPS-398
  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-9'],
      given: 'a rectangle, which overlays its actual, and an arrow, which drops it below',
      when: 'geometryFromLayout places the actual bar',
      then: 'the overlay is centered in the plan and the drop clears it by actualGap',
    }),
    () => {
      mentions(T221, 'LF-9', 'actualGap')
      const started = { actualStart: day(2), stop: endOfDay(4) } as const

      const inside = draw(
        [task({ uid: 1, name: 'r', start: day(2), finish: endOfDay(10), ...started })],
        ['g1'],
        [taskVisual(1)],
      )
      const insidePlaced = placementOf(inside, 1)
      expect(insidePlaced.actualPlacement, 'SH-1 overlays').toBe('inside')
      const insidePlan = outlineOf(geometryOf(inside, 1).plan)
      const insideActual = outlineOf(geometryOf(inside, 1).actual)
      const topOf = (points: Path): number => Math.min(...points.map((p) => p.y))
      const heightOf = (points: Path): number =>
        Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y))
      expect(topOf(insideActual) - topOf(insidePlan)).toBeCloseTo(
        (heightOf(insidePlan) - heightOf(insideActual)) / 2,
        6,
      )

      const below = draw(
        [task({ uid: 1, name: 'a', start: day(2), finish: endOfDay(10), ...started })],
        ['g1'],
        [taskVisual(1, { shapeKind: 'arrow' })],
      )
      const belowPlaced = placementOf(below, 1)
      expect(belowPlaced.actualPlacement, 'SH-3 drops below').toBe('below')
      const planLine = lineOf(geometryOf(below, 1).plan)
      const actualLine = lineOf(geometryOf(below, 1).actual)
      // Why: a line has no top of its own, so the tops are the centers less half of each;
      // XS-6 measures the drop edge to edge, one stroke plus the gap.
      const stroke = (SETTINGS_CONSTANTS.thinStrokeWidth as number) * DISPLAY_RATIO
      expect(actualLine.from.y - planLine.from.y).toBeCloseTo(
        stroke + (SETTINGS_CONSTANTS.actualGap as number) * DISPLAY_RATIO,
        6,
      )
    },
  )

  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-10'],
      given: 'a milestone that has an actual date of its own',
      when: 'geometryFromLayout draws both figures',
      then: 'the plan is a side of its plan height centered on start, the actual that times actualOfPlan centered on its own day, at the same middle',
    }),
    () => {
      mentions(T221, 'LF-10', 'actualOfPlan')
      const drawn = draw(
        [
          task({
            uid: 1,
            name: 'm',
            start: day(5),
            finish: endOfDay(5),
            milestone: true,
            actualStart: day(8),
            stop: endOfDay(8),
          }),
        ],
        ['g1'],
        [taskVisual(1, { shapeKind: 'milestone', milestoneGlyph: 'diamond' })],
      )
      const placed = placementOf(drawn, 1)
      const extent = (points: Path) => ({
        left: Math.min(...points.map((p) => p.x)),
        right: Math.max(...points.map((p) => p.x)),
        top: Math.min(...points.map((p) => p.y)),
        bottom: Math.max(...points.map((p) => p.y)),
      })
      const plan = extent(outlineOf(geometryOf(drawn, 1).plan))
      const actual = extent(outlineOf(geometryOf(drawn, 1).actual))
      const side = placed.planHeight

      expect(plan.right - plan.left, 'the plan side').toBeCloseTo(side, 6)
      expect(plan.bottom - plan.top, 'the plan side').toBeCloseTo(side, 6)
      expect((plan.left + plan.right) / 2, 'centered on start').toBeCloseTo(
        xOfDay(5, drawn.regions, drawn.layout.pxPerDay),
        6,
      )
      expect(actual.right - actual.left, 'the actual side').toBeCloseTo(
        side * SETTINGS_CONSTANTS.actualOfPlan,
        6,
      )
      expect((actual.left + actual.right) / 2, 'centered on the actual day').toBeCloseTo(
        xOfDay(8, drawn.regions, drawn.layout.pxPerDay),
        6,
      )
      expect((actual.top + actual.bottom) / 2, 'the same middle as the plan').toBeCloseTo(
        (plan.top + plan.bottom) / 2,
        6,
      )
    },
  )

  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-11'],
      given: 'a Task that is under way, so an actual bar is on screen beside its plan',
      when: 'geometryFromLayout places the progress marker',
      then: 'LP-1 stands the marker S-584 right of the actual start with the name S-32 past it, and S-260 still free at the actual right end',
    }),
    () => {
      // Why: the name and the marker fit the actual, so LP-1 places both there, marker first.
      // Trap: S-260 is not scaled by the display ratio (T-252 DS-7) while labelGap is (DS-1).
      mentions(T221, 'LF-11', 'markerSize', 'T-272', 'T-273')
      const drawn = draw(
        [
          task({
            uid: 1,
            name: 'x',
            start: day(2),
            finish: endOfDay(10),
            actualStart: day(2),
            stop: endOfDay(4),
          }),
        ],
        ['g1'],
        [taskVisual(1)],
        { isProgressMarkerVisible: true }, // Spec: S-63
        day(10),
      )
      const placed = placementOf(drawn, 1)
      expect(drawn.settings.isPlanVisible, 'the plan bar is on screen').toBe(true)
      expect(drawn.settings.isActualVisible, 'the actual bar is on screen').toBe(true)
      expect(placed.actualX, 'the Task has an actual bar').not.toBeNull()
      const actualRight = (placed.actualX ?? 0) + placed.actualWidth
      expect(actualRight, 'and it ends short of the plan').toBeLessThan(placed.x + placed.width)

      const marker = geometryOf(drawn, 1).marker
      expect(marker, 'a Task under way carries a marker').not.toBeNull()
      if (marker === null) return
      expect(marker.radius * 2, 'a square of side markerSize').toBeCloseTo(
        SETTINGS_CONSTANTS.markerSize * DISPLAY_RATIO,
        6,
      )
      expect(marker.center.y, 'the middle of the plan bar').toBeCloseTo(
        placed.y + placed.planHeight / 2,
        6,
      )
      expect(placed.labelPlacement, '| LP-1 | `===` | 出す | 入る | 基準の開始から `S-584` だけ右 | マーカーの右端 ＋ `S-32` |').toBe('inside')
      expect(
        marker.center.x - marker.radius,
        '| LP-1 | `===` | 出す | 入る | 基準の開始から `S-584` だけ右 | マーカーの右端 ＋ `S-32` |',
      ).toBeCloseTo((placed.actualX ?? 0) + settingNumber('S-584') * DISPLAY_RATIO, 6)
      const label = geometryOf(drawn, 1).label
      expect(label, 'the name is drawn').not.toBeNull()
      if (label === null) return
      expect(
        label.x + label.width + NOT_STORED_SIZES['S-260'],
        '⭐ 「入る」とは、（マーカーを出すなら `S-584` ＋ マーカーの径 ＋ `S-32`、出さないなら `S-31`）＋ 名前の幅 ＋ 実績の終了の内側の幅（表 T-206 の `S-260`）が、基準の幅以下であることとすること（MUST）。',
      ).toBeLessThanOrEqual(actualRight + 1e-9)
      expect(
        marker.center.x + marker.radius,
        '⛔ 名称ラベルをマーカーの左に置いてはならない（MUST NOT） —— どのタスクグループでも左から マーカー → 名前 の順である。',
      ).toBeCloseTo(label.x - SETTINGS_CONSTANTS.labelGap * DISPLAY_RATIO, 6)
    },
  )

  // Spec: IMPS-1677
  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-11'],
      given: 'a Task not started, whose only actual bar is FR-043 dummy',
      when: 'geometryFromLayout places the marker',
      then: 'LP-2 stands it S-584 right of that mark and on the plan middle',
    }),
    () => {
      // Why: a Task with nothing entered still shows a marker (FR-013, PM-1a), so the bar it
      // clears is the dummy FR-043 draws.
      // Why: the dummy is the basis (T-272 RF-1) and the name does not fit it, so LP-2 applies.
      const drawn = draw(
        [task({ uid: 1, name: 'x', start: day(2), finish: endOfDay(10) })],
        ['g1'],
        [taskVisual(1)],
        { isProgressMarkerVisible: true }, // Spec: S-63
        day(10),
      )
      const placed = placementOf(drawn, 1)
      expect(placed.actualX, 'nothing is entered, so no actual bar is held').toBeNull()
      const marker = geometryOf(drawn, 1).marker
      expect(marker).not.toBeNull()
      if (marker === null) return
      expect(marker.center.y).toBeCloseTo(placed.y + placed.planHeight / 2, 6)
      const holdRight =
        xOfDay(2, drawn.regions, drawn.layout.pxPerDay) +
        Math.min(SETTINGS_CONSTANTS.markerSize * DISPLAY_RATIO * S_247, settingNumber('S-180'))
      expect(placed.labelPlacement, 'premise: the name does not fit the dummy (LP-2)').toBe('right')
      expect(
        marker.center.x - marker.radius - holdRight,
        '| LP-2 | `===` | 出す | 入らない | 基準の終了から `S-584` だけ右 | マーカーの右端 ＋ `S-32` |',
      ).toBeCloseTo(settingNumber('S-584') * DISPLAY_RATIO, 6)
    },
  )

  // Spec: IMPS-1730, IMPS-458
  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-13', 'LF-11'],
      given: 'a suspended Task, once with resumeValid true and once false',
      when: 'geometryFromLayout draws the resume icon',
      then: 'the L sits markerGap past the marker, its arm and head scale off the marker, and a false resumeValid shrinks the side',
    }),
    () => {
      mentions(T221, 'LF-13', 'resumeArmOfMarker', 'resumeHeadOfMarker', 'resumeScaleInvalid')
      for (const resumeValid of [true, false]) {
        const drawn = draw(
          [
            task({
              uid: 1,
              name: 'r',
              start: day(2),
              finish: endOfDay(10),
              actualStart: day(2),
              stop: endOfDay(4),
              resume: day(8),
              resumeValid,
            }),
          ],
          ['g1'],
          [taskVisual(1)],
          { isProgressMarkerVisible: true }, // Spec: S-63
          day(10),
        )
        const marker = geometryOf(drawn, 1).marker
        const resume = geometryOf(drawn, 1).resume
        expect(marker, `resumeValid ${resumeValid}`).not.toBeNull()
        expect(resume, `resumeValid ${resumeValid}`).not.toBeNull()
        if (marker === null || resume === null) continue

        expect(resume.isValid).toBe(resumeValid)
        const side = resumeValid
          ? SETTINGS_CONSTANTS.markerSize * DISPLAY_RATIO
          : SETTINGS_CONSTANTS.markerSize * DISPLAY_RATIO * SETTINGS_CONSTANTS.resumeScaleInvalid

        const foot = resume.arm[0]
        const corner = resume.arm[1]
        const armEnd = resume.arm[2]
        if (foot === undefined || corner === undefined || armEnd === undefined) {
          throw new Error('an L has three points')
        }
        // Why: the icon stands on the resume day, not past the marker, so GA-20 can move it;
        // the marker is LF-11's fallback only where no resume is held.
        expect(foot.x, 'standing on the resume day').toBeCloseTo(
          xOfDay(8, drawn.regions, drawn.layout.pxPerDay),
          6,
        )
        // Why: XS-10 centers the icon's box on the actual band's center line, and
        // resumeScaleInvalid shrinks only what is drawn, so the foot follows the side.
        expect(foot.y, 'its foot on the bottom of the drawn figure').toBeCloseTo(
          marker.center.y + side / 2,
          6,
        )
        expect(corner.x, 'the upright of the L').toBeCloseTo(foot.x, 6)
        expect(corner.y, 'turning at the middle of the marker').toBeCloseTo(marker.center.y, 6)
        expect(armEnd.y).toBeCloseTo(marker.center.y, 6)
        expect(armEnd.x - corner.x, 'the arm').toBeCloseTo(
          side * SETTINGS_CONSTANTS.resumeArmOfMarker,
          6,
        )

        const back = resume.head[0]
        const point = resume.head[1]
        if (back === undefined || point === undefined) throw new Error('a head has three points')
        expect(point.x - back.x, 'the head').toBeCloseTo(
          side * SETTINGS_CONSTANTS.resumeHeadOfMarker,
          6,
        )
        expect(point.y, 'the point at the middle of the marker').toBeCloseTo(marker.center.y, 6)
      }
    },
  )

  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-6'],
      given: 'the same chevron carried on to the renderer',
      when: 'svgFromSchedule draws the frame',
      then: 'the notch vertices reach the drawn polygon unchanged',
    }),
    () => {
      // Why: FR-080 has PI-19 put these vertices on screen measuring nothing of its own, so a
      // renderer that rounds or recomputes the notch is caught here only.
      const drawn = draw(
        [task({ uid: 1, name: 'c', start: day(2), finish: endOfDay(10) })],
        ['g1'],
        [taskVisual(1, { shapeKind: 'chevron' })],
      )
      const points = outlineOf(geometryOf(drawn, 1).plan)
      expect(points.length, 'a chevron is six vertices').toBe(6)
      const svg = svgFromSchedule(
        drawn.schedule,
        drawn.settings,
        drawn.layout,
        drawn.geometry,
        drawn.regions,
        emptySelection(),
        // Why: EP-14's other arm; this case is about the shape a reader sees.
        'screen',
        LIGHT_VIEWER,
      )
      const drawnPoints = points.map((p) => `${twoPlaces(p.x)},${twoPlaces(p.y)}`).join(' ')
      expect(svg).toContain(`points="${drawnPoints}"`)
    },
  )

  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-18'],
      given: "a milestone drawn with the `smile` glyph, whose figure F-044 gives one body, two dots (the eyes) and one inner line (the mouth)",
      when: 'geometryFromLayout builds its figure',
      then: "the plan bar's layers carry LF-18's roles: one `body`, two dot sub-paths merged into one `dot` layer, one `inner`",
    }),
    () => {
      // Why: the smile entry is exactly the four LF-18 layers, so this minimal case ties the
      // geometry to the rule rather than to one glyph's numbers.
      mentions(T221, 'LF-18', '外形は塗り', '塗りに穴を開けずに', '顔の目は点で塗る')
      const drawn = draw(
        [task({ uid: 1, name: 'm', start: day(5), finish: endOfDay(5), milestone: true })],
        ['g1'],
        [taskVisual(1, { shapeKind: 'milestone', milestoneGlyph: 'smile' })],
      )
      const plan = geometryOf(drawn, 1).plan
      if (plan === null || plan.form !== 'outline') {
        throw new Error('a milestone is not drawn as an outline')
      }
      const layers = plan.layers ?? []
      // Trap: mergedLayers in task-figures.ts joins a run of same-role non-body layers
      // into one element, so the two eyes are ONE dot layer with two M sub-paths.
      const movesIn = (role: 'body' | 'inner' | 'dot' | 'shade') =>
        layers.filter((layer) => layer.role === role).flatMap((layer) => layer.segments.filter((segment) => segment.command === 'M')).length
      expect(
        layers.filter((layer) => layer.role === 'body'),
        'LF-18: 外形は塗り、縁の線で囲む -- the outline is one filled, edged body layer',
      ).toHaveLength(1)
      expect(
        movesIn('dot'),
        'LF-18: 顔の目は点で塗る -- each eye is a filled dot sub-path',
      ).toBe(2)
      expect(
        layers.filter((layer) => layer.role === 'inner'),
        'LF-18: 塗りに穴を開けずに、塗りの上に線で描く -- the mouth is one inner-line layer',
      ).toHaveLength(1)
    },
  )
})

// Spec: SWS-5, FR-014, LF-12
const progressDocument = (over: Readonly<Record<string, unknown>> = {}): Drawn =>
  draw(
    [
      task({ uid: 1, name: 'behind', start: day(2), finish: endOfDay(20) }),
      task({ uid: 2, name: 'also behind', start: day(3), finish: endOfDay(21) }),
      task({
        uid: 3,
        name: 'done',
        start: day(2),
        finish: endOfDay(20),
        actualStart: day(2),
        actualFinish: endOfDay(6),
      }),
    ],
    ['g1', 'g1', 'g2'],
    [taskVisual(1), taskVisual(2), taskVisual(3)],
    { isProgressLineVisible: true, ...over },
    day(10),
  )

describe('SWS-5 -- put the vertices of the progress line (FR-014)', () => {
  it(
    swsCase({
      sws: 'SWS-5',
      level: 'Integration',
      covers: ['LF-12'],
      given: 'task groups of one and two lanes, one of them carrying a milestone',
      when: 'geometryFromLayout puts the vertices',
      then: 'each lane gets one at its own top plus half the RECTANGLE height, whatever shape sits on it',
    }),
    () => {
      const drawn = progressDocument()
      const half = drawn.layout.rectangleHeight / 2
      const lanes = drawn.layout.taskGroups.flatMap((taskGroup) => taskGroup.stackTops.map((top) => top + half))
      const inner = drawn.geometry.progressLine.slice(1, -1)
      expect(inner.length, 'one vertex per lane').toBe(lanes.length)
      expect([...inner.map((p) => p.y)].sort((a, b) => a - b)).toEqual(
        [...lanes].sort((a, b) => a - b),
      )

      // Why: a milestone stands 1.5 rectangles tall (S-17), so a lane carrying one is where
      // measuring the shape instead of the rectangle would show.
      const withMilestone = draw(
        [task({ uid: 1, name: 'm', start: day(2), finish: endOfDay(2), milestone: true })],
        ['g1'],
        [taskVisual(1, { shapeKind: 'milestone', milestoneGlyph: 'diamond' })],
        { isProgressLineVisible: true },
        day(10),
      )
      const taskGroup = taskGroupByIdOf(withMilestone, 'g1')
      expect(taskGroup.height, 'the milestone made the band taller than a rectangle').toBeGreaterThan(
        withMilestone.layout.rectangleHeight,
      )
      const vertex = withMilestone.geometry.progressLine[1]
      if (vertex === undefined) throw new Error('the line has no vertex')
      expect(vertex.y).toBeCloseTo(taskGroup.y + withMilestone.layout.rectangleHeight / 2, 6)
    },
  )

  it(
    swsCase({
      sws: 'SWS-5',
      level: 'Integration',
      covers: ['LF-12'],
      given: 'a status date, and progressLineOverhang at its value',
      when: 'geometryFromLayout puts the ends of the line',
      then: 'both ends sit on the status date and run past the first and last task group by that much',
    }),
    () => {
      mentions(T221, 'LF-12', 'progressLineOverhang')
      // Why: S-39 is a constant now; a document cannot move it, so the one value is driven.
      for (const overhang of [SETTINGS_CONSTANTS.progressLineOverhang]) {
        const drawn = progressDocument({})
        const line = drawn.geometry.progressLine
        const top = line[0]
        const bottom = line[line.length - 1]
        const taskGroups = drawn.layout.taskGroups
        const first = taskGroups[0]
        const last = taskGroups[taskGroups.length - 1]
        if (top === undefined || bottom === undefined || first === undefined || last === undefined) {
          throw new Error('the line or the task groups came out empty')
        }
        const statusX = xOfDay(10, drawn.regions, drawn.layout.pxPerDay)
        expect(top.x, `overhang ${overhang}`).toBeCloseTo(statusX, 6)
        expect(bottom.x, `overhang ${overhang}`).toBeCloseTo(statusX, 6)
        expect(top.y, `overhang ${overhang}`).toBeCloseTo(
          first.y - overhang * DISPLAY_RATIO,
          6,
        )
        expect(bottom.y, `overhang ${overhang}`).toBeCloseTo(
          last.y + last.height + overhang * DISPLAY_RATIO,
          6,
        )
      }
      const none = progressDocument()
      expect(none.geometry.progressLine.length).toBeGreaterThan(0)
      const unset = draw(
        [task({ uid: 1, name: 'a', start: day(2), finish: endOfDay(20) })],
        ['g1'],
        [taskVisual(1)],
        { isProgressLineVisible: true },
        null,
      )
      expect(unset.geometry.progressLine).toEqual([])
      expect(unset.geometry.statusLine).toBeNull()
    },
  )

  it(
    swsCase({
      sws: 'SWS-5',
      level: 'Integration',
      covers: ['LF-12'],
      given: 'the same two task groups stacked upwards and stacked downwards',
      when: 'geometryFromLayout strings the vertices into one line',
      then: 'the line runs from its top end to its bottom end without turning back',
    }),
    () => {
      // Why: both directions are walked: with up (ST-5) lane 0 sits at the bottom, so a line
      // strung in lane order would run back up inside one task group.
      for (const stackDirection of ['down', 'up']) {
        const drawn = progressDocument({ stackDirection })
        const line = drawn.geometry.progressLine
        expect(line.length, `${stackDirection}: the line was not drawn`).toBeGreaterThan(2)
        for (let i = 1; i < line.length; i += 1) {
          const before = line[i - 1]
          const here = line[i]
          if (before === undefined || here === undefined) throw new Error('unreachable')
          expect(
            here.y,
            `${stackDirection}: vertex ${i} at y ${here.y} turns back above ${before.y}`,
          ).toBeGreaterThanOrEqual(before.y)
        }
      }
    },
  )
})

describe('SWS-4 -- place the comment box anchor (LF-15)', () => {
  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-15'],
      given: 'two task groups, and a comment box anchored to day 5 of the second, once plain and once with that task group pinned',
      when: 'geometryFromLayout places the anchor',
      then: 'the anchor stands at the left edge of the day 5 column (00:00) and the center of the band the task group is drawn in (a null fraction)',
    }),
    () => {
      mentions(T221, 'LF-15', '`anchorDate` の日時（分まで）', '`anchorTaskGroupId` のタスクグループが描かれた帯', '`LF-14`')
      for (const pinned of [[], ['g2']]) {
        const bare = draw(
          [task({ uid: 1, name: 'a', start: day(2), finish: endOfDay(8) })],
          ['g1'],
          [taskVisual(1)],
          { pinnedTaskGroupIds: pinned },
          null,
          ['g1', 'g2'],
        )
        const schedule = {
          ...bare.schedule,
          commentBoxes: [
            {
              id: 'c1',
              leaderShapeKind: 'polyline',
              text: 'note',
              anchorDate: day(5),
              anchorTaskGroupId: 'g2',
              anchorBandFraction: null,
              anchorTaskUid: null,
              anchorTaskFigure: null,
              anchorHighlightBoxId: null,
              anchorSnapPoint: null,
              bodyOffsetPx: { dx: 40, dy: -40 },
            },
          ],
        } as unknown as Schedule
        const layout = layoutFromSchedule(schedule, bare.settings, bare.regions)
        const geometry = geometryFromLayout(schedule, bare.settings, layout, bare.regions, emptySelection(), null)
        const drawn = { ...bare, schedule, layout, geometry }
        const anchor = geometry.commentBoxes.find((one) => one.id === 'c1')?.anchor
        if (anchor === undefined) throw new Error(`pinned ${pinned.length}: the geometry placed no comment box`)
        const taskGroup = taskGroupByIdOf(drawn, 'g2')
        const columnLeft = xOfDay(5, drawn.regions, layout.pxPerDay)
        expect(anchor.x, `pinned ${pinned.length}: not the left edge of the day 5 column`).toBeCloseTo(columnLeft, 6)
        expect(anchor.y, `pinned ${pinned.length}: not the center of the task group band`).toBeCloseTo(taskGroup.y + taskGroup.height / 2, 6)
      }
    },
  )
})

describe('SWS-4 -- choose the corner the comment box leader leaves from (LF-17)', () => {
  it(
    swsCase({
      sws: 'SWS-4',
      level: 'Integration',
      covers: ['LF-17'],
      given: 'a comment box anchored to day 5 of the second task group, its body placed up-right, up-left, down-right and down-left of the anchor, and inside it',
      when: 'geometryFromLayout places the box and leaderOf draws its leader',
      then: 'the leader joins the anchor and the corner on the anchor side of each middle, and there is none while the anchor is inside the body',
    }),
    () => {
      mentions(T221, 'LF-17', '`LF-15`', '横の中点より右', '縦の中点より上', '左と下', '縁を含む')
      const bare = draw(
        [task({ uid: 1, name: 'a', start: day(2), finish: endOfDay(8) })],
        ['g1'],
        [taskVisual(1)],
        {},
        null,
        ['g1', 'g2'],
      )
      const placed = (dx: number, dy: number) => {
        const schedule = {
          ...bare.schedule,
          commentBoxes: [
            {
              id: 'c1',
              leaderShapeKind: 'polyline',
              text: 'note',
              anchorDate: day(5),
              anchorTaskGroupId: 'g2',
              anchorBandFraction: null,
              anchorTaskUid: null,
              anchorTaskFigure: null,
              anchorHighlightBoxId: null,
              anchorSnapPoint: null,
              bodyOffsetPx: { dx, dy },
              strokeColor: null,
              strokeWidthPx: null,
              fillColor: null,
              fillTransparencyPercent: null,
              textColor: null,
            },
          ],
        } as unknown as Schedule
        const layout = layoutFromSchedule(schedule, bare.settings, bare.regions)
        const geometry = geometryFromLayout(schedule, bare.settings, layout, bare.regions, emptySelection(), null)
        const comment = geometry.commentBoxes.find((one) => one.id === 'c1')
        if (comment === undefined) throw new Error(`(${dx}, ${dy}): the geometry placed no comment box`)
        return comment
      }
      // Why: LF-15 fixes the anchor and FR-097 the body's size, so each placement is set from the size drawn.
      const { width, height } = placed(40, -40).body
      const cases = [
        { name: 'bottom-left', dx: 40, dy: -40, corner: (b: ScreenRect) => ({ x: b.x, y: b.y + b.height }) },
        { name: 'bottom-right', dx: -(width + 40), dy: -40, corner: (b: ScreenRect) => ({ x: b.x + b.width, y: b.y + b.height }) },
        { name: 'top-left', dx: 40, dy: height + 40, corner: (b: ScreenRect) => ({ x: b.x, y: b.y }) },
        { name: 'top-right', dx: -(width + 40), dy: height + 40, corner: (b: ScreenRect) => ({ x: b.x + b.width, y: b.y }) },
        // Why: the tie of LF-17 -- the anchor level with the body's vertical middle takes the bottom corner.
        { name: 'bottom-left (tie)', dx: 40, dy: height / 2, corner: (b: ScreenRect) => ({ x: b.x, y: b.y + b.height }) },
      ]
      for (const one of cases) {
        const comment = placed(one.dx, one.dy)
        const leader = leaderOf(comment)
        if (leader === null) throw new Error(`${one.name}: no leader`)
        const ends = [...leader].map((p) => `${twoPlaces(p.x)},${twoPlaces(p.y)}`).sort()
        const corner = one.corner(comment.body)
        const wanted = [comment.anchor, corner].map((p) => `${twoPlaces(p.x)},${twoPlaces(p.y)}`).sort()
        expect(ends, `${one.name}: the leader does not join the anchor and that corner`).toEqual(wanted)
      }
      for (const [dx, dy] of [[-10, 5], [0, 0]] as const) {
        expect(leaderOf(placed(dx, dy)), `(${dx}, ${dy}): the anchor is inside the body, edges included`).toBeNull()
      }
    },
  )
})

const LABEL_COEF = settingNumber('S-30')
const LABEL_GAP = settingNumber('S-135') * DISPLAY_RATIO

interface RulerLabel {
  readonly x: number
  readonly y: number
  readonly text: string
}

const RULER_LABEL_TAG =
  /<text x="(-?[\d.]+)" y="(-?[\d.]+)"[^>]*data-figure="ruler-[^"]*"[^>]*>([^<]*)<\/text>/g

const rulerRowsOf = (svg: string): readonly (readonly RulerLabel[])[] => {
  const byY = new Map<number, RulerLabel[]>()
  for (const found of svg.matchAll(RULER_LABEL_TAG)) {
    const label = { x: Number(found[1]), y: Number(found[2]), text: found[3] ?? '' }
    byY.set(label.y, [...(byY.get(label.y) ?? []), label])
  }
  return [...byY.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, row]) => [...row].sort((a, b) => a.x - b.x))
}

const unitsOf = (text: string): number =>
  [...text].reduce((sum, ch) => sum + ((ch.codePointAt(0) ?? 0) > 0x7f ? 2 : 1), 0)

const estimateOf = (text: string): number =>
  unitsOf(text) * RULER_FONT * DISPLAY_RATIO * LABEL_COEF

const isoOf = (at: CalendarDay): string =>
  `${at.year}-${String(at.month).padStart(2, '0')}-${String(at.day).padStart(2, '0')}T00:00:00`

const SAMPLE_LEFT_EDGES: readonly CalendarDay[] = [
  { year: 2027, month: 1, day: 1 },
  { year: 2027, month: 2, day: 1 },
  { year: 2027, month: 3, day: 1 },
  { year: 2027, month: 4, day: 1 },
].flatMap((first) => Array.from({ length: 15 }, (_, index) => plusDays(first, index - 12)))

const SWEEP_PX_PER_DAY: readonly number[] = [
  ...TIER_SAMPLES.map((sample) => sample[2]),
  TIER_WEEK_PX * 1.3,
  TIER_DAY_PX * 3,
]

interface SweptFrame {
  readonly where: string
  readonly band: ScreenRect
  readonly rows: ReturnType<typeof rulerRowsOf>
}

const sweepRows = (): readonly SweptFrame[] =>
  SWEEP_PX_PER_DAY.flatMap((pxPerDay) =>
    SAMPLE_LEFT_EDGES.map((scroll) => {
      const frame = rulerAt(pxPerDay, { scrollDate: isoOf(scroll) })
      return {
        where: `${frame.layout.tier} at ${pxPerDay} px/day, left edge ${isoOf(scroll)}`,
        band: frame.band,
        rows: rulerRowsOf(frame.svg),
      }
    }),
  )

describe('SWS-1 -- where a ruler label stands across its tick (FR-017, LF-19)', () => {
  const NEW_YEAR_2027: CalendarDay = { year: 2027, month: 1, day: 1 }
  const APRIL_2026: CalendarDay = { year: 2026, month: 4, day: 1 }
  const WIDTH_2026 = estimateOf('2026') + LABEL_GAP
  const WIDTH_2026_03 = estimateOf('2026-03') + LABEL_GAP

  it(
    swsCase({
      sws: 'SWS-1',
      level: 'Integration',
      covers: ['LF-19'],
      given: 'a period boundary closer to the band left edge than the pulled label width plus S-135',
      when: 'svgFromSchedule draws the ruler band',
      then: 'the label pulled to the left edge is not drawn and the next label stands at its own tick x',
    }),
    () => {
      mentions(T221, 'LF-19', 'MUST NOT', 'S-135', 'FR-093')
      const samples: ReadonlyArray<
        readonly [string, number, CalendarDay, RulerTier, string, string, CalendarDay]
      > = [
        [
          'a few px right of the edge',
          TIER_MONTH_PX * 0.5,
          plusDays(NEW_YEAR_2027, -10),
          'year',
          '2026',
          '2027',
          NEW_YEAR_2027,
        ],
        [
          'a hair under the width plus the gap',
          (WIDTH_2026 / 60) * 0.999,
          plusDays(NEW_YEAR_2027, -60),
          'year',
          '2026',
          '2027',
          NEW_YEAR_2027,
        ],
        [
          'one day right of the edge on the day step',
          TIER_DAY_PX * 1.5,
          { year: 2026, month: 3, day: 31 },
          'yearMonthDayWeekday',
          '2026-03',
          '2026-04',
          APRIL_2026,
        ],
      ]
      for (const [where, pxPerDay, scroll, tier, pulled, next, boundary] of samples) {
        const frame = rulerAt(pxPerDay, { scrollDate: isoOf(scroll) })
        expect(frame.layout.tier, where).toBe(tier)
        const top = rulerRowsOf(frame.svg)[0] ?? []
        expect(top.map((label) => label.text), `${where}: the pulled label is drawn`).not.toContain(pulled)
        const own = top.find((label) => label.text === next)
        expect(own, `${where}: the next label is missing`).toBeDefined()
        expect(own?.x, where).toBeCloseTo(xFromDay(frame.layout, boundary), 1)
      }
    },
  )

  it(
    swsCase({
      sws: 'SWS-1',
      level: 'Integration',
      covers: ['LF-19'],
      given: 'a period boundary at least the pulled label width plus S-135 right of the left edge, and exactly that far',
      when: 'svgFromSchedule draws the ruler band',
      then: 'the pulled label is drawn at the band left edge x',
    }),
    () => {
      mentions(T221, 'LF-19', 'S-135', 'FR-093')
      const wideDays = Math.ceil(WIDTH_2026 / (TIER_MONTH_PX * 0.5)) + 20
      const samples: ReadonlyArray<readonly [string, number, CalendarDay, RulerTier, string]> = [
        ['far right of the edge', TIER_MONTH_PX * 0.5, plusDays(NEW_YEAR_2027, -wideDays), 'year', '2026'],
        ['exactly the width plus the gap', WIDTH_2026 / 60, plusDays(NEW_YEAR_2027, -60), 'year', '2026'],
        [
          'exactly the width plus the gap on the day step',
          WIDTH_2026_03 / 2,
          { year: 2026, month: 3, day: 30 },
          'yearMonthDayWeekday',
          '2026-03',
        ],
      ]
      for (const [where, pxPerDay, scroll, tier, pulled] of samples) {
        const frame = rulerAt(pxPerDay, { scrollDate: isoOf(scroll) })
        expect(frame.layout.tier, where).toBe(tier)
        const top = rulerRowsOf(frame.svg)[0] ?? []
        const own = top.find((label) => label.text === pulled)
        expect(own, `${where}: the pulled label is not drawn`).toBeDefined()
        expect(own?.x, where).toBeCloseTo(frame.band.x, 1)
      }
    },
  )

  it(
    swsCase({
      sws: 'SWS-1',
      level: 'Integration',
      covers: ['LF-19'],
      given: 'every tier at day widths on both sides of each threshold and left edges around month and year starts',
      when: 'svgFromSchedule draws the ruler band',
      then: 'no two labels of one row overlap, estimated width from each x',
    }),
    () => {
      mentions(T221, 'LF-19', 'FR-093', 'S-30')
      for (const { where, rows } of sweepRows()) {
        expect(rows.length, `${where}: the band drew no rows`).toBeGreaterThanOrEqual(1)
        for (const [index, row] of rows.entries()) {
          expect(row.length, `${where}: row ${index} is empty`).toBeGreaterThanOrEqual(1)
          for (let at = 1; at < row.length; at += 1) {
            const left = row[at - 1] as RulerLabel
            const right = row[at] as RulerLabel
            expect(
              left.x + estimateOf(left.text),
              `${where}: row ${index} "${left.text}" runs into "${right.text}"`,
            ).toBeLessThanOrEqual(right.x + HALF_A_ROUNDING)
          }
        }
      }
    },
  )

  it(
    swsCase({
      sws: 'SWS-1',
      level: 'Integration',
      covers: ['LF-19'],
      given: 'a row of the band with no tick inside it (a left edge in the middle of a month at a wide day)',
      when: 'svgFromSchedule draws the ruler band',
      then: 'the row still draws the pulled label, at the band left edge x',
    }),
    () => {
      mentions(T221, 'LF-19', 'TM-1')
      const scroll: CalendarDay = { year: 2026, month: 3, day: 3 }
      for (const pxPerDay of [60, TIER_DAY_PX * 3]) {
        const frame = rulerAt(pxPerDay, { scrollDate: isoOf(scroll) })
        const days = Math.ceil(frame.band.width / frame.layout.pxPerDay)
        for (let step = 0; step <= days; step += 1) {
          expect(plusDays(scroll, step).day === 1, 'the sample band holds a month start').toBe(false)
        }
        const top = rulerRowsOf(frame.svg)[0] ?? []
        expect(top.map((label) => label.text), `${pxPerDay} px/day`).toEqual(['2026-03'])
        expect(top[0]?.x, `${pxPerDay} px/day`).toBeCloseTo(frame.band.x, 1)
      }
    },
  )

  it(
    swsCase({
      sws: 'SWS-1',
      level: 'Integration',
      covers: ['LF-19'],
      given: 'the same sweep of tiers, day widths and left edges',
      when: 'svgFromSchedule draws the ruler band',
      then: 'no label stands left of the band left edge',
    }),
    () => {
      mentions(T221, 'LF-19', 'MUST NOT')
      for (const { where, band, rows } of sweepRows()) {
        for (const row of rows) {
          for (const label of row) {
            expect(label.x, `${where}: "${label.text}"`).toBeGreaterThanOrEqual(band.x - HALF_A_ROUNDING)
          }
        }
      }
    },
  )
})

// Why: SWS-6 (FR-021) has no case: its unit is not written yet, and it points at no
// T-221 row, so this coverage check cannot notice the gap.
describe('coverage of the tables the five SW_SPEC nodes point at', () => {
  it('every row of table T-221 is verified by at least one case', () => {
    const covered = new Set(CASES.flatMap((c) => c.covers))
    for (const row of T221.rows) {
      expect(covered.has(row.id), `table T-221 row ${row.id} has no case`).toBe(true)
    }
  })

  it('every row of table T-222 is verified by at least one case', () => {
    const covered = new Set(CASES.flatMap((c) => c.covers))
    for (const row of T222.rows) {
      expect(covered.has(row.id), `table T-222 row ${row.id} has no case`).toBe(true)
    }
  })

  it('every declared case names a real row, at the level table T-218 gives TS-2', () => {
    const known = new Set([...T221.rows, ...T222.rows].map((r) => r.id))
    expect(CASES.length).toBeGreaterThan(0)
    for (const one of CASES) {
      expect(one.level, `${one.sws}`).toBe('Integration')
      expect(one.covers.length, `${one.sws} covers nothing`).toBeGreaterThan(0)
      for (const id of one.covers) {
        expect(known.has(id), `${one.sws} names ${id}, which is in neither table`).toBe(true)
      }
      for (const [field, text] of [
        ['given', one.given],
        ['when', one.when],
        ['then', one.then],
      ] as ReadonlyArray<readonly [string, string]>) {
        expect(text.length, `${one.sws} has an empty ${field}`).toBeGreaterThan(0)
      }
    }
  })

  it('each of SWS-1 to SWS-5 is taken as a parent by at least one case', () => {
    const parents = new Set(CASES.map((c) => c.sws))
    for (const id of ['SWS-1', 'SWS-2', 'SWS-3', 'SWS-4', 'SWS-5']) {
      expect(parents.has(id as SwsId), `${id} has no case`).toBe(true)
    }
  })
})
