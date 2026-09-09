// Table T-038's OC-2: the assignee label and the percent-complete label are
// counted in the occupied width -- while they are shown, and only then.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (04-verification section 1). The
// imports, `settingsOf`, `taskOf`, `scheduleOf` and the `ENV` / regions
// fixture are COPIED FROM tests/unit/layout-engine.test.ts, which drives the
// same unit (ScheduleLayout, PI-5). ⛔ That file asserts OC-1 -- a name label
// pushed outside -- and nothing else of table T-038.
//
// THE ROWS THIS FILE RESTS ON
//
//   T-038 OC-2 (docs/spec/01-04-requirements.md:1240)
//     「| OC-2 | 担当と完了率の札（**2 枚ではなく 1 枚である**。繋ぎ方と
//      右寄せは `FR-090`）| 左（バーの外側へ張り出す）。**表示していると
//      きだけ算入すること（MUST）。非表示のときは算入してはならない
//      （MUST NOT）** |」
//
//   the heading of table T-038 (docs/spec/01-04-requirements.md:1236)
//     「**段割当（`FR-003`）と全体表示の測定（`FR-055`）は、同じ本表を使うこと
//      (MUST)。2 か所で別々に数え上げてはならない（MUST NOT）。**」
//
//   the sentence under it (docs/spec/01-04-requirements.md:1248)
//     「**日付の範囲だけで数えてはならない（MUST NOT）。** 算入を漏らすと、段
//      割当では重なりを見逃し、全体表示では画面外へ切り落とす。」
//
//   T-068 LC-7 (docs/spec/05-07-design.md:539)
//     「| LC-7 | 7 | 占有幅を合算する | 外へ出したラベル・担当・完了率 |
//      表 T-038 |」
//
// ⛔ WHAT IS NOT ASSERTED, AND WHY -- reported rather than guessed:
//
//   * HOW WIDE EITHER LABEL IS. FR-093's estimate is the layout's own, and no
//     row of docs/spec fixes the width of one character -- so every case below
//     states the occupancy as a RELATION to the widths the placement itself
//     publishes, never as a number.
//   * WHICH OF THE TWO STANDS FURTHER LEFT. ⭐ THE QUESTION IS GONE: OC-2 is
//     ONE card since 2026-09-08 -- 「**2 枚ではなく 1 枚である**」 -- and FR-090
//     fixes the order INSIDE the string, 「担当 → 区切り → 完了率 → 百分率の
//     記号」, which the cases below assert as text rather than as two boxes.
//   * THE GAP BETWEEN THE CARD AND THE BAR. ⭐ S-32 IS NOW NAMED BY THE ROW,
//     which it was not when this file was written: FR-090 (MUST) says 「予定
//     バーの左端から `_assets/tbl-settings.md` の `S-32` だけ左へ離した位置に、
//     札の右端を揃えて置くこと」, so the gap is asserted rather than cancelled
//     out. ⚠️ The difference-shaped cases are kept beside it -- they hold
//     whatever the gap is, and they are what catch a fixed slab.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  geometryFromLayout,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  taskPlacement,
  type TaskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
// D-400's cases ask the PICTURE, not the geometry -- see their own note.
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
// S-93, the hold table T-023d gives GR-9 / GR-17 / GR-18, read out of the block
// the manuscript generates rather than out of either unit under test.
import { NOT_STORED_SIZES } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'

// ---------------------------------------------------------------------------
// The fixture
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const FLAT = SETTINGS_DEFAULTS as unknown as Record<string, number>

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/** The keys these cases pin. Both S-60 and S-61 are stated by every case. */
const BASE = settingsOf({
  rulerHeight: 48, // S-2
  rulerFont: 12, // S-3
  scrollDate: '2026-01-01', // S-77
  stackDirection: 'down', // S-58
  shapeHeightOf: {
    rectangle: FLAT['shapeHeightOf.rectangle'],
    chevron: FLAT['shapeHeightOf.chevron'],
    arrow: FLAT['shapeHeightOf.arrow'],
    endpointSpan: FLAT['shapeHeightOf.endpointSpan'],
    milestone: FLAT['shapeHeightOf.milestone'],
  },
})

const REGIONS = regionsFromScreen(ENV, BASE)

/** S-60 `assigneeVisible` and S-61 `percentCompleteVisible`, set deliberately. */
const showing = (assignee: boolean, percent: boolean): DocumentSettings =>
  settingsOf({
    ...(BASE as unknown as Record<string, unknown>),
    assigneeVisible: assignee,
    percentCompleteVisible: percent,
  })

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
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

/** A task starting on `from` and running `days`. */
const spanning = (uid: number, from: string, days: number, part: Record<string, unknown> = {}): Task => {
  const finish = new Date(new Date(from + 'T00:00:00Z').getTime() + days * 86400000)
  return taskOf({ uid, start: from, finish: finish.toISOString().slice(0, 10), ...part })
}

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    highlightBoxes: [],
    commentBoxes: [],
    ...part,
  }) as unknown as Schedule

/**
 * One row of tasks, every one of them carrying the same person.
 *
 * ⚠️ FR-059 walks `resources` and `assignments` for the assignee label, so a
 * scene with neither would leave OC-2 with nothing to count and every case
 * below green for the wrong reason. ⚠️ AT-87 codes 作業資源 as 1 and FR-008
 * makes that the kind a new 担当者 is created with (MUST), so a person of any
 * other kind would be filtered out by FR-059 before ever reaching OC-2.
 */
const rowOf = (tasks: readonly Task[], personName = 'Alexandra Fitzwilliam'): Schedule =>
  scheduleOf({
    tasks,
    resources: [
      {
        uid: 7,
        name: personName,
        resourceKind: 1,
        isCostResource: false,
        calendarUid: null,
        carry: {},
        carryElements: [],
      },
    ],
    assignments: tasks.map((task, index) => ({
      uid: 100 + index,
      taskUid: task.uid,
      resourceUid: 7,
      carry: {},
      carryElements: [],
    })),
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: tasks.map((task) => ({ groupId: 'g1', taskUid: task.uid })),
  })

