// The join between the fifteen marks 表 T-012 prints for `SH-5`, the fifteen
// spellings `_source/erd.json` settles for `TaskVisual.milestoneGlyph`, and the
// fifteen rows 表 T-109 places on the `Command Palette` for them.
//
// Unit driven: none. ⭐ THIS FILE DRIVES A GENERATOR, NOT A UNIT --
// `tools/generate_icon_roster.py`, whose product is
// `src/adapter/screen-renderer/icon-roster.json` (CP-37 of 表 T-062 reads it,
// and FR-053 leans on the `armsShape` field it derives). Every other case in
// tests/unit/ drives a unit of 表 T-075; this one is placed beside them because
// what it guards is what the units downstream are handed.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to, quoted from the manuscripts
// ---------------------------------------------------------------------------
//
//   the note under 表 T-012 (01-04-requirements.md), which is the whole reason
//   this file exists:
//       ⛔ 「`SH-5` が並べる 15 の印と `TaskVisual.milestoneGlyph` の綴りの対応は
//       次のとおりとすること（MUST）」（はじめの 8 つは利用者に問わずに決めた、
//       2026-08-27。あとの 7 つは利用者が図形を名指し、綴りは同じ流儀で起こした、
//       2026-08-29）—— 「〇 ＝ `circle` ／ …」
//       ⛔ 「刷る順が同じであることに頼ってはならない（MUST NOT）」 ——
//       ⚠️ 「2026-08-27 まで両者を結ぶものは「同じ順で刷られている」ことだけで
//       あり、片方を並べ替えれば誰にも気づかれずに壊れた。」
//       ⭐ 「綴りそのものは `_source/erd.json` が正である（Chapter 6.2）—— 本注が
//       持つのは印との対応だけである。」
//   FR-078  「表 T-012 の `SH-5` が挙げる図形から選べるようにすること」。⛔ 「`SH-5`
//           の並びは既定を表さない —— はじめの 8 つは面積順である（`S-48`）。」
//           ⚠️ 「あとの 7 つは面積の順を持たない —— 同じ円に内接する幾何の形では
//           ないので、面積で並べようがない。」
//   §8 of `_assets/tbl-glossary.md`  ⭐ 「`milestoneGlyph` の綴りは
//           `_source/erd.json` が持つ …… 本表に写さない。」 -- which is why 表
//           T-109 names each entrance by a MARK and never by a spelling.
//   表 T-109  its 構え column names the row of 表 T-023b an entrance arms; AR-3 is
//           the milestone arm.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE IS NEEDED AT ALL, IN THE GENERATOR'S OWN WORDS
// ---------------------------------------------------------------------------
// `tools/generate_icon_roster.py` says of the pairing it makes:
//   「⛔ THE PAIRING IS BY ORDER AND NOTHING ELSE STATES IT … the only join
//   there is is that both lists are printed in the same order. ⚠️ That is the
//   one place this script would go wrong in silence if a list were re-ordered」
// Since 2026-08-27 something else DOES state it -- the note under 表 T-012 --
// and the MUST NOT above forbids leaning on the printing order. ⭐ So these
// cases read the note and the two lists separately and require the by-position
// pairing to agree with the note's. A list re-ordered on one side alone then
// fails here instead of quietly arming the wrong glyph.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
// What was read: `docs/spec/01-04-requirements.md` (表 T-012 and the note),
// `docs/spec/_assets/tbl-glossary.md` (表 T-109), `docs/spec/_source/erd.json`,
// the head comment of `tools/generate_icon_roster.py`, and of `src/` nothing but
// the generated data file `icon-roster.json` -- which is an artifact, not a
// body. ⛔ No function body was read, and ⛔ NOT ONE OF THE FIFTEEN MARKS OR
// SPELLINGS IS TYPED IN THIS FILE. Every list is parsed out of a manuscript at
// run time.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - THE ORDER of 表 T-109's fifteen AR-3 rows against SH-5's order. FR-078
//     states in as many words that the first eight are in order of area and that
//     the other seven 「面積の順を持たない」, and no rule anywhere says 表 T-109
//     must print its rows in SH-5's order. ⭐ So the join is asserted as a
//     PAIRING (each row to one mark, all fifteen covered once) and never as a
//     sequence. A case that pinned the order would be inventing a rule.
//   - Which figure each spelling draws. 図 F-019 is the shapes' authority and
//     the manuscript refuses to write a shape out in words;
//     tests/unit/t-012-sh-5-fifteen-figures.test.ts measures that the fifteen
//     differ, which is what the specification does settle.
//   - Whether the generated roster is IN STEP with the manuscript at all --
//     `npm run gen:check` owns that, and these cases would still be reading the
//     manuscript if it were not.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { bare, specTable } from '../contract/spec-table'

