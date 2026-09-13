// InputCommandTranslator -- public entry of this folder.
//
// @unit      UF-30   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-18
//
// The signature of what this file publishes is owned here, not in the
// specification. Chapter 6.1 owns the boundary values.
//
// ⚠️ PART of this file is generated. The marked region at the bottom -- search
// for NOT_STORED_ZOOM_STEP -- comes from docs/spec/_source/settings.json
// (table T-206's S-96, which names S-53 of table T-201) and is overwritten by
// `npm run gen`; `npm run gen:check` fails if it has drifted. Everything above
// the marker is hand written. Do not edit by hand inside that region: edit the
// manuscript instead.
// ⛔ This note does NOT quote the opening marker itself -- writing it in a
// comment makes the generator treat the comment as the region and inject the
// block into the middle of it. The marker must occur exactly once per file.
//
// Three pure functions, not a listener: UF-30 is `pure` (table T-075) and LY-5
// of table T-060 leaves current values with the Framework, so everything that
// must survive from a press to its release arrives in `InputContext`.
//
// What "nothing" is, per member (MK-12, IN-4a):
//
//     commandFromInput      `action: null`. Not an empty command list: an empty
//                           write would still push an undo step (WS-4).
//     selectionFromInput    the SAME selection value, compared by identity
//                           (UN-9 keeps selection out of the undo record).
//     screenStateFromInput  the SAME state value (LY-1 replaces it whole).
//
// Design choices whose reasons live on the declarations:
//
//   1. `commandFromInput` answers a record, not a command, because MK-10's
//      browser-default decision is keyed on assignment -- see `TranslatedInput`.
//   2. `InputAction` is wider than `DocumentCommand`, and `changeDocument`
//      carries a list -- see `InputAction`.
//   3. The press, with its hit, surface part and table T-023a row, arrives in
//      the context -- see `PointerPress`.
//
// Where a row is missing, a STOP note names it and the member stays unwritten.

import type { Document } from '../../entity/document-model/document/document'
import {
  escapeTarget,
  screenStateWithArmed,
  screenStateWithFullScreen,
  screenStateWithPalette,
  screenStateWithSurface,
  screenStateWithWatermark,
  type Armed,
  type DualCursorSide,
  type EscapeContext,
  type ScreenState,
} from '../../entity/document-model/screen-state/screen-state'
import {
  COLUMN_SHAPES,
  dateFromWorkingDays,
  dayOf,
  planActualState,
  taskByUid,
  textOfDay,
  workingCalendarOf,
  workingDaysBetween,
  type CalendarDay,
  type Schedule,
  type Task,
  type TaskGroup,
} from '../../entity/document-model/schedule/schedule'
import {
  selectionOfAll,
  selectionWith,
  selectionWithout,
  emptySelection,
  isSelected,
  type ItemRef,
  type Selection,
} from '../../entity/document-model/selection/selection'
import {
  dependencyEndAtPointer,
  itemsInMarquee,
  type Hit,
  type Item,
} from '../../entity/layout-engine/item-hit-area/item-hit-area'
import type { ScheduleGeometry } from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  dateAtX,
  fitZoom,
  groupDepthLimit,
  groupDepthThresholdOf,
  rowPlacesAtZoomY,
  xFromDay,
  type RowPlacement,
  type ScheduleLayout,
  type TaskPlacement,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionAtPointer,
  type ScreenRect,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { FieldCommit, ScreenPart } from '../screen-renderer/screen-renderer'
// A value import, not only a type: HF-14 (MUST NOT) keeps the default row name
// out of the specification, so it is read from its one home rather than spelled.
import { DEFAULT_ROW_NAME } from '../../use-case/edit-document/edit-document'
import type {
  DocumentCommand,
  TaskMilestoneGlyph,
  TaskShapeKind,
} from '../../use-case/edit-document/edit-document'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  WheelInput,
} from './input-source'

export type {
  HumanInput,
  InputModifiers,
  InputSource,
  InputWatcher,
  KeyInput,
  PointerButton,
  PointerInput,
  PointerPhase,
  WheelInput,
} from './input-source'

// ---------------------------------------------------------------- context ---

/**
 * The row of table T-023a a press falls on.
 *
 * A row id only: table T-023a has no English column, so the id is the one join.
 */
export type PressRow = 'PTD-1' | 'PTD-2' | 'PTD-3' | 'PTD-4' | 'PTD-4a' | 'PTD-5'

/**
 * Which `Scrollbars` (U-21) axis a gesture is on -- GR-21 of table T-023d.
 *
 * Derived from `ScreenPart.scrollbarAxis` so the pair is not decided in a third
 * place (rule 03 section 1).
 */
type ScrollbarAxis = NonNullable<ScreenPart['scrollbarAxis']>

/**
 * Which of HF-15's two moves a held row is making (table T-051).
 *
 * Named by what they change rather than `x` / `y`, so no one has to remember
 * which hand direction maps to which.
 */
export type RowGrabAxis = 'position' | 'depth'

/**
 * The press a gesture began with, as the Framework recorded it.
 *
 * Every member but the last two is the moment of the press: IN-1 settles on
 * release, and CS-2 reads the release against the state at the press.
 */
export interface PointerPress {
  /** The `down` happening, unchanged. */
  readonly at: PointerInput
  /**
   * What `itemAtPointer` (PI-7) answered at the press, or null.
   *
   * Resolved by the caller: table T-023a decides first, so PTD-1 and PTD-2 never
   * ask for a hit, and the shell already holds the frame's geometry (ADR-001).
   * ⛔ The caller must also pick the reading by `at.clickCount`: asking the
   * plain-press reading on a second click puts the name label out of MK-13's
   * reach (table T-023d closing rule).
   */
  readonly hit: Hit | null
  /**
   * What the screen surface had drawn where the press landed, or `null` where
   * the schedule was exposed.
   *
   * Asked of `ScreenSurface.readScreenPartAt` (IF-9), since only the drawing
   * side may compute that rectangle (Chapter 5.3, under table T-065); resolved at
   * the press for CS-2's reason, so a palette dragged away since does not change
   * the gesture.
   * ⛔ `null` is what admits table T-023a: the palette, surfaces, notices and
   * dialogue field float over the drawing area with no rectangle in
   * `ScreenRegions` (PI-35), so `regionAtPointer` alone would answer `rowArea`.
   */
  readonly on: ScreenPart | null
  /**
   * Which row of table T-023a this press began, from `pressRowOf` at the press.
   *
   * Carried because AG-9 of table T-035 spares the pan (PTD-1) and the range
   * selection (PTD-5), and the party answering AG-9 holds only the press; it may
   * not read table T-023a itself (R2.7).
   * ⚠️ Read `on` first: a press the surface answered for is none of the six
   * gestures whatever this row says, and may change the document through
   * `commandFromEntry`. `commandFromInput` takes that branch first; AG-9 must too.
   */
  readonly pressRow: PressRow
  /**
   * Where the pointer stood when the caller last applied a `moveCommandPalette`
   * for this gesture (FR-053's following).
   *
   * Needed because `moveCommandPalette` answers a distance: each move must be
   * the travel since the last applied one, or the palette runs away by the sum.
   * A pure function cannot remember it (UF-30, LY-5).
   * ⚠️ Absent means the caller does not follow: moves report nothing and the
   * release reports the whole travel (IN-1). Never read absent as zero.
   * `frame-loop.ts` fills it on every press (`collectPress`); optional because
   * presses built outside the shell do not carry it.
   */
  readonly followedTo?: { readonly x: number; readonly y: number }
  /**
   * Which axis GR-20's grab settled on, or `null` while none.
   *
   * HF-15 fixes the axis at the first travel past `S-208` until release; two
   * points cannot recover that (10px right then 100px down is depth by the rule,
   * position by the total), so the caller that applied `rowGrabFollow` writes it
   * back here, as with `followedTo`.
   * ⚠️ Absent means the caller does not follow: nothing on a move, and the
   * release reads the axis off the whole travel. ⛔ Never default to
   * `'position'` -- a forgetful caller would move rows on the axis this build
   * cannot draw. `frame-loop.ts` fills it with `null` on every press.
   */
  readonly rowGrabAxis?: RowGrabAxis | null
}

/**
 * Everything the three functions read that is not the happening itself.
 *
 * An argument because UF-30 is `pure` and LY-5 of table T-060 leaves current
 * values with the Framework.
 */
export interface InputContext {
  /** The frozen copy CS-1 collects at the head of the frame. */
  readonly document: Document
  /** ADR-001's three, computed once for this frame. */
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
  readonly regions: ScreenRegions
  /** S-99e / S-99f / S-99g / S-144 and what is armed (table T-023b). */
  readonly screenState: ScreenState
  /** UN-9 keeps this out of the document, so it travels beside it. */
  readonly selection: Selection
  /**
   * S-53. Handed in rather than typed: no generator brings it into `src/`
   * (rule 03 section 1).
   */
  readonly zoomStep: number
  /**
   * S-54 and S-55 (through S-97 / S-98), handed in for `zoomStep`'s reason.
   *
   * FR-055's fit must see FR-016's range, since CM-71 clamps what it writes and
   * the fit would otherwise draw a picture it never measured.
   */
  readonly zoomMin: number
  readonly zoomMax: number
  /**
   * Whether the picture stands at the document's own zoom (`S-73` / `S-74`)
   * rather than at FR-055's fit -- OP-10 of table T-024a, answered by the side
   * that drew it.
   *
   * ⛔ Not derivable here: OP-10 excepts a `BT-4` startup template, and nothing
   * reachable records where the document came from. A copied condition that
   * misses the exception makes the first IC-12 press zoom in to something smaller.
   * ⚠️ Absent falls back to "a document naming a place is at its own zoom",
   * wrong only for the template. `collectInputContext` fills it every frame.
   */
  readonly isPictureAtStoredZoom?: boolean
  /**
   * The height of HF-1's lattice of row controls, which LF-3 of table T-221
   * makes a floor under a row's band.
   *
   * Measured where the lattice is drawn: HF-19 and LF-3 keep the number out of
   * the manuscript. It does not follow the reader's font size (HF-19).
   * ⚠️ Used by FR-055's fit only; absent reads as no floor.
   */
  readonly rowControlsHeightPx?: number
  /**
   * The gesture in flight, or null while none is.
   *
   * ⚠️ On a `down` this IS that press: the caller records it before asking any
   * member, because the only answer for a `down` is whether the tool took the
   * gesture (MK-10). ⛔ Left null on the press, every drawn entry reads as
   * unassigned.
   */
  readonly pressed: PointerPress | null
  /**
   * IN-5a: text is being typed and has not been settled -- the state AG-9 of
   * table T-035 names, reaching the write path as `WriteMoment.editingInPlace`.
   */
  readonly isTextEntryUnsettled: boolean
  /**
   * Table T-023's closing rule -- whether a surface stands over the schedule.
   *
   * Handed in because half the answer is the question NT-7 holds in the shell
   * (LY-5), which this side cannot see. One truth value, not which surface: the
   * rule names none, and naming them would duplicate table T-103.
   */
  readonly isSurfaceStanding: boolean
  /**
   * Table T-029a's Dual Cursor mode: which date follows the pointer, or `null`
   * while the mode is not up.
   *
   * One field, not a boolean beside a side: DC-1 and DC-2 admit no "up with no
   * side following" state.
   * Not in `documentSettings`: S-65 holds the dates, and DC-8 (MUST NOT) keeps
   * the following mark out of an export. PTD-2 turns hit testing off while this
   * is non-null.
   */
  readonly dualCursorFollowing: DualCursorSide | null
  /**
   * Today, spelled as a date column is (`textOfDay`).
   *
   * ⛔ The clock is not read here (CS-1, LY-5); FR-046's SK-20 needs it.
   */
  readonly today: string
  /**
   * The id for the row FR-001 creates when a drag points at no row.
   *
   * Minted outside because AT-51 is a UUID, as with `createTask`'s `groupId`.
   */
  readonly newGroupId: string
  /**
   * The id for the `CommentBox` AR-5 of table T-023b places (AT-110 is a UUID).
   *
   * ⛔ Not optional: a placement with no id never reaches the document, and
   * fails silently.
   */
  readonly newCommentBoxId: string
  /**
   * The id for the `HighlightBox` AR-6 of table T-023b places (AT-116 is a
   * UUID). Not optional, for the same reason.
   */
  readonly newHighlightBoxId: string
  /**
   * S-99h of table T-206, or `undefined` where the caller carried no answer.
   *
   * Lets `commandFromKey` assign SK-19's second-stage plain `Enter` only while
   * the panel shows; assigning every plain `Enter` would make MK-10 stop the
   * browser default and take keyboard activation away from every entry.
   * ⛔ Optional so existing `InputContext` literals keep compiling, and
   * forgetting it is silent: `undefined` leaves the second stage unraised. A caller that holds the panel must pass it (`frame-loop.ts`
   * does, from `propertiesShowingNow()`).
   */
  readonly isPropertiesPanelShowing?: boolean
  /**
   * Whether anything FR-076 raised still stands, or `undefined`.
   *
   * Both `Enter` (SK-19) and `Esc` (IN-4) put a telling away first (NT-8 of
   * table T-037), and both ladders are decided here. The tellings themselves
   * stay with the Framework (LY-5).
   * ⛔ Optional; absent reads as not standing, which is the safe direction NT-8
   * (MUST NOT) needs: a forgotten answer never takes a press from the rung below.
   */
  readonly isNoticeStanding?: boolean
  /**
   * The `TaskGroup.id` of every row the last frame drew -- the set
   * `ScreenSession.rowBoxes` carries.
   *
   * FR-029 draws an entrance faint by what is drawn, and its press must tell
   * the reason; judging off the whole roster disagrees where HR-1a / HR-6 hide a
   * fold, so a faint control would write silently.
   * ⛔ Not rebuilt from `layout` and `regions`: the cut lives in the shell, and a
   * second copy would drift when the clip moves (rule 03 section 1).
   * ⛔ Optional and silent: absent falls back to the document's roster.
   */
  readonly drawnRowGroupIds?: readonly string[]
  /**
   * The same rows with their drawn boxes, for HF-15's up-and-down walk.
   *
   * Boxes, not a step distance: HF-15 walks places in drawing order and FR-042
   * lets rows differ in height, so one distance drifts after a few places.
   * `frame-loop.ts` fills this and `drawnRowGroupIds` from one `drawnRowBoxesOf`
   * call; the ids member stays for readers that only need membership.
   * ⛔ Optional and silent: absent gives an empty walk and a release that
   * writes nothing.
   */
  readonly drawnRowBoxes?: readonly { readonly groupId: string; readonly box: ScreenRect }[]
  /**
   * S-211 of table T-206: whether 段 0 (the head of the row title panel) is
   * folded.
   *
   * IC-78 and IC-74 turn on it (HR-2 of table T-015). ⛔ Not derivable from
   * `drawnRowGroupIds`: no drawn row is either a folded head or an empty
   * document, which owe different answers.
   * ⛔ Optional and silent: absent reads as not folded, S-211's default.
   */
  readonly isLevelZeroFolded?: boolean
}

// ----------------------------------------------------------------- answer ---

/**
 * What is to be edited, from MK-13 or SK-9.
 *
 * Where each opens (panel field or in place) is the shell's to decide, since
 * where a field is drawn is not this side's to know.
 */
export type InPlaceTarget =
  /** SK-9 (`F2`), whose one entrance is FR-035. */
  | { readonly kind: 'documentTitle' }
  /**
   * MK-13's Task entry (name label or body) and its 実績 entry, reached through
   * GR-10 / GR-12 and GR-5, GR-6, GR-15, GR-9, GR-17, GR-18 of table T-023d.
   *
   * One kind for all: which grab it came by is not carried, since nothing
   * downstream could use it without one operation meaning two things. The uid is
   * carried because the selection is not where to read back which Task it was.
   */
  | { readonly kind: 'taskName'; readonly uid: number }
  /**
   * MK-13's 担当ラベル entry (GR-11), whose destination is 表 T-225 の `AS-1`.
   *
   * ⛔ Its own kind, not `taskName`: MK-13 sends the two to different fields
   * (表 T-016 の `PR-16` and `PR-1`).
   * The Task is carried, not a resource: which Resource is what the edit decides
   * (AS-3 / AS-7).
   */
  | { readonly kind: 'assignee'; readonly uid: number }
  // No `newRowName` kind: HF-14 of table T-051 names a new row through the same
  // road as renaming (`rowName`, below), so IC-91 / IC-93 plan CM-26 and carry
  // the row out as `CreatedSubject`.
  /**
   * MK-13's 行見出し entry -- FR-085's one path to renaming a standing row.
   *
   * Carried, not read off the selection: FR-085 lets several rows be chosen, so
   * which one was double clicked only this press knows.
   */
  | { readonly kind: 'rowName'; readonly groupId: string }
  /**
   * MK-13's コメントボックス entry, sent to the panel's 本文 field (表 T-016 の
   * `PR-21`); FR-097.
   *
   * Carried, not read off the selection, for `rowName`'s reason (SL-3 of table
   * T-023c lets several boxes stand chosen).
   */
  | { readonly kind: 'commentBoxText'; readonly id: string }

// No CM-48 is planned where `commentBoxText` is raised: MK-13 forbids an
// in-place editor, so the value is written by the panel field's own commit
// through `commandFromFieldCommit`, as `taskName` and `rowName` write nothing on
// the press.
// STOP -- the commit cannot reach CM-48 yet. `PropertyFieldKey`
// (`screen-renderer.ts`) has no arm that names a comment box, and
// `properties-panel.ts` records the same gap (with `COLUMN_SHAPES` having no
// `CommentBox`). Until an arm exists, `commandFromFieldCommit` has no case to gain.

/**
 * CM-60, the one road into `dualCursor` (S-65).
 *
 * Derived from `DocumentCommand` so the fields are not declared twice; IV-13 is
 * judged in `edit-document-settings.ts`.
 */
type SetDualCursor = Extract<DocumentCommand, { readonly kind: 'setDualCursor' }>

/**
 * CM-61, which puts `dualCursor` (S-65) back to `null`.
 *
 * Travels as the `placed` half of `setDualCursorFollowing`, so leaving the mode
 * and clearing the pair are one press and one write.
 */
type ClearDualCursor = Extract<DocumentCommand, { readonly kind: 'clearDualCursor' }>

/**
 * Which 場面 a pressed entrance was spent in (FR-029).
 *
 * A situation, not a row id of 表 T-233: that table is spelled only in
 * `frame-loop.ts` (rule 03 section 1), which maps these to rows -- the same shape
 * `DocumentFileFaultReason` takes across this seam.
 * One member per situation, not per entrance (IC-8 / IC-9 share one, as do
 * IC-37 / IC-38). IC-18's situation is absent because this layer cannot measure
 * it -- see `tellEntryHasNothingToDo`.
 */
export type SpentEntranceSituation =
  /** HF-2 of table T-051 (IC-58): nothing under this row is left folded. */
  | 'noFoldedRowBelow'
  /** HF-11 (IC-77): nothing under this row is left unfolded. */
  | 'noUnfoldedRowBelow'
  /**
   * HF-13 (IC-90): no direct child of this row is out of the picture. RS-30 of
   * 表 T-233; `frame-loop.ts` maps it by roster, not by spelling.
   */
  | 'rowIsOpenWithNoHiddenChild'
  /** HF-10 (IC-74): no row anywhere is folded. */
  | 'noFoldedRowAtAll'
  /** HF-12 (IC-78): no row anywhere is unfolded. */
  | 'noUnfoldedRowAtAll'
  /** FR-049 (IC-8 / IC-9): only one of the plan and the actual is shown. */
  | 'onlyOneOfPlanAndActualShown'
  /** FR-034 (IC-37 / IC-38): no `Task` is chosen to line the others up with. */
  | 'noTaskChosenToAlignWith'
  /** HF-15 (GR-20): the held row has no sibling immediately above to nest under. */
  | 'noSiblingAboveToNestUnder'
  /** HF-15: the held row is already at the shallowest level, so it cannot go left. */
  | 'rowIsAtTheShallowestLevel'
  /**
   * HF-15: a step right would carry the subtree past FR-085's depth cap.
   *
   * Needed because CM-73's own refusal names HM-3a, and FR-029 (MUST NOT)
   * forbids the fallback where a row of table T-233 fits.
   */
  | 'groupDepthLimitReached'
  /**
   * HF-15 (GR-20): the held row stands at the end of its walk of places in the
   * direction the hand went. ⛔ Never a short drag -- see `rowGrabPositionOf`.
   */
  | 'noPlaceLeftInThatDirection'
  /**
   * FR-019 (AR-5 / AR-6): the annotation's vertical position points at no
   * `TaskGroup` -- RS-44's 場面.
   *
   * Not a table T-109 entrance: 表 T-233 is keyed on 場面, so a press on the
   * schedule with an arm standing owes the same telling.
   */
  | 'noRowToPutTheAnnotationOn'
  /**
   * HF-14 (IC-91): this row already stands at FR-085's depth cap -- RS-46's 場面.
   * ⛔ Not `groupDepthLimitReached`, which is HF-15's move (RS-38).
   */
  | 'rowIsAtTheDeepestLevel'
  /**
   * FR-001: a bar shape (SH-1 .. SH-4 of table T-012) was armed and released
   * without travelling past `S-208` -- RS-53's 場面, not the fallback RS-27.
   * A milestone never raises it (RS-53's note).
   */
  | 'barShapeReleasedWithoutADrag'

/**
 * The one thing a write brought into being, for FR-001 and HF-14, which leave
 * the person standing on it.
 *
 * ⛔ Not `Selection`: SL-1 of table T-023c keeps rows out of the drawing area's
 * selection, so the two are different sets.
 */
export type CreatedSubject =
  /** FR-001: the `Task` a drag or a click on empty ground just drew (AT-19). */
  | { readonly kind: 'task'; readonly uid: number }
  /** HF-14 / HF-17: the `TaskGroup` a press on IC-91 or IC-93 stood up (AT-51). */
  | { readonly kind: 'row'; readonly groupId: string }

/**
 * What one happening is assigned to.
 *
 * Wider than `DocumentCommand` because table T-036 assigns non-edits too
 * (CP-18). Each member names the row of table T-023 or T-036 that assigns it.
 * Selection and screen state are not here: they are the other two members'
 * answers, and a kind for them would write the rule twice.
 */
export type InputAction =
  /**
   * The writes one input asks for, in the order they must land.
   *
   * Each member is one write and one undo step (FR-031). A list because one
   * input can owe two: the fit places CM-71 then CM-72, and merged, WS-4 would
   * push a step holding the old zoom and break UN-8.
   * ⚠️ Not an optional second field: a dropped second write is the same defect.
   */
  | {
      readonly kind: 'changeDocument'
      readonly writes: readonly (readonly DocumentCommand[])[]
      /**
       * What the writes bring into being, when FR-001 / HF-14 leave the person
       * standing on it. Absent for writes that make nothing.
       *
       * Carried because only the planner knows it; the pointer is over empty
       * ground. Not a second action kind, which could travel without its write.
       * ⚠️ A plan, not a promise: the holder tests the document first, since a
       * refused write makes nothing.
       */
      readonly created?: CreatedSubject
    }
  /**
   * S-211 of table T-206 moves, with the writes of the same press.
   *
   * One action because HR-2 of table T-015 folds rows (AT-56, document) and 段 0
   * (S-211, screen) in one press; split, a frame could stand half-folded.
   * Reached by IC-78 (HF-12), IC-74 (HF-10) and IC-92 (HF-16).
   * ⚠️ `writes` may be empty when every row is already folded.
   */
  | {
      readonly kind: 'setLevelZeroFolded'
      readonly isFolded: boolean
      readonly writes: readonly DocumentCommand[]
    }
  /** SK-6. */
  | { readonly kind: 'undoEdit' }
  /** SK-7. */
  | { readonly kind: 'redoEdit' }
  /** SK-4. */
  | { readonly kind: 'copySelection' }
  /** SK-5. */
  | { readonly kind: 'pasteClipboard' }
  /** SK-10. OP-2 of table T-024a keeps this the one entrance for a merge too. */
  | { readonly kind: 'openDocumentFile' }
  /** SK-11. */
  | { readonly kind: 'saveDocumentFile' }
  /** SK-21. OP-13 of table T-024a. */
  | { readonly kind: 'reopenDocumentFile' }
  /** IC-3. FR-025 sends IO-6 of table T-024 with no surface in between. */
  | { readonly kind: 'copyPictureToClipboard' }
  /** SK-19. */
  | { readonly kind: 'settleTextEntry' }
  /**
   * NT-8 of table T-037: SK-19's first stage and IN-4's first level.
   *
   * Carries nothing: which telling is newest is a current value the Framework
   * holds (LY-5).
   * ⛔ Raised for `Enter` only. `Esc` reaches the same act through
   * `escapeTarget`'s `'notice'` rung; answering both would dismiss two tellings
   * for one press.
   */
  | { readonly kind: 'dismissNotice' }
  /**
   * FR-029: the pressed entrance has nothing it can do now, told in NT-1.
   *
   * Carries a situation, never a row id or words: `frame-loop.ts` maps it to 表
   * T-233 and FR-038's dictionary supplies the sentence. `null` is the fallback
   * RS-27.
   * ⛔ Not for every press that writes nothing. Entrances answered
   * `CONSUMED_ELSEWHERE` (arming, and every pure `ScreenState` change) do work;
   * a reason told for them would call a working entrance dead. Raise this only
   * where the drawing side also draws the entrance faint: IC-8 / IC-9
   * (`commandStateOf`), IC-58 / IC-59 / IC-77 (`expanderOf`), IC-74 / IC-78
   * (`rowTitlePanelFromSchedule`), IC-37 / IC-38 (`isEntryUsable`).
   * ⚠️ IC-18 is told by `frame-loop.ts` in `answerSettledEntry`: whether the
   * `Agent API` is on is not in `InputContext`.
   */
  | {
      readonly kind: 'tellEntryHasNothingToDo'
      readonly situation: SpentEntranceSituation | null
    }
  /** SK-9 and MK-13. */
  | { readonly kind: 'editInPlace'; readonly target: InPlaceTarget }
  // No `openPropertiesPanel` member: MK-13's panel route for a Task is the
  // `editInPlace` `taskName` target, and where it opens is the shell's; a second
  // member would put one row of table T-023 in two places.
  /**
   * GR-19 of table T-023d -- FR-053's palette moves by what the pointer
   * travelled.
   *
   * Answered on every move with the travel since `PointerPress.followedTo`, so
   * applied answers sum to the release's total. IN-1 still owes the start
   * corner on interruption; `frame-loop.ts` keeps it and restores it on `Esc` or
   * a lost pointer.
   * A distance, not a place: `ScreenSession.commandPaletteAt` is the one holder.
   * Not `scrolledAnchor`: that answers a document anchor, and the palette's
   * place is screen numbers no document row holds.
   * Not a document change: table T-108 has no row and T-203 no key.
   */
  | {
      readonly kind: 'moveCommandPalette'
      readonly by: { readonly dx: number; readonly dy: number }
    }
  /**
   * GR-20 of table T-023d -- HF-15's held row follows the pointer.
   *
   * Answered on every move; the axis is fixed until release by
   * `PointerPress.rowGrabAxis`. Not a document change -- CM-73 is planned on
   * release in `commandFromRowGrab`.
   * A depth, not pixels: the indent step is `S-37` via `RowTitle.indentPx`, and a
   * second holder of that step would drift and land the row short of the hand.
   */
  | {
      readonly kind: 'followRowGrab'
      /** `TaskGroup.id` (AT-51) of the row being held. */
      readonly groupId: string
      /** The axis this grab settled on, which does not change again. */
      readonly axis: RowGrabAxis
      /** The depth the row is to be DRAWN at while held. Depth 1 is a root row. */
      readonly atDepth: number
      /**
       * On the position axis, the boundary of the place the hand stands at, so
       * the picture shows where the row lands; `null` on the depth axis.
       * ⛔ `null` is not zero: zero is the top of the `Row Area`.
       */
      readonly atY: number | null
      /**
       * How far the row still follows on the refused axis, signed: the travel
       * held to `S-212` of one step of that axis (`S-37` sideways, the row's own
       * pitch vertically).
       */
      readonly resistedPx: number
    }
  /**
   * FR-085: a row was chosen in the `Row Title Panel`.
   *
   * The row and the modifier, not the resulting set: the set is the shell's
   * (LY-5). Not table T-023c's selection (SL-1).
   * `isExtending` is `Shift`, following SL-4's convention because FR-085 names
   * no modifier. SL-3's range is not answered: FR-085 leaves it undefined.
   *
   * @provisional PND-142
   */
  | {
      readonly kind: 'chooseRow'
      readonly groupId: string
      readonly isExtending: boolean
    }
  /**
   * IC-63 / IC-64 / IC-65 -- `ScreenSession.selectedResourceUids` is replaced by
   * `uids`.
   *
   * Replaced, never added to: FR-099 deletes what is chosen, so adding would
   * delete people never picked out. Computed here because all three read only
   * the document.
   * By `uid` (AT-85), never name: AS-8 of table T-225 allows same-named resources.
   *
   * @provisional PND-143
   */
  | { readonly kind: 'chooseResources'; readonly uids: readonly number[] }
  /**
   * IC-67 / IC-68 -- one person joins or leaves
   * `ScreenSession.selectedResourceUids`. Which way is the holder's; see `ENTRY`.
   *
   * @provisional PND-143
   */
  | { readonly kind: 'toggleChosenResource'; readonly uid: number }
  /**
   * IC-17 -- FR-072's settings entrance.
   *
   * Neither open nor close: which way it goes depends on what the panel shows
   * now, which the Framework holds (LY-5).
   *
   * @provisional PND-144
   */
  | { readonly kind: 'toggleDocumentSettingsProperties' }
  /** IC-20 -- FR-065. Not a document change (S-99b of table T-206). */
  | { readonly kind: 'toggleAgentApi' }
  /**
   * IC-18 -- FR-066: `ScreenSession.isDialogueFieldVisible` turns, and nothing
   * else (S-99i). Not a document change.
   */
  | { readonly kind: 'toggleDialogueFieldVisible' }
  /**
   * IC-50 -- FR-053's milestone list, `ScreenSession.isMilestoneListOpen`.
   *
   * Carries no value: the standing value lives past this seam, so naming a
   * direction would need a copy of it here. Not a document change (S-142) and
   * not a surface, so `Esc` cannot reach it.
   */
  | { readonly kind: 'toggleMilestoneList' }
  /**
   * IC-75 -- FR-053's minimise, `ScreenSession.isPaletteMinimised`.
   *
   * Carries no value, for `toggleMilestoneList`'s reason. Not `S-99e` (whether
   * the palette is shown). Not a document change (S-200) and not a surface.
   */
  | { readonly kind: 'togglePaletteMinimised' }
  /**
   * IC-76 -- FR-102's record, `S-206` of table T-206; the shell keeps it.
   *
   * Carries no value, and the record cannot be made here: a pure translator
   * sees neither the run of happenings nor the clock. Not a document change and
   * not a surface.
   */
  | { readonly kind: 'toggleInteractionRecord' }
  /**
   * Table T-029a: the Dual Cursor mode was entered (DC-1), handed over (DC-2),
   * or left (DC-4).
   *
   * One action with a session value and a write because DC-1 and DC-2 each
   * change both in one press.
   * `following` is the whole mode; see `InputContext.dualCursorFollowing`.
   * `placed` is usually null: DC-1 (MUST NOT) forbids re-placing a standing
   * pair. Typed as CM-60 / CM-61 so this is no second road into `dualCursor`.
   * Leaving the mode carries CM-61 (DC-7). See `commandFromDualCursorEntry`.
   */
  | {
      readonly kind: 'setDualCursorFollowing'
      readonly following: DualCursorSide | null
      readonly placed: SetDualCursor | ClearDualCursor | null
    }

/** What `commandFromInput` answers. */
export interface TranslatedInput {
  /** Null when this tool assigns the happening to nothing (MK-12). */
  readonly action: InputAction | null
  /**
   * MK-10: whether to stop the browser's own behaviour.
   *
   * ⚠️ True means assigned, not "something happened": `Ctrl+A` (SK-2) and a
   * wheel turn during a drag both answer true with a null action.
   * ⛔ False for `Esc` with nothing to consume (IN-4a): leaving full screen is
   * the browser's own behaviour (FR-071).
   */
  readonly isBrowserDefaultStopped: boolean
}

/** The answer for a happening this tool has not assigned. */
const UNASSIGNED: TranslatedInput = { action: null, isBrowserDefaultStopped: false }

/** Assigned, and consumed by a member other than `commandFromInput`. */
const CONSUMED_ELSEWHERE: TranslatedInput = { action: null, isBrowserDefaultStopped: true }

/**
 * The rows of table T-023d that MK-13 gives a double-click destination AND that
 * also carry a plain-press operation.
 *
 * Read off MK-13's 対象 list:
 *   本体                            -> GR-12
 *   実績（実績バー）                 -> GR-5 / GR-6, and GR-15 for a milestone
 *   実績（未着手のダミー）           -> GR-9 / GR-17 / GR-18
 *   コメントボックス                 -> GR-14
 * GR-10 and GR-11 are absent: `item-hit-area.ts` never answers them for a plain
 * press (table T-023d closing rule). 行見出し is absent: its press writes nothing.
 * ⚠️ Not a copy of `isNameEntrance`: that asks which rows reach the Task's name
 * field (holds GR-10); this asks which must not act on an untravelled press
 * (holds GR-14).
 */
const MK_13_GRAB_ROWS: ReadonlySet<string> = new Set([
  'GR-5', 'GR-6', 'GR-9', 'GR-12', 'GR-14', 'GR-15', 'GR-17', 'GR-18',
])

/** @purity pure */
function acted(action: InputAction): TranslatedInput {
  return { action, isBrowserDefaultStopped: true }
}

/** @purity pure */
function changed(commands: readonly DocumentCommand[]): TranslatedInput {
  // ⚠️ An empty bundle is not a write. WS-4 would push an undo step for it, and
  // FR-063 would move the schedule instant behind a gesture that moved nothing.
  return commands.length === 0
    ? CONSUMED_ELSEWHERE
    : acted({ kind: 'changeDocument', writes: [commands] })
}

/**
 * A write that brings one thing into being, and the thing it brings.
 *
 * Not folded into `changed` as an optional argument, which would read as though
 * every caller might create something. `writes` may be more than one: a press
 * that opens FR-018's tier before standing a row up owes two.
 *
 * @purity pure
 */
