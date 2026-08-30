// Unit tests for the THIRD member of `ScreenSurface` -- `readScreenPartAt`,
// which CR-192 added to IF-9 of 表 T-065 (docs/spec/05-07-design.md:386). The
// unit that implements it is UF-71 `dom-screen-surface.ts` (表 T-075),
// component `DomScreenSurface` (CP-38 of 表 T-062), published as PI-38 of
// 表 T-064.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. 表 T-218 of Chapter 7 gives them their place: TS-6, tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md §1 -- the one who wrote a unit does not write its test).
// What was read: docs/spec/ for every rule below, change-request/CR-192-*.md,
// the seam declaration `src/adapter/screen-renderer/screen-surface.ts`, the
// `ScreenView` family in `src/adapter/screen-renderer/screen-renderer.ts`,
// `PointerPress` in `src/adapter/input-command-translator/`, and of UF-71 itself
// only its head comment, the exported interface `ScreenSurfaceWiring` and the
// one signature `domScreenSurface(wiring): ScreenSurface`. Every expected value
// here comes from a requirement, a table or a recorded provisional decision --
// never from the implementation.
//
// ⭐ WHY THE FAKE IS SHAPED THE WAY IT IS. This is a Framework unit: it builds
// nodes, and `npm test` runs under Node with no DOM at all (vitest.config.ts
// sets `environment: 'node'`). R7.3 and LY-5 of 表 T-060 ask for the browser to
// be handed in rather than reached for, so the unit takes a `Document` as an
// argument and these cases hand it a fake instead. ⛔ A unit that reached for a
// global would fail every case here, and `no document anywhere` says so out loud.
//
// ⚠️ R6.3 -- WHAT THE FAKE MAY AND MAY NOT DECIDE. The fake answers geometry the
// way a browser does and in no other way: a rectangle is half-open (the rule
// `rectHoldsPoint` already follows in
// src/entity/layout-engine/screen-regions/screen-regions.ts:99, citing R3.4),
// later in document order paints over earlier, and a subtree that is not shown
// takes no pointer. ⛔ It holds no rule about UI parts -- which of two parts a
// point belongs to, and which entry, is the unit's answer and never the fake's.
// The cases below also assert what the unit DID: which point it asked about,
// which nodes it measured, which members of the host it touched, and that it
// wrote nothing while answering.
// ⚠️ THE LIMIT OF THAT, SAID PLAINLY: the unit resolves a point through the
// host's own `elementFromPoint`, so what these cases pin is the unit's part and
// entry resolution and its refusal to add a margin of its own -- not rectangle
// arithmetic it does not do. A host without that member answers nothing at all;
// no requirement asks for a fallback, so none is expected here.
//
// The rules these cases answer to:
//   表 T-065 IF-9   the supply cell as CR-192 rewrote it -- 「画面上の点がどの
//                   UI パーツ（表 T-103）のどの入口（表 T-109）の上かを答える」,
//                   with the MUST under that table (:390): the side that DREW an
//                   entry is the side that answers where it is
//   表 T-023a       (MUST, 01-04-requirements.md:2251) 判定順序を適用するのは
//                   日程の描画領域だけとすること -- the floating palette, the
//                   open surface, the `Notification Area` and the dialogue
//                   field hold no `ScreenRegions` rectangle, so a non-null
//                   answer over them is what stops a press from becoming PD-5's
//                   marquee underneath
//   表 T-023b       the arms, and the entries of 表 T-109 that set them
//   表 T-023d GR-19 「`Command Palette` の掴み帯 | **パレットの上端に敷く帯**
//                   （高さは `_assets/tbl-settings.md` の `S-135a`）| 掴めば
//                   パレットを動かす（`FR-053`）。⚠️ **帯の下に何が描かれていて
//                   も帯が勝つ**」, standing FIRST under that table's preamble
//                   「上の行ほど優先すること（MUST）」
//   表 T-109 IC-53  「掴んで動かせることを示す。**ボタンではない**」 -- the row
//                   the band is answered by, and the row no `CommandItem` may
//                   stand for
//   FR-053 / FR-083 SP-1 .. SP-4 -- a press on a palette shape arms or changes a
//                   shape, so the press has to reach the entry at all
//   FR-029          what cannot be used is drawn faint and gives its reason
//                   rather than going quiet -- so a disabled entry still answers
//   表 T-040 EZ-2   the explanation belongs to the icon the pointer rests ON;
//                   one entry, not its neighbour and not every icon
//   表 T-103        U-23 (MUST): an entrance is named by the `Row Title Panel`
//                   and never by the `Row Title Tree`; and 表 T-109's 面 column
//                   is the containing surface, not the grouping inside it
//   表 T-206 S-99g  「面」とは、画面の上に重ねて開き、`Esc` の第 1 階層で閉じ
//                   られるもの (_assets/tbl-settings.md:251) -- with IN-4 of
//                   表 T-028 putting 開いている面 FIRST in that order, an open
//                   surface stands over the palette where the two overlap
//   表 T-077 BO-1   nothing is drawn until the dimensions are settled, so before
//                   the first description a point is on nothing
//   R3.4            intervals are half-open by default; a point on the right or
//                   the bottom edge belongs to whatever comes next
//   R7.3 / LY-5     the browser ARRIVES; nothing here is reached for globally
//
// ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to be
// driven by a fixed copy of that table. `T_109_ARMING`, `T_109_ELSEWHERE` and
// `T_103_PARTS` are those copies, and each is checked against the .md at read
// time so it cannot fall behind a row.
//
// ⚠️ 表 T-051 HF-6 WAS REWRITTEN ON 2026-08-25 AND THIS FILE FOLLOWED IT. The
// row used to ask for the controls to be drawn 薄く and darkened while the
// pointer was on them; it now asks for them to be DRAWN AT ALL only while the
// pointer is on the row's name, and for the room they take up not to move while
// they are not. ⛔ The blocks that mirrored the old sentence were rewritten to
// the new one rather than deleted, and they hold the same three controls to the
// same two halves. Where they sit is marked at both ends of the file.
// ⭐ HF-4 (the right edge, whatever the name and whatever the depth) is
// untouched by that ruling. ⛔ Every block here was written by someone who did
// not write the unit and did not read its body.
//
// ⚠️ THREE THINGS ARE DELIBERATELY NOT ASSERTED, because no requirement decides
// them:
//   - what a disabled entry's REASON is carried as ON THIS SEAM. FR-029 (MUST)
//     asks for the reason to be given rather than the entry going quiet, and
//     every member `ScreenPart` declares says WHERE a point is and none says
//     WHY an entry is spent -- so what is
//     checked here is that the entry still answers, which is the half of FR-029
//     this member can carry. The words ride `CommandItem.label` and
//     `Tooltip.text`, which are UF-62's and UF-69's and are uf-71's to cover.
//   - which node of an entry is hit when its glyph is smaller than its box.
//     Nothing fixes an entry's geometry -- that is the whole reason IF-9 needs
//     this member -- so the layout below is this file's own, and only its EDGES
//     are asserted, against R3.4.
//   - which of two OPEN surfaces wins, because S-99g admits only one at a time.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  DialogueField,
  Notice,
  OpenModal,
  RowExpander,
  RowTitle,
  ScreenFrame,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that takes
// the copy from the .md at read time, which is what keeps the rosters below from
// falling behind a row.
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * The entries of 表 T-109 that ARM something on the palette, each with the row
 * of 表 T-023b it arms.
 *
 * ⭐ This is the set FR-083's SP-1 .. SP-4 speak of -- 「パレットの形状を押した
 * とき」 -- together with AR-4, AR-5 and AR-6, which 表 T-023b counts as arms as
 * well. ⛔ IC-50 is NOT here although it sits in the same 群: it opens
 * and folds the list of milestone figures, and arms nothing.
 */
const T_109_ARMING = [
  { row: 'IC-23', arm: 'AR-2' },
  { row: 'IC-24', arm: 'AR-2' },
  { row: 'IC-25', arm: 'AR-2' },
  { row: 'IC-26', arm: 'AR-2' },
  { row: 'IC-27', arm: 'AR-3' },
  { row: 'IC-28', arm: 'AR-3' },
  { row: 'IC-29', arm: 'AR-3' },
  { row: 'IC-30', arm: 'AR-3' },
  { row: 'IC-31', arm: 'AR-3' },
  { row: 'IC-32', arm: 'AR-3' },
  { row: 'IC-33', arm: 'AR-3' },
  { row: 'IC-34', arm: 'AR-3' },
  { row: 'IC-35', arm: 'AR-5' },
  { row: 'IC-36', arm: 'AR-6' },
  { row: 'IC-61', arm: 'AR-4' },
] as const

/**
 * Entries of 表 T-109 drawn somewhere OTHER than the palette or the row, with
 * the surface its 面 column gives them.
 *
 * ⛔⛔ THE `Row Title Panel` ENTRIES USED TO BE COPIED HERE BY HAND, and the
 * copy is what went stale on 2026-08-30: `HF-13` and `HF-14` gave 表 T-109 two
 * more rows on that surface (`IC-90` / `IC-91`), and six cases went on asking
 * for 「表 T-109's five entries」 by a list typed into this file. ⭐ That roster
 * is now READ OUT OF THE TABLE at load time (`T_109_ON_THE_ROW` below), so the
 * next entrance the specification puts on a row arrives here on its own.
 * ⚠️ WHAT IS LEFT HERE is the `App Header`, which no case reads as an ordered
 * roster -- these four are the ones the header fixture below draws.
 */
const T_109_ELSEWHERE = [
  { row: 'IC-5', surface: 'App Header' },
  { row: 'IC-7', surface: 'App Header' },
  { row: 'IC-12', surface: 'App Header' },
  { row: 'IC-13', surface: 'App Header' },
] as const

/**
 * 表 T-109's row for the palette's grab band, copied by row id.
 *
 * ⛔ NOT AN ENTRY, AND THE COPY SAYS SO. The 何の入口か column reads 「掴んで
 * 動かせることを示す。**ボタンではない**」, so `isButton` is false and no case
 * below may look for it among the things a press runs. `ScreenPart.entry` still
 * answers it, because that member is the ROW a point is on and not the entry
 * that can be pressed -- the band carries no name of its own to be answered by.
 */
const T_109_GRAB_BAND = {
  row: 'IC-53',
  surface: 'Command Palette',
  authority: 'FR-053',
  isButton: false,
} as const

/**
 * 表 T-023d, read out of the .md at read time.
 *
 * ⭐ Chapter 1.9 (:275) asks for a fixed copy; taking it from the file is that
 * copy, and it is the only form that can NOTICE the table being re-ordered.
 * The preamble the cases lean on is checked below, out of the same file.
 */
const T_023D = specTable('T-023d')

/**
 * The row that WINS a point when two grab regions overlap.
 *
 * ⛔ Taken from the table's first row and never named here, because the whole
 * claim is about the ORDER: 「上の行ほど優先すること（MUST）」. A case that wrote
 * the row id down instead would go on passing after that row had been pushed
 * further down the table.
 */
const T_023D_TOP_ROW = T_023D.rows[0]

/** The preamble of 表 T-023d, which is what makes the first row the winner. */
const T_023D_PRIORITY_PREAMBLE = '上の行ほど優先すること（MUST）'

/** 表 T-103 — the settled names these cases look for. */
const T_103_PARTS = [
  { row: 'U-22', name: 'Row Title Panel' },
  { row: 'U-23', name: 'Row Title Tree' },
  { row: 'U-26', name: 'Command Palette' },
  { row: 'U-30', name: 'Help Modal' },
  { row: 'U-31', name: 'App Header' },
  { row: 'U-34', name: 'Palette Commands' },
  { row: 'U-35', name: 'Header Commands' },
  { row: 'U-44', name: 'Dialogue Field' },
  { row: 'U-47', name: 'Row Expander' },
  { row: 'U-57', name: 'Notification Area' },
] as const

/**
 * The settled name 表 T-103 gives one row, out of the copy above.
 *
 * ⭐ W-4 of 表 T-006a (MUST) has a `data-role` that carries a settled name carry
 * it in `W-6`'s form, so a case looks a part up by its ROW rather than by a
 * spelling typed into the case. The copy is checked against the .md below, so a
 * name that moves in the table moves here too.
 *
 * ⚠️ `U-30` / `U-34` / `U-35` spell two names in one cell; this returns the
 * first, so it is for the rows that name exactly one part.
 */
function partName(row: string): string {
  const found = T_103_PARTS.find((one) => one.row === row)
  if (found === undefined) throw new Error(`the copy of 表 T-103 no longer holds ${row}`)
  return found.name
}

/** 表 T-109 — the roster of entrances, read out of the .md at load time. */
const T_109 = specTable('T-109')

/** 表 T-051 — the rules that place those entrances, read out of the .md too. */
const T_051 = specTable('T-051')

/**
 * The rows of 表 T-051 that place a control at the PANEL'S HEAD rather than on
 * each row, found by what those rows say about themselves.
 *
 * ⛔⛔ DERIVED AND NEVER LISTED, BECAUSE A LIST HERE HAS ALREADY GONE STALE
 * ONCE. This file used to strike out `HF-10` and `HF-12` by a regular
 * expression written over their ids; on 2026-08-30 the head gained `HF-16`
 * (最も浅い段を 1 階層だけ開く) and `HF-17` (最も浅い段へ行を 1 つ足す), and every
 * case driven by 「the entries on a row」 silently began asserting that two head
 * controls stand on every row -- which is what turned twenty-one of them red.
 *
 * ⭐ WHAT THE MANUSCRIPT ITSELF SAYS, and therefore what is matched:
 *   `HF-10` 「**行見出しパネルの最上部の右寄せに**、すべての行を開く操作子を 1 つ
 *           置くこと（MUST）」 -- the only row that names the place outright.
 *   `HF-12` 「**`HF-10` の操作子の隣に**、すべての行を畳む操作子を 1 つ置くこと
 *           （MUST）」
 *   `HF-16` 「**`HF-10` の操作子の並びに**、最も浅い段を 1 階層だけ開く操作子を
 *           1 つ置くこと（MUST）」
 *   `HF-17` 「**`HF-10` の操作子の並びに**、最も浅い段へ行を 1 つ足す操作子を
 *           1 つ置くこと（MUST）」
 * ⇒ a head row is one that either names 行見出しパネルの最上部 itself, or places
 * itself against `HF-10` の操作子. A row placed on 「各行に」 / 「行ごとに 1 つ」
 * says neither. ⛔ A fifth head control added tomorrow will have to say one of
 * those two things to be placed at all, and this reading picks it up unaided.
 */
const T_051_AT_THE_HEAD: readonly string[] = T_051.rows
  .filter((one) => {
    const says = one.cells.join(' ')
    return says.includes('行見出しパネルの最上部') || says.includes('`HF-10` の操作子')
  })
  .map((one) => one.id)

if (T_051_AT_THE_HEAD.length === 0) {
  throw new Error('表 T-051 no longer places a single control at the panel’s head')
}

/** Whether a 正 cell of 表 T-109 names one of the rows above. */
const isHeadRule = (authority: string): boolean =>
  T_051_AT_THE_HEAD.some((rule) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(authority),
  )

/**
 * Every entry 表 T-109 puts on the `Row Title Panel`, IN THE ORDER THE TABLE
 * PRINTS THEM, and never a list typed into this file.
 *
 * ⭐⭐ WHY IT IS READ AND NOT COPIED. Chapter 1.9 (:275) asks a test of a
 * requirement that points at a table to be driven by a fixed copy of that table,
 * and 「fixed copy」 is taken literally here: made at read time, from the file.
 * ⛔ The hand-written copy that stood in `T_109_ELSEWHERE` said FIVE, and six
 * cases asserted five by name; on 2026-08-30 the specification made it seven
 * (`IC-90` for `HF-13`, `IC-91` for `HF-14`) and every one of those cases was
 * asserting a roster the manuscript no longer holds.
 *
 * ⚠️ THE ORDER IS THE TABLE'S PRINTING ORDER AND NOT A PLACEMENT RULE. 表 T-051
 * の `HF-4` fixes the position of exactly ONE control -- 「ピン止めの操作子（表
 * T-109 の `IC-60`）を、並びのいちばん外（右端）に置くこと（MUST）」 -- and says
 * in as many words 「本行が定めるのはこの 1 つだけであり、ほかの操作子の前後は
 * 定めない」. So what the cases below read out of this order is WHICH entrances
 * end the row, not where each one is; the one placement the manuscript does fix
 * has a case of its own.
 */
/** Every entry 表 T-109 puts on the `Row Title Panel`, head and rows alike. */
const T_109_ON_THE_PANEL = T_109.rows.filter(
  (one) => bare(one.by['面'] ?? '') === partName('U-22'),
)

const T_109_ON_THE_ROW = T_109.rows
  .filter((one) => bare(one.by['面'] ?? '') === partName('U-22'))
  // ⛔ THE PANEL'S HEAD IS NOT A ROW, and which rows stand there is read out of
  // 表 T-051 rather than written here -- see `T_051_AT_THE_HEAD` above for why
  // the list that used to stand in this line could not be kept true.
  .filter((one) => !isHeadRule(one.by['正'] ?? ''))
  .map((one) => ({ row: one.id, surface: partName('U-22') }))

if (T_109_ON_THE_ROW.length === 0) {
  throw new Error('表 T-109 no longer puts a single entry on the Row Title Panel')
}

/**
 * Every entry 表 T-109 puts at the panel's HEAD, in the table's printing order.
 *
 * ⭐ THE COMPLEMENT OF THE ROSTER ABOVE, taken from the same two tables, so a
 * row cannot be counted twice or dropped by both.
 */
const T_109_AT_THE_HEAD = T_109.rows
  .filter((one) => bare(one.by['面'] ?? '') === partName('U-22'))
  .filter((one) => isHeadRule(one.by['正'] ?? ''))
  .map((one) => ({ row: one.id, rule: one.by['正'] ?? '' }))

if (T_109_AT_THE_HEAD.length === 0) {
  throw new Error('表 T-109 no longer puts a single entry at the Row Title Panel’s head')
}

/**
 * The entry 表 T-109 gives one row of 表 T-051, found through the table's own 正
 * column.
 *
 * ⭐ THE JOIN IS THE SPECIFICATION'S OWN. 表 T-109's 正 column names the row that
 * owns each entrance -- 「表 T-051 の `HF-2`」 for `IC-58` and so on -- so a case
 * that means 「HF-13's control」 can say so and be told which icon that is,
 * instead of typing `IC-90` and going quiet the day the roster is renumbered.
 * ⚠️ `\b` on both ends is what keeps `HF-1` from matching `HF-11`.
 */
function entranceForRule(rule: string): string {
  const found = T_109_ON_THE_PANEL.filter((one) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  const first = found[0]
  if (found.length !== 1 || first === undefined) {
    throw new Error(
      `表 T-109 gives ${rule} ${found.length} entrances on the Row Title Panel, not one`,
    )
  }
  return first.id
}

/**
 * The two entries of 表 T-109 that the `Row Expander` (U-47) is made of, each
 * with the row of 表 T-051 that is its 正.
 *
 * ⭐ 表 T-109, docs/spec/_assets/tbl-glossary.md:
 *   | IC-59 | `Row Title Panel` | — | この行を隠す              | 表 T-051 の `HF-3`  |
 *   | IC-90 | `Row Title Panel` | — | 行の配下を 1 階層だけ開く | 表 T-051 の `HF-13` |
 *   | IC-77 | `Row Title Panel` | — | 行の配下をすべて畳む      | 表 T-051 の `HF-11` |
 *   | IC-58 | `Row Title Panel` | — | 行の配下をすべて開く      | 表 T-051 の `HF-2`  |
 * ⛔ They are FOUR rows of the roster and not one row in four states.
 *
 * ⚠️ THE COUNT IS `HF-1`'s AND MOVED TWICE. 表 T-103's `U-47` holds no count of
 * its own -- 「員数と置き方は 表 T-051 の `HF-1` が持ち、本行は持たない」 -- and
 * on 2026-08-30 `HF-1` was rewritten to 「**隠す操作子と、配下を 1 階層開く操作子
 * と、配下をすべて閉じる操作子と、配下をすべて開く操作子を 1 つずつ**」. ⇒ FOUR,
 * and the order below is the one that row states outright: 「⭐⭐ **並びは 2 × 2
 * の格子とすること（MUST）** —— **左から 隠す・1 階層開く・配下をすべて畳む・
 * 配下をすべて開く**」.
 *
 * ⚠️ WHAT THE CLOSING SIDE MEANS WAS REPLACED ON 2026-08-30 (利用者の裁定,
 * recorded in `HF-3`'s own cell). `IC-59` used to be 表 T-015 の `HR-5`
 * (その行自身を畳む); it is now `HR-6` -- 「**隠す操作子は、その行を隠すこと
 * （MUST）**」 -- and `HR-5` stays in 表 T-015 with no entrance at all. ⛔ It is
 * the MEANING that moved and not the roster row: this unit still owes them
 * nothing but telling a press on one from a press on another.
 */
const T_109_ROW_EXPANDER = [
  { row: entranceForRule('HF-3'), rule: 'HF-3', gist: 'この行を隠す', side: 'hiding' },
  {
    row: entranceForRule('HF-13'),
    rule: 'HF-13',
    gist: '行の配下を 1 階層だけ開く',
    side: 'openingOneLevel',
  },
  {
    row: entranceForRule('HF-11'),
    rule: 'HF-11',
    gist: '行の配下をすべて畳む',
    side: 'closingBelow',
  },
  { row: entranceForRule('HF-2'), rule: 'HF-2', gist: '行の配下をすべて開く', side: 'opening' },
]

/**
 * 表 T-051 `HF-1` — the three sentences that settle how many folding controls a
 * row carries and in what order, copied verbatim.
 */
const T_051_HF1_FOUR_CONTROLS =
  '隠す操作子と、配下を 1 階層開く操作子と、配下をすべて閉じる操作子と、配下をすべて開く操作子を 1 つずつ'
const T_051_HF1_IS_A_LATTICE = '並びは 2 × 2 の格子とすること（MUST）'
const T_051_HF1_LEFT_TO_RIGHT = '左から 隠す・1 階層開く・配下をすべて畳む・配下をすべて開く'

/** 表 T-051 `HF-4` — the whole left-to-right run of a row, ruled 2026-08-30. */
const T_051_HF4_THE_WHOLE_RUN =
  '折り畳みの 4 つ（`HF-1` の格子）、足す、消す、ピン止めの順に、左から右へ置くこと（MUST）'

/** 表 T-051 `HF-10` — the run at the panel's head, ruled the same day. */
const T_051_HF10_THE_HEAD_RUN =
  '頭の並びは、左から 1 階層開く・すべて畳む・すべて開く・足すの順とすること（MUST）'

/** 表 T-051 `HF-15` — the four MUSTs of that row that reach a drawing unit. */
const T_051_HF15_THE_AXIS_MARK =
  'いまどちらの軸が生きているかを、掴んでいる行に描くこと（MUST）'
const T_051_HF15_THE_BANDS =
  '上下の軸が生きているときは行の左右の辺に、左右の軸が生きているときは行の上下の辺に、帯を 1 本ずつ描くこと（MUST）'
const T_051_HF15_THE_GROUND = '掴んでいる行には地を敷くこと（MUST）'
const T_051_HF15_THE_STRIP_IS_ALWAYS_DRAWN = '掴み代は常に描くこと（MUST）'

/** 表 T-051 `HF-18` — the count a row shows for what it holds folded. */
const T_051_HF18_THE_COUNT =
  '配下に畳み込んでいる行があるとき、その行数を行に示すこと（MUST）'

/**
 * `HF-1`'s lattice, LEFT TO RIGHT, each place with the row of 表 T-051 that owns
 * the control standing there.
 *
 * ⭐ THE ORDER IS THE ONE SENTENCE, and the word beside each rule is the word
 * that sentence uses for it -- so the premise case below can read the sentence
 * and fail the moment the manuscript re-orders the lattice, instead of this
 * list quietly outliving the ruling that made it.
 * ⚠️ The pairing of word to rule is prose in the manuscript and cannot be
 * machine-joined: 「隠す」 is `HF-3` because that row is the one that hides,
 * 「1 階層開く」 is `HF-13`, 「配下をすべて畳む」 is `HF-11` and 「配下をすべて
 * 開く」 is `HF-2`, each in those rows' own words.
 */
const T_051_HF1_LATTICE = [
  { rule: 'HF-3', word: '隠す' },
  { rule: 'HF-13', word: '1 階層開く' },
  { rule: 'HF-11', word: '配下をすべて畳む' },
  { rule: 'HF-2', word: '配下をすべて開く' },
] as const

/**
 * 表 T-051 — the rules the pair above answers to, copied from
 * docs/spec/01-04-requirements.md:1307-1309.
 *
 * ⚠️ HF-2 and HF-3 are what the two ENTRIES mean; neither is carried out by this
 * unit, which draws. What this unit owes them is that a press on either can be
 * told apart from a press on the other -- otherwise the shell has one control to
 * hang two different effects on.
 */
const T_051_EXPANDER = [
  // ⚠️ FOUR PER ROW SINCE 2026-08-30: `HF-1` was rewritten to name the hide, the
  // one-level open, the fold-all-below and the open-all-below, and to arrange
  // them in a lattice. ⛔ The gist below is the four-control sentence itself, so
  // a table that went back to three cannot leave this file green.
  { row: 'HF-1', gist: T_051_HF1_FOUR_CONTROLS },
  { row: 'HF-1', gist: T_051_HF1_IS_A_LATTICE },
  { row: 'HF-2', gist: '開く操作子は、その行の配下をすべて開くこと（MUST）' },
  // ⛔ `HF-3` IS NO LONGER 「その行自身を畳む」. 利用者の裁定 2026-08-30 gave it
  // 表 T-015 の `HR-6` instead: 「**隠す操作子は、その行を隠すこと（MUST）**」.
  { row: 'HF-3', gist: '隠す操作子は、その行を隠すこと（MUST）' },
  { row: 'HF-11', gist: '配下をすべて閉じる操作子は、その行の配下をすべて畳むこと（MUST）' },
  { row: 'HF-13', gist: '1 階層だけ開く操作子を、行ごとに 1 つ置くこと（MUST）' },
] as const

/**
 * 表 T-103's U-47 — the part, and WHO holds how many controls it has.
 *
 * ⛔ IT USED TO CARRY THE COUNT ITSELF -- 「開く側と、その行を閉じる側と、配下
 * をすべて閉じる側の 3 つで 1 組」 -- and 表 T-051's `HF-1` enumerated the same
 * three. ⚠️ Two places, one number: when `HF-13` and `HF-14` made it five, the
 * copy in U-47 was the one that went stale. ⭐ The count now lives only at its
 * owner, and this case is what keeps it from coming back.
 */
const T_103_U47_POINTS_AT_ITS_OWNER = '表 T-051 の `HF-1`'
const T_103_U47_HOLDS_NO_COUNT = /\d+\s*つで\s*1\s*組/

/** 表 T-023a's own note, which the 面 table under it belongs to. */
const T_023A_ONLY_THE_DRAWING_AREA =
  '判定順序を適用するのは日程の描画領域だけとすること（MUST）。'

/** The MUST under 表 T-065 that puts the answer on the side that drew it. */
const T_065_THE_SIDE_THAT_DREW_IT =
  '点がどの入口の上かは、その入口を描いた側が答えること（MUST）'

/** S-99g's definition of 「面」 -- what stands OVER the screen. */
const S_99G_OVER_THE_SCREEN = '画面の上に重ねて開き'

const specText = (...parts: string[]): string =>
  readFileSync(join(process.cwd(), 'docs', 'spec', ...parts), 'utf8')

// ---------------------------------------------------------------------------
// The fake browser.
// ---------------------------------------------------------------------------

interface FakeEvent {
  readonly type: string
  readonly key: string
  readonly isComposing: boolean
  readonly shiftKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
  target: FakeElement | null
  currentTarget: FakeElement | null
  defaultPrevented: boolean
  preventDefault(): void
  stopPropagation(): void
}

interface Registration {
  readonly node: FakeElement
  readonly type: string
  readonly listener: (event: FakeEvent) => void
}

type StyleWrite =
  | { readonly kind: 'reset'; readonly css: string }
  | { readonly kind: 'set'; readonly property: string; readonly value: string }

/** One question about a point, as the unit put it. */
interface PointQuery {
  readonly member: string
  readonly x: number
  readonly y: number
}

class FakeText {
  parentNode: FakeElement | null = null
  constructor(public data: string) {}
}

type FakeNode = FakeElement | FakeText

class FakeElement {
  readonly tagName: string
  readonly attributes = new Map<string, string>()
  readonly childNodes: FakeNode[] = []
  readonly styleWrites: StyleWrite[] = []
  parentNode: FakeElement | null = null
  /** Only an `input` really has one; harmless elsewhere and it keeps the fake small. */
  value = ''
  isMount = false

  constructor(
    tagName: string,
    readonly world: World,
  ) {
    this.tagName = tagName.toUpperCase()
  }

  // -- attributes ---------------------------------------------------------

  setAttribute(name: string, value: string): void {
    if (name === 'style') {
      this.styleWrites.push({ kind: 'reset', css: value })
      return
    }
    this.attributes.set(name, String(value))
  }

  getAttribute(name: string): string | null {
    // ⛔⛔ THE TRAILING `;` IS THE BROWSER'S AND WAS MISSING HERE. A real
    // `getAttribute('style')` hands back the SERIALISED declaration block, and
    // every browser ends that block with a semicolon; `inlineStyle` below joins
    // the declarations with one and stops. ⚠️ THE UNIT READS ITS OWN STYLE BACK
    // AND APPENDS TO IT -- `open.getAttribute('style') + rowControlRight(...)`
    // -- so without the semicolon the fake glued two declarations into one
    // (`cursor:pointerright:4em`) and the inset silently vanished. That is the
    // fake deciding a rule of the browser's, which R6.3 forbids it.
    if (name === 'style') {
      const css = inlineStyle(this)
      return css === '' ? css : `${css};`
    }
    return this.attributes.get(name) ?? null
  }

  hasAttribute(name: string): boolean {
    if (name === 'style') return this.styleWrites.length > 0
    return this.attributes.has(name)
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }

  get dataset(): Record<string, string> {
    const element = this
    return new Proxy(
      {},
      {
        get(_target, property): string | undefined {
          if (typeof property !== 'string') return undefined
          return element.attributes.get(`data-${kebab(property)}`)
        },
        set(_target, property, value): boolean {
          if (typeof property === 'string') {
            element.attributes.set(`data-${kebab(property)}`, String(value))
          }
          return true
        },
      },
    ) as Record<string, string>
  }

  get id(): string {
    return this.attributes.get('id') ?? ''
  }

  set id(value: string) {
    this.attributes.set('id', value)
  }

  get className(): string {
    return this.attributes.get('class') ?? ''
  }

  set className(value: string) {
    this.attributes.set('class', value)
  }

  get classList(): {
    add: (...names: string[]) => void
    remove: (...names: string[]) => void
    contains: (name: string) => boolean
    toggle: (name: string, force?: boolean) => void
  } {
    const element = this
    const names = (): Set<string> =>
      new Set(element.className.split(/\s+/).filter((one) => one.length > 0))
    const write = (set: Set<string>): void => {
      element.className = [...set].join(' ')
    }
    return {
      add: (...added) => {
        const set = names()
        for (const one of added) set.add(one)
        write(set)
      },
      remove: (...removed) => {
        const set = names()
        for (const one of removed) set.delete(one)
        write(set)
      },
      contains: (name) => names().has(name),
      toggle: (name, force) => {
        const set = names()
        const on = force ?? !set.has(name)
        if (on) set.add(name)
        else set.delete(name)
        write(set)
      },
    }
  }

  /** ⛔ FR-023: an assignment here would be markup. It is recorded, never obeyed. */
  get innerHTML(): string {
    this.world.markupWrites.push({ node: this, value: '(read)' })
    return ''
  }

  set innerHTML(value: string) {
    this.world.markupWrites.push({ node: this, value })
  }

  get style(): Record<string, string> {
    const element = this
    return new Proxy(
      {},
      {
        get(_target, property): unknown {
          if (property === 'setProperty') {
            return (name: string, value: string): void => {
              element.styleWrites.push({ kind: 'set', property: name, value })
            }
          }
          if (typeof property !== 'string') return undefined
          return styleMap(element).get(kebab(property)) ?? ''
        },
        set(_target, property, value): boolean {
          if (typeof property !== 'string') return true
          if (property === 'cssText') {
            element.styleWrites.push({ kind: 'reset', css: String(value) })
            return true
          }
          element.styleWrites.push({ kind: 'set', property: kebab(property), value: String(value) })
          return true
        },
      },
    ) as Record<string, string>
  }

  get disabled(): boolean {
    return this.attributes.has('disabled')
  }

  set disabled(value: boolean) {
    if (value) this.attributes.set('disabled', '')
    else this.attributes.delete('disabled')
  }

  // -- the tree -----------------------------------------------------------

  private adopt(node: FakeNode | string): FakeNode {
    if (typeof node === 'string') return new FakeText(node)
    node.parentNode?.detach(node)
    return node
  }

  private detach(node: FakeNode): void {
    const at = this.childNodes.indexOf(node)
    if (at >= 0) this.childNodes.splice(at, 1)
    node.parentNode = null
  }

  append(...nodes: (FakeNode | string)[]): void {
    for (const one of nodes) {
      const node = this.adopt(one)
      node.parentNode = this
      this.childNodes.push(node)
    }
  }

  appendChild(node: FakeNode): FakeNode {
    this.append(node)
    return node
  }

  replaceChildren(...nodes: (FakeNode | string)[]): void {
    for (const one of [...this.childNodes]) this.detach(one)
    this.append(...nodes)
  }

  removeChild(node: FakeNode): FakeNode {
    this.detach(node)
    return node
  }

  insertBefore(node: FakeNode, reference: FakeNode | null): FakeNode {
    const adopted = this.adopt(node)
    const at = reference === null ? this.childNodes.length : this.childNodes.indexOf(reference)
    this.childNodes.splice(at < 0 ? this.childNodes.length : at, 0, adopted)
    adopted.parentNode = this
    return adopted
  }

  remove(): void {
    this.parentNode?.detach(this)
  }

  get children(): FakeElement[] {
    return this.childNodes.filter((one): one is FakeElement => one instanceof FakeElement)
  }

  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null
  }

  get lastChild(): FakeNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null
  }

  get parentElement(): FakeElement | null {
    return this.parentNode
  }

  get textContent(): string {
    return this.childNodes
      .map((one) => (one instanceof FakeText ? one.data : one.textContent))
      .join('')
  }

  set textContent(value: string) {
    for (const one of [...this.childNodes]) this.detach(one)
    if (value !== '') this.append(new FakeText(value))
  }

  get isConnected(): boolean {
    let at: FakeElement | null = this
    while (at !== null) {
      if (at.isMount) return true
      at = at.parentNode
    }
    return false
  }

  contains(node: FakeElement): boolean {
    let at: FakeElement | null = node
    while (at !== null) {
      if (at === this) return true
      at = at.parentNode
    }
    return false
  }

  closest(selector: string): FakeElement | null {
    let at: FakeElement | null = this
    while (at !== null) {
      if (matches(at, selector)) return at
      at = at.parentNode
    }
    return null
  }

  querySelector(selector: string): FakeElement | null {
    this.world.selectors.push(selector)
    return descendants(this).find((one) => matches(one, selector)) ?? null
  }

  querySelectorAll(selector: string): FakeElement[] {
    this.world.selectors.push(selector)
    return descendants(this).filter((one) => matches(one, selector))
  }

  // -- what only a browser can answer -------------------------------------

  getBoundingClientRect(): {
    x: number
    y: number
    width: number
    height: number
    top: number
    left: number
    right: number
    bottom: number
  } {
    this.world.measured.push(this)
    const box = laidOut(this)
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      top: box.y,
      left: box.x,
      right: box.x + box.width,
      bottom: box.y + box.height,
    }
  }

  focus(): void {
    this.world.activeElement = this
  }

  blur(): void {
    if (this.world.activeElement === this) this.world.activeElement = null
  }

  // -- events -------------------------------------------------------------

  addEventListener(type: string, listener: (event: FakeEvent) => void): void {
    this.world.registrations.push({ node: this, type, listener })
  }

  removeEventListener(type: string, listener: (event: FakeEvent) => void): void {
    const at = this.world.registrations.findIndex(
      (one) => one.node === this && one.type === type && one.listener === listener,
    )
    if (at >= 0) this.world.registrations.splice(at, 1)
  }

  dispatchEvent(event: FakeEvent): boolean {
    event.target = this
    let stopped = false
    const stop = event.stopPropagation.bind(event)
    Object.defineProperty(event, 'stopPropagation', {
      configurable: true,
      value: (): void => {
        stopped = true
        stop()
      },
    })
    let at: FakeElement | null = this
    while (at !== null && !stopped) {
      const here: FakeElement = at
      for (const one of [...this.world.registrations]) {
        if (one.node === here && one.type === event.type) {
          event.currentTarget = here
          one.listener(event)
        }
      }
      at = at.parentNode
    }
    return !event.defaultPrevented
  }
}

