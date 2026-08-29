// FR-098 and `LF-14` of table T-221: the band a pinned row is lifted into, and
// what the rows that still scroll are left with.
//
// Unit under test: `layoutFromSchedule` (PI-5 of table T-064, unit UF-19 of
// table T-075). ⭐ IT IS THE UNIT THE RULE NAMES. `LF-14` is written as an
// amendment to `LF-3` -- 「帯へ上げた行は `LF-3` の連なりから除き、抜けた場所は
// 詰める」 -- and `LF-3` is the row pitch this unit computes, so the lift happens
// where the chain is built and nowhere else.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE HOLE IT WAS WRITTEN TO STAND IN
// ---------------------------------------------------------------------------
//
// CR-308 (2026-08-30) settled where a pinned row is drawn, and nothing anywhere
// asks for it: `T-221` gained `LF-14`, and the completeness check at the foot of
// tests/integration/schedule-drawing.sws.test.ts has been red with
// 「table T-221 row LF-14 has no case」 ever since. Meanwhile FR-098's own
// paragraph on the display amount was REVERSED on the same day -- it used to
// admit that FR-018 might stop drawing a pinned row, and now forbids it.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   表 T-221 LF-14 「帯の高さは、帯に置く行の帯高（`LF-2`）を合計し、行と行のあいだに
//              `rowGap` をその数から 1 を引いた数だけ加えたものとする。帯へ上げた行は
//              `LF-3` の連なりから除き、抜けた場所は詰める。スクロールする行が並ぶのは、
//              `Row Area` の高さから帯の高さと `rowGap` 1 つぶんを引いた残りとする」
//   `FR-098`   「ピン止めした行は、スクロールする領域から抜いて画面の上端へ固定する
//              こと（MUST）」／「本要求でいう『画面の上端』とは … `U-50`（`Row Area`）の
//              上端をいう（MUST）。`Time Ruler` の帯より上へ出してはならない（MUST
//              NOT）」／「行見出しの側と日程の側の両方を、同時に同じ高さへ上げること
//              （MUST）」／「帯は `Row Area` の中に置き、スクロールする行が並ぶのは
//              その残りとすること（MUST）。スクロールする行を帯の下へ潜らせてはならない
//              （MUST NOT）」／⛔ 「帯が `Row Area` を埋め尽くし、スクロールする行が
//              1 行も描けなくなってはならない（MUST NOT）」／⛔ 「ピン止めした行を、
//              表示量の増減（`FR-018`）で描かなくしてはならない（MUST NOT）」（利用者の
//              裁定 2026-08-30「拡大、縮小しても表示を続けるのがピン止めだ」）／
//              「ピン止めした行が描かれないのは、人が畳んだ行の配下にあるとき（表 T-015
//              の `HR-1a`）と、隠した行の配下にあるとき（同表の `HR-6`）に限ること
//              （MUST）」／⛔ 「縦にスクロールしたことは理由にならない（MUST NOT）」
//   `FR-018`   「ピン止めした行（`FR-098`）を本要求の対象から外すこと（MUST）。倍率を
//              下げたことを理由に、その行を描くのをやめてはならない（MUST NOT）」
//   表 T-203   S-126 `pinnedGroupIds` ／ S-127 `pinnedRowMax` ／ S-125 `maxGroupDepth`
//   表 T-205   S-87 / S-88 -- the group level of detail ladder FR-018 climbs
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). What was read of `src/`: the exported
// declarations `layoutFromSchedule`, `groupDepthLimit`, `ScheduleLayout`,
// `RowPlacement`, `regionsFromScreen`, `ScreenRegions`, `ScreenEnvironment`,
// `SETTINGS_DEFAULTS` and the entity types the fixtures are built from.
// ⛔ NO FUNCTION BODY WAS READ. ⭐ The fixture builders are copied from
// tests/unit/fr-055-vertical-lod-fit.test.ts.
//
// ---------------------------------------------------------------------------
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   1. THAT THE ROW HEADING SIDE RISES WITH THE SCHEDULE SIDE. FR-098 (MUST)
//      asks for both at one height, and SC-1 of table T-031 already makes the
//      heading side take its boxes from the drawn rows -- so the two agree by
//      construction as long as the LIFT is in the layout, which is what every
//      case below asks. ⛔ A case that built the heading panel from these same
//      rows would be asserting that a copy equals its original.
//   2. WHERE `S-78` / `S-176` POINT. FR-098 (MUST) has them point at the top of
//      the scrolling remainder, and no member of `ScheduleLayout` publishes a
//      scroll anchor -- `originDay` is the horizontal one. Reported as a hole.
//   3. THAT VERTICAL SCROLLING IS NOT A REASON TO STOP DRAWING A PINNED ROW.
//      This unit is handed no scroll offset in the vertical -- S-78 names a row
//      and S-176 a fraction of it -- so a case here could only move `S-78` and
//      would be asking a different question. Reported as a hole.

