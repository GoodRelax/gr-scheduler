// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-65   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// UF-65 fills exactly one member of `ScreenView` -- `commandPalette` -- and
// reads none of the others. It is the U-26 `Command Palette` of table T-103,
// with U-34's `Palette Groups` and `Palette Commands` inside it. The signature
// is the one the "nine unit contracts" section of `screen-renderer.ts` fixes;
// this file does not own it.
//
// ⭐ WHY THE PLACE ARRIVES INSTEAD OF BEING MEASURED. FR-053 has the person
// drag the palette, so where it floats is not one of ScreenRegions' rectangles.
// It comes in `ScreenSession.commandPaletteAt`, whose note records that nothing
// keeps it -- neither table T-206 nor table T-203 has a row for it.
//
// ⭐ WHY A CORNER AND NO EXTENT LEAVES HERE. FR-053 (MUST) has the palette's
// size follow its contents and (MUST NOT) forbids the settings from holding
// one, so there is no extent for this unit to carry and none to look for: how
// wide the entries came out is known only where they were laid out, which is
// past IF-9. ⚠️ This unit never judged a size and still does not; what changed
// is that `CommandPalette` stopped declaring a member for one.
//
// ⭐ WHY FAINTNESS IS NOT ANSWERED HERE. FR-053 (MUST) judges 「薄く透明に描く」
// by which PART the pointer is on, and the side that drew the parts is the only
// side that can say (Chapter 5.3, MUST, under table T-065; IF-9's third
// member). ⚠️ FR-053 also warns, in as many words, against writing the
// condition as a selection: SL-1 of table T-023c does not admit the palette, so
// such a condition would have no state that ever clears it. Neither reading is
// available to a `pure` unit that is handed a point and no rectangles, which is
// why `session.pointer` is not read below.
//
// ⭐ WHY THE ENTRIES ARE READ FROM THE GENERATED ROSTER RATHER THAN LISTED.
// FR-029 makes the roster of icons AND where each one is placed follow table
// T-109 (MUST), and that table's surface column IS the placement.
// `icon-roster.json` is that table generated into `src/`, so the rows are read
// from where they live instead of being re-typed here -- rule 03 section 1 of
// docs/development-rules, and exactly the drift `screen-renderer.ts` warns
// about on `AppHeaderItems.commands`.
//
// ⭐ WHY THE GROUPS ARE NOT ENUMERATED EITHER. FR-029's RATIONALE is the reason
// the palette is grouped at all -- the number of choices sets the time to
// decide -- and the group column of table T-109 is that grouping. Both the
// order of the groups and the order inside one are the table's own print order,
// kept rather than re-sorted (rule 03 section 4). ⚠️ That is not cosmetic here:
// the table returns to an earlier group three times near its end, so sorting by
// anything else would move entries out of the group FR-029 puts them in.
//
// ⛔ TWO OF ITS `Command Palette` ROWS ARE NOT ENTRIES. Table T-109 says so in
// its own entry column -- one row shows that the palette can be dragged, the
// other shows the keystroke that places what is armed -- and
// `screen-renderer.ts` names the same rows for the same reason on
// `CommandItem`. Both reach the screen as something other than a button: the
// first as `at`, which is what a drag moves, and the second as `armedText`.
// The STOP note by `NOT_BUTTON_ROWS` says what the roster cannot carry.
//
// ⚠️ NOTHING HERE JUDGES A WIDTH, so FR-093's estimate is never called -- the
// MUST FR-085 puts on whichever side does judge one does not reach this file.

import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
import type { Selection } from '../../entity/document-model/selection/selection'
import type {
  CommandItem,
  CommandPalette,
  DisplayLanguage,
  IconId,
  PaletteGroup,
  ScreenSession,
} from './screen-renderer'
import iconRoster from './icon-roster.json'
import displayWords from './display-words.json'

/** One row of the generated roster, so its shape is never written out here. */
type IconRosterRow = (typeof iconRoster.icons)[number]

/**
 * U-26 of table T-103, spelled the way table T-109's surface column spells it.
 *
 * ⭐ A settled name copied spelling and all (rule 03 section 1), not a name
 * invented here. It is the needle the roster is read with.
 */
const COMMAND_PALETTE = 'Command Palette'

