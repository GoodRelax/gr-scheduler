// Fills the open surface of the screen description.
// @unit      UF-66   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import type { Assignment, Schedule, Task } from '../../entity/document-model/schedule/schedule'
import type { ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import type {
  CommandItem,
  DisplayLanguage,
  HelpEntry,
  ExportFormatChoice,
  IconId,
  LinkedWords,
  OpenModal,
  RosterResource,
  ScreenViewReadings,
} from './screen-renderer'
import { displayLanguageOf } from './screen-renderer'
import { confirmationAnswers, reasonNextStepLink, reasonSurfaceWords } from './notices'
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

// see U-60, T-280
const WATERMARK_UNLOCK_ROW = 'U-60'

const DIFFERENCE_REVIEW = 'Difference Review'

const IMPORT_REPORT = 'Import Report'

const IMPORT_REPORT_REASON = 'RS-50'

const NEWER_FORMAT_VERSION_REASON = 'RS-48'

// see FR-073
/** @purity pure */
function unreadWords(readings: ScreenViewReadings, language: DisplayLanguage): {
  readonly unreadText: string
  readonly unreadNextStep: string
  readonly unreadNextStepLink?: LinkedWords
} {
  if ((readings.unreadColumns ?? []).length === 0) {
    return { unreadText: '', unreadNextStep: '' }
  }
  const said = reasonSurfaceWords(NEWER_FORMAT_VERSION_REASON, language)
  const link = reasonNextStepLink(NEWER_FORMAT_VERSION_REASON, language)
  return {
    unreadText: said.text,
    unreadNextStep: said.nextStep,
    ...(link === null ? {} : { unreadNextStepLink: link }),
  }
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

const SHORTCUT_WORDS_BY_ROW = new Map(
  displayWords.shortcuts.map((entry) => [entry.rowId, entry]),
)

const HELP_HEADINGS_BY_BLOCK = new Map(
  displayWords.helpHeadings.map((entry) => [entry.block, entry]),
)

const HELP_NOTES_BY_ROW = new Map(displayWords.helpNotes.map((entry) => [entry.rowId, entry]))

const BROWSER_FUNCTION_WORDS_BY_ROW = new Map(
  displayWords.browserFunctions.map((entry) => [entry.rowId, entry]),
)

const ASSIGNMENT_TABLE = 'T-023'

const BROWSER_FUNCTION_TABLE = 'T-255'

type HelpRosterEntry = (typeof helpRoster.entries)[number]

// see FR-036
/** @purity pure */
function withNote(label: string, note: string | null, language: DisplayLanguage): string {
  if (note === null) return label
  const word = HELP_NOTES_BY_ROW.get(note)?.text[language]
  return word === undefined || word === '' ? label : `${label} ${word}`
}

// see FR-036, FR-038
// TRAP: an item's word is its own row's; an entrance item takes the icon label, never a shortcut word.
/** @purity pure */
function helpText(entry: HelpRosterEntry, language: DisplayLanguage): string {
  if (entry.kind === 'heading') {
    return HELP_HEADINGS_BY_BLOCK.get(entry.row)?.text[language] ?? NO_WORDS
  }
  if (entry.table === ICON_TABLE) return withNote(entryLabel(entry.row, language), entry.note, language)
  if (entry.table === ASSIGNMENT_TABLE) {
    return MOUSE_PRESS_BY_ROW.get(entry.row)?.text[language] ?? NO_WORDS
  }
  if (entry.table === BROWSER_FUNCTION_TABLE) {
    return BROWSER_FUNCTION_WORDS_BY_ROW.get(entry.row)?.text[language] ?? NO_WORDS
  }
  return SHORTCUT_WORDS_BY_ROW.get(entry.row)?.text[language] ?? NO_WORDS
}

/** @purity pure */
function helpPress(entry: HelpRosterEntry, language: DisplayLanguage): string | null {
  if (entry.press === null) return null
  const word = MOUSE_PRESS_BY_ROW.get(entry.press)?.press[language]
  return word === undefined || word === '' ? null : word
}

// see FR-036
/** @purity pure */
function helpEntries(language: DisplayLanguage): readonly HelpEntry[] {
  return helpRoster.entries.map((entry) => ({
    table: entry.table,
    row: entry.row,
    text: helpText(entry, language),
    press: helpPress(entry, language),
    keys: entry.keys,
    icon: entry.kind === 'item' && entry.table === ICON_TABLE ? entry.row : null,
    kind: entry.kind,
    column: entry.column,
    block: entry.block,
    segment: entry.segment,
    glyphs: entry.glyphs,
    indent: entry.indent,
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

// DEVIATION: spec says an entry that can change nothing is drawn faint (FR-029); here roster entries never are (DFC-567)
/** @purity pure */
function commandItemFor(icon: IconId, language: DisplayLanguage): CommandItem {
  return {
    icon,
    isEnabled: true,
    isPressed: false,
    isArmed: false,
    isChosen: false,
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
function rosterResourcesOf(
  schedule: Schedule,
  readings: ScreenViewReadings,
): readonly RosterResource[] {
  const tasksReached = tasksReachedByEachResource(schedule.assignments)
  const tasksByUid = new Map<number, Task>(schedule.tasks.map((task) => [task.uid, task]))
  const selectedUids = new Set<number>(readings.selectedResourceUids)

  return schedule.resources.map((resource) => ({
    uid: resource.uid,
    name: resource.name,
    isReferenced: tasksReached.has(resource.uid),
    isSelected: selectedUids.has(resource.uid),
    unassignedTaskNames: unassignedTaskNamesOf(tasksReached.get(resource.uid), tasksByUid),
  }))
}

// DEVIATION: spec says a surface is named by its U row (T-280); here only U-60 is, by the state machine (DFC-703)
/** @purity pure */
function openSurfaceNameOf(session: ScreenSession): string | null {
  const open = session.screen.openSurfaceState
  if (open.kind === 'closed') return null
  return open.surfaceName === WATERMARK_UNLOCK_ROW ? WATERMARK_UNLOCK : open.surfaceName
}

// see FR-029, FR-038
/** @purity pure */
export function openModalFromSession(
  session: ScreenSession,
  schedule: Schedule,
  readings: ScreenViewReadings,
): OpenModal | null {
  const surface = openSurfaceNameOf(session)
  if (surface === null) return null
  const language = displayLanguageOf(session)
  const commands = commandsOnSurface(surface, language)
  const heading = surfaceHeading(surface, language)

  if (surface === HELP_MODAL) {
    return {
      surface: HELP_MODAL,
      heading,
      commands,
      language,
      entries: helpEntries(language),
      legend: helpRoster.legend,
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
      resources: rosterResourcesOf(schedule, readings),
    }
  }

  if (surface === EXPORT_CHOOSER) {
    return {
      surface: EXPORT_CHOOSER,
      heading,
      commands,
      formats: exportFormatChoices(language),
    }
  }

  if (surface === WATERMARK_UNLOCK) {
    return {
      surface: WATERMARK_UNLOCK,
      heading,
      commands,
      question: questionTextOf(WATERMARK_UNLOCK_QUESTION, language),
      answers: confirmationAnswers(language),
    }
  }

  if (surface === DIFFERENCE_REVIEW) {
    return {
      surface: DIFFERENCE_REVIEW,
      heading,
      commands,
      candidates: readings.mergeCandidates ?? [],
      unreadColumns: readings.unreadColumns ?? [],
      ...unreadWords(readings, language),
    }
  }

  if (surface === IMPORT_REPORT) {
    return {
      surface: IMPORT_REPORT,
      heading,
      commands,
      droppedTaskNames: readings.droppedTaskNames ?? [],
      ...reasonSurfaceWords(IMPORT_REPORT_REASON, language),
    }
  }

  // TRAP: an absent aiExportDocument falls to the catch-all; an empty text claims an empty document.
  if (surface === AI_EXPORT_MODAL && readings.aiExportDocument !== undefined) {
    return {
      surface: AI_EXPORT_MODAL,
      heading,
      commands,
      documentText: readings.aiExportDocument,
    }
  }

  // STOP: spec does not decide what the two unnamed surfaces carry. Looked in T-103, FR-074, FR-088
  // @provisional PND-140

  return { surface, heading, commands }
}
