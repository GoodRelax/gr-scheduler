// Unit test: the join between SH-5's marks, milestoneGlyph's spellings, and T-109's palette rows.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { bare, bareAll, paragraphsOf, specTable, unbroken } from '../contract/spec-table'

const T_012 = specTable('T-012')
const T_109 = specTable('T-109')

const MARK_COLUMN = '表記'
const T_109_ARM_COLUMN = '構え'
const T_109_ENTRANCE_COLUMN = '何の入口か'
const T_109_SURFACE_COLUMN = '面'

for (const [table, headings, column] of [
  ['T-012', T_012.headings, MARK_COLUMN],
  ['T-109', T_109.headings, T_109_ARM_COLUMN],
  ['T-109', T_109.headings, T_109_ENTRANCE_COLUMN],
  ['T-109', T_109.headings, T_109_SURFACE_COLUMN],
] as const) {
  if (!headings.includes(column)) {
    throw new Error(`表 ${table} no longer has a ${column} column: ${headings.join(' | ')}`)
  }
}

const MARKS: readonly string[] = ((): readonly string[] => {
  const row = T_012.rows.find((one) => one.id === 'SH-5')
  if (row === undefined) throw new Error('表 T-012 no longer has row SH-5')
  return (row.by[MARK_COLUMN] ?? '').split(/\s+/u).filter((one) => one.length > 0)
})()

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const GLYPHS: readonly string[] = ((): readonly string[] => {
  const erd = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'erd.json'), 'utf8'),
  ) as {
    readonly entities: readonly {
      readonly name: string
      readonly columns: readonly {
        readonly name: string
        readonly json?: { readonly values?: readonly string[] }
      }[]
    }[]
  }
  for (const entity of erd.entities) {
    if (entity.name !== 'TaskVisual') continue
    for (const column of entity.columns) {
      if (column.name !== 'milestoneGlyph') continue
      const values = column.json?.values
      if (values !== undefined) return values
    }
  }
  throw new Error('_source/erd.json no longer settles `TaskVisual.milestoneGlyph`')
})()

const PAIRS = '＝'

// WHY: found by what the note SAYS, not a line number, so a moved note is
// still found and a deleted note fails here rather than silently.
const NOTE_PAIRING: ReadonlyMap<string, string> = ((): ReadonlyMap<string, string> => {
  const lines = paragraphsOf(REQUIREMENTS).filter(
    (one) => one.includes('`SH-5`') && one.includes('milestoneGlyph') && one.includes(PAIRS),
  )
  if (lines.length !== 1) {
    throw new Error(
      `01-04-requirements.md holds ${lines.length} paragraphs pairing SH-5's marks to ` +
        '`milestoneGlyph` spellings, and exactly one must',
    )
  }
  const pairs = [...(lines[0] as string).matchAll(/([^\s／—*`]+)\s*＝\s*`([^`]+)`/gu)]
  return new Map(pairs.map((found) => [found[1] as string, found[2] as string]))
})()

const COMMAND_PALETTE = 'Command Palette'
const MILESTONE_ARM = 'AR-3'

interface MilestoneEntrance {
  readonly row: string
  readonly entrance: string
}

const MILESTONE_ENTRANCES: readonly MilestoneEntrance[] = T_109.rows
  .filter((row) => bareAll(row.by[T_109_SURFACE_COLUMN] ?? '').includes(COMMAND_PALETTE))
  .filter((row) => bare(row.by[T_109_ARM_COLUMN] ?? '') === MILESTONE_ARM)
  .map((row) => ({ row: row.id, entrance: row.by[T_109_ENTRANCE_COLUMN] ?? '' }))

const marksPrintedBy = (entrance: string): readonly string[] =>
  MARKS.filter((mark) => entrance.includes(mark))

interface RosterIcon {
  readonly rowId: string
  readonly arms: string | null
  readonly armsShape?: string | null
}

const ROSTER: readonly RosterIcon[] = (
  JSON.parse(
    readFileSync(
      join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'icon-roster.json'),
      'utf8',
    ),
  ) as { readonly icons: readonly RosterIcon[] }
).icons

const rosterRow = (row: string): RosterIcon => {
  const found = ROSTER.find((one) => one.rowId === row)
  if (found === undefined) throw new Error(`icon-roster.json has no row ${row}`)
  return found
}

describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    // TRAP: an empty parse of any of these four lists makes every case below
    // pass vacuously; these length checks are what stops that (rule 04.2).
    expect(MARKS.length).toBeGreaterThan(1)
    expect(GLYPHS.length).toBeGreaterThan(1)
    expect(NOTE_PAIRING.size).toBeGreaterThan(1)
    expect(MILESTONE_ENTRANCES.length).toBeGreaterThan(1)
  })
})

