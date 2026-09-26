// CR-557 seam S-1: the generated theme hue roster equals table T-305, read from docs/spec alone.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const ROSTER_PATH = join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'theme-hue-roster.json')

const CLAUSE_ROWS_IN_ORDER =
  'その欄には 表 T-305 の行を同表の順に、1 段に `_assets/tbl-settings.md` の 表 T-206 の `S-368` 個ずつ並べ、押された行の色相で 表 T-108 の `CM-5` を 1 回発行すること（MUST）。'
const NOTE_TH_1 = '⚠️ `TH-1` は `_assets/tbl-settings.md` の `S-73` の既定と同じ色相を指す'

const S_73 = specTable('T-216').rows.find((one) => one.id === 'S-73')
const HUE_MIN = Number(bare(S_73?.by['下限'] ?? ''))
const HUE_MAX = Number(bare(S_73?.by['上限'] ?? ''))

interface RosterRow {
  readonly rowId: string
  readonly hue: number
}

// see S-73
function s73Default(): number {
  if (S_73 === undefined) throw new Error('table T-216 has no row S-73')
  const value = Number(bare(S_73.by['既定'] ?? ''))
  if (!Number.isInteger(value)) throw new Error(`S-73 states no integer default: ${JSON.stringify(S_73.by['既定'])}`)
  return value
}

// see T-305
function expectedRoster(): readonly RosterRow[] {
  return specTable('T-305').rows.map((row) => {
    const cell = row.by['色相'] ?? row.cells[0] ?? ''
    if (cell.includes('S-73')) return { rowId: row.id, hue: s73Default() }
    const hue = Number(bare(cell))
    if (!Number.isInteger(hue)) throw new Error(`table T-305 row ${row.id} states no integer hue: ${cell}`)
    return { rowId: row.id, hue }
  })
}

// see T-305
function readRoster(): readonly RosterRow[] {
  if (!existsSync(ROSTER_PATH)) {
    throw new Error('seam S-1: src/adapter/screen-renderer/theme-hue-roster.json does not exist yet')
  }
  return JSON.parse(readFileSync(ROSTER_PATH, 'utf8')) as RosterRow[]
}

describe('CR-557 -- the manuscript still says what these cases read', () => {
  it(`FR-041: "${CLAUSE_ROWS_IN_ORDER}"`, () => {
    expect(REQUIREMENTS).toContain(CLAUSE_ROWS_IN_ORDER)
  })

  it(`FR-041 RATIONALE: "${NOTE_TH_1}"`, () => {
    expect(REQUIREMENTS).toContain(NOTE_TH_1)
  })

  it('premise: S-73 states integer bounds', () => {
    expect(Number.isInteger(HUE_MIN) && Number.isInteger(HUE_MAX)).toBe(true)
  })

  it('premise: table T-305 names TH-1 .. TH-n in order, each hue within S-73 bounds', () => {
    const rows = expectedRoster()
    expect(rows.map((one) => one.rowId)).toEqual(rows.map((_, index) => `TH-${index + 1}`))
    for (const one of rows) {
      expect(one.hue).toBeGreaterThanOrEqual(HUE_MIN)
      expect(one.hue).toBeLessThanOrEqual(HUE_MAX)
    }
  })
})

describe('CR-557 S-1 -- theme-hue-roster.json is table T-305', () => {
  it(`FR-041 "${CLAUSE_ROWS_IN_ORDER}" -- the roster holds every row of T-305 in table order with the table hue`, () => {
    expect(readRoster()).toEqual(expectedRoster())
  })

  it(`FR-041 "${NOTE_TH_1}" -- TH-1 carries the default of S-73 (table T-216)`, () => {
    const first = readRoster()[0]
    expect(first?.rowId).toBe('TH-1')
    expect(first?.hue).toBe(s73Default())
  })

  it('every hue is an integer within S-73 bounds and no hue repeats', () => {
    const hues = readRoster().map((one) => one.hue)
    for (const hue of hues) {
      expect(Number.isInteger(hue)).toBe(true)
      expect(hue).toBeGreaterThanOrEqual(HUE_MIN)
      expect(hue).toBeLessThanOrEqual(HUE_MAX)
    }
    expect(new Set(hues).size).toBe(hues.length)
  })
})
