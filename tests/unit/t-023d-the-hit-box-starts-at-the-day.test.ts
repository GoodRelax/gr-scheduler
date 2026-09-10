// Table T-023d's closing rule: WHERE the hit area of the three dummies is.
//
//   ⭐⭐ 「`GR-9` / `GR-17` / `GR-18` の当たり判定は、`FR-043` が描いた印そのもの
//        とすること（MUST）。印の外へ広げてはならない（MUST NOT）」
//        （利用者の裁定 2026-09-10、逐語「推奨通り案 ①」）
//   ⭐  「`GR-9` と `GR-17` は、その印を中央で左右に割った半分をそれぞれ受け持ち、
//        `GR-18` は印の全体を受け持つ」
//
// ⭐ THE SUBJECT: which pixels the three rows answer on. The cases below press
// against `DummyGeometry.ink` --
// the rectangle ScheduleGeometry DREW -- because 「印そのもの」 is a statement
// about those two units agreeing, and one of them has to be read to say so.
// ⛔ The ink's own width is not asserted here: 「1 日ぶんと `S-180` の小さい方」
// is held from the drawing side, in tests/unit/fr-043-dummy-drawn.test.ts.
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
//   T-023d  GR-3 「予定の開始点 | 予定バーの左端」 -- the row that makes the plan
//           bar's left edge the plan start day's column edge, which is how the
//           day columns below are counted without reading a coordinate out of
//           `src/`
//   T-023d  GR-9 「未着手のタスクの上、**予定の開始日の翌稼働日** …」
//   T-023d  GR-17 「`GR-9` の日から `S-129` ぶん進んだ稼働日 …」
//   T-023d  GR-18 「**予定の開始日の翌稼働日** …… ⭐⭐ `GR-9` と同じ場所である」
//   T-206   S-180 「実績のダミーを描く幅（表 T-023d の `GR-9` / `GR-17` /
//           `GR-18`）」 -- 「本行が描く幅であり、掴みシロでもある」 since the
//           ruling of 2026-09-10
//   T-206   S-90 「予定の端点の掴み代」
//   T-201   S-1 `pxPerDayAt1x`, S-75 `zoomX` -- FR-017 makes one day the
//           product of the two
//   T-209   S-106 / S-107, the default calendar 「翌稼働日」 is counted through
//   FR-017  「1 日あたりの表示幅は … `S-1` に `zoomX` を掛けた値とすること」
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//
//   * ⛔ THE INK'S OWN SIZE. 「1 日ぶんと `S-180` の小さい方」 (bars) and 「その
//     マイルストーンの実績の図形と同じ正方形」 (a milestone) are asserted from
//     the drawing side, in fr-043-dummy-drawn.test.ts and
//     fr-043-b-a-milestone-dummy-box-is-square.test.ts. This file asks only
//     that the HIT AREA is that rectangle and nothing wider.
//   * WHICH row answers where a dummy does not. The cases say a press outside
//     the ink is not one of the three dummies; they do not say it is GR-12,
//     because table T-023d's order settles the winner among the rows that HOLD
//     and this file is about which rows hold.
//
// ⚠️ WHAT WAS READ OF `src/`: nothing but published declarations -- the types
// and signatures `layoutFromSchedule` / `xFromDay` / `geometryFromLayout` /
// `itemAtPointer` / `PointerSlop` / `NOT_STORED_SIZES` / `regionsFromScreen` /
// `emptySelection` / `dayOf` and the entity types the fixture is built from.

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

const S_180 = rowOf('T-206', 'S-180')
const S_106 = rowOf('T-209', 'S-106')
const GR_9 = rowOf('T-023d', 'GR-9')
const GR_18 = rowOf('T-023d', 'GR-18')

