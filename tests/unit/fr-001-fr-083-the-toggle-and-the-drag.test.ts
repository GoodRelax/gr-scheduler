// The two rulings of 2026-09-07 that this file holds and presses.
//
//   RULING A -- the palette entrance is a TOGGLE. `SP-4` of `FR-083` used to
//   fire only while nothing was selected; the ruling took that condition out,
//   and the closing paragraph of table T-023b took it out a second time.
//   RULING B -- a bar-shaped task needs a DRAG. A press that never travelled
//   past `S-208` makes no bar-shaped task and is TOLD that it made none;
//   a milestone is exempt, in both directions.
//
// Units under test:
//   UF-30  `input-command-translator.ts` (CP-18 of table T-062, PI-18 of table
//          T-064) -- `screenStateFromInput` for the arm, `commandFromInput`
//          for what a press on empty ground plans.
//   UF-48  `frame-loop.ts` (CP-25) -- the one place in `src/` that spells a row
//          of table T-233, so the telling's ROW is only readable there.
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
//   FR-083   表 T-023a's `SP-1` .. `SP-4`, and the two notes under that table:
//            every row arms the pressed shape, arming is not refused for a
//            selection, and `SP-4` does not turn on the selection either.
//   FR-083   RATIONALE -- a press with no travel makes no task, tells that it
//            made none, and does not apply to a milestone.
//   FR-001   STATEMENT -- the same pair, plus `S-208` as the boundary between a
//            drag and a click, plus the milestone's own two MUSTs and the
//            MUST NOT against refusing a milestone for having been dragged.
//   T-023b   the arms `AR-1` .. `AR-6`, and the closing paragraph: the meaning
//            of a re-press does not turn on the selection.
//   T-012    the five task shapes and the spelling of each (the 値 column).
//   T-109    which entrance arms which row of table T-023b (the 構え column)
//            and which shape it arms (the 何の入口か column).
//   T-233    `RS-53`, the reason a bar-shaped press with no travel carries,
//            and `RS-27`, the fallback FR-029 (MUST NOT) forbids in its place.
//   T-037    `NT-1`, the manner table T-233 writes `RS-53` against.
//   T-206    `S-208`, the travel that separates a drag from a click.
//
// ---------------------------------------------------------------------------
// ⭐⭐ WHY SECTION 1 CARRIES THE CLAUSES AS STRING CONSTANTS
// ---------------------------------------------------------------------------
// Check 39 (`check-must-clause-coverage.py`) counts a clause as held when the
// trailing window of manuscript text ending at its own marker is found VERBATIM
// in the RAW BYTES of some file under tests/. ⛔ A test that merely READS
// `docs/spec` at run time holds nothing -- the characters have to stand here.
// ⛔ AND A COPY THAT NOTHING CHECKS IS A SECOND STORE. So every constant is
// asserted, at run time, to still be present in the manuscript it came from: a
// clause whose wording moves takes this file red with it.
// ⭐ EVERY CONSTANT WAS CUT OUT OF THE MANUSCRIPT BY SCRIPT, never retyped.
// The lengths differ because check 39 falls back through 120 / 90 / 60 / 40 /
// 28 characters and a window that reaches back across a paragraph break cannot
// be one single-quoted literal.
//
// ---------------------------------------------------------------------------
// ⛔ ONE CLAUSE OF THESE TWO RULINGS COULD NOT BE HELD, AND IT IS NAMED RATHER
// THAN PAPERED OVER
// ---------------------------------------------------------------------------
// The first MUST of the closing paragraph of table T-023b -- the one that keeps
// the arm standing between two drags -- begins a paragraph, and only 17
// characters of manuscript stand between that paragraph's start and its marker.
// Check 39's floor is 28, so NO test can hold it: any 28-character window
// reaches back across the blank line before it, and a window carrying a line
// break is not one string literal. ⚠️ That is the under-count the check's own
// docstring admits it can make. The rule is still PRESSED here (the arm is read
// back after a creating drag); it simply cannot be quoted.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT WAS READ OF `src/` (docs/development-rules/04-verification.md §1)
// ---------------------------------------------------------------------------
// The opening declaration of each file, and these exported declarations only:
//   input-command-translator.ts -- `PressRow`, `PointerPress`, `InputContext`,
//     `SpentEntranceSituation`, `CreatedSubject`, `InputAction`,
//     `TranslatedInput`, `pressRowOf`, `commandFromInput`,
//     `screenStateFromInput`, `NOT_STORED_ROW_GRAB_SIZES`
//   input-source.ts -- `PointerButton`, `PointerPhase`, `PointerInput`,
//     `InputModifiers`, `HumanInput`
//   screen-state.ts -- `Armed`, `ScreenState`, `emptyScreenState`
//   selection.ts -- `ItemRef`, `Selection`, `emptySelection`, `selectionOfAll`
//   screen-surface.ts -- `ScreenPart`, `ScreenSurface`
//   screen-renderer.ts -- `DisplayLanguage`, `Notice`, `ScreenView`
//   edit-task.ts -- the `createTask` member of `TaskCommand`
//   edit-document.ts -- `DocumentCommand`, `NOT_STORED_ZOOM_BOUNDS`
//   schedule-layout.ts / schedule-geometry.ts / screen-regions.ts -- the three
//     ADR-001 builders and `ScreenEnvironment`
//   frame-loop.ts -- `frameLoop`, `FrameEnvironment`, `FrameLoop`,
//     `ScreenWiring`
// ⛔ No function body of either unit under test was read, and no expected value
// below came from one: every expectation is a clause's own words, a row of a
// manuscript table, or a row of the generated dictionary, read at run time.
//
// ⭐ THE HOST FAKE, THE EMPTY DOCUMENT AND THE `stage` HELPER of section 4 are
// copied from tests/unit/fr-019-no-row-for-the-annotation.test.ts, which drives
// UF-48 through the same seams for the neighbouring ruling.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  commandFromInput,
  pressRowOf,
  screenStateFromInput,
  NOT_STORED_ROW_GRAB_SIZES,
  type HumanInput,
  type InputAction,
  type InputContext,
  type InputModifiers,
  type PointerButton,
  type PointerInput,
  type PointerPhase,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  Notice,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenState,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import {
  emptySelection,
  selectionOfAll,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// 1. The clauses, verbatim, and the manuscript they were cut from
// ===========================================================================

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

// -- Ruling A: the palette entrance is a toggle ----------------------------

/**
 * ⚠️ HELD AT 28 CHARACTERS, CHECK 39's FLOOR. Every longer window of this
 * marker reaches back across the blank line before its paragraph.
 */
const SP_4_DOES_NOT_TURN_ON_THE_SELECTION = '*`SP-4` は選択の有無で変わらないこと（MUST）'

const SP_4_DISARM_IS_NOT_REFUSED_FOR_A_SELECTION =
  ' 2026-09-07、逐語「トグルにせよ。 ユーザーに選択肢がある」）—— **既に構えている入口を再び押したなら、何を選んでいても構えは解ける。**⛔ **選んでいるものが在ることを理由に、この解除を拒んではならない（MUST NOT）'

const T_023B_THE_REPRESS_MEANS_THE_SAME =
  '`、またはパレットの同じ入口の再押下とすること（MUST）**（利用者の裁定 2026-09-07、逐語「トグルにせよ。 ユーザーに選択肢がある」）—— ⛔ **選んでいるものの有無で、この再押下の意味を変えてはならない（MUST NOT）'

/** ⚠️ HELD AT 28 CHARACTERS, for the reason `SP_4_DOES_NOT_TURN_ON_THE_SELECTION` gives. */
const EVERY_ROW_ARMS_THE_PRESSED_SHAPE = '**どの行でも、押した入口の形状を構えること（MUST）'

/** ⚠️ HELD AT 90 -- the 120-character window crosses the paragraph break. */
const ARMING_IS_NOT_REFUSED_FOR_A_SELECTION =
  'T）**（利用者の指示 2026-09-07、逐語「アイコンを押すと必ずその構えに入る」）—— ⛔ **選んでいるものが在ることを理由に、構えを拒んではならない（MUST NOT）'

/**
 * ⭐ THE CLAUSE D-389 / D-402 ARE MEASURED AGAINST (2026-09-08). A palette press
 * that could not give its shape to the selection still ARMS -- and the telling
 * that goes with it is table T-233's `RS-54`, whose own row forbids `RS-10`.
 * ⚠️ HELD AT 90 -- the 120-character window crosses the paragraph break.
 */
const FR_083_THE_ARMING_STANDS_THROUGH_A_REFUSAL =
  'を変えることは、そのまま残る** —— **2 つは同じ押しの 2 つの結果であり、どちらかを選ぶものではない。**⛔ **形状の変更が拒まれたときも、構えは立てること（MUST）'

// -- Ruling B: a bar-shaped task needs a drag ------------------------------

const BAR_SHAPE_DRAG_MAKES_THE_SPAN =
  '**⭐ **バーの形状（表 T-012 の `SH-1` 〜 `SH-4`）を構えてドラッグしたときは、引いた期間のタスクを作ること（MUST）'

const FR_001_A_CLICK_MAKES_NO_BAR_TASK =
  '**⛔⛔ **クリックでは、バーの形状のタスクを作らないこと（MUST NOT）'

const FR_001_TELLS_IT_MADE_NOTHING =
  '**⭐ **作らなかったことを告げること（MUST）'

// ⛔ FR-083's SECOND COPY OF FR-001's PROHIBITION IS GONE, AND THAT IS THE
// MANUSCRIPT MOVING, NOT COVERAGE BEING DROPPED (2026-09-08). FR-083's
// RATIONALE carried the same MUST NOT and the same MUST as FR-001's STATEMENT,
// word for word; the duplication detector caught the pair at 0.95 and 0.93, and
// 表 T-051's `HF-14` states the rule it broke -- 「同じ MUST が 2 か所に載ると
// 必ず離れていく。」 FR-001 keeps the rule and FR-083 now points at it.
// ⭐ BOTH CLAUSES ARE STILL HELD, by `FR_001_A_CLICK_MAKES_NO_BAR_TASK` and
// `FR_001_TELLS_IT_MADE_NOTHING` above, and every case that drove them still
// drives them -- one clause, one tie, which is what the collapse was for.

// -- Ruling B's control half: the milestone is exempt, both ways ------------

const MILESTONE_IS_PLACED_BY_A_PRESS_ALONE =
  '**⛔⛔ **マイルストーンは押すだけで置くこと（MUST）'

const MILESTONE_LANDS_ON_THE_PRESSED_POINT =
  '**⛔⛔ **マイルストーンは押すだけで置くこと（MUST）。引いても、押した点に置くこと（MUST）'

const MILESTONE_IS_NOT_REFUSED_FOR_A_DRAG =
  'MUST）。引いても、押した点に置くこと（MUST）**（同裁定「マイルストーンはクリックだけとする」）—— **マイルストーンは長さを持たないので、引いた長さに意味が無い。**⛔ **引いたことを理由に拒んではならない（MUST NOT）'

// -- Ruling C: the picture a held press owes, and the one press that ends it --
//
// ⭐⭐ THE SAME 2026-09-07 INSTRUCTION AS RULINGS A AND B, given in one breath.
// 利用者の逐語 (docs/development-records/defects.md, D-372): 「アイコンを押すと必ず
// その構えに入り、ドラッグ中は形がポインタに付いて伸び、離すとプロパティパネルが
// `Name` を出し、`Enter` で閉じて選択が外れ、構えは続き、`Esc` で構えも解けること」.
// Ruling A is its first clause; the constants below are its second and fourth.

const PD_4_DRAWS_WHAT_WOULD_BE_PLACED =
  '注記を構えている**（表 T-023b の AR-2 / AR-3 / AR-5 / AR-6） | 構えているものを**作る**。⭐ **押しているあいだ、置くことになる姿を、表 T-023d の閉じの規則と同じ作法で描くこと（MUST）'

const PD_4_STRETCHES_THE_WAY_THE_POINTER_WENT =
  'd の閉じの規則と同じ作法で描くこと（MUST）**（利用者の指示 2026-09-07）—— ⚠️ **あちらは掴み領域の規則であり、本行は掴んでいないので自分で述べる必要がある。**⭐ **伸びる向きは、引いた向きとすること（MUST）'

const PD_4_THE_DRAFT_IS_THE_ARMED_SHAPE =
  '）—— ⚠️ **あちらは掴み領域の規則であり、本行は掴んでいないので自分で述べる必要がある。**⭐ **伸びる向きは、引いた向きとすること（MUST）。**⛔ **その姿は、構えている行が 表 T-012 で持つ形状とすること（MUST）'

const PD_4_NO_OTHER_SHAPE_IS_DRAWN =
  '行は掴んでいないので自分で述べる必要がある。**⭐ **伸びる向きは、引いた向きとすること（MUST）。**⛔ **その姿は、構えている行が 表 T-012 で持つ形状とすること（MUST）。ほかの形状で描いてはならない（MUST NOT）'

const PD_4_THE_SHAPE_IS_NOT_KEPT_IN_TWO_PLACES =
  '2 で持つ形状とすること（MUST）。ほかの形状で描いてはならない（MUST NOT）**（利用者の指摘 2026-09-07）—— **置こうとしている物と違う形が出る。**⛔ **形状を 2 か所に持たせてはならない（MUST NOT）'

const PD_4_NOTHING_IS_WRITTEN_WHILE_HELD =
  '*置こうとしている物と違う形が出る。**⛔ **形状を 2 か所に持たせてはならない（MUST NOT）** —— **描く側と置く側が同じ表を引くこと（MUST）。**⛔ **押しているあいだ値を文書へ書いてはならない（MUST NOT）'

/** ⚠️ HELD AT 60 -- the longer windows reach back across the paragraph break. */
const FR_091_ONE_PRESS_CLOSES_AND_LETS_GO =
  '後の名称を `Enter` で確定したときは、同じ 1 回の押下でプロパティパネルを閉じ、その選択を解くこと（MUST）'

/** Every clause this file holds, with the name the two rulings know it by. */
const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-083 SP-4 (MUST) -- the re-press does not turn on the selection', SP_4_DOES_NOT_TURN_ON_THE_SELECTION],
  ['FR-083 SP-4 (MUST NOT) -- the disarm is not refused for a selection', SP_4_DISARM_IS_NOT_REFUSED_FOR_A_SELECTION],
  ['T-023b (MUST NOT) -- a re-press means the same thing either way', T_023B_THE_REPRESS_MEANS_THE_SAME],
  ['FR-083 (MUST) -- every row of the table arms the pressed shape', EVERY_ROW_ARMS_THE_PRESSED_SHAPE],
  ['FR-083 (MUST NOT) -- arming is not refused for a selection', ARMING_IS_NOT_REFUSED_FOR_A_SELECTION],
  ['FR-083 (MUST) -- the arming stands even when the shape change is refused', FR_083_THE_ARMING_STANDS_THROUGH_A_REFUSAL],
  ['FR-001 (MUST) -- a bar shape dragged makes a task of the span drawn', BAR_SHAPE_DRAG_MAKES_THE_SPAN],
  ['FR-001 (MUST NOT) -- a click makes no bar-shaped task', FR_001_A_CLICK_MAKES_NO_BAR_TASK],
  ['FR-001 (MUST) -- it is told that nothing was made', FR_001_TELLS_IT_MADE_NOTHING],
  ['FR-001 (MUST) -- a milestone is placed by a press alone', MILESTONE_IS_PLACED_BY_A_PRESS_ALONE],
  ['FR-001 (MUST) -- a dragged milestone lands on the pressed point', MILESTONE_LANDS_ON_THE_PRESSED_POINT],
  ['FR-001 (MUST NOT) -- a milestone is not refused for having been dragged', MILESTONE_IS_NOT_REFUSED_FOR_A_DRAG],
  ['T-023a PD-4 (MUST) -- the held press draws what it would place', PD_4_DRAWS_WHAT_WOULD_BE_PLACED],
  ['T-023a PD-4 (MUST) -- the draft stretches the way the pointer went', PD_4_STRETCHES_THE_WAY_THE_POINTER_WENT],
  ['T-023a PD-4 (MUST) -- the draft is the armed row of table T-012', PD_4_THE_DRAFT_IS_THE_ARMED_SHAPE],
  ['T-023a PD-4 (MUST NOT) -- no other shape is drawn', PD_4_NO_OTHER_SHAPE_IS_DRAWN],
  ['T-023a PD-4 (MUST NOT) -- the shape is not kept in two places', PD_4_THE_SHAPE_IS_NOT_KEPT_IN_TWO_PLACES],
  ['T-023a PD-4 (MUST NOT) -- nothing is written to the document while held', PD_4_NOTHING_IS_WRITTEN_WHILE_HELD],
  ['FR-091 (MUST) -- one press closes the panel and lets that selection go', FR_091_ONE_PRESS_CLOSES_AND_LETS_GO],
]

