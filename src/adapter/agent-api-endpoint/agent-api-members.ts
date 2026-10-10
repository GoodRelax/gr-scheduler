// AgentApiEndpoint -- wires the members of table T-107 to the components that do the work.
// @unit      UF-28   (docs/spec/05-07-design.md, table T-075)
// @component AgentApiEndpoint, layer Adapter (table T-062)
// @purity    non-pure

import type { Document } from '../../entity/document-model/document/document'
import {
  latestSequence,
  type DialogueMessage,
} from '../../entity/document-model/dialogue-log/dialogue-log'
import {
  diagnoseDelay,
  searchRowsOf,
  workingCalendarOf,
  type DelayDiagnosticsReport,
  type SearchRows,
} from '../../entity/document-model/schedule/schedule'
import type { Selection } from '../../entity/document-model/selection/selection'
import {
  applyDocumentChange,
  type ChangeAudience,
  type DocumentCommand,
  type DocumentHolder,
  type PlanRefusal,
  type Refusal,
} from '../../use-case/apply-document-change/apply-document-change'
import {
  searchJumpReachOf,
  searchJumpWrites,
  searchJumpCommands,
  shownTasksRevealWrites,
  type InvariantRefusal,
  type InvariantRow,
} from '../../use-case/edit-document/edit-document'
import * as NotifyChangeWatchers from '../../use-case/notify-change-watchers/notify-change-watchers'
import * as PostDialogueMessage from '../../use-case/post-dialogue-message/post-dialogue-message'
import * as DocumentCodec from '../document-codec/document-codec'
import { jsonFromDocument, mspdiFromDocument } from '../document-codec/document-codec'
import * as ImageExporter from '../image-exporter/image-exporter'
import { hasRoomBelowPinsIn } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { AgentSnapshot, SnapshotSource } from './snapshot-source'

type DocumentStamp = Document['documentStamp']

// see AG-9a, T-233
type CodecRefusalReason = Extract<DocumentCodec.JsonDecoding, { readonly ok: false }>['reason']

// see AG-9a, FR-028
export type AgentRefusalReason =
  | 'staleStamp'
  | 'gestureInFlight'
  | 'editingInPlace'
  | 'questionAsked'
  | 'deliveringNotices'
  | 'commandRefused'
  | 'unknownTask'
  | 'notDrawnYet'
  | 'tooTall'
  | 'rasterFailed'
  | 'embeddedHtmlFailed'
  | 'notAvailable'
  | 'malformedRequest'
  | CodecRefusalReason
  | InvariantRow

// see AG-9a, AG-2
export interface AgentRefusal {
  readonly target: string
  readonly reason: AgentRefusalReason
  readonly stamp: DocumentStamp
  readonly document: Document | null
  readonly refusals: readonly Refusal[]
  readonly what: string
}

export type AgentExport<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly refusal: AgentRefusal }

// see AM-18, AG-11, AG-9a
export type AgentUtteranceOutcome =
  | { readonly accepted: true; readonly message: DialogueMessage }
  | { readonly accepted: false; readonly refusal: AgentRefusal }

// see AM-7, AG-3
export interface AgentWriteRequest {
  readonly readStamp: DocumentStamp
  readonly commands: readonly DocumentCommand[]
}

export type AgentWriteOutcome =
  | {
      readonly accepted: true
      readonly stamp: DocumentStamp
      readonly hasMovedSchedule: boolean
    }
  | { readonly accepted: false; readonly refusal: AgentRefusal }

// see AM-16, SJ-9
export type AgentFocusOutcome =
  | (Extract<AgentWriteOutcome, { readonly accepted: true }> & { readonly isScrolled: boolean })
  | Extract<AgentWriteOutcome, { readonly accepted: false }>

// see AM-26, TV-1
// WHY: the same three words as AdvanceScreenSession's VisibilityTable, held here so this component gains no edge to it.
export type VisibilityTable = 'searchPanel' | 'delayDiagnosticsReport' | 'resourceList'

// see AM-26, TV-1
// WHY: drawnTaskUids is null while no table's Schedule Filter is on; tables are the tables whose filter is on.
export interface AgentShownTasks {
  readonly drawnTaskUids: readonly number[] | null
  readonly tables: readonly VisibilityTable[]
}

