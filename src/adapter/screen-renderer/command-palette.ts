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
// ⭐ WHY A BAND HEIGHT LEAVES BESIDE THE CORNER AND IS NOT AN EXTENT EITHER.
// GR-19 of table T-023d -- the FIRST row of that table, which its preamble
// (MUST) makes the highest priority -- lays a grab band along the palette's top
// edge, and S-135a states its height and nothing else. A height is not a size:
// it says how far down the band reaches from the corner that already arrives,
// and says nothing about how wide the palette came out. ⭐ The value arrives
// generated from S-135a, the way rule 03 section 1 requires.
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
// ⛔ THE GROUP'S CAPTION IS NOT PRINTED ON THE PALETTE (FR-053, MUST NOT), AND
// THE BOUNDARY IS A RULE INSTEAD (MUST). ⚠️ WHAT STOPS IS THE PRINTING AND
// NOTHING ELSE: table T-109's group column still decides the ORDER above, the
// dictionary still holds the words because the help (FR-036) lists the
// entrances by word, and `PaletteGroup.name` is still filled below.
//
// ⭐ THE RULE IS DRAWN BY THE SURFACE, NOT DESCRIBED HERE, and that is the
// judgement this unit made rather than a rule it was handed. S-143 of table
// T-206 states the rule's thickness and its side gaps, and its own note says
// the rule is 「線であって文字ではない」 and 「図形でもない」 -- so it carries no
// word to translate, no row of table T-109 and no shape of figure F-019.
// Nothing can rest on it, be armed by it or be reported for it, which is what
// parts it from `grabBandHeight`: GR-19's band is described here because a
// press and a tooltip land ON it (`ScreenPart.entry`), and a decoration that
// nothing points at is the drawing side's alone (Chapter 5.3, under table
// T-065). ⭐ The surface needs nothing new from this unit to place it: `groups`
// below already IS the boundary list, one element per group.
// ⚠️ WHAT USED TO STAND HERE NAMED TWO THINGS THE MUST NOT WAS SAID TO BE
// WAITING ON, AND BOTH WERE MEASURED FALSE ON 2026-08-27. `dom-screen-surface.ts`
// had already stopped printing `PaletteGroup.name` -- the caption node went on
// 2026-08-25 and the word that stands on the palette is the arm's, not a
// group's. And S-143 did reach `src/`: it stood in the generated block at the
// foot of THIS file, beside S-135a, where nothing read it because the rule is
// the drawing side's. ⭐ It is now routed to that side instead, so
// the boundary FR-053 (MUST) asks for is drawn and no row of table T-206
// arrives here that this unit does not use.
//
// ⛔ THE EIGHT MILESTONE SHAPES ARE NOT OFFERED UNTIL THE LIST IS OPEN
// (FR-053, MUST). `ScreenSession.isMilestoneListOpen` is that state, which
// S-142 of table T-206 records the document does not keep and the shell holds.
// ⚠️ Folding them changes WHICH ENTRIES a group holds and never which groups
// there are or what a group is called -- see `paletteGroups`.
//
// ⛔ TWO OF ITS `Command Palette` ROWS ARE NOT ENTRIES. Table T-109 says so in
// its own entry column -- one row shows that the palette can be dragged
// (IC-53), the other shows what is armed (IC-54) -- and `screen-renderer.ts`
// names the same rows for the same reason on `CommandItem`. Both reach the
// screen as something other than a button: the first as the grab band GR-19
// puts along the top edge -- `grabBandHeight`, with `at` for the corner a drag
// moves -- and the second as `armedText`.
// ⚠️ WHAT USED TO STAND HERE CALLED IC-54 「the keystroke that places what is
// armed」, which table T-109 does not say and table T-036 refutes: SK-1 states
// in as many words that there is no keyboard path to placing a shape.
// The STOP note by `NOT_BUTTON_ROWS` says what the roster cannot carry.
//
// ⭐ IC-54 IS NOT THE WHOLE OF WHAT FR-053 ASKS FOR, and the other half is on
// the ENTRIES. That requirement (MUST) also has the armed entrance told apart
// from the ones that are not, and says which entrance is which arm is held by
// table T-109's 構え column -- `arms` in the generated roster. `isArmed` below
// is that join. ⛔ Not `isPressed`: the same requirement (MUST NOT) refuses to
// have it drawn as a pressed button, on the ground that IC-54 says it is none.
// ⛔ THAT COLUMN IS HALF THE JOIN AND NOT THE WHOLE OF IT. It names a KIND of
// arm (table T-023b), so AR-2 stands on four rows and AR-3 on eight, and a
// comparison on it alone marks four entrances -- or eight -- where the
// requirement asks for THE armed one. ⭐ The other half is `armsShape`, which
// the roster derives from table T-012 and `_source/erd.json` the way the arm
// column itself is derived from table T-109; `armedEntry` below carries the
// pair. ⚠️ It could not be read from `input-command-translator.ts`, which holds
// the same map by hand: that file is another component's internal unit, and
// Chapter 5.3 (MUST NOT) with LR-3 of table T-061 is what sent the fact through
// the roster in the first place.
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
 * `FR-078`, as the authority column of table T-109 writes it -- the requirement
 * that owns the milestone glyph entrances FR-053 folds away.
 *
 * ⭐ THE JOIN IS THAT COLUMN, for the reason `ALIGN_REQUIREMENT` gives: it is
 * the table's own statement of which requirement owns an entry, so a ninth
 * shape added to SH-5 of table T-012 and to table T-109 folds with the eight
 * without this file being touched. ⛔ Eight row ids typed here would go stale in
 * silence, and `input-command-translator.ts` already carries a list of exactly
 * those eight for a purpose this unit does not share (what each one arms).
 */
