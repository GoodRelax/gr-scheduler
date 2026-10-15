// CR-756 spec-only cases: with time of day shown the dummy stands at the plan start instant and is max(mark, S-585) wide.

import { afterEach, describe, expect, it } from 'vitest'

import { dummyBandOf } from '../../src/entity/layout-engine/schedule-layout/label-placement'
import { dummyInkWidthOf } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { snapMinutesOf } from '../../src/entity/layout-engine/schedule-layout/time-axis'
import { drawnTask, frameOf, planBox, restoreAnimationFrames } from '../unit/cr-430-stage'
import { boxOfBar, markerBoxOf } from '../unit/cr-430-bench'
import { specTable } from './spec-table'
import {
  MILESTONE_AT,
  MINUTES_PER_DAY,
  PLAN_START,
  REQUIREMENTS,
  S_180_PX,
  S_585_MINUTES,
  TIMED_MILESTONE_UID,
  TIMED_UID,
  inkOf,
  pxPerDayOf,
  settingsRowDefault,
  stageOf,
  xOfInstant,
} from './cr-756-stage'

afterEach(restoreAnimationFrames)

const DM_1_THE_INSTANT =
  '**ダミーを描く位置は、予定の開始日とすること（MUST）。**⭐ 時刻を表示しているとき（`FR-158`）は、予定の開始の瞬間とすること（MUST）'
const DM_1_NOT_ROUNDED_TO_MIDNIGHT =
  '予定バーの左端と同じ読み（`05-07-design.md` の 表 T-069 の `RV-6`、日付だけの字は `FR-054` の 表 T-350 の開始の側）であり、⛔ その日の始まり（0:00）へ丸めてはならない（MUST NOT）'
const DM_1_NOT_THE_NEXT_WORKING_DAY =
  '⛔ その日の始まり（0:00）へ丸めてはならない（MUST NOT）。⛔ **翌稼働日へずらしてはならない（MUST NOT）'
const DM_3_THE_LARGER_OF_TWO =
  '⭐ 時刻を表示しているとき（`FR-158`）は、同書の 表 T-206 の `S-585` の時間が時間軸で占める幅（暦の上の経過時間 —— 1 日の幅 × `S-585` ÷ 1440）と、上の幅（以下、印の幅）の大きい方とすること（MUST）'
const DM_3_S_180_DOES_NOT_CUT =
  '目盛が日の段にあって 1 時間が印の幅より狭いあいだも、印は見え、掴める。⛔ `S-180` で `S-585` の幅を切ってはならない（MUST NOT）'
const DM_3_THE_LEFT_EDGE =
  '`S-180` は印の幅の上限であり、拡大すれば印は 1 時間ぶん太る（利用者の判断）。左端は `DM-1` の位置に揃えること（MUST）'
const DM_3_NOT_CUT_BY_A_DAY =
  '左端は `DM-1` の位置に揃えること（MUST）。⛔ 1 日ぶんの幅で印の幅を切ってはならない（MUST NOT）'
const DM_12_THE_MILESTONE_INSTANT =
  '⭐ 時刻を表示しているとき（`FR-158`）は、形状を問わず予定の開始の瞬間に立つ（`DM-1`） —— マイルストーンのダミーは予定の図形の中心と同じ瞬間である（`05-07-design.md` の 表 T-069 の `RV-6`）。'
const DM_12_NOT_THE_HOUR_WIDTH = '大きさは `DM-9` のままとし、`DM-3` の 1 時間の幅を当てない。'

const dmCell = (id: string): string => specTable('T-240').rows.find((one) => one.id === id)?.by['規則'] ?? ''

// WHY: day, hour, half-hour and far past S-180: the four arms of DM-3 (T-378 SG-1 to SG-3).
const DAY_TIER = 100
const HOUR_TIER = 400
const HALF_HOUR_TIER = 1200
const FAR_ZOOM = 2400

const hourWidth = (pxPerDay: number): number => (pxPerDay * S_585_MINUTES) / MINUTES_PER_DAY

// see DM-3
const markWidthAt = (pxPerDay: number): number => inkOf(stageOf({ isTimeOfDayVisible: false, pxPerDay }), TIMED_UID).width