function changedAndCreated(
  writes: readonly (readonly DocumentCommand[])[],
  created: CreatedSubject,
): TranslatedInput {
  const owed = writes.filter((one) => one.length > 0)
  return owed.length === 0
    ? CONSUMED_ELSEWHERE
    : acted({ kind: 'changeDocument', writes: owed, created })
}

/**
 * FR-029's telling: the pressed entrance has nothing it can do now.
 *
 * `acted` rather than `CONSUMED_ELSEWHERE`: both stop the browser (MK-10), only
 * this carries the reason on.
 * ⚠️ Every caller must be an entrance the drawing side also draws faint, from
 * the same condition (`expanderOf`, `rowTitlePanelFromSchedule`,
 * `commandStateOf`, `isEntryUsable`).
 *
 * @purity pure
 */
function nothingToDo(situation: SpentEntranceSituation | null): TranslatedInput {
  return acted({ kind: 'tellEntryHasNothingToDo', situation })
}

/**
 * A fold or an open that reaches some rows, or FR-029's telling where it reaches
 * none.
 *
 * One place for table T-015's five set-of-rows entrances (IC-58, IC-77, IC-90,
 * IC-74, IC-78), each drawn faint exactly when this set is empty (R2.7). The
 * situation still comes from the caller: the five are different 場面.
 * Not folded into `changed`, whose empty answer is `CONSUMED_ELSEWHERE` and whose
 * callers include non-entrances.
 *
 * @purity pure
 */
function foldsOrNothing(
  commands: readonly DocumentCommand[],
  situation: SpentEntranceSituation | null,
): TranslatedInput {
  return commands.length === 0 ? nothingToDo(situation) : changed(commands)
}

/**
 * An input that owes more than one write, in FR-031's order. The only caller is
 * the fit (SK-18 / IC-10).
 *
 * @purity pure
 */
function changedInOrder(writes: readonly (readonly DocumentCommand[])[]): TranslatedInput {
  const owed = writes.filter((one) => one.length > 0)
  return owed.length === 0 ? CONSUMED_ELSEWHERE : acted({ kind: 'changeDocument', writes: owed })
}

/**
 * The two writes one fit press owes, in FR-031's order.
 *
 * ① CM-71 places the zoom and the viewport and pushes no step (UN-8).
 * ② CM-72 opens every collapsed row and pushes the one step (UN-17, HF-8).
 *
 * WS-4 pushes the document as it stood before its write, so ②'s step already
 * holds the new zoom and one undo restores the collapse without the zoom.
 *
 * @purity pure
 */
function fitWrites(context: InputContext): readonly (readonly DocumentCommand[])[] {
  return [[fitCommand(context)], [{ kind: 'expandAllTaskGroups' }]]
}

/**
 * The same action, with the browser left holding its own behaviour.
 *
 * MK-12's shape: no assignment of this tool's, yet table T-023a still decides
 * what happens -- which is why `TranslatedInput` has two halves, not one flag.
 *
 * @purity pure
 */
function browserKept(answer: TranslatedInput): TranslatedInput {
  return { action: answer.action, isBrowserDefaultStopped: false }
}

// ------------------------------------------------------------- modifiers ---

/**
 * Whether the `Ctrl` of table T-023 and table T-036 is down.
 *
 * `Cmd` is read as `Ctrl` for every row alike, so a machine whose shortcut key
 * is `Cmd` does not get some `Ctrl` rows and miss others.
 * Searched: table T-023, table T-023a, table T-036, FR-016, FR-070, table
 * T-028, `_assets/tbl-settings.md`. None names `Cmd`.
 *
 * @provisional PND-10
 * @purity pure
 */
function isCtrlHeld(modifiers: InputModifiers): boolean {
  return modifiers.ctrl || modifiers.meta
}

/**
 * Whether exactly this combination is held.
 *
 * ⚠️ The unit is the combination (MK-10, MK-12; MK-4 against MK-5), so a held
 * key the row does not name makes the row not match.
 *
 * @purity pure
 */
function isCombo(
  modifiers: InputModifiers,
  ctrl: boolean,
  shift: boolean,
  alt: boolean,
): boolean {
  return isCtrlHeld(modifiers) === ctrl && modifiers.shift === shift && modifiers.alt === alt
}

/**
 * Whether table T-023 gives a pointer happening with these modifiers an
 * assignment -- what MK-10 keys the browser on.
 *
 * Nothing held (MK-6, MK-8, MK-11, MK-13), `Ctrl` alone (MK-7), `Shift` alone
 * (SL-4 of table T-023c, PTD-5); MK-12 is the rest.
 * ⚠️ `commandFromWheel` asks a different question of the same keys (MK-4, MK-5).
 *
 * @purity pure
 */
function isAssignedPointerCombo(modifiers: InputModifiers): boolean {
  return (
    isCombo(modifiers, false, false, false) ||
    isCombo(modifiers, true, false, false) ||
    isCombo(modifiers, false, true, false)
  )
}

/**
 * The combination one gesture is being read with.
 *
 * MK-12 speaks of a drag, so the press names the combination for every later
 * phase (CS-2), as `pressRowOf` does.
 *
 * @purity pure
 */
function gestureModifiers(input: PointerInput, context: InputContext): InputModifiers {
  const press = context.pressed
  return input.phase === 'down' || press === null ? input.modifiers : press.at.modifiers
}

/**
 * The keys table T-036 assigns, spelled as its assignment column spells them.
 *
 * One place, so `KeyInput.key` and the rows that read it cannot drift apart.
 */
const KEY = {
  /** SK-19 */ enter: 'Enter',
  /** SK-8 */ escape: 'Esc',
  /** SK-3 */ del: 'Delete',
  /** SK-3 */ backspace: 'Backspace',
  /** SK-13 */ f1: 'F1',
  /** SK-9 */ f2: 'F2',
  /** SK-15 */ f11: 'F11',
  /** SK-2 */ a: 'A',
  /** SK-4 */ c: 'C',
  /** SK-20 */ d: 'D',
  /** SK-12 */ e: 'E',
  /** SK-18 */ f: 'F',
  /** SK-10 */ o: 'O',
  /** SK-14 */ p: 'P',
  /** SK-21 */ r: 'R',
  /** SK-11 */ s: 'S',
  /** SK-5 */ v: 'V',
  /** SK-7 */ y: 'Y',
  /** SK-6 */ z: 'Z',
  /** SK-16 / SK-16a */ plus: '+',
  /** SK-16 / SK-16a */ minus: '-',
  /** SK-17 */ zero: '0',
} as const

/** U-30 of table T-103, the half FR-036 opens. */
const HELP_MODAL = 'Help Modal'

/**
 * Surface names table T-103 settles -- U-30's other half (FR-068), U-49
 * (FR-099), U-54 (FR-096) -- as `ScreenState.surface` (S-99g) carries them.
 *
 * ⛔ No name is minted for the surfaces FR-074 and FR-088 open: table T-103 has
 * none (`open-modals.ts` records the same hole).
 */
const AI_EXPORT_MODAL = 'AI Export Modal'
const RESOURCE_ROSTER = 'Resource Roster'
const EXPORT_CHOOSER = 'Export Chooser'

/**
 * U-60 of table T-103 -- the surface FR-020 raises before the watermark may be
 * hidden; S-99g, so it sits on IN-4's surface rung.
 *
 * ⛔ Closing it must not hide the watermark (FR-020), which holds because this
 * side leaves S-144 alone. Raised on the hiding direction of IC-41 only:
 * `screenStateFromEntry` reads S-144 first.
 */
const WATERMARK_UNLOCK = 'Watermark Unlock'

/**
 * U-25 of table T-103 -- a surface `ScreenState` does not hold.
 *
 * ⛔ Never put it in `ScreenState.surface`: the drawing side turns that name
 * into a modal, so the panel would be drawn over the schedule. Spelled here only
 * for the closing entry of table T-109, which must tell it from the modals.
 */
const PROPERTIES_PANEL = 'Properties Panel'

/**
 * Whether this is one of IN-5's single-character keys.
 *
 * Measured on the spelling rather than listed, because IN-5a is about the shape
 * of the key, not today's assignments.
 * IN-5 is met by its third option (focus only) outside this file: happenings
 * arrive only through `InputSource`, which CP-27 registers with the focused host.
 *
 * @purity pure
 */
function isSingleCharacterKey(key: string): boolean {
  return key.length === 1
}

// ------------------------------------------------------------ the axes -----

const MS_PER_DAY = 86400000

/**
 * A day as a count of calendar days.
 *
 * Not FR-054's working-day counting (only `workingDaysBetween` does that); PI-1
 * publishes no member that moves a date by calendar days.
 *
 * @purity pure
 */
function serialOfDay(day: CalendarDay): number {
  return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY)
}

/** @purity pure */
function dayFromSerial(serial: number): CalendarDay {
  const at = new Date(serial * MS_PER_DAY)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

/** @purity pure */
function dayShifted(day: CalendarDay, days: number): CalendarDay {
  return dayFromSerial(serialOfDay(day) + days)
}

/**
 * FR-001 / FR-019: whether the hand dragged past `S-208`.
 *
 * Read from the generated block and per axis, exactly as `rowGrabAxisAt` reads
 * it; a diagonal here would give the same hand two answers.
 *
 * @purity pure
 */
function hasDraggedPastThreshold(press: PointerPress, at: { readonly x: number; readonly y: number }): boolean {
  const threshold = NOT_STORED_ROW_GRAB_SIZES['S-208']
  return Math.abs(at.x - press.at.x) > threshold || Math.abs(at.y - press.at.y) > threshold
}

/**
 * The day drawn at an x, or null while the axis has no origin.
 *
 * ⚠️ Straight through to `dateAtX` (PI-5): an origin rebuilt from `pxPerDay` and
 * this side's `ScreenRegions` can land on a different day silently.
 *
 * @purity pure
 */
function dayAtX(layout: ScheduleLayout, x: number): CalendarDay | null {
  return dateAtX(layout, x)
}

/**
 * The rows that flow -- everything FR-098 did not lift into the pinned band.
 *
 * Asked of the layout, not `pinnedGroupIds`: a pin on a row HR-1a or HR-6 hides
 * lifts nothing. A layout without the member means every row flows.
 *
 * @purity pure
 */
function scrollingRowsOf(layout: ScheduleLayout): readonly RowPlacement[] {
  return layout.rows.filter((row) => row.isPinned !== true)
}

/**
 * The top edge S-78 and S-176 point at (FR-098): the scrolling remainder's,
 * which is the `Row Area`'s own while nothing is pinned.
 *
 * @purity pure
 */
function scrollAreaTopOf(context: InputContext): number {
  return context.layout.scrollAreaY ?? context.regions.rowArea.y
}

/**
 * The row drawn at a y, or null when none is.
 *
 * ⚠️ Bands are half-open at the bottom (R3.4), so two rows never claim one
 * point. Pinned rows are included: FR-098 lifts a row, it stays a target.
 *
 * @purity pure
 */
function rowAtY(layout: ScheduleLayout, y: number): RowPlacement | null {
  for (const row of layout.rows) {
    if (y >= row.y && y < row.y + row.height) return row
  }
  return null
}

/**
 * The ordinal of the row whose slab the top edge stands in, or null outside
 * the drawn rows.
 *
 * ⛔ Not `rowAtY`: a point in `rowGap` (LF-3 of table T-221) is on no band, and
 * FR-001 needs that null; but an edge always stands in some row's slab
 * `[row.y, nextRow.y)`, half-open (R3.4), so the gap belongs to the row above.
 * ⚠️ The last row's slab ends at its own band (`schedule-layout.ts` removes the
 * trailing gap); past it is the null `scrolledAnchor` reads as "ran off the end".
 *
 * @purity pure
 */
function rowIndexAtTopEdge(rows: readonly RowPlacement[], y: number): number | null {
  for (let at = 0; at < rows.length; at++) {
    const row = rows[at]
    if (row === undefined) continue
    const next = rows[at + 1]
    const end = next === undefined ? row.y + row.height : next.y
    if (y >= row.y && y < end) return at
  }
  return null
}

/**
 * A display position: the anchors S-77 / S-78 and the fractions S-176 / S-177
 * of how far into each anchor the edge stands.
 */
interface ScrollAnchor {
  /** S-77. */
  readonly scrollDate: string | null
  /** S-177, a fraction of that day's own width. In [0, 1). */
  readonly scrollDayOffset: number
  /** S-78. A `TaskGroup.id`, never a row number. */
  readonly scrollGroupId: string | null
  /** S-176, a fraction of that row's own height. In [0, 1). */
  readonly scrollGroupOffset: number
}

/**
 * OP-10a's range, [0, 1), by dropping the whole part rather than refusing.
 *
 * ⚠️ Callers pass values already in range; the guard stops rounding from
 * producing exactly 1, which would spell one position two ways and fail NS-4's
 * round trip.
 *
 * @purity pure
 */
function unitFraction(value: number): number {
  if (!Number.isFinite(value)) return 0
  const dropped = value - Math.floor(value)
  return dropped < 1 ? dropped : 0
}

/**
 * S-77 with S-177: the day the left edge lands in, and how far into that day.
 *
 * Read through the two published converters so `x -> day` and `day -> x` cannot
 * drift. `dateAtX` floors, so the distance back to its day is the fraction.
 *
 * @purity pure
 */
function dayAnchorAt(
  context: InputContext,
  x: number,
): Pick<ScrollAnchor, 'scrollDate' | 'scrollDayOffset'> {
  const settings = context.document.documentSettings
  const layout = context.layout
  const day = dayAtX(layout, x)
  // A null keeps the value in force rather than writing "no chosen place":
  // OP-10 of table T-024a reads a null `scrollDate` as undecided, and a scroll
  // un-decides nothing.
  if (day === null || !(layout.pxPerDay > 0)) {
    return { scrollDate: settings.scrollDate, scrollDayOffset: settings.scrollDayOffset }
  }
  return {
    scrollDate: textOfDay(day),
    scrollDayOffset: unitFraction((x - xFromDay(layout, day)) / layout.pxPerDay),
  }
}

/**
 * S-78 with S-176: the row the top edge lands in, and how far into that row.
 *
 * ⛔ Uses `rowIndexAtTopEdge`, not `rowAtY`, or a scroll ending in a `rowGap`
 * would be refused. A null keeps the value in force, as in `dayAnchorAt`.
 *
 * @purity pure
 */
function rowAnchorAt(
  context: InputContext,
  y: number,
): Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'> {
  const settings = context.document.documentSettings
  // ⛔ Scrolling rows only (FR-098): an anchor naming a pinned row would fix the
  // display position where it could never move.
  return rowAnchorIn(scrollingRowsOf(context.layout), y, {
    scrollGroupId: settings.scrollGroupId,
    scrollGroupOffset: settings.scrollGroupOffset,
  })
}

/**
 * The same pair against a chain of rows handed in, so FR-016's zoom can anchor
 * in the picture it is about to draw (`rowPlacesAtZoomY`).
 *
 * One spelling for both frames: two copies would be two bijections against one
 * `scrollOffsetOf`, and the picture would land where neither named.
 *
 * @purity pure
 */
function rowAnchorIn(
  rows: readonly RowPlacement[],
  y: number,
  held: Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'>,
): Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'> {
  const at = rowIndexAtTopEdge(rows, y)
  if (at === null) return held
  const row = rows[at]
  const below = rows[at + 1]
  // The fraction is of the slab, not the band: a band fraction cannot name an
  // edge inside `rowGap`, so a pan would snap by the gap at every boundary and
  // break table T-023d's 等倍 rule. The last row's slab is its own band.
  // ⛔ `scrollOffsetOf` in `schedule-layout.ts` inverts this pair and must use
  // the same denominator.
  if (row === undefined) return held
  const slab = below === undefined ? row.height : below.y - row.y
  if (slab <= 0) return held
  const into = y - row.y
  if (into >= slab && below !== undefined) {
    return { scrollGroupId: below.groupId, scrollGroupOffset: 0 }
  }
  return { scrollGroupId: row.groupId, scrollGroupOffset: unitFraction(into / slab) }
}

/**
 * PTD-1's write: the display position moved by this many pixels.
 *
 * One place for the four members, reached by both the following move and the
 * release (R2.7). No floor is taken: S-176 / S-177 let any distance be written,
 * and table T-023d's pan is 等倍. MK-1 keeps a floor -- see `rowTurnedTo`.
 *
 * @purity pure
 */
function panTo(context: InputContext, dx: number, dy: number): TranslatedInput {
  const moved = scrolledAnchor(context, dx, dy)
  return changed([
    {
      kind: 'setScrollPosition',
      scrollDate: moved.scrollDate,
      scrollDayOffset: moved.scrollDayOffset,
      scrollGroupId: moved.scrollGroupId,
      scrollGroupOffset: moved.scrollGroupOffset,
    },
  ])
}

/**
 * Where the display position lands when the schedule is moved by this many
 * pixels, named by what stands at the left and top edges afterwards.
 *
 * ⚠️ Fractions of the anchor's own extent, not px: FR-080 (MUST NOT) forbids a
 * px scroll position.
 * ⚠️ Measured against `context.layout`, which already has the position in force
 * applied, so zero on an axis answers that axis's current values -- which is
 * what lets MK-5 take the vertical half unchanged.
 *
 * @purity pure
 */
function scrolledAnchor(context: InputContext, dx: number, dy: number): ScrollAnchor {
  const area = context.regions.rowArea
  return {
    ...dayAnchorAt(context, area.x + dx),
    ...rowAnchorAt(context, area.y + dy),
  }
}

/**
 * Where MK-1's wheel turn leaves the row at the top edge. The wheel only.
 *
 * ⚠️ A one-row floor is taken: a detent shorter than the standing row would
 * otherwise land inside it and not scroll. Table T-023d's 等倍 rule binds the
 * pan only, and MK-1 gives no distance.
 * ⛔ The floor is not forced now that S-176 can express part of a row; it is
 * an open choice (PND-176).
 * Searched: table T-023 MK-1, MK-5 and MK-7, table T-023a and its note and
 * PTD-1, the paragraph under table T-023d, S-4, S-12, S-77, S-78, S-96, S-176,
 * S-177, FR-016, FR-051, FR-017, FR-080, OP-10 and OP-10a of table T-024a.
 * No rows-per-notch figure is invented: the distance still comes from the device.
 *
 * ⚠️ The two ends differ. Above the first row there is provably nothing, so
 * running off the top answers the first row (else the top is unreachable). Past
 * the last row, whether anything remains depends on how much the Row Area
 * shows, which no row settles, so the value in force is kept.
 *
 * @provisional PND-176
 * @provisional PND-177
 *
 * @purity pure
 */
function rowTurnedTo(context: InputContext, dy: number): string | null {
  const settings = context.document.documentSettings
  // ⛔ Scrolling rows and the remainder's top edge, as in `rowAnchorAt` (FR-098).
  const rows = scrollingRowsOf(context.layout)
  const areaTop = scrollAreaTopOf(context)
  const standing = rowIndexAtTopEdge(rows, areaTop)
  if (dy === 0 || standing === null) return settings.scrollGroupId
  const landed = rowIndexAtTopEdge(rows, areaTop + dy)
  // Ran off the top: the first row is the whole of what was asked for.
  if (landed === null) return dy < 0 ? (rows[0]?.groupId ?? null) : settings.scrollGroupId
  // Landed back inside the row it began on, so the turn moved nothing yet.
  const at = landed === standing ? standing + (dy > 0 ? 1 : -1) : landed
  const held = Math.min(rows.length - 1, Math.max(0, at))
  return rows[held]?.groupId ?? settings.scrollGroupId
}

/** @purity pure */
function isOnRowArea(context: InputContext, x: number, y: number): boolean {
  return regionAtPointer(context.regions, x, y) === 'rowArea'
}

/**
 * Whether a wheel turn over this point is this tool's to read.
 *
 * Table T-023 scopes the press order to the drawing area (note under table
 * T-023a) and scopes MK-1 to MK-5 to nothing. Taken as the whole `Schedule
 * Canvas` (U-32), since its parts scroll together (SC-1 to SC-4); the `App
 * Header` is not the schedule.
 * Searched: table T-023, table T-023a and its 面 table, FR-016, FR-051, table
 * T-103.
 *
 * @provisional PND-12
 * @purity pure
 */
function isWheelHere(context: InputContext, x: number, y: number): boolean {
  // Table T-023's closing rule: while a surface stands, the wheel goes to the
  // browser.
  // ⛔ Tested here, not in `regionAtPointer`: floating surfaces have no rectangle
  // in `ScreenRegions` (PI-35), so a point on a `Confirmation` answers `rowArea`
  // and a tall question could not be scrolled.
  if (context.isSurfaceStanding) return false
  const region = regionAtPointer(context.regions, x, y)
  return region !== null && region !== 'appHeader'
}

// ------------------------------------------------------------ selection ----

/**
 * The same thing, named the way a selection names it.
 *
 * `Item` (PI-7) names a dependency by its endpoints; `ItemRef` (PI-32) by its
 * successor and ordinal (table T-053). A dependency the successor does not carry
 * answers null rather than a made-up name.
 *
 * @purity pure
 */
function itemRefOf(schedule: Schedule, item: Item): ItemRef | null {
  switch (item.kind) {
    case 'task':
      return { kind: 'task', uid: item.taskUid }
    case 'dependency': {
      const successor = taskByUid(schedule, item.successorUid)
      if (successor === null) return null
      const ordinal = successor.dependencies.findIndex(
        (one) => one.predecessorUid === item.predecessorUid,
      )
      return ordinal < 0 ? null : { kind: 'dependency', successorUid: item.successorUid, ordinal }
    }
    case 'highlightBox':
      return { kind: 'highlightBox', id: item.id }
    case 'commentBox':
      return { kind: 'commentBox', id: item.id }
    case 'statusLine':
      return { kind: 'statusLine' }
  }
}

/**
 * Everything SL-1 admits that this frame drew, for SK-2's select-all (SL-5).
 *
 * ⚠️ Built from the geometry, since only what was drawn can be selected.
 * ⚠️ The status line is included although `itemsInMarquee` leaves it out: SL-1
 * excludes it only from SL-3 and SL-7.
 *
 * @purity pure
 */
function everythingSelectable(context: InputContext): readonly ItemRef[] {
  const geometry = context.geometry
  const schedule = context.document.schedule
  const all: ItemRef[] = []
  for (const task of geometry.tasks) {
    all.push({ kind: 'task', uid: task.taskUid })
  }
  for (const line of geometry.dependencies) {
    const ref = itemRefOf(schedule, {
      kind: 'dependency',
      predecessorUid: line.predecessorUid,
      successorUid: line.successorUid,
    })
    if (ref !== null) all.push(ref)
  }
  for (const box of geometry.commentBoxes) {
    all.push({ kind: 'commentBox', id: box.id })
  }
  for (const box of geometry.highlightBoxes) {
    all.push({ kind: 'highlightBox', id: box.id })
  }
  if (geometry.statusLine !== null) all.push({ kind: 'statusLine' })
  return all
}

/**
 * The rectangle a press and a release span, normalised so the drag direction
 * does not matter (SL-3).
 *
 * @purity pure
 */
function marqueeRect(from: PointerInput, to: PointerInput): ScreenRect {
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
  }
}

// ------------------------------------------------------- table T-023a ------

// `PressRow` is declared with `PointerPress` near the top of this file, because
// the press carries the answer.

/**
 * Which row of table T-023a decides this press, evaluated in the table's order.
 *
 * Published so the caller fills `PointerPress.pressRow` at the press (CS-2);
 * asking again later would be a second moment, and reading the table elsewhere
 * the duplication R2.7 refuses.
 * ⚠️ Takes less than a whole press and context on purpose: the press cannot
 * exist until this has answered.
 *
 * @purity pure
 */
export function pressRowOf(
  press: Pick<PointerPress, 'at' | 'hit'>,
  context: Pick<InputContext, 'screenState' | 'dualCursorFollowing'>,
): PressRow {
  const modifiers = press.at.modifiers
  // PTD-1 beats both the arming and the hit, whatever lies under the pointer.
  if (press.at.button === 'middle') return 'PTD-1'
  if (press.at.button === 'left' && isCombo(modifiers, true, false, false)) return 'PTD-1'
  if (context.dualCursorFollowing !== null) return 'PTD-2'
  if (press.hit !== null) return 'PTD-3'
  const armed = context.screenState.armed
  if (armed.kind === 'dependency') return 'PTD-4a'
  if (armed.kind !== 'none') return 'PTD-4'
  return 'PTD-5'
}

// --------------------------------------------------------------- shapes ----

/**
 * The spellings table T-012 gives a shape, as a census the compiler keeps.
 *
 * `Record<TaskShapeKind, true>` makes a spelling missing here, or no longer
 * admitted, a compile error. Needed because `ScreenState.armed` carries the
 * shape as a bare string while `createTask` demands the generated union.
 */
const TASK_SHAPE_KINDS: Readonly<Record<TaskShapeKind, true>> = {
  rectangle: true,
  chevron: true,
  arrow: true,
  endpointSpan: true,
  milestone: true,
}

/** @purity pure */
function taskShapeKindOf(name: string): TaskShapeKind | null {
  return Object.prototype.hasOwnProperty.call(TASK_SHAPE_KINDS, name)
    ? (name as TaskShapeKind)
    : null
}

/**
 * The milestone figures of table T-012's SH-5, kept the same way as above.
 *
 * ⚠️ The order is SH-5's; table T-109 places the glyph entrances in it.
 */
const TASK_MILESTONE_GLYPHS: Readonly<Record<TaskMilestoneGlyph, true>> = {
  circle: true,
  hexagon: true,
  pentagon: true,
  diamond: true,
  square: true,
  star: true,
  triangleUp: true,
  triangleDown: true,
  // ⚠️ From here on the figures are not in area order (FR-078).
  file: true,
  box: true,
  floppyDisk: true,
  cylinder: true,
  person: true,
  smile: true,
  beerMug: true,
}

/** @purity pure */
function milestoneGlyphOf(name: string): TaskMilestoneGlyph | null {
  return Object.prototype.hasOwnProperty.call(TASK_MILESTONE_GLYPHS, name)
    ? (name as TaskMilestoneGlyph)
    : null
}

/**
 * The uid the write side will issue to the next row it creates.
 *
 * A bundle is planned before it runs, so a command naming a row an earlier
 * command creates needs a uid not yet issued. FR-001 / FR-008 take it from
 * `Project.uidHighWaterMark`, so it is a pure function of the document.
 * Not `groupId`'s road: AT-51 is a UUID and minting is impure, but AT-19 is not.
 * ⚠️ One creation per bundle: WS-3 threads documents, so a second `createTask`
 * would take mark + 2 while this still answers mark + 1.
 *
 * @purity pure
 */
function nextIssuedUid(schedule: Schedule): number {
  return schedule.project.uidHighWaterMark + 1
}

// --------------------------------------------------------------- entries ----
//
// The rows of table T-109 this file answers for, by row id -- the only join
// that table admits, as `KEY` joins table T-036.
//
// Not a roster and not a count: the other rows are absent on purpose, and the
// STOP note at the foot of this file says what each is missing.
// ⚠️ `screen-renderer.ts` reads the generated `icon-roster.json`; this component
// has no edge to that file and must not grow one, so only the row id crosses.

/** The entries this file assigns, spelled as table T-109 spells its row ids. */
const ENTRY = {
  /** IC-1 -- FR-087 (OP-2 of table T-024a). Same operation as SK-10. */
  openDocument: 'IC-1',
  /**
   * IC-2 -- FR-096, the export chooser.
   *
   * ⚠️ Not SK-11's road: the key writes `GRS JSON` to the opened file without
   * asking (DI-5 of table T-227).
   */
  exportChooser: 'IC-2',
  /** IC-3 -- FR-025, the clipboard row IO-6 of table T-024. */
  copyPicture: 'IC-3',
  /** IC-4 -- S-69, the overlay FR-015 draws. One of FR-049's toggles. */
  baselineVisible: 'IC-4',
  /** IC-5 / IC-6 -- FR-031. SK-6 / SK-7. */
  undo: 'IC-5',
  redo: 'IC-6',
  /** IC-7 -- FR-053, S-99e. SK-14. */
  palette: 'IC-7',
  /**
   * IC-8 / IC-9 -- the plan half (S-227) and the actual half (S-228), two
   * independent booleans (FR-049): a press flips its own half only.
   */
  planDisplay: 'IC-8',
  actualDisplay: 'IC-9',
  /** IC-10 -- FR-055. SK-18. */
  fitToScreen: 'IC-10',
  /** IC-11 -- FR-071, S-99f. SK-15. */
  fullScreen: 'IC-11',
  /** IC-12 .. IC-15 -- FR-018, S-75 / S-76. SK-16 / SK-16a. */
  zoomTimeOut: 'IC-12',
  zoomTimeIn: 'IC-13',
  zoomRowOut: 'IC-14',
  zoomRowIn: 'IC-15',
  /**
   * IC-16 -- S-72, the light/dark theme (FR-039). One entrance over two values,
   * so a press moves to the other (FR-029 forbids an entry per value).
   */
  themePreference: 'IC-16',
  /**
   * IC-17 -- FR-072's settings entrance.
   *
   * ⚠️ Not open-and-close: a second press returns the panel to the last chosen
   * subject, so what moves is which of the two it shows.
   */
  documentSettingsProperties: 'IC-17',
  /** IC-20 -- FR-065, S-99b. One entrance for both directions (FR-029). */
  agentApi: 'IC-20',
  /**
   * IC-18 -- FR-066, S-99i of table T-206: turns
   * `ScreenSession.isDialogueFieldVisible`, not `isAgentApiEnabled` (IC-20's).
   *
   * ⚠️ FR-029's faint-and-tell half is `frame-loop.ts`'s: `isAgentApiEnabled`
   * is not in `InputContext`, so this file cannot tell whether it was faint.
   */
  dialogueFieldVisible: 'IC-18',
  /** IC-19 -- FR-068. U-30 `AI Export Modal` of table T-103. */
  aiExportModal: 'IC-19',
  /** IC-22 -- FR-036. SK-13. */
  help: 'IC-22',
  /**
   * IC-39 / IC-40 / IC-42 / IC-43 / IC-79 / IC-80 / IC-81 -- palette toggles
   * over S-64, S-63, S-67, S-68, S-60, S-61 and S-62, boolean rows of table T-202.
   */
  progressLineVisible: 'IC-39',
  progressMarkerVisible: 'IC-40',
  dateGridLinesVisible: 'IC-42',
  groupGridLinesVisible: 'IC-43',
  assigneeVisible: 'IC-79',
  percentCompleteVisible: 'IC-80',
  dependencyVisible: 'IC-81',
  /**
   * IC-99 / IC-100 / IC-101 -- S-70, S-74 and S-58 (CM-62, CM-64, CM-56).
   *
   * ⛔ None belongs in `VISIBLE_ELEMENT_BY_ENTRY`: FR-049 takes only the boolean
   * rows of table T-202, and `fontScale` / `stackDirection` are not boolean while
   * `themeMonochrome` is table T-203's. Each row of table T-109 names its setting
   * and how a press moves it (rule ③ of the STOP note at the foot).
   */
  fontScale: 'IC-99',
  themeMonochrome: 'IC-100',
  stackDirection: 'IC-101',
  /**
   * IC-41 -- FR-020's one watermark entrance: while showing, a press raises
   * U-60 `Watermark Unlock`; while hidden, it puts the watermark back unasked.
   *
   * ⛔ Not one of FR-049's toggles: `watermarkVisible` (S-144) is in table T-206,
   * not T-202, and FR-020 (MUST NOT) forbids a symmetric toggle, which could not
   * tell the gated direction from the ungated one.
   * The press writes no document command either way: `screenStateFromEntry`
   * answers it, so `commandFromArmingEntry` gives `CONSUMED_ELSEWHERE`.
   * ⛔ Only the hiding direction is written; the STOP at `screenStateFromEntry`'s
   * arm for this entry names the missing row.
   *
   * @provisional PND-418 -- whether EN-2 of table T-237 paints this entrance
   * while the watermark shows. Nothing here paints (UF-65 does), and no reading
   * of EN-2 is taken.
   */
  watermark: 'IC-41',
  /** IC-44 -- FR-046. SK-20. */
  statusLine: 'IC-44',
  /**
   * IC-37 / IC-38 -- FR-034's alignment, on the `Command Palette`.
   *
   * ⛔ Not plannable: table T-108 has no alignment command (see the STOP at the
   * foot). Here for FR-029's other half: `isEntryUsable` (UF-65) draws both faint
   * while no `Task` is chosen, and that press must be told why -- one 場面
   * (RS-34) for both.
   */
  alignStart: 'IC-37',
  alignFinish: 'IC-38',
  /**
   * IC-45 -- the Dual Cursor entrance (S-65), both ways through table T-029a:
   * DC-1 enters, DC-4 leaves by the same entrance, and leaving clears the two
   * lines (DC-7), so there is no separate clearing entrance.
   */
  dualCursor: 'IC-45',
  /**
   * IC-47 and IC-48 -- one entry for each value of S-66 a reader may ask for.
   *
   * Each is a toggle, not a cycle: a press names its value unless that value
   * already stands, and then it means 'none' (FR-048) --
   * `commandFromGuideCursorEntry` makes that comparison.
   */
  guideCursorCrosshair: 'IC-47',
  guideCursorSingleVertical: 'IC-48',
  /**
   * IC-50 -- FR-053's milestone glyph list, opened and folded by ONE entrance.
   * The state is S-142 of table T-206, which the shell holds.
   */
  milestoneList: 'IC-50',
  /**
   * IC-75 -- FR-053's minimise toggle, on the grab band beside IC-53. The state
   * is S-200 of table T-206, which the shell holds.
   */
  paletteMinimise: 'IC-75',
  /**
   * IC-76 -- FR-102's record, started and stopped by one entrance; `S-206` and
   * its cap `S-207` of table T-206 are held by the shell.
   *
   * An ordinary palette entrance (table T-109's 表示 group), not on the grab band.
   */
  interactionRecord: 'IC-76',
  /** IC-52 -- the first level of IN-4 (table T-028). */
  closeSurface: 'IC-52',
  /**
   * IC-53 -- GR-19 of table T-023d, the band FR-053's drag is taken on.
   *
   * ⚠️ Not a button (table T-109's entry column), so `command-palette.ts` keeps
   * it out of its entries; it is here because a press still lands on it.
   */
  paletteGrabBand: 'IC-53',
  /**
   * IC-58 / IC-59 -- the open and close halves of U-47 `Row Expander`.
   *
   * ⛔ Two controls, not one toggle: HF-2 opens everything below the row (HR-3)
   * while HF-3 folds the row itself (HR-5), and that difference is how a folded
   * row is reopened (from the row above).
   */
  rowExpanderOpen: 'IC-58',
  rowExpanderClose: 'IC-59',
  /**
   * IC-77 -- HF-11 of table T-051 (HR-4): everything below the row folds, not
   * the row itself.
   *
   * ⛔ Not widened to include the row (HF-11, MUST NOT): HF-3 already does that,
   * and FR-029 forbids a second entrance.
   */
  rowExpanderCloseBelow: 'IC-77',
  /**
   * IC-90 -- HF-13 of table T-051 (HR-7): the row's direct children open.
   *
   * ⛔ A separate entrance from IC-58, not a second reading of it (HF-13).
   */
  rowExpanderOpenOneLevel: 'IC-90',
  /**
   * IC-91 -- HF-14 of table T-051 (HR-8): one row is added under this row.
   *
   * The press stands the row up with the default name and names it through
   * FR-085's road -- see `commandFromRowEntry`.
   */
  rowAddChild: 'IC-91',
  /**
   * IC-74 -- HF-10 of table T-051 (HR-1): every row opens.
   *
   * ⛔ Not drawn per row: HF-10 puts one at the top of the panel, so
   * `ScreenPart.rowGroupId` is null under it, and it is answered beside
   * `commandFromRowEntry`, not inside it.
   */
  rowExpanderOpenAll: 'IC-74',
  /**
   * IC-78 -- HF-12 of table T-051 (HR-2): every row folds. Placed beside IC-74,
   * so `ScreenPart.rowGroupId` is null under it too.
   * ⛔ Not HF-8, which discards folds rather than making them.
   */
  rowExpanderCloseAll: 'IC-78',
  /**
   * IC-92 -- HF-16 of table T-051, HR-7 pressed at 段 0; the way back for HR-2
   * and HR-6. ⛔ Not IC-74 under a second name (HF-16).
   */
  rowExpanderOpenLevelZero: 'IC-92',
  /**
   * IC-93 -- HF-17 of table T-051, HR-8 pressed at 段 0; without it the
   * shallowest level cannot be created in an empty document. Naming follows
   * HF-14.
   */
  rowAddTopRow: 'IC-93',
  /**
   * IC-60 -- FR-098. U-48 `Row Pin` of table T-103. One entrance for both
   * directions (FR-098, FR-029).
   */
  rowPin: 'IC-60',
  /**
   * IC-82 -- FR-032's deletion of the row the control was drawn on.
   *
   * The control's own row, not the chosen rows: nothing stores the chosen set
   * (PND-142) and no row says what a press means while another row is chosen.
   * ⛔ No chain here (CD-2 of table T-050, carried out by `deleteTaskGroup`,
   * R2.7) and no question (`frame-loop.ts` raises QN-1 off the returned command).
   */
  rowDelete: 'IC-82',
  /** IC-62 -- FR-099. U-49 `Resource Roster` of table T-103. */
  resourceRoster: 'IC-62',
  /**
   * IC-63 / IC-64 / IC-65 -- the roster header's entrances, each replacing who
   * is chosen.
   *
   * ⛔ IC-65 selects and does not delete, although table T-109 names CM-43
   * beside it: FR-099 deletes in two moves, so the deleting entrance stays one
   * (FR-029).
   */
  rosterChooseAll: 'IC-63',
  rosterClearChosen: 'IC-64',
  rosterChooseUnreferenced: 'IC-65',
  /**
   * IC-67 / IC-68 -- one control in two states against one person; a press on
   * either turns that person's membership round.
   *
   * ⚠️ Which way is not read off the drawn entry: a drawn screen can be a paint
   * behind (FR-048), and the set is `ScreenSession.selectedResourceUids`, which
   * the shell holds.
   */
  rosterChosen: 'IC-67',
  rosterUnchosen: 'IC-68',
} as const