describe('the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    // ⛔ THE ONLY THING THAT KEEPS THE COPIES ABOVE HONEST. A clause reworded
    // in the manuscript takes this case red, which is what tells the next round
    // that the copy -- and the case that presses it -- has to move too.
    expect(REQUIREMENTS).toContain(clause)
  })

  it('holds one clause per marker, and no clause twice', () => {
    // ⚠️ Check 39 counts MARKERS, not rules, so two constants that turned out to
    // be the same window would pay back one clause while claiming two.
    expect(new Set(CLAUSES.map(([, clause]) => clause)).size).toBe(CLAUSES.length)
  })
})

// ===========================================================================
// 2. The rows, read out of the manuscript at run time
// ===========================================================================

const ARM_COLUMN = '構え'
const WHAT_COLUMN = '何の入口か'
const SURFACE_COLUMN = '面'
const VALUE_COLUMN = '値'

/** `AR-2` of table T-023b -- a task shape is armed. */
const TASK_SHAPE_ARM = 'AR-2'
/** `AR-3` of table T-023b -- a milestone glyph is armed. */
const MILESTONE_ARM = 'AR-3'

interface Entrance {
  readonly row: string
  readonly surface: string
}

/** The one entrance of table T-109 that arms the given row of table T-012. */
function entranceArming(arm: string, shapeRow: string): Entrance {
  const found = specTable('T-109').rows.filter(
    (row) =>
      bare(row.by[ARM_COLUMN] ?? '') === arm && bare(row.by[WHAT_COLUMN] ?? '') === shapeRow,
  )
  if (found.length !== 1) {
    throw new Error(`table T-109 arms ${shapeRow} from ${found.length} entrances`)
  }
  const row = found[0] as (typeof found)[number]
  return { row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }
}

