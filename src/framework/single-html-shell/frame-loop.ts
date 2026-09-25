// SingleHtmlShell frame loop: holds the current values and computes table T-068 once per frame.
// @unit      UF-48   (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import { emptyDialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { DialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import {
  escapeTarget,
  type DualCursorSide,
  type EscapeTarget,
} from '../../entity/document-model/screen-state/screen-state'
import { emptySelection, selectionWithinSchedule } from '../../entity/document-model/selection/selection'
import type { Selection } from '../../entity/document-model/selection/selection'
import {
  emptyHistory,
  NOT_STORED_LIMITS,
  type HistoryLimits,
} from '../../entity/document-model/edit-history/edit-history'
import {
  scheduleViolations,
  taskByUid,
  textOfDay,
  type CalendarDay,
  type Task,
} from '../../entity/document-model/schedule/schedule'
import {
  grabSizesOf,
  itemAtPointer,
  selectionWithinDrawnRows,
  type Hit,
} from '../../entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionAtPointer,
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRect,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  applyDocumentChange,
  replaceDocument,
  type ChangeAudience,
  type DocumentCommand,
  type DocumentHolder,
  type HeldDocument,
  type PlanRefusal,
  type Refusal,
  type ReplacementCall,
  type ReplacementRefusal,
  type WriteMoment,
} from '../../use-case/apply-document-change/apply-document-change'
import {
  confirmationOwedBy,
  confirmationOwedByResourceDeletion,
  NOT_STORED_ZOOM_BOUNDS,
  type SettingsLimits,
} from '../../use-case/edit-document/edit-document'
import {
  advanceScreenSession,
  emptyScreenSession,
  type FileFlowImportAnswer,
  type FileFlowOpenRoute,
  type FileFlowOwedAction,
  type FileFlowQuestion,
  type FileFlowSurfaceName,
  type FileFlowWriteForm,
  type FileOperationState,
  type GrabbedRowAxis,
  type PressedOn,
  type PropertiesSubject,
  type ScreenSession,
  type ScreenValues,
  type ScreenValuesEvent,
  type SessionEffect,
  type SessionEvent,
  type StandingNotice,
} from '../../use-case/advance-screen-session/advance-screen-session'
import {
  importDocument,
  type OpenChoice,
} from '../../use-case/import-document/import-document'
import { emptyChangeWatchers, notifyChangeWatchers } from '../../use-case/notify-change-watchers/notify-change-watchers'
import type { installAgentApi } from '../../adapter/agent-api-endpoint/agent-api-endpoint'
import {
  jsonFromDocument,
  type AppShellSource,
  type ExchangeFormat,
} from '../../adapter/document-codec/document-codec'
import {
  type DocumentFileFault,
  type DocumentFileFaultReason,
  type FileStore,
} from '../../adapter/file-gateway/file-gateway'
import {
  exportPng,
  type ExportScene,
  type RasterFaultReason,
  type Rasterizer,
} from '../../adapter/image-exporter/image-exporter'
import {
  commandFromInput,
  isCombo,
  pressRowOf,
  screenEventFromInput,
  selectionFromInput,
  NOT_STORED_ZOOM_STEP,
  type HumanInput,
  type InputAction,
  type InputContext,
  type PointerInput,
  type PointerPress,
  type SpentEntranceSituation,
} from '../../adapter/input-command-translator/input-command-translator'
import {
  DEFAULT_ROW_NAME,
  dismissKeyOf,
  horizontalWholeOf,
  rulerWeekdayWords,
  screenViewFromRegions,
  scrollExtentOf,
  verticalWholeOf,
  type DisplayLanguage,
  type ExportFormatId,
  type HorizontalWhole,
  type IconId,
  type RaisedConfirmation,
  type RaisedNotice,
  type ScreenPart,
  type ScreenSurface,
  type ScreenViewReadings,
  type VerticalWhole,
} from '../../adapter/screen-renderer/screen-renderer'
import { svgFromSchedule, type SvgSurface } from '../../adapter/svg-renderer/svg-renderer'
import {
  writeClipboard,
  type Clipboard,
} from '../../adapter/clipboard-gateway/clipboard-gateway'
import {
  readBrowserStored,
  startupAgentApiEnabled,
  startupDisplayLanguage,
  writeBrowserStored,
} from './browser-stored-values'
import {
  pressedPointerShapeOf,
  type Grabbed,
  type ShowPointerShape,
} from './pointer-shape'
import { copyForPaste, pasteWhatWasCopied } from './copy-and-paste'
import {
  answerOpenChoice,
  answerSettledFormat,
  askToOpenDroppedFile,
  documentFileFlowOf,
  takeInHandedDocument,
  OPEN_ROUTE_FROM_CHOOSER,
  OPEN_ROUTE_REOPEN,
} from './document-file-flow'
import {
  drainFieldEditNotices,
  fieldFocusRetriesOf,
  isEditingField,
  isFieldFocusWanted,
  isNamingCreatedTaskIn,
  noteChoiceMoved,
  spendFieldCommit,
  tryWantedFieldBeforeInput,
  FIELD_ROW_OF_IN_PLACE_TARGET,
} from './field-entry'
import { frameClockWakesOf, repeatTimesOfHeldEntry } from './frame-clock-wakes'
import { marqueeRect, previewOfHeldPress, tentativeDependencyOf } from './held-press-preview'
import {
  interactionRecorderOf,
  isRecordingInteractionsIn,
  recordFrame,
  recordHappening,
  recordLine,
} from './interaction-record'
import { rowBandCeilingCacheOf } from './row-band-ceiling-cache'
import startupTemplate from './startup-template.json'
import { runSessionEffects, type EffectRunners } from './session-effects'
import { heldViewPlaceOf } from './view-place'
import { answerWatermarkUnlock, matchWatermarkUnlock } from './watermark-unlock'

export { startupAgentApiEnabled, startupDisplayLanguage } from './browser-stored-values'
export { pointerImageOf, pointerRowOf } from './pointer-shape'
export type { PointerFacing, PointerRow, PointerShape, ShowPointerShape } from './pointer-shape'
export { WATERMARK_UNLOCK_DIGEST } from './watermark-unlock'
export { copiedForPasteOf, pasteRefusedFor } from './copy-and-paste'
export { FOCUS_ON_DOCUMENT_BODY } from './interaction-record'
export { OPEN_ROUTE_FROM_DROP } from './document-file-flow'

export const GREATEST_KNOWN_SCHEMA_VERSION: string = startupTemplate.schemaVersion

// see FR-051
export interface FrameEnvironment {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly scrollbarThickness: number
  readonly rowControlsHeightPx?: number
}

export interface FrameValues {
  readonly regions: ScreenRegions
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
  readonly settingsMeasuredWith: DocumentSettings
  readonly isPictureAtStoredZoom: boolean
}

export type HeldDocumentCall = Extract<ReplacementCall, { readonly row: 'RD-6' }>

type AgentApiWiring = Parameters<typeof installAgentApi>[0]

export interface HandedImport {
  readonly incoming: Document
  readonly format: ExchangeFormat
  readonly byteLength: number
  readonly choice: OpenChoice
  readonly unreadColumns: readonly string[]
  readonly isNewerFormat: boolean
}

export type AgentApiSeams = Omit<AgentApiWiring, 'writerName' | 'schemaVersion'>

export type StartupNoticeReason = Extract<
  NoticeReason,
  'RS-15' | 'RS-21' | 'RS-25' | 'RS-26' | 'RS-48' | 'RS-51' | 'RS-63' | 'RS-64'
>

// see T-078
export interface FrameLoop {
  hasUnsavedEdits(): boolean
  holdDocument(call: HeldDocumentCall): void
  resize(env: FrameEnvironment): void
  settleFirstFrameEnvironment(env: FrameEnvironment): void
  // TRAP: asked before the watcher hears the happening; changing any state here
  // makes IN-4a read a screen that has already moved on.
  /** @purity non-pure */
  isBrowserDefaultStopped(input: HumanInput): boolean
  /** @purity non-pure */
  receiveInput(input: HumanInput): void
  current(): FrameValues | null
  document(): Document
  /** @purity semi-pure-b */
  exportScene(): ExportScene | null
  /** @purity semi-pure-b */
  agentApiSeams(): AgentApiSeams
  /** @purity non-pure */
  watchAgentApiEnabling(watch: (isEnabled: boolean) => void): void
  /** @purity non-pure */
  raiseStartupNotice(reason: StartupNoticeReason, affectedCount?: number | null): void
  /** @purity non-pure */
  fullScreenChanged(isFullScreen: boolean): void
  // see FT-1
  /** @purity non-pure */
  pressContinued(): void
  /** @purity non-pure */
  fileDropped(): void
}

// see FR-071, UF-48
export interface FullScreenHost {
  isFullScreen(): boolean
  requestFullScreen(): Promise<void>
  exitFullScreen(): Promise<void>
}

export interface ScreenWiring {
  readonly surface: ScreenSurface
  readonly language: DisplayLanguage
  // TRAP: optional, so a host that omits it leaves MK-13 half done with nothing
  // to say so.
  // WHY: only false (the focus did not enter) asks again; a host that cannot tell answers otherwise.
  readonly focusPropertyField?: (row: string) => unknown
  readonly readWatermarkUnlockAnswer?: () => string
  // see FR-102, IR-1
  // TRAP: answers a row ID or FOCUS_ON_DOCUMENT_BODY, never the field's contents (FR-102 MUST NOT).
  readonly readFocusPosition?: () => string
}

export interface FrameLoopHands {
  readSession(): ScreenSession
  readValues(): FrameValues | null
  readEnvironment(): FrameEnvironment
  readPressed(): PointerPress | null
  sendToSession(event: SessionEvent, frame: FrameValues | null): void
  readHeld(): HeldDocument
  isFrameOwed(): boolean
  readonly screen: ScreenWiring | undefined
  readonly clipboard: Clipboard | undefined
  ask(): void
  runFrame(): void
  raiseNotice(reason: NoticeReason, affectedCount: number | null): void
  writeDocument(commands: readonly DocumentCommand[], frame: FrameValues, isSettlingFieldCommit?: boolean): void
  settingsLimitsOf(frame: FrameValues | null): SettingsLimits
  collectInputContext(frame: FrameValues, isNoticeStanding?: boolean): InputContext
  isPropertiesPanelOnScreen(): boolean
  readonly files: FileStore | undefined
  readonly rasterizer: Rasterizer | undefined
  readonly appShell: AppShellSource | undefined
  sendFromFlow(event: SessionEvent): void
  endFileOperation(ended: SessionEvent): void
  raiseFileFault(fault: DocumentFileFault): void
  replaceHeldDocument(call: ReplacementCall): boolean
  exportScene(): ExportSceneWithCapStop | null
}

const BYTES_PER_MEGABYTE = 1024 * 1024

export const HISTORY_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  // TRAP: S-95 is in megabytes; read as bytes, every write collapses the history to one step.
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * BYTES_PER_MEGABYTE,
}

const ESCAPE_KEY = 'Esc'
const ENTER_KEY = 'Enter'

const GUIDE_CURSOR_NONE = 'none'

// TRAP: not generated; a change to ED-1 of table T-229 must be copied here by hand.
export const EDITED_BY_SCREEN = 'user'

const DISPLAY_LANGUAGE_ENTRY: IconId = 'IC-21'
const MILESTONE_LIST_ENTRY: IconId = 'IC-50'
const PALETTE_MINIMISE_ENTRY: IconId = 'IC-75'
const INTERACTION_RECORD_ENTRY: IconId = 'IC-76'
const CONFIRMATION_PROCEED_ANSWER = 'proceed'

const CONFIRMATION_PROCEED_KEY = 'Y'
const CONFIRMATION_CANCEL_KEY = 'N'

// see NT-7
/** @purity pure */
function isConfirmationAnswerKey(key: string): boolean {
  return key === CONFIRMATION_PROCEED_KEY || key === CONFIRMATION_CANCEL_KEY
}
const DIALOGUE_FIELD_ENTRY: IconId = 'IC-18'

const ROSTER_DELETE_ENTRY: IconId = 'IC-66'

const NEW_DOCUMENT_ENTRY: IconId = 'IC-98'

const PALETTE_GRAB_BAND_ENTRY: IconId = 'IC-53'

const CLOSE_SURFACE_ENTRY: IconId = 'IC-52'

const PROPERTIES_PANEL_SURFACE = 'Properties Panel'

const AI_EXPORT_MODAL_SURFACE = 'AI Export Modal'

// TRAP: also spelled in screen-state-input.ts and open-modals.ts; a misspelling raises a surface
// nothing describes.
export const EXPORT_CHOOSER_SURFACE = 'Export Chooser'

// see U-60, T-280
export const WATERMARK_UNLOCK_ROW = 'U-60'

