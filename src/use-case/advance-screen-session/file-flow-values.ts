// FileFlowValues: the file-operation and question region of the session and its transitions.
// @unit      UF-89   (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// Generated region below the carried-value types: docs/spec/_source/state-machines.json. Do not edit by hand; npm run gen.

import type { DocumentCommand } from '../edit-document/edit-document'
import { NO_EFFECTS, unchanged, type Step } from './session-step'

// WHY: the file store's OpenRoute plus the Agent API hand-over; UseCase may not read an Adapter type (table T-061).
export type FileFlowOpenRoute = 'chooser' | 'drop' | 'reopen' | 'handed'

// WHY: ImportDocument's OpenChoice and MergeMapping again; no edge to that component is declared (check 59).
export type FileFlowOpenChoice = 'replace' | 'merge' | 'baseline'

export type FileFlowMergeMapping =
  | { readonly kind: 'allSame' }
  | { readonly kind: 'allDifferent' }
  | {
      readonly kind: 'eachCandidate'
      readonly decisions: readonly { readonly incomingTaskUid: number; readonly mapping: 'same' | 'different' }[]
      readonly rest: 'same' | 'different' | null
    }
  | { readonly kind: 'cancelImport' }

export interface FileFlowMergeCandidate {
  readonly currentUid: number
  readonly currentName: string | null
  readonly incomingUid: number
  readonly incomingName: string | null
}

export type FileFlowWriteForm = { readonly kind: 'save' } | { readonly kind: 'export'; readonly format: string }

// see NT-7, U-55
export interface FileFlowQuestion {
  readonly manner: string
  readonly question: 'QN-1' | 'QN-2' | 'QN-3' | 'QN-4' | 'QN-5' | 'QN-10'
  readonly items: readonly { readonly name: string | null; readonly isShownOnAnotherRow: boolean }[]
}

// WHY: the translator's CreatedSubject again; UseCase may not read an Adapter type (table T-061).
export type FileFlowCreatedSubject =
  | { readonly kind: 'task'; readonly uid: number }
  | { readonly kind: 'row'; readonly groupId: string }

export type FileFlowOwedAction =
  | {
      readonly kind: 'changeDocument'
      readonly writes: readonly (readonly DocumentCommand[])[]
      readonly created: FileFlowCreatedSubject | null
    }
  | { readonly kind: 'startNewDocument' }

export type FileFlowSurfaceName = 'U-56' | 'U-61' | 'U-62'

// WHY: an answer the import continues with; the read document itself stays in the shell (SF-10, CS-4).
export type FileFlowImportAnswer =
  | { readonly kind: 'openChoice'; readonly openChoice: FileFlowOpenChoice }
  | { readonly kind: 'mergeMapping'; readonly mergeMapping: FileFlowMergeMapping }

export interface FileFlowValuesStateCarried {
  readonly openedFileName: string | null
  readonly droppedTaskNames: readonly (string | null)[]
  readonly openRoute: FileFlowOpenRoute
  readonly mergeCandidates: readonly FileFlowMergeCandidate[]
  readonly unreadColumns: readonly string[]
  readonly question: FileFlowQuestion
  // WHY: null is a question a file operation raised; its answer is carried on by that machine.
  readonly owedAction: FileFlowOwedAction | null
}

export interface FileFlowValuesEventCarried {
  readonly openRoute: Exclude<FileFlowOpenRoute, 'handed'>
  readonly writeForm: FileFlowWriteForm
  readonly openChoice: FileFlowOpenChoice
  readonly question: FileFlowQuestion
  readonly mergeMapping: FileFlowMergeMapping
  readonly isProceeding: boolean
  readonly owedAction: FileFlowOwedAction
  readonly hasStartupTemplate: boolean
  readonly surfaceName: string
  readonly droppedTaskNames: readonly (string | null)[]
  readonly openedFileName: string | null
  readonly mergeCandidates: readonly FileFlowMergeCandidate[]
  readonly unreadColumns: readonly string[]
}

type NoPayload = Readonly<Record<never, never>>

interface FileFlowValuesEffectPayloads {
  readonly raiseFlowSurface: { readonly surfaceName: FileFlowSurfaceName }
  readonly readDocumentFile: { readonly openRoute: FileFlowOpenRoute }
  readonly raiseNotice: { readonly reason: 'RS-27' }
  readonly writeDocumentFile: { readonly writeForm: FileFlowWriteForm }
  readonly importIncomingDocument: { readonly answer: FileFlowImportAnswer }
  readonly discardIncomingDocument: NoPayload
  readonly answerOverwriteQuestion: { readonly isProceeding: boolean }
  readonly carryOutOwedAction: { readonly owedAction: FileFlowOwedAction }
}

