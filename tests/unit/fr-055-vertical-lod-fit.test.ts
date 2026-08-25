// FR-055's VERTICAL half after the ⭐ paragraph landed in its RATIONALE: the
// fit settles the vertical by CHOOSING THE DISPLAY AMOUNT (the group level of
// detail depth), never by shrinking the zoom.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// quoted below, the entity types the fixtures are built from, and of the
// adapter only the published `InputContext` and the signature of
// `commandFromInput`. Every expected value here is computed from a requirement
// or a table row -- there is not one figure below that was measured off a run.
//
// ⭐ EVERY CASE PRESSES `F` (SK-18 of table T-036, IC-10 of table T-109) AND
// READS THE `CM-71` WRITE. Not `fitZoom` (PI-5) directly: the rule after table
// T-068 now has the fit run that table up to twice, over more than one zoom,
// and no row says which component holds the loop. Driving the press keeps these
// cases true wherever the front session puts it.
//
// The rows these cases answer to (rule 03: name the row, never copy its value):
//   FR-055   STATEMENT (scroll stays on the axis that does not fit; an empty
//            document returns to unity) and the ⭐ / ⛔ / ⚠️ paragraph of its
//            RATIONALE (choose the depth; deepest that fits; depth 1 when even
//            that does not fit; never below the smallest zoom that draws the
//            chosen depth; a gap at the bottom is allowed)
//   FR-018   the ladder, its domain from depth 2, and the ban on drawing MORE
//            as the zoom falls
//   FR-094   the floor on the plan height, which is why the depth 1 / 2 / 3
//            measurements below are invariant in `zoomY`
//   FR-016   the zoom is held inside S-75 / S-76's range (S-54 / S-55)
//   T-068    LC-1, LC-2, LC-9 and the two-pass rule printed after the table
//   T-205    S-87 / S-88 (the ladder's first term and ratio), S-86
//   T-201    S-49, S-54, S-55; T-206 S-96 / S-97 / S-98
//   T-203    S-75 / S-76 (the two zooms), S-125 (the depth cap)
//   T-221    LF-2 / LF-3 (the band height and the row pitch)
//   T-108    CM-71 -- the write the fit places the zoom in
//
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED, and why:
//   * THE ZOOM THE FIT LANDS ON WHEN THE CHOSEN DEPTH IS 1. FR-055's ⛔ is a
//     LOWER bound -- 「採った段を描ける最小の倍率より下へ、縦の倍率を下げては
//     ならない」 -- and depth 1 has no rung, because FR-018 (MUST NOT) keeps it
//     out of the ladder's domain. So the specification bounds that zoom only
//     from above (it must stay under the depth-2 rung, or depth 2 would be
//     drawn) and from below by S-54. Both of those ARE asserted. A particular
//     landing value is not: no row states one. Reported as a hole.
//   * THAT A SECOND PRESS OF `F` CHANGES NOTHING, taken as a requirement.
//     FR-018 says 「`IC-10`（全体表示）と `IC-11`（全画面）は繰り返しても同じ
//     結果にしかならない」, but it says it as the GROUND for a different MUST
//     (that only IC-12..IC-15 repeat on a held key), not as a rule of its own.
//     ⭐ What IS asserted below is narrower and does follow from rules: the
//     CHOSEN DEPTH is a function of the document and the Row Area, because
//     neither FR-055's criterion nor pass 1 of the T-068 rule mentions the zoom
//     in force -- pass 1 measures 「帯の高さが `FR-094` の床に達する倍率で」.
//   * DEPTHS 4 AND 5. Their rungs stand ABOVE FR-094's floor, which is where
//     the T-068 rule's pass 2 lives and where the drawing stops being invariant
//     in `zoomY`. Every fixture here holds at most three depths, and the case
//     `the premise the closed form rests on` proves that restriction is what
//     makes the rest of the file arithmetic rather than guesswork.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import type { DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import {
  commandFromInput,
  type InputContext,
  type InputModifiers,
  type KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'

