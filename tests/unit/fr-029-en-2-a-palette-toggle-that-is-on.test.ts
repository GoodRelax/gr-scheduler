// FR-029, row EN-2 of table T-237 (MUST): a `Command Palette` entrance whose
// own function is ON is drawn filled. `CommandItem.isPressed` is the member
// that says so, and this is the unit that fills it.
//
// Unit under test: UF-65 of table T-075 (`command-palette.ts`, component CP-37
// of table T-062, published as PI-37 of table T-064).
//
// Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// WHAT WAS READ, AND WHAT WAS NOT (docs/development-rules/04-verification.md,
// section 1)
// ---------------------------------------------------------------------------
//
// docs/spec/ for every sentence below, and tests/unit/uf-65.test.ts,
// tests/unit/uf-62.test.ts and tests/unit/fr-029-in-effect-is-filled-not-
// rimmed.test.ts for the shape of the arguments and the idiom.
//
// NO FILE UNDER src/ WAS OPENED AT ALL -- not the unit's body, and not its
// declarations either. That is stricter than the neighbouring benches, and it
// has one consequence this file states out loud rather than hiding: WHERE the
// `DocumentSettings` enters UF-65 is not known here, and no row of the
// specification fixes it (see gap 1 below). Every expected value is read out of
// a manuscript at run time; no row id below is a hand-written roster.
//
// ---------------------------------------------------------------------------
// THE SENTENCES THESE CASES HOLD (translated; the manuscript is the original)
// ---------------------------------------------------------------------------
//
//   FR-029, fourth paragraph: when an entrance is to be shown AS BEING IN
//   EFFECT, the inside of its frame is filled and the glyph is knocked out in
//   S-146 (MUST); a rim's colour or thickness may not say it (MUST NOT); and
//   WHAT IS IN EFFECT WHEN, AND IN WHICH COLOUR, FOLLOWS TABLE T-237 (MUST).
//   Ruling of 2026-08-30, verbatim: "paint the icon itself green -- e.g. if the
//   progress line is on, paint the progress-line icon green".
//
//   FR-029, table T-237, row EN-2: what is in effect is "the entrance's own
//   function is ON (the toggle FR-049 makes out of a boolean of table T-202)",
//   filled in S-183, and THIS REQUIREMENT is the row's owner.
//
//   FR-049 (MUST NOT): the whole of table T-202 may not be treated as toggles
//   -- "the target is the rows whose type is boolean, and those only (MUST)";
//   the multi-valued rows (S-59 / S-66) and the rows that carry a value of
//   their own (the stacking direction, the font size, the Dual Cursor's two
//   dates) are outside it.
//
//   FR-053 (MUST NOT): an armed entrance may not be drawn as a pressed one --
//   IC-54 of table T-109 says in as many words that it is not a button. How an
//   arm IS said is EN-1 of table T-237, which travels on a different member.
//
//   FR-102 (MUST NOT): the recording may not be saved into the document.
//   Whether a recording is running is S-206 of table T-206, which is the table
//   of what is NOT saved -- so no value of the document can move IC-76.
//
//   DC-7 of table T-029a (MUST NOT): leaving the Dual Cursor mode may not clear
//   the two lines. So `dualCursor` (S-65) carrying a pair is NOT the same fact
//   as being in the mode, and an entrance pressed on the pair would claim the
//   mode after the person had left it.
//
// ---------------------------------------------------------------------------
// WHAT THE SPECIFICATION DOES NOT SETTLE, AND WHAT THESE CASES DO ABOUT IT
// ---------------------------------------------------------------------------
//
//   GAP 1 -- WHERE `DocumentSettings` ENTERS UF-65 IS NOWHERE WRITTEN DOWN. The
//   ruling of 2026-08-31 (defect D-158) says only "pass DocumentSettings to
//   UF-65 and read the boolean rows of table T-202"; no row of table T-064,
//   T-075 or T-065 writes the argument list, so the place it takes is a
//   decision the specification leaves to whoever implements it.
//   WHAT THAT COST, MEASURED: this bench first put it in the FOURTH place (the
//   plain reading of "pass it to the unit", and where UF-62's own settings
//   parameter would suggest), and three cases were red for that reason alone
//   until the argument order was read back out of tests/unit/uf-65.test.ts --
//   it is the SECOND. The first case in the file is what told the two kinds of
//   red apart, and it is left standing for the next time the seam moves.
//
//   GAP 2 -- IC-41 AND S-144. Table T-202 carries `watermarkVisible` as a
//   boolean and names IC-41 as its entrance, so FR-049 makes a toggle of it and
//   EN-2 would apply; but table T-109 gives IC-41 to FR-020 and words it one
//   way only -- "hide the watermark (asking for the release password)". So
//   "the entrance's own function is ON" has two opposite readings (the
//   watermark is shown / the watermark has been hidden) and nothing picks one.
//   NO CASE HERE TOUCHES IC-41, and the derivation below leaves it out for a
//   stated reason rather than by omission: its cell names no settings row.
//
//   GAP 3 -- AN EXCLUSIVE CHOICE HAS NO ROW IN TABLE T-237. IC-46 .. IC-49 each
//   set S-66 to one of four values, and FR-048 (MUST) requires the reader to be
//   able to choose among them -- but table T-237's five rows say what a fill
//   may mean, and none of them is "this entrance is the one that is current
//   among an exclusive set". FR-029 (MUST) binds the fill to that table. So the
//   cases below hold only that the answer DOES NOT FOLLOW the value of S-66;
//   THEY DO NOT SAY WHETHER IT IS ON OR OFF, because the specification does
//   not. Reported: either table T-237 is short a row, or FR-048's "the reader
//   can choose" is left with no picture on the screen.
//
//   THE NEGATIVE CASES WERE BROKEN ON PURPOSE AND SEEN TO FAIL
//   (04-verification.md section 2). A wrapper was put round the unit for one
//   run, pressing every entry whenever the guide cursor was `'crosshair'`, the
//   Dual Cursor carried a pair, something was armed, or the progress line was
//   on. Six cases went red under it -- the FR-049, FR-053 and FR-102 cases
//   among them, plus "leaves every derived toggle unpressed" -- and the wrapper
//   was then removed. So none of them is a case that cannot fail.
//
//   WHAT THE NEGATIVE CASES WERE WORTH BEFORE THE WIRING LANDED, WRITTEN DOWN
//   SO IT IS NOT MISREAD LATER. While UF-65 pressed nothing at all, the three
//   MUST NOT cases at the foot of this file were green for a weak reason:
//   nothing can be pressed for a wrong reason when nothing is pressed. They
//   discriminate from the moment the EN-2 cases above them go green, which is
//   the state the file is now in -- a toggle IS pressed, and these say which
//   other facts may not press one.
//
//   GAP 4 -- THE RECORDING STATE IS NOT REACHABLE FROM THIS BENCH. S-206 says
//   whether a recording is running, and no member of `ScreenState` or
//   `ScreenSession` that the tests can see carries it (the exhaustive session
//   literals of uf-62 and uf-65 hold no such member, and no helper of
//   `screen-state` names one). So the IC-76 case below holds only the half it
//   can drive -- that no document setting moves it -- and NOT "it follows the
//   recording". Whoever wires S-206 across the seam owns that second case.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  emptyScreenState,
  screenStateWithArmed,
  type Armed,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection, type Selection } from '../../src/entity/document-model/selection/selection'