const MILESTONE_GLYPH_REQUIREMENT = 'FR-078'

// STOP -- ⛔ NOT CARRIED BY THE GENERATED ROSTER: which rows of table T-109 work
// the list rather than sit in it. The table states it in the entry column as
// prose (「マイルストーンの図形の一覧を開く」 / 「同・畳む」) rather than as a
// column of its own, so `icon-roster.json` has no field for it -- the same shape
// of gap as `NOT_BUTTON_ROWS`, and searched in the same places: table T-109,
// FR-053, FR-078, `tools/generate_icon_roster.py` and `icon-roster.json`.
// ⚠️ The authority column cannot tell them apart: table T-109 gives IC-50 and
// IC-51 `FR-078` too, so the join above reaches all ten rows.
// ⭐ Smallest thing that cannot be wrong: name the two by row id -- the only
// join that table admits.
// ⛔ BOTH ARE OFFERED ON EVERY FRAME, open or folded. Table T-109 carries them
// as two rows rather than one control in two states, and neither that table nor
// FR-053 says to withdraw either one -- so withdrawing the opener while the list
// is open, or the folder while it is closed, would be a rule invented here.
const MILESTONE_LIST_CONTROL_ROWS: readonly string[] = ['IC-50', 'IC-51']

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
// manuscript generated into `src/`. ⛔ Its entries are keyed by the row of the
// table that names them -- table T-109 for the entries and the groups, table
// T-023b for the arms -- which is the only join those tables admit, since they
// deliberately have no English column. So nothing here is minted and nothing is
// read off another column.
// ⚠️ WHAT USED TO STAND HERE SAID ALL 176 CELLS WERE STILL EMPTY. PD-160
// records that the count and the claim both went stale: the manuscript now
// holds a word in both languages for every row these three lookups ask for, so
// the stand-ins beside them are reached only by a generated file edited by
// hand. ⛔ No count is written here, for the reason the same row gives -- a
// number copied out of the generator goes stale in silence. Reading
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
 * The words of table T-023b's rows, keyed by the row id.
 *
 * ⭐ THE ROW ID IS THE JOIN HERE TOO, and the table says so itself: its closing
 * rule holds the arm's word the way table T-233's closing rule holds a reason's
 * -- the dictionary keeps it and it is looked up by row. ⛔ So the words of the
 * six arms are not repeated in this file.
 *
 * ⭐ A `Map` rather than a scan, for the reason `WORDS_BY_ROW` is one: a
 * description is built for every frame and rule 05 of docs/development-rules
 * forbids a linear search on that path (NFR-013).
 */
