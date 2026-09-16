// DFC-56: telling the plan's start point apart from the actual's dummy.
//
// CR-382 put the dummy back on the plan start day (T-240 DM-1); GR-3 and GR-9
// are told apart by the plan bar's end, outside and inside (T-023d).
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
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   T-023   MK-9a 「掴む対象が重なった | 優先順位を定めること（MUST）—— 掴み
//           領域の全数と優先順位は表 T-023d が持つ。定めないと、同じ場所を押す
//           たびに違うものを掴む」
//   T-023d  「上の行ほど優先すること（MUST）」 and the printed order, in which
//           GR-3 stands above the dummies, GR-17 above GR-9 (swapped by the
//           user's ruling of 2026-09-08), and all of them above GR-12
//   T-023d  GR-3 「予定の開始点 | 予定バーの左端。**掴み代は端の外側だけである**
//           （規則は本表の結びが持つ。値は `_assets/tbl-settings.md` の 表 T-206
//           の `S-90`）| `start` を変える」
//   T-023d  GR-4 「予定の終了点 | 予定バーの右端。**掴み代は端の外側だけである**
//           （規則は本表の結びが持つ。値は `_assets/tbl-settings.md` の 表 T-206
//           の `S-90`）| `finish` を変える」
//           ⚠️ RE-CUT 2026-09-10: until 2026-09-09 both rows carried nothing
//           between the end of the bar and the action column. The sentence
//           they now carry is the one that gives the outside of the end to the
//           plan; nothing in this file reads a side off these two rows.
//   T-023d  GR-7 「進捗マーカー | 実績バーの右端の外側。**未着手のときは終了点
//           の掴みシロの外側**、マイルストーンのときは図形の外側」
//   T-023d  GR-9 / GR-17 / GR-18, the three dummies
//   T-023d  GR-12 「予定バー本体 | 端点を除いた中間」 and the warning under the
//           table, which limits `GR-9` to the left half of the mark `FR-043`
//           draws so that `GR-12` stays reachable on a not-started task
//   FR-054  the one document calendar every day count goes through
//   T-209   S-106 「稼働する曜日 | 月・火・水・木・金」, S-107 「例外日 | 無し」
//   T-201   S-1 `pxPerDayAt1x`, S-75 `zoomX` -- FR-017 makes one day the
//           product of the two, which is how the zoom below is chosen
//   T-206   S-90 「予定の端点の掴み代 | バーの上下と、端点の外側に 12px」
//   T-023d  the closing rule that makes the three dummies' hit area the mark
//           `FR-043` draws, and no wider -- `DummyGeometry.ink` is what the
//           cases below rest on
//   T-206   S-180 「実績のダミーを描く幅」, which caps that mark's width
//   T-221   LF-11, which places the marker off the right end of the bar FR-013
//           names
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//
//   * HOW FAR the not-started marker stands from GR-17. GR-7 says 「終了点の
//     掴みシロの外側」 -- outside the grab allowance -- while LF-11 measures
//     `markerGap` from a BAR'S END. ⚠️ That allowance IS `DummyGeometry.ink`,
//     which is `Math.min(pxPerDay, S-180)` and so moves with the zoom instead
//     of holding still. No row settles which of the two readings applies, so
//     the case
//     below asserts only the RELATION: the marker hangs off GR-17 rather than
//     off the plan's right end, and by the same amount whatever the plan's
//     length. ⚠️ Reported as a gap; not decided here.
//   * The drawn width of the dummy (`S-180`) and its opacity (`S-131`).
//     tests/unit/fr-043-dummy-drawn.test.ts owns both, and nothing here repeats
//     a case of that file.
//   * ⛔ HOW FAR THE HIT AREA REACHES -- table T-023d's closing rule makes it
//     the mark `FR-043` draws, and
//     tests/unit/t-023d-the-hit-box-starts-at-the-day.test.ts owns that.
//     The cases below press a dummy at its own point and ask WHICH row
//     answers; they say nothing about how far the ink itself reaches, and the
//     zoom here is chosen for DFC-56 rather than for that rule.
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
//   - `itemAtPointer`'s row walk and the one line that tests a dummy -- ⛔⛔
//     UNTIL 2026-09-10 this read `PointerSlop.dummyWidth` / `dummyHeight` as a
//     HALF-box around the point, which is what `SLOP` below had to be built to
//     match. `PointerSlop` carries no dummy figure at all now; the row walk
//     tests `DummyGeometry.ink` directly, which is what `SLOP` below no longer
//     needs to match;
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
import { specTable, unbroken } from '../contract/spec-table'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_DISPLAY_RATIO, DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'

