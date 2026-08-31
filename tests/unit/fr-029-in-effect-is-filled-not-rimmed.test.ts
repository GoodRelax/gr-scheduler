// FR-029 (MUST / MUST NOT): an entrance that is IN EFFECT is said by FILLING
// the box its glyph is drawn in and knocking the glyph out in the ground
// colour -- never by a rim.
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
//   FR-029 (Chapter 3, 「用途をアイコンと形で伝える」), third paragraph:
//
//     「その入口がいま効いていることを示すときは、図形を描く箱を塗りつぶし、図形
//      そのものを `_assets/tbl-settings.md` の 表 T-236 の `S-146`（地の色）で抜く
//      こと（MUST）。縁の色や太さで示してはならない（MUST NOT）」
//      （利用者の裁定 2026-08-30。逐語「アイコン自体を緑で塗れ。例: イナズマ線が
//      有効ならイナズマ線アイコンを緑で塗れ」）
//
//     ⛔ 「抜き色に白を使ってはならない（MUST NOT）」 —— 「暗いテーマの塗りは明るい
//      色なので、白では図形が浮かない。」⭐ 「地の色なら両テーマで自動的に隔たりが
//      立つ。」
//
//     ⛔ 「何が効いているときに何の色で塗るかは 表 T-237 に従うこと（MUST）」
//
//     ⛔ 「上の薄く描く入口には当ててはならない（MUST NOT）」 —— 「効いていて、かつ
//      いま何も変えられない入口が濃くなると、薄さの意味が消える。」
//
//   FR-029, 表 T-237 「入口を塗って示す状態」, and the sentence under it:
//
//     ⛔ 「1 つの入口に 2 行が同時に当たるときは、上の行が勝つこと（MUST）」
//
//   FR-053 (Chapter 3): 「見分けさせ方は `FR-029` の 表 T-237 の `EN-1` に従うこと
//     （MUST）」 —— this is where `EN-1` (armed) reaches the screen.
//   FR-072 (Chapter 3): 「その押下状態の見せ方は `FR-029` の 表 T-237 の `EN-4` に
//     従うこと（MUST）」 —— this is where `EN-4` (the properties panel) does.
//   表 T-236 の `S-146` 「地の色」: `#ffffff` (light) / `hsl(H 12% 9%)` (dark).
//   表 T-236 の `S-183` 「構えている入口の塗りの色」 —— ⛔ 「縁ではなく塗りである」.
//   表 T-236 の `S-149` 「罫の色」 —— what FR-029 gives an entrance that is spent.
//   表 T-109: `IC-61` (`Command Palette`, arms `AR-4`), `IC-39` (`Command
//     Palette`, イナズマ線を出す・しまう -- the very example the ruling names),
//     `IC-17` (`App Header`, プロパティパネルに出す -- `FR-072`).
//
// ---------------------------------------------------------------------------
// ⛔ WHAT WAS READ, AND WHAT WAS NOT (docs/development-rules/04-verification.md,
// section 1)
// ---------------------------------------------------------------------------
//
// docs/spec/ for every sentence above, and of `src/` nothing but the exported
// declarations these cases must call or name -- `domScreenSurface`, the
// `ScreenSurfaceWiring` / `ScreenTheme` types, and the `ScreenView` family of
// types. ⛔ No function body of UF-72 was read, and no existing test's
// expectations were read. Every colour below is read out of the manuscript at
// run time rather than typed here.
//
// ⚠️ WHAT THE SPECIFICATION DOES NOT SETTLE, AND HOW THESE CASES COPE. No row
// says which member of `ScreenView` carries which row of 表 T-237. `CommandItem`
// has exactly two booleans that can say 「いま効いている」 -- `isArmed` and
// `isPressed` -- and 表 T-237 has three palette-reachable rows (`EN-1`, `EN-2`,
// `EN-4`). So `EN-1` is driven through `isArmed` (FR-053 owns it and 「構え」 is
// its word) and `EN-2` / `EN-4` through `isPressed` (FR-072 says 「押下状態」 in
// as many words). ⭐ THIS COSTS THE CASES NOTHING: 表 T-237 gives all three the
// same colour, so no case here has to tell `EN-2` from `EN-4`.
// ⚠️ `EN-5` JOINED THEM WITH DEFECT D-149 (利用者の裁定 2026-08-31) and is the
// same picture again -- `isPressed`, `S-183`. It reaches no PALETTE entrance,
// so the count above is unchanged: the entrances it stands on (`IC-18`, and
// `IC-7` by the row's own words) are both `App Header` rows of 表 T-109.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  PaletteGroup,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  iconEntry,
  paintedColour,
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
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that takes
// its copy from the .md at read time, so a row that moves in the specification
// moves here too instead of going stale.
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
 * Chapter 1-4 as one string.
 *
 * ⚠️ THE WHOLE FILE AND NOT THE ONE REQUIREMENT: nothing here parses it into
 * requirements, so a premise below asks that a sentence is still IN it rather
 * than which UID holds it.
 */
