// CR-710 wave 2 (spec-only): FR-017 hour tier (TM-5), FR-103 snap (T-378), FR-016 zoom ceiling, FR-158 clock text, RV-1/RV-6 instant to x.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { zoomXCeiling } from '../../src/adapter/input-command-translator/zoom-and-fit'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { instantOf, textOfInstant } from '../../src/entity/document-model/schedule/schedule'
import {
  clockTextOf,
  planDateText,
  rulerTierOf,
  snapMinutesOf,
  snappedInstantAtX,
  xOfInstant,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { RATIO, cellOf, notStored, rowOf, stored } from '../unit/cr-430-cross-section-scene'
import { bare, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

describe('the clauses these cases are built from still read as quoted', () => {
  it('FR-017: the thresholds are fixed, the hour digits thin out by the narrowest stride that fits, the lines are not solid at 30 minutes', () => {
    expect(REQUIREMENTS).toContain('しきい値の 3 本（時刻を表示するときは 4 本）は固定値とし、実行時に導出してはならない（MUST NOT）')
    expect(REQUIREMENTS).toContain('になる最も細かいものとすること（MUST）（利用者の判断）')
    expect(REQUIREMENTS).toContain('⛔ 30 分の線を実線で引いてはならない（MUST NOT）')
  })

  it('FR-016: the zoomX ceiling with the time of day on is the width of one hour at S-579 and the zoom goes back when the time is turned off', () => {
    expect(REQUIREMENTS).toContain('の `zoomX` の上限は、1 時間の幅が `_assets/tbl-settings.md` の 表 T-206 の `S-579` になる倍率 —— 24 × `S-579` ÷ `S-1` —— とすること（MUST）')
    expect(REQUIREMENTS).toContain('時刻の表示を切ったとき、`zoomX` が日付の軸の上限を超えていれば、その上限へ戻すこと（MUST）')
  })

  it('FR-103: a released position is read as an instant snapped by table T-378, and the lower row wins', () => {
    expect(REQUIREMENTS).toContain('離した位置は、表 T-378 の単位で寄せた瞬間として読むこと（MUST）')
    expect(REQUIREMENTS).toContain('⭐ 2 つ以上の行に当たるときは、本表で下にある行の単位とすること（MUST）')
  })

  it('FR-158: every place that shows a date-time is a row of table T-375', () => {
    expect(REQUIREMENTS).toContain('⭐ 日時を見せる所は本表がすべてを持つ（MUST）')
    expect(REQUIREMENTS).toContain('新しく日時を見せる所を作るときは、本表に行を足すこと（MUST）')
    expect(REQUIREMENTS).toContain('保存する値（`GRS JSON`・MSPDI）は、切り替えによらず時刻まで書くこと（MUST）')
  })

  it('RV-1 and RV-6: a bar stands on the instants when the time of day is shown', () => {
    expect(DESIGN).toContain('時刻を表示しているとき（`01-04-requirements.md` の `FR-158`）は、右端は終わりの瞬間の位置')
  })
})

// see S-8, DS-1, FR-017
// WHY: FR-017 compares pxPerDay with the threshold after dividing by (the font the ruler is drawn with / S-8); the stored font is drawn at the display ratio.
const PX_SCALE = ((SETTINGS_DEFAULTS['rulerFont'] as number) * RATIO) / stored('S-8')

// see T-205
const thresholdOf = (id: string): number => Number(bare(rowOf('T-205', id).by['既定'] ?? ''))
const S_83 = thresholdOf('S-83')
const S_84 = thresholdOf('S-84')
const S_85 = thresholdOf('S-85')
const S_577 = thresholdOf('S-577')
const S_578 = thresholdOf('S-578')

const withTime = (shows: boolean, over: Readonly<Record<string, unknown>> = {}): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, showsTimeOfDay: shows, ...over }) as unknown as DocumentSettings

describe('T-205: the new rows are 288 and 576 and sit in order after the day threshold', () => {
  it('S-577 is 288 (12 px per hour times 24) and S-578 is 576 (24 px per hour times 24)', () => {
    expect(S_577).toBe(288)
    expect(S_578).toBe(576)
    expect(S_577).toBe(12 * 24)
    expect(S_578).toBe(24 * 24)
  })

  it('the thresholds rise from the month to the day, the hour and the half hour', () => {
    expect(S_83).toBeLessThan(S_84)
    expect(S_84).toBeLessThan(S_85)
    expect(S_85).toBeLessThan(S_577)
    expect(S_577).toBeLessThan(S_578)
  })
})

