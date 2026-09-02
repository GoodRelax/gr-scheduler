// Table T-023d's closing rule of 2026-09-02: where the hit box of the three
// dummies BEGINS.
//
//   ⭐⭐ 「`GR-9` / `GR-17` / `GR-18` の当たり判定は、その日の列の左端を起点に、
//        右へ `_assets/tbl-settings.md` の `S-93` の幅で取ること（MUST）」
//        （利用者の裁定 2026-09-02）
//   ⛔  「起点を中心にしてはならない（MUST NOT）—— 中心に取ると左へ食い込み、
//        予定の開始点（`GR-3`）を飲む。⚠️ 実測（2026-09-02、出荷ビルド、6px/日）
//        で左へ 2.5 日ぶんに当たる —— `FR-043` が掴み代を 1 日ずらしている理由
//        （予定を左へ広げるのと、実績の開始を入れるのを掴み分ける）が、そこで
//        失われる」
//   ⭐  「描くインクの起点と同じである（`FR-043`）—— 見える所と掴める所が同じ
//        画素から始まる」
//
// ⚠️ WHY THIS FILE DID NOT EXIST BEFORE. Until 2026-09-02 NO ROW OF docs/spec
// anchored the box. Table T-023d gave the three rows a 場所 and `S-93` gave a
// size, and a size with no origin can be taken to either side of the point --
// so a case written then would have been inventing the ruling rather than
// asserting it. The ruling supplied the origin; these cases are what it bought.
//
// The unit driven is UF-7 `item-hit-area.ts` (`ItemHitArea`, PI-7 of table
// T-064), reached through UF-5 `schedule-layout.ts` and UF-6
// `schedule-geometry.ts`.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   T-023d  the closing rule quoted above, and the printed order in which GR-3
//           stands above GR-9, GR-9 above GR-17, and all of them above GR-12
//   T-023d  GR-3 「予定の開始点 | 予定バーの左端 | `start` を変える」 -- the row
//           that makes the plan bar's left edge the plan start day's column
//           edge, which is how the day columns below are counted without
//           reading a coordinate out of `src/`
//   T-023d  GR-9 「未着手のタスクの上、**予定の開始日の翌稼働日** …」
//   T-023d  GR-17 「`GR-9` の日から `S-129` ぶん進んだ稼働日 …」
//   T-023d  GR-18 「**予定の開始日の翌稼働日** …… ⭐⭐ `GR-9` と同じ場所である」
//           （利用者の裁定 2026-09-02。CR-332）
//   T-206   S-93 「実績のダミーの当たり判定（表 T-023d の `GR-9` / `GR-17` /
//           `GR-18`）| 30 × 20px」 -- read out of the manuscript at run time
//   T-206   S-90 「予定の端点の掴み代 | バーの上下と、端点の左右に 6px」
//   T-201   S-1 `pxPerDayAt1x`, S-75 `zoomX` -- FR-017 makes one day the
//           product of the two
//   T-209   S-106 / S-107, the default calendar 「翌稼働日」 is counted through
//   FR-017  「1 日あたりの表示幅は … `S-1` に `zoomX` を掛けた値とすること」
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//
//   * ⛔ THE VERTICAL. The ruling anchors the horizontal and nothing else:
//     「その日の列の左端を起点に、右へ … `S-93` の幅で取る」 names a left edge
//     and a WIDTH. `S-93` is 30 × 20px, and no row says which pixel the 20px is
//     measured from -- S-180's own note gives the DRAWN dummy its vertical from
//     the actual bar's band, but says outright that S-93 is 「別の値である」 and
//     the band rule is written of the ink. So every press below is made at the
//     dummy's own y, and the y is never the claim. ⚠️ Reported as a gap.
//   * WHICH row answers where a dummy does not. The cases say a press outside
//     the box is not one of the three dummies; they do not say it is GR-12,
//     because table T-023d's order settles the winner among the rows that HOLD
//     and this file is about which rows hold.
//   * The DRAWN ink. 「描くインクの起点と同じである」 is asserted from the ink's
//     side in tests/unit/fr-043-dummy-drawn.test.ts (「日の列の左端に揃えること
//     （MUST）」); this file asserts the same origin from the hit box's side, and
//     the two together are the sentence. ⛔ No case here measures a width of
//     ink and no case there presses a pointer.
//
// ⚠️ WHAT WAS READ OF `src/`: nothing but published declarations -- the types
// and signatures `layoutFromSchedule` / `xFromDay` / `geometryFromLayout` /
// `itemAtPointer` / `PointerSlop` / `NOT_STORED_SIZES` / `regionsFromScreen` /
// `emptySelection` / `dayOf` and the entity types the fixture is built from.
// ⛔ `S-93` IS NOT TAKEN FROM `NOT_STORED_SIZES`: it is read out of
// `_assets/tbl-settings.md` at run time, so that changing the one value in the
// manuscript makes these cases fall (rule 04 section 2).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  dayOf,
  type CalendarDay,
  type Schedule,
  type Task,
  type TaskGroup,
  type TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  NOT_STORED_SIZES,
  itemAtPointer,
  type PointerSlop,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type DummyGeometry,
  type Point,
  type ScheduleGeometry,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  xFromDay,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable } from '../contract/spec-table'