/** `SH-1` -- the rectangle, the bar shape these cases arm first. */
const RECTANGLE = entranceArming(TASK_SHAPE_ARM, 'SH-1')
/** `SH-2` -- the chevron, a DIFFERENT bar shape, so a second press is not a re-press. */
const CHEVRON = entranceArming(TASK_SHAPE_ARM, 'SH-2')
/** `SH-5` -- the milestone. Table T-109 gives `AR-3` fifteen entrances; this is the first. */
const MILESTONE = ((): Entrance => {
  const found = specTable('T-109').rows.filter(
    (row) => bare(row.by[ARM_COLUMN] ?? '') === MILESTONE_ARM,
  )
  if (found.length === 0) throw new Error('table T-109 arms AR-3 from no entrance')
  const row = found[0] as (typeof found)[number]
  return { row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }
})()

/** The 値 column of table T-012, without the quotes the manuscript prints. */
function shapeSpelling(rowId: string): string {
  const row = specTable('T-012').rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-012 no longer has row ${rowId}`)
  return bare(row.by[VALUE_COLUMN] ?? '').replace(/'/g, '')
}

const RECTANGLE_SPELLING = shapeSpelling('SH-1')
const CHEVRON_SPELLING = shapeSpelling('SH-2')

/** `RS-53` -- the reason a bar-shaped press with no travel carries. */
const RS_53 = 'RS-53'
/** `RS-27` -- the fallback FR-029 (MUST NOT) forbids where a row of its own fits. */
const RS_27 = 'RS-27'
/** `RS-54` -- the reason an armed shape the selection cannot take carries. */
const RS_54 = 'RS-54'
/**
 * `RS-10` -- the bundle-dropped row `RS-54` (MUST NOT) forbids in its place.
 *
 * ⛔ ITS NEXT STEP IS WHY. The dictionary answers `RS-10` with 「拒まれた変更を
 * 取り除いて、もう一度」, and a palette press holds ONE change -- so the reader
 * was being told to take out the only thing they did.
 */
const RS_10 = 'RS-10'

/** The manner table T-233 writes a reason against. */
function mannerOf(rowId: string): string {
  const row = specTable('T-233').rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-233 no longer has row ${rowId}`)
  return bare(row.cells[1] ?? '')
}

