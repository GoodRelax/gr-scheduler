// Unit tests: a tooltip's text is drawn at the S-204 ratio of the host's base.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  ScreenFrame,
  ScreenView,
  Tooltip,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  FakeText,
  oneByRole,
  selfAndDescendants,
  stage,
  styleMap,
  surfaceOf,
  wiringOf,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
// Why: the contract reader takes its copy from the .md at read time, so a
// ratio that moves in table T-206 moves here too.
import { bare, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const THE_SIZE_MUST = '字の大きさは 表 T-206 の `S-204` が定める係数で決めること（MUST）'

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

const S_204 = numberOf('S-204')

const S_203 = numberOf('S-203')

const FONT_SIZE_STEP_SIZES = ((): readonly number[] => {
  const table = specTable('T-215')
  return ['S-121', 'S-122', 'S-123'].map((id) => {
    const row = table.rows.find((one) => one.id === id)
    if (row === undefined) throw new Error(`table T-215 no longer has row ${id}`)
    return Number.parseFloat(bare(row.by['値'] ?? ''))
  })
})()

const U_53 = ((): string => {
  const table = specTable('T-103')
  const row = table.rows.find((one) => one.id === 'U-53')
  if (row === undefined) throw new Error('table T-103 no longer has row U-53')
  return bare(row.by['確定名（英）'] ?? '')
})()

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

const EXPLANATION = 'TooltipExplanationHere'
const ASSIGNMENT = 'Ctrl+Shift+T'

// Why: assignment is always a member and null when empty, since FR-036 keeps
// the place of a row that has neither key nor mouse operation.
const iconTooltip = (icon: string, text: string, assignment: string | null = null): Tooltip => ({
  anchor: { kind: 'icon', icon },
  text,
  assignment,
})

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

function drawn(tooltips: readonly Tooltip[]): { built: Stage; tooltip: FakeElement } {
  const built = wireWithTextNodes(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, tooltips })
  return { built, tooltip: oneByRole(built.root(), U_53) }
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

const whatWasWritten = (built: Stage): string =>
  selfAndDescendants(built.root())
    .filter((one) => declaredFontSize(one) !== '')
    .map((one) => `${one.tagName}[${one.getAttribute('data-role') ?? '-'}]=${declaredFontSize(one)}`)
    .join(', ')

function sizeOf(built: Stage, element: FakeElement, basePx: number): number {
  const size = fontSizeAt(element, basePx)
  if (size === null) {
    throw new Error(
      'EZ-2 (MUST): 「字の大きさは 表 T-206 の `S-204` が定める係数で決めること」 -- ' +
        `no size could be resolved at a base of ${basePx}px. Stated sizes: ${whatWasWritten(built)}`,
    )
  }
  return size
}

function theCellShowing(root: FakeElement, text: string): FakeElement {
  const showing = selfAndDescendants(root).filter((one) => one.textContent.includes(text))
  const innermost = showing.filter(
    (one) => !one.children.some((child) => child.textContent.includes(text)),
  )
  const first = innermost[0]
  if (first === undefined) throw new Error(`nothing in the tooltip shows ${JSON.stringify(text)}`)
  if (innermost.length !== 1) {
    throw new Error(`${innermost.length} separate nodes show ${JSON.stringify(text)}`)
  }
  return first
}

// Why: the characters are measured, not a box chosen by name; a box holding
// only other boxes is left out because its own size reaches no word.
function everyWordyNode(tooltip: FakeElement): FakeElement[] {
  const found = selfAndDescendants(tooltip).filter((one) => one.textContent.trim() !== '')
  const innermost = found.filter(
    (one) => !one.children.some((child) => child.textContent.trim() !== ''),
  )
  if (innermost.length === 0) throw new Error('the tooltip drew no words at all')
  return innermost
}

const BASES = [12, 16, 20, 24, 32]

// Spec: EZ-2, FR-092, S-204, S-203, U-53
describe('the manuscript still says what these cases read', () => {
  it('⭐ EZ-2 still sends the tooltip’s size to S-204', () => {
    expect(REQUIREMENTS).toContain(THE_SIZE_MUST)
  })

  it('⛔ S-204 is a ratio, states no px, and is 14 / 16', () => {
    // Why: S-205 in the same column states a px, so a read that returned the value
    // column is told from one that returned a heading or a reason.
    expect(cellOf('S-204')).not.toContain('px')
    expect(cellOf('S-205')).toContain('px')
    expect(S_204).toBeCloseTo(14 / 16, 9)
    expect(S_204).toBeGreaterThan(0)
    expect(S_204).toBeLessThan(1)
    expect(U_53).toBe('Tooltip')
  })

  it('⛔ S-204 is the tooltip’s own ratio, and not the help’s', () => {
    // Why: a unit that applied one ratio to both surfaces would pass every case
    // below if the two numbers were equal.
    expect(S_204, 'S-203 and S-204 are two different ratios').not.toBe(S_203)
  })
})

// Why: no position is asserted: no row states one, and EP-15 only keeps the tooltip out
// of an exported picture.
// Spec: EZ-2, FR-092, S-204, FR-036, NFR-007, T-215
describe('EZ-2 (MUST) -- the tooltip’s text is S-204 of the base the host gives', () => {
  it('computes to S-204 of the base, at every base a reader might set', () => {
    // Why: every node that draws words is asked, since no row says which node of
    // a tooltip states the size.
    const { built, tooltip } = drawn([iconTooltip('IC-20', EXPLANATION, ASSIGNMENT)])

    for (const base of BASES) {
      for (const wordy of everyWordyNode(tooltip)) {
        expect(
          sizeOf(built, wordy, base),
          `${JSON.stringify(wordy.textContent)} at a host base of ${base}px`,
        ).toBeCloseTo(S_204 * base, 9)
      }
    }
  })

  it('⭐ the words themselves are drawn at that size, not just the box', () => {
    // Why: a ratio on a box whose words state their own size would pass the case
    // above, so the node that shows the explanation is asked too.
    const { built, tooltip } = drawn([iconTooltip('IC-20', EXPLANATION, ASSIGNMENT)])

    for (const base of BASES) {
      expect(
        sizeOf(built, theCellShowing(tooltip, EXPLANATION), base),
        `the explanation, at a host base of ${base}px`,
      ).toBeCloseTo(S_204 * base, 9)
      expect(
        sizeOf(built, theCellShowing(tooltip, ASSIGNMENT), base),
        `the assignment, at a host base of ${base}px`,
      ).toBeCloseTo(S_204 * base, 9)
    }
  })

  it('⛔ MUST NOT: doubling the base doubles what the tooltip computes to', () => {
    // Why: a px constant, even behind a custom property or on an ancestor, gives
    // the same number under both bases, and a ratio cannot.
    const { built, tooltip } = drawn([iconTooltip('IC-20', EXPLANATION, ASSIGNMENT)])
    const words = theCellShowing(tooltip, EXPLANATION)

    const small = sizeOf(built, words, 16)
    const large = sizeOf(built, words, 32)

    expect(large / small, 'the tooltip follows the reader, rather than a constant').toBeCloseTo(2, 9)
  })

  it('⛔ MUST NOT: 「2 段階」 is not a step of table T-215', () => {
    // Why: the base is none of table T-215's numbers, so a tooltip that multiplied
    // the wrong thing cannot come out right by accident.
    const base = 20
    expect(FONT_SIZE_STEP_SIZES, 'the base this case drives with is not one of them').not.toContain(base)

    const { built, tooltip } = drawn([iconTooltip('IC-20', EXPLANATION, ASSIGNMENT)])
    const size = sizeOf(built, theCellShowing(tooltip, EXPLANATION), base)

    expect(size).toBeCloseTo(S_204 * base, 9)
    for (const wrong of FONT_SIZE_STEP_SIZES) {
      expect(size, `S-204 x fontSizeStepSizes = ${S_204 * wrong}`).not.toBeCloseTo(S_204 * wrong, 9)
    }
  })
})
