// InputCommandTranslator -- public entry of this folder.
//
// @unit      UF-30   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-18
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
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
// ⭐ WHY THIS COMPONENT EXISTS. CP-18 of table T-062 gives it one job -- 「画面
// の入力を操作へ変える」 -- and names FR-016 and FR-070 as the requirements it
// answers. Everything else in this tree can draw a schedule and change a
// document; nothing else turns a press or a key into the change. Table T-023
// and table T-036 are the two assignment tables, and this file is where they
// are read.
//
// ⭐ THREE PURE FUNCTIONS, NOT A LISTENER. UF-30 is `pure` in table T-075, so
// none of the three may remember anything between two happenings. Every value
// that has to survive from a press to its release -- the press itself, whether
// text is being typed, which side of the Dual Cursor is following -- reaches
// them as an argument, because LY-5 of table T-060 leaves the Framework as the
// only layer that may hold a current value. `InputContext` is that argument.
//
// ⭐ WHAT "NOTHING" IS, per member, since a gesture that means nothing has to
// produce nothing (MK-12 says so of an unassigned combination, and IN-4a says
// so of `Esc` with nothing to consume):
//
//     commandFromInput      `action: null`. Not an empty command list: an empty
//                           write would still be a write, and WS-4 would push a
//                           step onto the undo history for a gesture that
//                           changed nothing.
//     selectionFromInput    the SAME selection value it was handed. UN-9 keeps
//                           selection out of the undo record, so there is no
//                           "no change" answer to invent -- the caller compares
//                           by identity and sees that nothing moved.
//     screenStateFromInput  the SAME state value. LY-1 has this held as one
//                           immutable value and replaced whole, so an unchanged
//                           screen is the value that came in.
//
// ⭐ THE HARD DECISIONS, and why they went this way:
//
//   1. `commandFromInput` answers a RECORD, not a command. MK-10 is a row of
//      table T-023 -- the very table PI-18 names -- and it is a MUST about the
//      browser's own behaviour: stop it for what this tool assigned, and do NOT
//      stop it for what it did not. Only this component knows which is which,
//      so the answer travels beside the action. It is keyed on ASSIGNMENT, not
//      on whether an action came out: `Ctrl+A` is assigned though its whole
//      effect is a selection, and a wheel turn mid-drag is assigned though the
//      rule under table T-023d refuses it (MUST NOT).
//   2. `InputAction` is wider than `DocumentCommand`. Half of table T-036 asks
//      for something that is not an edit at all -- open, save, copy, undo --
//      and CP-18 says 操作, not 命令. A `changeDocument` action carries a LIST
//      because one gesture can be several rows of table T-108 that have to
//      settle together: FR-031 requires one document-changing drag to be one
//      undo step (MUST), and `PlanInput.commands` is the bundle that makes it
//      one write.
//   3. The press arrives in the context, hit and all. IN-1 settles a pointer
//      operation on RELEASE, and CS-2 of table T-066 freezes a gesture's
//      document at the moment of the press -- so what was under the pointer
//      THEN is what the gesture is about, and re-running `itemAtPointer` on
//      release would answer about a screen that has since moved.
//   4. What the SCREEN SURFACE drew at the press arrives the same way
//      (`PointerPress.on`), and it is read BEFORE table T-023a. The note under
//      that table limits its decision order to the schedule's drawing area
//      (MUST), and the floating palette, the open surface, the notices and the
//      dialogue field are drawn over that area while `ScreenRegions` (PI-35)
//      holds a rectangle for none of them -- so `regionAtPointer` alone answers
//      `rowArea` for a point on any of them, and a press on an entry would
//      become a marquee on the schedule underneath. ⭐ The answer comes from
//      the side that DREW the entry, which Chapter 5.3 makes a MUST under table
//      T-065; nothing here recomputes a rectangle it cannot see.
//   5. Which ROW of table T-023a a press began travels ON the press
//      (`PointerPress.pressRow`), decided when the press is recorded. AG-9 of
//      table T-035 refuses an Agent API write while a gesture is in flight but
//      spares the two gestures table T-027 keeps out of the undo history -- the
//      pan (UN-8, which is PD-1) and the range selection (UN-9, which is PD-5)
//      -- and the party that answers AG-9 holds the press and nothing else.
//      ⛔ That party may not read table T-023a a second time (R2.7), and the
//      note under the table binds the decision order to the schedule's drawing
//      area (MUST) besides. So `pressRowOf` is published and its answer is
//      carried. ⭐ CS-2 of table T-066 is why the answer rides on the press
//      rather than being asked for later: it makes one gesture the unit of
//      consistency and the press its moment, so the row's life is the press's.
//
// ⛔ WHAT THIS FILE MAY NOT DO. It never invents a value the specification
// owns: where a row is missing, a STOP note names the row that is missing and
// the member stays unwritten. The marked places are collected in the report for
// this unit, and each one says what would have to be settled first.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.
//
// The seam declared in this folder is re-exported here because
// the layer that implements it may not reach past this file
// (Chapter 5.3, MUST).

import type { Document } from '../../entity/document-model/document/document'
import {
  escapeTarget,
  screenStateWithArmed,
  screenStateWithFullScreen,
  screenStateWithPalette,
  screenStateWithSurface,
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
  itemsInMarquee,
  type Hit,
  type Item,
} from '../../entity/layout-engine/item-hit-area/item-hit-area'
import type { ScheduleGeometry } from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  dateAtX,
  fitZoom,
  xFromDay,
  type RowPlacement,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionAtPointer,
  type ScreenRect,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { FieldCommit, ScreenPart } from '../screen-renderer/screen-renderer'
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
 * The row of table T-023a a press falls on -- PD-1 the pan, PD-2 the Dual
 * Cursor's click, PD-3 the grab, PD-4 and PD-4a the armed press, PD-5 the
 * range selection.
 *
 * ⭐ A ROW ID AND NOTHING ELSE. Table T-023a has no English column, so the row
 * id is the only join to it, the way `ENTRY` below joins table T-109.
 */
export type PressRow = 'PD-1' | 'PD-2' | 'PD-3' | 'PD-4' | 'PD-4a' | 'PD-5'

/**
 * The press a gesture began with, as the Framework recorded it.
 *
 * ⭐ EVERY MEMBER BUT THE LAST IS THE MOMENT OF THE PRESS. IN-1 settles the
 * operation on release, so the release has to be read against something, and
 * CS-2 makes that something the state at the press. ⚠️ `followedTo` is the one
 * exception and says so itself: it is how far the picture has been carried
 * since, which is a thing that can only move while the press is held.
 */
export interface PointerPress {
  /** The `down` happening, unchanged. */
  readonly at: PointerInput
  /**
   * What lay under it, or null when nothing did -- `itemAtPointer` (PI-7)
   * answered with table T-023d's priority at the moment of the press.
   *
   * ⚠️ Resolved by the CALLER, not here. The reason is the one `item-hit-area`
   * gives on that member: table T-023a is applied first, and PD-1 and PD-2 mean
   * the hit is not always asked for at all. The shell already holds the
   * geometry for the frame (ADR-001), so it is the party that can answer at the
   * moment the press happens rather than one frame later.
   *
   * ⛔ THE CALLER ALSO OWES THE READING. Table T-023d's closing rule (MUST NOT)
   * keeps the double-click-only rows out of a plain press, and `at.clickCount`
   * -- which the Framework counts, since telling a double click from two single
   * ones is a question about elapsed time -- is what says which reading this
   * press is. A shell that asked for the press reading on the second click
   * would put the name label out of reach of MK-13.
   */
  readonly hit: Hit | null
  /**
   * What the screen surface had drawn where the press landed -- the UI part and
   * the entry within it -- or `null` where it had drawn nothing there and the
   * schedule below was exposed.
   *
   * ⭐ ASKED OF THE SIDE THAT DREW IT. `ScreenSurface.readScreenPartAt` (IF-9)
   * answers it, and Chapter 5.3 states under table T-065 that no one else may
   * compute the same rectangle (MUST NOT). ⚠️ Resolved by the CALLER at the
   * moment of the press, for the same reason `hit` is: CS-2 of table T-066
   * freezes a gesture's screen at the press, so a palette dragged away since
   * must not change what this gesture was about.
   *
   * ⛔ `null` IS WHAT ADMITS TABLE T-023a. Its own note limits the decision
   * order to the schedule's drawing area (MUST), and the floating palette, the
   * open surface, the notices and the dialogue field are all drawn OVER that
   * area while `ScreenRegions` (PI-35) holds a rectangle for none of them -- so
   * `regionAtPointer` alone answers `rowArea` for a point on any of them.
   */
  readonly on: ScreenPart | null
  /**
   * Which row of table T-023a this press began -- the gesture it is, named by
   * the only join that table admits.
   *
   * ⚠️ Resolved by the CALLER at the moment of the press, for the same reason
   * `hit` and `on` are, and with `pressRowOf` below rather than by any reading
   * of its own. CS-2 of table T-066 makes one gesture the unit of consistency
   * and the press its moment, so the row's life is exactly this value's life;
   * deciding it on the release would decide it against a screen that has moved
   * and an arming that may have changed since.
   *
   * ⭐ WHY THE PRESS CARRIES IT. AG-9 of table T-035 refuses an Agent API write
   * while a gesture is in flight, and spares the two gestures table T-027 keeps
   * out of the undo history because they change no document -- the pan (UN-8,
   * which is PD-1) and the range selection (UN-9, which is PD-5). The party
   * that answers AG-9 holds the press and nothing else, so with no row on it
   * the only thing it can do is refuse all six. ⛔ It may NOT read table T-023a
   * for itself: that is the duplication R2.7 refuses, and the note under the
   * table binds the decision order to the schedule's drawing area (MUST).
   *
   * ⚠️ READ `on` FIRST, AND THE ROW ONLY AFTER IT IS NULL. The same note keeps
   * table T-023a off everything the screen surface drew, so a press the surface
   * answered for is none of the six gestures whatever this row says -- it is a
   * press on an entry, and `commandFromEntry` may well change the document.
   * `commandFromInput` takes that branch before it looks at the row; anyone
   * asking about AG-9 has to take it too.
   */
  readonly pressRow: PressRow
  /**
   * Where the pointer stood when the caller last APPLIED a
   * `moveCommandPalette` this file answered for THIS gesture -- the following
   * FR-053 asks for, measured so far.
   *
   * ⭐ WHY A TRAVEL NEEDS A SECOND POINT AT ALL. FR-053 (MUST) has the palette
   * follow the pointer while GR-19's band is held, and `moveCommandPalette`
   * answers with a DISTANCE rather than a corner, so a report on every move
   * has to be the distance since the report before it -- add up distances all
   * measured from the press instead and the palette runs away by the sum.
   * ⛔ It cannot be worked out here: UF-30 is `pure` in table T-075 and LY-5 of
   * table T-060 leaves a current value with the Framework, so the party that
   * applied the travel is the party that knows where the pointer was.
   *
   * ⚠️ ABSENT MEANS THE CALLER DOES NOT FOLLOW, and the answer changes with
   * it: with nothing here a move reports NOTHING and the release reports the
   * whole travel from the press, which is what a caller that only settles on
   * the release wants (IN-1). A caller that fills it -- with the press's own
   * point until it has applied one, and with the pointer of each travel it
   * applies after that -- gets the picture following, and the same total,
   * because the parts telescope.
   * ⭐ `frame-loop.ts` FILLS IT ON EVERY PRESS, which is what makes FR-053's
   * MUST reached on the one road this build has: `collectPress` puts the
   * press's own point here, and the travel each applied `moveCommandPalette`
   * carries advances it.
   * ⛔ STILL OPTIONAL, AND THAT IS THE WHOLE OF WHAT IS LEFT OF THE SEAM.
   * Required is the honest shape and costs one character here; what holds it
   * open is that presses built outside the shell do not carry the member yet,
   * and until they do the meaning above is what an absent one means -- never a
   * silent zero, which would report the whole travel from the press on every
   * move and send the palette running by the sum.
   */
  readonly followedTo?: { readonly x: number; readonly y: number }
}

/**
 * Everything the three functions read that is not the happening itself.
 *
 * ⭐ Why any of this is an argument: LY-5 of table T-060 leaves the Framework
 * as the only layer that may hold a current value, and UF-30 is `pure`. Each
 * member below is either a value table T-206 keeps out of the document, a
 * measurement only the shell can make, or a frame value ADR-001 has the shell
 * compute once and hand out.
 */
export interface InputContext {
  /** The frozen copy CS-1 collects at the head of the frame. */
  readonly document: Document
  /** ADR-001's three, computed once for this frame. */
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
  readonly regions: ScreenRegions
  /** S-99e / S-99f / S-99g and what is armed (table T-023b). */
  readonly screenState: ScreenState
  /** UN-9 keeps this out of the document, so it travels beside it. */
  readonly selection: Selection
  /**
   * S-53. ⛔ NOT a number written here: table T-201 holds it, `_source` prints
   * it, and no generator has brought it into `src/` -- so it arrives as a value
   * the same way `PointerSlop` does, rather than being re-typed (rule 03
   * section 1).
   */
  readonly zoomStep: number
  /**
   * S-54 and S-55, reaching here through S-97 and S-98. ⛔ NOT numbers written
   * here, for the reason `zoomStep` above gives: table T-206 keeps all three
   * out of the document on purpose, so they travel as values.
   *
   * ⚠️ Needed because FR-055's fit measures the horizontal at the zoom it is
   * about to answer, and CM-71 clamps what it writes -- so the fit has to see
   * FR-016's range or it draws a picture it never measured.
   */
  readonly zoomMin: number
  readonly zoomMax: number
  /**
   * The gesture in flight, or null while none is.
   *
   * ⚠️ ON A `down` HAPPENING THIS IS THAT PRESS. The caller records the press --
   * with its hit, with what the surface had drawn there, and with the row of
   * table T-023a it began -- before it asks any of the three members, because
   * IN-1 settles nothing on the press and the only thing this file answers for
   * a `down` is whether the tool has taken the gesture (MK-10). ⛔ A caller that
   * leaves it null on the press leaves every entry it drew unassigned.
   */
  readonly pressed: PointerPress | null
  /**
   * IN-5a: a name, an assignee, a row name or the document title is being typed
   * and has not been settled. AG-9 of table T-035 calls the same state
   * 「編集入力の確定前」 and `WriteMoment.editingInPlace` is where it reaches
   * the write path.
   */
  readonly isTextEntryUnsettled: boolean
  /**
   * table T-023's closing rule -- whether a surface stands over the schedule:
   * `Confirmation` (U-55), or whichever surface `ScreenState` is holding.
   *
   * ⭐ HANDED IN, LIKE `isTextEntryUnsettled` BESIDE IT, and for the same
   * reason: half of the answer is `screenState.surface`, which this side can
   * read, and half is the question the shell holds -- LY-5 of table T-060
   * leaves a current value there and NT-7's question is one. ⛔ A reader here
   * cannot see it at all, which is why that rule was inert until this member
   * existed.
   * ⚠️ ONE TRUTH VALUE AND NOT WHICH SURFACE. The rule names no surface in
   * particular -- it asks only whether one stands -- and naming them here
   * would be a second census against table T-103's.
   * ⛔ IT IS A CLOSING RULE AND NOT A ROW, and calling it `MK-14` (as two
   * lines here did until 2026-08-29) names something table T-023 does not
   * hold: the manuscript says in as many words why it is not a row --
   * 「行ではなく結びの規則としたのは、これが操作ではないからである」 -- because
   * that table's rows are printed into FR-036's help as things a person can DO.
   */
  readonly isSurfaceStanding: boolean
  /**
   * Table T-029a's Dual Cursor mode: WHICH of the two dates is following the
   * pointer, or `null` while the mode is not up.
   *
   * ⭐ ONE FIELD, NOT TWO. `null` IS "not in the mode" -- a boolean beside a
   * side could say the mode is up with no side following, and DC-1 (which puts
   * a side on the pointer the moment the mode is entered) and DC-2 (which
   * always hands the following to the other side) leave no such state to
   * describe. PD-2 turns hit testing off while this is non-null, and IN-4 gives
   * the mode the last level of `Esc`.
   *
   * ⛔ NOT IN `documentSettings`, and that is the user's ruling of 2026-08-26:
   * `dualCursor` (S-65) holds the two DATES, and which one is following is
   * operation state -- DC-8 (MUST NOT) even keeps the mark for it out of an
   * export, so it could not be a saved key without going on the round trip.
   *
   * ⚠️ THE NOTE THAT STOOD HERE ALSO CALLED THIS A THING `EscapeContext` HAD
   * SETTLED. That value asks a narrower question (whether the mode is up at
   * all) and `escapeContextOf` answers it from this one.
   */
  readonly dualCursorFollowing: DualCursorSide | null
  /**
   * Today, spelled as a date column is (`textOfDay`).
   *
   * ⛔ The clock is NOT read here and cannot be: CS-1 keeps it out of the frame
   * and LY-5 leaves it to the Framework, which is the same route
   * `PlanInput.updatedUtc` takes. FR-046 is the one operation that needs it --
   * SK-20 puts today into `statusDate` when the line is shown.
   */
  readonly today: string
  /**
   * The identifier to give a row that FR-001 has to create because the drag
   * pointed at no existing one.
   *
   * ⛔ Minting it is not a pure act -- AT-51 is a UUID -- which is the same
   * reason `createTask` declares `groupId` as a value it is handed rather than
   * one it makes.
   */
  readonly newGroupId: string
}

// ----------------------------------------------------------------- answer ---

/** Where an in-place edit opens. MK-13 and SK-9 are the two entrances. */
export type InPlaceTarget =
  /** SK-9 (`F2`), whose one entrance is FR-035. */
  | { readonly kind: 'documentTitle' }
  /**
   * MK-13's Task entry -- the name label OR the body, both editing the name --
   * reached through GR-10, GR-12 and GR-15 of table T-023d.
   *
   * ⭐ STILL ONE KIND FOR THE TWO PLACES, because MK-13 folded them into one
   * entry and names one destination for both. Which grab it came in by is not
   * carried: nothing downstream could use it without the same operation
   * meaning two things.
   */
  | { readonly kind: 'taskName'; readonly uid: number }
  /**
   * MK-13's 「担当ラベル ＝ 担当者名の変更」, reached through GR-11 of table
   * T-023d, which AS-1 of table T-225 (MUST) names in as many words:
   * 「担当ラベルをダブルクリックした ⇒ その場で担当者名を編集させること。入口の
   * 割当は表 T-023 の `MK-13`、掴み領域は表 T-023d の `GR-11` が既に持つ」.
   *
   * ⛔ ITS OWN KIND AND NOT `taskName`. MK-13 gives 担当ラベル a destination
   * separate from 「タスク（名称ラベルと本体のどちらでも） ＝ 名称の編集」, and
   * folding the two would put one operation where the row prints two.
   *
   * ⚠️ THE TASK IS WHAT IS CARRIED, not an assignment or a resource. AS-3 and
   * AS-7 of table T-225 turn what was settled into CM-44 / CM-45, both of which
   * name a Task and a Resource -- and which Resource is what the edit is FOR,
   * so it cannot be known before the edit is over. ⛔ The name spelled here is
   * this file's, as CR-146 leaves it: no row of the specification settles one.
   */
  | { readonly kind: 'assignee'; readonly uid: number }

// STOP -- ⛔ ONE OF MK-13's FOUR ENTRANCES CANNOT BE REACHED, and not because
// it was left out here. 「行見出し」 is in the Row Title Panel, which the note
// under table T-023a puts outside this decision order altogether (FR-085 owns
// it). Adding a kind for it here would declare a vocabulary nothing can
// produce, which is the guess R4's YAGNI forbids.
//
// ⚠️ 「担当ラベル」 IS NO LONGER ONE OF THEM. ScheduleGeometry places the label
// and `item-hit-area.ts` gives GR-11 its row, so a `Hit` can name it and AS-1
// has its destination above.
//
// ⚠️ 「コメントボックス ＝ 本文の編集」 IS NO LONGER ONE OF THEM. GR-14 now
// answers with a comment box, so a `Hit` can name one and the reason this STOP
// used to give for it has expired. FR-097 owns that entrance and wiring it to
// CM-48 is its own piece of work; the kind is left out until that work is
// asked for, for the same YAGNI reason and not for the old one.

/**
 * CM-60, which is the one road into `dualCursor` (S-65).
 *
 * ⭐ NAMED OFF `DocumentCommand` RATHER THAN RESTATED. The two dates and their
 * spellings are that command's, `edit-document-settings.ts` is where IV-13 is
 * judged, and a pair of fields written out here would be a second declaration
 * of the same thing for the compiler to fail to keep in step.
 */
type SetDualCursor = Extract<DocumentCommand, { readonly kind: 'setDualCursor' }>

/**
 * What one happening is assigned to.
 *
 * ⭐ Wider than `DocumentCommand` because table T-036 is wider: opening a file,
 * saving, copying, undoing and redoing are none of them edits, and CP-18 says
 * this component turns input into 操作. Each row below names the row of table
 * T-023 or table T-036 that assigns it.
 *
 * ⚠️ Selection and screen state are NOT here. They are the other two members'
 * answers, and a kind for them would be a second place the same rule is
 * written. `isBrowserDefaultStopped` still speaks for those inputs.
 */
