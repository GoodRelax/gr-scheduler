// FR-053 (MUST): the entrance that is ARMED is drawn apart from the entrances
// that are NOT -- and there is one of it.
//
// Unit under test: UF-65 of table T-075 (`command-palette.ts`, component CP-37
// of table T-062, published as PI-37 of table T-064). It is the unit that fills
// `CommandItem.isArmed`, which is the member the drawing side paints S-183 and
// S-185 onto.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-053   ⛔ 「いま構えている入口を、構えていない入口と見分けられるように描く
//            こと（MUST）」 —— 「構えは持続する（表 T-023b）ので、何を構えている
//            か読めないと、置くつもりのないものが置かれる。」
//            ⭐ 「どの入口がどの構えかは 表 T-109 の `構え` の欄が持つ。」色は
//            `S-183`、縁の太さは `S-185` とすること（MUST）。
//            ⛔ 「押されている形にしてはならない（MUST NOT）」 —— 表 T-109 の
//            `IC-54` が「ボタンではない」と明記している。
//   T-023b   構え。AR-1 (なし、既定) から AR-6 まで。「構えの各値は排他であり、
//            依存線を構えれば図形の構えは外れる。」
//   T-109    アイコンの全数。第 2 列 `面` が置き場所、`構え` の欄が「その入口が
//            押されたときポインタが入る 表 T-023b の行」、`何の入口か` の欄が
//            その入口が構える形状を 表 T-012 の行 ID で名指す。
//   T-012    タスク形状（`shapeKind`）。`値` の欄が綴りを持つ（SH-1 = 'rectangle'）。
//   erd.json `TaskVisual.milestoneGlyph` の 8 つの綴り。⭐ 表 T-109 の section 8
//            の前書きが、綴りは本表に写さず `_source/erd.json` が持つと述べる。
//
// ---------------------------------------------------------------------------
// ⛔ THE TENSION IN FR-053, AND WHY THESE CASES READ IT THE WAY THEY DO
// ---------------------------------------------------------------------------
//
// The requirement says two things about the join, and only one of them is fine
// enough to answer the MUST:
//
//   1. 「どの入口がどの構えかは 表 T-109 の `構え` の欄が持つ」 -- and that
//      column is MANY-TO-ONE. `AR-2` stands against four entrances and `AR-3`
//      against eight, which the first case below MEASURES rather than assumes.
//   2. 「いま構えている入口を、構えていない入口と見分けられるように描くこと」 --
//      one armed entrance, told apart from the rest.
//
// ⛔ Reading (1) as the whole join breaks (2): a person who arms the rectangle
// sees the chevron, the arrow and the endpoint span marked as well, and three
// entrances that are NOT armed are then drawn exactly like the one that is.
// ⭐ The finer join the MUST needs is in the specification already, in the same
// table: table T-109's 何の入口か column names the very row of table T-012 each
// of those four entrances arms (`SH-1` .. `SH-4`), and table T-012's 値 column
// spells it. The cases below are driven by that join, read at run time.
// ⚠️ REPORTED, NOT PAPERED OVER: FR-053 would be clearer if the sentence about
// the 構え column said that it names the KIND of arm and that the entrance is
// found by what it arms. No case here invents that sentence -- they assert only
// what the MUST states.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for every rule above, and of `src/` nothing but the
// exported declarations these cases must call or name -- the signature of
// `commandPaletteFromScreenState`, the `CommandPalette` / `PaletteGroup` /
// `CommandItem` / `ScreenSession` types, and the `Armed` / `ScreenState` /
// `Selection` constructors. ⛔ No function body of UF-65 was read, and every
// expected value below is read out of a manuscript at run time rather than
// typed here.
//
// ⚠️ THE ONE THING THAT IS NOT READ OUT OF A TABLE is which member of the
// `Armed` union stands for which row of table T-023b (AR-2 is `taskShape`,
// AR-3 is `milestoneShape`, and so on). The union is a name the specification
// has not settled -- `Armed` says so of AR-3 in as many words -- so the mapping
// is written below with the row id beside it, and it is the one thing to
// re-read if table T-023b grows a row.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  emptyScreenState,
  screenStateWithArmed,
  screenStateWithPalette,
  type Armed,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type {
  CommandItem,
  CommandPalette,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { commandPaletteFromScreenState } from '../../src/adapter/screen-renderer/command-palette'
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that takes
// its copy from the .md at read time, so a row that moves in the specification
// moves here too instead of going stale.
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscripts, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

const T_109 = specTable('T-109')
const T_023b = specTable('T-023b')
const T_012 = specTable('T-012')

/** U-26 of table T-103, as table T-109's 面 column spells it. */
const COMMAND_PALETTE = 'Command Palette'

const SURFACE_COLUMN = '面'
const ARM_COLUMN = '構え'
const ENTRANCE_COLUMN = '何の入口か'
const SHAPE_SPELLING_COLUMN = '値'

for (const column of [SURFACE_COLUMN, ARM_COLUMN, ENTRANCE_COLUMN]) {
  if (!T_109.headings.includes(column)) {
    throw new Error(`table T-109 no longer has a ${column} column: ${T_109.headings.join(' | ')}`)
  }
}
if (!T_012.headings.includes(SHAPE_SPELLING_COLUMN)) {
  throw new Error(`table T-012 no longer has a ${SHAPE_SPELLING_COLUMN} column`)
}

/** One row of table T-109 that stands on the palette and takes an arm. */
interface ArmingEntrance {
  /** The row id -- the only join table T-109 admits, and what `CommandItem.icon` carries. */
  readonly row: string
  /** The row of table T-023b its 構え column names. */
  readonly arm: string
  /** Its 何の入口か cell, as the table writes it. */
  readonly entrance: string
}

/**
 * Every palette entrance whose 構え column names a row of table T-023b.
 *
 * ⚠️ The rows whose 構え is an em dash are left out here and are NOT ignored --
 * the case that walks the arms asserts that no entrance without an arm is ever
 * marked.
 */
const ARMING_ENTRANCES: readonly ArmingEntrance[] = T_109.rows
  .filter((row) => bare(row.by[SURFACE_COLUMN] ?? '') === COMMAND_PALETTE)
  .map((row) => ({
    row: row.id,
    arm: bare(row.by[ARM_COLUMN] ?? ''),
    entrance: row.by[ENTRANCE_COLUMN] ?? '',
  }))
  .filter((entrance) => /^AR-\d+$/.test(entrance.arm))

/** The palette entrances one row of table T-023b stands against. */
const entrancesArmedBy = (arm: string): readonly string[] =>
  ARMING_ENTRANCES.filter((entrance) => entrance.arm === arm).map((entrance) => entrance.row)

/**
 * The spelling table T-012 gives one of its rows, with the quotes its 値 column
 * prints stripped off (`'rectangle'` -> `rectangle`).
 */
function shapeSpellingOf(shapeRow: string): string {
  const row = T_012.rows.find((one) => one.id === shapeRow)
  if (row === undefined) throw new Error(`table T-012 no longer has row ${shapeRow}`)
  return bare(row.by[SHAPE_SPELLING_COLUMN] ?? '').replace(/'/g, '')
}

/**
 * Which entrance arms which task shape -- the finer join the MUST needs, made
 * out of the two columns that state it.
 *
 * ⭐ Table T-109's 何の入口か column names the row of table T-012 (「矩形を構え
 * る（表 T-012 の `SH-1`）」), and table T-012's 値 column spells that row. ⛔ No
 * spelling is typed here.
 */
const ENTRANCE_BY_TASK_SHAPE = new Map<string, string>(
  ARMING_ENTRANCES.filter((entrance) => entrance.arm === 'AR-2').map(
    (entrance): [string, string] => {
      const named = /`(SH-\d+)`/.exec(entrance.entrance)
      if (named === null) {
        throw new Error(`table T-109's ${entrance.row} no longer names a row of table T-012`)
      }
      return [shapeSpellingOf(named[1] as string), entrance.row]
    },
  ),
)

/**
 * The eight milestone glyphs. ⭐ Read out of `_source/erd.json` because the
 * preamble of section 8 of `_assets/tbl-glossary.md` says in as many words that
 * table T-109 does not carry them and that file does.
 */
const MILESTONE_GLYPHS: readonly string[] = ((): readonly string[] => {
  const erd = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'erd.json'), 'utf8'),
  ) as {
    readonly entities: readonly {
      readonly columns: readonly {
        readonly name: string
        readonly json?: { readonly kind?: string; readonly values?: readonly string[] }
      }[]
    }[]
  }
  for (const entity of erd.entities) {
    for (const column of entity.columns) {
      const values = column.json?.values
      if (column.name === 'milestoneGlyph' && values !== undefined) return values
    }
  }
  throw new Error('erd.json no longer holds the spellings of `milestoneGlyph`')
})()

