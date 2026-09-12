// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-66   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// UF-66 fills exactly one member of `ScreenView` -- `openModal` -- and reads
// none of the others. The signature is the one the "nine unit contracts"
// section of `screen-renderer.ts` fixes; this file does not own it.
//
// ⭐ WHAT A SURFACE IS, this unit does not decide: IN-4 of table T-028 defines
// one by what happens to it -- a surface is what the FIRST level of Esc closes.
// S-99g of table T-206 holds which one is open and holds exactly ONE, so at
// most one is ever described and `null` is the whole answer while none is.
// ⛔ `null` is also the ONLY way this unit says "none is open". S-99g's default
// is that none is open and nothing else stands for it, so a surface carrying an
// empty name is passed on as a surface rather than quietly turned into a second
// spelling of "closed" -- two spellings of absent need a rule for which wins,
// and no requirement states one.
//
// ⭐ WHY THE NAME IS CARRIED AND NEVER CHOSEN. The UF-66 row of table T-075
// names the requirements that open a surface -- FR-036 (help), FR-074 (the
// document's basic information), FR-099 (the roster of resources), FR-088 (the
// calendar) and FR-068 (the document handed to an AI). Table T-103 has settled
// a name for the first and last of those together (U-30 `Help Modal` / `AI
// Export Modal`) and for FR-099's (U-49 `Resource Roster`), and for neither of
// the others. ⛔ So no name is minted for them here. `ScreenState.surface`
// travels through untouched, and a settled name appears below only where a rule
// has to be keyed on one.
//
// ⭐ WHY THE ENTRIES ARE READ FROM THE GENERATED ROSTER RATHER THAN LISTED.
// FR-029 makes the roster of icons AND where each icon is placed follow table
// T-109 (MUST), and that table's surface column IS the placement.
// `icon-roster.json` is that table generated into `src/`, so the placement is
// read from where it lives instead of being re-typed here -- rule 03 section 1
// of docs/development-rules, and exactly the drift `screen-renderer.ts` warns
// about on `AppHeaderItems.commands`.
// ⚠️ ONE ENTRY IS NOT IN THAT COLUMN, and it is the one the table itself
// excepts: IC-21's own note calls it the only entry placed in two places, and
// FR-038 (MUST) says where the second one goes -- inside the help. FR-029
// repeats that this is its single exception. So the roster settles the
// placement of every row but that one, and FR-038 settles that one.
//
// ⭐ THREE SURFACES HAVE SOMEWHERE TO PUT WHAT THEY SHOW. `OpenModal` is a
// union discriminated on `surface`: the `Resource Roster` (U-49) member carries
// the roster FR-099 asks for, the `Export Chooser` (U-54) member carries the
// formats FR-096 asks for, and the `AI Export Modal` (U-30) member carries the
// document FR-068 asks for -- and this unit fills all three below.
// ⚠️ The help (U-30 `Help Modal`) comes back with one member beyond the three
// every surface has -- `language`, which FR-038 (MUST) makes readable before the
// toggle is pressed -- but not with the four `HelpModal` also declares, so what
// it returns still lands in the union's catch-all member rather than in
// `HelpModal`. The three remaining surfaces come back with the three alone. The
// STOP note in the body says what each of them would need.
//
// ⭐ THIS UNIT IS WHERE THE ROSTER OF SURFACES LIVES. `ScreenState` says so in
// as many words on `OpenSurface`: S-99g carries the name and leaves which ones
// there are to UF-66. So a surface table T-103 has settled a name for is named
// below, and one it has not is carried through as it arrived.
//
// ⭐ THE PAIR OF CHOOSERS IS NOT A PAIR IN WHAT IT CARRIES, although the
// glossary calls U-54 `Export Chooser` and U-56 `Open Chooser` each other's
// opposite. ⭐ U-56 needs no payload: OP-3 of table T-024a is answered by three
// entries and table T-109 places all three on it, so `commandsOnSurface` below
// answers that surface in full. ⛔ U-54 IS NOT ANSWERED THAT WAY: the same
// table places nothing but IC-52 on it, because FR-096 gives the whole act one
// entrance (MUST) and forbids one per format (MUST NOT) -- so the things a
// person chooses between there are rows of table T-024, not rows of table
// T-109, and they need a member of their own.
// ⚠️ U-56 is NOT a `Confirmation` (U-55) and its glossary row says so: NT-7 of
// table T-037 makes that surface two answers by construction, and OP-3 of table
// T-024a (MUST) is three. ⛔ So nothing here routes OP-3's question through
// UF-67 -- a third entry on U-55 would break NT-7.

import type { Assignment, Schedule, Task } from '../../entity/document-model/schedule/schedule'
import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
import type {
  CommandItem,
  DisplayLanguage,
  HelpEntry,
  ExportFormatChoice,
  IconId,
  OpenModal,
  RosterResource,
  ScreenSession,
} from './screen-renderer'
// ⭐ NT-7's two word buttons, read where UF-67 already reads them. FR-020
// (MUST) gives U-60 the same two and sends their manner to that row, so this
// unit asks the unit that owns the reading rather than building a second one
// (R2.7). ⚠️ AN EDGE BETWEEN TWO UNITS OF THE ONE COMPONENT, which crosses no
// boundary table T-061 draws: both are ScreenRenderer's, and `screen-renderer.ts`
// already imports each of them.
import { confirmationAnswers, reasonSurfaceWords } from './notices'
import iconRoster from './icon-roster.json'
import exportFormats from './export-formats.json'
import displayWords from './display-words.json'
// ⭐ The rows FR-036 (MUST) puts on the help, generated from the six tables it
// names and from the icon roster. ⛔ It carries no word: FR-038 (MUST NOT)
// keeps those in the dictionary above, and this joins to them by row id.
import helpRoster from './help-roster.json'
// ⭐ FR-069 (MUST): the licence in full, the copyright notice and the
// attributions, carried out of the repository's own LICENSE and NOTICE.
import licence from './licence.json'