/** The words FR-038's one dictionary holds for one row of table T-233. */
const wordsOf = (rowId: string): { readonly ja: string; readonly en: string } => {
  const found = (displayWords as any).reasons.find((one: any) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no row ${rowId}`)
  return found.text
}

/** `S-208` of table T-206 -- the travel that separates a drag from a click. */
const DRAG_THRESHOLD = NOT_STORED_ROW_GRAB_SIZES['S-208']

describe('the rows these cases are driven by are still in the manuscript', () => {
  it('⭐ table T-109 arms SH-1, SH-2 and SH-5 from the Command Palette', () => {
    // GOES RED IF: a second entrance is given one of these arms, which would
    // make every press below ambiguous.
    expect(RECTANGLE.surface).toBe('Command Palette')
    expect(CHEVRON.surface).toBe('Command Palette')
    expect(MILESTONE.surface).toBe('Command Palette')
    expect(new Set([RECTANGLE.row, CHEVRON.row, MILESTONE.row]).size).toBe(3)
  })

  it('⭐ table T-012 still spells SH-1 and SH-2, and they are two spellings', () => {
    expect(RECTANGLE_SPELLING.length).toBeGreaterThan(0)
    expect(CHEVRON_SPELLING.length).toBeGreaterThan(0)
    expect(RECTANGLE_SPELLING).not.toBe(CHEVRON_SPELLING)
  })

  it('⭐ table T-233 holds RS-53, and writes it against NT-1', () => {
    // ⛔ NT-3a WOULD SAY SOMETHING UNTRUE: that manner is an operation that
    // FAILED, and nothing here failed -- the press did not say a span.
    expect(mannerOf(RS_53)).toBe('NT-1')
    expect(wordsOf(RS_53).ja.length).toBeGreaterThan(0)
    expect(wordsOf(RS_53).en.length).toBeGreaterThan(0)
  })

  it('⭐ table T-233 holds RS-54, writes it against NT-1, and it is not RS-10', () => {
    // ⛔ GOES RED IF THE ROW IS RETIRED OR ITS MANNER MOVES. `RS-54` is the row
    // 2026-09-08 added for a shape the selection cannot take, and its 正 is
    // FR-083 -- the requirement whose clause section 1 holds.
    expect(mannerOf(RS_54)).toBe('NT-1')
    expect(wordsOf(RS_54).ja.length).toBeGreaterThan(0)
    expect(wordsOf(RS_54).en.length).toBeGreaterThan(0)
    // ⛔ THE ASSERTIONS OF SECTION 5 WOULD BE VACUOUS if the dictionary gave the
    // two rows the same words: telling `RS-54` and telling `RS-10` would then be
    // indistinguishable, and D-389 is precisely that they must not be.
    expect(wordsOf(RS_54).ja).not.toBe(wordsOf(RS_10).ja)
    expect(wordsOf(RS_54).en).not.toBe(wordsOf(RS_10).en)
  })

  it('⭐ S-208 reaches src/ as a positive number of pixels', () => {
    expect(DRAG_THRESHOLD).toBeGreaterThan(0)
  })
})

// ===========================================================================
// 3. Driving the two pure members of UF-30
// ===========================================================================

/** The four keys SETTINGS_DEFAULTS carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const SETTINGS: DocumentSettings = {
  ...SETTINGS_DEFAULTS,
  ...NESTED,
  // S-77 and S-78, pinned so that the day drawn at an x is the same every run.
  scrollDate: '2026-01-01',
  scrollGroupId: null,
  // S-58, pinned so every y reads from the top.
  stackDirection: 'down',
} as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/**
 * A schedule with no row at all, so that a press on empty ground is a press on
 * a vertical position that points at no `TaskGroup` -- the case FR-001 (MUST)
 * answers by minting one.
 */
const SCHEDULE = {
  project: {
    calendarUid: null,
    statusDate: null,
    themeHue: 214,
    title: null,
    uidHighWaterMark: 100,
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
} as unknown as Schedule

const DOCUMENT = {
  schemaVersion: '2026-01-01',
  schedule: SCHEDULE,
  documentSettings: SETTINGS,
  documentStamp: {
    scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
    lastEditedBy: 'test',
    settingsUpdatedUtc: '2026-01-01T00:00:00Z',
  },
  changeLog: [],
} as unknown as Document

const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY = geometryFromLayout(SCHEDULE, SETTINGS, LAYOUT, REGIONS, emptySelection())

const NEW_GROUP_ID = 'row-minted-outside'

const BASE: InputContext = {
  document: DOCUMENT,
  layout: LAYOUT,
  geometry: GEOMETRY,
  regions: REGIONS,
  screenState: emptyScreenState(),
  selection: emptySelection(),
  // ⭐ A stand-in: no case below reads S-53, and a figure that is not the
  // manuscript's makes that plain.
  zoomStep: 3,
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  pressed: null,
  isTextEntryUnsettled: false,
  isSurfaceStanding: false,
  dualCursorFollowing: null,
  today: '2026-03-01T00:00:00',
  newGroupId: NEW_GROUP_ID,
  newCommentBoxId: 'comment-box-minted-outside',
  newHighlightBoxId: 'highlight-box-minted-outside',
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left' as PointerButton,
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

/** One entry of table T-109, as the side that DREW it answers for the point. */
const partOf = (entrance: Entrance): ScreenPart =>
  ({
    part: entrance.surface,
    entry: entrance.row,
    format: null,
    rowGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  }) as unknown as ScreenPart

interface Gesture {
  /** The screen as it stands when the gesture has been let go. */
  readonly screenState: ScreenState
  /** What `commandFromInput` planned for the release. */
  readonly action: InputAction | null
}

/**
 * One whole press-and-release, run through both members the way the shell runs
 * them: the press is recorded first (CS-2 freezes the screen at the press), the
 * `down` is offered to both members, and the `up` is read against the press.
 *
 * ⚠️ BOTH HAPPENINGS ARE OFFERED because IN-1 settles a pointer operation on
 * the RELEASE while nothing in the specification says which of the two an
 * entry's arming lands on -- threading the state through both is what a shell
 * does, and it makes the case indifferent to that choice.
 */
function gesture(options: {
  readonly screenState: ScreenState
  readonly selection?: Selection
  readonly on?: ScreenPart | null
  readonly from: { readonly x: number; readonly y: number }
  readonly to?: { readonly x: number; readonly y: number }
}): Gesture {
  const selection = options.selection ?? emptySelection()
  const on = options.on ?? null
  const to = options.to ?? options.from
  const down = pointer('down', options.from.x, options.from.y)
  const press: PointerPress = {
    at: down,
    hit: null,
    on,
    pressRow: pressRowOf(
      { at: down, hit: null },
      { screenState: options.screenState, dualCursorFollowing: null },
    ),
  }
  const atPress: InputContext = {
    ...BASE,
    screenState: options.screenState,
    selection,
    pressed: press,
  }
  const afterDown = screenStateFromInput(down, atPress)
  const up = pointer('up', to.x, to.y)
  const atRelease: InputContext = { ...BASE, screenState: afterDown, selection, pressed: press }
  const afterUp = screenStateFromInput(up, atRelease)
  const released = commandFromInput(up, atRelease)
  return { screenState: afterUp, action: released.action }
}

/** Press one entrance of the palette and answer with the arm it left standing. */
function pressEntrance(
  entrance: Entrance,
  screenState: ScreenState,
  selection: Selection = emptySelection(),
): ScreenState {
  return gesture({
    screenState,
    selection,
    on: partOf(entrance),
    // ⚠️ Anywhere: table T-023a's decision order does not reach a point the
    // screen surface answered for, so the coordinates carry no meaning here.
    from: { x: 40, y: 200 },
  }).screenState
}

/** A point of the `Row Area` with nothing drawn over it and nothing under it. */
const GROUND = { x: 700, y: 400 }

/** The one `Task` a selection can be made of without any of it being drawn. */
const SOMETHING_SELECTED: Selection = selectionOfAll([{ kind: 'task', uid: 1 }])

/** The `createTask` commands (CM-6) one action plans, if it plans any. */
function creations(action: InputAction | null): readonly any[] {
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes.flat().filter((one: any) => one.kind === 'createTask')
}

// ---------------------------------------------------------------------------
// RULING A -- the palette entrance is a toggle, and the selection has no say
// ---------------------------------------------------------------------------

describe('FR-083 SP-1..SP-4 and table T-023b: the entrance is a toggle', () => {
  it('⛔ THE CONTROL: pressing an entrance with nothing armed ARMS it', () => {
    // ⚠️ WITHOUT THIS, A BUILD THAT ARMED NOTHING AT ALL WOULD PASS EVERY
    // DISARM CASE BELOW -- an arm that never stands is an arm that is always
    // down. SP-1 of table T-023a is what this reads.
    const armed = pressEntrance(RECTANGLE, emptyScreenState())
    expect(armed.armed.kind).toBe('taskShape')
    expect((armed.armed as any).shapeKind).toBe(RECTANGLE_SPELLING)
  })

  it('⭐ SP-4: pressing the ARMED entrance again puts the arm down', () => {
    // The half of SP-4 that was true before 2026-09-07 as well. It is here so
    // that the case below it isolates the RULING and not the row.
    const once = pressEntrance(RECTANGLE, emptyScreenState())
    const twice = pressEntrance(RECTANGLE, once)
    expect(twice.armed.kind).toBe('none')
  })

  it('⭐⭐ THE RULING: the same re-press puts the arm down WITH SOMETHING SELECTED', () => {
    // FR-083's note (MUST): SP-4 does not turn on the selection, and (MUST NOT)
    // the disarm may not be refused because something is selected. Table
    // T-023b's closing paragraph (MUST NOT) says the same of the re-press's
    // meaning.
    // ⛔ GOES RED ON THE BUILD THE RULING WAS GIVEN AGAINST: until 2026-09-07
    // SP-4 read 「何も選んでいない」, so a person holding a selection could not
    // put the arm down from the palette at all.
    // ⚠️ THE CONTROL FOR THIS CASE is the one above it, which shows the arm can
    // stand, and the one below it, which shows a press can still ARM while a
    // selection stands -- a build that answered `none` to every palette press
    // would fail both.
    const once = pressEntrance(RECTANGLE, emptyScreenState(), SOMETHING_SELECTED)
    const twice = pressEntrance(RECTANGLE, once, SOMETHING_SELECTED)
    expect(once.armed.kind, 'the first press armed nothing').toBe('taskShape')
    expect(twice.armed.kind).toBe('none')
  })

  it('⭐ the two roads answer the same: a selection changes NOTHING about the re-press', () => {
    // ⛔ THE CLAUSE OF TABLE T-023b READ AS ONE COMPARISON. Written as two
    // separate expectations the pair could drift apart; written as one, the
    // only way to pass is for the selection to have no say at all.
    const alone = pressEntrance(RECTANGLE, pressEntrance(RECTANGLE, emptyScreenState()))
    const holding = pressEntrance(
      RECTANGLE,
      pressEntrance(RECTANGLE, emptyScreenState(), SOMETHING_SELECTED),
      SOMETHING_SELECTED,
    )
    expect(holding.armed).toEqual(alone.armed)
  })

  it('⛔ THE CONTROL: pressing a DIFFERENT entrance ARMS it, selection or not', () => {
    // FR-083's other note (MUST): every row of the table arms the pressed
    // shape, and (MUST NOT) arming may not be refused because something is
    // selected. ⚠️ WITHOUT THIS, A BUILD THAT DISARMED ON EVERY PALETTE PRESS
    // WOULD PASS THE THREE CASES ABOVE.
    const armed = pressEntrance(RECTANGLE, emptyScreenState(), SOMETHING_SELECTED)
    const moved = pressEntrance(CHEVRON, armed, SOMETHING_SELECTED)
    expect(moved.armed.kind).toBe('taskShape')
    expect((moved.armed as any).shapeKind).toBe(CHEVRON_SPELLING)
  })

  it('⭐ the arms of table T-023b are exclusive: the milestone press takes the shape arm off', () => {
    // AR-2 and AR-3 are two rows of one column, and the closing paragraph of
    // table T-023b says the values are exclusive.
    const armed = pressEntrance(RECTANGLE, emptyScreenState())
    const moved = pressEntrance(MILESTONE, armed)
    expect(moved.armed.kind).toBe('milestoneShape')
  })
})

// ---------------------------------------------------------------------------
// RULING B -- a bar-shaped task needs a drag; a milestone does not
// ---------------------------------------------------------------------------

const FAR = { x: GROUND.x + DRAG_THRESHOLD * 20, y: GROUND.y }

describe('FR-001 / FR-083: a bar shape is made by a drag and by nothing else', () => {
  it('⛔ THE CONTROL: a bar shape DRAGGED past S-208 does make a task', () => {
    // FR-001 (MUST): a bar shape armed and dragged makes a task of the span
    // that was drawn. ⚠️ WITHOUT THIS, A BUILD THAT REFUSED EVERY PRESS WOULD
    // PASS THE REFUSAL CASE BELOW.
    const armed = pressEntrance(RECTANGLE, emptyScreenState())
    const drawn = gesture({ screenState: armed, from: GROUND, to: FAR })
    const made = creations(drawn.action)
    expect(made.length, 'the drag planned no createTask').toBe(1)
    expect(made[0].shapeKind).toBe(RECTANGLE_SPELLING)
    expect(made[0].start < made[0].finish, 'the span drawn was not carried').toBe(true)
  })

  it('⭐⭐ THE RULING: a bar shape released without travelling makes NO task', () => {
    // FR-001 (MUST NOT) and FR-083's RATIONALE (MUST NOT). Until 2026-09-07
    // this press made a task of zero length, which is the build the ruling was
    // given against.
    const armed = pressEntrance(RECTANGLE, emptyScreenState())
    const pressed = gesture({ screenState: armed, from: GROUND })
    expect(creations(pressed.action).length).toBe(0)
  })

  it('⭐⭐ THE RULING: and it is TOLD that nothing was made', () => {
    // FR-001 (MUST) and FR-083's RATIONALE (MUST): 作らなかったこと is told,
    // 作法 per FR-029. ⛔ THE SILENT REFUSAL IS THE DEFECT THE CLAUSE NAMES:
    // a press that makes nothing and says nothing is indistinguishable from an
    // entrance that does nothing at all.
    // ⛔ AND THE SITUATION MAY NOT BE NULL: FR-029 (MUST NOT) forbids carrying
    // the fallback where a row of table T-233 fits, and RS-53 is that row.
    const armed = pressEntrance(RECTANGLE, emptyScreenState())
    const pressed = gesture({ screenState: armed, from: GROUND })
    expect(pressed.action?.kind).toBe('tellEntryHasNothingToDo')
    expect((pressed.action as any)?.situation ?? null).not.toBeNull()
  })

  it('⭐ the boundary is S-208 and not zero: a travel INSIDE the slop is still a click', () => {
    // FR-001 (MUST, 利用者の裁定 2026-09-02, still live): the travel that is
    // not past S-208 is a click. A hand that trembled by one pixel has not
    // drawn a span.
    const armed = pressEntrance(RECTANGLE, emptyScreenState())
    const trembled = gesture({
      screenState: armed,
      from: GROUND,
      to: { x: GROUND.x + Math.max(1, DRAG_THRESHOLD - 1), y: GROUND.y },
    })
    expect(creations(trembled.action).length).toBe(0)
    expect(trembled.action?.kind).toBe('tellEntryHasNothingToDo')
  })

  it('⛔ THE CONTROL: with NOTHING armed the same press tells nothing', () => {
    // ⚠️ WITHOUT THIS, A BUILD THAT RAISED THE TELLING ON EVERY PRESS OF THE
    // GROUND WOULD PASS ABOVE. With no arm, PD-5 of table T-023a makes the
    // press a range selection, which is not an attempt to make anything.
    const bare = gesture({ screenState: emptyScreenState(), from: GROUND })
    expect(bare.action?.kind).not.toBe('tellEntryHasNothingToDo')
  })
})

describe('FR-001: the milestone is exempt from the ruling, in both directions', () => {
  it('⛔ THE CONTROL THAT STOPS "REFUSE EVERY PRESS" FROM PASSING: a milestone is placed by a press alone', () => {
    // FR-001 (MUST): the milestone is placed by pressing, and FR-083's
    // RATIONALE puts it outside the MUST NOT above in as many words.
    const armed = pressEntrance(MILESTONE, emptyScreenState())
    const pressed = gesture({ screenState: armed, from: GROUND })
    const made = creations(pressed.action)
    expect(made.length, 'the milestone press planned no createTask').toBe(1)
    expect(made[0].shapeKind).toBe(shapeSpelling('SH-5'))
    expect(pressed.action?.kind).not.toBe('tellEntryHasNothingToDo')
  })

  it('⭐ a DRAGGED milestone is not refused, and lands on the pressed point', () => {
    // FR-001 (MUST): 引いても、押した点に置くこと, and (MUST NOT): it may not be
    // refused for having been dragged. ⚠️ The point is read by COMPARISON, so
    // that no case here has to know the day-to-x map: the dragged milestone has
    // to answer the same day as a plain press at the point it started from, and
    // a DIFFERENT day from a plain press where it was let go.
    const armed = pressEntrance(MILESTONE, emptyScreenState())
    const dragged = creations(gesture({ screenState: armed, from: GROUND, to: FAR }).action)
    const atPress = creations(gesture({ screenState: armed, from: GROUND }).action)
    const atRelease = creations(gesture({ screenState: armed, from: FAR }).action)
    expect(dragged.length, 'the dragged milestone was refused').toBe(1)
    expect(dragged[0].start).toBe(atPress[0].start)
    expect(dragged[0].finish).toBe(atPress[0].start)
    // ⛔ THE ASSERTION ABOVE WOULD BE VACUOUS if the two points named one day.
    expect(atRelease[0].start).not.toBe(atPress[0].start)
  })
})

// ===========================================================================
// 4. The telling's ROW -- readable only where a row of table T-233 is spelled
// ===========================================================================
//
// ⭐ UF-30 names the SITUATION it measured and UF-48 maps it to the row, so the
// two cases below drive the whole shell. Everything in this section but the
// presses is copied from tests/unit/fr-019-no-row-for-the-annotation.test.ts.

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and LY-5 of table T-060 puts the browser
 * in this layer. ⛔ Nothing in this fake decides anything about a telling.
 */
function host(): { readonly surface: { showSvg(svg: string): void }; runAnimationFrames(): void } {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  /**
   * Whether the surface is holding a field a person is typing into -- what
   * `hasUnsettledTextEntry` (IF-9) answers.
   *
   * ⭐⭐ WHY IT IS A SWITCH AND NOT A CONSTANT `false`. FR-091's clause is about
   * the `Enter` that settles the NAME OF A TASK JUST MADE, and by then the real
   * surface is holding `PR-1` of table T-016 -- so a fake that always answers
   * 「無し」 cannot reach the moment the requirement is about. ⛔ MEASURED: with
   * it wired to `false`, the case below passed on a build with no fix in it at
   * all, because `carryOutAction`'s guard fell through to the ordinary close.
   * ⚠️ OFF UNTIL A CASE TURNS IT ON, because `WS-2` of table T-067 refuses a
   * write made while an entry stands, and the creation itself is such a write.
   */
  holdTextEntry(standing: boolean): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  let textEntryStanding = false
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => textEntryStanding,
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    holdTextEntry: (standing) => {
      textEntryStanding = standing
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

function emptyDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, uidHighWaterMark: 100, statusDate: null },
      calendars: template.schedule.calendars,
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
    },
    documentSettings: template.documentSettings,
    documentStamp: template.documentStamp,
    changeLog: [],
  } as unknown as Document
}

interface Stage {
  readonly loop: FrameLoop
  notices(): readonly Notice[]
  /**
   * `CommandPalette.armedText` -- the one member that carries WHAT IS ARMED to
   * the screen. ⛔ Read instead of the row id because table T-023b's closing
   * rule (MUST NOT) keeps those ids off the screen, so this is all a person
   * ever sees of the arm.
   */
  armedText(): string | null
  pressEntry(entrance: Entrance): void
  pressGround(x: number, y: number): void
  /** The same press, travelled past `S-208` -- which is what makes a bar task. */
  dragGround(from: { x: number; y: number }, to: { x: number; y: number }): void
  /**
   * A press LEFT HELD -- the only moment `PD-4`'s picture can be looked at, and
   * the reason ruling C needs three drivers where rulings A and B needed one.
   */
  holdGround(at: { x: number; y: number }): void
  movePointer(at: { x: number; y: number }): void
  letGo(at: { x: number; y: number }): void
  /** One key, spelled as table T-036's assignment column spells it. */
  pressKey(which: string): void
  /** What the surface answers for IF-9's 「確定していないその場の編集」. */
  holdTextEntry(standing: boolean): void
  /** `FrameValues` -- what ONE frame computed (ADR-001), picture and all. */
  picture(): any
  /** UF-64 of the description: `null` while the panel is closed. */
  panel(): ScreenView['propertiesPanel']
}

function stage(language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, emptyDocument(), SCREEN, screen.wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  pen.runAnimationFrames()
  return {
    loop,
    notices: () => screen.last().notices,
    armedText: () => screen.last().commandPalette?.armedText ?? null,
    pressEntry: (entrance) => {
      screen.drawAt(partOf(entrance))
      send(pointer('down', 700, 20))
      send(pointer('up', 700, 20))
      screen.drawAt(null)
    },
    pressGround: (x, y) => {
      screen.drawAt(null)
      send(pointer('down', x, y))
      send(pointer('up', x, y))
    },
    dragGround: (from, to) => {
      screen.drawAt(null)
      send(pointer('down', from.x, from.y))
      send(pointer('move', to.x, to.y))
      send(pointer('up', to.x, to.y))
    },
    holdGround: (at) => {
      screen.drawAt(null)
      send(pointer('down', at.x, at.y))
    },
    movePointer: (at) => send(pointer('move', at.x, at.y)),
    letGo: (at) => send(pointer('up', at.x, at.y)),
    pressKey: (which) =>
      send({ kind: 'key', key: which, modifiers: { ...NO_MODIFIERS } } as HumanInput),
    picture: () => loop.current() as any,
    panel: () => screen.last().propertiesPanel,
    holdTextEntry: (standing) => screen.holdTextEntry(standing),
  }
}

describe('FR-029 / table T-233: the telling carries RS-53 and not the fallback', () => {
  for (const language of ['ja', 'en'] as const) {
    it(`⭐ a bar shape released without travelling is told RS-53's own words in ${language}`, () => {
      // ⛔⛔ THE DEFECT THIS CASE IS WRITTEN FOR. With no row for the situation
      // the dictionary answers with its fallback and the reader is told RS-27
      // -- 「押した入口が、いま行えることを持たない」 -- which is untrue here and
      // says nothing about what to do instead. RS-53 exists in as many words
      // because RS-27 could not be read.
      const built = stage(language)
      built.pressEntry(RECTANGLE)
      built.pressGround(GROUND.x, GROUND.y)
      const told = built.notices()
      expect(told.length, 'FR-001 (MUST): the press is told it made nothing').toBe(1)
      expect(told[0]?.text).toBe(wordsOf(RS_53)[language])
      expect(told[0]?.text).not.toBe(wordsOf(RS_27)[language])
    })
  }

  it('⭐ and it is told in NT-1s manner, which is the manner table T-233 writes it against', () => {
    const built = stage()
    built.pressEntry(RECTANGLE)
    built.pressGround(GROUND.x, GROUND.y)
    expect(built.notices()[0]?.manner).toBe(mannerOf(RS_53))
  })

  it('⛔ and nothing reached the document', () => {
    const built = stage()
    const before = JSON.stringify(built.loop.document())
    built.pressEntry(RECTANGLE)
    built.pressGround(GROUND.x, GROUND.y)
    expect(JSON.stringify(built.loop.document())).toBe(before)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })

  it('⛔ THE CONTROL: the milestone press reaches the document and tells nobody', () => {
    // ⚠️ WITHOUT THIS, A BUILD THAT TOLD RS-53 ON EVERY ARMED PRESS -- AND MADE
    // NOTHING -- WOULD PASS EVERY CASE ABOVE. RS-53's own note says a milestone
    // never raises the row.
    const built = stage()
    built.pressEntry(MILESTONE)
    built.pressGround(GROUND.x, GROUND.y)
    expect(built.notices().length).toBe(0)
    expect((built.loop.document().schedule as any).tasks.length).toBe(1)
    expect((built.loop.document().schedule as any).tasks[0].milestone).toBe(true)
  })
})

