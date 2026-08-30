// FR-029 (MUST): the box a glyph is drawn in is `S-138` on a side, the same on
// every surface, with at least `S-141` between it and the entrance's frame --
// and the pair is tuned so that the entrance's own outer box does not move.
//
// Unit under test: UF-72 of table T-075 (`dom-screen-surface.ts`, component
// CP-27 of table T-062), plus the two settings rows themselves.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The sentences these cases hold
// ---------------------------------------------------------------------------
//
//   FR-029 (Chapter 3, 「用途をアイコンと形で伝える」), STATEMENT:
//
//     「図形を描く箱の一辺は `_assets/tbl-settings.md` の 表 T-206 の `S-138` に従う
//      こと（MUST）。載る面によって変えてはならない（MUST NOT）」 —— 「同じ図形が
//      面ごとに違う大きさで出ると、同じものだと読めなくなる。」
//
//     「図形と入口の枠のあいだに、`_assets/tbl-settings.md` の 表 T-206 の `S-141`
//      が定める隙間を最低限あけること（MUST）。」
//
//     ⚠️ 「一辺が定めるのは図形の箱であって、それを載せる入口の外形ではない」 ——
//      「枠と余白と行送りは入口の側が決める。」
//
//   表 T-206 の `S-138` 「入口の図形を描く箱の一辺（`FR-029`）」 = 16px:
//
//     ⚠️ 「12 から 16 へ上げた」（利用者の裁定 2026-08-30）—— ⭐ 「`S-141` を 6 から
//      4 へ同時に下げるので、入口の外形は 26 × 24px のまま動かない」（利用者の
//      「アイコンサイズ自体は変えるな」）。
//
//   表 T-206 の `S-141` 「図形と入口の枠の最低隙間（`FR-029`）」 = 4px:
//
//     ⭐ 「角の R と同じ値である」 —— 逐語「アイコンの角の R が曲がり始めるところと
//      同じぐらいの余白があればよい」。⛔⛔ 「本行は 6px で『角の R と同じ』と述べて
//      いたが、実測は 4px であった」 ⇒ 「6 → 4 へ下げた。」
//
// ---------------------------------------------------------------------------
// ⛔ WHAT WAS READ, AND WHAT WAS NOT (docs/development-rules/04-verification.md,
// section 1)
// ---------------------------------------------------------------------------
//
// docs/spec/ for every sentence above, and of `src/` nothing but the exported
// declarations these cases must call or name. ⛔ No function body of UF-72 was
// read, and no existing test's expectations were read. Both numbers are read
// out of 表 T-206 at run time rather than typed here.
//
// ⭐ WHY THE ARITHMETIC IS ASSERTED AS AN INVARIANT AND NOT ONLY AS TWO
// LITERALS. What the ruling settled is that the ENTRANCE does not move while
// the glyph grows: 「16 ＋ 4×2 ＝ 24」 against the old 「12 ＋ 6×2 ＝ 24」. Written
// as `S-138 + S-141 * 2 === 24` the case still means that the day the pair is
// re-tuned; written as `16` and `4` it would only mean that today.

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  PaletteGroup,
  RowExpander,
  RowTitle,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  iconEntry,
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

/**
 * The number of px a row of 表 T-206 states.
 *
 * ⚠️ The 既定 column writes 「16px 🔎」 -- the value, the unit, and the mark that
 * says it was not measured. Only the number is wanted.
 */
function px(table: string, id: string): number {
  const cell = bare(rowOf(table, id).by['既定'] ?? '')
  const found = /(-?\d+(?:\.\d+)?)\s*px/.exec(cell)
  if (found === null) throw new Error(`表 ${table} ${id} states no px value: ${cell}`)
  return Number(found[1])
}

/** 「入口の図形を描く箱の一辺」. */
const S_138 = px('T-206', 'S-138')
/** 「図形と入口の枠の最低隙間」. */
const S_141 = px('T-206', 'S-141')

/** Everything `S-138`'s row writes, as one string -- it is where 26 × 24 is stated. */
const S_138_ROW = rowOf('T-206', 'S-138').cells.join(' ')
const S_141_ROW = rowOf('T-206', 'S-141').cells.join(' ')

/** S-73's default, read rather than typed (rule 03 section 1). */
const THEME: ScreenTheme = {
  preference: 'light',
  hue: Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? '')),
}

/** The rows of 表 T-109 these cases stand an entrance on -- one per surface. */
const IC_PALETTE = 'IC-61'
const IC_HEADER = 'IC-17'
const IC_ROW_PANEL = 'IC-58'

// ---------------------------------------------------------------------------
// Descriptions to draw. Every one is a value of `ScreenView` and nothing else.
// ---------------------------------------------------------------------------

const command = (patch: Partial<CommandItem> & { icon: string }): CommandItem => ({
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  label: patch.icon,
  ...patch,
})

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

