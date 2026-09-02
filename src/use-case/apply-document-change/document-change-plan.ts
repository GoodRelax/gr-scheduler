// ApplyDocumentChange -- the pure half.
//
// @unit      UF-9   (docs/spec/05-07-design.md, table T-075)
// @component ApplyDocumentChange, layer UseCase (table T-062)
// @purity    pure
//
// Steps WS-1 to WS-5 of table T-067: match the stamps, judge the moment,
// validate and build, push one step of history, advance the stamp. Table
// T-063's UT-1 splits this away from the other half because LY-3 fixes the
// seam there -- "操作と検証は `pure`、確定と通知は `non-pure`".
//
// ⭐ BOTH ROADS THROUGH THOSE FIVE STEPS LIVE HERE. `planDocumentChange` is the
// one that arrives as a list of table T-108 commands; `planDocumentReplacement`
// is the one that replaces the document whole, whose six callers and their
// three differences are table T-230. The five steps are the same five, so they
// are not written twice: WS-1 and WS-2 are one shape and one judgement for both.
//
// ⚠️ Nothing here replaces the current value or tells anybody. WS-6 and WS-7
// are the other file's, in that order, and the order is a MUST: a notice sent
// before the swap reaches subscribers that then read the OLD document.
//
// ⭐ THIS FILE IS THE ONE PLACE TABLE T-027 IS READ, and it reads it twice:
// `isUndoable` for the writes that leave no step, and `columnsOutsideHistory`
// for the columns those writes own -- which RD-1 and RD-2 keep through a
// restore instead of rewinding. UndoEdit and RedoEdit say in their own headers
// that they never read that table, so both readings have to live together here.
//
// ⚠️ It is not the public entry of its component (Chapter 5.3, MUST NOT).

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
  type Refusal,
  type SettingsLimits,
} from '../edit-document/edit-document'
// LR-2: the three components table T-230 names in the WS-3 column, each through
// its own public entry. ⭐ The arrows run this way and not the other -- the
// component figure has ApplyDocumentChange ask them, and A-appendix 0.86
// settles it in words -- which is why `ChangeStep` and `HeldDocument` are
// declared in UndoEdit and taken from there (LR-3).
import { importDocument, type ImportRefusal, type ImportRequest } from '../import-document/import-document'
import { redoEdit } from '../redo-edit/redo-edit'
import { undoEdit, type ChangeStep, type HeldDocument } from '../undo-edit/undo-edit'
// The one destination Chapter 6.2 gives the display words. ⚠️ A JSON import is
// DATA, not a reach into ScreenRenderer: `check_layer_rules.py` reads a `.json`
// specifier as data, and `edit-task-group.ts` already takes the same word from
// the same file for the same requirement.
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
  /** The instant of this write. FR-063 spells it ISO 8601, UTC, to the second. */
  readonly updatedUtc: string
}

/**
 * WS-1 turned the write away. ⭐ One shape for both roads: table T-230 changes
 * three things about a whole-document replacement and WS-1 is not one of them.
 */
export type StampRefusal = { readonly step: 'WS-1'; readonly reason: 'staleStamp' }

/** WS-2 turned the write away. One shape for both roads, for the same reason. */
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
       * WS-5's judgement: the schedule-data group moved, which is the only
       * thing FR-063 moves `scheduleUpdatedUtc` for.
       *
       * ⭐ It travels on the answer because AG-6 selects live watchers by it
       * (MUST) and says in as many words that WS-5 has already made the call.
       * Deriving it a second time on the notifying side is the duplication
       * R2.7 refuses, and two derivations are two chances to disagree.
       */
      readonly hasMovedSchedule: boolean
    }

/**
 * Whether table T-027 puts this command in the history.
 *
 * ⭐ The presentation-group commands that ARE undoable are the multi-valued
 * ones -- UN-13 holds them because FR-049 limits UN-7's "toggles" to the rows
 * whose type is boolean. So `setElementVisible` is the one presentation
 * command that leaves no step, along with the three UN-16 names.
 *
 * @purity pure
 */
