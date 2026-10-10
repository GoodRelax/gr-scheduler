// CR-605 part A: non-working days are shaded in the Task Group Area (FR-054, table T-343, color S-450).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  isNonRecurringException,
  workingCalendarOf,
  workingDaysBetween,
  type CalendarDay,
  type Schedule,
} from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  dateAtX,
  layoutFromSchedule,
  xFromDay,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, unbroken } from '../contract/spec-table'
import { RATIO, SCREEN, cellOf, rowOf, scheduleOf, taskOf } from './cr-430-cross-section-scene'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FR-054
const FR_054_POINTER = '非稼働日を描くときは 表 T-343 に従うこと（MUST）。'
// see OD-1
const OD_1_RULE = '本要求が決める文書の暦で、稼働日でない日を塗ること（MUST）。'
const OD_1_BOTH = '曜日の稼働（`WeekDay`）と、繰り返しの無い例外日（`Exception`、`_assets/fig-erd-detail.md` の `AT-82`）の両方に従う。'
const OD_1_RECURRING = '⚠️ 繰り返しの例外日は実日付へ展開しない（本要求の RATIONALE）ので、塗らない。'
const OD_1_WORKING = '⭐ 稼働にする例外日（`dayWorking` が真）は、週末でも塗らない'
// see OD-2
const OD_2_TIERS = '目盛の段（`_assets/tbl-settings.md` の 表 T-205 の `S-83` 〜 `S-85` が分ける段）で塗る範囲を決めること（MUST）。'
const OD_2_DAY = '「年 ＋ 月 ＋ 日 ＋ 曜日」の段では非稼働日をすべて塗る。'
const OD_2_WEEK_MONTH = '「年 ＋ 月 ＋ 週」と「年 ＋ 月」の段では、例外日で非稼働になった日だけを塗る。'
const OD_2_YEAR = '「年」の段では塗らない。'
// see OD-3
const OD_3_EXTENT = '`Task Group Area`（`_assets/tbl-glossary.md` の `U-50`）の上端から下端まで、その日の列の幅で塗ること（MUST）。'
const OD_3_PINNED = 'ピン止めしたタスクグループ（`U-46`）の上も塗る。'
const OD_3_NOT_RULER = '⛔ `Time Ruler`（`U-19`）の帯は塗らない（MUST NOT）'
// see OD-4
const OD_4_ORDER = 'タスクグループの帯とタスクグループの色（`FR-042`）の上、日付罫線（`U-17`）・グループ罫線（`U-18`）と日程の図形の下に描くこと（MUST）'
// see OD-5
const OD_5_COLOR = '`_assets/tbl-settings.md` の 表 T-236 の `S-450` で塗ること（MUST）。'
// see OD-6
const OD_6_ONE = '続いた非稼働日を 1 つの矩形にまとめ、見えている矩形をすべて 1 つの図形の要素にまとめて描くこと（MUST）'
// see OD-7
const OD_7_EXPORT = '画像の書き出し（`FR-025`）でも、画面と同じ日を同じ色で塗ること（MUST）'
// see S-450
const S_450_NO_HUE = '⛔ テーマ色に追随させない'
// see AT-82
const AT_82_NONE = '`9` 繰り返しなし'

const ruleOf = (id: string): string => rowOf('T-343', id).by['定め'] ?? ''

// see T-205, S-83, S-84, S-85
const thresholdOf = (id: string): number => Number(bare(rowOf('T-205', id).by['既定'] ?? ''))
const S_83 = thresholdOf('S-83')
const S_84 = thresholdOf('S-84')
const S_85 = thresholdOf('S-85')

// see T-202, T-203
const GRID_KEY = cellOf('T-202', 'S-67', 'キー')
const PINNED_KEY = cellOf('T-203', 'S-126', 'キー')

// see T-236, T-216
const THEME_HUE = Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? ''))
const normalColor = (text: string): string => text.replace(/\s+/g, '').toLowerCase()
const t236 = (id: string, preference: 'light' | 'dark'): string =>
  normalColor(bare(rowOf('T-236', id).by[preference === 'dark' ? '暗いテーマ' : '明るいテーマ'] ?? '').replace('H', String(THEME_HUE)))

