// SvgRenderer -- the chart's grid: task group bands and rules, date rules and the ruler band.
// @unit      UF-82   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure

import {
  SETTINGS_CONSTANTS,
  type DrawnSettings,
} from '../../entity/document-model/document-settings/document-settings'
import {
  DEFAULT_CALENDAR_VALUES,
  dayOf,
  isNonRecurringException,
  isWorkingDay,
  MINUTES_PER_CALENDAR_DAY,
  weekDayOf,
  workingCalendarOf,
  workingSpansReader,
  dataWallOfViewWall,
  viewRegionOf,
  viewWallOfDataWall,
  zoneClockOf,
  type CalendarDay,
  type Exception,
  type Schedule,
  type WeekDay,
  type WorkingCalendar,
} from '../../entity/document-model/schedule/schedule'
import {
  dateAtX,
  labelWidth,
  snappedInstantAtX,
  thresholdPxPerDayOf,
  tickStrideOf,
  xFromDay,
  xOfInstant,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  rulerZoneRowHeightOf,
  rulerZoneRowsOf,
  type ScreenRect,
} from '../../entity/layout-engine/screen-regions/screen-regions'
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
type RulerRow = 'year' | 'yearMonth' | 'month' | 'week' | 'day' | 'weekday' | 'dateWeekday' | 'hour'

const ROWS_OF_TIER: { readonly [tier in ScheduleLayout['tier']]: readonly RulerRow[] } = {
  year: ['year'],
  yearMonth: ['year', 'month'],
  yearMonthWeek: ['yearMonth', 'week'],
  yearMonthDayWeekday: ['yearMonth', 'day', 'weekday'],
  dayHour: ['dateWeekday', 'hour'],
}

const MINUTES_PER_HOUR = 60

const HOURS_PER_DAY = 24

const HALF_HOUR_MINUTES = 30

// see TM-5
const HOUR_LABEL_STRIDES = [1, 2, 3] as const

const WIDEST_HOUR_LABEL_STRIDE = 3

// see TM-5, S-83
// WHY: a two-digit hour label and its gap, the width S-83's note derives its threshold from.
/** @purity pure */
function hourStrideOf(pxPerDay: number, settings: DrawnSettings): number {
  const room = labelWidth('00', settings.rulerFont, settings) + settings.rulerLabelGap
  const pxPerHour = pxPerDay / HOURS_PER_DAY
  return HOUR_LABEL_STRIDES.find((stride) => stride * pxPerHour >= room) ?? WIDEST_HOUR_LABEL_STRIDE
}