/**
 * U-30 of table T-103, the half of that row FR-036 opens.
 *
 * ⭐ A settled name copied spelling and all (rule 03 section 1), not a value
 * invented here, and the same spelling `icon-roster.json` carries in its
 * surface column. It is needed because ONE rule is keyed on this surface alone:
 * FR-038's second language entry is in the help, and the AI export modal --
 * the other half of U-30 -- is not the help.
 */
const HELP_MODAL = 'Help Modal'

/**
 * The other half of U-30 of table T-103, the surface FR-068 opens.
 *
 * ⭐ A settled name copied spelling and all (rule 03 section 1), the literal
 * `OpenModal` discriminates `AiExportModal` on, and the same spelling
 * `icon-roster.json` carries in its surface column for IC-52.
 */
const AI_EXPORT_MODAL = 'AI Export Modal'
/** Table T-109, which the help roster names for a row that IS an entrance. */
const ICON_TABLE = 'T-109'

/**
 * IC-21 of table T-109. FR-038 (MUST) puts an entry to it in two places, the
 * app header and the help, and FR-029 names it as its only exception.
 *
 * ⛔ Carried as a row id because table T-109 admits no other join: it has no
 * English column on purpose, so naming the icon here would settle a name the
 * glossary has not.
 */
const DISPLAY_LANGUAGE_ICON: IconId = 'IC-21'

/**
 * U-49 of table T-103, the surface FR-099 opens.
 *
 * ⭐ A settled name copied spelling and all (rule 03 section 1), and the literal
 * `OpenModal` discriminates its roster member on. Keyed on because FR-099's
 * roster is the one payload this unit can fill.
 */
const RESOURCE_ROSTER = 'Resource Roster'

/**
 * U-54 of table T-103, the surface FR-096 opens.
 *
 * ⭐ A settled name copied spelling and all (rule 03 section 1), and the literal
 * `OpenModal` discriminates its format member on. The same spelling
 * `icon-roster.json` carries in its surface column for IC-52.
 */
const EXPORT_CHOOSER = 'Export Chooser'

/**
 * U-60 of table T-103, the surface FR-020 (MUST) raises before the watermark
 * may be hidden.
 *
 * ⭐ A settled name copied spelling and all (rule 03 section 1), and the literal
 * `OpenModal` discriminates its own member on. Keyed on because this surface
 * carries a payload no other does -- the question and the two word buttons.
 * ⚠️ TABLE T-109 PLACES NOTHING ON IT, which is not an omission: FR-020
 * (MUST NOT) refuses the two answers a row there, and no row of that table
 * names this surface -- so `commandsOnSurface` answers with nothing and the way
 * out is the first level of `Esc` alone (IN-4 of table T-028).
 */
const WATERMARK_UNLOCK = 'Watermark Unlock'

/**
 * U-61 of table T-103, the surface FR-022 (MUST) sends the merge's question to
 * and FR-073 the newer-version one.
 *
 * ⭐ A settled name copied spelling and all (rule 03 section 1), and the literal
 * `OpenModal` discriminates its candidate member on. The same spelling
 * `icon-roster.json` now carries in its surface column for IC-95 .. IC-97.
 * ⚠️ NO BRANCH IS NEEDED FOR THE THREE ANSWERS -- table T-109 places them on
 * this surface, so `commandsOnSurface` emits them the way it emits IC-71 ..
 * IC-73 on U-56. What this surface needs a branch for is the half that is NOT an
 * entrance: the tasks FR-022 (MUST) lays out before anyone is asked.
 * ⛔ IT HAS NO INDEPENDENT ENTRANCE OF ITS OWN (FR-022): it rises from the
 * opening road, OP-3 of table T-024a.
 */
const DIFFERENCE_REVIEW = 'Difference Review'

/**
 * U-62 of table T-103, the surface FR-023 (MUST) sends the names of the `Task`
 * rows an import dropped to.
 *
 * ⭐ A settled name copied spelling and all (rule 03 section 1), and the literal
 * `OpenModal` discriminates its own members on.
 * ⚠️ TABLE T-109 PLACES NOTHING ON IT, the same as U-60: its one entrance is a
 * WORD (NT-8) and a word has no shape, so `commandsOnSurface` answers with
 * nothing. ⛔ AND THE `surfaces` SECTION HOLDS NO HEADING FOR IT either -- one
 * written here would be the second store of translated words FR-038 forbids
 * (MUST NOT), so `heading` comes back empty exactly as U-60's and U-61's do.
 */
const IMPORT_REPORT = 'Import Report'

/**
 * The row of table T-233 FR-023 (MUST) makes U-62's sentence.
 *
 * ⛔ A ROW ID AND NEVER A SENTENCE, for the reason `WATERMARK_UNLOCK_QUESTION`
 * gives: FR-023 names the row and FR-038 (MUST NOT) keeps the words in the one
 * dictionary.
 */
const IMPORT_REPORT_REASON = 'RS-50'

/**
 * The row of table T-233 FR-073 (MUST) makes U-61's sentence when the intake
 * being asked about carried columns this build could not read.
 *
 * ⛔ A ROW ID AND NEVER A SENTENCE, for the reason `IMPORT_REPORT_REASON` above
 * gives: the requirement names the row -- 「運ぶ理由は 表 T-233 の `RS-48`」 --
 * and FR-038 (MUST NOT) keeps the words in the one dictionary.
 */
const NEWER_FORMAT_VERSION_REASON = 'RS-48'

