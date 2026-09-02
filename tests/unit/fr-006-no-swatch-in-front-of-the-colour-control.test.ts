// FR-006's MUST NOT on the `Properties Panel`: the current value is not drawn
// a second time in front of the control that already shows it.
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062, published as PI-38 of table T-064). It is the side of
// IF-9 that turns a `ScreenView` into nodes, so it is the only side that could
// put a second box in front of a control at all -- UF-64 (`properties-panel.ts`,
// CP-37) says WHICH items the panel holds, and holds no opinion about how many
// times one of them is painted.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so this case has no node in
// the specification. Table T-218 of Chapter 7 gives it its place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The rule this file answers to, quoted
// ---------------------------------------------------------------------------
//
//   FR-006  ⛔「**現在の値を、その値を示す操作子の手前に重ねて描いてはならない
//          （MUST NOT）**（利用者の指摘 2026-08-27）—— **色を選ぶ操作子は現在の色
//          を自ら示すので、その手前に色見本を置くと同じ色が 2 つ並ぶ。**⭐ **`_assets/
//          tbl-settings.md` の `S-188` が持つのは見本の寸法であって、何回描いてよい
//          かではない。**」
//   S-188  表 T-206:「色見本の一辺と隙間（`FR-006`）… ⭐ **本行が持つのは見本の
//          寸法だけである** —— **何回描いてよいかは `FR-006` が持つ。**」 ⭐ READ
//          HERE ONLY FOR THAT SENTENCE: the row is what sends the question to
//          FR-006, and its 14 x 3px is not asserted anywhere below.
//   T-016  the 入力の型 column, which is where a 色 item is named. ⭐ The row this
//          file drives is TAKEN FROM THE TABLE at read time, so a table that
//          renamed or moved its colour item moves this case with it.
//   T-103  `U-25`, the settled name `Properties Panel`, which W-4 of table
//          T-006a (MUST) carries into the DOM as a `data-role`.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for every rule above, and tests/ for the shared
// fake browser. ⛔ NO `src/` FILE WAS READ -- not which element a control
// becomes, not which property a swatch would have been painted with. The one
// colour below is this file's own and names nothing in the manuscript.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT THIS FILE DOES AND DOES NOT CLAIM
// ---------------------------------------------------------------------------
//
//   1. 「手前に」 IS READ AS DOCUMENT ORDER, which is what a browser paints in
//      normal flow. A box drawn AFTER the control is not asserted about: the
//      rule forbids the value being put in FRONT of the control, and a case
//      about anything else would be this file widening it.
//   2. THE CONTROL'S OWN ANCESTORS ARE EXEMPT. A box that WRAPS the control
//      opens before it in document order but is not a second painting of the
//      value -- and a wrapper that declared the colour (to tint a frame, say)
//      is not the 「同じ色が 2 つ並ぶ」 the rationale describes.
//   3. NOTHING IS ASSERTED ABOUT THE SWATCH'S SIZE. `S-188`'s own remark hands
//      the count to FR-006 and keeps only the dimension, so a case measuring
//      14 x 3px would be answering a question that row does not ask.
//   4. NO WORD SHOWN TO A PERSON IS ASSERTED. FR-038 puts the panel in the
//      chosen language and no table holds a translated string; every word below
//      is this file's own.

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  PropertiesPanel,
  PropertyControl,
  PropertyField,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  FakeText,
  oneByRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

const T_016 = specTable('T-016')

/** Table T-016's own heading for the column FR-006's paragraph makes a MUST. */
const INPUT_KIND_COLUMN = '入力の型'

/** Table T-016's own heading for the `GRS JSON` column that names an item. */
const ITEM_NAME_COLUMN = '列（`GRS JSON`）'

/** The word table T-016 writes in 入力の型 for an item whose value is a colour. */
const COLOUR_WORD = '色'

