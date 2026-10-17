// ScheduleLayout -- the time axis: a day to x and back, and the ruler tier (FR-017).
// @unit      UF-132  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import {
  SETTINGS_CONSTANTS,
  type DocumentSettings,
  type DrawnSettings,
} from '../../document-model/document-settings/document-settings'
import {
  calendarDaysBetween,
  dayOf,
  MINUTES_PER_CALENDAR_DAY,
  type CalendarDay,
} from '../../document-model/schedule/schedule'
import { drawnSettingsOf, type ScreenRegions } from '../screen-regions/screen-regions'
import type { RulerTier, ScheduleLayout } from './schedule-layout'

const MS_PER_DAY = 86400000

/** @purity pure */
export function serialOf(day: CalendarDay): number {
  return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY)
}

// see FR-017, S-8, T-205
/** @purity pure */
export function thresholdPxPerDayOf(pxPerDay: number, settings: DrawnSettings): number {
  return pxPerDay / (settings.rulerFontSizePx / SETTINGS_CONSTANTS.fontMin)
}

// see LC-3, FR-017, T-252, DS-1, DS-4, S-8, TM-5, S-577
// TRAP: STORED settings with a DRAWN pxPerDay; the ruler font is scaled here, the S-8 divisor is not.
/** @purity pure */
export function rulerTierOf(pxPerDay: number, storedSettings: DocumentSettings): RulerTier {
  const settings = drawnSettingsOf(storedSettings)
  const scaled = thresholdPxPerDayOf(pxPerDay, settings)
  if (settings.isTimeOfDayVisible && scaled >= SETTINGS_CONSTANTS.rulerTierPxPerDayHour) return 'dayHour'
  if (scaled >= SETTINGS_CONSTANTS.rulerTierPxPerDayDay) return 'yearMonthDayWeekday'
  if (scaled >= SETTINGS_CONSTANTS.rulerTierPxPerDayWeek) return 'yearMonthWeek'
  if (scaled >= SETTINGS_CONSTANTS.rulerTierPxPerDayMonth) return 'yearMonth'
  return 'year'
}

const DAYS_PER_WEEK = 7

const SNAP_MINUTES = { 'SG-2': 60, 'SG-3': 30, 'SG-4': 1 } as const

// see T-378, SG-1, SG-2, SG-3, SG-4, MK-17, FR-103
/** @purity pure */
export function snapMinutesOf(pxPerDay: number, storedSettings: DocumentSettings, isAltHeld: boolean): number {
  const settings = drawnSettingsOf(storedSettings)
  if (!settings.isTimeOfDayVisible) return MINUTES_PER_CALENDAR_DAY
  if (isAltHeld) return SNAP_MINUTES['SG-4']
  const scaled = thresholdPxPerDayOf(pxPerDay, settings)
  if (scaled >= SETTINGS_CONSTANTS.halfHourGridPxPerDay) return SNAP_MINUTES['SG-3']
  if (scaled >= SETTINGS_CONSTANTS.rulerTierPxPerDayHour) return SNAP_MINUTES['SG-2']
  return MINUTES_PER_CALENDAR_DAY
}

// see LF-1
/** @purity pure */
export function tickStrideOf(layout: ScheduleLayout, _settings: DocumentSettings): number {
  return layout.tier === 'yearMonthWeek' ? DAYS_PER_WEEK : 1
}

export type TimeAxis = Pick<ScheduleLayout, 'pxPerDay' | 'originDay' | 'originX'>

// see FR-017, DC-3
// WHY: the axis alone, without laying out a task group, for readers that only turn a pointer into a day.
/** @purity pure */
export function timeAxisOf(storedSettings: DocumentSettings, regions: ScreenRegions): TimeAxis {
  const settings = drawnSettingsOf(storedSettings)
  const pxPerDay = settings.pxPerDayAt1x * settings.zoomX
  const originDay = dayOf(settings.scrollDate)
  const dayOffset = Number.isFinite(settings.scrollDateFraction) ? settings.scrollDateFraction : 0
  const originX = regions.taskGroupArea.x - (originDay === null ? 0 : dayOffset * pxPerDay)
  return { pxPerDay, originDay, originX }
}

// see FR-017, T-252, DS-4
// TRAP: a quotient within an ulp of a whole day IS that day; floor alone answers the day before.
/** @purity pure */
export function dateAtX(layout: TimeAxis, x: number): CalendarDay | null {
  if (layout.originDay === null || layout.pxPerDay <= 0) return null
  const span = (x - layout.originX) / layout.pxPerDay
  const whole = Math.round(span)
  const days = Math.abs(span - whole) < 1e-9 ? whole : Math.floor(span)
  const foundAt = new Date((serialOf(layout.originDay) + days) * MS_PER_DAY)
  return { year: foundAt.getUTCFullYear(), month: foundAt.getUTCMonth() + 1, day: foundAt.getUTCDate() }
}

// see FX-1, FX-2, S-532
// WHY: the one reading of whether the span reaches the screen: fixed, both ends dated, the finish not before the start.
/** @purity pure */
export function fixedFitSpanOf(
  settings: DocumentSettings,
): { readonly start: CalendarDay; readonly finish: CalendarDay; readonly days: number } | null {
  if (!settings.isFitSpanFixed) return null
  const start = dayOf(settings.fitSpanStart)
  const finish = dayOf(settings.fitSpanFinish)
  if (start === null || finish === null) return null
  const days = calendarDaysBetween(start, finish) + 1
  return days < 1 ? null : { start, finish, days }
}

// see FX-6, FX-7
// WHY: the right end is read 1 px short of the edge; the edge itself is the next day's column.
/** @purity pure */
export function shownSpanOf(
  axis: TimeAxis,
  taskGroupArea: ScreenRegions['taskGroupArea'],
): { readonly start: CalendarDay; readonly finish: CalendarDay } | null {
  const start = dateAtX(axis, taskGroupArea.x)
  const finish = dateAtX(axis, taskGroupArea.x + Math.max(0, taskGroupArea.width - 1))
  return start === null || finish === null ? null : { start, finish }
}

/** @purity pure */
export function xOnTimeAxis(originSerial: number, pxPerDay: number, originX: number,
                            day: CalendarDay): number {
  return originX + (serialOf(day) - originSerial) * pxPerDay
}

/** @purity pure */
export function xFromDay(layout: ScheduleLayout, day: CalendarDay): number {
  const origin = layout.originDay
  if (origin === null) return layout.originX
  return xOnTimeAxis(serialOf(origin), layout.pxPerDay, layout.originX, day)
}

// see RV-1, RV-6, FR-158, FR-054
/** @purity pure */
export function xOfInstant(layout: TimeAxis, instant: number): number {
  if (layout.originDay === null) return layout.originX
  return layout.originX + (instant / MINUTES_PER_CALENDAR_DAY - serialOf(layout.originDay)) * layout.pxPerDay
}

// see FR-103, T-378
/** @purity pure */
export function snappedInstantAtX(layout: TimeAxis, x: number, snapMinutes: number): number | null {
  if (layout.originDay === null || layout.pxPerDay <= 0) return null
  const minutes = (serialOf(layout.originDay) + (x - layout.originX) / layout.pxPerDay) * MINUTES_PER_CALENDAR_DAY
  return Math.round(minutes / snapMinutes) * snapMinutes
}
