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
// text is being typed, whether the Dual Cursor is up -- reaches them as an
// argument, because LY-5 of table T-060 leaves the Framework as the only layer
// that may hold a current value. `InputContext` is that argument.
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
  type EscapeContext,
  type ScreenState,
} from '../../entity/document-model/screen-state/screen-state'
import {
  dayOf,
  taskByUid,
  textOfDay,
  type CalendarDay,
  type Schedule,
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
  type RowPlacement,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionAtPointer,
  type ScreenRect,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { ScreenPart } from '../screen-renderer/screen-renderer'
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
 * ⭐ All three members are the moment of the PRESS. IN-1 settles the operation
 * on release, so the release has to be read against something, and CS-2 makes
 * that something the state at the press.
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
   * Table T-029a's Dual Cursor mode. PD-2 turns hit testing off entirely while
   * it is up, and IN-4 gives it the last level of `Esc`.
   *
   * ⚠️ Read from the caller rather than from `documentSettings`, because
   * `EscapeContext` in `screen-state.ts` already settled that this is not a
   * saved key -- `dualCursor` holds the two dates, not whether the mode is on.
   */
  readonly isDualCursorMode: boolean
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
  /** MK-13 「名称ラベル ＝ 名称の編集」, reached through GR-10. */
  | { readonly kind: 'taskName'; readonly uid: number }

// STOP -- ⛔ THREE OF MK-13's FIVE ENTRANCES CANNOT BE REACHED, and not because
// they were left out here. 「担当ラベル」 is GR-11 and 「コメントボックス」 is
// half of GR-14, and `item-hit-area.ts` records in its own header that neither
// has a target at this milestone -- ScheduleGeometry draws no assignee label
// and no comment box, so no `Hit` can ever name one. 「行見出し」 is in the Row
// Title Panel, which the note under table T-023a puts outside this decision
// order altogether (FR-085 owns it). Adding kinds for them here would declare a
// vocabulary nothing can produce, which is the guess R4's YAGNI forbids.

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
  /** SK-19. */
  | { readonly kind: 'settleTextEntry' }
  /** SK-9 and MK-13. */
  | { readonly kind: 'editInPlace'; readonly target: InPlaceTarget }
  /**
   * MK-13 「タスク本体 ＝ プロパティパネルを開く」.
   *
   * ⚠️ Which of the two things the panel then shows is FR-072's rule, and
   * `screen-renderer.ts` records that NOTHING holds the answer -- neither table
   * T-203 nor table T-206 has a key for it. So this says only that the panel
   * was asked for, about a Task that is already in the selection this member's
   * sibling returns.
   */
  | { readonly kind: 'openPropertiesPanel'; readonly uid: number }
  /**
   * GR-19 of table T-023d -- the band on top of the `Command Palette` was
   * dragged, so FR-053's palette moves by what the pointer travelled.
   *
   * ⭐ A DISTANCE AND NOT A PLACE. Where the palette stands is
   * `ScreenSession.commandPaletteAt`, which the shell holds because no row of
   * table T-203 or table T-206 keeps it -- so this file has no corner to add
   * to, and answering with the travel alone leaves the one holder holding it.
   *
   * ⚠️ THE SHAPE IS MK-7's PAN AND THE ROAD IS NOT. That row's rule reads
   * 「パンは等倍とすること（MUST）」, which is why nothing is scaled here
   * either. ⛔ But `scrolledAnchor` is not reused: it answers a date and a
   * row, because S-77 / S-78 hold the schedule's place as an anchor in the
   * document, and the palette's place is a pair of screen numbers that no
   * document row holds at all.
   *
   * ⛔ NOT A DOCUMENT CHANGE, which is why it is a kind of its own rather
   * than a `DocumentCommand`: table T-108 has no row for it and table T-203
   * no key, so `applyDocumentChange` (PI-8) has nothing to plan.
   */
  | {
      readonly kind: 'moveCommandPalette'
      readonly by: { readonly dx: number; readonly dy: number }
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
 * ⚠️ The ORDINAL is what this answers, because the two callers want different
 * halves of it: `rowAtTopEdge` wants the row, and `rowTurnedTo` wants the place
 * in the stack, so that it can name the row one step along.
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
 * The same question, answered with the row rather than with its place.
 *
 * @purity pure
 */
function rowAtTopEdge(layout: ScheduleLayout, y: number): RowPlacement | null {
  const at = rowIndexAtTopEdge(layout.rows, y)
  return at === null ? null : (layout.rows[at] ?? null)
}

/**
 * Where the scroll anchor lands when the schedule is moved by this many pixels.
 *
 * ⭐ S-77 pins the LEFT edge of the Row Area to `scrollDate` and S-78 pins the
 * top of it to a row, so a scroll is expressed by naming what stands at those
 * two edges afterwards -- there is nowhere to keep a part of a row.
 * ⛔ The vertical half asks `rowAtTopEdge` and NOT `rowAtY`: a landing point in
 * the `rowGap` is on no row's band, and reading that as "the axis cannot say"
 * left the anchor where it was -- so MK-1's vertical scroll was refused for
 * every turn whose distance happened to end in a gap, however many rows long
 * the turn was.
 * ⚠️ Either half answers null when the axis cannot say, and a null is passed on
 * as the value already in force rather than as "no chosen place": OP-10 of
 * table T-024a reads a null `scrollDate` as 「人がまだ場所を決めていない」, and
 * a scroll that ran off the end has not un-decided anything.
 * ⛔ MK-1 DOES NOT TAKE THE VERTICAL HALF FROM HERE -- `rowTurnedTo` below says
 * why, and the short answer is that this member is PD-1's, whose pan MK-7 holds
 * to the distance the pointer itself went (MUST).
 *
 * @purity pure
 */
function scrolledAnchor(
  context: InputContext,
  dx: number,
  dy: number,
): { readonly scrollDate: string | null; readonly scrollGroupId: string | null } {
  const settings = context.document.documentSettings
  const area = context.regions.rowArea
  const day = dayAtX(context.layout, area.x + dx)
  const row = rowAtTopEdge(context.layout, area.y + dy)
  return {
    scrollDate: day === null ? settings.scrollDate : textOfDay(day),
    scrollGroupId: row === null ? settings.scrollGroupId : row.groupId,
  }
}

/**
 * Where MK-1's turn leaves the row at the top edge.
 *
 * ⛔ `scrolledAnchor` IS NOT THE WHOLE OF MK-1, and the difference is not an
 * error in its arithmetic: it answers the row the moved top edge LANDS IN,
 * which is exactly what PD-1 needs: MK-7 makes the pan move the schedule exactly
 * as far as the pointer went (MUST), so a pan has to keep answering the row the
 * pointer really reached.
 * ⚠️ S-78 anchors the display to a WHOLE row and table T-206 has nowhere to
 * keep part of one, so a turn shorter than the row standing at the top edge
 * lands back inside that same row and the answer equals the value already in
 * force. Measured on the template FR-027 starts a reader with, most of the
 * bands drawn are TALLER than the distance a common wheel reports for one
 * detent, so turn after turn moved nothing at all and MK-1's
 * 「**縦スクロール**」 did not scroll.
 *
 * ⛔ NOTHING SETTLES WHAT A TURN SHORTER THAN ITS ROW DOES. S-96 leaves the
 * distance to the device -- 「1 ノッチで何倍動くかは入力装置に依存する」 -- and
 * no row anywhere turns a distance into a count of rows. Searched: table T-023
 * MK-1 and MK-5, table T-023a and its note, S-4, S-12, S-77, S-78, S-96, FR-016,
 * FR-051, FR-017, OP-10 of table T-024a.
 * ⭐ ZERO IS THE ONE ANSWER THE ROW RULES OUT, so the choice that cannot be
 * wrong is the SMALLEST movement S-78 can express: one row, in the direction
 * turned, and only when the device asked for a distance at all. ⚠️ This invents
 * no rows-per-notch figure -- it is a floor under a distance the device still
 * supplies, and every turn long enough to reach a further row still reaches it.
 * ⛔ The cost is that a row taller than the Row Area cannot be read to its
 * foot: no anchor value can name a place inside a row, so the pan cannot reach
 * it either.
 *
 * @provisional PD-176
 * @provisional PD-177
 *
 * ⚠️ THE TWO ENDS ARE NOT ALIKE, and the difference is what each one can be
 * known to mean. Above the first row there is provably nothing -- S-78 anchors
 * the edge to a row and the first one is the top of the stack -- so a turn that
 * runs off that end is answered by the first row, without which the top of a
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
 * ⛔ Comment boxes are absent because none is drawn: `ScheduleGeometry` has no
 * member for them, which `item-hit-area.ts` records as the same gap.
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
  context: Pick<InputContext, 'screenState' | 'isDualCursorMode'>,
): PressRow {
  const modifiers = press.at.modifiers
  // PD-1: the middle button, or a left drag with Ctrl and nothing else. Beats
  // both the arming and the hit, whatever lies under the pointer.
  if (press.at.button === 'middle') return 'PD-1'
  if (press.at.button === 'left' && isCombo(modifiers, true, false, false)) return 'PD-1'
  if (context.isDualCursorMode) return 'PD-2'
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
// the requirement to state the number) and 32 of its rows are absent here on
// purpose -- the STOP note at the foot of this file says what each of them is
// missing. ⚠️ `screen-renderer.ts` reads the generated `icon-roster.json`;
// this component has no edge to that file and must not grow one, so what
// crosses is the row id alone.

/** The entries this file assigns, spelled as table T-109 spells its row ids. */
const ENTRY = {
  /** IC-1 -- FR-087 (OP-2 of table T-024a). Same operation as SK-10. */
  openDocument: 'IC-1',
  /** IC-2 -- FR-060. SK-11. */
  saveDocument: 'IC-2',
  /** IC-3 -- FR-096, which SK-12 begins with the choice of a format. */
  exportChooser: 'IC-3',
  /** IC-5 / IC-6 -- FR-031. SK-6 / SK-7. */
  undo: 'IC-5',
  redo: 'IC-6',
  /** IC-7 -- FR-053, S-99e. SK-14. */
  palette: 'IC-7',
  /** IC-10 -- FR-055. SK-18. */
  fitToScreen: 'IC-10',
  /** IC-11 -- FR-071, S-99f. SK-15. */
  fullScreen: 'IC-11',
  /** IC-12 .. IC-15 -- FR-018, S-75 / S-76. SK-16 / SK-16a. */
  zoomTimeOut: 'IC-12',
  zoomTimeIn: 'IC-13',
  zoomRowOut: 'IC-14',
  zoomRowIn: 'IC-15',
  /** IC-19 -- FR-068. U-30 `AI Export Modal` of table T-103. */
  aiExportModal: 'IC-19',
  /** IC-22 -- FR-036. SK-13. */
  help: 'IC-22',
  /** IC-44 -- FR-046. SK-20. */
  statusLine: 'IC-44',
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
  /** IC-62 -- FR-099. U-49 `Resource Roster` of table T-103. */
  resourceRoster: 'IC-62',
} as const

// STOP -- ⛔ THE BAND GR-19 PUTS ON THE PALETTE IS NOT DRAWN, so `IC-53` is
// never reported and the assignment above is never reached. Two things are
// owed, both on the far side of IF-9 and neither writable from this file:
//
//   1. `dom-screen-surface.ts` (PI-38) must lay a band across the top edge of
//      the palette and mark it with `data-icon` for IC-53, so that
//      `readScreenPartAt` answers `{ part: 'Command Palette', entry: 'IC-53' }`
//      for a point on it. ⭐ IT IS THE ONLY UNIT THAT CAN: the band is as
//      wide as the palette, and FR-053 (MUST) makes the palette's size follow
//      its contents while (MUST NOT) forbidding any table to hold one -- so
//      the side that laid the entries out is the only side that knows the
//      width, which is the same rule Chapter 5.3 states under table T-065.
//      ⛔ Laid OVER whatever it covers, for the reason `commandFromEntry`
//      gives where it reads the row.
//   2. The band's HEIGHT is `S-135a` of table T-206, and no generated constant
//      carries it into `src/` yet. ⛔ It must not be typed anywhere (rule 03
//      section 1): `tools/generate_entity_types.py` already emits
//      `NOT_STORED_PANEL_DIVIDER_SIZES` from `S-134` for the `Panel Divider`'s
//      band, and `S-135a` wants that same shape -- a `NOT_STORED_` block
//      landing in `dom-screen-surface.ts`, the unit that lays the band.
//      ⚠️ NOT in `screen-frame.ts` beside `S-134`: that unit builds the
//      divider's band as a RECTANGLE, and it has no width to build this one
//      with.
//
// ⚠️ EVERYTHING ON THIS SIDE IS WRITTEN. The row is named above and
// assigned in `commandFromEntry`, and `frame-loop.ts` holds
// `ScreenSession.commandPaletteAt` and moves it.

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
      // MK-1 -- see `rowTurnedTo`, which is `scrolledAnchor`'s vertical half
      // plus the one thing S-78 cannot express. ⚠️ MK-5 keeps the plain answer:
      // it decides no vertical place, and the row standing at the top edge is
      // the one already in force.
      scrollGroupId: plain ? rowTurnedTo(context, input.scrollPx.y) : moved.scrollGroupId,
    },
  ])
}

