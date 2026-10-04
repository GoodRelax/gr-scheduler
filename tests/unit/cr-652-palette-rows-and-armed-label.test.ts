// Pins CR-652: palette rows wrap at S-488 and the IC-54 label is drawn at S-489 (FR-053).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  CommandItem,
  CommandPalette,
  PaletteGroup,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { generatedConstantOf, settingNumber } from '../fixtures/setting-number'
import {
  armedLabelStyle,
  paletteColumnsOf,
  paletteColumnsStyle,
  paletteElement,
} from '../../src/framework/dom-screen-surface/command-palette-drawing'
import {
  NOT_STORED_ARMED_LABEL_SIZES,
  NOT_STORED_PALETTE_ROW_CAP,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { FakeElement, FakeText, selfAndDescendants, stage, styleMap } from '../fixtures/fake-browser'
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_053_ROW_CAP = '1 つの群の入口は、1 段に `_assets/tbl-settings.md` の 表 T-206 の `S-488` の数までを並べること（MUST）'
const FR_053_WRAP_EXAMPLES = '13 個は 7 と 6、14 個は 7 と 7、20 個は 10 と 10'
const FR_053_NO_RULE_BETWEEN_ROWS = '群の境目の線（`S-143`）を、折った段のあいだに引いてはならない（MUST NOT）'
const FR_053_ARMED_LABEL = '`S-489` の大きさで描き、`S-235` も `S-234` も掛けてはならない（MUST NOT）'

function rowOf(table: string, id: string) {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

function firstNumber(written: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(written)
  if (found === null) throw new Error(`${what} states no number: ${written}`)
  return Number.parseFloat(found[0])
}

const t206 = (id: string): string => bare(rowOf('T-206', id).by['既定'] ?? '')

const S_488 = firstNumber(t206('S-488'), 'S-488')
const S_489 = firstNumber(t206('S-489'), 'S-489')
const S_489_CELL = t206('S-489')
const S_216 = firstNumber(t206('S-216'), 'S-216')
const S_235 = firstNumber(t206('S-235'), 'S-235')
const S_8_LOWER = firstNumber(bare(rowOf('T-201', 'S-8').by['下限'] ?? ''), 'S-8 lower bound')

const S_143_THICKNESS = ((): number => {
  const written = t206('S-143')
  const found = /(-?\d+(?:\.\d+)?)\s*[×xX]\s*(-?\d+(?:\.\d+)?)/.exec(written)
  if (found === null) throw new Error(`S-143 no longer states a pair: ${written}`)
  return Number.parseFloat(found[1] as string)
})()

const PALETTE_ROWS: readonly string[] = specTable('T-109')
  .rows.filter((row) => bareAll(row.by['面'] ?? '').includes('Command Palette'))
  .map((row) => row.id)

function expectedColumns(n: number, cap: number): number {
  if (n === 0) return 0
  const rows = Math.ceil(n / cap)
  return Math.ceil(n / rows)
}

const ARMED_WORD = 'ArmedWordHere'

const entryFor = (icon: string): CommandItem => ({
  icon,
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: `PaletteCommandWordFor${icon}`,
})

const groupOf = (name: string, count: number): PaletteGroup => ({
  name,
  commands: Array.from({ length: count }, (_absent, at) =>
    entryFor(PALETTE_ROWS[at % PALETTE_ROWS.length] as string),
  ),
})

const paletteWith = (counts: readonly number[]): CommandPalette => ({
  at: { x: 400, y: 300 },
  grabBandHeight: settingNumber('S-135a'),
  minimise: entryFor('IC-75'),
  isMinimised: false,
  groups: counts.map((count, at) => groupOf(`GroupWord${at}`, count)),
  armedText: ARMED_WORD,
})

function drawn(counts: readonly number[]): FakeElement {
  const built = stage({ 'App Header': 37 })
  return paletteElement(
    built.host,
    paletteWith(counts),
    new Map<string, HTMLElement>(),
  ) as unknown as FakeElement
}

function gridColumnsIn(palette: FakeElement): number[] {
  const counts: number[] = []
  for (const one of selfAndDescendants(palette)) {
    const written = styleMap(one).get('grid-template-columns')
    if (written === undefined) continue
    const found = /repeat\(\s*(\d+)\s*,/.exec(written)
    if (found === null) throw new Error(`grid-template-columns is not a repeat(): ${written}`)
    counts.push(Number.parseInt(found[1] as string, 10))
  }
  return counts
}

function statesPx(value: string, px: number): boolean {
  return new RegExp(`(^|[^0-9.])${px}(\\.0+)?px(\\b|$)`).test(value)
}

const ONE_SIDED_BORDERS = ['border-top', 'border-bottom', 'border-left', 'border-right']
const PAINTS = ['background', 'background-color', 'background-image', 'border-color']

function isRule(node: FakeElement): boolean {
  if (node.tagName === 'HR') return true
  const declared = styleMap(node)
  for (const side of ONE_SIDED_BORDERS) {
    if (statesPx(declared.get(side) ?? '', S_143_THICKNESS)) return true
    if (statesPx(declared.get(`${side}-width`) ?? '', S_143_THICKNESS)) return true
  }
  const isPainted = PAINTS.some((property) => (declared.get(property) ?? '').trim() !== '')
  const isThin =
    statesPx(declared.get('height') ?? '', S_143_THICKNESS) ||
    statesPx(declared.get('width') ?? '', S_143_THICKNESS)
  return isPainted && isThin
}

function armedLabelIn(palette: FakeElement): FakeElement {
  const holders = selfAndDescendants(palette).filter((one) =>
    one.childNodes.some((child) => child instanceof FakeText && child.data.includes(ARMED_WORD)),
  )
  if (holders.length !== 1) throw new Error(`expected one IC-54 label, found ${holders.length}`)
  return holders[0] as FakeElement
}

function fontSizePxOf(element: FakeElement): number {
  const written = styleMap(element).get('font-size') ?? ''
  const found = /^(-?\d+(?:\.\d+)?)px$/.exec(written.trim())
  return found === null ? Number.NaN : Number.parseFloat(found[1] as string)
}

describe('CR-652 FR-053 / S-488 / S-489 / S-216 / IC-54 -- the manuscript still says what these cases read', () => {
  it('FR-053 still carries the row cap, the wrap examples, the S-143 ban and the IC-54 size rule', () => {
    for (const clause of [FR_053_ROW_CAP, FR_053_WRAP_EXAMPLES, FR_053_NO_RULE_BETWEEN_ROWS, FR_053_ARMED_LABEL]) {
      expect(REQUIREMENTS).toContain(clause)
    }
    expect(unbroken(rowOf('T-109', 'IC-54').cells.join(' '))).toContain('Command Palette')
  })

  it('S-488 / S-489 / S-216 / S-235 / S-143 parse to the numbers the tables write', () => {
    expect(S_488).toBe(11)
    expect(S_489).toBe(12)
    expect(S_489_CELL).toContain('px')
    expect(S_216).toBe(3)
    expect(S_235).toBeGreaterThan(0)
    expect(S_235).toBeLessThan(1)
    expect(S_143_THICKNESS).toBeGreaterThan(0)
    expect(PALETTE_ROWS.length).toBeGreaterThan(0)
  })

  it('FR-053 examples follow from the rule as written (13 -> 7+6, 14 -> 7+7, 20 -> 10+10)', () => {
    expect(expectedColumns(13, S_488)).toBe(7)
    expect(expectedColumns(14, S_488)).toBe(7)
    expect(expectedColumns(20, S_488)).toBe(10)
  })
})

describe('FR-053 / S-488 -- paletteColumnsOf wraps into the fewest, evened rows', () => {
  it('S-488 -- the generated NOT_STORED_PALETTE_ROW_CAP equals table T-206', () => {
    expect(NOT_STORED_PALETTE_ROW_CAP['S-488']).toBe(S_488)
  })

  it('FR-053 / S-488 -- no entrances, no columns', () => {
    expect(paletteColumnsOf(0, S_488)).toBe(0)
  })

  it('FR-053 / S-488 -- up to the cap, one row of n columns', () => {
    for (let n = 1; n <= S_488; n += 1) {
      expect(paletteColumnsOf(n, S_488), `n=${n}`).toBe(n)
    }
  })

  it('FR-053 / S-488 -- above the cap, ceil(n / ceil(n / S-488)) columns', () => {
    const cases: ReadonlyArray<readonly [number, number]> = [
      [12, 6],
      [13, 7],
      [14, 7],
      [20, 10],
      [22, 11],
      [23, 8],
    ]
    for (const [n, columns] of cases) {
      expect(expectedColumns(n, S_488), `rule for n=${n}`).toBe(columns)
      expect(paletteColumnsOf(n, S_488), `n=${n}`).toBe(columns)
    }
  })

  it('FR-053 / S-488 -- 23 entrances take three rows (8, 8, 7)', () => {
    const columns = paletteColumnsOf(23, S_488)
    expect(Math.ceil(23 / columns)).toBe(3)
    expect(23 - columns * 2).toBe(7)
  })

  it('FR-053 / S-488 -- paletteColumnsStyle states repeat(<columns>,auto) with the S-488 cap', () => {
    for (const n of [1, 8, 13, 14, 20, 23]) {
      const written = paletteColumnsStyle(n).replace(/\s+/g, '')
      expect(written, `n=${n}`).toContain(`grid-template-columns:repeat(${expectedColumns(n, S_488)},auto)`)
    }
  })
})

describe('FR-053 / S-488 / S-143 -- the drawn palette', () => {
  it('FR-053 / S-488 -- groups of 14, 20 and 8 are grids of 7, 10 and 8 columns', () => {
    const palette = drawn([14, 20, 8])
    expect(gridColumnsIn(palette)).toEqual([7, 10, 8])
  })

  it('FR-053 / S-143 -- no rule between wrapped rows: rules == groups - 1', () => {
    const palette = drawn([14, 20, 8])
    expect(selfAndDescendants(palette).filter(isRule)).toHaveLength(2)
  })

  it('FR-053 / S-143 -- one wrapped group alone draws no rule at all', () => {
    const palette = drawn([23])
    expect(gridColumnsIn(palette)).toEqual([8])
    expect(selfAndDescendants(palette).filter(isRule)).toHaveLength(0)
  })
})

describe('FR-053 / IC-54 / S-489 -- the armed label', () => {
  it('S-489 -- the generated NOT_STORED_ARMED_LABEL_SIZES equals table T-206', () => {
    expect(NOT_STORED_ARMED_LABEL_SIZES['S-489']).toBe(S_489)
  })

  it('S-489 -- equals the lower bound of S-8 in table T-201', () => {
    expect(S_489).toBe(S_8_LOWER)
  })

  it('FR-053 / IC-54 / S-489 -- armedLabelStyle states font-size S-489 px, not S-489 * S-235', () => {
    const written = armedLabelStyle().replace(/\s+/g, '')
    expect(written).toContain(`font-size:${S_489}px`)
    expect(written).not.toContain(`${S_489 * S_235}`)
  })

  it('FR-053 / IC-54 / S-489 -- the drawn IC-54 label is S-489 px exactly, with neither S-235 nor S-234 applied', () => {
    const palette = drawn([14, 20, 8])
    const label = armedLabelIn(palette)
    const px = fontSizePxOf(label)
    expect(px, `font-size written: ${styleMap(label).get('font-size') ?? '(none)'}`).toBe(S_489)
    expect(px).not.toBeCloseTo(S_489 * S_235, 3)
    expect(px).toBeGreaterThanOrEqual(S_8_LOWER)
  })
})

describe('FR-053 / S-216 -- shapes always shown', () => {
  it('S-216 -- table T-206 and NOT_STORED_COMMAND_PALETTE_SIZES agree on 3', () => {
    expect(generatedConstantOf('src/adapter/screen-renderer/command-palette.ts', 'NOT_STORED_COMMAND_PALETTE_SIZES')['S-216']).toBe(S_216)
    expect(S_216).toBe(3)
    expect(unbroken(rowOf('T-206', 'S-216').cells.join(' '))).toContain('S-142')
  })
})
