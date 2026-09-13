// ApplyDocumentChange -- the pure half.
//
// @unit      UF-9   (docs/spec/05-07-design.md, table T-075)
// @component ApplyDocumentChange, layer UseCase (table T-062)
// @purity    pure
//
// Steps WS-1 to WS-5 of table T-067, split from the non-pure half by UT-1 of
// table T-063 (LY-3).
//
// Both roads through those steps live here -- `planDocumentChange` for table
// T-108 commands, `planDocumentReplacement` for table T-230 -- so WS-1 and WS-2
// are one shape and one judgement for both.
//
// ⚠️ WS-6 and WS-7 are the other file's, in that order: a notice sent before the
// swap would reach subscribers that then read the OLD document.
//
// Table T-027 is read only here -- `isUndoable` and `columnsOutsideHistory` --
// because UndoEdit and RedoEdit never read it.

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  advancedStamp,
  isStampMatched,
  type DocumentStamp,
} from '../../entity/document-model/document-stamp/document-stamp'
import {
  emptyHistory,
  historyWithStep,
  type EditHistory,
  type HistoryLimits,
} from '../../entity/document-model/edit-history/edit-history'
import type { TaskGroup } from '../../entity/document-model/schedule/schedule'
import {
  editDocument,
  type DocumentCommand,
  type EditReport,
  type Refusal,
  type SettingsLimits,
} from '../edit-document/edit-document'
// LR-2: the components table T-230 names in its WS-3 column, each through its
// public entry. This component asks them, not the reverse, which is why
// `ChangeStep` and `HeldDocument` are declared in UndoEdit (LR-3).
import { importDocument, type ImportRefusal, type ImportRequest } from '../import-document/import-document'
import { redoEdit } from '../redo-edit/redo-edit'
import { undoEdit, type ChangeStep, type HeldDocument } from '../undo-edit/undo-edit'
// The display words' one destination (Chapter 6.2). A JSON import is data, not a
// reach into ScreenRenderer: `check_layer_rules.py` reads a `.json` specifier as data.
import displayWords from '../../adapter/screen-renderer/display-words.json'

/** What WS-2 judges. All three are the caller's knowledge of the moment. */
export interface WriteMoment {
  /** AG-9: a person is mid-gesture on the schedule. */
  readonly gestureInFlight: boolean
  /** AG-9: an in-place edit has not been committed yet. */
  readonly editingInPlace: boolean
  /** Re-entry: a notice is being delivered right now (Chapter 5.5). */
  readonly deliveringNotices: boolean
}

export interface PlanInput {
  readonly document: Document
  /** The stamp the writer READ, which AG-2 matches against the current one. */
  readonly readStamp: DocumentStamp
  readonly commands: readonly DocumentCommand[]
  readonly moment: WriteMoment
  readonly history: EditHistory<ChangeStep>
  readonly historyLimits: HistoryLimits
  readonly settingsLimits: SettingsLimits
  /** WS-5's stamp fields. The clock belongs to the Framework (LY-5, CS-1). */
  readonly editedBy: string
  /** The instant of this write (FR-063). */
  readonly updatedUtc: string
}

/** WS-1 turned the write away. Shared by both roads (table T-230 does not change WS-1). */
export type StampRefusal = { readonly step: 'WS-1'; readonly reason: 'staleStamp' }

/** WS-2 turned the write away. Shared by both roads. */
export type MomentRefusal = {
  readonly step: 'WS-2'
  readonly reason: 'gestureInFlight' | 'editingInPlace' | 'deliveringNotices'
}

/** Why a write was turned away before any command ran. */
export type PlanRefusal =
  | StampRefusal
  | MomentRefusal
  | { readonly step: 'WS-3'; readonly reason: 'refused'; readonly refusals: readonly Refusal[] }

