// AgentApiEndpoint -- internal unit of the component.
//
// @unit      UF-28   (docs/spec/05-07-design.md, table T-075)
// @component AgentApiEndpoint, layer Adapter (table T-062)
// @purity    non-pure
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ⭐ WHAT THIS FILE IS. Table T-075 gives UF-28 one line -- the wiring of the
// eighteen members table T-107 names -- and UT-4 of table T-063 says why it is
// a file of its own rather than a purity split: installing the surface is what
// FR-065 constrains, the eighteen members are what table T-107 constrains, and
// the two change for different reasons.
//
// ⛔ THE ROSTER IS TABLE T-107's AND IS NOT COPIED HERE. PI-17 of table T-064
// forbids restating it (MUST NOT), so this file names the rows and lets the
// table hold what each one is for. There are eighteen members, no nineteenth,
// and no member renamed: `AgentApi` below is that roster in that order, with
// the group headings table T-107 uses.
//
// ⭐ THE SHAPE EVERY MEMBER SHARES, and why. FR-028 says a call answers whether
// it was accepted, as a VALUE, and must not throw (MUST NOT) -- so nothing here
// throws and nothing here rejects a promise. AG-9a of table T-035 then fixes
// what a refusal carries: what was refused, the category of the reason, and
// which document it now stands at, in a form the caller can retry from. That is
// `AgentRefusal`, and every member that can be turned away answers with it.
//
// ⭐ WHAT IS REFUSED WHILE A PERSON IS MID-GESTURE. Two different things, for
// two different reasons, and the difference is worth stating because it is easy
// to read AG-9 as one rule:
//
//   writes      WS-2 of table T-067 turns them away, and this file does not
//               repeat the test -- AG-9's own words put the refusal there, and
//               a second copy of it here would be a second place to drift from.
//               `applyCommands` and `focusTask` both go through that step.
//   pictures    refused HERE, by the gate in `exportSvg`. AG-4's promise is
//               that a reader sees a CONSISTENT document; the values a picture
//               is drawn from are the ones a person is at that moment dragging,
//               so a picture taken mid-gesture shows a state that no read of
//               this same API can answer with, and the caller has no way to
//               tell that the two disagree. ⚠️ A read of the document is NOT
//               refused: CS-2 of table T-066 freezes the document at the moment
//               the pointer went down, so it is consistent throughout the
//               gesture, and AG-2's stamp check already turns away the write
//               that such a read would lead to.
//
// ⛔ SIX OF THE EIGHTEEN CANNOT BE WIRED YET, and each says so at its own
// member: AM-8, AM-9, AM-10, AM-12, AM-14 and AM-15. In every case the
// component this one hands the work to publishes no entry for it (Chapter 5.2
// draws the edges; PI-17 does not let this component do the work itself). They
// are declared, they refuse with a value rather than throwing, and they are
// reported. ⛔ None of them is faked: answering with an empty string or a
// document built here would be a wrong answer wearing a right shape.
//
// ⚠️ WHY THREE OF THOSE SIX CARRY TWO DIFFERENT PURITY VALUES (R7.6). The
// tag on a member of `AgentApi` is the contract, and it is the value table
// T-107 states for that row; the tag on the body below is what that body does
// today. For AM-8, AM-9 and AM-10 the two differ -- T-107 classifies them
// `non-pure` because each is a write, while the body only reads a snapshot to
// build the refusal, which is `semi-pure-b`. ⛔ The body is NOT tagged
// `non-pure` to make the pair match: a tag is a claim, and claiming a side
// effect that is not there would be the false comment rule 03 calls a defect.
// The gap closes when the member is wired. Reported.

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
// ⭐ Two components are imported as namespaces, and the namespace is spelled
// with the component's own name from table T-062. Table T-107 gives this
// component members that carry the SAME names as theirs -- AM-17 `watchChanges`
// is PI-15's name and AM-18 `postDialogueMessage` is PI-16's -- and rule 03
// forbids giving either side a second name. The namespace keeps both spellings
// exactly as their tables have them.
import * as NotifyChangeWatchers from '../../use-case/notify-change-watchers/notify-change-watchers'
import * as PostDialogueMessage from '../../use-case/post-dialogue-message/post-dialogue-message'
import { jsonFromDocument } from '../document-codec/document-codec'
// ⭐ A namespace for the same reason as the two above: PI-21's entry and AM-13
// of table T-107 are both spelled `exportSvg`, and rule 03 forbids giving
// either side a second name.
import * as ImageExporter from '../image-exporter/image-exporter'
// ⛔ SvgRenderer is NOT imported here any more, and the edge Chapter 5.2 draws
// this component to it has not gone: `snapshot-source.ts` still names PI-19 to
// reach the two types IF-7 carries. What went is a SECOND road to a picture --
// this component drew one at the screen's own size while no export environment
// had arrived, and IO-3 of table T-024 admits one size only.
import type { AgentSnapshot, FrameSnapshot, SnapshotSource } from './snapshot-source'