const ROW_TITLE_INDENT = SETTINGS_DEFAULTS['rowTitleIndent'] as number
const ROW_BOX = rect(0, 40, 170, 29)
const EVERY_CONTROL: RowExpander = { canOpen: true, canClose: true, canCloseBelow: true }

const rowTitle = (groupId: string): RowTitle => ({
  groupId,
  depth: 1,
  indentPx: ROW_TITLE_INDENT,
  box: ROW_BOX,
  label: groupId,
  wholeLabel: groupId,
  isLabelTruncated: false,
  expander: EVERY_CONTROL,
  isPinned: false,
  isSelected: false,
})

const paletteWith = (commands: readonly CommandItem[]): CommandPalette =>
  ({
    at: { x: 400, y: 300 },
    grabBandHeight: 12,
    minimise: command({ icon: 'IC-75' }),
    isMinimised: false,
    groups: [{ name: 'PaletteGroupWordHere', commands } as PaletteGroup],
    armedText: 'ArmedWordHere',
  }) as CommandPalette

/**
 * One screen carrying an entrance on all three surfaces at once.
 *
 * ⭐ ALL THREE IN ONE DRAWING, because the MUST NOT is about them AGREEING:
 * 「載る面によって変えてはならない」.
 */
const EVERY_SURFACE: ScreenView = {
  ...EMPTY_VIEW,
  appHeaderItems: { ...EMPTY_HEADER, commands: [command({ icon: IC_HEADER })] },
  commandPalette: paletteWith([command({ icon: IC_PALETTE })]),
  rowTitlePanel: { pinnedTitles: [], titles: [rowTitle('RowAlpha')] },
}

const HEADER_HEIGHT = { 'App Header': 37 }

