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
// ⭐ ONE SURFACE NOW HAS SOMEWHERE TO PUT WHAT IT SHOWS. `OpenModal` has become
// a union discriminated on `surface`, and the `Resource Roster` (U-49) member
// carries the roster FR-099 asks for, which this unit fills below. The four
// other surfaces still come back with the three members every surface has; the
// STOP note in the body says what each of them would need, and what FR-099
// asks for that even the widened type cannot hold.

import type { Assignment, Schedule, Task } from '../../entity/document-model/schedule/schedule'
import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
import type {
  CommandItem,
  IconId,
  OpenModal,
  RosterResource,
  ScreenSession,
} from './screen-renderer'
import iconRoster from './icon-roster.json'

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
 * ⛔ NO WORDS HAVE BEEN SETTLED. See the STOP note on the words below: this
 * stands for "nothing to say yet", not for "say nothing".
 */
const NO_WORDS = ''

// STOP -- ⚠️ NOT DECIDED BY THE SPECIFICATION: the words. `OpenModal.heading`
// and `CommandItem.label` are both declared to be in the display language, and
// FR-038 (MUST) requires menus and panels to be shown in the chosen language --
// but no table holds a translated string. `screen-renderer.ts` records the same
// hole on `CommandItem.label` and says the words arrive already chosen; none of
// the three arguments this unit is handed carries any (`ScreenSession` carries
// `language`, which is the choice, not the text), so here they arrive from
// nowhere. Searched: FR-038, FR-036, FR-068, FR-074, FR-088, FR-099, table
// T-103 (a glossary of settled names, whose Japanese column is prose rather
// than screen text), table T-109 (no English column, in as many words) and
// `_assets/tbl-settings.md` (no row for any wording). The empty string is
// chosen because it says no words have been settled, which is what is true of
// this build; any English or Japanese written here would settle wording the
// glossary has not, in the one unit that is forbidden to mint names.
// ⛔ FR-038 also requires the CURRENT language to be readable BEFORE the toggle
// is pressed (MUST). `CommandItem` has three members and none of them can carry
// it -- `isPressed` is declared as "a toggle that is on", and a choice between
// two languages has no off. That MUST is unmet until `OpenModal` is widened.

/**
 * One entry of table T-109 as it stands on an open surface.
 *
 * `isEnabled` is true for every entry this unit emits: both of them -- closing
 * the surface (IC-52) and choosing the display language (IC-21) -- can always
 * be done while the surface is up, so FR-029's faint-and-explained state never
 * applies to them. `isPressed` is false for the same reason it is not read: an
 * open surface has nothing that stays pressed. ⚠️ The language entry is the
 * exception the STOP note above describes, not a case handled here.
 *
 * @purity pure
 */
function commandItemFor(icon: IconId): CommandItem {
  return { icon, isEnabled: true, isPressed: false, label: NO_WORDS }
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
function commandsOnSurface(surface: string): readonly CommandItem[] {
  return iconRoster.icons
    .filter(
      (row) =>
        row.surfaces.includes(surface) ||
        (row.rowId === DISPLAY_LANGUAGE_ICON && surface === HELP_MODAL),
    )
    .map((row) => commandItemFor(row.rowId))
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
 * ⚠️ Every surface but the two U-30 names comes back with no commands at all,
 * and that is what the specification says rather than an omission: table T-109
 * places IC-52 on those two and FR-029 forbids minting a row for the rest. Esc
 * still closes them (IN-4 of table T-028), so none of them traps a reader.
 *
 * ⭐ The `Resource Roster` (U-49) also carries what FR-099 shows on it. It is
 * the only one of the five that does; the STOP note below says why.
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

  const commands = commandsOnSurface(surface)

  // FR-099 (MUST): the roster is the list of assignees the DOCUMENT holds, so
  // it is read from `schedule` and never from what happens to be on screen.
  if (surface === RESOURCE_ROSTER) {
    return {
      surface: RESOURCE_ROSTER,
      heading: NO_WORDS,
      commands,
      resources: rosterResourcesOf(schedule, session),
    }
  }

  // STOP -- ⛔ NOT MODELLED, AND THIS UNIT MAY NOT ADD IT: what the four other
  // surfaces show. `OpenModal` declares a payload for each of them, and
  // `screen-renderer.ts` (which siblings are writing, so it is not edited from
  // here) is where they stand; none is filled here, so a description of one of
  // them lands in the union's catch-all member. Each line below is what a
  // requirement asks for and what would have to exist before it could be built:
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
  // ⛔ WHAT FR-099 STILL ASKS FOR AND NO MEMBER CAN HOLD: its four operations --
  // select all, clear the selection, delete the resources no assignment refers
  // to (CM-43 of table T-108), delete the selected ones (CM-42) -- and the
  // command palette entry FR-099 fixes as the way in (MUST). None can be a
  // `CommandItem`: table T-109 is the whole of the icons (FR-029, MUST) and
  // holds no row for any of the five, so emitting one would mint an icon. The
  // same holds for FR-068's copy control. ⚠️ The confirmation FR-099 requires
  // before a deletion has no member either; table T-037 has no row for asking,
  // only for telling. ⭐ The task names that confirmation must show ARE carried,
  // on each roster entry, which is the half of that MUST NOT this unit can meet.
  // Searched: the requirements listed above, tables T-037 / T-103 / T-108 /
  // T-109 / T-224, and `screen-renderer.ts`.

  return { surface, heading: NO_WORDS, commands }
}