import type {
  CommandItem,
  CommandPalette,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { commandPaletteFromScreenState } from '../../src/adapter/screen-renderer/command-palette'
// The one reader every table-driven bench shares: it takes its copy of a
// numbered table out of the .md at read time, so a row that moves in the
// specification moves here too instead of leaving a stale list behind.
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The needles that have to be written in the manuscript's own language.
//
// These are CELLS BEING MATCHED, not names being minted: the columns and the
// type word are Japanese in the specification, and there is nowhere else to
// read them from. Everything else in this file is English (rule 03 section 5
// admits the manuscript's language where the manuscript itself is what is being
// handled, and asks for the reason).
// ---------------------------------------------------------------------------

const T_202_KEY_COLUMN = 'キー'
const T_202_TYPE_COLUMN = '型'
/** What the type column of table T-202 writes for a row FR-049 makes a toggle of. */
const BOOLEAN_TYPE = '真偽'

const T_109_SURFACE_COLUMN = '面'
const T_109_ENTRANCE_COLUMN = '何の入口か'
const T_109_AUTHORITY_COLUMN = '正'
/**
 * The shorthand table T-109 opens a cell with when the row is one more of the
 * thing the row above it named: IC-46 writes the settings row out and IC-47 ..
 * IC-49 write "same, `'crosshair'`". Reading it is what carries the other three
 * guide-cursor entrances into the walk below; a derivation that only looked for
 * a settings row per cell would silently hold one of the four.
 */
const SAME_AS_THE_ROW_ABOVE = '同・'

const T_237_STATE_COLUMN = '何が効いているか'
const T_237_FILL_COLUMN = '塗りの色'
const T_237_OWNER_COLUMN = '定める要求'

// ---------------------------------------------------------------------------
// The manuscripts, read at run time (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

const T_202 = specTable('T-202')
const T_109 = specTable('T-109')
const T_237 = specTable('T-237')

for (const [table, columns] of [
  [T_202, [T_202_KEY_COLUMN, T_202_TYPE_COLUMN]],
  [T_109, [T_109_SURFACE_COLUMN, T_109_ENTRANCE_COLUMN, T_109_AUTHORITY_COLUMN]],
  [T_237, [T_237_STATE_COLUMN, T_237_FILL_COLUMN, T_237_OWNER_COLUMN]],
] as const) {
  for (const column of columns) {
    if (!table.headings.includes(column)) {
      throw new Error(`table ${table.id} no longer has a ${column} column: ${table.headings.join(' | ')}`)
    }
  }
}

/** The names a cell writes as `code`. */
const codeSpans = (cell: string): readonly string[] =>
  [...cell.matchAll(/`([^`]+)`/gu)].map((found) => found[1] as string)

/**
 * U-26 of table T-103 -- the settled spelling table T-109's surface column
 * writes the palette with. Read rather than typed, as uf-65.test.ts reads it.
 */
const COMMAND_PALETTE_SURFACE = ((): string => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-26')
  if (row === undefined) throw new Error('table T-103 no longer has row U-26')
  return bare(row.cells[0] ?? '')
})()

/** S-73 of table T-216, so that no case types the theme hue out. */
const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 no longer has row S-73')
  return Number(bare(row.by['既定'] ?? ''))
})()

/** One row of table T-202: its id, the key it is stored under, and its type. */
interface SettingRow {
  readonly id: string
  readonly key: string
  readonly type: string
  readonly isBoolean: boolean
}

const T_202_ROWS: readonly SettingRow[] = T_202.rows.map((row) => ({
  id: row.id,
  key: bare(row.by[T_202_KEY_COLUMN] ?? ''),
  type: row.by[T_202_TYPE_COLUMN] ?? '',
  isBoolean: (row.by[T_202_TYPE_COLUMN] ?? '').includes(BOOLEAN_TYPE),
}))

const settingRow = (id: string): SettingRow | undefined => T_202_ROWS.find((one) => one.id === id)

/** Every row of table T-109 whose surface column places its entrance on the palette. */
const T_109_PALETTE = T_109.rows.filter((row) =>
  codeSpans(row.by[T_109_SURFACE_COLUMN] ?? '').includes(COMMAND_PALETTE_SURFACE),
)

/** The rows of table T-202 one entrance of table T-109 names in its own cell. */
const settingsNamedBy = (row: (typeof T_109.rows)[number]): readonly SettingRow[] =>
  codeSpans(row.by[T_109_ENTRANCE_COLUMN] ?? '')
    .map((name) => settingRow(name))
    .filter((found): found is SettingRow => found !== undefined)

/** One palette entrance joined to the one row of table T-202 its cell names. */
interface Entrance {
  readonly row: string
  readonly setting: SettingRow
  readonly authority: string
}

/**
 * Every palette entrance joined to the rows of table T-202 it stands on, walked
 * in the table's own print order so that a "same as above" cell can inherit
 * what the row above it named.
 */
const PALETTE_ENTRANCES_ON_T_202: readonly Entrance[] = ((): readonly Entrance[] => {
  const found: Entrance[] = []
  let carried: readonly SettingRow[] = []
  for (const row of T_109_PALETTE) {
    const cell = row.by[T_109_ENTRANCE_COLUMN] ?? ''
    const named = settingsNamedBy(row)
    const settings = named.length > 0 ? named : cell.startsWith(SAME_AS_THE_ROW_ABOVE) ? carried : []
    carried = named.length > 0 || cell.startsWith(SAME_AS_THE_ROW_ABOVE) ? settings : []
    for (const setting of settings) {
      found.push({ row: row.id, setting, authority: row.by[T_109_AUTHORITY_COLUMN] ?? '' })
    }
  }
  return found
})()

/**
 * THE ENTRANCES EN-2 IS ABOUT, derived and never listed.
 *
 * EN-2 reads "the toggle FR-049 makes out of a boolean of table T-202", so the
 * derivation is exactly those three conditions: the entrance stands on the
 * palette, its cell names a row of table T-202, and that row's type is boolean.
 * A case below also measures that every one of them is handed to FR-049 by the
 * authority column, which is the other half of EN-2's own wording.
 *
 * WHAT THIS LEAVES OUT, ON PURPOSE: IC-41 (gap 2 -- its cell names no settings
 * row at all), IC-50 and IC-76 (their cells name S-142 and S-206, which live in
 * table T-206 and are therefore not table T-202's booleans), and every App
 * Header row (a different unit, UF-62, fills those).
 */
const PALETTE_TOGGLES: readonly Entrance[] = PALETTE_ENTRANCES_ON_T_202.filter(
  (entrance) => entrance.setting.isBoolean,
)

/** The palette entrances standing on a row of table T-202 that is NOT a boolean. */
const PALETTE_NON_TOGGLES: readonly Entrance[] = PALETTE_ENTRANCES_ON_T_202.filter(
  (entrance) => !entrance.setting.isBoolean,
)

/**
 * The values a non-boolean row of table T-202 is walked over.
 *
 * The enumerated ones are read out of the type column itself, so a row that
 * gains or loses a value reaches these cases. A row that states no enumeration
 * needs two values of the right shape and the manuscript spells none, so the
 * stand-ins are held here, keyed by the KEY the manuscript writes -- and a case
 * below fails if any non-boolean entrance is left with fewer than two values,
 * so a new row of that shape reports instead of being silently skipped.
 *
 * The two dates are arbitrary and nothing below depends on them: what is being
 * varied is "the row carries a pair" against "the row carries nothing", which
 * is exactly the difference DC-7 of table T-029a says outlives the mode.
 */
const STAND_IN_VALUES: Readonly<Record<string, readonly unknown[]>> = {
  dualCursor: [null, { date1: '2026-01-05', date2: '2026-01-09' }],
}

const valuesOf = (setting: SettingRow): readonly unknown[] => {
  const enumerated = codeSpans(setting.type)
    .filter((span) => /^'[^']*'$/.test(span))
    .map((span) => span.slice(1, -1))
  if (enumerated.length >= 2) return enumerated
  return STAND_IN_VALUES[setting.key] ?? []
}

/** IC-76 of table T-109 -- FR-102's recording, whose state is S-206 of table T-206. */
const RECORDING_ENTRANCE = 'IC-76'

// ---------------------------------------------------------------------------
// Inputs.
// ---------------------------------------------------------------------------

/**
 * `SETTINGS_DEFAULTS` is printed with the dotted keys the settings tables write,
 * while `DocumentSettings` is the nested shape (the note is
 * tests/unit/fr-006-panel-close-entrance.test.ts's, and this is its helper).
 */
const nested = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(flat)) {
    const path = key.split('.')
    const last = path[path.length - 1] as string
    let at = out
    for (const step of path.slice(0, -1)) {
      if (typeof at[step] !== 'object' || at[step] === null) at[step] = {}
      at = at[step] as Record<string, unknown>
    }
    at[last] = flat[key]
  }
  return out
}

/**
 * A case pins the keys it means; every other value is the manuscript's.
 * Rule 03 section 1 forbids re-typing a value the specification holds, so no
 * default is written in this file.
 */
const settingsWith = (part: Readonly<Record<string, unknown>> = {}): DocumentSettings =>
  nested({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

/** Every derived toggle at one value, so that one case can vary exactly one of them. */
const everyToggleAt = (value: boolean): Record<string, unknown> =>
  Object.fromEntries(PALETTE_TOGGLES.map((entrance) => [entrance.setting.key, value]))

const ALL_OFF = settingsWith(everyToggleAt(false))
const ALL_ON = settingsWith(everyToggleAt(true))

/** S-99e defaults to showing, so the empty state describes a palette. */
const SHOWN: ScreenState = emptyScreenState()

/**
 * Table T-023b -- the whole of what can be armed, in the table's own order.
 * The spellings a shape and a glyph carry are not settled, so each row is built
 * with one no case reads back. (The copy is uf-65.test.ts's.)
 */
const T_023b: readonly { readonly row: string; readonly armed: Armed }[] = [
  { row: 'AR-1', armed: { kind: 'none' } },
  { row: 'AR-2', armed: { kind: 'taskShape', shapeKind: 'SH-1' } },
  { row: 'AR-3', armed: { kind: 'milestoneShape', glyph: 'SH-5' } },
  { row: 'AR-4', armed: { kind: 'dependency' } },
  { row: 'AR-5', armed: { kind: 'commentBox' } },
  { row: 'AR-6', armed: { kind: 'highlightBox' } },
]

/**
 * Every member of `ScreenSession` is spelled out, so a case that means to vary
 * one varies exactly one. The milestone list is OPEN for the reason
 * uf-65.test.ts gives: FR-053 keeps those entrances out of the palette while it
 * is shut, and a shut list would state a condition under which the roster this
 * file walks is not the roster the table describes.
 */
const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  // FR-066: the dialogue field stands only while the `Agent API` is on, which
  // FR-065 makes the reader's own act -- so it is down here, as the line above
  // says the API is off. (The member arrived with defect D-149 while this file
  // was being written; twenty session literals across tests/ are behind it.)
  isDialogueFieldVisible: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
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

// ---------------------------------------------------------------------------
// Calling the unit.
// ---------------------------------------------------------------------------

/**
 * The unit, with the `DocumentSettings` the ruling of 2026-08-31 hands it.
 *
 * GAP 1 IS WHY THIS IS A CAST. No row of the specification writes UF-65's
 * argument list, so the place the settings take is the implementation's choice
 * and not something the manuscript states; the order below was read back out of
 * tests/unit/uf-65.test.ts. The cast cannot hide a wrong guess: an argument the
 * unit does not take is an argument it ignores, and an ignored settings value
 * fails the very first case below rather than passing quietly.
 */
type PaletteFromScreenState = (
  state: ScreenState,
  settings: DocumentSettings,
  selection: Selection,
  session: ScreenSession,
) => CommandPalette | null

const paletteFrom = commandPaletteFromScreenState as unknown as PaletteFromScreenState

const describedWith = (
  settings: DocumentSettings,
  state: ScreenState = SHOWN,
  session: ScreenSession = SESSION,
): CommandPalette => {
  const palette = paletteFrom(state, settings, emptySelection(), session)
  expect(palette, 'S-99e: the palette is showing, so one is described').not.toBeNull()
  return palette as CommandPalette
}

const entriesOf = (palette: CommandPalette): readonly CommandItem[] =>
  palette.groups.flatMap((group) => group.commands)

const entryFor = (palette: CommandPalette, icon: string): CommandItem => {
  const found = entriesOf(palette).filter((entry) => entry.icon === icon)
  expect(found, `table T-109 places ${icon} on the palette`).toHaveLength(1)
  return found[0] as CommandItem
}

/** Whether one entrance is pressed while the document holds these settings. */
const pressed = (icon: string, settings: DocumentSettings): boolean =>
  entryFor(describedWith(settings), icon).isPressed

/** Every entry's pressed state, in the roster's order -- for the difference cases. */
const pressedVectorOf = (palette: CommandPalette): readonly boolean[] =>
  entriesOf(palette).map((entry) => entry.isPressed)

// ===========================================================================
// The premises every case below stands on.
// ===========================================================================

describe('the manuscripts still say what these cases read', () => {
  it('was really driven by the manuscripts, and not by a hollow read of them', () => {
    // WITHOUT THIS, A PARSE THAT MATCHED NOTHING WOULD MAKE EVERY CASE BELOW
    // AGREE WITH ANYTHING (04-verification.md section 2). Relations, not counts:
    // how many toggles the palette holds is table T-109's to say and moves
    // whenever a row is added, so no number is written here.
    expect(COMMAND_PALETTE_SURFACE.length, 'U-26 of table T-103').toBeGreaterThan(0)
    expect(T_202_ROWS.filter((row) => row.isBoolean).length, 'T-202 has boolean rows')
      .toBeGreaterThan(1)
    expect(T_202_ROWS.filter((row) => !row.isBoolean).length, 'T-202 has other rows')
      .toBeGreaterThan(1)
    expect(PALETTE_TOGGLES.length, 'the palette holds toggles').toBeGreaterThan(1)
    expect(PALETTE_NON_TOGGLES.length, 'the palette holds entrances on other rows')
      .toBeGreaterThan(0)
    // The two sets are what tell case 1 from case 2, so an overlap would make
    // one of them assert the opposite of the other about the same entrance.
    const toggles = new Set(PALETTE_TOGGLES.map((entrance) => entrance.row))
    for (const entrance of PALETTE_NON_TOGGLES) {
      expect(toggles.has(entrance.row), `${entrance.row} is on both sides`).toBe(false)
    }
  })

  it('still reads the "same as above" cells, so no entrance of a family is dropped', () => {
    // THE ONE NEEDLE THIS FILE SEARCHES CELL TEXT FOR. Table T-109 writes the
    // settings row once and then says "same, `'crosshair'`" for the rest of the
    // family, so a re-worded cell would quietly take IC-47 .. IC-49 out of the
    // walk below and leave one guide-cursor entrance holding the rule for four.
    const sameAsAbove = T_109_PALETTE.filter((row) =>
      (row.by[T_109_ENTRANCE_COLUMN] ?? '').startsWith(SAME_AS_THE_ROW_ABOVE),
    )
    expect(sameAsAbove.length, 'table T-109 no longer writes a "same as above" cell')
      .toBeGreaterThan(0)
    // And that at least one of them really inherited: a settings row standing
    // under more than one entrance is what the inheritance produces.
    const perSetting = new Map<string, number>()
    for (const entrance of PALETTE_ENTRANCES_ON_T_202) {
      perSetting.set(entrance.setting.id, (perSetting.get(entrance.setting.id) ?? 0) + 1)
    }
    expect(
      [...perSetting.values()].some((count) => count > 1),
      'no settings row of table T-202 is shared by a family of entrances',
    ).toBe(true)
  })

  it('joins every derived toggle to a key the document really carries', () => {
    // The join is table T-109's cell naming a row of table T-202 and that row's
    // key column. A key the settings do not carry would make case 1 vary
    // nothing, and it would still pass on an entrance that was never pressed.
    for (const entrance of PALETTE_TOGGLES) {
      expect(entrance.setting.key.length, `${entrance.row}: ${entrance.setting.id}`)
        .toBeGreaterThan(0)
      expect(
        Object.prototype.hasOwnProperty.call(SETTINGS_DEFAULTS, entrance.setting.key),
        `${entrance.setting.id} is stored under ${entrance.setting.key}`,
      ).toBe(true)
    }
  })

  it('finds every derived toggle handed to FR-049, which is what EN-2 says', () => {
    // EN-2 names the toggles FR-049 makes, so an entrance on a boolean of table
    // T-202 whose authority column named some other requirement would not be
    // one of EN-2's -- and this file would be asserting about the wrong rows.
    for (const entrance of PALETTE_TOGGLES) {
      expect(entrance.authority, `table T-109 ${entrance.row}`).toContain('FR-049')
    }
  })

  it('leaves every non-toggle entrance with two values to be walked over', () => {
    // Case 2 varies a row and asks that the answer does not move. A row left
    // with one value or none would make that case compare a thing with itself.
    for (const entrance of PALETTE_NON_TOGGLES) {
      expect(
        valuesOf(entrance.setting).length,
        `${entrance.row}: table T-202 ${entrance.setting.id} states no two values, and this ` +
          'bench holds no stand-in for it',
      ).toBeGreaterThan(1)
    }
  })

  it('still finds row EN-2 in table T-237, saying what these cases drive with', () => {
    const en2 = T_237.rows.find((row) => row.id === 'EN-2')
    expect(en2, 'table T-237 no longer has row EN-2').toBeDefined()
    // The state column is the join to FR-049 and table T-202; the owner column
    // is what puts the row in FR-029's own keeping. A re-worded row reports
    // here rather than leaving the cases below quoting a sentence that moved.
    expect(en2?.by[T_237_STATE_COLUMN]).toContain('FR-049')
    expect(en2?.by[T_237_STATE_COLUMN]).toContain('T-202')
    expect(bare(en2?.by[T_237_FILL_COLUMN] ?? ''), 'EN-2 is filled in S-183').toBe('S-183')
  })

  it('finds no row of table T-237 for an entrance that is the current exclusive choice', () => {
    // GAP 3, MEASURED RATHER THAN ASSUMED. Case 2 below only holds that the
    // answer does not follow S-66 BECAUSE table T-237 -- which FR-029 (MUST)
    // binds the fill to -- has no row that such a fill could mean. The day a
    // row is added for it, this premise fails and case 2 has to be rewritten
    // rather than quietly forbidding what the specification has begun to ask.
    expect(T_237.rows.map((row) => row.id)).toEqual(['EN-1', 'EN-2', 'EN-3', 'EN-4', 'EN-5'])
  })
})

// ===========================================================================
// The settings reach the unit at all -- the wiring D-158 says is missing.
// ===========================================================================

describe('FR-029 EN-2 (MUST) -- the document settings reach UF-65', () => {
  it('describes a different palette when every toggle is on than when every one is off', () => {
    // THE ONE CASE THAT TELLS A WIRING FAILURE FROM A RULE FAILURE (gap 1). If
    // the fourth argument never arrives -- because UF-65 still takes three, or
    // because the settings were given another door -- the two descriptions are
    // identical and this fails first, which says the settings never got in. It
    // does not say WHICH entrance moved: the cases below do that.
    expect(
      pressedVectorOf(describedWith(ALL_ON)),
      'EN-2: turning every toggle on changes nothing the palette describes',
    ).not.toEqual(pressedVectorOf(describedWith(ALL_OFF)))
  })
})

// ===========================================================================
// EN-2 -- an entrance whose function is ON.
// ===========================================================================

describe('FR-029 EN-2 (MUST) -- a palette toggle is pressed exactly while its row is true', () => {
  it('presses every derived toggle while its own boolean is true', () => {
    // The ruling's own example is one row of this walk: "if the progress line
    // is on, paint the progress-line icon green". Nothing here names that row
    // -- the walk is over whatever table T-109 and table T-202 join today.
    for (const entrance of PALETTE_TOGGLES) {
      expect(
        pressed(entrance.row, settingsWith({ ...everyToggleAt(false), [entrance.setting.key]: true })),
        `EN-2: ${entrance.row} while ${entrance.setting.key} (${entrance.setting.id}) is true`,
      ).toBe(true)
    }
  })

  it('leaves every derived toggle unpressed while its own boolean is false', () => {
    // THE CONVERSE, WITHOUT WHICH THE CASE ABOVE WOULD PASS ON AN ENTRANCE THAT
    // IS ALWAYS PRESSED. EN-2 gives a fill to a STATE, so an entrance not in
    // that state may not carry it.
    for (const entrance of PALETTE_TOGGLES) {
      expect(
        pressed(entrance.row, settingsWith({ ...everyToggleAt(true), [entrance.setting.key]: false })),
        `EN-2: ${entrance.row} while ${entrance.setting.key} (${entrance.setting.id}) is false`,
      ).toBe(false)
    }
  })

  it('reads its own row and no other', () => {
    // WHAT WOULD HAVE TO CHANGE FOR THIS TO FAIL: an implementation that
    // pressed every toggle whenever ANY of them was on, or that read one row
    // for two entrances, would pass both cases above and fail here. Turning on
    // exactly one row must press exactly that one entrance among the toggles.
    for (const entrance of PALETTE_TOGGLES) {
      const settings = settingsWith({ ...everyToggleAt(false), [entrance.setting.key]: true })
      const palette = describedWith(settings)
      const pressedRows = PALETTE_TOGGLES.filter((other) => entryFor(palette, other.row).isPressed)
      expect(
        pressedRows.map((one) => one.row),
        `EN-2: only ${entrance.row} answers to ${entrance.setting.key}`,
      ).toEqual([entrance.row])
    }
  })
})

// ===========================================================================
// FR-049 (MUST NOT) -- the rows of table T-202 that are not toggles.
// ===========================================================================

describe('FR-049 (MUST NOT) -- a row that is not boolean makes no pressed entrance', () => {
  it('moves no entrance when a non-boolean row of table T-202 changes value', () => {
    // FR-049 (MUST NOT): the target is the boolean rows and those only; the
    // multi-valued rows and the rows carrying a value of their own are outside
    // it. FR-029 (MUST) then binds every fill to table T-237, whose rows hold
    // no meaning an exclusive choice could be painted with (gap 3).
    //
    // WHAT IS NOT ASSERTED: whether these entrances are pressed or not. The
    // specification does not settle it (gap 3), so the claim is only that the
    // ANSWER DOES NOT FOLLOW THE VALUE -- which is what would go wrong if the
    // new wiring swept every row of table T-202 up together.
    //
    // DC-7 of table T-029a is why this bites hardest on S-65: leaving the Dual
    // Cursor mode (MUST NOT) clears the two lines, so an entrance pressed on
    // `dualCursor` carrying a pair would claim a mode the person has left.
    for (const entrance of PALETTE_NON_TOGGLES) {
      const answers = valuesOf(entrance.setting).map((value) =>
        pressed(entrance.row, settingsWith({ [entrance.setting.key]: value })),
      )
      expect(
        new Set(answers).size,
        `FR-049 (MUST NOT): ${entrance.row} follows ${entrance.setting.key} ` +
          `(${entrance.setting.id}), whose values are ${JSON.stringify(valuesOf(entrance.setting))}`,
      ).toBe(1)
    }
  })
})

// ===========================================================================
// FR-053 (MUST NOT) -- an arm is not a press.
// ===========================================================================

describe('FR-053 (MUST NOT) -- arming an entrance does not press it', () => {
  it('takes an arm without moving any pressed state, whatever the toggles say', () => {
    // "An armed entrance may not be drawn as a pressed one" -- IC-54 of table
    // T-109 says it is not a button. The arm has its own member and its own row
    // of table T-237 (EN-1), and the two may not be confused.
    //
    // ASKED AS A DIFFERENCE rather than as "nothing is ever pressed", because
    // EN-2 entitles a toggle that is on to exactly that. The new axis this case
    // adds over tests/unit/fr-053-one-armed-entrance.test.ts is the SETTINGS
    // one: that file walks the arms with the settings out of reach, so it
    // cannot see a wiring that ORed the arm together with the toggle rows.
    for (const settings of [ALL_OFF, ALL_ON]) {
      const unarmed = pressedVectorOf(describedWith(settings))
      for (const { row, armed } of T_023b) {
        expect(
          pressedVectorOf(describedWith(settings, screenStateWithArmed(SHOWN, armed))),
          `FR-053 (MUST NOT): table T-023b ${row} reached a pressed state`,
        ).toEqual(unarmed)
      }
    }
  })
})

// ===========================================================================
// IC-76 -- FR-102's recording.
// ===========================================================================

describe('FR-102 (MUST NOT) -- IC-76 does not answer to the document', () => {
  it('keeps IC-76 where it is however the document settings are turned', () => {
    // Whether a recording is running is S-206, a row of table T-206 -- the
    // table of what is NOT saved -- and FR-102 (MUST NOT) forbids the recording
    // being saved into the document. So no value the document carries may move
    // this entrance, and the wiring that D-158 asks for must not sweep it up.
    //
    // WHAT WOULD HAVE TO CHANGE FOR THIS TO FAIL: IC-76 reading a row of table
    // T-202 -- for instance a fix that pressed every palette entrance whose
    // cell names any settings row at all, which would catch S-206 as well.
    //
    // WHAT IS NOT ASSERTED: that IC-76 follows the recording. Gap 4 -- no
    // argument this bench can build carries S-206, so that half is unheld here
    // and is owed by whoever wires it across the seam.
    expect(
      pressed(RECORDING_ENTRANCE, ALL_ON),
      'FR-102 (MUST NOT): IC-76 moved when the document settings did',
    ).toBe(pressed(RECORDING_ENTRANCE, ALL_OFF))

    // The same claim against one row at a time, so that two rows cancelling
    // each other out cannot make the pair above agree by accident.
    for (const entrance of PALETTE_TOGGLES) {
      expect(
        pressed(RECORDING_ENTRANCE, settingsWith({ [entrance.setting.key]: true })),
        `FR-102 (MUST NOT): IC-76 moved with ${entrance.setting.key}`,
      ).toBe(pressed(RECORDING_ENTRANCE, settingsWith({ [entrance.setting.key]: false })))
    }
  })

  it('is not one of the entrances EN-2 is about', () => {
    // The derivation, stated as a claim rather than left implicit: IC-76's cell
    // names S-206, which table T-206 holds and table T-202 does not, so the
    // walks above never reach it and the case here is not asserting twice.
    expect(PALETTE_TOGGLES.map((entrance) => entrance.row)).not.toContain(RECORDING_ENTRANCE)
    expect(PALETTE_NON_TOGGLES.map((entrance) => entrance.row)).not.toContain(RECORDING_ENTRANCE)
  })
})
