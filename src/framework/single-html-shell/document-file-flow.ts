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
} from '../../use-case/advance-screen-session/advance-screen-session'
import { importDocument, type OpenChoice } from '../../use-case/import-document/import-document'
import { validateImportedDocument, type ImportBounds } from '../../use-case/validate-imported-document/validate-imported-document'
import {
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
  type OpenRoute,
  type ProjectIdentity,
  type SaveFileForm,
} from '../../adapter/file-gateway/file-gateway'
import { exportPng, exportSvg, type ExportScene } from '../../adapter/image-exporter/image-exporter'
import { DEFAULT_ROW_NAME, type ExportFormatId } from '../../adapter/screen-renderer/screen-renderer'
import {
  AGENT_DOCUMENT_HANDED,
  CONFIRMATION_MANNER,
  DOCUMENT_FILE_WRITE_ENDED,
  DOCUMENT_OPEN_FAILED,
  EDITED_BY_SCREEN,
  EXPORT_CHOOSER_SURFACE,
  GREATEST_KNOWN_SCHEMA_VERSION,
  HEIGHT_CEILING_REASON,
  HISTORY_LIMITS,
  NOTICE_REASON_OF_RASTER_FAULT,
  OPEN_CHOOSER_SURFACE,
  SEAM_ABSENT_REASON,
  STACK_SAFETY_CAP_REASON,
  discardQuestionOf,
  isSizeSettled,
  noWorkingWeekdayReason,
  readInstantOfWrite,
  type ConfirmationQuestion,
  type FrameLoopHands,
  type FrameValues,
  type HandedImport,
  type MergeCandidateLine,
  type MergeChoices,
  type MergeMapping,
  type NoticeReason,
} from './frame-loop'

const OVERWRITE_QUESTION: ConfirmationQuestion = 'QN-4'

const NOTICE_REASON_OF_FORMAT_MISMATCH: Readonly<Record<FormatMismatch, NoticeReason>> = {
  extension: 'RS-11',
  firstCharacter: 'RS-12',
  both: 'RS-13',
}

const IGNORED_FILES_REASON: NoticeReason = 'RS-14'

const SETTINGS_CLAMPED_REASON: NoticeReason = 'RS-51'

// see MR-3
const DUPLICATE_LEAVES_REASON: NoticeReason = 'RS-60'

const OVERLAY_NOT_DRAWN_REASON: NoticeReason = 'RS-16'

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

// see FR-096
/** @purity pure */
function suggestedFileNameOf(project: Project, form: SaveFileForm): string {
  return `${project.title ?? ''}${extensionOfForm(form)}`
}

// see FR-096
/** @purity pure */
function exportedText(form: SaveFileForm, document: Document): string | null {
  switch (form) {
    case 'grsJson':
      return jsonFromDocument(document)
    case 'mspdi':
      // DEVIATION: spec says export notices are told (EX-3, EX-6); here they are dropped (DFC-557)
      return mspdiFromDocument(document).text
    case 'svg':
    case 'png':
    case 'singleHtml':
      return null
  }
}

interface DecodedIntake {
  readonly document: Document
  readonly clampedCount: number
  readonly duplicateLeaves: number
  readonly unreadColumns: readonly string[]
}