export type ChangePlan =
  | { readonly ok: false; readonly refusal: PlanRefusal }
  | {
      readonly ok: true
      readonly document: Document
      readonly history: EditHistory<ChangeStep>
      /**
       * WS-5's judgement that the schedule-data group moved (FR-063). Carried
       * because AG-6 selects watchers by it; deriving it again on the notifying
       * side would be a second derivation (R2.7).
       */
      readonly hasMovedSchedule: boolean
      /**
       * What WS-7 still has to tell, gathered from the bundle. Carried because
       * the notifying side cannot re-derive it: the figures have been replaced.
       */
      readonly report: EditReport
    }

/**
 * Whether table T-027 puts this command in the history.
 *
 * Multi-valued presentation rows stay undoable (UN-13; FR-049 limits UN-7 to
 * booleans).
 *
 * `pinTaskGroup` / `unpinTaskGroup` push a step (UN-14), so a snapshot's pins
 * can only name rows that existed then, which keeps IV-3 of table T-220 without
 * a sweep. ⛔ Must agree with `columnsOutsideHistory`.
 *
 * @purity pure
 */
function isUndoable(command: DocumentCommand): boolean {
  switch (command.kind) {
    // UN-7: the boolean rows of table T-202.
    case 'setElementVisible':
      return false
    // UN-16: where you look, and nothing else.
    case 'setPanelWidths':
      return false
    // UN-8: the zoom and the position.
    // ⛔ FR-031 splits one fit press into CM-71 (no step) then CM-72
    // (`expandAllTaskGroups`, one step via `default`). Do not swap or merge them:
    // WS-4 pushes the document as it stood before the write, so CM-72's step must
    // already hold the new zoom, or an undo would rewind it against UN-8.
    case 'setZoom':
    case 'setScrollPosition':
    case 'fitScheduleToScreen':
      return false
    // UN-12: where the two measuring lines stand.
    // ⛔ `clearDualCursor` is here for consistency, not by UN-12 (which rules only
    // on the position): `columnsOutsideHistory` keeps `dualCursor` out of every
    // step, so a step pushed by a clear would restore nothing.
    case 'setDualCursor':
    case 'clearDualCursor':
      return false
    default:
      return true
  }
}

/**
 * The current value of every settings column table T-027 keeps outside the
 * history -- what a restore keeps rather than rewinds.
 *
 * ⛔ The one census: UndoEdit and RedoEdit must not grow a second.
 *
 * Needed because WS-4 pushes the document as it stood BEFORE a write, so a step
 * pushed by a later edit carries these columns' earlier values; restoring it
 * verbatim would walk e.g. the panel width (FR-052) backwards on Ctrl+Z.
 *
 * ⛔ A column no row of table T-027 excludes must not be listed -- keeping one the
 * history owns would silently undo the undo.
 *
 * @purity pure
 */
function columnsOutsideHistory(current: DocumentSettings): Partial<DocumentSettings> {
  return {
    // UN-7 -- the boolean rows of table T-202, written only by `setElementVisible`
    // (CM-58). `planVisible` and `actualVisible` are independent booleans (FR-049).
    // The multi-valued rows (`stackDirection`, `guideCursorMode`, `fontScale`)
    // stay inside the history by UN-13. `watermarkVisible` is not a
    // `DocumentSettings` column (table T-206), so there is nothing to keep.
    planVisible: current.planVisible,
    actualVisible: current.actualVisible,
    assigneeVisible: current.assigneeVisible,
    percentCompleteVisible: current.percentCompleteVisible,
    dependencyVisible: current.dependencyVisible,
    progressMarkerVisible: current.progressMarkerVisible,
    progressLineVisible: current.progressLineVisible,
    dateGridLinesVisible: current.dateGridLinesVisible,
    groupGridLinesVisible: current.groupGridLinesVisible,
    baselineVisible: current.baselineVisible,

    // UN-16 -- `setPanelWidths` (CM-67) writes the pair. No export scale: FR-025
    // (MUST NOT) forbids one.
    rowTitlePanelWidth: current.rowTitlePanelWidth,
    propertyPanelWidth: current.propertyPanelWidth,
    // `pinnedGroupIds` (S-126) is not kept: UN-14 keeps pins in the history, so
    // IV-3 of table T-220 holds itself.

    // UN-8 -- `setZoom` (CM-65), `setScrollPosition` (CM-66), `fitScheduleToScreen`
    // (CM-71).
    // ⚠️ `scrollGroupId` is also written by the undoable `deleteTaskGroup` (CM-27,
    // CD-2); keeping the current `null` through an undo is what UN-8 asks.
    zoomX: current.zoomX,
    zoomY: current.zoomY,
    scrollDate: current.scrollDate,
    scrollGroupId: current.scrollGroupId,
    scrollDayOffset: current.scrollDayOffset,
    scrollGroupOffset: current.scrollGroupOffset,

    // UN-12 -- written by `setDualCursor` (CM-60) and `clearDualCursor` (CM-61),
    // both leaving no step (see `isUndoable`).
    // ⚠️ UN-13's note sweeps every multi-valued row of table T-202, S-65 among
    // them, inside the history, which UN-12 contradicts by name. UN-12 names this
    // column, so it is kept. Reported.
    dualCursor: current.dualCursor,
  }
}

