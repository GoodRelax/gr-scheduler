// Unit tests for `commandPaletteFromScreenState` (unit UF-65 of table T-075,
// component CP-37 of table T-062, which table T-064 publishes as PI-37).
//
// Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN AGAINST THE SPECIFICATION ALONE (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, `screen-renderer.ts` in full because it is the contract that fixes the
// signature and the shape of `CommandPalette`, the entity types the inputs are
// built from, and the head comment plus the declarations of
// `command-palette.ts`. No function body of the unit was read, and no expected
// value below comes from what the unit happens to produce.
//
// WHERE THE SPECIFICATION DECIDES NOTHING, NOTHING IS ASSERTED. Three questions
// were searched for; one still has no answer in docs/spec, so no case invents
// one, and the other two are kept below with the answers they have since been
// given:
//   * HOW BIG THE PALETTE IS -- ⚠️ ANSWERED SINCE, AND THE ANSWER IS "NOBODY
//     HOLDS IT". This file once recorded the extent as a gap and asserted the
//     relation FR-053 stated against the rectangle that arrived. FR-053 (MUST)
//     now has the size follow the contents and (MUST NOT) bars the settings
//     table from holding one, so the rectangle is gone and only the corner
//     remains. ⛔ The faintness went with it: the same paragraph (MUST) has that
//     judged by WHICH PART the pointer is on, which IF-9 of table T-065 answers
//     from the side that drew the parts. See the note where those cases stood.
//   * THE WORDS -- ⚠️ ANSWERED SINCE, AND THE CASES BELOW MOVED WITH IT. When
//     this file was written FR-038 named no store of translated strings, so a
//     case asserted that none had been minted. Its fifth paragraph (MUST) now
//     puts every printed word in one per-language dictionary and (MUST NOT)
//     bars requirements and tables from holding the words; Chapter 6.2 (MUST)
//     fixes the manuscript and the one generated file it reaches `src/` by. So
//     the cases below READ the word out of that dictionary. ⛔ No word is written
//     here -- the same MUST NOT that keeps them out of a table keeps a bench
//     from minting one, and section 8 of `_assets/tbl-glossary.md` still
//     refuses table T-109 an English column of its own.
//   * WHETHER AN ENTRY IS A TOGGLE THAT IS ON. `CommandItem.isPressed` is shown
//     by FR-065 of IC-20 and by FR-072 of IC-17, both `App Header` rows. What
//     the palette's toggling entries reflect lives in `DocumentSettings`, which
//     this signature does not carry, and table T-109 joins no icon row to an
//     arm of table T-023b. So no case asks for a pressed entry.
//
// The rules these cases answer to:
//   S-99e        the palette is showing or hidden, defaulting to showing
//                (table T-206); EP-11 of table T-076 exports it closed
//   FR-053       it floats and is dragged; (MUST) the size follows the contents
//                and (MUST NOT) the settings table holds none; (MUST) what is
//                armed is readable; (MUST) the show/hide entrance is OUTSIDE
//                the palette. ⛔ The faintness is judged elsewhere -- see above
//   T-065 IF-9   where the faintness IS judged: the side that drew the parts
//   T-023b       AR-1 .. AR-6, the whole of what can be armed
//   T-023c       SL-1 does not admit the palette; SL-7b (MUST NOT) refuses
//                FR-034 an unordered selection
//   FR-034       alignment goes to the LAST-picked task's date
//   FR-029       (MUST) the roster of icons and where each is placed follow
//                table T-109; (MUST) what cannot be used is faint and gives its
//                reason; (MUST NOT) one entrance per function
//   FR-083       SP-1 .. SP-4: pressing a shape entry has a defined meaning
//                with a selection and without one
//   T-103        U-26 `Command Palette`, U-34 `Palette Groups` / `Palette
//                Commands`
//   T-075        UF-65 is `pure`, which R7.1 makes testable
//   R3.4         intervals are half-open, so an edge belongs to one side only
//
// Chapter 1.9 asks a test of a requirement that points at a table to be driven
// by a fixed copy of that table. T_109_PALETTE and T_023b below are that copy;
// nothing here re-reads `icon-roster.json`, because a copy read from the same
// generated file as the unit could not tell drift from agreement.
// ⚠️ THE DICTIONARY IS THE ONE THING READ RATHER THAN COPIED, and FR-038's own
// MUST NOT is why: a word copied into this file would be the second store of
// the words that sentence forbids.

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
import {
  emptySelection,
  selectionOfAll,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import type {
  CommandItem,
  CommandPalette,
  DisplayLanguage,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { commandPaletteFromScreenState } from '../../src/adapter/screen-renderer/command-palette'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * 表 T-109 -- every row whose 面 column reads `Command Palette`, in the table's
 * own print order, with its 群 and its 正.
 *
 * The 群 column is carried in the manuscript's own language on purpose: the
 * preamble of section 8 of `_assets/tbl-glossary.md` states that the table has
 * no English column and why adding one is refused. Writing an English group
 * name here would mint the very names that refusal is about.
 *
 * `isButton` is false for the two rows whose 何の入口か column says in as many
 * words that they are not buttons. That fact lives as prose inside a column
 * rather than as a column of its own, which is why it is copied by row id.
 */
const T_109_PALETTE = [
  { row: 'IC-23', group: '置く', authority: 'FR-083', isButton: true },
  { row: 'IC-24', group: '置く', authority: 'FR-083', isButton: true },
  { row: 'IC-25', group: '置く', authority: 'FR-083', isButton: true },
  { row: 'IC-26', group: '置く', authority: 'FR-083', isButton: true },
  { row: 'IC-27', group: '置く', authority: 'FR-078', isButton: true },
  { row: 'IC-28', group: '置く', authority: 'FR-078', isButton: true },
  { row: 'IC-29', group: '置く', authority: 'FR-078', isButton: true },
  { row: 'IC-30', group: '置く', authority: 'FR-078', isButton: true },
  { row: 'IC-31', group: '置く', authority: 'FR-078', isButton: true },
  { row: 'IC-32', group: '置く', authority: 'FR-078', isButton: true },
  { row: 'IC-33', group: '置く', authority: 'FR-078', isButton: true },
  { row: 'IC-34', group: '置く', authority: 'FR-078', isButton: true },
  { row: 'IC-35', group: '置く', authority: 'FR-019', isButton: true },
  { row: 'IC-36', group: '置く', authority: 'FR-019', isButton: true },
  { row: 'IC-37', group: '揃える', authority: 'FR-034', isButton: true },
  { row: 'IC-38', group: '揃える', authority: 'FR-034', isButton: true },
  { row: 'IC-39', group: '表示', authority: 'FR-049', isButton: true },
  { row: 'IC-40', group: '表示', authority: 'FR-049', isButton: true },
  { row: 'IC-41', group: '表示', authority: 'FR-020', isButton: true },
  { row: 'IC-42', group: '表示', authority: 'FR-049', isButton: true },
  { row: 'IC-43', group: '表示', authority: 'FR-049', isButton: true },
  { row: 'IC-44', group: 'カーソル', authority: 'FR-046', isButton: true },
  { row: 'IC-45', group: 'カーソル', authority: 'FR-082', isButton: true },
  { row: 'IC-46', group: 'カーソル', authority: 'FR-048', isButton: true },
  { row: 'IC-47', group: 'カーソル', authority: 'FR-048', isButton: true },
  { row: 'IC-48', group: 'カーソル', authority: 'FR-048', isButton: true },
  { row: 'IC-49', group: 'カーソル', authority: 'FR-048', isButton: true },
  { row: 'IC-50', group: '置く', authority: 'FR-078', isButton: true },
  { row: 'IC-51', group: '置く', authority: 'FR-078', isButton: true },
  { row: 'IC-53', group: '', authority: 'FR-053', isButton: false },
  { row: 'IC-54', group: '構え', authority: 'SK-19', isButton: false },
  { row: 'IC-61', group: '置く', authority: 'FR-009', isButton: true },
  { row: 'IC-62', group: '表示', authority: 'FR-099', isButton: true },
] as const

/**
 * Rows of table T-109 placed on a surface OTHER than the palette. One per
 * surface the table names, plus the two the palette is most easily confused
 * with: IC-7 is the show/hide entrance FR-053 (MUST) keeps outside the palette,
 * and IC-21 is FR-029's single two-place exception.
 */
const T_109_ELSEWHERE = ['IC-1', 'IC-7', 'IC-17', 'IC-21', 'IC-52', 'IC-55', 'IC-58'] as const

/**
 * 表 T-023b -- the whole of what can be armed, in the table's own order. The
 * spellings a shape and a glyph carry are not settled (`Armed` says so of
 * AR-3), so each row is built with a spelling the case never reads back.
 */
const T_023b: readonly { readonly row: string; readonly armed: Armed }[] = [
  { row: 'AR-1', armed: { kind: 'none' } },
  { row: 'AR-2', armed: { kind: 'taskShape', shapeKind: 'SH-1' } },
  { row: 'AR-3', armed: { kind: 'milestoneShape', glyph: 'SH-5' } },
  { row: 'AR-4', armed: { kind: 'dependency' } },
  { row: 'AR-5', armed: { kind: 'commentBox' } },
  { row: 'AR-6', armed: { kind: 'highlightBox' } },
]

/** FR-034, as the 正 column of table T-109 writes it for IC-37 and IC-38. */
const ALIGN_REQUIREMENT = 'FR-034'

// ---------------------------------------------------------------------------
// What the table copy says the answer is.
// ---------------------------------------------------------------------------

/** The rows that become entries: 面 is the palette, and the row is a button. */
const PALETTE_ENTRY_ROWS = T_109_PALETTE.filter((entry) => entry.isButton)

/**
 * The 群 names in the order the table first meets them. FR-029's RATIONALE
 * groups the palette because the number of choices sets the time to decide, and
 * the table's own order is the only order it states -- which matters here
 * because the table returns to an earlier group three times near its end.
 */
const PALETTE_GROUP_NAMES: readonly string[] = PALETTE_ENTRY_ROWS.reduce<string[]>(
  (names, entry) => (names.includes(entry.group) ? names : [...names, entry.group]),
  [],
)

/** The rows of one group, in the table's print order. */
const rowsOfGroup = (group: string): readonly string[] =>
  PALETTE_ENTRY_ROWS.filter((entry) => entry.group === group).map((entry) => entry.row)

/**
 * Every entry, read the way the palette lays them out: group by group in the
 * order the table first meets each, and inside a group the table's print order.
 *
 * That is NOT the table's print order end to end, and the difference is the
 * point of the grouping FR-029 asks for: the table returns to the group it
 * opened first three times near its end, so those three rows stand with the
 * group rather than where the table happens to print them.
 */
const PALETTE_ENTRY_ROWS_GROUPED: readonly string[] = PALETTE_GROUP_NAMES.flatMap((group) =>
  rowsOfGroup(group),
)

/** The rows FR-034 owns, read off the 正 column rather than named by row id. */
const ALIGN_ROWS: readonly string[] = PALETTE_ENTRY_ROWS.filter(
  (entry) => entry.authority === ALIGN_REQUIREMENT,
).map((entry) => entry.row)

/**
 * The row of table T-109 each group is first met at. CR-194 section 0 item ⑧ 4
 * makes that row the key a group's word is held under, so it -- and not the 群
 * cell -- is what survives a change of display language.
 */
const FIRST_ROW_OF_GROUP: readonly string[] = PALETTE_GROUP_NAMES.map(
  (group) => rowsOfGroup(group)[0] as string,
)

// ---------------------------------------------------------------------------
// The one dictionary FR-038 (MUST) holds the printed words in.
// ---------------------------------------------------------------------------

/**
 * Chapter 6.2 (MUST) puts the manuscript at `_source/display-words.json` and
 * (MUST) lets it reach `src/` as one generated file; this is that file.
 *
 * ⛔ Read, never re-typed: FR-038 (MUST NOT) bars the words from a requirement
 * or a table, and a bench that spelled one would be the second store the same
 * sentence forbids. ⚠️ It is also the file the unit reads, so agreement here
 * is not agreement with the manuscript -- `tests/contract/
 * display-words.contract.test.ts` is what holds the two together cell for
 * cell, and `npm run gen:check` falls on drift.
 */
const DICTIONARY = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'),
    'utf8',
  ),
) as {
  readonly icons: readonly {
    readonly rowId: string
    readonly label: Readonly<Record<DisplayLanguage, string>>
  }[]
  readonly paletteGroups: readonly {
    readonly firstRow: string
    readonly name: Readonly<Record<DisplayLanguage, string>>
  }[]
}