// IC-53's drag runs through three units:
//
//   1. `dom-screen-surface.ts` (PI-38) lays the band across the palette's top
//      edge with `data-icon`, so `readScreenPartAt` (IF-9) answers
//      `{ part: 'Command Palette', entry: 'IC-53' }`. Only it knows the width,
//      since FR-053 sizes the palette by its contents (Chapter 5.3, table T-065).
//   2. The band's height is `S-135a` of table T-206, generated into
//      `command-palette.ts`.
//   3. `frame-loop.ts` records the press, fills `PointerPress.followedTo` so
//      `paletteFollow` reports the following, holds
//      `ScreenSession.commandPaletteAt`, and keeps the start corner for IN-1's
//      interruption (`Esc`, IN-1a's lost pointer).
//
// ⚠️ The band must stay drawn over what it covers: GR-19 wins table T-023d by
// being first, and `press.on` is the drawing side's answer, so nothing here
// enforces the priority.

/**
 * What FR-049's toggles name, derived from the command.
 *
 * Not imported: table T-064 does not name `VisibleElement`, and check 26b
 * refuses the import (LR-2). Derived like `GuideCursorMode` and `FontScale`
 * below, so a renamed member stops this compiling.
 */
type VisibleElement = Extract<DocumentCommand, { kind: 'setElementVisible' }>['element']

/**
 * The entries that flip one boolean row of table T-202, and which row.
 *
 * FR-049's boolean rows, narrowed to those table T-109 gives an entrance.
 * ⛔ IC-41 is out: `S-144` is in table T-206, and FR-020 (MUST NOT) forbids a
 * symmetric toggle even if the row moved back; `ENTRY.watermark` carries it.
 * IC-4 sits on the header and the rest on the palette; one map, because the
 * press rule is the same.
 */
const VISIBLE_ELEMENT_BY_ENTRY: Readonly<Record<string, VisibleElement>> = {
  'IC-4': 'baselineVisible',
  'IC-8': 'planVisible',
  'IC-9': 'actualVisible',
  'IC-39': 'progressLineVisible',
  'IC-40': 'progressMarkerVisible',
  'IC-42': 'dateGridLinesVisible',
  'IC-43': 'groupGridLinesVisible',
  'IC-79': 'assigneeVisible',
  'IC-80': 'percentCompleteVisible',
  'IC-81': 'dependencyVisible',
}

/** @purity pure */
function visibleElementOfEntry(entry: string): VisibleElement | null {
  return Object.prototype.hasOwnProperty.call(VISIBLE_ELEMENT_BY_ENTRY, entry)
    ? (VISIBLE_ELEMENT_BY_ENTRY[entry] as VisibleElement)
    : null
}

/** The three values S-66 admits, taken from the command rather than restated. */
type GuideCursorMode = Extract<DocumentCommand, { kind: 'setGuideCursorMode' }>['mode']

/**
 * The value each of IC-47 and IC-48 puts into S-66, as table T-109 and S-66
 * spell them.
 *
 * ⛔ 'none' is not in this map and may not be put back: FR-048 gives it no
 * entrance; it is reached by pressing the standing entry again.
 */
const GUIDE_CURSOR_MODE_BY_ENTRY: Readonly<Record<string, GuideCursorMode>> = {
  'IC-47': 'crosshair',
  'IC-48': 'single-vertical',
}

/** @purity pure */
function guideCursorModeOfEntry(entry: string): GuideCursorMode | null {
  return Object.prototype.hasOwnProperty.call(GUIDE_CURSOR_MODE_BY_ENTRY, entry)
    ? (GUIDE_CURSOR_MODE_BY_ENTRY[entry] as GuideCursorMode)
    : null
}

/** The three steps S-70 admits, taken from the command rather than restated. */
type FontScale = Extract<DocumentCommand, { kind: 'setFontScale' }>['scale']

/**
 * The steps of S-70, in the order table T-215 prints them (ascending by size),
 * which is the order IC-99 steps through.
 *
 * ⛔ No px here: `fontScaleSizes` is table T-215's, read on the write side.
 */
const FONT_SCALE_STEPS: readonly FontScale[] = ['S', 'M', 'L']

/**
 * The step a press on IC-99 moves to, wrapping past the last one (IC-99's row).
 *
 * ⚠️ A value outside the three answers the first step, so a document holding
 * something S-70 does not admit still moves rather than sticking.
 *
 * @purity pure
 */
function nextFontScale(current: FontScale): FontScale {
  const at = FONT_SCALE_STEPS.indexOf(current)
  return FONT_SCALE_STEPS[(at + 1) % FONT_SCALE_STEPS.length] as FontScale
}

/**
 * The palette entries that arm, and what each arms -- table T-023b through
 * table T-109's `Command Palette` rows.
 *
 * Task shapes are `TaskShapeKind`'s (SH-1 .. SH-4); glyphs are
 * `TaskMilestoneGlyph`'s, in SH-5's order, which table T-109 follows.
 * ⚠️ `Armed` types both as bare strings, so the compiler does not check these
 * against the unions -- re-read the orders if a row moves.
 */
const ARMED_BY_ENTRY: Readonly<Record<string, Armed>> = {
  'IC-23': { kind: 'taskShape', shapeKind: 'rectangle' },
  'IC-24': { kind: 'taskShape', shapeKind: 'chevron' },
  'IC-25': { kind: 'taskShape', shapeKind: 'arrow' },
  'IC-26': { kind: 'taskShape', shapeKind: 'endpointSpan' },
  'IC-27': { kind: 'milestoneShape', glyph: 'circle' },
  'IC-28': { kind: 'milestoneShape', glyph: 'hexagon' },
  'IC-29': { kind: 'milestoneShape', glyph: 'pentagon' },
  'IC-30': { kind: 'milestoneShape', glyph: 'diamond' },
  'IC-31': { kind: 'milestoneShape', glyph: 'square' },
  'IC-32': { kind: 'milestoneShape', glyph: 'star' },
  'IC-33': { kind: 'milestoneShape', glyph: 'triangleUp' },
  'IC-34': { kind: 'milestoneShape', glyph: 'triangleDown' },
  // ⛔ Without these rows the entries are drawn but arm nothing: the roster,
  // figure and enum all admit them, and nothing else fails.
  'IC-83': { kind: 'milestoneShape', glyph: 'file' },
  'IC-84': { kind: 'milestoneShape', glyph: 'box' },
  'IC-85': { kind: 'milestoneShape', glyph: 'floppyDisk' },
  'IC-86': { kind: 'milestoneShape', glyph: 'cylinder' },
  'IC-87': { kind: 'milestoneShape', glyph: 'person' },
  'IC-88': { kind: 'milestoneShape', glyph: 'smile' },
  'IC-89': { kind: 'milestoneShape', glyph: 'beerMug' },
  /** AR-5 of table T-023b (FR-019). */
  'IC-35': { kind: 'commentBox' },
  /** AR-6 (FR-019). */
  'IC-36': { kind: 'highlightBox' },
  /** AR-4 (FR-009). */
  'IC-61': { kind: 'dependency' },
}

/** @purity pure */
function armedByEntry(entry: string): Armed | null {
  return Object.prototype.hasOwnProperty.call(ARMED_BY_ENTRY, entry)
    ? (ARMED_BY_ENTRY[entry] as Armed)
    : null
}

/**
 * Whether two arms are the same one, which is what SP-4 turns on.
 *
 * ⚠️ Shape and glyph are compared too: IC-30 and IC-31 are different entries of
 * the same kind, and comparing kinds alone would let the square disarm the
 * diamond.
 *
 * @purity pure
 */
function isSameArm(held: Armed, pressed: Armed): boolean {
  if (held.kind !== pressed.kind) return false
  if (held.kind === 'taskShape' && pressed.kind === 'taskShape') {
    return held.shapeKind === pressed.shapeKind
  }
  if (held.kind === 'milestoneShape' && pressed.kind === 'milestoneShape') {
    return held.glyph === pressed.glyph
  }
  return true
}

// =========================================================== the members ====

/**
 * What one happening is assigned to, and whether the browser must be silenced.
 *
 * The assignments are table T-023 and table T-036 (PI-18). Table T-023a decides
 * a press first, within the schedule's drawing area only.
 *
 * @purity pure
 */
export function commandFromInput(input: HumanInput, context: InputContext): TranslatedInput {
  switch (input.kind) {
    case 'key':
      return commandFromKey(input, context)
    case 'wheel':
      return commandFromWheel(input, context)
    case 'pointer':
      return commandFromPointer(input, context)
  }
}

// ------------------------------------------- PI-18: a settled field value ---
//
// PI-18's member (table T-064) turning a value settled in the `Properties
// Panel` (IF-9) into rows of table T-108.
//
// The answer is a list the caller writes as one bundle, so one settled value is
// one undo step (FR-031). An empty list must not be written: WS-4 would push a
// step for an edit nobody made.
//
// No subject is worked out here: `FieldCommit.key` already names the column the
// panel drew (FR-072, table T-023c). Re-reading that rule on this side would
// disagree with the panel whenever the selection changed between drawing and
// commit.

/**
 * What a settled text means for a nullable column.
 *
 * The empty string is `null`, not a refusal: clearing a field is how a person
 * says "never set", which FR-007 tells apart from a chosen value.
 *
 * @purity pure
 */