/**
 * The document's stamp (PI-3), named through the root that carries it.
 *
 * ⚠️ Reached this way because Chapter 5.2 draws this component an edge to
 * Document -- the whole root -- and none to DocumentStamp. The stamp travels
 * inside the document, which is also why AM-4 needs no snapshot field of its
 * own.
 */
type DocumentStamp = Document['documentStamp']

/**
 * The category of a refusal. AG-9a requires a category rather than a sentence;
 * a caller that had to read prose would be reading an implementation detail,
 * which is the reason FR-028 gives for forbidding the exception in the first
 * place.
 *
 * ⭐ The first five are the rows that already refuse on the write path, and
 * they keep the names `PlanRefusal` gives them so that the two cannot part
 * company. The last three are this component's own, and each says which member
 * raises it.
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
   * ⛔ NOT A CATEGORY THE SPECIFICATION STATES. It exists because FR-028
   * forbids throwing (MUST NOT) and six members of table T-107 have nothing to
   * hand the work to yet -- see the block at the top of this file. A member
   * that answers with this has not failed; it has not been built.
   */
  | 'notAvailable'

/**
 * Why a call was turned away. AG-9a fixes the first three fields (MUST): the
 * target, the category, and which document it now stands at.
 */
export interface AgentRefusal {
  /** What was refused: the row of table T-107 whose member was called. */
  readonly target: string
  readonly reason: AgentRefusalReason
  /**
   * The whole current stamp, which is both what AG-9a asks a refusal to carry
   * and what a retry has to declare (AG-2).
   *
   * ⭐ ONE field and not two. A separate count beside it would be a second way
   * to say which document this is, and FR-063 leaves the stamp exactly one
   * question to answer -- "which one" -- with all three values (MUST).
   */
  readonly stamp: DocumentStamp
  /**
   * The current document -- present only when the stamp did not match.
   *
   * ⭐ AG-2 makes it a MUST for that case: a write refused on a mismatch is
   * answered WITH the current document. ⚠️ Absent otherwise, because a frozen
   * copy of the whole root on every refusal would put a per-call cost on a
   * field nobody asked for.
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
 * What one of the five members of table T-107's AM-11 to AM-15 group answers.
 *
 * ⭐ One shape for the whole group, although `exportJson` cannot fail: four of
 * the five have a stated way to be turned away (AG-8 makes a failed image a
 * value; two of them are not wired yet), and a caller that had to branch five
 * different ways over one group would be reading this file's history rather
 * than the table.
 */
export type AgentExport<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly refusal: AgentRefusal }