// see AM-27, TV-2, TV-5, S-494, S-495
export interface SearchTableVisibility {
  readonly hiddenKeys: readonly number[]
  readonly isUnassignedHidden: boolean
  readonly isApplied: boolean
}

// see AM-26, AM-27, SJ-0, TV-8
// WHY: the Visibility columns are a screen value the shell holds (S-494, S-495), never the document; this is the one way to them.
export interface ShownTasksHolder {
  /** @purity semi-pure-b */
  readShownTasks(): AgentShownTasks
  /** @purity semi-pure-b */
  readSearchVisibility(): SearchTableVisibility
  // WHY: the search table's only (AM-27); turning its filter on also shows a hidden Search Panel minimised (TV-8, PND-712).
  /** @purity non-pure */
  holdShownTasks(visibility: SearchTableVisibility): void
  // WHY: AM-16 touches no panel (SJ-9) but does SJ-0, which puts the target among the drawn tasks.
  /** @purity non-pure */
  holdJumpTarget(taskUid: number): void
}

// see AM-8, FR-022
export type AgentImportSource = Document | { readonly document: Document } | { readonly text: string }

// see AM-8, AG-9a
export type ImportLanding =
  | boolean
  | { readonly landed: false; readonly refusals: readonly InvariantRefusal[] }

export type AgentChangeReceiver = (notice: NotifyChangeWatchers.ChangeNotice) => void

// see AM-17
export interface AgentWatch {
  readonly hasReplacedEarlierWatch: boolean
  /** @purity non-pure */
  stopWatching(): boolean
}

// see T-107
export interface AgentApi {
  readonly agentApiVersion: number
  readonly schemaVersion: string

  /** @purity semi-pure-b */
  readDocument(): Document
  /** @purity semi-pure-b */
  readStamp(): DocumentStamp
  /** @purity semi-pure-b */
  readSelection(): Selection
  /** @purity semi-pure-b */
  readDialogueMessages(): readonly DialogueMessage[]
  /** @purity semi-pure-b */
  readSearchRows(word: string): SearchRows
  /** @purity semi-pure-b */
  readShownTasks(): AgentShownTasks
  /** @purity semi-pure-b */
  readDelayDiagnostics(): DelayDiagnosticsReport

  /** @purity non-pure */
  applyCommands(request: AgentWriteRequest): AgentWriteOutcome
  /** @purity non-pure */
  importDocument(source: AgentImportSource): Promise<AgentWriteOutcome>

  /** @purity non-pure */
  undoEdit(): AgentWriteOutcome
  /** @purity non-pure */
  redoEdit(): AgentWriteOutcome

  /** @purity semi-pure-b */
  exportJson(): AgentExport<string>
  /** @purity semi-pure-b */
  exportMspdi(): AgentExport<string>
  /** @purity semi-pure-b */
  exportSvg(): AgentExport<string>
  /** @purity semi-pure-b */
  exportPng(): Promise<AgentExport<Uint8Array>>
  /** @purity semi-pure-b */
  exportEmbeddedHtml(): Promise<AgentExport<string>>

  /** @purity non-pure */
  focusTask(taskUid: number): AgentFocusOutcome
  /** @purity non-pure */
  showOnlyTasks(taskUids: readonly number[] | null): AgentWriteOutcome

  /** @purity non-pure */
  watchChanges(receive: AgentChangeReceiver): AgentWatch

  /** @purity non-pure */
  postDialogueMessage(text: string): AgentUtteranceOutcome
}

