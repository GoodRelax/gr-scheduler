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
// ⭐ WHY FAINTNESS IS NOT WRITTEN AS A SELECTION. FR-053 warns against exactly
// that, in as many words: SL-1 of table T-023c does not admit the palette, so a
// condition written on the selection would have no state that ever clears it.
// `isPointerOver` is the condition FR-053 does state.
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
// first as `box`, which is what a drag moves, and the second as `armedText`.
// The STOP note by `NOT_BUTTON_ROWS` says what the roster cannot carry.
//
// ⚠️ NOTHING HERE JUDGES A WIDTH, so FR-093's estimate is never called -- the
// MUST FR-085 puts on whichever side does judge one does not reach this file.

import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
import type { Selection } from '../../entity/document-model/selection/selection'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { CommandItem, CommandPalette, PaletteGroup, ScreenSession } from './screen-renderer'
import iconRoster from './icon-roster.json'

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
 * ⛔ NO WORDS HAVE BEEN SETTLED. See the STOP note below: this stands for
 * "nothing to say yet", not for "say nothing".
 */
const NO_WORDS = ''

// STOP -- ⚠️ NOT DECIDED BY THE SPECIFICATION: the words. `CommandItem.label`
// is declared to be in the display language and carries both the accessible
// name and the explanation EZ-2 of table T-040 shows -- and FR-029 (MUST) makes
// an entry that cannot be used give its REASON through that explanation, so the
// words are not optional there. No table holds a translated string. Searched:
// FR-029, FR-038, FR-053, FR-083, table T-040, table T-103 (settled names,
// whose Japanese column is prose about the name rather than screen text), table
// T-109 (which states that it has no English column, and why) and
// `_assets/tbl-settings.md` (no row for any wording). None of the three
// arguments carries any either: `ScreenSession` holds `language`, which is the
// choice and not the text.
// ⭐ Smallest thing that cannot be wrong: the empty string, which says that no
// words have been settled -- what is true of this build. ⛔ Anything written
// here would settle wording the glossary has not, in the one component that is
// forbidden to mint names. UF-66 answers the same hole the same way, and UF-62
// is what put the hole on the list.
//
// @provisional PD-4

/**
 * Half-open on both axes, as R3.4 of the review standard asks: a point on the
 * right or bottom edge belongs to whatever comes next.
 *
 * ⚠️ `screen-regions.ts` holds the same three lines and keeps them private --
 * PI-35 declares four members and this is not one of them, and Chapter 5.3 lets
 * nothing outside a folder read past its public entry. The copy is forced
 * rather than chosen; R3.4 is what keeps the two from drifting apart in meaning.
 *
 * @purity pure
 */
function rectHoldsPoint(area: ScreenRect, x: number, y: number): boolean {
  return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height
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
function commandItemFor(row: IconRosterRow, selection: Selection): CommandItem {
  return {
    icon: row.rowId,
    isEnabled: isEntryUsable(row, selection),
    isPressed: false,
    label: NO_WORDS,
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
 * ⚠️ `name` is the group column carried as it stands, and NOT a translation:
 * the generator's own note is that the manuscript's wording may travel as data,
 * while table T-109 states that it has no English column and why. ⛔ For a
 * reader on `en` there is therefore nothing to give -- the same hole the STOP
 * note on `NO_WORDS` describes, and the reason no English name is minted here.
 * ⭐ The answer differs from that note's for one reason: a value DOES exist for
 * this member, so the manuscript's own word is carried rather than an empty one
 * that would hide a group that has a name.
 *
 * ⚠️ Reading `iconRoster` does not make this `semi-pure-a`: it is a module
 * constant compiled into the program, not state read while running. Table T-075
 * fixes UF-65 as `pure`.
 *
 * @provisional PD-4
 * @purity pure
 */
function paletteGroups(selection: Selection): readonly PaletteGroup[] {
  const groups: { readonly name: string; readonly commands: CommandItem[] }[] = []

  for (const row of iconRoster.icons) {
    if (!row.surfaces.includes(COMMAND_PALETTE)) continue
    if (NOT_BUTTON_ROWS.includes(row.rowId)) continue

    // ⚠️ Required by the type, and unreachable while the only groupless palette
    // row is one of the two refused above. A row that reaches the palette
    // without a group is dropped rather than given a group name invented here.
    const name = row.group
    if (name === null) continue

    const command = commandItemFor(row, selection)
    const opened = groups.find((group) => group.name === name)
    if (opened === undefined) groups.push({ name, commands: [command] })
    else opened.commands.push(command)
  }

  return groups
}

/**
 * The row of table T-023b the palette has armed. FR-053 (MUST) requires this to
 * be readable on the screen.
 *
 * ⭐ WHY A ROW ID AND NOT WORDS. `armedText` is words rather than a figure
 * because AR-4 is not a shape and its entry has no figure drawn yet -- and no
 * words exist (the STOP note on `NO_WORDS`). The row id is the join the
 * specification itself prescribes, it names exactly the arms table T-023b
 * counts, and ⛔ it cannot be mistaken for a settled name the glossary has not
 * settled. UF-69 answers the same hole the same way.
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
 * @provisional PD-4
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

  // STOP -- ⛔ NOT HELD ANYWHERE: how big the palette is. `CommandPalette.box`
  // is a rectangle and only its corner arrives, in `ScreenSession`, whose own
  // note records that table T-206 and table T-203 have no row for even that
  // much. Searched: FR-053, FR-029, tables T-202 / T-203 / T-206 and the whole
  // of `_assets/tbl-settings.md` (its only palette row is S-99e, the showing
  // state), table T-103 and table T-109.
  // ⭐ Smallest thing that cannot be wrong: no extent at all. ⚠️ It costs the
  // member below with it -- a rectangle of no extent holds no point, so
  // `isPointerOver` stays false while the size is missing, and the palette is
  // drawn faint. That is the state FR-053 names for the pointer being off it,
  // so what is lost is the brightening and never the requirement. ⛔ A guessed
  // width and height would be worse: they would brighten it in the wrong places
  // and read as a measurement.
  const NO_EXTENT = 0

  const box: ScreenRect = {
    x: session.commandPaletteAt.x,
    y: session.commandPaletteAt.y,
    width: NO_EXTENT,
    height: NO_EXTENT,
  }
  const pointer = session.pointer

  return {
    box,
    isPointerOver: pointer !== null && rectHoldsPoint(box, pointer.x, pointer.y),
    groups: paletteGroups(selection),
    armedText: armedRow(state.armed),
  }
}
