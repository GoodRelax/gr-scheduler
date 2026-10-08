// SingleHtmlShell frame loop -- carries the document file flow (table T-290): open, save, export and a handed document.
// @unit      UF-165  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { Document } from '../../entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import type { Project, Task } from '../../entity/document-model/schedule/schedule'
import { editDocument, wbsSubtreesOf } from '../../use-case/edit-document/edit-document'
import type {
  FileFlowImportAnswer,
  FileFlowOpenRoute,
  FileFlowQuestion,
  FileFlowWriteForm,
  FileOperationState,
  SessionEvent,
} from '../../use-case/advance-screen-session/advance-screen-session'
import { importDocument, type ImportRequest, type OpenChoice } from '../../use-case/import-document/import-document'
import { validateImportedDocument } from '../../use-case/validate-imported-document/validate-imported-document'
import {
  documentFromEmbeddedHtml,
  documentFromJson,
  documentFromMspdi,
  exportEmbeddedHtml,
  extensionOfFormat,
  formatFromFile,
  jsonFromDocument,
  mspdiFromDocument,
  type ExchangeFormat,
  type FormatMismatch,
} from '../../adapter/document-codec/document-codec'
import {
  openDocumentFile,
  saveDocumentFile,
  type ChosenFileSaveRequest,
  type DocumentFileSaving,
  type FileStore,
  type OpenedFileState,
  type OpenRoute,
  type ProjectIdentity,
  type SaveFileForm,
} from '../../adapter/file-gateway/file-gateway'
import { exportPng, exportSvg, type ExportScene } from '../../adapter/image-exporter/image-exporter'
import { DEFAULT_ROW_NAME, exportFileNameOf, type ExportFormatId } from '../../adapter/screen-renderer/screen-renderer'
import {
  AGENT_DOCUMENT_HANDED,
  CONFIRMATION_MANNER,
  DOCUMENT_FILE_WRITE_ENDED,
  DOCUMENT_OPEN_FAILED,
  EDITED_BY_SCREEN,
  EXPORT_CHOOSER_ROW,
  GREATEST_KNOWN_SCHEMA_VERSION,
  HEIGHT_CEILING_REASON,
  HISTORY_LIMITS,
  NOTICE_REASON_OF_RASTER_FAULT,
  OPEN_CHOOSER_ROW,
  SEAM_ABSENT_REASON,
  STACK_SAFETY_CAP_REASON,
  discardQuestionOf,
  isSizeSettled,
  noWorkingWeekdayReason,
  readInstantOfWrite,
  readLocalMoment,
  type ConfirmationQuestion,
  type FrameLoopHands,
  type FrameValues,
  type HandedImport,
  type MergeCandidateLine,
  type MergeChoices,
  type MergeMapping,
  type NoticeReason,
} from './frame-loop'
import type { HeldViewPlace } from './view-place'
import startupTemplateManifest from './startup-template-manifest.json'

// see BT-1, FR-067
export const EMBEDDED_DOCUMENT_ELEMENT_ID = 'embedded-document'

// see FR-027, FR-067
export const STARTUP_TEMPLATE_ELEMENT_ID: string = startupTemplateManifest.containerElementId

// see FR-067
const OPEN_ROUTE_CONTAINER_ORDER: readonly string[] = [EMBEDDED_DOCUMENT_ELEMENT_ID, STARTUP_TEMPLATE_ELEMENT_ID]

const NOT_OPENABLE_HTML_REASON: Extract<NoticeReason, 'RS-67'> = 'RS-67'

const OVERWRITE_QUESTION: ConfirmationQuestion = 'QN-4'

// see OP-16
type IncomingFile = Extract<FileOperationState, { readonly kind: 'awaitingOpenChoice' }>['incomingFile']

type JsonRefusalReason = Extract<ReturnType<typeof documentFromJson>, { readonly ok: false }>['reason']

const NOTICE_REASON_OF_FORMAT_MISMATCH: Readonly<Record<FormatMismatch, NoticeReason>> = {
  extension: 'RS-11',
  firstCharacter: 'RS-12',
  both: 'RS-13',
}

const IGNORED_FILES_REASON: NoticeReason = 'RS-14'

const SETTINGS_CLAMPED_REASON: NoticeReason = 'RS-51'

// see FR-012
const PERCENT_COMPLETE_RECOUNTED_REASON: NoticeReason = 'RS-52'

// see MR-3
const DUPLICATE_LEAVES_REASON: NoticeReason = 'RS-60'

const OVERLAY_NOT_DRAWN_REASON: NoticeReason = 'RS-16'

// see MG-14
const MERGE_OVERWROTE_REASON: NoticeReason = 'RS-71'

const MERGE_KEPT_REASON: NoticeReason = 'RS-72'

const NEWER_FORMAT_UNREAD_REASON: NoticeReason = 'RS-48'

const NEWER_FORMAT_OPENED_REASON: NoticeReason = 'RS-63'

// see IF-3
const READING_BROKE_REASON: NoticeReason = 'RS-75'

// see IF-3
const WRITING_BROKE_REASON: NoticeReason = 'RS-76'

const NEWER_FORMAT_REFUSED_REASON: Extract<NoticeReason, JsonRefusalReason> = 'RS-64'

type EmbeddedHtmlFaultReason = Exclude<
  Awaited<ReturnType<typeof exportEmbeddedHtml>>,
  { readonly ok: true }