describe('the note under 表 T-012 pairs SH-5 to `TaskVisual.milestoneGlyph`', () => {
  it('pairs every mark SH-5 prints, and no mark it does not', () => {
    expect([...NOTE_PAIRING.keys()].sort()).toEqual([...MARKS].sort())
  })

  it('names every spelling `_source/erd.json` settles, and no spelling it does not', () => {
    expect([...NOTE_PAIRING.values()].sort()).toEqual([...GLYPHS].sort())
  })

  it('pairs one to one -- no spelling stands against two marks', () => {
    expect(new Set(NOTE_PAIRING.values()).size).toBe(NOTE_PAIRING.size)
  })
})

describe('⛔ the printing order is not what joins the two lists (MUST NOT)', () => {
  it('the by-position pairing the generator makes is the pairing the note states', () => {
    // WHY: this does not assert an order rule; it only requires the order the
    // lists happen to print in to still agree with the pairing that is the rule.
    const byPosition = new Map(MARKS.map((mark, at) => [mark, GLYPHS[at] as string]))
    expect([...byPosition]).toEqual([...NOTE_PAIRING])
  })

  it('the same holds spelling for spelling, which is the direction a reorder breaks', () => {
    // WHY: the prior case compares whole maps; this one names the mark that
    // moved, so a failure says which pair drifted.
    MARKS.forEach((mark, at) => {
      expect(NOTE_PAIRING.get(mark), `SH-5's mark #${at + 1}`).toBe(GLYPHS[at])
    })
  })
})

describe('表 T-109 places one palette entrance against each of SH-5\'s marks', () => {
  it('there is one AR-3 entrance per mark, and no mark is left without one', () => {
    expect(MILESTONE_ENTRANCES.length).toBe(MARKS.length)
  })

  it('every AR-3 entrance prints exactly one of the marks', () => {
    for (const entrance of MILESTONE_ENTRANCES) {
      expect(marksPrintedBy(entrance.entrance), `${entrance.row}: ${entrance.entrance}`).toHaveLength(
        1,
      )
    }
  })

  it('the fifteen entrances cover the fifteen marks once each', () => {
    const printed = MILESTONE_ENTRANCES.map((one) => marksPrintedBy(one.entrance)[0] as string)
    expect([...printed].sort()).toEqual([...MARKS].sort())
  })
})

describe('what the generator carried into `src/` is the pairing the note states', () => {
  it('every AR-3 row of 表 T-109 reaches the roster carrying the note\'s own spelling', () => {
    // WHY: armsShape is what both the screen and the input side read; if it
    // drifts from the note, an entrance draws one figure and arms another.
    for (const entrance of MILESTONE_ENTRANCES) {
      const mark = marksPrintedBy(entrance.entrance)[0] as string
      const expected = NOTE_PAIRING.get(mark)
      expect(expected, `the note pairs no spelling to ${mark}`).toBeDefined()
      const carried = rosterRow(entrance.row)
      expect(carried.arms, entrance.row).toBe(MILESTONE_ARM)
      expect(carried.armsShape ?? null, `${entrance.row} (${mark})`).toBe(expected)
    }
  })

  it('no OTHER row of the roster carries one of the fifteen spellings', () => {
    const theFifteen = new Set(MILESTONE_ENTRANCES.map((one) => one.row))
    for (const icon of ROSTER) {
      if (theFifteen.has(icon.rowId)) continue
      expect(GLYPHS, `${icon.rowId} arms a milestone glyph`).not.toContain(icon.armsShape ?? null)
    }
  })
})
