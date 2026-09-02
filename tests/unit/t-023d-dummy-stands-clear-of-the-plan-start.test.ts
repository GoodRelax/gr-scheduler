// D-56: telling the plan's start point apart from the actual's dummy.
//
// The user's report of 2026-08-27, in the ledger at
// docs/development-records/defects.md row D-56: with 9/1..9/10 planned and no
// actual recorded, the dummy must stand at 9/2, one day along, so that the
// LEFT of that pair is the plan's start (GR-3, 「予定を左に広げる」) and the
// RIGHT is the actual's start (GR-9, 「実績の開始を入力する」). Standing both
// on the same day is what makes them impossible to tell apart.
//
// The units driven are UF-6 `schedule-geometry.ts` (`ScheduleGeometry`, PI-6 of
// table T-064), UF-7 `item-hit-area.ts` (`ItemHitArea`, PI-7) and UF-11
// `edit-task.ts` reached through `edit-document.ts` (`EditDocument`, PI-9).
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ---------------------------------------------------------------------------
// ⭐ THE ROWS THIS FILE ASKED FOR HAVE SINCE MOVED. WHAT IS LEFT IS RECORDED
// ---------------------------------------------------------------------------
//
// When this file was written, table T-023d still stood GR-9 on 「予定の開始日」
// -- exactly where GR-3 stands -- and this header reported that as a defect of
// the SPECIFICATION as much as of the tree. The rows have since moved:
//
//   T-023d GR-9    「未着手のタスクの上、**予定の開始日の翌稼働日**に 1 日ぶん
//                  （暦に従う。`FR-054`）。⭐ 予定の開始日そのものには置かない
//                  —— そこは `GR-3` が持つ」
//   T-023d GR-17   「`GR-9` の日から `S-129` ぶん進んだ稼働日」
//   FR-043         「ダミーを描く位置は、予定の開始日の翌稼働日とすること
//                  （MUST）」 and ⛔ 「予定の開始日そのものに置いてはならない
//                  （MUST NOT）」（利用者の指示 2026-08-27）
//   FR-043         「掴んで置く値は、実績開始日 ＝ 掴みシロを離した日 …
//                  （MUST）」（利用者の裁定 2026-09-02）and ⛔ 「この 2 つを
//                  同じ規則として読んではならない（MUST NOT）」
//
// ⭐ THE OFFSET IS A WORKING DAY AND THE MANUSCRIPT NOW SAYS SO (「暦に従う。
// `FR-054`」), which is what the fixture was built on a Friday to tell apart --
// `WORKED_DAY_AFTER_START` and `CALENDAR_DAY_AFTER_START` are three days apart
// there, and the cases below name both readings in their failure messages.
//
// ⛔⛔ THE PICTURE AND THE VALUE ARE TWO RULES, AND FR-043 FORBIDS READING THEM
// AS ONE (MUST NOT, 利用者の裁定 2026-09-02). 予定の開始日の翌稼働日 places the
// dummy BEFORE it is grabbed; what is written when it is let go is 掴みシロを
// 離した日. ⚠️ Reading them as one is ledger D-182: measured on the shipped
// build 2026-09-02, a hold carried 3 days along and one carried 8 days along
// wrote the same day, so pulling the hold meant nothing.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   T-023   MK-9a 「掴む対象が重なった | 優先順位を定めること（MUST）—— 掴み
//           領域の全数と優先順位は表 T-023d が持つ。定めないと、同じ場所を押す
//           たびに違うものを掴む」
//   T-023d  「上の行ほど優先すること（MUST）」 and the printed order, in which
//           GR-3 stands above GR-9, GR-9 above GR-17, and all of them above
//           GR-12
//   T-023d  GR-3 「予定の開始点 | 予定バーの左端 | `start` を変える」
//   T-023d  GR-4 「予定の終了点 | 予定バーの右端 | `finish` を変える」
//   T-023d  GR-7 「進捗マーカー | 実績バーの右端の外側。**未着手のときは終了点
//           の掴みシロの外側**、マイルストーンのときは図形の外側」
//   T-023d  GR-9 / GR-17 / GR-18, the three dummies
//   T-023d  GR-12 「予定バー本体 | 端点を除いた中間」 and the warning under the
//           table: 「`GR-9` はタスク全体ではなく `S-93` の大きさに限ること
//           （MUST）—— タスクの上を丸ごと占めると、未着手のタスクで `GR-12` に
//           手が届かなくなる」
//   FR-043  「掴んで置く値は、実績開始日 ＝ 予定の開始日の翌稼働日、実績期間
//           （`actualDuration`）＝ `S-129`、`resumeValid` ＝ `true` とすること
//           （MUST）」, its ⛔ 「予定の開始日そのものに置いてはならない
//           （MUST NOT）」, and its milestone exception, 「ダミーは点として 1 つ
//           だけ出し、実績期間は `S-130` とすること（MUST）」
//   FR-054  the one document calendar every day count goes through
//   T-209   S-106 「稼働する曜日 | 月・火・水・木・金」, S-107 「例外日 | 無し」
//   T-201   S-1 `pxPerDayAt1x`, S-75 `zoomX` -- FR-017 makes one day the
//           product of the two, which is how the zoom below is chosen
//   T-206   S-90 「予定の端点の掴み代 | バーの上下と、端点の左右に 6px」
//   T-206   S-93 「実績のダミーの当たり判定（表 T-023d の `GR-9` / `GR-17` /
//           `GR-18`）」
//   T-221   LF-11, which places the marker off the right end of the bar FR-013
//           names
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//
//   * HOW FAR the not-started marker stands from GR-17. GR-7 says 「終了点の
//     掴みシロの外側」 -- outside the grab ALLOWANCE, which is `S-93` wide --
//     while LF-11 measures `markerGap` from a BAR'S END. The two readings
//     differ by half of S-93 and no row settles which applies, so the case
//     below asserts only the RELATION: the marker hangs off GR-17 rather than
//     off the plan's right end, and by the same amount whatever the plan's
//     length. ⚠️ Reported as a gap; not decided here.
//   * The drawn width of the dummy (`S-180`) and its opacity (`S-131`).
//     tests/unit/fr-043-dummy-drawn.test.ts owns both, and nothing here repeats
//     a case of that file.
//   * ⛔ THE ONE-DAY PLAN, where the fix trades one swallowing for another.
//     A plan whose `start` and `finish` are the same day is drawn at `S-49`'s
//     floor (`minShapeWidth`, 6px) whatever the zoom, so its RIGHT end -- GR-4,
//     which stands above GR-9 in table T-023d -- sits `S-49` px from its left.
//     Move GR-9 one day along and at any zoom where one day is no wider than
//     `S-49` + `S-90` the dummy lands inside GR-4's allowance, and GR-4 takes
//     the press exactly as GR-3 does today. ⚠️ At the DEFAULT zoom one day is
//     `S-1` = 6px, so this is the ordinary case, not a corner. ⭐ REPORTED, NOT
//     ASSERTED: the closing warning D-56 asks for must name GR-4 as well as
//     GR-3, or no row settles which of the two wins there, and a case written
//     here would be inventing the ruling. The fixture below is deliberately
//     zoomed clear of it, so that the cases measure what D-56 is about.
//   * The picture drawn while a dummy is HELD -- table T-023d's 「`GR-9` /
//     `GR-17` / `GR-18` を掴んでいるあいだ、置くことになる実績を描いて示すこと
//     （MUST）」. It lives in the shell's frame loop, not in these three units,
//     and asking it needs the whole `frameLoop` stage. ⭐ It matters to D-56 and
//     is reported as unwritten: the held picture must be the actual FR-043
//     PLACES, which since the 2026-08-27 ruling starts on 予定の開始日の翌稼働日
//     -- the day GR-9 itself is drawn on.
//
// ⚠️ WHAT WAS READ OF `src/`, STATED HONESTLY RATHER THAN CLAIMED AWAY. Head
// comments and exported declarations: `DummyGeometry` / `TaskGeometry` /
// `BarGeometry` / `Point` / `ScheduleGeometry` / `geometryFromLayout`,
// `ScheduleLayout` / `TaskPlacement` / `layoutFromSchedule` / `xFromDay`,
// `Hit` / `GrabArea` / `PointerSlop` / `itemAtPointer` / `NOT_STORED_SIZES`,
// `CalendarDay` / `dayOf` / `textOfDay`, `ScreenEnvironment` /
// `regionsFromScreen`, `emptySelection`, and `editTask` / `EditResult` /
// `Refusal` / `TaskCommand`.
//
// THREE PIECES OF BODY WERE ALSO READ, and they are named here so a reader can
// weigh the cases against that:
//   - `xFromDay`'s two lines, to learn that the axis answers the LEFT edge of a
//     day's column and that `originX` already carries S-177's fraction;
//   - `itemAtPointer`'s row walk and the one line that tests a dummy, to learn
//     that `PointerSlop.dummyWidth` / `dummyHeight` are read as a HALF-box
//     around the point (which is what `SLOP` below has to be built to match);
//   - `frame-loop.ts`'s `PREVIEWED_GRABS`, to learn that the held picture for
//     GR-9 exists at all and that `previewOfHeldPress` is a closure with no
//     seam a unit case could reach -- which is why the held picture is reported
//     above as unwritten rather than merely skipped.
// ⛔ NONE OF THAT SET AN EXPECTED VALUE. It supplied shapes and told the tester
// where the tree stands, which is what lets the ⛔ notes say WHY a case is red
// instead of merely that it is.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
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
  type BarGeometry,
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
import {
  editTask,
  type EditResult,
  type TaskCommand,
} from '../../src/use-case/edit-document/edit-document'
import { specTable } from '../contract/spec-table'

