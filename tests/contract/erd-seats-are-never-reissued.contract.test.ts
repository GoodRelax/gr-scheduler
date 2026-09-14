// Contract: ET-/AT-/RL-/DV- seat numbers are never reissued (Chapter 5.4, table T-218 TS-5).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, type SpecRow, unbroken } from './spec-table'

const MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'erd.json'), 'utf8'),
) as {
  readonly entities: readonly {
    readonly seat: number
    readonly name: string
    readonly carry_seat?: number
    readonly columns: readonly { readonly seat: number; readonly name: string }[]
  }[]
  readonly relations: readonly {
    readonly seat: number
    readonly parent: string
    readonly child: string
  }[]
  readonly derived: readonly {
    readonly seat: number
    readonly entity: string
    readonly name: string
  }[]
}

interface Seated {
  readonly seat: number
  // WHY: point at rows by name, never by position -- Chapter 5.4 requires it.
  readonly named: string
}

interface Family {
  readonly prefix: 'ET' | 'RL' | 'AT' | 'DV'
  readonly table: string
  readonly written: readonly Seated[]
  nameOfPrinted(row: SpecRow): string
}

const bare = (cell: string): string => cell.replace(/`/g, '').trim()

const FAMILIES: readonly Family[] = [
  {
    prefix: 'ET',
    table: 'T-056',
    written: MANUSCRIPT.entities.map((entity) => ({ seat: entity.seat, named: entity.name })),
    nameOfPrinted: (row) => bare(row.cells[0] ?? ''),
  },
  {
    prefix: 'RL',
    table: 'T-057',
    written: [
      ...MANUSCRIPT.relations.map((relation) => ({
        seat: relation.seat,
        named: `${relation.parent} -> ${relation.child}`,
      })),
      // WHY: the eight carryElements rows are derived, but their numbers are
      // written on the owning entity, so a new relation cannot renumber them.
      ...MANUSCRIPT.entities
        .filter((entity) => entity.carry_seat !== undefined)
        .map((entity) => ({
          seat: entity.carry_seat ?? 0,
          named: `${entity.name} -> CarryElement`,
        })),
    ],
    nameOfPrinted: (row) => `${bare(row.cells[0] ?? '')} -> ${bare(row.cells[1] ?? '')}`,
  },
  {
    prefix: 'AT',
    table: 'T-058',
    written: MANUSCRIPT.entities.flatMap((entity) =>
      entity.columns.map((column) => ({
        seat: column.seat,
        named: `${entity.name}.${column.name}`,
      })),
    ),
    nameOfPrinted: (row) => `${bare(row.cells[0] ?? '')}.${bare(row.cells[1] ?? '')}`,
  },
  {
    prefix: 'DV',
    table: 'T-059',
    written: MANUSCRIPT.derived.map((one) => ({
      seat: one.seat,
      named: `${one.entity}.${one.name}`,
    })),
    nameOfPrinted: (row) => `${bare(row.cells[0] ?? '')}.${bare(row.cells[1] ?? '')}`,
  },
]

const printedOf = (family: Family): ReadonlyMap<number, SpecRow> => {
  const rows = new Map<number, SpecRow>()
  for (const row of specTable(family.table).rows) {
    const match = /^([A-Z]+)-(\d+)$/.exec(row.id)
    if (match === null || match[1] !== family.prefix) continue
    rows.set(Number(match[2]), row)
  }
  return rows
}

const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

// WHY: rule 03 section 5 keeps code ASCII but allows the exact clause text
// here -- matching it against the manuscript is what tests the specification.
const THE_CLAUSE =
  '⭐ `ET-` / `AT-` / `RL-` / `DV-` の番号は席番号である。一度与えた番号を振り直してはならない（MUST NOT）。'

const FROM_THE_MANUSCRIPT =
  '原稿（`_source/erd.json`）の行がそれぞれ自分の `seat` を持ち、生成器はそれを印字する。'

const ADDING_A_ROW_MOVES_NOTHING = '**行を足しても、それ以降の番号は動かない。**'

const POINT_BY_NAME =
  '**外から指すときは名前で指すこと** —— エンティティは名前で、列はエンティティ名と列名の対で指す'

describe('Chapter 5.4 -- the manuscript this file is driven by', () => {
  it('still says the four prefixes are seats and may not be reissued', () => {
    expect(DESIGN).toContain(THE_CLAUSE)
  })

  it('still says the number comes from the manuscript, and that adding a row moves nothing', () => {
    expect(DESIGN).toContain(FROM_THE_MANUSCRIPT)
    expect(DESIGN).toContain(ADDING_A_ROW_MOVES_NOTHING)
  })

  it('still says a row is pointed at by name, which is how every case below matches', () => {
    expect(DESIGN).toContain(POINT_BY_NAME)
  })

  it('names `_source/erd.json` as the one manuscript these four tables come from', () => {
    expect(DESIGN).toContain('日程データの群は `_source/erd.json`')
    expect(MANUSCRIPT.entities.length).toBeGreaterThan(0)
    expect(MANUSCRIPT.relations.length).toBeGreaterThan(0)
    expect(MANUSCRIPT.derived.length).toBeGreaterThan(0)
  })
})

describe('every row the manuscript writes carries its own seat', () => {
  for (const family of FAMILIES) {
    it(`${family.prefix}: every row has a seat, and it is a whole number above zero`, () => {
      expect(family.written.length, `${family.prefix} has no rows at all`).toBeGreaterThan(0)
      for (const row of family.written) {
        expect(Number.isInteger(row.seat), `${family.prefix} row ${row.named} has no seat`).toBe(
          true,
        )
        expect(row.seat, `${family.prefix} row ${row.named}`).toBeGreaterThan(0)
      }
    })

    it(`${family.prefix}: no seat is carried by two rows`, () => {
      // WHY: within one manuscript, two rows can't share a seat; that misses
      // a reissue across time, which the next case catches instead.
      const bySeat = new Map<number, string[]>()
      for (const row of family.written) {
        bySeat.set(row.seat, [...(bySeat.get(row.seat) ?? []), row.named])
      }
      const shared = [...bySeat.entries()]
        .filter(([, named]) => named.length > 1)
        .map(([seat, named]) => `${family.prefix}-${seat}: ${named.join(' and ')}`)
      expect(shared).toEqual([])
    })
  }
})

describe('the generated table prints the seat the manuscript gave, not a position', () => {
  for (const family of FAMILIES) {
    it(`${family.table} (${family.prefix}): each row is printed under its own seat`, () => {
      // WHY: matched by name, not position -- a positional generator would
      // fail here since AT-139 (Project.outlineBase) sits mid-block, not at its index.
      const printed = printedOf(family)
      const wrong: string[] = []
      for (const row of family.written) {
        const at = printed.get(row.seat)
        if (at === undefined) {
          wrong.push(`${family.prefix}-${row.seat} (${row.named}) is not printed at all`)
          continue
        }
        const named = family.nameOfPrinted(at)
        if (named !== row.named) {
          wrong.push(`${family.prefix}-${row.seat} prints ${named}, the manuscript seats ${row.named}`)
        }
      }
      expect(wrong).toEqual([])
    })
  }

  it('AT: at least one seat is out of file order, so the case above is not vacuous', () => {
    // WHY: without this, seats running 1..n in file order would pass the
    // cases above even under a positional generator, holding the rule on nothing.
    const at = FAMILIES.find((family) => family.prefix === 'AT')
    if (at === undefined) throw new Error('the AT family is gone')
    const inFileOrder = at.written.map((row) => row.seat)
    expect(
      inFileOrder,
      'every AT seat equals its position, so nothing here can tell a seat from an index',
    ).not.toEqual([...inFileOrder].sort((left, right) => left - right))
  })
})

describe('every printed number is a seat the manuscript gave', () => {
  for (const family of FAMILIES) {
    it(`${family.table} (${family.prefix}): prints no number the manuscript did not seat`, () => {
      // WHY: the other direction -- a number no seat gave was numbered from
      // something else (in practice, list position), so a new row would renumber it.
      const seated = new Set(family.written.map((row) => row.seat))
      const unseated = [...printedOf(family).entries()]
        .filter(([seat]) => !seated.has(seat))
        .map(([seat, row]) => `${family.prefix}-${seat} (${family.nameOfPrinted(row)})`)
      expect(unseated).toEqual([])
    })
  }
})
