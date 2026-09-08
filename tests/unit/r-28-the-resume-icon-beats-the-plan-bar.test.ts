// The four rulings of 2026-09-09 (R-27, R-28, R-29, R-30 of
// docs/development-records/rulings.md), and the fourteen MUST / MUST NOT
// clauses they wrote into docs/spec/01-04-requirements.md.
//
// ⛔ NOT A NEW SUITE and not a hunt for defects: rule 04 section 3.5 admits a
// unit case only as a 戻り止め for something already measured. What is measured
// here is R-28 -- the resume icon beating the plan bar's body, and the middle
// it takes having no ceiling. The other three rulings are QUOTED and NOT
// pressed, and the reason for each is written out below beside its own
// measurement, so that a reader can tell a clause nothing holds from a clause
// this file holds.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ---------------------------------------------------------------------------
// THE CLAUSES, VERBATIM -- R-28, WHICH THE CASES BELOW PRESS
// ---------------------------------------------------------------------------
//
// Table T-023d's closing paragraph, docs/spec/01-04-requirements.md:
//
//   1 「再開アイコン（`GR-8`）は、予定バー本体（`GR-12`）に優先すること（MUST）
//   2 「`GR-8` の当たり判定（`_assets/tbl-settings.md` の 表 T-206 の `S-93`）が予定バー本体の中間を奪うときも、`GR-8` が勝つこと（MUST）
//   3 「`GR-8` の当たり判定（`_assets/tbl-settings.md` の 表 T-206 の `S-93`）が予定バー本体の中間を奪うときも、`GR-8` が勝つこと（MUST）。奪う量に上限を設けてはならない（MUST NOT）
//   4 「`GR-8` は `GR-12` より上に在り、1 文字も動かしていない。**⛔ **順を根拠に上限を導いてはならない（MUST NOT）
//
// ⭐ THE FOURTH IS A RULE ABOUT READING THE TABLE, not about a press: the
// printed order settles which row answers where two rows both claim a point,
// and says nothing about HOW MUCH one may take from the other. The case that
// presses the third clause is what shows the tree reads it that way -- the span
// GR-8 takes grows with `S-93` and stops at no ceiling of its own.
//
// ---------------------------------------------------------------------------
// ⛔⛔ WHAT THIS FILE CATCHES, MEASURED BY BREAKING THE SPECIFICATION
// ---------------------------------------------------------------------------
//
// ⚠️ THREE REVERSALS WERE RUN ON 2026-09-09 and the specification was put back
// with `git checkout -- docs/spec/` after each. The numbers are what the runs
// printed, not what was expected of them.
//
//   1 R-27 reversed in place -- 「掴みシロの幅」 and 「描いた印の幅」 swapped, so
//     the rule says the opposite of the ruling, the 逐語 left standing.
//     ⇒ `npx vitest run`: 191 files, 7327 passed, ZERO red.
//     ⇒ check 39: FAIL, 977 -> 979 unheld, because the two clauses this file
//       quotes stopped matching the manuscript.
//   2 R-28 reversed in place -- 「`GR-8` が勝つ」 and the priority sentence
//     turned round to name `GR-12` as the winner.
//     ⇒ `npx vitest run`: ZERO red, again.
//     ⇒ check 39: FAIL, 977 -> 979 unheld, for the same reason.
//   3 The ROWS of table T-023d swapped, `GR-12` printed above `GR-8`.
//     ⇒ `npx vitest run`: 4 files, 5 cases red -- TWO of them in this file.
//
// ⛔⛔ SO SAY IT PLAINLY: a case that presses the build cannot tell whether the
// PROSE of the ruling was turned round, and this file does not make it able to.
// What the quotations buy is check 39: the words are now tied down in a second
// place, so a silent rewrite of them stops the checks rather than passing them.
// ⭐ What the cases buy is the third reversal: the priority is read out of the
// table's printed order at run time (`higherOf` below), so a manuscript whose
// order moves while the tree stands still turns this file red. ⇒ The half that
// is machine-checkable is the half that is written as a TABLE; the half written
// as prose is held by its words alone.
//
// ---------------------------------------------------------------------------
// THE CLAUSES, VERBATIM -- R-27, R-29 AND R-30, WHICH THIS FILE ONLY HOLDS
// ---------------------------------------------------------------------------
//
// R-27, in table T-038's ordering paragraph:
//
//   5 「本並びで数える幅は、掴みシロを持つものについてはその掴みシロの幅とすること（MUST）
//   6 「本並びで数える幅は、掴みシロを持つものについてはその掴みシロの幅とすること（MUST）。描いた印の幅で数えてはならない（MUST NOT）
//   7 「本規則は占有幅の算入（すぐ上の表）を動かさない** —— **`OC-3` と `OC-4` の「算入してはならない（MUST NOT）
//
// ⛔ MEASURED HERE, 2026-09-09, and the tree does not obey it. On a Task
// nobody has started, drawn at `zoomX` 6 (one day 36px) with the fixture this
// file already builds: `GR-17`'s dummy stands at x=416 and its `S-93` grab box
// runs to x=446, while the progress marker's circle is centred at x=428 with
// radius 8 -- so the marker covers x=420..436 and leaves the dummy's box FOUR
// PIXELS of its own. A press at x=421 answers `GR-7`, the marker, not the
// dummy. ⭐ That is the requirement's own 実測 reproduced to the pixel: 「マー
// カーの円がダミーの箱の先頭 4px を残してどの倍率でも覆い、ダミーには先頭の 4px
// しか残らなかった」. ⛔ A case pressing clause 5 or 6 would be RED, and rule 04
// section 3.5 does not admit a unit case written for a rule the tree has not
// been given yet, so none is written and the measurement stands here instead.
//
// R-29, in the same table's paragraph about which end of an actual is grabbed:
//
//   8 「描かれたダミーの印の画素も、同じく終了側（`GR-17`）を掴むこと（MUST）
//   9 「その 1 つの印のどの画素を押しても `GR-17` を掴むこと（MUST）
//  10 「その 1 つの印のどの画素を押しても `GR-17` を掴むこと（MUST）。印の一部を `GR-9` に割り当てて掴み分けてはならない（MUST NOT）
//
// ⛔ MEASURED HERE, 2026-09-09, and the tree does not obey it either. The one
// mark FR-043 draws stands on `GR-9`'s day (x=380 in the same fixture) and is
// `S-180` = 12px wide, so its pixels are x=380..392; `GR-17`'s box begins at
// x=416, a whole day further on. Pressed at x=380, 382, 385 and 391 the answer
// is `GR-9` every time, which is the very split clause 10 forbids -- the mark a
// person sees hands back the START. ⛔ Red for the same reason as R-27, and
// left unpressed for the same reason.
//
// R-30, in `FR-003`, `FR-041` and `FR-039`:
//
//  11 「その入口を `Command Palette` に置くこと（MUST）
//  12 「モノクロを選ぶ入口を `Command Palette` に置くこと（MUST）
//  13 「文字サイズを変える入口を `Command Palette` に置くこと（MUST）
//  14 「その 2 つを本要求へ書き写してはならない（MUST NOT）
//
// ⛔ NOT MEASURABLE AT ALL TODAY, AND THE SPECIFICATION IS WHY. An entrance in
// the Command Palette is a row of 表 T-109 with a figure in 図 F-019, and the
// commit that landed R-30 says in as many words that it raised neither: 「表
// T-109 の行と 図 F-019 の図形は起こしていない —— 図形の決定は利用者の裁定であ
// る」. `src/adapter/screen-renderer/icon-roster.json` is generated from that
// table, so there is no name a case could ask for. ⭐ The three COMMANDS do
// exist -- `setStackDirection` (CM-56), `setFontScale` (CM-62) and
// `setThemeMonochrome` (CM-64) are all in `edit-document-settings.ts` and in
// FR-078's roster -- so what is missing is the entrance and only the entrance.
// ⛔ Writing a case against a row that does not exist would be inventing the
// ruling, which rule 04 forbids.
//
// ---------------------------------------------------------------------------
// WHAT WAS READ OF `src/`
// ---------------------------------------------------------------------------
//
// Head comments and exported declarations of `item-hit-area.ts` (`Hit`,
// `GrabArea`, `PointerSlop`, `itemAtPointer`, `NOT_STORED_SIZES`),
// `schedule-geometry.ts` (`ResumeGeometry`, `TaskGeometry`, `BarGeometry`,
// `Point`, `ScheduleGeometry`, `geometryFromLayout`), `schedule-layout.ts`
// (`layoutFromSchedule`), `screen-regions.ts` (`regionsFromScreen`,
// `ScreenEnvironment`), `schedule.ts` (`planActualState`'s five rows, to learn
// which columns put a Task in PS-4) and `selection.ts` (`emptySelection`).
// ⛔ NONE OF THAT SET AN EXPECTED VALUE: the expectations below are the row's,
// and the geometry supplies only where the picture put its own vertices.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  Schedule,
  Task,
  TaskGroup,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  NOT_STORED_SIZES,
  itemAtPointer,
  type GrabArea,
  type PointerSlop,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type Point,
  type ScheduleGeometry,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable } from '../contract/spec-table'

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