export type FileFlowValuesEffect = {
  readonly [N in FileFlowValuesEffectName]: { readonly type: N } & FileFlowValuesEffectPayloads[N]
}[FileFlowValuesEffectName]

// <generated -- do not edit by hand>
// From docs/spec/_source/state-machines.json, region fileFlow (table T-290).
// Rebuild: npm run gen (tools/generate_state_machine_types.py).

export type FileFlowValuesKey =
  | 'fileFlow'
  | 'fileOperationStateMachine.idle'
  | 'fileOperationStateMachine.readingDocumentFile'
  | 'fileOperationStateMachine.awaitingOpenChoice'
  | 'fileOperationStateMachine.awaitingDiscardAnswer'
  | 'fileOperationStateMachine.importingDocument'
  | 'fileOperationStateMachine.awaitingMergeMapping'
  | 'fileOperationStateMachine.writingDocumentFile'
  | 'confirmationStateMachine.notAsked'
  | 'confirmationStateMachine.questionAsked'
  | 'unsavedEditsStateMachine.nothingUnsaved'
  | 'unsavedEditsStateMachine.editsUnsaved'

export type FileOperationState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'readingDocumentFile'; readonly openRoute: FileFlowValuesStateCarried['openRoute'] }
  | { readonly kind: 'awaitingOpenChoice' }
  | { readonly kind: 'awaitingDiscardAnswer' }
  | { readonly kind: 'importingDocument' }
  | { readonly kind: 'awaitingMergeMapping'; readonly mergeCandidates: FileFlowValuesStateCarried['mergeCandidates']; readonly unreadColumns: FileFlowValuesStateCarried['unreadColumns'] }
  | { readonly kind: 'writingDocumentFile' }

export type ConfirmationState =
  | { readonly kind: 'notAsked' }
  | { readonly kind: 'questionAsked'; readonly question: FileFlowValuesStateCarried['question']; readonly owedAction: FileFlowValuesStateCarried['owedAction'] }

export type UnsavedEditsState =
  | { readonly kind: 'nothingUnsaved' }
  | { readonly kind: 'editsUnsaved' }

export interface FileFlowValues {
  readonly openedFileName: FileFlowValuesStateCarried['openedFileName']
  readonly droppedTaskNames: FileFlowValuesStateCarried['droppedTaskNames']
  readonly fileOperationState: FileOperationState
  readonly confirmationState: ConfirmationState
  readonly unsavedEditsState: UnsavedEditsState
}

export type FileFlowValuesAxes = Omit<FileFlowValues, 'openedFileName' | 'droppedTaskNames'>

export type FileFlowValuesEvent =
  | { readonly type: 'documentOpenAsked'; readonly openRoute: FileFlowValuesEventCarried['openRoute'] }
  | { readonly type: 'agentDocumentHanded' }
  | { readonly type: 'documentFileWriteAsked'; readonly writeForm: FileFlowValuesEventCarried['writeForm'] }
  | { readonly type: 'openChoiceAnswered'; readonly openChoice: FileFlowValuesEventCarried['openChoice']; readonly question: FileFlowValuesEventCarried['question'] }
  | { readonly type: 'mergeMappingAnswered'; readonly mergeMapping: FileFlowValuesEventCarried['mergeMapping'] }
  | { readonly type: 'confirmationAnswered'; readonly isProceeding: FileFlowValuesEventCarried['isProceeding'] }
  | { readonly type: 'changeQuestionRaised'; readonly question: FileFlowValuesEventCarried['question']; readonly owedAction: FileFlowValuesEventCarried['owedAction'] }
  | { readonly type: 'newDocumentEntryPressed'; readonly hasStartupTemplate: FileFlowValuesEventCarried['hasStartupTemplate']; readonly question: FileFlowValuesEventCarried['question'] }
  | { readonly type: 'flowSurfaceClosed'; readonly surfaceName: FileFlowValuesEventCarried['surfaceName'] }
  | { readonly type: 'documentFileRead'; readonly question: FileFlowValuesEventCarried['question'] }
  | { readonly type: 'documentOpenFailed' }
  | { readonly type: 'mergeMappingAsked'; readonly mergeCandidates: FileFlowValuesEventCarried['mergeCandidates']; readonly unreadColumns: FileFlowValuesEventCarried['unreadColumns'] }
  | { readonly type: 'documentOpenLanded'; readonly droppedTaskNames: FileFlowValuesEventCarried['droppedTaskNames']; readonly openedFileName: FileFlowValuesEventCarried['openedFileName']; readonly openChoice: FileFlowValuesEventCarried['openChoice'] }
  | { readonly type: 'overwriteQuestionRaised'; readonly question: FileFlowValuesEventCarried['question'] }
  | { readonly type: 'documentFileSaved'; readonly openedFileName: FileFlowValuesEventCarried['openedFileName'] }
  | { readonly type: 'documentFileWriteEnded' }
  | { readonly type: 'documentEditLanded' }
  | { readonly type: 'newDocumentLanded' }
  | { readonly type: 'startupDocumentHeld' }