// ===========================================================================
// List one -- the marks 表 T-012 prints for SH-5
// ===========================================================================

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

/** The marks SH-5 prints, in the order it prints them. */
const MARKS: readonly string[] = ((): readonly string[] => {
  const row = T_012.rows.find((one) => one.id === 'SH-5')
  if (row === undefined) throw new Error('表 T-012 no longer has row SH-5')
  return (row.by[MARK_COLUMN] ?? '').split(/\s+/u).filter((one) => one.length > 0)
})()

// ===========================================================================
// List two -- the spellings `_source/erd.json` settles
// ===========================================================================

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

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

// ===========================================================================
// The note that pairs the two -- the only line of the manuscript that does
// ===========================================================================

/** The full-width equals sign the note pairs a mark to a spelling with. */
const PAIRS = '＝'

/**
 * The note's own pairing: mark -> spelling.
 *
 * ⛔ Found by what it SAYS rather than by a line number. A note that moved would
 * still be found; a note that was deleted stops this file at read time, which is
 * the honest answer -- the MUST would then have nowhere to live.
 */
const NOTE_PAIRING: ReadonlyMap<string, string> = ((): ReadonlyMap<string, string> => {
  const lines = REQUIREMENTS.split('\n').filter(
    (line) => line.includes('`SH-5`') && line.includes('milestoneGlyph') && line.includes(PAIRS),
  )
  if (lines.length !== 1) {
    throw new Error(
      `01-04-requirements.md holds ${lines.length} lines pairing SH-5's marks to ` +
        '`milestoneGlyph` spellings, and exactly one must',
    )
  }
  const pairs = [...(lines[0] as string).matchAll(/([^\s／—*`]+)\s*＝\s*`([^`]+)`/gu)]
  return new Map(pairs.map((found) => [found[1] as string, found[2] as string]))
})()

// ===========================================================================
// List three -- the rows 表 T-109 places on the palette for the marks
// ===========================================================================

/** U-26 of 表 T-103, as 表 T-109's 面 column spells it. */
const COMMAND_PALETTE = 'Command Palette'
/** The row of 表 T-023b the milestone entrances arm. */
const MILESTONE_ARM = 'AR-3'

interface MilestoneEntrance {
  /** The row of 表 T-109 -- the only join that table admits. */
  readonly row: string
  /** Its 何の入口か cell, as the table writes it. */
  readonly entrance: string
}

const MILESTONE_ENTRANCES: readonly MilestoneEntrance[] = T_109.rows
  .filter((row) => bare(row.by[T_109_SURFACE_COLUMN] ?? '') === COMMAND_PALETTE)
  .filter((row) => bare(row.by[T_109_ARM_COLUMN] ?? '') === MILESTONE_ARM)
  .map((row) => ({ row: row.id, entrance: row.by[T_109_ENTRANCE_COLUMN] ?? '' }))

/** The marks of SH-5 one 何の入口か cell prints. */
const marksPrintedBy = (entrance: string): readonly string[] =>
  MARKS.filter((mark) => entrance.includes(mark))

// ===========================================================================
// What the generator carried into `src/` from all three
// ===========================================================================

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

// ===========================================================================

describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT MATCHED NOTHING WOULD MAKE EVERY CASE BELOW
    // AGREE WITH ANYTHING (rule 04 section 2).
    expect(MARKS.length).toBeGreaterThan(1)
    expect(GLYPHS.length).toBeGreaterThan(1)
    expect(NOTE_PAIRING.size).toBeGreaterThan(1)
    expect(MILESTONE_ENTRANCES.length).toBeGreaterThan(1)
  })
})

