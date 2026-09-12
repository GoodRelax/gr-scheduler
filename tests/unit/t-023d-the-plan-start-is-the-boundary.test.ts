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
//   GR-8     the resume icon, taking `S-22` (the progress marker's own size)
//            about its own centre. See section 7.
//   GR-9     the actual start's dummy, standing on the working day AFTER the
//            plan start, with FR-043's own drawn ink for its hit box -- its
//            LEFT half (see section 1's clauses).
//   GR-17    the actual finish's dummy, `S-129` further on again, with the
//            SAME ink as GR-9 -- its RIGHT half -- and now ABOVE `GR-9` in the
//            printed order.
//   GR-12    the plan bar's middle -- the row that stands to lose its ground if
//            an endpoint is allowed to swell.
//   GR-15    a milestone carries no actual bar, so `GR-5` / `GR-6` / `GR-17` do
//            not reach it. See the note on `GR-18` below.
//   T-023d's closing notes -- the clauses of section 1.
//   T-206    `S-90` (the plan endpoint's reach to either side), `S-92` (the
//            fade handle's square), `S-1` (`pxPerDayAt1x`), `S-54` / `S-55`
//            (the zoom's floor and ceiling), `S-22` (the marker's own size,
//            and GR-8's hit box), `S-180` (FR-043's drawn width, which is also
//            the dummies' hit box).
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
import { specTable, unbroken } from '../contract/spec-table'

// ===========================================================================
// 1. The clauses, verbatim, and the manuscript they were cut from
// ===========================================================================

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

/**
 * ⚠️ HELD AT 28 CHARACTERS, CHECK 39's FLOOR: every longer window of this
 * marker reaches back across the blank line before its paragraph.
 */
const BOUNDARY_IS_THE_PLAN_START = '始日の位置が、予定側と実績側の境目であること（MUST）'

/** Held at 120 characters. */
const LEFT_IS_THE_PLAN_RIGHT_IS_A_DUMMY =
  '定開始日の左が予定側を、右側は実績側をつかめるようにしろ」）—— その位置より左を押したときは予定の開始点（`GR-3`）を掴み、右を押したときは実績のダミー（`GR-17` / `GR-9` / `GR-18`）を掴むこと（MUST）'

/** Held at 120 characters. */
const ZOOM_DOES_NOT_MOVE_THE_BOUNDARY =
  '位置より左を押したときは予定の開始点（`GR-3`）を掴み、右を押したときは実績のダミー（`GR-17` / `GR-9` / `GR-18`）を掴むこと（MUST）。⛔ **倍率によってこの境目を動かしてはならない（MUST NOT）'

/** Held at 120 characters. */
const THE_DUMMYS_HIT_AREA_ONLY_RIGHT_OF_THE_BOUNDARY =
  'るので、幅で分けている限り、どこかの倍率で実績側が掴めなくなる。⭐ **境目は日ではなく位置である** —— **1 日ぶんの幅が 1 画素を切っても、左右は残る。**⚠️ **ダミーの当たり判定は、境目の右側でだけ使うこと（MUST）'

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
  'い込みうるのは印だけである。⭐ 境目より右では、実績のダミー（`GR-17` / `GR-9` / `GR-18`）を、予定側のどの行よりも先に成立させること（MUST）'

/** Held at 90 characters. */
const NO_PLAN_SLOP_INSIDE_THE_DUMMY_BOX =
  '—— ⛔ 予定側の点の掴み代（`GR-1` / `GR-2` / `GR-3` / `GR-4`）を、境目より右のダミーの当たり判定の中へ伸ばしてはならない（MUST NOT）'

/** Held at 90 characters. */
const THE_DUMMY_STAYS_GRABBABLE_AT_A_LOW_ZOOM =
  'いる** —— Zoom Out して 1 日の表示が潰れても、ダミーの実績を入力できることである。⇒ ⛔ **低倍率でダミーが掴めなくなってはならない（MUST NOT）'

/** Held at 90 characters. */
const GR_8_TAKES_S_22_AND_NOT_THE_OUTLINE =
  'assets/tbl-settings.md` の 表 T-201 の `S-22` の大きさとすること（MUST）。図形の素の輪郭を当たり判定にしてはならない（MUST NOT）'

/** Held at 90 characters. */
const GR_8_IS_CENTRED_ON_THE_ICON =
  'は本表の結びが持つ。⛔ **マイルストーンには本行を当ててはならない（MUST NOT）** —— 理由は本表の結びが持つ。⭐ **起点はアイコンの中心とすること（MUST）'

// ---------------------------------------------------------------------------
// ⭐ ADDED WITH THE ROUND THAT MEASURED D-395. The closing rule of 2026-09-08
// that names the two ends standing on ONE DAY was held by nothing under
// tests/: measured on this tree, making the unit's gate on the ACTUAL's two
// ends (`actualEndsStandOnOneDay`) never fire at all left 7223 cases green and
// 0 red. Section 8 below is what makes that break red, and these three windows
// are the clause it stands on -- section 9 leans on the same three for the
// PLAN's half of it.
// ---------------------------------------------------------------------------

/** ⚠️ HELD AT 28 -- longer windows cross the blank line above the paragraph. */
const THE_FINISH_WINS_WHEN_TWO_ENDS_SHARE_A_DAY =
  'の端点が同じ日に立つときは、終了側を掴むこと（MUST）'

/** Held at 120 characters. */
const IT_APPLIES_TO_THE_ACTUALS_TWO_ENDS =
  'ら終了日をつかめるようにしろ」）—— 予定の 2 端（`GR-3` と `GR-4`）にも、実績の 2 端（`GR-5` と `GR-6`）にも、ダミーの 2 端（`GR-9` と `GR-17`）にも、同じように当てはまる（MUST）'

/** Held at 120 characters. */
const NOT_BECAUSE_THE_START_STANDS_HIGHER =
  '実績の 2 端（`GR-5` と `GR-6`）にも、ダミーの 2 端（`GR-9` と `GR-17`）にも、同じように当てはまる（MUST）。⛔ 開始側が本表で上に在ることを理由に、開始側を掴ませてはならない（MUST NOT）'

// ---------------------------------------------------------------------------
// ⭐ ADDED WITH THE ROUND OF 2026-09-10, WHICH BROUGHT THE RULINGS OF 09-09
// DOWN INTO THE MANUSCRIPT. Section 6a stands on these two: the holds are not
// cut into an upper and a lower lane, and the vertical is nested instead.
// ---------------------------------------------------------------------------

/** ⚠️ HELD AT 28 -- longer windows cross the blank line above the paragraph. */
const NO_UPPER_AND_LOWER_LANES = 'シロを上下のレーンに割ってはならない（MUST NOT）'

/** ⚠️ HELD AT 28 -- longer windows cross the blank line above the paragraph. */
const THE_OVERLAPPING_BANDS_ARE_NESTED = '⭐ **重なる掴み代の縦幅は入れ子とすること（MUST）'