const ESCAPE_SURFACE: ScreenValuesEvent = { type: 'escapePressed', rung: 'surface' }
const ESCAPE_ARMED: ScreenValuesEvent = { type: 'escapePressed', rung: 'armed' }
const ESCAPE_DUAL_CURSOR: ScreenValuesEvent = { type: 'escapePressed', rung: 'dualCursorMode' }
const ESCAPE_TOOLTIP: ScreenValuesEvent = { type: 'escapePressed', rung: 'tooltip' }
const SURFACE_CLOSE_ASKED: ScreenValuesEvent = { type: 'surfaceCloseAsked', target: 'surface' }
const PANEL_CLOSE_ASKED: ScreenValuesEvent = { type: 'surfaceCloseAsked', target: 'panel' }
const POINTER_RESTED: ScreenValuesEvent = { type: 'pointerRestElapsed' }
const NEWEST_NOTICE_DISMISS_ASKED: SessionEvent = { type: 'newestNoticeDismissAsked' }
const DOCUMENT_REPLACED: SessionEvent = { type: 'documentReplaced' }
const POINTER_RELEASED: SessionEvent = { type: 'pointerReleased' }
const PRESS_INTERRUPTED: SessionEvent = { type: 'pressInterrupted' }
export const ENTRY_REPEAT_TIME_ELAPSED: SessionEvent = { type: 'entryRepeatTimeElapsed' }
const DOCUMENT_EDIT_LANDED: SessionEvent = { type: 'documentEditLanded' }
export const CHOICE_MOVED: SessionEvent = { type: 'choiceMoved' }
export const FIELD_FOCUS_WITHDRAWN: SessionEvent = { type: 'fieldFocusWithdrawn' }
const SELECTION_CLEARED: SessionEvent = { type: 'selectionCleared' }
const INTERACTION_RECORD_TOGGLED: SessionEvent = { type: 'interactionRecordToggled' }
const AGENT_API_ENTRY_PRESSED: SessionEvent = { type: 'agentApiEntryPressed' }
// see FR-100, T-230, T-290
// WHY: null for the open road's rows, which land as documentOpenLanded with the choice they carry.
const LANDING_OF_REPLACEMENT_ROW: Readonly<Record<ReplacementCall['row'], SessionEvent | null>> = {
  'RD-1': DOCUMENT_EDIT_LANDED,
  'RD-2': DOCUMENT_EDIT_LANDED,
  'RD-3': null,
  'RD-4': null,
  'RD-6': { type: 'startupDocumentHeld' },
  'RD-7': { type: 'newDocumentLanded' },
}
export const AGENT_DOCUMENT_HANDED: SessionEvent = { type: 'agentDocumentHanded' }
export const DOCUMENT_OPEN_FAILED: SessionEvent = { type: 'documentOpenFailed' }
export const DOCUMENT_FILE_WRITE_ENDED: SessionEvent = { type: 'documentFileWriteEnded' }
const SAVE_WRITE_FORM: FileFlowWriteForm = { kind: 'save' }
const CLEAR_DUAL_CURSOR: readonly DocumentCommand[] = [{ kind: 'clearDualCursor' }]

// see DC-9
const GUIDE_CURSOR_CLEARED: DocumentCommand = { kind: 'setGuideCursorMode', mode: GUIDE_CURSOR_NONE }

// see IN-4, T-283
// WHY: null where today's call spends the rung -- notice and confirmation in receiveInput, textEntry
// by the surface (IF-9), gesture below the translators, selection by selectionFromInput.
const ESCAPE_RUNG_EVENTS: { readonly [R in EscapeTarget]: ScreenValuesEvent | null } = {
  notice: null,
  textEntry: null,
  confirmation: null,
  surface: ESCAPE_SURFACE,
  gesture: null,
  propertiesPanel: ESCAPE_SURFACE,
  armed: ESCAPE_ARMED,
  selection: null,
  dualCursorMode: ESCAPE_DUAL_CURSOR,
  tooltip: ESCAPE_TOOLTIP,
}

const FULL_SCREEN_REFUSED_REASON: NoticeReason = 'RS-59'

export const CONFIRMATION_MANNER = 'NT-7'

// see ZE-5
const PERCENT_PER_WHOLE = 100

// see IN-4, IN-5a, IN-5b
// TRAP: spelled as dom-input-source.ts delivers them; Tab moves the focus the person's way.
export const FIELD_FOCUS_WITHDRAWING_KEYS: ReadonlySet<string> = new Set([ESCAPE_KEY, 'Tab'])

export type ConfirmationQuestion = FileFlowQuestion['question']

const DISCARD_QUESTION: ConfirmationQuestion = 'QN-5'

export type NoticeReason =
  | 'RS-1'
  | 'RS-2'
  | 'RS-3'
  | 'RS-4'
  | 'RS-5'
  | 'RS-6'
  | 'RS-7'
  | 'RS-8'
  | 'RS-9'
  | 'RS-10'
  | 'RS-11'
  | 'RS-12'
  | 'RS-13'
  | 'RS-14'
  | 'RS-15'
  | 'RS-16'
  | 'RS-20'
  | 'RS-21'
  | 'RS-23'
  | 'RS-24'
  | 'RS-25'
  | 'RS-26'
  | 'RS-27'
  | 'RS-28'
  | 'RS-29'
  | 'RS-30'
  | 'RS-31'
  | 'RS-32'
  | 'RS-33'
  | 'RS-34'
  | 'RS-35'
  | 'RS-36'
  | 'RS-37'
  | 'RS-38'
  | 'RS-39'
  | 'RS-40'
  | 'RS-41'
  | 'RS-42'
  | 'RS-43'
  | 'RS-44'
  | 'RS-46'
  | 'RS-48'
  | 'RS-51'
  | 'RS-52'
  | 'RS-53'
  | 'RS-54'
  | 'RS-55'
  | 'RS-56'
  | 'RS-57'
  | 'RS-58'
  | 'RS-59'
  | 'RS-60'
  | 'RS-63'
  | 'RS-64'

// TRAP: not generated; a manner moved in table T-233 must be copied here by hand.
const NOTICE_MANNER_OF_REASON: Readonly<Record<NoticeReason, string>> = {
  'RS-1': 'NT-3a',
  'RS-2': 'NT-3a',
  'RS-3': 'NT-3a',
  'RS-4': 'NT-1',
  'RS-5': 'NT-1',
  'RS-6': 'NT-1',
  'RS-7': 'NT-1',
  'RS-8': 'NT-1',
  'RS-9': 'NT-1',
  'RS-10': 'NT-1',
  'RS-11': 'NT-1',
  'RS-12': 'NT-1',
  'RS-13': 'NT-1',
  'RS-14': 'NT-5',
  'RS-15': 'NT-3a',
  'RS-16': 'NT-5',
  'RS-20': 'NT-5',
  'RS-21': 'NT-1',
  'RS-23': 'NT-3a',
  'RS-24': 'NT-3a',
  'RS-25': 'NT-1',
  'RS-26': 'NT-1',
  'RS-27': 'NT-1',
  'RS-28': 'NT-1',
  'RS-29': 'NT-1',
  'RS-30': 'NT-1',
  'RS-31': 'NT-1',
  'RS-32': 'NT-1',
  'RS-33': 'NT-1',
  'RS-34': 'NT-1',
  'RS-35': 'NT-1',
  'RS-36': 'NT-1',
  'RS-37': 'NT-1',
  'RS-38': 'NT-1',
  'RS-39': 'NT-1',
  'RS-40': 'NT-3a',
  'RS-41': 'NT-3a',
  'RS-42': 'NT-3a',
  'RS-43': 'NT-3a',
  'RS-44': 'NT-1',
  'RS-46': 'NT-3a',
  'RS-48': 'NT-1',
  'RS-51': 'NT-5',
  'RS-52': 'NT-3',
  'RS-53': 'NT-1',
  'RS-54': 'NT-1',
  'RS-55': 'NT-1',
  'RS-56': 'NT-1',
  'RS-57': 'NT-1',
  'RS-58': 'NT-1',
  'RS-59': 'NT-3a',
  'RS-60': 'NT-5',
  'RS-63': 'NT-5',
  'RS-64': 'NT-1',
}

const NOTICE_REASON_OF_FILE_FAULT: Readonly<
  Record<DocumentFileFaultReason, NoticeReason | null>
> = {
  cancelled: null,
  permissionLost: 'RS-1',
  noOpenedFile: 'RS-2',
  unavailable: 'RS-3',
  notUtf8: 'RS-4',
  notAnOverwriteTarget: 'RS-5',
}

const NOTICE_REASON_OF_WRITE_REFUSAL: Readonly<
  Record<PlanRefusal['reason'] | ReplacementRefusal['reason'], NoticeReason | null>
> = {
  staleStamp: 'RS-6',
  gestureInFlight: 'RS-7',
  editingInPlace: 'RS-8',
  deliveringNotices: 'RS-9',
  refused: 'RS-10',
  importRefused: null,
}

interface RefusalSituation {
  readonly reason: NoticeReason
  readonly command: string | null
  readonly rule: string
  readonly reasonCategory?: Refusal['reasonCategory']
}

const REFUSAL_SITUATIONS: readonly RefusalSituation[] = [
  { reason: 'RS-54', command: 'CM-20', rule: 'FR-083' },
  { reason: 'RS-55', command: null, rule: 'HM-4' },
  { reason: 'RS-56', command: 'CM-36', rule: 'FR-009', reasonCategory: 'bothEndsAreOneTask' },
  { reason: 'RS-57', command: null, rule: 'IV-1' },
  { reason: 'RS-58', command: 'CM-6', rule: 'FR-012' },
  { reason: 'RS-58', command: 'CM-11', rule: 'FR-012' },
]

// see T-233
/** @purity pure */
function situationReasonOf(one: Refusal): NoticeReason | null {
  for (const situation of REFUSAL_SITUATIONS) {
    if (situation.rule !== one.rule) continue
    if (situation.command !== null && situation.command !== one.command) continue
    if (situation.reasonCategory !== undefined && situation.reasonCategory !== one.reasonCategory) {
      continue
    }
    return situation.reason
  }
  return null
}

// see T-233, WS-3
/** @purity pure */
function reasonOfWriteRefusal(refusal: PlanRefusal | ReplacementRefusal): NoticeReason | null {
  if (refusal.step === 'WS-3' && refusal.reason === 'refused') {
    const all = refusal.refusals
    const first = all.length > 0 ? situationReasonOf(all[0] as Refusal) : null
    if (first !== null && all.every((one) => situationReasonOf(one) === first)) return first
  }
  return NOTICE_REASON_OF_WRITE_REFUSAL[refusal.reason]
}

const RECOUNTED_PERCENT_COMPLETE_REASON: NoticeReason = 'RS-52'

export const HEIGHT_CEILING_REASON: NoticeReason = 'RS-43'


export const NOTICE_REASON_OF_RASTER_FAULT: Readonly<Record<RasterFaultReason, NoticeReason>> = {
  unsupported: 'RS-42',
  tooLarge: 'RS-43',
  rasterFailed: 'RS-42',
}

export const SEAM_ABSENT_REASON: NoticeReason = 'RS-3'

const NO_WORKING_WEEKDAY_REASON: Extract<NoticeReason, 'RS-21'> = 'RS-21'

export const STACK_SAFETY_CAP_REASON: NoticeReason = 'RS-24'

export const NOTHING_TO_DO_REASON: NoticeReason = 'RS-27'

const NOTICE_REASON_OF_SPENT_ENTRANCE: Readonly<
  Record<SpentEntranceSituation, NoticeReason>
> = {
  noFoldedRowBelow: 'RS-28',
  noUnfoldedRowBelow: 'RS-29',
  rowIsOpenWithNoHiddenChild: 'RS-30',
  noFoldedRowAtAll: 'RS-31',
  noUnfoldedRowAtAll: 'RS-32',
  onlyOneOfPlanAndActualShown: 'RS-33',
  noTaskChosenToAlignWith: 'RS-34',
  noSiblingAboveToNestUnder: 'RS-36',
  rowIsAtTheShallowestLevel: 'RS-37',
  groupDepthLimitReached: 'RS-38',
  noPlaceLeftInThatDirection: 'RS-39',
  noRowToPutTheAnnotationOn: 'RS-44',
  rowIsAtTheDeepestLevel: 'RS-46',
  barShapeReleasedWithoutADrag: 'RS-53',
}

const NO_WORKING_WEEKDAY_INVARIANT = 'IV-17'

// see FR-088, IV-17
/** @purity pure */
export function noWorkingWeekdayReason(document: Document): StartupNoticeReason | null {
  const violated = scheduleViolations(document.schedule, document.documentSettings).some(
    (one) => one.row === NO_WORKING_WEEKDAY_INVARIANT,
  )
  return violated ? NO_WORKING_WEEKDAY_REASON : null
}

// TRAP: ScreenState.surface, icon-roster.json and readScreenPartAt must spell it
// the same; a misspelling raises a surface nothing describes.
export const OPEN_CHOOSER_SURFACE = 'Open Chooser'

// TRAP: dom-screen-surface.ts's ROLE.dialogueField must spell it the same; a mismatch
// silently leaves the Dialogue Field's press stopped like any other rowArea press.
const DIALOGUE_FIELD_SURFACE = 'Dialogue Field'

const OPEN_CHOICE_OF_ENTRY: Readonly<Record<IconId, OpenChoice>> = {
  'IC-71': 'replace',
  'IC-72': 'merge',
  'IC-73': 'baseline',
}

// TRAP: also spelled in icon-roster.json, open-modals.ts and screen-renderer.ts; a
// misspelling raises a surface nothing describes.
const DIFFERENCE_REVIEW_SURFACE = 'Difference Review'

const IMPORT_REPORT_SURFACE = 'Import Report'

const SURFACE_NAME_OF_FLOW: Readonly<Record<FileFlowSurfaceName, string>> = {
  'U-56': OPEN_CHOOSER_SURFACE,
  'U-61': DIFFERENCE_REVIEW_SURFACE,
  'U-62': IMPORT_REPORT_SURFACE,
}

const MERGE_MAPPING_OF_ENTRY: Readonly<Record<IconId, MergeMapping>> = {
  'IC-95': { kind: 'allSame' },
  'IC-96': { kind: 'allDifferent' },
  'IC-97': { kind: 'cancelImport' },
}

// see FR-053
/** @purity pure */
function paletteCornerOf(
  draggedTo: { readonly x: number; readonly y: number } | null,
  regions: ScreenRegions,
): { readonly x: number; readonly y: number } {
  return draggedTo ?? { x: regions.rowArea.x, y: regions.rowArea.y }
}

type PanelShowing = 'selection' | 'documentSettings' | null

export type MergeCandidateLine = NonNullable<ScreenViewReadings['mergeCandidates']>[number]
export type MergeChoices = NonNullable<Parameters<typeof importDocument>[0]['merge']>
export type MergeMapping = NonNullable<MergeChoices['mapping']>