function isUndoable(command: DocumentCommand): boolean {
  switch (command.kind) {
    // UN-7: the eight boolean rows of table T-202.
    case 'setElementVisible':
      return false
    // UN-16: where you look and what you export, not what the schedule says.
    case 'setPanelWidths':
    case 'pinTaskGroup':
    case 'unpinTaskGroup':
    case 'setExportPngScale':
      return false
    // UN-8: the zoom and the position. ⭐ `fitScheduleToScreen` IS here now.
    // FR-031 (MUST) splits one fit press into two writes: CM-71 puts the zoom
    // and the place and leaves no step by this row, and CM-72
    // (`expandAllTaskGroups`) pushes the one step UN-17 asks for -- it falls
    // through to `default` below. ⛔ The order MUST NOT be swapped: WS-4 pushes
    // the document as it stood BEFORE that write, so the step CM-72 pushes
    // already holds the new zoom, and an undo gives back the new zoom with the
    // old collapses. Written as one command, or as one bundle of the two, that
    // step would carry the OLD zoom and the undo would rewind it, against this
    // very row.
    case 'setZoom':
    case 'setScrollPosition':
    case 'fitScheduleToScreen':
      return false
    // UN-12: where the two measuring lines stand.
    case 'setDualCursor':
      return false
    default:
      return true
  }
}

/**
 * The current value of every settings column table T-027 keeps OUTSIDE the
 * history -- what a restore has to KEEP rather than rewind.
 *
 * ⭐ THE CENSUS HAS ONE HOME AND IT IS HERE, beside `isUndoable`, because the
 * two read the same table from opposite ends: that one says which WRITES leave
 * no step, this one says which COLUMNS those writes own. ⛔ UndoEdit and
 * RedoEdit MUST NOT grow a second one -- both headers state that they never
 * read table T-027, and that is exactly why the keeping happens on this side of
 * the seam.
 *
 * ⚠️ WHY A RESTORE NEEDS THIS AT ALL. WS-4 of table T-067 pushes the document
 * as it stood BEFORE a write, so a step pushed by an unrelated edit made AFTER
 * one of these writes carries the column as it stood at that earlier moment.
 * Restoring that step verbatim hands the old value back -- the panel width
 * (FR-052) walks backwards on a Ctrl+Z although the drag pushed no step of its
 * own. ⭐ It is the trap the order of CM-71 and CM-72 already dodges for the
 * zoom (see `isUndoable`): ordering answers it for ONE press, this answers it
 * for every step already on the stack.
 *
 * ⭐ Read command by command off the arms of `editDocumentSettings`: one entry
 * per column the commands `isUndoable` refuses actually write. ⛔ A column no
 * row of table T-027 excludes MUST NOT be listed -- keeping one the history
 * owns would silently un-do the undo.
 *
 * @purity pure
 */