const DEFAULT_ROW_NAME_FIXTURE = 'fixture default row name'

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

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const DM_1_ON_THE_PLAN_START_DAY = '**ダミーを描く位置は、予定の開始日とすること（MUST）'
const DM_1_NOT_THE_WORKED_DAY_AFTER = 'ること（MUST）。**⛔ **翌稼働日へずらしてはならない（MUST NOT）'
const DM_12_POSITION_IS_NO_EXCEPTION = '位置は例外ではない | **⛔ 位置は例外ではない（MUST NOT）'
const FR_043_MILESTONE_POSITION_IS_NO_EXCEPTION = '⛔ マイルストーンのダミーの位置を例外にしてはならない（MUST NOT）'
const FR_043_MILESTONE_DUMMY_IS_THE_SAME_DAY_ACTUAL =
  '⭐ その姿は、予定と実績のマイルストーンが同じ日にあるときの絵で、実績をダミーに置き換えたものとすること（MUST）'
const GR_17_PINS_THE_START_ON_THE_PLAN_START_DAY = '終了点を掴んだときは開始点を予定の開始日で確定させること（MUST）'
const FR_043_GR_17_NAMES_THE_DAY =
  '終了点の掴みシロ（表 T-023d の `GR-17`）が指す日は、実績開始日の後に来る稼働日を `S-129` − 1 個数えた日（`FR-011` の床の日であり、既定の `S-129` ＝ 1 では実績開始日と同じ日）とすること（MUST）'

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
 * rather than on where the dummy stands.
 *
 * ⭐ AND WHAT ELSE THE ZOOM HAS TO LEAVE ROOM FOR. Table T-023d's closing rule
 * makes the dummies' hit area the mark `FR-043` draws, and that ink is
 * `Math.min(pxPerDay, S-180)` -- never wider than one day by construction --
 * so no fixed width can overrun a neighbour's day. What the zoom has to leave
 * room for is the ink itself being wide enough to split into two
 * distinguishable halves (GR-9's and GR-17's); the case that measures that
 * re-derives it from the drawn `ink.width` rather than trusting this number.
 */
const ZOOM_X = 6 / DEFAULT_DISPLAY_RATIO

/**
 * ⭐ THE VERTICAL OF THE DUMMIES' HOLD IS STATED NOWHERE HERE, and that is the
 * point: table T-023d's closing rule sends it to the actual bar's band, while
 * `S-180` carries the horizontal alone.
 *
 * ⛔ `PointerSlop` HOLDS NO `dummyHeight`. The hold reads the band off
 * `DummyGeometry.ink`, so a caller states nothing for it and this file cannot
 * state a band the layout does not agree with.
 */
const SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  // `PointerSlop.fadeHandle` is documented as a HALF-width; S-92 is a square.
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  // ⛔ `PointerSlop` carries no dummy figure at all: table T-023d's closing
  // rule has the three dummies answer on the mark `FR-043` draws, and no wider.
  line: NOT_STORED_SIZES['S-137'],
  boxPoint: NOT_STORED_SIZES['S-230'],
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

// see GR-17, FR-043
const DUMMY_END_DAY = workedDaysAfter(PLAN_START, ACTUAL_INITIAL_DURATION - 1)

// see FR-011
const workedDaysFromThrough = (from: string, through: string): number => {
  let count = 0
  for (let at = from; at <= through; at = dayAfter(at)) {
    if (isWorkedDay(at)) count += 1
  }
  return count
}

/**
 * How far the finish handle is pulled out, in worked days from GR-9's own day.
 */
const PULLED_WORKED_DAYS = 4

/** Where the finish handle is let go: `PULLED_WORKED_DAYS` past GR-9's day. */
const PULLED_TO_DAY = workedDaysAfter(PLAN_START, PULLED_WORKED_DAYS)

/** A milestone that has not been started -- table T-023d's GR-18. */
const MILESTONE_DAY = '2026-01-09'

const WORKED_DAY_AFTER_MILESTONE = workedDaysAfter(MILESTONE_DAY, 1)

const MILESTONE_DROPPED_DAY = dayAfter(MILESTONE_DAY)

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
  displayScale: DEFAULT_DISPLAY_SCALE,
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
    stop: null,
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
      title: 'DFC-56',
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
 * ⭐ NOT the plan bar's middle. Table T-023d's closing rule makes the hold
 * `DummyGeometry.ink` and nothing wider. `ink` says the vertical of the drawing
 * belongs to the ACTUAL bar's band, which table T-012 draws inside the plan's
 * for SH-1. Pressing the plan's middle instead would make every case below turn
 * on how far apart those two middles are -- a distance no row of the
 * specification fixes.
 */
const grabOn = (drawn: Drawn, dummy: DummyGeometry): string | null =>
  grabAt(drawn, dummy.at.x, dummy.at.y)