/**
 * `RS-48`'s two strings for `U-61`, or two empty ones where this intake read
 * every column it was handed.
 *
 * ⭐ SEPARATED SO THE CONDITION IS SAID ONCE. FR-073's telling is about
 * 「読めなかった項目」, and the same emptiness decides both strings -- writing
 * the test twice inside one object literal is where the two would part company.
 *
 * @purity pure
 */
function unreadWords(session: ScreenSession): {
  readonly unreadText: string
  readonly unreadNextStep: string
} {
  if ((session.unreadColumns ?? []).length === 0) {
    return { unreadText: '', unreadNextStep: '' }
  }
  const said = reasonSurfaceWords(NEWER_FORMAT_VERSION_REASON, session.language)
  return { unreadText: said.text, unreadNextStep: said.nextStep }
}

/**
 * The row of table T-234 FR-020 (MUST) makes U-60's question.
 *
 * ⛔ A ROW ID AND NEVER A SENTENCE, the join `RaisedConfirmation.question`
 * already takes: FR-076 (MUST) makes what a question shows a row of that table,
 * and the words are the dictionary's (FR-038, MUST NOT).
 */
const WATERMARK_UNLOCK_QUESTION = 'QN-9'

/**
 * The words of table T-234's rows, keyed by the row id.
 *
 * ⭐ A `Map` rather than a scan, for the reason `WORDS_BY_ROW` is one: a
 * description is built for every frame, and rule 05 of docs/development-rules
 * forbids a linear search on that path (NFR-013).
 * ⚠️ UF-67 keeps a map of the same section for the questions IT shows. ⛔ THAT
 * IS NOT THE SAME DECISION TWICE: the sentence is read once per surface, and
 * the two surfaces are different -- what would be a duplicate is a second
 * ROSTER of the rows, and neither unit holds one.
 */
const QUESTIONS_BY_ROW = new Map(displayWords.questions.map((entry) => [entry.rowId, entry]))

/**
 * FR-096 (MUST): the formats the `Export Chooser` offers, each with the word
 * the dictionary holds for it and the extension table T-024 gives it.
 *
 * ⭐ NEITHER THE MEMBERSHIP NOR THE ORDER IS DECIDED HERE. `export-formats.json`
 * is table T-024 generated into this folder, in that table's own print order,
 * and it carries a row only where the table gives one an extension -- which is
 * what keeps IO-5 and IO-6 out without either being named here.
 * ⛔ AND NO WORD IS WRITTEN HERE (FR-038, MUST NOT): the dictionary is read,
 * and a row it has no word for falls to `NO_WORDS` like every other.
 *
 * @purity pure
 */
const FORMAT_NAME_BY_ROW = new Map(
  displayWords.exportFormats.map((entry) => [entry.rowId, entry]),
)

function exportFormatChoices(
  language: DisplayLanguage,
): readonly ExportFormatChoice[] {
  return exportFormats.formats.map((one) => ({
    row: one.rowId,
    name: FORMAT_NAME_BY_ROW.get(one.rowId)?.name[language] ?? NO_WORDS,
    extension: one.extension,
  }))
}

/**
 * What an entry or a heading says while the dictionary holds no word for it.
 *
 * ⛔ NOT "SAY NOTHING". An empty cell of `display-words.json` says that no word
 * has been SETTLED yet, which is a different thing from a settled word
 * that happens to be empty.
 * ⚠️ NOTHING FALLS BACK TO IT TODAY -- the manuscript is filled and no cell the
 * sections below are keyed on is empty. It stays because a row added to table
 * T-109 or T-103 ahead of its word empties a cell again, and because that is
 * exactly what UF-66 printed for every entry while the dictionary was unfilled.
 */
const NO_WORDS = ''

// ⭐ WHERE THE WORDS COME FROM. FR-038 (MUST) holds every word the screen prints
// as one dictionary per language, and Chapter 6.2 fixes its manuscript as
// `_source/display-words.json`; `display-words.json` beside this file is that
// manuscript generated into `src/`. ⛔ Entries are keyed by the row of table
// T-109 and headings by the settled name of the surface, which are the two joins
// the specification admits -- so nothing here is minted. ⭐ The manuscript is
// filled, so the words this unit reads reach the screen and the stand-in below
// no longer answers for any of them. Reading `displayWords`
// no more makes this unit `semi-pure-a` than reading `iconRoster` does: both are
// module constants compiled into the program, not state read while running.
// Table T-075 fixes UF-66 as `pure`.
//
// ⛔ FR-038 REQUIRES the CURRENT language to be readable BEFORE the toggle is
// pressed (MUST), and that is a member rather than a word: `CommandItem` has
// four and none of them can carry it -- `isPressed` is declared as "a toggle
// that is on", and a choice between two languages has no off. `HelpModal`
// declares `language` for it, and the help arm below fills it from
// `ScreenSession.language` (S-99). ⚠️ The help arm still asks for `entries`,
// `licenceText`, `copyrightNotice` and `attributions`, which the STOP note in
// the body says are not reachable from these three arguments -- so what that arm
// returns is not yet a `HelpModal`.

/**
 * The words of table T-109's rows, keyed by the row id, and the headings of the
 * surfaces table T-103 has settled a name for, keyed by that name.
 *
 * ⭐ `Map`s rather than a scan per entry: a description is built for every
 * frame, and rule 05 of docs/development-rules forbids a linear search on that
 * path (NFR-013).
 */
const WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))
const HEADINGS_BY_SURFACE = new Map(displayWords.surfaces.map((entry) => [entry.name, entry]))