// ---------------------------------------------------------------------------
// The arms themselves. ⚠️ The row -> union member mapping is this file's, for
// the reason the head comment gives.
// ---------------------------------------------------------------------------

/** Every value of `Armed` a person can reach through one row of table T-023b. */
function armsOfRow(arm: string): readonly Armed[] {
  switch (arm) {
    case 'AR-1':
      return [{ kind: 'none' }]
    case 'AR-2':
      return [...ENTRANCE_BY_TASK_SHAPE.keys()].map(
        (shapeKind): Armed => ({ kind: 'taskShape', shapeKind }),
      )
    case 'AR-3':
      return MILESTONE_GLYPHS.map((glyph): Armed => ({ kind: 'milestoneShape', glyph }))
    case 'AR-4':
      return [{ kind: 'dependency' }]
    case 'AR-5':
      return [{ kind: 'commentBox' }]
    case 'AR-6':
      return [{ kind: 'highlightBox' }]
    default:
      throw new Error(`table T-023b has a row this file does not build an arm for: ${arm}`)
  }
}

/** Every arm a person can take, with the row of table T-023b it belongs to. */
const EVERY_ARM: readonly { readonly arm: string; readonly armed: Armed }[] = T_023b.rows.flatMap(
  (row) => armsOfRow(row.id).map((armed) => ({ arm: row.id, armed })),
)