import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import {
  groupDepthLimit,
  layoutFromSchedule,
  type RowPlacement,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// What the manuscript says, read at run time rather than copied
// ---------------------------------------------------------------------------

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

const LF_14 = (() => {
  const row = specTable('T-221').rows.find((one) => one.id === 'LF-14')
  if (row === undefined) throw new Error('表 T-221 has no row LF-14')
  // ⛔ THE RAW CELL AND NOT `bare()`: that helper answers the FIRST
  // back-ticked token of a cell, and this formula names several.
  return row.cells[row.cells.length - 1] ?? ''
})()

const FR_098_TOP_IS_ROW_AREA =
  '本要求でいう「画面の上端」とは、`_assets/tbl-glossary.md` の `U-50`（`Row Area`）の上端をいう（MUST）'
const FR_098_BOTH_SIDES = '行見出しの側と日程の側の両方を、同時に同じ高さへ上げること（MUST）'
const FR_098_BAND_INSIDE = '帯は `Row Area` の中に置き、スクロールする行が並ぶのはその残りとすること（MUST）'
const FR_098_NOT_UNDER = 'スクロールする行を帯の下へ潜らせてはならない（MUST NOT）'
const FR_098_NOT_FILLED =
  '帯が `Row Area` を埋め尽くし、スクロールする行が 1 行も描けなくなってはならない（MUST NOT）'
const FR_098_NOT_BY_ZOOM =
  'ピン止めした行を、表示量の増減（`FR-018`）で描かなくしてはならない（MUST NOT）'
const FR_098_ONLY_TWO = 'それ以外の理由で描くのをやめてはならない（MUST NOT）'
const FR_098_NOT_SCROLL = '縦にスクロールしたことは理由にならない（MUST NOT）'
const FR_018_EXEMPTS =
  'ピン止めした行（`FR-098`）を本要求の対象から外すこと（MUST）。倍率を下げたことを理由に、その行を描くのをやめてはならない（MUST NOT）'

// ---------------------------------------------------------------------------
// Settings and screen. Copied from tests/unit/fr-055-vertical-lod-fit.test.ts:
// every key not pinned here comes from SETTINGS_DEFAULTS, which `npm run gen`
// prints from the manuscript.
// ---------------------------------------------------------------------------

/** The four keys SETTINGS_DEFAULTS carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...SETTINGS_DEFAULTS,
    ...NESTED,
    scrollDate: '2026-01-01', // S-77, so the time axis has an origin
    scrollGroupId: null, // S-78
    stackDirection: 'down', // S-58, so every y reads from the top
    ...part,
  }) as unknown as DocumentSettings

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

const BASE = settingNumber('groupLevelOfDetailBase') // S-87
const RATIO = settingNumber('groupLevelOfDetailRatio') // S-88

/**
 * S-87 prints the ladder as an expression: 「`threshold(d) = base × ratio^(d − 2)`」.
 * ⚠️ FR-018 (MUST NOT) keeps depth 1 out of the domain, so there is no
 * `threshold(1)`; a zoom under the depth-2 rung draws depth 1 alone.
 */
const thresholdOf = (depth: number): number => BASE * Math.pow(RATIO, depth - 2)

// ---------------------------------------------------------------------------
// Fixtures. Copied from tests/unit/fr-055-vertical-lod-fit.test.ts.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86400000
const dayAfter = (from: string, days: number): string =>
  new Date(new Date(`${from}T00:00:00Z`).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10)

const TASK_FROM = '2026-01-05'
const TASK_DAYS = 60

/** Every nullable column spelled `null`; leaving one `undefined` reads as "set". */
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

const groupOf = (part: Record<string, unknown>): TaskGroup =>
  ({
    parentId: null,
    label: null,
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
    ...part,
  }) as unknown as TaskGroup

const scheduleOf = (groups: readonly TaskGroup[]): Schedule => {
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
      groupId: (group as unknown as { id: string }).id,
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

/** Four root rows, one task each, so every band is one lane tall (LF-2). */
const FOUR_ROOTS = scheduleOf([
  groupOf({ id: 'g1', order: 0 }),
  groupOf({ id: 'g2', order: 1 }),
  groupOf({ id: 'g3', order: 2 }),
  groupOf({ id: 'g4', order: 3 }),
])

interface Drawn {
  readonly settings: DocumentSettings
  readonly regions: ScreenRegions
  readonly layout: ScheduleLayout
}

const draw = (schedule: Schedule, part: Record<string, unknown> = {}): Drawn => {
  const settings = settingsOf(part)
  const regions = regionsFromScreen(ENV, settings)
  return { settings, regions, layout: layoutFromSchedule(schedule, settings, regions) }
}

const rowsOf = (drawn: Drawn): readonly RowPlacement[] => drawn.layout.rows
const idsOf = (rows: readonly RowPlacement[]): readonly string[] => rows.map((one) => one.groupId)

const rowById = (drawn: Drawn, groupId: string): RowPlacement => {
  const found = rowsOf(drawn).find((one) => one.groupId === groupId)
  if (found === undefined) throw new Error(`this frame drew no row ${groupId}`)
  return found
}

/**
 * The band height `LF-14` states, computed from the rows the layout itself
 * measured: 「帯に置く行の帯高（`LF-2`）を合計し、行と行のあいだに `rowGap` を
 * その数から 1 を引いた数だけ加えたもの」.
 *
 * ⛔ NOT READ OFF A MEMBER OF THE ANSWER. `ScheduleLayout` publishes no band, so
 * the height is rebuilt out of `LF-2` and `rowGap` exactly as the row spells it.
 */
const bandHeightOf = (drawn: Drawn, pinned: readonly string[]): number => {
  const heights = pinned.map((groupId) => rowById(drawn, groupId).height)
  const sum = heights.reduce((total, one) => total + one, 0)
  return sum + drawn.settings.rowGap * (heights.length - 1)
}

/** Two places is what a drawn coordinate is rounded to, so this is its slack. */
const SLACK = 6

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⛔ LF-14 still states the band height, the closing of the hole and the remainder', () => {
    expect(LF_14).toContain('`rowGap`')
    expect(LF_14).toContain('帯へ上げた行は `LF-3` の連なりから除き、抜けた場所は詰める')
    expect(LF_14).toContain(
      '`Row Area` の高さから帯の高さと `rowGap` 1 つぶんを引いた残りとする',
    )
  })

  it('⛔ FR-098 still fixes the band to the Row Area’s top and keeps the rows out from under it', () => {
    expect(REQUIREMENTS).toContain(FR_098_TOP_IS_ROW_AREA)
    expect(REQUIREMENTS).toContain(FR_098_BOTH_SIDES)
    expect(REQUIREMENTS).toContain(FR_098_BAND_INSIDE)
    expect(REQUIREMENTS).toContain(FR_098_NOT_UNDER)
    expect(REQUIREMENTS).toContain(FR_098_NOT_FILLED)
  })

  it('⛔ FR-098 and FR-018 both take a pinned row out of the display amount', () => {
    // ⛔ THE SENTENCE THAT WAS REVERSED ON 2026-08-30, pinned in both places it
    // is written. A manuscript that went back to letting the zoom drop a pinned
    // row fails here rather than leaving the cases below asserting the opposite.
    expect(REQUIREMENTS).toContain(FR_098_NOT_BY_ZOOM)
    expect(REQUIREMENTS).toContain(FR_098_ONLY_TWO)
    expect(REQUIREMENTS).toContain(FR_098_NOT_SCROLL)
    expect(REQUIREMENTS).toContain(FR_018_EXEMPTS)
    expect(REQUIREMENTS).not.toContain('表示量の増減で描かれなくなることを許す（MUST）')
  })

  it('the frame these cases are read from really drew four rows', () => {
    // ⭐ The premise without which every count below counts nothing.
    const drawn = draw(FOUR_ROOTS)
    expect(idsOf(rowsOf(drawn))).toEqual(['g1', 'g2', 'g3', 'g4'])
    expect(drawn.regions.rowArea.height).toBeGreaterThan(0)
  })

  it('with nothing pinned, the first row still starts at the top of the Row Area (LF-3)', () => {
    // ⛔ THE PAIR EVERY CASE IN (a) IS MEASURED AGAINST. A layout that always
    // began one band lower would pass them while pinning nothing.
    const drawn = draw(FOUR_ROOTS)
    expect(rowById(drawn, 'g1').y).toBeCloseTo(drawn.regions.rowArea.y, 6)
  })
})

