// FR-053 (MUST): WHERE the grab band's two marks sit -- IC-53 at the band's
// RIGHT END, and IC-75 to the right of IC-53.
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062). It is the side of IF-9 that turns a `ScreenView` into
// nodes, so it is the side that PLACES anything -- UF-65
// (`command-palette.ts`) says the band is there and how far down it reaches,
// and places nothing.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE TWO LEDGER ROWS IT STANDS IN FOR
// ---------------------------------------------------------------------------
//
// `docs/development-records/defects.md` D-68 and D-103. Both marks are proved
// to EXIST on the band and neither is proved to be anywhere in particular:
//
//   tests/unit/uf-71.test.ts:2611          the minimised band carries IC-53 and
//                                          IC-75 -- `arrayContaining`, so the
//                                          two could be in either order, in
//                                          either box, at either end.
//   tests/unit/fr-053-minimised-shows-the-band-alone.test.ts:229
//                                          `palette.minimise.icon` is IC-75 --
//                                          the DESCRIPTION carries it, which
//                                          says nothing about the page.
//   tests/unit/fr-029-palette-grab-marker.test.ts:91
//                                          says outright, under 「WHAT IS
//                                          DELIBERATELY NOT ASSERTED」, that
//                                          WHERE the marker sits inside the
//                                          band is what no row stated when that
//                                          file was written, and names D-68.
//
// ⭐ A ROW NOW STATES IT. CR-273 put the sentence quoted below into FR-053 on
// 2026-08-28, so the refusal that file records is spent and this file is what
// replaces it. ⛔ The sentence is read out of the manuscript at run time by the
// first case here, so if it is ever withdrawn these cases say so in one line
// rather than going on asserting a rule that no longer exists.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-053   ⭐ 「掴み帯の右端に、掴めることを示す 表 T-109 の `IC-53` を置き、その
//            右に最小化の入口（同表の `IC-75`）を置くこと（MUST）。」
//            ⛔ 「帯そのものを取り去ってはならない（MUST NOT）」 —— 「掴める面が隅
//            の点だけになると、掴めない位置へ置けてしまったときに二度と動かせなく
//            なる」（表 T-023d の `GR-19` の理由）。
//            ⛔ 「最小化しているあいだに出すのは掴み帯だけとし、ほかは何も出さない
//            こと（MUST）」 —— 「帯には ... `IC-53` と、最小化の入口（同表の
//            `IC-75`）が載ったままである。」
//            ⚠️ 「その 2 つが載っても、帯の高さは ... `S-135a` のままである。」
//   T-109    IC-53 | `Command Palette` | 「掴んで動かせることを示す。**ボタンでは
//            ない**」 | `FR-053`
//            IC-75 | `Command Palette` | 「掴み帯の右端で、パレットを最小化し、
//            **同じ入口で戻す**（`S-200`）。⭐ **`IC-53` の右に並ぶ**（`FR-053`）」
//   GR-19    表 T-023d: 「`Command Palette` の掴み帯 | **パレットの上端に敷く帯**
//            （高さは ... `S-135a`）」 -- which is where the BAND goes; the
//            sentence above is where its marks go INSIDE it.
//   T-103    U-26 `Command Palette` -- the settled name that reaches the DOM as
//            a `data-role`.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for every rule above, and of `src/` NOT ONE FILE.
// The unit is reached through the declarations tests/unit/uf-71.test.ts and
// tests/unit/fr-029-in-effect-is-filled-not-rimmed.test.ts already import, and
// the fixtures (`EMPTY_VIEW`, `EMPTY_HEADER`, `command`, `PALETTE`) are copied
// from those two files, which drive this same unit against this same fake.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, each searched for before being given up
// ---------------------------------------------------------------------------
//
//   1. THAT IC-75 SAYS ITS OWN STATE -- pressed, `aria-pressed`, or any other
//      spelling. ⛔ NO ROW STATES IT. `aria-pressed` appears nowhere in
//      docs/spec (searched: 01-04-requirements.md, 05-07-design.md,
//      08-10-test.md, A-appendix.md, _assets/*.md -- the only ARIA attribute
//      named anywhere is `aria-expanded`, and that only inside A-appendix.md's
//      history of CR-263). ⛔ AND THE SPECIFICATION EXCLUDES THE SUBJECT: LM-2
//      of 表 T-004 says the tool does not claim WCAG 2.1 AA 「支援技術による読み
//      上げを対象外にしたため」. 表 T-237 states the five states an entrance is
//      PAINTED for, and none of its five rows is the minimise: `EN-5` is 「その
//      入口が表示・非表示を切り替えるものを、いま表示している」 and FR-053 says in
//      as many words 「非表示（`S-99e`）とは別の状態である —— 最小化は出ている状態
//      の一種であり」, so reading `EN-5` onto IC-75 would be minting a rule.
//      ⇒ Reported to the ledger, not asserted here.
//   2. HOW FAR APART the two marks are drawn, or what padding the band keeps at
//      its right edge. ⛔ No row states either. `S-135a` states the band's
//      HEIGHT and its own note says 「本行は帯の高さだけを定める」.
//   3. WHICH NODE of the band is 「帯」 in the manuscript's sense. No row names
//      one, so these cases take the band to be the child of the palette that
//      carries the marks, and say so where they do.
//   4. THE BAND'S OWN HEIGHT IN THE PAGE. `S-135a` reaches this unit through
//      `CommandPalette.grabBandHeight`, and tests/unit/uf-65.test.ts is the
//      bench that holds the described band to the manuscript.

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
  byRole,
  oneByRole,
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

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** The sentence CR-273 put into FR-053. ⛔ THE WHOLE GROUND OF THIS FILE. */
const THE_PLACEMENT_MUST =
  '掴み帯の右端に、掴めることを示す 表 T-109 の `IC-53` を置き、その右に最小化の入口（同表の `IC-75`）を置くこと（MUST）'