// see FR-017, TM-5, S-578
/** @purity pure */
function isHalfHourGridShown(pxPerDay: number, settings: DrawnSettings): boolean {
  return settings.showsTimeOfDay && thresholdPxPerDayOf(pxPerDay, settings) >= SETTINGS_CONSTANTS.halfHourGridPxPerDay
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

// see FR-156, S-574, FR-158
// WHY: the ruler's x of a wall-clock minute of one region; the x axis itself is the schedule data's wall clock.
interface RulerAxis {
  xOfWall(wallMinute: number): number
  xOfDay(day: CalendarDay): number
  wallAtX(x: number): number
}

// see FR-156, S-574, FR-158
// WHY: the same region, or time of day not shown (bars stand on the data's days, JDG-1715), needs no clock at all.
/** @purity pure */
function rulerAxisOf(layout: ScheduleLayout, region: string, dataRegion: string, isTimeShown: boolean): RulerAxis {
  const dataXOf = (wall: number): number => xOfInstant(layout, wall)
  const dataWallAt = (x: number): number => snappedInstantAtX(layout, x, 1) ?? 0
  if (!isTimeShown || region === dataRegion) {
    return { xOfWall: dataXOf, xOfDay: (day) => xFromDay(layout, day), wallAtX: dataWallAt }
  }
  const data = zoneClockOf(dataRegion)
  const zone = zoneClockOf(region)
  const xOfWall = (wall: number): number => dataXOf(dataWallOfViewWall(data, zone, wall))
  return {
    xOfWall,
    xOfDay: (day) => xOfWall(serialOf(day) * MINUTES_PER_CALENDAR_DAY),
    wallAtX: (x) => viewWallOfDataWall(data, zone, dataWallAt(x)),
  }
}

// see FR-156, S-574
/** @purity pure */
function viewAxisOf(layout: ScheduleLayout, settings: DrawnSettings, dataRegion: string): RulerAxis {
  return rulerAxisOf(layout, viewRegionOf(dataRegion, settings.viewTimeZone), dataRegion, settings.showsTimeOfDay)
}

/** @purity pure */
function dayAtX(axis: RulerAxis, x: number): CalendarDay {
  return dayOfSerial(Math.floor(axis.wallAtX(x) / MINUTES_PER_CALENDAR_DAY))
}

// see LF-1
/** @purity pure */
function ticksOfRow(
  row: RulerRow,
  axis: RulerAxis,
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
    if (axis.xOfDay(at) >= right) break
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
          : row === 'dateWeekday'
            ? `${day.year}/${day.month}/${day.day} (${weekdayWords[weekdayOf(day)] ?? ''})`
            : String(day.day)
}

interface RulerRowBox {
  readonly top: number
  readonly height: number
  readonly baseline: number
  readonly left: number
  readonly right: number
}

// see TM-5, FR-017
// WHY: an hour's label stands on the day's own grid of strides, so a pan never re-labels the hours.
/** @purity pure */
function hourRowSvg(
  axis: RulerAxis,
  layout: ScheduleLayout,
  settings: DrawnSettings,
  row: RulerRowBox,
  look: RulerInk,
  keyHead = 'ruler-hour',
): readonly string[] {
  const stride = hourStrideOf(layout.pxPerDay, settings)
  const out: string[] = []
  for (let hour = serialOf(dayAtX(axis, row.left)) * HOURS_PER_DAY; ; hour += stride) {
    const instant = hour * MINUTES_PER_HOUR
    const x = axis.xOfWall(instant)
    if (x >= row.right) break
    if (x < row.left) continue
    out.push(
      `<line x1="${rounded(x)}" y1="${rounded(row.top)}" x2="${rounded(x)}" y2="${rounded(row.top + row.height)}"` +
        ` stroke="${look.rule}" stroke-width="1"${figureKey(`${keyHead}-tick-${instant}`)}/>`,
      rowLabelSvg(x, row, settings, look.ink, `${keyHead}-label-${instant}`, String(hour % HOURS_PER_DAY)),
    )
  }
  return out
}

/** @purity pure */
function rowLabelSvg(x: number, row: RulerRowBox, settings: DrawnSettings, ink: string, key: string, label: string): string {
  return (
    `<text x="${rounded(x)}" y="${rounded(row.baseline)}" font-size="${rounded(settings.rulerFont)}"` +
    `${typefaceAttribute()} fill="${ink}" xml:space="preserve"${figureKey(key)}>${escaped(label)}</text>`
  )
}

// see FR-017, FR-156
// WHY: the widest m/d a zone row prints, the width its stride must leave room for (S-83's derivation).
const WIDEST_ZONE_DATE = '12/31'

// see FR-017, FR-156
// WHY: off the hour tier a zone's row prints the zone's own midnight as m/d, as often as the label fits.
/** @purity pure */
function zoneDateRowSvg(axis: RulerAxis, layout: ScheduleLayout, settings: DrawnSettings, row: RulerRowBox, look: RulerInk, keyHead: string): readonly string[] {
  const room = labelWidth(WIDEST_ZONE_DATE, settings.rulerFont, settings) + settings.rulerLabelGap
  const stride = Math.max(1, Math.ceil(room / Math.max(0.001, layout.pxPerDay)))
  const out: string[] = []
  for (let serial = Math.floor(serialOf(dayAtX(axis, row.left)) / stride) * stride; ; serial += stride) {
    const x = axis.xOfWall(serial * MINUTES_PER_CALENDAR_DAY)
    if (x >= row.right) break
    if (x < row.left) continue
    const day = dayOfSerial(serial)
    out.push(rowLabelSvg(x, row, settings, look.ink, `${keyHead}-label-${serial}`, `${day.month}/${day.day}`))
  }
  return out
}

interface RulerInk {
  readonly ink: string
  readonly rule: string
}

// see FR-017, FR-156, T-238, T-376
// WHY: a row of the ruler read on one time zone's clock: the view base's hour row (TM-5) or a display zone's row.
export interface RulerClockRow {
  readonly zoneKey: string
  readonly top: number
  readonly height: number
  readonly baseline: number
}

/** @purity pure */
function rulerBaselineOf(top: number, settings: DrawnSettings): number {
  return top + settings.rulerLabelPad + settings.rulerFont - settings.rulerLabelBottomPad
}

// see FR-017, FR-156, S-575
// WHY: one row per shown zone under the tiers, each the height of one of the band's three rows.
/** @purity pure */
function zoneClockRowsOf(settings: DrawnSettings, band: ScreenRect): readonly RulerClockRow[] {
  const zones = rulerZoneRowsOf(settings)
  const height = rulerZoneRowHeightOf(settings)
  return zones.map((zoneKey, index) => {
    const top = band.y + band.height - (zones.length - index) * height
    return { zoneKey, top, height, baseline: rulerBaselineOf(top, settings) }
  })
}

// see FR-017, FR-156, TM-5, S-574, S-575
// WHY: the rows whose left blank prints a time zone's abbreviation (JDG-2043): the view base's hour row only while
// the ruler is at the hour tier, every display zone's row while time of day is shown.
/** @purity pure */
export function rulerClockRowsOf(
  tier: ScheduleLayout['tier'],
  settings: DrawnSettings,
  band: ScreenRect,
  dataRegion: string,
): readonly RulerClockRow[] {
  const zones = zoneClockRowsOf(settings, band)
  if (tier !== 'dayHour') return zones
  const rows = ROWS_OF_TIER[tier]
  const height = (band.height - zones.length * rulerZoneRowHeightOf(settings)) / rows.length
  const top = band.y + rows.indexOf('hour') * height
  const base = { zoneKey: viewRegionOf(dataRegion, settings.viewTimeZone), top, height, baseline: rulerBaselineOf(top, settings) }
  return [base, ...zones]
}

// see FR-017, FR-156, S-575
// WHY: one row per shown zone under the tiers, each the height of one of the band's three rows.
/** @purity pure */
function zoneRowsSvg(layout: ScheduleLayout, settings: DrawnSettings, band: ScreenRect, dataRegion: string, look: RulerInk): readonly string[] {
  const right = band.x + band.width
  const out: string[] = []
  for (const [index, { zoneKey: zone, top, height, baseline }] of zoneClockRowsOf(settings, band).entries()) {
    const row: RulerRowBox = { top, height, baseline, left: band.x, right }
    const axis = rulerAxisOf(layout, zone, dataRegion, true)
    const keyHead = `ruler-zone-${index}`
    out.push(
      `<line x1="${rounded(band.x)}" y1="${rounded(top)}" x2="${rounded(right)}" y2="${rounded(top)}"` +
        ` stroke="${look.rule}" stroke-width="1"${figureKey(`${keyHead}-rule`)}/>`,
      ...(layout.tier === 'dayHour'
        ? hourRowSvg(axis, layout, settings, row, look, keyHead)
        : zoneDateRowSvg(axis, layout, settings, row, look, keyHead)),
    )
  }
  return out
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
  dataRegion: string,
): readonly string[] {
  if (band.width <= 0 || band.height <= 0 || layout.originDay === null) return []
  const axis = viewAxisOf(layout, settings, dataRegion)
  const from = dayAtX(axis, band.x)

  const rows = ROWS_OF_TIER[layout.tier]
  const taskGroupHeight = (band.height - rulerZoneRowsOf(settings).length * rulerZoneRowHeightOf(settings)) / rows.length
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
    const baseline = rulerBaselineOf(top, settings)
    if (index > 0) {
      out.push(
        `<line x1="${rounded(band.x)}" y1="${rounded(top)}"` +
          ` x2="${rounded(right)}" y2="${rounded(top)}"` +
          ` stroke="${rule}" stroke-width="1"${figureKey(`ruler-${row}-rule`)}/>`,
      )
    }
    if (row === 'hour') {
      out.push(...hourRowSvg(axis, layout, settings, { top, height: taskGroupHeight, baseline, left: band.x, right }, { ink, rule }))
      continue
    }
    const ticks = ticksOfRow(row, axis, stride, weekStart, from, right, cap)
    for (const [at, day] of ticks.entries()) {
      const x = axis.xOfDay(day)
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
      const nextX = next === undefined ? null : axis.xOfDay(next)
      const label = rulerLabelSvg(row, day, x, nextX, baseline, band.x, settings, ink, weekdayWords)
      if (label !== null) out.push(label)
    }
  }
  out.push(
    ...zoneRowsSvg(layout, settings, band, dataRegion, { ink, rule }),
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
export function bandWidthOf(input: Pick<GridInput, 'area' | 'settings'>): number {
  return input.area.width + input.settings.canvasPadding
}

const EVERY_WEEKDAY_WORKS: readonly WeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayType, ordinal) =>
  weekDayOf(ordinal, dayType, true))

