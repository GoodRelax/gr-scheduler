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
import type { DocumentCommand, TaskShapeKind } from '../../use-case/edit-document/edit-document'
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
 * The press a gesture began with, as the Framework recorded it.
 *
 * ⭐ Both members are the moment of the PRESS. IN-1 settles the operation on
 * release, so the release has to be read against something, and CS-2 makes that
 * something the state at the press.
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
  /** The gesture in flight, or null while none is. */
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
   * `PlanInput.updatedAt` takes. FR-046 is the one operation that needs it --
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
   * One write. FR-031 (MUST) makes a document-changing drag ONE undo step, so
   * the rows of table T-108 that a single gesture asks for travel together and
   * reach `applyDocumentChange` as one `PlanInput.commands`.
   */
  | { readonly kind: 'changeDocument'; readonly commands: readonly DocumentCommand[] }
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
  /**
   * SK-12, which FR-096 says begins with the choice of a format.
   *
   * ⚠️ An action rather than a surface, unlike SK-13. S-99g holds the name of
   * the surface that is open and table T-103 has settled a name for the help
   * (U-30) but for nothing FR-096 opens -- `open-modals.ts` says the same of
   * the surfaces FR-074 and FR-088 open. Minting one here would settle a name
   * the glossary has not.
   */
  | { readonly kind: 'openExportChooser' }
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
  // FR-063 would raise a revision behind a gesture that moved nothing.
  return commands.length === 0 ? CONSUMED_ELSEWHERE : acted({ kind: 'changeDocument', commands })
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
 * @purity pure
 */
function rowAtTopEdge(layout: ScheduleLayout, y: number): RowPlacement | null {
  const rows = layout.rows
  for (let at = 0; at < rows.length; at++) {
    const row = rows[at]
    if (row === undefined) continue
    const next = rows[at + 1]
    const end = next === undefined ? row.y + row.height : next.y
    if (y >= row.y && y < end) return row
  }
  return null
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

/** The row of table T-023a a press falls on. */
type PressRow = 'PD-1' | 'PD-2' | 'PD-3' | 'PD-4' | 'PD-4a' | 'PD-5'

/**
 * Which row of table T-023a decides this press.
 *
 * ⛔ Evaluated from the top and settled by the first row that holds (MUST). The
 * order is the table's own and is not rearranged: 「第 1 の分岐は「当たったか」
 * であり、「構えているか」は当たらなかったときにだけ効く」.
 *
 * @purity pure
 */
function pressRowOf(press: PointerPress, context: InputContext): PressRow {
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
  if (ctrlShift && key === KEY.e) return acted({ kind: 'openExportChooser' }) // SK-12

  // SK-13 / SK-14 / SK-15 -- all three land in `ScreenState`.
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
  if (plain && key === KEY.f) return changed([fitCommand(context)])

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
  const moved = plain
    ? scrolledAnchor(context, 0, input.scrollPx.y)
    : scrolledAnchor(context, input.scrollPx.x, 0)
  return changed([
    { kind: 'setScrollPosition', scrollDate: moved.scrollDate, scrollGroupId: moved.scrollGroupId },
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
  if (!isOnRowArea(context, press.at.x, press.at.y)) return UNASSIGNED

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
 * ⛔ FR-032's CONFIRMATION HAS NOWHERE TO GO. It requires a Task with WBS
 * descendants to be confirmed before it is deleted (MUST) and the names of what
 * will vanish to be shown -- and no member of table T-064 carries a question
 * back to a person. Searched: table T-064 (PI-8, PI-9, PI-18, PI-37), table
 * T-037 (which is about telling, not asking), `apply-document-change.ts`.
 * A caller that runs these commands unasked breaks that MUST.
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
  if (!isOnRowArea(context, press.at.x, press.at.y)) return held

  const isAdding = press.at.modifiers.shift // SL-4

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
 * The next screen state (CP-36): what is armed, the palette, full screen and
 * the surface that is open.
 *
 * ⭐ Esc's levels are IN-4's and are consumed one per press.
 *
 * @purity pure
 */
export function screenStateFromInput(input: HumanInput, context: InputContext): ScreenState {
  const state = context.screenState
  if (input.kind !== 'key') return state
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

// STOP -- ⛔ THE PALETTE CANNOT ARM ANYTHING FROM HERE, and that is a gap in
// what is published rather than a decision. SP-1 to SP-4 of FR-083 make a press
// on a palette entry mean 「構える」 / 「形を変える」 / 「構えを解く」 depending
// on the selection, and table T-023b holds what may be armed -- but the note
// under table T-023a puts the floating palette outside this decision order
// (FR-053 owns it), and NOTHING says which entry a point is on: `ScreenRegions`
// (PI-35) holds six rectangles and none of them is the palette, and
// `CommandPalette` (PI-37) is a description built for drawing, which this
// component has no edge to. Searched: table T-103, table T-064 PI-35 and PI-37,
// FR-053, FR-083, table T-023b, `screen-regions.ts`, `command-palette.ts`.
// Until a member answers "which palette entry is at this point", `armed` can
// only be CLEARED here -- by Esc, which IN-4 gives a level of its own.