/** The arm table T-023b makes the default -- 「なし（既定）」. */
const NOTHING_ARMED: Armed = { kind: 'none' }

// ---------------------------------------------------------------------------
// Inputs. UF-65 fills one member of `ScreenView` and reads none of the others,
// so every member below that a case does not mean is inert.
// ---------------------------------------------------------------------------

/** S-73's default, read rather than typed (rule 03 section 1). No case reads a colour back. */
const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 no longer has row S-73')
  return Number(bare(row.by['既定'] ?? ''))
})()

/**
 * ⛔ THE MILESTONE LIST IS OPEN IN EVERY CASE HERE. FR-053 (MUST) keeps the
 * eight glyph entrances out of the palette until it is, and an entrance that is
 * not drawn cannot be the one that is told apart. ⚠️ What a palette should look
 * like while a glyph is armed AND the list is folded away is a question no row
 * of the specification answers, so no case here asks it.
 */
const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  isMilestoneListOpen: true,
  isPaletteMinimised: false,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
}

/** S-99e defaults to showing, so a palette is described. */
const SHOWN: ScreenState = screenStateWithPalette(emptyScreenState(), true)

function describedWith(armed: Armed): CommandPalette {
  const palette = commandPaletteFromScreenState(
    screenStateWithArmed(SHOWN, armed),
    emptySelection(),
    SESSION,
  )
  expect(palette, 'S-99e: the palette is showing, so one is described').not.toBeNull()
  return palette as CommandPalette
}

const entriesOf = (palette: CommandPalette): readonly CommandItem[] =>
  palette.groups.flatMap((group) => group.commands)

/** The entrances the description marks as armed, by row id. */
const armedEntrancesOf = (armed: Armed): readonly string[] =>
  entriesOf(describedWith(armed))
    .filter((entry) => entry.isArmed)
    .map((entry) => entry.icon)

/** How a failing case names the arm it was driving with. */
const spell = (armed: Armed): string => JSON.stringify(armed)

// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG COLUMN WOULD MAKE EVERY
    // CASE BELOW AGREE WITH ANYTHING (rule 04 section 2).
    expect(ARMING_ENTRANCES.length).toBeGreaterThan(0)
    expect(T_023b.rows.map((row) => row.id)).toContain('AR-1')
    expect(ENTRANCE_BY_TASK_SHAPE.size).toBe(entrancesArmedBy('AR-2').length)
    expect([...ENTRANCE_BY_TASK_SHAPE.keys()].every((one) => /^[a-z][A-Za-z]+$/.test(one))).toBe(true)
    expect(MILESTONE_GLYPHS.length).toBe(entrancesArmedBy('AR-3').length)
  })

  it('⭐ the 構え column really stands more than one entrance under one arm', () => {
    // ⛔ THIS IS THE WHOLE OF WHY THIS FILE EXISTS. If the column had become
    // one-to-one, the cases below would be about nothing and should be read
    // again rather than believed.
    const crowded = T_023b.rows
      .map((row) => ({ arm: row.id, entrances: entrancesArmedBy(row.id) }))
      .filter((one) => one.entrances.length > 1)

    expect(
      crowded.length,
      'table T-109 no longer stands several entrances under one row of table T-023b',
    ).toBeGreaterThan(0)
  })

  it('⭐ every arm the 構え column names is a row of table T-023b', () => {
    // The column's own definition: 「その入口が押されたときポインタが入る 表
    // T-023b の行」.
    const arms = new Set(T_023b.rows.map((row) => row.id))
    for (const entrance of ARMING_ENTRANCES) {
      expect(arms.has(entrance.arm), `table T-109's ${entrance.row} names ${entrance.arm}`).toBe(true)
    }
  })
})