const ARM_WORDS_BY_ROW = new Map(displayWords.arms.map((entry) => [entry.rowId, entry]))

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
 * and the empty string would throw away the one word there is. So an unwritten
 * cell falls back to that column as the roster carries it -- what UF-65 printed
 * before the dictionary was wired. ⚠️ For a reader on `en` it is the Japanese
 * cell, which is the hole PD-160 closes and not a translation claimed here.
 *
 * ⚠️ WHY A WORD IS STILL RESOLVED FOR A CAPTION NOBODY PRINTS. What used to
 * stand here said that falling back to nothing would HIDE a group that has a
 * name; FR-053 (MUST NOT) stopped the palette printing the caption at all on
 * 2026-08-25, so that reason is gone and the note was the false kind. ⛔ The
 * word itself is not: FR-053 says in as many words that the group's word stays,
 * because the help (FR-036) lists the entrances by word, and `PaletteGroup.name`
 * is the member that carries it. ⚠️ Nothing in `src/` reads it for the help
 * yet -- `HelpModal.entries` records that gap on its own side.
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
 * T-202, which live in `DocumentSettings` -- not an argument of this unit.
 * ⚠️ WHAT USED TO STAND HERE PUT THE ARMING ENTRIES IN THE SAME SENTENCE, and
 * that half went false on 2026-08-26: table T-109 grew a 構え column, so the
 * entry no longer has to be recognised by its row id, and `isArmed` below is
 * where the join lands. ⛔ `isPressed` did NOT become the place for it --
 * FR-053 (MUST NOT) forbids the armed entrance to be drawn as pressed.
 *
 * @purity pure
 */
function commandItemFor(
  row: IconRosterRow,
  selection: Selection,
  language: DisplayLanguage,
  armed: ArmedEntry,
): CommandItem {
  return {
    icon: row.rowId,
    isEnabled: isEntryUsable(row, selection),
    isPressed: false,
    // FR-053 (MUST): 「どの入口がどの構えかは 表 T-109 の `構え` の欄が持つ」,
    // and (MUST) the armed entrance is told apart from the ones that are not.
    // ⛔ THE COLUMN ALONE IS NOT THAT JOIN, which is why the second half is
    // here. It names a KIND of arm: AR-2 stands on four rows and AR-3 on
    // eight, so arming one task shape used to mark four entrances and one
    // milestone glyph eight. `armsShape` of the roster is which shape of the
    // kind, and the pair is 1-to-1.
    // ⛔ Never `row.arms === null` folded in as a third condition: `armedEntry`
    // answers AR-1 while nothing is armed, and no row of the roster carries
    // that -- so the two comparisons are already the whole rule.
    // ⚠️ An arm carrying a spelling no entrance arms marks nothing, and that is
    // the right answer rather than a hole: `Armed` types the shape as a bare
    // string, so 'milestone' can reach here through AR-2 while table T-109
    // gives that shape no palette row of its own -- FR-078's eight glyphs are
    // where a milestone is armed from (AR-3).
    isArmed: row.arms === armed.row && row.armsShape === armed.shape,
    label: entryLabel(row.rowId, language),
  }
}

/**
 * One of the eight milestone shapes FR-053 (MUST) keeps off the palette until
 * the list is open -- IC-27 to IC-34 as table T-109 stands, reached by the
 * requirement that owns them rather than by their row ids.
 *
 * ⚠️ The two rows that WORK the list carry the same requirement and are not
 * shapes, which is the whole of what `MILESTONE_LIST_CONTROL_ROWS` subtracts.
 *
 * @purity pure
 */
function isMilestoneGlyphEntry(row: IconRosterRow): boolean {
  if (!row.authority.includes(MILESTONE_GLYPH_REQUIREMENT)) return false
  return !MILESTONE_LIST_CONTROL_ROWS.includes(row.rowId)
}