/** ⛔ The band may not be taken away to make room for the marks. */
const THE_BAND_STAYS = '帯そのものを取り去ってはならない（MUST NOT）'

/** U-26 of table T-103 -- the settled name that reaches the DOM as `data-role`. */
const U_26 = ((): string => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-26')
  if (row === undefined) throw new Error('table T-103 no longer has row U-26')
  return bare(row.by['確定名（英）'] ?? '')
})()

/** The two rows of table T-109 the sentence places, in the order it places them. */
const IC_GRAB_MARKER = 'IC-53'
const IC_MINIMISE = 'IC-75'

/**
 * What table T-109 says IC-75 is the entrance to, read rather than copied.
 *
 * ⚠️ `何の入口か` is the table's own heading (1.9 :274), checked here so that a
 * renamed column hands the premise below an empty string instead of passing.
 */
const IC_75_CELL = ((): string => {
  const table = specTable('T-109')
  const COLUMN = '何の入口か'
  if (!table.headings.includes(COLUMN)) {
    throw new Error(`table T-109 no longer has a ${COLUMN} column: ${table.headings.join(' | ')}`)
  }
  const row = table.rows.find((one) => one.id === IC_MINIMISE)
  if (row === undefined) throw new Error('table T-109 no longer has row IC-75')
  return row.by[COLUMN] ?? ''
})()

// ---------------------------------------------------------------------------
// Descriptions to draw. Every one is a value of `ScreenView` and nothing else.
// Copied from tests/unit/fr-029-in-effect-is-filled-not-rimmed.test.ts.
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

/**
 * A palette to draw.
 *
 * ⚠️ `grabBandHeight` IS THIS FILE'S OWN NUMBER and no case here means it: 表
 * T-206 states the height at `S-135a` and tests/unit/uf-65.test.ts is the bench
 * that holds a described band to it. What THIS unit owes the band is where the
 * two marks sit on it.
 */
const paletteWith = (patch: Partial<CommandPalette> = {}): CommandPalette =>
  ({
    at: { x: 400, y: 300 },
    grabBandHeight: 24,
    minimise: command({ icon: IC_MINIMISE }),
    isMinimised: false,
    groups: [
      {
        name: 'PaletteGroupOne',
        commands: [command({ icon: 'IC-61', label: 'PaletteCommandOne' })],
      } as PaletteGroup,
    ],
    armedText: 'ArmedWordHere',
    ...patch,
  }) as CommandPalette

/** The App Header measures to something, so BO-1's dimension is settled. */
const HEADER_HEIGHT = { 'App Header': 37 }

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