/**
 * A press inside the LEFT half of the one drawn mark -- the half that is
 * GR-9's.
 *
 * ⭐⭐ THE MARK IS CUT DOWN THE MIDDLE SINCE 2026-09-09 (MUST): 「1 つのダミーの
 * 印は、その横幅の中央で左右に割ること（MUST）。左半分を実績の開始側（`GR-9`）、
 * 右半分を実績の終了側（`GR-17`）とすること（MUST）」.
 * ⇒ The half is where the row answers, and it is where a person aims.
 */
const grabOnTheStartHalfOfTheMark = (drawn: Drawn, dummy: DummyGeometry): string | null => {
  const mark = dummy.ink
  expect(mark.width, 'FR-043 draws one mark, so it has a width to halve').toBeGreaterThan(1)
  return grabAt(drawn, mark.x + mark.width / 4, mark.y + mark.height / 2)
}

/** And the RIGHT half, which is GR-17's by the same clause. */
const grabOnTheFinishHalfOfTheMark = (drawn: Drawn, dummy: DummyGeometry): string | null => {
  const mark = dummy.ink
  expect(mark.width, 'FR-043 draws one mark, so it has a width to halve').toBeGreaterThan(1)
  return grabAt(drawn, mark.x + (mark.width * 3) / 4, mark.y + mark.height / 2)
}

const xOfDay = (drawn: Drawn, iso: string): number => xFromDay(drawn.layout, dayNamed(iso))

// ===========================================================================
// EditDocument, for the half of DFC-56 that must NOT move
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
  accepted(editTask(documentOf(schedule), command, DEFAULT_ROW_NAME_FIXTURE))

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
    // that has nothing to do with DFC-56.
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
    // ⛔ THE WIDTH TO OUTRUN IS THE DRAWN INK. Table T-023d's closing rule makes
    // the dummies' allowance `DummyGeometry.ink`, so it is read from the picture
    // rather than from a constant.
    const inkWidth = dummyNamed(taskDrawn(drawn), 'GR-9').ink.width
    expect(
      Math.abs(xOfDay(drawn, WORKED_DAY_AFTER_START) - xOfDay(drawn, CALENDAR_DAY_AFTER_START)),
      'the two readings must be far enough apart that the drawn ink cannot cover both',
    ).toBeGreaterThan(inkWidth)
  })

  it('draws one day wider than S-90, and ink wide enough to split into two halves', () => {
    // FR-017 makes one day `pxPerDayAt1x` times `zoomX` (S-1 and S-75). ⭐ The
    // width is re-derived from the layout rather than trusted from ZOOM_X.
    const { layout } = draw(notStarted())
    expect(layout.pxPerDay).toBeCloseTo(PX_PER_DAY_AT_1X * ZOOM_X * DEFAULT_DISPLAY_RATIO, 6)
    expect(
      layout.pxPerDay,
      'S-90 reaches this far to either side of GR-3, so one day must be wider than it',
    ).toBeGreaterThan(PLAN_ENDPOINT_SLOP)
    // ⛔ WHY THE SECOND ASSERTION IS ABOUT THE INK AND NOT ABOUT THE HOLD.
    // Table T-023d's closing rule makes the dummies' hit area the mark
    // `FR-043` draws, and that ink is `Math.min(pxPerDay, S-180)`. Since the
    // ink can never be wider than one day BY CONSTRUCTION, "one day is wider
    // than the hold" is trivially true and asserting it would test the formula,
    // not the rule. What IS a genuine constraint at this zoom is that the ink
    // is wide enough for its own two halves (GR-9's and GR-17's, split at its
    // own middle) to land on distinguishable pixels -- below 2px the halves
    // would
    // collapse onto the same pixel and MK-9a's grab-apart guarantee would be
    // unmeasurable.
    const ink = dummyNamed(taskDrawn(draw(notStarted())), 'GR-9').ink
    expect(
      ink.width,
      'the drawn ink must be at least 2px wide, so its left and right halves are distinguishable pixels',
    ).toBeGreaterThanOrEqual(2)
  })

  it('prints the dummies above GR-3, GR-17 above GR-9, and all of them above GR-12 (MUST)', () => {
    // 「上の行ほど優先すること（MUST）」. ⭐ Read out of the table, not copied:
    // a list written here would go on passing after the order had been changed,
    // and the order is exactly what DFC-56 turns on.
    // ⚠️ GR-17 AND GR-9 SWAPPED ON 2026-09-08, by the user's ruling 「実績の
    // 開始日と実績の終了日のどちらをつかむか難しいことになるが、実績の終了日を
    // 優先しろ」. The table used to close GR-17's row with 「重なったら開始点
    // が勝つ」 and now says the finish wins. ⭐ THE ASSERTION MOVED WITH THE
    // MANUSCRIPT AND DID NOT WEAKEN: it still demands a total order over the
    // same four rows, only the middle pair is the other way round.
    const at = (row: string): number => {
      const found = T_023D_ORDER.indexOf(row)
      if (found < 0) throw new Error(`table T-023d no longer prints ${row}`)
      return found
    }
    expect(at('GR-17')).toBeLessThan(at('GR-9'))
    expect(at('GR-9')).toBeLessThan(at('GR-3'))
    expect(at('GR-3')).toBeLessThan(at('GR-12'))
    // ⭐ GR-4 fell the same way and for the same clause: a one-day plan puts its
    // finish a day from its start, which is exactly where the dummies stand.
    expect(at('GR-17')).toBeLessThan(at('GR-4'))
    expect(at('GR-4')).toBeLessThan(at('GR-12'))
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

  it('reads the clauses CR-382 rewrote in the manuscript, word for word', () => {
    expect(REQUIREMENTS).toContain(DM_1_ON_THE_PLAN_START_DAY)
    expect(REQUIREMENTS).toContain(DM_1_NOT_THE_WORKED_DAY_AFTER)
    expect(REQUIREMENTS).toContain(DM_12_POSITION_IS_NO_EXCEPTION)
    expect(REQUIREMENTS).toContain(FR_043_MILESTONE_POSITION_IS_NO_EXCEPTION)
    expect(REQUIREMENTS).toContain(FR_043_MILESTONE_DUMMY_IS_THE_SAME_DAY_ACTUAL)
    expect(REQUIREMENTS).toContain(GR_17_PINS_THE_START_ON_THE_PLAN_START_DAY)
    expect(REQUIREMENTS).toContain(FR_043_GR_17_NAMES_THE_DAY)
  })
})