/** The word held for one entry of table T-109, in one display language. */
const labelWordOf = (row: string, language: DisplayLanguage): string => {
  const held = DICTIONARY.icons.find((one) => one.rowId === row)
  expect(held, `FR-038: the dictionary holds no entry for ${row}`).toBeDefined()
  return (held as { readonly label: Readonly<Record<DisplayLanguage, string>> }).label[language]
}

/** The word held for the group opened at one row, in one display language. */
const groupWordOf = (firstRow: string, language: DisplayLanguage): string => {
  const held = DICTIONARY.paletteGroups.find((one) => one.firstRow === firstRow)
  expect(held, `FR-038: the dictionary holds no group opened at ${firstRow}`).toBeDefined()
  return (held as { readonly name: Readonly<Record<DisplayLanguage, string>> }).name[language]
}

/** The group words in the order the table first meets each group. */
const groupWordsIn = (language: DisplayLanguage): readonly string[] =>
  FIRST_ROW_OF_GROUP.map((row) => groupWordOf(row, language))

// ---------------------------------------------------------------------------
// Inputs. UF-65 fills one member of `ScreenView` and reads none of the others,
// so every member below that a case does not mean is inert.
// ---------------------------------------------------------------------------

const SHOWN: ScreenState = screenStateWithPalette(emptyScreenState(), true)
const HIDDEN: ScreenState = screenStateWithPalette(emptyScreenState(), false)