// ===========================================================================
// The rows, read out of the manuscript rather than copied (Chapter 1.9, :275)
// ===========================================================================

const rowOf = (tableId: string, rowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found.by
}

/** One cell by its heading, so a renamed column fails saying which. */
const cellOf = (row: Readonly<Record<string, string>>, heading: string): string => {
  const found = row[heading]
  if (found === undefined) {
    throw new Error(`this row has no ${heading} column; it has ${Object.keys(row).join(', ')}`)
  }
  return found
}

/** Table T-023d in its PRINTED order -- 「上の行ほど優先すること（MUST）」. */
const T_023D_ORDER = specTable('T-023d').rows.map((row) => row.id)

const S_106 = rowOf('T-209', 'S-106')
const S_107 = rowOf('T-209', 'S-107')

/**
 * One generated default read as the number it is. `SETTINGS_DEFAULTS` is
 * published as `Record<string, unknown>`, so a key that stopped being a number
 * fails here instead of reaching arithmetic as `NaN` and leaving a case green.
 */
const settingNumber = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

/** `S-129` -- 「掴みシロを掴んだときに置く実績期間」, in worked days. */
const ACTUAL_INITIAL_DURATION = settingNumber('actualInitialDuration')

/** `S-130` -- a milestone has no length, so its actual period is this. */
const MILESTONE_ACTUAL_DURATION = settingNumber('milestoneActualDuration')