export type FileFlowValuesEffectName =
  | 'raiseFlowSurface'
  | 'readDocumentFile'
  | 'raiseNotice'
  | 'writeDocumentFile'
  | 'importIncomingDocument'
  | 'discardIncomingDocument'
  | 'answerOverwriteQuestion'
  | 'carryOutOwedAction'

export interface FileFlowValuesTransition {
  readonly state: FileFlowValuesKey
  readonly event: FileFlowValuesEvent['type']
  readonly guard: string | null
  readonly to: string
  readonly effect: FileFlowValuesEffectName | null
  readonly effectArgument: string | null
}

const FILE_FLOW_VALUES_INITIAL_AXES: FileFlowValuesAxes = {
  fileOperationState: { kind: 'idle' },
  confirmationState: { kind: 'notAsked' },
  unsavedEditsState: { kind: 'nothingUnsaved' },
}

export const FILE_FLOW_VALUES_TRANSITIONS: readonly FileFlowValuesTransition[] = [
  {
    state: 'fileFlow',
    event: 'documentFileSaved',
    guard: null,
    to: 'fileFlow',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fileFlow',
    event: 'documentOpenLanded',
    guard: 'hasDroppedTasks',
    to: 'fileFlow',
    effect: 'raiseFlowSurface',
    effectArgument: 'U-62',
  },
  {
    state: 'fileFlow',
    event: 'documentOpenLanded',
    guard: 'not hasDroppedTasks',
    to: 'fileFlow',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fileFlow',
    event: 'flowSurfaceClosed',
    guard: 'isImportReportSurface',
    to: 'fileFlow',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.idle',
    event: 'documentOpenAsked',
    guard: 'in confirmationStateMachine.notAsked',
    to: 'fileOperationStateMachine.readingDocumentFile',
    effect: 'readDocumentFile',
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.idle',
    event: 'documentOpenAsked',
    guard: 'in confirmationStateMachine.questionAsked',
    to: 'fileOperationStateMachine.idle',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.readingDocumentFile',
    event: 'documentOpenAsked',
    guard: null,
    to: 'fileOperationStateMachine.readingDocumentFile',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.awaitingOpenChoice',
    event: 'documentOpenAsked',
    guard: null,
    to: 'fileOperationStateMachine.awaitingOpenChoice',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.awaitingDiscardAnswer',
    event: 'documentOpenAsked',
    guard: null,
    to: 'fileOperationStateMachine.awaitingDiscardAnswer',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.importingDocument',
    event: 'documentOpenAsked',
    guard: null,
    to: 'fileOperationStateMachine.importingDocument',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.awaitingMergeMapping',
    event: 'documentOpenAsked',
    guard: null,
    to: 'fileOperationStateMachine.awaitingMergeMapping',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.writingDocumentFile',
    event: 'documentOpenAsked',
    guard: null,
    to: 'fileOperationStateMachine.writingDocumentFile',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.idle',
    event: 'agentDocumentHanded',
    guard: 'in confirmationStateMachine.notAsked',
    to: 'fileOperationStateMachine.readingDocumentFile',
    effect: 'readDocumentFile',
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.idle',
    event: 'documentFileWriteAsked',
    guard: 'in confirmationStateMachine.notAsked',
    to: 'fileOperationStateMachine.writingDocumentFile',
    effect: 'writeDocumentFile',
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.idle',
    event: 'documentFileWriteAsked',
    guard: 'in confirmationStateMachine.questionAsked',
    to: 'fileOperationStateMachine.idle',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.readingDocumentFile',
    event: 'documentFileWriteAsked',
    guard: null,
    to: 'fileOperationStateMachine.readingDocumentFile',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.awaitingOpenChoice',
    event: 'documentFileWriteAsked',
    guard: null,
    to: 'fileOperationStateMachine.awaitingOpenChoice',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.awaitingDiscardAnswer',
    event: 'documentFileWriteAsked',
    guard: null,
    to: 'fileOperationStateMachine.awaitingDiscardAnswer',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.importingDocument',
    event: 'documentFileWriteAsked',
    guard: null,
    to: 'fileOperationStateMachine.importingDocument',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.awaitingMergeMapping',
    event: 'documentFileWriteAsked',
    guard: null,
    to: 'fileOperationStateMachine.awaitingMergeMapping',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.writingDocumentFile',
    event: 'documentFileWriteAsked',
    guard: null,
    to: 'fileOperationStateMachine.writingDocumentFile',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'fileOperationStateMachine.readingDocumentFile',
    event: 'documentFileRead',
    guard: 'isReopenRoute',
    to: 'fileOperationStateMachine.awaitingDiscardAnswer',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.readingDocumentFile',
    event: 'documentFileRead',
    guard: 'not isReopenRoute',
    to: 'fileOperationStateMachine.awaitingOpenChoice',
    effect: 'raiseFlowSurface',
    effectArgument: 'U-56',
  },
  {
    state: 'fileOperationStateMachine.readingDocumentFile',
    event: 'documentOpenFailed',
    guard: null,
    to: 'fileOperationStateMachine.idle',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.importingDocument',
    event: 'documentOpenFailed',
    guard: null,
    to: 'fileOperationStateMachine.idle',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.awaitingOpenChoice',
    event: 'openChoiceAnswered',
    guard: 'isReplaceChoice',
    to: 'fileOperationStateMachine.awaitingDiscardAnswer',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.awaitingOpenChoice',
    event: 'openChoiceAnswered',
    guard: 'not isReplaceChoice',
    to: 'fileOperationStateMachine.importingDocument',
    effect: 'importIncomingDocument',
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.awaitingDiscardAnswer',
    event: 'confirmationAnswered',
    guard: 'isProceeding',
    to: 'fileOperationStateMachine.importingDocument',
    effect: 'importIncomingDocument',
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.awaitingDiscardAnswer',
    event: 'confirmationAnswered',
    guard: 'not isProceeding',
    to: 'fileOperationStateMachine.idle',
    effect: 'discardIncomingDocument',
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.writingDocumentFile',
    event: 'confirmationAnswered',
    guard: 'isOverwriteQuestion',
    to: 'fileOperationStateMachine.writingDocumentFile',
    effect: 'answerOverwriteQuestion',
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.importingDocument',
    event: 'mergeMappingAsked',
    guard: null,
    to: 'fileOperationStateMachine.awaitingMergeMapping',
    effect: 'raiseFlowSurface',
    effectArgument: 'U-61',
  },
  {
    state: 'fileOperationStateMachine.awaitingMergeMapping',
    event: 'mergeMappingAnswered',
    guard: 'isImportCancelled',
    to: 'fileOperationStateMachine.idle',
    effect: 'discardIncomingDocument',
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.awaitingMergeMapping',
    event: 'mergeMappingAnswered',
    guard: 'not isImportCancelled',
    to: 'fileOperationStateMachine.importingDocument',
    effect: 'importIncomingDocument',
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.awaitingOpenChoice',
    event: 'flowSurfaceClosed',
    guard: 'isOpenChooserSurface',
    to: 'fileOperationStateMachine.idle',
    effect: 'discardIncomingDocument',
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.awaitingMergeMapping',
    event: 'flowSurfaceClosed',
    guard: 'isDifferenceReviewSurface',
    to: 'fileOperationStateMachine.idle',
    effect: 'discardIncomingDocument',
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.importingDocument',
    event: 'documentOpenLanded',
    guard: null,
    to: 'fileOperationStateMachine.idle',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.writingDocumentFile',
    event: 'documentFileSaved',
    guard: null,
    to: 'fileOperationStateMachine.idle',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fileOperationStateMachine.writingDocumentFile',
    event: 'documentFileWriteEnded',
    guard: null,
    to: 'fileOperationStateMachine.idle',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'confirmationStateMachine.notAsked',
    event: 'changeQuestionRaised',
    guard: null,
    to: 'confirmationStateMachine.questionAsked',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'confirmationStateMachine.notAsked',
    event: 'newDocumentEntryPressed',
    guard: 'hasStartupTemplate',
    to: 'confirmationStateMachine.questionAsked',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'confirmationStateMachine.notAsked',
    event: 'newDocumentEntryPressed',
    guard: 'not hasStartupTemplate',
    to: 'confirmationStateMachine.notAsked',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'confirmationStateMachine.questionAsked',
    event: 'newDocumentEntryPressed',
    guard: null,
    to: 'confirmationStateMachine.questionAsked',
    effect: 'raiseNotice',
    effectArgument: 'RS-27',
  },
  {
    state: 'confirmationStateMachine.notAsked',
    event: 'openChoiceAnswered',
    guard: 'isReplaceChoice & in fileOperationStateMachine.awaitingOpenChoice',
    to: 'confirmationStateMachine.questionAsked',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'confirmationStateMachine.questionAsked',
    event: 'openChoiceAnswered',
    guard: 'isReplaceChoice & in fileOperationStateMachine.awaitingOpenChoice',
    to: 'confirmationStateMachine.questionAsked',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'confirmationStateMachine.notAsked',
    event: 'documentFileRead',
    guard: 'isReopenRoute & in fileOperationStateMachine.readingDocumentFile',
    to: 'confirmationStateMachine.questionAsked',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'confirmationStateMachine.questionAsked',
    event: 'documentFileRead',
    guard: 'isReopenRoute & in fileOperationStateMachine.readingDocumentFile',
    to: 'confirmationStateMachine.questionAsked',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'confirmationStateMachine.notAsked',
    event: 'overwriteQuestionRaised',
    guard: null,
    to: 'confirmationStateMachine.questionAsked',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'confirmationStateMachine.questionAsked',
    event: 'overwriteQuestionRaised',
    guard: null,
    to: 'confirmationStateMachine.questionAsked',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'confirmationStateMachine.questionAsked',
    event: 'confirmationAnswered',
    guard: 'isProceeding & not isFileOperationQuestion',
    to: 'confirmationStateMachine.notAsked',
    effect: 'carryOutOwedAction',
    effectArgument: null,
  },
  {
    state: 'confirmationStateMachine.questionAsked',
    event: 'confirmationAnswered',
    guard: 'isProceeding & isFileOperationQuestion',
    to: 'confirmationStateMachine.notAsked',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'confirmationStateMachine.questionAsked',
    event: 'confirmationAnswered',
    guard: 'not isProceeding',
    to: 'confirmationStateMachine.notAsked',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'unsavedEditsStateMachine.nothingUnsaved',
    event: 'documentEditLanded',
    guard: null,
    to: 'unsavedEditsStateMachine.editsUnsaved',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'unsavedEditsStateMachine.nothingUnsaved',
    event: 'documentOpenLanded',
    guard: 'not isReplaceChoice',
    to: 'unsavedEditsStateMachine.editsUnsaved',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'unsavedEditsStateMachine.editsUnsaved',
    event: 'documentOpenLanded',
    guard: 'isReplaceChoice',
    to: 'unsavedEditsStateMachine.nothingUnsaved',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'unsavedEditsStateMachine.editsUnsaved',
    event: 'documentFileSaved',
    guard: null,
    to: 'unsavedEditsStateMachine.nothingUnsaved',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'unsavedEditsStateMachine.editsUnsaved',
    event: 'newDocumentLanded',
    guard: null,
    to: 'unsavedEditsStateMachine.nothingUnsaved',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'unsavedEditsStateMachine.editsUnsaved',
    event: 'startupDocumentHeld',
    guard: null,
    to: 'unsavedEditsStateMachine.nothingUnsaved',
    effect: null,
    effectArgument: null,
  },
]
// </generated>

