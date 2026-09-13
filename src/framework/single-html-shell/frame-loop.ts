// SingleHtmlShell frame loop: holds the current values and computes table T-068 once per frame.
// @unit      UF-48   (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { Document } from '../../entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import { emptyDialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { DialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import {
  emptyScreenState,
  escapeTarget,
  screenStateWithPalette,
  screenStateWithSurface,
  screenStateWithWatermark,
  type DualCursorSide,
  type EscapeTarget,
  type ScreenState,
} from '../../entity/document-model/screen-state/screen-state'
import {
  emptySelection,
  selectionOfAll,
  selectionWith,
} from '../../entity/document-model/selection/selection'
import type { ItemRef, Selection } from '../../entity/document-model/selection/selection'
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
  type Project,
  type Schedule,
  type Task,
  type TaskGroup,
} from '../../entity/document-model/schedule/schedule'
import {
  itemAtPointer,
  NOT_STORED_SIZES,
  type PointerSlop,
} from '../../entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  fitZoom,
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
  editDocument,
  NOT_STORED_ZOOM_BOUNDS,
  type SettingsLimits,
} from '../../use-case/edit-document/edit-document'
import {
  importDocument,
  type OpenChoice,
} from '../../use-case/import-document/import-document'
import { notifyChangeWatchers } from '../../use-case/notify-change-watchers/notify-change-watchers'
import {
  validateImportedDocument,
  type ImportBounds,
} from '../../use-case/validate-imported-document/validate-imported-document'
import type { installAgentApi } from '../../adapter/agent-api-endpoint/agent-api-endpoint'
import {
  documentFromJson,
  documentFromMspdi,
  exportEmbeddedHtml,
  formatFromFile,
  jsonFromDocument,
  mspdiFromDocument,
  type AppShellSource,
  type ExchangeFormat,
  type FormatMismatch,
} from '../../adapter/document-codec/document-codec'
import exchangeFormats from '../../adapter/document-codec/exchange-formats.json'
import {
  openDocumentFile,
  saveDocumentFile,
  type ChosenFileSaveRequest,
  type DocumentFileFault,
  type DocumentFileFaultReason,
  type DocumentFileSaving,
  type FileStore,
  type OpenRoute,
  type ProjectIdentity,
  type SaveFileForm,
} from '../../adapter/file-gateway/file-gateway'
import {
  exportPng,
  exportSvg,
  type ExportScene,
  type RasterFaultReason,
  type Rasterizer,
} from '../../adapter/image-exporter/image-exporter'
import {
  commandFromFieldCommit,
  commandFromInput,
  pressRowOf,
  screenStateFromInput,
  selectionFromInput,
  NOT_STORED_ZOOM_STEP,
  type HumanInput,
  type InputAction,
  type InputContext,
  type PointerInput,
  type PointerPress,
  type PressRow,
  type SpentEntranceSituation,
} from '../../adapter/input-command-translator/input-command-translator'
import {
  dismissKeyOf,
  rulerWeekdayWords,
  screenViewFromRegions,
  type ConfirmationItem,
  type DisplayLanguage,
  type ExportFormatId,
  type IconId,
  type RaisedConfirmation,
  type RaisedNotice,
  type ScreenPart,
  type ScreenSession,
  type ScreenSurface,
} from '../../adapter/screen-renderer/screen-renderer'
import { svgFromSchedule, type SvgSurface } from '../../adapter/svg-renderer/svg-renderer'
import {
  writeClipboard,
  type Clipboard,
} from '../../adapter/clipboard-gateway/clipboard-gateway'
import startupTemplate from './startup-template.json'

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
  // STOP: spec does not decide whether a frame is measured from the picture's
  // document or the held one. Looked in FR-052, MN-6, ADR-001
  // @provisional PND-254
  readonly settingsMeasuredWith: DocumentSettings
  readonly isPictureAtStoredZoom: boolean
}

export type HeldDocumentCall = Extract<ReplacementCall, { readonly row: 'RD-6' }>

type AgentApiWiring = Parameters<typeof installAgentApi>[0]

interface HandedImport {
  readonly incoming: Document
  readonly format: ExchangeFormat
  readonly byteLength: number
  readonly choice: OpenChoice
  readonly unreadColumns: readonly string[]
}

export type AgentApiSeams = Omit<AgentApiWiring, 'writerName' | 'schemaVersion'>

export type StartupNoticeReason = Extract<
  NoticeReason,
  'RS-15' | 'RS-21' | 'RS-25' | 'RS-26' | 'RS-48' | 'RS-51'
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
}

export interface ScreenWiring {
  readonly surface: ScreenSurface
  readonly language: DisplayLanguage
  // TRAP: optional, so a host that omits it leaves MK-13 half done with nothing
  // to say so.
  readonly focusPropertyField?: (row: string) => void
  readonly readWatermarkUnlockAnswer?: () => string
}

// STOP: spec does not decide the host keywords for PTD-5 and PTD-4, which the
// host has no drawing keyword for. Looked in IN-2, T-023a
// @provisional PND-337
export type PointerShape =
  | 'default'
  | 'copy'
  | 'grabbing'
  | 'ew-resize'
  | 'grab'

export type ShowPointerShape = (shape: PointerShape | null) => void

type Grabbed = NonNullable<ReturnType<typeof itemAtPointer>>

type GrabbedArea = Grabbed['grab']

const POINTER_SHAPE_BY_GRAB: Readonly<Record<GrabbedArea, PointerShape | null>> = {
  'GR-3': 'ew-resize',
  'GR-4': 'ew-resize',
  'GR-5': 'ew-resize',
  'GR-6': 'ew-resize',
  'GR-9': 'ew-resize',
  'GR-17': 'ew-resize',
  'GR-18': 'ew-resize',
  'GR-12': 'grab',
  'GR-15': 'grab',
  'GR-1': null,
  'GR-2': null,
  'GR-7': null,
  'GR-8': null,
  'GR-10': null,
  'GR-11': null,
  'GR-13': null,
  'GR-14': null,
  'GR-16': null,
}

// STOP: spec does not decide which T-023d rows draw while held beyond its two
// closing rules. Looked in T-023d, FR-052, IN-1
// @provisional PND-250
const PREVIEWED_GRABS: Readonly<Record<GrabbedArea, boolean>> = {
  'GR-1': true,
  'GR-2': true,
  'GR-3': true,
  'GR-4': true,
  'GR-5': true,
  'GR-6': true,
  'GR-7': false,
  'GR-8': true,
  'GR-9': true,
  'GR-10': false,
  'GR-11': false,
  'GR-12': true,
  'GR-13': false,
  'GR-14': true,
  'GR-15': true,
  'GR-16': true,
  'GR-17': true,
  'GR-18': true,
}

// see PTD-5
/** @purity pure */
function marqueeRect(
  press: PointerPress | null,
  at: { readonly x: number; readonly y: number } | null,
): ScreenRect | null {
  if (press === null || at === null) return null
  if (press.on !== null || press.pressRow !== 'PTD-5') return null
  const width = Math.abs(at.x - press.at.x)
  const height = Math.abs(at.y - press.at.y)
  if (width === 0 && height === 0) return null
  return { x: Math.min(press.at.x, at.x), y: Math.min(press.at.y, at.y), width, height }
}

// see T-023c
/** @purity pure */
function scheduleHolds(schedule: Schedule, item: ItemRef): boolean {
  switch (item.kind) {
    case 'task':
      return taskByUid(schedule, item.uid) !== null
    case 'dependency': {
      const successor = taskByUid(schedule, item.successorUid)
      return successor !== null && item.ordinal < successor.dependencies.length
    }
    case 'highlightBox':
      return schedule.highlightBoxes.some((box) => box.id === item.id)
    case 'commentBox':
      return schedule.commentBoxes.some((box) => box.id === item.id)
    case 'statusLine':
      return schedule.project.statusDate !== null
  }
}

// see T-023c
/** @purity pure */
function selectionWithinSchedule(selection: Selection, schedule: Schedule): Selection {
  const items = selection.items.filter((item) => scheduleHolds(schedule, item))
  // TRAP: the shell compares selections by identity; a fresh object here reopens
  // the Properties Panel on every unrelated edit.
  if (items.length === selection.items.length) return selection
  return selection.ordered ? { items, ordered: true } : selectionOfAll(items)
}

// see T-023d
/** @purity pure */
function isPreviewedPress(press: PointerPress | null): boolean {
  if (press === null) return false
  if (press.on !== null) return press.on.dividerPanel !== null
  // WHY: PTD-1 is not previewed: scrolledAnchor measures the travel against the
  // previewed layout, so the picture would run away.
  if (press.pressRow === 'PTD-4') return true
  return press.hit !== null && PREVIEWED_GRABS[press.hit.grab]
}

const POINTER_SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  line: NOT_STORED_SIZES['S-137'],
}

const BYTES_PER_MEGABYTE = 1024 * 1024

const HISTORY_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  // TRAP: S-95 is in megabytes; read as bytes, every write collapses the history to one step.
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * BYTES_PER_MEGABYTE,
}

const ESCAPE_KEY = 'Esc'

const GUIDE_CURSOR_NONE = 'none'

// TRAP: not generated; a change to ED-1 of table T-229 must be copied here by hand.
const EDITED_BY_SCREEN = 'user'

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

// TRAP: also spelled in input-command-translator.ts, open-modals.ts and screen-renderer.ts;
// a misspelling raises a surface nothing describes.
const WATERMARK_UNLOCK_SURFACE = 'Watermark Unlock'

const WATERMARK_UNLOCK_MISMATCH_REASON: NoticeReason = 'RS-41'

const REPEATING_ENTRIES: readonly IconId[] = ['IC-12', 'IC-13', 'IC-14', 'IC-15']

const CONFIRMATION_MANNER = 'NT-7'

const TASK_NAME_FIELD_ROW = 'PR-1'

const ROW_NAME_FIELD_ROW = 'AT-53'

const ASSIGNEE_FIELD_ROW = 'PR-16'

const COMMENT_BOX_TEXT_FIELD_ROW = 'PR-21'

const DOCUMENT_TITLE_FIELD_ROW = 'U-27'

type ConfirmationQuestion = 'QN-1' | 'QN-2' | 'QN-3' | 'QN-4' | 'QN-5'

const OVERWRITE_QUESTION: ConfirmationQuestion = 'QN-4'

const DISCARD_QUESTION: ConfirmationQuestion = 'QN-5'

const UNASSIGNMENT_QUESTION: ConfirmationQuestion = 'QN-3'

type NoticeReason =
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

const NOTICE_REASON_OF_FORMAT_MISMATCH: Readonly<Record<FormatMismatch, NoticeReason>> = {
  extension: 'RS-11',
  firstCharacter: 'RS-12',
  both: 'RS-13',
}

const IGNORED_FILES_REASON: NoticeReason = 'RS-14'

const SETTINGS_CLAMPED_REASON: NoticeReason = 'RS-51'


const RECOUNTED_PERCENT_COMPLETE_REASON: NoticeReason = 'RS-52'

const OVERLAY_NOT_DRAWN_REASON: NoticeReason = 'RS-16'

const HEIGHT_CEILING_REASON: NoticeReason = 'RS-43'


const NOTICE_REASON_OF_RASTER_FAULT: Readonly<Record<RasterFaultReason, NoticeReason>> = {
  unsupported: 'RS-42',
  tooLarge: 'RS-43',
  rasterFailed: 'RS-42',
}

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

const SEAM_ABSENT_REASON: NoticeReason = 'RS-3'

const NO_WORKING_WEEKDAY_REASON: Extract<NoticeReason, 'RS-21'> = 'RS-21'

const WATCHER_SILENT_REASON: NoticeReason = 'RS-23'

const STACK_SAFETY_CAP_REASON: NoticeReason = 'RS-24'

const HANDED_REFERENCE_STANDS_REASON: NoticeReason = 'RS-20'

const NOTHING_TO_DO_REASON: NoticeReason = 'RS-27'

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

const DIALOGUE_FIELD_UNAVAILABLE_REASON: NoticeReason = 'RS-35'

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
const OPEN_CHOOSER_SURFACE = 'Open Chooser'

const OPEN_CHOICE_OF_ENTRY: Readonly<Record<IconId, OpenChoice>> = {
  'IC-71': 'replace',
  'IC-72': 'merge',
  'IC-73': 'baseline',
}