const sessionOf = (part: Partial<ScreenSession> = {}): ScreenSession => ({
  language: 'ja',
  autosave: { kind: 'saved', at: '2026-08-19T09:00:00Z' },
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  // The four members `ScreenSession` requires that no case here varies:
  // `iconUnderPointer` is EZ-2's place condition (`null` -- the pointer rests
  // on no icon), `selectedGroupIds` is FR-085's set of rows and
  // `selectedResourceUids` FR-099's set of resources (both empty -- none
  // chosen), and `propertiesSubject` is FR-072's remembered subject (`null` --
  // no operation has chosen one yet).
  iconUnderPointer: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
  ...part,
})

const TASK_A: ItemRef = { kind: 'task', uid: 11 }
const TASK_B: ItemRef = { kind: 'task', uid: 12 }
const COMMENT_BOX: ItemRef = { kind: 'commentBox', id: 'cb-1' }

/** Picked one at a time, so SL-7b's order exists. */
const pickedInTurn = (...items: readonly ItemRef[]): Selection =>
  items.reduce((selection, item) => selectionWith(selection, item), emptySelection())

/** A marquee (SL-3) or a select-all (SL-5): everything at once, so no order. */
const pickedAtOnce = (...items: readonly ItemRef[]): Selection => selectionOfAll(items)