/** What AM-7 is handed. */
export interface AgentWriteRequest {
  /**
   * The stamp the caller read before deciding on these commands.
   *
   * ⭐ AG-2 (MUST): the writer declares which document it is writing against,
   * and all three values are compared -- the schedule instant alone cannot see
   * a write that touched the presentation group only, because FR-063 does not
   * move it for one. `readStamp` (AM-4) is where a caller gets this.
   */
  readonly readStamp: DocumentStamp
  /**
   * The bundle, applied atomically (AG-3): one refusal drops all of it, and one
   * call is one step of the undo history (FR-031).
   *
   * ⚠️ The commands are VALUES this component neither builds nor judges. Table
   * T-108 holds the roster and PI-9 holds the rules each obeys; deciding here
   * what a command means would put a second validation beside the one MS-1 of
   * table T-042 allows.
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
 * What AM-8 is handed.
 *
 * ⛔ ONE FIELD, AND NOT BECAUSE ONE IS ENOUGH. An intake needs the merge
 * choices of table T-032a as well, and those are ImportDocument's vocabulary
 * (PI-10); Chapter 5.2 draws this component no edge to it, and this face holds
 * nothing to carry them in -- see AM-8.
 * The text is here because IO-1 and IO-2 of table T-024 are both text (CN-5 of
 * table T-003), and it is never read: the member refuses.
 */
export interface AgentImportSource {
  readonly text: string
}

/** What a watcher is handed. AG-6 decides what is in it; PI-15 builds it. */
export type AgentChangeReceiver = (notice: NotifyChangeWatchers.ChangeNotice) => void

/**
 * The handle AM-17 answers with.
 *
 * ⭐ Table T-107 has no member for unwatching, and none is invented: PI-17 lets
 * this component publish `installAgentApi` and the seam, and a nineteenth
 * member would be a name on the Agent API that no table declares. So the way
 * to stop is a value the subscription itself hands back.
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
 * The eighteen members of table T-107, in that table's order and groups.
 *
 * ⭐ FLAT, ON ONE FACE. Chapter 5.2 holds the reason (R2.5), and table T-107's
 * own preamble says so: one face, eighteen members, not divided by purpose.
 */
export interface AgentApi {
  // ---- AM-1, AM-2 -----------------------------------------------------------------
  /**
   * AM-1. The version of this API, which AG-1 says a caller reads first, and
   * which rises on an incompatible change.
   *
   * ⭐ A plain property, not a call, so that reading it needs nothing else to
   * have worked. `semi-pure-a` in table T-107's own column.
   */
  readonly agentApiVersion: number
  /**
   * AM-2. The document format version this build reads and writes -- the
   * greatest one FR-073 says it knows. ⚠️ NOT the version of the document that
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
   * AM-8. Intake and merge. ⛔ Not wired -- see the member.
   *
   * @purity non-pure
   */
  importDocument(source: AgentImportSource): AgentWriteOutcome

