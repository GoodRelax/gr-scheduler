// What FR-055's VERTICAL half is allowed to assume, written from docs/spec.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⭐ Two questions, and only two, because they are the two the specification
// answers today:
//
//   A. The group LOD ladder (FR-018 with S-87 / S-88 / S-125). Where the
//      thresholds stand, that depth 1 is never a candidate, and that the
//      ladder never runs backwards.
//   B. What a row's band height actually depends on (LF-2 / LF-3 with ST-1,
//      ST-3, ST-9, table T-038, FR-077 and FR-094's floor). ⛔ THE ANSWER IS
//      NOT "the bar height alone": above FR-094's floor the drawn type size
//      moves with `zoomY` (FR-077), LC-5 estimates the label width from it,
//      T-013 decides inside-or-outside from that, OC-1 of table T-038 counts
//      the outside part, ST-1 stacks on that count, and ST-9 makes the band
//      height the stack's. So the stack count is a function of `zoomY` too,
//      and the case below exhibits a document where it changes.
//
// ⛔ NOT WRITTEN HERE, and deliberately: whether the fit picks the deepest
// depth that fits, whether it lands on `groupDepthThreshold` of that depth,
// whether fitting an already-fitted view answers the same thing, and how many
// times the fit may run table T-068 once the vertical half stops dividing.
// docs/spec states none of the four. Inventing a value for any of them would
// make this file the source of a decision nobody took.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  groupDepthLimit,
  layoutFromSchedule,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'

// Same idiom as tests/unit/layout-engine.test.ts: a case pins the keys it
// deliberately reads and every other key comes from SETTINGS_DEFAULTS, which
// `npm run gen` prints from the manuscript. ⚠️ A re-ruled value has to move
// these cases with it, so nothing below re-types a figure of table T-201,
// T-203 or T-205.
const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const settingNumber = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const LAYOUT_SETTINGS = settingsOf({
  rulerHeight: 48,
  scrollDate: '2026-01-01', // S-77
  rulerFont: 12, // S-3
  stackDirection: 'down', // S-58
  shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
})

const REGIONS = regionsFromScreen(ENV, LAYOUT_SETTINGS)

const withZoomY = (zoomY: number): DocumentSettings =>
  settingsOf({ ...LAYOUT_SETTINGS, zoomY })

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null },
    calendars: [],
    tasks: [],
    // FR-059 walks these two for OC-2's assignee label, so the template names
    // them as `Schedule` declares them. Empty is the ordinary state here.
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    highlightBoxes: [],
    ...part,
  }) as unknown as Schedule

/** A task starting on `from` and running `days`. At zoomX 1 one day is 6px. */
const spanning = (
  uid: number,
  from: string,
  days: number,
  part: Record<string, unknown> = {},
): Task => {
  const finish = new Date(new Date(from + 'T00:00:00Z').getTime() + days * 86400000)
  return taskOf({ uid, start: from, finish: finish.toISOString().slice(0, 10), ...part })
}

const oneRow = (tasks: readonly Task[]): Schedule =>
  scheduleOf({
    tasks,
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: tasks.map((t) => ({ groupId: 'g1', taskUid: t.uid })),
  })

// ---------------------------------------------------------------------------
// A. The group LOD ladder -- FR-018 with S-87, S-88 and S-125.
// ---------------------------------------------------------------------------

const BASE = settingNumber('groupLevelOfDetailBase') // S-87
const RATIO = settingNumber('groupLevelOfDetailRatio') // S-88
const MAX_GROUP_DEPTH = settingNumber('maxGroupDepth') // S-125

/**
 * S-87 prints the ladder as an expression rather than a list of figures:
 * 「グループ LOD の初項。`threshold(d) = base × ratio^(d − 2)`」. So this is the
 * manuscript's own formula over the manuscript's own two values, and a
 * re-ruled `S-87` or `S-88` moves every case below with it.
 *
 * ⚠️ FR-018 (MUST / MUST NOT): 「式の定義域は深さ 2 以上とすること（MUST）。
 * 深さ 1 を LOD の対象にしてはならない（MUST NOT）」 -- so the domain starts at
 * two and there is no `threshold(1)` to ask for.
 */
const thresholdOf = (depth: number): number => BASE * Math.pow(RATIO, depth - 2)