// ===========================================================================
// CR-382 -- where the dummy stands
// ===========================================================================

describe('table T-240 DM-1 / T-023d GR-9 / GR-17 (CR-382): the dummy stands on the plan start day', () => {
  it('puts GR-9 on the plan start day itself, not on the working day after it', () => {
    const drawn = draw(notStarted())
    const start = dummyNamed(taskDrawn(drawn), 'GR-9')
    expect(start.at.x, DM_1_ON_THE_PLAN_START_DAY).toBeCloseTo(xOfDay(drawn, PLAN_START), 6)
    expect(start.at.x, DM_1_NOT_THE_WORKED_DAY_AFTER).not.toBeCloseTo(
      xOfDay(drawn, WORKED_DAY_AFTER_START),
      6,
    )
  })

  it('puts GR-17 on the worked day S-129 - 1 past GR-9, so the dummy is still S-129 long', () => {
    const drawn = draw(notStarted())
    const task = taskDrawn(drawn)
    const start = dummyNamed(task, 'GR-9')
    const end = dummyNamed(task, 'GR-17')
    expect(end.at.x, `${FR_043_GR_17_NAMES_THE_DAY} -- ${DUMMY_END_DAY}`).toBeCloseTo(
      xOfDay(drawn, DUMMY_END_DAY),
      6,
    )
    expect(
      workedDaysFromThrough(PLAN_START, DUMMY_END_DAY),
      'FR-011 counts GR-9 day through GR-17 day as the S-129 of DM-2',
    ).toBe(ACTUAL_INITIAL_DURATION)
    expect(end.at.x - start.at.x).toBeCloseTo(
      xOfDay(drawn, DUMMY_END_DAY) - xOfDay(drawn, PLAN_START),
      6,
    )
    expect(end.at.x, 'not S-129 worked days past GR-9, which would make the actual S-129 + 1 days')
      .not.toBeCloseTo(xOfDay(drawn, workedDaysAfter(PLAN_START, ACTUAL_INITIAL_DURATION)), 6)
    expect(end.at.x).toBeGreaterThanOrEqual(start.at.x)
    expect(
      grabOnTheFinishHalfOfTheMark(drawn, end),
      'TE-3: the day is not the place -- GR-17 holds the right half of the one mark',
    ).toBe('GR-17')
  })

  it('stands the mark inside the plan bar\'s left end, where GR-3 answers only outside it', () => {
    const drawn = draw(notStarted())
    const planLeft = boxOfBar(taskDrawn(drawn).plan).x0
    const start = dummyNamed(taskDrawn(drawn), 'GR-9')
    const middleY = start.ink.y + start.ink.height / 2
    expect(start.ink.x, DM_1_ON_THE_PLAN_START_DAY).toBeGreaterThanOrEqual(planLeft - 1e-6)
    expect(grabAt(drawn, planLeft - SLOP.planEndpoint / 2, middleY)).toBe('GR-3')
    expect(grabOnTheStartHalfOfTheMark(drawn, start)).toBe('GR-9')
  })
})