describe('FR-017: rulerTierOf names the hour tier (TM-5) only while the time of day is shown', () => {
  const px = (threshold: number): number => threshold * PX_SCALE

  it.each([
    ['just under S-577', S_577 - 1, 'yearMonthDayWeekday'],
    ['just over S-577', S_577 + 1, 'dayHour'],
    ['well over S-578', S_578 * 3, 'dayHour'],
    ['just over S-85', S_85 + 1, 'yearMonthDayWeekday'],
    ['just under S-85', S_85 - 1, 'yearMonthWeek'],
    ['just over S-84', S_84 + 1, 'yearMonthWeek'],
    ['just under S-84', S_84 - 1, 'yearMonth'],
    ['just over S-83', S_83 + 0.1, 'yearMonth'],
    ['just under S-83', S_83 - 0.1, 'year'],
  ])('time shown, %s', (_name, threshold, tier) => {
    expect(rulerTierOf(px(threshold), withTime(true))).toBe(tier)
  })

  it.each([S_577 + 1, S_578 + 1, S_578 * 10])('time not shown, %d per day on the ruler is the day tier: TM-4 is the finest', (threshold) => {
    expect(rulerTierOf(px(threshold), withTime(false))).toBe('yearMonthDayWeekday')
  })

  it('goes finer, never coarser, as the day widens', () => {
    const order = ['year', 'yearMonth', 'yearMonthWeek', 'yearMonthDayWeekday', 'dayHour']
    let last = 0
    for (let threshold = 1; threshold <= 1200; threshold += 3) {
      const at = order.indexOf(rulerTierOf(px(threshold), withTime(true)))
      expect(at, `threshold ${threshold}`).toBeGreaterThanOrEqual(last)
      last = at
    }
    expect(last).toBe(order.length - 1)
  })

  it('divides the width by the font the ruler is drawn with over S-8: a larger ruler font moves the boundary out', () => {
    const big = withTime(true, { rulerFont: (SETTINGS_DEFAULTS['rulerFont'] as number) * 2 })
    expect(rulerTierOf(px(S_577 + 1), big)).toBe('yearMonthDayWeekday')
    expect(rulerTierOf(px((S_577 + 1) * 2), big)).toBe('dayHour')
  })
})

describe('FR-103, T-378: snapMinutesOf', () => {
  const px = (threshold: number): number => threshold * PX_SCALE
  const DAY = 1440

  it.each([
    ['SG-1: the time not shown, whatever the width', false, S_578 * 4, false, DAY],
    ['SG-1: the time not shown, with Alt held (MK-17 stands only while the time is shown)', false, S_578 * 4, true, DAY],
    ['SG-1: shown but the ruler has not reached the hour tier', true, S_577 - 1, false, DAY],
    ['SG-2: shown, on the hour tier', true, S_577 + 1, false, 60],
    ['SG-2: shown, just under the half-hour width', true, S_578 - 1, false, 60],
    ['SG-3: shown, from the half-hour width', true, S_578 + 1, false, 30],
    ['SG-3: shown, far over the half-hour width', true, S_578 * 5, false, 30],
    ['SG-4: shown, Alt held, on the hour tier', true, S_577 + 1, true, 1],
    ['SG-4: shown, Alt held, on the half-hour width (the lowest row wins)', true, S_578 + 1, true, 1],
    ['SG-4: shown, Alt held, even before the hour tier', true, S_577 - 100, true, 1],
  ])('%s', (_name, shows, threshold, alt, minutes) => {
    expect(snapMinutesOf(px(threshold), withTime(shows), alt)).toBe(minutes)
  })

  it('table T-378 names those four rows with those four units', () => {
    expect(cellOf('T-378', 'SG-1', '単位')).toBe('日')
    expect(cellOf('T-378', 'SG-2', '単位')).toBe('1 時間')
    expect(cellOf('T-378', 'SG-3', '単位')).toBe('30 分')
    expect(cellOf('T-378', 'SG-4', '単位')).toBe('1 分')
  })
})

