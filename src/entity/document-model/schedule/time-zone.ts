// Schedule -- the time zones of table T-376: which regions a document may name, and a region's clock.
// @unit      UF-202  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import timeZoneRoster from './time-zone-roster.json' with { type: 'json' }

// see FR-156, T-376
export interface TimeZoneRow {
  readonly rowId: string
  readonly region: string
  readonly standardOffsetMinutes: number
  readonly observesDaylightSaving: boolean
}

// see T-376
// WHY: generated from the table (tools/generate_time_zone_roster.py), in the order the choosers offer it.
export const TIME_ZONE_ROWS: readonly TimeZoneRow[] = timeZoneRoster

// see BK-4, ZN-13
// WHY: the zone a printed document carries (BK-4) and the fallback of a value no reader can use.
export const PRINTED_TIME_ZONE = 'UTC'

const REGIONS: ReadonlySet<string> = new Set(TIME_ZONE_ROWS.map((row) => row.region))

// see FR-156, T-376
/** @purity pure */
export function isTimeZoneRegion(region: unknown): region is string {
  return typeof region === 'string' && REGIONS.has(region)
}

const MS_PER_MINUTE = 60000

const HOURS_PER_DAY = 24

// WHY: an offset moves only on a quarter-hour of UTC in every region of T-376, so one reading per bucket is exact.
const OFFSET_BUCKET_MINUTES = 15

// see FR-156, T-376
// WHY: a region's clock reads the offset from the region's rules (daylight saving included), never a fixed offset.
// WHY: a wall minute is the reading instantOf gives a stored text; a UTC minute counts from 1970-01-01T00:00Z.
export interface ZoneClock {
  readonly region: string
  offsetAt(utcMinute: number): number
  wallOf(utcMinute: number): number
  utcOf(wallMinute: number): number
}

/** @purity pure */
function partNumber(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find((part) => part.type === type)?.value ?? 0)
}

// see FR-156
// TRAP: the formatter is built once per clock, never per reading: building one is the slow part (S-30).
// WHY: a value outside T-376 (a hand-edited file) reads as UTC, never as a thrown RangeError mid-frame.
/** @purity pure */
export function zoneClockOf(region: string): ZoneClock {
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone: isTimeZoneRegion(region) ? region : PRINTED_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const read = new Map<number, number>()
  const offsetAt = (utcMinute: number): number => {
    const bucket = Math.floor(utcMinute / OFFSET_BUCKET_MINUTES)
    const held = read.get(bucket)
    if (held !== undefined) return held
    const at = bucket * OFFSET_BUCKET_MINUTES
    const parts = format.formatToParts(new Date(at * MS_PER_MINUTE))
    const wall = Date.UTC(
      partNumber(parts, 'year'),
      partNumber(parts, 'month') - 1,
      partNumber(parts, 'day'),
      partNumber(parts, 'hour') % HOURS_PER_DAY,
      partNumber(parts, 'minute'),
    ) / MS_PER_MINUTE
    const offset = Math.round(wall - at)
    read.set(bucket, offset)
    return offset
  }
  return {
    region,
    offsetAt,
    wallOf: (utcMinute) => utcMinute + offsetAt(utcMinute),
    utcOf: (wallMinute) => wallMinute - offsetAt(wallMinute - offsetAt(wallMinute)),
  }
}

// see FR-156, S-574
// WHY: the view's clock and the schedule data's clock in one: the same region needs no conversion at all.
/** @purity pure */
export function viewWallOfDataWall(data: ZoneClock, view: ZoneClock, dataWallMinute: number): number {
  if (data.region === view.region) return dataWallMinute
  return view.wallOf(data.utcOf(dataWallMinute))
}

// see FR-156, S-574
/** @purity pure */
export function dataWallOfViewWall(data: ZoneClock, view: ZoneClock, viewWallMinute: number): number {
  if (data.region === view.region) return viewWallMinute
  return data.wallOf(view.utcOf(viewWallMinute))
}

// see FR-156, S-574, AT-157
// WHY: an empty view base is the schedule data's own zone (FR-156), so the two readers never disagree on it.
/** @purity pure */
export function viewRegionOf(scheduleDataTimeZone: string, viewTimeZone: unknown): string {
  return isTimeZoneRegion(viewTimeZone) ? viewTimeZone : scheduleDataTimeZone
}

// see FR-156, RS-90
export interface PcTimeZone {
  readonly region: string | null
  readonly offsetMinutes: number
}

// see FR-156, RS-90, T-376
export interface PcRegionChoice {
  readonly region: string
  readonly isMoved: boolean
}

// see FR-156, T-376, RS-90
// WHY: a region outside T-376 falls to the first row of the same offset at that moment; with none, the nearest
// offset (the earlier row on a tie) -- the table has no row for every offset the world uses.
/** @purity pure */
export function regionForPc(pc: PcTimeZone, utcMinute: number): PcRegionChoice {
  if (pc.region !== null && isTimeZoneRegion(pc.region)) return { region: pc.region, isMoved: false }
  let best: TimeZoneRow | null = null
  let bestGap = Number.POSITIVE_INFINITY
  for (const row of TIME_ZONE_ROWS) {
    const gap = Math.abs(zoneClockOf(row.region).offsetAt(utcMinute) - pc.offsetMinutes)
    if (gap < bestGap) {
      best = row
      bestGap = gap
    }
  }
  return { region: best?.region ?? PRINTED_TIME_ZONE, isMoved: true }
}