function settledText(text: string): string | null {
  const trimmed = text.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * The same for a number column.
 *
 * `undefined` is a refusal and `null` an empty column: writing 0 for a
 * non-number would put a value nobody typed into the document. Bounds are not
 * checked here; the write path judges them.
 *
 * @purity pure
 */
function settledNumber(text: string): number | null | undefined {
  const held = settledText(text)
  if (held === null) return null
  const value = Number(held)
  return Number.isFinite(value) ? value : undefined
}

/**
 * The same for a date column, spelled the way the document keeps dates.
 *
 * `dayOf` / `textOfDay` are the one place FR-054's reading and writing live.
 *
 * @purity pure
 */
function settledDay(text: string): string | null | undefined {
  const held = settledText(text)
  if (held === null) return null
  const day = dayOf(held)
  return day === null ? undefined : textOfDay(day)
}

/** A truth value in the spelling the panel wrote it out in. @purity pure */
function settledTruth(text: string): boolean {
  return text.trim() === String(true)
}

type VisualColumn = keyof Schedule['taskVisuals'][number]

// Derived from the column rather than imported: table T-064 limits what may
// cross a component folder, and neither type is on it.
type TaskLineWeight = NonNullable<Schedule['taskVisuals'][number]['lineWeight']>
type TaskNameAlign = NonNullable<Schedule['taskVisuals'][number]['nameAlign']>

/**
 * Whether a settled word is one of the values a drawn column admits.
 *
 * The roster is `COLUMN_SHAPES` (generated from the schema), never written out
 * here (the paragraph under table T-016, MUST NOT). Where the value reaches a
 * `DocumentCommand`, the cast relies on both rosters being generated from
 * `erd.json`.
 *
 * @purity pure
 */
function isVisualChoice(column: VisualColumn, value: string): boolean {
  return COLUMN_SHAPES.TaskVisual[column]?.choices?.includes(value) ?? false
}

/**
 * The five columns of table T-019 with the one a person settled replaced, as the
 * row CM-13 places.
 *
 * CM-13 places a whole row while a field carries one column, so the row is read
 * off the resulting columns with `planActualState` (table T-019a); the two tables
 * join on the state, not on their numbering.
 *
 * `null` where the row cannot be written: four of the five rows need
 * `actualStart` and `actualDuration`, and no duration is invented here.
 *
 * @purity pure
 */
function planActualWithColumn(task: Task, column: keyof Task, text: string): PlacedPlanActual | null {
  const next: Task = { ...task }
  // Written by name: five arms would repeat the classification below five times.
  const written = next as unknown as { [key: string]: unknown }
  if (column === 'resumeValid') {
    written[column] = settledTruth(text)
  } else if (column === 'actualDuration') {
    const days = settledNumber(text)
    if (days === undefined) return null
    written[column] = days
  } else {
    const day = settledDay(text)
    if (day === undefined) return null
    written[column] = day
    // FR-044 binds `resumeValid` to `resume` both ways, written before the row
    // is read. Without `true` a date put on PA-4 is discarded and the state
    // stays; without `false` a cleared date falls to PS-5 and the suspension
    // silently ends. `false` only where a date stood: on an empty column it
    // would suspend a task PS-5 holds. Judged here, not in `edit-task.ts`,
    // because CM-13 places the whole row this settling names.
    if (column === 'resume' && day !== null) {
      written['resumeValid'] = true
    }
    if (column === 'resume' && day === null && task.resume !== null) {
      written['resumeValid'] = false
    }
  }

  const state = planActualState(next)
  if (state === 'notStarted') return { row: 'PA-1' }

  const actualStart = next.actualStart
  const actualDuration = next.actualDuration
  if (actualStart === null || actualDuration === null) return null

  switch (state) {
    case 'inProgress':
      return { row: 'PA-2', actualStart, actualDuration }
    case 'suspendedResumePlanned':
      return next.resume === null
        ? null
        : { row: 'PA-3', actualStart, actualDuration, resume: next.resume }
    case 'suspendedResumeUnknown':
      return { row: 'PA-4', actualStart, actualDuration }
    case 'finished':
      return next.actualFinish === null
        ? null
        : { row: 'PA-5', actualStart, actualDuration, actualFinish: next.actualFinish }
  }
}

/** The five columns table T-019 places together, which CM-13 writes as one row. */
const PLAN_ACTUAL_COLUMNS: readonly (keyof Task)[] = [
  'actualStart',
  'actualDuration',
  'actualFinish',
  'resume',
  'resumeValid',
]

/**
 * A value settled on a column of `Task` (table T-016).
 *
 * PR-3 carries its sibling: CM-11 places both plan dates, so the unsettled one is
 * taken from the task as it stands (FR-006).
 *
 * PR-16 (the assignee) is not a `Task` column; `commandsFromAssignee` takes it by
 * row id.
 *
 * @purity pure
 */
function commandFromTaskColumn(
  task: Task,
  column: keyof Task,
  text: string,
): readonly DocumentCommand[] {
  const uid = task.uid

  if (PLAN_ACTUAL_COLUMNS.includes(column)) {
    const place = planActualWithColumn(task, column, text)
    return place === null ? [] : [{ kind: 'setTaskPlanActualState', uid, place }]
  }

  switch (column) {
    case 'name':
      return [{ kind: 'setTaskName', uid, name: settledText(text) }]
    case 'notes':
      return [{ kind: 'setTaskNotes', uid, notes: settledText(text) }]
    case 'start':
    case 'finish': {
      const settled = settledDay(text)
      // CM-11 takes both dates and neither is nullable, so a cleared field
      // names no command.
      if (settled === undefined || settled === null) return []
      const start = column === 'start' ? settled : task.start
      const finish = column === 'finish' ? settled : task.finish
      if (start === null || finish === null) return []
      return [{ kind: 'setTaskPlanDates', uid, start, finish }]
    }
    case 'deadline': {
      const deadline = settledDay(text)
      return deadline === undefined ? [] : [{ kind: 'setTaskDeadline', uid, deadline }]
    }
    case 'fadeInDays': {
      const days = settledNumber(text)
      return days === undefined ? [] : [{ kind: 'setTaskFadeInDays', uid, days }]
    }
    case 'fadeOutDays': {
      const days = settledNumber(text)
      return days === undefined ? [] : [{ kind: 'setTaskFadeOutDays', uid, days }]
    }
    case 'wbsParentUid': {
      const parentUid = settledNumber(text)
      return parentUid === undefined ? [] : [{ kind: 'setTaskWbsParent', uid, parentUid }]
    }
    default:
      return []
  }
}

/**
 * A value settled on a column of `TaskVisual` (FR-007's colours and weight,
 * FR-078's glyph, FR-002's name placement).
 *
 * No arm for the shape: FR-083 leaves it to the palette and table T-016 has no
 * item for it, so an arm here would be an entrance no table opens.
 *
 * Both colours empty is CM-23 (back to the theme); anything else is CM-22 with
 * the other colour carried.
 *
 * @purity pure
 */
function commandFromVisualColumn(
  schedule: Schedule,
  uid: number,
  column: string,
  text: string,
): readonly DocumentCommand[] {
  const visual = schedule.taskVisuals.find((held) => held.taskUid === uid) ?? null

  switch (column) {
    case 'milestoneGlyph': {
      const held = settledText(text)
      const glyph = held === null ? null : milestoneGlyphOf(held)
      // An unknown word is a value nobody could have chosen; a cleared field
      // takes the glyph off (FR-078).
      if (held !== null && glyph === null) return []
      return [{ kind: 'setTaskVisualMilestoneGlyph', uid, glyph }]
    }
    case 'strokeColor':
    case 'fillColor': {
      const chosen = settledText(text)
      const other =
        column === 'strokeColor' ? (visual?.fillColor ?? null) : (visual?.strokeColor ?? null)
      if (chosen === null && other === null) return [{ kind: 'resetTaskVisualColors', uid }]
      const strokeColor = column === 'strokeColor' ? chosen : other
      const fillColor = column === 'fillColor' ? chosen : other
      return [{ kind: 'setTaskVisualColors', uid, fillColor, strokeColor }]
    }
    case 'lineWeight': {
      const held = settledText(text)
      if (held !== null && !isVisualChoice('lineWeight', held)) return []
      const lineWeight = held as TaskLineWeight | null
      return [{ kind: 'setTaskVisualLineWeight', uid, lineWeight }]
    }
    case 'nameAnchor':
    case 'nameAlign': {
      const anchor = column === 'nameAnchor' ? settledNumber(text) : (visual?.nameAnchor ?? null)
      if (anchor === undefined) return []
      const chosen = column === 'nameAlign' ? settledText(text) : (visual?.nameAlign ?? null)
      if (chosen !== null && !isVisualChoice('nameAlign', chosen)) return []
      const nameAlign = chosen as TaskNameAlign | null
      return [{ kind: 'setTaskVisualNamePlacement', uid, nameAnchor: anchor, nameAlign }]
    }
    default:
      return []
  }
}

/**
 * A value settled on the row FR-042 puts on this panel.
 *
 * CM-30 / CM-31 pair like CM-22 / CM-23: a cleared colour follows the theme again
 * (AT-58) through its own command, and CM-30's colour is not nullable.
 *
 * @purity pure
 */
function commandFromGroupColumn(
  groupId: string,
  column: string,
  text: string,
): readonly DocumentCommand[] {
  switch (column) {
    case 'label': {
      // AT-53 (FR-042, FR-085), written with CM-29. An emptied field is `null`,
      // AT-53's "no name"; a row that needs a name (AT-54, FR-058) is refused by
      // the use case, not here.
      return [{ kind: 'setTaskGroupLabel', groupId, label: settledText(text) }]
    }
    case 'color': {
      const color = settledText(text)
      return color === null
        ? [{ kind: 'resetTaskGroupColor', groupId }]
        : [{ kind: 'setTaskGroupColor', groupId, color }]
    }
    case 'height': {
      const height = settledNumber(text)
      return height === undefined ? [] : [{ kind: 'setTaskGroupHeight', groupId, height }]
    }
    default:
      return []
  }
}

/**
 * A value settled on the dependency line FR-009 puts on the panel.
 *
 * STOP -- only the lag has a row of table T-108 (CM-38); no command changes
 * `linkType` or moves a dependency to another predecessor (CM-36 draws one,
 * CM-37 deletes one). Looked in table T-108, FR-009, table T-058 (AT-45 / AT-46)
 * and table T-018. Nothing is written for the other two columns.
 *
 * CM-38's lag is not nullable (see `edit-dependency.ts`), so a cleared field
 * names no command.
 *
 * @purity pure
 */
function commandFromDependencyColumn(
  predecessorUid: number,
  successorUid: number,
  column: string,
  text: string,
): readonly DocumentCommand[] {
  if (column !== 'lag') return []
  const lag = settledNumber(text)
  if (lag === undefined || lag === null) return []
  return [{ kind: 'setDependencyLag', predecessorUid, successorUid, lag }]
}

/**
 * The document's own columns; only the name (`U-27` of table T-103) is settled
 * in a field.
 *
 * CM-1 is the whole answer (FR-035). No other `Project` column is drawn as a
 * field: FR-074's surface writes CM-2 and keeps the name out (MUST NOT).
 *
 * The empty title is not refused here: CM-1's rule lives in `edit-project.ts`,
 * where the refusal can be told (FR-076).
 *
 * @purity pure
 */
function commandFromProjectColumn(column: string, text: string): readonly DocumentCommand[] {
  if (column !== 'title') return []
  return [{ kind: 'setProjectTitle', title: text }]
}

/**
 * The row of table T-016 the assignee stands on.
 *
 * Dispatched by row id, not column: PR-16 is not a `Task` column, so no arm of
 * `PropertyFieldKey` names it, while IF-9 returns the row id beside the key.
 */
const ASSIGNEE_ROW = 'PR-16'

/**
 * AS-3's unassign signal. The spelling is the specification's (AS-2), and AS-4
 * forbids a `Resource` of it, so it never collides with a name.
 */
const UNASSIGN_TOKEN = '-'

/**
 * The smallest uid carrying this name (AS-8).
 *
 * Scanned rather than indexed: this runs once per settled value, not per frame.
 *
 * @purity pure
 */
function resourceUidOfName(schedule: Schedule, name: string): number | null {
  let found: number | null = null
  for (const resource of schedule.resources) {
    if (resource.name !== name) continue
    if (found === null || resource.uid < found) found = resource.uid
  }
  return found
}

/**
 * The `uid` a candidate of PR-16's chooser carries, when the roster still holds
 * it (AS-9).
 *
 * A `uid` no longer on the roster answers `null` so the text is read as a name:
 * the person may have gone between drawing the chooser and the commit. Asked of
 * the roster, not the spelling alone, so a name made of digits still reaches
 * AS-7 / AS-8 unless someone is numbered that.
 *
 * @purity pure
 */
function resourceUidOfChoice(schedule: Schedule, text: string): number | null {
  const uid = Number(text)
  if (!Number.isInteger(uid)) return null
  return schedule.resources.some((one) => one.uid === uid) ? uid : null
}

/**
 * AS-3's unassign, for the one assignment it can name. AS-7's release uses the
 * same function.
 *
 * STOP -- a task with several assignees is left alone: which one to take off is
 * not specified. Looked in table T-225 (AS-3 / AS-5 / AS-6 / AS-7 / AS-9),
 * FR-008 and table T-016.
 *
 * An assignment with no `Resource` is skipped: CM-45 names a Task-and-Resource
 * pair.
 *
 * @purity pure
 */
function commandsFromUnassign(schedule: Schedule, taskUid: number): readonly DocumentCommand[] {
  const held = new Set<number>()
  for (const assignment of schedule.assignments) {
    if (assignment.taskUid !== taskUid || assignment.resourceUid === null) continue
    held.add(assignment.resourceUid)
  }
  if (held.size !== 1) return []
  const [resourceUid] = [...held]
  if (resourceUid === undefined) return []
  return [{ kind: 'unassignResource', taskUid, resourceUid }]
}

/**
 * A `uid` or a name settled on PR-16, as rows of table T-108.
 *
 * The `uid` is asked first because the chooser commits it (AS-9); a name is
 * AS-7 / AS-8 / AS-10. Only AS-7 (a name not on the roster) also releases a sole
 * assignee; AS-8 / AS-9 / AS-10 seat without taking anyone off. Nothing here is a
 * rename (AS-7, MUST NOT).
 *
 * The commands are one list so they land as one bundle and one undo step (AS-7,
 * AG-3 of table T-035, FR-031). The made resource's uid is the high-water mark
 * plus one (FR-008), read the same way the write side reads it.
 *
 * @purity pure
 */
function commandsFromAssignee(
  schedule: Schedule,
  taskUid: number,
  text: string,
): readonly DocumentCommand[] {
  const settled = settledText(text)
  // A cleared field is not AS-3's unassign, whose one signal is `-`; FR-008
  // keeps an assignment until someone takes it off.
  if (settled === null) return []
  if (settled === UNASSIGN_TOKEN) return commandsFromUnassign(schedule, taskUid)

  const held = resourceUidOfChoice(schedule, settled) ?? resourceUidOfName(schedule, settled)
  if (held !== null) {
    // AS-10: a person already on this task adds nothing. CM-44 would refuse it
    // (FR-008) and throw the whole bundle away.
    const already = schedule.assignments.some(
      (one) => one.taskUid === taskUid && one.resourceUid === held,
    )
    return already ? [] : [{ kind: 'createAssignment', taskUid, resourceUid: held }]
  }

  return [
    { kind: 'createResource', name: settled },
    {
      kind: 'createAssignment',
      taskUid,
      resourceUid: nextIssuedUid(schedule),
    },
    // AS-7's release, appended after CM-40 / CM-44 as the paragraph under table
    // T-225 orders the bundle. CM-45 does not touch the high-water mark, so the
    // uid handed to CM-44 is unaffected by its position.
    ...commandsFromUnassign(schedule, taskUid),
  ]
}

/**
 * PI-18's member: the value settled in one field of the `Properties Panel`, as
 * rows of table T-108.
 *
 * An empty answer means the settled value names no command.
 *
 * @purity pure
 */
export function commandFromFieldCommit(
  commit: FieldCommit,
  context: InputContext,
): readonly DocumentCommand[] {
  const schedule = context.document.schedule
  const key = commit.key

  // Row before holder for the assignee: PR-16's substance is `Assignment`, so
  // the key only says whose panel this is and the row id says what.
  if (commit.row === ASSIGNEE_ROW && key.holder === 'task') {
    return taskByUid(schedule, key.uid) === null
      ? []
      : commandsFromAssignee(schedule, key.uid, commit.text)
  }

  switch (key.holder) {
    case 'task': {
      const task = taskByUid(schedule, key.uid)
      // The subject may have gone between the frame that drew the field and
      // this commit; nothing is written for it. The arms below check the same.
      return task === null ? [] : commandFromTaskColumn(task, key.column, commit.text)
    }
    case 'taskVisual':
      return taskByUid(schedule, key.uid) === null
        ? []
        : commandFromVisualColumn(schedule, key.uid, key.column, commit.text)
    case 'taskGroup':
      return schedule.taskGroups.some((held) => held.id === key.groupId)
        ? commandFromGroupColumn(key.groupId, key.column, commit.text)
        : []
    case 'commentBox':
      // PR-21 of table T-016, reached by MK-13's double click. An emptied field
      // is `null` (AT-112).
      return schedule.commentBoxes.some((held) => held.id === key.id)
        ? [{ kind: 'setCommentBoxText', id: key.id, text: settledText(commit.text) }]
        : []
    case 'dependency': {
      const successor = taskByUid(schedule, key.successorUid)
      const dependency = successor?.dependencies[key.ordinal]
      if (dependency === undefined) return []
      return commandFromDependencyColumn(
        dependency.predecessorUid,
        key.successorUid,
        key.column,
        commit.text,
      )
    }
    // No existence check: a document always holds exactly one `Project`.
    case 'project':
      return commandFromProjectColumn(key.column, commit.text)
  }
}

/**
 * Table T-036, row by row, in that table's printed order.
 *
 * IN-5a is read first rather than per row: it turns three rows off at once and
 * hands two back to the browser, and written per row it would be three chances
 * to forget it.
 *
 * @purity pure
 */
function commandFromKey(input: KeyInput, context: InputContext): TranslatedInput {
  const key = input.key
  const modifiers = input.modifiers
  const plain = isCombo(modifiers, false, false, false)
  const ctrl = isCombo(modifiers, true, false, false)
  const ctrlShift = isCombo(modifiers, true, true, false)
  const shiftOnly = isCombo(modifiers, false, true, false)
  const altOnly = isCombo(modifiers, false, false, true)

  if (context.isTextEntryUnsettled) {
    // IN-5a: single-character keys and `Delete` / `Backspace` are left to the
    // browser, which puts the characters in and takes them out.
    if (plain && isSingleCharacterKey(key)) return UNASSIGNED
    if (plain && (key === KEY.del || key === KEY.backspace)) return UNASSIGNED
    // MK-10's exception: `Ctrl+C` / `Ctrl+V` go to the browser.
    if (ctrl && (key === KEY.c || key === KEY.v)) return UNASSIGNED
    // `Esc` is not let through: IN-4's second level is the unsettled edit
    // (`escapeTarget` answers `'textEntry'`), but this pure unit holds no field,
    // so the side that drew the control puts the value back.
  }

  // SK-19, in its stages: a standing notice is dismissed first (NT-8), then a
  // held field is settled, then a showing `Properties Panel` is put away (the
  // focus is not asked about), then a selection is let go. With none of those
  // `Enter` stays unassigned: MK-10 would otherwise take keyboard activation
  // from every control a person has tabbed to.
  // One kind for the settle and panel stages: only `frame-loop.ts` knows whether
  // its commit settled anything (`didSettleFieldEntry`).
  if (plain && key === KEY.enter) {
    if (context.isNoticeStanding === true) return acted({ kind: 'dismissNotice' })
    if (context.isTextEntryUnsettled) return acted({ kind: 'settleTextEntry' })
    if (context.isPropertiesPanelShowing === true) return acted({ kind: 'settleTextEntry' })
    // Letting go of the selection is a `Selection` value (UN-9) that
    // `selectionFromInput` answers; this answer carries MK-10's half.
    return context.selection.items.length > 0 ? CONSUMED_ELSEWHERE : UNASSIGNED
  }

  // SK-8 -- the rule is IN-4, and the consuming is `screenStateFromInput`'s.
  // IN-4a: with nothing to consume the key reaches the browser.
  if (plain && key === KEY.escape) {
    return escapeTarget(context.screenState, escapeContextOf(context)) === null
      ? UNASSIGNED
      : CONSUMED_ELSEWHERE
  }

  // SK-2 -- the selection is `selectionFromInput`'s answer (SL-5).
  if (ctrl && key === KEY.a) return CONSUMED_ELSEWHERE

  // SK-3 -- the targets are SL-1's, and the chain each one drags with it is
  // table T-050's, which `editDocument` applies.
  if (plain && (key === KEY.del || key === KEY.backspace)) {
    return changed(deleteCommandsFor(context))
  }

  if (ctrl && key === KEY.c) return acted({ kind: 'copySelection' }) // SK-4
  if (ctrl && key === KEY.v) return acted({ kind: 'pasteClipboard' }) // SK-5
  if (ctrl && key === KEY.z) return acted({ kind: 'undoEdit' }) // SK-6
  // SK-7
  if (ctrl && key === KEY.y) return acted({ kind: 'redoEdit' })
  if (ctrlShift && key === KEY.z) return acted({ kind: 'redoEdit' })
  // SK-9 -- FR-035 is the one entrance to the document's name (FR-029).
  if (plain && key === KEY.f2) {
    return acted({ kind: 'editInPlace', target: { kind: 'documentTitle' } })
  }
  if (ctrl && key === KEY.o) return acted({ kind: 'openDocumentFile' }) // SK-10
  if (ctrl && key === KEY.s) return acted({ kind: 'saveDocumentFile' }) // SK-11
  if (ctrl && key === KEY.r) return acted({ kind: 'reopenDocumentFile' }) // SK-21

  // SK-12 / SK-13 / SK-14 / SK-15 -- these land in `ScreenState`.
  if (ctrlShift && key === KEY.e) return CONSUMED_ELSEWHERE
  if (plain && (key === KEY.f1 || key === KEY.p || key === KEY.f11)) return CONSUMED_ELSEWHERE

  // SK-16 / SK-16a -- one axis each, by the same step the wheel turns by.
  if (shiftOnly && (key === KEY.plus || key === KEY.minus)) {
    const factor = keyZoomFactor(context, key === KEY.plus)
    return changed(zoomWrites(context, zoomTimes(context, factor, 'x'), null, null, null))
  }
  if (altOnly && (key === KEY.plus || key === KEY.minus)) {
    const factor = keyZoomFactor(context, key === KEY.plus)
    return changed(zoomWrites(context, null, zoomTimes(context, factor, 'y'), null, null))
  }

  // SK-17. The 1 is the multiplicative identity, not S-75's stored default:
  // reading the default would move this key the day the default moved (S-76).
  if (ctrl && key === KEY.zero) {
    return changed(zoomWrites(context, 1, 1, null, null))
  }

  // SK-18 -- FR-055. The zoom is measured from the layout this frame ran, and
  // the place the fit worked out is written down with it (see `fitCommand`).
  if (plain && key === KEY.f) return changedInOrder(fitWrites(context))

  // SK-20 -- FR-046. The clock is the shell's (LY-5), so today arrives as a
  // value.
  if (ctrlShift && key === KEY.d) {
    return changed([
      context.document.schedule.project.statusDate === null
        ? { kind: 'setStatusDate', date: context.today }
        : { kind: 'clearStatusDate' },
    ])
  }

  // SK-1 / SK-1a have no keyboard route (RC-10 of table T-026). Everything else
  // is unassigned, and MK-10 forbids taking it.
  return UNASSIGNED
}

/**
 * MK-1 to MK-5.
 *
 * During a drag the wheel does not zoom or scroll (the rule after table T-023d),
 * but the turn stays assigned so MK-10 still stops the page scrolling under it.
 *
 * @provisional PND-13
 * @purity pure
 */
function commandFromWheel(input: WheelInput, context: InputContext): TranslatedInput {
  const modifiers = input.modifiers
  const plain = isCombo(modifiers, false, false, false)
  const ctrl = isCombo(modifiers, true, false, false)
  const shiftOnly = isCombo(modifiers, false, true, false)
  const altOnly = isCombo(modifiers, false, false, true)
  const ctrlShift = isCombo(modifiers, true, true, false)

  const assigned = plain || ctrl || shiftOnly || altOnly || ctrlShift
  if (!assigned) return UNASSIGNED // MK-12's principle: not ours, so not stopped.
  if (!isWheelHere(context, input.x, input.y)) return UNASSIGNED
  if (context.pressed !== null) return CONSUMED_ELSEWHERE

  // A negative count (away from the person) magnifies. No row settles the
  // direction; S-53 being a multiplier above 1 is written for this reading.
  const factor = Math.pow(context.zoomStep, -input.notches)

  // Only the wheel zooms carry a pointer, so only they hand `zoomWrites` an x
  // (MK-2, FR-016).
  if (ctrl) {
    return changed(
      zoomWrites(
        context,
        zoomTimes(context, factor, 'x'),
        zoomTimes(context, factor, 'y'),
        input.x,
        input.y,
      ),
    )
  }
  if (shiftOnly) {
    return changed(zoomWrites(context, zoomTimes(context, factor, 'x'), null, input.x, input.y))
  }
  if (altOnly) return changed(zoomWrites(context, null, zoomTimes(context, factor, 'y'), input.x, input.y))

  // MK-1 / MK-5 -- the device's own distance (S-96).
  //
  // MK-5 falls back to the vertical distance: a wheel turn is reported on the
  // vertical axis whatever modifiers are held, so the horizontal axis alone
  // measured zero. A real sideways report (tilt wheel, trackpad) is believed
  // first; `wheelTurn` (PI-27) makes the same fallback for the detent count.
  const sideways = input.scrollPx.x !== 0 ? input.scrollPx.x : input.scrollPx.y
  // A plain turn with no vertical distance is neither MK-1 nor MK-5 (table T-023
  // has no row for it); without this the branch below rewrote the position in
  // force and zeroed S-176. Unassigned, not consumed: MK-10 covers modified input
  // only, as `isWheelHere` reads it.
  if (plain && input.scrollPx.y === 0) return UNASSIGNED
  const moved = plain
    ? scrolledAnchor(context, 0, input.scrollPx.y)
    : scrolledAnchor(context, sideways, 0)
  const to = {
    kind: 'setScrollPosition',
    scrollDate: moved.scrollDate,
    // MK-5 moves by the distance turned (S-177 holds any part of a day); MK-1
    // passes zero on this axis.
    scrollDayOffset: moved.scrollDayOffset,
    // MK-1 -- `rowTurnedTo` (a one-row floor). MK-5 decides no vertical place.
    scrollGroupId: plain ? rowTurnedTo(context, input.scrollPx.y) : moved.scrollGroupId,
    // A detent lands on a row; `moved.scrollGroupOffset` beside a floored id
    // would spell a place nobody asked for.
    scrollGroupOffset: plain ? 0 : moved.scrollGroupOffset,
  } as const
  // A turn against the end of the schedule spells the position in force; writing
  // it would make WS-4 push a step and cost a frame. Still assigned, so the
  // browser does not scroll the page under it.
  return isScrollPositionInForce(context, to) ? CONSUMED_ELSEWHERE : changed([to])
}

/**
 * Whether this position is the one the document already holds.
 *
 * The four members are all of what CM-66 writes (S-77, S-78, S-176, S-177); one
 * left out would make a real movement read as none.
 *
 * @purity pure
 */
function isScrollPositionInForce(
  context: InputContext,
  to: Extract<DocumentCommand, { kind: 'setScrollPosition' }>,
): boolean {
  const settings = context.document.documentSettings
  return (
    to.scrollDate === settings.scrollDate &&
    to.scrollGroupId === settings.scrollGroupId &&
    to.scrollDayOffset === settings.scrollDayOffset &&
    to.scrollGroupOffset === settings.scrollGroupOffset
  )
}

// FR-016's zoom centre: `dayHeldStill` holds the day and `rowHeldStill` the row.
// The row half asks `rowPlacesAtZoomY` (PI-5) because the row axis is not linear
// in `zoomY` and this file lays nothing out (MN-6 of table T-070); the day half
// needs no second layout because `pxPerDay` is linear in `zoomX`.

/**
 * A press, a move, a release or a lost pointer.
 *
 * MK-12 is applied here, after table T-023a has decided the gesture: read earlier
 * it would make the gesture inert, and read per branch it would be one chance to
 * forget it per row.
 *
 * @purity pure
 */
function commandFromPointer(input: PointerInput, context: InputContext): TranslatedInput {
  const assigned = pointerAssignment(input, context)
  return isAssignedPointerCombo(gestureModifiers(input, context))
    ? assigned
    : browserKept(assigned)
}

/**
 * What table T-023a assigns this happening to, before MK-10 is read.
 *
 * IN-1: nothing settles on the press. `down` only says this tool has taken the
 * gesture, so that MK-10 keeps the browser from starting a text selection.
 *
 * @purity pure
 */
function pointerAssignment(input: PointerInput, context: InputContext): TranslatedInput {
  if (input.phase === 'down') {
    // The right button has no row in table T-023, so it stays the browser's
    // (MK-10).
    if (input.button === 'right') return UNASSIGNED
    // A press on something this tool drew is this tool's, so no text selection
    // starts under a dragged palette (FR-053) or an entry.
    const press = context.pressed
    if (press !== null && press.on !== null) return CONSUMED_ELSEWHERE
    return isOnRowArea(context, input.x, input.y) ? CONSUMED_ELSEWHERE : UNASSIGNED
  }
  // A move carries no action, except for the gestures whose picture follows the
  // pointer and settles nothing undoable: PTD-1's pan, GR-21's lane, FR-053's
  // palette and HF-15's row. Their presses cannot overlap; the pan is asked first
  // because table T-023a puts it first.
  if (input.phase === 'move') {
    const panning = panFollow(input, context)
    if (panning !== UNASSIGNED) return panning
    const scrolling = scrollbarFollow(input, context)
    if (scrolling !== UNASSIGNED) return scrolling
    const palette = paletteFollow(input, context)
    return palette === UNASSIGNED ? rowGrabFollow(input, context) : palette
  }
  // IN-1a: a lost pointer aborts the drag and writes nothing. Saying so lets the
  // shell drop the press, or AG-9 would refuse every later write.
  if (input.phase === 'lost') return CONSUMED_ELSEWHERE

  const press = context.pressed
  if (press === null) return UNASSIGNED
  // First: table T-023a's decision order is limited to the schedule's drawing
  // area, and a press the surface answered for was not on the schedule.
  if (press.on !== null) return commandFromEntry(input, press, context)
  // A hit already answers "on the schedule" (`itemAtPointer` is asked only in the
  // `Row Area`), so the region is checked only for a press with none; otherwise
  // AS-1's double click on an assignee label was judged by its coordinates.
  // PTD-4 and PTD-5 may not begin on the ruler or the Row Title Panel (the note
  // under table T-023a).
  if (press.hit === null && !isOnRowArea(context, press.at.x, press.at.y)) return UNASSIGNED

  // Asked again rather than read off `press.pressRow`, with the same answer: its
  // inputs are frozen on the press, and arming changes only by a palette press
  // (which replaces the press) or `Esc` (which drops it).
  switch (pressRowOf(press, context)) {
    case 'PTD-1': {
      // Pan at 1:1 (MUST): the display position moves opposite to the pointer by
      // the same pixels. S-176 / S-177 carry the part of a row and of a day, so
      // no row floor is taken (the wheel's floor is MK-1's, see `rowTurnedTo`).
      // The travel is since the last followed point (`followingTravel`);
      // measured from the press it would double the moves already applied.
      const by = followingTravel(input, press)
      return panTo(context, -by.dx, -by.dy)
    }
    case 'PTD-2':
      // DC-2 of table T-029a: the click fixes the following side and hands the
      // following to the other. DC-1 places both dates on entry, so the only
      // extra state is which side follows (`InputContext.dualCursorFollowing`).
      return commandFromDualCursorPress(press, context)
    case 'PTD-3':
      // With a dependency armed PTD-3 withholds table T-023d and places the ends
      // by FR-009; decided here because `commandFromGrab` is table T-023d.
      return context.screenState.armed.kind === 'dependency'
        ? commandFromDependencyDrag(input, press, context)
        : commandFromGrab(input, press, context)
    case 'PTD-4':
      return commandFromArmed(input, press, context)
    case 'PTD-4a':
      // The half-drawn arrow is the renderer's and the arming stays: nothing to
      // write.
      return CONSUMED_ELSEWHERE
    case 'PTD-5':
      // Marquee, or a click on nothing. Either way it is the selection's
      // (SL-3 / MK-11), and `selectionFromInput` answers it.
      return CONSUMED_ELSEWHERE
  }
}

/**
 * How far a following gesture still owes: the pointer against the last point the
 * caller followed it to, or against the press if none.
 *
 * Shared by the move and the release and by every following gesture: a piece
 * measured from the press is right only for the first piece and overshoots after.
 *
 * @purity pure
 */
function followingTravel(
  at: PointerInput,
  press: PointerPress,
): { readonly dx: number; readonly dy: number } {
  const from = press.followedTo ?? press.at
  return { dx: at.x - from.x, dy: at.y - from.y }
}

/**
 * PTD-1: the pan follows the pointer while held.
 *
 * A write per move is allowed despite IN-1 because UN-8 keeps the display
 * position out of the history. A preview written once on release does not work:
 * `scrolledAnchor` reads the layout the preview produced and reapplies the whole
 * travel each frame.
 *
 * @purity pure
 */
function panFollow(input: PointerInput, context: InputContext): TranslatedInput {
  const press = context.pressed
  if (press === null) return UNASSIGNED
  // `on` first, as `isDocumentChangingPress` does: a press the screen surface
  // answered for carries no row of table T-023a.
  if (press.on !== null) return UNASSIGNED
  if (press.pressRow !== 'PTD-1') return UNASSIGNED
  // Nothing is reported without `followedTo`: a caller that does not record what
  // it applied would add up travels measured from the press. The release still
  // pans in full, since `followingTravel` falls back to the press.
  if (press.followedTo === undefined) return UNASSIGNED
  const by = followingTravel(input, press)
  return panTo(context, -by.dx, -by.dy)
}

/**
 * FR-053: while GR-19's band is held, the palette follows the pointer.
 * `followedTo` is required for `panFollow`'s reason.
 *
 * @purity pure
 */
function paletteFollow(input: PointerInput, context: InputContext): TranslatedInput {
  const press = context.pressed
  if (press === null || press.on === null) return UNASSIGNED
  if (press.on.entry !== ENTRY.paletteGrabBand) return UNASSIGNED
  if (press.followedTo === undefined) return UNASSIGNED
  return acted({ kind: 'moveCommandPalette', by: followingTravel(input, press) })
}

/**
 * How far the display position moves per pixel GR-21's grip is dragged.
 *
 * `whole / lane`, derived rather than a setting (GR-21): a grip `lane * visible /
 * whole` long that follows the pointer 1:1 (the rule under table T-023d) runs its
 * lane while the picture runs the whole.
 *
 * The lane's length is the `Row Area`'s, the rectangle `screenFrameFromRegions`
 * (UF-61) lays the lanes along; `ScreenFrame` itself is not on `InputContext`.
 *
 * Zero where there is nothing to scroll: a grip filling its lane (SC-4 keeps it
 * drawn) has nowhere to go. With FR-098's pinned band the scrolling rows are
 * fewer than the lane, which can only zero this guard for a nearly-fitting
 * document; the gearing follows the lane the person drags.
 *
 * @purity pure
 */
function scrollGearing(context: InputContext, axis: ScrollbarAxis): number {
  const area = context.regions.rowArea
  const lane = axis === 'horizontal' ? area.width : area.height
  // The whole is table T-038's occupancy, the extent FR-055's fit uses.
  const whole = axis === 'horizontal' ? context.layout.contentWidth : context.layout.contentHeight
  if (!(lane > 0) || !(whole > lane)) return 0
  return whole / lane
}

/** The travel of a pointer on one lane, as a distance for `panTo`. @purity pure */
function scrollbarTravel(
  context: InputContext,
  axis: ScrollbarAxis,
  by: { readonly dx: number; readonly dy: number },
): { readonly dx: number; readonly dy: number } {
  const gearing = scrollGearing(context, axis)
  // The other axis is passed zero: `scrolledAnchor` then keeps its value in force.
  return axis === 'horizontal'
    ? { dx: by.dx * gearing, dy: 0 }
    : { dx: 0, dy: by.dy * gearing }
}

/**
 * FR-051: while GR-21's grip is held, the display position follows it.
 *
 * Same shape and reason as `panFollow` (the closing rule under table T-023d,
 * UN-8), but the position moves with the pointer: a hand on the grip drags the
 * marker, while a hand on the schedule drags the paper.
 *
 * @purity pure
 */
function scrollbarFollow(input: PointerInput, context: InputContext): TranslatedInput {
  const press = context.pressed
  const axis = press?.on?.scrollbarAxis
  if (press === null || axis === undefined) return UNASSIGNED
  if (press.followedTo === undefined) return UNASSIGNED
  const by = scrollbarTravel(context, axis, followingTravel(input, press))
  return panTo(context, by.dx, by.dy)
}

/**
 * What a press on one of the entries this tool drew is assigned to.
 *
 * IN-1: settled on the release and read against the press (`PointerPress.on`).
 * The STOP note at the foot of this file says what every unanswered row is
 * missing.
 *
 * Arming entries are answered by `screenStateFromInput` (UN-11), except SP-2 and
 * SP-3's shape change.
 *
 * FR-085's choosing of a row in the `Row Title Panel` is answered here too: the
 * note under table T-023a keeps that table off the panel, so a press the surface
 * claimed is the only road, and `ScreenPart.rowGroupId` says which row.
 *
 * @purity pure
 */
function commandFromEntry(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const on = press.on
  if (on === null) return CONSUMED_ELSEWHERE
  // Before the entry: U-24 has no row in table T-109, so `entry` is null on the
  // band and the press would write nothing.
  if (on.dividerPanel !== null) return commandFromPanelDivider(on.dividerPanel, release, press, context)
  // The same for U-21 `Scrollbars`.
  if (on.scrollbarAxis !== undefined) {
    return commandFromScrollbar(on.scrollbarAxis, release, press, context)
  }
  // The same for GR-20's strip, which would otherwise fall to FR-085's choosing
  // and never move the row (HF-15). `commandFromRowGrab` parts a press that
  // settled no axis.
  const grabbed = grabbedRowGroupId(press)
  if (grabbed !== null) return commandFromRowGrab(release, press, context, grabbed)
  if (on.entry === null) {
    // FR-085: the row itself was pressed, not one of its controls (table T-051,
    // FR-098). `rowGroupId` is set only on panel rows and roster lines, and a
    // roster line carries `entry` as well.
    if (on.rowGroupId !== null) {
      // MK-13 / FR-085: a double click opens the name field (AT-53). Nothing is
      // chosen, because the first click already ran the branch below.
      // `clickCount` is the framework's: timing belongs to the outermost layer
      // (LY-5 of table T-060).
      if (press.at.clickCount >= 2) {
        return acted({ kind: 'editInPlace', target: { kind: 'rowName', groupId: on.rowGroupId } })
      }
      return acted({
        kind: 'chooseRow',
        groupId: on.rowGroupId,
        // The press's keys, not the release's (CS-2 of table T-066).
        isExtending: press.at.modifiers.shift,
      })
    }
    // On the part but on no entry and no row: the palette's body, a surface's
    // background, a notice, the panel's empty tail, the header's name band.
    //
    // Left to the browser (MK-10, MUST NOT), since nothing is assigned. Consuming
    // it broke caret placement in FR-035's name field, which the host settles on
    // `pointerup`; the down is already the browser's outside the `Row Area`.
    //
    // The empty tail does not let go of the chosen rows: MK-11 covers the drawing
    // area only and FR-085 has no such rule; `Shift` on a chosen row does it.
    return UNASSIGNED
  }
  const entry = on.entry

  switch (entry) {
    case ENTRY.openDocument:
      return acted({ kind: 'openDocumentFile' })
    case ENTRY.copyPicture:
      return acted({ kind: 'copyPictureToClipboard' })
    case ENTRY.undo:
      return acted({ kind: 'undoEdit' })
    case ENTRY.redo:
      return acted({ kind: 'redoEdit' })
    case ENTRY.fitToScreen:
      return changedInOrder(fitWrites(context))
    // IC-12 .. IC-15 are asked again while held (FR-018, S-172 / S-173): the
    // shell hands the same press again (`repeatHeldEntry` in `frame-loop.ts`), so
    // these branches must not read the release. The step stays S-53 (FR-018); a
    // hold travels because `zoomTimes` multiplies the zoom in force. IC-10 and
    // IC-11 are not repeated (FR-018).
    case ENTRY.zoomTimeIn:
    case ENTRY.zoomTimeOut: {
      const factor = keyZoomFactor(context, entry === ENTRY.zoomTimeIn)
      return changed(zoomWrites(context, zoomTimes(context, factor, 'x'), null, null, null))
    }
    case ENTRY.zoomRowIn:
    case ENTRY.zoomRowOut: {
      const factor = keyZoomFactor(context, entry === ENTRY.zoomRowIn)
      return changed(zoomWrites(context, null, zoomTimes(context, factor, 'y'), null, null))
    }
    case ENTRY.baselineVisible:
    case ENTRY.progressLineVisible:
    case ENTRY.progressMarkerVisible:
    case ENTRY.dateGridLinesVisible:
    case ENTRY.groupGridLinesVisible:
    case ENTRY.assigneeVisible:
    case ENTRY.percentCompleteVisible:
    case ENTRY.dependencyVisible:
      return commandFromVisibleElementEntry(entry, context)
    case ENTRY.planDisplay:
    case ENTRY.actualDisplay:
      // S-227 / S-228 are two booleans of table T-202 (FR-049), so CM-58.
      return commandFromVisibleElementEntry(entry, context)
    case ENTRY.themePreference: {
      // CM-63 (FR-039, S-72). A `DocumentCommand`, not the shell's: the saved
      // value is only a starting value and this press is an edit (FR-039).
      const isDarkNow = context.document.documentSettings.themePreference === 'dark'
      return changed([{ kind: 'setThemePreference', preference: isDarkNow ? 'light' : 'dark' }])
    }
    case ENTRY.fontScale:
      // CM-62 (FR-039, S-70), a `DocumentCommand` for the reason above. The
      // ruler's type and band follow on the write side; writing `rulerFont` or
      // `rulerHeight` here would be a second reading of S-2 / S-3.
      return changed([
        {
          kind: 'setFontScale',
          scale: nextFontScale(context.document.documentSettings.fontScale),
        },
      ])
    case ENTRY.themeMonochrome:
      // CM-64 (FR-041, S-74). Not `setElementVisible`: S-74 is a row of table
      // T-203, not one of FR-049's booleans of table T-202 (IC-100).
      return changed([
        {
          kind: 'setThemeMonochrome',
          monochrome: !context.document.documentSettings.themeMonochrome,
        },
      ])
    case ENTRY.stackDirection: {
      // CM-56 (FR-003, S-58).
      const isUpNow = context.document.documentSettings.stackDirection === 'up'
      return changed([{ kind: 'setStackDirection', direction: isUpNow ? 'down' : 'up' }])
    }
    case ENTRY.statusLine:
      // FR-046, as SK-20. Moving the line is GR-16's drag, not this entry.
      return changed([
        context.document.schedule.project.statusDate === null
          ? { kind: 'setStatusDate', date: context.today }
          : { kind: 'clearStatusDate' },
      ])
    case ENTRY.dualCursor:
      return commandFromDualCursorEntry(press, context)
    case ENTRY.guideCursorCrosshair:
    case ENTRY.guideCursorSingleVertical:
      return commandFromGuideCursorEntry(entry, context)
    case ENTRY.paletteMinimise:
      // FR-053 -- S-200, which the shell holds.
      return acted({ kind: 'togglePaletteMinimised' })
    case ENTRY.interactionRecord:
      // FR-102 -- S-206, which the shell holds and IC-76 toggles. The clipboard
      // hand-off on the stop is the shell's too: a pure member cannot reach IF-5.
      return acted({ kind: 'toggleInteractionRecord' })
    case ENTRY.milestoneList:
      // FR-053 -- S-142, which the shell holds and turns.
      return acted({ kind: 'toggleMilestoneList' })
    case ENTRY.paletteGrabBand:
      // GR-19 (FR-053), settled on the release (IN-1 of table T-028). Priority
      // needs no enforcing: GR-19 is table T-023d's first row and `press.on` was
      // taken at the press (CS-2 of table T-066) -- which holds only while the
      // band is laid over what it covers (see `ENTRY`). What is left of the
      // travel moves the corner, since a press may begin anywhere on the band.
      return acted({ kind: 'moveCommandPalette', by: followingTravel(release, press) })
    case ENTRY.rowExpanderOpen:
    case ENTRY.rowExpanderClose:
    case ENTRY.rowExpanderCloseBelow:
    case ENTRY.rowExpanderOpenOneLevel:
    case ENTRY.rowAddChild:
    case ENTRY.rowPin:
    case ENTRY.rowDelete:
      return commandFromRowEntry(entry, on.rowGroupId, context)
    case ENTRY.rowExpanderOpenAll:
      // HF-10, which is HR-1 of table T-015, written as CM-72 (a command is not
      // narrowed to the requirement that raised it). Neither zoom nor viewport
      // moves (HF-10), so `fitWrites` is not reached.
      //
      // With nothing to open the reason is told (FR-029); tested here because
      // CM-72 would push an undo step for an empty open. The same reading as
      // `RowTitlePanel.canOpenEveryRow`: the count is the picture's
      // (`InputContext.drawnRowGroupIds`), with the roster as the fallback for a
      // caller that carried none. 段 0's fold (S-211) is opened as well.
      if (
        !(
          context.isLevelZeroFolded === true ||
          (wouldMoveARow(context, null, 'open') ??
            // The fallback counts hidden rows too: HR-1 brings back what HR-6 hid.
            context.document.schedule.taskGroups.some(
              (row) => row.isCollapsed === true || row.isHidden === true,
            ))
        )
      ) {
        return nothingToDo('noFoldedRowAtAll')
      }
      // HR-1 also unhides every row, which CM-72 does not: a bundle of CM-34
      // beside it, one undo step (FR-031).
      return acted({
        kind: 'setLevelZeroFolded',
        isFolded: false,
        writes: [{ kind: 'expandAllTaskGroups' }, ...unhidesEveryRow(context.document.schedule)],
      })
    case ENTRY.alignStart:
    case ENTRY.alignFinish:
      // FR-034. `isEntryUsable` (UF-65) draws it faint with the same reading, so
      // the faint entrance and the told reason (FR-029, RS-34) agree.
      //
      // Written as a bundle of CM-11: table T-108 has no align command, and one
      // would write under a second name what CM-11 writes (R3.4).
      //
      // The anchor is the last Task picked (FR-034; SL-7b keeps pick order), so
      // at least two chosen Tasks are needed. They are counted among the drawn
      // rows (FR-029; `drawnRowGroupIds` joined through `taskGroupMembers`, ET-5
      // of table T-056): a fold, a hiding or a depth limit takes a Task out of
      // the picture without changing `Selection`. `Selection` is read rather than
      // the drawn palette, which may be as old as a skipped paint (FR-048).
      if (context.selection.ordered && chosenDrawnTaskCount(context) >= 2) {
        return changed(alignWrites(context, entry === ENTRY.alignStart))
      }
      return nothingToDo('noTaskChosenToAlignWith')
    case ENTRY.rowExpanderCloseAll:
      // HF-12, which is HR-2 of table T-015, written as a bundle of CM-33
      // (`foldsEveryRow`): table T-108 has no fold-all row and one would duplicate
      // CM-33 (R3.4); CM-72 exists only because FR-055's fit needs one row.
      // Neither zoom nor viewport moves.
      //
      // It also folds 段 0 (HR-2, S-211 moving with the bundle), since the
      // shallowest rows have no parent to hide them. Spent where 段 0 is already
      // folded or no shallowest row is drawn -- HR-4's reading, and the same two
      // facts `RowTitlePanel.canCloseEveryRow` is drawn from (FR-029).
      if (
        context.isLevelZeroFolded === true ||
        isARowOfTheShallowestLevelDrawn(context) === false
      ) {
        return nothingToDo('noUnfoldedRowAtAll')
      }
      return acted({
        kind: 'setLevelZeroFolded',
        isFolded: true,
        writes: foldsEveryRow(context.document.schedule),
      })
    case ENTRY.rowExpanderOpenLevelZero: {
      // IC-92 -- HF-16, which is HR-7 pressed at 段 0: S-211 comes off (HR-2) and
      // the hidden shallowest rows come back (HR-6). The shallowest rows' own
      // folds stay (HR-2; HF-16 must not double as HF-10), and no `TaskGroup`
      // column is written for 段 0 (HR-2, MUST NOT).
      const unhidden = opensLevelZeroHiddenRows(context.document.schedule)
      if (context.isLevelZeroFolded !== true && unhidden.length === 0) {
        // `null`: RS-28 is HF-2's situation, and no row of table T-233 fits 段 0.
        return nothingToDo(null)
      }
      return acted({ kind: 'setLevelZeroFolded', isFolded: false, writes: unhidden })
    }
    case ENTRY.rowAddTopRow:
      // IC-93 -- HF-17, which is HR-8 pressed at 段 0: a row as the last child of
      // no parent (`orderPastLastChild`), named as HF-14 names. Never spent:
      // FR-085 allows depth 1, and this is the one road to a first row. Depth 1 is
      // never an LOD tier (FR-018), so `rowStoodUp` plans no CM-65 for it.
      //
      // STOP -- 段 0's own fold (S-211) is not taken off by this press; see
      // `parentFoldTakenOff`.
      return rowStoodUp(context, null, 1)
    case ENTRY.documentSettingsProperties:
      // FR-072. Which way this press goes is the holder's; see the action.
      return acted({ kind: 'toggleDocumentSettingsProperties' })
    case ENTRY.agentApi:
      // FR-065 -- S-99b keeps the record out of the document.
      return acted({ kind: 'toggleAgentApi' })
    case ENTRY.dialogueFieldVisible:
      // FR-066 / S-99i, out of the document like S-99b. Reached only while the
      // `Agent API` is on: otherwise `answerSettledEntry` in `frame-loop.ts`
      // spends the press (RS-35) before `carryOutAction` reads this action.
      return acted({ kind: 'toggleDialogueFieldVisible' })
    case ENTRY.rosterChooseAll:
    case ENTRY.rosterClearChosen:
    case ENTRY.rosterChooseUnreferenced:
      return acted({
        kind: 'chooseResources',
        uids: rosterChoiceOfEntry(entry, context.document.schedule),
      })
    case ENTRY.rosterChosen:
    case ENTRY.rosterUnchosen: {
      // A roster line with no person cannot be acted on (AS-6 writes the `uid`);
      // it is still this tool's press (MK-10).
      if (on.resourceUid === null) return CONSUMED_ELSEWHERE
      return acted({ kind: 'toggleChosenResource', uid: on.resourceUid })
    }
    default:
      return commandFromArmingEntry(entry, context)
  }
}

/**
 * IC-45 -- DC-1's way into table T-029a's mode, and DC-4's way out of it.
 *
 * The mode is the following side: entering hands it to `date1` and leaving sets
 * it to null, so there is no second flag to keep in step. Leaving also clears the
 * pair with CM-61 (DC-7).
 *
 * A guide-cursor change does not clear it: CU-2 and CU-3 are different things
 * (table T-029's closing paragraph), and DC-4 forbids one entrance clearing both.
 *
 * A pair already standing is not put down again (DC-1): a document can open with
 * one saved (S-65).
 *
 * The centre is the `Row Area`'s horizontal midpoint (DC-1), not the window's,
 * which could name a day the picture never drew.
 *
 * @purity pure
 */
function commandFromDualCursorEntry(
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  // DC-4's re-press: stop following and clear the pair in one action. DC-4's
  // other way out, `Esc`, is handled in `frame-loop.ts` (`escapeLevel ===
  // 'dualCursorMode'`) with this same write, so neither drifts from DC-7.
  if (context.dualCursorFollowing !== null) {
    return acted({
      kind: 'setDualCursorFollowing',
      following: null,
      placed: { kind: 'clearDualCursor' },
    })
  }
  const standing = context.document.documentSettings.dualCursor
  if (standing !== null) {
    return acted({ kind: 'setDualCursorFollowing', following: 'date1', placed: null })
  }
  const rowArea = context.regions.rowArea
  const onPointer = dayAtX(context.layout, press.at.x)
  const atCentre = dayAtX(context.layout, rowArea.x + rowArea.width / 2)
  // Not entered with nothing to measure: DC-1 places both dates and IV-13 admits
  // no half-placed pair. This happens only before the axis has an origin, which
  // BO-1 of table T-077 already forbids drawing in.
  // @provisional PND-313
  if (onPointer === null || atCentre === null) return CONSUMED_ELSEWHERE
  return acted({
    kind: 'setDualCursorFollowing',
    following: 'date1',
    placed: {
      kind: 'setDualCursor',
      date1: textOfDay(onPointer),
      date2: textOfDay(atCentre),
    },
  })
}

/**
 * PTD-2 of table T-023a, which is DC-2.
 *
 * The fixed day is the one under the pointer, the reading the renderer draws the
 * following line at. The other date is written back unchanged because CM-60
 * takes both (IV-13). Read at the press (CS-2 of table T-066).
 *
 * @purity pure
 */
function commandFromDualCursorPress(
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const following = context.dualCursorFollowing
  const standing = context.document.documentSettings.dualCursor
  const day = dayAtX(context.layout, press.at.x)
  // PTD-2 needs a following side and DC-1 then leaves a pair standing, so this
  // is not expected; the press is still taken (MK-10).
  // @provisional PND-314
  if (following === null || standing === null || day === null) return CONSUMED_ELSEWHERE
  const fixed = textOfDay(day)
  const placed: SetDualCursor = {
    kind: 'setDualCursor',
    date1: following === 'date1' ? fixed : standing.date1,
    date2: following === 'date2' ? fixed : standing.date2,
  }
  return acted({
    kind: 'setDualCursorFollowing',
    following: following === 'date1' ? 'date2' : 'date1',
    placed,
  })
}

/**
 * FR-052: a drag on a `Panel Divider` (U-24) becomes the pair of panel widths.
 *
 * The travel, not the place: a press may land anywhere across S-134's width.
 * The bands face opposite ways (`screenFrameFromRegions`, UF-61), so rightward
 * travel widens the row title panel and narrows the properties panel.
 *
 * CM-67 takes both widths; the other one is the value in force. No clamping
 * here: `edit-document-settings.ts` holds FR-052's test, and a second clamp would
 * give one drag two answers.
 *
 * @purity pure
 */
function commandFromPanelDivider(
  panel: NonNullable<ScreenPart['dividerPanel']>,
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const settings = context.document.documentSettings
  const travelled = release.x - press.at.x
  return changed([
    {
      kind: 'setPanelWidths',
      rowTitlePanelWidth:
        panel === 'rowTitlePanel'
          ? settings.rowTitlePanelWidth + travelled
          : settings.rowTitlePanelWidth,
      propertyPanelWidth:
        panel === 'propertiesPanel'
          ? settings.propertyPanelWidth - travelled
          : settings.propertyPanelWidth,
    },
  ])
}

/**
 * FR-051: GR-21's drag, settled on the release, by the travel `followingTravel`
 * answers.
 *
 * STOP -- a press on the lane outside the grip is not specified (GR-21 leaves it
 * open). A page of travel or a jump to the point pressed would each need a
 * distance no row gives, so the grip's drag is used; while the grip fills its
 * lane (`scrollbarIn` in `screen-frame.ts`) there is no outside to press.
 * Searched: table T-023d GR-21 and its closing rules, FR-051, FR-052, FR-037,
 * SC-4 of table T-031, table T-203 (S-77 / S-78 / S-176 / S-177) and table T-206
 * (S-205 is the lane's thickness floor and settles nothing about a press).
 *
 * @purity pure
 */
function commandFromScrollbar(
  axis: ScrollbarAxis,
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const by = scrollbarTravel(context, axis, followingTravel(release, press))
  return panTo(context, by.dx, by.dy)
}

/**
 * One press on one of FR-049's toggles (CM-58).
 *
 * Read from the document, not the drawn entry: a drawn screen can be as old as a
 * skipped paint (FR-048), and CM-58 puts whatever it is given, so a stale reading
 * would leave the toggle refusing to move.
 *
 * @purity pure
 */
function commandFromVisibleElementEntry(entry: string, context: InputContext): TranslatedInput {
  const element = visibleElementOfEntry(entry)
  // Not a toggle's entrance. Still this tool's press (MK-10).
  if (element === null) return CONSUMED_ELSEWHERE
  const isVisibleNow = context.document.documentSettings[element]
  return changed([{ kind: 'setElementVisible', element, visible: !isVisibleNow }])
}

/**
 * One press on one of the guide cursor's two entrances (CM-59).
 *
 * A second press on the standing entry writes `'none'` (FR-048). Read from the
 * document for `commandFromVisibleElementEntry`'s reason. The dual cursor is not
 * touched (FR-048, DC-4).
 *
 * @purity pure
 */
function commandFromGuideCursorEntry(entry: string, context: InputContext): TranslatedInput {
  const mode = guideCursorModeOfEntry(entry)
  if (mode === null) return CONSUMED_ELSEWHERE
  const standing = context.document.documentSettings.guideCursorMode
  return changed([{ kind: 'setGuideCursorMode', mode: standing === mode ? 'none' : mode }])
}

/**
 * The entrances table T-109 draws once per row: IC-58, IC-59 and IC-77 on U-47
 * `Row Expander`, IC-60 on U-48 `Row Pin`, and IC-82, IC-90 and IC-91, which
 * table T-103 names no part for (see `ENTRY.rowDelete`). HF-10 and HF-12 are
 * drawn once at the top of the panel and answered in `commandFromEntry`.
 *
 * Which row is `ScreenPart.rowGroupId`: only the side that drew the row may say
 * where it stands (Chapter 5.3, under table T-065, MUST NOT), and it is read off
 * the press because CS-2 of table T-066 freezes the gesture's screen.
 *
 * @purity pure
 */
function commandFromRowEntry(
  entry: string,
  rowGroupId: string | null,
  context: InputContext,
): TranslatedInput {
  // The panel's empty tail below the last row: still this tool's press (MK-10),
  // and it writes nothing.
  if (rowGroupId === null) return CONSUMED_ELSEWHERE

  if (entry === ENTRY.rowPin) {
    // FR-098: one control pins and unpins, decided by the document (S-126)
    // rather than the drawn row, which may be as old as a skipped paint
    // (FR-048); against a stale picture CM-68 does nothing and the pin would
    // refuse to come off. The cap (`S-127`) is judged in `editDocumentSettings`.
    const isPinned = context.document.documentSettings.pinnedGroupIds.includes(rowGroupId)
    return changed([
      isPinned
        ? { kind: 'unpinTaskGroup', groupId: rowGroupId }
        : { kind: 'pinTaskGroup', groupId: rowGroupId },
    ])
  }

  if (entry === ENTRY.rowDelete) {
    // IC-82 -- FR-032, with CD-2 of table T-050's cascade. Nothing is tested
    // first: CM-27 refuses a missing row itself. The confirmation (QN-1 of table
    // T-234) is put before the whole write by `confirmationOwedBy`.
    return changed([{ kind: 'deleteTaskGroup', groupId: rowGroupId }])
  }

  if (entry === ENTRY.rowExpanderCloseBelow) {
    // IC-77 -- HF-11, which is HR-4 of table T-015: this row folds and is not
    // hidden, and its subtree is written folded too (HR-1a), in one bundle.
    // With no drawn child the reason is told (FR-029, RS-29); the count is the
    // picture's (the closing rule under table T-051), as in
    // `RowExpander.canCloseBelow`. `null` means no picture was carried, and the
    // bundle decides.
    if (wouldMoveARow(context, rowGroupId, 'fold') === false) {
      return nothingToDo('noUnfoldedRowBelow')
    }
    return foldsOrNothing(
      foldsRowAndBelow(context.document.schedule, rowGroupId),
      'noUnfoldedRowBelow',
    )
  }

  if (entry === ENTRY.rowExpanderOpenOneLevel) {
    // IC-90 -- HF-13, which is HR-7 of table T-015: only this row's fold comes
    // off; HR-1a left the descendants folded, so exactly one level shows. It is
    // also HR-6's way back, so hidden direct children are unhidden in the same
    // bundle (FR-031). Not IC-58: HF-13 must not open a varying amount.
    // Spent when the picture would not change (the closing rule under table
    // T-051); `RowTitle.canOpenOneLevel` carries the flag, not `RowExpander`.
    if (wouldMoveARow(context, rowGroupId, 'openOneLevel') === false) {
      // RS-30 of table T-233.
      return nothingToDo('rowIsOpenWithNoHiddenChild')
    }
    return foldsOrNothing(
      opensRowAndUnhidesItsChildren(context.document.schedule, rowGroupId),
      'rowIsOpenWithNoHiddenChild',
    )
  }

  if (entry === ENTRY.rowAddChild) {
    // IC-91 -- HF-14, which is HR-8 of table T-015: one row as this row's last
    // child, stood up on the press with the default name (`DEFAULT_ROW_NAME`,
    // FR-038's dictionary) and named through FR-085's road, which is the
    // holder's. At the deepest level the press is told RS-46 and stands no row
    // (HF-14); the comparison is `RowTitle.canAddChildRow`'s, so the faint
    // entrance and the refusal agree. Depth is read from the document, not
    // `context.layout.rows` (see `rowDepthOfGroup`).
    const parentDepth = rowDepthOfGroup(context, rowGroupId)
    if (parentDepth >= context.document.documentSettings.maxGroupDepth) {
      return nothingToDo('rowIsAtTheDeepestLevel')
    }
    // FR-004: the new row stands one below the row it was pressed on.
    return rowStoodUp(context, rowGroupId, parentDepth + 1)
  }

  if (entry === ENTRY.rowExpanderOpen) {
    // IC-58 -- HF-2, which is HR-3 of table T-015: this row and its whole subtree
    // lose their folds and hidings, in one bundle (FR-031). Spent when the
    // picture would not change, the same reading as `RowExpander.canOpen` (HF-2).
    if (wouldMoveARow(context, rowGroupId, 'open') === false) {
      return nothingToDo('noFoldedRowBelow')
    }
    return foldsOrNothing(
      opensRowAndBelow(context.document.schedule, rowGroupId),
      'noFoldedRowBelow',
    )
  }

  // IC-59 -- HF-3, which is HR-6 of table T-015: this row is hidden, and it and
  // its subtree are folded. Its way back is the parent's IC-90 (IC-92 at the
  // top), which touches no fold below the direct children (HR-7), so only this
  // row returns; without its own fold its children would return with it.
  const row = context.document.schedule.taskGroups.find((one) => one.id === rowGroupId)
  // Gone or already hidden: nothing to write, and no row of table T-233 names
  // the situation, so FR-029 leaves it to the fallback. A hidden row is not
  // drawn, so this only stops a stale picture from writing.
  if (row === undefined || row.isHidden === true) return nothingToDo(null)
  // Always armed on a drawn row, even one with no child (HF-3), as
  // `RowExpander.canClose` reads it.
  return changed([
    { kind: 'setTaskGroupHidden', groupId: rowGroupId, hidden: true },
    ...foldsRowAndBelow(context.document.schedule, rowGroupId),
  ])
}

/**
 * Who the `Resource Roster`'s header entrances leave chosen: every resource
 * (IC-63), none (IC-64), or those no `Assignment` refers to (IC-65).
 *
 * Read from the document for `commandFromRowEntry`'s reason. A choice, not a
 * deletion: FR-099 deletes in two moves so the deleting entrance stays one
 * (FR-029).
 *
 * Referred-to means an `Assignment` names the `uid`, as `open-modals.ts` reads it
 * on the drawing side. Same-named resources stay two people (AS-8), so the join
 * is `uid` and a referenced person cannot hide an unreferenced twin.
 *
 * One pass and a `Set`: NFR-013 forbids a linear search per resource on a path a
 * person waits on.
 *
 * @purity pure
 */
function rosterChoiceOfEntry(entry: string, schedule: Schedule): readonly number[] {
  if (entry === ENTRY.rosterClearChosen) return []
  if (entry === ENTRY.rosterChooseAll) return schedule.resources.map((one) => one.uid)
  const referred = new Set<number>()
  for (const assignment of schedule.assignments) {
    if (assignment.resourceUid !== null) referred.add(assignment.resourceUid)
  }
  return schedule.resources.filter((one) => !referred.has(one.uid)).map((one) => one.uid)
}

/**
 * One `setTaskGroupCollapsed` and one `setTaskGroupHidden` per row of `rowId`'s
 * subtree, the row itself included, that carries a fold or a hiding (HR-3, which
 * HF-2 names).
 *
 * Rows already open are left out: CM-33 returns an unchanged fold untouched, so
 * writing them would cost an undo step for nothing.
 *
 * Not IC-74: HR-1 reaches rows under no ancestor and answers with CM-72; a
 * `null`-for-everywhere variant here would be the same operation twice (R2.7).
 *
 * @purity pure
 */
function opensRowAndBelow(schedule: Schedule, rowId: string): readonly DocumentCommand[] {
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))
  const commands: DocumentCommand[] = []
  for (const row of schedule.taskGroups) {
    if (row.id !== rowId && !isRowUnder(parentOf, row.parentId, rowId)) continue
    if (row.isHidden === true) {
      commands.push({ kind: 'setTaskGroupHidden', groupId: row.id, hidden: false })
    }
    if (row.isCollapsed !== true) continue
    commands.push({ kind: 'setTaskGroupCollapsed', groupId: row.id, collapsed: false })
  }
  return commands
}

