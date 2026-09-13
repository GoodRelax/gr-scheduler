// AgentApiEndpoint -- internal unit of the component.
//
// @unit      UF-28   (docs/spec/05-07-design.md, table T-075)
// @component AgentApiEndpoint, layer Adapter (table T-062)
// @purity    non-pure
//
// The wiring of table T-107's members; a file of its own rather than a purity
// split, for UT-4 of table T-063's reason. `AgentApi` below is that table's
// roster in its order and groups, and what each member is for stays in the
// table (PI-17).
//
// No member throws or rejects a promise (FR-028); a member that can be turned
// away answers with `AgentRefusal`, which carries what AG-9a fixes.
//
// While a person is mid-gesture, two different things are refused:
//
//   writes      by WS-2 of table T-067, and the test is not repeated here: a
//               second copy would be a second place to drift from.
//               `applyCommands` and `focusTask` both go through that step.
//   pictures    here, by the gate in `exportSvg`: a picture is drawn from the
//               values being dragged, so it would show a state no read of this
//               API answers with (AG-4). A read of the document is not refused:
//               CS-2 of table T-066 freezes it when the pointer goes down, and
//               AG-2's stamp check turns away the write such a read leads to.
//
// AM-9 and AM-10 are not wired yet, and each says why at its member. They refuse
// with a value and are not faked: an empty string or a document built here would
// be a wrong answer wearing a right shape.
//
// For AM-9 and AM-10 the tag on the `AgentApi` member is table T-107's value
// (`non-pure`, a write) and the tag on the body is what the body does today
// (`semi-pure-b`, it reads a snapshot to build the refusal). They are not
// aligned by hand: a tag claiming a side effect that is not there is a false
// comment (rule 03). The gap closes when the member is wired.

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
// Namespaces spelled with the component's own name (table T-062): AM-17 and
// AM-18 of table T-107 share their names with PI-15's and PI-16's entries, and
// rule 03 forbids giving either side a second name.
import * as NotifyChangeWatchers from '../../use-case/notify-change-watchers/notify-change-watchers'
import * as PostDialogueMessage from '../../use-case/post-dialogue-message/post-dialogue-message'
// A namespace for the same reason: PI-20's entry and AM-15 share
// `exportEmbeddedHtml`.
import * as DocumentCodec from '../document-codec/document-codec'
import { jsonFromDocument, mspdiFromDocument } from '../document-codec/document-codec'
// A namespace for the same reason: PI-21's entry and AM-13 share `exportSvg`.
import * as ImageExporter from '../image-exporter/image-exporter'
// SvgRenderer is not imported: a picture drawn here at the screen's size would
// be a second road beside PI-21's, and IO-3 of table T-024 admits one size. The
// Chapter 5.2 edge to it stands through `snapshot-source.ts` (PI-19's types).
import type { AgentSnapshot, FrameSnapshot, SnapshotSource } from './snapshot-source'

/**
 * The document's stamp (PI-3), named through the root that carries it: Chapter
 * 5.2 draws this component an edge to Document and none to DocumentStamp.
 */
type DocumentStamp = Document['documentStamp']

/**
 * The category of a refusal: AG-9a asks for a category, not a sentence a caller
 * would have to parse (FR-028).
 *
 * The WS-step categories keep the names `PlanRefusal` gives them, so that the
 * two cannot part company.
 */
export type AgentRefusalReason =
  /** WS-1 of table T-067 / AG-2: the stamp the caller read is not the current one. */
  | 'staleStamp'
  /** WS-2 / AG-9: a person is part way through a drag that changes the document. */
  | 'gestureInFlight'
  /** WS-2 / AG-9: a person has typed something and not settled it. */
  | 'editingInPlace'
  /** WS-2 / Chapter 5.5: notices are being handed out at this instant. */
  | 'deliveringNotices'
  /** WS-3 / AG-3: at least one command was refused, so the whole bundle was dropped. */
  | 'commandRefused'
  /** AM-16: the uid names no task this frame drew, or the task carries no date. */
  | 'unknownTask'
  /** AM-13 and AM-16: no frame has been computed yet (BO-1, NFR-011). */
  | 'notDrawnYet'
  /**
   * AM-13: `ImageExporter.exportSvg` refused the picture (FR-025 with S-217).
   * The telling row `RS-43` of table T-233 is not repeated: this union is
   * AG-9a's classification, and the Agent API composes no words.
   */
  | 'tooTall'
  /**
   * AM-14: the picture was drawn and painting it failed -- `RasterFault` (IF-6),
   * the value AG-8 of table T-035 asks for. IF-6's own reason travels in `what`,
   * keeping one category per member. Not `tooTall`: that is FR-025's refusal to
   * draw at all, and the rasterizer is never asked.
   */
  | 'rasterFailed'
  /**
   * AM-15: the application's own HTML could not be read, or the document could
   * not be written into it -- `EmbeddedHtmlFault` (UT-5 of table T-063). The
   * fault's own reason travels in `what`.
   */
  | 'embeddedHtmlFailed'
  /**
   * Not a category the specification states. FR-028 forbids throwing, and a
   * member whose work has nowhere to go yet (AM-9, AM-10, or a wiring that lacks
   * the member's road) answers with this: it has not failed, it has not been
   * built.
   */
  | 'notAvailable'
  /**
   * Not a stated category either: FR-028 forbids throwing, and a caller outside
   * this build can hand a member an argument that is not the shape table T-107
   * declares. AG-9a does not enumerate the categories, which leaves room for
   * both.
   */
  | 'malformedRequest'