const CHAPTER_1_4 = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** 表 T-237's own columns. */
const STATE_COLUMN = '何が効いているか'
const FILL_COLUMN = '塗りの色'
const OWNER_COLUMN = '定める要求'

interface PaintRow {
  readonly id: string
  readonly by: Readonly<Record<string, string>>
}

/**
 * 表 T-237, through `tests/contract/spec-table.ts` -- the reader Chapter 1.9
 * (:275) asks a test about a table to be driven by.
 *
 * ⭐ THIS FILE USED TO PARSE THE TABLE BY HAND, AND SAID WHY: 表 T-237 wrote its
 * row ids inside code spans (`` `EN-1` ``) while Chapter 1.9 (:274) makes the
 * first column a bare row ID, so `specTable('T-237')` matched no row and threw
 * 「no rows with a row ID」. ⚠️ The backticks have since come off all five ids,
 * so the ordinary reader works and the private parser is gone. The column names
 * are still checked below, because `specTable` does not check them and a table
 * that renamed a column would otherwise hand every case an empty string.
 */
const T_237_ROWS: readonly PaintRow[] = ((): readonly PaintRow[] => {
  const table = specTable('T-237')
  for (const column of [STATE_COLUMN, FILL_COLUMN, OWNER_COLUMN]) {
    if (!table.headings.includes(column)) {
      throw new Error(`表 T-237 no longer has a ${column} column: ${table.headings.join(' | ')}`)
    }
  }
  return table.rows
    .filter((row) => /^EN-\d+$/.test(row.id))
    .map((row) => ({ id: row.id, by: row.by }))
})()

/** One row of 表 T-237. */
function t237(enRow: string): PaintRow {
  const found = T_237_ROWS.find((one) => one.id === enRow)
  if (found === undefined) throw new Error(`表 T-237 has no row ${enRow}`)
  return found
}

/** The row of 表 T-236 one row of 表 T-237 names for its fill. */
const fillRowOf = (enRow: string): string => bare(t237(enRow).by[FILL_COLUMN] ?? '')

/** The two renderings 表 T-236 states a colour for. Both are asked, every time. */
const THEMES: readonly ScreenTheme['preference'][] = ['light', 'dark']

/** S-73's default, read rather than typed (rule 03 section 1). */
const THEME_HUE = Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? ''))

const themeOf = (preference: ScreenTheme['preference']): ScreenTheme => ({
  preference,
  hue: THEME_HUE,
})

/**
 * One row of 表 T-236 as a rendering paints it.
 *
 * ⛔ NO COLOUR IS TYPED HERE (rule 03 section 1). A row that follows the hue
 * writes it as the letter `H`, which `S-73` fills in.
 */
