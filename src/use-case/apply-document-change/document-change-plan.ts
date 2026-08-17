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
// ⚠️ Nothing here replaces the current value or tells anybody. WS-6 and WS-7
// are the other file's, in that order, and the order is a MUST: a notice sent
// before the swap reaches subscribers that then read the OLD document.
//
// ⚠️ It is not the public entry of its component (Chapter 5.3, MUST NOT).

import type { Document } from '../../entity/document-model/document/document'
import {
  advancedStamp,
  isStampMatched,
  type DocumentStamp,
} from '../../entity/document-model/document-stamp/document-stamp'
import { historyWithStep, type EditHistory, type HistoryLimits } from '../../entity/document-model/edit-history/edit-history'
import {
  editDocument,
  type DocumentCommand,
  type Refusal,
  type SettingsLimits,
} from '../edit-document/edit-document'

/** One step of the undo history: the document as it stood before the write. */
export interface ChangeStep {
  readonly document: Document
  /** The rows of table T-108 this step undoes, in the order they were applied. */
  readonly commands: readonly string[]
}

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
  readonly updatedAt: string
}

/** Why a write was turned away before any command ran. */
export type PlanRefusal =
  | { readonly step: 'WS-1'; readonly reason: 'staleStamp' }
  | { readonly step: 'WS-2'; readonly reason: 'gestureInFlight' | 'editingInPlace' | 'deliveringNotices' }
  | { readonly step: 'WS-3'; readonly reason: 'refused'; readonly refusals: readonly Refusal[] }

export type ChangePlan =
  | { readonly ok: false; readonly refusal: PlanRefusal }
  | {
      readonly ok: true
      readonly document: Document
      readonly history: EditHistory<ChangeStep>
      /** True when the schedule group moved, which is the only thing FR-063 raises the revision for. */
      readonly raisedRevision: boolean
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
    // UN-8: the zoom and the position. ⚠️ `fitScheduleToScreen` is NOT here --
    // UN-17 makes the collapse it discards undoable, and FR-031 requires one
    // press to be one step.
    case 'setZoom':
    case 'setScrollPosition':
      return false
    // UN-12: where the two measuring lines stand.
    case 'setDualCursor':
      return false
    default:
      return true
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

function stepSize(document: Document): number {
  return utf8Length(JSON.stringify(document))
}

/**
 * Runs WS-1 to WS-5 and answers what the other half should commit.
 *
 * @purity pure
 */
export function planDocumentChange(input: PlanInput): ChangePlan {
  // ---- WS-1: the stamps ---------------------------------------------------
  // AG-2 compares all three fields, because the revision alone cannot see a
  // write that touched the presentation group only (FR-063 does not raise it).
  if (!isStampMatched(input.readStamp, input.document.revisionStamp)) {
    return { ok: false, refusal: { step: 'WS-1', reason: 'staleStamp' } }
  }

  // ---- WS-2: the moment ---------------------------------------------------
  const { moment } = input
  if (moment.gestureInFlight) {
    return { ok: false, refusal: { step: 'WS-2', reason: 'gestureInFlight' } }
  }
  if (moment.editingInPlace) {
    return { ok: false, refusal: { step: 'WS-2', reason: 'editingInPlace' } }
  }
  if (moment.deliveringNotices) {
    // Chapter 5.5: refusing rather than queueing, because FR-028 requires the
    // answer to say then and there whether the write was taken.
    return { ok: false, refusal: { step: 'WS-2', reason: 'deliveringNotices' } }
  }

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
          stepSize(input.document),
          input.historyLimits,
        )

  // ---- WS-5: advance the stamp -------------------------------------------
  // FR-063: the revision rises for a write that changed the SCHEDULE group,
  // and must not for one that changed the presentation group alone.
  //
  // ⚠️ Read from what actually moved, not from table T-108's group column:
  // `fitScheduleToScreen` is filed under 見せ方の群 and still clears
  // `isCollapsed`, which is a TaskGroup column. Every aggregate rebuilds the
  // schedule only when it touches it, so the reference answers exactly.
  const raisedRevision = held.schedule !== input.document.schedule
  const document: Document = {
    ...held,
    revisionStamp: advancedStamp(held.revisionStamp, input.editedBy, input.updatedAt, {
      raisesRevision: raisedRevision,
    }),
  }

  return { ok: true, document, history, raisedRevision }
}
