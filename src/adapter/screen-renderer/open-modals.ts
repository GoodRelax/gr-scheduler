// Fills the open surface of the screen description.
// @unit      UF-66   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

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
import { confirmationAnswers, reasonSurfaceWords } from './notices'
import iconRoster from './icon-roster.json'
import exportFormats from './export-formats.json'
import displayWords from './display-words.json'
import helpRoster from './help-roster.json'
import licence from './licence.json'

const HELP_MODAL = 'Help Modal'

const AI_EXPORT_MODAL = 'AI Export Modal'
const ICON_TABLE = 'T-109'

const DISPLAY_LANGUAGE_ICON: IconId = 'IC-21'

const RESOURCE_ROSTER = 'Resource Roster'

const EXPORT_CHOOSER = 'Export Chooser'

const WATERMARK_UNLOCK = 'Watermark Unlock'

const DIFFERENCE_REVIEW = 'Difference Review'

const IMPORT_REPORT = 'Import Report'

const IMPORT_REPORT_REASON = 'RS-50'

const NEWER_FORMAT_VERSION_REASON = 'RS-48'

// see FR-073
/** @purity pure */
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

const WATERMARK_UNLOCK_QUESTION = 'QN-9'

const QUESTIONS_BY_ROW = new Map(displayWords.questions.map((entry) => [entry.rowId, entry]))

const FORMAT_NAME_BY_ROW = new Map(
  displayWords.exportFormats.map((entry) => [entry.rowId, entry]),
)

// see FR-096
/** @purity pure */
function exportFormatChoices(
  language: DisplayLanguage,
): readonly ExportFormatChoice[] {
  return exportFormats.formats.map((one) => ({
    row: one.rowId,
    name: FORMAT_NAME_BY_ROW.get(one.rowId)?.name[language] ?? NO_WORDS,
    extension: one.extension,
  }))
}

const NO_WORDS = ''

const WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))
const HEADINGS_BY_SURFACE = new Map(displayWords.surfaces.map((entry) => [entry.name, entry]))

/** @purity pure */
function entryLabel(icon: IconId, language: DisplayLanguage): string {
  const word = WORDS_BY_ROW.get(icon)?.label[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

const MOUSE_PRESS_BY_ROW = new Map(
  displayWords.assignments.map((entry) => [entry.rowId, entry]),
)

// TRAP: palette entries stay out; their word is the icons label, and a row has one word.
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

// see FR-036
/** @purity pure */
function helpEntries(language: DisplayLanguage): readonly HelpEntry[] {
  return helpRoster.entries.map((entry) => ({
    table: entry.table,
    row: entry.row,
    text:
      entry.table === ICON_TABLE
        ? entryLabel(entry.row as IconId, language)
        : (HELP_WORDS_BY_ROW.get(entry.row)?.text[language] ?? NO_WORDS),
    press: MOUSE_PRESS_BY_ROW.get(entry.row)?.press[language] ?? null,
    keys: entry.keys,
    icon: entry.icon as IconId | null,
  }))
}

/** @purity pure */
function questionTextOf(row: string, language: DisplayLanguage): string {
  const word = QUESTIONS_BY_ROW.get(row)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/** @purity pure */
function surfaceHeading(surface: string, language: DisplayLanguage): string {
  const word = HEADINGS_BY_SURFACE.get(surface)?.heading[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

// WHY: always enabled; what the roster entries' faint state reads is not in these arguments.
/** @purity pure */
function commandItemFor(icon: IconId, language: DisplayLanguage): CommandItem {
  return {
    icon,
    isEnabled: true,
    isPressed: false,
    isArmed: false,
    label: entryLabel(icon, language),
  }
}

// see FR-029
/** @purity pure */
function commandsOnSurface(surface: string, language: DisplayLanguage): readonly CommandItem[] {
  return iconRoster.icons
    .filter(
      (row) =>
        row.surfaces.includes(surface) ||
        (row.rowId === DISPLAY_LANGUAGE_ICON && surface === HELP_MODAL),
    )
    .map((row) => commandItemFor(row.rowId, language))
}

// see CD-5
// TRAP: join on resourceUid, never the name, or a referenced twin hides an unreferenced one.
/** @purity pure */
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

/** @purity pure */
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

// see FR-099
// TRAP: list every resource kind; one left out could never be deleted.
/** @purity pure */
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

// see FR-029, FR-038
/** @purity pure */
export function openModalFromScreenState(
  state: ScreenState,
  schedule: Schedule,
  session: ScreenSession,
): OpenModal | null {
  const surface = state.surface
  if (surface === null) return null

  const commands = commandsOnSurface(surface, session.language)
  const heading = surfaceHeading(surface, session.language)

  if (surface === HELP_MODAL) {
    return {
      surface: HELP_MODAL,
      heading,
      commands,
      language: session.language,
      entries: helpEntries(session.language),
      licenceText: licence.licenceText,
      copyrightNotice: licence.copyrightNotice,
      attributions: licence.attributions,
    }
  }

  if (surface === RESOURCE_ROSTER) {
    return {
      surface: RESOURCE_ROSTER,
      heading,
      commands,
      resources: rosterResourcesOf(schedule, session),
    }
  }

  if (surface === EXPORT_CHOOSER) {
    return {
      surface: EXPORT_CHOOSER,
      heading,
      commands,
      formats: exportFormatChoices(session.language),
    }
  }

  if (surface === WATERMARK_UNLOCK) {
    return {
      surface: WATERMARK_UNLOCK,
      heading,
      commands,
      question: questionTextOf(WATERMARK_UNLOCK_QUESTION, session.language),
      answers: confirmationAnswers(session.language),
    }
  }

  if (surface === DIFFERENCE_REVIEW) {
    return {
      surface: DIFFERENCE_REVIEW,
      heading,
      commands,
      candidates: session.mergeCandidates ?? [],
      unreadColumns: session.unreadColumns ?? [],
      ...unreadWords(session),
    }
  }

  if (surface === IMPORT_REPORT) {
    return {
      surface: IMPORT_REPORT,
      heading,
      commands,
      droppedTaskNames: session.droppedTaskNames ?? [],
      ...reasonSurfaceWords(IMPORT_REPORT_REASON, session.language),
    }
  }

  // TRAP: an absent aiExportDocument falls to the catch-all; an empty text claims an empty document.
  if (surface === AI_EXPORT_MODAL && session.aiExportDocument !== undefined) {
    return {
      surface: AI_EXPORT_MODAL,
      heading,
      commands,
      documentText: session.aiExportDocument,
    }
  }

  // WHY: two surfaces fall to the catch-all; the rows and calendar they need do not reach src/.

  return { surface, heading, commands }
}
