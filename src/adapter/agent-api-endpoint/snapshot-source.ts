// AgentApiEndpoint -- declares the interface SnapshotSource (table T-065 IF-7).
//
// @unit      UF-29   (docs/spec/05-07-design.md, table T-075)
// @component AgentApiEndpoint, layer Adapter (table T-062)
// @purity    n/a
// @seam      SnapshotSource, implemented in another layer (LR-5)
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ⭐ WHAT THIS SEAM IS FOR. IF-7 of table T-065 supplies two things and no
// more: the frozen current values that AG-4 of table T-035 speaks of, and
// whether a gesture is in flight (AG-9). LY-5 of table T-060 is why it has to
// exist at all -- the Framework is the ONLY layer allowed to hold a current
// value, and the three layers inside it take what they need as arguments. This
// component is an Adapter, so every value the eighteen members of table T-107
// answer with arrives through here.
//
// ⭐ ONE MEMBER, ANSWERING EVERYTHING AT ONCE. That is the design, and R7.4
// (MUST) is the reason: nothing may read the outside part way through a piece
// of work, and where a single collection is impossible the consistency unit has
// to be written down. Table T-066 already wrote it down -- CS-3 collects the
// three stamp fields and the whole of a change at the moment
// `applyDocumentChange` is called. An `AgentSnapshot` IS that unit. A seam with
// a member per value would let one Agent API call read the document, then the
// selection, then the gesture flag, and a person releasing the pointer between
// two of them would hand the caller a document from before the release beside a
// selection from after it -- which is the mixture AG-4 exists to forbid.
//
// ⚠️ THE FREEZING IS NOT DONE HERE. AG-4 asks for a frozen COPY, and the copy is
// made by the component that answers a caller (`agent-api-members.ts`), not by
// the implementor of this seam: the values below are the running application's
// own, and freezing them where they are held would freeze the values the
// application itself is about to replace.
//
// ⛔ WHAT THE IMPLEMENTING COMPONENT HAS TO GAIN. CP-25 (SingleHtmlShell)
// implements this, and as of this writing it holds only the document, the
// selection and one frame's computed values (UF-48). The dialogue log, the
// undo history and its two bounds, the zoom bounds, the gesture and in-place
// edit states, and a clock are all values LY-5 puts on that side and none of
// them is held yet. Reported rather than worked around: this file must not
// narrow the seam to what the shell happens to hold today, because every
// narrowing would land on a member of table T-107 that then could not answer.
//
// ⭐ WHY A SECOND ENVIRONMENT TRAVELS OVER THIS SEAM (`exportScene` below).
// AM-13 of table T-107 answers with the picture IO-3 of table T-024 sizes, and
// D5b settled that it does so by calling PI-21 and nothing else. Three of the
// four values PI-21's scene is made of cannot be reached from this layer:
// FR-080's base environment is not the one a person is looking at -- the two
// panels it names are closed there -- so its rectangles, its picture and its
// description of the parts around that picture are a SECOND run of table T-068,
// and Chapter 5.2 draws this component no edge to the component that describes
// those parts. ⛔ The second run belongs to the side ADR-001 already has run
// the first (MN-6 of table T-070), and it must NOT be run at the head of every
// frame to fill this field -- NFR-002 and NFR-003 are what MN-6 was weighed
// against, and a second pass per frame is the cost that decision refused.
// ⛔ It is also NOT a member of its own on the seam below: R7.4 (MUST) ends the
// collecting before the work starts, and a member that fetched the scene after
// the snapshot had been read would be a second reading of the outside inside
// one Agent API call -- exactly what CS-3 of table T-066 names as the unit.

