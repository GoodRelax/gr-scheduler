// SingleHtmlShell -- the frame loop.
//
// @unit      UF-48   (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure
//
// Holds the current values, watches what table T-078 says may wake a frame,
// and computes table T-068 once at the head of each one before handing the
// result to everyone who draws (ADR-001).
//
// ⭐ Why this is not in single-html-shell.ts: table T-063 UT-6. Booting is what
// FR-067 and FR-065 constrain; running frames is what LY-5 and ADR-001
// constrain. Two reasons to change, so two files.
//
// ⛔ This is the ONLY layer allowed to hold a current value (table T-060
// LY-5). Everything inward takes what it needs as an argument.
//
// ⭐ TWO SURFACES, ONE FRAME. `SvgSurface` (IF-1) takes the schedule and
// `ScreenSurface` (IF-9) takes every UI part outside it, and both are filled
// from the SAME `ScreenRegions` / `ScheduleLayout` / `ScheduleGeometry` that
// ADR-001 has this file compute once at the head of the frame. ⛔ Drawing one
// of them on values from a different frame is what CA-4 forbids.
//
// ⭐ FT-1 OF TABLE T-078 IS WIRED HERE, and it belongs here rather than in the
// boot file for the reason LY-5 of table T-060 gives: the three members of
// PI-18 that read a happening are `pure`, so the press, the selection, the
// screen state and this frame's values all have to be HANDED to them, and this
// is the file that holds every one of those. `DomInputSource` (PI-27) supplies
// the happening over IF-2, and `single-html-shell.ts` starts it.
//
// ⭐ ONE THIRD OF FT-4 IS WIRED HERE TOO, and this is the layer that row of
// table T-078 names: 「時間が来たこと」 is the shell's to MEASURE. Of the three
// waits it counts, only EZ-2's -- the rest before an icon's explanation -- is
// measured in this build, by `beginPointerRest` and the two current values
// beside it. ⛔ NT-2's deadline and FR-061's autosave are still uncounted, and
// each keeps its note where it is answered.
//
// ⚠️ ONE HAPPENING BUILDS THE CONTEXT TWICE, and the two cannot be shared.
// MK-10 is asked BEFORE the watcher hears the happening
// (`isBrowserDefaultStopped`, which PI-27 takes as a factory argument) and the
// rest is decided after it (`receiveInput`), so the two calls arrive at
// different moments -- and on a `down` the second one sees a press the first
// one could not: recording the press is a change, and MK-10's question must
// change nothing.
//
// ⭐ CS-4 OF TABLE T-066 LIVES HERE TOO, and it is the one unit of consistency
// that is not nested inside a frame. `saveHeldDocumentToFile` and
// `openDocumentIntoHold` are its whole shape: what the operation needs from the
// current values is taken before the first `await`, nothing reads them again
// while the person is answering (MUST NOT), and frames keep running throughout
// -- FT-3 in particular, which NFR-011 will not let stop. ⛔ Nothing is drawn
// to say that a wait is on: CS-4 forbids it (MUST NOT) and table T-078 has no
// trigger for it.
//
// ⭐ IF-7 OF TABLE T-065 IS IMPLEMENTED HERE, which table T-075 gives UF-48 and
// which is why the `Agent API` reaches a document at all: an `AgentSnapshot` is
// made of values LY-5 leaves with this layer and of the frame ADR-001 has this
// file compute, so nowhere else could answer it. ⛔ NOTHING IS EXPOSED FROM
// HERE. Placing the public point is UF-47's, and this file only hands over the
// seams and reports when a person turns FR-065's enabling -- `agentApiSeams`
// and `watchAgentApiEnabling` are the whole of that.
//
// ⭐ THE FRAME THAT PAINTS A QUESTION RAISED AFTER A WAIT IS FT-1's, and the
// table says so itself: FT-1 now covers the continuation of one input across a
// wait, and its own note leaves raising that continuation to the shell while
// keeping IF-2's supply as narrow as it was. So `askHowToOpen` and the two
// confirmations ask for a frame without any trigger of their own being minted
// (NFR-010, MUST NOT).
//
// ⭐ FR-018's REPEAT IS THE SAME ROW READ THE SAME WAY. A held entrance that
// goes on stepping after S-172 is 「その入力の、待ちをまたいだ続き」 and nothing
// else: one human input, still in flight, whose continuation the shell raises
// itself. `beginEntryRepeat` and the two members beside it are the whole of it.
// ⚠️ THE PARENTHESIS IN THAT ROW NAMES ONE WAIT AND NOT THIS ONE. FT-1 spells
// the wait it covers as 「表 T-066 の `CS-4`」, which is the file operation that
// waits on a person, while this wait is S-172; and FT-4's own note says in as
// many words that it counts 3 things, none of them a repeat. ⛔ CR-255 put the
// repeat into FR-018 as a MUST and left table T-078 untouched, so the trigger
// this needs is covered by FT-1's opening clause 「人の入力（ポインタとキー）」 and
// by neither row's later wording. ⚠️ Reported rather than settled here: which
// of the two rows should say so is the specification's to decide.

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
  type DualCursorSide,
  type EscapeTarget,
  type ScreenState,
} from '../../entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../entity/document-model/selection/selection'
import type { Selection } from '../../entity/document-model/selection/selection'
import {
  emptyHistory,
  NOT_STORED_LIMITS,
  type HistoryLimits,
} from '../../entity/document-model/edit-history/edit-history'
import {
  scheduleViolations,
  textOfDay,
  type CalendarDay,
  type Project,
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
  type ReplacementCall,
  type ReplacementRefusal,
  type WriteMoment,
} from '../../use-case/apply-document-change/apply-document-change'
// ⭐ `editDocument` IS PI-9 OF TABLE T-064 AND IS REACHED FOR THE PICTURE ALONE.
// The drag preview below folds a release's writes onto a COPY of the held
// document with it, and PI-9 is pure -- so no stamp is advanced (`advancedStamp`
// is called nowhere in this component's folder), no undo step is pushed (WS-4
// pushes on `applyDocumentChange`'s road only) and nothing is autosaved. That
// FR-031's 「身振り 1 つ ＝ 取り消し 1 段」 survives a mid-drag picture is
// therefore true by construction rather than by care.
import {
  editDocument,
  NOT_STORED_ZOOM_BOUNDS,
  type SettingsLimits,
} from '../../use-case/edit-document/edit-document'
// ⭐ THE ENTRY ITSELF AND NOT ONLY ITS TYPES, which LR-2 admits because this
// lands on PI-10's own declaring file. ⛔ It is reached for ONE thing -- the
// `ImportReport` -- and the reason is on the overlay road below: `ReplaceOutcome`
// (PI-8) carries the document and nothing of what the import had to say, so the
// road that lands the document cannot also hand back what FR-015 (MUST) has to
// be told from.
import {
  importDocument,
  type OpenChoice,
} from '../../use-case/import-document/import-document'
import { notifyChangeWatchers } from '../../use-case/notify-change-watchers/notify-change-watchers'
import {
  validateImportedDocument,
  type ImportBounds,
} from '../../use-case/validate-imported-document/validate-imported-document'
// ⭐ THE ENTRY, FOR ITS SIGNATURE ALONE. `installAgentApi` is the one name
// PI-17 of table T-064 publishes beside the seam, and every type this file
// needs from that component -- IF-7's implementation and the four seams PI-8
// and PI-16 declare for it -- is reachable through it. ⛔ Reached this way
// rather than by importing those types one at a time: `AgentApiWiring`,
// `DialogueLogHolder` and `DialogueAudience` are names no row of table T-064
// carries, and a name that crosses a component folder without a row is what the
// reverse walk of check 26b refuses.
// ⛔ NOTHING IS INSTALLED HERE. Placing the public point is UF-47's (table
// T-075), and `single-html-shell.ts` does it; this file supplies the values.
import type { installAgentApi } from '../../adapter/agent-api-endpoint/agent-api-endpoint'
import {
  documentFromJson,
  documentFromMspdi,
  formatFromFile,
  jsonFromDocument,
  mspdiFromDocument,
  type ExchangeFormat,
  type FormatMismatch,
} from '../../adapter/document-codec/document-codec'
// ⭐ TABLE T-024's EXTENSION COLUMN, AND NOTHING ELSE, reached the way
// `dom-screen-surface.ts` reaches `icon-glyphs.json`: a generated roster is
// data compiled into the program, not a reach into the component whose folder
// it sits in, which is the reading `tools/check_layer_rules.py` states in as
// many words. ⛔ It is read here because PI-20 of table T-064 -- the whole of
// what DocumentCodec may be asked for -- publishes no name that answers which
// extension table T-024 gives a form, and FR-096 (MUST NOT) forbids the value
// being written anywhere but that table.
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
// ⭐ The type only. What an export IS belongs to PI-21 (CP-21), and this file
// hands that component the four values it says a scene is made of -- ADR-001
// has the side that computes a frame do the computing, and none of the four can
// be measured from inside an Adapter.
import type { ExportScene } from '../../adapter/image-exporter/image-exporter'
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
} from '../../adapter/input-command-translator/input-command-translator'
import {
  dismissKeyOf,
  screenViewFromRegions,
  type AutosaveStatus,
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
import { WEB_STORAGE_KEY_PREFIX } from '../local-storage-document-store/local-storage-document-store'

/**
 * What the shell measured about the window this frame. `regionsFromScreen`
 * takes it as an argument because FR-051 forbids a setting to hold the last
 * two -- they differ from one machine to the next.
 */
export interface FrameEnvironment {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly scrollbarThickness: number
}

/** What one frame computed, kept together so nothing recomputes it. */
export interface FrameValues {
  readonly regions: ScreenRegions
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
  /**
   * The settings the three above were measured with -- the document this frame
   * DREW, under `withPropertiesPanelShown`.
   *
   * ⛔ NOT ALWAYS THE HELD DOCUMENT'S. FR-052 has the divider's picture follow
   * the pointer while it is held, and that picture is drawn from a preview whose
   * two panel widths are not the stored ones -- so `settingsLimitsOf` adding the
   * HELD widths back to a `Row Area` cut with the PREVIEW's would report a sum
   * that drifts by exactly the travel, and FR-052's own test is judged on that
   * sum. ⭐ Carried beside the three rather than read again for the same reason
   * `readSnapshot` reads `values` into a local: the frame the picture came from
   * and the frame the bounds are measured against have to be one frame.
   * @provisional PD-254
   */
  readonly settingsMeasuredWith: DocumentSettings
}

/**
 * The rows of table T-230 a caller outside this loop may stand in: the two
 * whose `WS-3` column says the caller brings the document itself.
 *
 * ⛔ NARROWED OUT OF `ReplacementCall`, NEVER WRITTEN AGAIN. What each row
 * carries is PI-8's to say (rule 03 section 1), and the other four rows are not
 * this member's to offer: all four are reached from inside this file -- RD-1
 * and RD-2 from the undo entries, RD-3 and RD-4 from the read OP-2 begins, and
 * an outside caller has no `ImportDocument` call to bring.
 */
export type HeldDocumentCall = Extract<ReplacementCall, { readonly row: 'RD-5' | 'RD-6' }>

/** PI-17's argument list, which is the one route to the five types below. */
type AgentApiWiring = Parameters<typeof installAgentApi>[0]

/**
 * The members of PI-17's wiring that are current values LY-5 of table T-060
 * leaves with this layer, gathered so that the file which PLACES the public
 * point can hand them over without holding any of them itself.
 *
 * ⛔ THE TWO THAT ARE MISSING ARE MISSING BECAUSE THIS FILE CANNOT ANSWER THEM.
 * `writerName` is ED-2 of table T-229 -- 「呼び手が申告した名」 -- and
 * `schemaVersion` is AM-2, which the startup template carries; both belong to
 * the side that installs, and its own notes say what each is settled from.
 * ⚠️ Derived from the wiring rather than listed member by member, so a member
 * added on that side lands here as a type error instead of being forgotten.
 */
export type AgentApiSeams = Omit<AgentApiWiring, 'writerName' | 'schemaVersion'>

/**
 * The rows of table T-233 BO-2 of table T-077 can be told on.
 *
 * ⭐ WHY BO-2 NEEDS A ROAD OF ITS OWN. FR-067 (MUST) and FR-062 (MUST NOT) both
 * have a startup candidate that could not be taken TOLD rather than dropped,
 * and `chooseStartupDocument` (PI-14) answers with what has to be told -- but
 * BO-2 runs before this loop exists, so the raiser it needs cannot be reached
 * at the moment it decides. ⛔ Nothing is queued here instead: the caller keeps
 * what it has to say until it has a loop, which is the only order table T-077
 * admits.
 * ⚠️ `RS-15` IS AMONG THEM, and it is the one place in this file that raises it
 * -- see `NoticeReason` for what that row is and why nothing else uses it.
 */
export type StartupNoticeReason = Extract<NoticeReason, 'RS-15' | 'RS-17' | 'RS-21' | 'RS-25'>

export interface FrameLoop {
  /**
   * FT-2: the current value was replaced, so a frame is owed.
   *
   * ⭐ THE CALLER NAMES ITS ROW OF TABLE T-230 AND BRINGS NOTHING ELSE. That
   * table requires it (MUST) and forbids a replacement that names none (MUST
   * NOT), so the history, the stamp and the undo step are settled by the row on
   * the `replaceDocument` road (PI-8) -- the same road RD-1 and RD-2 take -- and
   * not by any habit of this file's.
   * ⚠️ The name is not `replaceDocument` because R2.1 asks it to say the role:
   * `hold` is LY-5's own word for the one thing this layer does that no other
   * may, and the pair this loop keeps is already `held` (`HeldDocument`).
   * ⚠️ Nothing in `src/` calls it today.
   */
  holdDocument(call: HeldDocumentCall): void
  /** FT-3: the window changed size. */
  resize(env: FrameEnvironment): void
  /**
   * MK-10's answer for one happening: `TranslatedInput.isBrowserDefaultStopped`
   * and nothing else.
   *
   * ⛔ Asked BEFORE the watcher hears the happening, which is what PI-27's
   * factory argument is for, so it must change nothing -- the answer decides
   * whether `preventDefault` is called, and IN-4a would read a screen that had
   * already moved on.
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
   * What one export is assembled from (PI-21), for the base environment FR-080
   * names -- or `null` while BO-1 has settled no size.
   *
   * ⭐ THE ONE PLACE THE PANELS ARE CLOSED. FR-080's environment is not the one
   * a person is looking at, and the difference is a whole run of table T-068,
   * so this is the loop's to answer and nobody else's (LY-5 of table T-060,
   * ADR-001). ⛔ It is NOT run at the head of a frame -- see the member.
   * ⚠️ This is what an implementor of IF-7 puts in `AgentSnapshot.exportScene`,
   * and it is also the road IO-3 of table T-024 takes for a person.
   *
   * @purity semi-pure-b
   */
  exportScene(): ExportScene | null
  /**
   * The seams `installAgentApi` (PI-17) is wired from, all of them values this
   * layer alone may hold (LY-5 of table T-060).
   *
   * ⭐ ANSWERED WHOLE AND ONCE. The five are built with the loop and never
   * replaced, so a caller that installed twice would install against the same
   * seams -- which is what FR-065's third MUST already says of a reference
   * handed out: it goes on working.
   *
   * @purity semi-pure-b
   */
  agentApiSeams(): AgentApiSeams
  /**
   * Hear FR-065's enabling turn, so that the side which places the public point
   * can put it there and take it away again.
   *
   * ⛔ WHY THIS EXISTS AT ALL. FR-028 (MUST) keeps the `Agent API` unexposed by
   * default and FR-065 (MUST) lets a person turn it on, and IC-20 of table
   * T-109 lands on a current value this loop holds -- so the only party that
   * can see it turn is this one, while the only party that may place a public
   * name is UF-47 of table T-075.
   * ⚠️ ONE WATCHER, REPLACED BY THE NEXT. Nothing in table T-078 makes this a
   * trigger and no requirement asks for more than one listener; a second caller
   * would be a second holder of the public point.
   * ⚠️ NOT CALLED BACK FOR THE STATE IT IS IN when it is set: it starts off,
   * which FR-028 requires, so there is nothing to report until it moves.
   *
   * @purity non-pure
   */
  watchAgentApiEnabling(watch: (isEnabled: boolean) => void): void
  /**
   * FR-076 (MUST): raise what BO-2 of table T-077 had to tell but had no loop
   * to tell it on.
   *
   * ⚠️ RAISED AND NOT TOLD, exactly as every other reason this loop raises is:
   * the row goes onto `ScreenSession.notices` and the words are the
   * dictionary's (FR-038, MUST NOT). ⭐ NT-4 of table T-037 -- 「起動時の保留中
   * の用件を 1 枚に集約」 -- is kept by that list being one list.
   *
   * @purity non-pure
   */
  raiseStartupNotice(reason: StartupNoticeReason): void
}

/**
 * The far side of IF-9, and the one thing about this reading session that only
 * the host can answer.
 *
 * ⭐ OPTIONAL ON PURPOSE. Table T-077's boot order and table T-078's triggers
 * govern the schedule as much as the parts around it, so the loop runs whether
 * or not the caller had a browser to build a `ScreenSurface` on.
 */
export interface ScreenWiring {
  /** IF-9's implementation -- the one unit that turns a `ScreenView` into nodes. */
  readonly surface: ScreenSurface
  /**
   * FR-038's answer for this session. ⛔ Settled by the shell and never by the
   * document: FR-038 keeps the chosen language out of it (MUST NOT).
   */
  readonly language: DisplayLanguage
}

/**
 * IN-2 of table T-028 -- the four meanings that row gives a place, spelled the
 * way the host spells them.
 *
 * ⭐ THE SPELLING IS THE HOST'S AND THE MEANING IS THE ROW'S, which is what
 * IN-2's own ⚠️ says in as many words: 「形の綴りそのものは閲覧環境が持つ ——
 * 本行が定めるのはどの場所がどの意味を担うかだけである」. So the four names below are
 * standard keywords of the viewing environment, chosen against their own
 * published meanings, and no fifth is minted.
 *
 * ⚠️ TWO OF THE FIVE ARE A JUDGEMENT AND NOT A READING, because the environment
 * has no keyword that means 「作図」. `crosshair` is published as the shape for
 * selecting a region, so it takes IN-2's 範囲選択; `copy` is published as "a new
 * thing will be made here", which is the nearest published meaning to arming a
 * figure and placing it. ⛔ A ruling that disagrees moves these two names and
 * nothing else.
 * ⭐ `grab` IS A READING RATHER THAN A JUDGEMENT: the environment publishes it
 * as "the thing under the pointer can be moved", which is 「掴めることの合図」
 * word for word. ⚠️ It is the RESTING shape and not `grabbing`, which IN-2
 * already spends on PD-1's pan; the two are the environment's own pair.
 */
export type PointerShape =
  /** 何にも当たらない場所 -- PD-5 of table T-023a. */
  | 'crosshair'
  /** 構えているとき -- PD-4 of table T-023a. */
  | 'copy'
  /** `Ctrl` 併用と中ボタンのパン中 -- PD-1 of table T-023a. */
  | 'grabbing'
  /** 予定バーと実績バーの端点の上 -- GR-3 .. GR-6 of table T-023d. */
  | 'ew-resize'
  /** タスクの本体とマイルストーンの図形の上 -- GR-12 / GR-15 of table T-023d. */
  | 'grab'

/**
 * Where IN-2's shape is put, or nothing when the caller drew no schedule to
 * put it on.
 *
 * ⭐ A FUNCTION AND NOT A MEMBER OF A PUBLISHED INTERFACE. The element that IS
 * the `Schedule Canvas` is made by `single-html-shell.ts`, which is the same
 * component as this file (CP-25), so the two halves reach each other without
 * touching table T-065 -- `SvgSurface` (IF-1) carries the picture and nothing
 * else, and widening it would change a contract this round is not about.
 * ⛔ `null` means "leave the pointer alone", which is what IN-2 leaves a place
 * it does not name.
 */
export type ShowPointerShape = (shape: PointerShape | null) => void

/**
 * What `itemAtPointer` (PI-7) answers where a row of table T-023d claims the
 * point.
 *
 * ⭐ DERIVED FROM WHAT THAT FUNCTION ANSWERS, not imported by name. Table T-064
 * is the full count of what may cross a component folder, and neither the
 * answer's type nor its `grab` is on it -- a derivation states the same types
 * without minting a crossing the table does not hold (check 26b).
 */
type Grabbed = NonNullable<ReturnType<typeof itemAtPointer>>

/**
 * The four rows of table T-023d that are 「予定バーと実績バーの端点」.
 *
 * ⚠️ The plan's two ends and the actual's two ends, and no other row: GR-1 and
 * GR-2 are the fade handles, GR-15 is a milestone's whole figure, and IN-2
 * names none of them.
 */
type GrabbedArea = Grabbed['grab']

/**
 * Which shape IN-2 of table T-028 gives each row of table T-023d, or `null`
 * for a row it names no shape for.
 *
 * ⭐ A CENSUS THE COMPILER KEEPS, for the reason `PREVIEWED_GRABS` gives below:
 * `Record<GrabbedArea, ...>` makes a row added to table T-023d a compile error
 * that names itself, where the `ReadonlySet` this replaced let a new row
 * default silently into 「no shape」.
 * ⛔ THE NULLS ARE IN-2's SILENCE AND NOT AN OVERSIGHT. That row names four
 * places and no more; the fade handles, the progress marker, the resume icon,
 * the dummies, the labels, a dependency line, the boxes, the status line and
 * the palette band are all pressable and IN-2 gives none of them a shape. ⚠️ A
 * shape invented for one of them would be this build writing a requirement.
 */
const POINTER_SHAPE_BY_GRAB: Readonly<Record<GrabbedArea, PointerShape | null>> = {
  // IN-2:「予定バーと実績バーの端点の上は横方向の伸縮の合図」.
  'GR-3': 'ew-resize',
  'GR-4': 'ew-resize',
  'GR-5': 'ew-resize',
  'GR-6': 'ew-resize',
  // IN-2:「タスクの本体とマイルストーンの図形の上は掴めることの合図」(利用者の
  // 裁定 2026-08-27). ⚠️ GR-12 IS ALSO A MILESTONE'S PLAN FIGURE, because a
  // milestone has no plan ENDS for GR-3 / GR-4 to claim; GR-15 is its ACTUAL.
  'GR-12': 'grab',
  'GR-15': 'grab',
  'GR-1': null,
  'GR-2': null,
  'GR-7': null,
  'GR-8': null,
  'GR-9': null,
  'GR-10': null,
  'GR-13': null,
  'GR-14': null,
  'GR-16': null,
  'GR-17': null,
  'GR-18': null,
}

/**
 * Which rows of table T-023d draw, while held, the thing they would write on
 * the release.
 *
 * ⭐ WHAT THE TABLE ITSELF ASKS FOR, ROW BY ROW. THREE of its closing rules are
 * MUSTs about the picture during the drag: one gives it to `GR-9` / `GR-17` /
 * `GR-18`, one to `GR-1` / `GR-2`, and one -- added 2026-08-27 on the user's
 * ruling -- to `GR-3` / `GR-4` / `GR-5` / `GR-6` / `GR-8` / `GR-12` / `GR-14` /
 * `GR-15` / `GR-16`. All three add that 確定 still follows IN-1 of table T-028,
 * so a `true` here settles nothing and only draws.
 *
 * ⛔ TWO ROWS THE THIRD RULE NAMES ARE STILL FALSE, AND NOT BECAUSE THE RULE
 * EXEMPTS THEM: `GR-8` and `GR-14` have no release write at all -- their entry
 * in `commandFromGrab`'s closing census says what each is missing -- and
 * `previewOfHeldPress` draws by folding the write this gesture WOULD make, so a
 * `true` on a row with nothing to fold would cost a walk and paint the same
 * picture. ⚠️ They turn true in the same change that gives them their write,
 * and this note is what says so.
 * ⛔ THE REST ARE FALSE BECAUSE NO CLOSING RULE ASKS: `GR-7` is a press that
 * cycles rather than a drag, `GR-10` cannot arrive by a plain press at all, and
 * `GR-13` selects. Turning one on would be this file inventing a requirement
 * (rule 03 section 1).
 *
 * ⭐ A CENSUS THE COMPILER KEEPS, the bargain `PRESS_CHANGES_DOCUMENT` strikes:
 * `Record<GrabbedArea, boolean>` makes a row added to table T-023d a compile
 * error here that names itself, where the `ReadonlySet` above would let it
 * default silently into 「no picture」.
 * @provisional PD-250
 */
const PREVIEWED_GRABS: Readonly<Record<GrabbedArea, boolean>> = {
  'GR-1': true,
  'GR-2': true,
  'GR-3': true,
  'GR-4': true,
  'GR-5': true,
  'GR-6': true,
  'GR-7': false,
  'GR-8': false,
  'GR-9': true,
  'GR-10': false,
  'GR-12': true,
  'GR-13': false,
  'GR-14': false,
  'GR-15': true,
  'GR-16': true,
  'GR-17': true,
  'GR-18': true,
}

/**
 * Whether a press in flight owes a picture of what it would write.
 *
 * ⛔ `on` IS THE FIRST QUESTION, exactly as it is in `isDocumentChangingPress`
 * and for the same reason: the note under table T-023a limits that table to the
 * schedule's drawing area (MUST), so a press the screen surface answered for
 * carries no row of table T-023d at all. FR-052's `Panel Divider` is one of
 * those -- U-24 has no entry in table T-109, which is why `commandFromEntry`
 * tests `dividerPanel` before it reads `entry`.
 *
 * @purity pure
 */
function isPreviewedPress(press: PointerPress | null): boolean {
  if (press === null) return false
  if (press.on !== null) return press.on.dividerPanel !== null
  return press.hit !== null && PREVIEWED_GRABS[press.hit.grab]
}

/**
 * The reach table T-023d's rows are grabbed by (`itemAtPointer`, PI-7).
 *
 * ⛔ Not one figure is typed here: every value arrives from `NOT_STORED_SIZES`,
 * which `tools/generate_entity_types.py` prints from the manuscript, so a
 * change to table T-206 reaches this file rather than being silently ignored
 * (rule 03 section 1).
 * ⚠️ `S-92` and `S-93` are each stated as a width and a height, while
 * `PointerSlop.fadeHandle` is documented as a HALF-width -- which is why S-92's
 * width is halved here and S-93's pair is passed through as it stands.
 */
const POINTER_SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  dummyWidth: NOT_STORED_SIZES['S-93'][0],
  dummyHeight: NOT_STORED_SIZES['S-93'][1],
  line: NOT_STORED_SIZES['S-137'],
}

/** The factor S-95's remark states: 1 MB = 1024 * 1024 bytes (same as S-113). */
const BYTES_PER_MEGABYTE = 1024 * 1024

/**
 * FR-031's two bounds on the undo history, by the rows table T-206 states them
 * at.
 *
 * ⭐ S-95 IS PRINTED IN MEGABYTES and FR-031 measures a step in BYTES -- 「1 段
 * の大きさは、その段の保存形を UTF-8 で符号化した長さ（バイト）で測ること
 * （MUST）」 -- so the two have to be brought into one unit before
 * `historyWithStep` compares them. ⛔ The factor is not chosen here: S-95's own
 * remark states it, and CR-173 already put the same one beside the same shape of
 * bound in `validate-imported-document.ts` (S-113). ⚠️ Left unconverted the
 * bound was 64 BYTES, which is smaller than any document, so every write
 * collapsed the history to a single step and S-94's fifty were unreachable.
 * ⛔ The generated constant carries the number and the unit exactly as the
 * published cell prints them (CR-178), so the conversion belongs in the unit
 * that applies the bound and nowhere upstream.
 */
const HISTORY_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * BYTES_PER_MEGABYTE,
}

/**
 * SK-8 of table T-036, spelled as that table's assignment column spells it.
 *
 * ⛔ THE SEAM DOES NOT PUBLISH THE SPELLING. `KeyInput.key` is a plain string,
 * so the name has to be written wherever a row of table T-036 is recognised:
 * `dom-input-source.ts` normalises the host's `Escape` to it, and
 * `input-command-translator.ts` keys its own rows on it. ⚠️ This is the THIRD
 * copy of it in `src/`; publishing one takes a change request, not a choice
 * here.
 */
const ESCAPE_KEY = 'Esc'

/**
 * CU-3 of table T-029 -- the guide cursor drawn for nobody. The key that holds
 * it is `S-66` of table T-202.
 *
 * ⭐ The manuscript's own spelling, and the compiler checks it: the member is a
 * literal union, so a value renamed in the manuscript fails type checking here
 * rather than quietly comparing false.
 */
const GUIDE_CURSOR_NONE = 'none'