export interface AgentApiWiring {
  readonly source: SnapshotSource
  readonly holder: DocumentHolder
  readonly audience: ChangeAudience
  readonly dialogueHolder: PostDialogueMessage.DialogueLogHolder
  readonly dialogueAudience: PostDialogueMessage.DialogueAudience
  // see SF-10
  readonly changeWatchers: NotifyChangeWatchers.ChangeWatchers
  // TRAP: required but possibly undefined, never optional (so too appShell and takeInDocument):
  // an optional member lets a wiring forget it silently.
  readonly rasterizer: ImageExporter.Rasterizer | undefined
  readonly appShell: DocumentCodec.AppShellSource | undefined
  readonly takeInDocument:
    | ((incoming: Document, reading: HandedFormatReading) => Promise<ImportLanding>)
    | undefined
  // see AM-26, AM-27
  readonly shownTasks: ShownTasksHolder | undefined
  // TRAP: must differ from the person's writer name, or AG-6 takes the person's edits for this API's own.
  readonly writerName: string
  readonly schemaVersion: string
}

const AGENT_API_VERSION = 2

// see AG-4
// WHY: a walk, not structuredClone or a JSON round trip: both throw on some values (FR-028).
/** @purity pure */
function frozenCopy<TValue>(value: TValue): TValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((held: unknown) => frozenCopy(held))) as TValue
  }
  if (typeof value === 'object' && value !== null) {
    const copy: Record<string, unknown> = {}
    for (const [key, held] of Object.entries(value)) copy[key] = frozenCopy(held)
    return Object.freeze(copy) as TValue
  }
  return value
}

// see HS-12, AT-140, AG-4
// WHY: the held document keeps the AT-140 it was opened with (HS-11); every stamp handed out carries the lower line's time.
/** @purity pure */
function stampHandedOut(stamp: DocumentStamp, snapshot: AgentSnapshot): DocumentStamp {
  return frozenCopy({ ...stamp, fileSavedUtc: snapshot.documentAsWritten.documentStamp.fileSavedUtc })
}

/** @purity pure */
function reasonOfPlanRefusal(refusal: PlanRefusal): AgentRefusalReason {
  switch (refusal.step) {
    case 'WS-1':
      return 'staleStamp'
    case 'WS-2':
      return refusal.reason
    case 'WS-3':
      return 'commandRefused'
  }
}

/** @purity pure */
function ruleOfPlanRefusal(refusal: PlanRefusal): string {
  switch (refusal.step) {
    case 'WS-1':
      return 'AG-2'
    case 'WS-2':
      return refusal.reason === 'deliveringNotices' ? 'Chapter 5.5' : 'AG-9'
    case 'WS-3':
      return 'AG-3'
  }
}

/** @purity pure */
function agentRefusal(
  target: string,
  reason: AgentRefusalReason,
  snapshot: AgentSnapshot,
  what: string,
  refusals: readonly Refusal[],
): AgentRefusal {
  const handed = snapshot.documentAsWritten
  return {
    target,
    reason,
    stamp: frozenCopy(handed.documentStamp),
    document: reason === 'staleStamp' ? frozenCopy(handed) : null,
    refusals,
    what,
  }
}

/** @purity pure */
function notAvailable(target: string, snapshot: AgentSnapshot, missing: string): AgentRefusal {
  return agentRefusal(target, 'notAvailable', snapshot, `not built yet: ${missing}`, [])
}

// see AM-26, TV-1
// WHY: a page with no screen draws every task; it answers no product and no table.
const NO_SHOWN_TASKS: AgentShownTasks = { drawnTaskUids: null, tables: [] }

// see AM-27, TV-5, AG-5, FR-028
// WHY: untyped caller input; a list naming every task hides no row, and TV-5 keeps the filter from turning on for nothing.
/** @purity pure */
function shownTasksRefusalOf(snapshot: AgentSnapshot, taskUids: unknown, held: SearchTableVisibility): AgentRefusal | null {
  if (!Array.isArray(taskUids) || taskUids.some((uid) => typeof uid !== 'number')) {
    return agentRefusal('AM-27', 'malformedRequest', snapshot, 'taskUids is neither null nor a list of numbers', [])
  }
  const known = new Set(snapshot.document.schedule.tasks.map((task) => task.uid))
  const unknown = taskUids.filter((uid) => !known.has(uid))
  if (unknown.length > 0) return agentRefusal('AM-27', 'unknownTask', snapshot, `no task carries these uids: ${unknown.join(', ')}`, [])
  const isNothingHidden = new Set(taskUids).size === known.size
  if (isNothingHidden && !held.isApplied) return agentRefusal('AM-27', 'commandRefused', snapshot, 'TV-5: no row would be hidden', [])
  return null
}