// see OD-1, OD-2
// WHY: weekdays that all work leave only the days an Exception made non-working.
/** @purity pure */
function shadedCalendarOf(schedule: Schedule, tier: ScheduleLayout['tier']): WorkingCalendar | null {
  if (tier === 'year') return null
  const within = workingCalendarOf(schedule)
  const exceptions = within.exceptions.filter(isNonRecurringException)
  if (tier === 'yearMonthDayWeekday' || tier === 'dayHour') return { ...within, exceptions }
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

// see OD-1, OD-2, FR-054
// WHY: on the hour tier the hours outside a day's working-time ranges are shaded too; a non-working day has none.
/** @purity pure */
function offHourRunsOf(shaded: WorkingCalendar, firstSerial: number, lastSerial: number): readonly (readonly [number, number])[] {
  const spansOn = workingSpansReader(shaded)
  const runs: [number, number][] = []
  const add = (from: number, to: number): void => {
    if (to <= from) return
    const last = runs[runs.length - 1]
    if (last !== undefined && last[1] === from) last[1] = to
    else runs.push([from, to])
  }
  for (let at = firstSerial; at <= lastSerial; at++) {
    const base = at * MINUTES_PER_CALENDAR_DAY
    let open = base
    for (const span of spansOn(at)) {
      add(open, base + span.from)
      open = Math.max(open, base + span.to)
    }
    add(open, base + MINUTES_PER_CALENDAR_DAY)
  }
  return runs
}

interface ShadeBox {
  readonly left: number
  readonly right: number
  readonly firstSerial: number
  readonly lastSerial: number
  run(x0: number, x1: number): string | null
}

// see T-343, OD-6
// WHY: the box both shades read: the band's left and right, the days it shows, and one run as a path piece.
/** @purity pure */
function shadeBoxOf(input: GridInput, from: CalendarDay): ShadeBox {
  const { layout, area } = input
  const left = area.x
  const right = area.x + bandWidthOf(input)
  const top = rounded(area.y)
  const bottom = rounded(area.y + area.height)
  const firstSerial = serialOf(from)
  return {
    left,
    right,
    firstSerial,
    lastSerial: firstSerial + Math.ceil((right - left) / layout.pxPerDay) + 1,
    // TRAP: compare the numbers, never rounded()'s strings: '1147.5' > '697.5' is false (DFC-2467, DFC-2468).
    run(x0, x1) {
      const [from0, to1] = [rounded(Math.max(left, x0)), rounded(Math.min(right, x1))]
      return Number(to1) > Number(from0) ? `M${from0} ${top} H${to1} V${bottom} H${from0} Z` : null
    },
  }
}

/** @purity pure */
function shadePathSvg(runs: readonly string[], themed: GridInput['themed']): string | null {
  if (runs.length === 0) return null
  return `<path d="${runs.join(' ')}" fill="${themed('S-450')}"${figureKey('non-working-days')}/>`
}

// see OD-1, OD-2, OD-6
/** @purity pure */
function offHoursSvg(input: GridInput, shaded: WorkingCalendar, box: ShadeBox): string | null {
  const paths: string[] = []
  for (const [runFrom, runTo] of offHourRunsOf(shaded, box.firstSerial, box.lastSerial)) {
    const piece = box.run(xOfInstant(input.layout, runFrom), xOfInstant(input.layout, runTo))
    if (piece !== null) paths.push(piece)
  }
  return shadePathSvg(paths, input.themed)
}

// see T-343, FR-054
// TRAP: one path for every run in view (OD-6); a rect per day multiplies the elements by the days drawn.
/** @purity pure */
function nonWorkingDaysSvg(input: GridInput): string | null {
  const { schedule, layout, area } = input
  const shaded = shadedCalendarOf(schedule, layout.tier)
  if (shaded === null || layout.pxPerDay <= 0) return null
  const from = dateAtX(layout, area.x)
  if (from === null) return null
  const box = shadeBoxOf(input, from)
  if (layout.tier === 'dayHour') return offHoursSvg(input, shaded, box)
  const runs: string[] = []
  let runFrom: number | null = null
  const closeRun = (endX: number): void => {
    if (runFrom === null) return
    const piece = box.run(runFrom, endX)
    if (piece !== null) runs.push(piece)
    runFrom = null
  }
  const calendarOn = dayCalendarsOf(shaded, box.firstSerial, box.lastSerial)
  for (let at = box.firstSerial; ; at++) {
    const day = dayOfSerial(at)
    const x = xFromDay(layout, day)
    if (x >= box.right) break
    const isOff = !isWorkingDay(calendarOn(at), day)
    if (isOff && runFrom === null) runFrom = x
    if (!isOff) closeRun(x)
  }
  closeRun(box.right)
  return shadePathSvg(runs, input.themed)
}

// see FR-089, TM-5, FR-017, S-578, S-581
// WHY: every hour a solid rule and, past S-578, every half hour a dotted one, in the date rule's color and width.
/** @purity pure */
function hourGridParts(input: GridInput, axis: RulerAxis): readonly string[] {
  const { settings, layout, area, themed } = input
  const step = isHalfHourGridShown(layout.pxPerDay, settings) ? HALF_HOUR_MINUTES : MINUTES_PER_HOUR
  const dash = SETTINGS_CONSTANTS.halfHourGridDash
  const out: string[] = []
  for (let instant = serialOf(dayAtX(axis, area.x)) * MINUTES_PER_CALENDAR_DAY; ; instant += step) {
    const x = axis.xOfWall(instant)
    if (x >= area.x + area.width) break
    if (x < area.x) continue
    const isHalf = instant % MINUTES_PER_HOUR !== 0
    const key = instant % MINUTES_PER_CALENDAR_DAY === 0 ? `date-grid-${instant / MINUTES_PER_CALENDAR_DAY}` : `hour-grid-${instant}`
    out.push(
      `<line x1="${rounded(x)}" y1="${rounded(area.y)}" x2="${rounded(x)}" y2="${rounded(area.y + area.height)}"` +
        ` stroke="${themed('S-149')}" stroke-width="1"${isHalf ? ` stroke-dasharray="${dash.on} ${dash.off}"` : ''}` +
        `${figureKey(key)}/>`,
    )
  }
  return out
}

// see FR-089
/** @purity pure */
function dateGridParts(input: GridInput): readonly string[] {
  const { schedule, settings, layout, area, themed } = input
  if (!settings.dateGridLinesVisible || layout.originDay === null) return []
  const axis = viewAxisOf(layout, settings, schedule.project.scheduleDataTimeZone)
  const gridFrom = dayAtX(axis, area.x)
  if (layout.tier === 'dayHour') return hourGridParts(input, axis)
  const finest = ROWS_OF_TIER[layout.tier][ROWS_OF_TIER[layout.tier].length - 1]
  const gridCap = Math.ceil(area.width / Math.max(0.001, layout.pxPerDay)) + 1
  const stride = tickStrideOf(layout, settings)
  const weekStart = schedule.project.weekStartDay ?? DEFAULT_CALENDAR_VALUES['S-108']
  const out: string[] = []
  for (const day of ticksOfRow(
    finest ?? 'year',
    axis,
    stride,
    weekStart,
    gridFrom,
    area.x + area.width,
    gridCap,
  )) {
    const x = axis.xOfDay(day)
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
