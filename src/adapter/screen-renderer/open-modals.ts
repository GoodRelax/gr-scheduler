// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-66   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// Fills `ScreenView.openModal` only; the signature is fixed by the "nine unit
// contracts" section of `screen-renderer.ts`.
//
// `null` is the only spelling of "no surface open" (S-99g): a surface arriving
// with an empty name is passed on, not read as a second spelling of closed.
//
// A surface name is carried, never minted: only the names table T-103 settles
// are keyed on below, and `ScreenState.surface` otherwise travels untouched.
//
// Placement is read from the generated `icon-roster.json` (table T-109, FR-029)
// rather than re-typed (rule 03 section 1). IC-21 is the one entry placed
// twice; FR-038 puts its second place in the help, so it is added by hand.
//
// U-56 `Open Chooser` needs no payload: table T-109 places all of OP-3's
// entries on it. U-54 `Export Chooser` does, because FR-096 gives it a single
// entrance and its choices are rows of table T-024, not of table T-109.
// U-56 is not routed through UF-67's `Confirmation`: NT-7 has two answers and
// OP-3 has three.

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
// NT-7's two word buttons, read through UF-67 rather than a second reading
// (R2.7). Both units are ScreenRenderer's, so no table T-061 boundary is crossed.
import { confirmationAnswers, reasonSurfaceWords } from './notices'
import iconRoster from './icon-roster.json'
import exportFormats from './export-formats.json'
import displayWords from './display-words.json'
// FR-036's roster, generated; its words join to the dictionary by row id (FR-038).
import helpRoster from './help-roster.json'
// FR-069, generated from the repository's LICENSE and NOTICE.
import licence from './licence.json'

/** U-30 of table T-103, the help half; keyed on for IC-21's second place (FR-038). */
const HELP_MODAL = 'Help Modal'

/** U-30 of table T-103, the AI export half (FR-068). */
const AI_EXPORT_MODAL = 'AI Export Modal'
/** Table T-109, which the help roster names for a row that IS an entrance. */
const ICON_TABLE = 'T-109'

/**
 * IC-21 of table T-109 (FR-038). A row id because table T-109 has no English
 * column, so naming the icon here would settle a name the glossary has not.
 */
const DISPLAY_LANGUAGE_ICON: IconId = 'IC-21'

/** U-49 of table T-103 (FR-099). */
const RESOURCE_ROSTER = 'Resource Roster'

/** U-54 of table T-103 (FR-096). */
const EXPORT_CHOOSER = 'Export Chooser'

/**
 * U-60 of table T-103 (FR-020). Table T-109 places nothing on it, so
 * `commandsOnSurface` answers with nothing and Esc (IN-4) is the way out.
 */
const WATERMARK_UNLOCK = 'Watermark Unlock'

/**
 * U-61 of table T-103 (FR-022, FR-073). Its three answers are table T-109 rows
 * that `commandsOnSurface` emits; the branch exists for the candidates alone.
 */
const DIFFERENCE_REVIEW = 'Difference Review'

/**
 * U-62 of table T-103 (FR-023). Table T-109 places nothing on it (its entrance
 * is NT-8's word) and the dictionary holds no heading for it, so both are empty.
 */
const IMPORT_REPORT = 'Import Report'

/** Table T-233's row for U-62's sentence (FR-023); the words are the dictionary's (FR-038). */
const IMPORT_REPORT_REASON = 'RS-50'

/** Table T-233's row for U-61's unread-columns sentence (FR-073); words as above. */
const NEWER_FORMAT_VERSION_REASON = 'RS-48'

/**
 * RS-48's two strings for U-61, or two empty ones when every column was read.
 * Separate so the one emptiness test decides both strings.
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

/** Table T-234's row for U-60's question (FR-020, FR-076); words as above. */
const WATERMARK_UNLOCK_QUESTION = 'QN-9'

/**
 * Table T-234's words by row id. A `Map` because a description is built every
 * frame (NFR-013, rule 05). UF-67 keeps its own map for its own surface.
 */
const QUESTIONS_BY_ROW = new Map(displayWords.questions.map((entry) => [entry.rowId, entry]))

/**
 * FR-096's formats: membership and order are table T-024's, via the generated
 * `export-formats.json`, which holds only rows with an extension (so IO-5 and
 * IO-6 stay out without being named). A row with no word falls to `NO_WORDS`.
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
 * What an entry or heading says while the dictionary holds no word for it.
 * An empty cell means "not settled", not "print nothing"; a row added to table
 * T-109 or T-103 ahead of its word empties a cell again.
 */
const NO_WORDS = ''