// ===========================================================================
// The rows, read out of the manuscript rather than copied (Chapter 1.9, :275)
// ===========================================================================

const SPEC_DIR = join(process.cwd(), 'docs', 'spec')

/** Chapter 1-4 as written, for the closing rules a table's ROWS do not carry. */
const REQUIREMENTS = readFileSync(join(SPEC_DIR, '01-04-requirements.md'), 'utf8')

const rowOf = (tableId: string, rowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found.by
}

const S_93 = rowOf('T-206', 'S-93')
const S_106 = rowOf('T-209', 'S-106')
const GR_9 = rowOf('T-023d', 'GR-9')
const GR_18 = rowOf('T-023d', 'GR-18')

/** Every number a cell writes, in the order it writes them. */
const numbersOf = (cell: string): number[] => (cell.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

/**
 * `S-93`, as 表 T-206 states it: 「30 × 20px」.
 *
 * ⛔ NOT TYPED IN AND NOT TAKEN FROM `src/`. Rule 04 section 2 asks the
 * acceptance of a value that travels from a manuscript to be "change the one
 * value and watch the case fall", and a number written here would not fall.
 */
const [HIT_WIDTH, HIT_HEIGHT] = ((): readonly [number, number] => {
  const numbers = numbersOf(S_93['既定'] ?? '')
  if (numbers.length !== 2 || numbers[0]! <= 0 || numbers[1]! <= 0) {
    throw new Error(`table T-206 row S-93: the default is not two sizes, it is ${S_93['既定']}`)
  }
  return [numbers[0]!, numbers[1]!] as const
})()

const settingNumber = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

/** `S-1`, the width of one day at 1x (FR-017). */
const PX_PER_DAY_AT_1X = settingNumber('pxPerDayAt1x')

/** `S-129`, how far GR-17 stands past GR-9, in worked days. */
const ACTUAL_INITIAL_DURATION = settingNumber('actualInitialDuration')

/** `S-90`, the reach GR-3 keeps to either side of the plan's end point. */
const PLAN_ENDPOINT_SLOP = NOT_STORED_SIZES['S-90']

/**
 * `zoomX` (`S-75`), chosen so that ONE DAY IS WIDER THAN `S-93`.
 *
 * ⭐ WHY IT HAS TO BE STATED. The anchored box runs `S-93` to the RIGHT of a
 * day column, and GR-17 stands `S-129` days further right; unless a day is
 * wider than the box, the two boxes overlap and "a press past GR-9's right
 * edge" could not be told from "a press inside GR-17". A premise below
 * re-derives the width from the layout rather than trusting this number.
 */
const ZOOM_X = 8

/**
 * The pointer allowances, `S-93` supplied from the MANUSCRIPT.
 *
 * ⚠️ `dummyWidth` is handed the whole of `S-93`'s width, because that is what
 * the ruling gives the box: 「右へ … `S-93` の幅で取る」. ⛔ A caller that halved
 * it would be writing the centred reading the same ruling forbids.
 */
const SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  // `PointerSlop.fadeHandle` is documented as a HALF-width; S-92 is a square.
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  dummyWidth: HIT_WIDTH,
  dummyHeight: HIT_HEIGHT,
  line: NOT_STORED_SIZES['S-137'],
}

// ===========================================================================
// The calendar these cases count through -- S-106 and S-107 of table T-209
// ===========================================================================

const SATURDAY = 6
const SUNDAY = 0

const weekdayOf = (iso: string): number => new Date(`${iso}T00:00:00Z`).getUTCDay()

const isWorkedDay = (iso: string): boolean => {
  const weekday = weekdayOf(iso)
  return weekday !== SATURDAY && weekday !== SUNDAY
}