/**
 * ED-1 of table T-229 -- the word a write made from the screen names itself by.
 *
 * ⭐ The specification's word, not this file's: table T-229 reserves it for
 * 「画面を操作する人」, and AG-6 of table T-035 tells one writer from another by
 * this string alone, so a different spelling here would make this side's writes
 * look like somebody else's.
 * ⚠️ NOTHING GENERATES IT. No target of `tools/generate_entity_types.py` carries
 * table T-229, so a change to that row has to be brought here by hand.
 */
const EDITED_BY_SCREEN = 'user'

/**
 * The rows of table T-109 that only THIS layer can answer.
 *
 * ⭐ WHY THE SHELL AND NOT THE TRANSLATOR. `input-command-translator.ts` lists
 * them among the rows it answers with nothing, and gives one reason for each:
 * what a press on them writes is a current value, and LY-5 of table T-060
 * leaves those with the Framework alone. IC-21 chooses the display language
 * (S-99); IC-50 and IC-51 open and fold FR-053's milestone glyph list (S-142);
 * IC-69 and IC-70 are NT-7's two answers; IC-71 .. IC-73 are OP-3's
 * three, and what each of them settles is a whole-document replacement the
 * Framework is the only layer that may hold. ⛔ None of them is a
 * `DocumentCommand`, so there is no road through table T-108 for any of them.
 * ⚠️ The ids are the join to table T-109, the way `IconId` is everywhere else.
 */
const DISPLAY_LANGUAGE_ENTRY: IconId = 'IC-21'
/**
 * The pair that turns S-142 of table T-206.
 *
 * ⛔ TWO ENTRIES AND NOT ONE IN TWO STATES, which is what table T-109 draws:
 * IC-50 opens the list and IC-51 folds it, each with a glyph of its own. ⚠️ The
 * `Resource Roster`'s IC-67 / IC-68 are the other shape -- those two rows say
 * of themselves that one entrance reverses the other, and these two do not --
 * so they are judged apart here the way `expanderOf` judges HF-2 and HF-3
 * apart.
 */
const MILESTONE_LIST_OPEN_ENTRY: IconId = 'IC-50'
const MILESTONE_LIST_FOLD_ENTRY: IconId = 'IC-51'
const CONFIRMATION_PROCEED_ENTRY: IconId = 'IC-69'
const CONFIRMATION_CANCEL_ENTRY: IconId = 'IC-70'

/**
 * GR-19 of table T-023d -- the band FR-053's palette is dragged by.
 *
 * ⛔ NOT ONE OF THE ROWS ABOVE, and it is here for the opposite reason: table
 * T-109 states in IC-53's own row that it is not a button, so nothing is ever
 * SETTLED on it. ⚠️ `answerSettledEntry` IS STILL ASKED ABOUT IT, because
 * `entrySettledOnRelease` reports whatever entry the press landed on -- it
 * answers `false`, which is what leaves the release's own travel to
 * `carryOutAction`. A row answered there would swallow the last piece of the
 * drag. What this file needs the id for is the other half of IN-1 -- knowing
 * that the press in flight is the palette's drag, so that an interruption
 * beside it can put the corner back, whether that is `Esc` (IN-1) or IN-1a's
 * lost pointer.
 * ⚠️ Read off the press's own `ScreenPart` and not off the action, because an
 * interrupted drag produces no action at all.
 */
const PALETTE_GRAB_BAND_ENTRY: IconId = 'IC-53'

/**
 * The entrances a held press repeats on -- FR-018 (MUST).
 *
 * ⛔ FOUR AND NOT SIX, WHICH IS THE REQUIREMENT'S OWN LIMIT (MUST):
 * 「繰り返す入口は ... 表 T-109 の `IC-12` 〜 `IC-15` に限ること」. It gives its
 * reason for keeping IC-10 and IC-11 out where they stand -- 「繰り返しても同じ
 * 結果にしかならない」 -- the fit and the full screen answer the same picture
 * however many times they are asked, so a repeat on either would be presses
 * spent for nothing.
 * ⚠️ The ids are the join to table T-109, the way `IconId` is everywhere else
 * in this file; `PALETTE_GRAB_BAND_ENTRY` above names its row the same way.
 * ⛔ NOT A SECOND ROSTER OF WHAT THE PRESSES DO. What each of the four writes
 * is `commandFromEntry`'s (PI-18), and the repeat asks that same member again
 * rather than working the zoom out here.
 */
const REPEATING_ENTRIES: readonly IconId[] = ['IC-12', 'IC-13', 'IC-14', 'IC-15']

/** The row of table T-037 a raised question follows -- `NT-7`. */
const CONFIRMATION_MANNER = 'NT-7'

/**
 * The rows of table T-234 this file can ask on, spelled as that table spells
 * them.
 *
 * ⭐ THE ROW ID IS THE KEY, the move `NoticeReason` already makes with table
 * T-233. FR-076 (MUST) has a question show a row of table T-234 and forbids
 * showing one it does not hold (MUST NOT), and FR-038's one dictionary is what
 * turns the row into the sentence NT-7 asks for. ⛔ So nothing here composes
 * one: a raiser that supplied a sentence would be the second store of
 * translated strings FR-038 forbids (MUST NOT).
 *
 * ⛔ THREE ROWS OF THAT TABLE ARE MISSING FROM THIS UNION, and each is missing
 * because no road in this build reaches the moment it names:
 *
 *   QN-3  FR-099's unassignment. `notices.ts` records the same gap from the
 *         other end -- table T-109 places IC-66 on U-49, so there is an
 *         entrance, and what is absent is a raiser that puts the question up
 *         and spends the answer.
 *   QN-6  FR-062's autosave with a different stamp. AutosaveGateway (IF-4) is
 *         not built into the shell, which `single-html-shell.ts` states at
 *         BT-3 of table T-034.
 *   QN-7  FR-026's offer to recover. Same missing gateway, same BT-3.
 *
 * ⛔ NO CALLER IS INVENTED FOR ANY OF THE THREE. A question raised from a road
 * that does not exist would be asked about nothing.
 *
 * ⚠️ `QN-8` IS DELIBERATELY ABSENT, exactly as `RS-15` is absent from
 * `NoticeReason`: it is where the DICTIONARY lands when it is asked for a key
 * it does not hold, and every question this file asks is a row of its own --
 * handing that row over would say something untrue about the question at hand.
 */
type ConfirmationQuestion = 'QN-1' | 'QN-2' | 'QN-4' | 'QN-5'

/**
 * The row of table T-234 DI-4's overwrite question shows.
 *
 * ⚠️ THE ONE ROW OF THE FOUR THAT NAMES NOTHING, and the table says why in its
 * own 名前を挙げるか column: 「正の行が自らそう定めている」 -- DI-4 of table
 * T-227 states that the naming clause does not reach it.
 */
const OVERWRITE_QUESTION: ConfirmationQuestion = 'QN-4'

/** The row of table T-234 OP-4's replace question shows. */
const DISCARD_QUESTION: ConfirmationQuestion = 'QN-5'

/**
 * The rows of table T-233 this file can raise, spelled as that table spells
 * them.
 *
 * ⭐ THE ROW ID IS THE KEY, the move `Notice.manner` already makes with table
 * T-037. FR-076 (MUST) has a telling carry a row of that table as its reason and
 * forbids carrying any reason it does not hold (MUST NOT), and FR-038's one
 * dictionary is what turns the row into the words NT-1 asks for and the next
 * step NT-3a asks for. ⛔ So nothing here composes a sentence: a raiser that
 * supplied one would be the second store of translated strings FR-038 forbids
 * (MUST NOT).
 *
 * ⚠️ `RS-15` IS HERE FOR ONE RAISER AND NO OTHER. FR-076 says in as many words
 * that it is 「行の無い理由に落ち先を与える」 row, and BT-1's second failure is
 * the first reason in this file that has no row of its own: FR-067 (MUST) makes
 * 「入れ口が 1 つでない」 a thing to be told, and table T-233 holds nothing for
 * it. ⛔ Every other reason below is a row of its own, and handing RS-15 over
 * for one of those would say something untrue about the reason at hand. ⚠️ It
 * is also where the DICTIONARY lands when it is asked for a key it does not
 * hold, which is why a raiser may not reach for it out of convenience.
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
  | 'RS-17'
  | 'RS-20'
  | 'RS-21'
  | 'RS-23'
  | 'RS-25'

/**
 * Which row of table T-037 each of those rows is written against.
 *
 * ⭐ A CENSUS THE COMPILER KEEPS, the move `PRESS_CHANGES_DOCUMENT` makes for
 * table T-023a: a row added to `NoticeReason` is a compile error here, naming
 * the reason whose manner has to be read out of table T-233.
 * ⛔ CARRIED RATHER THAN WORKED OUT ON THE FAR SIDE. `RaisedNotice.manner` says
 * why: NT-5 (MUST) makes an accepted-with-a-caution telling have to look unlike
 * NT-1's refusal, and only the raiser knows which of the two happened.
 * ⚠️ NOTHING GENERATES THE PAIR. No target of `tools/generate_entity_types.py`
 * carries table T-233, so a manner moved in that table has to be brought here by
 * hand -- the same standing cost `EDITED_BY_SCREEN` records for table T-229.
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
  'RS-17': 'NT-3a',
  'RS-20': 'NT-5',
  'RS-21': 'NT-1',
  'RS-23': 'NT-3a',
  'RS-25': 'NT-1',
}

/**
 * Which row of table T-233 each reason a file operation can fault with is, or
 * `null` for the one reason that is owed nothing.
 *
 * ⛔ `cancelled` HAS NO ROW AND IS OWED NONE. IF-3 keeps it apart from the
 * failures precisely so that it is not reported -- the person called the write
 * off -- so it is the raiser's not to raise, and table T-233 gives it nothing to
 * raise it with.
 * ⭐ A census the compiler keeps: a reason added to `DocumentFileFaultReason` is
 * a compile error here rather than a fault that quietly reaches nobody.
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
 * Which row of table T-233 each refusal of table T-067 is, or `null` where that
 * table names none.
 *
 * ⭐ KEYED ON THE REASON ALONE, AND THAT IS ENOUGH: the two roads' refusals
 * spell six reasons between them and no two of them are the same word, so the
 * step rides on the reason and a census on it stays a census. A row added to
 * either union is a compile error here.
 * ⛔ `importRefused` HAS NO ROW. Table T-233's `WS-3` row is written for a
 * bundle of commands dropped, and `WS-3` on the replacement road is
 * ImportDocument's -- whose refusal is, in four of its shapes, a question to put
 * to a person rather than GRS turning the write away. Telling one as the other
 * would say which item is wrong and be wrong about it, which is the half of NT-1
 * (MUST) that matters. ⚠️ A row of table T-233 for it is what is owed.
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
 * Which row of table T-233 each answer OP-12 can give is.
 *
 * ⚠️ `both` IS ONE VALUE FOR TWO SITUATIONS -- `FormatMismatch` says which two
 * -- and table T-233 has a row for one of them. The other is two rows at once,
 * and `RaisedNotice.reason` carries one; nothing on `FormatReading` tells the
 * two apart without reading table T-024's roster a second time, which is the
 * duplication R2.7 refuses.
 */
const NOTICE_REASON_OF_FORMAT_MISMATCH: Readonly<Record<FormatMismatch, NoticeReason>> = {
  extension: 'RS-11',
  firstCharacter: 'RS-12',
  both: 'RS-13',
}

/** The row of table T-233 OP-11's caution carries. */
const IGNORED_FILES_REASON: NoticeReason = 'RS-14'

/**
 * The row of table T-233 FR-015's caution carries -- the overlay's own tasks
 * that matched no current task and are therefore not drawn.
 *
 * ⚠️ ITS MANNER IS `NT-5` AND NOT `NT-1`, which is the whole shape of this
 * telling: the open was ACCEPTED and the caution rides along with it, so nothing
 * on this road turns the read away. The census above is where that pairing is
 * read out of table T-233, not here.
 */
const OVERLAY_NOT_DRAWN_REASON: NoticeReason = 'RS-16'

/**
 * The row of table T-233 FR-088's refusal carries -- a calendar that works no
 * weekday cannot become the document's.
 *
 * ⭐ THE CONDITION IS NOT REPEATED HERE. FR-088 sends it to IV-17 of table
 * T-220 in as many words, and `scheduleViolations` (PI-1) is what answers that
 * table -- so this side asks the invariant and carries the row, and neither the
 * rule nor its wording is written twice.
 * ⚠️ ITS MANNER IS `NT-1`, which FR-088 states itself (「受け付けずに通知する
 * こと（MUST）…作法は `FR-076` の `NT-1`」). The census above is where that
 * pairing is read out of table T-233.
 * ⚠️ NARROWED TO THE ONE ROW rather than typed as the whole union, because BO-2
 * of table T-077 raises it as well and `StartupNoticeReason` admits only the
 * three rows that road can carry.
 */
const NO_WORKING_WEEKDAY_REASON: Extract<NoticeReason, 'RS-21'> = 'RS-21'

/**
 * The row of table T-233 a change watcher that did not answer is told on.
 *
 * ⚠️ ITS MANNER IS `NT-3a`, so the telling owes a next step -- which is the
 * whole reason the outcome of `notifyChangeWatchers` may not be dropped: AG-6
 * of table T-035 is the row table T-233 names as its 正, and a delivery that
 * failed in silence leaves nobody able to act on it.
 */
const WATCHER_SILENT_REASON: NoticeReason = 'RS-23'

/**
 * The row of table T-233 FR-065's third MUST is kept with -- 「無効にしても、
 * 既に渡した参照は取り消せないことを利用者に示すこと」.
 *
 * ⭐ RAISED ON THE TURN TO OFF, which is the moment that sentence is about: a
 * person who has just disabled the `Agent API` is the person who might read the
 * disabling as taking a reference back. ⚠️ ITS MANNER IS `NT-5`, and NT-5's own
 * roster in table T-037 names 「`FR-065` の渡した参照」 among what it covers --
 * the disabling was ACCEPTED and the caution rides along with it, so nothing
 * about the press is turned away.
 * ⛔ IT IS NOT A GUESS ABOUT WHETHER A REFERENCE WAS EVER TAKEN. `installAgentApi`
 * answers with a value the caller keeps, and no member of table T-107 reports
 * that one was handed on -- so the telling is owed whenever the API was on.
 */
const HANDED_REFERENCE_STANDS_REASON: NoticeReason = 'RS-20'

/**
 * The row of table T-220 FR-088 refuses on.
 *
 * ⭐ A ROW ID AS A VALUE, the way a reason is one: FR-088 points at this row
 * and `ScheduleViolation.row` carries it, so the id is the join and none of the
 * row's prose is repeated here (rule 03 section 1).
 * ⛔ ONLY THIS ROW STOPS AN OPEN. `scheduleViolations` answers eighteen rows and
 * refuses nothing itself -- 「Whether one stops a load, a save or an edit is the
 * caller's to decide」 -- and FR-088 is the one requirement that says a row of
 * that table turns an input away. The other seventeen have no row of table
 * T-233 to be told on, which is the same gap the OP-5 verdict already records.
 */
const NO_WORKING_WEEKDAY_INVARIANT = 'IV-17'

/**
 * FR-088's gate, asked of one document: the row it has to be turned away on, or
 * `null` when it passes.
 *
 * ⭐ WHY IT IS A FUNCTION OF THIS FILE AND NOT OF THE BOOT FILE. The row id
 * above and the reason below are the join between table T-220 and table T-233,
 * and rule 03 section 3 forbids a second copy of either; BO-2 of table T-077
 * needs the same gate for BT-1 of table T-034, so the two roads ask one
 * question rather than spelling two ids twice.
 * ⛔ WHY BT-1 NEEDS IT AT ALL. A calendar that works no weekday leaves every
 * count of working days with no day to reach, and `schedule.ts` throws rather
 * than answer -- so a document carrying one has to be refused BEFORE it becomes
 * the current document, and after BO-2 there is no road left that does not end
 * in the drawing.
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
 * U-56 `Open Chooser` of table T-103 -- the surface OP-3 of table T-024a puts
 * its three-way question on.
 *
 * ⭐ A SETTLED NAME COPIED SPELLING AND ALL (rule 03 section 1), because three
 * sides have to agree on it: `ScreenState.surface` (S-99g) carries it,
 * `icon-roster.json` places IC-71 .. IC-73 on it out of table T-109's own
 * surface column, and `readScreenPartAt` answers with it. ⛔ Not minted here --
 * U-56 is what made this question askable at all.
 * ⚠️ NOT `Confirmation` (U-55): that surface is NT-7's two answers and holds no
 * third entry, which is what U-56's own remark says it is not.
 */
const OPEN_CHOOSER_SURFACE = 'Open Chooser'

/**
 * The three entries table T-109 places on that surface, each bound to the
 * answer `OpenChoice` (PI-10) spells for it.
 *
 * ⭐ A JOIN, NOT A TRANSLATION. Table T-109 has no English column on purpose,
 * so a row id is the only handle it admits; the three spellings on the right
 * are `import-document.ts`'s, and this states which row means which. ⛔ Nothing
 * of either side's wording is copied.
 * ⚠️ OP-9 is why the third one is not an entry of its own kind: that row says
 * the way to the overlay IS OP-3's third choice, and IC-4 of table T-109 warns
 * in as many words that its own entry is not a way of reading a file.
 */
const OPEN_CHOICE_OF_ENTRY: Readonly<Record<IconId, OpenChoice>> = {
  'IC-71': 'replace',
  'IC-72': 'merge',
  'IC-73': 'baseline',
}

/**
 * OP-2 of table T-024a -- which of its two routes this loop takes.
 *
 * STOP -- ⛔ THE OTHER ROUTE HAS NO TRIGGER. A drop is watched by the store
 * itself (PI-28 says why: the handle does not survive the event), so
 * `readFileToOpen('drop')` reads what it already took -- and table T-078 names
 * no happening for a file arriving that way, which NFR-010 (MUST NOT) forbids
 * this file from adding. ⚠️ The store therefore holds dropped files that
 * nothing asks it for.
 */
const OPEN_ROUTE_FROM_CHOOSER: OpenRoute = 'chooser'

/**
 * What SK-11 of table T-036 writes, whatever the document was opened from.
 *
 * ⭐ FR-096 (MUST) settles it and leaves the caller no choice, and carries a
 * MUST NOT against this route writing an MSPDI-opened document back as MSPDI.
 * ⛔ So the form is a constant of the SAVE path rather than something read off
 * the file that was opened -- reading it there is what that MUST NOT forbids,
 * and it is also why nothing here asks the store what it is holding.
 * ⚠️ The spelling is `SaveFileForm`'s, which `file-gateway.ts` owns (CR-146),
 * so a renamed member fails type checking here rather than comparing false.
 */
const SAVE_FORM: SaveFileForm = 'grsJson'

/**
 * The row of table T-024 each form of a written file stands at, which is the
 * join that table admits and the only one it has.
 *
 * ⭐ ONE FACT STATED ONCE PER ROW: the form `file-gateway.ts` spells and the row
 * the manuscript prints it at are the same format, and the pairs stand here so
 * that the extension below is looked up rather than typed. Table T-024 carries
 * no English column, so nothing else could join the two.
 * ⭐ A CENSUS THE COMPILER KEEPS: a form added to `SaveFileForm` is a compile
 * error here, naming the row of table T-024 that has to be found for it. That
 * matters now that FR-096's chooser reaches every one of them -- a form with no
 * row would suggest a name with no extension and nothing would say so.
 * ⚠️ `document-codec.ts` binds two of these rows to the same spellings for its
 * own `ExchangeFormat`. That map is private to that component and answers a
 * different question -- which decoder a file goes to (OP-12) -- so it cannot be
 * asked from here (LR-2).
 */
const TABLE_ROW_OF_SAVE_FORM: Readonly<Record<SaveFileForm, string>> = {
  mspdi: 'IO-1',
  grsJson: 'IO-2',
  svg: 'IO-3',
  png: 'IO-4',
  singleHtml: 'IO-7',
}

/**
 * The extension table T-024 gives the row one form stands at.
 *
 * ⛔ READ, NEVER TYPED. FR-096 (MUST NOT) fixes the extension's one source as
 * table T-024, and `tools/generate_exchange_formats.py` is how that column
 * reaches `src/`; `npm run gen:check` is what fails when the two drift apart.
 * ⚠️ An empty answer means the roster no longer carries the row, and empty is
 * then the whole of what is known -- nothing is invented in its place.
 *
 * @purity pure
 */
function extensionOfForm(form: SaveFileForm): string {
  const row = TABLE_ROW_OF_SAVE_FORM[form]
  return exchangeFormats.formats.find((one) => one.rowId === row)?.extension ?? ''
}

/**
 * Which form of a written file one row of table T-024 is, or `null` where that
 * row is not a file at all.
 *
 * ⭐ THE CENSUS READ BACKWARDS rather than a second list that would go stale
 * against it (R4): `SaveFileForm` is FileGateway's own roster of the rows whose
 * output is a file, so a row it does not name is a row nothing can be written
 * to.
 * ⛔ IO-6 IS THE ROW THAT LANDS HERE, and table T-024 gives it no extension for
 * the same reason: the clipboard is not a file. No clipboard seam is wired in
 * this build either -- `carryOutAction` records that absence for SK-4 and SK-5.
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
 * The rows table T-206 keeps outside the document, in `localStorage`.
 *
 * ⭐ THE SET IS THE SPECIFICATION'S AND IS NOT CHOSEN HERE. LM-14 defines it
 * literally -- the rows of table T-206 marked as kept in `localStorage` -- and
 * it is exactly these four. ⛔ S-99e / S-99f / S-99g are NOT among them: those
 * are the screen's own state and `ScreenState` (PI-36) already owns them, which
 * is why they arrive here through `screenState` rather than through a key.
 *
 * ⚠️ THE PREFIX IS SHARED, NOT COPIED. FR-026's RATIONALE requires every key
 * this tool writes to carry one, because LM-6 says the store is shared by every
 * local page on the machine -- so the constant is imported from the unit that
 * already declares it (CP-29) rather than typed a second time (R4).
 *
 * ⛔ THE KEY SPELLINGS AFTER THE PREFIX ARE NOT IN THE SPECIFICATION. It names
 * the rows and the store and stops there, so these are this file's, chosen to
 * read as the row does. A change request would be needed to publish them.
 */
const BROWSER_STORED_KEY: Readonly<Record<BrowserStoredRow, string>> = {
  'S-99': `${WEB_STORAGE_KEY_PREFIX}language`,
  'S-99a': `${WEB_STORAGE_KEY_PREFIX}openedBy`,
  'S-99b': `${WEB_STORAGE_KEY_PREFIX}agentApiDocuments`,
  'S-99c': `${WEB_STORAGE_KEY_PREFIX}unlockPasswordSha256`,
}

/**
 * The four rows of table T-206 LM-14 counts, as a census the compiler keeps.
 *
 * STOP -- ⛔ ONLY `S-99` HAS A PRODUCER IN THIS BUILD. The other three are
 * named so the set is visible and so the next owner has one place to add to,
 * and nothing reads or writes them: S-99a is the watermark's opened-by name
 * (`single-html-shell.ts` records that nothing holds it), S-99b is the record
 * that turns the `Agent API` on PER DOCUMENT, and S-99c is the unlock
 * password's digest, which nothing asks a person for --
 * `input-command-translator.ts` records that table T-037 has no row for asking.
 * ⚠️ Writing a key nothing ever reads would only make the rule look kept.
 * ⛔ S-99b IS NOT WAITING ON A PRODUCER, WHICH IS WHY IT IS STILL HERE. IC-20
 * now turns the `Agent API` on and `ScreenSession.isAgentApiEnabled` carries it
 * -- what is missing is the KEY's other half, 「文書の識別子」, which S-99b names
 * and does not define and which nothing in this build derives. `sessionOf`
 * carries the STOP and says where the same line was stopped at before.
 */
type BrowserStoredRow = 'S-99' | 'S-99a' | 'S-99b' | 'S-99c'

/** The two `DisplayLanguage` spellings FR-038 admits, as a census. */
const DISPLAY_LANGUAGES: Readonly<Record<DisplayLanguage, true>> = { ja: true, en: true }

/**
 * OP-6 of table T-024a asks for the defaults, and this is them: the value the
 * settings manuscript states for every key of the presentation group.
 *
 * ⛔ NOT ONE VALUE IS TYPED HERE. `SETTINGS_DEFAULTS` (PI-2 of table T-064) is
 * what `tools/generate_entity_types.py` prints out of that manuscript, keyed by
 * the dotted key the published table prints; all this does is put the dots back
 * into objects so that the shape is the one `DocumentSettings` declares.
 * ⚠️ THE CAST IS WHERE TWO GENERATED SHAPES MEET, and it is the same move
 * `documentFromJson` makes for the same reason. Both the record and the type
 * come out of ONE generator run, so a key in one and not the other is a
 * generator that has drifted from itself -- `npm run gen:check` is what says so,
 * and the only thing this function could do instead is invent a value.
 *
 * @purity pure
 */