/** Selections a case may hand the unit without changing what it means. */
const SELECTIONS: readonly { readonly what: string; readonly selection: Selection }[] = [
  { what: 'nothing selected', selection: emptySelection() },
  { what: 'one task, picked', selection: pickedInTurn(TASK_A) },
  { what: 'two tasks, picked in turn', selection: pickedInTurn(TASK_A, TASK_B) },
  { what: 'two tasks, taken at once', selection: pickedAtOnce(TASK_A, TASK_B) },
  { what: 'one comment box, picked', selection: pickedInTurn(COMMENT_BOX) },
]

// ---------------------------------------------------------------------------
// Reading the answer.
// ---------------------------------------------------------------------------

/** Fails the case when no palette is described, so a case can go on reading. */
const describedWith = (
  selection: Selection = emptySelection(),
  session: ScreenSession = sessionOf(),
  state: ScreenState = SHOWN,
): CommandPalette => {
  const palette = commandPaletteFromScreenState(state, selection, session)
  expect(palette, 'S-99e: the palette is showing, so one is described').not.toBeNull()
  return palette as CommandPalette
}

const entriesOf = (palette: CommandPalette): readonly CommandItem[] =>
  palette.groups.flatMap((group) => group.commands)

const iconsOf = (palette: CommandPalette): readonly string[] =>
  entriesOf(palette).map((entry) => entry.icon)

const entryFor = (palette: CommandPalette, icon: string): CommandItem | undefined =>
  entriesOf(palette).find((entry) => entry.icon === icon)

/** A word carries a letter or a digit; a separator or an empty string does not. */
const hasWord = (text: string): boolean => /[\p{L}\p{N}]/u.test(text)

const deepFreeze = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value
  for (const inner of Object.values(value as Record<string, unknown>)) deepFreeze(inner)
  return Object.freeze(value)
}

// ---------------------------------------------------------------------------

describe('UF-65 -- S-99e: described only while the palette is showing', () => {
  it('describes nothing while S-99e says it is hidden', () => {
    expect(commandPaletteFromScreenState(HIDDEN, emptySelection(), sessionOf())).toBeNull()
  })

  it('describes one by default, because S-99e defaults to showing', () => {
    // `emptyScreenState` is where that default lives; nothing here repeats it.
    expect(commandPaletteFromScreenState(emptyScreenState(), emptySelection(), sessionOf())).not.toBeNull()
  })

  it('spells hidden one way only, which EP-11 of table T-076 also exports', () => {
    // EP-11 treats the palette as closed on the export path, so a description
    // carrying no entry would be a second spelling of hidden, and nothing says
    // which of the two wins. A shown palette always carries entries.
    for (const { what, selection } of SELECTIONS) {
      expect(commandPaletteFromScreenState(HIDDEN, selection, sessionOf()), what).toBeNull()
      expect(entriesOf(describedWith(selection)).length, what).toBeGreaterThan(0)
    }
  })

  it('answers hidden whatever else is going on', () => {
    // S-99e is the whole condition: no arm, no pointer and no selection turns
    // it back on.
    for (const { row, armed } of T_023b) {
      const state = screenStateWithArmed(HIDDEN, armed)
      const session = sessionOf({ pointer: { x: 5, y: 5 }, commandPaletteAt: { x: 0, y: 0 } })
      expect(commandPaletteFromScreenState(state, pickedInTurn(TASK_A), session), row).toBeNull()
    }
  })
})