/**
 * `restored` with the `columnsOutsideHistory` taken from the document being left,
 * so undo and redo give back the schedule and not the reader's view.
 *
 * The history is not touched: the entry walked across already holds the
 * document being left (UndoEdit / RedoEdit put it there).
 *
 * @purity pure
 */
function keepingColumnsOutsideHistory(restored: HeldDocument, leaving: Document): HeldDocument {
  return {
    document: {
      ...restored.document,
      documentSettings: {
        ...restored.document.documentSettings,
        ...columnsOutsideHistory(leaving.documentSettings),
      },
    },
    history: restored.history,
  }
}

/**
 * UTF-8 byte length, the measure FR-031 gives S-95.
 *
 * ⛔ Not `TextEncoder`: LR-6 compiles UseCase without the DOM library, so `tsc`
 * refuses it.
 *
 * @purity pure
 */
function utf8Length(text: string): number {
  let bytes = 0
  for (const character of text) {
    const point = character.codePointAt(0) ?? 0
    // The four UTF-8 lengths, by the ranges that define them. A code point
    // over 0xFFFF is one `for...of` step here and four bytes there, which is
    // why this walks characters rather than `.length` units.
    bytes += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4
  }
  return bytes
}

/**
 * The size one held step is pushed with (FR-031): the packed `GRS JSON` form.
 *
 * The packed form is only counted, never stored (FR-024 writes the indented
 * one), so `JSON.stringify` takes no spacing argument.
 *
 * @purity pure
 */
function stepSizeBytes(document: Document): number {
  return utf8Length(JSON.stringify(document))
}

// ---------------------------------------------------------------------------
// The invariant printed under table T-050, written ONCE.
// ---------------------------------------------------------------------------

/**
 * The name the invariant's row takes, read from the dictionary (table T-050,
 * Chapter 6.2), never typed.
 *
 * `edit-task-group.ts` does the same lookup; that repeats the lookup, not the
 * word. A shared constant would be a crossing table T-064 does not publish, or a
 * unit table T-075 does not list.
 *
 * The English cell: the label is document data carried to an exchange partner,
 * not a printed word, so the display language may not choose it (FR-038).
 */
const DEFAULT_ROW_NAME_ENTRY = displayWords.defaultNames.find((one) => one.use === 'row')
const DEFAULT_ROW_NAME: string =
  DEFAULT_ROW_NAME_ENTRY === undefined ? '' : DEFAULT_ROW_NAME_ENTRY.text.en

/**
 * The identifier the invariant's row takes.
 *
 * ⛔ No row of the specification says where it comes from. Other rows get a UUID
 * from their caller (CM-26, AT-51, `InputContext.newGroupId`), but no caller asks
 * for this one, and WS-1 to WS-5 are `pure`, so nothing here may generate one.
 *
 * A constant is safe: the invariant fires only at zero rows, so IV-1 holds for
 * any value, and a merge folds equal identifiers (FR-023).
 * ⚠️ Still a value nobody ruled on; overturning it costs this constant and the
 * cases that name it.
 */