/** Every code span in a cell, so a row carrying several columns gives them all. */
const namesIn = (cell: string): readonly string[] =>
  [...cell.matchAll(/`([^`]+)`/g)].map((one) => one[1] as string)

/** The parts of an 入力の型 cell, one per column the row carries. */
const kindsIn = (cell: string): readonly string[] =>
  bare(cell)
    .split('/')
    .map((one) => one.trim())
    .filter((one) => one.length > 0)

/**
 * The first item of table T-016 whose value is a colour, taken FROM THE TABLE.
 *
 * ⛔ It throws rather than falling back on a name of its own: FR-006's MUST NOT
 * is aimed at 「色を選ぶ操作子」, so a table with no colour item leaves this file
 * with nothing to ask, and that must stop the run rather than pass it.
 */
const COLOUR_ITEM = ((): { readonly row: string; readonly column: string } => {
  for (const row of T_016.rows) {
    const kinds = kindsIn(row.by[INPUT_KIND_COLUMN] ?? '')
    const columns = namesIn(row.by[ITEM_NAME_COLUMN] ?? '')
    const at = kinds.indexOf(COLOUR_WORD)
    if (at < 0) continue
    const column = columns[at] ?? columns[0]
    if (column === undefined) continue
    return { row: row.id, column }
  }
  throw new Error(`table T-016 no longer names an item whose ${INPUT_KIND_COLUMN} is ${COLOUR_WORD}`)
})()

/** U-25 of table T-103 -- the settled name that reaches the DOM as `data-role`. */
const U_25 = bare(
  specTable('T-103').rows.find((one) => one.id === 'U-25')?.by['確定名（英）'] ?? '',
)

// ---------------------------------------------------------------------------
// The description to draw. Every value is a member of `ScreenView`.
// ---------------------------------------------------------------------------

/**
 * The colour the panel is asked to show.
 *
 * ⭐ THIS FILE'S OWN, and deliberately unlike anything the surface paints by
 * itself: the theme reaches the tree as `var(--gr-...)` custom properties, so a
 * literal like this can only be in the tree because the DESCRIPTION carried it.
 */
const THE_COLOUR = '#123456'

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

/**
 * ⚠️ THE KEY IS MINTED AND NOTHING BELOW TURNS ON IT. Which holder a colour item
 * belongs to is table T-016's 対象 column and is UF-64's business; this file
 * drives the DRAWING side, which is handed a key and reads no meaning from it.
 */
const COLOUR_CONTROL: PropertyControl = {
  key: { holder: 'taskVisual', uid: 1, column: COLOUR_ITEM.column } as unknown as
    PropertyControl['key'],
  kind: 'color',
  text: THE_COLOUR,
  choices: null,
  min: null,
  max: null,
  widthInFontSizes: 8,
}

/**
 * ⭐ THE FIELD CARRIES THE COLOUR TWICE OVER, in `text` as well as on its
 * control. That is on purpose: a panel that painted the field's own `text` ahead
 * of the control would be exactly 「同じ色が 2 つ並ぶ」, and a fixture that left
 * `text` empty could not tell.
 */
const COLOUR_FIELD: PropertyField = {
  row: COLOUR_ITEM.row,
  name: COLOUR_ITEM.column,
  text: THE_COLOUR,
  isEditable: true,
  controls: [COLOUR_CONTROL],
}

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

/** The App Header measures to something, so BO-1's dimension is settled. */
const HEADER_HEIGHT = { 'App Header': 37 }

const panelWith = (fields: readonly PropertyField[]): PropertiesPanel =>
  ({
    showing: 'selection',
    isSubjectGone: false,
    fields,
    commands: [],
  }) as PropertiesPanel

function drawnPanel(): FakeElement {
  const built = wire(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView({
    ...EMPTY_VIEW,
    propertiesPanel: panelWith([COLOUR_FIELD]),
  })
  return oneByRole(built.root(), U_25)
}

// ---------------------------------------------------------------------------
// Reading the answer back
// ---------------------------------------------------------------------------

/** The controls a person edits a field through -- a form element, and nothing else. */
const CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const controlsIn = (panel: FakeElement): FakeElement[] =>
  selfAndDescendants(panel).filter((one) => CONTROL_TAGS.has(one.tagName))

/**
 * Whether this node itself puts the colour on the screen.
 *
 * ⭐ EVERY WAY A NODE COULD CARRY IT IS LOOKED AT, and none is named as THE way:
 * its own words, its attributes, the value a form control holds, and every
 * declaration of its inline style. ⛔ A case that named one property could be
 * satisfied by a swatch painted through another.
 * ⚠️ Text is read from this node's OWN text children rather than from
 * `textContent`, which would credit a parent with every word beneath it.
 */
function showsTheColour(element: FakeElement): boolean {
  const carries = (written: string): boolean =>
    written.toLowerCase().includes(THE_COLOUR.toLowerCase())

  for (const child of element.childNodes) {
    if (child instanceof FakeText && carries(child.data)) return true
  }
  for (const [, written] of element.attributes) {
    if (carries(String(written))) return true
  }
  if (carries(String(element.value))) return true
  for (const [, written] of styleMap(element)) {
    if (carries(written)) return true
  }
  return false
}

const ancestorsOf = (element: FakeElement): FakeElement[] => {
  const chain: FakeElement[] = []
  let at: FakeElement | null = element.parentNode
  while (at !== null) {
    chain.push(at)
    at = at.parentNode
  }
  return chain
}

/** Everything a failure can be read from without opening the unit. */
const describeNode = (element: FakeElement): string =>
  `${element.tagName}[${element.getAttribute('data-role') ?? '-'}]` +
  `{${[...styleMap(element)].map(([name, written]) => `${name}: ${written}`).join('; ')}}` +
  `(value=${String(element.value)})`

// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ table T-016 still names an item whose 入力の型 is 色', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG COLUMN WOULD LET THE
    // CASES BELOW AGREE WITH ANYTHING (rule 04 section 2).
    expect(COLOUR_ITEM.row).toMatch(/^PR-\d+$/)
    expect(COLOUR_ITEM.column.length).toBeGreaterThan(0)
    expect(kindsIn(T_016.rows.find((one) => one.id === COLOUR_ITEM.row)?.by[INPUT_KIND_COLUMN] ?? ''))
      .toContain(COLOUR_WORD)
  })

  it('⭐ FR-006 still forbids the value in front of the control, and S-188 still sends it there', () => {
    // ⛔ The two sentences this whole file rests on, read rather than trusted.
    const requirements = specTable('T-206').rows.find((one) => one.id === 'S-188')
    expect(requirements, 'table T-206 no longer holds S-188').toBeDefined()
    expect(
      (requirements?.cells ?? []).join(' '),
      'S-188 no longer hands the count to FR-006',
    ).toContain('FR-006')
    expect(U_25).toBe('Properties Panel')
  })
})

describe('FR-006 (MUST NOT) -- no second swatch stands in front of the colour control', () => {
  it('⭐ draws one control for the colour item, or the rule below is asked of nothing', () => {
    // ⛔ WITHOUT A CONTROL there is nothing for a swatch to stand in front of,
    // and the MUST NOT would be satisfied by a panel that drew nothing at all.
    const panel = drawnPanel()

    expect(controlsIn(panel), whatWasDrawn(panel)).toHaveLength(1)
  })

  it('⛔ MUST NOT: nothing but the control itself puts the colour on the screen', () => {
    // FR-006:「⛔ **現在の値を、その値を示す操作子の手前に重ねて描いてはならない
    // （MUST NOT）** —— **色を選ぶ操作子は現在の色を自ら示すので、その手前に色見本
    // を置くと同じ色が 2 つ並ぶ。**」
    // ⭐ THE CONTROL'S ANCESTORS ARE LEFT OUT, and only they: a box that WRAPS
    // the control is not a second painting of the value (see point 2 of the head
    // comment). Everything else in the panel that carries the colour is a
    // second one.
    const panel = drawnPanel()
    const control = controlsIn(panel)[0] as FakeElement
    const exempt = new Set<FakeElement>([control, ...ancestorsOf(control)])

    const painting = selfAndDescendants(panel).filter(
      (one) => !exempt.has(one) && showsTheColour(one),
    )

    expect(painting.map(describeNode), whatWasDrawn(panel)).toEqual([])
  })

  it('⛔ MUST NOT: nothing showing the colour opens BEFORE the control', () => {
    // The same MUST NOT read at its own word -- 「手前に」. ⭐ Asked as document
    // order, which is what normal flow paints in, so a swatch put where the
    // removed one stood (between the item's name and its control) fails here
    // whatever it was painted with.
    const panel = drawnPanel()
    const order = selfAndDescendants(panel)
    const control = controlsIn(panel)[0] as FakeElement
    const controlAt = order.indexOf(control)
    expect(controlAt, 'the control is somewhere in the panel').toBeGreaterThanOrEqual(0)
    const exempt = new Set<FakeElement>([control, ...ancestorsOf(control)])

    const before = order
      .slice(0, controlAt)
      .filter((one) => !exempt.has(one) && showsTheColour(one))

    expect(before.map(describeNode), whatWasDrawn(panel)).toEqual([])
  })
})
