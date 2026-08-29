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
//     「| OC-2 | 担当ラベルと完了率ラベル | 左（バーの外側へ張り出す）。
//      **表示しているときだけ算入すること（MUST）。非表示のときは算入しては
//      ならない（MUST NOT）** |」
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
//   * WHICH OF THE TWO STANDS FURTHER LEFT WHEN BOTH ARE SHOWN. OC-2 gives the
//     pair one direction and one rule; no row orders them.
//   * THE GAP BETWEEN A LABEL AND THE BAR. Measured, the occupancy reaches 8px
//     further left than the label itself for EACH label shown -- which is the
//     value `_assets/tbl-settings.md` prints for S-32 `labelGap`. ⛔ But no row
//     of docs/spec joins S-32 to OC-2, so the cases below are written to be
//     independent of it: each states how the occupancy MOVES when a label's own
//     width moves, which any constant gap drops out of.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  layoutFromSchedule,
  taskPlacement,
  type TaskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'

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
  it('draws a scene both labels can be read from, or every case below proves nothing', () => {
    // ⚠️ 04-verification section 2. Two labels of zero width would satisfy every
    // relation below without anything ever being counted.
    const both = placedWith(true, true)

    expect(both.assigneeLabel, 'FR-059 found the person on this task').not.toBeNull()
    expect(both.percentLabel, 'the task carries a percentComplete to label').not.toBeNull()
    expect(both.assigneeLabelWidth).toBeGreaterThan(0)
    expect(both.percentLabelWidth).toBeGreaterThan(0)
  })

  it('⛔ counts NEITHER label while both are hidden (MUST NOT)', () => {
    // 「非表示のときは算入してはならない（MUST NOT）」. Nothing else in this scene
    // reaches left of the shape: OC-5 and OC-7 need an actual bar, OC-9 a
    // deadline, and OC-1 pushes a name to the RIGHT.
    expect(jutOf(placedWith(false, false))).toBe(0)
  })

  it('⭐ counts the assignee label while it is shown (MUST)', () => {
    const shown = placedWith(true, false)

    expect(jutOf(shown)).toBeGreaterThanOrEqual(shown.assigneeLabelWidth)
  })

  it("⭐ counts the assignee label's OWN width -- a longer name juts further, by exactly its excess", () => {
    // ⭐ THE FORM WITH TEETH, and the one that survives the unstated gap:
    // whatever constant sits between a label and the bar, it drops out of the
    // difference. ⛔ A unit that reserved a fixed slab for the label instead of
    // counting it would answer the same jut for both of these names.
    const short = placedWith(true, false, ONE, 'Al')
    const long = placedWith(true, false, ONE, 'Alexandra Fitzwilliam')

    expect(long.assigneeLabelWidth).toBeGreaterThan(short.assigneeLabelWidth)
    expect(jutOf(long) - jutOf(short)).toBeCloseTo(
      long.assigneeLabelWidth - short.assigneeLabelWidth,
      6,
    )
  })

  it('⭐ counts the percent-complete label while it is shown (MUST)', () => {
    const shown = placedWith(false, true)

    expect(shown.percentLabelWidth).toBeGreaterThan(0)
    expect(jutOf(shown)).toBeGreaterThanOrEqual(shown.percentLabelWidth)
  })

  it("⭐ counts the percent-complete label's OWN width -- `100%` juts further than `4%`", () => {
    // FR-090 (MUST): 「`percentComplete` の値を整数と百分率の記号で示すこと」,
    // and (MUST NOT) 「丸めてはならない」 -- so the two labels really are
    // different lengths, and OC-2 has to follow the one it was given.
    const narrow = placedWith(false, true, { ...ONE, percentComplete: 4 } as Task)
    const wide = placedWith(false, true, { ...ONE, percentComplete: 100 } as Task)

    expect(wide.percentLabelWidth).toBeGreaterThan(narrow.percentLabelWidth)
    expect(jutOf(wide) - jutOf(narrow)).toBeCloseTo(
      wide.percentLabelWidth - narrow.percentLabelWidth,
      6,
    )
  })

  it('⭐ counts BOTH when both are shown, rather than the wider of the two', () => {
    // Each label contributes the same amount whether or not the other is shown,
    // which is 「担当ラベルと完了率ラベル」 read as two counted things rather
    // than as one slot they share.
    const hidden = placedWith(false, false)
    const assigneeOnly = placedWith(true, false)
    const percentOnly = placedWith(false, true)
    const both = placedWith(true, true)

    expect(jutOf(both) - jutOf(assigneeOnly)).toBeCloseTo(jutOf(percentOnly) - jutOf(hidden), 6)
    expect(jutOf(both) - jutOf(percentOnly)).toBeCloseTo(jutOf(assigneeOnly) - jutOf(hidden), 6)
    expect(jutOf(both)).toBeGreaterThanOrEqual(both.assigneeLabelWidth + both.percentLabelWidth)
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