/**
 * The one task every occupancy case is measured on.
 *
 * ⚠️ IT HAS TO BE UNDER WAY. FR-090 (MUST NOT): 「未着手のタスクにラベルを
 * 出してはならない」, so a task with no actual bar carries no percent label at
 * all and half of OC-2 would go unmeasured.
 * ⚠️ The actual bar starts on the plan's own first day and ends inside it, so
 * OC-5 (an actual bar outside the plan range) and OC-7 (the guides, which GD-2
 * draws only once the two bars have come apart) add nothing left of the shape
 * -- leaving OC-2 the only row that can.
 */
const ONE = spanning(1, '2026-02-02', 20, {
  name: 'a',
  percentComplete: 40,
  actualStart: '2026-02-02',
  actualDuration: 5,
  resumeValid: true,
})

const placedWith = (
  assignee: boolean,
  percent: boolean,
  task: Task = ONE,
  personName?: string,
): TaskPlacement => {
  const settings = showing(assignee, percent)
  const schedule = personName === undefined ? rowOf([task]) : rowOf([task], personName)
  const placed = taskPlacement(layoutFromSchedule(schedule, settings, REGIONS), 1)
  if (placed === null) throw new Error('task 1 was not drawn at this zoom')
  return placed
}

/** How far the occupancy reaches LEFT of the shape -- OC-2's direction. */
const jutOf = (placed: TaskPlacement): number => placed.x - placed.occupiedX0

// ---------------------------------------------------------------------------

describe('table T-038 OC-2 -- the two labels are counted, and to the LEFT', () => {
  it('draws a scene both readings can be read from, or every case below proves nothing', () => {
    // ⚠️ 04-verification section 2. A card of zero width would satisfy every
    // relation below without anything ever being counted.
    const both = placedWith(true, true)

    expect(both.outsideLabel, 'FR-059 found the person on this task').toContain('A')
    expect(both.outsideLabel, 'the task carries a percentComplete to label').toContain('%')
    expect(both.outsideLabelWidth).toBeGreaterThan(0)
  })

  it('⛔ counts NEITHER label while both are hidden (MUST NOT)', () => {
    // 「非表示のときは算入してはならない（MUST NOT）」. Nothing else in this scene
    // reaches left of the shape: OC-5 and OC-7 need an actual bar, OC-9 a
    // deadline, and OC-1 pushes a name to the RIGHT.
    expect(jutOf(placedWith(false, false))).toBe(0)
  })

  it('⭐ counts the card while the assignee is shown (MUST)', () => {
    const shown = placedWith(true, false)

    expect(jutOf(shown)).toBeGreaterThanOrEqual(shown.outsideLabelWidth)
  })

  it("⭐ counts the assignee's OWN width -- a longer name juts further, by exactly its excess", () => {
    // ⭐ THE FORM WITH TEETH, and the one that survives the unstated gap:
    // whatever constant sits between the card and the bar, it drops out of the
    // difference. ⛔ A unit that reserved a fixed slab for the card instead of
    // counting it would answer the same jut for both of these names.
    const short = placedWith(true, false, ONE, 'Al')
    const long = placedWith(true, false, ONE, 'Alexandra Fitzwilliam')

    expect(long.outsideLabelWidth).toBeGreaterThan(short.outsideLabelWidth)
    expect(jutOf(long) - jutOf(short)).toBeCloseTo(
      long.outsideLabelWidth - short.outsideLabelWidth,
      6,
    )
  })

  it('⭐ counts the card while the percent-complete is shown (MUST)', () => {
    const shown = placedWith(false, true)

    expect(shown.outsideLabelWidth).toBeGreaterThan(0)
    expect(jutOf(shown)).toBeGreaterThanOrEqual(shown.outsideLabelWidth)
  })

  it("⭐ counts the percent-complete's OWN width -- `100%` juts further than `4%`", () => {
    // FR-090 (MUST): 「`percentComplete` の値を整数と百分率の記号で示すこと」,
    // and (MUST NOT) 「丸めてはならない」 -- so the two cards really are
    // different lengths, and OC-2 has to follow the one it was given.
    const narrow = placedWith(false, true, { ...ONE, percentComplete: 4 } as Task)
    const wide = placedWith(false, true, { ...ONE, percentComplete: 100 } as Task)

    expect(wide.outsideLabelWidth).toBeGreaterThan(narrow.outsideLabelWidth)
    expect(jutOf(wide) - jutOf(narrow)).toBeCloseTo(
      wide.outsideLabelWidth - narrow.outsideLabelWidth,
      6,
    )
  })

  // -------------------------------------------------------------------------
  // R-09 of docs/development-records/rulings.md, 逐語 「担当 完了率の順にどちら
  // も右寄せで並べる。 下記を参照とせよ。 previous-project-result/08-poc/
  // poc-integrated.html」, landed in FR-090 and in OC-2's own cell.
  //
  //   OC-2 (01-04-requirements.md)
  //     「| OC-2 | 担当と完了率の札（**2 枚ではなく 1 枚である**。繋ぎ方と右寄せ
  //      は `FR-090`）| …… |」
  //   the reason column under the same table
  //     「⭐ **1 枚に繋いであるので、算入するのも 1 枚ぶんの幅である**（`FR-090`）」
  //   FR-090 (MUST)
  //     「**札の中身は 担当 → 区切り → 完了率 → 百分率の記号 の順に繋いだ 1 つの
  //      文字列とし、区切りは半角コロンの前後に空白を 1 つずつ置いたものとし、
  //      予定バーの左端から `_assets/tbl-settings.md` の `S-32` だけ左へ離した
  //      位置に、札の右端を揃えて置くこと（MUST）。**」
  //     「⭐ **`S-60` と `S-61` の片方だけを出しているときは、その片方だけが札の
  //      中身になり、区切りは現れない。どちらも出していないときは札そのものが
  //      無い**」
  // -------------------------------------------------------------------------

  it('⭐ joins the two readings into ONE string, in FR-090 order, with its separator (MUST)', () => {
    const assigneeOnly = placedWith(true, false)
    const percentOnly = placedWith(false, true)
    const both = placedWith(true, true)

    // 担当 → 区切り → 完了率 → 百分率の記号, and the separator is the
    // requirement's own spelling.
    expect(both.outsideLabel).toBe(
      `${assigneeOnly.outsideLabel} : ${percentOnly.outsideLabel}`,
    )
  })

  it('⛔ shows no separator when only one of S-60 / S-61 is on, and no card at all with neither', () => {
    expect(placedWith(true, false).outsideLabel).not.toContain(':')
    expect(placedWith(false, true).outsideLabel).not.toContain(':')
    expect(placedWith(false, false).outsideLabel).toBe('')
    expect(placedWith(false, false).outsideLabelWidth).toBe(0)
  })

  it("⭐ counts ONE card's width and ONE gap -- not two of either (MUST)", () => {
    // ⛔ THE ARITHMETIC THE RULING CHANGED. Two cards cost two `labelGap`s and
    // two widths; one card costs one of each, and the separator rides INSIDE
    // the width rather than beside it.
    const both = placedWith(true, true)
    const assigneeOnly = placedWith(true, false)
    const percentOnly = placedWith(false, true)

    expect(jutOf(both)).toBeCloseTo(BASE.labelGap + both.outsideLabelWidth, 6)
    expect(jutOf(assigneeOnly)).toBeCloseTo(BASE.labelGap + assigneeOnly.outsideLabelWidth, 6)
    expect(jutOf(percentOnly)).toBeCloseTo(BASE.labelGap + percentOnly.outsideLabelWidth, 6)
    // ⭐ Both readings ARE counted -- the card holds them and the separator, so
    // it is wider than either part and wider than the two of them together.
    expect(both.outsideLabelWidth).toBeGreaterThan(
      assigneeOnly.outsideLabelWidth + percentOnly.outsideLabelWidth,
    )
    // ⛔ AND ONLY ONE GAP IS SPENT. Two boxes cost `2 * labelGap`; the three
    // equalities above already fix the jut at ONE, so this states the same
    // thing the way a reader checks it: the jut of the pair is a single gap
    // past a single measured width.
    expect(jutOf(both) - both.outsideLabelWidth).toBeCloseTo(BASE.labelGap, 6)
  })

  it('leaves the shape itself where it was -- the labels are occupancy, not geometry', () => {
    // OC-2 says 「バーの外側へ張り出す」: what grows is the occupied span, not the
    // bar. ⛔ A unit that moved the bar left instead would satisfy every
    // relation above while drawing the task on the wrong day.
    const hidden = placedWith(false, false)
    const both = placedWith(true, true)

    expect(both.x).toBe(hidden.x)
    expect(both.width).toBe(hidden.width)
    expect(both.occupiedX1).toBe(hidden.occupiedX1)
  })
})

