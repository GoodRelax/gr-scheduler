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

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
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
 * IC-75 of table T-109 -- the minimise toggle FR-053 (MUST) puts on the grab
 * band, to the right of IC-53.
 *
 * ⛔ NOT IN `NOT_BUTTON_ROWS`: it IS a button, and a press on it turns S-200.
 * What keeps it out of `groups` is the 群 column -- table T-109 gives it none,
 * and `paletteGroups` drops a palette row with no group rather than inventing
 * one. ⭐ So the two facts are carried by two different columns of the same
 * table, and neither is guessed here.
 */
const MINIMISE_ROW: IconId = 'IC-75'

/**
 * IC-76 of table T-109 -- FR-102's record of the happenings and the frames,
 * started and stopped by one entrance.
 *
 * ⭐ THE ONE ROW THIS UNIT CAN ANSWER `isPressed` FOR, and the reason is that
 * FR-102 (MUST NOT) keeps its state OUT of the document: S-206 rides on
 * `ScreenSession`, which this unit is handed, while the toggles named in
 * `commandItemFor`'s note read `DocumentSettings`, which it is not.
 * ⛔ Named by row id because that is the only join table T-109 admits -- the
 * table states 「同じ入口で止める」 as prose in its entry column, the same shape
 * of gap `MINIMISE_ROW` and `NOT_BUTTON_ROWS` stand on.
 */
const INTERACTION_RECORD_ROW: IconId = 'IC-76'

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

// STOP -- ⛔ NOT CARRIED BY THE GENERATED ROSTER: which row of table T-109 works
// the list rather than sits in it. The table states it in the entry column as
// prose (「マイルストーンの図形の一覧を、同じ入口で開閉する」) rather than as a
// column of its own, so `icon-roster.json` has no field for it -- the same shape
// of gap as `NOT_BUTTON_ROWS`, and searched in the same places: table T-109,
// FR-053, FR-078, `tools/generate_icon_roster.py` and `icon-roster.json`.
// ⚠️ The authority column cannot tell it from the glyphs: table T-109 gives
// IC-50 `FR-078` too, so the join above reaches all nine rows.
// ⭐ Smallest thing that cannot be wrong: name it by row id -- the only join
// that table admits.
//
// ⭐ ONE ROW SINCE CR-273, AND THE TABLE IS WHAT CHOSE. Until 2026-08-28 this
// list held IC-50 AND IC-51, an opener and a folder, both offered on every
// frame -- and what that cost was measured that day: the shapes figure F-019
// drew for the two were IDENTICAL, element for element and attribute for
// attribute (compared in `icon-glyphs.json`, not read off the drawing), so the
// palette offered two entrances nobody could tell apart, one of which did
// nothing in each state. ⛔ It was not choosable HERE -- which shape the pair
// took was table T-109's -- and the table now says 「同じ入口で開閉する」, with
// FR-053 (MUST NOT) forbidding a second entrance. IC-11 and IC-60 were the
// precedent it followed.
const MILESTONE_LIST_CONTROL_ROWS: readonly string[] = ['IC-50']

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
 * at least TWO tasks is what both of them need.
 *
 * ⛔⛔ TWO AND NOT ONE, SINCE 2026-08-30. A single task IS the last one picked,
 * so it is its own anchor and there is nothing to line up: 表 T-233's `RS-34`
 * names that 場面 in as many words -- 「揃える相手の `Task` が選ばれていない」.
 * ⚠️ Measured with `some`: the entrance was drawn dark, the press was taken, and
 * neither the document nor a notice moved -- which FR-029 (MUST) forbids either
 * way round. ⭐ THE SAME READING IS MADE IN `input-command-translator.ts`, and
 * it has to be: the entrance a person sees faint must be the entrance that
 * tells them why.
 * ⚠️ Every other entry stays usable. FR-083's SP-1 to SP-4 give the shape
 * entries a meaning with a selection and without one, and what the remaining
 * entries turn on and off lives in `DocumentSettings`, which the fixed
 * signature does not carry.
 *
 * @purity pure
 */
function isEntryUsable(row: IconRosterRow, selection: Selection): boolean {
  if (!row.authority.includes(ALIGN_REQUIREMENT)) return true
  return (
    selection.ordered && selection.items.filter((item) => item.kind === 'task').length >= 2
  )
}

