// CR-754 spec-only cases on the DRAWN panel: FR-006 -- the actual length entry (PR-5) is one non-wrapping line as wide as the date entry before it (DFC-2870).

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { fitPanelFields } from '../../src/framework/dom-screen-surface/properties-panel-drawing'
import { descendants, selfAndDescendants, styleMap, FakeElement } from '../fixtures/fake-browser'
import { drawnPanel, LANGUAGES, REQUIREMENTS, taskPanel } from './cr-754-stage'

// see FR-006
const FR_006_ACTUAL_LENGTH =
  '⭐ 実績の長さの欄（表 T-016 の `PR-5`）の入力は、日付の欄の入力と同じ幅とし、その右に単位の語を置くこと（MUST）'

const ACTUAL_LENGTH_ROW = 'PR-5'
const DATE_ROWS_BESIDE_IT = ['PR-4', 'PR-6']

const SHOWN_TIME = { isTimeOfDayVisible: true }
const HIDDEN_TIME = { isTimeOfDayVisible: false }
const LOOKS = [
  { name: 'time shown', settings: SHOWN_TIME },
  { name: 'time hidden', settings: HIDDEN_TIME },
] as const

const ENTRY_TAGS = ['INPUT', 'TEXTAREA', 'SELECT']
const DATE_TYPES = ['date', 'datetime-local']

/** @purity pure */
const isDateEntry = (one: FakeElement): boolean => one.tagName === 'INPUT' && DATE_TYPES.includes(one.getAttribute('type') ?? '')

/** @purity pure */
function entriesOf(panel: FakeElement, row: string): readonly FakeElement[] {
  return selfAndDescendants(panel).filter((one) => ENTRY_TAGS.includes(one.tagName) && one.getAttribute('data-field-row') === row)
}

/** @purity pure */
function entryOf(panel: FakeElement, row: string): FakeElement {
  const found = entriesOf(panel, row)
  if (found.length !== 1) throw new Error(`premise: row ${row} draws one entry, got ${found.length}`)
  return found[0] as FakeElement
}

// WHY: the fake browser has no `compareDocumentPosition` and its selector engine takes no comma list; both are what the real DOM gives, so they are lent here and returned after.
const realCompare = (FakeElement.prototype as unknown as Record<string, unknown>)['compareDocumentPosition']
const FOLLOWING = 4
const PRECEDING = 2

beforeEach(() => {
  Object.defineProperty(FakeElement.prototype, 'compareDocumentPosition', {
    configurable: true,
    writable: true,
    value(this: FakeElement, other: FakeElement): number {
      let root: FakeElement = this
      while (root.parentNode !== null) root = root.parentNode
      const order = selfAndDescendants(root)
      return order.indexOf(other) > order.indexOf(this) ? FOLLOWING : PRECEDING
    },
  })
})

afterEach(() => {
  if (realCompare === undefined) delete (FakeElement.prototype as unknown as Record<string, unknown>)['compareDocumentPosition']
  else Object.defineProperty(FakeElement.prototype, 'compareDocumentPosition', { configurable: true, writable: true, value: realCompare })
})

/** @purity non-pure */
function lendCommaSelectors(panel: FakeElement): void {
  const own = panel.querySelectorAll.bind(panel)
  panel.querySelectorAll = (selector: string): FakeElement[] => {
    if (!selector.includes(',')) return own(selector)
    const parts = selector.split(',').map((one) => one.trim())
    const wantsDates = parts.every((one) => /^input\[type="(date|datetime-local)"\]$/.test(one))
    if (!wantsDates) throw new Error(`the lent selector engine knows only a list of date entries, got ${selector}`)
    return descendants(panel).filter(isDateEntry)
  }
}

/** @purity non-pure */
function stubWidth(entry: FakeElement, width: number): void {
  Object.defineProperty(entry, 'offsetWidth', { configurable: true, get: () => width })
}