  // ---- AM-9, AM-10 ---------------------------------------------------------------
  /**
   * AM-9. One step back (FR-031). ⛔ Not wired -- see the member.
   *
   * @purity non-pure
   */
  undoEdit(): AgentWriteOutcome
  /**
   * AM-10. One step forward (FR-031). ⛔ Not wired -- see the member.
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
   * AM-12. The exchange format. ⛔ Not wired -- see the member.
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
   * AM-14. The image, failure included (AG-8). ⛔ Not wired -- see the member.
   *
   * @purity semi-pure-b
   */
  exportPng(): AgentExport<never>
  /**
   * AM-15. Application and document in one .html. ⛔ Not wired -- see the member.
   *
   * @purity semi-pure-b
   */
  exportEmbeddedHtml(): AgentExport<string>

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
   * ⚠️ Answers with the message the log gave a sequence to. FR-063 does NOT
   * move the schedule instant for it (AG-11), so there is no new stamp to
   * answer with and a caller's AG-2 lock stays valid across a post.
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
   * The name every write and every utterance from this API is recorded under.
   *
   * ⛔ NOT DECIDED BY THE SPECIFICATION, and not chosen here. AG-6 selects on
   * "a writer other than me" and compares against `DocumentStamp.lastEditedBy`
   * and `DialogueMessage.author`, so this name has to be the one the API writes
   * under AND has to differ from the person's, or the two would wake each other
   * with their own work. No row names it: S-99a of table T-206 names only the
   * watermark's opener. Searched: table T-035, table T-107, FR-020, FR-063,
   * table T-206. Reported; the installer says.
   *
   * ⭐ One name for both, deliberately: PI-15's own note makes it a MUST NOT for
   * a watcher to be woken by its own work, and that only holds if the string it
   * subscribes with is the string it writes with.
   */
  readonly writerName: string
  /**
   * The greatest document format version this build knows (AM-2, FR-073).
   *
   * ⛔ NOT DECIDED HERE, AND NOT RETYPED HERE. The value exists -- the startup
   * template's generator holds it -- but nothing in `src/` publishes it, and
   * rule 03 forbids typing a generated value a second time, because the copy
   * goes stale in silence. Reported: it belongs beside `jsonFromDocument`
   * (PI-20), which is what writes it into a document, and it should reach
   * `src/` by generation. Until then the installer supplies it.
   */
  readonly schemaVersion: string
}

/**
 * AM-1's value.
 *
 * ⛔ NOT DECIDED BY THE SPECIFICATION. AG-1 requires a version and requires it
 * to rise on an incompatible change; no row states what it starts at or how it
 * is spelled. An integer is used because AG-1's only stated use is a caller
 * comparing before it goes on, and an integer compares without a parser --
 * FR-073's version is a date string, but that one orders documents, not APIs.
 * Searched: table T-035, table T-107, `_assets/tbl-settings.md`, Chapter 6.1.
 *
 * @provisional PD-60
 */
const AGENT_API_VERSION = 1

/**
 * AG-4's frozen copy, in both of its words: a value the caller may write to
 * without the application's own value changing, and one it cannot write to at
 * all.
 *
 * ⭐ A copy is what AG-4 asks for. Freezing on top of it is what makes the
 * promise checkable from outside -- a caller, or a test, can see that the
 * answer is sealed rather than having to mutate it and look for damage
 * elsewhere.
 *
 * ⚠️ Two walks of the value per read, and that is affordable HERE: no member of
 * table T-107 runs on the per-frame path table T-078 wakes (R5.1, NFR-013), and
 * ADR-001's once-per-frame work is untouched by any of it.
 *
 * ⛔ Not `JSON.parse(JSON.stringify(...))` and not `structuredClone`: the first
 * throws on a value that is not JSON and the second on one that is not
 * cloneable, and FR-028 forbids this API to throw (MUST NOT). This walk has no
 * failing case. ⚠️ It would not terminate on a cycle -- the document is a tree
 * by construction (table T-052 and the generated schema) and so are the two
 * runtime values LY-1 keeps beside it.
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
 * ⭐ The three WS-2 names pass through unchanged. They are the same three
 * situations, and renaming them at this boundary would make a caller learn two
 * vocabularies for one rule.
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
 * ⚠️ The stamp comes from that snapshot rather than from a second reading. A
 * refused call changed nothing, so the value it read IS the current one, and
 * reading again would be the mid-work outside reading R7.4 forbids.
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
 * The refusal a member gives when the component it hands the work to publishes
 * no entry for it. See the block at the top of this file.
 *
 * @purity pure
 */
function notAvailable(target: string, snapshot: AgentSnapshot, owner: string): AgentRefusal {
  return agentRefusal(target, 'notAvailable', snapshot, `${owner} publishes no entry yet`, [])
}

/**
 * Where AM-16 should put the view so that one task is in it.
 *
 * ⭐ S-77 is a day and S-78 is a row, so the answer is that pair. The row comes
 * from where the frame actually drew the task (PI-5), and the day from the
 * task's own start -- not from the drawn x, because turning an x back into a
 * day and a day back into text would be two conversions PI-1 owns and this
 * component has no edge to.
 *
 * ⛔ `taskByUid` (PI-1) IS this lookup, and it is not called for the same
 * reason: Chapter 5.2 draws this component an edge to Document, which is the
 * whole root, and none to Schedule. Adding one is a change request, not an
 * implementation choice -- the same line edit-document-settings.ts holds for
 * the same situation.
 *
 * ⛔ NOT DECIDED BY THE SPECIFICATION: where in the view the task should land.
 * S-77 is the day at the LEFT edge of the Row Area and S-78 the row at the top,
 * so putting the task's own start and row there puts it in the corner rather
 * than in the middle. FR-055 fits the WHOLE schedule and says nothing about one
 * task; table T-203 states what the two settings mean and not what should be
 * written into them. The corner is chosen because it is the one placement that
 * needs no second value (a margin, a fraction of the Row Area) that no row
 * states. ⚠️ `actualStart` is the fallback when the plan has no start, because
 * a task with only an actual is still drawn and still has somewhere to be.
 * Searched: FR-055, table T-203, table T-051, table T-107 AM-16.
 *
 * @provisional PD-61
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
 * ⭐ AM-7 and AM-16 both come through here, and neither judges the moment for
 * itself: WS-2 does that, from the two flags IF-7 supplies. ⚠️ AG-5 is met by
 * construction rather than by a check -- this is literally the code a person's
 * pointer runs through, so "the same validation and the same limits" is not a
 * claim this file has to make good on.
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
  const outcome = applyDocumentChange(
    {
      readStamp,
      commands,
      moment: {
        gestureInFlight: snapshot.isGestureInFlight,
        editingInPlace: snapshot.isEditingInPlace,
        // ⚠️ False from here, always, and it is not a guess: this component is
        // never the site that hands notices out, so what it knows about that
        // window is nothing. PI-8 holds the flag at the site that performs WS-7
        // and reads its own beside whatever the caller declares -- a boolean
        // supplied here would only ever say what this file cannot know.
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
 * The eighteen members of table T-107, wired to the components that do the
 * work. Nothing below decides a rule of its own; each member says which row it
 * answers to and which entry it hands the work to.
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
      // One snapshot per call, at its head (CS-3, R7.4). Every member below
      // does the same, and none reads the outside a second time.
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
      return writeThroughTheOnePath(
        wiring,
        snapshot,
        'AM-7',
        request.readStamp,
        request.commands,
      )
    },

    /** @purity semi-pure-b */
    importDocument(_source: AgentImportSource): AgentWriteOutcome {
      // ⛔ NOT WIRED, and not to be wired around. Chapter 5.2 draws no edge
      // from this component to ImportDocument (PI-10); the edge it draws is
      // ApplyDocumentChange -> ImportDocument, so an intake reaches the
      // document through the one write path (MS-1 of table T-042). ⭐ That path
      // now exists: `replaceDocument` (PI-8) carries RD-3 and RD-4 of table
      // T-230 and asks PI-10 itself at WS-3. ⛔ What is still missing is on THIS
      // side: `AgentImportSource` holds one text field, while RD-3 and RD-4
      // want the whole of `ImportRequest` -- the merge choices of table T-032a,
      // OP-5's verdict, OP-4's confirmation. Widening AM-8's face is a decision
      // about table T-107, not one to take here. Reported.
      return {
        accepted: false,
        refusal: notAvailable('AM-8', source.readSnapshot(), 'ApplyDocumentChange (PI-8)'),
      }
    },

