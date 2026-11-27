// Contract tests: the Properties Panel draws no second swatch in front of the color control.

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
import { bare, specTable } from './spec-table'

const T_016 = specTable('T-016')

const INPUT_KIND_COLUMN = '入力の型'

const ITEM_NAME_COLUMN = '列（`GRS JSON`）'

const COLOR_WORD = '色'

const namesIn = (cell: string): readonly string[] =>
  [...cell.matchAll(/`([^`]+)`/g)].map((one) => one[1] as string)

const kindsIn = (cell: string): readonly string[] =>
  bare(cell)
    .split('/')
    .map((one) => one.trim())
    .filter((one) => one.length > 0)

// Why: it throws rather than fall back on a name of its own, so a table with no color
// item stops the run instead of passing it.
const COLOR_ITEM = ((): { readonly row: string; readonly column: string } => {
  for (const row of T_016.rows) {
    const kinds = kindsIn(row.by[INPUT_KIND_COLUMN] ?? '')
    const columns = namesIn(row.by[ITEM_NAME_COLUMN] ?? '')
    const at = kinds.indexOf(COLOR_WORD)
    if (at < 0) continue
    const column = columns[at] ?? columns[0]
    if (column === undefined) continue
    return { row: row.id, column }
  }
  throw new Error(`table T-016 no longer names an item whose ${INPUT_KIND_COLUMN} is ${COLOR_WORD}`)
})()

const U_25 = bare(
  specTable('T-103').rows.find((one) => one.id === 'U-25')?.by['確定名（英）'] ?? '',
)

// Why: the theme reaches the tree as var(--gr-...) properties, so this literal can be
// in the tree only because the description carried it.
const THE_COLOR = '#123456'

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  tooltips: [],
}

// Why: the holder is made up on purpose: which holder owns a color item is UF-64's
// business, and the drawing side reads no meaning from the key.
const COLOR_CONTROL: PropertyControl = {
  key: { holder: 'taskVisual', uid: 1, column: COLOR_ITEM.column } as unknown as
    PropertyControl['key'],
  kind: 'color',
  text: THE_COLOR,
  choices: null,
  min: null,
  max: null,
  widthInFontSizes: 8,
}

// Why: the field carries the color in text as well, so a panel that painted the
// field's own text ahead of the control is caught.
const COLOR_FIELD: PropertyField = {
  row: COLOR_ITEM.row,
  name: COLOR_ITEM.column,
  text: THE_COLOR,
  isEditable: true,
  controls: [COLOR_CONTROL],
}

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

// Why: the App Header must measure to something, or BO-1's dimension is unsettled.
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
    propertiesPanel: panelWith([COLOR_FIELD]),
  })
  return oneByRole(built.root(), U_25)
}

const CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const controlsIn = (panel: FakeElement): FakeElement[] =>
  selfAndDescendants(panel).filter((one) => CONTROL_TAGS.has(one.tagName))

// Why: every carrier (own text, attributes, value, inline style) is read, so a swatch
// painted through a property other than the expected one still fails.
// Trap: reading textContent instead of the own text children credits a parent with
// every word beneath it.
function showsTheColor(element: FakeElement): boolean {
  const carries = (written: string): boolean =>
    written.toLowerCase().includes(THE_COLOR.toLowerCase())

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

const describeNode = (element: FakeElement): string =>
  `${element.tagName}[${element.getAttribute('data-role') ?? '-'}]` +
  `{${[...styleMap(element)].map(([name, written]) => `${name}: ${written}`).join('; ')}}` +
  `(value=${String(element.value)})`

// Spec: T-016, S-188, U-25
describe('the manuscript still says what these cases read', () => {
  it('⭐ table T-016 still names an item whose 入力の型 is 色', () => {
    // Why: without this, a parse that picked up the wrong column lets the cases below agree with anything.
    expect(COLOR_ITEM.row).toMatch(/^PR-\d+$/)
    expect(COLOR_ITEM.column.length).toBeGreaterThan(0)
    expect(kindsIn(T_016.rows.find((one) => one.id === COLOR_ITEM.row)?.by[INPUT_KIND_COLUMN] ?? ''))
      .toContain(COLOR_WORD)
  })

  it('⭐ FR-006 still forbids the value in front of the control, and S-188 still sends it there', () => {
    const requirements = specTable('T-206').rows.find((one) => one.id === 'S-188')
    expect(requirements, 'table T-206 no longer holds S-188').toBeDefined()
    expect(
      (requirements?.cells ?? []).join(' '),
      'S-188 no longer hands the count to FR-006',
    ).toContain('FR-006')
    expect(U_25).toBe('Properties Panel')
  })
})

// Spec: FR-006, IMPS-69
// Why: FR-038 puts the panel in the chosen language and no table holds its words, so
// no case asserts a word shown to a person.
describe('FR-006 (MUST NOT) -- no second swatch stands in front of the color control', () => {
  it('⭐ draws one control for the color item, or the rule below is asked of nothing', () => {
    // Why: without a control nothing can stand in front of it, and a panel that drew
    // nothing at all would pass the MUST NOT.
    const panel = drawnPanel()

    expect(controlsIn(panel), whatWasDrawn(panel)).toHaveLength(1)
  })

  it('⛔ MUST NOT: nothing but the control itself puts the color on the screen', () => {
    // Why: the control's ancestors are left out, and only they: a box that wraps the
    // control is not a second painting of the value.
    const panel = drawnPanel()
    const control = controlsIn(panel)[0] as FakeElement
    const exempt = new Set<FakeElement>([control, ...ancestorsOf(control)])

    const painting = selfAndDescendants(panel).filter(
      (one) => !exempt.has(one) && showsTheColor(one),
    )

    expect(painting.map(describeNode), whatWasDrawn(panel)).toEqual([])
  })

  it('⛔ MUST NOT: nothing showing the color opens BEFORE the control', () => {
    // Why: in front is read as document order, which normal flow paints in, so a swatch
    // between the item's name and its control fails whatever it is painted with.
    const panel = drawnPanel()
    const order = selfAndDescendants(panel)
    const control = controlsIn(panel)[0] as FakeElement
    const controlAt = order.indexOf(control)
    expect(controlAt, 'the control is somewhere in the panel').toBeGreaterThanOrEqual(0)
    const exempt = new Set<FakeElement>([control, ...ancestorsOf(control)])

    const before = order
      .slice(0, controlAt)
      .filter((one) => !exempt.has(one) && showsTheColor(one))

    expect(before.map(describeNode), whatWasDrawn(panel)).toEqual([])
  })
})