describe('FR-103, RV-1, RV-6: an instant and the x it stands on', () => {
  const PX_PER_DAY = 1440
  const ORIGIN_X = 200
  // WHY: 1440 px per day is 1 px per minute, so every expectation below can be read off the clock.
  const axis = { pxPerDay: PX_PER_DAY, originDay: { year: 2026, month: 1, day: 5 }, originX: ORIGIN_X }
  const at = (text: string): number => instantOf(text) as number

  it('puts the start of the origin day on the origin x', () => {
    expect(xOfInstant(axis, at('2026-01-05T00:00:00'))).toBeCloseTo(ORIGIN_X, 6)
  })

  it.each([
    ['2026-01-05T12:00:00', 720],
    ['2026-01-05T09:05:00', 545],
    ['2026-01-06T00:00:00', 1440],
    ['2026-01-07T06:30:00', 2 * 1440 + 390],
    ['2026-01-04T23:00:00', -60],
  ])('puts %s at %d px right of the origin', (text, offset) => {
    expect(xOfInstant(axis, at(text))).toBeCloseTo(ORIGIN_X + offset, 6)
  })

  it('follows the width of a day', () => {
    const narrow = { ...axis, pxPerDay: 480 }
    expect(xOfInstant(narrow, at('2026-01-05T12:00:00'))).toBeCloseTo(ORIGIN_X + 240, 6)
    expect(xOfInstant(narrow, at('2026-01-06T00:00:00'))).toBeCloseTo(ORIGIN_X + 480, 6)
  })

  it('reads an x back to the nearest grid instant of the unit', () => {
    const snapAt = (x: number, unit: number): string | null => {
      const read = snappedInstantAtX(axis, x, unit)
      return read === null ? null : textOfInstant(read)
    }
    expect(snapAt(ORIGIN_X + 545, 60)).toBe('2026-01-05T09:00:00')
    expect(snapAt(ORIGIN_X + 571, 60)).toBe('2026-01-05T10:00:00')
    expect(snapAt(ORIGIN_X + 545, 30)).toBe('2026-01-05T09:00:00')
    expect(snapAt(ORIGIN_X + 556, 30)).toBe('2026-01-05T09:30:00')
    expect(snapAt(ORIGIN_X + 575, 30)).toBe('2026-01-05T09:30:00')
    expect(snapAt(ORIGIN_X + 590, 30)).toBe('2026-01-05T10:00:00')
    expect(snapAt(ORIGIN_X + 600, 30)).toBe('2026-01-05T10:00:00')
    expect(snapAt(ORIGIN_X + 545.3, 1)).toBe('2026-01-05T09:05:00')
    expect(snapAt(ORIGIN_X + 545.7, 1)).toBe('2026-01-05T09:06:00')
  })

  // WHY: which day a position inside a column snaps to (the day under the pointer, or the nearer midnight) is open -- DFC-2456; only the unambiguous x are pinned.
  it('reads the left part of a day column at a day unit as that day, as a midnight', () => {
    expect(snappedInstantAtX(axis, ORIGIN_X + 400, 1440)).toBe(at('2026-01-05T00:00:00'))
    expect(snappedInstantAtX(axis, ORIGIN_X + 1440 + 200, 1440)).toBe(at('2026-01-06T00:00:00'))
  })

  it('gives the grid instant itself for the x of a grid instant, and the same instant back for every unit', () => {
    for (const unit of [1, 30, 60, 1440]) {
      for (const text of ['2026-01-05T00:00:00', '2026-01-06T00:00:00', '2026-01-07T00:00:00']) {
        expect(snappedInstantAtX(axis, xOfInstant(axis, at(text)), unit), `${text} at ${unit}`).toBe(at(text))
      }
    }
    for (const text of ['2026-01-05T09:00:00', '2026-01-05T17:00:00', '2026-01-06T13:00:00']) {
      expect(snappedInstantAtX(axis, xOfInstant(axis, at(text)), 60)).toBe(at(text))
      expect(snappedInstantAtX(axis, xOfInstant(axis, at(text)), 30)).toBe(at(text))
      expect(snappedInstantAtX(axis, xOfInstant(axis, at(text)), 1)).toBe(at(text))
    }
    expect(snappedInstantAtX(axis, xOfInstant(axis, at('2026-01-05T09:30:00')), 30)).toBe(at('2026-01-05T09:30:00'))
  })

  it('reads an x left of the origin day too', () => {
    expect(textOfInstant(snappedInstantAtX(axis, ORIGIN_X - 60, 60) as number)).toBe('2026-01-04T23:00:00')
  })

  it('gives no instant while the axis has no origin day', () => {
    expect(snappedInstantAtX({ ...axis, originDay: null }, ORIGIN_X + 100, 60)).toBeNull()
  })
})

