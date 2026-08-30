// 表 T-051 の HF-6 (MUST): a row that is PINNED has its pin (`IC-60`) filled --
// and that fill does not disturb the single sheet of ground HF-6 lays under
// all of the row's controls.
//
// Unit under test: UF-72 of table T-075 (`dom-screen-surface.ts`, component
// CP-27 of table T-062). It is the unit that turns a `ScreenView` into the
// tree, so it is the one that paints.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The sentences these cases hold
// ---------------------------------------------------------------------------
//
//   表 T-051 の `HF-6` (Chapter 3, 「行見出しパネルの操作子」):
//
//     ⭐ 「ピン止めしている行の `IC-60` は、`FR-029` の 表 T-237 の `EN-3` に従って
//      塗ること（MUST）」（利用者の裁定 2026-08-30）
//
//     ⛔ 「その塗りは、直前の MUST NOT が禁じる『操作子ごとの地』ではない」 ——
//      「地は上の 1 枚（`S-150`）のままであり、`EN-3` の塗りはその地の上に載る状態
//      の印である。」⚠️ 「禁じているのは、1 枚の地の代わりに操作子ごとの地を敷く
//      ことである」 —— 「そうすると操作子のあいだに名前の文字のかけらが残る。」
//      ⭐ 「状態の印は 1 つの操作子にしか立たないので、かけらの残りようがない。」
//
//     ⭐ 「描いているあいだ、操作子の下に地を 1 枚敷くこと（MUST）。色は
//      `_assets/tbl-settings.md` の 表 T-236 の `S-150` とすること（MUST）」
//     ⛔ 「操作子ごとに別々の地を敷いてはならない（MUST NOT）」
//
//   FR-029 (Chapter 3), which 表 T-237's `EN-3` row hands the drawing rule to:
//
//     「その入口がいま効いていることを示すときは、図形を描く箱を塗りつぶし、図形
//      そのものを 表 T-236 の `S-146`（地の色）で抜くこと（MUST）。縁の色や太さで
//      示してはならない（MUST NOT）」
//
//   FR-029 の 表 T-237 の `EN-3`: 「その行をピン止めしている」 -> `S-151`,
//     定める要求 = 表 T-051 の `HF-6`.
//   表 T-236 の `S-151` 「強調の色」 / `S-150` 「パネルの地の色」 / `S-146` 「地の色」.
//   表 T-109 の `IC-60`: `Row Title Panel`, 「行をピン止めし、同じ入口で外す」,
//     正 = `FR-098`. 表 T-109 の `IC-58`: the same panel's 「行の配下をすべて開く」.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT WAS READ, AND WHAT WAS NOT (docs/development-rules/04-verification.md,
// section 1)
// ---------------------------------------------------------------------------
//
// docs/spec/ for every sentence above, and of `src/` nothing but the exported
// declarations these cases must call or name. ⛔ No function body of UF-72 was
// read, and no existing test's expectations were read. Every colour below is
// read out of the manuscript at run time rather than typed here.
//
// ⛔⛔ THESE CASES ARE EXPECTED TO BE RED. CR-311 measured that 「`data-pinned`
// は書かれているが、塗る宣言が 1 行も無い」 -- the sentence HF-6 now carries was
// written on 2026-08-30 and nothing draws it yet. They are written now so that
// the work has something to turn green.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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
  descendants,
  iconEntry,
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

/** Everything HF-6 writes, as one string. */
const HF_6 = rowOf('T-051', 'HF-6').cells.join(' ')

const CHAPTER_1_4 = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

interface PaintRow {
  readonly id: string
  readonly by: Readonly<Record<string, string>>
}

/**
 * 表 T-237, parsed here rather than through `tests/contract/spec-table.ts`.
 *
 * ⛔⛔ REPORTED, NOT PAPERED OVER -- THIS IS A DEFECT IN THE TABLE. Chapter 1.9
 * (:274) makes the first column of a numbered table the row ID, and every other
 * table in the specification writes it BARE: `HF-6`, `NT-1`, `RS-1`, `S-146`.
 * 表 T-237 writes its four ids inside code spans (`EN-1` with backticks), so
 * `specTable('T-237')` matches no row at all and throws 「no rows with a row
 * ID」. ⚠️ That reader is the one Chapter 1.9 (:275) asks a test about a table to
 * be driven by, so as the table stands NO test can be driven by 表 T-237
 * through it. ⭐ The parser below strips the code span so that the cases can
 * run; it is not a fix, and the backticks should come off the four ids.
 */