function t236(rowId: string, preference: ScreenTheme['preference']): string {
  const row = rowOf('T-236', rowId)
  const cell = bare(row.by[preference === 'dark' ? '暗いテーマ' : '明るいテーマ'] ?? '')
  if (!/^(#|hsl\(|rgba?\()/.test(cell)) {
    throw new Error(`表 T-236 ${rowId} states no colour for this rendering: ${cell}`)
  }
  return cell.replace('H', String(THEME_HUE)).replace(/\s+/g, '').toLowerCase()
}

/** The rows of 表 T-109 these cases stand an entrance on. */
const IC_ARMS_A_DEPENDENCY = 'IC-61'
const IC_LIGHTNING_LINE = 'IC-39'
const IC_PROPERTIES_PANEL = 'IC-17'

/**
 * Every spelling of white a browser accepts, for the MUST NOT that names it.
 *
 * ⚠️ Compared against a value that has already been lowercased and had its
 * spaces removed by `resolved`, which is why `rgb(255,255,255)` is written
 * without them.
 */
const WHITE = new Set(['#fff', '#ffffff', 'white', 'rgb(255,255,255)', 'hsl(0,0%,100%)'])

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

const viewWith = (patch: Partial<ScreenView>): ScreenView => ({ ...EMPTY_VIEW, ...patch })

const paletteWith = (commands: readonly CommandItem[]): CommandPalette =>
  ({
    at: { x: 400, y: 300 },
    grabBandHeight: 12,
    minimise: command({ icon: 'IC-75' }),
    isMinimised: false,
    groups: [{ name: 'PaletteGroupWordHere', commands } as PaletteGroup],
    armedText: 'ArmedWordHere',
  }) as CommandPalette

/** A screen holding one palette entrance, in whatever state a case gives it. */
const paletteShowing = (entry: CommandItem): ScreenView =>
  viewWith({ commandPalette: paletteWith([entry]) })

/** A screen holding one App Header entrance -- `FR-072`'s own surface. */
const headerShowing = (entry: CommandItem): ScreenView =>
  viewWith({ appHeaderItems: { ...EMPTY_HEADER, commands: [entry] } })

/** The App Header measures to something, so BO-1's dimension is settled. */
const HEADER_HEIGHT = { 'App Header': 37 }

/** Draw one description in one rendering and hand back the stage. */
function drawn(view: ScreenView, preference: ScreenTheme['preference']): Stage {
  const built = wire(themeOf(preference), HEADER_HEIGHT)
  surfaceOf(built).showScreenView(view)
  return built
}

// ---------------------------------------------------------------------------
// Reading the paint back
// ---------------------------------------------------------------------------

/**
 * Every colour laid as a GROUND anywhere in this entrance.
 *
 * ⭐ THE WHOLE ENTRANCE AND NOT ONE NODE, because FR-029 says 「図形を描く箱を
 * 塗りつぶし」 and no row of the specification says whether that box is the
 * entrance element itself, a node inside it, or the `svg`'s own backing shape.
 * Asking the subtree is what keeps the case about the RULE rather than about a
 * spelling nobody chose.
 */
const groundsIn = (built: Stage, entry: FakeElement): Set<string> =>
  new Set(
    selfAndDescendants(entry)
      .map((one) => paintedGround(built, one))
      .filter((one) => one !== ''),
  )

/**
 * Every colour the GLYPH could be drawn in.
 *
 * ⚠️ 図 F-019's shapes take `currentColor` (表 T-109 §8), so the entrance's own
 * `color` is one of them; a shape that states its own `fill` / `stroke` is
 * another. Both are read, for the same reason `groundsIn` reads the subtree.
 */
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
 * Every rim declaration in this entrance, node by node, resolved.
 *
 * ⛔ THIS IS THE MUST NOT, MADE MEASURABLE. FR-029 forbids the state from being
 * said 「縁の色や太さで」, so what the cases compare is the rim of an entrance
 * that IS in effect against the rim of the same entrance that is NOT. A rim
 * that comes back -- as `border-color`, as `border-width`, or folded into the
 * `border` shorthand -- makes the two differ, and the case fails.
 */
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

/** The one node carrying a row of 表 T-109, with the whole tree in the failure. */
function entranceIn(built: Stage, icon: string): FakeElement {
  return iconEntry(built.root(), icon)
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG COLUMN WOULD MAKE EVERY
    // CASE BELOW AGREE WITH ANYTHING -- rule 04 section 2: a mechanism is not
    // verified until it has been broken on purpose and seen to fail.
    // ⚠️ `EN-5` ARRIVED WITH DEFECT D-149 (利用者の裁定 2026-08-31): 「その入口が
    // 表示・非表示を切り替えるものを、いま表示している（表 T-206）」, in `S-183`. It
    // reaches the screen through `isPressed`, the same member `EN-2` and `EN-4`
    // use, so the cases below cover its picture without knowing it by name;
    // which entrances stand in it is
    // tests/unit/fr-066-the-dialogue-field-keeps-its-own-value.test.ts's.
    expect(T_237_ROWS.map((row) => row.id)).toEqual(['EN-1', 'EN-2', 'EN-3', 'EN-4', 'EN-5'])
    for (const preference of THEMES) {
      expect(t236('S-146', preference).length).toBeGreaterThan(0)
      expect(t236('S-183', preference).length).toBeGreaterThan(0)
      expect(t236('S-151', preference).length).toBeGreaterThan(0)
      // ⛔ A fill and a knockout that painted alike would make every case below
      // pass on either colour.
      expect(t236('S-183', preference), '表 T-236: the fill and the ground differ').not.toBe(
        t236('S-146', preference),
      )
      expect(t236('S-149', preference), '表 T-236: the rule colour and the fill differ').not.toBe(
        t236('S-183', preference),
      )
    }
  })

  it('⭐ 表 T-237 still gives each state the colour these cases drive with', () => {
    expect(fillRowOf('EN-1')).toBe('S-183')
    expect(fillRowOf('EN-2')).toBe('S-183')
    expect(fillRowOf('EN-3')).toBe('S-151')
    expect(fillRowOf('EN-4')).toBe('S-183')
    expect(fillRowOf('EN-5')).toBe('S-183')
  })

  it('⭐ 表 T-237 still hands each row to the requirement these cases drive it through', () => {
    // The 定める要求 column, which is what says WHERE each row reaches the screen.
    expect(t237('EN-1').by[OWNER_COLUMN]).toContain('FR-053')
    expect(t237('EN-3').by[OWNER_COLUMN]).toContain('HF-6')
    expect(t237('EN-4').by[OWNER_COLUMN]).toContain('FR-072')
  })

  it('⛔ FR-029 still states the fill, the knockout and the two MUST NOTs', () => {
    // ⚠️ WORDED 「図形を描く箱を塗りつぶし」 UNTIL THIS FILE WAS FIRST WRITTEN.
    // The spec-only body reading it found that 表 T-206 defines 図形を描く箱
    // as S-138 (16px), so read literally only the 16 x 16 shape box was filled
    // and a 4px ring inside the 26 x 24 frame was left unpainted. The
    // manuscript now says the frame's inside, which is the picture CR-311
    // measured.
    expect(CHAPTER_1_4).toContain('その入口の枠の内側を塗りつぶし')
    expect(CHAPTER_1_4).toContain('縁の色や太さで示してはならない（MUST NOT）')
    // ⚠️ 「抜き色に白を使ってはならない」 CONTRADICTED ITS OWN MUST: S-146 IS
    // `#ffffff` in the light rendering, so an absolute prohibition on white
    // forbade the very row the same sentence requires. The manuscript now
    // forbids WRITING white instead of naming the row.
    expect(CHAPTER_1_4).toContain('白と直に書いてはならない（MUST NOT）')
    expect(CHAPTER_1_4).toContain('抜き色は `S-146` とすること（MUST）')
    expect(CHAPTER_1_4).toContain('1 つの入口に 2 行が同時に当たるときは、上の行が勝つこと（MUST）')
  })

  it('⛔ 表 T-236 no longer carries `S-185`, the thickness CR-311 retired', () => {
    // ⭐ 「番号は席番号なので `S-185` は欠番のまま残す」. A row that came back
    // would mean the rim came back with it.
    expect(specTable('T-236').rows.map((row) => row.id)).not.toContain('S-185')
  })

  it('⛔ the dark rendering of `S-146` is not white, which is why the MUST NOT bites', () => {
    // 「暗いテーマの塗りは明るい色なので、白では図形が浮かない。」 In the light
    // rendering `S-146` IS white, so the sentence only has force in the dark
    // one -- and it is there that the case below asks it.
    expect(WHITE.has(t236('S-146', 'dark'))).toBe(false)
  })
})