// see OP-12, FR-073
/** @purity pure */
function decodedDocument(
  format: ExchangeFormat,
  text: string,
  current: Document,
): DecodedIntake | null {
  if (format === 'grsJson') {
    // TRAP: omit this argument and OP-7 silently answers notCompared (FR-073).
    const read = documentFromJson(text, GREATEST_KNOWN_SCHEMA_VERSION)
    return read.ok
      ? {
          document: read.document,
          clampedCount: read.clampedCount,
          duplicateLeaves: 0,
          unreadColumns: read.unreadColumns,
        }
      : null
  }
  // DEVIATION: spec says a reading's notices and faults are told (T-233); here they are dropped (DFC-557)
  const read = documentFromMspdi(text, current)
  return read.ok
    ? { document: read.document, clampedCount: 0, duplicateLeaves: read.duplicateLeaves, unreadColumns: [] }
    : null
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

/** @purity non-pure */
export function documentFileFlowOf(hands: DocumentFileFlowHands) {
  let fileSavedAt: string | null = null
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

  // see OP-3, OP-4, OP-13, T-290
  // WHY: replace only once the discard is confirmed, null when discarded or closed; effects settle it.
  /** @purity non-pure */
  function askHowToOpen(discarded: Document, handedChoice: OpenChoice | null): Promise<OpenChoice | null> {
    return new Promise<OpenChoice | null>((answer) => {
      settleOpenChoice = answer
      hands.sendFromFlow({ type: 'documentFileRead', question: discardQuestionOf(discarded) })
      // DEVIATION: spec says OP-3 is asked for a handed document too (JDG-130); here the hand-over answers merge (DFC-614)
      if (handedChoice !== null) answerOpenChoice(hands, handedChoice, hands.readValues())
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
    void opening.finally(() => hands.endFileOperation(DOCUMENT_OPEN_FAILED))
  }

  /** @purity non-pure */
  function beginWritingDocumentFile(writeForm: FileFlowWriteForm): void {
    const store = hands.files
    if (store === undefined) return hands.endFileOperation(DOCUMENT_FILE_WRITE_ENDED)
    const writing =
      writeForm.kind === 'save'
        ? saveHeldDocumentToFile(hands, flow, store)
        : exportHeldDocumentToFile(hands, flow, store, writeForm.format as ExportFormatId)
    void writing.finally(() => hands.endFileOperation(DOCUMENT_FILE_WRITE_ENDED))
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

  /** @purity semi-pure-b */
  function readFileSavedAt(): string | null {
    return fileSavedAt
  }

  /** @purity non-pure */
  function noteFileSaved(): void {
    fileSavedAt = readInstantOfWrite()
  }

  const flow = {
    askToWriteOverDestination,
    askHowToOpen,
    askWhichFileToTakeFrom,
    settleIncomingDocument,
    answerOverwriteQuestion,
    beginReadingDocumentFile,
    beginWritingDocumentFile,
    readFileSavedAt,
    noteFileSaved,
  }
  return flow
}

export type DocumentFileFlow = ReturnType<typeof documentFileFlowOf>

/** @purity non-pure */
export function answerOpenChoice(hands: DocumentFileFlowHands, openChoice: OpenChoice, frame: FrameValues | null): void {
  hands.sendToSession({ type: 'flowSurfaceAnswered', surfaceName: OPEN_CHOOSER_SURFACE }, frame)
  hands.sendToSession({ type: 'openChoiceAnswered', openChoice, question: discardQuestionOf(hands.readHeld().document) }, frame)
}

/** @purity non-pure */
function landOpenedDocument(hands: DocumentFileFlowHands, droppedTaskNames: readonly (string | null)[], openChoice: OpenChoice): void {
  hands.sendFromFlow({ type: 'documentOpenLanded', droppedTaskNames, openedFileName: null, openChoice })
}

// see OP-2, OP-5, OP-12, T-230
/** @purity non-pure */
export async function openDocumentIntoHold(
  hands: DocumentFileFlowHands, flow: Pick<DocumentFileFlow, 'askHowToOpen' | 'askWhichFileToTakeFrom'>, store: FileStore | null,
  route: OpenRoute,
  handed: HandedImport | null = null,
): Promise<boolean> {
  const current = hands.readHeld().document
  // TRAP: the bounds in force, never the file's, or a file raises its own ceiling.
  const bounds: ImportBounds = current.documentSettings

  let handedIn: { readonly format: ExchangeFormat; readonly byteLength: number } | null = null
  let incoming: Document
  let couldNotBeRead: readonly string[] = []
  if (handed !== null) {
    handedIn = { format: handed.format, byteLength: handed.byteLength }
    incoming = handed.incoming
    couldNotBeRead = handed.unreadColumns
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
    const decoded = decodedDocument(reading.format, file.text, current)
    if (decoded === null) return false
    handedIn = { format: reading.format, byteLength: file.byteLength }
    incoming = decoded.document
    if (decoded.clampedCount > 0) {
      hands.raiseNotice(SETTINGS_CLAMPED_REASON, decoded.clampedCount)
    }
    if (decoded.duplicateLeaves > 0) {
      hands.raiseNotice(DUPLICATE_LEAVES_REASON, decoded.duplicateLeaves)
    }
    couldNotBeRead = decoded.unreadColumns
  }
  const readIn = handedIn

  const verdict = validateImportedDocument(
    {
      document: incoming,
      byteLength: readIn.byteLength,
      emptyRowTaskUids: [],
    },
    bounds,
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
          bounds,
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

  const choice = await flow.askHowToOpen(current, handed?.choice ?? null)
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
    if (replaced) landOpenedDocument(hands, droppedNames, choice)
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
      couldNotBeRead,
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

  if (landed) landOpenedDocument(hands, droppedNames, choice)

  if (!landed || choice !== 'baseline') return landed

  // WHY: asked a second time because ReplaceOutcome carries no ImportReport.
  const overlaid = importDocument({
    ...importing,
    choice,
    merge: mergeAnswers,
    current: importedAgainst,
  })
  if (!overlaid.ok) return landed

  const notDrawn = overlaid.report.baselineTaskUidsNotDrawn.length
  if (notDrawn > 0) hands.raiseNotice(OVERLAY_NOT_DRAWN_REASON, notDrawn)
  return landed
}

// see OP-13
/** @purity non-pure */
async function reopenDocumentIntoHold(
  hands: DocumentFileFlowHands,
  flow: Pick<DocumentFileFlow, 'askHowToOpen' | 'askWhichFileToTakeFrom'>,
  store: FileStore,
): Promise<void> {
  const openedFile = await store.readOpenedFileState()
  if (openedFile.kind === 'none') return
  await openDocumentIntoHold(hands, flow, store, OPEN_ROUTE_REOPEN)
}

// see AM-8, FR-022
/** @purity non-pure */
export async function takeInHandedDocument(
  hands: DocumentFileFlowHands,
  flow: Pick<DocumentFileFlow, 'askHowToOpen' | 'askWhichFileToTakeFrom'>,
  incoming: Document,
): Promise<boolean> {
  const before = hands.readSession()
  hands.sendToSession(AGENT_DOCUMENT_HANDED, null)
  if (hands.readSession() === before) return false
  try {
    const handedText = jsonFromDocument(incoming)
    const reread = documentFromJson(handedText, GREATEST_KNOWN_SCHEMA_VERSION)
    return await openDocumentIntoHold(hands, flow, null, OPEN_ROUTE_FROM_CHOOSER, {
      incoming,
      format: 'grsJson',
      byteLength: new TextEncoder().encode(handedText).length,
      unreadColumns: reread.ok ? reread.unreadColumns : [],
      choice: 'merge',
    })
  } finally {
    hands.endFileOperation(DOCUMENT_OPEN_FAILED)
  }
}

// see SK-11, FR-060, FR-096
/** @purity non-pure */
async function saveHeldDocumentToFile(
  hands: DocumentFileFlowHands,
  flow: Pick<DocumentFileFlow, 'askToWriteOverDestination' | 'noteFileSaved'>,
  store: FileStore,
): Promise<void> {
  // TRAP: read before the first await; a later read saves a document nobody asked to save (CS-4).
  const saved = hands.readHeld().document
  const text = jsonFromDocument(saved)
  const project = saved.schedule.project

  const openedFile = await store.readOpenedFileState()
  const saving: DocumentFileSaving =
    openedFile.kind === 'none'
      ? await saveDocumentFile(store, chosenFileSave(flow, { text }, project, SAVE_FORM))
      : await saveDocumentFile(store, {
          destination: 'openedFile',
          content: { text },
          form: SAVE_FORM,
        })

  if (saving.ok) {
    const openedFileName = saving.openedFile.kind === 'none' ? null : saving.openedFile.fileName
    hands.sendFromFlow({ type: 'documentFileSaved', openedFileName })
    flow.noteFileSaved()
    return
  }
  hands.raiseFileFault(saving.fault)
}

// see FR-096, SK-12
/** @purity non-pure */
async function exportHeldDocumentToFile(
  hands: DocumentFileFlowHands,
  flow: Pick<DocumentFileFlow, 'askToWriteOverDestination'>,
  store: FileStore,
  format: ExportFormatId,
): Promise<void> {
  const form = saveFormOfExportFormat(format)
  if (form === null) return
  const written = hands.readHeld().document
  const text = exportedText(form, written)
  // WHY: a form that builds no picture owes no cap stop (CR-440 decision 9); the value rides with the content.
  const picture =
    text === null ? await exportPictureContent(hands, form, written) : { content: { text }, capStopGroupId: null }
  if (picture === null) return

  const saving = await saveDocumentFile(
    store,
    chosenFileSave(flow, picture.content, written.schedule.project, form),
  )
  if (saving.ok) {
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
  hands.sendToSession({ type: 'flowSurfaceAnswered', surfaceName: EXPORT_CHOOSER_SURFACE }, hands.readValues())
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
