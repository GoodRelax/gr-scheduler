// CR-754 spec-only cases: FR-072 -- a row holding only IC-52 heads the properties panel, its entrance at the right end (DFC-2516, DFC-2517).

import { describe, expect, it } from 'vitest'

import type { PropertiesPanel } from '../../src/adapter/screen-renderer/screen-renderer'
import { selfAndDescendants, styleMap, whatWasDrawn, type FakeElement } from '../fixtures/fake-browser'
import { drawnPanel, iconLabel, REQUIREMENTS, settingLabel, settingsPanel, taskGroupPanel, taskPanel } from './cr-754-stage'

// see FR-072
const FR_072_CLOSE_ROW =
  '⭐ パネルの先頭に、閉じる入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-52`）だけの行を置き、閉じる入口をその行の右端に置くこと（MUST）'
const FR_072_NOT_IN_A_FIELD = '⛔ 閉じる入口を、欄の行や、ほかの入口・見本の並びに置いてはならない（MUST NOT）'
const FR_072_EVERY_FACE = 'パネルが何を出しているか（文書の設定か、選択物か）によらず同じ行とする。'

const CLOSE = 'IC-52'
const TIME_SHIFT = 'IC-162'
const GRS_RESET = 'IC-139'
const THEME_COLOR_ROW = 'K-60'
const WAY_OUT = 'data-way-out'

interface Face {
  readonly name: string
  readonly panel: () => PropertiesPanel
}

const FACES: readonly Face[] = [
  { name: 'the document settings (ja)', panel: () => settingsPanel({ language: 'ja' }) },
  { name: 'the document settings (en)', panel: () => settingsPanel({ language: 'en' }) },
  { name: 'a selected Task', panel: () => taskPanel() },
  { name: 'a selected task group', panel: () => taskGroupPanel() },
]

/** @purity pure */
const firstRowOf = (panel: FakeElement): FakeElement => {
  const first = panel.children[0]
  if (first === undefined) throw new Error(`the panel draws nothing: ${whatWasDrawn(panel)}`)
  return first
}

/** @purity pure */
const iconsIn = (node: FakeElement): readonly string[] =>
  selfAndDescendants(node)
    .map((one) => one.getAttribute('data-icon'))
    .filter((one): one is string => one !== null)

/** @purity pure */
const insideFieldRow = (node: FakeElement, panel: FakeElement): boolean => {
  for (let at = node.parentNode; at !== null && at !== panel; at = at.parentNode) {
    if (at.getAttribute('data-field-row') !== null) return true
  }
  return false
}

// WHY: FR-072 names the right end, not a technique; any of the ways a flex or block row pushes its one child right counts.
/** @purity pure */
function isPushedRight(row: FakeElement, entry: FakeElement): boolean {
  const own = styleMap(row)
  const justify = own.get('justify-content') ?? ''
  if (['flex-end', 'end', 'right'].includes(justify.trim())) return true
  if ((own.get('text-align') ?? '').trim() === 'right') return true
  const placed = styleMap(entry)
  return (placed.get('margin-left') ?? '').trim() === 'auto' || (placed.get('float') ?? '').trim() === 'right'
}