    // ---- AM-9, AM-10 -------------------------------------------------------------
    /** @purity semi-pure-b */
    undoEdit(): AgentWriteOutcome {
      // ⛔ NOT WIRED. ⭐ THE ENTRY EXISTS NOW: `replaceDocument` (PI-8) takes
      // RD-1 of table T-230, asks `undoEdit` (PI-11) at WS-3 itself, and leaves
      // the restored stamp as it came in -- the two points `undo-edit.ts` used
      // to record as undecided are both settled, and the shell already presses
      // undo through it. ⛔ What is missing is on THIS side: T-230 has the
      // caller name its row (MUST) and WS-1 matches the stamp the caller
      // DECLARES it read, and AM-9 of table T-107 takes no argument at all, so
      // nothing here declares either. Widening that face is a decision about
      // table T-107. Reported.
      return {
        accepted: false,
        refusal: notAvailable('AM-9', source.readSnapshot(), 'ApplyDocumentChange (PI-8)'),
      }
    },

    /** @purity semi-pure-b */
    redoEdit(): AgentWriteOutcome {
      // ⛔ NOT WIRED, for the reason AM-9 gives, with RD-2 in place of RD-1.
      // Reported.
      return {
        accepted: false,
        refusal: notAvailable('AM-10', source.readSnapshot(), 'ApplyDocumentChange (PI-8)'),
      }
    },