describe('premise -- the clause and the rows these cases read', () => {
  it('01-04 holds the clause that PR-5 takes the width of the date entry', () => {
    expect(REQUIREMENTS).toContain(FR_006_ACTUAL_LENGTH)
  })

  it.each(LOOKS)('$name: PR-4, PR-5 and PR-6 each draw one entry, the two dates standing above PR-5 in the same panel', ({ settings }) => {
    const panel = drawnPanel(taskPanel({ settings }))
    const order = selfAndDescendants(panel)
    const length = order.indexOf(entryOf(panel, ACTUAL_LENGTH_ROW))
    for (const row of DATE_ROWS_BESIDE_IT) {
      expect(isDateEntry(entryOf(panel, row)), row).toBe(true)
      expect(order.indexOf(entryOf(panel, row)), `${row} stands before PR-5`).toBeLessThan(length)
    }
  })
})

describe(`FR-006 (a) -- ${FR_006_ACTUAL_LENGTH}: one line that does not wrap`, () => {
  it.each(LOOKS.flatMap((look) => LANGUAGES.map((language) => ({ ...look, language }))))(
    '$name ($language): PR-5 is a single-line entry, not a wrapping field',
    ({ settings, language }) => {
      const length = entryOf(drawnPanel(taskPanel({ settings, language })), ACTUAL_LENGTH_ROW)
      expect(length.tagName, 'a textarea wraps').toBe('INPUT')
      expect(length.hasAttribute('data-field-wraps'), 'drawn as a wrapping field').toBe(false)
      expect(styleMap(length).get('width'), 'a width of the whole line, not the date entry width').not.toBe('100%')
      expect(styleMap(length).get('white-space') ?? 'nowrap').not.toMatch(/^(normal|pre-wrap|pre-line|break-spaces)$/)
    },
  )

  it.each(LOOKS)('$name: PR-5 does not grow like the free-text fields drawn beside it', ({ settings }) => {
    const panel = drawnPanel(taskPanel({ settings }))
    const wrapping = selfAndDescendants(panel).filter((one) => one.hasAttribute('data-field-wraps'))
    expect(wrapping, 'premise: other text fields of a Task wrap').not.toHaveLength(0)
    expect(wrapping).not.toContain(entryOf(panel, ACTUAL_LENGTH_ROW))
  })
})

describe(`FR-006 (b) -- ${FR_006_ACTUAL_LENGTH}: after layout, PR-5 takes the drawn width of the date entry before it`, () => {
  const CASES = LOOKS.flatMap((look) => [92, 122].map((drawn) => ({ ...look, drawn })))

  it.each(CASES)('$name, the date entries drawn $drawn px wide: PR-5 is $drawn px wide', ({ settings, drawn }) => {
    const panel = drawnPanel(taskPanel({ settings }))
    lendCommaSelectors(panel)
    for (const one of selfAndDescendants(panel).filter(isDateEntry)) stubWidth(one, drawn)
    fitPanelFields(panel as unknown as HTMLElement)
    expect(styleMap(entryOf(panel, ACTUAL_LENGTH_ROW)).get('width')).toBe(`${drawn}px`)
  })

  it.each(LOOKS)('$name: PR-5 follows the width the date entries are drawn at when it changes', ({ settings }) => {
    const panel = drawnPanel(taskPanel({ settings }))
    lendCommaSelectors(panel)
    const dates = selfAndDescendants(panel).filter(isDateEntry)
    for (const width of [92, 140, 122]) {
      for (const one of dates) stubWidth(one, width)
      fitPanelFields(panel as unknown as HTMLElement)
      expect(styleMap(entryOf(panel, ACTUAL_LENGTH_ROW)).get('width')).toBe(`${width}px`)
    }
  })

  it.each(LOOKS)('$name: the date entries are left at their own width', ({ settings }) => {
    const panel = drawnPanel(taskPanel({ settings }))
    lendCommaSelectors(panel)
    const dates = selfAndDescendants(panel).filter(isDateEntry)
    for (const one of dates) stubWidth(one, 88)
    const before = dates.map((one) => styleMap(one).get('width'))
    fitPanelFields(panel as unknown as HTMLElement)
    expect(dates.map((one) => styleMap(one).get('width'))).toEqual(before)
  })
})
