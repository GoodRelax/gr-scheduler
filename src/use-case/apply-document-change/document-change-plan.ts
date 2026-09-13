// The pure half of ApplyDocumentChange: steps WS-1 to WS-5 for both write roads.
// @unit      UF-9   (docs/spec/05-07-design.md, table T-075)
// @component ApplyDocumentChange, layer UseCase (table T-062)
// @purity    pure

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
import { importDocument, type ImportRefusal, type ImportRequest } from '../import-document/import-document'
import { redoEdit } from '../redo-edit/redo-edit'
import { undoEdit, type ChangeStep, type HeldDocument } from '../undo-edit/undo-edit'
import displayWords from '../../adapter/screen-renderer/display-words.json'

// see AG-9
export interface WriteMoment {
  readonly gestureInFlight: boolean
  readonly editingInPlace: boolean
  readonly deliveringNotices: boolean
}

export interface PlanInput {
  readonly document: Document
  readonly readStamp: DocumentStamp
  readonly commands: readonly DocumentCommand[]
  readonly moment: WriteMoment
  readonly history: EditHistory<ChangeStep>
  readonly historyLimits: HistoryLimits
  readonly settingsLimits: SettingsLimits
  readonly editedBy: string
  readonly updatedUtc: string
}

export type StampRefusal = { readonly step: 'WS-1'; readonly reason: 'staleStamp' }

export type MomentRefusal = {
  readonly step: 'WS-2'
  readonly reason: 'gestureInFlight' | 'editingInPlace' | 'deliveringNotices'
}

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
      readonly hasMovedSchedule: boolean
      readonly report: EditReport
    }

// see T-027, AG-10
// TRAP: change together with columnsOutsideHistory: a command answering false here must write only
// columns listed there, or an undo rewinds its effect.
/** @purity pure */
function isUndoable(command: DocumentCommand): boolean {
  switch (command.kind) {
    case 'setElementVisible':
      return false
    case 'setPanelWidths':
      return false
    // TRAP: FR-031 splits a fit into CM-71 (no step) then CM-72 (a step); swapping or merging
    // them makes an undo rewind the zoom against UN-8.
    case 'setZoom':
    case 'setScrollPosition':
    case 'fitScheduleToScreen':
      return false
    case 'setDualCursor':
    case 'clearDualCursor':
      return false
    default:
      return true
  }
}

// see T-027, UN-7, UN-8, UN-12, UN-16
// TRAP: never list a column the history owns; keeping it would silently undo the undo.
/** @purity pure */
function columnsOutsideHistory(current: DocumentSettings): Partial<DocumentSettings> {
  return {
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

    rowTitlePanelWidth: current.rowTitlePanelWidth,
    propertyPanelWidth: current.propertyPanelWidth,

    zoomX: current.zoomX,
    zoomY: current.zoomY,
    scrollDate: current.scrollDate,
    scrollGroupId: current.scrollGroupId,
    scrollDayOffset: current.scrollDayOffset,
    scrollGroupOffset: current.scrollGroupOffset,

    dualCursor: current.dualCursor,
  }
}

/** @purity pure */
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

/** @purity pure */
function utf8Length(text: string): number {
  let bytes = 0
  for (const character of text) {
    const point = character.codePointAt(0) ?? 0
    bytes += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4
  }
  return bytes
}

// see FR-031, S-95
/** @purity pure */
function stepSizeBytes(document: Document): number {
  return utf8Length(JSON.stringify(document))
}

// WHY: the en cell, not the display language; the row label is document data (FR-038).
const DEFAULT_ROW_NAME_ENTRY = displayWords.defaultNames.find((one) => one.use === 'row')
const DEFAULT_ROW_NAME: string =
  DEFAULT_ROW_NAME_ENTRY === undefined ? '' : DEFAULT_ROW_NAME_ENTRY.text.en

// STOP: spec does not decide the id of the invariant's row. Looked in T-050, CM-26, AT-51
const EMPTY_DOCUMENT_TASK_GROUP_ID = '00000000-0000-4000-8000-000000000001'

// see T-050, FR-004
// TRAP: a non-empty document must come back as the same reference; WS-6 replaces one reference.
/** @purity pure */
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

// see FR-063
/** @purity pure */
function hasMovedScheduleGroup(before: Document, after: Document): boolean {
  return before.schedule !== after.schedule
}

// see AG-2, T-230
// TRAP: match the held stamp, never the incoming document's; that would refuse every replacement.
/** @purity pure */
function refusalOfStamp(declared: DocumentStamp | null, current: DocumentStamp): StampRefusal | null {
  if (declared === null) return null
  return isStampMatched(declared, current) ? null : { step: 'WS-1', reason: 'staleStamp' }
}

