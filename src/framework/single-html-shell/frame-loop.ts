// SingleHtmlShell -- the frame loop.
//
// @unit      UF-48   (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure
//
// Holds the current values (LY-5 of table T-060), wakes a frame on what table
// T-078 lists, and computes table T-068 once per frame for everything that
// draws (ADR-001). Kept apart from single-html-shell.ts by UT-6 of table T-063.
//
// ⚠️ One happening builds the input context twice: `isBrowserDefaultStopped`
// (MK-10) is asked before the watcher hears it and must change nothing, while
// `receiveInput` runs after it and, on a `down`, also sees the recorded press.
//
// ⚠️ FR-018's repeat is covered only by FT-1's opening clause (human input):
// FT-1's wait is CS-4, and FT-4 does not name a repeat. Which row should say so
// is the specification's to decide.

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
// `editDocument` (PI-9) is reached only for the drag preview: it is pure, so
// folding a release onto a copy advances no stamp, pushes no undo step and
// autosaves nothing -- FR-031's per-gesture bound survives a mid-drag picture.
import {
  editDocument,
  NOT_STORED_ZOOM_BOUNDS,
  type SettingsLimits,
} from '../../use-case/edit-document/edit-document'
// The entry itself, not only its types (LR-2 admits PI-10's own file). It is
// reached for the `ImportReport` alone: `ReplaceOutcome` (PI-8) carries no
// report, so the landing road cannot hand back what FR-015 is told from.
import {
  importDocument,
  type OpenChoice,
} from '../../use-case/import-document/import-document'
import { notifyChangeWatchers } from '../../use-case/notify-change-watchers/notify-change-watchers'
import {
  validateImportedDocument,
  type ImportBounds,
} from '../../use-case/validate-imported-document/validate-imported-document'
// Imported for its signature alone: every type this file needs from that
// component is reachable through `installAgentApi` (PI-17), and importing the
// unlisted names one by one is a crossing check 26b's reverse walk refuses.
// Nothing is installed here; placing the public point is UF-47's.
import type { installAgentApi } from '../../adapter/agent-api-endpoint/agent-api-endpoint'
// `exportEmbeddedHtml`: IO-7 is a file, so the road to it is this loop's (as
// for IO-4 below); UT-5 of table T-063 keeps the assembly in the codec.
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
// Table T-024's extension column, read as generated data (the reading
// `tools/check_layer_rules.py` states): PI-20 publishes no name that answers a
// form's extension, and FR-096 allows no other source for the value.
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
// `exportPng` is called from here because IO-4 is a file and the road to a
// file is this loop's (`exportHeldDocumentToFile`); FR-096 forbids a second
// entrance for the picture. The scene's values are computed here (ADR-001):
// none of them can be measured inside an Adapter.
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
// Read, never typed: the generator prints `SCHEMA_VERSION` into this file, and
// a typed copy would drift when the generator moves (rule 03 section 1).
import startupTemplate from './startup-template.json'

/**
 * FR-073's greatest known `GRS JSON` format version (OP-7 of table T-024a).
 *
 * ⚠️ Must be passed to `documentFromJson`: an Adapter may not reach the bundled
 * template (LR-6), and a caller that omits it gets `notCompared`.
 * Exported for `single-html-shell.ts`; it cannot live there, because that file
 * imports this one and the reverse would close a cycle.
 */
export const GREATEST_KNOWN_SCHEMA_VERSION: string = startupTemplate.schemaVersion

/**
 * What the shell measured about the window this frame. The last two are
 * measured rather than set because they differ per machine (FR-051).
 */
export interface FrameEnvironment {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly scrollbarThickness: number
  /**
   * LF-3 of table T-221: the height of HF-1's row-control lattice, a floor
   * under every row's band.
   *
   * Measured by the side that drew the lattice, because HF-19 of table T-051
   * keeps the number out of the manuscript.
   * ⚠️ Does not follow the text size (HF-19, HF-5); making it follow breaks
   * HF-19. Not part of `ScreenEnvironment`: it settles no rectangle.
   * Absent until the first panel is drawn, which leaves the bands unfloored.
   */
  readonly rowControlsHeightPx?: number
}

/** What one frame computed, kept together so nothing recomputes it. */
export interface FrameValues {
  readonly regions: ScreenRegions
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
  /**
   * The settings the three above were measured with -- those of the document
   * this frame drew, under `withPropertiesPanelShown`.
   *
   * ⚠️ Not always the held document's: while FR-052's divider is held the
   * picture uses preview panel widths, and `settingsLimitsOf` adding the held
   * widths to a preview-cut `Row Area` would drift by the travel. Carried so
   * the picture and the bounds come from one frame.
   * @provisional PND-254
   */
  readonly settingsMeasuredWith: DocumentSettings
  /**
   * Whether this frame's picture stands at the document's stored zoom (`S-75` /
   * `S-76`) rather than at FR-055's fit -- OP-10 of table T-024a, decided once
   * in `viewSettings`.
   *
   * Carried because the press side cannot derive it: only this side knows the
   * document came from BT-4. Handed on as `InputContext.isPictureAtStoredZoom`.
   */
  readonly isPictureAtStoredZoom: boolean
}

/**
 * The one row of table T-230 a caller outside this loop may use: RD-6, the
 * startup document, which the caller brings itself.
 *
 * Narrowed out of `ReplacementCall` so the row's shape stays PI-8's. The other
 * rows are reached from inside this file -- RD-7 too, because FR-095 has this
 * loop ask OP-4's confirmation before landing it.
 */
export type HeldDocumentCall = Extract<ReplacementCall, { readonly row: 'RD-6' }>

/** PI-17's argument list, the one route to the seam types below. */
type AgentApiWiring = Parameters<typeof installAgentApi>[0]

/**
 * A document handed straight in with no file behind it -- AM-8's road.
 *
 * Table T-032a's mapping is absent: FR-022 refuses a call handed the choices in
 * advance, so a person answers it on U-61. The byte length is carried because
 * OP-5 measures in bytes (S-113). `choice` is OP-3's, the entrance's meaning.
 */
interface HandedImport {
  readonly incoming: Document
  readonly format: ExchangeFormat
  readonly byteLength: number
  readonly choice: OpenChoice
  /**
   * FR-073: the columns this build could not read because the value declares a
   * newer format version.
   *
   * Measured on this side of the seam: once asserted into `Document` the
   * unknown keys are gone, and only the `GRS JSON` text written for S-113's
   * byte length still has them. AM-8 is not widened for it.
   */
  readonly unreadColumns: readonly string[]
}

/**
 * The members of PI-17's wiring that are current values (LY-5 of table T-060),
 * gathered so the file that places the public point holds none of them.
 *
 * `writerName` (ED-2 of table T-229) and `schemaVersion` (AM-2) belong to the
 * installing side. Derived with `Omit` so a member added there is a type error
 * here instead of being forgotten.
 */
export type AgentApiSeams = Omit<AgentApiWiring, 'writerName' | 'schemaVersion'>

/**
 * The rows of table T-233 BO-2 of table T-077 can be told on.
 *
 * BO-2 decides before this loop exists, so the caller keeps what it has to say
 * until it has a loop (the only order table T-077 admits); nothing is queued
 * here. Only the telling of `RS-48` reaches this road; the rest of FR-073 is
 * at the raiser in `single-html-shell.ts`.
 */
export type StartupNoticeReason = Extract<
  NoticeReason,
  'RS-15' | 'RS-21' | 'RS-25' | 'RS-26' | 'RS-48' | 'RS-51'
>

export interface FrameLoop {
  /** FR-100: whether leaving the page now would lose work. */
  hasUnsavedEdits(): boolean
  /**
   * FT-2: the current value was replaced, so a frame is owed.
   *
   * The caller names its row of table T-230 and brings nothing else; history,
   * stamp and undo step are settled by that row on the `replaceDocument` road.
   * Named `hold` for the role (R2.1). ⚠️ Nothing in `src/` calls it today.
   */
  holdDocument(call: HeldDocumentCall): void
  /** FT-3: the window changed size. */
  resize(env: FrameEnvironment): void
  /**
   * BO-1's measurements as BO-5's own frame settled them, running the frame
   * they change without asking for one.
   *
   * Not `resize` (FT-3 is a change to a screen already up): the `App Header`'s
   * height cannot be measured until the first frame has drawn it. The frame runs
   * in the caller's task because an asked-for frame lands in a later task and
   * leaves a picture drawn against unsettled numbers on the page (BO-1).
   * Changes nothing when no measurement moved.
   */
  settleFirstFrameEnvironment(env: FrameEnvironment): void
  /**
   * MK-10's answer for one happening (`TranslatedInput.isBrowserDefaultStopped`).
   *
   * ⛔ Asked before the watcher hears the happening, so it must change nothing:
   * IN-4a would otherwise read a screen that had already moved on.
   *
   * @purity non-pure
   */
  isBrowserDefaultStopped(input: HumanInput): boolean
  /**
   * FT-1 of table T-078: one happening arrived over IF-2.
   *
   * @purity non-pure
   */
  receiveInput(input: HumanInput): void
  /** What the last frame computed, for a caller that needs to ask. */
  current(): FrameValues | null
  document(): Document
  /**
   * What one export is assembled from (PI-21), for FR-080's base environment,
   * or `null` while BO-1 has settled no size.
   *
   * The one place the panels are closed: that environment is a separate run of
   * table T-068, so it is the loop's (LY-5, ADR-001) and is not run at a
   * frame's head. Also what IF-7 puts in `AgentSnapshot.exportScene`, and IO-3's
   * road.
   *
   * @purity semi-pure-b
   */
  exportScene(): ExportScene | null
  /**
   * The seams `installAgentApi` (PI-17) is wired from (LY-5 of table T-060).
   *
   * Built with the loop and never replaced, so installing twice uses the same
   * seams and a handed-out reference keeps working (FR-065).
   *
   * @purity semi-pure-b
   */
  agentApiSeams(): AgentApiSeams
  /**
   * Hear FR-065's enabling turn, so the side that places the public point
   * (UF-47) can place and remove it; only this loop holds IC-20's value.
   *
   * ⚠️ One watcher, replaced by the next: a second would be a second holder of
   * the public point.
   * ⛔ Told at once when already on: the enabling is remembered per origin, so a
   * watcher that only heard turns would never place the point. Nothing is said
   * when it is off.
   *
   * @purity non-pure
   */
  watchAgentApiEnabling(watch: (isEnabled: boolean) => void): void
  /**
   * FR-076: raise what BO-2 of table T-077 had to tell but had no loop to tell
   * it on, onto `ScreenSession.notices` like every other reason.
   *
   * `affectedCount` is the raiser's measurement or `null` (only `RS-51` carries
   * one); no count is invented here.
   *
   * @purity non-pure
   */
  raiseStartupNotice(reason: StartupNoticeReason, affectedCount?: number | null): void
}

/**
 * The far side of IF-9, and what only the host can answer about this session.
 * Optional: the loop runs whether or not the caller had a browser to draw on.
 */
export interface ScreenWiring {
  /** IF-9's implementation -- the one unit that turns a `ScreenView` into nodes. */
  readonly surface: ScreenSurface
  /** FR-038's language for this session, settled by the shell, never the document. */
  readonly language: DisplayLanguage
  /**
   * MK-13's second half: put the person into the field the surface drew for one
   * row, with its content selected.
   *
   * The row may be outside table T-016 (SK-9 names `U-27`); which control a row
   * means is the drawing side's answer (LR-6). Beside the surface rather than
   * on it: the IF-9 cell of table T-065 does not list it
   * (`ScreenSurfaceWiring.holdFocusPropertyField`). Asked only after the
   * description has been drawn -- see `runFrame`.
   * ⚠️ Optional, so forgetting it is silent: MK-13 stays half done with nothing
   * to say so. The tests written from the specification watch it.
   */
  readonly focusPropertyField?: (row: string) => void
  /**
   * FR-020: read what stands in U-60's masked field when one of its two answers
   * is given.
   *
   * Beside the surface for the reason above; not `readFieldCommit`, which
   * carries a table T-016 row's value. Asked once and never held: FR-020 keeps
   * the raw password out of the model, so it is hashed and let go.
   * ⚠️ Optional and silent when missing, but on the safe side: no password can
   * match, so the watermark is never hidden.
   */
  readonly readWatermarkUnlockAnswer?: () => string
}

/**
 * IN-2 of table T-028's shapes, spelled as the host's standard keywords.
 *
 * ⚠️ `default` (range selection) and `copy` (arming a figure) are judgements:
 * the host has no keyword for drawing, so these are the nearest published
 * meanings, and a ruling that disagrees moves only these two names.
 * @provisional PND-337
 * `grab` is the resting shape; `grabbing` is already spent on PTD-1's pan.
 */
export type PointerShape =
  /** PTD-5 of table T-023a. */
  | 'default'
  /** PTD-4 of table T-023a. */
  | 'copy'
  /** PTD-1 of table T-023a. */
  | 'grabbing'
  /** GR-3 .. GR-6 of table T-023d. */
  | 'ew-resize'
  /** GR-12 / GR-15 of table T-023d. */
  | 'grab'

/**
 * Where IN-2's shape is put, or nothing when the caller drew no schedule.
 *
 * A function rather than a member of `SvgSurface` (IF-1): the canvas element is
 * made in this same component (CP-25), so table T-065 need not be widened.
 * `null` leaves the pointer alone.
 */
export type ShowPointerShape = (shape: PointerShape | null) => void

/**
 * What `itemAtPointer` (PI-7) answers where a row of table T-023d claims the
 * point. Derived, not imported: table T-064 lists neither the type nor its
 * `grab`, and a named import is a crossing check 26b refuses.
 */
type Grabbed = NonNullable<ReturnType<typeof itemAtPointer>>

/**
 * Every row of table T-023d `itemAtPointer` can answer. It widens with the
 * table, so a `Record` keyed on it cannot leave a row out.
 */
type GrabbedArea = Grabbed['grab']

/**
 * Which IN-2 shape each row of table T-023d gets, or `null` where IN-2 names
 * none. The nulls are IN-2's silence; a shape invented for one of them would be
 * this build writing a requirement.
 */
const POINTER_SHAPE_BY_GRAB: Readonly<Record<GrabbedArea, PointerShape | null>> = {
  'GR-3': 'ew-resize',
  'GR-4': 'ew-resize',
  'GR-5': 'ew-resize',
  'GR-6': 'ew-resize',
  'GR-9': 'ew-resize',
  'GR-17': 'ew-resize',
  'GR-18': 'ew-resize',
  // GR-12 also covers a milestone's plan figure (a milestone has no plan ends
  // for GR-3 / GR-4); GR-15 is its actual.
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

/**
 * Which rows of table T-023d draw, while held, what they would write on
 * release.
 *
 * `true` follows table T-023d's closing rules on the picture during a drag;
 * the commit still follows IN-1 of table T-028, so `true` only draws. The rest
 * are `false` because no closing rule asks.
 * @provisional PND-250
 */
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
  // Exact in pixels, not whole days: FR-019 holds the comment box's body offset
  // as a screen distance.
  'GR-14': true,
  'GR-15': true,
  'GR-16': true,
  'GR-17': true,
  'GR-18': true,
}

/**
 * The rectangle a range selection is taking, or `null` while none is.
 *
 * PTD-5 is read off the press (`pressRowOf` answered at button-down) rather
 * than worked out again. `on` is asked first: table T-023a covers only the
 * schedule's drawing area. A press that has not moved takes nothing, so a
 * plain click paints no dot.
 *
 * @purity pure
 */
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

/**
 * Whether the document still holds what this reference names.
 *
 * A `switch` over every kind SL-1 of table T-023c admits, so a new kind is a
 * compile error. The status line counts: once `Project.statusDate` is cleared,
 * a selection holding it is as stale as one holding a deleted `Task`.
 *
 * @purity pure
 */
function scheduleHolds(schedule: Schedule, item: ItemRef): boolean {
  switch (item.kind) {
    case 'task':
      return taskByUid(schedule, item.uid) !== null
    case 'dependency': {
      // The ordinal is part of the name (PI-32): removing a predecessor from the
      // middle renames the ones after it.
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

/**
 * Table T-023c's closing rule, applied to one selection.
 *
 * Keeps the order and `ordered` (SL-7b, FR-034). ⛔ Returns the same object
 * when nothing went: the shell compares selections by identity (FR-072), and a
 * fresh object would reopen the `Properties Panel` on every unrelated edit.
 *
 * @purity pure
 */
function selectionWithinSchedule(selection: Selection, schedule: Schedule): Selection {
  const items = selection.items.filter((item) => scheduleHolds(schedule, item))
  if (items.length === selection.items.length) return selection
  return selection.ordered ? { items, ordered: true } : selectionOfAll(items)
}

/**
 * Whether a press in flight owes a picture of what it would write.
 *
 * `on` is asked first, as in `isDocumentChangingPress`: a press on the screen
 * surface carries no row of table T-023d. FR-052's divider is one (U-24 has no
 * table T-109 entry, so `commandFromEntry` tests `dividerPanel` first).
 *
 * ⛔ PTD-1 is not here: previewing a pan compounds, because `scrolledAnchor`
 * measures the travel against a layout built from the previewed picture, and
 * the picture runs away. A pan reports on the move instead (`panFollow`,
 * `PointerPress.followedTo`), which pushes no step (UN-8 of table T-027).
 *
 * PTD-4 is here although it is not a grab; its row is read off the press
 * (`PointerPress.pressRow`, CS-2 of table T-066). No shape is named in this
 * file: `previewOfHeldPress` folds the release's own writes onto a copy, so the
 * draft is what `commandFromArmed` would write, and nothing reaches the
 * document.
 * ⚠️ A bar that has not travelled draws nothing: `commandFromArmed` answers
 * FR-001's refusal instead of a write. A milestone stands from the press.
 *
 * @purity pure
 */
function isPreviewedPress(press: PointerPress | null): boolean {
  if (press === null) return false
  if (press.on !== null) return press.on.dividerPanel !== null
  if (press.pressRow === 'PTD-4') return true
  return press.hit !== null && PREVIEWED_GRABS[press.hit.grab]
}

/**
 * The reach table T-023d's rows are grabbed by (`itemAtPointer`, PI-7), all
 * read from `NOT_STORED_SIZES` (rule 03 section 1).
 *
 * `S-92` is a width and height while `PointerSlop.fadeHandle` is a half-width,
 * hence the halving. ⛔ `S-93` is not here: the dummies' hit area is the mark
 * `dummiesOf` solved (table T-023d's closing rule).
 */
const POINTER_SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  line: NOT_STORED_SIZES['S-137'],
}

/** The megabyte factor S-95's remark states. */
const BYTES_PER_MEGABYTE = 1024 * 1024

/**
 * FR-031's two bounds on the undo history, from table T-206's rows.
 *
 * ⚠️ S-95 is printed in megabytes and FR-031 measures bytes, so it is converted
 * here where the bound is applied; read as bytes it is smaller than any
 * document and every write collapses the history to one step. A step is
 * measured in UTF-8 bytes, not `String.length` (FR-031).
 */
const HISTORY_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * BYTES_PER_MEGABYTE,
}

/**
 * SK-8 of table T-036, spelled as that table spells it.
 *
 * `KeyInput.key` is a plain string, so the spelling is repeated wherever a row
 * of table T-036 is recognised (`dom-input-source.ts` normalises `Escape` to
 * it).
 */
const ESCAPE_KEY = 'Esc'

/**
 * CU-3 of table T-029 -- the guide cursor drawn for nobody. The key that holds
 * it is `S-66` of table T-202.
 */
const GUIDE_CURSOR_NONE = 'none'

/**
 * ED-1 of table T-229 -- the writer name a write from the screen carries.
 * AG-6 of table T-035 tells writers apart by this string alone.
 * ⚠️ Not generated: a change to table T-229 has to be brought here by hand.
 */
const EDITED_BY_SCREEN = 'user'

/**
 * The rows of table T-109 only this layer can answer: a press on them writes a
 * current value (LY-5 of table T-060), and none is a `DocumentCommand`.
 * IC-21 chooses the display language (S-99). NT-7's two word buttons have no
 * table T-109 row and are spent by the constants further down.
 */
const DISPLAY_LANGUAGE_ENTRY: IconId = 'IC-21'
/**
 * The entry that turns S-142 of table T-206. One entry opens and folds
 * (FR-053), so the state is read off what is held rather than off the entry.
 */
const MILESTONE_LIST_ENTRY: IconId = 'IC-50'
/** The entry that turns S-200 of table T-206 -- FR-053's minimise toggle. */
const PALETTE_MINIMISE_ENTRY: IconId = 'IC-75'
/**
 * The entry that turns S-206 of table T-206 -- FR-102's record, made of what
 * this loop receives over IF-2 and draws in `runFrame`.
 */
const INTERACTION_RECORD_ENTRY: IconId = 'IC-76'
/**
 * NT-7's go-on answer, as a key of the `confirmation` section of FR-038's
 * dictionary. The key is compared, not the word, so the dictionary is not
 * copied here; any other answer is the cancel one.
 */
const CONFIRMATION_PROCEED_ANSWER = 'proceed'

/**
 * NT-7's two answer keys, spelled as `keyOf` in `dom-input-source.ts` reports
 * a single character. Written here rather than derived from the words, which
 * this layer may not read (they live in `ScreenRenderer`).
 */
const CONFIRMATION_PROCEED_KEY = 'Y'
const CONFIRMATION_CANCEL_KEY = 'N'

/**
 * Whether this key is one of NT-7's two answers.
 *
 * ⛔ Asked in one place so `receiveInput` and `isBrowserDefaultStopped` (MK-10,
 * asked before the watcher hears the press) cannot disagree.
 *
 * @purity pure
 */
function isConfirmationAnswerKey(key: string): boolean {
  return key === CONFIRMATION_PROCEED_KEY || key === CONFIRMATION_CANCEL_KEY
}
/**
 * IC-18 -- FR-066's dialogue field.
 *
 * What a press does while the `Agent API` is on is the translator's
 * (`toggleDialogueFieldVisible`). Kept here is the faint-entrance telling
 * (FR-029): whether the API is on is this layer's value (`isAgentApiEnabled`),
 * and `InputContext` carries no member for it.
 */
const DIALOGUE_FIELD_ENTRY: IconId = 'IC-18'

/**
 * IC-66 -- FR-099's deletion of the chosen assignees, on U-49.
 *
 * Unlike the rows above this is a `DocumentCommand` (CM-42), but its argument
 * is the choice `ScreenSession.selectedResourceUids` (PND-143) holds, which
 * only this layer has. Its neighbours (IC-63 .. IC-65, IC-67 / IC-68) move that
 * set and so stay with the translator. No surface is asked beside it: the row
 * stands on U-49 alone.
 */
const ROSTER_DELETE_ENTRY: IconId = 'IC-66'

/**
 * IC-98 -- FR-095's new document, on the `App Header`: asks `DISCARD_QUESTION`
 * (QN-5, per table T-234's closing note) and lands table T-230's `RD-7`.
 *
 * Here because the write is `replaceDocument` (PI-8), not a table T-108
 * command; `answerSettledEntry` reads the press's `ScreenPart`, so the
 * translator is not on this road.
 * ⛔ Never raise the question without the landing: a "go on" that discards
 * nothing is the lying confirmation rule 04 section 3.6 records.
 */
const NEW_DOCUMENT_ENTRY: IconId = 'IC-98'

/**
 * GR-19 of table T-023d -- the band FR-053's palette is dragged by (IC-53,
 * which is not a button).
 *
 * `answerSettledEntry` answers `false` for it, leaving the release's travel to
 * `carryOutAction`; answering there would swallow the drag's last piece. The
 * id lets an interruption (`Esc` under IN-1, or IN-1a's lost pointer) put the
 * corner back. Read off the press's `ScreenPart`: an interrupted drag produces
 * no action.
 */
const PALETTE_GRAB_BAND_ENTRY: IconId = 'IC-53'

/**
 * IC-52 on the `Properties Panel` (IN-4 of table T-028). The same row stands on
 * other surfaces, where the translator answers it by closing S-99g's surface,
 * so the surface is asked for beside it.
 */
const CLOSE_SURFACE_ENTRY: IconId = 'IC-52'

/** U-25 of table T-103, spelled as that table spells it. */
const PROPERTIES_PANEL_SURFACE = 'Properties Panel'

/**
 * The `AI Export Modal` half of U-30 of table T-103 (FR-068). Read by
 * `sessionOf` to put the document on it, and by `answerSettledEntry` so that
 * IC-52 there copies before it closes.
 */
const AI_EXPORT_MODAL_SURFACE = 'AI Export Modal'

/**
 * U-60 of table T-103 (FR-020). S-99g holds one surface name, which is how
 * NT-7's word buttons pressed here are told from the same buttons on U-55.
 * Also spelled in `input-command-translator.ts` and `open-modals.ts`; a
 * misspelling raises a surface nothing describes.
 */
const WATERMARK_UNLOCK_SURFACE = 'Watermark Unlock'

/**
 * The row of table T-233 a watermark password mismatch is told on (FR-020).
 * Not `RS-15`, which FR-076 reserves for reasons with no row.
 */
const WATERMARK_UNLOCK_MISMATCH_REASON: NoticeReason = 'RS-41'

/**
 * The entrances a held press repeats on (FR-018). What each press writes stays
 * `commandFromEntry`'s; the repeat asks that member again.
 */
const REPEATING_ENTRIES: readonly IconId[] = ['IC-12', 'IC-13', 'IC-14', 'IC-15']

/** The row of table T-037 a raised question follows -- `NT-7`. */
const CONFIRMATION_MANNER = 'NT-7'

/**
 * The row of table T-016 MK-13 names for a double click on a `Task`. The row id
 * is the join: `ScreenSurface.focusPropertyField` takes a row id.
 */
const TASK_NAME_FIELD_ROW = 'PR-1'

/** MK-13's row-name field: `AT-53`, `TaskGroup.label` (FR-042). */
const ROW_NAME_FIELD_ROW = 'AT-53'

/**
 * The field `AS-1` of table T-225 names for a double click on an assignee
 * label. Which control of that row is focused is the drawing side's (AS-5).
 */
const ASSIGNEE_FIELD_ROW = 'PR-16'

/** MK-13's comment-box body field (FR-097). */
const COMMENT_BOX_TEXT_FIELD_ROW = 'PR-21'

/**
 * The field SK-9 names for `F2`: `U-27` of table T-103, the `Document Title`.
 *
 * Not a table T-016 row: IF-9 lets an editable field answer with a UI part id.
 * No property row is added: FR-074 keeps the name out of the panel, and FR-035
 * has it edited where it stands.
 */
const DOCUMENT_TITLE_FIELD_ROW = 'U-27'

/**
 * The rows of table T-234 this file can ask on. The dictionary (FR-038) turns
 * the row into NT-7's sentence, so nothing here composes one; a row is added
 * only when a road asks it.
 *
 * `QN-9` is absent: FR-020's question is drawn on U-60 and spent by
 * `answerWatermarkUnlock`. `QN-8` is absent: it is the dictionary's landing
 * for a missing key.
 */
type ConfirmationQuestion = 'QN-1' | 'QN-2' | 'QN-3' | 'QN-4' | 'QN-5'

/** The row of table T-234 DI-4's overwrite question shows (DI-4 of table T-227). */
const OVERWRITE_QUESTION: ConfirmationQuestion = 'QN-4'

/** The row of table T-234 OP-4's replace question shows. */
const DISCARD_QUESTION: ConfirmationQuestion = 'QN-5'

/**
 * The row of table T-234 FR-099's deletion of chosen assignees shows. ⚠️ Only
 * when the deletion frees an assignment; asking otherwise adds a question NT-7
 * forbids.
 */
const UNASSIGNMENT_QUESTION: ConfirmationQuestion = 'QN-3'

/**
 * The rows of table T-233 this file can raise. The dictionary (FR-038) turns
 * the row into words, so nothing here composes a sentence.
 *
 * ⚠️ `RS-15` is only for reasons the table holds no row for (FR-076); reaching
 * for it where a row exists says something untrue.
 * ⚠️ Not generated: a row retired from table T-233 has to be struck here by
 * hand, or a telling could carry a reason FR-076 forbids.
 */
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
  // `RS-48`: the unreadable columns travel to `U-61` beside it (FR-073). Its
  // count is `null`: FR-073 asks for the columns, not a tally.
  | 'RS-48'
  | 'RS-51'
  | 'RS-52'
  | 'RS-53'
  // `RS-54` rides WS-3's `refused` road like `RS-10`; `reasonOfWriteRefusal`
  // tells the two apart.
  | 'RS-54'
  | 'RS-55'
  | 'RS-56'
  | 'RS-57'
  | 'RS-58'

/**
 * Which row of table T-037 each reason is written against, read out of table
 * T-233's manner column. A `Record` so a new reason is a compile error.
 *
 * Carried rather than derived on the far side: only the raiser knows whether
 * the input was refused or accepted with a caution (NT-5, `RaisedNotice.manner`).
 * ⚠️ Not generated: a manner moved in table T-233 has to be brought here by hand.
 */
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
  // Table T-233 gives NT-1 here although FR-073 has the document opened; the
  // table is followed, not re-derived from what happened.
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

/**
 * Which row of table T-233 each file-operation fault is, or `null` for
 * `cancelled`, which IF-3 keeps apart so that it is not reported.
 */
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

/**
 * Which row of table T-233 each refusal of table T-067 is, or `null` where the
 * table names none.
 *
 * Keyed on the reason alone: the two roads' reasons are all distinct words.
 * ⛔ `importRefused` has no row: that refusal is often a question for a person,
 * and telling it as a dropped bundle would misstate NT-1. A row is owed.
 */
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

/**
 * One situation table T-233 gives a WS-3 refusal its own row for, and what a
 * `Refusal` must look like to be it.
 *
 * The reason alone is not enough: WS-3 spells every command refusal `refused`,
 * so without this a situation with its own row would land on `RS-10`, which
 * table T-037's closing paragraph forbids. A row added to table T-233 without
 * an entry here is the flattening that paragraph names.
 *
 * `rule` is the item that row cites (also `Refusal.rule`). `command` narrows
 * where the rule refuses for several situations, else `null`; `reasonCategory`
 * narrows where command and rule together still do (FR-009 with DN-1 .. DN-3
 * of table T-018b).
 */
interface RefusalSituation {
  /** The row of table T-233 this situation is told on. */
  readonly reason: NoticeReason
  /** The row of table T-108, or `null` where the rule alone settles it. */
  readonly command: string | null
  /** The requirement, table row or settings row named in that reason's 正. */
  readonly rule: string
  /**
   * AG-9a's reason category, or absent where command and rule settle it. A
   * situation naming one matches only a refusal carrying the same one.
   */
  readonly reasonCategory?: Refusal['reasonCategory']
}

const REFUSAL_SITUATIONS: readonly RefusalSituation[] = [
  // The command is named beside the rule so that a later second rule on CM-20
  // is not silently told as `RS-54`.
  { reason: 'RS-54', command: 'CM-20', rule: 'FR-083' },
  // No command: HM-4 is one prohibition, reached by `CM-73` and `CM-18` alike.
  { reason: 'RS-55', command: null, rule: 'HM-4' },
  // The one entry with a category: FR-009's refusals share command and rule,
  // and only DN-1 has a row in table T-233; DN-2 / DN-3 stay on `RS-10`.
  { reason: 'RS-56', command: 'CM-36', rule: 'FR-009', reasonCategory: 'bothEndsAreOneTask' },
  // No command: IV-1 is one uniqueness invariant whatever array the key is in.
  // The import's IV-1 refusal arrives as `importRefused` and never matches.
  { reason: 'RS-57', command: null, rule: 'IV-1' },
  // Commands named: `CM-15` also refuses on `FR-012`, for a different reason.
  { reason: 'RS-58', command: 'CM-6', rule: 'FR-012' },
  { reason: 'RS-58', command: 'CM-11', rule: 'FR-012' },
]

/**
 * The row of table T-233 ONE refusal of a WS-3 bundle is, or `null` where the
 * table names none for it.
 *
 * @purity pure
 */
function situationReasonOf(one: Refusal): NoticeReason | null {
  for (const situation of REFUSAL_SITUATIONS) {
    if (situation.rule !== one.rule) continue
    if (situation.command !== null && situation.command !== one.command) continue
    // An exact match, not a fallback: keeps `RS-56` off FR-009's other refusals.
    if (situation.reasonCategory !== undefined && situation.reasonCategory !== one.reasonCategory) {
      continue
    }
    return situation.reason
  }
  return null
}

/**
 * Which row of table T-233 one refused write is told on.
 *
 * A situation's row only when every refusal in the bundle is that same
 * situation; otherwise the census row. A refusal no situation names keeps the
 * census row rather than a guessed one.
 *
 * @purity pure
 */
function reasonOfWriteRefusal(refusal: PlanRefusal | ReplacementRefusal): NoticeReason | null {
  if (refusal.step === 'WS-3' && refusal.reason === 'refused') {
    const all = refusal.refusals
    const first = all.length > 0 ? situationReasonOf(all[0] as Refusal) : null
    if (first !== null && all.every((one) => situationReasonOf(one) === first)) return first
  }
  return NOTICE_REASON_OF_WRITE_REFUSAL[refusal.reason]
}

/**
 * Which row of table T-233 each OP-12 answer is.
 *
 * ⚠️ `both` covers two situations (`FormatMismatch`) and the table has a row
 * for one; telling them apart would read table T-024's roster twice (R2.7).
 */
const NOTICE_REASON_OF_FORMAT_MISMATCH: Readonly<Record<FormatMismatch, NoticeReason>> = {
  extension: 'RS-11',
  firstCharacter: 'RS-12',
  both: 'RS-13',
}

/** The row of table T-233 OP-11's caution carries. */
const IGNORED_FILES_REASON: NoticeReason = 'RS-14'

/**
 * The row of table T-233 the read road's settings clamp carries. The codec
 * measures the count (`JsonDecoding.clampedCount`); this file names the row.
 */
const SETTINGS_CLAMPED_REASON: NoticeReason = 'RS-51'


/**
 * The row of table T-233 a calendar edit's recount carries (FR-012).
 *
 * The write measures the count (`EditReport.recountedTaskUids`), and
 * `writeDocument`, the one write entrance (MS-1 of table T-042), raises it. A
 * write that moved no task says nothing.
 */
const RECOUNTED_PERCENT_COMPLETE_REASON: NoticeReason = 'RS-52'

/** The row of table T-233 FR-015's caution carries: overlay tasks that matched nothing. */
const OVERLAY_NOT_DRAWN_REASON: NoticeReason = 'RS-16'

/**
 * The row of table T-233 told when the picture will not fit S-217's ceiling
 * (FR-025), for IO-3, IO-4 and IO-6 alike.
 *
 * Also `NOTICE_REASON_OF_RASTER_FAULT.tooLarge`: geometry or the machine may
 * refuse, and the next step is the same. The callers return before any file
 * content is produced or the clipboard is touched.
 */
const HEIGHT_CEILING_REASON: NoticeReason = 'RS-43'

/**
 * `RS-40` has no raiser in this build: table T-233 keeps it for the next form
 * of table T-024 offered before this build can write it.
 */

/**
 * The row of table T-233 each rastering failure carries.
 *
 * `unsupported` and `rasterFailed` share `RS-42`: neither has a next step of
 * its own (NT-3a). `tooLarge` has a known cause, so it takes `RS-43`, the row
 * `HEIGHT_CEILING_REASON` also uses.
 */
const NOTICE_REASON_OF_RASTER_FAULT: Readonly<Record<RasterFaultReason, NoticeReason>> = {
  unsupported: 'RS-42',
  tooLarge: 'RS-43',
  rasterFailed: 'RS-42',
}

/**
 * Why a single .html could not be assembled. Derived rather than imported:
 * PI-20 of table T-064 names `exportEmbeddedHtml` but not this type (check 26b).
 */
type EmbeddedHtmlFaultReason = Exclude<
  Awaited<ReturnType<typeof exportEmbeddedHtml>>,
  { readonly ok: true }
>['fault']['reason']

/**
 * The row of table T-233 each single .html assembly fault carries.
 *
 * `appShellUnavailable` falls to `RS-15` because table T-233 has no row for it
 * (as `STARTUP_NOTICE_REASON` does for `embeddedEntryCountNotOne`); a row is
 * owed. The other two are `RS-42`: there is no cause or different step to tell.
 * Not `RS-40`: this build can write the form.
 */
const NOTICE_REASON_OF_EMBEDDED_HTML_FAULT: Readonly<
  Record<EmbeddedHtmlFaultReason, NoticeReason>
> = {
  appShellUnavailable: 'RS-15',
  unusableElementId: 'RS-42',
  moreThanOneEntry: 'RS-42',
}

/**
 * The row of table T-233 told when a chosen form needs a seam this host did not
 * hand `single-html-shell.ts` -- `.png` with no `rasterizer` (IF-6), the single
 * `.html` with no `AppShellSource` (IF-8).
 *
 * `RS-3` rather than a new row: it is LM-14's write this environment cannot
 * perform, one step earlier. One constant for both seams, because the reader
 * is not told which seam was missing.
 */
const SEAM_ABSENT_REASON: NoticeReason = 'RS-3'

/**
 * The row of table T-233 FR-088's refusal carries. The condition is IV-17,
 * asked through `scheduleViolations` and not repeated here. Narrowed to one row
 * because BO-2 raises it too and `StartupNoticeReason` must admit it.
 */
const NO_WORKING_WEEKDAY_REASON: Extract<NoticeReason, 'RS-21'> = 'RS-21'

/**
 * The row of table T-233 a change watcher that did not answer is told on. Its
 * manner owes a next step, so `notifyChangeWatchers`'s outcome may not be
 * dropped.
 */
const WATCHER_SILENT_REASON: NoticeReason = 'RS-23'

/**
 * The row of table T-233 ST-7's stacking safety valve is told on (ST-7 of
 * table T-014).
 *
 * Raised here, not where the valve is measured: `schedule-layout.ts` is pure,
 * so it returns `ScheduleLayout.stackSafetyCapReached` and the shell tells.
 * Nothing is wrapped in a `try`: ST-7 returns a value rather than throwing.
 */
const STACK_SAFETY_CAP_REASON: NoticeReason = 'RS-24'

/**
 * The row of table T-233 for FR-065's handed-reference caution, raised on the
 * turn to off -- whenever the API was on, because no member of table T-107
 * reports whether a reference was handed on.
 */
const HANDED_REFERENCE_STANDS_REASON: NoticeReason = 'RS-20'

/**
 * The fallback row of table T-233 for an entrance with nothing to do (FR-029),
 * used only where no other row fits.
 */
const NOTHING_TO_DO_REASON: NoticeReason = 'RS-27'

/**
 * Which row of table T-233 each situation the translator measures is (FR-029).
 *
 * The seam carries a situation, not a row id, so table T-233's join stays in
 * this file (rule 03 section 1). `RS-27` is never a value here: each situation
 * has its own row.
 */
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
  // HF-15 of table T-051.
  noSiblingAboveToNestUnder: 'RS-36',
  rowIsAtTheShallowestLevel: 'RS-37',
  groupDepthLimitReached: 'RS-38',
  noPlaceLeftInThatDirection: 'RS-39',
  // FR-019's refusal: a press on the schedule with AR-5 / AR-6 armed, not a
  // pressed entrance (table T-233 is keyed on the situation).
  noRowToPutTheAnnotationOn: 'RS-44',
  // HF-14's refusal; not `RS-38`, which is HF-15's move.
  rowIsAtTheDeepestLevel: 'RS-46',
  // FR-001's refusal, also a press on the schedule.
  barShapeReleasedWithoutADrag: 'RS-53',
}