describe('CR-754 premise -- the clauses these cases press still stand', () => {
  it.each([FR_072_CLOSE_ROW, FR_072_NOT_IN_A_FIELD, FR_072_EVERY_FACE])('01-04 holds %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe(`FR-072 -- ${FR_072_CLOSE_ROW}`, () => {
  it.each(FACES)('$name: the first child of the panel is the way-out row', ({ panel }) => {
    const drawn = drawnPanel(panel())
    expect(firstRowOf(drawn).getAttribute(WAY_OUT), whatWasDrawn(firstRowOf(drawn))).not.toBeNull()
  })

  it.each(FACES)(`$name: the way-out row holds ${CLOSE} and nothing else`, ({ panel }) => {
    const row = firstRowOf(drawnPanel(panel()))
    expect(iconsIn(row)).toEqual([CLOSE])
    expect(selfAndDescendants(row).filter((one) => one.getAttribute('data-field-row') !== null)).toEqual([])
    const entry = selfAndDescendants(row).find((one) => one.getAttribute('data-icon') === CLOSE) as FakeElement
    const outside = row.textContent.replace(entry.textContent, '').trim()
    expect(outside, 'the row carries no title or name of its own').toBe('')
  })

  it.each(FACES)(`$name: ${CLOSE} stands at the right end of that row`, ({ panel }) => {
    const row = firstRowOf(drawnPanel(panel()))
    const entry = selfAndDescendants(row).find((one) => one.getAttribute('data-icon') === CLOSE)
    expect(entry, whatWasDrawn(row)).toBeDefined()
    expect(isPushedRight(row, entry as FakeElement), whatWasDrawn(row)).toBe(true)
  })
})

describe(`FR-072 -- ${FR_072_NOT_IN_A_FIELD}`, () => {
  it.each(FACES)(`$name: ${CLOSE} is drawn once, and inside no field row`, ({ panel }) => {
    const drawn = drawnPanel(panel())
    const closes = selfAndDescendants(drawn).filter((one) => one.getAttribute('data-icon') === CLOSE)
    expect(closes).toHaveLength(1)
    expect(insideFieldRow(closes[0] as FakeElement, drawn)).toBe(false)
  })

  it(`the document settings: the GRS reset line (${GRS_RESET}) holds no ${CLOSE}`, () => {
    const drawn = drawnPanel(settingsPanel())
    const reset = selfAndDescendants(drawn).find((one) => one.getAttribute('data-icon') === GRS_RESET)
    expect(reset, 'premise: FO-1 is drawn').toBeDefined()
    const line = (reset as FakeElement).parentNode?.parentNode ?? null
    expect(line, 'premise: the reset entrance sits on its own line').not.toBeNull()
    expect(iconsIn(line as FakeElement)).toEqual([GRS_RESET])
  })

  it(`DFC-2517: the theme color row (${THEME_COLOR_ROW}) shows its swatches and no entrance -- neither ${CLOSE} nor ${TIME_SHIFT}`, () => {
    const drawn = drawnPanel(settingsPanel())
    const row = selfAndDescendants(drawn).find(
      (one) => one.getAttribute('data-field-row') === THEME_COLOR_ROW && one.parentNode === drawn,
    )
    expect(row, `premise: the ${THEME_COLOR_ROW} row is drawn`).toBeDefined()
    expect(iconsIn(row as FakeElement)).toEqual([])
  })

  it(`DFC-2517: ${TIME_SHIFT} is offered only on its own row FO-16, not on the way-out row`, () => {
    const drawn = drawnPanel(settingsPanel())
    expect(iconsIn(firstRowOf(drawn))).not.toContain(TIME_SHIFT)
    const shiftName = iconLabel(TIME_SHIFT, 'ja')
    const rows = selfAndDescendants(drawn).filter((one) => one.getAttribute('data-field-row') !== null && one.parentNode === drawn)
    const named = rows.filter((one) => (one.children[0]?.textContent ?? '') === shiftName)
    expect(named, `premise: one row is named ${shiftName}`).toHaveLength(1)
    for (const other of rows.filter((one) => !named.includes(one))) expect(iconsIn(other)).not.toContain(TIME_SHIFT)
  })

  it.each([
    { name: 'a selected Task', panel: () => taskPanel(), first: 'PR-1' },
    { name: 'a selected task group', panel: () => taskGroupPanel(), first: 'AT-53' },
  ])(`$name: the name row ($first) holds no ${CLOSE}`, ({ panel, first }) => {
    const drawn = drawnPanel(panel())
    const row = selfAndDescendants(drawn).find((one) => one.getAttribute('data-field-row') === first)
    expect(row, `premise: the ${first} row is drawn`).toBeDefined()
    expect(iconsIn(row as FakeElement)).not.toContain(CLOSE)
  })

  it('the document settings: the first field after the way-out row is still the theme color, named by the dictionary', () => {
    const panel = settingsPanel()
    expect(panel.fields[0]?.row).toBe(THEME_COLOR_ROW)
    expect(panel.fields[0]?.name).toBe(settingLabel(THEME_COLOR_ROW, 'ja'))
  })
})
