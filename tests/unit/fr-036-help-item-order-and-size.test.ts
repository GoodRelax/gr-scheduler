// Unit tests: a help item draws glyph, explanation, then assignment, at the S-203 ratio.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  OpenModal,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  FakeText,
  oneByRole,
  selfAndDescendants,
  stage,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wiringOf,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
// Why: the contract reader takes its copy from the .md at read time, so a
// ratio that moves in table T-206 moves here too.
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const THE_ORDER_MUST =
  '`GRS` は、一覧の各項目に、入口の図形・項目の行の説明・項目の行の割当の 3 つを、この順に並べること。'

const THE_SIZE_MUST = '`GRS` は、一覧の字の大きさを `_assets/tbl-settings.md` の 表 T-206 の `S-203` が定める係数で決めること。'

const T_206 = specTable('T-206')
const VALUE_COLUMN = '既定'

if (!T_206.headings.includes(VALUE_COLUMN)) {
  throw new Error(`table T-206 no longer has a ${VALUE_COLUMN} column: ${T_206.headings.join(' | ')}`)
}

function cellOf(id: string): string {
  const row = T_206.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 no longer has row ${id}`)
  return bare(row.by[VALUE_COLUMN] ?? '')
}

// Why: the cells carry a mark beside the number, so the number is read out of the cell.
function numberOf(id: string): number {
  const written = cellOf(id)
  const found = /-?\d+(?:\.\d+)?/.exec(written)
  if (found === null) throw new Error(`table T-206's ${id} states no number: ${written}`)
  return Number.parseFloat(found[0] as string)
}

const S_203 = numberOf('S-203')

const FONT_SIZE_STEP_SIZES = ((): readonly number[] => {
  const table = specTable('T-215')
  return ['S-121', 'S-122', 'S-123'].map((id) => {
    const row = table.rows.find((one) => one.id === id)
    if (row === undefined) throw new Error(`table T-215 no longer has row ${id}`)
    return Number.parseFloat(bare(row.by['値'] ?? ''))
  })
})()

const U_30_HELP = ((): string => {
  const table = specTable('T-103')
  const row = table.rows.find((one) => one.id === 'U-30')
  if (row === undefined) throw new Error('table T-103 no longer has row U-30')
  // Why: U-30's cell names two surfaces, so it is read as a list; splitting its
  // first span on '/' read one name as two.
  const written = bareAll(row.by['確定名（英）'] ?? '')
  const found = written.find((one) => one.includes('Help'))
  if (found === undefined) {
    throw new Error(`table T-103's U-30 names no help surface: ${written.join(' / ')}`)
  }
  return found
})()

const command = (patch: Partial<CommandItem> & { icon: string }): CommandItem => ({
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: patch.icon,
  ...patch,
})

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

// Why: the words are all distinct, so no case can confuse two parts.
const EXPLANATION = 'HelpExplanationHere'
const KEYS = 'Ctrl+Shift+K'
// Why: the adapter joins keys and press with the ja word of keyNotation; the help here is ja.
const JA_JOIN = ' \uff0f '
const PRESS = 'HelpMousePressHere'

// Why: not IC-52, which is the help's own close entrance.
const ITEM_ICON = 'IC-20'

const CLOSE_ICON = 'IC-52'

const WHEEL_ICON = 'IC-102'

// Why: spelled out, not read off the OpenModal union, where a member would not
// compile; the narrow cast lets a shape change fail a case, not the file.
interface HelpItem {
  readonly table: string
  readonly row: string
  readonly text: string
  readonly press: string | null
  readonly keys: string | null
  readonly assignment: string | null
  readonly icon: string | null
  readonly kind: string
  readonly block: string
  readonly segment: string | null
  readonly glyphs: readonly string[]
  readonly link: { readonly words: string; readonly address: string } | null
}

const entry = (patch: Partial<HelpItem> = {}): HelpItem => {
  const joined = [patch.keys ?? null, patch.press ?? null].filter((one): one is string => one !== null).join(JA_JOIN)
  return {
    table: 'T-036',
    row: 'SK-1',
    text: EXPLANATION,
    press: null,
    keys: null,
    assignment: joined === '' ? null : joined,
    icon: ITEM_ICON,
    kind: 'item',
    block: '',
    segment: null,
    glyphs: [ITEM_ICON],
    link: null,
    ...patch,
  }
}