describe('table T-038 heading -- the SAME count drives the lane assignment (FR-003)', () => {
  // 「段割当（`FR-003`）と全体表示の測定（`FR-055`）は、同じ本表を使うこと
  // (MUST)」, and the sentence under the table: 「日付の範囲だけで数えてはならない
  // (MUST NOT)。算入を漏らすと、段割当では重なりを見逃し」.
  //
  // Two tasks whose DATES do not overlap, placed so close that the second one's
  // labels reach back over the first. ST-10 keeps touching ends on one lane, so
  // dates alone answer one lane -- and OC-2 has to answer two.
  const NEIGHBOURS = [
    spanning(1, '2026-02-02', 10, {
      name: 'a',
      percentComplete: 40,
      actualStart: '2026-02-02',
      actualDuration: 3,
      resumeValid: true,
    }),
    spanning(2, '2026-02-12', 10, {
      name: 'b',
      percentComplete: 60,
      actualStart: '2026-02-12',
      actualDuration: 3,
      resumeValid: true,
    }),
  ] as const

  const lanesWith = (assignee: boolean, percent: boolean): readonly number[] =>
    layoutFromSchedule(rowOf(NEIGHBOURS), showing(assignee, percent), REGIONS).placements.map(
      (one) => one.stack,
    )

  it('puts the two on ONE lane while the labels are hidden -- their dates do not overlap', () => {
    expect(lanesWith(false, false)).toEqual([0, 0])
  })

  it('⭐ pushes the second one down once the labels are counted (MUST)', () => {
    // ⛔ THE USER-VISIBLE CLAIM, and the reason the heading forbids two counts:
    // a lane assignment that read the dates alone would draw the second task's
    // labels straight over the first task's bar.
    expect(lanesWith(true, true)).toEqual([0, 1])
  })
})

