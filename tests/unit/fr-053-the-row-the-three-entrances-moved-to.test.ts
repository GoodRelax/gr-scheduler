// FR-053 and the 群 column of table T-109: which entrances stand together on
// one row of the `Command Palette`, and in what order.
//
// ⭐ THE USER'S RULING OF 2026-09-01, recorded in table T-109's own IC-61 cell:
// 「依存線、コメントボックス、ハイライトボックスは次の行に移せ。順番は 依存線、
// コメントボックス、ハイライトボックス、開始日揃え、終了日揃え とせよ」.
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
// `commandPaletteFromScreenState`, the `CommandPalette` / `ScreenSession`
// types, the `ScreenState` constructors and `SETTINGS_DEFAULTS`. ⛔ NO FUNCTION
// BODY WAS READ.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   T-109    ⛔ 「本表の `群` の欄は、入口を並べる順を決めるためだけに在る。画面
//            に刷ってはならない（MUST NOT）」 -- so the 群 column, and it alone,
//            says which entrances share a row and where the rows begin.
//            ⭐ IC-61: 「本行から `IC-38` までが 1 つの群である」 -- the ruling.
//   T-023b   the arms: AR-4 (依存線), AR-5 (コメントボックス), AR-6 (ハイライト
//            ボックス). The 構え column of table T-109 is which entrance takes
//            which, and it is how these cases name three of the five rows.
//   FR-034   the requirement the two alignment entrances carry in the 正 column,
//            which is how these cases name the other two.
//   FR-053   ⭐ 「入口の群の見出しを画面に刷ってはならない（MUST NOT）。群の境目
//            は線で示すこと（MUST）」 -- one boundary per pair of groups, so the
//            groups a person sees ARE the rows.
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED: the WORD the group carries. FR-038 puts
// it in the dictionary and tests/contract/display-words.contract.test.ts is the
// bench that holds it. ⛔ And that word is still 「揃える」 for a group that now
// opens with the dependency line -- a naming the user has not been asked about,
// which is why no case here rests on it.
// ---------------------------------------------------------------------------

import { describe, expect, it } from 'vitest'

import { commandPaletteFromScreenState } from '../../src/adapter/screen-renderer/command-palette'
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
// The manuscript, read at run time rather than copied here (Chapter 1.9 :275)
// ---------------------------------------------------------------------------

const T_109 = specTable('T-109')

const SURFACE_COLUMN = '面'
const GROUP_COLUMN = '群'
const ENTRANCE_COLUMN = '何の入口か'
const AUTHORITY_COLUMN = '正'
const ARM_COLUMN = '構え'

/** U-26 of table T-103 as table T-109's 面 column spells it. */
const COMMAND_PALETTE = 'Command Palette'

/** The em dash table T-109 writes where a row belongs to no group. */
const NO_GROUP = '—'

/**
 * What table T-109 says of the two rows that are not buttons, in its own words.
 *
 * ⭐ READ RATHER THAN NAMED BY ROW ID. The table states the fact as prose in the
 * entry column -- 「ボタンではない」 -- and that sentence is the only join there
 * is, so a third row marked the same way joins these cases on its own.
 */
const NOT_A_BUTTON = 'ボタンではない'

/** `FR-034`, as the authority column writes it -- the two alignment entrances. */
const ALIGN_REQUIREMENT = '`FR-034`'

interface Row {
  readonly id: string
  readonly group: string
  readonly entrance: string
  readonly arm: string
}

/**
 * Every row of table T-109 that stands ON the palette AS an entrance, in the
 * table's own print order.
 */
const PALETTE_ENTRANCES: readonly Row[] = T_109.rows
  .filter((row) =>
    bare(row.by[SURFACE_COLUMN] ?? '')
      .split(' / ')
      .includes(COMMAND_PALETTE),
  )
  .filter((row) => !(row.by[ENTRANCE_COLUMN] ?? '').includes(NOT_A_BUTTON))
  .filter((row) => bare(row.by[GROUP_COLUMN] ?? '') !== NO_GROUP)
  .map((row) => ({
    id: row.id,
    group: bare(row.by[GROUP_COLUMN] ?? ''),
    entrance: row.by[ENTRANCE_COLUMN] ?? '',
    arm: bare(row.by[ARM_COLUMN] ?? ''),
  }))

/** The one entrance that takes this arm of table T-023b. */
function theEntranceArming(arm: string): string {
  const found = PALETTE_ENTRANCES.filter((row) => row.arm === arm)
  if (found.length !== 1) {
    throw new Error(`table T-109 gives ${arm} to ${found.length} entrances of the palette`)
  }
  return (found[0] as Row).id
}

/** The entrances FR-034 owns, in the table's order. */
const ALIGNMENT_ENTRANCES: readonly string[] = PALETTE_ENTRANCES.filter((row) =>
  (T_109.rows.find((one) => one.id === row.id)?.by[AUTHORITY_COLUMN] ?? '').includes(
    ALIGN_REQUIREMENT,
  ),
).map((row) => row.id)

/**
 * The five entrances the ruling names, in the order it names them.
 *
 * ⛔ NOT ONE ROW ID IS TYPED. The three the user moved are named by the arm each
 * one takes (table T-023b, through table T-109's 構え column) and the two they
 * moved in beside are named by the requirement that owns them -- so a row
 * renumbered in the table is followed here rather than missed.
 */
