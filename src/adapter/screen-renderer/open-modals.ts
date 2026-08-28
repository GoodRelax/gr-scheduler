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
// ⭐ TWO SURFACES HAVE SOMEWHERE TO PUT WHAT THEY SHOW. `OpenModal` is a
// union discriminated on `surface`: the `Resource Roster` (U-49) member carries
// the roster FR-099 asks for and the `Export Chooser` (U-54) member carries the
// formats FR-096 asks for, and this unit fills both below.
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
  ExportFormatId,
  IconId,
  OpenModal,
  RosterResource,
  ScreenSession,
} from './screen-renderer'
import iconRoster from './icon-roster.json'
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
 * FR-096 (MUST): the rows of table T-024 whose direction column gives them an
 * out direction, in that table's own print order (rule 03 section 4).
 *
 * ⛔ RE-TYPED, WHICH RULE 03 SECTION 1 FORBIDS FOR ANYTHING THE SPECIFICATION
 * HOLDS, and written all the same because the alternative breaks a MUST outright
 * rather than risking it. Table T-024 IS read by a generator --
 * `tools/generate_exchange_formats.py` -- but that one keeps only the two rows
 * OP-1 of table T-024a accepts on intake, and writes them into
 * `src/adapter/document-codec/exchange-formats.json`, which is another
 * component's file that `_source/components.json` gives this one no edge to. So
 * neither the direction column nor a roster built from it reaches this folder,
 * and an empty roster here would say the table gives no format an out direction,
 * which is a different untruth from a stale one.
 *
 * ⭐ THE DRIFT IS MACHINE-CHECKED MEANWHILE, which is what makes the risk
 * bearable: `tests/unit/uf-47-48-choosers.test.ts` reads the direction column
 * out of the manuscript every run and fails when a row it names is missing from
 * the description this unit builds. ⛔ What is owed is still a generated roster
 * beside `icon-roster.json`, so that the row ids below stop being a copy.
 *
 * ⛔ ONLY THE ROW IDS ARE HERE. No format name, no extension and no direction
 * word is written out -- FR-096 (MUST NOT) puts the extensions in table T-024
 * alone, and a row id is a join rather than a value (the move
 * `DISPLAY_LANGUAGE_ICON` above makes with IC-21).
 * ⚠️ IO-5 IS LEFT OUT ON PURPOSE and is not an oversight: its direction column
 * is the pair table T-024 gives the automatic save and the recovery from it, and
 * neither is a direction FR-096 offers.
 */
const EXPORT_FORMAT_ROWS: readonly ExportFormatId[] = [
  'IO-1',
  'IO-2',
  'IO-3',
  'IO-4',
  'IO-7',
  'IO-6',
]

/**
 * What an entry or a heading says while the dictionary holds no word for it.
 *
 * ⛔ NOT "SAY NOTHING". An empty cell of `display-words.json` says that no word
 * has been SETTLED yet (PD-160), which is a different thing from a settled word
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
// no longer answers for any of them (PD-160 is settled). Reading `displayWords`
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
 * thing, and PD-160 is precisely the difference: an empty cell is UNSETTLED, not
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
 * ⛔ A ROW WHOSE WORD IS UNWRITTEN SHOWS NOTHING RATHER THAN ITS ROW ID, the
 * reading PD-160 fixes for every other surface. ⚠️ Every row is written today.
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
    keys: entry.keys,
    icon: entry.icon as IconId | null,
  }))
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

  // FR-096 (MUST): every format table T-024 gives an out direction is offered
  // here, because table T-109 places no entrance for one and FR-096 (MUST NOT)
  // forbids adding one per format. ⛔ The formats do not depend on the document,
  // so nothing is read from `schedule`: which formats exist is the table's
  // answer, and which of them can be used now is a judgement no argument here
  // carries -- ⛔ nor does the specification state one. Searched: FR-096, table
  // T-024, table T-024a and table T-109.
  if (surface === EXPORT_CHOOSER) {
    return { surface: EXPORT_CHOOSER, heading, commands, formats: EXPORT_FORMAT_ROWS }
  }

  // STOP -- ⛔ NOT MODELLED, AND THIS UNIT MAY NOT ADD IT: what the four other
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
  //   FR-068, `AI Export Modal` (U-30): the document that would be handed to an
  //     AI, which is built outside this component and does not arrive here.
  // ⭐ WHAT FR-099 ASKS FOR NOW HAS ENTRIES, and they arrive by the road every
  // other entry does: table T-109 places IC-63 .. IC-68 on U-49 and IC-62 in
  // the `Command Palette`, so `commandsOnSurface` above emits the six without
  // this file naming one. ⛔ So none of them is minted here, and the note that
  // said they could not exist is gone because the rows now do.
  // ⚠️ FR-068's copy control is still owed one: table T-109 places nothing but
  // IC-52 on the `AI Export Modal`, and FR-029 (MUST) forbids minting a row.
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