import type { Document } from '../../entity/document-model/document/document'
import type { DialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { Selection } from '../../entity/document-model/selection/selection'
import type { ScheduleLayout } from '../../entity/layout-engine/schedule-layout/schedule-layout'
// LR-2: through the other component's public entry. ⭐ `PlanInput` is reached
// rather than `EditHistory` itself so that the bounds cannot drift from the
// ones the write path actually applies -- and because Chapter 5.2 draws this
// component an edge to ApplyDocumentChange and none to EditHistory.
import type { PlanInput, SettingsLimits } from '../../use-case/apply-document-change/apply-document-change'
// ⛔ Named through PI-19's own signature below, and NOT imported from
// ScheduleGeometry and ScreenRegions. Chapter 5.2 draws this component two
// edges into the layout engine -- one to ScheduleLayout ("where a task sits")
// and none to either of those two -- and PI-19 is the edge that carries the
// picture. Adding an edge is a change request, not an implementation choice.
import type { svgFromSchedule } from '../svg-renderer/svg-renderer'
// ⛔ Named through PI-21's own signature below, for the same reason: Chapter
// 5.2 draws this component one edge to ImageExporter and none to the component
// that describes the parts around the picture, so the scene is reached through
// the entry that takes it and never assembled from its parts here.
import type { exportSvg } from '../image-exporter/image-exporter'

/** PI-19's parameter list, which is the one route to the two types below. */
type PictureArguments = Parameters<typeof svgFromSchedule>

/** PI-21's parameter list, which is the one route to the scene below. */
type ExportArguments = Parameters<typeof exportSvg>

/**
 * What the last frame computed, handed over rather than computed again.
 *
 * ⭐ ADR-001 is the reason this is part of the snapshot at all: table T-068 is
 * run ONCE at the head of a frame and the result is handed to everyone who
 * draws. An Adapter that rebuilt it would need the window's dimensions, which
 * CS-1 of table T-066 collects on the Framework's side, and would run the
 * eleven stages a second time for one Agent API call.
 *
 * ⚠️ `null` when no frame has been computed yet. BO-1 of table T-077 forbids
 * drawing before the dimensions have settled (NFR-011, MUST), and a host really
 * can hand over a window of no size, so the members that answer with a picture
 * have to have something to say in that state.
 */
export interface FrameSnapshot {
  /** PI-5. `taskPlacement` reads it to answer where one task sits (AM-16). */
  readonly layout: ScheduleLayout
  /** `ScheduleGeometry` (PI-6). Named through PI-19; see the note above. */
  readonly geometry: PictureArguments[3]
  /** `ScreenRegions` (PI-35). Named through PI-19; see the note above. */
  readonly regions: PictureArguments[4]
}

/**
 * Everything one Agent API call is allowed to know, read in one go.
 *
 * ⚠️ Every field is the value as it stands, NOT a copy: see the note on
 * freezing at the top of this file.
 */
export interface AgentSnapshot {
  /**
   * The whole of the root (DR-1 to DR-4 of table T-052). AM-3 of table T-107
   * answers with a frozen copy of it, and AM-4 with a frozen copy of the stamp
   * inside it -- the stamp is not a second field here, because a stamp read
   * apart from the document it belongs to is exactly the mixture AG-4 forbids.
   */
  readonly document: Document
  /** AM-5. Not part of the document (UN-9 of table T-027 keeps it out of undo). */
  readonly selection: Selection
  /**
   * AM-6. Not part of the document either: FR-066 forbids saving the
   * conversation into it (MUST NOT), and AG-11 counts it in an order of its
   * own because an utterance does not move the schedule instant.
   */
  readonly dialogue: DialogueLog
  /** `null` until BO-1 has settled the dimensions. See `FrameSnapshot`. */
  readonly frame: FrameSnapshot | null
  /**
   * What one export is assembled from (`ExportScene`, PI-21), for the base
   * environment FR-080 names -- which is NOT the frame above.
   *
   * ⭐ AM-13 of table T-107 hands this to PI-21 and answers with what comes
   * back, so IO-3's output size and FR-025's cut are decided where they are
   * stated and nowhere else. See the note at the top of this file for why the
   * scene arrives whole, why it is built on the far side of the seam, and why
   * it is a value here rather than a member to call.
   *
   * ⛔ EVERY IMPLEMENTOR ANSWERS THIS, AND `null` IS THE ONLY OTHER ANSWER --
   * the same absence `frame` above has, for the same reason: BO-1 of table
   * T-077 (MUST, NFR-011) forbids drawing before a size has settled, and a host
   * really can hand over a window of no size. ⚠️ It was optional once, and the
   * key being omissible is what let AM-13 keep a second road: while no scene
   * arrived it answered with the SCREEN's picture, which is a size IO-3 of
   * table T-024 does not admit and which WY-2 and WY-3 of table T-041 do not
   * hold of. An implementor that has built no export environment now has to say
   * so in the value, where AM-13 can tell it apart from a picture.
   */
  readonly exportScene: ExportArguments[0] | null
  /**
   * AG-9: a person is part way through a drag that changes the document.
   *
   * ⛔ Pan and marquee do NOT set this. AG-9 says so in as many words and gives
   * the test: the gestures it covers are the ones table T-027 marks undoable.
   * A viewer moving around the schedule must not stop the Agent API, or
   * FR-028's promise that the two entrances are equals stops holding.
   * ⚠️ IN-1a of table T-028 (MUST) requires a drag whose pointer was lost
   * outside the window to be ended as an abort. It names this flag as what
   * would otherwise stay true for the rest of the run.
   */
  readonly isGestureInFlight: boolean
  /**
   * AG-9's second half: a person is typing into a field and has not settled it.
   *
   * ⚠️ A separate field from the one above, although WS-2 of table T-067
   * refuses a write for either. They are separate because the refusal has to
   * say WHICH one turned the write away -- AG-9a requires the reason's category
   * in the value, and "try again" is the same advice for the two only by
   * coincidence.
   */
  readonly isEditingInPlace: boolean
  /**
   * S-94 and S-95 of table T-206, which the document does not keep.
   *
   * ⚠️ Typed through PI-8's own input rather than declared here, so that a
   * change to what the write path applies cannot leave this seam behind.
   */
  readonly historyLimits: PlanInput['historyLimits']
  /**
   * The zoom bounds (S-97 / S-98) and the Row Area width FR-052 measures
   * against, none of which the document keeps either. PI-9 declares the type
   * and PI-8 republishes it.
   */
  readonly settingsLimits: SettingsLimits
  /**
   * When this snapshot was taken. ISO 8601, UTC -- the spelling AT-129 uses.
   *
   * ⭐ The clock is read HERE and nowhere inside this component, because CS-1
   * of table T-066 keeps it on the Framework's side and R7.3 asks for an
   * outside reading to be lifted into an argument. It becomes WS-5's
   * `updatedUtc` on a write (FR-063 requires the writer and the instant
   * either group moved at to be refreshed by every write, including one that
   * leaves the schedule instant alone) and a settled
   * utterance's `settledAt` on AM-18.
   */
  readonly readAt: string
}

// The members are not in the specification: table T-065 names the
// interface and what it supplies, nothing more. They are decided here,
// by the component that declares the seam.
export interface SnapshotSource {
  /**
   * Everything, as it stands at this instant.
   *
   * ⭐ Pulled, not pushed, and answered whole. An Agent API member is called
   * from outside the frame loop, so there is no frame at which a pushed value
   * could have been left for it; and answering whole is what makes the call a
   * consistency unit (CS-3). Every member of table T-107 calls this exactly
   * once, at its own head.
   *
   * ⛔ It must not fail and must not refuse. FR-028 forbids the Agent API to
   * throw (MUST NOT), and a member that could not obtain a snapshot would have
   * no stamp to put in the refusal AG-9a asks for. The values are all held in
   * memory by the implementing layer, so there is nothing here to fail.
   *
   * @purity semi-pure-b
   */
  readSnapshot(): AgentSnapshot
}