/** EX-7 of table T-033: a day GRS decided itself is written at midnight. */
const stored = (iso: string): string => `${iso}T00:00:00`

/**
 * `zoomX` (`S-75`) 6, so one day is `S-1` x 6 = 36px.
 *
 * ⭐ WIDER THAN `S-93` ON PURPOSE. At the default zoom one day is 6px and the
 * 30px hit box of a dummy spans five of them, which would leave the cases below
 * turning on the zoom rather than on which row answers.
 */
const ZOOM_X = 6

const SETTINGS = settingsOf({
  scrollDate: stored('2026-01-01'), // S-77, so the day-to-x map has an origin
  scrollGroupId: 'g1', // S-78, so a row is at the top
  stackDirection: 'down', // S-58, so every y reads from the top of the band
  zoomX: ZOOM_X,
})

const ENV: ScreenEnvironment = {
  width: 1200,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)

/**
 * `S-93` as the hit test reads it -- 30 x 20px, and `PointerSlop` carries the
 * two sides as the WHOLE box, which `itemAtPointer` halves about the point.
 */
const SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  // `PointerSlop.fadeHandle` is documented as a HALF-width; S-92 is a square.
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  dummyWidth: NOT_STORED_SIZES['S-93'][0],
  dummyHeight: NOT_STORED_SIZES['S-93'][1],
  line: NOT_STORED_SIZES['S-137'],
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
 * ⚠️ NO CALENDAR IS NAMED, which sends the document to table T-209's default --
 * S-106's Monday to Friday. All twelve arrays of the schedule group (DR-2 of
 * table T-052) are present, so a cascade that reads one the fixture forgot
 * fails for a reason the specification states.
 */