describe('the note under 表 T-012 pairs SH-5 to `TaskVisual.milestoneGlyph`', () => {
  it('pairs every mark SH-5 prints, and no mark it does not', () => {
    // ⛔ 「`SH-5` が並べる 15 の印と …… の綴りの対応は次のとおりとすること
    // （MUST）」. A pairing that skipped a mark would leave a figure a person can
    // choose with no spelling to store it under.
    expect([...NOTE_PAIRING.keys()].sort()).toEqual([...MARKS].sort())
  })

  it('names every spelling `_source/erd.json` settles, and no spelling it does not', () => {
    // ⭐ 「綴りそのものは `_source/erd.json` が正である …… 本注が持つのは印との
    // 対応だけである」 -- so the note may not mint a spelling of its own, and may
    // not leave one of the settled ones unpaired.
    expect([...NOTE_PAIRING.values()].sort()).toEqual([...GLYPHS].sort())
  })

  it('pairs one to one -- no spelling stands against two marks', () => {
    expect(new Set(NOTE_PAIRING.values()).size).toBe(NOTE_PAIRING.size)
  })
})

describe('⛔ the printing order is not what joins the two lists (MUST NOT)', () => {
  it('the by-position pairing the generator makes is the pairing the note states', () => {
    // ⛔ 「刷る順が同じであることに頼ってはならない（MUST NOT）」, and
    // `tools/generate_icon_roster.py` pairs them with `dict(zip(marks,
    // settled))` -- BY POSITION -- in as many words. ⚠️ 「片方を並べ替えれば
    // 誰にも気づかれずに壊れた」: this case is where that stops being true.
    // ⭐ It does NOT require the order to be a rule; it requires the order the
    // two lists happen to be printed in to still agree with the pairing that IS
    // the rule.
    const byPosition = new Map(MARKS.map((mark, at) => [mark, GLYPHS[at] as string]))
    expect([...byPosition]).toEqual([...NOTE_PAIRING])
  })

  it('the same holds spelling for spelling, which is the direction a reorder breaks', () => {
    // ⭐ The case above compares whole maps; this one names the mark that moved,
    // so a failure says WHICH pair drifted rather than that the maps differ.
    MARKS.forEach((mark, at) => {
      expect(NOTE_PAIRING.get(mark), `SH-5's mark #${at + 1}`).toBe(GLYPHS[at])
    })
  })
})

describe('表 T-109 places one palette entrance against each of SH-5\'s marks', () => {
  it('there is one AR-3 entrance per mark, and no mark is left without one', () => {
    // FR-078 「表 T-012 の `SH-5` が挙げる図形から選べるようにすること」, and 表
    // T-109 is 「アイコンの全数」 (FR-029) -- so a mark with no row there is a
    // figure with no way to choose it.
    expect(MILESTONE_ENTRANCES.length).toBe(MARKS.length)
  })

  it('every AR-3 entrance prints exactly one of the marks', () => {
    // ⭐ §8 of the glossary keeps the SPELLINGS out of 表 T-109 (「本表に写さな
    // い」), so the mark in the 何の入口か cell is the only thing joining a row
    // to a glyph. A cell printing two marks, or none, breaks that join.
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
    // ⭐ THIS IS THE JOIN THE SCREEN AND THE INPUT SIDE BOTH USE. `armsShape` is
    // derived by the generator from the two lists BY POSITION; the note is what
    // settles the pairing. If ever the two part company, an entrance draws one
    // figure and arms another -- and the person sees the wrong mark placed.
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
    // ⛔ A spelling carried by a row that is not one of the fifteen would arm a
    // milestone glyph from an entrance 表 T-109 gives another arm to -- FR-053's
    // 「どの入口がどの構えかは 表 T-109 の `構え` の欄が持つ」 in reverse.
    const theFifteen = new Set(MILESTONE_ENTRANCES.map((one) => one.row))
    for (const icon of ROSTER) {
      if (theFifteen.has(icon.rowId)) continue
      expect(GLYPHS, `${icon.rowId} arms a milestone glyph`).not.toContain(icon.armsShape ?? null)
    }
  })
})
