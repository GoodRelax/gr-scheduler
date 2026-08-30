// The two marks a row carries in the `Row Title Panel`: the count HF-18 of
// 表 T-051 asks for when a row is holding rows folded away, and the grab strip
// GR-20 of 表 T-023d lays for HF-15's drag.
//
// Unit under test: UF-71 of 表 T-075 (`dom-screen-surface.ts`, component CP-38
// of 表 T-062). It is the side of IF-9 that turns a `ScreenView` into nodes, so
// it is the side that decides what a mark is DRAWN as -- UF-63
// (`row-title-panel.ts`) carries the numbers and the flags and no shape at all.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔⛔ WHY THIS FILE EXISTS -- FIVE HOLES, ALL FOUND BY LOOKING AT THE BUILD
// ---------------------------------------------------------------------------
//
// The user read the shipping build on 2026-08-30 and found five things wrong
// with these two marks. ⛔ NOT ONE OF THE 5346 CASES THEN STANDING WENT RED FOR
// ANY OF THEM, because none of the five had a sentence in the manuscript yet and
// the implementation was free to invent all five. Each is now a MUST or a MUST
// NOT, and each has a case below:
//
//   1. THE COUNT WAS A FILLED PILL. 「⭐ **数は行の名前の隣に語として置くこと
//      （MUST）**…⛔ **地を塗った札にしてはならない（MUST NOT）** —— **行の名前より
//      目立つと、何の行かを読む前に数が目に入る。**」
//   2. THE ROW ITSELF CARRIED NO MARK. 「⭐ **その行自身にも印を付けること（MUST）。
//      印は行の左の辺に帯を 1 本引くこと（MUST）** —— **数だけでは、どの行が抱えて
//      いるかを目で追うのに読む必要がある。**⭐ **色は 表 T-236 の `S-153` とする**
//      —— **注意であって不良ではない。**」
//   3. THE GRAB STRIP WAS A SOLID SLAB. 「⭐⭐ **掴み代は、掴めることを表す小さな印
//      として描くこと（MUST）**…⛔ **帯の地を塗ってはならない（MUST NOT）** ——
//      **行の高さいっぱいに地を塗ると、日程より掴み代が目立つ。**⚠️ **幅は `S-138`
//      のままであり、押せる幅は変えない。**」
//   4. THE STRIP STOOD AT THE PANEL'S EDGE ON EVERY ROW. `GR-20`: 「⭐⭐ **行の左端
//      とは、その行の字下げの後ろである（MUST）**…**掴み代は行の名前の直前に立ち、
//      段の字下げとともに動くこと（MUST）。**⛔ **パネルの左端に揃えてはならない
//      （MUST NOT）** —— **揃えると、どの段の行を掴んでいるのかが掴み代から読め
//      ない。**」
//   5. THE STRIP SPANNED THE ROW'S BOX. 「⭐ **印は行の名前と同じ高さに描くこと
//      （MUST）**…⛔ **行の箱の高さいっぱいに広げてはならない（MUST NOT）** ——
//      **行の高さは `FR-042` で行ごとに違い、広げると印が名前の行から離れていく。**」
//
// ---------------------------------------------------------------------------
// THE OTHER ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   表 T-051 `HF-18`  the count itself: 「**配下に畳み込んでいる行があるとき、その
//                    行数を行に示すこと（MUST）**」, and 「⛔ **`HF-6` の対象では
//                    ない**」
//   表 T-051 `HF-15`  「**行を掴んで動かせること（MUST）** —— 掴み代は 表 T-023d の
//                    `GR-20` である」／「⭐ **掴み代は常に描くこと（MUST）** ——
//                    ⛔ **`HF-6` の対象ではない**」
//   表 T-051 `HF-5`   「**名前が操作子より大きいときは、名前の上端に揃えること
//                    （MUST）。中央で揃えてはならない（MUST NOT）**」 -- the same
//                    line the strip's mark is asked to sit on, stated for the
//                    controls
//   表 T-023d `GR-20` 「**行の左端に敷く掴み代**（幅は…`S-138`）」
//   表 T-206 `S-138`  入口の図形を描く箱の一辺（16px）
//   表 T-236 `S-153`  注意の色
//   `FR-041`         「画面の色は…表 T-236 に従うこと（MUST）」 -- why a colour is
//                    resolved through the one declaration on the root
//   `FR-042`         a row's height is the row's own, which is why a mark that
//                    follows the box drifts off the name
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1)
// ---------------------------------------------------------------------------
// What was read: docs/spec/ for every sentence above, and of `src/` nothing but
// the exported declarations these cases must call or name -- the `ScreenView`
// family of `screen-renderer.ts`, `ScreenRect`, `SETTINGS_DEFAULTS`,
// `domScreenSurface` / `ScreenSurfaceWiring` / `ScreenTheme`, and the head
// comment of `ScreenPart.isRowGrabStrip` in `screen-surface.ts`, which is where
// the strip's name comes from. ⛔ NO FUNCTION BODY WAS READ, and every colour and
// every size below is read out of the manuscript at run time rather than typed.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED: the fake browser, the `ScreenView`
// fixtures and the readers are
// tests/unit/t-051-hf-6-the-pinned-rows-pin-is-filled.test.ts's, which drives
// this same unit through the same seam.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, each searched for before being given up
// ---------------------------------------------------------------------------
//   1. THAT THE COUNT SITS 「行の名前の隣」 IN THE PICTURE. HF-18 (MUST) asks for
//      it, and where a node LANDS is a measurement of a laid-out page; this fake
//      lays nothing out, and a browser is what turns a declaration into an edge.
//      ⚠️ What IS asserted is the half that is a declaration: the count is drawn
//      inside the row that holds the name, and it is a word rather than a badge.
//      ⛔ REPORTED, NOT REPLACED by a case about a number that happens to be
//      written somewhere -- as it stands the unit anchors the count against the
//      row's RIGHT edge, which is a placement no case here can judge.
//   2. WHAT INK THE COUNT'S DIGITS TAKE. HF-18 names `S-153` in the sentence
//      that follows 「その行自身にも印を付けること」, so the colour is the MARK's
//      by position; whether it also governs the digits is a reading the row does
//      not settle. ⛔ So the colour is asserted of the bar and not of the word.
//   3. HOW WIDE THE BAR ON THE LEFT EDGE IS. 「帯を 1 本引くこと」 fixes that there
//      is one and where it is; no row of 表 T-206 holds its thickness.
//   4. WHEN EITHER MARK APPEARS. Both rows say they are not HF-6's subject, and
//      where the pointer is reaches this unit through no member of `RowTitle` --
//      so these cases ask what is drawn for a described row, never when.

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  RowExpander,
  RowTitle,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  oneByRole,
  paintedGround,
  resolved,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscripts, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** Everything one row of a table says, as one string. */