interface World {
  readonly created: FakeElement[]
  readonly registrations: Registration[]
  readonly measured: FakeElement[]
  readonly selectors: string[]
  readonly markupWrites: { node: FakeElement; value: string }[]
  readonly hostMembers: string[]
  readonly pointQueries: PointQuery[]
  /** This file's own placing, by `data-icon` first and then by `data-role`. */
  readonly layout: Map<string, ScreenRect>
  mount: FakeElement | null
  activeElement: FakeElement | null
}

// ---------------------------------------------------------------------------
// The fake's geometry. ⛔ A browser's rules, and no opinion of this file's.
// ---------------------------------------------------------------------------

const ZERO: ScreenRect = { x: 0, y: 0, width: 0, height: 0 }

const layoutKey = (element: FakeElement): string | null => {
  const icon = element.attributes.get('data-icon')
  if (icon !== undefined) return `icon:${icon}`
  const role = element.attributes.get('data-role')
  if (role !== undefined) return `role:${role}`
  return null
}

/**
 * Where this node sits.
 *
 * ⭐ Worked out from the ATTRIBUTES the unit wrote rather than from a table keyed
 * by node, so that a measurement taken while drawing and one taken while
 * answering a point cannot disagree. A node the layout does not place takes the
 * union of what it holds, the way a plain box does.
 */
function laidOut(element: FakeElement): ScreenRect {
  const key = layoutKey(element)
  if (key !== null) {
    const placed = element.world.layout.get(key)
    if (placed !== undefined) return placed
  }
  let box: ScreenRect | null = null
  for (const child of element.children) {
    const inside = laidOut(child)
    if (inside.width === 0 && inside.height === 0) continue
    box = box === null ? inside : union(box, inside)
  }
  return box ?? ZERO
}

function union(a: ScreenRect, b: ScreenRect): ScreenRect {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  }
}

/**
 * Half-open on both axes -- the same rule `rectHoldsPoint` follows in
 * src/entity/layout-engine/screen-regions/screen-regions.ts:99, which cites R3.4
 * of docs/development-rules/07-review-standards.md:495.
 */
const holdsPoint = (box: ScreenRect, x: number, y: number): boolean =>
  box.width > 0 &&
  box.height > 0 &&
  x >= box.x &&
  x < box.x + box.width &&
  y >= box.y &&
  y < box.y + box.height

const isHiddenHere = (element: FakeElement): boolean => {
  const style = styleOf(element)
  return style.includes('visibility:hidden') || style.includes('display:none')
}

const isShown = (element: FakeElement): boolean => {
  let at: FakeElement | null = element
  while (at !== null) {
    if (isHiddenHere(at)) return false
    at = at.parentNode
  }
  return true
}

/**
 * Every node the point lands on, topmost first.
 *
 * ⭐ A browser's order: later in document order paints over earlier, and a
 * subtree that is not shown takes no pointer. ⛔ Which of two UI PARTS wins is
 * not decided here -- that is the unit's answer, and this only says what a page
 * would have looked like.
 */
function stackAt(root: FakeElement, x: number, y: number): FakeElement[] {
  const found: FakeElement[] = []
  const walk = (at: FakeElement): void => {
    if (isHiddenHere(at)) return
    if (holdsPoint(laidOut(at), x, y)) found.push(at)
    for (const child of at.children) walk(child)
  }
  walk(root)
  return found.reverse()
}

// ---------------------------------------------------------------------------
// Wiring the unit up.
// ---------------------------------------------------------------------------

interface Stage {
  readonly world: World
  readonly host: Document
  readonly mount: FakeElement
  readonly reportedHeights: number[]
  surface: ScreenSurface | undefined
  root(): FakeElement
}

/**
 * A browser that is only what `ScreenSurfaceWiring` says it is, plus the one
 * member a real `Document` offers for a point.
 *
 * ⚠️ The host is a Proxy so that every member the unit reaches for is recorded.
 */
function stage(layout: Map<string, ScreenRect>): Stage {
  const world: World = {
    created: [],
    registrations: [],
    measured: [],
    selectors: [],
    markupWrites: [],
    hostMembers: [],
    pointQueries: [],
    layout,
    mount: null,
    activeElement: null,
  }

  const mount = new FakeElement('div', world)
  mount.isMount = true
  world.mount = mount

  const base: Record<string, unknown> = {
    createElement(tagName: string): FakeElement {
      const made = new FakeElement(tagName, world)
      world.created.push(made)
      return made
    },
    elementFromPoint(x: number, y: number): FakeElement | null {
      world.pointQueries.push({ member: 'elementFromPoint', x, y })
      return stackAt(mount, x, y)[0] ?? null
    },
    elementsFromPoint(x: number, y: number): FakeElement[] {
      world.pointQueries.push({ member: 'elementsFromPoint', x, y })
      return stackAt(mount, x, y)
    },
  }

  const host = new Proxy(base, {
    get(target, property, receiver): unknown {
      if (typeof property === 'string') world.hostMembers.push(property)
      return Reflect.get(target, property, receiver)
    },
    has(target, property): boolean {
      if (typeof property === 'string') world.hostMembers.push(property)
      return Reflect.has(target, property)
    },
  }) as unknown as Document

  return {
    world,
    host,
    mount,
    reportedHeights: [],
    surface: undefined,
    root(): FakeElement {
      const first = mount.children[0]
      if (first === undefined) throw new Error('the unit mounted nothing')
      return first
    },
  }
}

/**
 * The rendering and hue every case below wires the surface with.
 *
 * ⛔ NEITHER VALUE IS TYPED HERE. S-72's default arrives through the generated
 * `SETTINGS_DEFAULTS`, and S-73's is read out of table T-216 at load time --
 * DR-5 of table T-052 keeps the hue on `Project` rather than in the settings, so
 * no generated constant carries it. Rule 03 section 1 forbids re-typing either.
 *
 * ⭐ WHY THE BENCH HAS TO STATE ONE. `readTheme` is a REQUIRED member of
 * `ScreenSurfaceWiring` because FR-041 (MUST NOT) leaves the viewing environment
 * no say over the rendering. ⚠️ No case in this file reads a colour back -- the
 * cases here are about which parts are drawn and where -- so the manuscript's
 * default is the honest neutral; a case that meant dark would say dark.
 */
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME: ScreenTheme = {
  preference: SETTINGS_DEFAULTS['themePreference'] as ScreenTheme['preference'],
  hue: Number(bare(S_73.by['既定'] ?? '')),
}

function wiringOf(built: Stage): ScreenSurfaceWiring {
  return {
    host: built.host,
    mount: built.mount as unknown as Element,
    readAuthor: (): string => 'Watcher',
    readClockMs: (): number => Date.UTC(2026, 7, 21, 3, 4, 5),
    onAppHeaderHeightPx: (heightPx: number): void => {
      built.reportedHeights.push(heightPx)
    },
    readTheme: (): ScreenTheme => THEME,
  }
}

function wire(layout: Map<string, ScreenRect> = LAYOUT): Stage {
  const built = stage(layout)
  built.surface = domScreenSurface(wiringOf(built))
  return built
}

function surfaceOf(built: Stage): ScreenSurface {
  if (built.surface === undefined) throw new Error('the surface was not built')
  return built.surface
}

/** Wire up and draw -- the shape almost every case takes. */
function drawn(view: ScreenView): Stage {
  const built = wire()
  surfaceOf(built).showScreenView(view)
  return built
}

const ask = (built: Stage, x: number, y: number): ScreenPart | null =>
  surfaceOf(built).readScreenPartAt(x, y)

// ---------------------------------------------------------------------------
// Reading the tree the unit built.
// ---------------------------------------------------------------------------

const kebab = (name: string): string => name.replace(/[A-Z]/g, (one) => `-${one.toLowerCase()}`)

function styleMap(element: FakeElement): Map<string, string> {
  const held = new Map<string, string>()
  for (const write of element.styleWrites) {
    if (write.kind === 'reset') {
      held.clear()
      for (const one of write.css.split(';')) {
        const at = one.indexOf(':')
        if (at < 0) continue
        held.set(one.slice(0, at).trim().toLowerCase(), one.slice(at + 1).trim())
      }
      continue
    }
    held.set(write.property.toLowerCase(), write.value)
  }
  return held
}

function inlineStyle(element: FakeElement): string {
  return [...styleMap(element)].map(([property, value]) => `${property}:${value}`).join(';')
}

const styleOf = (element: FakeElement): string =>
  inlineStyle(element).replace(/\s+/g, '').toLowerCase()

function descendants(element: FakeElement): FakeElement[] {
  const found: FakeElement[] = []
  for (const child of element.children) {
    found.push(child, ...descendants(child))
  }
  return found
}

const selfAndDescendants = (element: FakeElement): FakeElement[] => [
  element,
  ...descendants(element),
]

const byRole = (root: FakeElement, role: string): FakeElement[] =>
  selfAndDescendants(root).filter((one) => one.getAttribute('data-role') === role)

function entryFor(root: FakeElement, icon: string): FakeElement {
  const found = selfAndDescendants(root).filter((one) => one.getAttribute('data-icon') === icon)
  const first = found[0]
  if (first === undefined) throw new Error(`nothing carries data-icon="${icon}"`)
  return first
}

/** Attributes and text together, for the case that asks whether anything moved. */
function serialize(element: FakeElement): string {
  const attributes = [...element.attributes].map(([name, value]) => ` ${name}="${value}"`).join('')
  const style = inlineStyle(element)
  const inside = element.childNodes
    .map((one) => (one instanceof FakeText ? one.data : serialize(one)))
    .join('')
  const tag = element.tagName.toLowerCase()
  return `<${tag}${attributes}${style === '' ? '' : ` style="${style}"`}>${inside}</${tag}>`
}

/** A tiny selector engine: enough for `[attr]`, `[attr="value"]`, a tag and a descendant. */
function matches(element: FakeElement, selector: string): boolean {
  const parts = selector.trim().split(/\s+(?![^[]*\])/)
  const last = parts[parts.length - 1]
  if (last === undefined) return false
  if (!matchesSimple(element, last)) return false
  let at = element.parentNode
  for (let index = parts.length - 2; index >= 0; index -= 1) {
    const want = parts[index]
    if (want === undefined) continue
    let found = false
    while (at !== null) {
      if (matchesSimple(at, want)) {
        found = true
        at = at.parentNode
        break
      }
      at = at.parentNode
    }
    if (!found) return false
  }
  return true
}