describe('FR-053 (MUST) -- the armed entrance is told apart from the ones that are not', () => {
  it('marks no entrance at all while nothing is armed (AR-1)', () => {
    // AR-1 is 「なし（既定）」. There is no armed entrance, so nothing may be
    // drawn as one -- otherwise the mark says a shape is waiting to be placed
    // when none is.
    expect(armedEntrancesOf(NOTHING_ARMED)).toEqual([])
  })

  it('marks exactly ONE entrance, whichever arm the person took', () => {
    // ⛔ 「いま構えている入口を、構えていない入口と見分けられるように描くこと
    // （MUST）」. One entrance is armed -- the one that was pressed -- and the
    // others are the ones it has to be told apart from. Marking four of them
    // makes three entrances that are NOT armed indistinguishable from the one
    // that is, which is exactly what the MUST forbids.
    for (const { arm, armed } of EVERY_ARM) {
      if (arm === 'AR-1') continue
      const marked = armedEntrancesOf(armed)
      expect(marked.length, `table T-023b ${arm}, ${spell(armed)}: marked ${marked.join(', ')}`).toBe(1)
    }
  })

  it('marks the entrance table T-109 gives that very shape (AR-2)', () => {
    // ⭐ WHICH one is not a choice made here: table T-109's 何の入口か column
    // names the row of table T-012 each entrance arms, and table T-012's 値
    // column spells it. So the entrance for `rectangle` is the row whose cell
    // names SH-1, and no other.
    for (const [shapeKind, row] of ENTRANCE_BY_TASK_SHAPE) {
      expect(armedEntrancesOf({ kind: 'taskShape', shapeKind }), shapeKind).toEqual([row])
    }
  })

  it('marks a different entrance for every milestone glyph (AR-3)', () => {
    // ⭐ FOLLOWS FROM THE SAME MUST, WITHOUT NEEDING THE GLYPH-TO-ROW ORDER.
    // Two glyphs that marked one entrance would leave that entrance armed while
    // the person had armed the other one -- an entrance that is NOT armed drawn
    // as the one that is. ⚠️ So this case says the eight answers differ; it
    // does not say which is which, because no column states that order.
    const marked = MILESTONE_GLYPHS.map((glyph) =>
      armedEntrancesOf({ kind: 'milestoneShape', glyph }).join('+'),
    )

    expect(new Set(marked).size, marked.join(' | ')).toBe(MILESTONE_GLYPHS.length)
  })

  it('marks no entrance whose 構え column is an em dash', () => {
    // The column's own rule: 「構えを持たない入口の欄は `—` である」. An entrance
    // that arms nothing can never be the armed one.
    const armless = new Set(
      T_109.rows
        .filter((row) => bare(row.by[SURFACE_COLUMN] ?? '') === COMMAND_PALETTE)
        .map((row) => row.id)
        .filter((row) => !ARMING_ENTRANCES.some((entrance) => entrance.row === row)),
    )

    for (const { arm, armed } of EVERY_ARM) {
      for (const row of armedEntrancesOf(armed)) {
        expect(armless.has(row), `${arm}: ${row} has no 構え`).toBe(false)
      }
    }
  })
})

describe('FR-053 (MUST NOT) -- the armed entrance is not drawn as a pressed button', () => {
  it('taking an arm turns no entry into a pressed one', () => {
    // ⛔ 「押されている形にしてはならない（MUST NOT）」 —— 表 T-109 の `IC-54`
    // が「ボタンではない」と明記している。⭐ Asked as a DIFFERENCE rather than
    // as "nothing is ever pressed": `isPressed` is a toggle that is on, and the
    // entries that show a drawing setting are entitled to it. What the MUST NOT
    // forbids is an ARM reaching the screen through that member.
    const whenNothingArmed = entriesOf(describedWith(NOTHING_ARMED)).map((entry) => entry.isPressed)

    for (const { arm, armed } of EVERY_ARM) {
      expect(
        entriesOf(describedWith(armed)).map((entry) => entry.isPressed),
        `table T-023b ${arm}, ${spell(armed)}`,
      ).toEqual(whenNothingArmed)
    }
  })
})