const dayAfter = (iso: string): string => {
  const next = new Date(`${iso}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

/**
 * `count` worked days on from `iso`, through the default calendar.
 *
 * ⚠️ THE TEST'S OWN ARITHMETIC. `dateFromWorkingDays` exists in `schedule.ts`
 * and is deliberately not called: a test that walked the calendar with the same
 * member the unit walks it with would agree with the unit even when both
 * disagree with S-106.
 */
const workedDaysAfter = (iso: string, count: number): string => {
  let at = iso
  for (let left = count; left > 0; left -= 1) {
    do {
      at = dayAfter(at)
    } while (!isWorkedDay(at))
  }
  return at
}

// ---------------------------------------------------------------------------
// The days. 2026-01-02 is a FRIDAY, so the working-day answer and the
// calendar-day answer are different days and a case cannot pass under both.
// ---------------------------------------------------------------------------

const PLAN_START = '2026-01-02'
const PLAN_FINISH = '2026-01-30'

/** Where GR-9 and GR-18 stand: 「予定の開始日の翌稼働日」. */
const DUMMY_START_DAY = workedDaysAfter(PLAN_START, 1)

/** Where GR-17 stands: 「`GR-9` の日から `S-129` ぶん進んだ稼働日」. */
const DUMMY_END_DAY = workedDaysAfter(DUMMY_START_DAY, ACTUAL_INITIAL_DURATION)

/** A milestone that nobody has started -- table T-023d's GR-18. */
const MILESTONE_DAY = '2026-01-02'

const dayNamed = (iso: string): CalendarDay => {
  const day = dayOf(iso)
  if (day === null) throw new Error(`${iso} is not a day`)
  return day
}

/** EX-7 of table T-033: a day GRS decided itself is written at midnight. */
const stored = (iso: string): string => `${iso}T00:00:00`

// ===========================================================================
// The document under test
// ===========================================================================

/** Expand `SETTINGS_DEFAULTS`' dotted keys into the nested shape the type has. */
const settingsOf = (over: Readonly<Record<string, unknown>> = {}): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries({ ...SETTINGS_DEFAULTS, ...over })) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown>) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return out as unknown as DocumentSettings
}

const settingsAt = (zoomX: number): DocumentSettings =>
  settingsOf({
    scrollDate: stored('2026-01-01'), // S-77, so the day-to-x map has an origin
    scrollGroupId: 'g1', // S-78, so a row is at the top
    stackDirection: 'down', // S-58, so every y reads from the top of the band
    zoomX,
  })

const ENV: ScreenEnvironment = {
  width: 1600,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/** ⚠️ Every nullable column has to be spelled `null`; `undefined` reads as "set". */
const taskOf = (part: Record<string, unknown>): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: null,
    finish: null,
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
    carryElements: [],
    ...part,
  }) as unknown as Task

const visualOf = (part: Record<string, unknown>): TaskVisual =>
  ({
    taskUid: 1,
    nameAnchor: null,
    nameAlign: null,
    shapeKind: null,
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
    ...part,
  }) as unknown as TaskVisual

const groupOf = (part: Record<string, unknown>): TaskGroup =>
  ({
    id: 'g1',
    parentId: null,
    label: 'row',
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
    ...part,
  }) as unknown as TaskGroup

/**
 * ⚠️ NO CALENDAR IS NAMED, which is what sends the document to table T-209's
 * default -- S-106's Monday to Friday, the calendar every day above is counted
 * through. All twelve arrays of the schedule group (DR-2 of table T-052) are
 * present.
 */
const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: {
      title: 'the hit box',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      weekStartDay: null,
      minutesPerDay: null,
      themeHue: 214,
      uidHighWaterMark: 100,
      importSeq: 0,
      revision: 1,
      carry: {},
      carryElements: [],
    },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
    ...part,
  }) as unknown as Schedule

const UNDER_TEST = 1

/** One rectangle Task that nobody has started. FR-043's 「未着手であるあいだ」. */
const notStarted = (): Schedule =>
  scheduleOf({
    tasks: [taskOf({ uid: UNDER_TEST, start: stored(PLAN_START), finish: stored(PLAN_FINISH) })],
    taskGroups: [groupOf({ id: 'g1' })],
    taskGroupMembers: [{ taskUid: UNDER_TEST, groupId: 'g1', stackOrder: null }],
    taskVisuals: [visualOf({ taskUid: UNDER_TEST, shapeKind: 'rectangle' })],
  })

/** A milestone nobody has started -- table T-023d's GR-18. */
const milestone = (): Schedule =>
  scheduleOf({
    tasks: [
      taskOf({
        uid: UNDER_TEST,
        start: stored(MILESTONE_DAY),
        finish: stored(MILESTONE_DAY),
        milestone: true,
      }),
    ],
    taskGroups: [groupOf({ id: 'g1' })],
    taskGroupMembers: [{ taskUid: UNDER_TEST, groupId: 'g1', stackOrder: null }],
    taskVisuals: [
      visualOf({ taskUid: UNDER_TEST, shapeKind: 'milestone', milestoneGlyph: 'diamond' }),
    ],
  })

// ===========================================================================
// Readers
// ===========================================================================

interface Drawn {
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
}

const drawAt = (schedule: Schedule, zoomX: number): Drawn => {
  const settings = settingsAt(zoomX)
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  return {
    layout,
    geometry: geometryFromLayout(schedule, settings, layout, regions, emptySelection()),
  }
}

const draw = (schedule: Schedule): Drawn => drawAt(schedule, ZOOM_X)

const taskDrawn = (drawn: Drawn): TaskGeometry => {
  const found = drawn.geometry.tasks.find((one) => one.taskUid === UNDER_TEST)
  if (found === undefined) throw new Error(`Task ${UNDER_TEST} was not drawn`)
  return found
}

const dummyNamed = (drawn: Drawn, grab: DummyGeometry['grab']): DummyGeometry => {
  const task = taskDrawn(drawn)
  const found = task.dummies.find((one) => one.grab === grab)
  if (found === undefined) {
    const drew = task.dummies.map((one) => one.grab).join(', ')
    throw new Error(`FR-043 draws no ${grab} here; it drew ${drew === '' ? 'nothing' : drew}`)
  }
  return found
}

const grabAt = (drawn: Drawn, x: number, y: number): string | null =>
  itemAtPointer(drawn.geometry, x, y, SLOP)?.grab ?? null

/** The left edge of a day's column, as GR-3 fixes it (see the premise below). */
const xOfDay = (drawn: Drawn, iso: string): number => xFromDay(drawn.layout, dayNamed(iso))

/** The plan bar's left edge -- table T-023d GR-3, 「予定バーの左端」. */
const planLeftOf = (drawn: Drawn): number => {
  const plan = taskDrawn(drawn).plan
  if (plan === null || plan.form !== 'outline') throw new Error('this Task drew no plan bar')
  const points: readonly Point[] = plan.points
  return Math.min(...points.map((one) => one.x))
}

/**
 * A distance small enough to sit inside one grid pixel of an edge.
 *
 * ⭐ Every case below presses just INSIDE and just OUTSIDE an edge the ruling
 * fixes, so what is asserted is where the edge is and not how the unit rounds
 * a press that lands exactly on it -- a question no row of docs/spec answers.
 */
const A_HAIR = 0.5

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the rules and the fixture these cases stand on', () => {
  it('table T-023d still anchors the three dummies at the day column and forbids the centre', () => {
    // ⚠️ A GUARD, NOT THE CLAIM. The sentence is a closing rule of the table
    // rather than a cell of it, so it is read out of the manuscript's text.
    expect(
      REQUIREMENTS,
      'table T-023d no longer anchors the hit box at the day column',
    ).toContain('その日の列の左端を起点に、右へ')
    expect(REQUIREMENTS, 'table T-023d no longer forbids the centred origin').toContain(
      '起点を中心にしてはならない（MUST NOT）',
    )
    // And S-93 is still the width that rule reaches with.
    expect(S_93['値']).toContain('当たり判定')
    for (const row of ['GR-9', 'GR-17', 'GR-18']) expect(S_93['値']).toContain(row)
    expect(HIT_WIDTH).toBeGreaterThan(0)
    expect(HIT_HEIGHT).toBeGreaterThan(0)
  })

  it('table T-023d still stands GR-9 and GR-18 on the working day after the plan start', () => {
    expect(GR_9['場所']).toContain('予定の開始日の翌稼働日')
    // ⭐ CR-332: 「⭐⭐ `GR-9` と同じ場所である」.
    expect(GR_18['場所']).toContain('予定の開始日の翌稼働日')
    expect(cellValueOf(S_106)).toContain('月')
  })

  it('reads the day columns off the plan bar, which is what GR-3 makes them (MUST)', () => {
    // ⭐ THE ONE BRIDGE THIS FILE NEEDS. No row of docs/spec writes the pixel of
    // a day column down, but T-023d's GR-3 puts 予定の開始点 at 予定バーの左端 --
    // so the plan bar's left edge IS the plan start day's column edge, and every
    // column below is counted from it in days. This case pins that reading; if
    // it fell, every measurement here would be against the wrong origin.
    const drawn = draw(notStarted())
    expect(xOfDay(drawn, PLAN_START), 'GR-3: 予定の開始点 | 予定バーの左端').toBeCloseTo(
      planLeftOf(drawn),
      6,
    )
  })

  it('draws one day wider than S-93, so the three boxes cannot overlap one another', () => {
    // FR-017 makes one day `pxPerDayAt1x` times `zoomX` (S-1 and S-75). ⭐ The
    // width is re-derived from the layout rather than trusted from ZOOM_X.
    const { layout } = draw(notStarted())
    expect(layout.pxPerDay).toBeCloseTo(PX_PER_DAY_AT_1X * ZOOM_X, 6)
    expect(
      layout.pxPerDay,
      'a day must be wider than S-93, or GR-9 and GR-17 could not be told apart',
    ).toBeGreaterThan(HIT_WIDTH)
  })

  it('stands the three dummies on the days table T-023d gives them', () => {
    // ⚠️ A GUARD FOR THE PLACE, so that a failure below reads as "the box is in
    // the wrong place" and not as "the dummy is on the wrong day" -- the latter
    // is owned by t-023d-dummy-stands-clear-of-the-plan-start.test.ts.
    const rectangle = draw(notStarted())
    expect(dummyNamed(rectangle, 'GR-9').at.x).toBeCloseTo(xOfDay(rectangle, DUMMY_START_DAY), 6)
    expect(dummyNamed(rectangle, 'GR-17').at.x).toBeCloseTo(xOfDay(rectangle, DUMMY_END_DAY), 6)
    const point = draw(milestone())
    expect(dummyNamed(point, 'GR-18').at.x).toBeCloseTo(xOfDay(point, DUMMY_START_DAY), 6)
  })
})

// ===========================================================================
// ⛔ The ruling of 2026-09-02: the box begins at the day column's left edge
// ===========================================================================

/** The three rows the closing rule names, each with the day it stands on. */
const ANCHORED = [
  { grab: 'GR-9', day: DUMMY_START_DAY, schedule: notStarted },
  { grab: 'GR-17', day: DUMMY_END_DAY, schedule: notStarted },
  { grab: 'GR-18', day: DUMMY_START_DAY, schedule: milestone },
] as const

describe('table T-023d (MUST): the hit box starts at the day column and runs S-93 right', () => {
  for (const { grab, day, schedule } of ANCHORED) {
    it(`${grab}: a press at the day column's left edge is inside the box`, () => {
      // 「その日の列の左端を起点に」 -- the origin itself belongs to the box.
      const drawn = draw(schedule())
      const dummy = dummyNamed(drawn, grab)
      expect(grabAt(drawn, xOfDay(drawn, day) + A_HAIR, dummy.at.y), grab).toBe(grab)
    })

    it(`${grab}: a press a hair inside the RIGHT edge, S-93 along, is still inside`, () => {
      // 「右へ … `S-93` の幅で取る」 -- the far edge is one whole S-93 along.
      const drawn = draw(schedule())
      const dummy = dummyNamed(drawn, grab)
      const rightEdge = xOfDay(drawn, day) + HIT_WIDTH
      expect(grabAt(drawn, rightEdge - A_HAIR, dummy.at.y), grab).toBe(grab)
    })

    it(`⛔ ${grab}: a press just LEFT of the day column is outside the box (MUST NOT centred)`, () => {
      // ⛔ THE MUST NOT, MEASURED AT ITS TIGHTEST. A hair to the left of the
      // origin belongs to no dummy under the anchored reading and to every one
      // of them under the centred one.
      const drawn = draw(schedule())
      const dummy = dummyNamed(drawn, grab)
      expect(grabAt(drawn, xOfDay(drawn, day) - A_HAIR, dummy.at.y), grab).not.toBe(grab)
    })

    it(`⛔ ${grab}: the half-box the CENTRED reading would claim to the left is not this row`, () => {
      // ⛔ RED IF THE BOX IS TAKEN AROUND THE POINT. The centred reading's own
      // left edge is `S-93` / 2 before the day column; a press there is inside
      // that box by construction and outside the anchored one by the ruling.
      const drawn = draw(schedule())
      const dummy = dummyNamed(drawn, grab)
      const centredLeftEdge = xOfDay(drawn, day) - HIT_WIDTH / 2
      expect(grabAt(drawn, centredLeftEdge + A_HAIR, dummy.at.y), grab).not.toBe(grab)
    })

    it(`${grab}: a press past the box's right edge is none of the three dummies`, () => {
      // The width is a width, not a floor. ⚠️ Asserted of ALL THREE rows rather
      // than of this one, so that a box which ran on past `S-93` could not hide
      // behind the next dummy's answer.
      const drawn = draw(schedule())
      const dummy = dummyNamed(drawn, grab)
      const past = grabAt(drawn, xOfDay(drawn, day) + HIT_WIDTH + A_HAIR, dummy.at.y)
      expect(past, grab).not.toBe('GR-9')
      expect(past, grab).not.toBe('GR-17')
      expect(past, grab).not.toBe('GR-18')
    })
  }

  it('⭐ the grab bands of the two handles do not overlap, so each is reachable', () => {
    // 「上の行ほど優先すること（MUST）」 hands an overlap to GR-9, so a box that
    // reached past `S-93` would make GR-17 unreachable rather than fail outright.
    const drawn = draw(notStarted())
    const end = dummyNamed(drawn, 'GR-17')
    expect(grabAt(drawn, xOfDay(drawn, DUMMY_END_DAY) + A_HAIR, end.at.y)).toBe('GR-17')
  })
})