/**
 * Why a call was turned away. AG-9a fixes the first three fields (MUST): the
 * target, the category, and which document it now stands at.
 */
export interface AgentRefusal {
  /** What was refused: the row of table T-107 whose member was called. */
  readonly target: string
  readonly reason: AgentRefusalReason
  /**
   * The whole current stamp: what AG-9a asks a refusal to carry and what a retry
   * declares (AG-2). One field, not a stamp and a count: FR-063 leaves the stamp
   * the one answer to "which document".
   */
  readonly stamp: DocumentStamp
  /**
   * The current document, present only when the stamp did not match (AG-2).
   * Absent otherwise: a frozen copy of the whole root on every refusal is a
   * per-call cost nobody asked for.
   */
  readonly document: Document | null
  /**
   * What the aggregates said, when the refusal came from WS-3. Empty otherwise.
   * Each one names the row of table T-108 it refused and the rule that refused
   * it (PI-9).
   */
  readonly refusals: readonly Refusal[]
  /** The step of table T-067 or the member, and the row that did the refusing. */
  readonly what: string
}

/**
 * What a member of table T-107's AM-11 to AM-15 group answers.
 *
 * One shape for the whole group, although `exportJson` cannot fail: a caller
 * branching differently per member would be reading this file, not the table.
 */
export type AgentExport<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly refusal: AgentRefusal }

/** What AM-7 is handed. */
export interface AgentWriteRequest {
  /**
   * The stamp the caller read before deciding on these commands (AG-2). All
   * three values are compared: the schedule instant alone misses a write to the
   * presentation group, which FR-063 does not move it for. `readStamp` (AM-4)
   * supplies it.
   */
  readonly readStamp: DocumentStamp
  /**
   * The bundle, applied atomically (AG-3) as one undo step (FR-031).
   *
   * Values this component neither builds nor judges (table T-108, PI-9): judging
   * here would be a second validation beside the one MS-1 of table T-042 allows.
   */
  readonly commands: readonly DocumentCommand[]
}

/** What one accepted write answers with, or why it was turned away. */
export type AgentWriteOutcome =
  | {
      readonly accepted: true
      /** The stamp after the write. A caller holds it for its next AG-2 check. */
      readonly stamp: DocumentStamp
      /** WS-5's judgement: true only when the schedule-data group moved (FR-063). */
      readonly hasMovedSchedule: boolean
    }
  | { readonly accepted: false; readonly refusal: AgentRefusal }

/**
 * What AM-8 is handed: the document to take in, in any of the three shapes a
 * caller naturally has it in. The signature is this file's (table T-107's
 * preamble).
 *
 * No merge choices: FR-022 (MUST NOT) keeps them from the caller, and table
 * T-032a's answers come from a person on U-61.
 *
 * `readDocument` (AM-3) answers with the root itself, `{ document }` is the same
 * value named, and `{ text }` is IO-2 of table T-024 (text, CN-5 of table T-003).
 * `{ text }` is not IO-1: `handedDocument` reads it through PI-20's
 * `documentFromJson` only, and OP-12 of table T-024a (MUST) needs a file
 * extension a handed value does not have.
 */
export type AgentImportSource = Document | { readonly document: Document } | { readonly text: string }

/** What a watcher is handed. AG-6 decides what is in it; PI-15 builds it. */
export type AgentChangeReceiver = (notice: NotifyChangeWatchers.ChangeNotice) => void