// ===========================================================================
// ⛔ DFC-56 -- telling the two grab points apart (MK-9a of table T-023)
// ===========================================================================

describe('table T-023 MK-9a: a press on each point answers a different row', () => {
  const drawn = (): Drawn => draw(notStarted())

  it('answers GR-9 on its own band, not GR-3 (MK-9a)', () => {
    // ⛔ RED WHEN THIS WAS WRITTEN. Both rows claimed the same x, and 「上の行ほ
    // ど優先すること（MUST）」 gave it to GR-3 -- so there was no point at all
    // where GR-9 could be reached at its own place, which is what the user
    // reported (DFC-56).
    // ⚠️ THE PRESS MOVED TWICE, THE CLAIM DID NOT. On 2026-09-09 the manuscript
    // first handed every pixel of the one mark to GR-17 and the press moved
    // past the mark; later the same day it cut the mark down the middle
    // instead, and the LEFT half is GR-9's own. What is asked is still that
    // GR-9 can be reached at its own place, and GR-3 must still not answer
    // there.
    const built = drawn()
    const task = taskDrawn(built)
    expect(grabOnTheStartHalfOfTheMark(built, dummyNamed(task, 'GR-9'))).toBe('GR-9')
  })

  // =========================================================================
  // ⭐ DFC-415 -- the one mark answers BOTH ends, split at its own middle
  // =========================================================================
  //
  // ⛔ THE DEFECT. Until 2026-09-09 the manuscript said the whole mark was the
  // finish's; before that the shell drew two marks. Either way a person had one
  // drawing in front of them and no way to read, from the drawing, which end a
  // press would take. The ruling of that day settles it by geometry: 「1 つの
  // ダミーの印は、その横幅の中央で左右に割ること（MUST）」.
  //
  // ⚠️ Measured on the tree this file stands in: 0 of 6 ink pixels answered
  // GR-9 at 6px a day, 0 of 12 at 12.9 and at 27.6 -- the whole mark was the
  // finish's, which is what these two cases now refuse.

  it('DFC-415 ⭐ MUST: the LEFT half of the one mark answers the actual START', () => {
    const built = drawn()
    const mark = dummyNamed(taskDrawn(built), 'GR-9').ink
    expect(mark.width, 'FR-043 draws one mark').toBeGreaterThan(1)
    // ⭐ EVERY pixel of the left half, so a build that gave GR-9 one edge pixel
    // and the finish the rest still fails.
    for (let x = mark.x + 1; x < mark.x + mark.width / 2; x += 1) {
      expect(grabAt(built, x, mark.y + mark.height / 2), `x = ${x - mark.x} into the mark`)
        .toBe('GR-9')
    }
  })

  it('DFC-415 ⭐ MUST: the RIGHT half of the same mark answers the actual FINISH', () => {
    // ⚠️ THE CONTRAST. Without it a build that had simply given the whole mark
    // to GR-9 -- the mirror of the fault -- would pass the case above.
    const built = drawn()
    const mark = dummyNamed(taskDrawn(built), 'GR-9').ink
    for (let x = Math.ceil(mark.x + mark.width / 2) + 1; x <= mark.x + mark.width; x += 1) {
      expect(grabAt(built, x, mark.y + mark.height / 2), `x = ${x - mark.x} into the mark`)
        .toBe('GR-17')
    }
    expect(grabOnTheFinishHalfOfTheMark(built, dummyNamed(taskDrawn(built), 'GR-9')))
      .toBe('GR-17')
  })

  // ⛔⛔ WHAT DFC-415's SECOND HALF ASKS AND WHY NO CASE STANDS FOR IT HERE.
  // Table T-023d's GR-17 row (MUST) wants the finish handle to pin `actualStart`
  // at GR-9's day -- 「掴めば `actualDuration` を置く（`actualStart` は `GR-9` の
  // 日で確定。`FR-043`）」 -- and FR-043 records that the ruling of 2026-09-09
  // ENDED the collision that clause used to have with 「掴んで置く値は、実績開始
  // 日 ＝ 掴みシロを離した日」: 「左半分を掴めば `GR-9` が答え、離した日が実績開始
  // 日になるからである」. ⇒ The two halves of the mark must write DIFFERENT
  // values, and which half was grabbed has to reach the document.
  // ⛔ `EditDocument`'s `beginTaskActual` carries `uid` and `droppedDay` and
  // nothing that says which end was taken, so a case asking for the finish
  // half's value could only be written by inventing a field. ⇒ It is not
  // written. The half that IS reachable -- which row a press on each half of
  // the mark answers -- is the pair of cases above.

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
    // The warning under table T-023d limits `GR-9` to the left half of the mark
    // `FR-043` draws, so that `GR-12` stays reachable on a not-started task.
    // Moving the dummy one day along must not turn into widening it.
    const built = drawn()
    const box = boxOfBar(taskDrawn(built).plan)
    expect(grabAt(built, (box.x0 + box.x1) / 2, middleOf(box))).toBe('GR-12')
  })

  it('leaves neither dummy past its own ink, so nothing answers GR-9 or GR-17 beyond it', () => {
    // The same warning under table T-023d, measured. ⚠️ `GR-17.at.x` is NOT
    // where the ink sits (`schedule-geometry.ts`'s `dummiesOf`: `GR-17.at`
    // names its OWN day, `S-129` worked days past GR-9's, while the shared
    // `ink` this pair draws sits at GR-9's day), so a press anchored on `.at`
    // would measure the wrong point.
    //
    // ⛔ Table T-023d's closing rule leaves no allowance past the ink for
    // EITHER row -- the hit area is the mark and nothing wider. The press below
    // is a hair
    // past the ink's OWN right edge, `end.ink.x + end.ink.width`, which is where
    // that edge actually is regardless of which grab's `.at` is read.
    const built = drawn()
    const end = dummyNamed(taskDrawn(built), 'GR-17')
    const past = grabAt(built, end.ink.x + end.ink.width + 1, end.ink.y + end.ink.height / 2)
    expect(past).not.toBe('GR-9')
    expect(past).not.toBe('GR-17')
  })
})