const CLAUSES: ReadonlyArray<readonly [string, string]> = [
  ['the plan start is the fence', BOUNDARY_IS_THE_PLAN_START],
  ['left is the plan, right is a dummy', LEFT_IS_THE_PLAN_RIGHT_IS_A_DUMMY],
  ['the zoom does not move the fence', ZOOM_DOES_NOT_MOVE_THE_BOUNDARY],
  ['the dummy\'s hit area is spent on the right side only (S-93 retired 2026-09-10)',
    THE_DUMMYS_HIT_AREA_ONLY_RIGHT_OF_THE_BOUNDARY],
  ['the finish wins the tie', THE_FINISH_WINS_WHEN_UNDECIDABLE],
  ['a dummy beats every plan-side row right of the fence', THE_DUMMY_BEATS_EVERY_PLAN_ROW],
  ['no plan-side slop inside the dummy box', NO_PLAN_SLOP_INSIDE_THE_DUMMY_BOX],
  ['the dummy stays grabbable at a low zoom', THE_DUMMY_STAYS_GRABBABLE_AT_A_LOW_ZOOM],
  ['GR-8 takes S-22 and not the drawn outline', GR_8_TAKES_S_22_AND_NOT_THE_OUTLINE],
  ['GR-8 is centred on the icon', GR_8_IS_CENTRED_ON_THE_ICON],
  ['the finish wins where two ends share a day', THE_FINISH_WINS_WHEN_TWO_ENDS_SHARE_A_DAY],
  ['and it applies to the actual\'s two ends', IT_APPLIES_TO_THE_ACTUALS_TWO_ENDS],
  ['not because the start stands higher in the table', NOT_BECAUSE_THE_START_STANDS_HIGHER],
  ['the holds are not cut into an upper and a lower lane', NO_UPPER_AND_LOWER_LANES],
  ['the overlapping bands are nested instead', THE_OVERLAPPING_BANDS_ARE_NESTED],
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

/**
 * The ACTUAL bar's own band, which is where table T-023d's closing rule sends
 * the vertical of the dummies' hold (MUST, 利用者の裁定 2026-09-09) and where
 * `S-180`'s own remark in 表 T-206 sends it too: 「⭐ **本行が定めるのは横だけで
 * ある** —— 縦の広がりは実績バーの帯に従う」.
 *
 * ⚠️ A FIXTURE VALUE like every other in this section: the figures below are
 * assembled by hand so the fence can be pressed at pixels no document would
 * put a dummy at, and this is the band the mark is drawn in.
 */
const ACTUAL_BAND_HEIGHT = 8

/**
 * A line inside BOTH the fade handle's square and the actual bar's band.
 *
 * ⭐⭐ WHY IT IS NOT THE PLAN BAND'S TOP EDGE ANY MORE. Until 2026-09-09 the
 * dummies' hold carried its own height and stood taller than the actual bar,
 * so a press one pixel below the plan bar's top met both the fade handle and a
 * dummy. The ruling of that day nests the bands instead -- 「重なる掴み代の縦幅
 * は入れ子とすること（MUST）」 -- and sends the dummies' vertical to the actual
 * band, which leaves the plan's own margin to the plan's rows. ⇒ The contest
 * this file measures now lives where the two bands MEET, and a press on the
 * plan's margin is no longer a contest at all.
 */
const WHERE_THE_FADE_SQUARE_MEETS_THE_ACTUAL_BAND = MID_Y - ACTUAL_BAND_HEIGHT / 2 + 1

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
  // ⛔ `PointerSlop` carries no dummy figure at all: table T-023d's closing rule
  // has the three dummies answer on `FR-043`'s drawn mark and nothing wider, so
  // this fixture states nothing for them.
  line: NOT_STORED_SIZES['S-137'],
}

const TASK_UID = 41

/**
 * S-180 -- ⛔ THE UPPER BOUND ON THE DRAWN MARK, NEVER THE MARK'S WIDTH.
 * FR-043 (MUST): 「ダミーを描く幅は、1 日ぶんと … `S-180` の小さい方とすること」.
 * ⚠️ Written here rather than imported: this file builds a geometry BY HAND so
 * that the fence can be pressed at pixels a real document would not put a dummy
 * at, and the number is stated in the manuscript this fixture is read against.
 */
const DRAWN_WIDTH_CAP = 30

/**
 * A pixel that is GR-9's ALONE at the high zoom: inside the LEFT HALF of the
 * one mark FR-043 draws, and nowhere near GR-17's own day.
 *
 * ⭐⭐ THE RULING OF 2026-09-09 CUTS THE MARK DOWN THE MIDDLE (MUST): 「1 つの
 * ダミーの印は、その横幅の中央で左右に割ること（MUST）。左半分を実績の開始側
 * （`GR-9`）、右半分を実績の終了側（`GR-17`）とすること（MUST）」. ⇒ The left half
 * is where GR-9 answers, and it is the half a person aims at to place an
 * actual start. ⛔ 2026-09-09 まで the same manuscript handed EVERY pixel of the
 * mark to the finish, and this probe had to stand past the mark's right edge to
 * find GR-9 at all -- ⚠️ which it can no longer do, because `S-180` rose from
 * 12 to 30 the same day and the mark now covers the whole of a 24px day.
 */