/** Draw one palette and hand back the stage. */
function drawn(palette: CommandPalette): { built: Stage; palette: FakeElement } {
  const built = wire(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView(viewWith({ commandPalette: palette }))
  return { built, palette: oneByRole(built.root(), U_26) }
}

// ---------------------------------------------------------------------------
// Reading the placement back
// ---------------------------------------------------------------------------

/** Every node under this one carrying a row of table T-109. */
const marksIn = (root: FakeElement): FakeElement[] =>
  selfAndDescendants(root).filter((one) => one.getAttribute('data-icon') !== null)

/** The one node carrying this row of table T-109, with the tree in the failure. */
function markOf(root: FakeElement, icon: string): FakeElement {
  const found = marksIn(root).filter((one) => one.getAttribute('data-icon') === icon)
  const first = found[0]
  if (first === undefined) {
    throw new Error(`nothing under this part carries data-icon="${icon}": ${whatWasDrawn(root)}`)
  }
  if (found.length !== 1) throw new Error(`${found.length} nodes carry data-icon="${icon}"`)
  return first
}

/**
 * 「帯」 -- the child of the palette that carries this mark.
 *
 * ⭐ FOUND BY WHAT IT HOLDS, NOT BY A NAME. No row of the specification names a
 * node for the band, so a case that looked one up by a `data-role` would be
 * asserting a spelling nobody settled. What the manuscript does settle is that
 * the band lies along the palette's top edge (GR-19) and that these two marks
 * ride on it, so the palette's own child that contains them is the band.
 */
function bandHolding(palette: FakeElement, mark: FakeElement): FakeElement {
  let at: FakeElement | null = mark
  while (at !== null && at.parentNode !== palette) at = at.parentNode
  if (at === null) {
    throw new Error(`this mark is not inside the palette at all: ${whatWasDrawn(palette)}`)
  }
  return at
}

/** Document order under one node -- what a page reads left to right, then down. */
const orderIn = (root: FakeElement): FakeElement[] => selfAndDescendants(root)

/**
 * 「右端に」, however a box states it.
 *
 * ⭐ EVERY SPELLING A BROWSER HONOURS IS ACCEPTED, because no row of the
 * specification says WHICH property may push a mark to the end of its band, and
 * a case that demanded one would be asserting a mechanism the manuscript never
 * chose. What every accepted spelling has in common is that the content ends at
 * the band's right edge rather than at its middle or its left:
 *
 *   * the band lays its content out at the end   (`justify-content`,
 *     `text-align`, `place-content`, `justify-items`)
 *   * the mark pushes itself there               (`margin-left: auto`)
 *   * the mark is placed against the right edge  (`position` + `right`, with no
 *     `left` to contradict it)
 *   * the mark floats right                      (`float: right`)
 *
 * ⛔ A BOX THAT STATES NOTHING DOES NOT COUNT. Default flow puts content at the
 * LEFT, so silence is not the right end -- it is the wrong one.
 */
const ENDS_RIGHT = new Set(['right', 'end', 'flex-end', 'last baseline'])

function pushedToTheRightEnd(mark: FakeElement, band: FakeElement): boolean {
  let at: FakeElement | null = mark
  while (at !== null) {
    const declared = styleMap(at)
    const value = (name: string): string => (declared.get(name) ?? '').trim().toLowerCase()

    if (value('float') === 'right') return true
    if (value('margin-left') === 'auto' && value('margin-right') !== 'auto') return true
    if (value('margin') !== '' && /^auto\s+0/.test(value('margin'))) return true
    if (
      value('right') !== '' &&
      value('left') === '' &&
      ['absolute', 'fixed', 'relative', 'sticky'].includes(value('position'))
    ) {
      return true
    }
    for (const name of ['justify-content', 'text-align', 'place-content', 'justify-items']) {
      const stated = value(name)
      if (stated !== '' && ENDS_RIGHT.has(stated)) return true
      // ⚠️ A box that says where its content goes and says something ELSE
      // (`center`, `flex-start`, `space-between`) has answered the question,
      // and the answer is not the right end. Keep walking only past silence.
      if (stated !== '' && at === band) return false
    }
    if (at === band) return false
    at = at.parentNode
  }
  return false
}

/** Everything a failure needs to be read without opening the unit. */
const howItWasLaidOut = (band: FakeElement): string =>
  selfAndDescendants(band)
    .map((one) => {
      const named = one.getAttribute('data-icon') ?? one.getAttribute('data-role') ?? one.tagName
      return `${named}{${[...styleMap(one)].map(([k, v]) => `${k}:${v}`).join(';')}}`
    })
    .join(' ; ')

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscripts still say what these cases read', () => {
  it('⭐ FR-053 still places IC-53 at the band’s right end and IC-75 to its right', () => {
    // ⛔ THE GROUND OF THIS WHOLE FILE, read rather than typed. CR-273 wrote
    // this sentence on 2026-08-28 and it is the one row that settles a question
    // tests/unit/fr-029-palette-grab-marker.test.ts had to refuse. If it is
    // ever withdrawn, every case below is asserting a rule that no longer
    // exists, and this line is what says so.
    // GOES RED IF: the sentence leaves FR-053.
    expect(REQUIREMENTS).toContain(THE_PLACEMENT_MUST)
    expect(REQUIREMENTS).toContain(THE_BAND_STAYS)
  })

  it('⭐ table T-109 still says the same of IC-75, so the two do not disagree', () => {
    // ⚠️ A ROW AND A REQUIREMENT SAYING THE SAME THING IS WORTH CHECKING, not
    // because either is the copy, but because these cases would be driven by
    // one of two rules that had drifted apart without anyone noticing.
    // GOES RED IF: table T-109's IC-75 stops naming the band's right end, or
    // stops putting it beside IC-53.
    expect(IC_75_CELL).toContain('掴み帯の右端')
    expect(IC_75_CELL).toContain('IC-53')
  })

  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG TABLE WOULD MAKE THE
    // CASES ABOVE AGREE WITH ANYTHING -- rule 04 section 2.
    expect(U_26).toBe('Command Palette')
    expect(IC_75_CELL.length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// D-68 -- where the two marks sit on the band
// ===========================================================================

describe('FR-053 (MUST) -- the band carries IC-53 and IC-75, and nothing else', () => {
  it('⭐ both marks are drawn, on ONE band, which is a child of the palette', () => {
    // 「帯には ... `IC-53` と、最小化の入口（同表の `IC-75`）が載ったままである」.
    // ⭐ THIS IS ALSO WHAT D-103 OWES: nothing anywhere asked where IC-75 is
    // DRAWN. `CommandPalette.minimise` carries it in the description
    // (tests/unit/fr-053-minimised-shows-the-band-alone.test.ts:229) and
    // tests/unit/uf-65.test.ts holds it OUT of `groups` -- so until this case,
    // a unit that had described the minimise entrance and then drawn it nowhere
    // at all passed every bench in the tree.
    // GOES RED IF: either mark is missing, or the two land on different boxes.
    const { palette } = drawn(paletteWith())

    const grab = markOf(palette, IC_GRAB_MARKER)
    const minimise = markOf(palette, IC_MINIMISE)

    expect(bandHolding(palette, grab), 'one band carries both marks').toBe(
      bandHolding(palette, minimise),
    )
  })

  it('⛔ IC-75 rides on the band and not among the palette’s entries (D-103)', () => {
    // 「掴み帯の右端で、パレットを最小化し」（表 T-109 の `IC-75`）. ⚠️ 表 T-109
    // gives IC-75 no 群, and FR-053 keeps the entries out of the band -- so the
    // minimise entrance may not be drawn inside the box the entries are laid in.
    // GOES RED IF: the minimise entrance is drawn as one more command in a
    // group, which is the shape it would take if it were laid out with them.
    const { built, palette } = drawn(paletteWith())

    const minimise = markOf(palette, IC_MINIMISE)
    for (const role of ['Palette Groups', 'Palette Commands']) {
      for (const box of byRole(built.root(), role)) {
        expect(
          selfAndDescendants(box).includes(minimise),
          `IC-75 is not inside a ${role} box`,
        ).toBe(false)
      }
    }
  })

  it('⛔ MUST: IC-53 sits at the band’s RIGHT END', () => {
    // 「掴み帯の右端に、掴めることを示す 表 T-109 の `IC-53` を置き」.
    // ⚠️ WHAT THIS SEAM CAN SEE is what the unit WROTE, and there is no layout
    // engine here to ask where a box landed -- so what is asked is that the
    // band, or the mark itself, states that the content ends at the right edge.
    // Every spelling a browser honours is accepted (see `pushedToTheRightEnd`);
    // stating nothing is not one of them, because default flow puts content at
    // the LEFT.
    // GOES RED IF: the mark is left where the flow puts it, or centred.
    const { palette } = drawn(paletteWith())

    const grab = markOf(palette, IC_GRAB_MARKER)
    const band = bandHolding(palette, grab)

    expect(
      pushedToTheRightEnd(grab, band),
      `IC-53 is not put at the band's right end: ${howItWasLaidOut(band)}`,
    ).toBe(true)
  })

  it('⛔ MUST: IC-75 comes after IC-53, which is what 「その右に」 means', () => {
    // 「その右に最小化の入口（同表の `IC-75`）を置くこと（MUST）」, and 表 T-109's
    // own cell for IC-75: 「`IC-53` の右に並ぶ」.
    // ⚠️ WHAT THIS SEAM CAN SEE IS THE ORDER THE NODES WERE PUT IN, which is
    // left-to-right for the writing direction this band is drawn in. A band
    // that put IC-75 first and pulled it back with `order` or `row-reverse`
    // would pass this case and fail a reader -- reported, not asserted, because
    // no row settles which property may place the band's marks.
    // GOES RED IF: the two are drawn the other way round.
    const { palette } = drawn(paletteWith())

    const band = bandHolding(palette, markOf(palette, IC_GRAB_MARKER))
    const order = orderIn(band)

    const grabAt = order.indexOf(markOf(band, IC_GRAB_MARKER))
    const minimiseAt = order.indexOf(markOf(band, IC_MINIMISE))

    expect(grabAt).toBeGreaterThanOrEqual(0)
    expect(minimiseAt, `the band reads ${howItWasLaidOut(band)}`).toBeGreaterThan(grabAt)
  })

  it('⛔ nothing of table T-109 is drawn to the right of IC-75 on the band', () => {
    // 「その右に最小化の入口 ... を置くこと（MUST）」 -- IC-75 is the last thing the
    // sentence puts on the band, so a third mark after it is a mark the
    // sentence did not place. ⚠️ It asks only about ROWS OF 表 T-109: whether a
    // band may carry anything else at all is settled by FR-053 for the
    // MINIMISED state only, and tests/unit/uf-71.test.ts:2611 holds that.
    // GOES RED IF: a further entrance is appended to the band.
    const { palette } = drawn(paletteWith())

    const band = bandHolding(palette, markOf(palette, IC_GRAB_MARKER))
    const drawnMarks = marksIn(band).map((one) => one.getAttribute('data-icon'))

    expect(drawnMarks, `the band reads ${howItWasLaidOut(band)}`).toEqual([
      IC_GRAB_MARKER,
      IC_MINIMISE,
    ])
  })
})

// ===========================================================================
// The same band, minimised -- FR-053 says the two marks stay on it
// ===========================================================================

describe('FR-053 (MUST) -- minimising moves neither mark', () => {
  const MINIMISED = paletteWith({ isMinimised: true, groups: [], armedText: null })

  it('⭐ the band still carries both, in the same order', () => {
    // 「最小化しているあいだに出すのは掴み帯だけとし ... 帯には ... `IC-53` と、
    //   最小化の入口（同表の `IC-75`）が載ったままである」.
    // ⚠️ tests/unit/uf-71.test.ts:2611 already asks that BOTH ARE THERE, with
    // `arrayContaining`, which passes in either order. This asks the order.
    // GOES RED IF: the minimised band draws them the other way round, or drops
    // one of them.
    const { palette } = drawn(MINIMISED)

    const band = bandHolding(palette, markOf(palette, IC_GRAB_MARKER))
    const drawnMarks = marksIn(band).map((one) => one.getAttribute('data-icon'))

    expect(drawnMarks, `the minimised band reads ${howItWasLaidOut(band)}`).toEqual([
      IC_GRAB_MARKER,
      IC_MINIMISE,
    ])
  })

  it('⛔ MUST: IC-53 is still at the right end when the palette is minimised', () => {
    // ⚠️ FR-053 states the placement once, for the band, and carves out no
    // exception for the minimised state -- the state's own sentence says the
    // two marks 「載ったままである」.
    // GOES RED IF: the minimised band lays its marks out differently from the
    // shown one, which is the drift a second layout path would bring.
    const { palette } = drawn(MINIMISED)

    const grab = markOf(palette, IC_GRAB_MARKER)
    const band = bandHolding(palette, grab)

    expect(
      pushedToTheRightEnd(grab, band),
      `IC-53 is not put at the band's right end: ${howItWasLaidOut(band)}`,
    ).toBe(true)
  })
})