/**
 * `FR-034`, as the authority column of table T-109 writes it.
 *
 * ⭐ THE JOIN IS THAT COLUMN, not the two row ids that carry the requirement
 * today. The column is the table's own statement of which requirement owns an
 * entry, so an entry added to the alignment later is refused by the same test
 * without this file being touched. ⛔ A pair of row ids would go stale in
 * silence, which is what rule 03 section 1 exists to stop.
 */
const ALIGN_REQUIREMENT = 'FR-034'

// STOP -- ⛔ NOT CARRIED BY THE GENERATED ROSTER: which rows of table T-109 are
// buttons. The table states it, but as prose inside the entry column rather
// than as a column of its own, so `icon-roster.json` has no field for it and
// the fact cannot be read the way the surface and the group are. Searched:
// table T-109 and the preamble of section 8 of `_assets/tbl-glossary.md`,
// FR-029, the note under figure F-019, `tools/generate_icon_roster.py` and
// `icon-roster.json` itself.
// ⭐ Smallest thing that cannot be wrong: name the two rows by their row id --
// the only join table T-109 admits, and the same join `screen-renderer.ts` uses
// where it names the rows that are not `CommandItem`s.
// ⚠️ This is the one place a change to that table does not reach on its own: a
// palette row marked the same way in future has to be added here by hand until
// the roster carries the fact as a field.
const NOT_BUTTON_ROWS: readonly string[] = ['IC-53', 'IC-54']

/**
 * What an entry says while the dictionary holds no word for its row.
 *
 * ⛔ NOT "SAY NOTHING". An empty cell of `display-words.json` says that no word
 * has been SETTLED for that row yet (PD-160), and this is exactly what UF-65
 * printed before the dictionary was wired.
 */
const NO_WORDS = ''

// ⭐ WHERE THE WORDS COME FROM. FR-038 (MUST) holds every word the screen prints
// as one dictionary per language, and Chapter 6.2 fixes its manuscript as
// `_source/display-words.json`; `display-words.json` beside this file is that
// manuscript generated into `src/`. ⛔ Its entries are keyed by the row of table
// T-109 -- the only join that table admits, since it deliberately has no English
// column -- so nothing here is minted and nothing is read off another column.
// ⚠️ Every one of the 176 cells is still empty (PD-160), so what actually
// reaches the screen today is the stand-in beside each lookup below. Reading
// `displayWords` no more makes this unit `semi-pure-a` than reading `iconRoster`
// does: both are module constants compiled into the program, not state read
// while running. Table T-075 fixes UF-65 as `pure`.

/**
 * The words of table T-109's rows, keyed by the row id, and the group names,
 * keyed by the FIRST row of the table that sits in the group.
 *
 * ⭐ `Map`s rather than a scan per entry: a description is built for every
 * frame, and rule 05 of docs/development-rules forbids a linear search on that
 * path (NFR-013).
 */
const WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))
const GROUP_NAMES_BY_FIRST_ROW = new Map(
  displayWords.paletteGroups.map((entry) => [entry.firstRow, entry]),
)

/**
 * The accessible name of one entry, in the display language (FR-038).
 *
 * ⛔ THE FALLBACK IS WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`. Those read
 * "the dictionary holds no word yet" and "the word is the empty string" as one
 * thing, and PD-160 is precisely the difference: an empty cell is UNSETTLED, not
 * an instruction to print nothing. The day a word is written this line stops
 * standing in without being edited.
 * ⚠️ A row the dictionary does not hold AT ALL is a second condition and is
 * answered separately, although with the same stand-in. It cannot happen while
 * `npm run gen:check` passes -- the generator builds its roster from table T-109
 * every run -- so what is guarded is a generated file edited by hand.
 *
 * @purity pure
 */