    // ---- AM-11 to AM-15 -------------------------------------------------------------
    /** @purity semi-pure-b */
    exportJson(): AgentExport<string> {
      // AG-7: a value, with no download dialogue in the way. IO-2 of table
      // T-024 is the machine-facing format, and FR-024's rules for writing it
      // are PI-20's -- this member adds none of its own.
      return { ok: true, value: jsonFromDocument(source.readSnapshot().document) }
    },

    /** @purity semi-pure-b */
    exportMspdi(): AgentExport<string> {
      // ⛔ NOT WIRED. PI-20 lists `mspdiFromDocument`, and DocumentCodec's
      // public entry publishes only the GRS JSON pair -- UT-5 of table T-063
      // keeps the three formats apart precisely so one can land without the
      // others, and this is the one that has not. ⛔ Not written here instead:
      // IO-1 answers to the exchange partner's schema (Chapter 6.2), and
      // FR-021 makes the round trip lossless, neither of which is this
      // component's. Reported.
      return {
        ok: false,
        refusal: notAvailable('AM-12', source.readSnapshot(), 'DocumentCodec (PI-20)'),
      }
    },

    /** @purity semi-pure-b */
    exportSvg(): AgentExport<string> {
      const snapshot = source.readSnapshot()

      // ⭐ The gate this component owns. See the block at the top of the file:
      // a picture drawn while a person is mid-gesture, or mid in-place edit,
      // shows a state that no read of this API can answer with, and AG-4's
      // promise is that a reader sees a consistent document.
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
        // BO-1 of table T-077 (MUST, NFR-011): nothing is drawn until the
        // window's dimensions have settled, and a host can hand over a window
        // of no size. There is no picture to answer with, and inventing a size
        // to draw at would answer with one the screen never showed.
        //
        // ⛔ THE SCENE IS ASKED, NOT `frame`. The two absences travel together
        // -- an implementor of IF-7 that has settled no size has neither -- but
        // it is the scene this member needs, and a picture built from the frame
        // instead would be at the screen's size, which is not the size IO-3 of
        // table T-024 fixes.
        return {
          ok: false,
          refusal: agentRefusal('AM-13', 'notDrawnYet', snapshot, 'BO-1: no frame yet', []),
        }
      }