// see AM-27, TV-5, TV-6, TV-8
// WHY: only rows that go from Hide to Show while the filter is already on open their task groups (TV-6, JDG-1868).
/** @purity non-pure */
function showOnlyTasksThrough(wiring: AgentApiWiring, snapshot: AgentSnapshot, taskUids: readonly number[] | null): AgentWriteOutcome {
  const holder = wiring.shownTasks
  if (holder === undefined) return { accepted: false, refusal: notAvailable('AM-27', snapshot, 'a screen holding the Visibility columns') }
  const held = holder.readSearchVisibility()
  if (taskUids === null) {
    holder.holdShownTasks({ ...held, isApplied: false })
    return { accepted: true, stamp: frozenCopy(snapshot.documentAsWritten.documentStamp), hasMovedSchedule: false }
  }
  const refusal = shownTasksRefusalOf(snapshot, taskUids, held)
  if (refusal !== null) return { accepted: false, refusal }
  const named = new Set(taskUids)
  const hiddenKeys = snapshot.document.schedule.tasks.map((task) => task.uid).filter((uid) => !named.has(uid))
  const opened = held.isApplied ? [...named].filter((uid) => held.hiddenKeys.includes(uid)) : []
  const commands = shownTasksRevealWrites(snapshot.document, opened)
  // WHY: WS-1 gets the stamp just read, as AM-16 does: the caller named tasks, not a document it read.
  const written = writeThroughTheOnePath(wiring, snapshot, 'AM-27', snapshot.document.documentStamp, commands)
  if (written.accepted) holder.holdShownTasks({ ...held, hiddenKeys, isApplied: true })
  return written
}

// see AM-16, SJ-0, SJ-2, SJ-5, SJ-9, SJ-10
/** @purity non-pure */
function focusTaskThrough(wiring: AgentApiWiring, snapshot: AgentSnapshot, taskUid: number): AgentFocusOutcome {
  const frame = snapshot.frame
  if (frame === null) {
    return {
      accepted: false,
      refusal: agentRefusal('AM-16', 'notDrawnYet', snapshot, 'BO-1: no frame yet', []),
    }
  }

  const schedule = snapshot.document.schedule
  if (!schedule.tasks.some((held) => held.uid === taskUid)) {
    return {
      accepted: false,
      refusal: agentRefusal('AM-16', 'unknownTask', snapshot, 'no task carries this uid', []),
    }
  }

  const member = schedule.taskGroupMembers.find((held) => held.taskUid === taskUid)
  const hasRoom = hasRoomBelowPinsIn(frame.layout, frame.regions.taskGroupArea, member?.groupId ?? null)
  const target = { kind: 'task', taskUid } as const
  const plan = searchJumpWrites(snapshot.document, target, hasRoom, searchJumpReachOf(frame.layout, frame.geometry, frame.regions.taskGroupArea, target))
  const commands = searchJumpCommands(plan)
  // WHY: WS-1 gets the stamp just read: the caller named a task, not a document it read,
  // so a concurrent edit does not refuse it.
  const written = writeThroughTheOnePath(wiring, snapshot, 'AM-16', snapshot.document.documentStamp, commands)
  if (written.accepted) wiring.shownTasks?.holdJumpTarget(taskUid)
  return written.accepted ? { ...written, isScrolled: !plan.isBlockedByPinnedTaskGroups } : written
}

// see FR-073
interface HandedFormatReading {
  readonly unreadColumns: readonly string[]
  readonly isNewerFormat: boolean
  // see FR-012, RS-52
  readonly recountedCount: number
}

// see AM-8, AG-9a
type HandedReading =
  | {
      readonly ok: true
      readonly document: Document
      readonly unreadColumns: readonly string[]
      readonly isNewerFormat: boolean
      readonly recountedCount: number
    }
  | { readonly ok: false; readonly reason: AgentRefusalReason; readonly what: string }

type HandedText =
  | { readonly ok: true; readonly json: string }
  | { readonly ok: false; readonly what: string }

