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
// ⚠️ It is not the public entry of its component (Chapter 5.3, MUST NOT).

import type { Document } from '../../entity/document-model/document/document'
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
  const hasMovedSchedule = hasMovedScheduleGroup(input.document, held)
  const document: Document = {
    ...held,
    documentStamp: advancedStamp(held.documentStamp, input.editedBy, input.updatedUtc, {
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
 * The six callers of table T-230, each carrying only what its own row needs.
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
  /** RD-5 -- coming back from an autosave (LM-9). The caller brings it. */
  | { readonly row: 'RD-5'; readonly document: Document }
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

/** @purity pure */
function replacementSettled(held: HeldDocument, next: HeldDocument): ReplacementPlan {
  return { ok: true, next, hasMovedSchedule: hasMovedScheduleBetween(held.document, next.document) }
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
    case 'RD-1':
      return replacementSettled(held, undoEdit(held).next)

    // RD-2 -- the same three columns, walking the other way.
    case 'RD-2':
      return replacementSettled(held, redoEdit(held).next)

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

    // RD-5 and RD-6 -- the caller brings the document, so the document it
    // brought IS WS-3's answer (T-230). ⚠️ The two rows word their history
    // column differently and land on the same value: one has a history to drop
    // (LM-9) and one has none to begin with (table T-034), and an empty history
    // is what both of them mean.
    // ⭐ The stamp comes through untouched on both. A stamp minted here would
    // leave FR-062's comparison with nothing of the writing to compare against.
    case 'RD-5':
    case 'RD-6':
      return replacementSettled(held, { document: call.document, history: emptyHistory() })
  }
}