/** `S-1`, the width of one day at 1x (FR-017). */
const PX_PER_DAY_AT_1X = settingNumber('pxPerDayAt1x')

/** `S-90`, the reach GR-3 keeps to either side of the plan's end point. */
const PLAN_ENDPOINT_SLOP = NOT_STORED_SIZES['S-90']

/**
 * `zoomX` (`S-75`), chosen so that ONE DAY is wider than `S-90`.
 *
 * ⭐ WHY THE ZOOM HAS TO BE STATED. At the default `zoomX` of 1 a day is
 * exactly `S-1` = `S-90` px, and the two grab points a day apart would still be
 * within one another's allowance -- the case would then be judged on the zoom
 * rather than on where the dummy stands. A premise below re-derives the width
 * from the layout itself instead of trusting this number.
 */
const ZOOM_X = 5

const SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  // `PointerSlop.fadeHandle` is documented as a HALF-width; S-92 is a square.
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  dummyWidth: NOT_STORED_SIZES['S-93'][0],
  dummyHeight: NOT_STORED_SIZES['S-93'][1],
  line: NOT_STORED_SIZES['S-137'],
}

// ===========================================================================
// The calendar these cases count through -- S-106 and S-107 of table T-209
// ===========================================================================

const SATURDAY = 6
const SUNDAY = 0

const weekdayOf = (iso: string): number => new Date(`${iso}T00:00:00Z`).getUTCDay()

/** S-106: Monday to Friday. S-107: no holidays, so the week is the whole rule. */
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
 * ⚠️ THE TEST'S OWN ARITHMETIC, not the tree's. `dateFromWorkingDays` exists in
 * `schedule.ts` and is deliberately not called: a test that walked the calendar
 * with the same member the unit walks it with would agree with the unit even
 * when both disagree with S-106.
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
// The days. 2026-01-02 is a FRIDAY, which is the whole point of the fixture:
// the working-day answer (Monday the 5th) and the calendar-day answer (Saturday
// the 3rd) are two days apart, so a case cannot pass under both readings.
// ---------------------------------------------------------------------------

const PLAN_START = '2026-01-02'
const PLAN_FINISH = '2026-01-23'

/** What D-56 asks for: the dummy stands here, not on `PLAN_START`. */
const WORKED_DAY_AFTER_START = workedDaysAfter(PLAN_START, 1)

/** The reading FR-043 rejects for the other handle: 「暦日で進めると非稼働日に置く」. */
const CALENDAR_DAY_AFTER_START = dayAfter(PLAN_START)

/**
 * Where the hand let the grab-hold go -- FR-043's 掴みシロを離した日.
 *
 * ⛔ A SATURDAY ON PURPOSE, and it is the same day the DRAWING rule rejects.
 * The closing rule of table T-023d forbids the dropped day being moved to a
 * working one (MUST NOT) -- 「休日に働くことがあり、寄せると人が置いた日と違う
 * 日が入る」 -- so a case that lets go here cannot pass while it is moved, and
 * cannot pass while the day the dummy STANDS on is written instead.
 */
const DROPPED_DAY = CALENDAR_DAY_AFTER_START

/** GR-17: `S-129` worked days past GR-9's day, so the dummy is still that long. */
const DUMMY_END_DAY = workedDaysAfter(WORKED_DAY_AFTER_START, ACTUAL_INITIAL_DURATION)