const NONE_OF_THE_SHAPES =
  'AM-8 takes the document, { document } or { text }; none of the three was given'

// WHY: every shape is decoded by the codec, so { document } and the bare document refuse
// exactly what { text } refuses, with the codec's reason (DFC-911).
/** @purity pure */
function handedDocument(
  handed: AgentImportSource,
  greatestKnownSchemaVersion: string,
): HandedReading {
  const given = textOfHanded(handed)
  if (!given.ok) return { ok: false, reason: 'malformedRequest', what: given.what }
  const read = DocumentCodec.documentFromJson(given.json, greatestKnownSchemaVersion)
  if (read.ok) {
    const isNewerFormat = read.formatVersion === 'newerThanKnown'
    return {
      ok: true,
      document: read.document,
      unreadColumns: read.unreadColumns,
      isNewerFormat,
      recountedCount: read.recountedCount,
    }
  }
  const faults = read.faults.map((one) => `${one.at} ${one.what}`).join('; ')
  const what = `the codec refused it (${read.reason}): ${faults}`
  return { ok: false, reason: read.reason, what }
}

/** @purity pure */
function textOfHanded(handed: AgentImportSource): HandedText {
  if (handed === null || typeof handed !== 'object') return { ok: false, what: NONE_OF_THE_SHAPES }
  const bag = handed as Record<string, unknown>
  if (typeof bag['text'] === 'string') return { ok: true, json: bag['text'] }
  const named = bag['document']
  if (named !== null && typeof named === 'object') return serialisedDocument(named)
  return typeof bag['schedule'] === 'object' && bag['schedule'] !== null
    ? serialisedDocument(handed)
    : { ok: false, what: NONE_OF_THE_SHAPES }
}

// WHY: caught despite ST-7: a handed value may hold a cycle or a bigint, and writing either
// as JSON throws, which FR-028 forbids passing on.
/** @purity pure */
function serialisedDocument(value: object): HandedText {
  try {
    return { ok: true, json: jsonFromDocument(value as Document) }
  } catch (thrown) {
    const what = `the handed document cannot be written as JSON: ${messageOf(thrown)}`
    return { ok: false, what }
  }
}

// see AG-5
/** @purity non-pure */
function writeThroughTheOnePath(
  wiring: AgentApiWiring,
  snapshot: AgentSnapshot,
  target: string,
  readStamp: DocumentStamp,
  commands: readonly DocumentCommand[],
): AgentWriteOutcome {
  let outcome
  // WHY: caught despite ST-7: untyped caller input enters here, and planning a malformed
  // command throws, which FR-028 forbids passing on.
  try {
    outcome = planAndApply(wiring, snapshot, readStamp, commands)
  } catch (thrown) {
    return {
      accepted: false,
      refusal: agentRefusal(
        target,
        'malformedRequest',
        snapshot,
        `a command of the bundle is not the shape table T-108 declares: ${messageOf(thrown)}`,
        [],
      ),
    }
  }

  if (!outcome.accepted) {
    const { refusal } = outcome
    return {
      accepted: false,
      refusal: agentRefusal(
        target,
        reasonOfPlanRefusal(refusal),
        snapshot,
        `${refusal.step} refused it; the rule is ${ruleOfPlanRefusal(refusal)}`,
        refusal.step === 'WS-3' ? refusal.refusals : [],
      ),
    }
  }

  return {
    accepted: true,
    stamp: stampHandedOut(outcome.document.documentStamp, snapshot),
    hasMovedSchedule: outcome.hasMovedSchedule,
  }
}

/** @purity pure */
export function messageOf(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown)
}

/** @purity non-pure */
function planAndApply(
  wiring: AgentApiWiring,
  snapshot: AgentSnapshot,
  readStamp: DocumentStamp,
  commands: readonly DocumentCommand[],
): ReturnType<typeof applyDocumentChange> {
  return applyDocumentChange(
    {
      readStamp,
      commands,
      moment: {
        gestureInFlight: snapshot.isGestureInFlight,
        editingInPlace: snapshot.isEditingInPlace,
        questionAsked: snapshot.isQuestionAsked,
        deliveringNotices: snapshot.isDeliveringNotices,
      },
      historyLimits: snapshot.historyLimits,
      settingsLimits: snapshot.settingsLimits,
      defaultTaskGroupName: snapshot.defaultTaskGroupName,
      editedBy: wiring.writerName,
      updatedUtc: snapshot.readAt,
    },
    wiring.holder,
    wiring.audience,
  )
}