const ONLY_GR_9_X = PLAN_START_X + HIGH_ZOOM_PX_PER_DAY + 3

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
  // ⭐ THE ONE MARK FR-043 DRAWS, on GR-9's day and 「1 日ぶんと `S-180` の
  // 小さい方」 across. ⚠️ The same record on both dummies, which is what
  // `DummyGeometry.ink` is: the two grab targets share one drawing.
  const ink = {
    x: gr9X,
    y: MID_Y - ACTUAL_BAND_HEIGHT / 2,
    width: Math.min(pxPerDay, DRAWN_WIDTH_CAP),
    height: ACTUAL_BAND_HEIGHT,
  }
  const dummies: readonly DummyGeometry[] = [
    { grab: 'GR-17', at: { x: gr17X, y: MID_Y }, ink },
    { grab: 'GR-9', at: { x: gr9X, y: MID_Y }, ink },
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
        // Not a milestone, so FR-043's third exception does not reach it.
        milestoneFigure: null,
        // ⭐ FALSE, AND IT IS A FIXTURE VALUE LIKE EVERY OTHER HERE. This plan
        // runs from `PLAN_START_X` to `PLAN_FINISH_X`, which is many days --
        // section 9 is where the same-day plan is built and pressed.
        planEndsStandOnOneDay: false,
        guides: [],
        marker: null,
        resume: null,
        dummies,
        fadeHandles: [],
        label: null,
        assigneeLabel: null,
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
  // ⭐ CONTROL. A build that let the dummies' ink grow leftwards from their own
  // day -- the shape the 2026-09-02 MUST NOT forbids, and the shape a build
  // would fall into if it centred the ink on the day instead of drawing it
  // from the day's left edge -- answers a dummy row here and fails this case.
  // ⛔ The ink itself is the whole of the hit area (section 1's clauses), so
  // this control reasons about the ink alone. A build that
  // claims everything for the plan still passes it, which is why the case
  // below it exists.
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
    // ⛔ WHERE THE PRESS STANDS, AND WHY IT IS NOT 3px OUT. The ink at 1px a
    // day is only `Math.min(pxPerDay, S-180)` == 1px wide, so a press 3px out
    // clears it and falls on `GR-12` instead. The only ground to press at this
    // zoom is the ink's own day column -- `GR-9`'s day, one pixel right of the
    // plan start.
    const hit = press(LOW_ZOOM_PX_PER_DAY, PLAN_START_X + LOW_ZOOM_PX_PER_DAY)
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
    expect(grabAt(HIGH_ZOOM_PX_PER_DAY, ONLY_GR_9_X)).toBe('GR-9')
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
    // ⛔ WHERE THE PRESS STANDS, for the same reason as section 3's own
    // control: at 1px a day the shared ink is only `Math.min(pxPerDay, S-180)`
    // == 1px wide, so the only pixel to press is the ink's own -- and its right
    // half (inclusive of the ink's own right edge) is `GR-17`'s. The two
    // dummies' OWN days are exactly one pixel apart (`GR-9`'s at
    // `PLAN_START_X + 1`, `GR-17`'s one further), which is what the title
    // names; the finish takes the one pixel of ink there is.
    expect(grabAt(LOW_ZOOM_PX_PER_DAY, PLAN_START_X + LOW_ZOOM_PX_PER_DAY + 1)).toBe('GR-17')
  })

  // ⛔ WHAT THIS CASE ASKS. Table T-023d's closing rule keeps both dummies
  // inside `FR-043`'s drawn mark, so there is no ground past the shared ink for
  // the two to overlap in. The question past the ink is whether ANY plan-side
  // row picks that ground up -- and the closing rule's own fence
  // (`standsOnADummyRightOfThePlanStart`) only bars them from the ink itself,
  // not from the ground beyond it.
  it('past the shared ink, right of the fence, neither dummy answers any more', () => {
    const pastTheInk =
      PLAN_START_X + HIGH_ZOOM_PX_PER_DAY + Math.min(HIGH_ZOOM_PX_PER_DAY, DRAWN_WIDTH_CAP) + 2
    const answer = grabAt(HIGH_ZOOM_PX_PER_DAY, pastTheInk)
    expect(ACTUAL_DUMMY_ROWS).not.toContain(answer)
    // ⭐ AND SPECIFICALLY GR-12, not nothing: the fence bars the plan-side rows
    // from the ink alone, so past the ink the plan bar's own middle is what is
    // left underneath -- the same ground section 3's control presses to prove
    // the fence does not swallow the whole Task for the plan either.
    expect(answer).toBe('GR-12')
  })

  // ⭐ CONTROL. The tie-break must not swallow `GR-9` altogether -- `FR-043`
  // gives the two dummies different values to write, so a build that answered
  // `GR-17` everywhere would leave no way to place the actual start alone.
  // That build passes both cases above and fails this one.
  it('the finish winning the tie does not take the start dummy off the figure', () => {
    expect(grabAt(HIGH_ZOOM_PX_PER_DAY, ONLY_GR_9_X)).toBe('GR-9')
  })

  // ⭐ CONTROL FOR THE OTHER HALF OF THE SAME RULING, AND IT TURNED OVER ON
  // 2026-09-09. The manuscript first gave EVERY pixel of the one mark to the
  // finish and forbade splitting it; a later ruling the same day cut the mark
  // down its own middle -- 「1 つのダミーの印は、その横幅の中央で左右に割る
  // こと（MUST）。左半分を実績の開始側（`GR-9`）、右半分を実績の終了側
  // （`GR-17`）とすること（MUST）」 -- so the sweep is now two sweeps, and a
  // build that hands the whole mark to either row fails one of them.
  // ⭐ The clause this case presses, whole on one line (a wrapped quotation
  // latches nothing -- see section 8):
  // 「人が印を押したときに掴むのは、印の左半分なら開始側（表 T-023d の `GR-9`）、右半分なら終了側（同表の `GR-17`）とすること（MUST）」
  // ⛔⛔ AND A SECOND CLAUSE STOOD HERE UNTIL 2026-09-10, cited as the reason
  // the two cases above could press right OF the ink and still answer the
  // finish: 「印より右に残る当たり判定は終了側とすること（MUST）」. It is retired,
  // and the manuscript records it as retired rather than live -- 「⛔⛔ **2026-
  // 09-10 まで、ここに「印より右に残る当たり判定は終了側とすること（MUST）」が
  // 在った** —— **同日の裁定が当たり判定を印そのものと定め（本表の結びの上の段）、
  // 印より右に当たり判定が残らなくなったので、割り当てる相手が消えた。**」. ⇒ There
  // is no ground right of the ink for either dummy to answer on, which is what
  // the case above it now measures instead: past the ink, `GR-12`.
  // ⚠️ A CITATION THAT SURVIVES ONLY INSIDE A ⛔⛔ RETIREMENT NOTE STILL PASSES
  // check 42, because the words are still somewhere in `docs/spec` -- so the
  // check cannot catch this class of staleness and a reader has to.
  it('the ONE drawn mark answers the start on its left half and the finish on its right', () => {
    const inkFrom = PLAN_START_X + HIGH_ZOOM_PX_PER_DAY
    const inkTo = inkFrom + Math.min(HIGH_ZOOM_PX_PER_DAY, DRAWN_WIDTH_CAP)
    const middle = (inkFrom + inkTo) / 2
    for (let x = inkFrom; x < middle; x += 1) {
      expect(grabAt(HIGH_ZOOM_PX_PER_DAY, x), `x = ${x - inkFrom} into the mark`).toBe('GR-9')
    }
    for (let x = middle + 1; x <= inkTo; x += 1) {
      expect(grabAt(HIGH_ZOOM_PX_PER_DAY, x), `x = ${x - inkFrom} into the mark`).toBe('GR-17')
    }
  })
})

// ===========================================================================
// 5. The press lands on the Task it was aimed at
// ===========================================================================