/**
 * The row FR-066's dialogue field is told with. Told from this file: whether
 * the `Agent API` is on is this layer's value and not in `InputContext`.
 */
const DIALOGUE_FIELD_UNAVAILABLE_REASON: NoticeReason = 'RS-35'

/**
 * The row of table T-220 FR-088 refuses on; `ScheduleViolation.row` carries it.
 * Only this row stops an open: `scheduleViolations` refuses nothing itself, and
 * no other of its rows has a row of table T-233 to be told on.
 */
const NO_WORKING_WEEKDAY_INVARIANT = 'IV-17'

/**
 * FR-088's gate for one document: the row to refuse it on, or `null`.
 *
 * Here so that BO-2 (for BT-1) and the open road ask one question (rule 03
 * section 1). ⚠️ BT-1 needs it: `schedule.ts` throws on a calendar with no
 * working weekday, so such a document must be refused before it is current.
 *
 * @purity pure
 */
export function noWorkingWeekdayReason(document: Document): StartupNoticeReason | null {
  const violated = scheduleViolations(document.schedule, document.documentSettings).some(
    (one) => one.row === NO_WORKING_WEEKDAY_INVARIANT,
  )
  return violated ? NO_WORKING_WEEKDAY_REASON : null
}

/**
 * U-56 `Open Chooser` of table T-103 -- the surface of OP-3's three-way
 * question. `ScreenState.surface` (S-99g), `icon-roster.json` and
 * `readScreenPartAt` must agree on the spelling. Not U-55, which holds only
 * NT-7's two answers.
 */
const OPEN_CHOOSER_SURFACE = 'Open Chooser'

/**
 * The three entries table T-109 places on U-56, each bound to its `OpenChoice`
 * (PI-10). Joined by row id, since table T-109 has no English column.
 */
const OPEN_CHOICE_OF_ENTRY: Readonly<Record<IconId, OpenChoice>> = {
  'IC-71': 'replace',
  'IC-72': 'merge',
  'IC-73': 'baseline',
}

/**
 * U-61 `Difference Review` of table T-103 -- the merge's question (FR-022).
 * Spelled for `ScreenState.surface`, `icon-roster.json` and `open-modals.ts`.
 * It has no entrance of its own and is raised from the open road only.
 */
const DIFFERENCE_REVIEW_SURFACE = 'Difference Review'

/**
 * U-62 `Import Report` of table T-103 (FR-023), spelled as for the surfaces
 * above. No entrance opens it; it rises from the open road when rows were
 * dropped.
 */
const IMPORT_REPORT_SURFACE = 'Import Report'

/**
 * What `taskUidsWithAnUnusableDate` would answer for a verdict that refused
 * nothing -- shared so that an accepted input mints no set at all.
 */
const NO_DROPPED_SEEDS: ReadonlySet<number> = new Set<number>()

/**
 * The three entries table T-109 places on U-61, each bound to its row of table
 * T-032a, joined by row id as `OPEN_CHOICE_OF_ENTRY` is. `MM-3` is absent on
 * purpose (FR-022); it stays reachable through the `Agent API` (MG-9, AM-8).
 */
const MERGE_MAPPING_OF_ENTRY: Readonly<Record<IconId, MergeMapping>> = {
  'IC-95': { kind: 'allSame' },
  'IC-96': { kind: 'allDifferent' },
  'IC-97': { kind: 'cancelImport' },
}

/**
 * OP-2 of table T-024a -- the route this loop takes.
 *
 * STOP -- the drop route has no trigger: the store watches drops itself
 * (PI-28), but table T-078 names no happening for a dropped file and NFR-010
 * forbids this file adding one. ⚠️ The store holds dropped files nothing asks
 * for.
 */
const OPEN_ROUTE_FROM_CHOOSER: OpenRoute = 'chooser'

/** OP-13 of table T-024a -- SK-21 reads the file already open. */
const OPEN_ROUTE_REOPEN: OpenRoute = 'reopen'

/**
 * OP-13 of table T-024a: a re-read is settled as a replacement without opening
 * U-56, so this stands in `askHowToOpen`'s place on that road.
 */
const OPEN_CHOICE_OF_REOPEN: OpenChoice = 'replace'

/**
 * What SK-11 of table T-036 writes, whatever the document was opened from. A
 * constant of the save path: reading the form off the opened file is what
 * FR-096 forbids.
 */
const SAVE_FORM: SaveFileForm = 'grsJson'

/**
 * The row of table T-024 each written form stands at, so the extension is
 * looked up rather than typed.
 * ⚠️ `document-codec.ts` has a similar private map for decoding (OP-12); it
 * cannot be asked from here (LR-2).
 */
const TABLE_ROW_OF_SAVE_FORM: Readonly<Record<SaveFileForm, string>> = {
  mspdi: 'IO-1',
  grsJson: 'IO-2',
  svg: 'IO-3',
  png: 'IO-4',
  singleHtml: 'IO-7',
}

/**
 * The extension table T-024 gives one form, read from the generated roster
 * (FR-096; `npm run gen:check` catches drift). Empty when the roster lacks the
 * row; nothing is invented.
 *
 * @purity pure
 */
function extensionOfForm(form: SaveFileForm): string {
  const row = TABLE_ROW_OF_SAVE_FORM[form]
  return exchangeFormats.formats.find((one) => one.rowId === row)?.extension ?? ''
}

/**
 * Which written form one row of table T-024 is, or `null` where the row is not
 * a file (IO-6, the clipboard). The census read backwards, not a second list
 * (R4).
 *
 * @purity pure
 */
function saveFormOfExportFormat(format: ExportFormatId): SaveFileForm | null {
  for (const form of Object.keys(TABLE_ROW_OF_SAVE_FORM) as readonly SaveFileForm[]) {
    if (TABLE_ROW_OF_SAVE_FORM[form] === format) return form
  }
  return null
}

/**
 * The prefix every key this page keeps in `localStorage` stands under; LM-6's
 * store is shared by every local page on the machine.
 *
 * ⛔ The spelling is not the specification's
 * (previous-project-result/09-architecture/architecture-entry-ja.md section 3).
 *
 * @provisional PND-110
 */
const WEB_STORAGE_KEY_PREFIX = 'grsched.'

/**
 * The keys of LM-14's `localStorage` rows. The spellings after the prefix are
 * this file's; the specification names only the rows. S-99e / S-99f / S-99g
 * are `ScreenState`'s (PI-36), not keys.
 */
const BROWSER_STORED_KEY: Readonly<Record<BrowserStoredRow, string>> = {
  'S-99': `${WEB_STORAGE_KEY_PREFIX}language`,
  'S-99a': `${WEB_STORAGE_KEY_PREFIX}openedBy`,
  'S-99b': `${WEB_STORAGE_KEY_PREFIX}agentApiEnabled`,
  'S-99c': `${WEB_STORAGE_KEY_PREFIX}unlockPasswordSha256`,
}

/**
 * LM-14's `localStorage` rows of table T-206.
 *
 * STOP -- not every row has a producer in this build. S-99c (the unlock
 * password digest) is never written: nothing asks a person for it. S-99a is
 * read (`watermarkOpenedBy`) but not written; its producer is FR-086's, so
 * every reader is drawn under the default name until it lands. S-99b is read
 * (`startupAgentApiEnabled`) and written (`setAgentApiEnabled`).
 */
type BrowserStoredRow = 'S-99' | 'S-99a' | 'S-99b' | 'S-99c'

/** The two `DisplayLanguage` spellings FR-038 admits, as a census. */
const DISPLAY_LANGUAGES: Readonly<Record<DisplayLanguage, true>> = { ja: true, en: true }

/**
 * OP-6 of table T-024a's defaults: every presentation-group key at its
 * manuscript value, re-nested from `SETTINGS_DEFAULTS`' dotted keys.
 *
 * ⚠️ The cast joins two outputs of one generator run; a key in one and not the
 * other is generator drift, which `npm run gen:check` reports.
 *
 * @purity pure
 */
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

/** Built once; OP-6 asks the same of every import. */
const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = defaultDocumentSettings()

/**
 * FR-096: the name the chooser is offered -- the document name (AT-3, read off
 * the document, not the file) plus the chosen form's extension.
 *
 * `null` and an empty title both give the extension alone, so a name never
 * starts with a dot. A suggestion only (`ChosenFileWrite.suggestedFileName`).
 *
 * @purity pure
 */
function suggestedFileNameOf(project: Project, form: SaveFileForm): string {
  return `${project.title ?? ''}${extensionOfForm(form)}`
}

/**
 * FR-096: the document written in the chosen form's convention, or `null`
 * where the form cannot be made from the document alone.
 *
 * ⛔ The MSPDI writer's notices (EX-3, EX-6 of table T-033) are dropped: table
 * T-233 has no row for them, and nothing here may compose the sentence. A row
 * is owed.
 * `png`, `svg` and `singleHtml` need bytes, the frame, or the application's own
 * HTML (IF-8); `exportPictureContent` writes them.
 *
 * @purity pure
 */
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

/**
 * One decoded intake: the document, and how many settings keys the read road
 * clamped (`RS-51`). The count is carried because a re-measure after the clamp
 * answers zero.
 */
interface DecodedIntake {
  readonly document: Document
  readonly clampedCount: number
  /**
   * FR-073: the columns this build could not read (newer format version).
   * Carried because the returned `Document` has lost the unknown keys. Empty
   * for any known version.
   */
  readonly unreadColumns: readonly string[]
}

/**
 * OP-12's answer turned into a document, or `null` where the decoder refused.
 * UT-5 of table T-063 keeps one codec per format; `current` supplies what MSPDI
 * does not carry (see `documentFromMspdi`).
 *
 * STOP -- codec faults (`JsonFault`, `MspdiFault`) and the MSPDI notices (EX-3,
 * EX-6) are dropped: table T-233 holds no row for them (FR-076).
 * `formatVersion` is not carried out: `unreadColumns` is empty for every
 * reading but `newerThanKnown`, so the list is already what this road acts on.
 *
 * @purity pure
 */
function decodedDocument(
  format: ExchangeFormat,
  text: string,
  current: Document,
): DecodedIntake | null {
  if (format === 'grsJson') {
    // Without this argument OP-7 answers `notCompared` (FR-073).
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
  // Zero clamps and no unread columns on the MSPDI road: that codec builds the
  // presentation group from the current document, and MSPDI has no
  // `schemaVersion` for `newerThanKnown` to arise from.
  return read.ok ? { document: read.document, clampedCount: 0, unreadColumns: [] } : null
}

/**
 * Where the `Command Palette` floats -- `ScreenSession.commandPaletteAt`.
 *
 * Not remembered: no row of table T-203 or T-206 keeps it, so it is a current
 * value lost with the page. `null` falls to the `Row Area`'s corner (no row
 * states a starting corner; U-50 is a rectangle the spec holds), resolved every
 * frame so that an undragged palette follows a resize.
 * Not clamped to the window: no row states a bound (GR-19 answers the harm with
 * the band's priority instead). Searched: FR-053, table T-023a, table T-023d,
 * table T-203, table T-206 and `_assets/tbl-settings.md`.
 *
 * @purity pure
 */
function paletteCornerOf(
  draggedTo: { readonly x: number; readonly y: number } | null,
  regions: ScreenRegions,
): { readonly x: number; readonly y: number } {
  return draggedTo ?? { x: regions.rowArea.x, y: regions.rowArea.y }
}

/**
 * Which of FR-072's two the properties panel shows, and about what. Derived
 * from `ScreenSession` rather than declared again (R4, LR-2).
 */
type PropertiesShowing = ScreenSession['propertiesShowing']
type PropertiesSubject = NonNullable<ScreenSession['propertiesSubject']>

/**
 * One pair U-61 lays out (FR-022), and table T-032a's answers as PI-10 takes
 * them. Derived, not declared again, as `PropertiesShowing` is.
 */
type MergeCandidateLine = NonNullable<ScreenSession['mergeCandidates']>[number]
type MergeChoices = NonNullable<Parameters<typeof importDocument>[0]['merge']>
type MergeMapping = NonNullable<MergeChoices['mapping']>

/**
 * What this loop holds for the reading session, as `sessionOf` is handed it --
 * one named argument rather than many positional ones (rule 03 section 4).
 */
interface SessionHeld {
  /** S-99. */
  readonly language: DisplayLanguage
  /**
   * FR-101 -- the file the document is open from, and when it was last
   * written to. Both `null` until a write has happened through this page.
   */
  readonly openedFileName: string | null
  readonly fileSavedAt: string | null
  /** FR-065. */
  readonly isAgentApiEnabled: boolean
  /** FR-066 / S-99i of table T-206 -- IC-18's own switch, apart from the one above. */
  readonly isDialogueFieldVisible: boolean
  /**
   * FR-068 -- whether the `AI Export Modal` (U-30) is standing. ⛔ A gate:
   * writing the document every frame would run `jsonFromDocument` over the
   * whole schedule for a surface that is almost always closed.
   */
  readonly isAiExportSurfaceOpen: boolean
  /** U-42 `Pointer`, or `null` while it is outside the window. */
  readonly pointer: { readonly x: number; readonly y: number } | null
  /** FT-4 of table T-078, for EZ-2's wait. */
  readonly pointerRestedMs: number
  /** EZ-2's other half -- what IF-9 answered for that point. */
  readonly iconUnderPointer: IconId | null
  /**
   * EZ-6's other half -- the Task table T-023d claims that point for, or
   * `null` for a point it claims for anything else.
   */
  readonly taskUnderPointer: Task | null
  /**
   * IN-3 of table T-028 -- whether the reader has put the standing explanation
   * away through IN-4's last rung. See `ScreenSession.isTooltipDismissed`.
   */
  readonly isTooltipDismissed: boolean
  /** FR-053 -- where GR-19's drag left the palette, `null` while nobody has. */
  readonly commandPaletteDraggedTo: { readonly x: number; readonly y: number } | null
  /**
   * HF-15 of table T-051 -- the row GR-20's strip is held by and the depth the
   * picture draws it at, or `null` while no row is held.
   */
  readonly rowGrabbedAt: {
    readonly groupId: string
    readonly depth: number
    readonly axis: 'position' | 'depth'
    readonly resistedPx: number
    readonly atY: number | null
  } | null
  /** S-211 of table T-206 -- whether level 0 is folded (HR-2 of table T-015); not saved. */
  readonly isLevelZeroFolded: boolean
  /** S-142 of table T-206 -- whether FR-053's milestone glyph list is open. */
  readonly isMilestoneListOpen: boolean
  /** S-200 of table T-206 -- whether FR-053's palette stands minimised. */
  readonly isPaletteMinimised: boolean
  /** S-206 of table T-206 -- whether FR-102's record is running. */
  readonly isRecordingInteractions: boolean
  /**
   * Table T-029a -- which of `dualCursor`'s two dates (S-65) follows the
   * pointer, or `null` while the mode is not up. See `ScreenSession`.
   */
  readonly dualCursorFollowing: DualCursorSide | null
  /** FR-085 (MUST) -- the rows chosen in the `Row Title Panel`, by AT-51. */
  readonly selectedGroupIds: readonly string[]
  /** FR-099 (MUST) -- who is chosen in the `Resource Roster`, by AT-85. */
  readonly selectedResourceUids: readonly number[]
  /** FR-072 -- which of the two the last operation chose. */
  readonly propertiesShowing: PropertiesShowing
  /** FR-072 (MUST) -- what it was chosen about. */
  readonly propertiesSubject: PropertiesSubject | null
  /** NT-7 of table T-037 -- the question standing, or none. */
  readonly confirmation: RaisedConfirmation | null
  /**
   * FR-022 (MUST) -- the tasks U-61 lays out while the merge's question stands.
   * Empty on every frame that is not one of those.
   */
  readonly mergeCandidates: readonly MergeCandidateLine[]
  /**
   * FR-073 (MUST) -- the columns the intake U-61 is asking about could not be
   * read. Empty on every frame that is not one of those.
   */
  readonly unreadColumns: readonly string[]
  /**
   * FR-023 (MUST) -- the names of the `Task` rows the last import dropped, laid
   * out on U-62 `Import Report`. Empty on every frame that surface is not up.
   */
  readonly droppedTaskNames: readonly (string | null)[]
  /** FR-076 (MUST) -- what has been raised to tell. */
  readonly notices: readonly RaisedNotice[]
  /**
   * FR-031's two questions (`ScreenSession.canUndo` / `canRedo`): whether the
   * history holds a step back and one forward (RD-1 / RD-2 of table T-230).
   *
   * ⚠️ Optional; absent means not known, and the entrance stays usable. It is
   * not "nothing to undo": a false faint tells the reader an entrance is broken.
   */
  readonly canUndo?: boolean
  readonly canRedo?: boolean
}

/**
 * What the shell answers about this reading session (`ScreenSession`, PI-37).
 *
 * Every member is a current value or a measurement this layer holds (LY-5 of
 * table T-060) and is handed in; only the palette's corner is decided here,
 * because its default is a rectangle of this frame.
 * ⚠️ NT-2's deadline is not yet counted (see `raisedNotices`).
 *
 * @purity pure
 */
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
    // FR-101: both `null` until a write happens through this page; opening a
    // file answers neither.
    openedFileName,
    fileSavedAt,
    // FR-065: remembered per origin in S-99b (`startupAgentApiEnabled` /
    // `setAgentApiEnabled`); nothing resets it on a new document.
    isAgentApiEnabled,
    // FR-066 / S-99i: IC-18's own switch. Not remembered: S-99i is not one of
    // LM-14's `localStorage` rows. Left as is while PND-419 is open, since
    // borrowing S-99b's scope would decide it here.
    isDialogueFieldVisible,
    // FR-068: the whole `Document` as IO-2's `GRS JSON`, only while the surface
    // stands. Spread, not set to `undefined`: `exactOptionalPropertyTypes`
    // tells them apart, and absence means nobody is reading it
    // (`openModalFromScreenState`).
    ...(isAiExportSurfaceOpen ? { aiExportDocument: jsonFromDocument(held) } : {}),
    pointer,
    // EZ-2 of table T-040: both halves measured by the loop. The place is
    // IF-9's own answer (`readScreenPartAt`; Chapter 5.3 under table T-065,
    // PND-141), IC-53 included -- see `ScreenPart.entry`.
    pointerRestedMs,
    iconUnderPointer,
    // EZ-6 of table T-040: the place half is what `itemAtPointer` (PI-7)
    // answered for this point, handed on rather than hit-tested again (R7.4).
    taskUnderPointer,
    // IN-3 of table T-028: only the loop sees whether an explanation stands.
    isTooltipDismissed,
    // FR-053: see `paletteCornerOf`.
    commandPaletteAt: paletteCornerOf(commandPaletteDraggedTo, regions),
    // HF-15 of table T-051.
    rowGrabbedAt,
    // S-211 of table T-206: not saved, so held by the loop.
    isLevelZeroFolded,
    // FR-041: S-72 (light/dark) and S-73 (hue) must cross to the side that
    // paints; without them chrome falls back to system colours, which follow
    // the operating system.
    themePreference: held.documentSettings.themePreference,
    themeHue: held.schedule.project.themeHue,
    // S-142 of table T-206: not kept by the document, so held by the loop.
    isMilestoneListOpen,
    // S-200: not S-99e, which says whether the palette is shown at all.
    isPaletteMinimised,
    // S-206: FR-102 keeps the record out of the document.
    isRecordingInteractions,
    // Table T-029a: a current value of one reading, so held by the loop. Not a
    // `documentSettings` key: FR-021 round-trips those, and DC-8 keeps the
    // following side out of an export.
    dualCursorFollowing,
    // FR-085 / FR-099: chosen rows and resources are not `Selection` (SL-1 of
    // table T-023c admits neither); `carryOutAction` moves them.
    // @provisional PND-142
    selectedGroupIds,
    // @provisional PND-143
    selectedResourceUids,
    // FR-072: the subject, not the drawn fields -- a second IC-17 press returns
    // to the last chosen thing, and kept fields would show values an edit has
    // made untrue.
    // @provisional PND-144
    propertiesShowing,
    // @provisional PND-144
    propertiesSubject,
    // FR-076: rows of table T-233 only, no words.
    notices,
    mergeCandidates,
    // FR-073: the columns themselves, never a count.
    unreadColumns,
    // FR-023: the names themselves; that requirement refuses a bare tally.
    droppedTaskNames,
    // FR-032: the question standing in front of a delete, or none.
    confirmation,
    // SC-1: row titles use this frame's `RowPlacement` (ADR-001), clipped to the
    // `Row Area` with emptied rows dropped, as `svg-renderer.ts` cuts its bands;
    // unclipped titles paint above the Time Ruler once S-78 slides the stack.
    // Only the vertical pair is clipped: `x` and `width` stay the panel's own.
    rowBoxes: drawnRowBoxesOf(layout, regions),
    // GR-21 of table T-023d: the grip's length and start come from this frame's
    // layout (ADR-001); UF-61 divides.
    // ⚠️ `visibleHeight` is the scrolling remainder's, not the `Row Area`'s:
    // `contentHeight` excludes rows pinned into FR-098's band, so the `Row Area`
    // height would grow the grip as rows were pinned. `scrollAreaY` is undefined
    // until a pin exists and then reads as the `Row Area`'s top.
    // The offsets are taken here because `rows` and `placements` reach UF-61
    // already slid while the extents are measured before the slide; pinned rows
    // do not slide and are passed over (FR-098).
    scrollExtent: {
      contentWidth: layout.contentWidth,
      contentHeight: layout.contentHeight,
      visibleHeight: Math.max(
        0,
        regions.rowArea.y + regions.rowArea.height - (layout.scrollAreaY ?? regions.rowArea.y),
      ),
      offsetX: Math.max(0, regions.rowArea.x - (layout.contentX0 ?? regions.rowArea.x)),
      offsetY: scrolledPastOf(layout, regions),
    },
    // FR-029 with RD-1 / RD-2 of table T-230: carried as handed in. Spread, not
    // assigned: under `exactOptionalPropertyTypes` an unknown answer must be an
    // absent key (the export path, EP-12, hands neither).
    ...(canUndo === undefined ? {} : { canUndo }),
    ...(canRedo === undefined ? {} : { canRedo }),
  }
}

/**
 * The rows this frame draws, each with the band the `Row Title Panel` gives it.
 *
 * The one place the cut is made: the renderer gets it as `ScreenSession.rowBoxes`
 * and `collectInputContext` as `InputContext.drawnRowGroupIds`, so both sides of
 * FR-029 count one picture. A second cut on the press side would drift from this one.
 *
 * Clipped to the `Row Area`, and a row the clip empties is dropped, because
 * `svg-renderer.ts` cuts its bands the same way (SC-1). Taking `row.y` and
 * `row.height` whole painted titles above the Row Area once S-78 slid the stack.
 * Only the vertical pair is clipped; `x` and `width` stay the panel's own (SC-1).
 *
 * @purity pure
 */
function drawnRowBoxesOf(
  layout: ScheduleLayout,
  regions: ScreenRegions,
): readonly { readonly groupId: string; readonly box: ScreenRect }[] {
  // A flowing row is cut at the scrolling remainder's top, a banded one at the
  // `Row Area`'s (FR-098); `svg-renderer.ts` uses the same two ceilings.
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

/**
 * How far down the scrolling rows have been carried, for GR-21's start.
 *
 * Read back off the layout rather than laid out again (ADR-001): before the
 * slide the first flowing row starts at the remainder's top edge (LF-14 of
 * table T-221), so that edge less its drawn `y` is the distance.
 *
 * The first row that flows, never the first row: a pinned row stays put
 * (FR-098), so reading its `y` would answer zero for every scrolled document
 * with a pin. Clamped at zero because `scrollOffsetOf` answers 0 for an
 * anchor naming no placed row.
 *
 * @purity pure
 */
function scrolledPastOf(layout: ScheduleLayout, regions: ScreenRegions): number {
  const scrollTop = layout.scrollAreaY ?? regions.rowArea.y
  const first = layout.rows.find((row) => row.isPinned !== true)
  return first === undefined ? 0 : Math.max(0, scrollTop - first.y)
}

/**
 * What one reading of OP-10 answered: the settings the picture is drawn from,
 * and whether that picture stands at the document's own zoom.
 *
 * The second member exists because only this side can answer it, and a zoom
 * press in `input-command-translator.ts` must step from the zoom on screen:
 * OP-10's stored-place and BT-4 branches draw `S-75`/`S-76`, the fit does not.
 * It travels as `InputContext.isPictureAtStoredZoom` so the condition is not
 * written twice; a press-side copy missed the BT-4 branch and stepped from the fit.
 */
interface ViewSettings {
  readonly settings: DocumentSettings
  readonly isAtStoredZoom: boolean
}

/**
 * OP-10 of table T-024a -- what to draw when the stored place is `null` or
 * points at a row that is gone.
 *
 * The document is not edited: OP-10 is a reading rule, so the stored settings
 * keep `null` and every frame decides again. A person's zoom press seats a
 * place on the writing side (`placeSeated` / `fitCommand` in
 * `input-command-translator.ts`), which is what ends the re-deciding.
 *
 * Both passes the rule after table T-068 allows run inside `fitZoom` (PI-5);
 * a third would let the level of detail oscillate without end.
 *
 * @purity pure
 */
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

  // The two values below are scaffolding, not the answer: `fitZoom` decides the
  // position, but S-77 pins the time axis and a layout cannot be measured until
  // it is pinned to some day. Which day does not matter, since the extent is a
  // difference of two edges. It cannot be null: `dateAtX` answers null without
  // an origin day, the fit would hand the null back, and OP-10 would ask again
  // forever.
  //
  // The first covered day counts `Task.start` and `Task.actualStart` and nothing
  // else (OP-10). `actualStart` is included because OC-5 of table T-038 draws an
  // actual that precedes the plan, which would otherwise sit behind the Row
  // Title panel out of reach.
  // ISO days sort as text, so nothing is parsed.
  const covered = held.schedule.tasks
    .flatMap((one) => [one.start, one.actualStart])
    .filter((one): one is string => one !== null)
    .sort()
  const firstRow = [...held.schedule.taskGroups].sort((a, b) => a.order - b.order)[0]
  // A document with nothing drawn falls back to `scrollDate`, then the run day
  // (FR-055); `Project.startDate` is not one of them. Still never null, for the
  // reason given above.
  const pinned: DocumentSettings = {
    ...stored,
    scrollDate: covered[0] ?? stored.scrollDate ?? runDay,
    scrollGroupId: firstRow === undefined ? stored.scrollGroupId : firstRow.id,
  }

  // OP-10's exception for the shipped template: `pinned` is already what that
  // row asks for, at the document's own zoom. Offsets are cleared for the
  // reason the fit clears them (see below).
  // Only while there is a day to cover: OP-10 of table T-024a withholds the
  // BT-4 exception from a document with no `Task`, which then falls to the fit.
  if (fromTemplate && covered.length > 0) {
    // OP-10 keeps the document's zoom on this branch, hence `true`.
    return {
      settings: { ...pinned, scrollDayOffset: 0, scrollGroupOffset: 0 },
      isAtStoredZoom: true,
    }
  }

  // `held.schedule`, not a copy with the collapses discarded: OP-10 forbids
  // HF-8 here. The press path does discard them, in `fitCommand`.
  const fitted = fitZoom(
    held.schedule,
    pinned,
    regions,
    {
      step: NOT_STORED_ZOOM_STEP['S-96'],
      min: NOT_STORED_ZOOM_BOUNDS['S-97'],
      max: NOT_STORED_ZOOM_BOUNDS['S-98'],
    },
    // The fit must measure with LF-3's row-control floor, or it seats a depth
    // that no longer fits once the floor is applied.
    rowControlsHeightPx,
  )
  return {
    settings: {
      ...pinned,
      zoomX: fitted.zoomX,
      zoomY: fitted.zoomY,
      scrollDate: fitted.scrollDate,
      scrollGroupId: fitted.scrollGroupId,
      // Cleared with their anchors, as `fitCommand` does: the fit puts the
      // content's corner on the Row Area's corner, and a leftover fraction from
      // an earlier pan would shift FR-055's answer by up to a row and a day.
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    },
    // The one branch that does not draw `S-75`/`S-76`; a press stepped from the
    // stored pair would jump to a zoom nobody has seen.
    isAtStoredZoom: false,
  }
}