/**
 * The handle AM-17 answers with.
 *
 * Table T-107 has no member for unwatching, and none is invented (PI-17), so the
 * way to stop is a value the subscription itself hands back.
 */
export interface AgentWatch {
  /**
   * Whether a subscription was already held under this API's writer name and
   * has been replaced by this one. PI-15 decides that the newest wins.
   */
  readonly hasReplacedEarlierWatch: boolean
  /**
   * Stop watching. Answers whether there was still a subscription to stop.
   *
   * @purity non-pure
   */
  stopWatching(): boolean
}

/**
 * The members of table T-107, in that table's order and groups, flat on one
 * face (Chapter 5.2, R2.5).
 */
export interface AgentApi {
  // ---- AM-1, AM-2 -----------------------------------------------------------------
  /**
   * AM-1. The version of this API (AG-1). A plain property, so that reading it
   * needs nothing else to have worked.
   */
  readonly agentApiVersion: number
  /**
   * AM-2. The document format version this build reads and writes -- the
   * greatest one FR-073 says it knows. Not the version of the document that
   * happens to be open: that one is inside AM-3's answer.
   */
  readonly schemaVersion: string

  // ---- AM-3 to AM-6 ---------------------------------------------------------------
  /**
   * AM-3. A frozen copy of the whole root (AG-4, and DR-1 of table T-052).
   *
   * @purity semi-pure-b
   */
  readDocument(): Document
  /**
   * AM-4. A frozen copy of the stamp, which AG-2's lock is matched against.
   *
   * @purity semi-pure-b
   */
  readStamp(): DocumentStamp
  /**
   * AM-5. A frozen copy of what is selected, in the order it was picked (SL-7b).
   *
   * @purity semi-pure-b
   */
  readSelection(): Selection
  /**
   * AM-6. Frozen copies of the settled utterances. AG-11 keeps drafts out.
   *
   * @purity semi-pure-b
   */
  readDialogueMessages(): readonly DialogueMessage[]

  // ---- AM-7, AM-8 ---------------------------------------------------------------
  /**
   * AM-7. One atomic bundle (AG-3), accepted or refused as a value (FR-028).
   *
   * @purity non-pure
   */
  applyCommands(request: AgentWriteRequest): AgentWriteOutcome
  /**
   * AM-8. Intake and merge. A promise because FR-022 has the call wait for a
   * person on U-61; FR-028 forbids the throw, not the wait.
   *
   * @purity non-pure
   */
  importDocument(source: AgentImportSource): Promise<AgentWriteOutcome>

  // ---- AM-9, AM-10 ---------------------------------------------------------------
  /**
   * AM-9. One step back (FR-031). Not wired; see the member.
   *
   * @purity non-pure
   */
  undoEdit(): AgentWriteOutcome
  /**
   * AM-10. One step forward (FR-031). Not wired; see the member.
   *
   * @purity non-pure
   */
  redoEdit(): AgentWriteOutcome

  // ---- AM-11 to AM-15 ---------------------------------------------------------------
  /**
   * AM-11. The GRS JSON as a value, with no download dialogue (AG-7).
   *
   * @purity semi-pure-b
   */
  exportJson(): AgentExport<string>
  /**
   * AM-12. The exchange format, as a value, with no download dialogue.
   *
   * @purity semi-pure-b
   */
  exportMspdi(): AgentExport<string>
  /**
   * AM-13. The picture, as a value -- the one IO-3 of table T-024 sizes.
   *
   * @purity semi-pure-b
   */
  exportSvg(): AgentExport<string>
  /**
   * AM-14. The image, failure included (AG-8). A promise because PI-21's entry
   * is one: IF-6 decodes an image before it can paint it. The signature is this
   * file's (table T-107's preamble).
   *
   * @purity semi-pure-b
   */
  exportPng(): Promise<AgentExport<Uint8Array>>
  /**
   * AM-15. Application and document in one .html.
   *
   * A promise because IF-8's `readAppShell` is one: the shell fetches its own
   * HTML.
   *
   * @purity semi-pure-b
   */
  exportEmbeddedHtml(): Promise<AgentExport<string>>

  // ---- AM-16 -------------------------------------------------------------
  /**
   * AM-16. Move the view so the task is in it. Writes S-77 and S-78.
   *
   * @purity non-pure
   */
  focusTask(taskUid: number): AgentWriteOutcome

  // ---- AM-17 ---------------------------------------------------------------
  /**
   * AM-17. Wake for what somebody else settled (AG-6 and AG-11).
   *
   * @purity non-pure
   */
  watchChanges(receive: AgentChangeReceiver): AgentWatch

