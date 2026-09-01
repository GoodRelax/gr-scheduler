// FR-053 (MUST) as the user ruled it on 2026-09-01: the milestone glyph
// entrances table T-012's SH-5 prints FIRST in its area order stand on the
// `Command Palette` whatever the list is doing, and only the ones past them
// wait for it. S-216 of table T-206 is how many stand.
//
// Unit under test: UF-65 of table T-075 (`command-palette.ts`), component CP-37
// of table T-062 (`ScreenRenderer`), reached through PI-37 of table T-064.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). What was read of `src/`: the signature of
// `commandPaletteFromScreenState`, the `CommandPalette` / `CommandItem` /
// `ScreenSession` types, the `ScreenState` constructors, `SETTINGS_DEFAULTS`
// and the generated `NOT_STORED_COMMAND_PALETTE_SIZES`. ⛔ NO FUNCTION BODY WAS
// READ. Every expected value below is read out of a manuscript at run time.
//
// ⭐ The fixtures (`SESSION`, `SETTINGS`) are copied from
// tests/unit/fr-053-one-palette-toggle.test.ts, which drives this same unit.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-053   ⭐ 「マイルストーンの図形の入口は、表 T-012 の `SH-5` が面積順に
//            並べるはじめから、`_assets/tbl-settings.md` の 表 T-206 の `S-216`
//            が定める数だけを常に出すこと（MUST）。残りは一覧を開くまで出さない
//            こと（MUST）」 —— 利用者の裁定 2026-09-01.
//            ⛔ 「どの図形が何番目かを本要求に書き写してはならない（MUST NOT）」
//            —— which is why no case below types a glyph or a row id either.
//   FR-078   ⛔ 「`SH-5` の並びは既定を表さない —— はじめの 8 つは面積順である
//            （`S-48`）。⚠️ あとの 7 つは面積の順を持たない」.
//   T-012    SH-5 prints the fifteen marks, in that order.
//   T-206    `S-142`（一覧を開いているか、既定は閉じている）と `S-216`.
//   T-109    the entrance rows, whose 構え column says which arm each one takes.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT WOULD HAVE TO CHANGE FOR EACH CASE TO GO RED -- stated per case below.
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED: WHERE the glyph entrances stand among
// the other entrances of their group. No row states an order for them beyond
// table T-109's own print order, and tests/unit/fr-053-the-row-the-three-
// entrances-moved-to.test.ts is the file that holds the unit to that order.
// ---------------------------------------------------------------------------

import { describe, expect, it } from 'vitest'