/**
 * Whether this happening left no gesture in flight.
 *
 * Release (IN-1) and lost pointer (IN-1a) end one; a `move` keeps the press
 * (CS-2 of table T-066).
 *
 * @purity pure
 */
function hasEndedGesture(input: HumanInput): boolean {
  return input.kind === 'pointer' && (input.phase === 'up' || input.phase === 'lost')
}

/**
 * IN-4 of table T-028 -- which level this `Esc` consumes, or null for a
 * happening that is not one and for one with nothing left to consume (IN-4a).
 *
 * Asked against the state the three members were handed, never what they
 * returned: `screenStateFromInput` consumes its own two levels, so asking its
 * result would take two levels for one press. The caller reads this before
 * that member runs, because the level may be one the caller consumes itself.
 * The remaining levels are current values the Framework holds (LY-5 of table
 * T-060), which is why the seam takes an `EscapeContext`. The confirmation and
 * the panel are passed in because `InputContext` (PI-18) does not carry them.
 *
 * @purity pure
 */
function escapeLevelOf(
  input: HumanInput,
  context: InputContext,
  isConfirmationStanding: boolean,
  isPropertiesPanelOpen: boolean,
  isTooltipStanding: boolean,
): EscapeTarget | null {
  if (input.kind !== 'key' || input.key !== ESCAPE_KEY) return null
  return escapeTarget(context.screenState, {
    // Read off the context, not `raisedNotices`: `collectInputContext` already
    // settled it for SK-19, and both rows get one reading (R7.4).
    isNoticeStanding: context.isNoticeStanding === true,
    // The same value IN-5a reads off this context.
    isTextEntryUnsettled: context.isTextEntryUnsettled,
    gestureInFlight: context.pressed !== null,
    dualCursorMode: context.dualCursorFollowing !== null,
    isConfirmationStanding,
    isPropertiesPanelOpen,
    // Only this side knows it: `ScreenView.tooltips` is built per frame (UF-69)
    // and held here (LY-5 of table T-060). Reporting is not spending -- the
    // caller raises the dismissal the next frame reads.
    isTooltipStanding,
  })
}

/**
 * Whether two answers of `readScreenPartAt` name the same place.
 *
 * Compared by value: IF-9 builds a fresh object per read, so two reads over
 * one unmoved pointer are different objects.
 *
 * @purity pure
 */
function isSameScreenPart(a: ScreenPart | null, b: ScreenPart | null): boolean {
  if (a === null || b === null) return a === b
  return a.part === b.part && a.entry === b.entry
}

/**
 * Whether two answers of `itemAtPointer` name the same grab on the same thing.
 *
 * Compared by value, as in `isSameScreenPart` (PI-7 builds fresh answers too).
 * The item is compared as well as the row: table T-023d's rows repeat on every
 * drawn `Task`, so crossing from one bar's end to the next keeps the row but
 * changes what FR-048's hover picture is drawn on.
 *
 * @purity pure
 */
function isSameGrab(a: Grabbed | null, b: Grabbed | null): boolean {
  if (a === null || b === null) return a === b
  return a.grab === b.grab && isSameGrabbedItem(a.item, b.item)
}

/**
 * Whether two targets of table T-023c's SL-1 are the same one.
 *
 * Exhaustive with no default arm, so a target added to that table is a compile
 * error here; a default would make a new kind compare equal to its own kind.
 *
 * @purity pure
 */
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
    // The kind is the identity: a document has one `statusDate` (FR-046).
    case 'statusLine':
      return b.kind === 'statusLine'
  }
}

/**
 * Whether a press of each row of table T-023a changes the document as it runs.
 *
 * The `false` rows are the gestures table T-027 keeps out of the undo history
 * (UN-8, UN-9), which AG-9 therefore spares.
 *
 * `Record<PressRow, boolean>` makes a row added to table T-023a a compile error
 * here; a `string` key would let a new row default silently.
 */
const PRESS_CHANGES_DOCUMENT: Readonly<Record<PressRow, boolean>> = {
  // UN-8
  'PTD-1': false,
  'PTD-2': true,
  'PTD-3': true,
  'PTD-4': true,
  'PTD-4a': true,
  // UN-9
  'PTD-5': false,
}

/**
 * Whether a press in flight is one AG-9 of table T-035 refuses a write during.
 *
 * `on` is asked before the row: table T-023a's decision order is bound to the
 * drawing area, and `commandFromInput` branches to `commandFromEntry` before it
 * reads the row, so a press on a drawn entry can change the document whatever
 * its row. Such a press lands on PTD-5 for want of a hit, so reading the row
 * first would take AG-9 off every palette press.
 *
 * The zoom entrances IC-12 .. IC-15 are spared: their only write is the zoom, which is
 * outside the history (UN-8 of table T-027), and AG-9 matches that table.
 * Without this, FR-018's repeat is refused at WS-2 of table T-067 on every tick
 * while the button is held. `REPEATING_ENTRIES` is FR-018's roster, and the
 * same four are the ones UN-8 exempts.
 *
 * @purity pure
 */
function isDocumentChangingPress(press: PointerPress | null): boolean {
  if (press === null) return false
  if (press.on !== null) {
    // GR-21's grip is spared: its drag writes only the display position
    // (`commandFromScrollbar` plans one `setScrollPosition`), which is UN-8's
    // scroll, and AG-9 matches table T-027. Without this WS-2 refuses every
    // `scrollbarFollow` write and the picture jumps only on release.
    // The `Panel Divider` is not spared: FR-052 forbids its drag to write at all
    // while held, so there is nothing to spare.
    // Table T-023d's no-write-while-held rule is not broken: for GR-21 the
    // followed picture is the display position, which FR-051 requires S-77 and
    // S-78 to track. PTD-1's `panFollow` rests on the same reading.
    if (press.on.scrollbarAxis !== undefined) return false
    const entry = press.on.entry
    return entry === null || !REPEATING_ENTRIES.includes(entry)
  }
  return PRESS_CHANGES_DOCUMENT[press.pressRow]
}

/**
 * Which entry of table T-109 this happening settled on, or null for one that
 * settled on none.
 *
 * On release, from the press (IN-1, CS-2 of table T-066) -- the same pair
 * `commandFromEntry` is asked with. Read off the context's press, not the
 * loop's: the loop drops its press before the action is carried out.
 *
 * @purity pure
 */
function entrySettledOnRelease(input: HumanInput, context: InputContext): IconId | null {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const press = context.pressed
  if (press === null || press.on === null) return null
  return press.on.entry
}

/**
 * Which of NT-7's two answers this happening settled on, or null for one that
 * settled on neither.
 *
 * Read as `entrySettledOnRelease` reads its member. `undefined` and `null` are
 * one answer: `ScreenPart` declares the member optional and fixes absent as
 * "on neither answer".
 *
 * @purity pure
 */
function answerSettledOnRelease(input: HumanInput, context: InputContext): string | null {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const press = context.pressed
  if (press === null || press.on === null) return null
  return press.on.confirmationAnswer ?? null
}

/**
 * Which part of the screen this happening settled on, or null for one that
 * settled on none.
 *
 * Needed for IC-52, which table T-109 stands on several surfaces: what the
 * press closes is the surface it was drawn on, and the entry alone cannot say
 * which. Read as `entrySettledOnRelease` reads its member.
 *
 * @purity pure
 */
function surfaceSettledOnRelease(input: HumanInput, context: InputContext): string | null {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const press = context.pressed
  if (press === null || press.on === null) return null
  return press.on.part
}

/**
 * Which row of table T-024 this happening settled on, or null for one that
 * settled on none.
 *
 * Not `entry`: on U-54 a person presses a row of table T-024 (FR-096), and
 * tables T-024 and T-109 number their rows independently. Read as
 * `entrySettledOnRelease` reads its member.
 *
 * @purity pure
 */
function formatSettledOnRelease(
  input: HumanInput,
  context: InputContext,
): ExportFormatId | null {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const press = context.pressed
  if (press === null || press.on === null) return null
  return press.on.format
}

/**
 * The rows CD-2 of table T-050 takes with one row -- it and everything below
 * it.
 *
 * A second reading of table T-050, kept because FR-032 must name what would go
 * before anything is written: `editTaskGroup` computes this set only after the
 * write, and `applyDocumentChange` (PI-8) has no way to ask without landing.
 * A PI-8 query that plans and answers what it would remove would retire this
 * duplication (R2.7).
 * `seen` stops a broken `parentId` (IV-5) from looping.
 *
 * @purity pure
 */
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

/**
 * The seeds and every WBS descendant of them -- what CD-1 of table T-050
 * reaches from each `Task`.
 *
 * The same second reading as `rowsLostWith`, for the same reason.
 *
 * @purity pure
 */
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

/**
 * The rules a refusal names when what it refused is an unusable date (FR-023):
 * IV-14 of table T-220, and S-119 / S-120 of table T-214.
 *
 * Nothing else is droppable: FR-023 excludes the resource ceilings, and every
 * other invariant of table T-220 refuses the whole input.
 */
const UNUSABLE_DATE_RULES: ReadonlySet<string> = new Set(['IV-14', 'S-119', 'S-120'])

/** Where `ImportRefusal.at` points when the column it names is on a `Task`. */
const TASK_REFUSAL_PREFIX = '/schedule/tasks/'

/**
 * Which `Task` of the arriving schedule a refusal is about, or `null` where it
 * is about something that is not one.
 *
 * The pointer is the only join: the validator puts row and column in `at` (see
 * `ImportVerdict`). A pointer with no column is not this function's to claim --
 * `sweepDateColumns` always writes `.../{index}/{column}`, so a row-only
 * pointer came from another rule.
 *
 * @purity pure
 */
function taskIndexOfRefusal(at: string): number | null {
  if (!at.startsWith(TASK_REFUSAL_PREFIX)) return null
  const rest = at.slice(TASK_REFUSAL_PREFIX.length)
  const cut = rest.indexOf('/')
  if (cut <= 0) return null
  const index = Number(rest.slice(0, cut))
  return Number.isInteger(index) && index >= 0 ? index : null
}

/**
 * The `Task` rows FR-023 drops out of an arriving document -- the ones whose
 * date columns the validator refused -- as the uids to delete.
 *
 * Seeds only: the cascade is CD-1 of table T-050's, to which FR-023 sends it,
 * so there is no second sweep here.
 *
 * @purity pure
 */
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
    // Unreachable while the verdict belongs to this very document; guarded anyway.
    if (task === undefined) continue
    seeds.add(task.uid)
  }
  return seeds
}

/**
 * The question FR-032 owes for one write, or null where it owes none.
 *
 * Only the two places FR-032 names (FR-031 forbids a third): a row deletion,
 * and a deletion of a `Task` with WBS descendants. A `Task` that leads nothing
 * is deleted straight through, with undo behind it.
 *
 * The question is a row of table T-234, not a string (FR-076); the words come
 * from FR-038's dictionary.
 *
 * Not settled by the specification: when one write deletes both a row and a
 * leading `Task`, table T-234, FR-032 and FR-031 do not say whether QN-1 or
 * QN-2 is shown. Chosen:
 * QN-1 whenever a row is going, since CD-2 seeds CD-1 with the row's tasks
 * (the wider scene), and QN-2 would suggest the row survives.
 *
 * @purity pure
 */
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
      // A missing row takes nothing, and CM-27 refuses the command itself.
      if (rows === null) continue
      for (const id of rows) lostRows.add(id)
      owed = true
      continue
    }
    if (command.kind !== 'deleteTask') continue
    // One direct child is enough to make it a leading `Task`.
    if (!schedule.tasks.some((one) => one.wbsParentUid === command.uid)) continue
    seeds.add(command.uid)
    owed = true
  }
  if (!owed) return null
  // CD-2 seeds CD-1 with every `Task` carried on any row that is going.
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
      // FR-032; HM-10 of table T-015a is how a WBS child ends up drawn on
      // another row. False when no row is going at all.
      isShownOnAnotherRow: drawnOn !== undefined && lostRows.size > 0 && !lostRows.has(drawnOn),
    })
  }
  // See the head note on a write that does both.
  const question: ConfirmationQuestion = lostRows.size > 0 ? 'QN-1' : 'QN-2'
  return { manner: CONFIRMATION_MANNER, question, items }
}

/**
 * The question FR-099 owes before the chosen assignees are deleted, or null
 * where it owes none.
 *
 * The scene is a released assignment, not the deletion (QN-3 of table T-234),
 * so a deletion that frees none goes straight through, as in
 * `confirmationOwedBy` (FR-031). The names are the tasks', never the
 * assignees' (CD-5 of table T-050).
 *
 * One item per task: two chosen assignees on one `Task` reach one task.
 * Order is the assignments' own (rule 03 section 4), and absent tasks and
 * `null` names are treated as in `unassignedTaskNamesOf` in `open-modals.ts`,
 * which builds FR-099's other list of the same tasks. An assignment with no
 * `taskUid` still owes the question and adds no name.
 * `isShownOnAnotherRow` is false throughout (see `ConfirmationItem`).
 * One pass and a `Map`, not a scan per task (NFR-013).
 *
 * @purity pure
 */
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

/**
 * Whether a string is one of the two languages FR-038 admits.
 *
 * A stored value is untrusted intake (FR-023): `localStorage` is shared by
 * every local page on the machine (LM-6).
 *
 * @purity pure
 */
function isDisplayLanguage(value: string): value is DisplayLanguage {
  return Object.prototype.hasOwnProperty.call(DISPLAY_LANGUAGES, value)
}

/**
 * DI-3 of table T-227, as `ChosenFileSaveRequest` asks for it: who owns the
 * characters already standing where a chosen write would land.
 *
 * The codec is wired by the caller because FileGateway (PI-22) must not parse
 * `GRS JSON` itself (UT-5 of table T-063, FR-024).
 *
 * `null` for every way of not knowing (DI-3). Decoding here is not intake:
 * nothing is opened and FR-023's validation does not apply. Only the two
 * columns DI-1 compares leave; the rest of somebody else's file is dropped.
 *
 * @purity pure
 */
function projectIdentityFromText(text: string): ProjectIdentity | null {
  // The version is passed although this is not a load (FR-073 does not apply),
  // so that no road calls `documentFromJson` without it: omitting it yields
  // `notCompared` silently.
  const read = documentFromJson(text, GREATEST_KNOWN_SCHEMA_VERSION)
  if (!read.ok) return null
  const project = read.document.schedule.project
  return { projectName: project.name, projectId: project.id }
}

// ---- the outside is read from here on (R7.7) ------------------------------

/**
 * Today, spelled as a date column is (`textOfDay`).
 *
 * Built from the local getters, never `toISOString` (FR-046): SK-20 writes this
 * into the zoneless `statusDate`, and UTC would move the line by the offset.
 * The `+ 1` is `getMonth` counting from zero.
 *
 * @purity semi-pure-b
 */
function readToday(): string {
  const now = new Date()
  const day: CalendarDay = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
  return textOfDay(day)
}

/**
 * The instant of one write, as FR-063 spells it: ISO 8601, UTC, to the second.
 *
 * The wall clock, because this is a moment, not an elapsed time (R3.6).
 * Milliseconds are cut from `toISOString` rather than the text being assembled
 * by hand, so the spelling cannot drift from the document model's.
 *
 * FR-020's stamp reads this too, since it asks for the same spelling; a second
 * speller would be a second answer for one moment. MSPDI dates are not this
 * (FR-020).
 *
 * @purity semi-pure-b
 */
function readInstantOfWrite(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z')
}

/**
 * The monotonic clock, in ms, for the one elapsed time FT-4 of table T-078 has
 * this build measure -- the rest EZ-2 of table T-040 waits out.
 *
 * Not the wall clock (R3.6): a wall clock steps backwards over an NTP or DST
 * change. The value has no fixed origin, so only a difference of two readings
 * may be used.
 *
 * @purity semi-pure-b
 */
function readMonotonicMs(): number {
  return performance.now()
}

/**
 * The two lengths FR-018 measures a held entrance with.
 */
interface RepeatTimes {
  /** S-172 -- the wait a press serves before it begins to repeat. */
  readonly delayMs: number
  /** S-173 -- the gap between one repeat and the next. */
  readonly intervalMs: number
}

/**
 * What table T-206 states for the two, under the names FR-018 uses them by.
 *
 * The row ids become names here only, so no call site has to remember which
 * row is the wait. The figures come from the generated constant (rule 03
 * section 1). That the wait is the longer is a property of table T-206's rows
 * (FR-018) and is not guarded here.
 *
 * @purity pure
 */
function repeatTimesOfHeldEntry(): RepeatTimes {
  return {
    delayMs: NOT_STORED_REPEAT_TIMES['S-172'],
    intervalMs: NOT_STORED_REPEAT_TIMES['S-173'],
  }
}

/**
 * One row of table T-206's `localStorage` set, as the store has it, or null
 * where it has none and where the store cannot be reached at all.
 *
 * Every read survives a refusing store (LM-14, FR-038's fallback). A host
 * refuses by throwing on the property itself, so the access is inside the
 * guard, not only the call. Null covers both "nothing stored" and "no store",
 * which FR-038 treats alike.
 *
 * @purity semi-pure-b
 */
function readBrowserStored(row: BrowserStoredRow): string | null {
  try {
    return globalThis.localStorage?.getItem(BROWSER_STORED_KEY[row]) ?? null
  } catch {
    return null
  }
}

/**
 * Put one row of that set back, or let it go where the store refuses.
 *
 * A refusal is a known environment (LM-14), not a fault, so nothing is told:
 * table T-233 has no reason for it, and FR-076 limits tellings to that table.
 *
 * @purity non-pure
 */
function writeBrowserStored(row: BrowserStoredRow, value: string): void {
  try {
    globalThis.localStorage?.setItem(BROWSER_STORED_KEY[row], value)
  } catch {
    // See above: the store refusing is one of LM-14's environments.
  }
}

/**
 * How many bits one hexadecimal digit spells, and the mask that takes them.
 *
 * What "hexadecimal" means, not a value of the specification; S-101 is
 * stated in it.
 */
const HEX_DIGIT_BITS = 4
const HEX_DIGIT_MASK = 0xf
/** The sixteen digits, in the case table T-207 prints S-101 in. */
const HEX_DIGITS = '0123456789abcdef'

/**
 * One byte as the two hexadecimal digits S-101 is spelled in.
 *
 * Not `toString(16).padStart(2, '0')`, whose base and width must be kept in
 * agreement. Lower case matches table T-207 exactly, and the comparison is
 * exact. The only caller walks a `Uint8Array`, so the `?? ''` fallbacks are
 * unreachable.
 *
 * @purity pure
 */
function hexOfByte(value: number): string {
  const high = HEX_DIGITS[(value >> HEX_DIGIT_BITS) & HEX_DIGIT_MASK] ?? ''
  const low = HEX_DIGITS[value & HEX_DIGIT_MASK] ?? ''
  return high + low
}

/**
 * The SHA-256 of what a person typed, spelled the way table T-207 spells S-101
 * -- or `null` where this environment offers no such digest.
 *
 * The environment's digest, not one written here (FR-020), reached only from
 * this layer because LR-6 keeps the browser out of the others. `crypto.subtle`
 * needs a secure context; Chromium treats a `file://` page (CN-1) as secure.
 *
 * `null` rather than a throw (FR-028): the caller tells the person why the
 * watermark cannot be hidden. Nothing is kept (FR-020).
 *
 * @purity semi-pure-b
 */
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

/**
 * The digest FR-020 matches an answer against -- the one the author set (S-99c
 * of table T-206) where there is one, and otherwise the default table T-207
 * states (S-101).
 *
 * The order is S-99c's. S-101 is generated (`WATERMARK_UNLOCK_DIGEST`) and
 * S-99c is read from the store (LM-14), so neither is typed here.
 * An empty stored string counts as unset; otherwise the empty password would
 * open the gate.
 *
 * @purity semi-pure-b
 */
function watermarkUnlockDigest(): string {
  const set = readBrowserStored('S-99c')
  return set === null || set === '' ? WATERMARK_UNLOCK_DIGEST['S-101'] : set
}

/**
 * FR-038's startup language: the stored choice (S-99) first, the host's
 * setting second.
 *
 * A stored value that is neither spelling counts as none (FR-023). A host set
 * to neither language gets `en`, the only other one FR-038 admits.
 *
 * Exported for `single-html-shell.ts`, which runs startup (table T-077), while
 * the key and store stay with the loop's current value so the keys are not
 * typed twice (R4).
 *
 * @purity semi-pure-b
 */
export function startupDisplayLanguage(): DisplayLanguage {
  const stored = readBrowserStored('S-99')
  if (stored !== null && isDisplayLanguage(stored)) return stored
  return globalThis.navigator?.language?.toLowerCase().startsWith('ja') === true ? 'ja' : 'en'
}

/**
 * FR-065's per-origin record (S-99b) -- what this origin was left at, or off
 * where it has never been turned on here.
 *
 * One key per origin, so nothing resets it on a new document; FR-065 accepts
 * that widening and answers it by showing the enabled state on screen.
 * Anything but the one spelling is off: the default is not to expose (FR-065),
 * and stored values are untrusted (FR-023).
 *
 * Exported for the same reason as `startupDisplayLanguage`.
 *
 * @purity semi-pure-b
 */
export function startupAgentApiEnabled(): boolean {
  return readBrowserStored('S-99b') === String(true)
}