export type InputAction =
  /**
   * The writes one input asks for, in the order they must land.
   *
   * ⭐ Each member is ONE write. FR-031 (MUST) makes a document-changing drag
   * one undo step, so the rows of table T-108 a single gesture asks for travel
   * together inside one member and reach `applyDocumentChange` as one
   * `PlanInput.commands`.
   *
   * ⛔ The list exists because ONE input can owe TWO writes: FR-031 requires
   * the fit press to place CM-71 and then CM-72 separately, and forbids
   * swapping them. Folding both into one member would be the very defect that
   * rule exists to stop -- WS-4 pushes the step from the document BEFORE the
   * write, so a merged write's step carries the old zoom and undo rewinds it,
   * breaking UN-8.
   *
   * ⚠️ Not an optional second field: a caller can silently drop one of those,
   * and a dropped second write is exactly the same defect wearing a hat.
   */
  | {
      readonly kind: 'changeDocument'
      readonly writes: readonly (readonly DocumentCommand[])[]
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
  /** SK-21. OP-13 of table T-024a -- no chooser, and always a replace. */
  | { readonly kind: 'reopenDocumentFile' }
  /** IC-3. FR-025 sends IO-6 of table T-024 with no surface in between. */
  | { readonly kind: 'copyPictureToClipboard' }
  /** SK-19. */
  | { readonly kind: 'settleTextEntry' }
  /** SK-9 and MK-13. */
  | { readonly kind: 'editInPlace'; readonly target: InPlaceTarget }
  // ⛔ `openPropertiesPanel` WAS HERE AND IS GONE. MK-13 now forbids a route
  // that opens the properties panel to sit on that row (MUST NOT), and its own
  // reason is that FR-072 already decides the panel's contents by the last
  // operation the reader made -- the press that selects IS that operation.
  // ⚠️ Nothing was lost by deleting it: the shell turns the panel to the choice
  // whenever the selection changes, so a member that only said the panel had
  // been asked for could ask for nothing but what had just happened.
  /**
   * GR-19 of table T-023d -- the band on top of the `Command Palette` was
   * dragged, so FR-053's palette moves by what the pointer travelled.
   *
   * ⭐ ANSWERED ON EVERY MOVE AND NOT ONLY ON THE RELEASE. FR-053 (MUST) has
   * the palette follow the pointer while the band is held and says why -- a
   * palette that does not move is indistinguishable from one not caught. Each
   * answer is the travel SINCE THE ONE BEFORE IT (`PointerPress.followedTo`),
   * so a caller that keeps applying them ends where a caller that only read
   * the release would have put it. ⚠️ THE PICTURE, NOT THE MOMENT THE VALUE IS
   * SETTLED: FR-053 names IN-1 of table T-028 in the same breath, so an
   * interrupted drag still owes the corner it started from, and the party that
   * APPLIES these is the party that can keep it -- `frame-loop.ts` takes the
   * corner on the press and puts it back on an `Esc` or a lost pointer.
   *
   * ⭐ A DISTANCE AND NOT A PLACE. Where the palette stands is
   * `ScreenSession.commandPaletteAt`, which the shell holds because no row of
   * table T-203 or table T-206 keeps it -- so this file has no corner to add
   * to, and answering with the travel alone leaves the one holder holding it.
   *
   * ⚠️ THE SHAPE IS MK-7's PAN AND THE ROAD IS NOT. That row's rule reads
   * 「パンは等倍とすること（MUST）」, which is why nothing is scaled here
   * either. ⛔ But `scrolledAnchor` is not reused: it answers a day and a row
   * with a fraction of each, because S-77 / S-78 / S-176 / S-177 hold the
   * schedule's place as an anchor in the document, and the palette's place is
   * a pair of screen numbers that no document row holds at all.
   *
   * ⛔ NOT A DOCUMENT CHANGE, which is why it is a kind of its own rather
   * than a `DocumentCommand`: table T-108 has no row for it and table T-203
   * no key, so `applyDocumentChange` (PI-8) has nothing to plan.
   */
  | {
      readonly kind: 'moveCommandPalette'
      readonly by: { readonly dx: number; readonly dy: number }
    }
  /**
   * FR-085 (MUST): a row was chosen in the `Row Title Panel`, so
   * `ScreenSession.selectedGroupIds` moves.
   *
   * ⭐ THE ROW AND THE MODIFIER, NOT THE RESULTING SET. What is chosen now is
   * the shell's (LY-5 of table T-060) and no member of `InputContext` carries
   * it, so the set cannot be worked out here -- this says which row the press
   * was on and whether it was an extending one, and the holder answers. It is
   * the same division `moveCommandPalette` makes with a travel rather than a
   * corner.
   *
   * ⛔ NOT THE SELECTION TABLE T-023c GOVERNS. SL-1 leaves rows out of the
   * drawing area's selection in as many words and FR-085 says the two are
   * separate sets, so `selectionFromInput` may not answer this and `Selection`
   * may not hold it.
   *
   * ⚠️ `isExtending` IS `Shift`, WHICH FR-085 LEAVES OPEN AND SL-4 ALREADY
   * SPELLS. That requirement asks for several rows at once and for letting one
   * go (MUST) and states that the order and the range are the implementation's
   * (実装の裁量); the modifier is not named anywhere. SL-4 of table T-023c is
   * the product's own convention for 「広げる」 -- 「クリックなら 1 つずつ増減
   * し」 -- so it is followed rather than a second convention invented, which is
   * what R4's POLA asks for. ⛔ SL-3's range is NOT answered: FR-085 leaves the
   * range undefined, and a drag across the panel is not one of table T-023a's
   * six gestures either.
   *
   * @provisional PD-142
   */
  | {
      readonly kind: 'chooseRow'
      readonly groupId: string
      readonly isExtending: boolean
    }
  /**
   * IC-63 / IC-64 / IC-65 -- who is chosen in the `Resource Roster` is REPLACED
   * by these, so `ScreenSession.selectedResourceUids` becomes exactly `uids`.
   *
   * ⭐ REPLACED AND NEVER ADDED TO, and IC-65 is what settles that. FR-099 (MUST)
   * has 「まとめて消す」 reached by choosing the unreferenced and then deleting
   * what is chosen; if this entrance added to a standing choice, that second
   * move would delete people the person never picked out.
   * ⭐ THE LIST IS COMPUTED HERE because all three read the DOCUMENT and nothing
   * else -- every resource, none, or the ones no `Assignment` refers to -- and
   * `InputContext.document` is the copy CS-1 froze at the head of this frame.
   *
   * ⛔ BY `uid` (AT-85) AND NEVER BY NAME. AS-6 of table T-225 (MUST) makes the
   * name what a person is shown and the `uid` what the document writes, and AS-8
   * (MUST NOT) forbids two same-named resources being made one -- so a list of
   * names could not tell a referenced person from an unreferenced twin.
   *
   * @provisional PD-143
   */
  | { readonly kind: 'chooseResources'; readonly uids: readonly number[] }
  /**
   * IC-67 / IC-68 -- one person in the `Resource Roster` was pressed, so that
   * person joins or leaves `ScreenSession.selectedResourceUids`.
   *
   * ⭐ WHICH WAY ROUND IS THE HOLDER'S, not this file's and not the drawn
   * entry's. See the two rows in `ENTRY` for why the picture may not be read.
   *
   * @provisional PD-143
   */
  | { readonly kind: 'toggleChosenResource'; readonly uid: number }
  /**
   * IC-17 -- FR-072's settings entrance, so `ScreenSession.propertiesShowing`
   * moves between the document's drawing settings and the last chosen subject.
   *
   * ⛔ NOT AN OPENING AND NOT A CLOSING. FR-072 has this same entrance bring the
   * panel back to 「直前の選択物」 on a second press, so which way this one goes
   * depends on what the panel is showing NOW -- a current value LY-5 of table
   * T-060 leaves with the Framework, which is why this says only that the
   * entrance was pressed.
   *
   * @provisional PD-144
   */
  | { readonly kind: 'toggleDocumentSettingsProperties' }
  /**
   * IC-20 -- FR-065, so `ScreenSession.isAgentApiEnabled` turns round.
   *
   * ⛔ NOT A DOCUMENT CHANGE. S-99b of table T-206 keeps the record OUT of the
   * document in as many words -- 「有効化は読む人の判断であって文書の内容では
   * ない」 -- so table T-108 has no row for it and there is nothing to plan.
   */
  | { readonly kind: 'toggleAgentApi' }
  /**
   * IC-50 -- FR-053 (MUST) keeps the milestone glyph entrances off the palette
   * until the list is opened, so `ScreenSession.isMilestoneListOpen` moves.
   *
   * ⭐ IT REVERSES WHAT STANDS, AND CARRIES NO VALUE. Table T-109's IC-50 reads
   * 「同じ入口で開閉する」 since CR-273 and FR-053 (MUST NOT) forbids a second
   * entrance -- the shape IC-11 and IC-67 / IC-68 have. ⛔ WHICH IS WHY NO
   * `isOpen` IS SENT: the value that stands is `ScreenSession`'s, which lives
   * past this seam, so naming a direction here would need this file to hold a
   * copy of it. The shell turns it.
   * ⚠️ It was two rows until 2026-08-28, an opener and a folder, each naming
   * its own direction -- and figure F-019 drew both with the same shape, so one
   * of the two did nothing in each state.
   *
   * ⛔ NOT A DOCUMENT CHANGE. S-142 of table T-206 keeps the state out of the
   * document -- that row is where the specification says so -- and table T-108
   * has no row, so `applyDocumentChange` (PI-8) has nothing to plan.
   * ⛔ AND NOT A SURFACE. FR-053 (MUST NOT) refuses to let `Esc` close it, and
   * nothing here has to enforce that: `screenStateFromInput` can only reach
   * what `ScreenState` holds, and S-99g's `surface` is not this.
   */
  | { readonly kind: 'toggleMilestoneList' }
  /**
   * IC-75 -- FR-053 (MUST) lets the palette be minimised and restored by one
   * entrance on the grab band, so `ScreenSession.isPaletteMinimised` moves.
   *
   * ⭐ IT REVERSES WHAT STANDS, AND CARRIES NO VALUE, for the reason
   * `toggleMilestoneList` gives: the value that stands is `ScreenSession`'s and
   * lives past this seam.
   * ⛔ NOT `S-99e`. That row is whether the palette is SHOWN, and FR-053 (MUST)
   * puts its entrance OUTSIDE the palette -- this one rides on the band, which
   * a palette that is not shown does not draw.
   * ⛔ NOT A DOCUMENT CHANGE and NOT A SURFACE, both for the reasons the row
   * above gives: table T-206 keeps S-200 out of the document, and FR-053
   * (MUST NOT) refuses `Esc`.
   */
  | { readonly kind: 'togglePaletteMinimised' }
  /**
   * IC-76 -- FR-102 (MUST) lets a person start a record of the happenings and
   * the frames and stop it by the same entrance, so `S-206` of table T-206
   * moves. The shell is what keeps the record.
   *
   * ⭐ IT REVERSES WHAT STANDS, AND CARRIES NO VALUE, for the reason the two
   * rows above give: the value that stands is the shell's and lives past this
   * seam. ⛔ AND THE RECORD ITSELF CANNOT BE MADE HERE -- what FR-102 records
   * is the happenings this seam is handed one at a time and the frames drawn
   * after them, and a pure translator sees neither the run of them nor the
   * clock.
   * ⛔ NOT A DOCUMENT CHANGE. FR-102 (MUST NOT) keeps the record out of the
   * document and table T-206 holds both its rows, so table T-108 has none and
   * `applyDocumentChange` (PI-8) has nothing to plan.
   * ⛔ AND NOT A SURFACE. Nothing is drawn over anything, so S-99g is not
   * this and `Esc` gains no level of IN-4 (table T-028).
   */
  | { readonly kind: 'toggleInteractionRecord' }
  /**
   * Table T-029a: the Dual Cursor mode was entered (DC-1), the following was
   * handed to the other side (DC-2), or the mode was left (DC-4).
   *
   * ⛔ THE ONE ACTION THAT CARRIES A SESSION VALUE AND A WRITE AT ONCE, and the
   * requirement is what forces it. DC-1 (MUST) has entering the mode BOTH start
   * a side following AND put the two dates down; DC-2 (MUST) has one click BOTH
   * fix the following side AND hand the following over. Two actions could not
   * express one press, and either half alone is a state the table does not
   * admit -- a mode with nothing to measure, or a pair nobody is moving.
   *
   * ⭐ `following` IS THE WHOLE OF THE MODE. `null` leaves it; a side enters it
   * or turns it over. See `InputContext.dualCursorFollowing`.
   *
   * ⛔ `placed` IS NULL FAR MORE OFTEN THAN NOT. DC-1 (MUST NOT) forbids
   * re-placing a pair that already stands when the mode is re-entered, DC-4
   * writes nothing on the way out, and DC-7 (MUST NOT) keeps the pair standing
   * after it -- so a write happens only on the entry that has no pair yet and
   * on the click that fixes a side.
   * ⚠️ Typed as CM-60 itself rather than as two dates, so that this may not
   * become a second road into `dualCursor`: `edit-document-settings.ts` is
   * where IV-13 is judged, and the command is what it judges.
   */
  | {
      readonly kind: 'setDualCursorFollowing'
      readonly following: DualCursorSide | null
      readonly placed: SetDualCursor | null
    }

/** What `commandFromInput` answers. */
export interface TranslatedInput {
  /** Null when this tool assigns the happening to nothing (MK-12). */
  readonly action: InputAction | null
  /**
   * MK-10: stop the browser's own behaviour for an input this tool assigned
   * (MUST), and do NOT stop one it did not (MUST NOT).
   *
   * ⚠️ True says ASSIGNED, not "something happened". `Ctrl+A` answers true with
   * a null action because its whole effect is the selection SK-2 asks for, and
   * a wheel turn during a drag answers true with a null action because MK-2 has
   * assigned it and the rule under table T-023d refuses it just this once.
   * ⛔ False for `Esc` with nothing to consume: IN-4a makes reaching the
   * browser a MUST, because leaving full screen is the browser's own behaviour
   * (FR-071) and is otherwise unreachable.
   */
  readonly isBrowserDefaultStopped: boolean
}

/** The answer for a happening this tool has not assigned. */
const UNASSIGNED: TranslatedInput = { action: null, isBrowserDefaultStopped: false }

/** Assigned, and consumed by a member other than `commandFromInput`. */
const CONSUMED_ELSEWHERE: TranslatedInput = { action: null, isBrowserDefaultStopped: true }

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
 * An input that owes more than one write, in the order FR-031 fixes.
 *
 * ⛔ The only caller is the fit (SK-18 / IC-10): FR-031 (MUST) makes that press
 * two writes and (MUST NOT) forbids swapping them. Every other input is one
 * write and goes through `changed`.
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
 * ⭐ Because WS-4 pushes the document as it stood BEFORE its write, ②'s step
 * already holds the NEW zoom -- so one undo brings the collapse back and leaves
 * the zoom where the fit put it, which is what UN-17 promises.
 *
 * @purity pure
 */
function fitWrites(context: InputContext): readonly (readonly DocumentCommand[])[] {
  return [[fitCommand(context)], [{ kind: 'expandAllTaskGroups' }]]
}

/**
 * The same action, with the browser left holding its own behaviour.
 *
 * ⭐ MK-12's shape, and the reason the two halves of `TranslatedInput` are not
 * one flag: the row says the combination gets no assignment of this tool's AND
 * that table T-023a still decides what happens, so an action and a browser left
 * alone travel together. ⛔ MK-12 forbids answering "nothing happens" in as
 * many words (MUST NOT), because that would collide with PD-3.
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
 * ⛔ NOT DECIDED BY THE SPECIFICATION for most rows. MK-2 is the only one that
 * spells the pair 「Ctrl（Cmd）」; MK-5, MK-7, MK-10 and every `Ctrl` row of
 * table T-036 name `Ctrl` alone. Reading `Cmd` as the same key throughout is
 * the recommendation: a machine whose shortcut key is `Cmd` would otherwise be
 * able to zoom (MK-2) and unable to save (SK-11), which no requirement asks
 * for, and MK-2 shows the tables mean the same key by two names.
 * Searched: table T-023, table T-023a, table T-036, FR-016, FR-070, table
 * T-028, `_assets/tbl-settings.md`. Nothing else names `Cmd`.
 *
 * @provisional PD-10
 * @purity pure
 */
function isCtrlHeld(modifiers: InputModifiers): boolean {
  return modifiers.ctrl || modifiers.meta
}

/**
 * Whether exactly this combination is held.
 *
 * ⚠️ The unit is the COMBINATION, not the modifier -- MK-10 and MK-12 both say
 * so in as many words, and MK-4 against MK-5 is the proof. So every one of the
 * three is compared, and a key held that the row does not name makes the row
 * not match.
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
 * Whether table T-023 gives a POINTER happening with these modifiers an
 * assignment of its own -- which is what MK-10 keys the browser on.
 *
 * ⭐ Three combinations carry one: nothing held (MK-6, MK-8, MK-11, MK-13),
 * `Ctrl` alone (MK-7), and `Shift` alone (SL-4 of table T-023c, which PD-5
 * names again for a marquee). MK-12 is every other combination, and it names
 * two of them.
 * ⚠️ THE UNIT IS THE COMBINATION, not the modifier: the same `Alt` that carries
 * no assignment here has MK-4 on a wheel, and `Ctrl` + `Shift` has MK-5, so
 * `commandFromWheel` asks a different question of the same keys.
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
 * ⭐ MK-12 speaks of a DRAG rather than of a single happening, so the press is
 * what names the combination for every later phase -- the same end `pressRowOf`
 * reads, and for CS-2's reason: the gesture is about the moment it began. A
 * press names itself, because it IS that moment.
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
 * ⭐ One place rather than one literal per branch, so that the seam's contract
 * (`KeyInput.key`) and the rows that read it cannot drift apart. ⚠️ These are
 * the table's own spellings copied, not names chosen here -- the same standing
 * `open-modals.ts` gives `Help Modal`.
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
 * The other three surfaces table T-103 has settled a name for -- U-30's other
 * half (FR-068), U-49 (FR-099) and U-54 (FR-096).
 *
 * ⭐ Copied spelling and all, which is what `open-modals.ts` keys its rules on
 * and what `ScreenState.surface` (S-99g) carries. ⛔ No name is minted here for
 * the surfaces FR-074 and FR-088 open -- table T-103 has none, and
 * `open-modals.ts` records the same hole.
 */
const AI_EXPORT_MODAL = 'AI Export Modal'
const RESOURCE_ROSTER = 'Resource Roster'
const EXPORT_CHOOSER = 'Export Chooser'

/**
 * U-25 of table T-103 -- the surface `ScreenState` does NOT hold.
 *
 * ⛔ NOT A SIXTH NAME FOR `ScreenState.surface`, and it must never be put
 * there: S-99g holds ONE name and the drawing side turns whatever stands there
 * into a modal, so a panel named there would be drawn over the schedule instead
 * of beside it. It is spelled here for the one place that has to tell this
 * surface from those five -- the closing entry table T-109 stands on all six.
 */
const PROPERTIES_PANEL = 'Properties Panel'

/**
 * Whether this is one of IN-5's 「単文字キー」.
 *
 * ⭐ Measured on the spelling rather than listed, because IN-5a's rule is about
 * the SHAPE of the key ("one character") and not about which ones table T-036
 * happens to assign today.
 *
 * ⚠️ IN-5 asks a single-character shortcut to satisfy ONE of three properties,
 * and the one this build meets is the third -- 「フォーカスがあるときだけ有効」.
 * It is met OUTSIDE this file: a happening only arrives through `InputSource`,
 * and CP-27 registers with the host that has the focus. ⛔ Neither of the other
 * two is met: nothing anywhere lets a reader switch a shortcut off or move it,
 * and table T-206 has no key that would remember either.
 *
 * @purity pure
 */
function isSingleCharacterKey(key: string): boolean {
  return key.length === 1
}

// ------------------------------------------------------------ the axes -----

const MS_PER_DAY = 86400000

/**
 * A day as a count of days.
 *
 * ⚠️ A THIRD copy of this arithmetic in the tree -- `schedule.ts` and
 * `schedule-layout.ts` each keep a private one. It is not the counting FR-054
 * forbids writing three times: that MUST is about 稼働日 (worked days), which
 * only `workingDaysBetween` may count, and this is the plain calendar. ⛔ What
 * is missing is a published member that adds calendar days to a day: PI-1
 * publishes `dayOf`, `textOfDay`, `compareDays` and the two worked-day members,
 * and none of them can move a date by a drag's worth of days.
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
 * The day drawn at an x, or null while the axis has no origin.
 *
 * ⭐ Straight through to `dateAtX` (PI-5), which is the one member that owns
 * the mapping. ⚠️ Nothing here re-derives it from `pxPerDay`: that file warns
 * that a caller who rebuilds the origin from its own `ScreenRegions` can land
 * on a different day without saying so.
 *
 * @purity pure
 */
function dayAtX(layout: ScheduleLayout, x: number): CalendarDay | null {
  return dateAtX(layout, x)
}

/**
 * The row drawn at a y, or null when none is.
 *
 * ⚠️ Bands are half-open at the bottom, which is R3.4's rule and the one
 * `screen-regions.ts` follows: a point on the boundary belongs to the row
 * below, so two rows never both claim it.
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
 * The row the top edge of the Row Area stands in, or null when it stands
 * outside the drawn rows altogether.
 *
 * ⛔ A DIFFERENT QUESTION FROM `rowAtY`, which is why this is a second member
 * rather than a change to that one. `rowAtY` answers which row is DRAWN at a
 * point, and `rowGap` is drawn by no row -- LF-3 of table T-221 adds it BETWEEN
 * two bands -- so a point in the gap belongs to nothing, and FR-001 needs
 * exactly that null to know when a creation drag has to make a row.
 * ⭐ S-78 is not a point on a drawing, it is where the top EDGE stands, and an
 * edge always stands somewhere in the sequence of rows. So the axis is read as
 * slabs `[row.y, nextRow.y)` instead: half-open, which is R3.4's default and
 * the convention `screen-regions.ts` states for its own rectangles, so the gap
 * goes to the row above it and no two rows ever claim the same edge. ⚠️ The
 * horizontal half of the same anchor reads its axis the same way -- `dateAtX`
 * floors, so a point inside a day belongs to the day that began before it.
 * ⚠️ The LAST row's slab ends at its own band, because `schedule-layout.ts`
 * takes the trailing `rowGap` back off the content height: past that there is
 * no row to name, which is the null `scrolledAnchor` reads as "ran off the end".
 *
 * ⚠️ The ORDINAL is what this answers, because the callers want different
 * halves of it: `rowAnchorAt` wants the row AND the one below it (S-176 cannot
 * spell a top edge standing in the gap), and `rowTurnedTo` wants the place in
 * the stack, so that it can name the row one step along.
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
 * A display position: the two anchors of S-77 / S-78 and the two fractions of
 * S-176 / S-177 that say where inside each anchor the edge stands.
 *
 * ⭐ FOUR VALUES AND NOT TWO. The anchors alone can only name the start of a
 * day and the top of a band, so a movement shorter than either had nowhere to
 * be written at all.
 *
 * STOP -- ⛔ `setScrollPosition` (CM-66) CARRIES ONLY THE TWO ANCHORS. All four
 * are written into that command below, because a pan that does not carry the
 * fractions cannot be 等倍, but the command's own type in
 * `edit-document-settings.ts` has no member for either and its CM-66 branch
 * puts only `scrollDate` and `scrollGroupId`. Until that use-case type gains
 * `scrollDayOffset` and `scrollGroupOffset` -- and `fitScheduleToScreen`
 * (CM-71) with it -- this file does not compile and nothing reaches S-176 or
 * S-177. ⛔ NOT A CASE THE ROWS LEAVE OPEN: the paragraph under table T-023d
 * states the MUST and table T-203 states the two keys; the seam is simply in
 * another unit.
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
 * OP-10a's range, [0, 1), reached the way that row reaches it: drop the whole
 * part rather than refuse the value (MUST NOT refuse).
 *
 * ⚠️ Callers hand this a value already known to be in range; the guard is for
 * the rounding of the division that produced it, so that a distance a hair
 * short of the anchor's own extent cannot divide to exactly 1 and spell one
 * position two ways -- which is what NS-4's round-trip comparison would catch.
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
 * ⭐ The axis is read through the two published converters, one each way, so
 * `x -> day` and `day -> x` cannot drift apart -- which is the same reason
 * `schedule-layout.ts` gives for keeping one formula.
 * ⚠️ `dateAtX` floors, so the distance measured back from the day it names is
 * always at least zero and shorter than one day's width. That IS the fraction.
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
  // A null is passed on as the value already in force rather than as "no
  // chosen place": OP-10 of table T-024a reads a null `scrollDate` as
  // 「人がまだ場所を決めていない」, and a scroll has not un-decided anything.
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
 * ⛔ Asks `rowIndexAtTopEdge` and NOT `rowAtY`: a landing point in the `rowGap`
 * is on no row's band, and reading that as "the axis cannot say" left the
 * anchor where it was -- so a scroll was refused for every distance that
 * happened to end in a gap, however many rows long it was.
 * ⚠️ THE GAP HAS NO SPELLING OF ITS OWN. The slab that member reads runs to the
 * next band, so it takes in the `rowGap` LF-3 of table T-221 draws between two
 * bands, while S-176 is a fraction of the row's own HEIGHT -- a top edge
 * standing in the gap would need a fraction of 1 or more, which S-176's range
 * excludes. The nearest place that can be written is the top of the row below,
 * and it is at most one `rowGap` away.
 * ⚠️ A null is passed on as the value in force, for the reason `dayAnchorAt`
 * gives.
 *
 * @purity pure
 */
function rowAnchorAt(
  context: InputContext,
  y: number,
): Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'> {
  const settings = context.document.documentSettings
  const rows = context.layout.rows
  const held = {
    scrollGroupId: settings.scrollGroupId,
    scrollGroupOffset: settings.scrollGroupOffset,
  }
  const at = rowIndexAtTopEdge(rows, y)
  if (at === null) return held
  const row = rows[at]
  const below = rows[at + 1]
  // ⭐⭐ THE SLAB AND NOT THE BAND, and table T-023d is what requires it: ⛔
  // 「錠の上にしか着地できない形にしてはならない（MUST NOT）」. Two bands do not
  // touch -- measured 2026-08-29 on the shipped template, every pitch is the
  // band's height plus 8px -- so a fraction of the BAND cannot name a top edge
  // standing in that 8px, and every such edge was snapped forward to the next
  // row. ⛔ MEASURED: a Ctrl drag swept 2px at a time moved the picture
  // one-for-one until a boundary and then jumped 8px extra in one step, which
  // is 「パンは等倍とすること（MUST）」 broken by exactly the gap.
  // ⚠️ THE LAST ROW'S SLAB IS ITS OWN BAND, because there is nothing below for
  // it to reach to -- the stack ends there, and so does what a fraction of it
  // could mean.
  // ⛔ THE READING SIDE MUST USE THE SAME LENGTH. `scrollOffsetOf` in
  // `schedule-layout.ts` turns this pair back into pixels; the two are one
  // bijection and a denominator written differently in one of them would put
  // the picture somewhere this never named.
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
 * Where the display position lands when the schedule is moved by this many
 * pixels.
 *
 * ⭐ S-77 pins the LEFT edge of the Row Area to a day and S-78 pins the top of
 * it to a row, so a scroll is expressed by naming what stands at those two
 * edges afterwards -- and since CR-260, by how far INTO each of them the edge
 * stands (S-176 / S-177). ⛔ Those two fractions are what make 表 T-023d's
 * 「パンは等倍とすること（MUST）」 reachable at all: without them the smallest
 * movement that could be written was a whole row, so a pan either did nothing
 * or jumped further than the pointer went.
 * ⚠️ Neither fraction is a px count. FR-080 forbids holding a scroll position
 * in px (MUST NOT) because a zoom or a window width then makes the same number
 * point somewhere else, and a fraction of the anchor's OWN extent does not.
 *
 * ⚠️ The distances are measured against `context.layout`, which was built with
 * the position already in force applied, so passing zero on an axis answers
 * exactly the values that axis already holds. That is what lets MK-5 take the
 * vertical half from here unchanged.
 *
 * @purity pure
 */
/**
 * PD-1's write: the display position moved by this many pixels.
 *
 * ⭐ ONE PLACE FOR THE FOUR MEMBERS, because two roads reach them now -- the
 * move that follows the pointer and the release that finishes the gesture --
 * and R2.7 is about a second reading as much as a second call.
 *
 * ⭐ ALL FOUR COME FROM THE ONE READING, and that is what makes 等倍 exact.
 * S-176 and S-177 hold the part of a row and the part of a day the anchors
 * cannot name, so a movement of any distance -- shorter than a row, shorter
 * than a day -- is written as the distance it was.
 * ⛔ NO FLOOR IS TAKEN. `rowTurnedTo`'s one-row floor used to answer the
 * vertical half, and it made the picture jump a whole row for a drag of a few
 * px, which is the very thing 「倍率を掛けない」 forbids. ⚠️ MK-1 keeps it --
 * see `rowTurnedTo` for why the wheel and the hand are held to different rules.
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

function scrolledAnchor(context: InputContext, dx: number, dy: number): ScrollAnchor {
  const area = context.regions.rowArea
  return {
    ...dayAnchorAt(context, area.x + dx),
    ...rowAnchorAt(context, area.y + dy),
  }
}

/**
 * Where MK-1's turn leaves the row at the top edge. ⭐ THE WHEEL ONLY.
 *
 * ⛔ `scrolledAnchor` IS NOT THE WHOLE OF MK-1, and the difference is not an
 * error in its arithmetic: it answers the place the moved top edge LANDS IN,
 * which for a distance shorter than the row standing there is a place inside
 * that same row. Measured on the template FR-027 starts a reader with, most of
 * the bands drawn are TALLER than the distance a common wheel reports for one
 * detent, so before CR-260 turn after turn moved nothing at all and MK-1's
 * 「**縦スクロール**」 did not scroll.
 *
 * ⚠️ WHY THE FLOOR STAYS HERE AND WAS TAKEN OFF PD-1. The two are held to
 * different rules. 表 T-023d states 「パンは等倍とすること（MUST）」 of the pan
 * and of nothing else, so PD-1 must move the picture exactly as far as the
 * pointer went -- which S-176 and S-177 now let it write, so the floor there
 * was a defect the moment those two rows existed. MK-1 carries no such MUST:
 * table T-023 gives it 「縦スクロール（ズームではない）」 and no distance at
 * all, and a wheel is a detent rather than a hand.
 * ⛔ BUT THE FLOOR IS NO LONGER FORCED, AND SAYING OTHERWISE WOULD BE FALSE.
 * PD-176 was decided on the ground that ZERO is the one answer 「縦スクロール」
 * rules out and one row was the smallest movement S-78 could express. ⚠️ The
 * second half of that ground is now gone: S-176 can express any part of a row,
 * so scrolling the wheel by the distance the device reported is open too, and
 * the user's ruling behind CR-260 -- 「飛び飛びだと UI 上気持ち悪くて『ぬるサク』
 * を達成できない」 -- speaks against a detent as much as against a jump. The
 * floor is kept because it is what the record holds and no row forbids it;
 * ⛔ it is a choice awaiting adjudication, not a forced answer.
 * Searched: table T-023 MK-1, MK-5 and MK-7, table T-023a and its note and
 * PD-1, the paragraph under table T-023d, S-4, S-12, S-77, S-78, S-96, S-176,
 * S-177, FR-016, FR-051, FR-017, FR-080, OP-10 and OP-10a of table T-024a.
 * ⚠️ This invents no rows-per-notch and no rows-per-pixel figure -- it is a
 * floor under a distance that still comes from the device, and every turn long
 * enough to reach a further row still reaches it.
 *
 * @provisional PD-176
 * @provisional PD-177
 *
 * ⚠️ THE TWO ENDS ARE NOT ALIKE, and the difference is what each one can be
 * known to mean. Above the first row there is provably nothing -- S-78 anchors
 * the edge to a row and the first one is the top of the stack -- so a movement
 * that runs off that end is answered by the first row, without which the top of a
 * schedule cannot be reached again at all. Past the LAST row, whether there is
 * anywhere left to go depends on how much of the stack the Row Area already
 * shows, which no row settles; so that end keeps the value in force, which is
 * what this file already did.
 *
 * @purity pure
 */
function rowTurnedTo(context: InputContext, dy: number): string | null {
  const settings = context.document.documentSettings
  const rows = context.layout.rows
  const area = context.regions.rowArea
  const standing = rowIndexAtTopEdge(rows, area.y)
  if (dy === 0 || standing === null) return settings.scrollGroupId
  const landed = rowIndexAtTopEdge(rows, area.y + dy)
  // Ran off the top: the first row is the whole of what was asked for.
  if (landed === null) return dy < 0 ? (rows[0]?.groupId ?? null) : settings.scrollGroupId
  // ⚠️ `rows[0]` above cannot be missing -- an empty stack left through the
  // guard -- and the `null` is the type's, not a case.
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
 * ⛔ NOT SETTLED BY THE SPECIFICATION. Table T-023 scopes the PRESS order to
 * 「日程の描画領域」 (the note under table T-023a) and scopes MK-1 to MK-5 to
 * nothing at all. The recommendation is the whole `Schedule Canvas` (U-32): the
 * ruler, the Row Title Panel and the Row Area all scroll together (SC-1 to
 * SC-4), so a wheel over any of them is asking the same thing, while the `App
 * Header` is not part of the schedule.
 * Searched: table T-023, table T-023a and its 面 table, FR-016, FR-051, table
 * T-103.
 *
 * @provisional PD-12
 * @purity pure
 */
function isWheelHere(context: InputContext, x: number, y: number): boolean {
  // table T-023's closing rule (MUST): 「面が立っているあいだ、ホイールの割当を当てず、
  // ブラウザの既定動作へ渡すこと」 (the user's ruling of 2026-08-29).
  //
  // ⛔⛔ WHY IT IS HERE AND NOT IN `regionAtPointer`. That function answers for
  // the parts `ScreenRegions` (PI-35) holds a rectangle for, and a surface
  // floating over the drawing area is not one of them -- so a point on a
  // `Confirmation` came back as `rowArea` and the wheel was stopped on it.
  // ⚠️ Measured 2026-08-29 in the shipped page: deleting a row whose names run
  // to 9,341 characters gives the question a box 6,986px tall in a window
  // 928px high, and forty wheel notches over it left `scrollTop` at 0.
  // ⛔ `MK-10` NEVER REACHED THIS. Its subject is 「本ツールが割り当てた修飾キー
  // の付いた入力」 in both halves, and a bare wheel carries no modifier -- the
  // stopping was this function's answer, not that row's.
  if (context.isSurfaceStanding) return false
  const region = regionAtPointer(context.regions, x, y)
  return region !== null && region !== 'appHeader'
}

// ------------------------------------------------------------ selection ----

/**
 * The same thing, named the way a selection names it.
 *
 * ⛔ THE TWO COMPONENTS DO NOT AGREE, and neither of them may be edited from
 * here. `Item` (PI-7) names a dependency by its two endpoints, because that is
 * what the geometry drew; `ItemRef` (PI-32) names it by its successor and its
 * ordinal, because table T-053 nests a dependency under the successor. So the
 * ordinal is looked up, and a dependency the successor does not carry has no
 * name in a selection -- it answers null rather than being given a made-up one.
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
 * ⚠️ Built from the geometry rather than from the document, because only what
 * was drawn can be selected -- the same rule table T-023a states for hit
 * testing, and the reason `itemsInMarquee` reads the geometry too.
 * ⚠️ The status line IS included here though `itemsInMarquee` leaves it out.
 * SL-1's exclusion names SL-3 and SL-7 and no other row, and the reason it
 * gives -- a marquee dragging the status date about -- does not apply to a key
 * that asks for everything.
 * ⚠️ A comment box the geometry dropped -- its row collapsed or hidden, or its
 * anchor naming neither -- is absent for the same reason a Task the zoom did
 * not draw is: only what was drawn can be taken.
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
 * The rectangle a press and a release span, in either order.
 *
 * ⭐ Normalised so that dragging up-left encloses the same things as dragging
 * down-right: SL-3 speaks of 「矩形に完全に囲まれた対象」 and says nothing
 * about which corner came first.
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

// ⭐ `PressRow` itself is declared with `PointerPress` at the head of this file,
// because the press now CARRIES the answer (see decision 5 of the overview).

/**
 * Which row of table T-023a decides this press.
 *
 * ⛔ Evaluated from the top and settled by the first row that holds (MUST). The
 * order is the table's own and is not rearranged: 「第 1 の分岐は「当たったか」
 * であり、「構えているか」は当たらなかったときにだけ効く」.
 *
 * ⭐ PUBLISHED SO THE PRESS CAN CARRY THE ANSWER -- not so the row can be asked
 * for later. `PointerPress.pressRow` is filled with what this returns at the
 * moment the press is recorded, the way `itemAtPointer` (PI-7) fills `hit`.
 * Asking again at the write would be a second moment, and CS-2 of table T-066
 * wants the moment of the press; reading table T-023a on the other side would
 * be the duplication R2.7 refuses.
 *
 * ⚠️ IT TAKES LESS THAN A WHOLE PRESS AND LESS THAN A WHOLE CONTEXT, ON PURPOSE.
 * The row is one of the press's own members, so no whole `PointerPress` can
 * exist until this has answered -- and the caller records the press before it
 * builds the context that would hold it. What the decision reads is only the
 * button and the modifiers of the `down`, the hit the caller resolved, and the
 * two current values PD-2 and PD-4 / PD-4a turn on.
 *
 * @purity pure
 */
export function pressRowOf(
  press: Pick<PointerPress, 'at' | 'hit'>,
  context: Pick<InputContext, 'screenState' | 'dualCursorFollowing'>,
): PressRow {
  const modifiers = press.at.modifiers
  // PD-1: the middle button, or a left drag with Ctrl and nothing else. Beats
  // both the arming and the hit, whatever lies under the pointer.
  if (press.at.button === 'middle') return 'PD-1'
  if (press.at.button === 'left' && isCombo(modifiers, true, false, false)) return 'PD-1'
  if (context.dualCursorFollowing !== null) return 'PD-2'
  if (press.hit !== null) return 'PD-3'
  const armed = context.screenState.armed
  if (armed.kind === 'dependency') return 'PD-4a'
  if (armed.kind !== 'none') return 'PD-4'
  return 'PD-5'
}

// --------------------------------------------------------------- shapes ----

/**
 * The five spellings table T-012 gives a shape, as a census the compiler keeps.
 *
 * ⭐ `Record<TaskShapeKind, true>` is the device `edit-document.ts` uses on the
 * 71 rows of table T-108: the spellings are written once, and a spelling that
 * the generated column no longer admits -- or one it admits that is missing
 * here -- is a compile error naming the word. ⛔ It is here at all because
 * `ScreenState.armed` carries the armed shape as a bare string while
 * `createTask` demands the generated union, and neither of those two files may
 * be edited from this one.
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
 * The eight spellings table T-012's SH-5 gives a milestone's figure, kept the
 * same way and for the same reason as the five above.
 *
 * ⚠️ The ORDER matters and is SH-5's own: S-48 fixes it as the order of their
 * areas, and table T-109 places IC-27 .. IC-34 in it.
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
  // ⭐ The seven SH-5 gained on 2026-08-29. ⚠️ They are NOT in area order and
  // FR-078 now says so: the first eight are, and these seven follow the order
  // the user named them in.
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

// --------------------------------------------------------------- entries ----
//
// ⭐ THE ROWS OF TABLE T-109 THIS FILE ANSWERS FOR, by the row id that is the
// only join that table admits (it has no English column, and says why). This is
// the same move the keyboard already makes: `KEY` spells table T-036's
// assignment column and the rows below are matched one by one.
//
// ⛔ NOT A ROSTER, and not a count. Table T-109 counts itself (FR-029 forbids
// the requirement to state the number) and the rest of its rows are absent here
// on purpose -- the STOP note at the foot of this file says what each of them is
// missing, and holds the ONE count, because a number written twice is a number
// that goes stale in one of the two places (it had, by eight).
// ⚠️ `screen-renderer.ts` reads the generated `icon-roster.json`;
// this component has no edge to that file and must not grow one, so what
// crosses is the row id alone.

/** The entries this file assigns, spelled as table T-109 spells its row ids. */
const ENTRY = {
  /** IC-1 -- FR-087 (OP-2 of table T-024a). Same operation as SK-10. */
  openDocument: 'IC-1',
  /**
   * IC-2 -- FR-096, which SK-12 begins with the choice of a format.
   *
   * ⚠️ IT WAS FR-060's SILENT OVERWRITE until CR-280 / CR-281 (the user's
   * ruling, 2026-08-29). That road is still there and is now the key's
   * alone: SK-11 writes `GRS JSON` to the opened file without asking, which
   * is what DI-5 of table T-227 exempts.
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
   * IC-8 / IC-9 -- the plan half and the actual half of S-59.
   *
   * ⛔ TWO ENTRIES OVER THREE VALUES, WHICH IS NOT TWO BOOLEANS. FR-049 (MUST)
   * makes the plan/actual display a three-valued enumeration and (MUST NOT)
   * refuses the fourth combination -- both hidden. `planActualDisplayFrom`
   * answers what each press moves to, including the press that asks for the
   * refused one.
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
   * IC-16 -- S-72, the light/dark theme FR-039 lets the reader choose.
   *
   * ⭐ ONE ENTRANCE OVER TWO VALUES, so a press moves to the other one. S-72
   * holds exactly two, and FR-029 (MUST NOT) forbids a second entrance for the
   * same function -- so an entry per value, the shape IC-46 .. IC-49 have, is
   * not open here.
   */
  themePreference: 'IC-16',
  /**
   * IC-17 -- FR-072, the settings entrance that requirement names beside the
   * selection.
   *
   * ⚠️ NOT AN OPEN-AND-CLOSE. Table T-109 words it 「文書の描画設定をプロパティ
   * パネルに出す」 and FR-072 has a second press on the SAME entrance go back to
   * the last chosen subject, not shut the panel -- so what moves is which of the
   * two the panel is showing.
   */
  documentSettingsProperties: 'IC-17',
  /**
   * IC-20 -- FR-065, S-99b.
   *
   * ⭐ ONE ENTRANCE FOR BOTH DIRECTIONS, which is that row's own wording
   * 「有効にする・無効にする」 and what FR-029 (MUST NOT) leaves as the only shape.
   */
  agentApi: 'IC-20',
  /** IC-19 -- FR-068. U-30 `AI Export Modal` of table T-103. */
  aiExportModal: 'IC-19',
  /** IC-22 -- FR-036. SK-13. */
  help: 'IC-22',
  /**
   * IC-39 / IC-40 / IC-42 / IC-43 / IC-79 / IC-80 / IC-81 -- the seven toggles
   * the palette carries. S-64, S-63, S-67, S-68, S-60, S-61 and S-62, all of
   * them boolean rows of table T-202.
   *
   * ⭐ THE LAST THREE ARRIVED WITH THE RULING OF 2026-08-30 (CR-294). Until
   * then table T-109 placed no entrance on them at all, so FR-049's 「それぞれ
   * 切り替えられるようにすること」 was unmet for three of the eight -- and the
   * assignee and percent labels, whose defaults are both `false`, could not be
   * reached from the shipped build by any means.
   */
  progressLineVisible: 'IC-39',
  progressMarkerVisible: 'IC-40',
  dateGridLinesVisible: 'IC-42',
  groupGridLinesVisible: 'IC-43',
  assigneeVisible: 'IC-79',
  percentCompleteVisible: 'IC-80',
  dependencyVisible: 'IC-81',
  /** IC-44 -- FR-046. SK-20. */
  statusLine: 'IC-44',
  /**
   * IC-45 -- the Dual Cursor's own entrance (S-65), and BOTH ways through
   * table T-029a's mode: DC-1 enters it and DC-4 words the way out as
   * 「同じ入口の再押下」, so one entry answers for both and FR-029 (MUST NOT) is
   * not brushed.
   *
   * ⛔ NOT THE WAY THE TWO LINES ARE CLEARED. DC-7 (MUST) puts that on an
   * entrance OF ITS OWN and (MUST NOT) forbids leaving the mode from doing it
   * -- see the STOP at the foot of this file for what table T-109 still owes.
   */
  dualCursor: 'IC-45',
  /**
   * IC-46 .. IC-49 -- one entry for each value of S-66.
   *
   * ⭐ NOT A TOGGLE AND NOT A CYCLE. CU-3 of table T-029 calls the guide cursor
   * 4 モード排他 and requires (MUST) that the reader choose among them, and
   * table T-109 draws an entry per value -- so a press names its value outright
   * and what the value was before does not enter into it.
   */
  guideCursorNone: 'IC-46',
  guideCursorCrosshair: 'IC-47',
  guideCursorSingleVertical: 'IC-48',
  guideCursorDoubleVertical: 'IC-49',
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
   * IC-76 -- FR-102's record of the happenings and the frames, started and
   * stopped by one entrance. The state is `S-206` of table T-206 and the cap
   * on what it holds is `S-207`; the shell holds both.
   *
   * ⭐ AN ORDINARY PALETTE ENTRANCE, unlike the row above: table T-109 gives
   * it the 表示 group, so `command-palette.ts` prints it among the entries
   * rather than on the grab band.
   */
  interactionRecord: 'IC-76',
  /** IC-52 -- the first level of IN-4 (table T-028). */
  closeSurface: 'IC-52',
  /**
   * IC-53 -- GR-19 of table T-023d, the band FR-053's drag is taken on.
   *
   * ⚠️ THE ONE ROW HERE THAT IS NOT A BUTTON. Table T-109 says so in its
   * own entry column, and `command-palette.ts` keeps it out of what it
   * publishes as entries for that reason. It is in this map because a press
   * still LANDS on it -- what it is assigned to is a drag, not a press.
   */
  paletteGrabBand: 'IC-53',
  /**
   * IC-58 / IC-59 -- the two halves of U-47 `Row Expander`, spelled from the
   * name table T-103 settles for it.
   *
   * ⛔ TWO CONTROLS, NOT ONE CONTROL IN TWO STATES. HF-1 of table T-051 puts one
   * of each on every row, and the two are not inverses: HF-2 opens everything
   * BELOW the row (HR-3 of table T-015) while HF-3 folds the row ITSELF (HR-5).
   * Reading them as one toggle would lose that difference, and the difference is
   * the whole of how a folded row is reopened -- HF-3 says so: the open control
   * of the row one above is what opens it.
   * ⚠️ THE TWO USED TO MEAN THE OTHER THING, and this is not a re-reading: HF-2
   * records that it once opened one level and HF-3 that it once closed the
   * subtree, and both rows carry the ruling that changed them (2026-08-25),
   * because the pair left no way to reopen what had been folded.
   */
  rowExpanderOpen: 'IC-58',
  rowExpanderClose: 'IC-59',
  /**
   * IC-77 -- HF-11 of table T-051, which is HR-4 of table T-015: everything
   * BELOW the row folds, and the row itself does not.
   *
   * ⭐ THE THIRD HALF OF U-47, added by the ruling of 2026-08-30. HF-1 counts
   * three controls per row now, and this is the one HF-2 is the inverse of --
   * HF-3 folds the row ITSELF and reaches nothing under it.
   * ⛔ NOT WIDENED TO INCLUDE THE ROW. HF-11 (MUST NOT) forbids it in as many
   * words, and the reason is FR-029's: HF-3 already has that operation, so a
   * control doing both would be the second entrance to one of them.
   */
  rowExpanderCloseBelow: 'IC-77',
  /**
   * IC-74 -- HF-10 of table T-051, which is HR-1 of table T-015: every row in
   * the document opens.
   *
   * ⛔ NOT ONE OF THE THREE DRAWN PER ROW, although it sits on the same panel.
   * HF-10 (MUST) puts ONE of it at the top of the `Row Title Panel`, so no row
   * of the panel is its subject and `ScreenPart.rowGroupId` is null under it --
   * which is why it is answered beside `commandFromRowEntry` and not inside it.
   * ⭐ IT IS WHAT SAVES A TOP-LEVEL ROW: HF-3 lets such a row fold itself, and
   * HF-3's own note records that there is then no row above to open it.
   */
  rowExpanderOpenAll: 'IC-74',
  /**
   * IC-78 -- HF-12 of table T-051, which is HR-2 of table T-015: every row in
   * the document folds.
   *
   * ⭐ HF-12 PLACES IT BESIDE IC-74 and takes that row's placement, so what is
   * said of `rowExpanderOpenAll` above holds of this one word for word: no row
   * of the panel is its subject, and `ScreenPart.rowGroupId` is null under it.
   * ⛔ IT IS NOT HF-8. That row DISCARDS the folds a person made, as part of
   * the whole-view; this one makes them.
   */
  rowExpanderCloseAll: 'IC-78',
  /**
   * IC-60 -- FR-098. U-48 `Row Pin` of table T-103.
   *
   * ⭐ ONE ENTRANCE FOR BOTH DIRECTIONS. FR-098 (MUST) has this same control
   * take the pin off again and gives the reason -- one per row is settled, so a
   * second entrance for the undoing would be the duplication FR-029 refuses.
   */
  rowPin: 'IC-60',
  /**
   * IC-82 -- FR-032's deletion of a row, drawn once per row like the three
   * above and the pin.
   *
   * ⭐ ONE ROW GOES, AND IT IS THE ROW THE CONTROL WAS DRAWN ON. FR-085 (MUST)
   * has rows chosen in the panel and names FR-032 among the requirements that
   * read that set, but nothing STORES it (PD-142) and no row settles what a
   * press on one row means while another row is chosen -- so this entrance
   * names its own row, which is the shape IC-60 already takes.
   * ⛔ NO CHAIN IS WORKED OUT HERE. CD-2 of table T-050 holds what goes with a
   * row and `deleteTaskGroup` (CM-27) carries it out; a second reading of that
   * chain on this side would be the same rule in two places (R2.7).
   * ⛔ AND NO QUESTION IS BUILT HERE EITHER. FR-032 (MUST) asks before a row is
   * deleted and table T-234's QN-1 is the sentence; `frame-loop.ts` raises it
   * off the very command this returns, so this side owes only the command.
   */
  rowDelete: 'IC-82',
  /** IC-62 -- FR-099. U-49 `Resource Roster` of table T-103. */
  resourceRoster: 'IC-62',
  /**
   * IC-63 / IC-64 / IC-65 -- the three entrances table T-109 draws ONCE in the
   * roster's header, each of which REPLACES who is chosen there.
   *
   * ⭐ THE NAMES ARE THE TABLE'S SENSE AND NOT ITS WORDS. IC-63 is 「一覧のすべて
   * を選ぶ」 and IC-64 「一覧の選択をすべて解く」, which FR-099 (MUST) requires the
   * choosing surface to carry. ⛔ IC-65 SELECTS and does not delete, although
   * table T-109 names CM-43 beside it: FR-099's ⭐ paragraph settles that
   * 「まとめて消す」 is done in TWO moves -- choose them all, then delete what is
   * chosen -- so that the deleting entrance is exactly one (FR-029).
   */
  rosterChooseAll: 'IC-63',
  rosterClearChosen: 'IC-64',
  rosterChooseUnreferenced: 'IC-65',
  /**
   * IC-67 / IC-68 -- the entrance FR-099 draws against ONE person, in the two
   * states table T-109 gives it: IC-67 says this person is chosen and lets go by
   * the same entrance, IC-68 says this person is not and takes them by it.
   *
   * ⭐ ONE CONTROL IN TWO STATES, which is the opposite of what IC-58 / IC-59
   * are, and the table says so itself in both rows -- 「同じ入口で解く」 and
   * 「同じ入口で選ぶ」. So a press on either means the same thing: turn this
   * person's membership round.
   * ⚠️ WHICH WAY ROUND IS NOT READ OFF THE DRAWN ENTRY, for the reason
   * `commandFromRowEntry` gives at the pin -- a drawn screen is as old as the
   * last paint and FR-048 lets a paint be skipped. The set itself is
   * `ScreenSession.selectedResourceUids`, which the shell holds, so the shell is
   * the side that can answer which way this press goes.
   */
  rosterChosen: 'IC-67',
  rosterUnchosen: 'IC-68',
} as const

// ⭐ IC-53's ROAD IS COMPLETE, AND IT RUNS THROUGH THREE UNITS. A STOP note
// stood here while it did not, naming what each side owed; all of it has since
// been written, so what is left is the map:
//
//   1. `dom-screen-surface.ts` (PI-38) lays the band across the palette's TOP
//      EDGE and marks it with `data-icon`, so `readScreenPartAt` (IF-9)
//      answers `{ part: 'Command Palette', entry: 'IC-53' }` for a point on it
//      and the assignment above is reached. ⭐ IT IS THE ONLY UNIT THAT CAN:
//      the band is as wide as the palette, and FR-053 (MUST) makes the size
//      follow the contents while (MUST NOT) forbidding any table to hold one,
//      so the side that laid the entries out is the only side that knows the
//      width -- the rule Chapter 5.3 states under table T-065.
//   2. The band's HEIGHT is `S-135a` of table T-206, and it reaches `src/` as
//      a generated `NOT_STORED_` block in `command-palette.ts` rather than as
//      a number typed anywhere (rule 03 section 1).
//   3. `frame-loop.ts` records the press, fills `PointerPress.followedTo` so
//      that `paletteFollow` below reports FR-053's following, holds
//      `ScreenSession.commandPaletteAt` and moves it by each travel.
//   4. That same file keeps the corner the drag BEGAN at, because FR-053 names
//      IN-1 of table T-028 in the same breath and owes the original corner
//      back on an interruption -- `Esc`, or IN-1a's lost pointer.
//
// ⚠️ THE BAND MUST STAY LAID OVER WHAT IT COVERS. GR-19 stands first in table
// T-023d and that table's preamble makes the first row win (MUST), and
// `press.on` is the drawing side's own answer -- so the priority is kept by
// what is DRAWN over what, and nothing here enforces it.
// Searched: FR-053, table T-028 (IN-1 / IN-1a / IN-4), table T-023d GR-19,
// table T-109, table T-203, table T-206.

/**
 * The entries that flip ONE boolean row of table T-202, and which row each one
 * flips.
 *
 * ⭐ THE SET IS FR-049's, NARROWED TWICE. FR-049 (MUST) limits the toggles to
 * the rows of table T-202 whose type is boolean and (MUST NOT) forbids
 * treating every row of that table as one; `VisibleElement` is what those rows are called, and
 * table T-109 draws an entrance for only some of them. ⛔ NO COUNT IS WRITTEN
 * HERE: FR-049 states none, table T-202 has grown a boolean row since this note
 * first named a number, and the number went stale in the same breath.
 * The rows with no entrance are left alone rather than given one, the way
 * `commandFromRowEntry` leaves table T-015's entrance-less operations alone.
 *
 * ⚠️ ONE ROW OF TABLE T-109 IS MISSING FROM THIS MAP AND IS NOT AN OVERSIGHT:
 * IC-41 draws an entrance for `watermarkVisible`, and the STOP note at the foot
 * of this file says what stands between the press and the write.
 *
 * ⚠️ IC-4 IS ON THE HEADER AND THE REST ON THE PALETTE, which is why they are
 * one map and not two: what a press does is the same rule for all of them, and
 * the surface an entry is drawn on is table T-109's business rather than this
 * file's.
 */
/**
 * What FR-049's toggles name, taken off the command rather than imported.
 *
 * ⛔ IT WAS IMPORTED, AND CHECK 26b REFUSED IT. `VisibleElement` is published by
 * `EditDocument`, and table T-064 -- which calls itself the full count of what
 * may be reached across a component folder -- does not name it. Naming it there
 * would widen LR-2's fence by one for a type this file never needs by NAME: it
 * only ever names the `element` member of one `DocumentCommand` variant, and
 * that command already crosses as `PI-8`.
 *
 * ⭐ So it is derived, the way `GuideCursorMode` and `PlanActualDisplay` below
 * are. Deriving cannot drift: rename or re-spell a member over in
 * `edit-document-settings.ts` and this stops compiling.
 */
type VisibleElement = Extract<DocumentCommand, { kind: 'setElementVisible' }>['element']

const VISIBLE_ELEMENT_BY_ENTRY: Readonly<Record<string, VisibleElement>> = {
  'IC-4': 'baselineVisible',
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

/** The four values S-66 admits, taken from the command rather than restated. */
type GuideCursorMode = Extract<DocumentCommand, { kind: 'setGuideCursorMode' }>['mode']

/**
 * The value each of IC-46 .. IC-49 puts into S-66.
 *
 * ⭐ THE SPELLINGS ARE COPIED, THE SET IS NOT INVENTED. Table T-109 prints the
 * four values verbatim in these four rows and S-66 holds the same four, so
 * this is the join between a row id and a value both documents already spell
 * (rule 03 section 1). The type above is the compiler's check that no fifth
 * spelling can be written here.
 */
const GUIDE_CURSOR_MODE_BY_ENTRY: Readonly<Record<string, GuideCursorMode>> = {
  'IC-46': 'none',
  'IC-47': 'crosshair',
  'IC-48': 'single-vertical',
  'IC-49': 'double-vertical',
}

/** @purity pure */
function guideCursorModeOfEntry(entry: string): GuideCursorMode | null {
  return Object.prototype.hasOwnProperty.call(GUIDE_CURSOR_MODE_BY_ENTRY, entry)
    ? (GUIDE_CURSOR_MODE_BY_ENTRY[entry] as GuideCursorMode)
    : null
}

/** The three values S-59 admits, taken from the command rather than restated. */
type PlanActualDisplay = Extract<DocumentCommand, { kind: 'setPlanActualDisplay' }>['display']

/**
 * What S-59 becomes when the plan half (IC-8) or the actual half (IC-9) is
 * pressed, or `null` when the press asks for the state FR-049 refuses.
 *
 * ⭐ TWO ENTRANCES OVER THREE VALUES. Each entry is worded 「出す・しまう」, so a
 * press flips the half it names and leaves the other half as it stands -- which
 * is a full pair of booleans everywhere except one corner: hiding the only half
 * still showing would leave neither, and FR-049 states (MUST NOT) that both
 * MUST NOT be hidden. That corner is the whole reason S-59 is an enumeration of
 * three rather than two independent toggles, and it is why this answers `null`
 * rather than a value: there is no value to move to.
 *
 * ⛔ THE REFUSED PRESS DOES NOT FALL THROUGH TO THE OTHER HALF. Reading 「予定
 * をしまう」 from `'plan-only'` as `'actual-only'` would obey the letter and
 * show the actual, which is not what was asked for -- and FR-049's reason for
 * the rule is that a screen with no bars looks broken, not that some bar must
 * be swapped in.
 * ⚠️ NOTHING IS SAID TO THE PERSON HERE. Table T-037 places no notice on this
 * refusal, and this file may not mint one.
 *
 * @purity pure
 */
function planActualDisplayFrom(
  display: PlanActualDisplay,
  isPlanHalf: boolean,
): PlanActualDisplay | null {
  const isShownNow = display === 'both' || display === (isPlanHalf ? 'plan-only' : 'actual-only')
  if (!isShownNow) return 'both'
  // The half pressed is showing, so the press hides it and the other half is
  // what is left -- unless the other half is not showing either.
  if (display !== 'both') return null
  return isPlanHalf ? 'actual-only' : 'plan-only'
}

/**
 * The palette entries that arm, and what each one arms -- table T-023b through
 * table T-109's `Command Palette` rows.
 *
 * ⭐ THE SPELLINGS ARE NOT INVENTED HERE. The four task shapes are
 * `TaskShapeKind`'s, which the generator writes from table T-012's SH-1 .. SH-4;
 * the eight glyphs are `TaskMilestoneGlyph`'s, in the order SH-5 prints them,
 * which is the order table T-109 places IC-27 .. IC-34 in and the order S-48
 * fixes as the order of their areas.
 * ⚠️ `Armed` types both as bare strings (`screen-state.ts` says the
 * specification has not settled them as names), so nothing here is checked by
 * the compiler against those unions -- which is why the two orders are stated
 * above and are the thing to re-read if a row moves.
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
  // ⭐ The seven SH-5 gained on 2026-08-29. ⛔ WITHOUT THESE THE ENTRIES ARE
  // DRAWN AND INERT: the roster carries their `armsShape`, the figure carries
  // their glyph and the enum admits their spelling, and a press on one of them
  // still armed nothing -- measured in the shipped page, where setting IC-88 on
  // a selected milestone left a ◇ while IC-32 turned it into a ☆.
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
 * ⚠️ The shape and the glyph are compared as well as the kind: SP-4 says 「構え
 * ている入口を再び押した」, and IC-30 and IC-31 are different ENTRIES although
 * both are `milestoneShape`. Comparing the kind alone would let a press on the
 * square disarm the diamond.
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
 * a press before either of them is read, and its own note limits that decision
 * order to the schedule's drawing area.
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
// ⭐ WHAT THIS MEMBER IS FOR. Table T-064 gives PI-18 a member that turns a
// value settled in the `Properties Panel` into a row of table T-108, and IF-9
// is the seam it arrives over. FR-006 (with the paragraph under table T-016)
// makes every item but the read-only one editable, FR-042 adds a picked row's
// colour and height, and FR-009 adds the dependency line's lag.
//
// ⭐ ONE COMMAND, ONE UNDO STEP. FR-031 (MUST) makes one document-changing
// operation one step of the undo history and UN-3 of table T-027 names the
// change of a Task property as one -- so the answer is a LIST that the caller
// writes as one bundle, exactly as `PlanInput.commands` carries a drag's
// several rows. ⛔ An empty list is what "this settled value changes nothing"
// looks like, and it must not be written: an empty write is still a write, and
// WS-4 would push a step for an edit nobody made.
//
// ⛔ NO SUBJECT IS WORKED OUT HERE. `FieldCommit.key` says which column of
// which thing the panel drew the control for, because the panel had already
// applied FR-072's and table T-023c's rule about which of several picked things
// it describes -- reading that rule again on this side would be the same
// arithmetic in two places (rule 03 section 4), and the two readings would
// disagree the moment a selection changed between the frame that drew the field
// and the frame that collects the commit.

/**
 * What a settled text means for a column that may be empty.
 *
 * ⚠️ THE EMPTY STRING IS `null` AND NOT A REFUSAL. Every column table T-016
 * offers is nullable in `_source/grs-document.schema.json`, and FR-007 turns on
 * the difference between a value a person chose and one that was never set --
 * so clearing a field is how a person says the second, and it has to reach the
 * document.
 *
 * @purity pure
 */
function settledText(text: string): string | null {
  const trimmed = text.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * The same for a column that holds a number.
 *
 * ⛔ `undefined` IS A REFUSAL AND `null` IS AN EMPTY COLUMN, and the two are
 * held apart on purpose: a host that hands back something that is not a number
 * has not been settled on anything, and writing 0 in its place would put a
 * value in the document that nobody typed. ⚠️ The bounds are NOT checked here:
 * `_source/grs-document.schema.json` states them, the controls carry them
 * (`PropertyControl.min` / `max`), and the write path judges them -- a third
 * reading would be a third place the same rule lives.
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
 * The same for a date column, in the spelling the document keeps.
 *
 * ⭐ FR-054 (MUST) takes the lexical date part and converts no zone, and
 * `dayOf` / `textOfDay` are the one place that reading and that writing live --
 * so a day the host handed back as `YYYY-MM-DD` leaves here spelled the way
 * every other date the tool decided is (EX-7 of table T-033).
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

/** One drawn column whose values are an enumeration. */
type VisualColumn = keyof Schedule['taskVisuals'][number]

// ⭐ DERIVED FROM THE COLUMN AND NOT IMPORTED UNDER A NAME OF ITS OWN, the way
// `PlacedPlanActual` below is: table T-064 is the whole count of what may cross
// a component folder, and neither of these two is on it.
type TaskLineWeight = NonNullable<Schedule['taskVisuals'][number]['lineWeight']>
type TaskNameAlign = NonNullable<Schedule['taskVisuals'][number]['nameAlign']>

/**
 * Whether a settled word is one of the values a drawn column admits.
 *
 * ⛔ THE ROSTER IS NOT WRITTEN OUT. `COLUMN_SHAPES` is the schema's own
 * enumeration generated into src/, and the paragraph under table T-016 (MUST
 * NOT) forbids the choices to be stated a second time -- so a value the
 * manuscript adds is admitted here without anyone editing a list. ⚠️ Where the
 * enumeration reaches a `DocumentCommand`, the cast is what says the two
 * rosters are the same one: both are generated from `erd.json`, and a value
 * that stopped being in the schema would stop compiling on the command's side.
 *
 * @purity pure
 */
function isVisualChoice(column: VisualColumn, value: string): boolean {
  return COLUMN_SHAPES.TaskVisual[column]?.choices?.includes(value) ?? false
}

/**
 * The five columns of table T-019, with the one a person just settled replaced.
 *
 * ⛔ NO STATE IS CHOSEN HERE EITHER, for the reason `actualEndPlacement` gives:
 * CM-13 places a WHOLE row of table T-019 while a field carries one column, so
 * the row is read off the columns as they will stand with `planActualState`
 * (table T-019a) and written back with the values table T-019 gives that row.
 * ⚠️ The join between the two tables is the STATE both of them print and not
 * their numbering.
 *
 * ⚠️ `null` WHERE THE ROW CANNOT BE WRITTEN. Four of the five rows of table
 * T-019 require `actualStart` AND `actualDuration`, so settling a resume date
 * on a task that has no actual yet names a row that cannot be filled; nothing
 * is written rather than a duration invented here.
 *
 * @purity pure
 */
function planActualWithColumn(task: Task, column: keyof Task, text: string): PlacedPlanActual | null {
  const next: Task = { ...task }
  // ⚠️ The one column a person settled is written by NAME, because a field
  // carries one column and CM-13 takes all five: spelling five arms instead
  // would repeat the classification below five times.
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
 * A value settled on a column of `Task` -- table T-016's rows that hold one.
 *
 * ⚠️ `PR-3` IS THE ONE ROW THAT NEEDS ITS SIBLING. CM-11 places the plan's two
 * dates together, so the column a person did NOT settle is carried from the
 * task as it stands -- which is also what keeps FR-006's 「片方だけが動く状態を
 * 作らない」.
 *
 * ⭐ EVERY ITEM OF TABLE T-016 THAT IS A COLUMN OF `Task` NOW HAS A ROW OF
 * TABLE T-108 TO BECOME. ⚠️ The milestone truth value was the last one that did
 * not, and CR-271 took its item off that table on the ground FR-029 states: an
 * entrance that writes nothing. The column itself stays (AT-30 of the ERD, for
 * the exchange partner), and nothing here writes it.
 * ⚠️ `PR-16` (the assignee) is not dispatched here at all: it is CM-40 / CM-44 /
 * CM-45, and `commandsFromAssignee` below is where it goes -- that item is not a
 * column of `Task`, so it is dispatched on its row id instead.
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
      // ⛔ CM-11 takes both dates and neither is nullable, so a cleared field
      // names no command: emptying one end of a plan is not a change table
      // T-108 has a row for.
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
 * A value settled on a column of `TaskVisual` -- FR-007's colours and weight,
 * FR-078's glyph and FR-002's name placement.
 *
 * ⛔ NO ARM FOR THE SHAPE, and its absence is the rule rather than a gap.
 * CR-271 took the shape item off table T-016 because FR-083 leaves the shape to
 * the palette, and FR-029's note names that as the reason the item has no
 * surface left that edits it as a value -- so a settled value can no longer
 * reach this function naming that column, and an arm for it here would be an
 * entrance no table opens.
 *
 * ⭐ CM-22 AND CM-23 ARE ONE ITEM WITH TWO ROWS. That pair places both colours
 * at once and resetting them to the theme is its own command, so a colour
 * cleared to nothing is CM-23 and a colour chosen is CM-22 with the OTHER
 * colour carried -- writing `null` through CM-22 would say "this one colour was
 * chosen to be nothing", which is not a state FR-007 has.
 *
 * ⚠️ A choice is passed through as the text the control held. The candidates
 * came from `COLUMN_SHAPES`, which is the schema's own enumeration, so a value
 * that is not one of them cannot have been chosen -- and the write path judges
 * it besides.
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
      // ⚠️ An unknown word is not the same as a cleared field: the first is a
      // value nobody could have chosen, the second is FR-078's 「置いた後も
      // 変えられる」 being undone.
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
 * A value settled on the row FR-042 (MUST) puts on this same panel.
 *
 * ⭐ CM-30 AND CM-31 ARE THE SAME PAIR CM-22 AND CM-23 ARE, for the same
 * reason: a row whose colour is cleared follows the theme again (AT-58), which
 * is its own command, and CM-30 takes a colour that is not nullable.
 *
 * @purity pure
 */
function commandFromGroupColumn(
  groupId: string,
  column: string,
  text: string,
): readonly DocumentCommand[] {
  switch (column) {
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
 * STOP -- ⛔ ONLY ONE OF THE THREE COLUMNS HAS A ROW OF TABLE T-108. FR-009
 * (MUST) has the panel show the kind, the lag and both ends, and CM-38 writes
 * the lag; the roster holds no command that changes `linkType` and none that
 * moves a dependency from one predecessor to another (CM-36 draws one and CM-37
 * deletes it). Looked in table T-108, FR-009, table T-058 (AT-45 / AT-46) and
 * table T-018. Nothing is written for the other two rather than a command
 * minted here.
 *
 * ⚠️ CM-38's lag is NOT nullable, and `edit-dependency.ts` records why: S-117
 * gives 0 the meaning 「間を空けない」, so a cleared field names no command.
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
 * The row of table T-016 the assignee stands on.
 *
 * ⭐ THE ONE ITEM DISPATCHED BY ROW ID RATHER THAN BY COLUMN, and it has to be:
 * PR-16's own cell says the item is not a column of `Task`, so no arm of
 * `PropertyFieldKey` can name it, while IF-9 (「その欄が名乗る行 ID とともに
 * 返し」) fixes the row id as what comes back beside the key.
 * `properties-panel.ts` records the same join where it draws the control.
 */
const ASSIGNEE_ROW = 'PR-16'

/**
 * AS-3's signal: 「`-` を確定した」 unassigns.
 *
 * ⚠️ A SPELLING THE SPECIFICATION FIXES, not a token minted here: AS-2 (MUST)
 * puts this one character where a name would stand, AS-3 (MUST) makes settling
 * it 解除, and AS-4 (MUST NOT) forbids a `Resource` ever to be made of it -- so
 * it can never collide with somebody's name.
 */
const UNASSIGN_TOKEN = '-'

/**
 * Every resource of the roster that carries one name, smallest uid first.
 *
 * ⭐ AS-8 (MUST) settles what a name means when several people carry it: the
 * smaller uid, and (MUST NOT) no merging. ⚠️ The roster is scanned rather than
 * indexed because this runs once for one settled value, not once a frame.
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
 * The `uid` a candidate of PR-16's chooser carries, where the settled value is
 * one the roster still holds.
 *
 * ⭐ AS-9 (MUST) IS WHY THIS EXISTS: 「プロパティパネルで `uid` を選んだ」
 * assigns to THAT `uid`, and the panel commits a candidate's value rather than
 * the word it showed (`PropertyControl.choiceValues`). ⚠️ A `uid` the roster no
 * longer holds answers `null` so that the settled value is read as a name
 * instead -- the document may have lost the person between the frame that drew
 * the chooser and the frame that collected the commit.
 *
 * ⚠️ ASKED BEFORE THE NAME IS, which is the order AS-9 forces: the chooser is
 * the only surface that settles this item, and everything it commits is a uid.
 * ⛔ It is asked of the ROSTER and not of the spelling alone, so a person whose
 * NAME is a row of digits is still reachable through AS-7 / AS-8 unless somebody
 * on the roster is numbered that.
 *
 * @purity pure
 */
function resourceUidOfChoice(schedule: Schedule, text: string): number | null {
  const uid = Number(text)
  if (!Number.isInteger(uid)) return null
  return schedule.resources.some((one) => one.uid === uid) ? uid : null
}

/**
 * AS-3's 解除, for the one assignment it can name.
 *
 * ⛔ SEVERAL ASSIGNEES ARE LEFT ALONE, AND THAT IS A GAP RATHER THAN A RULING.
 * AS-3 (MUST) unassigns 「その割当」-- one of them -- and the one-character
 * signal it travels by names no person, so a task carrying several says nothing
 * about WHICH. Looked in table T-225 (AS-3 / AS-5 / AS-6 / AS-9), FR-008 and
 * table T-016. Nothing is written where the task holds more than one, rather
 * than taking off a person the settler did not name.
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
 * A `uid` or a name settled on PR-16, as the rows of table T-108 that put it in
 * the document.
 *
 * ⭐ TWO SPELLINGS REACH HERE AND BOTH ARE THE SPECIFICATION'S. AS-9 (MUST)
 * has the chooser commit the `uid` of the person it named, while AS-7 / AS-8 /
 * AS-10 are all written about a NAME being received -- table T-225 keeps both
 * doors, and AS-10 names 「受け取った名前または `uid`」 in as many words. The
 * `uid` is asked first because the chooser is the only surface that settles this
 * item today and it commits nothing else.
 *
 * ⭐ WHAT EITHER MEANS IS 割り当てる AND NEVER 置き換える. AS-7 (MUST) makes a
 * `Resource` of a name the roster does not hold 「から割り当てること」, AS-10
 * (MUST) forbids only a SECOND assignment of somebody already on the task, and
 * 解除 has a row and a signal of its own (AS-3) -- so nothing here takes a
 * person off a task, and a task that already carries one keeps them.
 *
 * ⭐ AS-7 (MUST) ASKS FOR TWO COMMANDS IN ONE CALL AND THIS IS WHERE IT APPLIES:
 * 「別々に走らせると、担当者だけができて割当ができていない状態が履歴に残る」.
 * The answer is a LIST the caller writes as one bundle, AG-3 of table T-035
 * makes that bundle atomic, and FR-031 makes it one undo step -- which UN-15 of
 * table T-027 names for the assignee.
 * ⚠️ THE MADE RESOURCE'S UID IS THE ONE FR-008 (MUST) MAKES IT. That requirement
 * numbers a new `Resource` from `Project.uidHighWaterMark`, and the bundle runs
 * in order against the document each command leaves behind -- so the resource
 * CM-40 makes is the mark plus one, which is what CM-44 is then handed. ⛔ Not a
 * number invented here: it is read from the document the same way the write side
 * reads it.
 *
 * @purity pure
 */
function commandsFromAssignee(
  schedule: Schedule,
  taskUid: number,
  text: string,
): readonly DocumentCommand[] {
  const settled = settledText(text)
  // ⚠️ A cleared field is not 解除 here. AS-3 names ONE signal for that and it
  // is the `-`; an empty chooser is a person who settled on nobody, and FR-008
  // (MUST) keeps an assignment until somebody says to take it off.
  if (settled === null) return []
  if (settled === UNASSIGN_TOKEN) return commandsFromUnassign(schedule, taskUid)

  const held = resourceUidOfChoice(schedule, settled) ?? resourceUidOfName(schedule, settled)
  if (held !== null) {
    // AS-10 (MUST): a person already on this task adds nothing, whether they
    // were named by uid or by name. Writing it anyway would be refused by CM-44
    // on FR-008's ban and throw the whole bundle away.
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
      resourceUid: schedule.project.uidHighWaterMark + 1,
    },
  ]
}

/**
 * PI-18's fourth member: the value a person settled in one field of the
 * `Properties Panel`, as the rows of table T-108 that put it in the document.
 *
 * ⚠️ An empty answer is what a settled value that names no command looks like,
 * and every place that returns one says which row of which table is missing.
 *
 * @purity pure
 */
export function commandFromFieldCommit(
  commit: FieldCommit,
  context: InputContext,
): readonly DocumentCommand[] {
  const schedule = context.document.schedule
  const key = commit.key

  // ⭐ THE ROW IS READ BEFORE THE HOLDER, FOR THE ONE ITEM THAT IS NOT A COLUMN.
  // PR-16's cell of table T-016 says the assignee's substance is `Assignment`,
  // so the key can only carry WHOSE panel this is; the row id says WHAT.
  // ⚠️ The task the field was drawn for may have gone between the frame that
  // drew it and the frame that collects this, as it may for every other item.
  if (commit.row === ASSIGNEE_ROW && key.holder === 'task') {
    return taskByUid(schedule, key.uid) === null
      ? []
      : commandsFromAssignee(schedule, key.uid, commit.text)
  }

  switch (key.holder) {
    case 'task': {
      const task = taskByUid(schedule, key.uid)
      // ⚠️ The task the field was drawn for may have gone between the frame
      // that drew it and the frame that collects this. Nothing is written for a
      // subject the document no longer holds.
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
  }
}

/**
 * Table T-036, row by row, in that table's printed order.
 *
 * ⚠️ IN-5a is read FIRST and not folded into the rows, because it turns three
 * different rows off at once and puts two of them back into the browser's
 * hands. Written per row, the exception would be three chances to forget it.
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
    // IN-5a: while the characters are being typed, a single-character key and
    // `Delete` / `Backspace` MUST NOT act, because SK-3 and 「1 文字消す」 are
    // the same key. ⭐ They are not merely ignored -- they are left to the
    // browser, which is what puts the character in and takes it out.
    if (plain && isSingleCharacterKey(key)) return UNASSIGNED
    if (plain && (key === KEY.del || key === KEY.backspace)) return UNASSIGNED
    // ⛔ The one exception table T-023's MK-10 names: `Ctrl+C` / `Ctrl+V` go to
    // the browser now (MUST), or the text being typed can be neither copied
    // nor pasted.
    if (ctrl && (key === KEY.c || key === KEY.v)) return UNASSIGNED
    // ⚠️ `Esc` is NOT let through here, and does not cancel the typing either:
    // IN-4's levels are the open surface, the gesture, the arming and the Dual
    // Cursor, and an in-place edit is none of them. `escapeTarget` owns that
    // order and this file does not add a level to it.
  }

  // SK-19 -- settles the in-place edit, so it is assigned only while one is
  // open. With nothing being typed, `Enter` is this tool's to leave alone.
  if (plain && key === KEY.enter) {
    return context.isTextEntryUnsettled ? acted({ kind: 'settleTextEntry' }) : UNASSIGNED
  }

  // SK-8 -- the rule is IN-4, and the consuming is `screenStateFromInput`'s.
  // ⛔ IN-4a: with nothing to consume the key MUST reach the browser.
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
  // SK-7 -- two combinations for one operation, which is the row's own wording.
  if (ctrl && key === KEY.y) return acted({ kind: 'redoEdit' })
  if (ctrlShift && key === KEY.z) return acted({ kind: 'redoEdit' })
  // SK-9 -- FR-035 is the one entrance to the document's name (FR-029).
  if (plain && key === KEY.f2) {
    return acted({ kind: 'editInPlace', target: { kind: 'documentTitle' } })
  }
  if (ctrl && key === KEY.o) return acted({ kind: 'openDocumentFile' }) // SK-10
  if (ctrl && key === KEY.s) return acted({ kind: 'saveDocumentFile' }) // SK-11
  if (ctrl && key === KEY.r) return acted({ kind: 'reopenDocumentFile' }) // SK-21

  // SK-12 / SK-13 / SK-14 / SK-15 -- all four land in `ScreenState`.
  // ⭐ SK-12 joined them when table T-103 settled `Export Chooser` (U-54): the
  // surface FR-096 opens now has a name S-99g can hold, so opening it IS a
  // change of screen state and IN-4's first level can close it again.
  if (ctrlShift && key === KEY.e) return CONSUMED_ELSEWHERE
  if (plain && (key === KEY.f1 || key === KEY.p || key === KEY.f11)) return CONSUMED_ELSEWHERE

  // SK-16 / SK-16a -- one axis each, by the same step the wheel turns by.
  if (shiftOnly && (key === KEY.plus || key === KEY.minus)) {
    const factor = keyZoomFactor(context, key === KEY.plus)
    return changed([zoomCommand(context, zoomTimes(context, factor, 'x'), null)])
  }
  if (altOnly && (key === KEY.plus || key === KEY.minus)) {
    const factor = keyZoomFactor(context, key === KEY.plus)
    return changed([zoomCommand(context, null, zoomTimes(context, factor, 'y'))])
  }

  // SK-17 -- 等倍. ⚠️ The 1 is the multiplicative identity, which is what 倍率
  // means, NOT S-75's stored default: reading the default would send this key
  // somewhere else the day that default moved, and S-76's own note fixes 等倍
  // as the baseline `basePlanHeight` is defined against.
  if (ctrl && key === KEY.zero) {
    return changed([{ kind: 'setZoom', zoomX: 1, zoomY: 1 }])
  }

  // SK-18 -- FR-055. The zoom is measured from the layout this frame ran, and
  // the place is handed back to OP-10 (see `fitCommand`).
  if (plain && key === KEY.f) return changedInOrder(fitWrites(context))

  // SK-20 -- FR-046: showing the line puts today into `statusDate`, hiding it
  // puts null there. The clock is the shell's (LY-5), so today arrives as a
  // value.
  if (ctrlShift && key === KEY.d) {
    return changed([
      context.document.schedule.project.statusDate === null
        ? { kind: 'setStatusDate', date: context.today }
        : { kind: 'clearStatusDate' },
    ])
  }

  // SK-1 / SK-1a record that no keyboard route to placing a figure exists
  // (RC-10 of table T-026), so there is nothing to match. Everything else is a
  // combination this tool has not assigned, and MK-10 forbids taking it.
  return UNASSIGNED
}

/**
 * MK-1 to MK-5.
 *
 * ⛔ The rule after table T-023d: while a drag is under way the wheel MUST NOT
 * zoom or scroll -- a drag holds the day under the pointer still while a zoom
 * moves it, and both cannot be satisfied at once. The turn stays ASSIGNED
 * though, so MK-10 still silences the browser: letting the page scroll under a
 * drag is the very thing being refused.
 *
 * @provisional PD-13
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

  // ⭐ Turning the wheel AWAY from the person (a negative count, by the seam's
  // own convention) reads further up a document and makes the schedule larger.
  // ⛔ Which way a wheel zooms is settled by no row: table T-023 gives MK-2 a
  // direction only through 「ズーム」. The recommendation is that away-from-the
  // -person magnifies, which is what every notch-per-step figure in table T-201
  // is written for (S-53 is a multiplier above 1) and what the same wheel does
  // when it scrolls.
  const factor = Math.pow(context.zoomStep, -input.notches)

  if (ctrl) return changed([zoomCommand(context, zoomTimes(context, factor, 'x'), zoomTimes(context, factor, 'y'))])
  if (shiftOnly) return changed([zoomCommand(context, zoomTimes(context, factor, 'x'), null)])
  if (altOnly) return changed([zoomCommand(context, null, zoomTimes(context, factor, 'y'))])

  // MK-1 / MK-5 -- the wheel's own distance, because no row says how far one
  // detent scrolls and S-96 says the device is what knows.
  //
  // ⛔ MK-5's DISTANCE IS NOT ALWAYS ON THE HORIZONTAL AXIS. A person has one
  // wheel and turns it; the host reports that turn on the VERTICAL axis however
  // many modifiers are held, and leaves the horizontal one at zero. Read off
  // the horizontal axis alone, MK-5's 「横スクロール」 therefore measured zero
  // and the schedule never moved. ⚠️ The seam keeps the two axes literal on
  // purpose, so the join is made HERE, where the combination is what says the
  // movement is sideways -- the same fallback `wheelTurn` (PI-27) already makes
  // for the detent count, and for the same reason. ⭐ A device that really does
  // report a sideways turn -- a tilt wheel, a trackpad -- is believed first.
  // ⛔ MK-1 gets NO such fallback: a plain sideways turn is a combination table
  // T-023 has no row for, and reading it as MK-1 would assign it here.
  const sideways = input.scrollPx.x !== 0 ? input.scrollPx.x : input.scrollPx.y
  const moved = plain
    ? scrolledAnchor(context, 0, input.scrollPx.y)
    : scrolledAnchor(context, sideways, 0)
  return changed([
    {
      kind: 'setScrollPosition',
      scrollDate: moved.scrollDate,
      // ⭐ MK-5's sideways turn is continuous: the device reports a distance in
      // px and S-177 can hold any part of a day, so the schedule moves by the
      // distance turned rather than by whole days. ⚠️ MK-1 passes zero on this
      // axis, so both members answer the values already in force.
      scrollDayOffset: moved.scrollDayOffset,
      // MK-1 -- see `rowTurnedTo`, which is `scrolledAnchor`'s vertical half
      // with a one-row floor under it. ⚠️ MK-5 keeps the plain answer: it
      // decides no vertical place, and the place standing at the top edge is
      // the one already in force.
      scrollGroupId: plain ? rowTurnedTo(context, input.scrollPx.y) : moved.scrollGroupId,
      // ⭐ A detent lands ON a row, so the fraction it leaves behind is zero.
      // ⛔ Writing `moved.scrollGroupOffset` beside a floored id would spell a
      // place neither the floor nor the distance asked for.
      scrollGroupOffset: plain ? 0 : moved.scrollGroupOffset,
    },
  ])
}

// STOP -- ⛔ HALF OF THE ZOOM RULE IS STILL UNWRITTEN. FR-016 requires the day
// and the row under the pointer to stand still through a zoom (MUST), and for a
// pointer-less route the centre of the `Row Area` instead.
// ⚠️ THE REASON THIS STOP USED TO GIVE IS NO LONGER TRUE and is corrected here
// rather than repeated: it said PI-5 published no way to go from a day back to
// an x, and `xFromDay` is exported and imported by this very file. ⛔ What
// blocks the rule now is the WRITING side, not the reading side. Holding a
// point still through a zoom lands the edge partway into a day and partway into
// a row -- S-176 and S-177 can hold exactly that since CR-260 -- but
// `setScrollPosition` (CM-66) carries no member for either, and the zoom
// commands (CM-65) carry no position at all, so a zoom that held the point
// still would have nowhere to write where it moved the edge to.
// Searched: table T-064 PI-5 and PI-6, `schedule-layout.ts`,
// `schedule-geometry.ts`, `edit-document-settings.ts` CM-65 / CM-66, FR-016,
// FR-017, FR-055, table T-203 S-176 / S-177.
// Until those commands carry a position, a zoom moves the scale and leaves the
// anchor where it was, and the MUST is unmet rather than guessed at.

/**
 * A press, a move, a release or a lost pointer.
 *
 * ⛔ MK-12 (MUST NOT) is applied HERE and not inside the decision order: a
 * combination this tool has not assigned keeps the browser's own behaviour,
 * while table T-023a goes on deciding what the gesture does. Reading it any
 * earlier would make the gesture inert, which that row forbids outright, and
 * reading it per branch would be one chance to forget it per row.
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
 * ⭐ IN-1: nothing settles on the press. So `down` never carries an action --
 * it only says that this tool has taken the gesture, which MK-10 needs so that
 * the browser does not start a text selection under the drag.
 *
 * @purity pure
 */
function pointerAssignment(input: PointerInput, context: InputContext): TranslatedInput {
  if (input.phase === 'down') {
    // ⚠️ The right button has no row in table T-023, so it stays the browser's
    // (MK-10, MUST NOT). Everything else inside the drawing area is this
    // tool's, by one row of table T-023a or another.
    if (input.button === 'right') return UNASSIGNED
    // A press on something this tool drew is this tool's, wherever it landed:
    // the browser must not start a text selection under a palette that FR-053
    // has the person drag, nor under an entry.
    const press = context.pressed
    if (press !== null && press.on !== null) return CONSUMED_ELSEWHERE
    return isOnRowArea(context, input.x, input.y) ? CONSUMED_ELSEWHERE : UNASSIGNED
  }
  // ⚠️ A move carries no action either, with ONE exception below. What a drag
  // will do is decided once, on release, from the press -- and the picture
  // drawn WHILE dragging is the renderer's, not a change to the document.
  //
  // ⭐ THE EXCEPTION IS FR-053's FOLLOWING PALETTE (MUST), and it is an
  // exception to the sentence above rather than to IN-1: the palette is not
  // drawn from the document, so what a move reports for it settles no value of
  // the schedule and pushes no undo step. Every other gesture's picture is the
  // renderer's to draw from the press it can see.
  // ⭐ TWO GESTURES ANSWER A MOVE NOW. PD-1's pan is asked first because it is
  // the row table T-023a puts first -- 「構えと当たりによらず優先する」 -- and
  // the two cannot both answer anyway: a pan's press is on nothing the surface
  // drew and the palette's is on its own band.
  if (input.phase === 'move') {
    const panning = panFollow(input, context)
    return panning === UNASSIGNED ? paletteFollow(input, context) : panning
  }
  // IN-1a: the pointer was lost outside the window, so the drag ends as an
  // abort (MUST) -- nothing is written. ⭐ Saying so is what keeps AG-9 from
  // refusing every later write: the shell drops the press it is holding.
  if (input.phase === 'lost') return CONSUMED_ELSEWHERE

  const press = context.pressed
  if (press === null) return UNASSIGNED
  // ⭐ FIRST, because table T-023a's own note limits its decision order to the
  // schedule's drawing area (MUST): a press the surface answered for was not on
  // the schedule at all, whatever `regionAtPointer` says about the point.
  if (press.on !== null) return commandFromEntry(input, press, context)
  // ⭐ A HIT IS ITSELF THE ANSWER TO 「日程の描画領域か」, so the region is asked
  // only of a press that carries none. `itemAtPointer` walks the schedule's own
  // geometry and the caller asks it only inside the `Row Area` -- the shell's
  // `collectPress` states that in as many words -- so a press holding a `Hit`
  // was on the schedule, whatever its two numbers say. ⛔ WITHOUT THIS,
  // 「担当ラベルをダブルクリックした」 (AS-1 of table T-225, MUST) was answered
  // by the coordinates rather than by the row that was grabbed, and a caller
  // that hands the row in -- which is what the row IS -- got nothing.
  // ⚠️ The press with no hit still has to be placed: PD-4 creates a Task where
  // nothing was struck and PD-5 opens a marquee, and neither may begin on the
  // ruler or in the Row Title Panel (the note under table T-023a, MUST).
  if (press.hit === null && !isOnRowArea(context, press.at.x, press.at.y)) return UNASSIGNED

  // ⭐ ASKED HERE RATHER THAN READ OFF `press.pressRow`, AND IT IS THE SAME
  // ANSWER. The member is what this very function returned at the press, so
  // there is one reading of table T-023a either way (R2.7 is about a second
  // READING, not a second call). ⚠️ And the answer cannot have drifted since:
  // the button, the modifiers and the hit are frozen on the press, while the
  // two current values PD-2 and PD-4 / PD-4a turn on hold still for as long as
  // a press does -- arming moves only on a press of a palette entry, which
  // REPLACES the press, or on `Esc`, which IN-4 spends at the gesture level
  // above `armed` while a gesture is in flight and the caller answers by
  // dropping the press.
  switch (pressRowOf(press, context)) {
    case 'PD-1': {
      // Pan. ⭐ 「パンは等倍とすること（MUST）」 -- the schedule moves exactly
      // as far as the pointer did, so the display position moves the opposite
      // way by the same number of pixels.
      //
      // ⭐ ALL FOUR MEMBERS COME FROM THE ONE READING, and that is what makes
      // 等倍 exact. S-176 and S-177 hold the part of a row and the part of a
      // day the anchors cannot name, so a movement of any distance -- shorter
      // than a row, shorter than a day -- is written as the distance it was.
      // ⛔ NO FLOOR IS TAKEN HERE ANY MORE. `rowTurnedTo`'s one-row floor used
      // to answer the vertical half, and it made the picture jump a whole row
      // for a drag of a few px, which is the very thing that paragraph forbids
      // (「倍率を掛けない」). The floor existed only because nothing finer could
      // be expressed; S-176 expresses it, so the floor is a defect rather than
      // a choice. ⚠️ MK-1 keeps it -- see `rowTurnedTo` for why the wheel and
      // the hand are held to different rules.
      // ⭐ THE TRAVEL SINCE THE LAST PIECE, not since the press, and the sum
      // over one gesture is the same either way -- `followingTravel` falls back
      // to the press for a caller that followed nothing, which is what a caller
      // with no `followedTo` gets. ⛔ MEASURED FROM THE PRESS IT DOUBLES: the
      // moves have already been applied and `scrolledAnchor` reads the layout
      // they produced.
      const by = followingTravel(input, press)
      return panTo(context, -by.dx, -by.dy)
    }
    case 'PD-2':
      // DC-2 of table T-029a: the click fixes the following side and hands the
      // following to the other.
      //
      // ⛔ THE NOTE THAT STOOD HERE WAS WRONG, AND SO WAS THE LEDGER. It said
      // CM-60 demanding BOTH dates at once (IV-13) left a first click nowhere
      // to be remembered. DC-1 refutes it: entering the mode puts `date1` on
      // the pointer AND `date2` at the middle of the `Row Area`, so both dates
      // stand from the first frame and a half-placed pair never occurs. IV-13
      // was never the obstacle -- the missing thing was one bit, which side is
      // following, and it is `InputContext.dualCursorFollowing`.
      return commandFromDualCursorPress(press, context)
    case 'PD-3':
      return commandFromGrab(input, press, context)
    case 'PD-4':
      return commandFromArmed(input, press, context)
    case 'PD-4a':
      // 「何もしない。引きかけの矢印があれば捨てる。構えは解かない」 -- the
      // half-drawn arrow is the renderer's and the arming is untouched, so
      // there is nothing to write.
      return CONSUMED_ELSEWHERE
    case 'PD-5':
      // Marquee, or a click on nothing. Either way it is the selection's
      // (SL-3 / MK-11), and `selectionFromInput` answers it.
      return CONSUMED_ELSEWHERE
  }
}

/**
 * How far a following gesture still owes, for the happening now in hand -- the
 * pointer against the last point the caller followed it to, or against the
 * press while it has followed it nowhere.
 *
 * ⭐ ONE READING FOR THE MOVE AND THE RELEASE. Both owe the same distance and
 * the sum of every answer over one gesture is `release - press`, whichever way
 * the caller reports: written twice, the two would drift apart the first time
 * `followedTo` changed meaning.
 *
 * ⭐ TWO GESTURES FOLLOW NOW, not one: FR-053's palette (GR-19) and PD-1's pan.
 * ⛔ The reading is shared rather than copied because the trap is the same for
 * both -- a piece measured from the PRESS is right only for the first piece and
 * overshoots by more the more pieces one drag is reported in.
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
 * PD-1 (MUST): 「握っているあいだ、縦横の両方向でポインタに追従させること」
 * (the user's ruling of 2026-08-29).
 *
 * ⭐ A WRITE PER MOVE IS ALLOWED HERE, which IN-1 would otherwise forbid: UN-8
 * of table T-027 puts 「ズーム・スクロール・パン」 outside the history, so a
 * display position written on every move pushes no step and nothing settles
 * that a release could still take back. ⛔ The alternative -- drawing a
 * preview and writing once on the release -- was tried and measured wrong:
 * `scrolledAnchor` reads the layout the preview produced, so each frame applied
 * the whole travel again (a -240 drag left the leftmost bar at -790).
 *
 * ⚠️ NOTHING IS REPORTED WHILE THE CALLER CARRIES NO `followedTo`, for the
 * reason `paletteFollow` gives.
 *
 * @purity pure
 */
function panFollow(input: PointerInput, context: InputContext): TranslatedInput {
  const press = context.pressed
  if (press === null) return UNASSIGNED
  // ⛔ `on` FIRST, the order `isDocumentChangingPress` keeps: the note under
  // table T-023a limits that table to the schedule's drawing area (MUST), so a
  // press the screen surface answered for carries no row of it -- and PD-1's
  // own row is what this reads.
  if (press.on !== null) return UNASSIGNED
  if (press.pressRow !== 'PD-1') return UNASSIGNED
  // ⚠️ NOTHING IS REPORTED WHILE THE CALLER CARRIES NO `followedTo`, the same
  // refusal `paletteFollow` makes and for the same reason: a caller that does
  // not record what it applied would add up travels all measured from the press
  // and send the schedule running. ⭐ The release still pans in full, because
  // `followingTravel` falls back to the press when nothing was followed.
  if (press.followedTo === undefined) return UNASSIGNED
  const by = followingTravel(input, press)
  // ⭐ THE SAME ARITHMETIC THE RELEASE USES, from the same helper: the display
  // position moves the opposite way by the same number of pixels, which is
  // 「パンは等倍とすること（MUST）」.
  return panTo(context, -by.dx, -by.dy)
}

/**
 * FR-053 (MUST): while GR-19's band is held, the palette follows the pointer.
 *
 * ⛔ GR-19 IS NO LONGER THE ONLY GESTURE THAT REPORTS ON A MOVE -- PD-1's pan
 * does too, and `panFollow` above is asked first. The two cannot both answer:
 * this one wants a press ON the band and that one a press on nothing at all.
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
 * What a press on one of the entries this tool drew is assigned to.
 *
 * ⭐ IN-1: settled on the RELEASE, and read against the PRESS -- which is why
 * `PointerPress.on` is what is looked at rather than where the pointer ended up.
 * ⚠️ No row below invents anything for an entry. Each is either an operation
 * this file already answers for a row of table T-036, or a surface whose name
 * table T-103 has settled, or a row whose own text names the value the press
 * writes and the setting it writes it into. The STOP note at the foot of this
 * file states the rule in full and says what every unanswered row is missing.
 *
 * ⛔ THE ARMING ENTRIES ANSWER NOTHING HERE except SP-2 and SP-3's shape change.
 * What is armed lives in `ScreenState` (UN-11 keeps it out of the undo record),
 * so `screenStateFromInput` is the member that answers SP-1 and SP-4.
 *
 * ⭐ ONE PRESS ANSWERED HERE IS ON NO ENTRY AT ALL -- FR-085's choosing of a row
 * in the `Row Title Panel`. It is answered in this function because this is
 * where a press the SURFACE claimed arrives: the note under table T-023a keeps
 * that table's decision order off the panel, so there is no other road, and
 * `ScreenPart.rowGroupId` is what says which row.
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
  // ⭐ BEFORE THE ENTRY IS READ, because a `Panel Divider` carries none: U-24
  // has no row in table T-109, so `entry` is null on the band and the press
  // would otherwise fall through as "on a part, on no entry" and write nothing.
  if (on.dividerPanel !== null) return commandFromPanelDivider(on.dividerPanel, release, press, context)
  if (on.entry === null) {
    // FR-085 (MUST): the row itself was pressed rather than one of the three
    // controls table T-051 and FR-098 draw on it.
    //
    // ⭐ THIS IS THE ROAD THE NOTE UNDER TABLE T-023a LEAVES OPEN. That note
    // limits its decision order to the schedule's drawing area (MUST), so no
    // row of that table ever names a press on the panel -- and `ScreenPart`
    // answers for the panel because the surface DREW it, which is how the
    // press arrives here at all. ⚠️ `rowGroupId` is set by nothing else: the
    // surface writes the key on a row of the `Row Title Panel` and on a roster
    // line, and a roster line carries `entry` as well.
    if (on.rowGroupId !== null) {
      return acted({
        kind: 'chooseRow',
        groupId: on.rowGroupId,
        // ⚠️ THE PRESS'S KEYS AND NOT THE RELEASE'S, which is CS-2 of table
        // T-066 -- the gesture is about the moment it began, and the same rule
        // `gestureModifiers` states for every other pointer row.
        isExtending: press.at.modifiers.shift,
      })
    }
    // On the part but on no entry and on no row -- the palette's own body, a
    // surface's background, a notice, the panel's empty tail below the last
    // row. The press is this tool's (the browser must not act under it) and
    // writes nothing.
    // ⛔ THE EMPTY TAIL DOES NOT LET GO OF THE CHOSEN ROWS. MK-11 of table
    // T-023 does that for the drawing area, and the note under table T-023a
    // keeps that table off this panel; FR-085 states no such rule of its own,
    // and letting go is reached by pressing a chosen row again with `Shift`.
    return CONSUMED_ELSEWHERE
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
    // ⭐ THESE FOUR ARE ASKED AGAIN WHILE THE BUTTON IS STILL DOWN. FR-018
    // (MUST) has a held IC-12 .. IC-15 go on stepping after the wait S-172
    // states, at the interval S-173 states, and the shell raises each of those
    // continuations by handing this member the SAME press a second time and a
    // third (`frame-loop.ts`, `repeatHeldEntry`). ⛔ SO NOTHING IN THESE FOUR
    // BRANCHES MAY READ THE RELEASE. They are decided from `press` and
    // `context` alone today, which is CS-2 of table T-066 in any case, and a
    // branch that started reading `release` would answer one thing on the
    // release and another on every repeat.
    // ⛔ AND THE STEP STAYS S-53 THROUGHOUT, which is the same requirement's
    // own MUST -- 「刻む幅は `S-53` のままとする」, because 「連続のあいだだけ別の
    // 幅にすると、同じ入口が 2 つの意味を持つ」. ⚠️ A repeat that felt too slow is
    // S-173's to answer and never `keyZoomFactor`'s.
    // ⭐ WHAT COMPOUNDS IS THE READING, NOT THE STEP. `zoomTimes` multiplies
    // the zoom now in force, so a fresh context each time is what makes a hold
    // travel; the factor it is multiplied by is the same one every time.
    // ⛔ IC-10 AND IC-11 ARE NOT IN THAT SET and must not be added to it: the
    // requirement limits the repeat to these four (MUST) and gives its reason
    // where it stands -- the fit and the full screen 「繰り返しても同じ結果にしか
    // ならない」.
    case ENTRY.zoomTimeIn:
    case ENTRY.zoomTimeOut: {
      const factor = keyZoomFactor(context, entry === ENTRY.zoomTimeIn)
      return changed([zoomCommand(context, zoomTimes(context, factor, 'x'), null)])
    }
    case ENTRY.zoomRowIn:
    case ENTRY.zoomRowOut: {
      const factor = keyZoomFactor(context, entry === ENTRY.zoomRowIn)
      return changed([zoomCommand(context, null, zoomTimes(context, factor, 'y'))])
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
    case ENTRY.actualDisplay: {
      // CM-57 -- FR-049's three values. `planActualDisplayFrom` holds the rule
      // and says why a press can have nowhere to go.
      const display = planActualDisplayFrom(
        context.document.documentSettings.planActualDisplay,
        entry === ENTRY.planDisplay,
      )
      // ⚠️ The press is still this tool's although it writes nothing: MK-10
      // (MUST) keeps the browser out from under an entry this tool drew.
      if (display === null) return CONSUMED_ELSEWHERE
      return changed([{ kind: 'setPlanActualDisplay', display }])
    }
    case ENTRY.themePreference: {
      // CM-63 -- FR-039's light/dark, which S-72 holds two values for. ⚠️ The
      // saved value is a STARTING value and not a binding one (FR-039, MUST
      // NOT), and this press is how the reader moves off it -- FR-039's own
      // RATIONALE calls the result an edit of the document, which is why it is
      // a `DocumentCommand` and not the shell's.
      const isDarkNow = context.document.documentSettings.themePreference === 'dark'
      return changed([{ kind: 'setThemePreference', preference: isDarkNow ? 'light' : 'dark' }])
    }
    case ENTRY.statusLine:
      // FR-046, as SK-20 states it: showing the line puts today into
      // `statusDate` and hiding it puts null there. ⚠️ Table T-109 also says
      // 「動かす」, which is GR-16's drag and not this entry.
      return changed([
        context.document.schedule.project.statusDate === null
          ? { kind: 'setStatusDate', date: context.today }
          : { kind: 'clearStatusDate' },
      ])
    case ENTRY.dualCursor:
      return commandFromDualCursorEntry(press, context)
    case ENTRY.guideCursorNone:
    case ENTRY.guideCursorCrosshair:
    case ENTRY.guideCursorSingleVertical:
    case ENTRY.guideCursorDoubleVertical:
      return commandFromGuideCursorEntry(entry)
    case ENTRY.paletteMinimise:
      // FR-053 -- S-200, which the shell holds. Same shape as the row below.
      return acted({ kind: 'togglePaletteMinimised' })
    case ENTRY.interactionRecord:
      // FR-102 -- S-206, which the shell holds, the same shape as the two rows
      // beside it: table T-109's IC-76 says 「同じ入口で止める」, so the press
      // reverses whatever stands and the value that stands is the shell's.
      // ⛔ The clipboard FR-102 (MUST) hands the record to on the stop is the
      // shell's too: a pure member cannot reach IF-5.
      return acted({ kind: 'toggleInteractionRecord' })
    case ENTRY.milestoneList:
      // FR-053 -- S-142, which the shell holds. ⭐ Since CR-273 the row reads
      // 「同じ入口で開閉する」, so which way it goes depends on what stands, and
      // what stands is the shell's: this reports the press and the shell turns
      // the value.
      return acted({ kind: 'toggleMilestoneList' })
    case ENTRY.paletteGrabBand:
      // GR-19 of table T-023d -- FR-053's drag, settled on the release like
      // every other one here (IN-1 of table T-028).
      //
      // ⭐ NOTHING HAS TO ENFORCE THE PRIORITY. GR-19 is the FIRST row of that
      // table and its preamble reads 「上の行ほど優先すること（MUST）」, so a press
      // that lands on the band is the band's whatever is drawn under it --
      // and `press.on` is the drawing side's own answer, taken once at the
      // moment of the press (CS-2 of table T-066). ⛔ That only holds while
      // the band is laid OVER what it covers; the note by `ENTRY` says so to
      // the side that lays it.
      //
      // ⚠️ The pointer's travel and not its place: a press may begin anywhere
      // on the band, so the corner has to move by the difference rather than
      // jump to where the finger let go.
      //
      // ⭐ WHAT IS LEFT OF IT, WHICH IS THE WHOLE TRAVEL WHEN NOTHING FOLLOWED.
      // FR-053 (MUST) has the palette follow while the band is held, so the
      // moves before this one may already have been reported and applied;
      // `followingTravel` is where the two readings are settled, once.
      return acted({ kind: 'moveCommandPalette', by: followingTravel(release, press) })
    case ENTRY.rowExpanderOpen:
    case ENTRY.rowExpanderClose:
    case ENTRY.rowExpanderCloseBelow:
    case ENTRY.rowPin:
    case ENTRY.rowDelete:
      return commandFromRowEntry(entry, on.rowGroupId, context)
    case ENTRY.rowExpanderOpenAll:
      // HF-10 of table T-051, which is HR-1 of table T-015.
      //
      // ⭐ CM-72 IS ALREADY THAT OPERATION. Its row in table T-108 asks for
      // every folded row to open, which is HR-1 exactly; that row's authority
      // column names FR-055 because that is the requirement the command was
      // raised for, and a command is not narrowed to the one that raised it.
      // ⚠️ `edit-task-group.ts` still calls the fit the only operation that
      // opens them all -- see the report for this unit.
      // ⛔ No loop of CM-33 is built instead: FR-031 (MUST) makes one press one
      // undo step, and a step per row would count the document's rows.
      // ⚠️ NEITHER THE ZOOM NOR THE VIEWPORT MOVES. HF-10 says so, and that is
      // the whole of what separates this press from the fit (FR-055), which
      // owes CM-71 first -- so `fitWrites` is not reached and this is one write.
      return changed([{ kind: 'expandAllTaskGroups' }])
    case ENTRY.rowExpanderCloseAll:
      // HF-12 of table T-051, which is HR-2 of table T-015.
      //
      // ⛔ NO COMMAND OF ITS OWN IS MINTED FOR IT, and that is not the shape
      // IC-74 takes above. CM-72 exists because FR-055's fit needs the whole
      // opening as ONE row of table T-108; table T-108 has no row that folds
      // them all, and adding one would write with a second command what CM-33
      // already writes -- which R3.4 refuses. ⭐ `foldsEveryRow` builds the
      // bundle, and a bundle IS one undo step (FR-031): `commandFromRowEntry`
      // has opened a whole subtree that way since IC-58 was wired.
      // ⚠️ NEITHER THE ZOOM NOR THE VIEWPORT MOVES, for HF-10's reason, which
      // HF-12 takes with the placement.
      return changed(foldsEveryRow(context.document.schedule))
    case ENTRY.documentSettingsProperties:
      // FR-072 -- 「設定の入口」. Which way this press goes is the holder's; see
      // the action's own note.
      return acted({ kind: 'toggleDocumentSettingsProperties' })
    case ENTRY.agentApi:
      // FR-065 -- S-99b keeps the record out of the document, so this changes
      // nothing the document holds.
      return acted({ kind: 'toggleAgentApi' })
    case ENTRY.rosterChooseAll:
    case ENTRY.rosterClearChosen:
    case ENTRY.rosterChooseUnreferenced:
      return acted({
        kind: 'chooseResources',
        uids: rosterChoiceOfEntry(entry, context.document.schedule),
      })
    case ENTRY.rosterChosen:
    case ENTRY.rosterUnchosen: {
      // ⚠️ A roster entry drawn with no person on it cannot be acted on: AS-6
      // of table T-225 (MUST) writes the `uid`, and there is none to write.
      // ⛔ Still this tool's press (MK-10).
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
 * ⭐ THE MODE IS THE FOLLOWING SIDE. Entering hands it to `date1`, which is
 * DC-1's own default; leaving sets it to null. There is no second flag to keep
 * in step, which is why the mode cannot be up with nobody following.
 *
 * ⛔ A PAIR ALREADY STANDING IS NOT PUT DOWN AGAIN (DC-1, MUST NOT). DC-7
 * (MUST NOT) keeps the two lines standing after the mode is left, so that a
 * measurement can be read while doing something else -- re-placing them on the
 * way back in would wipe that measurement at the moment of re-entry.
 *
 * ⛔ LEAVING WRITES NOTHING AT ALL, for the same row: DC-7 puts the clearing on
 * an entrance of its own, and DC-4's Esc-or-same-entry is not it.
 *
 * ⚠️ 「画面の中央」 IS THE `Row Area`'S HORIZONTAL MIDPOINT, which DC-1 now says
 * in as many words. ⛔ Not the window's: the two lines run down the `Row Area`
 * and a midpoint outside it could name a day the picture never drew.
 *
 * @purity pure
 */
function commandFromDualCursorEntry(
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  // DC-4: 「同じ入口の再押下」. The document is untouched (DC-7).
  if (context.dualCursorFollowing !== null) {
    return acted({ kind: 'setDualCursorFollowing', following: null, placed: null })
  }
  const standing = context.document.documentSettings.dualCursor
  if (standing !== null) {
    return acted({ kind: 'setDualCursorFollowing', following: 'date1', placed: null })
  }
  const rowArea = context.regions.rowArea
  const onPointer = dayAtX(context.layout, press.at.x)
  const atCentre = dayAtX(context.layout, rowArea.x + rowArea.width / 2)
  // ⛔ THE MODE IS NOT ENTERED WITH NOTHING TO MEASURE. DC-1 (MUST) puts BOTH
  // dates down on the way in and IV-13 admits no half-placed pair, so an axis
  // that can name neither day leaves the press taken and the mode down rather
  // than up over an empty setting. ⚠️ It happens only before the axis has an
  // origin, which BO-1 of table T-077 already forbids drawing in.
  // @provisional PD-313
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
 * PD-2 of table T-023a, which is DC-2: 「追従している側をクリックするとその位置で
 * 固定し、もう一方が追従に切り替わること」.
 *
 * ⭐ WHAT IS FIXED IS THE DAY UNDER THE POINTER, which is the same reading the
 * renderer draws the following line at -- so the line lands where it was seen.
 *
 * ⛔ THE OTHER SIDE IS WRITTEN BACK UNCHANGED, not left out. CM-60 takes both
 * dates at once (IV-13), so the standing one has to travel with the fixed one;
 * reading it from the frozen document is what makes this one press one write.
 *
 * ⭐ THE PRESS AND NOT THE RELEASE, which is CS-2 of table T-066 -- the same
 * rule every other row of table T-023a is settled by.
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
  // ⛔ ALL THREE ARE UNREACHABLE TOGETHER TODAY, and none is guessed at. PD-2
  // is only reached while a side is following, and DC-1 leaves a pair standing
  // whenever one is. ⚠️ The press is still taken -- the mode is up, so the
  // browser must not act under it (MK-10).
  // @provisional PD-314
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
 * ⭐ THE TRAVEL AND NOT THE PLACE. A press may begin anywhere across the band's
 * S-134 width, so the boundary moves by the difference between the two points;
 * jumping the boundary to where the finger let go would shift it by however far
 * off centre the press had landed.
 *
 * ⚠️ THE TWO BANDS FACE OPPOSITE WAYS, which is why one width grows where the
 * other shrinks. `screenFrameFromRegions` (UF-61) lays the row title panel's
 * band on that panel's RIGHT edge and the properties panel's on its LEFT, so
 * the same rightward travel widens the first and narrows the second.
 *
 * ⭐ CM-67 TAKES BOTH WIDTHS AT ONCE and this changes only the one the band
 * names -- FR-052 (MUST NOT) forbids judging either width on its own, so the
 * command is stated as a pair and the other half of the pair is the value in
 * force. ⛔ The judging itself is NOT repeated here: FR-052's test is that the
 * `Row Area` stays wider than zero, `edit-document-settings.ts` holds it because
 * that is where the width the pair is measured against arrives, and a translator
 * that clamped as well would give one drag two answers depending on who ran it
 * -- the same reason GR-3 and GR-4 leave IV-2 to the aggregate.
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
 * One press on one of FR-049's toggles (CM-58).
 *
 * ⛔ READ FROM THE DOCUMENT, NEVER FROM THE DRAWN ENTRY, for the reason
 * `commandFromRowEntry` gives at the pin: a drawn screen is as old as the last
 * paint and FR-048 lets a paint be skipped altogether, so a press read against
 * the picture could write the value that is already there. ⚠️ CM-58 does not
 * catch that -- it puts whatever it is given -- so the toggle would simply
 * refuse to move, the way a pin read against a stale picture refuses to come
 * off. ⭐ No undo step is at stake here: UN-7 keeps the toggles out of the
 * history altogether, which is why `isUndoable` names CM-58.
 *
 * @purity pure
 */
function commandFromVisibleElementEntry(entry: string, context: InputContext): TranslatedInput {
  const element = visibleElementOfEntry(entry)
  // Not a toggle's entrance. ⛔ Still this tool's press (MK-10).
  if (element === null) return CONSUMED_ELSEWHERE
  const isVisibleNow = context.document.documentSettings[element]
  return changed([{ kind: 'setElementVisible', element, visible: !isVisibleNow }])
}

/**
 * One press on one of the guide cursor's four entrances (CM-59).
 *
 * ⭐ NOTHING IS READ FROM THE DOCUMENT. CU-3 of table T-029 has the reader
 * CHOOSE among four exclusive modes and table T-109 gives each mode its own
 * entry, so the value the press writes is the row's own and does not depend on
 * the value it replaces. ⚠️ Pressing the entry for the mode already set writes
 * that mode again and costs one undo step (UN-13 keeps S-66 in the history);
 * no row makes a second press on the same entry mean "switch the cursor off"
 * -- IC-46 is the entrance table T-109 places for that, and reading it as an
 * off switch would give one function two entrances (FR-029, MUST NOT).
 *
 * @purity pure
 */
function commandFromGuideCursorEntry(entry: string): TranslatedInput {
  const mode = guideCursorModeOfEntry(entry)
  if (mode === null) return CONSUMED_ELSEWHERE
  return changed([{ kind: 'setGuideCursorMode', mode }])
}

/**
 * The five entrances table T-109 draws once per ROW -- IC-58, IC-59 and IC-77
 * on U-47 `Row Expander`, IC-60 on U-48 `Row Pin`, and IC-82, which table
 * T-103 names no part for at all (see `ENTRY.rowDelete`).
 *
 * ⭐ WHICH ROW IS `ScreenPart.rowGroupId`, AND IT COULD COME FROM NOWHERE ELSE.
 * HF-1 of table T-051 and FR-098 (MUST) each draw their control once per row,
 * so the entry says which KIND of control was pressed and never whose row --
 * and the side that DREW the row is the only one that may answer where it
 * stands, which is Chapter 5.3's rule under table T-065 (MUST NOT). ⚠️ It is
 * read off the PRESS for the reason `PointerPress.on` gives: CS-2 of table
 * T-066 freezes the gesture's screen at the press, so a panel scrolled since
 * must not move the answer to another row.
 *
 * ⛔ FIVE OF TABLE T-015's SIX OPERATIONS HAVE AN ENTRANCE, AND TWO OF THE
 * FIVE ARE NOT HERE. HF-2 is HR-3, HF-3 is HR-5 and HF-11 is HR-4, all three
 * drawn per row; HF-10 is HR-1 and HF-12 is HR-2, each drawn ONCE at the top of
 * the panel, so `commandFromEntry` answers those two directly.
 * ⛔ HR-6 (hiding a row) STILL HAS NO ENTRANCE, and this file may not invent
 * one: that row requires in the same breath that a hidden row be brought back
 * through the parent's `Hidden Group Tab` (U-29, MUST), and nothing in `src/`
 * draws one -- an entrance without it would hide a row for good. ⚠️ CR-294
 * records that as the reason the sixth was left out.
 *
 * @purity pure
 */
function commandFromRowEntry(
  entry: string,
  rowGroupId: string | null,
  context: InputContext,
): TranslatedInput {
  // The point was on the `Row Title Panel` but on no row of it -- the panel's
  // empty tail below the last row. The press is still this tool's (MK-10 keeps
  // the browser out from under what this tool drew) and writes nothing.
  if (rowGroupId === null) return CONSUMED_ELSEWHERE

  if (entry === ENTRY.rowPin) {
    // FR-098: the same control pins and unpins, so which of CM-68 and CM-69 a
    // press means is decided by whether the row is pinned NOW.
    //
    // ⛔ READ FROM THE DOCUMENT, NEVER FROM THE DRAWN ROW. S-126 keeps the pins
    // in the presentation group (`pinnedGroupIds`), and `context.document` is
    // the copy CS-1 froze at the head of THIS frame -- while a drawn row is as
    // old as the last paint, and FR-048 lets a paint be skipped altogether. A
    // press read against a stale picture would plan CM-68 for a row that is
    // already pinned, which CM-68 answers by doing nothing, so the pin would
    // simply refuse to come off.
    //
    // ⚠️ THE CAP IS NOT TESTED HERE. FR-098 (MUST) refuses a pin past `S-127`
    // and requires a notice; `editDocumentSettings` is where CM-68 answers that
    // and where the refusal is worded, and a second test here would be the same
    // rule in two places (R2.7).
    const isPinned = context.document.documentSettings.pinnedGroupIds.includes(rowGroupId)
    return changed([
      isPinned
        ? { kind: 'unpinTaskGroup', groupId: rowGroupId }
        : { kind: 'pinTaskGroup', groupId: rowGroupId },
    ])
  }

  if (entry === ENTRY.rowDelete) {
    // IC-82 -- FR-032 (MUST): the row goes, and CD-2 of table T-050 takes with
    // it the rows below, every `Task` they carry (each cascading CD-1), the
    // annotations that point at the row and the pin that holds it.
    //
    // ⛔ NOTHING IS TESTED FIRST. CM-27 refuses a row that is not there on its
    // own account, and a row with nothing on it is still a row a person may
    // want gone -- so an empty bundle here would be this side inventing a
    // condition FR-032 does not state.
    // ⚠️ THE QUESTION IS NOT ASKED HERE. FR-032 (MUST) asks before a row is
    // deleted, and the shell puts that question in front of the WHOLE write
    // (`confirmationOwedBy`, table T-234's QN-1) -- so this returns the write
    // and the answer decides whether it lands.
    return changed([{ kind: 'deleteTaskGroup', groupId: rowGroupId }])
  }

  if (entry === ENTRY.rowExpanderCloseBelow) {
    // IC-77 -- HF-11 (MUST), which names HR-4 of table T-015: everything BELOW
    // this row folds, however deep.
    // ⛔ THE ROW ITSELF IS NOT FOLDED (HF-11, MUST NOT): that operation is
    // HF-3's, and doing both here would give it two entrances (FR-029).
    // ⚠️ ONE BUNDLE, for the reason IC-58's branch gives.
    return changed(foldsUnderRow(context.document.schedule, rowGroupId))
  }

  if (entry === ENTRY.rowExpanderOpen) {
    // IC-58 -- HF-2 (MUST), which names HR-3 of table T-015: everything BELOW
    // this row opens, however deep, and however each of those rows was left.
    // ⛔ THE ROW ITSELF IS NOT OPENED, and that is the pair HF-3 describes: a
    // row that folded itself is opened by the control of the row ONE ABOVE it,
    // so this control reaching its own row would give that operation two
    // entrances and leave the one above with nothing to do.
    // ⚠️ ONE BUNDLE. FR-031 (MUST) makes one gesture one undo step, so every
    // row that opens opens in the same write.
    return changed(opensUnderRow(context.document.schedule, rowGroupId))
  }

  // IC-59 -- HF-3 (MUST), which names HR-5 of table T-015: THIS row folds, and
  // nothing below it is written.
  // ⛔ THE SUBTREE IS NOT FOLDED. Folding the descendants as well is HR-4,
  // which IC-77 above now carries (HF-11) -- so widening this one would give
  // that operation two entrances, which FR-029 refuses.
  const row = context.document.schedule.taskGroups.find((one) => one.id === rowGroupId)
  // ⚠️ Already folded, or gone: no write. `changed` says why an empty bundle is
  // not one -- WS-4 would push an undo step for a press that moved nothing.
  if (row === undefined || row.isCollapsed === true) return CONSUMED_ELSEWHERE
  return changed([{ kind: 'setTaskGroupCollapsed', groupId: rowGroupId, collapsed: true }])
}

/**
 * Who the three header entrances of the `Resource Roster` leave chosen -- every
 * resource (IC-63), none (IC-64), or the ones no `Assignment` refers to
 * (IC-65).
 *
 * ⭐ READ FROM THE DOCUMENT AND NOT FROM THE DRAWN ROSTER, the same discipline
 * `commandFromRowEntry` keeps at the pin: a drawn screen is as old as the last
 * paint and FR-048 lets a paint be skipped altogether, while `document` is the
 * copy CS-1 of table T-066 froze at the head of this frame. ⚠️ It answers a
 * CHOICE and not a deletion -- FR-099 (MUST) has 「まとめて消す」 done in two
 * moves so that the deleting entrance stays exactly one (FR-029).
 *
 * ⛔ REFERRED-TO MEANS AN `Assignment` NAMES THE `uid`, whether or not that
 * assignment reaches a task. It refers to the person, which is the whole of what
 * 「どの割当からも参照されていない」 asks -- the same reading `open-modals.ts`
 * makes on the drawing side, and AT-94 is nullable, so an assignment naming
 * nobody marks nobody.
 * ⚠️ SAME-NAMED RESOURCES STAY TWO PEOPLE. AS-8 of table T-225 (MUST NOT)
 * forbids making them one, so the join is `uid` (AT-85) throughout and a
 * referenced person cannot hide an unreferenced twin from IC-65.
 *
 * ⭐ ONE PASS AND A `Set`: NFR-013 forbids a linear search per resource on a
 * path a person waits on, and a roster is as long as the document's people.
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
 * One `setTaskGroupCollapsed` per row under `ancestorId` that is folded, in the
 * order the document prints them -- HR-3 of table T-015, which HF-2 names.
 *
 * ⚠️ The rows that are already open are left out rather than written again:
 * CM-33 answers an unchanged fold by returning the document untouched, so
 * writing them would cost an undo step for a subtree that is already open.
 *
 * ⛔ NOT WHAT THE WHOLE-DOCUMENT CONTROL DOES. IC-74 is HR-1 and reaches rows
 * that are under no ancestor at all, so it answers with CM-72 rather than with
 * this -- and a version of this taking `null` for "everywhere" would be the
 * same operation written twice (R2.7).
 *
 * @purity pure
 */
function opensUnderRow(schedule: Schedule, ancestorId: string): readonly DocumentCommand[] {
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))
  const commands: DocumentCommand[] = []
  for (const row of schedule.taskGroups) {
    if (row.isCollapsed !== true) continue
    if (!isRowUnder(parentOf, row.parentId, ancestorId)) continue
    commands.push({ kind: 'setTaskGroupCollapsed', groupId: row.id, collapsed: false })
  }
  return commands
}

/**
 * One `setTaskGroupCollapsed` per row under `ancestorId` that is not folded, in
 * the order the document prints them -- HR-4 of table T-015, which HF-11 names.
 *
 * ⚠️ The mirror of `opensUnderRow` and built the same way, down to leaving the
 * rows that already stand as asked out of the bundle: CM-33 answers an
 * unchanged fold by returning the document untouched, so writing them would
 * cost an undo step for a subtree that is already folded.
 *
 * ⛔ THE ROWS UNDER A FOLDED ROW ARE STILL WRITTEN. HR-1a stops them being
 * DRAWN, so folding them changes no pixel today -- but the fold is a column of
 * the document (AT-56), and a row left open under a folded one springs open the
 * moment the fold above it comes off. ⚠️ HR-4 says 「配下をすべて畳む」 and
 * names no exception.
 *
 * @purity pure
 */
function foldsUnderRow(schedule: Schedule, ancestorId: string): readonly DocumentCommand[] {
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))
  const commands: DocumentCommand[] = []
  for (const row of schedule.taskGroups) {
    if (row.isCollapsed === true) continue
    if (!isRowUnder(parentOf, row.parentId, ancestorId)) continue
    commands.push({ kind: 'setTaskGroupCollapsed', groupId: row.id, collapsed: true })
  }
  return commands
}

/**
 * One `setTaskGroupCollapsed` per row of the document that is not folded --
 * HR-2 of table T-015, which HF-12 names.
 *
 * ⛔ EVERY ROW AND NOT ONLY THE ONES WITH SOMETHING UNDER THEM. HR-2 says
 * 「すべての `TaskGroup` を閉じる」 and names no exception, and CM-72 (the
 * opening) is written the same way -- so a row that grows a child later is
 * already folded, exactly as one folded by hand would be.
 * ⚠️ A HIDDEN ROW IS WRITTEN TOO. HR-6 keeps such a row out of the picture and
 * HR-2 does not except it; leaving it open would make 「すべて」 depend on what
 * happens to be visible.
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
 * ⚠️ The map carries the parent alone rather than the whole row, so that this
 * file reaches for no name beyond `Schedule` -- which is the one PI-1 of table
 * T-064 publishes, and the row's own type is not on that list.
 *
 * ⛔ THE CLIMB GUARDS AGAINST A RING, and that is not caution for its own sake:
 * `schedule.ts` REPORTS a ring in `parentId` as a violation rather than refusing
 * the document, and this member is handed whatever the frame froze. Without the
 * guard a ringed document would spin here for ever, inside a frame.
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
 * selected changes what is selected, and leaves the arming alone.
 *
 * ⛔ A MIXED SELECTION IS NOT FILTERED HERE, AND THAT IS NOT AN OVERSIGHT.
 * FR-083 states SP-3 (change ALL of what is selected) and, in the same
 * requirement, that a shape MUST NOT cross between table T-012's SH-1 .. SH-4
 * and SH-5 -- and no row says which of the two wins when the selection holds
 * both kinds. The whole bundle is planned, `editTask` refuses the crossing one
 * (CM-20 against FR-083), and AG-3 makes the bundle atomic, so the gesture
 * changes nothing and NT-1 tells the person why. ⭐ That is the reading that
 * writes nothing it was not asked to; filtering here would settle the question
 * instead. Searched: FR-083, table T-012, table T-108 CM-20 / CM-21, table
 * T-035 AG-3, `edit-task.ts`.
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
      // ⚠️ Two commands, because FR-078's eight figures are a column of their
      // own (AT-101) while the SHAPE that makes a task a milestone is SH-5.
      // CM-20 is what refuses the crossing; CM-21 only chooses the figure.
      commands.push({ kind: 'setTaskVisualShapeKind', uid: one.uid, shapeKind: 'milestone' })
      commands.push({ kind: 'setTaskVisualMilestoneGlyph', uid: one.uid, glyph })
      continue
    }
    // AR-4 / AR-5 / AR-6 are not 形状. SP-1 to SP-3 speak of 「パレットの形状」
    // only, so a dependency or an annotation entry changes nothing selected --
    // it arms, which is `screenStateFromInput`'s answer.
  }
  return changed(commands)
}

/**
 * PD-3 -- what was grabbed, by the row of table T-023d that claimed it.
 *
 * ⚠️ MK-13 is read before the grab, because a double click means something
 * different from a drag on the same place: the row names the target, and two of
 * its five targets can be reached (see `InPlaceTarget`).
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
    // MK-13's Task entry -- the name label or the body, one destination for
    // both. ⭐ THAT IS THE ROW ITSELF and not a shortcut taken here: the two
    // were folded into a single entry because NL-1 of table T-013 draws the
    // label inside the shape, so answering them separately would put one
    // operation in two places.
    // ⚠️ THREE ROWS AND NOT TWO. The body is GR-12 for every shape, and a
    // milestone's actual figure (GR-15) stands over it in table T-023d -- so a
    // double click on a milestone that has an actual would otherwise reach
    // nothing at all.
    // ⛔ The dummies (GR-9 / GR-17 / GR-18) and the ends (GR-3 to GR-6) are NOT
    // the body: table T-023d gives each of them a grab region of its own, and
    // no entry of MK-13 names one.
    const isNameEntrance = hit.grab === 'GR-10' || hit.grab === 'GR-12' || hit.grab === 'GR-15'
    if (isNameEntrance) {
      return acted({ kind: 'editInPlace', target: { kind: 'taskName', uid: item.taskUid } })
    }
    // MK-13's OTHER Task entry -- 「担当ラベル ＝ 担当者名の変更」 -- which AS-1
    // of table T-225 makes a MUST and sends to GR-11. ⛔ A SEPARATE ANSWER and
    // not a fourth row on `isNameEntrance`: the two destinations are printed
    // apart in MK-13, so they leave here apart.
    if (hit.grab === 'GR-11') {
      return acted({ kind: 'editInPlace', target: { kind: 'assignee', uid: item.taskUid } })
    }
  }

  if (item.kind === 'statusLine' && hit.grab === 'GR-16') {
    // FR-046: the line is dragged sideways and `statusDate` follows it.
    const day = dayAtX(context.layout, release.x)
    return day === null ? CONSUMED_ELSEWHERE : changed([{ kind: 'setStatusDate', date: textOfDay(day) }])
  }

  if (item.kind === 'commentBox' && hit.grab === 'GR-14') {
    // Table T-023d GR-14, the MOVE half of its operation. ⭐ THE TRAVEL IS
    // ADDED AS IT STANDS AND NOT THROUGH THE DAY AXIS: FR-019 holds this one
    // distance in SCREEN pixels so that a zoom does not change how far the body
    // sits from what it is pinned to, and CM-51 says the same from the other
    // side -- the value arrives as what it will be drawn as.
    // ⭐ THE ANCHOR IS LEFT ALONE. GR-14's row moves the box, and FR-019 gives
    // the offset the whole of that distance; writing the anchor as well would
    // move the same picture twice.
    // ⭐ FOUND WITH A LOOKUP HERE RATHER THAN THROUGH A NEW MEMBER of
    // `schedule.ts`: PI-1 of table T-064 is the full count of what that unit
    // publishes, and one read this file needs once does not earn a row on it.
    // @provisional PD-316
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
      // Table T-023d, the closing rule three paragraphs under the table (MUST):
      // the days of GR-1 and GR-2 are taken FROM THE DAY UNDER THE POINTER --
      // GR-1 the days from `start`, GR-2 the days back from the plan's end --
      // rounded to whole days, and the result cut down by FD-6 of table T-012a
      // (MUST).
      //
      // ⭐ THE DAY IS ASKED FOR THE ONE WAY THIS FILE ALREADY ASKS. `dayAtX` is
      // the same road GR-3 / GR-4 below and GR-5 / GR-6 after them take, and it
      // floors to the day DRAWN at that x -- so the count between two days is a
      // whole number before anything rounds it, and the rounding that row asks
      // for has nothing left to round. ⚠️ NO SECOND ROAD IS OPENED: the closing
      // rule says the grab point IS a day on the time axis (which is also why
      // it forbids a drag threshold), so a pixel distance divided by `pxPerDay`
      // would be a second, disagreeing answer to the same question.
      //
      // ⚠️ SL-7a (MUST) as for GR-3 / GR-4: a corner drag is about the one Task
      // grabbed, whatever else is selected.
      // ⚠️ Neither FD-5's two shapes nor FR-075's MUST (handles only on the
      // selected Task) is judged here: `item-hit-area.ts` spends both where the
      // fade handles are built, and a Task that has none never arrives as GR-1
      // or GR-2 at all.
      const task = taskByUid(context.document.schedule, uid)
      const start = dayOf(task === null ? null : task.start)
      const finish = dayOf(task === null ? null : task.finish)
      const day = dayAtX(context.layout, release.x)
      if (task === null || start === null || finish === null || day === null) {
        return CONSUMED_ELSEWHERE
      }
      const pulled =
        hit.grab === 'GR-1'
          ? serialOfDay(day) - serialOfDay(start)
          : serialOfDay(finish) - serialOfDay(day)
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
      // Table T-023d: GR-5 changes `actualStart`, GR-6 changes
      // `actualDuration`. Like GR-3 and GR-4 this narrows to the one Task
      // grabbed (SL-7a, MUST) -- stretching several actuals at once has no
      // meaning either.
      // ⭐ GR-15 RIDES WITH GR-5 rather than taking an arm of its own: its row
      // moves the same column, and `actualEndPlacement` says why the two are
      // one answer. ⛔ It used to fall to the `default:` below, whose census
      // called it a row with no target to grab -- which was never true, since
      // `item-hit-area.ts` claims the milestone's actual figure and the
      // geometry builds it. Only the write was missing.
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
    case 'GR-18':
      // FR-043's faint dummies. ⭐ ONE COMMAND FOR ALL THREE, AND IT TAKES NO
      // DAY. FR-043 (MUST) places the same three columns whichever handle was
      // grabbed and fixes whichever end was not, so neither end can be a
      // parameter; CM-14 already reads the shape to choose between S-129 and
      // S-130, so GR-18 needs no separate answer here.
      //
      // ⭐ THE RELEASE IS THE ONLY PHASE THAT REACHES THIS FUNCTION, which is
      // what table T-023d's grab means: the table's closing rule sends the
      // moment of decision to table T-028's IN-1, and `pointerAssignment`
      // above answers `down`, `move` and `lost` without ever calling here.
      // ⭐ IN-1a follows from the same shape -- a pointer lost mid-gesture
      // writes nothing, which is the abort that row demands.
      //
      // ⚠️ GR-9's MUST NOT (no state cycled by a press) is kept by the hit
      // test, not here: a point GR-9 claims never arrives as GR-7, so the
      // cycle above is unreachable from a dummy. ⚠️ The row was narrowed to
      // that wording by CR-198; it does not refuse the press itself.
      //
      // ⛔ STILL MISSING AND NOT THIS UNIT'S: table T-023d also requires the
      // actual about to be placed to be DRAWN while one of the three is held
      // (MUST). That picture is the renderer's, from the press it can see --
      // IN-1 keeps a move from carrying an action.
      return changed([{ kind: 'beginTaskActual', uid }])
    case 'GR-12': {
      // FR-011 and HM-3 of table T-015a: the body moves sideways by whole days
      // and, when it went up or down, changes the row it is drawn on.
      // ⭐ SL-7 (MUST): a body drag moves EVERYTHING in the selection, so the
      // same shift is applied to each selected Task -- and to the grabbed one
      // alone when it is not in the selection.
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
      // Table T-023d GR-8 gives this grab `resume` and sends the rule to
      // FR-044, whose STATEMENT has the author place the resume date on the
      // screen and move it after it has been placed.
      //
      // ⛔ THE DROPPED DAY IS NOT MOVED TO A WORKING ONE. The rule under table
      // T-023d forbids it outright (MUST NOT) -- people work on days off, and
      // moving it would store a day other than the one the hand chose. This is
      // the same reading `actualEndPlacement` takes of that rule.
      //
      // ⭐ NOTHING ABOUT `resumeValid` IS DECIDED HERE. FR-044 (MUST) pairs a
      // placed resume date with `resumeValid` true, and PA-3 of table T-019 is
      // the row that holds exactly that pair -- `edit-task.ts` writes it. A
      // second answer here would be the same rule in two places.
      //
      // ⚠️ THE OTHER COLUMNS ARE CARRIED, NOT RECOMPUTED, for the reason
      // `actualEndPlacement` gives on GR-6's `actualFinish`: CM-13 places a
      // whole row of table T-019 while this row of table T-023d moves one
      // column, so taking any other value from the drag would be a second
      // entrance to a column no row gives this grab.
      const task = taskByUid(context.document.schedule, uid)
      const dropped = dayAtX(context.layout, release.x)
      if (task === null || dropped === null) return CONSUMED_ELSEWHERE
      // ⚠️ A suspension carrying no actual leaves PA-3's row unwritable -- the
      // same arm `actualEndPlacement` takes where the columns it must carry are
      // not there. ⛔ Still this tool's press: MK-10 keeps the browser out from
      // under a grab it took. @provisional PD-318
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
      //   GR-11        the assignee label is not drawn, so no press can arrive
      //                as this row: `item-hit-area.ts` records the gap where
      //                table T-023d prints the row, and says the row comes in
      //                double-click-only when the label does.
      //   GR-13        a dependency is SELECTED by a press rather than changed
      //                by one, which is the whole of its operation column.
      //   GR-10        cannot arrive by a plain press at all: table T-023d's
      //                closing rule (MUST NOT) takes it out of that reading, so
      //                `item-hit-area.ts` never answers it here. Its double
      //                click is answered before the switch.
      //   GR-14        the HIGHLIGHT BOX half only. Its comment box is written
      //                above the switch; the resize half of GR-14's operation
      //                names the body, the anchor and the four corners, and no
      //                table gives the anchor or a corner a size -- so nothing
      //                here can tell which of the three a press took.
      // ⚠️ GR-1 AND GR-2 WERE ON THIS LIST AND ARE NOT ANY MORE, and nothing in
      // the specification moved -- the note said the geometry of a pulled corner
      // was in no table of the specification, while table T-023d's closing rule
      // states the derivation in as many words, three paragraphs under the very
      // table the note named among what it had searched: the days come from the
      // day under the pointer (MUST), GR-1 counting from `start` and GR-2 back
      // from the plan's end, and FD-6
      // of table T-012a cuts them down (MUST). CM-16 and CM-17 were already
      // published by `edit-task.ts` to carry them. See the case above.
      // ⚠️ GR-9 / GR-17 / GR-18 WERE ON THIS LIST AND ARE NOT ANY MORE, and
      // nothing in the specification moved -- the note misread it twice. It
      // said the phase was unstated, but table T-023d's closing rule already
      // sends these three to table T-028's IN-1; and it quoted a GR-9 clause
      // that CR-198 had already narrowed to forbidding a CYCLE rather than the
      // press. FR-043's MUST leaves neither end a parameter, so one CM-14
      // answers all three. See the case above.
      // ⚠️ GR-5 AND GR-6 WERE ON THIS LIST AND ARE NOT ANY MORE. What held them
      // was named as the counting and a ruling about a drop onto a non-working
      // day; `workingDaysBetween` and `workingCalendarOf` are published by
      // `schedule.ts` (PI-1) and the rule under table T-023d now forbids the
      // dropped day to be moved to a working one at all (MUST NOT), so neither
      // is missing. See `actualEndPlacement`.
      // ⚠️ GR-8 WAS ON THIS LIST AND IS NOT ANY MORE, and nothing in the
      // specification moved -- the note was FALSE where it stood. It said no
      // row states which of the valid / invalid pair a drag produces, and
      // FR-044 states it in as many words (MUST): placing a resume date sets
      // `resumeValid` true. PA-3 of table T-019 is the row that carries the
      // pair and `edit-task.ts` already writes it. See the case above.
      // ⚠️ THE COMMENT BOX HALF OF GR-14 WAS ON THIS LIST AND IS NOT ANY MORE,
      // and nothing in the specification moved -- that note was FALSE too. It
      // said `item-hit-area.ts` records the comment box as undrawn, and that
      // file answers GR-14 on one: the geometry builds the body, the hit test
      // claims it, and CM-51 was already published to carry the distance. Only
      // the write was missing. See the branch above the switch.
      // Searched: table T-023d, FR-011, FR-013, FR-019, FR-043, FR-044, FR-045, FR-046,
      // table T-206, `edit-task.ts`, `edit-annotation.ts`.
      return CONSUMED_ELSEWHERE
  }
}

/**
 * FD-6 of table T-012a, in days: `fadeIn` is cut down to [0, the plan's span]
 * and `fadeOut` to [0, the span less the `fadeIn` that stands] -- `fadeIn` wins.
 *
 * ⭐ THE SPAN IS THE ONE THE AXIS DRAWS, which is what makes this the same rule
 * `schedule-geometry.ts` already applies in pixels: that file hands its own FD-6
 * the bar's drawn width, and `schedule-layout.ts` builds that width as the days
 * between `start` and `finish` times `pxPerDay`. Table T-012a spells its four
 * points as days on the horizontal axis (`start + fadeIn`, `end - fadeOut`), so
 * a day counted any other way would draw the corner somewhere other than under
 * the hand that let go of it.
 *
 * ⛔ ONE ROW'S DAYS AND NOT THE PAIR. The closing rule under table T-023d cuts
 * down the days THIS grab obtained, so the other column is read and never
 * written -- a second write would be an entrance no row gives this grab, which
 * is the reading GR-6 takes of `actualFinish` as well.
 *
 * ⚠️ IV-12 MEASURES THE SAME SPAN IN WORKED DAYS (`edit-task.ts`, at CM-16 /
 * CM-17 and again at CM-11), so on a plan that covers non-working days a pair
 * FD-6 allows can still be refused there. ⛔ Neither table says which of the two
 * counts a fade day is, and nothing here picks one for them.
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
 * The whole of what CM-13 is handed, taken from the command rather than
 * imported by name.
 *
 * ⭐ A DERIVATION AND NOT A CROSSING. Table T-064 is the full count of what
 * may cross a component folder and `PlanActualPlacement` is not on it, so the
 * shape is read off `DocumentCommand`, which this file already carries
 * (check 26b).
 */
type PlacedPlanActual = Extract<DocumentCommand, { kind: 'setTaskPlanActualState' }>['place']

/**
 * Where GR-5 or GR-6 leaves the actual, stated as the row of table T-019 the
 * Task ALREADY stands at.
 *
 * ⛔ NO STATE IS CHOSEN HERE. CM-13 places a whole row of table T-019 while
 * table T-023d gives these two grabs one column each -- `actualStart` and
 * `actualDuration` -- so the row is read back with `planActualState` (table
 * T-019a) and written again with the one value the grab moves. Choosing a row
 * instead would let a drag on an end silently suspend or finish a Task. ⚠️ The
 * join between the two tables is the STATE both of them print and not their
 * numbering: PS-1 and PA-1 are both 未着手, PS-5 and PA-2 both 進行中.
 *
 * ⭐ GR-6's COUNT IS THE INVERSE OF FR-011's PICTURE. That requirement (MUST)
 * puts the actual bar's right end at 「`actualStart` に `actualDuration` を稼働日
 * で加えた日」, which is `dateFromWorkingDays`; so the duration that a day
 * dropped on asks for is `workingDaysBetween` from the actual's start to that
 * day. Both count a half-open span, which is what makes them a pair.
 *
 * ⭐⭐ GR-5 LAYS THE DURATION DOWN AGAIN, WHICH IS THE SAME PAIR READ FROM THE
 * OTHER END. Its row says so since the ruling of 2026-08-29 -- 「実績の終了日は
 * 据え置き、`actualDuration` を置き直すこと（MUST）。実績バーを平行移動させて
 * はならない（MUST NOT）」 -- so the finish is worked out from what the Task
 * held, and the duration counted from the day dropped on to that finish.
 * ⛔ CARRYING THE DURATION SLID THE WHOLE BAR, and FR-011 is what that broke:
 * that requirement (MUST NOT) moves neither end unless a person placed it, and
 * the hand placed the left one. Measured 2026-08-29, before this: dragging the
 * left end 72px left moved the left edge 500 -> 572 and the right 2204 -> 2282.
 * ⚠️ GR-15 GOES ON CARRYING IT, and its own row is why: a milestone holds no
 * actual BAR, so there is no finish standing still to count to -- FR-043's
 * S-130 is its duration and no row of table T-023d asks this drag to move it.
 *
 * ⛔ THE DROPPED DAY IS NOT MOVED TO A WORKING ONE. The rule under table T-023d
 * forbids it outright (MUST NOT) -- people work on days off, and moving it would
 * store a day other than the one the hand chose. ⚠️ Nothing is clamped either:
 * an end dragged past the other one is the aggregate's to judge, which is the
 * same reading GR-3 and GR-4 take of IV-2.
 *
 * ⚠️ `null` WHERE THERE IS NOTHING TO MOVE, OR NOTHING TO WRITE THE ROW WITH.
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
  // ⭐ GR-15 IS GR-5, AND ITS OWN ROW SAYS SO. Table T-023d gives GR-15
  // 「`actualStart` を動かす」 and adds that a milestone holds no actual BAR, so
  // GR-5 / GR-6 / GR-17 cannot reach it -- the figure is the whole of what
  // there is to grab. ⛔ So the column it moves is the one GR-5 moves, and the
  // duration is carried rather than measured: a milestone's is FR-043's S-130
  // and no row of table T-023d asks this drag to change it.
  const calendar = workingCalendarOf(schedule)
  // ⭐ WHERE THE ACTUAL ENDS AS THE TASK STANDS, which is FR-011's own picture
  // read forwards. ⛔ `null` where the Task carries no duration to end after --
  // the guard below is what answers that, and this stays out of its way.
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
      // ⚠️ `actualFinish` IS CARRIED, NOT RECOMPUTED. Table T-023d gives GR-6
      // the duration alone; taking the finish day from the day dropped on as
      // well would be a second entrance to a column no row gives this grab.
      return task.actualFinish === null
        ? null
        : { row: 'PA-5', actualStart, actualDuration, actualFinish: task.actualFinish }
  }
}

/**
 * PD-4 -- nothing was hit and a figure is armed, so the drag makes one.
 *
 * ⭐ WHICH END OF THE DRAG NAMES THE ROW is FR-001's, in its STATEMENT: the
 * `TaskGroup` the vertical position the drag BEGAN at points at (MUST), and a
 * new row when it points at none (MUST). So the press is read, not the release
 * -- which is also the end table T-023a reads to decide what the gesture is.
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
  // FR-001 (MUST): the row the position the drag BEGAN at points at, and a new
  // row when it points at none.
  const groupId = row === null ? context.newGroupId : row.groupId
  const early = compareDay(from, to) <= 0 ? from : to
  const late = compareDay(from, to) <= 0 ? to : from

  if (armed.kind === 'taskShape' || armed.kind === 'milestoneShape') {
    const named = armed.kind === 'taskShape' ? armed.shapeKind : 'milestone'
    const shapeKind = taskShapeKindOf(named)
    // ⚠️ An armed shape whose spelling table T-012 does not admit creates
    // nothing. `ScreenState` types it as a bare string, so a caller CAN hold
    // one; writing it into the document would put a value the column refuses
    // where the schema expects one of five.
    if (shapeKind === null) return CONSUMED_ELSEWHERE
    const commands: DocumentCommand[] = [
      {
        kind: 'createTask',
        shapeKind,
        // ⚠️ A milestone is one day: table T-012's SH-5 is a point, so the two
        // dates are the same one and the drag's length says nothing.
        start: textOfDay(shapeKind === 'milestone' ? from : early),
        finish: textOfDay(shapeKind === 'milestone' ? from : late),
        groupId,
      },
    ]
    // STOP -- ⛔ AR-3's GLYPH CANNOT BE SET HERE. `setTaskVisualMilestoneGlyph`
    // (CM-21) needs the `uid` of the Task just created, and `createTask` does
    // not answer one -- a command list is planned before any of it runs. The
    // figure the palette was holding is therefore lost, and AT-101's default is
    // what gets drawn. Searched: table T-108 CM-6 and CM-21, `edit-task.ts`,
    // `apply-document-change.ts` (`ApplyOutcome` carries the document, not the
    // uids), FR-084.
    return changed(commands)
  }

  // STOP -- ⛔ AR-5 AND AR-6 CANNOT BE WRITTEN. `createCommentBox` and
  // `createHighlightBox` (CM-46 / CM-52) each need an `id` this component
  // cannot mint -- the same reason `createTask` is handed its `groupId` -- and
  // `InputContext` carries one identifier, for FR-001's row. Their anchors also
  // want a shape (`AnnotationAnchor`, `HighlightRange`) whose fields FR-019
  // states in terms of a date and a row, which a drag would have to be read
  // into. Searched: FR-019, table T-108 CM-46 / CM-52, `edit-annotation.ts`.
  return CONSUMED_ELSEWHERE
}

/**
 * Every Task a body drag carries (SL-7).
 *
 * ⚠️ Only Tasks. SL-7 says 「選択されている全部を動かす」 and a dependency has
 * no dates of its own to move, while SL-1 excludes the status line from being
 * carried along at all.
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
 * Which row the DOCUMENT has a Task on.
 *
 * ⛔ NOT `ScheduleLayout.placements`, which is what this read before and is a
 * picture rather than a fact: while a body drag is in flight the layout already
 * draws the Task on the row under the pointer (that is what the drag SHOWS), so
 * on the release the drawn row and the dropped row agree and GR-12's guard
 * below cancelled the very move it was guarding -- the bar sprang back to the
 * row it started on. `TaskGroupMember` is the row a Task is on (IV-6 makes it
 * exactly one), and HM-3 of table T-015a is about moving THAT.
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
 * ⛔ NOT SETTLED FOR THE KEYBOARD. S-53 is stated for the wheel (S-96 calls it
 * 「1 ノッチで何倍動くか」) and SK-16 / SK-16a say only 拡大 / 縮小. The
 * recommendation is the same step, so that the two routes to the same operation
 * do not disagree -- FR-029's reason for having one entrance per operation
 * applies to the size of the step as much as to the entrance.
 * Searched: table T-036 SK-16 / SK-16a, table T-201 S-53, table T-203 S-75 /
 * S-76, FR-016.
 *
 * @provisional PD-11
 * @purity pure
 */
function keyZoomFactor(context: InputContext, isIn: boolean): number {
  const step = context.zoomStep
  return isIn ? step : 1 / step
}

/**
 * The zoom now in force, stepped once.
 *
 * ⛔ NOTHING IS ROUNDED HERE AND NOTHING MAY BE. FR-018 (MUST NOT) names the
 * three places a zoom is stepped -- the wheel, the button and the rounding of a
 * saved value -- and forbids all three from rounding towards the side that
 * crosses a level-of-detail threshold, because 「1 刻みで表示量が跳ねる」. Two of
 * the three come through here. ⚠️ A tidying `Math.round` would be that
 * MUST NOT broken silently: the requirement measured one notch taking the rows
 * from 9 to 21.
 *
 * @purity pure
 */
function zoomTimes(context: InputContext, factor: number, axis: 'x' | 'y'): number {
  const settings = context.document.documentSettings
  return (axis === 'x' ? settings.zoomX : settings.zoomY) * factor
}

/**
 * One `setZoom`, with the axis that did not move left where it was.
 *
 * ⚠️ Both axes always travel, because CM-65 carries both. A null here means
 * "this axis did not change" and is filled from the document, not from a
 * default -- MK-3 and MK-4 each move ONE axis and must leave the other alone.
 * ⭐ The clamp to S-75 / S-76 is deliberately NOT applied here: `editDocument`
 * does it, and FR-016 asks for 収める rather than a refusal, so a notch past the
 * end is ordinary rather than an error to be caught early.
 *
 * @purity pure
 */
function zoomCommand(
  context: InputContext,
  zoomX: number | null,
  zoomY: number | null,
): DocumentCommand {
  const settings = context.document.documentSettings
  return {
    kind: 'setZoom',
    zoomX: zoomX === null ? settings.zoomX : zoomX,
    zoomY: zoomY === null ? settings.zoomY : zoomY,
  }
}

/**
 * The schedule as FR-055 has to measure it: every collapse thrown away.
 *
 * ⭐ HF-8 of table T-051 (MUST) is the rule, and this is only its MEASUREMENT
 * half. The WRITER of the same rule is CM-72 (`expandAllTaskGroups`, in
 * `src/use-case/edit-document/edit-task-group.ts`), which FR-031 makes the
 * second of the press's two writes. ⚠️ SO THE PREDICATE IS WRITTEN TWICE, once
 * there and once here; if what a discard covers is ever re-ruled, both move.
 * ⛔ `isHidden` is deliberately left standing -- HF-8 discards the collapse
 * ONLY, and HR-6 has the hidden state saved so WY-1 can give it back.
 * ⛔ Nothing is written from here: the copy is thrown away with the frame, and
 * only CM-72 opens a row in the document.
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
 * ⭐ The place is handed back rather than computed. OP-10 of table T-024a reads
 * a null `scrollDate` as 「人がまだ場所を決めていない」 and requires the reader
 * to show what FR-055 would choose (MUST), which is exactly what this key asks
 * for -- so nulls say it once, in the place the rule already lives, instead of
 * a second copy of the anchor arithmetic that `frame-loop.ts` runs.
 *
 * ⭐ BOTH PASSES OF THE RULE PRINTED AFTER TABLE T-068 ARE RUN INSIDE
 * `fitZoom`, AND NEITHER IS READ OFF THE FRAME. ⛔ The frame's own layout
 * cannot serve for two reasons. LC-1 drops every descendant of a collapsed row,
 * so measuring it divides by the FOLDED picture and answers a zoom for a
 * document nobody asked to fit -- FR-055's RATIONALE names that harm outright,
 * what "the whole" means would move with what the reader had folded. And the
 * frame is laid out at the zoom IN FORCE, which is the value the fit is about
 * to overwrite; a fit that read it would be a recurrence rather than an answer.
 * ⚠️ THIS IS A MEASUREMENT AND NOT A WRITE. FR-031's MUST NOT on the order of
 * the two writes is untouched: the copy measured here never leaves this
 * function, and CM-72 is still the only thing that opens a row.
 *
 * ⛔ THE DISCARD MUST NOT BE MOVED INTO `fitZoom`. `viewSettings` in
 * `src/framework/single-html-shell/frame-loop.ts` shares that member for OP-10
 * of table T-024a, and HF-8 forbids the discard at startup (MUST NOT) -- OP-10
 * gives the reason in its own words: doing it there would throw away, on every
 * open, the state HR-6 has the document save so WY-1 can return it. ⭐ THAT is
 * the whole of what this file still owes the fit; the depth sweep and the two
 * passes are the layout engine's (CP-5).
 *
 * ⚠️ COST: MN-6 of Chapter 5.6 exists to stop table T-068 being run again, and
 * this runs it several times -- once per group depth the document holds, plus
 * the horizontal run and at most one second pass. It is authorised: the rule
 * after that table lets the fit, and only the fit, take further runs, and it
 * counts PASSES rather than runs (pass 1 is 「その文書が持つすべての深さを通し
 * て」 in as many words). S-125 caps the sweep, so NFR-013's growth is unchanged
 * and this happens once per PRESS rather than once per frame.
 *
 * @purity pure
 */
function fitCommand(context: InputContext): DocumentCommand {
  const settings = context.document.documentSettings
  const fitted = fitZoom(
    collapsesDiscarded(context.document.schedule),
    settings,
    context.regions,
    { step: context.zoomStep, min: context.zoomMin, max: context.zoomMax },
  )
  return {
    kind: 'fitScheduleToScreen',
    zoomX: fitted.zoomX,
    zoomY: fitted.zoomY,
    scrollDate: null,
    scrollGroupId: null,
    // ⭐ CLEARED WITH THE ANCHORS THEY BELONG TO. A `null` anchor is OP-10's
    // 「人がまだ場所を決めていない」, and a fraction left standing from the pan
    // before would slide FR-055's fitted answer by up to one row and one day --
    // which is the one thing a fit must not do.
    scrollDayOffset: 0,
    scrollGroupOffset: 0,
  }
}

/**
 * SK-3 -- one delete per selected thing, in the order they were picked.
 *
 * ⚠️ The chain each one drags with it is table T-050's and is applied by the
 * aggregate, not here: CD-1 alone reaches six other rows.
 * ⛔ THE BUNDLE IS PLANNED UNASKED, AND FR-032's CONFIRMATION IS SOMEONE ELSE'S.
 * That requirement (MUST) has a `Task` with WBS descendants confirmed before it
 * is deleted, with the names of what will vanish shown -- and the question IS
 * raised: `confirmationOwedBy` in `frame-loop.ts` reads this very bundle before
 * it is written, fills `ScreenSession.confirmation`, and holds the writes until
 * IC-69 or IC-70 answers. ⭐ WHY THE TEST IS THERE AND NOT HERE: NT-7 asks about
 * what is going to happen, so it has to be asked of the WHOLE action -- a
 * gesture can owe two writes (`InputAction.writes`) and a person answering once
 * per bundle is not what 「続けるか取りやめるかを選ばせること」 means. ⚠️ So a
 * caller that runs what this member plans without asking breaks that MUST.
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
        // SL-1 sends the status line's deletion to FR-046's 「消す」, and CM-4
        // is that operation.
        commands.push({ kind: 'clearStatusDate' })
        break
    }
  }
  return commands
}

/**
 * The next selection, by the rules of table T-023c.
 *
 * ⛔ This is the schedule's selection and NOT the rows'. SL-1 leaves
 * `TaskGroup` out and FR-085 says in as many words that the Row Title Panel's
 * selected rows are a different set -- which is why nothing below ever answers
 * with a row.
 * ⚠️ Outside the undo record (UN-9), so a change here is never a
 * `DocumentCommand` and never reaches `applyDocumentChange`.
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
    return held
  }
  if (input.kind !== 'pointer' || input.phase !== 'up') return held

  const press = context.pressed
  if (press === null) return held
  // ⛔ A press on something the screen surface drew is not a press on the
  // schedule, whatever `regionAtPointer` answers for the point: the note under
  // table T-023a limits its decision order to the drawing area (MUST), and
  // SL-3's marquee is one of the rows of that order. ⚠️ FR-083's SP-2 and SP-3
  // change what is selected without changing WHICH things are selected.
  if (press.on !== null) return held
  if (!isOnRowArea(context, press.at.x, press.at.y)) return held

  const isAdding = press.at.modifiers.shift // SL-4

  // ⭐ The same answer `press.pressRow` carries, for the reason spelled out at
  // the other of these two switches: one reading of table T-023a, and nothing
  // it reads can move while the press is in flight.
  switch (pressRowOf(press, context)) {
    case 'PD-3': {
      const ref = press.hit === null ? null : itemRefOf(context.document.schedule, press.hit.item)
      if (ref === null) return held
      // SL-4 -- with Shift a click adds or removes one at a time. SL-2 --
      // without it, this one REPLACES whatever was selected.
      if (isAdding) {
        return isSelected(held, ref) ? selectionWithout(held, ref) : selectionWith(held, ref)
      }
      return selectionWith(emptySelection(), ref)
    }
    case 'PD-5': {
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
      // PD-1's pan, PD-2's fixed cursor and PD-4's creation leave the selection
      // alone. ⚠️ FR-083's note records that a Task just drawn stays selected,
      // which is the aggregate's doing rather than this member's -- nothing
      // here can name a Task that does not exist yet.
      return held
  }
}

/**
 * What Esc consumes, in the levels IN-4 fixes.
 *
 * ⭐ The order is NOT re-implemented: `escapeTarget` (PI-36) owns it, and this
 * only supplies the two things it cannot see -- a gesture in flight and the
 * Dual Cursor mode -- both of which are the shell's current values (LY-5).
 *
 * ⛔ TWO OF `EscapeContext`'s LEVELS ARE LEFT UNSET, and that is the value's own
 * rule rather than an omission: a standing `Confirmation` and the
 * `Properties Panel` are current values this pure member holds nothing of, and
 * each may be reckoned by ONE caller or IN-4's 1 階層 per press is spent twice.
 * ⚠️ SO A CALLER THAT HOLDS EITHER MUST NOT ASK THE MEMBERS THIS FEEDS about a
 * press at that level. `frame-loop.ts` is where the rule is kept.
 *
 * @purity pure
 */
function escapeContextOf(context: InputContext): EscapeContext {
  return {
    // IN-4's first level (利用者の裁定 2026-08-27). ⭐ THIS CALLER CAN SEE IT,
    // unlike `isConfirmationStanding` -- the state is a member of `InputContext`
    // because IN-5a already needed it, so the level is reported rather than left
    // for the holder to reckon.
    isTextEntryUnsettled: context.isTextEntryUnsettled,
    gestureInFlight: context.pressed !== null,
    // ⭐ A SIDE STANDING IS THE MODE BEING UP. IN-4 spends a press on the MODE
    // and DC-4 takes the whole of it, so the narrower question is the one that
    // travels and the side itself stays here.
    dualCursorMode: context.dualCursorFollowing !== null,
  }
}

/**
 * The next screen state after a press on one of the entries this tool drew.
 *
 * ⭐ FR-083's SP-1 and SP-4 are the whole reason this exists: a palette entry
 * pressed with NOTHING selected arms what it stands for (SP-1), and the same
 * entry pressed again disarms it (SP-4). ⚠️ With something selected the arming
 * is left exactly as it is -- SP-2 and SP-3 say so in as many words, and
 * `commandFromArmingEntry` is where that half is answered.
 *
 * ⛔ AR-4, AR-5 AND AR-6 ARM WHATEVER IS SELECTED. FR-083's four rows speak of
 * 「パレットの形状」 only, and a dependency (AR-4) and the two annotations
 * (AR-5 / AR-6) are not shapes -- table T-023b's note gives them no meaning
 * against a selection either. So the only meaning their entry has is the arming
 * table T-023b gives it, and refusing it while something was selected would
 * leave an entry that does nothing -- the fault FR-029's RATIONALE names.
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
    // FR-071: 「同じ入口で解除できること」, so this one entry does both ways.
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
    // IC-2 -- SK-12's other entrance. FR-096 (MUST) keeps it the ONE way out,
    // and U-54 is the name table T-103 settled for what it opens.
    // ⚠️ IC-3 is NOT this any more: FR-025 gives the clipboard its own
    // entrance, which opens no surface at all.
    case ENTRY.exportChooser:
      return screenStateWithSurface(state, EXPORT_CHOOSER)
    // IC-52 is the same level of IN-4 that Esc's first press consumes.
    // ⛔ THE ROW STANDS ON SIX SURFACES AND THIS VALUE HOLDS FIVE OF THEM. Table
    // T-109 places it on the `Properties Panel` as well, and S-99g does not hold
    // that panel -- so a press drawn THERE closes the panel and nothing else,
    // and the shell is the side that spends it (LY-5 of table T-060 leaves it
    // the panel's contents). ⚠️ Without this the one press would take the panel
    // AND whatever surface stood behind it, which is two things for one press.
    case ENTRY.closeSurface:
      return context.pressed?.on?.part === PROPERTIES_PANEL
        ? state
        : screenStateWithSurface(state, null)
    default:
      break
  }

  const armed = armedByEntry(entry)
  if (armed === null) return state
  // SP-2 / SP-3 -- 「構えは変えない」.
  if (context.selection.items.length > 0) return state
  // SP-4 -- the same entry pressed again, with nothing selected, disarms.
  // SP-1 -- otherwise it arms.
  return screenStateWithArmed(state, isSameArm(state.armed, armed) ? { kind: 'none' } : armed)
}

/**
 * The next screen state (CP-36): what is armed, the palette, full screen and
 * the surface that is open.
 *
 * ⭐ Esc's levels are IN-4's and are consumed one per press.
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
    return on === null || on.entry === null ? state : screenStateFromEntry(on.entry, context)
  }
  if (input.kind !== 'key') return state
  // SK-12 -- FR-096's one way out, and the only row of table T-036 that lands
  // here while holding a modifier. ⭐ It joined SK-13 .. SK-15 when table T-103
  // settled `Export Chooser` (U-54): the surface FR-096 opens now has a name
  // S-99g can hold, so opening it IS a change of screen state and IN-4's first
  // level closes it again. ⚠️ Read before the plain-key gate below, which every
  // other row here passes through.
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
      case 'gesture':
      case 'dualCursorMode':
      case 'confirmation':
      case 'propertiesPanel':
      case null:
      default:
        // ⛔ NONE OF THOSE FOUR LEVELS IS IN THIS VALUE. A gesture in flight,
        // the Dual Cursor mode, a standing `Confirmation` and the
        // `Properties Panel` are all current values the Framework holds (LY-5),
        // which is why `EscapeContext` exists at all -- the shell drops the
        // press, leaves the mode, settles the question or puts the panel away,
        // when `escapeTarget` names its level.
        // Answering with the state unchanged is not "nothing happened": the
        // level WAS consumed, by a holder this function cannot reach.
        //
        // ⚠️ `'confirmation'` AND `'propertiesPanel'` CANNOT ARRIVE HERE TODAY,
        // and both are listed rather than left to `default:` because each is one
        // of the values the type admits. `escapeContextOf` leaves
        // `isConfirmationStanding` and `isPropertiesPanelOpen` unset on purpose:
        // this member is pure and can see neither the question nor the panel,
        // and `EscapeContext` (MUST) has a press at either level reckoned by ONE
        // caller, or IN-4's 1 階層 per press would be spent twice.
        // ⛔ WHICH IS WHY THE CALLER MUST NOT ASK THIS MEMBER AT ALL for such a
        // press: unset reads as 「not open」, so this member would answer for the
        // NEXT level down and disarm on the press that closed the panel.
        // `frame-loop.ts` states the same rule where it skips the call.
        return state
    }
  }

  // SK-13 -- FR-036's help. ⭐ `Help Modal` is U-30 of table T-103, a settled
  // name copied spelling and all, which is the same name `open-modals.ts` keys
  // its one rule on.
  // ⚠️ It OPENS and does not toggle. SK-13 says 「ヘルプを開く」 while SK-14 and
  // SK-15 say 「切り替える」, and the difference is not an accident: IN-4 gives
  // Esc's first level to closing the open surface, so a second way to close it
  // would be the extra entrance FR-029 forbids.
  if (input.key === KEY.f1) return screenStateWithSurface(state, HELP_MODAL)
  // SK-14 -- S-99e.
  if (input.key === KEY.p) return screenStateWithPalette(state, !state.paletteShown)
  // SK-15 -- S-99f. ⚠️ The flag is this tool's record of FR-071, not the act:
  // IN-4a says leaving full screen through Esc is the BROWSER's behaviour, so
  // the shell drives the host and this value follows it.
  if (input.key === KEY.f11) return screenStateWithFullScreen(state, !state.fullScreen)

  return state
}

// STOP -- ⛔ 15 ROWS OF TABLE T-109 REACH `commandFromEntry` AND THIS FILE
// ANSWERS NONE OF THEM. ⚠️ The number is the 74 rows of that table less the 59
// this file assigns (`ENTRY` holds 44 and `ARMED_BY_ENTRY` 15), and the two
// groups below add up to it: 6 + 9.
// ⭐ IC-45 LEFT THE SECOND GROUP THIS ROUND. It stood there on the ground that
// CM-60 demands both dates at once, and DC-1 refutes that ground: entering the
// mode places both, so the entry writes the pair it needs and nothing is
// half-placed. What it wanted all along was the following side, which is now
// `InputContext.dualCursorFollowing`.
// ⭐ The entries that ARE answered were chosen by a rule rather than one at a
// time. An entry is answered when
//   ① this file already answers the same operation for a row of table T-036, or
//   ② it opens a surface whose name table T-103 has settled, or
//   ③ its own row names the value the press writes and the setting it goes into
//      -- FR-049's five toggles and S-59's two halves, FR-039's two-valued
//      theme, and FR-048's four exclusive modes, none of which needs a decision
//      this file would have to make up
// -- plus FR-083's arming, which is the whole point of the seam member that
// brought the press here, and plus the three entrances table T-109 draws once
// per ROW, which `ScreenPart.rowGroupId` made reachable.
// ⭐ ④ WAS ADDED WHEN THE SHELL BEGAN TO HOLD WHAT THEY MOVE: an entry is
// answered when its whole effect is one value of `ScreenSession` that no table
// keeps -- IC-17's panel subject, IC-20's `Agent API` record, and the five of
// U-49 that move who is chosen there. Each answers with an `InputAction` of its
// own kind rather than a `DocumentCommand`, which is the shape `moveCommandPalette`
// already had and for the same reason: table T-108 has no row, so
// `applyDocumentChange` (PI-8) has nothing to plan, and LY-5 of table T-060
// leaves a current value with the Framework.
// ⭐ ④ IS WHAT LET IC-50 OUT OF THE LIST BELOW, where it stood as
// undecidable: S-142 of table T-206 and `ScreenSession.isMilestoneListOpen`
// have given the palette's own folding somewhere to be held.
//
// ⚠️ EVERY COUNT ABOVE WAS MEASURED AGAINST THE TREE, not carried forward, and
// this note has been wrong twice before. Once its headline number disagreed
// with its own groups, and it called three rows a missing route that another
// unit had already written end to end. Then its closing paragraph called twelve
// rows undecidable and named CM-61 and CM-66 as the commands they wanted --
// neither of which has anything to do with a display setting (they clear the
// Dual Cursor and move the scroll position). The twelve wanted CM-57, CM-58,
// CM-59 and CM-63, and all four are now written above.
//
// ⭐ 6 OF THEM ARE ANSWERED, AND DELIBERATELY NOT HERE -- none of the six is a
// `DocumentCommand`, and LY-5 of table T-060 leaves a current value with the
// Framework, so `frame-loop.ts` spends them in `answerSettledEntry`:
//
//   IC-21        FR-038's display language (S-99). ⚠️ It looks like one of ④'s
//                rows and differs in ONE way, which is why it is spent there
//                rather than answered here: S-99 is written back to
//                `localStorage`, so the press is an ACT and not only a value,
//                and LR-6 keeps the browser out of this layer.
//   IC-69 / IC-70  NT-7's two answers, on U-55 `Confirmation`. ⭐ THE QUESTION
//                IS RAISED: three places fill `ScreenSession.confirmation` --
//                DI-4's overwrite, OP-4's discard, and FR-032's delete through
//                `confirmationOwedBy`. A press on either arrives as
//                `ScreenPart.entry` (IF-9) and settles the raiser's own promise,
//                which is why what the choice DOES stays with the raiser.
//   IC-71 .. IC-73  OP-3's three answers, on U-56 `Open Chooser`.
//                `OPEN_CHOICE_OF_ENTRY` in the same file maps each row to its
//                `OpenChoice` and closes the surface with the answer.
//                ⛔ NOTHING OPENS U-56 BY ENTRY, and no entrance is owed: OP-3
//                has the READ raise the choice, so an entry that opened it
//                would be one the specification does not place.
//
// ⛔ 9 OF THEM CANNOT BE WRITTEN AT ALL, whatever rule is chosen:
//
//   IC-18        FR-066's dialogue field, 「出す・しまう」. ⛔ NOTHING HOLDS THAT
//                SWITCH: `ScreenState` has no member for it, `ScreenSession` has
//                none, and table T-203 and table T-206 hold no key. ⚠️ What
//                decides whether the field is drawn today is
//                `ScreenSession.isAgentApiEnabled` -- `dialogue-field.ts` puts
//                the field up only while the `Agent API` is on -- so an entry
//                answered here would be a SECOND way to take the same field
//                away, which FR-029 (MUST NOT) refuses. ⚠️ IC-17 and IC-20 stood
//                beside this row until `ScreenSession` grew the members FR-072
//                and FR-065 need; this is the one of the three still without a
//                place to land.
//   IC-37 / IC-38  FR-034's alignment. ⛔ Table T-108 holds NO command for it,
//                so there is nothing to plan even with the press in hand.
//   IC-41        ⭐ IT NOW HAS SOMEWHERE TO WRITE AND STILL CANNOT BE PRESSED.
//                `watermarkVisible` is a boolean row of table T-202, so FR-049's
//                toggle rule covers it and `commandFromVisibleElementEntry` is
//                the shape it wants. TWO things stand in the way, and neither is
//                this file's to move:
//                ⛔ FR-020 asks for the unlock password before the watermark may
//                be hidden and matches it as a SHA-256, and nothing carries a
//                password back from a person: table T-037 has no row for asking
//                for one (NT-7 asks only for the two answers IC-69 and IC-70
//                carry), `ScreenPart`
//                (IF-9) reports an entry and never what was typed into one, and
//                `frame-loop.ts` records at S-99c that nothing asks for it.
//                ⚠️ It is only the HIDING half that FR-020 gates, so a rule that
//                turned the row round both ways would let the watermark be put
//                back unasked -- which is right -- and taken away unasked, which
//                is the MUST. A toggle cannot tell the two apart.
//                ⛔ `VisibleElement` does not name `watermarkVisible`.
//                `edit-document-settings.ts` still calls them the eight boolean
//                rows of table T-202 and lists eight, and that table now holds
//                nine (S-144, added 2026-08-25) -- so `setElementVisible` has no
//                value to carry even once the password has a road.
//                ⚠️ NO GENERATOR WILL BRING THE NINTH NAME, AND THAT WAS
//                MEASURED: `npm run gen:check` passes 13 of 13, and
//                `edit-document-settings.ts` is not one of the targets
//                `tools/generate_entity_types.py` lists -- the union is
//                HAND-WRITTEN there, so only a hand adds the row. ⭐ The
//                generated side already has it: `DocumentSettings` carries
//                `watermarkVisible` from `_source/settings.json`. ⚠️ NOT
//                WORKED AROUND HERE: the type is derived from the command on
//                purpose (see `VisibleElement` above), and re-declaring the
//                ninth name in this file would be the drift that deriving
//                exists to stop.
//   IC-66        the `Resource Roster`'s delete, and the ONE of that surface's
//                six still unanswered. ⚠️ Its five neighbours are answered above:
//                they move `ScreenSession.selectedResourceUids` (PD-143), which
//                is the shell's and no `DocumentCommand` at all. ⛔ THIS ONE IS
//                A WRITE -- `deleteResource` (CM-42), handed the `uid`s that
//                choice holds -- and what stops it is not the `uid`s: FR-099
//                (MUST) requires the names of the tasks it would unassign to be
//                shown and confirmed first (QN-3 of table T-234, NT-7 of table
//                T-037), and no road in this build raises that question.
//                `frame-loop.ts` records the same gap at `ConfirmationQuestion`
//                and `notices.ts` from the drawing side. ⚠️ Answering the press
//                without it would run the deletion unasked, which is the very
//                MUST that half of FR-099 is.
//   IC-54 .. IC-57  ⛔ NOT ENTRIES. Table T-109 says so in its own column: one
//                shows the figure the palette is holding (table T-023b) and
//                three show the autosave state (FR-061). ⚠️ IC-53 stood here
//                until GR-19 of table T-023d gave the band it marks a gesture.
//                It is still not a button -- what answers it is a drag, settled
//                on the release.
//
// ⛔ AND ONE ROW THAT TABLE T-109 DOES NOT HOLD AT ALL, which is a gap on the
// far side of this file rather than one of the 15 above:
//
//   DC-7's clear  「置いた 2 本を消す入口を、モードを出る入口とは別に置くこと
//                (MUST)」. `clearDualCursor` (CM-61) is written and
//                `edit-document-settings.ts` states its rule; what is missing
//                is the ENTRANCE. ⛔ Table T-109's 74 rows hold none, and
//                giving it one needs a 75th glyph in figure F-019 -- which
//                RC-13 of table T-026 reserves to the user. ⚠️ Until it
//                exists, EP-6 of table T-076 goes on drawing the two lines
//                into every export with no way to take them away, which is
//                the very consequence DC-7 names. ⭐ RAISED AS PD-345, with
//                what the ruling has to settle; ⚠️ table T-036 was measured
//                too and holds no keystroke either -- SK-20 puts the status
//                line's clearing on IC-44, and the Dual Cursor has no such
//                row. DC-3's day count is beside it as PD-344.
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
// </generated>