function columnsOutsideHistory(current: DocumentSettings): Partial<DocumentSettings> {
  return {
    // UN-7 -- the eight boolean rows of table T-202, every one of them written
    // by `setElementVisible` (CM-58) and by nothing else.
    // ⚠️ THE MULTI-VALUED ROWS OF THAT TABLE STAY INSIDE THE HISTORY (UN-13,
    // which FR-049 narrows UN-7 to booleans for), so `stackDirection` (S-58),
    // `planActualDisplay` (S-59), `guideCursorMode` (S-66) and `fontScale`
    // (S-70) are absent by ruling and not by omission.
    // ⛔⛔ `watermarkVisible` (S-144) IS NOT AMONG THEM SINCE 2026-09-02, and
    // its absence is a ruling rather than an omission (利用者の裁定, CR-335):
    // the row LEFT table T-202 for table T-206 that day, so UN-7 -- which rules
    // on 表 T-202 の真偽の行 -- no longer reaches it, and there is no column of
    // `DocumentSettings` left to keep. ⭐ Nothing is owed here in its place:
    // the value is `ScreenState.watermarkVisible` now, and the history holds
    // the DOCUMENT, so a value the document does not carry cannot be rewound
    // by an undo in the first place.
    assigneeVisible: current.assigneeVisible,
    percentCompleteVisible: current.percentCompleteVisible,
    dependencyVisible: current.dependencyVisible,
    progressMarkerVisible: current.progressMarkerVisible,
    progressLineVisible: current.progressLineVisible,
    dateGridLinesVisible: current.dateGridLinesVisible,
    groupGridLinesVisible: current.groupGridLinesVisible,
    baselineVisible: current.baselineVisible,

    // UN-16 -- where you look and what you export. `setPanelWidths` (CM-67)
    // writes the pair, `setExportPngScale` (CM-70) writes the scale.
    rowTitlePanelWidth: current.rowTitlePanelWidth,
    propertyPanelWidth: current.propertyPanelWidth,
    exportPngScale: current.exportPngScale,
    // ⛔ `pinnedGroupIds` (S-126) IS NOT KEPT, AND THAT IS NOW WHAT THE ROWS
    // SAY. UN-16 used to name it, which put it against IV-3 of table T-220
    // (every pinned id names a `TaskGroup` THAT EXISTS): pin a row, undo the
    // write that created it, and a kept id points at a row that is gone. No row
    // ruled on that meeting, so this file reported it rather than choosing.
    // ⭐ UN-14 now holds pinning, so the pins travel inside the history and
    // IV-3 holds itself -- a snapshot's pins can only name rows that existed
    // when it was taken, so no sweep rule is written anywhere.

    // UN-8 -- the zoom and the place. `setZoom` (CM-65) writes the first pair,
    // `setScrollPosition` (CM-66) the four anchors, `fitScheduleToScreen`
    // (CM-71) all six.
    // ⚠️ `scrollGroupId` (S-78) is ALSO written by `deleteTaskGroup` (CM-27),
    // which is undoable (UN-14) and sends the anchor to `null` behind the row
    // it deletes (CD-2). Keeping the current `null` through an undo is what
    // UN-8 asks for -- where the view sits is not the schedule -- so the two
    // rows agree here and nothing is owed.
    zoomX: current.zoomX,
    zoomY: current.zoomY,
    scrollDate: current.scrollDate,
    scrollGroupId: current.scrollGroupId,
    scrollDayOffset: current.scrollDayOffset,
    scrollGroupOffset: current.scrollGroupOffset,

    // UN-12 -- where the two measuring lines stand (`setDualCursor`, CM-60).
    // ⚠️ `clearDualCursor` (CM-61) writes the SAME column and IS undoable --
    // `isUndoable` does not name it -- so DC-7's clearing pushes a step, and
    // keeping this column means undoing that step no longer brings the two
    // lines back. ⛔ Table T-027 rules on the POSITION (UN-12) and nowhere on
    // the clearing, and UN-13's own note sweeps every multi-valued row of table
    // T-202 -- S-65 among them -- INSIDE the history, which UN-12 contradicts
    // by name. The row that names this column is UN-12, so the column is kept.
    // Reported.
    dualCursor: current.dualCursor,
  }
}

/**
 * `restored` with every column of `columnsOutsideHistory` taken from the
 * document being left behind, so that one press of undo or redo gives back the
 * schedule and not the reader's view of it.
 *
 * ⚠️ THE HISTORY IS NOT TOUCHED. Only the document a restore lands on is, and
 * the entry the walk moved across already carries the document being left
 * behind (UndoEdit / RedoEdit both put it there), so the next press keeps these
 * columns from whatever is current THEN.
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
 * What one held step costs, for the total S-95 bounds.
 *
 * ✅ FR-031 now states the measure (CR-182): the stored form, encoded as UTF-8,
 * in bytes. ⛔ This used to count CHARACTERS and said so as a decision of its
 * own -- and S-95 is written in megabytes, so on Japanese text, where one
 * character is three bytes, the bound was running about three times loose.
 *
 * ⛔ `TextEncoder` is NOT used, and the attempt to is worth recording: LR-6
 * compiles UseCase without the DOM library, so `tsc` refused it outright. The
 * rule held where a comment claiming the API was "not really DOM" would have
 * slipped past a reader. The bytes are counted from the code points instead --
 * eight lines, pure, and testable without a runtime global.
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
 * The size one held step is pushed with. FR-031 (MUST) fixes the measure and
 * this applies it to the whole document a step holds: the packed `GRS JSON`
 * form -- no indent, no line breaks -- encoded as UTF-8, counted in bytes.
 *
 * ⚠️ The packed form is built to be COUNTED and is stored nowhere; FR-024 and
 * FR-061 write the indented one. So `JSON.stringify` is called with no spacing
 * argument, which is that form exactly.
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
 * The name the row of the invariant takes.
 *
 * ⭐ READ, NEVER TYPED. Table T-050 (MUST) says the name is 「`FR-038` の辞書の
 * `defaultNames` の `row` の語」 and (MUST NOT) forbids minting a second word,
 * so the word is taken from the ONE destination Chapter 6.2 gives the words.
 *
 * ⚠️ THE SAME READ IS WRITTEN IN `edit-task-group.ts`, AND THAT IS NOT A COPY
 * OF THE WORD -- both read the one dictionary, and neither spells it. A shared
 * constant is what a reader would reach for, and it cannot be had: a name that
 * left EditDocument's folder for this one would be a crossing table T-064 does
 * not publish, and a file of its own would be a unit table T-075 does not list.
 * ⛔ So the duplication is the LOOKUP and never the word. If the dictionary
 * moves the word, both sites move with it, which is what the MUST NOT is for.
 *
 * ⚠️ The English cell, for the reason `edit-task-group.ts` gives at length:
 * FR-038 (MUST NOT) keeps the display language out of the document, and what is
 * written here is a `TaskGroup.label` that the file carries to an exchange
 * partner -- not a printed word. Table T-050 settles the reading anyway
 * (利用者の裁定 2026-09-01): the word is spelled the same in Japanese.
 */