describe('UF-65 -- FR-053: it floats where the person dragged it', () => {
  it('puts the corner it floats at where `ScreenSession.commandPaletteAt` says', () => {
    // FR-053 has the person drag the palette, so its place is not one of
    // ScreenRegions' rectangles -- and no rectangle of the layout is an
    // argument here at all.
    // ⭐ A CORNER AND NOTHING MORE. FR-053 (MUST) makes the size follow the
    // contents and (MUST NOT) bars the settings table from holding one, so the
    // place is the whole of the geometry this unit can answer for.
    for (const at of [
      { x: 0, y: 0 },
      { x: 12, y: 340 },
      { x: -40, y: -1 },
      { x: 1919.5, y: 1079.5 },
    ]) {
      const corner = describedWith(emptySelection(), sessionOf({ commandPaletteAt: at })).at
      expect(corner, JSON.stringify(at)).toEqual(at)
    }
  })

  it('carries a place and no extent, because FR-053 forbids one being held', () => {
    // ⛔ FR-053 (MUST NOT): 「大きさを設定値の表に持ってはならない」. No unit on
    // this side of IF-9 measures anything (LR-6), so a width or a height
    // appearing here would be a number nobody had measured -- which is what
    // this case exists to catch.
    const palette = describedWith(emptySelection(), sessionOf({ commandPaletteAt: { x: 12, y: 34 } }))
    expect(Object.keys(palette.at).sort()).toEqual(['x', 'y'])
    expect(Object.keys(palette).sort()).toEqual(['armedText', 'at', 'groups'])
  })

  it('moves only the place when the person drags it', () => {
    // SC-6 of table T-031 keeps the palette still against the screen, so a drag
    // is the only thing that moves it -- and moving it changes nothing else
    // that is described.
    const here = describedWith(emptySelection(), sessionOf({ commandPaletteAt: { x: 0, y: 0 } }))
    const there = describedWith(emptySelection(), sessionOf({ commandPaletteAt: { x: 300, y: 90 } }))
    expect({ ...there, at: here.at }).toEqual(here)
  })
})

// ⛔ THREE CASES ABOUT THE FAINTNESS STOOD HERE AND HAVE BEEN DELETED, NOT
// WEAKENED. FR-053 (MUST) now reads 「上の「薄く透明に描く」の判定は、ポインタが
// どの部品の上にあるかで行うこと（MUST）—— 大きさを持たない以上、矩形の内外では
// 判じられない。」 The judgement is therefore no longer this unit's: a `pure`
// unit (UF-65 of table T-075) handed a point and no rectangle cannot say which
// part the pointer is on. IF-9 of table T-065 supplies that answer from the
// side that DREW the parts, so the case is owed by the bench of the unit that
// implements it -- UF-72, `tests/unit/uf-72-screen-part.test.ts`.
// ⚠️ The third of them ('never reads the faintness off a selection') was still
// GREEN when the other two went red, because every answer it compared had
// become `undefined`. A case that passes by comparing absences is the "green
// proves nothing" of docs/development-rules/04-verification.md section 2, so it
// goes with them rather than staying as cover.

describe('UF-65 -- FR-053 (MUST): what is armed is readable on the screen', () => {
  it('says something for every arm of table T-023b', () => {
    // An empty `armedText` would answer nothing, and FR-053 makes reading what
    // is armed a MUST -- IC-61's arm (AR-4) is the one it names, because
    // otherwise AR-4's "whatever is hit becomes an endpoint" happens unannounced.
    for (const { row, armed } of T_023b) {
      const palette = describedWith(emptySelection(), sessionOf(), screenStateWithArmed(SHOWN, armed))
      expect(palette.armedText.length, `FR-053 (MUST): ${row}`).toBeGreaterThan(0)
    }
  })

  it('tells the six arms of table T-023b apart', () => {
    // Table T-023b holds the whole of what can be armed. Two arms wearing one
    // text cannot be read apart, which is what the MUST asks for.
    const texts = T_023b.map(
      ({ armed }) =>
        describedWith(emptySelection(), sessionOf(), screenStateWithArmed(SHOWN, armed)).armedText,
    )
    expect(new Set(texts).size).toBe(T_023b.length)
  })

  it('reads the arm off `ScreenState` and nothing else', () => {
    // U-38 of table T-103 forbids calling an arm a selection, and they are
    // different states: neither the selection nor the pointer may move it.
    for (const { row, armed } of T_023b) {
      const state = screenStateWithArmed(SHOWN, armed)
      const texts = SELECTIONS.map(
        ({ selection }) =>
          describedWith(selection, sessionOf({ pointer: { x: 3, y: 4 } }), state).armedText,
      )
      expect(new Set(texts).size, row).toBe(1)
    }
  })
})