/**
 * The groups table T-109 places on the palette, in that table's own order.
 *
 * ⭐ A group is opened where its name is first met and appended to afterwards,
 * so the groups come out in the order the table first names them and the
 * entries inside one come out in the order the table prints them -- without
 * this file knowing what either order is.
 *
 * ⛔ A GROUP IS OPENED BY A ROW THAT IS FOLDED AWAY, AND THAT IS DELIBERATE. The
 * key a group's word is held under is the FIRST palette row of table T-109 that
 * sits in it (`groupName`), and that row is the table's fact -- not the drawing's
 * -- so opening the group only on rows that survive the fold would move the key
 * whenever a milestone shape happened to stand first, and the lookup would miss
 * in one of the two states and not the other.
 * ⚠️ Which is why a group can now come out empty where it never could before,
 * and empty groups are dropped at the end: an empty one is a boundary with
 * nothing on one side of it, and the surface draws a rule per boundary (S-143).
 * ⭐ Unreachable while the group the shapes sit in also holds IC-23 -- a guard
 * against a hole this walk opened, not a case the table produces today.
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
function paletteGroups(
  selection: Selection,
  language: DisplayLanguage,
  isMilestoneListOpen: boolean,
  armed: ArmedEntry,
): readonly PaletteGroup[] {
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

    const opened = groups.find((group) => group.cell === cell)
    const group = opened ?? { cell, firstRow: row.rowId, commands: [] }
    if (opened === undefined) groups.push(group)

    if (isMilestoneGlyphEntry(row) && !isMilestoneListOpen) continue
    group.commands.push(commandItemFor(row, selection, language, armed))
  }

  return groups
    .filter((group) => group.commands.length > 0)
    .map((group) => ({
      name: groupName(group.cell, group.firstRow, language),
      commands: group.commands,
    }))
}

/**
 * What the palette has armed, as the roster spells it: the row of table T-023b,
 * and -- where that row stands against more than one entrance -- which shape or
 * glyph of it.
 *
 * ⭐ TWO MEMBERS BECAUSE THE ARM COLUMN NAMES A KIND. Table T-109's 構え column
 * gives AR-2 to four rows and AR-3 to eight, so the row alone cannot say WHICH
 * entrance is armed; `armsShape` of the generated roster is the other half, and
 * the two together are a 1-to-1 join. ⛔ `shape` is `null` for the arms that
 * stand against one entrance each (AR-4 / AR-5 / AR-6) and for AR-1, which
 * stands against none -- so the roster's own `null` matches them and no second
 * condition is needed.
 */
interface ArmedEntry {
  /** A row of table T-023b, AR-1 to AR-6. */
  readonly row: string
  /** A `TaskVisual.shapeKind` or `TaskVisual.milestoneGlyph` spelling. */
  readonly shape: string | null
}

/**
 * The row of table T-023b the palette has armed, with the shape inside it --
 * the KEY the word is looked up by, and never itself a thing the screen prints.
 *
 * ⭐ WHY A ROW ID AT ALL. The closing rule of table T-023b holds the arm's word
 * the way table T-233's closing rule holds a reason's: the dictionary keeps it
 * and it is drawn out by row. So the row is what this unit resolves, and
 * `armedWord` below turns it into words -- ⛔ the row id itself must not reach
 * the screen (table T-023b, MUST NOT), which is what UF-65 printed until the
 * manuscript grew a section for these six rows.
 * ⭐ WHY A SWITCH AND NOT A TABLE. An arm added to table T-023b reaches
 * `ScreenState.armed`, and an exhaustive switch stops compiling when it does --
 * whereas a lookup keyed on `kind` would go on answering for five of six.
 * ⚠️ WHAT USED TO STAND HERE SAID THE SHAPE COULD NOT BE APPENDED, on the
 * ground that the spellings `Armed` carries for a shape and a glyph were
 * unsettled (CR-172). ⛔ MEASURED FALSE 2026-08-27: `_source/erd.json` settles
 * all thirteen -- five for `TaskVisual.shapeKind` and eight for
 * `TaskVisual.milestoneGlyph` -- and the roster now carries which of them each
 * entrance arms. ⭐ The row and the shape are two members and never one string:
 * a join written as one key would have to invent a separator, and the two come
 * from two columns of two tables.
 *
 * @purity pure
 */
