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
  HelpFootnote,
  HelpModal,
  HelpWindowArea,
  ExportFormatChoice,
  IconId,
  LinkedWords,
  OpenChooser,
  OpenModal,
  RosterResource,
  ScreenViewReadings,
} from './screen-renderer'
import { displayLanguageOf } from './screen-renderer'
import { confirmationAnswers, linkedWordsOf, reasonNextStepLink, reasonSurfaceWords } from './notices'
import { iconHint } from './tooltips'
import iconRoster from './icon-roster.json'
import exportFormats from './export-formats.json'
import displayWords from './display-words.json'
import helpRoster from './help-roster.json'
import licence from './licence.json'

const HELP_MODAL = 'Help Modal'

const ICON_TABLE = 'T-109'

// see WB-4
const MAXIMISE_ICON: IconId = 'IC-130'
const RESTORE_ICON: IconId = 'IC-131'

const RESOURCE_ROSTER = 'Resource Roster'

const EXPORT_CHOOSER = 'Export Chooser'

const OPEN_CHOOSER = 'Open Chooser'

const CLOSE_SURFACE_ENTRY: IconId = 'IC-52'

const ROSTER_CHOOSE_ALL_ENTRY: IconId = 'IC-63'
const ROSTER_CLEAR_CHOSEN_ENTRY: IconId = 'IC-64'
const ROSTER_CHOOSE_UNREFERENCED_ENTRY: IconId = 'IC-65'
const ROSTER_DELETE_ENTRY: IconId = 'IC-66'

// see FR-035, OP-16, PI-37
export const UNTITLED_DOCUMENT_TITLE = 'Untitled'

const OPEN_CHOOSER_WORDS_BY_PART = new Map(displayWords.openChooser.map((entry) => [entry.part, entry]))

const HELP_LEGAL_WORDS_BY_PART = new Map(displayWords.helpLegal.map((entry) => [entry.part, entry]))

const WATERMARK_UNLOCK = 'Watermark Unlock'

// see U-60, T-280
const WATERMARK_UNLOCK_ROW = 'U-60'

const DIFFERENCE_REVIEW = 'Difference Review'

const IMPORT_REPORT = 'Import Report'

const IMPORT_REPORT_REASON = 'RS-50'

// see MG-14, U-62
const MISSING_TASKS_REASON = 'RS-73'

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