const T_237_ROWS: readonly PaintRow[] = ((): readonly PaintRow[] => {
  const lines = CHAPTER_1_4.split(/\r?\n/)
  const at = lines.findIndex((line) => line.startsWith('**表 T-237 —'))
  if (at < 0) throw new Error('the specification has no 表 T-237')
  const cellsOf = (line: string): string[] =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((one) => one.trim())

  let headings: string[] = []
  const rows: PaintRow[] = []
  for (const line of lines.slice(at + 1)) {
    if (line.startsWith('**表 ') || line.startsWith('#')) break
    if (!line.trim().startsWith('|')) continue
    if (/^\|[\s:|-]+\|$/.test(line.trim())) continue
    const cells = cellsOf(line)
    if (headings.length === 0) {
      headings = cells
      continue
    }
    if (cells.length !== headings.length) continue
    const id = bare(cells[0] ?? '')
    if (!/^EN-\d+$/.test(id)) continue
    const by: Record<string, string> = {}
    headings.forEach((heading, index) => {
      by[heading] = cells[index] ?? ''
    })
    rows.push({ id, by })
  }
  if (rows.length === 0) throw new Error('表 T-237 has no rows this file can read')
  return rows
})()

/** One row of 表 T-237. */
function t237(enRow: string): PaintRow {
  const found = T_237_ROWS.find((one) => one.id === enRow)
  if (found === undefined) throw new Error(`表 T-237 has no row ${enRow}`)
  return found
}

/** The row of 表 T-236 that 表 T-237's `EN-3` names for its fill. */
const EN_3_FILL = bare(t237('EN-3').by['塗りの色'] ?? '')

const THEMES: readonly ScreenTheme['preference'][] = ['light', 'dark']

/** S-73's default, read rather than typed (rule 03 section 1). */
const THEME_HUE = Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? ''))

const themeOf = (preference: ScreenTheme['preference']): ScreenTheme => ({
  preference,
  hue: THEME_HUE,
})

