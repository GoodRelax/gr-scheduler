// AgentApiEndpoint -- declares the interface SnapshotSource (table T-065 IF-7).
//
// @unit      UF-29   (docs/spec/05-07-design.md, table T-075)
// @component AgentApiEndpoint, layer Adapter (table T-062)
// @purity    n/a
// @seam      SnapshotSource, implemented in another layer (LR-5)
//
// One member answering everything at once: an `AgentSnapshot` is the consistency
// unit CS-3 of table T-066 names (R7.4). Separate members would let a pointer
// release fall between two reads and mix a document from before it with a
// selection from after (AG-4).
//
// ⚠️ The values are the running application's own, not copies: the frozen copy
// AG-4 asks for is made in `agent-api-members.ts`, since freezing here would
// freeze what the application is about to replace.
//
// ⛔ Do not narrow the seam to what the shell holds today: every narrowing lands
// on a member of table T-107 that then cannot answer.
//
// `exportScene` travels here because FR-080's base environment is a second run
// of table T-068 that this component has no edge to build. ⛔ It must not be run
// every frame (MN-6 of table T-070), and must not be a separate member called
// after the snapshot (R7.4, CS-3).

import type { Document } from '../../entity/document-model/document/document'
import type { DialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { Selection } from '../../entity/document-model/selection/selection'
import type { ScheduleLayout } from '../../entity/layout-engine/schedule-layout/schedule-layout'
// LR-2. `PlanInput` rather than `EditHistory`, so the bounds cannot drift from
// the write path's; Chapter 5.2 draws no edge to EditHistory.
import type { PlanInput, SettingsLimits } from '../../use-case/apply-document-change/apply-document-change'
// ⛔ Named through PI-19's signature, not imported from ScheduleGeometry or
// ScreenRegions: Chapter 5.2 draws this component no edge to either.
// ⚠️ `PictureArguments[3]` / `[4]` pick svgFromSchedule's parameters by POSITION:
// reordering that signature retypes `geometry` and `regions` below.
import type { svgFromSchedule } from '../svg-renderer/svg-renderer'
// ⛔ Named through PI-21's signature for the same reason: no edge to the
// component that describes the parts around the picture.
import type { exportSvg } from '../image-exporter/image-exporter'

/** PI-19's parameter list, which is the one route to the two types below. */
type PictureArguments = Parameters<typeof svgFromSchedule>

/** PI-21's parameter list, which is the one route to the scene below. */
type ExportArguments = Parameters<typeof exportSvg>

/**
 * What the last frame computed, handed over rather than computed again
 * (ADR-001: table T-068 runs once per frame, and CS-1 keeps the window's
 * dimensions on the Framework's side).
 *
 * `null` until BO-1 of table T-077 has settled the dimensions.
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
   * DR-1 to DR-4 of table T-052 (AM-3, AM-4). The stamp is not a separate field:
   * a stamp read apart from its document is the mixture AG-4 forbids.
   */
  readonly document: Document
  /** AM-5. */
  readonly selection: Selection
  /** AM-6 (FR-066 keeps the conversation out of the document). */
  readonly dialogue: DialogueLog
  /** `null` until BO-1 has settled the dimensions. See `FrameSnapshot`. */
  readonly frame: FrameSnapshot | null
  /**
   * The scene PI-21 is assembled from, for FR-080's base environment -- not the
   * `frame` above. AM-13 hands it to PI-21 unchanged; see the file header.
   *
   * ⛔ Not optional: `null` is the only other answer (BO-1, as for `frame`). An
   * omissible key let AM-13 fall back to the screen's picture, a size IO-3 of
   * table T-024 does not admit.
   */
  readonly exportScene: ExportArguments[0] | null
  /**
   * AG-9: a person is part way through a document-changing drag.
   *
   * ⛔ Pan and marquee do not set this (AG-9). ⚠️ A lost pointer must end the drag
   * as an abort (IN-1a of table T-028), or this stays true for the run.
   */
  readonly isGestureInFlight: boolean
  /**
   * AG-9's second half: an in-place edit is unsettled. Separate from the flag
   * above because AG-9a requires the refusal to name which one turned it away.
   */
  readonly isEditingInPlace: boolean
  /**
   * S-94 / S-95 of table T-206, typed through PI-8's input so this seam cannot
   * drift from what the write path applies.
   */
  readonly historyLimits: PlanInput['historyLimits']
  /** S-97 / S-98 and the Row Area width FR-052 measures against (PI-9). */
  readonly settingsLimits: SettingsLimits
  /**
   * When this snapshot was taken, ISO 8601 UTC (AT-129).
   *
   * The clock is read on the Framework's side (CS-1, R7.3) and lifted in here;
   * it becomes WS-5's `updatedUtc` (FR-063) and AM-18's `settledAt`.
   */
  readonly readAt: string
}

// The members are decided here: table T-065 names only the interface.
export interface SnapshotSource {
  /**
   * Everything, as it stands at this instant. Pulled and answered whole: Agent
   * API members run outside the frame loop, and one read per member, at its
   * head, is what makes the call a consistency unit (CS-3).
   *
   * ⛔ Must not fail or refuse: FR-028 forbids the Agent API to throw, and
   * without a snapshot there is no stamp for AG-9a's refusal.
   *
   * @purity semi-pure-b
   */
  readSnapshot(): AgentSnapshot
}