// ===========================================================================
// (a) LF-14 and FR-098 -- the band sits at the top of the Row Area
// ===========================================================================

describe('LF-14 (MUST) -- the pinned rows are lifted into a band at the Row Area’s top', () => {
  it('⛔ MUST: a pinned row is drawn at the top of the `Row Area`, not at its natural place', () => {
    // 「ピン止めした行は、スクロールする領域から抜いて画面の上端へ固定すること
    //   （MUST）」 with 「『画面の上端』とは … `U-50`（`Row Area`）の上端をいう
    //   （MUST）」. ⚠️ `g3` stands third, so its natural place is two bands down.
    const drawn = draw(FOUR_ROOTS, { pinnedGroupIds: ['g3'] })

    expect(
      rowById(drawn, 'g3').y,
      'FR-098 (MUST): ピン止めした行は … 画面の上端へ固定すること',
    ).toBeCloseTo(drawn.regions.rowArea.y, 6)
  })

  it('⛔ MUST NOT: it is never lifted above the `Row Area`, which is where the ruler ends', () => {
    // 「`Time Ruler` の帯より上へ出してはならない（MUST NOT）—— 目盛の上に日程を
    //   置くと、そのバーがどの日付に在るのかを読めなくなる」
    const drawn = draw(FOUR_ROOTS, { pinnedGroupIds: ['g3'] })
    const ruler = drawn.regions.timeRuler

    expect(rowById(drawn, 'g3').y).toBeGreaterThanOrEqual(drawn.regions.rowArea.y - SLACK)
    expect(rowById(drawn, 'g3').y).toBeGreaterThanOrEqual(ruler.y + ruler.height - SLACK)
  })

  it('⛔ MUST NOT: pinned rows are not ranked -- the second one follows the first by rowGap', () => {
    // 「ピン止めした行どうしに優劣を設けてはならない（MUST NOT）—— 固定した順に上から
    //   並べる」, and LF-14 spends one `rowGap` between two rows of the band.
    const drawn = draw(FOUR_ROOTS, { pinnedGroupIds: ['g3', 'g1'] })
    const first = rowById(drawn, 'g3')
    const second = rowById(drawn, 'g1')

    expect(first.y, 'the row pinned first stands at the top').toBeCloseTo(
      drawn.regions.rowArea.y,
      6,
    )
    expect(second.y, 'LF-14: the next row of the band is one band and one rowGap down').toBeCloseTo(
      first.y + first.height + drawn.settings.rowGap,
      6,
    )
  })
})