describe('every answer above names the Task the press was on', () => {
  it('the plan side and the actual side both answer the same Task', () => {
    // ⛔ WHERE THE RIGHT-HAND PRESS STANDS. The ink at 1px a day is only
    // `Math.min(pxPerDay, S-180)` == 1px wide, so a press 3px out clears it
    // and lands on `GR-12` -- the PLAN side -- which would make this case
    // pass without ever pressing the actual side at all. The ink's own day
    // column (`GR-9`'s day, one pixel right of the plan start) is where the
    // actual side stands at this zoom.
    expect(press(LOW_ZOOM_PX_PER_DAY, PLAN_START_X - 3)?.item).toEqual({
      kind: 'task',
      taskUid: TASK_UID,
    })
    expect(press(LOW_ZOOM_PX_PER_DAY, PLAN_START_X + LOW_ZOOM_PX_PER_DAY)?.item).toEqual({
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
// ⚠️ RE-CUT 2026-09-10. This comment had been carrying S-90's outside-only
// allowance, which is how that row reads TODAY. The manuscript's sentence
// here is a MEASUREMENT
// taken on 2026-09-08, and it keeps the value S-90 carried on that day; the
// 2026-09-09 rulings that gave the plan only the outside of the end are what
// changed the number, and the same paragraph records that the swallowing
// 「これで構造から消える」. Restating a dated measurement in today's numbers is
// how a citation stops being one.
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
function selectedShortPlan(pxPerDay: number, days: number = SHORT_PLAN_DAYS): ScheduleGeometry {
  const base = notStartedTask(pxPerDay)
  const task = base.tasks[0]!
  const finishX = PLAN_START_X + pxPerDay * days
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

function grabOnShortPlan(pxPerDay: number, x: number, y: number, days?: number): GrabArea | null {
  return itemAtPointer(selectedShortPlan(pxPerDay, days), x, y, SLOP)?.grab ?? null
}

/**
 * The longest plan the manuscript's own measurement covers -- 「低倍率で 1 〜 8
 * 日の予定では」 -- which is the shortest one whose FINISH stands clear of both
 * dummies at 6px a day.
 */
const LONGEST_MEASURED_PLAN_DAYS = 8

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
    const answer = grabOnShortPlan(
      LOW_ZOOM_PX_PER_DAY,
      PLAN_START_X + 1,
      WHERE_THE_FADE_SQUARE_MEETS_THE_ACTUAL_BAND,
    )
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
    // ⛔⛔ THE PRESS MOVED ON 2026-09-10, AND THE RULING IS WHY. This case used
    // to press 3px INSIDE the plan bar's left end and ask for `GR-4`, on the
    // reading that `S-90` reached both ways from each end. The ruling of
    // 2026-09-09 took the inward hand away -- 「予定の端点（`GR-3` / `GR-4`）の
    // 掴み代は端の外側だけに取ること（MUST）」, ⛔ 「予定の端点を端の内側へ伸ばし
    // てはならない（MUST NOT）」 -- so the bar's whole inside now answers `GR-12`
    // and the finish's own ground is OUTSIDE its own edge.
    // ⚠️ AND A ONE-DAY PLAN HAS NONE OF IT AT THIS ZOOM: `GR-9` stands on the
    // working day after the plan start, which for a one-day plan is the very
    // column the finish's edge falls on, and its drawn ink covers everything
    // the finish would otherwise reach there. ⇒ The plan is drawn out to the
    // longest the manuscript measured, where the finish stands past both
    // dummies' ink.
    const finishX = PLAN_START_X + 6 * LONGEST_MEASURED_PLAN_DAYS
    expect(grabOnShortPlan(6, finishX + 3, MID_Y, LONGEST_MEASURED_PLAN_DAYS)).toBe('GR-4')
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
    [1, WHERE_THE_FADE_SQUARE_MEETS_THE_ACTUAL_BAND],
    [2, MID_Y],
    [2, WHERE_THE_FADE_SQUARE_MEETS_THE_ACTUAL_BAND],
  ])('the dummy answers on its own day column at %ipx a day (y = %i)', (pxPerDay, y) => {
    const onTheDayColumn = PLAN_START_X + pxPerDay
    const answer = grabOnShortPlan(pxPerDay, onTheDayColumn, y)
    expect(ACTUAL_DUMMY_ROWS).toContain(answer)
  })
})

// ===========================================================================
// 6a. ⭐ R-34 -- the holds are NESTED, not cut into an upper and a lower lane
// ===========================================================================
//
// ⛔ THE DEFECT THIS SECTION IS THE ANCHOR FOR. The round of 2026-09-09 that
// settled the fence considered splitting the plan band into two lanes, one for
// the plan's rows and one for the actual's, and 利用者 rejected the shape:
// 「レクタングル系を上下に分けるのは却下。」 ⇒ The vertical is NESTED instead --
// the plan's band holds the actual's, which holds the line's -- so the plan
// keeps a margin at the TOP and at the BOTTOM of its own band, and neither
// margin belongs to the actual.
//
// ⭐ WHAT MAKES THIS RED IF THE LANES COME BACK. A lane split gives one of the
// two margins to the actual rows: press the top margin and the bottom margin
// on the same figure and one of them answers a dummy. Nesting answers a
// plan-side row at both, and the actual row only between them.

describe('R-34: the overlapping holds are nested, so the plan keeps both margins', () => {
  /** Above the actual band and inside the plan's -- 「外側の縁が必ず残る」. */
  const TOP_MARGIN_Y = MID_Y - ACTUAL_BAND_HEIGHT / 2 - 2
  const BOTTOM_MARGIN_Y = MID_Y + ACTUAL_BAND_HEIGHT / 2 + 2

  it('⭐ the fixture really has a margin on both sides of the actual band', () => {
    // ⚠️ A PREMISE. Without it the two cases below could pass on a figure whose
    // actual band filled the plan's, where no margin exists to be claimed.
    expect(TOP_MARGIN_Y).toBeGreaterThan(BAND_TOP)
    expect(BOTTOM_MARGIN_Y).toBeLessThan(BAND_BOTTOM)
    expect(ACTUAL_BAND_HEIGHT).toBeLessThan(BAND_BOTTOM - BAND_TOP)
  })

  it('⛔ MUST NOT: neither margin answers a dummy row', () => {
    const onTheDummysDay = PLAN_START_X + HIGH_ZOOM_PX_PER_DAY + 3
    for (const y of [TOP_MARGIN_Y, BOTTOM_MARGIN_Y]) {
      const answer = itemAtPointer(
        notStartedTask(HIGH_ZOOM_PX_PER_DAY),
        onTheDummysDay,
        y,
        SLOP,
      )?.grab ?? null
      expect(ACTUAL_DUMMY_ROWS, `y = ${y}`).not.toContain(answer)
    }
  })

  it('⭐ and the same column between the two margins does answer a dummy', () => {
    // ⚠️ THE CONTRAST. Without it the case above would pass on a build that had
    // lost the dummies altogether, which is the opposite defect.
    const onTheDummysDay = PLAN_START_X + HIGH_ZOOM_PX_PER_DAY + 3
    expect(ACTUAL_DUMMY_ROWS).toContain(grabAt(HIGH_ZOOM_PX_PER_DAY, onTheDummysDay))
  })
})

// ===========================================================================
// 7. GR-8 -- the resume icon is aimed at, not traced
// ===========================================================================
//
// ⚠️ WHY THIS ROW IS ANSWERED IN THIS FILE. It belongs to the same table and to
// the same round of rulings as the fence above, and it takes its box from a row
// the file already has to read -- GR-8's own words are 「新しい設定値を立てない
// —— 進捗マーカー（`GR-7`）と同じ寸法をそのまま使う」.
// ⛔ No new file was raised for it, and no new style of case: the fixture is
// fixed data copied from the tables, the way section 2's is.
//
// ⛔ WHAT IS NOT CLAIMED HERE: where the icon is DRAWN. LF-13 places the bent
// arrow and `S-25` shrinks it when the resume day is undecided; this file is
// handed a figure and asks only which row a press on it answers.

/**
 * `S-22` (`markerSize`) of 表 T-201, read out of the manuscript rather than
 * typed: it is the marker's own side AND, since 2026-09-09, GR-8's hit box.
 */
const MARKER_SIZE = ((): number => {
  const row = specTable('T-201').rows.find((one) => one.id === 'S-22')
  if (row === undefined) throw new Error('table T-201 has no row S-22')
  const found = (row.by['既定値'] ?? '').match(/\d+(?:\.\d+)?/)
  if (found === null) throw new Error(`table T-201 row S-22 has no number: ${row.cells.join(' ')}`)
  return Number(found[0])
})()

/**
 * `S-6` (`actualMin`) of 表 T-201 -- the actual bar's own floor, which section
 * 9 measures the dependency line's band against.
 */
const ACTUAL_MIN = ((): number => {
  const row = specTable('T-201').rows.find((one) => one.id === 'S-6')
  if (row === undefined) throw new Error('table T-201 has no row S-6')
  const found = (row.by['既定値'] ?? '').match(/\d+(?:\.\d+)?/)
  if (found === null) throw new Error(`table T-201 row S-6 has no number: ${row.cells.join(' ')}`)
  return Number(found[0])
})()

/** The marker's circle -- `S-22` across, so this is its half. */
const MARKER_RADIUS = MARKER_SIZE / 2
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
          // ⭐⭐ HALF OF `S-22`, WHICH IS THE ROAD THE SIZE TRAVELS. GR-8's own
          // words: 「新しい設定値を立てない —— 進捗マーカー（`GR-7`）と同じ寸法
          // をそのまま使う」, and `S-22` is a STORED setting, so it cannot ride
          // on `PointerSlop` the way table T-206's unstored reaches do -- it
          // reaches the hit test on the geometry, beside the paths it belongs
          // to. ⛔ `MARKER_SIZE` is read from 表 T-201 above and never typed.
          hitHalf: MARKER_SIZE / 2,
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

describe('GR-8 takes S-22 about the icon, not the icon\'s own outline', () => {
  // ⭐ FR-043's own sentence for this row, whole on one line (see section 8 for
  // why a wrapped quotation latches nothing):
  // 「再開アイコンの当たり判定は `_assets/tbl-settings.md` の 表 T-201 の `S-22`（進捗マーカーと同寸）とすること（MUST）」
  // ⭐ CONTROL. `S-22` is 16 wide and the drawn arrow's box is about 13 by the
  // manuscript's own measurement; a build tracing the outline answers null
  // inside the box the row asks for.
  // ⚠️ Pressed to the RIGHT of the icon, because the left half of the box lies
  // under `GR-7`, which stands above this row in the printed order.
  it('reaches past the drawn figure, out to half of S-22 on the right', () => {
    const halfWidth = MARKER_SIZE / 2
    expect(grabOnSuspended(ICON_CENTRE_X + halfWidth - 1, ICON_CENTRE_Y)).toBe('GR-8')
  })

  // ⭐ CONTROL, AND THE HALF THAT THE RULING OF 2026-09-09 IS ABOUT. The box
  // stops at `S-22`. ⛔ A build handing GR-8 the dummies' own 30px width
  // instead answers `GR-8` here, because 30 is very nearly twice 16 and this
  // press stands well outside the smaller box.
  it('and stops at S-22, so nothing beyond the row answers', () => {
    const halfWidth = MARKER_SIZE / 2
    expect(grabOnSuspended(ICON_CENTRE_X + halfWidth + 2, ICON_CENTRE_Y)).not.toBe('GR-8')
  })

  // ⭐ CONTROL. The vertical is the same row's: `S-22` is a SQUARE (「進捗マー
  // カーと同寸」), and the drawn arrow is a few pixels tall.
  it('reaches half of S-22 up and down as well', () => {
    const halfHeight = MARKER_SIZE / 2
    expect(grabOnSuspended(ICON_CENTRE_X, ICON_CENTRE_Y - halfHeight + 1)).toBe('GR-8')
    expect(grabOnSuspended(ICON_CENTRE_X, ICON_CENTRE_Y + halfHeight - 1)).toBe('GR-8')
  })

  // ⛔ THE OTHER HALF OF THE SAME RULING, VERTICALLY. The square `S-22` names
  // reaches 8px up and down; a taller box would answer past that.
  it('⛔ and stops there vertically too, where the old S-93 box did not', () => {
    const halfHeight = MARKER_SIZE / 2
    expect(grabOnSuspended(ICON_CENTRE_X, ICON_CENTRE_Y - halfHeight - 2)).not.toBe('GR-8')
    expect(grabOnSuspended(ICON_CENTRE_X, ICON_CENTRE_Y + halfHeight + 2)).not.toBe('GR-8')
  })

  // ⭐ CONTROL, AND THE BOUNDARY WITH `GR-7`.
  // ⛔ THE TWO ROWS DO NOT SHARE GROUND HERE. `S-22` reaches 8, and the icon on
  // this fixture stands clear of the marker's circle, so the pixel one past the
  // circle answers nothing at all -- which is what the ruling bought: 「再開矢
  // 印のつかみシロが広い 進捗マーカーとサイズを合わせろ。」
  // ⚠️ AND THE PRINTED ORDER TURNED ROUND, so a case that pressed shared ground
  // would now expect the ICON: `GR-8` stands ABOVE `GR-7` in table T-023d since
  // 2026-09-10. ⛔ READ OFF THE MANUSCRIPT, never typed, so a round that moves
  // the rows again takes this case with it.
  it('the progress marker keeps its own circle, and GR-8 answers on its own box', () => {
    const order = specTable('T-023d').rows.map((one) => one.id)
    expect(order.indexOf('GR-8'), 'table T-023d prints GR-8 above GR-7')
      .toBeLessThan(order.indexOf('GR-7'))
    const iconBoxLeft = ICON_CENTRE_X - MARKER_SIZE / 2
    expect(iconBoxLeft, 'S-22 does not reach back over the marker on this fixture')
      .toBeGreaterThan(MARKER_CENTRE_X + MARKER_RADIUS)
    expect(grabOnSuspended(MARKER_CENTRE_X + MARKER_RADIUS, MID_Y)).toBe('GR-7')
    expect(grabOnSuspended(iconBoxLeft + 1, ICON_CENTRE_Y)).toBe('GR-8')
  })
})

// ===========================================================================
// 8. ⭐ R-39 -- a milestone carries no resume icon at all
// ===========================================================================
//
// 利用者の裁定 2026-09-09, 逐語「マイルストーンは再開が無い。 マイルストーンは未着手
// でも選択は1か所(開始・終了で分けない) 再開矢印のつかみシロが広い 進捗マーカーと
// サイズを合わせろ。」⇒ ⛔ 「マイルストーンに再開アイコン（`GR-8`）を当ててはならない
// （MUST NOT）」, whose reason is 「点は期間を持たないので、中断も再開も無い」, and
// beside it ⭐ 「`GR-18` は 1 か所とすること（MUST）。開始側と終了側に分けては
// ならない（MUST NOT）」.
//
// ⭐⭐ THE FOUR CLAUSES AGAIN, EACH WHOLE ON ONE LINE. A quotation broken across
// two comment lines has a `// ` inside it, so it latches nothing; the wrapped
// copies above are for reading and these are for holding (measured 2026-09-10).
// 「マイルストーンに再開アイコン（`GR-8`）を当ててはならない（MUST NOT）」
// 「⭐ **`GR-18` は 1 か所とすること（MUST）。開始側と終了側に分けてはならない（MUST NOT）」
// 「⭐⭐ **本行は 1 か所である。開始側と終了側に分けてはならない（MUST NOT）」
// 「下の段の「印を左右に割る」は、マイルストーンのダミーには当てないこと（MUST NOT）」
//
// ⚠️ THE FIGURE IS HANDED IN, NOT DERIVED. This section asks what a press
// answers when a resume figure IS present on a milestone -- which is the shape
// a build that had not read the MUST NOT would produce. A fixture that simply
// left the figure out would pass on any build at all.

/** A milestone carrying a marker and a resume figure, and its single dummy. */
function milestoneWithAResumeFigure(): ScheduleGeometry {
  const base = suspendedTask()
  const task = base.tasks[0]!
  return {
    ...base,
    tasks: [
      {
        ...task,
        shapeKind: 'milestone',
        plan: null,
        milestoneFigure: {
          form: 'outline',
          points: [
            { x: PLAN_START_X, y: MID_Y - ACTUAL_BAND_HEIGHT },
            { x: PLAN_START_X + ACTUAL_BAND_HEIGHT, y: MID_Y },
            { x: PLAN_START_X, y: MID_Y + ACTUAL_BAND_HEIGHT },
            { x: PLAN_START_X - ACTUAL_BAND_HEIGHT, y: MID_Y },
          ],
        },
        dummies: [
          {
            grab: 'GR-18',
            at: { x: PLAN_START_X + HIGH_ZOOM_PX_PER_DAY, y: MID_Y },
            ink: {
              x: PLAN_START_X + HIGH_ZOOM_PX_PER_DAY,
              y: MID_Y - ACTUAL_BAND_HEIGHT / 2,
              width: Math.min(HIGH_ZOOM_PX_PER_DAY, DRAWN_WIDTH_CAP),
              height: ACTUAL_BAND_HEIGHT,
            },
          },
        ],
      },
    ],
  }
}

describe('R-39: a milestone has no GR-8, and one GR-18 rather than two ends', () => {
  const grabOnMilestone = (x: number, y: number): GrabArea | null =>
    itemAtPointer(milestoneWithAResumeFigure(), x, y, SLOP)?.grab ?? null

  it('⛔ MUST NOT: no press anywhere on the resume figure answers GR-8', () => {
    // ⭐ SWEPT, not sampled at one pixel: the MUST NOT is about the row being
    // reachable at all on this shape, so a build that kept a smaller box would
    // still be caught.
    const half = MARKER_SIZE / 2
    for (let x = ICON_CENTRE_X - half; x <= ICON_CENTRE_X + half; x += 1) {
      for (const y of [ICON_CENTRE_Y - half + 1, ICON_CENTRE_Y, ICON_CENTRE_Y + half - 1]) {
        expect(grabOnMilestone(x, y), `x = ${x}, y = ${y}`).not.toBe('GR-8')
      }
    }
  })

  it('⭐ the same sweep DOES answer GR-8 on a bar-shaped Task -- the contrast', () => {
    // ⚠️ Without this the case above would pass on a build that had lost GR-8
    // everywhere, which is the opposite fault.
    const answers: string[] = []
    const half = MARKER_SIZE / 2
    for (let x = ICON_CENTRE_X - half; x <= ICON_CENTRE_X + half; x += 1) {
      const grab = grabOnSuspended(x, ICON_CENTRE_Y)
      if (grab !== null) answers.push(grab)
    }
    expect(answers).toContain('GR-8')
  })

  it('⭐ MUST: the milestone carries exactly one dummy, not a start and a finish', () => {
    const dummies = milestoneWithAResumeFigure().tasks[0]!.dummies
    expect(dummies.map((one) => one.grab)).toEqual(['GR-18'])
  })
})

// ===========================================================================
// 9. ⭐ R-38 -- a dependency line beats the plan body it is drawn over
// ===========================================================================
//
// 利用者の裁定 2026-09-09, 逐語「依存線の優先度を上げてよい。ただし、依存線の縦幅は
// 実績の縦幅より狭くしろ。」⇒ 「依存線（`GR-13`）を予定バー本体（`GR-12`）より上に置く
// こと（MUST）。ただし線の掴み代の縦幅が、実績の縦幅の下限（`S-6`）より狭いこと
// （MUST）」 -- 「狭くなければ、線が実績の帯を丸ごと奪う」.
// ⭐ Whole on one line, for the reason given in section 8 above:
// 「依存線（`GR-13`）を予定バー本体（`GR-12`）より上に置くこと（MUST）」
//
// ⚠️ WHY THE FIGURE IS ASSEMBLED HERE. Table T-222's router keeps its routes
// off the plan bodies, so a real layout does not stage this contest; measured
// on this tree, RP-1, RP-3, RP-4 and RP-5 all clear every bar of the unit
// fixtures. The rule is still a rule about what a press answers where the two
// DO meet, and this figure puts them there.

describe('R-38: the dependency line answers where it runs over a plan body', () => {
  const withALineAcrossTheBar = (): ScheduleGeometry => {
    const base = notStartedTask(HIGH_ZOOM_PX_PER_DAY)
    return {
      ...base,
      tasks: [{ ...base.tasks[0]!, dummies: [], fadeHandles: [] }],
      dependencies: [
        {
          predecessorUid: TASK_UID,
          successorUid: TASK_UID + 1,
          linkType: 1,
          pattern: 'RP-1',
          points: [
            { x: PLAN_START_X + 100, y: MID_Y },
            { x: PLAN_FINISH_X + 100, y: MID_Y },
          ],
        },
      ],
    }
  }

  it('⭐ MUST: a press on the line answers the dependency, not the plan body', () => {
    // ⛔ RED BEFORE THE RULING: GR-13 stood below GR-12, so a line drawn over a
    // bar could not be picked up at all -- 「タスクと重なっていない部分を掴む」
    // was the only way, and there is none here.
    const hit = itemAtPointer(withALineAcrossTheBar(), PLAN_START_X + 150, MID_Y, SLOP)
    expect(hit?.item).toEqual({
      kind: 'dependency',
      predecessorUid: TASK_UID,
      successorUid: TASK_UID + 1,
    })
    expect(hit?.grab).toBe('GR-13')
  })

  it('⭐ MUST: and the line\'s band is narrower than the actual bar\'s floor', () => {
    // `S-137` reaches to EITHER side of the line, so its band is twice the row.
    // ⚠️ Measured against `S-6` itself, which is what the clause names.
    expect(NOT_STORED_SIZES['S-137'] * 2).toBeLessThan(ACTUAL_MIN)
    // ⭐ THE CONTRAST, as a press: a hair outside that band the plan body has
    // the ground back, so the line has not swallowed the bar.
    const geometry = withALineAcrossTheBar()
    const justOutside = MID_Y + NOT_STORED_SIZES['S-137'] + 2
    expect(itemAtPointer(geometry, PLAN_START_X + 150, justOutside, SLOP)?.grab).toBe('GR-12')
  })
})

// ===========================================================================
// 8. GR-5 / GR-6 -- the actual's two ends standing on one day
// ===========================================================================
//
// ⚠️ WHY THIS SECTION IS HERE AND NOT IN A FILE OF ITS OWN. It is the SAME
// ruling of 2026-09-08 and the same table's closing rules -- section 1 already
// holds five of them and now holds this one too -- and it is the same unit and
// the same fixture style. A file of its own would split one ruling in two.
//
// ⛔⛔ NOTHING UNDER tests/ HELD THIS CLAUSE BEFORE. Measured on this tree by
// breaking the unit on purpose: with the gate that stands the start down made
// never to fire, `npx vitest run` answered 7223 passed and 0 failed. That is
// why the ledger could record the actual side as done and be believed.
//
// ⛔⛔ WHAT THIS SECTION DOES NOT CLAIM, AND THE MEASUREMENT THAT SAYS SO.
// The clause names 「2 つの端点が同じ日に立つとき」, and the geometry this unit
// is handed carries PIXELS, not days: an actual bar's span reaches this file
// as a width, and one day's width is not among the values `ScheduleGeometry`
// or `PointerSlop` carry. So the case pinned below is the one the unit CAN
// tell -- a bar measuring nothing across. ⚠️ Measured on the shipped build
// (2026-09-08, file://, 1920x1080, 6px a day), a Task whose actual covers ONE
// DAY (`actualDuration` 1, drawn 6px wide, starting three days right of the
// plan start so no plan-side row can reach it): all seven pixels of the drawn
// bar answered `GR-5`, and `GR-6` answered none of them. ⇒ The clause is not
// met there, and closing it needs a day's width to reach this unit -- which is
// another unit's file and another round, the same hole the unit's own note
// records for the plan's half (S-49's floor hides it there).

/** The actual bar's own band -- inside the plan band, so MID_Y is on both. */
const ACTUAL_TOP = 104
const ACTUAL_BOTTOM = 116

/**
 * Where the actual bar begins: far enough right of `PLAN_START_X` that neither
 * `GR-3`'s reach (`S-90`) nor the fence can answer any press below, and far
 * enough left of `PLAN_FINISH_X` that `GR-4`'s cannot either.
 *
 * ⭐ THAT DISTANCE IS THE POINT. On a Task whose actual starts ON the plan
 * start, `GR-3` stands above `GR-5` and takes the pixel the collapsed bar
 * occupies, so a case built there would measure the fence rather than this
 * rule.
 */
const ACTUAL_START_X = 300

/**
 * One rectangle-shaped Task with an actual bar `spanPx` wide, and no dummy --
 * `FR-043` draws those only while nothing is started.
 *
 * ⚠️ `marker` stays null for the reason `notStartedTask` gives: `GR-7` has no
 * stake in this rule and should not answer any press by accident.
 */
function startedTask(spanPx: number): ScheduleGeometry {
  const base = notStartedTask(HIGH_ZOOM_PX_PER_DAY)
  const task = base.tasks[0]!
  return {
    ...base,
    tasks: [
      {
        ...task,
        dummies: [],
        actual: {
          form: 'outline',
          points: [
            { x: ACTUAL_START_X, y: ACTUAL_TOP },
            { x: ACTUAL_START_X + spanPx, y: ACTUAL_TOP },
            { x: ACTUAL_START_X + spanPx, y: ACTUAL_BOTTOM },
            { x: ACTUAL_START_X, y: ACTUAL_BOTTOM },
          ],
        },
      },
    ],
  }
}

function grabOnActual(spanPx: number, x: number): GrabArea | null {
  return itemAtPointer(startedTask(spanPx), x, MID_Y, SLOP)?.grab ?? null
}

/** Several days across, so the two ends stand days apart. */
const MANY_DAYS_PX = 36

/**
 * Days apart, but NARROWER THAN TWICE `S-91`, so the two allowances overlap
 * the whole bar.
 *
 * ⭐⭐ THIS IS THE WIDTH THAT SEPARATES THE TWO CANDIDATE FIXES. Standing the
 * start down wherever the finish also reaches -- rather than where the two
 * ends stand on one day -- looks right on a collapsed bar and takes the start
 * away here, and the unit's own note records that measurement. A case at
 * `MANY_DAYS_PX` alone cannot tell the two apart.
 *
 * ⚠️ `notStartedTask`'s zoom does not reach this fixture: the dummies it
 * places are cleared, so nothing below is a function of `pxPerDay`.
 */
const TWO_DAYS_PX = NOT_STORED_SIZES['S-91']

describe('where the actual\'s two ends stand on one day, the finish is what answers', () => {
  // ⭐⭐ THE RULE ITSELF. `GR-5` stands ABOVE `GR-6` in table T-023d's printed
  // order and both allowances reach the one pixel a collapsed bar occupies, so
  // a build that let the order settle it answers the START here -- which is
  // exactly what the clause's own MUST NOT forbids.
  it('answers the finish on a bar that measures nothing across', () => {
    expect(grabOnActual(0, ACTUAL_START_X)).toBe('GR-6')
  })

  // ⛔ AND THE START ANSWERS NOWHERE ON IT. Pressed on either side of the one
  // pixel as well, so a build that merely shifted the start's reach by a pixel
  // does not pass by landing next door.
  it('never answers the start anywhere on that bar', () => {
    for (const at of [ACTUAL_START_X - 1, ACTUAL_START_X, ACTUAL_START_X + 1]) {
      expect(grabOnActual(0, at)).not.toBe('GR-5')
    }
  })

  // ⭐ CONTROL, AND THE HALF THE CLAUSE PROTECTS. The purpose in the ruling's
  // own words is 「同じ日に潰れた予定や実績を、もう一度引き伸ばせること」, so
  // the finish has to be REACHABLE, not merely preferred: a build that refused
  // both ends on a collapsed bar leaves the plan body underneath and the bar
  // can never be stretched again.
  it('does not fall through to the plan bar underneath', () => {
    expect(grabOnActual(0, ACTUAL_START_X)).not.toBe('GR-12')
  })

  // ⭐⭐ CONTROL, AND THE REASON THE TABLE'S ORDER IS NOT REWRITTEN. Where the
  // two ends stand days apart both answer their own row. A build that lifted
  // `GR-6` above `GR-5` -- the fix the unit's own note refuses -- takes the
  // start away here, because on any actual narrower than twice `S-91` the two
  // allowances already cover the whole bar.
  it('leaves both ends of a bar of several days answering their own rows', () => {
    expect(grabOnActual(MANY_DAYS_PX, ACTUAL_START_X)).toBe('GR-5')
    expect(grabOnActual(MANY_DAYS_PX, ACTUAL_START_X + MANY_DAYS_PX)).toBe('GR-6')
  })

  // ⭐ CONTROL. The start keeps `S-91`'s reach on a bar whose ends are apart,
  // so the case above is not passing merely because one pixel happens to land
  // on an edge.
  it('keeps S-91\'s reach on the start of a bar of several days', () => {
    const reach = NOT_STORED_SIZES['S-91']
    expect(grabOnActual(MANY_DAYS_PX, ACTUAL_START_X + reach)).toBe('GR-5')
  })

  // ⭐⭐ THE CASE THAT REFUSES THE WRONG FIX. On a bar this narrow the finish's
  // allowance already covers the start's own edge, so a build that preferred
  // the finish WHEREVER THE TWO OVERLAP -- instead of where the two ends stand
  // on one day -- answers `GR-6` here and takes the start off every actual of
  // a few days. Measured: with `GR-6` lifted above `GR-5`, the case above at
  // `MANY_DAYS_PX` stays green and this one goes red.
  it('still answers the start on a bar narrower than twice S-91', () => {
    expect(grabOnActual(TWO_DAYS_PX, ACTUAL_START_X)).toBe('GR-5')
  })
})

// ===========================================================================
// 9. GR-3 / GR-4 -- the PLAN's two ends standing on one day
// ===========================================================================
//
// ⚠️ THE OTHER HALF OF SECTION 8's CLAUSE, and it was held by nothing. The
// ruling names three pairs -- 「予定の 2 端（`GR-3` と `GR-4`）にも、実績の 2 端
// （`GR-5` と `GR-6`）にも、ダミーの 2 端（`GR-9` と `GR-17`）にも、同じように
// 当てはまる（MUST）」 -- and section 8 pins the middle pair only. Section 1
// already quotes the clause, so nothing new is quoted here.
//
// ⛔⛔ WHY THE UNIT COULD NOT ANSWER IT FROM A BOX. S-49 (`minShapeWidth`) is
// the floor FR-001's RATIONALE puts under a Task of zero duration, and it is
// applied before the geometry reaches `item-hit-area.ts` -- so a plan whose
// start and finish are ONE DAY arrives as wide as a plan that really spans that
// many pixels, and a gate reading the drawn width can never fire on it. ⭐ The
// unit is now handed `TaskGeometry.planEndsStandOnOneDay`, decided in DAYS by
// `ScheduleLayout`, and these cases press the fact rather than the width.
//
// ⛔⛔ NOTHING UNDER tests/ HELD THIS HALF BEFORE. Measured on this tree by
// breaking the unit on purpose, three ways:
//   - the day gate made NEVER to fire, which is the state that shipped: 2
//     failed and 7267 passed, and both failures are the first two cases below.
//   - the day gate made ALWAYS to fire, so `GR-3` answers nowhere: 14 failed
//     across 5 files, two of them controls below. That is the count standing
//     behind the ruling's purpose not being bought by taking the start away
//     everywhere.
//   - the gate written as a WIDTH (`box.width <= slop.planEndpoint`), the shape
//     of fix this section exists to refuse: 1 failed, and it is the
//     `NOT_ONE_DAY` case alone. ⇒ Without that one case a build reading the
//     clause off pixels would pass the whole suite.
//
// ⚠️ WHAT THIS SECTION DOES NOT CLAIM. It says nothing about which end wins on
// a plan of several days whose two allowances overlap: no row settles that, and
// the case below at `NOT_ONE_DAY` is the control that keeps the start reachable
// there.

/**
 * What S-49's floor draws a zero-duration plan at -- a width like any other by
 * the time this unit sees it.
 *
 * ⭐⭐ THE FIGURE IS DELIBERATELY UNREMARKABLE, and the case at `NOT_ONE_DAY`
 * below is why: the SAME width is handed in with the fact set the other way, so
 * a build that answered the clause by comparing the width against S-49, against
 * `S-90` or against one day's pixels fails there while passing here.
 */
const FLOORED_PLAN_PX = 6

/**
 * One rectangle-shaped Task drawn `widthPx` across, saying whether its plan's
 * two ends stand on one day.
 *
 * ⚠️ THE DUMMIES COME FROM THE BASE AT THE HIGH ZOOM, so `GR-9` stands a whole
 * day's width right of the plan start and its drawn ink begins well past every
 * press below. Section 3 is where
 * the fence between them is measured; a dummy under one of these presses would
 * measure that rule instead of this one.
 */
function planEndingWhereItBegan(widthPx: number, oneDay: boolean): ScheduleGeometry {
  const base = notStartedTask(HIGH_ZOOM_PX_PER_DAY)
  const task = base.tasks[0]!
  const finishX = PLAN_START_X + widthPx
  return {
    ...base,
    tasks: [
      {
        ...task,
        planEndsStandOnOneDay: oneDay,
        plan: {
          form: 'outline',
          points: [
            { x: PLAN_START_X, y: BAND_TOP },
            { x: finishX, y: BAND_TOP },
            { x: finishX, y: BAND_BOTTOM },
            { x: PLAN_START_X, y: BAND_BOTTOM },
          ],
        },
      },
    ],
  }
}

const ONE_DAY = true
const NOT_ONE_DAY = false

function grabOnPlan(widthPx: number, oneDay: boolean, x: number): GrabArea | null {
  return itemAtPointer(planEndingWhereItBegan(widthPx, oneDay), x, MID_Y, SLOP)?.grab ?? null
}

describe('where the plan\'s two ends stand on one day, the finish is what answers', () => {
  // ⭐⭐ THE RULE ITSELF. `GR-3` stands ABOVE `GR-4` in table T-023d's printed
  // order and both reach the plan start's own pixel, so a build that lets the
  // order settle it answers the START here -- which the clause's own MUST NOT
  // forbids: 「開始側が本表で上に在ることを理由に、開始側を掴ませてはならない」.
  it('answers the finish on the collapsed bar\'s own right edge', () => {
    // ⛔⛔ THE PIXEL PRESSED MOVED ON 2026-09-10, AND THE RULING IS WHY. This
    // case pressed the plan START's own pixel and asked for `GR-4`, on the
    // reading that `S-90` reached both ways from each end -- so where the two
    // ends collapse onto one day the finish's reach covered the start's pixel.
    // The ruling of 2026-09-09 took the inward hand away: 「予定の端点（`GR-3` /
    // `GR-4`）の掴み代は端の外側だけに取ること（MUST）」, ⛔ 「予定の端点を端の
    // 内側へ伸ばしてはならない（MUST NOT）」. ⇒ The finish's ground is now
    // OUTSIDE its own edge, and `S-49` floors the drawn width so that edge is
    // still a few pixels from the start's -- which is the ground pressed here.
    // ⭐ THE CLAUSE THIS SECTION HOLDS IS UNTOUCHED: 「同じ日に潰れた予定や実績
    // を、もう一度引き伸ばせること」 is what a reachable FINISH is for, and the
    // case below shows the START answers nowhere at all.
    expect(grabOnPlan(FLOORED_PLAN_PX, ONE_DAY, PLAN_START_X + FLOORED_PLAN_PX)).toBe('GR-4')
  })

  // ⛔ AND THE START ANSWERS NOWHERE ON IT. Every pixel `S-90` reaches to the
  // left of the plan start, and every pixel of the drawn bar, so a build that
  // merely shifted the start's reach by a pixel does not pass by landing next
  // door.
  it('never answers the start anywhere the bar or its allowance reaches', () => {
    const reach = NOT_STORED_SIZES['S-90']
    for (let at = PLAN_START_X - reach; at < PLAN_START_X + FLOORED_PLAN_PX; at++) {
      expect(grabOnPlan(FLOORED_PLAN_PX, ONE_DAY, at)).not.toBe('GR-3')
    }
  })

  // ⭐ CONTROL, AND THE HALF THE CLAUSE PROTECTS. The purpose in the ruling's
  // own words is 「同じ日に潰れた予定や実績を、もう一度引き伸ばせること」, so the
  // finish has to be REACHABLE and not merely preferred: a build that refused
  // both ends on a collapsed plan leaves only the body, and the bar can never
  // be stretched again.
  it('does not fall through to the plan body on that edge', () => {
    expect(grabOnPlan(FLOORED_PLAN_PX, ONE_DAY, PLAN_START_X + FLOORED_PLAN_PX)).not.toBe('GR-12')
  })

  // ⭐⭐ THE CASE THAT REFUSES THE WRONG FIX. The SAME drawn width, with the two
  // ends days apart -- which is what a low zoom makes of a plan of several days.
  // A build that read the clause off the width (against S-49, against `S-90`,
  // or against one day's pixels) answers `GR-4` here and takes the start off
  // every short plan at every low zoom.
  it('keeps the start on a bar of the same width whose ends are days apart', () => {
    expect(grabOnPlan(FLOORED_PLAN_PX, NOT_ONE_DAY, PLAN_START_X)).toBe('GR-3')
  })

  // ⭐ CONTROL. The wide plan of section 2 answers both of its ends as it did
  // before, so the gate is not quietly firing on every Task.
  it('leaves both ends of a plan of many days answering their own rows', () => {
    expect(grabAt(HIGH_ZOOM_PX_PER_DAY, PLAN_START_X)).toBe('GR-3')
    expect(grabAt(HIGH_ZOOM_PX_PER_DAY, PLAN_FINISH_X)).toBe('GR-4')
  })

  // ⭐⭐ CONTROL, AND THE SHAPE THAT IS ALWAYS ONE DAY. A milestone's start and
  // finish are the same day by definition, so it carries the fact set -- and
  // `GR-15`'s row says it has no plan ENDS at all (「マイルストーンは実績バーを
  // 持たないので `GR-5` / `GR-6` / `GR-17` に当たらない」 is the actual's half of
  // the same absence). The figure must still be picked up by `GR-12`. A build
  // that gated the SHAPE instead of the ROW answers null here and leaves a
  // milestone unmovable.
  it('leaves a milestone\'s figure answering GR-12', () => {
    const base = planEndingWhereItBegan(FLOORED_PLAN_PX, ONE_DAY)
    const task = base.tasks[0]!
    const asMilestone: ScheduleGeometry = {
      ...base,
      tasks: [{ ...task, shapeKind: 'milestone' }],
    }
    expect(itemAtPointer(asMilestone, PLAN_START_X + 2, MID_Y, SLOP)?.grab).toBe('GR-12')
  })
})

// ===========================================================================
// 10. ⭐ The plan's two ends reach OUTWARDS ONLY
// ===========================================================================
//
// 利用者の裁定 2026-09-09, 逐語「予定開始はレクタングルの左外側、実績開始はレク
// タングル左内側をつかみシロにする 予定より実績の方を優先する ただし、予定の方が
// 実績より縦幅が大きい。」
//
// ⛔⛔ WHY THIS SECTION WAS RAISED ON 2026-09-10. Three cases of sections 6 and
// 9 were pointed at new pixels that day because this rule had taken the ground
// they pressed away from `GR-3` and `GR-4`. ⚠️ MEASURED BEFORE IT WAS WRITTEN:
// giving `GR-4`'s hand back BOTH sides of the finish -- the reading the ruling
// struck down -- left `npx vitest run` at ZERO red across 195 files. ⇒ The rule
// the whole round leant on was held by nothing, and rule 04 section 3.5 admits
// a unit case for exactly that.

describe('the plan\'s ends reach outside the bar and never inside it', () => {
  /** Well clear of both dummies of the section-2 fixture, which stand at +24. */
  const A_FEW_PX = 3

  // ⛔ THE MUST NOT ITSELF, at the FINISH: 「予定の端点を端の内側へ伸ばしては
  // ならない（MUST NOT）」. ⭐ Inside the bar is the actual's ground and the
  // body's -- 「端の外は予定、端の内は実績とすること（MUST）」 -- and this Task
  // carries no actual bar, so what is left there is `GR-12`.
  // ⭐ The whole clause on one line, since the half above latches nothing:
  // 「境目はバーの端であること（MUST）。端の外は予定、端の内は実績とすること（MUST）」
  it('leaves the pixels inside the finish to GR-12, not to GR-4', () => {
    expect(grabAt(HIGH_ZOOM_PX_PER_DAY, PLAN_FINISH_X - A_FEW_PX)).toBe('GR-12')
  })

  // ⭐ CONTROL. The same distance on the OTHER side of the same edge is the
  // finish's own: 「予定の端点（`GR-3` / `GR-4`）の掴み代は端の外側だけに取る
  // こと（MUST）」. Without this pair the case above would be equally green over
  // a build that had lost `GR-4` altogether.
  it('keeps the same distance outside the finish for GR-4', () => {
    expect(grabAt(HIGH_ZOOM_PX_PER_DAY, PLAN_FINISH_X + A_FEW_PX)).toBe('GR-4')
  })

  // ⛔ AND THE SAME MUST NOT AT THE START. ⚠️ Asked at the HIGH zoom, where
  // `GR-9` stands a whole day (24px) right of the plan start, so three pixels
  // in is clear of the dummies' own boxes and the body is what is left.
  it('leaves the pixels inside the start to GR-12, not to GR-3', () => {
    expect(grabAt(HIGH_ZOOM_PX_PER_DAY, PLAN_START_X + A_FEW_PX)).toBe('GR-12')
  })

  // ⭐ CONTROL, the start's own half of the pair.
  it('keeps the same distance outside the start for GR-3', () => {
    expect(grabAt(HIGH_ZOOM_PX_PER_DAY, PLAN_START_X - A_FEW_PX)).toBe('GR-3')
  })
})