// ---------------------------------------------------------------------------
// D-394 -- the marker and the task name were drawn on top of one another.
//
// THE ROWS THESE CASES REST ON (both sit under table T-038, requirements.md)
//
//   the order (01-04-requirements.md, under T-038)
//     「**形状の外へ出すものの左右の並びを定めること（MUST）。並びは 担当と完了率
//      の札（`OC-2`）→ 実績バーと実績のダミー（`FR-043`）→ 進捗マーカー
//      （`OC-3`）→ 名称ラベル（`OC-1`）とすること（MUST）**
//      …… **この 4 つを重ねて描いてはならない（MUST NOT）**」
//
//   the resume icon is NOT in that order (01-04-requirements.md, under T-038)
//     「**再開アイコン（`OC-4`）は本並びに従わないこと（MUST NOT）。立てる場所は
//      表 T-221 の `LF-11` が定める日付位置（`resume` の日）とすること
//      （MUST）**」
//
//   the reservation (01-04-requirements.md, under T-038)
//     「**名称ラベルの左端は、`OC-3` と `OC-4` を実際に描いたかどうかによらず、
//      同じ位置とすること（MUST）。`OC-3` / `OC-4` のぶんの場所は、描かない
//      ときも空けること（MUST）。描いたときだけ空けてはならない（MUST NOT）**
//      …… **空ける量は既にある値から求めること（MUST）。新しい設定値を立てて
//      はならない（MUST NOT）** …… **算入するのは、形状の右端から名称ラベルの
//      右端までとすること（MUST）**」
//
//   S-63 (_assets/tbl-settings.md, table T-202)
//     「| S-63 | `progressMarkerVisible` | 真偽 | `true` | 進捗マーカー
//      （`FR-013`）と再開アイコン（`FR-044`）。寸法をズームに追随させない規則は
//      `FR-094` が持つ |」 -- ONE switch for both, which is what makes "the
//      label must not move" a single measurement.
//
// ⛔ WHAT IS NOT ASSERTED, AND WHY -- reported rather than guessed:
//
//   * THE RESUME ICON STANDING ON ITS OWN `resume` DAY. LF-11 of table T-221
//     puts the icon on that day, which may be any day at all -- so it can walk
//     out from under the room reserved for it and land on the name label. ⭐ The
//     clash this note used to describe is settled: the closing text under table
//     T-038 takes OC-4 out of the order and sends it to LF-11's date position,
//     while keeping the room reserved. ⛔ WHAT IS STILL NOT ASSERTED is a Task
//     whose `resume` day is far from the marks -- no row says what the name
//     label does then. The case below uses PS-3 (`resumeValid` false, no
//     `resume` day), which is the one case LF-11 itself puts beside the marker.
//   * HOW WIDE THE RESERVED ROOM IS AS A NUMBER. The row forbids a new setting
//     and names S-22 / S-26 / S-27 as its parts; the cases below therefore
//     state the room as a RELATION -- the marks fall inside it, the label
//     begins after it -- and never as a count of pixels.

/** NL-3: long enough that no zoom in this fixture fits it inside the shape. */
const OUTSIDE_NAME = 'a name far too long for this bar to hold inside itself'

/**
 * PS-3 of table T-021a: started, not finished, `resumeValid` false. FR-044
 * draws the resume icon there, and LF-13 stands it beside the marker because
 * the Task names no `resume` day.
 *
 * ⛔⛔ THE ACTUAL BAR REACHES PAST THE PLAN ON PURPOSE, and this is what makes
 * the cases below bite. FR-013 hangs the marker off the ACTUAL bar's far end,
 * so a Task whose actual stops short of the plan puts the marker back INSIDE
 * the plan's own width and nothing can collide with a label placed after the
 * shape. 20 worked days from a Monday is four weeks, against a plan of twenty
 * CALENDAR days -- so the marker and the resume icon stand outside the shape,
 * where the name label used to be written straight over them.
 */
const SUSPENDED = spanning(1, '2026-02-02', 20, {
  name: OUTSIDE_NAME,
  percentComplete: 40,
  actualStart: '2026-02-02',
  actualDuration: 20,
  resume: null,
  resumeValid: false,
})

/** S-63, set deliberately, with both OC-2 labels shown so every mark is drawn. */
const markSettings = (marksVisible: boolean): DocumentSettings =>
  settingsOf({
    ...(BASE as unknown as Record<string, unknown>),
    assigneeVisible: true,
    percentCompleteVisible: true,
    progressMarkerVisible: marksVisible,
  })

const drawnWithMarks = (marksVisible: boolean): { placed: TaskPlacement; drawn: TaskGeometry } => {
  const settings = markSettings(marksVisible)
  const schedule = rowOf([SUSPENDED])
  const layout = layoutFromSchedule(schedule, settings, REGIONS)
  const placed = taskPlacement(layout, 1)
  if (placed === null) throw new Error('task 1 was not drawn at this zoom')
  const drawn = geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection()).tasks.find(
    (one) => one.taskUid === 1,
  )
  if (drawn === undefined) throw new Error('task 1 has no picture')
  return { placed, drawn }
}

/** The left and right edge of one drawn thing, whatever shape it is. */
interface Band {
  readonly what: string
  readonly x0: number
  readonly x1: number
}

const bandOfPoints = (what: string, points: readonly { readonly x: number }[]): Band => ({
  what,
  x0: Math.min(...points.map((one) => one.x)),
  x1: Math.max(...points.map((one) => one.x)),
})