function defaultDocumentSettings(): DocumentSettings {
  const built: Record<string, unknown> = {}
  for (const [dotted, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const path = dotted.split('.')
    const leaf = path.pop()
    if (leaf === undefined) continue
    let at = built
    for (const step of path) {
      const standing = at[step]
      const group =
        typeof standing === 'object' && standing !== null
          ? (standing as Record<string, unknown>)
          : {}
      at[step] = group
      at = group
    }
    at[leaf] = value
  }
  return built as unknown as DocumentSettings
}

/**
 * ⭐ Built once. It never changes, and OP-6 asks the same question of every
 * import.
 */
const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = defaultDocumentSettings()

/**
 * FR-096 (MUST): what the chooser is offered as a name -- the document name
 * with the extension table T-024 gives, and the extension alone where the
 * document carries no name.
 *
 * ⭐ AT-3 IS THE DOCUMENT NAME. That column and U-27 of table T-103 are the
 * same value, and FR-074 states in as many words that `title` is the one
 * FR-035 owns -- so the name is read off the DOCUMENT and never off the file it
 * may happen to stand in.
 * ⚠️ `null` and an empty string reach the same answer, which is the case FR-096
 * writes out: FR-035 (MUST NOT) keeps `title` from ever holding an empty string,
 * so `null` is the only spelling of "no name" a document this build wrote can
 * carry -- and one that arrived carrying the other still suggests the extension
 * by itself rather than a name that begins with a dot.
 * ⚠️ A SUGGESTION AND NOT A DECISION, which FR-096 says and
 * `ChosenFileWrite.suggestedFileName` repeats from the store's side.
 * ⭐ THE FORM IS AN ARGUMENT because FR-096's chooser now reaches every row of
 * table T-024 that goes out as a file, so which extension is suggested follows
 * the row that was CHOSEN. ⛔ Not a constant of this file and not spelled here
 * -- that requirement fixes table T-024 as the extension's one place (MUST NOT).
 *
 * @purity pure
 */
function suggestedFileNameOf(project: Project, form: SaveFileForm): string {
  return `${project.title ?? ''}${extensionOfForm(form)}`
}

/**
 * FR-096: the document written in the convention of the chosen form, or `null`
 * where this build can write no file of it.
 *
 * ⭐ A CENSUS THE COMPILER KEEPS, spelled as a `switch` over `SaveFileForm`: a
 * form added to that union is a compile error here, naming the row of table
 * T-024 whose convention has to be written.
 *
 * ⛔ THE MSPDI WRITER'S OWN NOTICES ARE DROPPED, and that is an absence rather
 * than a decision. `mspdiFromDocument` answers with notices beside the text --
 * EX-3 and EX-6 of table T-033 each require the person to be told at the moment
 * of writing -- and table T-233 holds no row for either, which FR-076 (MUST NOT)
 * makes the whole of what a telling may carry. ⚠️ A row for them is what is
 * owed; nothing here may compose the sentence in its place (FR-038, MUST NOT).
 *
 * STOP -- ⛔ THREE OF THE FIVE FORMS CANNOT BE WRITTEN IN THIS BUILD, each for
 * its own reason, and none of them is a rasteriser this file could supply:
 *   `png` -- nothing implements `Rasterizer`. PI-21 publishes no member that
 *     answers with a painted picture, so there is nothing to hand a store.
 *   `svg` -- `exportSvg` (PI-21) IS written and `exportScene` below is the
 *     argument it takes, so the picture can be assembled. What is missing is
 *     FR-025's telling of how many `TaskGroup`s and `Task`s went undrawn (MUST):
 *     `SvgExport` answers with the rows it dropped, and table T-233 holds no row
 *     that telling could be carried on.
 *   `singleHtml` -- `exportEmbeddedHtml` takes an `AppShellSource`, and nothing
 *     in `src/` implements that seam or hands one to this loop.
 * ⚠️ Answering `null` writes nothing, which is the absence of the behaviour and
 * not the behaviour.
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
 * OP-12's answer turned into a document, or `null` where the decoder refused.
 *
 * ⭐ UT-5 of table T-063 KEEPS EACH FORMAT IN A CODEC OF ITS OWN, so the answer
 * OP-12 gave is what picks one; nothing here reads the text a second time to
 * guess.
 * ⭐ `current` IS WHAT MSPDI DOES NOT CARRY. `documentFromMspdi` names the parts
 * it takes from there -- the presentation group, the stamp, the change log, the
 * format version -- and states that nothing of that document's SCHEDULE is
 * merged in, which is FR-056's business inside ImportDocument.
 *
 * STOP -- ⛔ THE FAULTS ARE DROPPED HERE, and the absence has MOVED rather than
 * closed: FR-076 (MUST) now has a telling carry a row of table T-233 as its
 * reason and forbids carrying one that table does not hold (MUST NOT), and that
 * table holds no row for a codec's fault -- `JsonFault` and `MspdiFault` each
 * name the place and the reason, and neither is one of its fifteen.
 * ⚠️ The MSPDI road's notices (EX-3, EX-6) are dropped for the same reason, which
 * `exportedText` above records from the writing side.
 *
 * @purity pure
 */
function decodedDocument(
  format: ExchangeFormat,
  text: string,
  current: Document,
): Document | null {
  if (format === 'grsJson') {
    const read = documentFromJson(text)
    return read.ok ? read.document : null
  }
  const read = documentFromMspdi(text, current)
  return read.ok ? read.document : null
}

/**
 * What the autosave status is before this session has written anything.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: FR-061 requires three states to
 * be told apart (MUST) -- saved with a time, saving, failed -- and NONE of the
 * three describes a document that has just been opened and not yet autosaved.
 * ⚠️ `saved` is the nearest of the three, and the time it carries is the
 * document's own AT-129 -- the instant either group last moved at (FR-063) --
 * rather than a moment invented here: what is on the screen is what was last
 * written. ⛔ A ruling is owed, and so is the wiring of
 * FR-026's autosave -- nothing in this build performs one.
 *
 * @purity pure
 */
function autosaveAtStartup(held: Document): AutosaveStatus {
  return { kind: 'saved', at: held.documentStamp.settingsUpdatedUtc }
}

/**
 * Where the `Command Palette` floats -- `ScreenSession.commandPaletteAt`.
 *
 * ⭐ THE PLACE IS NOT REMEMBERED, AND THAT IS SETTLED RATHER THAN MISSING.
 * FR-053 has the person drag the palette, and neither table T-203 nor table
 * T-206 has a row for where it ends up: the ruling `CR-236` records is that
 * the place is not kept. So it is a current value, which LY-5 of table T-060
 * leaves with this layer alone, and it is lost with the page. ⛔ Nothing is
 * to be stored for it -- not a key in either table, not a browser record.
 *
 * ⛔ NO ROW STATES A STARTING CORNER, so `null` -- nobody has dragged it yet
 * -- is answered with the `Row Area`'s own corner rather than with a pair of
 * numbers written here: U-50 is a rectangle the specification does hold, and
 * SC-6 keeps the palette off the schedule's scrolling anyway. ⚠️ Which is
 * also why the default is resolved every frame instead of being frozen at
 * startup: until it has been dragged, the palette follows the `Row Area`
 * through a resize.
 *
 * ⛔ NOTHING CLAMPS IT TO THE WINDOW, because no row states a bound to clamp
 * it by. ⚠️ GR-19 of table T-023d names the harm in as many words --
 * 「掴めない位置へ置けてしまうと二度と動かせなくなる」 -- and answers it by giving
 * the band priority over what is under it, not by bounding the corner. So a
 * drag that ends past the edge of the window leaves it past the edge.
 * Searched: FR-053, table T-023a, table T-023d, table T-203, table T-206 and
 * `_assets/tbl-settings.md`.
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
 * Which of FR-072's two the properties panel is showing, and what it was last
 * shown about.
 *
 * ⛔ DERIVED FROM `ScreenSession` AND NEVER DECLARED A SECOND TIME. What these
 * mean is ScreenRenderer's to say (CR-146), table T-064 already carries PI-37
 * across, and a fresh name for either would be a second declaration of one
 * shape -- which is R4's DRY and the fence LR-2 draws.
 */
type PropertiesShowing = ScreenSession['propertiesShowing']
type PropertiesSubject = NonNullable<ScreenSession['propertiesSubject']>

/**
 * What this loop holds for the reading session, as `sessionOf` is handed it.
 *
 * ⭐ ONE ARGUMENT AND NOT TWELVE. Every member is a current value LY-5 of table
 * T-060 leaves with this layer, so they travel together and the call site reads
 * as a list of names rather than as a row of positions nobody can check
 * (rule 03 section 4).
 */
interface SessionHeld {
  /** S-99. */
  readonly language: DisplayLanguage
  /** FR-065. */
  readonly isAgentApiEnabled: boolean
  /** U-42 `Pointer`, or `null` while it is outside the window. */
  readonly pointer: { readonly x: number; readonly y: number } | null
  /** FT-4 of table T-078, for EZ-2's wait. */
  readonly pointerRestedMs: number
  /** EZ-2's other half -- what IF-9 answered for that point. */
  readonly iconUnderPointer: IconId | null
  /** FR-053 -- where GR-19's drag left the palette, `null` while nobody has. */
  readonly commandPaletteDraggedTo: { readonly x: number; readonly y: number } | null
  /** S-142 of table T-206 -- whether FR-053's milestone glyph list is open. */
  readonly isMilestoneListOpen: boolean
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
  /** FR-076 (MUST) -- what has been raised to tell. */
  readonly notices: readonly RaisedNotice[]
}

/**
 * What the shell answers about this reading session (`ScreenSession`, PI-37).
 *
 * ⭐ Every member is either a measurement only this layer can make or a value
 * table T-206 keeps out of the document, which is why LY-5 of table T-060
 * leaves them here.
 *
 * ⭐ TWO OF THEM ARE FT-4's, AND BOTH ARE NOW HANDED IN. That row of table
 * T-078 -- 「時間が来たこと」 -- has the shell measure the time ITSELF, so the loop
 * counts the rest against a monotonic clock (R3.6) and asks IF-9 which entry
 * the pointer is on; this function decides neither.
 * ⚠️ ONLY THE FIRST OF FT-4's THREE COUNTS IS WIRED -- the wait EZ-2 of table
 * T-040 puts before an icon's explanation. NT-2's deadline and FR-061's
 * autosave still have none, and each keeps its own note where it is answered
 * (`raisedNotices` and `autosaveAtStartup`).
 * ⚠️ `pointer` waits on nothing either -- FT-1 is wired, and the caller hands in
 * the place the last pointer happening was reported from.
 *
 * ⭐ NOTHING IS DECIDED HERE ANY MORE except the palette's corner, which
 * `paletteCornerOf` answers because its default is a rectangle of THIS frame.
 * The five members that used to be frozen at empty -- `isAgentApiEnabled`,
 * `selectedGroupIds` (PD-142), `selectedResourceUids` (PD-143),
 * `propertiesShowing` and `propertiesSubject` (PD-144) -- are values the loop
 * moves as presses arrive, so they are handed in like the notices and the
 * question beside them.
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
    isAgentApiEnabled,
    pointer,
    pointerRestedMs,
    iconUnderPointer,
    commandPaletteDraggedTo,
    isMilestoneListOpen,
    selectedGroupIds,
    selectedResourceUids,
    propertiesShowing,
    propertiesSubject,
    confirmation,
    notices,
  } = session
  return {
    language,
    autosave: autosaveAtStartup(held),
    // FR-065: the person turned the `Agent API` on or off with IC-20, and this
    // is what they left it at.
    // STOP -- ⛔ NOT REMEMBERED PER DOCUMENT, WHICH IS HALF OF THAT REQUIREMENT.
    // FR-065 (MUST) has the enabling remembered per document and S-99b of table
    // T-206 puts that record in `localStorage` keyed by 「文書の識別子」 -- and
    // ⛔ NOTHING DERIVES ONE. `autosave-gateway.ts` stops at the same line in as
    // many words (`DocumentSnapshot.documentKey`), S-99b names an identifier
    // without defining one, and `Project.id` is not it (AT-1 is nullable and is
    // marked as no primary key). ⚠️ So no key is invented and `BROWSER_STORED_KEY`
    // stays unwritten. ⭐ The MUST NOT beside it IS kept: `replaceHeldDocument`
    // puts this back to false on the three rows of table T-230 that do not carry
    // the history forward, so what was opened for one document is not still in
    // force for the next.
    isAgentApiEnabled,
    pointer,
    // EZ-2 of table T-040 -- the two halves of its condition, both measured by
    // the loop and neither of them decidable here.
    // ⭐ THE PLACE IS IF-9's OWN ANSWER, not a rectangle worked out a second
    // time: the rule Chapter 5.3 states under table T-065 is that the side
    // which DREW an entry is the side that answers where it is, and PD-141
    // recommends exactly this road. ⚠️ So it carries whatever
    // `readScreenPartAt` reports, IC-53 included -- `ScreenPart.entry` says why
    // that row is answered although table T-109 calls it no button, and no
    // requirement takes it back out again.
    pointerRestedMs,
    iconUnderPointer,
    // FR-053: where the drag left it, or the `Row Area`'s corner while nobody
    // has dragged it. ⭐ Handed in rather than decided here -- it is a current
    // value and LY-5 of table T-060 leaves those with the loop, which is the
    // same reason `notices` and `confirmation` below are handed in.
    // ⛔ `paletteCornerOf` carries what is missing and what is settled.
    commandPaletteAt: paletteCornerOf(commandPaletteDraggedTo, regions),
    // FR-041 (MUST): the theme has to CROSS to the side that paints. S-72 is
    // the reader's light/dark and S-73 is the document's hue -- the number
    // table T-236 writes as `H` wherever a colour follows the theme.
    // ⛔ Neither crossed until 2026-08-25, which is exactly why choosing dark
    // left the screen light: every piece of chrome fell back to the
    // environment's own system colours, and those follow the OPERATING SYSTEM.
    themePreference: held.documentSettings.themePreference,
    themeHue: held.schedule.project.themeHue,
    // S-142 of table T-206: whether FR-053's milestone glyph list is open.
    // ⭐ Handed in for the reason the corner above is -- table T-206 is where
    // the specification records that the document does not keep it, so it is a
    // current value and LY-5 of table T-060 leaves those with the loop.
    isMilestoneListOpen,
    // FR-085 (MUST) and FR-099 (MUST): the two sets of chosen things that are
    // NOT the drawing area's selection -- SL-1 of table T-023c leaves rows out
    // of that one and admits no resource at all, so `Selection` (PI-32) can hold
    // neither. ⭐ Both are moved by presses `commandFromEntry` answers with an
    // `InputAction` of its own kind; `carryOutAction` is where they land.
    // @provisional PD-142
    selectedGroupIds,
    // @provisional PD-143
    selectedResourceUids,
    // FR-072: which of the two the LAST operation chose, and what it chose.
    // ⭐ THE SUBJECT AND NOT THE DRAWN FIELDS, which is the whole of PD-144:
    // that requirement has a second press of IC-17 return the panel to
    // 「直前の選択物」, so what has to be kept is what was chosen -- keeping the
    // fields would go on showing values an edit has already made untrue.
    // @provisional PD-144
    propertiesShowing,
    // @provisional PD-144
    propertiesSubject,
    // FR-076 (MUST): what has been raised to tell, each carrying a row of table
    // T-233 and no words at all.
    // ⭐ Held by the loop, not built here -- the same reason the question below
    // is handed in: LY-5 of table T-060 leaves a current value with this layer,
    // and this function is handed it.
    notices,
    // FR-032 (MUST): the question standing in front of a delete, or none.
    // ⭐ Held by the loop, not built here -- LY-5 of table T-060 leaves a
    // current value with this layer and this function is handed it.
    confirmation,
    // SC-1 (MUST): the row titles keep step with the body vertically and do not
    // move sideways, so each row's band is this frame's own `RowPlacement`
    // taken across the width `regionsFromScreen` gave the panel. ⛔ Not
    // measured a second time -- ADR-001 has the layout computed once, and SC-1
    // means the panel has to use those very numbers.
    // ⛔ CLIPPED TO THE `Row Area`, AND A ROW THE CLIP EMPTIES IS DROPPED --
    // this is what makes the two sides hold the SAME rows, which is the whole
    // of what SC-1 asks. `svg-renderer.ts` cuts every band against that same
    // rectangle and skips the row when nothing is left, so a panel that took
    // `row.y` and `row.height` whole disagreed with the bands by exactly that
    // cut. ⚠️ It agreed only while the stack sat at the top, because the first
    // row's `y` IS `rowArea.y` there: the moment S-78 slid the stack, every row
    // above the anchor had `row.y < rowArea.y`, its band was gone, and its
    // title was still painted -- up in the Time Ruler and over the corner
    // HF-10's control needs.
    // ⚠️ ONLY THE VERTICAL PAIR IS CLIPPED. SC-1 forbids the panel to follow
    // the body sideways, so `x` and `width` stay the panel's own.
    rowBoxes: layout.rows.flatMap((row) => {
      const top = Math.max(row.y, regions.rowArea.y)
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
    }),
  }
}

/**
 * OP-10 of table T-024a -- what to draw when the stored place is `null` or
 * points at a row that is gone.
 *
 * ⛔ `null` is not a missing value, it is "the person has not chosen a place
 * yet", and the row says to show what FR-055's fit-to-screen would choose
 * (MUST). ⚠️ It also forbids HF-8 here (MUST NOT), so the collapse state
 * FR-004 saved is left exactly as it is -- this only decides the view.
 *
 * ⭐ The document is NOT edited. OP-10 sits on the reading side ("読む側の規則
 * は表 T-024a の `OP-10` が持つ", FR-051), so the stored settings keep saying
 * `null` and every frame decides again.
 *
 * ⚠️ Runs the two passes the rule after table T-068 allows, and runs them
 * inside `fitZoom` (PI-5) rather than here. ⛔ A third pass is forbidden -- the
 * level of detail can oscillate and the loop would not be guaranteed to end.
 *
 * @purity pure
 */
function viewSettings(
  held: Document,
  stored: DocumentSettings,
  regions: ScreenRegions,
): DocumentSettings {
  const groupIds = new Set(held.schedule.taskGroups.map((one) => one.id))
  const placed = stored.scrollDate !== null && groupIds.has(stored.scrollGroupId ?? '')
  if (placed) return stored

  // ⭐ THE POSITION IS NO LONGER DECIDED HERE. OP-10 sends the zoom AND the
  // position to FR-055, and `fitZoom` (PI-5) now answers all four, so the two
  // values below are scaffolding rather than an answer: S-77 pins the time axis
  // and a layout cannot be measured until it is pinned to SOME day. Which day
  // does not matter -- the extent is a difference of two edges, so it comes out
  // the same wherever the axis starts, and the fit reads the real place off it.
  // ⛔ IT CANNOT BE DROPPED. `dateAtX` answers null while no origin day is set,
  // and the fit then has no day to name and hands back the null it was given --
  // so OP-10's condition would still hold on the next frame and the fit would
  // be asked again for ever.
  //
  // ⭐ This is what closed the harm FR-055's RATIONALE names: the earliest
  // planned start is NOT the earliest day anything is drawn on -- OC-5 of table
  // T-038 counts an `actualStart` that precedes it -- so as an answer it left
  // the overhang behind the Row Title panel, where no scroll position can
  // reach it.
  const starts = held.schedule.tasks
    .map((one) => one.start)
    .filter((one): one is string => one !== null)
    .sort()
  const firstRow = [...held.schedule.taskGroups].sort((a, b) => a.order - b.order)[0]
  const pinned: DocumentSettings = {
    ...stored,
    scrollDate: starts[0] ?? held.schedule.project.startDate,
    scrollGroupId: firstRow === undefined ? stored.scrollGroupId : firstRow.id,
  }

  // ⛔ `held.schedule` AND NOT A COPY WITH THE COLLAPSES DISCARDED. OP-10
  // forbids HF-8 here in as many words (MUST NOT), because throwing the
  // collapses away on every open would lose the state HR-6 has the document
  // save for WY-1. ⭐ The press path does discard them, in `fitCommand`.
  const fitted = fitZoom(held.schedule, pinned, regions, {
    step: NOT_STORED_ZOOM_STEP['S-96'],
    min: NOT_STORED_ZOOM_BOUNDS['S-97'],
    max: NOT_STORED_ZOOM_BOUNDS['S-98'],
  })
  return {
    ...pinned,
    zoomX: fitted.zoomX,
    zoomY: fitted.zoomY,
    scrollDate: fitted.scrollDate,
    scrollGroupId: fitted.scrollGroupId,
    // ⛔ CLEARED WITH THE ANCHORS THEY BELONG TO, exactly as `fitCommand`
    // clears them for the press. The fit puts the content's top left corner on
    // the Row Area's corner, so S-176 and S-177 are both zero here; a fraction
    // left standing from an earlier pan slid FR-055's answer by up to one row
    // and one day, which is the one thing a fit must not do.
    scrollDayOffset: 0,
    scrollGroupOffset: 0,
  }
}

/**
 * Whether this happening left no gesture in flight.
 *
 * ⭐ IN-1 settles a pointer operation on the RELEASE and IN-1a ends a lost one
 * as an abort (MUST), so those two are the ends. A `move` keeps the press: CS-2
 * of table T-066 makes the whole gesture about the moment it began.
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
 * ⛔ ASKED AGAINST THE STATE THE THREE MEMBERS WERE HANDED, never against what
 * they answered. `screenStateFromInput` consumes the two levels that are ITS to
 * consume -- the open surface and what is armed -- so a reckoning off the state
 * it returned would take two levels for one press, and IN-4 allows 1 階層
 * (MUST). ⚠️ The caller reads this BEFORE that member runs, because the level
 * this answers may be one the caller consumes itself, and then that member must
 * not be asked to move the state at all.
 * ⭐ THE OTHER THREE LEVELS ARE THE SHELL'S, because all three are current
 * values the Framework holds (LY-5 of table T-060): the press in flight, the
 * Dual Cursor mode, and the `Confirmation` (U-55) this file raises.
 * `screen-state.ts` says so where `EscapeContext` is declared, and that is the
 * whole reason the seam takes one.
 * ⛔ THE QUESTION IS HANDED IN RATHER THAN READ OFF `InputContext`: that value
 * is PI-18's and carries only what the pure members may see, and the question
 * is not among them. So the caller -- which holds it -- states it.
 *
 * @purity pure
 */
function escapeLevelOf(
  input: HumanInput,
  context: InputContext,
  isConfirmationStanding: boolean,
): EscapeTarget | null {
  if (input.kind !== 'key' || input.key !== ESCAPE_KEY) return null
  return escapeTarget(context.screenState, {
    gestureInFlight: context.pressed !== null,
    dualCursorMode: context.dualCursorFollowing !== null,
    isConfirmationStanding,
  })
}

/**
 * Whether two answers of `readScreenPartAt` name the same place.
 *
 * ⭐ Compared by value and not by identity: IF-9 builds its answer at the
 * moment it is asked, so two reads taken over one unmoved pointer are two
 * objects that mean the same thing.
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
 * ⭐ Compared by value and not by identity, for the reason `isSameScreenPart`
 * gives: PI-7 builds its answer at the moment it is asked as well.
 *
 * ⭐ THE THING IS COMPARED AS WELL AS THE ROW. Table T-023d's rows repeat on
 * every drawn `Task`, so a pointer that crossed from one bar's end to the next
 * is answered the same row about a different `Task` -- and what FR-048's roster
 * of pointer-answering parts names is drawn ON the thing, so the picture is a
 * different one.
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
 * ⭐ A CENSUS THE COMPILER KEEPS, the same bargain `PRESS_CHANGES_DOCUMENT`
 * strikes below: with every branch returning, a target added to that table is a
 * missing return here and names itself. ⛔ A default arm would let a new kind
 * compare equal to every other of its own kind, which is a frame never asked
 * for and nothing to show for it.
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
    // ⭐ NOTHING TELLS TWO APART, because there are never two: FR-046 gives the
    // document one `statusDate`, so the kind IS the identity.
    case 'statusLine':
      return b.kind === 'statusLine'
  }
}

/**
 * Whether a press of each row of table T-023a changes the document as it runs.
 *
 * ⭐ WHY EXACTLY TWO ARE FALSE. Table T-027 keeps exactly two gestures outside
 * the undo history -- UN-8 the pan and UN-9 the range selection -- and keeps
 * them out because neither changes the document. AG-9's refusal is about
 * writing into a HALF-FINISHED document change, so a gesture with no such state
 * to be half-way through is one it spares.
 *
 * ⭐ A CENSUS THE COMPILER KEEPS, spelled the way `input-command-translator.ts`
 * spells its own: `Record<PressRow, boolean>` makes a row added to table T-023a
 * a compile error here, naming the row that has to be judged. ⛔ A bare `string`
 * key would let a new row default silently into 「spared」 or 「refused」 by
 * nothing but the shape of this lookup.
 */
const PRESS_CHANGES_DOCUMENT: Readonly<Record<PressRow, boolean>> = {
  // UN-8 -- the pan moves the viewport and no row of the file.
  'PD-1': false,
  'PD-2': true,
  'PD-3': true,
  'PD-4': true,
  'PD-4a': true,
  // UN-9 -- the range selection moves what is chosen, not what is written.
  'PD-5': false,
}

/**
 * Whether a press in flight is one AG-9 of table T-035 refuses a write during.
 *
 * ⛔ `on` IS THE FIRST QUESTION AND THE ROW IS THE SECOND. The note under table
 * T-023a binds that table's decision order to the schedule's drawing area
 * (MUST), so the row a press on a drawn entry carries says nothing about what
 * the press is: `commandFromInput` branches to `commandFromEntry` before it
 * ever looks at the row, and that road CAN change the document. A press the
 * screen surface answered for is therefore in flight whatever its row is.
 * ⚠️ A press falling on an entry lands on PD-5 for want of a hit, which is
 * precisely the row that would otherwise be spared -- so reading the row first
 * would take AG-9 off every palette press there is.
 *
 * @purity pure
 */
function isDocumentChangingPress(press: PointerPress | null): boolean {
  if (press === null) return false
  if (press.on !== null) return true
  return PRESS_CHANGES_DOCUMENT[press.pressRow]
}

/**
 * Which entry of table T-109 this happening settled on, or null for one that
 * settled on none.
 *
 * ⭐ THE RELEASE, AND FROM THE PRESS. IN-1 settles a pointer operation on the
 * release (MUST) and CS-2 of table T-066 makes the press its moment, which is
 * exactly the pair `commandFromEntry` is asked with -- so the shell's own three
 * entries are read the same way rather than on a rule of this file's.
 * ⛔ Read off the CONTEXT's press and not the loop's: the loop drops its press
 * before the action is carried out, and the context is the value the three
 * members of PI-18 were handed for this same happening.
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
 * Which row of table T-024 this happening settled on, or null for one that
 * settled on none.
 *
 * ⭐ THE SECOND MEMBER OF `ScreenPart` AND NOT THE FIRST. FR-096 (MUST NOT)
 * forbids an entrance per format, so table T-109 places nothing but IC-52 on
 * U-54 and what a person presses there is a row of table T-024 -- which `entry`
 * cannot report, because the two tables number their rows independently.
 * `screen-surface.ts` states the same division from the seam's side.
 * ⚠️ Read exactly as `entrySettledOnRelease` reads its own member, and for the
 * same reasons: IN-1 settles on the release and CS-2 of table T-066 makes the
 * press its moment.
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
 * ⛔ A SECOND READING OF TABLE T-050, AND IT IS ONE THIS FILE WOULD RATHER NOT
 * MAKE. FR-032 (MUST) requires the confirmation to name the `Task`s that would
 * go, so whoever raises the question has to know the chain -- and NOTHING
 * published answers 「what would this command take away」: `editTaskGroup`
 * computes the same set on the far side of a write that has already happened,
 * and `applyDocumentChange` (PI-8) publishes no way to ask without landing.
 * ⚠️ What would close it is a query on PI-8 that plans a command and answers
 * what it would remove; until then this is the duplication R2.7 warns about,
 * written here because the alternative is not asking at all.
 * ⚠️ `seen` is what stops a broken `parentId` (IV-5) from looping, the same
 * guard the aggregate's own walk keeps.
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
 * ⛔ The second reading `rowsLostWith` records; the same note covers this one.
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
 * The question FR-032 owes for one write, or null where it owes none.
 *
 * ⭐ THE TWO PLACES AND NO OTHERS. FR-032 (MUST) asks for a confirmation when a
 * ROW is deleted and when a `Task` WITH WBS DESCENDANTS is deleted, and FR-031
 * forbids adding a third place (MUST NOT) -- 「問うてよいのは、要求が確認を
 * 求めると定めた場面だけ」 is NT-7's own limit. ⛔ So the two `kind`s below are
 * the whole test: a delete of a `Task` that leads nothing is written straight
 * through, and undo is the only thing standing behind it, which is what
 * FR-031's RATIONALE intends.
 *
 * ⭐ THE SENTENCE IS A ROW OF TABLE T-234 AND NOT A STRING. FR-076 (MUST) makes
 * what a question shows a row of that table and (MUST NOT) bars one from
 * outside it, and FR-038's one dictionary is what turns the row into words --
 * so this side names the SITUATION and nothing else, the way `raiseNotice`
 * names a reason.
 *
 * ⛔ WHICH OF THE TWO ROWS ONE WRITE SHOWS, when the write does both. Table
 * T-234's 場面 column tells QN-1 (「行を削除する前」) from QN-2 (「WBS の子孫を
 * 持つ `Task` を削除する前」), and one `RaisedConfirmation` shows ONE sentence --
 * but a bundle of commands may carry a row deletion and a leading `Task`'s
 * deletion at once, and nothing in table T-234, FR-032 or FR-031 says which
 * sentence such a write shows. Chosen: the row's, whenever a row is going.
 * ⚠️ Defensible from the table itself -- CD-2 seeds CD-1 with every `Task` the
 * going rows carry, so the row deletion is the wider scene and the tasks named
 * below are already gathered under it -- and the narrower reading would tell a
 * person their row survives. ⛔ Not settled by the specification all the same.
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
      // ⚠️ A row that is not there takes nothing with it, and CM-27 refuses the
      // command on its own account -- so there is nothing to ask about.
      if (rows === null) continue
      for (const id of rows) lostRows.add(id)
      owed = true
      continue
    }
    if (command.kind !== 'deleteTask') continue
    // FR-032 asks about a `Task` only where it LEADS something. A direct child
    // is what makes it so: descendants are reached through the same column.
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
      // FR-032 (MUST): a `Task` that goes with a row but is DRAWN elsewhere is
      // shown as such, because it is not visible on the row being deleted --
      // HM-10 of table T-015a leaves the WBS children behind when a bar moves.
      // ⚠️ False where no row is going at all: 「another row」 means nothing when
      // FR-032's row half is not the one asking.
      isShownOnAnotherRow: drawnOn !== undefined && lostRows.size > 0 && !lostRows.has(drawnOn),
    })
  }
  // See the head note on which row a write that does both shows.
  const question: ConfirmationQuestion = lostRows.size > 0 ? 'QN-1' : 'QN-2'
  return { manner: CONFIRMATION_MANNER, question, items }
}

/**
 * Whether a string is one of the two languages FR-038 admits.
 *
 * ⭐ A STORED VALUE IS UNTRUSTED INTAKE. FR-023 calls every intake untrusted,
 * and `localStorage` is shared by every local page on the machine (LM-6), so
 * what comes back is a string and nothing more until this has said otherwise.
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
 * ⭐ THE CODEC IS WIRED HERE BECAUSE ONLY THE CALLER MAY WIRE IT. FileGateway
 * (PI-22) takes this as a function and says why in as many words -- UT-5 of
 * table T-063 keeps each format in a codec of its own, and a gateway that
 * parsed `GRS JSON` would hold an authority FR-024 already owns.
 *
 * ⛔ `null` FOR EVERY WAY OF NOT KNOWING, which is the whole of DI-3 (MUST
 * NOT): characters that are not `GRS JSON` name no owner, and an unreadable
 * destination may not be called this same document. ⚠️ A destination that
 * decodes is NOT thereby accepted as intake -- nothing here is opened, and
 * FR-023's validation is not this act's.
 *
 * ⚠️ Only the two columns DI-1 compares leave this function. The document that
 * was decoded is dropped: it is somebody else's file, and nothing in this build
 * may show it or write from it.
 *
 * @purity pure
 */
function projectIdentityFromText(text: string): ProjectIdentity | null {
  const read = documentFromJson(text)
  if (!read.ok) return null
  const project = read.document.schedule.project
  return { projectName: project.name, projectId: project.id }
}

// ---- the outside is read from here on (R7.7) ------------------------------

/**
 * Today, spelled as a date column is (`textOfDay`).
 *
 * ⭐ FR-046 (MUST): 「読む人の機のローカルの暦の日とすること（MUST）。UTC の暦
 * の日を用いてはならない（MUST NOT）」. ⛔ So the day is built from the LOCAL
 * getters and never from `toISOString`, whose day is UTC's: SK-20 writes this
 * into `statusDate`, a column that carries no zone, and taking UTC would stand
 * the line a day early or a day late by exactly the offset.
 * ⚠️ The `+ 1` is the host's own numbering (`getMonth` counts from zero), not a
 * figure of the specification's.
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
 * ⚠️ THE WALL CLOCK, and rightly so: this is a MOMENT and not an elapsed time,
 * and R3.6 sends only elapsed time to a monotonic clock.
 * ⛔ `toISOString` carries milliseconds, which 「秒まで」 does not admit, so
 * they are cut rather than the text being assembled by hand -- nothing here can
 * then disagree with the spelling the document model already uses.
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
 * ⚠️ NOT THE WALL CLOCK, and for the reason `readInstantOfWrite` above states
 * from the other side: R3.6 (MUST) sends an elapsed time to a monotonic clock
 * because a wall clock steps backwards over an NTP correction or a DST change,
 * and a rest that had already come due would then read as one that never began.
 * ⛔ THE NUMBER MEANS NOTHING ON ITS OWN -- the host picks what it counts from
 * -- so only a difference of two readings may ever be used.
 *
 * @purity semi-pure-b
 */
function readMonotonicMs(): number {
  return performance.now()
}

/**
 * The two lengths FR-018 measures a held entrance with.
 *
 * ⚠️ Named in the shape rule 03 asks for -- the unit is in the name, because
 * both are times and neither carries one anywhere else.
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
 * ⭐ THE ROW IDS BECOME NAMES HERE AND NOWHERE ELSE, so the repeat below reads
 * `delayMs` and `intervalMs` and no call site has to remember which of the two
 * rows is the wait and which the gap.
 * ⛔ THE TWO FIGURES ARE NOT WRITTEN HERE. Both are carried in by the generated
 * constant, because a value the specification holds is generated and never
 * copied (rule 03 section 1) -- typed out, this line would go on saying the old
 * thing after a manuscript edit and nothing would fail.
 * ⚠️ THAT THE WAIT IS THE LONGER OF THE TWO IS NOT CHECKED HERE. FR-018 (MUST)
 * asks it of the rows, not of this: it is a fact about what table T-206 states,
 * and a guard here would answer a manuscript defect by silently doing something
 * FR-018 does not describe either.
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
 * ⛔ EVERY READ SURVIVES A STORE THAT REFUSES. LM-14 says so in as many words:
 * a page opened over `file://` may have the store refused outright, and it is
 * for that case that FR-038 (MUST) carries a second half -- 「それを読み出せない
 * ときはブラウザの言語設定に従う」. ⚠️ A host refuses by THROWING on the
 * property itself, not by answering null, so the access is inside the guard and
 * not only the call.
 * ⚠️ NULL IS ONE ANSWER FOR TWO THINGS -- nothing stored, and no store -- and
 * that is enough: FR-038 gives both the same fallback, and no requirement tells
 * them apart.
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
 * ⚠️ A REFUSAL IS NOT A FAULT TO REPORT. LM-14 already places these rows outside
 * what NFR-004 counts as 「全機能が動く」 for a page opened over `file://`, so a
 * store that will not take them is a known environment and not a failure of
 * this tool. ⛔ Nothing is told, and now for a narrower reason than before: table
 * T-233 holds no row for a store that would not take a row of table T-206, and
 * FR-076 (MUST NOT) makes that table the whole of what a telling may carry.
 * ⚠️ No row is owed either, on LM-14's own ground -- a known environment is not
 * a failure of this tool.
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
 * FR-038 (MUST): 「起動したときは前回選ばれた言語で開き、それを読み出せないとき
 * はブラウザの言語設定に従うこと」 -- both halves, in that order.
 *
 * ⭐ S-99 FIRST AND THE HOST SECOND. The stored choice is the person's own and
 * the host's setting is only what to do without one, so a store that answers
 * is never overridden by the environment.
 * ⚠️ A stored value that is neither spelling is treated as no value: FR-023
 * calls every intake untrusted, and the fallback is already the rule for having
 * nothing to read.
 * ⚠️ A host set to neither language is answered `en`: FR-038 admits exactly
 * two, so the one that is not `ja` is the only other.
 *
 * ⭐ PUBLISHED FOR THE BOOT FILE. 「起動したとき」 is table T-077's business and
 * `single-html-shell.ts` is the file that runs it, while the key and the store
 * belong with the current value this loop holds -- so the answer is computed
 * here and asked for there, rather than the keys being typed twice (R4).
 *
 * @purity semi-pure-b
 */
export function startupDisplayLanguage(): DisplayLanguage {
  const stored = readBrowserStored('S-99')
  if (stored !== null && isDisplayLanguage(stored)) return stored
  return globalThis.navigator?.language?.toLowerCase().startsWith('ja') === true ? 'ja' : 'en'
}

/**
 * ADR-001 -- the screen rectangles, the layout and the geometry are computed
 * ONCE at the head of a frame and handed out.
 *
 * ⚠️ Four paths need the layout, and MN-6 measured what happens without this:
 * table T-068's eleven stages run four times for one pointer move, which does
 * not fit the budget NFR-002 and NFR-003 set.
 *
 * ⭐ `files` IS IF-3's IMPLEMENTATION (PI-28), HANDED IN AND NOT REACHED FOR,
 * for the reason `screen` is: the loop is what holds the current values SK-11
 * writes out, and R7.3 wants the browser side injected so a test can stand in
 * for it. ⚠️ Optional on the same terms as `screen` -- the loop runs for the
 * paths that touch no file, and the entries that would touch one answer with
 * nothing when there is none.
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
): FrameLoop {
  // ⭐ ONE PAIR, not a document beside a history. WS-6 of table T-067 is one
  // reference assignment (MUST), and `HeldDocument` says why: a document paired
  // with the previous history is exactly the mixture AG-4 forbids.
  // ⚠️ The history starts empty -- a document that has just been opened has
  // nothing to undo, and FR-031 counts steps from the first write.
  let held: HeldDocument = { document: first, history: emptyHistory() }
  let environment = env
  let selection: Selection = emptySelection()
  // ⭐ Held rather than rebuilt each frame so that one frame draws ONE
  // session's state. `screenStateFromInput` (PI-18) is what moves it, and FT-1
  // now reaches it.
  let screenState: ScreenState = emptyScreenState()
  let values: FrameValues | null = null
  let owed = false
  // CS-2 of table T-066 -- the press a gesture began with, kept until the
  // gesture ends, because IN-1 decides the whole gesture from it on release.
  let pressed: PointerPress | null = null
  // The picture a held press owes -- FR-052's two widths and the fade table
  // T-023d's closing rule asks for -- and `null` whenever no press owes one.
  //
  // ⛔ THE PICTURE, NEVER THE VALUE. Every write this loop makes is measured
  // against `held.document`, and nothing ever folds this back onto it: IN-1 of
  // table T-028 settles a pointer operation on the release, and both closing
  // rules say the following is 「絵の話であって、値が決まる時点を早めるものではない」.
  // ⚠️ NOR IS IT EVER FOLDED ONTO ITSELF. `previewOfHeldPress` starts every
  // fold at `held.document`, so this is a pure function of (held document,
  // press, pointer now) -- the trap `PointerPress.followedTo` had to be written
  // around, where a travel applied to what a travel already moved compounds.
  let previewDocument: Document | null = null
  // FR-053 -- where GR-19's drag has left the `Command Palette`, and `null`
  // while nobody has dragged it. ⛔ Held and nothing more: see
  // `paletteCornerOf` for why no table keeps it and why it starts at no
  // corner of its own.
  let commandPaletteDraggedTo: { readonly x: number; readonly y: number } | null = null
  // FR-053 -- where the palette's corner stood when the band was pressed, and
  // `null` while no band drag is in flight.
  //
  // ⭐ WHAT FR-053's LAST SENTENCE ON THE DRAG NEEDS AND NOTHING MORE -- that
  // an interrupted one (IN-1 of table T-028) puts the corner back.
  // The palette is moved by a travel (`moveCommandPalette`), so once a travel
  // has been added the corner it was added to is gone -- and an interrupted
  // drag has to be put back rather than left where the finger reached.
  // ⛔ IT IS WHAT THE FOLLOWING COSTS, AND IT USED TO COST NOTHING. While the
  // travel arrived only on the release there was never anything to put back,
  // because nothing had moved yet -- so the requirement's last sentence was
  // met by an accident of WHEN the travel came. Now that every move applies
  // one, an interrupted drag would otherwise be left wherever the finger
  // reached.
  // ⚠️ THE ONLY ROAD TO THE PICTURE RUNS THROUGH THE CORNER: the palette is
  // drawn at `ScreenSession.commandPaletteAt` and at nothing else, so a follow
  // that did not move the corner would not be a follow at all.
  // ⛔ NOT A MEMBER OF ANYTHING PUBLISHED, and it must not become one from here:
  // no row of table T-203 or table T-206 holds the corner itself
  // (`paletteCornerOf` says so), let alone where a drag began.
  let commandPaletteCornerAtPress: { readonly x: number; readonly y: number } | null = null
  // S-142 of table T-206 -- whether FR-053's milestone glyph list is open.
  //
  // ⛔ STARTS CLOSED, which is that row's own default: FR-053 keeps the eight
  // milestone shapes out of the palette until a person asks for them, so that
  // the entrances they rarely use do not hide the schedule (GL-002).
  // ⛔ `Esc` MUST NOT CLOSE IT (FR-053, and S-142 says the same). Nothing here
  // is reached by the ladder: IN-4 of table T-028 spends its first level on the
  // surface `ScreenState.surface` holds (S-99g), and S-142's own row says this
  // is not one of those -- the palette's own list simply grows.
  // ⚠️ Which is why it is held HERE rather than on
  // `ScreenState`: a member of that value would be inside `escapeTarget`'s
  // reach.
  // ⚠️ Lost with the page, the same as the corner above and for the same
  // reason: table T-206 is where the specification records that the document
  // does not keep it.
  let isMilestoneListOpen = false
  // FR-085 (MUST) -- the rows chosen in the `Row Title Panel`, by `TaskGroup.id`
  // (AT-51). ⛔ A SECOND SET AND NOT THE SELECTION: SL-1 of table T-023c leaves
  // rows out of the drawing area's selection in as many words, and FR-085 says
  // the two are separate, so `selection` above may not carry them.
  // ⚠️ Lost with the page, because nothing keeps it: table T-203 has no key and
  // table T-206 no row, which is what leaves it a current value LY-5 of table
  // T-060 puts here.
  // @provisional PD-142
  let selectedGroupIds: readonly string[] = []
  // FR-099 (MUST) -- who is chosen in the `Resource Roster` (U-49), by
  // `Resource.uid` (AT-85), which AS-6 of table T-225 makes the key a document
  // writes while a person is shown the name. ⛔ SL-1 admits no resource either.
  // @provisional PD-143
  let selectedResourceUids: readonly number[] = []
  // FR-072 -- which of the two the last operation chose, and what it chose.
  //
  // ⭐ `null` IS "NO OPERATION HAS CHOSEN YET" and not a fourth state: FR-072
  // decides the panel's contents by 「最後に行われた操作」, and before the first
  // one there is no last. ⚠️ Nothing else moves it back to `null` -- that
  // requirement (MUST) keeps the previous contents standing when a selection
  // goes away, and says the heading is what tells the person so.
  // @provisional PD-144
  let propertiesShowing: PropertiesShowing = null
  let propertiesSubject: PropertiesSubject | null = null
  // FR-065 -- whether the person has turned the `Agent API` on for the document
  // being read. ⛔ Starts off, which is the judgement FR-065's RATIONALE calls
  // 「既定で公開しない」. What is NOT kept, and why no key is written for it, is
  // in `sessionOf`.
  let isAgentApiEnabled = false
  // Who to tell when that turns, or `null` while nobody has asked.
  // ⛔ NOT A LIST. FR-065's public point is one name in one place, so one
  // listener is all there is to be; `watchAgentApiEnabling` says the same from
  // the far side.
  let agentApiEnablingWatch: ((isEnabled: boolean) => void) | null = null
  // FR-038 (MUST): one language for the whole screen. `ScreenWiring` carries
  // what startup settled on -- S-99 if the store had it, the host otherwise --
  // and this carries what the person has chosen since.
  // ⛔ Never the document's: FR-038 keeps the choice out of it (MUST NOT).
  // ⚠️ `screen` is optional -- the loop runs without a `ScreenWiring` for the
  // paths that need no screen -- so FR-038's own rule answers when there is
  // none, rather than a second default being written here.
  let language: DisplayLanguage = screen?.language ?? startupDisplayLanguage()
  // FR-076 (MUST) -- what has been raised to tell, in the order it was raised.
  //
  // ⭐ HELD BY THIS LAYER AND BY NO OTHER. LY-5 of table T-060 leaves the
  // Framework as the only layer that may hold a current value, and FR-028 (MUST
  // NOT) makes a refusal a value the caller RECEIVES rather than something
  // thrown -- so the side that received it is the side that holds it until it
  // has been told. `ScreenSession.notices` says the same from the far side.
  // ⛔ THE RAISED HALF ONLY. Each entry carries a row of table T-037 and a row of
  // table T-233 and not one word: FR-038 (MUST) keeps every word the screen
  // prints in the one generated dictionary, which ScreenRenderer holds and this
  // file does not.
  //
  // STOP -- ⛔ NOTHING TAKES ONE OFF AGAIN. NT-2 governs a telling that goes away
  // with time, and the clock it would need is FT-4 of table T-078 -- which this
  // build now reads for the icon hint alone (`beginPointerRest`) and for
  // neither of that row's other two counts, so ⛔ NO DEADLINE IS COUNTED HERE;
  // table T-109 places no entry that dismisses one either. ⚠️ So a telling
  // stands for the rest of the session, which is the half of NT-2 that is kept
  // -- it does not go before it has been read.
  let raisedNotices: readonly RaisedNotice[] = []
  // FR-032 (MUST) -- the question NT-7 puts, and the writes it stands in front
  // of, until IC-69 or IC-70 answers it.
  //
  // ⭐ CS-4's DISCIPLINE, NOT ITS LANDING. Table T-066 wrote that row for a
  // file operation and its landing clause names `replaceDocument`, which is
  // wrong for a delete -- a delete lands through `applyDocumentChange`. What
  // carries over is the part that matters: nothing is read again while the
  // answer is awaited, so the writes below are the ones the question was asked
  // about and not a later document's.
  // ⭐ `Esc` REACHES IT, AND NOT BY WAY OF S-99g. U-55 of table T-103 settles
  // the name and table T-109 prints it in the surface column of IC-69 and
  // IC-70, so S-99g's own definition of a surface -- what the first level of
  // IN-4 (table T-028) closes -- covers it. `escapeTarget` spends that level on
  // the question because `escapeLevelOf` tells it one stands: the ladder lives
  // in `screen-state.ts` and the question lives here, which is the same split
  // the press in flight and the Dual Cursor mode already take.
  // ⛔ NOT MOVED INTO `ScreenState.surface`, AND THE REASON IS MEASURED RATHER
  // THAN DEFERRED. `openModalFromScreenState` (UF-66) turns ANY name standing
  // in S-99g into a modal, and table T-109 places IC-69 and IC-70 on the
  // `Confirmation` surface -- so a name there would raise a SECOND dialog
  // carrying a second copy of NT-7's two answers, over the one
  // `confirmationFromSession` already draws from `ScreenSession.confirmation`.
  // ⚠️ `display-words.json` holds a heading for five surfaces and not for this
  // one, so that second dialog would also be headless.
  //
  // ⭐ WHAT THE ANSWER DOES IS CARRIED WITH THE QUESTION, and is not a second
  // field the answering side has to know how to read. Three requirements raise
  // one now -- FR-032's delete, DI-4 of table T-227 and OP-4 of table T-024a --
  // and NT-7 gives all three the same two answers (IC-69 / IC-70), so
  // `answerSettledEntry` spends the entry and this settles what the entry
  // meant. ⛔ A union of payloads would put the deciding in the answering side,
  // and FR-031 (MUST NOT) keeps the places that may ask from growing: each
  // raiser stating its own landing is what makes a new one impossible to add by
  // accident.
  let asking: {
    readonly question: RaisedConfirmation
    /** @purity non-pure */
    settle(isProceeding: boolean, frame: FrameValues): void
  } | null = null
  // OP-3 of table T-024a (MUST) -- the road back to the read that put the
  // `Open Chooser` (U-56) up, until one of IC-71 .. IC-73 answers it.
  //
  // ⛔ HELD BESIDE `asking` AND NOT INSIDE IT. NT-7 of table T-037 is a
  // two-answer manner and `ScreenSession.confirmation` carries exactly that;
  // U-56 says of itself that it is not `Confirmation` because OP-3 has three.
  // So the two cannot share a holder, and the surface is not the same surface.
  // ⚠️ THE DIFFERENCE IS THE ROAD `Esc` TAKES, NOT WHETHER IT ARRIVES: this
  // question lives in `ScreenState.surface` (S-99g), so IN-4 of table T-028
  // spends its first level on it without this file saying anything, while the
  // `Confirmation` is spent from the flag `escapeLevelOf` sets. ⛔ Both are the
  // FIRST level and only one may go per press, which is why nothing here reads
  // `escapeTarget` a second time.
  // ⛔ NOTHING IS CHOSEN WHILE IT STANDS. OP-3 (MUST NOT) forbids GRS settling
  // the three-way question by itself, so a surface that goes away unanswered
  // abandons the open -- `null` is what the waiter is handed then, and an
  // abandoned open changes no document.
  let openChoosing: {
    /** @purity non-pure */
    settle(choice: OpenChoice | null): void
  } | null = null
  // Whether a file operation that waits for the person is running (CS-4 of
  // table T-066).
  //
  // ⭐ IT NOW ANSWERS OP-8 OF TABLE T-024a AS WELL, and the two reasons are
  // different. The shell's own: `ScreenSession.confirmation` and
  // `ScreenState.surface` each hold ONE, so a second operation that raised a
  // question would leave the first waiting on an answer nobody can give any
  // more. OP-8's (MUST NOT): while one open is running, a second one may not be
  // taken at all -- which is why the open path refuses at the entrance rather
  // than declaring the row true to `importDocument` and being refused there,
  // where nothing carries the refusal to anyone.
  // ⚠️ The store keeps a guard of its own for the first shape of reason, and
  // refuses with a fault; this one stops the operation before it can take the
  // question away.
  let isFileOperationWaiting = false
  // U-42 `Pointer` -- where one was last reported from.
  // ⛔ NEVER null again once one happening has arrived. IF-2 supplies 「ポインタ
  // とキーの出来事」 and has no happening for the pointer LEAVING the window,
  // and the note under table T-078 forbids widening that supply, so `null` here
  // means only that none has been reported yet.
  let pointerAt: { readonly x: number; readonly y: number } | null = null
  // What IF-9 answered where the pointer last was.
  // ⭐ Held because FR-048's exemption is about a CHANGE: a move that stays on
  // the same part draws the same picture, and only the previous answer can say
  // whether this one is a different one.
  let partUnderPointer: ScreenPart | null = null
  // What table T-023d answered where the pointer last was, or `null` where no
  // row of it claimed the point.
  // ⭐ HELD BESIDE `partUnderPointer` AND FOR THE SAME REASON, because the two
  // together are the whole of where the pointer stood: IF-9 answers for the
  // parts drawn OVER the schedule and this one for the schedule itself, and
  // FR-048's exemption is about a CHANGE in either.
  // ⛔ NOT A SECOND HIT TEST. `grabAtPointer` is asked once per happening and
  // its one answer is what both IN-2's shape and FR-048's judgement read.
  let grabUnderPointer: Grabbed | null = null
  // FT-4 of table T-078 -- when the rest EZ-2 of table T-040 waits on began,
  // read off the monotonic clock R3.6 requires for an elapsed time, or `null`
  // while the pointer has never yet been reported to stand anywhere.
  // ⛔ MOVING IS THE ONLY THING THAT ENDS A REST. A frame that redraws leaves
  // the pointer where it was, and EZ-2 asks only that it be ON the icon.
  let pointerRestingSince: number | null = null
  // How to call off the frame FT-4 owes at the end of that rest, or `null`
  // while none is standing.
  // ⚠️ THE WAY TO CANCEL IT RATHER THAN THE HOST'S HANDLE: a browser answers
  // with a number and a host outside one answers with an object, and nothing
  // here has any reason to know which it was given.
  // ⚠️ R5.3 -- exactly one stands at a time, because the one below is called
  // off before the next is set, and the loop lives as long as the page.
  let callOffIconHintWait: (() => void) | null = null
  // How to call off whichever half of FR-018's repeat is standing -- the wait
  // S-172 serves first, or the ticking S-173 keeps up after it -- or `null`
  // while the press in flight is on none of `REPEATING_ENTRIES` and while no
  // press is in flight at all.
  // ⚠️ ONE HANDLE OVER BOTH HALVES, because they are never both standing: the
  // wait replaces itself with the ticking, and `endEntryRepeat` is the one way
  // out of either. ⚠️ The way to cancel rather than the host's handle, which is
  // the reason `callOffIconHintWait` above gives -- a browser answers with a
  // number and a host outside one answers with an object.
  let callOffEntryRepeat: (() => void) | null = null
  // Table T-029a's Dual Cursor mode: which of `dualCursor`'s two dates (S-65)
  // is following the pointer, or `null` while the mode is not up.
  //
  // ⭐ THE MODE IS THIS ONE VALUE, and that is the user's ruling of 2026-08-26
  // -- the following side belongs to the session and not to the document. ⛔ A
  // boolean beside a side could say the mode is up with nobody following, and
  // DC-1 (which starts a side following the moment the mode is entered) and
  // DC-2 (which always hands the following over) leave no such state to be in.
  // ⚠️ THE NOTE THAT STOOD HERE SAID NOTHING COULD TURN IT ON, on the ground
  // that IC-45 could not be written because IV-13 demands both dates at once.
  // DC-1 refutes that ground: entering places BOTH dates, so IC-45 writes the
  // pair it needs. `commandFromDualCursorEntry` is where that press is answered
  // and `carryOutAction` below is what moves this.
  //
  // ⛔ NOT A MEMBER OF `ScreenSession`, although that is where the ruling puts
  // the FACT. `_source/components.json` gives ScreenRenderer no edge to
  // ScheduleGeometry, and no unit of that component draws either line: the two
  // lines and the mark are SvgRenderer's (EP-6, DC-8), which is reached through
  // `svgFromSchedule`'s own parameter instead. Reported.
  let dualCursorFollowing: DualCursorSide | null = null
  // FR-066 -- the conversation, which is NOT in the document (that MUST NOT)
  // and is therefore a current value LY-5 of table T-060 leaves here.
  //
  // ⭐ IT MOVES IN THIS BUILD, WHICH IT DID NOT BEFORE. `postDialogueMessage`
  // (PI-16) is what appends, and AM-18 of table T-107 reaches it now that the
  // `Agent API` is installed -- `agentApiSeams` below hands over the two seams
  // that road needs, and `dialogueSeams` is where the replacing and FT-5's
  // frame happen.
  // STOP -- ⛔ THE PERSON'S OWN SIDE IS STILL NOT WIRED, and it is a different
  // seam from this one. `ScreenSurface.readDialogueInput` (IF-9) and
  // `dialogueMessageFromInput` (PI-37) both exist and `screen-surface.ts`
  // states the caller's half of that contract -- read the settled line BEFORE
  // the draw that takes it away -- but nothing in `src/` asks for it, so every
  // message in this log arrives from the API's end today.
  let dialogueLog: DialogueLog = emptyDialogueLog()

  /**
   * What table T-060's LY-5 lets `applyDocumentChange` replace.
   *
   * ⚠️ Two members and not four: the pair is read ONCE per write (CS-3 of table
   * T-066) and swapped as ONE reference (WS-6, MUST).
   */
  const holder: DocumentHolder = {
    /** @purity semi-pure-b */
    read(): HeldDocument {
      return held
    },
    /** @purity non-pure */
    replace(next: HeldDocument): void {
      held = next
    },
  }

  /**
   * WS-7 of table T-067 -- who is told once the swap has happened, for every
   * write this loop makes. Both roads of PI-8 take it: the command road
   * (`writeDocument`) and the whole-document road of table T-230
   * (`replaceHeldDocument`), so an undo and an ordinary edit reach the watchers
   * the same way an `Agent API` write does.
   *
   * ⭐ THE SHAPE IS PI-15's AND IS NOT INVENTED HERE. `NotifyChangeWatchers`
   * names its callers itself and states what the Framework hands over: the
   * confirmed document, the judgement that travelled with it, and the dialogue
   * log beside it -- the log because FR-066 keeps it out of the document (MUST
   * NOT) and LY-5 of table T-060 leaves current values with this layer alone.
   * ⛔ INSIDE THE LOOP, because `dialogueLog` is. A shared one at module scope
   * would have no log to hand over and no session to belong to.
   * ⛔ NOTHING IS DECIDED HERE. `hasMovedSchedule` is WS-5's judgement on the
   * command road and table T-230's equality of the two `scheduleUpdatedUtc` on
   * the replacement road; AG-6 of table T-035 requires it to be CARRIED, and
   * UT-3 of table T-063 puts the choosing in the pure half (UF-25 of table
   * T-075). This side neither derives it nor filters on it.
   * ⚠️ THE SCREEN'S OWN WRITES GO THROUGH IT TOO, and AG-6's MUST NOT about a
   * writer woken by its own write is still kept: this side signs with
   * `EDITED_BY_SCREEN`, the word table T-229 reserves at ED-1, so a subscriber
   * of that name is passed over by the selection rather than by a guard here.
   */
  const audience: ChangeAudience = {
    /** @purity non-pure */
    deliver(document: Document, hasMovedSchedule: boolean): void {
      const outcome = notifyChangeWatchers({ document, hasMovedSchedule, dialogue: dialogueLog })
      // ⭐ THE ANSWER IS READ, AND IT IS THIS SIDE'S TO READ. `NotifyOutcome`
      // says why in as many words: PI-15 hands the failures back BECAUSE
      // swallowing them was the one thing it could not do, and this is the only
      // caller. RS-23 of table T-233 is the row they are carried on, and its
      // manner NT-3a (MUST) is what a delivery that failed silently could never
      // keep -- there would be no next step for a person who never heard.
      // ⚠️ WHAT FAILED IS NOT NAMED. `DeliveryFailure` carries the watcher's
      // name and what it threw, and neither is a word of the screen -- FR-038
      // (MUST NOT) forbids a second store of translated strings, and NT-1's
      // 「どの項目か」 is what the row of table T-233 says.
      // ⚠️ NO COUNT. `affectedCount` is NT-3's, which table T-037 asks of a
      // DESTRUCTIVE result; nothing was destroyed here, the write already
      // landed, and how many subscribers went unanswered is not that number.
      if (outcome.failures.length > 0) raiseNotice(WATCHER_SILENT_REASON, null)
      // ⛔ `outcome.notified` IS NOT READ, and nothing is owed for it: table
      // T-233 has no row for a delivery that worked, and NT-1 .. NT-7 have no
      // manner for telling a person that nothing went wrong.
    },
  }

  /**
   * The width the properties panel takes on THIS frame -- S-80 as the document
   * keeps it, or S-171 of table T-206 while FR-072 has the panel showing and
   * the document keeps no width of its own.
   *
   * ⭐ THE MIRROR OF `exportScene`'s `withPanelsClosed`, and it is laid over the
   * settings handed to `regionsFromScreen` for the same reason that one is: a
   * panel's rectangle is cut from that single width, so the width is the only
   * thing that can say whether the panel is there at all. S-80's own row says
   * `0` IS 「閉じている」, which is why a showing panel with nothing stored was
   * placed at the window's right edge with no width to draw into.
   * ⛔ LAID OVER A COPY AND NEVER WRITTEN BACK. S-171 is not a document setting
   * (table T-206 holds what the document does not keep), and a stored `S-80`
   * above zero is what a person left behind after dragging the boundary --
   * FR-052 makes that width win, so it is tested first.
   *
   * @purity semi-pure-b
   */
  function withPropertiesPanelShown(stored: DocumentSettings): DocumentSettings {
    if (propertiesShowing === null) return stored
    if (stored.propertyPanelWidth > 0) return stored
    return {
      ...stored,
      propertyPanelWidth: NOT_STORED_PROPERTIES_PANEL_SIZES['S-171'],
    }
  }

  // CA-2: invalidation happens at the head of a frame, and nothing is rebuilt
  // again for the rest of it. NFR-010 means a frame with no trigger never runs
  // at all, so there is no idle path to guard against.
  //
  // @purity non-pure
  function runFrame(): void {
    owed = false
    // CS-1 of table T-066: the frozen copy this frame is drawn from, taken
    // once at its head.
    // ⭐ ONE DOCUMENT PER FRAME STILL, WHICH IS THE WHOLE OF CS-1: a held press
    // that owes a picture substitutes the copy at this one line, and everything
    // below -- regions, settings, layout, geometry, both surfaces -- reads that
    // one binding. ⛔ `exportScene` keeps `held.document` unchanged: EP-12 of
    // table T-076 keeps this session's state out of an export, and a drag in
    // flight is as much this session's as the selection is.
    const document = previewDocument ?? held.document
    // FT-4 of table T-078 -- how long the pointer has rested, in ms, read ONCE
    // and here so that everything this frame draws is about one instant.
    // ⚠️ BESIDE THE FROZEN COPY AND NOT INSIDE IT: the note under table T-078
    // keeps the clock out of what CS-1 collects, and warns in as many words
    // against confusing it with the status date.
    const pointerRestedMs =
      pointerRestingSince === null ? 0 : readMonotonicMs() - pointerRestingSince
    // ⚠️ NOT `documentSettings` ITSELF, and the name says so: FR-072's panel
    // takes S-171's width while it is showing, and the width is the only thing
    // that can say it is there. `withPropertiesPanelShown` holds the whole rule
    // -- this is the mirror of `exportScene`'s `withPanelsClosed`.
    const withPanelShown = withPropertiesPanelShown(document.documentSettings)
    const environmentForRegions: ScreenEnvironment = {
      width: environment.width,
      height: environment.height,
      appHeaderHeight: environment.appHeaderHeight,
      scrollbarThickness: environment.scrollbarThickness,
    }
    // BO-1, then BO-3, then BO-4, in the order table T-077 fixes (MUST).
    const regions = regionsFromScreen(environmentForRegions, withPanelShown)
    const settings = viewSettings(document, withPanelShown, regions)
    const layout = layoutFromSchedule(document.schedule, settings, regions)
    // ⭐ THE SAME `selection` THE RENDERER IS ABOUT TO BE HANDED, and for the
    // same requirement: FR-075 (MUST) puts the fade grab points on the selected
    // Task alone, and `itemAtPointer` can only be as narrow as the geometry it
    // reads. Two different answers here would put a grab where no point is
    // drawn (PD-191).
    const geometry = geometryFromLayout(document.schedule, settings, layout, regions, selection)
    values = { regions, layout, geometry, settingsMeasuredWith: withPanelShown }
    surface.showSvg(
      // 'screen' is the picture a person is looking at, so table T-076's
      // omissions do not apply: FR-043's dummies are drawn here and only here.
      // ⭐ AND THE ONE THING TABLE T-076 KEEPS OUT while the screen shows it:
      // DC-8's mark for the following side of the `Dual Cursor` (EP-12 bars
      // operation state). `exportScene` says nothing here, so it gets the two
      // lines EP-6 asks for and no mark.
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
      ),
    )
    if (screen === undefined) return
    // ⛔ AFTER the schedule, because the parts outside it are drawn OVER the
    // drawing area -- the note under table T-023a limits that table's decision
    // order to the schedule for exactly this reason.
    screen.surface.showScreenView(
      screenViewFromRegions(
        regions,
        document.schedule,
        settings,
        selection,
        screenState,
        dialogueLog,
        sessionOf(document, regions, layout, {
          language,
          isAgentApiEnabled,
          pointer: pointerAt,
          pointerRestedMs,
          // ⭐ THE ANSWER THE SURFACE ALREADY GAVE, taken from where
          // `receiveInput` put it rather than asked for again: IF-9 reads the
          // page as it stands (`readScreenPartAt` says so), and a second read
          // inside the frame would be a second moment for one drawing.
          iconUnderPointer: partUnderPointer?.entry ?? null,
          commandPaletteDraggedTo,
          isMilestoneListOpen,
          selectedGroupIds,
          selectedResourceUids,
          propertiesShowing,
          propertiesSubject,
          confirmation: asking?.question ?? null,
          notices: raisedNotices,
        }),
      ),
    )
  }

  /** @purity non-pure */
  function ask(): void {
    if (owed) return
    owed = true
    // ⚠️ A frame is asked for, never run inline: two triggers landing in one
    // task would otherwise run table T-068 twice for one painted frame.
    const raf = globalThis.requestAnimationFrame
    if (typeof raf === 'function') raf(() => runFrame())
    else runFrame()
  }

  /**
   * FT-4 of table T-078 -- the pointer has moved, so the rest EZ-2 of table
   * T-040 waits out begins again from here.
   *
   * ⭐ WHY A WAKE IS SET AND NOT ONLY A NUMBER. Every other trigger that table
   * lists is something that HAPPENS, and a person who has stopped moving makes
   * nothing happen -- so with no wake the wait would pass unwitnessed and the
   * explanation could never be drawn at all. FT-4 has the shell measure the
   * time ITSELF, which is the whole of what this is, so nothing is minted that
   * NFR-010 forbids (MUST NOT).
   * ⛔ THIS IS THE ONLY THING IN THIS BUILD THAT COUNTS FT-4. The other two
   * waits that row names keep their own notes where they are answered.
   *
   * ⭐ THE WAIT IS S-124's, read off the document held at this moment
   * (`iconHintDelayMs`) rather than out of a number written here (rule 03).
   * ⚠️ A wake already standing keeps the length it was set with: no row says
   * what a wait in flight does when the setting is edited under it, and the
   * frame decides on the elapsed time in any case.
   *
   * ⛔ NOTHING IS WOKEN WHERE NO EXPLANATION COULD BE DRAWN. EZ-2's tooltip
   * (U-53) is one of the parts `ScreenSurface` draws, so with no `ScreenWiring`
   * the frame would redraw the identical schedule for nothing.
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
   * The press in flight when it stands on one of the four entrances FR-018
   * lets a hold repeat, or null when it stands anywhere else and when no press
   * is in flight at all.
   *
   * ⭐ ASKED OF THE PRESS AND NEVER OF WHERE THE POINTER IS NOW. CS-2 of table
   * T-066 freezes a gesture's screen at the press, and `commandFromEntry`
   * settles the release from `press.on` alone -- so a repeat judged on the
   * pointer would stop the moment the hand drifted a pixel off the entrance
   * while the same press was still deciding the same thing.
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
   * Ask `commandFromEntry` for the held entrance once more -- one tick of
   * FR-018's repeat.
   *
   * ⭐ THE SAME PRESS AND THE SAME MEMBER, WHICH IS WHY THE STEP CANNOT DRIFT.
   * FR-018 (MUST) keeps the step at S-53 through a repeat -- 「連続のあいだだけ
   * 別の幅にすると、同じ入口が 2 つの意味を持つ」 -- and the surest way to obey
   * that is to work nothing out here: `commandFromInput` (PI-18) is handed the
   * press this gesture began with and answers exactly what the release would.
   * ⚠️ It compounds rather than repeating one answer, and that is the rule
   * rather than a side effect: the context is collected afresh, so each tick
   * multiplies the zoom now in force by the same S-53.
   * ⛔ THE HAPPENING IS SPELLED, NOT INVENTED. FT-1 of table T-078 covers 「その
   * 入力の、待ちをまたいだ続き」 and its own note leaves raising that continuation
   * to the shell while keeping IF-2's supply as narrow as it was -- so the
   * continuation is spelled in IF-2's existing vocabulary, out of the `down`
   * this gesture began with, and no member is added to that seam.
   * ⚠️ NOT PUT THROUGH `receiveInput`. That would drop the press (IN-1 settles
   * on the release and this is not one), move the selection and spend a level
   * of `Esc` -- a repeat is one entrance answering again, not a release.
   * ⭐ NO UNDO STEP IS PUSHED, AND NONE IS SUPPRESSED HERE EITHER. All four of
   * these write `setZoom`, which UN-8 of table T-027 keeps out of the history
   * outright, so a hold of any length leaves the history where it was.
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
    // ⚠️ THE PRESS ITSELF WITH ONE MEMBER MOVED, so the point, the button and
    // the modifiers are the ones CS-2 froze -- the same values the release will
    // be read with. ⛔ `phase` has to move: `pointerAssignment` answers a `down`
    // with nothing but MK-10's question, and IN-1 is the reason it does.
    const continuation: PointerInput = { ...press.at, phase: 'up' }
    const context = collectInputContext(frame)
    carryOutAction(commandFromInput(continuation, context).action, frame)
    ask()
  }

  /**
   * FR-018 (MUST) -- 「入口を押し続けたときは、... `S-172` が定める待ち時間の
   * のち、同表の `S-173` が定める間隔で倍率を刻み続けること」.
   *
   * ⭐ WHY A WAKE AND NOT A COUNT, which is `beginPointerRest`'s reason word for
   * word: a person who goes on holding a button makes nothing happen, so with
   * no wake the wait would pass unwitnessed and the second step could never be
   * taken at all.
   * ⛔ THE FIRST TICK LANDS AT S-172 AND THE REST AT S-173. The requirement puts
   * the wait BEFORE the stepping (「待ち時間ののち ... 刻み続ける」), and it asks
   * for the wait to be the longer of the two (MUST) so that the first of the
   * run is not mistaken for part of it.
   * ⚠️ THE ORDINARY RELEASE IS UNTOUCHED. IN-1 of table T-028 (MUST) settles a
   * pointer operation on the release, so a tap still steps once when the button
   * comes up and a hold steps once more on top of what it repeated. ⛔ Nothing
   * says a repeat spends the release, and reading it that way would break the
   * MUST that is written.
   *
   * @purity non-pure
   */
  function beginEntryRepeat(): void {
    endEntryRepeat()
    if (pressHeldOnRepeatingEntry() === null) return
    const times = repeatTimesOfHeldEntry()
    // ⚠️ ONE WAKE CHAINED AFTER THE LAST, RATHER THAN A REPEATING TIMER. It is
    // the shape `beginPointerRest` above already has, so both waits this loop
    // measures are called off the same way; and a tick that ran late cannot
    // pile the next one on top of itself.
    const tickAfter = (afterMs: number): void => {
      const wake = setTimeout(() => {
        callOffEntryRepeat = null
        // ⛔ THE HOLD IS ASKED ABOUT AGAIN AT EVERY TICK. The three ends below
        // all call this off, but a host may still run a wake that was already
        // in flight when the button came up.
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
   * ⭐ THE THREE ENDS ARE TABLE T-028's OWN. IN-1 settles the operation on the
   * release and gives `Esc` as the way to interrupt one; IN-1a (MUST) ends a
   * drag whose pointer was lost outside the window. ⛔ Leaving the entrance --
   * or the drawing area -- is NOT one of them: IN-1 forbids reading that as an
   * interruption (MUST NOT), and `pressHeldOnRepeatingEntry` says the same from
   * the other side by asking the press rather than the pointer.
   * ⚠️ A repeat still ticking after the pointer was lost would be the defect
   * IN-1a exists to prevent, one frame per S-173 for as long as the page lives.
   *
   * @purity non-pure
   */
  function endEntryRepeat(): void {
    callOffEntryRepeat?.()
    callOffEntryRepeat = null
  }

  /**
   * BO-1 -- 「寸法が確定するまで 1 枚も描かない」. ⛔ NFR-011 makes it a MUST,
   * and a host really can hand over a 0 x 0 window: a preview pane that has
   * not been laid out yet does exactly that, and the frame drawn then is a
   * picture of nothing that the person sees before the real one.
   *
   * @purity pure
   */
  function settled(env: FrameEnvironment): boolean {
    return env.width > 0 && env.height > 0
  }

  // ---- FR-076: what is raised to be told ----------------------------------

  /**
   * Put one thing on `ScreenSession.notices` (FR-076).
   *
   * ⭐ THE MANNER IS READ OFF THE REASON, because table T-233 pairs them: every
   * raiser below names the situation it is in and the row of table T-037 comes
   * with it, so no caller of this can put a telling into the wrong manner.
   * ⛔ NO WORDS, AND NO COUNT INVENTED. `affectedCount` is what the raiser
   * MEASURED or `null`, and the words are read on the far side out of the one
   * dictionary FR-038 names.
   *
   * ⭐ WHICH TRIGGER PAINTS IT IS FT-1 OF TABLE T-078, the road
   * `askToWriteOverDestination` takes and for the same reason: that row covers
   * the continuation of one input across the wait CS-4 of table T-066 governs,
   * and its note leaves raising the continuation to the shell. So nothing here
   * mints a trigger (NFR-010, MUST NOT). ⚠️ `ask` coalesces, so a telling raised
   * inside a frame's own handling still paints once.
   *
   * @purity non-pure
   */
  function raiseNotice(reason: NoticeReason, affectedCount: number | null): void {
    raisedNotices = [
      ...raisedNotices,
      { manner: NOTICE_MANNER_OF_REASON[reason], reason, affectedCount },
    ]
    if (settled(environment)) ask()
  }

  /**
   * One file operation's fault, RAISED (FR-076), or let go where table T-233
   * owes it nothing. ⚠️ Raised and not told: telling is UF-67's half of the seam,
   * and this side hands over a row.
   *
   * ⚠️ `fault.what` IS DROPPED, and it has nowhere to go: `RaisedNotice` carries
   * a row and a count, and a detail string put on the screen beside them would be
   * a word this side wrote -- the second store of translated strings FR-038
   * forbids (MUST NOT). ⛔ Which item is wrong is what NT-1 (MUST) asks for, and
   * the row of table T-233 is what says it.
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
   * One refused write, raised (FR-076), for both roads of PI-8.
   *
   * ⚠️ NO COUNT. Every row table T-233 gives a refusal follows NT-1, and that
   * row asks for words rather than for the number NT-3 asks a destructive result
   * for.
   *
   * @purity non-pure
   */
  function raiseWriteRefusal(refusal: PlanRefusal | ReplacementRefusal): void {
    const reason = NOTICE_REASON_OF_WRITE_REFUSAL[refusal.reason]
    // See the census: the replacement road's WS-3 is the one refusal table T-233
    // names no row for.
    if (reason === null) return
    raiseNotice(reason, null)
  }

  // ---- The export's own environment ---------------------------------------

  /**
   * The scene PI-21 assembles an export from, for the base environment FR-080
   * names -- or `null` while BO-1 has settled no size to shrink from.
   *
   * ⭐ WHY IT IS A SECOND RUN OF TABLE T-068 AND NOT THE FRAME ON THE SCREEN.
   * FR-080's base environment closes two of the parts a person may have open,
   * and closing them gives their room to the schedule -- so the rectangles
   * change, and everything measured from them changes with. ⛔ Reusing the
   * frame the person is looking at would answer with a different picture from
   * the one that requirement defines, which is the very drift WY-2 and WY-3 of
   * table T-041 are there to catch.
   *
   * ⛔ NOT AT THE HEAD OF A FRAME. `runFrame` does not call this and must not:
   * MN-6 of table T-070 chose to run table T-068 once per frame and hand the
   * result round, and it chose that against NFR-002 and NFR-003. A second pass
   * on every frame is exactly the cost that decision refused. ⭐ This runs when
   * somebody asks for a picture, which is as often as an export is made.
   *
   * ⚠️ WHAT AN IF-7 IMPLEMENTOR DOES WITH IT. `AgentSnapshot.exportScene` is
   * where the answer goes, collected with the rest of the snapshot before the
   * Agent API member starts its work (R7.4, MUST). ⛔ Not handed over as
   * something for that member to call afterwards -- CS-3 of table T-066 makes
   * the whole call one consistency unit.
   *
   * @purity semi-pure-b
   */
  function exportScene(): ExportScene | null {
    if (!settled(environment)) return null
    const document = held.document
    // ⚠️ The width a closed panel takes is nothing, and taking nothing is the
    // only way PI-35 can be told a panel is not there: its rectangle is cut
    // from the stored width alone. ⛔ If the specification ever spells "closed"
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
    const settings = viewSettings(document, withPanelsClosed, regions)
    const layout = layoutFromSchedule(document.schedule, settings, regions)
    // EP-12 of table T-076 keeps what is selected and what is armed out of an
    // export, and CU-3 of table T-029 has the guide cursor follow a pointer
    // that an export does not have -- so the picture is rendered with none of
    // the three rather than having them removed from a finished string.
    // ⭐ THE GEOMETRY IS BUILT FROM IT TOO, not only the rendering: FR-075's
    // fade grab points are vertices, so an export told nothing about the
    // selection is the only way EP-12 keeps them out of the picture.
    //
    // ⛔ EP-14 CANNOT BE REACHED THAT WAY, and its route is the 'export'
    // argument below rather than anything done to the geometry. FR-043's
    // dummies hang on the Task being unstarted, which is a property of the
    // DOCUMENT and identical on both paths, so no value this function is free
    // to choose can suppress them. ⛔ AND THE GEOMETRY MUST NOT BE STRIPPED
    // INSTEAD: GR-7 hangs the not-started progress marker off GR-17, so a
    // geometry with its dummies emptied answers with no anchor at all and the
    // marker EP-5 requires vanishes from the export -- which WY-3 of table
    // T-041 measures against the screen's own picture.
    const nothingSelected = emptySelection()
    const geometry = geometryFromLayout(
      document.schedule,
      settings,
      layout,
      regions,
      nothingSelected,
    )
    // S-99e says the palette shows by default; the export's environment is the
    // one where it does not. ⚠️ Started from an empty state rather than from
    // the session's, so nothing a person left open (S-99g) reaches the picture.
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
      ),
      regions,
      screenView: screenViewFromRegions(
        regions,
        document.schedule,
        settings,
        nothingSelected,
        stateForExport,
        dialogueLog,
        // ⛔ No pointer, no question and nothing raised to tell: an export has no
        // hand over it, FR-032's question stands in front of a write rather than
        // a picture, and EP-11's reason -- a tool's own surfaces are not the
        // schedule -- reaches the tellings, which `image-exporter.ts` records
        // from its own side.
        // ⚠️ No dragged corner either, for the reason `nothingSelected` and
        // `stateForExport` above are built fresh: EP-12 of table T-076 keeps this
        // session's state out of the picture, and the palette is closed in this
        // environment, so no corner is drawn from it.
        // ⚠️ NO REST AND NO ICON UNDER IT, which follows from the same absence:
        // EZ-2 of table T-040 waits on a pointer resting on an entry, and an
        // export has neither the pointer nor the moment.
        // ⛔ NOTHING CHOSEN AND NOTHING SHOWN IN THE PROPERTIES PANEL EITHER,
        // for the reason `nothingSelected` above is built fresh: EP-12 of table
        // T-076 keeps this session's state out of the picture, and FR-085's
        // chosen rows, FR-099's chosen people and FR-072's panel are as much
        // this session's as the selection is. ⚠️ The `Agent API` is off here for
        // the same reason and not because of FR-065: nothing of the reader's is
        // in an exported picture.
        sessionOf(document, regions, layout, {
          language,
          isAgentApiEnabled: false,
          pointer: null,
          pointerRestedMs: 0,
          iconUnderPointer: null,
          commandPaletteDraggedTo: null,
          // ⚠️ Closed here whatever the reader left it at, for the reason the
          // corner above is at none: EP-12 of table T-076 keeps this session's
          // state out of the picture, and S-142 is as much this session's as the
          // corner is.
          isMilestoneListOpen: false,
          selectedGroupIds: [],
          selectedResourceUids: [],
          propertiesShowing: null,
          propertiesSubject: null,
          confirmation: null,
          notices: [],
        }),
      ),
      settings,
    }
  }

  // ---- FR-065: the Agent API ----------------------------------------------

  /**
   * The bounds a settings write is judged against that the document does not
   * keep: the zoom's two (S-97 / S-98) and the width FR-052 measures a panel
   * against.
   *
   * ⭐ ONE PLACE FOR THE SUM FR-052 IS MEASURED AGAINST, because two roads need
   * it now: the screen's own writes and the snapshot an `Agent API` call is
   * answered from. `SettingsLimits` states the sum itself and forbids rebuilding
   * it from a window width -- the copy that did dropped the scrollbar term.
   *
   * ⛔ WITH NO FRAME THERE IS NO WIDTH, AND `0` IS WHAT THAT SAYS. BO-1 of table
   * T-077 (NFR-011, MUST) forbids a frame before the dimensions have settled, so
   * before the first one there is no `Row Area` to measure and nothing here may
   * invent one. ⚠️ Reachable only from the snapshot, and only in a state the
   * `Agent API` cannot be installed in -- IC-20 of table T-109 is a press on a
   * header that has been drawn.
   *
   * @purity semi-pure-b
   */
  function settingsLimitsOf(frame: FrameValues | null): SettingsLimits {
    // ⛔ THE SAME OVERLAY THE FRAME WAS MEASURED WITH, or the sum below is
    // short by exactly S-171: `frame.regions.rowArea` was cut with the panel
    // showing, and adding a stored `0` back would not return the width the
    // panel is occupying. FR-052 is judged against this sum.
    // ⛔ CARRIED BY THE FRAME AND NO LONGER READ OFF `held.document`. While
    // FR-052's divider is held the frame is measured from a preview whose two
    // widths are not the stored ones, and the held widths added back to a
    // `Row Area` cut with the preview's would make this sum drift by exactly
    // the travel -- so the width the release is judged against would depend on
    // how far the finger had already gone. See `FrameValues`.
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
   * ⭐ NOTHING NEW IS WORKED OUT HERE, WHICH IS THE POINT. FR-052's two widths
   * and table T-023d's fade days are decided in exactly one place -- the
   * release road of `commandFromInput` (PI-18) -- so the picture asks that same
   * member with a release shaped from where the pointer stands now, and folds
   * what it answers onto a COPY with `editDocument` (PI-9). ⛔ A second reading
   * of either rule here would be a picture that could disagree with the write it
   * is a picture OF, which is the whole defect this closes.
   *
   * ⭐ THE SYNTHETIC RELEASE IS HONEST. `gestureModifiers` reads the PRESS's
   * modifiers for every phase but `down`, and CS-2 of table T-066 freezes the
   * button, the hit and the part on the press as well -- so the only thing this
   * supplies is the point, which is what the person is choosing.
   *
   * ⛔ AND IT SETTLES NOTHING. `applyDocumentChange` (PI-8) is not on this road,
   * so WS-4 pushes no undo step, `advancedStamp` moves no stamp, no watcher is
   * notified and nothing is autosaved. FR-031's 「身振り 1 つ ＝ 取り消し 1 段」
   * therefore survives however many frames a drag lasts.
   *
   * ⛔ A REFUSED WRITE DRAWS THE HELD DOCUMENT. WS-3 of table T-067 throws a
   * whole bundle away when one command comes back refused, so a release from
   * here would write nothing at all -- and the picture that matches THAT is the
   * unchanged one. ⚠️ Keeping the last accepted preview instead would break the
   * property the note on `previewDocument` leans on and would show a width the
   * release will not produce.
   * @provisional PD-253
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
    // ⭐ THE FOLD STARTS AT THE HELD DOCUMENT AND NEVER AT THE LAST PICTURE.
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
   * FR-065 -- the enabling moved, so whoever places the public point is told.
   *
   * ⭐ ONE DOOR FOR BOTH WAYS AND FOR BOTH REASONS. A person moves it with IC-20
   * and a whole-document replacement puts it back to false, and the party that
   * has to install or uninstall may not learn about one of those and not the
   * other. ⛔ Nothing is told when it did not move: FR-028's exposure is a state,
   * not an event, and telling twice would have the installer place the name over
   * a reference it had already handed out.
   *
   * @purity non-pure
   */
  function setAgentApiEnabled(next: boolean): void {
    if (next === isAgentApiEnabled) return
    isAgentApiEnabled = next
    agentApiEnablingWatch?.(next)
  }

  /**
   * IF-7 of table T-065, which UF-48 of table T-075 gives this file.
   *
   * ⭐ EVERYTHING AT ONCE, which is the whole of what that seam asks for: CS-3 of
   * table T-066 makes one `Agent API` call one consistency unit, and AG-4 of
   * table T-035 forbids a caller to be handed a document from before a release
   * beside a selection from after it. Every member below is read from what this
   * loop holds at this instant and nothing is computed twice.
   *
   * ⚠️ THE FREEZING IS NOT DONE HERE. `snapshot-source.ts` says so from the far
   * side: the copy AG-4 asks for is made by the component that answers a caller,
   * and freezing the values where they are held would freeze the ones this loop
   * is about to replace.
   */
  const snapshotSource: AgentApiSeams['source'] = {
    /** @purity semi-pure-b */
    readSnapshot() {
      // ⭐ READ ONCE INTO A LOCAL so that the frame the picture came from and
      // the frame the bounds were measured against are the same frame.
      const frame = values
      return {
        document: held.document,
        selection,
        dialogue: dialogueLog,
        // `FrameSnapshot` is the three members of `FrameValues` a caller may
        // read; ADR-001 computed them at the head of this frame and this hands
        // them on rather than running table T-068 again for one call.
        // ⚠️ THE FOURTH IS NOT ON PI-19 AND IS NOT MEANT TO BE. What a frame was
        // measured WITH is this loop's own bookkeeping for `settingsLimitsOf`,
        // and the settings a caller wants are the document's, which AM-3 already
        // answers with.
        frame,
        exportScene: exportScene(),
        isGestureInFlight: isDocumentChangingPress(pressed),
        // ⛔ FALSE BECAUSE NOTHING CAN BE UNSETTLED, not because AG-9's second
        // half is being skipped: `collectInputContext` records that no in-place
        // entry exists in this build, and `collectWriteMoment` answers the same
        // for WS-2 of table T-067. ⚠️ One of the two turns true the day that
        // entry lands, and both of them have to.
        isEditingInPlace: false,
        historyLimits: HISTORY_LIMITS,
        settingsLimits: settingsLimitsOf(frame),
        // ⚠️ The wall clock, and rightly so: AT-129 spells a MOMENT, and R3.6
        // sends only an elapsed time to a monotonic one.
        readAt: readInstantOfWrite(),
      }
    },
  }

  /**
   * PI-16's two seams, which `postDialogueMessage` needs and which LY-5 of table
   * T-060 leaves with this layer because FR-066 (MUST NOT) keeps the log out of
   * the document.
   *
   * ⭐ FT-5 OF TABLE T-078 IS THE FRAME THIS ASKS FOR, and it is that row and
   * not a trigger minted here: 「日程データの群の刻を動かさずに届いた発話」 is
   * delivered by CP-16, which reaches this side through `deliver`.
   * ⛔ THE WATCHERS ARE WOKEN THROUGH THE ONE AUDIENCE THIS LOOP ALREADY HAS.
   * `notifyChangeWatchers` (PI-15) takes the document, the judgement and the log
   * together, and AG-11 of table T-035 counts an utterance in an order of its
   * own -- so the schedule is declared unmoved and the log it carries is the one
   * the append just left behind.
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
        // ⚠️ THE ARGUMENT IS NOT READ, and it is the same log: the holder above
        // was replaced before this ran (CP-16 fixes that word order), so the
        // audience below takes what this loop now holds and the two cannot
        // disagree.
        audience.deliver(held.document, false)
        if (settled(environment)) ask()
      },
    },
  }

  // ---- FT-1 of table T-078 ------------------------------------------------

  /**
   * CS-2 of table T-066 -- what the gesture is about, frozen at the press.
   *
   * ⭐ `on` IS HANDED IN rather than read here, which is what keeps ONE reading
   * of IF-9 per happening (R7.4): `receiveInput` asks the surface once, and both
   * this and FR-048's judgement are settled from that single answer. ⚠️ Asking
   * again here would be a second moment, and CS-2 wants the moment of the press.
   *
   * ⚠️ `semi-pure-b` AND NOT `pure`, because `pressRow` below reads the two
   * current values this loop holds (R7.1). They are read HERE rather than taken
   * as arguments so that all three members of the press are frozen at the one
   * moment CS-2 names; `collectInputContext` reads the same two right after and
   * carries the same tag for the same reason.
   *
   * @purity semi-pure-b
   */
  function collectPress(at: PointerInput, frame: FrameValues, on: ScreenPart | null): PointerPress {
    // ⭐ NO HIT WHEN THE SURFACE ANSWERED. The note under table T-023a limits
    // that table's decision order to the schedule's drawing area (MUST), and
    // the parts drawn over it hold no rectangle in `ScreenRegions` -- so a
    // press the surface claimed was not a press on the schedule at all.
    // ⛔ WHICH READING OF TABLE T-023d THIS PRESS IS. Its closing rule (MUST
    // NOT) keeps a double-click-only row -- GR-10 today -- out of the plain
    // press, so a name label no longer swallows the press that GR-12 needs;
    // but the same rule leaves the DOUBLE CLICK on the table's order unchanged,
    // so the second click must ask for the other reading or MK-13 loses the
    // label it is meant to open.
    // ⭐ THE COUNT IS THE FRAMEWORK'S, which is why the answer is settled here:
    // `clickCount` is meaningful on `down`, and telling a double click from two
    // single ones is a question about elapsed time that LY-5 leaves this layer.
    const resolving = at.clickCount >= 2 ? 'doubleClick' : 'press'
    const hit =
      on === null ? itemAtPointer(frame.geometry, at.x, at.y, POINTER_SLOP, resolving) : null
    // ⭐ ASKED OF THE SIDE THAT OWNS TABLE T-023a, AND CARRIED FROM HERE ON.
    // `collectWriteMoment` needs to know a pan (PD-1) from a marquee (PD-5) to
    // keep AG-9's exemption, and R2.7 forbids it to read that table a second
    // time -- so the answer rides on the press, exactly as `hit` does.
    // ⚠️ NARROWED ARGUMENTS ON PURPOSE: this runs BEFORE `collectInputContext`,
    // and no whole `PointerPress` can exist until this call has answered,
    // because the row is one of the press's own members.
    const pressRow = pressRowOf({ at, hit }, { screenState, dualCursorFollowing })
    // FR-053 (MUST) -- this shell FOLLOWS, so the member that says so starts at
    // the press's own point. ⭐ Its own note gives the rule: a travel is
    // measured from here and never from the press once one has been applied, so
    // the parts telescope and the sum over a drag is still `release - press`.
    // ⛔ FILLED FOR EVERY PRESS AND NOT ONLY THE BAND'S, because the member is
    // a statement about the CALLER rather than about the gesture: a shell that
    // filled it only sometimes would be a shell that follows only sometimes,
    // and `paletteFollow` is the only member that reads it.
    // ⚠️ THE ONE PART OF THE PRESS CS-2 DOES NOT FREEZE, and that member says
    // why -- the other four are the moment of the press, this one is how far
    // the picture has been carried since.
    return { at, hit, on, pressRow, followedTo: { x: at.x, y: at.y } }
  }

  /**
   * What table T-023d claims where the pointer now stands (`itemAtPointer`,
   * PI-7), or `null` where no row of it does.
   *
   * ⭐ ASKED ONCE PER HAPPENING AND READ BY BOTH SIDES (R7.4). IN-2's shape and
   * FR-048's judgement are two questions about ONE answer, and asking twice
   * would be a second moment as well as a second walk of the geometry.
   *
   * ⚠️ THIS IS THE ONLY PLACE THE HIT TEST IS ASKED WITHOUT A PRESS, and the
   * cost is why the cheap refusals stand in front of it. `itemAtPointer` is a
   * LINEAR SCAN: it builds one bounding-box pair per drawn `Task` and then
   * walks table T-023d's rows as the outer loop over those, so a pointer
   * resting on empty canvas pays O(n) per move at MC-7's 1000 `Task`.
   * ⭐ NFR-013 IS KEPT -- that requirement bounds hit testing at `O(n log n)`
   * and forbids `O(n²)`, and linear is inside it -- but it is not free, so
   * `regionAtPointer` turns away every point outside the `Row Area` and the
   * surface's own answer turns away every point on a drawn entry. Both are
   * constant time.
   *
   * @purity semi-pure-b
   */
  function grabAtPointer(
    frame: FrameValues,
    x: number,
    y: number,
    on: ScreenPart | null,
  ): Grabbed | null {
    // ⛔ The note under table T-023a binds that table's decision order to the
    // schedule's drawing area (MUST), and a point the screen surface answered
    // for is on a part drawn OVER it.
    if (on !== null) return null
    // ⛔ The `Schedule Canvas` is wider than the `Row Area`, and every target
    // of table T-023d is drawn inside the latter.
    if (regionAtPointer(frame.regions, x, y) !== 'rowArea') return null
    // ⛔ PD-2 TURNS HIT TESTING OFF while the `Dual Cursor` is up, so the table
    // is not asked at all rather than asked and its answer thrown away.
    if (dualCursorFollowing !== null) return null
    // ⭐ THE PRESS READING, by the default, and that is the right one: IN-2's
    // shape has to say what a PRESS here would do, and table T-023d's closing
    // rule says a double-click-only row does not answer one. A shape read off
    // the other reading would put a grab cursor on a name label that cannot be
    // grabbed.
    return itemAtPointer(frame.geometry, x, y, POINTER_SLOP)
  }

  /**
   * IN-2 of table T-028 -- what the pointer can do where it now stands, as a
   * shape, or `null` for a place that row does not name.
   *
   * ⭐ THE ORDER IS TABLE T-023a's OWN, top row first, because IN-2 is a
   * statement ABOUT that table's answer: the shape has to say what a press
   * here would do, and that is decided nowhere else. ⛔ Rearranging it would
   * make the shape promise one thing and the press do another.
   *
   * ⚠️ THE LAST THREE REFUSALS BELOW ARE `grabAtPointer`'s AS WELL, and they
   * are restated rather than left to it: that function answers `null` for a
   * point it turned away, and `null` is also its answer for empty canvas, where
   * PD-5 gives a shape. ⛔ A shape read off the hit alone would put PD-5's
   * crosshair on the time ruler.
   * ⚠️ NO FRAME IS ASKED FOR HERE. The shape is not drawn content -- the host
   * paints the pointer -- so it is written straight out rather than through
   * `ScreenSession`.
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
    // PD-1, and IN-2 asks for it 「パン中」 -- so the press in flight is what is
    // read, not the modifiers of a move that presses nothing.
    if (pressed !== null && pressed.pressRow === 'PD-1') return 'grabbing'
    // STOP -- ⛔ IN-2 NAMES NO SHAPE FOR AN ENTRY. The note under table T-023a
    // binds that table to the schedule's drawing area (MUST), and a point the
    // screen surface answered for is on a part drawn OVER it.
    if (on !== null) return null
    // STOP -- ⛔ AND NONE FOR THE RULER, THE PANELS OR THE PADDING either. The
    // `Schedule Canvas` is wider than the `Row Area`, and IN-2's four places are
    // all inside the latter.
    if (regionAtPointer(frame.regions, x, y) !== 'rowArea') return null
    // STOP -- ⛔ PD-2 TURNS HIT TESTING OFF, and IN-2 names no shape for the
    // `Dual Cursor` mode, so nothing is invented for it.
    if (dualCursorFollowing !== null) return null
    // PD-3. ⭐ WHICH SHAPE IS THE TABLE'S ABOVE, not a test written here: IN-2
    // now names the bar's middle and a milestone's figure as well as the two
    // bars' ends, and the rows it still names nothing for answer `null` there.
    if (hit !== null) return POINTER_SHAPE_BY_GRAB[hit.grab]
    const armed = screenState.armed
    // PD-5 -- nothing hit and nothing armed.
    if (armed.kind === 'none') return 'crosshair'
    // STOP -- ⛔ PD-4a DOES NOTHING HERE, so 「作図の合図」 would be a lie. An
    // armed dependency on empty canvas draws nothing and does not even disarm,
    // and IN-2 names no shape for that.
    if (armed.kind === 'dependency') return null
    // PD-4 -- a figure or an annotation is armed, and a press would make it.
    return 'copy'
  }

  /**
   * Everything the three members of PI-18 read besides the happening itself.
   *
   * @purity semi-pure-b
   */
  function collectInputContext(frame: FrameValues): InputContext {
    return {
      // ADR-001's three, computed once at the head of this frame and handed
      // out rather than measured again.
      document: held.document,
      layout: frame.layout,
      geometry: frame.geometry,
      regions: frame.regions,
      screenState,
      selection,
      zoomStep: NOT_STORED_ZOOM_STEP['S-96'],
      zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
      zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
      pressed,
      // STOP -- ⛔ NO IN-PLACE ENTRY EXISTS IN THIS BUILD. IN-5a's state is
      // 「編集入力の確定前」, which only the field `editInPlace` opens can be
      // in, and that action has no owner here (`carryOutAction` records the same
      // absence). So nothing can be unsettled, and saying so is a fact rather
      // than a guess.
      isTextEntryUnsettled: false,
      dualCursorFollowing,
      today: readToday(),
      // AT-51 is a UUID, and minting one is not a pure act -- which is why the
      // translator is handed the identifier instead of making it. ⚠️ One is
      // minted per context and therefore twice per happening; it is read only
      // where FR-001 has to make a row, so an unused one costs nothing.
      newGroupId: crypto.randomUUID(),
    }
  }

  /**
   * WS-2's three questions, answered from what this loop is holding at the
   * moment the write is asked for.
   *
   * ⛔ NOT A CONSTANT, AND THIS IS WHY. AG-9 of table T-035 makes refusing
   * mid-gesture a MUST, and the press that answers it is a value this loop
   * MOVES: `receiveInput` drops it on the release and on IN-1's abort, so a key
   * happening arriving mid-drag finds it still set. Frozen at false, SK-3 wrote
   * through the middle of a drag -- `commandFromInput` puts no guard of its own
   * on that row, because WS-2 is where the guard belongs.
   * ⭐ NARROWED TO WHAT AG-9 ACTUALLY ASKS. AG-9 refuses a write during a drag
   * that CHANGES THE DOCUMENT, and spares the two gestures table T-027 puts
   * outside the undo history because they change none of it -- the pan (UN-8)
   * and the range selection (UN-9). Those are rows PD-1 and PD-5 of table
   * T-023a, and the press now CARRIES which row it began (`pressRow`), so the
   * exemption is kept without reading that table a second time (R2.7).
   * ⛔ `on` IS READ FIRST, AND THE ROW ONLY WHERE IT IS NULL. The note under
   * table T-023a binds its decision order to the schedule's drawing area
   * (MUST), so a press the screen surface answered for is not one of the six
   * gestures at all -- it is a press on an entry, and `commandFromEntry` may
   * well change the document. Reading the row first would hand every palette
   * press PD-5's exemption and take AG-9's MUST off all of them.
   * ⛔ `editingInPlace` is false for the reason `isTextEntryUnsettled` is, and
   * the STOP on that member holds it: no in-place entry exists in this build,
   * so there is nothing that could be unsettled.
   * ⚠️ `deliveringNotices` is NOT this side's to answer. WS-7's own window is
   * owned by `apply-document-change.ts`, which ORs its flag with this one --
   * answering it here as well would count the same window twice.
   *
   * @purity semi-pure-b
   */
  function collectWriteMoment(): WriteMoment {
    return {
      gestureInFlight: isDocumentChangingPress(pressed),
      editingInPlace: false,
      deliveringNotices: false,
    }
  }

  /**
   * WS-6 and WS-7, through the one write path CP-8 allows. ⛔ MS-1 of table
   * T-042 forbids a second entrance -- with two, one of them ends up with
   * validation or history the other does not have.
   *
   * @purity non-pure
   */
  function writeDocument(commands: readonly DocumentCommand[], frame: FrameValues): void {
    // ⭐ The sum `edit-document-settings.ts` spells on that member, worked out
    // in the one place that works it out (`settingsLimitsOf`) -- this frame's
    // own `Row Area` with the two panel widths added back on.
    const settingsLimits = settingsLimitsOf(frame)
    const outcome = applyDocumentChange(
      {
        commands,
        // WS-1 matches this against the stamp the document carries now. It is
        // the one just read, so it matches -- and it is passed rather than
        // skipped because AG-2 gives the `Agent API` the same gate through the
        // same argument, and one path may not have a weaker one.
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
    if (outcome.accepted) return
    // FR-076 (MUST): the refusal is raised. It was never thrown nor swallowed --
    // FR-028 makes it a VALUE, and `outcome.refusal` names the step of table
    // T-067 that turned the write away, which is what table T-233 gives a row
    // per reason for. ⛔ Nothing is composed here: the row goes over and the
    // words are the dictionary's (FR-038, MUST NOT).
    raiseWriteRefusal(outcome.refusal)
  }

  /**
   * One row of table T-230, taken through the same write path (`replaceDocument`
   * of PI-8) as any other write.
   *
   * ⭐ The shell names the row and brings nothing else. RD-1 and RD-2 ask
   * UndoEdit and RedoEdit at WS-3, and the history, the stamp and the undo step
   * are that road's business -- this side is left holding neither a rule of
   * table T-027 nor a stamp to mint.
   *
   * ⭐ ANSWERS WHETHER THE ROW LANDED, because one caller has something to do
   * AFTER it did: FR-015's caution belongs to an overlay that was accepted, and a
   * row that was refused has already had its own telling raised below. ⛔ The
   * answer is the acceptance and nothing more -- what the write did is table
   * T-230's to say, and reading it back off the holder is what CS-3 governs.
   *
   * @purity non-pure
   */
  function replaceHeldDocument(call: ReplacementCall): boolean {
    const outcome = replaceDocument(
      {
        // WS-1 matches this against the stamp the document carries now, exactly
        // as `writeDocument` does and for the same reason: the declaration is
        // AG-2's gate, and this path may not have a weaker one than the
        // `Agent API`'s. ⛔ NOT the stamp of the document coming in -- table
        // T-230 forbids that comparison (MUST NOT) and it would refuse every
        // replacement there is.
        readStamp: held.document.documentStamp,
        moment: collectWriteMoment(),
        call,
      },
      holder,
      audience,
    )
    // FT-2 of table T-078: the current value was replaced, so a frame is owed.
    // ⚠️ `ask` coalesces with FT-1's, so the press still paints once.
    if (outcome.accepted) {
      // ⛔ THE PICTURE IS ABOUT THE DOCUMENT IT WAS FOLDED ONTO, and that
      // document has just been replaced. This road is the one that reaches here
      // from OUTSIDE a happening -- IF-7's `holdDocument` and OP-2's read -- so
      // the frame asked for below would otherwise paint a preview of a document
      // that is gone. ⚠️ A replacement that arrived on a happening (SK-6's undo)
      // has the preview worked out again at the end of `receiveInput`, from the
      // document this call just put in place.
      previewDocument = null
      // FR-065 (MUST): 「1 つの文書で開いたことが、別の文書を開いたときにも効いて
      // いてはならない」.
      //
      // ⭐ WHICH ROWS ARE 「別の文書」 IS TABLE T-230's OWN ANSWER, read off its
      // 履歴 column rather than judged here: RD-4, RD-5 and RD-6 say 「捨てる」 or
      // 「空にする」, which is that table saying the document now current is not a
      // continuation of the one that was. ⚠️ The other three carry it forward --
      // RD-1 and RD-2 restore an earlier state of the SAME document and RD-3
      // merges into the one being read (「いまのものを残す」) -- so turning the
      // `Agent API` off on an undo would take a person's choice away for nothing.
      // ⛔ THIS IS THE HALF OF FR-065 THAT CAN BE KEPT WITHOUT AN IDENTIFIER.
      // The remembering half needs one and nothing derives one; `sessionOf`
      // carries that STOP.
      // ⭐ THROUGH THE ONE DOOR, so the side that placed the public point hears
      // this turn as well as IC-20's -- an entrance left standing over a
      // document the person never opened it for is the exposure FR-028 forbids.
      if (call.row === 'RD-4' || call.row === 'RD-5' || call.row === 'RD-6') {
        setAgentApiEnabled(false)
      }
      if (settled(environment)) ask()
      return true
    }
    // FR-076 (MUST): the same road `writeDocument` takes one over.
    // STOP -- ⛔ ONE OF THE SIX REASONS STILL REACHES NOBODY, and it is this
    // road's own: `NOTICE_REASON_OF_WRITE_REFUSAL` records that table T-233 gives
    // WS-3 a row written for a bundle of commands dropped, while WS-3 here is
    // ImportDocument's refusal. ⚠️ The four rows WS-1 and WS-2 carry do travel.
    raiseWriteRefusal(outcome.refusal)
    return false
  }

  /**
   * DI-4 of table T-227 (MUST): the overwrite question, put up and waited on.
   *
   * ⭐ NT-7's TWO ANSWERS AND NOTHING ELSE: `Confirmation` (U-55 of table
   * T-103) stands on IC-69 and IC-70 and holds no third entry, which is exactly
   * what this row needs and exactly what OP-3 could not use -- OP-3's three
   * have a surface of their own now (U-56).
   *
   * ⭐ THE LIST OF WHAT WOULD GO IS EMPTY, AND THAT IS AN ANSWER. DI-4 states
   * in as many words that the duty to name what disappears is not on this row,
   * and `RaisedConfirmation.items` records the same ruling from the other side.
   *
   * ⭐ THE SENTENCE IS QN-4 OF TABLE T-234, named and not written, for the
   * reason `confirmationOwedBy` gives: FR-038 (MUST) keeps every word the
   * screen prints in the one generated dictionary, and FR-076 (MUST) makes the
   * row the whole of what this side hands over. ⚠️ That row and DI-4 agree
   * about the empty list above -- 「挙げない —— 正の行が自らそう定めている」.
   *
   * ⭐ WHICH TRIGGER PAINTS IT IS FT-1 OF TABLE T-078, and that row says so
   * itself: it covers the continuation of one input across the wait CS-4 of
   * table T-066 governs, and its note leaves raising that continuation to the
   * shell. So the frame asked for below is the deferred rest of the press that
   * began the save, and NFR-010's MUST NOT is kept without a trigger of this
   * file's being minted.
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
   * OP-3 of table T-024a (MUST): put the three-way question up and wait for one
   * of the three to be taken.
   *
   * ⭐ THE SURFACE IS U-56 AND THE THREE ANSWERS ARE THE ROSTER'S. This side
   * names the surface and nothing else: table T-109's own surface column is
   * what places IC-71 .. IC-73 on it, `icon-roster.json` is that column
   * generated into `src/`, and UF-66 reads the placement off it -- so the three
   * entries appear without this file listing one.
   * ⛔ NO WORDS ARE WRITTEN HERE. FR-038 (MUST) keeps every word the screen
   * prints in the one generated dictionary; the heading and the three labels
   * are its rows and are written there, so a word typed here would be the
   * second dictionary that requirement forbids.
   * ⚠️ S-99g HOLDS ONE SURFACE, so whatever stood open gives way to this one.
   * That is the value's own rule and not a choice made here.
   * ⭐ The frame is FT-1's continuation across the wait, the same road
   * `askToWriteOverDestination` takes.
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
   * OP-4 of table T-024a (MUST): the confirmation owed before a replace throws
   * the current document away.
   *
   * ⭐ NT-7's MANNER, AND THE ONE THING THAT GOES IS NAMED. That row asks for
   * the names of what disappears where there is something that disappears, and
   * here there is exactly one: the document standing now. Its name is its own
   * value (AT-3) rather than a word of the screen's, which is why it can be
   * carried at all -- FR-038 leaves a document's values untranslated.
   * ⚠️ `isShownOnAnotherRow` is false because FR-032's row half is not what is
   * asking; the member says the same from `ConfirmationItem`'s side.
   * ⭐ THE SENTENCE IS QN-5 OF TABLE T-234, whose 場面 is 「未保存の編集を捨てて
   * 置き換えるとき」 and whose 正 is OP-4 itself -- so naming the row is naming
   * this moment, and no word of it is written here (FR-038, MUST NOT).
   * ⚠️ ASKED ABOUT THE DOCUMENT CS-4 COLLECTED, not about whatever the wait left
   * behind -- which is why the document is an argument rather than read here.
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
   * OP-2 of table T-024a -- one file, taken along the road that table lays out:
   * OP-12 picks the decoder, OP-5 validates, OP-3 asks, OP-4 confirms a
   * replace, and table T-230 lands the answer.
   *
   * ⭐ CS-4 OF TABLE T-066 IS THE SHAPE OF THIS FUNCTION, the same shape
   * `saveHeldDocumentToFile` has: what the operation needs from the current
   * values is taken before the first `await`, and nothing after it reads `held`
   * again while the person is answering (MUST NOT). The bounds OP-5 judges
   * against and the document MSPDI borrows its presentation group from are
   * therefore the ones in force when the person asked to open, and not
   * whichever ones the two waits left behind.
   * ⛔ THE LANDING READS THE PAIR AGAIN, AND THAT IS CS-3 RATHER THAN A BREACH
   * OF CS-4: table T-230 puts `current` in `replaceDocument`'s hands, which
   * reads the holder ONCE inside the write -- a merge built on a document read
   * before the question would silently drop whatever was edited while it stood.
   *
   * ⭐ EVERY STEP THAT CANNOT GO ON RETURNS WITHOUT TOUCHING THE DOCUMENT, which
   * OP-5 requires in as many words: an input that is turned away must not have
   * been applied even in part, and the reading side is where that is cheapest to
   * keep -- nothing has been adopted until the last line.
   *
   * ⚠️ Nothing is caught. FR-028 (MUST NOT) forbids throwing, and IF-3 states
   * that a store which throws has broken its contract.
   *
   * @purity non-pure
   */
  async function openDocumentIntoHold(store: FileStore, route: OpenRoute): Promise<void> {
    // CS-4: collected at the moment the operation begins, and not read again.
    const current = held.document
    // ⛔ THE BOUNDS ARE THE ONES IN FORCE, NEVER THE ARRIVING FILE'S.
    // `ImportBounds` states the rule and the reason: OP-5 runs before OP-3, and
    // OP-6 restores an arriving presentation group only after a replace has
    // been chosen, so the settings in force are necessarily this document's --
    // and reading the input's own would let an untrusted file raise its own
    // ceiling, which empties NFR-009.
    const bounds: ImportBounds = current.documentSettings

    const opening = await openDocumentFile(store, route)
    if (!opening.ok) {
      // FR-076 (MUST): the same road `saveHeldDocumentToFile` takes one over.
      raiseFileFault(opening.fault)
      return
    }
    // OP-11 (MUST): the rest were left behind and the person is told so, in the
    // manner NT-5 that table T-233 pairs with this row -- which is why the open
    // goes on below rather than reading as refused (MUST NOT).
    // ⚠️ THE NUMBER RIDES ON `affectedCount`. That member is documented against
    // NT-3 and this row follows NT-5, and it is the one place on `RaisedNotice`
    // a number can travel -- so the count is carried rather than dropped, and no
    // word of it is written here (FR-038, MUST NOT).
    if (opening.ignoredFileCount > 0) {
      raiseNotice(IGNORED_FILES_REASON, opening.ignoredFileCount)
    }
    const file = opening.file

    // OP-12 (MUST): both the extension and the first non-blank character have
    // to name the same row of table T-024, and a file where either disagrees is
    // not read at all (MUST NOT).
    const reading = formatFromFile(file.fileName, file.text)
    if (!reading.ok) {
      // FR-076 (MUST): which side disagreed is told. `reading.mismatch` is
      // carried precisely so NT-1 can say WHICH item is wrong, and table T-233
      // gives OP-12 a row per answer.
      raiseNotice(NOTICE_REASON_OF_FORMAT_MISMATCH[reading.mismatch], null)
      return
    }
    const incoming = decodedDocument(reading.format, file.text, current)
    // STOP -- ⛔ A CODEC'S FAULT REACHES NOBODY. `decodedDocument` above records
    // why: table T-233 holds no row for one, and FR-076 (MUST NOT) makes that
    // table the whole of what a telling may carry.
    if (incoming === null) return

    // OP-5 (MUST): FR-023's validation runs whatever the route, and BEFORE OP-3
    // is asked -- the row states the reason itself, that asking first would
    // have the current document thrown away for an input that is then refused.
    const verdict = validateImportedDocument(
      {
        document: incoming,
        // S-113 is stated in megabytes and measured in bytes, which is why the
        // gateway carries the file's byte length beside the decoded text.
        byteLength: file.byteLength,
        // STOP -- ⛔ NO CODEC ANSWERS THIS. `ImportCandidate.emptyRowTaskUids`
        // records that docs/spec says neither how such a row is recognised nor
        // where it is held, and PI-20 of table T-064 publishes nothing that
        // reports one -- so this build knows of none, which is a fact about the
        // build rather than a value guessed at here.
        emptyRowTaskUids: [],
      },
      bounds,
    )
    if (!verdict.ok) {
      // STOP -- ⛔ THE REFUSALS REACH NOBODY, and the reason is no longer that
      // nothing holds a telling: it is that none of them can be KEYED. Each names
      // the rule, the place and whether NT-1 or NT-6 is its manner, and table
      // T-233 says in as many words that FR-023's refusals are not among its rows
      // because the rows of table T-220 already carry ids of their own -- while
      // `display-words.json` has no section keyed on those, so there is nothing
      // for the words to be read out of. ⚠️ FR-023's other half is missing with
      // it: that requirement lets a person drop the rows a date refusal names and
      // take the rest, and there is no surface to offer the choice on.
      return
    }

    // FR-088 (MUST NOT / MUST): 「稼働する曜日を 1 つも持たない暦を、文書の暦
    // （`FR-054`）にしてはならない…受け付けずに通知すること」. IV-17 of table
    // T-220 is the condition and `scheduleViolations` (PI-1) is what answers
    // that table, so the rule is asked for rather than restated here.
    //
    // ⭐ WHY THE ANSWER HAS TO BE ASKED FOR AT ALL, and why an open is where.
    // Every count of working days climbs the calendar FR-054 resolves, and a
    // calendar that works no weekday leaves that climb with no day to reach --
    // `schedule.ts` throws `NoWorkingDayReached` rather than answer, and this
    // loop draws from a document it has already taken. So an input carrying
    // one has to be turned away BEFORE it becomes the current document; after
    // that there is no road left that does not end in the drawing.
    //
    // ⭐ BEFORE OP-3 IS ASKED, for the reason OP-5 states in as many words: a
    // question put first would have the current document thrown away for an
    // input that is then refused.
    //
    // ⚠️ ASKED OF THE ARRIVING DOCUMENT AND ITS OWN SETTINGS. IV-17 reads only
    // the schedule -- the row is about the calendar FR-054 resolves -- and
    // `scheduleViolations` takes the pair because other rows of table T-220 are
    // judged against the presentation group. ⛔ NOT `bounds`: those are the
    // ceilings in force, which OP-5 is judged against and this row is not.
    //
    // ⚠️ ONLY THIS ONE ROW TURNS THE OPEN AWAY. See the note on
    // `NO_WORKING_WEEKDAY_INVARIANT`: FR-088 is the requirement that says so,
    // and the other rows of table T-220 have no row of table T-233 to be told
    // on -- the same gap the OP-5 verdict above records.
    //
    // ⚠️ THE ARRIVING DOCUMENT IS JUDGED ON ALL THREE OF OP-3's ANSWERS, and on
    // the two that do not replace this is the stricter reading: which calendar
    // a merge lands is PI-10's, so an input refused here might have landed
    // sound. ⛔ Narrowing it would need the landed document judged INSTEAD, and
    // the landing is the write -- there is no moment after it at which FR-088's
    // 「受け付けず」 is still available. Chosen the reading that cannot let a
    // calendar with no working weekday become the document's.
    const noWorkingWeekday = noWorkingWeekdayReason(incoming)
    if (noWorkingWeekday !== null) {
      raiseNotice(noWorkingWeekday, null)
      return
    }

    const choice = await askHowToOpen()
    // ⛔ OP-3 (MUST NOT): nothing is chosen here. A question that went away
    // unanswered leaves the read where it was, and an abandoned open changes
    // no document -- which is the only outcome that does not decide for the
    // person.
    if (choice === null) return

    // OP-4 (MUST): the replace is the one choice that throws the current
    // document away, so it is the one choice that asks first. That row exempts
    // the other two in as many words, because neither discards anything.
    // ⛔ ASKED ON EVERY REPLACE, BECAUSE NOTHING SAYS WHEN AN EDIT IS UNSAVED.
    // OP-4's rule sentence carries no condition, and no row anywhere says when
    // a document counts as holding one -- there is no saved-state value to
    // read, and the undo history counts steps since this document became
    // current, which a save does not clear.
    // ⚠️ So the question stands even where nothing could be lost, which keeps
    // that row's MUST NOT and costs a press. ⛔ Skipping it would also make
    // PI-10's `unsavedEditsDiscardConfirmed` say a person confirmed who was
    // never asked. Narrowing it needs the manuscript, not this file.
    const isDiscardConfirmed =
      choice === 'replace' ? await askToDiscardCurrentDocument(current) : false
    if (choice === 'replace' && !isDiscardConfirmed) return

    // ⭐ WHAT PI-10 IS BROUGHT, minus the two fields table T-230 fills in for
    // this side: `current` is CS-3's one read, and the row fixes the choice.
    const importing = {
      incoming,
      format: reading.format,
      // OP-5 passed above, and this side never claims it did not run.
      validationPassed: true,
      // OP-8 (MUST NOT) is kept at the ENTRANCE, where a second open is refused
      // before it can begin, so by construction none is running but this one.
      // ⛔ Declaring the flag true here would refuse this very open.
      anotherOpenInProgress: false,
      unsavedEditsDiscardConfirmed: isDiscardConfirmed,
      // STOP -- ⛔ NOTHING PUTS FR-022's, MG-4's OR MG-12's QUESTION. Table
      // T-032a's four answers, the project profile's three and the presentation
      // group's three each need a surface, and table T-103 names none for any
      // of them -- table T-109 places no entry for one either. `null` is "not
      // answered", which `MergeChoices` declares as its own meaning, so a merge
      // that has candidates is refused by PI-10 rather than being decided here
      // (FR-022 MUST NOT). ⚠️ The refusal that comes back carries the
      // candidates, and it reaches nobody for the reason above.
      merge: null,
      defaultSettings: DEFAULT_DOCUMENT_SETTINGS,
      // AT-109 -- one per import, and minting one is not a pure act, which is
      // why PI-10 takes it rather than making it. ⚠️ The same member the
      // context mints `newGroupId` with, for the same reason.
      importSessionId: crypto.randomUUID(),
    }

    // RD-4 of table T-230 -- OP-3's replace. The history is dropped and the
    // stamp comes through as the file wrote it, and both are that row's to say.
    if (choice === 'replace') {
      replaceHeldDocument({ row: 'RD-4', importing: { ...importing, choice } })
      return
    }
    // RD-3 -- the merge and the overlay. It is the one row of table T-230 whose
    // stamp advances and whose WS-4 can owe a step, so it is the one row that
    // needs the two bounds and the two stamp fields.
    // STOP -- ⛔ OP-9's MUST DOES NOT ARRIVE FOR EVERY FILE ON THIS ROW. That
    // row has what was read put into the frame kept for the overlay, and
    // `baselinedDocument` (PI-10) keeps only the tasks whose `UID` a current
    // task carries -- so a file that shares no `UID` with the document lands an
    // empty frame and OP-9 is not kept. ⚠️ Nothing this side passes changes
    // that: `current` is CS-3's one read and PI-10 fills it. Which of OP-9's
    // frame and FR-015's pairing is the narrower is not this file's to settle.
    //
    // ⛔ THE DOCUMENT RD-3 IMPORTS AGAINST, TAKEN HERE SO THAT THE TELLING BELOW
    // IS ABOUT THE SAME IMPORT. `replaceDocument` reads the holder once inside
    // the write (CS-3), and no `await` stands between this line and that read,
    // so the two are necessarily the same document. ⚠️ NOT `current`: that one
    // is CS-4's read from before the two waits, and an edit made while the
    // question stood would leave it naming a different set of matches.
    const importedAgainst = held.document
    const landed = replaceHeldDocument({
      row: 'RD-3',
      importing: { ...importing, choice },
      historyLimits: HISTORY_LIMITS,
      editedBy: EDITED_BY_SCREEN,
      updatedUtc: readInstantOfWrite(),
    })

    // FR-015 (MUST): 「対応するタスクが無い重ねる側のタスクは、描かずに通知する
    // こと」, and OP-9 of table T-024a points at this same requirement for the
    // telling. RS-16 of table T-233 is the row it is carried on, and FR-076
    // (MUST NOT) is what makes that row the whole of what may be carried.
    //
    // ⛔ ONLY THE OVERLAY, AND ONLY ONCE IT LANDED. RD-3 also carries OP-3's
    // merge, and `ImportReport.baselineTaskUidsNotDrawn` is the overlay side's
    // member; a refused row is told by `replaceHeldDocument` itself and has
    // nothing left undrawn to caution about.
    if (!landed || choice !== 'baseline') return

    // ⚠️ PI-10 IS ASKED A SECOND TIME, AND THAT IS A COST RATHER THAN A CHOICE:
    // `ReplaceOutcome` (PI-8) answers with the document and WS-5's judgement and
    // carries no `ImportReport`, so the road that lands the overlay cannot hand
    // back the tasks it could not pair. ⛔ The alternative is worse -- counting
    // the frame against the read file HERE would be this file making PI-10's
    // pairing judgement a second time, which R2.7 refuses. `importDocument` is
    // pure and the request is the very one RD-3 was given, so the two runs
    // answer alike.
    // ⚠️ A member on `ReplaceOutcome` for the report is what is owed.
    const overlaid = importDocument({ ...importing, choice, current: importedAgainst })
    // The row landed, so PI-10 accepted it; a refusal here would be the two runs
    // disagreeing, and there is nothing about THIS requirement to tell then.
    if (!overlaid.ok) return

    // ⚠️ THE NUMBER RIDES ON `affectedCount`, exactly as OP-11's caution above
    // has it: that member is documented against NT-3 and this row follows NT-5,
    // and it is the one place on `RaisedNotice` a number can travel.
    // ⛔ NOTHING IS WRITTEN HERE. The row id and the count go over and the words
    // are the dictionary's (FR-038, MUST NOT) -- a sentence composed on this side
    // would be the second store of translated strings that requirement forbids.
    // ⛔ NOTHING IS RAISED WHEN EVERY TASK MATCHED: NT-5 is 「受け付けたうえで
    // 注意を伝えるとき」, and with nothing left undrawn there is no caution.
    const notDrawn = overlaid.report.baselineTaskUidsNotDrawn.length
    if (notDrawn > 0) raiseNotice(OVERLAY_NOT_DRAWN_REASON, notDrawn)
  }

  /**
   * SK-11 of table T-036 and IC-2 of table T-109 -- write the document that is
   * held out to a file.
   *
   * ⭐ CS-4 OF TABLE T-066 IS THE SHAPE OF THIS FUNCTION. Everything the
   * operation needs from the current values is taken before the first `await`,
   * and nothing after it reads `held` a second time (MUST NOT), so
   * what lands in the file is the document the person asked to save and not
   * whichever one the wait left behind.
   *
   * ⭐ WHICH OF THE TWO DESTINATIONS IS SETTLED BY THE STORE, NOT CHOSEN HERE.
   * FR-060 is the overwrite, and the same requirement's note on SK-11 in FR-096
   * says a document with no overwrite target is asked for a destination instead
   * -- so the state is asked for once and the road follows the answer. ⛔ This
   * is not the fallback `saveDocumentFile` refuses to make: that one would turn
   * a FAILED overwrite into a chooser, and this asks BEFORE anything starts.
   * ⚠️ `permissionLost` goes to the overwrite road on purpose -- FR-060's file
   * is still that file, and asking for the permission back is what
   * `overwriteOpenedFile` does.
   *
   * ⭐ DI-5 of table T-227 (MUST) is why only one road carries an identity: the
   * opened file is by definition this document's own, and nothing is asked.
   *
   * ⚠️ NOTHING LANDS IN THE DOCUMENT, so CS-4's landing clause has nothing to
   * do here: a save writes a file and leaves the current value alone. ⛔ Not an
   * omission -- no requirement makes SK-11 change the document it wrote.
   *
   * ⚠️ Nothing is caught. FR-028 (MUST NOT) forbids throwing and IF-3 states
   * that a store which throws has broken its contract, so a rejection here is a
   * broken store rather than a case to handle.
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
        ? await saveDocumentFile(store, chosenFileSave(text, project, SAVE_FORM))
        : await saveDocumentFile(store, {
            destination: 'openedFile',
            content: { text },
            form: SAVE_FORM,
          })

    if (saving.ok) return
    // FR-076 (MUST): the fault is raised, carrying the row of table T-233 its
    // reason is and the manner that table pairs with the row.
    // ⚠️ `cancelled` is let go inside `raiseFileFault`, which is where IF-3's
    // reason for keeping it apart is recorded.
    raiseFileFault(saving.fault)
  }

  /**
   * FR-096 and SK-12 of table T-036 -- write the document that is held out in
   * the format chosen on the `Export Chooser` (U-54).
   *
   * ⭐ THE ROAD SK-11 ALREADY TAKES, and only its chosen-destination half.
   * FR-096 (MUST) has the chooser suggest a name, which is a question only the
   * chosen-file arm of `DocumentFileSaveRequest` asks; DI-5 of table T-227
   * exempts FR-060's overwrite alone, and this is not that route. ⛔ So an export
   * never lands on the opened file, whatever form it is in -- which is also the
   * reason `notAnOverwriteTarget` cannot arise on this road.
   *
   * ⭐ CS-4 OF TABLE T-066 IS THE SHAPE OF THIS FUNCTION, the same shape
   * `saveHeldDocumentToFile` has: the document is taken before the first
   * `await`, and nothing after it reads `held` again while the person is
   * pointing at a destination or answering DI-4's question (MUST NOT).
   *
   * ⚠️ Nothing lands in the document, so CS-4's landing clause has nothing to do
   * here -- an export writes a file and leaves the current value alone.
   * ⚠️ Nothing is caught, for the reason `saveHeldDocumentToFile` gives: FR-028
   * (MUST NOT) forbids throwing and IF-3 states that a store which throws has
   * broken its contract.
   *
   * @purity non-pure
   */
  async function exportHeldDocumentToFile(
    store: FileStore,
    format: ExportFormatId,
  ): Promise<void> {
    // ⛔ A ROW THAT IS NOT A FILE WRITES NOTHING. `saveFormOfExportFormat` says
    // which row lands here and why; doing nothing then is the absence of the
    // behaviour and not the behaviour.
    const form = saveFormOfExportFormat(format)
    if (form === null) return
    // CS-4: collected at the moment the operation begins, and not read again.
    const written = held.document
    // ⛔ THE THREE FORMS THIS BUILD CANNOT WRITE STOP HERE. `exportedText` names
    // what each of them is missing.
    const text = exportedText(form, written)
    if (text === null) return

    const saving = await saveDocumentFile(
      store,
      chosenFileSave(text, written.schedule.project, form),
    )
    if (saving.ok) return
    // FR-076 (MUST): the same raising SK-11's road makes, over the same seam.
    raiseFileFault(saving.fault)
  }

  /**
   * FR-096's road: the file the person is about to point at.
   *
   * ⭐ DI-1's three columns, gathered where the document is. ⚠️ TWO ROADS REACH
   * THIS NOW: SK-11's, which is taken only when the store holds no opened file,
   * and FR-096's export, which is taken whether one is held or not.
   * ⚠️ The file name is `null` on both, and that is a choice rather than a fact
   * on the second: the name of the opened file is the store's to answer, and
   * asking it here would be a second external read inside the one consistency
   * unit R7.4 keeps whole. By DI-1 and DI-2 a `null` name matches no
   * destination, so DI-4's question is owed for every existing file -- which is
   * the direction table T-227 chooses throughout, an extra question against a
   * file that cannot be got back. ⛔ It can only ask MORE often than DI-1 would,
   * never overwrite one in silence.
   *
   * @purity pure
   */
  function chosenFileSave(
    text: string,
    project: Project,
    form: SaveFileForm,
  ): ChosenFileSaveRequest {
    return {
      destination: 'chosenFile',
      content: { text },
      form,
      suggestedFileName: suggestedFileNameOf(project, form),
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
   * The six entries of table T-109 this loop answers for, on the release that
   * settled on one. Returns whether the entry was spent here.
   *
   * ⭐ THE SHELL'S OWN, BECAUSE NONE OF THEM IS A `DocumentCommand`. IC-21
   * chooses the display language (S-99), IC-69 / IC-70 are NT-7's two answers,
   * and IC-71 .. IC-73 are OP-3's three; table T-108 has no row for any of the
   * six, and LY-5 of table T-060 leaves a current value with this layer.
   *
   * ⚠️ IC-69 writes what was HELD, not what the document says now: CS-4's
   * discipline is that the answer lands on the operation that was begun.
   *
   * @purity non-pure
   */
  function answerSettledEntry(entry: IconId, frame: FrameValues): boolean {
    if (entry === DISPLAY_LANGUAGE_ENTRY) {
      // FR-038 (MUST): exactly two languages, so one entry that shows the
      // current one is the whole switch (the header's half of the two entrances
      // the same requirement asks for).
      language = language === 'ja' ? 'en' : 'ja'
      writeBrowserStored('S-99', language)
      return true
    }
    if (entry === MILESTONE_LIST_OPEN_ENTRY || entry === MILESTONE_LIST_FOLD_ENTRY) {
      // S-142 of table T-206, turned the way the language above is: the press
      // writes a current value LY-5 of table T-060 leaves with this layer, and
      // `input-command-translator.ts` answers both rows with nothing.
      // ⛔ WRITTEN FROM THE ENTRY AND NOT FROM WHAT IS HELD, which is the
      // opposite of `chooseRow` and `toggleChosenResource` -- those two are one
      // control that reverses, and these are two controls that each say which
      // way they go. A press on IC-50 with the list already open leaves it
      // open, which is what that row means.
      isMilestoneListOpen = entry === MILESTONE_LIST_OPEN_ENTRY
      return true
    }
    if (entry === CONFIRMATION_PROCEED_ENTRY || entry === CONFIRMATION_CANCEL_ENTRY) {
      const asked = asking
      if (asked === null) return false
      // ⛔ Cleared BEFORE the answer is carried out, not after: `carryOutAction`
      // refuses to start anything while a question stands, and what follows is
      // the answer to this one rather than a new request.
      asking = null
      asked.settle(entry === CONFIRMATION_PROCEED_ENTRY, frame)
      return true
    }
    const openChoice = OPEN_CHOICE_OF_ENTRY[entry]
    if (openChoice !== undefined) {
      const choosing = openChoosing
      // ⚠️ Not spent when nothing is waiting: the three entries exist only while
      // the surface holding them is up, and a press that reached one with no
      // read behind it is a press this loop has no answer for.
      if (choosing === null) return false
      openChoosing = null
      // S-99g: the surface has answered its question, so it is no longer open.
      // ⛔ Closed HERE and not by `screenStateFromEntry`, even though table
      // T-109 now places IC-52 on this surface too: that entry is IN-4's way
      // OFF a surface without answering it, which OP-3 (MUST NOT) makes an
      // abandoned read and not one of the three. These three ARE the answer, so
      // the closing belongs beside the answering -- leaving it to the
      // translator would leave the surface standing over the document with its
      // question already settled.
      screenState = screenStateWithSurface(screenState, null)
      choosing.settle(openChoice)
      return true
    }
    return false
  }

  /**
   * FR-096 and SK-12: the format chosen on U-54, spent. Returns whether it was
   * spent here.
   *
   * ⭐ THE SHELL'S OWN, for the reason the six entries beside it are: writing a
   * file is FileGateway's (IF-3) and the document written is a current value,
   * which LY-5 of table T-060 leaves with this layer. Table T-108 has no command
   * for it, and `input-command-translator.ts` reads no format at all.
   *
   * ⛔ NOT DECIDED BY THE SPECIFICATION: whether U-54 stays up once a format has
   * been taken. Looked in FR-096 (one entry, one chooser, and nothing about what
   * becomes of the surface), in table T-024a, in table T-103's U-54 and in IN-4
   * of table T-028, which settles only how a surface is CLOSED and not when one
   * closes itself. ⭐ Chose to close it, the same choice `answerSettledEntry`
   * makes for U-56 and for the same reason: this press IS the surface's answer,
   * and leaving it standing would leave a surface over the document with its
   * question already settled. ⚠️ Recoverable in one line if the manuscript says
   * otherwise -- IC-52 and `Esc` both still close it either way.
   *
   * @purity non-pure
   */
  function answerSettledFormat(format: ExportFormatId): boolean {
    // S-99g: the surface has answered its question, so it is no longer open.
    screenState = screenStateWithSurface(screenState, null)
    // ⛔ NO STORE WAS HANDED IN, so there is nothing to write to. Doing nothing
    // then is the absence of the behaviour and not the behaviour.
    const store = files
    if (store === undefined) return true
    // ⛔ ONE AT A TIME, the same guard the save and the open paths keep: CS-4 of
    // table T-066 collects at the moment the operation begins, and a second one
    // begun mid-wait would take the one question the screen can hold away from
    // the first.
    if (isFileOperationWaiting || asking !== null || openChoosing !== null) return true
    isFileOperationWaiting = true
    // ⚠️ NOT AWAITED, AND NOTHING IS OWED TO THE PRESS -- the shape the save path
    // has, and for the reason CS-4 gives: the operation spans frames, and the
    // flag above is what keeps the next press from starting a second one.
    // ⛔ WAITING ON PD-187, and so are the other two of this shape below. That
    // record states the gap exactly: `.finally` does not consume a rejection,
    // and all three of these declare a rejection to be a breach of IF-3's
    // contract -- so a rejected one is neither swallowed on purpose nor told.
    // ⛔ NOT SETTLED HERE. The three answers PD-187 weighs (swallow it, leave
    // it, give it a row of table T-233) are a ruling, and a row invented in
    // this file would be the reason FR-076 (MUST NOT) bars from outside that
    // table. ⚠️ Not the same question as LM-14 of table T-004, which is a write
    // the environment could not perform and already has RS-3.
    void exportHeldDocumentToFile(store, format).finally(() => {
      isFileOperationWaiting = false
    })
    return true
  }

  function carryOutAction(action: InputAction | null, frame: FrameValues): void {
    // MK-12: a combination this tool assigns nothing to produces nothing.
    if (action === null) return
    switch (action.kind) {
      case 'changeDocument': {
        // FR-032 (MUST): a row deletion, and a `Task` deletion that leads WBS
        // descendants, are asked about before they land. ⛔ The question is put
        // in front of the WHOLE action and not each bundle: NT-7 asks once
        // about what is going to happen, and a person answering twice for one
        // press is not what 「続けるか取りやめるかを選ばせること」 means.
        // ⚠️ While one question stands, a second write is not started -- the
        // answer would otherwise land on a document the question never saw.
        if (asking !== null) return
        const owedQuestion = confirmationOwedBy(action.writes.flat(), held.document)
        if (owedQuestion !== null) {
          const owedWrites = action.writes
          asking = {
            question: owedQuestion,
            /** @purity non-pure */
            settle(isProceeding, answeringFrame) {
              // FR-032 (MUST) -- 「取りやめる」 leaves the document untouched.
              // Nothing was written, so there is nothing to undo either.
              if (!isProceeding) return
              for (const bundle of owedWrites) writeDocument(bundle, answeringFrame)
            },
          }
          return
        }
        // ⭐ ONE PRESS MAY OWE MORE THAN ONE WRITE, AND THE ORDER IS THE
        // RULE. FR-031 (MUST) splits one fit press into two writes and forbids
        // swapping them (MUST NOT): CM-71 puts the zoom and the place and
        // pushes no step (UN-8), then CM-72 opens the collapsed rows and pushes
        // the one step UN-17 asks for.
        // ⛔ NOT FLATTENED INTO ONE CALL. WS-4 of table T-067 pushes the
        // document as it stood BEFORE the write, so a single bundle would push
        // a step carrying the OLD zoom -- and undoing it would rewind the zoom
        // that UN-8 keeps out of the history. Two calls leave the second step
        // already holding the new zoom, so undo brings the collapse back and
        // leaves the zoom where the fit put it.
        // ⛔ THIS DOES NOT WEAKEN AG-3's atomicity. Each write below is still
        // one bundle and one reference swap (WS-6, MUST); what FR-031 permits
        // is one GESTURE writing twice, not one write landing in halves.
        for (const bundle of action.writes) writeDocument(bundle, frame)
        return
      }
      // RD-1 and RD-2 of table T-230. ⭐ The shell asks neither UndoEdit nor
      // RedoEdit itself: the pair is replaced by the ONE write path, which is
      // what MS-1 of table T-042 is about.
      case 'undoEdit':
        replaceHeldDocument({ row: 'RD-1' })
        return
      case 'redoEdit':
        replaceHeldDocument({ row: 'RD-2' })
        return
      case 'copySelection':
      case 'pasteClipboard':
        // STOP -- ⛔ NO CLIPBOARD SEAM IS WIRED. SK-4 and SK-5 belong to
        // ClipboardGateway (PI-24 of table T-064), and nothing in this build
        // builds one or hands it to this loop. ⚠️ Doing nothing here is not
        // the behaviour: it is the absence of it.
        return
      case 'openDocumentFile': {
        // SK-10 of table T-036 and IC-1 of table T-109 -- OP-2's one entry,
        // which that row forbids import having a door beside (MUST NOT).
        // ⛔ NO STORE WAS HANDED IN, so there is no file to read. Doing nothing
        // then is the absence of the behaviour and not the behaviour.
        const store = files
        if (store === undefined) return
        // OP-8 (MUST NOT) and CS-4's one-at-a-time, which is the same guard the
        // save path keeps: a second read begun mid-wait would take away the one
        // question the screen can hold, and OP-8 refuses it on its own account.
        if (isFileOperationWaiting || asking !== null || openChoosing !== null) return
        isFileOperationWaiting = true
        // ⚠️ NOT AWAITED, AND NOTHING IS OWED TO THE PRESS -- the same shape the
        // save path has, and for the same reason CS-4 gives: the operation
        // spans frames, and the flag above is what keeps the next press from
        // starting a second one.
        // ⛔ WAITING ON PD-187, the second of the three: see the note on the
        // export path above for what is undecided.
        void openDocumentIntoHold(store, OPEN_ROUTE_FROM_CHOOSER).finally(() => {
          isFileOperationWaiting = false
        })
        return
      }
      case 'saveDocumentFile': {
        // ⛔ NO STORE WAS HANDED IN, so there is nothing to write to. Doing
        // nothing then is the absence of the behaviour and not the behaviour.
        const store = files
        if (store === undefined) return
        // ⛔ ONE AT A TIME. CS-4 of table T-066 collects at the moment the
        // operation begins, and a second one begun mid-wait would take the one
        // question the screen can hold away from the first.
        if (isFileOperationWaiting || asking !== null || openChoosing !== null) return
        isFileOperationWaiting = true
        // ⚠️ NOT AWAITED, AND NOTHING IS OWED TO THE PRESS. The rest of this
        // happening is settled before the chooser has even opened -- CS-4 says
        // in as many words that the operation spans frames -- and the flag
        // above is what keeps the next press from starting a second one.
        // ⛔ WAITING ON PD-187, the third of the three: see the note on the
        // export path above for what is undecided.
        void saveHeldDocumentToFile(store).finally(() => {
          isFileOperationWaiting = false
        })
        return
      }
      case 'settleTextEntry':
      case 'editInPlace':
        // STOP -- ⛔ NO IN-PLACE EDITOR EXISTS. SK-19, SK-9 and MK-13 open or
        // settle a field that nothing in this build draws, which is the same
        // absence `isTextEntryUnsettled` records above.
        return
      // ⛔ `openPropertiesPanel` WAS A CASE HERE AND IS GONE. MK-13 forbids a
      // route that opens the properties panel to sit on that row (MUST NOT),
      // and the panel loses no entrance by it: FR-072 decides its contents by
      // the last operation the reader made, and the selection comparison at the
      // end of `receiveInput` already calls `showPropertiesOfChoice` whenever a
      // press moved the choice -- which a double click on a Task does on its
      // first click. ⚠️ That comparison is what this removal rests on and it
      // was measured, not assumed; the case removed here called that same
      // function and passed it nothing.
      case 'moveCommandPalette': {
        // GR-19 of table T-023d -- the band was dragged, so FR-053's palette
        // moves by the travel the translator measured.
        // ⭐ WRITTEN HERE AND NOWHERE ELSE, because it is a current value and
        // LY-5 of table T-060 leaves those with this layer: table T-108 has no
        // command for it, so `writeDocument` is not the road and no step of the
        // undo history is pushed.
        // ⚠️ Added to where the palette actually STOOD, which is the same
        // resolution the frame drew with -- so a first drag moves it from the
        // `Row Area`'s corner and not from the window's origin.
        //
        // ⛔ ONE TRAVEL PER MOVE AND ONE MORE ON THE RELEASE, WHICH IS WHAT
        // FR-053's MUST COSTS. That requirement makes the palette FOLLOW the
        // pointer while the band is held and then says of that very same drag
        // that the corner is decided at the moment it is let go -- 「追従は絵の
        // 話であって、値が決まる時点を早めるものではない」. ⭐ THE TWO ARE NOT IN
        // CONFLICT HERE, and the reason is what table T-206 does NOT hold: no
        // row of it or of table T-203 keeps this corner, so there is no saved
        // form for a travel to reach and nothing settles when one arrives --
        // `paletteCornerOf` records that ruling. What IN-1 protects is the
        // moment a value is DECIDED, and a value the document never keeps is
        // decided nowhere; what moves here is the picture FR-053 asks for.
        // ⚠️ EACH TRAVEL IS AN INCREMENT AND NEVER A TOTAL, because each is
        // added to the corner the previous one left: a travel measured from the
        // PRESS would be right only for the first piece and would then overshoot
        // by more the more pieces one drag was reported in. ⛔ Nothing here can
        // tell the two apart -- a travel is a pair of numbers either way -- so
        // the increment is kept by advancing the point the emitting side
        // measures from, below.
        const from = paletteCornerOf(commandPaletteDraggedTo, frame.regions)
        commandPaletteDraggedTo = { x: from.x + action.by.dx, y: from.y + action.by.dy }
        // ⭐ WHAT MAKES THE PARTS TELESCOPE. `PointerPress.followedTo` is where
        // the emitting side measures the NEXT travel from, and this is the one
        // place that knows a travel was in fact applied.
        // ⛔ ADVANCED BY THE TRAVEL RATHER THAN SET TO THE POINTER, which is the
        // same point and one fewer reading of the outside (R7.4): the travel is
        // the pointer less this member, so adding it back lands exactly on the
        // pointer that produced it -- while reading `pointerAt` here would be a
        // second moment, and a release has already dropped the press.
        if (pressed !== null && pressed.followedTo !== undefined) {
          const followed = pressed.followedTo
          pressed = {
            ...pressed,
            followedTo: { x: followed.x + action.by.dx, y: followed.y + action.by.dy },
          }
        }
        return
      }
      case 'chooseRow': {
        // FR-085 (MUST): a row of the `Row Title Panel` was chosen. ⭐ WRITTEN
        // HERE AND NOWHERE ELSE, the same road `moveCommandPalette` takes and
        // for the same reason -- table T-108 has no command, no undo step is
        // pushed, and LY-5 of table T-060 leaves a current value with this
        // layer.
        // ⚠️ WHICH WAY AN EXTENDING PRESS GOES IS READ OFF WHAT IS HELD, never
        // off the drawn row: FR-048 lets a paint be skipped, so a picture is as
        // old as the last one drawn while this value is now.
        const chosen = selectedGroupIds
        if (!action.isExtending) {
          // The plain press, which replaces what was chosen -- SL-2's shape.
          selectedGroupIds = [action.groupId]
        } else if (chosen.includes(action.groupId)) {
          // SL-4's 「1 つずつ増減し」, the letting-go half FR-085 asks for.
          selectedGroupIds = chosen.filter((one) => one !== action.groupId)
        } else {
          selectedGroupIds = [...chosen, action.groupId]
        }
        // FR-042 (MUST) reads this same set -- the band colour (AT-58) and
        // height (AT-59) it puts up are the chosen row's -- and FR-072 decides
        // the panel by the last operation, which this is.
        // @provisional PD-142
        showPropertiesOfChoice()
        return
      }
      case 'chooseResources':
        // IC-63 / IC-64 / IC-65 of table T-109. ⭐ REPLACED WHOLE, which is what
        // 「一覧のすべてを選ぶ」 and 「一覧の選択をすべて解く」 are and what makes
        // FR-099's two-move deletion mean what it says.
        // ⛔ NOT SHOWN IN THE PROPERTIES PANEL: FR-072 speaks of 「選択」, and
        // SL-1 of table T-023c does not admit a resource -- so a roster press is
        // not one of the operations that requirement decides the panel by.
        // @provisional PD-143
        selectedResourceUids = action.uids
        return
      case 'toggleChosenResource': {
        // IC-67 / IC-68 -- one control in two states, which those two rows say
        // themselves (「同じ入口で解く」 / 「同じ入口で選ぶ」). ⚠️ Which way it
        // goes is decided from what is HELD and never from the entry that was
        // drawn, for the reason `chooseRow` gives above.
        // @provisional PD-143
        const chosen = selectedResourceUids
        selectedResourceUids = chosen.includes(action.uid)
          ? chosen.filter((one) => one !== action.uid)
          : [...chosen, action.uid]
        return
      }
      case 'toggleDocumentSettingsProperties':
        // FR-072: the settings entrance. ⭐ 「もう一度同じ入口を押したら直前の
        // 選択物へ戻す」 is the whole of this branch -- pressed while the settings
        // are up it goes back to the subject, and pressed at any other time it
        // brings the settings up.
        // ⛔ THE SUBJECT IS NOT CLEARED ON THE WAY: that requirement (MUST) says
        // 「設定を開いても選択を解除せず」, and `selection` is not touched here
        // either.
        // @provisional PD-144
        propertiesShowing =
          propertiesShowing === 'documentSettings' ? 'selection' : 'documentSettings'
        return
      case 'setDualCursorFollowing':
        // Table T-029a -- DC-1's entry, DC-2's click, DC-4's way out.
        //
        // ⭐ THE SIDE MOVES FIRST AND THE WRITE FOLLOWS. Both halves are the
        // same press, and the order is the one every other branch here keeps:
        // the session's own value is put in force, then the document is
        // written from the frame this press was decided against.
        // ⛔ NOT `changeDocument`'S ROAD, and the question is why: that branch
        // asks FR-032's confirmation of what it is about to write, and no row
        // of table T-234 asks anything of a measuring line. ⚠️ `writeDocument`
        // is still the ONE write path (WS-6), so atomicity is untouched.
        // ⚠️ UN-12 keeps this out of the undo record -- `document-change-plan.ts`
        // is where `setDualCursor` is marked not undoable, and DC-6 is the row
        // it answers to.
        dualCursorFollowing = action.following
        if (action.placed !== null) writeDocument([action.placed], frame)
        return
      case 'toggleAgentApi':
        // IC-20 -- FR-065. ⭐ ONE ENTRANCE BOTH WAYS, which that row words
        // itself. ⚠️ What is shown while it is on is FR-065's other MUST and is
        // the renderer's; this side holds the fact.
        // ⛔ NOT WRITTEN TO `localStorage`: see `sessionOf` for the identifier
        // that is missing and why no key is invented for it.
        // ⭐ THE PUBLIC POINT FOLLOWS THIS, and not the other way round: the
        // watcher `setAgentApiEnabled` wakes is what places the name and takes
        // it away again, which is how FR-028's 「既定では公開しない」 stays true
        // from the second press on.
        setAgentApiEnabled(!isAgentApiEnabled)
        // FR-065 (MUST): 「無効にしても、既に渡した参照は取り消せないことを利用者
        // に示すこと」. ⛔ Raised on the way OFF only -- that sentence is about
        // what disabling does not do, and NT-5 keeps the press itself accepted.
        if (!isAgentApiEnabled) raiseNotice(HANDED_REFERENCE_STANDS_REASON, null)
        return
    }
  }

  /**
   * FR-072: an operation chose something, so the properties panel turns to it
   * and remembers what it was about.
   *
   * ⭐ THE SUBJECT AND NOT THE FIELDS (PD-144). FR-072 (MUST) keeps the previous
   * contents standing when the selection goes away and has a second press of
   * IC-17 return to 「直前の選択物」, so what is kept is WHAT was chosen -- kept
   * fields would go on showing values an edit had already made untrue, and
   * `PropertyField` carries no way to say a value has stopped being current.
   *
   * ⛔ AN EMPTYING CHANGES NEITHER MEMBER, and that is FR-072's own sentence
   * rather than a shortcut: 「選択が解除されたときは、直前に出していた中身を残し、
   * 見出しで『選択なし』と示すこと（MUST）」. Both halves follow from leaving them
   * alone -- the subject standing here IS the 「直前」 that MUST names, and the
   * heading reads 「選択なし」 off a `Selection` that is now empty.
   * ⚠️ WHICH ALSO KEEPS THE MUST NOT BESIDE IT. 「選択を解除しても設定へは移らな
   * いこと（MUST NOT）」: with the settings up, an emptying leaves them up, and
   * nothing here can move to them either.
   *
   * @provisional PD-144
   * @purity non-pure
   */
  function showPropertiesOfChoice(): void {
    if (selection.items.length === 0 && selectedGroupIds.length === 0) return
    propertiesShowing = 'selection'
    propertiesSubject = { selection, groupIds: selectedGroupIds }
  }

  /**
   * Whether this happening owes a frame.
   *
   * ⭐ FR-048 (MUST NOT): 「ポインタに追従する線が 1 本も無く、ほかに描く内容も
   * 変わらないとき、ポインタの移動で描き直してはならない」. ⛔ The judgement below is
   * written on WHAT IS DRAWN and never on whether the pointer moved, which that
   * requirement demands in as many words -- 「判定はポインタではなく描く内容に
   * 置くこと」 -- because a pan and a drag move the pointer AND change the
   * picture, and a test phrased on the pointer would forbid those too.
   * ⚠️ THE EXCEPTION IS A BARE MOVE AND NOTHING ELSE. Every other happening FT-1
   * names still owes a frame unconditionally; NFR-010 forbids widening the
   * triggers, and this narrows one rather than adding any.
   * ⚠️ NOT DRAWING IS NOT THE SAME AS NOT KNOWING: every move is still heard and
   * `pointerAt` still follows it, and so does the rest FT-4's icon hint waits
   * out -- `beginPointerRest` runs on the move whether or not this owes a frame.
   *
   * @purity semi-pure-b
   */
  function owesFrame(
    input: HumanInput,
    before: InputContext,
    partBefore: ScreenPart | null,
    grabBefore: Grabbed | null,
  ): boolean {
    if (input.kind !== 'pointer' || input.phase !== 'move') return true
    // 1. A gesture in flight. The drag, the pan and the marquee all draw
    //    something that follows the pointer, which is why FR-048's own ⚠️ warns
    //    against reading them as the thing it forbids.
    if (pressed !== null) return true
    // 2. Something follows the pointer. FR-048 names the whole set: the guide
    //    cursor (`S-66` of table T-202) and the side of the `Dual Cursor` that
    //    DC-1 of table T-029a has following it -- and while that mode is up,
    //    one side always is.
    if (before.document.documentSettings.guideCursorMode !== GUIDE_CURSOR_NONE) return true
    if (dualCursorFollowing !== null) return true
    // 3. What this happening actually changed, compared and not assumed.
    //    ⭐ The context IS the snapshot of what was held before the three
    //    members ran, so it is the thing they are compared against.
    if (selection !== before.selection) return true
    if (screenState !== before.screenState) return true
    if (held.document !== before.document) return true
    // 4. FR-048's ⚠️ exemption, which is not a hole in the MUST NOT but a list
    //    of things that DO change what is drawn: HF-6's row controls, FR-053's
    //    palette, FR-043's grab slop and the marker FR-013 gives it, EZ-2's
    //    icon hint and FR-037's scrollbar hint all answer to the pointer.
    //    ⭐ Which part it is on may be asked only of the side that drew it
    //    (Chapter 5.3, under table T-065). ⚠️ With no `ScreenWiring` there are
    //    no parts at all, so both sides are null and this one is false.
    if (!isSameScreenPart(partUnderPointer, partBefore)) return true
    // 5. ⭐ AND THE SAME QUESTION ASKED OF THE SCHEDULE ITSELF, which is where
    //    FR-043's grab slop and FR-013's marker are drawn -- two of that same
    //    list. ⛔ IF-9 CANNOT ANSWER FOR THEM: the schedule goes up whole over
    //    IF-1 and nothing in it is an entry the other surface drew, so
    //    `readScreenPartAt` answers `null` at every point of the drawing area
    //    and the comparison above sees no difference anywhere across it.
    //    Table T-023d is the side that can tell one place from another there,
    //    and `grabAtPointer` is where it is asked.
    //    ⛔ NOT A WIDENING OF THE ROSTER. A move that stays on one row of that
    //    table still owes nothing, which is FR-048's MUST NOT; it is the move
    //    that ENTERS a different one that changes what is drawn.
    return !isSameGrab(grabUnderPointer, grabBefore)
  }

  /**
   * IF-9's return direction, spent before the happening that carried it here.
   *
   * ⭐ WHY IT IS COLLECTED ON AN INPUT AND NOT AT THE HEAD OF A FRAME. A person
   * settles a property field by leaving it or by pressing Enter, and both of
   * those ARE happenings that arrive over IF-2 -- so the commit is already
   * standing on the surface by the time this runs, and NFR-010's 「起きたときだけ
   * 走る」 is kept: nothing is polled.
   *
   * ⛔ BEFORE THE THREE MEMBERS OF PI-18 READ THE DOCUMENT, so that the value a
   * person just settled is in the document the press is then translated
   * against. ⚠️ A context of its own is built for it, which is not the second
   * read the note in `receiveInput` warns about: that one forbids the THREE
   * members to be answered about different moments, and this is a different
   * question -- about a field, settled before this happening began.
   *
   * ⛔ AN EMPTY ANSWER IS NOT WRITTEN. `commandFromFieldCommit` answers with
   * nothing where the settled value names no row of table T-108, and an empty
   * write would still push a step onto the undo history (WS-4) for an edit
   * nobody made.
   *
   * @purity non-pure
   */
  function spendFieldCommit(frame: FrameValues): void {
    if (screen === undefined) return
    const commit = screen.surface.readFieldCommit()
    if (commit === null) return
    const commands = commandFromFieldCommit(commit, collectInputContext(frame))
    if (commands.length === 0) return
    // FR-031 (MUST) with UN-3 of table T-027: one property change is ONE step
    // of the undo history, so the whole answer goes over as one bundle.
    writeDocument(commands, frame)
  }

  /**
   * FT-1 of table T-078 -- one happening arrived over IF-2.
   *
   * @purity non-pure
   */
  function receiveInput(input: HumanInput): void {
    const frame = values
    // ⛔ DROPPED WHILE NO FRAME HAS RUN. BO-1 has not settled the size, so
    // there is no frame of reference to read a coordinate against -- and
    // NFR-011 is what holds the first frame back until there is one.
    if (frame === null) return

    spendFieldCommit(frame)

    // ⭐ THE OUTSIDE IS READ ONCE, HERE, BEFORE ANYTHING IS DECIDED (R7.4). Two
    // rules want IF-9's answer for this happening -- CS-2 freezes it onto the
    // press, and FR-048 asks whether the pointer entered a different part -- and
    // a second read further down would be a second moment.
    const partBefore = partUnderPointer
    // ⭐ AND WHERE THE POINTER STOOD ON THE SCHEDULE, taken at the same moment
    // and for the same one reader: FR-048 asks whether the pointer entered a
    // different row of table T-023d as well.
    const grabBefore = grabUnderPointer
    if (input.kind === 'pointer') {
      // FR-018's repeat ends where table T-028 ends the gesture: IN-1 on the
      // release, IN-1a on the pointer lost outside the window.
      // ⛔ FIRST IN THIS BLOCK, AND BEFORE ANY WAY OUT OF IT. NT-8's dismissal
      // below returns early on a release that landed on a telling, and a repeat
      // called off after that line would go on ticking for ever when the hand
      // drifted onto one while the button was still down.
      // ⚠️ The `Esc` of IN-1 is a key happening and cannot arrive here; it is
      // called off beside the press it interrupts, further down.
      if (input.phase === 'up' || input.phase === 'lost') endEntryRepeat()
      // FT-4 of table T-078 -- the rest starts over wherever the pointer has
      // MOVED to.
      // ⛔ JUDGED ON THE POINT AND NOT ON THE KIND OF HAPPENING: EZ-2 of table
      // T-040 asks only that the pointer be ON the icon for the wait, so a
      // press or a release that leaves it exactly where it stood has not
      // interrupted anything. ⚠️ A host reports a `move` for a pointer that has
      // not left its pixel, and reading every one of those as a move would hold
      // the wait open for ever.
      const hasMoved = pointerAt === null || pointerAt.x !== input.x || pointerAt.y !== input.y
      pointerAt = { x: input.x, y: input.y }
      if (hasMoved) beginPointerRest()
      partUnderPointer =
        screen === undefined ? null : screen.surface.readScreenPartAt(input.x, input.y)
      // ⭐ RECORDED BEFORE ANY OF THE THREE MEMBERS IS ASKED. IN-1 settles
      // nothing on the press, so the only thing `commandFromInput` answers for
      // a `down` is whether the tool took the gesture (MK-10) -- and
      // `InputContext.pressed` says in as many words that a caller which
      // leaves it null on the press leaves every entry the surface drew
      // unassigned.
      if (input.phase === 'down') {
        pressed = collectPress(input, frame, partUnderPointer)
        // FR-053: a press on GR-19's band begins a drag, so the corner the
        // palette stands at now is the one an interruption (IN-1) has to put
        // back.
        // ⛔ TAKEN ON THE PRESS AND NOWHERE ELSE. `paletteCornerOf` resolves the
        // default off THIS frame's `Row Area`, so a corner read after the window
        // has moved under an undragged palette would restore a place it never
        // stood at.
        commandPaletteCornerAtPress =
          partUnderPointer?.entry === PALETTE_GRAB_BAND_ENTRY
            ? paletteCornerOf(commandPaletteDraggedTo, frame.regions)
            : null
        // FR-018 (MUST): the hold begins to be measured from the press.
        // ⛔ AFTER `collectPress`, because the entrance this asks about is the
        // one that press recorded -- `pressHeldOnRepeatingEntry` reads no
        // pointer position of its own (CS-2 of table T-066).
        // ⚠️ ASKED FOR EVERY PRESS AND NOT ONLY FOR THE FOUR: the member
        // answers null for every other entrance, so there is one place that
        // knows which four repeat rather than a test spelled here as well.
        beginEntryRepeat()
      }
      // NT-8 of table T-037 (MUST): 「告げた通知を、人がその場で消せること」.
      //
      // ⭐ ANSWERED HERE AND NOT BY THE TRANSLATOR. What a press on this
      // entrance changes is `raisedNotices`, which LY-5 of table T-060 leaves
      // to the shell alone: it is neither a document command nor a screen
      // state the translator holds, and `UF-67` raises into this very list.
      // ⛔ ON THE RELEASE, WHICH IS IN-1 OF TABLE T-028 -- a pointer operation
      // is settled when the button comes up, never when it goes down.
      // ⚠️ THE KEY AND NOT AN INDEX. `Notice.dismissKey` names the telling by
      // its manner and its reason, so a list that has grown or shrunk between
      // the frame drawn and the press cannot put away a different telling than
      // the one under the pointer.
      if (input.phase === 'up' && partUnderPointer?.noticeDismissKey != null) {
        const answered = partUnderPointer.noticeDismissKey
        raisedNotices = raisedNotices.filter((one) => dismissKeyOf(one) !== answered)
        ask()
        return
      }
    }

    // ⭐ R7.4: collected first, then processed. ONE context is built and the
    // same value goes to all three members -- rebuilding it between them would
    // read the clock again (`semi-pure-b`), and the three would then be
    // answering about different moments.
    const context = collectInputContext(frame)
    // IN-4 of table T-028 -- the three levels of the `Esc` ladder that are the
    // shell's, because LY-5 of table T-060 leaves it holding all three: the
    // press in flight, the Dual Cursor mode and the question below.
    // ⛔ ASKED OFF `context` AND BEFORE THE THREE MEMBERS RUN. The other two
    // levels are `screenStateFromInput`'s, so asking after it had moved the
    // state would reckon against a state that has just lost a level and spend
    // two on one press -- and IN-4 allows 1 階層 (MUST).
    const escapeLevel = escapeLevelOf(input, context, asking !== null)
    selection = selectionFromInput(input, context)
    // ⚠️ SK-12 opens the `Export Chooser` (U-54) here and nothing more: what a
    // person then takes on it is a row of table T-024, which this member does
    // not read -- `answerSettledFormat` below is where the choice is spent.
    // ⛔ NOT ASKED AT ALL WHEN THIS PRESS TOOK THE FIRST LEVEL HERE. That member
    // cannot see the question -- `EscapeContext` says why the flag is optional
    // -- so it would answer for the NEXT level down and disarm, or close the
    // surface behind the question, on the same press that dismissed it.
    screenState =
      escapeLevel === 'confirmation' ? screenState : screenStateFromInput(input, context)
    const translated = commandFromInput(input, context)

    // IN-4's FIRST level, spent on the surface U-55 names.
    //
    // ⭐ WHAT AN ABANDONED QUESTION DOES TO THE WRITE IS NOT INVENTED HERE, IT
    // IS WHAT IS LEFT once NT-7 of table T-037 has been read: that row gives
    // the person 「続けるか取りやめるかを選ばせること」 (MUST), so 続ける is
    // something a person CHOOSES, and a press that chose neither cannot be read
    // as having chosen it. ⛔ The write therefore does not land, which is the
    // landing IC-70 already produces -- and the alternative would be a delete
    // carried out on a press that asked for the question to go away.
    // ⚠️ NO ROW SAYS 「`Esc` は取りやめると同じ」 IN AS MANY WORDS. It is the one
    // of NT-7's two answers this press can be, and nothing further is read into
    // it; a ruling that says otherwise moves the `false` below and no more.
    // ⛔ Cleared BEFORE the landing runs, the same order `answerSettledEntry`
    // keeps and for the same reason.
    if (escapeLevel === 'confirmation' && asking !== null) {
      const abandoned = asking
      asking = null
      abandoned.settle(false, frame)
    }
    // DC-4: `Esc` is one of the two ways out of the mode. ⛔ The two lines stay
    // where they were put -- DC-7 (MUST NOT) forbids leaving the mode from
    // clearing them, so nothing here touches `dualCursor`.
    if (escapeLevel === 'dualCursorMode') dualCursorFollowing = null

    // ⛔ THE ORDER IS LOAD-BEARING. The press is dropped AFTER the translator
    // has read it -- a release is decided entirely from the press (CS-2) --
    // and BEFORE the write below, because WS-2 refuses a write while a gesture
    // is in flight (AG-9 of table T-035) and the gesture has in fact ended.
    // ⭐ IN-1's 「中断は `Esc` で行い」 ends one the same way. Without this the
    // press outlives the interruption, the release is still settled from it and
    // the drag is WRITTEN -- and `escapeTarget` would answer 'gesture' for ever
    // after, so IN-4a's MUST could never hand `Esc` back to the browser and
    // FR-071's way out of full screen would be unreachable.
    if (hasEndedGesture(input) || escapeLevel === 'gesture') pressed = null
    // IN-1's 「中断は `Esc` で行い」 -- the third of the three ends FR-018's
    // repeat has, and the only one that arrives on a key rather than a pointer.
    // ⛔ AFTER the press is dropped and not before: `endEntryRepeat` is written
    // to be safe either way, but a repeat outliving the press it is about is
    // the one state this must never be left in.
    if (escapeLevel === 'gesture') endEntryRepeat()

    // FR-053's last sentence on the drag -- an interrupted one (IN-1 of table
    // T-028) puts the palette back where the drag began.
    // ⭐ WRITTEN RATHER THAN LEFT TO THE LINE ABOVE. Dropping the press ends the
    // gesture and nothing more: the travels already applied stand, and the
    // palette would keep the place the finger reached. ⛔ The requirement is
    // about the CORNER, so the corner is stated here.
    // ⭐ TWO HAPPENINGS ARE THE ONE INTERRUPTION, and table T-028 names both:
    // IN-1 gives `Esc` and (MUST NOT) refuses to read leaving the drawing area
    // as one, and IN-1a (MUST) ends a drag whose pointer was lost outside the
    // window AS an interruption -- 「中断として終わらせること」. ⛔ A release is
    // neither: `up` is the moment IN-1 settles the drag ON.
    // ⚠️ BEFORE `carryOutAction`, WHICH COSTS NOTHING: `escapeLevelOf` answers
    // for a key happening alone, and `commandFromInput` answers a lost pointer
    // with no action at all -- so no travel can arrive on either happening.
    const isDragInterrupted =
      escapeLevel === 'gesture' || (input.kind === 'pointer' && input.phase === 'lost')
    if (isDragInterrupted && commandPaletteCornerAtPress !== null) {
      commandPaletteDraggedTo = commandPaletteCornerAtPress
    }
    // ⚠️ Cleared on the same two happenings the press is, and never on its own:
    // a corner kept past the gesture would be spent by the NEXT `Esc`, which is
    // a level IN-4 of table T-028 does not give it.
    if (hasEndedGesture(input) || escapeLevel === 'gesture') commandPaletteCornerAtPress = null

    // FR-032 / FR-038 / OP-3: the six entries this loop answers for itself, and
    // FR-096's format beside them, both read off the press this release settled
    // from (CS-2 of table T-066).
    // ⛔ BEFORE `carryOutAction`: a press spent here is not also an edit, and
    // asking the other way round would let one press do both.
    // ⚠️ NEVER BOTH. A press lands on a row of table T-109 or on a row of table
    // T-024 and not on one of each -- FR-096 (MUST NOT) keeps U-54 free of an
    // entry per format, which is why `ScreenPart` reports the two separately.
    const settledEntry = entrySettledOnRelease(input, context)
    const settledFormat = formatSettledOnRelease(input, context)
    const spent =
      (settledEntry !== null && answerSettledEntry(settledEntry, frame)) ||
      (settledFormat !== null && answerSettledFormat(settledFormat))
    if (!spent) carryOutAction(translated.action, frame)

    // FR-072: 「利用者が選択または設定の入口を操作したとき ... 最後に行われた操作
    // で決める」. A press that moved the drawing area's selection IS one of those
    // operations, and it is the commonest -- SL-2 replaces the selection with
    // one thing and SL-3 takes a rectangle of them, and neither asks for an
    // action of its own, so `carryOutAction` above never hears about them.
    // ⛔ COMPARED BY IDENTITY, which is the comparison PI-18 declares for this
    // member: `selectionFromInput` answers the SAME value it was handed when
    // nothing moved, so a press that changed nothing does not count as an
    // operation here. ⚠️ `context.selection` is what was held before the three
    // members ran, and `owesFrame` compares the same pair for the same reason.
    // @provisional PD-144
    if (selection !== context.selection) showPropertiesOfChoice()

    // OP-3 (MUST NOT): the `Open Chooser` went away without one of its three
    // being taken, so the choice was never made and the read is abandoned.
    // ⛔ THIS IS THE ONLY WAY THE WAIT CAN END WITH NO ANSWER, and it exists
    // because the question stands in S-99g: that row holds one open surface and
    // IN-4 of table T-028 spends the first level of `Esc` on whatever it is
    // holding, so `screenStateFromInput` can close this one without asking.
    // ⚠️ Read AFTER the entry above, which clears both together on a real
    // answer.
    if (openChoosing !== null && screenState.surface !== OPEN_CHOOSER_SURFACE) {
      const abandoned = openChoosing
      openChoosing = null
      abandoned.settle(null)
    }

    // IN-2 of table T-028 -- the shape the pointer now stands on.
    //
    // ⭐ LAST, AND AFTER THE PRESS HAS BEEN DROPPED, because IN-2 asks for the
    // hand 「パン中」 and a release has ended the pan: read any earlier, the
    // release would still find PD-1 in flight and leave the hand behind.
    // ⭐ ASKED FOR EVERY HAPPENING AND NOT ONLY FOR A MOVE -- 「構えているとき」
    // is a state a key press moves (SK-1 of table T-036) while the pointer
    // stands still, and a shape that only followed moves would go on promising
    // the range selection until the person twitched.
    // ⛔ Nothing is asked while no pointer has been heard of: `pointerAt` is
    // null until the first pointer happening, and there is no place to answer
    // about.
    // ⭐ THE HIT TEST IS ASKED HERE, AT THE SAME LATE MOMENT AND FOR THE SAME
    // REASON: the two readers below want the answer for the schedule as it
    // stands once this happening has been spent, and one ask is what R7.4
    // allows them.
    if (pointerAt !== null) {
      grabUnderPointer = grabAtPointer(frame, pointerAt.x, pointerAt.y, partUnderPointer)
      showPointerShape?.(
        pointerShapeAt(frame, pointerAt.x, pointerAt.y, partUnderPointer, grabUnderPointer),
      )
    }

    // FR-052 (MUST) and table T-023d's closing rule for GR-1 / GR-2 -- the
    // picture the held press owes, worked out once this happening has been
    // spent.
    //
    // ⭐ ONE ASSIGNMENT SETS IT AND CLEARS IT, and `pressed` is what decides
    // which: the press has already been dropped above on IN-1's release, on
    // IN-1a's lost pointer and on IN-4's `Esc`, so an interrupted drag loses its
    // picture on the very happening it loses its gesture, and a release loses it
    // on the happening that writes the value for real. ⛔ A second place to
    // clear this would be a second rule about when a gesture ends.
    // ⚠️ FROM `pointerAt` AND NOT FROM `input`: a key happening arriving
    // mid-drag would otherwise blank the picture and put the bar back where the
    // pointer no longer is.
    // ⭐ AFTER `carryOutAction` for the same reason it is after the drop -- the
    // release's write has landed, so the fold below starts at what it wrote.
    // ⚠️ `context` AND `frame` ARE AS OLD AS THIS HAPPENING'S START, the same
    // age `grabAtPointer` above reads them at. One happening can both write and
    // leave a press held -- a wheel zoom mid-drag is the only one that does --
    // and the day this then names is read off the layout from before that zoom.
    // ⭐ It costs one frame and cannot reach the document: the release asks
    // `commandFromInput` again against the context of its own moment.
    previewDocument = previewOfHeldPress(pressed, pointerAt, context, frame)

    // FT-1 owes a frame for every happening the row names, save the one FR-048
    // takes back. ⚠️ `ask` coalesces, so two triggers in one task still paint
    // once.
    if (owesFrame(input, context, partBefore, grabBefore)) ask()
  }

  // BO-5 -- the first frame, which table T-078's note excludes from FT-1.
  // ⚠️ Held back while BO-1 is unsettled; the first resize that settles the
  // size runs it.
  if (settled(environment)) runFrame()

  return {
    /** @purity non-pure */
    holdDocument(call: HeldDocumentCall): void {
      // ⭐ Straight onto the one road, carrying the caller's row and nothing
      // else: FT-2's frame is asked for there, along with WS-1 and WS-2.
      replaceHeldDocument(call)
    },
    /**
     * ⛔ CHANGES NOTHING, which PI-27's factory argument requires: this is
     * asked before the watcher hears the happening. ⚠️ It is therefore the
     * second build of the context for one happening -- see the note at the
     * head of this file for why the two cannot be shared.
     *
     * @purity non-pure
     */
    isBrowserDefaultStopped(input: HumanInput): boolean {
      const frame = values
      // ⛔ Nothing is this tool's before its first frame: MK-10 forbids
      // stopping the browser for a happening the tool did not assign (MUST
      // NOT), and with no frame of reference nothing can be assigned.
      if (frame === null) return false
      const context = collectInputContext(frame)
      // ⛔ ASKED SEPARATELY BECAUSE `commandFromInput` CANNOT SEE THE QUESTION,
      // and this press IS assigned: `receiveInput` dismisses the `Confirmation`
      // with it.
      // ⚠️ Without this the tool would take the press AND leave the browser its
      // default, so an `Esc` that declined a question would ALSO leave full
      // screen -- IN-4a hands the key on only when NOTHING is consumed, and
      // FR-071's way out is the browser's own behaviour.
      if (escapeLevelOf(input, context, asking !== null) === 'confirmation') return true
      return commandFromInput(input, context).isBrowserDefaultStopped
    },
    receiveInput,
    /** @purity non-pure */
    resize(next: FrameEnvironment): void {
      // ⛔ FT-3 is 「画面の寸法が変わったこと」. A resize event that carries the
      // size already in force did not change it, and NFR-010 forbids waking a
      // frame on anything table T-078 does not list (MUST NOT). ⚠️ A browser
      // fires resize for things that leave the window alone.
      const same =
        next.width === environment.width &&
        next.height === environment.height &&
        next.appHeaderHeight === environment.appHeaderHeight &&
        next.scrollbarThickness === environment.scrollbarThickness
      if (same) return
      const wasSettled = settled(environment)
      environment = next
      if (!settled(next)) return
      // The first settled size is BO-5's frame, not FT-3's: table T-077 runs
      // once, and until now it had not.
      if (!wasSettled) runFrame()
      else ask()
    },
    // ⚠️ Both read a value this loop holds and is free to replace, so neither is
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
      ...dialogueSeams,
    }),
    /** @purity non-pure */
    watchAgentApiEnabling(watch: (isEnabled: boolean) => void): void {
      agentApiEnablingWatch = watch
    },
    /** @purity non-pure */
    raiseStartupNotice(reason: StartupNoticeReason): void {
      raiseNotice(reason, null)
    },
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
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
// </generated>