/**
 * The pressed row's own fold taken off, and the hiding taken off its direct
 * children (HR-7, which HF-13 names).
 *
 * The children's folds are not written: HR-1a leaves them folded, so unfolding
 * them would open one level too deep. Only a child's own hiding is undone, since
 * HR-6 hides a row together with its subtree.
 *
 * One hop, which is the difference from `opensRowAndBelow` and why no ring guard
 * like `isRowUnder`'s is needed. Rows already as asked are left out, as there.
 *
 * @purity pure
 */
function opensRowAndUnhidesItsChildren(
  schedule: Schedule,
  rowId: string,
): readonly DocumentCommand[] {
  const commands: DocumentCommand[] = []
  const row = schedule.taskGroups.find((one) => one.id === rowId)
  if (row !== undefined && row.isCollapsed === true) {
    commands.push({ kind: 'setTaskGroupCollapsed', groupId: rowId, collapsed: false })
  }
  for (const child of schedule.taskGroups) {
    if (child.parentId !== rowId) continue
    if (child.isHidden !== true) continue
    commands.push({ kind: 'setTaskGroupHidden', groupId: child.id, hidden: false })
  }
  return commands
}

/**
 * One `setTaskGroupHidden` per shallowest-level row HR-6 hid: the half of HF-16's
 * press that brings such rows back (HR-6). Their folds are not touched (HR-2).
 *
 * @purity pure
 */
function opensLevelZeroHiddenRows(schedule: Schedule): readonly DocumentCommand[] {
  return schedule.taskGroups
    .filter((row) => row.parentId === null && row.isHidden === true)
    .map((row) => ({ kind: 'setTaskGroupHidden', groupId: row.id, hidden: false }) as const)
}

/**
 * The place a new row takes among `parentGroupId`'s children: one past the last
 * (HF-14).
 *
 * One past the largest `order`, not the child count: AT-55 promises no gapless
 * sequence, so a count could hand out a place a sibling already holds. CM-26
 * takes the value from its caller.
 *
 * @purity pure
 */
function orderPastLastChild(schedule: Schedule, parentGroupId: string | null): number {
  let lastOrder: number | null = null
  for (const row of schedule.taskGroups) {
    if (row.parentId !== parentGroupId) continue
    if (lastOrder === null || row.order > lastOrder) lastOrder = row.order
  }
  return lastOrder === null ? 0 : lastOrder + 1
}

// ------------------------------------------ GR-20 / HF-15: a row is grabbed ---
//
// The road: GR-20 of table T-023d lays the strip (S-138), `dom-screen-surface.ts`
// answers `ScreenPart.isRowGrabStrip` for a point on it, the press arrives with
// that and `rowGroupId`, the axis is settled once and remembered on the press,
// and the release plans CM-73.
//
// ⛔ Nothing is written while the strip is held (table T-023d): `rowGrabFollow`
// answers a picture and `commandFromRowGrab` answers the write.
//
// ⛔ The pinned row is refused on the drawing side (GR-20), not here: the pin is
// `ScreenSession`'s (S-126 of table T-203), no member of `InputContext` carries
// it, and the surface draws no strip on a pinned row.
//
// The position axis has no step distance, unlike depth (S-37): every row carries
// its own height (FR-042), so a fixed step would drift against the drawn rows.
// Places are read off `InputContext.drawnRowBoxes` instead, and no constant is
// invented.

/**
 * A row's siblings sorted by AT-55, the held row left out.
 *
 * ⚠️ The held row is left out because CM-73's `order` is an index among the
 * siblings that stay.
 * ⚠️ Tree order, not drawn order (GR-20): a sibling HR-6 hid, or one the display
 * amount dropped, is still the sibling immediately above.
 * ⚠️ CM-73 reads the index in the document's printed order. The two agree while
 * `order` matches row order, which every `edit-task-group.ts` write keeps; how
 * CM-73 reads its argument is that command's business. Where they differ this
 * side follows the picture: HF-15's sibling just above is what a person sees.
 *
 * @purity pure
 */
function rowGrabSiblings(
  rows: readonly TaskGroup[],
  parentId: string | null,
  heldGroupId: string,
): readonly TaskGroup[] {
  return rows
    .filter((one) => one.id !== heldGroupId && one.parentId === parentId)
    .sort((a, b) => a.order - b.order)
}

/**
 * How deep a row sits, a root row counting as 1 -- the count S-125 bounds.
 *
 * Walked on the document rather than read off the layout, which holds only the
 * drawn rows (HR-6, FR-018). ⚠️ The step guard stops a `parentId` cycle (IV-5)
 * from hanging the walk, as `depthOf` in `edit-task-group.ts` does.
 *
 * @purity pure
 */
function rowGrabDepthOf(byId: ReadonlyMap<string, TaskGroup>, row: TaskGroup): number {
  let depth = 1
  let foundAt = row.parentId
  for (let guard = 0; foundAt !== null && guard <= byId.size; guard++) {
    const parent = byId.get(foundAt)
    if (parent === undefined) break
    depth += 1
    foundAt = parent.parentId
  }
  return depth
}

/**
 * How many levels a row and its subtree take (1 for a childless row) -- the
 * height HM-3a measures.
 *
 * Measured here although CM-73 measures it again: FR-029 owes the press RS-38,
 * where a refused CM-73 would carry a `Refusal` naming HM-3a instead.
 *
 * @purity pure
 */
function rowGrabSubtreeHeight(rows: readonly TaskGroup[], rootId: string): number {
  let height = 0
  let level: readonly string[] = [rootId]
  const seen = new Set<string>()
  while (level.length > 0) {
    height += 1
    for (const id of level) seen.add(id)
    const above = level
    // `seen` is what stops a `parentId` cycle (IV-5 broken) from looping.
    level = rows
      .filter((one) => !seen.has(one.id) && one.parentId !== null && above.includes(one.parentId))
      .map((one) => one.id)
  }
  return height
}

/** Where a held row would land: the parent it takes, its place among its new
 * siblings (the index CM-73 reads), and the depth it is drawn at. */
interface RowGrabLanding {
  readonly parentId: string | null
  readonly order: number
  readonly depth: number
}

/**
 * Where a grab of `steps` levels lands, and the reason it stopped short.
 *
 * The landing is answered even on refusal: the write takes the steps that were
 * legal, and the picture stops where the row stops (HF-15).
 */
interface RowGrabStep {
  readonly landing: RowGrabLanding
  /** The row of table T-233 the press owes, or `null` where every step was taken. */
  readonly situation: SpentEntranceSituation | null
}

/**
 * HF-15's two sideways rules, applied one level at a time.
 *
 * One level at a time because each step asks a different tree: the second step
 * right nests under the last child of the row the first step nested under.
 * ⛔ Arithmetic on the depth would answer neither rule.
 *
 * Only the held row's `parentId` is answered, so the siblings behind it stay
 * with the old parent and its subtree comes along (HF-15; CM-73 writes only the
 * parent and the order, HM-5).
 *
 * ⛔ `null` where the document holds no such row; the caller falls back on
 * FR-085's choosing.
 *
 * @purity pure
 */
function rowGrabLandingOf(
  context: InputContext,
  heldGroupId: string,
  steps: number,
): RowGrabStep | null {
  const rows = context.document.schedule.taskGroups
  const byId = new Map(rows.map((one) => [one.id, one]))
  const held = byId.get(heldGroupId)
  if (held === undefined) return null

  const cap = context.document.documentSettings.maxGroupDepth
  const height = rowGrabSubtreeHeight(rows, heldGroupId)
  const startSiblings = rows
    .filter((one) => one.parentId === held.parentId)
    .sort((a, b) => a.order - b.order)
  // ⚠️ The place among the siblings, not the `order` column: CM-73 reads an
  // index, so rows numbered 0, 2, 7 must still answer 0, 1, 2 here.
  const startOrder = Math.max(
    0,
    startSiblings.findIndex((one) => one.id === heldGroupId),
  )
  let landing: RowGrabLanding = {
    parentId: held.parentId,
    order: startOrder,
    depth: rowGrabDepthOf(byId, held),
  }

  const taken = Math.abs(steps)
  const deeper = steps > 0
  for (let step = 0; step < taken; step++) {
    if (deeper) {
      const siblings = rowGrabSiblings(rows, landing.parentId, heldGroupId)
      // The sibling immediately above; a row with none cannot move right (HF-15).
      const above = siblings[landing.order - 1]
      if (above === undefined) return { landing, situation: 'noSiblingAboveToNestUnder' }
      // FR-085's cap, measured HM-3a's way at the subtree's deepest point after
      // the move: one below `above`, and its deepest descendant `height - 1` below.
      if (rowGrabDepthOf(byId, above) + height > cap) {
        return { landing, situation: 'groupDepthLimitReached' }
      }
      landing = {
        parentId: above.id,
        // One past the last child that stays. ⚠️ The count and not
        // `orderPastLastChild`'s largest-plus-one: CM-73 reads an index.
        order: rowGrabSiblings(rows, above.id, heldGroupId).length,
        depth: landing.depth + 1,
      }
      continue
    }
    // A step left: the parent's next sibling (HF-15).
    if (landing.parentId === null) return { landing, situation: 'rowIsAtTheShallowestLevel' }
    const parent = byId.get(landing.parentId)
    // A parent the document does not hold breaks IV-5; the walk stops rather
    // than inventing a place for the row.
    if (parent === undefined) return { landing, situation: null }
    const uncles = rowGrabSiblings(rows, parent.parentId, heldGroupId)
    landing = {
      parentId: parent.parentId,
      order: uncles.findIndex((one) => one.id === parent.id) + 1,
      depth: Math.max(1, landing.depth - 1),
    }
  }
  return { landing, situation: null }
}

/**
 * One place HF-15's up-and-down walk may put the held row at: a parent and a
 * rank among the rows that stay.
 */
interface RowGrabPlace {
  readonly parentId: string | null
  /** AT-55's rank among the siblings that stay -- the index CM-73 reads. */
  readonly order: number
  /**
   * The boundary this place is, in the picture now drawn: the top edge of the
   * row it would put the held row in front of, or the bottom edge of the last
   * row it would put it after. ⛔ Never a distance (see the section head).
   */
  readonly atY: number
  /** Whether this is the place the row already holds. */
  readonly isOwn: boolean
}

/**
 * Every place at the held row's own depth, in drawing order (HF-15), crossing
 * parents -- one pass over the drawn rows yields each group's places where the
 * group is drawn.
 *
 * ⛔ A place inside a folded group is not among them (HF-15, MUST NOT). Mostly
 * the picture does it: a folded group's children are not in `drawnRowBoxes`.
 * ⚠️ A folded group with no drawn child would still be offered as an empty
 * parent, so `isCollapsed` is read for that one bucket.
 *
 * ⚠️ The held row's own place is in the walk: both ends are read against it,
 * and RS-39 against its rank. Its descendants need no exclusion -- they are
 * deeper than the depth this walk reads.
 *
 * ⚠️ Two consecutive places with the same landing are one place, or a person
 * could drag between them and never move. The first anchor is kept, which
 * leaves an undragged row at its own place.
 *
 * ⚠️ With no picture handed in the walk is empty; drawing order is not guessed
 * from the document (see `InputContext.drawnRowBoxes`).
 *
 * @purity pure
 */
function rowGrabPlacesInDrawingOrder(
  context: InputContext,
  heldGroupId: string,
): readonly RowGrabPlace[] {
  const drawn = context.drawnRowBoxes
  if (drawn === undefined) return []
  const rows = context.document.schedule.taskGroups
  const byId = new Map(rows.map((one) => [one.id, one]))
  const held = byId.get(heldGroupId)
  if (held === undefined) return []
  const depth = rowGrabDepthOf(byId, held)
  // Rows with a child in the picture; a row absent here owes an empty parent's
  // single place.
  const parentsWithADrawnChild = new Set<string>()
  for (const entry of drawn) {
    const parentId = byId.get(entry.groupId)?.parentId
    if (parentId !== undefined && parentId !== null) parentsWithADrawnChild.add(parentId)
  }

  // AT-55's rank among the siblings that stay. ⚠️ Counted rather than looked
  // up: the held row is not among the rows that stay, and a lookup would answer
  // -1 for the one row this walk cannot do without.
  const placeOrderOf = (row: TaskGroup): number => {
    const among = rows
      .filter((one) => one.parentId === row.parentId)
      .sort((a, b) => a.order - b.order)
    const at = among.findIndex((one) => one.id === row.id)
    if (at < 0) return 0
    return among.slice(0, at).filter((one) => one.id !== heldGroupId).length
  }

  const places: RowGrabPlace[] = []
  const put = (place: RowGrabPlace): void => {
    const last = places[places.length - 1]
    if (last !== undefined && last.parentId === place.parentId && last.order === place.order) return
    places.push(place)
  }

  // The group whose children the walk is inside, and where its last drawn child
  // ended -- the place after that child is a place of its own.
  let runParentId: string | null | undefined = undefined
  let runOrderAfter = 0
  let runBottom = 0
  const closeRun = (): void => {
    if (runParentId === undefined) return
    put({ parentId: runParentId, order: runOrderAfter, atY: runBottom, isOwn: false })
    runParentId = undefined
  }

  for (const entry of drawn) {
    const row = byId.get(entry.groupId)
    if (row === undefined) continue
    const rowDepth = rowGrabDepthOf(byId, row)
    // Deeper than the held row: inside a place-bearing row's own subtree, which
    // neither opens nor closes a group at this depth.
    if (rowDepth > depth) continue
    if (rowDepth === depth) {
      // Crossing parents: the previous group's last place comes before the next
      // group's first.
      if (runParentId !== undefined && runParentId !== row.parentId) closeRun()
      const order = placeOrderOf(row)
      const isOwn = row.id === heldGroupId
      put({ parentId: row.parentId, order, atY: entry.box.y, isOwn })
      runParentId = row.parentId
      // ⛔ One past this row, except the held one: with it taken out, after it
      // and before it are the same insertion point, so counting past it would
      // raise a place that never moves the row and, at the foot of the walk,
      // hide the end RS-39 is told against.
      runOrderAfter = isOwn ? order : order + 1
      runBottom = entry.box.y + entry.box.height
      continue
    }
    // Shallower: the walk has left the group it was inside.
    closeRun()
    // ⛔ A group with no drawn child still has one place -- its first child's --
    // raised where the group is drawn. ⛔ Not when it is folded (HF-15, MUST
    // NOT); this is the one bucket where the fold has to be tested.
    if (
      depth > 1 &&
      rowDepth === depth - 1 &&
      row.isCollapsed !== true &&
      !parentsWithADrawnChild.has(row.id)
    ) {
      put({ parentId: row.id, order: 0, atY: entry.box.y + entry.box.height, isOwn: false })
    }
  }
  closeRun()
  return places
}

/**
 * Which place the hand stands at, and the reason there is none in that
 * direction.
 *
 * The place whose boundary the row's own top edge, carried by the travel, is
 * nearest to (HF-15's follow on this axis). ⛔ Not the pointer's bare y: a row
 * is grabbed somewhere inside it, and the raw point would jump the row to
 * another place the instant it was touched.
 * A tie goes to the row's own place, so a hand that has moved nothing moves
 * nothing.
 *
 * ⛔ RS-39 is told against the ends of the walk, never against a distance. ⚠️ A
 * hand that has not travelled far enough made a gesture that moved nothing, and
 * telling it a reason would call a working gesture dead.
 *
 * @purity pure
 */
function rowGrabPositionOf(
  context: InputContext,
  heldGroupId: string,
  travelY: number,
): { readonly place: RowGrabPlace; readonly situation: SpentEntranceSituation | null } | null {
  const drawn = context.drawnRowBoxes
  if (drawn === undefined) return null
  const heldBox = drawn.find((one) => one.groupId === heldGroupId)?.box
  if (heldBox === undefined) return null
  const places = rowGrabPlacesInDrawingOrder(context, heldGroupId)
  const ownAt = places.findIndex((one) => one.isOwn)
  if (ownAt < 0) return null
  const own = places[ownAt]
  if (own === undefined) return null
  // ⛔ The end of the walk in the direction the hand went. ⚠️ A walk of one
  // place is both ends at once, and that is exactly what RS-39 says.
  if (travelY < 0 && ownAt === 0) return { place: own, situation: 'noPlaceLeftInThatDirection' }
  if (travelY > 0 && ownAt === places.length - 1) {
    return { place: own, situation: 'noPlaceLeftInThatDirection' }
  }
  const carriedTo = heldBox.y + travelY
  let best = own
  for (const place of places) {
    const reach = Math.abs(place.atY - carriedTo)
    const standing = Math.abs(best.atY - carriedTo)
    if (reach < standing || (reach === standing && place.isOwn)) best = place
  }
  return { place: best, situation: null }
}

/**
 * How many levels the hand has asked for -- the travel across, in steps of
 * `rowTitleIndent`.
 *
 * The step is S-37 and nothing else (HF-15, MUST / MUST NOT), read off
 * `DocumentSettings.rowTitleIndent` -- the value the panel indents by and
 * FR-085 cuts a name against -- so there is no second copy to drift.
 *
 * ⛔ Truncated towards zero, not rounded: rounding would move the row half a
 * step before the hand.
 * ⚠️ An indent of 0 (table T-201 allows it) buys no steps, so the grab moves
 * nothing rather than every row at once.
 *
 * @purity pure
 */
function rowGrabDepthSteps(context: InputContext, at: PointerInput, press: PointerPress): number {
  const indent = context.document.documentSettings.rowTitleIndent
  if (!(indent > 0)) return 0
  return Math.trunc((at.x - press.at.x) / indent)
}

/**
 * Which axis this grab has settled on, or `null` while it has settled on none
 * (HF-15).
 *
 * An axis the caller wrote back onto the press wins and the pointer is not read
 * again -- that is what holds the axis until the release.
 *
 * ⛔ The threshold is S-208 from the generated block at the foot of this file:
 * rule 03 section 1 forbids typing a manuscript value into `src/`.
 *
 * ⚠️ Equal travel on both axes settles nothing: HF-15 names the direction that
 * passed the threshold first, and a move past it on both passed neither first.
 * The next move that is not exactly diagonal settles it.
 *
 * @purity pure
 */
function rowGrabAxisAt(at: PointerInput, press: PointerPress): RowGrabAxis | null {
  const settled = press.rowGrabAxis
  if (settled !== null && settled !== undefined) return settled
  const across = Math.abs(at.x - press.at.x)
  const down = Math.abs(at.y - press.at.y)
  const threshold = NOT_STORED_ROW_GRAB_SIZES['S-208']
  if (across <= threshold && down <= threshold) return null
  if (across === down) return null
  return across > down ? 'depth' : 'position'
}

/**
 * The row whose GR-20 strip this press was taken on -- the one road HF-15's
 * drag has in.
 *
 * ⚠️ The strip carries no key of its own (the row it sits in does), so a press
 * on a strip that names no row cannot be acted on here, nor by `chooseRow`.
 *
 * @purity pure
 */
function grabbedRowGroupId(press: PointerPress): string | null {
  const on = press.on
  if (on === null || on.isRowGrabStrip !== true) return null
  return on.rowGroupId
}

/**
 * HF-15's follow while the row is held.
 *
 * ⛔ A picture and not an edit (table T-023d, MUST NOT): the caller draws, and
 * the write waits for the release (IN-1 of table T-028).
 *
 * ⚠️ Nothing is reported while the caller carries no `rowGrabAxis`, the refusal
 * `paletteFollow` and `panFollow` make too: a caller that does not record the
 * axis cannot hold it, and it would be settled afresh on every move.
 *
 * @purity pure
 */
function rowGrabFollow(input: PointerInput, context: InputContext): TranslatedInput {
  const press = context.pressed
  if (press === null) return UNASSIGNED
  const groupId = grabbedRowGroupId(press)
  if (groupId === null) return UNASSIGNED
  if (press.rowGrabAxis === undefined) return UNASSIGNED
  const axis = rowGrabAxisAt(input, press)
  if (axis === null) return UNASSIGNED
  // One axis moves the picture and the other leaves it where it is (HF-15).
  if (axis === 'position') {
    const found = rowGrabPositionOf(context, groupId, input.y - press.at.y)
    // ⚠️ With no picture handed in nothing is drawn differently: the walk has no
    // second source.
    if (found === null) return UNASSIGNED
    return acted({
      kind: 'followRowGrab',
      groupId,
      axis,
      // The position axis does not change the depth (HF-15).
      atDepth: rowDepthOfGroup(context, groupId),
      atY: found.place.atY,
      // The refused axis on this grab is sideways, and one step of it is S-37.
      resistedPx: rowGrabResistedPx(
        input.x - press.at.x,
        context.document.documentSettings.rowTitleIndent,
      ),
    })
  }
  const step = rowGrabLandingOf(context, groupId, rowGrabDepthSteps(context, input, press))
  if (step === null) return UNASSIGNED
  // The depth axis is drawn where the row already stands vertically.
  return acted({
    kind: 'followRowGrab',
    groupId,
    axis,
    atDepth: step.landing.depth,
    atY: null,
    // The refused axis on this grab is up and down, and one step of it is the
    // height the picture gave this row.
    resistedPx: rowGrabResistedPx(input.y - press.at.y, rowGrabRowHeightOf(context, groupId)),
  })
}

/**
 * HF-15's resistance: the follow on a refused axis stops at S-212 of one step.
 *
 * Not zero, or a refused grab reads like one that did not take (S-212's note);
 * not the full travel, which HF-15 forbids. ⛔ S-212 comes from the generated
 * block at the foot of this file (rule 03 section 1).
 * ⚠️ The sign is the hand's, so the row leans the way the person is pulling.
 *
 * @purity pure
 */
function rowGrabResistedPx(travelPx: number, stepPx: number): number {
  const furthest = Math.abs(stepPx) * NOT_STORED_ROW_GRAB_SIZES['S-212']
  return Math.max(-furthest, Math.min(furthest, travelPx))
}

/**
 * The height the picture gave the held row -- one step of the axis a depth
 * grab refuses.
 *
 * ⛔ Read off the drawn boxes, not a setting: every row carries its own height
 * (FR-042, AT-59). ⚠️ Zero with no picture, so the row does not lean by an
 * invented amount.
 *
 * @purity pure
 */
function rowGrabRowHeightOf(context: InputContext, heldGroupId: string): number {
  const placed = (context.drawnRowBoxes ?? []).find((one) => one.groupId === heldGroupId)
  return placed === undefined ? 0 : placed.box.height
}

/**
 * How deep one row of the document sits, a root row counting as 1.
 *
 * Two readers, so it is named after neither: HF-15's grab draws the held row at
 * this depth, and HF-14's press asks whether the row stands at FR-085's cap.
 * ⛔ The document and not `context.layout.rows`, for `rowGrabDepthOf`'s reason.
 * ⚠️ A row the document does not hold reads as a root, so a press whose row has
 * gone is not refused for a depth nobody can see.
 *
 * @purity pure
 */
function rowDepthOfGroup(context: InputContext, groupId: string): number {
  const rows = context.document.schedule.taskGroups
  const byId = new Map(rows.map((one) => [one.id, one]))
  const found = byId.get(groupId)
  return found === undefined ? 1 : rowGrabDepthOf(byId, found)
}

/**
 * The fold the person put on the parent this press was made on, taken off --
 * and nothing else's (HF-14, MUST / MUST NOT).
 *
 * One row and not a walk up the tree. ⚠️ An ancestor cannot be folded while
 * this press is possible (LC-1 drops its descendants, so no IC-91 is drawn),
 * but the MUST NOT is kept by asking about `parentGroupId` alone rather than by
 * relying on that.
 *
 * ⚠️ `null` is 段 0, whose fold is S-211 of table T-206 -- a screen value no
 * `DocumentCommand` writes. The shell opens it for a created root row
 * (`frame-loop.ts`, HF-17).
 *
 * ⚠️ Only the fold (AT-56). HR-6's hiding (AT-57) is not this row's subject,
 * and a hidden parent is not drawn, so no press reaches one.
 *
 * @purity pure
 */