// see AM-11, DV-12
/** @purity pure */
function mspdiOfSnapshot(snapshot: AgentSnapshot): string {
  return mspdiFromDocument(snapshot.document, snapshot.localReadAt).text
}

// see AM-18, AG-11, T-233, WS-2
// WHY: refused like a write -- a subscriber answering mid-delivery would
// keep the round from ever finishing (Chapter 5.5).
/** @purity non-pure */
function postAgentUtterance(
  wiring: AgentApiWiring,
  snapshot: AgentSnapshot,
  text: string,
): AgentUtteranceOutcome {
  if (NotifyChangeWatchers.isDeliveringNotices(wiring.changeWatchers)) {
    return {
      accepted: false,
      refusal: agentRefusal(
        'AM-18',
        'deliveringNotices',
        snapshot,
        'Chapter 5.5 with AG-11: a subscriber answering mid-delivery would never let the round end',
        [],
      ),
    }
  }
  const utterance: PostDialogueMessage.SettledUtterance = {
    author: wiring.writerName,
    text,
    settledAt: snapshot.readAt,
  }
  const posted = PostDialogueMessage.postDialogueMessage(
    utterance,
    wiring.dialogueHolder,
    wiring.dialogueAudience,
  )
  return {
    accepted: true,
    message: frozenCopy({ ...utterance, sequence: latestSequence(posted) }),
  }
}

// STOP: spec does not decide whether readSearchRows answers SQ-5's bottleneck, shown only while S-445 is on. Looked in AM-25, SQ-5, AM-19 (PND-711)
const NO_SEARCH_BOTTLENECKS: ReadonlySet<number> = new Set()