// ===========================================================================
// FR-043: the VALUE stands where the picture does
// ===========================================================================

describe('FR-043 (MUST): grabbing GR-9 places the day it was let go on, S-129 and resumeValid', () => {
  it('places the actual start on the day the hold was let go on, unmoved', () => {
    const task = taskIn(
      run(notStarted(), {
        kind: 'beginTaskActual',
        uid: UNDER_TEST,
        grabbed: 'GR-9',
        droppedDay: stored(DROPPED_DAY),
      }),
      UNDER_TEST,
    )
    expect(dayOf(task.actualStart), 'FR-043: 実績開始日 ＝ 掴みシロを離した日').toEqual(
      dayNamed(DROPPED_DAY),
    )
    expect(dayOf(task.actualStart), 'T-023d (MUST NOT): 離した日を稼働日へ寄せてはならない')
      .not.toEqual(dayNamed(WORKED_DAY_AFTER_START))
    expect(dayOf(task.actualStart), 'FR-043 (MUST NOT): この 2 つを同じ規則として読んではならない')
      .not.toEqual(dayNamed(PLAN_START))
    expect(dayOf(task.stop)).toEqual(dayNamed(workedDaysAfter(DROPPED_DAY, ACTUAL_INITIAL_DURATION - 1)))
    expect(task.resumeValid).toBe(true)
  })

  it('pins the start at GR-9 の日 from GR-17, and counts the length out to the release', () => {
    // ⛔ WHY THE PRESS IS NOT `grabOn(built, dummyNamed(..., 'GR-17'))`.
    // `grabOn` presses `dummy.at.x` / `.at.y`, and GR-17's OWN `.at.x` is
    // `S-129` worked days PAST GR-9's day (`schedule-geometry.ts`'s
    // `dummiesOf`) -- a different day from the one the shared `ink` is drawn
    // on. The hold IS the ink (表 T-023d の結び), so nothing stands at GR-17's
    // own `.at.x` at all. The press below lands in the RIGHT half of the one
    // drawn mark instead -- GR-17's hold, where the same closing rule splits
    // the mark.
    const built = draw(notStarted())
    expect(grabOnTheFinishHalfOfTheMark(built, dummyNamed(taskDrawn(built), 'GR-17'))).toBe(
      'GR-17',
    )
    const after = taskIn(
      run(notStarted(), {
        kind: 'beginTaskActual',
        uid: UNDER_TEST,
        grabbed: 'GR-17',
        droppedDay: stored(PULLED_TO_DAY),
      }),
      UNDER_TEST,
    )
    expect(dayOf(after.actualStart), GR_17_PINS_THE_START_ON_THE_PLAN_START_DAY)
      .toEqual(dayNamed(PLAN_START))
    expect(dayOf(after.actualStart), DM_1_NOT_THE_WORKED_DAY_AFTER)
      .not.toEqual(dayNamed(WORKED_DAY_AFTER_START))
    expect(dayOf(after.actualStart), 'GR-17 does not write the day the hand let go on')
      .not.toEqual(dayNamed(PULLED_TO_DAY))
    expect(dayOf(after.stop), 'GR-17: the released day is the last day itself')
      .toEqual(dayNamed(PULLED_TO_DAY))
    expect(dayOf(after.stop), 'the right-end reading lands one worked day earlier')
      .not.toEqual(dayNamed(workedDaysAfter(PLAN_START, PULLED_WORKED_DAYS - 1)))
    expect(dayOf(after.stop), 'and it is NOT the floor day, which is GR-9\'s answer')
      .not.toEqual(dayNamed(workedDaysAfter(PLAN_START, ACTUAL_INITIAL_DURATION - 1)))
    expect(after.resumeValid).toBe(true)
  })

  it('⭐ THE CONTRAST: the same release through GR-9 writes the other two values', () => {
    // ⛔ WITHOUT THIS PAIR EITHER ARM COULD ANSWER FOR BOTH. The case above is
    // green over a build that pinned EVERY grab at GR-9's day; this one is green
    // over a build that pinned none. Only both together say the two rows of
    // table T-023d write different columns -- which is the whole reason
    // `TaskCommand.grabbed` exists.
    const after = taskIn(
      run(notStarted(), {
        kind: 'beginTaskActual',
        uid: UNDER_TEST,
        grabbed: 'GR-9',
        droppedDay: stored(PULLED_TO_DAY),
      }),
      UNDER_TEST,
    )
    expect(dayOf(after.actualStart), 'FR-043: 実績開始日 ＝ 掴みシロを離した日')
      .toEqual(dayNamed(PULLED_TO_DAY))
    expect(dayOf(after.actualStart)).not.toEqual(dayNamed(PLAN_START))
    expect(dayOf(after.stop)).toEqual(dayNamed(workedDaysAfter(PULLED_TO_DAY, ACTUAL_INITIAL_DURATION - 1)))
    expect(after.resumeValid).toBe(true)
  })

  it('starts the actual bar where the hand let go, NOT where GR-9 is drawn', () => {
    // ⛔⛔ THE TWO RULES ARE SEPARATE AND THIS IS WHERE THAT IS ASKED. Until
    // 2026-09-02 the write took the day GR-9 is DRAWN on, so the actual bar came
    // out in the same place wherever the hold was let go (ledger DFC-182). FR-043
    // now forbids that reading outright (MUST NOT). Asked as a comparison of
    // two x's rather than of two dates: the bar is drawn where the hand was, and
    // the handle it came from is somewhere else.
    const drawnBefore = draw(notStarted())
    const handleX = dummyNamed(taskDrawn(drawnBefore), 'GR-9').at.x
    const begun = run(notStarted(), {
      kind: 'beginTaskActual',
      grabbed: 'GR-9',
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
      stop: stored(PLAN_START),
      resumeValid: true,
    })
    expect(taskDrawn(draw(started)).dummies).toHaveLength(0)
  })
})

