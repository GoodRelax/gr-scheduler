// Schedule -- the time zones of table T-376: which keys a document may name, and a zone's fixed-offset clock.
// @unit      UF-202  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import type { DocumentSettings } from '../document-settings/document-settings'
import timeZoneRoster from './time-zone-roster.json' with { type: 'json' }

// see FR-156, T-376
// WHY: abbreviation is null on the one row nobody uses as a clock (UTC-12:00); the screen then prints offsetName.
export interface TimeZoneRow {
  readonly rowId: string
  readonly key: string
  readonly offsetMinutes: number
  readonly isDaylight: boolean
  readonly abbreviation: string | null
}

// see T-376
// WHY: generated from the table (tools/generate_time_zone_roster.py), in the order the choosers offer it.
export const TIME_ZONE_ROWS: readonly TimeZoneRow[] = timeZoneRoster

// see FR-156, T-376, S-574, AT-157
// WHY: the 27 standard-time keys come generated from table T-376 on the view-base row; one spelling, never a second list.
export type StandardTimeZoneKey = NonNullable<DocumentSettings['viewTimeZone']>

// see BK-4, ZN-47
// WHY: the zone a printed document carries (BK-4), and the clock an unknown key falls to.
export const PRINTED_TIME_ZONE: StandardTimeZoneKey = 'UTC+00:00'

const ROW_OF_KEY: ReadonlyMap<string, TimeZoneRow> = new Map(TIME_ZONE_ROWS.map((row) => [row.key, row]))

// see FR-156, T-376
/** @purity pure */
export function timeZoneRowOf(key: unknown): TimeZoneRow | null {
  return typeof key === 'string' ? (ROW_OF_KEY.get(key) ?? null) : null
}

// see FR-156, T-376, S-575
/** @purity pure */
export function isTimeZoneKey(value: unknown): value is string {
  return timeZoneRowOf(value) !== null
}

// see FR-156, T-376, AT-157, S-574
// WHY: the base time zone may be a standard-time row only; a daylight-time row is a display zone (S-575).
/** @purity pure */
export function isStandardTimeZoneKey(value: unknown): value is StandardTimeZoneKey {
  const row = timeZoneRowOf(value)
  return row !== null && !row.isDaylight
}

// see FR-156, T-376
// WHY: a zone is one fixed offset all year -- daylight saving is never applied by season (FR-156, MUST NOT).
// WHY: a wall minute is the reading instantOf gives a stored text; a UTC minute counts from 1970-01-01T00:00Z.
export interface ZoneClock {
  readonly key: string
  readonly offsetMinutes: number
  wallOf(utcMinute: number): number
  utcOf(wallMinute: number): number
}

// see FR-156, RS-25, CM-94, CM-95, CM-96
// WHY: a read (FR-156, RS-25) and an edit (CM-94..CM-96) refuse a value outside T-376; the fallback only keeps an
// unchecked screen draft from reading a clock of no offset at all.
/** @purity pure */
export function zoneClockOf(key: string): ZoneClock {
  const offsetMinutes = timeZoneRowOf(key)?.offsetMinutes ?? 0
  return {
    key,
    offsetMinutes,
    wallOf: (utcMinute) => utcMinute + offsetMinutes,
    utcOf: (wallMinute) => wallMinute - offsetMinutes,
  }
}

// see FR-156, S-574
// WHY: the view's clock and the schedule data's clock in one: the same key needs no conversion at all.
/** @purity pure */
export function viewWallOfDataWall(data: ZoneClock, view: ZoneClock, dataWallMinute: number): number {
  if (data.key === view.key) return dataWallMinute
  return view.wallOf(data.utcOf(dataWallMinute))
}

// see FR-156, S-574
/** @purity pure */
export function dataWallOfViewWall(data: ZoneClock, view: ZoneClock, viewWallMinute: number): number {
  if (data.key === view.key) return viewWallMinute
  return data.wallOf(view.utcOf(viewWallMinute))
}

// see FR-156, S-574, AT-157, OP-6
// WHY: an empty view base is the schedule data's own zone (FR-156), so the two readers never disagree on it; a
// daylight-time key is no base (OP-6 puts the default back on read), so it falls to the schedule data's zone too.
/** @purity pure */
export function viewRegionOf(scheduleDataTimeZone: string, viewTimeZone: unknown): string {
  return isStandardTimeZoneKey(viewTimeZone) ? viewTimeZone : scheduleDataTimeZone
}

// see FR-156, BK-4
// WHY: two readings of the PC's offset, on January 1 and July 1: daylight saving only ever adds to the offset,
// so the smaller of the two is the standard time on either hemisphere.
export interface PcTimeZone {
  readonly januaryOffsetMinutes: number
  readonly julyOffsetMinutes: number
}

// see FR-156, T-376, BK-4
// WHY: the PC's standard offset falls to the standard-time row of the same offset; with none, the nearest offset
// (the earlier row on a tie) -- the table has no row for every offset the world uses (UTC+05:45 -> UTC+05:30).
/** @purity pure */
export function standardTimeZoneKeyForPc(pc: PcTimeZone): StandardTimeZoneKey {
  const standardOffset = Math.min(pc.januaryOffsetMinutes, pc.julyOffsetMinutes)
  let best: StandardTimeZoneKey = PRINTED_TIME_ZONE
  let bestGap = Number.POSITIVE_INFINITY
  for (const row of TIME_ZONE_ROWS) {
    if (!isStandardTimeZoneKey(row.key)) continue
    const gap = Math.abs(row.offsetMinutes - standardOffset)
    if (gap < bestGap) {
      best = row.key
      bestGap = gap
    }
  }
  return best
}