/** Every number a cell writes, in the order it writes them. */
const numbersOf = (cell: string): number[] => (cell.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

/**
 * `S-180`'s own number, as 表 T-206 states it -- ⭐⭐ THE WIDTH THE INK IS DRAWN
 * AT, AND THE HOLD WITH IT since the ruling of 2026-09-10: 「本行が描く幅であり、
 * 掴みシロでもある」.
 *
 * ⛔ IT IS A CAP AND NOT THE WIDTH. FR-043 draws 「1 日ぶんと `S-180` の小さい方」,
 * so at a low magnification the ink is one day column and this number never
 * shows. The cases below therefore press against the drawn rectangle rather
 * than against this figure; it is read only to keep the premise honest.
 *
 * ⛔ NOT TYPED IN AND NOT TAKEN FROM `src/`. Rule 04 section 2 asks the
 * acceptance of a value that travels from a manuscript to be "change the one
 * value and watch the case fall", and a number written here would not fall.
 */
const INK_WIDTH_CAP = ((): number => {
  const numbers = numbersOf(S_180['既定'] ?? '')
  if (numbers.length !== 1 || numbers[0]! <= 0) {
    throw new Error(`table T-206 row S-180: the default is not one width, it is ${S_180['既定']}`)
  }
  return numbers[0]!
})()

const settingNumber = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

/**
 * The vertical the hold takes. Table T-023d's closing rule (MUST, 利用者の裁定
 * 2026-09-09) sends it to the actual bar's own band -- 「ダミーの当たり判定の縦幅
 * は、実績の帯に従うこと（MUST）」 -- and the band is `basePlanHeight` (`S-4`)
 * times `actualOfPlan` (`S-5`), which is where these fixtures' one-lane rows
 * stand. ⚠️ Read as a premise only: every press below takes its y from the
 * rectangle that was drawn.
 */
const HIT_HEIGHT = settingNumber('basePlanHeight') * settingNumber('actualOfPlan')

/** `S-1`, the width of one day at 1x (FR-017). */
const PX_PER_DAY_AT_1X = settingNumber('pxPerDayAt1x')

/** `S-129`, how far GR-17 stands past GR-9, in worked days. */
const ACTUAL_INITIAL_DURATION = settingNumber('actualInitialDuration')

/** `S-90`, the reach GR-3 keeps to either side of the plan's end point. */
const PLAN_ENDPOINT_SLOP = NOT_STORED_SIZES['S-90']

/**
 * `zoomX` (`S-75`), chosen so that ONE DAY IS WIDER THAN `S-180`.
 *
 * ⭐ WHY IT HAS TO BE STATED. At this magnification the ink is `S-180` across
 * and a day column is wider still, so the day GR-17 STANDS ON (`S-129` worked
 * days past GR-9's) lies clear of the ink -- which is what lets a case ask
 * whether the hold reaches out to it. A premise below re-derives the width
 * from the layout rather than trusting this number.
 */
const ZOOM_X = 8

/**
 * The pointer allowances.
 *
 * ⛔ THERE IS NO `dummyWidth`: table `T-023d`'s closing rule has the three
 * dummies answer on the ink and on nothing else, so no allowance of their own
 * reaches the hit test.
 */
const SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  // `PointerSlop.fadeHandle` is documented as a HALF-width; S-92 is a square.
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
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
  it('table T-023d makes the hit area the drawn mark, and no longer a box of its own', () => {
    // ⚠️ A GUARD, NOT THE CLAIM. The sentence is a closing rule of the table
    // rather than a cell of it, so it is read out of the manuscript's text.
    expect(
      REQUIREMENTS,
      'table T-023d no longer makes the hit area the drawn mark',
    ).toContain(
      '`GR-9` / `GR-17` / `GR-18` の当たり判定は、`FR-043` が描いた印そのものとすること（MUST）。印の外へ広げてはならない（MUST NOT）',
    )
    // ⛔ AND THE RULE THIS FILE USED TO ASK FOR IS RECORDED AS WITHDRAWN, so a
    // manuscript that quietly put it back fails here rather than silently
    // disagreeing with the cases below.
    expect(REQUIREMENTS).toContain(
      '2026-09-10 まで「`GR-9` / `GR-17` / `GR-18` の当たり判定は、その日の列の左端を起点に、右へ `_assets/tbl-settings.md` の `S-93` の幅で取ること（MUST）」と定め、「起点を中心にしてはならない（MUST NOT）」を添えていた',
    )
    // And S-180 is the row that now carries the one width.
    expect(S_180['値']).toContain('実績のダミーを描く幅')
    for (const row of ['GR-9', 'GR-17', 'GR-18']) expect(S_180['値']).toContain(row)
    expect(INK_WIDTH_CAP).toBeGreaterThan(0)
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

  it('draws a day wider than the ink, so GR-17\'s own day stands clear of it', () => {
    // FR-017 makes one day `pxPerDayAt1x` times `zoomX` (S-1 and S-75). ⭐ The
    // width is re-derived from the layout rather than trusted from ZOOM_X.
    const drawn = draw(notStarted())
    expect(drawn.layout.pxPerDay).toBeCloseTo(PX_PER_DAY_AT_1X * ZOOM_X, 6)
    const ink = dummyNamed(drawn, 'GR-9').ink
    expect(ink.width, 'FR-043 draws 「1 日ぶんと `S-180` の小さい方」')
      .toBeCloseTo(Math.min(drawn.layout.pxPerDay, INK_WIDTH_CAP), 6)
    expect(
      drawn.layout.pxPerDay,
      'a day must be wider than the ink, or GR-17\'s day would fall inside it',
    ).toBeGreaterThan(ink.width)
  })

  it('stands the three dummies on the days table T-023d gives them', () => {
    // ⚠️ A GUARD FOR THE PLACE, so that a failure below reads as "the hold is
    // the wrong shape" and not as "the dummy is on the wrong day" -- the latter
    // is owned by t-023d-dummy-stands-clear-of-the-plan-start.test.ts.
    const rectangle = draw(notStarted())
    expect(dummyNamed(rectangle, 'GR-9').at.x).toBeCloseTo(xOfDay(rectangle, DUMMY_START_DAY), 6)
    expect(dummyNamed(rectangle, 'GR-17').at.x).toBeCloseTo(xOfDay(rectangle, DUMMY_END_DAY), 6)
    const point = draw(milestone())
    expect(dummyNamed(point, 'GR-18').at.x).toBeCloseTo(xOfDay(point, DUMMY_START_DAY), 6)
  })

  it('draws ONE rectangle for the pair, which is what the halving needs', () => {
    // FR-043 (MUST): 「ダミーの印は 1 つだけ描くこと（MUST）。開始の側と終了の側に
    // 別々の印を描いてはならない（MUST NOT）」. ⇒ GR-9 and GR-17 carry the SAME
    // `ink`, and the closing rule cuts THAT rectangle in half.
    const drawn = draw(notStarted())
    const left = dummyNamed(drawn, 'GR-9').ink
    const right = dummyNamed(drawn, 'GR-17').ink
    expect({ x: right.x, width: right.width }).toEqual({ x: left.x, width: left.width })
  })
})

// ===========================================================================
// ⭐⭐ The ruling of 2026-09-10: the hit area IS the drawn mark
// ===========================================================================

/** The three rows the closing rule names, each with the schedule that draws it. */
const ANCHORED = [
  { grab: 'GR-9', schedule: notStarted },
  { grab: 'GR-17', schedule: notStarted },
  { grab: 'GR-18', schedule: milestone },
] as const

describe('table T-023d (MUST): the hit area is the drawn mark itself', () => {
  it('GR-9 answers the LEFT half of the one mark', () => {
    // 「`GR-9` と `GR-17` は、その印を中央で左右に割った半分をそれぞれ受け持ち」.
    const drawn = draw(notStarted())
    const ink = dummyNamed(drawn, 'GR-9').ink
    const middleY = ink.y + ink.height / 2
    expect(grabAt(drawn, ink.x + A_HAIR, middleY)).toBe('GR-9')
    expect(grabAt(drawn, ink.x + ink.width / 2 - A_HAIR, middleY)).toBe('GR-9')
  })

  it('GR-17 answers the RIGHT half of that same mark', () => {
    const drawn = draw(notStarted())
    const ink = dummyNamed(drawn, 'GR-17').ink
    const middleY = ink.y + ink.height / 2
    expect(grabAt(drawn, ink.x + ink.width / 2 + A_HAIR, middleY)).toBe('GR-17')
    expect(grabAt(drawn, ink.x + ink.width - A_HAIR, middleY)).toBe('GR-17')
  })

  it('splits exactly at the ink\'s own middle pixel, where GR-17 wins the tie', () => {
    // ⭐⭐ Both halves are CLOSED intervals (`isOnTheDrawnMarkHalf`: `x <= middle`
    // for the left half, `x >= middle` for the right), so the middle pixel
    // itself is claimed by both -- and table T-023d's own printed order settles
    // it: GR-17 stands above GR-9 (利用者の裁定 2026-09-08, the finish wins
    // where the two dummies' hit tests overlap), so it answers.
    const drawn = draw(notStarted())
    const ink = dummyNamed(drawn, 'GR-9').ink
    const middleY = ink.y + ink.height / 2
    expect(grabAt(drawn, ink.x + ink.width / 2, middleY)).toBe('GR-17')
  })

  it('GR-18 answers the WHOLE of a milestone\'s mark, which is not halved', () => {
    // 「`GR-18` は印の全体を受け持つ」, and 表 T-023d の GR-8 の段: 「下の段の
    // 「印を左右に割る」は、マイルストーンのダミーには当てないこと（MUST NOT）」.
    const drawn = draw(milestone())
    const ink = dummyNamed(drawn, 'GR-18').ink
    const middleY = ink.y + ink.height / 2
    expect(grabAt(drawn, ink.x + A_HAIR, middleY)).toBe('GR-18')
    expect(grabAt(drawn, ink.x + ink.width / 2, middleY)).toBe('GR-18')
    expect(grabAt(drawn, ink.x + ink.width - A_HAIR, middleY)).toBe('GR-18')
  })

  for (const { grab, schedule } of ANCHORED) {
    it(`⛔ ${grab}: a press past the mark's RIGHT edge is none of the three dummies`, () => {
      // ⛔ THE MUST NOT, MEASURED AT ITS TIGHTEST: 「印の外へ広げてはならない」.
      const drawn = draw(schedule())
      const ink = dummyNamed(drawn, grab).ink
      const middleY = ink.y + ink.height / 2
      const past = grabAt(drawn, ink.x + ink.width + A_HAIR, middleY)
      expect(past, grab).not.toBe('GR-9')
      expect(past, grab).not.toBe('GR-17')
      expect(past, grab).not.toBe('GR-18')
    })

    it(`⛔ ${grab}: a press before the mark's LEFT edge is none of the three dummies`, () => {
      const drawn = draw(schedule())
      const ink = dummyNamed(drawn, grab).ink
      const middleY = ink.y + ink.height / 2
      const before = grabAt(drawn, ink.x - A_HAIR, middleY)
      expect(before, grab).not.toBe('GR-9')
      expect(before, grab).not.toBe('GR-17')
      expect(before, grab).not.toBe('GR-18')
    })
  }

  it('⭐⭐ GR-17 does NOT answer on the day it stands on, which is outside the mark', () => {
    // ⭐⭐ THE LEDGER ROW THIS CLOSES (利用者の申し立て 2026-09-10, 逐語「ログ 4 の
    // 操作をすると、意図せず実績が延びる場合がある。 勝手に伸ばすな」). The
    // interaction record's own witness -- the `done` line that follows the press
    // -- read `grab=GR-17` for a press a whole day column right of the mark, and
    // the drag that followed wrote an actual nobody asked for.
    // ⛔ GR-17's own day is `S-129` worked days past GR-9's (`T-023d`), which
    // lies outside the mark. ⇒ With the hold being the ink itself, the row has
    // no pixels out there at all.
    // ⚠️ The day is still where GR-17 STANDS (the case in the premises above
    // asserts that); what changed is that standing there no longer grants a
    // hold there.
    const drawn = draw(notStarted())
    const ink = dummyNamed(drawn, 'GR-17').ink
    const middleY = ink.y + ink.height / 2
    const onItsOwnDay = xOfDay(drawn, DUMMY_END_DAY) + A_HAIR
    expect(onItsOwnDay, 'the day GR-17 stands on is clear of the mark')
      .toBeGreaterThan(ink.x + ink.width)
    const answer = grabAt(drawn, onItsOwnDay, middleY)
    expect(answer, 'GR-17 reached out to its own day').not.toBe('GR-17')
    expect(answer, 'GR-9 reached out to GR-17\'s day').not.toBe('GR-9')
  })

  it('⭐⭐ the plan\'s own end point is reachable on a task the old box would have eaten', () => {
    // ⭐⭐ THE OTHER LEDGER ROW (利用者の申し立て 2026-09-10, 逐語「`*---*` の
    // タスクの予定を変更したいのに、実績だけが変わって予定を変更できない。 予定を
    // 変更可能とせよ」). The rule the plan's end is reachable under is table
    // `T-023d`'s closing rule, with `FR-043` for the mark it names.
    // ⚠️ MEASURED AT `S-1`'s OWN MAGNIFICATION -- a day is `S-1` there.
    const shortPlan = scheduleOf({
      tasks: [
        taskOf({
          uid: UNDER_TEST,
          start: stored(PLAN_START),
          finish: stored(workedDaysAfter(PLAN_START, 2)),
        }),
      ],
      taskGroups: [groupOf({ id: 'g1' })],
      taskGroupMembers: [{ taskUid: UNDER_TEST, groupId: 'g1', stackOrder: null }],
      taskVisuals: [visualOf({ taskUid: UNDER_TEST, shapeKind: 'rectangle' })],
    })
    const drawn = drawAt(shortPlan, 1)
    const ink = dummyNamed(drawn, 'GR-9').ink
    const middleY = ink.y + ink.height / 2
    // ⭐ GR-4's own hold is 「端の外側だけ」 (the closing rule of this table), so
    // the press is made just OUTSIDE the plan bar's right edge -- which is also
    // clear of the mark, and was deep inside the withdrawn box.
    const planRight = Math.max(...planPointsOf(drawn).map((one) => one.x))
    const justOutside = planRight + 1
    expect(justOutside, 'the press is clear of the mark').toBeGreaterThan(ink.x + ink.width)
    expect(justOutside, 'and the withdrawn box would have covered it')
      .toBeLessThan(xOfDay(drawn, DUMMY_END_DAY) + INK_WIDTH_CAP)
    expect(grabAt(drawn, justOutside, middleY)).toBe('GR-4')
  })
})

// ===========================================================================
// ⭐ The plan start is still the fence, and the mark still starts at the day
// ===========================================================================

describe('the mark keeps its own left edge at the day column', () => {
  it('FR-043 aligns the ink to the day column\'s left edge, so the hold begins there', () => {
    // FR-043 (MUST): 「日の列の左端に揃えること（MUST）」. ⭐ The hold now
    // inherits that alignment instead of stating one of its own, which is what
    // 「印そのもの」 means for the left edge.
    const drawn = draw(notStarted())
    expect(dummyNamed(drawn, 'GR-9').ink.x).toBeCloseTo(xOfDay(drawn, DUMMY_START_DAY), 6)
  })

  it('⛔ leaves the ground just outside GR-3 to nobody, not to a dummy', () => {
    // ⛔ A hand reaching just past GR-3's allowance is reaching to widen the
    // plan leftwards; it must not take a dummy and start an actual instead.
    // ⚠️ Measured at `S-1`'s own magnification, the tightest case: one day is
    // 6px there, so the mark and the plan start are a few pixels apart.
    const drawn = drawAt(notStarted(), 1)
    const justOutsideGr3 = planLeftOf(drawn) - (PLAN_ENDPOINT_SLOP + 1)
    const ink = dummyNamed(drawn, 'GR-9').ink
    const answer = grabAt(drawn, justOutsideGr3, ink.y + ink.height / 2)
    expect(answer, 'GR-9 reached left of the plan start').not.toBe('GR-9')
    expect(answer, 'GR-17 reached left of the plan start').not.toBe('GR-17')
  })

  it('still answers GR-3 on the plan bar\'s own left end at that magnification', () => {
    // ⭐ THE OTHER HALF, so the case above cannot be met by a picture in which
    // nothing at all is reachable near the plan's start.
    const drawn = drawAt(notStarted(), 1)
    const ink = dummyNamed(drawn, 'GR-9').ink
    expect(grabAt(drawn, planLeftOf(drawn), ink.y + ink.height / 2)).toBe('GR-3')
  })
})

/** The plan bar's own corners -- table T-023d GR-3 / GR-4. */
function planPointsOf(drawn: Drawn): readonly Point[] {
  const plan = taskDrawn(drawn).plan
  if (plan === null || plan.form !== 'outline') throw new Error('this Task drew no plan bar')
  return plan.points
}

/** One cell by its heading, so a renamed column fails saying which. */
function cellValueOf(row: Readonly<Record<string, string>>): string {
  const found = row['値']
  if (found === undefined) {
    throw new Error(`this row has no 値 column; it has ${Object.keys(row).join(', ')}`)
  }
  return found
}