// STOP -- ⛔ HALF OF THE ZOOM RULE CANNOT BE WRITTEN YET. FR-016 requires the
// day and the row under the pointer to stand still through a zoom (MUST), and
// for a pointer-less route the centre of the `Row Area` instead. Holding a day
// still means naming the day that will stand at the LEFT EDGE afterwards, which
// is the inverse of `dateAtX` -- x from a day -- and PI-5 publishes no such
// member (`schedule-layout.ts` keeps `xOfDay` private). Searched: table T-064
// PI-5 and PI-6, `schedule-layout.ts`, `schedule-geometry.ts`, FR-016, FR-017,
// FR-055. Until that member exists, a zoom moves the scale and leaves the
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
  // ⚠️ A move carries no action either. What a drag will do is decided once, on
  // release, from the press -- and the picture drawn WHILE dragging is the
  // renderer's, not a change to the document.
  if (input.phase === 'move') return UNASSIGNED
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
  if (!isOnRowArea(context, press.at.x, press.at.y)) return UNASSIGNED

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
      // as far as the pointer did, so the anchor moves the opposite way by the
      // same number of pixels.
      const moved = scrolledAnchor(context, press.at.x - input.x, press.at.y - input.y)
      return changed([
        {
          kind: 'setScrollPosition',
          scrollDate: moved.scrollDate,
          scrollGroupId: moved.scrollGroupId,
        },
      ])
    }
    case 'PD-2':
      // STOP -- ⛔ CU-2 of table T-029 is not read here. PD-2 says a click fixes
      // a cursor while the Dual Cursor mode is up, and `setDualCursor` (CM-60)
      // demands BOTH dates at once (IV-13) -- so a first click has nowhere to
      // be remembered, and no published member carries a half-placed pair.
      // Searched: table T-029, table T-029a, FR-048, `DocumentSettings`,
      // `ScreenState`, table T-206. The press is taken (the mode is on, so the
      // browser must not act) and nothing is written.
      return CONSUMED_ELSEWHERE
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
 * What a press on one of the entries this tool drew is assigned to.
 *
 * ⭐ IN-1: settled on the RELEASE, and read against the PRESS -- which is why
 * `PointerPress.on` is what is looked at rather than where the pointer ended up.
 * ⚠️ Every row below is an operation this file already answers for a row of
 * table T-036, or a surface whose name table T-103 has settled; nothing new is
 * invented for an entry (see the STOP note at the foot of this file).
 *
 * ⛔ THE ARMING ENTRIES ANSWER NOTHING HERE except SP-2 and SP-3's shape change.
 * What is armed lives in `ScreenState` (UN-11 keeps it out of the undo record),
 * so `screenStateFromInput` is the member that answers SP-1 and SP-4.
 *
 * @purity pure
 */