// ===========================================================================
// (b) LF-14 -- what the rows that still scroll are left with
// ===========================================================================

describe('LF-14 (MUST) -- the scrolling rows begin below the band, and the hole closes', () => {
  it('⛔ MUST: the first scrolling row stands one band and one rowGap below the top', () => {
    // 「スクロールする行が並ぶのは、`Row Area` の高さから帯の高さと `rowGap` 1 つぶんを
    //   引いた残りとする」 -- the band is at the top, so the remainder begins that
    //   far down.
    const drawn = draw(FOUR_ROOTS, { pinnedGroupIds: ['g3'] })
    const band = bandHeightOf(drawn, ['g3'])

    expect(
      rowById(drawn, 'g1').y,
      'LF-14 (MUST): the remainder is the Row Area less the band and one rowGap',
    ).toBeCloseTo(drawn.regions.rowArea.y + band + drawn.settings.rowGap, 6)
  })

  it('⛔ MUST: the hole the lifted row left is closed up (LF-3 runs on without it)', () => {
    // 「帯へ上げた行は `LF-3` の連なりから除き、抜けた場所は詰める」 -- so the rows
    //   that remain are an unbroken LF-3 chain among themselves.
    const drawn = draw(FOUR_ROOTS, { pinnedGroupIds: ['g3'] })
    const scrolling = ['g1', 'g2', 'g4'].map((groupId) => rowById(drawn, groupId))

    for (let index = 1; index < scrolling.length; index += 1) {
      const above = scrolling[index - 1] as RowPlacement
      const here = scrolling[index] as RowPlacement
      expect(here.y, `LF-3 after the lift: row ${here.groupId}`).toBeCloseTo(
        above.y + above.height + drawn.settings.rowGap,
        6,
      )
    }
  })

  it('⛔ MUST NOT: no scrolling row is slid under the band', () => {
    // 「スクロールする行を帯の下へ潜らせてはならない（MUST NOT）—— 潜らせると、
    //   同じ場所に 2 つの行が重なる」
    const drawn = draw(FOUR_ROOTS, { pinnedGroupIds: ['g3', 'g1'] })
    const band = bandHeightOf(drawn, ['g3', 'g1'])
    const bandBottom = drawn.regions.rowArea.y + band

    const under = rowsOf(drawn)
      .filter((one) => one.groupId !== 'g3' && one.groupId !== 'g1')
      .filter((one) => one.y < bandBottom - SLACK)

    expect(
      idsOf(under),
      'FR-098 (MUST NOT): スクロールする行を帯の下へ潜らせてはならない',
    ).toEqual([])
  })

  it('⛔ MUST NOT: the band never fills the Row Area -- a scrolling row is still drawn', () => {
    // 「帯が `Row Area` を埋め尽くし、スクロールする行が 1 行も描けなくなっては
    //   ならない（MUST NOT）—— 埋め尽くすと、留めた行を見比べる相手が画面から消え、
    //   ピン止めの目的そのものが失われる」. ⭐ Every row of the document is pinned
    //   but one, and `S-127`'s own ceiling is what bounds how many may be.
    const drawn = draw(FOUR_ROOTS, {
      pinnedGroupIds: ['g1', 'g2', 'g3'],
      pinnedRowMax: 3,
      zoomY: 4,
    })

    expect(
      idsOf(rowsOf(drawn)).filter((one) => one === 'g4'),
      'FR-098 (MUST NOT): 帯が `Row Area` を埋め尽くし … 1 行も描けなくなってはならない',
    ).toEqual(['g4'])
  })
})