const says = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

const HF_18 = says('T-051', 'HF-18')
const HF_15 = says('T-051', 'HF-15')
const GR_20 = says('T-023d', 'GR-20')

const THEMES: readonly ScreenTheme['preference'][] = ['light', 'dark']

/** S-73's default, read rather than typed (rule 03 section 1). */
const THEME_HUE = Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? ''))

const themeOf = (preference: ScreenTheme['preference']): ScreenTheme => ({
  preference,
  hue: THEME_HUE,
})

/** One colour of 表 T-236, for one rendering, with the hue already in it. */
function t236(rowId: string, preference: ScreenTheme['preference']): string {
  const cell = bare(rowOf('T-236', rowId).by[preference === 'dark' ? '暗いテーマ' : '明るいテーマ'] ?? '')
  if (!/^(#|hsl\(|rgba?\()/.test(cell)) {
    throw new Error(`表 T-236 ${rowId} states no colour for this rendering: ${cell}`)
  }
  return cell.replace('H', String(THEME_HUE)).replace(/\s+/g, '').toLowerCase()
}

/** One number out of 表 T-206's 既定 column. */
function t206(rowId: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(rowOf('T-206', rowId).by['既定'] ?? ''))
  if (found === null) throw new Error(`表 T-206 ${rowId} states no number`)
  return Number(found[0])
}

/** GR-20 (MUST): 「幅は…`S-138`」, and HF-15 (MUST): 「幅は `S-138` のまま」. */
const S_138 = t206('S-138')

/** S-37, the step one level of depth costs (表 T-201). */
const ROW_TITLE_INDENT = SETTINGS_DEFAULTS['rowTitleIndent'] as number

/** U-23 of 表 T-103 -- the settled name W-4 of 表 T-006a puts into `data-role`. */
const U_23 = bare(rowOf('T-103', 'U-23').by['確定名（英）'] ?? '')

// ---------------------------------------------------------------------------
// Descriptions to draw. Every one is a value of `ScreenView` and nothing else.
// ---------------------------------------------------------------------------

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

/** HF-1: a row with something under it, so all three controls have work. */
const EVERY_CONTROL: RowExpander = { canOpen: true, canClose: true, canCloseBelow: true }

/**
 * Two of the four row heights this product measures.
 *
 * ⚠️ THEY ARE FIXTURE VALUES AND NOT SETTINGS. `FR-042` gives a row its own
 * height, so what the cases below need is only that two rows differ -- HF-15's
 * MUST NOT is about a mark that follows the box, and one height cannot show it.
 */
const SHORT_ROW = 64
const TALL_ROW = 148

const rowTitle = (patch: Partial<RowTitle> & { groupId: string }): RowTitle => ({
  depth: patch.depth ?? 1,
  indentPx: (patch.depth ?? 1) * ROW_TITLE_INDENT,
  box: rect(0, 40, 220, SHORT_ROW),
  label: patch.groupId,
  wholeLabel: patch.groupId,
  isLabelTruncated: false,
  expander: EVERY_CONTROL,
  isPinned: false,
  isSelected: false,
  ...patch,
})

const viewOf = (titles: readonly RowTitle[]): ScreenView => ({
  ...EMPTY_VIEW,
  rowTitlePanel: { pinnedTitles: [], titles },
})

/** The App Header measures to something, so BO-1's dimension is settled. */
const HEADER_HEIGHT = { 'App Header': 37 }

function drawn(view: ScreenView, preference: ScreenTheme['preference']): Stage {
  const built = wire(themeOf(preference), HEADER_HEIGHT)
  surfaceOf(built).showScreenView(view)
  return built
}