const DEFAULT_ROW_NAME_ENTRY = displayWords.defaultNames.find((one) => one.use === 'row')
const DEFAULT_ROW_NAME: string =
  DEFAULT_ROW_NAME_ENTRY === undefined ? '' : DEFAULT_ROW_NAME_ENTRY.text.en

/**
 * The identifier the row of the invariant takes.
 *
 * ⛔ NO ROW OF THE SPECIFICATION SAYS WHERE IT COMES FROM, and this file is not
 * inventing one -- it is picking the only value that cannot be wrong. Every
 * OTHER row is created by CM-26, whose identifier arrives as a value because
 * `TaskGroup.id` is a UUID (AT-51) and LY-5 leaves the outside to the Framework
 * (`InputContext.newGroupId`). This row is created by an invariant that no
 * caller asked for, so there is no caller to bring one, and WS-1 to WS-5 are
 * `pure`: nothing here may reach a generator.
 *
 * ⭐ A CONSTANT IS SAFE HERE, and provably, which is why it is a constant
 * rather than a derivation: the invariant fires only when the document holds
 * ZERO rows, so IV-1 (the identifiers are unique across the array) is satisfied
 * by ANY value, and two rows carrying this one can never stand side by side.
 * A merge that meets it on both sides (FR-023) already folds equal identifiers
 * together, so no dangling `TaskGroupMember` is left either.
 * ⚠️ IT IS STILL A VALUE NOBODY RULED ON. Overturning it costs this constant
 * and the cases that name it; nothing is stored anywhere that reads it back.
 */
const EMPTY_DOCUMENT_TASK_GROUP_ID = '00000000-0000-4000-8000-000000000001'

/**
 * The document, holding the `TaskGroup` table T-050 requires it to have.
 *
 * ⭐⭐ THE INVARIANT, AND IT IS WRITTEN HERE ONCE BECAUSE THIS FILE IS WHERE
 * EVERY ROAD MEETS. Table T-050 (MUST NOT) forbids transcribing it per road --
 * 「経路ごとに書き写してはならない」 -- and names four that can take the count
 * to zero: a delete (FR-032), an import (FR-023), OP-3's replace, and a redo.
 * All four arrive at WS-3 of table T-067, and the two roads through WS-3 are
 * `planDocumentChange` and `planDocumentReplacement`, both below.
 *
 * ⭐ THE ROW STANDS AT `L1` BY DERIVATION, not by assignment: FR-004 derives the
 * depth from the parent, so a row with `parentId: null` cannot stand anywhere
 * else. `order` is 0 because there is no other row to stand after.
 * ⭐ The four remaining columns start absent, exactly as CM-26 leaves them.
 * `label` is filled and `derivedFromTaskUid` is not, which is the pairing AT-54
 * and FR-058 require of every row.
 *
 * ⛔ NOTHING IS REFUSED HERE. Table T-050 (MUST NOT): 「最後の 1 行の削除を拒ん
 * ではならない」 -- the delete lands, and being empty afterwards is what this
 * answers. And the count FR-032 asks about is settled before the write reaches
 * WS-3, so the row this makes is not added to it (MUST NOT).
 *
 * ⚠️ THE SAME REFERENCE COMES BACK when the document already holds a row, and
 * that is a MUST rather than a nicety: WS-6 replaces ONE reference, and RD-1's
 * `undone: false` hands the very pair it was given straight back.
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
 * Whether a write moved the schedule-data group -- WS-5's own question.
 *
 * FR-063: `scheduleUpdatedUtc` moves for a write that changed the SCHEDULE
 * group, and MUST NOT move for one that changed the presentation group alone.
 * The other instant and the writer move either way.
 *
 * ⚠️ Read from what actually moved, not from table T-108's group column. Every
 * aggregate rebuilds the schedule only when it touches it, so the reference
 * answers exactly, and no command has to be listed anywhere for it to answer.
 * ⭐ Since FR-031 split the fit press in two, the two halves land on opposite
 * answers by themselves: CM-71 writes `documentSettings` alone and moves no
 * schedule instant, and CM-72 clears `isCollapsed`, a TaskGroup column, and
 * moves it -- which is why table T-108 files CM-72 under `TaskGroup`.
 *
 * @purity pure
 */