describe('CR-756 -- the manuscript still says what these cases press', () => {
  it.each([
    ['DM-1', DM_1_THE_INSTANT],
    ['DM-1', DM_1_NOT_ROUNDED_TO_MIDNIGHT],
    ['DM-1', DM_1_NOT_THE_NEXT_WORKING_DAY],
    ['DM-3', DM_3_THE_LARGER_OF_TWO],
    ['DM-3', DM_3_S_180_DOES_NOT_CUT],
    ['DM-3', DM_3_THE_LEFT_EDGE],
    ['DM-3', DM_3_NOT_CUT_BY_A_DAY],
    ['DM-12', DM_12_THE_MILESTONE_INSTANT],
    ['DM-12', DM_12_NOT_THE_HOUR_WIDTH],
  ])('table T-240 %s: %s', (id, clause) => {
    expect(dmCell(id)).toContain(clause)
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-206 S-585 is 60 minutes, and the zooms below fall on SG-1, SG-2 and SG-3', () => {
    expect(S_585_MINUTES).toBe(60)
    const tierOf = (pxPerDay: number): number => {
      const one = stageOf({ isTimeOfDayVisible: true, pxPerDay })
      return snapMinutesOf(pxPerDayOf(one), one.loop.document().documentSettings, false)
    }
    expect(tierOf(DAY_TIER)).toBe(MINUTES_PER_DAY)
    expect(tierOf(HOUR_TIER)).toBe(60)
    expect(tierOf(HALF_HOUR_TIER)).toBe(30)
    expect(hourWidth(FAR_ZOOM)).toBeGreaterThan(S_180_PX)
  })
})

describe(`T-240 DM-1: ${DM_1_THE_INSTANT}`, () => {
  it.each([HOUR_TIER, HALF_HOUR_TIER, DAY_TIER])('at %s px/day the mark stands on the plan bar left edge, the 10:30 instant', (pxPerDay) => {
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay })
    const ink = inkOf(one, TIMED_UID)
    expect(ink.x, DM_1_THE_INSTANT).toBeCloseTo(planBox(one.loop, TIMED_UID).x0, 6)
    expect(ink.x, DM_1_THE_INSTANT).toBeCloseTo(xOfInstant(one, PLAN_START), 6)
  })

  it.each([HOUR_TIER, DAY_TIER])(`at %s px/day ${DM_1_NOT_ROUNDED_TO_MIDNIGHT}`, (pxPerDay) => {
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay })
    const midnight = xOfInstant(one, '2026-04-06T00:00:00')
    expect(inkOf(one, TIMED_UID).x - midnight, DM_1_NOT_ROUNDED_TO_MIDNIGHT).toBeCloseTo((pxPerDay * 630) / MINUTES_PER_DAY, 6)
  })

  it(`time of day hidden: the mark keeps the day column left edge (${DM_1_NOT_THE_NEXT_WORKING_DAY})`, () => {
    const one = stageOf({ isTimeOfDayVisible: false, pxPerDay: HOUR_TIER })
    const ink = inkOf(one, TIMED_UID)
    expect(ink.x, DM_3_THE_LEFT_EDGE).toBeCloseTo(planBox(one.loop, TIMED_UID).x0, 6)
    const shown = stageOf({ isTimeOfDayVisible: true, pxPerDay: HOUR_TIER })
    expect(ink.x, DM_1_NOT_THE_NEXT_WORKING_DAY).toBeCloseTo(xOfInstant(shown, '2026-04-06T00:00:00'), 6)
  })
})

describe(`T-240 DM-3: ${DM_3_THE_LARGER_OF_TWO}`, () => {
  it.each([HOUR_TIER, HALF_HOUR_TIER])('at %s px/day the mark is S-585 of calendar time wide, from the plan start instant', (pxPerDay) => {
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay })
    const ink = inkOf(one, TIMED_UID)
    expect(hourWidth(pxPerDay), 'premise: the hour is wider than the mark').toBeGreaterThan(markWidthAt(pxPerDay))
    expect(ink.width, DM_3_THE_LARGER_OF_TWO).toBeCloseTo(hourWidth(pxPerDayOf(one)), 6)
    expect(ink.x + ink.width, DM_3_THE_LARGER_OF_TWO).toBeCloseTo(xOfInstant(one, '2026-04-06T11:30:00'), 6)
  })

  it(`at ${String(FAR_ZOOM)} px/day: ${DM_3_S_180_DOES_NOT_CUT}`, () => {
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay: FAR_ZOOM })
    const width = inkOf(one, TIMED_UID).width
    expect(width, DM_3_S_180_DOES_NOT_CUT).toBeGreaterThan(S_180_PX)
    expect(width, DM_3_S_180_DOES_NOT_CUT).toBeCloseTo(hourWidth(pxPerDayOf(one)), 6)
  })

  it(`at ${String(DAY_TIER)} px/day the hour is narrower than the mark, so the mark keeps its width: ${DM_3_NOT_CUT_BY_A_DAY}`, () => {
    expect(hourWidth(DAY_TIER), 'premise').toBeLessThan(markWidthAt(DAY_TIER))
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay: DAY_TIER })
    expect(inkOf(one, TIMED_UID).width, DM_3_THE_LARGER_OF_TWO).toBeCloseTo(markWidthAt(DAY_TIER), 6)
  })

  it('time of day hidden: the width does not follow the zoom (JDG-2059 keeps JDG-177)', () => {
    expect(markWidthAt(FAR_ZOOM)).toBeCloseTo(markWidthAt(DAY_TIER), 6)
    expect(markWidthAt(FAR_ZOOM)).toBeLessThanOrEqual(S_180_PX)
  })
})