// ---------------------------------------------------------------------------
// Reading the tree back
// ---------------------------------------------------------------------------

/**
 * The rows of the tree, in the order they were described.
 *
 * ⭐ TAKEN AS THE TREE'S OWN CHILDREN, because no attribute of the specification
 * names one row: W-4 of 表 T-006a fixes `data-role` for a UI PART and 表 T-103
 * gives the tree a name, not each of its rows.
 */
function rowsOf(built: Stage, expected: number): FakeElement[] {
  const tree = oneByRole(built.root(), U_23)
  const rows = tree.children
  expect(rows.length, `the tree drew ${rows.length} rows: ${whatWasDrawn(tree)}`).toBe(expected)
  return rows
}

/** Whether this node was taken out of the row's flow by its own declaration. */
const isOutOfFlow = (element: FakeElement): boolean => {
  const position = styleMap(element).get('position') ?? ''
  return position === 'absolute' || position === 'fixed'
}

/** The row's children that are still on the line, in order. */
const inFlowChildren = (row: FakeElement): FakeElement[] =>
  row.children.filter((one) => !isOutOfFlow(one))

/**
 * The node that holds the row's name.
 *
 * ⭐ FOUND BY THE TEXT, for the same reason `rowsOf` is found by the structure:
 * the name is what the specification says the row shows (FR-085), and no
 * attribute is fixed for the node that shows it.
 */
function nameNodeOf(row: FakeElement, label: string): FakeElement {
  const found = selfAndDescendants(row).filter(
    (one) => one !== row && one.textContent === label && one.children.length === 0,
  )
  expect(found.length, `exactly one node holds the name ${label}: ${whatWasDrawn(row)}`).toBe(1)
  return found[0] as FakeElement
}

/**
 * The grab strip GR-20 lays on this row.
 *
 * ⚠️ TWO WAYS OF NAMING IT, AND EITHER WILL DO. `ScreenPart.isRowGrabStrip` is
 * the member the press arrives on, and the strip is marked in the tree for that
 * road; a strip that offered the grab cursor and no mark would still be the one
 * node this file means. ⛔ A row with two of them, or none, fails here rather
 * than silently reading the wrong node.
 */
function grabStripOf(row: FakeElement): FakeElement {
  const found = selfAndDescendants(row).filter(
    (one) =>
      one !== row &&
      (one.getAttribute('data-row-grab') !== null || styleMap(one).get('cursor') === 'grab'),
  )
  expect(found.length, `exactly one grab strip on the row: ${whatWasDrawn(row)}`).toBe(1)
  return found[0] as FakeElement
}

/**
 * The node that shows the count of rows folded away, or `null` when none is.
 *
 * ⭐ FOUND BY THE WORD IT SHOWS, which is what HF-18 asks for: 「数は…語として置く
 * こと（MUST）」. ⛔ NOT by an attribute, so a unit that stopped writing the number
 * as text -- a picture of a number, or a badge with the digits in a title -- is
 * red here rather than passing on a name.
 */
function countNodeOf(row: FakeElement, count: number): FakeElement | null {
  const found = selfAndDescendants(row).filter(
    (one) => one !== row && one.children.length === 0
      && /^\s*\u25be?\s*\d+\s*$/.test(one.textContent),
  )
  expect(found.length, `at most one number is shown on a row: ${whatWasDrawn(row)}`).toBeLessThan(2)
  const first = found[0]
  if (first === undefined) return null
  // ⭐ THE MARK IS PART OF WHAT THE ROW ASKS FOR (MUST, 2026-08-31): 「数の前に、
  // 畳み込みを表す印を 1 つ置くこと。印は下向きの三角（`▾` U+25BE）とすること」.
  // ⛔ The search above accepts a bare number so that dropping the mark fails
  // HERE, with the text in the message, rather than reporting that no count was
  // drawn at all.
  expect(first.textContent.trim(), 'the word the row shows is the mark and the count')
    .toBe(`\u25be ${count}`)
  return first
}

