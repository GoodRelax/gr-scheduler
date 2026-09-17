// The defaults the shipped tool starts from, against the defaults the

import { describe, expect, it } from 'vitest'

import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { bare, specTable } from '../contract/spec-table'


const TABLES = [
  { id: 'T-201', key: 'キー', value: '既定値' },
  { id: 'T-202', key: 'キー', value: '既定' },
  { id: 'T-203', key: 'キー', value: '既定' },
  { id: 'T-204', key: 'キー', value: '既定' },
  { id: 'T-205', key: 'キー', value: '既定' },
  { id: 'T-217', key: 'キー', value: '既定' },
  { id: 'T-208', key: '名前', value: '値' },
  { id: 'T-210', key: '名前', value: '値' },
  { id: 'T-211', key: '名前', value: '値' },
  { id: 'T-212', key: '名前', value: '値' },
  { id: 'T-213', key: '名前', value: '値' },
  { id: 'T-214', key: '名前', value: '値' },
  { id: 'T-215', key: '名前', value: '値' },
] as const

const SHIPPED = SETTINGS_DEFAULTS as unknown as Readonly<Record<string, unknown>>

function numberStatedBy(cell: string): number | null {
  const written = bare(cell)
    .replace(/🔎/g, '')
    .replace(/(px|ms|pt|%|日|文字|回|個)$/u, '')
    .trim()
  return /^-?\d+(\.\d+)?$/.test(written) ? Number.parseFloat(written) : null
}

interface Stated {
  readonly table: string
  readonly row: string
  readonly key: string
  readonly stated: number
}

const CHECKED: readonly Stated[] = TABLES.flatMap(({ id, key, value }) => {
  const table = specTable(id)
  if (!table.headings.includes(key) || !table.headings.includes(value)) {
    throw new Error(`table ${id} no longer has ${key} / ${value}: ${table.headings.join(' | ')}`)
  }
  return table.rows.flatMap((row) => {
    const name = bare(row.by[key] ?? '')
    const stated = numberStatedBy(row.by[value] ?? '')
    if (stated === null) return []
    if (typeof SHIPPED[name] !== 'number') return []
    return [{ table: id, row: row.id, key: name, stated }]
  })
})

function statedBy(row: string): Stated {
  const found = CHECKED.find((one) => one.row === row)
  if (found === undefined) {
    throw new Error(
      `no table of _assets/tbl-settings.md states a plain number for ${row}; ` +
        `the sweep reached ${CHECKED.map((one) => one.row).join(', ')}`,
    )
  }
  return found
}


describe('_assets/tbl-settings.md — the shipped defaults are the printed defaults', () => {
  it('reaches enough rows for the sweep to mean anything', () => {
    expect(CHECKED.length, CHECKED.map((one) => `${one.row}=${one.key}`).join(' ')).toBeGreaterThan(
      40,
    )
  })

  it('starts every one of them from the number the manuscript prints', () => {
    for (const one of CHECKED) {
      expect(SHIPPED[one.key], `表 ${one.table} の ${one.row}（\`${one.key}\`）`).toBe(one.stated)
    }
  })
})

// see T-201
const T_201_DEFAULT_COLUMN = '\u65e2\u5b9a\u5024'

// see T-201, S-2, S-3, T-215, CR-418
const rulerCellOf = (row: string): string =>
  specTable('T-201').rows.find((one) => one.id === row)?.by[T_201_DEFAULT_COLUMN] ?? ''

// see T-201, S-3, CR-418
const S_3_FACTOR = ((): number => {
  const hit = /`fontScaleSizes\[fontScale\]`\s*\u00d7\s*(\d+(?:\.\d+)?)/.exec(rulerCellOf('S-3'))
  if (hit === null) throw new Error(`S-3 no longer states fontScaleSizes[fontScale] x a factor: ${rulerCellOf('S-3')}`)
  return Number(hit[1])
})()

// see T-201, S-2, S-3
const printedPerTextSize = (row: string): Readonly<Record<string, number>> => {
  const found = /\uff08S = (\d+(?:\.\d+)?) \/ M = (\d+(?:\.\d+)?) \/ L = (\d+(?:\.\d+)?)\uff09/.exec(rulerCellOf(row))
  if (found === null) throw new Error(`${row} no longer prints its S / M / L example`)
  return { S: Number(found[1]), M: Number(found[2]), L: Number(found[3]) }
}

describe('S-3 / S-2 (table T-201) -- the ruler font is the text size x 1.5 and the band follows it (CR-418)', () => {
  const pad = SHIPPED['rulerLabelPad'] as number

  it('prints S 18 / M 21 / L 24 and S 60 / M 69 / L 78, the table T-215 sizes x the S-3 factor and three rows of them', () => {
    expect(S_3_FACTOR, 'CR-418 decision 1').toBe(1.5)
    for (const size of ['S', 'M', 'L'] as const) {
      const font = (SHIPPED[`fontScaleSizes.${size}`] as number) * S_3_FACTOR
      expect(printedPerTextSize('S-3')[size], `table T-201 S-3 at ${size}`).toBe(font)
      expect(printedPerTextSize('S-2')[size], `table T-201 S-2 at ${size}`).toBe(font * 3 + pad * 3)
    }
    expect(printedPerTextSize('S-3')).toEqual({ S: 18, M: 21, L: 24 })
    expect(printedPerTextSize('S-2')).toEqual({ S: 60, M: 69, L: 78 })
  })

  it('ships `rulerFont` and `rulerHeight` at the default text size as the table prints them', () => {
    const size = SHIPPED['fontScale'] as string
    expect(SHIPPED['rulerFont'], `table T-201 S-3 at fontScale ${size}`).toBe(printedPerTextSize('S-3')[size])
    expect(SHIPPED['rulerHeight'], `table T-201 S-2 at fontScale ${size}`).toBe(printedPerTextSize('S-2')[size])
  })
})

describe('S-35 (表 T-201) — a name is cut at 48 half-width units, not 24', () => {
  it('ships `truncateUnits` at the number the row states', () => {
    const s35 = statedBy('S-35')
    expect(s35.key).toBe('truncateUnits')
    expect(SHIPPED['truncateUnits'], '表 T-201 の S-35').toBe(s35.stated)
  })

  it('leaves room for the mark 表 T-013 の前書き requires', () => {
    expect(SHIPPED['truncateUnits'] as number).toBeGreaterThan(2)
  })
})

describe('S-124 (表 T-212) — the explanation waits two seconds', () => {
  it('ships `iconHintDelayMs` at the number the row states', () => {
    const s124 = statedBy('S-124')
    expect(s124.key).toBe('iconHintDelayMs')
    expect(SHIPPED['iconHintDelayMs'], '表 T-212 の S-124').toBe(s124.stated)
  })

  it('holds that wait once, and not per place', () => {
    const waits = Object.keys(SHIPPED).filter((key) => /HintDelayMs$|RestMs$|TooltipDelay/i.test(key))
    expect(waits, waits.join(' ')).toEqual(['iconHintDelayMs'])
  })

  it('keeps the wait inside the bounds the row states', () => {
    const row = specTable('T-212').rows.find((one) => one.id === 'S-124')
    if (row === undefined) throw new Error('table T-212 no longer has row S-124')
    const floor = Number.parseFloat(bare(row.by['下限'] ?? ''))
    const ceiling = Number.parseFloat(bare(row.by['上限'] ?? ''))
    const shipped = SHIPPED['iconHintDelayMs'] as number
    expect(shipped).toBeGreaterThanOrEqual(floor)
    expect(shipped).toBeLessThanOrEqual(ceiling)
  })
})