const EMPTY_DOCUMENT_TASK_GROUP_ID = '00000000-0000-4000-8000-000000000001'

/**
 * The document, holding the `TaskGroup` table T-050 requires.
 *
 * Written once here because table T-050 (MUST NOT) forbids a copy per road, and
 * every road that can empty the document (FR-032, FR-023, OP-3, redo) meets at
 * WS-3 in `planDocumentChange` or `planDocumentReplacement`.
 *
 * `parentId: null` places the row at `L1` (FR-004). The optional columns start
 * absent as CM-26 leaves them; `label` without `derivedFromTaskUid` is the
 * pairing AT-54 and FR-058 require.
 *
 * ⛔ Nothing is refused (table T-050, MUST NOT), and FR-032's count is settled
 * before WS-3, so this row is not counted.
 *
 * ⚠️ A non-empty document comes back as the same reference: WS-6 replaces ONE
 * reference, and RD-1's `undone: false` returns the very pair it was given.
 *
 * @purity pure
 */
function documentHoldingOneRow(document: Document): Document {
  if (document.schedule.taskGroups.length > 0) return document
  const row: TaskGroup = {
    id: EMPTY_DOCUMENT_TASK_GROUP_ID,
    parentId: null,
    label: DEFAULT_ROW_NAME,
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
  }
  return { ...document, schedule: { ...document.schedule, taskGroups: [row] } }
}

/**
 * Whether a write moved the schedule-data group -- WS-5's question (FR-063).
 *
 * Read from reference identity, not table T-108's group column: every aggregate
 * rebuilds the schedule only when it touches it, so no command list is needed.
 *
 * @purity pure
 */
function hasMovedScheduleGroup(before: Document, after: Document): boolean {
  return before.schedule !== after.schedule
}

/**
 * WS-1 of table T-067, for both roads.
 *
 * AG-2 compares all three stamp fields: the schedule instant alone misses a
 * presentation-only write, which FR-063 does not move it for.
 *
 * ⛔ `declared` is what the writer says it read; `current` is the held stamp.
 * Never match the incoming document's stamp (table T-230, MUST NOT) -- it would
 * refuse every replacement.
 * ⛔ `null` declares nothing and is not a refusal on its own (table T-230,
 * MUST NOT); only the command road requires a stamp, by type.
 *
 * @purity pure
 */
function refusalOfStamp(declared: DocumentStamp | null, current: DocumentStamp): StampRefusal | null {
  if (declared === null) return null
  return isStampMatched(declared, current) ? null : { step: 'WS-1', reason: 'staleStamp' }
}

/**
 * WS-2 of table T-067, for both roads: AG-9's two, and Chapter 5.5's re-entry.
 * Refused rather than queued, because FR-028 wants the answer at once.
 *
 * @purity pure
 */
function refusalOfMoment(moment: WriteMoment): MomentRefusal | null {
  if (moment.gestureInFlight) return { step: 'WS-2', reason: 'gestureInFlight' }
  if (moment.editingInPlace) return { step: 'WS-2', reason: 'editingInPlace' }
  if (moment.deliveringNotices) return { step: 'WS-2', reason: 'deliveringNotices' }
  return null
}

/**
 * Runs WS-1 to WS-5 and answers what the other half should commit.
 *
 * @purity pure
 */