  // ---- AM-18 ---------------------------------------------------------------
  /**
   * AM-18. Put a settled utterance in the dialogue field.
   *
   * Answers with the message the log sequenced. FR-063 does not move the
   * schedule instant for it (AG-11), so a caller's AG-2 lock stays valid across
   * a post.
   *
   * @purity non-pure
   */
  postDialogueMessage(text: string): DialogueMessage
}

/**
 * What the surface is built out of. Everything here is a current value or an
 * environment value, and LY-5 of table T-060 is why they are arguments: the
 * three layers inside the Framework hold none of them.
 */
export interface AgentApiWiring {
  /** IF-7 of table T-065, declared in this folder. */
  readonly source: SnapshotSource
  /** PI-8's seam. The one write path (MS-1 of table T-042) reaches it. */
  readonly holder: DocumentHolder
  /** PI-8's seam. WS-7 hands the confirmed document to it, after the swap. */
  readonly audience: ChangeAudience
  /** PI-16's seam. The log is not in the document (FR-066, MUST NOT). */
  readonly dialogueHolder: PostDialogueMessage.DialogueLogHolder
  /** PI-16's seam: who is told once an utterance is in the log. */
  readonly dialogueAudience: PostDialogueMessage.DialogueAudience
  /**
   * IF-6 of table T-065 (CP-31), which AM-14 paints IO-4 with.
   *
   * Present and possibly `undefined`, never optional: the absence is real (the
   * Framework's loop takes it as an optional argument) and `exportPng` answers
   * `notAvailable` for it. An optional field would let a wiring forget it
   * silently.
   */
  readonly rasterizer: ImageExporter.Rasterizer | undefined
  /**
   * IF-8 of table T-065, which AM-15 reads the application's own HTML through.
   *
   * Absent on the same terms as `rasterizer` above.
   */
  readonly appShell: DocumentCodec.AppShellSource | undefined
  /**
   * AM-8's road: hand the document to the side that owns the import, and wait.
   *
   * A seam, not a call: raising U-61 and waiting on a person (FR-022) is a
   * current value's business, which LY-5 of table T-060 leaves to the Framework.
   * It answers only whether a document landed; FR-022 (MUST NOT) keeps the
   * person's answer from travelling back to the caller.
   *
   * Absent on the terms `rasterizer` has; AM-8 then answers `notAvailable`.
   */
  readonly takeInDocument: ((incoming: Document) => Promise<boolean>) | undefined
  /**
   * The name every write and every utterance from this API is recorded under.
   *
   * Not decided by the specification, and not chosen here. AG-6 selects on "a
   * writer other than me" against `DocumentStamp.lastEditedBy` and
   * `DialogueMessage.author`, so this must be the name the API writes under and
   * must differ from the person's. No row names it: S-99a of table T-206 names
   * only the watermark's opener. Searched: table T-035, table T-107, FR-020,
   * FR-063, table T-206. The installer supplies it.
   *
   * One name for writing and subscribing: a watcher is not woken by its own work
   * (PI-15) only if the two strings match.
   */
  readonly writerName: string
  /**
   * The greatest document format version this build knows (AM-2, FR-073).
   *
   * Not retyped here: rule 03 forbids typing a generated value a second time.
   * The Framework publishes it as `GREATEST_KNOWN_SCHEMA_VERSION`, taken from the
   * startup template, and this layer may not import it, so the installer
   * supplies it.
   */
  readonly schemaVersion: string
}

/**
 * AM-1's value.
 *
 * Not decided by the specification: AG-1 requires a version that rises on an
 * incompatible change, and no row states its start or spelling. An integer,
 * because AG-1's stated use is a caller comparing before it goes on, which needs
 * no parser; FR-073's date string orders documents, not APIs. Searched: table
 * T-035, table T-107, `_assets/tbl-settings.md`, Chapter 6.1.
 *
 * @provisional PND-60
 */
const AGENT_API_VERSION = 1

/**
 * AG-4's frozen copy: a value the caller may write to without the application's
 * own value changing, and one it cannot write to at all. Freezing makes the
 * promise checkable from outside, without mutating the answer to look for
 * damage.
 *
 * Two walks per read are affordable: no member of table T-107 runs on the
 * per-frame path table T-078 wakes (NFR-013).
 *
 * Not `JSON.parse(JSON.stringify(...))` or `structuredClone`: both throw on some
 * values, and FR-028 forbids this API to throw. The walk would not terminate on
 * a cycle; the document is a tree (table T-052) and so are the runtime values
 * LY-1 keeps beside it.
 *
 * @purity pure
 */
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