interface ScreenViewReadingsTaken {
  readonly openedFileName: string | null
  readonly fileSavedAt: string | null
  readonly isAgentApiEnabled: boolean
  readonly isAiExportSurfaceOpen: boolean
  readonly pointer: { readonly x: number; readonly y: number } | null
  readonly pointerRestedMs: number
  readonly iconUnderPointer: IconId | null
  readonly taskUnderPointer: Task | null
  readonly commandPaletteDraggedTo: { readonly x: number; readonly y: number } | null
  readonly rowGrabbedAt: {
    readonly groupId: string
    readonly depth: number
    readonly axis: 'position' | 'depth'
    readonly resistedPx: number
    readonly atY: number | null
  } | null
  readonly isRecordingInteractions: boolean
  readonly selectedGroupIds: readonly string[]
  readonly selectedResourceUids: readonly number[]
  readonly confirmation: RaisedConfirmation | null
  readonly mergeCandidates: readonly MergeCandidateLine[]
  readonly unreadColumns: readonly string[]
  readonly droppedTaskNames: readonly (string | null)[]
  readonly notices: readonly RaisedNotice[]
  readonly canUndo?: boolean
  readonly canRedo?: boolean
}

// see PI-37, SF-5, SF-10
// STOP: spec does not decide where the chosen rows and assignees are held,
// since SL-1 admits neither. Looked in FR-085, FR-099, SL-1
// @provisional PND-142
/** @purity pure */
function screenViewReadingsOf(
  held: Document,
  regions: ScreenRegions,
  layout: ScheduleLayout,
  heldWhole: HeldWholes | null,
  taken: ScreenViewReadingsTaken,
): ScreenViewReadings {
  const { isAiExportSurfaceOpen, commandPaletteDraggedTo, canUndo, canRedo, ...carried } = taken
  return {
    ...carried,
    ...(isAiExportSurfaceOpen ? { aiExportDocument: jsonFromDocument(held) } : {}),
    commandPaletteAt: paletteCornerOf(commandPaletteDraggedTo, regions),
    themePreference: held.documentSettings.themePreference,
    themeHue: held.schedule.project.themeHue,
    rowBoxes: drawnRowBoxesOf(layout, regions),
    placedRowGroupIds: layout.rows.map((row) => row.groupId),
    scrollExtent: scrollExtentOf(layout, regions, {
      horizontal: heldWhole?.horizontal ?? horizontalWholeOf(layout, regions),
      vertical: heldWhole?.vertical ?? verticalWholeOf(layout, regions),
    }),
    ...(canUndo === undefined ? {} : { canUndo }),
    ...(canRedo === undefined ? {} : { canRedo }),
  }
}

interface HeldWholes {
  readonly horizontal: HorizontalWhole | null
  readonly vertical: VerticalWhole | null
}

// see FR-052, GR-21
/** @purity pure */
function measuredAtPress(
  frame: FrameValues,
): Pick<PointerPress, 'propertyPanelWidthAtPress' | 'horizontalWholeAtPress' | 'verticalWholeAtPress'> {
  return {
    propertyPanelWidthAtPress: frame.regions.propertiesPanel.width,
    horizontalWholeAtPress: horizontalWholeOf(frame.layout, frame.regions),
    verticalWholeAtPress: verticalWholeOf(frame.layout, frame.regions),
  }
}

// see GR-21
/** @purity pure */
function heldWholeOf(press: PointerPress | null): HeldWholes | null {
  const axis = press?.on?.scrollbarAxis
  if (press === null || axis === undefined) return null
  return {
    horizontal: axis === 'horizontal' ? press.horizontalWholeAtPress ?? null : null,
    vertical: axis === 'vertical' ? press.verticalWholeAtPress ?? null : null,
  }
}

// see T-280, SS-6
// WHY: the startup language seats the initial value; sent as an event it would store S-99 on
// every start, which today's start never writes (FR-038).
/** @purity pure */
function startingSession(language: DisplayLanguage): ScreenSession {
  return { ...emptyScreenSession, screen: { ...emptyScreenSession.screen, language } }
}

// see FR-080, EP-11, EP-12
/** @purity pure */
function pictureSessionOf(session: ScreenSession): ScreenSession {
  const now = session.screen
  const screen: ScreenValues = {
    ...emptyScreenSession.screen,
    language: now.language,
    paletteDisplayState: { kind: 'hidden' },
    dialogueFieldDisplayState: { kind: 'hidden' },
  }
  return { ...emptyScreenSession, screen }
}

/** @purity pure */
function dualCursorDrawnOf(
  session: ScreenSession,
  pointerAt: { readonly x: number; readonly y: number } | null,
): { readonly side: DualCursorSide; readonly x: number | null } | null {
  const side = dualCursorFollowingIn(session)
  return side === null ? null : { side, x: pointerAt === null ? null : pointerAt.x }
}

/** @purity pure */
export function openSurfaceNameIn(session: ScreenSession): string | null {
  const open = session.screen.openSurfaceState
  return open.kind === 'open' ? open.surfaceName : null
}

/** @purity pure */
export function dualCursorFollowingIn(session: ScreenSession): DualCursorSide | null {
  const mode = session.screen.dualCursorModeState
  if (mode.kind === 'off') return null
  return mode.child.kind === 'placingDate1' ? 'date1' : 'date2'
}

// WHY: never null here; startingSession seats the language before the first frame.
/** @purity pure */
function displayLanguageIn(session: ScreenSession): DisplayLanguage {
  return session.screen.language ?? 'en'
}

/** @purity pure */
export function panelShowingIn(session: ScreenSession): PanelShowing {
  const content = session.screen.propertiesPanelContentState.kind
  if (content === 'hidden') return null
  return content === 'selectionDisplayed' ? 'selection' : 'documentSettings'
}

// see NT-3, T-286
/** @purity pure */
export function standingNoticesIn(session: ScreenSession): readonly StandingNotice[] {
  const onScreen = session.notices.noticeDisplayState
  return onScreen.kind === 'shown' ? onScreen.standing : []
}

// see WS-2, T-286
/** @purity pure */
function isDeliveringNoticesIn(session: ScreenSession): boolean {
  return session.notices.changeDeliveryState.kind === 'delivering'
}

// see FR-076, T-233, T-286
// WHY: the region carries no manner; the renderer's RaisedNotice takes it from the reason.
/** @purity pure */
function raisedNoticesOf(session: ScreenSession): readonly RaisedNotice[] {
  return standingNoticesIn(session).map((one) => ({
    manner: NOTICE_MANNER_OF_REASON[one.reason as NoticeReason],
    reason: one.reason,
    affectedCount: one.affectedCount,
  }))
}

// see NT-8, IN-4, SK-19, T-283
// WHY: the keys whose first rung is a standing notice: Esc (RG-1) and a plain Enter (T-036).
/** @purity pure */
function isNoticeDismissKey(input: HumanInput): boolean {
  if (input.kind !== 'key') return false
  return input.key === ESCAPE_KEY || (input.key === ENTER_KEY && isCombo(input.modifiers, false, false, false))
}

/** @purity pure */
function surfaceOpenedBy(event: ScreenValuesEvent, screen: ScreenValues): string | null {
  if (event.type === 'surfaceEntryPressed' || event.type === 'surfaceRaisedByFlow') return event.surfaceName
  if (event.type !== 'watermarkEntryPressed') return null
  return screen.watermarkDisplayState.kind === 'shown' ? WATERMARK_UNLOCK_ROW : null
}

// DEVIATION: spec says an open surface takes no other (T-280); here the new one replaces it (DFC-705)
/** @purity pure */
function withSurfaceReplaced(
  event: ScreenValuesEvent,
  screen: ScreenValues,
): readonly ScreenValuesEvent[] {
  const opened = surfaceOpenedBy(event, screen)
  const open = screen.openSurfaceState
  const isReplacing = opened !== null && open.kind === 'open' && open.surfaceName !== opened
  return isReplacing ? [SURFACE_CLOSE_ASKED, event] : [event]
}

// see DC-1, DC-2, DC-4, DC-9, T-280
/** @purity pure */
function dualCursorEventOf(
  action: Extract<InputAction, { readonly kind: 'setDualCursorFollowing' }>,
  session: ScreenSession,
): ScreenValuesEvent {
  if (action.guideCursor !== undefined) return { type: 'guideCursorEntryPressed', guideCursor: action.guideCursor }
  const placed = action.placed
  const writes: readonly DocumentCommand[] =
    placed === null || placed.kind === 'clearDualCursor' ? [] : [placed]
  const following = dualCursorFollowingIn(session)
  if (following === null || action.following === null) {
    const date = placed?.kind === 'setDualCursor' ? placed.date1 : ''
    return { type: 'dualCursorEntryPressed', date, hasDaysToPlace: true, writes }
  }
  if (placed?.kind !== 'setDualCursor') return { type: 'dualCursorPlaced', date: '', writes }
  return { type: 'dualCursorPlaced', date: following === 'date1' ? placed.date1 : placed.date2, writes }
}

// see FR-072, IC-17, EN-4, S-99h
// DEVIATION: spec says a hidden panel keeps no subject (T-280, JDG-283); here the settings go back to the last one (DFC-677)
/** @purity pure */
function settingsEntryEventsOf(
  session: ScreenSession,
  kept: PropertiesSubject | null,
): readonly ScreenValuesEvent[] {
  const pressed: ScreenValuesEvent = { type: 'settingsEntryPressed' }
  if (panelShowingIn(session) !== null || kept === null) return [pressed]
  return [{ type: 'propertiesOfChoiceAsked', subject: kept }, pressed]
}

// see FR-072, T-280
// DEVIATION: spec says a moved choice leaves the settings shown (T-280); here the choice is shown (DFC-706)
/** @purity pure */
function choiceFollowedOf(session: ScreenSession, subject: PropertiesSubject): ScreenValuesEvent | null {
  const showing = panelShowingIn(session)
  if (showing === null) return null
  if (showing === 'selection') return { type: 'selectionMoved', subject }
  return { type: 'propertiesOfChoiceAsked', subject }
}

/** @purity pure */
function subjectOfChoice(selection: Selection, groupIds: readonly string[]): PropertiesSubject | null {
  if (selection.items.length === 0 && groupIds.length === 0) return null
  return { selection, groupIds }
}

type ExportSceneWithCapStop = ExportScene & { readonly capStopGroupId: string | null }

// see HF-15, SF-5
type GrabbedRowPlace = Omit<NonNullable<ScreenViewReadingsTaken['rowGrabbedAt']>, 'axis'>

interface ScreenEffectHands {
  readonly raiseNotice: (reason: NoticeReason) => void
  readonly storeLanguage: (language: DisplayLanguage) => void
  readonly askBrowserForFullScreen: () => void
  readonly matchWatermarkUnlock: () => void
  readonly clearSelection: () => void
  readonly writeCarried: (writes: readonly DocumentCommand[], frame: FrameValues | null) => void
  readonly startScaleMessageTimer: () => void
  readonly startEntryRepeat: () => void
  readonly repeatHeldEntry: () => void
  readonly restorePaletteCorner: () => void
  readonly raiseFlowSurface: (surfaceName: FileFlowSurfaceName) => void
  readonly tellFlowSurfaceClosed: (surfaceName: string, frame: FrameValues | null) => void
  readonly readDocumentFile: (openRoute: FileFlowOpenRoute) => void
  readonly writeDocumentFile: (writeForm: FileFlowWriteForm) => void
  readonly importIncomingDocument: (answer: FileFlowImportAnswer) => void
  readonly discardIncomingDocument: () => void
  readonly answerOverwriteQuestion: (isProceeding: boolean) => void
  readonly carryOutOwedAction: (owedAction: FileFlowOwedAction, frame: FrameValues | null) => void
  readonly bringCreatedRowIntoSight: (groupId: string) => void
  readonly beginInteractionRecord: () => void
  readonly handInteractionRecordToClipboard: () => void
  readonly storeAgentApiEnabling: () => void
}

// see SF-6, UF-123, T-280
/** @purity pure */
function effectRunnersOf(hands: ScreenEffectHands): EffectRunners<SessionEffect> {
  const carried = (effect: { readonly writes: readonly DocumentCommand[] }, frame: FrameValues | null): void =>
    hands.writeCarried(effect.writes, frame)
  return {
    raiseNotice: (effect) => hands.raiseNotice(effect.reason),

    storeLanguage: (effect) => hands.storeLanguage(effect.language),
    // DEVIATION: spec says this effect writes the step (T-280); here GA-18's action does, after the press drops (DFC-708)
    writeProgressStep: () => undefined,
    askBrowserForFullScreen: () => hands.askBrowserForFullScreen(),
    tellFlowSurfaceClosed: (effect, frame) => hands.tellFlowSurfaceClosed(effect.surfaceName, frame),
    matchWatermarkUnlock: () => hands.matchWatermarkUnlock(),
    clearSelection: () => hands.clearSelection(),
    writePlaceDualCursorClearingGuide: (effect, frame) => hands.writeCarried([...effect.writes, GUIDE_CURSOR_CLEARED], frame),
    writeFixDate1: carried,
    writeFixDate2: carried,
    writeClearDualCursor: (_effect, frame) => hands.writeCarried(CLEAR_DUAL_CURSOR, frame),
    writeClearDualCursorSettingGuide: (effect, frame) =>
      hands.writeCarried([...CLEAR_DUAL_CURSOR, { kind: 'setGuideCursorMode', mode: effect.guideCursor }], frame),
    startScaleMessageTimer: () => hands.startScaleMessageTimer(),
    restartScaleMessageTimer: () => hands.startScaleMessageTimer(),

    startEntryRepeat: () => hands.startEntryRepeat(),
    restorePaletteCorner: () => hands.restorePaletteCorner(),
    repeatHeldEntry: () => hands.repeatHeldEntry(),

    raiseFlowSurface: (effect) => hands.raiseFlowSurface(effect.surfaceName),
    readDocumentFile: (effect) => hands.readDocumentFile(effect.openRoute),
    writeDocumentFile: (effect) => hands.writeDocumentFile(effect.writeForm),
    importIncomingDocument: (effect) => hands.importIncomingDocument(effect.answer),
    discardIncomingDocument: () => hands.discardIncomingDocument(),
    answerOverwriteQuestion: (effect) => hands.answerOverwriteQuestion(effect.isProceeding),
    carryOutOwedAction: (effect, frame) => hands.carryOutOwedAction(effect.owedAction, frame),

    bringCreatedRowIntoSight: (effect) => hands.bringCreatedRowIntoSight(effect.groupId),

    beginInteractionRecord: () => hands.beginInteractionRecord(),
    handInteractionRecordToClipboard: () => hands.handInteractionRecordToClipboard(),

    storeAgentApiEnabling: () => hands.storeAgentApiEnabling(),
  }
}