describe('FR-018 -- the group LOD ladder S-87 and S-88 state', () => {
  it('stands at threshold(d) for every depth S-125 admits, taken from the manuscript', () => {
    // A vacuous walk would pass without asserting anything, so the roster is
    // pinned first: S-125's 下限 is 3, so there are at least two rungs.
    expect(MAX_GROUP_DEPTH).toBeGreaterThanOrEqual(3)

    for (let depth = 2; depth <= MAX_GROUP_DEPTH; depth++) {
      const threshold = thresholdOf(depth)
      // Just above the rung, this depth is drawn...
      expect(groupDepthLimit(withZoomY(threshold * (1 + 1e-9)))).toBeGreaterThanOrEqual(depth)
      // ...and just below it, it is not.
      expect(groupDepthLimit(withZoomY(threshold * (1 - 1e-9)))).toBeLessThanOrEqual(depth - 1)
    }
  })

  it('S-88 above one is what puts the rungs in order, deep ones last', () => {
    // S-88: 「**1 以下だと深いほど出やすくなり単調性が壊れる**」. The ladder is
    // read off the manuscript rather than asserted as a list of numbers.
    expect(RATIO).toBeGreaterThan(1)
    for (let depth = 3; depth <= MAX_GROUP_DEPTH; depth++) {
      expect(thresholdOf(depth)).toBeGreaterThan(thresholdOf(depth - 1))
    }
  })

  it('FR-055 floor: depth 1 survives however far down zoomY goes', () => {
    // ⛔ FR-055 (MUST): 「表示を最も縮めたとき、描くものが `TaskGroup` の深さ 1 と
    // WBS の深さ 1 だけになること」, and FR-018 (MUST NOT): 「深さ 1 を LOD の
    // 対象にしてはならない —— 対象にすると最小倍率で深さ 1 も消え、`FR-055` の
    // 下限を破る」.
    expect(groupDepthLimit(withZoomY(Number.MIN_VALUE))).toBe(1)
    // S-97 of table T-206 names S-54 for the smallest zoom the product allows.
    expect(groupDepthLimit(withZoomY(NOT_STORED_ZOOM_BOUNDS['S-97']))).toBeGreaterThanOrEqual(1)
  })

  it('never climbs past S-125, however far up zoomY goes', () => {
    // S-125: 「`TaskGroup` の深さの上限」.
    expect(groupDepthLimit(withZoomY(NOT_STORED_ZOOM_BOUNDS['S-98']))).toBe(MAX_GROUP_DEPTH)
    expect(groupDepthLimit(withZoomY(Number.MAX_SAFE_INTEGER))).toBe(MAX_GROUP_DEPTH)
  })

  it('never draws more as zoomY falls, which is FR-018 without an argument', () => {
    // FR-018 (MUST NOT): 「縮小したのに表示が増える逆転を起こしてはならない」.
    const ladder = [Number.MIN_VALUE, 0.01, 0.1, 0.5, 1, 2, 4, 16, 64]
    const limits = ladder.map((zoomY) => groupDepthLimit(withZoomY(zoomY)))
    expect(limits).toEqual([...limits].sort((a, b) => a - b))
  })

  it('FR-055 floor, as a drawing: the most-shrunk view keeps depth 1 and nothing under it', () => {
    const nested = scheduleOf({
      taskGroups: Array.from({ length: MAX_GROUP_DEPTH }, (_, i) => ({
        id: `g${i + 1}`,
        parentId: i === 0 ? null : `g${i}`,
        order: 0,
        height: null,
      })),
    })

    const shrunk = layoutFromSchedule(
      nested,
      withZoomY(NOT_STORED_ZOOM_BOUNDS['S-97']),
      REGIONS,
    )
    // 「描くものが `TaskGroup` の深さ 1 ... だけになること（MUST）」 -- and the
    // other half of the same sentence, that something IS still drawn.
    expect(shrunk.rows.map((row) => row.depth)).toEqual([1])

    const opened = layoutFromSchedule(nested, withZoomY(NOT_STORED_ZOOM_BOUNDS['S-98']), REGIONS)
    expect(opened.rows).toHaveLength(MAX_GROUP_DEPTH)
  })
})

// ---------------------------------------------------------------------------
// B. What the band height depends on -- LF-2 / LF-3 with ST-1, ST-3 and ST-9.
// ---------------------------------------------------------------------------

/**
 * FR-094 (MUST): 「縦の寸法を止める床は、形状の比を掛ける前の予定の縦幅に 1 度
 * だけ当てること（MUST）。実績の縦幅に別の床を当ててはならない（MUST NOT）」.
 *
 * ⛔ THE VALUE OF THAT FLOOR IS NOT PRINTED ANYWHERE. It is derived here, and
 * the derivation is the only reason a figure appears at all: S-6 states
 * `actualMin` as the height the ACTUAL bar may not fall below (「これを割ると
 * 文字が下限に張り付く」), and the actual is the plan times `actualOfPlan`
 * (S-5), so flooring the plan once -- which is what FR-094 demands -- means
 * flooring it at `actualMin ÷ actualOfPlan`. That expression is the one S-4's
 * 下限 column already prints for `basePlanHeight`. ⚠️ Reported as a gap: a row
 * ought to state the floor outright rather than leave every reader to rebuild
 * it from two other rows.
 */
const PLAN_HEIGHT_FLOOR = settingNumber('actualMin') / settingNumber('actualOfPlan')

/** Below this zoomY the floor binds, and `basePlanHeight × zoomY` does not. */
const FLOOR_BINDS_BELOW = PLAN_HEIGHT_FLOOR / settingNumber('basePlanHeight')

