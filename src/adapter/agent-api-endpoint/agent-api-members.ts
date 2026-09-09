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
// ⛔ TWO OF THE EIGHTEEN CANNOT BE WIRED YET, and each says so at its own
// member: AM-9 and AM-10. ⚠️ IT WAS THREE UNTIL 台帳 D-357 CLOSED (2026-09-07):
// AM-8 is wired now, because FR-022 (MUST NOT) forbids the refusal outright --
// 「合流を拒んではならない」 -- and the two grounds the member gave for it were
// the same false claim about table T-107 that D-356 struck, plus a telling
// FR-073 owes that refusing never supplied. ⚠️ IT WAS FIVE UNTIL 台帳 D-356 CLOSED
// (2026-09-07). AM-14 and AM-15 were blocked on a seam that did not reach here
// -- `Rasterizer` (IF-6) and `AppShellSource` (IF-8) -- and `AgentApiWiring`
// carries both now, so both are wired below. ⛔⛔ THE OTHER HALF OF THAT ROW WAS
// A FALSE CLAIM IN THIS FILE: the members said widening their signature to a
// promise was 表 T-107's decision, and that table's preamble says the opposite
// verbatim -- 「引数・戻り値は `src/` の公開エントリが持ち、境界値は Chapter 6.1
// が持つ。本表は名前と、何を担うかだけを持つ」. ⇒ The signature is this file's.
//
// What stops the three that remain is one thing only:
//
//   this component's own face      AM-9 and AM-10. The entry takes values
//                                  table T-107's row gives the member no way to
//                                  carry -- an ARGUMENT it has nowhere to put,
//                                  which is a different question from the
//                                  RETURN type the preamble leaves here.
//
// They are declared, they refuse with a value rather than throwing, and they are
// reported. ⛔ None of them is faked: answering with an empty string or a
// document built here would be a wrong answer wearing a right shape.
//
// ⚠️ WHY TWO OF THEM CARRY TWO DIFFERENT PURITY VALUES (R7.6). The
// tag on a member of `AgentApi` is the contract, and it is the value table
// T-107 states for that row; the tag on the body below is what that body does
// today. For AM-9 and AM-10 the two differ -- T-107 classifies them
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
// ⭐ A namespace for the reason the two above are: PI-20's entry and AM-15 of
// table T-107 are both spelled `exportEmbeddedHtml`, and rule 03 forbids giving
// either side a second name.
import * as DocumentCodec from '../document-codec/document-codec'
import { jsonFromDocument, mspdiFromDocument } from '../document-codec/document-codec'
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
 * company. The last four are this component's own, and each says which member
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
   * AM-13: `ImageExporter.exportSvg` refused the picture -- FR-025 with S-217
   * (CR-337, 2026-09-02): grown to the ceiling, it still would not fit, and
   * FR-025 (MUST NOT) forbids drawing a part of it. The row a person reading
   * this member's picture through GRS itself would be told, `RS-43` of table
   * T-233, is not repeated here: this union is `AgentRefusal`'s own
   * classification (AG-9a), and the Agent API composes no words at all.
   */
  | 'tooTall'
  /**
   * AM-14: the picture WAS drawn and painting it did not succeed -- `RasterFault`
   * (IF-6). ⭐ AG-8 of table T-035 (MUST) has a failed image come back as a
   * value, and this is that value's category; IF-6's own three-way reason
   * (`unsupported` / `tooLarge` / `rasterFailed`) travels in `what`, because
   * AG-9a asks for 「理由の区分」 and one category per member is what the rest of
   * this union holds.
   * ⛔ NOT `tooTall`. That one is FR-025's refusal to draw the picture at all,
   * and the rasterizer is never even asked for it.
   */
  | 'rasterFailed'
  /**
   * AM-15: the application's own HTML could not be read, or the document could
   * not be written into it -- `EmbeddedHtmlFault` (UT-5 of table T-063).
   * ⚠️ LM-14's neighbourhood is the commonest of its three reasons: a page
   * opened straight off the disk cannot always read itself back. That reason,
   * too, travels in `what`.
   */
  | 'embeddedHtmlFailed'
  /**
   * ⛔ NOT A CATEGORY THE SPECIFICATION STATES. It exists because FR-028
   * forbids throwing (MUST NOT) and six members of table T-107 have nothing to
   * hand the work to yet -- see the block at the top of this file. A member
   * that answers with this has not failed; it has not been built.
   */
  | 'notAvailable'
  /**
   * ⛔ NOT A CATEGORY THE SPECIFICATION STATES EITHER, and it is here for the
   * same reason `notAvailable` is: FR-028 (MUST NOT) forbids throwing, and a
   * caller outside this build can hand a member an argument that is not the
   * shape table T-107 declares. ⭐ AG-9a asks a refusal to carry 「理由の区分」
   * and does not enumerate the categories, which is what leaves room for both.
   * ⚠️ Measured 2026-09-06 (ledger row D-325): `applyCommands` with no
   * `readStamp` threw where this answers.
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
 * What AM-8 is handed: the document to take in, in any of the three shapes a
 * caller naturally has it in.
 *
 * ⭐⭐ THE MERGE CHOICES ARE NOT HERE, AND THAT IS THE REQUIREMENT (D-357).
 * FR-022 (MUST): 「呼ぶ側が機械であっても、選ぶのは人であること」 —— ⛔
 * 「`Agent API` の呼び出しに、選択肢をあらかじめ渡させてはならない（MUST NOT）」.
 * So a wider face would have been the wrong widening: what AM-8 needs is the
 * DOCUMENT, and table T-032a's answers come from a person on U-61.
 *
 * ⭐ THREE SHAPES BECAUSE A CALLER HOLDS IT IN THREE. `readDocument` (AM-3)
 * answers with the root itself, so handing that value straight back is the
 * plainest call there is; `{ document }` is the same value named; and
 * `{ text }` is IO-2 of table T-024, the machine-facing row, which is text
 * (CN-5 of table T-003).
 * ⛔⛔ `{ text }` IS NOT IO-1, AND THIS NOTE USED TO SAY IT WAS -- corrected
 * 2026-09-10 after an e2e read the note, handed MSPDI XML in and reported the
 * `malformedRequest` as a broken FR-021. `handedDocument` below reads the text
 * through PI-20 (`documentFromJson`) and through nothing else, and the shell
 * agrees in as many words: `frame-loop.ts:8411` hands the intake road
 * `format: 'grsJson'` with 「⛔ Not asked of `formatFromFile`: OP-12 reads an
 * extension and a first character, and there is neither here」. ⚠️ OP-12 of
 * table T-024a is a MUST on BOTH halves -- 「どちらか一方でも違うファイルを
 * 読んではならない（MUST NOT）」 -- and a handed value has no extension, so
 * admitting IO-1 here would be a ruling and not an implementation choice.
 * ⭐ THE SIGNATURE IS THIS FILE'S TO SETTLE -- table T-107's
 * preamble says so in as many words: 「引数・戻り値は `src/` の公開エントリが
 * 持ち、境界値は Chapter 6.1 が持つ。本表は名前と、何を担うかだけを持つ」.
 */
