// 「⭐⭐ **`ET-` / `AT-` / `RL-` / `DV-` の番号は席番号である。一度与えた番号を
// 振り直してはならない（MUST NOT）。**原稿（`_source/erd.json`）の行がそれぞれ
// 自分の `seat` を持ち、生成器はそれを印字する。**行を足しても、それ以降の番号は
// 動かない。**」 -- Chapter 5.4 of docs/spec/05-07-design.md, the sentence
// CR-360 put there on 2026-09-06.
//
// ---------------------------------------------------------------------------
// WHERE TABLE T-218 PUTS THIS FILE, AND WHY IT IS A CONTRACT CASE
// ---------------------------------------------------------------------------
// `TS-5`, tests/contract/ -- 「the seams. Owned by neither side of a seam,
// driven by a specification table」 (vitest.config.ts). ⭐ The seam here is the
// one Chapter 5.4 declares in that same sentence: a MANUSCRIPT
// (`docs/spec/_source/erd.json`) on one side, a GENERATED DOCUMENT
// (`docs/spec/_assets/fig-erd-detail.md`, tables T-056 to T-059) on the other,
// and a rule about what may cross it. ⛔ It is not `TS-6`: no unit of table
// T-062 is driven, and nothing under `src/` is read at all.
//
// ⚠️ CHECK 16 IS NOT THIS. That check rebuilds the generated documents and
// compares them, which passes whether the printed number came from a `seat` or
// from the row's position in the file -- it was passing for the whole period
// Chapter 5.4 records as 「かつては表の中の位置であった。⛔ そのあいだに 2 度、
// 参照が黙ってずれた記録が残っている」. What is asserted here is the thing that
// check cannot see: WHERE the number came from.
//
// ---------------------------------------------------------------------------
// ⛔ NOTHING UNDER `src/` IS READ
// ---------------------------------------------------------------------------
// Both sides of every comparison are files under docs/spec/. The one program
// this file leans on is `tests/contract/spec-table.ts`, which reads a numbered
// table out of the manuscript at run time so that a copy of the table cannot
// fall behind it (Chapter 1.9 :275).
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   Chapter 5.4  the sentence above, and 「外から指すときは名前で指すこと ——
//           エンティティは名前で、列はエンティティ名と列名の対で指す
//           （`Task.wbsParentUid` の形。表 T-006a の `W-7`）」, which is why
//           every comparison below is keyed on a NAME and never on a position.
//   Chapter 5.4  「起こす原稿は 2 つとする（MUST）—— 日程データの群は
//           `_source/erd.json`」 and 「原稿は `_source/` に置くこと（MUST）」 --
//           which file is the manuscript.
//   T-056 ET / T-057 RL / T-058 AT / T-059 DV -- the four generated tables the
//           four prefixes number.
//   T-224 NF-4  the same rule stated for a different family of seats:
//           「⚠️ **欠番のままとする。** 使われないまま残った席番号であり、
//           **別のものに割り当て直してはならない（MUST NOT）**」 -- which is why
//           no case below demands the seats be contiguous.
//
// ---------------------------------------------------------------------------
// ⛔⛔ WHAT IS DELIBERATELY NOT ASSERTED: CONTIGUITY
// ---------------------------------------------------------------------------
// A seat may be VACANT. Deleting a row leaves its number empty and the number
// stays empty -- that is the whole of what 「振り直してはならない」 buys, and
// `NF-4` of table T-224, `S-52`, `S-185` and `FR-050` are four places the
// specification has already done exactly that. ⛔ A case demanding
// `1..n` with no gaps would therefore FORBID the rule it was written to hold.
// ⚠️ Measured 2026-09-06 at commit c782071: no family has a vacancy yet, which
// is why nothing below reads a gap either way -- the first deletion must not
// turn a green case red.
//
// ---------------------------------------------------------------------------
// ⭐⭐ ONE CASE IS RED ON PURPOSE, AND WHAT WAS MEASURED IS HERE
// ---------------------------------------------------------------------------
// Measured 2026-09-06 at commit c782071: table T-057 prints THIRTY `RL-` rows
// while the manuscript carries TWENTY-TWO seats. `RL-23` to `RL-30` are the
// eight 「解釈しない要素の退避先（`carryElements`）」 rows, and they hold no
// `seat` of their own -- they are numbered from the end of whatever the
// manuscript last gave. ⇒ Writing ONE more relation into the manuscript
// renumbers all eight, which is precisely 「振り直す」. A-appendix 1.84 counts
// what CR-360 seated -- 「18 エンティティ・138 列・22 関連・10 導出」 -- and 22
// is the number that leaves those eight out.
//
// ⛔ THE ASSERTION IS NOT WEAKENED TO MAKE IT PASS. Chapter 5.4 says `RL-`
// numbers are seats without qualifying which ones, so a case that excused eight
// of thirty would be holding a rule the manuscript does not carry.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, type SpecRow, unbroken } from './spec-table'

// ===========================================================================
// 1. The manuscript
// ===========================================================================

const MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'erd.json'), 'utf8'),
) as {
  readonly entities: readonly {
    readonly seat: number
    readonly name: string
    /** The RL- seat of this entity's derived carryElements row, where it has one. */
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

/** One seated row: the number the manuscript gave it, and how it is named. */
interface Seated {
  readonly seat: number
  /** 「外から指すときは名前で指すこと」 -- the identity, never a position. */
  readonly named: string
}

interface Family {
  /** The prefix Chapter 5.4 names. */
  readonly prefix: 'ET' | 'RL' | 'AT' | 'DV'
  /** The generated table it numbers. */
  readonly table: string
  readonly written: readonly Seated[]
  /** How the same row is named from the printed table's own cells. */
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
      // ⭐ The eight carryElements rows are DERIVED -- the manuscript writes no
      // relation for them -- but their NUMBERS are written, on the entity that
      // owns the carry, exactly so that writing one more relation cannot
      // renumber them. They are seats like any other and belong in this list.
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
        // 「列はエンティティ名と列名の対で指す（`Task.wbsParentUid` の形）」.
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

/** The printed rows of one family, by the number the document prints. */
const printedOf = (family: Family): ReadonlyMap<number, SpecRow> => {
  const rows = new Map<number, SpecRow>()
  for (const row of specTable(family.table).rows) {
    const match = /^([A-Z]+)-(\d+)$/.exec(row.id)
    if (match === null || match[1] !== family.prefix) continue
    rows.set(Number(match[2]), row)
  }
  return rows
}

// ===========================================================================
// 2. The sentence, read out of the manuscript rather than believed
// ===========================================================================

const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

/**
 * ⚠️ A Japanese literal in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- this string IS the
 * clause, and matching it against the manuscript is what makes the cases below
 * cases about the specification rather than about this file's memory.
 */
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

// ===========================================================================
// 3. 「原稿の行がそれぞれ自分の `seat` を持ち」
// ===========================================================================

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
      // ⭐ THE PLAINEST READING OF 「振り直してはならない」: a number that named
      // one row may not also name another. ⚠️ Within one manuscript this catches
      // a reissue that has already happened; it cannot see one across time,
      // which is why the case below asks where the printed number came from.
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

// ===========================================================================
// 4. 「生成器はそれを印字する」 / 「行を足しても、それ以降の番号は動かない」
// ===========================================================================

describe('the generated table prints the seat the manuscript gave, not a position', () => {
  for (const family of FAMILIES) {
    it(`${family.table} (${family.prefix}): each row is printed under its own seat`, () => {
      // ⭐⭐ MATCHED BY NAME, WHICH IS WHAT MAKES THIS A TEST OF THE RULE. If the
      // generator numbered rows by their position in the file, this comparison
      // would fail for every row whose seat is not its index -- and 表 T-058
      // has one today: `Project.outlineBase` holds `AT-139` while sitting in the
      // middle of the `Project` block (A-appendix 1.85), so the AT case below
      // really is pressing the mechanism and not restating the file order.
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
    // ⛔ WITHOUT THIS, a manuscript whose seats happened to run 1..n in file
    // order would pass the cases above under a positional generator, and the
    // rule would be held by nothing. ⚠️ It asserts only that SOME family has
    // been added to since the seats were given -- the day a row is added to a
    // second family, this stays true.
    const at = FAMILIES.find((family) => family.prefix === 'AT')
    if (at === undefined) throw new Error('the AT family is gone')
    const inFileOrder = at.written.map((row) => row.seat)
    expect(
      inFileOrder,
      'every AT seat equals its position, so nothing here can tell a seat from an index',
    ).not.toEqual([...inFileOrder].sort((left, right) => left - right))
  })
})

// ===========================================================================
// 5. ⭐⭐ Every printed number is a seat -- the case that closed the RL hole
// ===========================================================================

describe('every printed number is a seat the manuscript gave', () => {
  for (const family of FAMILIES) {
    it(`${family.table} (${family.prefix}): prints no number the manuscript did not seat`, () => {
      // ⭐⭐ THE OTHER DIRECTION, AND THE ONE THAT CATCHES A NUMBER THAT MOVES.
      // A row printed under a number no `seat` gave was numbered from something
      // else -- in practice from the end of the list -- so writing one more row
      // into the manuscript renumbers it. That is 「振り直す」, whatever the
      // reason for it.
      //
      // ⭐ THIS CASE WAS RED WHEN IT WAS WRITTEN and it is what closed the
      // hole. Measured 2026-09-06 at commit c782071: `RL-23` to `RL-30`, the
      // eight 「解釈しない要素の退避先」 rows, held no seat -- they were
      // numbered from the end of the relation list, so writing one more
      // relation would have renumbered all eight. ⛔ The case was NOT narrowed
      // to the three families that passed: Chapter 5.4 names `RL-` among the
      // four without qualifying which of its rows it means, so the manuscript
      // was given `carry_seat` instead.
      const seated = new Set(family.written.map((row) => row.seat))
      const unseated = [...printedOf(family).entries()]
        .filter(([seat]) => !seated.has(seat))
        .map(([seat, row]) => `${family.prefix}-${seat} (${family.nameOfPrinted(row)})`)
      expect(unseated).toEqual([])
    })
  }
})