/**
 * ADR-001 -- the screen rectangles, the layout and the geometry are computed
 * once at the head of a frame and handed out.
 *
 * Several paths need the layout; without this, table T-068's stages would run
 * once per path for a single pointer move (MN-6), past NFR-002 / NFR-003's budget.
 *
 * `startedFromTemplate` is which row of table T-034 won, narrowed to the bit
 * OP-10 asks about; only the shell knows it (BO-2), the document does not.
 * `clipboard` (IF-5, CP-30), `files` (IF-3, PI-28), `rasterizer` (IF-6, CP-31)
 * and `appShell` (IF-8, UF-47) are injected so a test can stand in (R7.3), and
 * optional because the loop also runs for paths that touch none of them.
 * `rasterizer` and `appShell` come last rather than beside `clipboard` because
 * existing callers pass arguments by position; a named bag would fix that.
 * `startupTemplate` is BT-4 of table T-034, which FR-095's press restores. It is
 * not read here: `single-html-shell.ts` already parses the one template (FR-027)
 * for BO-2. Without it, IC-98 answers with a telling.
 *
 * @purity non-pure
 */
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
  // One pair, not a document beside a history: WS-6 of table T-067 swaps one
  // reference, and a mismatched pair is what AG-4 forbids (see `HeldDocument`).
  let held: HeldDocument = { document: first, history: emptyHistory() }
  let environment = env
  let selection: Selection = emptySelection()
  // Held rather than rebuilt each frame so one frame draws one session's state;
  // `screenStateFromInput` (PI-18) moves it.
  let screenState: ScreenState = emptyScreenState()
  /**
   * FR-020's trail, stamped at open and again in `holder.replace` when the
   * document changes -- `replace` is the one door every write goes through.
   *
   * Not per frame (FR-020): a clock read in the loop would change the drawing
   * every second, owing repaints and making FR-102's record differ for
   * identical frames. WY-2 of table T-041 still excludes the layer from the
   * determinism comparison.
   *
   * An empty stored name counts as none (FR-086), falling back to table
   * T-206's default via `NOT_STORED_WATERMARK_NAME`.
   */
  let watermarkStampedAt = readInstantOfWrite()
  const watermarkStoredName = readBrowserStored('S-99a')
  const watermarkOpenedBy =
    watermarkStoredName === null || watermarkStoredName === ''
      ? NOT_STORED_WATERMARK_NAME['S-99a']
      : watermarkStoredName
  /**
   * FR-020's layer for the picture being drawn now, or `null` where S-144 of
   * table T-206 has been turned off.
   *
   * One place for screen and export, so hiding the watermark hides it in both
   * (FR-020). `screenState` is read at the call, not captured: the export road
   * builds a fresh `ScreenState` (EP-11), and S-144 must survive that.
   * Hence `semi-pure-b`: S-144 belongs to the session and moves.
   *
   * The shape is written out, not imported as `Watermark`: table T-064 does
   * not publish that name across the folder boundary. The parameter it is
   * handed to still type-checks the shape.
   *
   * @purity semi-pure-b
   */
  function watermarkNow(): { readonly openedBy: string; readonly stampedAt: string } | null {
    return screenState.watermarkVisible
      ? { openedBy: watermarkOpenedBy, stampedAt: watermarkStampedAt }
      : null
  }
  let values: FrameValues | null = null
  let owed = false
  // CS-2 of table T-066 -- the press a gesture began with, kept until the
  // gesture ends, because IN-1 decides the whole gesture from it on release.
  let pressed: PointerPress | null = null
  // The picture a held press owes -- FR-052's two widths and the fade table
  // T-023d's closing rule asks for -- and `null` whenever no press owes one.
  //
  // The picture, never the value: writes are measured against `held.document`
  // and nothing folds this back (IN-1 of table T-028). Nor is it folded onto
  // itself -- `previewOfHeldPress` starts every fold at `held.document`, so a
  // travel is never applied twice.
  let previewDocument: Document | null = null
  // FR-053 -- where GR-19's drag has left the `Command Palette`, and `null`
  // while nobody has dragged it. See `paletteCornerOf` for why no table keeps it.
  let commandPaletteDraggedTo: { readonly x: number; readonly y: number } | null = null
  // FR-053 -- where the palette's corner stood when the band was pressed, and
  // `null` while no band drag is in flight.
  //
  // Every move applies a travel (`moveCommandPalette`) to the corner, which is
  // the only road to the picture (`ScreenSession.commandPaletteAt`), so an
  // interrupted drag (IN-1 of table T-028) needs this to put the corner back.
  // Not part of anything published: no row of table T-203 or T-206 holds it.
  let commandPaletteCornerAtPress: { readonly x: number; readonly y: number } | null = null
  // HF-15 of table T-051 -- the row GR-20's strip is being held by, and the
  // depth the picture draws it at, or `null` while no row is held.
  //
  // Picture only: table T-023d forbids writing while held, so `writeDocument`
  // never sees it; CM-73 is planned on release (IN-1 of table T-028). Not saved.
  // Dropped on release, lost pointer (IN-1a) and `Esc` (IN-1), or a row would be
  // drawn at a depth nobody holds.
  let rowGrabbedAt: {
    readonly groupId: string
    readonly depth: number
    readonly axis: 'position' | 'depth'
    readonly resistedPx: number
    readonly atY: number | null
  } | null = null
  // S-211 of table T-206 -- whether 段 0 is folded (HR-2 of table T-015).
  //
  // Held here because no column of a row can carry it (HR-2). Starts open and
  // is not saved (S-211). The roads back are listed on S-211; `carryOutAction`
  // takes them.
  let isLevelZeroFolded = false
  // S-142 of table T-206 -- whether FR-053's milestone glyph list is open.
  // Starts closed (S-142).
  //
  // `Esc` must not close it (FR-053, S-142), so it is held here: a member of
  // `ScreenState` would be inside `escapeTarget`'s reach. Lost with the page
  // (table T-206).
  let isMilestoneListOpen = false
  // S-200 of table T-206 -- whether FR-053's palette stands minimised. Default
  // `false`, and lost with the page for the same reason as the line above.
  let isPaletteMinimised = false
  // S-206 of table T-206 -- whether FR-102's record is running. Default
  // `false`, and lost with the page for the same reason as the line above.
  // The record itself is lost too: FR-102 keeps it out of the document.
  let isRecordingInteractions = false
  // The lines of the record, oldest first, capped at S-207 (FR-102).
  const interactionRecord: string[] = []
  // How many lines were dropped off that end, written at the head of the
  // handed-over record (FR-102).
  let interactionRecordDropped = 0
  // The reading of FT-4's clock the record's own times are counted from, so
  // that what is pasted starts at 0 rather than at the host's own epoch.
  let interactionRecordBeganAt = 0
  // How many lines have been offered since the record began, dropped ones
  // included -- the sequence number, so a reader can see the record does not
  // start at the beginning.
  let interactionRecordOffered = 0
  // FR-101 -- the file the document is open from, and the instant it was last
  // written to. Set by a write only: FR-101 asks when the file was last
  // written, and opening answers neither. Lost with the page.
  // OP-10 of table T-024a: whether the document standing now is the one BT-4
  // of table T-034 put up. Held rather than read off ED-3's `template` stamp
  // (table T-229), which WS-5 turns into `user` on the first write -- the view
  // would jump to the fit on typing.
  // Cleared where table T-230 says the document became a different one.
  let fromStartupTemplate = startedFromTemplate === true
  let openedFileName: string | null = null
  let fileSavedAt: string | null = null
  // FR-100 -- whether edits stand that no file has been told about. FR-100
  // forbids warning when there are none, so this flag must be exact. Starts
  // `false`: BT-4's template, BT-1 and BT-2 are not edits.
  let hasUnsavedEdits = false
  // FR-085 -- the rows chosen in the `Row Title Panel`, by `TaskGroup.id`
  // (AT-51). A separate set from `selection`: SL-1 of table T-023c leaves rows
  // out of the drawing area's selection. Lost with the page (LY-5 of table T-060).
  // @provisional PND-142
  let selectedGroupIds: readonly string[] = []
  /**
   * FR-033's copy buffer -- SK-4 puts something here and SK-5 takes it.
   *
   * In the app, not the OS clipboard (FR-033): CHN-9 of table T-008 is
   * send-only, so `ClipboardGateway` (PI-24) publishes no read.
   *
   * Identifiers, never content: `pasteTaskSubtree` (CM-8) and
   * `pasteTaskGroupSubtree` read the subtree at paste time, so kept rows would
   * paste what the document no longer holds. The source can be gone by SK-5;
   * see the paste's own note.
   *
   * Lost with the page, like `selectedGroupIds`.
   */
  let copiedForPaste:
    | { readonly kind: 'task'; readonly uid: number }
    | { readonly kind: 'row'; readonly groupId: string }
    | null = null
  // FR-099 -- who is chosen in the `Resource Roster` (U-49), by `Resource.uid`
  // (AT-85, AS-6 of table T-225). SL-1 admits no resource either.
  // @provisional PND-143
  let selectedResourceUids: readonly number[] = []
  // FR-072 -- which of the two the last operation chose, and what it chose.
  //
  // `null` means no operation has chosen yet, not a fourth state. Nothing moves
  // it back to `null`: FR-072 keeps the previous contents when a selection goes.
  // @provisional PND-144
  let propertiesShowing: PropertiesShowing = null
  let propertiesSubject: PropertiesSubject | null = null
  // Whether the reader has put the `Properties Panel` (U-25) away.
  //
  // A separate fact from `propertiesShowing`: putting the panel away is not an
  // operation choosing (FR-072), so writing `null` there would be false.
  // `propertiesShowingNow` reads the two together.
  // Not S-80: that is the width the document keeps (see S-171), so closing is
  // not written back and a dragged width is still there when the panel returns.
  // Nothing sets it at startup; IN-4's level and IC-52's press are its writers.
  // @provisional PND-338
  let isPropertiesPanelPutAway = false
  // FR-065 -- whether the person has turned the `Agent API` on at this origin,
  // seeded from S-99b as `language` is from S-99; not per document (FR-065).
  // Off where the store has nothing or refuses (FR-028, FR-065).
  let isAgentApiEnabled = startupAgentApiEnabled()
  // Who to tell when that turns, or `null` while nobody has asked. One
  // listener, not a list (see `watchAgentApiEnabling`).
  let agentApiEnablingWatch: ((isEnabled: boolean) => void) | null = null
  // FR-066 -- S-99i of table T-206, IC-18's own switch. Starts `true` (S-99i).
  // A separate value from `isAgentApiEnabled` (S-99i). Not seeded or written
  // back like that one: PND-419 (未裁定) asks what S-99i does when the
  // capability goes down and comes back, and `BrowserStoredRow` has no row for
  // it -- see `sessionOf`.
  let isDialogueFieldVisible = true
  // FR-038 -- one language for the whole screen. `ScreenWiring` carries what
  // startup settled on; this carries what the person has chosen since, never
  // the document's (FR-038). Without a `ScreenWiring`, FR-038's own startup
  // rule answers rather than a second default.
  let language: DisplayLanguage = screen?.language ?? startupDisplayLanguage()
  // FR-076 -- what has been raised to tell, in the order it was raised.
  //
  // Held by this layer alone (LY-5 of table T-060): a refusal is a value the
  // caller receives (FR-028), so the receiver holds it until told. Each entry
  // carries rows of tables T-037 and T-233 and no words; the words live in
  // ScreenRenderer's dictionary (FR-038).
  //
  // NT-8 takes one off on its entrance, `Enter` (SK-19) and `Esc` (IN-4);
  // `dismissNewestNotice` and `noticesWithout` do the shortening.
  //
  // STOP -- no deadline is counted here. NT-2 governs a telling that goes away
  // with time, and the clock it would need is FT-4 of table T-078 -- which this
  // build reads for the icon hint alone (`beginPointerRest`). So a telling
  // nobody puts away stands for the rest of the session, which keeps NT-2's
  // "not before it has been read" half.
  let raisedNotices: readonly RaisedNotice[] = []
  /**
   * The `TaskGroup` on which the last drawn frame stopped at ST-7's safety
   * valve, so `STACK_SAFETY_CAP_REASON` is told once, not every frame.
   *
   * `raiseNotice` increments `affectedCount` on every call (NT-3 of table
   * T-037), so raising per frame would count frames. It is raised on the turn
   * from `null` to a stop. Holding the `groupId` lets a valve that moves to a
   * different `TaskGroup` be told again.
   * Not settled by the specification whether a second group owes a second
   * telling; ST-7 counts per `TaskGroup`, which is the reading followed.
   *
   * A dismissed telling is not re-raised while the same stop stands, or NT-8's
   * dismissal would be impossible.
   */
  let stackSafetyCapToldFor: string | null = null
  /**
   * The `TaskGroup` the last `exportScene` stopped on, or `null` where that
   * layout did not reach ST-7's valve.
   *
   * ST-7 of table T-014 requires the same telling after a picture export
   * (FR-080), since the export lays out separately from the screen.
   * Not raised where measured: `exportScene` also answers IF-7's snapshot
   * (R7.4), which is not an export, so the two writing roads raise it after
   * their write. Every call overwrites it, so each road copies it at the call
   * and never reads it again across an await.
   */
  let stackSafetyCapOfLastExportScene: string | null = null
  /**
   * The copy of the line above that IO-3 / IO-4's road is holding, from the
   * moment its picture was built until its file has been written.
   *
   * `exportHeldDocumentToFile` awaits the file store between picture and
   * write, and an `Agent API` snapshot in that gap would overwrite the line
   * above, so the value is lifted out right away.
   */
  let stackSafetyCapOwedByPictureExport: string | null = null
  // FR-032 -- the question NT-7 puts, and the writes it stands in front
  // of, until one of that row's two word buttons answers it.
  //
  // CS-4's discipline, not its landing (a delete lands through
  // `applyDocumentChange`, not `replaceDocument`): nothing is read again while
  // the answer is awaited, so the writes are the ones asked about.
  // `Esc` reaches it as a surface named by U-55 of table T-103; NT-7 places its
  // keys ahead of IN-4 and SK-19. `escapeTarget` spends that level because
  // `escapeLevelOf` reports it: the ladder is in `screen-state.ts`, the
  // question here.
  // Not moved into `ScreenState.surface`: `openModalFromScreenState` (UF-66)
  // turns any S-99g name into a modal, which would stack a second dialog over
  // `confirmationFromSession`'s without NT-7's two answers.
  //
  // The answer's effect travels with the question: FR-032's delete, DI-4 of
  // table T-227 and OP-4 of table T-024a all raise one, `receiveInput` spends
  // the word button, and `settle` decides what it meant. A union of payloads
  // would move the deciding to the answering side, where FR-031's limit on
  // places that may ask is easier to break by accident.
  let asking: {
    readonly question: RaisedConfirmation
    /** @purity non-pure */
    settle(isProceeding: boolean, frame: FrameValues): void
  } | null = null
  // OP-3 of table T-024a -- the road back to the read that put the
  // `Open Chooser` (U-56) up, until one of IC-71 .. IC-73 answers it.
  //
  // Beside `asking`, not inside it: NT-7 has two answers and OP-3 three, so
  // U-56 is not a `Confirmation`. This one lives in `ScreenState.surface`
  // (S-99g), so IN-4 spends its first level on it directly; the `Confirmation`
  // is reached through `escapeLevelOf`. Only one first level goes per press, so
  // `escapeTarget` is not read twice.
  // OP-3 forbids choosing for the person, so a surface closed unanswered hands
  // the waiter `null` and the open changes no document.
  let openChoosing: {
    /** @purity non-pure */
    settle(choice: OpenChoice | null): void
  } | null = null
  // FR-022 -- the road back to the merge that put U-61 `Difference
  // Review` up, until one of IC-95 .. IC-97 answers it.
  //
  // Beside `openChoosing`, not inside it: OP-3's question is answered before
  // OP-5's landing, and this one only once PI-10 has candidates, so a shared
  // holder would settle whichever was waiting.
  // FR-022 forbids choosing for the person, so a surface closed unanswered
  // hands the waiter `null`; nothing has been written by then (MG-6).
  let mergeChoosing: {
    /** @purity non-pure */
    settle(mapping: MergeMapping | null): void
  } | null = null
  // FR-022 -- what U-61 lays out while it stands: the tasks that could
  // correspond, gathered by `UID`. Empty while no merge is being asked about.
  // Held, not re-derived: PI-10 made the pairing and R2.7 forbids repeating it.
  let mergeCandidates: readonly MergeCandidateLine[] = []
  // FR-073 -- the columns the last intake could not read, laid out on U-61
  // beside the pairing above. Empty while no such document is being asked about.
  //
  // Not inside `mergeCandidates` (an intake can have either without the
  // other), but cleared with it, as both belong to the one surface.
  // Names as PI-20's `unreadColumns` read them, untranslated (FR-038).
  let unreadColumns: readonly string[] = []
  // FR-023 -- what U-62 `Import Report` lays out while it stands: the
  // names of the `Task` rows the last import dropped, in the order the file
  // carried them. Empty while that surface is not up.
  //
  // Names, not a count (FR-023), and not uids, which name nothing a person can
  // find in the file they must fix. Held because the rows are no longer in any
  // document.
  let droppedTaskNames: readonly (string | null)[] = []
  // Whether a file operation that waits for the person is running (CS-4 of
  // table T-066).
  //
  // Two reasons: `ScreenSession.confirmation` and `ScreenState.surface` each
  // hold one question, so a second operation would orphan the first; and OP-8
  // of table T-024a refuses a second open, which is why the open path refuses
  // at the entrance -- `importDocument`'s refusal would reach nobody.
  // The store's own guard refuses with a fault; this one stops the operation
  // before it can take the question away.
  let isFileOperationWaiting = false
  // U-42 `Pointer` -- where one was last reported from.
  // `null` only until the first happening: IF-2 has no pointer-leave happening
  // and table T-078's note forbids widening that supply.
  let pointerAt: { readonly x: number; readonly y: number } | null = null
  // What IF-9 answered where the pointer last was. Held because FR-048's
  // exemption is about a change, which only the previous answer can reveal.
  let partUnderPointer: ScreenPart | null = null
  // What table T-023d answered where the pointer last was, or `null` where no
  // row of it claimed the point.
  // Held for the same reason as `partUnderPointer`: IF-9 answers for parts over
  // the schedule and this for the schedule itself. `grabAtPointer` is asked once
  // per happening, and both IN-2's shape and FR-048 read that one answer.
  let grabUnderPointer: Grabbed | null = null
  // Whether the frame last painted put an explanation up (U-53).
  //
  // EZ-6 of table T-040 removes the explanation when the pointer moves, but a
  // move on the same entry and T-023d row changes neither FR-048 answer, so no
  // frame would be owed. Restarting the wait is not enough: it is read inside a
  // frame. This records what was drawn, not what is due.
  let isTooltipStanding = false
  // Whether the reader has put that explanation away (IN-3 of table T-028,
  // through IN-4's last rung).
  //
  // A separate binding: `isTooltipStanding` is rewritten from
  // `screenView.tooltips` on every paint and would overwrite the dismissal.
  //
  // Cleared where `beginPointerRest` is called, since a move starts EZ-2's wait
  // over. Not cleared on a key: IN-3 asks for dismissal without moving pointer
  // or focus, so a keystroke must not bring the explanation back.
  let isTooltipDismissed = false
  // FT-4 of table T-078 -- when the rest EZ-2 of table T-040 waits on began,
  // read off the monotonic clock R3.6 requires for an elapsed time, or `null`
  // while the pointer has never yet been reported to stand anywhere.
  // Only a move ends a rest: a redraw leaves the pointer where it was.
  let pointerRestingSince: number | null = null
  // How to call off the frame FT-4 owes at the end of that rest, or `null`
  // while none is standing.
  // A cancel function rather than the host's handle, which is a number in a
  // browser and an object elsewhere. One at a time (R5.3): the old one is called
  // off before the next is set.
  let callOffIconHintWait: (() => void) | null = null
  // How to call off whichever half of FR-018's repeat is standing -- the wait
  // S-172 serves first, or the ticking S-173 keeps up after it -- or `null`
  // while the press in flight is on none of `REPEATING_ENTRIES` and while no
  // press is in flight at all.
  // One handle for both halves, which never stand together: the wait replaces
  // itself with the ticking, and `endEntryRepeat` ends either. A cancel
  // function for the reason given at `callOffIconHintWait`.
  let callOffEntryRepeat: (() => void) | null = null
  // Table T-029a's Dual Cursor mode: which of `dualCursor`'s two dates (S-65)
  // is following the pointer, or `null` while the mode is not up.
  //
  // One value, not a boolean beside a side: DC-1 and DC-2 leave no state where
  // the mode is up with nobody following. `commandFromDualCursorEntry` answers
  // IC-45 and `carryOutAction` moves this.
  //
  // A member of `ScreenSession`, handed on by `sessionOf`; UF-65 receives the
  // whole session, so it arrives where a row could use it.
  let dualCursorFollowing: DualCursorSide | null = null
  // FR-066 -- the conversation, which is not in the document (FR-066) and is
  // therefore a current value LY-5 of table T-060 leaves here.
  //
  // `postDialogueMessage` (PI-16) appends through AM-18 of table T-107;
  // `agentApiSeams` hands over the seams and `dialogueSeams` does the replacing
  // and FT-5's frame.
  // STOP -- the person's own side is not wired. `ScreenSurface.readDialogueInput`
  // (IF-9) and `dialogueMessageFromInput` (PI-37) exist, and `screen-surface.ts`
  // states the caller's half (read the settled line before the draw that clears
  // it), but nothing in `src/` calls them, so every message arrives from the API.
  let dialogueLog: DialogueLog = emptyDialogueLog()

  /**
   * What table T-060's LY-5 lets `applyDocumentChange` replace.
   *
   * Read once per write (CS-3 of table T-066) and swapped as one reference (WS-6).
   */
  const holder: DocumentHolder = {
    /** @purity semi-pure-b */
    read(): HeldDocument {
      return held
    },
    /** @purity non-pure */
    replace(next: HeldDocument): void {
      // FR-020's re-stamp on change, here because `replace` is the single door
      // for edit, undo, redo, merge and a whole other document.
      // By reference: a command with nothing to do returns the document it was
      // handed, and FR-020 does not re-stamp an unchanged document.
      // Before the swap, or there is nothing left to compare against.
      if (next.document !== held.document) {
        watermarkStampedAt = readInstantOfWrite()
      }
      held = next
      // Table T-023c's closing rule forbids dropping dead references per
      // deleting entrance, and this single door is where it can be kept:
      // `replaceHeldDocument` leaves dead references too without deleting.
      // After the swap: judging against the old document would keep what the
      // write removed.
      const chosenBeforeTheWrite = selection
      selection = selectionWithinSchedule(selection, held.document.schedule)
      // FR-091's just-created scene ends where the selection moves; an undo of
      // the new Task is one of the doors that moves it.
      endCreatedNamingIfChosenMoved(chosenBeforeTheWrite)
      // FT-2 of table T-078 is WS-6 itself, so the frame is asked for here
      // rather than on each road -- the `Agent API` reaches this holder through
      // `agentApiSeams` and takes neither `receiveInput` nor
      // `replaceHeldDocument`, so it would otherwise leave the picture stale.
      // The shape is FT-5's (`dialogueSeams.dialogueAudience.deliver`):
      // `settled` keeps BO-1 of table T-077, and `ask` coalesces with FT-1's.
      // Not a per-frame document comparison, which table T-078's note forbids.
      if (settled(environment)) ask()
    },
  }

  /**
   * WS-7 of table T-067 -- who is told once the swap has happened, for every
   * write this loop makes. Both roads of PI-8 take it: the command road
   * (`writeDocument`) and the whole-document road of table T-230
   * (`replaceHeldDocument`), so an undo and an ordinary edit reach the watchers
   * the same way an `Agent API` write does.
   *
   * The shape is PI-15's (`NotifyChangeWatchers`): the document, the judgement
   * that travelled with it, and the dialogue log (FR-066, LY-5 of table T-060).
   * Inside the loop because `dialogueLog` is.
   * Nothing is decided here: `hasMovedSchedule` is carried (AG-6 of table T-035),
   * chosen in the pure half (UT-3 of table T-063, UF-25 of table T-075).
   * The screen's own writes pass through too; AG-6's self-wake rule is kept by
   * signing with `EDITED_BY_SCREEN` (ED-1 of table T-229), not by a guard here.
   */
  const audience: ChangeAudience = {
    /** @purity non-pure */
    deliver(document: Document, hasMovedSchedule: boolean): void {
      const outcome = notifyChangeWatchers({ document, hasMovedSchedule, dialogue: dialogueLog })
      // This is the only caller, and PI-15 hands failures back for it to tell
      // (see `NotifyOutcome`): RS-23 of table T-233, manner NT-3a.
      // The watcher is not named: its name and error are not screen words
      // (FR-038). No count: NT-3's count is for destructive results.
      if (outcome.failures.length > 0) raiseNotice(WATCHER_SILENT_REASON, null)
      // `outcome.notified` is not read: table T-233 has no row for success.
    },
  }

  /**
   * FR-072's answer for THIS frame: which of the two the panel is showing, or
   * `null` while it is not on the screen at all.
   *
   * The one place both held values are read together; what is described to the
   * surface reads this, never `propertiesShowing`, or a put-away panel would
   * still be described. Exceptions: `withPropertiesPanelShown` reads the
   * put-away flag alone, and the `Esc` ladder asks `isPropertiesPanelOnScreen`.
   *
   * @purity semi-pure-b
   */
  function propertiesShowingNow(): PropertiesShowing {
    return isPropertiesPanelPutAway ? null : propertiesShowing
  }

  /**
   * Whether the `Properties Panel` (U-25) is on the screen at this moment --
   * the question IN-4 asks before it spends a level on it.
   *
   * Without a `ScreenWiring` no `ScreenView` is described, so there is no panel
   * (as in `owesFrame`), and `Esc` must reach the browser (IN-4a).
   *
   * @purity semi-pure-b
   */
  function isPropertiesPanelOnScreen(): boolean {
    return screen !== undefined && propertiesShowingNow() !== null
  }

  /**
   * The width the properties panel takes on THIS frame -- nothing while it has
   * been put away, S-80 as the document keeps it, or S-171 of table T-206 while
   * FR-072 has the panel showing and the document keeps no width of its own.
   *
   * The mirror of `exportScene`'s `withPanelsClosed`: the panel's rectangle is
   * cut from this one width, and S-80 of `0` means not yet widened, so a showing
   * panel with no stored width would get no room.
   * Laid over a copy, never written back (S-171 is not a document setting); a
   * stored S-80 above zero is a dragged width and wins (FR-052).
   *
   * @purity semi-pure-b
   */
  function withPropertiesPanelShown(stored: DocumentSettings): DocumentSettings {
    // A put-away panel takes no width, handing its place to the `Row Area`
    // (FR-052). Checked before the stored width, or a dragged width would leave
    // an empty strip at the right edge.
    if (isPropertiesPanelPutAway) {
      if (stored.propertyPanelWidth === 0) return stored
      return { ...stored, propertyPanelWidth: 0 }
    }
    // The raw value, not `propertiesShowingNow`, which would make the branch
    // above unreachable; the stored width must stand here or FR-052's boundary
    // could never be dragged open from a closed panel.
    if (propertiesShowing === null) return stored
    if (stored.propertyPanelWidth > 0) return stored
    return {
      ...stored,
      propertyPanelWidth: NOT_STORED_PROPERTIES_PANEL_SIZES['S-171'],
    }
  }

  // CA-2: invalidation happens at the head of a frame, and nothing is rebuilt
  // again for the rest of it (NFR-010: no trigger, no frame).
  //
  // @purity non-pure
  /**
   * One line of FR-102's record, if the record is running.
   *
   * The guard is here, not at every call, so no caller can forget it and
   * nothing is measured or formatted while S-206 is off (GL-003).
   * The cap is S-207, dropping from the oldest end (FR-102).
   * The sequence number counts offered lines, so dropped ones stay visible.
   *
   * @purity non-pure
   */
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

  /**
   * The modifiers of one happening, as the record spells them.
   *
   * @purity pure
   */
  function recordedModifiers(modifiers: HumanInput['modifiers']): string {
    const held =
      (modifiers.ctrl ? 'C' : '') +
      (modifiers.shift ? 'S' : '') +
      (modifiers.alt ? 'A' : '') +
      (modifiers.meta ? 'M' : '')
    return held === '' ? '-' : held
  }

  /**
   * One key, as the record may spell it.
   *
   * A one-character key is masked (FR-102): `dom-input-source.ts` hands on
   * every typed character, so typing a task name would put document contents
   * into the record.
   * Length is the whole test: every named key of table T-036 is longer than
   * one character, so new keys need no change here. The modifiers stay, so
   * SK-12 still reads as `key=# mods=CS`.
   *
   * @purity pure
   */
  function recordedKey(key: string): string {
    return key.length <= 1 ? '#' : key
  }

  /**
   * FR-102: one happening, written down as it arrives -- before anything has
   * been decided about it and before any way out of `receiveInput`.
   *
   * Written this early so a dropped happening is still on the record (one that
   * arrives before any frame is dropped, NFR-011); otherwise an entrance that
   * does nothing cannot be told apart from a press that never arrived.
   * Nothing of the document is written: a place and a masked key only.
   *
   * @purity non-pure
   */
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

  /**
   * FR-102: what this frame DREW, counted rather than copied.
   *
   * Counts of each element kind, never their text, which would be document
   * contents (FR-102). Counted off the exact string handed to the surface, so
   * the record is not a second opinion about what was drawn.
   * The deciding state goes on the same line: a picture without cursor lines
   * means different things with table T-029a's mode up or down.
   *
   * @purity non-pure
   */
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

  /**
   * What is handed to the clipboard when the record is stopped (FR-102).
   *
   * The dropped count is at the head (FR-102). Tab-separated so a pasted report
   * scans as a table, with the columns named on the third line.
   *
   * @purity semi-pure-b
   */
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

  /**
   * IC-76 of table T-109 -- FR-102's one entrance, which both starts the
   * record and stops it.
   *
   * Stopping hands the record over (FR-102) through CHN-9 of table T-008
   * (`writeClipboard` over IF-5), the route IC-3 already uses; a separate route
   * would break rule 03. Starting clears what stood, so one record is one
   * sitting rather than two runs joined invisibly.
   * A refusing clipboard is not told: table T-233 has no reason for it (NT-3a
   * needs a next step), and the entrance's pressed state going off already says
   * the record stopped.
   *
   * @purity non-pure
   */
  function turnInteractionRecord(): void {
    if (!isRecordingInteractions) {
      interactionRecord.length = 0
      interactionRecordDropped = 0
      interactionRecordOffered = 0
      interactionRecordBeganAt = readMonotonicMs()
      isRecordingInteractions = true
      // Written here explicitly: the turning press is spent midway through
      // `receiveInput`, so one of its two happening lines always falls outside
      // the record.
      recordLine('record', 'started entrance=IC-76')
      return
    }
    recordLine('record', 'stopped entrance=IC-76')
    // Read before the flag goes off, since `recordLine` answers nothing after;
    // taken here, not in the promise, so the answer lands on the operation that
    // began (CS-4).
    const text = interactionRecordText()
    isRecordingInteractions = false
    interactionRecord.length = 0
    interactionRecordDropped = 0
    interactionRecordOffered = 0
    const seam = clipboard
    // No clipboard was wired (CP-30), as in `copyPictureToClipboard`.
    if (seam === undefined) return
    void writeClipboard(seam, { kind: 'record', text })
  }

  function runFrame(): void {
    owed = false
    // CS-1 of table T-066: the frozen copy this frame is drawn from, taken
    // once at its head.
    // A held press's preview substitutes here, and everything below reads this
    // one binding. `exportScene` keeps `held.document`: EP-12 of table T-076
    // keeps session state, a drag included, out of an export.
    const document = previewDocument ?? held.document
    // FT-4 of table T-078 -- how long the pointer has rested, read once so the
    // whole frame is about one instant. Outside the frozen copy: table T-078's
    // note keeps the clock out of what CS-1 collects.
    const pointerRestedMs =
      pointerRestingSince === null ? 0 : readMonotonicMs() - pointerRestingSince
    // Not `documentSettings` itself: FR-072's panel may take S-171's width (see
    // `withPropertiesPanelShown`).
    const withPanelShown = withPropertiesPanelShown(document.documentSettings)
    const environmentForRegions: ScreenEnvironment = {
      width: environment.width,
      height: environment.height,
      appHeaderHeight: environment.appHeaderHeight,
      scrollbarThickness: environment.scrollbarThickness,
    }
    // BO-1, then BO-3, then BO-4, in the order table T-077 fixes.
    const regions = regionsFromScreen(environmentForRegions, withPanelShown)
    // `held.document`, not the preview: with no stored place OP-10 re-runs
    // FR-055's fit every frame, and a preview that lengthens a bar would shrink
    // the axis under the dragging pointer (table T-023d's closing rule). The
    // layout below still reads the preview.
    const view = viewSettings(held.document, withPanelShown, regions,
                              fromStartupTemplate, readToday(),
                              environment.rowControlsHeightPx)
    const settings = view.settings
    // S-211's fold is handed to the layout, since HR-2 of table T-015 has a
    // folded 段 0 draw no row and which rows are drawn is LC-1's answer.
    // `undefined` for the cap: that argument is FR-055's fit's alone (see
    // `layoutFromSchedule`).
    const layout = layoutFromSchedule(
      document.schedule,
      settings,
      regions,
      undefined,
      isLevelZeroFolded,
      // LF-3's second floor, measured by the surface that drew the controls.
      environment.rowControlsHeightPx,
    )
    // ST-7 of table T-014: the layout returned the stop, and this tells the
    // person; without it rows would vanish silently. Told on the turn only --
    // see `stackSafetyCapToldFor`.
    const capStop = layout.stackSafetyCapReached
    if (capStop !== null && stackSafetyCapToldFor !== capStop.groupId) {
      stackSafetyCapToldFor = capStop.groupId
      // `null` for the count, not `capStop.cap`: `affectedCount` counts things
      // (NT-3) and `cap` is the setting S-89. RS-24's words take no number.
      raiseNotice(STACK_SAFETY_CAP_REASON, null)
    } else if (capStop === null) {
      // The valve let go, so the next stop is told again -- moving Tasks off the
      // row is exactly RS-24's next step.
      stackSafetyCapToldFor = null
    }
    // The same `selection` the renderer gets: FR-075 puts fade grab points on
    // the selected Task only, and `itemAtPointer` can be no narrower than the
    // geometry it reads.
    const geometry = geometryFromLayout(document.schedule, settings, layout, regions, selection)
    values = {
      regions,
      layout,
      geometry,
      settingsMeasuredWith: withPanelShown,
      isPictureAtStoredZoom: view.isAtStoredZoom,
    }
    // HF-17 of table T-051 (and HF-14 under it): an added row that is not drawn
    // is scrolled into view, not just its entry field.
    // Asked through `drawnRowBoxesOf`, the one place the cut is made; not
    // `ScheduleLayout.rows`, which includes rows below the `Row Area`.
    // Sent by writing the anchor (HF-9, S-78, S-176), not by scrolling a host
    // element, which the next frame would undo.
    // The day is this frame's resolved one, not the stored `null`: writing null
    // back would let OP-10's fit re-answer the vertical and undo this write.
    // No undo step: `isUndoable` keeps CM-66 out (UN-8 of table T-027).
    if (addedRowOwedSight !== null) {
      const owedSight = addedRowOwedSight
      addedRowOwedSight = null
      if (!drawnRowBoxesOf(layout, regions).some((one) => one.groupId === owedSight)) {
        writeDocument(
          [
            {
              kind: 'setScrollPosition',
              scrollDate: settings.scrollDate,
              scrollGroupId: owedSight,
              scrollDayOffset: settings.scrollDayOffset,
              scrollGroupOffset: 0,
            },
          ],
          values,
        )
        // FT-2 of table T-078 -- the current value moved, so a frame is owed.
        // Asked here because this write is not on a happening's road.
        // Nothing more is drawn: this pass is about the place just left.
        ask()
        return
      }
    }
    // Held in a binding so FR-102's record counts the very string that went out.
    const drawnSvg =
      // 'screen' is what a person looks at, so table T-076's omissions do not
      // apply: FR-043's dummies are drawn here only. The one thing table T-076
      // keeps out -- DC-8's following-side mark (EP-12) -- is drawn here too;
      // `exportScene` gets EP-6's two lines and no mark.
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
        // FR-017's weekday words come from FR-038's dictionary, asked for here
        // where the reader's language is held.
        rulerWeekdayWords(language),
        // CU-3's guide cursor follows this pointer. Passed every frame, not only
        // while the mode is up: the renderer reads S-66 itself, and a second
        // reading here could disagree.
        pointerAt,
        // FR-013's hover darkening, from the answer this loop already has (R7.4):
        // the renderer holds no `PointerSlop`, so it could not settle hovering.
        // Not `pressed`: CS-2 freezes a press where it began, so the mark would
        // stay dark wherever the hand went.
        grabUnderPointer,
        // ZO-6 of table T-020 and SL-3 -- the rectangle a range selection is
        // taking, from the same two values `previewOfHeldPress` reads.
        // Not handed to the export call (EP-12 of table T-076).
        marqueeRect(pressed, pointerAt),
        // FR-020's watermark, via the same call the export makes.
        watermarkNow(),
      )
    surface.showSvg(drawnSvg)
    recordFrame(drawnSvg, layout)
    if (screen === undefined) return
    // After the schedule: the outside parts are drawn over the drawing area,
    // which is why table T-023a's note limits its order to the schedule.
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
          // FR-068, read off this frame's `ScreenState`, so document and
          // surface are one moment.
          isAiExportSurfaceOpen: screenState.surface === AI_EXPORT_MODAL_SURFACE,
          pointer: pointerAt,
          pointerRestedMs,
          // Taken from where `receiveInput` put IF-9's answer; a second read in
          // the frame would be a second moment for one drawing.
          iconUnderPointer: partUnderPointer?.entry ?? null,
          // EZ-6's place condition, from `grabUnderPointer`: EZ-6 forbids a
          // second hit test, and `grabAtPointer` walks table T-023d once per
          // happening (R7.4).
          taskUnderPointer:
            grabUnderPointer !== null && grabUnderPointer.item.kind === 'task'
              ? taskByUid(document.schedule, grabUnderPointer.item.taskUid)
              : null,
          // IN-3 / IN-4's last rung, as it stands this frame.
          isTooltipDismissed,
          commandPaletteDraggedTo,
          rowGrabbedAt,
          // S-211 of table T-206 -- 段 0's own fold, as this frame stands.
          isLevelZeroFolded,
          isMilestoneListOpen,
          isPaletteMinimised,
          isRecordingInteractions,
          // Table T-029a's mode, the same value the `follow` argument above is
          // built from.
          dualCursorFollowing,
          selectedGroupIds,
          selectedResourceUids,
          // FR-072's answer as this frame stands: a panel IN-4 took is closed
          // whatever the last operation chose.
          propertiesShowing: propertiesShowingNow(),
          propertiesSubject,
          confirmation: asking?.question ?? null,
          // FR-022: what U-61 lays out while it stands; otherwise empty.
          mergeCandidates,
          // FR-073: the unread columns on the same surface; otherwise empty.
          unreadColumns,
          // FR-023: what U-62 lays out while it stands; otherwise empty.
          droppedTaskNames,
          notices: raisedNotices,
          // FR-029 with RD-1 and RD-2 of table T-230, off the one history
          // `undoEdit` and `redoEdit` use, so the faint entrance and the press
          // agree. The published `EditHistory` fields (PI-4 of table T-064) are
          // read directly; the counting function beside them is not published.
          // Not `previousStep` / `nextStep`, which build a new history.
          // `held`, not the preview: a preview has no history of its own.
          canUndo: held.history.done.length > 0,
          canRedo: held.history.undone.length > 0,
        }),
      )
    // Read off the description that went out, for the reason `drawnSvg` is.
    isTooltipStanding = screenView.tooltips.length > 0
    screen.surface.showScreenView(screenView)
    // MK-13's second half and SK-9 are spent here: the field they name does not
    // exist until the description above is drawn, so `carryOutAction` leaves
    // the ask standing and it is collected after the draw. SK-9's field is
    // created by the ask (FR-035) in the header drawn by the same line.
    // Spent whether or not the surface answers: the seam member is optional,
    // and holding the ask would focus a panel the person has left.
    // No compiler catches this line going missing; the spec-driven tests do.
    if (nameFieldWantedRow !== null) {
      const wanted = nameFieldWantedRow
      nameFieldWantedRow = null
      screen.focusPropertyField?.(wanted)
    }
  }

  /**
   * The far side of a wait CS-4 of table T-066 governs -- the guard comes off
   * and the frame FT-1 of table T-078 owes is asked for.
   *
   * Asked unconditionally, not only when a question went up: FT-1 covers every
   * continuation across the wait, and a save that succeeded otherwise paints
   * nothing until the next input (FR-101). `ask` coalesces, so a road that
   * already raised a telling still paints once.
   *
   * @purity non-pure
   */
  function endFileOperationWait(): void {
    isFileOperationWaiting = false
    if (settled(environment)) ask()
  }

  /** @purity non-pure */
  function ask(): void {
    if (owed) return
    owed = true
    // A frame is asked for, never run inline: two triggers landing in one
    // task would otherwise run table T-068 twice for one painted frame.
    const raf = globalThis.requestAnimationFrame
    if (typeof raf === 'function') raf(() => runFrame())
    else runFrame()
  }

  /**
   * FT-4 of table T-078 -- the pointer has moved, so the rest EZ-2 of table
   * T-040 waits out begins again from here.
   *
   * A wake is set because a person who stops moving makes nothing happen, so
   * without one the wait would pass unwitnessed and the explanation never be
   * drawn; the shell measuring the time itself mints no trigger (NFR-010).
   * The length is S-124 read off the held document; a wake already standing
   * keeps the length it was set with, since the frame decides on elapsed time.
   * Nothing is woken without a `ScreenWiring`: EZ-2's tooltip is drawn by
   * `ScreenSurface`, so the frame would redraw the same schedule for nothing.
   *
   * @purity non-pure
   */
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

  /**
   * The press in flight when it stands on an entrance FR-018 lets a hold
   * repeat, or null otherwise.
   *
   * Asked of the press, never of where the pointer is now: CS-2 of table T-066
   * freezes the gesture at the press and the release is settled from
   * `press.on`, so a repeat judged on the pointer would stop when the hand
   * drifted a pixel off the entrance.
   *
   * @purity semi-pure-b
   */
  function pressHeldOnRepeatingEntry(): PointerPress | null {
    const press = pressed
    const entry = press?.on?.entry ?? null
    if (press === null || entry === null) return null
    return REPEATING_ENTRIES.includes(entry) ? press : null
  }

  /**
   * One tick of FR-018's repeat: ask `commandFromEntry` for the held entrance
   * once more.
   *
   * Nothing is worked out here, so the step cannot drift from S-53:
   * `commandFromInput` (PI-18) is handed the press this gesture began with and
   * answers what the release would. The zoom compounds because the context is
   * collected afresh each tick. The continuation is spelled in IF-2's existing
   * vocabulary (FT-1 of table T-078), so nothing is added to that seam.
   * Not put through `receiveInput`: that would drop the press, move the
   * selection and spend a level of `Esc`. No undo step is pushed: these entries
   * write `setZoom`, which UN-8 of table T-027 keeps out of the history.
   *
   * @purity non-pure
   */
  function repeatHeldEntry(): void {
    const frame = values
    const press = pressHeldOnRepeatingEntry()
    if (frame === null || press === null) {
      endEntryRepeat()
      return
    }
    // The press itself with only `phase` moved, so point, button and modifiers
    // are the ones CS-2 froze. `phase` must move: `pointerAssignment` answers a
    // `down` with nothing but MK-10's question (IN-1).
    const continuation: PointerInput = { ...press.at, phase: 'up' }
    const context = collectInputContext(frame)
    carryOutAction(commandFromInput(continuation, context).action, frame)
    ask()
  }

  /**
   * FR-018 -- the hold repeat: the first tick after S-172, the rest every S-173.
   *
   * A wake and not a count, for `beginPointerRest`'s reason: holding a button
   * makes nothing happen. The ordinary release is untouched (IN-1 of table
   * T-028), so a hold still steps once more when the button comes up; reading
   * the repeat as spending the release would break that MUST.
   *
   * @purity non-pure
   */
  function beginEntryRepeat(): void {
    endEntryRepeat()
    if (pressHeldOnRepeatingEntry() === null) return
    const times = repeatTimesOfHeldEntry()
    // One wake chained after the last rather than a repeating timer, so a tick
    // that ran late cannot pile the next one on top of itself.
    const tickAfter = (afterMs: number): void => {
      const wake = setTimeout(() => {
        callOffEntryRepeat = null
        // Asked again at every tick: a host may still run a wake that was
        // already in flight when the button came up.
        if (pressHeldOnRepeatingEntry() === null) return
        repeatHeldEntry()
        tickAfter(times.intervalMs)
      }, afterMs)
      callOffEntryRepeat = () => clearTimeout(wake)
    }
    tickAfter(times.delayMs)
  }

  /**
   * Stop repeating, whichever half was standing.
   *
   * Called from table T-028's own ends: the release and `Esc` (IN-1) and a lost
   * pointer (IN-1a). Leaving the entrance is not one (IN-1, MUST NOT). A repeat
   * left ticking after a lost pointer would paint once per S-173 for as long as
   * the page lives.
   *
   * @purity non-pure
   */
  function endEntryRepeat(): void {
    callOffEntryRepeat?.()
    callOffEntryRepeat = null
  }

  /**
   * BO-1 (NFR-011). A host really can hand over a 0 x 0 window -- a preview
   * pane not yet laid out does -- and a frame drawn then is a picture of
   * nothing shown before the real one.
   *
   * @purity pure
   */
  function settled(env: FrameEnvironment): boolean {
    return env.width > 0 && env.height > 0
  }

  /**
   * Whether two sets of BO-1's measurements say the same thing.
   *
   * One place for the comparison because FT-3's `resize` and
   * `settleFirstFrameEnvironment` both make it: a copy that missed a newly added
   * measurement would wake no frame for it. The row-control floor counts as a
   * size because LF-3 of table T-221 moves every row's band.
   *
   * @purity pure
   */
  function isSameEnvironment(one: FrameEnvironment, other: FrameEnvironment): boolean {
    return (
      one.width === other.width &&
      one.height === other.height &&
      one.appHeaderHeight === other.appHeaderHeight &&
      one.scrollbarThickness === other.scrollbarThickness &&
      one.rowControlsHeightPx === other.rowControlsHeightPx
    )
  }

  // ---- FR-076: what is raised to be told ----------------------------------

  /**
   * Put one thing on `ScreenSession.notices` (FR-076).
   *
   * The manner is read off the reason (table T-233), so no caller can put a
   * telling into the wrong manner. `affectedCount` is what the raiser measured
   * or `null`; the words are read on the far side (FR-038).
   * The frame is FT-1's continuation across the wait (NFR-010); `ask`
   * coalesces, so a telling raised inside a frame's own handling paints once.
   *
   * @purity non-pure
   */
  function raiseNotice(reason: NoticeReason, affectedCount: number | null): void {
    // NT-3 of table T-037. The reason is the whole identity: `manner` is read
    // off it, so two tellings of one reason cannot differ.
    // The gathered one moves to the end, so NT-8's newest-first dismissal lands
    // on the telling this raise touched.
    // A `null` count counts as one: gathering two count-less refusals must
    // answer 2, not `null`, which would say nothing was gathered.
    const standing = raisedNotices.find((one) => one.reason === reason)
    if (standing !== undefined) {
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

  /**
   * Put away the telling one entrance or one key names (NT-8 of table T-037) --
   * the one place a telling leaves `raisedNotices`, whichever trigger arrived.
   *
   * By key and not by index: a list that grew or shrank between the frame drawn
   * and the press cannot lose a different telling than the one named.
   *
   * @purity pure
   */
  function noticesWithout(answered: string): readonly RaisedNotice[] {
    return raisedNotices.filter((one) => dismissKeyOf(one) !== answered)
  }

  /**
   * NT-8 -- the answer for a key, which names no telling of its own.
   *
   * The last is the newest because `raiseNotice` appends, so the list order is
   * the arrival order and no clock is read. Nothing is put away when nothing
   * stood on arrival; answering here as well keeps a press that reached this
   * line by another road from shortening the list.
   *
   * @purity non-pure
   */
  function dismissNewestNotice(): void {
    // The newest of the tellings standing when the key ARRIVED, not the newest
    // now (SK-19, NT-8): `spendFieldCommit` may raise at the head of the
    // happening, and taking the list's end would put away the answer this very
    // press just raised.
    const standing = raisedNotices.filter((one) => noticeReasonsOnArrival.has(one.reason))
    const newest = standing[standing.length - 1]
    if (newest === undefined) return
    // One telling, not every telling sharing its key: `dismissKeyOf` gives two
    // failures of one kind the same key, so filtering by it removes both.
    // The key stays right for the pointer path, where a press names the telling
    // it was drawn under across frames; a key press names none.
    raisedNotices = raisedNotices.filter((one) => one !== newest)
    ask()
  }

  /**
   * NT-7 of table T-037 -- the standing question, answered; the one place an
   * answer settles the raiser's promise. Returns whether there was a question.
   *
   * Reached from a word button and from `y` / `n`, so the settling lives once.
   * `Esc` settles it on its own level (IN-4 of table T-028, see the
   * `escapeLevel === 'confirmation'` line). The question is cleared before the
   * answer is carried out: `carryOutAction` refuses to start anything while a
   * question stands.
   *
   * @purity non-pure
   */
  function answerConfirmation(isProceeding: boolean, frame: FrameValues): boolean {
    const asked = asking
    if (asked === null) return false
    asking = null
    asked.settle(isProceeding, frame)
    return true
  }

  /**
   * FR-020 -- the answer given on U-60 `Watermark Unlock`, spent. Returns
   * whether that surface was standing to answer.
   *
   * Beside `answerConfirmation` and not inside it: both surfaces carry NT-7's
   * word buttons, so the answers arrive on the same `ScreenPart` member and only
   * which surface stands parts them. Asked first in `receiveInput`, since a
   * question raised while this surface is up would otherwise be answered by the
   * press meant for the surface.
   * Cancelling closes the surface and writes nothing (FR-020). Proceeding
   * settles nothing by itself: the digest comparison is asynchronous, and
   * `matchWatermarkUnlock` lands either outcome.
   *
   * @purity non-pure
   */
  function answerWatermarkUnlock(isProceeding: boolean): boolean {
    if (screenState.surface !== WATERMARK_UNLOCK_SURFACE) return false
    if (!isProceeding) {
      screenState = screenStateWithSurface(screenState, null)
      ask()
      return true
    }
    // Read at the press and hashed in the call below, so nothing in this loop
    // holds the raw password (FR-020). An empty string (no reader wired, or an
    // empty field) cannot match a SHA-256.
    const answer = screen?.readWatermarkUnlockAnswer?.() ?? ''
    // Not awaited (CS-4). No `isFileOperationWaiting`-like guard: FR-020 caps no
    // tries, and a second press while a digest runs is a person trying again.
    void matchWatermarkUnlock(answer)
    return true
  }

  /**
   * FR-020 -- the answer matched against the digest.
   *
   * On a match the watermark and the surface both go, written into
   * `ScreenState` through `screenStateWithWatermark` (PI-36 of table T-064) and
   * never into the document (FR-020, S-144), so the hiding stays out of the undo
   * history too (UN-9) -- an `undo` must not step around the gate.
   * On a mismatch the surface stays up with what was typed and RS-41 of table
   * T-233 is raised. An environment with no digest falls to the mismatch: the
   * safe direction, and table T-233 holds no row for a missing SHA-256 (FR-076).
   *
   * @purity non-pure
   */
  async function matchWatermarkUnlock(answer: string): Promise<void> {
    const given = await sha256HexOf(answer)
    if (given === null || given !== watermarkUnlockDigest()) {
      raiseNotice(WATERMARK_UNLOCK_MISMATCH_REASON, null)
      return
    }
    screenState = screenStateWithWatermark(screenStateWithSurface(screenState, null), false)
    ask()
  }

  /**
   * One file operation's fault raised (FR-076), or let go where table T-233
   * owes it nothing.
   *
   * `fault.what` is dropped: a detail string beside the row would be a word
   * this side wrote (FR-038); the row of table T-233 says which item is wrong.
   *
   * @purity non-pure
   */
  function raiseFileFault(fault: DocumentFileFault): void {
    const reason = NOTICE_REASON_OF_FILE_FAULT[fault.reason]
    // See the census: `cancelled` is the one reason owed nothing.
    if (reason === null) return
    raiseNotice(reason, null)
  }

  /**
   * One refused write raised (FR-076), for both roads of PI-8. No count: the
   * refusal rows of table T-233 follow NT-1, not NT-3.
   *
   * @purity non-pure
   */
  function raiseWriteRefusal(refusal: PlanRefusal | ReplacementRefusal): void {
    // Not the census read directly: WS-3 spells every command's refusal
    // `refused`, and `reasonOfWriteRefusal` narrows it (RS-54 of table T-233).
    const reason = reasonOfWriteRefusal(refusal)
    // See the census: the replacement road's WS-3 is the one refusal table T-233
    // names no row for.
    if (reason === null) return
    raiseNotice(reason, null)
  }

  // ---- The export's own environment ---------------------------------------

  /**
   * The scene PI-21 assembles an export from, for FR-080's base environment,
   * or `null` while BO-1 has settled no size to shrink from.
   *
   * A second run of table T-068, not the frame on screen: the base environment
   * closes parts and gives their room to the schedule, so the rectangles differ
   * (the drift WY-2 and WY-3 of table T-041 catch). Never at the head of a
   * frame: MN-6 of table T-070 runs table T-068 once per frame for NFR-002 and
   * NFR-003, and this runs only when a picture is asked for.
   * Collected into `AgentSnapshot.exportScene` with the rest of the snapshot
   * (R7.4), not handed over to call later: CS-3 of table T-066 makes the call
   * one consistency unit.
   *
   * @purity semi-pure-b
   */
  function exportScene(): ExportScene | null {
    if (!settled(environment)) return null
    const document = held.document
    // The width a closed panel takes is nothing, and taking nothing is the
    // only way PI-35 can be told a panel is not there: its rectangle is cut
    // from the stored width alone. If the specification ever spells "closed"
    // some other way, this line is the one place that has to learn it.
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
    // The same three stages, in the same order table T-077 fixes for a frame.
    const regions = regionsFromScreen(environmentForRegions, withPanelsClosed)
    // OP-10's exception applies to the export exactly when it applies to the
    // screen: it excludes a document opened from BT-4 of table T-034 until
    // another document is opened, not until the frame moves on. Passing `false`
    // here made the export fall to FR-055's fit and seat a different level than
    // the screen, which FR-080 forbids. WY-2 and WY-3 open a JSON and fit it
    // themselves, so they are unaffected.
    // Only `.settings` is needed: the second member is for the press side.
    const settings = viewSettings(
      document,
      withPanelsClosed,
      regions,
      fromStartupTemplate,
      readToday(),
      environment.rowControlsHeightPx,
    ).settings
    // LF-3's row-control floor is carried too, though EP-4 of table T-076 draws
    // no row control: the floor is a rule of the band (table T-221), and shorter
    // bands than the screen's would part the two pictures.
    // S-211 reaches the picture as it reaches the frame (HR-2, HR-1a, LC-1): a
    // head open in the export but folded on screen is two pictures (FR-080).
    // EP-12 of table T-076 does not keep it out -- a fold is not the pointer or
    // the poise that row lists.
    const layout = layoutFromSchedule(
      document.schedule,
      settings,
      regions,
      undefined,
      isLevelZeroFolded,
      environment.rowControlsHeightPx,
    )
    // ST-7's telling is not raised here: this function also answers IF-7's
    // snapshot (R7.4), where nothing was written. The two roads that write raise
    // it after the write (see `stackSafetyCapOfLastExportScene`); the write itself
    // is not refused (FR-080).
    stackSafetyCapOfLastExportScene = layout.stackSafetyCapReached?.groupId ?? null
    // EP-12 of table T-076 and CU-3 of table T-029: the picture is built with no
    // selection, armed shape or guide cursor rather than stripped afterwards --
    // the geometry too, since FR-075's fade grab points are vertices.
    // EP-14 is reached by the 'export' argument below, not through the geometry:
    // FR-043's dummies hang on the document, and stripping them from the geometry
    // would lose GR-17's anchor for the not-started marker EP-5 requires (WY-3 of
    // table T-041).
    const nothingSelected = emptySelection()
    const geometry = geometryFromLayout(
      document.schedule,
      settings,
      layout,
      regions,
      nothingSelected,
    )
    // Started from an empty state rather than the session's, so the palette is
    // closed (EP-11) and nothing a person left open (S-99g) reaches the picture.
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
        // No follow in an export (EP-12); the weekday words still go in, in the
        // language of the person exporting (FR-038).
        null,
        rulerWeekdayWords(language),
        // No pointer, hover or marquee (EP-12, CU-3), spelled out because the
        // list is positional and the watermark stands behind them.
        null,
        null,
        null,
        // EP-7 of table T-076, from the same S-144 the screen was drawn from.
        // Not `stateForExport`: a fresh `ScreenState` answers S-144's default and
        // would put back a watermark the person had taken off the screen.
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
        // Nothing of this session reaches the picture (EP-11, EP-12 of table
        // T-076): no pointer, question, telling, dragged corner, rest or icon,
        // chosen rows or people, or properties panel. `image-exporter.ts` records
        // the tellings from its own side. The `Agent API` is off for the same
        // reason, not because of FR-065.
        sessionOf(document, regions, layout, {
          language,
          // EP-1 of table T-076 draws neither of FR-101's cues; both are this
          // session's.
          openedFileName: null,
          fileSavedAt: null,
          isAgentApiEnabled: false,
          // No surface is open in an exported picture (EP-11).
          isAiExportSurfaceOpen: false,
          // This session's (EP-12); with the API off the field is absent anyway
          // (`dialogue-field.ts` requires both).
          isDialogueFieldVisible: false,
          pointer: null,
          pointerRestedMs: 0,
          iconUnderPointer: null,
          // EZ-6 of table T-040 needs a resting pointer (EP-15).
          taskUnderPointer: null,
          // `false`: nobody dismissed anything; the picture carries no
          // explanation (EP-15).
          isTooltipDismissed: false,
          commandPaletteDraggedTo: null,
          // No row is held (EP-12). EP-3 writes the row at the depth
          // `TaskGroup.parentId` gives: the follow is a picture, never a write
          // (table T-023d).
          rowGrabbedAt: null,
          // Folded when the screen is (FR-080; EP-12 does not name S-211), and
          // with the value the layout was built with: EP-3 draws the
          // `Row Title Tree` off this session and the schedule off the layout, so
          // two answers would fold half of one picture.
          isLevelZeroFolded,
          // S-142 is this session's (EP-12).
          isMilestoneListOpen: false,
          // This session's (EP-12).
          isPaletteMinimised: false,
          // This session's (EP-12).
          isRecordingInteractions: false,
          // Nobody follows in an export (DC-8, EP-12); EP-6 still draws the two
          // lines from the document's `dualCursor` (S-65).
          dualCursorFollowing: null,
          selectedGroupIds: [],
          selectedResourceUids: [],
          propertiesShowing: null,
          propertiesSubject: null,
          confirmation: null,
          // No question stands in an export, so U-61 lays out nothing (EP-12).
          mergeCandidates: [],
          // The unread columns belong to U-61's intake (FR-073); none stands here.
          unreadColumns: [],
          // What an import dropped is this session's (EP-12).
          droppedTaskNames: [],
          notices: [],
          // The two history members are left absent (EP-12): absent reads as not
          // known and draws the entrance as usual, while `false` would put a
          // faint IC-5 into a picture nobody can press.
        }),
      ),
      settings,
      // DR-5 of table T-052 keeps `themeHue` on `Project`, so neither `settings`
      // nor the `ScreenView` carries it, and SingleHtmlShell hands it to
      // ImageExporter (`_source/components.json`). The same expression the frame
      // uses, so the two stay one drawing (FR-080).
      themeHue: document.schedule.project.themeHue,
    }
  }

  // ---- FR-065: the Agent API ----------------------------------------------

  /**
   * The bounds a settings write is judged against that the document does not
   * keep: the zoom's two (S-97 / S-98) and the width FR-052 measures against.
   *
   * One place for FR-052's sum, shared by the screen's writes and the
   * `Agent API` snapshot; `SettingsLimits` forbids rebuilding it from a window
   * width. The widths come from `frame.settingsMeasuredWith`, not
   * `held.document`: the Row Area was cut with FR-072's panel overlay, so a
   * stored S-80 of `0` would leave the sum short by S-171. With no frame the width is `0` (BO-1 of table T-077): reachable only
   * from a snapshot before the first frame, when the `Agent API` cannot yet be
   * installed (IC-20 of table T-109).
   *
   * @purity semi-pure-b
   */
  function settingsLimitsOf(frame: FrameValues | null): SettingsLimits {
    // The widths the frame was measured with, not `held.document`'s: while
    // FR-052's divider is held the `Row Area` was cut from a preview, and adding
    // the stored widths back would drift the sum by the travel (S-171 included).
    // See `FrameValues`.
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

  /**
   * The document a held press would leave behind if the button came up now, or
   * `null` where nothing is held that owes a picture.
   *
   * Nothing new is worked out: the release road of `commandFromInput` (PI-18)
   * is asked with a release at the current point, and its answer is folded onto
   * a copy with `editDocument` (PI-9), so the picture cannot disagree with the
   * write. Only the point is synthetic; CS-2 of table T-066 froze the rest.
   * It settles nothing: `applyDocumentChange` (PI-8) is not on this road, so no
   * undo step, stamp, watcher or autosave (FR-031).
   * A refused write draws the held document, since WS-3 of table T-067 would
   * write nothing on release; keeping the last accepted preview would show a
   * width the release will not produce.
   * @provisional PND-253
   *
   * @purity semi-pure-b
   */
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
    // Starts at the held document, never at the last picture.
    let drawn = held.document
    for (const commands of action.writes) {
      for (const command of commands) {
        const result = editDocument(drawn, command, limits)
        if (!result.ok) return null
        drawn = result.document
      }
    }
    return drawn
  }

  /**
   * FR-065 -- the enabling moved, so whoever places the public point is told,
   * and S-99b of table T-206 is written.
   *
   * Nothing is told when it did not move: telling twice would have the
   * installer place the name over a reference it had already handed out.
   * The stored spelling is the language's own boolean text, which
   * `startupAgentApiEnabled` reads back; S-99b fixes no spelling.
   *
   * @purity non-pure
   */
  function setAgentApiEnabled(next: boolean): void {
    if (next === isAgentApiEnabled) return
    isAgentApiEnabled = next
    writeBrowserStored('S-99b', String(next))
    agentApiEnablingWatch?.(next)
  }

  /**
   * IF-7 of table T-065 (UF-48 of table T-075).
   *
   * Everything is read at one instant from what this loop holds: CS-3 of table
   * T-066 makes an `Agent API` call one consistency unit (AG-4 of table T-035).
   * Freezing is `snapshot-source.ts`'s: freezing values here would freeze the
   * ones this loop is about to replace.
   */
  const snapshotSource: AgentApiSeams['source'] = {
    /** @purity semi-pure-b */
    readSnapshot() {
      // Read once, so the picture and the bounds come from the same frame.
      const frame = values
      return {
        document: held.document,
        selection,
        dialogue: dialogueLog,
        // Computed at the head of this frame (ADR-001), not run again per call.
        // What a frame was measured with is this loop's bookkeeping, not PI-19's.
        frame,
        exportScene: exportScene(),
        isGestureInFlight: isDocumentChangingPress(pressed),
        // AG-9's second half, answered from IF-9. It becomes
        // `WriteMoment.editingInPlace` on the `Agent API`'s write
        // (`writeThroughTheOnePath`) and the gate on AM-13's picture.
        isEditingInPlace: hasUnsettledTextEntry(),
        historyLimits: HISTORY_LIMITS,
        settingsLimits: settingsLimitsOf(frame),
        // The wall clock: AT-129 is a moment, and R3.6 sends only elapsed time to
        // a monotonic clock.
        readAt: readInstantOfWrite(),
      }
    },
  }

  /**
   * PI-16's two seams for `postDialogueMessage`; LY-5 of table T-060 leaves the
   * log with this layer (FR-066).
   *
   * The frame asked for is FT-5 of table T-078, delivered by CP-16 through
   * `deliver`. Watchers are woken through this loop's one audience
   * (`notifyChangeWatchers`, PI-15) with the schedule declared unmoved, since
   * AG-11 of table T-035 counts an utterance in its own order.
   */
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
        // The argument is not read: the holder was replaced first (CP-16), so
        // what this loop holds is the same log.
        audience.deliver(held.document, false)
        if (settled(environment)) ask()
      },
    },
  }

  // ---- FT-1 of table T-078 ------------------------------------------------

  /**
   * CS-2 of table T-066 -- what the gesture is about, frozen at the press.
   *
   * `on` is handed in so IF-9 is read once per happening (R7.4); asking again
   * here would be a second moment. `semi-pure-b` because `pressRow` reads two
   * current values of this loop (R7.1), read here so every member of the press
   * is frozen at the one moment CS-2 names.
   *
   * @purity semi-pure-b
   */
  function collectPress(at: PointerInput, frame: FrameValues, on: ScreenPart | null): PointerPress {
    // The plain press must not see table T-023d's double-click-only rows (GR-10),
    // or a name label swallows the press GR-12 needs; a second click asks for
    // the double-click reading, or MK-13 loses the label it opens. The click
    // count is the framework's to read (LY-5 of table T-060).
    const resolving = at.clickCount >= 2 ? 'doubleClick' : 'press'
    // No hit when the surface answered or outside the `Row Area`: the note under
    // table T-023a limits the decision order to the drawing area, and the Row
    // Area's paint is clipped, so a bar left of `scrollDate` is not drawn under
    // the Row Title Panel however far the geometry runs.
    const hit =
      on === null && regionAtPointer(frame.regions, at.x, at.y) === 'rowArea'
        ? itemAtPointer(frame.geometry, at.x, at.y, POINTER_SLOP, resolving)
        : null
    // Asked of the side that owns table T-023a and carried on the press:
    // `collectWriteMoment` tells a pan (PTD-1) from a marquee (PTD-5), and R2.7
    // forbids reading that table twice. Narrowed arguments, because no whole
    // `PointerPress` exists until this answers.
    const pressRow = pressRowOf({ at, hit }, { screenState, dualCursorFollowing })
    // FR-053 and HF-15: this shell follows and remembers the axis, so
    // `followedTo` starts at the press point and `rowGrabAxis` undecided (see
    // those members). Filled for every press, since the members describe the
    // caller, not the gesture; `followedTo` is the one member CS-2 does not freeze.
    return { at, hit, on, pressRow, followedTo: { x: at.x, y: at.y }, rowGrabAxis: null }
  }

  /**
   * What table T-023d claims where the pointer now stands (`itemAtPointer`,
   * PI-7), or `null` where no row of it does.
   *
   * Asked once per happening and read by both IN-2's shape and FR-048's
   * judgement (R7.4). It is the one hit test asked without a press, so on every
   * move: the constant-time refusals below keep the scan off points outside the
   * `Row Area` and on drawn entries (NFR-013).
   *
   * @purity semi-pure-b
   */
  function grabAtPointer(
    frame: FrameValues,
    x: number,
    y: number,
    on: ScreenPart | null,
  ): Grabbed | null {
    // The note under table T-023a limits the decision order to the drawing
    // area, and a point the screen surface answered is on a part drawn over it.
    if (on !== null) return null
    // The `Schedule Canvas` is wider than the `Row Area`, and every target
    // of table T-023d is drawn inside the latter.
    if (regionAtPointer(frame.regions, x, y) !== 'rowArea') return null
    // PTD-2 turns hit testing off while the `Dual Cursor` is up, so the table
    // is not asked at all rather than asked and its answer thrown away.
    if (dualCursorFollowing !== null) return null
    // The press reading (the default): IN-2's shape says what a press would do,
    // and a double-click-only row does not answer one (table T-023d).
    return itemAtPointer(frame.geometry, x, y, POINTER_SLOP)
  }

  /**
   * IN-2 of table T-028 -- the pointer's shape where it now stands, or `null`
   * for a place that row does not name.
   *
   * In table T-023a's order, top row first, so the shape promises what a press
   * would do. `grabAtPointer`'s refusals are restated because its `null` also
   * means empty canvas, where PTD-5 gives a shape. No frame is asked: the host
   * paints the pointer, so the shape is written straight out.
   *
   * @purity semi-pure-b
   */
  function pointerShapeAt(
    frame: FrameValues,
    x: number,
    y: number,
    on: ScreenPart | null,
    hit: Grabbed | null,
  ): PointerShape | null {
    // PTD-1: IN-2 names the shape while panning, so the press in flight is read,
    // not the modifiers of a move that presses nothing.
    if (pressed !== null && pressed.pressRow === 'PTD-1') return 'grabbing'
    // STOP -- IN-2 names no shape for an entry, a part drawn over the drawing
    // area (the note under table T-023a).
    if (on !== null) return null
    // STOP -- nor for the ruler, the panels or the padding: every place IN-2
    // names is inside the `Row Area`.
    if (regionAtPointer(frame.regions, x, y) !== 'rowArea') return null
    // STOP -- PTD-2 turns hit testing off, and IN-2 names no shape for the
    // `Dual Cursor` mode.
    if (dualCursorFollowing !== null) return null
    // PTD-3. The shape per grab is the table above; rows IN-2 names nothing for
    // answer `null` there.
    if (hit !== null) return POINTER_SHAPE_BY_GRAB[hit.grab]
    const armed = screenState.armed
    // PTD-5 -- nothing hit and nothing armed. IN-2 gives this place a shape, and
    // `'default'` is how `PointerShape` spells it; `null` would say it has none.
    if (armed.kind === 'none') return 'default'
    // STOP -- PTD-4a does nothing on empty canvas (it does not even disarm), and
    // IN-2 names no shape for that.
    if (armed.kind === 'dependency') return null
    // PTD-4 -- a figure or an annotation is armed, and a press would make it.
    return 'copy'
  }

  /**
   * IF-9's fifth answer, or `false` where no screen surface was wired.
   *
   * Asked, never held: focus moves without any happening of table T-078, so a
   * cached value would be stale when it mattered. Without a surface no field
   * was drawn, so `false` is the absence rather than a guess.
   *
   * @purity semi-pure-b
   */
  function hasUnsettledTextEntry(): boolean {
    return screen === undefined ? false : screen.surface.hasUnsettledTextEntry()
  }

  /**
   * Whether the write being made right now is the settling of a property field.
   *
   * Held for one call: `collectWriteMoment` reads it (see the note there). A
   * flag rather than an argument because `writeDocument` is the one write path
   * (MS-1 of table T-042), and a parameter would burden every other caller.
   */
  let isSettlingFieldCommit = false

  /**
   * Which field a press has asked to put the caret in (MK-13 among them), as a
   * row id, or `null` while nothing is waiting.
   *
   * Held across one frame: the control does not exist until the description
   * has gone out over IF-9, and `runFrame` spends it after that. Not a queue:
   * a later ask replaces an earlier one. A row id and not a flag because
   * several fields are asked for this way; IF-9's row id is not limited to
   * table T-016's rows.
   */
  let nameFieldWantedRow: string | null = null

  /**
   * The Task FR-091's one-press clause is about -- the one this loop has just
   * made and put a name field on -- and `null` at every other instant.
   *
   * The clause is limited to the Task just created, while FR-072 still keeps
   * the selection on a later rename; this uid is the one fact that tells the
   * two apart. A Task and not a row: HF-14 of table T-051 asks for nothing like
   * it, so `standOnWhatWasCreated`'s other branch does not set it. The arming
   * is not touched (FR-091, table T-023b).
   */
  let namingCreatedTaskUid: number | null = null

  /**
   * Ends FR-091's just-created scene the moment the selection becomes anything
   * other than what this loop just made.
   *
   * Written once and called from both places that replace the selection:
   * `selectionFromInput` on every happening, and where the holder swaps the
   * document (table T-023c's closing rule; an undo that removes the new Task).
   *
   * @purity non-pure
   */
  function endCreatedNamingIfChosenMoved(was: Selection): void {
    if (selection !== was) namingCreatedTaskUid = null
  }

  /**
   * The row HF-17 has just stood up and owes a look at, or `null`.
   *
   * Held across one frame: whether the row is drawn is a question about the
   * frame after the write. A row id and not a flag, since the anchor has to
   * name the row.
   */
  let addedRowOwedSight: string | null = null

  /**
   * The reasons of the tellings standing when the happening being carried out
   * now arrived, before `spendFieldCommit` settled anything.
   *
   * SK-19 and NT-8 ask about the instant the key arrived; by the time either
   * ladder is read, `raisedNotices` may hold a telling this press raised (a
   * refused settling), and an `Enter` would put its own answer away unread.
   * Held for one happening, like `didSettleFieldEntry`. Reasons rather than the
   * tellings: `raiseNotice` gathers a repeat into a new object (NT-3), so an
   * identity taken at arrival would stop matching. Typed `string` because that
   * is what `RaisedNotice.reason` is on the seam (PI-33).
   */
  let noticeReasonsOnArrival: ReadonlySet<string> = new Set<string>()

  /**
   * Whether the happening being carried out now arrived with an in-place edit
   * standing, which `spendFieldCommit` settled at its head.
   *
   * Read only by SK-19's second stage, which asks about the moment the `Enter`
   * arrived; asking the surface in `carryOutAction` would answer about the
   * moment after. Held for one happening. `repeatHeldEntry` reaches
   * `carryOutAction` without passing that head, but it answers a held pointer
   * and `settleTextEntry` is reached only by a key.
   */
  let didSettleFieldEntry = false

  /**
   * Everything the three members of PI-18 read besides the happening itself.
   *
   * @purity semi-pure-b
   */
  function collectInputContext(
    frame: FrameValues,
    // Stated by `receiveInput`, where `spendFieldCommit` may already have raised
    // a telling (see `noticeReasonsOnArrival`); the default serves the callers
    // asked before anything of the happening ran.
    isNoticeStanding: boolean = raisedNotices.length > 0,
  ): InputContext {
    // Cut once: `ScreenSession.rowBoxes` makes the same call, and CS-1 of table
    // T-066 froze the frame, so both members are owed one reading (R7.4).
    const drawnRowBoxes = drawnRowBoxesOf(frame.layout, frame.regions)
    return {
      // ADR-001's three, computed once at the head of this frame.
      document: held.document,
      layout: frame.layout,
      geometry: frame.geometry,
      regions: frame.regions,
      screenState,
      selection,
      zoomStep: NOT_STORED_ZOOM_STEP['S-96'],
      zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
      zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
      // OP-10 of table T-024a, answered by the side that drew the picture: the
      // BT-4 exception is invisible from the zoom the press side steps from.
      isPictureAtStoredZoom: frame.isPictureAtStoredZoom,
      // LF-3's floor as the surface measured it: FR-055's fit reruns the layout
      // and must use the frame's floor. Spread rather than `undefined` because
      // of `exactOptionalPropertyTypes`.
      ...(environment.rowControlsHeightPx === undefined
        ? {}
        : { rowControlsHeightPx: environment.rowControlsHeightPx }),
      pressed,
      // Asked of the side that drew the fields (IF-9 of table T-065). Read by
      // IN-5a, IN-4's first level and WS-2 of table T-067 (AG-9); one truth value
      // and not the field (under table T-065).
      isTextEntryUnsettled: hasUnsettledTextEntry(),
      // S-99h of table T-206, which SK-19's second stage reads (LY-5).
      // The member is optional, so dropping this line compiles and silently
      // disables that stage; only the spec-driven tests watch it.
      isPropertiesPanelShowing: isPropertiesPanelOnScreen(),
      // NT-8 of table T-037, read by SK-19's and IN-4's first stage. Asked of
      // `raisedNotices`, the holder (LY-5), not the drawn screen, and as of the
      // moment the happening arrived (see the parameter).
      isNoticeStanding,
      // FR-029: off the same cut the renderer draws, so the side that draws an
      // entrance faint and the side that answers its press count one set of
      // rows, and HF-15 compares the pointer with the boxes the person sees.
      // Optional and silently forgettable, like `isPropertiesPanelShowing`:
      // without it the press side falls back on the whole roster.
      drawnRowGroupIds: drawnRowBoxes.map((one) => one.groupId),
      // HF-15's up-and-down walk reads the order of places off these boxes,
      // which the ids alone cannot carry. Optional and silently forgettable.
      drawnRowBoxes,
      // S-211 of table T-206. The picture cannot say it: an empty panel is a
      // folded head (HR-2) or a document with no rows, and IC-74 / IC-78 answer
      // the two differently. Optional; absent reads as not folded.
      isLevelZeroFolded,
      // Table T-023's closing rule: both halves, since only the shell sees the
      // open surface and NT-7's `asking` (LY-5).
      isSurfaceStanding: screenState.surface !== null || asking !== null,
      dualCursorFollowing,
      today: readToday(),
      // AT-51 is a UUID and minting one is not pure, so the translator is handed
      // it. Minted per context; an unused one costs nothing.
      newGroupId: crypto.randomUUID(),
      // AT-110 (AR-5 of table T-023b), minted the same way.
      newCommentBoxId: crypto.randomUUID(),
      // AT-116 (AR-6 of table T-023b), minted the same way.
      newHighlightBoxId: crypto.randomUUID(),
    }
  }

  /**
   * WS-2's three questions, answered from what this loop holds at the moment
   * the write is asked for.
   *
   * Not a constant: `receiveInput` drops the press only on the release or IN-1's
   * abort, so a key happening mid-drag finds it set, and WS-2 is where AG-9's
   * guard lives (`commandFromInput` puts none on SK-3).
   * Only document-changing presses count: AG-9 spares the pan (PTD-1) and the
   * range selection (PTD-5), which the press carries as `pressRow` (R2.7).
   * `on` is read before the row: a press on an entry is not one of table
   * T-023a's gestures and may change the document, so reading the row first
   * would hand every palette press PTD-5's exemption.
   * `editingInPlace` exempts the one write that is the settling: with Enter the
   * control is still held, and refusing would lose the edit (`readFieldCommit`
   * takes the commit). Every other road still meets AG-9 with the field held.
   * `deliveringNotices` is `apply-document-change.ts`'s to answer; answering it
   * here too would count WS-7's window twice.
   *
   * @purity semi-pure-b
   */
  function collectWriteMoment(): WriteMoment {
    return {
      gestureInFlight: isDocumentChangingPress(pressed),
      editingInPlace: !isSettlingFieldCommit && hasUnsettledTextEntry(),
      deliveringNotices: false,
    }
  }

  /**
   * WS-6 and WS-7, through the one write path CP-8 allows (MS-1 of table T-042):
   * with two entrances, one ends up with validation or history the other lacks.
   *
   * @purity non-pure
   */
  function writeDocument(commands: readonly DocumentCommand[], frame: FrameValues): void {
    // FR-052's sum, from the one place that works it out.
    const settingsLimits = settingsLimitsOf(frame)
    const outcome = applyDocumentChange(
      {
        commands,
        // WS-1 matches the stamp just read, so it matches; passed rather than
        // skipped so this path has the same gate AG-2 gives the `Agent API`.
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
      // FR-100. A refused write moved nothing, so nothing is unsaved.
      hasUnsavedEdits = true
      // FR-012: only CM-39 (`setCalendar`) fills this member, so the count both
      // names the occasion and is the occasion. The recount is already inside
      // the same write; this is only the telling (table T-233). Zero raises
      // nothing -- it would report a change that did not happen.
      const recounted = outcome.report.recountedTaskUids.length
      if (recounted > 0) raiseNotice(RECOUNTED_PERCENT_COMPLETE_REASON, recounted)
      return
    }
    // FR-076: the refusal is a value (FR-028) naming the step of table T-067;
    // the row goes over, never words (FR-038).
    raiseWriteRefusal(outcome.refusal)
  }

  /**
   * One row of table T-230, taken through the same write path (`replaceDocument`
   * of PI-8) as any other write.
   *
   * The shell names the row and brings nothing else: history, stamp and undo
   * step are the road RD-1 and RD-2 ask at WS-3. Answers whether the row
   * landed, for the caller with work after acceptance (FR-015's caution); a
   * refused row has already had its telling raised here.
   *
   * @purity non-pure
   */
  function replaceHeldDocument(call: ReplacementCall): boolean {
    const outcome = replaceDocument(
      {
        // The stamp the document carries now, as in `writeDocument` (AG-2). Not
        // the incoming document's stamp: table T-230 forbids that comparison,
        // and it would refuse every replacement.
        readStamp: held.document.documentStamp,
        moment: collectWriteMoment(),
        call,
      },
      holder,
      audience,
    )
    // FT-2 of table T-078; `ask` coalesces with FT-1's, so the press paints once.
    if (outcome.accepted) {
      // The preview was folded onto the document just replaced. This road is
      // also reached outside a happening (IF-7's `holdDocument`, OP-2's read),
      // where nothing else clears it; a replacement on a happening (SK-6's undo)
      // has the preview worked out again at the end of `receiveInput`.
      previewDocument = null
      // The `Agent API` stays on across a replacement: FR-065 remembers the
      // enabling per origin, not per document.
      // FR-100: RD-4, RD-6 and RD-7 put up a document from a file or the bundled
      // template (FR-095), so nothing is unsaved; undo, redo and merge leave
      // edits no file has been told about.
      hasUnsavedEdits = call.row !== 'RD-4' && call.row !== 'RD-6' && call.row !== 'RD-7'
      // OP-10: opening another document lifts the exception; undo, redo and a
      // merge leave the same document standing (the history column of table
      // T-230).
      if (call.row === 'RD-4') fromStartupTemplate = false
      // RD-7 puts up the BT-4 template (FR-095), so OP-10's exception is back on;
      // left at the boot's value, a person who opened a file and then pressed
      // IC-98 would get FR-055's fit on the bundled template.
      if (call.row === 'RD-7') fromStartupTemplate = true
      if (settled(environment)) ask()
      return true
    }
    // FR-076, as in `writeDocument`.
    // STOP -- `importRefused` reaches nobody: table T-233's WS-3 row is written
    // for a dropped bundle of commands (see `NOTICE_REASON_OF_WRITE_REFUSAL`).
    raiseWriteRefusal(outcome.refusal)
    return false
  }

  /**
   * DI-4 of table T-227: the overwrite question, put up and waited on.
   *
   * `Confirmation` (U-55 of table T-103) with NT-7's two answers; OP-3's three
   * have U-56. The item list is empty because DI-4 does not ask for one (see
   * `RaisedConfirmation.items`). The sentence is QN-4 of table T-234, named
   * rather than written (FR-038, FR-076). The frame is FT-1's continuation of
   * the press that began the save (NFR-010).
   *
   * @purity non-pure
   */
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

  /**
   * OP-3 of table T-024a: put the three-way question up and wait for one of the
   * three to be taken.
   *
   * This side names the surface (U-56) and nothing else: table T-109's surface
   * column, generated into `icon-roster.json`, places IC-71 .. IC-73 and UF-66
   * reads it. No words are written here (FR-038). S-99g holds one surface, so
   * whatever stood open gives way. The frame is FT-1's continuation, as in
   * `askToWriteOverDestination`.
   *
   * @purity non-pure
   */
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

  /**
   * FR-022: lay out the tasks that could correspond, then wait for one of table
   * T-032a's answers on U-61 `Difference Review`.
   *
   * Divided as in `askHowToOpen`: table T-109 places IC-95 .. IC-97 and
   * `MERGE_MAPPING_OF_ENTRY` maps them to table T-032a. No words here (FR-038);
   * the listed names are the documents' own values. The candidates are PI-10's
   * (`importDocument`); pairing again here is what R2.7 refuses. S-99g holds one
   * surface; the `Open Chooser` was already closed by the entry that answered it.
   *
   * @purity non-pure
   */
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

  /**
   * OP-4 of table T-024a: the confirmation owed before a replace throws the
   * current document away.
   *
   * NT-7's manner, naming the one thing that goes: the current document, by its
   * own value (AT-3), which FR-038 leaves untranslated. The sentence is QN-5 of
   * table T-234 (FR-038). The document is an argument because the question is
   * about what CS-4 collected, not what the wait left behind.
   *
   * @purity non-pure
   */
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

  /**
   * FR-095 -- confirm as OP-4 does, then return to BT-4's state.
   *
   * The same `askToDiscardCurrentDocument` as OP-2's replace: table T-234 gives
   * FR-095 no row of its own, so the two cannot drift. CS-4's shape: the
   * document and the template are taken before the wait, and the landing is
   * `replaceHeldDocument` (CS-3). Cancelling leaves everything, since nothing
   * was written before the question.
   *
   * @purity non-pure
   */
  async function startNewDocument(template: Document): Promise<void> {
    if (!(await askToDiscardCurrentDocument(held.document))) return
    // RD-7 of table T-230 (a caller names its own row). Not RD-6: the two rows'
    // history cells differ, and OP-4 settles the history for this road.
    replaceHeldDocument({ row: 'RD-7', document: template })
  }

  /**
   * FR-023: after an import, list the dropped `Task` names on U-62
   * `Import Report` of table T-103.
   *
   * A surface, not a telling: NT-9 of table T-037 limits a telling to one line,
   * and `RaisedNotice` has no member for a name. Not a `Confirmation` (U-55):
   * U-62 asks nothing. Nothing is raised when nothing was dropped.
   * The names sit beside `mergeCandidates` and the surface in S-99g, so IN-4 of
   * table T-028 reaches it without a way out written here.
   *
   * @purity non-pure
   */
  function tellWhatTheImportDropped(names: readonly (string | null)[]): void {
    if (names.length === 0) return
    droppedTaskNames = names
    screenState = screenStateWithSurface(screenState, IMPORT_REPORT_SURFACE)
  }

  /**
   * OP-2 of table T-024a -- one file, taken along that table's road: OP-12 picks
   * the decoder, OP-5 validates, OP-3 asks, OP-4 confirms a replace, and table
   * T-230 lands the answer.
   *
   * CS-4's shape, as in `saveHeldDocumentToFile`: what the operation needs from
   * the current values is taken before the first `await`, so OP-5's bounds and
   * MSPDI's presentation group are those in force when the person asked. The
   * landing reads the holder again inside `replaceDocument` (CS-3): a merge on a
   * document read before the question would drop edits made while it stood.
   * Every step that cannot go on returns before the document is touched (OP-5).
   * Nothing is caught: FR-028 forbids throwing, and a store that throws has
   * broken IF-3's contract.
   *
   * @purity non-pure
   */
  async function openDocumentIntoHold(
    store: FileStore | null,
    route: OpenRoute,
    handed: HandedImport | null = null,
  ): Promise<boolean> {
    // CS-4: collected at the moment the operation begins, and not read again.
    const current = held.document
    // The bounds in force, never the arriving file's (`ImportBounds`): OP-5 runs
    // before OP-3, and a file's own would let it raise its own ceiling (NFR-009).
    const bounds: ImportBounds = current.documentSettings

    // Only the reading side differs between a person's press (a `FileStore`) and
    // AM-8 of table T-107 (a handed document). Everything after this branch is
    // one road for both (FR-028); a copy for the machine would drift.
    let handedIn: { readonly format: ExchangeFormat; readonly byteLength: number } | null = null
    let incoming: Document
    // FR-073: what this intake could not read, from whichever reading side ran;
    // weighed once below the branch.
    let couldNotBeRead: readonly string[] = []
    if (handed !== null) {
      // No OP-12 check: AM-8 hands a value, which has no extension. What the
      // value must be is checked on the other side of the seam.
      handedIn = { format: handed.format, byteLength: handed.byteLength }
      incoming = handed.incoming
      couldNotBeRead = handed.unreadColumns
    } else if (store === null) {
      // Neither a store nor a handed document is nothing to open.
      return false
    } else {
      const opening = await openDocumentFile(store, route)
      if (!opening.ok) {
        // FR-076 (MUST): the same road `saveHeldDocumentToFile` takes one over.
        raiseFileFault(opening.fault)
        return false
      }
      // OP-11: a caution (NT-5, table T-233), so the open goes on. The count
      // rides on `affectedCount`, the one member of `RaisedNotice` a number can
      // travel on, though it is documented against NT-3.
      if (opening.ignoredFileCount > 0) {
        raiseNotice(IGNORED_FILES_REASON, opening.ignoredFileCount)
      }
      const file = opening.file

      // OP-12: extension and first non-blank character must name the same row
      // of table T-024.
      const reading = formatFromFile(file.fileName, file.text)
      if (!reading.ok) {
        // FR-076: `reading.mismatch` says which side disagreed (NT-1).
        raiseNotice(NOTICE_REASON_OF_FORMAT_MISMATCH[reading.mismatch], null)
        return false
      }
      const decoded = decodedDocument(reading.format, file.text, current)
      // STOP -- a codec's fault reaches nobody: table T-233 holds no row for one
      // (FR-076); see `decodedDocument`.
      if (decoded === null) return false
      handedIn = { format: reading.format, byteLength: file.byteLength }
      incoming = decoded.document
      // RS-51: settings clamped on the read road; the open goes on (NT-5) and the
      // count rides on `affectedCount`, as `IGNORED_FILES_REASON` above does.
      // Not the keys: no surface of the specification shows which ones moved.
      if (decoded.clampedCount > 0) {
        raiseNotice(SETTINGS_CLAMPED_REASON, decoded.clampedCount)
      }
      couldNotBeRead = decoded.unreadColumns
    }
    const readIn = handedIn

    // FR-073 -- the surface is U-61 and `RS-48` the reason it carries, as U-62
    // carries `RS-50`. Not the `Notification Area`: a telling raised while U-61
    // stands is drawn over IC-95, which then cannot be pressed.
    // The list selects the telling, not the version reading: the codec answers
    // an empty list for every reading but `newerThanKnown`. The open goes on.
    //
    // STOP -- an intake that raises no U-61 (a replace, an overlay, or a merge
    // PI-10 found nothing to pair) is still not told: U-61's row gives FR-073 a
    // continue / stop choice, but table T-109 places only IC-95 .. IC-97 on that
    // surface. Nothing is invented. Searched: FR-073, FR-022, table T-103 `U-61`,
    // table T-109, table T-032a, table T-024a `OP-3`.
    if (couldNotBeRead.length > 0) unreadColumns = couldNotBeRead

    // OP-5: FR-023's validation, whatever the route and before OP-3.
    const verdict = validateImportedDocument(
      {
        document: incoming,
        // S-113 is in megabytes and measured in bytes, hence the byte length.
        byteLength: readIn.byteLength,
        // STOP -- no codec answers this: `ImportCandidate.emptyRowTaskUids`
        // records that docs/spec says neither how such a row is recognised nor
        // where it is held, and PI-20 of table T-064 publishes nothing reporting one.
        emptyRowTaskUids: [],
      },
      bounds,
    )
    // FR-023's dropped rows, worked out before anything is deleted so the names
    // told at the end are the file's. Nothing is asked here (FR-023).
    const droppedSeeds = verdict.ok
      ? NO_DROPPED_SEEDS
      : taskUidsWithAnUnusableDate(verdict.refusals, incoming.schedule.tasks)
    // FR-023: dropped rows follow CD-1 of table T-050, which `deleteTask`
    // carries. Names are read off the cascade, not the seeds, since a dropped
    // descendant is a dropped `Task`. Walked in file order against one index
    // (NFR-013): a `find` per dropped row would be O(n^2) on a large input.
    const droppedNames: (string | null)[] = []
    const lost = tasksLostWith(incoming.schedule.tasks, droppedSeeds)
    for (const task of incoming.schedule.tasks) {
      if (lost.has(task.uid)) droppedNames.push(task.name)
    }
    for (const uid of droppedSeeds) {
      // A seed an earlier deletion already took is skipped: CD-1 reaches WBS
      // descendants, and CM-7 would refuse the missing `Task`.
      if (!incoming.schedule.tasks.some((one) => one.uid === uid)) continue
      // `settingsLimitsOf(null)`: a deletion reads neither the zoom bounds nor
      // the `Row Area` width, and no picture need be drawn yet.
      const result = editDocument(incoming, { kind: 'deleteTask', uid }, settingsLimitsOf(null))
      // A refused deletion leaves the input as it was; the re-judgement below
      // then turns the open away (OP-5).
      if (!result.ok) continue
      incoming = result.document
    }
    // OP-5: the mended input is judged again by the same rules, so an unusable
    // date outside a `Task` row (project, assignment, comment box) and FR-023's
    // other refusals stay exactly as strict.
    const afterDropping =
      droppedNames.length === 0
        ? verdict
        : validateImportedDocument(
            { document: incoming, byteLength: readIn.byteLength, emptyRowTaskUids: [] },
            bounds,
          )
    if (!afterDropping.ok) {
      // STOP -- these refusals reach nobody because none can be keyed. Table
      // T-233 leaves FR-023's refusals to table T-220's own ids, and:
      //   1. docs/spec names no section of FR-038's dictionary for table T-220's
      //      rows, nor how a row and a column reach the words;
      //   2. `tools/generate_display_words.py` refuses a table it does not know;
      //   3. `notices.ts` reads reasons from `displayWords.reasons` alone and
      //      falls back to `RS-15`;
      //   4. `RaisedNotice` has no member a row or a column can travel on.
      // FR-023's date refusals on `Task` rows are not in this gap: they are
      // dropped above and told on `RS-50`. `raiseNotice` is not widened to carry
      // `IV-14`: FR-076 bars a reason table T-233 does not hold.
      return false
    }

    // FR-088: IV-17 of table T-220, asked of `scheduleViolations` (PI-1).
    // Refused before the input becomes current: `schedule.ts` throws
    // `NoWorkingDayReached` on such a calendar, and this loop draws from the
    // document it holds. Before OP-3 for OP-5's reason. Judged on the arriving
    // document and its own settings, not `bounds` (the ceilings in force).
    // Only this row refuses (see `NO_WORKING_WEEKDAY_INVARIANT`). Judged on all
    // three of OP-3's answers although a merge lands a calendar PI-10 picks:
    // after the write there is no moment left to refuse, so the stricter
    // reading is taken.
    const noWorkingWeekday = noWorkingWeekdayReason(incoming)
    if (noWorkingWeekday !== null) {
      raiseNotice(noWorkingWeekday, null)
      return false
    }

    // OP-13: a re-read settles the replace without U-56, so `Ctrl` + `R` is not
    // the same as opening; OP-4 below still runs. AM-8 settles the choice too:
    // FR-022 keeps the choices away from the caller, so `HandedImport.choice`
    // carries what the entrance means and U-61 is still where a person answers.
    const choice =
      handed !== null
        ? handed.choice
        : route === OPEN_ROUTE_REOPEN
          ? OPEN_CHOICE_OF_REOPEN
          : await askHowToOpen()
    // OP-3: an unanswered question leaves the document unchanged.
    if (choice === null) return false

    // OP-4: only the replace asks, and it asks on every replace, since the row's
    // rule carries no condition. Skipping it would also make PI-10's
    // `unsavedEditsDiscardConfirmed` claim a confirmation nobody gave.
    const isDiscardConfirmed =
      choice === 'replace' ? await askToDiscardCurrentDocument(current) : false
    if (choice === 'replace' && !isDiscardConfirmed) return false

    // What PI-10 is brought, minus what table T-230 fills in: `current` (CS-3's
    // one read) and the choice.
    const importing = {
      incoming,
      format: readIn.format,
      // OP-5 passed above, and this side never claims it did not run.
      validationPassed: true,
      // OP-8 is kept at the entrance, so none is running but this one; `true`
      // would refuse this very open.
      anotherOpenInProgress: false,
      unsavedEditsDiscardConfirmed: isDiscardConfirmed,
      // `null` ("not answered"): the merge road asks PI-10 with it to learn
      // whether FR-022 has candidates to lay out; the answer replaces it later.
      //
      // STOP -- MG-4's and MG-12's questions are unput: MG-9 forbids asking them
      // per key but not per subject, and table T-109 places no entry for either
      // on U-61, so a merge with a profile or `documentSettings` conflict is
      // refused by PI-10 and the refusal reaches nobody (`importRefused`, see
      // `NOTICE_REASON_OF_WRITE_REFUSAL`). A row of table T-233 is what is owed.
      merge: null,
      defaultSettings: DEFAULT_DOCUMENT_SETTINGS,
      // AT-109, one per import; minting one is not pure, so PI-10 takes it.
      importSessionId: crypto.randomUUID(),
    }

    // RD-4 of table T-230 -- OP-3's replace; history and stamp are that row's.
    if (choice === 'replace') {
      const replaced = replaceHeldDocument({ row: 'RD-4', importing: { ...importing, choice } })
      // FR-023: told only when the write went through.
      if (replaced) tellWhatTheImportDropped(droppedNames)
      return replaced
    }
    // RD-3 -- the merge and the overlay: the one row whose stamp advances and
    // whose WS-4 can owe a step, hence the bounds and stamp fields.
    // STOP -- OP-9 is not kept for every file: `baselinedDocument` (PI-10) keeps
    // only tasks whose `UID` a current task carries, so a file sharing none
    // lands an empty frame. Which of OP-9's frame and FR-015's pairing is the
    // narrower is not this file's to settle.
    //
    // FR-022: PI-10 is asked whether there is anything to ask (pure, so a run
    // with `merge: null` changes nothing); its `mappingNotChosen` refusal carries
    // the candidates, and pairing here would repeat PI-10's judgement (R2.7).
    // MG-2 asks only when there are candidates. Other refusals are left to
    // `replaceHeldDocument`. The overlay is not asked (OP-9, FR-015).
    let mergeAnswers: MergeChoices | null = null
    const asked =
      choice === 'merge' ? importDocument({ ...importing, choice, current: held.document }) : null
    if (asked !== null && !asked.ok && asked.refusal.reason === 'mappingNotChosen') {
      const mapping = await askWhichFileToTakeFrom(
        // Carried, never re-derived: the pairing is PI-10's (FR-022, MG-1).
        asked.refusal.candidates.map((candidate) => ({
          currentUid: candidate.currentTaskUid,
          incomingUid: candidate.incomingTaskUid,
          currentName: candidate.currentTaskName,
          incomingName: candidate.incomingTaskName,
        })),
      )
      // FR-022: an unanswered surface settles nothing; no write has happened, so
      // MG-6 holds.
      if (mapping === null) return false
      // MM-4 of table T-032a: stopped here, as `cancelled` is in
      // `NOTICE_REASON_OF_FILE_FAULT`, since no telling is owed. Handed to PI-10
      // it would end silent anyway (`importCancelled`, then `importRefused`,
      // then `null`). No write has happened, so MG-6 holds.
      if (mapping.kind === 'cancelImport') return false
      // MG-4 and MG-12 stay unanswered (`null` in `MergeChoices`).
      mergeAnswers = { mapping, profileConflict: null, settingsConflict: null }
    }

    // Taken here so the overlay telling below is about the same import:
    // `replaceDocument` reads the holder with no `await` in between (CS-3).
    // Not `current`, which is CS-4's read from before the waits.
    const importedAgainst = held.document
    const landed = replaceHeldDocument({
      row: 'RD-3',
      importing: { ...importing, choice, merge: mergeAnswers },
      historyLimits: HISTORY_LIMITS,
      editedBy: EDITED_BY_SCREEN,
      updatedUtc: readInstantOfWrite(),
    })

    // FR-023, on the merge / overlay road: the rows were dropped from the
    // arriving document before either choice was put.
    if (landed) tellWhatTheImportDropped(droppedNames)

    // FR-015 / OP-9: the overlay's undrawn tasks are told on RS-16 of table T-233
    // (FR-076), and only once the overlay landed: `baselineTaskUidsNotDrawn` is
    // the overlay's member, and a refused row was told by `replaceHeldDocument`.
    if (!landed || choice !== 'baseline') return landed

    // PI-10 is asked a second time because `ReplaceOutcome` (PI-8) carries no
    // `ImportReport`; counting here would repeat PI-10's pairing (R2.7). It is
    // pure and given RD-3's request, so both runs answer alike.
    // A member on `ReplaceOutcome` for the report is what is owed.
    const overlaid = importDocument({
      ...importing,
      choice,
      merge: mergeAnswers,
      current: importedAgainst,
    })
    // The row landed, so PI-10 accepted it; a refusal here would be the two runs
    // disagreeing, and there is nothing about THIS requirement to tell then.
    if (!overlaid.ok) return landed

    // The count rides on `affectedCount`, as OP-11's caution does; the row goes
    // over, never words (FR-038). Nothing is raised when every task matched.
    const notDrawn = overlaid.report.baselineTaskUidsNotDrawn.length
    if (notDrawn > 0) raiseNotice(OVERLAY_NOT_DRAWN_REASON, notDrawn)
    return landed
  }

  /**
   * OP-13 of table T-024a -- SK-21's road, and the clause settled before the
   * file is read: with no opened file, nothing is done.
   *
   * IF-3's `readOpenedFileState` is asked at the press, since FR-060's
   * permission can go missing between runs. `permissionLost` still names the
   * file, so it goes down the read road and the store asks for the permission
   * back. No telling is raised when there is nothing to re-read, which is why
   * the store is not left to answer `noOpenedFile`.
   *
   * @purity non-pure
   */
  async function reopenDocumentIntoHold(store: FileStore): Promise<void> {
    const openedFile = await store.readOpenedFileState()
    if (openedFile.kind === 'none') return
    await openDocumentIntoHold(store, OPEN_ROUTE_REOPEN)
  }

  /**
   * AM-8 of table T-107, from this side of the seam (FR-022).
   *
   * A wait, not a computation: it walks the press's road
   * (`openDocumentIntoHold` with the document handed in), which raises U-61 and
   * waits for a person's answer; a caller that never shows the page never sees
   * it end. Nothing about the merge is settled here (FR-022).
   * OP-8 holds across both entrances: a call arriving while a person's question
   * stands answers `false`, which the caller's side turns into a refusal.
   * The route is unread here; it travels only as far as the branch that skips
   * the read.
   *
   * @purity non-pure
   */
  async function takeInHandedDocument(incoming: Document): Promise<boolean> {
    // OP-8 and CS-4: the same one-at-a-time guard as the person's entrances.
    if (isFileOperationWaiting || asking !== null || openChoosing !== null) return false
    isFileOperationWaiting = true
    try {
      // S-113 is measured in bytes as a file's is, through IO-2's writer.
      // The same text is read back for FR-073: unread columns of a handed value
      // are keys `Document` does not declare, and PI-20 names them on the text --
      // the one reader, not a second parser. A text PI-20 turns away lists no
      // column and stops nothing: OP-5 judges the value further down the road.
      const handedText = jsonFromDocument(incoming)
      const reread = documentFromJson(handedText, GREATEST_KNOWN_SCHEMA_VERSION)
      return await openDocumentIntoHold(null, OPEN_ROUTE_FROM_CHOOSER, {
        incoming,
        // IO-2 of table T-024, the machine-facing row. Not `formatFromFile`:
        // OP-12 reads an extension and a first character, and there is neither.
        format: 'grsJson',
        byteLength: new TextEncoder().encode(handedText).length,
        unreadColumns: reread.ok ? reread.unreadColumns : [],
        // AM-8 means the merge (FR-022); OP-3's question is not put to a machine.
        choice: 'merge',
      })
    } finally {
      endFileOperationWait()
    }
  }

  /**
   * SK-11 of table T-036 and IC-2 of table T-109 -- write the held document out
   * to a file.
   *
   * CS-4's shape: everything is taken before the first `await`, so the file
   * holds the document the person asked to save.
   * The store's state picks the destination before anything starts (FR-060,
   * FR-096) -- not the fallback `saveDocumentFile` refuses, which would turn a
   * failed overwrite into a chooser. `permissionLost` goes to the overwrite
   * road, where `overwriteOpenedFile` asks for the permission back. DI-5 of
   * table T-227 is why that road asks nothing about identity.
   * Nothing lands in the document, and nothing is caught (FR-028, IF-3).
   *
   * @purity non-pure
   */
  async function saveHeldDocumentToFile(store: FileStore): Promise<void> {
    // CS-4: collected at the moment the operation begins, and not read again.
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
      // FR-101: set here only. The name comes back from the store, not the
      // document: a "save as" writes a file the document has never heard of.
      if (saving.openedFile.kind !== 'none') {
        openedFileName = saving.openedFile.fileName
      }
      fileSavedAt = readInstantOfWrite()
      // FR-100: the file now holds what is on the screen.
      hasUnsavedEdits = false
      return
    }
    // FR-076. `cancelled` is let go inside `raiseFileFault`.
    raiseFileFault(saving.fault)
  }

  /**
   * FR-096 and SK-12 of table T-036 -- write the held document in the format
   * chosen on the `Export Chooser` (U-54).
   *
   * SK-11's chosen-destination half only: DI-5 of table T-227 exempts FR-060's
   * overwrite alone, so an export never lands on the opened file and
   * `notAnOverwriteTarget` cannot arise. CS-4's shape, as in
   * `saveHeldDocumentToFile`; nothing lands in the document and nothing is
   * caught.
   *
   * @purity non-pure
   */
  async function exportHeldDocumentToFile(
    store: FileStore,
    format: ExportFormatId,
  ): Promise<void> {
    // A row that is not a file writes nothing (see `saveFormOfExportFormat`).
    const form = saveFormOfExportFormat(format)
    if (form === null) return
    // ST-7: wiped at the head, so a form that builds no picture cannot inherit
    // the stop of an earlier export.
    stackSafetyCapOwedByPictureExport = null
    // CS-4: collected at the moment the operation begins, and not read again.
    const written = held.document
    // Text forms answer here; picture forms go to `exportPictureContent`, which
    // reads the held document before its first await, so both are `written`.
    const text = exportedText(form, written)
    const content = text === null ? await exportPictureContent(form, written) : { text }
    // A `null` has already been told, or is an absence that reaches nobody.
    if (content === null) return

    const saving = await saveDocumentFile(
      store,
      chosenFileSave(content, written.schedule.project, form),
    )
    if (saving.ok) {
      // ST-7 of table T-014: raised after the writing ended, with the screen's
      // reason and a `null` count. `stackSafetyCapToldFor` belongs to the frame,
      // which lays its picture out separately; touching it would silence the
      // screen's own telling.
      if (stackSafetyCapOwedByPictureExport !== null) {
        stackSafetyCapOwedByPictureExport = null
        raiseNotice(STACK_SAFETY_CAP_REASON, null)
      }
      return
    }
    // FR-076 (MUST): the same raising SK-11's road makes, over the same seam.
    raiseFileFault(saving.fault)
  }

  /**
   * The content of a form `exportedText` cannot answer for, or `null` where
   * there is none to write: IO-3 is `exportSvg`'s picture (PI-21), IO-4 the
   * bytes `Rasterizer` (IF-6) paints from it, IO-7 the file `exportEmbeddedHtml`
   * (PI-20) makes from the application's HTML (IF-8).
   *
   * The document is handed in (CS-4 of table T-066), and `exportScene` is called
   * before the first await for the same reason.
   * `scene === null` reaches nobody: before BO-1 has a size there is no picture.
   * A missing seam does not: a host with no canvas or no HTML source (Node)
   * would otherwise return in silence, which FR-029 forbids, so
   * `SEAM_ABSENT_REASON` is raised. Past `S-217` there is no picture, and
   * `HEIGHT_CEILING_REASON` tells so (FR-025).
   * The answer is `ChosenFileSaveRequest['content']`, not `SaveFileContent`:
   * table T-064 publishes no row for the second name.
   *
   * @purity non-pure
   */
  async function exportPictureContent(
    form: SaveFileForm,
    written: Document,
  ): Promise<ChosenFileSaveRequest['content'] | null> {
    switch (form) {
      case 'grsJson':
      case 'mspdi':
        // Not reachable: `exportedText` answers for both, and this function
        // is called only where it answered `null`. Named rather than left to a
        // default so that a form added to `SaveFileForm` is a compile error.
        return null
      case 'singleHtml':
        return await embeddedHtmlContent(written)
      case 'svg':
      case 'png': {
        const scene = exportScene()
        // ST-7: lifted while still one statement from `exportScene`; raised
        // after the write.
        stackSafetyCapOwedByPictureExport = stackSafetyCapOfLastExportScene
        if (scene === null) return null
        // One assembly for IO-3 and IO-4 (WY-2 of table T-041).
        if (form === 'svg') {
          const picture = exportSvg(scene)
          if (!picture.ok) {
            // FR-025: refused before anything was drawn.
            raiseNotice(HEIGHT_CEILING_REASON, null)
            return null
          }
          return { text: picture.svg }
        }
        return await rasteredContent(scene)
      }
    }
  }

  /**
   * IO-4 of table T-024 -- the picture painted, or `null` once the reason has
   * been told.
   *
   * @purity non-pure
   */
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
      // FR-025: the picture did not fit S-217, so the rasterizer was never asked.
      raiseNotice(HEIGHT_CEILING_REASON, null)
      return null
    }
    if (!painted.png.ok) {
      // FR-076 (MUST): a failure is told, carrying a row of table T-233.
      raiseNotice(NOTICE_REASON_OF_RASTER_FAULT[painted.png.fault.reason], null)
      return null
    }
    return { bytes: painted.png.pngBytes }
  }

  /**
   * IO-7 of table T-024 -- the application and this document as one file, or
   * `null` once the reason has been told. The assembly lives in the codec (UT-5
   * of table T-063).
   *
   * @purity non-pure
   */
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
      // FR-076 (MUST): a failure is told, carrying a row of table T-233.
      raiseNotice(NOTICE_REASON_OF_EMBEDDED_HTML_FAULT[made.fault.reason], null)
      return null
    }
    return { text: made.html }
  }

  /**
   * FR-096's road: the file the person is about to point at, reached from SK-11
   * (no opened file) and from the export.
   *
   * DI-1's three columns. The file name is `null`: asking the store would be a
   * second external read inside R7.4's one unit. A `null` name matches no
   * destination, so DI-4 asks for every existing file -- more questions, never
   * a silent overwrite.
   *
   * @purity pure
   */
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
      // FR-096: the extension is sent apart from the suggested name, since a
      // chooser told no kind enforces nothing. No media type is named on this
      // road; that is the Framework layer's.
      extension: extensionOfForm(form),
      identity: { fileName: null, projectName: project.name, projectId: project.id },
      projectIdentityFromText,
      confirmOverwrite: askToWriteOverDestination,
    }
  }

  /**
   * What one happening was assigned to (table T-023 and table T-036, read by
   * `commandFromInput`).
   *
   * @purity non-pure
   */
  /**
   * The entries of table T-109 this loop answers for, on the release that
   * settled on one. Returns whether the entry was spent here.
   *
   * Mostly not `DocumentCommand`s (IC-21 is S-99, IC-71 .. IC-73 are OP-3's), and
   * LY-5 of table T-060 leaves current values with this layer. NT-7's word
   * buttons are spent in `receiveInput` off `ScreenPart.confirmationAnswer`.
   * IC-66 writes CM-42 of table T-108 and is here for its argument
   * (`ROSTER_DELETE_ENTRY`), which is why the frame is passed (WS-6).
   *
   * @purity non-pure
   */
  function answerSettledEntry(
    entry: IconId,
    surface: string | null,
    frame: FrameValues,
  ): boolean {
    if (entry === CLOSE_SURFACE_ENTRY && surface === PROPERTIES_PANEL_SURFACE) {
      // The `[x]` half of putting the panel away; IN-4's level is the other.
      // A current value (LY-5) with no command in table T-108. Spent whether or
      // not the panel was up: `false` would hand the press to `carryOutAction`
      // as an edit of the schedule beneath.
      isPropertiesPanelPutAway = true
      return true
    }
    if (entry === CLOSE_SURFACE_ENTRY && surface === AI_EXPORT_MODAL_SURFACE) {
      // FR-068: the copy rides on IC-52, which already stands on this surface.
      // Done in this layer because CHN-9 of table T-008 keeps the clipboard out
      // of the drawing components, and nothing is written to the document.
      // Answers `false` so the press still closes the surface (IN-4); `true`
      // would leave a copy entrance that no longer closes (FR-029).
      // The document is read at the press (CS-4).
      const seam = clipboard
      // Nothing is written without a clipboard (CP-30).
      if (seam !== undefined) {
        // The same writer `sessionOf` put on the surface (FR-068), so the text
        // copied and the text shown cannot part.
        const text = jsonFromDocument(held.document)
        void writeClipboard(seam, { kind: 'document', text }).then((writing) => {
          // FR-076. STOP -- table T-233 has no row for a failed clipboard write,
          // so it falls to RS-15. A row of its own is what is owed.
          if (!writing.ok) raiseNotice('RS-15', null)
        })
      }
      return false
    }
    if (entry === DISPLAY_LANGUAGE_ENTRY) {
      // FR-038: two languages, so one entry is the header's whole switch.
      language = language === 'ja' ? 'en' : 'ja'
      writeBrowserStored('S-99', language)
      return true
    }
    if (entry === PALETTE_MINIMISE_ENTRY) {
      // S-200 of table T-206, reversed by the same entrance (IC-75). Not S-99e:
      // that is whether the palette is shown, whose entrance FR-053 keeps
      // outside the palette.
      isPaletteMinimised = !isPaletteMinimised
      return true
    }
    if (entry === INTERACTION_RECORD_ENTRY) {
      // S-206 of table T-206, reversed by the same entrance (IC-76). Stopping
      // also hands the record to the clipboard (FR-102), so both halves live in
      // `turnInteractionRecord`.
      turnInteractionRecord()
      return true
    }
    if (entry === DIALOGUE_FIELD_ENTRY) {
      // FR-029: the faint entrance answers the press with `RS-35`, judged from
      // the same `isAgentApiEnabled` the header was drawn from. While the API is
      // on, `false` lets the press reach `carryOutAction`'s
      // `toggleDialogueFieldVisible` (S-99i).
      if (isAgentApiEnabled) return false
      raiseNotice(DIALOGUE_FIELD_UNAVAILABLE_REASON, null)
      return true
    }
    if (entry === MILESTONE_LIST_ENTRY) {
      // S-142 of table T-206, a current value (LY-5); the translator answers the
      // row with nothing. Reversed off what is held (IC-50).
      isMilestoneListOpen = !isMilestoneListOpen
      return true
    }
    if (entry === NEW_DOCUMENT_ENTRY) {
      // IC-98 of table T-109 (FR-095); why it is answered here is the entry
      // constant's note. While a question stands the press is told with `RS-27`
      // (FR-029), as for `ROSTER_DELETE_ENTRY`: `askToDiscardCurrentDocument`
      // writes `asking`, so a second press would orphan the first wait.
      if (asking !== null) {
        raiseNotice(NOTHING_TO_DO_REASON, null)
        return true
      }
      // No template: told rather than asked, since raising QN-5 to discard
      // nothing would be a lying confirmation (rule 04 section 3.6). `RS-27`, not
      // `RS-3`: no write is attempted here (FR-029's fallback).
      const template = startupTemplate
      if (template === undefined) {
        raiseNotice(NOTHING_TO_DO_REASON, null)
        return true
      }
      // Spent now, finished later (as in `answerWatermarkUnlock`): the question
      // must be answered before anything is discarded (FR-095).
      void startNewDocument(template)
      return true
    }
    if (entry === ROSTER_DELETE_ENTRY) {
      // IC-66 of table T-109 (FR-099); why it is answered here is the entry
      // constant's note. The press and the question are one piece: FR-099
      // requires the tasks it would unassign to be named and confirmed first.
      //
      // While a question stands the press is told with `RS-27` (FR-029), as the
      // open and reopen roads do; a second write now would land on a document
      // the standing question never saw.
      if (asking !== null) {
        raiseNotice(NOTHING_TO_DO_REASON, null)
        return true
      }
      // FR-029: nobody chosen, nothing to do, so `RS-27` (not RS-34, which is
      // FR-034's). Not written as an empty bundle: CM-42 would accept it, mark
      // the document unsaved (FR-100) and say nothing.
      const chosen = selectedResourceUids
      if (chosen.length === 0) {
        raiseNotice(NOTHING_TO_DO_REASON, null)
        return true
      }
      // CM-42 of table T-108 with the chosen `uid`s (IC-66), taken now and
      // carried with the question (CS-4). Nothing prunes the set afterwards, as
      // with `selectedGroupIds`: a second press names gone `uid`s, which CM-42
      // refuses and `writeDocument` tells. PND-143 covers the set but not its
      // pruning.
      const writes: readonly DocumentCommand[] = [{ kind: 'deleteResource', uids: chosen }]
      const owedQuestion = confirmationOwedByResourceDeletion(chosen, held.document)
      if (owedQuestion === null) {
        // QN-3's scene is not met (no assignment is freed); FR-031 keeps the
        // places that ask from growing, and undo stands behind it (UN-15).
        writeDocument(writes, frame)
        return true
      }
      asking = {
        question: owedQuestion,
        /** @purity non-pure */
        settle(isProceeding, answeringFrame) {
          // FR-099: cancelling leaves the document untouched.
          if (!isProceeding) return
          writeDocument(writes, answeringFrame)
        },
      }
      return true
    }
    const openChoice = OPEN_CHOICE_OF_ENTRY[entry]
    if (openChoice !== undefined) {
      const choosing = openChoosing
      // Not spent when nothing is waiting: these entries exist only while their
      // surface is up.
      if (choosing === null) return false
      openChoosing = null
      // S-99g: closed here beside the answer, not by `screenStateFromEntry`:
      // IC-52 on this surface is IN-4's way off without answering (an abandoned
      // read, OP-3), whereas these three are the answer.
      screenState = screenStateWithSurface(screenState, null)
      choosing.settle(openChoice)
      return true
    }
    // FR-022 -- one of table T-032a's three, taken on U-61, in the same shape as
    // the three above. The candidate list goes with the answer, or the next
    // surface would show a pairing no longer being asked.
    const mergeMapping = MERGE_MAPPING_OF_ENTRY[entry]
    if (mergeMapping !== undefined) {
      const choosing = mergeChoosing
      if (choosing === null) return false
      mergeChoosing = null
      mergeCandidates = []
      // FR-073's list goes with it, on the same terms.
      unreadColumns = []
      screenState = screenStateWithSurface(screenState, null)
      choosing.settle(mergeMapping)
      return true
    }
    return false
  }

  /**
   * FR-096 and SK-12: the format chosen on U-54, spent. Returns whether it was
   * spent here.
   *
   * Held by the shell because writing a file is FileGateway's (IF-3) and the
   * document written is a current value (LY-5 of table T-060); table T-108 has
   * no command for it.
   *
   * STOP: whether U-54 stays up once a format is taken is not decided. Looked in
   * FR-096, table T-024a, table T-103's U-54 and IN-4 of table T-028 (which says
   * how a surface is closed, not when it closes itself). Closed here, as
   * `answerSettledEntry` does for U-56: this press is the surface's answer.
   *
   * @purity non-pure
   */
  function answerSettledFormat(format: ExportFormatId): boolean {
    // S-99g: the surface has answered its question, so it is no longer open.
    // Trap: it is taken down before either gate below, so each gate must raise
    // a notice -- a silent return would close the chooser with nothing written
    // and nothing said (FR-029).
    screenState = screenStateWithSurface(screenState, null)
    // No store handed in. Told rather than silent: the chooser is up only
    // because IC-2 was pressed (FR-029). RS-3 and not RS-40: every row of table
    // T-024 can be made in this build, so the refusal is the host's (LM-14).
    const store = files
    if (store === undefined) {
      raiseNotice(SEAM_ABSENT_REASON, null)
      return true
    }
    // One file operation at a time (CS-4 of table T-066): a second begun
    // mid-wait would take the screen's one question away from the first.
    // RS-27 is FR-029's fallback: no row of table T-233 names another file
    // operation holding the question. Not RS-7 / RS-9, which are WS-2's refusals
    // of an `Agent API` write.
    if (isFileOperationWaiting || asking !== null || openChoosing !== null) {
      raiseNotice(NOTHING_TO_DO_REASON, null)
      return true
    }
    isFileOperationWaiting = true
    // Not awaited: the operation spans frames (CS-4) and the flag above keeps a
    // second one from starting.
    // PND-187 (open): `.finally` does not consume a rejection, so a rejected
    // write is neither swallowed on purpose nor told; the open and save paths
    // below have the same shape. A row invented here would break FR-076.
    void exportHeldDocumentToFile(store, format).finally(endFileOperationWait)
    return true
  }

  /**
   * SK-4 of table T-036 (FR-033).
   *
   * An identifier is kept, not rows: `pasteTaskSubtree` (CM-8) and
   * `pasteTaskGroupSubtree` read table T-223's cascade when the paste lands, so
   * stored rows would paste a document since edited away.
   * Nothing is sent to the OS clipboard (FR-033).
   *
   * Not decided by the spec (reasoned from FR-033 and DU-2):
   * - a row and a Task both chosen: the row wins, since DU-2 cascades DU-1 over
   *   every Task on it, so it is the superset of the Task standing on it;
   * - more than one: both commands carry one source, so this refuses with RS-27
   *   (FR-029's fallback). Copying several changes table T-223 and both command
   *   shapes, not this function.
   *
   * @purity non-pure
   */
  function copyForPaste(): void {
    // The row wins -- see the note above.
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
    // FR-029. The store is left as it stood: a refused copy must not spend the
    // person's earlier copy.
    raiseNotice(NOTHING_TO_DO_REASON, null)
  }

  /**
   * SK-5 of table T-036 (FR-033).
   *
   * FR-033's ST-7 valve is answered here, not in `edit-task.ts` (see CM-8
   * there): ST-1 counts drawn stacking and table T-038 forbids counting by
   * dates, so the count needs a layout. The paste is folded onto a copy
   * (`editDocument`, PI-9: no undo step, no stamp, no notify -- the road
   * `previewOfHeldPress` takes) and laid out with this frame's settings, regions
   * and fold, because a folded row's descendants are not drawn (HR-1a of table
   * T-015).
   *
   * FR-004's depth and a missing id are refused inside `editTaskGroup` (CM-28);
   * a refused fold goes to `writeDocument` unchanged and `raiseWriteRefusal`
   * picks the row (rule 03 section 1).
   *
   * Not decided by the spec: an empty store and a deleted source. No row of
   * table T-233 names either, so both fall to RS-27 (FR-029's fallback).
   *
   * @purity non-pure
   */
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
    // FR-033's valve, measured on the document this paste would make.
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
        // FR-033: refused and told, not written.
        raiseNotice(STACK_SAFETY_CAP_REASON, null)
        return
      }
    }
    // One command, one bundle, one undo step (FR-031). A refusal from here is
    // raised by `writeDocument` itself.
    writeDocument([command], frame)
  }

  /**
   * What `copiedForPaste` becomes on the write path, or `null` when the thing it
   * names is no longer in the document.
   *
   * Where a row lands is FR-033's: one chosen row is the parent, none is the top
   * level. Not decided by the spec: more than one row chosen -- refused rather
   * than this file picking where a person's work lands.
   *
   * The subtree is walked here because `pasteTaskGroupSubtree` needs a new id
   * per copied row and a pure unit may not mint one (`crypto.randomUUID`).
   * `edit-task-group.ts` re-derives DU-2's subtree and refuses a row given no id,
   * so the two cannot part in silence.
   *
   * @purity non-pure
   */
  function pasteCommandFor(
    copied: { readonly kind: 'task'; readonly uid: number } | { readonly kind: 'row'; readonly groupId: string },
    schedule: Schedule,
  ): DocumentCommand | null {
    if (copied.kind === 'task') {
      // Deleted since it was copied: the caller tells RS-27 rather than letting
      // CM-8 refuse a command nobody could have meant.
      return taskByUid(schedule, copied.uid) === null
        ? null
        : { kind: 'pasteTaskSubtree', sourceUid: copied.uid }
    }
    const byParent = new Map<string | null, TaskGroup[]>()
    for (const row of schedule.taskGroups) {
      byParent.set(row.parentId, [...(byParent.get(row.parentId) ?? []), row])
    }
    if (!schedule.taskGroups.some((one) => one.id === copied.groupId)) return null
    if (selectedGroupIds.length > 1) return null
    // DU-2: the rows under the copied row come with it.
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

  function carryOutAction(action: InputAction | null, frame: FrameValues): void {
    // MK-12.
    if (action === null) return
    switch (action.kind) {
      case 'changeDocument': {
        // FR-032: asked once for the whole action, not per bundle (NT-7 asks
        // once per press). While a question stands no second write starts -- its
        // answer would land on a document the question never saw.
        if (asking !== null) return
        const owedQuestion = confirmationOwedBy(action.writes.flat(), held.document)
        if (owedQuestion !== null) {
          const owedWrites = action.writes
          const owedCreation = action.created
          asking = {
            question: owedQuestion,
            /** @purity non-pure */
            settle(isProceeding, answeringFrame) {
              // FR-032.
              if (!isProceeding) return
              for (const bundle of owedWrites) writeDocument(bundle, answeringFrame)
              // FR-001 / HF-14 hold past NT-7's question too, or a creating
              // press would write and leave nobody standing on it.
              if (owedCreation !== undefined) standOnWhatWasCreated(owedCreation)
            },
          }
          return
        }
        // FR-031: one press may owe several writes, in order (CM-71, then CM-72).
        // Not flattened into one bundle: WS-4 pushes the document as it stood
        // before the write, so one bundle would push a step carrying the old zoom
        // and undo would rewind the zoom UN-8 keeps out of history. Each write is
        // still one bundle (WS-6), so AG-3's atomicity holds.
        for (const bundle of action.writes) writeDocument(bundle, frame)
        // FR-001 / HF-14. After the writes: a refused bundle makes nothing, and
        // `standOnWhatWasCreated` tests the document rather than the plan.
        if (action.created !== undefined) standOnWhatWasCreated(action.created)
        return
      }
      // RD-1 and RD-2 of table T-230, through the one write path (MS-1 of table
      // T-042).
      // An empty history is told (FR-029), and the guard lives here because
      // `replaceHeldDocument` cannot see it: RD-1 / RD-2 commit even when no step
      // moved (`undone: false`), which would set `hasUnsavedEdits` for an edit
      // nobody made. RS-27 is FR-029's fallback; table T-233 has no row for it.
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
      // SK-4 and SK-5 of table T-036 (FR-033). The store is `copiedForPaste`;
      // the decisions are on the helpers.
      case 'copySelection':
        copyForPaste()
        return
      case 'pasteClipboard':
        pasteWhatWasCopied(frame)
        return
      case 'openDocumentFile': {
        // SK-10 of table T-036 and IC-1 of table T-109 (OP-2).
        // No store handed in, so there is no file to read.
        const store = files
        if (store === undefined) return
        // OP-8 and CS-4's one-at-a-time, as the save path. Told with RS-27 as the
        // export gate is (FR-029). Not RS-3: the store is present and the refusal
        // is timing, not the host. Not RS-7 / RS-9: see the export gate.
        if (isFileOperationWaiting || asking !== null || openChoosing !== null) {
          raiseNotice(NOTHING_TO_DO_REASON, null)
          return
        }
        isFileOperationWaiting = true
        // Not awaited, as the export path. PND-187 (open): see the export path.
        void openDocumentIntoHold(store, OPEN_ROUTE_FROM_CHOOSER).finally(endFileOperationWait)
        return
      }
      case 'copyPictureToClipboard': {
        // IC-3 and FR-025: IO-6 of table T-024, with no surface in between.
        // No clipboard handed in, so there is nothing to write to.
        const seam = clipboard
        if (seam === undefined) return
        // What is sent is `exportSvg`'s answer, not `scene.svg`: table T-076's
        // assembly happens inside ImageExporter, and FR-025 requires the same
        // picture as the download (FR-080).
        const scene = exportScene()
        // ST-7: taken here rather than after the write, for the reason
        // `stackSafetyCapOfLastExportScene` gives.
        const capStopInPicture = stackSafetyCapOfLastExportScene
        if (scene === null) return
        // FR-025: IO-6 is under the same height ceiling as IO-3 / IO-4, refused
        // before the clipboard is written.
        const picture = exportSvg(scene)
        if (!picture.ok) {
          raiseNotice(HEIGHT_CEILING_REASON, null)
          return
        }
        // Not awaited, as the file roads: CS-4 of table T-066 collected the
        // document before the first await.
        void writeClipboard(seam, { kind: 'picture', svg: picture.svg }).then(
          (writing) => {
            // FR-076. STOP: table T-233 has no row for a clipboard write that
            // fails, so this falls to RS-15.
            if (!writing.ok) {
              raiseNotice('RS-15', null)
              return
            }
            // ST-7 of table T-014: the stop is told after the export, as for
            // IO-3 / IO-4. Not on a failed write -- nothing left the app.
            if (capStopInPicture !== null) raiseNotice(STACK_SAFETY_CAP_REASON, null)
          },
        )
        return
      }
      case 'reopenDocumentFile': {
        // SK-21 of table T-036 and OP-13 of table T-024a: the open road with the
        // handle already held.
        // No store handed in, so there is no file to read.
        const store = files
        if (store === undefined) return
        // OP-8 and CS-4's one-at-a-time; told with RS-27 as the open path.
        if (isFileOperationWaiting || asking !== null || openChoosing !== null) {
          raiseNotice(NOTHING_TO_DO_REASON, null)
          return
        }
        isFileOperationWaiting = true
        // Not awaited, as the open path. OP-4's confirmation is kept by taking
        // this road: OP-13 makes the reload a replace like any other.
        void reopenDocumentIntoHold(store).finally(endFileOperationWait)
        return
      }
      case 'saveDocumentFile': {
        // No store handed in, so there is nothing to write to.
        const store = files
        if (store === undefined) return
        // One at a time (CS-4 of table T-066); told with RS-27 as the open path.
        if (isFileOperationWaiting || asking !== null || openChoosing !== null) {
          raiseNotice(NOTHING_TO_DO_REASON, null)
          return
        }
        isFileOperationWaiting = true
        // Not awaited: the operation spans frames (CS-4) and the flag keeps a
        // second from starting. PND-187 (open): see the export path.
        void saveHeldDocumentToFile(store).finally(endFileOperationWait)
        return
      }
      case 'dismissNotice':
        // SK-19's first stage, whose manner is NT-8 of table T-037.
        // `dismissNewestNotice` is the one place a telling leaves
        // `raisedNotices` (LY-5 of table T-060). Nothing else is spent on this
        // press: NT-8 ranks ahead of both ladders, and the translator answered
        // this kind instead of `settleTextEntry`, so the field under the telling
        // is untouched.
        dismissNewestNotice()
        return
      case 'settleTextEntry': {
        // SK-19's first stage has already happened: the surface's own `keydown`
        // listener runs before `DomInputSource`'s on the window, and
        // `spendFieldCommit` at the head of this happening wrote the commit.
        // This case carries MK-10's half (the press is the tool's). A second
        // settle must not be raised here: the shell holds no field (LR-6), and
        // one property change is one undo step (FR-031, UN-3 of table T-027).
        //
        // SK-19's second stage is this layer's; where the focus stands is not
        // asked (SK-19). Not while a surface stands (the closing rule under
        // table T-036): U-55 is `asking` and not one of S-99g's, so only the
        // shell sees both -- the pair `InputContext.isSurfaceStanding` joins.
        // Not decided by the spec: an `Enter` with the focus in the Dialogue
        // Field (FR-065), and an `Enter` on a field merely focused after a double
        // click, both close the panel -- SK-19 read literally.
        if (screenState.surface !== null || asking !== null) return
        // FR-091: settling a just-created name closes the panel and clears the
        // selection on the same press. Ahead of the guard below, because this
        // press settled the name, so `didSettleFieldEntry` stands and the guard
        // would return with the panel up. Not guarded on `didSettleFieldEntry`:
        // an unchanged name writes nothing (IN-6) but was still settled.
        // FR-072's MUST NOT is not broken (FR-091 says why), and the arming is
        // not touched: `screenState` is not written, so the next shape can be
        // drawn straight away.
        if (namingCreatedTaskUid !== null) {
          namingCreatedTaskUid = null
          isPropertiesPanelPutAway = true
          selection = emptySelection()
          return
        }
        // Two facts make one question because settling happens before this case:
        // `didSettleFieldEntry` says an edit stood when `Enter` arrived, the seam
        // says whether one stands now. Either is an unsettled edit, so neither
        // may be dropped; MK-13's second `Enter` is the press where both are
        // false.
        // Reached at all only because S-99h is: `commandFromKey` tells this
        // `Enter` apart by `InputContext.isPropertiesPanelShowing`, which is
        // optional, so dropping it in `collectInputContext` is silent.
        if (didSettleFieldEntry || hasUnsettledTextEntry()) return
        // FR-072: putting the panel away does not clear the selection;
        // `selection` and `propertiesSubject` stand.
        isPropertiesPanelPutAway = true
        return
      }
      case 'tellEntryHasNothingToDo':
        // FR-029; manner NT-1 of table T-037.
        // The translator measured the situation; the row of table T-233 is read
        // here. `null` is the fallback -- see `NOTHING_TO_DO_REASON`.
        // No words and no count: the dictionary (FR-038) makes the sentence, and
        // NT-3's count belongs to a destructive result. Not drawn faint from
        // here: the faint is the drawing side's, and FR-029 tells only on the
        // press.
        raiseNotice(
          action.situation === null
            ? NOTHING_TO_DO_REASON
            : NOTICE_REASON_OF_SPENT_ENTRANCE[action.situation],
          null,
        )
        return
      case 'editInPlace':
        if (action.target.kind === 'taskName') {
          // MK-13's Task entry. One of FR-072's two entrances, so this branch
          // may put the panel up; no third is made (FR-029). Nothing is chosen
          // here: the first click already moved the selection (SL-2 of table
          // T-023c).
          showPropertiesOfChoice()
          // The field is focused by the side that drew it (LR-6), through
          // `ScreenSurface.focusPropertyField`, which cannot be asked now: the
          // control does not exist until the frame draws it, so the request is
          // spent at the paint -- see `nameFieldWanted`.
          nameFieldWantedRow = TASK_NAME_FIELD_ROW
          return
        }
        if (action.target.kind === 'rowName') {
          // MK-13's 行見出し entry (FR-085), the same two lines as the Task
          // entry. Nothing is written or chosen here: the first click chose the
          // row, and the field's commit writes the name. The closing `Enter` is
          // SK-19's (FR-085 forbids restating it).
          showPropertiesOfChoice()
          nameFieldWantedRow = ROW_NAME_FIELD_ROW
          return
        }
        if (action.target.kind === 'documentTitle') {
          // SK-9's entrance to FR-035. The header's own field, not the panel:
          // `PropertiesSubject` has no subject for the document and table T-016
          // no row for its name, so this branch does not call
          // `showPropertiesOfChoice`. The ask is spent at the paint like the
          // others (IF-9 names U-27 for it -- see `nameFieldWanted`).
          // Nothing is chosen or written here: CM-1, through
          // `commandFromFieldCommit`, writes the name, and a document is not a
          // row of table T-023c.
          nameFieldWantedRow = DOCUMENT_TITLE_FIELD_ROW
          return
        }
        if (action.target.kind === 'assignee') {
          // MK-13's 担当ラベル entry, whose destination is AS-1 of table T-225.
          // The same two lines as the Task entry. Nothing is chosen or written
          // here; which row of table T-225 the commit becomes is
          // `commandFromFieldCommit`'s. FR-091's close-and-deselect is not copied
          // here (AS-1), and no select-all is asked: MK-13 asks it of the Task
          // and 行見出し entries only.
          showPropertiesOfChoice()
          nameFieldWantedRow = ASSIGNEE_FIELD_ROW
          return
        }
        if (action.target.kind === 'commentBoxText') {
          // MK-13's コメントボックス entry (FR-097). The same two lines; only the
          // row differs. Nothing is chosen or written here: the first click chose
          // the box (SL-3 of table T-023c) and the field's commit writes the
          // body. No select-all: MK-13 does not ask it of the comment box.
          showPropertiesOfChoice()
          nameFieldWantedRow = COMMENT_BOX_TEXT_FIELD_ROW
          return
        }
        // Every kind of `InPlaceTarget` has a branch above; a member added to
        // that union arrives here as something other than `never` and stops
        // compiling.
        {
          const unreached: never = action.target
          void unreached
        }
        return
      case 'moveCommandPalette': {
        // GR-19 of table T-023d: FR-053's palette moves by the measured travel.
        // Written here: a current value (LY-5 of table T-060) with no command in
        // table T-108, so no undo step. Added to where the palette stood as the
        // frame resolved it, so a first drag starts from the `Row Area`'s corner.
        // Following on every move does not conflict with FR-053's release rule:
        // no row of table T-203 or T-206 keeps this corner (see
        // `paletteCornerOf`), so a travel decides nothing.
        // Each travel is an increment, added to the corner the previous one left;
        // a travel measured from the press would overshoot. A travel carries no
        // marker to tell the two apart, so the emitting side's origin is advanced
        // below.
        const from = paletteCornerOf(commandPaletteDraggedTo, frame.regions)
        commandPaletteDraggedTo = { x: from.x + action.by.dx, y: from.y + action.by.dy }
        // `followedTo` is where the emitting side measures the next travel from.
        // Advanced by the travel rather than set to the pointer: the same point
        // without a second reading of the outside (R7.4).
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
        // HF-15 of table T-051.
        // The axis goes back onto the press because UF-30 is pure and cannot
        // remember which way the hand first passed S-208; the depth is held for
        // the frame because the panel draws at `depth x rowTitleIndent`.
        // Nothing is written to the document (table T-023d), so no undo step.
        // Writing the axis on every move costs nothing: `rowGrabAxisAt` answers
        // the same value once it stands.
        if (pressed !== null) pressed = { ...pressed, rowGrabAxis: action.axis }
        rowGrabbedAt = {
          groupId: action.groupId,
          depth: action.atDepth,
          // HF-15: the live axis and the resisted stop are pictures, so they
          // travel to the panel and are not written.
          axis: action.axis,
          resistedPx: action.resistedPx,
          atY: action.atY,
        }
        return
      }
      case 'chooseRow': {
        // FR-085. Written here like `moveCommandPalette`: no command in table
        // T-108, no undo step (LY-5 of table T-060).
        // An extending press reads what is held, not the drawn row: FR-048 lets
        // a paint be skipped, so a picture may be older than this value.
        const chosen = selectedGroupIds
        if (!action.isExtending) {
          // SL-2.
          selectedGroupIds = [action.groupId]
        } else if (chosen.includes(action.groupId)) {
          // SL-4.
          selectedGroupIds = chosen.filter((one) => one !== action.groupId)
        } else {
          selectedGroupIds = [...chosen, action.groupId]
        }
        // FR-042 reads this same set, and FR-072 turns the panel to the last
        // operation.
        // @provisional PND-142
        showPropertiesOfChoice()
        return
      }
      case 'chooseResources':
        // IC-63 / IC-64 / IC-65 of table T-109; replaced whole (FR-099).
        // Not shown in the properties panel: SL-1 of table T-023c does not admit
        // a resource, so this is not one of FR-072's operations.
        // @provisional PND-143
        selectedResourceUids = action.uids
        return
      case 'toggleChosenResource': {
        // IC-67 / IC-68: one control in two states. The direction is read from
        // what is held, for the reason `chooseRow` gives.
        // @provisional PND-143
        const chosen = selectedResourceUids
        selectedResourceUids = chosen.includes(action.uid)
          ? chosen.filter((one) => one !== action.uid)
          : [...chosen, action.uid]
        return
      }
      case 'toggleDocumentSettingsProperties':
        // FR-072's settings entrance (IC-17): a second press goes back to the
        // subject, and the selection is not cleared.
        // It also brings a put-away panel back, so the press does not turn a
        // surface nobody can see. Not decided by the spec: FR-072 words the turn
        // for a panel that is up; the turn is left unchanged rather than given a
        // second rule.
        isPropertiesPanelPutAway = false
        // @provisional PND-144
        propertiesShowing =
          propertiesShowing === 'documentSettings' ? 'selection' : 'documentSettings'
        return
      case 'setDualCursorFollowing':
        // Table T-029a: DC-1's entry, DC-2's click, DC-4's way out.
        // The session value first, then the write, as elsewhere here. Not
        // `changeDocument`'s road: that asks FR-032's confirmation, and no row of
        // table T-234 asks anything of a measuring line. UN-12 keeps it out of
        // undo (`document-change-plan.ts`, DC-6).
        dualCursorFollowing = action.following
        if (action.placed !== null) writeDocument([action.placed], frame)
        return
      case 'setLevelZeroFolded':
        // HR-2 of table T-015 at the head of the panel.
        // The order does not matter: S-211 is not in the document. One bundle
        // for the writes (FR-031); a press that only moves the head writes
        // nothing. No question is owed: nothing here deletes (FR-032).
        isLevelZeroFolded = action.isFolded
        if (action.writes.length > 0) writeDocument(action.writes, frame)
        return
      case 'toggleAgentApi':
        // IC-20 (FR-065): one entrance both ways. What is shown while it is on is
        // the renderer's. Not written to `localStorage` -- see `sessionOf`.
        // The public point follows through the watcher `setAgentApiEnabled`
        // wakes (FR-028).
        setAgentApiEnabled(!isAgentApiEnabled)
        // FR-065: raised on the way off only; NT-5 keeps the press accepted.
        if (!isAgentApiEnabled) raiseNotice(HANDED_REFERENCE_STANDS_REASON, null)
        return
      case 'toggleDialogueFieldVisible':
        // IC-18 (FR-066, S-99i): one entrance both ways, as `toggleAgentApi`.
        // @provisional PND-419 -- turning the API off does not reset S-99i, so
        // enabling it again restores what the reader chose.
        // Reached only while the API is on: `answerSettledEntry` spends the press
        // with RS-35's reason otherwise.
        isDialogueFieldVisible = !isDialogueFieldVisible
        return
    }
  }

  /**
   * FR-072: the properties panel turns to what is chosen and remembers it.
   *
   * Not an entrance in itself (FR-072 names MK-13 and IC-17), so other callers
   * reach this only while the panel stands.
   *
   * The subject is kept, not the fields (PND-144): kept fields would show values
   * an edit had made untrue, and `PropertyField` cannot mark a value stale.
   * An emptied selection changes neither member, so the subject standing is the
   * previous contents FR-072 keeps, and nothing moves to the settings.
   *
   * @provisional PND-144
   * @purity non-pure
   */
  function showPropertiesOfChoice(): void {
    if (selection.items.length === 0 && selectedGroupIds.length === 0) return
    // FR-072 and FR-006: only callers that are entrances may undo the
    // putting-away; the selection comparison at the foot of `receiveInput` asks
    // only while the panel stands -- see the guard there.
    isPropertiesPanelPutAway = false
    propertiesShowing = 'selection'
    propertiesSubject = { selection, groupIds: selectedGroupIds }
  }

  /**
   * What a creating press owes once its write has landed: the thing made is
   * chosen and its name field opened.
   *
   * FR-091 and HF-14 of table T-051 route this through FR-085's road, so this
   * writes the same pair of lines as the double-click branches of
   * `carryOutAction`.
   *
   * The document is asked, not the plan: `writeDocument` answers nothing, and a
   * refused write would otherwise put the panel up over nothing.
   *
   * FR-001 is the Task half; the new Task replaces the selection (SL-2), since a
   * drag on empty ground chooses one thing.
   *
   * A row is not a member of `Selection` (SL-1 of table T-023c), so a made row
   * goes into `selectedGroupIds`, the set `chooseRow` writes.
   *
   * @purity non-pure
   */
  // Reached through `InputAction` rather than importing `CreatedSubject`: PI-18
  // does not list that type, so the import would cross a component boundary
  // table T-064 does not admit (check 26b).
  function standOnWhatWasCreated(
    created: NonNullable<Extract<InputAction, { kind: 'changeDocument' }>['created']>,
  ): void {
    if (created.kind === 'task') {
      if (!held.document.schedule.tasks.some((one) => one.uid === created.uid)) return
      selection = selectionWith(emptySelection(), { kind: 'task', uid: created.uid })
      showPropertiesOfChoice()
      nameFieldWantedRow = TASK_NAME_FIELD_ROW
      // FR-091's just-created scene begins here -- see `namingCreatedTaskUid`.
      // After the three lines above, so `endCreatedNamingIfChosenMoved` cannot
      // read a selection this call is about to replace.
      namingCreatedTaskUid = created.uid
      return
    }
    const madeRow = held.document.schedule.taskGroups.find((one) => one.id === created.groupId)
    if (madeRow === undefined) return
    // HF-17 of table T-051: adding a row with 段 0 folded (S-211) opens one
    // level. `parentId === null` is HF-17's case (the shallowest tier), not
    // HF-14's (under a parent); nothing else tells the two entrances apart.
    // Only the head opens: S-211 is one boolean, so this is not HF-10's open-all
    // (IC-74), which would discard the person's own folds. HF-16's act is not
    // copied: IC-92 also brings HR-6's hidden rows back, which this does not ask.
    // Not a write: S-211 is not in the document (table T-206), so no undo step.
    if (madeRow.parentId === null && isLevelZeroFolded) isLevelZeroFolded = false
    selectedGroupIds = [created.groupId]
    showPropertiesOfChoice()
    nameFieldWantedRow = ROW_NAME_FIELD_ROW
    // HF-17: an undrawn added row is brought into sight by the frame that draws
    // it -- see `addedRowOwedSight`. Scrolling alone is not the answer (HF-14):
    // the write already opened FR-018's tier (the translator plans CM-65 ahead
    // of CM-26), so the anchor is about where the row is, not whether.
    addedRowOwedSight = created.groupId
  }

  /**
   * Whether this happening owes a frame.
   *
   * FR-048: judged on what is drawn, never on whether the pointer moved -- a pan
   * or a drag moves the pointer and changes the picture. Only a bare move and a
   * wheel that moved nothing are narrowed; every other FT-1 happening still owes
   * a frame, so NFR-010's triggers are not widened.
   * Not drawing is not not knowing: `pointerAt` and `beginPointerRest` still
   * follow every move.
   *
   * @purity semi-pure-b
   */
  function owesFrame(
    input: HumanInput,
    before: InputContext,
    partBefore: ScreenPart | null,
    grabBefore: Grabbed | null,
    noticesBefore: readonly RaisedNotice[],
  ): boolean {
    // A wheel that moved nothing is the same question on the same axis (FR-048,
    // NFR-010); table T-078's trigger is not widened. The translator plans
    // nothing for such turns, which lets the comparison below answer false.
    // Every binding the picture is drawn from is compared: the three
    // `receiveInput` compares at its foot plus the tellings, which are what a
    // refused write changes.
    if (input.kind === 'wheel') {
      // A gesture in flight: MK-2's turn mid-drag moves the axis under a held
      // press, and `previewOfHeldPress` works that picture out again.
      if (pressed !== null) return true
      if (held.document !== before.document) return true
      if (screenState !== before.screenState) return true
      if (selection !== before.selection) return true
      if (raisedNotices !== noticesBefore) return true
      // The standing explanation is not asked here: a move repaints because it
      // takes the explanation down (EZ-6 of table T-040), and a wheel moves no
      // pointer, so what EZ-2 / EZ-6 draw from is unchanged. Asking here would
      // repaint every turn over a standing explanation.
      return false
    }
    if (input.kind !== 'pointer' || input.phase !== 'move') return true
    // 1. A gesture in flight: the drag, the pan and the marquee draw something
    //    that follows the pointer.
    if (pressed !== null) return true
    // 2. Something follows the pointer (FR-048): the guide cursor (S-66 of table
    //    T-202) unless it is none, and the following side of the Dual Cursor
    //    (DC-1 of table T-029a).
    const guideMode = before.document.documentSettings.guideCursorMode
    if (guideMode !== GUIDE_CURSOR_NONE) return true
    if (dualCursorFollowing !== null) return true
    // 3. What this happening changed, compared against the context, which is the
    //    snapshot taken before the three members ran.
    if (selection !== before.selection) return true
    if (screenState !== before.screenState) return true
    if (held.document !== before.document) return true
    // 4. FR-048's exemption: the entry under the pointer changed. Asked only of
    //    the side that drew it (Chapter 5.3, under table T-065). With no
    //    `ScreenWiring` both sides are null.
    if (!isSameScreenPart(partUnderPointer, partBefore)) return true
    // 4a. A standing explanation goes away on a move (EZ-6 of table T-040; EZ-2
    //    by IN-3 of table T-028), so the move changes what is drawn; without
    //    this it stays up until another happening. The flag records what the
    //    last frame put up, and settles false on the repaint.
    if (isTooltipStanding) return true
    // 5. The same question asked of the schedule, where FR-043's grab slop and
    //    FR-013's marker are drawn. IF-9 cannot answer there: the schedule goes
    //    up whole over IF-1, so `readScreenPartAt` is `null` across the drawing
    //    area; table T-023d tells places apart, through `grabAtPointer`. A move
    //    within one row of that table still owes nothing (FR-048).
    return !isSameGrab(grabUnderPointer, grabBefore)
  }

  /**
   * IF-9's return direction, spent before the happening that carried it here.
   *
   * Collected on an input, not polled: settling a field (leaving it or `Enter`)
   * is itself a happening over IF-2 (NFR-010).
   *
   * The commit is not always standing when this runs. Only SK-19's `Enter` is
   * settled by the surface's own listener, which hears it before the window;
   * every other settling is the host's `change`, raised in the press's default
   * action after this function returns, so it rides the next happening. That
   * delay may not be closed here: `change` is not a trigger in table T-078. A
   * pointer gesture brings its own next happening; a `Tab` does not, since
   * table T-036 assigns nothing to a release and the seam reports no `keyup`.
   *
   * Before PI-18's three members read the document, so the settled value is in
   * the document the press is translated against. Its own context is not the
   * second read `receiveInput` warns about: that forbids the three members
   * answering about different moments.
   *
   * An empty answer is not written: it would still push an undo step (WS-4).
   *
   * @purity non-pure
   */
  function spendFieldCommit(frame: FrameValues): void {
    // Cleared first on every happening, so SK-19's second stage reads this
    // happening's answer.
    didSettleFieldEntry = false
    if (screen === undefined) return
    const commit = screen.surface.readFieldCommit()
    if (commit === null) return
    // Set on the commit, not the commands: a value naming no row of table T-108
    // is still a settled edit, which is what SK-19's second stage asks.
    didSettleFieldEntry = true
    const commands = commandFromFieldCommit(commit, collectInputContext(frame))
    if (commands.length === 0) return
    // One property change is one undo step (FR-031, UN-3 of table T-027).
    // Declared as the settling: WS-2 refuses a write made before the entry was
    // settled, and this write is the settling. Reset in `finally`: a refusal
    // raises a telling, and a flag left standing would exempt later writes.
    isSettlingFieldCommit = true
    try {
      writeDocument(commands, frame)
    } finally {
      isSettlingFieldCommit = false
    }
  }

  /**
   * FT-1 of table T-078 -- one happening arrived over IF-2.
   *
   * @purity non-pure
   */
  function receiveInput(input: HumanInput): void {
    // FR-102: recorded before anything is decided and before any early return,
    // so a dropped happening still shows.
    recordHappening(input)
    const frame = values
    // Dropped while no frame has run: BO-1 has not settled the size (NFR-011),
    // so there is no frame to read a coordinate against.
    if (frame === null) {
      recordLine('dropped', 'reason=noFrameHasRunYet')
      return
    }

    // Before `spendFieldCommit`: SK-19's first stage and IN-4's first level ask
    // about the notices when this key arrived, and the settling below can raise
    // one. See `noticeReasonsOnArrival`.
    noticeReasonsOnArrival = new Set(raisedNotices.map((one) => one.reason))

    spendFieldCommit(frame)

    // The outside is read once, before anything is decided (R7.4): CS-2 freezes
    // IF-9's answer onto the press, and FR-048 compares it.
    const partBefore = partUnderPointer
    // Where the pointer stood on the schedule, at the same moment, for FR-048's
    // comparison against table T-023d.
    const grabBefore = grabUnderPointer
    // The tellings, for `owesFrame`: a refused write leaves the document
    // unchanged but adds a notice.
    const noticesBefore = raisedNotices
    if (input.kind === 'pointer') {
      // FR-018's repeat ends where table T-028 ends the gesture (IN-1 release,
      // IN-1a lost pointer). First in this block: NT-8's dismissal below returns
      // early, and a repeat not stopped before it would tick for ever. IN-1's
      // `Esc` is a key and is handled further down.
      if (input.phase === 'up' || input.phase === 'lost') endEntryRepeat()
      // FT-4 of table T-078: the rest restarts where the pointer moved to.
      // Judged on the point, not the kind of happening (EZ-2 of table T-040): a
      // host reports `move` for a pointer that has not left its pixel, and
      // counting those would hold the wait open for ever.
      const hasMoved = pointerAt === null || pointerAt.x !== input.x || pointerAt.y !== input.y
      pointerAt = { x: input.x, y: input.y }
      if (hasMoved) beginPointerRest()
      // IN-3 of table T-028: the dismissal belongs to where the pointer stood,
      // not to the session, else one `Esc` would silence every later
      // explanation. The same pixel test as the rest, so a still hand keeps it.
      if (hasMoved) isTooltipDismissed = false
      partUnderPointer =
        screen === undefined ? null : screen.surface.readScreenPartAt(input.x, input.y)
      // Recorded before the three members are asked: IN-1 settles nothing on the
      // press, and `InputContext.pressed` left null on the press leaves every
      // drawn entry unassigned (MK-10).
      if (input.phase === 'down') {
        pressed = collectPress(input, frame, partUnderPointer)
        // FR-053: the corner an interruption (IN-1) puts back. Taken on the
        // press only: `paletteCornerOf` resolves the default from this frame's
        // `Row Area`, so a later read after the window moved would restore a
        // place the palette never stood at.
        commandPaletteCornerAtPress =
          partUnderPointer?.entry === PALETTE_GRAB_BAND_ENTRY
            ? paletteCornerOf(commandPaletteDraggedTo, frame.regions)
            : null
        // FR-052: a press on this panel's boundary must draw the width being
        // made, so a put-away panel comes back on the press, not the release --
        // otherwise its width stays 0 through the drag. Not decided by the spec:
        // what a boundary drag means to a put-away panel; nothing else is read
        // into the press (no subject, no `propertiesShowing`).
        if (partUnderPointer?.dividerPanel === 'propertiesPanel') {
          isPropertiesPanelPutAway = false
        }
        // FR-018: the hold is measured from the press. After `collectPress`,
        // because `pressHeldOnRepeatingEntry` reads the entrance that press
        // recorded (CS-2 of table T-066). Asked for every press: that member
        // knows which entrances repeat.
        beginEntryRepeat()
      }
      // NT-8 of table T-037, answered here: `raisedNotices` is the shell's (LY-5
      // of table T-060), and `UF-67` raises into it. On the release (IN-1 of
      // table T-028). By key, not index -- see `noticesWithout`.
      if (input.phase === 'up' && partUnderPointer?.noticeDismissKey != null) {
        raisedNotices = noticesWithout(partUnderPointer.noticeDismissKey)
        ask()
        recordLine('done', 'spent=noticeDismiss frame=yes')
        return
      }
    }

    // NT-7 of table T-037: `y` / `n` answer a standing question.
    // Placed here by NT-7's own ordering: after NT-8's dismissal, before IN-4
    // (`escapeLevelOf`) and table T-036 (`commandFromInput`), both below. Not a
    // second dispatch path: this returns before the three members run.
    // Modifiers are not read: NT-7 bars the keys, not combinations, so
    // `Ctrl`+`Y` over a question answers it instead of redoing (SK-7 of table
    // T-036).
    if (asking !== null && input.kind === 'key' && isConfirmationAnswerKey(input.key)) {
      answerConfirmation(input.key === CONFIRMATION_PROCEED_KEY, frame)
      ask()
      recordLine('done', `spent=confirmation=${input.key} frame=yes`)
      return
    }

    // R7.4: one context, the same value to all three members -- rebuilding it
    // would read the clock again (`semi-pure-b`), and they would answer about
    // different moments.
    const context = collectInputContext(frame, noticeReasonsOnArrival.size > 0)
    // IN-4 of table T-028: the levels the shell holds (LY-5 of table T-060).
    // Asked off `context` before the three members run: asked after
    // `screenStateFromInput` moved the state, one press would spend two levels.
    const escapeLevel = escapeLevelOf(
      input,
      context,
      asking !== null,
      isPropertiesPanelOnScreen(),
      isTooltipStanding,
    )
    // IN-3 / IN-4 of table T-028: the explanation rung. Spent here because UF-69
    // raises the explanation afresh every frame, so the putting-away must be a
    // value the next frame reads (`ScreenSession.isTooltipDismissed`).
    // Not in `isEscapeSpentHere`: `screenStateFromInput` consumes no 'tooltip'
    // level, so it leaves the state untouched and one level is spent (IN-4).
    if (escapeLevel === 'tooltip') isTooltipDismissed = true
    const chosenBeforeThisHappening = selection
    selection = selectionFromInput(input, context)
    // FR-091's just-created scene ends where the selection moves. SK-19's
    // `Enter` moves no selection, so the flag still stands for `carryOutAction`.
    endCreatedNamingIfChosenMoved(chosenBeforeThisHappening)
    // SK-12 opens U-54 here; the chosen format is spent in `answerSettledFormat`.
    // Not asked when this press took one of the two levels this file holds: that
    // member cannot see the question or the panel (see `EscapeContext`), so it
    // would spend the next level down on the same press (IN-4).
    const isEscapeSpentHere = escapeLevel === 'confirmation' || escapeLevel === 'propertiesPanel'
    const wasPaletteShown = screenState.paletteShown
    screenState = isEscapeSpentHere ? screenState : screenStateFromInput(input, context)
    // FR-053: when S-99e goes from hidden to shown, S-200 is cleared.
    // Read as a change of S-99e, not a press: IC-7 of table T-109 and SK-14 of
    // table T-036 both move it. Here because S-99e rides on `ScreenState` and
    // S-200 is this layer's (LY-5 of table T-060). One direction only: hiding
    // leaves S-200 alone (FR-053 keeps the two states apart).
    if (!wasPaletteShown && screenState.paletteShown) isPaletteMinimised = false
    const translated = commandFromInput(input, context)

    // IN-4's first level: the telling NT-8 of table T-037 puts away. Spent here
    // because `raisedNotices` is held here (`escapeTarget`, PI-36, names the
    // level). `escapeLevel` is one value, so no press is two levels, and
    // `screenStateFromInput` leaves 'notice' alone.
    if (escapeLevel === 'notice') dismissNewestNotice()
    // IN-4's level for U-55. An abandoned question does not write: NT-7 makes
    // proceeding a choice, and this press chose neither. Not decided by the
    // spec: no row equates `Esc` with cancelling; a ruling moves the `false`.
    // Cleared before the landing runs, as `answerSettledEntry` does.
    if (escapeLevel === 'confirmation') answerConfirmation(false, frame)
    // IN-4's rung for U-25: table T-109's closing entry lists the
    // `Properties Panel`, and `escapeTarget` chooses the rung.
    // Writes the putting-away, not the width: S-171 keeps the opening width out
    // of the document, so a dragged width survives and UN-16 of table T-027 is
    // untouched.
    if (escapeLevel === 'propertiesPanel') isPropertiesPanelPutAway = true
    // DC-4 / DC-7: `Esc` leaves the mode and clears the two lines.
    // The same CM-61 write `commandFromDualCursorEntry` makes on the re-press
    // road, on the road the translator cannot reach (the holder lives here,
    // LY-5 of table T-060).
    // The level implies the mode is up (`escapeContextOf` reads
    // `dualCursorFollowing !== null`) and no gesture in flight (`escapeTarget`
    // ranks 'gesture' higher), so WS-2 cannot refuse the write.
    if (escapeLevel === 'dualCursorMode') {
      dualCursorFollowing = null
      writeDocument([{ kind: 'clearDualCursor' }], frame)
    }

    // Order matters: the press is dropped after the translator read it (a
    // release is decided from the press, CS-2) and before the write below,
    // because WS-2 refuses a write during a gesture (AG-9 of table T-035).
    // IN-1's `Esc` ends one the same way; otherwise the drag would still be
    // written on release and `escapeTarget` would answer 'gesture' for ever, so
    // IN-4a could never hand `Esc` to the browser (FR-071).
    if (hasEndedGesture(input) || escapeLevel === 'gesture') pressed = null
    // IN-1's `Esc`: the only end of FR-018's repeat that arrives on a key. After
    // the press is dropped; a repeat must never outlive its press.
    if (escapeLevel === 'gesture') endEntryRepeat()

    // FR-053: an interrupted drag (IN-1 `Esc`, IN-1a lost pointer) puts the
    // palette back where it began; dropping the press alone would leave it where
    // the finger reached. A release is not an interruption. Before
    // `carryOutAction` at no cost: neither happening carries a travel.
    const isDragInterrupted =
      escapeLevel === 'gesture' || (input.kind === 'pointer' && input.phase === 'lost')
    if (isDragInterrupted && commandPaletteCornerAtPress !== null) {
      commandPaletteDraggedTo = commandPaletteCornerAtPress
    }
    // Cleared with the press only: a corner kept past the gesture would be spent
    // by the next `Esc`, a level IN-4 of table T-028 does not give it.
    if (hasEndedGesture(input) || escapeLevel === 'gesture') commandPaletteCornerAtPress = null
    // HF-15's picture goes with the press. Nothing is put back: the grab wrote
    // nothing (table T-023d).
    if (hasEndedGesture(input) || escapeLevel === 'gesture') rowGrabbedAt = null

    // FR-032 / FR-038 / OP-3: the entries this loop answers itself, and FR-096's
    // format, read off the press this release settled from (CS-2 of table
    // T-066). Before `carryOutAction`, so one press is not also an edit.
    const settledEntry = entrySettledOnRelease(input, context)
    const settledFormat = formatSettledOnRelease(input, context)
    // NT-7 of table T-037: one of the two word buttons. A press lands on at most
    // one of a table T-109 row, a table T-024 row or an NT-7 answer, which is
    // why `ScreenPart` reports them separately; NT-7 gives the answers no row of
    // table T-109.
    const settledAnswer = answerSettledOnRelease(input, context)
    const spent =
      (settledEntry !== null &&
        answerSettledEntry(settledEntry, surfaceSettledOnRelease(input, context), frame)) ||
      (settledFormat !== null && answerSettledFormat(settledFormat)) ||
      // FR-020: U-60 also carries NT-7's buttons, so it is offered the answer
      // first; it answers false unless it is the surface standing.
      (settledAnswer !== null &&
        answerWatermarkUnlock(settledAnswer === CONFIRMATION_PROCEED_ANSWER)) ||
      (settledAnswer !== null &&
        answerConfirmation(settledAnswer === CONFIRMATION_PROCEED_ANSWER, frame))
    if (!spent) carryOutAction(translated.action, frame)

    // PTD-1 of table T-023a: the pan telescopes like the palette, here because a
    // pan's action is an ordinary `changeDocument`. Without it every piece of a
    // drag is measured from the press and the pan runs away. Set to the pointer,
    // since this happening is the pointer the write came from. Only when the
    // write went: a move spent elsewhere moved nothing.
    // GR-21's scrollbar grip telescopes on the same line (closing rule of table
    // T-023d; `scrollbarFollow` plans like `panFollow`). Told apart by the part,
    // not the row: a lane carries no row of table T-023a.
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

    // FR-072: while the panel stands, a moved selection moves its contents;
    // SL-2 / SL-3 presses have no action, so `carryOutAction` never hears them.
    // Only while the panel already stands (FR-072). `propertiesShowingNow` and
    // not `propertiesShowing`: a put-away panel is not standing.
    // Compared by identity (PI-18): `selectionFromInput` returns the same value
    // when nothing moved.
    // @provisional PND-144
    if (selection !== context.selection && propertiesShowingNow() !== null) {
      showPropertiesOfChoice()
    }

    // OP-3: the `Open Chooser` went away without an answer, so the read is
    // abandoned. The only way the wait ends unanswered: the question stands in
    // S-99g, which IN-4 of table T-028 can close without asking. Read after the
    // entry above, which clears both on a real answer.
    if (openChoosing !== null && screenState.surface !== OPEN_CHOOSER_SURFACE) {
      const abandoned = openChoosing
      openChoosing = null
      abandoned.settle(null)
    }

    // FR-022: U-61 went away without an answer, so the merge is abandoned, as
    // the `Open Chooser` above. MG-6 holds: nothing is written while it stands.
    if (mergeChoosing !== null && screenState.surface !== DIFFERENCE_REVIEW_SURFACE) {
      const abandoned = mergeChoosing
      mergeChoosing = null
      mergeCandidates = []
      unreadColumns = []
      abandoned.settle(null)
    }

    // FR-023: U-62 went away, so the names it laid out go with it. It asks
    // nothing, so `Esc` and `OK` decide the same.
    if (droppedTaskNames.length > 0 && screenState.surface !== IMPORT_REPORT_SURFACE) {
      droppedTaskNames = []
    }

    // IN-2 of table T-028: the pointer shape. Last, after the press is dropped,
    // so a release no longer finds PTD-1 in flight. Asked on every happening: a
    // key can change the arming (SK-1 of table T-036) while the pointer stands
    // still. The hit test is asked here too, once (R7.4), against the schedule
    // as this happening left it.
    if (pointerAt !== null) {
      grabUnderPointer = grabAtPointer(frame, pointerAt.x, pointerAt.y, partUnderPointer)
      showPointerShape?.(
        pointerShapeAt(frame, pointerAt.x, pointerAt.y, partUnderPointer, grabUnderPointer),
      )
    }

    // FR-052 and table T-023d's closing rule for GR-1 / GR-2: the held press's
    // preview. One assignment sets and clears it: the press was already dropped
    // above on release, lost pointer and `Esc`, and a second place to clear it
    // would be a second rule for when a gesture ends. From `pointerAt`, not
    // `input`, so a key mid-drag does not blank it. After `carryOutAction`, so
    // the fold starts from what the release wrote.
    // Trap: `context` and `frame` are from this happening's start, so a wheel
    // zoom mid-drag previews against the pre-zoom layout for one frame; the
    // release translates again against its own moment, so the document is safe.
    previewDocument = previewOfHeldPress(pressed, pointerAt, context, frame)

    // FT-1 owes a frame except where FR-048 takes it back. `ask` coalesces.
    const owesAFrame = owesFrame(input, context, partBefore, grabBefore, noticesBefore)
    // FR-102: what became of the happening. `on` and `grab` are read off the
    // side that drew them; `doc` tells an entrance that did nothing from one
    // with an unexpected effect. No document name, date or number (FR-102).
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

  // BO-5: the first frame (table T-078's note excludes it from FT-1), held back
  // while BO-1 is unsettled; the first resize that settles the size runs it.
  if (settled(environment)) runFrame()

  return {
    /**
     * FR-100: whether leaving the page now would lose work. Asked rather than
     * pushed: it is wanted only as the host is about to leave.
     *
     * @purity semi-pure-b
     */
    hasUnsavedEdits(): boolean {
      return hasUnsavedEdits
    },
    /** @purity non-pure */
    holdDocument(call: HeldDocumentCall): void {
      // The one road, carrying the caller's row (FT-2, WS-1, WS-2).
      replaceHeldDocument(call)
    },
    /**
     * Changes nothing (PI-27): this is asked before the watcher hears the
     * happening. So it is the second build of the context for one happening --
     * see the note at the head of this file for why the two cannot be shared.
     *
     * @purity non-pure
     */
    isBrowserDefaultStopped(input: HumanInput): boolean {
      const frame = values
      // Nothing is assigned before the first frame (MK-10).
      if (frame === null) return false
      const context = collectInputContext(frame)
      // Asked separately: `commandFromInput` sees neither the question, the panel
      // nor the explanation, yet `receiveInput` spends each of those presses.
      // Otherwise an `Esc` that did so would also leave full screen: IN-4a hands
      // the key on only when nothing is consumed (FR-071).
      const level = escapeLevelOf(
        input,
        context,
        asking !== null,
        isPropertiesPanelOnScreen(),
        isTooltipStanding,
      )
      if (level === 'confirmation' || level === 'propertiesPanel' || level === 'tooltip') return true
      // NT-7: `y` / `n` go to nothing else while a question stands, the browser
      // included (MK-10). `InputContext` carries no question.
      if (asking !== null && input.kind === 'key' && isConfirmationAnswerKey(input.key)) return true
      return commandFromInput(input, context).isBrowserDefaultStopped
    },
    receiveInput,
    /** @purity non-pure */
    resize(next: FrameEnvironment): void {
      // FT-3: a resize carrying the size in force changed nothing, and NFR-010
      // forbids waking a frame for it; browsers fire resize for other reasons.
      if (isSameEnvironment(next, environment)) return
      const wasSettled = settled(environment)
      environment = next
      if (!settled(next)) return
      // The first settled size is BO-5's frame (table T-077), not FT-3's.
      if (!wasSettled) runFrame()
      else ask()
    },
    /** @purity non-pure */
    settleFirstFrameEnvironment(next: FrameEnvironment): void {
      if (isSameEnvironment(next, environment)) return
      environment = next
      // NFR-011: no frame while BO-1's size is unsettled, as in `resize`.
      if (!settled(next)) return
      // Run, not asked for: an asked frame lands in a later task, leaving a
      // picture drawn against unsettled measurements -- see this member's
      // declaration.
      runFrame()
    },
    // Both read a value this loop holds and is free to replace, so neither is
    // deterministic: two calls a frame apart answer differently.
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
      // IF-6 and IF-8, handed on rather than built again: AM-14 and AM-15 use the
      // same two the person's road uses (FR-028). `undefined` travels too, and
      // the members answer `notAvailable` for it.
      rasterizer,
      appShell,
      // FR-022's wait (AM-8) -- see `takeInHandedDocument`.
      takeInDocument: takeInHandedDocument,
      ...dialogueSeams,
    }),
    /** @purity non-pure */
    watchAgentApiEnabling(watch: (isEnabled: boolean) => void): void {
      agentApiEnablingWatch = watch
      // S-99b may start the page on; a watcher told only about turns would leave
      // FR-065's enabling with no public point behind it.
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
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands instead of being handed
 * it: the contract in screen-renderer.ts fixes UF-61 at three
 * arguments, and FR-051 (MUST NOT) forbids a setting to hold the
 * value either -- so there is no door to pass it through. ⛔ It is
 * still not a document setting and must not become one.
 */
export const NOT_STORED_PROPERTIES_PANEL_SIZES: {
  /** S-171, in px */
  readonly 'S-171': number
} = {
  'S-171': 280,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands because the clock is its
 * own to read: FT-4 of table T-078 counts time arriving as a trigger
 * the shell measures for itself, and the note under that table refuses
 * to widen what IF-2 supplies (table T-065) -- so there is no argument
 * to be handed these through and none may be added. ⛔ Neither row is a
 * document setting and neither may become one: the note on S-173 puts
 * the speed of a repeat with the reader rather than with the document,
 * which is the same ground the grab rows stand on.
 */
export const NOT_STORED_REPEAT_TIMES: {
  /** S-172, in ms */
  readonly 'S-172': number
  /** S-173, in ms */
  readonly 'S-173': number
} = {
  'S-172': 1000,
  'S-173': 120,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands instead of being handed
 * it: FR-051 (MUST NOT) forbids a setting to hold what these rows
 * bound, so there is no door to pass one through however many
 * arguments the contract in screen-renderer.ts fixes. ⭐ Where a row
 * stands in two units, Chapter 5.3 is the reason -- an Adapter may
 * not import the Framework file it also stands in, so the one
 * manuscript row is generated into both. ⛔ It is still not a
 * document setting and must not become one.
 */
export const NOT_STORED_SCROLLBAR_SIZES: {
  /** S-205, in px */
  readonly 'S-205': number
} = {
  'S-205': 8,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands because the record is
 * its own to keep: FR-102 (MUST) records the happenings IF-2 delivers
 * to this loop and the frames table T-078 runs in it, so no caller is
 * in a position to be handed the cap on its behalf and no argument may
 * be added to pass it through. ⛔ The row is not a document setting
 * and must not become one -- FR-102 (MUST NOT) keeps the record out of
 * the document, and table T-206 is where the specification says so.
 */
export const NOT_STORED_INTERACTION_RECORD_LIMITS: {
  /** S-207 */
  readonly 'S-207': number
} = {
  'S-207': 2000,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands because the store is its
 * own to read: table T-206 keeps this row in `localStorage`, LM-14
 * admits a host that refuses that store, and no caller holds a name to
 * be handed in on its behalf. ⛔ It is not a document setting and must
 * not become one -- FR-020 (MUST NOT) keeps the watermark out of the
 * document, and table T-206 is where that is recorded.
 *
 * ⭐ IT IS THE FALLBACK AND NOT THE NAME. FR-086 (MUST) has a person
 * enter one and starts them from this default; while nothing asks, the
 * start is the whole of what is held.
 */
export const NOT_STORED_WATERMARK_NAME: {
  /** S-99a */
  readonly 'S-99a': 'user'
} = {
  'S-99a': 'user',
}

/**
 * The values table T-207 states that this unit needs, by row ID.
 *
 * ⭐ Table T-207 holds what is BAKED INTO THE ARTIFACT and not kept
 * in the document, so these are not document settings and are not
 * in SETTINGS_DEFAULTS. They are reached by row ID because the
 * table has no key column -- the row ID is the specification's own
 * name for them.
 *
 * ⛔ THE RAW PASSWORD IS NOT HERE AND MAY NOT BE. FR-020 (MUST NOT)
 * forbids it in code, in the model and in what goes out, and S-100 --
 * the row that states it -- says the artifact takes only the digest.
 * ⚠️ Which is also why this constant cannot be checked by hashing the
 * password here: there would have to be a password here to hash.
 *
 * ⭐ WHAT IT IS COMPARED AGAINST IS NOT ALWAYS THIS. S-99c of table
 * T-206 holds a digest the author set, in `localStorage`; this one is
 * what FR-020 falls back to while no such row is kept.
 */
export const WATERMARK_UNLOCK_DIGEST: {
  /** S-101 */
  readonly 'S-101': string
} = {
  'S-101': 'e2b7f98dfe8145444b33263989fe5e47f9150fe1ef6460713268af974e6df134',
}
// </generated>