/** A milestone that has not been started -- table T-023d's GR-18. */
const MILESTONE_DAY = '2026-01-09'

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

const SETTINGS = settingsOf({
  scrollDate: stored('2026-01-01'), // S-77, so the day-to-x map has an origin
  scrollGroupId: 'g1', // S-78, so a row is at the top
  stackDirection: 'down', // S-58, so every y reads from the top of the band
  zoomX: ZOOM_X, // S-75 -- see the note on ZOOM_X
})

const ENV: ScreenEnvironment = {
  width: 1200,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)

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
 * present: a cascade that reads one the fixture forgot would fail for a reason
 * the specification never states.
 */
const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: {
      title: 'D-56',
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
const notStarted = (part: Record<string, unknown> = {}): Schedule =>
  scheduleOf({
    tasks: [
      taskOf({ uid: UNDER_TEST, start: stored(PLAN_START), finish: stored(PLAN_FINISH), ...part }),
    ],
    taskGroups: [groupOf({ id: 'g1' })],
    taskGroupMembers: [{ taskUid: UNDER_TEST, groupId: 'g1', stackOrder: null }],
    taskVisuals: [visualOf({ taskUid: UNDER_TEST, shapeKind: 'rectangle' })],
  })

/** A milestone nobody has started. Table T-023d's GR-18, and FR-043's exception. */
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
    // AT-101's figure is stated rather than defaulted, so what SH-5 draws is
    // one shape whatever the default becomes.
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

const draw = (schedule: Schedule): Drawn => {
  const layout = layoutFromSchedule(schedule, SETTINGS, REGIONS)
  return {
    layout,
    geometry: geometryFromLayout(schedule, SETTINGS, layout, REGIONS, emptySelection()),
  }
}

const taskDrawn = (drawn: Drawn, uid: number = UNDER_TEST): TaskGeometry => {
  const found = drawn.geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} was not drawn`)
  return found
}

const dummyNamed = (task: TaskGeometry, grab: DummyGeometry['grab']): DummyGeometry => {
  const found = task.dummies.find((one) => one.grab === grab)
  if (found === undefined) {
    const drew = task.dummies.map((one) => one.grab).join(', ')
    throw new Error(`FR-043 draws no ${grab} here; it drew ${drew === '' ? 'nothing' : drew}`)
  }
  return found
}

interface Box {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

/**
 * The bounding rectangle of a bar drawn as an area.
 *
 * ⚠️ Throws on the `line` form. Table T-012 gives SH-3 and SH-4 a line with
 * ends rather than an area, and this file's fixture uses SH-1 (rectangle) and
 * SH-5 (milestone) only -- a case that reached the other form would be
 * measuring a shape it was not written for, and says so instead of guessing.
 */
const boxOfBar = (bar: BarGeometry | null): Box => {
  if (bar === null) throw new Error('this Task has no such bar')
  if (bar.form !== 'outline') {
    throw new Error(`this bar is drawn as a ${bar.form}, which these cases do not measure`)
  }
  const points: readonly Point[] = bar.points
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

/** The y a press on the PLAN uses: the middle of the plan bar's own band. */
const middleOf = (box: Box): number => (box.y0 + box.y1) / 2

const grabAt = (drawn: Drawn, x: number, y: number): string | null =>
  itemAtPointer(drawn.geometry, x, y, SLOP)?.grab ?? null

/**
 * A press on a dummy's OWN point -- both axes taken from the picture.
 *
 * ⭐ NOT the plan bar's middle. `S-93` is a box around the dummy's point, and
 * `DummyGeometry.height` says the vertical belongs to the ACTUAL bar's band,
 * which table T-012 draws inside the plan's for SH-1. Pressing the plan's
 * middle instead would make every case below turn on how far apart those two
 * middles are -- a distance no row of the specification fixes.
 */
const grabOn = (drawn: Drawn, dummy: DummyGeometry): string | null =>
  grabAt(drawn, dummy.at.x, dummy.at.y)

const xOfDay = (drawn: Drawn, iso: string): number => xFromDay(drawn.layout, dayNamed(iso))

// ===========================================================================
// EditDocument, for the half of D-56 that must NOT move
// ===========================================================================

const documentOf = (schedule: Schedule): Document =>
  ({
    schemaVersion: '1',
    schedule,
    documentSettings: SETTINGS,
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-27T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-08-27T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const accepted = (result: EditResult): Document => {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.refusals.map((one) => `${one.rule}: ${one.what}`).join('; '))
  return result.document
}

const run = (schedule: Schedule, command: TaskCommand): Document =>
  accepted(editTask(documentOf(schedule), command))

const taskIn = (document: Document, uid: number): Task => {
  const found = document.schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`Task ${uid} left the document`)
  return found
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the fixture stands where these cases think it does', () => {
  it('reads S-106 and S-107 as the Monday-to-Friday calendar the days are counted through', () => {
    // ⚠️ A GUARD, NOT THE CLAIM. `workedDaysAfter` above walks Saturday and
    // Sunday past; if table T-209 stopped saying that, every day constant in
    // this file would be the wrong day and the cases would fail for a reason
    // that has nothing to do with D-56.
    const worked = cellOf(S_106, '値')
    for (const weekday of ['月', '火', '水', '木', '金']) {
      expect(worked, 'table T-209 S-106 no longer names the five weekdays').toContain(weekday)
    }
    for (const weekend of ['土', '日']) {
      expect(worked).not.toContain(weekend)
    }
    expect(
      cellOf(S_107, '値'),
      'table T-209 S-107 no longer says the default calendar is holiday-free',
    ).toContain('無し')
  })

  it('is built on a Friday, so the calendar-day answer and the working-day answer differ', () => {
    // ⭐ THE WHOLE REASON FOR THE DATE. Were the plan to start on a Tuesday the
    // two readings would coincide and the case below would pass under either.
    expect(isWorkedDay(PLAN_START)).toBe(true)
    expect(isWorkedDay(CALENDAR_DAY_AFTER_START)).toBe(false)
    expect(WORKED_DAY_AFTER_START).not.toBe(CALENDAR_DAY_AFTER_START)
    const drawn = draw(notStarted())
    expect(
      Math.abs(xOfDay(drawn, WORKED_DAY_AFTER_START) - xOfDay(drawn, CALENDAR_DAY_AFTER_START)),
      'the two readings must be far enough apart that no allowance covers both',
    ).toBeGreaterThan(SLOP.dummyWidth)
  })

  it('draws one day wider than S-90, so a day apart is more than an allowance apart', () => {
    // FR-017 makes one day `pxPerDayAt1x` times `zoomX` (S-1 and S-75). ⭐ The
    // width is re-derived from the layout rather than trusted from ZOOM_X.
    const { layout } = draw(notStarted())
    expect(layout.pxPerDay).toBeCloseTo(PX_PER_DAY_AT_1X * ZOOM_X, 6)
    expect(
      layout.pxPerDay,
      'S-90 reaches this far to either side of GR-3, so one day must be wider than it',
    ).toBeGreaterThan(PLAN_ENDPOINT_SLOP)
  })

  it('prints GR-3 above GR-9, GR-9 above GR-17, and all three above GR-12 (MUST)', () => {
    // 「上の行ほど優先すること（MUST）」. ⭐ Read out of the table, not copied:
    // a list written here would go on passing after the order had been changed,
    // and the order is exactly what D-56 turns on.
    const at = (row: string): number => {
      const found = T_023D_ORDER.indexOf(row)
      if (found < 0) throw new Error(`table T-023d no longer prints ${row}`)
      return found
    }
    expect(at('GR-3')).toBeLessThan(at('GR-9'))
    expect(at('GR-9')).toBeLessThan(at('GR-17'))
    expect(at('GR-17')).toBeLessThan(at('GR-12'))
    // GR-4 is the row that wins for a one-day plan, where the plan's two ends
    // are a day apart and GR-4 stands above every dummy as well.
    expect(at('GR-4')).toBeLessThan(at('GR-9'))
  })

  it('carries an S-129 of at least one worked day, which the dummy\'s length assumes', () => {
    // S-129's own remark: 「**1 日で終わる業務も 1 日ぶん入力する**ので 1。0 に
    // すると幅が 0 になる」. ⚠️ A GUARD: the case that asserts GR-17 stands to
    // the RIGHT of GR-9 is only meaningful while the placed period has a length,
    // and S-129's lower bound in table T-201 is 0.
    expect(Number.isInteger(ACTUAL_INITIAL_DURATION)).toBe(true)
    expect(ACTUAL_INITIAL_DURATION).toBeGreaterThan(0)
  })

  it('draws the two dummies FR-043 asks for, and no more (MUST)', () => {
    // 「実績の入力を始める掴みシロを **2 つ**（マイルストーンは例外とする）」.
    expect(taskDrawn(draw(notStarted())).dummies.map((one) => one.grab)).toEqual(['GR-9', 'GR-17'])
  })
})

// ===========================================================================
// ⛔ D-56 -- where the dummy stands
// ===========================================================================

describe('table T-023d GR-9 / GR-17 (D-56): the dummy stands one working day along', () => {
  it('puts GR-9 on the working day AFTER the plan start, not on the plan start itself', () => {
    // ⛔ RED, AND FOR TWO REASONS. Table T-023d GR-9 still reads 「未着手の
    // タスクの上、予定の開始日」, so the tree draws it on the plan's own start
    // day -- where GR-3 already stands. D-56 (2026-08-27): 「9/2〜9/2 で実績の
    // ダミーが表示され、これをつかめるはず。1 日ずらしてあるのは予定を左に
    // 広げるのと実績の開始を入力するので掴み点を組み分けるためだ」.
    const drawn = draw(notStarted())
    const start = dummyNamed(taskDrawn(drawn), 'GR-9')
    expect(
      start.at.x,
      `GR-9 must stand on ${WORKED_DAY_AFTER_START} (the working day after ${PLAN_START}), ` +
        `not on ${PLAN_START} and not on ${CALENDAR_DAY_AFTER_START} -- ` +
        'the calendar reading is FR-054\'s, and FR-043 already refuses a handle on a day nobody works',
    ).toBeCloseTo(xOfDay(drawn, WORKED_DAY_AFTER_START), 6)
  })

  it('puts GR-17 S-129 working days past GR-9, so the dummy is still S-129 long', () => {
    // ⛔ RED WITH THE ROW ABOVE. FR-043 :2015 still bases the end handle on the
    // PLAN's start day rather than on GR-9's day, so the pair does not travel
    // together. ⭐ The length is what must NOT change: FR-043 places
    // `actualDuration` = `S-129`, and the picture has to be that long.
    const drawn = draw(notStarted())
    const task = taskDrawn(drawn)
    const start = dummyNamed(task, 'GR-9')
    const end = dummyNamed(task, 'GR-17')
    expect(end.at.x, `GR-17 must stand on ${DUMMY_END_DAY}`).toBeCloseTo(
      xOfDay(drawn, DUMMY_END_DAY),
      6,
    )
    // Stated a second way, so a change of S-129 is visible here as a length and
    // not only as a day: the span of the two handles IS the placed duration.
    expect(end.at.x - start.at.x).toBeCloseTo(
      xOfDay(drawn, DUMMY_END_DAY) - xOfDay(drawn, WORKED_DAY_AFTER_START),
      6,
    )
    expect(end.at.x).toBeGreaterThan(start.at.x)
  })

  it('leaves GR-9 far enough from GR-3 that S-90 cannot reach it', () => {
    // ⭐ THIS IS THE USER'S COMPLAINT AS A NUMBER. S-90 is 「バーの上下と、端点
    // の左右に」 an allowance; while GR-9 shares GR-3's day the allowance covers
    // it entirely, and GR-3 stands above GR-9 in table T-023d.
    const drawn = draw(notStarted())
    const planLeft = boxOfBar(taskDrawn(drawn).plan).x0
    const start = dummyNamed(taskDrawn(drawn), 'GR-9')
    expect(start.at.x - planLeft).toBeGreaterThan(SLOP.planEndpoint)
  })
})

// ===========================================================================
// ⛔ D-56 -- telling the two grab points apart (MK-9a of table T-023)
// ===========================================================================

describe('table T-023 MK-9a: a press on each point answers a different row', () => {
  const drawn = (): Drawn => draw(notStarted())

  it('answers GR-9 at the dummy\'s own point, not GR-3 (MK-9a)', () => {
    // ⛔ RED TODAY. Both rows claim the same x, and 「上の行ほど優先すること
    // （MUST）」 gives it to GR-3 -- so there is no point at all where GR-9 can
    // be reached at its own place, which is what the user reported.
    const built = drawn()
    const task = taskDrawn(built)
    expect(grabOn(built, dummyNamed(task, 'GR-9'))).toBe('GR-9')
  })

  it('still answers GR-3 on the plan bar\'s left end -- the other half of the pair', () => {
    // ⭐ THE CASE THAT MUST NOT REGRESS. 「実績開始部の左側が予定、右側がダミー
    // の実績として掴めるはず」: moving the dummy is only half of what was asked,
    // and widening the plan to the left has to keep working.
    const built = drawn()
    const task = taskDrawn(built)
    const box = boxOfBar(task.plan)
    expect(grabAt(built, box.x0, middleOf(box))).toBe('GR-3')
  })

  it('still answers GR-4 on the plan bar\'s right end', () => {
    const built = drawn()
    const box = boxOfBar(taskDrawn(built).plan)
    expect(grabAt(built, box.x1, middleOf(box))).toBe('GR-4')
  })

  it('still answers GR-12 in the plan bar\'s middle (the warning under table T-023d)', () => {
    // 「`GR-9` はタスク全体ではなく `S-93` の大きさに限ること（MUST）—— タスク
    // の上を丸ごと占めると、未着手のタスクで `GR-12`（予定バー本体の平行移動と
    // 行の載せ替え）に手が届かなくなる」. Moving the dummy one day along must
    // not turn into widening it.
    const built = drawn()
    const box = boxOfBar(taskDrawn(built).plan)
    expect(grabAt(built, (box.x0 + box.x1) / 2, middleOf(box))).toBe('GR-12')
  })

  it('leaves the dummy no wider than S-93, so GR-12 begins again just past it', () => {
    // The same warning, measured. A point one whole S-93 to the right of GR-17
    // is past both dummies' allowances, and nothing above GR-12 stands there.
    const built = drawn()
    const end = dummyNamed(taskDrawn(built), 'GR-17')
    const past = grabAt(built, end.at.x + SLOP.dummyWidth, end.at.y)
    expect(past).not.toBe('GR-9')
    expect(past).not.toBe('GR-17')
  })
})

// ===========================================================================
// FR-043: the VALUE stands where the picture does
// ===========================================================================

describe('FR-043 (MUST): grabbing GR-9 places the day it was let go on, S-129 and resumeValid', () => {
  it('places the actual start on the day the hold was let go on, unmoved', () => {
    // ⭐ THE ASSERTION D-182 TURNS ON. 「掴んで置く値は、実績開始日 ＝ 掴みシロ
    // を離した日、実績期間（`actualDuration`）＝ `S-129`、`resumeValid` ＝
    // `true` とすること（MUST）」（利用者の裁定 2026-09-02）, with ⛔ 「離した日
    // を稼働日へ寄せてはならない（MUST NOT）」 under table T-023d and ⛔ 「この
    // 2 つを同じ規則として読んではならない（MUST NOT）」 beside it.
    // ⚠️ `DROPPED_DAY` IS A SATURDAY, so the two readings the rule forbids are
    // each a different day from the answer: moving it to a working day gives
    // `WORKED_DAY_AFTER_START`, and reading the drawing rule as the value gives
    // the same. Neither can pass here.
    const task = taskIn(
      run(notStarted(), { kind: 'beginTaskActual', uid: UNDER_TEST, droppedDay: stored(DROPPED_DAY) }),
      UNDER_TEST,
    )
    expect(dayOf(task.actualStart), 'FR-043: 実績開始日 ＝ 掴みシロを離した日').toEqual(
      dayNamed(DROPPED_DAY),
    )
    expect(dayOf(task.actualStart), 'T-023d (MUST NOT): 離した日を稼働日へ寄せてはならない')
      .not.toEqual(dayNamed(WORKED_DAY_AFTER_START))
    expect(dayOf(task.actualStart), 'FR-043 (MUST NOT): 予定の開始日そのものに置いてはならない')
      .not.toEqual(dayNamed(PLAN_START))
    expect(task.actualDuration).toBe(ACTUAL_INITIAL_DURATION)
    expect(task.resumeValid).toBe(true)
  })

  it('places the same three values from GR-17, because one end is never decided alone', () => {
    // 「開始点を掴んだときは終了点をその既定の位置で、終了点を掴んだときは開始点
    // を … 確定させること（MUST）—— 片端だけが決まった状態を作らない」. Both
    // handles route to one placement, so the document cannot tell which was
    // grabbed -- and neither can this case, which is the point.
    const built = draw(notStarted())
    expect(grabOn(built, dummyNamed(taskDrawn(built), 'GR-17'))).toBe('GR-17')
    const after = taskIn(
      run(notStarted(), { kind: 'beginTaskActual', uid: UNDER_TEST, droppedDay: stored(DROPPED_DAY) }),
      UNDER_TEST,
    )
    expect(dayOf(after.actualStart)).toEqual(dayNamed(DROPPED_DAY))
    expect(after.actualDuration).toBe(ACTUAL_INITIAL_DURATION)
  })

  it('starts the actual bar where the hand let go, NOT where GR-9 is drawn', () => {
    // ⛔⛔ THE TWO RULES ARE SEPARATE AND THIS IS WHERE THAT IS ASKED. Until
    // 2026-09-02 the write took the day GR-9 is DRAWN on, so the actual bar came
    // out in the same place wherever the hold was let go (ledger D-182). FR-043
    // now forbids that reading outright (MUST NOT). Asked as a comparison of
    // two x's rather than of two dates: the bar is drawn where the hand was, and
    // the handle it came from is somewhere else.
    const drawnBefore = draw(notStarted())
    const handleX = dummyNamed(taskDrawn(drawnBefore), 'GR-9').at.x
    const begun = run(notStarted(), {
      kind: 'beginTaskActual',
      uid: UNDER_TEST,
      droppedDay: stored(DROPPED_DAY),
    })
    const actualStart = taskIn(begun, UNDER_TEST).actualStart
    expect(actualStart).not.toBeNull()
    expect(xOfDay(drawnBefore, actualStart as string)).toBe(xOfDay(drawnBefore, DROPPED_DAY))
    expect(xOfDay(drawnBefore, actualStart as string)).not.toBe(handleX)
  })

  it('draws no dummy at all once an actual is recorded (FR-043 shows them while not started)', () => {
    const started = notStarted({
      actualStart: stored(PLAN_START),
      actualDuration: ACTUAL_INITIAL_DURATION,
      resumeValid: true,
    })
    expect(taskDrawn(draw(started)).dummies).toHaveLength(0)
  })
})

// ===========================================================================
// FR-043's milestone exception, and table T-023d's GR-18 -- unchanged
// ===========================================================================

describe('table T-023d GR-18: a milestone keeps its one dummy on its figure', () => {
  it('draws exactly one dummy, and it is GR-18', () => {
    // FR-043's milestone exception: 「ダミーは点として 1 つだけ出し、実績期間は
    // `S-130` とすること（MUST）」.
    expect(taskDrawn(draw(milestone())).dummies.map((one) => one.grab)).toEqual(['GR-18'])
  })

  it('stands it ON the figure, so no day offset reaches it', () => {
    // 「未着手のマイルストーンの図形の上」. ⭐ GR-18 has no competitor: a
    // milestone has no plan ENDS for GR-3 or GR-4 to claim (LF-10 draws a figure
    // centred on the day), so nothing about D-56 moves this row.
    const built = draw(milestone())
    const task = taskDrawn(built)
    const figure = boxOfBar(task.plan)
    const dummy = dummyNamed(task, 'GR-18')
    expect(dummy.at.x).toBeGreaterThanOrEqual(figure.x0)
    expect(dummy.at.x).toBeLessThanOrEqual(figure.x1)
    expect(dummy.at.y).toBeGreaterThanOrEqual(figure.y0)
    expect(dummy.at.y).toBeLessThanOrEqual(figure.y1)
    expect(grabOn(built, dummy)).toBe('GR-18')
  })

  it('places S-130 instead of S-129, because a point has no length (MUST)', () => {
    // ⭐ AND IT KEEPS THE FIGURE'S OWN DAY, whatever day the hand let go on:
    // FR-043 makes the milestone 例外 and sends its 「位置と当たり判定」 to
    // GR-18, whose place is 「未着手のマイルストーンの図形の上」.
    const task = taskIn(
      run(milestone(), { kind: 'beginTaskActual', uid: UNDER_TEST, droppedDay: stored(DROPPED_DAY) }),
      UNDER_TEST,
    )
    expect(dayOf(task.actualStart)).toEqual(dayNamed(MILESTONE_DAY))
    expect(task.actualDuration).toBe(MILESTONE_ACTUAL_DURATION)
    expect(task.resumeValid).toBe(true)
  })
})

// ===========================================================================
// Table T-023d GR-7: the not-started marker follows GR-17, wherever it stands
// ===========================================================================

describe('table T-023d GR-7: the not-started marker hangs off GR-17, not off the plan', () => {
  it('stands outside GR-17 and moves with it', () => {
    // 「進捗マーカー | 実績バーの右端の外側。**未着手のときは終了点の掴みシロの
    // 外側**」. ⛔ HOW FAR outside is not asserted -- see the header. What is
    // asserted is that it is outside, and that it tracks the dummy.
    const built = draw(notStarted())
    const task = taskDrawn(built)
    const marker = task.marker
    expect(marker, 'FR-013 draws a marker on a Task nobody has started (PM-1a)').not.toBeNull()
    expect(marker!.centre.x).toBeGreaterThan(dummyNamed(task, 'GR-17').at.x)
  })

  it('does not follow the plan\'s right end: two plans of different length share a marker x', () => {
    // ⭐ THE CLEANEST STATEMENT OF GR-7'S 未着手 CLAUSE. GR-17 depends on the
    // plan's START alone, so two Tasks that start on the same day and end on
    // different ones must put their markers at the same x. A marker hung off
    // the plan's right end would put them a fortnight apart.
    const short = draw(notStarted({ finish: stored('2026-01-09') }))
    const long = draw(notStarted())
    const shortTask = taskDrawn(short)
    const longTask = taskDrawn(long)
    expect(boxOfBar(shortTask.plan).x1).not.toBeCloseTo(boxOfBar(longTask.plan).x1, 6)
    expect(shortTask.marker!.centre.x).toBeCloseTo(longTask.marker!.centre.x, 6)
    // And the constant gap is measured from the dummy, so it travels with D-56.
    expect(shortTask.marker!.centre.x - dummyNamed(shortTask, 'GR-17').at.x).toBeCloseTo(
      longTask.marker!.centre.x - dummyNamed(longTask, 'GR-17').at.x,
      6,
    )
  })

  it('keeps the marker clear of the two dummies, so GR-7 does not swallow them', () => {
    // MK-9a again: GR-7 is printed ABOVE GR-9 and GR-17, so a marker drawn on
    // top of either would take the press that belongs to the dummy.
    const built = draw(notStarted())
    const task = taskDrawn(built)
    expect(grabOn(built, dummyNamed(task, 'GR-9'))).not.toBe('GR-7')
    expect(grabOn(built, dummyNamed(task, 'GR-17'))).not.toBe('GR-7')
  })
})