type FileFlowStep = Step<FileFlowValues, FileFlowValuesEffect>

type EventOf<T extends FileFlowValuesEvent['type']> = Extract<FileFlowValuesEvent, { readonly type: T }>

type Effects = readonly FileFlowValuesEffect[]

const NO_DROPPED_TASK_NAMES: readonly (string | null)[] = Object.freeze([])

const IDLE = FILE_FLOW_VALUES_INITIAL_AXES.fileOperationState

const NOT_ASKED = FILE_FLOW_VALUES_INITIAL_AXES.confirmationState

const NOTHING_UNSAVED = FILE_FLOW_VALUES_INITIAL_AXES.unsavedEditsState

const EDITS_UNSAVED: UnsavedEditsState = { kind: 'editsUnsaved' }

// see T-290
export const emptyFileFlowValues: FileFlowValues = {
  ...FILE_FLOW_VALUES_INITIAL_AXES,
  openedFileName: null,
  droppedTaskNames: NO_DROPPED_TASK_NAMES,
}

/** @purity pure */
function isQuestionAsked(values: FileFlowValues): boolean {
  return values.confirmationState.kind === 'questionAsked'
}

/** @purity pure */
function isReopenRoute(operation: FileOperationState): boolean {
  return operation.kind === 'readingDocumentFile' && operation.openRoute === 'reopen'
}