// ---------------------------------------------------------------------------
// Settings and screen. Every key not pinned here comes from SETTINGS_DEFAULTS,
// which `npm run gen` prints from the manuscript, so a re-ruled row moves these
// cases with it instead of leaving a stale figure behind.
// ---------------------------------------------------------------------------

/** The four keys SETTINGS_DEFAULTS carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...NESTED, ...part }) as unknown as DocumentSettings

const settingNumber = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

const SETTINGS = settingsOf({
  scrollDate: '2026-01-01', // S-77, pinned so the time axis has an origin
  scrollGroupId: null, // S-78
  stackDirection: 'down', // S-58, pinned so every y reads from the top
  rulerHeight: 48, // S-2
  rulerFont: 12, // S-3
})

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/** Twice the height, same width -- the Row Area the monotonicity case needs. */
const ENV_TALL: ScreenEnvironment = { ...ENV, height: 1400 }

const REGIONS = regionsFromScreen(ENV, SETTINGS)
const REGIONS_TALL = regionsFromScreen(ENV_TALL, SETTINGS)

// ---------------------------------------------------------------------------
// The ladder, straight out of the manuscript.
// ---------------------------------------------------------------------------

const BASE = settingNumber('groupLevelOfDetailBase') // S-87
const RATIO = settingNumber('groupLevelOfDetailRatio') // S-88
const MAX_GROUP_DEPTH = settingNumber('maxGroupDepth') // S-125

/**
 * S-87 prints the ladder as an expression rather than a list of figures:
 * 「グループ LOD の初項。`threshold(d) = base × ratio^(d − 2)`」.
 *
 * ⚠️ FR-018 (MUST / MUST NOT): 「式の定義域は深さ 2 以上とすること（MUST）。
 * 深さ 1 を LOD の対象にしてはならない（MUST NOT）」 -- there is no
 * `threshold(1)` to ask for, and every use below respects that domain.
 */
const thresholdOf = (depth: number): number => BASE * Math.pow(RATIO, depth - 2)

/**
 * FR-094 (MUST): 「縦の寸法を止める床は、形状の比を掛ける前の予定の縦幅に 1 度
 * だけ当てること」. The floor's own value is not printed anywhere: S-6 states
 * `actualMin` as the height the ACTUAL bar may not fall below, and the actual is
 * the plan times `actualOfPlan` (S-5), so flooring the plan once means flooring
 * it at `actualMin ÷ actualOfPlan` -- the expression S-4's 下限 column already
 * prints for `basePlanHeight`. Below this zoom the plan height is pinned.
 */
const FLOOR_BINDS_BELOW =
  settingNumber('actualMin') / settingNumber('actualOfPlan') / settingNumber('basePlanHeight')

/**
 * The smallest zoom that draws depth `d`, which is what FR-055's ⛔ measures
 * against. For `d >= 2` that is the rung itself. For depth 1 there is no rung
 * -- FR-018 keeps it out of the domain -- so any zoom under the depth-2 rung
 * draws exactly depth 1, and this picks one well inside that band.
 */
const drawingZoomOf = (depth: number): number =>
  depth >= 2 ? thresholdOf(depth) : thresholdOf(2) / 2

// ---------------------------------------------------------------------------
// Fixtures. A tree of `TaskGroup` rows, `roots` wide, `depths` deep, each
// non-leaf row carrying `fanOut` children, and every row carrying exactly one
// `Task`.
//
// ⚠️ EVERY TASK RUNS THE SAME DATES ON PURPOSE. It keeps the horizontal extent
// the same whatever the tree is -- one bar's width -- so the vertical answers
// compared below cannot be moved by the horizontal half of the same press, and
// it keeps every row at one lane (ST-2 / ST-3 have nothing to stack), so LF-2
// gives every band the same height and the extent really is the row count.
// ⚠️ The span is long enough that FR-018's task LOD keeps it: the width it
// judges is the duration times one day's px (S-1 at zoomX 1) against S-86.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86400000
const dayAfter = (from: string, days: number): string =>
  new Date(new Date(`${from}T00:00:00Z`).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10)