describe('table T-038, D-394 -- the order stands side by side, and the label does not move', () => {
  it('draws every one of them, or every case below proves nothing', () => {
    const { placed, drawn } = drawnWithMarks(true)
    expect(placed.labelPlacement).toBe('right') // NL-3: the order only bites here
    expect(drawn.assigneeLabel).not.toBeNull() // OC-2's one card
    expect(drawn.actual).not.toBeNull() // FR-043's actual bar
    expect(drawn.marker).not.toBeNull() // OC-3
    expect(drawn.resume).not.toBeNull() // OC-4
    expect(drawn.label).not.toBeNull() // OC-1
  })

  it('⛔ does not draw them on top of one another (MUST NOT)', () => {
    const { drawn } = drawnWithMarks(true)
    const assignee = drawn.assigneeLabel
    const actual = drawn.actual
    const marker = drawn.marker
    const resume = drawn.resume
    const label = drawn.label
    if (assignee === null || actual === null) throw new Error('no OC-2 or actual')
    if (marker === null || resume === null || label === null) throw new Error('no OC-3, OC-4 or OC-1')
    // OC-2 is ONE cell of the table and ONE card since the ruling of
    // 2026-09-08, so it is one band with nothing inside it to order.
    const bands: readonly Band[] = [
      { what: 'OC-2 card', x0: assignee.x, x1: assignee.x + assignee.width },
      // A rectangle's bars are `outline` form (SH-1), so the points carry the
      // horizontal; the line forms name two ends instead.
      bandOfPoints(
        'FR-043 actual',
        actual.form === 'outline' ? actual.points : [actual.from, actual.to],
      ),
      {
        what: 'OC-3 marker',
        x0: marker.centre.x - marker.radius,
        x1: marker.centre.x + marker.radius,
      },
      // ⛔ OC-4 IS NOT ONE OF THE FOUR. The closing text under table T-038 takes
      // the resume icon out of the order and sends it to LF-11's date position.
      // It is measured here because THIS fixture names no `resume` day, which is
      // the one case LF-11 itself stands the icon beside the marker -- so the
      // reserved room is where it actually is.
      bandOfPoints('OC-4 resume', [...resume.arm, ...resume.head]),
      { what: 'OC-1 name label', x0: label.x, x1: label.x + label.width },
    ]
    // ⭐ Stated as a chain rather than as fixed numbers: the row forbids the
    // OVERLAP and fixes the ORDER, and both are exactly "each one ends at or
    // before the next one starts". ⚠️ Touching is allowed -- OC-2's assignee
    // label ends ON the bar's left edge, which the actual bar starts at.
    for (let step = 0; step + 1 < bands.length; step++) {
      const left = bands[step]
      const right = bands[step + 1]
      if (left === undefined || right === undefined) throw new Error('band missing')
      expect({ pair: `${left.what} -> ${right.what}`, clear: left.x1 <= right.x0 }).toEqual({
        pair: `${left.what} -> ${right.what}`,
        clear: true,
      })
    }
  })

  it('⭐ leaves the name label where it is when S-63 hides the two marks (MUST)', () => {
    const shown = drawnWithMarks(true)
    const hidden = drawnWithMarks(false)
    // The switch really did take them off the picture, or the case is vacuous.
    expect([shown.drawn.marker === null, shown.drawn.resume === null]).toEqual([false, false])
    expect([hidden.drawn.marker === null, hidden.drawn.resume === null]).toEqual([true, true])
    expect(hidden.placed.labelX).toBe(shown.placed.labelX)
    const shownLabel = shown.drawn.label
    const hiddenLabel = hidden.drawn.label
    if (shownLabel === null || hiddenLabel === null) throw new Error('no drawn name label')
    expect(hiddenLabel.x).toBe(shownLabel.x)
    expect(hiddenLabel.width).toBe(shownLabel.width)
  })

  it('⭐ leaves the occupied width unmoved by S-63 -- OC-3 / OC-4 (MUST NOT)', () => {
    const shown = drawnWithMarks(true).placed
    const hidden = drawnWithMarks(false).placed
    expect([hidden.occupiedX0, hidden.occupiedX1]).toEqual([shown.occupiedX0, shown.occupiedX1])
    // ⭐ 「算入するのは、形状の右端から名称ラベルの右端まで」 -- the reach ends
    // at the label's right edge, and the reserved room falls INSIDE it.
    expect(shown.occupiedX1).toBeGreaterThan(shown.labelX)
  })

  it('⭐ holds the room open -- the label no longer starts one gap past the bar', () => {
    // ⛔ THE DEFECT ITSELF. Before D-394 the label began at 「形状の右端 +
    // labelGap」, which is inside the marker; the room the row (MUST) asks to be
    // held clear is what pushes it past.
    const { placed } = drawnWithMarks(true)
    expect(placed.labelX).toBeGreaterThan(placed.x + placed.width + BASE.labelGap)
  })
})

// ---------------------------------------------------------------------------
// D-400 -- OC-4 was BUILT and never DRAWN.
//
// ⛔⛔ WHY THIS CASE IS HERE AND NOT ONE LAYER UP. Every case above reads
// `TaskGeometry`, and `TaskGeometry.resume` was correct the whole time -- so
// the whole file was green while the shipped build drew NOTHING in OC-4's
// band (measured 2026-09-08: 0 nodes right of the marker on a suspended Task,
// and `grep -rn "resume" src/adapter/svg-renderer/` answered 0). A row of
// table T-038 that names a thing to be drawn is only met by the picture, so
// this one case asks the renderer.
//
//   FR-044 (01-04-requirements.md, the STATEMENT)
//     「**中断のあいだは再開アイコンを描くこと（MUST）。再開日が未定のときは
//      表 T-201 の `S-25` に従って別の見た目にすること（MUST）**」
//
//   T-038 OC-4 (01-04-requirements.md)
//     「| OC-4 | 再開アイコン | **算入してはならない（MUST NOT）**…… 場所は
//      マーカーのさらに外側 |」
//
// ⛔ WHAT IS NOT ASSERTED: the icon's colour, its stroke width and its dash.
// Table T-236 holds no row of its own for this figure and FR-011 sends its
// dimensions to S-25 〜 S-29, so a number here would be this file deciding a
// settings row. The case asks only that the ink EXISTS and stands where the
// geometry put it.