/**
 * The accessible name of one entry, in the display language (FR-038).
 *
 * ⛔ THE FALLBACK IS WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`. Those read
 * "the dictionary holds no word yet" and "the word is the empty string" as one
 * thing: an empty cell is UNSETTLED, not
 * an instruction to print nothing. ⭐ The words are written now, so this line
 * hands the dictionary's own word on and stands in for nothing -- which is what
 * it did the day they were written, with no edit here.
 * ⚠️ A row the dictionary does not hold AT ALL is a second condition, answered
 * separately although with the same stand-in. It cannot happen while
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
 * The words the help shows, keyed by the row each entry names.
 *
 * ⭐ ONE MAP OVER EVERY SECTION THE HELP READS, because the roster's rows come
 * from six tables and each has a section of its own: table T-023 is
 * `assignments` and table T-023b is `arms`, both raised for other surfaces and
 * serving here too; the other four were raised for this one.
 * ⛔ The palette entries are NOT in it -- their word is a `label` of `icons`,
 * which `entryLabel` already reads, and putting them here would give one row
 * two words.
 */
/**
 * Table T-023's rows on their own, because they are the only ones that carry
 * a second word: `press`, the gesture itself (FR-036).
 */
const MOUSE_PRESS_BY_ROW = new Map(
  displayWords.assignments.map((entry) => [entry.rowId, entry]),
)

const HELP_WORDS_BY_ROW = new Map(
  [
    ...displayWords.pressOrder,
    ...displayWords.arms,
    ...displayWords.selecting,
    ...displayWords.grabAreas,
    ...displayWords.assignments,
    ...displayWords.shortcuts,
  ].map((entry) => [entry.rowId, entry]),
)

/**
 * Every row FR-036 (MUST) puts on the help, in that requirement's own order.
 *
 * ⭐ THE ROSTER IS GENERATED AND THE WORDS ARE THE DICTIONARY'S, which is what
 * let this be built at all: the six tables FR-036 names reached no unit until
 * `tools/generate_help_roster.py` carried them, and a list typed here would be
 * the copy rule 03 section 1 forbids -- which is what the STOP note below said
 * for several rounds.
 *
 * ⚠️ A PALETTE ENTRY TAKES ITS WORD FROM `icons` AND EVERY OTHER ROW FROM ITS
 * OWN SECTION. The roster marks which is which by naming table T-109, and the
 * two stores are not merged: an entry's `label` is what its entrance says, and
 * a row of table T-023d has no entrance at all.
 *
 * ⛔ A ROW WHOSE WORD IS UNWRITTEN SHOWS NOTHING RATHER THAN ITS ROW ID.
 * ⚠️ Every row is written today.
 *
 * @purity pure
 */
function helpEntries(language: DisplayLanguage): readonly HelpEntry[] {
  return helpRoster.entries.map((entry) => ({
    table: entry.table,
    row: entry.row,
    text:
      entry.table === ICON_TABLE
        ? entryLabel(entry.row as IconId, language)
        : (HELP_WORDS_BY_ROW.get(entry.row)?.text[language] ?? NO_WORDS),
    // FR-036 (MUST): the assignment is the key OR the mouse operation, and
    // a row carrying neither leaves the place empty rather than drawing a
    // dash -- which would read as "assigned nothing on purpose", the one
    // thing SK-1 says in words.
    press: MOUSE_PRESS_BY_ROW.get(entry.row)?.press[language] ?? null,
    keys: entry.keys,
    icon: entry.icon as IconId | null,
  }))
}

/**
 * What one row of table T-234 says, in the display language (FR-038), or the
 * stand-in while the dictionary holds no word for it.
 *
 * ⛔ THE FALLBACK IS WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`, for the
 * reason `entryLabel` gives above: those read 「the dictionary holds no word
 * yet」 and 「the word is the empty string」 as one thing.
 * ⛔ AND NEVER THE ROW ID IN ITS PLACE. Printing it would put on the screen a
 * string FR-038 (MUST) does not hold, the same in both display languages.
 * ⚠️ NO FALL-BACK ROW IS TAKEN HERE, where `notices.ts` takes QN-8: this unit
 * reads ONE row that FR-020 names, so a row the dictionary cannot answer for is
 * a generated file edited by hand and not a question with no row of its own.
 *
 * @purity pure
 */