/**
 * The category AG-9a asks for, taken from the step of table T-067 that refused.
 *
 * The WS-2 names pass through unchanged: renaming them at this boundary would
 * make a caller learn two vocabularies for one rule.
 *
 * @purity pure
 */
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

/**
 * The row of the specification that turned the write away, for `what`.
 *
 * @purity pure
 */
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

/**
 * One refusal, built from the snapshot the refused call had already read.
 *
 * The stamp comes from that snapshot, not a second reading: a refused call
 * changed nothing, and reading again is the mid-work outside reading R7.4
 * forbids.
 *
 * @purity pure
 */
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

/**
 * The refusal a member gives when it has not been built, or when the wiring
 * lacks its road. `what` names what is missing.
 *
 * @purity pure
 */
function notAvailable(target: string, snapshot: AgentSnapshot, missing: string): AgentRefusal {
  return agentRefusal(target, 'notAvailable', snapshot, `not built yet: ${missing}`, [])
}

/**
 * The document AM-8 was handed, out of whichever of `AgentImportSource`'s shapes
 * it arrived in, or `null` for a value that is none of them.
 *
 * Only the shape is judged here: OP-5 of table T-024a is the judgement, on the
 * import road with the bounds in force, and a check here would be a weaker copy
 * standing in front of it.
 *
 * `{ text }` is read through PI-20's `documentFromJson`, not parsed a second time
 * (Chapter 5.3); a text it turns away comes back `null`, answered as
 * `malformedRequest`. The greatest known version travels with it (FR-073):
 * without it OP-7 answers `notCompared` and a newer document is refused, which
 * FR-073 and FR-022 forbid (MUST NOT). The number is
 * `AgentApiWiring.schemaVersion`, AM-2's own.
 *
 * @purity pure
 */
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
  // AM-3's own answer, handed straight back: the root carries `schedule`, which
  // is the member no other shape of this union has.
  return typeof bag['schedule'] === 'object' && bag['schedule'] !== null
    ? (handed as Document)
    : null
}

/**
 * Where AM-16 should put the view so that one task is in it.
 *
 * S-77 is a day and S-78 a row. The row comes from where the frame drew the task
 * (PI-5); the day from the task's own start, since turning a drawn x back into
 * day text would be two conversions PI-1 owns. `taskByUid` (PI-1) is this lookup
 * and is not called: Chapter 5.2 draws this component no edge to Schedule, and
 * adding one is a change request.
 *
 * Not decided by the specification: where in the view the task should land.
 * S-77 and S-78 name the Row Area's left edge and top row, so the task goes in
 * the corner, the one placement that needs no second value no row states (FR-055
 * fits the whole schedule; table T-203 says what the settings mean, not what to
 * write into them). `actualStart` is the fallback when the plan has no start,
 * because such a task is still drawn. Searched: FR-055, table T-203, table
 * T-051, table T-107 AM-16.
 *
 * @provisional PND-61
 * @purity pure
 */
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

// ---- non-pure from here on (R7.7) -----------------------------------------

/**
 * One write, through the one path MS-1 of table T-042 allows.
 *
 * AM-7 and AM-16 both come through here, and WS-2 judges the moment from the two
 * flags IF-7 supplies. AG-5 is met by construction: this is the code a person's
 * pointer runs through.
 *
 * The one place the untyped world is turned into a value. FR-028's MUST NOT is
 * unconditional, and `DocumentCommand` is a compile-time promise a caller outside
 * this build never made: a misspelled field is simply absent, and some command
 * kinds throw while planning on such input.
 *
 * Refused, not swallowed: `malformedRequest` is the category this file already
 * gives an argument of the wrong shape, and the thrown message travels in
 * `what`, as AM-14's and AM-15's faults do. No new reason row is minted here;
 * that is the specification's to write.
 *
 * AG-3's atomicity holds: the throws happen while planning, and
 * `applyDocumentChange` replaces the held document only once a plan is whole.
 *
 * ST-7's note argues against catching as a safety valve inside the rules, where
 * a rule should refuse with a value. This is not that place: it is the seam
 * where a value of unknown shape enters a typed tree, and no rule below expects
 * one.
 *
 * @purity non-pure
 */