describe('FR-044, D-400 -- the resume icon reaches the picture, not just the geometry', () => {
  const svgWithMarks = (marksVisible: boolean): string => {
    const settings = markSettings(marksVisible)
    const schedule = rowOf([SUSPENDED])
    const layout = layoutFromSchedule(schedule, settings, REGIONS)
    const geometry = geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection())
    return svgFromSchedule(
      schedule, settings, layout, geometry, REGIONS, emptySelection(), 'screen',
    )
  }

  it('draws the marker too, or the case below proves nothing about the icon', () => {
    // ⚠️ 04-verification section 2: a picture with no marker in it would pass
    // the S-63 case below for the wrong reason.
    expect(svgWithMarks(true)).toContain('data-figure="task-1-marker"')
  })

  it('⭐ draws the icon while the Task is suspended (MUST)', () => {
    expect(svgWithMarks(true)).toContain('data-figure="task-1-resume"')
  })

  it('⭐ puts the drawn ink exactly where the geometry placed it', () => {
    // ⛔ THE HALF THAT MATTERS TO A HAND. ItemHitArea's GR-8 takes S-93's box
    // about the centre of `[...arm, ...head]`, so a picture drawn anywhere else
    // hands the author a grab area with no figure in it -- which is the state
    // the shipped build was in.
    const { drawn } = drawnWithMarks(true)
    const resume = drawn.resume
    if (resume === null) throw new Error('no OC-4 geometry')
    const svg = svgWithMarks(true)
    for (const one of [...resume.arm, ...resume.head]) {
      // The renderer rounds; two decimals is what `rounded` keeps.
      const asDrawn = `${Math.round(one.x * 100) / 100},${Math.round(one.y * 100) / 100}`
      expect({ point: asDrawn, drawn: svg.includes(asDrawn) })
        .toEqual({ point: asDrawn, drawn: true })
    }
  })

  it('⛔ draws no icon once S-63 has taken the marks off (MUST NOT)', () => {
    // ONE switch for both figures -- table T-038's closing paragraph. ⛔ An icon
    // left on screen after the marker went would move nothing (OC-4 is not
    // counted) and would stand alone in the room reserved for a pair.
    expect(svgWithMarks(false)).not.toContain('data-figure="task-1-resume"')
  })
})

// ---------------------------------------------------------------------------
// D-400 -- a milestone's marker was drawn ON its own actual figure.
//
//   T-023d GR-7 (01-04-requirements.md)
//     「| GR-7 | 進捗マーカー | 実績バーの右端の外側。**未着手のときは終了点の
//      掴みシロの外側、マイルストーンのときは図形の外側** |」
//
//   the MUST NOT under table T-038 -- 「この 4 つを重ねて描いてはならない（MUST NOT）」
//
// ⚠️ Measured 2026-09-08 on the shipped build: the marker sat 16.00px inside
// the sideways actual figure LF-10 draws for a milestone, because the anchor
// read the PLAN figure's right edge alone. ⛔ A milestone's actual span is
// zero wide (S-130), so `actualX + actualWidth` is its CENTRE, not its edge.

describe('table T-038 -- a milestone marker stands outside its actual figure too', () => {
  /** A milestone begun on `actualStart`. Later than its plan parts the figures. */
  const milestoneOf = (actualStart: string): Task =>
    taskOf({
      uid: 1,
      name: 'm',
      start: '2026-02-02',
      finish: '2026-02-02',
      milestone: true,
      percentComplete: 40,
      actualStart,
      actualDuration: 0,
      resumeValid: true,
    })

  const milestoneScene = (
    actualStart = '2026-02-05',
  ): { placed: TaskPlacement; drawn: TaskGeometry } => {
    const settings = markSettings(true)
    const schedule = {
      ...rowOf([milestoneOf(actualStart)]),
      taskVisuals: [
        {
          taskUid: 1, nameAnchor: null, nameAlign: null, shapeKind: 'milestone',
          milestoneGlyph: 'diamond', fillColor: null, strokeColor: null, lineWeight: null,
        },
      ],
    } as unknown as Schedule
    const layout = layoutFromSchedule(schedule, settings, REGIONS)
    const placed = taskPlacement(layout, 1)
    if (placed === null) throw new Error('the milestone was not drawn at this zoom')
    const drawn = geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection())
      .tasks.find((one) => one.taskUid === 1)
    if (drawn === undefined) throw new Error('the milestone has no picture')
    return { placed, drawn }
  }

  it('draws a milestone whose actual figure reaches past its plan, or nothing is proved', () => {
    const { placed, drawn } = milestoneScene()
    expect(placed.shapeKind).toBe('milestone')
    expect(placed.actualPlacement).toBe('sideways')
    const actual = drawn.actual
    const marker = drawn.marker
    if (actual === null || marker === null) throw new Error('no actual figure or no marker')
    const actualRight = actual.form === 'outline'
      ? Math.max(...actual.points.map((one) => one.x))
      : Math.max(actual.from.x, actual.to.x)
    // ⚠️ The scene bites only while the actual figure sticks out to the RIGHT of
    // the plan's; otherwise the plan's own edge would have been outside enough.
    expect(actualRight).toBeGreaterThan(placed.x + placed.width)
  })

  it('⛔ does not draw the marker on the actual figure (MUST NOT)', () => {
    const { drawn } = milestoneScene()
    const actual = drawn.actual
    const marker = drawn.marker
    if (actual === null || marker === null) throw new Error('no actual figure or no marker')
    const actualRight = actual.form === 'outline'
      ? Math.max(...actual.points.map((one) => one.x))
      : Math.max(actual.from.x, actual.to.x)
    expect({ clear: marker.centre.x - marker.radius >= actualRight })
      .toEqual({ clear: true })
  })

  it('⭐ measures OC-1 from the SAME reach OC-3 is anchored on (MUST)', () => {
    // ⚠️ The heading of table T-038: 「2 か所で別々に数え上げてはならない
    // （MUST NOT）」. ScheduleLayout answers where OC-1 begins and ScheduleGeometry
    // answers where OC-3 stands, so the ONE thing that says they read the same
    // reach is that the run between them does not depend on how far the actual
    // figure sticks out.
    //
    // ⭐ STATED AS A DIFFERENCE, never as a count of pixels -- the row forbids a
    // new setting and this file's own note forbids writing the room as a number.
    // ⛔ A layout that measured from `actualX + actualWidth` -- a milestone's
    // CENTRE, since S-130 makes its span zero wide -- keeps the first scene and
    // loses the second by half a figure.
    const together = milestoneScene('2026-02-02') // the plan's figure reaches furthest
    const apart = milestoneScene('2026-02-05') // the actual's does
    const runOf = (scene: { placed: TaskPlacement; drawn: TaskGeometry }): number => {
      const marker = scene.drawn.marker
      if (marker === null) throw new Error('no marker')
      return scene.placed.labelX - (marker.centre.x + marker.radius)
    }
    // The two scenes really are different, or the case is vacuous.
    expect(apart.drawn.marker?.centre.x).toBeGreaterThan(together.drawn.marker?.centre.x ?? 0)
    expect(runOf(apart)).toBeCloseTo(runOf(together), 6)
    expect(apart.placed.labelX).toBeGreaterThan(
      (apart.drawn.marker?.centre.x ?? 0) + (apart.drawn.marker?.radius ?? 0),
    )
  })
})
// ---------------------------------------------------------------------------
// R-09 -- OC-2 was drawn as TWO boxes, and they overlapped.
//
// ⛔⛔ WHY THIS CASE IS HERE AND NOT ONE LAYER UP, for the reason the D-400
// case above gives in the same words: every case in the first section reads
// `TaskPlacement`, and the placement's arithmetic was self-consistent the whole
// time. What was wrong was the PICTURE -- two `<text>` elements, each begun at
// the LEFT edge of its own FR-093 estimate, so an estimate that under-read its
// glyphs ran into its neighbour. ⚠️ Measured 2026-09-08 on the shipped build:
// all 40 drawn Tasks overlapped, by 3.089 to 13.971px, reading as 「70%佐藤」.
//
//   FR-090 (MUST / MUST NOT, 利用者の裁定 2026-09-08)
//     「**担当ラベル（`FR-059`）と完了率ラベルは、2 枚の札ではなく 1 枚の札と
//      して描くこと（MUST）。2 枚を別々に置いてはならない（MUST NOT）** ……
//      **札の中身は 担当 → 区切り → 完了率 → 百分率の記号 の順に繋いだ 1 つの
//      文字列とし、区切りは半角コロンの前後に空白を 1 つずつ置いたものとし、
//      予定バーの左端から `_assets/tbl-settings.md` の `S-32` だけ左へ離した
//      位置に、札の右端を揃えて置くこと（MUST）。**」
//
// ⛔ WHAT IS NOT ASSERTED: the ink, the halo and the type size. Those are ZO-5's
// and are answered by the name label's own cases; a number here would be this
// file deciding a row of table T-236.