export type AgentImportSource = Document | { readonly document: Document } | { readonly text: string }

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
   * AM-8. Intake and merge.
   *
   * ⭐⭐ A PROMISE, AND FR-022 IS WHY (D-357): 「`AM-8`（`importDocument`）が
   * 合流にあたるときは、`U-61` を立て、人が答えるまで待つこと（MUST）」. The wait
   * is the requirement, so the answer cannot be a value settled at the call.
   * ⭐ The signature is this file's to settle, on AM-14's authority and table
   * T-107's own preamble; FR-028 forbids the throw, not the wait.
   *
   * @purity non-pure
   */
  importDocument(source: AgentImportSource): Promise<AgentWriteOutcome>

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
   * AM-14. The image, failure included (AG-8).
   *
   * ⭐ A PROMISE, AND THE SIGNATURE IS THIS FILE'S TO SETTLE. The preamble of
   * table T-107 says so in as many words: 「引数・戻り値は `src/` の公開エントリ
   * が持ち、境界値は Chapter 6.1 が持つ。本表は名前と、何を担うかだけを持つ」 --
   * so no ruling was needed to make it one. PI-21's entry is a promise because
   * IF-6 has to decode an image before it can paint it, and FR-028 forbids only
   * the throw, not the wait.
   *
   * @purity semi-pure-b
   */
  exportPng(): Promise<AgentExport<Uint8Array>>
  /**
   * AM-15. Application and document in one .html.
   *
   * ⭐ A promise for AM-14's reason, and settled here on AM-14's authority:
   * IF-8's `readAppShell` is one, because the shell fetches its own HTML.
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
   * IF-6 of table T-065 (CP-31), which AM-14 paints IO-4 with.
   *
   * ⛔ PRESENT AND POSSIBLY `undefined`, NEVER OPTIONAL. The layer that holds
   * the one implementation takes it as an optional argument -- a loop that runs
   * for a path touching no picture is handed none -- so the absence is real and
   * `exportPng` answers `notAvailable` for it. ⚠️ Making the FIELD optional
   * instead would let a wiring forget it in silence, which is the one way this
   * seam can go missing without anybody measuring it.
   */
  readonly rasterizer: ImageExporter.Rasterizer | undefined
  /**
   * IF-8 of table T-065, which AM-15 reads the application's own HTML through.
   *
   * ⚠️ Absent on the same terms as `rasterizer` above, and for the same reason.
   */
  readonly appShell: DocumentCodec.AppShellSource | undefined
  /**
   * AM-8's road: hand the document to the side that owns the import, and wait.
   *
   * ⭐⭐ FR-022 (MUST) IS THE WHOLE OF WHY THIS IS A SEAM AND NOT A CALL:
   * 「`AM-8`（`importDocument`）が合流にあたるときは、`U-61` を立て、人が答える
   * まで待つこと（MUST）」. Raising a surface and waiting on a person is a
   * current value's business, and LY-5 of table T-060 leaves those with the
   * Framework -- so the layer that draws U-61 and holds the answer is the layer
   * that fills this, and this component neither raises the surface nor decides
   * the merge.
   * ⛔ IT ANSWERS WHETHER A DOCUMENT LANDED, AND NOTHING ELSE. FR-022 (MUST NOT)
   * keeps table T-032a's choices away from the caller, so nothing about the
   * answer a person gave may travel back through here either.
   *
   * ⚠️ Absent on the same terms as `rasterizer` and `appShell` above: a wiring
   * with no import road answers `notAvailable`, which is a real absence rather
   * than a refusal of the requirement.
   */
  readonly takeInDocument: ((incoming: Document) => Promise<boolean>) | undefined
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
 * The refusal a member gives when it has not been built. See the block at the
 * top of this file for the two things that stop one, and each member for which
 * of the two stops it.
 *
 * ⚠️ `what` NAMES WHAT IS MISSING, NOT WHO PUBLISHES NOTHING. Every entry these
 * five reach is published now (measured 2026-09-05), so the sentence this used
 * to compose -- "publishes no entry yet" -- named a state of the tree that had
 * stopped being true, on the one road a machine reads rather than a person.
 *
 * @purity pure
 */