describe('PI-5 dummyBandOf and dummyInkWidthOf: one reading of the band', () => {
  const MARKER_DIAMETER = 14
  const markOnly = Math.min(MARKER_DIAMETER * settingsRowDefault('S-247'), S_180_PX)

  it.each([
    { pxPerDay: DAY_TIER, isTimeOfDayVisible: true, width: Math.max(markOnly, hourWidth(DAY_TIER)) },
    { pxPerDay: HOUR_TIER, isTimeOfDayVisible: true, width: hourWidth(HOUR_TIER) },
    { pxPerDay: FAR_ZOOM, isTimeOfDayVisible: true, width: hourWidth(FAR_ZOOM) },
    { pxPerDay: FAR_ZOOM, isTimeOfDayVisible: false, width: markOnly },
  ])('$pxPerDay px/day, time shown $showsTimeOfDay: the band starts on the plan x and is $width wide', ({ pxPerDay, isTimeOfDayVisible, width }) => {
    const axis = { pxPerDay, isTimeOfDayVisible }
    expect(dummyInkWidthOf(MARKER_DIAMETER, axis), DM_3_THE_LARGER_OF_TWO).toBeCloseTo(width, 6)
    const band = dummyBandOf('rectangle', { x: 321, width: 900 }, MARKER_DIAMETER, axis)
    expect(band.x, DM_3_THE_LEFT_EDGE).toBe(321)
    expect(band.width, DM_3_S_180_DOES_NOT_CUT).toBeCloseTo(width, 6)
  })

  it(`a milestone's band is the plan figure's centre and takes no hour: ${DM_12_NOT_THE_HOUR_WIDTH}`, () => {
    const band = dummyBandOf('milestone', { x: 500, width: 0 }, MARKER_DIAMETER, { pxPerDay: FAR_ZOOM, isTimeOfDayVisible: true })
    expect(band.x, DM_12_THE_MILESTONE_INSTANT).toBe(500)
    expect(band.width, DM_12_NOT_THE_HOUR_WIDTH).toBe(0)
  })
})

describe(`T-240 DM-12: ${DM_12_THE_MILESTONE_INSTANT}`, () => {
  it.each([HOUR_TIER, DAY_TIER])('at %s px/day the milestone dummy is centred on the 15:00 plan figure', (pxPerDay) => {
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay })
    const drawn = drawnTask(one.loop, TIMED_MILESTONE_UID)
    const figure = boxOfBar(drawn.milestoneFigure ?? drawn.plan, 'the plan milestone figure')
    const ink = inkOf(one, TIMED_MILESTONE_UID)
    const centre = ink.x + ink.width / 2
    expect(centre, DM_12_THE_MILESTONE_INSTANT).toBeCloseTo((figure.x0 + figure.x1) / 2, 6)
    expect(centre, DM_12_THE_MILESTONE_INSTANT).toBeCloseTo(xOfInstant(one, MILESTONE_AT), 6)
  })

  it(`at ${String(FAR_ZOOM)} px/day: ${DM_12_NOT_THE_HOUR_WIDTH}`, () => {
    const one = stageOf({ isTimeOfDayVisible: true, pxPerDay: FAR_ZOOM })
    const ink = inkOf(one, TIMED_MILESTONE_UID)
    expect(ink.width, 'DM-9: the same square as the actual milestone figure').toBeCloseTo(ink.height, 6)
    expect(ink.width, DM_12_NOT_THE_HOUR_WIDTH).toBeLessThan(hourWidth(pxPerDayOf(one)))
  })
})

describe('JDG-27 / RF-1: the progress marker stands right of the drawn mark, as it does with time hidden', () => {
  it.each([HOUR_TIER, DAY_TIER])('at %s px/day the gap from the mark to the marker is the same shown or hidden', (pxPerDay) => {
    const gapOf = (isTimeOfDayVisible: boolean): number => {
      const one = stageOf({ isTimeOfDayVisible, pxPerDay })
      const ink = inkOf(one, TIMED_UID)
      const marker = markerBoxOf(drawnTask(one.loop, TIMED_UID))
      if (marker === null) throw new Error('premise: the marker is drawn (S-63)')
      expect(frameOf(one.loop).pxPerDay).toBeCloseTo(pxPerDay, 6)
      return marker.x0 - (ink.x + ink.width)
    }
    const hidden = gapOf(false)
    expect(hidden, 'premise: the marker is right of the mark').toBeGreaterThanOrEqual(0)
    expect(gapOf(true), DM_1_THE_INSTANT).toBeCloseTo(hidden, 6)
  })
})