function writeThroughTheOnePath(
  wiring: AgentApiWiring,
  snapshot: AgentSnapshot,
  target: string,
  readStamp: DocumentStamp,
  commands: readonly DocumentCommand[],
): AgentWriteOutcome {
  let outcome
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

/**
 * What a thrown value said, as one line, whatever it was thrown as.
 *
 * The sentence beside `malformedRequest`, so a caller can see which field was
 * wrong. Never shown to a person: FR-038 keeps every word a person reads in the
 * dictionary, and `what` is not read out of it.
 *
 * @purity pure
 */
function messageOf(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown)
}

/**
 * The write itself, split out so the guard above reads as one line.
 *
 * @purity non-pure
 */
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
        // False from here, always: this component never hands notices out, and
        // PI-8 reads its own flag at the site that performs WS-7.
        deliveringNotices: false,
      },
      historyLimits: snapshot.historyLimits,
      settingsLimits: snapshot.settingsLimits,
      // FR-063: who wrote last, and the instant either group moved at, are
      // replaced by every write -- including one that leaves the schedule
      // instant where it was.
      editedBy: wiring.writerName,
      updatedUtc: snapshot.readAt,
    },
    wiring.holder,
    wiring.audience,
  )
}

/**
 * The members of table T-107, wired to the components that do the work. Each
 * member says which row it answers to and which entry it hands the work to.
 *
 * @purity non-pure
 */