/** Every colour a declaration's value names, resolved through the root. */
function coloursIn(built: Stage, value: string): readonly string[] {
  const found: string[] = []
  for (const one of value.match(/var\(--[a-z0-9-]+\)|#[0-9a-f]{3,8}|(?:hsl|rgb)a?\([^)]*\)/gi) ?? []) {
    found.push(resolved(built, one))
  }
  return found
}

/** The declarations on this node whose value names the given colour. */
const declarationsPainting = (
  built: Stage,
  element: FakeElement,
  colour: string,
): readonly (readonly [string, string])[] =>
  [...styleMap(element)].filter(([, value]) => coloursIn(built, value).includes(colour))

/**
 * Whether one declaration draws a band along the node's LEFT edge.
 *
 * ⚠️ SEVERAL SPELLINGS AND NOT ONE, because no row settles which: a one-sided
 * band is written either as that side's border or as an inset shadow with a
 * horizontal offset and no vertical one. ⛔ What is refused is every spelling
 * that reaches another edge or fills the box -- a right / top / bottom border,
 * and a ground.
 */
function isLeftEdgeBand(property: string, value: string): boolean {
  if (/^border-(left|inline-start)/.test(property)) return true
  if (property !== 'box-shadow') return false
  if (!/\binset\b/.test(value)) return false
  const lengths = value.match(/-?\d+(?:\.\d+)?px/g) ?? []
  const x = Number((lengths[0] ?? '0px').replace('px', ''))
  const y = Number((lengths[1] ?? '0px').replace('px', ''))
  return x > 0 && y === 0
}

/**
 * How far in from the row's own left edge a node starts, by declaration.
 *
 * ⭐ THE SUM OF WHAT THE ROW AND THE NODE DECLARE, which is what a browser lays
 * out from: the row's own left padding, plus any left margin or offset on the
 * nodes between. ⛔ It is not a measurement -- this fake lays nothing out -- so
 * every case that uses it compares two rows rather than trusting one number
 * alone.
 */
function leftInsetOf(row: FakeElement, node: FakeElement): number {
  const px = (written: string | undefined): number => {
    if (written === undefined) return 0
    const found = /(-?\d+(?:\.\d+)?)px/.exec(written)
    return found === null ? 0 : Number(found[1])
  }
  let total = 0
  let at: FakeElement | null = node
  while (at !== null) {
    const style = styleMap(at)
    if (at !== node || !isOutOfFlow(at)) {
      // ⚠️ The node's OWN padding is inside it and does not move where it starts.
      if (at !== node) total += px(style.get('padding-left'))
      total += px(style.get('margin-left'))
    }
    if (isOutOfFlow(at)) total += px(style.get('left'))
    // ⚠️ A four-value `padding` shorthand carries the left value last.
    const shorthand = style.get('padding')
    if (shorthand !== undefined && at !== node) {
      const parts = shorthand.trim().split(/\s+/)
      if (parts.length === 4) total += px(parts[3])
      else if (parts.length === 2 || parts.length === 3) total += px(parts[1])
      else total += px(parts[0])
    }
    if (at === row) break
    at = at.parentNode
  }
  return total
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscripts still say what these cases read', () => {
  it('⛔ HF-18 still asks for a word and refuses a painted badge', () => {
    expect(HF_18).toContain('数は行の名前の隣に語として置くこと（MUST）')
    expect(HF_18).toContain('地を塗った札にしてはならない（MUST NOT）')
  })

  it('⛔ HF-18 still names the place and the mark (the ruling of 2026-08-31)', () => {
    expect(HF_18).toContain('置く先は行の右端とすること（MUST）')
    expect(HF_18).toContain('`HF-4` が操作子を留めるのと同じ端である')
    expect(HF_18).toContain('名前の途中に置いてはならない（MUST NOT）')
    expect(HF_18).toContain('数の前に、畳み込みを表す印を 1 つ置くこと（MUST）')
    expect(HF_18).toContain('印は下向きの三角（`▾` U+25BE）とすること（MUST）')
  })

  it('⛔ HF-18 and HF-15 still read ONE thickness for their two bands', () => {
    expect(HF_18).toContain('太さは `_assets/tbl-settings.md` の 表 T-206 の `S-213` とすること（MUST）')
    expect(HF_15).toContain('太さは 表 T-206 の `S-213` とすること（MUST）')
    expect(t206('S-213')).toBeGreaterThan(0)
  })

  it('⛔ HF-15 still names the glyph the grab mark is drawn with', () => {
    expect(HF_15).toContain('印は縦に並べた 2 本の三点リーダ（`⋮⋮` U+22EE を 2 つ）とすること（MUST）')
    expect(HF_15).toContain('図 F-019 の図形にしてはならない（MUST NOT）')
  })

  it('⛔ HF-18 still marks the row itself with a band on its left edge, in S-153', () => {
    expect(HF_18).toContain('その行自身にも印を付けること（MUST）')
    expect(HF_18).toContain('印は行の左の辺に帯を 1 本引くこと（MUST）')
    expect(HF_18).toContain('色は 表 T-236 の `S-153` とする')
  })

  it('⛔ HF-15 still draws the grab strip as a small mark and refuses a painted band', () => {
    expect(HF_15).toContain('掴み代は、掴めることを表す小さな印として描くこと（MUST）')
    expect(HF_15).toContain('帯の地を塗ってはならない（MUST NOT）')
    expect(HF_15).toContain('幅は `S-138` のままであり、押せる幅は変えない')
    expect(HF_15).toContain('印は行の名前と同じ高さに描くこと（MUST）')
    expect(HF_15).toContain('行の箱の高さいっぱいに広げてはならない（MUST NOT）')
  })

  it('⛔ GR-20 still puts the strip behind the row’s indent and refuses the panel’s edge', () => {
    expect(GR_20).toContain('行の左端とは、その行の字下げの後ろである（MUST）')
    expect(GR_20).toContain('掴み代は行の名前の直前に立ち、段の字下げとともに動くこと（MUST）')
    expect(GR_20).toContain('パネルの左端に揃えてはならない（MUST NOT）')
  })

  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    expect(U_23).toBe('Row Title Tree')
    expect(S_138).toBeGreaterThan(0)
    expect(ROW_TITLE_INDENT).toBeGreaterThan(0)
    for (const preference of THEMES) {
      // ⛔ Two colours that painted alike would make the S-153 cases pass on the
      // ground the row already has.
      expect(t236('S-153', preference)).not.toBe(t236('S-150', preference))
    }
  })
})