const helpWith = (entries: readonly HelpItem[]): OpenModal =>
  ({
    surface: 'Help Modal',
    heading: 'HelpHeadingHere',
    commands: [command({ icon: CLOSE_ICON, label: 'CloseHelp' })],
    entries,
    legend: 'IC-102',
    language: 'ja',
    licenseText: 'LicenseTextHere',
    copyrightNotice: 'CopyrightNoticeHere',
    attributions: ['AttributionOne'],
    helpLegal: { licensedUnder: 'LicensedUnderHere', fullText: 'FullTextHere' },
    // Why: blockNotes is a required member of the Help Modal view; these cases do not read it.
    blockNotes: [],
    area: { belowAppHeader: { x: 0, y: 37, width: 1280, height: 763 } },
    downloadLink: { words: '', address: '' },
    aboutLink: { words: '', address: '' },
  }) as unknown as OpenModal

// Why: the App Header must measure to something for BO-1's dimension to settle.
const HEADER_HEIGHT = { 'App Header': 37 }

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

// Why: a DOM host offers createTextNode and the shared fake document does not, so it is added here.
function wireWithTextNodes(theme: ScreenTheme, heightsByRole: Record<string, number>): Stage {
  const built = stage(heightsByRole)
  Object.assign(built.host, { createTextNode: (data: string): FakeText => new FakeText(data) })
  built.surface = domScreenSurface(wiringOf(built, theme))
  return built
}

function drawn(entries: readonly HelpItem[]): { built: Stage; help: FakeElement } {
  const built = wireWithTextNodes(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, openModal: helpWith(entries) })
  return { built, help: oneByRole(built.root(), U_30_HELP) }
}

// Why: found by what it shows, not by a role: no table names a node for an
// item's explanation or for its assignment.
function theCellShowing(root: FakeElement, text: string): FakeElement {
  const showing = selfAndDescendants(root).filter((one) => one.textContent.includes(text))
  const innermost = showing.filter(
    (one) => !one.children.some((child) => child.textContent.includes(text)),
  )
  const first = innermost[0]
  if (first === undefined) {
    throw new Error(`nothing in the help shows ${JSON.stringify(text)}: ${whatWasDrawn(root)}`)
  }
  if (innermost.length !== 1) {
    throw new Error(`${innermost.length} separate nodes show ${JSON.stringify(text)}`)
  }
  return first
}

// Summary: The item box shall be the nearest node that holds both given parts.
function commonAncestor(one: FakeElement, other: FakeElement): FakeElement {
  const upwards = (from: FakeElement): FakeElement[] => {
    const chain: FakeElement[] = []
    let at: FakeElement | null = from
    while (at !== null) {
      chain.push(at)
      at = at.parentNode
    }
    return chain
  }
  const theirs = new Set(upwards(other))
  for (const at of upwards(one)) if (theirs.has(at)) return at
  throw new Error('two parts of one help item share no ancestor at all')
}

// Why: the glyph is found by the shape F-019 gives its row, not by an attribute,
// since no row says a help item's glyph carries a data-icon.
interface GlyphElement {
  readonly tag: string
}

const ICON_GLYPHS = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'dom-screen-surface', 'icon-glyphs.json'), 'utf8'),
) as {
  readonly glyphs: readonly { readonly specTableRowId: string; readonly elements: readonly GlyphElement[] }[]
}

function shapeOf(specTableRowId: string): readonly string[] {
  const found = ICON_GLYPHS.glyphs.find((one) => one.specTableRowId === specTableRowId)
  if (found === undefined) throw new Error(`図 F-019 draws no shape for ${specTableRowId}`)
  return found.elements.map((one) => one.tag.toUpperCase())
}