// ===========================================================================
// 5. D-389 / D-402 -- an armed shape the selection cannot take (RS-54)
// ===========================================================================
//
// ⭐⭐ WHAT THE USER MEASURED (D-389, 2026-09-08). Pressing a shape in the
// palette answered with `RS-10`'s words, and the next step that row's dictionary
// entry carries is 「拒まれた変更を取り除いて、もう一度」. ⛔ A palette press
// holds ONE change, so there is nothing to take out: the reader was handed a
// step they could not take. Table T-233's `RS-54` row now forbids the pairing in
// as many words -- 「`RS-10` を当ててはならない（MUST NOT）」.
//
// ⭐⭐ WHY THE ROW ALONE DID NOT FIX IT (D-402). `frame-loop.ts` mapped the
// whole of WS-3's `refused` onto `RS-10` from ONE line, keyed on the reason, and
// every command's refusal spells that same reason -- so table T-233 could gain
// `RS-54` and the screen would not move. The branch is what moved it.
//
// ⚠️ REFUSING IS CORRECT AND IS NOT WHAT CHANGED. FR-083 (MUST NOT) forbids
// crossing between table T-012's `SH-1`..`SH-4` and `SH-5`, `editTask` refuses
// it (CM-20), and AG-3 makes the bundle atomic. Only the WORDS moved.