type Tier = 'year' | 'yearMonth' | 'yearMonthWeek' | 'yearMonthDayWeekday'

// WHY: FR-017 compares pxPerDay against the threshold scaled by the ruler font over S-8; mid-band samples keep the tier unambiguous.
const PX_SCALE = ((SETTINGS_DEFAULTS['rulerFont'] as number) * RATIO) / SETTINGS_CONSTANTS.fontMin
const PX_PER_DAY_OF: Readonly<Record<Tier, number>> = {
  year: S_83 * 0.3 * PX_SCALE,
  yearMonth: Math.sqrt(S_83 * S_84) * PX_SCALE,
  yearMonthWeek: Math.sqrt(S_84 * S_85) * PX_SCALE,
  yearMonthDayWeekday: S_85 * 2.5 * PX_SCALE,
}
const TIERS: readonly Tier[] = ['year', 'yearMonth', 'yearMonthWeek', 'yearMonthDayWeekday']

// WHY: drawn coordinates are rounded to two decimals.
const ROUND = 0.011

const on = (month: number, d: number): string =>
  `2026-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00`

interface ExceptionRow {
  readonly ordinal: number
  readonly name: string
  readonly fromDate: string
  readonly toDate: string
  readonly dayWorking: boolean
  readonly recurrenceKind: number | null
  readonly carry: Readonly<Record<string, string>>
  readonly carryElements: readonly unknown[]
}

const exceptionOf = (
  ordinal: number,
  from: string,
  to: string,
  dayWorking: boolean,
  recurrenceKind: number | null,
): ExceptionRow => ({ ordinal, name: `x${ordinal}`, fromDate: from, toDate: to, dayWorking, recurrenceKind, carry: {}, carryElements: [] })

// WHY: 2026-03-01 is a Sunday, so 03-10..12 are Tue..Thu, 03-14 a Saturday, 03-21/22 a weekend and 03-23 a Monday.
const SHUTDOWN = exceptionOf(0, on(3, 10), on(3, 12), false, 9)
const SATURDAY_WORKED = exceptionOf(1, on(3, 14), on(3, 14), true, 9)
const RECURRING_OFF = exceptionOf(2, on(3, 18), on(3, 18), false, 2)
const UNKINDED_OFF = exceptionOf(3, on(3, 19), on(3, 19), false, null)
const BRIDGE_MONDAY = exceptionOf(4, on(3, 23), on(3, 23), false, 9)
const EXCEPTIONS = [SHUTDOWN, SATURDAY_WORKED, RECURRING_OFF, UNKINDED_OFF, BRIDGE_MONDAY]

// see AT-73
const MON_TO_FRI = [2, 3, 4, 5, 6]

const calendarOf = (exceptions: readonly ExceptionRow[], working: readonly number[] = MON_TO_FRI): unknown => ({
  uid: 1,
  name: 'weekend off',
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: [1, 2, 3, 4, 5, 6, 7].map((dayType) => ({
    ordinal: dayType - 1,
    dayType,
    dayWorking: working.includes(dayType),
    carry: {},
    carryElements: [],
  })),
  exceptions,
})

interface Wish {
  readonly exceptions?: readonly ExceptionRow[]
  readonly working?: readonly number[]
  readonly themeHue?: number
}

// WHY: two task groups, so a group grid line exists between them.
const scheduleWith = (wish: Wish = {}): Schedule => {
  const base = scheduleOf({
    tasks: [
      taskOf({ uid: 1, name: 'a', start: on(3, 2), finish: on(3, 6) }),
      taskOf({ uid: 2, name: 'b', start: on(3, 9), finish: on(3, 20) }),
    ],
  }) as unknown as Record<string, unknown>
  const g1 = (base['taskGroups'] as Record<string, unknown>[])[0] as Record<string, unknown>
  const project = base['project'] as Record<string, unknown>
  return {
    ...base,
    project: { ...project, themeHue: wish.themeHue ?? project['themeHue'] },
    calendars: [calendarOf(wish.exceptions ?? EXCEPTIONS, wish.working)],
    taskGroups: [g1, { ...g1, id: 'g2', label: 'g2', order: 1 }],
    taskGroupMembers: [
      { taskUid: 1, groupId: 'g1' },
      { taskUid: 2, groupId: 'g2' },
    ],
  } as unknown as Schedule
}