export function planDocumentChange(input: PlanInput): ChangePlan {
  // ---- WS-1: the stamps ---------------------------------------------------
  const stale = refusalOfStamp(input.readStamp, input.document.documentStamp)
  if (stale !== null) return { ok: false, refusal: stale }

  // ---- WS-2: the moment ---------------------------------------------------
  const untimely = refusalOfMoment(input.moment)
  if (untimely !== null) return { ok: false, refusal: untimely }

  // ---- WS-3: validate and build, all or nothing ---------------------------
  let held = input.document
  const refusals: Refusal[] = []
  // FR-012's recount: the UIDs are unioned, not the counts added, because two
  // commands can move the same `Task` and NT-3 counts what the result reaches.
  const recountedTaskUids = new Set<number>()
  for (const command of input.commands) {
    const result = editDocument(held, command, input.settingsLimits)
    if (!result.ok) {
      refusals.push(...result.refusals)
      continue
    }
    held = result.document
    for (const uid of result.report.recountedTaskUids) recountedTaskUids.add(uid)
  }
  // AG-3: one refusal throws the whole bundle away. `held` is dropped on the
  // floor -- nothing has been replaced, so there is nothing to roll back.
  if (refusals.length > 0) {
    return { ok: false, refusal: { step: 'WS-3', reason: 'refused', refusals } }
  }

  // Table T-050's invariant, as part of this write: before WS-4 and WS-5, which
  // both answer about the settled document. The step still holds the document
  // from before the write, so one undo gives the deleted rows back.
  const settled = documentHoldingOneRow(held)

  // ---- WS-4: one step of history --------------------------------------
  // AG-10: a bundle earns a step when ANY command is undoable (table T-027).
  // ⛔ A write that moved nothing leaves no step (FR-031): the kind decides whether
  // a step is possible, this test whether one is pushed.
  // Identity suffices because every arm of `edit-document/` returns the document
  // it was handed when nothing moved; ⛔ a deep comparison would cost the write road.
  // The order is unchanged -- see the CM-71 / CM-72 note in `isUndoable`.
  const recorded = input.commands.filter(isUndoable)
  const history =
    recorded.length === 0 || settled === input.document
      ? input.history
      : historyWithStep(
          input.history,
          { document: input.document, commands: recorded.map((one) => one.kind) },
          stepSizeBytes(input.document),
          input.historyLimits,
        )

  // ---- WS-5: advance the stamp -------------------------------------------
  // AG-6 names WS-5 as where the judgement is made, so it leaves on the answer
  // (R2.7). Judged on the SETTLED document: making the invariant's row moves the
  // schedule instant (FR-063).
  const hasMovedSchedule = hasMovedScheduleGroup(input.document, settled)
  // ⛔ A write that moved nothing does not advance the stamp (FR-020, MUST NOT);
  // same identity test as WS-4.
  if (settled === input.document) {
    return {
      ok: true,
      document: input.document,
      history,
      hasMovedSchedule,
      report: { recountedTaskUids: [...recountedTaskUids] },
    }
  }
  const document: Document = {
    ...settled,
    documentStamp: advancedStamp(settled.documentStamp, input.editedBy, input.updatedUtc, {
      hasMovedSchedule,
    }),
  }

  return {
    ok: true,
    document,
    history,
    hasMovedSchedule,
    report: { recountedTaskUids: [...recountedTaskUids] },
  }
}

// ---------------------------------------------------------------------------
// The whole-document road -- table T-230. Its rows differ in the history, the
// stamp, and whether one undo step is pushed; the rest is the same WS-1 to WS-7.
// ---------------------------------------------------------------------------

/**
 * What a caller of `importDocument` (PI-10) brings, minus two fields.
 *
 * `current` is the one read of CS-3 of table T-066, not the caller's. `choice`
 * is fixed by the row (RD-3 or RD-4), so no caller gets another row's history
 * treatment.
 */
export type ImportCall<TChoice extends ImportRequest['choice']> = Omit<
  ImportRequest,
  'current' | 'choice'
> & { readonly choice: TChoice }

/**
 * The callers of table T-230, each carrying only what its row needs.
 *
 * ⛔ The row is an argument, never a guess: table T-230 requires a caller to name
 * it (MUST) and refuses one that names none (MUST NOT), so OP-4's MUST on the
 * history is always checked on the path.
 */
