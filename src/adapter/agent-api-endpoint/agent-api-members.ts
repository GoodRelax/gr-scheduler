// AgentApiEndpoint -- wires the members of table T-107 to the components that do the work.
// @unit      UF-28   (docs/spec/05-07-design.md, table T-075)
// @component AgentApiEndpoint, layer Adapter (table T-062)
// @purity    non-pure

import type { Document } from '../../entity/document-model/document/document'
import {
  latestSequence,
  type DialogueMessage,
} from '../../entity/document-model/dialogue-log/dialogue-log'
import type { Selection } from '../../entity/document-model/selection/selection'
import { taskPlacement } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  applyDocumentChange,
  type ChangeAudience,
  type DocumentCommand,
  type DocumentHolder,
  type PlanRefusal,
  type Refusal,
} from '../../use-case/apply-document-change/apply-document-change'
import * as NotifyChangeWatchers from '../../use-case/notify-change-watchers/notify-change-watchers'
import * as PostDialogueMessage from '../../use-case/post-dialogue-message/post-dialogue-message'
import * as DocumentCodec from '../document-codec/document-codec'
import { jsonFromDocument, mspdiFromDocument } from '../document-codec/document-codec'
import * as ImageExporter from '../image-exporter/image-exporter'
import type { AgentSnapshot, FrameSnapshot, SnapshotSource } from './snapshot-source'

type DocumentStamp = Document['documentStamp']

// see AG-9a, FR-028
export type AgentRefusalReason =
  | 'staleStamp'
  | 'gestureInFlight'
  | 'editingInPlace'
  | 'deliveringNotices'
  | 'commandRefused'
  | 'unknownTask'
  | 'notDrawnYet'
  | 'tooTall'
  | 'rasterFailed'
  | 'embeddedHtmlFailed'
  | 'notAvailable'
  | 'malformedRequest'

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

// see AM-8, FR-022
export type AgentImportSource = Document | { readonly document: Document } | { readonly text: string }

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
  focusTask(taskUid: number): AgentWriteOutcome

  /** @purity non-pure */
  watchChanges(receive: AgentChangeReceiver): AgentWatch

  /** @purity non-pure */
  postDialogueMessage(text: string): DialogueMessage
}

export interface AgentApiWiring {
  readonly source: SnapshotSource
  readonly holder: DocumentHolder
  readonly audience: ChangeAudience
  readonly dialogueHolder: PostDialogueMessage.DialogueLogHolder
  readonly dialogueAudience: PostDialogueMessage.DialogueAudience
  // TRAP: required but possibly undefined, never optional (so too appShell and takeInDocument):
  // an optional member lets a wiring forget it silently.
  readonly rasterizer: ImageExporter.Rasterizer | undefined
  readonly appShell: DocumentCodec.AppShellSource | undefined
  readonly takeInDocument: ((incoming: Document) => Promise<boolean>) | undefined
  // TRAP: must differ from the person's writer name, or AG-6 takes the person's edits for this API's own.
  readonly writerName: string
  readonly schemaVersion: string
}

// STOP: spec does not decide the first value or spelling of the Agent API version. Looked in AG-1, T-035, T-107
// @provisional PND-60
const AGENT_API_VERSION = 1

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
  const stamp = snapshot.document.documentStamp
  return {
    target,
    reason,
    stamp: frozenCopy(stamp),
    document: reason === 'staleStamp' ? frozenCopy(snapshot.document) : null,
    refusals,
    what,
  }
}

/** @purity pure */
function notAvailable(target: string, snapshot: AgentSnapshot, missing: string): AgentRefusal {
  return agentRefusal(target, 'notAvailable', snapshot, `not built yet: ${missing}`, [])
}

/** @purity pure */
function handedDocument(
  handed: AgentImportSource,
  greatestKnownSchemaVersion: string,
): Document | null {
  if (handed === null || typeof handed !== 'object') return null
  const bag = handed as Record<string, unknown>
  if (typeof bag['text'] === 'string') {
    const read = DocumentCodec.documentFromJson(bag['text'], greatestKnownSchemaVersion)
    return read.ok ? read.document : null
  }
  const named = bag['document']
  if (named !== null && typeof named === 'object') return named as Document
  return typeof bag['schedule'] === 'object' && bag['schedule'] !== null
    ? (handed as Document)
    : null
}