interface Frame {
  readonly schedule: Schedule
  readonly layout: ScheduleLayout
  readonly taskGroupArea: ScreenRect
  readonly timeRuler: ScreenRect
  readonly svg: (picture?: 'screen' | 'export', preference?: 'light' | 'dark') => string
}

const frameOf = (tier: Tier, schedule: Schedule, over: Readonly<Record<string, unknown>> = {}): Frame => {
  const settings = {
    ...SETTINGS_DEFAULTS,
    zoomX: PX_PER_DAY_OF[tier] / (SETTINGS_CONSTANTS.pxPerDayAt1x * RATIO),
    scrollDate: on(3, 1),
    stackDirection: 'down',
    [GRID_KEY]: true,
    ...over,
  } as unknown as DocumentSettings
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = emptySelection()
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection, null)
  const rects = regions as unknown as { taskGroupArea: ScreenRect; timeRuler: ScreenRect }
  return {
    schedule,
    layout,
    taskGroupArea: rects.taskGroupArea,
    timeRuler: rects.timeRuler,
    svg: (picture = 'screen', preference = 'light') =>
      svgFromSchedule(schedule, settings, layout, geometry, regions, selection, picture, {
        themePreference: preference,
        guideCursorMode: 'none',
      } as never),
  }
}

interface SvgElement {
  readonly tag: string
  readonly attrs: string
  readonly at: number
  readonly zo: readonly string[]
}

const attrOf = (attrs: string, name: string): string | null =>
  new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1] ?? null