>['fault']['reason']

const NOTICE_REASON_OF_EMBEDDED_HTML_FAULT: Readonly<
  Record<EmbeddedHtmlFaultReason, NoticeReason>
> = {
  appShellUnavailable: 'RS-15',
  unusableElementId: 'RS-42',
  moreThanOneEntry: 'RS-42',
}

const NO_DROPPED_SEEDS: ReadonlySet<number> = new Set<number>()

// see FT-1, OP-2
export const OPEN_ROUTE_FROM_DROP: OpenRoute = 'drop'

export const OPEN_ROUTE_FROM_CHOOSER: OpenRoute = 'chooser'

export const OPEN_ROUTE_REOPEN: OpenRoute = 'reopen'

const SAVE_FORM: SaveFileForm = 'grsJson'

// TRAP: document-codec.ts holds a similar private map for decoding (OP-12);
// change both together.
const TABLE_ROW_OF_SAVE_FORM: Readonly<Record<SaveFileForm, string>> = {
  mspdi: 'IO-1',
  grsJson: 'IO-2',
  svg: 'IO-3',
  png: 'IO-4',
  singleHtml: 'IO-7',
}

// see FR-096, T-024
/** @purity pure */
function extensionOfForm(form: SaveFileForm): string {
  return extensionOfFormat(TABLE_ROW_OF_SAVE_FORM[form])
}

// see T-024
/** @purity pure */
function saveFormOfExportFormat(format: ExportFormatId): SaveFileForm | null {
  for (const form of Object.keys(TABLE_ROW_OF_SAVE_FORM) as readonly SaveFileForm[]) {
    if (TABLE_ROW_OF_SAVE_FORM[form] === format) return form
  }
  return null
}