function entryLabel(icon: IconId, language: DisplayLanguage): string {
  const word = WORDS_BY_ROW.get(icon)?.label[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * The name of one group of the palette, in the display language (FR-038).
 *
 * ⛔ THE STAND-IN IS NOT THE EMPTY STRING HERE, which is where this member parts
 * company with `CommandItem.label`: table T-109's group column DOES hold a word,
 * and falling back to nothing would hide a group that has a name. So an unwritten
 * cell falls back to that column as the roster carries it -- what UF-65 printed
 * before the dictionary was wired. ⚠️ For a reader on `en` it is the Japanese
 * cell, which is the hole PD-160 closes and not a translation claimed here.
 *
 * ⛔ THE KEY IS DERIVED, NEVER WRITTEN DOWN. The specification gives a group no
 * id of its own, so the dictionary keys one by the first row of table T-109 that
 * sits in it -- and the caller finds that row by WALKING the roster in the
 * table's own order, so a re-ordering moves the key on both sides at once. A
 * roster of row ids typed here would be the copy rule 03 section 1 forbids.
 * ⚠️ One key of the dictionary is never asked for: the only palette row of its
 * group is one of the two `NOT_BUTTON_ROWS`, so no group is opened for it here.
 * That is the roster carrying a fact this file cannot read (see the STOP note on
 * those rows), not a lookup gone missing.
 *
 * @purity pure
 */
function groupName(groupCell: string, firstRow: string, language: DisplayLanguage): string {
  const word = GROUP_NAMES_BY_FIRST_ROW.get(firstRow)?.name[language]
  if (word === undefined) return groupCell
  return word === '' ? groupCell : word
}

/**
 * Whether an entry can be used. FR-029 (MUST) draws faint the one that cannot.
 *
 * ⭐ ONLY THE ALIGNMENT ENTRIES CAN BE REFUSED FROM HERE, and that is why this
 * unit is handed a `Selection` at all: SL-7b of table T-023c (MUST NOT) forbids
 * alignment on a selection that carries no order, and FR-034 lines the others
 * up against the last task that was picked -- so an ordered selection holding
 * at least one task is what both of them need.
 * ⚠️ Every other entry stays usable. FR-083's SP-1 to SP-4 give the shape
 * entries a meaning with a selection and without one, and what the remaining
 * entries turn on and off lives in `DocumentSettings`, which the fixed
 * signature does not carry.
 *
 * @purity pure
 */
function isEntryUsable(row: IconRosterRow, selection: Selection): boolean {
  if (!row.authority.includes(ALIGN_REQUIREMENT)) return true
  return selection.ordered && selection.items.some((item) => item.kind === 'task')
}

/**
 * One row of table T-109 as it stands in the palette.
 *
 * ⛔ `isPressed` IS FALSE FOR EVERY ENTRY, AND THAT IS A GAP RATHER THAN AN
 * ANSWER. What the toggling entries reflect is the drawing settings of table
 * T-202, which live in `DocumentSettings` -- not an argument of this unit. And
 * the arming entries cannot be matched against `ScreenState.armed`: table T-109
 * gives most of the milestone entries no row id to join on (they name the
 * previous row instead), and the spellings `Armed` carries for a shape and a
 * glyph are themselves unsettled (CR-172), so a join would compare against
 * values that do not exist yet.
 * ⚠️ Nothing requires the palette to show either of those states. FR-053's MUST
 * is that what is ARMED be readable, and `CommandPalette.armedText` is where
 * that is answered.
 *
 * @purity pure
 */
function commandItemFor(
  row: IconRosterRow,
  selection: Selection,
  language: DisplayLanguage,
): CommandItem {
  return {
    icon: row.rowId,
    isEnabled: isEntryUsable(row, selection),
    isPressed: false,
    label: entryLabel(row.rowId, language),
  }
}

/**
 * The groups table T-109 places on the palette, in that table's own order.
 *
 * ⭐ A group is opened where its name is first met and appended to afterwards,
 * so the groups come out in the order the table first names them and the
 * entries inside one come out in the order the table prints them -- without
 * this file knowing what either order is.
 *
 * ⛔ THE GROUPS ARE GATHERED ON THE TABLE'S OWN CELL AND NAMED ONLY AT THE END.
 * The cell is what says two entries are in one group; the word printed for it is
 * looked up per language, and two languages could spell two groups alike -- so
 * gathering on the printed word would fold two groups into one, or split one in
 * a language where the dictionary is only half filled in.
 * ⭐ The lookup key is the FIRST row of table T-109 that opened the group, which
 * is exactly the row this walk is standing on when it opens one. `groupName`
 * says why that is the key and why it may not be written down.
 *
 * ⚠️ Reading `iconRoster` does not make this `semi-pure-a`: it is a module
 * constant compiled into the program, not state read while running. Table T-075
 * fixes UF-65 as `pure`.
 *
 * @purity pure
 */
function paletteGroups(selection: Selection, language: DisplayLanguage): readonly PaletteGroup[] {
  const groups: {
    readonly cell: string
    readonly firstRow: IconId
    readonly commands: CommandItem[]
  }[] = []

  for (const row of iconRoster.icons) {
    if (!row.surfaces.includes(COMMAND_PALETTE)) continue
    if (NOT_BUTTON_ROWS.includes(row.rowId)) continue

    // ⚠️ Required by the type, and unreachable while the only groupless palette
    // row is one of the two refused above. A row that reaches the palette
    // without a group is dropped rather than given a group name invented here.
    const cell = row.group
    if (cell === null) continue

    const command = commandItemFor(row, selection, language)
    const opened = groups.find((group) => group.cell === cell)
    if (opened === undefined) groups.push({ cell, firstRow: row.rowId, commands: [command] })
    else opened.commands.push(command)
  }

  return groups.map((group) => ({
    name: groupName(group.cell, group.firstRow, language),
    commands: group.commands,
  }))
}

/**
 * The row of table T-023b the palette has armed. FR-053 (MUST) requires this to
 * be readable on the screen.
 *
 * STOP -- ⛔ THE DICTIONARY HAS NO SECTION FOR TABLE T-023b. FR-038's store
 * holds the entries of table T-109, the palette's group names, the headings of
 * the surfaces table T-103 names, the manners of table T-037, the two answers
 * NT-7 asks for, FR-072's three headings and the assignments of table T-023 --
 * and no arm of table T-023b is any of those. Searched: `display-words.json`
 * beside this file, `_source/display-words.json`, Chapter 6.2, FR-053 and table
 * T-023b. ⚠️ Widening the manuscript is a change to what FR-038 stores, which
 * this unit may not make.
 * ⭐ WHY A ROW ID STANDS IN. `armedText` is words rather than a figure because
 * AR-4 is not a shape and its entry has no figure drawn yet. The row id is the
 * join the specification itself prescribes, it names exactly the arms table
 * T-023b counts, and ⛔ it cannot be mistaken for a settled name the glossary
 * has not settled. UF-69 stands in the same way where its own row is unwritten.
 * ⛔ THE EMPTY STRING IS NOT AVAILABLE HERE, which is where this member parts
 * company with `CommandItem.label`: FR-053 (MUST) requires what is armed to be
 * READABLE, and an empty string would answer nothing at all. So the same
 * pending decision is answered with the strongest thing that exists.
 * ⭐ WHY A SWITCH AND NOT A TABLE. An arm added to table T-023b reaches
 * `ScreenState.armed`, and an exhaustive switch stops compiling when it does.
 * ⚠️ The shape or glyph inside two of these arms is not appended: table T-023b
 * does not tell them apart either -- its rows are the kinds of arm, not the
 * shapes -- and the spellings `Armed` carries for them are unsettled (CR-172).
 *
 * @purity pure
 */
function armedRow(armed: ScreenState['armed']): string {
  switch (armed.kind) {
    case 'none':
      return 'AR-1'
    case 'taskShape':
      return 'AR-2'
    case 'milestoneShape':
      return 'AR-3'
    case 'dependency':
      return 'AR-4'
    case 'commentBox':
      return 'AR-5'
    case 'highlightBox':
      return 'AR-6'
  }
}

/**
 * The floating palette as it stands this frame, or `null` while S-99e says it
 * is hidden.
 *
 * ⛔ `null` is the ONLY way this unit says "hidden". S-99e's default is showing
 * and nothing else stands for the other state, so an empty palette is never
 * used as a second spelling of it -- two spellings of absent need a rule for
 * which one wins, and no requirement states one. EP-11 of table T-076 reads the
 * closed palette the same way when the picture is exported.
 *
 * @purity pure
 */
export function commandPaletteFromScreenState(
  state: ScreenState,
  selection: Selection,
  session: ScreenSession,
): CommandPalette | null {
  if (!state.paletteShown) return null

  // ⭐ THE CORNER IS THE WHOLE OF THE PLACE, AND THAT IS SETTLED RATHER THAN
  // MISSING. What used to stand here was a STOP note looking for the palette's
  // size in tables T-202 / T-203 / T-206 and finding no row: FR-053 now says
  // (MUST) that the size follows the contents and (MUST NOT) that no table may
  // hold one, so there is nothing left to look for. ⚠️ The corner itself is
  // still unheld -- `ScreenSession.commandPaletteAt` records that absence -- and
  // it is passed through untouched, so nothing about the place is decided here.
  return {
    at: session.commandPaletteAt,
    groups: paletteGroups(selection, session.language),
    armedText: armedRow(state.armed),
  }
}