      // ⭐ THE PICTURE IS PI-21's, AND THIS IS THE WHOLE OF THE WIRING D5b
      // ASKED FOR. CR-196 gave PI-21 the member that assembles one, and every
      // route that sends the screen out ends there -- so the ratio, table
      // T-076's parts and FR-025's cut are applied where they are stated, and
      // this row neither repeats nor re-decides any of them. ⛔ Nothing about
      // the scene is chosen here either: FR-080's base environment closes two
      // panels, empties the selection and takes the pointer away, and all three
      // are judgements about a frame -- ADR-001 leaves a frame to the side that
      // computes one, which is why the scene arrives over IF-7 whole.
      return { ok: true, value: ImageExporter.exportSvg(scene).svg }
    },

    /** @purity semi-pure-b */
    exportPng(): AgentExport<never> {
      // ⛔ NOT WIRED. PI-21 lists `exportPng` and ImageExporter's public entry
      // publishes only the `Rasterizer` seam, which is empty. ⛔ The answer's
      // TYPE is undecided as well as the answer -- whether an image comes back
      // as bytes, as a data URL, or as a promise is PI-21's to say, and IF-6
      // is what reaches the canvas. That is why the value side of this outcome
      // is `never` rather than a shape guessed at here. ⚠️ When it lands, the
      // mid-gesture gate `exportSvg` carries applies to it for the same reason.
      // AG-8 is already honoured: the failure is a value. Reported.
      return {
        ok: false,
        refusal: notAvailable('AM-14', source.readSnapshot(), 'ImageExporter (PI-21)'),
      }
    },

    /** @purity semi-pure-b */
    exportEmbeddedHtml(): AgentExport<string> {
      // ⛔ NOT WIRED. PI-20 lists `exportEmbeddedHtml` as `semi-pure-b`, and it
      // needs the application's own HTML, which arrives over IF-8
      // (`AppShellSource`) -- a seam DocumentCodec declares and whose members
      // are still a TODO. IO-7 of table T-024 and FR-067 are that component's
      // to answer. Reported.
      return {
        ok: false,
        refusal: notAvailable('AM-15', source.readSnapshot(), 'DocumentCodec (PI-20)'),
      }
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

      // ⭐ Through the one write path like any other change, because S-77 and
      // S-78 are stored settings and MS-1 of table T-042 admits one entrance.
      // ⚠️ AG-10 (MUST) is what makes this leave no undo step: UN-8 of table
      // T-027 puts the zoom and the position outside undo, so WS-4 records
      // nothing and the call still runs.
      // ⚠️ The stamp handed to WS-1 is the one just read, not one the caller
      // declared: moving the view is not a change to the schedule a caller
      // could have read a version of. The signature therefore asks for no
      // stamp, and a person's concurrent edit does not turn this away.
      return writeThroughTheOnePath(wiring, snapshot, 'AM-16', snapshot.document.documentStamp, [
        { kind: 'setScrollPosition', scrollDate: view.scrollDate, scrollGroupId: view.scrollGroupId },
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
        // ⛔ NOT DECIDED BY THE SPECIFICATION: what a fresh subscription is
        // told. AG-6 says only "what I have not received yet", and a watcher
        // that has never received anything has, read literally, received
        // nothing -- which would replay the whole dialogue log at the first
        // notice. PI-15 refuses to choose and leaves it to its caller; this is
        // that caller, and it chooses "only what happens from now on", spelled
        // out of two public values (PI-3 and PI-33). Searched: table T-035
        // AG-6, table T-107 AM-17, Chapter 6.1.
        // @provisional PD-62
        since: {
          seenScheduleUpdatedUtc: snapshot.document.documentStamp.scheduleUpdatedUtc,
          seenSequence: latestSequence(snapshot.dialogue),
        },
        // ⚠️ The caller's own function, handed over as it is. PI-15 catches
        // what a subscriber throws and reports it as a value, so a badly
        // behaved receiver cannot turn an accepted write into an exception --
        // which is what FR-028 forbids (MUST NOT).
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
      // ⚠️ Not refused mid-gesture. AG-9 refuses writes to the DOCUMENT, and an
      // utterance never enters one (FR-066, MUST NOT) -- it reaches neither
      // WS-2 nor WS-6, so there is no half-made state for it to land in.
      const posted = PostDialogueMessage.postDialogueMessage(
        utterance,
        wiring.dialogueHolder,
        wiring.dialogueAudience,
      )
      // The sequence AG-11 requires the watchers to count in, read back from
      // the log that assigned it (PI-33). ⚠️ Not dug out of the array: the log
      // is what gives the number, and `latestSequence` is the published way to
      // ask for it.
      return frozenCopy({ ...utterance, sequence: latestSequence(posted) })
    },
  }
}