// ===========================================================================
// EN-1 -- 「その入口を構えている」, reached through FR-053
// ===========================================================================

describe('FR-029 (MUST) -- an entrance that is in effect is FILLED, in both renderings', () => {
  for (const preference of THEMES) {
    it(`fills the glyph's box with 表 T-237 EN-1's colour (${preference})`, () => {
      // 「その入口がいま効いていることを示すときは、図形を描く箱を塗りつぶし」,
      // and 表 T-237's EN-1 row says which colour: `S-183`.
      const built = drawn(paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isArmed: true })), preference)
      const entry = entranceIn(built, IC_ARMS_A_DEPENDENCY)

      expect(
        [...groundsIn(built, entry)],
        `表 T-237 EN-1 asks for ${fillRowOf('EN-1')}: ${whatWasDrawn(entry)}`,
      ).toContain(t236(fillRowOf('EN-1'), preference))
    })

    it(`knocks the glyph out in S-146, the ground colour (${preference})`, () => {
      // 「図形そのものを 表 T-236 の `S-146`（地の色）で抜くこと（MUST）」.
      const built = drawn(paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isArmed: true })), preference)
      const entry = entranceIn(built, IC_ARMS_A_DEPENDENCY)

      expect(
        [...glyphInks(built, entry)],
        `the glyph is knocked out in S-146: ${whatWasDrawn(entry)}`,
      ).toContain(t236('S-146', preference))
    })

    it(`⛔ does NOT draw the glyph itself in the fill colour (${preference})`, () => {
      // ⭐ THE OTHER HALF OF THE SAME MUST, AND THE ONE THAT CATCHES THE READING
      // THE RULING REJECTED: 「アイコン全体の色を変える」 leaves the glyph green
      // on an unpainted box, which is not 「箱を塗りつぶし…図形を…抜く」.
      const built = drawn(paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isArmed: true })), preference)
      const entry = entranceIn(built, IC_ARMS_A_DEPENDENCY)

      expect(
        paintedColour(built, entry),
        `the entrance's own colour is the knockout, not the fill: ${whatWasDrawn(entry)}`,
      ).not.toBe(t236(fillRowOf('EN-1'), preference))
    })
  }

  it('⛔ the knockout is not white in the dark rendering (MUST NOT)', () => {
    // 「抜き色に白を使ってはならない（MUST NOT）」 —— 「暗いテーマの塗りは明るい色な
    // ので、白では図形が浮かない。」
    const built = drawn(paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isArmed: true })), 'dark')
    const entry = entranceIn(built, IC_ARMS_A_DEPENDENCY)

    for (const ink of glyphInks(built, entry)) {
      expect(WHITE.has(ink), `${ink} is white: ${whatWasDrawn(entry)}`).toBe(false)
    }
  })
})