function hasMovedScheduleGroup(before: Document, after: Document): boolean {
  return before.schedule !== after.schedule
}

/**
 * WS-1 of table T-067, for both roads.
 *
 * AG-2 compares all three fields and refuses on one difference (MUST): the
 * schedule instant alone cannot see a write that touched the presentation
 * group only, because FR-063 does not move it for one.
 *
 * ⛔ `declared` is what the WRITER SAYS IT READ, and `current` is the stamp the
 * document holds NOW. Table T-230 forbids matching against the stamp of a
 * document coming IN (MUST NOT) -- by definition that one differs from the
 * current one, so matching it would refuse every replacement there is.
 * ⛔ `null` is a caller that declared nothing, and that is NOT a refusal on its
 * own -- table T-230 forbids refusing for the absence alone (MUST NOT). AG-2's
 * declaration is a capability, not a duty. Only the command road types it out
 * of existence, by asking for a stamp rather than for a stamp or nothing.
 *
 * @purity pure
 */
function refusalOfStamp(declared: DocumentStamp | null, current: DocumentStamp): StampRefusal | null {
  if (declared === null) return null
  return isStampMatched(declared, current) ? null : { step: 'WS-1', reason: 'staleStamp' }
}

/**
 * WS-2 of table T-067, for both roads: AG-9's two, and the re-entry Chapter 5.5
 * refuses. ⚠️ Refusing rather than queueing, because FR-028 requires the answer
 * to say then and there whether the write was taken.
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
  for (const command of input.commands) {
    const result = editDocument(held, command, input.settingsLimits)
    if (!result.ok) {
      refusals.push(...result.refusals)
      continue
    }
    held = result.document
  }
  // AG-3: one refusal throws the whole bundle away. `held` is dropped on the
  // floor -- nothing has been replaced, so there is nothing to roll back.
  if (refusals.length > 0) {
    return { ok: false, refusal: { step: 'WS-3', reason: 'refused', refusals } }
  }

  // ⭐ The invariant of table T-050, as PART OF THIS WRITE. It stands here and
  // not in the aggregate that emptied the document because the MUST NOT under
  // that table forbids one copy per road -- and it stands BEFORE WS-4 and WS-5
  // because both are answers about the document this write settles on: the
  // step WS-4 pushes holds the document as it stood BEFORE the write either
  // way, which is what makes ONE press of undo give the deleted rows back.
  const settled = documentHoldingOneRow(held)

  // ---- WS-4: one step of history --------------------------------------
  // AG-10: a call table T-027 excludes runs and is simply not recorded. A
  // bundle earns a step when ANY of its commands does.
  const recorded = input.commands.filter(isUndoable)
  const history =
    recorded.length === 0
      ? input.history
      : historyWithStep(
          input.history,
          { document: input.document, commands: recorded.map((one) => one.kind) },
          stepSizeBytes(input.document),
          input.historyLimits,
        )

  // ---- WS-5: advance the stamp -------------------------------------------
  // ⭐ On this road WS-5 is also the ONE place the judgement is made. AG-6
  // names WS-5 as the step that makes it, so it leaves on the answer below
  // rather than being worked out again from the stamp by whoever notifies
  // (R2.7). ⚠️ The replacement road has rows where WS-5 makes no judgement at
  // all, which is why table T-230 gives WS-7 its own way to reach the flag.
  // ⚠️ Judged on the SETTLED document, so that a write which ends by making the
  // row moves the schedule instant: a `TaskGroup` is schedule-group data, and
  // FR-063 moves that instant for a write that touched the group.
  const hasMovedSchedule = hasMovedScheduleGroup(input.document, settled)
  const document: Document = {
    ...settled,
    documentStamp: advancedStamp(settled.documentStamp, input.editedBy, input.updatedUtc, {
      hasMovedSchedule,
    }),
  }

  return { ok: true, document, history, hasMovedSchedule }
}

// ---------------------------------------------------------------------------
// The whole-document road -- table T-230. Its six rows are the whole set of
// callers, and they differ in three things only: the history, the stamp, and
// whether one undo step is pushed. Everything else is the same WS-1 to WS-7.
// ---------------------------------------------------------------------------

/**
 * What a caller of `importDocument` (PI-10) brings, minus the two fields this
 * road fills in for it.
 *
 * ⭐ `current` is not the caller's to bring: CS-3 of table T-066 has the pair
 * read ONCE, and that one read is the current document.
 * ⭐ `choice` is fixed by the row -- RD-3 covers `'merge'` and `'baseline'`,
 * RD-4 is OP-3's `'replace'` -- so no caller can name one row and be handed the
 * other row's treatment of its history.
 */