/**
 * A milestone drawn on empty ground -- which leaves it SELECTED -- and then the
 * rectangle entrance pressed. SP-2 of FR-083 gives that press two results: the
 * rectangle is armed, and `setTaskVisualShapeKind` (CM-20) is planned for what
 * is selected. The second is refused against FR-083, the one thing selected
 * being a milestone.
 */
function shapeRefusedOnTheSelection(language: DisplayLanguage = 'ja'): Stage {
  const built = stage(language)
  built.pressEntry(MILESTONE)
  built.pressGround(GROUND.x, GROUND.y)
  built.pressEntry(RECTANGLE)
  return built
}

describe('FR-083 / table T-233: a shape the selection cannot take is told RS-54', () => {
  it('⛔ THE SETUP IS REAL: the milestone was drawn, and it is the only task', () => {
    // ⚠️ WITHOUT THIS EVERY CASE BELOW COULD PASS ON AN EMPTY SELECTION, where
    // `commandFromArmingEntry` plans nothing and nothing is refused at all.
    const built = stage()
    built.pressEntry(MILESTONE)
    built.pressGround(GROUND.x, GROUND.y)
    const tasks = (built.loop.document().schedule as any).tasks
    expect(tasks.length).toBe(1)
    expect(tasks[0].milestone).toBe(true)
    expect(built.notices().length, 'the milestone press itself told nobody').toBe(0)
  })

  for (const language of ['ja', 'en'] as const) {
    it(`⭐⭐ THE DEFECT: the refusal is told RS-54's words and NOT RS-10's, in ${language}`, () => {
      const told = shapeRefusedOnTheSelection(language).notices()
      expect(told.length, 'FR-083: the refusal is told').toBe(1)
      expect(told[0]?.text).toBe(wordsOf(RS_54)[language])
      // ⛔ THE MEASURED DEFECT, WORD FOR WORD. This is the line that was red.
      expect(told[0]?.text).not.toBe(wordsOf(RS_10)[language])
    })
  }

  it('⭐ and it is told in NT-1s manner, the manner table T-233 writes RS-54 against', () => {
    expect(shapeRefusedOnTheSelection().notices()[0]?.manner).toBe(mannerOf(RS_54))
  })

  it('⭐⭐ FR-083 (MUST): the arming STANDS through the refusal', () => {
    // The clause section 1 holds, read off `CommandPalette.armedText` -- the one
    // member that carries what is armed to the screen.
    const built = shapeRefusedOnTheSelection()
    const armed = built.armedText()
    expect(armed).not.toBe(null)
    expect(armed?.length ?? 0).toBeGreaterThan(0)
  })

  it('⛔ and nothing reached the document: AG-3 makes the bundle atomic', () => {
    const built = stage()
    built.pressEntry(MILESTONE)
    built.pressGround(GROUND.x, GROUND.y)
    const before = JSON.stringify(built.loop.document())
    built.pressEntry(RECTANGLE)
    expect(JSON.stringify(built.loop.document())).toBe(before)
  })

  it('⛔ THE CONTROL: a shape the selection CAN take is refused nothing and tells nobody', () => {
    // ⚠️ WITHOUT THIS, A BUILD THAT TOLD RS-54 ON EVERY PALETTE PRESS WOULD PASS
    // EVERY CASE ABOVE. ⭐ A rectangle-shaped task takes the chevron, both being
    // bar shapes of table T-012 -- FR-083 forbids only the crossing to SH-5.
    const built = stage()
    built.pressEntry(RECTANGLE)
    built.dragGround(GROUND, { x: GROUND.x + 240, y: GROUND.y })
    const drawn = (built.loop.document().schedule as any).tasks
    expect(drawn.length, 'the drag drew no bar-shaped task to select').toBe(1)
    expect(drawn[0].milestone).not.toBe(true)
    built.pressEntry(CHEVRON)
    expect(built.notices().length, 'a shape it CAN take was told as a refusal').toBe(0)
  })
})