/**
 * The seven `Command Palette` rows FR-049 (MUST) turns into toggles over a
 * boolean row of table T-202, keyed by row id and pointing at the
 * `DocumentSettings` member table T-202 names for that row.
 *
 * ⛔ THIS JOIN ALREADY EXISTS ONCE, in `input-command-translator.ts` as
 * `VISIBLE_ELEMENT_BY_ENTRY` -- same row ids, same settings keys, built for the
 * opposite direction (a press turning a setting, where this one is a setting
 * painting a press). ⛔ IT CANNOT BE SHARED. That map is an internal unit of a
 * different Adapter component (InputCommandTranslator), and Chapter 5.3 with
 * LR-2/LR-3 of table T-061 forbids reaching into another component's internals
 * -- `input-command-translator.ts` itself records being refused by check 26b
 * for importing the settings type this same join needs, which is exactly the
 * fence that also blocks importing the map. ⚠️ SO THE DUPLICATION IS REAL AND
 * NOT AN OVERSIGHT: a row added to, removed from, or re-spelled in one map has
 * to be carried BY HAND into the other, and nothing here checks that it was.
 * ⛔ IC-4 -> `baselineVisible` is NOT repeated here: that entry lives on the App
 * Header (UF-62), not the Command Palette, and is answered there already.
 * ⛔ IC-45 to IC-49 are NOT toggles and are not in this map either -- FR-049
 * (MUST NOT) refuses to treat a many-valued row as one, and S-65 / S-66 are
 * those.
 */
const SETTINGS_KEY_BY_ROW: Readonly<Record<string, keyof DocumentSettings>> = {
  'IC-39': 'progressLineVisible',
  'IC-40': 'progressMarkerVisible',
  'IC-42': 'dateGridLinesVisible',
  'IC-43': 'groupGridLinesVisible',
  'IC-79': 'assigneeVisible',
  'IC-80': 'percentCompleteVisible',
  'IC-81': 'dependencyVisible',
}

/**
 * Whether one row's own boolean setting of table T-202 is ON, or `false` for
 * a row this component does not join to one (see `SETTINGS_KEY_BY_ROW`).
 *
 * @purity pure
 */
function isSettingsToggleOn(row: IconRosterRow, settings: DocumentSettings): boolean {
  const key = SETTINGS_KEY_BY_ROW[row.rowId]
  if (key === undefined) return false
  return settings[key] === true
}

/**
 * One row of table T-109 as it stands in the palette.
 *
 * ⭐ `isPressed` NOW READS TWO SOURCES, JOINED BY THE ROW. Table T-237's `EN-2`
 * says an entrance is filled when its own toggle is ON, and FR-049 makes the
 * seven rows of `SETTINGS_KEY_BY_ROW` exactly those toggles -- so this member
 * reads `DocumentSettings` for those seven and `ScreenSession` for IC-76, and
 * neither reading masks the other because no row is named by both.
 * ⛔ IC-45 to IC-49 are counted with neither: FR-049 (MUST NOT) refuses to
 * treat a many-valued row (S-65 / S-66) as a toggle, so both readings answer
 * `false` for them and this member does not either.
 * @provisional PD-417 -- an exclusive choice does NOT draw its own entrance
 * on here, because table T-237 holds no row meaning "this is the one now
 * chosen" and FR-029 (MUST) binds every fill to that table. ⛔ THE HEADER
 * DISAGREES: it draws S-59's pair on its own reading, so the same kind of
 * fact is drawn two ways. One of the two has to give.
 * ⚠️ Whether an exclusive
 * value draws its own entrance on is not settled anywhere and is not settled
 * here either -- the header does it for S-59's pair (IC-8 / IC-9) on its own
 * reading.
 * ⭐ THIS COULD NOT BE ANSWERED BEFORE 2026-08-31 BECAUSE THE ARGUMENT DID NOT
 * ARRIVE. The "nine unit contracts" section of `screen-renderer.ts` fixed
 * UF-65 at three arguments and none of them reached `DocumentSettings` -- the
 * user's ruling of 2026-08-31 (「提案通り」) is what widened that contract to
 * four and let this unit read table T-202 at all.
 * ⚠️ WHAT USED TO STAND HERE PUT THE ARMING ENTRIES IN THE SAME SENTENCE, and
 * that half went false on 2026-08-26: table T-109 grew a 構え column, so the
 * entry no longer has to be recognised by its row id, and `isArmed` below is
 * where the join lands. ⛔ `isPressed` did NOT become the place for it --
 * FR-053 (MUST NOT) forbids the armed entrance to be drawn as pressed, which
 * is why arming is never folded into this member.
 *
 * @purity pure
 */