// Words come from `display-words.json`, generated from `_source/display-words.json`
// (FR-038, Chapter 6.2): entries keyed by table T-109 row, headings by table T-103
// name. Like `iconRoster` it is a compiled module constant, so UF-66 stays `pure`.

/** `Map`s because a description is built every frame (NFR-013, rule 05). */
const WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))
const HEADINGS_BY_SURFACE = new Map(displayWords.surfaces.map((entry) => [entry.name, entry]))

/**
 * The accessible name of one entry (FR-038).
 *
 * `=== ''`, never `||` or `??`: an empty cell is unsettled, not a word. A row
 * missing from the dictionary altogether means a hand-edited generated file.
 *
 * @purity pure
 */
function entryLabel(icon: IconId, language: DisplayLanguage): string {
  const word = WORDS_BY_ROW.get(icon)?.label[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/** Table T-023's rows alone: the only ones with a second word, `press` (FR-036). */
const MOUSE_PRESS_BY_ROW = new Map(
  displayWords.assignments.map((entry) => [entry.rowId, entry]),
)

// The help's words by row id, over the sections its roster draws on. Palette
// entries are left out: their word is the `icons` label `entryLabel` reads, and
// adding them here would give one row two words.
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
 * Every row FR-036 puts on the help, in that requirement's order.
 *
 * The roster is generated (`tools/generate_help_roster.py`). A row naming
 * table T-109 takes its word from `icons`; every other row from its own
 * section, since a table T-023d row has no entrance to label. An unwritten
 * word shows nothing, never the row id.
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
    // FR-036: a row with neither key nor mouse operation leaves `press` null,
    // not a dash, which would read as SK-1's "assigned nothing".
    press: MOUSE_PRESS_BY_ROW.get(entry.row)?.press[language] ?? null,
    keys: entry.keys,
    icon: entry.icon as IconId | null,
  }))
}

/**
 * One row of table T-234 in the display language (FR-038), or the stand-in.
 *
 * `=== ''` for the reason `entryLabel` gives, and never the row id. No
 * fall-back row (unlike QN-8 in `notices.ts`): the one row read here is named
 * by FR-020, so a miss means a hand-edited generated file.
 *
 * @purity pure
 */