describe('FR-029 (MUST NOT) -- the state is not said with a rim', () => {
  for (const preference of THEMES) {
    it(`arming an entrance changes no border colour and no border width (${preference})`, () => {
      // ⛔ 「縁の色や太さで示してはならない（MUST NOT）」. ⭐ ASKED AS A DIFFERENCE
      // rather than as "there is never a border": an entrance is entitled to
      // the frame it always had. What the MUST NOT forbids is the STATE
      // reaching the screen through that frame -- which is exactly a rim that
      // is there when armed and not there when not.
      const off = drawn(paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY })), preference)
      const on = drawn(paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isArmed: true })), preference)

      expect(
        rimOf(on, entranceIn(on, IC_ARMS_A_DEPENDENCY)),
        'FR-029 (MUST NOT): the rim may not differ between armed and not armed',
      ).toBe(rimOf(off, entranceIn(off, IC_ARMS_A_DEPENDENCY)))
    })

    it(`pressing an entrance changes no border colour and no border width (${preference})`, () => {
      // The same MUST NOT, over 表 T-237's other reachable rows (`EN-2` / `EN-4`).
      const off = drawn(paletteShowing(command({ icon: IC_LIGHTNING_LINE })), preference)
      const on = drawn(paletteShowing(command({ icon: IC_LIGHTNING_LINE, isPressed: true })), preference)

      expect(
        rimOf(on, entranceIn(on, IC_LIGHTNING_LINE)),
        'FR-029 (MUST NOT): the rim may not differ between pressed and not pressed',
      ).toBe(rimOf(off, entranceIn(off, IC_LIGHTNING_LINE)))
    })
  }
})