describe('FR-090, R-09 -- OC-2 reaches the picture as ONE right-aligned text', () => {
  const OC2_FIGURE = 'data-figure="task-1-oc2-label"'

  const svgOf = (): string => {
    const settings = markSettings(true)
    const schedule = rowOf([SUSPENDED])
    const layout = layoutFromSchedule(schedule, settings, REGIONS)
    const geometry = geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection())
    return svgFromSchedule(
      schedule, settings, layout, geometry, REGIONS, emptySelection(), 'screen',
    )
  }

  /** The opening `<text ...>` tag the card was drawn with. */
  const cardTag = (svg: string): string => {
    const at = svg.indexOf(OC2_FIGURE)
    if (at < 0) throw new Error('the card was not drawn')
    const opened = svg.lastIndexOf('<text ', at)
    if (opened < 0) throw new Error('the card is not a text element')
    return svg.slice(opened, at + OC2_FIGURE.length)
  }

  it('⭐ draws ONE figure for the card, and none for a second box (MUST NOT)', () => {
    const svg = svgOf()
    expect(svg).toContain(OC2_FIGURE)
    expect(svg).not.toContain('data-figure="task-1-assignee-label"')
    expect(svg).not.toContain('data-figure="task-1-percent-label"')
    // ⚠️ 04-verification section 2: exactly one, so a second card cannot hide.
    expect(svg.split(OC2_FIGURE).length - 1).toBe(1)
  })

  it('⭐ puts both readings in that one string, joined by FR-090 separator (MUST)', () => {
    const { placed } = drawnWithMarks(true)
    const svg = svgOf()

    expect(placed.outsideLabel).toContain(' : ')
    expect(svg).toContain(`>${placed.outsideLabel}<`)
  })

  it('⭐ aligns the card by its RIGHT edge, one labelGap from the plan bar (MUST)', () => {
    // 「予定バーの左端から `_assets/tbl-settings.md` の `S-32` だけ左へ離した
    // 位置に、札の右端を揃えて置くこと」
    // -- so the geometry's right edge is that number, and the picture is pinned
    // to the far end rather than begun at the near one.
    const { placed, drawn } = drawnWithMarks(true)
    const card = drawn.assigneeLabel
    if (card === null) throw new Error('no OC-2 card')
    const rightEdge = card.x + card.width
    expect(rightEdge).toBeCloseTo(placed.x - BASE.labelGap, 6)

    // ⛔ THE DEFECT ITSELF. The glyphs used to begin at the box's LEFT edge, so
    // an under-read estimate spilled RIGHTWARD across the gap and onto its
    // neighbour. Anchored at the end, the drawn `x` IS the right edge and the
    // estimate's error runs the other way, into the room OC-2 already reserves.
    const tag = cardTag(svgOf())
    expect({ anchored: tag.includes('text-anchor="end"') }).toEqual({ anchored: true })
    const drawnX = Number(/ x="([-\d.]+)"/.exec(tag)?.[1] ?? 'NaN')
    expect(drawnX).toBeCloseTo(rightEdge, 1)
  })
})

// ---------------------------------------------------------------------------
// D-408 -- the marker stood INSIDE the hold it is supposed to be outside of.
//
//   T-023d GR-7 (01-04-requirements.md)
//     「実績バーの右端の外側。**未着手のときは終了点の掴みシロの外側**」
//
//   the closing rule of table T-038 (MUST / MUST NOT, 利用者の裁定 2026-09-09)
//     「**本並びで数える幅は、掴みシロを持つものについてはその掴みシロの幅とする
//      こと（MUST）。描いた印の幅で数えてはならない（MUST NOT）**……実績のダミー
//      （表 T-023d の `GR-9` / `GR-17` / `GR-18`）の掴みシロは `S-93` であり、
//      描く幅の `S-180` ではない」
//
// ⚠️ Measured 2026-09-09 on the shipped build, one board rebuilt per pixel and
// the answer read back through the Agent API: of GR-17's 30 hit pixels, GR-7
// answered 16 at 6, 15 and 36 px a day.
// ⛔ TWO UNITS HAD TO MOVE, and the heading of table T-038 is why -- 「2 か所で
// 別々に数え上げてはならない（MUST NOT）」. ScheduleGeometry anchors OC-3 and
// ScheduleLayout measures where OC-1 begins; a repair to one alone parts them.