// ===========================================================================
// 6. RULING C -- the picture a held press owes (PD-4), and the one press that
//    ends the naming it leads to (FR-091)
// ===========================================================================
//
// ⭐⭐ WHY THESE RUN THROUGH THE WHOLE SHELL AND NOT THROUGH UF-30. What PD-4
// asks for is a PICTURE, and a picture is what UF-48 computes -- `current()`
// answers `FrameValues`, whose `layout.placements` is 「置くことになる姿」 in the
// only form anything outside the drawing side can read. UF-30 plans the RELEASE
// and can say nothing about what stands while the press is still held.
//
// ⛔ NOT ONE EXPECTED VALUE IS COPIED OUT OF `src/`. Every one below is either a
// spelling read out of table T-012 at run time (`shapeSpelling`), or a RELATION
// the specification puts side by side: the picture against the document, the
// picture against itself one move later, and the drawing side against the
// placing side.

describe('table T-023a PD-4: the held press draws what it would place', () => {
  /** Far enough that `S-208` is passed on any machine: ten times the slop. */
  const TRAVEL = DRAG_THRESHOLD * 10

  function heldFor(entrance: Entrance, travel: number): Stage {
    const built = stage()
    built.pressEntry(entrance)
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + travel, y: GROUND.y })
    return built
  }

  it('⛔ THE CONTROL: with NOTHING armed the same held drag draws no task', () => {
    // ⚠️ WITHOUT THIS, A BUILD THAT DREW A TASK FOR EVERY HELD PRESS WOULD PASS
    // EVERY CASE BELOW. PD-5 is the row a press with no arm falls on, and its
    // result is 範囲選択 -- not a task.
    const built = stage()
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + TRAVEL, y: GROUND.y })
    expect(built.picture().layout.placements.length).toBe(0)
  })

  it('⭐⭐ THE RULING: a bar shape held past S-208 stands in the PICTURE', () => {
    // ⛔⛔ THE DEFECT THIS CASE IS WRITTEN FOR (台帳 D-372 ②). Measured
    // 2026-09-08 on the shipped build, 1920x1080: a rectangle armed and empty
    // ground dragged 100px left the schedule's SVG at 67081 bytes for all
    // eleven samples between the press and the release -- 0 bytes of spread --
    // and the row's own ⚠️ records the same measurement at 147px.
    const built = heldFor(RECTANGLE, TRAVEL)
    expect(built.picture().layout.placements.length).toBe(1)
  })

  it('⛔ and NOTHING reached the document while it was held (FR-031)', () => {
    const built = stage()
    built.pressEntry(RECTANGLE)
    const before = JSON.stringify(built.loop.document())
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + TRAVEL, y: GROUND.y })
    expect(JSON.stringify(built.loop.document())).toBe(before)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })

  it('⭐ the picture stretches the way the pointer went, and the document does not', () => {
    const near = heldFor(RECTANGLE, TRAVEL)
    const nearWidth = near.picture().layout.placements[0].width
    near.movePointer({ x: GROUND.x + TRAVEL * 3, y: GROUND.y })
    const farWidth = near.picture().layout.placements[0].width
    expect(farWidth).toBeGreaterThan(nearWidth)
    expect((near.loop.document().schedule as any).tasks.length).toBe(0)
  })

  it('⭐ 伸びる向きは、引いた向き: a leftward drag draws to the LEFT of the press', () => {
    const rightward = heldFor(RECTANGLE, TRAVEL)
    const leftward = heldFor(RECTANGLE, -TRAVEL)
    expect(leftward.picture().layout.placements[0].x).toBeLessThan(
      rightward.picture().layout.placements[0].x,
    )
  })

  it('⛔ FR-001 (MUST NOT): a bar shape that has not travelled draws nothing either', () => {
    // ⭐ THE PICTURE FOLLOWS THE WRITE, which is what makes 「描く側と置く側が同じ
    // 表を引く」 measurable from outside: a press that would make no task shows no
    // task while it is held.
    const built = stage()
    built.pressEntry(RECTANGLE)
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + 1, y: GROUND.y })
    expect(built.picture().layout.placements.length).toBe(0)
  })

  it('⭐ the release then writes ONCE, and the picture is the document from there on', () => {
    const built = heldFor(RECTANGLE, TRAVEL)
    built.letGo({ x: GROUND.x + TRAVEL, y: GROUND.y })
    expect((built.loop.document().schedule as any).tasks.length).toBe(1)
    expect(built.picture().layout.placements.length).toBe(1)
  })
})