function parentFoldTakenOff(
  schedule: Schedule,
  parentGroupId: string | null,
): readonly DocumentCommand[] {
  if (parentGroupId === null) return []
  const parent = schedule.taskGroups.find((one) => one.id === parentGroupId)
  if (parent?.isCollapsed !== true) return []
  // CM-33, written only when it changes something: an unfolded parent would
  // cost an undo step for a write that moves nothing (as `foldsRowAndBelow`
  // leaves already-folded rows out).
  return [{ kind: 'setTaskGroupCollapsed', groupId: parentGroupId, collapsed: false }]
}

/**
 * HF-14's press: the row stood up with the default name, FR-018's tier opened
 * far enough to draw it, the parent's fold taken off, and the row carried out
 * so that the `Properties Panel` can be turned to it. One member for IC-91 and
 * IC-93 (HF-17); a `null` parent is 段 0.
 *
 * The tier is opened, not merely scrolled to (HF-14): FR-018's group half is a
 * function of `zoomY` alone (`groupDepthLimit`), so opening it is writing the
 * smallest `zoomY` that draws this depth (CM-65).
 * ⛔ That value comes from `groupDepthThresholdOf` only: the fit lands the zoom
 * on a threshold and reads it back through `groupDepthLimit`, so a value from
 * another route can differ by one ulp.
 * ⚠️ `zoomX` is carried through unchanged; FR-018's group half reads only the
 * vertical.
 *
 * ⛔ Two writes and not one bundle, zoom first -- the trap `isUndoable` spells
 * out. UN-8 of table T-027 keeps CM-65 out of the history and WS-4 of table
 * T-067 pushes the document as it stood before a write, so a single bundle
 * would let undo rewind the zoom (FR-031 orders CM-71 before CM-72 for the same
 * reason).
 * The fold rides with the row: CM-33 is undoable, so a bundle of its own would
 * make one undo take the row and leave the parent open.
 *
 * @purity pure
 */
function rowStoodUp(
  context: InputContext,
  parentGroupId: string | null,
  depth: number,
): TranslatedInput {
  const settings = context.document.documentSettings
  const opensTier = depth > groupDepthLimit(settings)
  const newGroupId = context.newGroupId
  return changedAndCreated(
    [
      opensTier
        ? [
            {
              kind: 'setZoom',
              zoomX: settings.zoomX,
              zoomY: groupDepthThresholdOf(depth, settings),
            } as const,
          ]
        : [],
      [
        ...parentFoldTakenOff(context.document.schedule, parentGroupId),
        {
          // CM-26. `derivedFromTaskUid` is null: HF-14 gives this row a name of
          // its own, so FR-058 lends it no Task's name.
          kind: 'createTaskGroup',
          id: newGroupId,
          parentId: parentGroupId,
          label: DEFAULT_ROW_NAME,
          derivedFromTaskUid: null,
          // AT-55, one past the last sibling (HF-14).
          order: orderPastLastChild(context.document.schedule, parentGroupId),
        } as const,
      ],
    ],
    { kind: 'row', groupId: newGroupId },
  )
}

/**
 * What a release on GR-20's strip is assigned to -- HF-15's move, or the reason
 * it could not be made. Settled on the release (IN-1 of table T-028).
 *
 * A press that never settled an axis is FR-085's choosing: HF-15 speaks only of
 * a held row, and swallowing the press would leave a strip-wide stripe down the
 * panel where a row cannot be chosen.
 *
 * ⚠️ The legal steps are written and the refusal is not also told: the row did
 * move, and one happening carries one `InputAction` kind, so a telling would
 * cost the move.
 *
 * @purity pure
 */
function commandFromRowGrab(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
  heldGroupId: string,
): TranslatedInput {
  const axis = rowGrabAxisAt(release, press)
  if (axis === null) {
    return acted({
      kind: 'chooseRow',
      groupId: heldGroupId,
      // The press's keys, which is CS-2 of table T-066 -- see `commandFromEntry`.
      isExtending: press.at.modifiers.shift,
    })
  }
  const held = context.document.schedule.taskGroups.find((one) => one.id === heldGroupId)
  if (axis === 'position') {
    const found = rowGrabPositionOf(context, heldGroupId, release.y - press.at.y)
    if (found === null) return CONSUMED_ELSEWHERE
    if (found.situation !== null) return nothingToDo(found.situation)
    // The hand did not reach the next place: nothing moved, and nothing is told
    // because a place in that direction exists. ⚠️ An unmoved write would still
    // push an undo step (WS-4; see `changed`).
    if (found.place.isOwn) return CONSUMED_ELSEWHERE
    return changed([
      {
        kind: 'moveTaskGroup',
        groupId: heldGroupId,
        parentId: found.place.parentId,
        order: found.place.order,
      },
    ])
  }
  const steps = rowGrabDepthSteps(context, release, press)
  if (steps === 0) return CONSUMED_ELSEWHERE
  const step = rowGrabLandingOf(context, heldGroupId, steps)
  if (step === null) return CONSUMED_ELSEWHERE
  const landing = step.landing
  if (held !== undefined && held.parentId === landing.parentId) {
    // Every step was refused, so FR-029 has the reason told (NT-1 of table
    // T-037, the row of table T-233). ⚠️ Judged by the parent, not the step
    // count: every step on this axis changes the parent, and a CM-73 to the
    // row's own place would still push an undo step (WS-4).
    return step.situation === null ? CONSUMED_ELSEWHERE : nothingToDo(step.situation)
  }
  // CM-73, the one row of table T-108 that changes a row's parent. ⛔ Not
  // `reorderTaskGroupSiblings` (CM-35), which refuses a row from another parent.
  return changed([
    {
      kind: 'moveTaskGroup',
      groupId: heldGroupId,
      parentId: landing.parentId,
      order: landing.order,
    },
  ])
}

/**
 * One `setTaskGroupCollapsed` per row of `rowId`'s subtree, the row itself
 * included, that is not already folded, in document order -- HR-4 of table
 * T-015 (HF-11).
 *
 * The row itself is what moves the picture (HR-4); ⛔ it is never hidden (HR-4,
 * MUST NOT). The subtree is folded as well (HR-1a).
 * ⚠️ IC-59 (HR-6) does not reach the subtree: the closing paragraph under table
 * T-051 lists HR-1a, HR-3 and HR-7 as the rows that write below the pressed row.
 *
 * ⚠️ The mirror of `opensRowAndBelow`: rows already folded are left out, since
 * CM-33 returns an unchanged document untouched and writing them would cost an
 * undo step.
 *
 * ⛔ Rows under an already-folded row are still written. The fold is a column
 * of the document (AT-56), and a row left open under a folded one would spring
 * open the moment the fold above it comes off; HR-1a names no exception.
 *
 * @purity pure
 */
function foldsRowAndBelow(schedule: Schedule, rowId: string): readonly DocumentCommand[] {
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))
  const commands: DocumentCommand[] = []
  for (const row of schedule.taskGroups) {
    if (row.isCollapsed === true) continue
    if (row.id !== rowId && !isRowUnder(parentOf, row.parentId, rowId)) continue
    commands.push({ kind: 'setTaskGroupCollapsed', groupId: row.id, collapsed: true })
  }
  return commands
}

/**
 * Whether the fold family's press on `ancestorId` still has a target. `null`
 * where the caller carried no picture at all (`InputContext.drawnRowGroupIds`).
 *
 * Each operation writes the pressed row (closing paragraph under table T-051):
 * `fold` is HR-4, `openOneLevel` is HR-7 and `open` is HR-3. A press that would
 * add or remove no drawn row has no target (same paragraph).
 *
 * `openOneLevel` asks the picture (HF-13, FR-029): it is armed exactly where a
 * direct child of the pressed row is out of the picture, whatever put it out.
 * That is the same set `row-title-panel.ts` builds for `canOpenOneLevel`
 * (`groupIdsWithAChildOutOfThePicture`), off the same `rowBoxes`.
 * ⛔ Not "folded, or a hidden child": that armed a folded childless row whose
 * entrance the drawing side draws faint (RS-30).
 *
 * `ancestorId` of `null` is the whole document (HR-1, IC-74); there is no
 * pressed row then.
 *
 * ⛔ The `open` walk reads HR-6 and not FR-018: a hidden row stays hidden however
 * the folds above it move, and whether the level of detail keeps a revealed row
 * is `ScheduleLayout`'s judgement.
 *
 * ⚠️ The sets are built in one pass: NFR-013 (MUST NOT) refuses an O(n^2)
 * algorithm, which asking each row for its children would be.
 *
 * @purity pure
 */
function wouldMoveARow(
  context: InputContext,
  ancestorId: string | null,
  operation: 'open' | 'fold' | 'openOneLevel',
): boolean | null {
  const drawnIds = context.drawnRowGroupIds
  if (drawnIds === undefined) return null
  const drawn = new Set(drawnIds)
  const schedule = context.document.schedule
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))

  const withDrawnChild = new Set<string>()
  const withUnhiddenChild = new Set<string>()
  const withAChildOutOfThePicture = new Set<string>()
  for (const row of schedule.taskGroups) {
    if (row.parentId === null) continue
    if (drawn.has(row.id)) withDrawnChild.add(row.parentId)
    else withAChildOutOfThePicture.add(row.parentId)
    if (row.isHidden !== true) withUnhiddenChild.add(row.parentId)
  }
  const pressedRow =
    ancestorId === null
      ? undefined
      : schedule.taskGroups.find((one) => one.id === ancestorId)

  // ⛔ A row the picture does not hold carries no press: a control reached from
  // a stale frame would write rows no reader can see move.
  if (ancestorId !== null && (pressedRow === undefined || !drawn.has(ancestorId))) return false

  // HR-4 (HF-11): this row folds, so the press is spent exactly where the
  // picture holds no child of it to take away.
  if (operation === 'fold') return ancestorId !== null && withDrawnChild.has(ancestorId)

  // HR-7 (HF-13): this row's fold comes off and its direct children are
  // unhidden; RS-30 counts what that puts back.
  if (operation === 'openOneLevel') {
    if (ancestorId === null) return false
    return withAChildOutOfThePicture.has(ancestorId)
  }

  // HR-3 (HF-2): this row and its whole subtree lose both the fold and the
  // hiding, so the pressed row's own fold counts before the walk begins.
  if (
    ancestorId !== null &&
    pressedRow?.isCollapsed === true &&
    withUnhiddenChild.has(ancestorId)
  ) {
    return true
  }
  for (const row of schedule.taskGroups) {
    if (ancestorId !== null && !isRowUnder(parentOf, row.parentId, ancestorId)) continue
    // ⛔ A hidden row counts for an opening and cannot be asked of the picture:
    // HR-3 brings back rows HR-6 hid, and HR-6 keeps them out of `drawn`, so
    // testing `drawn` first would make the all-below open do less than the
    // one-level open.
    if (row.isHidden === true) return true
    if (!drawn.has(row.id)) continue
    if (row.isCollapsed === true && withUnhiddenChild.has(row.id)) return true
  }
  return false
}

/**
 * Whether the picture holds a row of the shallowest level -- what 段 0's own
 * folding entrance (IC-78, HF-12) would take out of it.
 *
 * 段 0 is a row one level up (HR-2), so this is `withDrawnChild` asked of the
 * head, whose children are the rows with no parent (AT-52).
 * ⚠️ With no picture it falls back to the document: a caller that measured
 * nothing must not silence an entrance that has work.
 *
 * @purity pure
 */
function isARowOfTheShallowestLevelDrawn(context: InputContext): boolean {
  const rootRows = context.document.schedule.taskGroups.filter((row) => row.parentId === null)
  const drawnIds = context.drawnRowGroupIds
  if (drawnIds === undefined) return rootRows.some((row) => row.isHidden !== true)
  const drawn = new Set(drawnIds)
  return rootRows.some((row) => drawn.has(row.id))
}

/**
 * One `setTaskGroupHidden` per row HR-6 hid -- the unhiding half of HF-10's
 * press (HR-1).
 *
 * Every depth, unlike `opensLevelZeroHiddenRows`, which serves HF-16's
 * shallowest level (HR-2).
 * ⚠️ A row that is not hidden is not written, so with none the press stays the
 * one write CM-72 already was.
 *
 * @purity pure
 */
function unhidesEveryRow(schedule: Schedule): readonly DocumentCommand[] {
  return schedule.taskGroups
    .filter((row) => row.isHidden === true)
    .map((row) => ({ kind: 'setTaskGroupHidden', groupId: row.id, hidden: false }) as const)
}

/**
 * One `setTaskGroupCollapsed` per row that is not folded -- HR-2 of table
 * T-015 (HF-12).
 *
 * ⛔ Every row, childless and hidden ones too: HR-2 names no exception and
 * CM-72 is written the same way, so a row that grows a child later is already
 * folded, and 「すべて」 does not depend on what is visible.
 *
 * @purity pure
 */
function foldsEveryRow(schedule: Schedule): readonly DocumentCommand[] {
  return schedule.taskGroups
    .filter((row) => row.isCollapsed !== true)
    .map((row) => ({ kind: 'setTaskGroupCollapsed', groupId: row.id, collapsed: true }) as const)
}

/**
 * Whether a row whose parent is `parentId` sits anywhere under `ancestorId`,
 * climbing `TaskGroup.parentId` (AT-52).
 *
 * ⛔ The climb guards against a ring: `schedule.ts` reports a `parentId` ring as
 * a violation rather than refusing the document, so without the guard a ringed
 * document would spin here for ever, inside a frame.
 *
 * @purity pure
 */
function isRowUnder(
  parentOf: ReadonlyMap<string, string | null>,
  parentId: string | null,
  ancestorId: string,
): boolean {
  const climbed = new Set<string>()
  let at = parentId
  while (at !== null && !climbed.has(at)) {
    if (at === ancestorId) return true
    climbed.add(at)
    at = parentOf.get(at) ?? null
  }
  return false
}

/**
 * SP-2 and SP-3 of FR-083 -- a palette shape pressed while something is
 * selected changes the selected shapes. The arming half of the same press is
 * `screenStateFromInput`'s; this member answers only the document side.
 *
 * ⛔ A mixed selection is not filtered: no row says whether SP-3 or FR-083's ban
 * on crossing between table T-012's SH-1 .. SH-4 and SH-5 wins. The whole
 * bundle is planned, `editTask` refuses the crossing one (CM-20), and AG-3
 * makes the bundle atomic, so nothing changes and NT-1 tells the person why;
 * filtering here would settle the question instead. Searched: FR-083, table
 * T-012, table T-108 CM-20 / CM-21, table T-035 AG-3, `edit-task.ts`.
 *
 * @purity pure
 */
function commandFromArmingEntry(entry: string, context: InputContext): TranslatedInput {
  const armed = armedByEntry(entry)
  // Not an entry this file has an assignment for. ⛔ It is still this tool's
  // press -- MK-10 keeps the browser out from under something this tool drew.
  if (armed === null) return CONSUMED_ELSEWHERE
  // SP-1 and SP-4 belong to `screenStateFromInput`, which is where the arming
  // lives; with nothing selected there is no shape to change.
  if (context.selection.items.length === 0) return CONSUMED_ELSEWHERE

  const commands: DocumentCommand[] = []
  for (const one of context.selection.items) {
    if (one.kind !== 'task') continue
    if (armed.kind === 'taskShape') {
      const shapeKind = taskShapeKindOf(armed.shapeKind)
      if (shapeKind !== null) commands.push({ kind: 'setTaskVisualShapeKind', uid: one.uid, shapeKind })
      continue
    }
    if (armed.kind === 'milestoneShape') {
      const glyph = milestoneGlyphOf(armed.glyph)
      // ⚠️ An armed figure whose spelling AT-101 does not admit changes nothing.
      // `Armed` types it as a bare string, so a caller CAN hold one.
      if (glyph === null) continue
      // ⚠️ Two commands, because FR-078's figures are a column of their own
      // (AT-101) while the SHAPE that makes a task a milestone is SH-5.
      // CM-20 is what refuses the crossing; CM-21 only chooses the figure.
      commands.push({ kind: 'setTaskVisualShapeKind', uid: one.uid, shapeKind: 'milestone' })
      commands.push({ kind: 'setTaskVisualMilestoneGlyph', uid: one.uid, glyph })
      continue
    }
    // AR-4 / AR-5 / AR-6 are not palette shapes (SP-1 .. SP-3), so they change
    // nothing selected; they only arm.
  }
  return changed(commands)
}

/**
 * PTD-3 while AR-4 is armed: UC-004's step 2, one drag -- the press draws out
 * of the predecessor and the release draws into the successor.
 *
 * ⛔ No `linkType` is chosen here: FR-009 maps the pair of edges one-to-one to
 * the type, so the edges leave here and `edit-dependency.ts` looks up table
 * T-018. A type written on this side would be the separate entrance FR-009
 * refuses.
 *
 * The predecessor is the press's `Hit` (MK-9a's order, already resolved); table
 * T-023d is not applied (PTD-3), so `hit.grab` is dropped and `hit.item` kept.
 * The half of the bar comes from `dependencyEndAtPointer`.
 *
 * ⚠️ An end that is not a Task ends the gesture silently, PTD-4a's shape: the
 * half-drawn arrow is the renderer's and the arming is untouched. ⛔ No telling
 * is composed: a release on a Task goes to `edit-dependency.ts`, which judges
 * FR-009's three refusals, and a release on empty canvas has no UID to send.
 *
 * @purity pure
 */
function commandFromDependencyDrag(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const hit = press.hit
  // ⚠️ `pressRowOf` only answers PTD-3 for a press that HIT, so the null is
  // unreachable; it is tested rather than asserted because `Hit` is nullable.
  if (hit === null || hit.item.kind !== 'task') return CONSUMED_ELSEWHERE
  // The press's Task is MK-9a's answer already, so it is NAMED; the release has
  // no `Hit` before it, so the bar's own silhouette answers which Task.
  const from = dependencyEndAtPointer(context.geometry, press.at.x, press.at.y, hit.item.taskUid)
  if (from === null) return CONSUMED_ELSEWHERE
  const into = dependencyEndAtPointer(context.geometry, release.x, release.y, null)
  if (into === null) return CONSUMED_ELSEWHERE
  return changed([
    {
      kind: 'createDependency',
      predecessorUid: from.taskUid,
      successorUid: into.taskUid,
      predecessorEdge: from.edge,
      successorEdge: into.edge,
    },
  ])
}

/**
 * PTD-3 -- what was grabbed, by the row of table T-023d that claimed it.
 *
 * ⚠️ MK-13 is read before the grab, because a double click means something
 * different from a drag on the same place (see `InPlaceTarget`).
 *
 * @purity pure
 */
function commandFromGrab(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const hit = press.hit
  if (hit === null) return CONSUMED_ELSEWHERE
  const item = hit.item

  if (release.clickCount >= 2 && item.kind === 'task') {
    // MK-13's Task entry: the name label, the body and the actual all reach the
    // Task's name field. One destination for label and body because NL-1 of
    // table T-013 draws the label inside the shape. The actual's grab regions
    // (GR-5 / GR-6, GR-15, and the GR-9 / GR-17 / GR-18 dummies) are included
    // because MK-13 gives the actual no surface of its own.
    // ⛔ Read before the switch, not by table T-023d's priority order (its
    // closing rule): GR-5 / GR-6 stand above GR-12, so the switch would rewrite
    // the same day.
    // ⛔ Not GR-3 / GR-4 (the plan's ends) nor GR-7 / GR-8 (outside the actual
    // bar): MK-13 names neither, so their double click falls to the grab.
    const isNameEntrance =
      hit.grab === 'GR-10' ||
      hit.grab === 'GR-12' ||
      hit.grab === 'GR-15' ||
      hit.grab === 'GR-5' ||
      hit.grab === 'GR-6' ||
      hit.grab === 'GR-9' ||
      hit.grab === 'GR-17' ||
      hit.grab === 'GR-18'
    if (isNameEntrance) {
      return acted({ kind: 'editInPlace', target: { kind: 'taskName', uid: item.taskUid } })
    }
    // MK-13's assignee label entry goes to AS-1 of table T-225 (GR-11). ⛔ Apart
    // from `isNameEntrance`: MK-13 prints the two destinations apart (PR-16
    // against PR-1).
    if (hit.grab === 'GR-11') {
      return acted({ kind: 'editInPlace', target: { kind: 'assignee', uid: item.taskUid } })
    }
  }

  if (item.kind === 'statusLine' && hit.grab === 'GR-16') {
    // FR-046: the line is dragged sideways and `statusDate` follows it.
    const day = dayAtX(context.layout, release.x)
    return day === null ? CONSUMED_ELSEWHERE : changed([{ kind: 'setStatusDate', date: textOfDay(day) }])
  }

  if (release.clickCount >= 2 && item.kind === 'commentBox' && hit.grab === 'GR-14') {
    // MK-13's comment box entry: the body field (PR-21 of table T-016); FR-097
    // sends its entrance here.
    // ⛔ Read before GR-14's move below, or a double click and a drag on the same
    // place would be one press.
    // ⛔ Nothing is written or chosen: the first click already moved the
    // selection (SL-2 of table T-023c), and the panel field commits the body.
    return acted({ kind: 'editInPlace', target: { kind: 'commentBoxText', id: item.id } })
  }

  // ⛔ The first release of a double click. MK-13 decides a double click's
  // destination, not table T-023d's order (the table's closing rule), but
  // `clickCount` is 1 on the first release, so without this arm that release
  // falls to the switch below and reaches a second destination -- for GR-17, an
  // actual 0px wide written from a drag of nothing.
  // What separates it from a drag is travel past S-208
  // (`hasDraggedPastThreshold`, the one value FR-001 / FR-019 use for the whole
  // tool); every half of a double click is a press that did not travel.
  // Only the rows MK-13 names (`MK_13_GRAB_ROWS`): other rows keep the table's
  // order for both clicks. GR-10 and GR-11 need no arm, since the closing rule
  // keeps them out of a plain press.
  // `CONSUMED_ELSEWHERE`, not an empty bundle: the press stays this tool's
  // (MK-10). ⛔ The selection is not touched: `selectionFromInput` answers SL-2,
  // so the first click still chooses what it pressed and MK-13's panel opens
  // on it.
  if (MK_13_GRAB_ROWS.has(hit.grab) && !hasDraggedPastThreshold(press, release)) {
    return CONSUMED_ELSEWHERE
  }

  if (item.kind === 'commentBox' && hit.grab === 'GR-14') {
    // GR-14's move. The travel is added in screen pixels, not through the day
    // axis: FR-019 holds this distance in screen pixels so a zoom does not change
    // it (CM-51). The anchor is left alone, or the same picture would move twice.
    // A lookup rather than a new member of `schedule.ts`: PI-1 of table T-064 is
    // the full list of what that unit publishes.
    // @provisional PND-316
    const box = context.document.schedule.commentBoxes.find((one) => one.id === item.id)
    // ⚠️ The box is gone from under the press. ⛔ Still this tool's press: MK-10
    // keeps the browser out from under a grab it took.
    if (box === undefined) return CONSUMED_ELSEWHERE
    const stood = box.bodyOffsetPx ?? { dx: 0, dy: 0 }
    return changed([
      {
        kind: 'setCommentBoxBodyOffsetPx',
        id: item.id,
        dx: stood.dx + (release.x - press.at.x),
        dy: stood.dy + (release.y - press.at.y),
      },
    ])
  }

  if (item.kind !== 'task') return CONSUMED_ELSEWHERE

  const uid = item.taskUid
  switch (hit.grab) {
    case 'GR-7':
      // FR-013: the marker cycles the state. ⚠️ Not a drag -- the cycle is one
      // step per release, whatever distance the pointer covered.
      return changed([{ kind: 'cycleTaskPlanActualState', uid }])
    case 'GR-1':
    case 'GR-2': {
      // Table T-023d's closing rule: the days come from the pointer's POSITION
      // (GR-1 counted from `start`, GR-2 back from the plan's end), rounded to a
      // day, then cut down by FD-6 of table T-012a. The position and not the day
      // it stands in: between two whole days there is nothing left to round.
      // The fraction is read the way `dayAnchorAt` reads it, off the same two
      // converters, so `x -> day` and `day -> x` cannot drift apart; the whole
      // part still comes from `dayAtX`. ⚠️ No threshold (MUST NOT): the position
      // is read on the release.
      // ⚠️ SL-7a: one Task, whatever else is selected. FD-5 and FR-075 are spent
      // in `item-hit-area.ts`, so a Task with no handles never arrives as GR-1 or
      // GR-2.
      const task = taskByUid(context.document.schedule, uid)
      const start = dayOf(task === null ? null : task.start)
      const finish = dayOf(task === null ? null : task.finish)
      const day = dayAtX(context.layout, release.x)
      if (task === null || start === null || finish === null || day === null) {
        return CONSUMED_ELSEWHERE
      }
      // Where the pointer stands on the time axis, as a day and a fraction of
      // one. ⚠️ A layout with no width per day cannot answer, and `dayAtX` has
      // already refused above in that case.
      const atPointer =
        serialOfDay(day) +
        unitFraction((release.x - xFromDay(context.layout, day)) / context.layout.pxPerDay)
      const pulled =
        hit.grab === 'GR-1'
          ? Math.round(atPointer - serialOfDay(start))
          : Math.round(serialOfDay(finish) - atPointer)
      const days = clampedFadeDays(task, hit.grab, pulled, serialOfDay(finish) - serialOfDay(start))
      return changed([
        hit.grab === 'GR-1'
          ? { kind: 'setTaskFadeInDays', uid, days }
          : { kind: 'setTaskFadeOutDays', uid, days },
      ])
    }
    case 'GR-3':
    case 'GR-4': {
      // SL-7a (MUST): an END drag narrows to the ONE task grabbed, whatever
      // else is selected -- stretching several at once has no meaning.
      const task = taskByUid(context.document.schedule, uid)
      const start = dayOf(task === null ? null : task.start)
      const finish = dayOf(task === null ? null : task.finish)
      const day = dayAtX(context.layout, release.x)
      if (start === null || finish === null || day === null) return CONSUMED_ELSEWHERE
      const moved =
        hit.grab === 'GR-3'
          ? { start: day, finish }
          : { start, finish: day }
      // ⚠️ An end dragged past the other one is left to the aggregate: IV-2 is
      // `editTask`'s to enforce, and a translator that clamped here would give
      // the same drag two different answers depending on who ran it.
      return changed([
        {
          kind: 'setTaskPlanDates',
          uid,
          start: textOfDay(moved.start),
          finish: textOfDay(moved.finish),
        },
      ])
    }
    case 'GR-5':
    case 'GR-15':
    case 'GR-6': {
      // Table T-023d: GR-5 changes `actualStart`, GR-6 `actualDuration`; one Task
      // only (SL-7a). GR-15 rides with GR-5 because its row moves the same column
      // (see `actualEndPlacement`).
      const task = taskByUid(context.document.schedule, uid)
      const dropped = dayAtX(context.layout, release.x)
      if (task === null || dropped === null) return CONSUMED_ELSEWHERE
      const place = actualEndPlacement(context.document.schedule, task, hit.grab, dropped)
      // ⚠️ `null` where the Task holds no actual to move an end of, or where the
      // row it stands at wants a column it does not carry. ⛔ Still this tool's
      // press: MK-10 keeps the browser out from under a grab it took.
      if (place === null) return CONSUMED_ELSEWHERE
      return changed([{ kind: 'setTaskPlanActualState', uid, place }])
    }
    case 'GR-9':
    case 'GR-17':
    case 'GR-18': {
      // FR-043's dummies: one command for all three, carrying the DAY let go on
      // and WHICH handle was held. Table T-023d gives GR-9 and GR-17 different
      // values for the same columns (GR-9 takes the day as the start, GR-17 as a
      // length from GR-9's start), and the two share one drawn mark split down
      // its middle, so `hit.grab` is the only record of which half was pressed.
      // ⚠️ CM-14 reads the shape itself to choose between S-129 and S-130.
      //
      // Only the release reaches this function (IN-1 of table T-028, which the
      // table's closing rule names), so a pointer lost mid-gesture writes
      // nothing (IN-1a).
      //
      // ⚠️ GR-9's MUST NOT (no state cycled by a press) is kept by the hit test:
      // a point GR-9 claims never arrives as GR-7.
      //
      // ⛔ Not this unit's: table T-023d also requires the actual about to be
      // placed to be DRAWN while held. That picture is the renderer's -- IN-1
      // keeps a move from carrying an action.
      //
      // ⛔ The dropped day is not moved to a working one (table T-023d's closing
      // rule, as in the GR-8 arm), and it is not the day the dummy stands on
      // (FR-043, MUST NOT): reading the placement as the value made every drop
      // write the same day.
      //
      // ⚠️ `null` where the pointer came down on no day at all. ⛔ Still this
      // tool's press: MK-10 keeps the browser out from under a grab it took.
      const dropped = dayAtX(context.layout, release.x)
      if (dropped === null) return CONSUMED_ELSEWHERE
      return changed([
        { kind: 'beginTaskActual', uid, grabbed: hit.grab, droppedDay: textOfDay(dropped) },
      ])
    }
    case 'GR-12': {
      // FR-011 and HM-3 of table T-015a: the body moves sideways by whole days
      // and, when it went up or down, changes the row it is drawn on.
      // SL-7 (MUST): the same shift is applied to every selected Task, or to the
      // grabbed one alone when it is not in the selection.
      const shift = dayShift(context, press.at.x, release.x)
      const row = rowAtY(context.layout, release.y)
      const movedRow = row === null ? null : row.groupId
      const moving = movedTaskUids(context, uid)
      const commands: DocumentCommand[] = []
      for (const each of moving) {
        const task = taskByUid(context.document.schedule, each)
        if (task === null) continue
        const start = dayOf(task.start)
        const finish = dayOf(task.finish)
        if (start !== null && finish !== null && shift !== 0) {
          commands.push({
            kind: 'setTaskPlanDates',
            uid: each,
            start: textOfDay(dayShifted(start, shift)),
            finish: textOfDay(dayShifted(finish, shift)),
          })
        }
      }
      // ⚠️ Only the grabbed Task changes rows. HM-3 is about the bar the
      // pointer is on, and a selection spread over several rows has no single
      // row to be carried to.
      if (movedRow !== null && movedRow !== rowOfTask(context, uid)) {
        commands.push({ kind: 'moveTaskToTaskGroup', uid, groupId: movedRow })
      }
      return changed(commands)
    }
    case 'GR-8': {
      // Table T-023d GR-8 gives this grab `resume` (FR-044).
      //
      // ⛔ The dropped day is not moved to a working one (the rule under table
      // T-023d, MUST NOT), the same reading `actualEndPlacement` takes.
      //
      // `resumeValid` is not decided here: PA-3 of table T-019 carries the pair
      // FR-044 requires and `edit-task.ts` writes it.
      //
      // ⚠️ The other columns are carried, not recomputed, for the reason
      // `actualEndPlacement` gives on GR-6's `actualFinish`.
      const task = taskByUid(context.document.schedule, uid)
      const dropped = dayAtX(context.layout, release.x)
      if (task === null || dropped === null) return CONSUMED_ELSEWHERE
      // ⚠️ A suspension carrying no actual leaves PA-3's row unwritable -- the
      // same arm `actualEndPlacement` takes where the columns it must carry are
      // not there. ⛔ Still this tool's press: MK-10 keeps the browser out from
      // under a grab it took. @provisional PND-318
      if (task.actualStart === null || task.actualDuration === null) return CONSUMED_ELSEWHERE
      return changed([
        {
          kind: 'setTaskPlanActualState',
          uid,
          place: {
            row: 'PA-3',
            actualStart: task.actualStart,
            actualDuration: task.actualDuration,
            resume: textOfDay(dropped),
          },
        },
      ])
    }
    default:
      // STOP -- ⛔ THE REMAINING ROWS OF TABLE T-023d ARE NOT WRITTEN, and each
      // is missing something different rather than being an oversight:
      //   GR-10 / GR-11  double-click only (table T-023d's closing rule,
      //                `item-hit-area.ts`), so a plain press never arrives as
      //                either; their double click is answered before the switch.
      //   GR-13        a dependency is SELECTED by a press rather than changed
      //                by one, which is the whole of its operation column.
      //   GR-14        the HIGHLIGHT BOX half only. Its comment box is written
      //                above the switch; the resize half of GR-14's operation
      //                names the body, the anchor and the four corners, and no
      //                table gives the anchor or a corner a size -- so nothing
      //                here can tell which of the three a press took.
      // Searched: table T-023d, FR-011, FR-013, FR-019, FR-043, FR-044, FR-045, FR-046,
      // table T-206, `edit-task.ts`, `edit-annotation.ts`.
      return CONSUMED_ELSEWHERE
  }
}

/**
 * How many of the chosen Tasks the picture actually holds -- FR-029's count for
 * FR-034's two entrances.
 *
 * The join the palette makes, out of two facts neither invented here:
 * `InputContext.drawnRowGroupIds` (the rows the last frame drew, with folds,
 * hiding and FR-018's depth limit already applied) and
 * `Schedule.taskGroupMembers` (ET-5 of table T-056). ⛔ A Task with no member row
 * is not drawn and is not counted.
 *
 * ⛔ Absent means no picture was handed over, never nothing drawn: the wider count
 * is kept, because a false faint says a working entrance is broken (FR-029).
 * ⚠️ An EMPTY array is a different answer and is honoured.
 *
 * ⛔ It counts and does not narrow the write: FR-034 lines up the selected Tasks,
 * so `alignWrites` still reads the selection.
 *
 * ⚠️ One pass over the members: NFR-013 (MUST NOT) refuses an O(n^2) walk.
 *
 * @purity pure
 */
function chosenDrawnTaskCount(context: InputContext): number {
  const chosen = context.selection.items.filter((one) => one.kind === 'task')
  const drawnIds = context.drawnRowGroupIds
  if (drawnIds === undefined) return chosen.length
  const drawn = new Set(drawnIds)
  const drawnTaskUids = new Set<number>()
  for (const member of context.document.schedule.taskGroupMembers) {
    if (drawn.has(member.groupId)) drawnTaskUids.add(member.taskUid)
  }
  return chosen.filter((one) => one.kind === 'task' && drawnTaskUids.has(one.uid)).length
}