// ===========================================================================
// 1. HF-18 (MUST / MUST NOT) -- the count is a word, not a painted badge
// ===========================================================================

describe('HF-18 -- the count is a word beside the name, and never a painted badge', () => {
  const HOLDING = (): ScreenView =>
    viewOf([rowTitle({ groupId: 'RowAlpha', foldedRowCount: 3 })])

  for (const preference of THEMES) {
    it(`shows the count as a word in the row that holds it (${preference})`, () => {
      // 「**配下に畳み込んでいる行があるとき、その行数を行に示すこと（MUST）**」, and
      // 「**数は…語として置くこと（MUST）**」 -- so what the row shows is the number
      // as text, in the row that holds the name.
      const built = drawn(HOLDING(), preference)
      const [row] = rowsOf(built, 1)
      const count = countNodeOf(row as FakeElement, 3)

      expect(count, `no word says what the row is holding: ${whatWasDrawn(row as FakeElement)}`)
        .not.toBeNull()
      expect(
        selfAndDescendants(row as FakeElement).includes(count as FakeElement),
        'the count is drawn in the row that holds the name',
      ).toBe(true)
    })

    it(`does not paint a ground behind the count (${preference})`, () => {
      // ⛔ 「**地を塗った札にしてはならない（MUST NOT）**」 —— 「**行の名前より目立つ
      // と、何の行かを読む前に数が目に入る。**」 ⚠️ WHAT IS REFUSED IS A GROUND OF
      // ITS OWN: a badge is a ground the row does not already have, so a count
      // painted in the row's own ground would not be one.
      const built = drawn(HOLDING(), preference)
      const [row] = rowsOf(built, 1)
      const count = countNodeOf(row as FakeElement, 3)
      expect(count).not.toBeNull()

      const behind = paintedGround(built, count as FakeElement)
      expect(
        behind === '' || behind === paintedGround(built, row as FakeElement),
        `HF-18 (MUST NOT): the count carries a ground of its own (${behind}): ` +
          whatWasDrawn(count as FakeElement),
      ).toBe(true)
    })

    it(`stands the count at the row's right end, where HF-4 pins the controls (${preference})`, () => {
      // 「⭐⭐ **置く先は行の右端とすること（MUST）** —— **`HF-4` が操作子を留めるの
      // と同じ端である。**」 ⛔ 「**名前の途中に置いてはならない（MUST NOT）**」.
      // ⚠️ THE OFFSET IS COMPARED AND NOT MEASURED IN PIXELS: both are written
      // in `em`, and what the row asks for is that the two name the SAME edge --
      // a number of pixels would be this file inventing one.
      const built = drawn(HOLDING(), preference)
      const [row] = rowsOf(built, 1)
      const count = countNodeOf(row as FakeElement, 3)
      expect(count).not.toBeNull()

      const outermost = selfAndDescendants(row as FakeElement)
        .filter((one) => one.getAttribute('data-icon') !== null)
        .map((one) => styleMap(one).get('right'))
        .filter((written): written is string => written !== undefined)
      expect(outermost.length, `the row drew no control to take an edge from: ${
        whatWasDrawn(row as FakeElement)}`).toBeGreaterThan(0)

      const nearest = (written: string): number => {
        const found = /(-?\d+(?:\.\d+)?)/.exec(written)
        return found === null ? Number.NaN : Number(found[1])
      }
      const edge = Math.min(...outermost.map(nearest))
      expect(
        nearest(styleMap(count as FakeElement).get('right') ?? ''),
        `HF-18 (MUST): the count does not stand at the edge the controls are pinned to: ${
          whatWasDrawn(count as FakeElement)}`,
      ).toBe(edge)
    })

    it(`puts the mark HF-18 names in front of the number (${preference})`, () => {
      // 「⭐ **数の前に、畳み込みを表す印を 1 つ置くこと（MUST）。印は下向きの三角
      // （`▾` U+25BE）とすること（MUST）**」 —— ⛔ 「**裸の数字にしてはならない
      // （MUST NOT）**」.
      const built = drawn(HOLDING(), preference)
      const [row] = rowsOf(built, 1)
      const count = countNodeOf(row as FakeElement, 3)
      expect(count).not.toBeNull()

      expect(
        (count as FakeElement).textContent.trim().startsWith('\u25be'),
        `HF-18 (MUST NOT): the count is a bare number: ${whatWasDrawn(count as FakeElement)}`,
      ).toBe(true)
    })

    it(`shows no count on a row that is holding nothing (${preference})`, () => {
      // ⭐ THE PAIR, WITHOUT WHICH THE TWO ABOVE WOULD PASS ON A ROW THAT ALWAYS
      // SHOWS A NUMBER. HF-18 asks for one 「配下に畳み込んでいる行があるとき」.
      const built = drawn(viewOf([rowTitle({ groupId: 'RowAlpha' })]), preference)
      const [row] = rowsOf(built, 1)

      expect(
        countNodeOf(row as FakeElement, 0),
        `a row holding nothing showed a number: ${whatWasDrawn(row as FakeElement)}`,
      ).toBeNull()
    })
  }
})