/** @purity pure */
function isOverwriteQuestion(values: FileFlowValues): boolean {
  const confirmation = values.confirmationState
  return confirmation.kind === 'questionAsked' && confirmation.question.question === 'QN-4'
}

/** @purity pure */
function hasDroppedTasks(names: readonly (string | null)[]): boolean {
  return names.length > 0
}

/** @purity pure */
function isReplaceChoice(openChoice: FileFlowOpenChoice): boolean {
  return openChoice === 'replace'
}

// WHY: a machine already in the wanted kind keeps its reference (SF-3).
/** @purity pure */
function unsavedEditsMoved(current: UnsavedEditsState, next: UnsavedEditsState): UnsavedEditsState {
  return current.kind === next.kind ? current : next
}

// WHY: every part the event leaves alone keeps its reference, and so does the region (SD-3, SF-3).
/** @purity pure */
function combined(values: FileFlowValues, moves: Partial<FileFlowValues>, effects: Effects): FileFlowStep {
  const keys = Object.keys(moves) as (keyof FileFlowValues)[]
  if (keys.some((key) => moves[key] !== values[key])) return { state: { ...values, ...moves }, effects }
  if (effects.length === 0) return unchanged(values)
  return { state: values, effects }
}

/** @purity pure */
function refused(values: FileFlowValues): FileFlowStep {
  return { state: values, effects: [{ type: 'raiseNotice', reason: 'RS-27' }] }
}