function theGlyphIn(item: FakeElement, specTableRowId: string): FakeElement {
  const wanted = shapeOf(specTableRowId).join(',')
  const drawnShapes = selfAndDescendants(item).filter((one) => one.tagName === 'SVG')
  const matching = drawnShapes.filter(
    (one) => selfAndDescendants(one).slice(1).map((part) => part.tagName).join(',') === wanted,
  )
  const first = matching[0]
  if (first === undefined) {
    throw new Error(
      `no shape in this item is 図 F-019's ${specTableRowId} (${wanted}): ${whatWasDrawn(item)}`,
    )
  }
  return first
}

// Summary: The splitter shall split a shorthand at the top level only, so calc() stays one value.
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

function declaredFontSize(element: FakeElement): string {
  const declared = styleMap(element)
  const longhand = (declared.get('font-size') ?? '').trim()
  if (longhand !== '') return longhand
  const shorthand = (declared.get('font') ?? '').trim()
  if (shorthand === '') return ''
  if (shorthand.toLowerCase() === 'inherit') return 'inherit'
  for (const part of shorthandParts(shorthand)) {
    const size = part.split('/')[0] ?? ''
    if (/^(calc\(|var\(|[.\d])/i.test(size)) return size
  }
  return ''
}

function customProperty(element: FakeElement, name: string): string | null {
  let at: FakeElement | null = element
  while (at !== null) {
    const held = styleMap(at).get(name)
    if (held !== undefined && held.trim() !== '') return held.trim()
    at = at.parentNode
  }
  return null
}

// Summary: The expander shall honour no var() fallback, so var(--x, 1em) is refused.
function expandVariables(element: FakeElement, value: string, depth = 0): string | null {
  if (depth > 8) return null
  const named = /var\(\s*(--[a-z0-9-]+)\s*\)/i.exec(value)
  if (named === null) return value
  const held = customProperty(element, named[1] as string)
  if (held === null) return null
  return expandVariables(element, value.replace(named[0] as string, `(${held})`), depth + 1)
}

// Why: px is admitted because these cases look for a px constant, and a resolver
// that refused px could not tell a fixed size from an unreadable one.
function lengthPx(expression: string, inheritedPx: number, basePx: number): number | null {
  const arithmetic = expression
    .trim()
    .toLowerCase()
    .replace(/\bcalc\b/g, '')
    .replace(/([\d.]+)\s*rem\b/g, (_whole, n: string) => `(${Number.parseFloat(n) * basePx})`)
    .replace(/([\d.]+)\s*em\b/g, (_whole, n: string) => `(${Number.parseFloat(n) * inheritedPx})`)
    .replace(/([\d.]+)\s*%/g, (_whole, n: string) => `(${(Number.parseFloat(n) / 100) * inheritedPx})`)
    .replace(/([\d.]+)\s*px\b/g, '($1)')
  if (arithmetic.trim() === '') return null
  if (!/^[\d\s+*/.()-]+$/.test(arithmetic)) return null
  try {
    // eslint-disable-next-line no-new-func -- evaluates arithmetic already checked to hold only digits and operators
    const answer: unknown = new Function(`return (${arithmetic});`)()
    return typeof answer === 'number' && Number.isFinite(answer) ? answer : null
  } catch {
    return null
  }
}

function fontSizeAt(element: FakeElement, basePx: number): number | null {
  if (element.isMount) return basePx
  const parent = element.parentNode
  const inherited = parent === null ? basePx : fontSizeAt(parent, basePx)
  if (inherited === null) return null
  const written = declaredFontSize(element)
  if (written === '' || written.toLowerCase() === 'inherit') return inherited
  const expanded = expandVariables(element, written)
  if (expanded === null) return null
  return lengthPx(expanded, inherited, basePx)
}

function whatWasWritten(built: Stage): string {
  return selfAndDescendants(built.root())
    .filter((one) => declaredFontSize(one) !== '')
    .map((one) => `${one.tagName}[${one.getAttribute('data-role') ?? '-'}]=${declaredFontSize(one)}`)
    .join(', ')
}

function sizeOf(built: Stage, element: FakeElement, basePx: number): number {
  const size = fontSizeAt(element, basePx)
  if (size === null) {
    throw new Error(
      'FR-036 (MUST): 「一覧の字の大きさは ... `S-203` が定める係数で決めること」 -- ' +
        `no size could be resolved at a base of ${basePx}px. Stated sizes: ${whatWasWritten(built)}`,
    )
  }
  return size
}

const BASES = [12, 16, 20, 24, 32]

// Spec: FR-036, S-203, S-205, U-30
describe('the manuscript still says what these cases read', () => {
  it('⭐ FR-036 still states the order the user asked for on 2026-08-29', () => {
    expect(REQUIREMENTS).toContain(THE_ORDER_MUST)
  })

  it('⭐ FR-036 still sends the list’s size to S-203', () => {
    expect(REQUIREMENTS).toContain(THE_SIZE_MUST)
  })

  it('⛔ S-203 is a ratio and states no px of its own', () => {
    // Why: S-205 in the same column states a px, so a read that returned the value
    // column is told from one that returned a heading or a reason.
    expect(cellOf('S-203')).not.toContain('px')
    expect(cellOf('S-205')).toContain('px')
    expect(S_203).toBeGreaterThan(0)
    expect(S_203).toBeLessThan(1)
    expect(FONT_SIZE_STEP_SIZES.every((one) => one > 0)).toBe(true)
    expect(U_30_HELP).toBe('Help Modal')
  })
})

// Spec: FR-036, FR-038, FR-029, F-019, IC-102
describe('FR-036 (MUST) -- glyph, then explanation, then assignment', () => {
  it('⛔ MUST: an item carrying all three draws them in that order', () => {
    // Why: the seam sees only the order the nodes were put in; a part moved later by
    // CSS order would pass here, and no row settles that property.
    const { help } = drawn([entry({ keys: KEYS })])

    const explanationCell = theCellShowing(help, EXPLANATION)
    const assignmentCell = theCellShowing(help, KEYS)
    const item = commonAncestor(explanationCell, assignmentCell)
    const order = selfAndDescendants(item)

    const glyph = order.indexOf(theGlyphIn(item, ITEM_ICON))
    const explanation = order.indexOf(explanationCell)
    const assignment = order.indexOf(assignmentCell)

    expect(glyph, `the item reads ${whatWasDrawn(item)}`).toBeGreaterThanOrEqual(0)
    expect(explanation, 'the explanation comes after the glyph').toBeGreaterThan(glyph)
    expect(assignment, 'the assignment comes after the explanation').toBeGreaterThan(explanation)
  })

  it('⭐ a mouse operation stands in the same place a key would', () => {
    const { help } = drawn([entry({ press: PRESS })])

    const explanationCell = theCellShowing(help, EXPLANATION)
    const assignmentCell = theCellShowing(help, PRESS)
    const item = commonAncestor(explanationCell, assignmentCell)
    const order = selfAndDescendants(item)

    const glyph = order.indexOf(theGlyphIn(item, ITEM_ICON))
    const explanation = order.indexOf(explanationCell)
    const assignment = order.indexOf(assignmentCell)

    expect(explanation, `the item reads ${whatWasDrawn(item)}`).toBeGreaterThan(glyph)
    expect(assignment).toBeGreaterThan(explanation)
  })

  it('MUST: an entrance named by a key row and a mouse row carries both assignments after the explanation', () => {
    const { help } = drawn([entry({ keys: KEYS, press: PRESS })])

    const explanationCell = theCellShowing(help, EXPLANATION)
    const keysCell = theCellShowing(help, KEYS)
    const pressCell = theCellShowing(help, PRESS)
    const item = commonAncestor(explanationCell, keysCell)
    const order = selfAndDescendants(item)

    expect(order.indexOf(keysCell), `the item reads ${whatWasDrawn(item)}`).toBeGreaterThan(
      order.indexOf(explanationCell),
    )
    expect(order.indexOf(pressCell), `the item reads ${whatWasDrawn(item)}`).toBeGreaterThan(
      order.indexOf(explanationCell),
    )
  })

  it('FR-036: 1 つの項目に割当が 2 つ以上あるときは、割当と割当のあいだに、辞書（`FR-038`）の `keyNotation` の `alternative` の語を置いて並べること（MUST）', () => {
    const { help } = drawn([entry({ keys: KEYS, press: PRESS })])
    const item = commonAncestor(theCellShowing(help, EXPLANATION), theCellShowing(help, KEYS))
    expect(item.textContent, `the item reads ${JSON.stringify(item.textContent)}`).toContain(`${KEYS}${JA_JOIN}${PRESS}`)
    expect(item.textContent, 'a bare space alone reads the two assignments as one').not.toContain(`${KEYS} ${PRESS}`)
  })

  it('FR-036: an item with one assignment carries no separator of its own', () => {
    const { help } = drawn([entry({ keys: KEYS })])
    const item = commonAncestor(theCellShowing(help, EXPLANATION), theCellShowing(help, KEYS))
    expect(item.textContent, `the item reads ${whatWasDrawn(item)}`).not.toContain('\uff0f')
  })

  it('MUST: the wheel inside a mouse word is drawn as the IC-102 glyph, never as its row id', () => {
    const { help } = drawn([entry({ press: `${PRESS} {${WHEEL_ICON}}` })])

    const explanationCell = theCellShowing(help, EXPLANATION)
    const assignmentCell = theCellShowing(help, PRESS)
    const item = commonAncestor(explanationCell, assignmentCell)
    const order = selfAndDescendants(item)
    const wheel = theGlyphIn(assignmentCell, WHEEL_ICON)

    expect(help.textContent, 'the row id of the wheel reached the screen as text').not.toContain(WHEEL_ICON)
    expect(order.indexOf(wheel), `the item reads ${whatWasDrawn(item)}`).toBeGreaterThan(
      order.indexOf(explanationCell),
    )
  })
})

// Spec: FR-036, S-203, S-197, NFR-007, T-215
describe('FR-036 (MUST) -- the list’s text is S-203 of the base the host gives', () => {
  it('computes to S-203 of the base, at every base a reader might set', () => {
    const { built, help } = drawn([entry({ keys: KEYS })])
    const explanation = theCellShowing(help, EXPLANATION)

    for (const base of BASES) {
      expect(sizeOf(built, explanation, base), `a host base of ${base}px`).toBeCloseTo(
        S_203 * base,
        9,
      )
    }
  })

  it('⭐ the assignment beside it is drawn at that same size', () => {
    const { built, help } = drawn([entry({ keys: KEYS })])
    const assignment = theCellShowing(help, KEYS)

    for (const base of BASES) {
      expect(sizeOf(built, assignment, base), `a host base of ${base}px`).toBeCloseTo(
        S_203 * base,
        9,
      )
    }
  })

  it('⛔ MUST NOT: doubling the base doubles what the list computes to', () => {
    // Why: a px constant, even behind a custom property or on an ancestor, gives
    // the same number under both bases, and a ratio cannot.
    const { built, help } = drawn([entry({ keys: KEYS })])
    const explanation = theCellShowing(help, EXPLANATION)

    const small = sizeOf(built, explanation, 16)
    const large = sizeOf(built, explanation, 32)

    expect(large / small, 'the help follows the reader, rather than a constant').toBeCloseTo(2, 9)
  })

  it('⛔ MUST NOT: it is not `fontSizeStepSizes[fontSizeStep]` that is multiplied', () => {
    // Why: the base is none of table T-215's numbers, so a help that multiplied the
    // wrong thing cannot come out right by accident.
    const base = 20
    expect(FONT_SIZE_STEP_SIZES, 'the base this case drives with is not one of them').not.toContain(base)

    const { built, help } = drawn([entry({ keys: KEYS })])
    const size = sizeOf(built, theCellShowing(help, EXPLANATION), base)

    expect(size).toBeCloseTo(S_203 * base, 9)
    for (const wrong of FONT_SIZE_STEP_SIZES) {
      expect(size, `S-203 x fontSizeStepSizes = ${S_203 * wrong}`).not.toBeCloseTo(S_203 * wrong, 9)
    }
  })
})