describe('FR-158, TX-1, TX-2: the clock reads in 24 hours, the hour is not padded and the minutes are two digits', () => {
  const clockAt = (text: string): string => clockTextOf(instantOf(text) as number)

  it.each([
    ['2026-01-05T09:05:00', '9:05'],
    ['2026-01-05T17:00:00', '17:00'],
    ['2026-01-05T00:00:00', '0:00'],
    ['2026-01-05T00:01:00', '0:01'],
    ['2026-01-05T12:00:00', '12:00'],
    ['2026-01-05T23:59:00', '23:59'],
    ['2026-01-05T08:30:00', '8:30'],
    ['2026-12-31T10:10:00', '10:10'],
  ])('%s reads %s', (text, clock) => {
    expect(clockAt(text)).toBe(clock)
  })

  it('does not write a year, a date or a zone into the clock', () => {
    expect(clockAt('2026-01-05T09:05:00')).not.toMatch(/[-/TZ+]/)
  })

  it('writes the day beside it in the form of ND-4: month, slash, day, with neither padded', () => {
    expect(planDateText({ year: 2026, month: 6, day: 3 }, false)).toBe('6/3')
    expect(planDateText({ year: 2026, month: 12, day: 25 }, false)).toBe('12/25')
    expect(`${planDateText({ year: 2026, month: 6, day: 3 }, false)} ${clockAt('2026-06-03T10:00:00')}`).toBe('6/3 10:00')
  })

  it('writes the year first when the document spans calendar years (ND-5)', () => {
    expect(planDateText({ year: 2026, month: 6, day: 3 }, true)).toBe('2026/6/3')
  })

  it('table T-375 gives the two forms of the name label day and the long form of the clock', () => {
    expect(cellOf('T-375', 'TX-1', '時刻を表示しない')).toBe('6/3')
    expect(cellOf('T-375', 'TX-1', '時刻を表示する')).toBe('6/3 10:00')
    expect(cellOf('T-375', 'TX-2', '時刻を表示する')).toBe('6/3 (月) 10:00')
    expect(cellOf('T-375', 'TX-4', '時刻を表示する')).toBe('yyyy/mm/dd H:MM')
    expect(cellOf('T-375', 'TX-5', '時刻を表示する')).toBe('6/3 10:00')
    expect(cellOf('T-375', 'TX-6', '時刻を表示する')).toBe('yyyy/mm/dd (曜) H:MM')
    expect(cellOf('T-375', 'TX-7', '時刻を表示する')).toBe('yyyy/mm/dd H:MM')
  })
})

describe('FR-016: the zoomX ceiling while the time of day is shown', () => {
  const S_579 = notStored('S-579')
  const S_1 = stored('S-1')

  it('is 24 times the width of an hour at S-579, over S-1 as stored', () => {
    expect(S_579).toBe(60)
    const ceiling = zoomXCeiling({} as never, true)
    expect(ceiling).not.toBeNull()
    expect(ceiling as number).toBeCloseTo((24 * S_579) / S_1, 9)
  })

  it('is the value S-55 holds as the largest zoom, 240', () => {
    expect(zoomXCeiling({} as never, true)).toBe(240)
    expect(stored('S-55')).toBe(240)
  })

  it('does not depend on the Task Group Area: the ceiling of the days is another axis', () => {
    const narrow = { regions: { taskGroupArea: { width: 300 } }, document: { documentSettings: SETTINGS_DEFAULTS } } as never
    const wide = { regions: { taskGroupArea: { width: 3000 } }, document: { documentSettings: SETTINGS_DEFAULTS } } as never
    expect(zoomXCeiling(narrow, true)).toBe(zoomXCeiling(wide, true))
  })

  it('stays under the ceiling of the days as the days widen, so the day ceiling is the one that is lower for a narrow area', () => {
    const area = { regions: { taskGroupArea: { width: 600 } }, document: { documentSettings: SETTINGS_DEFAULTS } } as never
    const days = zoomXCeiling(area, false)
    expect(days).not.toBeNull()
    expect(days as number).toBeCloseTo(600 / (notStored('S-229') * S_1 * RATIO), 9)
    expect(days as number).toBeLessThan(zoomXCeiling(area, true) as number)
  })
})