// ===========================================================================
// (c) FR-098 with FR-018 -- the zoom is not a reason to stop drawing a pin
// ===========================================================================

describe('FR-098 (MUST NOT) -- the display amount does not take a pinned row away', () => {
  /** A root with two children, so the group level of detail has a depth 2 to drop. */
  const TWO_DEEP = scheduleOf([
    groupOf({ id: 'r1', order: 0 }),
    groupOf({ id: 'c1', parentId: 'r1', order: 0 }),
    groupOf({ id: 'c2', parentId: 'r1', order: 1 }),
  ])

  /** A zoom under the depth-2 rung: FR-018's ladder draws depth 1 alone there. */
  const SMALL = thresholdOf(2) / 2

  it('the premise: at this zoom the group level of detail really does stop at depth 1', () => {
    // ⛔ WITHOUT THIS, THE CASE BELOW WOULD PASS ON A ZOOM THAT DROPS NOTHING.
    const drawn = draw(TWO_DEEP, { zoomY: SMALL })
    expect(groupDepthLimit(drawn.settings), 'S-87 / S-88: the ladder at this zoom').toBeLessThan(2)
    expect(
      idsOf(rowsOf(drawn)),
      'FR-018: with nothing pinned, the zoom drops both depth-2 rows',
    ).toEqual(['r1'])
  })

  it('⛔ MUST NOT: a pinned row at that depth is drawn all the same', () => {
    // 「ピン止めした行を、表示量の増減（`FR-018`）で描かなくしてはならない（MUST
    //   NOT）」（利用者の裁定 2026-08-30「拡大、縮小しても表示を続けるのがピン止めだ」）
    //   and FR-018's own half: 「ピン止めした行（`FR-098`）を本要求の対象から外すこと
    //   （MUST）」.
    // ⭐ `c2` IS THE CONTROL: same depth, same document, not pinned.
    const drawn = draw(TWO_DEEP, { zoomY: SMALL, pinnedGroupIds: ['c1'] })

    expect(
      idsOf(rowsOf(drawn)).includes('c1'),
      'FR-098 (MUST NOT): 倍率を下げたことを理由に、その行を描くのをやめてはならない',
    ).toBe(true)
    expect(idsOf(rowsOf(drawn)).includes('c2'), 'the unpinned row at that depth is still dropped')
      .toBe(false)
  })

  it('⭐ and the exempt set does not grow with the zoom: it is the same set at every zoom', () => {
    // 「⭐ 落とす向きの単調性はこの免除で壊れない —— 免除される集合は倍率に依らず
    //   一定であり、描く集合は『一定の集合と、縮む集合の和』だからである」
    const small = draw(TWO_DEEP, { zoomY: SMALL, pinnedGroupIds: ['c1'] })
    const large = draw(TWO_DEEP, { zoomY: thresholdOf(2) * 2, pinnedGroupIds: ['c1'] })

    expect(idsOf(rowsOf(small)).includes('c1')).toBe(true)
    expect(idsOf(rowsOf(large)).includes('c1')).toBe(true)
    // The drawn set only ever grows as the zoom rises (FR-018's MUST NOT on the
    // reversal), so every row the small zoom drew is drawn at the large one too.
    for (const groupId of idsOf(rowsOf(small))) {
      expect(idsOf(rowsOf(large)), `${groupId} was drawn small and lost when zoomed in`).toContain(
        groupId,
      )
    }
  })
})