describe('table T-023a PD-4 / 台帳 D-373: the draft is the ARMED shape', () => {
  const TRAVEL = DRAG_THRESHOLD * 10

  it('⭐ a bar shape armed draws table T-012s bar spelling', () => {
    const built = stage()
    built.pressEntry(RECTANGLE)
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + TRAVEL, y: GROUND.y })
    expect(built.picture().layout.placements[0].shapeKind).toBe(RECTANGLE_SPELLING)
  })

  it('⭐⭐ THE DEFECT D-373 IS ABOUT: a milestone armed does NOT draw a bar', () => {
    // ⛔ 「置こうとしている物と違う形が出る」 is the row's own reason, word for
    // word. A build that drew the bar spelling here would be drawing the thing
    // it is not about to place.
    const built = stage()
    built.pressEntry(MILESTONE)
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + TRAVEL, y: GROUND.y })
    const drawn = built.picture().layout.placements
    expect(drawn.length).toBe(1)
    expect(drawn[0].shapeKind).not.toBe(RECTANGLE_SPELLING)
    expect(drawn[0].shapeKind).toBe(shapeSpelling('SH-5'))
  })

  it('⭐⭐ 形状を 2 か所に持たせない: what is DRAWN is what is PLACED, figure and all', () => {
    // ⭐ THE RELATION IS THE ASSERTION. Nothing here says what the figure ought
    // to be -- it says the drawing side and the placing side answered the same,
    // which is what 「描く側と置く側が同じ表を引くこと（MUST）」 asks for and what
    // a second store of the shape would break.
    const built = stage()
    built.pressEntry(MILESTONE)
    built.holdGround(GROUND)
    built.movePointer({ x: GROUND.x + TRAVEL, y: GROUND.y })
    const held = built.picture().layout.placements[0]
    built.letGo({ x: GROUND.x + TRAVEL, y: GROUND.y })
    const placed = built.picture().layout.placements[0]
    expect(held.shapeKind).toBe(placed.shapeKind)
    expect(held.milestoneGlyph).toBe(placed.milestoneGlyph)
  })
})

describe('FR-091: the created name is settled by ONE press', () => {
  const TRAVEL = DRAG_THRESHOLD * 10

  /** Draw one bar-shaped task the way FR-001 has it drawn, and stop there. */
  function drawnTask(): Stage {
    const built = stage()
    built.pressEntry(RECTANGLE)
    built.dragGround(GROUND, { x: GROUND.x + TRAVEL, y: GROUND.y })
    return built
  }

  it('⛔ THE CONTROL: drawing one puts the panel up (FR-001 with FR-091)', () => {
    // ⚠️ WITHOUT THIS, A BUILD THAT NEVER OPENED THE PANEL WOULD PASS THE CASE
    // BELOW -- a panel that never stands is a panel that is always closed.
    expect(drawnTask().panel()).not.toBe(null)
  })

  it('⭐⭐ THE RULING: one Enter closes it', () => {
    // ⛔⛔ THE DEFECT THIS CASE IS WRITTEN FOR (台帳 D-372 ③). Measured
    // 2026-09-08 on the shipped build, 1920x1080: a rectangle drawn, a name
    // typed, `Enter` -- the panel was still 279px wide, and a further `Esc` was
    // what closed it. 「2 度押させてはならない（MUST NOT）」.
    //
    // ⛔⛔ THE FIELD HAS TO BE STANDING OR THIS CASE MEASURES NOTHING. That is
    // the whole of the defect: the `Enter` that settles the name is the press
    // `carryOutAction`'s ordinary guard turns away, because an edit stood when
    // it arrived. MEASURED with the fake answering 「無し」: the case passed on a
    // build carrying no fix at all.
    const built = drawnTask()
    built.holdTextEntry(true)
    built.pressKey('Enter')
    expect(built.panel()).toBe(null)
  })

  // ⛔⛔ FR-072's HALF IS NOT DRIVEN HERE, AND IT IS NAMED RATHER THAN CLAIMED
  // AWAY. Its MUST NOT -- 「パネルを出すのをやめても、選択を解いてはならない」 (利用者
  // の裁定 2026-08-30) -- is about a rename made LATER, and the only road to a
  // later rename is MK-13's double click on a task that is already drawn, which
  // this fixture's screen has no `Hit` to answer with (`pressed.hit` is `null`
  // for every press it makes). ⭐ IT WAS MEASURED INSTEAD, on the shipped build,
  // 1920x1080, 2026-09-08: a star drawn and named, then chosen again by a double
  // click and its field settled with one `Enter` -- the panel closed and `Delete`
  // still took the task (2 ten-corner polygons -> 0), on the build before this
  // change and on the build after it alike.

  it('⭐ and that selection is let go: the next Delete has nothing to take', () => {
    // ⭐ THE SELECTION IS READ THROUGH WHAT IT LETS A PERSON DO, because table
    // T-023c's value does not leave the loop. `SK-3` of table T-036 deletes what
    // is chosen, so a Delete that removes nothing is a selection that is gone.
    const built = drawnTask()
    built.pressKey('Enter')
    built.pressKey('Delete')
    expect((built.loop.document().schedule as any).tasks.length).toBe(1)
  })

  it('⛔ THE CONTROL: without that Enter the selection stands and Delete takes it', () => {
    // ⚠️ WITHOUT THIS, A BUILD THAT NEVER CHOSE THE NEW TASK AT ALL -- or one
    // whose `Delete` does nothing -- would pass the case above. FR-001 (MUST):
    // 「作ったタスクを選択にすること」.
    const built = drawnTask()
    built.pressKey('Delete')
    expect((built.loop.document().schedule as any).tasks.length).toBe(0)
  })

  it('⛔ FR-091 (MUST NOT): the arming stands through that press', () => {
    // 「構えはこの押下で解けない（MUST NOT）—— 構えの持続は 表 T-023b が定めており、
    // 解除は `Esc` と同じ入口の再押下だけである」, which is the 構えは続き half of
    // 利用者の逐語 above.
    const built = drawnTask()
    const armedBefore = built.armedText()
    built.pressKey('Enter')
    expect(armedBefore).not.toBe(null)
    expect(built.armedText()).toBe(armedBefore)
  })

  it('⭐ so the next drag draws a second task with no palette press in between', () => {
    const built = drawnTask()
    built.pressKey('Enter')
    const lower = { x: GROUND.x, y: GROUND.y + 120 }
    built.dragGround(lower, { x: lower.x + TRAVEL, y: lower.y })
    expect((built.loop.document().schedule as any).tasks.length).toBe(2)
  })
})
