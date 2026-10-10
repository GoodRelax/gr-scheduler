// SvgRenderer -- the chart's grid: task group bands and rules, date rules and the ruler band.
// @unit      UF-82   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DrawnSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  DEFAULT_CALENDAR_VALUES,
  dayOf,
  isNonRecurringException,
  isWorkingDay,
  workingCalendarOf,
  type CalendarDay,
  type Exception,
  type Schedule,
  type WeekDay,
  type WorkingCalendar,
} from '../../entity/document-model/schedule/schedule'
import {
  dateAtX,
  labelWidth,
  tickStrideOf,
  xFromDay,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  GROUP_GRID_LINE_WIDTH_PX,
  NOT_STORED_RULER_WEEKDAY_SIZES,
  escaped,
  figureKey,
  rounded,
  typefaceAttribute,
  type ChosenColor,
} from './svg-renderer'

export interface GridInput {
  readonly schedule: Schedule
  readonly settings: DrawnSettings
  readonly layout: ScheduleLayout
  readonly area: ScreenRect
  readonly areaBottom: number
  readonly scrollTop: number
  readonly monochrome: boolean
  readonly themed: (rowId: string) => string
  readonly chosen: ChosenColor
  readonly colorOfGroup: ReadonlyMap<
    Schedule['taskGroups'][number]['id'],
    Schedule['taskGroups'][number]['color']
  >
}

export interface GridParts {
  readonly bandParts: readonly string[]
}

// see FR-042
/** @purity pure */
function bandTaskGroupOf(depth: number, position: number): string {
  if (depth === 1) return 'S-166'
  return position % 2 === 0 ? 'S-164' : 'S-167'
}

// see T-238
type RulerRow = 'year' | 'yearMonth' | 'month' | 'week' | 'day' | 'weekday'

const ROWS_OF_TIER: { readonly [tier in ScheduleLayout['tier']]: readonly RulerRow[] } = {
  year: ['year'],
  yearMonth: ['year', 'month'],
  yearMonthWeek: ['yearMonth', 'week'],
  yearMonthDayWeekday: ['yearMonth', 'day', 'weekday'],
}

const MS_PER_DAY = 86400000

/** @purity pure */
function serialOf(day: CalendarDay): number {
  return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY)
}