describe('UF-65 -- FR-029 (MUST): the roster and the placement follow table T-109', () => {
  it('carries every palette row of the table that is a button, and no other', () => {
    // The 面 column IS the placement (FR-029, MUST). One pass over the table
    // copy, as Chapter 1.9 asks.
    expect(iconsOf(describedWith())).toEqual(PALETTE_ENTRY_ROWS_GROUPED)
  })

  it('leaves out the two rows the table marks as not being buttons', () => {
    // Both reach the screen as something other than an entry: one as the place
    // a drag moves, the other alongside what is armed.
    const icons = iconsOf(describedWith())
    for (const entry of T_109_PALETTE.filter((row) => !row.isButton)) {
      expect(icons, `table T-109: ${entry.row} is not a button`).not.toContain(entry.row)
    }
  })

  it('lets no row placed on another surface reach the palette', () => {
    // FR-029 (MUST) binds the placement to the 面 column, so a row placed on
    // the `App Header`, a modal, the autosave status or the row title panel has
    // no business here.
    const icons = iconsOf(describedWith())
    for (const row of T_109_ELSEWHERE) {
      expect(icons, `FR-029 (MUST): ${row} is placed elsewhere`).not.toContain(row)
    }
  })

  it('keeps the show/hide entrance outside the palette (FR-053, MUST)', () => {
    // FR-053: the entrance that hides the palette must sit outside it, or the
    // surface to press disappears the moment it is used. Table T-109 places
    // IC-7 on the `App Header` for that reason.
    expect(iconsOf(describedWith())).not.toContain('IC-7')
  })

  it('never carries the same entry twice (MUST NOT)', () => {
    // FR-029 forbids two entrances onto one function; its single exception is
    // the display language, which is placed on two OTHER surfaces.
    for (const { what, selection } of SELECTIONS) {
      const icons = iconsOf(describedWith(selection))
      expect(new Set(icons).size, `FR-029 (MUST NOT): a repeat with ${what}`).toBe(icons.length)
    }
  })

  it('invents no entry the table does not place here', () => {
    const placed = new Set<string>(T_109_PALETTE.map((entry) => entry.row))
    for (const icon of iconsOf(describedWith())) {
      expect(placed.has(icon), `FR-029 (MUST): ${icon} is not a row of the palette`).toBe(true)
    }
  })
})