// ===========================================================================
// ⛔ Why the ruling was made: at S-1's own magnification the centre eats left
// ===========================================================================

describe('table T-023d (MUST NOT): at 6px per day the centred box would eat 2.5 days to the left', () => {
  /** `zoomX` = 1, so one day is `S-1` itself -- the magnification the ruling measured at. */
  const AT_S_1 = 1

  it('is the magnification the ruling names, and the centred box really would reach past GR-3', () => {
    // ⚠️ A PREMISE, NOT THE CLAIM. 「⚠️ 実測（2026-09-02、出荷ビルド、6px/日）で
    // 左へ 2.5 日ぶんに当たる」. This case says the fixture reproduces the
    // arithmetic that sentence is about: half of S-93 is more than S-90's reach
    // plus one whole day, so the centred box would cover ground that belongs to
    // no dummy and lies outside GR-3's own allowance.
    const drawn = drawAt(notStarted(), AT_S_1)
    expect(drawn.layout.pxPerDay).toBeCloseTo(PX_PER_DAY_AT_1X, 6)
    expect(HIT_WIDTH / 2 / drawn.layout.pxPerDay, 'S-93 / 2, in days').toBeGreaterThan(2)
    expect(HIT_WIDTH / 2).toBeGreaterThan(drawn.layout.pxPerDay + PLAN_ENDPOINT_SLOP)
  })

  it('⛔ leaves the ground just outside GR-3 to nobody, not to a dummy', () => {
    // ⛔ THE HARM THE RULING NAMES, AS A PRESS. 「中心に取ると左へ食い込み、
    // 予定の開始点（`GR-3`）を飲む …… `FR-043` が掴み代を 1 日ずらしている理由
    // （予定を左へ広げるのと、実績の開始を入れるのを掴み分ける）が、そこで
    // 失われる」. A hand reaching just past GR-3's allowance is reaching to
    // widen the plan leftwards; under the centred reading it takes a dummy and
    // starts an actual instead.
    const drawn = drawAt(notStarted(), AT_S_1)
    const justOutsideGr3 = planLeftOf(drawn) - (PLAN_ENDPOINT_SLOP + 1)
    const dummy = dummyNamed(drawn, 'GR-9')
    const answer = grabAt(drawn, justOutsideGr3, dummy.at.y)
    expect(answer, 'GR-9 reached left of the plan start').not.toBe('GR-9')
    expect(answer, 'GR-17 reached left of the plan start').not.toBe('GR-17')
  })

  it('still answers GR-3 on the plan bar\'s own left end at this magnification', () => {
    // ⭐ THE OTHER HALF, so the case above cannot be met by a picture in which
    // nothing at all is reachable near the plan's start.
    const drawn = drawAt(notStarted(), AT_S_1)
    const dummy = dummyNamed(drawn, 'GR-9')
    expect(grabAt(drawn, planLeftOf(drawn), dummy.at.y)).toBe('GR-3')
  })
})

/** One cell by its heading, so a renamed column fails saying which. */
function cellValueOf(row: Readonly<Record<string, string>>): string {
  const found = row['値']
  if (found === undefined) {
    throw new Error(`this row has no 値 column; it has ${Object.keys(row).join(', ')}`)
  }
  return found
}