function questionTextOf(row: string, language: DisplayLanguage): string {
  const word = QUESTIONS_BY_ROW.get(row)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * The heading of one open surface (FR-038), or the stand-in.
 *
 * A surface with no table T-103 name, or with no heading in the dictionary's
 * `surfaces` section, gets the stand-in. A missing heading is owed by
 * `_source/display-words.json`, never by this unit or a hand edit.
 *
 * @purity pure
 */
function surfaceHeading(surface: string, language: DisplayLanguage): string {
  const word = HEADINGS_BY_SURFACE.get(surface)?.heading[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * One table T-109 entry on an open surface.
 *
 * `isEnabled` is true: closing (IC-52) and the language (IC-21) are always
 * usable, and OP-3 of table T-024a (MUST NOT) rules out an unpressable half of
 * its choice. `isPressed` is false: nothing on an open surface stays pressed.
 *
 * STOP -- not reachable from these arguments: whether IC-63 .. IC-68 may be
 * pressed (FR-029's faint state). None of `state`, `schedule` or `session`
 * carries what those six read. Searched: FR-029, FR-099, table T-108 (CM-42,
 * CM-43) and table T-109.
 *
 * @purity pure
 */
function commandItemFor(icon: IconId, language: DisplayLanguage): CommandItem {
  // `isArmed` is false: table T-109's arm column (FR-053) is empty for every row
  // off the `Command Palette`.
  return {
    icon,
    isEnabled: true,
    isPressed: false,
    isArmed: false,
    label: entryLabel(icon, language),
  }
}

/**
 * The entries table T-109 places on one surface, in that table's order (FR-029,
 * rule 03 section 4), plus IC-21 inside the help (FR-038).
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
 * For each resource an assignment refers to, the tasks deleting it would
 * unassign (CD-5 of table T-050, FR-099).
 *
 * Joined on `resourceUid`, never the name (AS-6, AS-8 of table T-225): a name
 * join would let a referenced resource hide an unreferenced twin from the
 * deletion. AS-8's smaller-uid rule is not needed: nothing arrives by name here.
 * An assignment with no `taskUid` still marks its resource referenced.
 * One pass into a `Map` (NFR-013, rule 05).
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
 * A nameless task keeps its `null`, so the list is as long as what the
 * deletion touches; a `taskUid` with no `Task` is left out so it cannot pass
 * for a nameless one. The assignments' own order is kept (rule 03 section 4).
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
 * Every resource, in document order: FR-059's work-resources-only rule is the
 * assignee label's, and leaving a kind out here would make it undeletable.
 * Same-named resources stay two rows (see `tasksReachedByEachResource`).
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
 * The surface open this frame, or `null` while S-99g says none is.
 *
 * `surface` passes through unchanged. A surface table T-103 does not name gets
 * no commands, since table T-109 cannot place anything on it; Esc still
 * closes it (IN-4 of table T-028).
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

  // FR-038: the language is carried from the one screen-wide state, as
  // `screenViewFromRegions` does, and never decided here.
  if (surface === HELP_MODAL) {
    return {
      surface: HELP_MODAL,
      heading,
      commands,
      language: session.language,
      entries: helpEntries(session.language),
      // FR-069: carried whole, not summarised.
      licenceText: licence.licenceText,
      copyrightNotice: licence.copyrightNotice,
      attributions: licence.attributions,
    }
  }

  // FR-099: the document's assignees, read from `schedule`, not from the screen.
  if (surface === RESOURCE_ROSTER) {
    return {
      surface: RESOURCE_ROSTER,
      heading,
      commands,
      resources: rosterResourcesOf(schedule, session),
    }
  }

  // FR-096. The formats do not depend on the document, and which of them can be
  // used now is not stated. Searched: FR-096, table T-024, table T-024a and
  // table T-109.
  if (surface === EXPORT_CHOOSER) {
    return {
      surface: EXPORT_CHOOSER,
      heading,
      commands,
      formats: exportFormatChoices(session.language),
    }
  }

  // FR-020: QN-9 of table T-234 and its two word buttons. What is typed is not
  // carried (AG-11, LY-5 of table T-060), only that the field exists; nor is the
  // digest, since a description can reach an export (table T-076).
  // `heading` is empty: the dictionary holds no heading for U-60, and one written
  // here would be a second word store (FR-038).
  if (surface === WATERMARK_UNLOCK) {
    return {
      surface: WATERMARK_UNLOCK,
      heading,
      // Empty: no table T-109 row names this surface. Closing it may not hide the
      // watermark (FR-020), which holds because this side writes nothing.
      commands,
      question: questionTextOf(WATERMARK_UNLOCK_QUESTION, session.language),
      answers: confirmationAnswers(session.language),
    }
  }

  // FR-022: the candidates are carried even when empty (a merge with nothing to
  // ask about, not a list left unfilled). Read from the session, not `schedule`:
  // the incoming file is not in the schedule, and PI-10's pairing is held by the
  // shell (LY-5 of table T-060). Names are document values, untranslated.
  if (surface === DIFFERENCE_REVIEW) {
    return {
      surface: DIFFERENCE_REVIEW,
      heading,
      commands,
      candidates: session.mergeCandidates ?? [],
      // FR-073: from the session for the same reason (PI-20), and carried even
      // when empty.
      unreadColumns: session.unreadColumns ?? [],
      // RS-48's words only when something went unread (FR-073), read through
      // `reasonSurfaceWords` as U-62 does (R2.7). `dismissText` is dropped: U-61 is
      // answered by its three table T-109 entries, and an `OK` would be a fourth.
      ...unreadWords(session),
    }
  }

  // FR-023: the dropped names, one entry each, never a count, untranslated.
  // Read from the session: no document holds rows the import did not take
  // (LY-5 of table T-060). The three strings that are words come from `notices.ts`.
  if (surface === IMPORT_REPORT) {
    return {
      surface: IMPORT_REPORT,
      heading,
      commands,
      // Carried even when empty, as above.
      droppedTaskNames: session.droppedTaskNames ?? [],
      ...reasonSurfaceWords(IMPORT_REPORT_REASON, session.language),
    }
  }

  // FR-068: the document is `ScreenSession.aiExportDocument`, filled by the
  // shell that holds the whole `Document`; nothing is formatted here. An absent
  // member falls through to the catch-all, because `documentText: ''` would
  // claim the document is empty. The copy entrance (IC-52) is already in
  // `commands`; what a press spends is the shell's (CHN-9 of table T-008).
  if (surface === AI_EXPORT_MODAL && session.aiExportDocument !== undefined) {
    return {
      surface: AI_EXPORT_MODAL,
      heading,
      commands,
      documentText: session.aiExportDocument,
    }
  }

  // STOP -- FR-074's and FR-088's surfaces are not filled here and land in the
  // catch-all member. FR-074 needs table T-224's rows, which are not generated
  // into `src/`; FR-088 needs the calendar FR-054 resolves, which nothing in
  // this component resolves. Open: PND-140. Searched: FR-074, FR-088, tables
  // T-103 / T-224, `screen-renderer.ts` and `tools/`.
  // FR-099's confirmation (NT-7, U-55) is UF-67's; this unit carries the task
  // names on each roster entry, and the missing raiser is recorded in `notices.ts`.

  return { surface, heading, commands }
}