export type ImportCall<TChoice extends ImportRequest['choice']> = Omit<
  ImportRequest,
  'current' | 'choice'
> & { readonly choice: TChoice }

/**
 * The five callers of table T-230, each carrying only what its own row needs.
 *
 * ⚠️ RD-5 was 「自動保存からの復帰」 until CR-280 retired the autosave on the
 * user's ruling (2026-08-29). Its seat number stays burnt.
 *
 * ⛔ THE ROW IS AN ARGUMENT, NEVER A GUESS. T-230 requires a caller to name its
 * own row (MUST) and forbids accepting a replacement that names none (MUST
 * NOT): if keeping or dropping the history were the caller's own habit, nobody
 * on the path would be checking the MUST that OP-4 puts on it.
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
      /** FR-063 spells it ISO 8601, UTC, to the second. */
      readonly updatedUtc: string
    }
  /** RD-4 -- OP-3's `'replace'`. WS-3 is ImportDocument (PI-10). */
  | { readonly row: 'RD-4'; readonly importing: ImportCall<'replace'> }
  /** RD-6 -- the document at startup (FR-062, table T-034). The caller brings it. */
  | { readonly row: 'RD-6'; readonly document: Document }

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
      /** ⚠️ Four of these are questions to put to a person, not GRS refusing. */
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
 * The flag WS-7 is handed on this road, derived from the outgoing and the
 * incoming `scheduleUpdatedUtc` (MUST).
 *
 * ⭐ Table T-230 gives WS-7 its own way to reach it because five of the six
 * rows leave WS-5 with no judgement to make: an undo restores an earlier stamp
 * (FR-031), and a document out of a file, an autosave or a startup template
 * keeps the stamp it was written with (FR-062).
 * ⛔ AN EQUALITY, NEVER AN ORDER (FR-063, MUST NOT). A stamp answers which
 * document this is, not which of two is the newer -- and the restored document
 * of an undo is precisely the one an order would call "not newer" and drop.
 * ⚠️ Two writes inside one second therefore read as "did not move" here, which
 * is the same second-resolution wrinkle FR-063 already carries.
 *
 * @purity pure
 */
function hasMovedScheduleBetween(outgoing: Document, incoming: Document): boolean {
  return outgoing.documentStamp.scheduleUpdatedUtc !== incoming.documentStamp.scheduleUpdatedUtc
}

