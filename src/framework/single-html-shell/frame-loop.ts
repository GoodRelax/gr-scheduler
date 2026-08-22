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
// ⚠️ ONE HAPPENING BUILDS THE CONTEXT TWICE, and the two cannot be shared.
// MK-10 is asked BEFORE the watcher hears the happening
// (`isBrowserDefaultStopped`, which PI-27 takes as a factory argument) and the
// rest is decided after it (`receiveInput`), so the two calls arrive at
// different moments -- and on a `down` the second one sees a press the first
// one could not: recording the press is a change, and MK-10's question must
// change nothing.

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import { emptyDialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { DialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import {
  emptyScreenState,
  escapeTarget,
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
import { textOfDay, type CalendarDay } from '../../entity/document-model/schedule/schedule'
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
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  applyDocumentChange,
  type ChangeAudience,
  type DocumentCommand,
  type DocumentHolder,
  type HeldDocument,
  type WriteMoment,
} from '../../use-case/apply-document-change/apply-document-change'
import {
  NOT_STORED_ZOOM_BOUNDS,
  type SettingsLimits,
} from '../../use-case/edit-document/edit-document'
import { redoEdit } from '../../use-case/redo-edit/redo-edit'
import { undoEdit } from '../../use-case/undo-edit/undo-edit'
import {
  commandFromInput,
  screenStateFromInput,
  selectionFromInput,
  NOT_STORED_ZOOM_STEP,
  type HumanInput,
  type InputAction,
  type InputContext,
  type PointerInput,
  type PointerPress,
} from '../../adapter/input-command-translator/input-command-translator'
import {
  screenViewFromRegions,
  type AutosaveStatus,
  type DisplayLanguage,
  type ScreenPart,
  type ScreenSession,
  type ScreenSurface,
} from '../../adapter/screen-renderer/screen-renderer'
import { svgFromSchedule, type SvgSurface } from '../../adapter/svg-renderer/svg-renderer'

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
}

export interface FrameLoop {
  /** FT-2: the current value was replaced, so a frame is owed. */
  replaceDocument(next: Document): void
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
  maxTotalSize: NOT_STORED_LIMITS['S-95'] * BYTES_PER_MEGABYTE,
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
 * What this side knows about the moment of a write (WS-2 of table T-067).
 *
 * ⭐ `gestureInFlight` is false because of the ORDER `receiveInput` keeps: the
 * press a gesture began with is dropped as soon as the translator has read it
 * and before any write is asked for, so AG-9's 「身振りの最中」 has in fact
 * ended by the time this is handed over.
 * ⚠️ A key or a wheel arriving while a press is still held would say the same
 * and would not be right. Nothing reaches the write path that way today -- the
 * rule under table T-023d refuses a wheel mid-drag -- but the shape of this
 * value is what would have to change if one ever did.
 * ⛔ `editingInPlace` is false for the reason `isTextEntryUnsettled` is: no
 * in-place entry exists in this build.
 * ⚠️ `deliveringNotices` is only what this side knows. WS-7's own window is
 * owned by `applyDocumentChange`, which reads its flag beside this one.
 */
const WRITE_MOMENT: WriteMoment = {
  gestureInFlight: false,
  editingInPlace: false,
  deliveringNotices: false,
}

/**
 * WS-7's audience.
 *
 * STOP -- ⛔ THERE IS NOBODY TO TELL IN THIS BUILD. AG-6 of table T-035 hands a
 * settled change to the watchers of the `Agent API`, FR-066 puts that API up
 * only while it is enabled, and the record that enables it (S-99b of table
 * T-206) has no owner anywhere in `src/` --
 * `local-storage-document-store.ts` says so in as many words.
 * ⛔ The member is present and empty rather than absent: WS-7 runs on every
 * accepted write and `applyDocumentChange` opens its refusal window around this
 * call, so leaving it out would change the write path instead of recording an
 * absence.
 */
const NOBODY_TO_TELL: ChangeAudience = {
  /** @purity non-pure */
  deliver(): void {},
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
 * What the shell answers about this reading session (`ScreenSession`, PI-37).
 *
 * ⭐ Every member is either a measurement only this layer can make or a value
 * table T-206 keeps out of the document, which is why LY-5 of table T-060
 * leaves them here.
 *
 * ⛔ TWO OF THEM WAIT ON FT-4 of table T-078 -- 「時間が来たこと」, which that
 * table leaves to the shell to measure and which this change does not wire.
 * `pointerRestedMs` is an elapsed time, and `iconUnderPointer` is what EZ-2 of
 * table T-040 shows once that time has passed, so neither can be answered until
 * there is a clock: 0 and `null` say that no rest has been measured.
 * ⚠️ `pointer` no longer waits on anything -- FT-1 is wired, and the caller
 * hands in the place the last pointer happening was reported from.
 *
 * ⛔ `selectedGroupIds` (PD-142) and `selectedResourceUids` (PD-143) stay empty
 * for a different reason: FR-085's row selection is made in the `Row Title
 * Panel`, which the note under table T-023a puts outside the decision order
 * `commandFromInput` applies, so no happening it reads names one.
 * `propertiesShowing` and `propertiesSubject` (PD-144) stay null because
 * nothing holds the panel's state -- `screen-renderer.ts` records that FR-072's
 * rule has no owner, which is why `openPropertiesPanel` reaches a STOP below.
 *
 * @purity pure
 */
function sessionOf(
  held: Document,
  regions: ScreenRegions,
  layout: ScheduleLayout,
  language: DisplayLanguage,
  pointer: { readonly x: number; readonly y: number } | null,
): ScreenSession {
  return {
    language,
    autosave: autosaveAtStartup(held),
    // FR-065 / S-99b: the record that turns the `Agent API` on is kept per
    // document in `localStorage`, and ⛔ nothing in `src/` owns those rows yet
    // (`local-storage-document-store.ts` says so in as many words). No record
    // is 「not enabled」, which is the truth about this build.
    isAgentApiEnabled: false,
    pointer,
    pointerRestedMs: 0,
    iconUnderPointer: null,
    // STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: where the floating palette
    // stands before anyone has dragged it (FR-053). `command-palette.ts`
    // records the same absence -- neither table T-203 nor table T-206 has a row
    // for the place. ⚠️ The `Row Area`'s own corner is used rather than a pair
    // of numbers written here, so nothing is invented: U-50 is a rectangle the
    // specification does hold, and SC-6 keeps the palette off the schedule's
    // scrolling anyway.
    commandPaletteAt: { x: regions.rowArea.x, y: regions.rowArea.y },
    selectedGroupIds: [],
    selectedResourceUids: [],
    propertiesShowing: null,
    propertiesSubject: null,
    // FR-076's notices and NT-7's question are raised by the paths that would
    // report a fault, and none of those paths runs in this build.
    notices: [],
    confirmation: null,
    // SC-1 (MUST): the row titles keep step with the body vertically and do not
    // move sideways, so each row's band is this frame's own `RowPlacement`
    // taken across the width `regionsFromScreen` gave the panel. ⛔ Not
    // measured a second time -- ADR-001 has the layout computed once, and SC-1
    // means the panel has to use those very numbers.
    rowBoxes: layout.rows.map((row) => ({
      groupId: row.groupId,
      box: {
        x: regions.rowTitlePanel.x,
        y: row.y,
        width: regions.rowTitlePanel.width,
        height: row.height,
      },
    })),
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
 * ⚠️ Runs table T-068 at most twice, which is what the rule after that table
 * allows: once to measure, once at the chosen zoom. ⛔ A third pass is
 * forbidden -- the level of detail can oscillate and the loop would not be
 * guaranteed to end.
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

  // Where the fit starts from: the earliest planned start, and the first row in
  // the document's own order. Nothing in table T-064 publishes this, so it is
  // decided here -- and it is a view, not a stored value.
  //
  // ⛔ NOT the earliest day anything is drawn on. An `actualStart` before the
  // plan's start is drawn left of this origin (OC-5 of table T-038 counts it,
  // and LC-7 now measures it), so FR-055's fit sizes it in but this anchor
  // leaves it behind the Row Header panel -- the very harm FR-055's RATIONALE
  // names. ⚠️ Anchoring on the actual instead is not obviously right either:
  // OC-6 keeps the below-laid actual out of the width, so the zoom half and the
  // position half of FR-055 would then measure different sets. Settling it
  // takes a change request, not a guess here.
  const starts = held.schedule.tasks
    .map((one) => one.start)
    .filter((one): one is string => one !== null)
    .sort()
  const firstRow = [...held.schedule.taskGroups].sort((a, b) => a.order - b.order)[0]
  const anchored: DocumentSettings = {
    ...stored,
    scrollDate: starts[0] ?? held.schedule.project.startDate,
    scrollGroupId: firstRow === undefined ? stored.scrollGroupId : firstRow.id,
  }

  const measured = layoutFromSchedule(held.schedule, anchored, regions)
  const fitted = fitZoom(measured, anchored, regions)
  return { ...anchored, zoomX: fitted.zoomX, zoomY: fitted.zoomY }
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
 * they answered. `screenStateFromInput` has already consumed the two levels
 * that are ITS to consume -- the open surface and what is armed -- so a second
 * reckoning off the new state would take two levels for one press, and IN-4
 * allows 1 阶層 (MUST).
 * ⭐ THE OTHER TWO LEVELS ARE THE SHELL'S, because both are current values the
 * Framework holds (LY-5 of table T-060): the press in flight and the Dual
 * Cursor mode. `screen-state.ts` says so where `EscapeContext` is declared, and
 * that is the whole reason the seam takes one.
 *
 * @purity pure
 */
function escapeLevelOf(input: HumanInput, context: InputContext): EscapeTarget | null {
  if (input.kind !== 'key' || input.key !== ESCAPE_KEY) return null
  return escapeTarget(context.screenState, {
    gestureInFlight: context.pressed !== null,
    dualCursorMode: context.isDualCursorMode,
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
 * ADR-001 -- the screen rectangles, the layout and the geometry are computed
 * ONCE at the head of a frame and handed out.
 *
 * ⚠️ Four paths need the layout, and MN-6 measured what happens without this:
 * table T-068's eleven stages run four times for one pointer move, which does
 * not fit the budget NFR-002 and NFR-003 set.
 *
 * @purity non-pure
 */
export function frameLoop(
  surface: SvgSurface,
  first: Document,
  env: FrameEnvironment,
  screen?: ScreenWiring,
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
  // STOP -- ⛔ NOTHING TURNS THIS ON. Table T-029a's Dual Cursor mode is
  // written by `setDualCursor` (CM-60), whose one entrance is IC-45 of table
  // T-109 -- and `input-command-translator.ts` records that IC-45 cannot be
  // written at all, because IV-13 demands both dates at once and one press
  // carries one. ⚠️ Held as a value of the loop rather than written as a
  // literal where the context is built, so that whoever closes IC-45 has the
  // one place to set it from.
  let isDualCursorMode = false
  // ⛔ Cannot change in this build, and is held for the same reason
  // `screenState` is: the only thing that moves it is `logWithMessage` (PI-33),
  // which sits behind FT-5 of table T-078 and is not wired.
  const dialogueLog: DialogueLog = emptyDialogueLog()

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

  // CA-2: invalidation happens at the head of a frame, and nothing is rebuilt
  // again for the rest of it. NFR-010 means a frame with no trigger never runs
  // at all, so there is no idle path to guard against.
  //
  // @purity non-pure
  function runFrame(): void {
    owed = false
    // CS-1 of table T-066: the frozen copy this frame is drawn from, taken
    // once at its head.
    const document = held.document
    const stored = document.documentSettings
    const environmentForRegions: ScreenEnvironment = {
      width: environment.width,
      height: environment.height,
      appHeaderHeight: environment.appHeaderHeight,
      scrollbarThickness: environment.scrollbarThickness,
    }
    // BO-1, then BO-3, then BO-4, in the order table T-077 fixes (MUST).
    const regions = regionsFromScreen(environmentForRegions, stored)
    const settings = viewSettings(document, stored, regions)
    const layout = layoutFromSchedule(document.schedule, settings, regions)
    const geometry = geometryFromLayout(document.schedule, settings, layout, regions)
    values = { regions, layout, geometry }
    surface.showSvg(
      svgFromSchedule(document.schedule, settings, layout, geometry, regions, selection),
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
        sessionOf(document, regions, layout, screen.language, pointerAt),
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

  // ---- FT-1 of table T-078 ------------------------------------------------

  /**
   * CS-2 of table T-066 -- what the gesture is about, frozen at the press.
   *
   * ⭐ `on` IS HANDED IN rather than read here, which is what keeps ONE reading
   * of IF-9 per happening (R7.4): `receiveInput` asks the surface once, and both
   * this and FR-048's judgement are settled from that single answer. ⚠️ Asking
   * again here would be a second moment, and CS-2 wants the moment of the press.
   *
   * @purity pure
   */
  function collectPress(at: PointerInput, frame: FrameValues, on: ScreenPart | null): PointerPress {
    // ⭐ NO HIT WHEN THE SURFACE ANSWERED. The note under table T-023a limits
    // that table's decision order to the schedule's drawing area (MUST), and
    // the parts drawn over it hold no rectangle in `ScreenRegions` -- so a
    // press the surface claimed was not a press on the schedule at all.
    const hit = on === null ? itemAtPointer(frame.geometry, at.x, at.y, POINTER_SLOP) : null
    return { at, hit, on }
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
      pressed,
      // STOP -- ⛔ NO IN-PLACE ENTRY EXISTS IN THIS BUILD. IN-5a's state is
      // 「編集入力の確定前」, which only the field `editInPlace` opens can be
      // in, and that action has no owner here (`carryOutAction` records the same
      // absence). So nothing can be unsettled, and saying so is a fact rather
      // than a guess.
      isTextEntryUnsettled: false,
      isDualCursorMode,
      today: readToday(),
      // AT-51 is a UUID, and minting one is not a pure act -- which is why the
      // translator is handed the identifier instead of making it. ⚠️ One is
      // minted per context and therefore twice per happening; it is read only
      // where FR-001 has to make a row, so an unused one costs nothing.
      newGroupId: crypto.randomUUID(),
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
    const stored = held.document.documentSettings
    const settingsLimits: SettingsLimits = {
      zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
      zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
      // ⭐ The sum `edit-document-settings.ts` spells on this member: this
      // frame's own `Row Area` with the two panel widths added back on.
      // ⛔ NOT rebuilt from a window width -- the copy that did dropped
      // FR-052's scrollbar term, and FR-052 counts it.
      rowAreaWidthWithoutPanels:
        frame.regions.rowArea.width + stored.rowTitlePanelWidth + stored.propertyPanelWidth,
    }
    const outcome = applyDocumentChange(
      {
        commands,
        // WS-1 matches this against the stamp the document carries now. It is
        // the one just read, so it matches -- and it is passed rather than
        // skipped because AG-2 gives the `Agent API` the same gate through the
        // same argument, and one path may not have a weaker one.
        readStamp: held.document.documentStamp,
        moment: WRITE_MOMENT,
        historyLimits: HISTORY_LIMITS,
        settingsLimits,
        editedBy: EDITED_BY_SCREEN,
        updatedUtc: readInstantOfWrite(),
      },
      holder,
      NOBODY_TO_TELL,
    )
    if (outcome.accepted) return
    // STOP -- ⛔ NOTHING CARRIES A REFUSAL TO THE PERSON. It is neither thrown
    // nor swallowed: FR-028 makes a refusal a VALUE, and `outcome.refusal`
    // names the step of table T-067 that turned the write away. Where it
    // should surface is FR-076's notices -- `ScreenSession.notices`, which has
    // no owner in this build (`sessionOf` above records the same absence).
    // ⚠️ Composing a message here would put a second reading of table T-067 on
    // the screen, so the refusal travels no further than this call today.
  }

  /**
   * What one happening was assigned to (table T-023 and table T-036, read by
   * `commandFromInput`).
   *
   * @purity non-pure
   */
  function carryOutAction(action: InputAction | null, frame: FrameValues): void {
    // MK-12: a combination this tool assigns nothing to produces nothing.
    if (action === null) return
    switch (action.kind) {
      case 'changeDocument':
        writeDocument(action.commands, frame)
        return
      case 'undoEdit': {
        // ⛔ NOT THROUGH THE ONE WRITE PATH, and `undo-edit.ts` records why in
        // its own header: table T-108 holds no command that restores a whole
        // document, so `applyDocumentChange` (PI-8) publishes no entry that
        // commits one computed elsewhere. FR-031 still requires the undo to
        // take effect, so the pair is replaced here -- and MS-1 of table T-042
        // calls that the second entrance it forbids. ⛔ Closing it is a change
        // to ApplyDocumentChange, which this change does not make.
        const outcome = undoEdit(held)
        if (outcome.undone) held = outcome.next
        return
      }
      case 'redoEdit': {
        // ⛔ The same STOP, recorded in `redo-edit.ts`'s own header.
        const outcome = redoEdit(held)
        if (outcome.redone) held = outcome.next
        return
      }
      case 'copySelection':
      case 'pasteClipboard':
        // STOP -- ⛔ NO CLIPBOARD SEAM IS WIRED. SK-4 and SK-5 belong to
        // ClipboardGateway (PI-24 of table T-064), and nothing in this build
        // builds one or hands it to this loop. ⚠️ Doing nothing here is not
        // the behaviour: it is the absence of it.
        return
      case 'openDocumentFile':
      case 'saveDocumentFile':
        // STOP -- ⛔ NO FILE GATEWAY IS WIRED. SK-10 and SK-11 belong to
        // FileGateway (PI-22), which nothing in this build constructs -- the
        // same absence BO-2 already records, where `chooseStartupDocument` is
        // handed 「none」 for the three ranks a gateway would fill.
        return
      case 'settleTextEntry':
      case 'editInPlace':
        // STOP -- ⛔ NO IN-PLACE EDITOR EXISTS. SK-19, SK-9 and MK-13 open or
        // settle a field that nothing in this build draws, which is the same
        // absence `isTextEntryUnsettled` records above.
        return
      case 'openPropertiesPanel':
        // STOP -- ⛔ NOTHING HOLDS THE PANEL'S STATE. `ScreenSession`'s
        // `propertiesShowing` and `propertiesSubject` are the shell's (PD-144)
        // and `screen-renderer.ts` records that FR-072's rule -- which of the
        // two things the panel shows -- has no owner in any table.
        return
    }
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
   * `pointerAt` still follows it, because FT-4's icon hint will need them.
   *
   * @purity semi-pure-b
   */
  function owesFrame(
    input: HumanInput,
    before: InputContext,
    partBefore: ScreenPart | null,
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
    if (isDualCursorMode) return true
    // 3. What this happening actually changed, compared and not assumed.
    //    ⭐ The context IS the snapshot of what was held before the three
    //    members ran, so it is the thing they are compared against.
    if (selection !== before.selection) return true
    if (screenState !== before.screenState) return true
    if (held.document !== before.document) return true
    // 4. FR-048's ⚠️ exemption, which is not a hole in the MUST NOT but a list
    //    of things that DO change what is drawn: HF-6's row controls, FR-053's
    //    palette, FR-043's grab slop and EZ-2's icon hint all answer to the
    //    pointer. ⭐ Which part it is on may be asked only of the side that drew
    //    it (Chapter 5.3, under table T-065). ⚠️ With no `ScreenWiring` there
    //    are no parts at all, so both sides are null and this is false -- which
    //    is what makes a hover over a bare schedule draw nothing.
    return !isSameScreenPart(partUnderPointer, partBefore)
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

    // ⭐ THE OUTSIDE IS READ ONCE, HERE, BEFORE ANYTHING IS DECIDED (R7.4). Two
    // rules want IF-9's answer for this happening -- CS-2 freezes it onto the
    // press, and FR-048 asks whether the pointer entered a different part -- and
    // a second read further down would be a second moment.
    const partBefore = partUnderPointer
    if (input.kind === 'pointer') {
      pointerAt = { x: input.x, y: input.y }
      partUnderPointer =
        screen === undefined ? null : screen.surface.readScreenPartAt(input.x, input.y)
      // ⭐ RECORDED BEFORE ANY OF THE THREE MEMBERS IS ASKED. IN-1 settles
      // nothing on the press, so the only thing `commandFromInput` answers for
      // a `down` is whether the tool took the gesture (MK-10) -- and
      // `InputContext.pressed` says in as many words that a caller which
      // leaves it null on the press leaves every entry the surface drew
      // unassigned.
      if (input.phase === 'down') pressed = collectPress(input, frame, partUnderPointer)
    }

    // ⭐ R7.4: collected first, then processed. ONE context is built and the
    // same value goes to all three members -- rebuilding it between them would
    // read the clock again (`semi-pure-b`), and the three would then be
    // answering about different moments.
    const context = collectInputContext(frame)
    selection = selectionFromInput(input, context)
    // ⚠️ SK-12 opens the `Export Chooser` (U-54) here, and nothing carries the
    // export out: ImageExporter (PI-21) is not built in this build either. The
    // surface going up is the whole of what happens.
    screenState = screenStateFromInput(input, context)
    const translated = commandFromInput(input, context)

    // IN-4 of table T-028 -- the two levels of the `Esc` ladder that are the
    // shell's, because LY-5 of table T-060 leaves it holding both of them.
    // ⛔ Read off `context`, which is the state the three members were handed:
    // the two levels above these are `screenStateFromInput`'s and it may have
    // just consumed one, so asking again off the new state would spend two
    // levels on one press.
    const escapeLevel = escapeLevelOf(input, context)
    // DC-4: `Esc` is one of the two ways out of the mode.
    if (escapeLevel === 'dualCursorMode') isDualCursorMode = false

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

    carryOutAction(translated.action, frame)

    // FT-1 owes a frame for every happening the row names, save the one FR-048
    // takes back. ⚠️ `ask` coalesces, so two triggers in one task still paint
    // once.
    if (owesFrame(input, context, partBefore)) ask()
  }

  // BO-5 -- the first frame, which table T-078's note excludes from FT-1.
  // ⚠️ Held back while BO-1 is unsettled; the first resize that settles the
  // size runs it.
  if (settled(environment)) runFrame()

  return {
    /** @purity non-pure */
    replaceDocument(next: Document): void {
      // ⚠️ The history is carried across rather than emptied. FT-2 is the
      // current value being replaced, and FR-031 gives no rule that a
      // replacement discards what was undoable; WS-6 is the path that replaces
      // both together, and this one is not it.
      held = { document: next, history: held.history }
      if (settled(environment)) ask()
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
      return commandFromInput(input, collectInputContext(frame)).isBrowserDefaultStopped
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
  }
}