describe("FR-094's floor -- the stretch of zoomY where the vertical layout does not move", () => {
  it('pins a rectangle at the floor, so two zooms under it draw the same band', () => {
    const low = FLOOR_BINDS_BELOW / 4
    const high = FLOOR_BINDS_BELOW / 1.5
    expect(high).toBeLessThan(FLOOR_BINDS_BELOW)

    const schedule = oneRow([
      spanning(1, '2026-01-01', 10, { name: 'x'.repeat(10) }),
      spanning(2, '2026-02-10', 10),
    ])
    const a = layoutFromSchedule(schedule, withZoomY(low), REGIONS)
    const b = layoutFromSchedule(schedule, withZoomY(high), REGIONS)

    expect(a.rectangleHeight).toBeCloseTo(PLAN_HEIGHT_FLOOR, 9)
    expect(b.rectangleHeight).toBeCloseTo(PLAN_HEIGHT_FLOOR, 9)
    // LF-2 and ST-9: the band is the stack's, and neither the stack nor the
    // lane heights have anything left to move.
    expect(b.rows[0]!.stackCount).toBe(a.rows[0]!.stackCount)
    expect(b.rows[0]!.height).toBeCloseTo(a.rows[0]!.height, 9)
    // FR-077's type size is derived from that same pinned height, so table
    // T-038's OC-1 measures the same overhang at both zooms.
    expect(b.placements[0]!.labelFontSize).toBeCloseTo(a.placements[0]!.labelFontSize, 9)
    expect(b.placements[0]!.occupiedX1).toBeCloseTo(a.placements[0]!.occupiedX1, 9)
  })
})

describe('above the floor, zoomY reaches the occupied WIDTH -- and through it the stack', () => {
  // ⛔ This is the chain a closed form for the band height has to answer for.
  // FR-077: 「タスクの高さに比例させた文字」 -- the drawn type size comes off the
  // bar height, which is `basePlanHeight × zoomY` once clear of FR-094's floor.
  // LC-5 of table T-068: 「ラベルの幅を概算する ... 単位数 × フォント ×
  // `labelCoef`」. LC-6 then places it (table T-013), OC-1 of table T-038 counts
  // the part pushed outside, ST-1 「重なり判定は**描画上の占有幅**で行う」 stacks
  // on that count, and ST-9 「行の帯高は段数で決まる」 turns the stack into the
  // band. Every link is a MUST, so the occupied width IS a function of zoomY.

  const NAMED = 'x'.repeat(10)

  it('FR-077 grows the drawn type size with zoomY, and OC-1 grows the overhang with it', () => {
    const schedule = oneRow([spanning(1, '2026-01-01', 10, { name: NAMED })])
    const small = layoutFromSchedule(schedule, withZoomY(1), REGIONS)
    const large = layoutFromSchedule(schedule, withZoomY(3), REGIONS)

    const a = small.placements[0]!
    const b = large.placements[0]!
    // Both zooms are clear of FR-094's floor, so the height really is moving.
    expect(FLOOR_BINDS_BELOW).toBeLessThan(1)
    expect(b.planHeight).toBeGreaterThan(a.planHeight)
    expect(b.labelFontSize).toBeGreaterThan(a.labelFontSize)
    // ⛔ The occupancy -- the thing ST-1 stacks on -- moved with the vertical
    // zoom, on a document whose zoomX never changed.
    expect(a.width).toBeCloseTo(b.width, 9)
    expect(b.occupiedX1 - b.x).toBeGreaterThan(a.occupiedX1 - a.x)
  })

  it('so the STACK COUNT of a row is not a function of zoomX alone', () => {
    // Two rectangles whose BARS never touch: 10 days from 2026-01-01 and 10
    // days from 2026-02-10, which at S-1's 6px a day puts 240px apart. The
    // first carries a name; the second carries none. ST-10 is not in play --
    // the bars do not even come close.
    const schedule = oneRow([
      spanning(1, '2026-01-01', 10, { name: NAMED }),
      spanning(2, '2026-02-10', 10),
    ])

    const shallow = layoutFromSchedule(schedule, withZoomY(0.5), REGIONS)
    const deep = layoutFromSchedule(schedule, withZoomY(3), REGIONS)

    // Both Tasks clear S-86 at zoomX 1 (60px against 24px), so table T-005a's
    // L-2 drops neither and the two layouts hold the same Tasks.
    expect(shallow.placements).toHaveLength(2)
    expect(deep.placements).toHaveLength(2)

    // ⛔ ONE lane at the low zoom, TWO at the high one: the label's overhang
    // grew past the gap between the bars, and ST-3's greedy pass had nowhere
    // shallower to put the second Task.
    expect(shallow.rows[0]!.stackCount).toBe(1)
    expect(deep.rows[0]!.stackCount).toBe(2)

    // ⛔ AND THEREFORE the band height is not `stackCount × barHeight + gaps`
    // with a stack count measured at some other zoom. Measured at 0.5 the
    // formula would answer one lane; the row really wants two and a stackGap.
    const oneLane = deep.rectangleHeight
    expect(deep.rows[0]!.height).toBeGreaterThan(oneLane)
  })
})