function drawn(view: ScreenView): Stage {
  const built = wire(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView(view)
  return built
}

// ---------------------------------------------------------------------------
// Reading the boxes back
// ---------------------------------------------------------------------------

/**
 * A length in px, whether it was written as a number or as arithmetic.
 *
 * ⚠️ `calc(...)` IS READ AND NOT REFUSED. FR-029 states two numbers and the
 * ruling states their sum; a surface is free to say that sum by writing the
 * addition out instead of the total, and a case that only accepted `24px`
 * would be a case about a spelling rather than about the rule. ⛔ Only the
 * characters of an arithmetic expression in px are accepted, so nothing else
 * can be smuggled through.
 */
function pxOf(written: string): number | null {
  const flat = written.trim().toLowerCase()
  if (flat === '') return null
  const plain = /^(-?\d+(?:\.\d+)?)(px)?$/.exec(flat)
  if (plain !== null) return Number(plain[1])
  const calc = /^calc\((.*)\)$/.exec(flat)
  if (calc === null) return null
  const inner = (calc[1] ?? '').replace(/px/g, '')
  if (!/^[\d\s+\-*/.()]+$/.test(inner)) return null
  const value: unknown = Function(`"use strict";return (${inner})`)()
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** A length written as px, whether in a style declaration or an attribute. */
function lengthOf(one: FakeElement, property: string): number | null {
  return pxOf(styleMap(one).get(property) ?? one.getAttribute(property) ?? '')
}

/**
 * The side of the square box a glyph is drawn in, anywhere in this entrance.
 *
 * ⚠️ ASKED AS "a node that states a width and a height that are equal", because
 * no row of the specification settles the spelling: FR-029 says 「図形を描く箱の
 * 一辺」 and a box can say that on the `svg` itself or on a node around it.
 * ⛔ A rectangle is not a box with 一辺, so only the squares are collected.
 */
function glyphBoxSides(entry: FakeElement): number[] {
  const sides: number[] = []
  for (const one of selfAndDescendants(entry)) {
    const width = lengthOf(one, 'width')
    const height = lengthOf(one, 'height')
    if (width !== null && height !== null && width === height) sides.push(width)
  }
  return sides
}

/**
 * The outer height the entrance states for itself.
 *
 * ⚠️ TWO READINGS ACCEPTED (`height` and `min-height`), because FR-029 leaves
 * the entrance's own frame to the entrance -- 「枠と余白と行送りは入口の側が決め
 * る」 -- and states no spelling for it.
 */
function outerHeightOf(entry: FakeElement): number | null {
  return lengthOf(entry, 'height') ?? lengthOf(entry, 'min-height')
}

// ===========================================================================
// The arithmetic, which needs no drawing at all
// ===========================================================================

describe('表 T-206 (`S-138` / `S-141`) -- the glyph grew and the entrance did not', () => {
  it('⭐ the entrance keeps its outer height: S-138 + S-141 × 2 = 24', () => {
    // ⭐ THE INVARIANT, NOT THE LITERALS. 「16 ＋ 4×2 ＝ 24、幅は ＋2 で 26 × 24」
    // against 「12 ＋ 6×2 ＝ 24」 -- the arithmetic is what the ruling settled,
    // and it is what has to hold if the pair is ever re-tuned.
    expect(S_138 + S_141 * 2, `S-138=${S_138}, S-141=${S_141}`).toBe(24)
  })

  it('⭐ the pair stands where the ruling of 2026-08-30 put it', () => {
    // ⚠️ The literals, kept as a SECOND case rather than as the only one, so a
    // re-tuning fails here (where the row says what it says) and not above
    // (where the invariant says what must never change).
    expect(S_138).toBe(16)
    expect(S_141).toBe(4)
  })

  it('⛔ the two rows still say what this file reads them for', () => {
    // ⛔ WITHOUT THIS, A ROW THAT HAD BEEN REPURPOSED WOULD MAKE THE ARITHMETIC
    // ABOVE ARITHMETIC ABOUT NOTHING -- rule 04 section 2.
    expect(rowOf('T-206', 'S-138').by['値']).toContain('図形を描く箱の一辺')
    expect(rowOf('T-206', 'S-141').by['値']).toContain('図形と入口の枠の最低隙間')
    expect(S_138_ROW, 'S-138 states the outer box that does not move').toContain('26 × 24px')
    expect(S_141_ROW, 'S-141 states that the gap is the corner radius').toContain('角の R と同じ値')
  })

  it('⛔ the glyph really did grow -- the box is larger than the gap it leaves', () => {
    // ⭐ 「図形は 1.33 倍になり、入口は 1px も動かない。」 A pair that satisfied the
    // sum by shrinking the glyph instead would pass the first case and defeat
    // the ruling, which was about the glyph being too small for its frame
    // (defect `D-75`).
    expect(S_138).toBeGreaterThan(S_141 * 2)
  })
})

// ===========================================================================
// What reaches the screen
// ===========================================================================

describe('FR-029 (MUST) -- the box a glyph is drawn in is S-138 on a side', () => {
  it('draws the palette entrance with a glyph box of S-138', () => {
    const built = drawn(EVERY_SURFACE)
    const entry = iconEntry(built.root(), IC_PALETTE)

    expect(
      glyphBoxSides(entry),
      `FR-029 asks for a glyph box of ${S_138}px: ${whatWasDrawn(entry)}`,
    ).toContain(S_138)
  })

  it('⛔ draws the same glyph box on every surface it stands on (MUST NOT)', () => {
    // 「載る面によって変えてはならない（MUST NOT）」 —— 「同じ図形が面ごとに違う大き
    // さで出ると、同じものだと読めなくなる。」
    const built = drawn(EVERY_SURFACE)
    const sideOn = (icon: string): number[] => glyphBoxSides(iconEntry(built.root(), icon))

    for (const icon of [IC_PALETTE, IC_HEADER, IC_ROW_PANEL]) {
      expect(
        sideOn(icon),
        `表 T-109 ${icon}: ${whatWasDrawn(iconEntry(built.root(), icon))}`,
      ).toContain(S_138)
    }
  })

  it('keeps at least S-141 between the glyph box and the entrance frame', () => {
    // 「図形と入口の枠のあいだに…`S-141` が定める隙間を最低限あけること（MUST）。」
    // ⭐ ASKED AS THE DIFFERENCE OF THE TWO BOXES rather than as a `padding`,
    // because FR-029 states a gap and no row states how it is spelled: a gap
    // made by padding and a gap made by a taller frame are the same gap.
    const built = drawn(EVERY_SURFACE)
    const entry = iconEntry(built.root(), IC_PALETTE)
    const outer = outerHeightOf(entry)

    expect(outer, `the entrance states an outer height: ${whatWasDrawn(entry)}`).not.toBeNull()
    expect(
      (outer as number) - S_138,
      `FR-029 asks for at least ${S_141}px on each side: ${whatWasDrawn(entry)}`,
    ).toBeGreaterThanOrEqual(S_141 * 2)
  })

  it('⭐ leaves the entrance the outer height the ruling fixed (S-138 + S-141 × 2)', () => {
    // ⭐ 「入口の外形は 26 × 24px のまま動かない」（`S-138` の備考）. ⚠️ ONLY THE
    // HEIGHT IS ASKED: the 26 of the width is the height plus 「枠の 1px × 2」,
    // and no row of 表 T-206 states that 1px frame -- so a case for the width
    // would be a case for a number the specification does not hold.
    const built = drawn(EVERY_SURFACE)
    const entry = iconEntry(built.root(), IC_PALETTE)

    expect(
      outerHeightOf(entry),
      `the entrance's outer box does not move: ${whatWasDrawn(entry)}`,
    ).toBe(S_138 + S_141 * 2)
  })
})