export type ReplacementCall =
  /** RD-1 -- undo. WS-3 is UndoEdit (PI-11). */
  | { readonly row: 'RD-1' }
  /** RD-2 -- redo. WS-3 is RedoEdit (PI-12). */
  | { readonly row: 'RD-2' }
  /** RD-3 -- import, `'merge'` and `'baseline'`. WS-3 is ImportDocument (PI-10). */
  | {
      readonly row: 'RD-3'
      readonly importing: ImportCall<'merge' | 'baseline'>
      /** WS-4 can push one step on this row alone, so S-94 / S-95 are needed. */
      readonly historyLimits: HistoryLimits
      /** WS-5's stamp fields. RD-3 is the one row whose stamp advances. */
      readonly editedBy: string
      /** The instant of this write (FR-063). */
      readonly updatedUtc: string
    }
  /** RD-4 -- OP-3's `'replace'`. WS-3 is ImportDocument (PI-10). */
  | { readonly row: 'RD-4'; readonly importing: ImportCall<'replace'> }
  /** RD-6 -- the document at startup (FR-062, table T-034). The caller brings it. */
  | { readonly row: 'RD-6'; readonly document: Document }
  /**
   * RD-7 -- FR-095's reset; the caller brings BT-4's bundled template.
   *
   * Its own row, not RD-6 reused: table T-230 gives the two different history
   * columns, and naming RD-6 would leave OP-4's MUST unchecked.
   */
  | { readonly row: 'RD-7'; readonly document: Document }

export interface ReplacementInput {
  /** What the holder holds, read ONCE (CS-3 of table T-066). */
  readonly held: HeldDocument
  /**
   * WS-1: the stamp the caller DECLARES it read, or `null` when it declares
   * none. ⛔ Not the stamp of the document coming in -- see `refusalOfStamp`.
   */
  readonly readStamp: DocumentStamp | null
  readonly moment: WriteMoment
  readonly call: ReplacementCall
}

/** Why a whole-document replacement was turned away. */
export type ReplacementRefusal =
  | StampRefusal
  | MomentRefusal
  | {
      readonly step: 'WS-3'
      readonly reason: 'importRefused'
      /** ⚠️ Some of these are questions to put to a person, not GRS refusing. */
      readonly refusal: ImportRefusal
    }

export type ReplacementPlan =
  | { readonly ok: false; readonly refusal: ReplacementRefusal }
  | {
      readonly ok: true
      /** What WS-6 puts in place, as ONE reference (MUST). */
      readonly next: HeldDocument
      /** What WS-7 is handed. See `hasMovedScheduleBetween`. */
      readonly hasMovedSchedule: boolean
    }

/**
 * The flag WS-7 is handed on this road, from the outgoing and incoming
 * `scheduleUpdatedUtc` (table T-230): most rows leave WS-5 nothing to judge.
 *
 * ⛔ An equality, never an order (FR-063, MUST NOT): an undo restores an older
 * stamp, which an order would call "not newer" and drop. Two writes in one
 * second read as "did not move", FR-063's own resolution.
 *
 * @purity pure
 */
function hasMovedScheduleBetween(outgoing: Document, incoming: Document): boolean {
  return outgoing.documentStamp.scheduleUpdatedUtc !== incoming.documentStamp.scheduleUpdatedUtc
}

/**
 * The one exit of the whole-document road, so table T-050's invariant is applied
 * here for every row of table T-230.
 *
 * ⚠️ `next` comes back untouched when it already holds a row: RD-1 and RD-2 hand
 * back the very pair when nothing moved, and WS-6 replaces ONE reference.
 *
 * @purity pure
 */
function replacementSettled(held: HeldDocument, next: HeldDocument): ReplacementPlan {
  const settled = documentHoldingOneRow(next.document)
  const pair: HeldDocument =
    settled === next.document ? next : { document: settled, history: next.history }
  return { ok: true, next: pair, hasMovedSchedule: hasMovedScheduleBetween(held.document, pair.document) }
}

/** @purity pure */
function importRefused(refusal: ImportRefusal): ReplacementPlan {
  return { ok: false, refusal: { step: 'WS-3', reason: 'importRefused', refusal } }
}

/**
 * Runs WS-1 to WS-5 for a whole-document replacement; the row of table T-230
 * decides the last three.
 *
 * ⛔ The incoming document is not validated again (table T-230, MUST NOT).
 *
 * @purity pure
 */