// see AG-9
/** @purity pure */
function refusalOfMoment(moment: WriteMoment): MomentRefusal | null {
  if (moment.gestureInFlight) return { step: 'WS-2', reason: 'gestureInFlight' }
  if (moment.editingInPlace) return { step: 'WS-2', reason: 'editingInPlace' }
  if (moment.deliveringNotices) return { step: 'WS-2', reason: 'deliveringNotices' }
  return null
}

// see T-067, AG-3, AG-10
/** @purity pure */
export function planDocumentChange(input: PlanInput): ChangePlan {
  const stale = refusalOfStamp(input.readStamp, input.document.documentStamp)
  if (stale !== null) return { ok: false, refusal: stale }

  const untimely = refusalOfMoment(input.moment)
  if (untimely !== null) return { ok: false, refusal: untimely }

  let held = input.document
  const refusals: Refusal[] = []
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
  if (refusals.length > 0) {
    return { ok: false, refusal: { step: 'WS-3', reason: 'refused', refusals } }
  }

  const settled = documentHoldingOneRow(held)

  // TRAP: identity means nothing moved only while every edit-document arm returns the document it got.
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

  const hasMovedSchedule = hasMovedScheduleGroup(input.document, settled)
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

export type ImportCall<TChoice extends ImportRequest['choice']> = Omit<
  ImportRequest,
  'current' | 'choice'
> & { readonly choice: TChoice }

// see T-230
export type ReplacementCall =
  | { readonly row: 'RD-1' }
  | { readonly row: 'RD-2' }
  | {
      readonly row: 'RD-3'
      readonly importing: ImportCall<'merge' | 'baseline'>
      readonly historyLimits: HistoryLimits
      readonly editedBy: string
      readonly updatedUtc: string
    }
  | { readonly row: 'RD-4'; readonly importing: ImportCall<'replace'> }
  | { readonly row: 'RD-6'; readonly document: Document }
  | { readonly row: 'RD-7'; readonly document: Document }

export interface ReplacementInput {
  readonly held: HeldDocument
  readonly readStamp: DocumentStamp | null
  readonly moment: WriteMoment
  readonly call: ReplacementCall
}

export type ReplacementRefusal =
  | StampRefusal
  | MomentRefusal
  | {
      readonly step: 'WS-3'
      readonly reason: 'importRefused'
      readonly refusal: ImportRefusal
    }

export type ReplacementPlan =
  | { readonly ok: false; readonly refusal: ReplacementRefusal }
  | {
      readonly ok: true
      readonly next: HeldDocument
      readonly hasMovedSchedule: boolean
    }

// see FR-063
// TRAP: compare for equality, never order; an undo restores an older stamp.
/** @purity pure */
function hasMovedScheduleBetween(outgoing: Document, incoming: Document): boolean {
  return outgoing.documentStamp.scheduleUpdatedUtc !== incoming.documentStamp.scheduleUpdatedUtc
}

/** @purity pure */
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

// see T-230, T-067
/** @purity pure */
export function planDocumentReplacement(input: ReplacementInput): ReplacementPlan {
  const { held, call } = input

  const stale = refusalOfStamp(input.readStamp, held.document.documentStamp)
  if (stale !== null) return { ok: false, refusal: stale }

  const untimely = refusalOfMoment(input.moment)
  if (untimely !== null) return { ok: false, refusal: untimely }

  switch (call.row) {
    case 'RD-1': {
      const outcome = undoEdit(held)
      // TRAP: nothing moved, so return the very pair; a fresh object breaks WS-6's one-reference swap.
      if (!outcome.undone) return replacementSettled(held, outcome.next)
      return replacementSettled(
        held,
        keepingColumnsOutsideHistory(outcome.next, held.document),
      )
    }

    case 'RD-2': {
      const outcome = redoEdit(held)
      if (!outcome.redone) return replacementSettled(held, outcome.next)
      return replacementSettled(
        held,
        keepingColumnsOutsideHistory(outcome.next, held.document),
      )
    }

    case 'RD-3': {
      const outcome = importDocument({ ...call.importing, current: held.document })
      if (!outcome.ok) return importRefused(outcome.refusal)
      // STOP: spec does not decide whether an overlay import is undoable. Looked in T-027, UN-6
      const history =
        outcome.report.undo === 'oneStep'
          ? historyWithStep(
              held.history,
              { document: held.document, commands: [] },
              stepSizeBytes(held.document),
              call.historyLimits,
            )
          : held.history
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

    case 'RD-4': {
      const outcome = importDocument({ ...call.importing, current: held.document })
      if (!outcome.ok) return importRefused(outcome.refusal)
      return replacementSettled(held, { document: outcome.document, history: emptyHistory() })
    }

    case 'RD-6':
      return replacementSettled(held, { document: call.document, history: emptyHistory() })

    case 'RD-7':
      return replacementSettled(held, { document: call.document, history: emptyHistory() })
  }
}