const TASK_FROM = '2026-01-05'
const TASK_DAYS = 60

// Every nullable column has to be spelled `null`; leaving one `undefined` reads
// as "set".
const taskOf = (uid: number): Task =>
  ({
    uid,
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: TASK_FROM,
    finish: dayAfter(TASK_FROM, TASK_DAYS),
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
  }) as unknown as Task

const groupOf = (id: string, parentId: string | null, order: number): TaskGroup =>
  ({
    id,
    parentId,
    label: null,
    derivedFromTaskUid: null,
    order,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
  }) as unknown as TaskGroup

interface TreeShape {
  /** How many rows stand at depth 1. */
  readonly roots: number
  /** How deep the document goes. `1` is roots only. */
  readonly depths: number
  /** How many children each non-leaf row carries. */
  readonly fanOut: number
}

const scheduleOf = (shape: TreeShape): Schedule => {
  const groups: TaskGroup[] = []

  const grow = (parentId: string | null, depth: number, count: number): void => {
    if (depth > shape.depths) return
    for (let index = 0; index < count; index++) {
      const id = parentId === null ? `r${index}` : `${parentId}.${index}`
      groups.push(groupOf(id, parentId, index))
      grow(id, depth + 1, shape.fanOut)
    }
  }
  grow(null, 1, shape.roots)

  const tasks = groups.map((_group, index) => taskOf(index + 1))
  return {
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: 214,
      title: null,
      uidHighWaterMark: tasks.length + 1,
    },
    calendars: [],
    tasks,
    resources: [],
    assignments: [],
    taskGroups: groups,
    taskGroupMembers: groups.map((group, index) => ({
      groupId: group.id,
      taskUid: index + 1,
      stackOrder: null,
    })),
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
}