const elementsOf = (svg: string): readonly SvgElement[] => {
  const out: SvgElement[] = []
  const groups: (string | null)[] = []
  for (const match of svg.matchAll(/<(\/?)([a-zA-Z]+)((?:[^<>"]|"[^"]*")*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = match
    if (tag === 'g') {
      if (closing === '/') groups.pop()
      else if (selfClosing !== '/') groups.push(attrOf(attrs as string, 'data-zo'))
      continue
    }
    if (closing === '/') continue
    out.push({
      tag: tag as string,
      attrs: attrs as string,
      at: match.index ?? 0,
      zo: groups.filter((one): one is string => one !== null),
    })
  }
  return out
}

const SHADE = 'data-figure="non-working-days"'

const shadesOf = (svg: string): readonly SvgElement[] => elementsOf(svg).filter((one) => one.attrs.includes(SHADE))

const shadeOf = (svg: string): SvgElement => {
  const found = shadesOf(svg)
  if (found.length !== 1) throw new Error(`${OD_6_ONE}: ${found.length} shade elements in the picture`)
  return found[0] as SvgElement
}

interface Run {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

const runsOf = (shade: SvgElement): readonly Run[] => {
  const d = attrOf(shade.attrs, 'd') ?? ''
  const num = '(-?\\d+(?:\\.\\d+)?)'
  const one = new RegExp(`M\\s*${num}[\\s,]+${num}\\s*H\\s*${num}\\s*V\\s*${num}\\s*H\\s*${num}\\s*Z`, 'g')
  const out: Run[] = []
  for (const m of d.matchAll(one)) {
    const [x0, y0, x1, y1, back] = [m[1], m[2], m[3], m[4], m[5]].map(Number) as [number, number, number, number, number]
    if (Math.abs(back - x0) > ROUND) throw new Error(`a sub-path that does not close on its own x: ${m[0]}`)
    out.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1) })
  }
  if (d.replace(one, '').trim() !== '') throw new Error(`the shade path holds more than closed rectangles: ${d}`)
  return [...out].sort((a, b) => a.x0 - b.x0)
}

const MS_PER_DAY = 86400000
const utcOf = (at: CalendarDay): number => Date.UTC(at.year, at.month - 1, at.day)
const dayAt = (utc: number): CalendarDay => {
  const at = new Date(utc)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() } as CalendarDay
}
const plus = (at: CalendarDay, days: number): CalendarDay => dayAt(utcOf(at) + days * MS_PER_DAY)
const dayFromText = (text: string): CalendarDay => {
  const [y, m, d] = text.slice(0, 10).split('-').map(Number) as [number, number, number]
  return { year: y, month: m, day: d } as CalendarDay
}

const bandRightOf = (svg: string): number => {
  const bands = elementsOf(svg).filter((one) => one.zo.includes('ZO-7') && one.tag === 'rect')
  if (bands.length === 0) throw new Error('premise: ZO-7 draws task group band rectangles')
  return Math.max(...bands.map((one) => Number(attrOf(one.attrs, 'x')) + Number(attrOf(one.attrs, 'width'))))
}

// WHY: OD-1 names the calendar the durations count with, so the counting entry decides the expected days.
const offByCounting = (schedule: Schedule): ((at: CalendarDay) => boolean) => {
  const calendar = workingCalendarOf(schedule)
  return (at) => workingDaysBetween(calendar, at, plus(at, 1)) === 0
}

const covers = (row: ExceptionRow, at: CalendarDay): boolean =>
  utcOf(dayFromText(row.fromDate)) <= utcOf(at) && utcOf(at) <= utcOf(dayFromText(row.toDate))

// see OD-2
const offByException = (exceptions: readonly ExceptionRow[]): ((at: CalendarDay) => boolean) => (at) =>
  exceptions.some((row) => row.dayWorking === false && isNonRecurringException(row) && covers(row, at))

const expectedRunsOf = (frame: Frame, svg: string, shaded: (at: CalendarDay) => boolean): readonly Run[] => {
  const left = frame.taskGroupArea.x
  const right = bandRightOf(svg)
  const first = dateAtX(frame.layout, left)
  const last = dateAtX(frame.layout, right)
  if (first === null || last === null) throw new Error('premise: the layout maps the Task Group Area to days')
  const px = frame.layout.pxPerDay
  const out: Run[] = []
  let open: { x0: number; x1: number } | null = null
  for (let at = plus(first, -2); utcOf(at) <= utcOf(plus(last, 2)); at = plus(at, 1)) {
    if (!shaded(at)) {
      if (open !== null) out.push({ ...open, y0: frame.taskGroupArea.y, y1: frame.taskGroupArea.y + frame.taskGroupArea.height })
      open = null
      continue
    }
    const x = xFromDay(frame.layout, at)
    open = open === null ? { x0: x, x1: x + px } : { x0: open.x0, x1: x + px }
  }
  if (open !== null) out.push({ ...open, y0: frame.taskGroupArea.y, y1: frame.taskGroupArea.y + frame.taskGroupArea.height })
  return out
    .map((one) => ({ ...one, x0: Math.max(one.x0, left), x1: Math.min(one.x1, right) }))
    .filter((one) => one.x1 - one.x0 > ROUND)
}

const sameRuns = (drawn: readonly Run[], expected: readonly Run[], where: string): void => {
  expect(
    drawn.map((one) => `${one.x0.toFixed(1)}..${one.x1.toFixed(1)}`),
    `${where}: the runs drawn against the runs the calendar asks for`,
  ).toHaveLength(expected.length)
  drawn.forEach((one, index) => {
    const want = expected[index] as Run
    expect(Math.abs(one.x0 - want.x0), `${where}: run ${index} x0 ${one.x0} vs ${want.x0}`).toBeLessThanOrEqual(ROUND)
    expect(Math.abs(one.x1 - want.x1), `${where}: run ${index} x1 ${one.x1} vs ${want.x1}`).toBeLessThanOrEqual(2 * ROUND)
    expect(Math.abs(one.y0 - want.y0), `${where}: run ${index} y0`).toBeLessThanOrEqual(ROUND)
    expect(Math.abs(one.y1 - want.y1), `${where}: run ${index} y1`).toBeLessThanOrEqual(ROUND)
  })
}

const coveredBy = (frame: Frame, runs: readonly Run[], at: CalendarDay): boolean => {
  const middle = xFromDay(frame.layout, at) + frame.layout.pxPerDay / 2
  return runs.some((one) => one.x0 - ROUND <= middle && middle <= one.x1 + ROUND)
}

const tierFrame = (tier: Tier, wish: Wish = {}, over: Readonly<Record<string, unknown>> = {}): Frame => {
  const frame = frameOf(tier, scheduleWith(wish), over)
  expect(frame.layout.tier, `premise: ${frame.layout.pxPerDay} px/day lands on ${tier}`).toBe(tier)
  return frame
}

describe('CR-605 -- the clauses these cases rest on still stand', () => {
  it(`FR-054 still says: ${FR_054_POINTER}`, () => {
    expect(REQUIREMENTS).toContain(FR_054_POINTER)
  })

  it('T-343 OD-1 .. OD-7 still say what the cases below test', () => {
    for (const one of [OD_1_RULE, OD_1_BOTH, OD_1_RECURRING, OD_1_WORKING]) expect(ruleOf('OD-1')).toContain(one)
    for (const one of [OD_2_TIERS, OD_2_DAY, OD_2_WEEK_MONTH, OD_2_YEAR]) expect(ruleOf('OD-2')).toContain(one)
    for (const one of [OD_3_EXTENT, OD_3_PINNED, OD_3_NOT_RULER]) expect(ruleOf('OD-3')).toContain(one)
    expect(ruleOf('OD-4')).toContain(OD_4_ORDER)
    expect(ruleOf('OD-5')).toContain(OD_5_COLOR)
    expect(ruleOf('OD-6')).toContain(OD_6_ONE)
    expect(ruleOf('OD-7')).toContain(OD_7_EXPORT)
  })

  it('S-450 is a color on both sides that does not follow the hue; AT-82 says 9 is no recurrence', () => {
    for (const side of ['light', 'dark'] as const) expect(t236('S-450', side)).toMatch(/^rgba\(/)
    expect(rowOf('T-236', 'S-450').by['備考'] ?? '').toContain(S_450_NO_HUE)
    const at82 = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'), 'utf8')
    expect(at82).toContain(AT_82_NONE)
  })

  it('the tier thresholds read from T-205 are ordered numbers', () => {
    expect(S_83).toBeGreaterThan(0)
    expect(S_84).toBeGreaterThan(S_83)
    expect(S_85).toBeGreaterThan(S_84)
  })
})

describe('OD-1 -- the days the document calendar does not work are shaded', () => {
  it(`「${OD_1_RULE}」 every run at the day tier is exactly the days the counting calendar does not work`, () => {
    // WHY: no recurring row here, so this case does not depend on how the count reads one (see the next case).
    const frame = tierFrame('yearMonthDayWeekday', { exceptions: EXCEPTIONS.filter((one) => one !== RECURRING_OFF) })
    const svg = frame.svg()
    sameRuns(runsOf(shadeOf(svg)), expectedRunsOf(frame, svg, offByCounting(frame.schedule)), 'day tier')
  })

  it(`「${OD_1_RECURRING}」 with a recurring row too, the shade and the count still agree day for day`, () => {
    // TRAP: red here while the next cases are green means the count, not the shade, reads a recurring row as dates.
    const frame = tierFrame('yearMonthDayWeekday')
    const svg = frame.svg()
    sameRuns(runsOf(shadeOf(svg)), expectedRunsOf(frame, svg, offByCounting(frame.schedule)), 'day tier, recurring row')
  })

  it(`「${OD_1_BOTH}」 a weekend and a non-recurring off exception on weekdays are both shaded`, () => {
    const frame = tierFrame('yearMonthDayWeekday')
    const runs = runsOf(shadeOf(frame.svg()))
    for (const d of [7, 8, 10, 11, 12, 15]) {
      expect(coveredBy(frame, runs, dayFromText(on(3, d))), `2026-03-${d}`).toBe(true)
    }
    for (const d of [9, 13]) {
      expect(coveredBy(frame, runs, dayFromText(on(3, d))), `2026-03-${d} is worked`).toBe(false)
    }
  })

  it(`「${OD_1_WORKING}」 the Saturday a working exception covers is not shaded`, () => {
    const frame = tierFrame('yearMonthDayWeekday')
    const runs = runsOf(shadeOf(frame.svg()))
    expect(coveredBy(frame, runs, dayFromText(SATURDAY_WORKED.fromDate))).toBe(false)
    expect(coveredBy(frame, runs, dayFromText(on(3, 15))), 'premise: the Sunday after it is shaded').toBe(true)
  })

  it(`「${OD_1_RECURRING}」 a recurring off exception on a weekday is not shaded`, () => {
    const frame = tierFrame('yearMonthDayWeekday')
    const runs = runsOf(shadeOf(frame.svg()))
    expect(coveredBy(frame, runs, dayFromText(RECURRING_OFF.fromDate))).toBe(false)
  })

  it('seam addition: an off exception whose recurrenceKind is null counts as non-recurring and is shaded', () => {
    const frame = tierFrame('yearMonthDayWeekday')
    const runs = runsOf(shadeOf(frame.svg()))
    expect(coveredBy(frame, runs, dayFromText(UNKINDED_OFF.fromDate))).toBe(true)
  })

  it('control: a calendar that works every day with no exception draws no shade at all', () => {
    const frame = tierFrame('yearMonthDayWeekday', { exceptions: [], working: [1, 2, 3, 4, 5, 6, 7] })
    expect(shadesOf(frame.svg())).toEqual([])
  })
})

describe('OD-2 -- the ruler tier decides how much is shaded', () => {
  it(`「${OD_2_DAY}」 at the day tier the weekends are shaded too`, () => {
    const frame = tierFrame('yearMonthDayWeekday')
    const runs = runsOf(shadeOf(frame.svg()))
    expect(coveredBy(frame, runs, dayFromText(on(3, 1))), 'a Sunday').toBe(true)
  })

  for (const tier of ['yearMonthWeek', 'yearMonth'] as const) {
    it(`「${OD_2_WEEK_MONTH}」 at ${tier} only the days a non-recurring off exception covers are shaded`, () => {
      const frame = tierFrame(tier)
      const svg = frame.svg()
      const runs = runsOf(shadeOf(svg))
      sameRuns(runs, expectedRunsOf(frame, svg, offByException(EXCEPTIONS)), tier)
      for (const d of [1, 7, 8, 21, 22]) {
        expect(coveredBy(frame, runs, dayFromText(on(3, d))), `${tier}: the weekend day 2026-03-${d}`).toBe(false)
      }
    })
  }

  it(`「${OD_2_YEAR}」 at the year tier nothing is shaded, exceptions in view included`, () => {
    const frame = tierFrame('year')
    const first = dateAtX(frame.layout, frame.taskGroupArea.x)
    expect(first === null ? Number.NaN : utcOf(first), 'premise: the exceptions are in view').toBeLessThanOrEqual(
      utcOf(dayFromText(SHUTDOWN.fromDate)),
    )
    expect(shadesOf(frame.svg())).toEqual([])
  })

  it(`「${OD_2_WEEK_MONTH}」 control: at the week tier a calendar with no exception draws no shade`, () => {
    const frame = tierFrame('yearMonthWeek', { exceptions: [] })
    expect(shadesOf(frame.svg())).toEqual([])
  })
})

describe('OD-3 -- where the shade stands', () => {
  for (const [name, over] of [
    ['no pinned task group', {}],
    ['the first task group pinned', { [PINNED_KEY]: ['g1'] }],
  ] as const) {
    it(`「${OD_3_EXTENT}」 ${name}: every run spans the Task Group Area from top to bottom`, () => {
      const frame = tierFrame('yearMonthDayWeekday', {}, over)
      const runs = runsOf(shadeOf(frame.svg()))
      expect(runs.length, 'premise: something is shaded').toBeGreaterThan(0)
      for (const one of runs) {
        expect(Math.abs(one.y0 - frame.taskGroupArea.y), 'top of the Task Group Area').toBeLessThanOrEqual(ROUND)
        expect(Math.abs(one.y1 - (frame.taskGroupArea.y + frame.taskGroupArea.height)), 'bottom of the Task Group Area').toBeLessThanOrEqual(ROUND)
        expect(one.x0, 'not left of the Task Group Area').toBeGreaterThanOrEqual(frame.taskGroupArea.x - ROUND)
      }
    })
  }

  it(`「${OD_3_PINNED}」 the pinned task group's band lies under the shade`, () => {
    const frame = tierFrame('yearMonthDayWeekday', {}, { [PINNED_KEY]: ['g1'] })
    const svg = frame.svg()
    const run = runsOf(shadeOf(svg))[0] as Run
    const bands = elementsOf(svg).filter((one) => one.zo.includes('ZO-7') && one.tag === 'rect')
    expect(bands.length, 'premise: task group bands are drawn').toBeGreaterThan(0)
    for (const band of bands) {
      const top = Number(attrOf(band.attrs, 'y'))
      const bottom = top + Number(attrOf(band.attrs, 'height'))
      expect(top, 'band top inside the shade').toBeGreaterThanOrEqual(run.y0 - ROUND)
      expect(bottom, 'band bottom inside the shade').toBeLessThanOrEqual(run.y1 + ROUND)
    }
  })

  it(`「${OD_3_NOT_RULER}」 no run reaches into the Time Ruler band`, () => {
    const frame = tierFrame('yearMonthDayWeekday')
    const ruler = frame.timeRuler
    expect(ruler.y + ruler.height, 'premise: the ruler sits above the Task Group Area').toBeLessThanOrEqual(frame.taskGroupArea.y + ROUND)
    for (const one of runsOf(shadeOf(frame.svg()))) {
      const overlap = Math.min(one.y1, ruler.y + ruler.height) - Math.max(one.y0, ruler.y)
      expect(overlap, 'shade inside the ruler band').toBeLessThanOrEqual(ROUND)
    }
  })

  it(`「${OD_3_EXTENT}」 each day's column is one day wide: a lone shaded weekday is pxPerDay wide`, () => {
    const frame = tierFrame('yearMonthWeek')
    const runs = runsOf(shadeOf(frame.svg()))
    const monday = runs.find((one) => coveredBy(frame, [one], dayFromText(BRIDGE_MONDAY.fromDate)))
    expect(monday, 'the bridge Monday is shaded').toBeDefined()
    expect(Math.abs((monday as Run).x1 - (monday as Run).x0 - frame.layout.pxPerDay)).toBeLessThanOrEqual(2 * ROUND)
  })
})

describe('OD-4 -- the shade is above the task group bands and below every line and figure', () => {
  it(`「${OD_4_ORDER}」 inside ZO-7: bands, then the shade, then the grid lines`, () => {
    const frame = tierFrame('yearMonthDayWeekday')
    const svg = frame.svg()
    const shade = shadeOf(svg)
    expect(shade.zo, 'the shade is in the ZO-7 layer').toContain('ZO-7')
    const layer = elementsOf(svg).filter((one) => one.zo.includes('ZO-7') && one !== shade)
    const bands = layer.filter((one) => one.tag === 'rect')
    const lines = layer.filter((one) => one.tag === 'line')
    expect(bands.length, 'premise: task group bands').toBeGreaterThan(0)
    expect(lines.length, 'premise: date and group grid lines').toBeGreaterThan(0)
    expect(Math.max(...bands.map((one) => one.at)), 'every band before the shade').toBeLessThan(shade.at)
    expect(Math.min(...lines.map((one) => one.at)), 'every grid line after the shade').toBeGreaterThan(shade.at)
  })

  it(`「${OD_4_ORDER}」 every schedule figure comes after the shade`, () => {
    const svg = tierFrame('yearMonthDayWeekday').svg()
    const shade = shadeOf(svg)
    const figures = elementsOf(svg).filter((one) => /data-figure="task-\d/.test(one.attrs))
    expect(figures.length, 'premise: the tasks are drawn').toBeGreaterThan(0)
    for (const one of figures) expect(one.at, attrOf(one.attrs, 'data-figure') ?? '').toBeGreaterThan(shade.at)
  })
})

describe('OD-5 -- the color is S-450', () => {
  for (const preference of ['light', 'dark'] as const) {
    it(`「${OD_5_COLOR}」 ${preference}: fill is the ${preference} side of S-450`, () => {
      const shade = shadeOf(tierFrame('yearMonthDayWeekday').svg('screen', preference))
      expect(normalColor(attrOf(shade.attrs, 'fill') ?? '')).toBe(t236('S-450', preference))
    })
  }

  it(`「${S_450_NO_HUE}」 another theme hue leaves the fill as it is`, () => {
    const other = (THEME_HUE + 150) % 360
    const shade = shadeOf(tierFrame('yearMonthDayWeekday', { themeHue: other }).svg())
    expect(normalColor(attrOf(shade.attrs, 'fill') ?? '')).toBe(t236('S-450', 'light'))
  })
})

describe('OD-6 -- one element, consecutive days merged', () => {
  it(`「${OD_6_ONE}」 a weekend plus an off Monday is one rectangle three days wide`, () => {
    const frame = tierFrame('yearMonthDayWeekday')
    const runs = runsOf(shadeOf(frame.svg()))
    const bridge = runs.filter((one) => coveredBy(frame, [one], dayFromText(on(3, 21))))
    expect(bridge, 'one run holds Saturday 03-21').toHaveLength(1)
    const run = bridge[0] as Run
    for (const d of [22, 23]) expect(coveredBy(frame, [run], dayFromText(on(3, d))), `the same run holds 03-${d}`).toBe(true)
    expect(Math.abs(run.x0 - xFromDay(frame.layout, dayFromText(on(3, 21))))).toBeLessThanOrEqual(ROUND)
    expect(Math.abs(run.x1 - run.x0 - 3 * frame.layout.pxPerDay)).toBeLessThanOrEqual(2 * ROUND)
  })

  it(`「${OD_6_ONE}」 the three-day shutdown is one rectangle, not three`, () => {
    const frame = tierFrame('yearMonthDayWeekday')
    const runs = runsOf(shadeOf(frame.svg()))
    const held = runs.filter((one) => [10, 11, 12].some((d) => coveredBy(frame, [one], dayFromText(on(3, d)))))
    expect(held).toHaveLength(1)
  })

  for (const tier of TIERS) {
    it(`「${OD_6_ONE}」 ${tier}: at most one shade element, and it is a <path>`, () => {
      const shades = shadesOf(tierFrame(tier).svg())
      expect(shades.length).toBeLessThanOrEqual(1)
      for (const one of shades) expect(one.tag).toBe('path')
    })
  }

  it(`「${OD_6_ONE}」 many runs in view still make one element`, () => {
    const runs = runsOf(shadeOf(tierFrame('yearMonthDayWeekday').svg()))
    expect(runs.length, 'premise: more than one run in view').toBeGreaterThan(2)
  })
})

describe('OD-7 -- the image export shades the same days the same way', () => {
  for (const preference of ['light', 'dark'] as const) {
    it(`「${OD_7_EXPORT}」 ${preference}: the export picture has the same shade as the screen`, () => {
      const frame = tierFrame('yearMonthDayWeekday')
      const screen = shadeOf(frame.svg('screen', preference))
      const exported = shadeOf(frame.svg('export', preference))
      expect(exported.zo).toContain('ZO-7')
      expect(normalColor(attrOf(exported.attrs, 'fill') ?? '')).toBe(t236('S-450', preference))
      sameRuns(runsOf(exported), runsOf(screen), `export (${preference})`)
    })
  }

  it(`「${OD_7_EXPORT}」 at the week tier the export shades only the exception days too`, () => {
    const frame = tierFrame('yearMonthWeek')
    const svg = frame.svg('export')
    sameRuns(runsOf(shadeOf(svg)), expectedRunsOf(frame, svg, offByException(EXCEPTIONS)), 'export week tier')
  })
})