function commandFromEntry(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const entry = press.on === null ? null : press.on.entry
  // On the part but on no entry -- the palette's own body, a surface's
  // background, a notice. The press is this tool's (the browser must not act
  // under it) and writes nothing.
  if (entry === null) return CONSUMED_ELSEWHERE

  switch (entry) {
    case ENTRY.openDocument:
      return acted({ kind: 'openDocumentFile' })
    case ENTRY.saveDocument:
      return acted({ kind: 'saveDocumentFile' })
    case ENTRY.undo:
      return acted({ kind: 'undoEdit' })
    case ENTRY.redo:
      return acted({ kind: 'redoEdit' })
    case ENTRY.fitToScreen:
      return changedInOrder(fitWrites(context))
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
    case ENTRY.statusLine:
      // FR-046, as SK-20 states it: showing the line puts today into
      // `statusDate` and hiding it puts null there. ⚠️ Table T-109 also says
      // 「動かす」, which is GR-16's drag and not this entry.
      return changed([
        context.document.schedule.project.statusDate === null
          ? { kind: 'setStatusDate', date: context.today }
          : { kind: 'clearStatusDate' },
      ])
    case ENTRY.paletteGrabBand:
      // GR-19 of table T-023d -- FR-053's drag, settled on the release like
      // every other one here (IN-1 of table T-028).
      //
      // ⭐ NOTHING HAS TO ENFORCE THE PRIORITY. GR-19 is the FIRST row of that
      // table and its preamble reads 「上の行ほど優先すること（MUST）」, so a press
      // that lands on the band is the band's whatever is drawn under it --
      // and `press.on` is the drawing side's own answer, taken once at the
      // moment of the press (CS-2 of table T-066). ⛔ That only holds while
      // the band is laid OVER what it covers; the STOP note by `ENTRY` says so
      // to the side that lays it.
      //
      // ⚠️ The pointer's travel and not its place: a press may begin anywhere
      // on the band, so the corner has to move by the difference rather than
      // jump to where the finger let go.
      return acted({
        kind: 'moveCommandPalette',
        by: { dx: release.x - press.at.x, dy: release.y - press.at.y },
      })
    default:
      return commandFromArmingEntry(entry, context)
  }
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
    // MK-13: the name label edits the name, the body opens the properties.
    if (hit.grab === 'GR-10') {
      return acted({ kind: 'editInPlace', target: { kind: 'taskName', uid: item.taskUid } })
    }
    if (hit.grab === 'GR-12') {
      return acted({ kind: 'openPropertiesPanel', uid: item.taskUid })
    }
  }

  if (item.kind === 'statusLine' && hit.grab === 'GR-16') {
    // FR-046: the line is dragged sideways and `statusDate` follows it.
    const day = dayAtX(context.layout, release.x)
    return day === null ? CONSUMED_ELSEWHERE : changed([{ kind: 'setStatusDate', date: textOfDay(day) }])
  }

  if (item.kind !== 'task') return CONSUMED_ELSEWHERE

  const uid = item.taskUid
  switch (hit.grab) {
    case 'GR-7':
      // FR-013: the marker cycles the state. ⚠️ Not a drag -- the cycle is one
      // step per release, whatever distance the pointer covered.
      return changed([{ kind: 'cycleTaskPlanActualState', uid }])
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
    default:
      // STOP -- ⛔ THE REMAINING ROWS OF TABLE T-023d ARE NOT WRITTEN, and each
      // is missing something different rather than being an oversight:
      //   GR-1 / GR-2  `fadeInDays` / `fadeOutDays` are dragged at a bar's
      //                corner, and the geometry that says how many days a
      //                corner has been pulled by is not in any table of the
      //                specification (it is recovered in docs/review, not
      //                here).
      //   GR-5 / GR-6  the actual's ends. GR-6 says the duration is counted in
      //                WORKED days from the day dropped on, which needs
      //                `workingDaysBetween` against the document's calendar and
      //                a decision about a drop onto a non-working day that
      //                FR-043 does not make.
      //   GR-8         `resume`, whose rule is FR-044 and whose valid / invalid
      //                pair (AT-38) has no row saying which a drag produces.
      //   GR-9 / GR-17 / GR-18  the dummies. FR-043 gives the VALUES (S-129,
      //                S-130) and `beginTaskActual` is the command, but the two
      //                dummies differ in what they set and table T-023d says
      //                「掴めば」 -- press, drag or release is not stated, and
      //                GR-9 adds 「押しは受けない」 which contradicts reading it
      //                as a click.
      //   GR-11 / GR-13 / GR-14 / GR-15  no target exists to be grabbed:
      //                `item-hit-area.ts` records GR-11 and the comment-box
      //                half of GR-14 as undrawn, and a dependency (GR-13) or a
      //                highlight box (GR-14) is SELECTED by a press rather than
      //                changed by one.
      // Searched: table T-023d, FR-011, FR-013, FR-043, FR-044, FR-045, FR-046,
      // table T-206, `edit-task.ts`, `edit-annotation.ts`.
      return CONSUMED_ELSEWHERE
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

/** Which row a Task is drawn on now. @purity pure */
function rowOfTask(context: InputContext, uid: number): string | null {
  const placed = context.layout.placements.find((one) => one.taskUid === uid)
  return placed === undefined ? null : placed.groupId
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

/** @purity pure */
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
 * SK-18 -- FR-055's fit.
 *
 * ⭐ The place is handed back rather than computed. OP-10 of table T-024a reads
 * a null `scrollDate` as 「人がまだ場所を決めていない」 and requires the reader
 * to show what FR-055 would choose (MUST), which is exactly what this key asks
 * for -- so nulls say it once, in the place the rule already lives, instead of
 * a second copy of the anchor arithmetic that `frame-loop.ts` runs.
 * ⚠️ The zoom is measured from the layout THIS frame ran. The rule after table
 * T-068 allows a second pass at the chosen zoom and forbids a third; the second
 * belongs to the frame that follows this command.
 *
 * @purity pure
 */
function fitCommand(context: InputContext): DocumentCommand {
  const fitted = fitZoom(context.layout, context.document.documentSettings, context.regions)
  return {
    kind: 'fitScheduleToScreen',
    zoomX: fitted.zoomX,
    zoomY: fitted.zoomY,
    scrollDate: null,
    scrollGroupId: null,
  }
}

/**
 * SK-3 -- one delete per selected thing, in the order they were picked.
 *
 * ⚠️ The chain each one drags with it is table T-050's and is applied by the
 * aggregate, not here: CD-1 alone reaches six other rows.
 * STOP -- ⛔ FR-032's CONFIRMATION IS NOT RAISED. It requires a Task with WBS
 * descendants to be confirmed before it is deleted (MUST) and the names of what
 * will vanish to be shown, and nothing puts that question anywhere:
 * `ScreenSession.confirmation` is `null` in every frame this build runs. ⚠️ THE
 * WAY BACK IS NO LONGER WHAT IS MISSING -- table T-109 places IC-69 and IC-70 on
 * U-55 `Confirmation`, so a press on either arrives here as `ScreenPart.entry`
 * (IF-9) the way any other entry does, and `notices.ts` holds the same narrowed
 * note. ⛔ No case is written for the two below: an answer to a question nobody
 * asked has nothing to be an answer TO, and inventing one would settle what a
 * pressed choice DOES. Searched: table T-064 (PI-8, PI-9, PI-18, PI-37), table
 * T-037, table T-109, `frame-loop.ts`, `apply-document-change.ts`. A caller that
 * runs these commands unasked breaks that MUST.
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
 * @purity pure
 */
function escapeContextOf(context: InputContext): EscapeContext {
  return {
    gestureInFlight: context.pressed !== null,
    dualCursorMode: context.isDualCursorMode,
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
    // IC-3 -- SK-12's other entrance. FR-096 (MUST) keeps it the ONE way out,
    // and U-54 is the name table T-103 settled for what it opens.
    case ENTRY.exportChooser:
      return screenStateWithSurface(state, EXPORT_CHOOSER)
    // IC-52 is the same level of IN-4 that Esc's first press consumes.
    case ENTRY.closeSurface:
      return screenStateWithSurface(state, null)
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
      case null:
      default:
        // ⛔ Neither of those two levels is in this value. A gesture in flight
        // and the Dual Cursor mode are current values the Framework holds
        // (LY-5), which is why `EscapeContext` exists at all -- the shell drops
        // the press, or leaves the mode, when `escapeTarget` names its level.
        // Answering with the state unchanged is not "nothing happened": the
        // level WAS consumed, by a holder this function cannot reach.
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

// STOP -- ⛔ 40 ROWS OF TABLE T-109 REACH `commandFromEntry` AND ARE ANSWERED
// WITH NOTHING. Each is missing something different, and none is an oversight.
// ⚠️ The number is the 73 rows of that table less the 33 this file assigns
// (`ENTRY` holds 18 and `ARMED_BY_ENTRY` 15), and the groups below add up to it.
// ⭐ The entries that ARE answered were chosen by a rule rather than one at a
// time: an entry is answered when this file already answers the same operation
// for a row of table T-036, or when it opens a surface whose name table T-103
// has settled -- plus FR-083's arming, which is the whole point of the seam
// member that brought the press here.
//
// ⛔ 25 OF THEM CANNOT BE WRITTEN AT ALL, whatever rule is chosen. ⚠️ The count
// was 「FOUR」 while the groups below already held far more than four rows; it is
// stated here as the rows the groups list, so the two can be held against each
// other:
//
//   IC-17 / IC-18 / IC-20 / IC-21
//                each writes a value NOTHING published holds. Which of its two
//                contents the properties panel shows (FR-072), whether the
//                dialogue field is up and whether the `Agent API` is on
//                (S-99b), and the display language (S-99) all live in
//                `ScreenSession` -- the shell's, and not any of the three
//                answers this file returns. `screen-renderer.ts` records each.
//   IC-37 / IC-38  FR-034's alignment. ⛔ Table T-108 holds NO command for it,
//                so there is nothing to plan even with the press in hand.
//   IC-41        FR-020 asks for the unlock password first, and nothing carries
//                a password back from a person: table T-037 has no row for
//                asking for one (NT-7 asks only for 続ける / 取りやめる) and
//                nothing published holds what was typed.
//   IC-45        `setDualCursor` (CM-60) demands BOTH dates at once (IV-13),
//                which is the gap PD-2 already records above.
//   IC-50 / IC-51  the palette's own folding. Nothing holds it: table T-203 and
//                table T-206 have no row and `ScreenState` has no member.
//   IC-58 / IC-59 / IC-60 / IC-63 .. IC-68
//                drawn once per ROW or once per RESOURCE, so a press has to say
//                WHICH -- and `ScreenPart` (IF-9) carries the part and the entry
//                and no key. ⭐ It carries none because nothing here consumes
//                one yet (R4's YAGNI); the change that answers these adds it.
//                ⚠️ IC-63 / IC-64 / IC-67 / IC-68 also write
//                `ScreenSession.selectedResourceUids`, which is the shell's
//                (PD-143) and not a `DocumentCommand` at all.
//   IC-54 .. IC-57  ⛔ NOT ENTRIES. Table T-109 says so in its own column: one
//                of them shows a keystroke and three show the autosave state
//                (FR-061). ⚠️ IC-53 stood here until GR-19 of table T-023d gave
//                the band it marks a gesture. It is still not a button -- what
//                answers it is a drag, settled on the release.
//   IC-69 / IC-70  the two answers to NT-7's question, on U-55 `Confirmation`.
//                ⭐ A QUESTION IS RAISED NOW -- `frame-loop.ts` puts DI-4's
//                overwrite question and FR-032's delete question into
//                `ScreenSession.confirmation`, and PI-28 actually asks it on
//                every chosen write over an occupied destination. ⚠️ What a
//                pressed choice DOES is still the raiser's to say, and the
//                raiser settles it: this file answers neither press.
//   IC-71 .. IC-73  the three answers to OP-3's question, on U-56 `Open Chooser`.
//                ⛔ THIS FILE ASSIGNS NONE OF THEM. `frame-loop.ts` puts the
//                question up, but a press has to close the surface and carry the
//                `OpenChoice` back, and that needs an `OPEN_CHOOSER` beside
//                `EXPORT_CHOOSER` here. ⚠️ A missing ROUTE, not a missing raiser --
//                the opposite of the two rows above.
//
// ⚠️ THE REMAINING 12 ARE REACHABLE AND ARE STILL NOT WRITTEN -- IC-4, IC-8, IC-9,
// IC-16, IC-39, IC-40, IC-42, IC-43 (the drawing settings, CM-59 / CM-61 /
// CM-63 / CM-66) and IC-46 .. IC-49 (the guide cursor, whose four values table
// T-109 spells verbatim). ⛔ They are outside the rule stated above, not
// impossible, and leaving them here rather than half-writing them is the
// choice: each is a toggle, and which of S-59's or S-72's values a press moves
// to is not stated by table T-109 for any of them.
// Searched: table T-109, table T-108, table T-036, table T-023b, table T-203,
// table T-206, `screen-renderer.ts`, `edit-document-settings.ts`.

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
