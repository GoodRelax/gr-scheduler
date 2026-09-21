// SvgRenderer -- the chart's grid: row bands and rules, date rules and the ruler band.
// @unit      UF-82   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  DEFAULT_CALENDAR_VALUES,
  type CalendarDay,
  type Schedule,
} from '../../entity/document-model/schedule/schedule'
import {
  dateAtX,
  tickStrideOf,
  xFromDay,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  GROUP_GRID_LINE_WIDTH_PX,
  NOT_STORED_RULER_WEEKDAY_SIZES,
  achromatic,
  escaped,
  figureKey,
  rounded,
  typefaceAttribute,
} from './svg-renderer'

export interface GridInput {
  readonly schedule: Schedule
  readonly settings: DocumentSettings
  readonly layout: ScheduleLayout
  readonly area: ScreenRect
  readonly areaBottom: number
  readonly scrollTop: number
  readonly monochrome: boolean
  readonly themed: (rowId: string) => string
  readonly colourOfGroup: ReadonlyMap<
    Schedule['taskGroups'][number]['id'],
    Schedule['taskGroups'][number]['color']
  >
}

export interface GridParts {
  readonly bandParts: readonly string[]
}

// see FR-042
/** @purity pure */
function bandRowOf(depth: number, position: number): string {
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

// see FR-017
/** @purity pure */
export function rulerSvg(
  layout: ScheduleLayout,
  settings: DocumentSettings,
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
  const rowHeight = band.height / rows.length
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
    const top = band.y + index * rowHeight
    const baseline =
      top + settings.rulerLabelPad + settings.rulerFont - settings.rulerLabelBottomPad
    if (index > 0) {
      out.push(
        `<line x1="${rounded(band.x)}" y1="${rounded(top)}"` +
          ` x2="${rounded(right)}" y2="${rounded(top)}"` +
          ` stroke="${rule}" stroke-width="1"${figureKey(`ruler-${row}-rule`)}/>`,
      )
    }
    for (const day of ticksOfRow(row, layout, stride, weekStart, from, right, cap)) {
      const x = xFromDay(layout, day)
      // TRAP: skip only the rule left of the band, never the label: the year row would go empty.
      if (x >= band.x) {
        out.push(
          `<line x1="${rounded(x)}" y1="${rounded(top)}"` +
            ` x2="${rounded(x)}" y2="${rounded(top + rowHeight)}"` +
            ` stroke="${rule}" stroke-width="1"` +
            `${figureKey(`ruler-${row}-tick-${serialOf(day)}`)}/>`,
        )
      }
      const label =
        row === 'year'
          ? String(day.year)
          : row === 'yearMonth'
            ? `${day.year}-${twoDigits(day.month)}`
            : row === 'month'
              ? String(day.month)
              : row === 'weekday'
                ? (weekdayWords[weekdayOf(day)] ?? '')
                : String(day.day)
      const fontSize =
        row === 'weekday'
          ? settings.rulerFont * NOT_STORED_RULER_WEEKDAY_SIZES['S-219']
          : settings.rulerFont
      // STOP: spec does not decide a tick-to-label inset; the label starts on its rule. Looked in S-135, S-136
      // @provisional PND-477
      out.push(
        `<text x="${rounded(Math.max(x, band.x))}" y="${rounded(baseline)}"` +
          ` font-size="${rounded(fontSize)}"${typefaceAttribute()} fill="${ink}"` +
          ` xml:space="preserve"${figureKey(`ruler-${row}-label-${serialOf(day)}`)}>` +
          `${escaped(label)}</text>`,
      )
    }
  }
  out.push(
    `<line x1="${rounded(band.x)}" y1="${rounded(band.y + band.height)}"` +
      ` x2="${rounded(right)}" y2="${rounded(band.y + band.height)}"` +
      ` stroke="${rule}" stroke-width="1"${figureKey('ruler-foot-rule')}/>`,
  )
  return out
}

// see FR-089, FR-042
/** @purity pure */
export function gridParts(input: GridInput): GridParts {
  const {
    schedule,
    settings,
    layout,
    area,
    areaBottom,
    scrollTop,
    monochrome,
    themed,
    colourOfGroup,
  } = input
  const bandParts: string[] = []
  for (const [position, row] of layout.rows.entries()) {
    const top = Math.max(row.y, row.isPinned === true ? area.y : scrollTop)
    const bottom = Math.min(row.y + row.height, areaBottom)
    if (bottom <= top) continue
    const chosen = colourOfGroup.get(row.groupId) ?? null
    const band = chosen === null ? themed(bandRowOf(row.depth, position)) : chosen
    const rowKey = `row-${row.groupId}`
    bandParts.push(
      `<rect x="${rounded(area.x)}" y="${rounded(top)}"` +
        ` width="${rounded(area.width)}" height="${rounded(bottom - top)}"` +
        ` fill="${monochrome ? achromatic(band) : band}"${figureKey(`${rowKey}-band`)}/>`,
    )
    if (!settings.groupGridLinesVisible) continue
    bandParts.push(
      `<line x1="${rounded(area.x)}" y1="${rounded(bottom)}"` +
        ` x2="${rounded(area.x + area.width)}" y2="${rounded(bottom)}"` +
        ` stroke="${themed('S-165')}"` +
        ` stroke-width="${rounded(GROUP_GRID_LINE_WIDTH_PX)}"${figureKey(`${rowKey}-rule`)}/>`,
    )
  }

  // STOP: spec does not decide the date grid line colour; here S-149. Looked in FR-089, T-236
  // @provisional PND-315
  if (settings.dateGridLinesVisible) {
    const gridFrom = dateAtX(layout, area.x)
    if (gridFrom !== null) {
      const finest = ROWS_OF_TIER[layout.tier][ROWS_OF_TIER[layout.tier].length - 1]
      const gridCap = Math.ceil(area.width / Math.max(0.001, layout.pxPerDay)) + 1
      const stride = tickStrideOf(layout, settings)
      const weekStart = schedule.project.weekStartDay ?? DEFAULT_CALENDAR_VALUES['S-108']
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
        bandParts.push(
          `<line x1="${rounded(x)}" y1="${rounded(area.y)}"` +
            ` x2="${rounded(x)}" y2="${rounded(area.y + area.height)}"` +
            ` stroke="${themed('S-149')}" stroke-width="1"` +
            `${figureKey(`date-grid-${serialOf(day)}`)}/>`,
        )
      }
    }
  }
  return { bandParts }
}