function armedEntry(armed: ScreenState['armed']): ArmedEntry {
  switch (armed.kind) {
    case 'none':
      return { row: 'AR-1', shape: null }
    case 'taskShape':
      return { row: 'AR-2', shape: armed.shapeKind }
    case 'milestoneShape':
      return { row: 'AR-3', shape: armed.glyph }
    case 'dependency':
      return { row: 'AR-4', shape: null }
    case 'commentBox':
      return { row: 'AR-5', shape: null }
    case 'highlightBox':
      return { row: 'AR-6', shape: null }
  }
}

/**
 * What the palette has armed, in words, in the display language (FR-038).
 * FR-053 (MUST) requires this to be readable on the screen.
 *
 * ⛔ THE ROW ID IS NOT THE FALL-BACK, which is where this member parts company
 * with `assignmentText` in `tooltips.ts`: table T-023 lets its row id stand in
 * for an assignment, and the closing rule of table T-023b forbids the row id to
 * be printed at all (MUST NOT). So the key cannot double as the stand-in here
 * the way it does there.
 * ⛔ TWO CONDITIONS AND NOT ONE, WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`,
 * for the reason `entryLabel` gives above: a row the dictionary does not hold
 * at all and a cell it holds empty are different things.
 * ⚠️ Neither can happen while `npm run gen:check` passes -- the generator builds
 * its roster from table T-023b every run and every cell of it is written -- so
 * what both branches guard is a generated file edited by hand.
 * ⛔ NO FALL-BACK ROW EXISTS TO GO TO. Table T-233 gives an unanswerable reason
 * RS-15 and table T-234 gives a question QN-8; table T-023b gives an arm
 * nothing of the kind, and inventing a seventh row here would be the mint rule
 * 03 section 1 forbids.
 * ⛔ SO WHAT AN ARM WITH NO WORD SAYS IS NOT SETTLED. FR-053 (MUST) wants
 * words, table T-023b (MUST NOT) refuses the row id, and no third string is
 * named anywhere -- the empty string stands in as the one thing neither rule
 * forbids, and it is the same stand-in `entryLabel` makes.
 *
 * @provisional PD-221
 * @purity pure
 */
function armedWord(armed: ScreenState['armed'], language: DisplayLanguage): string {
  const word = ARM_WORDS_BY_ROW.get(armedEntry(armed).row)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
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
  // ⭐ THE BAND IS DESCRIBED WHENEVER THE PALETTE IS. GR-19 puts no condition on
  // it -- it is the palette's top edge, not a state -- so it leaves here on the
  // same frames the palette does and disappears with it. ⚠️ What stood here said
  // its height was the one thing still missing and named a `GRAB_BAND_HEIGHT`
  // that this file has never held: S-135a arrives generated at the foot of the
  // file and is read two lines below.
  return {
    at: session.commandPaletteAt,
    // GR-19 of table T-023d, whose height S-135a states. ⭐ Read where the
    // generated block stands, at the foot of this file, rather than into a
    // module constant above it -- that would read it before it is assigned.
    grabBandHeight: NOT_STORED_COMMAND_PALETTE_SIZES['S-135a'],
    // FR-053 (MUST): the eight milestone shapes stay out until the list is
    // open. S-142 of table T-206 is the state, and the shell holds it.
    // ⭐ The armed ROW AND SHAPE go down with them, not the words: FR-053
    // (MUST) also has the armed ENTRANCE told apart from the others, and the
    // roster's `arms` and `armsShape` fields are what each entry is compared
    // against (`isArmed`).
    groups: paletteGroups(
      selection,
      session.language,
      session.isMilestoneListOpen,
      armedEntry(state.armed),
    ),
    // FR-053 (MUST): what is armed has to be readable. The words come from
    // FR-038's dictionary, keyed by the row of table T-023b -- ⛔ never the row
    // id, which that table's closing rule forbids the screen to carry.
    armedText: armedWord(state.armed, session.language),
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands instead of being handed
 * it: the contract in screen-renderer.ts fixes UF-61 at three
 * arguments, and FR-051 (MUST NOT) forbids a setting to hold the
 * value either -- so there is no door to pass it through. ⛔ It is
 * still not a document setting and must not become one.
 */
export const NOT_STORED_COMMAND_PALETTE_SIZES: {
  /** S-135a, in px */
  readonly 'S-135a': number
} = {
  'S-135a': 24,
}
// </generated>