function matchesSimple(element: FakeElement, selector: string): boolean {
  const attribute = /^\[([^\]=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]$/.exec(selector)
  if (attribute !== null) {
    const name = attribute[1] ?? ''
    const wanted = attribute[2] ?? attribute[3] ?? attribute[4]
    const held = element.getAttribute(name)
    if (held === null) return false
    return wanted === undefined || held === wanted
  }
  if (selector.startsWith('#')) return element.id === selector.slice(1)
  if (selector.startsWith('.')) return element.classList.contains(selector.slice(1))
  return element.tagName === selector.toUpperCase()
}

// ---------------------------------------------------------------------------
// The screen these cases press on.
// ---------------------------------------------------------------------------

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

/** 1000 x 800, with an `App Header` inside S-116's band (32 .. 96). */
const WINDOW = { width: 1000, height: 800 } as const
const HEADER_HEIGHT = 40
const ENTRY = 24

/** Four header entries; IC-13 and IC-12 TOUCH, so R3.4 has an edge to resolve. */
const HEADER_ENTRY_X: Readonly<Record<string, number>> = {
  'IC-5': 100,
  'IC-7': 132,
  'IC-13': 180,
  'IC-12': 204,
}

const paletteEntryBox = (index: number): ScreenRect =>
  rect(410 + (index % 6) * 30, 310 + Math.floor(index / 6) * 30, ENTRY, ENTRY)

/**
 * Where the `Command Palette` floats. ⭐ Named rather than written twice: the
 * band GR-19 lays on it is placed FROM this box, so the two cannot drift apart.
 */
const PALETTE_BOX = rect(400, 300, 220, 180)

/**
 * How far down the grab band reaches.
 *
 * ⚠️ THE NUMBER IS THIS FILE'S OWN, and 表 T-206 states the real one at
 * `S-135a`. Rule 03 section 1 keeps that value in one place and
 * `tests/unit/uf-65.test.ts` is the bench that holds a described band to the
 * manuscript; what THIS unit owes GR-19 is that a point on the band answers the
 * band, whatever height the description carries. ⭐ Chosen to stop exactly where
 * the first row of entries begins, so R3.4 has one edge to resolve between them.
 */
const GRAB_BAND_HEIGHT = 10

/**
 * The band GR-19 of 表 T-023d lays 「パレットの上端に敷く」 -- the palette's own
 * width, the palette's own top corner, and S-135a's height.
 *
 * ⛔ UNLIKE EVERY OTHER BOX IN `LAYOUT`, THIS ONE IS NOT THIS FILE'S INVENTION:
 * GR-19 fixes where the band goes and 表 T-206 how far down it reaches, so a
 * browser laying the palette out has no freedom here. That is why it is derived
 * from `PALETTE_BOX` rather than typed.
 */
const GRAB_BAND_BOX = rect(PALETTE_BOX.x, PALETTE_BOX.y, PALETTE_BOX.width, GRAB_BAND_HEIGHT)

/**
 * ⭐ Chosen so that every relation a case needs is present exactly once: the
 * `Help Modal` overlaps the palette WITHOUT covering it, the `Notification
 * Area` begins on the `App Header`'s bottom edge, and the `Row Title Tree` sits
 * on the `Row Title Panel`.
 */
const LAYOUT = new Map<string, ScreenRect>([
  ['role:App Header', rect(0, 0, WINDOW.width, HEADER_HEIGHT)],
  ['role:Row Title Panel', rect(0, 40, 170, 660)],
  ['role:Row Title Tree', rect(0, 40, 170, 660)],
  // ⭐ The `Row Expander` is placed by ROLE and the `Row Pin` by ICON, and the
  // difference is the unit's, not this file's: the unit marks the pin with its
  // row of 表 T-109 (`data-icon="IC-60"`) and deliberately leaves the expander
  // unmarked (IC-58 / IC-59 are not yet drawn as a pair). `layoutKey` reads
  // `data-icon` FIRST -- as it must, since a browser lays a node out whatever
  // attributes it carries -- so each box has to be registered under the key its
  // own node actually yields. ⛔ Registering the pin under `role:Row Pin` would
  // give it the ZERO rectangle in silence and no press would ever reach it.
  // ⭐ Kept as the fallback for a `Row Expander` node that carries no row of 表
  // T-109; the two that DO carry one are placed by icon just below, because
  // `layoutKey` reads `data-icon` first (see the note on `laidOut`).
  ['role:Row Expander', rect(10, 60, 16, 16)],
  // ⭐ The three of U-47, laid side by side ON PURPOSE: IC-58 holds x 84..100,
  // IC-59 x 100..116 and IC-77 x 116..132, so each shares an edge with the next
  // and R3.4 has one to resolve. The gap to the `Row Pin` at x 140 leaves a
  // strip of bare panel between them, so 「面の上・入口の外」 can be told from
  // 「入口の上」 without leaving the row.
  // ⚠️ THE ROW GREW A THIRD CONTROL ON 2026-08-30 (CR-294, HF-11 / IC-77), and
  // the three were shifted one box left rather than squeezed into the strip --
  // the strip is what one case reads, and taking it away would delete a case.
  // ⛔ These boxes are this file's own; nothing in docs/spec fixes an entry's
  // geometry -- that is the very reason IF-9 needs `readScreenPartAt` -- so only
  // their EDGES are asserted, and only against R3.4.
  // ⭐ AND TWO MORE ON 2026-08-30 (CR-318): `HF-13` gave `HR-7` an entrance of
  // its own and `HF-14` gave `HR-8` one, so the row carries five of these before
  // the pin. They are laid to the LEFT of the three above rather than between
  // them, so that every edge an existing case resolves stays where it was.
  [`icon:${entranceForRule('HF-13')}`, rect(52, 60, 16, 16)],
  [`icon:${entranceForRule('HF-14')}`, rect(68, 60, 16, 16)],
  ['icon:IC-58', rect(84, 60, 16, 16)],
  ['icon:IC-59', rect(100, 60, 16, 16)],
  ['icon:IC-77', rect(116, 60, 16, 16)],
  ['icon:IC-60', rect(140, 60, 16, 16)],
  ['role:Command Palette', PALETTE_BOX],
  // GR-19 of 表 T-023d, marked with the row 表 T-109 gives it (IC-53) the way an
  // entry is marked -- which is what `ScreenPart.entry` declares it answers by.
  [`icon:${T_109_GRAB_BAND.row}`, GRAB_BAND_BOX],
  ['role:Help Modal', rect(500, 380, 400, 300)],
  [`role:${partName('U-57')}`, rect(700, 40, 280, 80)],
  ['role:Dialogue Field', rect(200, 700, 600, 60)],
  ['icon:IC-52', rect(860, 390, ENTRY, ENTRY)],
  ...Object.entries(HEADER_ENTRY_X).map(
    ([icon, x]): [string, ScreenRect] => [`icon:${icon}`, rect(x, 8, ENTRY, ENTRY)],
  ),
  ...T_109_ARMING.map(
    (one, index): [string, ScreenRect] => [`icon:${one.row}`, paletteEntryBox(index)],
  ),
])

/** Points the cases press, each named for what it is on. */
const AT = {
  entryIc5: { x: 112, y: 20 },
  entryIc7: { x: 144, y: 20 },
  entryIc13: { x: 190, y: 20 },
  headerNoEntry: { x: 600, y: 20 },
  headerLastRow: { x: 750, y: 39 },
  noticesFirstRow: { x: 750, y: 40 },
  paletteNoEntry: { x: 600, y: 320 },
  paletteUnderModal: { x: 550, y: 400 },
  /**
   * On GR-19's band, over the bare schedule -- 「帯の下に何が描かれていても帯が
   * 勝つ」. ⭐ Above the first row of entries on purpose, so the claim is the
   * band's own claim and not a question about which of two siblings paints last.
   */
  paletteGrabBand: { x: 500, y: 304 },
  /** The band's bottom edge, which R3.4 gives to the entry that starts there. */
  paletteBelowTheBand: { x: 412, y: PALETTE_BOX.y + GRAB_BAND_HEIGHT },
  modalOnly: { x: 520, y: 650 },
  modalEntry: { x: 870, y: 400 },
  notices: { x: 900, y: 100 },
  dialogue: { x: 300, y: 730 },
  rowPin: { x: 144, y: 64 },
  // ⚠️ EACH ONE STEP FURTHER LEFT THAN BEFORE 2026-08-30: HF-1 counts a third
  // control per row now (IC-77, HF-11), and the four are placed from the right
  // edge outward -- the pin, then IC-77, then IC-59, then IC-58.
  rowExpanderOpen: { x: 92, y: 64 },
  rowExpanderClose: { x: 108, y: 64 },
  rowExpanderCloseBelow: { x: 124, y: 64 },
  /**
   * `HF-13`'s entrance, laid one box further left again.
   *
   * ⭐ ITS OWN POINT, WHICH IS THE WHOLE CLAIM. `HF-13` (MUST) 「`HF-2`（配下を
   * すべて開く）とは別の入口とすること（MUST）。同じ入口に兼ねさせてはならない
   * （MUST NOT）」 -- so a press here and a press on `rowExpanderOpen` have to
   * come back with two different rows of 表 T-109.
   */
  rowOpenOneLevel: { x: 60, y: 64 },
  /** `HF-14`'s entrance, beside it. */
  rowAddChild: { x: 76, y: 64 },
  /** The strip of bare `Row Title Panel` between IC-77's right edge and the pin. */
  rowExpanderGap: { x: 136, y: 64 },
  rowTreeNoEntry: { x: 80, y: 400 },
  bareSchedule: { x: 500, y: 600 },
} as const

const command = (patch: Partial<CommandItem> & { icon: string }): CommandItem => ({
  isEnabled: true,
  isPressed: false,
  // FR-053: the entrance is not armed. ⛔ A separate member from `isPressed`,
  // because IC-54 says the palette entry is not a button and FR-053 (MUST NOT)
  // bars the pressed form -- so an arm may not travel on the toggle.
  isArmed: false,
  label: patch.icon,
  ...patch,
})

const FRAME: ScreenFrame = {
  isFullScreen: false,
  // ⚠️ The `Row Title Panel` is drawn against the boundary FR-052 gives it, so
  // the frame has to carry one for the panel to be on the screen at all.
  dividers: [{ panel: 'rowTitlePanel', band: rect(170, 40, 6, 660), line: rect(172, 40, 1, 660) }],
  scrollbars: [],
}

const HEADER: AppHeaderItems = {
  documentTitle: 'DocumentTitleHere',
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
  commands: [
    // ⛔ FR-029: what cannot be used is drawn faint and does NOT go quiet.
    command({ icon: 'IC-5', label: 'UndoNothingToUndo', isEnabled: false }),
    command({ icon: 'IC-7', label: 'ShowPalette' }),
    command({ icon: 'IC-13', label: 'ZoomTimeIn' }),
    command({ icon: 'IC-12', label: 'ZoomTimeOut' }),
  ],
  // FR-038 (MUST): the header says which language is on. The same value
  // `BASE_VIEW` carries -- S-99 is a single state for the whole screen.
  language: 'ja',
}

const rowTitle = (patch: Partial<RowTitle> & { groupId: string }): RowTitle => ({
  depth: 1,
  // `depth` x S-37, the product FR-085 subtracts before it cuts the name.
  // ⚠️ It FOLLOWS the patched depth: a fixed number here would draw the
  // deepest row exactly like a root one, which is the very thing FR-085's
  // indent case asks about.
  indentPx: (patch.depth ?? 1) * 12,
  box: rect(0, 40, 170, 24),
  label: patch.groupId,
  wholeLabel: patch.groupId,
  isLabelTruncated: false,
  // ⭐ A ROW WITH NOTHING TO FOLD, WHICH IS NOT A ROW WITHOUT CONTROLS. This
  // read `null` until 2026-08-30, when `RowTitle.expander` stopped being
  // nullable: 表 T-051 の `HF-1` puts the three on 「各行」 and the closing
  // paragraph under that table gives 「対象が 1 つも無い」 as a STATE the three
  // carry -- which `FR-029` (MUST) then draws 薄く -- rather than as their
  // absence. ⚠️ The neutral fixture is therefore the three with none armed.
  expander: { canOpen: false, canClose: false, canCloseBelow: false },
  isPinned: false,
  isSelected: false,
  ...patch,
})

const PALETTE: CommandPalette = {
  // ⭐ A CORNER, NOT A RECTANGLE. FR-053 (MUST) makes the palette's size follow
  // its contents and (MUST NOT) bars the settings table from holding one, so
  // the description says only where it floats. Its EXTENT is the fake browser's
  // answer -- `LAYOUT` above registers it, corner for corner with this member --
  // which is the whole reason IF-9 asks the drawing side which part a point is
  // on.
  at: { x: PALETTE_BOX.x, y: PALETTE_BOX.y },
  // GR-19 of 表 T-023d: 「パレットの上端に敷く帯」, whose height 表 T-206 states
  // at `S-135a`. ⭐ A HEIGHT AND NOT A RECTANGLE -- the corner above is already
  // the edge the band is laid along, and the band's width is the palette's own.
  // ⚠️ The number is this file's own; see `GRAB_BAND_HEIGHT`.
  grabBandHeight: GRAB_BAND_HEIGHT,
  minimise: {
    icon: 'IC-75',
    label: 'IC-75',
    isEnabled: true,
    isPressed: false,
    isArmed: false,
  },
  isMinimised: false,
  groups: [
    {
      name: 'PlaceGroup',
      commands: T_109_ARMING.map((one) => command({ icon: one.row, label: one.arm })),
    },
  ],
  armedText: 'ArmedNothing',
}

const HELP_MODAL: OpenModal = {
  surface: 'Help Modal',
  heading: 'HelpHeading',
  commands: [command({ icon: 'IC-52', label: 'CloseHelp' })],
  entries: [{ table: 'T-036', row: 'MK-1', text: 'HelpEntryOne', press: null, keys: null, icon: null }],
  language: 'en',
  licenceText: 'LicenceTextHere',
  copyrightNotice: 'CopyrightNoticeHere',
  attributions: ['AttributionOne'],
}

const NOTICE: Notice = {
  manner: 'NT-3',
  mannerText: '',
  text: 'NoticeTextOne',
  nextSteps: ['NextStepOne'],
  affectedCount: 3,
  // NT-8 (MUST): a told notice carries the entrance a person puts it away by,
  // and the key that names WHICH telling that press puts away.
  dismissText: 'DismissWordOne',
  dismissKey: 'NT-3|RE-1',
}

const DIALOGUE: DialogueField = {
  messages: [
    { sequence: 1, author: 'Someone', text: 'MessageOne', settledAt: '2026-08-20T00:00:00Z' },
  ],
}

const BASE_VIEW: ScreenView = {
  // S-99. `readScreenPartAt` answers with rectangles and entry ids, never with
  // a word, so this member is inert for every case below.
  language: 'ja',
  frame: FRAME,
  appHeaderItems: HEADER,
  rowTitlePanel: {
    pinnedTitles: [],
    titles: [
      rowTitle({
        groupId: 'g-1',
        label: 'RowOne',
        isPinned: true,
        expander: { canOpen: true, canClose: false, canCloseBelow: false },
      }),
    ],
  },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  // ⚠️ MENDED BY THE RECONCILER, NOT BY THIS FILE'S AUTHOR, and no assertion
  // moved: `ScreenView` gained this member when 表 T-075's UF-67 cell became
  // 「通知と確認」, so a base view built without it is no longer a
  // `ScreenView` at all and `showScreenView` read `undefined.manner`. `null` is
  // what every other absent surface here already carries.
  // ⛔ THIS FILE STILL HAS NO CASE FOR THE CONFIRMATION -- see the report.
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const viewWith = (patch: Partial<ScreenView>): ScreenView => ({ ...BASE_VIEW, ...patch })

/** Everything 表 T-023a's 面 table names, drawn at once. */
const OVER_THE_SCHEDULE: ScreenView = viewWith({
  commandPalette: PALETTE,
  openModal: HELP_MODAL,
  notices: [NOTICE],
  dialogueField: DIALOGUE,
})

/** The palette with nothing over it. */
const PALETTE_VIEW: ScreenView = viewWith({ commandPalette: PALETTE })

// ===========================================================================

describe('the specification still says what these cases copy', () => {
  it('表 T-065 IF-9 supplies a THIRD thing: which UI part and which entry a point is on', () => {
    const row = specTable('T-065').rows.find((one) => one.id === 'IF-9')
    expect(row, '表 T-065 no longer holds IF-9').toBeDefined()

    const supply = row?.cells[row.cells.length - 1] ?? ''
    // The two halves that were always there.
    expect(supply).toContain('作った記述を画面に載せ')
    expect(supply).toContain('対話欄で確定した発話を返')
    // ⭐ CR-192's third, which is what this whole file tests.
    expect(supply).toContain('画面上の点')
    expect(supply).toContain('UI パーツ')
    expect(supply).toContain('入口')
    expect(supply).toContain('T-103')
    expect(supply).toContain('T-109')
    // The sides are unchanged: declared by ScreenRenderer, drawn by this unit.
    expect(row?.cells.join(' ')).toContain('ScreenSurface')
    expect(row?.cells.join(' ')).toContain('DomScreenSurface')
  })

  it('表 T-065 still puts the answer on the side that drew the entry (MUST)', () => {
    expect(specText('05-07-design.md')).toContain(T_065_THE_SIDE_THAT_DREW_IT)
  })

  it('表 T-023a still limits the decision order to the schedule drawing area (MUST)', () => {
    expect(specText('01-04-requirements.md')).toContain(T_023A_ONLY_THE_DRAWING_AREA)
  })

  it('S-99g still defines 面 as what opens OVER the screen', () => {
    const row = specTable('T-206').rows.find((one) => one.id === 'S-99g')
    expect(row?.cells.join(' ')).toContain(S_99G_OVER_THE_SCREEN)
  })

  it('IN-4 of 表 T-028 still consumes the open surface FIRST, before the arm', () => {
    const manner = specTable('T-028').rows.find((one) => one.id === 'IN-4')?.cells.join(' ') ?? ''
    expect(manner).toContain('開いている面')
    expect(manner.indexOf('開いている面')).toBeLessThan(manner.indexOf('構え'))
  })

  it('表 T-109 still puts every arming entry on the Command Palette', () => {
    const rows = specTable('T-109').rows
    for (const one of T_109_ARMING) {
      const row = rows.find((held) => held.id === one.row)
      expect(row, `表 T-109 no longer holds ${one.row}`).toBeDefined()
      expect(row?.cells[0], `${one.row} left the Command Palette`).toContain('Command Palette')
    }
    // ⛔ 表 T-023b's arms but AR-1 (which is "none"), and nothing invented.
    expect([...new Set(T_109_ARMING.map((one) => one.arm))].sort()).toEqual([
      'AR-2',
      'AR-3',
      'AR-4',
      'AR-5',
      'AR-6',
    ])
  })

  it('表 T-109 still puts the other entries on the surfaces these cases expect', () => {
    const rows = specTable('T-109').rows
    for (const one of T_109_ELSEWHERE) {
      const row = rows.find((held) => held.id === one.row)
      expect(row, `表 T-109 no longer holds ${one.row}`).toBeDefined()
      expect(row?.cells[0]).toContain(one.surface)
    }
  })

  it('表 T-103 still spells every settled name these cases look for', () => {
    const rows = specTable('T-103').rows
    for (const part of T_103_PARTS) {
      const row = rows.find((one) => one.id === part.row)
      expect(row, `表 T-103 no longer holds ${part.row}`).toBeDefined()
      expect(row?.cells[0]).toContain(`\`${part.name}\``)
    }
  })

  it('表 T-109 still gives the Row Expander TWO rows, one per side (IC-58 / IC-59)', () => {
    const rows = specTable('T-109').rows
    for (const one of T_109_ROW_EXPANDER) {
      const row = rows.find((held) => held.id === one.row)
      expect(row, `表 T-109 no longer holds ${one.row}`).toBeDefined()
      // 面: the entrance is named by the panel (U-23), and 正: 表 T-051.
      expect(row?.by['面'], `${one.row} left the Row Title Panel`).toContain('Row Title Panel')
      expect(row?.by['何の入口か'], `${one.row} no longer means "${one.gist}"`).toContain(one.gist)
      expect(row?.by['正'], `${one.row} no longer traces 表 T-051 の ${one.rule}`).toContain(
        one.rule,
      )
    }
    // ⛔ The four are DIFFERENT rows of the roster. If any two were ever merged
    // the cases below would be asking for an entry the specification does not
    // name. ⭐ The count is `HF-1`'s, so it is READ from that row and not typed:
    // the lattice sentence names four controls, and 表 T-109 gives each one an
    // entrance of its own.
    expect(new Set(T_109_ROW_EXPANDER.map((one) => one.row)).size).toBe(
      T_051_HF1_LATTICE.length,
    )
  })

  it('表 T-051 HF-1 still asks for FOUR folding controls per row, in a 2 x 2 lattice', () => {
    const rows = specTable('T-051').rows
    for (const one of T_051_EXPANDER) {
      const row = rows.find((held) => held.id === one.row)
      expect(row, `表 T-051 no longer holds ${one.row}`).toBeDefined()
      expect(row?.cells.join(' '), `${one.row} no longer says "${one.gist}"`).toContain(one.gist)
    }
  })

  it('表 T-103 U-47 names the row that holds the count, and holds no count itself', () => {
    const row = specTable('T-103').rows.find((one) => one.id === 'U-47')
    const cells = row?.cells.join(' ') ?? ''
    expect(cells, 'U-47 no longer points at the row that owns its layout').toContain(
      T_103_U47_POINTS_AT_ITS_OWNER,
    )
    expect(
      T_103_U47_HOLDS_NO_COUNT.test(cells),
      'U-47 states a count again -- 表 T-051 の `HF-1` owns it, and a number in two places drifts',
    ).toBe(false)
  })

  it('U-23 still requires an entrance to be named by the Row Title Panel (MUST)', () => {
    const row = specTable('T-103').rows.find((one) => one.id === 'U-23')
    expect(row?.cells.join(' ')).toContain(
      '操作の入口を指すときは「行見出しパネル」と書くこと（MUST）',
    )
  })
})

describe('R7.3 / LY-5 -- the browser arrives, it is not reached for', () => {
  it('no document anywhere: a global reach would fail every case in this file', () => {
    // ⛔ If this stops being true the file stops proving R7.3 -- a unit that
    // reached for `globalThis.document` would quietly succeed instead.
    expect('document' in globalThis).toBe(false)
    expect('window' in globalThis).toBe(false)
  })

  it('answers a point with no DOM in the environment at all', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)).toEqual({
      part: 'App Header',
      entry: 'IC-7',
      format: null,
      // ⚠️ An entrance of the `App Header` stands on no row and against no
      // person, which `ScreenPart` states for both keys in as many words.
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('touches no member of the host beyond making elements and asking about a point', () => {
    const built = drawn(OVER_THE_SCHEDULE)
    const before = built.world.hostMembers.length

    ask(built, AT.entryIc7.x, AT.entryIc7.y)

    // ⚠️ `elementsFromPoint` is admitted beside `elementFromPoint`: both put the
    // SAME question, and 表 T-065 fixes the answer rather than the way of getting
    // it. Anything else would be this unit reading a value LY-5 leaves with the
    // caller.
    for (const member of new Set(built.world.hostMembers.slice(before))) {
      expect(['createElement', 'elementFromPoint', 'elementsFromPoint']).toContain(member)
    }
  })
})

describe('IF-9 of 表 T-065 -- one member per supply the cell names', () => {
  it('publishes readScreenPartAt beside the other members IF-9 names', () => {
    // ⭐ THE MEMBERS ARE WORKED OUT FROM THE CELL, NOT COUNTED. IF-9 reads
    // 「作った記述を画面に載せ、対話欄で確定した発話を返し、**プロパティパネルの
    // 欄で確定した値を、その欄が名乗る行 ID とともに返し**、**まだ確定していない
    // 文字入力があるかを答え**、**画面上の点がどの
    // UI パーツ（表 T-103）のどの入口（表 T-109）の上か…を答える**」 -- five
    // duties, and `screen-surface.ts` gives each one a member and says which
    // clause it serves. ⚠️ The third and the fourth each arrived after this case
    // was written; the list below is what the cell names TODAY, and the case
    // falls again the day a supply is added or dropped rather than merely when a
    // number moves.
    const surface = surfaceOf(wire())

    expect(Object.keys(surface).sort()).toEqual([
      'hasUnsettledTextEntry',
      'readDialogueInput',
      'readFieldCommit',
      'readScreenPartAt',
      'showScreenView',
    ])
    expect(typeof surface.readScreenPartAt).toBe('function')
  })

  it('answers with every member ScreenPart declares and nothing else', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    const answer = ask(built, AT.entryIc7.x, AT.entryIc7.y)
    expect(answer).not.toBeNull()
    // ⛔ THE ROSTER IS WRITTEN DOWN AND NOT DERIVED. `ScreenPart` is a type and
    // leaves nothing behind at run time, so a list kept here is the only thing
    // that can notice a member being DROPPED -- reading the keys off the very
    // answer being checked would agree with any answer at all. ⚠️ Each name is
    // one the seam declares in src/adapter/screen-renderer/screen-surface.ts;
    // adding one there is meant to land here.
    expect(Object.keys(answer ?? {}).sort()).toEqual([
      'dividerPanel',
      'entry',
      'format',
      'noticeDismissKey',
      'part',
      'resourceUid',
      'rowGroupId',
    ])
  })
})

describe("表 T-023a (MUST) -- the decision order is the drawing area's alone", () => {
  // ⛔ 01-04-requirements.md:2251 「判定順序を適用するのは日程の描画領域だけとする
  // こと（MUST）」. The four parts below hold no `ScreenRegions` rectangle -- PI-35
  // has six and none of them is one of these -- so `regionAtPointer` answers
  // `rowArea` for a point on any of them. A non-null answer here is what stops
  // PD-5's marquee from starting underneath an open surface.
  const overTheSchedule = [
    { part: 'Command Palette', at: AT.paletteNoEntry, why: 'FR-053 floats it' },
    { part: 'Help Modal', at: AT.modalOnly, why: 'S-99g opens it over the screen' },
    // ⭐ U-57 of 表 T-103 settled the name of the part the notices stand in, so
    // the case's own title now quotes the table instead of an invented spelling.
    { part: partName('U-57'), at: AT.notices, why: 'FR-076 raises it over the screen' },
    { part: 'Dialogue Field', at: AT.dialogue, why: 'FR-066 puts it up' },
  ] as const

  it.each(overTheSchedule)(
    'a press on the $part answers that part, never nothing ($why)',
    ({ part, at }) => {
      const built = drawn(OVER_THE_SCHEDULE)

      const answer = ask(built, at.x, at.y)
      expect(answer, `a press at ${at.x},${at.y} was read as bare schedule`).not.toBeNull()
      expect(answer?.part).toBe(part)
    },
  )

  it('a press on a part but on none of its entries answers the part with entry null', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    // ⭐ The third answer CR-192 argued for: neither an entry nor the schedule.
    expect(ask(built, AT.paletteNoEntry.x, AT.paletteNoEntry.y)).toEqual({
      part: 'Command Palette',
      entry: null,
      format: null,
      // ⚠️ The palette floats over the schedule and stands on no row of the
      // person's document, so neither key has anything to name.
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('a press where the schedule is exposed answers null -- and PD-5 may run', () => {
    const built = drawn(viewWith({}))

    expect(ask(built, AT.bareSchedule.x, AT.bareSchedule.y)).toBeNull()
  })
})

describe('FR-029 -- a disabled entry answers; it does not go quiet', () => {
  it('answers IC-5 although that entry cannot be used', () => {
    const built = drawn(viewWith({}))

    // ⛔ FR-029's RATIONALE: 「無反応だと故障に見える」. An entry that answered
    // `null` would BE the unresponsive one, and the reason a person is shown
    // (EZ-2's explanation, hung on this very entry) can only be raised once the
    // shell knows WHICH entry the pointer is on.
    expect(ask(built, AT.entryIc5.x, AT.entryIc5.y)).toEqual({
      part: 'App Header',
      entry: 'IC-5',
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('answers it exactly as it answers the entry beside it that can be used', () => {
    const built = drawn(viewWith({}))

    const cannot = ask(built, AT.entryIc5.x, AT.entryIc5.y)
    const can = ask(built, AT.entryIc7.x, AT.entryIc7.y)
    expect(cannot?.part).toBe(can?.part)
    expect(cannot?.entry).toBe('IC-5')
    expect(can?.entry).toBe('IC-7')
  })

  it('⛔ keeps the entry pointable -- it is drawn faint, not taken out of the tree', () => {
    const built = drawn(viewWith({}))

    // ⚠️ The `disabled` attribute stops an element taking the pointer, and then
    // no answer above could ever be given. FR-029 asks for 「薄く描く」.
    const entry = entryFor(built.root(), 'IC-5')
    expect(entry.hasAttribute('disabled')).toBe(false)
    expect(isShown(entry)).toBe(true)
  })
})

describe('FR-053 / 表 T-023b -- the palette can be armed from (SP-1 .. SP-4)', () => {
  // ⭐ FR-083's SP-1 .. SP-4 turn on WHICH ENTRY was pressed and on what is
  // selected. The selection is the translator's; the entry is this member's, and
  // until it answered, 表 T-023b could only ever be AR-1 -- CR-192's own account
  // of the hole.
  it.each(T_109_ARMING)('answers $row on the Command Palette (arms $arm)', ({ row }) => {
    const built = drawn(PALETTE_VIEW)

    const box = LAYOUT.get(`icon:${row}`)
    expect(box, `this file has no place for ${row}`).toBeDefined()
    const at = box ?? ZERO
    expect(ask(built, at.x + 2, at.y + 2)).toEqual({
      part: 'Command Palette',
      entry: row,
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('names the containing surface, not the grouping inside it (U-34)', () => {
    const built = drawn(PALETTE_VIEW)

    // ⚠️ `Palette Groups` and `Palette Commands` (U-34) really are drawn; the
    // answer names the surface anyway, because that is the granularity 表 T-109's
    // 面 column uses and the only one an entry can be joined back to it by.
    expect(byRole(built.root(), 'Palette Commands').length).toBeGreaterThan(0)
    expect(ask(built, 412, 312)?.part).toBe('Command Palette')
  })

  it('names the App Header, not Header Commands, for an entry drawn in it (U-35)', () => {
    const built = drawn(viewWith({}))

    expect(byRole(built.root(), 'Header Commands').length).toBeGreaterThan(0)
    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)?.part).toBe('App Header')
  })

  it('⛔ names the Row Title Panel and never the Row Title Tree (U-23, MUST)', () => {
    const built = drawn(viewWith({}))

    // ⚠️ The tree is drawn ON the panel and is the nearer name, which is exactly
    // the spelling U-23 forbids for an entrance -- and which 表 T-109 does not
    // use for IC-58 .. IC-60 either.
    expect(byRole(built.root(), 'Row Title Tree').length).toBeGreaterThan(0)
    expect(ask(built, AT.rowTreeNoEntry.x, AT.rowTreeNoEntry.y)?.part).toBe('Row Title Panel')
  })
})

describe('GR-19 of 表 T-023d -- the band on the palette, and the claim it has', () => {
  // ⭐ WHY THIS UNIT AT ALL. `ScreenPart.entry` declares it: the band carries no
  // name of its own to be answered by, 表 T-109 gives it IC-53, and GR-19 gives
  // it 「帯の下に何が描かれていても帯が勝つ」 -- which, for a palette floating
  // over the schedule, is what the topmost drawn node at that point answers.
  // ⛔ So a press on it has somewhere to arrive; without this answer, FR-053's
  // drag has no entrance at all and GR-19 -- a MUST standing first in its table
  // -- cannot be obeyed.

  it('表 T-023d still puts the palette band FIRST, which is what makes it win', () => {
    // ⛔ The premise of every case below, read out of the .md rather than
    // assumed: the preamble makes the upper row win, and the upper row is this
    // one. A re-ordering of that table lands HERE and not silently.
    expect(T_023D.rows.length, '表 T-023d has no rows').toBeGreaterThan(1)
    expect(T_023D_TOP_ROW?.id, '表 T-023d no longer opens with the palette band').toBe('GR-19')

    const requirements = readFileSync(
      join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
      'utf8',
    )
    expect(requirements, '表 T-023d no longer says the upper row wins').toContain(
      T_023D_PRIORITY_PREAMBLE,
    )
    // The row names the part it is laid on and the requirement that drags it.
    expect(T_023D_TOP_ROW?.cells.join(' ')).toContain(T_109_GRAB_BAND.surface)
    expect(T_023D_TOP_ROW?.cells.join(' ')).toContain(T_109_GRAB_BAND.authority)
  })

  it('answers the band for a point on it, so FR-053 has an entrance to drag by', () => {
    const built = drawn(PALETTE_VIEW)

    expect(ask(built, AT.paletteGrabBand.x, AT.paletteGrabBand.y)).toEqual({
      part: 'Command Palette',
      entry: T_109_GRAB_BAND.row,
      format: null,
      // ⛔ The band moves `ScreenSession.commandPaletteAt` (FR-053) and nothing
      // in the person's document, so it names neither a row nor a resource.
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('⛔ the band beats what is drawn under it -- the schedule below it never answers', () => {
    // GR-19: 「帯の下に何が描かれていても帯が勝つ —— パレットは日程の上へ浮くの
    // で、掴めない位置へ置けてしまうと二度と動かせなくなる」. The same point with
    // NO palette drawn is bare schedule, and 表 T-023a would let PD-5 start a
    // marquee there; with the palette drawn it is the band's, first row of its
    // table.
    const bare = drawn(viewWith({}))
    expect(
      ask(bare, AT.paletteGrabBand.x, AT.paletteGrabBand.y),
      'the point has to be over the bare schedule, or the case proves nothing',
    ).toBeNull()

    const built = drawn(PALETTE_VIEW)
    expect(ask(built, AT.paletteGrabBand.x, AT.paletteGrabBand.y)?.entry).toBe(
      T_109_GRAB_BAND.row,
    )
  })

  it('R3.4 -- the band ends where the first entry begins, and neither claims both', () => {
    // GR-19 lays the band 「パレットの上端に敷く」 and 表 T-206 gives it a height,
    // so the band and what it stands above share an edge. ⛔ The point asked
    // about is the point handed in: a margin of the unit's own would slide this
    // edge and hand one press to the wrong row -- either FR-083's SP-1 .. SP-4
    // to the drag, or FR-053's drag to a shape.
    const built = drawn(PALETTE_VIEW)
    const firstEntry = T_109_ARMING[0].row

    expect(ask(built, AT.paletteBelowTheBand.x, AT.paletteBelowTheBand.y - 1)?.entry).toBe(
      T_109_GRAB_BAND.row,
    )
    expect(ask(built, AT.paletteBelowTheBand.x, AT.paletteBelowTheBand.y)?.entry).toBe(firstEntry)
  })

  it('⛔ lays the band on a palette that holds no entry at all', () => {
    // GR-19 states a PLACE and not a state -- 「パレットの上端」 -- so there is no
    // condition of the palette's contents under which the band is absent. ⚠️ A
    // palette can hold nothing: FR-053 (MUST) has the size follow the contents,
    // and 表 T-023c admits no selection that empties the roster, but the empty
    // description is a value this seam is handed all the same. ⛔ A palette drawn
    // without a band is a palette that can never be moved again, which is the
    // accident GR-19's own warning names.
    const built = drawn(viewWith({ commandPalette: { ...PALETTE, groups: [] } }))

    expect(ask(built, AT.paletteGrabBand.x, AT.paletteGrabBand.y)).toEqual({
      part: 'Command Palette',
      entry: T_109_GRAB_BAND.row,
      format: null,
      // ⛔ The band moves `ScreenSession.commandPaletteAt` (FR-053) and nothing
      // in the person's document, so it names neither a row nor a resource.
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('⛔ answers the band even though 表 T-109 calls that row no button', () => {
    // 表 T-109: 「掴んで動かせることを示す。**ボタンではない**」. `ScreenPart`
    // declares the distinction this case holds: this member is the ROW a point
    // is ON, which is not the same question as which entry can be pressed. ⛔ So
    // the answer is owed even though `CommandPalette.groups` rightly holds no
    // `CommandItem` for it -- and the palette drawn here carries none.
    const built = drawn(PALETTE_VIEW)

    expect(T_109_GRAB_BAND.isButton).toBe(false)
    expect(
      PALETTE.groups.flatMap((group) => group.commands).map((one) => one.icon),
      '表 T-109 says the band is not a button, so no entry may stand for it',
    ).not.toContain(T_109_GRAB_BAND.row)
    expect(ask(built, AT.paletteGrabBand.x, AT.paletteGrabBand.y)?.entry).toBe(
      T_109_GRAB_BAND.row,
    )
  })
})

describe('EZ-2 of 表 T-040 -- the icon the pointer rests ON', () => {
  it('answers one entry, and it is the one under the point', () => {
    const built = drawn(viewWith({}))

    // Four entries are drawn; the answer names exactly the one pressed.
    expect(ask(built, AT.entryIc13.x, AT.entryIc13.y)?.entry).toBe('IC-13')
  })

  it('⛔ does not answer the neighbour that shares an edge with it', () => {
    const built = drawn(viewWith({}))

    // IC-13 occupies x 180..204 and IC-12 x 204..228. R3.4 makes the interval
    // half-open, so the shared edge belongs to IC-12 -- and never to both.
    expect(ask(built, 203, 20)?.entry).toBe('IC-13')
    expect(ask(built, 204, 20)?.entry).toBe('IC-12')
  })

  it('answers entry null where the pointer rests on the part but on no icon', () => {
    const built = drawn(viewWith({}))

    // ⭐ EZ-2 shows the explanation OF THAT ICON, so "no icon" has to be tellable
    // from "some icon" -- `ScreenSession.iconUnderPointer` (PD-141) is filled
    // from this and is `IconId | null` for the same reason.
    expect(ask(built, AT.headerNoEntry.x, AT.headerNoEntry.y)).toEqual({
      part: 'App Header',
      entry: null,
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })
})

describe('R3.4 -- half-open, the way the rest of src/ resolves an edge', () => {
  // ⭐ src/entity/layout-engine/screen-regions/screen-regions.ts:89-101 states it
  // for `regionAtPointer`: 「a point on the right or bottom edge belongs to
  // whatever comes next, so adjoining regions never both claim it」, citing R3.4
  // (docs/development-rules/07-review-standards.md:495). A second rule on the
  // same screen would put one pixel under two answers.
  it('holds its left and top edge', () => {
    const built = drawn(viewWith({}))

    expect(ask(built, 180, 8)?.entry).toBe('IC-13')
    expect(ask(built, 0, 0)).toEqual({
      part: 'App Header',
      entry: null,
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('lets go of its right and bottom edge', () => {
    const built = drawn(viewWith({}))

    // The last point inside the entry on each axis, then the first point outside.
    expect(ask(built, 203, 31)?.entry).toBe('IC-13')
    expect(ask(built, 180, 32)).toEqual({
      part: 'App Header',
      entry: null,
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it("hands the App Header's bottom edge to the part that begins there", () => {
    const built = drawn(OVER_THE_SCHEDULE)

    // The `App Header` is y 0..40 and U-57's box begins at y 40 -- both boxes
    // are this file's own (LAYOUT), because nothing in docs/spec fixes them.
    expect(ask(built, AT.headerLastRow.x, AT.headerLastRow.y)?.part).toBe('App Header')
    expect(ask(built, AT.noticesFirstRow.x, AT.noticesFirstRow.y)?.part).toBe(partName('U-57'))
  })
})

describe('a point that is on nothing at all', () => {
  it('answers null outside the window on either side', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    expect(ask(built, -1, 20)).toBeNull()
    expect(ask(built, 20, -1)).toBeNull()
    expect(ask(built, WINDOW.width + 500, WINDOW.height + 500)).toBeNull()
  })

  it('answers null for a part that is not drawn this frame', () => {
    // S-99e says the palette is hidden, so `ScreenView.commandPalette` is null --
    // and nothing may be answered for the place it would have taken.
    const built = drawn(viewWith({ commandPalette: null }))

    expect(ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)).toBeNull()
  })

  it('answers null before the first description arrives (BO-1 of 表 T-077)', () => {
    const built = wire()

    // ⛔ 「寸法が確定するまで 1 枚も描かない」: the skeleton is mounted so that the
    // header can be measured, but nothing is on the screen yet, so no point is on
    // anything.
    expect(built.reportedHeights).toEqual([HEADER_HEIGHT])
    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)).toBeNull()
  })
})

describe('overlapping parts', () => {
  it('gives the overlap to the open surface, which S-99g opens OVER the screen', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    // The `Help Modal` is x 500..900 / y 380..680 and the palette
    // x 400..620 / y 300..480, so this point is on both.
    expect(byRole(built.root(), 'Command Palette').length).toBeGreaterThan(0)
    expect(byRole(built.root(), 'Help Modal').length).toBeGreaterThan(0)
    expect(ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)?.part).toBe('Help Modal')
  })

  it('answers the same point for the palette once the surface is closed', () => {
    // ⭐ The same press one frame apart: the answer changes because what is DRAWN
    // changed, which is the whole reason the drawing side is the side asked.
    const built = drawn(OVER_THE_SCHEDULE)
    expect(ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)?.part).toBe('Help Modal')

    surfaceOf(built).showScreenView(PALETTE_VIEW)
    expect(ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)?.part).toBe('Command Palette')
  })

  it('carries one of each where a part and its own entry hold the same point', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    // IC-52 is drawn inside the `Help Modal`: both hold the point, and the answer
    // carries one of each rather than choosing between them.
    expect(ask(built, AT.modalEntry.x, AT.modalEntry.y)).toEqual({
      part: 'Help Modal',
      entry: 'IC-52',
      format: null,
      // ⚠️ S-99g's surface is opened OVER the screen and names no row of the
      // document underneath it, however far the point is down the panel.
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })
})

describe('⛔ R6.3 -- what the unit actually did to the fake', () => {
  it('asks about exactly the point it was given, and about no other', () => {
    const built = drawn(OVER_THE_SCHEDULE)
    built.world.pointQueries.length = 0

    ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)

    expect(built.world.pointQueries.length).toBeGreaterThan(0)
    for (const query of built.world.pointQueries) {
      expect([query.x, query.y]).toEqual([AT.paletteUnderModal.x, AT.paletteUnderModal.y])
    }
  })

  it('reads only nodes it made itself -- never the mount, never past it', () => {
    const built = drawn(OVER_THE_SCHEDULE)
    built.world.measured.length = 0

    ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)

    const root = built.root()
    for (const node of built.world.measured) {
      expect(built.world.created).toContain(node)
      expect(root.contains(node)).toBe(true)
    }
    expect(built.world.measured).not.toContain(built.mount)
  })

  it('⛔ writes nothing while answering -- reading a point is not a redraw', () => {
    const built = drawn(OVER_THE_SCHEDULE)
    const drawnBefore = serialize(built.root())
    const listenersBefore = built.world.registrations.length
    const madeBefore = built.world.created.length

    ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)
    ask(built, AT.entryIc7.x, AT.entryIc7.y)
    ask(built, 5000, 5000)

    // ⚠️ The member is `semi-pure-b`: it reads the page as it stands and may not
    // change it. NFR-010 also forbids waking a frame on a trigger 表 T-078 does
    // not list, and a listener registered here would be one.
    expect(serialize(built.root())).toBe(drawnBefore)
    expect(built.world.registrations).toHaveLength(listenersBefore)
    expect(built.world.created).toHaveLength(madeBefore)
    expect(built.world.markupWrites).toHaveLength(0)
  })

  it('answers from what is drawn NOW -- two frames apart, two answers', () => {
    const built = drawn(viewWith({}))
    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)?.entry).toBe('IC-7')

    // The header keeps its place; the entry that stood there is gone.
    surfaceOf(built).showScreenView(
      viewWith({ appHeaderItems: { ...HEADER, commands: [command({ icon: 'IC-13' })] } }),
    )

    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)).toEqual({
      part: 'App Header',
      entry: null,
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
    expect(ask(built, AT.entryIc13.x, AT.entryIc13.y)?.entry).toBe('IC-13')
  })
})

// ===========================================================================

describe('the entries of 表 T-109 on the `Row Title Panel`', () => {
  // ⭐ THE FINDING THIS BLOCK ONCE HELD IS CLOSED. It read: the unit DRAWS the
  // `Row Pin` (U-48) but marks it with no row of 表 T-109, so IF-9 cannot name
  // the entry and a press comes back 「面の上・入口の外」. The unit has since
  // marked it -- `data-icon="IC-60"` at dom-screen-surface.ts:614, with the
  // reasoning above it -- so the case below is live and passing.
  //
  // ⚠️ The case kept failing for a while after the unit was fixed, and that was
  // THIS FILE's fault, not the unit's: the pin's box was registered under
  // `role:Row Pin` while `layoutKey` had begun yielding `icon:IC-60` for it, so
  // the fake handed the pin a ZERO rectangle and no press could land. Repaired
  // at the registration site (see the note in `LAYOUT`); the expectation was
  // never touched (docs/development-rules/04-verification.md §1).
  //
  // 表 T-065 IF-9, docs/spec/05-07-design.md:386, and its MUST at :390:
  //   「画面上の点がどの UI パーツ（表 T-103）のどの入口（表 T-109）の上かを答える」
  //   「点がどの入口の上かは、その入口を描いた側が答えること（MUST）」
  //
  // 表 T-109, docs/spec/_assets/tbl-glossary.md:503-505, holds three entries on
  // the `Row Title Panel`:
  //   IC-58  行の配下をすべて開く            表 T-051 の HF-2
  //   IC-59  その行自身を畳む               表 T-051 の HF-3
  //   IC-60  行をピン止めし、同じ入口で外す   FR-098
  //
  // ⭐ IC-58 / IC-59 ARE ANSWERED TOO, and the block below asks for both. The
  // note that used to stand here said they were not: it read that the unit drew
  // the `Row Expander` (U-47) as ONE unmarked control, and the pair is now drawn
  // and marked, which is what 表 T-109's two rows and FR-029 (MUST) ask for.
  //
  // ⭐ AND THE ROW KEY NOW TRAVELS. `ScreenPart.rowGroupId` carries
  // `TaskGroup.id` (AT-51), so a press on one of the three entries the panel
  // holds says which KIND of control it was AND which row's -- which is what
  // CR-192 §0 ⑧-5 left the TRANSLATOR short of. ⛔ The note that used to stand
  // here said the key was left off by design; that stopped being true when the
  // member was declared.
  it('answers IC-60 for a press on the Row Pin (FR-098, 表 T-109 IC-60)', () => {
    const built = drawn(viewWith({}))

    expect(byRole(built.root(), 'Row Pin').length).toBeGreaterThan(0)
    expect(ask(built, AT.rowPin.x, AT.rowPin.y)).toEqual({
      part: 'Row Title Panel',
      entry: 'IC-60',
      format: null,
      // ⛔ FR-098 pins ONE row, and `BASE_VIEW` draws exactly one -- so the
      // press has to come back naming it. A `null` here is the state that left
      // the pinning unreachable by pointer.
      rowGroupId: 'g-1',
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })
})

// ===========================================================================
// U-47 `Row Expander` -- the pair of entries 表 T-109 gives the panel.
//
// ⭐ WHAT IS BEING PINNED HERE, AND WHAT IS NOT. 表 T-051 says what the two
// controls DO (`HF-2` opens the row's whole subtree, `HF-3` collapses the row
// itself -- 表 T-015's `HR-3` and `HR-5`); carrying that out is the use case's. What IF-9 owes, and all these cases ask for, is that a
// press on one can be told from a press on the other -- 「点がどの入口の上かは、
// その入口を描いた側が答えること（MUST）」 (docs/spec/05-07-design.md:390). ⛔ A
// unit that drew one control, or that drew two and named neither, would leave
// the shell with one place to hang two different effects on, and 表 T-051 would
// have no way to be obeyed downstream.
// ===========================================================================

/**
 * What a row with nothing under it carries.
 *
 * ⭐⭐ IT IS NOT `null`, AND ON 2026-08-30 IT STOPPED BEING ABLE TO BE. 表 T-051
 * の `HF-1` places the three on 「**各行**」 with no exception, and the closing
 * paragraph under that table says what a row with nothing to fold carries
 * instead: 「⛔ **その操作で、描かれる行が 1 行も増減しないときは、対象が 1 つも
 * 無いものとして扱うこと（MUST）**」 -- a STATE of the three, which `FR-029`
 * (MUST) then draws 薄く. ⇒ `RowTitle.expander` is no longer nullable, so the
 * cases that used to spell this `null` spell it here.
 */
const NOTHING_TO_FOLD: RowExpander = { canOpen: false, canClose: false, canCloseBelow: false }

/** A panel holding exactly one row, with the expander this case wants. */
const withExpander = (expander: RowExpander): ScreenView =>
  viewWith({
    rowTitlePanel: {
      pinnedTitles: [],
      titles: [rowTitle({ groupId: 'g-1', label: 'RowOne', expander })],
    },
  })

/** Every state `RowExpander` can be in -- both spent is the boundary FR-029 speaks to. */
const EXPANDER_STATES = [
  { canOpen: true, canClose: true, canCloseBelow: false },
  { canOpen: true, canClose: false, canCloseBelow: false },
  { canOpen: false, canClose: true, canCloseBelow: false },
  { canOpen: false, canClose: false, canCloseBelow: false },
] as const

/** Where each side of the pair was laid out. ⚠️ This file's placing, not the specification's. */
const EXPANDER_AT: Readonly<Record<string, { readonly x: number; readonly y: number }>> = {
  'IC-58': AT.rowExpanderOpen,
  'IC-59': AT.rowExpanderClose,
  'IC-77': AT.rowExpanderCloseBelow,
  // ⭐ `HF-13`'s entrance joined `HF-1`'s count on 2026-08-30, so it joins the
  // points too; its box was already laid out for the cases below it.
  'IC-90': AT.rowOpenOneLevel,
}

/** The rows of 表 T-109 that 表 T-051 の `HF-1` puts on every row, sorted. */
const EXPANDER_ROWS = T_109_ROW_EXPANDER.map((one) => one.row).sort()

/**
 * Every control the panel drew that carries one of `HF-1`'s three rows.
 *
 * ⛔⛔ FOUND BY `data-icon` AND NO LONGER BY `data-role="Row Expander"`, and the
 * change is a reading of the specification rather than a convenience. 表 T-103's
 * `U-47` says 「行の折り畳みの操作子。⛔ **員数と置き方は 表 T-051 の `HF-1` が
 * 持ち、本行は持たない**」, and `HF-1` enumerates exactly three -- 「開く操作子と、
 * その行自身を閉じる操作子と、配下をすべて閉じる操作子を 1 つずつ」. `IC-90`
 * comes from `HF-13` and `IC-91` from `HF-14`, neither of which `HF-1` counts.
 * ⚠️ WHETHER THOSE TWO ARE PART OF `U-47` IS NOT DECIDED ANYWHERE: `U-47` points
 * its count at `HF-1` (three), while A-appendix.md's entry for version 1.72 says
 * the count it dropped was 「入口が 5 つになる直前であった」 (five). ⛔ So no
 * case here may turn on `data-role`, in either direction. `data-icon` carries the
 * row of 表 T-109, which IS decided, and that is what these read.
 */
const expanderControls = (built: Stage): FakeElement[] =>
  selfAndDescendants(built.root()).filter((one) => {
    const icon = one.getAttribute('data-icon')
    return icon !== null && EXPANDER_ROWS.includes(icon)
  })

const expanderIcons = (built: Stage): string[] =>
  expanderControls(built).map((one) => one.getAttribute('data-icon') ?? '(unmarked)')

describe('表 T-051 HF-1 -- one opening control and one closing control per row', () => {
  it('GIVEN a row whose description carries an expander WHEN the panel is drawn THEN the row holds one IC-58 and one IC-59 (HF-1, U-47)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: false, canCloseBelow: false }))

    // ⭐ 表 T-103 U-47: 「開く側と閉じる側の 2 つで 1 組」 -- one part, two
    // controls, so the count is two and the rows are the roster's two.
    expect(expanderIcons(built).sort()).toEqual(EXPANDER_ROWS)
  })

  it('GIVEN two rows, one pinned and one not, WHEN the panel is drawn THEN EACH row gets the pair (HF-1 「各行に」)', () => {
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [
            rowTitle({
              groupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [
            rowTitle({
              groupId: 'g-1',
              expander: { canOpen: false, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    const icons = expanderIcons(built)
    // ⭐ FOUR PER ROW SINCE 2026-08-30 (`HF-1`'s lattice counts the hide, the
    // one-level open, the fold-all-below and the open-all-below), on each of
    // the two rows. ⛔ The count is read from the roster, never typed: a fifth
    // control added to `HF-1` moves this number on its own.
    expect(icons).toHaveLength(T_109_ROW_EXPANDER.length * 2)
    // ⛔ U-46 lifts a pinned row out of the scrolling list, but it is still a row
    // OF the panel, and HF-1 says 各行 without an exception for it.
    for (const one of T_109_ROW_EXPANDER) {
      const drawnTwice = icons.filter((held) => held === one.row)
      expect(drawnTwice, `${one.row} was not drawn once per row`).toHaveLength(2)
    }
  })

  it.each(EXPANDER_STATES)(
    'GIVEN canOpen=$canOpen and canClose=$canClose WHEN the row is drawn THEN both controls stand (FR-029: faint, never absent)',
    (state) => {
      const built = drawn(withExpander(state))

      // ⛔ FR-029's RATIONALE 「無反応だと故障に見える」 and its MUST 「掴めない
      // 端点を薄く描いて理由をツールチップで示すこと」: the spent side is drawn
      // faint. A control that vanished when it could not be used would move the
      // OTHER one under the pointer, and HF-4's 「名前ごとに位置が変わると狙え
      // ない」 is the same complaint about the same panel.
      expect(expanderIcons(built).sort()).toEqual(EXPANDER_ROWS)
    },
  )

  it('⭐ GIVEN a row with NOTHING under it WHEN the panel is drawn THEN HF-13 and HF-14 still place their entrances on it (「行ごとに 1 つ置くこと（MUST）」)', () => {
    const built = drawn(withExpander(NOTHING_TO_FOLD))
    const row = theRowOf(built)
    const drew = controlsOf(row).map((one) => one.getAttribute('data-icon'))

    // ⭐ THE CASE THAT USED TO STAND HERE SAID 「neither control is drawn」 AND
    // WAS READING THE SEAM, NOT THE MANUSCRIPT. `RowTitle.expander` was nullable
    // then, and this file took that to mean a row with nothing under it carries
    // no per-row entrance at all. ✅ THE SEAM HAS SINCE BEEN CORRECTED (2026-08-30,
    // 台帳 D-161): the member is not nullable, and a row with nothing to fold
    // carries the three with none armed (`NOTHING_TO_FOLD`). 表 T-051 decided it,
    // twice over:
    //
    //   `HF-13` (docs/spec/01-04-requirements.md):
    //     「**1 階層だけ開く操作子を、行ごとに 1 つ置くこと（MUST）**」
    //     「⛔ **開ける直下の子が 1 つも無いときは、`FR-029` に従って薄く描く
    //       こと（MUST）**」
    //   `HF-14`:
    //     「**配下に行を足す操作子を、行ごとに 1 つ置くこと（MUST）**」
    //
    // ⭐ 「開ける直下の子が 1 つも無いとき」 IS THIS ROW, and the rule for it is
    // 薄く描く -- faint, not absent. A row with nothing under it is the case the
    // MUST was written for, so it is the case that must draw them.
    // ⚠️ HF-14 is not spent by a childless row at all: the closing paragraph
    // under 表 T-051 names 「`HF-2` / `HF-3` / `HF-10` / `HF-11` / `HF-12` /
    // `HF-13`」 as the entrances that count 「いま描かれている行」 and does NOT
    // name `HF-14` -- adding a row is not an operation that reveals one.
    expect(drew, `${entranceForRule('HF-13')} left a row with nothing under it`).toContain(
      entranceForRule('HF-13'),
    )
    expect(drew, `${entranceForRule('HF-14')} left a row with nothing under it`).toContain(
      entranceForRule('HF-14'),
    )
  })

  // ⛔⛔ A CASE STOOD HERE AND WAS DELETED ON 2026-08-30, NOT WEAKENED. It read
  // 「GIVEN a row with NOTHING under it … THEN HF-1's three stand on it as well,
  // faint」 and was RED: it built `withExpander(null)`, and the surface drew
  // nothing for a null. ✅ THE FINDING WAS ACCEPTED AND FIXED AT BOTH ENDS --
  // `expanderOf` now answers the three with none armed for a childless row, and
  // `RowTitle.expander` is no longer nullable -- so the state it was about can
  // only be spelled as `NOTHING_TO_FOLD` now. ⭐ SPELLED THAT WAY IT IS LETTER FOR
  // LETTER the last row of `EXPANDER_STATES` above, whose `it.each` already
  // asserts that all three stand for `canOpen:false / canClose:false /
  // canCloseBelow:false`. ⛔ NOTHING IS LOST: that case is where this claim lives.

  it('GIVEN a panel with no rows at all WHEN it is drawn THEN no expander control exists anywhere (empty)', () => {
    const built = drawn(viewWith({ rowTitlePanel: { pinnedTitles: [], titles: [] } }))

    expect(expanderControls(built)).toHaveLength(0)
  })
})

// ===========================================================================
// 表 T-051 HF-13 / HF-14 -- the two entrances the row grew on 2026-08-30.
//
// ⭐ WHAT THE SPECIFICATION SAYS, VERBATIM (docs/spec/01-04-requirements.md,
// 表 T-051):
//
//   `HF-13`: 「**1 階層だけ開く操作子を、行ごとに 1 つ置くこと（MUST）**」 ——
//     表 T-015 の `HR-7` である。⭐ 「**`HF-2`（配下をすべて開く）とは別の入口と
//     すること（MUST）。同じ入口に兼ねさせてはならない（MUST NOT）**」 ——
//     「押すたびに違う量が開く入口は、何が起きるかを押す前に読めない」。
//     ⛔ 「**開ける直下の子が 1 つも無いときは、`FR-029` に従って薄く描くこと
//     （MUST）。**」⭐ 「**入口は 表 T-109 の `IC-90` である**」
//   `HF-14`: 「**配下に行を足す操作子を、行ごとに 1 つ置くこと（MUST）**」 ——
//     表 T-015 の `HR-8` である。⭐ 「**入口は 表 T-109 の `IC-91` である**」
//
// ⛔ WHAT THIS UNIT DOES NOT OWE THEM, said plainly so nobody looks for it here.
// 表 T-015's `HR-7` 「**直下の子だけ**を開き、**孫より下は畳んだままにすること
// （MUST）**」 and `HF-14`'s 「**足した行は末子とすること（MUST）**」 and
// 「**名前が空のまま確定されたときは、その行を立てないこと（MUST）**」 are all
// rules about what is WRITTEN when the entrance is pressed. This unit draws and
// answers points; the press is planned in the translator and carried out three
// layers away. What it owes is that the entrance EXISTS, once per row, that it
// can be told from `HF-2`'s, and that a press on it lands.
// ===========================================================================

/** `HF-13`'s entrance and `HF-2`'s, each looked up through 表 T-109's 正 column. */
const IC_OPEN_ONE_LEVEL = entranceForRule('HF-13')
const IC_OPEN_ALL_BELOW = entranceForRule('HF-2')
const IC_ADD_CHILD = entranceForRule('HF-14')

/** Two plain rows, so 「行ごとに 1 つ」 can be counted rather than assumed. */
const twoRows = (patch: Partial<RowTitle> = {}): ScreenView =>
  viewWith({
    rowTitlePanel: {
      pinnedTitles: [],
      titles: [
        rowTitle({
          groupId: 'g-1',
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
          ...patch,
        }),
        rowTitle({
          groupId: 'g-2',
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
          ...patch,
        }),
      ],
    },
  })

/** Every node carrying one row of 表 T-109, wherever it is. */
const everyEntry = (built: Stage, icon: string): FakeElement[] =>
  selfAndDescendants(built.root()).filter((one) => one.getAttribute('data-icon') === icon)

describe('表 T-051 HF-13 -- 1 階層だけ開く操作子を、行ごとに 1 つ (MUST)', () => {
  it(`GIVEN two rows WHEN the panel is drawn THEN each carries exactly one ${IC_OPEN_ONE_LEVEL} (「行ごとに 1 つ置くこと（MUST）」)`, () => {
    const built = drawn(twoRows())

    expect(everyEntry(built, IC_OPEN_ONE_LEVEL)).toHaveLength(2)
    for (const row of rowsOf(built)) {
      expect(
        controlsOf(row).filter((one) => one.getAttribute('data-icon') === IC_OPEN_ONE_LEVEL),
        `row ${row.getAttribute('data-group-id')} does not carry exactly one ${IC_OPEN_ONE_LEVEL}`,
      ).toHaveLength(1)
    }
  })

  it(`⭐ GIVEN the row is drawn WHEN ${IC_OPEN_ONE_LEVEL} and ${IC_OPEN_ALL_BELOW} are compared THEN they are TWO controls and not one (「別の入口とすること（MUST）。同じ入口に兼ねさせてはならない（MUST NOT）」)`, () => {
    const built = drawn(oneLiveRow())
    const oneLevel = everyEntry(built, IC_OPEN_ONE_LEVEL)
    const allBelow = everyEntry(built, IC_OPEN_ALL_BELOW)

    // ⛔ THE MUST NOT IS THE POINT: one control that opened one level on some
    // presses and the whole subtree on others is exactly 「押すたびに違う量が
    // 開く入口」. Two nodes is the only shape that cannot do that.
    expect(oneLevel).toHaveLength(1)
    expect(allBelow).toHaveLength(1)
    expect(oneLevel[0], 'HF-13 and HF-2 are the same node').not.toBe(allBelow[0])
  })

  it(`⭐ GIVEN both entrances are drawn WHEN each is pressed THEN IF-9 answers a DIFFERENT row of 表 T-109 (${IC_OPEN_ONE_LEVEL} / ${IC_OPEN_ALL_BELOW})`, () => {
    const built = drawn(oneLiveRow())

    // 表 T-065 IF-9 (MUST): 「点がどの入口の上かは、その入口を描いた側が答える
    // こと」. ⛔ If both points came back with the same row, the shell would have
    // ONE place to hang two different amounts of opening on -- which is the
    // reading HF-13's MUST NOT forbids, arriving one seam later.
    expect(ask(built, AT.rowOpenOneLevel.x, AT.rowOpenOneLevel.y)).toEqual({
      part: partName('U-22'),
      entry: IC_OPEN_ONE_LEVEL,
      format: null,
      rowGroupId: 'g-1',
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
    expect(ask(built, AT.rowExpanderOpen.x, AT.rowExpanderOpen.y)?.entry).toBe(IC_OPEN_ALL_BELOW)
  })

  it(`⛔ GIVEN a row with no direct child to open WHEN it is drawn THEN ${IC_OPEN_ONE_LEVEL} is drawn FAINT and not taken away (「開ける直下の子が 1 つも無いときは、FR-029 に従って薄く描くこと（MUST）」)`, () => {
    const armed = drawn(twoRows({ canOpenOneLevel: true }))
    const spent = drawn(twoRows({ canOpenOneLevel: false }))
    const armedOne = everyEntry(armed, IC_OPEN_ONE_LEVEL)[0] as FakeElement
    const spentOne = everyEntry(spent, IC_OPEN_ONE_LEVEL)[0] as FakeElement

    // ⭐ 薄く描く IS A DRAWING AND NOT AN ABSENCE. FR-029: 「その入口を押しても、
    // いま文書にも画面にも何も変えられないときは、その入口を薄く描くこと
    // （MUST）」, and its RATIONALE says why the alternative is worse:
    // 「押しても絵が動かない入口は、故障した入口と見分けられない」.
    expect(spentOne, `${IC_OPEN_ONE_LEVEL} went away when it had nothing to open`).toBeDefined()
    // ⭐ AND IT IS DRAWN DIFFERENTLY, which is what 薄く means: some declaration
    // has to part the two, or 薄く描く drew nothing.
    expect(
      differingProperties(armedOne, spentOne),
      `${IC_OPEN_ONE_LEVEL} is drawn identically whether or not it has a child to open`,
    ).not.toEqual([])
  })

  it(`⛔ GIVEN ${IC_OPEN_ONE_LEVEL} is faint WHEN the press it must still take is looked for THEN it is not disabled in the host's sense and IF-9 still answers it (FR-029 MUST NOT)`, () => {
    const built = drawn(twoRows({ canOpenOneLevel: false }))
    const spentOne = everyEntry(built, IC_OPEN_ONE_LEVEL)[0] as FakeElement

    // ⛔ FR-029: 「**薄く描いた入口を、宿主の意味で無効にしてはならない
    // （MUST NOT）** —— 無効にすると押下そのものが届かず、下の理由を告げる引き金
    // が消える。**押されたときに限り、行えない理由を通知すること（MUST）**」.
    // ⭐ 表 T-233's `RS-28`「配下に、開ける行が 1 つも無い」 is the reason waiting
    // on that press, and a `disabled` attribute is what would swallow it.
    expect(
      spentOne.hasAttribute('disabled'),
      `${IC_OPEN_ONE_LEVEL} is disabled in the host's sense, so the press RS-28 waits on never lands`,
    ).toBe(false)
    expect(ask(built, AT.rowOpenOneLevel.x, AT.rowOpenOneLevel.y)?.entry).toBe(IC_OPEN_ONE_LEVEL)
  })

  it(`⭐ GIVEN a spent ${IC_OPEN_ONE_LEVEL} and a spent entrance on ANOTHER surface WHEN the two are read THEN both are faint in the same colour (FR-029: 載る面によって薄くしない入口があってはならない (MUST NOT))`, () => {
    const built = drawn(twoRows({ canOpenOneLevel: false }))
    const onTheRow = everyEntry(built, IC_OPEN_ONE_LEVEL)[0] as FakeElement
    // IC-5 stands in the header fixture with `isEnabled: false` -- the same
    // 「押しても何も変えられない」 state, one surface over.
    const onTheHeader = entryFor(built.root(), 'IC-5')

    // ⭐ FR-029 (MUST): 「薄さは `_assets/tbl-settings.md` の 表 T-236 の `S-149`
    // の色で示すこと」, and then 「⚠️ 本規則は 表 T-109 の全行に当たる …
    // ⛔ 載る面によって薄くしない入口があってはならない（MUST NOT）」. ⚠️ WHAT THE
    // COLOUR RESOLVES TO IS NOT ASKED HERE -- tests/unit/fr-029-in-effect-is-
    // filled-not-rimmed.test.ts holds it against 表 T-236. What is asked is that
    // the row is not given a faintness of its own.
    expect(
      styleMap(onTheRow).get('color'),
      'the row control and the header entrance are faint in different colours',
    ).toBe(styleMap(onTheHeader).get('color'))
  })

  it('GIVEN the specification is re-read WHEN 表 T-051 HF-13 is looked up THEN it still asks for a separate entrance, one per row, faint when spent', () => {
    const hf13 = specTable('T-051').rows.find((one) => one.id === 'HF-13')
    expect(hf13, '表 T-051 no longer holds HF-13').toBeDefined()
    const cells = hf13?.cells.join(' ') ?? ''
    expect(cells).toContain('1 階層だけ開く操作子を、行ごとに 1 つ置くこと（MUST）')
    expect(cells).toContain('同じ入口に兼ねさせてはならない（MUST NOT）')
    expect(cells).toContain('開ける直下の子が 1 つも無いときは')
    // ⭐ The join this file leans on: HF-13 names its own entrance, and
    // `entranceForRule` finds the same row from the other side of 表 T-109.
    expect(cells).toContain(`\`${IC_OPEN_ONE_LEVEL}\``)
  })

  it('GIVEN the specification is re-read WHEN 表 T-015 HR-7 is looked up THEN it still opens the DIRECT children only', () => {
    // ⚠️ NOT THIS UNIT'S TO CARRY OUT -- see the note above this describe. It is
    // read here so that the entrance drawn above cannot quietly become HF-2's
    // twin: the day HR-7 stops meaning 「直下の子だけ」, HF-13's separateness has
    // no reason left and these cases have to be re-read.
    const hr7 = specTable('T-015').rows.find((one) => one.id === 'HR-7')
    expect(hr7, '表 T-015 no longer holds HR-7').toBeDefined()
    expect(hr7?.cells.join(' ')).toContain('孫より下は畳んだままにすること（MUST）')
  })
})

describe('表 T-051 HF-14 -- 配下に行を足す操作子を、行ごとに 1 つ (MUST)', () => {
  it(`GIVEN two rows WHEN the panel is drawn THEN each carries exactly one ${IC_ADD_CHILD} (「行ごとに 1 つ置くこと（MUST）」)`, () => {
    const built = drawn(twoRows())

    expect(everyEntry(built, IC_ADD_CHILD)).toHaveLength(2)
    for (const row of rowsOf(built)) {
      expect(
        controlsOf(row).filter((one) => one.getAttribute('data-icon') === IC_ADD_CHILD),
        `row ${row.getAttribute('data-group-id')} does not carry exactly one ${IC_ADD_CHILD}`,
      ).toHaveLength(1)
    }
  })

  it(`⭐ GIVEN ${IC_ADD_CHILD} is drawn WHEN it is pressed THEN IF-9 answers it WITH the row it stands on (表 T-065 IF-9 MUST)`, () => {
    const built = drawn(oneLiveRow())

    // ⭐ `rowGroupId` IS THE WHOLE OF WHAT MAKES THE PRESS ACTIONABLE. HR-8 of
    // 表 T-015 (MUST): 「**選択した `TaskGroup` の配下に行を 1 つ足す。**⭐ **足す
    // 先は配下とすること（MUST）**」 -- so an answer that named the entrance and
    // not the row would leave the shell knowing what was pressed and not under
    // what.
    expect(ask(built, AT.rowAddChild.x, AT.rowAddChild.y)).toEqual({
      part: partName('U-22'),
      entry: IC_ADD_CHILD,
      format: null,
      rowGroupId: 'g-1',
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it(`GIVEN a row with nothing under it WHEN it is drawn THEN ${IC_ADD_CHILD} stands on it armed (a childless row is exactly the row a child is added to)`, () => {
    const armed = drawn(withExpander(NOTHING_TO_FOLD))
    const alsoArmed = drawn(oneLiveRow())
    const onLeaf = everyEntry(armed, IC_ADD_CHILD)[0] as FakeElement
    const onParent = everyEntry(alsoArmed, IC_ADD_CHILD)[0] as FakeElement

    // ⚠️ THE CLOSING PARAGRAPH UNDER 表 T-051 DOES NOT REACH HF-14. It names
    // 「`HF-2` / `HF-3` / `HF-10` / `HF-11` / `HF-12` / `HF-13`」 as the
    // entrances that count 「いま描かれている行」 and finishes 「その操作で、
    // 描かれる行が 1 行も増減しないときは、対象が 1 つも無いものとして扱うこと
    // （MUST）」. ⛔ HF-14 is absent from that list, and adding a row always
    // increases the rows -- so nothing about having no children spends it.
    expect(onLeaf).toBeDefined()
    expect(
      differingProperties(onLeaf, onParent),
      `${IC_ADD_CHILD} is drawn differently on a row that has no children`,
    ).toEqual([])
  })

  it('GIVEN the specification is re-read WHEN 表 T-051 HF-14 is looked up THEN it still asks for one per row, an empty name typed in place, and no default', () => {
    const hf14 = specTable('T-051').rows.find((one) => one.id === 'HF-14')
    expect(hf14, '表 T-051 no longer holds HF-14').toBeDefined()
    const cells = hf14?.cells.join(' ') ?? ''
    expect(cells).toContain('配下に行を足す操作子を、行ごとに 1 つ置くこと（MUST）')
    expect(cells).toContain('足した行は末子とすること（MUST）')
    expect(cells).toContain('名前は空で立て、その場で打たせること（MUST）')
    expect(cells).toContain('既定の名を与えてはならない（MUST NOT）')
    expect(cells).toContain('名前が空のまま確定されたときは、その行を立てないこと（MUST）')
    expect(cells).toContain(`\`${IC_ADD_CHILD}\``)
  })

  it('GIVEN the specification is re-read WHEN 表 T-015 HR-8 is looked up THEN it still adds UNDER the row and not beside it', () => {
    // ⚠️ NOT THIS UNIT'S TO CARRY OUT -- read for the reason HR-7 is read above.
    const hr8 = specTable('T-015').rows.find((one) => one.id === 'HR-8')
    expect(hr8, '表 T-015 no longer holds HR-8').toBeDefined()
    expect(hr8?.cells.join(' ')).toContain('足す先は配下とすること（MUST）')
  })
})

describe('表 T-109 IC-58 / IC-59 -- the entry a press on either side answers', () => {
  it.each(T_109_ROW_EXPANDER)(
    'GIVEN the pair is drawn WHEN a point over the $side control is asked about THEN IF-9 answers Row Title Panel / $row (表 T-051 の $rule)',
    ({ row }) => {
      const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))
      const at = EXPANDER_AT[row]

      expect(at, `no point was laid out for ${row}`).toBeDefined()
      expect(ask(built, at?.x ?? -1, at?.y ?? -1)).toEqual({
        part: 'Row Title Panel',
        entry: row,
        format: null,
        // ⛔ HF-2 opens THE ROW'S subtree and HF-3 collapses THE ROW itself, so
        // the entry alone -- which of the two controls -- cannot become either
        // command. `withExpander` draws one row and this is its `TaskGroup.id`.
        rowGroupId: 'g-1',
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
    },
  )

  it('GIVEN both controls WHEN each is pressed THEN two DIFFERENT entries come back (U-47: two controls, not one in two states)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))

    const opening = ask(built, AT.rowExpanderOpen.x, AT.rowExpanderOpen.y)
    const closing = ask(built, AT.rowExpanderClose.x, AT.rowExpanderClose.y)

    // ⛔ If one control answered for both, HF-2 (その行の配下をすべて開く) and
    // HF-3 (その行自身を畳む) would have to be told apart by something other than
    // the press -- and 表 T-109 gives them two rows precisely so they need not be.
    expect(opening?.entry).not.toBe(closing?.entry)
    expect([opening?.entry, closing?.entry]).toEqual(['IC-58', 'IC-59'])
  })

  it('GIVEN the pair is drawn WHEN the entries answered are compared with the tree THEN the unit answers only what it itself drew (IF-9 MUST, 05-07-design.md:390)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))

    for (const one of T_109_ROW_EXPANDER) {
      const node = entryFor(built.root(), one.row)
      expect(node.getAttribute('data-role')).toBe('Row Expander')
      const at = EXPANDER_AT[one.row]
      expect(ask(built, at?.x ?? -1, at?.y ?? -1)?.entry).toBe(one.row)
    }
  })

  it('GIVEN both sides are spent WHEN either is pressed THEN it still answers its entry (FR-029: it does not go quiet)', () => {
    const built = drawn(withExpander({ canOpen: false, canClose: false, canCloseBelow: false }))

    for (const one of T_109_ROW_EXPANDER) {
      const at = EXPANDER_AT[one.row]
      expect(ask(built, at?.x ?? -1, at?.y ?? -1)).toEqual({
        part: 'Row Title Panel',
        entry: one.row,
        format: null,
        // ⭐ A spent control is drawn faint and still stands ON its row, so the
        // row it names does not go away with the two halves being spent.
        rowGroupId: 'g-1',
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
    }
  })

  it('GIVEN both sides are spent WHEN the controls are read THEN neither is disabled nor hidden (FR-029: drawn faint, not removed)', () => {
    const built = drawn(withExpander({ canOpen: false, canClose: false, canCloseBelow: false }))

    for (const one of T_109_ROW_EXPANDER) {
      const node = entryFor(built.root(), one.row)
      // ⚠️ `disabled` stops an element taking the pointer, and then no answer
      // above could ever be given.
      expect(node.hasAttribute('disabled'), `${one.row} was disabled`).toBe(false)
      expect(isShown(node), `${one.row} was hidden`).toBe(true)
    }
  })

  it('GIVEN the pair is drawn WHEN canOpen and canClose differ THEN each side records its own half (FR-029 needs the spent one tellable)', () => {
    // ⚠️ The attribute NAMES below are the seam's published DOM contract, not
    // the specification's -- docs/spec fixes no attribute. What IS spec-driven
    // is that `RowExpander.canOpen` (HF-2) and `.canClose` (HF-3) must ARRIVE
    // separately, or the faint drawing FR-029 asks for has nothing to key on.
    const open = drawn(withExpander({ canOpen: true, canClose: false, canCloseBelow: false }))
    const close = drawn(withExpander({ canOpen: false, canClose: true, canCloseBelow: false }))

    expect(entryFor(open.root(), 'IC-58').getAttribute('data-can-open')).toBe('true')
    expect(entryFor(open.root(), 'IC-59').getAttribute('data-can-close')).toBe('false')
    expect(entryFor(close.root(), 'IC-58').getAttribute('data-can-open')).toBe('false')
    expect(entryFor(close.root(), 'IC-59').getAttribute('data-can-close')).toBe('true')
  })
})

describe('the Row Expander at the edges -- R3.4, the bare panel, and a redraw', () => {
  it('GIVEN IC-58 holds x 84..100 and IC-59 x 100..116 WHEN the shared edge is pressed THEN it belongs to IC-59 (R3.4, half-open)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))

    expect(ask(built, 99, 64)?.entry).toBe('IC-58')
    expect(ask(built, 100, 64)?.entry).toBe('IC-59')
    // ⭐ The second shared edge, which the third control of CR-294 added: the
    // same rule has to resolve it, and there is now more than one to resolve.
    expect(ask(built, 115, 64)?.entry).toBe('IC-59')
    expect(ask(built, 116, 64)?.entry).toBe('IC-77')
  })

  it('GIVEN IC-58 begins at x 84, y 60 WHEN its left and top edge are pressed THEN it holds them (R3.4, half-open)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))

    expect(ask(built, 84, 60)?.entry).toBe('IC-58')
  })

  it('GIVEN IC-77 ends at x 132 WHEN the strip beyond it is pressed THEN the panel answers with entry null (EZ-2: the icon the pointer rests ON)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))

    // ⭐ 表 T-023a: the panel holds no `ScreenRegions` rectangle, so the answer
    // is the part and never nothing -- but 「入口の上」 has to stay tellable
    // from 「面の上・入口の外」 for EZ-2 to know which explanation to raise.
    // ⭐ THE TWO ANSWERS COME APART HERE, which is the point of the pair being
    // separate members: the point is on NO entry and still on THAT row, so the
    // entry is none while the row is named.
    expect(ask(built, 132, 64)).toEqual({
      part: 'Row Title Panel',
      entry: null,
      format: null,
      rowGroupId: 'g-1',
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
    expect(ask(built, AT.rowExpanderGap.x, AT.rowExpanderGap.y)).toEqual({
      part: 'Row Title Panel',
      entry: null,
      format: null,
      rowGroupId: 'g-1',
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  // ⛔⛔ A CASE STOOD HERE AND WAS DELETED ON 2026-08-30, NOT WEAKENED. It read
  // 「GIVEN a row with no expander … THEN the panel answers with entry null (null
  // path)」, and 「a row with no expander」 is a description `RowTitle.expander` can
  // no longer spell (表 T-051 の `HF-1`, 「各行に… 1 つずつ置く」). ⭐ BOTH HALVES
  // OF WHAT IT ASSERTED LIVE ON, and neither is this file's only copy:
  //   ・ 「面の上・入口の外」 answering `entry: null` while still naming the row is
  //     「GIVEN IC-77 ends at x 132 WHEN the strip beyond it is pressed」 above,
  //     which presses two such points on the same row.
  //   ・ A control that can do nothing still answering its own row of 表 T-109 --
  //     `FR-029`'s 「薄く描いた入口を、宿主の意味で無効にしてはならない（MUST NOT）」
  //     -- is 「GIVEN both sides are spent WHEN either is pressed」 below.

  it('GIVEN the expander was drawn and the next frame drops the ROW WHEN the same point is pressed THEN the entry stops answering (the answer comes from what is drawn NOW)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))
    expect(ask(built, AT.rowExpanderOpen.x, AT.rowExpanderOpen.y)?.entry).toBe(
      entranceForRule('HF-2'),
    )

    // ⚠️ THE SECOND FRAME USED TO BE `withExpander(null)`, ON THE READING THAT A
    // ROW WITH NOTHING UNDER IT CARRIES NO CONTROL. 表 T-051 の `HF-13` (MUST)
    // and `FR-029` (MUST) say otherwise -- see the two cases above -- so a null
    // expander is no longer a frame in which the entrance goes away, and a case
    // built on it would be asking for the very absence the manuscript forbids.
    // ⭐ THE CLAIM IS UNCHANGED AND IS NOW MADE WITH THE FRAME THAT REALLY DOES
    // TAKE THE CONTROL AWAY: a panel with no rows at all. 表 T-065's IF-9 has
    // 「点がどの入口の上かは、その入口を描いた側が答えること（MUST）」, and a
    // side that answered from the frame BEFORE would name an entry nobody can see.
    surfaceOf(built).showScreenView(viewWith({ rowTitlePanel: { pinnedTitles: [], titles: [] } }))

    expect(ask(built, AT.rowExpanderOpen.x, AT.rowExpanderOpen.y)?.entry ?? null).toBeNull()
    expect(expanderControls(built)).toHaveLength(0)
  })

  it('GIVEN nothing has been drawn yet WHEN the expander point is asked about THEN nothing is on it (BO-1 of 表 T-077)', () => {
    const built = wire()

    expect(ask(built, AT.rowExpanderOpen.x, AT.rowExpanderOpen.y)).toBeNull()
  })
})

// ===========================================================================
// IC-58 / IC-59 / IC-60 -- A CONTROL THE SPECIFICATION PUTS ON SCREEN MUST HAVE
// A BOX, AND MUST TAKE THE POINTER.
//
// ⭐ WHY THIS BLOCK EXISTS. 表 T-109 puts three entries on the `Row Title
// Panel` (_assets/tbl-glossary.md:499-501) and 表 T-065's IF-9 joins each to a
// point on the screen. Twenty-one of these controls were found in the live DOM
// at 4 x 0 pixels: they could not be seen and could not be pressed. ⛔ EVERY
// CASE IN THIS FILE WAS GREEN WHILE THAT WAS TRUE, and the reason is worth
// naming out loud, because it decides what the cases below are allowed to
// assert.
//
// ⚠️ THE HARNESS CANNOT MEASURE A PIXEL. `laidOut` answers from `LAYOUT`, keyed
// by `data-icon` and then `data-role`, so `getBoundingClientRect()` hands back
// the box THIS FILE stipulated and never one the unit's own declarations
// produced. ⛔ A case reading `getBoundingClientRect().width` here would pass
// against a control that is 4 x 0 in a browser -- it would look like it checked
// this and would check nothing. It is deliberately not written.
//   ⚠️ The fallback in `laidOut` is no better: it unions the ELEMENT children,
//   and these controls carry a text node and no element, so it would report zero
//   for a control that a browser lays out perfectly well.
//
// ⭐ WHAT IS CHECKED INSTEAD IS THE THING A BROWSER READS TO GET THE PIXEL --
// the declarations the unit itself wrote on the node. A box has extent on an
// axis only if something gives it one: content, an explicit size, a padding or a
// border. That is the CSS box model, not an opinion of this file's, and it is
// decidable from what the fake records. ⭐ `intrinsicExtent` below is that
// reading, and the case right after it BREAKS the predicate on purpose and
// watches it fail (docs/development-rules/04-verification.md §2), so the ⭐ case
// cannot be a green that proves nothing.
//
// The rules these cases answer to:
//   表 T-109        IC-58 / IC-59 / IC-60 are entries ON the `Row Title Panel`
//   表 T-065 IF-9   「画面上の点がどの UI パーツのどの入口の上か」 -- an entry
//                   that covers no point is an entry no point can be on
//   表 T-051 HF-1   「行見出しパネルの各行に、開く操作子と閉じる操作子を 1 つずつ
//                   置く」 -- a 操作子 that cannot be operated is not placed
//   表 T-051 HF-5   「行の名前の文字サイズにかかわらず、操作子を同じ大きさで描く
//                   こと（MUST）」 -- it has A SIZE, and the row's name is not
//                   what decides it
//   FR-098          「ピン止めの操作子（`Row Pin`）を、行見出しパネルの各行に
//                   1 つ置くこと（MUST）」「その操作子で同じようにピン止めを
//                   外せること（MUST）」
//   FR-029          RATIONALE 「無反応だと故障に見える」
// ===========================================================================

/** 表 T-051 HF-5, copied from docs/spec/01-04-requirements.md:1311. */
const T_051_HF5_SAME_SIZE = '操作子を同じ大きさで描くこと（MUST）'

/** FR-098's MUST, copied from docs/spec/01-04-requirements.md:2594. */
const FR_098_ONE_PER_ROW = '行見出しパネルの各行に 1 つ置くこと（MUST）'

/** A length that contributes nothing. ⚠️ `none` and `auto` are a length's absence, not zero. */
const isZeroLength = (value: string): boolean =>
  value === '' || /^(0(?:[a-z%]+)?|none|auto|initial|unset)$/i.test(value.trim())

/** The four sides a `padding` / `border-width` shorthand expands to, in CSS order. */
function fourSides(shorthand: string): {
  readonly top: string
  readonly right: string
  readonly bottom: string
  readonly left: string
} {
  const parts = shorthand
    .trim()
    .split(/\s+/)
    .filter((one) => one.length > 0)
  const [first = '', second = first, third = first, fourth = second] = parts
  return { top: first, right: second, bottom: third, left: fourth }
}

/** Whether a `border` / `border-top` shorthand carries a width at all. */
const borderHasWidth = (shorthand: string): boolean =>
  !/(^|\s)(none|hidden)(\s|$)/i.test(shorthand) &&
  /(^|\s)(thin|medium|thick|[0-9.]+[a-z%]+)(\s|$)/i.test(shorthand)

/**
 * What, among the declarations this node carries, can give it a pixel on each
 * axis.
 *
 * ⭐ CONTENT COUNTS ON BOTH AXES: a `button` is `inline-block` by default, so a
 * glyph or a word is what makes it as wide and as tall as a line. ⛔ Nothing
 * here consults `LAYOUT` -- the whole point is to read what a browser would
 * read, which is the node itself.
 */
function intrinsicExtent(element: FakeElement): {
  readonly hasContent: boolean
  readonly widthSources: string[]
  readonly heightSources: string[]
} {
  const declared = styleMap(element)
  const at = (property: string): string => declared.get(property) ?? ''
  const padding = fourSides(at('padding'))
  const border = at('border')
  const widthSources: string[] = []
  const heightSources: string[] = []

  const hasContent = element.textContent !== '' || element.children.length > 0
  if (hasContent) {
    widthSources.push('content')
    heightSources.push('content')
  }
  for (const [axis, sources] of [
    ['width', widthSources],
    ['height', heightSources],
  ] as const) {
    if (!isZeroLength(at(axis))) sources.push(axis)
    if (!isZeroLength(at(`min-${axis}`))) sources.push(`min-${axis}`)
  }
  for (const side of ['top', 'bottom'] as const) {
    if (!isZeroLength(at(`padding-${side}`) || padding[side])) heightSources.push(`padding-${side}`)
    if (borderHasWidth(at(`border-${side}`) || border)) heightSources.push(`border-${side}`)
  }
  for (const side of ['left', 'right'] as const) {
    if (!isZeroLength(at(`padding-${side}`) || padding[side])) widthSources.push(`padding-${side}`)
    if (borderHasWidth(at(`border-${side}`) || border)) widthSources.push(`border-${side}`)
  }
  return { hasContent, widthSources, heightSources }
}

/**
 * `pointer-events` as it reaches this node.
 *
 * ⭐ It is an INHERITED property, so a control inside a subtree declared
 * `pointer-events:none` takes no pointer unless it -- or something between --
 * declares otherwise. ⚠️ The fake's `stackAt` models only `visibility` and
 * `display`, so a control lost this way is invisible to every other case in this
 * file; this reads the declarations instead.
 */
function inheritedPointerEvents(element: FakeElement): {
  readonly value: string
  readonly declaredBy: string
} {
  let at: FakeElement | null = element
  while (at !== null) {
    const held = styleMap(at).get('pointer-events')
    if (held !== undefined && held.trim() !== '' && held.trim() !== 'inherit') {
      return {
        value: held.trim().toLowerCase(),
        declaredBy: at.getAttribute('data-role') ?? at.tagName.toLowerCase(),
      }
    }
    at = at.parentNode
  }
  return { value: 'auto', declaredBy: '(nothing declared one)' }
}

/** Every control of 表 T-109 the panel drew, by row. */
function rowControlsOf(built: Stage): Map<string, FakeElement[]> {
  const held = new Map<string, FakeElement[]>()
  for (const one of T_109_ON_THE_ROW) {
    held.set(
      one.row,
      selfAndDescendants(built.root()).filter((node) => node.getAttribute('data-icon') === one.row),
    )
  }
  return held
}

/** One row, drawn plainly, with both sides of the expander live. */
const oneLiveRow = (): ScreenView => withExpander({ canOpen: true, canClose: true, canCloseBelow: false })

describe('表 T-109 IC-58 / IC-59 / IC-60 -- the control has a box (the 4 x 0 finding)', () => {
  it.each(T_109_ON_THE_ROW)(
    '⭐ GIVEN $row is drawn on the $surface WHEN the declarations a browser would measure are read THEN the control has BOTH a width and a HEIGHT -- the case that catches the 4 x 0 control nobody could press (表 T-109 $row, 表 T-051 HF-5 MUST)',
    ({ row }) => {
      const built = drawn(oneLiveRow())
      const node = entryFor(built.root(), row)
      const extent = intrinsicExtent(node)

      // ⛔ 表 T-051 HF-5 (MUST): 「操作子を同じ大きさで描くこと」. A control with
      // no source of height is drawn at height 0 -- it is not "the same size" as
      // anything, and 表 T-065's IF-9 can never answer a point that is on it,
      // because no point ever is. FR-029's RATIONALE 「無反応だと故障に見える」
      // is the same complaint from the reader's side.
      // ⚠️ The declarations found at the time of writing were
      // `padding: 0 0.125em` with `border: none` and no width, height, min-width
      // or min-height -- horizontal padding ONLY. With an empty control that is
      // 2 x 0.125em wide and NOTHING high: the 4 x 0 that was reported.
      expect(
        extent.heightSources,
        `${row} has nothing that gives it a height: ${inlineStyle(node)}`,
      ).not.toHaveLength(0)
      expect(
        extent.widthSources,
        `${row} has nothing that gives it a width: ${inlineStyle(node)}`,
      ).not.toHaveLength(0)
    },
  )

  it('⛔ GIVEN a node carrying the SAME declarations but nothing inside WHEN it is read THEN it measures wide and NOT high -- so the case above is not a green that proves nothing (04-verification.md §2)', () => {
    const built = drawn(oneLiveRow())
    const real = entryFor(built.root(), 'IC-58')

    // The control as it would be with the fallback taken away again: same node,
    // same declarations, nothing inside.
    const emptied = new FakeElement('button', built.world)
    emptied.setAttribute('style', inlineStyle(real))
    const extent = intrinsicExtent(emptied)

    expect(extent.hasContent).toBe(false)
    expect(extent.heightSources, 'the predicate would pass an empty control').toHaveLength(0)
    // ⭐ And it is wide, which is why the report said 4 x 0 and not 0 x 0: the
    // horizontal padding survives an empty control and the vertical one does not
    // exist. ⛔ If this ever becomes empty too, the ⭐ case above stopped being
    // the case that catches this defect and has to be re-read.
    expect(extent.widthSources).not.toHaveLength(0)
  })

  it('GIVEN the specification is re-read WHEN 表 T-051 HF-5 and FR-098 are looked up THEN they still require a size and one control per row', () => {
    const requirements = specText('01-04-requirements.md')

    expect(requirements).toContain(T_051_HF5_SAME_SIZE)
    expect(requirements).toContain(FR_098_ONE_PER_ROW)
  })

  it('GIVEN both sides of the expander are spent WHEN the controls are read THEN each still has a width and a height (FR-029: 薄く描く, not shrunk to nothing) -- IC-58 / IC-59', () => {
    const built = drawn(withExpander({ canOpen: false, canClose: false, canCloseBelow: false }))

    // ⛔ The boundary FR-029 speaks to. 「掴めない端点を薄く描いて理由をツール
    // チップで示すこと（MUST）」 -- a tooltip has to be pointed AT, so the faint
    // control needs its box more than the live one does.
    for (const one of T_109_ROW_EXPANDER) {
      const extent = intrinsicExtent(entryFor(built.root(), one.row))
      expect(extent.heightSources, `spent ${one.row} lost its height`).not.toHaveLength(0)
      expect(extent.widthSources, `spent ${one.row} lost its width`).not.toHaveLength(0)
    }
  })

  it('GIVEN a row whose own name is EMPTY WHEN its controls are read THEN they still have a height (表 T-051 HF-5: the row name does not decide it) -- IC-58 / IC-59 / IC-60', () => {
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [],
          titles: [
            rowTitle({
              groupId: 'g-1',
              label: '',
              wholeLabel: '',
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    // ⚠️ The empty case that matters for a control whose extent comes from what
    // is inside it: if the ROW's own name were what filled the control, an
    // unnamed row would take the control away with it.
    for (const one of T_109_ON_THE_ROW) {
      const extent = intrinsicExtent(entryFor(built.root(), one.row))
      expect(extent.heightSources, `${one.row} lost its height on an unnamed row`).not.toHaveLength(
        0,
      )
    }
  })

  it('GIVEN a pinned row and an ordinary row WHEN every control of 表 T-109 on the panel is read THEN each of the six has a box (HF-1 「各行に」, FR-098 「各行に 1 つ」)', () => {
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [
            rowTitle({
              groupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [
            rowTitle({
              groupId: 'g-1',
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    const held = rowControlsOf(built)
    for (const one of T_109_ON_THE_ROW) {
      const controls = held.get(one.row) ?? []
      expect(controls, `${one.row} was not drawn once per row`).toHaveLength(2)
      for (const node of controls) {
        expect(
          intrinsicExtent(node).heightSources,
          `${one.row} has no height on one of the two rows`,
        ).not.toHaveLength(0)
      }
    }
  })

  it('⭐ GIVEN a row with NOTHING TO FOLD WHEN the panel is read THEN every entry of 表 T-109 is on it exactly once and each has a box (FR-098 「各行に 1 つ」, HF-1 「各行に」, FR-029 薄く描く)', () => {
    const built = drawn(withExpander(NOTHING_TO_FOLD))

    // ⛔⛔ THIS CASE USED TO READ 「the pin is still there with a box and NO
    // EXPANDER IS」 and asserted `IC-58` / `IC-59` were absent. That half was a
    // reading of the seam, not of the manuscript, and the seam has since been
    // corrected: 表 T-051 の `HF-1` places the three on 「**各行**」 and `FR-029`
    // (MUST) draws a control that can do nothing 薄く rather than taking it away
    // -- 「**載る面によって薄くしない入口があってはならない（MUST NOT）**」.
    // ⭐ WHAT THE CASE WAS FOR SURVIVES AND IS WIDENED: `FR-098`'s pin does not
    // depend on the folding controls, and now none of the seven depends on any
    // other. ⚠️ The armed row is covered by the `it.each` at the head of this
    // describe; a row where every folding control is SPENT is covered nowhere
    // else, and a spent control with no box is a control no press can reach.
    const held = rowControlsOf(built)
    for (const one of T_109_ON_THE_ROW) {
      const drew = held.get(one.row) ?? []
      expect(drew, `${one.row} is not on a row with nothing to fold exactly once`).toHaveLength(1)
      for (const node of drew) {
        expect(
          intrinsicExtent(node).heightSources,
          `${one.row} has nothing that gives it a height: ${inlineStyle(node)}`,
        ).not.toHaveLength(0)
      }
    }
  })

  it('GIVEN a panel with no rows at all WHEN it is read THEN no control of 表 T-109 is drawn and none claims a box (empty)', () => {
    const built = drawn(viewWith({ rowTitlePanel: { pinnedTitles: [], titles: [] } }))

    const held = rowControlsOf(built)
    for (const one of T_109_ON_THE_ROW) {
      expect(held.get(one.row), `${one.row} was drawn on an empty panel`).toEqual([])
    }
    expect(ask(built, AT.rowPin.x, AT.rowPin.y)).toEqual({
      part: 'Row Title Panel',
      entry: null,
      format: null,
      // ⛔ An empty panel holds no row, so there is nothing for the key to name.
      // ⚠️ It does not stand for "this document has no rows" -- that is what
      // the description carries; this says the POINT is on none.
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })
})

describe('表 T-109 IC-58 / IC-59 / IC-60 -- the control takes the pointer', () => {
  // ⭐ THE SECOND HALF OF 「押せない」. A control can have a perfectly good box
  // and still take no press, and the fake cannot tell: `stackAt` weighs
  // `visibility` and `display` and nothing else, so `pointer-events` is a way
  // for every case above to stay green while the live DOM answers the node
  // BEHIND the control. These two cases read the declarations instead.
  it('GIVEN the panel is drawn WHEN the tree over it is read THEN it really does declare pointer-events:none -- without which the case below would be checking nothing', () => {
    const built = drawn(oneLiveRow())
    const overlay = byRole(built.root(), 'Row Title Tree')[0]

    // ⚠️ The overlay is `position:absolute` across the whole panel, so it is
    // laid `none` on purpose: were it `auto` it would swallow every press meant
    // for the panel underneath. ⛔ That is exactly why each control's own branch
    // has to hand the pointer BACK, and why the case below is live rather than
    // decorative. If this ever stops being `none`, re-read the pair.
    expect(overlay, 'no Row Title Tree was drawn').toBeDefined()
    expect(styleMap(overlay as FakeElement).get('pointer-events')).toBe('none')
  })

  it.each(T_109_ON_THE_ROW)(
    '⛔ GIVEN $row is drawn WHEN the pointer-events it INHERITS is resolved up the tree THEN it is not none -- a control the pointer passes through cannot be pressed (FR-098 MUST, 表 T-051 HF-1)',
    ({ row }) => {
      const built = drawn(oneLiveRow())
      const node = entryFor(built.root(), row)
      const reaching = inheritedPointerEvents(node)

      // ⛔ FR-098 (docs/spec/01-04-requirements.md:2594, MUST):
      //   「ピン止めの操作子（`Row Pin`）を、行見出しパネルの各行に 1 つ置くこと
      //    （MUST）」…「その操作子で同じようにピン止めを外せること（MUST）」
      // 「外せること」 is a press. 表 T-051 HF-1 asks the same of the expander:
      //   「行見出しパネルの各行に、開く操作子と閉じる操作子を 1 つずつ置く」
      // ⚠️ `pointer-events` INHERITS. A control inside a subtree that declared
      // `pointer-events:none` is not a hit target, so a real
      // `document.elementFromPoint` answers whatever is BEHIND it and IF-9 can
      // never name the entry -- which is 表 T-065's MUST at 05-07-design.md:390
      // failing in the browser while every case above stays green, because the
      // fake's `stackAt` models `visibility` and `display` and not this.
      expect(
        reaching.value,
        `${row} inherits pointer-events:${reaching.value} from ${reaching.declaredBy}`,
      ).not.toBe('none')
    },
  )
})

// ===========================================================================
// ⚠️ THE BLOCK THAT STOOD HERE PINNED A RULE THAT HAS BEEN WITHDRAWN.
//
// Until 2026-08-25, 表 T-051 HF-6 read 「操作子は薄く描き、ポインタが乗っている
// あいだだけ濃くすること」, and two blocks of this file held the unit to the two
// halves of that sentence: one read the controls' paint, the other read the
// sheet for a rule that darkened them. The row now reads 「操作子は、その行の
// 名前にポインタが乗っているあいだだけ描くこと（MUST）」 and records the change
// in its own cell (利用者の裁定, 2026-08-25).
//
// ⛔ SO 薄く AND 濃く ARE NOT RULES ANY MORE, and cases asserting them were
// mirroring a sentence the specification no longer holds. They are not weakened
// into something that would pass either wording: the block at the END of this
// file asks the same two questions of HF-6 as it NOW stands -- whether the
// controls are kept from being drawn while nothing points at them, and whether
// a pointer draws them -- and asks them of the same three controls.
//
// FR-098 (docs/spec/01-04-requirements.md:2610) binds the `Row Pin` to that row
// rather than restating it, which is why all three answer to it:
//   「置き方・大きさ・濃さと、並べた結果が収まらないときの扱いは、折り畳みの
//     操作子と同じとする（表 T-051 の `HF-4` 〜 `HF-6` と `HF-9`）」
// ===========================================================================

/** FR-098's referral of 置き方 to HF-4 .. HF-6, copied from docs/spec/01-04-requirements.md:2610. */
const FR_098_SAME_AS_THE_EXPANDER = '置き方・大きさ・濃さと'

// ===========================================================================
// 表 T-051 HF-4 -- THE CONTROLS HOLD THE RIGHT EDGE, WHATEVER THE NAME IS AND
// HOWEVER DEEP THE ROW SITS.
//
// 表 T-051 HF-4 (docs/spec/01-04-requirements.md:1310, MUST):
//   「行の名前の長さにかかわらず、操作子を行見出しパネルの右端に揃えること
//     （MUST）」—— 名前ごとに位置が変わると狙えない
// FR-098 (:2594) binds the `Row Pin` to that rule rather than restating it:
//   「置き方・大きさ・濃さと、並べた結果が収まらないときの扱いは、折り畳みの
//     操作子と同じとする（表 T-051 の `HF-4` 〜 `HF-6` と `HF-9`）」
// FR-085 (:1272) is what makes DEPTH the second variable. The room a name gets
// is the panel width less 「その行の深さぶんのインデント（`rowTitleIndent`）」
// less the room kept for the controls -- so the indent is spent on the NAME's
// side. An indent that moved the controls would make the right edge depend on
// the depth, which is the same defect HF-4 names for the name's length.
//
// ⚠️ THE HARNESS CANNOT SEE A RIGHT EDGE, SAID PLAINLY. `laidOut` answers from
// `LAYOUT`, this file's own map keyed by `data-icon` and then `data-role`, so
// `getBoundingClientRect()` on a control hands back the rectangle THIS FILE
// stipulated -- IC-58 at x 100, IC-59 at 116, IC-60 at 140 -- for every name and
// every depth alike. ⛔ A case comparing those numbers across two names would
// pass against a unit that put the controls on the LEFT and would look like it
// had checked HF-4. It is deliberately not written.
//
// ⭐ WHAT IS CHECKED INSTEAD is the arrangement the unit itself declared, which
// is what a browser turns into that edge:
//   1. the row is a flex row and the three entries of 表 T-109 are its LAST
//      children, in the order the roster numbers them, so nothing of the row's
//      own comes after them;
//   2. the cell holding the name grows into the free space (`flex-grow` of 1 or
//      more) from a `flex-basis` that contributes nothing, so a SHORT name
//      lengthens the gap before the controls instead of moving them;
//   3. that cell's `overflow` is not `visible`, which is what stops a LONG name:
//      CSS sizing turns a flex item's automatic minimum size off exactly when
//      its overflow is not visible, so a name wider than the row cannot push
//      anything out of it;
//   4. what the depth writes never reaches the controls or the row's right side.
// ⛔ Points 2 and 3 are the flexbox and sizing rules, not an opinion of this
// file's, and both are decidable from the declarations the fake records.
//
// ⚠️ ONE THING IS DELIBERATELY NOT ASSERTED: that the row's own box ends where
// the `Row Title Panel` ends. `RowTitle.box` ARRIVES -- screen-renderer.ts says
// it comes from `ScreenSession.rowBoxes` and forbids this side to measure it --
// so a row narrower than the panel would be UF-63's finding, not this unit's.
// ===========================================================================

/** 表 T-051 HF-4, copied from docs/spec/01-04-requirements.md:1310. */
const T_051_HF4_RIGHT_EDGE =
  '行の名前の長さにかかわらず、操作子を行見出しパネルの右端に揃えること（MUST）'

/** FR-085's rule that the depth is spent as an indent, copied from :1272. */
const FR_085_INDENT_BY_DEPTH = 'その行の深さぶんのインデント'

/**
 * A number out of a settings table, read at the moment this file is read so a
 * boundary below cannot fall behind the manuscript (Chapter 1.9).
 */
function settingNumber(table: string, row: string): number {
  const cell = specTable(table).rows.find((one) => one.id === row)?.by['値'] ?? ''
  const found = /`(\d+)`/.exec(cell)
  if (found === null) throw new Error(`table ${table} row ${row} has no number in its 値 column`)
  return Number.parseInt(found[1] ?? '', 10)
}

/**
 * `maxGroupDepth` (S-125) as 表 T-211 holds it.
 *
 * ⭐ 表 T-211 (docs/spec/_assets/tbl-settings.md:286): 「`TaskGroup` の深さの上限。
 * …**根の行を深さ 1 と数える**」 -- so 1 and this number are the two ends.
 */
const MAX_GROUP_DEPTH = settingNumber('T-211', 'S-125')

/** Depth 1 (the root row) up to S-125 -- both ends of the range, and the inside. */
const DEPTHS = Array.from({ length: MAX_GROUP_DEPTH }, (_unused, index) => index + 1)

/** The names HF-4 says must not move anything, from nothing at all to far past the panel. */
const ROW_NAMES = [
  { what: 'empty', label: '' },
  { what: 'null -- no name could be resolved (FR-058)', label: null },
  { what: 'one character', label: 'A' },
  { what: 'far longer than the panel', label: 'N'.repeat(400) },
] as const

/** One plainly drawn row, named as given and sitting at the given depth. */
const rowNamed = (label: string | null, depth = 1): ScreenView =>
  viewWith({
    rowTitlePanel: {
      pinnedTitles: [],
      titles: [
        rowTitle({
          groupId: 'g-1',
          label,
          wholeLabel: label,
          depth,
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
        }),
      ],
    },
  })

/** Every row the panel drew -- pinned ones and ordinary ones alike -- in document order. */
const rowsOf = (built: Stage): FakeElement[] =>
  selfAndDescendants(built.root()).filter((one) => one.hasAttribute('data-group-id'))

function theRowOf(built: Stage): FakeElement {
  const first = rowsOf(built)[0]
  if (first === undefined) throw new Error('the panel drew no row')
  return first
}

/** The children of a row that carry an entry of 表 T-109, in the order they were appended. */
const controlsOf = (row: FakeElement): FakeElement[] =>
  row.children.filter((one) => one.hasAttribute('data-icon'))

/**
 * The cell the row's name is in: the last child standing BEFORE the first
 * control. ⭐ It is found by position rather than by a role, because HF-4 is
 * about what stands between the name and the right edge, and nothing in the
 * specification names that cell.
 */
function nameCellOf(row: FakeElement): FakeElement | null {
  const firstControl = row.children.findIndex((one) => one.hasAttribute('data-icon'))
  const before = firstControl < 0 ? row.children : row.children.slice(0, firstControl)
  return before[before.length - 1] ?? null
}

/** Split a shorthand at the top level, so `calc(0.25em + 2em)` stays ONE value. */
function shorthandParts(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let at = ''
  for (const character of value.trim()) {
    if (character === '(') depth += 1
    if (character === ')') depth -= 1
    if (/\s/.test(character) && depth === 0) {
      if (at !== '') parts.push(at)
      at = ''
      continue
    }
    at += character
  }
  if (at !== '') parts.push(at)
  return parts
}

/** The four sides a `padding` / `margin` shorthand expands to, in CSS order. */
function sidesOf(shorthand: string): {
  readonly top: string
  readonly right: string
  readonly bottom: string
  readonly left: string
} {
  const parts = shorthandParts(shorthand)
  const [first = '', second = first, third = first, fourth = second] = parts
  return { top: first, right: second, bottom: third, left: fourth }
}

type BoxSide = 'top' | 'right' | 'bottom' | 'left'

/** One side of a box property, longhand first and the shorthand behind it. */
function insetOf(element: FakeElement, property: 'padding' | 'margin', side: BoxSide): string {
  const declared = styleMap(element)
  const longhand = declared.get(`${property}-${side}`)
  if (longhand !== undefined && longhand.trim() !== '') return longhand.trim()
  return sidesOf(declared.get(property) ?? '')[side]
}

/** `flex-grow` as it reaches this item, through the `flex` shorthand where that is what was written. */
function flexGrowOf(element: FakeElement): number {
  const declared = styleMap(element)
  const longhand = declared.get('flex-grow')
  if (longhand !== undefined && longhand.trim() !== '') return Number.parseFloat(longhand)
  const shorthand = (declared.get('flex') ?? '').trim().toLowerCase()
  if (shorthand === '' || shorthand === 'none' || shorthand === 'initial') return 0
  if (shorthand === 'auto') return 1
  const first = shorthandParts(shorthand)[0] ?? ''
  const value = Number.parseFloat(first)
  return Number.isFinite(value) ? value : 0
}

/** `flex-basis` as it reaches this item. ⚠️ `flex: 1` means a basis of `0%`, not `auto`. */
function flexBasisOf(element: FakeElement): string {
  const declared = styleMap(element)
  const longhand = declared.get('flex-basis')
  if (longhand !== undefined && longhand.trim() !== '') return longhand.trim().toLowerCase()
  const shorthand = (declared.get('flex') ?? '').trim().toLowerCase()
  if (shorthand === '' || shorthand === 'none' || shorthand === 'auto' || shorthand === 'initial') {
    return 'auto'
  }
  const parts = shorthandParts(shorthand)
  if (parts.every((one) => /^[0-9.]+$/.test(one))) return '0%'
  return parts[parts.length - 1] ?? 'auto'
}

/** A basis that contributes nothing, so the item's CONTENT cannot decide the layout. */
const isZeroBasis = (value: string): boolean => /^0(?:[a-z%]+)?$/i.test(value.trim())

/** The properties two drawings of the same node disagree about. */
function differingProperties(a: FakeElement, b: FakeElement): string[] {
  const left = styleMap(a)
  const right = styleMap(b)
  return [...new Set([...left.keys(), ...right.keys()])]
    .filter((one) => left.get(one) !== right.get(one))
    .sort()
}

/**
 * The properties an indent is allowed to land on without touching the right
 * edge: the row's own left inset, and the shorthands that carry it (whose RIGHT
 * component the cases read out and compare separately).
 */
const LEFT_INSETS = new Set(['padding', 'padding-left', 'margin', 'margin-left', 'text-indent'])

/** Each control's whole inline declaration, by its row of 表 T-109. */
const controlStyles = (built: Stage): Record<string, string> =>
  Object.fromEntries(
    T_109_ON_THE_ROW.map((one) => [one.row, inlineStyle(entryFor(built.root(), one.row))]),
  )

describe('表 T-051 HF-4 / FR-098 -- the controls hold the right edge whatever the name is', () => {
  it.each(ROW_NAMES)(
    '⭐ GIVEN a row whose name is $what WHEN the row it built is read THEN every entry 表 T-109 puts on the Row Title Panel is among its LAST children and the name beside them is what takes the free space (表 T-051 HF-4 MUST)',
    ({ label }) => {
      const built = drawn(rowNamed(label))
      const row = theRowOf(built)

      // ⛔ 表 T-051 HF-4 (MUST): 「行の名前の長さにかかわらず、操作子を行見出し
      // パネルの右端に揃えること」. In a flex line the last items sit at its end
      // only if something ahead of them absorbs the free space -- so these four
      // readings together are the rule, and no one of them is it alone.
      expect(styleMap(row).get('display'), 'the row is not a flex line').toBe('flex')

      // ⚠️ THE SET, NOT THE ORDER. 表 T-051 の `HF-4` fixes one position only --
      // 「ピン止めの操作子（表 T-109 の `IC-60`）を、並びのいちばん外（右端）に
      // 置くこと（MUST）」 -- and then says 「⚠️ **本行が定めるのはこの 1 つだけ
      // であり、ほかの操作子の前後は定めない**」. So a case that pinned the whole
      // sequence would be asserting a rule the manuscript expressly declines to
      // make; that one placement has its own case below. What HF-4 DOES decide
      // here is that they end the row whatever the name is.
      const tail = row.children.slice(-T_109_ON_THE_ROW.length)
      expect(
        [...tail.map((one) => one.getAttribute('data-icon'))].sort(),
        `the row does not end with 表 T-109's entries for the Row Title Panel: ${serialize(row)}`,
      ).toEqual([...T_109_ON_THE_ROW.map((one) => one.row)].sort())

      const name = nameCellOf(row)
      expect(name, 'the row has no cell for its name at all').not.toBeNull()
      const cell = name as FakeElement
      expect(
        flexGrowOf(cell),
        `the name cell does not grow, so the controls follow the name: ${inlineStyle(cell)}`,
      ).toBeGreaterThanOrEqual(1)
      // ⭐ A basis of zero is what makes the name's LENGTH irrelevant: the cell
      // starts at nothing and is handed the space that is left over.
      expect(
        isZeroBasis(flexBasisOf(cell)),
        `the name cell is sized from its content (flex-basis:${flexBasisOf(cell)})`,
      ).toBe(true)
      // ⭐ And this is what stops the LONG name: a flex item's automatic minimum
      // size does not apply when its overflow is not `visible`.
      expect(
        (styleMap(cell).get('overflow') ?? 'visible').trim().toLowerCase(),
        'a name longer than the row can push the controls out of it',
      ).not.toBe('visible')
    },
  )

  it('⭐ GIVEN the same row drawn with an empty name and with one far longer than the panel WHEN the two are compared THEN not one declaration on the controls differs, and neither does the row (表 T-051 HF-4: 名前ごとに位置が変わると狙えない)', () => {
    const empty = drawn(rowNamed(''))
    const long = drawn(rowNamed('N'.repeat(400)))

    expect(controlStyles(long)).toEqual(controlStyles(empty))
    expect(
      differingProperties(theRowOf(empty), theRowOf(long)),
      'the row itself is drawn differently for a long name',
    ).toEqual([])
  })

  it('⭐ GIVEN a row with NOTHING under it WHEN it is read THEN the SAME roster still ends the row (表 T-051 HF-1 「各行に」, HF-13 / HF-14 「行ごとに 1 つ」, FR-029 薄く描く)', () => {
    const built = drawn(withExpander(NOTHING_TO_FOLD))
    const row = theRowOf(built)

    // ✅ THIS CASE WAS RED FOR ONE ROUND AND IS NOW GREEN, and what moved was the
    // product, not the expectation (04-verification.md §1). It was written
    // against `withExpander(null)` and failed because the surface drew nothing
    // for a null; `expanderOf` now answers the three with none armed for a
    // childless row, and `RowTitle.expander` is no longer nullable, so the row
    // this case is about spells itself `NOTHING_TO_FOLD`. ⛔ NOT ONE EXPECTED
    // VALUE BELOW WAS TOUCHED. The case that stood here
    // asserted 「the `Row Pin` alone ends the row」 with a typed list of two.
    //
    // ⭐ EVERY ROW HAS THE SAME CONTROLS, AND HF-4 IS WHY IT MATTERS HERE:
    // 「**行の名前の長さにかかわらず、操作子を行見出しパネルの右端に揃えること
    // （MUST）**」, whose reason is 「名前ごとに位置が変わると狙えない」. ⛔ A
    // roster that shrinks on a childless row moves every remaining control under
    // a different part of the pointer's travel -- the very complaint HF-4 was
    // written about, one row down instead of one name across. `FR-085` says the
    // same thing about the space: 「**確保する場所を、操作子を描くかどうかで
    // 変えてはならない（MUST NOT）**」.
    expect(
      [...controlsOf(row).map((one) => one.getAttribute('data-icon'))].sort(),
      'a childless row ends with a different set of controls than a row with children',
    ).toEqual([...T_109_ON_THE_ROW.map((one) => one.row)].sort())
    const cell = nameCellOf(row)
    expect(cell).not.toBeNull()
    expect(flexGrowOf(cell as FakeElement)).toBeGreaterThanOrEqual(1)
  })

  it('GIVEN a PINNED row WHEN it is read THEN its controls end the row the same way (FR-098 draws the pinned rows too)', () => {
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [
            rowTitle({
              groupId: 'g-pinned',
              isPinned: true,
              depth: 2,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [],
        },
      }),
    )
    const row = theRowOf(built)

    expect(styleMap(row).get('display')).toBe('flex')
    expect(
      [
        ...row.children
          .slice(-T_109_ON_THE_ROW.length)
          .map((one) => one.getAttribute('data-icon')),
      ].sort(),
      `a pinned row does not end with 表 T-109's entries for the Row Title Panel: ${serialize(row)}`,
    ).toEqual([...T_109_ON_THE_ROW.map((one) => one.row)].sort())
    expect(flexGrowOf(nameCellOf(row) as FakeElement)).toBeGreaterThanOrEqual(1)
  })

  it('GIVEN a panel with no rows at all WHEN it is read THEN nothing claims the edge -- no row and no control (empty)', () => {
    const built = drawn(viewWith({ rowTitlePanel: { pinnedTitles: [], titles: [] } }))

    expect(rowsOf(built)).toEqual([])
    for (const one of T_109_ON_THE_ROW) {
      expect(
        selfAndDescendants(built.root()).filter(
          (node) => node.getAttribute('data-icon') === one.row,
        ),
        `${one.row} was drawn on an empty panel`,
      ).toEqual([])
    }
  })

  it('GIVEN the specification is re-read WHEN 表 T-051 HF-4 is looked up THEN it still puts the controls on the right edge regardless of the name (Chapter 1.9: the case is driven by the table)', () => {
    const hf4 = specTable('T-051').rows.find((one) => one.id === 'HF-4')
    expect(hf4, '表 T-051 no longer holds HF-4').toBeDefined()
    expect(hf4?.cells.join(' ')).toContain('行の名前の長さにかかわらず')
    expect(hf4?.cells.join(' ')).toContain('右端に揃えること（MUST）')
    expect(specText('01-04-requirements.md')).toContain(T_051_HF4_RIGHT_EDGE)
    // ⭐ FR-098 does not restate the rule; it refers the 置き方 to HF-4 .. HF-6.
    expect(specText('01-04-requirements.md')).toContain(FR_098_SAME_AS_THE_EXPANDER)
  })
})

describe('表 T-051 HF-4 / FR-085 -- the row depth moves the name, never the right edge', () => {
  it.each(DEPTHS)(
    '⭐ GIVEN a row at depth %i WHEN it is compared with a root row THEN every control is drawn identically and the row differs only on its LEFT inset (表 T-051 HF-4, FR-085 「深さぶんのインデント」) -- IC-58 / IC-59 / IC-60',
    (depth) => {
      const root = drawn(rowNamed('RowOne', 1))
      const deeper = drawn(rowNamed('RowOne', depth))

      // ⛔ The controls first: nothing the depth wrote may reach them, or the
      // right edge walks in with the depth and HF-4's 「狙えない」 is exactly
      // what the reader is left with.
      expect(controlStyles(deeper), `the depth ${depth} indent reached the controls`).toEqual(
        controlStyles(root),
      )

      // ⭐ And on the row itself the indent may only land on the left.
      const differing = differingProperties(theRowOf(root), theRowOf(deeper))
      expect(
        differing.filter((one) => !LEFT_INSETS.has(one)),
        `depth ${depth} changed something that is not a left inset: ${inlineStyle(theRowOf(deeper))}`,
      ).toEqual([])

      // ⚠️ `padding` is a shorthand and IS allowed to differ, so the side it
      // carries for the right edge is read out and compared on its own.
      expect(
        insetOf(theRowOf(deeper), 'padding', 'right'),
        `depth ${depth} changed the row's right padding`,
      ).toBe(insetOf(theRowOf(root), 'padding', 'right'))
      expect(insetOf(theRowOf(deeper), 'margin', 'right')).toBe(
        insetOf(theRowOf(root), 'margin', 'right'),
      )
    },
  )

  it('⭐ GIVEN the deepest row S-125 allows and a root row WHEN their drawings are compared THEN they DIFFER -- the depth was spent, and spent on the name side (FR-085 :1272)', () => {
    const root = drawn(rowNamed('RowOne', 1))
    const deepest = drawn(rowNamed('RowOne', MAX_GROUP_DEPTH))

    // ⚠️ Without this, the case above would be satisfied by a unit that ignored
    // the depth altogether: nothing differs, so nothing differs on the right.
    // FR-085 (:1272) counts on the indent being there -- 「その行の深さぶんの
    // インデント（`rowTitleIndent`）…を引いた残り」.
    expect(
      differingProperties(theRowOf(root), theRowOf(deepest)),
      `depth ${MAX_GROUP_DEPTH} is drawn exactly like depth 1 -- the indent is missing`,
    ).not.toEqual([])
    expect(specText('01-04-requirements.md')).toContain(FR_085_INDENT_BY_DEPTH)
  })

  it('GIVEN 表 T-211 is re-read WHEN S-125 is looked up THEN the depths these cases walk are the ones it allows (Chapter 1.9)', () => {
    const row = specTable('T-211').rows.find((one) => one.id === 'S-125')
    expect(row?.cells.join(' '), '表 T-211 no longer holds maxGroupDepth').toContain('maxGroupDepth')
    expect(row?.cells.join(' '), 'S-125 no longer counts the root row as depth 1').toContain(
      '根の行を深さ 1 と数える',
    )
    expect(DEPTHS[0]).toBe(1)
    expect(DEPTHS[DEPTHS.length - 1]).toBe(MAX_GROUP_DEPTH)
  })
})

// ===========================================================================
// 表 T-051 HF-6 -- 「その行の名前にポインタが乗っているあいだだけ描くこと」, AND
// THE ROOM THAT MAY NOT MOVE WHILE THEY ARE NOT DRAWN.
//
// 表 T-051 HF-6 (docs/spec/01-04-requirements.md:1312, MUST):
//   「操作子は、その行の名前にポインタが乗っているあいだだけ描くこと（MUST）」
//     —— 常に描くと、日程より操作子が目立ち、行の名前ともぶつかる
//   「描かないあいだも、確保する場所を変えてはならない（MUST NOT）」
//     —— 規則と理由は `FR-085` が持つ
// FR-098 (:2610) refers the 置き方 of the `Row Pin` to the same row.
//
// ⚠️ WHAT THE HARNESS CAN AND CANNOT SEE. There is no pointer here and no style
// resolution: the fake records the declarations a node was given and nothing
// else, so 「乗っているあいだ」 cannot be entered and then measured. ⛔ A case
// that dispatched a made-up `pointerover` and then read the tree would be
// checking a listener this file invented, not the rule.
// ⭐ WHAT IS CHECKED INSTEAD is the sheet the unit put on the page: whether a
// rule with NO pointer condition keeps the control from being drawn, whether a
// rule keyed on a pointer draws it, and -- the part that decides whether either
// does anything -- whether the property they use is one that KEEPS the control's
// room. `display:none` takes the box out of the layout, which is precisely the
// MUST NOT of this row; `visibility` and `opacity` do not.
//
// ⛔ TWO THINGS ARE NOT ASSERTED, AND NEITHER IS AN OVERSIGHT:
//   1. WHICH mechanism carries 「乗っているあいだ」. FR-048's MUST NOT (:2721)
//      names HF-6 as one of the things it does NOT cover, so a listener would be
//      admissible too; the cases below read whichever the unit declared, and
//      only a unit that declared NEITHER fails them.
//   2. THAT THE POINTER CONDITION NAMES THE ROW'S **NAME** rather than the whole
//      row. HF-6 says 「その行の名前に」 -- but the name has no settled name to
//      key a selector on: 表 T-103 has no row for the cell a row's name sits in,
//      which is why `nameCellOf` above finds it BY POSITION. ⚠️ So a case
//      demanding a selector for it would be demanding a `data-role` the
//      specification never minted, and this file cannot tell a rule keyed on the
//      name from one keyed on the row. **The gap belongs to 表 T-103.**
// ===========================================================================

/** One declaration of a rule in the unit's own sheet. */
interface SheetDeclaration {
  readonly value: string
  readonly isImportant: boolean
}

/** One selector of the unit's own sheet, with the declarations it carries. */
interface SheetRule {
  readonly selector: string
  readonly declarations: ReadonlyMap<string, SheetDeclaration>
}

/**
 * A tiny stylesheet reader: enough for the flat `selector, selector { … }` a
 * single-file page can carry.
 *
 * ⚠️ It knows nothing of at-rules. A rule nested inside `@media` would be read
 * as though it applied always, so if one ever appears here, re-read this.
 */
function parseCss(css: string): SheetRule[] {
  const rules: SheetRule[] = []
  for (const block of css.split('}')) {
    const brace = block.indexOf('{')
    if (brace < 0) continue
    const declarations = new Map<string, SheetDeclaration>()
    for (const one of block.slice(brace + 1).split(';')) {
      const colon = one.indexOf(':')
      if (colon < 0) continue
      const property = one.slice(0, colon).trim().toLowerCase()
      const written = one.slice(colon + 1).trim()
      declarations.set(property, {
        value: written.replace(/!\s*important$/i, '').trim(),
        isImportant: /!\s*important$/i.test(written),
      })
    }
    for (const selector of block.slice(0, brace).split(',')) {
      if (selector.trim() !== '') rules.push({ selector: selector.trim(), declarations })
    }
  }
  return rules
}

/** Every rule the unit put on the page, from every `style` element under its own root. */
const sheetRulesOf = (root: FakeElement): SheetRule[] =>
  selfAndDescendants(root)
    .filter((one) => one.tagName === 'STYLE')
    .flatMap((one) => parseCss(one.textContent))

/**
 * What a rule set would declare on this node WHILE the pointer rests somewhere
 * the selector names, or `null` where nothing would. The last matching rule
 * wins, as in a browser.
 *
 * ⭐ THE `:hover` MAY SIT ON ANY PART OF THE SELECTOR, NOT ONLY THE LAST. HF-6
 * keys the drawing on the pointer being on the row's NAME, and the control is
 * not the name -- so a rule for these controls has its condition on an ANCESTOR
 * and its subject at the end. The condition is stripped wherever it stands and
 * the rest is matched as a plain descendant selector.
 */
function hoverDeclaration(
  rules: readonly SheetRule[],
  node: FakeElement,
  property: string,
): SheetDeclaration | null {
  let found: SheetDeclaration | null = null
  for (const rule of rules) {
    if (!rule.selector.includes(':hover')) continue
    if (!matches(node, rule.selector.split(':hover').join(''))) continue
    found = rule.declarations.get(property) ?? found
  }
  return found
}

/**
 * What a rule set would paint on this node with NO pointer condition at all.
 *
 * ⭐ Any selector carrying a `:` is treated as conditional and left out, which
 * is the safe direction: it can only make this reading MISS a rule, never
 * invent one.
 */
function restingDeclaration(
  rules: readonly SheetRule[],
  node: FakeElement,
  property: string,
): SheetDeclaration | null {
  let found: SheetDeclaration | null = null
  for (const rule of rules) {
    if (rule.selector.includes(':')) continue
    if (!matches(node, rule.selector)) continue
    found = rule.declarations.get(property) ?? found
  }
  return found
}

/** 表 T-051 HF-6's two rules, copied from docs/spec/01-04-requirements.md:1312. */
const T_051_HF6_ONLY_WHILE_POINTED =
  '操作子は、その行の名前にポインタが乗っているあいだだけ描くこと（MUST）'
const T_051_HF6_ROOM_UNCHANGED = '描かないあいだも、確保する場所を変えてはならない（MUST NOT）'

/**
 * One way of stopping a node being drawn, and whether it leaves the room the
 * node took up alone.
 *
 * ⭐ WHY THE ROOM IS PART OF THE SAME READING. HF-6 states two rules, and the
 * second is about the first one's mechanism: 「描かないあいだも、確保する場所を
 * 変えてはならない（MUST NOT）」. FR-085 (:1274) holds the reason -- the room kept
 * for the controls (S-140) is what the row's name was cut against, so a control
 * that stopped taking up room would move the cut every time the pointer crossed
 * a row, and 表 T-076's EP-4 draws no control at all in an export.
 * ⛔ `display:none` and `content-visibility:hidden` take the box out of the
 * layout. `visibility:hidden` and `opacity:0` do not.
 * ⚠️ WHICH of the four is used is not the specification's to say, so the cases
 * below read whichever the unit declared -- and fail on one that moves the room.
 */
interface Hiding {
  readonly property: string
  /** The value that stops the node being drawn. */
  readonly hidden: string
  /** Whether the node still takes up the room it was given. */
  readonly keepsRoom: boolean
}

const HIDING_DECLARATIONS: readonly Hiding[] = [
  { property: 'visibility', hidden: 'hidden', keepsRoom: true },
  { property: 'opacity', hidden: '0', keepsRoom: true },
  { property: 'display', hidden: 'none', keepsRoom: false },
  { property: 'content-visibility', hidden: 'hidden', keepsRoom: false },
]

/** Whichever of `HIDING_DECLARATIONS` a rule set applies to this node with NO pointer condition. */
function hiddenWhileResting(rules: readonly SheetRule[], node: FakeElement): Hiding | null {
  for (const one of HIDING_DECLARATIONS) {
    const declared = restingDeclaration(rules, node, one.property)
    if (declared === null) continue
    if (declared.value.trim().toLowerCase() === one.hidden) return one
  }
  return null
}

describe('表 T-051 HF-6 / FR-098 -- the row controls are drawn only while a pointer is there', () => {
  it.each(T_109_ON_THE_ROW)(
    '⭐ GIVEN $row is drawn WHEN the rules with NO pointer condition are read THEN one of them keeps it from being drawn, and it is not one that takes its room away (表 T-051 HF-6 MUST and MUST NOT, referred to by FR-098) -- $row',
    ({ row }) => {
      const built = drawn(oneLiveRow())
      const node = entryFor(built.root(), row)
      const rules = sheetRulesOf(built.root())
      const hiding = hiddenWhileResting(rules, node)

      // ⛔ 表 T-051 HF-6 (MUST): 「操作子は、その行の名前にポインタが乗っている
      // あいだだけ描くこと」. A control that is drawn with nothing pointing at it
      // is 常に描く, which the row's own reason forbids in as many words.
      expect(
        hiding,
        `${row} is drawn with no pointer condition on any rule: ${rules.map((one) => one.selector).join(' | ')}`,
      ).not.toBeNull()
      // ⛔ And the MUST NOT of the same row, which is what decides whether the
      // rule above is admissible at all.
      expect(
        (hiding as Hiding).keepsRoom,
        `${row} is kept from being drawn with ${(hiding as Hiding).property}, which takes its room away`,
      ).toBe(true)
    },
  )

  it.each(T_109_ON_THE_ROW)(
    '⭐ GIVEN $row is drawn WHEN the sheet the unit put on the page is read THEN a rule keyed on the pointer draws it again, on the same property that hid it (表 T-051 HF-6 「乗っているあいだだけ」) -- $row',
    ({ row }) => {
      const built = drawn(oneLiveRow())
      const node = entryFor(built.root(), row)
      const rules = sheetRulesOf(built.root())
      const hiding = hiddenWhileResting(rules, node)
      expect(hiding, `${row} is never hidden, so there is nothing for a pointer to undo`).not.toBeNull()

      const pointed = hoverDeclaration(rules, node, (hiding as Hiding).property)

      // ⛔ Hidden with nothing to bring it back is half a rule, and the half
      // that is missing is the one the reader needs: the controls would never
      // be reachable at all.
      expect(
        pointed,
        `${row} has no rule keyed on a pointer: ${rules.map((one) => one.selector).join(' | ')}`,
      ).not.toBeNull()
      expect(
        (pointed as SheetDeclaration).value.trim().toLowerCase(),
        `${row} is left hidden while the pointer is there`,
      ).not.toBe((hiding as Hiding).hidden)
    },
  )

  it('⛔ GIVEN a rule that hides with display, one that never hides, and one written for somebody else WHEN each is read through the predicates above THEN none of them passes -- so the cases above are not greens that prove nothing (04-verification.md §2)', () => {
    const built = drawn(oneLiveRow())
    const node = entryFor(built.root(), 'IC-58')
    const base = '[data-unit="UF-71"] [data-role="Row Expander"]'

    // ⛔ The MUST NOT itself: a sheet that hides the control by taking its box
    // out of the layout is READ, and read as the wrong mechanism.
    const takesTheRoom = parseCss(`${base}{display:none;}${base}:hover{display:inline-block;}`)
    expect(hiddenWhileResting(takesTheRoom, node)?.keepsRoom).toBe(false)

    // ⭐ A sheet that never hides it answers `null`, which is what makes the
    // first case above fail rather than pass on a unit that draws it always.
    const never = parseCss(`${base}:hover{visibility:visible;}`)
    expect(hiddenWhileResting(never, node)).toBeNull()

    // ⭐ And a rule for somebody else reaches neither reading, which is what
    // stops them from passing on any rule of the sheet at all.
    const elsewhere = parseCss(
      '[data-role="Header Commands"] button{visibility:hidden;}' +
        '[data-role="Header Commands"] button:hover{visibility:visible;}',
    )
    expect(hiddenWhileResting(elsewhere, node)).toBeNull()
    expect(hoverDeclaration(elsewhere, node, 'visibility')).toBeNull()
  })

  it('GIVEN a PINNED row WHEN its controls are read THEN the same pair of rules reaches them, THE PIN EXCEPTED (FR-098 draws the pinned rows too)', () => {
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [
            rowTitle({
              groupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [],
        },
      }),
    )
    const rules = sheetRulesOf(built.root())

    // ⛔⛔ `IC-60` IS LEFT OUT, AND THE RULING OF 2026-08-30 IS WHY. `HF-6` now
    // carries an exception in as many words: 「⛔⛔ **ピン止めしている行の
    // `IC-60` だけは、ポインタが乗っていなくても描くこと（MUST）** —— ⛔ **本行の
    // 最初の MUST の唯一の例外である。****描かなければ、どの行が留まっているかは
    // 全行を撫でるしか読む手が無い。**」 ⇒ asserting the pin hidden here would be
    // asserting the reading that ruling replaced. ⭐ The exception has a case of
    // its own below, and the MUST NOT beside it -- 「⛔ **ほかの操作子を常時描いて
    // はならない（MUST NOT）**」 -- is what the loop here still holds.
    for (const one of T_109_ON_THE_ROW.filter((held) => held.row !== 'IC-60')) {
      const node = entryFor(built.root(), one.row)
      const hiding = hiddenWhileResting(rules, node)
      expect(hiding, `${one.row} on a pinned row is drawn with nothing pointing at it`).not.toBeNull()
      expect((hiding as Hiding).keepsRoom).toBe(true)
      expect(
        hoverDeclaration(rules, node, (hiding as Hiding).property),
        `${one.row} on a pinned row has no rule keyed on a pointer`,
      ).not.toBeNull()
    }
  })

  it('⛔⛔ MUST GIVEN a PINNED row WHEN its IC-60 is read THEN it is drawn with NO pointer on the row (表 T-051 HF-6: ピン止めしている行の IC-60 だけは、ポインタが乗っていなくても描くこと)', () => {
    // ⭐ THE RULING'S OWN REASON: 「**描かなければ、どの行が留まっているかは全行を
    // 撫でるしか読む手が無い。**」 ⚠️ 「**この例外が当たるのは留まっているあいだ
    // だけであり、外せばほかの操作子と同じに戻る。**」
    //
    // ⭐ HOW 「drawn at rest」 IS READ. The sheet may still hide every control of
    // the row -- what this case asks is whether the PIN of a PINNED row comes
    // back with nothing pointing at it, which a declaration ON THE CONTROL does
    // (an inline declaration outranks the sheet). So: either no resting rule
    // reaches it, or the control itself states the property back to a drawn
    // value.
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [
            rowTitle({
              groupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [],
        },
      }),
    )
    const rules = sheetRulesOf(built.root())
    const pin = entryFor(built.root(), 'IC-60')
    const hiding = hiddenWhileResting(rules, pin)
    const declaredBack =
      hiding === null
        ? true
        : (styleMap(pin).get(hiding.property) ?? '').trim().toLowerCase() !== '' &&
          (styleMap(pin).get(hiding.property) ?? '').trim().toLowerCase() !== hiding.hidden

    expect(
      declaredBack,
      `a pinned row's IC-60 is not drawn until a pointer arrives: the sheet hides it with ` +
        `${hiding?.property ?? '(nothing)'}:${hiding?.hidden ?? ''} and the control itself says ` +
        `${inlineStyle(pin)}`,
    ).toBe(true)
  })

  it('⛔ MUST NOT GIVEN an UNPINNED row WHEN its IC-60 is read THEN it is hidden at rest like the others (HF-6: ほかの操作子を常時描いてはならない)', () => {
    // ⭐ THE PAIR THAT MAKES THE CASE ABOVE A TEST, and a MUST NOT of its own:
    // 「**この例外が当たるのは留まっているあいだだけであり、外せばほかの操作子と
    // 同じに戻る。**」
    const built = drawn(oneLiveRow())
    const rules = sheetRulesOf(built.root())
    const pin = entryFor(built.root(), 'IC-60')
    const hiding = hiddenWhileResting(rules, pin)

    expect(hiding, 'an unpinned row draws its pin at all times').not.toBeNull()
    expect(
      (styleMap(pin).get((hiding as Hiding).property) ?? '').trim(),
      `an unpinned row's pin declares itself back into the picture: ${inlineStyle(pin)}`,
    ).toBe('')
  })

  it('GIVEN the specification is re-read WHEN HF-6 is looked up THEN the pin’s exception is still there, and still the only one (Chapter 1.9)', () => {
    const hf6 = (specTable('T-051').rows.find((one) => one.id === 'HF-6')?.cells ?? []).join(' ')

    expect(hf6).toContain(
      'ピン止めしている行の `IC-60` だけは、ポインタが乗っていなくても描くこと（MUST）',
    )
    expect(hf6).toContain('本行の最初の MUST の唯一の例外である')
    expect(hf6).toContain('ほかの操作子を常時描いてはならない（MUST NOT）')
  })

  it('GIVEN nothing has been drawn yet WHEN the sheet is read THEN no rule of it draws these controls on its own (BO-1 of 表 T-077, the empty case)', () => {
    const built = wire()

    // ⚠️ The boundary the sheet has to survive: it is put on the page once, not
    // per row, so it exists before any row does. It may say nothing about a node
    // that is not there -- but a rule with no pointer condition that BROUGHT one
    // of these back would undo HF-6 for every row at once.
    for (const rule of sheetRulesOf(built.root())) {
      if (rule.selector.includes(':')) continue
      for (const one of HIDING_DECLARATIONS) {
        const declared = rule.declarations.get(one.property)
        if (declared === undefined) continue
        expect(
          declared.value.trim().toLowerCase(),
          `${rule.selector} declares ${one.property}:${declared.value} with no pointer condition`,
        ).toBe(one.hidden)
      }
    }
  })

  it('GIVEN the specification is re-read WHEN 表 T-051 HF-6 is looked up THEN it still asks for both rules (Chapter 1.9: the case is driven by the table)', () => {
    const hf6 = specTable('T-051').rows.find((one) => one.id === 'HF-6')
    expect(hf6, '表 T-051 no longer holds HF-6').toBeDefined()
    expect(hf6?.cells.join(' ')).toContain(T_051_HF6_ONLY_WHILE_POINTED)
    expect(hf6?.cells.join(' ')).toContain(T_051_HF6_ROOM_UNCHANGED)
    expect(specText('01-04-requirements.md')).toContain(T_051_HF6_ONLY_WHILE_POINTED)
  })
})

// ===========================================================================
// 表 T-051 HF-5 -- the OTHER axis. HF-4 fixes where the controls sit across the
// row and is tested above; this is where they sit DOWN it.
//
// docs/spec/01-04-requirements.md (表 T-051, HF-5), AS THAT ROW NOW READS:
//   「行の名前の文字サイズにかかわらず、操作子を同じ大きさで描くこと（MUST）。
//    名前が操作子より大きいときは、名前の上端に揃えること（MUST）。中央で揃えて
//    はならない（MUST NOT）」
//   —— 中央にすると名前の文字サイズが変わるたびに操作子の位置が動き、`HF-4` が
//      横で禁じたことを縦で許すことになる。
//   「⛔ 上端から下げてはならない（MUST NOT）」
//   —— 名前の大きさは深さで変わるので、下げると行ごとに操作子の高さが食い違って
//      見える。
//
// ⚠️ THE ROW WAS REVERTED, AND THIS BLOCK WITH IT (利用者の裁定, 2026-08-25).
// It briefly asked for a set-down proportional to the row's name size, held by
// S-139 of 表 T-206; that row is RETIRED and `RowTitle` carries no amount any
// more. So the cases that drove an amount across IF-9 are gone -- there is no
// number left to drive -- and what stands is what HF-5 now states outright:
// nothing centres the control (MUST NOT), nothing sets it down (MUST NOT), and
// the line the controls sit in starts them at its top (MUST).
//
// ⭐ WHICH PROPERTY CARRIES A PLACEMENT IS STILL NOT ASSERTED -- PD-151 records
// the choice of CSS property as display only. What IS asserted is the forbidden
// shape and the asked-for one, because HF-5 names both: 中央 and 名前の上端.
// ===========================================================================

/** 表 T-051 HF-5's three placement rules, copied from docs/spec/01-04-requirements.md. */
const T_051_HF5_LEVEL_WITH_TOP = '名前が操作子より大きいときは、名前の上端に揃えること（MUST）'
const T_051_HF5_NOT_CENTRED = '中央で揃えてはならない（MUST NOT）'
const T_051_HF5_NOT_SET_DOWN = '上端から下げてはならない（MUST NOT）'

/** The declarations that would centre a control on the line it sits in. */
const CENTRING_PROPERTIES = [
  'align-items',
  'align-self',
  'align-content',
  'place-items',
  'place-self',
  'place-content',
  'vertical-align',
] as const

/**
 * The centring declarations this node carries, if any.
 *
 * ⭐ `vertical-align: middle` is counted, because on a control that sits in the
 * name's line it is exactly 中央 by another spelling; `middle` and `center` are
 * the two words for it. ⚠️ `text-align` is NOT counted -- it centres what is
 * INSIDE the box, which is the other axis and none of HF-5's business.
 */
function centringOn(element: FakeElement): string[] {
  const declared = styleMap(element)
  const found: string[] = []
  for (const property of CENTRING_PROPERTIES) {
    const value = (declared.get(property) ?? '').trim().toLowerCase()
    if (value === '') continue
    if (value.includes('center') || (property === 'vertical-align' && value.includes('middle'))) {
      found.push(`${property}:${value}`)
    }
  }
  // ⭐ The fourth way to centre a flex item on its line, which carries no word
  // for it at all: an auto margin on both ends of the block axis.
  const top = insetOf(element, 'margin', 'top').trim().toLowerCase()
  const bottom = insetOf(element, 'margin', 'bottom').trim().toLowerCase()
  if (top === 'auto' && bottom === 'auto') found.push('margin-top:auto;margin-bottom:auto')
  return found
}

/**
 * The declarations that would set this control DOWN from the top of the line it
 * sits in, if any -- which HF-5 now forbids (MUST NOT).
 *
 * ⚠️ A zero is not a set-down and is not reported: the row control states
 * `padding: 0 0.125em`, whose top side is a real declaration saying 「なし」.
 * ⛔ `auto` IS reported, unlike in `isZeroLength` above -- a single auto margin
 * on the block axis pushes a flex item down the line it sits in, which is the
 * very thing HF-5 forbids, while `isZeroLength` reads it as no length at all.
 */
function setDownOn(element: FakeElement): string[] {
  const pushesDown = (value: string): boolean => value !== '' && !/^0(?:[a-z%]+)?$/.test(value)
  const found: string[] = []
  for (const property of ['margin', 'padding'] as const) {
    const value = insetOf(element, property, 'top').trim().toLowerCase()
    if (pushesDown(value)) found.push(`${property}-top:${value}`)
  }
  const inset = (styleMap(element).get('top') ?? '').trim().toLowerCase()
  if (pushesDown(inset)) found.push(`top:${inset}`)
  return found
}

/** The row drawn with its two controls, for the placement cases below. */
const rowWithControls = (): ScreenView =>
  viewWith({
    rowTitlePanel: {
      pinnedTitles: [],
      titles: [
        rowTitle({
          groupId: 'g-1',
          label: 'RowOne',
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
        }),
      ],
    },
  })

describe('表 T-051 HF-5 / FR-098 -- the controls are level with the top of the name, never centred and never set down', () => {
  it('GIVEN the specification is re-read WHEN 表 T-051 HF-5 is looked up THEN it asks for the top edge and forbids both the centre and the set-down in as many words (Chapter 1.9: the case is driven by the table)', () => {
    const hf5 = specTable('T-051').rows.find((one) => one.id === 'HF-5')
    expect(hf5, '表 T-051 no longer holds HF-5').toBeDefined()
    expect(hf5?.cells.join(' ')).toContain(T_051_HF5_LEVEL_WITH_TOP)
    expect(hf5?.cells.join(' ')).toContain(T_051_HF5_NOT_CENTRED)
    expect(hf5?.cells.join(' ')).toContain(T_051_HF5_NOT_SET_DOWN)
    // ⛔ AND NO AMOUNT IS HELD ANYWHERE. S-139 of 表 T-206 carried the set-down
    // for one day and is retired -- were it ever to come back, the cases below
    // would be asserting the absence of something the specification asks for.
    expect(hf5?.cells.join(' ')).not.toContain('S-139')
    expect(specTable('T-206').rows.find((one) => one.id === 'S-139')).toBeUndefined()
    expect(specText('01-04-requirements.md')).toContain(T_051_HF5_NOT_CENTRED)
    // ⛔ FR-098 does not restate the rule; it refers the 置き方 to HF-4 .. HF-6,
    // so the pin answers to this case for the same reason the expander does.
    expect(specText('01-04-requirements.md')).toContain(FR_098_SAME_AS_THE_EXPANDER)
  })

  it.each(T_109_ON_THE_ROW)(
    '⛔ GIVEN $row is drawn WHEN the control and the line it sits in are read THEN neither centres it (表 T-051 HF-5 MUST NOT: 中央で揃えてはならない) -- $row',
    ({ row }) => {
      const built = drawn(rowWithControls())
      const control = entryFor(built.root(), row)
      const line = control.parentNode

      expect(line, `${row} is not inside anything`).not.toBeNull()
      expect(
        centringOn(control),
        `${row} centres itself on the line it sits in: ${inlineStyle(control)}`,
      ).toEqual([])
      expect(
        centringOn(line as FakeElement),
        `the row centres its controls: ${inlineStyle(line as FakeElement)}`,
      ).toEqual([])
    },
  )

  it.each(T_109_ON_THE_ROW)(
    '⛔ GIVEN $row is drawn WHEN the drawn control is read THEN it carries no top offset at all (表 T-051 HF-5 MUST NOT: 上端から下げてはならない) -- $row',
    ({ row }) => {
      const built = drawn(rowWithControls())
      const control = entryFor(built.root(), row)

      expect(
        setDownOn(control),
        `${row} is set down from the top of the name: ${inlineStyle(control)}`,
      ).toEqual([])
    },
  )

  it.each(T_109_ON_THE_ROW)(
    '⭐ GIVEN $row is drawn WHEN the line it sits in is read THEN that line starts its items at its top (表 T-051 HF-5 MUST: 名前の上端に揃えること) -- $row',
    ({ row }) => {
      // ⭐ THE POSITIVE HALF OF THE RULE. Forbidding the centre and the set-down
      // still leaves 「どこにも揃えない」 open, so one case reads the placement
      // itself: the row lays its name and its controls out in one line box, and
      // where that box starts its items IS where the controls sit against the
      // top edge of the name.
      const built = drawn(rowWithControls())
      const line = entryFor(built.root(), row).parentNode as FakeElement

      expect(line, `${row} is not inside anything`).not.toBeNull()
      expect(
        (styleMap(line).get('align-items') ?? '').trim().toLowerCase(),
        `the row does not start its controls at its top: ${inlineStyle(line)}`,
      ).toBe('flex-start')
    },
  )

  it('⛔ GIVEN a control declared `align-self:center`, one declared `vertical-align:middle`, one with auto margins on both ends and one set down by 7px WHEN each is read through the predicates above THEN all four are caught -- so the cases above are not greens that prove nothing (04-verification.md §2)', () => {
    const built = drawn(rowWithControls())

    // ⚠️ Built by hand rather than drawn: the point is the PREDICATES, and a
    // predicate that could not name a centred or a set-down control would pass
    // every case above no matter what the unit did.
    const make = (css: string): FakeElement => {
      const node = new FakeElement('button', built.world)
      node.setAttribute('style', css)
      return node
    }

    expect(centringOn(make('align-self:center'))).toEqual(['align-self:center'])
    expect(centringOn(make('vertical-align:middle'))).toEqual(['vertical-align:middle'])
    expect(centringOn(make('align-items:center'))).toEqual(['align-items:center'])
    expect(centringOn(make('margin:auto 0'))).toEqual(['margin-top:auto;margin-bottom:auto'])
    expect(setDownOn(make('margin-top:7px'))).toEqual(['margin-top:7px'])
    expect(setDownOn(make('padding:7px 0 0 0'))).toEqual(['padding-top:7px'])
    expect(setDownOn(make('position:relative;top:0.5em'))).toEqual(['top:0.5em'])
    // ⭐ And what HF-5 ALLOWS is not caught, or the cases above would be
    // unpassable rather than true.
    expect(centringOn(make('align-self:flex-start'))).toEqual([])
    expect(centringOn(make('text-align:center'))).toEqual([])
    expect(setDownOn(make('padding:0 0.125em'))).toEqual([])
    expect(setDownOn(make('margin-top:0'))).toEqual([])
  })

  it('GIVEN a PINNED row WHEN its controls are read THEN the same three rules hold there (FR-098 draws the pinned rows too) -- IC-58 / IC-59 / IC-77 / IC-60 / IC-82', () => {
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [
            rowTitle({
              groupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [],
        },
      }),
    )

    for (const one of T_109_ON_THE_ROW) {
      const control = entryFor(built.root(), one.row)
      const line = control.parentNode as FakeElement
      expect(centringOn(control), `${one.row} on a pinned row centres itself`).toEqual([])
      expect(
        setDownOn(control),
        `${one.row} on a pinned row is set down: ${inlineStyle(control)}`,
      ).toEqual([])
      expect(
        (styleMap(line).get('align-items') ?? '').trim().toLowerCase(),
        `the pinned row does not start ${one.row} at its top`,
      ).toBe('flex-start')
    }
  })
})

// ===========================================================================
// GR-20 OF 表 T-023d -- THE GRAB STRIP THE ROW DRAG IS TAKEN ON.
//
// ⭐ WHY THIS BLOCK IS HERE. 表 T-023d GR-20: 「行見出しパネルの行 | **行の左端
// に敷く掴み代**（幅は `_assets/tbl-settings.md` の 表 T-206 の `S-138`）|
// 掴めば行を動かす（表 T-051 の `HF-15`）。⛔ **ピン止めしている行は掴めない
// こと（MUST NOT）** —— `FR-098` が留めた行をパネルの先頭へ上げるので、**上げ
// られた位置で掴むと、木の順ではなく描く順を触ることになる。**⚠️ **実測で、
// 留めた行を引くと画面は 1px も動かないまま親を 2 つまたいだ**」.
//
// The side that DREW the panel is the side that knows a row was lifted (表 T-065
// IF-9, MUST), so both halves of that row are answered here: the strip is laid,
// and it is not laid on a pinned row.
//
// ⚠️ THE HARNESS CANNOT MEASURE A PIXEL -- the note above `intrinsicExtent`
// says why, and it applies unchanged here: `laidOut` answers from `LAYOUT`,
// which is keyed by `data-icon` and `data-role`, and 表 T-109 holds no row for a
// grab strip so it can carry neither. ⭐ WHAT IS CHECKED INSTEAD is the
// declaration a browser would read to get the pixel, exactly as the IC-58 block
// does.
//
// ⛔ THE STRIP IS FOUND BY WHAT THE MANUSCRIPT SAYS IT IS, NOT BY AN ATTRIBUTE
// NAME. GR-20 gives it two properties and no others: it is `S-138` wide and it
// lies along the row's LEFT edge. `stripsOf` below looks for exactly that, so a
// build that marked it differently still passes and a build that laid no strip
// still fails. ⚠️ Entries are excluded first, because `S-138` is also 「入口の
// 図形を描く箱の一辺」 -- the same number -- and a control that took it would
// otherwise be read as a strip.
//
// ⛔ WHAT IS NOT ASSERTED: how the strip is PAINTED. GR-20 gives it no ink, and
// 表 T-026's RC-13 makes a new figure the user's ruling.
// ===========================================================================

/** 表 T-206 `S-138` -- the width GR-20 lays the strip at. Read, never copied. */
const S_138_STRIP_WIDTH = (() => {
  const row = specTable('T-206').rows.find((one) => one.id === 'S-138')
  if (row === undefined) throw new Error('表 T-206 no longer holds S-138')
  const found = /\d+(?:\.\d+)?/.exec(row.by['既定'] ?? '')
  if (found === null) throw new Error('S-138 states no number in its 既定 column')
  return Number(found[0])
})()

/**
 * The width this node fixes for itself, in px, or `null` where nothing does.
 *
 * ⭐ THE CSS BOX MODEL AND NOT AN OPINION OF THIS FILE'S: a box has a fixed
 * extent on an axis when `width`, `min-width` or its `flex-basis` gives it one.
 */
function fixedWidthPx(element: FakeElement): number | null {
  const declared = styleMap(element)
  const candidates = [
    declared.get('width'),
    declared.get('min-width'),
    flexBasisOf(element),
    declared.get('flex-basis'),
  ]
  for (const one of candidates) {
    const found = /^(\d+(?:\.\d+)?)px$/i.exec((one ?? '').trim())
    if (found !== null) return Number(found[1])
  }
  return null
}

/**
 * The children of a row that answer GR-20's description: `S-138` wide, and
 * carrying no entry of 表 T-109.
 */
const stripsOf = (row: FakeElement): FakeElement[] =>
  row.children.filter(
    (one) => !one.hasAttribute('data-icon') && fixedWidthPx(one) === S_138_STRIP_WIDTH,
  )

/** One ordinary row and one pinned row, drawn in the same panel. */
const PANEL_WITH_A_PIN = (): ScreenView =>
  viewWith({
    rowTitlePanel: {
      pinnedTitles: [
        rowTitle({
          groupId: 'g-pinned',
          isPinned: true,
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
        }),
      ],
      titles: [
        rowTitle({
          groupId: 'g-free',
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
        }),
      ],
    },
  })

const rowWithGroupId = (built: Stage, groupId: string): FakeElement => {
  const found = rowsOf(built).find((one) => one.getAttribute('data-group-id') === groupId)
  if (found === undefined) throw new Error(`the panel drew no row ${groupId}`)
  return found
}

describe('GR-20 of 表 T-023d -- 行の左端に敷く掴み代（幅は S-138）', () => {
  it.each(DEPTHS)(
    '⭐ GIVEN an ordinary row at depth %i WHEN it is read THEN it carries ONE strip of S-138 and that strip is the FIRST thing in the row (GR-20 「行の左端に敷く掴み代」)',
    (depth) => {
      const built = drawn(rowNamed('RowOne', depth))
      const row = theRowOf(built)
      const strips = stripsOf(row)

      expect(
        strips.length,
        `GR-20's strip is not on the row, or there is more than one of it: ${serialize(row)}`,
      ).toBe(1)
      // 「行の左端に敷く」 -- the LEFT edge of the row, so nothing of the row
      // stands before it. ⚠️ The depth cases are here because FR-085 indents a
      // deep row: an indent that pushed the strip in would put the grab
      // somewhere different on every row, which is the complaint HF-4 was
      // written about one axis over.
      expect(
        row.children.indexOf(strips[0] as FakeElement),
        `the strip does not lie along the row's left edge: ${serialize(row)}`,
      ).toBe(0)
    },
  )

  it('⭐ GIVEN a row drawn at depth 1 and the same row at the deepest S-125 allows WHEN the two strips are compared THEN not one declaration differs (GR-20 gives the strip one width and no other)', () => {
    const shallow = drawn(rowNamed('RowOne', 1))
    const deep = drawn(rowNamed('RowOne', DEPTHS[DEPTHS.length - 1] ?? 1))

    const one = stripsOf(theRowOf(shallow))[0]
    const other = stripsOf(theRowOf(deep))[0]
    expect(one, 'the shallow row has no strip').toBeDefined()
    expect(other, 'the deep row has no strip').toBeDefined()
    expect(
      differingProperties(one as FakeElement, other as FakeElement),
      'the depth reached the grab strip',
    ).toEqual([])
  })

  it('⛔ MUST NOT GIVEN a PINNED row WHEN it is read THEN it carries NO strip at all (GR-20: ピン止めしている行は掴めないこと)', () => {
    // ⚠️ 「実測で、留めた行を引くと画面は 1px も動かないまま親を 2 つまたいだ」.
    const built = drawn(PANEL_WITH_A_PIN())

    expect(
      stripsOf(rowWithGroupId(built, 'g-free')).length,
      'the premise fails: the ordinary row beside the pinned one has no strip either',
    ).toBe(1)
    expect(
      stripsOf(rowWithGroupId(built, 'g-pinned')).length,
      `a pinned row was given a grab strip: ${serialize(rowWithGroupId(built, 'g-pinned'))}`,
    ).toBe(0)
  })

  it('GIVEN the specification is re-read WHEN GR-20 is looked up THEN it still lays the strip on the left edge at S-138 and still refuses a pinned row (Chapter 1.9)', () => {
    const gr20 = specTable('T-023d').rows.find((one) => one.id === 'GR-20')
    expect(gr20, '表 T-023d no longer holds GR-20').toBeDefined()
    const says = (gr20?.cells ?? []).join(' ')
    expect(says).toContain('行の左端に敷く掴み代')
    expect(says).toContain('`S-138`')
    expect(says).toContain('ピン止めしている行は掴めないこと（MUST NOT）')
    expect(says).toContain('掴めば行を動かす')
    expect(S_138_STRIP_WIDTH, 'S-138 no longer states a width').toBeGreaterThan(0)
  })
})

// ===========================================================================
// THE ORDER THE CONTROLS STAND IN -- 表 T-051 の `HF-1`, `HF-4` AND `HF-10`.
//
// ⭐⭐ WHY THIS BLOCK EXISTS AT ALL. Until 2026-08-30 the manuscript declined to
// fix the order: `HF-4` said 「⚠️ **本行が定めるのはこの 1 つだけであり、ほかの
// 操作子の前後は定めない**」 and the blocks above say so in as many words. Three
// rulings on that day settled every place:
//   `HF-1`  ⭐⭐ 「**並びは 2 × 2 の格子とすること（MUST）** —— **左から 隠す・
//           1 階層開く・配下をすべて畳む・配下をすべて開く**」, with ⛔ 「**1 本と
//           2 本を混ぜて並べてはならない（MUST NOT）** —— **上下に読めば動作、
//           左右に読めば範囲、という格子が崩れる**」
//   `HF-4`  ⭐⭐ 「**折り畳みの 4 つ（`HF-1` の格子）、足す、消す、ピン止めの順に、
//           左から右へ置くこと（MUST）**」, with ⛔ 「**足すと消すのあいだに他の
//           操作子を挟んではならない（MUST NOT）**」 and 「**ピン止めの操作子
//           （表 T-109 の `IC-60`）を、並びのいちばん外（右端）に置くこと（MUST）**」
//   `HF-10` ⭐⭐ 「**頭の並びは、左から 1 階層開く・すべて畳む・すべて開く・足すの
//           順とすること（MUST）**」
//
// ⛔ WHAT IS READ, AND WHY IT IS NOT THE CHILD ORDER. Nothing in docs/spec fixes
// how a row is built, and a control placed out of flow sits where its own inset
// puts it whatever its place among the siblings. So `leftToRight` below ranks by
// the inset the unit declared -- `left` ascending, or `right` descending -- and
// falls back to document order only when NO control declares either, which is
// the in-flow line where document order IS left to right. ⚠️ A run placed two
// ways at once is ranked by neither and fails loudly rather than quietly.
// ===========================================================================

/** The number and unit a length declaration states, or `null` for anything else. */
function lengthOf(value: string | undefined): { readonly n: number; readonly unit: string } | null {
  const found = /^(-?\d+(?:\.\d+)?)(px|em|rem)$/.exec((value ?? '').trim())
  return found === null ? null : { n: Number(found[1]), unit: found[2] as string }
}

const iconOf = (node: FakeElement): string => node.getAttribute('data-icon') ?? '(unmarked)'

/**
 * The rows of 表 T-109 these nodes carry, in the order a reader meets them from
 * the LEFT.
 */
function leftToRight(nodes: readonly FakeElement[]): string[] {
  const how = new Set<string>()
  const ranked = nodes.map((node, index) => {
    const declared = styleMap(node)
    const left = lengthOf(declared.get('left'))
    const right = lengthOf(declared.get('right'))
    if (left !== null) {
      how.add(`left:${left.unit}`)
      return { icon: iconOf(node), key: left.n, index }
    }
    if (right !== null) {
      how.add(`right:${right.unit}`)
      return { icon: iconOf(node), key: -right.n, index }
    }
    how.add('in flow')
    return { icon: iconOf(node), key: 0, index }
  })
  if (how.size > 1) {
    throw new Error(
      `these controls are placed in ${how.size} different ways (${[...how].join(', ')}), ` +
        'so no reading of them says which stands to the left of which',
    )
  }
  return ranked
    .slice()
    .sort((a, b) => a.key - b.key || a.index - b.index)
    .map((one) => one.icon)
}

/** `HF-1`'s four, left to right, as rows of 表 T-109. */
const HF1_LEFT_TO_RIGHT = T_051_HF1_LATTICE.map((one) => entranceForRule(one.rule))

/**
 * `HF-4`'s whole run, left to right, as rows of 表 T-109.
 *
 * ⚠️ 足す IS FOUND THROUGH ITS RULE and 消す / ピン止め through the rows `HF-4`
 * NAMES ITSELF -- that row writes 「削除（`IC-82`）」 and 「ピン止めの操作子（表
 * T-109 の `IC-60`）」 in as many words, so the two ids are the manuscript's own
 * and the premise case below holds them to it.
 */
const HF4_LEFT_TO_RIGHT = [...HF1_LEFT_TO_RIGHT, entranceForRule('HF-14'), 'IC-82', 'IC-60']

/** `HF-10`'s head run, left to right: 1 階層開く・すべて畳む・すべて開く・足す. */
const HF10_LEFT_TO_RIGHT = [
  entranceForRule('HF-16'),
  entranceForRule('HF-12'),
  entranceForRule('HF-10'),
  entranceForRule('HF-17'),
]

/** Every node on the page carrying one of these rows of 表 T-109. */
const nodesFor = (built: Stage, rows: readonly string[]): FakeElement[] =>
  selfAndDescendants(built.root()).filter((one) => rows.includes(iconOf(one)))


describe('表 T-051 HF-1 (MUST) -- the four folding controls, left to right in a 2 x 2 lattice', () => {
  it('GIVEN the specification is re-read WHEN HF-1 is looked up THEN it still names four controls, still calls the arrangement a lattice, and still orders them (Chapter 1.9)', () => {
    const hf1 = specTable('T-051').rows.find((one) => one.id === 'HF-1')
    expect(hf1, '表 T-051 no longer holds HF-1').toBeDefined()
    const says = (hf1?.cells ?? []).join(' ')

    expect(says).toContain(T_051_HF1_FOUR_CONTROLS)
    expect(says).toContain(T_051_HF1_IS_A_LATTICE)
    expect(says).toContain(T_051_HF1_LEFT_TO_RIGHT)
    // ⛔ THE MUST NOT THAT MAKES THE LATTICE A LATTICE.
    expect(says).toContain('1 本と 2 本を混ぜて並べてはならない（MUST NOT）')

    // ⭐ AND THE ORDER THIS FILE DRIVES BY IS THAT SENTENCE'S OWN. Each word of
    // it is looked for after the one before, so a manuscript that re-ordered the
    // lattice fails here instead of leaving the case below asserting the old one.
    let at = says.indexOf(T_051_HF1_LEFT_TO_RIGHT)
    expect(at, 'HF-1 no longer states the left-to-right order').toBeGreaterThanOrEqual(0)
    for (const one of T_051_HF1_LATTICE) {
      const next = says.indexOf(one.word, at)
      expect(next, `HF-1 no longer names 「${one.word}」 where this file expects it`).toBeGreaterThan(
        -1,
      )
      at = next + one.word.length
    }
    // ⭐ FOUR ENTRANCES FOR FOUR CONTROLS, none of them the same row twice.
    expect(new Set(HF1_LEFT_TO_RIGHT).size).toBe(4)
  })

  it('⭐ GIVEN a row is drawn WHEN its four folding controls are read from the left THEN they stand in HF-1’s order (MUST: 左から 隠す・1 階層開く・配下をすべて畳む・配下をすべて開く)', () => {
    const built = drawn(oneLiveRow())

    expect(leftToRight(nodesFor(built, HF1_LEFT_TO_RIGHT))).toEqual(HF1_LEFT_TO_RIGHT)
  })

  it('⛔ MUST NOT GIVEN a row is drawn WHEN the whole run is read THEN the single bars stand together and the double bars stand together (HF-1: 1 本と 2 本を混ぜて並べてはならない)', () => {
    // 「上下に読めば動作、左右に読めば範囲」 -- 隠す and 1 階層開く are the single
    // bars (表 T-026 の `RC-13`: 向きが動作、本数が範囲) and 配下をすべて畳む /
    // 配下をすべて開く the double ones. A lattice is broken exactly when one
    // column's pair is split by the other's.
    const built = drawn(oneLiveRow())
    const run = leftToRight(controlsOf(theRowOf(built)))

    const singles = [entranceForRule('HF-3'), entranceForRule('HF-13')]
    const doubles = [entranceForRule('HF-11'), entranceForRule('HF-2')]
    for (const [what, pair] of [
      ['the single bars', singles],
      ['the double bars', doubles],
    ] as const) {
      const places = pair.map((row) => run.indexOf(row))
      expect(places, `${what} are not both on the row: ${run.join(' ')}`).not.toContain(-1)
      expect(
        Math.abs((places[0] as number) - (places[1] as number)),
        `${what} are not next to each other: ${run.join(' ')}`,
      ).toBe(1)
    }
  })

  it('⛔ GIVEN a run built by hand in the WRONG order WHEN it is read through `leftToRight` THEN the reading catches it -- so the cases above are not greens that prove nothing (04-verification.md §2)', () => {
    const built = drawn(oneLiveRow())
    const make = (icon: string, css: string): FakeElement => {
      const node = new FakeElement('button', built.world)
      node.setAttribute('data-icon', icon)
      node.setAttribute('style', css)
      return node
    }

    // Right-anchored: the LARGER inset is further left.
    expect(leftToRight([make('IC-58', 'right:0em'), make('IC-59', 'right:4em')])).toEqual([
      'IC-59',
      'IC-58',
    ])
    // Left-anchored: the smaller inset is further left.
    expect(leftToRight([make('IC-58', 'left:4em'), make('IC-59', 'left:0em')])).toEqual([
      'IC-59',
      'IC-58',
    ])
    // In flow: document order, and the order handed in is the document's.
    expect(leftToRight([make('IC-58', ''), make('IC-59', '')])).toEqual(['IC-58', 'IC-59'])
    // ⛔ And a run placed two ways at once is refused rather than ranked.
    expect(() => leftToRight([make('IC-58', 'left:0em'), make('IC-59', 'right:0em')])).toThrow()
  })
})

describe('表 T-051 HF-4 (MUST) -- the whole run of a row, left to right', () => {
  it('GIVEN the specification is re-read WHEN HF-4 is looked up THEN it still states the run, still names IC-82 and IC-60, and still forbids anything between 足す and 消す (Chapter 1.9)', () => {
    const hf4 = specTable('T-051').rows.find((one) => one.id === 'HF-4')
    const says = (hf4?.cells ?? []).join(' ')

    expect(says).toContain(T_051_HF4_THE_WHOLE_RUN)
    expect(says).toContain('足すと消すのあいだに他の操作子を挟んではならない（MUST NOT）')
    expect(says).toContain(
      'ピン止めの操作子（表 T-109 の `IC-60`）を、並びのいちばん外（右端）に置くこと（MUST）',
    )

    // ⛔ AND THE RUN IS THE WHOLE ROSTER, so nothing on the row is left unplaced.
    expect([...HF4_LEFT_TO_RIGHT].sort()).toEqual([...T_109_ON_THE_ROW.map((one) => one.row)].sort())
  })

  it('⭐ GIVEN a row is drawn WHEN every control on it is read from the left THEN the seven stand in HF-4’s order (MUST: 折り畳みの 4 つ、足す、消す、ピン止めの順に、左から右へ)', () => {
    const built = drawn(oneLiveRow())

    expect(leftToRight(controlsOf(theRowOf(built)))).toEqual(HF4_LEFT_TO_RIGHT)
  })

  it('⭐ GIVEN a PINNED row WHEN its controls are read from the left THEN the same run stands there (FR-098 draws the pinned rows too)', () => {
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [
            rowTitle({
              groupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [],
        },
      }),
    )

    expect(leftToRight(controlsOf(theRowOf(built)))).toEqual(HF4_LEFT_TO_RIGHT)
  })

  it('⭐ MUST GIVEN a row is drawn WHEN the outermost control is read THEN it is the pin, and the deletion is the one step inside it (HF-4: ピン止めを並びのいちばん外へ)', () => {
    // ⛔ THE TWO REASONS ARE HF-4's OWN: 「**削除（`IC-82`）がいちばん外に在ると、
    // 右から流し込んだポインタが最初に触るのが削除になる**」 and 「**押す頻度は
    // ピンのほうが高く、削除は一度きりである**」.
    const run = leftToRight(controlsOf(theRowOf(drawn(oneLiveRow()))))

    expect(run[run.length - 1], `the outermost control is not the pin: ${run.join(' ')}`).toBe(
      'IC-60',
    )
    expect(run[run.length - 2], `the deletion is not one step in: ${run.join(' ')}`).toBe('IC-82')
  })

  it('⛔ MUST NOT GIVEN a row is drawn WHEN 足す and 消す are found in the run THEN they are next to each other (HF-4: 枠つきの ＋ と × は対として読ませるもの)', () => {
    const run = leftToRight(controlsOf(theRowOf(drawn(oneLiveRow()))))
    const add = run.indexOf(entranceForRule('HF-14'))
    const remove = run.indexOf('IC-82')

    expect(add, `足す is not on the row: ${run.join(' ')}`).toBeGreaterThanOrEqual(0)
    expect(remove, `消す is not on the row: ${run.join(' ')}`).toBeGreaterThanOrEqual(0)
    expect(remove - add, `something stands between 足す and 消す: ${run.join(' ')}`).toBe(1)
  })
})

describe('表 T-051 HF-10 (MUST) -- the run at the panel’s head, left to right', () => {
  it('GIVEN the specification is re-read WHEN HF-10 is looked up THEN it still states the head run and still refuses the outermost place to すべて開く (Chapter 1.9)', () => {
    const hf10 = (specTable('T-051').rows.find((one) => one.id === 'HF-10')?.cells ?? []).join(' ')

    expect(hf10).toContain(T_051_HF10_THE_HEAD_RUN)
    // ⛔ THE OUTERMOST OF THE HEAD IS NOT 「すべて開く」, which that row says
    // itself: 「**本行の「すべて開く」を並びのいちばん外へ置いてはならない
    // （MUST NOT）** —— **頭も行も、折り畳みの外に立つのは行を増やす入口である**」.
    expect(hf10).toContain('本行の「すべて開く」を並びのいちばん外へ置いてはならない（MUST NOT）')

    expect([...HF10_LEFT_TO_RIGHT].sort()).toEqual(
      [...T_109_AT_THE_HEAD.map((one) => one.row)].sort(),
    )
    // ⭐ AND NOT ONE OF THEM IS ALSO A ROW CONTROL.
    for (const row of HF10_LEFT_TO_RIGHT) {
      expect(
        T_109_ON_THE_ROW.map((one) => one.row),
        `${row} is on a row as well`,
      ).not.toContain(row)
    }
  })

  it('⭐ GIVEN the panel is drawn WHEN the head’s controls are read from the left THEN they stand in HF-10’s order (MUST: 1 階層開く・すべて畳む・すべて開く・足す)', () => {
    const built = drawn(oneLiveRow())

    expect(leftToRight(nodesFor(built, HF10_LEFT_TO_RIGHT))).toEqual(HF10_LEFT_TO_RIGHT)
  })

  it('⭐ GIVEN a panel of TWO rows WHEN the head’s controls are counted THEN each is drawn ONCE for the whole panel, not once per row (HF-10 / HF-12 / HF-16 / HF-17: 1 つ置くこと)', () => {
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [
            rowTitle({
              groupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [
            rowTitle({
              groupId: 'g-1',
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    for (const one of T_109_AT_THE_HEAD) {
      expect(
        nodesFor(built, [one.row]).length,
        `${one.row} was drawn more than once for the panel`,
      ).toBe(1)
    }
    // ⭐ The pair that makes the count a test: a ROW control IS drawn twice here.
    expect(nodesFor(built, [entranceForRule('HF-3')]).length).toBe(2)
  })

  it('⭐⭐ GIVEN a panel with NO rows at all WHEN the head is read THEN all four are still drawn (HF-17: 行が 1 つも無い文書では押す相手が存在しない)', () => {
    // ⛔ WITHOUT THIS, `HF-17`'s own reason is unreachable: 「**本行が無いと、最も
    // 浅い段の行を作る道が画面から消える** —— `FR-085` は最上位の行を作れることを
    // 求めており、`HR-8` は足す先を配下と定めるので、**行が 1 つも無い文書では押す
    // 相手が存在しない**」. A head drawn only beside a row would leave an empty
    // document with no way to gain one.
    const built = drawn(viewWith({ rowTitlePanel: { pinnedTitles: [], titles: [] } }))

    expect(rowsOf(built)).toEqual([])
    for (const one of T_109_AT_THE_HEAD) {
      expect(nodesFor(built, [one.row]).length, `${one.row} left with the last row`).toBe(1)
    }
    expect(leftToRight(nodesFor(built, HF10_LEFT_TO_RIGHT))).toEqual(HF10_LEFT_TO_RIGHT)
  })
})

// ===========================================================================
// 表 T-051 HF-15 AND HF-18 -- WHAT IS DRAWN THAT IS NOT AN ENTRANCE.
//
// ⭐ THREE MUSTS OF `HF-15` REACH THIS UNIT, and all three are about drawing:
//   ⭐⭐ 「**いまどちらの軸が生きているかを、掴んでいる行に描くこと（MUST）** ——
//      **上下の軸が生きているときは行の左右の辺に、左右の軸が生きているときは行の
//      上下の辺に、帯を 1 本ずつ描くこと（MUST）。**⭐ **色は 表 T-236 の `S-151`
//      （上下）と `S-152`（左右）とする。**」
//   ⭐ 「**掴んでいる行には地を敷くこと（MUST）** —— **どれを持っているかが読め
//      なくなる。**」
//   ⭐ 「**掴み代は常に描くこと（MUST）** —— ⛔ **`HF-6`（操作子はポインタが乗って
//      いるあいだだけ）の対象ではない** —— **掴めることが読めなければ、掴もうと
//      する手が動かない。**」
// ⭐ AND ONE OF `HF-18`: 「**配下に畳み込んでいる行があるとき、その行数を行に示す
//   こと（MUST）**」, with ⛔ 「**`HF-6` の対象ではない** —— **ポインタが乗って
//   いるあいだだけでは、抱えている行を探して回ることになる**」.
//
// ⚠️ WHAT IS NOT ASSERTED. The BAND'S THICKNESS: no row of 表 T-206 states one,
// and `HF-15` asks only for 「帯を 1 本ずつ」. The GROUND'S COLOUR under the held
// row: `HF-15` (MUST) asks for a ground and names no colour, and no row of
// 表 T-236 does either -- ⛔ so a case that fixed one would be inventing it. What
// IS read is which EDGES carry a band, which is the half the manuscript states.
// ===========================================================================

/** The two colours 表 T-236 gives HF-15's bands, read out of the table. */
const themeColoursOf = (row: string): readonly string[] => {
  const found = specTable('T-236').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`表 T-236 no longer holds ${row}`)
  return ['明るいテーマ', '暗いテーマ'].map((column) => bare(found.by[column] ?? ''))
}

/** The border declarations this node states, by the edge each one is on. */
function bordersOf(element: FakeElement): Map<string, string> {
  const declared = styleMap(element)
  const found = new Map<string, string>()
  for (const edge of ['top', 'right', 'bottom', 'left']) {
    const value = (declared.get(`border-${edge}`) ?? '').trim()
    if (value !== '' && !/(^|\s)(0|none)(\s|$)/.test(value)) found.set(edge, value)
  }
  return found
}

/** One row, drawn as the one HF-15's grab is holding on the given axis. */
const rowHeldOn = (axis: 'position' | 'depth' | null): ScreenView =>
  viewWith({
    rowTitlePanel: {
      pinnedTitles: [],
      titles: [
        rowTitle({
          groupId: 'g-1',
          label: 'RowOne',
          heldOnAxis: axis,
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
        }),
      ],
    },
  })

describe('表 T-051 HF-15 (MUST) -- the row that is held says which axis is live', () => {
  it('GIVEN the specification is re-read WHEN HF-15 is looked up THEN it still asks for the bands, the ground and the always-drawn strip (Chapter 1.9)', () => {
    const hf15 = (specTable('T-051').rows.find((one) => one.id === 'HF-15')?.cells ?? []).join(' ')

    expect(hf15).toContain(T_051_HF15_THE_AXIS_MARK)
    expect(hf15).toContain(T_051_HF15_THE_BANDS)
    expect(hf15).toContain(T_051_HF15_THE_GROUND)
    expect(hf15).toContain(T_051_HF15_THE_STRIP_IS_ALWAYS_DRAWN)
    // ⭐ The two colours are named by row, and 表 T-236 still holds both.
    expect(hf15).toContain('`S-151`（上下）と `S-152`（左右）')
    for (const row of ['S-151', 'S-152']) {
      expect(themeColoursOf(row).filter((one) => one !== ''), `表 T-236 ${row}`).toHaveLength(2)
    }
  })

  it('⭐ MUST GIVEN the position axis is live WHEN the held row is read THEN a band lies on its LEFT and RIGHT edges and on neither other (HF-15: 上下の軸が生きているときは行の左右の辺に)', () => {
    // ⛔ CROSSWISE IS WHAT THE ROW SAYS: a grab that moves the row UP AND DOWN
    // is marked on the left and right edges.
    const row = theRowOf(drawn(rowHeldOn('position')))

    expect([...bordersOf(row).keys()].sort(), `the held row's edges: ${inlineStyle(row)}`).toEqual([
      'left',
      'right',
    ])
  })

  it('⭐ MUST GIVEN the depth axis is live WHEN the held row is read THEN a band lies on its TOP and BOTTOM edges and on neither other (HF-15: 左右の軸が生きているときは行の上下の辺に)', () => {
    const row = theRowOf(drawn(rowHeldOn('depth')))

    expect([...bordersOf(row).keys()].sort(), `the held row's edges: ${inlineStyle(row)}`).toEqual([
      'bottom',
      'top',
    ])
  })

  it('⭐ GIVEN the two axes WHEN the bands are compared THEN they are NOT painted alike (HF-15: 色は S-151（上下）と S-152（左右）)', () => {
    // ⚠️ WHICH INK IS WHICH IS NOT READ HERE -- 表 T-236 states each colour twice
    // (one per theme) and this unit resolves the theme, so a case that fixed the
    // string would be asserting the theme and not the rule. ⛔ What the rule
    // decides, and what is read, is that the two axes are told APART by colour:
    // one row, two colours, and 「どちらの軸が生きているか」 unreadable if they
    // were the same.
    const onPosition = [...bordersOf(theRowOf(drawn(rowHeldOn('position')))).values()]
    const onDepth = [...bordersOf(theRowOf(drawn(rowHeldOn('depth')))).values()]

    expect(onPosition, 'the position axis drew no band').not.toHaveLength(0)
    expect(onDepth, 'the depth axis drew no band').not.toHaveLength(0)
    expect(new Set(onPosition).size, 'the two bands of one axis differ').toBe(1)
    expect(new Set(onDepth).size, 'the two bands of one axis differ').toBe(1)
    expect(onPosition[0], 'the two axes are drawn in one and the same colour').not.toBe(onDepth[0])
  })

  it('⭐ MUST GIVEN a row is held WHEN it is compared with the same row unheld THEN it is given a ground of its own (HF-15: 掴んでいる行には地を敷くこと)', () => {
    const held = theRowOf(drawn(rowHeldOn('position')))
    const free = theRowOf(drawn(rowHeldOn(null)))

    const groundOf = (row: FakeElement): string =>
      (styleMap(row).get('background') ?? styleMap(row).get('background-color') ?? '').trim()

    expect(groundOf(held), `the held row has no ground: ${inlineStyle(held)}`).not.toBe('')
    expect(groundOf(held), 'the held row is painted like every other row').not.toBe(groundOf(free))
  })

  it('⛔ GIVEN NO row is held WHEN the row is read THEN it carries neither band nor axis mark (HF-15: the mark says WHICH row is held)', () => {
    const row = theRowOf(drawn(rowHeldOn(null)))

    expect([...bordersOf(row).keys()], `an unheld row carries a band: ${inlineStyle(row)}`).toEqual(
      [],
    )
  })

  it('⭐⭐ MUST GIVEN the panel is drawn with nothing held WHEN GR-20’s strip is read THEN NO resting rule hides it, though the row controls beside it are hidden (HF-15: 掴み代は常に描くこと、HF-6 の対象ではない)', () => {
    const built = drawn(oneLiveRow())
    const rules = sheetRulesOf(built.root())
    const strip = stripsOf(theRowOf(built))[0]

    expect(strip, 'GR-20 laid no strip, so there is nothing to ask about').toBeDefined()
    // ⭐ THE PAIR THAT MAKES THIS A TEST: a control IS hidden while resting, so a
    // sheet that hid nothing at all would pass the line below without meaning it.
    expect(
      hiddenWhileResting(rules, entryFor(built.root(), entranceForRule('HF-3'))),
      'no control is hidden while resting, so this case proves nothing',
    ).not.toBeNull()
    expect(
      hiddenWhileResting(rules, strip as FakeElement),
      `the grab strip is hidden until a pointer arrives: ${inlineStyle(strip as FakeElement)}`,
    ).toBeNull()
  })
})

/**
 * The marks a row carries that show nothing but a number.
 *
 * ⛔ FOUND BY WHAT THE MANUSCRIPT SAYS IT IS, not by an attribute name: `HF-18`
 * (MUST) asks for 「その行数を行に示すこと」 and 「その行自身にも印を付けること」,
 * and neither 表 T-103 nor 表 T-109 gives the mark a part or an entrance to be
 * named by. ⭐ A LEAF whose whole text is a number is the one reading of that
 * which a build cannot pass by accident -- a row's name is not a bare number.
 */
const numberMarksOf = (row: FakeElement): string[] =>
  descendants(row)
    .filter((one) => one.children.length === 0 && /^\d+$/.test(one.textContent.trim()))
    .map((one) => one.textContent.trim())

describe('表 T-051 HF-18 (MUST) -- the count of what a row holds folded is drawn, and not only under a pointer', () => {
  it('GIVEN the specification is re-read WHEN HF-18 is looked up THEN it still asks for the count, the mark and the colour, and still says HF-6 does not reach it (Chapter 1.9)', () => {
    const hf18 = (specTable('T-051').rows.find((one) => one.id === 'HF-18')?.cells ?? []).join(' ')

    expect(hf18).toContain(T_051_HF18_THE_COUNT)
    expect(hf18).toContain('その行自身にも印を付けること（MUST）')
    expect(hf18).toContain('色は 表 T-236 の `S-153` とする')
    expect(hf18).toContain('`HF-6` の対象ではない')
    expect(themeColoursOf('S-153').filter((one) => one !== ''), '表 T-236 S-153').toHaveLength(2)
  })

  it('⭐ MUST GIVEN a row that holds three rows folded WHEN it is read THEN the count is drawn on it (HF-18: その行数を行に示すこと)', () => {
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [],
          titles: [
            rowTitle({
              groupId: 'g-1',
              label: 'RowOne',
              foldedRowCount: 3,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    expect(
      numberMarksOf(theRowOf(built)),
      `the row does not show what it holds folded: ${serialize(theRowOf(built))}`,
    ).toEqual(['3'])
  })

  it('⛔ GIVEN a row that holds NOTHING folded WHEN it is read THEN no count is drawn (HF-18 shows one 「配下に畳み込んでいる行があるとき」)', () => {
    const built = drawn(oneLiveRow())

    expect(
      numberMarksOf(theRowOf(built)),
      'a row with nothing folded was given a count',
    ).toEqual([])
  })

  it('⭐⭐ MUST GIVEN the count is drawn WHEN the sheet is read THEN no resting rule hides it (HF-18: HF-6 の対象ではない)', () => {
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [],
          titles: [
            rowTitle({
              groupId: 'g-1',
              label: 'RowOne',
              foldedRowCount: 7,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )
    const row = theRowOf(built)
    expect(numberMarksOf(row), 'the count was not drawn, so there is nothing to ask about').toEqual([
      '7',
    ])
    const mark = descendants(row).find(
      (one) => one.children.length === 0 && one.textContent.trim() === '7',
    )
    expect(
      hiddenWhileResting(sheetRulesOf(built.root()), mark as FakeElement),
      'the count is drawn only while a pointer is on the row -- 抱えている行を探して回ることになる',
    ).toBeNull()
  })
})