// see SC-1, FR-098
/** @purity pure */
function drawnRowBoxesOf(
  layout: ScheduleLayout,
  regions: ScreenRegions,
): readonly { readonly groupId: string; readonly box: ScreenRect }[] {
  const scrollTop = layout.scrollAreaY ?? regions.rowArea.y
  return layout.rows.flatMap((row) => {
    const top = Math.max(row.y, row.isPinned === true ? regions.rowArea.y : scrollTop)
    const bottom = Math.min(row.y + row.height, regions.rowArea.y + regions.rowArea.height)
    if (bottom <= top) return []
    return [
      {
        groupId: row.groupId,
        box: {
          x: regions.rowTitlePanel.x,
          y: top,
          width: regions.rowTitlePanel.width,
          height: bottom - top,
        },
      },
    ]
  })
}

// TRAP: a FrameEnvironment member left out here wakes no frame when only that member changes.
/** @purity pure */
export function isSameEnvironment(one: FrameEnvironment, other: FrameEnvironment): boolean {
  return (
    one.width === other.width &&
    one.height === other.height &&
    one.appHeaderHeight === other.appHeaderHeight &&
    one.scrollbarThickness === other.scrollbarThickness &&
    one.rowControlsHeightPx === other.rowControlsHeightPx
  )
}

// see BO-1
/** @purity pure */
export function isSizeSettled(env: FrameEnvironment): boolean {
  return env.width > 0 && env.height > 0
}

// see IN-1, IN-1a
/** @purity pure */
function hasEndedGesture(input: HumanInput): boolean {
  return input.kind === 'pointer' && (input.phase === 'up' || input.phase === 'lost')
}

// see IN-4
/** @purity pure */
function escapeLevelOf(
  input: HumanInput,
  context: InputContext,
  isConfirmationStanding: boolean,
  isPropertiesPanelOpen: boolean,
  isTooltipStanding: boolean,
): EscapeTarget | null {
  if (input.kind !== 'key' || input.key !== ESCAPE_KEY) return null
  return escapeTarget({
    isNoticeStanding: context.isNoticeStanding === true,
    isTextEntryUnsettled: context.isTextEntryUnsettled,
    isSurfaceOpen: context.screen.openSurfaceState.kind === 'open',
    gestureInFlight: context.pressed !== null,
    isArmed: context.screen.armModeState.kind !== 'notArmed',
    dualCursorMode: context.dualCursorFollowing !== null,
    isConfirmationStanding,
    isPropertiesPanelOpen,
    isTooltipStanding,
  })
}

/** @purity pure */
function isSameScreenPart(a: ScreenPart | null, b: ScreenPart | null): boolean {
  if (a === null || b === null) return a === b
  return a.part === b.part && a.entry === b.entry
}

/** @purity pure */
function isSameGrab(a: Grabbed | null, b: Grabbed | null): boolean {
  if (a === null || b === null) return a === b
  return a.grab === b.grab && isSameGrabbedItem(a.item, b.item)
}

/** @purity pure */
function isSameGrabbedItem(a: Grabbed['item'], b: Grabbed['item']): boolean {
  switch (a.kind) {
    case 'task':
      return b.kind === 'task' && a.taskUid === b.taskUid
    case 'dependency':
      return (
        b.kind === 'dependency' &&
        a.predecessorUid === b.predecessorUid &&
        a.successorUid === b.successorUid
      )
    case 'highlightBox':
      return b.kind === 'highlightBox' && a.id === b.id
    case 'commentBox':
      return b.kind === 'commentBox' && a.id === b.id
    case 'statusLine':
      return b.kind === 'statusLine'
  }
}

// see AG-9, WS-2, T-289
/** @purity pure */
function isChangingDocumentIn(session: ScreenSession): boolean {
  return session.gesture.pointerPressState.kind === 'changingDocument'
}

/** @purity pure */
function isAgentApiEnabledIn(session: ScreenSession): boolean {
  return session.agentApi.agentApiEnablingState.kind === 'enabled'
}

// WHY: one empty selection for nothingSelected: the shell compares selections by identity.
const NO_OBJECTS_SELECTED: Selection = emptySelection()

/** @purity pure */
export function selectedObjectsIn(session: ScreenSession): Selection {
  const state = session.selection.selectionState
  return state.kind === 'objectsSelected' ? state.selectedObjects : NO_OBJECTS_SELECTED
}

/** @purity pure */
function rowsChosenWith(chosen: readonly string[], groupId: string, isExtending: boolean): readonly string[] {
  if (!isExtending) return [groupId]
  return chosen.includes(groupId) ? chosen.filter((one) => one !== groupId) : [...chosen, groupId]
}

// see HF-15, T-289
/** @purity pure */
function rowGrabAxisIn(session: ScreenSession): GrabbedRowAxis | null {
  const grab = session.gesture.rowGrabState.kind
  if (grab === 'changingPosition') return 'position'
  return grab === 'changingDepth' ? 'depth' : null
}

/** @purity pure */
function itemKeyOf(item: Hit['item']): string {
  switch (item.kind) {
    case 'task':
      return `task:${item.taskUid}`
    case 'dependency':
      return `dependency:${item.predecessorUid}>${item.successorUid}`
    case 'highlightBox':
    case 'commentBox':
      return `${item.kind}:${item.id}`
    case 'statusLine':
      return item.kind
  }
}

// see T-289, UN-8, GR-21
// TRAP: the thumb before the entry and the strip before the band; the machine's guards read the kind alone.
/** @purity pure */
function pressedOnOf(on: ScreenPart | null, hit: Hit | null): PressedOn | null {
  if (on === null) return hit === null ? null : { kind: 'grab', grabRow: hit.grab, itemId: itemKeyOf(hit.item) }
  if (on.scrollbarAxis !== undefined) return { kind: 'scrollbarThumb', axis: on.scrollbarAxis }
  if (on.isRowGrabStrip === true && on.rowGroupId !== null) return { kind: 'rowGrabStrip', rowGroupId: on.rowGroupId }
  if (on.entry === PALETTE_GRAB_BAND_ENTRY) return { kind: 'paletteBand' }
  if (on.entry !== null) return { kind: 'entry', entry: on.entry }
  if (on.dividerPanel !== null) return { kind: 'panelBorder', panel: on.dividerPanel }
  return { kind: 'otherPart', part: on.part }
}

// see HF-15, T-289
// WHY: the axis is the machine's; the place and the resistance are frame values beside it.
/** @purity pure */
function grabbedRowReadingOf(
  session: ScreenSession,
  at: GrabbedRowPlace | null,
): ScreenViewReadingsTaken['rowGrabbedAt'] {
  const axis = rowGrabAxisIn(session)
  if (at === null || axis === null) return null
  return { ...at, axis }
}

/** @purity pure */
export function isQuestionAskedIn(session: ScreenSession): boolean {
  return session.fileFlow.confirmationState.kind === 'questionAsked'
}

/** @purity pure */
function questionIn(session: ScreenSession): FileFlowQuestion | null {
  const confirmation = session.fileFlow.confirmationState
  return confirmation.kind === 'questionAsked' ? confirmation.question : null
}

/** @purity pure */
function fileOperationKindIn(session: ScreenSession): FileOperationState['kind'] {
  return session.fileFlow.fileOperationState.kind
}

/** @purity pure */
function mergeReviewIn(session: ScreenSession): Pick<ScreenViewReadingsTaken, 'mergeCandidates' | 'unreadColumns'> {
  const operation = session.fileFlow.fileOperationState
  if (operation.kind !== 'awaitingMergeMapping') return { mergeCandidates: [], unreadColumns: [] }
  return { mergeCandidates: operation.mergeCandidates, unreadColumns: operation.unreadColumns }
}

/** @purity pure */
function flowSurfaceOf(surfaceName: string): FileFlowSurfaceName | null {
  const names = Object.keys(SURFACE_NAME_OF_FLOW) as readonly FileFlowSurfaceName[]
  return names.find((flow) => SURFACE_NAME_OF_FLOW[flow] === surfaceName) ?? null
}

/** @purity pure */
export function discardQuestionOf(discarded: Document): FileFlowQuestion {
  return {
    manner: CONFIRMATION_MANNER,
    question: DISCARD_QUESTION,
    items: [{ name: discarded.schedule.project.title, isShownOnAnotherRow: false }],
  }
}

/** @purity pure */
function entrySettledOnRelease(input: HumanInput, context: InputContext): IconId | null {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const press = context.pressed
  if (press === null || press.on === null) return null
  return press.on.entry
}

/** @purity pure */
function answerSettledOnRelease(input: HumanInput, context: InputContext): string | null {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const press = context.pressed
  if (press === null || press.on === null) return null
  return press.on.confirmationAnswer ?? null
}

/** @purity pure */
function surfaceSettledOnRelease(input: HumanInput, context: InputContext): string | null {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const press = context.pressed
  if (press === null || press.on === null) return null
  return press.on.part
}

/** @purity pure */
function formatSettledOnRelease(
  input: HumanInput,
  context: InputContext,
): ExportFormatId | null {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const press = context.pressed
  if (press === null || press.on === null) return null
  return press.on.format
}


// TRAP: toISOString here would move the zoneless statusDate by the UTC offset.
/** @purity semi-pure-b */
export function readToday(): string {
  const now = new Date()
  const day: CalendarDay = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
  return textOfDay(day)
}

// see FR-063
/** @purity semi-pure-b */
export function readInstantOfWrite(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z')
}

/** @purity semi-pure-b */
export function readMonotonicMs(): number {
  return performance.now()
}