function t236(rowId: string, preference: ScreenTheme['preference']): string {
  const row = rowOf('T-236', rowId)
  const cell = bare(row.by[preference === 'dark' ? '暗いテーマ' : '明るいテーマ'] ?? '')
  if (!/^(#|hsl\(|rgba?\()/.test(cell)) {
    throw new Error(`表 T-236 ${rowId} states no colour for this rendering: ${cell}`)
  }
  return cell.replace('H', String(THEME_HUE)).replace(/\s+/g, '').toLowerCase()
}

/** Table T-103's settled names, which W-4 of 表 T-006a puts into `data-role`. */
const nameOf = (row: string): string => bare(rowOf('T-103', row).by['確定名（英）'] ?? '')
const U_23 = nameOf('U-23')

/** The rows of 表 T-109 these cases stand on. */
const IC_ROW_PIN = 'IC-60'
const IC_ROW_OPEN = 'IC-58'

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

const viewWith = (patch: Partial<ScreenView>): ScreenView => ({ ...EMPTY_VIEW, ...patch })

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

const ROW_TITLE_INDENT = SETTINGS_DEFAULTS['rowTitleIndent'] as number

/** The row's own box, which HF-6 measures the ground's height against. */
const ROW_BOX = rect(0, 40, 170, 29)

const rowTitle = (patch: Partial<RowTitle> & { groupId: string }): RowTitle => ({
  depth: patch.depth ?? 1,
  indentPx: (patch.depth ?? 1) * ROW_TITLE_INDENT,
  box: ROW_BOX,
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

/** HF-1: a row with something under it, so all three controls have work. */
const EVERY_CONTROL: RowExpander = { canOpen: true, canClose: true, canCloseBelow: true }

/** The App Header measures to something, so BO-1's dimension is settled. */
const HEADER_HEIGHT = { 'App Header': 37 }

/** A screen holding one row, pinned or not. */
const oneRow = (isPinned: boolean): ScreenView =>
  viewWith({
    rowTitlePanel: {
      pinnedTitles: [],
      titles: [rowTitle({ groupId: 'RowAlpha', expander: EVERY_CONTROL, isPinned })],
    },
  })

function drawn(view: ScreenView, preference: ScreenTheme['preference']): Stage {
  const built = wire(themeOf(preference), HEADER_HEIGHT)
  surfaceOf(built).showScreenView(view)
  return built
}

// ---------------------------------------------------------------------------
// Reading the paint back
// ---------------------------------------------------------------------------

/**
 * The element that holds one row of the tree.
 *
 * ⭐ FOUND FROM THE CONTROLS UP, because no attribute of the specification names
 * a row: W-4 of 表 T-006a fixes `data-role` for a UI part and 表 T-103 gives the
 * tree a name, not each of its rows.
 */
function rowElement(built: Stage): FakeElement {
  const tree = oneByRole(built.root(), U_23)
  const control = iconEntry(tree, IC_ROW_OPEN)
  let at: FakeElement = control
  while (at.parentNode !== null && at.parentNode !== tree) at = at.parentNode
  return at
}

const groundsIn = (built: Stage, part: FakeElement): Set<string> =>
  new Set(
    selfAndDescendants(part)
      .map((one) => paintedGround(built, one))
      .filter((one) => one !== ''),
  )

function glyphInks(built: Stage, entry: FakeElement): Set<string> {
  const found = new Set<string>()
  for (const one of selfAndDescendants(entry)) {
    for (const property of ['color', 'fill', 'stroke']) {
      const written = styleMap(one).get(property)
      if (written !== undefined && written.trim() !== '') found.add(resolved(built, written))
    }
    for (const attribute of ['fill', 'stroke']) {
      const written = one.getAttribute(attribute)
      if (written !== null && written.trim() !== '') found.add(resolved(built, written))
    }
  }
  found.delete('')
  return found
}

/**
 * Every node laid INSIDE this row whose ground is the one HF-6 names.
 *
 * ⛔ THE ROW ITSELF IS NOT ONE OF THEM: the row is a strip of the `Row Title
 * Panel`, whose ground 表 T-236 gives `S-150` in its own right (「行見出しパネル・
 * プロパティパネル・パレットの地」). What HF-6 asks for is a ground laid UNDER
 * THE CONTROLS, which is a thing within the row.
 */
const groundSheetsIn = (built: Stage, row: FakeElement, preference: ScreenTheme['preference']): FakeElement[] =>
  descendants(row).filter((one) => paintedGround(built, one) === t236('S-150', preference))

const rimOf = (built: Stage, entry: FakeElement): string =>
  selfAndDescendants(entry)
    .map((one) => {
      const style = styleMap(one)
      const rim = [...style]
        .filter(([property]) => /^border/.test(property))
        .map(([property, value]) => `${property}:${resolved(built, value)}`)
        .sort()
        .join(';')
      return `${one.tagName}[${rim}]`
    })
    .join(' | ')

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    expect(U_23).toBe('Row Title Tree')
    for (const preference of THEMES) {
      // ⛔ Three colours that painted alike would make every case below pass on
      // any of them.
      const three = new Set([
        t236('S-150', preference),
        t236('S-151', preference),
        t236('S-146', preference),
      ])
      expect(three.size, `表 T-236: S-150 / S-151 / S-146 are three colours (${preference})`).toBe(3)
    }
  })

  it('⭐ 表 T-237 still gives the pinned row `S-151`, and hands the row to HF-6', () => {
    expect(EN_3_FILL).toBe('S-151')
    expect(t237('EN-3').by['定める要求']).toContain('HF-6')
    expect(t237('EN-3').by['何が効いているか']).toContain('ピン止め')
  })

  it('⛔ HF-6 still states the pin fill, and still refuses a per-control ground', () => {
    expect(HF_6).toContain('ピン止めしている行の `IC-60` は')
    expect(HF_6).toContain('表 T-237 の `EN-3` に従って塗ること（MUST）')
    expect(HF_6).toContain('操作子ごとに別々の地を敷いてはならない（MUST NOT）')
    expect(HF_6).toContain('地は上の 1 枚（`S-150`）のままであり')
  })

  it('⛔ FR-029 still states the fill and the knockout HF-6 sends the pin to', () => {
    // ⚠️ See the same case in fr-029-in-effect-is-filled-not-rimmed for why
    // this sentence was re-worded after this file was first written.
    expect(CHAPTER_1_4).toContain('その入口の枠の内側を塗りつぶし')
    expect(CHAPTER_1_4).toContain('縁の色や太さで示してはならない（MUST NOT）')
  })
})

// ===========================================================================
// 表 T-237 の EN-3, through HF-6
// ===========================================================================