/**
 * FR-034's alignment, as a bundle of CM-11.
 *
 * The anchor is the LAST `task` of `Selection.items` (SL-7b keeps pick order).
 * ⛔ The anchor is never written: it is already where the others line up, and a
 * write for it would be an undo step that moved nothing.
 *
 * The whole Task moves, keeping its duration: CM-11 refuses a finish before its
 * start (IV-10, `edit-task.ts`), so writing one end alone would be refused
 * whenever the anchor's day crossed the other end; a shift never can be, and
 * GR-12 uses the same arithmetic. ⛔ The specification does not decide whether
 * the other end follows or holds still.
 * @provisional PND-406
 *
 * ⚠️ A Task with no `start` or no `finish` is passed over rather than half
 * written: CM-11 puts both.
 *
 * @purity pure
 */
function alignWrites(context: InputContext, byStart: boolean): readonly DocumentCommand[] {
  const chosen = context.selection.items.filter((one) => one.kind === 'task')
  const anchorRef = chosen[chosen.length - 1]
  if (anchorRef === undefined || anchorRef.kind !== 'task') return []
  const anchor = taskByUid(context.document.schedule, anchorRef.uid)
  const anchorDay = anchor === null ? null : dayOf(byStart ? anchor.start : anchor.finish)
  if (anchorDay === null) return []

  const commands: DocumentCommand[] = []
  for (const one of chosen) {
    if (one.kind !== 'task' || one.uid === anchorRef.uid) continue
    const task = taskByUid(context.document.schedule, one.uid)
    if (task === null) continue
    const start = dayOf(task.start)
    const finish = dayOf(task.finish)
    if (start === null || finish === null) continue
    const shift = serialOfDay(anchorDay) - serialOfDay(byStart ? start : finish)
    if (shift === 0) continue
    commands.push({
      kind: 'setTaskPlanDates',
      uid: one.uid,
      start: textOfDay(dayShifted(start, shift)),
      finish: textOfDay(dayShifted(finish, shift)),
    })
  }
  return commands
}

/**
 * FD-6 of table T-012a, in days: `fadeIn` is cut down to [0, the plan's span]
 * and `fadeOut` to [0, the span less the `fadeIn` that stands] -- `fadeIn` wins.
 *
 * The span is the one the axis draws: `schedule-geometry.ts` applies FD-6 in
 * pixels to a width `schedule-layout.ts` builds from calendar days, so a day
 * counted any other way would put the corner somewhere other than under the
 * hand. FD-6 and IV-12 both count calendar days, so a pair FD-6 allows IV-12
 * allows.
 *
 * ⛔ One row's days and not the pair: the closing rule under table T-023d cuts
 * down the days THIS grab obtained, so the other column is read and never
 * written (the reading GR-6 takes of `actualFinish`).
 *
 * @purity pure
 */
function clampedFadeDays(task: Task, grab: 'GR-1' | 'GR-2', pulled: number, span: number): number {
  // ⚠️ The room can come out negative -- a fade already stands that is longer
  // than the plan is now -- and an empty range is read as the 0 both ends of it
  // then hold, never as "no limit".
  const room = grab === 'GR-1' ? span : span - (task.fadeInDays ?? 0)
  return Math.min(Math.max(0, pulled), Math.max(0, room))
}

/**
 * What CM-13 is handed, read off `DocumentCommand` rather than imported:
 * `PlanActualPlacement` is not on table T-064, so it may not cross a component
 * folder by name (check 26b).
 */
type PlacedPlanActual = Extract<DocumentCommand, { kind: 'setTaskPlanActualState' }>['place']

/**
 * Where GR-5, GR-6 or GR-15 leaves the actual, stated as the row of table T-019
 * the Task ALREADY stands at.
 *
 * ⛔ No state is chosen here. CM-13 places a whole row of table T-019 while table
 * T-023d gives these grabs one column each, so the row is read back with
 * `planActualState` (table T-019a) and written again with the one moved value;
 * choosing a row would let a drag on an end suspend or finish a Task. ⚠️ The two
 * tables join on the state they print, not their numbering.
 *
 * GR-6's count is the inverse of FR-011's picture: the end is
 * `dateFromWorkingDays` from `actualStart`, so the duration is
 * `workingDaysBetween` over the same half-open span.
 * GR-5 keeps the actual's finish and lays the duration down again (GR-5 forbids
 * sliding the bar; FR-011 moves no end the hand did not place).
 * ⚠️ GR-15 carries the duration: a milestone holds no actual bar, and its
 * duration is FR-043's S-130, which no row asks this drag to move.
 *
 * ⛔ The dropped day is not moved to a working one (the rule under table
 * T-023d). ⚠️ Nothing is clamped either: an end past the other is the
 * aggregate's to judge, as GR-3 and GR-4 read IV-2.
 *
 * ⚠️ `null` where there is nothing to move, or nothing to write the row with.
 *
 * @purity pure
 */
function actualEndPlacement(
  schedule: Schedule,
  task: Task,
  grab: 'GR-5' | 'GR-6' | 'GR-15',
  dropped: CalendarDay,
): PlacedPlanActual | null {
  const held = dayOf(task.actualStart)
  if (held === null) return null
  const calendar = workingCalendarOf(schedule)
  // Where the actual ends as the Task stands (FR-011's picture read forwards).
  // `null` with no duration; the guard below answers that.
  const heldFinish =
    task.actualDuration === null ? null : dateFromWorkingDays(calendar, held, task.actualDuration)
  const actualStart = grab === 'GR-6' ? textOfDay(held) : textOfDay(dropped)
  const actualDuration =
    grab === 'GR-6'
      ? workingDaysBetween(calendar, held, dropped)
      : grab === 'GR-5'
        ? heldFinish === null
          ? null
          : workingDaysBetween(calendar, dropped, heldFinish)
        : task.actualDuration
  if (actualDuration === null) return null

  switch (planActualState(task)) {
    case 'notStarted':
      // Unreachable past the guard above -- PS-1 IS `actualStart` being empty,
      // and a Task with no actual has no bar for either end to be grabbed on.
      // Answered rather than assumed away, because PA-1 carries neither of the
      // two values this drag moves and CM-13 would clear all four.
      return null
    case 'inProgress':
      return { row: 'PA-2', actualStart, actualDuration }
    case 'suspendedResumePlanned':
      // PS-4 IS `resume` holding a date, so the column is there to be carried;
      // the second read is the type's price, not a second rule.
      return task.resume === null
        ? null
        : { row: 'PA-3', actualStart, actualDuration, resume: task.resume }
    case 'suspendedResumeUnknown':
      return { row: 'PA-4', actualStart, actualDuration }
    case 'finished':
      // ⚠️ `actualFinish` is carried, not recomputed: table T-023d gives GR-6
      // the duration alone, and a finish taken from the drop would be a second
      // entrance to a column no row gives this grab.
      return task.actualFinish === null
        ? null
        : { row: 'PA-5', actualStart, actualDuration, actualFinish: task.actualFinish }
  }
}

/**
 * PTD-4 -- nothing was hit and a figure is armed, so the drag makes one.
 *
 * The press names the row (FR-001), which is also the end table T-023a reads to
 * decide what the gesture is.
 *
 * @purity pure
 */
function commandFromArmed(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const armed = context.screenState.armed
  const from = dayAtX(context.layout, press.at.x)
  const to = dayAtX(context.layout, release.x)
  const row = rowAtY(context.layout, press.at.y)
  if (from === null || to === null) return CONSUMED_ELSEWHERE
  const groupId = row === null ? context.newGroupId : row.groupId
  const early = compareDay(from, to) <= 0 ? from : to
  const late = compareDay(from, to) <= 0 ? to : from
  // The click / drag boundary is S-208 (FR-001 / FR-019). One reading for all
  // three armings below, so the boundary cannot sit in two places.
  const dragged = hasDraggedPastThreshold(press, release)

  if (armed.kind === 'taskShape' || armed.kind === 'milestoneShape') {
    const named = armed.kind === 'taskShape' ? armed.shapeKind : 'milestone'
    const shapeKind = taskShapeKindOf(named)
    // ⚠️ An armed shape whose spelling table T-012 does not admit creates
    // nothing. `ScreenState` types it as a bare string, so a caller CAN hold
    // one; writing it into the document would put a value the column refuses
    // where the schema expects one of five.
    if (shapeKind === null) return CONSUMED_ELSEWHERE
    // A milestone is placed by the press alone, and a drag neither lengthens nor
    // refuses it (FR-001): both dates are the pressed day, as SH-5 is a point.
    // A bar dragged makes the span drawn; a bar clicked makes nothing and is told
    // (FR-001; FR-083 carries the same MUST NOT), with RS-53 -- the fallback RS-27
    // would not say what to do instead.
    // The telling is NT-1 of table T-037, raised by `raiseNotice` in
    // `frame-loop.ts` off the action `nothingToDo` builds; the words are the
    // dictionary's (FR-038).
    // ⛔ Not `CONSUMED_ELSEWHERE`: that carries no reason, which is the silent
    // entrance FR-029 forbids.
    const isMilestone = shapeKind === 'milestone'
    if (!isMilestone && !dragged) return nothingToDo('barShapeReleasedWithoutADrag')
    const start = isMilestone ? from : early
    const finish = isMilestone ? from : late
    const commands: DocumentCommand[] = [
      {
        kind: 'createTask',
        shapeKind,
        start: textOfDay(start),
        finish: textOfDay(finish),
        groupId,
      },
    ]
    // AR-3's glyph is set on the Task this bundle makes: the armed figure
    // decides (FR-001), and AT-101's default is only for none chosen (FR-078).
    // The uid can be named before CM-6 runs: FR-001 issues it from
    // `Project.uidHighWaterMark` and not from the largest live uid, so
    // `nextIssuedUid` is a pure reading of this document -- unlike `groupId`, a
    // UUID that is minted outside. `commandsFromAssignee` relies on the same
    // reading.
    // ⚠️ WS-3 of `document-change-plan.ts` runs a bundle in order and AG-3 makes
    // it atomic, so CM-21 finds the Task CM-6 made or neither happens; FR-031
    // keeps the two as one undo step.
    if (armed.kind === 'milestoneShape') {
      const glyph = milestoneGlyphOf(armed.glyph)
      // ⚠️ An armed figure whose spelling AT-101 does not admit chooses nothing
      // (`Armed` types it as a bare string). The Task is still made, and
      // AT-101's default then stands.
      if (glyph !== null) {
        commands.push({
          kind: 'setTaskVisualMilestoneGlyph',
          uid: nextIssuedUid(context.document.schedule),
          glyph,
        })
      }
    }
    // STOP -- ⛔ AR-3 IS THE ONLY ARM THIS OPENS. The figure is a column of the
    // `TaskVisual` CM-6 makes; nothing else the palette can hold needs a second
    // command on the new Task.
    //
    // The new Task is carried out with the write (FR-001, FR-091). ⛔ The holder
    // cannot work the uid out: PTD-4 is the row where nothing was hit, and the
    // Task exists only after CM-6 has run -- so it is read by `nextIssuedUid`,
    // the same number CM-21 names above.
    return changedAndCreated([commands], {
      kind: 'task',
      uid: nextIssuedUid(context.document.schedule),
    })
  }

  if (armed.kind === 'commentBox') {
    // AR-5 of table T-023b; FR-019 holds the position by date and row.
    // The position is the PRESS: table T-023a decides on the press, and FR-097
    // sizes the body from its own text, so the drag length says nothing.
    // ⛔ No row under the press: refused with RS-44 and told (FR-019, FR-029),
    // never silently, and never by minting a row. FR-001's new row is for a Task,
    // which becomes the row's 導出元; an annotation cannot be one (AT-54, FR-058).
    if (row === null) return nothingToDo('noRowToPutTheAnnotationOn')
    return changed([
      {
        kind: 'createCommentBox',
        id: context.newCommentBoxId,
        anchor: { date: textOfDay(from), groupId: row.groupId },
      },
    ])
  }

  if (armed.kind === 'highlightBox') {
    // ⛔ Drag only (FR-019): one pressed point cannot say a range. The boundary
    // is S-208, the value FR-001 uses.
    // ⛔ The click is not told a reason: FR-029 tells a PRESS, and a click
    // cannot be told from a drag begun and given up. ⚠️ `CONSUMED_ELSEWHERE`,
    // not `UNASSIGNED`: MK-10 keeps the browser's default off a press on the Row
    // Area with AR-6 armed.
    if (!dragged) return CONSUMED_ELSEWHERE

    // A missing row is refused with RS-44 as for AR-5 (FR-019 speaks of both
    // boxes). ⚠️ Both ends are asked, because a range names two rows (AT-119 /
    // AT-120); ⛔ minting a row for the missing end is forbidden.
    const releaseRow = rowAtY(context.layout, release.y)
    if (row === null || releaseRow === null) return nothingToDo('noRowToPutTheAnnotationOn')

    // The direction is normalised on the release, never refused (FR-019). The
    // swap lives here and not in `edit-annotation.ts`: typed or imported values
    // carry no direction and go to IV-10's treatment. `early` / `late` above are
    // the swap for the days.
    // Which row is the top is the rank in the row tree, ⛔ not the screen
    // position (FR-019, MUST NOT): FR-098 lifts a pinned row out of the tree's
    // order, so comparing `RowPlacement.y` wrote pairs IV-19 turns down.
    // ⚠️ The frame DRAWN stays the screen's (`schedule-geometry.ts` takes the min
    // and max of the drawn bands); neither may be made to follow the other.
    const rankById = taskGroupRankById(context.document.schedule.taskGroups)
    // ⚠️ `rowAtY` only answers rows laid out from this same document, so the
    // fallback is unreachable and keeps the comparison total.
    const pressRank = rankById.get(row.groupId) ?? 0
    const releaseRank = rankById.get(releaseRow.groupId) ?? 0
    const isPressAbove = pressRank <= releaseRank
    const top = isPressAbove ? row : releaseRow
    const bottom = isPressAbove ? releaseRow : row
    return changed([
      {
        kind: 'createHighlightBox',
        id: context.newHighlightBoxId,
        range: {
          startDate: textOfDay(early),
          endDate: textOfDay(late),
          topGroupId: top.groupId,
          bottomGroupId: bottom.groupId,
        },
      },
    ])
  }

  return CONSUMED_ELSEWHERE
}

/**
 * Every row's place in the DOCUMENT's own order, top to bottom: a preorder walk
 * of AT-52's `parentId`, siblings by AT-55's `order` -- what IV-19 means by
 * below.
 *
 * A rank and not a `y`: rows FR-098 pinned, HR-1a folded away or HR-6 hid all
 * keep their place, so stored order cannot be read off the picture. ⛔ Not
 * `ScheduleLayout.rows`, which is the drawn set in drawn order.
 *
 * ⚠️ A second copy: `schedule.ts` holds the same walk under the same name, and
 * IV-19 is judged by that one, but it is file-local and table T-064 publishes no
 * entry for it. Until it is exported (rule 03's DRY), change both together.
 *
 * @purity pure
 */
function taskGroupRankById(groups: readonly TaskGroup[]): ReadonlyMap<string, number> {
  const childrenOf = new Map<string | null, TaskGroup[]>()
  const holds = new Set(groups.map((group) => group.id))
  for (const group of groups) {
    const parent = group.parentId !== null && holds.has(group.parentId) ? group.parentId : null
    const siblings = childrenOf.get(parent)
    if (siblings === undefined) childrenOf.set(parent, [group])
    else siblings.push(group)
  }
  for (const siblings of childrenOf.values()) siblings.sort((a, b) => a.order - b.order)

  const rankById = new Map<string, number>()
  const walk = (parent: string | null): void => {
    for (const group of childrenOf.get(parent) ?? []) {
      if (rankById.has(group.id)) continue
      rankById.set(group.id, rankById.size)
      walk(group.id)
    }
  }
  walk(null)
  // A row a `parentId` ring makes unreachable is appended rather than dropped --
  // IV-18 is where that ring is reported, and every row still needs a rank.
  for (const group of groups) if (!rankById.has(group.id)) rankById.set(group.id, rankById.size)
  return rankById
}

/**
 * Every Task a body drag carries (SL-7).
 *
 * ⚠️ Only Tasks: a dependency has no dates of its own to move, and SL-1 excludes
 * the status line from being carried along.
 *
 * @purity pure
 */
function movedTaskUids(context: InputContext, grabbed: number): readonly number[] {
  const held: ItemRef = { kind: 'task', uid: grabbed }
  if (!isSelected(context.selection, held)) return [grabbed]
  const uids: number[] = []
  for (const one of context.selection.items) {
    if (one.kind === 'task') uids.push(one.uid)
  }
  return uids
}

/**
 * Which row the DOCUMENT has a Task on -- its `TaskGroupMember` (IV-6 makes it
 * exactly one), which is what HM-3 of table T-015a moves.
 *
 * ⛔ Not `ScheduleLayout.placements`: during a body drag the layout already draws
 * the Task on the row under the pointer, so on the release GR-12's guard below
 * would cancel the move and the bar would spring back.
 *
 * @purity pure
 */
function rowOfTask(context: InputContext, uid: number): string | null {
  const member = context.document.schedule.taskGroupMembers.find((one) => one.taskUid === uid)
  return member === undefined ? null : member.groupId
}

/** How many days the pointer travelled, in the days the axis draws. @purity pure */
function dayShift(context: InputContext, fromX: number, toX: number): number {
  const from = dayAtX(context.layout, fromX)
  const to = dayAtX(context.layout, toX)
  if (from === null || to === null) return 0
  return serialOfDay(to) - serialOfDay(from)
}

/** @purity pure */
function compareDay(a: CalendarDay, b: CalendarDay): number {
  return serialOfDay(a) - serialOfDay(b)
}

/**
 * What one press of SK-16 or SK-16a multiplies a zoom by.
 *
 * ⛔ Not settled for the keyboard: S-53 is stated for the wheel, and SK-16 /
 * SK-16a say only zoom in / out. The same step is used so the two routes to one
 * operation do not disagree.
 * Searched: table T-036 SK-16 / SK-16a, table T-201 S-53, table T-203 S-75 /
 * S-76, FR-016.
 *
 * @provisional PND-11
 * @purity pure
 */
function keyZoomFactor(context: InputContext, isIn: boolean): number {
  const step = context.zoomStep
  return isIn ? step : 1 / step
}

/**
 * FR-016's ceiling for the day axis: the zoom at which the `Row Area` still shows
 * S-229 days of table T-206.
 *
 * Derived from the region on the frame asked about, never a fixed magnification
 * (FR-016, MUST NOT), so a wider window raises it by itself.
 * ⛔ The day count is not typed here (S-229's own note forbids it): it arrives
 * through the generated `NOT_STORED_VISIBLE_DAY_FLOOR` block at the foot of this
 * file, sourced from `docs/spec/_source/settings.json`.
 *
 * One day's width at 1x is read back off the frame: `pxPerDay = pxPerDayAt1x *
 * zoomX` (the identity `placeHeldStill` leans on). ⛔ Laying the schedule out
 * again is what MN-6 of table T-070 refuses. ⚠️ `zoomOnScreen` and not the
 * stored S-75: under FR-055's fit the stored zoom is not what was drawn.
 *
 * ⚠️ `null` where there is no such quotient (no time axis, no width, a zero
 * zoom); the range S-75 holds is then the only bound.
 *
 * @purity pure
 */
function zoomXCeiling(context: InputContext): number | null {
  const width = context.regions.rowArea.width
  const drawnAt = zoomOnScreen(context).x
  const pxPerDayAt1x = context.layout.pxPerDay / drawnAt
  const ceiling = width / (NOT_STORED_VISIBLE_DAY_FLOOR['S-229'] * pxPerDayAt1x)
  if (!Number.isFinite(ceiling) || ceiling <= 0) return null
  return ceiling
}

/**
 * The band of the tallest row this frame laid out -- for FR-016's row-axis
 * ceiling.
 *
 * ⛔ Every laid-out row, not the visible ones: `ScheduleLayout.rows` carries the
 * whole chain, and a ceiling that moved when the person scrolled could not be
 * predicted.
 *
 * @purity pure
 */
function tallestBandOf(rows: readonly RowPlacement[]): RowPlacement | null {
  let tallest: RowPlacement | null = null
  for (const row of rows) {
    if (tallest === null || row.height > tallest.height) tallest = row
  }
  return tallest
}

/**
 * How the tallest row's band splits into the part that grows with the zoom and
 * the part that does not -- `height = grows x (the plan scale ratio) + fixed`.
 *
 * Read off the frame, not re-derived. LF-2 of table T-221 gives a lane the
 * tallest of its figures and puts one `stackGap` between lanes, and the only
 * term inside a figure that does not scale with the plan bar is the `actualGap`
 * of an actual below (table T-012's SH-3 / SH-4, `actualPlacement`).
 * ⛔ No shape ratio and no floor is spelled here: a second spelling of
 * `reservedHeight` in this file is the copy rule 03 forbids.
 *
 * ⚠️ The tallest figure of a lane now is taken as the lane's at every zoom. Across
 * the narrow span where two shapes with different `actualGap` swap places, the
 * answer is off by one `actualGap`; ⛔ no row covers that span and none is
 * invented for it.
 *
 * A row with no figure takes one rectangle's band (`rectangleHeight`), the
 * reading `layoutFromSchedule` takes of LF-2's empty lane. ⚠️ No sentence of
 * docs/spec states an empty ROW's band, so it is pointed at and not quoted.
 *
 * @purity pure
 */
function bandGrowthOf(
  context: InputContext,
  row: RowPlacement,
): { readonly grows: number; readonly fixed: number } {
  const settings = context.document.documentSettings
  const tallestOfLane = new Map<number, TaskPlacement>()
  for (const figure of context.layout.placements) {
    if (figure.groupId !== row.groupId) continue
    const held = tallestOfLane.get(figure.stack)
    if (held === undefined || figure.height > held.height) tallestOfLane.set(figure.stack, figure)
  }
  if (tallestOfLane.size === 0) return { grows: context.layout.rectangleHeight, fixed: 0 }
  let grows = 0
  let fixed = settings.stackGap * (tallestOfLane.size - 1)
  for (const figure of tallestOfLane.values()) {
    const gap = figure.actualPlacement === 'below' ? settings.actualGap : 0
    grows += Math.max(0, figure.height - gap)
    fixed += gap
  }
  return { grows, fixed }
}

/**
 * FR-016's ceiling for the row axis: the zoom at which the tallest row's band
 * reaches the `Row Area`'s height.
 *
 * Derived from the screen, with no fixed magnification and no new setting row
 * (FR-016, MUST NOT): only the `Row Area` and the drawn bands are read.
 * ⛔ Not the cut-name mark, and not a comparison of two font sizes (FR-016, MUST
 * NOT): row title truncation never reads `zoomY`, and a compared size would move
 * the ceiling whenever either moved.
 *
 * A band is affine in the plan scale (`bandGrowthOf`), and above FR-094's floor
 * the scale is `basePlanHeight x zoomY`, so the zoom is `(height - fixed) /
 * grows` times the drawn scale over `basePlanHeight`. The drawn scale is read
 * back as `rectangleHeight` over table T-206's rectangle ratio, so no floor is
 * spelled a second time.
 *
 * ⚠️ Re-derived on every notch: FR-018 draws deeper rows as `zoomY` rises, so a
 * taller row can appear above this ceiling, and the next notch meets the lower
 * ceiling it sets. ⛔ Running table T-068 again to look ahead is reserved to
 * FR-055's fit and to `rowPlacesAtZoomY`.
 *
 * ⚠️ `null` where there is no such zoom (no row, no height, a band that does not
 * grow); the range S-75 / S-76 holds is then the only bound.
 *
 * @purity pure
 */
function zoomYCeiling(context: InputContext): number | null {
  const settings = context.document.documentSettings
  const height = context.regions.rowArea.height
  const tallest = tallestBandOf(context.layout.rows)
  if (tallest === null || !(height > 0)) return null
  const { grows, fixed } = bandGrowthOf(context, tallest)
  if (!(grows > 0)) return null
  const shapeRatio = settings.shapeHeightOf.rectangle
  const drawnScale = context.layout.rectangleHeight / shapeRatio
  const ceiling = (drawnScale * ((height - fixed) / grows)) / settings.basePlanHeight
  if (!Number.isFinite(ceiling) || ceiling <= 0) return null
  return ceiling
}

/**
 * The zoom now in force, stepped once, with FR-016's ceiling for that axis
 * applied.
 *
 * ⛔ Nothing is rounded here: FR-018 (MUST NOT) forbids a stepped zoom rounding
 * towards the side that crosses a level-of-detail threshold, and a tidying
 * `Math.round` would break that silently.
 *
 * ⛔ The ceiling is applied here and nowhere else, so `placeHeldStill` (which
 * holds a day against the zoom that will be in force) and `zoomCommand` (which
 * writes it) see one number; capped in only one of them, the date under the
 * pointer would drift once per notch at the end of the range (the defect
 * `zoomWithinBounds` records for S-75 / S-76).
 * ⚠️ Not the clamp to S-75 / S-76, which stays CM-71's: this is FR-016's derived
 * bound on the magnifying side alone. A zoom out is never held back by it, and a
 * document that opens above it is only carried towards it.
 * ⚠️ Still owed here: the telling at the ceiling (FR-016, FR-029). The `IC-13`
 * entrance is drawn by `src/adapter/screen-renderer`, and S-75 / S-76's own ends
 * share the same silence.
 * The two ceilings share nothing but this line: days across the `Row Area`'s
 * width, and the tallest band against its height.
 *
 * @purity pure
 */
function zoomTimes(context: InputContext, factor: number, axis: 'x' | 'y'): number {
  const on = zoomOnScreen(context)
  const stepped = (axis === 'x' ? on.x : on.y) * factor
  const ceiling = axis === 'x' ? zoomXCeiling(context) : zoomYCeiling(context)
  return ceiling === null ? stepped : Math.min(stepped, ceiling)
}

/**
 * One `setZoom`, with the axis that did not move left where it was.
 *
 * ⚠️ Both axes always travel, because CM-65 carries both. A null here means
 * "this axis did not change" and is filled, not defaulted -- MK-3 and MK-4 each
 * move ONE axis and must leave the other alone.
 * The clamp to S-75 / S-76 is deliberately NOT applied here: `editDocument` does
 * it, and FR-016 asks for fitting within the range rather than a refusal.
 *
 * @purity pure
 */
function zoomCommand(
  context: InputContext,
  zoomX: number | null,
  zoomY: number | null,
): DocumentCommand {
  // The axis that did not move is filled from the PICTURE (`zoomOnScreen`):
  // while no place is named the stored pair is not what anyone is looking at.
  const on = zoomOnScreen(context)
  return {
    kind: 'setZoom',
    zoomX: zoomX === null ? on.x : zoomX,
    zoomY: zoomY === null ? on.y : zoomY,
  }
}

/**
 * Whether this document already names a display position -- OP-10 of table
 * T-024a's condition, read on the side that WRITES.
 *
 * ⛔ The base half is written twice, here and in `viewSettings`
 * (`src/framework/single-html-shell/frame-loop.ts`), as `collapsesDiscarded` is
 * with CM-72: if OP-10's condition is re-ruled, both move.
 * ⛔ The BT-4 exception is written only on that side: where a document came from
 * is not reachable from here. ⚠️ So do not ask this member what is drawn --
 * `zoomOnScreen` reads `InputContext.isPictureAtStoredZoom` for that.
 * ⚠️ Both halves: a `scrollGroupId` naming a row CD-2 of table T-050 has deleted
 * is as unplaced as a `null`.
 *
 * @purity pure
 */
function namesAPlace(
  schedule: Schedule,
  scrollDate: string | null,
  scrollGroupId: string | null,
): boolean {
  if (scrollDate === null) return false
  return schedule.taskGroups.some((one) => one.id === scrollGroupId)
}

/**
 * The write that seats the place a zoom press was asked about, or nothing when
 * the document already names one.
 *
 * A zoom owes a place: while none is named OP-10 fits again on every frame, so a
 * `setZoom` alone is overwritten before anyone sees it. Seating the place ends
 * OP-10's condition, and the zoom asked for is the zoom drawn.
 *
 * The place is the one on screen: the `Row Area`'s top-left corner in this frame
 * (`scrolledAnchor` at zero). ⛔ No fit arithmetic is copied -- the frame is
 * already laid out at OP-10's choice.
 *
 * ⛔ Nothing is written where a place stands: a held IC-12 .. IC-15 reaches this
 * dozens of times (FR-018), and re-seating through `dayAtX` /
 * `rowIndexAtTopEdge` would drift S-176 / S-177 by the rounding each step.
 * ⛔ Nor where the seat names no row: a `setScrollPosition` carrying the null it
 * already holds would push the schedule instant along (FR-063).
 *
 * @purity pure
 */
function placeSeated(context: InputContext): readonly DocumentCommand[] {
  const schedule = context.document.schedule
  const settings = context.document.documentSettings
  if (namesAPlace(schedule, settings.scrollDate, settings.scrollGroupId)) return []
  const at = scrolledAnchor(context, 0, 0)
  if (!namesAPlace(schedule, at.scrollDate, at.scrollGroupId)) return []
  return [
    {
      kind: 'setScrollPosition',
      scrollDate: at.scrollDate,
      scrollDayOffset: at.scrollDayOffset,
      scrollGroupId: at.scrollGroupId,
      scrollGroupOffset: at.scrollGroupOffset,
    },
  ]
}

/**
 * The x FR-016 holds still through a zoom: the pointer, or the middle of the
 * `Row Area` where the route carries no pointer (FR-016's own rule for
 * pointerless routes).
 *
 * ⚠️ The `Row Area` and not the window: the day axis is laid against
 * `regions.rowArea.x` (`layoutFromSchedule`).
 *
 * @purity pure
 */
function zoomCentreX(context: InputContext, pointerX: number | null): number {
  const area = context.regions.rowArea
  return pointerX === null ? area.x + area.width / 2 : pointerX
}

/**
 * The y FR-016 holds still through a zoom -- the same two rules on the other
 * axis: FR-016 names the row beside the date, and the centre of the region
 * rather than of its width.
 *
 * @purity pure
 */
function zoomCentreY(context: InputContext, pointerY: number | null): number {
  const area = context.regions.rowArea
  return pointerY === null ? area.y + area.height / 2 : pointerY
}

/**
 * The screen y one display-position pair points at inside a chain of rows.
 *
 * ⛔ The same slab `rowAnchorIn` and `scrollOffsetOf` use: the three are one
 * bijection, and a length written differently in any of them puts the picture
 * somewhere the others never named.
 * ⚠️ A pair naming a row this chain does not hold answers `null`: FR-018 can
 * drop a row between two zooms, and falling back to the first row would move
 * the picture to the top on a press that asked to hold it.
 *
 * @purity pure
 */
function rowPointIn(
  rows: readonly RowPlacement[],
  anchor: Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'>,
): number | null {
  const at = rows.findIndex((row) => row.groupId === anchor.scrollGroupId)
  if (at < 0) return null
  const row = rows[at]
  if (row === undefined) return null
  const below = rows[at + 1]
  const slab = below === undefined ? row.height : below.y - row.y
  const into = Number.isFinite(anchor.scrollGroupOffset) ? anchor.scrollGroupOffset : 0
  return row.y + into * slab
}

/**
 * Where the top edge of the scrolling remainder falls in a chain laid out with
 * this pair in force: `scrollOffsetOf`'s two arms read forwards -- the point the
 * pair marks, or the first row's own top when the pair names no row it holds.
 *
 * @purity pure
 */
function topEdgeIn(
  rows: readonly RowPlacement[],
  anchor: Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'>,
): number | null {
  const marked = rowPointIn(rows, anchor)
  if (marked !== null) return marked
  const first = rows[0]
  return first === undefined ? null : first.y
}

/**
 * S-75 / S-76 read on this side, so that the day held still is measured against
 * the zoom that will actually be in force.
 *
 * ⛔ Not a second owner of the bound: `editDocumentSettings` applies it to what
 * CM-65 writes. ⚠️ Without this a notch past the end would move the anchor for a
 * scaling the clamp then refuses, and the day under the pointer would drift once
 * per notch at the end of the range.
 *
 * @purity pure
 */
function zoomWithinBounds(context: InputContext, value: number): number {
  return Math.max(context.zoomMin, Math.min(context.zoomMax, value))
}

/**
 * FR-016's zoom centre, day half.
 *
 * No second layout is needed: the time axis is linear in the zoom, so scaling it
 * by `factor` about `centreX` puts the left edge where
 * `centreX - (centreX - area.x) / factor` stands today, and `dayAnchorAt` reads
 * that x back as S-77 with S-177 (the pair CM-66 writes). ⚠️ This holds because
 * both layouts put the anchor day's left edge at `regions.rowArea.x`.
 *
 * ⚠️ MK-4 / SK-16a / IC-14 / IC-15 move the row axis alone: this answers `null`
 * and the row half carries the press.
 *
 * @purity pure
 */
function dayHeldStill(
  context: InputContext,
  zoomX: number | null,
  centreX: number,
): Pick<ScrollAnchor, 'scrollDate' | 'scrollDayOffset'> | null {
  if (zoomX === null) return null
  const area = context.regions.rowArea
  const factor = zoomWithinBounds(context, zoomX) / zoomOnScreen(context).x
  // ⚠️ A factor that is not a finite positive number is a picture with no time
  // axis (a zero `pxPerDay`, an empty document) -- nothing to hold still.
  if (!Number.isFinite(factor) || factor <= 0) return null
  return dayAnchorAt(context, centreX - (centreX - area.x) / factor)
}

/**
 * FR-016's zoom centre, row half.
 *
 * It needs a second layout where the day half needs none: the row axis is not
 * linear in `zoomY`, and FR-016 forbids computing a position from the zoom. So
 * row places come from `rowPlacesAtZoomY` (PI-5 of table T-064), run inside the
 * layout engine as the rule after table T-068 allows; ⛔ nothing below lays
 * anything out (FR-016 forbids the Adapter its own layout).
 *
 * The arithmetic is a drift: the candidate chain is laid out at the place the
 * frame is already at, and the distance from the centre to where the held row
 * landed is how far the top edge moves back. The seat is read off the frame,
 * which is right under OP-10 of table T-024a too (`placeSeated`'s reason).
 *
 * ⚠️ `null` where there is nothing to hold -- no row under the centre, a row
 * FR-018 stops drawing at the candidate zoom, an empty chain, or a zoom the
 * range refuses; the anchor then stays where it is.
 *
 * @purity pure
 */