// ===========================================================================
// (d) FR-098 -- the two reasons a pinned row may go undrawn, and only those
// ===========================================================================

describe('FR-098 (MUST) -- only HR-1a and HR-6 keep a pinned row off the screen', () => {
  const under = (part: Record<string, unknown>): Schedule =>
    scheduleOf([
      groupOf({ id: 'r1', order: 0, ...part }),
      groupOf({ id: 'c1', parentId: 'r1', order: 0 }),
      groupOf({ id: 'g2', order: 1 }),
    ])

  it('⛔ MUST: a pinned row under a folded row is not drawn (HR-1a)', () => {
    // 「ピン止めした行が描かれないのは、人が畳んだ行の配下にあるとき（表 T-015 の
    //   `HR-1a`）と、隠した行の配下にあるとき（同表の `HR-6`）に限ること（MUST）」
    //   -- HR-1a (MUST NOT): 「畳んだ `TaskGroup` の配下の行 … を描いてはならない」.
    const drawn = draw(under({ isCollapsed: true }), { pinnedGroupIds: ['c1'] })

    expect(idsOf(rowsOf(drawn))).not.toContain('c1')
  })

  it('⛔ MUST: a pinned row under a hidden row is not drawn (HR-6)', () => {
    // HR-6 (MUST NOT): 「隠した行の配下の行 … を描いてはならない」.
    const drawn = draw(under({ isHidden: true }), { pinnedGroupIds: ['c1'] })

    expect(idsOf(rowsOf(drawn))).not.toContain('c1')
  })

  it('⭐ and the same row, with neither above it, is drawn -- so the pair is about those two', () => {
    // ⛔ WITHOUT THIS, THE TWO CASES ABOVE WOULD PASS ON A LAYOUT THAT NEVER DREW
    // `c1` AT ALL.
    const drawn = draw(under({}), { pinnedGroupIds: ['c1'] })

    expect(idsOf(rowsOf(drawn))).toContain('c1')
  })
})