// ===========================================================================
// 2. HF-18 (MUST) -- the row itself carries a band on its left edge, in S-153
// ===========================================================================

describe('HF-18 -- the row that is holding rows folded is marked on its left edge', () => {
  for (const preference of THEMES) {
    const CAUTION = (): string => t236('S-153', preference)

    it(`draws one band in S-153 on the row (${preference})`, () => {
      // 「⭐ **その行自身にも印を付けること（MUST）。印は行の左の辺に帯を 1 本引く
      // こと（MUST）**…⭐ **色は 表 T-236 の `S-153` とする**」
      const built = drawn(viewOf([rowTitle({ groupId: 'RowAlpha', foldedRowCount: 3 })]), preference)
      const [row] = rowsOf(built, 1)
      const painted = declarationsPainting(built, row as FakeElement, CAUTION())

      expect(
        painted.map(([property, value]) => `${property}:${value}`),
        `HF-18 (MUST): the row carries no mark in S-153: ${whatWasDrawn(row as FakeElement)}`,
      ).toHaveLength(1)
    })

    it(`draws it on the LEFT edge and not as a ground (${preference})`, () => {
      // 「**行の左の辺に帯を 1 本引くこと（MUST）**」 -- one edge, and the left one.
      // ⛔ A ground would be the same thing HF-18 refuses of the count one
      // sentence earlier: a mark that is read before the row's name is.
      const built = drawn(viewOf([rowTitle({ groupId: 'RowAlpha', foldedRowCount: 3 })]), preference)
      const [row] = rowsOf(built, 1)
      const painted = declarationsPainting(built, row as FakeElement, CAUTION())

      expect(
        painted.filter(([property, value]) => isLeftEdgeBand(property, value)).length,
        `HF-18 (MUST): S-153 is not drawn as a band on the row's left edge: ` +
          painted.map(([property, value]) => `${property}:${value}`).join(' ; '),
      ).toBe(1)
      expect(
        paintedGround(built, row as FakeElement),
        'HF-18 (MUST): the mark is a band, not the row’s ground',
      ).not.toBe(CAUTION())
    })

    it(`draws the band at S-213, the one thickness both bands read (${preference})`, () => {
      // 「**太さは `_assets/tbl-settings.md` の 表 T-206 の `S-213` とすること
      // （MUST）**」 —— ⭐ that row states in as many words that HF-15's live axis
      // and this mark are 「行の辺に引く 1 本の帯」 and hold ONE number.
      // ⛔ THEY HELD TWO UNTIL 2026-08-31: 2px for the axis and 3px here, both
      // invented in the drawing unit because no row of the specification held
      // either.
      const built = drawn(viewOf([rowTitle({ groupId: 'RowAlpha', foldedRowCount: 3 })]), preference)
      const [row] = rowsOf(built, 1)
      const painted = declarationsPainting(built, row as FakeElement, CAUTION())
      const band = painted.find(([property, value]) => isLeftEdgeBand(property, value))
      expect(band, `HF-18 (MUST): no band to measure: ${whatWasDrawn(row as FakeElement)}`)
        .not.toBeUndefined()

      const written = (band as readonly [string, string])[1]
      const first = /(-?\d+(?:\.\d+)?)px/.exec(written)
      expect(first, `the band states no thickness: ${written}`).not.toBeNull()
      expect(
        Number((first as RegExpExecArray)[1]),
        `HF-18 (MUST): the band is not S-213 thick: ${written}`,
      ).toBe(t206('S-213'))
    })

    it(`leaves a row that is holding nothing unmarked (${preference})`, () => {
      // ⭐ THE PAIR. 「**数だけでは、どの行が抱えているかを目で追うのに読む必要が
      // ある**」 is a reason for marking the rows that ARE holding, so a mark on
      // every row says nothing at all.
      const built = drawn(viewOf([rowTitle({ groupId: 'RowAlpha' })]), preference)
      const [row] = rowsOf(built, 1)

      expect(
        declarationsPainting(built, row as FakeElement, CAUTION()).map(
          ([property, value]) => `${property}:${value}`,
        ),
        'a row holding nothing carries the caution mark',
      ).toEqual([])
    })
  }
})

// ===========================================================================
// 3. HF-15 (MUST / MUST NOT) -- the grab strip is a small mark, not a slab
// ===========================================================================