// ===========================================================================
// EN-2 -- 「その入口の機能が ON である」, which FR-029 owns itself
// ===========================================================================

describe('表 T-237 EN-2 (MUST) -- an entrance whose function is ON is filled', () => {
  for (const preference of THEMES) {
    it(`fills the lightning-line entrance while it is ON (${preference})`, () => {
      // ⭐ THE RULING'S OWN EXAMPLE, verbatim: 「イナズマ線が有効ならイナズマ線
      // アイコンを緑で塗れ」. 表 T-109's `IC-39` is that entrance (`FR-049`,
      // `S-64`), and 表 T-237's EN-2 gives it `S-183`.
      const built = drawn(paletteShowing(command({ icon: IC_LIGHTNING_LINE, isPressed: true })), preference)
      const entry = entranceIn(built, IC_LIGHTNING_LINE)

      expect(
        [...groundsIn(built, entry)],
        `表 T-237 EN-2 asks for ${fillRowOf('EN-2')}: ${whatWasDrawn(entry)}`,
      ).toContain(t236(fillRowOf('EN-2'), preference))
    })

    it(`leaves the same entrance unfilled while it is OFF (${preference})`, () => {
      // ⭐ THE CONVERSE, WITHOUT WHICH THE CASE ABOVE WOULD PASS ON AN ENTRANCE
      // THAT IS ALWAYS GREEN. 表 T-237 gives a colour to a STATE, so an entrance
      // that is not in that state may not carry it.
      const built = drawn(paletteShowing(command({ icon: IC_LIGHTNING_LINE })), preference)
      const entry = entranceIn(built, IC_LIGHTNING_LINE)

      expect(
        [...groundsIn(built, entry)],
        `an entrance that is OFF carries no fill: ${whatWasDrawn(entry)}`,
      ).not.toContain(t236(fillRowOf('EN-2'), preference))
    })
  }
})

// ===========================================================================
// EN-4 -- 「プロパティパネルがそれを出している」, reached through FR-072
// ===========================================================================

describe('表 T-237 EN-4 (MUST) -- the entrance the properties panel is showing from is filled', () => {
  for (const preference of THEMES) {
    it(`fills the App Header entrance while the panel shows its subject (${preference})`, () => {
      // FR-072: 「いま何を出しているかを、入口の押下状態で示すこと（MUST）。その押下
      // 状態の見せ方は `FR-029` の 表 T-237 の `EN-4` に従うこと（MUST）。」
      // ⭐ 表 T-109's `IC-17` stands on the `App Header` and is `FR-072`'s own
      // entrance, which is why the case asks a surface other than the palette:
      // FR-029 (MUST NOT) 「載る面によって薄くしない入口があってはならない」 has
      // the same shape for the fill -- one rule, every surface.
      const built = drawn(headerShowing(command({ icon: IC_PROPERTIES_PANEL, isPressed: true })), preference)
      const entry = entranceIn(built, IC_PROPERTIES_PANEL)

      expect(
        [...groundsIn(built, entry)],
        `表 T-237 EN-4 asks for ${fillRowOf('EN-4')}: ${whatWasDrawn(entry)}`,
      ).toContain(t236(fillRowOf('EN-4'), preference))
    })
  }
})