describe('table T-038 -- the order counts the dummy HOLD, not the drawn mark', () => {
  const sceneOf = (part: Record<string, unknown>): { placed: TaskPlacement; drawn: TaskGeometry } => {
    const settings = markSettings(true)
    const schedule = rowOf([
      taskOf({ uid: 1, name: 'n', start: '2026-02-02', finish: '2026-02-20', percentComplete: 0,
               ...part }),
    ])
    const layout = layoutFromSchedule(schedule, settings, REGIONS)
    const placed = taskPlacement(layout, 1)
    if (placed === null) throw new Error('the Task was not drawn at this zoom')
    const drawn = geometryFromLayout(schedule, settings, layout, REGIONS, emptySelection())
      .tasks.find((one) => one.taskUid === 1)
    if (drawn === undefined) throw new Error('the Task has no picture')
    return { placed, drawn }
  }

  /**
   * Nothing entered, so FR-043 draws GR-9 and GR-17 and no actual bar.
   *
   * ⛔ THE PLAN IS SHORT ON PURPOSE. LC-7 measures OC-1 from whichever reaches
   * further, the shape's own right edge or the reach the marker hangs off, so
   * on a long plan the dummy's hold never decides anything and a case built on
   * one proves nothing (measured 2026-09-09: taking the hold out of
   * ScheduleLayout turned 0 cases red while this scene ran nineteen days long).
   * ⚠️ Two days at this zoom is narrower than S-93, which is the state the
   * ruling of 2026-09-09 is about -- 「Zoom Out して 1 日の表示が潰れても、
   * ダミーの実績を入力できること」.
   */
  const notStartedScene = () => sceneOf({ finish: '2026-02-06' })
  /**
   * The same Task run to its planned end, so the marker hangs off the ACTUAL
   * bar and that bar is also what LC-7 measures OC-1 from.
   *
   * ⚠️ THE ACTUAL HAS TO REACH THE PLAN'S OWN END. LC-7 takes whichever reaches
   * further, so an actual that stopped short would leave OC-1 measured from the
   * plan's right edge and the marker measured from the actual's -- and the run
   * between them would carry that difference rather than the constant room.
   */
  const startedScene = () => sceneOf({ actualStart: '2026-02-02', actualDuration: 15 })

  /**
   * How far OC-1 begins past the marker's right edge.
   *
   * ⭐ THE ONE NUMBER THAT SAYS THE TWO UNITS READ THE SAME REACH, and stated as
   * a difference rather than as pixels -- the closing paragraph of table T-038
   * holds the room for OC-3 and OC-4 clear whether or not either is drawn, so
   * the run is a constant and no case here may name it.
   */
  const runOf = (scene: { placed: TaskPlacement; drawn: TaskGeometry }): number => {
    const marker = scene.drawn.marker
    if (marker === null) throw new Error('no marker')
    return scene.placed.labelX - (marker.centre.x + marker.radius)
  }

  /** GR-17's own hold: S-93 wide, from the left edge of the day it stands on. */
  const holdRightOf = (drawn: TaskGeometry): number => {
    const endpoint = drawn.dummies.find((one) => one.grab === 'GR-17')
    if (endpoint === undefined) throw new Error('FR-043 drew no GR-17 to hang the marker off')
    return endpoint.at.x + NOT_STORED_SIZES['S-93']
  }

  it('draws both dummies and no actual bar, or nothing below is proved', () => {
    const { placed, drawn } = notStartedScene()
    expect(placed.actualX).toBeNull()
    expect(drawn.dummies.map((one) => one.grab)).toEqual(['GR-9', 'GR-17'])
    expect(drawn.marker).not.toBeNull()
  })

  it('⛔ MUST: OC-3 stands outside GR-17’s hold, not on it', () => {
    const { drawn } = notStartedScene()
    const marker = drawn.marker
    if (marker === null) throw new Error('no marker')
    expect({ clear: marker.centre.x - marker.radius >= holdRightOf(drawn) })
      .toEqual({ clear: true })
  })

  it('⛔ MUST NOT: OC-1 is measured from that same hold, and not from the mark', () => {
    // ⚠️ THE OTHER HALF, AND THE ONE NO CASE READ BEFORE (measured 2026-09-09:
    // taking the hold back out of ScheduleLayout alone turned 0 cases red, and
    // this one turns red for it).
    // ⭐ THE HEADING OF TABLE T-038 IS WHAT IS ASSERTED -- 「2 か所で別々に数え
    // 上げてはならない（MUST NOT）」. ScheduleLayout puts OC-1 down and
    // ScheduleGeometry anchors OC-3, so the run between them is the same
    // constant on a Task that is started and on one that is not; a layout that
    // measured the drawn mark loses S-93 of it on the not-started one alone.
    // ⛔ Never a count of pixels: the row forbids minting a new setting, and
    // the closing paragraph makes the room a constant this file may not name.
    const started = startedScene()
    const fresh = notStartedScene()
    // The two scenes really do anchor on different things, or the case is vacuous.
    expect(started.placed.actualX).not.toBeNull()
    expect(fresh.placed.actualX).toBeNull()
    expect(runOf(fresh)).toBeCloseTo(runOf(started), 6)
    expect({ clear: fresh.placed.labelX >= holdRightOf(fresh.drawn) }).toEqual({ clear: true })
  })
})