// TRAP: also spelled in icon-roster.json, open-modals.ts and screen-renderer.ts; a
// misspelling raises a surface nothing describes.
const DIFFERENCE_REVIEW_SURFACE = 'Difference Review'

const IMPORT_REPORT_SURFACE = 'Import Report'

const NO_DROPPED_SEEDS: ReadonlySet<number> = new Set<number>()

const MERGE_MAPPING_OF_ENTRY: Readonly<Record<IconId, MergeMapping>> = {
  'IC-95': { kind: 'allSame' },
  'IC-96': { kind: 'allDifferent' },
  'IC-97': { kind: 'cancelImport' },
}

const OPEN_ROUTE_FROM_CHOOSER: OpenRoute = 'chooser'

const OPEN_ROUTE_REOPEN: OpenRoute = 'reopen'

const OPEN_CHOICE_OF_REOPEN: OpenChoice = 'replace'

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
  const row = TABLE_ROW_OF_SAVE_FORM[form]
  return exchangeFormats.formats.find((one) => one.rowId === row)?.extension ?? ''
}

// see T-024
/** @purity pure */
function saveFormOfExportFormat(format: ExportFormatId): SaveFileForm | null {
  for (const form of Object.keys(TABLE_ROW_OF_SAVE_FORM) as readonly SaveFileForm[]) {
    if (TABLE_ROW_OF_SAVE_FORM[form] === format) return form
  }
  return null
}

// STOP: spec does not decide the spelling of this tool's localStorage key
// prefix. Looked in S-99, LM-6, LM-14, T-206
// @provisional PND-110
const WEB_STORAGE_KEY_PREFIX = 'grsched.'

const BROWSER_STORED_KEY: Readonly<Record<BrowserStoredRow, string>> = {
  'S-99': `${WEB_STORAGE_KEY_PREFIX}language`,
  'S-99a': `${WEB_STORAGE_KEY_PREFIX}openedBy`,
  'S-99b': `${WEB_STORAGE_KEY_PREFIX}agentApiEnabled`,
  'S-99c': `${WEB_STORAGE_KEY_PREFIX}unlockPasswordSha256`,
}

type BrowserStoredRow = 'S-99' | 'S-99a' | 'S-99b' | 'S-99c'

const DISPLAY_LANGUAGES: Readonly<Record<DisplayLanguage, true>> = { ja: true, en: true }

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
          unreadColumns: read.unreadColumns,
        }
      : null
  }
  const read = documentFromMspdi(text, current)
  return read.ok ? { document: read.document, clampedCount: 0, unreadColumns: [] } : null
}

// see FR-053
/** @purity pure */
function paletteCornerOf(
  draggedTo: { readonly x: number; readonly y: number } | null,
  regions: ScreenRegions,
): { readonly x: number; readonly y: number } {
  return draggedTo ?? { x: regions.rowArea.x, y: regions.rowArea.y }
}

type PropertiesShowing = ScreenSession['propertiesShowing']
type PropertiesSubject = NonNullable<ScreenSession['propertiesSubject']>

type MergeCandidateLine = NonNullable<ScreenSession['mergeCandidates']>[number]
type MergeChoices = NonNullable<Parameters<typeof importDocument>[0]['merge']>
type MergeMapping = NonNullable<MergeChoices['mapping']>

interface SessionHeld {
  readonly language: DisplayLanguage
  readonly openedFileName: string | null
  readonly fileSavedAt: string | null
  readonly isAgentApiEnabled: boolean
  readonly isDialogueFieldVisible: boolean
  readonly isAiExportSurfaceOpen: boolean
  readonly pointer: { readonly x: number; readonly y: number } | null
  readonly pointerRestedMs: number
  readonly iconUnderPointer: IconId | null
  readonly taskUnderPointer: Task | null
  readonly isTooltipDismissed: boolean
  readonly commandPaletteDraggedTo: { readonly x: number; readonly y: number } | null
  readonly rowGrabbedAt: {
    readonly groupId: string
    readonly depth: number
    readonly axis: 'position' | 'depth'
    readonly resistedPx: number
    readonly atY: number | null
  } | null
  readonly isLevelZeroFolded: boolean
  readonly isMilestoneListOpen: boolean
  readonly isPaletteMinimised: boolean
  readonly isRecordingInteractions: boolean
  readonly dualCursorFollowing: DualCursorSide | null
  readonly selectedGroupIds: readonly string[]
  readonly selectedResourceUids: readonly number[]
  readonly propertiesShowing: PropertiesShowing
  readonly propertiesSubject: PropertiesSubject | null
  readonly confirmation: RaisedConfirmation | null
  readonly mergeCandidates: readonly MergeCandidateLine[]
  readonly unreadColumns: readonly string[]
  readonly droppedTaskNames: readonly (string | null)[]
  readonly notices: readonly RaisedNotice[]
  readonly canUndo?: boolean
  readonly canRedo?: boolean
}

