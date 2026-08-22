// SingleHtmlShell -- the frame loop.
//
// @unit      UF-48   (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure
//
// Holds the current values, watches what table T-078 says may wake a frame,
// and computes table T-068 once at the head of each one before handing the
// result to everyone who draws (ADR-001).
//
// ⭐ Why this is not in single-html-shell.ts: table T-063 UT-6. Booting is what
// FR-067 and FR-065 constrain; running frames is what LY-5 and ADR-001
// constrain. Two reasons to change, so two files.
//
// ⛔ This is the ONLY layer allowed to hold a current value (table T-060
// LY-5). Everything inward takes what it needs as an argument.
//
// ⭐ TWO SURFACES, ONE FRAME. `SvgSurface` (IF-1) takes the schedule and
// `ScreenSurface` (IF-9) takes every UI part outside it, and both are filled
// from the SAME `ScreenRegions` / `ScheduleLayout` / `ScheduleGeometry` that
// ADR-001 has this file compute once at the head of the frame. ⛔ Drawing one
// of them on values from a different frame is what CA-4 forbids.

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import { emptyDialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { DialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import { emptyScreenState } from '../../entity/document-model/screen-state/screen-state'
import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../entity/document-model/selection/selection'
import type { Selection } from '../../entity/document-model/selection/selection'
import {
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  fitZoom,
  layoutFromSchedule,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  screenViewFromRegions,
  type AutosaveStatus,
  type DisplayLanguage,
  type ScreenSession,
  type ScreenSurface,
} from '../../adapter/screen-renderer/screen-renderer'
import { svgFromSchedule, type SvgSurface } from '../../adapter/svg-renderer/svg-renderer'

/**
 * What the shell measured about the window this frame. `regionsFromScreen`
 * takes it as an argument because FR-051 forbids a setting to hold the last
 * two -- they differ from one machine to the next.
 */
export interface FrameEnvironment {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly scrollbarThickness: number
}

/** What one frame computed, kept together so nothing recomputes it. */
export interface FrameValues {
  readonly regions: ScreenRegions
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
}

export interface FrameLoop {
  /** FT-2: the current value was replaced, so a frame is owed. */
  replaceDocument(next: Document): void
  /** FT-3: the window changed size. */
  resize(env: FrameEnvironment): void
  /** What the last frame computed, for a caller that needs to ask. */
  current(): FrameValues | null
  document(): Document
}

/**
 * The far side of IF-9, and the one thing about this reading session that only
 * the host can answer.
 *
 * ⭐ OPTIONAL ON PURPOSE. Table T-077's boot order and table T-078's triggers
 * govern the schedule as much as the parts around it, so the loop runs whether
 * or not the caller had a browser to build a `ScreenSurface` on.
 */
export interface ScreenWiring {
  /** IF-9's implementation -- the one unit that turns a `ScreenView` into nodes. */
  readonly surface: ScreenSurface
  /**
   * FR-038's answer for this session. ⛔ Settled by the shell and never by the
   * document: FR-038 keeps the chosen language out of it (MUST NOT).
   */
  readonly language: DisplayLanguage
}

/**
 * What the autosave status is before this session has written anything.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: FR-061 requires three states to
 * be told apart (MUST) -- saved with a time, saving, failed -- and NONE of the
 * three describes a document that has just been opened and not yet autosaved.
 * ⚠️ `saved` is the nearest of the three, and the time it carries is the
 * document's own AT-129 rather than a moment invented here: what is on the
 * screen is what was last written. ⛔ A ruling is owed, and so is the wiring of
 * FR-026's autosave -- nothing in this build performs one.
 *
 * @purity pure
 */
function autosaveAtStartup(held: Document): AutosaveStatus {
  return { kind: 'saved', at: held.revisionStamp.updatedAt }
}

/**
 * What the shell answers about this reading session (`ScreenSession`, PI-37).
 *
 * ⭐ Every member is either a measurement only this layer can make or a value
 * table T-206 keeps out of the document, which is why LY-5 of table T-060
 * leaves them here.
 *
 * ⛔ THREE OF THEM WAIT ON FT-1 of table T-078, which is not wired -- see the
 * STOP note at the head of single-html-shell.ts for what blocks it.
 * `pointer`, `pointerRestedMs` and `iconUnderPointer` are what a pointer path
 * would fill, so until there is one they say what is true: no pointer has been
 * reported. ⚠️ The same absence empties `selectedGroupIds` (PD-142),
 * `selectedResourceUids` (PD-143), `propertiesShowing` and `propertiesSubject`
 * (PD-144): every one of them is chosen by an operation, and no operation can
 * arrive.
 *
 * @purity pure
 */
function sessionOf(
  held: Document,
  regions: ScreenRegions,
  layout: ScheduleLayout,
  language: DisplayLanguage,
): ScreenSession {
  return {
    language,
    autosave: autosaveAtStartup(held),
    // FR-065 / S-99b: the record that turns the `Agent API` on is kept per
    // document in `localStorage`, and ⛔ nothing in `src/` owns those rows yet
    // (`local-storage-document-store.ts` says so in as many words). No record
    // is 「not enabled」, which is the truth about this build.
    isAgentApiEnabled: false,
    pointer: null,
    pointerRestedMs: 0,
    iconUnderPointer: null,
    // STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: where the floating palette
    // stands before anyone has dragged it (FR-053). `command-palette.ts`
    // records the same absence -- neither table T-203 nor table T-206 has a row
    // for the place. ⚠️ The `Row Area`'s own corner is used rather than a pair
    // of numbers written here, so nothing is invented: U-50 is a rectangle the
    // specification does hold, and SC-6 keeps the palette off the schedule's
    // scrolling anyway.
    commandPaletteAt: { x: regions.rowArea.x, y: regions.rowArea.y },
    selectedGroupIds: [],
    selectedResourceUids: [],
    propertiesShowing: null,
    propertiesSubject: null,
    // FR-076's notices and NT-7's question are raised by the paths that would
    // report a fault, and none of those paths runs in this build.
    notices: [],
    confirmation: null,
    // SC-1 (MUST): the row titles keep step with the body vertically and do not
    // move sideways, so each row's band is this frame's own `RowPlacement`
    // taken across the width `regionsFromScreen` gave the panel. ⛔ Not
    // measured a second time -- ADR-001 has the layout computed once, and SC-1
    // means the panel has to use those very numbers.
    rowBoxes: layout.rows.map((row) => ({
      groupId: row.groupId,
      box: {
        x: regions.rowTitlePanel.x,
        y: row.y,
        width: regions.rowTitlePanel.width,
        height: row.height,
      },
    })),
  }
}

/**
 * OP-10 of table T-024a -- what to draw when the stored place is `null` or
 * points at a row that is gone.
 *
 * ⛔ `null` is not a missing value, it is "the person has not chosen a place
 * yet", and the row says to show what FR-055's fit-to-screen would choose
 * (MUST). ⚠️ It also forbids HF-8 here (MUST NOT), so the collapse state
 * FR-004 saved is left exactly as it is -- this only decides the view.
 *
 * ⭐ The document is NOT edited. OP-10 sits on the reading side ("読む側の規則
 * は表 T-024a の `OP-10` が持つ", FR-051), so the stored settings keep saying
 * `null` and every frame decides again.
 *
 * ⚠️ Runs table T-068 at most twice, which is what the rule after that table
 * allows: once to measure, once at the chosen zoom. ⛔ A third pass is
 * forbidden -- the level of detail can oscillate and the loop would not be
 * guaranteed to end.
 *
 * @purity pure
 */
function viewSettings(
  held: Document,
  stored: DocumentSettings,
  regions: ScreenRegions,
): DocumentSettings {
  const groupIds = new Set(held.schedule.taskGroups.map((one) => one.id))
  const placed = stored.scrollDate !== null && groupIds.has(stored.scrollGroupId ?? '')
  if (placed) return stored

  // Where the fit starts from: the earliest planned start, and the first row in
  // the document's own order. Nothing in table T-064 publishes this, so it is
  // decided here -- and it is a view, not a stored value.
  //
  // ⛔ NOT the earliest day anything is drawn on. An `actualStart` before the
  // plan's start is drawn left of this origin (OC-5 of table T-038 counts it,
  // and LC-7 now measures it), so FR-055's fit sizes it in but this anchor
  // leaves it behind the Row Header panel -- the very harm FR-055's RATIONALE
  // names. ⚠️ Anchoring on the actual instead is not obviously right either:
  // OC-6 keeps the below-laid actual out of the width, so the zoom half and the
  // position half of FR-055 would then measure different sets. Settling it
  // takes a change request, not a guess here.
  const starts = held.schedule.tasks
    .map((one) => one.start)
    .filter((one): one is string => one !== null)
    .sort()
  const firstRow = [...held.schedule.taskGroups].sort((a, b) => a.order - b.order)[0]
  const anchored: DocumentSettings = {
    ...stored,
    scrollDate: starts[0] ?? held.schedule.project.startDate,
    scrollGroupId: firstRow === undefined ? stored.scrollGroupId : firstRow.id,
  }

  const measured = layoutFromSchedule(held.schedule, anchored, regions)
  const fitted = fitZoom(measured, anchored, regions)
  return { ...anchored, zoomX: fitted.zoomX, zoomY: fitted.zoomY }
}

/**
 * ADR-001 -- the screen rectangles, the layout and the geometry are computed
 * ONCE at the head of a frame and handed out.
 *
 * ⚠️ Four paths need the layout, and MN-6 measured what happens without this:
 * table T-068's eleven stages run four times for one pointer move, which does
 * not fit the budget NFR-002 and NFR-003 set.
 *
 * @purity non-pure
 */
export function frameLoop(
  surface: SvgSurface,
  first: Document,
  env: FrameEnvironment,
  screen?: ScreenWiring,
): FrameLoop {
  let document = first
  let environment = env
  let selection: Selection = emptySelection()
  let values: FrameValues | null = null
  let owed = false
  // ⛔ Neither of these can change in this build, and they are held rather than
  // rebuilt each frame so that the frame draws ONE session's state: the only
  // things that move them are `screenStateFromInput` (PI-18) and
  // `logWithMessage` (PI-33), and both sit behind FT-1, which is not wired --
  // the STOP note at the head of single-html-shell.ts says what blocks it.
  const screenState: ScreenState = emptyScreenState()
  const dialogueLog: DialogueLog = emptyDialogueLog()

  // CA-2: invalidation happens at the head of a frame, and nothing is rebuilt
  // again for the rest of it. NFR-010 means a frame with no trigger never runs
  // at all, so there is no idle path to guard against.
  //
  // @purity non-pure
  function runFrame(): void {
    owed = false
    const stored = document.documentSettings
    const environmentForRegions: ScreenEnvironment = {
      width: environment.width,
      height: environment.height,
      appHeaderHeight: environment.appHeaderHeight,
      scrollbarThickness: environment.scrollbarThickness,
    }
    // BO-1, then BO-3, then BO-4, in the order table T-077 fixes (MUST).
    const regions = regionsFromScreen(environmentForRegions, stored)
    const settings = viewSettings(document, stored, regions)
    const layout = layoutFromSchedule(document.schedule, settings, regions)
    const geometry = geometryFromLayout(document.schedule, settings, layout, regions)
    values = { regions, layout, geometry }
    surface.showSvg(
      svgFromSchedule(document.schedule, settings, layout, geometry, regions, selection),
    )
    if (screen === undefined) return
    // ⛔ AFTER the schedule, because the parts outside it are drawn OVER the
    // drawing area -- the note under table T-023a limits that table's decision
    // order to the schedule for exactly this reason.
    screen.surface.showScreenView(
      screenViewFromRegions(
        regions,
        document.schedule,
        settings,
        selection,
        screenState,
        dialogueLog,
        sessionOf(document, regions, layout, screen.language),
      ),
    )
  }

  /** @purity non-pure */
  function ask(): void {
    if (owed) return
    owed = true
    // ⚠️ A frame is asked for, never run inline: two triggers landing in one
    // task would otherwise run table T-068 twice for one painted frame.
    const raf = globalThis.requestAnimationFrame
    if (typeof raf === 'function') raf(() => runFrame())
    else runFrame()
  }

  /**
   * BO-1 -- 「寸法が確定するまで 1 枚も描かない」. ⛔ NFR-011 makes it a MUST,
   * and a host really can hand over a 0 x 0 window: a preview pane that has
   * not been laid out yet does exactly that, and the frame drawn then is a
   * picture of nothing that the person sees before the real one.
   *
   * @purity pure
   */
  function settled(env: FrameEnvironment): boolean {
    return env.width > 0 && env.height > 0
  }

  // BO-5 -- the first frame, which table T-078's note excludes from FT-1.
  // ⚠️ Held back while BO-1 is unsettled; the first resize that settles the
  // size runs it.
  if (settled(environment)) runFrame()

  return {
    /** @purity non-pure */
    replaceDocument(next: Document): void {
      document = next
      if (settled(environment)) ask()
    },
    /** @purity non-pure */
    resize(next: FrameEnvironment): void {
      // ⛔ FT-3 is 「画面の寸法が変わったこと」. A resize event that carries the
      // size already in force did not change it, and NFR-010 forbids waking a
      // frame on anything table T-078 does not list (MUST NOT). ⚠️ A browser
      // fires resize for things that leave the window alone.
      const same =
        next.width === environment.width &&
        next.height === environment.height &&
        next.appHeaderHeight === environment.appHeaderHeight &&
        next.scrollbarThickness === environment.scrollbarThickness
      if (same) return
      const wasSettled = settled(environment)
      environment = next
      if (!settled(next)) return
      // The first settled size is BO-5's frame, not FT-3's: table T-077 runs
      // once, and until now it had not.
      if (!wasSettled) runFrame()
      else ask()
    },
    // ⚠️ Both read a value this loop holds and is free to replace, so neither is
    // deterministic: two calls a frame apart answer differently.
    /** @purity semi-pure-b */
    current: () => values,
    /** @purity semi-pure-b */
    document: () => document,
  }
}
