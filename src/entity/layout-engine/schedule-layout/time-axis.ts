// ScheduleLayout -- the time axis: a day to x and back, and the ruler tier (FR-017).
// @unit      UF-132  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import { dayOf, type CalendarDay } from '../../document-model/schedule/schedule'
import { drawnSettingsOf, type ScreenRegions } from '../screen-regions/screen-regions'
import type { RulerTier, ScheduleLayout } from './schedule-layout'

const MS_PER_DAY = 86400000

/** @purity pure */
export function serialOf(day: CalendarDay): number {
  return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY)
}

// see LC-3, FR-017, T-252, DS-1, DS-4, S-8
// TRAP: STORED settings with a DRAWN pxPerDay; the ruler font is scaled here, the S-8 divisor is not.
/** @purity pure */
export function rulerTierOf(pxPerDay: number, storedSettings: DocumentSettings): RulerTier {
  const settings = drawnSettingsOf(storedSettings)
  const scaled = pxPerDay / (settings.rulerFont / storedSettings.fontMin)
  if (scaled >= storedSettings.rulerTierPxPerDayDay) return 'yearMonthDayWeekday'
  if (scaled >= storedSettings.rulerTierPxPerDayWeek) return 'yearMonthWeek'
  if (scaled >= storedSettings.rulerTierPxPerDayMonth) return 'yearMonth'
  return 'year'
}

const DAYS_PER_WEEK = 7

// see LF-1
/** @purity pure */
export function tickStrideOf(layout: ScheduleLayout, _settings: DocumentSettings): number {
  return layout.tier === 'yearMonthWeek' ? DAYS_PER_WEEK : 1
}

export type TimeAxis = Pick<ScheduleLayout, 'pxPerDay' | 'originDay' | 'originX'>

// see FR-017, DC-3
// WHY: the axis alone, without laying out a row, for readers that only turn a pointer into a day.
/** @purity pure */
export function timeAxisOf(storedSettings: DocumentSettings, regions: ScreenRegions): TimeAxis {
  const settings = drawnSettingsOf(storedSettings)
  const pxPerDay = settings.pxPerDayAt1x * settings.zoomX
  const originDay = dayOf(settings.scrollDate)
  const dayOffset = Number.isFinite(settings.scrollDayOffset) ? settings.scrollDayOffset : 0
  const originX = regions.rowArea.x - (originDay === null ? 0 : dayOffset * pxPerDay)
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