function notAvailable(target: string, snapshot: AgentSnapshot, missing: string): AgentRefusal {
  return agentRefusal(target, 'notAvailable', snapshot, `not built yet: ${missing}`, [])
}

/**
 * The document AM-8 was handed, out of whichever of `AgentImportSource`'s three
 * shapes it arrived in, or `null` for a value that is none of them.
 *
 * ⛔ NOTHING IS VALIDATED HERE BEYOND THE SHAPE. OP-5 of table T-024a (MUST) is
 * the judgement, and it runs on the import road with the bounds in force -- ⚠️
 * judging here would be a second, weaker copy of it standing in front of the
 * real one. What this answers is only 「which of the three did the caller mean」.
 *
 * ⛔ `{ text }` IS READ THROUGH PI-20 AND NOT PARSED HERE. `documentFromJson` is
 * DocumentCodec's own reader for IO-2 of table T-024 (FR-024), and a second
 * parse would be the duplication chapter 5.3 refuses. ⚠️ A text it turns away
 * comes back `null`, which the member answers `malformedRequest` for.
 *
 * ⛔⛔ AND THE VERSION IT IS READ AGAINST TRAVELS WITH IT (D-357). FR-073 (MUST)
 * settles 「読めない版」 as strictly newer than the greatest version this build
 * knows, and says of one 「そのときは、受けて開くこと（MUST）」 and
 * 「拒んではならない（MUST NOT）」;
 * a call that named no version left OP-7 answering `notCompared`, and a newer
 * document carrying one column this build cannot read was turned away as
 * `malformedRequest` -- measured on the shipped build 2026-09-09, which broke
 * that MUST NOT and FR-022's 「合流を拒んではならない（MUST NOT）」 with it.
 * ⭐ The number is `AgentApiWiring.schemaVersion`, which is AM-2's own.
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
 * ⛔⛔ THE ONE PLACE THE UNTYPED WORLD IS TURNED INTO A VALUE. FR-028's MUST NOT
 * -- 「受理したか否かを値で返すこと。例外を投げてはならない」 -- is
 * unconditional, and `DocumentCommand` is a compile-time promise that a caller
 * outside this build never made: every field of every row of table T-108 is
 * simply absent when someone spells one wrong. ⚠️ Measured on the shipped build
 * 2026-09-09: of table T-108's 71 kinds, 9 threw out of the page when handed
 * `{ kind }` and nothing else -- `createTask`, `reorderTaskGroupSiblings`,
 * `createCommentBox`, `createHighlightBox`, `deleteResource`,
 * `setProjectProfile`, `setStatusDate`, `setDualCursor`, `setScrollPosition`
 * (the reported one was `{ kind: 'setStatusDate', statusDate }`, whose field is
 * named `date`, ending in `TypeError: ... reading 'trim'`).
 *
 * ⭐ REFUSED, NOT SWALLOWED, AND ON THE ROAD THAT ALREADY EXISTS.
 * `malformedRequest` is the category this file already answers a caller whose
 * argument is not the shape table T-107 declares with, and AG-9a's 「理由の区分」
 * is met by it; what the throw said travels in `what`, which is where AM-14 and
 * AM-15 already put a fault's own words. ⛔ No new reason row is minted here --
 * that is the specification's to write, not this file's.
 *
 * ⭐ AG-3's atomicity survives it. Every one of the nine threw while the change
 * was still being PLANNED, and `applyDocumentChange` replaces the held document
 * only once a plan has come back whole -- measured after the fix: a refused
 * bundle leaves the stamp and the document as they stood.
 *
 * ⚠️ ST-7's own note argues against catching as a safety valve -- 「投げると捕ま
 * える者が要り、FR-028 が Agent API に課した禁止と同じ安全弁が 2 つの機構を持つ
 * ことになる」 -- and it is right about the INSIDE: a rule that can refuse should
 * refuse with a value where it stands, as ST-7 now does. ⛔ This is not that
 * place. It is the seam where a value of unknown shape enters a typed tree, and
 * no rule below it is written to expect one.
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
 * ⭐ AG-9a asks a refusal to carry 「理由の区分」 and this is not it -- the
 * category is `malformedRequest`. This is the sentence beside it, so that a
 * caller can see WHICH field it spelled wrong rather than only that one is
 * wrong. ⛔ Never printed to a person: FR-038 keeps every word a person reads
 * in the one dictionary, and `what` is not read out of it.
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
      // ⛔⛔ FR-028 (MUST NOT): 「例外を投げてはならない」. The MUST NOT is
      // unconditional, so a caller who leaves the stamp out has to be REFUSED,
      // not thrown at -- and a caller outside this build is exactly who would.
      // ⚠️ Measured 2026-09-06: `applyCommands({commands})` with no `readStamp`
      // reached `documentStamp`'s comparison and threw
      // `Cannot read properties of undefined (reading 'scheduleUpdatedUtc')`.
      // ⭐ The well-formed shape was never broken; `tests/unit/uf-27-28-29.test.ts`
      // has covered it since AM-7 was built. Ledger row D-325.
      if (request === null || typeof request !== 'object'
        || (request.readStamp as unknown) === null
        || typeof request.readStamp !== 'object'
        || !Array.isArray(request.commands)
        // ⛔⛔ AND THE ELEMENTS, not only the array. A spec-only body measured
        // the hole this guard still had on 2026-09-06: `commands: [null]`
        // walked past a check that read the request's two members and nothing
        // inside them, and threw in `planDocumentChange` reading `.kind` off
        // the null. ⭐ A string element was already refused correctly -- the
        // class that got through is the NULLISH one, which `typeof` calls an
        // object.
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
      // ⭐⭐ WIRED (台帳 D-357). This member refused until 2026-09-07, and FR-022
      // now forbids that refusal outright: 「呼ぶ側が機械であっても、選ぶのは
      // 人であること（MUST）」, 「`AM-8`（`importDocument`）が合流にあたる
      // ときは、`U-61` を立て、人が答えるまで待つこと（MUST）」 ——
      // ⛔ 「合流を拒んではならない（MUST NOT）」.
      //
      // ⛔ BOTH OF THE OLD GROUNDS ARE GONE, AND ONE WAS ALREADY FALSE.
      //   the face   The note said widening it was 「a decision about table
      //              T-107」. That table's own preamble says the opposite in as
      //              many words -- 「引数・戻り値は `src/` の公開エントリが
      //              持ち、境界値は Chapter 6.1 が持つ。本表は名前と、何を
      //              担うかだけを持つ」 -- so the shape was always this file's,
      //              and AM-14 / AM-15 landed on that same reading the same day.
      //   FR-073     The note said accepting would open a newer-version document
      //              in silence. ⭐ That ground belonged to the SILENCE and never
      //              to the intake: FR-073 says 「拒んではならない（MUST NOT）」
      //              as plainly as FR-022 does, so refusing broke one MUST NOT to
      //              keep another. ⚠️ WHAT IS STILL OWED IS THE TELLING -- see
      //              the STOP below.
      //
      // ⛔ THE CHOICES ARE NOT TAKEN FROM THE CALLER (FR-022, MUST NOT), which is
      // why this face carries a document and nothing else: `takeInDocument`
      // raises U-61 on the far side of the seam and answers only once a person
      // has.
      //
      // STOP -- ⛔ FR-073'S TELLING IS STILL ON NO SURFACE, and this member is
      // not where it can be put. That requirement (MUST) has the columns a newer
      // version could not be read as laid out on U-61, with RS-48 of table T-233
      // for the reason.
      // ⭐ ONE HALF LANDED (D-357): `documentFromJson` (PI-20) is now handed the
      // greatest version this build knows on the `{ text }` road above, and its
      // `unreadColumns` is the list FR-073 has laid out. ⚠️ An earlier note here
      // said no caller passed that version; it was true when written and is not
      // now.
      // ⭐⭐ THE ROAD TO THE SURFACE IS NOW BUILT, and this note used to say it
      // was not. The shell carries `unreadColumns` from the codec through
      // `DecodedIntake` and `SessionHeld` into `ScreenSession`, and the
      // `Difference Review` modal (U-61) lays the columns out under the RS-48
      // telling, whose words it reads from the dictionary. ⛔ Nothing of that
      // belongs here: this component still hands a `Document` and takes a
      // boolean, and table T-107's shape is unchanged.
      // ⭐ THE OBJECT ROAD IS COUNTED TOO, and not by a second parser: the
      // shell already had to write the handed value out as `GRS JSON` to weigh
      // it against S-113, so it reads that same text back through the same
      // PI-20 reader every other intake takes, and keeps only the reading.
      const snapshot = source.readSnapshot()
      const road = wiring.takeInDocument
      if (road === undefined) {
        // ⚠️ A REAL ABSENCE, the same one `rasterizer` and `appShell` record: a
        // wiring built with no import road has nowhere to raise U-61.
        return {
          accepted: false,
          refusal: notAvailable('AM-8', snapshot, 'the wiring carries no import road'),
        }
      }
      const incoming = handedDocument(handedSource, wiring.schemaVersion)
      if (incoming === null) {
        // FR-028 (MUST NOT): 「例外を投げてはならない」, so a caller outside
        // this build who hands something that is not a document is REFUSED and
        // not thrown at -- the shape D-325 closed for AM-7.
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
      // ⭐ THE WAIT FR-022 ASKS FOR. Everything below this line runs after a
      // person has answered on U-61, so the snapshot read above is stale by
      // construction and the one taken below is the answer's own.
      const landed = await road(incoming)
      const after = source.readSnapshot()
      if (!landed) {
        // STOP -- ⛔ AG-9a ENUMERATES NO CATEGORY FOR THE THREE WAYS THIS ENDS.
        // A person answered `MM-4` 「取込をやめる」 (MG-6), the import road
        // turned the document away (OP-5 / FR-088), or OP-8 refused a second
        // operation while one stood -- and `AgentRefusalReason` holds a row for
        // none of the three. ⭐ `commandRefused` is the nearest that IS stated:
        // the write did not go through and the document is exactly as it was.
        // ⚠️ Which of the three it was travels in `what` and nowhere else, and a
        // row of its own is what is owed. Reported.
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
        refusal: notAvailable(
          'AM-9',
          source.readSnapshot(),
          'AM-9 declares neither a row of table T-230 nor the stamp WS-1 matches',
        ),
      }
    },

    /** @purity semi-pure-b */
    redoEdit(): AgentWriteOutcome {
      // ⛔ NOT WIRED, for the reason AM-9 gives, with RD-2 in place of RD-1.
      // Reported.
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
      // AG-7: a value, with no download dialogue in the way. IO-2 of table
      // T-024 is the machine-facing format, and FR-024's rules for writing it
      // are PI-20's -- this member adds none of its own.
      return { ok: true, value: jsonFromDocument(source.readSnapshot().document) }
    },

    /** @purity semi-pure-b */
    exportMspdi(): AgentExport<string> {
      // ⭐ WIRED (2026-09-05). This member refused until now on the claim that
      // DocumentCodec's public entry published only the GRS JSON pair; that
      // claim was measured and is false -- `document-codec.ts` publishes
      // `mspdiFromDocument`, and all seven of PI-20's names are there. IO-1 of
      // table T-024 answers to the exchange partner's schema (Chapter 6.2) and
      // FR-021 makes the round trip lossless, and both stay where they are
      // stated: this member adds no rule of its own, exactly as AM-11 does not.
      //
      // ⛔ THE WRITER'S OWN NOTICES ARE DROPPED, and that is an absence rather
      // than a decision taken here. `mspdiFromDocument` answers with notices
      // beside the text -- EX-3 and EX-6 of table T-033 each want the person
      // told at the moment of writing -- and there is nowhere on this face to
      // put them: AG-9a fixes what a REFUSAL carries and table T-107 gives AM-12
      // no second answer for a telling that is not one. ⚠️ The road a person
      // takes drops them at the same point and for the same reason (FR-076 MUST
      // NOT: table T-233 holds no row for either), so the two entrances are
      // still equals, which is what FR-028 asks. Reported.
      //
      // ⛔ NO MID-GESTURE GATE, deliberately, and NOT by copying AM-11. AM-13's
      // gate exists because a PICTURE is drawn from the values a person is at
      // that moment dragging; this member writes the DOCUMENT, and CS-2 of table
      // T-066 freezes that at the instant the pointer went down, so the text is
      // as consistent during a gesture as it is outside one. A refusal here
      // would turn the API away from a read it is entitled to (AG-9 refuses
      // WRITES, in as many words).
      return { ok: true, value: mspdiFromDocument(source.readSnapshot().document).text }
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
      // T-076's parts and FR-025's ceiling are applied where they are stated,
      // and this row neither repeats nor re-decides any of them. ⛔ Nothing
      // about the scene is chosen here either: FR-080's base environment closes
      // two panels, empties the selection and takes the pointer away, and all
      // three are judgements about a frame -- ADR-001 leaves a frame to the
      // side that computes one, which is why the scene arrives over IF-7 whole.
      const picture = ImageExporter.exportSvg(scene)
      // ⭐ THE SAME REFUSAL IO-3, IO-4 AND IO-6 ANSWER WITH (FR-025, CR-337):
      // grown to S-217's ceiling, the picture still does not fit, and PI-21
      // (MUST NOT) forbids drawing part of one. AM-13 is one more route to the
      // one assembly, so it is refused here rather than handed a picture the
      // requirement says may not exist.
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
      // ⭐ WIRED (台帳 D-356). This member refused until now because
      // `AgentApiWiring` carried no implementor of `Rasterizer` (IF-6); it
      // carries one, and the whole of the work is handing it to PI-21's entry.
      // ⛔ AND NO RULING WAS NEEDED TO MAKE THE SIGNATURE A PROMISE. The note
      // that stood here said widening the face was 表 T-107's decision; the
      // preamble of that table says the opposite in as many words -- 「引数・
      // 戻り値は `src/` の公開エントリが持ち」 -- and the entry is this file.
      const snapshot = source.readSnapshot()

      // ⭐ THE SAME GATE AM-13 CARRIES, word for word and for its own reason:
      // IO-4 is painted from the very picture IO-3 assembles, so a raster taken
      // mid-drag shows the state no read of this API can answer with (AG-4 with
      // AG-9).
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
        // BO-1 of table T-077 (MUST, NFR-011), exactly as AM-13 reads it: there
        // is no picture yet, and inventing a size to paint at would answer with
        // one the screen never showed.
        return {
          ok: false,
          refusal: agentRefusal('AM-14', 'notDrawnYet', snapshot, 'BO-1: no frame yet', []),
        }
      }

      const seam = wiring.rasterizer
      if (seam === undefined) {
        // ⚠️ A REAL ENVIRONMENT AND NOT A HOLE IN THE BUILD. `frame-loop.ts`
        // takes IF-6 as an optional argument, so a loop running where nothing
        // can paint -- Node, and the paths that touch no picture -- has none.
        return {
          ok: false,
          refusal: notAvailable('AM-14', snapshot, 'the wiring carries no Rasterizer (IF-6)'),
        }
      }

      const painted = await ImageExporter.exportPng(seam, scene)
      // ⛔ THE SNAPSHOT IS THE ONE TAKEN BEFORE THE AWAIT, and every refusal
      // below carries it. CS-4 of table T-066: the operation began against that
      // document, and reading a fresh one here would answer a caller with a
      // stamp its own call never stood at.
      if (!painted.ok) {
        // FR-025 with S-217 (CR-337): grown to the ceiling, the picture still
        // does not fit, so the rasterizer was never asked. The same refusal
        // AM-13 makes, because it is the same assembly.
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
        // ⭐ IF-6's own reason travels in `what` -- see `rasterFailed`.
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
      // ⭐ WIRED (台帳 D-356), on AM-14's terms: what blocked this was IF-8 not
      // reaching the wiring, and it reaches it now. IO-7 of table T-024 and
      // FR-067 stay DocumentCodec's to answer, and this member adds nothing to
      // them -- exactly as AM-11 and AM-12 add nothing to theirs.
      // ⛔ NO MID-GESTURE GATE: what goes into the file is `jsonFromDocument`'s
      // text and not a picture, so AM-11's and AM-12's reading of CS-2 holds
      // and AM-13's gate does not apply.
      const snapshot = source.readSnapshot()
      const seam = wiring.appShell
      if (seam === undefined) {
        // ⚠️ The same real absence AM-14 records for IF-6.
        return {
          ok: false,
          refusal: notAvailable('AM-15', snapshot, 'the wiring carries no AppShellSource (IF-8)'),
        }
      }
      const made = await DocumentCodec.exportEmbeddedHtml(seam, snapshot.document)
      if (!made.ok) {
        // ⛔ CS-4 again: the refusal carries the snapshot this call began at.
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
        {
          kind: 'setScrollPosition',
          scrollDate: view.scrollDate,
          scrollGroupId: view.scrollGroupId,
          // ⭐ THE TOP LEFT CORNER OF THE ANCHOR, WHICH IS `0` ON BOTH AXES.
          // AM-16 puts a task IN the view and says nothing finer, so the whole
          // of what it decides is the anchor pair (S-77 / S-78). ⛔ Carrying
          // some other fraction here would be this member choosing a place the
          // table does not give it -- and the pair may not be left out, since
          // a position is the anchor AND its fraction together (S-176 / S-177).
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