describe('HF-6 (MUST) -- a pinned row has its pin filled', () => {
  for (const preference of THEMES) {
    it(`fills the pin's glyph box with 表 T-237 EN-3's colour (${preference})`, () => {
      // ⭐ 「ピン止めしている行の `IC-60` は、`FR-029` の 表 T-237 の `EN-3` に従って
      // 塗ること（MUST）」, and EN-3's 塗りの色 column says `S-151`.
      const built = drawn(oneRow(true), preference)
      const pin = iconEntry(rowElement(built), IC_ROW_PIN)

      expect(
        [...groundsIn(built, pin)],
        `表 T-237 EN-3 asks for ${EN_3_FILL}: ${whatWasDrawn(pin)}`,
      ).toContain(t236(EN_3_FILL, preference))
    })

    it(`knocks the pin's glyph out in S-146, the ground colour (${preference})`, () => {
      // FR-029, which EN-3 hands the drawing rule to: 「図形そのものを 表 T-236 の
      // `S-146`（地の色）で抜くこと（MUST）」.
      const built = drawn(oneRow(true), preference)
      const pin = iconEntry(rowElement(built), IC_ROW_PIN)

      expect(
        [...glyphInks(built, pin)],
        `the pin's glyph is knocked out in S-146: ${whatWasDrawn(pin)}`,
      ).toContain(t236('S-146', preference))
    })

    it(`leaves the pin of a row that is NOT pinned unfilled (${preference})`, () => {
      // ⭐ THE CONVERSE, WITHOUT WHICH THE CASE ABOVE WOULD PASS ON A PIN THAT IS
      // ALWAYS GREEN. 表 T-237 gives a colour to a STATE.
      const built = drawn(oneRow(false), preference)
      const pin = iconEntry(rowElement(built), IC_ROW_PIN)

      expect(
        [...groundsIn(built, pin)],
        `an unpinned row's pin carries no fill: ${whatWasDrawn(pin)}`,
      ).not.toContain(t236(EN_3_FILL, preference))
    })

    it(`says the state with a fill and not with a rim (${preference})`, () => {
      // ⛔ FR-029 (MUST NOT) 「縁の色や太さで示してはならない」, asked of EN-3 the
      // same way it is asked of EN-1: as a DIFFERENCE between the two states.
      const off = drawn(oneRow(false), preference)
      const on = drawn(oneRow(true), preference)

      expect(
        rimOf(on, iconEntry(rowElement(on), IC_ROW_PIN)),
        'FR-029 (MUST NOT): the rim may not differ between pinned and not pinned',
      ).toBe(rimOf(off, iconEntry(rowElement(off), IC_ROW_PIN)))
    })
  }
})

// ===========================================================================
// The sheet of ground the fill must not disturb
// ===========================================================================

describe('HF-6 (MUST NOT) -- the pin fill is not a ground of its own', () => {
  for (const preference of THEMES) {
    it(`pinning does not change how many sheets of S-150 the row lays (${preference})`, () => {
      // ⛔ 「その塗りは…『操作子ごとの地』ではない」 —— 「地は上の 1 枚（`S-150`）の
      // ままであり、`EN-3` の塗りはその地の上に載る状態の印である。」
      const off = drawn(oneRow(false), preference)
      const on = drawn(oneRow(true), preference)

      expect(
        groundSheetsIn(on, rowElement(on), preference).length,
        `the one sheet stays one sheet: ${whatWasDrawn(rowElement(on))}`,
      ).toBe(groundSheetsIn(off, rowElement(off), preference).length)
    })

    it(`the row still lays exactly one sheet of S-150 while pinned (${preference})`, () => {
      // 「描いているあいだ、操作子の下に地を 1 枚敷くこと（MUST）」 —— 1 枚, and
      // 「操作子ごとに別々の地を敷いてはならない（MUST NOT）」.
      const built = drawn(oneRow(true), preference)
      const row = rowElement(built)

      expect(
        groundSheetsIn(built, row, preference).length,
        `HF-6 asks for one sheet of S-150: ${whatWasDrawn(row)}`,
      ).toBe(1)
    })

    it(`the fill stands on the pin alone, and on no other control (${preference})`, () => {
      // ⭐ 「状態の印は 1 つの操作子にしか立たないので、かけらの残りようがない。」
      // A fill that reached a second control would be exactly the 「操作子ごとの
      // 地」 the MUST NOT refuses.
      const built = drawn(oneRow(true), preference)
      const row = rowElement(built)
      const pin = iconEntry(row, IC_ROW_PIN)
      const filled = selfAndDescendants(row)
        .filter((one) => paintedGround(built, one) === t236(EN_3_FILL, preference))
        .filter((one) => !selfAndDescendants(pin).includes(one))

      expect(
        filled.map((one) => one.getAttribute('data-icon') ?? one.tagName),
        `only the pin carries EN-3's fill: ${whatWasDrawn(row)}`,
      ).toEqual([])
    })

    it(`pinning leaves every OTHER control painted exactly as it was (${preference})`, () => {
      // ⭐ THE SAME MUST NOT, ASKED FROM THE OTHER SIDE: nothing about the row's
      // other controls may move when the pin lights up.
      const off = drawn(oneRow(false), preference)
      const on = drawn(oneRow(true), preference)
      const opener = (built: Stage): string =>
        whatWasDrawn(iconEntry(rowElement(built), IC_ROW_OPEN))

      expect(opener(on), 'HF-6 (MUST NOT): the pin fill is not a per-control ground').toBe(
        opener(off),
      )
    })
  }
})