// ===========================================================================
// The order 表 T-237 puts its rows in
// ===========================================================================

describe('FR-029 (MUST) -- when two rows of 表 T-237 fall on one entrance, the higher row wins', () => {
  for (const preference of THEMES) {
    it(`an entrance that is both armed and pressed carries ONE fill, EN-1's (${preference})`, () => {
      // ⛔ 「1 つの入口に 2 行が同時に当たるときは、上の行が勝つこと（MUST）」 ——
      // ⚠️ 「同時に当たることはない」とは書かない（1.9 の員数の断定の作法）.
      // ⚠️ HOW DISCRIMINATING THIS CASE IS DEPENDS ON THE TABLE: while EN-1 and
      // EN-2 both state `S-183` it can only catch an entrance that paints TWO
      // grounds at once. It is written against the row ids, not against the
      // colours, so it sharpens by itself the day the two rows differ.
      const built = drawn(
        paletteShowing(command({ icon: IC_LIGHTNING_LINE, isArmed: true, isPressed: true })),
        preference,
      )
      const entry = entranceIn(built, IC_LIGHTNING_LINE)
      const fills = [...groundsIn(built, entry)].filter((one) =>
        [t236(fillRowOf('EN-1'), preference), t236(fillRowOf('EN-2'), preference)].includes(one),
      )

      expect(fills, `one fill, and it is EN-1's: ${whatWasDrawn(entry)}`).toEqual([
        t236(fillRowOf('EN-1'), preference),
      ])
    })
  }
})

// ===========================================================================
// The entrance that is drawn faint
// ===========================================================================

describe('FR-029 (MUST NOT) -- the fill is not applied to an entrance drawn faint', () => {
  for (const preference of THEMES) {
    it(`an entrance that can change nothing is not filled, even while armed (${preference})`, () => {
      // ⛔ 「上の薄く描く入口には当ててはならない（MUST NOT）」 —— 「効いていて、かつ
      // いま何も変えられない入口が濃くなると、薄さの意味が消える。」
      const built = drawn(
        paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isEnabled: false, isArmed: true })),
        preference,
      )
      const entry = entranceIn(built, IC_ARMS_A_DEPENDENCY)

      expect(
        [...groundsIn(built, entry)],
        `a faint entrance carries no fill: ${whatWasDrawn(entry)}`,
      ).not.toContain(t236(fillRowOf('EN-1'), preference))
    })

    it(`a faint entrance is still drawn in S-149, the colour FR-029 gives it (${preference})`, () => {
      // 「薄さは 表 T-236 の `S-149` の色で示すこと（MUST）」. ⭐ WITHOUT THIS the
      // case above would pass on an entrance that had stopped being drawn faint
      // as well as stopping being filled.
      const built = drawn(
        paletteShowing(command({ icon: IC_ARMS_A_DEPENDENCY, isEnabled: false, isArmed: true })),
        preference,
      )
      const entry = entranceIn(built, IC_ARMS_A_DEPENDENCY)

      expect(
        [...glyphInks(built, entry)],
        `a faint entrance is drawn in S-149: ${whatWasDrawn(entry)}`,
      ).toContain(t236('S-149', preference))
    })
  }
})

// ===========================================================================
// ⚠️ NO CASE FOR EN-3 HERE. 表 T-237 hands that row to 表 T-051's `HF-6`, and the
// entrance it fills is a row control rather than a palette one, so it is held
// by tests/unit/t-051-hf-6-the-pinned-rows-pin-is-filled.test.ts.
// ===========================================================================