/** @purity non-pure */
export function frameLoop(
  surface: SvgSurface,
  first: Document,
  env: FrameEnvironment,
  screen?: ScreenWiring,
  files?: FileStore,
  showPointerShape?: ShowPointerShape,
  clipboard?: Clipboard,
  startedFromTemplate?: boolean,
  rasterizer?: Rasterizer,
  appShell?: AppShellSource,
  startupTemplate?: Document,
  fullScreen?: FullScreenHost,
): FrameLoop {
  let held: HeldDocument = { document: first, history: emptyHistory() }
  let environment = env
  let session: ScreenSession = startingSession(screen?.language ?? startupDisplayLanguage())
  let watermarkStampedAt = readInstantOfWrite()
  const watermarkStoredName = readBrowserStored('S-99a')
  const watermarkOpenedBy =
    watermarkStoredName === null || watermarkStoredName === ''
      ? NOT_STORED_WATERMARK_NAME['S-99a']
      : watermarkStoredName
  // see FR-020, S-144
  /** @purity semi-pure-b */
  function watermarkNow(): { readonly openedBy: string; readonly stampedAt: string } | null {
    return session.screen.watermarkDisplayState.kind === 'shown'
      ? { openedBy: watermarkOpenedBy, stampedAt: watermarkStampedAt }
      : null
  }
  let values: FrameValues | null = null
  let owed = false
  let pressed: PointerPress | null = null
  let previewDocument: Document | null = null
  let commandPaletteDraggedTo: { readonly x: number; readonly y: number } | null = null
  let commandPaletteCornerAtPress: { readonly x: number; readonly y: number } | null = null
  let rowGrabbedAt: GrabbedRowPlace | null = null
  // STOP: spec does not decide where the chosen row set is held. Looked in FR-085, FR-042, SL-1
  // @provisional PND-142
  // STOP: spec does not decide where chosen resources are held. Looked in FR-099, AS-6, SL-1
  // @provisional PND-143
  // STOP: spec does not decide where a closed panel is kept. Looked in FR-052, S-80, T-206
  // @provisional PND-338
  let propertiesPanelKept: { readonly subject: PropertiesSubject | null } | null = null
  let agentApiEnablingWatch: ((isEnabled: boolean) => void) | null = null
  // WHY: a frame value, not a region state (CR-440 decision 8): the cap is the frame's layout result.
  let stackSafetyCapToldFor: string | null = null
  let pointerAt: { readonly x: number; readonly y: number } | null = null
  let partUnderPointer: ScreenPart | null = null
  let grabUnderPointer: Grabbed | null = null
  let isTooltipStanding = false
  // DEVIATION: spec says a person's settled utterance joins the log (AG-11); here none is posted (DFC-558)
  let dialogueLog: DialogueLog = emptyDialogueLog()
  const changeWatchers = emptyChangeWatchers()

  const holder: DocumentHolder = {
    /** @purity semi-pure-b */
    read(): HeldDocument {
      return held
    },
    /** @purity non-pure */
    replace(next: HeldDocument): void {
      if (next.document !== held.document) {
        watermarkStampedAt = readInstantOfWrite()
      }
      held = next
      pruneChoiceTo(selectionWithinSchedule(selectedObjectsIn(session), held.document.schedule))
      // TRAP: Agent API writes reach only this door; without this ask they are never painted.
      if (isSizeSettled(environment)) ask()
    },
  }

  // see WS-6, WS-7, T-286
  // WHY: the delivery window is changeDeliveryStateMachine.delivering; RS-23 returns from its exit.
  const audience: ChangeAudience = {
    /** @purity non-pure */
    deliver(document: Document, hasMovedSchedule: boolean): void {
      sendToSession(DOCUMENT_REPLACED, null)
      try {
        const outcome = notifyChangeWatchers(changeWatchers, { document, hasMovedSchedule, dialogue: dialogueLog })
        sendToSession({ type: 'changeDelivered', silentWatchers: outcome.failures.length }, null)
      } catch (fault) {
        // TRAP: the window must close on a throw too, or WS-2 refuses every later write.
        sendToSession({ type: 'changeDelivered', silentWatchers: 0 }, null)
        throw fault
      }
    },
  }

  // see SF-6, SF-7, UF-48
  /** @purity non-pure */
  function sendToSession(event: SessionEvent, frame: FrameValues | null): void {
    const step = advanceScreenSession(session, event)
    session = step.state
    runSessionEffects(step.effects, effectRunners, frame)
  }

  const hands: FrameLoopHands = {
    readSession: () => session,
    readValues: () => values,
    readEnvironment: () => environment,
    readPressed: () => pressed,
    readHeld: () => held,
    isFrameOwed: () => owed,
    screen,
    clipboard,
    sendToSession,
    ask,
    runFrame,
    raiseNotice,
    writeDocument,
    settingsLimitsOf,
    collectInputContext,
    isPropertiesPanelOnScreen,
    files,
    rasterizer,
    appShell,
    sendFromFlow,
    endFileOperation,
    raiseFileFault,
    replaceHeldDocument,
    exportScene,
  }
  const { pointerShapeAt } = pressedPointerShapeOf(hands)
  const { bandCeilingFor } = rowBandCeilingCacheOf()
  const { viewSettingsOnce, forgetFitForNoPlace, leaveStartupTemplate, returnToStartupTemplate } =
    heldViewPlaceOf(hands, startedFromTemplate)
  const { beginPointerRest, startScaleMessageTimer, beginEntryRepeat, tickEntryRepeat, endEntryRepeat, readPointerRestedMs } =
    frameClockWakesOf(hands)
  const interactionRecorder = interactionRecorderOf(hands)
  const { beginInteractionRecord, handInteractionRecordToClipboard } = interactionRecorder
  const fieldFocusRetries = fieldFocusRetriesOf(hands)
  const { wantFieldFocused, focusWantedField, resetFieldFocusRetries } = fieldFocusRetries
  const documentFileFlow = documentFileFlowOf(hands)
  const {
    beginReadingDocumentFile,
    beginWritingDocumentFile,
    settleIncomingDocument,
    answerOverwriteQuestion,
    readFileSavedAt,
  } = documentFileFlow

  // see SF-6, UF-123
  const effectRunners = effectRunnersOf({
    raiseNotice: (reason) => raiseNotice(reason, null),
    storeLanguage: (language) => writeBrowserStored('S-99', language),
    askBrowserForFullScreen,
    matchWatermarkUnlock: () => void matchWatermarkUnlock(hands, screen?.readWatermarkUnlockAnswer?.() ?? ''),
    clearSelection: () => {
      if (selectedObjectsIn(session) === NO_OBJECTS_SELECTED) return
      sendToSession(SELECTION_CLEARED, values)
      noteChoiceMoved(hands, values)
    },
    writeCarried,
    startScaleMessageTimer,
    startEntryRepeat: beginEntryRepeat,
    repeatHeldEntry,
    restorePaletteCorner: () => {
      if (commandPaletteCornerAtPress !== null) commandPaletteDraggedTo = commandPaletteCornerAtPress
    },
    raiseFlowSurface: (surfaceName) =>
      sendScreenEvent({ type: 'surfaceRaisedByFlow', surfaceName: SURFACE_NAME_OF_FLOW[surfaceName] }, values),
    tellFlowSurfaceClosed: (surfaceName, frame) => {
      const flow = flowSurfaceOf(surfaceName)
      if (flow !== null) sendToSession({ type: 'flowSurfaceClosed', surfaceName: flow }, frame)
    },
    readDocumentFile: beginReadingDocumentFile,
    writeDocumentFile: beginWritingDocumentFile,
    importIncomingDocument: settleIncomingDocument,
    discardIncomingDocument: () => settleIncomingDocument(null),
    answerOverwriteQuestion,
    carryOutOwedAction,
    bringCreatedRowIntoSight: (groupId) => (addedRowOwedSight = groupId),
    beginInteractionRecord,
    handInteractionRecordToClipboard,
    storeAgentApiEnabling,
  })
  sendToSession({ type: 'rememberedEnablingLoaded', isRememberedEnabled: startupAgentApiEnabled() }, null)

  /** @purity non-pure */
  function writeCarried(writes: readonly DocumentCommand[], frame: FrameValues | null): void {
    if (frame !== null && writes.length > 0) writeDocument(writes, frame)
  }

  /** @purity semi-pure-b */
  function isPropertiesPanelOnScreen(): boolean {
    return screen !== undefined && panelShowingIn(session) !== null
  }

  /** @purity non-pure */
  function notePanelPutAway(): void {
    propertiesPanelKept = propertiesPanelKept ?? { subject: null }
  }

  // see FR-052, FR-072, S-171, S-248
  // TRAP: laid over the frame's settings only; S-80 below S-248 is never written back here, or
  // opening the panel alone would leave the document with an unsaved edit (FR-100).
  /** @purity semi-pure-b */
  function withPropertiesPanelShown(stored: DocumentSettings): DocumentSettings {
    const isHidden = panelShowingIn(session) === null
    // TRAP: before the stored-width test, or a dragged width leaves an empty strip at the edge.
    if (isHidden && propertiesPanelKept !== null) {
      if (stored.propertyPanelWidth === 0) return stored
      return { ...stored, propertyPanelWidth: 0 }
    }
    if (isHidden) return stored
    if (stored.propertyPanelWidth >= NOT_STORED_PROPERTIES_PANEL_FLOOR['S-248']) return stored
    return {
      ...stored,
      propertyPanelWidth: NOT_STORED_PROPERTIES_PANEL_SIZES['S-171'],
    }
  }

  /** @purity non-pure */
  function runFrame(): void {
    owed = false
    const document = previewDocument ?? held.document
    const pointerRestedMs = readPointerRestedMs()
    const withPanelShown = withPropertiesPanelShown(document.documentSettings)
    const environmentForRegions: ScreenEnvironment = {
      width: environment.width,
      height: environment.height,
      appHeaderHeight: environment.appHeaderHeight,
      scrollbarThickness: environment.scrollbarThickness,
    }
    const regions = regionsFromScreen(environmentForRegions, withPanelShown)
    // TRAP: not the preview; a longer bar would refit and shrink the axis under the drag.
    const view = viewSettingsOnce(held.document, withPanelShown, regions)
    const settings = view.settings
    const layout = layoutFromSchedule(
      document.schedule,
      settings,
      regions,
      undefined,
      environment.rowControlsHeightPx,
    )
    const capStop = layout.stackSafetyCapReached
    if (capStop !== null && stackSafetyCapToldFor !== capStop.groupId) {
      stackSafetyCapToldFor = capStop.groupId
      raiseNotice(STACK_SAFETY_CAP_REASON, null)
    } else if (capStop === null) {
      stackSafetyCapToldFor = null
    }
    const geometry = geometryFromLayout(document.schedule, settings, layout, regions, selectedObjectsIn(session))
    const chosenObjects = pruneChoiceTo(selectionWithinDrawnRows(selectedObjectsIn(session), geometry, layout, document.schedule, settings, previewDocument !== null))
    values = {
      regions,
      layout,
      geometry,
      settingsMeasuredWith: withPanelShown,
      isPictureAtStoredZoom: view.isAtStoredZoom,
    }
    if (addedRowOwedSight !== null) {
      const owedSight = addedRowOwedSight
      addedRowOwedSight = null
      if (!drawnRowBoxesOf(layout, regions).some((one) => one.groupId === owedSight)) {
        writeDocument(
          [
            {
              kind: 'setScrollPosition',
              // TRAP: the resolved day, not the stored null, or the fit undoes this write.
              scrollDate: settings.scrollDate,
              scrollGroupId: owedSight,
              scrollDayOffset: settings.scrollDayOffset,
              scrollGroupOffset: 0,
            },
          ],
          values,
        )
        ask()
        return
      }
    }
    const drawnSvg =
      svgFromSchedule(
        document.schedule,
        settings,
        layout,
        geometry,
        regions,
        chosenObjects,
        'screen',
        dualCursorDrawnOf(session, pointerAt),
        rulerWeekdayWords(displayLanguageIn(session)),
        pointerAt,
        grabUnderPointer,
        marqueeRect(pressed, pointerAt),
        watermarkNow(),
        tentativeDependencyOf(hands, pressed, pointerAt, document, settings, layout, geometry, regions),
      )
    surface.showSvg(drawnSvg)
    if (screen === undefined) {
      recordFrame(hands, interactionRecorder, drawnSvg, layout)
      return
    }
    const screenView =
      screenViewFromRegions(
        regions,
        document.schedule,
        settings,
        chosenObjects,
        session,
        dialogueLog,
        screenViewReadingsOf(document, regions, layout, heldWholeOf(pressed), {
          openedFileName: session.fileFlow.openedFileName,
          fileSavedAt: readFileSavedAt(),
          isAgentApiEnabled: isAgentApiEnabledIn(session),
          isAiExportSurfaceOpen: openSurfaceNameIn(session) === AI_EXPORT_MODAL_SURFACE,
          pointer: pointerAt,
          pointerRestedMs,
          iconUnderPointer: partUnderPointer?.entry ?? null,
          taskUnderPointer:
            grabUnderPointer !== null && grabUnderPointer.item.kind === 'task'
              ? taskByUid(document.schedule, grabUnderPointer.item.taskUid)
              : null,
          commandPaletteDraggedTo,
          rowGrabbedAt: grabbedRowReadingOf(session, rowGrabbedAt),
          isRecordingInteractions: isRecordingInteractionsIn(session),
          selectedGroupIds: session.selection.chosenRows,
          selectedResourceUids: session.selection.chosenResources,
          confirmation: questionIn(session),
          ...mergeReviewIn(session),
          droppedTaskNames: session.fileFlow.droppedTaskNames,
          notices: raisedNoticesOf(session),
          canUndo: held.history.done.length > 0,
          canRedo: held.history.undone.length > 0,
        }),
      )
    isTooltipStanding = screenView.tooltips.length > 0
    screen.surface.showScreenView(screenView)
    // TRAP: only after showScreenView; the field it focuses does not exist before the draw.
    focusWantedField(screen.focusPropertyField)
    drainFieldEditNotices(hands, values)
    // WHY: recorded once the focus is placed, so IR-1 reads where this frame left it.
    recordFrame(hands, interactionRecorder, drawnSvg, layout)
  }

  /** @purity non-pure */
  function endFileOperation(ended: SessionEvent): void {
    sendToSession(ended, null)
    // TRAP: ask even when nothing was raised, or a finished save paints nothing until next input.
    if (isSizeSettled(environment)) ask()
  }

  /** @purity non-pure */
  function sendFromFlow(event: SessionEvent): void {
    sendToSession(event, values)
    if (isSizeSettled(environment)) ask()
  }

  /** @purity non-pure */
  function ask(): void {
    if (owed) return
    owed = true
    const raf = globalThis.requestAnimationFrame
    if (typeof raf === 'function') raf(() => runAskedFrame())
    else runAskedFrame()
  }

  // WHY: the change a press raises (a colour swatch's click, FT-1) comes after the release asked this frame.
  /** @purity non-pure */
  function runAskedFrame(): void {
    if (values !== null) spendFieldCommit(hands, values)
    runFrame()
  }

  // see FR-039, SE-1, SE-2, SE-3, SE-4, SE-5
  // TRAP: kept apart from the notices region, so notices= and the Esc / Enter levels never see it.
  // TRAP: the number is the held value after the press was carried out, so a write refused
  // (WS-2, a confirmation standing) shows the scale that really stands.
  /** @purity non-pure */
  function showDisplayScaleMessage(shown: { readonly end: 'max' | 'min' | null }): void {
    const percent = held.document.documentSettings.displayScale
    sendToSession({ type: 'displayScaleStepped', percent, end: shown.end }, values)
  }

  // see ZE-5, SE-3, SE-4, SE-5
  // WHY: the same one message as the display scale's, so a row-axis end and a scale press
  // replace each other rather than stack; the number is zoomY as a rounded percent.
  /** @purity non-pure */
  function showRowZoomEndMessage(shown: { readonly end: 'max' | 'min'; readonly zoomY: number }): void {
    const percent = Math.round(shown.zoomY * PERCENT_PER_WHOLE)
    sendToSession({ type: 'rowZoomEndReached', percent, end: shown.end }, values)
  }

  // see FR-018, S-173, T-289
  // TRAP: judge the press, not the pointer now, or a pixel of drift stops the repeat.
  /** @purity non-pure */
  function repeatHeldEntry(): void {
    const frame = values
    const press = pressed
    if (frame === null || press === null) return
    // TRAP: phase must become up; a down answers nothing but the press question.
    const continuation: PointerInput = { ...press.at, phase: 'up' }
    const context = collectInputContext(frame)
    carryOutAction(commandFromInput(continuation, context).action, frame)
    ask()
    tickEntryRepeat(repeatTimesOfHeldEntry().intervalMs)
  }

  // see CS-2, T-289
  // WHY: a second down while one is held replaces the press, as the frame value does (JDG-57).
  /** @purity non-pure */
  function beginPointerPress(press: PointerPress, on: ScreenPart | null, frame: FrameValues): void {
    if (session.gesture.pointerPressState.kind !== 'notPressed') sendToSession(POINTER_RELEASED, frame)
    sendToSession({ type: 'pointerPressed', pressRow: press.pressRow, pressedOn: pressedOnOf(on, press.hit) }, frame)
  }

  // see IN-1, IN-1a, FR-053, T-289
  // TRAP: the press drops before the event; the restorePaletteCorner effect reads the corner still held here.
  /** @purity non-pure */
  function endPointerPress(isInterrupted: boolean, frame: FrameValues): void {
    pressed = null
    sendToSession(isInterrupted ? PRESS_INTERRUPTED : POINTER_RELEASED, frame)
    commandPaletteCornerAtPress = null
    rowGrabbedAt = null
  }

  // see FR-076, NT-3, T-233, T-286
  // WHY: gathering a repeated reason (NT-3) lives in noticeDisplayStateMachine; the shell only sends.
  /** @purity non-pure */
  function raiseNotice(reason: NoticeReason, affectedCount: number | null): void {
    sendToSession({ type: 'noticeRaised', reason, affectedCount }, null)
    if (isSizeSettled(environment)) ask()
  }

  // see NT-8, T-286
  // WHY: the surface names the pressed telling by its dismiss key; the region takes the reason.
  /** @purity non-pure */
  function dismissNoticeByKey(answered: string, frame: FrameValues): void {
    const told = raisedNoticesOf(session).find((one) => dismissKeyOf(one) === answered)
    if (told !== undefined) sendToSession({ type: 'noticeDismissPressed', reason: told.reason }, frame)
  }

  // see NT-8, SK-19, T-283
  // WHY: newestNoticeDismissAsked goes before anything else the input carries (CR-440 decision 6):
  // spendFieldCommit can raise a telling this key never saw, and the newest as of arrival is the one it dismisses.
  /** @purity non-pure */
  function spendNoticeRungFirst(input: HumanInput, frame: FrameValues): boolean {
    const isStanding = standingNoticesIn(session).length > 0
    if (isStanding && isNoticeDismissKey(input)) sendToSession(NEWEST_NOTICE_DISMISS_ASKED, frame)
    return isStanding
  }

  // see NT-7
  /** @purity non-pure */
  function answerConfirmation(isProceeding: boolean, frame: FrameValues): boolean {
    if (!isQuestionAskedIn(session)) return false
    sendToSession({ type: 'confirmationAnswered', isProceeding }, frame)
    return true
  }

  // see FR-076, T-233
  /** @purity non-pure */
  function raiseFileFault(fault: DocumentFileFault): void {
    const reason = NOTICE_REASON_OF_FILE_FAULT[fault.reason]
    if (reason === null) return
    raiseNotice(reason, null)
  }

  /** @purity non-pure */
  function raiseWriteRefusal(refusal: PlanRefusal | ReplacementRefusal): void {
    const reason = reasonOfWriteRefusal(refusal)
    if (reason === null) return
    raiseNotice(reason, null)
  }

  // see FR-080, EP-11, EP-12, ST-7
  // WHY: the cap stop rides on the scene (CR-440 decision 9), so an export owes its telling by value.
  /** @purity semi-pure-b */
  function exportScene(): ExportSceneWithCapStop | null {
    if (!isSizeSettled(environment)) return null
    const document = held.document
    const withPanelsClosed: DocumentSettings = {
      ...document.documentSettings,
      propertyPanelWidth: 0,
    }
    const environmentForRegions: ScreenEnvironment = {
      width: environment.width,
      height: environment.height,
      appHeaderHeight: environment.appHeaderHeight,
      scrollbarThickness: environment.scrollbarThickness,
    }
    const regions = regionsFromScreen(environmentForRegions, withPanelsClosed)
    // TRAP: the held answer, not a fresh fit, or the export is laid out at a zoom the screen
    // is not showing.
    const settings = viewSettingsOnce(document, withPanelsClosed, regions).settings
    const layout = layoutFromSchedule(
      document.schedule,
      settings,
      regions,
      undefined,
      environment.rowControlsHeightPx,
    )
    const nothingSelected = emptySelection()
    const geometry = geometryFromLayout(
      document.schedule,
      settings,
      layout,
      regions,
      nothingSelected,
    )
    return {
      svg: svgFromSchedule(
        document.schedule,
        settings,
        layout,
        geometry,
        regions,
        nothingSelected,
        'export',
        null,
        rulerWeekdayWords(displayLanguageIn(session)),
        null,
        null,
        null,
        // TRAP: not the picture's root, whose default S-144 would restore a watermark the person hid.
        watermarkNow(),
      ),
      regions,
      screenView: screenViewFromRegions(
        regions,
        document.schedule,
        settings,
        nothingSelected,
        pictureSessionOf(session),
        dialogueLog,
        screenViewReadingsOf(document, regions, layout, null, {
          openedFileName: null,
          fileSavedAt: null,
          isAgentApiEnabled: false,
          isAiExportSurfaceOpen: false,
          pointer: null,
          pointerRestedMs: 0,
          iconUnderPointer: null,
          taskUnderPointer: null,
          commandPaletteDraggedTo: null,
          rowGrabbedAt: null,
          isRecordingInteractions: false,
          selectedGroupIds: [],
          selectedResourceUids: [],
          confirmation: null,
          mergeCandidates: [],
          unreadColumns: [],
          droppedTaskNames: [],
          notices: [],
        // TRAP: canUndo and canRedo stay absent; false would draw a faint undo entrance.
        }),
      ),
      settings,
      themeHue: document.schedule.project.themeHue,
      capStopGroupId: layout.stackSafetyCapReached?.groupId ?? null,
    }
  }

  // see FR-052, S-97, S-98
  /** @purity semi-pure-b */
  function settingsLimitsOf(frame: FrameValues | null): SettingsLimits {
    // TRAP: the frame's widths; stored ones drift the sum by a held divider's travel.
    return {
      zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
      zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
      rowAreaWidthWithoutPanels:
        frame === null
          ? 0
          // TRAP: the DRAWN panel widths, as the regions are: FR-039 scales S-79 on the way
        // into a drawing, so a stored width here would not add back up to the canvas.
        : frame.regions.rowArea.width +
            frame.regions.rowTitlePanel.width +
            frame.regions.propertiesPanel.width,
    }
  }

  // see FR-065, S-99b
  /** @purity non-pure */
  function storeAgentApiEnabling(): void {
    // TRAP: only a press reaches here, and a press always moves the root (T-296); telling an unmoved
    // value would make the installer overwrite a reference already handed out.
    const isEnabled = isAgentApiEnabledIn(session)
    writeBrowserStored('S-99b', String(isEnabled))
    agentApiEnablingWatch?.(isEnabled)
  }

  const snapshotSource: AgentApiSeams['source'] = {
    /** @purity semi-pure-b */
    readSnapshot() {
      const frame = values
      return {
        document: held.document,
        selection: selectedObjectsIn(session),
        dialogue: dialogueLog,
        frame,
        exportScene: exportScene(),
        isGestureInFlight: isChangingDocumentIn(session),
        isEditingInPlace: isEditingField(hands),
        isDeliveringNotices: isDeliveringNoticesIn(session),
        historyLimits: HISTORY_LIMITS,
        settingsLimits: settingsLimitsOf(frame),
        defaultRowName: DEFAULT_ROW_NAME,
        readAt: readInstantOfWrite(),
      }
    },
  }

  const dialogueSeams: Pick<AgentApiSeams, 'dialogueHolder' | 'dialogueAudience'> = {
    dialogueHolder: {
      /** @purity semi-pure-b */
      read: () => dialogueLog,
      /** @purity non-pure */
      replace(next: DialogueLog): void {
        dialogueLog = next
      },
    },
    dialogueAudience: {
      /** @purity non-pure */
      deliver(): void {
        // DEVIATION: spec says writes are refused while notices go out (Chapter 5.5); here not for utterances (DFC-562)
        audience.deliver(held.document, false)
        if (isSizeSettled(environment)) ask()
      },
    },
  }

  // see CS-2
  /** @purity semi-pure-b */
  function collectPress(at: PointerInput, frame: FrameValues, on: ScreenPart | null): PointerPress {
    const resolving = at.clickCount >= 2 ? 'doubleClick' : 'press'
    // TRAP: without the Row Area test a bar clipped under the Row Title Panel still takes the press.
    const hit =
      on === null && regionAtPointer(frame.regions, at.x, at.y) === 'rowArea'
        ? itemAtPointer(frame.geometry, at.x, at.y, grabSizesOf(), resolving)
        : null
    const pressRow = pressRowOf({ at, hit }, { screen: session.screen, dualCursorFollowing: dualCursorFollowingIn(session) })
    return {
      at,
      hit,
      on,
      pressRow,
      followedTo: { x: at.x, y: at.y },
      rowGrabAxis: null,
      ...measuredAtPress(frame),
    }
  }

  // see PE-0
  // WHY: the whole Schedule Canvas, ruler band included, and whatever modifier is held: a press or
  // WHY: a drag there must not hand the browser its own text selection.
  /** @purity semi-pure-b */
  function startsNoTextSelection(input: HumanInput, frame: FrameValues): boolean {
    if (input.kind !== 'pointer') return false
    const down = input.phase === 'down' && input.button === 'left'
    const drag = input.phase === 'move' && pressed !== null && pressed.at.button === 'left'
    if (!down && !drag) return false
    const region = regionAtPointer(frame.regions, input.x, input.y)
    return region === 'rowArea' || region === 'timeRuler' || region === 'scheduleCanvas'
  }

  /** @purity semi-pure-b */
  function grabAtPointer(
    frame: FrameValues,
    x: number,
    y: number,
    on: ScreenPart | null,
  ): Grabbed | null {
    if (on !== null) return null
    if (regionAtPointer(frame.regions, x, y) !== 'rowArea') return null
    if (dualCursorFollowingIn(session) !== null) return null
    return itemAtPointer(frame.geometry, x, y, grabSizesOf())
  }

  /** @purity non-pure */
  function pruneChoiceTo(remainingObjects: Selection): Selection {
    if (remainingObjects !== selectedObjectsIn(session)) {
      sendToSession({ type: 'selectionPruned', remainingObjects }, null)
      noteChoiceMoved(hands, null)
    }
    return selectedObjectsIn(session)
  }

  let addedRowOwedSight: string | null = null

  /** @purity semi-pure-b */
  function collectInputContext(
    frame: FrameValues,
    isNoticeStanding: boolean = standingNoticesIn(session).length > 0,
  ): InputContext {
    const drawnRowBoxes = drawnRowBoxesOf(frame.layout, frame.regions)
    const withoutCeiling: InputContext = {
      document: held.document,
      layout: frame.layout,
      geometry: frame.geometry,
      regions: frame.regions,
      screen: session.screen,
      selection: selectedObjectsIn(session),
      zoomStep: NOT_STORED_ZOOM_STEP['S-96'],
      zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
      zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
      isPictureAtStoredZoom: frame.isPictureAtStoredZoom,
      ...(environment.rowControlsHeightPx === undefined
        ? {}
        : { rowControlsHeightPx: environment.rowControlsHeightPx }),
      pressed,
      isTextEntryUnsettled: isEditingField(hands),
      isTextFieldFocusWanted: isFieldFocusWanted(hands),
      isPropertiesPanelShowing: isPropertiesPanelOnScreen(),
      isNoticeStanding,
      drawnRowGroupIds: drawnRowBoxes.map((one) => one.groupId),
      drawnRowBoxes,
      isSurfaceStanding: openSurfaceNameIn(session) !== null || isQuestionAskedIn(session),
      dualCursorFollowing: dualCursorFollowingIn(session),
      today: readToday(),
      newGroupId: crypto.randomUUID(),
      newCommentBoxId: crypto.randomUUID(),
      newHighlightBoxId: crypto.randomUUID(),
    }
    // WHY: asked only by a row-axis zoom, and remembered across contexts, so the shell's second
    // reading of one input and every later notch reuse the walk (DFC-610).
    return {
      ...withoutCeiling,
      rowBandCeiling: (drawnZoomX: number, upTo: number): number =>
        bandCeilingFor(withoutCeiling, drawnZoomX, upTo),
    }
  }

  // see WS-2, AG-9
  /** @purity semi-pure-b */
  function collectWriteMoment(isSettlingFieldCommit = false): WriteMoment {
    return {
      gestureInFlight: isChangingDocumentIn(session),
      editingInPlace: !isSettlingFieldCommit && isEditingField(hands),
      deliveringNotices: isDeliveringNoticesIn(session),
    }
  }

  // see WS-6, WS-7
  /** @purity non-pure */
  function writeDocument(
    commands: readonly DocumentCommand[],
    frame: FrameValues,
    isSettlingFieldCommit = false,
  ): void {
    const settingsLimits = settingsLimitsOf(frame)
    const outcome = applyDocumentChange(
      {
        commands,
        readStamp: held.document.documentStamp,
        moment: collectWriteMoment(isSettlingFieldCommit),
        historyLimits: HISTORY_LIMITS,
        settingsLimits,
        defaultRowName: DEFAULT_ROW_NAME,
        editedBy: EDITED_BY_SCREEN,
        updatedUtc: readInstantOfWrite(),
      },
      holder,
      audience,
    )
    if (outcome.accepted) {
      sendToSession(DOCUMENT_EDIT_LANDED, frame)
      const recounted = outcome.report.recountedTaskUids.length
      if (recounted > 0) raiseNotice(RECOUNTED_PERCENT_COMPLETE_REASON, recounted)
      return
    }
    raiseWriteRefusal(outcome.refusal)
  }

  // see T-230
  /** @purity non-pure */
  function replaceHeldDocument(call: ReplacementCall): boolean {
    const outcome = replaceDocument(
      {
        // TRAP: the held stamp, not the incoming one, which would refuse every replacement.
        readStamp: held.document.documentStamp,
        moment: collectWriteMoment(),
        call,
        defaultRowName: DEFAULT_ROW_NAME,
        newGroupId: crypto.randomUUID(),
      },
      holder,
      audience,
    )
    if (outcome.accepted) {
      // TRAP: roads outside a happening reach here, and nothing else clears the preview for them.
      previewDocument = null
      const landing = LANDING_OF_REPLACEMENT_ROW[call.row]
      if (landing !== null) sendToSession(landing, values)
      if (call.row === 'RD-4') leaveStartupTemplate()
      if (call.row === 'RD-7') returnToStartupTemplate()
      // TRAP: the rows that make it another document, or an arriving document is drawn at the
      // fit the one before it was given.
      if (call.row === 'RD-4' || call.row === 'RD-6' || call.row === 'RD-7') {
        forgetFitForNoPlace()
      }
      if (isSizeSettled(environment)) ask()
      return true
    }
    raiseWriteRefusal(outcome.refusal)
    return false
  }

  /** @purity non-pure */
  function carryOutOwedAction(owedAction: FileFlowOwedAction, frame: FrameValues | null): void {
    if (owedAction.kind === 'startNewDocument') {
      // TRAP: not RD-6, whose history cell differs.
      if (startupTemplate !== undefined) replaceHeldDocument({ row: 'RD-7', document: startupTemplate })
      return
    }
    if (frame === null) return
    for (const bundle of owedAction.writes) writeDocument(bundle, frame)
    if (owedAction.created !== null) standOnWhatWasCreated(owedAction.created)
  }

  // see T-109
  /** @purity non-pure */
  function answerSettledEntry(
    entry: IconId,
    surface: string | null,
    frame: FrameValues,
  ): boolean {
    if (entry === CLOSE_SURFACE_ENTRY && surface === PROPERTIES_PANEL_SURFACE) {
      sendToSession(PANEL_CLOSE_ASKED, frame)
      return true
    }
    if (entry === CLOSE_SURFACE_ENTRY && surface === AI_EXPORT_MODAL_SURFACE) {
      const seam = clipboard
      if (seam !== undefined) {
        const text = jsonFromDocument(held.document)
        void writeClipboard(seam, { kind: 'document', text }).then((writing) => {
          if (!writing.ok) raiseNotice('RS-15', null)
        })
      }
      // TRAP: must stay false so the press still closes the surface (IN-4).
      return false
    }
    if (entry === DISPLAY_LANGUAGE_ENTRY) {
      const language = displayLanguageIn(session) === 'ja' ? 'en' : 'ja'
      sendToSession({ type: 'displayLanguageChosen', language }, frame)
      return true
    }
    if (entry === PALETTE_MINIMISE_ENTRY) {
      sendScreenEvent({ type: 'paletteMinimiseToggled' }, frame)
      return true
    }
    if (entry === INTERACTION_RECORD_ENTRY) {
      sendToSession(INTERACTION_RECORD_TOGGLED, frame)
      return true
    }
    if (entry === DIALOGUE_FIELD_ENTRY) {
      const isAgentApiEnabled = isAgentApiEnabledIn(session)
      if (isAgentApiEnabled) return false
      sendToSession({ type: 'dialogueFieldEntryPressed', isAgentApiEnabled }, frame)
      return true
    }
    if (entry === MILESTONE_LIST_ENTRY) {
      sendToSession({ type: 'milestoneListToggled' }, frame)
      return true
    }
    if (entry === NEW_DOCUMENT_ENTRY) {
      const hasStartupTemplate = startupTemplate !== undefined
      const question = discardQuestionOf(held.document)
      sendToSession({ type: 'newDocumentEntryPressed', hasStartupTemplate, question }, frame)
      return true
    }
    if (entry === ROSTER_DELETE_ENTRY) {
      if (isQuestionAskedIn(session)) {
        raiseNotice(NOTHING_TO_DO_REASON, null)
        return true
      }
      const chosen = session.selection.chosenResources
      if (chosen.length === 0) {
        raiseNotice(NOTHING_TO_DO_REASON, null)
        return true
      }
      const writes: readonly DocumentCommand[] = [{ kind: 'deleteResource', uids: chosen }]
      const owedQuestion = confirmationOwedByResourceDeletion(chosen, held.document)
      if (owedQuestion === null) {
        writeDocument(writes, frame)
        return true
      }
      const owedAction: FileFlowOwedAction = { kind: 'changeDocument', writes: [writes], created: null }
      sendToSession({ type: 'changeQuestionRaised', question: { manner: CONFIRMATION_MANNER, ...owedQuestion }, owedAction }, frame)
      return true
    }
    const openChoice = OPEN_CHOICE_OF_ENTRY[entry]
    if (openChoice !== undefined) {
      if (fileOperationKindIn(session) !== 'awaitingOpenChoice') return false
      answerOpenChoice(hands, openChoice, frame)
      return true
    }
    const mergeMapping = MERGE_MAPPING_OF_ENTRY[entry]
    if (mergeMapping !== undefined) {
      if (fileOperationKindIn(session) !== 'awaitingMergeMapping') return false
      sendToSession({ type: 'flowSurfaceAnswered', surfaceName: DIFFERENCE_REVIEW_SURFACE }, frame)
      sendToSession({ type: 'mergeMappingAnswered', mergeMapping }, frame)
      return true
    }
    return false
  }

  // see T-036
  /** @purity non-pure */
  function carryOutAction(action: InputAction | null, frame: FrameValues, didSettleFieldEntry = false): void {
    if (action === null) return
    switch (action.kind) {
      case 'changeDocument': {
        if (isQuestionAskedIn(session)) return
        const owedQuestion = confirmationOwedBy(action.writes.flat(), held.document, action.question)
        if (owedQuestion !== null) {
          const created = action.created ?? null
          const owedAction: FileFlowOwedAction = { kind: 'changeDocument', writes: action.writes, created }
          sendToSession({ type: 'changeQuestionRaised', question: { manner: CONFIRMATION_MANNER, ...owedQuestion }, owedAction }, frame)
          return
        }
        for (const bundle of action.writes) writeDocument(bundle, frame)
        if (action.created !== undefined) standOnWhatWasCreated(action.created)
        return
      }
      case 'undoEdit':
        if (held.history.done.length === 0) {
          raiseNotice(NOTHING_TO_DO_REASON, null)
          return
        }
        replaceHeldDocument({ row: 'RD-1' })
        return
      case 'redoEdit':
        if (held.history.undone.length === 0) {
          raiseNotice(NOTHING_TO_DO_REASON, null)
          return
        }
        replaceHeldDocument({ row: 'RD-2' })
        return
      case 'copySelection':
        copyForPaste(hands)
        return
      case 'pasteClipboard':
        pasteWhatWasCopied(hands, frame)
        return
      case 'openDocumentFile':
        if (files === undefined) return
        sendToSession({ type: 'documentOpenAsked', openRoute: OPEN_ROUTE_FROM_CHOOSER }, frame)
        return
      case 'copyPictureToClipboard': {
        const seam = clipboard
        if (seam === undefined) return
        const paint = rasterizer
        if (paint === undefined) {
          raiseNotice(SEAM_ABSENT_REASON, null)
          return
        }
        const scene = exportScene()
        if (scene === null) return
        const capStopInPicture = scene.capStopGroupId
        // TRAP: the same PNG road as IO-4, not exportSvg; FR-025 puts one image/png on the
        // board and forbids the SVG text beside it.
        void exportPng(paint, scene).then(async (painted) => {
          if (!painted.ok) {
            raiseNotice(HEIGHT_CEILING_REASON, null)
            return
          }
          if (!painted.png.ok) {
            raiseNotice(NOTICE_REASON_OF_RASTER_FAULT[painted.png.fault.reason], null)
            return
          }
          const writing = await writeClipboard(seam, {
            kind: 'picture',
            pngBytes: painted.png.pngBytes,
          })
          if (!writing.ok) {
            raiseNotice('RS-15', null)
            return
          }
          if (capStopInPicture !== null) raiseNotice(STACK_SAFETY_CAP_REASON, null)
        })
        return
      }
      case 'reopenDocumentFile':
        if (files === undefined) return
        sendToSession({ type: 'documentOpenAsked', openRoute: OPEN_ROUTE_REOPEN }, frame)
        return
      case 'saveDocumentFile':
        if (files === undefined) return
        sendToSession({ type: 'documentFileWriteAsked', writeForm: SAVE_WRITE_FORM }, frame)
        return
      case 'dismissNotice':
        // WHY: spent at the head of receiveInput (spendNoticeRungFirst), before any other rung (NT-8).
        return
      case 'settleTextEntry':
        settleOnScreen(frame, didSettleFieldEntry)
        return
      case 'tellEntryHasNothingToDo':
        raiseNotice(
          action.situation === null
            ? NOTHING_TO_DO_REASON
            : NOTICE_REASON_OF_SPENT_ENTRANCE[action.situation],
          null,
        )
        return
      case 'editInPlace':
        if (action.target.kind !== 'documentTitle') showPropertiesOfChoice()
        wantFieldFocused(FIELD_ROW_OF_IN_PLACE_TARGET[action.target.kind])
        return
      case 'moveCommandPalette': {
        // TRAP: each travel is an increment on the last corner; measuring from the press overshoots.
        const from = paletteCornerOf(commandPaletteDraggedTo, frame.regions)
        commandPaletteDraggedTo = { x: from.x + action.by.dx, y: from.y + action.by.dy }
        if (pressed !== null && pressed.followedTo !== undefined) {
          const followed = pressed.followedTo
          pressed = {
            ...pressed,
            followedTo: { x: followed.x + action.by.dx, y: followed.y + action.by.dy },
          }
        }
        return
      }
      case 'followRowGrab': {
        // WHY: the axis goes back onto the press because UF-30 is pure and cannot remember it.
        if (pressed !== null) pressed = { ...pressed, rowGrabAxis: action.axis }
        sendToSession({ type: 'rowGrabAxisSettled', axis: action.axis }, frame)
        rowGrabbedAt = {
          groupId: action.groupId,
          depth: action.atDepth,
          resistedPx: action.resistedPx,
          atY: action.atY,
        }
        return
      }
      case 'chooseRow': {
        // TRAP: read the held set, not the drawn row; FR-048 may skip a paint, so a picture can be older.
        const chosenRows = rowsChosenWith(session.selection.chosenRows, action.groupId, action.isExtending)
        sendToSession({ type: 'rowsPicked', chosenRows }, frame)
        // STOP: spec does not decide where the chosen rows are held. Looked in FR-085, FR-042, SL-1
        // @provisional PND-142
        showPropertiesOfChoice()
        sendToSession(FIELD_FOCUS_WITHDRAWN, frame)
        return
      }
      case 'chooseResources':
        // STOP: spec does not decide where the chosen resources are held. Looked in FR-099, SL-1
        // @provisional PND-143
        sendToSession({ type: 'resourcesPicked', chosenResources: action.uids }, frame)
        return
      case 'toggleChosenResource': {
        // STOP: spec does not decide where the chosen resources are held. Looked in FR-099, SL-1
        // @provisional PND-143
        const chosen = session.selection.chosenResources
        const chosenResources = chosen.includes(action.uid)
          ? chosen.filter((one) => one !== action.uid)
          : [...chosen, action.uid]
        sendToSession({ type: 'resourcesPicked', chosenResources }, frame)
        return
      }
      case 'toggleDocumentSettingsProperties': {
        const kept = propertiesPanelKept?.subject ?? null
        propertiesPanelKept = { subject: kept }
        for (const event of settingsEntryEventsOf(session, kept)) sendToSession(event, frame)
        return
      }
      case 'setDualCursorFollowing':
        // WHY: not changeDocument's road, which asks FR-032's question; no row of T-234 asks one here.
        sendToSession(dualCursorEventOf(action, session), frame)
        return
      case 'toggleAgentApi':
        sendToSession(AGENT_API_ENTRY_PRESSED, frame)
        return
      case 'toggleDialogueFieldVisible':
        // STOP: spec does not decide whether turning the API off resets S-99i. Looked in FR-066, S-99i
        // @provisional PND-419
        sendToSession(
          { type: 'dialogueFieldEntryPressed', isAgentApiEnabled: isAgentApiEnabledIn(session) },
          frame,
        )
        return
      case 'toggleFullScreen':
        sendToSession({ type: 'fullScreenEntryPressed' }, frame)
        return
    }
  }

  // see SK-19, FR-091, T-280
  /** @purity non-pure */
  function settleOnScreen(frame: FrameValues, didSettleFieldEntry: boolean): void {
    if (openSurfaceNameIn(session) !== null || isQuestionAskedIn(session)) return
    const isNaming = isNamingCreatedTaskIn(session)
    // TRAP: the naming answer first; the guard after it would leave the panel up (FR-091).
    const hasNoUnsettledEntry = isNaming || !(didSettleFieldEntry || isEditingField(hands))
    if (hasNoUnsettledEntry) notePanelPutAway()
    const settleKey = { type: 'settleKeyPressed', hasNoSurfaceOrConfirmation: true, hasNoUnsettledEntry } as const
    sendToSession(isNaming ? { type: 'createdNameSettled' } : settleKey, frame)
  }

  /** @purity non-pure */
  function sendScreenEvent(event: ScreenValuesEvent, frame: FrameValues | null): void {
    interactionRecorder.notePaletteEvent(event)
    for (const one of withSurfaceReplaced(event, session.screen)) sendToSession(one, frame)
  }

  /** @purity non-pure */
  function followChoiceOnPanel(frame: FrameValues): void {
    const subject = subjectOfChoice(selectedObjectsIn(session), session.selection.chosenRows)
    const followed = subject === null ? null : choiceFollowedOf(session, subject)
    if (followed === null) return
    propertiesPanelKept = { subject }
    sendToSession(followed, frame)
  }

  // see FR-071, UF-48, RS-59
  /** @purity non-pure */
  function askBrowserForFullScreen(): void {
    const tellRefused = (): void => raiseNotice(FULL_SCREEN_REFUSED_REASON, null)
    const host = fullScreen
    if (host === undefined) {
      tellRefused()
      return
    }
    // TRAP: asked here, inside the input's own call; deferred to a frame, the browser's
    // user-activation window can close first. S-99f waits for fullScreenChanged.
    const request = host.isFullScreen() ? host.exitFullScreen() : host.requestFullScreen()
    void request.catch(tellRefused)
  }

  // see FR-072
  /** @purity non-pure */
  function showPropertiesOfChoice(): void {
    const subject = subjectOfChoice(selectedObjectsIn(session), session.selection.chosenRows)
    if (subject === null) return
    // STOP: spec does not decide what the panel keeps when the selection empties. Looked in FR-072, SL-1
    // @provisional PND-144
    propertiesPanelKept = { subject }
    sendToSession({ type: 'propertiesOfChoiceAsked', subject }, values)
  }

  // see FR-091, HF-14, HF-17
  /** @purity non-pure */
  function standOnWhatWasCreated(
    created: NonNullable<Extract<InputAction, { kind: 'changeDocument' }>['created']>,
  ): void {
    if (created.kind === 'task') {
      if (!held.document.schedule.tasks.some((one) => one.uid === created.uid)) return
      sendToSession({ type: 'createdTaskSelected', createdTaskUid: created.uid }, values)
    } else {
      const madeRow = held.document.schedule.taskGroups.find((one) => one.id === created.groupId)
      if (madeRow === undefined) return
      sendToSession({ type: 'createdRowSelected', createdGroupId: created.groupId }, values)
    }
    showPropertiesOfChoice()
    resetFieldFocusRetries()
    sendToSession({ type: 'creationLanded', created }, values)
  }

  // see FR-048, NFR-010
  /** @purity semi-pure-b */
  function owesFrame(
    input: HumanInput,
    before: InputContext,
    sessionBefore: ScreenSession,
    partBefore: ScreenPart | null,
    grabBefore: Grabbed | null,
    noticesBefore: ScreenSession['notices'],
    hasKeyActed: boolean,
  ): boolean {
    if (input.kind !== 'pointer') {
      if (pressed !== null) return true
      if (held.document !== before.document || session !== sessionBefore) return true
      if (session.notices !== noticesBefore) return true
      // TRAP: a key that acted on nothing and moved nothing would draw the frame already shown;
      // a held Shift, Ctrl or Alt repeats its press about 30 times a second.
      return input.kind === 'key' && (hasKeyActed || !isSameGrab(grabUnderPointer, grabBefore))
    }
    if (input.phase !== 'move') return true
    if (pressed !== null) return true
    const guideMode = before.document.documentSettings.guideCursorMode
    if (guideMode !== GUIDE_CURSOR_NONE) return true
    if (dualCursorFollowingIn(session) !== null) return true
    if (session !== sessionBefore || held.document !== before.document) return true
    if (!isSameScreenPart(partUnderPointer, partBefore)) return true
    if (isTooltipStanding) return true
    return !isSameGrab(grabUnderPointer, grabBefore)
  }

  // see FT-1
  /** @purity non-pure */
  function receiveInput(input: HumanInput): void {
    recordHappening(hands, interactionRecorder, input)
    // TRAP: before values is read; the frame it may draw replaces them.
    tryWantedFieldBeforeInput(hands, fieldFocusRetries, input)
    // TRAP: before sessionBefore is taken; a notice drained later would owe a frame on its own.
    drainFieldEditNotices(hands, values)
    const frame = values
    if (frame === null) {
      recordLine(hands, interactionRecorder, 'dropped', 'reason=noFrameHasRunYet')
      return
    }

    // TRAP: the notice rung is spent before spendFieldCommit, whose settling can raise a telling this key never saw.
    const noticesBefore = session.notices
    const isNoticeStandingOnArrival = spendNoticeRungFirst(input, frame)

    const didSettleFieldEntry = spendFieldCommit(hands, frame)

    const partBefore = partUnderPointer
    const grabBefore = grabUnderPointer
    if (input.kind === 'pointer') {
      // TRAP: first in this block; the NT-8 dismissal below returns early, and the repeat would tick for ever.
      if (input.phase === 'up' || input.phase === 'lost') endEntryRepeat()
      // TRAP: judged on the point; hosts report moves that never leave the pixel, which would hold the rest open.
      const hasMoved = pointerAt === null || pointerAt.x !== input.x || pointerAt.y !== input.y
      pointerAt = { x: input.x, y: input.y }
      if (hasMoved) beginPointerRest()
      // DEVIATION: spec says an elapsed rest allows the tooltip again (T-280); here a move does (DFC-692)
      if (hasMoved) sendToSession(POINTER_RESTED, frame)
      partUnderPointer =
        screen === undefined ? null : screen.surface.readScreenPartAt(input.x, input.y)
      if (input.phase === 'down') {
        pressed = collectPress(input, frame, partUnderPointer)
        commandPaletteCornerAtPress =
          partUnderPointer?.entry === PALETTE_GRAB_BAND_ENTRY
            ? paletteCornerOf(commandPaletteDraggedTo, frame.regions)
            : null
        beginPointerPress(pressed, partUnderPointer, frame)
      }
      if (input.phase === 'up' && partUnderPointer?.noticeDismissKey != null) {
        dismissNoticeByKey(partUnderPointer.noticeDismissKey, frame)
        ask()
        recordLine(hands, interactionRecorder, 'done', 'spent=noticeDismiss frame=yes')
        return
      }
    }

    if (isQuestionAskedIn(session) && input.kind === 'key' && isConfirmationAnswerKey(input.key)) {
      answerConfirmation(input.key === CONFIRMATION_PROCEED_KEY, frame)
      ask()
      recordLine(hands, interactionRecorder, 'done', `spent=confirmation=${input.key} frame=yes`)
      return
    }

    // DEVIATION: spec says owesFrame compares the whole root (UF-48); a restored tooltip owed no frame (DFC-692)
    const sessionBefore = session
    // TRAP: one context for all three members; rebuilding it reads the clock again (R7.4).
    const context = collectInputContext(frame, isNoticeStandingOnArrival)
    // TRAP: asked before the members run; asked after an Esc rung is spent, one press spends two levels.
    const escapeLevel = escapeLevelOf(
      input,
      context,
      isQuestionAskedIn(session),
      isPropertiesPanelOnScreen(),
      isTooltipStanding,
    )
    const pickedObjects = selectionFromInput(input, context)
    const hasChoiceMoved = pickedObjects !== context.selection
    if (hasChoiceMoved) {
      sendToSession({ type: 'objectsPicked', pickedObjects }, frame)
      noteChoiceMoved(hands, frame)
    }
    const screenEvent = screenEventFromInput(input, context)
    if (screenEvent !== null) sendScreenEvent(screenEvent, frame)
    const translated = commandFromInput(input, context)
    if (escapeLevel === 'confirmation') answerConfirmation(false, frame)
    const rungEvent = escapeLevel === null ? null : ESCAPE_RUNG_EVENTS[escapeLevel]
    if (rungEvent !== null) sendToSession(rungEvent, frame)

    // TRAP: dropped after the translator read the press (CS-2) and before the write below,
    // because WS-2 refuses a write during a gesture (AG-9).
    const isDragInterrupted =
      escapeLevel === 'gesture' || (input.kind === 'pointer' && input.phase === 'lost')
    if (hasEndedGesture(input) || escapeLevel === 'gesture') endPointerPress(isDragInterrupted, frame)
    if (escapeLevel === 'gesture') endEntryRepeat()

    const settledEntry = entrySettledOnRelease(input, context)
    const settledFormat = formatSettledOnRelease(input, context)
    const settledAnswer = answerSettledOnRelease(input, context)
    const spent =
      (settledEntry !== null &&
        answerSettledEntry(settledEntry, surfaceSettledOnRelease(input, context), frame)) ||
      (settledFormat !== null && answerSettledFormat(hands, settledFormat)) ||
      // TRAP: U-60 is offered the answer before answerConfirmation; it answers false unless standing.
      (settledAnswer !== null &&
        answerWatermarkUnlock(hands, settledAnswer === CONFIRMATION_PROCEED_ANSWER)) ||
      (settledAnswer !== null &&
        answerConfirmation(settledAnswer === CONFIRMATION_PROCEED_ANSWER, frame))
    if (!spent) carryOutAction(translated.action, frame, didSettleFieldEntry)
    if (!spent && translated.displayScaleShown !== undefined) {
      showDisplayScaleMessage(translated.displayScaleShown)
    }
    const rowZoomEnd = spent ? undefined : translated.rowZoomEndShown
    if (rowZoomEnd !== undefined) showRowZoomEndMessage(rowZoomEnd)
    const isRowZoomEndShown = rowZoomEnd !== undefined

    if (
      !spent &&
      input.kind === 'pointer' &&
      input.phase === 'move' &&
      pressed !== null &&
      (pressed.on === null
        ? pressed.pressRow === 'PTD-1'
        : pressed.on.scrollbarAxis !== undefined) &&
      translated.action !== null
    ) {
      pressed = { ...pressed, followedTo: { x: input.x, y: input.y } }
    }

    if (hasChoiceMoved) followChoiceOnPanel(frame)

    // TRAP: last, after the press is dropped, so a release no longer finds PTD-1 in flight.
    if (pointerAt !== null) {
      grabUnderPointer = grabAtPointer(frame, pointerAt.x, pointerAt.y, partUnderPointer)
      showPointerShape?.(
        pointerShapeAt(frame, pointerAt.x, pointerAt.y, partUnderPointer, grabUnderPointer),
      )
    }

    previewDocument = previewOfHeldPress(hands, pressed, pointerAt, context, frame)

    const hasKeyActed =
      spent || didSettleFieldEntry || hasChoiceMoved || escapeLevel !== null || translated.action !== null ||
      translated.displayScaleShown !== undefined || isRowZoomEndShown || screenEvent !== null
    // WHY: a wheel at a row-axis end changes nothing owesFrame reads, yet its message is new (ZE-5).
    const owesAFrame =
      owesFrame(input, context, sessionBefore, partBefore, grabBefore, noticesBefore, hasKeyActed) ||
      isRowZoomEndShown
    recordLine(
      hands, interactionRecorder, 'done',
      `on=${partUnderPointer?.entry ?? '-'} grab=${grabUnderPointer?.grab ?? '-'} ` +
        `esc=${escapeLevel ?? '-'} act=${translated.action?.kind ?? '-'} ` +
        `assigned=${translated.isBrowserDefaultStopped} spentByShell=${spent} ` +
        `doc=${held.document === context.document ? 'same' : 'changed'} ` +
        `sel=${hasChoiceMoved ? 'changed' : 'same'} ` +
        `frame=${owesAFrame}`,
    )
    if (owesAFrame) ask()
  }

  if (isSizeSettled(environment)) runFrame()

  return {
    // see FR-100
    /** @purity semi-pure-b */
    hasUnsavedEdits(): boolean {
      return session.fileFlow.unsavedEditsState.kind === 'editsUnsaved'
    },
    /** @purity non-pure */
    holdDocument(call: HeldDocumentCall): void {
      replaceHeldDocument(call)
    },
    /** @purity non-pure */
    isBrowserDefaultStopped(input: HumanInput): boolean {
      const frame = values
      if (frame === null) return false
      const context = collectInputContext(frame)
      // TRAP: keep in step with receiveInput, which spends presses commandFromInput cannot see;
      // otherwise an Esc spent there also leaves full screen (IN-4a, FR-071).
      const level = escapeLevelOf(
        input,
        context,
        isQuestionAskedIn(session),
        isPropertiesPanelOnScreen(),
        isTooltipStanding,
      )
      if (level === 'confirmation' || level === 'propertiesPanel' || level === 'tooltip') return true
      if (isQuestionAskedIn(session) && input.kind === 'key' && isConfirmationAnswerKey(input.key)) return true
      // TRAP: rowArea's rectangle also covers the floating Dialogue Field; without this escape,
      // its own press reads as rowArea and preventDefault blocks native focus (DFC-578, FR-066).
      if (
        input.kind === 'pointer' &&
        input.phase === 'down' &&
        screen?.surface.readScreenPartAt(input.x, input.y)?.part === DIALOGUE_FIELD_SURFACE
      ) {
        return false
      }
      if (startsNoTextSelection(input, frame)) return true
      return commandFromInput(input, context).isBrowserDefaultStopped
    },
    receiveInput,
    /** @purity non-pure */
    resize(next: FrameEnvironment): void {
      if (isSameEnvironment(next, environment)) return
      const wasSettled = isSizeSettled(environment)
      environment = next
      if (!isSizeSettled(next)) return
      if (!wasSettled) runFrame()
      else ask()
    },
    /** @purity non-pure */
    settleFirstFrameEnvironment(next: FrameEnvironment): void {
      if (isSameEnvironment(next, environment)) return
      environment = next
      if (!isSizeSettled(next)) return
      runFrame()
    },
    /** @purity semi-pure-b */
    current: () => values,
    /** @purity semi-pure-b */
    document: () => held.document,
    exportScene,
    /** @purity semi-pure-b */
    agentApiSeams: () => ({
      source: snapshotSource,
      holder,
      audience,
      rasterizer,
      appShell,
      takeInDocument: (incoming, reading) => takeInHandedDocument(hands, documentFileFlow, incoming, reading),
      changeWatchers,
      ...dialogueSeams,
    }),
    /** @purity non-pure */
    watchAgentApiEnabling(watch: (isEnabled: boolean) => void): void {
      agentApiEnablingWatch = watch
      if (isAgentApiEnabledIn(session)) watch(true)
    },
    /** @purity non-pure */
    raiseStartupNotice(reason: StartupNoticeReason, affectedCount: number | null = null): void {
      raiseNotice(reason, affectedCount)
    },
    // see FT-6, FR-071, S-99f
    /** @purity non-pure */
    fullScreenChanged(isFullScreen: boolean): void {
      const before = session
      sendToSession({ type: 'fullScreenChanged', isFullScreen }, values)
      if (session !== before && isSizeSettled(environment)) ask()
    },
    /** @purity non-pure */
    pressContinued(): void {
      if (isSizeSettled(environment)) ask()
    },
    // WHY: the store took the file in its capture listener; a host with no store still wakes (FT-1).
    /** @purity non-pure */
    fileDropped(): void {
      askToOpenDroppedFile(hands)
    },
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_PROPERTIES_PANEL_SIZES: {
  readonly 'S-171': number
} = {
  'S-171': 280,
}

// see T-206
const NOT_STORED_PROPERTIES_PANEL_FLOOR: {
  readonly 'S-248': number
} = {
  'S-248': 160,
}

// see T-206
export const NOT_STORED_SCROLLBAR_SIZES: {
  readonly 'S-205': number
} = {
  'S-205': 8,
}

// see T-206
const NOT_STORED_WATERMARK_NAME: {
  readonly 'S-99a': 'user'
} = {
  'S-99a': 'user',
}
// </generated>