/** @purity pure */
function dayOfSerial(serial: number): CalendarDay {
  const at = new Date(serial * MS_PER_DAY)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

/** @purity pure */
function weekdayOf(day: CalendarDay): number {
  return new Date(Date.UTC(day.year, day.month - 1, day.day)).getUTCDay()
}

/** @purity pure */
function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

// see LF-1
/** @purity pure */
function ticksOfRow(
  row: RulerRow,
  layout: ScheduleLayout,
  stride: number,
  weekStart: number,
  from: CalendarDay,
  right: number,
  cap: number,
): readonly CalendarDay[] {
  const out: CalendarDay[] = []
  const firstSerial = serialOf(from)
  // TRAP: anchor the stride on the day serial, not the left edge, or every label jumps on a one-day pan.
  let at: CalendarDay =
    row === 'year'
      ? { year: from.year, month: 1, day: 1 }
      : row === 'yearMonth' || row === 'month'
        ? { year: from.year, month: from.month, day: 1 }
        : row === 'week'
          ? dayOfSerial(firstSerial - ((weekdayOf(from) - weekStart + 7) % 7))
          : dayOfSerial(Math.floor(firstSerial / stride) * stride)
  for (let step = 0; step <= cap; step++) {
    if (xFromDay(layout, at) >= right) break
    out.push(at)
    at =
      row === 'year'
        ? { year: at.year + 1, month: 1, day: 1 }
        : row === 'yearMonth' || row === 'month'
          ? { year: at.month === 12 ? at.year + 1 : at.year, month: (at.month % 12) + 1, day: 1 }
          : dayOfSerial(serialOf(at) + (row === 'week' ? 7 : stride))
  }
  return out
}

// see T-238
/** @purity pure */
function rulerLabelOf(row: RulerRow, day: CalendarDay, weekdayWords: readonly string[]): string {
  return row === 'year'
    ? String(day.year)
    : row === 'yearMonth'
      ? `${day.year}-${twoDigits(day.month)}`
      : row === 'month'
        ? String(day.month)
        : row === 'weekday'
          ? (weekdayWords[weekdayOf(day)] ?? '')
          : String(day.day)
}

// see LF-19
// WHY: the FR-093 estimate, never a measured width: the band is drawn every frame (S-30).
/** @purity pure */
function rulerLabelLeftOf(
  tickX: number,
  nextTickX: number | null,
  label: string,
  fontSize: number,
  bandLeft: number,
  settings: DrawnSettings,
): number | null {
  if (tickX >= bandLeft) return tickX
  if (nextTickX === null) return bandLeft
  const pulledRight = bandLeft + labelWidth(label, fontSize, settings)
  return pulledRight > nextTickX - settings.rulerLabelGap ? null : bandLeft
}

// see T-238, LF-19
/** @purity pure */
function rulerLabelSvg(
  row: RulerRow,
  day: CalendarDay,
  tickX: number,
  nextTickX: number | null,
  baseline: number,
  bandLeft: number,
  settings: DrawnSettings,
  ink: string,
  weekdayWords: readonly string[],
): string | null {
  const label = rulerLabelOf(row, day, weekdayWords)
  const fontSize =
    row === 'weekday'
      ? settings.rulerFont * NOT_STORED_RULER_WEEKDAY_SIZES['S-219']
      : settings.rulerFont
  const left = rulerLabelLeftOf(tickX, nextTickX, label, fontSize, bandLeft, settings)
  if (left === null) return null
  return (
    `<text x="${rounded(left)}" y="${rounded(baseline)}"` +
    ` font-size="${rounded(fontSize)}"${typefaceAttribute()} fill="${ink}"` +
    ` xml:space="preserve"${figureKey(`ruler-${row}-label-${serialOf(day)}`)}>` +
    `${escaped(label)}</text>`
  )
}

// see FR-017
/** @purity pure */
export function rulerSvg(
  layout: ScheduleLayout,
  settings: DrawnSettings,
  band: ScreenRect,
  weekStart: number,
  ground: string,
  ink: string,
  rule: string,
  weekdayWords: readonly string[],
): readonly string[] {
  if (band.width <= 0 || band.height <= 0) return []
  const from = dateAtX(layout, band.x)
  if (from === null) return []

  const rows = ROWS_OF_TIER[layout.tier]
  const taskGroupHeight = band.height / rows.length
  const right = band.x + band.width
  const stride = tickStrideOf(layout, settings)
  const cap = Math.ceil(band.width / Math.max(0.001, layout.pxPerDay)) + 1
  const out: string[] = []
  out.push(
    `<rect x="${rounded(band.x)}" y="${rounded(band.y)}"` +
      ` width="${rounded(band.width)}" height="${rounded(band.height)}"` +
      ` fill="${ground}"${figureKey('ruler-ground')}/>`,
  )

  for (const [index, row] of rows.entries()) {
    const top = band.y + index * taskGroupHeight
    const baseline =
      top + settings.rulerLabelPad + settings.rulerFont - settings.rulerLabelBottomPad
    if (index > 0) {
      out.push(
        `<line x1="${rounded(band.x)}" y1="${rounded(top)}"` +
          ` x2="${rounded(right)}" y2="${rounded(top)}"` +
          ` stroke="${rule}" stroke-width="1"${figureKey(`ruler-${row}-rule`)}/>`,
      )
    }
    const ticks = ticksOfRow(row, layout, stride, weekStart, from, right, cap)
    for (const [at, day] of ticks.entries()) {
      const x = xFromDay(layout, day)
      // TRAP: skip only the rule left of the band; LF-19 pulls its label to the edge instead.
      if (x >= band.x) {
        out.push(
          `<line x1="${rounded(x)}" y1="${rounded(top)}"` +
            ` x2="${rounded(x)}" y2="${rounded(top + taskGroupHeight)}"` +
            ` stroke="${rule}" stroke-width="1"` +
            `${figureKey(`ruler-${row}-tick-${serialOf(day)}`)}/>`,
        )
      }
      const next = ticks[at + 1]
      const nextX = next === undefined ? null : xFromDay(layout, next)
      const label = rulerLabelSvg(row, day, x, nextX, baseline, band.x, settings, ink, weekdayWords)
      if (label !== null) out.push(label)
    }
  }
  out.push(
    `<line x1="${rounded(band.x)}" y1="${rounded(band.y + band.height)}"` +
      ` x2="${rounded(right)}" y2="${rounded(band.y + band.height)}"` +
      ` stroke="${rule}" stroke-width="1"${figureKey('ruler-foot-rule')}/>`,
  )
  return out
}

// see FR-051, EP-5
// WHY: the band runs on through canvasPadding up to the vertical bar's left edge; the export
// draws it alike, so the two pictures differ only where table T-076 says.
/** @purity pure */
export function bandWidthOf(input: GridInput): number {
  return input.area.width + input.settings.canvasPadding
}

const EVERY_WEEKDAY_WORKS: readonly WeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayType, ordinal) => ({
  ordinal,
  dayType,
  dayWorking: true,
  carry: {},
  carryElements: [],
}))