const THE_FIVE: readonly string[] = [
  theEntranceArming('AR-4'),
  theEntranceArming('AR-5'),
  theEntranceArming('AR-6'),
  ...ALIGNMENT_ENTRANCES,
]

/** The entrances that arm a task shape (AR-2) -- the row the three came FROM. */
const TASK_SHAPE_ENTRANCES: readonly string[] = PALETTE_ENTRANCES.filter(
  (row) => row.arm === 'AR-2',
).map((row) => row.id)

// ---------------------------------------------------------------------------
// Inputs. Copied from tests/unit/fr-053-one-palette-toggle.test.ts.
// ---------------------------------------------------------------------------

const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 no longer has row S-73')
  return Number(bare(row.by['既定'] ?? ''))
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
  // S-142 OPEN, so that every entrance table T-109 places is present and the
  // order these cases ask about is the whole of the table's.
  isMilestoneListOpen: true,
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

function palette(): CommandPalette {
  const drawn = commandPaletteFromScreenState(SHOWN, SETTINGS, emptySelection(), SESSION)
  if (drawn === null) throw new Error('S-99e says the palette is shown, so one must be described')
  return drawn
}

/** The rows of the palette, each as the row ids it holds in order. */
const rowsOfThePalette = (): readonly (readonly string[])[] =>
  palette().groups.map((group) => group.commands.map((command) => command.icon))

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // GOES RED IF: a column heading of table T-109 moves, or the arms and the
    // authority stop reaching exactly the five rows the ruling names.
    expect(PALETTE_ENTRANCES.length, 'the palette still has entrances').toBeGreaterThan(10)
    expect(ALIGNMENT_ENTRANCES.length, 'FR-034 still owns two entrances').toBe(2)
    expect(new Set(THE_FIVE).size, 'the ruling names five different entrances').toBe(5)
    expect(TASK_SHAPE_ENTRANCES.length, 'AR-2 still stands against the task shapes').toBe(4)
  })

  it('⭐ table T-109 still records the ruling these cases carry out', () => {
    // ⛔ THE GROUND OF THE WHOLE FILE, read rather than typed: if the ruling is
    // ever reversed, this case says so in one line instead of leaving four
    // cases asserting a rule the manuscript no longer holds.
    const opener = T_109.rows.find((one) => one.id === (THE_FIVE[0] as string))
    expect(opener?.by[ENTRANCE_COLUMN] ?? '').toContain('本行から `IC-38` までが 1 つの群である')
  })
})

// ===========================================================================
// The rule
// ===========================================================================

describe('the 群 column of table T-109 is what lays the palette out in rows', () => {
  it('⭐ every entrance of one row shares one 群, and the rows follow the table', () => {
    // ⭐ THE GENERAL RULE THE RULING WAS CARRIED OUT THROUGH: the table's group
    // column decides the rows and its print order decides what is in them.
    // GOES RED IF: the unit sorts by anything of its own, or a group is split
    // in two because its rows are not adjacent in the table.
    const expected: string[][] = []
    const openedAt = new Map<string, string[]>()
    for (const row of PALETTE_ENTRANCES) {
      const opened = openedAt.get(row.group)
      if (opened === undefined) {
        const fresh = [row.id]
        openedAt.set(row.group, fresh)
        expected.push(fresh)
      } else opened.push(row.id)
    }
    expect(rowsOfThePalette()).toEqual(expected)
  })

  it('⭐ the five the user named stand on ONE row, in the order they were named', () => {
    // ⭐ 「順番は 依存線、コメントボックス、ハイライトボックス、開始日揃え、
    // 終了日揃え とせよ」 (利用者の裁定 2026-09-01).
    // GOES RED IF: any of the three is moved back beside the shapes, if they
    // are put after the alignment pair, or if a sixth entrance joins them.
    const rows = rowsOfThePalette()
    const holding = rows.filter((row) => row.includes(THE_FIVE[0] as string))
    expect(holding.length, 'exactly one row holds the dependency entrance').toBe(1)
    expect(holding[0]).toEqual(THE_FIVE)
  })

  it('⛔ the three no longer stand on the row the task shapes are placed from', () => {
    // ⭐ 「次の行に移せ」 -- the half of the ruling that is about where they are
    // NOT. ⚠️ Asked of the drawn rows rather than of the table, because the
    // table could hold two groups the unit had folded into one.
    // GOES RED IF: the shapes and the three share a row again, which is where
    // they stood until 2026-09-01.
    const rows = rowsOfThePalette()
    const shapeRow = rows.find((row) => row.includes(TASK_SHAPE_ENTRANCES[0] as string))
    expect(shapeRow, 'the task shapes are drawn somewhere').toBeDefined()
    for (const moved of THE_FIVE.slice(0, 3)) expect(shapeRow).not.toContain(moved)
  })

  it('⭐ the row the five stand on comes after the row the shapes stand on', () => {
    // ⭐ 「次の行」 is a direction as well as a place: the row they moved to is
    // the one BELOW the shapes, not one above them.
    // GOES RED IF: the group is opened earlier in table T-109 than the shapes'.
    const rows = rowsOfThePalette()
    const shapeRow = rows.findIndex((row) => row.includes(TASK_SHAPE_ENTRANCES[0] as string))
    const theirRow = rows.findIndex((row) => row.includes(THE_FIVE[0] as string))
    expect(theirRow).toBe(shapeRow + 1)
  })
})