// see T-107
/** @purity non-pure */
export function agentApiMembers(wiring: AgentApiWiring): AgentApi {
  const { source } = wiring

  return {
    agentApiVersion: AGENT_API_VERSION,
    schemaVersion: wiring.schemaVersion,

    /** @purity semi-pure-b */
    readDocument(): Document {
      return frozenCopy(source.readSnapshot().documentAsWritten)
    },

    /** @purity semi-pure-b */
    readStamp(): DocumentStamp {
      return frozenCopy(source.readSnapshot().documentAsWritten.documentStamp)
    },

    /** @purity semi-pure-b */
    readSelection(): Selection {
      return frozenCopy(source.readSnapshot().selection)
    },

    /** @purity semi-pure-b */
    readDialogueMessages(): readonly DialogueMessage[] {
      return frozenCopy(source.readSnapshot().dialogue.messages)
    },

    /** @purity semi-pure-b */
    readSearchRows(word: string): SearchRows {
      return frozenCopy(searchRowsOf(source.readSnapshot().document.schedule, word, NO_SEARCH_BOTTLENECKS))
    },

    /** @purity semi-pure-b */
    readShownTasks: (): AgentShownTasks => frozenCopy(wiring.shownTasks?.readShownTasks() ?? NO_SHOWN_TASKS),

    // see AM-19, FR-134, AG-4
    // WHY: diagnosed afresh, never the shell's held report: AM-19 writes no screen value, so it
    // answers whether or not S-445 is on.
    /** @purity semi-pure-b */
    readDelayDiagnostics(): DelayDiagnosticsReport {
      const document = source.readSnapshot().document
      return frozenCopy(diagnoseDelay(document, workingCalendarOf(document.schedule)))
    },

    /** @purity non-pure */
    applyCommands(request: AgentWriteRequest): AgentWriteOutcome {
      const snapshot = source.readSnapshot()
      if (request === null || typeof request !== 'object'
        || (request.readStamp as unknown) === null
        || typeof request.readStamp !== 'object'
        || !Array.isArray(request.commands)
        || request.commands.some(
          (one) => one === null || one === undefined || typeof one !== 'object',
        )) {
        return {
          accepted: false,
          refusal: agentRefusal(
            'AM-7',
            'malformedRequest',
            snapshot,
            'AM-7 takes { readStamp, commands }; one of the two is missing or not its shape',
            [],
          ),
        }
      }
      return writeThroughTheOnePath(
        wiring,
        snapshot,
        'AM-7',
        request.readStamp,
        request.commands,
      )
    },

    /** @purity semi-pure-b */
    async importDocument(handedSource: AgentImportSource): Promise<AgentWriteOutcome> {
      const snapshot = source.readSnapshot()
      const road = wiring.takeInDocument
      if (road === undefined) {
        return {
          accepted: false,
          refusal: notAvailable('AM-8', snapshot, 'the wiring carries no import road'),
        }
      }
      const incoming = handedDocument(handedSource, wiring.schemaVersion)
      if (!incoming.ok) {
        return {
          accepted: false,
          refusal: agentRefusal(
            'AM-8',
            incoming.reason,
            snapshot,
            incoming.what,
            [],
          ),
        }
      }
      // TRAP: a person answers U-61 during this await; take a fresh snapshot after it.
      const landing = await road(incoming.document, incoming)
      const after = source.readSnapshot()
      // TRAP: `!landing` compiles but takes a refusal object for a landed import.
      if (landing !== true) {
        const refusals = landing === false ? [] : landing.refusals
        const first = refusals[0]
        return {
          accepted: false,
          refusal: first === undefined
            ? agentRefusal(
              'AM-8',
              'commandRefused',
              after,
              'the import did not land: answered MM-4, refused by OP-5, or OP-8 held',
              [],
            )
            : agentRefusal(
              'AM-8',
              first.rule,
              after,
              `FR-023 refused it; the row is ${first.rule}: ${first.what}`,
              refusals,
            ),
        }
      }
      return {
        accepted: true,
        stamp: frozenCopy(after.documentAsWritten.documentStamp),
        hasMovedSchedule: true,
      }
    },

    /** @purity semi-pure-b */
    undoEdit(): AgentWriteOutcome {
      return {
        accepted: false,
        refusal: notAvailable(
          'AM-9',
          source.readSnapshot(),
          'AM-9 declares neither a row of table T-230 nor the stamp WS-1 matches',
        ),
      }
    },

    /** @purity semi-pure-b */
    redoEdit(): AgentWriteOutcome {
      return {
        accepted: false,
        refusal: notAvailable(
          'AM-10',
          source.readSnapshot(),
          'AM-10 declares neither a row of table T-230 nor the stamp WS-1 matches',
        ),
      }
    },

    /** @purity semi-pure-b */
    exportJson(): AgentExport<string> {
      return { ok: true, value: jsonFromDocument(source.readSnapshot().documentAsWritten) }
    },

    /** @purity semi-pure-b */
    exportMspdi(): AgentExport<string> {
      return { ok: true, value: mspdiOfSnapshot(source.readSnapshot()) }
    },

    /** @purity semi-pure-b */
    exportSvg(): AgentExport<string> {
      const snapshot = source.readSnapshot()

      if (snapshot.isGestureInFlight || snapshot.isEditingInPlace) {
        const reason = snapshot.isGestureInFlight ? 'gestureInFlight' : 'editingInPlace'
        return {
          ok: false,
          refusal: agentRefusal(
            'AM-13',
            reason,
            snapshot,
            'AG-4 with AG-9: the picture would not match what a read answers',
            [],
          ),
        }
      }

      // TRAP: draw from exportScene, not frame: a frame has the screen's size, not the one IO-3 fixes.
      const scene = snapshot.exportScene
      if (scene === null) {
        return {
          ok: false,
          refusal: agentRefusal('AM-13', 'notDrawnYet', snapshot, 'BO-1: no frame yet', []),
        }
      }

      const picture = ImageExporter.exportSvg(scene)
      if (!picture.ok) {
        return {
          ok: false,
          refusal: agentRefusal(
            'AM-13',
            'tooTall',
            snapshot,
            'FR-025 with S-217: grown to the ceiling, the picture still does not fit (MUST NOT draw part of one)',
            [],
          ),
        }
      }
      return { ok: true, value: picture.svg }
    },

    /** @purity semi-pure-b */
    async exportPng(): Promise<AgentExport<Uint8Array>> {
      const snapshot = source.readSnapshot()

      if (snapshot.isGestureInFlight || snapshot.isEditingInPlace) {
        const reason = snapshot.isGestureInFlight ? 'gestureInFlight' : 'editingInPlace'
        return {
          ok: false,
          refusal: agentRefusal(
            'AM-14',
            reason,
            snapshot,
            'AG-4 with AG-9: the picture would not match what a read answers',
            [],
          ),
        }
      }

      const scene = snapshot.exportScene
      if (scene === null) {
        return {
          ok: false,
          refusal: agentRefusal('AM-14', 'notDrawnYet', snapshot, 'BO-1: no frame yet', []),
        }
      }

      const seam = wiring.rasterizer
      if (seam === undefined) {
        return {
          ok: false,
          refusal: notAvailable('AM-14', snapshot, 'the wiring carries no Rasterizer (IF-6)'),
        }
      }

      // TRAP: refusals after this await keep the earlier snapshot; a fresh read would carry
      // a stamp this call never stood at (CS-4).
      const painted = await ImageExporter.exportPng(seam, scene)
      if (!painted.ok) {
        return {
          ok: false,
          refusal: agentRefusal(
            'AM-14',
            'tooTall',
            snapshot,
            'FR-025 with S-217: grown to the ceiling, the picture still does not fit (MUST NOT draw part of one)',
            [],
          ),
        }
      }
      if (!painted.png.ok) {
        return {
          ok: false,
          refusal: agentRefusal(
            'AM-14',
            'rasterFailed',
            snapshot,
            `IF-6 could not paint it (${painted.png.fault.reason}): ${painted.png.fault.what}`,
            [],
          ),
        }
      }
      return { ok: true, value: painted.png.pngBytes }
    },

    /** @purity semi-pure-b */
    async exportEmbeddedHtml(): Promise<AgentExport<string>> {
      const snapshot = source.readSnapshot()
      const seam = wiring.appShell
      if (seam === undefined) {
        return {
          ok: false,
          refusal: notAvailable('AM-15', snapshot, 'the wiring carries no AppShellSource (IF-8)'),
        }
      }
      const made = await DocumentCodec.exportEmbeddedHtml(seam, snapshot.documentAsWritten)
      if (!made.ok) {
        return {
          ok: false,
          refusal: agentRefusal(
            'AM-15',
            'embeddedHtmlFailed',
            snapshot,
            `UT-5 could not assemble it (${made.fault.reason}): ${made.fault.what}`,
            [],
          ),
        }
      }
      return { ok: true, value: made.html }
    },

    /** @purity non-pure */
    focusTask: (taskUid: number): AgentFocusOutcome => focusTaskThrough(wiring, source.readSnapshot(), taskUid),

    /** @purity non-pure */
    showOnlyTasks: (taskUids: readonly number[] | null): AgentWriteOutcome => showOnlyTasksThrough(wiring, source.readSnapshot(), taskUids),

    /** @purity non-pure */
    watchChanges(receive: AgentChangeReceiver): AgentWatch {
      const snapshot = source.readSnapshot()
      const hasReplacedEarlierWatch = NotifyChangeWatchers.watchChanges(wiring.changeWatchers, {
        watcher: wiring.writerName,
        since: {
          seenScheduleUpdatedUtc: snapshot.document.documentStamp.scheduleUpdatedUtc,
          seenSequence: latestSequence(snapshot.dialogue),
        },
        deliver: receive,
      })

      return {
        hasReplacedEarlierWatch,
        /** @purity non-pure */
        stopWatching(): boolean {
          return NotifyChangeWatchers.unwatchChanges(wiring.changeWatchers, wiring.writerName)
        },
      }
    },

    /** @purity non-pure */
    postDialogueMessage(text: string): AgentUtteranceOutcome {
      return postAgentUtterance(wiring, source.readSnapshot(), text)
    },
  }
}