describe('UF-65 -- FR-029: U-34 `Palette Groups` follow the 群 column', () => {
  it('opens the groups in the order the table first meets them', () => {
    // FR-029's RATIONALE is why the palette is grouped at all. Re-sorting by
    // anything else would move entries out of the group it puts them in: the
    // table returns to an earlier group three times near its end.
    // ⚠️ The ORDER is the claim, so the groups are named by the word the
    // dictionary holds for the row each is opened at -- the 群 cell is the
    // key's origin, not the printed word (FR-038).
    expect(describedWith().groups.map((group) => group.name)).toEqual(groupWordsIn('ja'))
  })

  it('keeps the table print order inside each group', () => {
    // ⚠️ Walked by position rather than by name: the case above pins the order,
    // so the nth group described is the nth group of the table, whichever word
    // FR-038 has that group printed under.
    const groups = describedWith().groups
    groups.forEach((group, at) => {
      expect(group.commands.map((entry) => entry.icon), group.name).toEqual(
        rowsOfGroup(PALETTE_GROUP_NAMES[at] as string),
      )
    })
    expect(groups.length).toBe(PALETTE_GROUP_NAMES.length)
  })

  it('opens no group for a row that is not an entry', () => {
    // One of the two rows that are not buttons carries a 群 of its own. A group
    // standing empty would be a heading with nothing under it -- and the
    // dictionary does hold a word for it, so its absence is a real answer.
    const notAnEntry = T_109_PALETTE.find((entry) => !entry.isButton && entry.group !== '')
    expect(notAnEntry, 'table T-109 no longer puts a 群 on a row that is not an entry').toBeDefined()
    for (const language of ['ja', 'en'] as const satisfies readonly DisplayLanguage[]) {
      const palette = describedWith(emptySelection(), sessionOf({ language }))
      expect(palette.groups.map((group) => group.name), language).not.toContain(
        groupWordOf((notAnEntry as { readonly row: string }).row, language),
      )
      for (const group of palette.groups) expect(group.commands.length).toBeGreaterThan(0)
    }
  })

  it('takes each group name from the dictionary, in the display language', () => {
    // ⚠️ WAS "mints no group name of its own", from the days when no store of
    // translated strings existed. FR-038's fifth paragraph (MUST) settled one,
    // so the claim is now the one that MUST states: the word printed over a
    // group is the word the dictionary holds for it in the language the reader
    // chose. ⛔ Not "whatever the unit answers" -- the expected value is read
    // out of the dictionary, keyed by the row the group opens at.
    for (const language of ['ja', 'en'] as const satisfies readonly DisplayLanguage[]) {
      const palette = describedWith(emptySelection(), sessionOf({ language }))
      expect(palette.groups.map((group) => group.name), language).toEqual(groupWordsIn(language))
    }
  })

  it('answers a different name per language, because the words are per language', () => {
    // FR-038 (MUST) shows the menus in the language the reader chose. ⚠️ Only
    // asked of the groups the dictionary really holds two different words for:
    // a group whose two words agree is the dictionary's answer, not a fault.
    const inJapanese = describedWith(emptySelection(), sessionOf({ language: 'ja' })).groups
    const inEnglish = describedWith(emptySelection(), sessionOf({ language: 'en' })).groups

    FIRST_ROW_OF_GROUP.forEach((row, at) => {
      if (groupWordOf(row, 'ja') === groupWordOf(row, 'en')) return
      expect(inEnglish[at]?.name, `FR-038 (MUST): the group opened at ${row}`).not.toBe(
        inJapanese[at]?.name,
      )
    })
  })
})

describe('UF-65 -- FR-029 (MUST) with SL-7b (MUST NOT): what cannot be used is faint', () => {
  it('offers the alignment entries while an ordered selection holds tasks', () => {
    // FR-034 lines the selected tasks up on the LAST-picked task's date, which
    // an order makes reachable.
    const palette = describedWith(pickedInTurn(TASK_A, TASK_B))
    for (const row of ALIGN_ROWS) {
      expect(entryFor(palette, row)?.isEnabled, `FR-034: ${row}`).toBe(true)
    }
  })

  it('refuses them on a selection that carries no order (SL-7b, MUST NOT)', () => {
    // SL-7b: a marquee (SL-3) and a select-all (SL-5) make no order, and
    // alignment MUST NOT be executed on that alone. FR-029 (MUST) is how a
    // person is told: faint, rather than a press that does nothing.
    const palette = describedWith(pickedAtOnce(TASK_A, TASK_B))
    for (const row of ALIGN_ROWS) {
      expect(entryFor(palette, row)?.isEnabled, `SL-7b (MUST NOT): ${row}`).toBe(false)
    }
  })

  it('refuses them while nothing is selected', () => {
    // FR-034 has no task to move and no last-picked task to move it to.
    const palette = describedWith(emptySelection())
    for (const row of ALIGN_ROWS) {
      expect(entryFor(palette, row)?.isEnabled, `FR-034: ${row} with nothing selected`).toBe(false)
    }
  })

  it('refuses them when the ordered selection holds no task', () => {
    // FR-034 speaks of the selected TASKS and of the last-picked TASK. SL-1
    // admits four other kinds, none of which carries a date to line up.
    const palette = describedWith(pickedInTurn(COMMENT_BOX))
    for (const row of ALIGN_ROWS) {
      expect(entryFor(palette, row)?.isEnabled, `FR-034: ${row} with no task selected`).toBe(false)
    }
  })

  it('leaves every other entry usable, whatever is selected', () => {
    // FR-083's SP-1 .. SP-4 give a shape entry a defined meaning both with a
    // selection and without one, and no requirement takes any other palette
    // entry away. FR-029 draws faint only what cannot be used -- an entry that
    // does nothing reads as a fault.
    for (const { what, selection } of SELECTIONS) {
      for (const entry of entriesOf(describedWith(selection))) {
        if (ALIGN_ROWS.includes(entry.icon)) continue
        expect(entry.isEnabled, `FR-029: ${entry.icon} with ${what}`).toBe(true)
      }
    }
  })
})