const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: {
      title: 'R-28',
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

/**
 * A Task suspended with a resume date planned -- PS-4 of table T-019a, which is
 * the one state that draws `GR-8`'s icon.
 *
 * ⭐ THE RESUME DAY STANDS DEEP INSIDE THE PLAN. 2026-02-06 is six weeks along
 * a plan that runs 2026-01-05 to 2026-03-06, so the icon is nowhere near either
 * plan end point (`GR-3` / `GR-4`), nor near the actual's end and the marker
 * that hangs off it -- the only rows the press below could be answered by are
 * `GR-8` and `GR-12`, which is what the clause is about.
 */
const suspendedMidPlan = (): Schedule =>
  scheduleOf({
    tasks: [
      taskOf({
        uid: UNDER_TEST,
        start: stored('2026-01-05'),
        finish: stored('2026-03-06'),
        actualStart: stored('2026-01-05'),
        actualDuration: 3,
        resume: stored('2026-02-06'),
      }),
    ],
    taskGroups: [groupOf({ id: 'g1' })],
    taskGroupMembers: [{ taskUid: UNDER_TEST, groupId: 'g1', stackOrder: null }],
    taskVisuals: [visualOf({ taskUid: UNDER_TEST, shapeKind: 'rectangle' })],
  })

// ===========================================================================
// Readers
// ===========================================================================

const drawn = (schedule: Schedule): ScheduleGeometry => {
  const layout = layoutFromSchedule(schedule, SETTINGS, REGIONS)
  return geometryFromLayout(schedule, SETTINGS, layout, REGIONS, emptySelection())
}

const taskDrawn = (geometry: ScheduleGeometry): TaskGeometry => {
  const found = geometry.tasks.find((one) => one.taskUid === UNDER_TEST)
  if (found === undefined) throw new Error(`Task ${UNDER_TEST} was not drawn`)
  return found
}

const grabAt = (geometry: ScheduleGeometry, x: number, y: number, slop: PointerSlop = SLOP):
  GrabArea | null => itemAtPointer(geometry, x, y, slop, 'press')?.grab ?? null

/** Every vertex of the icon LF-13 draws: the arm's three points and the head's three. */
const iconVertices = (task: TaskGeometry): readonly Point[] => {
  if (task.resume === null) throw new Error('PS-4 drew no resume icon')
  return [...task.resume.arm, ...task.resume.head]
}

interface Span {
  readonly from: number
  readonly to: number
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
 * ends rather than an area, and this file's fixture uses SH-1 alone -- a case
 * that reached the other form would be measuring a shape it was not written
 * for, and says so instead of guessing.
 */
const boxOfBar = (bar: TaskGeometry['plan']): Box => {
  if (bar === null) throw new Error('this Task has no such bar')
  if (bar.form !== 'outline') {
    throw new Error(`this bar is drawn as a ${bar.form}, which these cases do not measure`)
  }
  const points: readonly Point[] = bar.points
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

/**
 * The stretch of one horizontal line, around `centre`, that answers `GR-8`.
 *
 * ⭐ MEASURED BY PRESSING, not by reading a box off the geometry: the clause is
 * about how much of the plan bar's middle the icon TAKES, which is a fact about
 * what the pointer is answered, and a box read off the picture would only say
 * what the picture holds.
 */
const spanTakenFromThePlanBody = (
  geometry: ScheduleGeometry,
  centre: Point,
  slop: PointerSlop,
): Span => {
  const STEP = 0.25
  const REACH = 400
  let from = Number.NaN
  let to = Number.NaN
  for (let x = centre.x - REACH; x <= centre.x + REACH; x += STEP) {
    if (grabAt(geometry, x, centre.y, slop) !== 'GR-8') continue
    if (Number.isNaN(from)) from = x
    to = x
  }
  if (Number.isNaN(from)) throw new Error('no point on this line answers GR-8')
  return { from, to }
}

/** The box the icon's own drawing occupies, which is where `GR-8` centres. */
const iconCentre = (task: TaskGeometry): Point => {
  const xs = iconVertices(task).map((one) => one.x)
  const ys = iconVertices(task).map((one) => one.y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

// ===========================================================================
// R-28 -- the resume icon beats the plan bar's body
// ===========================================================================

/**
 * Which of two rows the manuscript says wins where both claim a point.
 *
 * ⭐⭐ READ OUT OF TABLE T-023d, NOT TYPED HERE, and that is the whole reason
 * this helper exists rather than a bare `'GR-8'` in each case. R-28's own
 * sentence says the priority is already in the printed order -- 「本表の順は
 * 既にそうなっている —— `GR-8` は `GR-12` より上に在り」 -- and 表 T-023d's rule
 * is 「上の行ほど優先すること（MUST）」. ⛔ So a round that swaps the two rows in
 * the manuscript turns the cases below RED instead of leaving them agreeing
 * with a tree that no longer agrees with the specification.
 */
const higherOf = (left: GrabArea, right: GrabArea): GrabArea => {
  const order = specTable('T-023d').rows.map((row) => row.id)
  const atLeft = order.indexOf(left)
  const atRight = order.indexOf(right)
  if (atLeft < 0 || atRight < 0) throw new Error(`table T-023d has no ${left} or no ${right}`)
  return atLeft < atRight ? left : right
}

describe('table T-023d closing (R-28): GR-8 beats GR-12, and takes what it takes', () => {
  it('answers GR-8 on the icon a person aims at, mid plan bar (MUST)', () => {
    // 「再開アイコン（`GR-8`）は、予定バー本体（`GR-12`）に優先すること（MUST）」
    // ⭐ THE POINTS PRESSED ARE THE PICTURE'S OWN VERTICES -- where LF-13 drew
    // the arm and the head -- and not a point derived from the hit box, so a
    // hit box that moved off the drawing would fail this rather than follow it.
    const geometry = drawn(suspendedMidPlan())
    const task = taskDrawn(geometry)
    const plan = boxOfBar(task.plan)
    for (const vertex of iconVertices(task)) {
      // The premise: this vertex really does stand in the plan bar's MIDDLE,
      // clear of both end points and their S-90 allowance, so GR-12 is the row
      // that would answer if GR-8 did not.
      expect(vertex.x, 'the icon must stand clear of GR-3').toBeGreaterThan(
        plan.x0 + SLOP.planEndpoint,
      )
      expect(vertex.x, 'the icon must stand clear of GR-4').toBeLessThan(
        plan.x1 - SLOP.planEndpoint,
      )
      expect(grabAt(geometry, vertex.x, vertex.y), `pressing the icon at x=${vertex.x}`).toBe(
        higherOf('GR-8', 'GR-12'),
      )
    }
  })

  it('leaves the rest of the plan bar to GR-12, which is what makes it a contest', () => {
    // ⛔ THE CONTRAST, and without it the case above says nothing: if the plan
    // bar's body did not answer at this very x when the icon is not under the
    // pointer, GR-8 would be winning an argument nobody was having.
    const geometry = drawn(suspendedMidPlan())
    const task = taskDrawn(geometry)
    const centre = iconCentre(task)
    const top = boxOfBar(task.plan).y0
    // One pixel inside the plan bar's own top edge: the same column, past the
    // reach S-93 gives the icon downward.
    expect(grabAt(geometry, centre.x, top + 1)).toBe('GR-12')
    // And two pixels beyond S-93's half width to either side, on the icon's own
    // line, the plan body has the press back.
    const half = SLOP.dummyWidth / 2
    expect(grabAt(geometry, centre.x - half - 2, centre.y)).toBe('GR-12')
    expect(grabAt(geometry, centre.x + half + 2, centre.y)).toBe('GR-12')
  })

  it('gives GR-8 the whole of S-93 out of the middle, clipping none of it (MUST)', () => {
    // 「`GR-8` の当たり判定（… 表 T-206 の `S-93`）が予定バー本体の中間を奪うと
    // きも、`GR-8` が勝つこと（MUST）」
    const geometry = drawn(suspendedMidPlan())
    const task = taskDrawn(geometry)
    const centre = iconCentre(task)
    const span = spanTakenFromThePlanBody(geometry, centre, SLOP)
    const taken = span.to - span.from
    // ⚠️ WITHIN ONE STEP OF THE SCAN, not to the pixel: the scan walks in
    // quarter pixels and the row states a width, not an edge convention.
    expect(taken, `S-93 is ${SLOP.dummyWidth}px wide and the icon took ${taken}px`)
      .toBeGreaterThan(SLOP.dummyWidth - 1)
    expect(taken).toBeLessThanOrEqual(SLOP.dummyWidth)
    // ⭐ AND ALL OF IT CAME OUT OF THE PLAN BAR'S MIDDLE. Both edges of what was
    // taken stand inside the bar, so nothing was won from empty ground.
    const plan = boxOfBar(task.plan)
    expect(span.from).toBeGreaterThan(plan.x0)
    expect(span.to).toBeLessThan(plan.x1)
  })

  it('puts no ceiling on how much of the middle it takes (MUST NOT)', () => {
    // 「奪う量に上限を設けてはならない（MUST NOT）」 and 「順を根拠に上限を導いて
    // はならない（MUST NOT）」.
    // ⭐⭐ HOW A CEILING WOULD SHOW. Grow `S-93` and the stretch GR-8 answers on
    // grows by exactly as much; any cap the tree held -- a fraction of the bar,
    // a fixed maximum, a rule that the middle keeps some of itself -- would make
    // the second measurement fall short of ten times the first.
    const geometry = drawn(suspendedMidPlan())
    const task = taskDrawn(geometry)
    const centre = iconCentre(task)
    const once = spanTakenFromThePlanBody(geometry, centre, SLOP)
    const TIMES = 10
    const wide = { ...SLOP, dummyWidth: SLOP.dummyWidth * TIMES }
    const tenfold = spanTakenFromThePlanBody(geometry, centre, wide)
    const takenOnce = once.to - once.from
    const takenTenfold = tenfold.to - tenfold.from
    expect(
      takenTenfold,
      `S-93 grew ${TIMES}x and the middle GR-8 took went ${takenOnce}px -> ${takenTenfold}px`,
    ).toBeGreaterThan(takenOnce * TIMES - 1)
  })

  it('reads the order off table T-023d rather than trusting the tree (MUST)', () => {
    // 「本表の順は既にそうなっている —— `GR-8` は `GR-12` より上に在り」, which is
    // the ground the two cases above stand on: the table's printed order is what
    // settles a point both rows claim. ⛔ Reversed, every press in the icon
    // would answer GR-12 and the icon could not be grabbed at all -- which is
    // the ruling's own reason, 「そうしないと再開できんやろ？」.
    const order = specTable('T-023d').rows.map((row) => row.id)
    expect(order).toContain('GR-8')
    expect(order).toContain('GR-12')
    expect(order.indexOf('GR-8')).toBeLessThan(order.indexOf('GR-12'))
  })
})