// see MG-14, U-62, RS-73
// WHY: a reason with no names has no words on the surface (MG-14 tells no zero count).
/** @purity pure */
function missingWords(readings: ScreenViewReadings, language: DisplayLanguage): {
  readonly missingTaskNames: readonly (string | null)[]
  readonly missingText: string
  readonly missingNextStep: string
} {
  const missingTaskNames = readings.missingTaskNames ?? []
  if (missingTaskNames.length === 0) return { missingTaskNames, missingText: '', missingNextStep: '' }
  const said = reasonSurfaceWords(MISSING_TASKS_REASON, language)
  return { missingTaskNames, missingText: said.text, missingNextStep: said.nextStep }
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

// see FN-1
const FILE_NAME_REPLACED = /[\s\\/:*?"<>|\x00-\x1f\x7f]/g

// see FN-2
const FILE_NAME_DROPPED = /[^\x00-\x7f]/g

const FILE_NAME_RUNS = /_+/g

const FILE_NAME_ENDS = /^[_. ]+|[_. ]+$/g

const FILE_NAME_JOINER = '_'

// see FN-5
const FILE_NAME_WHEN_EMPTY = 'schedule'

// see T-352, FR-096, RW-7
/** @purity pure */
export function exportNameBodyOf(documentName: string): string {
  return documentName
    .replace(FILE_NAME_REPLACED, FILE_NAME_JOINER)
    .replace(FILE_NAME_DROPPED, NO_WORDS)
    .replace(FILE_NAME_RUNS, FILE_NAME_JOINER)
    .replace(FILE_NAME_ENDS, NO_WORDS)
}

// see FR-096, FN-5
/** @purity pure */
export function exportFileNameOf(documentName: string, extension: string): string {
  const body = exportNameBodyOf(documentName)
  return `${body === NO_WORDS ? FILE_NAME_WHEN_EMPTY : body}${extension}`
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

// see FR-036, FR-073
/** @purity pure */
function helpFootnotes(language: DisplayLanguage): readonly HelpFootnote[] {
  return displayWords.helpFootnotes.map((footnote) => {
    const word = footnote.text[language]
    return linkedWordsOf(word) ?? { before: word, address: NO_WORDS, after: NO_WORDS }
  })
}

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
    .filter((row) => row.surfaces.includes(surface))
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

// see FR-029, FR-099, IC-63, IC-64, IC-65, IC-66
// WHY: counted on the drawn roster (FR-029); IC-65 replaces the choice, so it is idle once the
// choice already is exactly the unreferenced resources.
// DEVIATION: spec says a faint entrance tells its reason when pressed (FR-029); here a faint IC-63..IC-65 tells none (DFC-567)
/** @purity pure */
function hasRosterTarget(icon: IconId, resources: readonly RosterResource[]): boolean {
  const isChosenSome = resources.some((one) => one.isSelected)
  if (icon === ROSTER_CHOOSE_ALL_ENTRY) return resources.some((one) => !one.isSelected)
  if (icon === ROSTER_CLEAR_CHOSEN_ENTRY || icon === ROSTER_DELETE_ENTRY) return isChosenSome
  if (icon !== ROSTER_CHOOSE_UNREFERENCED_ENTRY) return true
  const hasUnreferenced = resources.some((one) => !one.isReferenced)
  return hasUnreferenced && resources.some((one) => one.isSelected === one.isReferenced)
}

// see FR-069
/** @purity pure */
function helpLegalWords(language: DisplayLanguage): HelpModal['helpLegal'] {
  return {
    licensedUnder: HELP_LEGAL_WORDS_BY_PART.get('licensedUnder')?.text[language] ?? NO_WORDS,
    fullText: HELP_LEGAL_WORDS_BY_PART.get('fullText')?.text[language] ?? NO_WORDS,
  }
}

// see OP-16
/** @purity pure */
function openChooserWord(part: string, language: DisplayLanguage): string {
  return OPEN_CHOOSER_WORDS_BY_PART.get(part)?.text[language] ?? NO_WORDS
}

// see OP-16, AM-8
// WHY: read off the state that raised the chooser, so the rows keep what was read while it stands.
/** @purity pure */
function incomingFileOf(session: ScreenSession): OpenChooser['incomingFile'] {
  const state = session.fileFlow.fileOperationState
  if (state.kind !== 'awaitingOpenChoice') return null
  const read = state.incomingFile
  return { fileName: read.fileName, byteLength: read.byteLength, documentTitle: read.documentTitle ?? UNTITLED_DOCUMENT_TITLE }
}

// see OP-16, FR-029, EZ-2
/** @purity pure */
function openChooserOf(session: ScreenSession, heading: string, commands: readonly CommandItem[], language: DisplayLanguage): OpenChooser {
  return {
    surface: OPEN_CHOOSER,
    heading,
    commands,
    incomingFile: incomingFileOf(session),
    choices: commands
      .filter((item) => item.icon !== CLOSE_SURFACE_ENTRY)
      .map((entry) => ({ entry, hint: iconHint(entry.icon, language) })),
    fileWord: openChooserWord('file', language),
    documentTitleWord: openChooserWord('documentTitle', language),
    cancelWord: openChooserWord('cancel', language),
  }
}

// DEVIATION: spec says a surface is named by its U row (T-280); here only U-60 is, by the state machine (DFC-703)
/** @purity pure */
function openSurfaceNameOf(session: ScreenSession): string | null {
  const open = session.screen.openSurfaceState
  if (open.kind === 'closed') return null
  return open.surfaceName === WATERMARK_UNLOCK_ROW ? WATERMARK_UNLOCK : open.surfaceName
}

// see FR-036, FR-038, T-335, HN-4
/** @purity pure */
export function helpModalFromSession(session: ScreenSession, area: HelpWindowArea): HelpModal | null {
  const help = session.screen.helpDisplayState
  if (help.kind === 'hidden') return null
  const helpLanguage = session.screen.helpLanguage ?? displayLanguageOf(session)
  const windowState = help.child.kind
  const absent = windowState === 'maximised' ? MAXIMISE_ICON : RESTORE_ICON
  return {
    surface: HELP_MODAL,
    heading: surfaceHeading(HELP_MODAL, helpLanguage),
    commands: commandsOnSurface(HELP_MODAL, helpLanguage).filter((item) => item.icon !== absent),
    helpLanguage,
    windowState,
    entries: helpEntries(helpLanguage),
    legend: helpRoster.legend,
    licenceText: licence.licenceText,
    copyrightNotice: licence.copyrightNotice,
    attributions: licence.attributions,
    footnotes: helpFootnotes(helpLanguage),
    helpLegal: helpLegalWords(helpLanguage),
    area,
  }
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

  if (surface === RESOURCE_ROSTER) {
    const resources = rosterResourcesOf(schedule, readings)
    const rosterCommands = commands.map((item) => ({ ...item, isEnabled: hasRosterTarget(item.icon, resources) }))
    return { surface: RESOURCE_ROSTER, heading, commands: rosterCommands, resources }
  }

  if (surface === EXPORT_CHOOSER) {
    return {
      surface: EXPORT_CHOOSER,
      heading,
      commands,
      formats: exportFormatChoices(language),
    }
  }

  if (surface === OPEN_CHOOSER) return openChooserOf(session, heading, commands, language)

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
      ...missingWords(readings, language),
    }
  }

  // STOP: spec does not decide what the two unnamed surfaces carry. Looked in T-103, FR-074, FR-088
  // @provisional PND-140

  return { surface, heading, commands }
}