/** @purity pure */
function asked(question: FileFlowQuestion, owedAction: FileFlowOwedAction | null): ConfirmationState {
  return { kind: 'questionAsked', question, owedAction }
}

// see OP-4, QN-5
/** @purity pure */
function discardAsked(values: FileFlowValues, question: FileFlowQuestion): FileFlowStep {
  const discarding: FileOperationState = { kind: 'awaitingDiscardAnswer' }
  return combined(values, { fileOperationState: discarding, confirmationState: asked(question, null) }, NO_EFFECTS)
}

// see T-290, OP-2, OP-8, OP-13
/** @purity pure */
function onDocumentOpenAsked(values: FileFlowValues, event: EventOf<'documentOpenAsked'>): FileFlowStep {
  if (values.fileOperationState.kind !== 'idle' || isQuestionAsked(values)) return refused(values)
  const reading: FileOperationState = { kind: 'readingDocumentFile', openRoute: event.openRoute }
  return combined(values, { fileOperationState: reading }, [{ type: 'readDocumentFile', openRoute: event.openRoute }])
}

// WHY: a refused hand-over raises no notice; the caller reports the unchanged reference (AM-8).
/** @purity pure */
function onAgentDocumentHanded(values: FileFlowValues): FileFlowStep {
  if (values.fileOperationState.kind !== 'idle' || isQuestionAsked(values)) return unchanged(values)
  const reading: FileOperationState = { kind: 'readingDocumentFile', openRoute: 'handed' }
  return combined(values, { fileOperationState: reading }, [{ type: 'readDocumentFile', openRoute: 'handed' }])
}

/** @purity pure */
function onDocumentFileWriteAsked(values: FileFlowValues, event: EventOf<'documentFileWriteAsked'>): FileFlowStep {
  if (values.fileOperationState.kind !== 'idle' || isQuestionAsked(values)) return refused(values)
  const writing: FileOperationState = { kind: 'writingDocumentFile' }
  return combined(values, { fileOperationState: writing }, [{ type: 'writeDocumentFile', writeForm: event.writeForm }])
}

// see T-290, OP-3, OP-13
/** @purity pure */
function onDocumentFileRead(values: FileFlowValues, event: EventOf<'documentFileRead'>): FileFlowStep {
  const operation = values.fileOperationState
  if (operation.kind !== 'readingDocumentFile') return unchanged(values)
  if (isReopenRoute(operation)) return discardAsked(values, event.question)
  const choosing: FileOperationState = { kind: 'awaitingOpenChoice' }
  return combined(values, { fileOperationState: choosing }, [{ type: 'raiseFlowSurface', surfaceName: 'U-56' }])
}

/** @purity pure */
function onDocumentOpenFailed(values: FileFlowValues): FileFlowStep {
  const kind = values.fileOperationState.kind
  if (kind !== 'readingDocumentFile' && kind !== 'importingDocument') return unchanged(values)
  return combined(values, { fileOperationState: IDLE }, NO_EFFECTS)
}

// see T-290, OP-3, OP-4
/** @purity pure */
function onOpenChoiceAnswered(values: FileFlowValues, event: EventOf<'openChoiceAnswered'>): FileFlowStep {
  if (values.fileOperationState.kind !== 'awaitingOpenChoice') return unchanged(values)
  if (event.openChoice === 'replace') return discardAsked(values, event.question)
  const importing: FileOperationState = { kind: 'importingDocument' }
  const answer: FileFlowImportAnswer = { kind: 'openChoice', openChoice: event.openChoice }
  return combined(values, { fileOperationState: importing }, [{ type: 'importIncomingDocument', answer }])
}