export function agentApiMembers(wiring: AgentApiWiring): AgentApi {
  const { source } = wiring

  return {
    // ---- AM-1, AM-2 ---------------------------------------------------------------
    agentApiVersion: AGENT_API_VERSION,
    schemaVersion: wiring.schemaVersion,

    // ---- AM-3 to AM-6 -------------------------------------------------------------
    /** @purity semi-pure-b */
    readDocument(): Document {
      // One snapshot per call, at its head (CS-3, R7.4), in every member.
      return frozenCopy(source.readSnapshot().document)
    },

    /** @purity semi-pure-b */
    readStamp(): DocumentStamp {
      return frozenCopy(source.readSnapshot().document.documentStamp)
    },

    /** @purity semi-pure-b */
    readSelection(): Selection {
      // UN-9 of table T-027 keeps the selection out of the undo history, and
      // LY-1 files it as a runtime value the document does not carry -- which
      // is why it arrives through IF-7 rather than out of the document.
      return frozenCopy(source.readSnapshot().selection)
    },

    /** @purity semi-pure-b */
    readDialogueMessages(): readonly DialogueMessage[] {
      // AG-11 (MUST NOT): what a person is still typing is not readable. It
      // never reaches the log -- PI-37 settles an utterance before PI-16
      // appends it -- so there is nothing to filter out here.
      return frozenCopy(source.readSnapshot().dialogue.messages)
    },

    // ---- AM-7, AM-8 -------------------------------------------------------------
    /** @purity non-pure */
    applyCommands(request: AgentWriteRequest): AgentWriteOutcome {
      const snapshot = source.readSnapshot()
      // FR-028 (MUST NOT): a caller who leaves the stamp out is refused, not
      // thrown at, and a caller outside this build is exactly who would.
      if (request === null || typeof request !== 'object'
        || (request.readStamp as unknown) === null
        || typeof request.readStamp !== 'object'
        || !Array.isArray(request.commands)
        // And the elements, not only the array: a null element would throw
        // reading `.kind` in `planDocumentChange`, and `typeof null` is 'object'.
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
      // FR-022: the merge is a person's on U-61 and may not be refused (MUST
      // NOT). This face carries a document and nothing else; `takeInDocument`
      // raises U-61 on the far side of the seam and answers once a person has.
      //
      // FR-073's telling of the columns a newer version could not be read as
      // travels shell-side into U-61 under RS-48 of table T-233; nothing of it
      // belongs here. The object road is weighed by the shell through the same
      // PI-20 reader, not a second parser.
      const snapshot = source.readSnapshot()
      const road = wiring.takeInDocument
      if (road === undefined) {
        // A real absence, as for `rasterizer` and `appShell`: with no import
        // road there is nowhere to raise U-61.
        return {
          accepted: false,
          refusal: notAvailable('AM-8', snapshot, 'the wiring carries no import road'),
        }
      }
      const incoming = handedDocument(handedSource, wiring.schemaVersion)
      if (incoming === null) {
        // FR-028 (MUST NOT): something that is not a document is refused, not
        // thrown at, as for AM-7.
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
      // The wait FR-022 asks for. What follows runs after a person has answered
      // on U-61, so the snapshot above is stale and the one below is the answer's.
      const landed = await road(incoming)
      const after = source.readSnapshot()
      if (!landed) {
        // STOP -- AG-9a enumerates no category for the three ways this ends: a
        // person answered `MM-4` (MG-6), the import road refused the document
        // (OP-5 / FR-088), or OP-8 refused a second operation while one stood.
        // `commandRefused` is the nearest stated one: nothing went through and
        // the document is as it was. Which of the three travels in `what`.
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
        // WS-5 (FR-063): a merge that landed moved the schedule-data group, which
        // is what RD-3 of table T-230 advances the stamp for.
        hasMovedSchedule: true,
      }
    },

    // ---- AM-9, AM-10 -------------------------------------------------------------
    /** @purity semi-pure-b */
    undoEdit(): AgentWriteOutcome {
      // Not wired. `replaceDocument` (PI-8) takes RD-1 of table T-230 and asks
      // `undoEdit` (PI-11) at WS-3, and the shell already undoes through it. What
      // is missing is on this side: table T-230 has the caller name its row
      // (MUST), WS-1 matches the stamp the caller declares it read, and AM-9
      // takes no argument.
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
      // Not wired, for AM-9's reason, with RD-2 in place of RD-1.
      return {
        accepted: false,
        refusal: notAvailable(
          'AM-10',
          source.readSnapshot(),
          'AM-10 declares neither a row of table T-230 nor the stamp WS-1 matches',
        ),
      }
    },

    // ---- AM-11 to AM-15 -------------------------------------------------------------
    /** @purity semi-pure-b */
    exportJson(): AgentExport<string> {
      // AG-7: a value, with no download dialogue. FR-024's rules for writing
      // IO-2 of table T-024 are PI-20's, and this member adds none.
      return { ok: true, value: jsonFromDocument(source.readSnapshot().document) }
    },

    /** @purity semi-pure-b */
    exportMspdi(): AgentExport<string> {
      // IO-1 of table T-024 answers to Chapter 6.2 and FR-021, and this member
      // adds no rule of its own.
      //
      // The writer's notices are dropped: EX-3 and EX-6 of table T-033 want a
      // person told, and this face has nowhere to put them (AG-9a is for
      // refusals, and table T-107 gives AM-12 no second answer). The person's
      // road drops them at the same point (FR-076: table T-233 holds no row for
      // either), so the two entrances stay equal (FR-028).
      //
      // No mid-gesture gate: this writes the document, which CS-2 of table T-066
      // freezes when the pointer goes down, and AG-9 refuses writes, not reads.
      return { ok: true, value: mspdiFromDocument(source.readSnapshot().document).text }
    },

    /** @purity semi-pure-b */
    exportSvg(): AgentExport<string> {
      const snapshot = source.readSnapshot()

      // The gate this component owns; see the file head (AG-4).
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

      const scene = snapshot.exportScene
      if (scene === null) {
        // BO-1 of table T-077 (NFR-011): nothing is drawn until the window's size
        // has settled, and inventing a size would answer with one the screen never
        // showed. The scene is asked, not `frame`: a picture built from the frame
        // would be at the screen's size, not the one IO-3 of table T-024 fixes.
        return {
          ok: false,
          refusal: agentRefusal('AM-13', 'notDrawnYet', snapshot, 'BO-1: no frame yet', []),
        }
      }

      // The picture is PI-21's: the ratio, table T-076's parts and FR-025's
      // ceiling are applied there and not re-decided here. The scene arrives over
      // IF-7 whole, because FR-080's base environment is a judgement about a
      // frame, left to the side that computes one (ADR-001).
      const picture = ImageExporter.exportSvg(scene)
      // The refusal IO-3, IO-4 and IO-6 answer with (FR-025, S-217): PI-21 may
      // not draw part of a picture (MUST NOT).
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

      // AM-13's gate, for its own reason: IO-4 is painted from the picture IO-3
      // assembles (AG-4 with AG-9).
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
        // BO-1 of table T-077, as AM-13 reads it.
        return {
          ok: false,
          refusal: agentRefusal('AM-14', 'notDrawnYet', snapshot, 'BO-1: no frame yet', []),
        }
      }

      const seam = wiring.rasterizer
      if (seam === undefined) {
        // A real environment, not a hole: `frame-loop.ts` takes IF-6 as an
        // optional argument, so a loop where nothing can paint has none.
        return {
          ok: false,
          refusal: notAvailable('AM-14', snapshot, 'the wiring carries no Rasterizer (IF-6)'),
        }
      }

      const painted = await ImageExporter.exportPng(seam, scene)
      // Every refusal below carries the snapshot taken before the await (CS-4 of
      // table T-066): a fresh read would answer with a stamp the call never
      // stood at.
      if (!painted.ok) {
        // FR-025 with S-217: the rasterizer was never asked. AM-13's refusal,
        // because it is the same assembly.
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
        // AG-8 of table T-035 (MUST): a failed image comes back as a VALUE.
        // IF-6's own reason travels in `what` -- see `rasterFailed`.
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
      // IO-7 of table T-024 and FR-067 stay DocumentCodec's to answer. No
      // mid-gesture gate: the file carries `jsonFromDocument`'s text, not a
      // picture, so AM-12's reading of CS-2 holds.
      const snapshot = source.readSnapshot()
      const seam = wiring.appShell
      if (seam === undefined) {
        // The same real absence AM-14 records for IF-6.
        return {
          ok: false,
          refusal: notAvailable('AM-15', snapshot, 'the wiring carries no AppShellSource (IF-8)'),
        }
      }
      const made = await DocumentCodec.exportEmbeddedHtml(seam, snapshot.document)
      if (!made.ok) {
        // CS-4 again: the refusal carries the snapshot this call began at.
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

    // ---- AM-16 -----------------------------------------------------------
    /** @purity non-pure */
    focusTask(taskUid: number): AgentWriteOutcome {
      const snapshot = source.readSnapshot()
      const frame = snapshot.frame
      if (frame === null) {
        // Where a task sits is what the frame computed (PI-5), and BO-1 of
        // table T-077 forbids a frame before the dimensions have settled. There
        // is nothing yet to move the view relative to.
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

      // Through the one write path, because S-77 and S-78 are stored settings
      // (MS-1 of table T-042). AG-10 has it leave no undo step (UN-8 of table
      // T-027). The stamp handed to WS-1 is the one just read: moving the view is
      // no change to a schedule the caller read, so the signature asks for no
      // stamp and a concurrent edit does not turn it away.
      return writeThroughTheOnePath(wiring, snapshot, 'AM-16', snapshot.document.documentStamp, [
        {
          kind: 'setScrollPosition',
          scrollDate: view.scrollDate,
          scrollGroupId: view.scrollGroupId,
          // The anchor's top left corner, 0 on both axes: AM-16 decides only the
          // anchor pair, and a position is the anchor and its fraction together
          // (S-176 / S-177).
          scrollDayOffset: 0,
          scrollGroupOffset: 0,
        },
      ])
    },

    // ---- AM-17 -------------------------------------------------------------
    /** @purity non-pure */
    watchChanges(receive: AgentChangeReceiver): AgentWatch {
      const snapshot = source.readSnapshot()
      const hasReplacedEarlierWatch = NotifyChangeWatchers.watchChanges({
        // AG-6 compares this against `lastEditedBy` and `author`. It is the
        // name this API writes and speaks under, so the API is never woken by
        // its own work (MUST NOT).
        watcher: wiring.writerName,
        // Not decided by the specification: what a fresh subscription is told.
        // AG-6 says only "what I have not received yet", which read literally
        // replays the whole dialogue log at the first notice. PI-15 leaves it to
        // its caller, and this caller chooses "only what happens from now on",
        // from two public values (PI-3, PI-33). Searched: table T-035 AG-6, table
        // T-107 AM-17, Chapter 6.1.
        // @provisional PND-62
        since: {
          seenScheduleUpdatedUtc: snapshot.document.documentStamp.scheduleUpdatedUtc,
          seenSequence: latestSequence(snapshot.dialogue),
        },
        // Handed over as it is: PI-15 catches what a subscriber throws and reports
        // it as a value, so a receiver cannot turn a write into an exception
        // (FR-028).
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

    // ---- AM-18 -------------------------------------------------------------
    /** @purity non-pure */
    postDialogueMessage(text: string): DialogueMessage {
      const snapshot = source.readSnapshot()
      const utterance: PostDialogueMessage.SettledUtterance = {
        author: wiring.writerName,
        text,
        settledAt: snapshot.readAt,
      }
      // Not refused mid-gesture: AG-9 refuses writes to the document, and an
      // utterance never enters one (FR-066), reaching neither WS-2 nor WS-6.
      const posted = PostDialogueMessage.postDialogueMessage(
        utterance,
        wiring.dialogueHolder,
        wiring.dialogueAudience,
      )
      // The sequence AG-11 has watchers count in, read back through
      // `latestSequence` from the log that assigned it (PI-33).
      return frozenCopy({ ...utterance, sequence: latestSequence(posted) })
    },
  }
}