const documentOf = (schedule: Schedule, settings: DocumentSettings): Document =>
  ({
    schemaVersion: '1',
    schedule,
    documentSettings: settings,
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-26T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-08-26T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

// ---------------------------------------------------------------------------
// One frame, built the way ADR-001 has the shell build it, and one press of the
// entrance SK-18 names.
// ---------------------------------------------------------------------------

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const keyOf = (key: string): KeyInput => ({ kind: 'key', key, modifiers: NO_MODS })

const contextOf = (
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
): InputContext => {
  const layout = layoutFromSchedule(schedule, settings, regions)
  return {
    document: documentOf(schedule, settings),
    layout,
    geometry: geometryFromLayout(schedule, settings, layout, regions, emptySelection()),
    regions,
    screenState: emptyScreenState(),
    selection: emptySelection(),
    // S-53 arrives as a value. Deliberately not the figure the manuscript
    // prints: no case here reads it.
    zoomStep: 3,
    pressed: null,
    isTextEntryUnsettled: false,
    isDualCursorMode: false,
    today: '2026-03-01T00:00:00',
    newGroupId: 'row-minted-outside',
  } as unknown as InputContext
}

/** The `CM-71` write one press of `F` places, as a plain record. */
function fitWrite(
  schedule: Schedule,
  settings: DocumentSettings = SETTINGS,
  regions: ScreenRegions = REGIONS,
): Record<string, unknown> {
  const answer = commandFromInput(keyOf('F'), contextOf(schedule, settings, regions))
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') {
    throw new Error('SK-18 owes a changeDocument and this press did not ask for one')
  }
  const fit = (action.writes as readonly (readonly DocumentCommand[])[])
    .flat()
    .filter((one) => one.kind === 'fitScheduleToScreen')
  expect(fit, 'exactly one CM-71 per press (FR-031)').toHaveLength(1)
  return fit[0] as unknown as Record<string, unknown>
}

/** The settings a document is left holding once `CM-71` has been applied. */
function settingsAfterFit(write: Record<string, unknown>, from = SETTINGS): DocumentSettings {
  return settingsOf({
    ...from,
    zoomX: write['zoomX'],
    zoomY: write['zoomY'],
    scrollDate: write['scrollDate'],
    scrollGroupId: write['scrollGroupId'],
    scrollDayOffset: write['scrollDayOffset'], // S-177
    scrollGroupOffset: write['scrollGroupOffset'], // S-176
  })
}

const fittedZoomY = (
  schedule: Schedule,
  settings: DocumentSettings = SETTINGS,
  regions: ScreenRegions = REGIONS,
): number => fitWrite(schedule, settings, regions)['zoomY'] as number

/** LC-1..LC-9 over the whole document at the smallest zoom that draws `depth`. */
const layoutAtDepth = (
  schedule: Schedule,
  depth: number,
  regions: ScreenRegions = REGIONS,
): ScheduleLayout =>
  layoutFromSchedule(schedule, settingsOf({ ...SETTINGS, zoomY: drawingZoomOf(depth) }), regions)

const deepestDrawnDepth = (layout: ScheduleLayout): number =>
  layout.rows.reduce((deepest, row) => Math.max(deepest, row.depth), 0)

/**
 * FR-055's ⭐ rule, spelled out: 「その文書が持つ最も深い段から順に見て、描く
 * ものが Row Area に収まる最も深い段を採る。深さ 1 でも収まらないときは深さ 1
 * とし」.
 */
function depthTheFitOwes(shape: TreeShape, regions: ScreenRegions = REGIONS): number {
  const schedule = scheduleOf(shape)
  for (let depth = shape.depths; depth >= 2; depth--) {
    if (layoutAtDepth(schedule, depth, regions).contentHeight <= regions.rowArea.height) {
      return depth
    }
  }
  return 1
}

// ---------------------------------------------------------------------------
// The shapes. Named for the answer FR-055 owes on the 1000x700 screen above;
// each case re-derives that answer from the rule rather than trusting the name.
// ---------------------------------------------------------------------------

/** Six rows across three depths -- the whole document fits. */
const ALL_THREE_DEPTHS_FIT: TreeShape = { roots: 2, depths: 3, fanOut: 1 }
/** Depth 2 fits; depth 3 is four times as many rows and does not. */
const DEPTH_2_FITS: TreeShape = { roots: 6, depths: 3, fanOut: 4 }
/** Same, one third wider, so the depth-2 extent differs from the one above. */
const DEPTH_2_FITS_WIDER: TreeShape = { roots: 8, depths: 3, fanOut: 4 }
/** Depth 1 fits with room to spare; depth 2 is six times as many rows. */
const DEPTH_1_FITS: TreeShape = { roots: 6, depths: 2, fanOut: 5 }
/** Same, so the depth-1 extent differs while the chosen depth does not. */
const DEPTH_1_FITS_TALLER: TreeShape = { roots: 10, depths: 2, fanOut: 5 }
/** Not even depth 1 fits -- FR-055's 「深さ 1 でも収まらないとき」. */
const DEPTH_1_OVERFLOWS: TreeShape = { roots: 40, depths: 2, fanOut: 2 }

const EVERY_SHAPE: [string, TreeShape][] = [
  ['three depths, all of them fit', ALL_THREE_DEPTHS_FIT],
  ['depth 2 fits, depth 3 does not', DEPTH_2_FITS],
  ['depth 2 fits, one third wider', DEPTH_2_FITS_WIDER],
  ['depth 1 fits, depth 2 does not', DEPTH_1_FITS],
  ['depth 1 fits, taller', DEPTH_1_FITS_TALLER],
  ['not even depth 1 fits', DEPTH_1_OVERFLOWS],
]

// ---------------------------------------------------------------------------
// 0. The premise every case below rests on.
// ---------------------------------------------------------------------------

describe('the premise the closed form rests on -- FR-094 pins the picture under its floor', () => {
  it('puts every rung this file uses UNDER the floor, so those drawings do not move with zoomY', () => {
    // ⭐ The rule after table T-068 has pass 1 measure 「帯の高さが `FR-094` の
    // 床に達する倍率で」 and then says 「その床より下では絵が倍率に依らないので、
    // 1 回測れば床の内側に収まる段の縦幅は算術で出る」. That claim is only true
    // of the rungs that stand below the floor, and this is the check.
    expect(MAX_GROUP_DEPTH).toBeGreaterThanOrEqual(3) // S-125's 下限
    expect(RATIO).toBeGreaterThan(1) // S-88, which is what orders the rungs
    for (let depth = 1; depth <= 3; depth++) {
      expect(drawingZoomOf(depth)).toBeLessThan(FLOOR_BINDS_BELOW)
    }
    // ...and depth 4 is the first rung above it, which is exactly the case the
    // T-068 rule sends to pass 2. No fixture in this file reaches it.
    expect(thresholdOf(4)).toBeGreaterThan(FLOOR_BINDS_BELOW)
  })

  it('draws the same picture at both ends of a rung, which is why one measurement suffices', () => {
    const schedule = scheduleOf(DEPTH_2_FITS)
    for (const depth of [1, 2, 3]) {
      const low = drawingZoomOf(depth)
      // Just under the next rung: the same depth limit, a different zoom.
      const high = thresholdOf(depth + 1) * (1 - 1e-9)
      expect(high).toBeLessThan(FLOOR_BINDS_BELOW)
      const a = layoutFromSchedule(schedule, settingsOf({ ...SETTINGS, zoomY: low }), REGIONS)
      const b = layoutFromSchedule(schedule, settingsOf({ ...SETTINGS, zoomY: high }), REGIONS)
      expect(deepestDrawnDepth(b)).toBe(deepestDrawnDepth(a))
      expect(b.contentHeight).toBeCloseTo(a.contentHeight, 9)
    }
  })

  it('the fixtures really do exercise all three answers, or the cases below are vacuous', () => {
    expect(depthTheFitOwes(ALL_THREE_DEPTHS_FIT)).toBe(3)
    expect(depthTheFitOwes(DEPTH_2_FITS)).toBe(2)
    expect(depthTheFitOwes(DEPTH_2_FITS_WIDER)).toBe(2)
    expect(depthTheFitOwes(DEPTH_1_FITS)).toBe(1)
    expect(depthTheFitOwes(DEPTH_1_FITS_TALLER)).toBe(1)
    expect(depthTheFitOwes(DEPTH_1_OVERFLOWS)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// A. The fit draws the deepest depth that fits.
// ---------------------------------------------------------------------------

describe('FR-055 ⭐ -- the fit settles the vertical by choosing the depth', () => {
  // ⛔ 「縦は、倍率を縮めて合わせるのではなく、表示量（グループ LOD の深さ）を
  // 選んで合わせること（MUST）—— その文書が持つ最も深い段から順に見て、描く
  // ものが Row Area に収まる最も深い段を採る」.
  it.each(EVERY_SHAPE)('draws exactly the rows at or above the deepest depth that fits (%s)', (
    _name,
    shape,
  ) => {
    const schedule = scheduleOf(shape)
    const owed = depthTheFitOwes(shape)
    const drawn = layoutFromSchedule(
      schedule,
      settingsAfterFit(fitWrite(schedule)),
      REGIONS,
    )

    expect(deepestDrawnDepth(drawn)).toBe(owed)
    // ...and every row of that depth and above, not merely some of them. LC-1
    // has nothing to drop here (nothing is collapsed and nothing is hidden), so
    // the count is the whole prefix of the tree.
    expect(drawn.rows).toHaveLength(layoutAtDepth(schedule, owed).rows.length)
  })

  it.each(EVERY_SHAPE)('and what it drew fits the Row Area, unless even depth 1 cannot (%s)', (
    _name,
    shape,
  ) => {
    const schedule = scheduleOf(shape)
    const drawn = layoutFromSchedule(schedule, settingsAfterFit(fitWrite(schedule)), REGIONS)

    if (depthTheFitOwes(shape) > 1) {
      expect(drawn.contentHeight).toBeLessThanOrEqual(REGIONS.rowArea.height)
    }
    // ⚠️ NO ASSERTION THAT IT COMES CLOSE. FR-055 (RATIONALE): 「画面の下に隙間
    // が残ることは許す —— 本要求は収めることを求めており、埋めることを求めて
    // いない」. `DEPTH_1_FITS` leaves most of the Row Area empty and that is the
    // right answer, so a case that asserted the extent approached the height
    // would be asserting the opposite of the requirement.
  })

  it('leaves the gap rather than opening a depth that does not fit', () => {
    // The discriminating half of the rule: `DEPTH_1_FITS` has six rows of
    // content in a Row Area that holds far more, and the next depth down is six
    // times as many rows. Filling the gap would mean drawing depth 2.
    const schedule = scheduleOf(DEPTH_1_FITS)
    const drawn = layoutFromSchedule(schedule, settingsAfterFit(fitWrite(schedule)), REGIONS)
    expect(drawn.contentHeight).toBeLessThan(REGIONS.rowArea.height / 2)
    expect(deepestDrawnDepth(drawn)).toBe(1)
    expect(layoutAtDepth(schedule, 2).contentHeight).toBeGreaterThan(REGIONS.rowArea.height)
  })
})

// ---------------------------------------------------------------------------
// B. The floor under the zoom -- FR-055's ⛔.
// ---------------------------------------------------------------------------

describe('FR-055 ⛔ -- the zoom never goes below what the chosen depth needs', () => {
  // 「採った段を描ける最小の倍率より下へ、縦の倍率を下げてはならない
  // （MUST NOT）—— `FR-094` の床より下では帯の高さが縮まないので、下げても縦は
  // 1px も縮まず、`FR-018` のしきい値を割って行を消すだけである」.
  it.each(EVERY_SHAPE)('stands at or above the rung of the depth it chose (%s)', (_name, shape) => {
    const owed = depthTheFitOwes(shape)
    const zoomY = fittedZoomY(scheduleOf(shape))
    if (owed >= 2) {
      expect(zoomY).toBeGreaterThanOrEqual(thresholdOf(owed))
    }
    // ⛔ And never so high that the NEXT depth appears -- but ONLY where the
    // document actually holds one. FR-055's ⛔ is a lower bound and states no
    // upper one; what forbids climbing here is its ⭐ instead, 「収まる最も深い
    // 段を採る」, and that has nothing to bite on when there is no deeper row to
    // draw. So the fixture whose deepest depth IS the answer is left unbounded
    // above, deliberately.
    if (owed < shape.depths) {
      expect(zoomY).toBeLessThan(thresholdOf(owed + 1))
    }
  })

  it.each(EVERY_SHAPE)('stays inside S-75 / S-76 (FR-016, with S-54 and S-55) (%s)', (
    _name,
    shape,
  ) => {
    // FR-016 (MUST): 「ズームの倍率は表 T-203 の `S-75` / `S-76` が持つ範囲へ
    // 収めること」, whose bounds are S-54 / S-55, published for this layer by
    // S-97 / S-98 of table T-206.
    const zoomY = fittedZoomY(scheduleOf(shape))
    expect(zoomY).toBeGreaterThanOrEqual(NOT_STORED_ZOOM_BOUNDS['S-97'])
    expect(zoomY).toBeLessThanOrEqual(NOT_STORED_ZOOM_BOUNDS['S-98'])
  })
})

// ---------------------------------------------------------------------------
// C. Depth 1 does not fit -- the scroll stays, the shrinking does not continue.
// ---------------------------------------------------------------------------

describe('FR-055 -- when depth 1 does not fit either', () => {
  const schedule = scheduleOf(DEPTH_1_OVERFLOWS)

  it('still draws depth 1 and leaves the vertical scroll', () => {
    // FR-055 STATEMENT: 「ただし必ず収まることを保証しない。収まらない軸には
    // スクロールを残すこと」, and the RATIONALE: 「深さ 1 でも収まらないときは
    // 深さ 1 とし、縦にスクロールを残す」.
    const drawn = layoutFromSchedule(schedule, settingsAfterFit(fitWrite(schedule)), REGIONS)
    expect(deepestDrawnDepth(drawn)).toBe(1)
    expect(drawn.rows).toHaveLength(DEPTH_1_OVERFLOWS.roots)
    expect(drawn.contentHeight).toBeGreaterThan(REGIONS.rowArea.height)
  })

  it('does not go on shrinking past the point where shrinking removes rows', () => {
    // ⛔ THIS IS THE ASSERTION THAT SEPARATES CHOOSING THE DEPTH FROM DIVIDING
    // BY THE EXTENT. Dividing answers a zoom small enough to have crossed
    // several rungs downward; FR-018 (MUST NOT) 「縮小したのに表示が増える逆転を
    // 起こしてはならない」 and FR-055's ⛔ together say the only rungs that may
    // be crossed are the ones whose depth did not fit. Depth 1 is not a rung at
    // all (FR-018 keeps it out of the domain), so the bound the specification
    // does state is this one: under the depth-2 rung, and no lower than S-54.
    const zoomY = fittedZoomY(schedule)
    expect(zoomY).toBeLessThan(thresholdOf(2))
    expect(zoomY).toBeGreaterThanOrEqual(NOT_STORED_ZOOM_BOUNDS['S-97'])
  })
})

// ---------------------------------------------------------------------------
// D. The zoom answers the DEPTH, not the extent.
// ---------------------------------------------------------------------------

describe('FR-055 ⭐ -- the vertical zoom is a function of the chosen depth, not of the extent', () => {
  // 「縦は、倍率を縮めて合わせるのではなく、表示量（グループ LOD の深さ）を選んで
  // 合わせること（MUST）」. Two documents that land on the same depth are settled
  // by the same choice, so the zoom they are settled at is the same -- even
  // though one of them draws far more content than the other.
  const samePairs: [string, TreeShape, TreeShape][] = [
    ['both land on depth 1', DEPTH_1_FITS, DEPTH_1_FITS_TALLER],
    ['both land on depth 2', DEPTH_2_FITS, DEPTH_2_FITS_WIDER],
  ]

  it.each(samePairs)('%s, so both are fitted to the same zoomY', (_name, one, other) => {
    const owed = depthTheFitOwes(one)
    expect(depthTheFitOwes(other)).toBe(owed)

    // ...and the case is not vacuous: the two really do draw different amounts.
    const heights = [one, other].map(
      (shape) => layoutAtDepth(scheduleOf(shape), owed).contentHeight,
    )
    expect(heights[0]).not.toBeCloseTo(heights[1] as number, 3)

    expect(fittedZoomY(scheduleOf(other))).toBeCloseTo(fittedZoomY(scheduleOf(one)), 10)
  })
})

// ---------------------------------------------------------------------------
// E. The answer is a fixed point.
// ---------------------------------------------------------------------------

describe('FR-055 -- fitting an already fitted view answers the same depth', () => {
  // ⭐ WHY THIS FOLLOWS FROM RULES RATHER THAN FROM A WISH. FR-055's criterion
  // is 「その文書が持つ最も深い段から順に見て、描くものが Row Area に収まる最も
  // 深い段」 -- a property of the document and the Row Area, with no mention of
  // the zoom in force. The rule after table T-068 says the same of the
  // measurement: pass 1 runs 「帯の高さが `FR-094` の床に達する倍率で」, a zoom
  // the settings fix, and pass 2 runs at the chosen depth's own zoom. Neither
  // reads the zoom the view happens to be at, so pressing twice cannot answer
  // twice.
  //
  // ⚠️ ASSERTED ON THE DEPTH AND ON `zoomY`, NOT ON THE WHOLE WRITE. FR-055
  // settles the horizontal a different way (「横はこの限りではない」) and the
  // position is four values after CR-260; neither is this file's subject.
  it.each(EVERY_SHAPE)('answers the same depth and the same zoomY on the second press (%s)', (
    _name,
    shape,
  ) => {
    const schedule = scheduleOf(shape)

    const first = fitWrite(schedule)
    const afterFirst = settingsAfterFit(first)
    const second = fitWrite(schedule, afterFirst, REGIONS)

    expect(second['zoomY']).toBeCloseTo(first['zoomY'] as number, 10)
    expect(deepestDrawnDepth(layoutFromSchedule(schedule, settingsAfterFit(second, afterFirst), REGIONS))).toBe(
      deepestDrawnDepth(layoutFromSchedule(schedule, afterFirst, REGIONS)),
    )
  })

  it('is a fixed point after eight presses, not a sequence that keeps falling', () => {
    // ⚠️ The failure this guards is a CONTRACTION: an answer that is stable to
    // three decimals on the second press can still walk downward, and FR-018
    // relies on IC-10 not doing that when it excludes the entrance from the
    // repeat (「`IC-10`（全体表示）と `IC-11`（全画面）は繰り返しても同じ結果に
    // しかならない」).
    const schedule = scheduleOf(DEPTH_1_OVERFLOWS)
    let settings = SETTINGS
    const seen: number[] = []
    for (let press = 0; press < 8; press++) {
      const write = fitWrite(schedule, settings, REGIONS)
      settings = settingsAfterFit(write, settings)
      seen.push(write['zoomY'] as number)
    }
    for (const zoomY of seen) expect(zoomY).toBeCloseTo(seen[0] as number, 10)
  })
})

// ---------------------------------------------------------------------------
// F. Monotonicity, carried across the fit.
// ---------------------------------------------------------------------------

describe('FR-018 -- more room never answers a shallower depth', () => {
  // 「縮小したのに表示が増える逆転を起こしてはならない（MUST NOT）」 read across
  // FR-055: the fit's answer for a taller Row Area is never a shallower depth
  // than its answer for a shorter one, because the criterion it applies is
  // 「描くものが Row Area に収まる」 and the taller Row Area admits everything
  // the shorter one did.
  it.each(EVERY_SHAPE)('a taller Row Area is never fitted to a shallower depth (%s)', (
    _name,
    shape,
  ) => {
    const schedule = scheduleOf(shape)
    expect(REGIONS_TALL.rowArea.height).toBeGreaterThan(REGIONS.rowArea.height)

    const short = layoutFromSchedule(schedule, settingsAfterFit(fitWrite(schedule)), REGIONS)
    const tall = layoutFromSchedule(
      schedule,
      settingsAfterFit(fitWrite(schedule, SETTINGS, REGIONS_TALL)),
      REGIONS_TALL,
    )
    expect(deepestDrawnDepth(tall)).toBeGreaterThanOrEqual(deepestDrawnDepth(short))
  })

  it('and the taller screen really does open a depth the shorter one refused', () => {
    // Otherwise the walk above is a row of tautologies.
    const shape = DEPTH_1_FITS
    expect(depthTheFitOwes(shape, REGIONS)).toBe(1)
    expect(depthTheFitOwes(shape, REGIONS_TALL)).toBe(2)
  })
})