// see OD-1, OD-2
// WHY: weekdays that all work leave only the days an Exception made non-working.
/** @purity pure */
function shadedCalendarOf(schedule: Schedule, tier: ScheduleLayout['tier']): WorkingCalendar | null {
  if (tier === 'year') return null
  const within = workingCalendarOf(schedule)
  const exceptions = within.exceptions.filter(isNonRecurringException)
  if (tier === 'yearMonthDayWeekday') return { ...within, exceptions }
  const madeOff = exceptions.filter((one) => one.dayWorking !== true)
  if (madeOff.length === 0) return null
  return { ...within, weekDays: EVERY_WEEKDAY_WORKS, exceptions: madeOff }
}

// see FR-054
// WHY: a reach that holds every day the Exception can cover; a date it cannot read reaches every day.
/** @purity pure */
function reachOf(exception: Exception, first: number, last: number): readonly [number, number] {
  const from = dayOf(exception.fromDate)
  const to = dayOf(exception.toDate)
  if (from === null || to === null || serialOf(to) < serialOf(from)) return [first, last]
  return [Math.max(first, serialOf(from)), Math.min(last, serialOf(to))]
}

// see FR-054, NFR-013
// WHY: each day is judged on only the Exceptions that can reach it, so the calendar's index is built over
// a few rows a day, not every Exception: built per day over all of them, it was 80% of a frame (DFC-2314).
// TRAP: a superset in the calendar's own order is enough, as isWorkingDay keeps the first row that covers
// the day; it alone reads what a kept row means. Days past `last` get the whole calendar.
/** @purity pure */
function dayCalendarsOf(shaded: WorkingCalendar, first: number, last: number): (atSerial: number) => WorkingCalendar {
  const bare: WorkingCalendar = { ...shaded, exceptions: [] }
  const byDay = new Map<number, Exception[]>()
  for (const exception of shaded.exceptions) {
    const [from, to] = reachOf(exception, first, last)
    for (let at = from; at <= to; at++) byDay.set(at, [...(byDay.get(at) ?? []), exception])
  }
  return (atSerial) => {
    if (atSerial < first || atSerial > last) return shaded
    const kept = byDay.get(atSerial)
    return kept === undefined ? bare : { ...shaded, exceptions: kept }
  }
}

