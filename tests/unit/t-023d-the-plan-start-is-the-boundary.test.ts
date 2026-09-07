// The ruling of 2026-09-08: the plan start's own position is the fence between
// the plan side and the actual side, and where the two actual dummies cannot be
// told apart the FINISH is the one that answers.
//
// Unit under test:
//   UF-7  `item-hit-area.ts` (CP-7 of table T-062, PI-7 of table T-064) --
//         `itemAtPointer`, which answers which row of table T-023d a press
//         landed on.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The rows these cases answer to (rule 03: name the row, never copy its prose
// -- except in section 1, where a clause is quoted because that is its point)
// ---------------------------------------------------------------------------
//
//   T-023d   the table's opening rule -- the PRINTED order is the priority --
//            and its printed order itself, in which `GR-17` now stands above
//            `GR-9` and both stand below `GR-3`.
//   GR-1     the fade-in handle, on the plan bar's top-left corner -- one of
//            the two rows the manuscript measured swallowing the dummy.
//   GR-3     the plan's start point: the plan bar's LEFT end.
//   GR-4     the plan's finish point. ⭐ BOUND BY THIS RULING TOO since
//            2026-09-08: the closing rule names all four plan-side rows, and
//            the note that said the ruling had not touched GR-4 is deleted.
//            ⚠️ It is not fenced the way GR-3 is -- see section 6.
//   GR-7     the progress marker, whose circle stands above GR-8 in the
//            printed order and keeps its ground where the two now overlap.
//   GR-8     the resume icon, taking `S-93` about its own centre.
//   GR-9     the actual start's dummy, standing on the working day AFTER the
//            plan start, with `S-93` for its hit box.
//   GR-17    the actual finish's dummy, `S-129` further on again, with the same
//            hit box, and now ABOVE `GR-9` in the printed order.
//   GR-12    the plan bar's middle -- the row that stands to lose its ground if
//            an endpoint is allowed to swell.
//   GR-15    a milestone carries no actual bar, so `GR-5` / `GR-6` / `GR-17` do
//            not reach it. See the note on `GR-18` below.
//   T-023d's closing notes -- the ten clauses of section 1.
//   T-206    `S-90` (the plan endpoint's reach to either side), `S-92` (the
//            fade handle's square), `S-93` (the box shared by the dummies and
//            by the resume icon), `S-1` (`pxPerDayAt1x`), `S-54` / `S-55` (the
//            zoom's floor and ceiling), `S-22` (the marker's own size).
//   S-129    the working days between `GR-9`'s day and `GR-17`'s.
//   FR-043   what each dummy writes when it is grabbed -- which is why both
//            answers are usable and the tie may be broken either way.
//
// ---------------------------------------------------------------------------
// ⛔ WHY NO `GR-18` CASE STANDS HERE
// ---------------------------------------------------------------------------
// `GR-18` is the milestone's single dummy, and the clause of section 1 names it
// beside `GR-9` and `GR-17`. The boundary question does not arise for it: a
// milestone is one glyph, not a bar (`SH-5` of table T-012 carries no 上下の幅
// and its actual is shifted sideways rather than laid inside), so it has no
// plan bar for `GR-3` and `GR-4` to sit on either end of -- and `GR-15`'s row
// records the same absence on the actual side, naming `GR-5` / `GR-6` / `GR-17`
// as rows a milestone cannot reach. With no `GR-3` on the figure there is
// nothing for `GR-18` to be fenced away from, so a case here would press a
// contest the table does not create.
//
// ---------------------------------------------------------------------------
// ⭐ THE CONTRADICTION THIS FILE REPORTED IS CLOSED
// ---------------------------------------------------------------------------
// `FR-043`'s STATEMENT used to say, of the two dummies overlapping, that the
// one which could be grabbed was the START, and cited table T-023d's order --
// which said the opposite. The manuscript settled it on 2026-09-08, and
// FR-043 now reads 「重なったときに掴めるのは終了点である」, with its
// own note recording that the sentence had stood against the table it cited.
// ⭐ Nothing here changed: section 4 asserted the TABLE's answer all along.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT WAS READ OF `src/` (docs/development-rules/04-verification.md §1)
// ---------------------------------------------------------------------------
// The opening declaration of each file, and these exported declarations only:
//   item-hit-area.ts -- `Item`, `GrabArea`, `Hit`, `PointerResolution`,
//     `PointerSlop`, the signature of `itemAtPointer`, and `NOT_STORED_SIZES`
//   schedule-geometry.ts -- `Point`, `Path`, `BarGeometry`, `DummyGeometry`,
//     `TaskGeometry`, `ScheduleGeometry` and the interfaces they name
//   schedule-layout.ts -- `ShapeKind`
//   screen-regions.ts -- `ScreenRect`
// ⛔ No function body of the unit under test was read, and no expected value
// below came from one: every expectation is a clause's own words or a row of a
// manuscript table.
//
// ⭐ EVERY CLAUSE CONSTANT IN SECTION 1 WAS CUT OUT OF THE MANUSCRIPT BY
// SCRIPT, never retyped, and each is asserted at run time to still be present
// in the file it came from -- a clause whose wording moves takes this file red
// with it. The lengths differ because check 39 falls back through 120 / 90 /
// 60 / 40 / 28 characters and a window reaching back across a paragraph break
// cannot be one single-quoted literal.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  itemAtPointer,
  NOT_STORED_SIZES,
  type GrabArea,
  type Hit,
  type PointerSlop,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type {
  DummyGeometry,
  ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'

// ===========================================================================
// 1. The clauses, verbatim, and the manuscript they were cut from
// ===========================================================================

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/**
 * ⚠️ HELD AT 28 CHARACTERS, CHECK 39's FLOOR: every longer window of this
 * marker reaches back across the blank line before its paragraph.
 */
const BOUNDARY_IS_THE_PLAN_START = '始日の位置が、予定側と実績側の境目であること（MUST）'

/** Held at 120 characters. */
const LEFT_IS_THE_PLAN_RIGHT_IS_A_DUMMY =
  '定開始日の左が予定側を、右側は実績側をつかめるようにしろ」）—— **その位置より左を押したときは予定の開始点（`GR-3`）を掴み、右を押したときは実績のダミー（`GR-17` / `GR-9` / `GR-18`）を掴むこと（MUST）'

/** Held at 120 characters. */
const ZOOM_DOES_NOT_MOVE_THE_BOUNDARY =
  '位置より左を押したときは予定の開始点（`GR-3`）を掴み、右を押したときは実績のダミー（`GR-17` / `GR-9` / `GR-18`）を掴むこと（MUST）。**⛔ **倍率によってこの境目を動かしてはならない（MUST NOT）'

/** Held at 120 characters. */
const S_93_ONLY_RIGHT_OF_THE_BOUNDARY =
  'るので、幅で分けている限り、どこかの倍率で実績側が掴めなくなる。**⭐ **境目は日ではなく位置である** —— **1 日ぶんの幅が 1 画素を切っても、左右は残る。**⚠️ **`S-93` の幅は、境目の右側でだけ使うこと（MUST）'

/** ⚠️ HELD AT 40 -- longer windows cross the blank line above the paragraph. */
const THE_FINISH_WINS_WHEN_UNDECIDABLE =
  'の開始と終了のどちらを掴んだか決められないときは、終了を優先すること（MUST）'

// ---------------------------------------------------------------------------
// ⭐ ADDED 2026-09-08, WITH THE ROUND THAT CLOSED D-393 AND D-400. The ruling
// of that day rewrote table T-023d's closing rules and GR-8's row; the five
// clauses above were already held, and these five were not. Every one is a
// trailing window of 90 characters ending at its own MUST / MUST NOT marker,
// cut out of the manuscript by script and never retyped.
// ---------------------------------------------------------------------------

/** Held at 90 characters. */
const THE_DUMMY_BEATS_EVERY_PLAN_ROW =
  '1 つの答えの別の面である。**⭐⭐ **境目より右では、実績のダミー（`GR-17` / `GR-9` / `GR-18`）を、予定側のどの行よりも先に成立させること（MUST）'

/** Held at 90 characters. */
const NO_PLAN_SLOP_INSIDE_THE_DUMMY_BOX =
  '—— ⛔ **予定側の点の掴み代（`GR-1` / `GR-2` / `GR-3` / `GR-4`）を、境目より右のダミーの当たり判定の中へ伸ばしてはならない（MUST NOT）'

/** Held at 90 characters. */
const THE_DUMMY_STAYS_GRABBABLE_AT_A_LOW_ZOOM =
  'いる** —— **Zoom Out して 1 日の表示が潰れても、ダミーの実績を入力できることである。**⇒ ⛔ **低倍率でダミーが掴めなくなってはならない（MUST NOT）'

/** Held at 90 characters. */
const GR_8_TAKES_S_93_AND_NOT_THE_OUTLINE =
  'assets/tbl-settings.md` の 表 T-206 の `S-93` の大きさとすること（MUST）。図形の素の輪郭を当たり判定にしてはならない（MUST NOT）'

/** Held at 90 characters. */
const GR_8_IS_CENTRED_ON_THE_ICON =
  'いのではなく狙えない。**⭐ **新しい設定値を立てない** —— **同じ行が実績のダミーに与えている大きさをそのまま使う。**⭐ **起点はアイコンの中心とすること（MUST）'

const CLAUSES: ReadonlyArray<readonly [string, string]> = [
  ['the plan start is the fence', BOUNDARY_IS_THE_PLAN_START],
  ['left is the plan, right is a dummy', LEFT_IS_THE_PLAN_RIGHT_IS_A_DUMMY],
  ['the zoom does not move the fence', ZOOM_DOES_NOT_MOVE_THE_BOUNDARY],
  ['S-93 is spent on the right side only', S_93_ONLY_RIGHT_OF_THE_BOUNDARY],
  ['the finish wins the tie', THE_FINISH_WINS_WHEN_UNDECIDABLE],
  ['a dummy beats every plan-side row right of the fence', THE_DUMMY_BEATS_EVERY_PLAN_ROW],
  ['no plan-side slop inside the dummy box', NO_PLAN_SLOP_INSIDE_THE_DUMMY_BOX],
  ['the dummy stays grabbable at a low zoom', THE_DUMMY_STAYS_GRABBABLE_AT_A_LOW_ZOOM],
  ['GR-8 takes S-93 and not the drawn outline', GR_8_TAKES_S_93_AND_NOT_THE_OUTLINE],
  ['GR-8 is centred on the icon', GR_8_IS_CENTRED_ON_THE_ICON],
]

describe('the clauses this file holds are still the manuscript\'s own words', () => {
  it.each(CLAUSES)('%s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

// ===========================================================================
// 2. The fixture -- table T-023d and table T-206 copied as fixed data
// ===========================================================================
//
// ⭐ Rule 04 §1 and the specification's own 1.9: a requirement that points at a
// table is driven by fixed data copied from that table. Nothing here is
// computed by the layout engine, so a defect in the layout cannot make one of
// these cases pass or fail for the wrong reason.

/** The plan bar's left end -- `GR-3`'s place, and the fence itself. */
const PLAN_START_X = 200
const PLAN_FINISH_X = 500
const BAND_TOP = 100
const BAND_BOTTOM = 120
/** Half way down the plan band: every press below is on this line, so the only
 *  thing separating the rows is the horizontal position. */
const MID_Y = 110

/**
 * `S-1` (`pxPerDayAt1x`) is 6 and the zoom multiplies it, floored at `S-54`
 * (0.02) and capped at `S-55` (64). These two stand well inside that range.
 *
 * ⭐ THE LOW ONE IS THE WHOLE POINT OF THE RULING. At 1px per day the working
 * day `GR-9` stands on is ONE pixel right of the plan start and `GR-17` is one
 * further -- both of them inside `S-90`'s 6px reach either side of `GR-3`. A
 * case run only at the comfortable zoom would never meet the contest.
 */
const LOW_ZOOM_PX_PER_DAY = 1
const HIGH_ZOOM_PX_PER_DAY = 24

/** Table T-206, through the generated block `item-hit-area.ts` publishes. */
const SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  // ⛔ HALF, NOT THE WHOLE SQUARE. `PointerSlop.fadeHandle` is documented on
  // the unit as 「S-92: the fade handle's square, as its half-width」, and the
  // shipped shell passes `NOT_STORED_SIZES['S-92'][0] / 2`. This fixture passed
  // the whole 15 and so measured a grab twice the one that ships -- the very
  // fault the fence cases below exist to catch, with the yardstick wrong.
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  dummyWidth: NOT_STORED_SIZES['S-93'][0],
  dummyHeight: NOT_STORED_SIZES['S-93'][1],
  line: NOT_STORED_SIZES['S-137'],
}

const TASK_UID = 41

/**
 * One rectangle-shaped Task, not started: a plan bar, no actual bar, and the
 * two dummies of `FR-043`.
 *
 * `GR-9` stands on the working day after the plan start (its own row), and
 * `GR-17` `S-129` working days further on -- `S-129` is 1, so one more day.
 *
 * ⚠️ `marker` is null although a not-started Task draws `PM-1`: `GR-7` sits
 * outside the finish handle, hundreds of pixels from the fence, and leaving it
 * out keeps a row that has no stake in this ruling from answering by accident.
 */
function notStartedTask(pxPerDay: number): ScheduleGeometry {
  const gr9X = PLAN_START_X + pxPerDay
  const gr17X = gr9X + pxPerDay
  const dummies: readonly DummyGeometry[] = [
    { grab: 'GR-17', at: { x: gr17X, y: MID_Y }, height: 8 },
    { grab: 'GR-9', at: { x: gr9X, y: MID_Y }, height: 8 },
  ]
  return {
    tasks: [
      {
        taskUid: TASK_UID,
        shapeKind: 'rectangle',
        plan: {
          form: 'outline',
          points: [
            { x: PLAN_START_X, y: BAND_TOP },
            { x: PLAN_FINISH_X, y: BAND_TOP },
            { x: PLAN_FINISH_X, y: BAND_BOTTOM },
            { x: PLAN_START_X, y: BAND_BOTTOM },
          ],
        },
        actual: null,
        guides: [],
        marker: null,
        resume: null,
        dummies,
        fadeHandles: [],
        label: null,
        assigneeLabel: null,
        percentLabel: null,
      },
    ],
    dependencies: [],
    progressLine: [],
    statusLine: null,
    dualCursor: null,
    highlightBoxes: [],
    commentBoxes: [],
  }
}

function press(pxPerDay: number, x: number): Hit | null {
  return itemAtPointer(notStartedTask(pxPerDay), x, MID_Y, SLOP)
}

function grabAt(pxPerDay: number, x: number): GrabArea | null {
  return press(pxPerDay, x)?.grab ?? null
}

const ACTUAL_DUMMY_ROWS: readonly GrabArea[] = ['GR-17', 'GR-9', 'GR-18']

// ===========================================================================
// 3. The fence -- pressed on both sides, at both zooms
// ===========================================================================

describe('the plan start is the fence between the plan side and the actual side', () => {
  // ⭐ CONTROL. A build that let the dummies' `S-93` box grow leftwards from
  // their day -- the shape the 2026-09-02 MUST NOT forbids, and the shape a
  // build would fall into if it centred the box on the day instead of starting
  // at the day's left edge -- answers a dummy row here and fails this case.
  // A build that claims everything for the plan still passes it, which is why
  // the case below it exists.
  it('a press LEFT of the plan start answers the plan start, at the low zoom', () => {
    expect(grabAt(LOW_ZOOM_PX_PER_DAY, PLAN_START_X - 3)).toBe('GR-3')
  })

  it('a press LEFT of the plan start answers the plan start, at the high zoom', () => {
    expect(grabAt(HIGH_ZOOM_PX_PER_DAY, PLAN_START_X - 3)).toBe('GR-3')
  })

  // ⭐ CONTROL. This is the case the ruling was given for. At 1px per day both
  // dummies stand inside `S-90`'s reach either side of `GR-3`, so a build that
  // never yields the right-hand side to the actual rows -- the shape the
  // manuscript records as the one shipped before 2026-09-08 -- answers `GR-3`
  // here and fails. A build that prefers the START over the finish still
  // passes this one, which is what section 4 is for.
  it('a press RIGHT of the plan start answers an actual dummy at a zoom low enough that the two stand within a few pixels', () => {
    const hit = press(LOW_ZOOM_PX_PER_DAY, PLAN_START_X + 3)
    expect(hit).not.toBeNull()
    expect(hit?.grab).not.toBe('GR-3')
    expect(ACTUAL_DUMMY_ROWS).toContain(hit?.grab)
  })

  // ⭐ CONTROL. The pair again with the days 24px apart. A build that reads the
  // fence as a rule about crowded zooms alone -- one that widens `GR-3` back
  // over the right-hand side once there is room -- answers `GR-3` here and
  // fails; the manuscript forbids the fence moving with the zoom at all.
  it('the fence does not move with the zoom: the plan start does not claim its right-hand side at the high zoom either', () => {
    const rightOfTheFence = grabAt(HIGH_ZOOM_PX_PER_DAY, PLAN_START_X + 3)
    expect(rightOfTheFence).not.toBeNull()
    expect(rightOfTheFence).not.toBe('GR-3')
    // ⚠️ NOT AN ASSERTION ABOUT WHICH ROW TAKES IT. The manuscript settles that
    // the plan start does not reach across the fence; which row picks up the
    // ground on the far side when no dummy stands there is `GR-12`'s question,
    // and no clause of this ruling answers it. Asserting a row here would put
    // a rule in this file that the specification does not carry.
  })

  // ⭐ CONTROL. The right-hand side is the actual side WHERE A DUMMY STANDS, so
  // the same pair as the low-zoom case, only far enough out that the dummies
  // are separable. A build that answers `GR-3` or `GR-12` here has lost the
  // dummy the pointer is actually on.
  it('a press on the actual start dummy alone answers it, at the high zoom', () => {
    const onlyGr9X = PLAN_START_X + HIGH_ZOOM_PX_PER_DAY + 3
    expect(grabAt(HIGH_ZOOM_PX_PER_DAY, onlyGr9X)).toBe('GR-9')
  })

  // ⭐ CONTROL. The plan bar's middle still answers well right of the dummies'
  // boxes. A build that gave the whole not-started Task to the dummies -- the
  // accident the note above `GR-9` in the manuscript warns of -- answers a
  // dummy row here and fails.
  it('the plan bar middle is untouched by the fence', () => {
    expect(grabAt(HIGH_ZOOM_PX_PER_DAY, PLAN_START_X + 200)).toBe('GR-12')
  })
})

// ===========================================================================
// 4. The tie -- where the two dummies cannot be told apart, the finish answers
// ===========================================================================

describe('where the two actual dummies overlap, the finish is what answers', () => {
  // ⭐ CONTROL. A build that prefers the START -- which is what the table said
  // until 2026-09-08, and what `FR-043` still says -- answers `GR-9` here and
  // fails. So does a build that sorted table T-023d by row number, which would
  // put `GR-9` above `GR-17` again.
  it('at the low zoom the two dummies are one pixel apart and the finish takes the press', () => {
    expect(grabAt(LOW_ZOOM_PX_PER_DAY, PLAN_START_X + 3)).toBe('GR-17')
  })

  // ⭐ CONTROL. The same preference where the overlap is deliberate rather than
  // forced by the zoom: at 24px per day the boxes are `S-93`'s 30px wide and
  // 24px apart, so they still share ground, and the finish must win there too.
  // A build that only broke the tie at low zoom answers `GR-9` here.
  it('at the high zoom the boxes still overlap and the finish takes the press', () => {
    const insideBothX = PLAN_START_X + HIGH_ZOOM_PX_PER_DAY * 2 + 2
    expect(grabAt(HIGH_ZOOM_PX_PER_DAY, insideBothX)).toBe('GR-17')
  })

  // ⭐ CONTROL. The tie-break must not swallow `GR-9` altogether -- `FR-043`
  // gives the two dummies different values to write, so a build that answered
  // `GR-17` everywhere would leave no way to place the actual start alone.
  // That build passes both cases above and fails this one.
  it('the finish winning the tie does not take the start dummy off the figure', () => {
    const onlyGr9X = PLAN_START_X + HIGH_ZOOM_PX_PER_DAY + 3
    expect(grabAt(HIGH_ZOOM_PX_PER_DAY, onlyGr9X)).toBe('GR-9')
  })
})

// ===========================================================================
// 5. The press lands on the Task it was aimed at
// ===========================================================================

describe('every answer above names the Task the press was on', () => {
  it('the plan side and the actual side both answer the same Task', () => {
    expect(press(LOW_ZOOM_PX_PER_DAY, PLAN_START_X - 3)?.item).toEqual({
      kind: 'task',
      taskUid: TASK_UID,
    })
    expect(press(LOW_ZOOM_PX_PER_DAY, PLAN_START_X + 3)?.item).toEqual({
      kind: 'task',
      taskUid: TASK_UID,
    })
  })
})

// ===========================================================================
// 6. The fence binds EVERY plan-side row, not the plan start alone
// ===========================================================================
//
// ⛔ THE FIXTURE OF SECTION 2 CANNOT MEET THIS CONTEST, which is why these
// cases build their own. It draws the plan finish 300px from the fence and
// hands in no fade handles at all, so `GR-4` and `GR-1` never answer anywhere
// near the dummies -- the two rows the manuscript records as the ones that
// swallowed them: 「`GR-4` の `S-90`（端点の左右へ 6px）と、選ばれているあいだ
// 現れる `GR-1` の `S-92` の半分（7.5px）が、描かれているダミーの印を丸ごと
// 飲んでいた」. A SHORT plan at a LOW zoom is where the three rows meet.
//
// ⚠️ `fadeHandles` IS THE WHOLE OF WHAT SELECTION MEANS HERE. FR-075 spends
// its MUST where the list is built, so a Task carrying two points IS a
// selected one as far as table T-023d is concerned.

/** The plan's own length, in days -- the manuscript's 1 〜 8 日 range. */
const SHORT_PLAN_DAYS = 1

/**
 * The same Task as section 2, with the plan drawn `SHORT_PLAN_DAYS` long and
 * the two fade handles standing on its corners (表 T-012a の 点 4 / 点 2).
 */
function selectedShortPlan(pxPerDay: number): ScheduleGeometry {
  const base = notStartedTask(pxPerDay)
  const task = base.tasks[0]!
  const finishX = PLAN_START_X + pxPerDay * SHORT_PLAN_DAYS
  return {
    ...base,
    tasks: [
      {
        ...task,
        plan: {
          form: 'outline',
          points: [
            { x: PLAN_START_X, y: BAND_TOP },
            { x: finishX, y: BAND_TOP },
            { x: finishX, y: BAND_BOTTOM },
            { x: PLAN_START_X, y: BAND_BOTTOM },
          ],
        },
        fadeHandles: [
          { x: PLAN_START_X, y: BAND_TOP },
          { x: finishX, y: BAND_BOTTOM },
        ],
      },
    ],
  }
}

function grabOnShortPlan(pxPerDay: number, x: number, y: number): GrabArea | null {
  return itemAtPointer(selectedShortPlan(pxPerDay), x, y, SLOP)?.grab ?? null
}

describe('right of the fence a dummy beats every plan-side row', () => {
  // ⭐ CONTROL. This is the defect itself. Before the repair, a press one pixel
  // right of the fence on a one-day plan at 1px a day was answered by `GR-4`:
  // the finish stands 1px along, and `S-90` spreads 6px to either side of it,
  // so the whole of both dummies lay under it. A build that only fenced `GR-3`
  // passes every case of sections 3 and 4 and fails this one.
  it('the plan FINISH does not claim the dummy, on a short plan at a zoom where the day has collapsed', () => {
    const answer = grabOnShortPlan(LOW_ZOOM_PX_PER_DAY, PLAN_START_X + 1, MID_Y)
    expect(answer).not.toBe('GR-4')
    expect(ACTUAL_DUMMY_ROWS).toContain(answer)
  })

  // ⭐ CONTROL. The other half of the same measurement, and the reason the band
  // has to be pressed at its TOP: `GR-1` stands on the plan bar's top-left
  // corner, so a press on the middle line never meets it. A build that fenced
  // GR-3 and GR-4 and left the fade handle alone passes the case above and
  // fails this one.
  it('the fade-in handle does not claim the dummy either, pressed on the band the handle stands on', () => {
    const answer = grabOnShortPlan(LOW_ZOOM_PX_PER_DAY, PLAN_START_X + 1, BAND_TOP + 1)
    expect(answer).not.toBe('GR-1')
    expect(ACTUAL_DUMMY_ROWS).toContain(answer)
  })

  // ⭐ CONTROL, AND THE OPPOSITE FAULT. The rows stand down over the DUMMY'S
  // BOX, not over every pixel right of the fence -- 「予定側の点の掴み代…を、
  // 境目より右のダミーの当たり判定の中へ伸ばしてはならない」 says where, and no
  // clause takes the plan's finish off the figure. A build that refused GR-4
  // everywhere right of the plan start would answer something else here, and
  // would leave a plan of more than zero days with no reachable finish at all,
  // since that end always stands right of its own start.
  it('the plan FINISH keeps the ground where no dummy stands', () => {
    // At 6px a day the dummy of `GR-9` begins on the next working day's column,
    // 6px along; a press 3px out is right of the fence and clear of that box.
    expect(grabOnShortPlan(6, PLAN_START_X + 3, MID_Y)).toBe('GR-4')
  })

  // ⭐ CONTROL. The purpose in the ruling's own words -- 「Zoom Out して 1 日の
  // 表示が潰れても、ダミーの実績を入力できることである」 -- asked of the zooms
  // where a day is one or two pixels across, and asked at the ONE pixel the
  // manuscript anchors the box to: 「その日の列の左端を起点に」. `GR-9` stands
  // on the working day after the plan start, so that left edge is exactly one
  // day's width right of the fence.
  //
  // ⛔ NOT 'SOMEWHERE IN THE NEXT 30 PIXELS'. A sweep would pass on a build
  // that had lost the first several pixels of the box, because the plan rows'
  // reach runs out further along -- and the pixels lost would be the ones the
  // ink is drawn on. The press is on the ink.
  it.each([
    [1, MID_Y],
    [1, BAND_TOP + 1],
    [2, MID_Y],
    [2, BAND_TOP + 1],
  ])('the dummy answers on its own day column at %ipx a day (y = %i)', (pxPerDay, y) => {
    const onTheDayColumn = PLAN_START_X + pxPerDay
    const answer = grabOnShortPlan(pxPerDay, onTheDayColumn, y)
    expect(ACTUAL_DUMMY_ROWS).toContain(answer)
  })
})

// ===========================================================================
// 7. GR-8 -- the resume icon is aimed at, not traced
// ===========================================================================
//
// ⚠️ WHY THIS ROW IS ANSWERED IN THIS FILE. It belongs to the same ruling of
// 2026-09-08 and to the same table, and `S-93` is the same row of table T-206
// that the dummies above take their box from -- GR-8's own words are 「新しい
// 設定値を立てない —— 同じ行が実績のダミーに与えている大きさをそのまま使う」.
// ⛔ No new file was raised for it, and no new style of case: the fixture is
// fixed data copied from the tables, the way section 2's is.
//
// ⛔ WHAT IS NOT CLAIMED HERE: where the icon is DRAWN. LF-13 places the bent
// arrow and `S-25` shrinks it when the resume day is undecided; this file is
// handed a figure and asks only which row a press on it answers.

/** The marker's circle -- `S-22` across, so this is its half. */
const MARKER_RADIUS = 8
const MARKER_CENTRE_X = 600

/**
 * A suspended Task carrying the marker (`GR-7`) and the resume icon (`GR-8`),
 * the icon's own path standing clear to the right of the marker's circle.
 *
 * ⭐ The arm and the head are the two paths `ResumeGeometry` publishes, and
 * their bounding box is the FIGURE -- 9.4 x 4.9px at the shipped defaults by
 * the manuscript's own measurement, which is the size GR-8's row refuses.
 */
const ICON_LEFT_X = MARKER_CENTRE_X + MARKER_RADIUS + 4
const ICON_ARM = 9.92
const ICON_HEAD = 3.52

function suspendedTask(): ScheduleGeometry {
  const base = notStartedTask(HIGH_ZOOM_PX_PER_DAY)
  const task = base.tasks[0]!
  return {
    ...base,
    tasks: [
      {
        ...task,
        dummies: [],
        marker: {
          symbol: 'PM-3',
          centre: { x: MARKER_CENTRE_X, y: MID_Y },
          radius: MARKER_RADIUS,
        },
        resume: {
          arm: [
            { x: ICON_LEFT_X, y: MID_Y + MARKER_RADIUS },
            { x: ICON_LEFT_X, y: MID_Y },
            { x: ICON_LEFT_X + ICON_ARM, y: MID_Y },
          ],
          head: [
            { x: ICON_LEFT_X + ICON_ARM, y: MID_Y - ICON_HEAD },
            { x: ICON_LEFT_X + ICON_ARM + ICON_HEAD, y: MID_Y },
            { x: ICON_LEFT_X + ICON_ARM, y: MID_Y + ICON_HEAD },
          ],
          valid: true,
        },
      },
    ],
  }
}

function grabOnSuspended(x: number, y: number): GrabArea | null {
  return itemAtPointer(suspendedTask(), x, y, SLOP)?.grab ?? null
}

/** The centre of the box the arm and the head occupy. */
const ICON_CENTRE_X = ICON_LEFT_X + (ICON_ARM + ICON_HEAD) / 2
const ICON_CENTRE_Y = (MID_Y - ICON_HEAD + MID_Y + MARKER_RADIUS) / 2

describe('GR-8 takes S-93 about the icon, not the icon\'s own outline', () => {
  // ⭐ CONTROL. `S-93` is 30 wide and the drawn arrow is about 13; a build
  // tracing the outline answers null well inside the box the row asks for.
  // ⚠️ Pressed to the RIGHT of the icon, because the left half of the box lies
  // under `GR-7`, which stands above this row in the printed order.
  it('reaches past the drawn figure, out to half of S-93 on the right', () => {
    const halfWidth = NOT_STORED_SIZES['S-93'][0] / 2
    expect(grabOnSuspended(ICON_CENTRE_X + halfWidth - 1, ICON_CENTRE_Y)).toBe('GR-8')
  })

  // ⭐ CONTROL. And stops there. A build that grew the box, or that centred a
  // box of some other size, answers `GR-8` past the row's own figure.
  it('and stops at S-93, so nothing beyond the row answers', () => {
    const halfWidth = NOT_STORED_SIZES['S-93'][0] / 2
    expect(grabOnSuspended(ICON_CENTRE_X + halfWidth + 2, ICON_CENTRE_Y)).not.toBe('GR-8')
  })

  // ⭐ CONTROL. The vertical is the row's too: `S-93` is 20 tall, and the drawn
  // arrow is a few pixels. A build tracing the outline answers null here.
  it('reaches half of S-93 up and down as well', () => {
    const halfHeight = NOT_STORED_SIZES['S-93'][1] / 2
    expect(grabOnSuspended(ICON_CENTRE_X, ICON_CENTRE_Y - halfHeight + 1)).toBe('GR-8')
    expect(grabOnSuspended(ICON_CENTRE_X, ICON_CENTRE_Y + halfHeight - 1)).toBe('GR-8')
  })

  // ⭐ CONTROL, AND THE BOUNDARY WITH `GR-7`. The bigger box reaches back over
  // the marker, and the table's printed order settles the shared ground: the
  // marker answers on its own circle and the icon answers past it. A build
  // that lifted GR-8 above GR-7 -- or that grew the marker to keep its ground
  // -- answers the wrong row at one of these two presses.
  it('the progress marker keeps its own circle, and GR-8 begins past it', () => {
    expect(grabOnSuspended(MARKER_CENTRE_X + MARKER_RADIUS, MID_Y)).toBe('GR-7')
    expect(grabOnSuspended(MARKER_CENTRE_X + MARKER_RADIUS + 1, MID_Y)).toBe('GR-8')
  })
})