// see PI-37
/** @purity pure */
function sessionOf(
  held: Document,
  regions: ScreenRegions,
  layout: ScheduleLayout,
  session: SessionHeld,
): ScreenSession {
  const {
    language,
    openedFileName,
    fileSavedAt,
    isAgentApiEnabled,
    isDialogueFieldVisible,
    isAiExportSurfaceOpen,
    pointer,
    pointerRestedMs,
    iconUnderPointer,
    taskUnderPointer,
    isTooltipDismissed,
    commandPaletteDraggedTo,
    rowGrabbedAt,
    isLevelZeroFolded,
    isMilestoneListOpen,
    isPaletteMinimised,
    isRecordingInteractions,
    dualCursorFollowing,
    selectedGroupIds,
    selectedResourceUids,
    propertiesShowing,
    propertiesSubject,
    confirmation,
    mergeCandidates,
    unreadColumns,
    droppedTaskNames,
    notices,
    canUndo,
    canRedo,
  } = session
  return {
    language,
    openedFileName,
    fileSavedAt,
    isAgentApiEnabled,
    isDialogueFieldVisible,
    ...(isAiExportSurfaceOpen ? { aiExportDocument: jsonFromDocument(held) } : {}),
    pointer,
    pointerRestedMs,
    iconUnderPointer,
    taskUnderPointer,
    isTooltipDismissed,
    commandPaletteAt: paletteCornerOf(commandPaletteDraggedTo, regions),
    rowGrabbedAt,
    isLevelZeroFolded,
    themePreference: held.documentSettings.themePreference,
    themeHue: held.schedule.project.themeHue,
    isMilestoneListOpen,
    isPaletteMinimised,
    isRecordingInteractions,
    dualCursorFollowing,
    // STOP: spec does not decide where the chosen rows and assignees are held,
    // since SL-1 admits neither. Looked in FR-085, FR-099, SL-1
    // @provisional PND-142
    selectedGroupIds,
    // @provisional PND-143
    selectedResourceUids,
    // STOP: spec does not decide what the panel keeps when the selection goes.
    // Looked in FR-072, SL-1
    // @provisional PND-144
    propertiesShowing,
    // @provisional PND-144
    propertiesSubject,
    notices,
    mergeCandidates,
    unreadColumns,
    droppedTaskNames,
    confirmation,
    rowBoxes: drawnRowBoxesOf(layout, regions),
    scrollExtent: {
      contentWidth: layout.contentWidth,
      contentHeight: layout.contentHeight,
      // TRAP: the scrolling remainder's height, not the Row Area's; the Row Area's
      // would grow the grip as rows are pinned (FR-098).
      visibleHeight: Math.max(
        0,
        regions.rowArea.y + regions.rowArea.height - (layout.scrollAreaY ?? regions.rowArea.y),
      ),
      offsetX: Math.max(0, regions.rowArea.x - (layout.contentX0 ?? regions.rowArea.x)),
      offsetY: scrolledPastOf(layout, regions),
    },
    ...(canUndo === undefined ? {} : { canUndo }),
    ...(canRedo === undefined ? {} : { canRedo }),
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

// see GR-21
/** @purity pure */
function scrolledPastOf(layout: ScheduleLayout, regions: ScreenRegions): number {
  const scrollTop = layout.scrollAreaY ?? regions.rowArea.y
  const first = layout.rows.find((row) => row.isPinned !== true)
  return first === undefined ? 0 : Math.max(0, scrollTop - first.y)
}

interface ViewSettings {
  readonly settings: DocumentSettings
  readonly isAtStoredZoom: boolean
}

// see OP-10, FR-055
/** @purity pure */
function viewSettings(
  held: Document,
  stored: DocumentSettings,
  regions: ScreenRegions,
  fromTemplate: boolean,
  runDay: string,
  rowControlsHeightPx: number | undefined,
): ViewSettings {
  const groupIds = new Set(held.schedule.taskGroups.map((one) => one.id))
  const placed = stored.scrollDate !== null && groupIds.has(stored.scrollGroupId ?? '')
  if (placed) return { settings: stored, isAtStoredZoom: true }

  const covered = held.schedule.tasks
    .flatMap((one) => [one.start, one.actualStart])
    .filter((one): one is string => one !== null)
    .sort()
  const firstRow = [...held.schedule.taskGroups].sort((a, b) => a.order - b.order)[0]
  const pinned: DocumentSettings = {
    ...stored,
    // TRAP: never null; dateAtX answers null without an origin day and OP-10 would
    // ask again forever.
    scrollDate: covered[0] ?? stored.scrollDate ?? runDay,
    scrollGroupId: firstRow === undefined ? stored.scrollGroupId : firstRow.id,
  }

  if (fromTemplate && covered.length > 0) {
    return {
      settings: { ...pinned, scrollDayOffset: 0, scrollGroupOffset: 0 },
      isAtStoredZoom: true,
    }
  }

  const fitted = fitZoom(
    held.schedule,
    pinned,
    regions,
    {
      step: NOT_STORED_ZOOM_STEP['S-96'],
      min: NOT_STORED_ZOOM_BOUNDS['S-97'],
      max: NOT_STORED_ZOOM_BOUNDS['S-98'],
    },
    // TRAP: omit the LF-3 floor and the fit seats a depth that no longer fits.
    rowControlsHeightPx,
  )
  return {
    settings: {
      ...pinned,
      zoomX: fitted.zoomX,
      zoomY: fitted.zoomY,
      scrollDate: fitted.scrollDate,
      scrollGroupId: fitted.scrollGroupId,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    },
    isAtStoredZoom: false,
  }
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
  return escapeTarget(context.screenState, {
    isNoticeStanding: context.isNoticeStanding === true,
    isTextEntryUnsettled: context.isTextEntryUnsettled,
    gestureInFlight: context.pressed !== null,
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

const PRESS_CHANGES_DOCUMENT: Readonly<Record<PressRow, boolean>> = {
  'PTD-1': false,
  'PTD-2': true,
  'PTD-3': true,
  'PTD-4': true,
  'PTD-4a': true,
  'PTD-5': false,
}

// see AG-9, UN-8
/** @purity pure */
function isDocumentChangingPress(press: PointerPress | null): boolean {
  if (press === null) return false
  // TRAP: ask `on` before the row; a press on a drawn entry lands on PTD-5, so the
  // row first would take AG-9 off every palette press.
  if (press.on !== null) {
    // WHY: GR-21's drag writes only the display position (UN-8), so WS-2 must not
    // refuse its follow writes.
    if (press.on.scrollbarAxis !== undefined) return false
    const entry = press.on.entry
    return entry === null || !REPEATING_ENTRIES.includes(entry)
  }
  return PRESS_CHANGES_DOCUMENT[press.pressRow]
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

// see CD-2
// TRAP: a second reading of table T-050 beside editTaskGroup; change both together.
/** @purity pure */
function rowsLostWith(groups: readonly TaskGroup[], rootId: string): ReadonlySet<string> | null {
  if (!groups.some((one) => one.id === rootId)) return null
  const seen = new Set<string>([rootId])
  for (let grew = true; grew; ) {
    grew = false
    for (const one of groups) {
      if (seen.has(one.id) || one.parentId === null) continue
      if (seen.has(one.parentId)) {
        seen.add(one.id)
        grew = true
      }
    }
  }
  return seen
}

// see CD-1
/** @purity pure */
function tasksLostWith(tasks: readonly Task[], seeds: Iterable<number>): ReadonlySet<number> {
  const held = new Set<number>(seeds)
  for (let grew = true; grew; ) {
    grew = false
    for (const task of tasks) {
      if (task.wbsParentUid === null || held.has(task.uid)) continue
      if (held.has(task.wbsParentUid)) {
        held.add(task.uid)
        grew = true
      }
    }
  }
  return held
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

// see FR-032, T-234
/** @purity pure */
function confirmationOwedBy(
  commands: readonly DocumentCommand[],
  held: Document,
): RaisedConfirmation | null {
  const schedule = held.schedule
  const lostRows = new Set<string>()
  const seeds = new Set<number>()
  let owed = false
  for (const command of commands) {
    if (command.kind === 'deleteTaskGroup') {
      const rows = rowsLostWith(schedule.taskGroups, command.groupId)
      if (rows === null) continue
      for (const id of rows) lostRows.add(id)
      owed = true
      continue
    }
    if (command.kind !== 'deleteTask') continue
    if (!schedule.tasks.some((one) => one.wbsParentUid === command.uid)) continue
    seeds.add(command.uid)
    owed = true
  }
  if (!owed) return null
  for (const member of schedule.taskGroupMembers) {
    if (lostRows.has(member.groupId)) seeds.add(member.taskUid)
  }
  const lostTasks = tasksLostWith(schedule.tasks, seeds)
  const rowOfTask = new Map(schedule.taskGroupMembers.map((one) => [one.taskUid, one.groupId]))
  const items: ConfirmationItem[] = []
  for (const task of schedule.tasks) {
    if (!lostTasks.has(task.uid)) continue
    const drawnOn = rowOfTask.get(task.uid)
    items.push({
      name: task.name,
      isShownOnAnotherRow: drawnOn !== undefined && lostRows.size > 0 && !lostRows.has(drawnOn),
    })
  }
  // WHY: QN-1 when a row and a leading Task both go; CD-2 seeds CD-1 with the row's
  // tasks, the wider scene, and QN-2 would suggest the row survives.
  const question: ConfirmationQuestion = lostRows.size > 0 ? 'QN-1' : 'QN-2'
  return { manner: CONFIRMATION_MANNER, question, items }
}

// see FR-099, QN-3, CD-5
/** @purity pure */
function confirmationOwedByResourceDeletion(
  uids: readonly number[],
  held: Document,
): RaisedConfirmation | null {
  const schedule = held.schedule
  const going = new Set(uids)
  const reached: number[] = []
  const seen = new Set<number>()
  let isFreeingAny = false
  for (const assignment of schedule.assignments) {
    const resourceUid = assignment.resourceUid
    if (resourceUid === null || !going.has(resourceUid)) continue
    isFreeingAny = true
    const taskUid = assignment.taskUid
    if (taskUid === null || seen.has(taskUid)) continue
    seen.add(taskUid)
    reached.push(taskUid)
  }
  if (!isFreeingAny) return null
  const taskOfUid = new Map(schedule.tasks.map((one) => [one.uid, one]))
  const items: ConfirmationItem[] = []
  for (const taskUid of reached) {
    const task = taskOfUid.get(taskUid)
    if (task === undefined) continue
    items.push({ name: task.name, isShownOnAnotherRow: false })
  }
  return { manner: CONFIRMATION_MANNER, question: UNASSIGNMENT_QUESTION, items }
}

// see FR-038
/** @purity pure */
function isDisplayLanguage(value: string): value is DisplayLanguage {
  return Object.prototype.hasOwnProperty.call(DISPLAY_LANGUAGES, value)
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


// TRAP: toISOString here would move the zoneless statusDate by the UTC offset.
/** @purity semi-pure-b */
function readToday(): string {
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
function readInstantOfWrite(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z')
}

/** @purity semi-pure-b */
function readMonotonicMs(): number {
  return performance.now()
}

interface RepeatTimes {
  readonly delayMs: number
  readonly intervalMs: number
}

// see FR-018, T-206
/** @purity pure */
function repeatTimesOfHeldEntry(): RepeatTimes {
  return {
    delayMs: NOT_STORED_REPEAT_TIMES['S-172'],
    intervalMs: NOT_STORED_REPEAT_TIMES['S-173'],
  }
}

/** @purity semi-pure-b */
function readBrowserStored(row: BrowserStoredRow): string | null {
  try {
    // TRAP: a refusing host throws on the property itself; keep the access inside the try.
    return globalThis.localStorage?.getItem(BROWSER_STORED_KEY[row]) ?? null
  } catch {
    return null
  }
}

/** @purity non-pure */
function writeBrowserStored(row: BrowserStoredRow, value: string): void {
  try {
    globalThis.localStorage?.setItem(BROWSER_STORED_KEY[row], value)
  } catch {
  }
}

const HEX_DIGIT_BITS = 4
const HEX_DIGIT_MASK = 0xf
const HEX_DIGITS = '0123456789abcdef'

/** @purity pure */
function hexOfByte(value: number): string {
  const high = HEX_DIGITS[(value >> HEX_DIGIT_BITS) & HEX_DIGIT_MASK] ?? ''
  const low = HEX_DIGITS[value & HEX_DIGIT_MASK] ?? ''
  return high + low
}

// see FR-020, S-101
/** @purity semi-pure-b */
async function sha256HexOf(text: string): Promise<string | null> {
  const digester = globalThis.crypto?.subtle
  if (digester === undefined) return null
  try {
    const digest = await digester.digest('SHA-256', new TextEncoder().encode(text))
    let spelled = ''
    for (const byte of new Uint8Array(digest)) spelled += hexOfByte(byte)
    return spelled
  } catch {
    return null
  }
}

// see FR-020, S-99c, S-101
/** @purity semi-pure-b */
function watermarkUnlockDigest(): string {
  const set = readBrowserStored('S-99c')
  // TRAP: an empty stored digest must count as unset, or the empty password opens the gate.
  return set === null || set === '' ? WATERMARK_UNLOCK_DIGEST['S-101'] : set
}

// see FR-038, S-99
/** @purity semi-pure-b */
export function startupDisplayLanguage(): DisplayLanguage {
  const stored = readBrowserStored('S-99')
  if (stored !== null && isDisplayLanguage(stored)) return stored
  return globalThis.navigator?.language?.toLowerCase().startsWith('ja') === true ? 'ja' : 'en'
}

// see FR-065, S-99b
/** @purity semi-pure-b */
export function startupAgentApiEnabled(): boolean {
  return readBrowserStored('S-99b') === String(true)
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
): FrameLoop {
  let held: HeldDocument = { document: first, history: emptyHistory() }
  let environment = env
  let selection: Selection = emptySelection()
  let screenState: ScreenState = emptyScreenState()
  let watermarkStampedAt = readInstantOfWrite()
  const watermarkStoredName = readBrowserStored('S-99a')
  const watermarkOpenedBy =
    watermarkStoredName === null || watermarkStoredName === ''
      ? NOT_STORED_WATERMARK_NAME['S-99a']
      : watermarkStoredName
  // see FR-020, S-144
  /** @purity semi-pure-b */
  function watermarkNow(): { readonly openedBy: string; readonly stampedAt: string } | null {
    return screenState.watermarkVisible
      ? { openedBy: watermarkOpenedBy, stampedAt: watermarkStampedAt }
      : null
  }
  let values: FrameValues | null = null
  let owed = false
  let pressed: PointerPress | null = null
  let previewDocument: Document | null = null
  let commandPaletteDraggedTo: { readonly x: number; readonly y: number } | null = null
  let commandPaletteCornerAtPress: { readonly x: number; readonly y: number } | null = null
  let rowGrabbedAt: {
    readonly groupId: string
    readonly depth: number
    readonly axis: 'position' | 'depth'
    readonly resistedPx: number
    readonly atY: number | null
  } | null = null
  let isLevelZeroFolded = false
  // TRAP: held outside ScreenState, where Esc would reach and close it.
  let isMilestoneListOpen = false
  let isPaletteMinimised = false
  let isRecordingInteractions = false
  const interactionRecord: string[] = []
  let interactionRecordDropped = 0
  let interactionRecordBeganAt = 0
  let interactionRecordOffered = 0
  // WHY: not read off the document's template stamp, which the first write turns into
  // user, so the view would jump to the fit on typing.
  let fromStartupTemplate = startedFromTemplate === true
  let openedFileName: string | null = null
  let fileSavedAt: string | null = null
  let hasUnsavedEdits = false
  // STOP: spec does not decide where the chosen row set is held. Looked in FR-085, FR-042, SL-1
  // @provisional PND-142
  let selectedGroupIds: readonly string[] = []
  let copiedForPaste:
    | { readonly kind: 'task'; readonly uid: number }
    | { readonly kind: 'row'; readonly groupId: string }
    | null = null
  // STOP: spec does not decide where chosen resources are held. Looked in FR-099, AS-6, SL-1
  // @provisional PND-143
  let selectedResourceUids: readonly number[] = []
  // STOP: spec does not decide what the panel keeps once selection goes. Looked in FR-072, SL-1
  // @provisional PND-144
  let propertiesShowing: PropertiesShowing = null
  let propertiesSubject: PropertiesSubject | null = null
  // STOP: spec does not decide where a closed panel is kept. Looked in FR-052, S-80, T-206
  // @provisional PND-338
  let isPropertiesPanelPutAway = false
  let isAgentApiEnabled = startupAgentApiEnabled()
  let agentApiEnablingWatch: ((isEnabled: boolean) => void) | null = null
  let isDialogueFieldVisible = true
  let language: DisplayLanguage = screen?.language ?? startupDisplayLanguage()
  let raisedNotices: readonly RaisedNotice[] = []
  let stackSafetyCapToldFor: string | null = null
  // TRAP: each export scene overwrites this; copy it at the call, never read it across an await.
  let stackSafetyCapOfLastExportScene: string | null = null
  let stackSafetyCapOwedByPictureExport: string | null = null
  // TRAP: as a ScreenState surface it would open a second modal stacked over this dialog.
  let asking: {
    readonly question: RaisedConfirmation
    /** @purity non-pure */
    settle(isProceeding: boolean, frame: FrameValues): void
  } | null = null
  let openChoosing: {
    /** @purity non-pure */
    settle(choice: OpenChoice | null): void
  } | null = null
  // TRAP: kept apart from openChoosing; one shared holder settles whichever was waiting.
  let mergeChoosing: {
    /** @purity non-pure */
    settle(mapping: MergeMapping | null): void
  } | null = null
  let mergeCandidates: readonly MergeCandidateLine[] = []
  let unreadColumns: readonly string[] = []
  let droppedTaskNames: readonly (string | null)[] = []
  let isFileOperationWaiting = false
  let pointerAt: { readonly x: number; readonly y: number } | null = null
  let partUnderPointer: ScreenPart | null = null
  let grabUnderPointer: Grabbed | null = null
  let isTooltipStanding = false
  let isTooltipDismissed = false
  let pointerRestingSince: number | null = null
  let callOffIconHintWait: (() => void) | null = null
  let callOffEntryRepeat: (() => void) | null = null
  let dualCursorFollowing: DualCursorSide | null = null
  let dialogueLog: DialogueLog = emptyDialogueLog()

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
      const chosenBeforeTheWrite = selection
      selection = selectionWithinSchedule(selection, held.document.schedule)
      endCreatedNamingIfChosenMoved(chosenBeforeTheWrite)
      // TRAP: Agent API writes reach only this door; without this ask they are never painted.
      if (settled(environment)) ask()
    },
  }

  const audience: ChangeAudience = {
    /** @purity non-pure */
    deliver(document: Document, hasMovedSchedule: boolean): void {
      const outcome = notifyChangeWatchers({ document, hasMovedSchedule, dialogue: dialogueLog })
      if (outcome.failures.length > 0) raiseNotice(WATCHER_SILENT_REASON, null)
    },
  }

  // TRAP: describe the panel from this, not propertiesShowing, or a closed panel stays drawn.
  /** @purity semi-pure-b */
  function propertiesShowingNow(): PropertiesShowing {
    return isPropertiesPanelPutAway ? null : propertiesShowing
  }

  /** @purity semi-pure-b */
  function isPropertiesPanelOnScreen(): boolean {
    return screen !== undefined && propertiesShowingNow() !== null
  }

  // see FR-052, FR-072, S-171
  /** @purity semi-pure-b */
  function withPropertiesPanelShown(stored: DocumentSettings): DocumentSettings {
    // TRAP: before the stored-width test, or a dragged width leaves an empty strip at the edge.
    if (isPropertiesPanelPutAway) {
      if (stored.propertyPanelWidth === 0) return stored
      return { ...stored, propertyPanelWidth: 0 }
    }
    if (propertiesShowing === null) return stored
    if (stored.propertyPanelWidth > 0) return stored
    return {
      ...stored,
      propertyPanelWidth: NOT_STORED_PROPERTIES_PANEL_SIZES['S-171'],
    }
  }

  // see FR-102, S-207
  /** @purity non-pure */
  function recordLine(what: string, detail: string): void {
    if (!isRecordingInteractions) return
    interactionRecordOffered += 1
    const foundAt = Math.round(readMonotonicMs() - interactionRecordBeganAt)
    interactionRecord.push(`${interactionRecordOffered}\t${foundAt}\t${what}\t${detail}`)
    while (interactionRecord.length > NOT_STORED_INTERACTION_RECORD_LIMITS['S-207']) {
      interactionRecord.shift()
      interactionRecordDropped += 1
    }
  }

  /** @purity pure */
  function recordedModifiers(modifiers: HumanInput['modifiers']): string {
    const held =
      (modifiers.ctrl ? 'C' : '') +
      (modifiers.shift ? 'S' : '') +
      (modifiers.alt ? 'A' : '') +
      (modifiers.meta ? 'M' : '')
    return held === '' ? '-' : held
  }

  // TRAP: a one-character key is typed text; recording it puts document contents in the record.
  /** @purity pure */
  function recordedKey(key: string): string {
    return key.length <= 1 ? '#' : key
  }

  /** @purity non-pure */
  function recordHappening(input: HumanInput): void {
    if (!isRecordingInteractions) return
    const mods = `mods=${recordedModifiers(input.modifiers)}`
    if (input.kind === 'pointer') {
      recordLine(
        'in.pointer',
        `${input.phase} x=${Math.round(input.x)} y=${Math.round(input.y)} ` +
          `button=${input.button} clicks=${input.clickCount} ${mods}`,
      )
      return
    }
    if (input.kind === 'wheel') {
      recordLine(
        'in.wheel',
        `x=${Math.round(input.x)} y=${Math.round(input.y)} notches=${input.notches} ${mods}`,
      )
      return
    }
    recordLine('in.key', `key=${recordedKey(input.key)} ${mods}`)
  }

  /** @purity non-pure */
  function recordFrame(svg: string, drawnLayout: ScheduleLayout): void {
    if (!isRecordingInteractions) return
    const drawn = new Map<string, number>()
    for (const found of svg.matchAll(/<([a-z]+)[\s/>]/g)) {
      const tag = found[1] ?? ''
      drawn.set(tag, (drawn.get(tag) ?? 0) + 1)
    }
    const census = [...drawn.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([tag, many]) => `${tag}=${many}`)
      .join(' ')
    recordLine(
      'frame',
      `w=${environment.width} h=${environment.height} ` +
        `rows=${drawnLayout.rows.length} bars=${drawnLayout.placements.length} ` +
        `svgBytes=${svg.length} ${census} follow=${dualCursorFollowing ?? '-'} ` +
        `minimised=${isPaletteMinimised} glyphList=${isMilestoneListOpen} ` +
        `notices=${raisedNotices.length} asking=${asking !== null}`,
    )
  }

  /** @purity semi-pure-b */
  function interactionRecordText(): string {
    const head = [
      'GRS interaction record (FR-102) -- no document contents are recorded',
      `lines: ${interactionRecord.length} kept of ${interactionRecordOffered} offered, ` +
        `${interactionRecordDropped} dropped from the oldest end ` +
        `(cap ${NOT_STORED_INTERACTION_RECORD_LIMITS['S-207']}, S-207)`,
      'seq\tms\twhat\tdetail',
    ]
    return [...head, ...interactionRecord].join('\n')
  }

  // see IC-76, FR-102
  /** @purity non-pure */
  function turnInteractionRecord(): void {
    if (!isRecordingInteractions) {
      interactionRecord.length = 0
      interactionRecordDropped = 0
      interactionRecordOffered = 0
      interactionRecordBeganAt = readMonotonicMs()
      isRecordingInteractions = true
      recordLine('record', 'started entrance=IC-76')
      return
    }
    recordLine('record', 'stopped entrance=IC-76')
    const text = interactionRecordText()
    isRecordingInteractions = false
    interactionRecord.length = 0
    interactionRecordDropped = 0
    interactionRecordOffered = 0
    const seam = clipboard
    if (seam === undefined) return
    void writeClipboard(seam, { kind: 'record', text })
  }

  /** @purity non-pure */
  function runFrame(): void {
    owed = false
    const document = previewDocument ?? held.document
    const pointerRestedMs =
      pointerRestingSince === null ? 0 : readMonotonicMs() - pointerRestingSince
    const withPanelShown = withPropertiesPanelShown(document.documentSettings)
    const environmentForRegions: ScreenEnvironment = {
      width: environment.width,
      height: environment.height,
      appHeaderHeight: environment.appHeaderHeight,
      scrollbarThickness: environment.scrollbarThickness,
    }
    const regions = regionsFromScreen(environmentForRegions, withPanelShown)
    // TRAP: not the preview; a longer bar would refit and shrink the axis under the drag.
    const view = viewSettings(held.document, withPanelShown, regions,
                              fromStartupTemplate, readToday(),
                              environment.rowControlsHeightPx)
    const settings = view.settings
    const layout = layoutFromSchedule(
      document.schedule,
      settings,
      regions,
      undefined,
      isLevelZeroFolded,
      environment.rowControlsHeightPx,
    )
    const capStop = layout.stackSafetyCapReached
    if (capStop !== null && stackSafetyCapToldFor !== capStop.groupId) {
      stackSafetyCapToldFor = capStop.groupId
      raiseNotice(STACK_SAFETY_CAP_REASON, null)
    } else if (capStop === null) {
      stackSafetyCapToldFor = null
    }
    const geometry = geometryFromLayout(document.schedule, settings, layout, regions, selection)
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
        selection,
        'screen',
        dualCursorFollowing === null
          ? null
          : { side: dualCursorFollowing, x: pointerAt === null ? null : pointerAt.x },
        rulerWeekdayWords(language),
        pointerAt,
        grabUnderPointer,
        marqueeRect(pressed, pointerAt),
        watermarkNow(),
      )
    surface.showSvg(drawnSvg)
    recordFrame(drawnSvg, layout)
    if (screen === undefined) return
    const screenView =
      screenViewFromRegions(
        regions,
        document.schedule,
        settings,
        selection,
        screenState,
        dialogueLog,
        sessionOf(document, regions, layout, {
          language,
          openedFileName,
          fileSavedAt,
          isAgentApiEnabled,
          isDialogueFieldVisible,
          isAiExportSurfaceOpen: screenState.surface === AI_EXPORT_MODAL_SURFACE,
          pointer: pointerAt,
          pointerRestedMs,
          iconUnderPointer: partUnderPointer?.entry ?? null,
          taskUnderPointer:
            grabUnderPointer !== null && grabUnderPointer.item.kind === 'task'
              ? taskByUid(document.schedule, grabUnderPointer.item.taskUid)
              : null,
          isTooltipDismissed,
          commandPaletteDraggedTo,
          rowGrabbedAt,
          isLevelZeroFolded,
          isMilestoneListOpen,
          isPaletteMinimised,
          isRecordingInteractions,
          dualCursorFollowing,
          selectedGroupIds,
          selectedResourceUids,
          propertiesShowing: propertiesShowingNow(),
          propertiesSubject,
          confirmation: asking?.question ?? null,
          mergeCandidates,
          unreadColumns,
          droppedTaskNames,
          notices: raisedNotices,
          canUndo: held.history.done.length > 0,
          canRedo: held.history.undone.length > 0,
        }),
      )
    isTooltipStanding = screenView.tooltips.length > 0
    screen.surface.showScreenView(screenView)
    // TRAP: only after showScreenView; the field it focuses does not exist before the draw.
    if (nameFieldWantedRow !== null) {
      const wanted = nameFieldWantedRow
      nameFieldWantedRow = null
      screen.focusPropertyField?.(wanted)
    }
  }

  /** @purity non-pure */
  function endFileOperationWait(): void {
    isFileOperationWaiting = false
    // TRAP: ask even when nothing was raised, or a finished save paints nothing until next input.
    if (settled(environment)) ask()
  }

  /** @purity non-pure */
  function ask(): void {
    if (owed) return
    owed = true
    const raf = globalThis.requestAnimationFrame
    if (typeof raf === 'function') raf(() => runFrame())
    else runFrame()
  }

  /** @purity non-pure */
  function beginPointerRest(): void {
    pointerRestingSince = readMonotonicMs()
    callOffIconHintWait?.()
    callOffIconHintWait = null
    if (screen === undefined) return
    const wake = setTimeout(() => {
      callOffIconHintWait = null
      ask()
    }, held.document.documentSettings.iconHintDelayMs)
    callOffIconHintWait = () => clearTimeout(wake)
  }

  // TRAP: judge the press, not the pointer now, or a pixel of drift stops the repeat.
  /** @purity semi-pure-b */
  function pressHeldOnRepeatingEntry(): PointerPress | null {
    const press = pressed
    const entry = press?.on?.entry ?? null
    if (press === null || entry === null) return null
    return REPEATING_ENTRIES.includes(entry) ? press : null
  }

  /** @purity non-pure */
  function repeatHeldEntry(): void {
    const frame = values
    const press = pressHeldOnRepeatingEntry()
    if (frame === null || press === null) {
      endEntryRepeat()
      return
    }
    // TRAP: phase must become up; a down answers nothing but the press question.
    const continuation: PointerInput = { ...press.at, phase: 'up' }
    const context = collectInputContext(frame)
    carryOutAction(commandFromInput(continuation, context).action, frame)
    ask()
  }

  // see FR-018, S-172, S-173
  /** @purity non-pure */
  function beginEntryRepeat(): void {
    endEntryRepeat()
    if (pressHeldOnRepeatingEntry() === null) return
    const times = repeatTimesOfHeldEntry()
    // WHY: one wake chained per tick, not setInterval, so a late tick cannot pile onto the next.
    const tickAfter = (afterMs: number): void => {
      const wake = setTimeout(() => {
        callOffEntryRepeat = null
        // TRAP: re-ask each tick; a host may still run a wake that was in flight at release.
        if (pressHeldOnRepeatingEntry() === null) return
        repeatHeldEntry()
        tickAfter(times.intervalMs)
      }, afterMs)
      callOffEntryRepeat = () => clearTimeout(wake)
    }
    tickAfter(times.delayMs)
  }

  /** @purity non-pure */
  function endEntryRepeat(): void {
    callOffEntryRepeat?.()
    callOffEntryRepeat = null
  }

  // see BO-1
  /** @purity pure */
  function settled(env: FrameEnvironment): boolean {
    return env.width > 0 && env.height > 0
  }

  // TRAP: a FrameEnvironment member left out here wakes no frame when only that member changes.
  /** @purity pure */
  function isSameEnvironment(one: FrameEnvironment, other: FrameEnvironment): boolean {
    return (
      one.width === other.width &&
      one.height === other.height &&
      one.appHeaderHeight === other.appHeaderHeight &&
      one.scrollbarThickness === other.scrollbarThickness &&
      one.rowControlsHeightPx === other.rowControlsHeightPx
    )
  }

  // see FR-076, NT-3, T-233
  /** @purity non-pure */
  function raiseNotice(reason: NoticeReason, affectedCount: number | null): void {
    const standing = raisedNotices.find((one) => one.reason === reason)
    if (standing !== undefined) {
      // TRAP: the gathered telling must move to the end, or newest-first dismissal misses it.
      raisedNotices = [
        ...raisedNotices.filter((one) => one.reason !== reason),
        {
          ...standing,
          affectedCount: (standing.affectedCount ?? 1) + (affectedCount ?? 1),
        },
      ]
    } else {
      raisedNotices = [
        ...raisedNotices,
        { manner: NOTICE_MANNER_OF_REASON[reason], reason, affectedCount },
      ]
    }
    if (settled(environment)) ask()
  }

  /** @purity pure */
  function noticesWithout(answered: string): readonly RaisedNotice[] {
    return raisedNotices.filter((one) => dismissKeyOf(one) !== answered)
  }

  // see NT-8, SK-19
  /** @purity non-pure */
  function dismissNewestNotice(): void {
    // TRAP: newest as of key arrival; the list end may be a telling this press raised.
    const standing = raisedNotices.filter((one) => noticeReasonsOnArrival.has(one.reason))
    const newest = standing[standing.length - 1]
    if (newest === undefined) return
    // TRAP: by identity, not dismiss key; two failures of one kind share a key and both would go.
    raisedNotices = raisedNotices.filter((one) => one !== newest)
    ask()
  }

  // see NT-7
  /** @purity non-pure */
  function answerConfirmation(isProceeding: boolean, frame: FrameValues): boolean {
    const asked = asking
    if (asked === null) return false
    // TRAP: clear before settling; nothing new may start while a question stands.
    asking = null
    asked.settle(isProceeding, frame)
    return true
  }

  // see FR-020, U-60
  /** @purity non-pure */
  function answerWatermarkUnlock(isProceeding: boolean): boolean {
    if (screenState.surface !== WATERMARK_UNLOCK_SURFACE) return false
    if (!isProceeding) {
      screenState = screenStateWithSurface(screenState, null)
      ask()
      return true
    }
    const answer = screen?.readWatermarkUnlockAnswer?.() ?? ''
    void matchWatermarkUnlock(answer)
    return true
  }

  // see FR-020, RS-41
  /** @purity non-pure */
  async function matchWatermarkUnlock(answer: string): Promise<void> {
    const given = await sha256HexOf(answer)
    if (given === null || given !== watermarkUnlockDigest()) {
      raiseNotice(WATERMARK_UNLOCK_MISMATCH_REASON, null)
      return
    }
    screenState = screenStateWithWatermark(screenStateWithSurface(screenState, null), false)
    ask()
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

  // see FR-080, EP-11, EP-12
  /** @purity semi-pure-b */
  function exportScene(): ExportScene | null {
    if (!settled(environment)) return null
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
    const settings = viewSettings(
      document,
      withPanelsClosed,
      regions,
      // TRAP: false here would fit the export differently from the screen.
      fromStartupTemplate,
      readToday(),
      environment.rowControlsHeightPx,
    ).settings
    const layout = layoutFromSchedule(
      document.schedule,
      settings,
      regions,
      undefined,
      isLevelZeroFolded,
      environment.rowControlsHeightPx,
    )
    stackSafetyCapOfLastExportScene = layout.stackSafetyCapReached?.groupId ?? null
    const nothingSelected = emptySelection()
    const geometry = geometryFromLayout(
      document.schedule,
      settings,
      layout,
      regions,
      nothingSelected,
    )
    const stateForExport = screenStateWithPalette(emptyScreenState(), false)
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
        rulerWeekdayWords(language),
        null,
        null,
        null,
        // TRAP: not stateForExport, whose default S-144 would restore a watermark the person hid.
        watermarkNow(),
      ),
      regions,
      screenView: screenViewFromRegions(
        regions,
        document.schedule,
        settings,
        nothingSelected,
        stateForExport,
        dialogueLog,
        sessionOf(document, regions, layout, {
          language,
          openedFileName: null,
          fileSavedAt: null,
          isAgentApiEnabled: false,
          isAiExportSurfaceOpen: false,
          isDialogueFieldVisible: false,
          pointer: null,
          pointerRestedMs: 0,
          iconUnderPointer: null,
          taskUnderPointer: null,
          isTooltipDismissed: false,
          commandPaletteDraggedTo: null,
          rowGrabbedAt: null,
          // TRAP: the fold the layout was built with, or half of one picture is folded.
          isLevelZeroFolded,
          isMilestoneListOpen: false,
          isPaletteMinimised: false,
          isRecordingInteractions: false,
          dualCursorFollowing: null,
          selectedGroupIds: [],
          selectedResourceUids: [],
          propertiesShowing: null,
          propertiesSubject: null,
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
          : frame.regions.rowArea.width +
            frame.settingsMeasuredWith.rowTitlePanelWidth +
            frame.settingsMeasuredWith.propertyPanelWidth,
    }
  }

  /** @purity semi-pure-b */
  function previewOfHeldPress(
    press: PointerPress | null,
    at: { readonly x: number; readonly y: number } | null,
    context: InputContext,
    frame: FrameValues,
  ): Document | null {
    if (press === null || at === null || !isPreviewedPress(press)) return null
    const release: PointerInput = { ...press.at, phase: 'up', x: at.x, y: at.y }
    const action = commandFromInput(release, context).action
    if (action === null || action.kind !== 'changeDocument') return null
    const limits = settingsLimitsOf(frame)
    // TRAP: start from held.document, never the last preview, or a travel is applied twice.
    let drawn = held.document
    for (const commands of action.writes) {
      for (const command of commands) {
        const result = editDocument(drawn, command, limits)
        // STOP: spec does not decide what a refused drag draws.
        // Looked in FR-052, WS-3, FD-6, IV-12
        // @provisional PND-253
        if (!result.ok) return null
        drawn = result.document
      }
    }
    return drawn
  }

  // see FR-065, S-99b
  /** @purity non-pure */
  function setAgentApiEnabled(next: boolean): void {
    // TRAP: telling an unmoved value makes the installer overwrite a reference already handed out.
    if (next === isAgentApiEnabled) return
    isAgentApiEnabled = next
    writeBrowserStored('S-99b', String(next))
    agentApiEnablingWatch?.(next)
  }

  const snapshotSource: AgentApiSeams['source'] = {
    /** @purity semi-pure-b */
    readSnapshot() {
      const frame = values
      return {
        document: held.document,
        selection,
        dialogue: dialogueLog,
        frame,
        exportScene: exportScene(),
        isGestureInFlight: isDocumentChangingPress(pressed),
        isEditingInPlace: hasUnsettledTextEntry(),
        historyLimits: HISTORY_LIMITS,
        settingsLimits: settingsLimitsOf(frame),
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
        audience.deliver(held.document, false)
        if (settled(environment)) ask()
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
        ? itemAtPointer(frame.geometry, at.x, at.y, POINTER_SLOP, resolving)
        : null
    const pressRow = pressRowOf({ at, hit }, { screenState, dualCursorFollowing })
    return { at, hit, on, pressRow, followedTo: { x: at.x, y: at.y }, rowGrabAxis: null }
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
    if (dualCursorFollowing !== null) return null
    return itemAtPointer(frame.geometry, x, y, POINTER_SLOP)
  }

  // see IN-2
  /** @purity semi-pure-b */
  function pointerShapeAt(
    frame: FrameValues,
    x: number,
    y: number,
    on: ScreenPart | null,
    hit: Grabbed | null,
  ): PointerShape | null {
    if (pressed !== null && pressed.pressRow === 'PTD-1') return 'grabbing'
    if (on !== null) return null
    if (regionAtPointer(frame.regions, x, y) !== 'rowArea') return null
    if (dualCursorFollowing !== null) return null
    if (hit !== null) return POINTER_SHAPE_BY_GRAB[hit.grab]
    const armed = screenState.armed
    if (armed.kind === 'none') return 'default'
    if (armed.kind === 'dependency') return null
    return 'copy'
  }

  // WHY: asked, never cached; focus moves without any happening, so a held value goes stale.
  /** @purity semi-pure-b */
  function hasUnsettledTextEntry(): boolean {
    return screen === undefined ? false : screen.surface.hasUnsettledTextEntry()
  }

  let isSettlingFieldCommit = false

  let nameFieldWantedRow: string | null = null

  let namingCreatedTaskUid: number | null = null

  /** @purity non-pure */
  function endCreatedNamingIfChosenMoved(was: Selection): void {
    if (selection !== was) namingCreatedTaskUid = null
  }

  let addedRowOwedSight: string | null = null

  // TRAP: reasons, not telling objects; a gathered repeat is a new object and would stop matching.
  let noticeReasonsOnArrival: ReadonlySet<string> = new Set<string>()

  let didSettleFieldEntry = false

  /** @purity semi-pure-b */
  function collectInputContext(
    frame: FrameValues,
    isNoticeStanding: boolean = raisedNotices.length > 0,
  ): InputContext {
    const drawnRowBoxes = drawnRowBoxesOf(frame.layout, frame.regions)
    return {
      document: held.document,
      layout: frame.layout,
      geometry: frame.geometry,
      regions: frame.regions,
      screenState,
      selection,
      zoomStep: NOT_STORED_ZOOM_STEP['S-96'],
      zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
      zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
      isPictureAtStoredZoom: frame.isPictureAtStoredZoom,
      ...(environment.rowControlsHeightPx === undefined
        ? {}
        : { rowControlsHeightPx: environment.rowControlsHeightPx }),
      pressed,
      isTextEntryUnsettled: hasUnsettledTextEntry(),
      isPropertiesPanelShowing: isPropertiesPanelOnScreen(),
      isNoticeStanding,
      drawnRowGroupIds: drawnRowBoxes.map((one) => one.groupId),
      drawnRowBoxes,
      isLevelZeroFolded,
      isSurfaceStanding: screenState.surface !== null || asking !== null,
      dualCursorFollowing,
      today: readToday(),
      newGroupId: crypto.randomUUID(),
      newCommentBoxId: crypto.randomUUID(),
      newHighlightBoxId: crypto.randomUUID(),
    }
  }

  // see WS-2, AG-9
  /** @purity semi-pure-b */
  function collectWriteMoment(): WriteMoment {
    return {
      gestureInFlight: isDocumentChangingPress(pressed),
      editingInPlace: !isSettlingFieldCommit && hasUnsettledTextEntry(),
      deliveringNotices: false,
    }
  }

  // see WS-6, WS-7
  /** @purity non-pure */
  function writeDocument(commands: readonly DocumentCommand[], frame: FrameValues): void {
    const settingsLimits = settingsLimitsOf(frame)
    const outcome = applyDocumentChange(
      {
        commands,
        readStamp: held.document.documentStamp,
        moment: collectWriteMoment(),
        historyLimits: HISTORY_LIMITS,
        settingsLimits,
        editedBy: EDITED_BY_SCREEN,
        updatedUtc: readInstantOfWrite(),
      },
      holder,
      audience,
    )
    if (outcome.accepted) {
      hasUnsavedEdits = true
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
      },
      holder,
      audience,
    )
    if (outcome.accepted) {
      // TRAP: roads outside a happening reach here, and nothing else clears the preview for them.
      previewDocument = null
      hasUnsavedEdits = call.row !== 'RD-4' && call.row !== 'RD-6' && call.row !== 'RD-7'
      if (call.row === 'RD-4') fromStartupTemplate = false
      if (call.row === 'RD-7') fromStartupTemplate = true
      if (settled(environment)) ask()
      return true
    }
    raiseWriteRefusal(outcome.refusal)
    return false
  }

  // see DI-4, QN-4
  /** @purity non-pure */
  function askToWriteOverDestination(): Promise<boolean> {
    return new Promise<boolean>((answer) => {
      asking = {
        question: { manner: CONFIRMATION_MANNER, question: OVERWRITE_QUESTION, items: [] },
        /** @purity non-pure */
        settle(isProceeding) {
          answer(isProceeding)
        },
      }
      if (settled(environment)) ask()
    })
  }

  // see OP-3
  /** @purity non-pure */
  function askHowToOpen(): Promise<OpenChoice | null> {
    return new Promise<OpenChoice | null>((answer) => {
      openChoosing = {
        /** @purity non-pure */
        settle(choice) {
          answer(choice)
        },
      }
      screenState = screenStateWithSurface(screenState, OPEN_CHOOSER_SURFACE)
      if (settled(environment)) ask()
    })
  }

  // see FR-022, T-032a
  /** @purity non-pure */
  function askWhichFileToTakeFrom(
    candidates: readonly MergeCandidateLine[],
  ): Promise<MergeMapping | null> {
    return new Promise<MergeMapping | null>((answer) => {
      mergeChoosing = {
        /** @purity non-pure */
        settle(mapping) {
          answer(mapping)
        },
      }
      mergeCandidates = candidates
      screenState = screenStateWithSurface(screenState, DIFFERENCE_REVIEW_SURFACE)
      if (settled(environment)) ask()
    })
  }

  // see OP-4, QN-5
  /** @purity non-pure */
  function askToDiscardCurrentDocument(discarded: Document): Promise<boolean> {
    return new Promise<boolean>((answer) => {
      asking = {
        question: {
          manner: CONFIRMATION_MANNER,
          question: DISCARD_QUESTION,
          items: [{ name: discarded.schedule.project.title, isShownOnAnotherRow: false }],
        },
        /** @purity non-pure */
        settle(isProceeding) {
          answer(isProceeding)
        },
      }
      if (settled(environment)) ask()
    })
  }

  // see FR-095, RD-7
  /** @purity non-pure */
  async function startNewDocument(template: Document): Promise<void> {
    if (!(await askToDiscardCurrentDocument(held.document))) return
    // TRAP: not RD-6, whose history cell differs.
    replaceHeldDocument({ row: 'RD-7', document: template })
  }

  // see FR-023, U-62
  /** @purity non-pure */
  function tellWhatTheImportDropped(names: readonly (string | null)[]): void {
    if (names.length === 0) return
    droppedTaskNames = names
    screenState = screenStateWithSurface(screenState, IMPORT_REPORT_SURFACE)
  }

  // see OP-2, OP-5, OP-12, T-230
  /** @purity non-pure */
  async function openDocumentIntoHold(
    store: FileStore | null,
    route: OpenRoute,
    handed: HandedImport | null = null,
  ): Promise<boolean> {
    const current = held.document
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
        raiseFileFault(opening.fault)
        return false
      }
      if (opening.ignoredFileCount > 0) {
        raiseNotice(IGNORED_FILES_REASON, opening.ignoredFileCount)
      }
      const file = opening.file

      const reading = formatFromFile(file.fileName, file.text)
      if (!reading.ok) {
        raiseNotice(NOTICE_REASON_OF_FORMAT_MISMATCH[reading.mismatch], null)
        return false
      }
      const decoded = decodedDocument(reading.format, file.text, current)
      if (decoded === null) return false
      handedIn = { format: reading.format, byteLength: file.byteLength }
      incoming = decoded.document
      if (decoded.clampedCount > 0) {
        raiseNotice(SETTINGS_CLAMPED_REASON, decoded.clampedCount)
      }
      couldNotBeRead = decoded.unreadColumns
    }
    const readIn = handedIn

    if (couldNotBeRead.length > 0) unreadColumns = couldNotBeRead

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
    const lost = tasksLostWith(incoming.schedule.tasks, droppedSeeds)
    for (const task of incoming.schedule.tasks) {
      if (lost.has(task.uid)) droppedNames.push(task.name)
    }
    for (const uid of droppedSeeds) {
      if (!incoming.schedule.tasks.some((one) => one.uid === uid)) continue
      const result = editDocument(incoming, { kind: 'deleteTask', uid }, settingsLimitsOf(null))
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
      raiseNotice(noWorkingWeekday, null)
      return false
    }

    const choice =
      handed !== null
        ? handed.choice
        : route === OPEN_ROUTE_REOPEN
          ? OPEN_CHOICE_OF_REOPEN
          : await askHowToOpen()
    if (choice === null) return false

    const isDiscardConfirmed =
      choice === 'replace' ? await askToDiscardCurrentDocument(current) : false
    if (choice === 'replace' && !isDiscardConfirmed) return false

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
      const replaced = replaceHeldDocument({ row: 'RD-4', importing: { ...importing, choice } })
      if (replaced) tellWhatTheImportDropped(droppedNames)
      return replaced
    }
    let mergeAnswers: MergeChoices | null = null
    const asked =
      choice === 'merge' ? importDocument({ ...importing, choice, current: held.document }) : null
    if (asked !== null && !asked.ok && asked.refusal.reason === 'mappingNotChosen') {
      const mapping = await askWhichFileToTakeFrom(
        asked.refusal.candidates.map((candidate) => ({
          currentUid: candidate.currentTaskUid,
          incomingUid: candidate.incomingTaskUid,
          currentName: candidate.currentTaskName,
          incomingName: candidate.incomingTaskName,
        })),
      )
      if (mapping === null) return false
      if (mapping.kind === 'cancelImport') return false
      mergeAnswers = { mapping, profileConflict: null, settingsConflict: null }
    }

    // TRAP: read again here, not current, which predates the waits.
    const importedAgainst = held.document
    const landed = replaceHeldDocument({
      row: 'RD-3',
      importing: { ...importing, choice, merge: mergeAnswers },
      historyLimits: HISTORY_LIMITS,
      editedBy: EDITED_BY_SCREEN,
      updatedUtc: readInstantOfWrite(),
    })

    if (landed) tellWhatTheImportDropped(droppedNames)

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
    if (notDrawn > 0) raiseNotice(OVERLAY_NOT_DRAWN_REASON, notDrawn)
    return landed
  }

  // see OP-13
  /** @purity non-pure */
  async function reopenDocumentIntoHold(store: FileStore): Promise<void> {
    const openedFile = await store.readOpenedFileState()
    if (openedFile.kind === 'none') return
    await openDocumentIntoHold(store, OPEN_ROUTE_REOPEN)
  }

  // see AM-8, FR-022
  /** @purity non-pure */
  async function takeInHandedDocument(incoming: Document): Promise<boolean> {
    if (isFileOperationWaiting || asking !== null || openChoosing !== null) return false
    isFileOperationWaiting = true
    try {
      const handedText = jsonFromDocument(incoming)
      const reread = documentFromJson(handedText, GREATEST_KNOWN_SCHEMA_VERSION)
      return await openDocumentIntoHold(null, OPEN_ROUTE_FROM_CHOOSER, {
        incoming,
        format: 'grsJson',
        byteLength: new TextEncoder().encode(handedText).length,
        unreadColumns: reread.ok ? reread.unreadColumns : [],
        choice: 'merge',
      })
    } finally {
      endFileOperationWait()
    }
  }

  // see SK-11, FR-060, FR-096
  /** @purity non-pure */
  async function saveHeldDocumentToFile(store: FileStore): Promise<void> {
    // TRAP: read before the first await; a later read saves a document nobody asked to save (CS-4).
    const saved = held.document
    const text = jsonFromDocument(saved)
    const project = saved.schedule.project

    const openedFile = await store.readOpenedFileState()
    const saving: DocumentFileSaving =
      openedFile.kind === 'none'
        ? await saveDocumentFile(store, chosenFileSave({ text }, project, SAVE_FORM))
        : await saveDocumentFile(store, {
            destination: 'openedFile',
            content: { text },
            form: SAVE_FORM,
          })

    if (saving.ok) {
      if (saving.openedFile.kind !== 'none') {
        openedFileName = saving.openedFile.fileName
      }
      fileSavedAt = readInstantOfWrite()
      hasUnsavedEdits = false
      return
    }
    raiseFileFault(saving.fault)
  }

  // see FR-096, SK-12
  /** @purity non-pure */
  async function exportHeldDocumentToFile(
    store: FileStore,
    format: ExportFormatId,
  ): Promise<void> {
    const form = saveFormOfExportFormat(format)
    if (form === null) return
    // TRAP: wiped at the head, or a form that builds no picture inherits an earlier export's stop.
    stackSafetyCapOwedByPictureExport = null
    const written = held.document
    const text = exportedText(form, written)
    const content = text === null ? await exportPictureContent(form, written) : { text }
    if (content === null) return

    const saving = await saveDocumentFile(
      store,
      chosenFileSave(content, written.schedule.project, form),
    )
    if (saving.ok) {
      // TRAP: leave stackSafetyCapToldFor alone; it is the frame's, and touching it silences the screen.
      if (stackSafetyCapOwedByPictureExport !== null) {
        stackSafetyCapOwedByPictureExport = null
        raiseNotice(STACK_SAFETY_CAP_REASON, null)
      }
      return
    }
    raiseFileFault(saving.fault)
  }

  // see IO-3, IO-4, IO-7
  /** @purity non-pure */
  async function exportPictureContent(
    form: SaveFileForm,
    written: Document,
  ): Promise<ChosenFileSaveRequest['content'] | null> {
    switch (form) {
      case 'grsJson':
      case 'mspdi':
        return null
      case 'singleHtml':
        return await embeddedHtmlContent(written)
      case 'svg':
      case 'png': {
        const scene = exportScene()
        stackSafetyCapOwedByPictureExport = stackSafetyCapOfLastExportScene
        if (scene === null) return null
        if (form === 'svg') {
          const picture = exportSvg(scene)
          if (!picture.ok) {
            raiseNotice(HEIGHT_CEILING_REASON, null)
            return null
          }
          return { text: picture.svg }
        }
        return await rasteredContent(scene)
      }
    }
  }

  // see IO-4
  /** @purity non-pure */
  async function rasteredContent(
    scene: ExportScene,
  ): Promise<ChosenFileSaveRequest['content'] | null> {
    const seam = rasterizer
    if (seam === undefined) {
      raiseNotice(SEAM_ABSENT_REASON, null)
      return null
    }
    const painted = await exportPng(seam, scene)
    if (!painted.ok) {
      raiseNotice(HEIGHT_CEILING_REASON, null)
      return null
    }
    if (!painted.png.ok) {
      raiseNotice(NOTICE_REASON_OF_RASTER_FAULT[painted.png.fault.reason], null)
      return null
    }
    return { bytes: painted.png.pngBytes }
  }

  // see IO-7
  /** @purity non-pure */
  async function embeddedHtmlContent(
    written: Document,
  ): Promise<ChosenFileSaveRequest['content'] | null> {
    const seam = appShell
    if (seam === undefined) {
      raiseNotice(SEAM_ABSENT_REASON, null)
      return null
    }
    const made = await exportEmbeddedHtml(seam, written)
    if (!made.ok) {
      raiseNotice(NOTICE_REASON_OF_EMBEDDED_HTML_FAULT[made.fault.reason], null)
      return null
    }
    return { text: made.html }
  }

  // see FR-096, DI-1
  /** @purity pure */
  function chosenFileSave(
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
      confirmOverwrite: askToWriteOverDestination,
    }
  }

  // see T-109
  /** @purity non-pure */
  function answerSettledEntry(
    entry: IconId,
    surface: string | null,
    frame: FrameValues,
  ): boolean {
    if (entry === CLOSE_SURFACE_ENTRY && surface === PROPERTIES_PANEL_SURFACE) {
      isPropertiesPanelPutAway = true
      return true
    }
    if (entry === CLOSE_SURFACE_ENTRY && surface === AI_EXPORT_MODAL_SURFACE) {
      const seam = clipboard
      if (seam !== undefined) {
        const text = jsonFromDocument(held.document)
        void writeClipboard(seam, { kind: 'document', text }).then((writing) => {
          // WHY: RS-15 because table T-233 has no row for a failed clipboard write.
          if (!writing.ok) raiseNotice('RS-15', null)
        })
      }
      // TRAP: must stay false so the press still closes the surface (IN-4).
      return false
    }
    if (entry === DISPLAY_LANGUAGE_ENTRY) {
      language = language === 'ja' ? 'en' : 'ja'
      writeBrowserStored('S-99', language)
      return true
    }
    if (entry === PALETTE_MINIMISE_ENTRY) {
      isPaletteMinimised = !isPaletteMinimised
      return true
    }
    if (entry === INTERACTION_RECORD_ENTRY) {
      turnInteractionRecord()
      return true
    }
    if (entry === DIALOGUE_FIELD_ENTRY) {
      if (isAgentApiEnabled) return false
      raiseNotice(DIALOGUE_FIELD_UNAVAILABLE_REASON, null)
      return true
    }
    if (entry === MILESTONE_LIST_ENTRY) {
      isMilestoneListOpen = !isMilestoneListOpen
      return true
    }
    if (entry === NEW_DOCUMENT_ENTRY) {
      if (asking !== null) {
        raiseNotice(NOTHING_TO_DO_REASON, null)
        return true
      }
      const template = startupTemplate
      if (template === undefined) {
        raiseNotice(NOTHING_TO_DO_REASON, null)
        return true
      }
      void startNewDocument(template)
      return true
    }
    if (entry === ROSTER_DELETE_ENTRY) {
      if (asking !== null) {
        raiseNotice(NOTHING_TO_DO_REASON, null)
        return true
      }
      const chosen = selectedResourceUids
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
      asking = {
        question: owedQuestion,
        /** @purity non-pure */
        settle(isProceeding, answeringFrame) {
          if (!isProceeding) return
          writeDocument(writes, answeringFrame)
        },
      }
      return true
    }
    const openChoice = OPEN_CHOICE_OF_ENTRY[entry]
    if (openChoice !== undefined) {
      const choosing = openChoosing
      if (choosing === null) return false
      openChoosing = null
      screenState = screenStateWithSurface(screenState, null)
      choosing.settle(openChoice)
      return true
    }
    const mergeMapping = MERGE_MAPPING_OF_ENTRY[entry]
    if (mergeMapping !== undefined) {
      const choosing = mergeChoosing
      if (choosing === null) return false
      mergeChoosing = null
      mergeCandidates = []
      unreadColumns = []
      screenState = screenStateWithSurface(screenState, null)
      choosing.settle(mergeMapping)
      return true
    }
    return false
  }

  // see FR-096, SK-12
  /** @purity non-pure */
  function answerSettledFormat(format: ExportFormatId): boolean {
    // WHY: spec does not say whether U-54 stays up once a format is taken; this press is its answer.
    // TRAP: taken down before both gates, so each gate must raise a notice; a silent return
    // closes the chooser with nothing written and nothing said (FR-029).
    screenState = screenStateWithSurface(screenState, null)
    const store = files
    if (store === undefined) {
      raiseNotice(SEAM_ABSENT_REASON, null)
      return true
    }
    if (isFileOperationWaiting || asking !== null || openChoosing !== null) {
      raiseNotice(NOTHING_TO_DO_REASON, null)
      return true
    }
    isFileOperationWaiting = true
    void exportHeldDocumentToFile(store, format).finally(endFileOperationWait)
    return true
  }

  // see SK-4, FR-033
  /** @purity non-pure */
  function copyForPaste(): void {
    // WHY: spec does not decide a row and a Task both chosen; the row wins, as DU-2 makes it the superset.
    if (selectedGroupIds.length === 1) {
      copiedForPaste = { kind: 'row', groupId: selectedGroupIds[0] as string }
      return
    }
    const chosenTaskUids = selection.items.flatMap((one) =>
      one.kind === 'task' ? [one.uid] : [],
    )
    if (selectedGroupIds.length === 0 && chosenTaskUids.length === 1) {
      copiedForPaste = { kind: 'task', uid: chosenTaskUids[0] as number }
      return
    }
    raiseNotice(NOTHING_TO_DO_REASON, null)
  }

  // see SK-5, FR-033
  /** @purity non-pure */
  function pasteWhatWasCopied(frame: FrameValues): void {
    const copied = copiedForPaste
    if (copied === null) {
      raiseNotice(NOTHING_TO_DO_REASON, null)
      return
    }
    const schedule = held.document.schedule
    const command = pasteCommandFor(copied, schedule)
    if (command === null) {
      raiseNotice(NOTHING_TO_DO_REASON, null)
      return
    }
    const folded = editDocument(held.document, command, settingsLimitsOf(frame))
    if (folded.ok) {
      const wouldDraw = layoutFromSchedule(
        folded.document.schedule,
        frame.settingsMeasuredWith,
        frame.regions,
        undefined,
        isLevelZeroFolded,
        environment.rowControlsHeightPx,
      )
      if (wouldDraw.stackSafetyCapReached !== null) {
        raiseNotice(STACK_SAFETY_CAP_REASON, null)
        return
      }
    }
    writeDocument([command], frame)
  }

  // see FR-033, DU-2
  /** @purity non-pure */
  function pasteCommandFor(
    copied: { readonly kind: 'task'; readonly uid: number } | { readonly kind: 'row'; readonly groupId: string },
    schedule: Schedule,
  ): DocumentCommand | null {
    if (copied.kind === 'task') {
      return taskByUid(schedule, copied.uid) === null
        ? null
        : { kind: 'pasteTaskSubtree', sourceUid: copied.uid }
    }
    const byParent = new Map<string | null, TaskGroup[]>()
    for (const row of schedule.taskGroups) {
      byParent.set(row.parentId, [...(byParent.get(row.parentId) ?? []), row])
    }
    if (!schedule.taskGroups.some((one) => one.id === copied.groupId)) return null
    // WHY: spec does not decide a paste with several rows chosen; refused rather than guessing a parent.
    if (selectedGroupIds.length > 1) return null
    const newGroupIds: Record<string, string> = {}
    const walking = [copied.groupId]
    while (walking.length > 0) {
      const id = walking.pop() as string
      if (newGroupIds[id] !== undefined) continue
      newGroupIds[id] = crypto.randomUUID()
      for (const child of byParent.get(id) ?? []) walking.push(child.id)
    }
    return {
      kind: 'pasteTaskGroupSubtree',
      sourceGroupId: copied.groupId,
      targetGroupId: selectedGroupIds.length === 1 ? (selectedGroupIds[0] as string) : null,
      newGroupIds,
    }
  }

  // see T-036
  function carryOutAction(action: InputAction | null, frame: FrameValues): void {
    if (action === null) return
    switch (action.kind) {
      case 'changeDocument': {
        if (asking !== null) return
        const owedQuestion = confirmationOwedBy(action.writes.flat(), held.document)
        if (owedQuestion !== null) {
          const owedWrites = action.writes
          const owedCreation = action.created
          asking = {
            question: owedQuestion,
            /** @purity non-pure */
            settle(isProceeding, answeringFrame) {
              if (!isProceeding) return
              for (const bundle of owedWrites) writeDocument(bundle, answeringFrame)
              if (owedCreation !== undefined) standOnWhatWasCreated(owedCreation)
            },
          }
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
        copyForPaste()
        return
      case 'pasteClipboard':
        pasteWhatWasCopied(frame)
        return
      case 'openDocumentFile': {
        const store = files
        if (store === undefined) return
        if (isFileOperationWaiting || asking !== null || openChoosing !== null) {
          raiseNotice(NOTHING_TO_DO_REASON, null)
          return
        }
        isFileOperationWaiting = true
        void openDocumentIntoHold(store, OPEN_ROUTE_FROM_CHOOSER).finally(endFileOperationWait)
        return
      }
      case 'copyPictureToClipboard': {
        const seam = clipboard
        if (seam === undefined) return
        const scene = exportScene()
        const capStopInPicture = stackSafetyCapOfLastExportScene
        if (scene === null) return
        // TRAP: send exportSvg's answer, not scene.svg; FR-025 needs the same picture as the download.
        const picture = exportSvg(scene)
        if (!picture.ok) {
          raiseNotice(HEIGHT_CEILING_REASON, null)
          return
        }
        void writeClipboard(seam, { kind: 'picture', svg: picture.svg }).then(
          (writing) => {
            // WHY: RS-15 because table T-233 has no row for a failed clipboard write.
            if (!writing.ok) {
              raiseNotice('RS-15', null)
              return
            }
            if (capStopInPicture !== null) raiseNotice(STACK_SAFETY_CAP_REASON, null)
          },
        )
        return
      }
      case 'reopenDocumentFile': {
        const store = files
        if (store === undefined) return
        if (isFileOperationWaiting || asking !== null || openChoosing !== null) {
          raiseNotice(NOTHING_TO_DO_REASON, null)
          return
        }
        isFileOperationWaiting = true
        void reopenDocumentIntoHold(store).finally(endFileOperationWait)
        return
      }
      case 'saveDocumentFile': {
        const store = files
        if (store === undefined) return
        if (isFileOperationWaiting || asking !== null || openChoosing !== null) {
          raiseNotice(NOTHING_TO_DO_REASON, null)
          return
        }
        isFileOperationWaiting = true
        void saveHeldDocumentToFile(store).finally(endFileOperationWait)
        return
      }
      case 'dismissNotice':
        dismissNewestNotice()
        return
      case 'settleTextEntry': {
        if (screenState.surface !== null || asking !== null) return
        // TRAP: must precede the guard below, which would return with the panel still up (FR-091).
        if (namingCreatedTaskUid !== null) {
          namingCreatedTaskUid = null
          isPropertiesPanelPutAway = true
          selection = emptySelection()
          return
        }
        if (didSettleFieldEntry || hasUnsettledTextEntry()) return
        isPropertiesPanelPutAway = true
        return
      }
      case 'tellEntryHasNothingToDo':
        raiseNotice(
          action.situation === null
            ? NOTHING_TO_DO_REASON
            : NOTICE_REASON_OF_SPENT_ENTRANCE[action.situation],
          null,
        )
        return
      case 'editInPlace':
        if (action.target.kind === 'taskName') {
          showPropertiesOfChoice()
          nameFieldWantedRow = TASK_NAME_FIELD_ROW
          return
        }
        if (action.target.kind === 'rowName') {
          showPropertiesOfChoice()
          nameFieldWantedRow = ROW_NAME_FIELD_ROW
          return
        }
        if (action.target.kind === 'documentTitle') {
          nameFieldWantedRow = DOCUMENT_TITLE_FIELD_ROW
          return
        }
        if (action.target.kind === 'assignee') {
          showPropertiesOfChoice()
          nameFieldWantedRow = ASSIGNEE_FIELD_ROW
          return
        }
        if (action.target.kind === 'commentBoxText') {
          showPropertiesOfChoice()
          nameFieldWantedRow = COMMENT_BOX_TEXT_FIELD_ROW
          return
        }
        {
          const unreached: never = action.target
          void unreached
        }
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
        rowGrabbedAt = {
          groupId: action.groupId,
          depth: action.atDepth,
          axis: action.axis,
          resistedPx: action.resistedPx,
          atY: action.atY,
        }
        return
      }
      case 'chooseRow': {
        // TRAP: read the held set, not the drawn row; FR-048 may skip a paint, so a picture can be older.
        const chosen = selectedGroupIds
        if (!action.isExtending) {
          selectedGroupIds = [action.groupId]
        } else if (chosen.includes(action.groupId)) {
          selectedGroupIds = chosen.filter((one) => one !== action.groupId)
        } else {
          selectedGroupIds = [...chosen, action.groupId]
        }
        // STOP: spec does not decide where the chosen rows are held. Looked in FR-085, FR-042, SL-1
        // @provisional PND-142
        showPropertiesOfChoice()
        return
      }
      case 'chooseResources':
        // STOP: spec does not decide where the chosen resources are held. Looked in FR-099, SL-1
        // @provisional PND-143
        selectedResourceUids = action.uids
        return
      case 'toggleChosenResource': {
        // STOP: spec does not decide where the chosen resources are held. Looked in FR-099, SL-1
        // @provisional PND-143
        const chosen = selectedResourceUids
        selectedResourceUids = chosen.includes(action.uid)
          ? chosen.filter((one) => one !== action.uid)
          : [...chosen, action.uid]
        return
      }
      case 'toggleDocumentSettingsProperties':
        isPropertiesPanelPutAway = false
        // STOP: spec does not decide what the panel keeps when the selection empties. Looked in FR-072, SL-1
        // @provisional PND-144
        propertiesShowing =
          propertiesShowing === 'documentSettings' ? 'selection' : 'documentSettings'
        return
      case 'setDualCursorFollowing':
        // WHY: not changeDocument's road, which asks FR-032's question; no row of T-234 asks one here.
        dualCursorFollowing = action.following
        if (action.placed !== null) writeDocument([action.placed], frame)
        return
      case 'setLevelZeroFolded':
        isLevelZeroFolded = action.isFolded
        if (action.writes.length > 0) writeDocument(action.writes, frame)
        return
      case 'toggleAgentApi':
        setAgentApiEnabled(!isAgentApiEnabled)
        if (!isAgentApiEnabled) raiseNotice(HANDED_REFERENCE_STANDS_REASON, null)
        return
      case 'toggleDialogueFieldVisible':
        // STOP: spec does not decide whether turning the API off resets S-99i. Looked in FR-066, S-99i
        // @provisional PND-419
        isDialogueFieldVisible = !isDialogueFieldVisible
        return
    }
  }

  // see FR-072
  /** @purity non-pure */
  function showPropertiesOfChoice(): void {
    if (selection.items.length === 0 && selectedGroupIds.length === 0) return
    isPropertiesPanelPutAway = false
    propertiesShowing = 'selection'
    // STOP: spec does not decide what the panel keeps when the selection empties. Looked in FR-072, SL-1
    // @provisional PND-144
    propertiesSubject = { selection, groupIds: selectedGroupIds }
  }

  // see FR-091, HF-14, HF-17
  /** @purity non-pure */
  function standOnWhatWasCreated(
    created: NonNullable<Extract<InputAction, { kind: 'changeDocument' }>['created']>,
  ): void {
    if (created.kind === 'task') {
      if (!held.document.schedule.tasks.some((one) => one.uid === created.uid)) return
      selection = selectionWith(emptySelection(), { kind: 'task', uid: created.uid })
      showPropertiesOfChoice()
      nameFieldWantedRow = TASK_NAME_FIELD_ROW
      namingCreatedTaskUid = created.uid
      return
    }
    const madeRow = held.document.schedule.taskGroups.find((one) => one.id === created.groupId)
    if (madeRow === undefined) return
    if (madeRow.parentId === null && isLevelZeroFolded) isLevelZeroFolded = false
    selectedGroupIds = [created.groupId]
    showPropertiesOfChoice()
    nameFieldWantedRow = ROW_NAME_FIELD_ROW
    addedRowOwedSight = created.groupId
  }

  // see FR-048
  /** @purity semi-pure-b */
  function owesFrame(
    input: HumanInput,
    before: InputContext,
    partBefore: ScreenPart | null,
    grabBefore: Grabbed | null,
    noticesBefore: readonly RaisedNotice[],
  ): boolean {
    if (input.kind === 'wheel') {
      if (pressed !== null) return true
      if (held.document !== before.document) return true
      if (screenState !== before.screenState) return true
      if (selection !== before.selection) return true
      if (raisedNotices !== noticesBefore) return true
      return false
    }
    if (input.kind !== 'pointer' || input.phase !== 'move') return true
    if (pressed !== null) return true
    const guideMode = before.document.documentSettings.guideCursorMode
    if (guideMode !== GUIDE_CURSOR_NONE) return true
    if (dualCursorFollowing !== null) return true
    if (selection !== before.selection) return true
    if (screenState !== before.screenState) return true
    if (held.document !== before.document) return true
    if (!isSameScreenPart(partUnderPointer, partBefore)) return true
    if (isTooltipStanding) return true
    return !isSameGrab(grabUnderPointer, grabBefore)
  }

  // see IF-9
  /** @purity non-pure */
  function spendFieldCommit(frame: FrameValues): void {
    didSettleFieldEntry = false
    if (screen === undefined) return
    const commit = screen.surface.readFieldCommit()
    if (commit === null) return
    // TRAP: set on the commit, not the commands; a value naming no row is still a settled edit (SK-19).
    didSettleFieldEntry = true
    const commands = commandFromFieldCommit(commit, collectInputContext(frame))
    if (commands.length === 0) return
    isSettlingFieldCommit = true
    try {
      writeDocument(commands, frame)
    } finally {
      isSettlingFieldCommit = false
    }
  }

  // see FT-1
  /** @purity non-pure */
  function receiveInput(input: HumanInput): void {
    recordHappening(input)
    const frame = values
    if (frame === null) {
      recordLine('dropped', 'reason=noFrameHasRunYet')
      return
    }

    // TRAP: taken before spendFieldCommit, whose settling can raise a notice this key never saw.
    noticeReasonsOnArrival = new Set(raisedNotices.map((one) => one.reason))

    spendFieldCommit(frame)

    const partBefore = partUnderPointer
    const grabBefore = grabUnderPointer
    const noticesBefore = raisedNotices
    if (input.kind === 'pointer') {
      // TRAP: first in this block; the NT-8 dismissal below returns early, and the repeat would tick for ever.
      if (input.phase === 'up' || input.phase === 'lost') endEntryRepeat()
      // TRAP: judged on the point; hosts report moves that never leave the pixel, which would hold the rest open.
      const hasMoved = pointerAt === null || pointerAt.x !== input.x || pointerAt.y !== input.y
      pointerAt = { x: input.x, y: input.y }
      if (hasMoved) beginPointerRest()
      if (hasMoved) isTooltipDismissed = false
      partUnderPointer =
        screen === undefined ? null : screen.surface.readScreenPartAt(input.x, input.y)
      if (input.phase === 'down') {
        pressed = collectPress(input, frame, partUnderPointer)
        commandPaletteCornerAtPress =
          partUnderPointer?.entry === PALETTE_GRAB_BAND_ENTRY
            ? paletteCornerOf(commandPaletteDraggedTo, frame.regions)
            : null
        if (partUnderPointer?.dividerPanel === 'propertiesPanel') {
          isPropertiesPanelPutAway = false
        }
        // TRAP: after collectPress; pressHeldOnRepeatingEntry reads the entrance that press recorded.
        beginEntryRepeat()
      }
      if (input.phase === 'up' && partUnderPointer?.noticeDismissKey != null) {
        raisedNotices = noticesWithout(partUnderPointer.noticeDismissKey)
        ask()
        recordLine('done', 'spent=noticeDismiss frame=yes')
        return
      }
    }

    if (asking !== null && input.kind === 'key' && isConfirmationAnswerKey(input.key)) {
      answerConfirmation(input.key === CONFIRMATION_PROCEED_KEY, frame)
      ask()
      recordLine('done', `spent=confirmation=${input.key} frame=yes`)
      return
    }

    // TRAP: one context for all three members; rebuilding it reads the clock again (R7.4).
    const context = collectInputContext(frame, noticeReasonsOnArrival.size > 0)
    // TRAP: asked before the members run; asked after screenStateFromInput, one press spends two levels.
    const escapeLevel = escapeLevelOf(
      input,
      context,
      asking !== null,
      isPropertiesPanelOnScreen(),
      isTooltipStanding,
    )
    if (escapeLevel === 'tooltip') isTooltipDismissed = true
    const chosenBeforeThisHappening = selection
    selection = selectionFromInput(input, context)
    endCreatedNamingIfChosenMoved(chosenBeforeThisHappening)
    const isEscapeSpentHere = escapeLevel === 'confirmation' || escapeLevel === 'propertiesPanel'
    const wasPaletteShown = screenState.paletteShown
    screenState = isEscapeSpentHere ? screenState : screenStateFromInput(input, context)
    if (!wasPaletteShown && screenState.paletteShown) isPaletteMinimised = false
    const translated = commandFromInput(input, context)

    if (escapeLevel === 'notice') dismissNewestNotice()
    // WHY: spec does not equate Esc with cancelling; an abandoned question writes nothing.
    if (escapeLevel === 'confirmation') answerConfirmation(false, frame)
    if (escapeLevel === 'propertiesPanel') isPropertiesPanelPutAway = true
    if (escapeLevel === 'dualCursorMode') {
      dualCursorFollowing = null
      writeDocument([{ kind: 'clearDualCursor' }], frame)
    }

    // TRAP: dropped after the translator read the press (CS-2) and before the write below,
    // because WS-2 refuses a write during a gesture (AG-9).
    if (hasEndedGesture(input) || escapeLevel === 'gesture') pressed = null
    if (escapeLevel === 'gesture') endEntryRepeat()

    const isDragInterrupted =
      escapeLevel === 'gesture' || (input.kind === 'pointer' && input.phase === 'lost')
    if (isDragInterrupted && commandPaletteCornerAtPress !== null) {
      commandPaletteDraggedTo = commandPaletteCornerAtPress
    }
    if (hasEndedGesture(input) || escapeLevel === 'gesture') commandPaletteCornerAtPress = null
    if (hasEndedGesture(input) || escapeLevel === 'gesture') rowGrabbedAt = null

    const settledEntry = entrySettledOnRelease(input, context)
    const settledFormat = formatSettledOnRelease(input, context)
    const settledAnswer = answerSettledOnRelease(input, context)
    const spent =
      (settledEntry !== null &&
        answerSettledEntry(settledEntry, surfaceSettledOnRelease(input, context), frame)) ||
      (settledFormat !== null && answerSettledFormat(settledFormat)) ||
      // TRAP: U-60 is offered the answer before answerConfirmation; it answers false unless standing.
      (settledAnswer !== null &&
        answerWatermarkUnlock(settledAnswer === CONFIRMATION_PROCEED_ANSWER)) ||
      (settledAnswer !== null &&
        answerConfirmation(settledAnswer === CONFIRMATION_PROCEED_ANSWER, frame))
    if (!spent) carryOutAction(translated.action, frame)

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

    // STOP: spec does not decide what the panel keeps when the selection empties. Looked in FR-072, SL-1
    // @provisional PND-144
    if (selection !== context.selection && propertiesShowingNow() !== null) {
      showPropertiesOfChoice()
    }

    if (openChoosing !== null && screenState.surface !== OPEN_CHOOSER_SURFACE) {
      const abandoned = openChoosing
      openChoosing = null
      abandoned.settle(null)
    }

    if (mergeChoosing !== null && screenState.surface !== DIFFERENCE_REVIEW_SURFACE) {
      const abandoned = mergeChoosing
      mergeChoosing = null
      mergeCandidates = []
      unreadColumns = []
      abandoned.settle(null)
    }

    if (droppedTaskNames.length > 0 && screenState.surface !== IMPORT_REPORT_SURFACE) {
      droppedTaskNames = []
    }

    // TRAP: last, after the press is dropped, so a release no longer finds PTD-1 in flight.
    if (pointerAt !== null) {
      grabUnderPointer = grabAtPointer(frame, pointerAt.x, pointerAt.y, partUnderPointer)
      showPointerShape?.(
        pointerShapeAt(frame, pointerAt.x, pointerAt.y, partUnderPointer, grabUnderPointer),
      )
    }

    previewDocument = previewOfHeldPress(pressed, pointerAt, context, frame)

    const owesAFrame = owesFrame(input, context, partBefore, grabBefore, noticesBefore)
    recordLine(
      'done',
      `on=${partUnderPointer?.entry ?? '-'} grab=${grabUnderPointer?.grab ?? '-'} ` +
        `esc=${escapeLevel ?? '-'} act=${translated.action?.kind ?? '-'} ` +
        `assigned=${translated.isBrowserDefaultStopped} spentByShell=${spent} ` +
        `doc=${held.document === context.document ? 'same' : 'changed'} ` +
        `sel=${selection === context.selection ? 'same' : 'changed'} ` +
        `frame=${owesAFrame}`,
    )
    if (owesAFrame) ask()
  }

  if (settled(environment)) runFrame()

  return {
    // see FR-100
    /** @purity semi-pure-b */
    hasUnsavedEdits(): boolean {
      return hasUnsavedEdits
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
        asking !== null,
        isPropertiesPanelOnScreen(),
        isTooltipStanding,
      )
      if (level === 'confirmation' || level === 'propertiesPanel' || level === 'tooltip') return true
      if (asking !== null && input.kind === 'key' && isConfirmationAnswerKey(input.key)) return true
      return commandFromInput(input, context).isBrowserDefaultStopped
    },
    receiveInput,
    /** @purity non-pure */
    resize(next: FrameEnvironment): void {
      if (isSameEnvironment(next, environment)) return
      const wasSettled = settled(environment)
      environment = next
      if (!settled(next)) return
      if (!wasSettled) runFrame()
      else ask()
    },
    /** @purity non-pure */
    settleFirstFrameEnvironment(next: FrameEnvironment): void {
      if (isSameEnvironment(next, environment)) return
      environment = next
      if (!settled(next)) return
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
      takeInDocument: takeInHandedDocument,
      ...dialogueSeams,
    }),
    /** @purity non-pure */
    watchAgentApiEnabling(watch: (isEnabled: boolean) => void): void {
      agentApiEnablingWatch = watch
      if (isAgentApiEnabled) watch(true)
    },
    /** @purity non-pure */
    raiseStartupNotice(reason: StartupNoticeReason, affectedCount: number | null = null): void {
      raiseNotice(reason, affectedCount)
    },
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (tables T-206 and T-207)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_PROPERTIES_PANEL_SIZES: {
  readonly 'S-171': number
} = {
  'S-171': 280,
}

// see T-206
export const NOT_STORED_REPEAT_TIMES: {
  readonly 'S-172': number
  readonly 'S-173': number
} = {
  'S-172': 1000,
  'S-173': 120,
}

// see T-206
export const NOT_STORED_SCROLLBAR_SIZES: {
  readonly 'S-205': number
} = {
  'S-205': 8,
}

// see T-206
export const NOT_STORED_INTERACTION_RECORD_LIMITS: {
  readonly 'S-207': number
} = {
  'S-207': 2000,
}

// see T-206
export const NOT_STORED_WATERMARK_NAME: {
  readonly 'S-99a': 'user'
} = {
  'S-99a': 'user',
}

// see T-207, FR-020
export const WATERMARK_UNLOCK_DIGEST: {
  readonly 'S-101': string
} = {
  'S-101': 'e2b7f98dfe8145444b33263989fe5e47f9150fe1ef6460713268af974e6df134',
}
// </generated>