// see T-343, FR-054
// TRAP: one path for every run in view (OD-6); a rect per day multiplies the elements by the days drawn.
/** @purity pure */
function nonWorkingDaysSvg(input: GridInput): string | null {
  const { schedule, layout, area, themed } = input
  const shaded = shadedCalendarOf(schedule, layout.tier)
  if (shaded === null || layout.pxPerDay <= 0) return null
  const left = area.x
  const right = area.x + bandWidthOf(input)
  const from = dateAtX(layout, left)
  if (from === null) return null
  const top = rounded(area.y)
  const bottom = rounded(area.y + area.height)
  const runs: string[] = []
  let runFrom: number | null = null
  const closeRun = (endX: number): void => {
    if (runFrom === null) return
    const x0 = rounded(Math.max(left, runFrom))
    const x1 = rounded(Math.min(right, endX))
    if (x1 > x0) runs.push(`M${x0} ${top} H${x1} V${bottom} H${x0} Z`)
    runFrom = null
  }
  const firstSerial = serialOf(from)
  const calendarOn = dayCalendarsOf(shaded, firstSerial, firstSerial + Math.ceil((right - left) / layout.pxPerDay) + 1)
  for (let at = firstSerial; ; at++) {
    const day = dayOfSerial(at)
    const x = xFromDay(layout, day)
    if (x >= right) break
    const isOff = !isWorkingDay(calendarOn(at), day)
    if (isOff && runFrom === null) runFrom = x
    if (!isOff) closeRun(x)
  }
  closeRun(right)
  if (runs.length === 0) return null
  return `<path d="${runs.join(' ')}" fill="${themed('S-450')}"${figureKey('non-working-days')}/>`
}

// see FR-089
/** @purity pure */
function dateGridParts(input: GridInput): readonly string[] {
  const { schedule, settings, layout, area, themed } = input
  if (!settings.dateGridLinesVisible) return []
  const gridFrom = dateAtX(layout, area.x)
  if (gridFrom === null) return []
  const finest = ROWS_OF_TIER[layout.tier][ROWS_OF_TIER[layout.tier].length - 1]
  const gridCap = Math.ceil(area.width / Math.max(0.001, layout.pxPerDay)) + 1
  const stride = tickStrideOf(layout, settings)
  const weekStart = schedule.project.weekStartDay ?? DEFAULT_CALENDAR_VALUES['S-108']
  const out: string[] = []
  for (const day of ticksOfRow(
    finest ?? 'year',
    layout,
    stride,
    weekStart,
    gridFrom,
    area.x + area.width,
    gridCap,
  )) {
    const x = xFromDay(layout, day)
    if (x < area.x) continue
    out.push(
      `<line x1="${rounded(x)}" y1="${rounded(area.y)}"` +
        ` x2="${rounded(x)}" y2="${rounded(area.y + area.height)}"` +
        ` stroke="${themed('S-149')}" stroke-width="1"` +
        `${figureKey(`date-grid-${serialOf(day)}`)}/>`,
    )
  }
  return out
}

// see FR-089, FR-042, OD-4
/** @purity pure */
export function gridParts(input: GridInput): GridParts {
  const { settings, layout, area, areaBottom, scrollTop, themed, chosen, colorOfGroup } = input
  const bandParts: string[] = []
  const ruleParts: string[] = []
  for (const [position, taskGroup] of layout.taskGroups.entries()) {
    const top = Math.max(taskGroup.y, taskGroup.isPinned === true ? area.y : scrollTop)
    const bottom = Math.min(taskGroup.y + taskGroup.height, areaBottom)
    if (bottom <= top) continue
    const band = chosen(colorOfGroup.get(taskGroup.groupId) ?? null, 'band') ?? themed(bandTaskGroupOf(taskGroup.depth, position))
    const taskGroupKey = `task-group-${taskGroup.groupId}`
    bandParts.push(
      `<rect x="${rounded(area.x)}" y="${rounded(top)}"` +
        ` width="${rounded(bandWidthOf(input))}" height="${rounded(bottom - top)}"` +
        ` fill="${band}"${figureKey(`${taskGroupKey}-band`)}/>`,
    )
    if (!settings.groupGridLinesVisible) continue
    ruleParts.push(
      `<line x1="${rounded(area.x)}" y1="${rounded(bottom)}"` +
        ` x2="${rounded(area.x + bandWidthOf(input))}" y2="${rounded(bottom)}"` +
        ` stroke="${themed('S-165')}"` +
        ` stroke-width="${rounded(GROUP_GRID_LINE_WIDTH_PX)}"${figureKey(`${taskGroupKey}-rule`)}/>`,
    )
  }
  const shade = nonWorkingDaysSvg(input)
  if (shade !== null) bandParts.push(shade)
  bandParts.push(...ruleParts, ...dateGridParts(input))
  return { bandParts }
}