// STOP: spec does not decide where in the view AM-16 puts the task, or which day an undated plan takes.
// Looked in FR-055, T-203, T-051, AM-16
// @provisional PND-61
/** @purity pure */
function viewThatShowsTask(
  snapshot: AgentSnapshot,
  frame: FrameSnapshot,
  taskUid: number,
): { readonly scrollDate: string; readonly scrollGroupId: string } | null {
  const placement = taskPlacement(frame.layout, taskUid)
  if (placement === null) return null
  const task = snapshot.document.schedule.tasks.find((held) => held.uid === taskUid)
  if (task === undefined) return null
  const day = task.start ?? task.actualStart
  if (day === null) return null
  return { scrollDate: day, scrollGroupId: placement.groupId }
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
    stamp: frozenCopy(outcome.document.documentStamp),
    hasMovedSchedule: outcome.hasMovedSchedule,
  }
}

/** @purity pure */
function messageOf(thrown: unknown): string {
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
        deliveringNotices: false,
      },
      historyLimits: snapshot.historyLimits,
      settingsLimits: snapshot.settingsLimits,
      editedBy: wiring.writerName,
      updatedUtc: snapshot.readAt,
    },
    wiring.holder,
    wiring.audience,
  )
}

// see T-107
/** @purity non-pure */
export function agentApiMembers(wiring: AgentApiWiring): AgentApi {
  const { source } = wiring

  return {
    agentApiVersion: AGENT_API_VERSION,
    schemaVersion: wiring.schemaVersion,

    /** @purity semi-pure-b */
    readDocument(): Document {
      return frozenCopy(source.readSnapshot().document)
    },

    /** @purity semi-pure-b */
    readStamp(): DocumentStamp {
      return frozenCopy(source.readSnapshot().document.documentStamp)
    },

    /** @purity semi-pure-b */
    readSelection(): Selection {
      return frozenCopy(source.readSnapshot().selection)
    },

    /** @purity semi-pure-b */
    readDialogueMessages(): readonly DialogueMessage[] {
      return frozenCopy(source.readSnapshot().dialogue.messages)
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
      if (incoming === null) {
        return {
          accepted: false,
          refusal: agentRefusal(
            'AM-8',
            'malformedRequest',
            snapshot,
            'AM-8 takes the document, { document } or { text }; none of the three was given',
            [],
          ),
        }
      }
      // TRAP: a person answers U-61 during this await; take a fresh snapshot after it.
      const landed = await road(incoming)
      const after = source.readSnapshot()
      if (!landed) {
        // STOP: spec does not decide the category of an import that did not land (MM-4, OP-5, OP-8).
        // Looked in AG-9a
        return {
          accepted: false,
          refusal: agentRefusal(
            'AM-8',
            'commandRefused',
            after,
            'the import did not land: answered MM-4, refused by OP-5, or OP-8 held',
            [],
          ),
        }
      }
      return {
        accepted: true,
        stamp: frozenCopy(after.document.documentStamp),
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
      return { ok: true, value: jsonFromDocument(source.readSnapshot().document) }
    },

    /** @purity semi-pure-b */
    exportMspdi(): AgentExport<string> {
      return { ok: true, value: mspdiFromDocument(source.readSnapshot().document).text }
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
      const made = await DocumentCodec.exportEmbeddedHtml(seam, snapshot.document)
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
    focusTask(taskUid: number): AgentWriteOutcome {
      const snapshot = source.readSnapshot()
      const frame = snapshot.frame
      if (frame === null) {
        return {
          accepted: false,
          refusal: agentRefusal('AM-16', 'notDrawnYet', snapshot, 'BO-1: no frame yet', []),
        }
      }

      const view = viewThatShowsTask(snapshot, frame, taskUid)
      if (view === null) {
        return {
          accepted: false,
          refusal: agentRefusal(
            'AM-16',
            'unknownTask',
            snapshot,
            'no task with this uid was drawn by the last frame, or it carries no date',
            [],
          ),
        }
      }

      // WHY: WS-1 gets the stamp just read: moving the view changes no schedule the caller read,
      // so a concurrent edit does not refuse it.
      return writeThroughTheOnePath(wiring, snapshot, 'AM-16', snapshot.document.documentStamp, [
        {
          kind: 'setScrollPosition',
          scrollDate: view.scrollDate,
          scrollGroupId: view.scrollGroupId,
          scrollDayOffset: 0,
          scrollGroupOffset: 0,
        },
      ])
    },

    /** @purity non-pure */
    watchChanges(receive: AgentChangeReceiver): AgentWatch {
      const snapshot = source.readSnapshot()
      const hasReplacedEarlierWatch = NotifyChangeWatchers.watchChanges({
        watcher: wiring.writerName,
        // STOP: spec does not decide what a fresh AM-17 subscription is told first. Looked in AG-6, AM-17
        // @provisional PND-62
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
          return NotifyChangeWatchers.unwatchChanges(wiring.writerName)
        },
      }
    },

    /** @purity non-pure */
    postDialogueMessage(text: string): DialogueMessage {
      const snapshot = source.readSnapshot()
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
      return frozenCopy({ ...utterance, sequence: latestSequence(posted) })
    },
  }
}