export function planDocumentReplacement(input: ReplacementInput): ReplacementPlan {
  const { held, call } = input

  // ---- WS-1: the stamps ---------------------------------------------------
  const stale = refusalOfStamp(input.readStamp, held.document.documentStamp)
  if (stale !== null) return { ok: false, refusal: stale }

  // ---- WS-2: the moment ---------------------------------------------------
  const untimely = refusalOfMoment(input.moment)
  if (untimely !== null) return { ok: false, refusal: untimely }

  // ---- WS-3, WS-4 and WS-5, by the row ------------------------------------
  // One switch, because table T-230 is read by row: a caller naming RD-1 cannot
  // pick up RD-3's stamp on the way past.
  switch (call.row) {
    // RD-1 -- history as UndoEdit answered, stamp as restored, no step pushed.
    // Only the columns table T-027 keeps outside the history are taken from the
    // document being left (see `columnsOutsideHistory`).
    case 'RD-1': {
      const outcome = undoEdit(held)
      // ⛔ Nothing moved, so nothing is built: WS-6 replaces ONE reference, and a
      // fresh object would not be the same value.
      if (!outcome.undone) return replacementSettled(held, outcome.next)
      return replacementSettled(
        held,
        keepingColumnsOutsideHistory(outcome.next, held.document),
      )
    }

    // RD-2 -- the same, walking the other way, with the same keeping.
    case 'RD-2': {
      const outcome = redoEdit(held)
      // The same short circuit, for the same MUST.
      if (!outcome.redone) return replacementSettled(held, outcome.next)
      return replacementSettled(
        held,
        keepingColumnsOutsideHistory(outcome.next, held.document),
      )
    }

    // RD-3 -- carries the current history forward; the only row whose stamp
    // advances and whose WS-4 can owe a step.
    case 'RD-3': {
      const outcome = importDocument({ ...call.importing, current: held.document })
      if (!outcome.ok) return importRefused(outcome.refusal)
      // WS-4 -- `report.undo` IS table T-027's answer, already read by
      // `importDocument`, so it is not read again (R2.7).
      // ⛔ STOP -- `'notDecided'` is a hole in table T-027 (no row for the overlay;
      // recorded in import-document.ts), not a choice made here. Nothing is pushed.
      const history =
        outcome.report.undo === 'oneStep'
          ? historyWithStep(
              held.history,
              // The step holds the outgoing document, as WS-4 always does. The
              // command list is empty because table T-108 has no import command.
              { document: held.document, commands: [] },
              stepSizeBytes(held.document),
              call.historyLimits,
            )
          : held.history
      // WS-5 -- the merge builds from the current document, so leaving the stamp
      // alone would break FR-063, AG-2 and AG-6.
      const document: Document = {
        ...outcome.document,
        documentStamp: advancedStamp(
          outcome.document.documentStamp,
          call.editedBy,
          call.updatedUtc,
          { hasMovedSchedule: hasMovedScheduleGroup(held.document, outcome.document) },
        ),
      }
      return replacementSettled(held, { document, history })
    }

    // RD-4 -- OP-3's replace: history dropped (OP-4, UN-6), stamp as the file
    // wrote it, no step.
    case 'RD-4': {
      const outcome = importDocument({ ...call.importing, current: held.document })
      if (!outcome.ok) return importRefused(outcome.refusal)
      return replacementSettled(held, { document: outcome.document, history: emptyHistory() })
    }

    // RD-6 -- the caller's document is WS-3's answer (table T-230); a startup
    // document has no history (table T-034). The stamp comes through untouched,
    // or FR-063's equality would have nothing to compare.
    case 'RD-6':
      return replacementSettled(held, { document: call.document, history: emptyHistory() })

    // RD-7 -- FR-095's reset: the caller's template is WS-3's answer, and the other
    // columns are RD-4's (table T-230). Same value as RD-6 here, but a different
    // cell: this discards a history that had entries (OP-4). The OP-4
    // confirmation is the caller's, before this road is entered.
    case 'RD-7':
      return replacementSettled(held, { document: call.document, history: emptyHistory() })
  }
}