function rowHeldStill(
  context: InputContext,
  zoomX: number | null,
  zoomY: number | null,
  centreY: number,
): Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'> | null {
  if (zoomY === null) return null
  const on = zoomOnScreen(context)
  const willBe = zoomWithinBounds(context, zoomY)
  if (!(willBe > 0) || willBe === on.y) return null
  const seat = scrolledAnchor(context, 0, 0)
  const held = rowAnchorIn(scrollingRowsOf(context.layout), centreY, seat)
  // ⛔ Both axes as they will stand: a Task's lane follows the horizontal overlap
  // (ST-2 / ST-3 of table T-014), so a candidate at the old `zoomX` would count
  // band heights the frame is about to stop drawing. ⚠️ `zoomOnScreen`, not the
  // stored pair.
  const after = rowPlacesAtZoomY(
    context.document.schedule,
    {
      ...context.document.documentSettings,
      zoomX: zoomX === null ? on.x : zoomWithinBounds(context, zoomX),
      scrollDate: seat.scrollDate,
      scrollDayOffset: seat.scrollDayOffset,
      scrollGroupId: seat.scrollGroupId,
      scrollGroupOffset: seat.scrollGroupOffset,
    },
    context.regions,
    willBe,
    context.isLevelZeroFolded,
    context.rowControlsHeightPx,
  ).filter((row) => row.isPinned !== true)
  const landed = rowPointIn(after, held)
  const topEdge = topEdgeIn(after, seat)
  if (landed === null || topEdge === null) return null
  // A zoom already at the axis's ceiling holds every row still by doing nothing:
  // the drift is zero, the pair answers the values in force, and no write is made.
  return rowAnchorIn(after, topEdge + (landed - centreY), seat)
}

/**
 * The display position one zoom owes: the day and the row held still around
 * FR-016's centre, and nothing written where neither can be held.
 *
 * This also does `placeSeated`'s work in the same write: a position that names a
 * place ends OP-10's re-fit (table T-024a). ⚠️ `placeSeated` stays the fallback
 * for every route that cannot name a held day.
 *
 * @purity pure
 */
function placeHeldStill(
  context: InputContext,
  zoomX: number | null,
  zoomY: number | null,
  centreX: number,
  centreY: number,
): readonly DocumentCommand[] {
  const day = dayHeldStill(context, zoomX, centreX)
  const row = rowHeldStill(context, zoomX, zoomY, centreY)
  if (day === null && row === null) return placeSeated(context)
  // ⚠️ The axis that could not be held keeps the value the frame is at --
  // `placeSeated`'s corner, not the document's pair, which under OP-10 is a place
  // nobody is looking at.
  const seat = scrolledAnchor(context, 0, 0)
  const heldDay = day ?? seat
  const heldRow = row ?? seat
  const to = {
    kind: 'setScrollPosition',
    scrollDate: heldDay.scrollDate,
    scrollDayOffset: heldDay.scrollDayOffset,
    scrollGroupId: heldRow.scrollGroupId,
    scrollGroupOffset: heldRow.scrollGroupOffset,
  } as const
  // ⛔ A position that names no place is not written, for the two reasons
  // `placeSeated` gives: OP-10 would go on fitting over it, and FR-063 would be
  // moved by a write that changed nothing.
  if (!namesAPlace(context.document.schedule, to.scrollDate, to.scrollGroupId)) {
    return placeSeated(context)
  }
  // A zoom already at S-75 / S-76's end holds every day still by doing nothing:
  // the four members answer the values in force, so no write is made and WS-4
  // pushes no frame.
  return isScrollPositionInForce(context, to) ? [] : [to]
}

/**
 * The writes one zoom the person asked for owes: the place held still around the
 * point FR-016 names, then the zoom itself.
 *
 * One bundle, unlike `fitWrites`: UN-8 of table T-027 keeps both CM-65 and CM-66
 * out of the history, so there is no order for a history to see. The place goes
 * first only so a reader meets it in the intended order.
 * ⛔ `pointerX` and `pointerY` travel together (both `null` for a route with no
 * pointer; see `zoomCentreX` / `zoomCentreY`), or the two axes would centre on
 * different points.
 *
 * @purity pure
 */
function zoomWrites(
  context: InputContext,
  zoomX: number | null,
  zoomY: number | null,
  pointerX: number | null,
  pointerY: number | null,
): readonly DocumentCommand[] {
  return [
    ...placeHeldStill(
      context,
      zoomX,
      zoomY,
      zoomCentreX(context, pointerX),
      zoomCentreY(context, pointerY),
    ),
    zoomCommand(context, zoomX, zoomY),
  ]
}

/**
 * The schedule as FR-055 has to measure it: every collapse thrown away -- the
 * measurement half of HF-8 of table T-051.
 *
 * ⚠️ The writer of the same rule is CM-72 (`expandAllTaskGroups`, in
 * `src/use-case/edit-document/edit-task-group.ts`), so the predicate is written
 * twice; if what a discard covers is re-ruled, both move.
 * ⛔ `isHidden` is left standing: HF-8 discards the collapse only, and HR-6 has
 * the hidden state saved so WY-1 can give it back. ⛔ Nothing is written from
 * here: the copy is thrown away with the frame.
 *
 * @purity pure
 */
function collapsesDiscarded(schedule: Schedule): Schedule {
  return {
    ...schedule,
    taskGroups: schedule.taskGroups.map((one) =>
      one.isCollapsed === true ? { ...one, isCollapsed: false } : one,
    ),
  }
}

/**
 * SK-18 -- FR-055's fit.
 *
 * The place the fit worked out is written down, not handed back as nulls: OP-10
 * of table T-024a fits again on every frame while no place is named, so nulls
 * would leave the picture as it was and overwrite every zoom written after.
 * `fitZoom` already answers the place (`FitToScreen.scrollDate` /
 * `.scrollGroupId`), so nothing is computed twice. ⚠️ A document with nothing
 * drawn still answers null, because the fit does.
 *
 * Both passes of the rule after table T-068 run inside `fitZoom`, ⛔ not off the
 * frame: LC-1 drops every descendant of a collapsed row, so the frame would fit
 * the folded picture (the harm FR-055's RATIONALE names), and it is laid out at
 * the zoom the fit is about to overwrite. ⚠️ A measurement, not a write: CM-72
 * is still the only thing that opens a row (FR-031).
 *
 * ⛔ The discard must not move into `fitZoom`: `viewSettings` in
 * `src/framework/single-html-shell/frame-loop.ts` shares it for OP-10, and HF-8
 * forbids the discard at startup, where it would throw away the state HR-6 saves
 * for WY-1.
 *
 * ⚠️ Cost: table T-068 runs once per group depth the document holds, plus the
 * horizontal run and at most one second pass. The rule after that table allows
 * this for the fit alone (MN-6), S-125 caps the sweep, and it runs once per
 * press rather than per frame.
 *
 * ⚠️ The return type is inferred: `FitToScreen` is not published by table T-064
 * (check 26b), and this wrapper needs the value, not the name.
 *
 * @purity pure
 */
function fittedNow(context: InputContext) {
  return fitZoom(
    collapsesDiscarded(context.document.schedule),
    context.document.documentSettings,
    context.regions,
    { step: context.zoomStep, min: context.zoomMin, max: context.zoomMax },
    // LF-3's row-control floor, so the fit measures the bands the frame will
    // draw rather than shorter ones.
    context.rowControlsHeightPx,
  )
}

/**
 * The zoom the picture in front of the person is drawn at.
 *
 * Not always the stored pair: while no place is named OP-10 of table T-024a draws
 * FR-055's fit instead of S-73 / S-74, so a step taken from the stored pair lands
 * somewhere the person did not ask for (fixture:
 * `tests/unit/t-024a-op-10-a-chosen-zoom-is-the-place.test.ts`).
 * ⛔ Not `ScheduleLayout`: it carries no zoom, and `zoomY` cannot be recovered
 * from a band already on LF-3's floor. Running the fit again is exact, because
 * the fit is what drew the frame.
 *
 * ⛔ Which branch of OP-10 drew the frame is asked of the drawing side --
 * `InputContext.isPictureAtStoredZoom` carries the BT-4 exception this side
 * cannot see.
 *
 * @purity pure
 */
function zoomOnScreen(context: InputContext): { readonly x: number; readonly y: number } {
  const settings = context.document.documentSettings
  // ⚠️ `??` and not `=== true`: absent means nobody said, and falls back to the
  // base half of OP-10's condition; `false` from a caller that did say is an
  // answer.
  const atStoredZoom =
    context.isPictureAtStoredZoom ??
    namesAPlace(context.document.schedule, settings.scrollDate, settings.scrollGroupId)
  if (atStoredZoom) {
    return { x: settings.zoomX, y: settings.zoomY }
  }
  const fitted = fittedNow(context)
  // ⛔ The row axis is clamped up to the floor, the time axis is not: at or below
  // `floorZoomY` nothing moves however small the number, so a step from a smaller
  // number would move nothing -- the entrance FR-029 calls broken.
  return { x: fitted.zoomX, y: Math.max(fitted.zoomY, fitted.floorZoomY) }
}

/** @purity pure */
function fitCommand(context: InputContext): DocumentCommand {
  const schedule = context.document.schedule
  const fitted = fittedNow(context)
  // FR-055 has the fit set the place as well as the zoom, and OP-10 makes a
  // pressed fit a chosen place. ⛔ `fitZoom` answers `null` for a run with no
  // dated content, and a null left standing would keep OP-10 fitting, so the
  // press would decide nothing; the fallback is the corner on screen, the answer
  // `placeSeated` gives every other zoom.
  // ⚠️ A document with no `TaskGroup` keeps the nulls: there is no place to write,
  // and OP-10 goes on fitting it.
  const at = scrolledAnchor(context, 0, 0)
  const place = namesAPlace(schedule, fitted.scrollDate, fitted.scrollGroupId)
    ? { scrollDate: fitted.scrollDate, scrollGroupId: fitted.scrollGroupId }
    : namesAPlace(schedule, at.scrollDate, at.scrollGroupId)
      ? { scrollDate: at.scrollDate, scrollGroupId: at.scrollGroupId }
      : { scrollDate: fitted.scrollDate, scrollGroupId: fitted.scrollGroupId }
  return {
    kind: 'fitScheduleToScreen',
    zoomX: fitted.zoomX,
    zoomY: fitted.zoomY,
    scrollDate: place.scrollDate,
    scrollGroupId: place.scrollGroupId,
    // Zeroed with their anchors: the fit puts the content's corner on the `Row
    // Area`'s corner, and a fraction left from an earlier pan would slide the
    // fitted answer by up to one row and one day.
    scrollDayOffset: 0,
    scrollGroupOffset: 0,
  }
}

/**
 * SK-3 -- one delete per selected thing, in the order they were picked.
 *
 * ⚠️ The chain each one drags with it is table T-050's and is applied by the
 * aggregate, not here.
 * ⛔ FR-032's confirmation is someone else's: `confirmationOwedBy` in
 * `frame-loop.ts` reads this bundle before it is written and holds the writes
 * until NT-7 is answered. It is asked there because NT-7 is about the whole
 * action, and a gesture can owe two writes (`InputAction.writes`).
 * ⚠️ So a caller that runs what this member plans without asking breaks FR-032.
 * Searched: table T-064 (PI-8, PI-9, PI-18, PI-37), table T-037, table T-109,
 * `frame-loop.ts`, `apply-document-change.ts`.
 *
 * @purity pure
 */
function deleteCommandsFor(context: InputContext): readonly DocumentCommand[] {
  const schedule = context.document.schedule
  const commands: DocumentCommand[] = []
  for (const one of context.selection.items) {
    switch (one.kind) {
      case 'task':
        commands.push({ kind: 'deleteTask', uid: one.uid })
        break
      case 'dependency': {
        // ⚠️ `deleteDependency` names both ends while a selection names the
        // successor and an ordinal, so the predecessor is read back out of the
        // successor's own list -- the list the ordinal indexes.
        const successor = taskByUid(schedule, one.successorUid)
        const edge = successor === null ? undefined : successor.dependencies[one.ordinal]
        if (edge === undefined) break
        commands.push({
          kind: 'deleteDependency',
          predecessorUid: edge.predecessorUid,
          successorUid: one.successorUid,
        })
        break
      }
      case 'highlightBox':
        commands.push({ kind: 'deleteHighlightBox', id: one.id })
        break
      case 'commentBox':
        commands.push({ kind: 'deleteCommentBox', id: one.id })
        break
      case 'statusLine':
        // SL-1 sends the status line's deletion to FR-046's clearing, which is
        // CM-4.
        commands.push({ kind: 'clearStatusDate' })
        break
    }
  }
  return commands
}

/**
 * The next selection, by the rules of table T-023c.
 *
 * ⛔ The schedule's selection and NOT the rows': SL-1 leaves `TaskGroup` out and
 * FR-085 keeps the Row Title Panel's selected rows a different set.
 * ⚠️ Outside the undo record (UN-9), so a change here is never a
 * `DocumentCommand`.
 *
 * @purity pure
 */
export function selectionFromInput(input: HumanInput, context: InputContext): Selection {
  const held = context.selection

  // SL-5 -- SK-2 selects everything selectable.
  if (input.kind === 'key') {
    const isSelectAll = isCombo(input.modifiers, true, false, false) && input.key === KEY.a
    if (isSelectAll && !context.isTextEntryUnsettled) {
      return selectionOfAll(everythingSelectable(context))
    }
    // IN-4's selection level, spent here because this member answers the
    // selection; `escapeTarget` (PI-36) names the level.
    // ⚠️ One press, one level: `escapeContextOf` reports the panel, so the press
    // that puts the panel away answers `'propertiesPanel'` and leaves the
    // selection as it was (FR-072, MUST NOT).
    // ⛔ Not a `DocumentCommand`: UN-9 keeps the selection out of the undo record.
    if (
      isCombo(input.modifiers, false, false, false) &&
      input.key === KEY.escape &&
      escapeTarget(context.screenState, escapeContextOf(context)) === 'selection'
    ) {
      return emptySelection()
    }
    // SK-19's last stage, spent here for the same reason.
    // ⛔ The three earlier stages come first (a standing telling, an unsettled
    // edit, the `Properties Panel`): this arm requires all three absent, so one
    // press spends one stage, and the press that puts the panel away never
    // reaches here (FR-072).
    if (
      isCombo(input.modifiers, false, false, false) &&
      input.key === KEY.enter &&
      context.isNoticeStanding !== true &&
      !context.isTextEntryUnsettled &&
      context.isPropertiesPanelShowing !== true
    ) {
      return emptySelection()
    }
    return held
  }
  if (input.kind !== 'pointer' || input.phase !== 'up') return held

  const press = context.pressed
  if (press === null) return held
  // ⛔ A press on something the screen surface drew is not a press on the
  // schedule: the note under table T-023a limits its decision order to the
  // drawing area, and SL-3's marquee is one of its rows. ⚠️ FR-083's SP-2 and
  // SP-3 change the shape of what is selected, not which things are selected.
  if (press.on !== null) return held
  if (!isOnRowArea(context, press.at.x, press.at.y)) return held

  const isAdding = press.at.modifiers.shift // SL-4

  // The same answer `press.pressRow` carries: nothing table T-023a reads can
  // move while the press is in flight.
  switch (pressRowOf(press, context)) {
    case 'PTD-3': {
      const ref = press.hit === null ? null : itemRefOf(context.document.schedule, press.hit.item)
      if (ref === null) return held
      // SL-4 -- with Shift a click adds or removes one at a time. SL-2 --
      // without it, this one REPLACES whatever was selected.
      if (isAdding) {
        return isSelected(held, ref) ? selectionWithout(held, ref) : selectionWith(held, ref)
      }
      return selectionWith(emptySelection(), ref)
    }
    case 'PTD-5': {
      // MK-11 -- a bare click on nothing clears the selection. A drag is SL-3's
      // marquee instead.
      const rect = marqueeRect(press.at, input)
      if (rect.width === 0 && rect.height === 0) {
        return isAdding ? held : emptySelection()
      }
      // SL-3 (MUST): only what the rectangle encloses COMPLETELY. Touching is
      // not enough, and `itemsInMarquee` is the member that measures it.
      const caught: ItemRef[] = []
      for (const item of itemsInMarquee(context.geometry, rect)) {
        const ref = itemRefOf(context.document.schedule, item)
        if (ref !== null) caught.push(ref)
      }
      // SL-7b -- a marquee makes no order, so a selection it touched carries
      // none afterwards either: `selectionOfAll` is what says so, and FR-034
      // must refuse to align from the result.
      return isAdding ? selectionOfAll([...held.items, ...caught]) : selectionOfAll(caught)
    }
    default:
      // PTD-1's pan, PTD-2's fixed cursor and PTD-4's creation leave the selection
      // alone. ⚠️ A Task just drawn becomes selected in the shell, from the
      // `created` the write carries (`frame-loop.ts`); nothing here can name a
      // Task that does not exist yet.
      return held
  }
}

/**
 * What Esc consumes, in the levels IN-4 fixes.
 *
 * The order is `escapeTarget`'s (PI-36); this supplies what that member cannot
 * see -- current values the shell holds (LY-5) that reached `InputContext`.
 *
 * ⛔ `isConfirmationStanding` is left unset: this pure member holds nothing of a
 * standing `Confirmation`, and it may be reckoned by ONE caller or IN-4's one
 * level per press is spent twice. ⚠️ So a caller that holds one must not ask the
 * members this feeds about such a press; `frame-loop.ts` keeps that rule.
 * ⚠️ The panel is reported: the selection level sits below it, so an unreported
 * panel would let the press that puts the panel away also clear the selection
 * (FR-072, MUST NOT). Reporting spends nothing -- `screenStateFromInput` answers
 * `'propertiesPanel'` with the state untouched, and the shell puts the panel away.
 * ⛔ `isPropertiesPanelShowing` is optional and forgetting it is silent (its own
 * row says so), so only the tests written from the specification catch a caller
 * that omits it.
 *
 * @purity pure
 */
function escapeContextOf(context: InputContext): EscapeContext {
  return {
    // IN-4's first level, reported because `InputContext` carries it (SK-19's
    // first stage needs it). ⚠️ Reporting does not spend it: `screenStateFromInput`
    // answers 'notice' with the state untouched, and the shell takes the telling
    // off the list (LY-5).
    isNoticeStanding: context.isNoticeStanding === true,
    // IN-4's second level, reported because IN-5a already put it on
    // `InputContext`.
    isTextEntryUnsettled: context.isTextEntryUnsettled,
    gestureInFlight: context.pressed !== null,
    // S-99h of table T-206, filled by the shell from `isPropertiesPanelOnScreen()`;
    // reported for the reason stated above.
    isPropertiesPanelOpen: context.isPropertiesPanelShowing === true,
    // IN-4's selection level, reported because table T-023c's rules are decided
    // in this file; `selectionFromInput` spends it. ⚠️ A count and never the
    // items: IN-4 spends its level on the selection as a whole.
    isSelectionStanding: context.selection.items.length > 0,
    // A side standing is the mode being up: IN-4 spends a press on the mode and
    // DC-4 takes the whole of it, so the narrower question is the one that
    // travels.
    dualCursorMode: context.dualCursorFollowing !== null,
  }
}

/**
 * The next screen state after a press on one of the entries this tool drew.
 *
 * FR-083's SP-1 .. SP-4: an entry pressed arms what it stands for (SP-1), and
 * pressed again disarms it (SP-4). ⛔ The selection enters into neither (FR-083,
 * MUST / MUST NOT). Changing the shape of what IS selected (SP-2 / SP-3) is
 * `commandFromArmingEntry`'s result of the same press.
 *
 * ⛔ AR-4, AR-5 and AR-6 arm whatever is selected: FR-083's rows speak of palette
 * shapes only, and table T-023b's note gives these no meaning against a
 * selection, so refusing would leave an entry that does nothing (FR-029).
 * Searched: FR-083, FR-053, table T-023b and its note, table T-109.
 *
 * @purity pure
 */
function screenStateFromEntry(entry: string, context: InputContext): ScreenState {
  const state = context.screenState

  switch (entry) {
    // SK-14's other entrance -- S-99e, which FR-053 (MUST) puts OUTSIDE the
    // palette so that hiding it does not take away the way back.
    case ENTRY.palette:
      return screenStateWithPalette(state, !state.paletteShown)
    // FR-071: one entry for both directions.
    // ⚠️ The flag is this tool's record of the state and not the act -- asking
    // the browser is the shell's, which is the layer that may touch it (LY-5).
    case ENTRY.fullScreen:
      return screenStateWithFullScreen(state, !state.fullScreen)
    case ENTRY.help:
      return screenStateWithSurface(state, HELP_MODAL)
    case ENTRY.aiExportModal:
      return screenStateWithSurface(state, AI_EXPORT_MODAL)
    case ENTRY.resourceRoster:
      return screenStateWithSurface(state, RESOURCE_ROSTER)
    // IC-45 -- entering the `Dual Cursor` mode disarms (table T-023b's closing
    // paragraph): the mode accepts no creation (DC-5, PTD-2 of table T-023a), so
    // an arm kept would do nothing.
    //
    // ⛔ The way in only: the same entry is DC-4's way out
    // (`commandFromDualCursorEntry` tells the two apart by the same value), and
    // disarming on the way out would drop an arm picked up while the mode stood.
    // `dualCursorFollowing === null` is the way in. ⚠️ The mode itself is written
    // by `commandFromDualCursorEntry` (`setDualCursorFollowing`; LY-5 of table
    // T-060); this member owns `armed` only.
    //
    // ⚠️ One corner is deliberately not mirrored: PND-313 lets
    // `commandFromDualCursorEntry` take the press WITHOUT raising the mode when
    // the axis can name no day, and the arm is dropped here all the same.
    // Re-reading `dayAtX` here would put PND-313's rule in a second place, and
    // that corner is one BO-1 of table T-077 already forbids drawing in.
    case ENTRY.dualCursor:
      return context.dualCursorFollowing === null
        ? screenStateWithArmed(state, { kind: 'none' })
        : state
    // IC-41 -- FR-020: with the watermark shown the press raises U-60 of table
    // T-103; with it hidden the press shows it again without asking.
    //
    // ⛔ The gate stands on the hiding side alone, so the two directions differ.
    // ⚠️ That is what FR-020 asks, not the symmetric toggle it forbids: it
    // refuses treating both directions alike.
    //
    // ⛔ The hiding is not completed here: FR-020 hides the watermark only on a
    // SHA-256 match against what a person typed, which no pure member can read or
    // compute (LR-6, CS-1 of table T-066), so `frame-loop.ts` does that write.
    //
    // The two directions are told apart here and only here, with
    // `screenStateWithWatermark` (S-144, published by PI-36 of table T-064), so
    // one member moves for one direction.
    case ENTRY.watermark:
      return state.watermarkVisible
        ? screenStateWithSurface(state, WATERMARK_UNLOCK)
        : screenStateWithWatermark(state, true)
    // IC-2 -- SK-12's other entrance. FR-096 (MUST) keeps it the ONE way out,
    // and U-54 is the name table T-103 settled for what it opens.
    // ⚠️ Not IC-3: FR-025 gives the clipboard its own entrance, which opens no
    // surface at all.
    case ENTRY.exportChooser:
      return screenStateWithSurface(state, EXPORT_CHOOSER)
    // IC-52 is the same level of IN-4 that Esc's first press consumes.
    // ⛔ Table T-109 also places it on the `Properties Panel`, which S-99g does
    // not hold, so a press drawn there closes the panel and nothing else, and the
    // shell spends it (LY-5 of table T-060). ⚠️ Otherwise one press would close
    // the panel and the surface behind it.
    case ENTRY.closeSurface:
      return context.pressed?.on?.part === PROPERTIES_PANEL
        ? state
        : screenStateWithSurface(state, null)
    default:
      break
  }

  const armed = armedByEntry(entry)
  if (armed === null) return state
  // SP-1 .. SP-4 of FR-083, without reading the selection: the entry already
  // armed disarms, and any other entry arms. The shape change of SP-2 / SP-3 is
  // `commandFromArmingEntry`'s result of the same press.
  return screenStateWithArmed(state, isSameArm(state.armed, armed) ? { kind: 'none' } : armed)
}

/**
 * The next screen state (CP-36): what is armed, the palette, full screen and
 * the surface that is open.
 *
 * Esc's levels are IN-4's and are consumed one per press.
 *
 * @purity pure
 */
export function screenStateFromInput(input: HumanInput, context: InputContext): ScreenState {
  const state = context.screenState
  // IN-1 settles a pointer operation on the RELEASE, so a press on an entry is
  // read here and nowhere else in this member.
  if (input.kind === 'pointer') {
    if (input.phase !== 'up') return state
    const on = context.pressed === null ? null : context.pressed.on
    // U-62 `Import Report`'s one entrance (NT-8 of table T-037; FR-023, table
    // T-103) closes S-99g's surface.
    // ⛔ Read off `isImportReportDismiss`, not `entry`, `noticeDismissKey` or
    // `confirmationAnswer`: no row of table T-109 names U-62 (minting one is RC-13
    // of table T-026's decision), `noticeDismissKey` names a telling of
    // `ScreenSession.notices` which U-62 is not, and `confirmationAnswer` is one
    // of NT-7's answers, which U-62 never asks for.
    // ⚠️ And not `on.part` alone: that would close the surface on a press anywhere
    // on U-62, including the list FR-023 (MUST NOT) forbids shortening.
    if (on?.isImportReportDismiss === true) return screenStateWithSurface(state, null)
    return on === null || on.entry === null ? state : screenStateFromEntry(on.entry, context)
  }
  if (input.kind !== 'key') return state
  // SK-12 -- FR-096's one way out, and the only row of table T-036 that lands
  // here while holding a modifier. It opens U-54 `Export Chooser`, which S-99g
  // can hold, so IN-4's first level closes it again. ⚠️ Read before the
  // plain-key gate below, which every other row here passes through.
  if (isCombo(input.modifiers, true, true, false) && input.key === KEY.e) {
    return screenStateWithSurface(state, EXPORT_CHOOSER)
  }
  const plain = isCombo(input.modifiers, false, false, false)
  if (!plain) return state
  if (context.isTextEntryUnsettled) {
    // IN-5a: a single-character key is inert while text is being typed, which
    // is what SK-14 (`P`) and SK-18 (`F`) are.
    if (isSingleCharacterKey(input.key)) return state
  }

  // SK-8 -- one level per press (IN-4).
  if (input.key === KEY.escape) {
    switch (escapeTarget(state, escapeContextOf(context))) {
      case 'surface':
        return screenStateWithSurface(state, null)
      case 'armed':
        // ⚠️ UN-11 keeps this out of the undo record, which is the other half
        // of why it lives in `ScreenState` and not in the document.
        return screenStateWithArmed(state, { kind: 'none' })
      case 'notice':
      case 'gesture':
      case 'dualCursorMode':
      case 'confirmation':
      case 'propertiesPanel':
      case 'selection':
      case null:
      default:
        // ⛔ None of these levels is in `ScreenState`, which is why
        // `EscapeContext` exists: the shell drops the press, leaves the mode,
        // settles the question or puts the panel away when `escapeTarget` names
        // its level. Answering with the state unchanged still consumes the level,
        // keeping IN-4 at one level per press.
        // ⚠️ `'selection'` is spent in this file by `selectionFromInput` (UN-9
        // keeps the selection out of the document). `'notice'` and
        // `'propertiesPanel'` arrive because `escapeContextOf` reports them;
        // ⛔ disarming here as well would spend a second level on that press.
        // ⚠️ `'confirmation'` cannot arrive: `escapeContextOf` leaves it unset.
        // ⛔ So the caller must not ask this member at all for such a press --
        // unset reads as not standing, and this member would answer for the next
        // level down and close the surface behind the question. `frame-loop.ts`
        // skips the call.
        return state
    }
  }

  // SK-13 -- FR-036's help, U-30 `Help Modal` of table T-103 (the name
  // `open-modals.ts` keys its rule on).
  // ⚠️ It opens and does not toggle, unlike SK-14 and SK-15: IN-4 gives Esc's
  // first level to closing the open surface, so a second way to close it would
  // be the extra entrance FR-029 forbids.
  if (input.key === KEY.f1) return screenStateWithSurface(state, HELP_MODAL)
  // SK-14 -- S-99e.
  if (input.key === KEY.p) return screenStateWithPalette(state, !state.paletteShown)
  // SK-15 -- S-99f. ⚠️ The flag is this tool's record of FR-071, not the act:
  // IN-4a says leaving full screen through Esc is the BROWSER's behaviour, so
  // the shell drives the host and this value follows it.
  if (input.key === KEY.f11) return screenStateWithFullScreen(state, !state.fullScreen)

  return state
}

// STOP -- ⛔ SOME ROWS OF TABLE T-109 REACH `commandFromEntry` AND THIS FILE
// ANSWERS NONE OF THEM: the rows of table T-109 less the keys of `ENTRY` and
// `ARMED_BY_ENTRY` (the two are disjoint). The groups below name them by row ID.
// ⛔ No figure is written here: a count nothing checks goes stale (rule 03
// section 3). To measure one, the rows are `^| IC-` in
// `docs/spec/_assets/tbl-glossary.md`, and this file's share is the `'IC-nn'`
// keys of `ENTRY` and `ARMED_BY_ENTRY` with the comments stripped.
// An entry is answered here when
//   1. this file already answers the same operation for a row of table T-036, or
//   2. it opens a surface whose name table T-103 has settled, or
//   3. its own row names the value the press writes and the setting it goes into
//      (FR-049's toggles and its plan/actual pair S-227 / S-228, FR-039's theme,
//      FR-048's exclusive modes), or
//   4. its whole effect is one value of `ScreenSession` that no table keeps
//      (IC-17, IC-18 / S-99i, IC-20, IC-50 / S-142, and the U-49 choosers),
//      answered with an `InputAction` of its own kind: table T-108 has no row, so
//      `applyDocumentChange` (PI-8) has nothing to plan, and LY-5 of table T-060
//      leaves a current value with the Framework
// -- plus FR-083's arming, and the entrances table T-109 draws once per row,
// which `ScreenPart.rowGroupId` reaches.
//
// GROUP ONE -- answered in `frame-loop.ts` (`answerSettledEntry`), because each
// needs a value of `ScreenSession`, a surface or a question, and LY-5 of table
// T-060 leaves a current value with the Framework:
//
//   IC-21        FR-038's display language (S-99). S-99 is written back to
//                `localStorage`, so the press is an act and not only a value,
//                and LR-6 keeps the browser out of this layer.
//   IC-66        FR-099's delete on U-49 `Resource Roster`. The write (CM-42)
//                waits on QN-3 of table T-234, and a pure member can neither ask
//                a question nor hold the answer.
//   IC-71 .. IC-73  OP-3's three answers, on U-56 `Open Chooser`
//                (`OPEN_CHOICE_OF_ENTRY`). Nothing opens U-56 by entry: OP-3 has
//                the read raise the choice.
//   IC-95 .. IC-97  MM-1 / MM-2 / MM-4 of table T-032a, on U-53 `Difference
//                Review` (FR-022), mapped by `MERGE_MAPPING_OF_ENTRY` -- the same
//                shape as IC-71 .. IC-73.
//   IC-98        FR-095's new document, on the `App Header`
//                (`NEW_DOCUMENT_ENTRY`): returning to BT-4 is a startup state
//                LY-5 leaves with the Framework, and FR-095 puts a confirmation
//                in front of it.
//
// GROUP TWO -- not an entry at all:
//
//   IC-54        Table T-109's own column says the row shows the figure the
//                palette is holding (table T-023b) and is not a button.
//
// DC-7's clearing needs no row of table T-109: DC-4's way out writes CM-61
// (`commandFromDualCursorEntry`; Esc does the same in `frame-loop.ts`). PND-345
//
// Searched: table T-109, table T-108, table T-036, table T-023b, table T-202,
// table T-203, table T-206, table T-234, table T-037, table T-026, table
// T-029a, figure F-019, FR-020, FR-049, FR-053,
// FR-065, FR-066, FR-072, FR-085, FR-099, `screen-renderer.ts`,
// `edit-document-settings.ts`, `document-settings.ts`, `screen-surface.ts`,
// `dialogue-field.ts`, `open-modals.ts`, `notices.ts`, `frame-loop.ts`.

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206, which names table T-201)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ Reading this is NOT the same as taking it: the value still
 * arrives as an argument, because table T-206 keeps these out of the
 * document on purpose (the environment may hold a larger one). This
 * is what a caller passes when it has nothing better.
 *
 * ⚠️ Table T-206 states these by POINTING at table T-201 (S-96 names
 * S-53, and so on), so both row IDs appear below: the first is where
 * the specification says the document does not keep the value, and
 * the second is where the value itself stands.
 */
export const NOT_STORED_ZOOM_STEP: {
  /** S-96, stated at S-53 */
  readonly 'S-96': number
} = {
  'S-96': 1.1,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands because the decision is
 * its own to make: HF-15 of table T-051 (MUST) settles the axis of a
 * grab at the first travel past this distance and holds it until the
 * release, and no member of `InputContext` carries a distance for a
 * caller to hand in. ⛔ It is not a document setting and must not
 * become one: table T-206 is where the specification records that the
 * document does not keep it, and it stands on S-138's ground.
 */
export const NOT_STORED_ROW_GRAB_SIZES: {
  /** S-208, in px */
  readonly 'S-208': number
  /** S-212 */
  readonly 'S-212': number
} = {
  'S-208': 6,
  'S-212': 0.4,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands because the derivation is
 * its own to carry out: FR-016 (MUST) puts the ceiling of the day axis
 * at 「`Row Area` の幅 ÷（`S-229` × 等倍のときの 1 日の幅）」, and the
 * other two terms of that quotient are values only this side holds. ⛔
 * It is not a document setting and must not become one: table T-206 is
 * where the specification records that the document does not keep it.
 */
export const NOT_STORED_VISIBLE_DAY_FLOOR: {
  /** S-229 */
  readonly 'S-229': number
} = {
  'S-229': 10,
}
// </generated>