/** @purity pure */
function answeredOperation(values: FileFlowValues, isProceeding: boolean): Step<FileOperationState, FileFlowValuesEffect> {
  const operation = values.fileOperationState
  if (operation.kind === 'awaitingDiscardAnswer') {
    if (!isProceeding) return { state: IDLE, effects: [{ type: 'discardIncomingDocument' }] }
    const answer: FileFlowImportAnswer = { kind: 'openChoice', openChoice: 'replace' }
    return { state: { kind: 'importingDocument' }, effects: [{ type: 'importIncomingDocument', answer }] }
  }
  if (operation.kind === 'writingDocumentFile' && isOverwriteQuestion(values)) {
    return { state: operation, effects: [{ type: 'answerOverwriteQuestion', isProceeding }] }
  }
  return unchanged(operation)
}

/** @purity pure */
function answeredQuestion(confirmation: ConfirmationState, isProceeding: boolean): Step<ConfirmationState, FileFlowValuesEffect> {
  if (confirmation.kind === 'notAsked') return unchanged(confirmation)
  if (!isProceeding || confirmation.owedAction === null) return { state: NOT_ASKED, effects: NO_EFFECTS }
  return { state: NOT_ASKED, effects: [{ type: 'carryOutOwedAction', owedAction: confirmation.owedAction }] }
}

// WHY: both machines read the state before the answer, so the file machine still sees QN-4.
/** @purity pure */
function onConfirmationAnswered(values: FileFlowValues, event: EventOf<'confirmationAnswered'>): FileFlowStep {
  const operation = answeredOperation(values, event.isProceeding)
  const confirmation = answeredQuestion(values.confirmationState, event.isProceeding)
  const moves = { fileOperationState: operation.state, confirmationState: confirmation.state }
  return combined(values, moves, [...operation.effects, ...confirmation.effects])
}

/** @purity pure */
function onMergeMappingAsked(values: FileFlowValues, event: EventOf<'mergeMappingAsked'>): FileFlowStep {
  if (values.fileOperationState.kind !== 'importingDocument') return unchanged(values)
  const mapping: FileOperationState = {
    kind: 'awaitingMergeMapping',
    mergeCandidates: event.mergeCandidates,
    unreadColumns: event.unreadColumns,
  }
  return combined(values, { fileOperationState: mapping }, [{ type: 'raiseFlowSurface', surfaceName: 'U-61' }])
}

// see T-290, MM-1, MM-2, MM-4
/** @purity pure */
function onMergeMappingAnswered(values: FileFlowValues, event: EventOf<'mergeMappingAnswered'>): FileFlowStep {
  if (values.fileOperationState.kind !== 'awaitingMergeMapping') return unchanged(values)
  if (event.mergeMapping.kind === 'cancelImport') {
    return combined(values, { fileOperationState: IDLE }, [{ type: 'discardIncomingDocument' }])
  }
  const importing: FileOperationState = { kind: 'importingDocument' }
  const answer: FileFlowImportAnswer = { kind: 'mergeMapping', mergeMapping: event.mergeMapping }
  return combined(values, { fileOperationState: importing }, [{ type: 'importIncomingDocument', answer }])
}

// see T-290, IC-52, IN-4
/** @purity pure */
function onFlowSurfaceClosed(values: FileFlowValues, event: EventOf<'flowSurfaceClosed'>): FileFlowStep {
  const kind = values.fileOperationState.kind
  const isChooser = kind === 'awaitingOpenChoice' && event.surfaceName === 'U-56'
  const isReview = kind === 'awaitingMergeMapping' && event.surfaceName === 'U-61'
  const droppedTaskNames = event.surfaceName === 'U-62' && hasDroppedTasks(values.droppedTaskNames)
    ? NO_DROPPED_TASK_NAMES
    : values.droppedTaskNames
  if (!isChooser && !isReview) return combined(values, { droppedTaskNames }, NO_EFFECTS)
  return combined(values, { droppedTaskNames, fileOperationState: IDLE }, [{ type: 'discardIncomingDocument' }])
}

// WHY: a landing that carries no name keeps the one shown, as today's open road does (DFC-574).
/** @purity pure */
// WHY: a replacement is the opened file itself; a merge or a baseline is a document no file holds (FR-100).
/** @purity pure */
function onDocumentOpenLanded(values: FileFlowValues, event: EventOf<'documentOpenLanded'>): FileFlowStep {
  const openedFileName = event.openedFileName ?? values.openedFileName
  const fileOperationState = values.fileOperationState.kind === 'importingDocument' ? IDLE : values.fileOperationState
  const landed = isReplaceChoice(event.openChoice) ? NOTHING_UNSAVED : EDITS_UNSAVED
  const unsavedEditsState = unsavedEditsMoved(values.unsavedEditsState, landed)
  if (!hasDroppedTasks(event.droppedTaskNames)) {
    return combined(values, { openedFileName, fileOperationState, unsavedEditsState }, NO_EFFECTS)
  }
  const moves = { openedFileName, fileOperationState, unsavedEditsState, droppedTaskNames: event.droppedTaskNames }
  return combined(values, moves, [{ type: 'raiseFlowSurface', surfaceName: 'U-62' }])
}