function questionTextOf(row: string, language: DisplayLanguage): string {
  const word = QUESTIONS_BY_ROW.get(row)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * The heading of one open surface, in the display language (FR-038).
 *
 * ⚠️ A SURFACE WITH NO SETTLED NAME IS NOT A FAULT HERE. The header of this file
 * records that FR-074's and FR-088's surfaces have no row of table T-103 -- so
 * `ScreenState.surface` carries a spelling nothing can be keyed on, and the
 * stand-in answers. ⛔ Minting a name to key them on is the very thing that
 * header refuses.
 *
 * ⭐ EVERY SURFACE TABLE T-103 HAS NAMED HAS A HEADING HERE, U-56 `Open Chooser`
 * among them: the `surfaces` section is generated from that table every run, so
 * a surface it names cannot be missing while `npm run gen:check` passes. ⛔ The
 * generated file is never edited by hand for the same reason -- a heading owed
 * for a new surface is owed by `_source/display-words.json`, which FR-038 (MUST)
 * makes the one store, and never by this unit.
 *
 * @purity pure
 */
function surfaceHeading(surface: string, language: DisplayLanguage): string {
  const word = HEADINGS_BY_SURFACE.get(surface)?.heading[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * One entry of table T-109 as it stands on an open surface.
 *
 * `isEnabled` is true for every entry this unit emits. Closing the surface
 * (IC-52) and choosing the display language (IC-21) can always be done while
 * the surface is up, so FR-029's faint-and-explained state never applies to
 * them; and OP-3 of table T-024a (MUST NOT) forbids GRS settling the three-way
 * choice by itself, which an entry a person cannot press would be one half of.
 * `isPressed` is false because an open surface has nothing that stays pressed.
 * ⚠️ The language entry is the exception the note above describes, not a case
 * handled here.
 *
 * STOP -- ⛔ NOT REACHABLE FROM THESE ARGUMENTS: whether IC-63 .. IC-68 may be
 * pressed. Table T-109 places FR-099's six on U-49, and FR-029 (MUST) asks an
 * entry that cannot be used now to be faint AND to say why -- but whether one
 * of the six can be used now is a judgement about an operation, and neither
 * `state`, `schedule` nor `session` carries the state those six read. Searched:
 * FR-029, FR-099, table T-108 (CM-42, CM-43) and table T-109. ⚠️ True is what
 * this unit printed before those rows existed, so this note moves nothing on the
 * screen.
 *
 * @purity pure
 */
function commandItemFor(icon: IconId, language: DisplayLanguage): CommandItem {
  // ⛔ `isArmed` IS FALSE AND IS NOT A GAP: the 構え column of table T-109 --
  // which FR-053 makes the authority for which entrance is which arm -- holds
  // an em dash for every row of every surface but the `Command Palette`.
  return {
    icon,
    isEnabled: true,
    isPressed: false,
    isArmed: false,
    label: entryLabel(icon, language),
  }
}

/**
 * The entries table T-109 places on one surface, in that table's own order.
 *
 * ⭐ One pass over the generated roster rather than a list written here, so the
 * print order of table T-109 is the order of the result without this file
 * knowing what that order is (rule 03 section 4). FR-029 makes both the roster
 * and the placement follow that table (MUST).
 *
 * ⚠️ Reading `iconRoster` does not make this `semi-pure-a`: it is a module
 * constant compiled into the program, the way `DEFAULT_CALENDAR` is in
 * `schedule.ts`, not external state read while running. Table T-075 fixes UF-66
 * as `pure`.
 *
 * @purity pure
 */
function commandsOnSurface(surface: string, language: DisplayLanguage): readonly CommandItem[] {
  return iconRoster.icons
    .filter(
      (row) =>
        row.surfaces.includes(surface) ||
        (row.rowId === DISPLAY_LANGUAGE_ICON && surface === HELP_MODAL),
    )
    .map((row) => commandItemFor(row.rowId, language))
}

/**
 * Which resources an assignment refers to, and the tasks a deletion of each
 * would unassign -- the chain CD-5 of table T-050 gives FR-099.
 *
 * A key means "some assignment refers to this resource", which is exactly what
 * FR-099's first way of deleting is the complement of; its value is the tasks
 * that deletion would leave without this assignee.
 *
 * ⛔ JOINED ON `Assignment.resourceUid` (AT-94) AND NEVER ON THE NAME. AS-6 of
 * table T-225 (MUST) makes the name what a person is shown and the `uid` what
 * the document writes, and AS-8 forbids same-named resources being made one
 * (MUST NOT). Joining on the name would let a referenced resource hide an
 * unreferenced twin from the deletion FR-099 requires. ⚠️ AS-8's "take the
 * smaller `uid`" is NOT answered here and is not missing: it resolves a name
 * ARRIVING as input (FR-008), and nothing arrives by name on this surface.
 * ⚠️ Unifying same-named resources is the merge route's rule alone -- MG-5 of
 * table T-032, which writes that boundary in as many words.
 *
 * ⚠️ An assignment carrying no `taskUid` still marks its resource referenced:
 * it refers to one, which is all FR-099's first way asks. It adds no task name
 * because it reaches no task.
 *
 * ⭐ ONE PASS AND A `Map` rather than a scan of the assignments per resource:
 * a description is built for every frame, and rule 05 of
 * docs/development-rules forbids a linear search on that path (NFR-013).
 *
 * @purity pure
 */
function tasksReachedByEachResource(
  assignments: readonly Assignment[],
): ReadonlyMap<number, ReadonlySet<number>> {
  const reached = new Map<number, Set<number>>()
  for (const assignment of assignments) {
    const resourceUid = assignment.resourceUid
    if (resourceUid === null) continue
    const taskUids = reached.get(resourceUid) ?? new Set<number>()
    if (assignment.taskUid !== null) taskUids.add(assignment.taskUid)
    reached.set(resourceUid, taskUids)
  }
  return reached
}

/**
 * The names FR-099 shows for the tasks a deletion would unassign.
 *
 * ⛔ NAMES, NOT A COUNT -- FR-099 forbids the count in as many words (MUST
 * NOT). `Task.name` (AT-27) is `null` where a task carries none, and that
 * `null` is carried rather than dropped: a nameless task is still a task the
 * deletion reaches, and dropping it would leave a shorter list than the
 * deletion touches.
 *
 * ⚠️ A `taskUid` no `Task` answers to is left OUT instead. `null` already means
 * "a task carrying no name of its own", so spelling a task that is not there
 * the same way would leave a reader unable to tell the two apart.
 * ⚠️ Nothing orders these, so the document's own order of the assignments that
 * reach them is kept and no sort is invented (rule 03 section 4).
 *
 * @purity pure
 */
function unassignedTaskNamesOf(
  taskUids: ReadonlySet<number> | undefined,
  tasksByUid: ReadonlyMap<number, Task>,
): readonly (string | null)[] {
  if (taskUids === undefined) return []
  const names: (string | null)[] = []
  for (const taskUid of taskUids) {
    const task = tasksByUid.get(taskUid)
    if (task !== undefined) names.push(task.name)
  }
  return names
}

/**
 * The resources the document holds, as the roster shows them (FR-099).
 *
 * ⭐ EVERY RESOURCE, in `Schedule.resources`' own order and with nothing left
 * out. FR-059's work-resources-only rule is written for the assignee label and
 * says so; FR-099 is where an assignee that came in with a file is deleted, so
 * leaving a kind out would leave it in the document with no way to remove it.
 * ⛔ Same-named resources stay two rows, for the reason
 * `tasksReachedByEachResource` gives (AS-8 with MG-5).
 *
 * `isSelected` reads `ScreenSession.selectedResourceUids`, which is by `uid`
 * (AS-6) and is what FR-099's select-all and clear-all operate on (MUST).
 *
 * @purity pure
 */
function rosterResourcesOf(schedule: Schedule, session: ScreenSession): readonly RosterResource[] {
  const tasksReached = tasksReachedByEachResource(schedule.assignments)
  const tasksByUid = new Map<number, Task>(schedule.tasks.map((task) => [task.uid, task]))
  const selectedUids = new Set<number>(session.selectedResourceUids)

  return schedule.resources.map((resource) => ({
    uid: resource.uid,
    name: resource.name,
    isReferenced: tasksReached.has(resource.uid),
    isSelected: selectedUids.has(resource.uid),
    unassignedTaskNames: unassignedTaskNamesOf(tasksReached.get(resource.uid), tasksByUid),
  }))
}

/**
 * The surface open over the screen this frame, or `null` while S-99g says none
 * is (which is its default).
 *
 * `surface` is the name `ScreenState` carries, passed through unchanged --
 * table T-103 leaves some of these surfaces unnamed, so this unit is in no
 * position to normalise or translate it. `commands` are the
 * entries table T-109 places on that surface, plus the display-language entry
 * FR-038 (MUST) puts inside the help.
 *
 * ⚠️ A surface table T-103 has NOT named comes back with no commands at all, and
 * that is what the specification says rather than an omission: FR-029 (MUST)
 * makes table T-109's surface column the whole of the placement and forbids
 * minting a row, and a name that table cannot spell is a name nothing can be
 * placed on. Esc still closes them (IN-4 of table T-028), so none of them traps
 * a reader.
 *
 * ⭐ U-56 `Open Chooser` NEEDS NO BRANCH OF ITS OWN: table T-109 places IC-71 /
 * IC-72 / IC-73 on it, so reading the generated roster IS drawing them, and
 * OP-3 of table T-024a asks for nothing on that surface but the three.
 * ⭐ The same table places IC-52 on it as on every other named surface, so
 * closing without answering is a way out beside the first level of Esc (IN-4) --
 * which is what OP-3 (MUST NOT) wants, GRS settling none of the three by itself.
 *
 * ⭐ TWO OF THE SIX CARRY MORE THAN THEIR ENTRIES: the `Resource Roster` (U-49)
 * carries what FR-099 shows on it, and the `Export Chooser` (U-54) carries the
 * formats FR-096 offers. The STOP note below says why the four others do not.
 *
 * @purity pure
 */
export function openModalFromScreenState(
  state: ScreenState,
  schedule: Schedule,
  session: ScreenSession,
): OpenModal | null {
  const surface = state.surface
  if (surface === null) return null

  const commands = commandsOnSurface(surface, session.language)
  const heading = surfaceHeading(surface, session.language)

  // FR-038 (MUST): the language has to be readable BEFORE the toggle is pressed,
  // and the same requirement puts the second of its two entrances inside the
  // help -- so the help is where that reading happens. `HelpModal.language` is
  // the member declared for it.
  // ⚠️ The four other members `HelpModal` declares stay unfilled, for the
  // reasons the STOP note below gives; this one is not among them, because
  // `ScreenSession.language` (S-99) is already an argument here.
  // ⛔ Never chosen here: FR-038 (MUST) keeps the state ONE for the whole
  // screen, so it is carried across, exactly as `screenViewFromRegions` carries
  // it into `ScreenView.language`. Two places that decide it would be two
  // states, which the same sentence forbids (MUST NOT).
  if (surface === HELP_MODAL) {
    return {
      surface: HELP_MODAL,
      heading,
      commands,
      language: session.language,
      entries: helpEntries(session.language),
      // FR-069 (MUST): read from here, and carried whole rather than summarised
      // -- that requirement's RATIONALE is that a reader with no network can
      // only read what is inside the file.
      licenceText: licence.licenceText,
      copyrightNotice: licence.copyrightNotice,
      attributions: licence.attributions,
    }
  }

  // FR-099 (MUST): the roster is the list of assignees the DOCUMENT holds, so
  // it is read from `schedule` and never from what happens to be on screen.
  if (surface === RESOURCE_ROSTER) {
    return {
      surface: RESOURCE_ROSTER,
      heading,
      commands,
      resources: rosterResourcesOf(schedule, session),
    }
  }

  // FR-096 (MUST): every format table T-024 gives an out direction AND an
  // extension is offered here, because table T-109 places no entrance for one
  // and FR-096 (MUST NOT) forbids adding one per format. ⚠️ The extension is
  // what leaves IO-6 out: the clipboard is not a file, so FR-096 has no name
  // for it to propose and FR-025 carries it on IC-3 instead.
  // ⛔ The formats do not depend on the document,
  // so nothing is read from `schedule`: which formats exist is the table's
  // answer, and which of them can be used now is a judgement no argument here
  // carries -- ⛔ nor does the specification state one. Searched: FR-096, table
  // T-024, table T-024a and table T-109.
  if (surface === EXPORT_CHOOSER) {
    return {
      surface: EXPORT_CHOOSER,
      heading,
      commands,
      formats: exportFormatChoices(session.language),
    }
  }

  // FR-020 (MUST): the question QN-9 of table T-234 shows, and the two word
  // buttons that answer it -- 「答えの入口は 2 つとし、語のボタンとすること」.
  //
  // ⛔ WHAT IS TYPED IS NOT HERE, AND MAY NOT BE. The answer is 「打ち込む文字」
  // drawn masked (MUST), which is the half-typed contents of a field -- the same
  // thing AG-11 keeps out of `DialogueField`, and LY-5 of table T-060 leaves a
  // current value with the Framework. ⭐ So what crosses is that there IS such a
  // field to draw, which this member being present says.
  // ⛔ AND NEITHER IS THE DIGEST. FR-020 (MUST NOT) keeps the raw password out
  // of code, model and output, and a description is what goes into an export
  // (table T-076) -- so the comparing is the shell's and nothing about it
  // reaches this side.
  // ⚠️ `heading` IS EMPTY TODAY AND NOT A FAULT. Table T-103
  // names U-60 and the `surfaces` section of the dictionary holds no heading for
  // it, exactly as it holds none for U-55 -- ⛔ and one written here would be
  // the second store of translated words FR-038 forbids (MUST NOT).
  //
  // STOP -- ⛔⛔ FR-020's 「透かしがアクセス制御ではなく証跡であることを画面上でも
  // 示すこと（MUST）」 IS NOT KEPT ANYWHERE, and this surface is where a reader
  // meets the misreading it guards against -- they have just been asked for a
  // password (DFC-304, measured 2026-09-07). ⛔ It cannot be kept here: every word
  // this unit prints comes out of the generated dictionary, and no entry of it
  // says the mark is a trail. What is owed is a row of the manuscript's own
  // dictionary; ⛔ writing the sentence in this file would be the second store
  // of translated words FR-038 forbids (MUST NOT), the same reason `heading`
  // above stands empty. ⚠️ The trail ITSELF is carried, so this is the telling
  // and not the mark: `Watermark` of `svg-renderer.ts` holds `openedBy` and
  // `stampedAt`, which is 「誰がいつ画面に出していたか」 in as many members.
  // Searched: FR-020, table T-103 (U-60), table T-109, table T-234 (QN-9),
  // table T-207 and the `surfaces` / `questions` sections of the dictionary.
  if (surface === WATERMARK_UNLOCK) {
    return {
      surface: WATERMARK_UNLOCK,
      heading,
      // ⚠️ EMPTY, AND THAT IS TABLE T-109's ANSWER RATHER THAN A GAP: no row of
      // it names this surface, so `commandsOnSurface` finds none. The way out
      // is IN-4's first level (FR-020, MUST), and ⛔ closing it may not hide the
      // watermark (MUST NOT) -- which is kept by this side writing nothing.
      commands,
      question: questionTextOf(WATERMARK_UNLOCK_QUESTION, session.language),
      answers: confirmationAnswers(session.language),
    }
  }

  // FR-022 (MUST): 「選ばせる前に、対応するかもしれないタスクを並べて見せること」,
  // and (MUST NOT) 「選択肢だけを出してはならない」 -- so the pairing is carried
  // even when it is empty, because an empty one is a merge with nothing to ask
  // about rather than a list this side declined to fill.
  //
  // ⭐ READ FROM THE SESSION AND NOT FROM `schedule`. The candidates are pairs
  // of a task standing NOW and a task of the file being READ, and the file being
  // read is not in the schedule -- PI-10 worked the pairing out for this import
  // and the shell is the only layer that may hold it (LY-5 of table T-060).
  // ⛔ NOTHING IS COMPOSED HERE: the names are the documents' own values, which
  // FR-038 leaves untranslated, and the three answers are `commands`.
  if (surface === DIFFERENCE_REVIEW) {
    return {
      surface: DIFFERENCE_REVIEW,
      heading,
      commands,
      candidates: session.mergeCandidates ?? [],
      // FR-073 (MUST): 「読めなかった列を具体的に並べて見せ、続けてよいかを
      // 問うこと」, and that requirement sends them to this same surface --
      // 「面は 表 T-103 の `U-61`」.
      //
      // ⭐ READ FROM THE SESSION FOR THE REASON THE PAIRING ABOVE IS: a column
      // this build could not read is a key of the file, and the file is not in
      // any document this side can see -- PI-20 named them while the text was
      // still text, and the shell is the only layer that may hold them (LY-5).
      // ⛔ CARRIED EVEN WHEN EMPTY, the same reading the pairing takes.
      unreadColumns: session.unreadColumns ?? [],
      // `RS-48`'s own words, and ⛔ only where there is something for them to be
      // about: FR-073's telling is 「…より新しく、読めなかった項目がある」, so a
      // merge of a document this build read in full says nothing.
      // ⭐ READ AND NOT COMPOSED -- `reasonSurfaceWords` is where table T-233's
      // rows are turned into words for a surface, and U-62 already reads its own
      // through it (R2.7: one reading, not two).
      // ⛔ `dismissText` IS DROPPED. That word is NT-8's way out of a telling,
      // and U-61 is answered by IC-95 .. IC-97 instead -- drawing an `OK` beside
      // them would offer a fourth answer to a question that has three.
      ...unreadWords(session),
    }
  }

  // FR-023 (MUST): 「取り込んだあとで、落とした `Task` の名前を並べて告げること」,
  // and (MUST NOT) 「件数だけを告げて済ませてはならない」 -- so the names are
  // carried, one entry each, and never counted.
  //
  // ⭐ READ FROM THE SESSION AND NOT FROM `schedule`, for the reason the merge
  // above is: the rows these name are the ones the import DID NOT take, so no
  // document holds them and LY-5 of table T-060 leaves them with the Framework.
  // ⛔ NOTHING HERE IS TRANSLATED (FR-023, MUST NOT: 「名前は文書の値であるので
  // 訳さない」) -- the names cross as the file wrote them, and the three strings
  // that ARE words are read out of the one dictionary by `notices.ts`.
  // ⚠️ `commands` IS EMPTY AND THAT IS TABLE T-109's ANSWER RATHER THAN A GAP:
  // no row of it names this surface, because U-62's one entrance is the word
  // NT-8 holds. `Esc` reaches it at the surface rung of IN-4 like any other.
  if (surface === IMPORT_REPORT) {
    return {
      surface: IMPORT_REPORT,
      heading,
      commands,
      // ⛔ CARRIED EVEN WHEN EMPTY, the same reading the merge above takes: an
      // empty list is a surface with nothing left to name rather than one this
      // side declined to fill.
      droppedTaskNames: session.droppedTaskNames ?? [],
      ...reasonSurfaceWords(IMPORT_REPORT_REASON, session.language),
    }
  }

  // FR-068 (MUST): 「面にはその文書を読める形で出すこと（MUST）。題と閉じる入口
  // だけにしてはならない（MUST NOT）」, and the document is settled --
  // 「渡す文書は、表 T-024 の `GRS JSON` そのものとすること（MUST）」.
  //
  // ⭐ CARRIED RATHER THAN CHOSEN (DFC-268). The STOP that stood in the note below
  // said no row spelled the text and there was no door to hand one through;
  // both halves were closed on 2026-09-07 -- the requirement names the row of
  // table T-024, and `ScreenSession.aiExportDocument` is the door, filled by the
  // shell that holds the whole `Document`. ⛔ So nothing is minted here: this
  // unit neither picks a format nor writes one.
  //
  // ⚠️ AN ABSENT MEMBER FALLS THROUGH TO THE CATCH-ALL rather than showing an
  // empty page. A caller that opened this surface without filling the member has
  // not given the surface its document, and `documentText: ''` would be this
  // unit claiming the document IS empty -- which is a value invented here.
  // ⛔ The copy entrance is not built here either: FR-068 (MUST) makes it
  // 「表 T-109 の `IC-52`」 and ⛔ 「新しい行を足してはならない（MUST NOT）」, and
  // that row is already in `commands` above because table T-109 places it on
  // this surface. What a press of it spends belongs to the layer that owns the
  // clipboard seam (CHN-9 of table T-008), which is the shell.
  if (surface === AI_EXPORT_MODAL && session.aiExportDocument !== undefined) {
    return {
      surface: AI_EXPORT_MODAL,
      heading,
      commands,
      documentText: session.aiExportDocument,
    }
  }

  // STOP -- ⛔ NOT MODELLED, AND THIS UNIT MAY NOT ADD IT: what the three other
  // surfaces show. `OpenModal` declares a payload for each of them, and
  // `screen-renderer.ts` is where they stand; none is filled here, so a
  // description of one of them lands in the union's catch-all member. Each line
  // below is what a requirement asks for and what would have to exist before it
  // could be built:
  //   FR-036, `Help Modal` (U-30): the whole of tables T-023a / T-023b /
  //     T-023c / T-023d / T-023 / T-036 and every command palette entry (MUST),
  //     laid out to need no scrolling at table T-025's MC-6. FR-069 adds the
  //     licence text and the third-party attributions, read from here. ⛔ None
  //     of those tables is generated into `src/` the way `icon-roster.json` is,
  //     so listing them here would be the copy rule 03 section 1 forbids.
  //   FR-074, no settled name: the rows of table T-224, each with the column it
  //     writes and whether it may be edited -- PF-9 and PF-10 may not -- and
  //     that table is the whole of what this surface may write (MUST). ⛔ Not
  //     generated into `src/` either.
  //   FR-088, no settled name: the working weekdays, the exception days and the
  //     week's first day. ⚠️ They are the calendar FR-054 RESOLVES for the
  //     document, and nothing in this component resolves one.
  // ⭐⭐ FR-068 IS NO LONGER ON THIS LIST (DFC-268, closed 2026-09-07). What stood
  // here said no row spelled the text and `ScreenSession` had no member to hand
  // one through; the requirement now names the row of table T-024 and the member
  // exists, and the branch above fills the surface. ⛔ The ground it gave was
  // real while it stood -- it is the manuscript that moved, not the reading.
  // ⭐ WHAT FR-099 ASKS FOR NOW HAS ENTRIES, and they arrive by the road every
  // other entry does: table T-109 places IC-63 .. IC-68 on U-49 and IC-62 in
  // the `Command Palette`, so `commandsOnSurface` above emits the six without
  // this file naming one. ⛔ So none of them is minted here, and the note that
  // said they could not exist is gone because the rows now do.
  // ⭐ FR-068's copy control is owed nothing: the requirement itself says which
  // row it is -- 「複写の入口は 表 T-109 の `IC-52` とすること（MUST）。新しい行
  // を足してはならない（MUST NOT）」 -- and 「その行は既にこの面に在る」, which
  // `commandsOnSurface` emits without this file naming it.
  // STOP -- ⛔ THE FORMATS ABOVE GO OUT WITH NO WORDS. `display-words.json` has
  // a section per roster the specification already keeps -- one per row of table
  // T-109, the palette groups, the surfaces table T-103 has named, one per row
  // of tables T-037, T-233, T-234 and T-023, the two answers of NT-7, FR-032's
  // mark and FR-072's panel headings -- and NONE keyed on a row of table T-024.
  // So a person is offered six row ids and FR-038 (MUST NOT) forbids this unit
  // to write the six words itself. ⛔ What is owed is a section of the manuscript
  // keyed on those rows; the report names them. ⚠️ The heading is not among what
  // is missing -- U-54 has one, and it is filled.
  // ⚠️ The confirmation FR-099 requires before a deletion is NT-7 of table
  // T-037 and U-55 of table T-103, which are UF-67's; ⭐ the task names it must
  // show ARE carried here, on each roster entry, which is this unit's half of
  // that MUST. ⛔ What is still missing is the raiser, which `notices.ts`
  // records. Searched: the requirements listed above, tables T-037 / T-103 /
  // T-108 / T-109 / T-224, `icon-roster.json` and `screen-renderer.ts`.

  return { surface, heading, commands }
}