describe('UF-65 -- FR-038: the display language', () => {
  it('takes each entry word from the dictionary, in the display language', () => {
    // ⚠️ WAS "mints no word, because no table settles one". That case was the
    // stand-in for the store FR-038 did not yet have; its fifth paragraph
    // (MUST) now has one, so the claim is the one that MUST states -- the word
    // on an entry is the dictionary's word for that row of table T-109 in the
    // language the reader chose. ⛔ The expected value is read out of the
    // dictionary, not off what the unit answers.
    for (const language of ['ja', 'en'] as const satisfies readonly DisplayLanguage[]) {
      for (const entry of entriesOf(describedWith(emptySelection(), sessionOf({ language })))) {
        expect(entry.label, `${language}: ${entry.icon}`).toBe(labelWordOf(entry.icon, language))
      }
    }
  })

  it('leaves no entry without a word to read (FR-029 MUST)', () => {
    // FR-029 (MUST) has an entry that cannot be used give its reason, which
    // presumes an entry can be read at all; an entry printed with nothing on
    // it is an entry a person cannot name. ⚠️ This is the half the case above
    // cannot make: a dictionary gone empty would satisfy it in both languages.
    for (const language of ['ja', 'en'] as const satisfies readonly DisplayLanguage[]) {
      for (const entry of entriesOf(describedWith(emptySelection(), sessionOf({ language })))) {
        expect(hasWord(entry.label), `${language}: ${entry.icon} carries no word`).toBe(true)
      }
    }
  })

  it('describes the same entries in either language', () => {
    // FR-038 keeps one language state for the whole screen and translates no
    // roster: which entries stand there is table T-109's answer, not a
    // language's.
    const inJapanese = describedWith(emptySelection(), sessionOf({ language: 'ja' }))
    const inEnglish = describedWith(emptySelection(), sessionOf({ language: 'en' }))
    expect(iconsOf(inEnglish)).toEqual(iconsOf(inJapanese))
  })
})

describe('UF-65 -- table T-075 makes the unit `pure` (R7.1)', () => {
  it('rewrites none of its three arguments', () => {
    // A `pure` unit that rewrites an argument is the defect
    // docs/development-rules/04-verification.md records having been caught by
    // a specification-driven run.
    const state = deepFreeze(screenStateWithArmed(SHOWN, { kind: 'dependency' }))
    const selection = deepFreeze(pickedInTurn(TASK_A, TASK_B))
    const session = deepFreeze(sessionOf({ pointer: { x: 4, y: 4 } }))
    const before = JSON.stringify([state, selection, session])

    commandPaletteFromScreenState(state, selection, session)

    expect(JSON.stringify([state, selection, session])).toBe(before)
  })

  it('answers the same for the same inputs', () => {
    for (const { what, selection } of SELECTIONS) {
      const session = sessionOf({ commandPaletteAt: { x: 7, y: 8 }, pointer: { x: 7, y: 8 } })
      const first = commandPaletteFromScreenState(SHOWN, selection, session)
      const second = commandPaletteFromScreenState(SHOWN, selection, session)
      expect(second, what).toEqual(first)
    }
  })
})

describe('UF-65 -- boundaries the specification admits', () => {
  it('describes the palette with nothing selected at all', () => {
    // `emptySelection` is SL-6's state: FR-083's SP-1 is defined there, so the
    // palette is no less usable for it.
    const palette = describedWith(emptySelection())
    expect(iconsOf(palette).length).toBe(PALETTE_ENTRY_ROWS.length)
  })

  it('describes the palette with a single selected item', () => {
    // SP-2 of FR-083 is the one-selected case; SL-7b's order exists from the
    // first pick.
    expect(iconsOf(describedWith(pickedInTurn(TASK_A)))).toEqual(PALETTE_ENTRY_ROWS_GROUPED)
  })

  it('describes the palette while the pointer is outside the window', () => {
    // `ScreenSession.pointer` is `null` for exactly that. ⚠️ What the absent
    // pointer USED to be asked here -- whether the palette is drawn faint --
    // left with the three cases FR-053 moved across IF-9; what is left is that
    // a pointer nowhere at all takes nothing off the description.
    const palette = describedWith(emptySelection(), sessionOf({ pointer: null }))
    expect(iconsOf(palette).length).toBe(PALETTE_ENTRY_ROWS.length)
  })

  it('takes a corner outside the screen without changing what it holds', () => {
    // Nothing clamps `commandPaletteAt`: table T-206 holds no row for the
    // palette's place, so there is no bound to apply here.
    const at = { x: -500, y: -500 }
    const offScreen = describedWith(emptySelection(), sessionOf({ commandPaletteAt: at }))
    expect(iconsOf(offScreen)).toEqual(PALETTE_ENTRY_ROWS_GROUPED)
    expect(offScreen.at).toEqual(at)
  })
})