/** @purity pure */
function onDocumentFileSaved(values: FileFlowValues, event: EventOf<'documentFileSaved'>): FileFlowStep {
  const openedFileName = event.openedFileName ?? values.openedFileName
  const fileOperationState = values.fileOperationState.kind === 'writingDocumentFile' ? IDLE : values.fileOperationState
  const unsavedEditsState = unsavedEditsMoved(values.unsavedEditsState, NOTHING_UNSAVED)
  return combined(values, { openedFileName, fileOperationState, unsavedEditsState }, NO_EFFECTS)
}

// see T-290, FR-100, ZE-4
/** @purity pure */
function onDocumentEditLanded(values: FileFlowValues): FileFlowStep {
  return combined(values, { unsavedEditsState: unsavedEditsMoved(values.unsavedEditsState, EDITS_UNSAVED) }, NO_EFFECTS)
}

// see T-290, FR-095, RD-6, RD-7
/** @purity pure */
function onDocumentHeldAfresh(values: FileFlowValues): FileFlowStep {
  return combined(values, { unsavedEditsState: unsavedEditsMoved(values.unsavedEditsState, NOTHING_UNSAVED) }, NO_EFFECTS)
}

/** @purity pure */
function onDocumentFileWriteEnded(values: FileFlowValues): FileFlowStep {
  if (values.fileOperationState.kind !== 'writingDocumentFile') return unchanged(values)
  return combined(values, { fileOperationState: IDLE }, NO_EFFECTS)
}

/** @purity pure */
function onChangeQuestionRaised(values: FileFlowValues, event: EventOf<'changeQuestionRaised'>): FileFlowStep {
  if (isQuestionAsked(values)) return unchanged(values)
  return combined(values, { confirmationState: asked(event.question, event.owedAction) }, NO_EFFECTS)
}

// see T-290, FR-095, QN-5
/** @purity pure */
function onNewDocumentEntryPressed(values: FileFlowValues, event: EventOf<'newDocumentEntryPressed'>): FileFlowStep {
  if (isQuestionAsked(values) || !event.hasStartupTemplate) return refused(values)
  return combined(values, { confirmationState: asked(event.question, { kind: 'startNewDocument' }) }, NO_EFFECTS)
}

// WHY: a second question replaces the first, as today's shell overwrites it (CR-460 section 8).
/** @purity pure */
function onOverwriteQuestionRaised(values: FileFlowValues, event: EventOf<'overwriteQuestionRaised'>): FileFlowStep {
  return combined(values, { confirmationState: asked(event.question, null) }, NO_EFFECTS)
}

const HANDLERS: {
  readonly [T in FileFlowValuesEvent['type']]: (values: FileFlowValues, event: EventOf<T>) => FileFlowStep
} = {
  documentOpenAsked: onDocumentOpenAsked,
  agentDocumentHanded: onAgentDocumentHanded,
  documentFileWriteAsked: onDocumentFileWriteAsked,
  openChoiceAnswered: onOpenChoiceAnswered,
  mergeMappingAnswered: onMergeMappingAnswered,
  confirmationAnswered: onConfirmationAnswered,
  changeQuestionRaised: onChangeQuestionRaised,
  newDocumentEntryPressed: onNewDocumentEntryPressed,
  flowSurfaceClosed: onFlowSurfaceClosed,
  documentFileRead: onDocumentFileRead,
  documentOpenFailed: onDocumentOpenFailed,
  mergeMappingAsked: onMergeMappingAsked,
  documentOpenLanded: onDocumentOpenLanded,
  overwriteQuestionRaised: onOverwriteQuestionRaised,
  documentFileSaved: onDocumentFileSaved,
  documentFileWriteEnded: onDocumentFileWriteEnded,
  documentEditLanded: onDocumentEditLanded,
  newDocumentLanded: onDocumentHeldAfresh,
  startupDocumentHeld: onDocumentHeldAfresh,
}

// see SF-2, SF-8, T-290
/** @purity pure */
export function stepFileFlowValues(values: FileFlowValues, event: FileFlowValuesEvent): FileFlowStep {
  const handler = HANDLERS[event.type] as (values: FileFlowValues, event: FileFlowValuesEvent) => FileFlowStep
  return handler(values, event)
}