// ===========================================================================
// ⛔ FR-043's milestone exception -- TWO claims since 2026-09-02, and no more
// ===========================================================================

describe('table T-023d GR-18 (CR-382): the milestone\'s dummy stands on the figure\'s own day, where GR-9 would', () => {
  it('draws exactly one dummy, and it is GR-18 (exception ①)', () => {
    // FR-043's first surviving exception: 「実績バーを持たないので（表 T-023d の
    // `GR-15`）、ダミーは点として 1 つだけ出すこと（MUST）」. ⭐ THIS ONE IS A
    // REAL EXCEPTION -- a milestone has no actual bar, so it cannot have two
    // ends -- and the ruling of 2026-09-02 left it standing.
    expect(taskDrawn(draw(milestone())).dummies.map((one) => one.grab)).toEqual(['GR-18'])
  })

  it('stands GR-18 on the plan start day, exactly where GR-9 stands', () => {
    const built = draw(milestone())
    const dummy = dummyNamed(taskDrawn(built), 'GR-18')
    expect(dummy.at.x, DM_12_POSITION_IS_NO_EXCEPTION).toBeCloseTo(xOfDay(built, MILESTONE_DAY), 6)
    expect(dummy.at.x, FR_043_MILESTONE_POSITION_IS_NO_EXCEPTION).not.toBeCloseTo(
      xOfDay(built, WORKED_DAY_AFTER_MILESTONE),
      6,
    )
    expect(grabOn(built, dummy)).toBe('GR-18')
  })

  it('follows the same rule GR-9 does, day for day, on the same plan start', () => {
    const shapeAt = (schedule: Schedule, grab: 'GR-9' | 'GR-18'): number =>
      dummyNamed(taskDrawn(draw(schedule)), grab).at.x
    const asARectangle = notStarted({
      start: stored(MILESTONE_DAY),
      finish: stored(PLAN_FINISH),
    })
    expect(shapeAt(milestone(), 'GR-18')).toBeCloseTo(shapeAt(asARectangle, 'GR-9'), 6)
  })

  it('leaves the FIGURE on the plan day, and the dummy stands in that same day column', () => {
    const built = draw(milestone())
    const task = taskDrawn(built)
    const figure = boxOfBar(task.plan)
    const dayWidth = built.layout.pxPerDay
    const figureDayLeft = xOfDay(built, MILESTONE_DAY)
    const centre = (figure.x0 + figure.x1) / 2
    expect(centre, 'LF-10 centres the figure in the plan start day\'s own column').toBeGreaterThanOrEqual(
      figureDayLeft,
    )
    expect(centre).toBeLessThanOrEqual(figureDayLeft + dayWidth)
    const dummy = dummyNamed(task, 'GR-18')
    expect(dummy.at.x, FR_043_MILESTONE_POSITION_IS_NO_EXCEPTION).toBeGreaterThanOrEqual(figureDayLeft)
    expect(dummy.at.x, FR_043_MILESTONE_POSITION_IS_NO_EXCEPTION).toBeLessThan(figureDayLeft + dayWidth)
  })

  it('places S-130 instead of S-129, because a point has no length (exception ②)', () => {
    // FR-043's second surviving exception: 「実績期間は `S-130` とすること
    // （MUST）」.
    const task = taskIn(
      run(milestone(), {
        kind: 'beginTaskActual',
        grabbed: 'GR-18',
        uid: UNDER_TEST,
        droppedDay: stored(MILESTONE_DROPPED_DAY),
      }),
      UNDER_TEST,
    )
    expect(dayOf(task.stop)).toEqual(dayNamed(MILESTONE_DROPPED_DAY))
    expect(MILESTONE_ACTUAL_DURATION).toBe(0)
    expect(task.resumeValid).toBe(true)
  })

  it('⛔ writes the day the hand let go on -- the POSITION is not an exception (MUST NOT)', () => {
    const task = taskIn(
      run(milestone(), {
        kind: 'beginTaskActual',
        grabbed: 'GR-18',
        uid: UNDER_TEST,
        droppedDay: stored(MILESTONE_DROPPED_DAY),
      }),
      UNDER_TEST,
    )
    expect(dayOf(task.actualStart), 'FR-043: 実績開始日 ＝ 掴みシロを離した日').toEqual(
      dayNamed(MILESTONE_DROPPED_DAY),
    )
    expect(dayOf(task.actualStart), 'FR-043 (MUST NOT): 位置は例外ではない')
      .not.toEqual(dayNamed(MILESTONE_DAY))
    expect(dayOf(task.actualStart), 'T-023d (MUST NOT): 離した日を稼働日へ寄せてはならない')
      .not.toEqual(dayNamed(WORKED_DAY_AFTER_MILESTONE))
  })

  it('answers a different day for a different release, so pulling the hold means something', () => {
    // ⚠️ LEDGER DFC-182, MEASURED ON A MILESTONE. 「実測（2026-09-02、出荷ビルド）:
    // 同じに読んだ実装は ＋3 歩でも ＋8 歩でも同じ日を書いており、掴んで引く意味
    // が消えていた」. A branch that answers the figure's day passes every
    // single-release case that happens to release there; two releases do not.
    const startedOn = (iso: string): CalendarDay | null =>
      dayOf(
        taskIn(
          run(milestone(), {
            kind: 'beginTaskActual',
            grabbed: 'GR-18',
            uid: UNDER_TEST,
            droppedDay: stored(iso),
          }),
          UNDER_TEST,
        ).actualStart,
      )
    const threeAlong = workedDaysAfter(MILESTONE_DAY, 3)
    const eightAlong = workedDaysAfter(MILESTONE_DAY, 8)
    expect(threeAlong).not.toBe(eightAlong)
    expect(startedOn(threeAlong)).toEqual(dayNamed(threeAlong))
    expect(startedOn(eightAlong)).toEqual(dayNamed(eightAlong))
    expect(startedOn(threeAlong)).not.toEqual(startedOn(eightAlong))
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
    // And the constant gap is measured from the dummy, so it travels with DFC-56.
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
    // ⛔⛔ `grabOn(built, dummyNamed(task, 'GR-17'))` STOOD ON THIS LINE UNTIL
    // 2026-09-10. GR-17's own `.at.x` sits `S-129` worked days past GR-9's day
    // (`schedule-geometry.ts`'s `dummiesOf`), off the shared `ink` the closing
    // rule now makes the whole hold (利用者の裁定 2026-09-10) -- so that point
    // now answers GR-7's marker instead. The press below is GR-17's own half of
    // the drawn mark, which is where the ruling of 2026-09-09 put it.
    expect(grabOnTheFinishHalfOfTheMark(built, dummyNamed(task, 'GR-17'))).not.toBe('GR-7')
  })
})