import {
  commandPaletteFromScreenState,
  NOT_STORED_COMMAND_PALETTE_SIZES,
} from '../../src/adapter/screen-renderer/command-palette'
import type {
  CommandPalette,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  emptyScreenState,
  screenStateWithPalette,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscripts, read at run time rather than copied here (Chapter 1.9 :275)
// ---------------------------------------------------------------------------

const T_012 = specTable('T-012')
const T_109 = specTable('T-109')
const T_206 = specTable('T-206')

const ENTRANCE_COLUMN = '何の入口か'
const SURFACE_COLUMN = '面'
const ARM_COLUMN = '構え'
const MARK_COLUMN = '表記'
const DEFAULT_COLUMN = '既定'
const REASON_COLUMN = '保存しない理由'

function rowOf(table: ReturnType<typeof specTable>, id: string) {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} no longer has row ${id}`)
  return found
}

/**
 * The marks SH-5 of table T-012 prints in its 表記 column, in that order -- which
 * FR-078 states is the area order for as far as it goes.
 */
const MARKS: readonly string[] = bare(rowOf(T_012, 'SH-5').by[MARK_COLUMN] ?? '')
  .split(/\s+/)
  .filter((mark) => mark !== '')

/**
 * S-216 of table T-206 -- how many of them stand whatever the list is doing.
 *
 * ⭐ Read from the manuscript here and from the generated constant in the case
 * below, and the two are held against each other: this file must not become the
 * one place the number is written.
 */
const S_216 = Number(bare(rowOf(T_206, 'S-216').by[DEFAULT_COLUMN] ?? ''))

/** What that row says about itself -- the ruling, in the manuscript's words. */
const S_216_REASON = rowOf(T_206, 'S-216').by[REASON_COLUMN] ?? ''

/** U-26 of table T-103 as table T-109's 面 column spells it. */
const COMMAND_PALETTE = 'Command Palette'

/** AR-3 of table T-023b -- the arm every milestone glyph entrance takes. */
const MILESTONE_ARM = 'AR-3'

/** S-142 of table T-206 -- the state the entrance that works the list moves. */
const MILESTONE_LIST_SETTING = 'S-142'

const paletteRows = T_109.rows.filter((row) =>
  bare(row.by[SURFACE_COLUMN] ?? '')
    .split(' / ')
    .includes(COMMAND_PALETTE),
)

/**
 * Every glyph entrance of table T-109, in that table's own print order.
 *
 * ⭐ FOUND BY THE ARM COLUMN AND NEVER BY ROW ID. The column is the table's own
 * statement of which entrance arms a milestone shape, so a sixteenth glyph
 * added to SH-5 and to table T-109 joins these cases without this file being
 * touched.
 */
const GLYPH_ROWS: readonly string[] = paletteRows
  .filter((row) => bare(row.by[ARM_COLUMN] ?? '') === MILESTONE_ARM)
  .map((row) => row.id)

/** The one entrance that opens and folds the list -- the row that names S-142. */
const LIST_ROWS: readonly string[] = paletteRows
  .filter((row) => (row.by[ENTRANCE_COLUMN] ?? '').includes(MILESTONE_LIST_SETTING))
  .map((row) => row.id)

// ---------------------------------------------------------------------------
// Inputs. Copied from tests/unit/fr-053-one-palette-toggle.test.ts.
// ---------------------------------------------------------------------------

const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 no longer has row S-73')
  return Number(bare(row.by[DEFAULT_COLUMN] ?? ''))
})()

const SETTINGS = { ...SETTINGS_DEFAULTS } as unknown as DocumentSettings

const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: true,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  // S-142, at the default table T-206 states for it: the list is CLOSED.
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
}

const SHOWN: ScreenState = screenStateWithPalette(emptyScreenState(), true)

function paletteWith(isMilestoneListOpen: boolean): CommandPalette {
  const drawn = commandPaletteFromScreenState(
    SHOWN,
    SETTINGS,
    emptySelection(),
    { ...SESSION, isMilestoneListOpen },
  )
  if (drawn === null) throw new Error('S-99e says the palette is shown, so one must be described')
  return drawn
}

/** Every entrance the palette put out this frame, in the order it put them out. */
const entrancesOf = (palette: CommandPalette): readonly string[] =>
  palette.groups.flatMap((group) => group.commands.map((command) => command.icon))

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST A COLUMN WOULD MAKE EVERY CASE BELOW
    // AGREE WITH ANYTHING (rule 04 section 2).
    // GOES RED IF: SH-5 stops printing its marks, table T-109 stops giving the
    // glyph entrances the AR-3 arm, or S-216 stops holding a number.
    expect(MARKS.length, 'SH-5 of table T-012 still prints its marks').toBeGreaterThan(1)
    expect(GLYPH_ROWS.length, 'table T-109 still gives entrances the AR-3 arm').toBe(MARKS.length)
    expect(Number.isInteger(S_216) && S_216 > 0, `S-216 of table T-206 reads ${S_216}`).toBe(true)
    expect(LIST_ROWS.length, 'exactly one entrance works the list (FR-053, MUST NOT)').toBe(1)
  })

  it('⭐ the count and the ruling it stands for still agree', () => {
    // ⭐ THE ONE THING THAT COULD GO WRONG IN SILENCE ON THE MANUSCRIPT'S SIDE.
    // The user ruled a RANGE -- 「○〜☆ まで」 -- and S-216 records it as a
    // COUNT, so the two part company the moment SH-5 is re-ordered or the
    // number is edited on its own.
    // GOES RED IF: S-216 no longer lands on the last mark its own row names, or
    // lands on one the row does not name.
    expect(S_216_REASON, 'S-216 still names the first mark it spares').toContain(MARKS[0] as string)
    expect(S_216_REASON, 'S-216 still names the last mark it spares').toContain(
      MARKS[S_216 - 1] as string,
    )
    expect(S_216_REASON, 'S-216 does not name the first mark it folds').not.toContain(
      MARKS[S_216] as string,
    )
  })

  it('⭐ the number the unit was generated with is the number the table states', () => {
    // GOES RED IF: `npm run gen` was not run after S-216 moved, which is the
    // one way the unit and the manuscript can hold two different numbers.
    expect(NOT_STORED_COMMAND_PALETTE_SIZES['S-216']).toBe(S_216)
  })

  it('⭐ table T-109 prints its glyph entrances in SH-5’s order', () => {
    // ⛔ THE JOIN THE UNIT LEANS ON AND THE SPECIFICATION DOES NOT STATE. The
    // requirement names the ones that stand by their place in SH-5's AREA
    // order, and the unit takes the first S-216 it meets in table T-109's PRINT
    // order -- 表 T-012's own note (MUST NOT) warns against leaning on two
    // lists being printed alike, so the leaning is checked here instead.
    // GOES RED IF: either list is re-ordered without the other.
    for (const [at, row] of GLYPH_ROWS.entries()) {
      const cell = rowOf(T_109, row).by[ENTRANCE_COLUMN] ?? ''
      expect(cell, `${row} is the entrance for the mark SH-5 prints ${at + 1}st`).toContain(
        MARKS[at] as string,
      )
    }
  })
})

// ===========================================================================
// The rule
// ===========================================================================

describe('FR-053 (MUST): the first S-216 glyph entrances do not fold away', () => {
  it('⭐ stands the first S-216 of them while the list is closed', () => {
    // ⭐ THE USER'S RULING, MEASURED AT THE UNIT: 「マイルストーンは ○〜☆ まで
    // をデフォルトでコマンドパレットに表示せよ」.
    // GOES RED IF: the fold goes back to taking every glyph entrance (which is
    // what it did until 2026-09-01), or takes a different number of them.
    const shown = entrancesOf(paletteWith(false)).filter((icon) => GLYPH_ROWS.includes(icon))
    expect(shown).toEqual(GLYPH_ROWS.slice(0, S_216))
  })

  it('⛔ folds the rest away until the list is opened', () => {
    // ⭐ 「それ以外のマイルストーンは ... で追加表示せよ」 -- the other half of
    // the same ruling, and the half the requirement had before it.
    // GOES RED IF: every glyph entrance is offered whatever S-142 says, which
    // is the palette the user asked to be rid of.
    const folded = GLYPH_ROWS.slice(S_216)
    expect(folded.length, 'there is something left to fold').toBeGreaterThan(0)
    const shown = entrancesOf(paletteWith(false))
    for (const row of folded) expect(shown).not.toContain(row)
  })

  it('⭐ puts every one of them out once the list is open', () => {
    // GOES RED IF: opening the list stops reaching the glyphs the fold took, so
    // that a shape could never be armed at all.
    const shown = entrancesOf(paletteWith(true)).filter((icon) => GLYPH_ROWS.includes(icon))
    expect(shown).toEqual(GLYPH_ROWS)
  })

  it('⭐ keeps the entrance that works the list out in both states', () => {
    // ⭐ FR-053 (MUST NOT) allows exactly one entrance for the list, and it is
    // the 「...」 the ruling puts the rest behind -- an entrance that folded
    // itself away would leave them unreachable.
    // GOES RED IF: the entrance that names S-142 is ever treated as a glyph.
    for (const open of [false, true]) {
      expect(entrancesOf(paletteWith(open))).toContain(LIST_ROWS[0] as string)
    }
  })

  it('⛔ the fold moves no group and renames none', () => {
    // ⚠️ Folding changes WHICH ENTRIES a group holds and never which groups
    // there are: FR-053 (MUST) draws a line at each boundary, so a group that
    // came and went with the list would move the lines under a person's hand.
    // GOES RED IF: a group is opened or dropped by the state of S-142.
    const closed = paletteWith(false).groups.map((group) => group.name)
    const open = paletteWith(true).groups.map((group) => group.name)
    expect(closed).toEqual(open)
  })
})