describe('HF-15 -- the grab strip is a mark, and its band is not painted', () => {
  const ONE_ROW = (): ScreenView => viewOf([rowTitle({ groupId: 'RowAlpha' })])

  for (const preference of THEMES) {
    it(`draws a mark on the strip (${preference})`, () => {
      // 「⭐⭐ **掴み代は、掴めることを表す小さな印として描くこと（MUST）**」 -- a
      // strip that draws nothing tells no one it can be grabbed, which is the
      // reason 「掴み代は常に描くこと（MUST）」 gives one sentence earlier:
      // 「掴めることが読めなければ、掴もうとする手が動かない」.
      const built = drawn(ONE_ROW(), preference)
      const [row] = rowsOf(built, 1)
      const strip = grabStripOf(row as FakeElement)

      expect(
        strip.textContent.trim() !== '' || strip.children.length > 0,
        `HF-15 (MUST): the strip draws no mark at all: ${whatWasDrawn(strip)}`,
      ).toBe(true)
    })

    it(`draws the strip's mark with the glyph HF-15 names (${preference})`, () => {
      // 「⭐ **印は縦に並べた 2 本の三点リーダ（`⋮⋮` U+22EE を 2 つ）とすること
      // （MUST）**」 —— ⛔ 「**図 F-019 の図形にしてはならない（MUST NOT）**」, so
      // what the strip shows is TEXT and not a shape: 「同図が持つのは入口の図形
      // であり、掴み代は押す入口ではなく、掴める場所を指す印である」.
      const built = drawn(ONE_ROW(), preference)
      const [row] = rowsOf(built, 1)
      const strip = grabStripOf(row as FakeElement)

      expect(
        strip.textContent.trim(),
        `HF-15 (MUST): the strip's mark is not the glyph the row names: ${whatWasDrawn(strip)}`,
      ).toBe('⋮⋮')
    })

    it(`paints no ground on the strip (${preference})`, () => {
      // ⛔ 「**帯の地を塗ってはならない（MUST NOT）** —— **行の高さいっぱいに地を塗る
      // と、日程より掴み代が目立つ。**」 ⚠️ As with the count: what is refused is a
      // ground of the strip's OWN, so the row's ground showing through is not one.
      const built = drawn(ONE_ROW(), preference)
      const [row] = rowsOf(built, 1)
      const strip = grabStripOf(row as FakeElement)

      const behind = paintedGround(built, strip)
      expect(
        behind === '' || behind === paintedGround(built, row as FakeElement),
        `HF-15 (MUST NOT): the strip's band is painted (${behind}): ${whatWasDrawn(strip)}`,
      ).toBe(true)
    })

    it(`keeps the strip S-138 wide, so what a hand aims at did not move (${preference})`, () => {
      // ⚠️ 「**幅は `S-138` のままであり、押せる幅は変えない。**」 -- the ruling took
      // the paint away and left the width alone, and GR-20 is where that width is
      // stated: 「**行の左端に敷く掴み代**（幅は…`S-138`）」.
      const built = drawn(ONE_ROW(), preference)
      const [row] = rowsOf(built, 1)
      const strip = grabStripOf(row as FakeElement)

      expect(styleMap(strip).get('width'), `GR-20: the strip is S-138 wide`).toBe(`${S_138}px`)
    })
  }
})

// ===========================================================================
// 4. GR-20 (MUST / MUST NOT) -- the strip stands behind the row's indent
// ===========================================================================

describe('GR-20 -- the strip moves with the row’s indent and never sits on the panel’s edge', () => {
  /** One shallow row and one three levels down, so an indent step can be read. */
  const TWO_DEPTHS = (): ScreenView =>
    viewOf([
      rowTitle({ groupId: 'RowShallow', depth: 1 }),
      rowTitle({ groupId: 'RowDeep', depth: 3, box: rect(0, 120, 220, SHORT_ROW) }),
    ])

  for (const preference of THEMES) {
    it(`starts the strip at the row’s own indent (${preference})`, () => {
      // 「⭐⭐ **行の左端とは、その行の字下げの後ろである（MUST）**」 -- and the
      // indent a row is drawn at reaches this unit as `RowTitle.indentPx`, which
      // FR-085 already makes 「深さの倍数」.
      const built = drawn(TWO_DEPTHS(), preference)
      const [shallow, deep] = rowsOf(built, 2)

      expect(
        leftInsetOf(shallow as FakeElement, grabStripOf(shallow as FakeElement)),
        `GR-20 (MUST): the strip does not stand behind depth 1's indent: ` +
          whatWasDrawn(shallow as FakeElement),
      ).toBe(1 * ROW_TITLE_INDENT)
      expect(
        leftInsetOf(deep as FakeElement, grabStripOf(deep as FakeElement)),
        `GR-20 (MUST): the strip does not stand behind depth 3's indent: ` +
          whatWasDrawn(deep as FakeElement),
      ).toBe(3 * ROW_TITLE_INDENT)
    })

    it(`⛔ MUST NOT line the strips up on the panel’s edge (${preference})`, () => {
      // 「⛔ **パネルの左端に揃えてはならない（MUST NOT）** —— **揃えると、どの段の行
      // を掴んでいるのかが掴み代から読めない。**」 ⭐ TWO ROWS AND NOT ONE, because
      // 「揃える」 is a claim about a set: a strip at 0 on every row is what the
      // MUST NOT names, and a difference between depths is what refutes it.
      const built = drawn(TWO_DEPTHS(), preference)
      const [shallow, deep] = rowsOf(built, 2)
      const at = (row: FakeElement): number => leftInsetOf(row, grabStripOf(row))

      expect(
        at(deep as FakeElement) - at(shallow as FakeElement),
        'GR-20 (MUST): the strip did not move with the depth',
      ).toBe(2 * ROW_TITLE_INDENT)
      expect(at(shallow as FakeElement), 'GR-20 (MUST NOT): the strip sits on the panel’s edge')
        .toBeGreaterThan(0)
    })

    it(`stands the strip immediately before the name (${preference})`, () => {
      // 「**掴み代は行の名前の直前に立ち**」 -- 直前 among the things that are on the
      // line: a sheet the row lays behind its controls (HF-6) is taken out of the
      // flow and stands between neither.
      const built = drawn(TWO_DEPTHS(), preference)
      const [shallow] = rowsOf(built, 2)
      const row = shallow as FakeElement
      const line = inFlowChildren(row)
      const strip = grabStripOf(row)
      const name = nameNodeOf(row, 'RowShallow')

      const stripAt = line.indexOf(strip)
      const nameAt = line.findIndex((one) => selfAndDescendants(one).includes(name))
      expect(stripAt, `the strip is not on the row's line: ${whatWasDrawn(row)}`).toBeGreaterThan(-1)
      expect(nameAt, `the name is not on the row's line: ${whatWasDrawn(row)}`).toBeGreaterThan(-1)
      expect(nameAt - stripAt, 'GR-20 (MUST): the strip does not stand immediately before the name')
        .toBe(1)
    })
  }
})