// see OP-6
/** @purity pure */
function defaultDocumentSettings(): DocumentSettings {
  const built: Record<string, unknown> = {}
  for (const [dotted, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const path = dotted.split('.')
    const leaf = path.pop()
    if (leaf === undefined) continue
    let foundAt = built
    for (const step of path) {
      const standing = foundAt[step]
      const group =
        typeof standing === 'object' && standing !== null
          ? (standing as Record<string, unknown>)
          : {}
      foundAt[step] = group
      foundAt = group
    }
    foundAt[leaf] = value
  }
  return built as unknown as DocumentSettings
}

const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = defaultDocumentSettings()

// see FR-096, T-352
/** @purity pure */
function suggestedFileNameOf(project: Project, form: SaveFileForm): string {
  return exportFileNameOf(project.title ?? '', extensionOfForm(form))
}

// see AT-140, HS-11
// WHY: only the bytes carry the stamp; the held document keeps the one it was opened with (HS-11).
/** @purity pure */
export function documentStampedAt(document: Document, savedAt: string | null): Document {
  return { ...document, documentStamp: { ...document.documentStamp, fileSavedUtc: savedAt } }
}

// see AT-140, FR-101, HS-11
/** @purity pure */
function savedDocumentText(document: Document, savedAt: string): string {
  return jsonFromDocument(documentStampedAt(document, savedAt))
}

interface WriteMoment {
  readonly savedAt: string
  readonly savedLocalAt: string
}

// see FR-096, AT-140, DV-12
/** @purity pure */
function exportedText(form: SaveFileForm, document: Document, moment: WriteMoment): string | null {
  switch (form) {
    case 'grsJson':
      return savedDocumentText(document, moment.savedAt)
    case 'mspdi':
      // DEVIATION: spec says export notices are told (EX-3, EX-6); here they are dropped (DFC-557)
      return mspdiFromDocument(document, moment.savedLocalAt).text
    case 'svg':
    case 'png':
    case 'singleHtml':
      return null
  }
}

type ImportedFormat = Exclude<ExchangeFormat, 'singleHtml'>

// see IO-7
// WHY: the document a single .html carries is a GRS JSON, and is taken in as a GRS JSON file is.
/** @purity pure */
function importedFormatOf(format: ExchangeFormat): ImportedFormat {
  return format === 'singleHtml' ? 'grsJson' : format
}

interface DecodedIntake {
  readonly document: Document
  readonly clampedCount: number
  readonly recountedCount: number
  readonly duplicateLeaves: number
  readonly unreadColumns: readonly string[]
  readonly isNewerFormat: boolean
}

interface RefusedIntake {
  readonly refusal: JsonRefusalReason | typeof NOT_OPENABLE_HTML_REASON
}

// see OP-12, FR-073
/** @purity pure */
function decodedDocument(
  format: ExchangeFormat,
  text: string,
  current: Document,
): DecodedIntake | RefusedIntake | null {
  if (format === 'grsJson' || format === 'singleHtml') {
    // TRAP: omit this argument and OP-7 silently answers notCompared (FR-073).
    const read =
      format === 'grsJson'
        ? documentFromJson(text, GREATEST_KNOWN_SCHEMA_VERSION)
        : documentFromEmbeddedHtml(text, OPEN_ROUTE_CONTAINER_ORDER, GREATEST_KNOWN_SCHEMA_VERSION)
    if (!read.ok && read.reason === 'entryCountNotOne') return { refusal: NOT_OPENABLE_HTML_REASON }
    return read.ok
      ? {
          document: read.document,
          clampedCount: read.clampedCount,
          recountedCount: read.recountedCount,
          duplicateLeaves: 0,
          unreadColumns: read.unreadColumns,
          isNewerFormat: read.formatVersion === 'newerThanKnown',
        }
      : { refusal: read.reason }
  }
  // DEVIATION: spec says a reading's notices and faults are told (T-233); here they are dropped (DFC-557)
  const read = documentFromMspdi(text, current)
  return read.ok
    ? {
        document: read.document,
        clampedCount: 0,
        // WHY: an MSPDI keeps the percent complete it carried (FR-012, FR-021).
        recountedCount: 0,
        duplicateLeaves: read.duplicateLeaves,
        unreadColumns: [],
        isNewerFormat: false,
      }
    : null
}

// see FR-073, RS-64
/** @purity non-pure */
function acceptedIntake(
  hands: Pick<DocumentFileFlowHands, 'raiseNotice'>,
  decoded: DecodedIntake | RefusedIntake | null,
): DecodedIntake | null {
  if (decoded === null) return null
  if (!('refusal' in decoded)) return decoded
  if (decoded.refusal === NEWER_FORMAT_REFUSED_REASON || decoded.refusal === NOT_OPENABLE_HTML_REASON) {
    hands.raiseNotice(decoded.refusal, null)
  }
  return null
}

interface NewerFormatReading {
  readonly isNewerFormat: boolean
  readonly couldNotBeRead: readonly string[]
  readonly isUnreadAsked: boolean
}

const NOT_NEWER: NewerFormatReading = { isNewerFormat: false, couldNotBeRead: [], isUnreadAsked: false }

// see FR-073, RS-48, RS-63
/** @purity non-pure */
function tellNewerFormat(hands: Pick<DocumentFileFlowHands, 'raiseNotice'>, reading: NewerFormatReading): void {
  const { isNewerFormat, couldNotBeRead, isUnreadAsked } = reading
  if (!isNewerFormat) return
  if (couldNotBeRead.length === 0) return hands.raiseNotice(NEWER_FORMAT_OPENED_REASON, null)
  // DEVIATION: spec says unread columns ask whether to go on (FR-073, U-61); here U-61 stands
  // only for a merge with candidates, so the other opens tell RS-48 after opening (DFC-855)
  if (!isUnreadAsked) hands.raiseNotice(NEWER_FORMAT_UNREAD_REASON, null)
}

const UNUSABLE_DATE_RULES: ReadonlySet<string> = new Set(['IV-14', 'S-119', 'S-120'])

const TASK_REFUSAL_PREFIX = '/schedule/tasks/'

/** @purity pure */
function taskIndexOfRefusal(at: string): number | null {
  if (!at.startsWith(TASK_REFUSAL_PREFIX)) return null
  const rest = at.slice(TASK_REFUSAL_PREFIX.length)
  const cut = rest.indexOf('/')
  if (cut <= 0) return null
  const index = Number(rest.slice(0, cut))
  return Number.isInteger(index) && index >= 0 ? index : null
}

// see FR-023, CD-1
/** @purity pure */
function taskUidsWithAnUnusableDate(
  refusals: readonly { readonly rule: string; readonly at: string }[],
  tasks: readonly Task[],
): ReadonlySet<number> {
  const seeds = new Set<number>()
  for (const refusal of refusals) {
    if (!UNUSABLE_DATE_RULES.has(refusal.rule)) continue
    const index = taskIndexOfRefusal(refusal.at)
    if (index === null) continue
    const task = tasks[index]
    if (task === undefined) continue
    seeds.add(task.uid)
  }
  return seeds
}

// see DI-3
/** @purity pure */
function projectIdentityFromText(text: string): ProjectIdentity | null {
  // TRAP: omit the version and documentFromJson silently answers notCompared.
  const read = documentFromJson(text, GREATEST_KNOWN_SCHEMA_VERSION)
  if (!read.ok) return null
  const project = read.document.schedule.project
  return { projectName: project.name, projectId: project.id }
}

export type DocumentFileFlowHands = Pick<
  FrameLoopHands,
  | 'readSession'
  | 'readHeld'
  | 'readValues'
  | 'readEnvironment'
  | 'files'
  | 'rasterizer'
  | 'appShell'
  | 'sendToSession'
  | 'ask'
  | 'sendFromFlow'
  | 'endFileOperation'
  | 'raiseNotice'
  | 'raiseFileFault'
  | 'replaceHeldDocument'
  | 'settingsLimitsOf'
  | 'exportScene'
>

export interface FileSavedReading {
  readonly fileSavedAt: string | null
  readonly fileSavedByteLength: number | null
}

export const NO_FILE_SAVED: FileSavedReading = { fileSavedAt: null, fileSavedByteLength: null }

// see FR-101, HS-4, HS-5, HS-6
/** @purity non-pure */
function fileSavedReadingOf(hands: Pick<DocumentFileFlowHands, 'files'>) {
  let fileSaved: FileSavedReading = NO_FILE_SAVED
  let hasSavedOpenedFile = false
  return {
    /** @purity semi-pure-b */
    readFileSaved: (): FileSavedReading => fileSaved,
    /** @purity semi-pure-b */
    hasSavedOpenedFile: (): boolean => hasSavedOpenedFile,
    /** @purity non-pure */
    noteFileSaved(byteLength: number, savedAt: string): void {
      fileSaved = { fileSavedAt: savedAt, fileSavedByteLength: byteLength }
      hasSavedOpenedFile = true
    },
    /** @purity non-pure */
    noteFileOpened(savedAt: string | null, byteLength: number): void {
      fileSaved = savedAt === null ? NO_FILE_SAVED : { fileSavedAt: savedAt, fileSavedByteLength: byteLength }
      hasSavedOpenedFile = false
    },
    // see FR-095, HS-5
    /** @purity non-pure */
    forgetOpenedFile(): void {
      hands.files?.forgetOpenedFile()
      fileSaved = NO_FILE_SAVED
      hasSavedOpenedFile = false
    },
  }
}

/** @purity non-pure */
export function documentFileFlowOf(
  hands: DocumentFileFlowHands,
  viewPlace: Pick<HeldViewPlace, 'documentToWrite'>,
) {
  // WHY: continuations, not states: the machine's effects settle them (CR-460 decision 5).
  let settleOpenChoice: ((choice: OpenChoice | null) => void) | null = null
  // TRAP: kept apart from settleOpenChoice; one shared holder settles whichever was waiting.
  let settleMergeMapping: ((mapping: MergeMapping | null) => void) | null = null
  let settleOverwrite: ((isProceeding: boolean) => void) | null = null

  // see DI-4, QN-4, T-290
  /** @purity non-pure */
  function askToWriteOverDestination(): Promise<boolean> {
    return new Promise<boolean>((answer) => {
      settleOverwrite = answer
      const question: FileFlowQuestion = { manner: CONFIRMATION_MANNER, question: OVERWRITE_QUESTION, items: [] }
      hands.sendFromFlow({ type: 'overwriteQuestionRaised', question })
    })
  }

  // see OP-3, OP-4, OP-13, FR-022, T-290
  // WHY: replace only once the discard is confirmed, null when discarded or closed; effects settle it.
  // A handed document is asked the same way: the person answers, never the caller (JDG-130).
  /** @purity non-pure */
  function askHowToOpen(discarded: Document, incomingFile: IncomingFile) {
    return new Promise<OpenChoice | null>((answer) => {
      settleOpenChoice = answer
      hands.sendFromFlow({ type: 'documentFileRead', question: discardQuestionOf(discarded), incomingFile })
    })
  }

  // see FR-022, T-032a, T-290
  /** @purity non-pure */
  function askWhichFileToTakeFrom(
    mergeCandidates: readonly MergeCandidateLine[],
    unreadColumns: readonly string[],
  ): Promise<MergeMapping | null> {
    return new Promise<MergeMapping | null>((answer) => {
      settleMergeMapping = answer
      hands.sendFromFlow({ type: 'mergeMappingAsked', mergeCandidates, unreadColumns })
    })
  }

  /** @purity non-pure */
  function beginReadingDocumentFile(openRoute: FileFlowOpenRoute): void {
    const store = hands.files
    if (openRoute === 'handed') return
    if (store === undefined) return hands.endFileOperation(DOCUMENT_OPEN_FAILED)
    const opening = openRoute === 'reopen' ? reopenDocumentIntoHold(hands, flow, store) : openDocumentIntoHold(hands, flow, store, openRoute)
    void opening
      .catch(() => hands.raiseNotice(READING_BROKE_REASON, null))
      .finally(() => hands.endFileOperation(DOCUMENT_OPEN_FAILED))
  }

  /** @purity non-pure */
  function beginWritingDocumentFile(writeForm: FileFlowWriteForm): void {
    const store = hands.files
    if (store === undefined) return hands.endFileOperation(DOCUMENT_FILE_WRITE_ENDED)
    // WHY: taken here and passed in, so no await inside can swap the document asked for (CS-4).
    // OP-10 gives the written copy the startup template's place; the held document keeps its own.
    const asked = viewPlace.documentToWrite(hands.readHeld().document)
    const writing =
      writeForm.kind === 'save'
        ? saveHeldDocumentToFile(hands, flow, store, asked)
        : exportHeldDocumentToFile(hands, flow, store, asked, writeForm.format as ExportFormatId)
    void writing
      .catch(() => hands.raiseNotice(WRITING_BROKE_REASON, null))
      .finally(() => hands.endFileOperation(DOCUMENT_FILE_WRITE_ENDED))
  }

  /** @purity non-pure */
  function settleIncomingDocument(answer: FileFlowImportAnswer | null): void {
    const forChoice = settleOpenChoice
    const forMapping = settleMergeMapping
    settleOpenChoice = null
    settleMergeMapping = null
    if (answer === null) {
      forChoice?.(null)
      forMapping?.(null)
      return
    }
    if (answer.kind === 'openChoice') forChoice?.(answer.openChoice)
    else forMapping?.(answer.mergeMapping)
  }

  /** @purity non-pure */
  function answerOverwriteQuestion(isProceeding: boolean): void {
    const settle = settleOverwrite
    settleOverwrite = null
    settle?.(isProceeding)
  }

  const flow = {
    askToWriteOverDestination,
    askHowToOpen,
    askWhichFileToTakeFrom,
    settleIncomingDocument,
    answerOverwriteQuestion,
    beginReadingDocumentFile,
    beginWritingDocumentFile,
    ...fileSavedReadingOf(hands),
  }
  return flow
}

export type DocumentFileFlow = ReturnType<typeof documentFileFlowOf>

type OpeningFlow = Pick<DocumentFileFlow, 'askHowToOpen' | 'askWhichFileToTakeFrom' | 'noteFileOpened'>

interface ReadInFile {
  readonly format: ImportedFormat
  readonly byteLength: number
  readonly fileName: string | null
}

// see OP-16
/** @purity pure */
function incomingFileOf(readIn: ReadInFile, incoming: Document): IncomingFile {
  return { fileName: readIn.fileName, byteLength: readIn.byteLength, documentTitle: incoming.schedule.project.title }
}

/** @purity non-pure */
export function answerOpenChoice(hands: DocumentFileFlowHands, openChoice: OpenChoice, frame: FrameValues | null): void {
  hands.sendToSession({ type: 'flowSurfaceAnswered', surfaceName: OPEN_CHOOSER_ROW }, frame)
  hands.sendToSession({ type: 'openChoiceAnswered', openChoice, question: discardQuestionOf(hands.readHeld().document) }, frame)
}

// see T-290, FR-023, MG-14
type ReportedTaskNames = Pick<
  Extract<SessionEvent, { readonly type: 'documentOpenLanded' }>,
  'droppedTaskNames' | 'missingTaskNames'
>

type ImportReport = Extract<ReturnType<typeof importDocument>, { readonly ok: true }>['report']

/** @purity non-pure */
function landOpenedDocument(
  hands: DocumentFileFlowHands,
  names: ReportedTaskNames,
  openChoice: OpenChoice,
  newer: NewerFormatReading,
  openedFileName: string | null = null,
): void {
  hands.sendFromFlow({ type: 'documentOpenLanded', ...names, openedFileName, openChoice })
  tellNewerFormat(hands, newer)
}

// see MG-11, MG-14, RS-73
/** @purity pure */
function missingTaskNamesOf(current: Document, report: ImportReport | null): ReportedTaskNames['missingTaskNames'] {
  if (report === null) return []
  const missing = new Set(report.taskUidsMissingSinceLastImport)
  return current.schedule.tasks.filter((task) => missing.has(task.uid)).map((task) => task.name)
}

// see MG-14, RS-71, RS-72, OP-15, RS-16
// WHY: a zero count tells nothing (MG-14); an overlay or a replacement is no merge.
/** @purity non-pure */
function tellImportReport(hands: Pick<DocumentFileFlowHands, 'raiseNotice'>, report: ImportReport): void {
  const notDrawn = report.baselineTaskUidsNotDrawn.length
  if (report.choice === 'baseline' && notDrawn > 0) hands.raiseNotice(OVERLAY_NOT_DRAWN_REASON, notDrawn)
  if (report.choice !== 'merge') return
  const overwritten = report.overwrittenTaskUids.length
  if (overwritten > 0) hands.raiseNotice(MERGE_OVERWROTE_REASON, overwritten)
  const kept = report.taskUidsOnlyInCurrent.length
  if (kept > 0) hands.raiseNotice(MERGE_KEPT_REASON, kept)
}

// see MG-14, OP-15, T-290
// WHY: asked a second time because ReplaceOutcome carries no ImportReport.
/** @purity non-pure */
function landImportedDocument(
  hands: DocumentFileFlowHands,
  request: ImportRequest,
  droppedTaskNames: readonly (string | null)[],
  newer: NewerFormatReading,
): void {
  const outcome = importDocument(request)
  const report = outcome.ok ? outcome.report : null
  const missingTaskNames = missingTaskNamesOf(request.current, report)
  landOpenedDocument(hands, { droppedTaskNames, missingTaskNames }, request.choice, newer)
  if (report !== null) tellImportReport(hands, report)
}

// see FR-060, FR-101, HS-6, T-290
// WHY: only a replace makes the file read the save target; a merge or an overlay makes a document no file holds.
/** @purity non-pure */
function landReplacedDocument(
  hands: DocumentFileFlowHands,
  flow: Pick<OpeningFlow, 'noteFileOpened'>,
  store: FileStore | null,
  droppedTaskNames: readonly (string | null)[],
  newer: NewerFormatReading,
  readIn: ReadInFile,
  incoming: Document,
): void {
  store?.adoptFileReadToOpen()
  flow.noteFileOpened(incoming.documentStamp.fileSavedUtc, readIn.byteLength)
  landOpenedDocument(hands, { droppedTaskNames, missingTaskNames: [] }, 'replace', newer, readIn.fileName)
}

// see OP-2, OP-5, OP-12, T-230
/** @purity non-pure */
export async function openDocumentIntoHold(
  hands: DocumentFileFlowHands, flow: OpeningFlow, store: FileStore | null,
  route: OpenRoute,
  handed: HandedImport | null = null,
): Promise<boolean> {
  const current = hands.readHeld().document

  let handedIn: ReadInFile | null = null
  let incoming: Document
  let newer = NOT_NEWER
  if (handed !== null) {
    handedIn = { format: importedFormatOf(handed.format), byteLength: handed.byteLength, fileName: null }
    incoming = handed.incoming
    newer = { ...NOT_NEWER, isNewerFormat: handed.isNewerFormat, couldNotBeRead: handed.unreadColumns }
  } else if (store === null) {
    return false
  } else {
    const opening = await openDocumentFile(store, route)
    if (!opening.ok) {
      hands.raiseFileFault(opening.fault)
      return false
    }
    if (opening.ignoredFileCount > 0) {
      hands.raiseNotice(IGNORED_FILES_REASON, opening.ignoredFileCount)
    }
    const file = opening.file

    const reading = formatFromFile(file.fileName, file.text)
    if (!reading.ok) {
      hands.raiseNotice(NOTICE_REASON_OF_FORMAT_MISMATCH[reading.mismatch], null)
      return false
    }
    const decoded = acceptedIntake(hands, decodedDocument(reading.format, file.text, current))
    if (decoded === null) return false
    handedIn = { format: importedFormatOf(reading.format), byteLength: file.byteLength, fileName: file.fileName }
    incoming = decoded.document
    tellDecodedIntake(hands, decoded)
    newer = { ...NOT_NEWER, isNewerFormat: decoded.isNewerFormat, couldNotBeRead: decoded.unreadColumns }
  }
  const readIn = handedIn

  const verdict = validateImportedDocument(
    {
      document: incoming,
      byteLength: readIn.byteLength,
      emptyRowTaskUids: [],
    },
  )
  const droppedSeeds = verdict.ok
    ? NO_DROPPED_SEEDS
    : taskUidsWithAnUnusableDate(verdict.refusals, incoming.schedule.tasks)
  const droppedNames: (string | null)[] = []
  const lost = wbsSubtreesOf(incoming.schedule.tasks, droppedSeeds)
  for (const task of incoming.schedule.tasks) {
    if (lost.has(task.uid)) droppedNames.push(task.name)
  }
  for (const uid of droppedSeeds) {
    if (!incoming.schedule.tasks.some((one) => one.uid === uid)) continue
    const result = editDocument(
      incoming,
      { kind: 'deleteTask', uid },
      hands.settingsLimitsOf(null),
      DEFAULT_ROW_NAME,
    )
    if (!result.ok) continue
    incoming = result.document
  }
  const afterDropping =
    droppedNames.length === 0
      ? verdict
      : validateImportedDocument(
          { document: incoming, byteLength: readIn.byteLength, emptyRowTaskUids: [] },
        )
  if (!afterDropping.ok) {
    return false
  }

  // TRAP: refuse before the input becomes current; drawing such a calendar throws.
  const noWorkingWeekday = noWorkingWeekdayReason(incoming)
  if (noWorkingWeekday !== null) {
    hands.raiseNotice(noWorkingWeekday, null)
    return false
  }

  const choice = await flow.askHowToOpen(current, incomingFileOf(readIn, incoming))
  if (choice === null) return false
  const isDiscardConfirmed = choice === 'replace'

  const importing = {
    incoming,
    format: readIn.format,
    validationPassed: true,
    anotherOpenInProgress: false,
    unsavedEditsDiscardConfirmed: isDiscardConfirmed,
    merge: null,
    defaultSettings: DEFAULT_DOCUMENT_SETTINGS,
    importSessionId: crypto.randomUUID(),
  }

  if (choice === 'replace') {
    const replaced = hands.replaceHeldDocument({ row: 'RD-4', importing: { ...importing, choice } })
    if (replaced) landReplacedDocument(hands, flow, store, droppedNames, newer, readIn, incoming)
    return replaced
  }
  // STOP: spec does not decide the surface MG-4 and MG-12 ask through. Looked in FR-022, T-103, T-109 (PND-423)
  let mergeAnswers: MergeChoices | null = null
  const asked =
    choice === 'merge' ? importDocument({ ...importing, choice, current: hands.readHeld().document }) : null
  if (asked !== null && !asked.ok && asked.refusal.reason === 'mappingNotChosen') {
    const mapping = await flow.askWhichFileToTakeFrom(
      asked.refusal.candidates.map((candidate) => ({
        currentUid: candidate.currentTaskUid,
        incomingUid: candidate.incomingTaskUid,
        currentName: candidate.currentTaskName,
        incomingName: candidate.incomingTaskName,
      })),
      newer.couldNotBeRead,
    )
    if (mapping === null) return false
    if (mapping.kind === 'cancelImport') return false
    mergeAnswers = { mapping, profileConflict: null, settingsConflict: null }
  }

  // TRAP: read again here, not current, which predates the waits.
  const importedAgainst = hands.readHeld().document
  const landed = hands.replaceHeldDocument({
    row: 'RD-3',
    importing: { ...importing, choice, merge: mergeAnswers },
    historyLimits: HISTORY_LIMITS,
    editedBy: EDITED_BY_SCREEN,
    updatedUtc: readInstantOfWrite(),
  })

  if (!landed) return false
  const request = { ...importing, choice, merge: mergeAnswers, current: importedAgainst }
  landImportedDocument(hands, request, droppedNames, { ...newer, isUnreadAsked: mergeAnswers !== null })
  return landed
}

// see OP-13
/** @purity non-pure */
async function reopenDocumentIntoHold(
  hands: DocumentFileFlowHands,
  flow: OpeningFlow,
  store: FileStore,
): Promise<void> {
  const openedFile = await store.readOpenedFileState()
  if (openedFile.kind === 'none') return
  await openDocumentIntoHold(hands, flow, store, OPEN_ROUTE_REOPEN)
}

// see RS-51, RS-52, RS-60
/** @purity non-pure */
function tellDecodedIntake(hands: Pick<DocumentFileFlowHands, 'raiseNotice'>, decoded: DecodedIntake): void {
  if (decoded.clampedCount > 0) hands.raiseNotice(SETTINGS_CLAMPED_REASON, decoded.clampedCount)
  if (decoded.recountedCount > 0) hands.raiseNotice(PERCENT_COMPLETE_RECOUNTED_REASON, decoded.recountedCount)
  if (decoded.duplicateLeaves > 0) hands.raiseNotice(DUPLICATE_LEAVES_REASON, decoded.duplicateLeaves)
}

// see FR-012, RS-52
type HandedFirstReading = Pick<HandedImport, 'unreadColumns' | 'isNewerFormat'> & {
  readonly recountedCount?: number
}

// see AM-8, FR-022, FR-073
// TRAP: the handed document was decoded once already and its unread columns dropped there;
// reading its text again finds none, so a caller that has the first reading must pass it.
/** @purity non-pure */
export async function takeInHandedDocument(
  hands: DocumentFileFlowHands,
  flow: OpeningFlow,
  incoming: Document,
  firstReading?: HandedFirstReading,
): Promise<boolean> {
  const before = hands.readSession()
  hands.sendToSession(AGENT_DOCUMENT_HANDED, null)
  if (hands.readSession() === before) return false
  try {
    const handedText = jsonFromDocument(incoming)
    const reread = documentFromJson(handedText, GREATEST_KNOWN_SCHEMA_VERSION)
    const landed = await openDocumentIntoHold(hands, flow, null, OPEN_ROUTE_FROM_CHOOSER, {
      incoming,
      format: 'grsJson',
      byteLength: new TextEncoder().encode(handedText).length,
      unreadColumns: firstReading?.unreadColumns ?? (reread.ok ? reread.unreadColumns : []),
      isNewerFormat: firstReading?.isNewerFormat ?? (reread.ok && reread.formatVersion === 'newerThanKnown'),
    })
    // TRAP: the reread finds nothing to recount; the count is the first reading's.
    const recountedCount = firstReading?.recountedCount ?? 0
    if (landed && recountedCount > 0) hands.raiseNotice(PERCENT_COMPLETE_RECOUNTED_REASON, recountedCount)
    return landed
  } finally {
    hands.endFileOperation(DOCUMENT_OPEN_FAILED)
  }
}

// see FR-096, FR-060, SX-1
// WHY: a file opened as MSPDI or as a single .html is not written over with GRS JSON; its first save
// asks for a file. OP-12 opens a file only when its extension names its format, so the extension tells.
/** @purity pure */
function isOverwritableOpenedFile(openedFile: OpenedFileState, hasSavedOpenedFile: boolean): boolean {
  if (openedFile.kind === 'none') return false
  // TRAP: judging a file this run saved by its extension asks again on every save whose name lacks it.
  return hasSavedOpenedFile || openedFile.fileName.endsWith(extensionOfForm(SAVE_FORM))
}

// see SX-1, HS-4, T-340
/** @purity non-pure */
function landSavedDocument(
  hands: DocumentFileFlowHands,
  flow: Pick<DocumentFileFlow, 'noteFileSaved'>,
  saving: Extract<DocumentFileSaving, { readonly ok: true }>,
  byteLength: number,
  savedAt: string,
): void {
  const openedFileName = saving.openedFile.kind === 'none' ? null : saving.openedFile.fileName
  hands.sendFromFlow({ type: 'documentFileSaved', openedFileName })
  flow.noteFileSaved(byteLength, savedAt)
}

/** @purity pure */
function byteLengthOfText(text: string): number {
  return new TextEncoder().encode(text).length
}

// see SK-11, FR-060, FR-096
/** @purity non-pure */
async function saveHeldDocumentToFile(
  hands: DocumentFileFlowHands,
  flow: Pick<DocumentFileFlow, 'askToWriteOverDestination' | 'noteFileSaved' | 'hasSavedOpenedFile'>,
  store: FileStore,
  saved: Document,
): Promise<void> {
  const savedAt = readInstantOfWrite()
  const text = savedDocumentText(saved, savedAt)
  const project = saved.schedule.project

  const openedFile = await store.readOpenedFileState()
  const saving: DocumentFileSaving =
    !isOverwritableOpenedFile(openedFile, flow.hasSavedOpenedFile())
      ? await saveDocumentFile(store, chosenFileSave(flow, { text }, project, SAVE_FORM))
      : await saveDocumentFile(store, {
          destination: 'openedFile',
          content: { text },
          form: SAVE_FORM,
        })

  if (saving.ok) return landSavedDocument(hands, flow, saving, byteLengthOfText(text), savedAt)
  hands.raiseFileFault(saving.fault)
}

// see FR-096, SK-12, T-340
/** @purity non-pure */
async function exportHeldDocumentToFile(
  hands: DocumentFileFlowHands,
  flow: Pick<DocumentFileFlow, 'askToWriteOverDestination' | 'noteFileSaved' | 'readFileSaved'>,
  store: FileStore,
  written: Document,
  format: ExportFormatId,
): Promise<void> {
  const form = saveFormOfExportFormat(format)
  if (form === null) return
  const savedAt = readInstantOfWrite()
  const text = exportedText(form, written, { savedAt, savedLocalAt: readLocalMoment() })
  // WHY: a form that builds no picture owes no cap stop (CR-440 decision 9); the value rides with the content.
  const picture =
    text === null
      ? await exportPictureContent(hands, form, documentStampedAt(written, flow.readFileSaved().fileSavedAt))
      : { content: { text }, capStopGroupId: null }
  if (picture === null) return

  const saving = await saveDocumentFile(
    store,
    chosenFileSave(flow, picture.content, written.schedule.project, form),
  )
  if (saving.ok) {
    if (form === SAVE_FORM && text !== null) return landSavedDocument(hands, flow, saving, byteLengthOfText(text), savedAt)
    // TRAP: leave stackSafetyCapToldFor alone; it is the frame's, and touching it silences the screen.
    if (picture.capStopGroupId !== null) hands.raiseNotice(STACK_SAFETY_CAP_REASON, null)
    return
  }
  hands.raiseFileFault(saving.fault)
}

// see IO-3, IO-4, IO-7, ST-7
/** @purity non-pure */
async function exportPictureContent(
  hands: DocumentFileFlowHands,
  form: SaveFileForm,
  written: Document,
): Promise<{
  readonly content: ChosenFileSaveRequest['content']
  readonly capStopGroupId: string | null
} | null> {
  switch (form) {
    case 'grsJson':
    case 'mspdi':
      return null
    case 'singleHtml': {
      const content = await embeddedHtmlContent(hands, written)
      return content === null ? null : { content, capStopGroupId: null }
    }
    case 'svg':
    case 'png': {
      const scene = hands.exportScene()
      if (scene === null) return null
      const capStopGroupId = scene.capStopGroupId
      if (form === 'svg') {
        const picture = exportSvg(scene)
        if (!picture.ok) {
          hands.raiseNotice(HEIGHT_CEILING_REASON, null)
          return null
        }
        return { content: { text: picture.svg }, capStopGroupId }
      }
      const rastered = await rasteredContent(hands, scene)
      return rastered === null ? null : { content: rastered, capStopGroupId }
    }
  }
}

// see IO-4
/** @purity non-pure */
async function rasteredContent(
  hands: DocumentFileFlowHands,
  scene: ExportScene,
): Promise<ChosenFileSaveRequest['content'] | null> {
  const seam = hands.rasterizer
  if (seam === undefined) {
    hands.raiseNotice(SEAM_ABSENT_REASON, null)
    return null
  }
  const painted = await exportPng(seam, scene)
  if (!painted.ok) {
    hands.raiseNotice(HEIGHT_CEILING_REASON, null)
    return null
  }
  if (!painted.png.ok) {
    hands.raiseNotice(NOTICE_REASON_OF_RASTER_FAULT[painted.png.fault.reason], null)
    return null
  }
  return { bytes: painted.png.pngBytes }
}

// see IO-7
/** @purity non-pure */
async function embeddedHtmlContent(
  hands: DocumentFileFlowHands,
  written: Document,
): Promise<ChosenFileSaveRequest['content'] | null> {
  const seam = hands.appShell
  if (seam === undefined) {
    hands.raiseNotice(SEAM_ABSENT_REASON, null)
    return null
  }
  const made = await exportEmbeddedHtml(seam, written)
  if (!made.ok) {
    hands.raiseNotice(NOTICE_REASON_OF_EMBEDDED_HTML_FAULT[made.fault.reason], null)
    return null
  }
  return { text: made.html }
}

// see FR-096, DI-1
/** @purity pure */
function chosenFileSave(
  flow: Pick<DocumentFileFlow, 'askToWriteOverDestination'>,
  content: ChosenFileSaveRequest['content'],
  project: Project,
  form: SaveFileForm,
): ChosenFileSaveRequest {
  return {
    destination: 'chosenFile',
    content,
    form,
    suggestedFileName: suggestedFileNameOf(project, form),
    extension: extensionOfForm(form),
    // WHY: fileName is null rather than asked of the store, which would be a second outside read
    // (R7.4); a null name matches no destination, so DI-4 asks before every existing file.
    identity: { fileName: null, projectName: project.name, projectId: project.id },
    projectIdentityFromText,
    confirmOverwrite: flow.askToWriteOverDestination,
  }
}

// see FR-096, SK-12
/** @purity non-pure */
export function answerSettledFormat(hands: DocumentFileFlowHands, format: ExportFormatId): boolean {
  // TRAP: taken down before both gates, so each gate must raise a notice; a silent return
  // closes the chooser with nothing written and nothing said (FR-029).
  hands.sendToSession({ type: 'flowSurfaceAnswered', surfaceName: EXPORT_CHOOSER_ROW }, hands.readValues())
  const store = hands.files
  if (store === undefined) {
    hands.raiseNotice(SEAM_ABSENT_REASON, null)
    return true
  }
  hands.sendToSession({ type: 'documentFileWriteAsked', writeForm: { kind: 'export', format } }, hands.readValues())
  return true
}

/** @purity non-pure */
export function askToOpenDroppedFile(hands: DocumentFileFlowHands): void {
  if (hands.files !== undefined) hands.sendToSession({ type: 'documentOpenAsked', openRoute: OPEN_ROUTE_FROM_DROP }, hands.readValues())
  if (isSizeSettled(hands.readEnvironment())) hands.ask()
}