/**
 * ⭐ THE ONE GATE OF THE WHOLE-DOCUMENT ROAD, which is why the invariant of
 * table T-050 is applied here: all five rows of table T-230 leave through this
 * function, so the rule is read once for an undo, a redo, both imports and the
 * document a startup brings.
 *
 * ⚠️ `next` COMES BACK UNTOUCHED when it already holds a row, references and
 * all -- RD-1 and RD-2 hand the very pair they were given back when nothing
 * moved, and WS-6 replaces ONE reference (MUST).
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
 * Runs WS-1 to WS-5 for a whole-document replacement and answers what the other
 * half should commit. The row of table T-230 decides the last three of them.
 *
 * ⛔ THE DOCUMENT COMING IN IS NOT VALIDATED AGAIN (T-230, MUST NOT): OP-5 and
 * FR-023 already carry that, and the documents an undo history holds were never
 * theirs to carry in the first place.
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
  // ⚠️ One switch and not three: table T-230 is read by row and not by column,
  // so a caller that named RD-1 cannot pick up RD-3's stamp on the way past.
  switch (call.row) {
    // RD-1 -- the history is the one the asked side answered, the stamp comes
    // through as it came in, and no step is pushed. All three are `next`
    // verbatim, so WS-4 and WS-5 have nothing left to do on this row.
    // ⚠️ Committed whether or not a step actually moved: `undone: false` hands
    // back the very pair it was given (FR-031 calls that an answer, not an
    // error), so one commit is right either way.
    // ⚠️ THE DOCUMENT IS NOT COMMITTED VERBATIM, and only here: the columns
    // table T-027 keeps outside the history are taken from the document being
    // left behind (see `columnsOutsideHistory`). The three columns T-230 gives
    // this row are untouched by that -- the history is still the answered one,
    // the stamp is still the restored one, and still no step is pushed.
    case 'RD-1': {
      const outcome = undoEdit(held)
      // ⛔ NOTHING MOVED, SO NOTHING IS BUILT. `undone: false` hands the very
      // pair back, and WS-6 replaces ONE reference (MUST) -- a document that
      // did not move has to stay the same value, which a fresh object built
      // out of the columns of itself would not be.
      if (!outcome.undone) return replacementSettled(held, outcome.next)
      return replacementSettled(
        held,
        keepingColumnsOutsideHistory(outcome.next, held.document),
      )
    }

    // RD-2 -- the same three columns, walking the other way. ⚠️ And the same
    // keeping: a redo replays a write, which is no more a reason to move the
    // panel width or the zoom than an undo is.
    case 'RD-2': {
      const outcome = redoEdit(held)
      // The same short circuit, for the same MUST.
      if (!outcome.redone) return replacementSettled(held, outcome.next)
      return replacementSettled(
        held,
        keepingColumnsOutsideHistory(outcome.next, held.document),
      )
    }

    // RD-3 -- the row that carries the current history forward, and the only
    // one of the six whose stamp advances and whose WS-4 can owe a step.
    case 'RD-3': {
      const outcome = importDocument({ ...call.importing, current: held.document })
      if (!outcome.ok) return importRefused(outcome.refusal)
      // WS-4 -- T-230 hands the question to table T-027, and `importDocument`
      // has already read that table for this import: `report.undo` IS T-027's
      // answer, so nothing here reads it a second time (R2.7).
      // ⛔ STOP -- `'notDecided'` IS A HOLE IN TABLE T-027, NOT A CHOICE MADE
      // HERE: import-document.ts records that T-027 has no row for the overlay
      // at all. Nothing is pushed while that stays true, and whether to push is
      // exactly what is undecided.
      const history =
        outcome.report.undo === 'oneStep'
          ? historyWithStep(
              held.history,
              // The step holds the document going out, as WS-4 always does.
              // ⚠️ The command list is EMPTY because the field holds rows of
              // table T-108 and that table has no import command -- empty by
              // what the field is, not by an omission here.
              { document: held.document, commands: [] },
              stepSizeBytes(held.document),
              call.historyLimits,
            )
          : held.history
      // WS-5 -- this row advances the stamp and no other row does. The merge
      // builds its result out of the current document, so leaving the stamp
      // alone here would break FR-063, AG-2 and AG-6 at once.
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

    // RD-4 -- OP-3's replace. The history is dropped (OP-4, and UN-6 says in as
    // many words that a replace cannot be undone), the stamp comes through as
    // the file wrote it, and no step is pushed.
    case 'RD-4': {
      const outcome = importDocument({ ...call.importing, current: held.document })
      if (!outcome.ok) return importRefused(outcome.refusal)
      return replacementSettled(held, { document: outcome.document, history: emptyHistory() })
    }

    // RD-6 -- the caller brings the document, so the document it brought IS
    // WS-3's answer (T-230), and its 「空にする」 is an empty history because
    // a startup document has none to begin with (table T-034).
    // ⭐ The stamp comes through untouched. A stamp minted here would leave
    // FR-063's equality with nothing of the writing to compare against.
    case 'RD-6':
      return replacementSettled(held, { document: call.document, history: emptyHistory() })
  }
}