function commandItemFor(
  row: IconRosterRow,
  selection: Selection,
  language: DisplayLanguage,
  armed: ArmedEntry,
  isRecording: boolean,
  settings: DocumentSettings,
): CommandItem {
  return {
    icon: row.rowId,
    isEnabled: isEntryUsable(row, selection),
    // FR-102 (MUST): whether the record is running has to be readable, and
    // IC-76 is the entrance that turns it -- so the entrance is what says so.
    // ⛔ ONE ROW AND NOT A LOOKUP: S-206 is the only state of table T-206
    // this unit is handed, so a table keyed by row id would hold one entry.
    // FR-049 / T-237 EN-2 (MUST): the seven toggles of `SETTINGS_KEY_BY_ROW`
    // are filled when their own setting is ON -- the two conditions never
    // overlap, since IC-76 is not a key of that map.
    isPressed:
      (row.rowId === INTERACTION_RECORD_ROW && isRecording) || isSettingsToggleOn(row, settings),
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
  isRecording: boolean,
  settings: DocumentSettings,
): readonly PaletteGroup[] {
  const groups: {
    readonly cell: string
    readonly firstRow: IconId
    readonly commands: CommandItem[]
  }[] = []

  for (const row of iconRoster.icons) {
    if (!row.surfaces.includes(COMMAND_PALETTE)) continue
    if (NOT_BUTTON_ROWS.includes(row.rowId)) continue

    // ⛔ A PALETTE ROW WITH NO 群 IS DROPPED, AND SINCE CR-273 THAT REACHES A
    // REAL ROW. IC-75 is a button table T-109 gives no group, because FR-053
    // (MUST) puts it on the grab band rather than in the list -- `minimise` in
    // `commandPaletteFromScreenState` is where it goes instead. ⚠️ Giving it a
    // group name here would mint one of the very names section 8 of
    // `_assets/tbl-glossary.md` refuses.
    const cell = row.group
    if (cell === null) continue

    const opened = groups.find((group) => group.cell === cell)
    const group = opened ?? { cell, firstRow: row.rowId, commands: [] }
    if (opened === undefined) groups.push(group)

    if (isMilestoneGlyphEntry(row) && !isMilestoneListOpen) continue
    group.commands.push(commandItemFor(row, selection, language, armed, isRecording, settings))
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
 * The roster's own row for IC-75.
 *
 * ⛔ READ OUT OF THE ROSTER AND NEVER BUILT HERE. `commandItemFor` answers from
 * the row's `arms` / `armsShape` and from the dictionary keyed by its id, so a
 * hand-made row would be this file holding a copy of table T-109. ⚠️ It throws
 * rather than falling back: the row is a MUST of FR-053, and a palette drawn
 * without its minimise toggle would be that requirement broken in silence.
 *
 * @purity pure
 */
function minimiseRow(): IconRosterRow {
  const row = iconRoster.icons.find((one) => one.rowId === MINIMISE_ROW)
  if (row === undefined) {
    throw new Error(`table T-109 no longer holds ${MINIMISE_ROW}, which FR-053 requires`)
  }
  return row
}

/**
 * S-206 of table T-206, as `ScreenSession` reports it.
 *
 * ⛔ THE ONE PLACE THE ABSENT MEMBER IS READ, and the reading is the one
 * `ScreenSession.isRecordingInteractions` states: absent means not recording.
 * ⚠️ Written out rather than left as `?? false` at each call so that a
 * second call cannot read it the other way round.
 *
 * @purity pure
 */
function isRecordingInteractions(session: ScreenSession): boolean {
  return session.isRecordingInteractions === true
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
 * ⭐ `settings` ARRIVES AS OF THE USER'S RULING OF 2026-08-31 (「提案通り」),
 * WIDENING THE CONTRACT `screen-renderer.ts` FIXES FROM THREE ARGUMENTS TO
 * FOUR. Table T-237's `EN-2` has an entrance filled when its own toggle of
 * table T-202 is ON, and `commandItemFor` is where that reading is made --
 * this unit only has to forward the value it is now handed, the way UF-62 to
 * UF-64 already do for their own settings-reading members.
 *
 * @purity pure
 */
export function commandPaletteFromScreenState(
  state: ScreenState,
  settings: DocumentSettings,
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
    // FR-053 (MUST): the minimise toggle rides on the band, in both states.
    minimise: commandItemFor(
      minimiseRow(),
      selection,
      session.language,
      armedEntry(state.armed),
      // ⛔ NEVER THE ONE THIS ARGUMENT IS ABOUT: IC-75 is not IC-76, so the
      // answer is false whatever the record is doing. It is written as the
      // session's own value rather than as `false` so that the two calls read
      // the same, and `commandItemFor` is the one place that names the row.
      isRecordingInteractions(session),
      // IC-75 is not a key of `SETTINGS_KEY_BY_ROW` either, so this reads as
      // false whatever `settings` holds -- passed through for the same reason
      // the line above is: one place names the row, not two readings of it.
      settings,
    ),
    isMinimised: session.isPaletteMinimised,
    // ⛔ MINIMISED WITHDRAWS THE ENTRIES AND NOTHING ELSE. FR-053 (MUST) keeps
    // the grab band and the armed reading through it -- without the first the
    // palette could never be moved again (GR-19), and without the second the
    // same requirement's 「いま構えているものが画面上で読めること」 would hold
    // everywhere except here. ⚠️ An empty list is not how this side says
    // "hidden": `null` is (see this function's own note), and minimised is a
    // shape of being shown.
    groups: session.isPaletteMinimised
      ? []
      : paletteGroups(
          selection,
          session.language,
          session.isMilestoneListOpen,
          armedEntry(state.armed),
          isRecordingInteractions(session),
          settings,
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