// ===========================================================================
// 5. HF-15 (MUST / MUST NOT) -- the mark is on the name's line, not the box's
// ===========================================================================

describe('HF-15 -- the mark sits on the name’s line and does not span the row’s box', () => {
  /** The same row twice, differing only in how tall FR-042 made its box. */
  const TWO_HEIGHTS = (): readonly [ScreenView, ScreenView] => [
    viewOf([rowTitle({ groupId: 'RowAlpha', box: rect(0, 40, 220, SHORT_ROW) })]),
    viewOf([rowTitle({ groupId: 'RowAlpha', box: rect(0, 40, 220, TALL_ROW) })]),
  ]

  for (const preference of THEMES) {
    it(`⛔ MUST NOT stretch the mark over the row’s box (${preference})`, () => {
      // 「⛔ **行の箱の高さいっぱいに広げてはならない（MUST NOT）**」 -- so none of
      // the three ways of saying 「as tall as the box」 may be declared on it.
      const [short] = TWO_HEIGHTS()
      const built = drawn(short, preference)
      const [row] = rowsOf(built, 1)
      const strip = grabStripOf(row as FakeElement)
      const style = styleMap(strip)

      expect(style.get('height') ?? '', 'HF-15 (MUST NOT): the mark is as tall as the box').not.toBe(
        `${SHORT_ROW}px`,
      )
      expect(style.get('height') ?? '', 'HF-15 (MUST NOT): the mark fills its box').not.toBe('100%')
      expect(
        (style.get('top') ?? '') !== '' && (style.get('bottom') ?? '') !== '',
        `HF-15 (MUST NOT): the mark is pinned to both edges of the box: ${whatWasDrawn(strip)}`,
      ).toBe(false)
      expect(
        style.get('align-self') ?? '',
        'HF-15 (MUST NOT): the mark is stretched over the box',
      ).not.toBe('stretch')
    })

    it(`draws the mark the same way whatever height FR-042 gave the row (${preference})`, () => {
      // ⭐ THE MUST NOT, ASKED WHERE IT WAS MEASURED: 「**行の高さは `FR-042` で行ごと
      // に違い、広げると印が名前の行から離れていく。**」 ⛔ A mark that follows the
      // box cannot answer alike for a 64px row and a 148px one.
      const [short, tall] = TWO_HEIGHTS()
      const shortBuilt = drawn(short, preference)
      const tallBuilt = drawn(tall, preference)
      const stripOf = (built: Stage): string =>
        whatWasDrawn(grabStripOf(rowsOf(built, 1)[0] as FakeElement))

      expect(
        stripOf(tallBuilt),
        'HF-15 (MUST NOT): the mark followed the height of the row’s box',
      ).toBe(stripOf(shortBuilt))
    })

    it(`puts the mark on the name’s line rather than in the middle of the box (${preference})`, () => {
      // 「⭐ **印は行の名前と同じ高さに描くこと（MUST）**」. ⭐ WHAT DECIDES IT IS THE
      // ROW'S OWN DECLARATION: the mark and the name stand on the row's line
      // together, and the row says where that line starts. A row that centred its
      // children would put the mark in the middle of a 148px box while the name
      // sits at its top -- which is 表 T-051 の `HF-5` refused for the controls in
      // the same words: 「**名前の上端に揃えること（MUST）。中央で揃えてはならない
      // （MUST NOT）**」.
      const [, tall] = TWO_HEIGHTS()
      const built = drawn(tall, preference)
      const [row] = rowsOf(built, 1)
      const strip = grabStripOf(row as FakeElement)
      const name = nameNodeOf(row as FakeElement, 'RowAlpha')
      const line = inFlowChildren(row as FakeElement)

      expect(line, 'the mark is on the row’s line').toContain(strip)
      expect(
        line.some((one) => selfAndDescendants(one).includes(name)),
        'the name is on the row’s line',
      ).toBe(true)
      expect(
        ['flex-start', 'start', 'baseline', 'first baseline'],
        `HF-15 (MUST): the row does not hold its line to the name's top: ` +
          `align-items:${styleMap(row as FakeElement).get('align-items') ?? '(none)'}`,
      ).toContain(styleMap(row as FakeElement).get('align-items') ?? '')
    })
  }
})
